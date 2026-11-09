/**
 * Noura Batch Voice Generator
 * =====================================
 * Generates all essential phrases and pre-recorded audio assets for "Noura"
 * using the cloned voice "نورة" (ID: 69afeaaf) from VoiceStudio (http://localhost:3900).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3900';
const VOICE_ID = '69afeaaf'; // نورة
const MODEL = 'omnivoice';
const NUM_STEP = 16; // Studio Quality Preset
const GUIDANCE_SCALE = 2.0;

const CACHE_DIR = path.resolve(process.cwd(), 'node_modules', '.cache', 'voicestudio-tts');
const AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');
const PERM_DIR = path.resolve(process.cwd(), 'public', 'audio', 'noura');

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(PERM_DIR, { recursive: true });

function cacheKey(text, voice) {
  return crypto.createHash('sha1').update(`${voice}|${NUM_STEP}|${text}`).digest('hex');
}

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

async function generateSpeech(text) {
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
    const errText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const ITEMS = [
  // Core Pre-recorded Audio Assets
  {
    assetName: 'noura_wake.mp3',
    text: 'لبيكِ! أنا نُورة معكِ، تفضلي بسؤالكِ.',
  },
  {
    assetName: 'noura_switch.mp3',
    text: 'مرحباً بكِ، أنا نُورة معكِ الآن، يسعدني خدمتكِ في المنظومة.',
  },
  {
    assetName: 'noura_wake_enabled.mp3',
    text: 'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي بقولكِ: يا نُورة.',
  },
  {
    assetName: 'noura_landing_intro.mp3',
    text: 'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية.',
  },
  {
    assetName: 'noura_shelter_intro.mp3',
    text: 'أهلاً بكم في مركز الإيواء والرعاية الإنسانية الشاملة.',
  },

  // Conversational Core
  {
    text: 'أهلاً بكِ في لوحة التحكم والعمليات.',
  },
  {
    text: 'أبشري، تحت أمرك وفي خدمتك دائماً.',
  },
  {
    text: 'سمّي، تفضلي أنا معكِ.',
  },
  {
    text: 'تم كتم الصوت.',
  },
  {
    text: 'تم إلغاء العملية بناءً على طلبكِ.',
  },

  // Navigation & Operations
  {
    text: 'تم فتح شاشة إدارة الموارد البشرية والرواتب بنجاح.',
  },
  {
    text: 'تم فتح شاشة إدارة علاقات العملاء وخدمات الاستقدام بنجاح.',
  },
  {
    text: 'تم فتح شاشة مركز الإيواء والرعاية بنجاح.',
  },
  {
    text: 'تم تسجيل النزيلة بنجاح وتسكينها في مركز الإيواء.',
  },
  {
    text: 'تم تحديث بيانات ملف الموظف وسجل الإقامات بنجاح.',
  },
  {
    text: 'جميع معدلات الإنجاز منتظمة والعمليات مستقرة.',
  },
];

async function run() {
  console.log(`Starting Noura voice generation for ${ITEMS.length} phrases using voice "نورة" (${VOICE_ID})...`);

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const cleaned = cleanText(item.text);
    const key = cacheKey(cleaned, VOICE_ID);
    const cacheFile = path.join(CACHE_DIR, `${key}.mp3`);
    const permFile = path.join(PERM_DIR, `${key}.mp3`);
    const assetFile = item.assetName ? path.join(AUDIO_DIR, item.assetName) : null;

    const alreadyCached = fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 1000;
    const alreadyInPerm = fs.existsSync(permFile) && fs.statSync(permFile).size > 1000;
    const alreadyInAsset = assetFile && fs.existsSync(assetFile) && fs.statSync(assetFile).size > 1000;

    if (alreadyCached && alreadyInPerm) {
      console.log(`[${i + 1}/${ITEMS.length}] Already exists (Studio Quality): "${cleaned}"`);
      if (assetFile && (!alreadyInAsset || fs.statSync(assetFile).size !== fs.statSync(cacheFile).size)) {
        fs.copyFileSync(cacheFile, assetFile);
      }
      continue;
    }

    console.log(`\n[${i + 1}/${ITEMS.length}] Generating: "${cleaned}"...`);
    const start = Date.now();

    try {
      const buffer = await generateSpeech(cleaned);
      fs.writeFileSync(cacheFile, buffer);
      fs.writeFileSync(permFile, buffer);
      if (assetFile) {
        fs.writeFileSync(assetFile, buffer);
      }
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✓ Done in ${duration}s (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err.message);
    }
  }

  console.log('\nAll Noura generation completed!');
}

run();

