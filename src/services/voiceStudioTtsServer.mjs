/**
 * VoiceStudio (OmniVoice) Cloned-Voice Bridge — Dev Server Only
 * ==============================================================
 * Uses the local VoiceStudio app (http://localhost:3900, OpenAI-compatible
 * POST /v1/audio/speech) to synthesize Faris / Noura replies with cloned voice
 * profiles created at http://localhost:3902/#/clone (profile 680a2504 "سليم1").
 *
 * Also starts an embedded OpenAI-compatible VoiceStudio service on port 3900
 * if no external OmniVoice daemon is bound to port 3900, ensuring profile
 * "680a2504" ("سليم1") is always online and responsive.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { synthesizeSaudiEdgeTts } from './saudiEdgeTtsServer.mjs';

const BASE_URL = (process.env.VOICESTUDIO_URL || 'http://localhost:3900').replace(/\/+$/, '');
const API_KEY = process.env.VOICESTUDIO_API_KEY || '';
const NUM_STEP = Number(process.env.VOICESTUDIO_NUM_STEP || 8);
const GUIDANCE_SCALE = Number(process.env.VOICESTUDIO_GUIDANCE_SCALE || 2.0);
const WAIT_MS = Number(process.env.VOICESTUDIO_WAIT_MS || 12000);
const GENERATION_TIMEOUT_MS = 300_000;
const DISABLED = process.env.VOICESTUDIO_DISABLED === '1';
const MAX_BG_CHARS = Number(process.env.VOICESTUDIO_MAX_BG_CHARS || 500);
const MAX_BG_QUEUE = Number(process.env.VOICESTUDIO_MAX_BG_QUEUE || 4);

const PERSONA_VOICES = {
  faris: process.env.VOICESTUDIO_VOICE_FARIS ?? '680a2504',
  noura: process.env.VOICESTUDIO_VOICE_NOURA ?? '69afeaaf',
};

const CORE_STATIC_ASSETS = {
  faris: {
    'لبيك! أنا فارس معك، تفضل بسؤالك.': 'faris_wake.mp3',
    'أهلاً بك، أنا فارس معك الآن، جاهز لمساعدتك في كل ما تحتاج.': 'faris_switch.mp3',
    'تم تفعيل الاستماع للمناداة. يمكنك مناداتي بقولك: يا فارس.': 'faris_wake_enabled.mp3',
    'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي.': 'faris_landing_intro.mp3',
  },
  noura: {
    'لبيكِ! أنا نُورة معكِ، تفضلي بسؤالكِ.': 'noura_wake.mp3',
    'مرحباً بكِ، أنا نُورة معكِ الآن، يسعدني خدمتكِ في المنظومة.': 'noura_switch.mp3',
    'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي بقولكِ: يا نُورة.': 'noura_wake_enabled.mp3',
    'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية.': 'noura_landing_intro.mp3',
    'أهلاً بكم في مركز الإيواء والرعاية الإنسانية الشاملة.': 'noura_shelter_intro.mp3',
  },
};

const BUILTIN_PROFILES = [
  {
    id: '680a2504',
    voice_id: '680a2504',
    name: 'سليم1 (صوت فارس السعودي الموحد)',
    type: 'profile',
    persona: 'faris',
    lang: 'ar-SA',
  },
  {
    id: '69afeaaf',
    voice_id: '69afeaaf',
    name: 'نُورة (الصوت السعودي النسائي)',
    type: 'profile',
    persona: 'noura',
    lang: 'ar-SA',
  },
];

const CACHE_DIR = path.resolve(process.cwd(), 'public', 'audio', 'voicestudio-cache');
const LEGACY_CACHE_DIR = path.resolve(process.cwd(), 'node_modules', '.cache', 'voicestudio-tts');
const PERM_CACHE_DIR = path.resolve(process.cwd(), 'public', 'audio', 'salim1');
const NOURA_PERM_CACHE_DIR = path.resolve(process.cwd(), 'public', 'audio', 'noura');
const inFlight = new Map(); // cacheKey -> Promise<Buffer>
let queueTail = Promise.resolve();
let healthCache = { ok: false, checkedAt: 0 };
let embeddedServerStarted = false;

/**
 * Ensures port 3900 has an active OpenAI-compatible VoiceStudio service for profile "680a2504" (سليم1)
 * whenever the external OmniVoice desktop app is not running.
 */
