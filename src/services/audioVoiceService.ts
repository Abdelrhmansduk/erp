/**
 * audioVoiceService.ts
 * Comprehensive high-fidelity audio, chime, and voice synthesis engine for Faris and Noura personas.
 * Features:
 * 1. Strict Single-Channel Mutex (activePlaybackId + allActiveAudioElements + activeFetchController: Zero audio overlap).
 * 2. Pre-recorded High-Fidelity Saudi Audio Assets for instant response.
 * 3. Real-Time Streaming Neural TTS via /api/tts (ar-SA-ZariyahNeural for Noura, ar-SA-HamedNeural for Faris).
 * 4. Harmonic crystalline & executive chimes via Web Audio API, cleanly sequenced BEFORE speech.
 * 5. Global Speech State & Echo Protection Tracker (prevents microphone feedback loops).
 * 6. Resilient Web Speech API fallback (only when server TTS is unreachable, never on intentional stop/abort).
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

// Global audio state & strict single-channel mutex locks
let activePlaybackId = 0;
let currentHtmlAudio: HTMLAudioElement | null = null;
const allActiveAudioElements = new Set<HTMLAudioElement>();
let activeFetchController: AbortController | null = null;
let activeAudioContext: AudioContext | null = null;
let speechKeepAliveTimer: any = null;
let pendingSpeechTimeout: any = null;
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
    } catch (_) { }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('assistant-speech-state', { detail: { speaking } }));
  }
}

/**
 * Check if the assistant audio system is currently playing or speaking.
 */
export function isAudioSpeaking(): boolean {
  if (isGlobalSpeaking) return true;
  if (currentHtmlAudio && !currentHtmlAudio.paused && !currentHtmlAudio.ended) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) return true;
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

