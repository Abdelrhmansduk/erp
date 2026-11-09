/**
 * Salim 1 Batch Voice Generator
 * =====================================
 * Generates all essential phrases and pre-recorded audio assets for "Faris"
 * using the cloned voice "سليم1" (ID: 680a2504) from VoiceStudio (http://localhost:3900).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3900';
const VOICE_ID = '680a2504'; // سليم1
const MODEL = 'omnivoice';
const NUM_STEP = 16; // Studio Quality Preset
const GUIDANCE_SCALE = 2.0;

const CACHE_DIR = path.resolve(process.cwd(), 'node_modules', '.cache', 'voicestudio-tts');
const AUDIO_DIR = path.resolve(process.cwd(), 'public', 'audio');

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

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
  // Core Audio Assets
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

  // Conversational Core
  {
    text: 'أهلاً بك في لوحة التحكم.',
  },
  {
    text: 'أبشر، تحت أمرك يا طويل العمر.',
  },
  {
    text: 'سم، تفضل أنا معك.',
  },
  {
    text: 'تم كتم الصوت.',
  },
  {
    text: 'تم إلغاء العملية بناءً على طلبك.',
  },

  // Navigation Confirmations
  {
    text: 'تم فتح شاشة المنظومة المالية والمحاسبية الموحدة بنجاح.',
  },
  {
    text: 'تم فتح شاشة مركز العمليات والرقابة الشاملة بنجاح.',
  },
  {
    text: 'تم فتح شاشة إدارة الموارد البشرية والرواتب بنجاح.',
  },
  {
    text: 'تم فتح شاشة إدارة علاقات العملاء وخدمات الاستقدام بنجاح.',
  },
  {
    text: 'تم فتح شاشة مركز الإيواء والرعاية بنجاح.',
  },

  // Concise Financial & Operational Responses
  {
    text: 'تم تسجيل قيد اليومية بنجاح في دفتر الأستاذ العام.',
  },
  {
    text: 'تم إصدار الفاتورة الضريبية وتوثيقها في زاتكا بنجاح.',
  },
  {
    text: 'تم اعتماد سند الصرف بنجاح وتوثيقه مالياً.',
  },
  {
    text: 'تم استخراج وقراءة بيانات المستند المالي بنجاح.',
  },
  {
    text: 'الربط مع زاتكا مفعل ومطابق للمرحلة الثانية بنجاح.',
  },
  {
    text: 'جميع مؤشرات الأداء مستقرة والعمليات التشغيلية ممتازة.',
  },
  {
    text: 'مرحباً بك، السيولة النقدية ممتازة والمؤشرات مستقرة.',
  },
];

async function run() {
  console.log(`Starting generation for ${ITEMS.length} phrases using voice "سليم1" (${VOICE_ID})...`);

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const cleaned = cleanText(item.text);
    const key = cacheKey(cleaned, VOICE_ID);
    const cacheFile = path.join(CACHE_DIR, `${key}.mp3`);
    const assetFile = item.assetName ? path.join(AUDIO_DIR, item.assetName) : null;

    const alreadyCached = fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 1000;
    const alreadyInAsset = assetFile && fs.existsSync(assetFile) && fs.statSync(assetFile).size > 1000;

    if (alreadyCached && (!assetFile || alreadyInAsset)) {
      console.log(`[${i + 1}/${ITEMS.length}] Already exists: "${cleaned}"`);
      if (assetFile && !alreadyInAsset) {
        fs.copyFileSync(cacheFile, assetFile);
      }
      continue;
    }

    console.log(`\n[${i + 1}/${ITEMS.length}] Generating: "${cleaned}"...`);
    const start = Date.now();

    try {
      const buffer = await generateSpeech(cleaned);
      fs.writeFileSync(cacheFile, buffer);
      if (assetFile) {
        fs.writeFileSync(assetFile, buffer);
      }
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  ✓ Done in ${duration}s (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err.message);
    }
  }

  console.log('\nAll generation completed!');
}

run();
