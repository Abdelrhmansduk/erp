/**
 * audioVoiceService.ts
 * Comprehensive high-fidelity audio, chime, and voice synthesis engine for Faris and Noura personas.
 * Features:
 * 1. Mutual Exclusion Audio Coordinator (Strict Single-Channel Audio: No overlapping or audio collisions).
 * 2. Pre-recorded High-Fidelity Saudi Audio Assets for instant response.
 * 3. Real-Time Streaming Neural TTS via /api/tts (Zariyah for Noura, Hamed for Faris).
 * 4. Harmonic crystalline & executive chimes via Web Audio API, cleanly sequenced BEFORE speech.
 * 5. Global Speech State & Echo Protection Tracker (prevents microphone feedback loops).
 * 6. Resilient Web Speech API fallback.
 */

export type AssistantPersona = 'faris' | 'noura';

// Audio assets map for instant, zero-latency playback
const AUDIO_ASSETS: Record<string, string> = {
  'noura_intro': '/audio/noura_landing_intro.mp3',
  'faris_intro': '/audio/faris_landing_intro.mp3',
  'noura_switch': '/audio/noura_switch.mp3',
  'faris_switch': '/audio/faris_switch.mp3',
  'noura_shelter': '/audio/noura_shelter_intro.mp3',
  'noura_wake': '/audio/noura_wake.mp3',
  'faris_wake': '/audio/faris_wake.mp3',
  'noura_wake_enabled': '/audio/noura_wake_enabled.mp3',
  'faris_wake_enabled': '/audio/faris_wake_enabled.mp3',
};

// Global audio state & locks
let currentHtmlAudio: HTMLAudioElement | null = null;
let activeAudioContext: AudioContext | null = null;
let speechKeepAliveTimer: any = null;
let pendingChimeTimeout: any = null;
let isGlobalSpeaking = false;
let lastSpeechEndTime = 0;
const stateListeners = new Set<(speaking: boolean) => void>();

function notifyStateChange(speaking: boolean) {
  isGlobalSpeaking = speaking;
  if (!speaking) {
    lastSpeechEndTime = Date.now();
  }
  stateListeners.forEach(cb => {
    try {
      cb(speaking);
    } catch (_) {}
  });
  window.dispatchEvent(new CustomEvent('assistant-speech-state', { detail: { speaking } }));
}

/**
 * Check if the assistant audio system is currently playing or speaking.
 */
export function isAudioSpeaking(): boolean {
  if (isGlobalSpeaking) return true;
  if (currentHtmlAudio && !currentHtmlAudio.paused && !currentHtmlAudio.ended) return true;
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) return true;
  return false;
}

/**
 * Get the timestamp when the assistant last finished speaking.
 * Useful to enforce microphone suppression / echo decay guard.
 */
export function getLastSpeechTimestamp(): number {
  return lastSpeechEndTime;
}

/**
 * Subscribe to speech state changes (speaking / stopped)
 */
export function subscribeAudioState(callback: (speaking: boolean) => void): () => void {
  stateListeners.add(callback);
  return () => {
    stateListeners.delete(callback);
  };
}

/**
 * Force stop all audio immediately (HTML5 Audio, Web Audio, Web Speech Synthesis)
 */
export function stopAllAudio() {
  if (pendingChimeTimeout) {
    clearTimeout(pendingChimeTimeout);
    pendingChimeTimeout = null;
  }

  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio.src = '';
    } catch {}
    currentHtmlAudio = null;
  }

  if (activeAudioContext) {
    try {
      activeAudioContext.close().catch(() => {});
    } catch {}
    activeAudioContext = null;
  }

  if (speechKeepAliveTimer) {
    clearInterval(speechKeepAliveTimer);
    speechKeepAliveTimer = null;
  }

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  if (isGlobalSpeaking) {
    notifyStateChange(false);
  }
}

/**
 * Play a signature harmonic chime using the Web Audio API.
 * - Noura: Elegant shimmering bell chord (E5 + A5)
 * - Faris: Warm executive resonant chord (C4 + G4)
 * Returns a Promise that resolves after the chime's main transient (280ms),
 * allowing speech to start cleanly without audio collision!
 */
