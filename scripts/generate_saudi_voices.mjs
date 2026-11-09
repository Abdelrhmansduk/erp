import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audioDir = path.resolve(__dirname, '../public/audio');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const VOICE_SCRIPTS = [
  // Noura (Saudi Female - ZariyahNeural)
  {
    filename: 'noura_landing_intro.mp3',
    voice: 'ar-SA-ZariyahNeural',
    text: 'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية. يسعدني مرافقتكم وتوجيهكم للأقسام النسائية ومراكز الإيواء والتسكين ونقل الخدمات وكافة أنظمة شركات المجموعة.'
  },
  {
    filename: 'noura_switch.mp3',
    voice: 'ar-SA-ZariyahNeural',
    text: 'مرحباً بكِ، أنا نُورة معكِ الآن، يسعدني خدمتكِ وتوجيهكِ في المنظومة ومراكز الإيواء والتسكين.'
  },
  {
    filename: 'noura_wake.mp3',
    voice: 'ar-SA-ZariyahNeural',
    text: 'لبيكِ يا عزيزتي! أنا نُورة معكِ، تفضلي بسؤالكِ.'
  },
  {
    filename: 'noura_wake_enabled.mp3',
    voice: 'ar-SA-ZariyahNeural',
    text: 'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي في أي وقت بقولكِ: يا نُورة.'
  },
  {
    filename: 'noura_shelter_intro.mp3',
    voice: 'ar-SA-ZariyahNeural',
    text: 'أهلاً بكِ في منظومة مراكز الإيواء والتسكين ونقل الخدمات المشتركة لمجموعة السليم. نضمن رعاية كريمة وامتثالاً تاماً للائحة وزارة الموارد البشرية والتنمية الاجتماعية.'
  },

  // Faris (Saudi Male Executive - HamedNeural)
  {
    filename: 'faris_landing_intro.mp3',
    voice: 'ar-SA-HamedNeural',
    text: 'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي. يسعدني مرافقتكم وتوجيهكم للدخول إلى أنظمة شركات المجموعة وإدارة العمليات والمنافسات الحكومية.'
  },
  {
    filename: 'faris_switch.mp3',
    voice: 'ar-SA-HamedNeural',
    text: 'أهلاً بك، أنا فارس جاهز لمساعدتك في العمليات ومنافسات كاس والأنظمة المركزية.'
  },
  {
    filename: 'faris_wake.mp3',
    voice: 'ar-SA-HamedNeural',
    text: 'لبيك! أنا فارس معك، تفضل بسؤالك.'
  },
  {
    filename: 'faris_wake_enabled.mp3',
    voice: 'ar-SA-HamedNeural',
    text: 'تم تفعيل الاستماع للمناداة. يمكنك مناداتي في أي وقت بقولك: يا فارس.'
  }
];

async function generateAll() {
  console.log('--- Generating High-Fidelity Authentic Saudi Voices ---');

  for (const item of VOICE_SCRIPTS) {
    const targetPath = path.join(audioDir, item.filename);
    console.log(`Generating: ${item.filename} using voice [${item.voice}]...`);
    
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(item.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(item.text);
      
      const fileStream = fs.createWriteStream(targetPath);
      await new Promise((resolve, reject) => {
        audioStream.pipe(fileStream);
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
        audioStream.on('error', reject);
      });

      const stat = fs.statSync(targetPath);
      console.log(`✓ Completed ${item.filename} (${stat.size} bytes)`);
    } catch (err) {
      console.error(`✗ Error generating ${item.filename}:`, err);
    }
  }

  console.log('--- All Voice Assets Generated Successfully! ---');
}

generateAll();