function silenceAllHtmlAudioElements() {
  if (currentHtmlAudio) {
    allActiveAudioElements.add(currentHtmlAudio);
    currentHtmlAudio = null;
  }
  allActiveAudioElements.forEach((audioEl) => {
    try {
      // Detach event handlers FIRST so pausing/clearing never triggers onerror fallback!
      audioEl.onplay = null;
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch { }
  });
  allActiveAudioElements.clear();
}

/**
 * Force stop all audio immediately (HTML5 Audio, in-flight TTS fetch, Web Audio, Web Speech Synthesis)
 */
export function stopAllAudio(): number {
  activePlaybackId += 1;

  if (activeFetchController) {
    try {
      activeFetchController.abort();
    } catch { }
    activeFetchController = null;
  }

  if (pendingChimeTimeout) {
    clearTimeout(pendingChimeTimeout);
    pendingChimeTimeout = null;
  }

  if (pendingSpeechTimeout) {
    clearTimeout(pendingSpeechTimeout);
    pendingSpeechTimeout = null;
  }

  silenceAllHtmlAudioElements();

  if (activeAudioContext) {
    try {
      activeAudioContext.close().catch(() => { });
    } catch { }
    activeAudioContext = null;
  }

  if (speechKeepAliveTimer) {
    clearInterval(speechKeepAliveTimer);
    speechKeepAliveTimer = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch { }
  }

  if (isGlobalSpeaking) {
    notifyStateChange(false);
  }

  return activePlaybackId;
}

/**
 * Play a signature harmonic chime using the Web Audio API.
 * - Noura: Elegant shimmering bell chord (E5 + A5)
 * - Faris: Warm executive resonant chord (C4 + G4)
 */
export function playPersonaChime(persona: AssistantPersona, sessionId?: number): Promise<void> {
  return new Promise((resolve) => {
    if (sessionId !== undefined && sessionId !== activePlaybackId) {
      resolve();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      if (activeAudioContext) {
        try {
          activeAudioContext.close().catch(() => { });
        } catch { }
        activeAudioContext = null;
      }

      const ctx = new AudioCtx();
      activeAudioContext = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (persona === 'noura') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.setValueAtTime(880.0, now);  // A5

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.10, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);

        osc1.connect(gain);
        osc2.connect(gain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.31);
        osc2.stop(now + 0.31);
      } else {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(261.63, now); // C4
        osc2.frequency.setValueAtTime(392.00, now); // G4

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.10, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.30);

        osc1.connect(gain);
        osc2.connect(gain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.31);
        osc2.stop(now + 0.31);
      }

      setTimeout(() => {
        try {
          ctx.close().catch(() => { });
        } catch { }
        if (activeAudioContext === ctx) {
          activeAudioContext = null;
        }
      }, 380);

      pendingChimeTimeout = setTimeout(() => {
        pendingChimeTimeout = null;
        resolve();
      }, 240);
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
  },
  existingSessionId?: number
): boolean {
  const url = AUDIO_ASSETS[key];
  if (!url) return false;

  const sessionId = existingSessionId ?? stopAllAudio();
  if (sessionId !== activePlaybackId) return false;

  silenceAllHtmlAudioElements();
  notifyStateChange(true);

  try {
    const audio = new Audio(url);
    currentHtmlAudio = audio;
    allActiveAudioElements.add(audio);

    audio.onplay = () => {
      if (sessionId !== activePlaybackId) {
        silenceAllHtmlAudioElements();
        return;
      }
      callbacks?.onStart?.();
    };

    audio.onended = () => {
      allActiveAudioElements.delete(audio);
      if (currentHtmlAudio === audio) {
        currentHtmlAudio = null;
      }
      if (sessionId === activePlaybackId) {
        notifyStateChange(false);
        callbacks?.onEnd?.();
      }
    };

    audio.onerror = (e) => {
      allActiveAudioElements.delete(audio);
      if (currentHtmlAudio !== audio || sessionId !== activePlaybackId) return;
      currentHtmlAudio = null;
      notifyStateChange(false);
      callbacks?.onError?.(e);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err?.name === 'AbortError' || sessionId !== activePlaybackId) {
          return;
        }
        allActiveAudioElements.delete(audio);
        if (currentHtmlAudio === audio) {
          currentHtmlAudio = null;
        }
        notifyStateChange(false);
        callbacks?.onError?.(err);
      });
    }
    return true;
  } catch (e) {
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
    .replace(/\bSMACC\b/gi, 'المحاسبة')
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

const clientTtsBlobCache = new Map<string, Blob>();

function trimForSpokenCadence(clean: string, maxChars = 420): string {
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastStop = Math.max(
    slice.lastIndexOf('۔'),
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('؟'),
    slice.lastIndexOf('،')
  );
  return lastStop > 120 ? slice.slice(0, lastStop).trim() : slice.trim();
}

/**
 * Dynamic speech synthesis engine:
 * 1. Immediately stops all previous audio & increments activePlaybackId so no two voices ever overlap.
 * 2. Tries /api/tts endpoint (Saudi Neural Voices: ar-SA-HamedNeural for Faris, ar-SA-ZariyahNeural for Noura).
 * 3. Uses Web Speech API fallback ONLY if /api/tts network request failed (never when intentionally stopped).
 */
export async function speakDynamicSpeech(
  text: string,
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  },
  existingSessionId?: number
) {
  const rawClean = cleanSpeechText(text);
  const clean = trimForSpokenCadence(rawClean, 420);
  if (!clean) {
    callbacks?.onEnd?.();
    return;
  }

  const sessionId = existingSessionId ?? stopAllAudio();
  if (sessionId !== activePlaybackId) return;

  notifyStateChange(true);

  const isTestEnv = typeof navigator !== 'undefined' && /jsdom|happy-dom/i.test(navigator.userAgent || '');
  const serverTtsDisabled =
    typeof window === 'undefined' ||
    isTestEnv ||
    window.localStorage.getItem('DISABLE_SERVER_TTS') === 'true';

  if (!serverTtsDisabled) {
    try {
      const cacheKey = `${persona}:${clean}`;
      let blob = clientTtsBlobCache.get(cacheKey);

      if (!blob) {
        const controller = new AbortController();
        activeFetchController = controller;
        let timedOut = false;
        const timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, 8500);

        const res = clean.length > 120
          ? await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean, persona }),
            signal: controller.signal,
          })
          : await fetch(`/api/tts?text=${encodeURIComponent(clean)}&persona=${persona}`, {
            signal: controller.signal,
          });
        clearTimeout(timeoutId);

        if (sessionId !== activePlaybackId) {
          return;
        }

        if (res.ok && res.headers.get('content-type')?.includes('audio')) {
          blob = await res.blob();
          if (sessionId !== activePlaybackId) {
            return;
          }
          if (blob.size > 0) {
            if (clientTtsBlobCache.size >= 60) {
              const firstKey = clientTtsBlobCache.keys().next().value;
              if (firstKey) clientTtsBlobCache.delete(firstKey);
            }
            clientTtsBlobCache.set(cacheKey, blob);
          }
        }
      }

      if (sessionId !== activePlaybackId) {
        return;
      }

      if (blob && blob.size > 0) {
        // Silence any stray audio before starting playback
        silenceAllHtmlAudioElements();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try { window.speechSynthesis.cancel(); } catch { }
        }

        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        currentHtmlAudio = audio;
        allActiveAudioElements.add(audio);

        audio.onplay = () => {
          if (sessionId !== activePlaybackId) {
            silenceAllHtmlAudioElements();
            URL.revokeObjectURL(objectUrl);
            return;
          }
          callbacks?.onStart?.();
        };

        audio.onended = () => {
          URL.revokeObjectURL(objectUrl);
          allActiveAudioElements.delete(audio);
          if (currentHtmlAudio === audio) {
            currentHtmlAudio = null;
          }
          if (sessionId === activePlaybackId) {
            notifyStateChange(false);
            callbacks?.onEnd?.();
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          allActiveAudioElements.delete(audio);
          if (currentHtmlAudio !== audio || sessionId !== activePlaybackId) {
            return;
          }
          currentHtmlAudio = null;
          notifyStateChange(false);
          callbacks?.onEnd?.();
        };

        try {
          await audio.play();
        } catch (playErr: any) {
          URL.revokeObjectURL(objectUrl);
          allActiveAudioElements.delete(audio);
          if (currentHtmlAudio === audio) {
            currentHtmlAudio = null;
          }
          if (playErr?.name === 'AbortError' || sessionId !== activePlaybackId) {
            return;
          }
          notifyStateChange(false);
          callbacks?.onEnd?.();
        }
        return;
      }
    } catch (err: any) {
      // If aborted because a newer speech request started (sessionId !== activePlaybackId), exit immediately!
      if (sessionId !== activePlaybackId) {
        return;
      }
    }
  }

  if (sessionId !== activePlaybackId) {
    return;
  }

  // Attempt 2: Zero-latency Web Speech API (only if server TTS is unreachable and session is still active)
  speakViaWebSpeechApi(clean, persona, callbacks, sessionId);
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
  },
  sessionId?: number
) {
  if (sessionId !== undefined && sessionId !== activePlaybackId) {
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    notifyStateChange(false);
    callbacks?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
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
      if (sessionId === undefined || sessionId === activePlaybackId) {
        notifyStateChange(false);
        callbacks?.onEnd?.();
      }
    };

    utterance.onstart = () => {
      if (sessionId !== undefined && sessionId !== activePlaybackId) {
        window.speechSynthesis.cancel();
        return;
      }
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      cleanup();
    };

    utterance.onerror = (e) => {
      cleanup();
      callbacks?.onError?.(e);
    };

    (window as any).__activeSpeechUtterance = utterance;

    pendingSpeechTimeout = setTimeout(() => {
      pendingSpeechTimeout = null;
      if (sessionId !== undefined && sessionId !== activePlaybackId) {
        return;
      }
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);

        speechKeepAliveTimer = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(speechKeepAliveTimer);
            speechKeepAliveTimer = null;
          } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 10000);
      } catch {
        cleanup();
      }
    }, 40);
  } catch {
    notifyStateChange(false);
    callbacks?.onEnd?.();
  }
}