export function playPersonaChime(persona: AssistantPersona): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      if (activeAudioContext) {
        try {
          activeAudioContext.close().catch(() => {});
        } catch {}
        activeAudioContext = null;
      }

      const ctx = new AudioCtx();
      activeAudioContext = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (persona === 'noura') {
        // Shimmering feminine crystalline bell
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.setValueAtTime(880.0, now);  // A5

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.36);
        osc2.stop(now + 0.36);
      } else {
        // Warm executive resonance
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(261.63, now); // C4
        osc2.frequency.setValueAtTime(392.00, now); // G4

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.36);
        osc2.stop(now + 0.36);
      }

      setTimeout(() => {
        try {
          ctx.close().catch(() => {});
        } catch {}
        if (activeAudioContext === ctx) {
          activeAudioContext = null;
        }
      }, 450);

      // Resolve at 280ms so subsequent speech starts right as chime fades smoothly
      setTimeout(resolve, 280);
    } catch (err) {
      console.debug('[Audio] Chime error:', err);
      resolve();
    }
  });
}

/**
 * Play a pre-recorded audio asset with guaranteed mutual exclusion.
 */
export function playPreRecordedAudio(
  key: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: any) => void;
  }
): boolean {
  const url = AUDIO_ASSETS[key];
  if (!url) return false;

  stopAllAudio();
  notifyStateChange(true);

  try {
    const audio = new Audio(url);
    currentHtmlAudio = audio;

    audio.onplay = () => {
      callbacks?.onStart?.();
    };

    audio.onended = () => {
      currentHtmlAudio = null;
      notifyStateChange(false);
      callbacks?.onEnd?.();
    };

    audio.onerror = (e) => {
      if (currentHtmlAudio !== audio) return;
      console.warn('[Audio] Asset error:', e);
      currentHtmlAudio = null;
      notifyStateChange(false);
      callbacks?.onError?.(e);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err?.name === 'AbortError') {
          // Playback was intentionally stopped or replaced by another track
          return;
        }
        console.warn('[Audio] HTML5 play() rejected:', err);
        if (currentHtmlAudio === audio) {
          currentHtmlAudio = null;
        }
        notifyStateChange(false);
        callbacks?.onError?.(err);
      });
    }
    return true;
  } catch (e) {
    console.warn('[Audio] Instantiation error:', e);
    notifyStateChange(false);
    callbacks?.onError?.(e);
    callbacks?.onEnd?.();
    return false;
  }
}

/**
 * Clean and prepare text for fluent Arabic speech synthesis
 * Converts technical acronyms and currency symbols into natural spoken Arabic.
 */
function cleanSpeechText(text: string): string {
  return text
    .replace(/\{[\s\S]*?"tool_call"[\s\S]*?\}[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\bZATCA\b/gi, 'زاتكا')
    .replace(/\bSMACC\b/gi, 'سماك')
    .replace(/\bBOQ\b/gi, 'جدول الكميات')
    .replace(/\bHRSD\b/gi, 'وزارة الموارد البشرية')
    .replace(/\bWPS\b/gi, 'نظام حماية الأجور')
    .replace(/\bATS\b/gi, 'منظومة التوظيف الذكي')
    .replace(/\bCRM\b/gi, 'إدارة العملاء')
    .replace(/\bIAM\b/gi, 'إدارة الهوية والصلاحيات')
    .replace(/\bSLA\b/gi, 'اتفاقية مستوى الخدمة')
    .replace(/\bVIP\b/gi, 'كبار العملاء')
    .replace(/\bB2B\b/gi, 'قطاع الأعمال')
    .replace(/[\u20C1\uE900]|ر\.س|SAR/gi, 'ريال سعودي')
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

/**
 * Dynamic speech synthesis engine:
 * 1. Tries /api/tts endpoint if ENABLE_SERVER_TTS is enabled.
 * 2. Uses zero-latency Web Speech API with Saudi Arabic voice selection and phonetic normalization.
 */
export async function speakDynamicSpeech(
  text: string,
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  const clean = cleanSpeechText(text);
  if (!clean) {
    callbacks?.onEnd?.();
    return;
  }

  stopAllAudio();
  notifyStateChange(true);

  // Attempt 1: Optional Server-side Neural TTS stream (/api/tts) when enabled
  if (typeof window !== 'undefined' && window.localStorage.getItem('ENABLE_SERVER_TTS') === 'true') {
    try {
      const res = clean.length > 120
        ? await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean, persona }),
          })
        : await fetch(`/api/tts?text=${encodeURIComponent(clean)}&persona=${persona}`);

      if (res.ok && res.headers.get('content-type')?.includes('audio')) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        currentHtmlAudio = audio;

        audio.onplay = () => {
          callbacks?.onStart?.();
        };

        audio.onended = () => {
          URL.revokeObjectURL(objectUrl);
          currentHtmlAudio = null;
          notifyStateChange(false);
          callbacks?.onEnd?.();
        };

        audio.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          currentHtmlAudio = null;
          speakViaWebSpeechApi(clean, persona, callbacks);
        };

        await audio.play();
        return;
      }
    } catch {
      // Fallback to Web Speech API
    }
  }

  // Attempt 2: Zero-latency Web Speech API
  speakViaWebSpeechApi(clean, persona, callbacks);
}

