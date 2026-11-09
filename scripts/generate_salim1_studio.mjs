/**
 * Generate Studio Quality Audio for Faris using Salim 1 (680a2504)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3900';
const VOICE_ID = '680a2504'; // سليم1
const MODEL = 'omnivoice';
const NUM_STEP = 16;
const GUIDANCE_SCALE = 2.0;

const AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');
const SALIM_DIR = path.resolve(process.cwd(), 'public', 'audio', 'salim1');
const CACHE_DIR = path.resolve(process.cwd(), 'node_modules', '.cache', 'voicestudio-tts');

fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(SALIM_DIR, { recursive: true });
fs.mkdirSync(CACHE_DIR, { recursive: true });

function cleanText(raw) {
  return raw
    .replace(/\{[\s\S]*?\}/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#`~]/g, '')
    .replace(/•/g, '، ')
    .replace(/\|/g, '، ')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\n\r]+/g, '، ')
    .replace(/\+/g, ' زائد ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheKey(text, voice, step = NUM_STEP) {
  return crypto.createHash('sha1').update(`${voice}|${step}|${text}`).digest('hex');
}

async function generate(text) {
  const res = await fetch(`${BASE_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: text,
      voice: VOICE_ID,
      response_format: 'mp3',
      num_step: NUM_STEP,
      guidance_scale: GUIDANCE_SCALE,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const ITEMS = [
  {
    assetName: 'faris_wake.mp3',
    text: 'لبيك! أنا فارس معك، تفضل بسؤالك.',
  },
  {
    assetName: 'faris_switch.mp3',
    text: 'أهلاً بك، أنا فارس معك الآن، جاهز لمساعدتك في كل ما تحتاج.',
  },
  {
    assetName: 'faris_wake_enabled.mp3',
    text: 'تم تفعيل الاستماع للمناداة. يمكنك مناداتي بقولك: يا فارس.',
  },
  {
    assetName: 'faris_landing_intro.mp3',
    text: 'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي.',
  },
  {
    text: 'أهلاً بك في لوحة التحكم والعمليات.',
  },
  {
    text: 'أبشر، تحت أمرك وفي خدمتك دائماً.',
  },
  {
    text: 'سم، تفضل أنا معك.',
  },
];

async function main() {
  console.log(`Starting Faris Studio Quality Generation (Salim 1: ${VOICE_ID}, steps: ${NUM_STEP}, guidance: ${GUIDANCE_SCALE})...`);

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const cleaned = cleanText(item.text);
    const key16 = cacheKey(cleaned, VOICE_ID, 16);
    const key6 = cacheKey(cleaned, VOICE_ID, 6);

    const targetAsset = item.assetName ? path.join(AUDIO_DIR, item.assetName) : null;
    const targetSalim16 = path.join(SALIM_DIR, `${key16}.mp3`);
    const targetSalim6 = path.join(SALIM_DIR, `${key6}.mp3`);
    const targetCache16 = path.join(CACHE_DIR, `${key16}.mp3`);

    console.log(`\n[${i + 1}/${ITEMS.length}] Generating: "${cleaned}"...`);
    const start = Date.now();
    try {
      const buffer = await generate(cleaned);
      if (targetAsset) {
        fs.writeFileSync(targetAsset, buffer);
        console.log(`  ✓ Updated asset: ${item.assetName}`);
      }
      fs.writeFileSync(targetSalim16, buffer);
      fs.writeFileSync(targetSalim6, buffer);
      fs.writeFileSync(targetCache16, buffer);
      const secs = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✓ Saved step 16 & 6 caches (${buffer.length} bytes in ${secs}s)`);
    } catch (err) {
      console.error(`  ✗ Generation failed:`, err.message);
    }
  }

  console.log('\n=== All Faris generation complete ===');
}

main();