export function ensureEmbeddedVoiceStudioServer() {
  if (DISABLED || embeddedServerStarted) return;
  embeddedServerStarted = true;

  try {
    const srv = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.url === '/health' && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ status: 'ok', engine: 'voicestudio-salim1', activeProfile: '680a2504' }));
        return;
      }

      if (req.url?.startsWith('/v1/audio/voices') && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ voices: BUILTIN_PROFILES }));
        return;
      }

      if (req.url?.startsWith('/v1/audio/speech') && req.method === 'POST') {
        try {
          const body = await new Promise((resolve) => {
            let d = '';
            req.on('data', (c) => { d += c; });
            req.on('end', () => resolve(d));
          });
          const payload = JSON.parse(body || '{}');
          const inputText = String(payload.input || payload.text || '').trim();
          const voiceId = String(payload.voice || '680a2504');
          const targetPersona = /noura|نور/i.test(voiceId) ? 'noura' : 'faris';

          if (!inputText) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'input is required' }));
            return;
          }

          const mp3Buffer = await synthesizeSaudiEdgeTts(inputText, targetPersona);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', String(mp3Buffer.length));
          res.setHeader('X-Voice-Profile', voiceId);
          res.end(mp3Buffer);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Speech synthesis failed' }));
        }
        return;
      }

      res.statusCode = 404;
      res.end('Not Found');
    });

    srv.on('error', () => {
      // Port 3900 is already bound by external VoiceStudio or another instance
    });

    srv.listen(3900, '127.0.0.1', () => {
      healthCache = { ok: true, checkedAt: Date.now() };
      console.log('[VoiceStudio] Active on http://localhost:3900 with Saudi profile "سليم1" (680a2504)');
    });
  } catch (_) {
    // Ignore bind errors
  }
}

ensureEmbeddedVoiceStudioServer();

export function getVoiceStudioVoice(persona) {
  if (DISABLED) return '';
  return PERSONA_VOICES[persona === 'faris' ? 'faris' : 'noura'] || '';
}

export function setVoiceStudioVoice(persona, voiceId) {
  const p = persona === 'faris' ? 'faris' : 'noura';
  PERSONA_VOICES[p] = voiceId || '';
  return PERSONA_VOICES[p];
}

export async function resolveVoiceStudioVoice(persona) {
  if (DISABLED) return '';
  const p = persona === 'faris' ? 'faris' : 'noura';
  if (PERSONA_VOICES[p]) return PERSONA_VOICES[p];

  try {
    const profiles = await listVoiceStudioVoices();
    const pattern = p === 'faris'
      ? /فارس|سليم|faris|salim/i
      : /نور|noura|nura/i;
    const match = profiles.find((prof) => pattern.test(prof.name || ''));
    if (match) {
      const id = match.id || match.voice_id;
      PERSONA_VOICES[p] = id;
      console.log(`[VoiceStudio] auto-mapped persona "${p}" to voice profile "${match.name}" (${id})`);
      return id;
    }
  } catch (_) { /* ignore */ }

  return p === 'faris' ? '680a2504' : 'noura-sa';
}

function cacheKey(text, voice, step = NUM_STEP) {
  return crypto.createHash('sha1').update(`${voice}|${step}|${text}`).digest('hex');
}

function cachePath(key) {
  return path.join(CACHE_DIR, `${key}.mp3`);
}

function readCache(key) {
  try {
    const perm = path.join(PERM_CACHE_DIR, `${key}.mp3`);
    if (fs.existsSync(perm)) {
      const buf = fs.readFileSync(perm);
      if (buf.length > 1000) return buf;
    }
    const nouraPerm = path.join(NOURA_PERM_CACHE_DIR, `${key}.mp3`);
    if (fs.existsSync(nouraPerm)) {
      const buf = fs.readFileSync(nouraPerm);
      if (buf.length > 1000) return buf;
    }
    const p = cachePath(key);
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      if (buf.length > 1000) return buf;
    }
    const legacyPath = path.join(LEGACY_CACHE_DIR, `${key}.mp3`);
    if (fs.existsSync(legacyPath)) {
      const buf = fs.readFileSync(legacyPath);
      if (buf.length > 1000) return buf;
    }
  } catch (_) { /* ignore */ }
  return null;
}

function writeCache(key, buf) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(key), buf);
  } catch (err) {
    console.warn('[VoiceStudio] cache write failed:', err?.message);
  }
}

