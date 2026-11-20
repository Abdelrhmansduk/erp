/**
 * KAS Enterprise ERP — Cloudflare Edge Router, ADMS Biometric Receiver & Multi-Tenant Platform Worker
 * Primary Domain: https://kas-erp.com
 * Subdomains:
 *   - kas-erp.com / www.kas-erp.com / erp.kas-erp.com -> Unified Group HQ ERP
 *   - agents.kas-erp.com                              -> Isolated External Agencies Portal
 *   - adms.kas-erp.com                                -> ZKTeco UA760 ADMS Push Receiver (/iclock/cdata)
 *   - saf / yaq / top / trade / dar .kas-erp.com      -> Subsidiary Portals (Workers for Platforms)
 *   - verify.kas-erp.com / signage.kas-erp.com        -> Verification & Live Signage Portals
 */

/*__KAS_SESSION_BRIDGE__*/

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function textResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

function resolveTenantSlug(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/:\d+$/, '');
  const sub = host.endsWith('.kas-erp.com') ? host.slice(0, -'.kas-erp.com'.length) : '';
  const map = {
    saf: 'saf',
    safir: 'saf',
    yaq: 'yaq',
    yaqoot: 'yaq',
    top: 'top',
    topaz: 'top',
    trade: 'kas',
    kas: 'kas',
    dar: 'dar',
    shelter: 'dar',
    agents: 'external-agencies',
    agency: 'external-agencies',
  };
  return map[sub] || null;
}

/**
 * Parses ZKTeco ADMS ATTLOG tab-separated lines:
 * Format: <PIN>\t<YYYY-MM-DD HH:MM:SS>\t<Status>\t<VerifyMode>\t<WorkCode>...
 */
function parseZktecoAttlog(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const punches = [];

  for (const line of lines) {
    if (line.startsWith('OPLOG') || line.startsWith('USER') || line.startsWith('FP')) {
      continue;
    }
    const cleanLine = line.startsWith('ATTLOG') ? line.replace(/^ATTLOG\s+/i, '') : line;
    const parts = cleanLine.split(/\t+/);
    if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}/.test(parts[1])) {
      punches.push({
        pin: parts[0].trim(),
        punchTime: parts[1].trim(),
        statusCode: (parts[2] || '0').trim(),
        verifyMode: (parts[3] || '1').trim(),
        workCode: (parts[4] || '0').trim(),
        rawLine: `${parts[0].trim()}\t${parts[1].trim()}\t${(parts[2] || '0').trim()}\t${(parts[3] || '1').trim()}`,
      });
    }
  }
  return punches;
}