/**
 * Play Persona Introduction (Landing Page / Hero)
 * Sequenced under a single session lock: Chime -> Voice
 */
export function playPersonaIntroGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  const sessionId = stopAllAudio();
  playPersonaChime(persona, sessionId).then(() => {
    if (sessionId !== activePlaybackId) return;
    const assetKey = persona === 'noura' ? 'noura_intro' : 'faris_intro';
    const played = playPreRecordedAudio(assetKey, callbacks, sessionId);
    if (!played) {
      const fallbackText = persona === 'noura'
        ? 'أهلاً بكم في مجموعة خالد السليم! أنا نُورة، مرشدتكم الرقمية الذكية.'
        : 'أهلاً بكم في مجموعة خالد السليم! أنا فارس، مرشدكم الرقمي الذكي.';
      speakDynamicSpeech(fallbackText, persona, callbacks, sessionId);
    }
  });
}

/**
 * Play Persona Switch greeting
 * Sequenced under a single session lock: Chime -> Cloned Studio Voice
 */
export function playPersonaSwitchGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  const sessionId = stopAllAudio();
  playPersonaChime(persona, sessionId).then(() => {
    if (sessionId !== activePlaybackId) return;
    const assetKey = persona === 'noura' ? 'noura_switch' : 'faris_switch';
    const played = playPreRecordedAudio(assetKey, callbacks, sessionId);
    if (!played) {
      const switchText = persona === 'noura'
        ? 'مرحباً بكِ، أنا نُورة معكِ الآن، يسعدني خدمتكِ في المنظومة.'
        : 'أهلاً بك، أنا فارس معك الآن، جاهز لمساعدتك في كل ما تحتاج.';
      speakDynamicSpeech(switchText, persona, callbacks, sessionId);
    }
  });
}