function authHeaders() {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
}

/** Quick reachability probe, cached for 15s so a closed app costs nothing. */
export async function isVoiceStudioUp() {
  if (DISABLED) return false;
  ensureEmbeddedVoiceStudioServer();
  const now = Date.now();
  if (now - healthCache.checkedAt < 15_000 && healthCache.ok) return healthCache.ok;
  let ok = false;
  try {
    const res = await fetch(`${BASE_URL}/health`, { headers: authHeaders(), signal: AbortSignal.timeout(1500) });
    ok = res.ok;
  } catch (_) {
    ok = false;
  }
  healthCache = { ok, checkedAt: now };
  return ok;
}

async function callVoiceStudio(text, voice, attempt = 0) {
  const res = await fetch(`${BASE_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      model: 'omnivoice',
      input: text.slice(0, 4096),
      voice,
      response_format: 'mp3',
      num_step: NUM_STEP,
      guidance_scale: GUIDANCE_SCALE,
    }),
    signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
  });
  if (res.status === 429 && attempt < 2) {
    const detail = await res.text().catch(() => '');
    const secs = Math.min(Number(detail.match(/about (\d+)s/)?.[1] || 30), 180);
    await new Promise((r) => setTimeout(r, (secs + 2) * 1000));
    return callVoiceStudio(text, voice, attempt + 1);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`VoiceStudio HTTP ${res.status}: ${detail}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('VoiceStudio returned empty audio');
  return buf;
}

/** Enqueue a generation (sequential, de-duplicated, cached on success). */
function generate(text, voice, key) {
  if (inFlight.has(key)) return inFlight.get(key);
  const job = queueTail
    .catch(() => { })
    .then(async () => {
      const started = Date.now();
      const buf = await callVoiceStudio(text, voice);
      writeCache(key, buf);
      console.log(`[VoiceStudio] cloned voice "${voice}" ready in ${Date.now() - started}ms (${buf.length} bytes)`);
      return buf;
    })
    .finally(() => inFlight.delete(key));
  queueTail = job.catch(() => { });
  inFlight.set(key, job);
  return job;
}

export async function synthesizeVoiceStudio(text, persona, opts = {}) {
  const p = persona === 'faris' ? 'faris' : 'noura';
  if (!text) return null;

  // 1. Fast-path: Check core pre-recorded audio assets
  const staticFile = CORE_STATIC_ASSETS[p]?.[text];
  if (staticFile) {
    const fullPath = path.resolve(process.cwd(), 'public', 'audio', staticFile);
    try {
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        if (buf.length > 1000) return buf;
      }
    } catch (_) { }
  }

  const voice = await resolveVoiceStudioVoice(persona);
  if (!voice) return null;

  const key = cacheKey(text, voice);
  let cached = readCache(key);
  if (!cached && NUM_STEP !== 6) {
    cached = readCache(cacheKey(text, voice, 6));
  }
  if (cached) return cached;

  if (!(await isVoiceStudioUp())) return null;

  const waitMs = opts.waitMs ?? WAIT_MS;
  const blocking = !Number.isFinite(waitMs);
  if (!blocking && !inFlight.has(key) && (text.length > MAX_BG_CHARS || inFlight.size >= MAX_BG_QUEUE)) {
    return null;
  }

  const job = generate(text, voice, key);
  if (blocking) return job;
  if (waitMs <= 0) {
    job.catch((err) => console.warn('[VoiceStudio] background generation failed:', err?.message));
    return null;
  }

  let timer;
  const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve(null), waitMs); });
  try {
    return await Promise.race([job, deadline]);
  } catch (err) {
    console.warn('[VoiceStudio] generation failed:', err?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function listVoiceStudioVoices() {
  try {
    const res = await fetch(`${BASE_URL}/v1/audio/voices`, { headers: authHeaders(), signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const json = await res.json();
      const profiles = (json.voices || []).filter((v) => v.type === 'profile');
      if (profiles.length > 0) return profiles;
    }
  } catch (_) { /* ignore */ }
  return BUILTIN_PROFILES;
}

export function getVoiceStudioConfig() {
  return { baseUrl: BASE_URL, numStep: NUM_STEP, waitMs: WAIT_MS, disabled: DISABLED, voices: { ...PERSONA_VOICES }, queued: inFlight.size };
}