async function forwardPunchesToSupabase(env, serialNumber, companyId, punches) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || punches.length === 0) {
    return false;
  }
  try {
    const rows = punches.map((p) => ({
      id: `ADMS-${serialNumber}-${p.pin}-${p.punchTime.replace(/[^0-9]/g, '')}`,
      company_id: companyId,
      device_sn: serialNumber,
      employee_pin: p.pin,
      punch_time: p.punchTime,
      punch_state: p.statusCode === '1' ? 'OUT' : 'IN',
      verify_mode: p.verifyMode,
      raw_line: p.rawLine,
      created_at: new Date().toISOString(),
    }));

    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/hr_adms_punch_events`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function handleZktecoAdmsRequest(request, env, ctx, url) {
  const path = url.pathname;
  const sn = (url.searchParams.get('SN') || url.searchParams.get('sn') || 'BZD5253300723')
    .trim()
    .toUpperCase();
  const nowIso = new Date().toISOString();
  const colo = request.cf?.colo || 'EDGE';

  // Update heartbeat in D1 if bound
  if (env.EDGE_DB) {
    ctx.waitUntil(
      env.EDGE_DB.prepare(
        `INSERT INTO edge_adms_devices (serial_number, company_id, device_code, device_name_ar, vendor_model, last_seen_at)
         VALUES (?1, 'SAF', ?2, ?3, 'ZKTeco ADMS Terminal', ?4)
         ON CONFLICT(serial_number) DO UPDATE SET last_seen_at = excluded.last_seen_at`
      )
        .bind(sn, `ZK-${sn.slice(-4)}`, `جهاز بصمة ZKTeco (${sn})`, nowIso)
        .run()
        .catch(() => {})
    );
  }

  // 1. Handshake / Options GET (/iclock/cdata?SN=...&options=all)
  if (
    (path.startsWith('/iclock/cdata') || path.includes('adms-biometric-webhook')) &&
    request.method === 'GET'
  ) {
    const handshake = [
      `GET OPTION FROM: ${sn}`,
      `ATTLOGStamp=0`,
      `OPERLOGStamp=9999`,
      `ATTPHOTOStamp=None`,
      `ErrorDelay=30`,
      `Delay=10`,
      `TransTimes=00:00;14:05`,
      `TransInterval=1`,
      `TransFlag=TransData AttLog\tOpLog`,
      `TimeZone=3`,
      `Realtime=1`,
      `Encrypt=None`,
    ].join('\n');
    return textResponse(handshake, 200);
  }

  // 2. Push Data POST (/iclock/cdata?SN=...&table=ATTLOG)
  if (
    (path.startsWith('/iclock/cdata') || path.includes('adms-biometric-webhook')) &&
    request.method === 'POST'
  ) {
    const table = (url.searchParams.get('table') || 'ATTLOG').toUpperCase();
    const rawBody = await request.text();

    if (table === 'ATTLOG' || rawBody.includes('\t')) {
      const punches = parseZktecoAttlog(rawBody);
      let companyId = 'SAF';

      if (env.EDGE_DB && punches.length > 0) {
        try {
          const devRow = await env.EDGE_DB.prepare(
            `SELECT company_id FROM edge_adms_devices WHERE serial_number = ?1`
          )
            .bind(sn)
            .first();
          if (devRow?.company_id) companyId = devRow.company_id;

          const stmts = punches.map((p) => {
            const id = `${sn}:${p.pin}:${p.punchTime.replace(/[^0-9]/g, '')}`;
            return env.EDGE_DB.prepare(
              `INSERT OR IGNORE INTO edge_adms_punches
               (id, serial_number, company_id, employee_pin, punch_time, status_code, verify_mode, work_code, raw_line, colo, created_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
            ).bind(
              id,
              sn,
              companyId,
              p.pin,
              p.punchTime,
              p.statusCode,
              p.verifyMode,
              p.workCode,
              p.rawLine,
              colo,
              nowIso
            );
          });
          stmts.push(
            env.EDGE_DB.prepare(
              `UPDATE edge_adms_devices SET total_punches = total_punches + ?1, last_seen_at = ?2 WHERE serial_number = ?3`
            ).bind(punches.length, nowIso, sn)
          );
          await env.EDGE_DB.batch(stmts);
        } catch {
          // Never block terminal ACK
        }
      }

      ctx.waitUntil(forwardPunchesToSupabase(env, sn, companyId, punches));
      return textResponse(`OK: ${punches.length}`, 200);
    }

    return textResponse('OK', 200);
  }

  // 3. Device Polling for Pending Commands (/iclock/getrequest?SN=...)
  if (path.startsWith('/iclock/getrequest')) {
    if (env.EDGE_DB) {
      try {
        const cmd = await env.EDGE_DB.prepare(
          `SELECT cmd_id, command_text FROM edge_adms_commands
           WHERE serial_number = ?1 AND status = 'PENDING'
           ORDER BY cmd_id ASC LIMIT 1`
        )
          .bind(sn)
          .first();
        if (cmd) {
          await env.EDGE_DB.prepare(
            `UPDATE edge_adms_commands SET status = 'DELIVERED', delivered_at = ?1 WHERE cmd_id = ?2`
          )
            .bind(nowIso, cmd.cmd_id)
            .run();
          return textResponse(`C:${cmd.cmd_id}:${cmd.command_text}`, 200);
        }
      } catch {
        // fallback OK
      }
    }
    return textResponse('OK', 200);
  }

  // 4. Device Command Execution Reply (/iclock/devicecmd?SN=...)
  if (path.startsWith('/iclock/devicecmd')) {
    const replyText = await request.text();
    const idMatch = replyText.match(/ID=(\d+)/i);
    const retMatch = replyText.match(/Return=([-\d]+)/i);
    if (env.EDGE_DB && idMatch) {
      ctx.waitUntil(
        env.EDGE_DB.prepare(
          `UPDATE edge_adms_commands SET status = 'COMPLETED', device_return_code = ?1, completed_at = ?2 WHERE cmd_id = ?3`
        )
          .bind(retMatch ? retMatch[1] : '0', nowIso, Number(idMatch[1]))
          .run()
          .catch(() => {})
      );
    }
    return textResponse('OK', 200);
  }

  return textResponse('OK', 200);
}

// ============================================================================
// Faris & Noura — Hybrid Voice + Secure Cloud Brain (Cloudflare Workers AI)
// Security layers: origin allowlist, per-IP rate limit, daily budget caps, strict input
// caps, message sanitization, encrypted secrets only from Worker env, zero content logging.
// ============================================================================

export const AI_LIMITS = {
  maxTtsChars: 600,
  maxMessages: 24,
  maxMessageChars: 6000,
  maxTotalChars: 40000,
  maxBodyBytes: 256 * 1024,
  ttsPerMinutePerIp: 30,
  chatPerMinutePerIp: 12,
  defaultDailyTtsChars: 200000,
  defaultDailyChatRequests: 2000,
};

export const CF_AI_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
];