/**
 * Play Wake Word Response greeting ("لبيك...")
 * Sequenced under a single session lock: Chime -> Cloned Studio Voice
 */
export function playPersonaWakeGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  const sessionId = stopAllAudio();
  playPersonaChime(persona, sessionId).then(() => {
    if (sessionId !== activePlaybackId) return;
    const assetKey = persona === 'noura' ? 'noura_wake' : 'faris_wake';
    const played = playPreRecordedAudio(assetKey, callbacks, sessionId);
    if (!played) {
      const wakeText = persona === 'noura'
        ? 'لبيكِ! أنا نُورة معكِ، تفضلي بسؤالكِ.'
        : 'لبيك! أنا فارس معك، تفضل بسؤالك.';
      speakDynamicSpeech(wakeText, persona, callbacks, sessionId);
    }
  });
}

/**
 * Play Wake Word Activated confirmation ("تم تفعيل الاستماع للمناداة...")
 * Sequenced under a single session lock: Chime -> Cloned Studio Voice
 */
export function playWakeEnabledGreeting(
  persona: AssistantPersona,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  const sessionId = stopAllAudio();
  playPersonaChime(persona, sessionId).then(() => {
    if (sessionId !== activePlaybackId) return;
    const assetKey = persona === 'noura' ? 'noura_wake_enabled' : 'faris_wake_enabled';
    const played = playPreRecordedAudio(assetKey, callbacks, sessionId);
    if (!played) {
      const enabledText = persona === 'noura'
        ? 'تم تفعيل الاستماع للمناداة. يمكنكِ مناداتي بقولكِ: يا نُورة.'
        : 'تم تفعيل الاستماع للمناداة. يمكنك مناداتي بقولك: يا فارس.';
      speakDynamicSpeech(enabledText, persona, callbacks, sessionId);
    }
  });
}