/**
 * Web Speech API speech synthesis fallback with pitch/rate balancing and SAPI keep-alive
 */
function speakViaWebSpeechApi(
  cleanText: string,
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  if (!('speechSynthesis' in window)) {
    notifyStateChange(false);
    callbacks?.onEnd?.();
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';

    const voices = window.speechSynthesis.getVoices();
    const arabicVoices = voices.filter(v =>
      v.lang && (v.lang.toLowerCase().startsWith('ar') || v.lang.toLowerCase().includes('arabic'))
    );

    if (persona === 'noura') {
      const femaleVoice = arabicVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return (
          n.includes('female') || n.includes('woman') ||
          n.includes('salma') || n.includes('zariyah') ||
          n.includes('laila') || n.includes('layla') ||
          n.includes('fatima') || n.includes('zeina') ||
          n.includes('hoda') || n.includes('mariam') ||
          n.includes('maryam') || n.includes('sana') ||
          n.includes('nour') || n.includes('noura') ||
          n.includes('hala') || n.includes('rana') ||
          n.includes('amira') || n.includes('yasmin')
        );
      }) || (arabicVoices.length > 1 ? arabicVoices[1] : arabicVoices[0]);

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      // If only Naayf exists, elevate pitch slightly with smooth rate
      utterance.pitch = femaleVoice && femaleVoice.name.toLowerCase().includes('naayf') ? 1.22 : 1.08;
      utterance.rate = 1.02;
    } else {
      const maleVoice = arabicVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return (
          n.includes('male') || n.includes('man') ||
          n.includes('maged') || n.includes('naayf') ||
          n.includes('hamed') || n.includes('tarik') ||
          n.includes('tariq') || n.includes('shakir') ||
          n.includes('ahmed') || n.includes('omar')
        );
      }) || arabicVoices[0];

      if (maleVoice) {
        utterance.voice = maleVoice;
      }
      utterance.pitch = 0.95;
      utterance.rate = 0.98;
    }

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      if (speechKeepAliveTimer) {
        clearInterval(speechKeepAliveTimer);
        speechKeepAliveTimer = null;
      }
      notifyStateChange(false);
      callbacks?.onEnd?.();
    };

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      cleanup();
    };

    utterance.onerror = (e) => {
      console.warn('[Audio] SpeechSynthesis error:', e);
      cleanup();
      callbacks?.onError?.(e);
    };

    (window as any).__activeSpeechUtterance = utterance;

    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);

        speechKeepAliveTimer = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(speechKeepAliveTimer);
            speechKeepAliveTimer = null;
          } else {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 500);
      } catch (err) {
        console.warn('[Audio] SpeechSynthesis speak call error:', err);
        cleanup();
      }
    }, 40);
  } catch (err) {
    console.warn('[Audio] Speech setup failed:', err);
    notifyStateChange(false);
    callbacks?.onEnd?.();
  }
}

/**
 * Play Persona Introduction (Landing Page / Hero)
 * Sequenced: Chime (280ms) -> Voice MP3
 */