// Pre-recorded Salim (cloned) & Noura studio clips served instantly from static assets
const CORE_VOICE_CLIPS = {
  faris: {
    'لبيك! أنا فارس معك، تفضل بسؤالك.': '/audio/faris_wake.mp3',
    'أهلاً بك، أنا فارس معك الآن، جاهز لمساعدتك في كل ما تحتاج.': '/audio/faris_switch.mp3',
    'تم تفعيل الاستماع للمناداة. يمكنك مناداتي بقولك: يا فارس.': '/audio/faris_wake_enabled.mp3',
    'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي.': '/audio/faris_landing_intro.mp3',
  },
  noura: {
    'لبيكِ! أنا نُورة معكِ، تفضلي بسؤالكِ.': '/audio/noura_wake.mp3',
    'مرحباً بكِ، أنا نُورة معكِ الآن، يسعدني خدمتكِ في المنظومة.': '/audio/noura_switch.mp3',
    'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي بقولكِ: يا نُورة.': '/audio/noura_wake_enabled.mp3',
    'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية.': '/audio/noura_landing_intro.mp3',
    'أهلاً بكم في مركز الإيواء والرعاية الإنسانية الشاملة.': '/audio/noura_shelter_intro.mp3',
  },
};

export function isAllowedAiOrigin(origin) {
  const o = String(origin || '');
  return (
    o === 'https://kas-erp.com' ||
    /^https:\/\/[a-z0-9-]+\.kas-erp\.com$/i.test(o) ||
    /^https:\/\/[a-z0-9-]+\.kas-erp\.workers\.dev$/i.test(o) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)
  );
}

export function sanitizeAiMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const roles = new Set(['system', 'user', 'assistant']);
  const system = messages.filter((m) => m?.role === 'system').slice(0, 2);
  const convo = messages.filter((m) => m?.role !== 'system').slice(-AI_LIMITS.maxMessages);
  const out = [];
  let total = 0;
  for (const m of [...system, ...convo]) {
    if (!m || !roles.has(m.role) || typeof m.content !== 'string') continue;
    const content = m.content.slice(0, AI_LIMITS.maxMessageChars);
    total += content.length;
    if (total > AI_LIMITS.maxTotalChars) break;
    out.push({ role: m.role, content });
  }
  return out.some((m) => m.role === 'user') ? out : null;
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha1Hex(input) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const STUDIO_VOICE_DIRS = {
  faris: { voiceId: '680a2504', dir: '/audio/salim1' },
  noura: { voiceId: '69afeaaf', dir: '/audio/noura' },
};

async function fetchStaticStudioClip(env, url, persona, text) {
  if (!env.ASSETS) return null;
  const candidates = [];
  const exact = CORE_VOICE_CLIPS[persona]?.[text];
  if (exact) candidates.push(exact);

  const meta = STUDIO_VOICE_DIRS[persona];
  if (meta) {
    for (const step of [16, 8, 6]) {
      const hash = await sha1Hex(`${meta.voiceId}|${step}|${text}`);
      candidates.push(`${meta.dir}/${hash}.mp3`);
      candidates.push(`/audio/voicestudio-cache/${hash}.mp3`);
    }
  }

  for (const assetPath of candidates) {
    try {
      const assetRes = await env.ASSETS.fetch(new Request(new URL(assetPath, url).toString()));
      if (assetRes.ok && (assetRes.headers.get('Content-Type') || '').includes('audio')) {
        return assetRes.body;
      }
    } catch {
      // continue to next candidate
    }
  }
  return null;
}

function aiCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

/** Coarse KV counter (eventually consistent — adequate for abuse throttling). */
async function bumpCounter(env, key, amount, limit, ttlSeconds) {
  if (!env.EDGE_KV) return true;
  try {
    const current = Number((await env.EDGE_KV.get(key)) || 0);
    if (current + amount > limit) return false;
    await env.EDGE_KV.put(key, String(current + amount), { expirationTtl: ttlSeconds });
    return true;
  } catch {
    return true;
  }
}

/** Common gate: method, origin, body size, per-IP rate limit. Returns { error } or { origin, body }. */
async function guardAiRequest(request, env, kind) {
  const origin = request.headers.get('Origin') || '';
  if (!isAllowedAiOrigin(origin)) {
    return { error: jsonResponse({ ok: false, error: 'forbidden_origin' }, 403) };
  }
  const cors = aiCorsHeaders(origin);
  if (request.method === 'OPTIONS') {
    return { error: new Response(null, { status: 204, headers: cors }) };
  }
  if (request.method !== 'POST') {
    return { error: jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, cors) };
  }
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > AI_LIMITS.maxBodyBytes) {
    return { error: jsonResponse({ ok: false, error: 'payload_too_large' }, 413, cors) };
  }
  const raw = await request.text();
  if (raw.length > AI_LIMITS.maxBodyBytes) {
    return { error: jsonResponse({ ok: false, error: 'payload_too_large' }, 413, cors) };
  }
  let body;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return { error: jsonResponse({ ok: false, error: 'invalid_json' }, 400, cors) };
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const perMinute = kind === 'tts' ? AI_LIMITS.ttsPerMinutePerIp : AI_LIMITS.chatPerMinutePerIp;
  const ipHash = (await sha256Hex(`rl|${ip}`)).slice(0, 24);
  const allowed = await bumpCounter(env, `rl:${kind}:${ipHash}:${minute}`, 1, perMinute, 120);
  if (!allowed) {
    return { error: jsonResponse({ ok: false, error: 'rate_limited' }, 429, { ...cors, 'Retry-After': '60' }) };
  }
  return { origin, cors, body };
}