export function playPersonaIntroGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  stopAllAudio();
  playPersonaChime(persona).then(() => {
    const audioKey = `${persona}_intro`;
    const played = playPreRecordedAudio(audioKey, {
      onStart: callbacks?.onStart,
      onEnd: callbacks?.onEnd,
      onError: () => {
        const fallbackText = persona === 'noura'
          ? 'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية.'
          : 'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي.';
        speakDynamicSpeech(fallbackText, persona, callbacks);
      }
    });

    if (!played) {
      const fallbackText = persona === 'noura'
        ? 'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية.'
        : 'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي.';
      speakDynamicSpeech(fallbackText, persona, callbacks);
    }
  });
}

/**
 * Play Persona Switch greeting
 * Sequenced: Chime (280ms) -> Voice MP3
 */
export function playPersonaSwitchGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  stopAllAudio();
  playPersonaChime(persona).then(() => {
    const audioKey = `${persona}_switch`;
    const played = playPreRecordedAudio(audioKey, {
      onStart: callbacks?.onStart,
      onEnd: callbacks?.onEnd,
      onError: () => {
        const fallbackText = persona === 'noura'
          ? 'مرحباً بكِ، أنا نُورة معكِ الآن، يسعدني خدمتكِ وتوجيهكِ في المنظومة.'
          : 'أهلاً بك، أنا فارس جاهز لمساعدتك في كل ما تحتاج.';
        speakDynamicSpeech(fallbackText, persona, callbacks);
      }
    });

    if (!played) {
      const fallbackText = persona === 'noura'
        ? 'مرحباً بكِ، أنا نُورة معكِ الآن.'
        : 'أهلاً بك، أنا فارس جاهز لمساعدتك.';
      speakDynamicSpeech(fallbackText, persona, callbacks);
    }
  });
}

/**
 * Play Wake Word Response greeting ("لبيك...")
 * Sequenced: Chime (280ms) -> Voice MP3
 */
export function playPersonaWakeGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  stopAllAudio();
  playPersonaChime(persona).then(() => {
    const audioKey = `${persona}_wake`;
    const played = playPreRecordedAudio(audioKey, {
      onStart: callbacks?.onStart,
      onEnd: callbacks?.onEnd,
      onError: () => {
        const fallbackText = persona === 'noura'
          ? 'لبيكِ يا عزيزتي! أنا نُورة معكِ، تفضلي بسؤالكِ.'
          : 'لبيك! أنا فارس معك، تفضل بسؤالك.';
        speakDynamicSpeech(fallbackText, persona, callbacks);
      }
    });

    if (!played) {
      const fallbackText = persona === 'noura'
        ? 'لبيكِ يا عزيزتي! أنا نُورة معكِ، تفضلي بسؤالكِ.'
        : 'لبيك! أنا فارس معك، تفضل بسؤالك.';
      speakDynamicSpeech(fallbackText, persona, callbacks);
    }
  });
}

/**
 * Play Wake Word Activated confirmation ("تم تفعيل الاستماع للمناداة...")
 * Sequenced: Chime (280ms) -> Voice MP3
 */
export function playWakeEnabledGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  stopAllAudio();
  playPersonaChime(persona).then(() => {
    const audioKey = `${persona}_wake_enabled`;
    const played = playPreRecordedAudio(audioKey, {
      onStart: callbacks?.onStart,
      onEnd: callbacks?.onEnd,
      onError: () => {
        const fallbackText = persona === 'noura'
          ? 'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي في أي وقت بقولكِ: يا نُورة.'
          : 'تم تفعيل الاستماع للمناداة. يمكنك مناداتي في أي وقت بقولك: يا فارس.';
        speakDynamicSpeech(fallbackText, persona, callbacks);
      }
    });

    if (!played) {
      const fallbackText = persona === 'noura'
        ? 'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي في أي وقت بقولكِ: يا نُورة.'
        : 'تم تفعيل الاستماع للمناداة. يمكنك مناداتي في أي وقت بقولك: يا فارس.';
      speakDynamicSpeech(fallbackText, persona, callbacks);
    }
  });
}