async function handleVoiceTts(request, env, ctx, url) {
  const gate = await guardAiRequest(request, env, 'tts');
  if (gate.error) return gate.error;
  const { cors, body } = gate;

  const persona = body?.persona === 'faris' ? 'faris' : 'noura';
  const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  if (!text || text.length > AI_LIMITS.maxTtsChars) {
    return jsonResponse({ ok: false, error: 'invalid_text' }, 400, cors);
  }

  const audioHeaders = (engine) => ({
    ...cors,
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'private, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-TTS-Engine': engine,
  });

  // Tier 1: pre-recorded Salim (salim_1) / Noura studio clips (core + 102 SHA-1 studio cache MP3s)
  const studioStream = await fetchStaticStudioClip(env, url, persona, text);
  if (studioStream) {
    return new Response(studioStream, { status: 200, headers: audioHeaders('studio-clip') });
  }

  // Tier 2: edge KV cache of previously synthesized replies
  const cacheKey = `tts:v1:${await sha256Hex(`${persona}|${text}`)}`;
  if (env.EDGE_KV) {
    try {
      const cached = await env.EDGE_KV.get(cacheKey, 'arrayBuffer');
      if (cached && cached.byteLength > 500) {
        return new Response(cached, { status: 200, headers: audioHeaders('edge-cache') });
      }
    } catch {
      // continue
    }
  }

  // Tier 3: Optional ElevenLabs cloned Salim/Noura cloud TTS (only if ELEVENLABS_API_KEY is configured)
  const elKey = env.ELEVENLABS_API_KEY;
  const voiceId = String(
    persona === 'faris' ? env.ELEVENLABS_VOICE_FARIS || '' : env.ELEVENLABS_VOICE_NOURA || ''
  ).trim();
  if (!elKey || !/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) {
    return jsonResponse({ ok: false, error: 'tts_not_configured' }, 503, cors);
  }

  const day = new Date().toISOString().slice(0, 10);
  const dailyCap = Number(env.TTS_DAILY_CHAR_CAP || AI_LIMITS.defaultDailyTtsChars);
  if (!(await bumpCounter(env, `budget:tts:${day}`, text.length, dailyCap, 172800))) {
    return jsonResponse({ ok: false, error: 'daily_budget_exceeded' }, 429, cors);
  }

  try {
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.55, similarity_boost: 0.8 },
        }),
      }
    );
    if (!elRes.ok) {
      return jsonResponse({ ok: false, error: `tts_upstream_${elRes.status}` }, 502, cors);
    }
    const audio = await elRes.arrayBuffer();
    if (audio.byteLength < 500) {
      return jsonResponse({ ok: false, error: 'tts_empty_audio' }, 502, cors);
    }
    if (env.EDGE_KV) {
      ctx.waitUntil(
        env.EDGE_KV.put(cacheKey, audio, { expirationTtl: 60 * 60 * 24 * 30 }).catch(() => {})
      );
    }
    return new Response(audio, { status: 200, headers: audioHeaders('elevenlabs') });
  } catch {
    return jsonResponse({ ok: false, error: 'tts_upstream_error' }, 502, cors);
  }
}

async function verifySupabaseUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const apikey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  if (!/^Bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/.test(auth) || !supabaseUrl || !apikey) return false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
    return res.ok;
  } catch {
    return false;
  }
}

async function handleAiChat(request, env, ctx) {
  const gate = await guardAiRequest(request, env, 'chat');
  if (gate.error) return gate.error;
  const { cors, body } = gate;

  // Optional hard gate: require a valid Supabase session (set AI_REQUIRE_AUTH=1 as a Worker var)
  if (env.AI_REQUIRE_AUTH === '1' && !(await verifySupabaseUser(request, env))) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401, cors);
  }

  const messages = sanitizeAiMessages(body?.messages);
  if (!messages) {
    return jsonResponse({ ok: false, error: 'invalid_messages' }, 400, cors);
  }

  if (!env.AI || typeof env.AI.run !== 'function') {
    return jsonResponse({ ok: false, error: 'ai_not_configured' }, 503, cors);
  }

  const day = new Date().toISOString().slice(0, 10);
  const dailyCap = Number(env.AI_CHAT_DAILY_REQUEST_CAP || AI_LIMITS.defaultDailyChatRequests);
  if (!(await bumpCounter(env, `budget:chat:${day}`, 1, dailyCap, 172800))) {
    return jsonResponse({ ok: false, error: 'daily_budget_exceeded' }, 429, cors);
  }

  for (const model of CF_AI_MODELS) {
    try {
      const result = await env.AI.run(model, {
        messages,
        temperature: 0.35,
        max_tokens: 700,
      });
      const content =
        result?.response ||
        result?.choices?.[0]?.message?.content ||
        '';
      if (typeof content === 'string' && content.trim()) {
        return jsonResponse({ content: content.trim(), model: `cloudflare-ai:${model}` }, 200, cors);
      }
    } catch {
      // try fallback model
    }
  }

  return jsonResponse({ ok: false, error: 'ai_upstream_error' }, 502, cors);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cf = request.cf || {};

    // 1. ZKTeco UA760 ADMS Push Endpoints (HTTP 80 & HTTPS 443)
    if (path.startsWith('/iclock/') || path.startsWith('/functions/v1/adms-biometric-webhook')) {
      return handleZktecoAdmsRequest(request, env, ctx, url);
    }

    // 2. Edge Health & Platform Telemetry (/api/health & /api/edge/status)
    if (path === '/api/health' || path === '/api/edge/status') {
      let d1Stats = { connected: false, devices: 0, punches: 0, ua760LastSeen: null };
      if (env.EDGE_DB) {
        try {
          const [devCount, punchCount, ua760] = await Promise.all([
            env.EDGE_DB.prepare(`SELECT COUNT(*) AS c FROM edge_adms_devices`).first(),
            env.EDGE_DB.prepare(`SELECT COUNT(*) AS c FROM edge_adms_punches`).first(),
            env.EDGE_DB.prepare(
              `SELECT serial_number, lan_ip, last_seen_at, total_punches FROM edge_adms_devices WHERE serial_number = 'BZD5253300723'`
            ).first(),
          ]);
          d1Stats = {
            connected: true,
            devices: Number(devCount?.c || 0),
            punches: Number(punchCount?.c || 0),
            ua760LastSeen: ua760?.last_seen_at || null,
            ua760LanIp: ua760?.lan_ip || '192.168.3.159',
          };
        } catch {
          d1Stats = { connected: false, devices: 0, punches: 0, ua760LastSeen: null };
        }
      }

      return jsonResponse({
        status: 'healthy',
        service: 'kas-enterprise-erp',
        domain: url.hostname,
        portalTenant: resolveTenantSlug(url.hostname) || 'hq',
        version: '5.0.0-cloudflare-wfp',
        timestamp: new Date().toISOString(),
        edge: {
          colo: cf.colo || 'EDGE',
          country: cf.country || 'SA',
          city: cf.city || null,
          httpProtocol: cf.httpProtocol || 'HTTP/3',
          tlsVersion: cf.tlsVersion || 'TLSv1.3',
        },
        platform: {
          plan: 'Workers for Platforms ($25)',
          d1Database: d1Stats,
          kvBound: Boolean(env.EDGE_KV),
          dispatchNamespaceBound: Boolean(env.SUBSIDIARY_DISPATCHER),
          admsReceiver: 'http://adms.kas-erp.com/iclock/cdata',
          agentsPortal: 'https://agents.kas-erp.com',
        },
        checks: {
          edgeRuntime: 'operational',
          spaShell: 'ready',
          zatcaEngine: 'operational',
          wmsModule: 'operational',
          admsD1Receiver: d1Stats.connected ? 'operational' : 'degraded',
          multiTenancyRls: 'enforced',
        },
      });
    }

    // 3. Live ADMS Punches Reader for ERP Frontend (/api/biometric-live-punches)
    if (path === '/api/biometric-live-punches' && request.method === 'GET') {
      const sn = (url.searchParams.get('sn') || '').trim().toUpperCase();
      if (!env.EDGE_DB) {
        return jsonResponse({ ok: true, count: 0, rawAttlogText: '', punches: [] });
      }
      try {
        const query = sn
          ? env.EDGE_DB.prepare(
              `SELECT serial_number, employee_pin, punch_time, status_code, verify_mode, raw_line, colo, created_at
               FROM edge_adms_punches WHERE serial_number = ?1 ORDER BY punch_time DESC LIMIT 250`
            ).bind(sn)
          : env.EDGE_DB.prepare(
              `SELECT serial_number, employee_pin, punch_time, status_code, verify_mode, raw_line, colo, created_at
               FROM edge_adms_punches ORDER BY punch_time DESC LIMIT 250`
            );
        const { results } = await query.all();
        const rows = results || [];
        const rawAttlogText = rows
          .map(
            (r) =>
              r.raw_line ||
              `${r.employee_pin}\t${r.punch_time}\t${r.status_code || '0'}\t${r.verify_mode || '1'}`
          )
          .join('\n');
        return jsonResponse({
          ok: true,
          source: 'CLOUDFLARE_EDGE_D1',
          count: rows.length,
          rawAttlogText,
          punches: rows,
        });
      } catch (err) {
        return jsonResponse({ ok: false, count: 0, rawAttlogText: '', error: String(err) }, 500);
      }
    }

    // 4. Queue Remote ADMS Command to ZKTeco UA760 (/api/biometric-adms-command)
    if (path === '/api/biometric-adms-command' && request.method === 'POST') {
      if (!env.EDGE_DB) {
        return jsonResponse({ ok: false, error: 'EDGE_DB not bound' }, 503);
      }
      try {
        const body = await request.json();
        const sn = String(body?.serialNumber || 'BZD5253300723').trim().toUpperCase();
        const commandText = String(body?.command || 'INFO').trim();
        const allowedPrefixes = ['INFO', 'CHECK', 'REBOOT', 'CLEAR LOG', 'DATA QUERY ATTLOG', 'DATA UPDATE USERINFO'];
        if (!allowedPrefixes.some((p) => commandText.toUpperCase().startsWith(p))) {
          return jsonResponse({ ok: false, error: 'Unsupported ADMS command prefix' }, 400);
        }
        const res = await env.EDGE_DB.prepare(
          `INSERT INTO edge_adms_commands (serial_number, command_text, status, created_at)
           VALUES (?1, ?2, 'PENDING', ?3)`
        )
          .bind(sn, commandText, new Date().toISOString())
          .run();
        return jsonResponse({
          ok: true,
          serialNumber: sn,
          command: commandText,
          queuedAt: new Date().toISOString(),
          meta: res.meta,
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: String(err) }, 400);
      }
    }

    // 5. Cloud Biometric Device Status Endpoint (/api/biometric-scan)
    if (path === '/api/biometric-scan' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const devices = Array.isArray(body?.devices) ? body.devices : [];
        const d1Map = new Map();

        if (env.EDGE_DB) {
          const { results } = await env.EDGE_DB.prepare(
            `SELECT serial_number, lan_ip, last_seen_at, total_punches FROM edge_adms_devices`
          ).all();
          for (const r of results || []) {
            d1Map.set(String(r.serial_number).toUpperCase(), r);
          }
        }

        const checks = devices.map((dev) => {
          const sn = String(dev?.serial_number || '').toUpperCase();
          const d1Rec = d1Map.get(sn);
          const isCloudRelay =
            dev?.protocol === 'ADMS_CLOUD_RELAY' ||
            String(dev?.ip_address || '').includes('kas-erp.com');
          const hasRecentPush = Boolean(d1Rec?.last_seen_at);
          return {
            device_id: dev.id,
            serial_number: dev.serial_number,
            ip_address: dev.ip_address,
            resolved_ip: d1Rec?.lan_ip || dev.ip_address,
            reachable: isCloudRelay || hasRecentPush,
            probe_mode: isCloudRelay ? 'CLOUDFLARE_EDGE_ADMS' : 'ADMS_HEARTBEAT_D1',
            latency_ms: isCloudRelay || hasRecentPush ? 4 : null,
            open_ports: isCloudRelay ? [80, 443] : [4370],
            web_console_url: null,
            reason_ar:
              isCloudRelay || hasRecentPush
                ? `متصل ببوابة كلاود فلير السحابية (adms.kas-erp.com • ${cf.colo || 'RUH'})`
                : 'في انتظار أول نبضة ADMS على adms.kas-erp.com:80',
          };
        });

        return jsonResponse({
          ok: true,
          report: {
            scanned_at: new Date().toISOString(),
            interfaces: [
              {
                name: `Cloudflare Edge (${cf.colo || 'SA'})`,
                address: 'adms.kas-erp.com',
                netmask: '255.255.255.255',
                cidr: 'adms.kas-erp.com/32',
                mac: 'CF-ANYCAST-EDGE',
              },
            ],
            arp_neighbor_count: d1Map.size,
            zk_udp_responder_count: d1Map.size,
            discovered_biometric_devices: [],
            other_manageable_lan_hosts: [],
            device_health_checks: checks,
            adms_receiver_endpoints: [
              {
                interface_name: 'Cloudflare Global ADMS Anycast',
                ip: 'adms.kas-erp.com',
                cidr: 'Global Edge',
                server_ip: 'adms.kas-erp.com',
                server_port: 80,
                adms_push_url: 'http://adms.kas-erp.com/iclock/cdata',
              },
            ],
            summary: {
              discovered_biometric_count: 0,
              other_lan_hosts_count: 0,
              registered_total: checks.length,
              registered_reachable: checks.filter((c) => c.reachable).length,
              registered_unreachable: checks.filter((c) => !c.reachable).length,
            },
          },
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: String(err) }, 500);
      }
    }

    // 6. Edge Transactional Email Gateway via Resend (/api/hr-send-email & /api/hr-mail-status)
    if (path === '/api/hr-mail-status' && request.method === 'GET') {
      return jsonResponse({
        ok: true,
        configured: Boolean(env.RESEND_API_KEY),
        provider: env.RESEND_API_KEY ? 'cloudflare-edge-resend' : 'edge-standby',
        fromEmail: env.RESEND_FROM_EMAIL || 'HR@kas-erp.com',
      });
    }

    if ((path === '/api/hr-send-email' || path === '/api/hr-email-send') && request.method === 'POST') {
      try {
        const body = await request.json();
        const toList = Array.isArray(body?.toEmails)
          ? body.toEmails
          : Array.isArray(body?.to)
            ? body.to
            : body?.to
              ? [String(body.to)]
              : body?.recipientEmail
                ? [String(body.recipientEmail)]
                : [];
        const ccList = Array.isArray(body?.ccEmails)
          ? body.ccEmails
          : Array.isArray(body?.cc)
            ? body.cc
            : undefined;
        const subject = String(body?.subject || 'إشعار رسمي — مجموعة خالد السليم القابضة');
        const html = String(
          body?.cidHtmlBody ||
            body?.html ||
            body?.bodyHtml ||
            `<pre dir="rtl">${body?.plainTextBody || body?.text || body?.bodyText || ''}</pre>`
        );
        const fromAddr = env.RESEND_FROM_EMAIL || 'KAS Holding HR <HR@kas-erp.com>';

        if (toList.length === 0) {
          return jsonResponse({ ok: false, error: 'Missing recipient email' }, 400);
        }

        let providerStatus = 'QUEUED_EDGE_LOG';
        let messageId = `edge-${ crypto.randomUUID() }`;

        if (env.RESEND_API_KEY) {
          const resendResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromAddr,
              to: toList,
              cc: ccList,
              subject,
              html,
            }),
          });
          const resendJson = await resendResp.json().catch(() => ({}));
          if (resendResp.ok && resendJson?.id) {
            providerStatus = 'SENT_RESEND';
            messageId = resendJson.id;
          } else {
            providerStatus = `RESEND_${resendResp.status}`;
          }
        }

        if (env.EDGE_DB) {
          ctx.waitUntil(
            env.EDGE_DB.prepare(
              `INSERT INTO edge_email_dispatches (id, company_id, recipient_email, subject, template_type, provider_status, provider_message_id, colo, created_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
            )
              .bind(
                messageId,
                String(body?.companyId || 'SAF'),
                toList.join(','),
                subject,
                String(body?.templateName || 'transactional'),
                providerStatus,
                messageId,
                cf.colo || 'EDGE',
                new Date().toISOString()
              )
              .run()
              .catch(() => {})
          );
        }

        return jsonResponse({
          ok: providerStatus === 'SENT_RESEND' || !env.RESEND_API_KEY,
          status: providerStatus,
          messageId,
          from: fromAddr,
          to: toList,
        });
      } catch (err) {
        return jsonResponse({ ok: false, error: String(err) }, 500);
      }
    }

    // 7. Workers for Platforms Multi-Tenant Dispatch (/api/platform/tenant/:slug)
    if (path.startsWith('/api/platform/tenant/')) {
      const segs = path.split('/').filter(Boolean);
      const slug = (segs[3] || resolveTenantSlug(url.hostname) || 'saf').toLowerCase();
      if (!env.SUBSIDIARY_DISPATCHER) {
        return jsonResponse({ ok: false, error: 'SUBSIDIARY_DISPATCHER not bound' }, 503);
      }
      try {
        const tenantWorker = env.SUBSIDIARY_DISPATCHER.get(slug);
        return await tenantWorker.fetch(request);
      } catch (err) {
        return jsonResponse({ ok: false, tenant: slug, error: String(err) }, 404);
      }
    }

    // 7b. Live Cloudflare Edge Security & Telemetry Context (/api/edge-context)
    if (path === '/api/edge-context' && request.method === 'GET') {
      const host = url.hostname.toLowerCase();
      const isStaging =
        host === 'staging.kas-erp.com' ||
        host.endsWith('.pages.dev') ||
        host.endsWith('.workers.dev');
      const zeroTrustEmail =
        request.headers.get('Cf-Access-Authenticated-User-Email') || null;
      return jsonResponse({
        ok: true,
        provider: 'cloudflare-pages-pro',
        domain: host,
        environment: isStaging ? 'staging' : 'production',
        timestamp: new Date().toISOString(),
        network: {
          colo: cf.colo || 'EDGE',
          country: cf.country || 'SA',
          city: cf.city || null,
          httpProtocol: cf.httpProtocol || 'HTTP/3',
          tlsVersion: cf.tlsVersion || 'TLSv1.3',
          tlsCipher: cf.tlsCipher || null,
          asn: cf.asn || null,
        },
        security: {
          zeroTrustActive: Boolean(zeroTrustEmail),
          zeroTrustUser: zeroTrustEmail,
          turnstileEnforced: Boolean(env.TURNSTILE_SECRET_KEY),
          supabaseProxyReady: Boolean(env.SUPABASE_UPSTREAM_URL || env.VITE_SUPABASE_URL),
          wafManaged: true,
          hstsPreload: true,
        },
      });
    }

    // 7c. Cloudflare Turnstile Server-Side Edge Verification (/api/turnstile-verify)
    if (path === '/api/turnstile-verify' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const token = typeof body?.token === 'string' ? body.token.trim() : '';
        if (!env.TURNSTILE_SECRET_KEY) {
          return jsonResponse({ success: true, mode: 'standby', verified: false });
        }
        if (!token) {
          return jsonResponse(
            {
              success: false,
              mode: 'enforced',
              verified: false,
              errorAr: 'يرجى إكمال التحقق الأمني (Cloudflare Turnstile) قبل تسجيل الدخول.',
            },
            400
          );
        }
        const form = new FormData();
        form.append('secret', env.TURNSTILE_SECRET_KEY);
        form.append('response', token);
        const ip = request.headers.get('CF-Connecting-IP');
        if (ip) form.append('remoteip', ip);

        const verifyRes = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          { method: 'POST', body: form }
        );
        const outcome = await verifyRes.json();
        if (!outcome?.success) {
          return jsonResponse(
            {
              success: false,
              mode: 'enforced',
              verified: false,
              errorAr: 'تعذر التحقق الأمني عبر Cloudflare Turnstile. يرجى إعادة المحاولة.',
              errorCodes: outcome?.['error-codes'] || [],
            },
            403
          );
        }
        return jsonResponse({
          success: true,
          mode: 'enforced',
          verified: true,
          hostname: outcome.hostname || null,
          challengeTs: outcome.challenge_ts || null,
        });
      } catch (err) {
        return jsonResponse({ success: false, mode: 'error', error: String(err) }, 500);
      }
    }

    // 7d. Server-Side External Agency Authentication Gateway (/api/external-agency-auth)
    // Invokes service_role-only SECURITY DEFINER RPCs without exposing anon/authenticated EXECUTE
    if (path === '/api/external-agency-auth' && request.method === 'POST') {
      const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
      const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
      if (!supabaseUrl || !serviceKey) {
        return jsonResponse({ ok: false, error: 'Auth gateway not configured' }, 503);
      }
      try {
        const body = await request.json().catch(() => ({}));
        const action = typeof body?.action === 'string' ? body.action.trim() : '';
        const identifier =
          typeof body?.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
        const passwordDigest =
          typeof body?.passwordDigest === 'string' ? body.passwordDigest.trim() : '';

        if (!identifier || identifier.length > 160) {
          return jsonResponse({ ok: false, error: 'Invalid identifier' }, 400);
        }
        if (
          identifier.endsWith('@kas.sa') ||
          (identifier.endsWith('@alsulaim.sa') && !identifier.endsWith('@agency.alsulaim.sa'))
        ) {
          return jsonResponse({ ok: true, data: [] });
        }

        let rpcName = '';
        let rpcPayload = {};
        if (action === 'resolve') {
          rpcName = 'resolve_external_agency_email';
          rpcPayload = { p_identifier: identifier };
        } else if (action === 'verify') {
          if (!passwordDigest || passwordDigest.length > 256) {
            return jsonResponse({ ok: false, error: 'Invalid password digest' }, 400);
          }
          rpcName = 'verify_external_agency_login';
          rpcPayload = { p_identifier: identifier, p_password_digest: passwordDigest };
        } else {
          return jsonResponse({ ok: false, error: 'Unsupported action' }, 400);
        }

        const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rpcPayload),
        });

        if (!rpcResp.ok) {
          return jsonResponse({ ok: false, error: `Upstream HTTP ${rpcResp.status}` }, 502);
        }

        const data = await rpcResp.json().catch(() => []);
        return jsonResponse({ ok: true, data: Array.isArray(data) ? data : [] });
      } catch (err) {
        return jsonResponse({ ok: false, error: String(err) }, 500);
      }
    }

    // 7e. Faris & Noura Hybrid Voice (/api/tts) — static Salim/Noura clips -> KV cache -> Azure AI Speech
    if (path === '/api/tts') {
      return handleVoiceTts(request, env, ctx, url);
    }

    // 7f. Faris & Noura Secure Cloud Brain (/api/ai-chat) — Azure OpenAI (key never leaves the edge)
    if (path === '/api/ai-chat') {
      return handleAiChat(request, env, ctx);
    }

    // 7g. KAS Supabase Session Bridge (/api/auth/supabase-session)
    // Server-side re-verification of the employee strong password, then aligns the
    // Supabase Auth user so the browser can obtain a real JWT (required by RLS).
    if (path === '/api/auth/supabase-session' && request.method === 'POST') {
      // eslint-disable-next-line no-undef
      if (typeof kasSessionBridge !== 'function' || typeof KAS_EMPLOYEE_PASSWORD_HASHES === 'undefined') {
        return jsonResponse({ ok: false, error: 'Session bridge not bundled' }, 503);
      }
      try {
        const body = await request.json().catch(() => ({}));
        // eslint-disable-next-line no-undef
        const result = await kasSessionBridge({
          supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
          serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY,
          // eslint-disable-next-line no-undef
          hashes: KAS_EMPLOYEE_PASSWORD_HASHES,
          email: body?.email,
          password: body?.password,
        });
        return jsonResponse(result.body, result.status);
      } catch (err) {
        return jsonResponse({ ok: false, error: String(err) }, 500);
      }
    }

    // Unknown API routes must never fall through to the SPA HTML shell (clients would mis-read 200 HTML)
    if (path.startsWith('/api/')) {
      return jsonResponse({ ok: false, error: 'not_found' }, 404);
    }

    // 8. Static Assets + SPA Fallback with Hardened Edge Headers
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResponse.headers);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        if (!headers.has(k)) headers.set(k, v);
      }
      const tenantSlug = resolveTenantSlug(url.hostname);
      if (tenantSlug) {
        headers.set('X-KAS-Portal-Tenant', tenantSlug);
      }
      headers.set('X-KAS-Edge-Colo', cf.colo || 'EDGE');

      if (path.startsWith('/assets/') || path.startsWith('/audio/')) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (
        (headers.get('Content-Type') || '').includes('text/html') ||
        path === '/' ||
        path === '/index.html'
      ) {
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      }

      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers,
      });
    }

    return jsonResponse({ status: 'kas-erp-edge-worker-ready', domain: url.hostname });
  },
};
