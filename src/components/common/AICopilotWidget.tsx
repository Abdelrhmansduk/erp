import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { 
  X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  ArrowLeft, Bot, MessageSquare, CheckCircle2, RefreshCw, Zap,
  Minimize2, ShieldCheck, ShieldAlert, AlertTriangle, Radio, HelpCircle,
  Paperclip, Copy, Check, ClipboardList, ArrowRightLeft, UserCheck
} from 'lucide-react';
import { 
  playPersonaSwitchGreeting, 
  playPersonaChime, 
  playPersonaWakeGreeting,
  playWakeEnabledGreeting,
  speakDynamicSpeech, 
  stopAllAudio,
  isAudioSpeaking,
  getLastSpeechTimestamp,
  subscribeAudioState
} from '../../services/audioVoiceService';
import { 
  generateLocalAiResponse, 
  checkLocalAiAvailable, 
  getDepartmentTaskPlaybook, 
  generateEmployeeDailyBriefing 
} from '../../services/localAiService';
import { executeToolCall, logToolCancellation, buildConfirmationSummary, type ToolCallParsed } from '../../services/aiToolExecutor';
import { getToolById } from '../../services/aiToolRegistry';
import { dispatchVoiceCommand, VOICE_COMMANDS_GUIDE } from '../../services/voiceCommandService';
import { authService, resolveDepartmentAndCompany } from '../../services/authService';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { CorporateAvatar } from './CorporateAvatar';
import { BusinessIllustration } from './BusinessIllustration';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  spokenSummary?: string;
  timestamp: string;
  actionButton?: {
    label: string;
    actionKey: string;
  };
  suggestedPersonaHandoff?: {
    persona: AssistantPersona;
    reasonAr: string;
  };
}

export type AssistantPersona = 'faris' | 'noura';

/**
 * Resilient Arabic text normalizer for voice wake-word matching:
 * Strips tashkeel/diacritics, tatweel, standardizes alif variants (أ/إ/آ -> ا),
 * teh marbuta / heh (ة/ه), and alef maksura (ى -> ي).
 */
export function normalizeArabicWakeText(str: string): string {
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[\u0640]/g, '') // remove tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim()
    .toLowerCase();
}

export interface WakeDetection {
  detected: boolean;
  persona: AssistantPersona;
  directQuery: string;
}

export function detectWakeCall(rawText: string, defaultPersona: AssistantPersona): WakeDetection {
  const norm = normalizeArabicWakeText(rawText);
  if (!norm) return { detected: false, persona: defaultPersona, directQuery: '' };

  // Noura summon patterns:
  // "نوره", "نورة", "نورا", "يا نوره", "يا نورة", "يا نورا", "ام خالد", "يا ام خالد"
  const nouraRegex = /(?:^|\s|يا\s*|يا)(نور[هها]|ام\s*خالد)(?:$|\s|[،,\.?!])/i;

  // Faris summon patterns:
  // "فارس", "يا فارس", "يافارس", "فارسنا", "ابو فهد", "يا ابو فهد"
  const farisRegex = /(?:^|\s|يا\s*|يا)(فارس(?:نا)?|ابو\s*فهد)(?:$|\s|[،,\.?!])/i;

  // General assistant call:
  // "يا مرشد", "يا مرشده", "يا مساعد", "يا مساعدنا", "يا ذكاء", "يا كوبايلوت"
  const generalRegex = /(?:^|\s|يا\s*|يا)(مرشد[هه]?|مساعد(?:نا)?|ذكاء|كوبايلوت)(?:$|\s|[،,\.?!])/i;

  const matchNoura = nouraRegex.test(norm);
  const matchFaris = farisRegex.test(norm);
  const matchGeneral = generalRegex.test(norm);

  if (!matchNoura && !matchFaris && !matchGeneral) {
    return { detected: false, persona: defaultPersona, directQuery: '' };
  }

  const targetPersona: AssistantPersona = matchNoura ? 'noura' : matchFaris ? 'faris' : defaultPersona;

  // Extract direct query if user spoke a command after calling the name:
  // e.g. "يا فارس اعطني تقرير العقود" -> "اعطني تقرير العقود"
  const cleaned = rawText
    .replace(/^(?:مرحبا|اهلا|أهلاً|أهلا|الو|ألو|هلا|يا|يا\s*)*(?:فارس(?:نا)?|نور[ةه]|نورا|مرشد[ةه]?|مساعد(?:نا)?|ابو\s*فهد|ام\s*خالد)[\s،,:\-]*/i, '')
    .trim();

  return {
    detected: true,
    persona: targetPersona,
    directQuery: cleaned.length >= 3 ? cleaned : '',
  };
}

interface AICopilotWidgetProps {
  onNavigate?: (tab: string, title: string) => void;
}

export const AICopilotWidget: React.FC<AICopilotWidgetProps> = ({ onNavigate }) => {
  const { activeCompany } = useCompany();
  const { currentLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [persona, setPersona] = useState<AssistantPersona>(() => {
    return (localStorage.getItem('assistant_persona') as AssistantPersona) || 'faris';
  });
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('faris_voice_enabled');
    return saved !== 'false'; // Default to true so voice works out of the box
  });
  const [isDocked, setIsDocked] = useState<boolean>(() => {
    return localStorage.getItem('assistant_mascot_docked') !== 'false';
  });
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(() => {
    return localStorage.getItem('assistant_wake_word_enabled') !== 'false';
  });
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);
  const interimSpeechRef = useRef('');
  const [showTooltip, setShowTooltip] = useState(true);
  const [isLocalAiOnline, setIsLocalAiOnline] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<ToolCallParsed | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const lastWakeTriggerRef = useRef<number>(0);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isPausedWakeRef = useRef(false);
  const isCancelledRef = useRef(false);
  const handleSendMessageRef = useRef<(query?: string, isVoice?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Sync isSpeaking with centralized audio engine
  useEffect(() => {
    return subscribeAudioState((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  // Monitor local AI daemon availability (only in local dev to save battery & network)
  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname === '[::1]' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.')
    );
    if (!isLocal) {
      setIsLocalAiOnline(false);
      return;
    }

    checkLocalAiAvailable().then(avail => setIsLocalAiOnline(avail));
    const interval = setInterval(() => {
      checkLocalAiAvailable().then(avail => setIsLocalAiOnline(avail));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Pre-load browser voices on component mount
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const getInitialWelcome = (p: AssistantPersona, compName: string) => {
    if (p === 'noura') {
      return `أهلاً بكِ في نطاق (${compName})! أنا "نُورة"، المستشارة المؤسسية والتشغيلية لمجموعة خالد السليم.
يسعدني مساعدتكِ في إدارة مراكز الإيواء والتسكين، عقود مساند والتأجير، محاسبة سماك (SMACC)، أو رفع واستخلاص حتى 100 فاتورة ومستندات PDF وWord وExcel تلقائياً.`;
    }
    return `أهلاً بك في نطاق (${compName})! أنا "فارس"، المستشار التنفيذي لمجموعة خالد السليم.
يسعدني مساعدتك في إدارة محاسبة سماك بـ 6 أنظمة، الفوترة الضريبية ZATCA، عقود مساند، منافسات كاس وجداول BOQ، أو استخلاص حتى 100 فاتورة وأي مستند تلقائياً.`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: getInitialWelcome((localStorage.getItem('assistant_persona') as AssistantPersona) || 'faris', activeCompany.name),
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Listen to external triggers (e.g. from LandingPage or LoginPage or Header)
  useEffect(() => {
    const handleOpenAssistant = (event: any) => {
      setIsDocked(false);
      localStorage.setItem('assistant_mascot_docked', 'false');
      setIsOpen(true);
      if (event.detail?.persona && (event.detail.persona === 'faris' || event.detail.persona === 'noura')) {
        setPersona(event.detail.persona);
        localStorage.setItem('assistant_persona', event.detail.persona);
      }
      if (event.detail?.query) {
        handleSendMessage(event.detail.query);
      }
    };

    const handlePersonaChange = (event: any) => {
      if (event.detail?.persona && (event.detail.persona === 'faris' || event.detail.persona === 'noura')) {
        setPersona(event.detail.persona);
      }
    };

    window.addEventListener('open-faris-assistant', handleOpenAssistant);
    window.addEventListener('assistant-persona-changed', handlePersonaChange);
    return () => {
      window.removeEventListener('open-faris-assistant', handleOpenAssistant);
      window.removeEventListener('assistant-persona-changed', handlePersonaChange);
    };
  }, [activeCompany]);

  // Global Hotkeys: Ctrl+Space to summon/toggle, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setIsDocked(false);
        localStorage.setItem('assistant_mascot_docked', 'false');
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isOpen) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Voice Wake-Word Detection ("يا فارس" / "يا نُورة")
  useEffect(() => {
    isCancelledRef.current = false;

    if (!wakeWordEnabled) {
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch (_) {}
        wakeRecognitionRef.current = null;
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    let rec: any = null;

    const safeRestartWake = () => {
      if (isCancelledRef.current || !wakeWordEnabled || isPausedWakeRef.current || isListeningRef.current) {
        return;
      }
      if (isSpeakingRef.current || isAudioSpeaking() || Date.now() - getLastSpeechTimestamp() < 2200) {
        setTimeout(safeRestartWake, 1200);
        return;
      }
      try {
        if (wakeRecognitionRef.current) {
          wakeRecognitionRef.current.start();
        } else {
          startWake();
        }
      } catch (_) {}
    };

    const startWake = () => {
      if (isCancelledRef.current || isPausedWakeRef.current || isListeningRef.current) return;
      try {
        rec = new SpeechRec();
        rec.lang = 'ar-SA';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event: any) => {
          // 1. HARD ECHO GUARD: Discard microphone results if the computer is currently speaking or just finished within 2500ms
          if (isSpeakingRef.current || isAudioSpeaking() || Date.now() - getLastSpeechTimestamp() < 2500) {
            return;
          }

          // 2. Cooldown check: at least 3.5 seconds between wake triggers
          if (Date.now() - lastWakeTriggerRef.current < 3500) {
            return;
          }

          // 3. Accumulate recent transcript segments
          let rawTranscript = '';
          for (let i = Math.max(0, event.results.length - 3); i < event.results.length; i++) {
            const item = event.results[i];
            if (item && item[0]?.transcript) {
              rawTranscript += ' ' + item[0].transcript;
            }
          }
          rawTranscript = rawTranscript.trim();
          if (!rawTranscript) return;

          const detection = detectWakeCall(rawTranscript, persona);
          if (detection.detected) {
            lastWakeTriggerRef.current = Date.now();
            isPausedWakeRef.current = true;
            try {
              rec.stop();
            } catch (_) {}

            if (detection.persona !== persona) {
              setPersona(detection.persona);
              localStorage.setItem('assistant_persona', detection.persona);
              window.dispatchEvent(new CustomEvent('assistant-persona-changed', { detail: { persona: detection.persona } }));
            }

            setIsDocked(false);
            localStorage.setItem('assistant_mascot_docked', 'false');
            setIsOpen(true);

            // Play pre-recorded native Saudi female/male wake response (Chime -> Voice sequenced)
            playPersonaWakeGreeting(detection.persona, {
              onStart: () => setIsSpeaking(true),
              onEnd: () => {
                setIsSpeaking(false);
                if (detection.directQuery) {
                  // User already spoke their request with the wake call!
                  handleSendMessageRef.current(detection.directQuery);
                  setTimeout(() => {
                    isPausedWakeRef.current = false;
                    safeRestartWake();
                  }, 3000);
                } else {
                  // User just called their name -> Automatically start listening hands-free!
                  startDictation(true);
                }
              },
            });
          }
        };

        rec.onerror = (err: any) => {
          if (err.error === 'not-allowed') {
            console.warn('[Wake Word] Microphone permission denied');
            setWakeWordEnabled(false);
            localStorage.setItem('assistant_wake_word_enabled', 'false');
          } else {
            // Transient error (no-speech, aborted, audio-capture): auto retry after cooldown
            if (!isCancelledRef.current && wakeWordEnabled && !isPausedWakeRef.current) {
              setTimeout(safeRestartWake, 2000);
            }
          }
        };

        rec.onend = () => {
          if (!isCancelledRef.current && wakeWordEnabled && !isPausedWakeRef.current && !isListeningRef.current) {
            setTimeout(safeRestartWake, 1000);
          }
        };

        wakeRecognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.warn('Wake word init error:', e);
      }
    };

    startWake();

    return () => {
      isCancelledRef.current = true;
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch (_) {}
        wakeRecognitionRef.current = null;
      }
    };
  }, [wakeWordEnabled, persona]);

  // Switch persona manually
  const switchPersona = (newPersona: AssistantPersona) => {
    if (newPersona === persona) return;
    setPersona(newPersona);
    localStorage.setItem('assistant_persona', newPersona);
    window.dispatchEvent(new CustomEvent('assistant-persona-changed', { detail: { persona: newPersona } }));

    const newGreeting = newPersona === 'noura'
      ? `أهلاً بكِ! تحولت المحادثة الآن إلى "نُورة" المرشدة الرقمية الذكية. يسعدني خدمتكِ ومساعدتكِ في كافة إجراءات المنظومة ومراكز الإيواء.`
      : `أهلاً بك! تحولت المحادثة الآن إلى "فارس" المرشد الرقمي الذكي. جاهز لمساعدتك في العمليات ومنافسات كاس والأنظمة المركزية.`;

    setMessages(prev => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        sender: 'ai',
        text: newGreeting,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Force sequenced chime-then-voice playback with authentic voice
    playPersonaSwitchGreeting(newPersona, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  // Voice Speech Synthesis Engine
  const speakText = (text: string, overridePersona?: AssistantPersona, force = false) => {
    if (!voiceEnabled && !force) return;
    const currentPers = overridePersona || persona;
    // Play chime first, then dynamic neural speech!
    playPersonaChime(currentPers).then(() => {
      speakDynamicSpeech(text, currentPers, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    });
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('faris_voice_enabled', String(next));
    if (!next) {
      stopAllAudio();
    } else {
      playPersonaSwitchGreeting(persona, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  // Voice Wake-Word Listener Toggle (المناداة: يا فارس / يا نُورة)
  const toggleWakeWord = () => {
    const next = !wakeWordEnabled;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (next && !SpeechRec) {
      notificationPopupEngine.warning(
        'تنبيه المتصفح الصوتي',
        'خاصية المناداة الصوتية الذكية تتطلب متصفحاً يدعم الميكروفون مثل Google Chrome أو Microsoft Edge.'
      );
      return;
    }
    setWakeWordEnabled(next);
    localStorage.setItem('assistant_wake_word_enabled', String(next));
    if (next) {
      playWakeEnabledGreeting(persona, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    } else {
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch (_) {}
        wakeRecognitionRef.current = null;
      }
    }
  };

  // Seamless Voice Dictation Engine
  const startDictation = (autoSend = false) => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      if (!autoSend) {
        notificationPopupEngine.warning(
          'الإملاء الصوتي غير مدعوم',
          'خاصية الإملاء الصوتي غير مدعومة في متصفحك الحالي، يرجى استخدام متصفح Chrome أو Edge الحديث.'
        );
      }
      return;
    }

    // Stop wake recognition to prevent audio-capture collision in Chromium
    isPausedWakeRef.current = true;
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.stop();
      } catch (_) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = true;
      let finalTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setInterimSpeech('');
        interimSpeechRef.current = '';
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        const activeText = (finalTranscript || currentInterim).trim();
        setInterimSpeech(activeText);
        interimSpeechRef.current = activeText;
        if (activeText && !autoSend) {
          setInputQuery(activeText);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('[Voice Dictation] error:', err);
        setIsListening(false);
        isListeningRef.current = false;
        setInterimSpeech('');
        interimSpeechRef.current = '';
        setTimeout(() => {
          isPausedWakeRef.current = false;
          if (wakeRecognitionRef.current && wakeWordEnabled) {
            try {
              wakeRecognitionRef.current.start();
            } catch (_) {}
          }
        }, 1500);
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        const textToProcess = (finalTranscript || interimSpeechRef.current).trim();
        setInterimSpeech('');
        interimSpeechRef.current = '';
        if (textToProcess) {
          if (autoSend) {
            handleSendMessageRef.current(textToProcess, true);
          } else {
            setInputQuery(textToProcess);
          }
        }
        setTimeout(() => {
          isPausedWakeRef.current = false;
          if (wakeRecognitionRef.current && wakeWordEnabled) {
            try {
              wakeRecognitionRef.current.start();
            } catch (_) {}
          }
        }, 1500);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      setIsListening(false);
      isListeningRef.current = false;
      isPausedWakeRef.current = false;
      setInterimSpeech('');
      interimSpeechRef.current = '';
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      isListeningRef.current = false;
      setTimeout(() => {
        isPausedWakeRef.current = false;
        if (wakeRecognitionRef.current && wakeWordEnabled) {
          try {
            wakeRecognitionRef.current.start();
          } catch (_) {}
        }
      }, 1000);
      return;
    }
    startDictation(false);
  };

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resolve current employee profile & department task playbook
  const currentUserProfile = authService.getCurrentUser();
  const employeeScope = useMemo(() => {
    return resolveDepartmentAndCompany(
      currentUserProfile?.email || currentUserProfile?.username || 'accounting@saf-rec.sa',
      currentUserProfile?.role,
      currentUserProfile?.company_id || activeCompany.id,
      currentUserProfile?.department_id
    );
  }, [currentUserProfile?.email, currentUserProfile?.username, currentUserProfile?.role, currentUserProfile?.company_id, currentUserProfile?.department_id, activeCompany.id]);

  const departmentPlaybook = useMemo(() => {
    return getDepartmentTaskPlaybook(employeeScope.departmentId, activeCompany.id);
  }, [employeeScope.departmentId, activeCompany.id]);

  const handleCopyMessage = (msgId: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedMsgId(msgId);
      setTimeout(() => {
        setCopiedMsgId((prev) => (prev === msgId ? null : prev));
      }, 2200);
    }
  };

  // Trigger personalized daily task briefing for the logged-in employee
  const handleDailyBriefing = () => {
    const briefingText = generateEmployeeDailyBriefing(
      {
        id: activeCompany.id,
        name: activeCompany.name,
        code: (activeCompany as any).code,
      },
      persona
    );

    const userMsg: ChatMessage = {
      id: `u-brief-${Date.now()}`,
      sender: 'user',
      text: 'أعطني إيجاز مهامي اليومي ومؤشرات قسمي',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsg: ChatMessage = {
      id: `ai-brief-${Date.now()}`,
      sender: 'ai',
      text: briefingText,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    speakText(briefingText, persona, true);
  };

  // Handle direct file attachment in chat (Invoices, Contracts, CVs, Excel/PDF/Images)
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const fileNames = fileList.map((f) => f.name).join('، ');
    const firstFile = fileList[0];
    const lowerName = firstFile.name.toLowerCase();

    const userMsg: ChatMessage = {
      id: `u-file-${Date.now()}`,
      sender: 'user',
      text: `مرفق (${fileList.length}): ${fileNames}`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    let responseText = '';
    let suggestedQuery = '';

    if (lowerName.includes('cv') || lowerName.includes('سير') || lowerName.includes('resume')) {
      responseText = `تم استلام ملف السيرة الذاتية (${firstFile.name}) بنجاح في نطاق (${activeCompany.name}).\n• يمكنني تسجيل المرشح فوراً في بنك السير الذاتية (ATS) أو فتح مستخرج المستندات الذكي لقراءة كافة الحقول تلقائياً.`;
      suggestedQuery = `سجل سيرة ذاتية جديدة من الملف ${firstFile.name.replace(/\.[^/.]+$/, '')} بمهنة عاملة منزلية`;
    } else if (lowerName.includes('contract') || lowerName.includes('عقد') || lowerName.includes('مساند')) {
      responseText = `تم استلام ملف العقد (${firstFile.name}) بنجاح.\n• يمكنني إنشاء مسودة عقد استقدام/تأجير مباشرة أو استخلاص بنود العقد عبر المستخرج الشامل.`;
      suggestedQuery = `أنشئ عقد استقدام جديد للعميل ${firstFile.name.replace(/\.[^/.]+$/, '')} بمبلغ 17250 ريال`;
    } else {
      responseText = `تم استلام (${fileList.length}) ملف/فاتورة (${fileNames}) بنجاح في نطاق (${activeCompany.name}).\n• يمكنني إصدار فاتورة ضريبية ZATCA فورية أو فتح مستخرج الـ 100 فاتورة ومستندات PDF/Excel/Word لمعالجتها دفعة واحدة.`;
      suggestedQuery = `أصدر فاتورة ضريبية للملف ${firstFile.name.replace(/\.[^/.]+$/, '')} بمبلغ 1500 ريال`;
    }

    const aiMsg: ChatMessage = {
      id: `ai-file-${Date.now()}`,
      sender: 'ai',
      text: responseText,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      actionButton: {
        label: 'فتح مستخرج الـ 100 مستند وفاتورة الذكي',
        actionKey: 'open-document-extractor',
      },
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputQuery(suggestedQuery);
    speakText(responseText, persona, false);
    e.target.value = '';
  };

  // Dynamic Contextual Quick Prompts based on logged-in Employee's Department Playbook & activeCompany
  const getContextualPrompts = () => {
    const deptTasks = departmentPlaybook.tasks.map((t) => ({
      label: t.label,
      query: t.prompt,
    }));

    const commonExtractor = {
      label: 'رفع 100 فاتورة / مستند',
      query: 'أريد رفع 100 صورة فاتورة أو مستندات PDF وWord وExcel واستخلاص بياناتها تلقائياً',
    };

    // Combine department-tailored tasks with universal document extraction
    const combined = [...deptTasks, commonExtractor];
    const seen = new Set<string>();
    return combined.filter((item) => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    });
  };

  // Handle confirming a tool call (Gate 2: User Approval)
  const handleConfirmToolCall = async () => {
    if (!pendingToolCall) return;
    setIsExecutingTool(true);

    try {
      const result = await executeToolCall(
        pendingToolCall,
        activeCompany.id,
        currentUserProfile?.username || 'current_user',
        onNavigate
      );

      const resultMsg: ChatMessage = {
        id: `tool-result-${Date.now()}`,
        sender: 'ai',
        text: result.message,
        spokenSummary: result.spokenSummary,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, resultMsg]);
      speakText(result.spokenSummary || result.message, persona, true);
    } catch (err) {
      console.error('[AI Tool Executor] Error:', err);
      const errorMsg: ChatMessage = {
        id: `tool-error-${Date.now()}`,
        sender: 'ai',
        text: 'حدث خطأ أثناء تنفيذ العملية. يرجى المحاولة مرة أخرى.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setPendingToolCall(null);
      setIsExecutingTool(false);
    }
  };

  // Handle cancelling a tool call
  const handleCancelToolCall = () => {
    if (pendingToolCall) {
      logToolCancellation(pendingToolCall, activeCompany.id, currentUserProfile?.username || 'current_user');
      const cancelMsg: ChatMessage = {
        id: `tool-cancel-${Date.now()}`,
        sender: 'ai',
        text: persona === 'noura'
          ? 'تم إلغاء العملية كما طلبتِ. هل تريدين شيئاً آخر؟'
          : 'تم إلغاء العملية. هل تريد شيئاً آخر؟',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, cancelMsg]);
    }
    setPendingToolCall(null);
  };

  const handleSendMessage = async (queryText?: string, isVoiceInput = false) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    if (isVoiceInput && !voiceEnabled) {
      setVoiceEnabled(true);
      localStorage.setItem('faris_voice_enabled', 'true');
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // 0. Check for Instant Direct Voice Command (Navigation, Persona switch, Audio toggle, Direct tools)
    try {
      const voiceResult = await dispatchVoiceCommand(textToSend, persona, {
        onNavigate: (pageKey, pageTitle) => {
          if (onNavigate) {
            onNavigate(pageKey, pageTitle);
          } else {
            window.dispatchEvent(new CustomEvent('navigate-to-page', { detail: { pageKey, pageTitle } }));
          }
        },
        onSwitchPersona: (newP) => switchPersona(newP),
        onToggleVoice: (enable) => {
          setVoiceEnabled(enable);
          localStorage.setItem('faris_voice_enabled', String(enable));
          if (!enable) stopAllAudio();
        },
        onCloseWidget: () => setIsOpen(false),
        onClearChat: () => {
          setMessages([{
            id: `welcome-new-${Date.now()}`,
            sender: 'ai',
            text: getInitialWelcome(persona, activeCompany.name),
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          }]);
        },
        onExecuteTool: async (toolId, params) => {
          const toolDef = getToolById(toolId);
          if (toolDef) {
            if (!toolDef.isMutating) {
              try {
                const res = await executeToolCall(
                  { tool: toolDef, params, confirmationSummary: '' },
                  activeCompany.id,
                  currentUserProfile?.username || 'current_user',
                  onNavigate
                );
                setMessages(prev => [
                  ...prev,
                  {
                    id: `voice-tool-${Date.now()}`,
                    sender: 'ai',
                    text: res.message,
                    spokenSummary: res.spokenSummary,
                    timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
                speakText(res.spokenSummary || res.message, persona, true);
              } catch (execErr) {
                console.error('[Voice Tool Auto-Execute] Error:', execErr);
              }
            } else {
              const summary = buildConfirmationSummary(toolDef, params);
              setPendingToolCall({
                tool: toolDef,
                params,
                confirmationSummary: summary,
              });
            }
          }
        },
      });

      if (voiceResult.isCommand) {
        if (voiceResult.displayText) {
          setMessages(prev => [
            ...prev,
            {
              id: `cmd-${Date.now()}`,
              sender: 'ai',
              text: voiceResult.displayText!,
              timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
        setIsTyping(false);
        if (voiceResult.spokenResponse && voiceResult.commandType !== 'direct_tool') {
          speakText(voiceResult.spokenResponse, persona, true);
        }
        return;
      }
    } catch (cmdErr) {
      console.warn('[Voice Command Dispatcher] Fallback to AI:', cmdErr);
    }

    try {
      // Execute company-scoped inference on local model (faris-erp / noura-erp)
      const aiRes = await generateLocalAiResponse({
        prompt: textToSend,
        persona,
        company: {
          id: activeCompany.id,
          name: activeCompany.name,
          code: (activeCompany as any).code,
        },
        conversationHistory: messages.map(m => ({ sender: m.sender, text: m.text })),
      });

      const newAiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiRes.text,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        actionButton: aiRes.actionButton,
        suggestedPersonaHandoff: aiRes.suggestedPersonaHandoff,
      };

      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);

      // Phase 1: If the model triggered a tool call
      if (aiRes.toolCall) {
        if (!aiRes.toolCall.tool.isMutating) {
          // Read-only queries execute seamlessly and vocalize through the AI voice model!
          try {
            const autoRes = await executeToolCall(
              aiRes.toolCall,
              activeCompany.id,
              currentUserProfile?.username || 'current_user',
              onNavigate
            );

            const toolMsg: ChatMessage = {
              id: `ai-tool-auto-${Date.now()}`,
              sender: 'ai',
              text: autoRes.message,
              spokenSummary: autoRes.spokenSummary,
              timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages(prev => [...prev, toolMsg]);
            speakText(autoRes.spokenSummary || autoRes.message, persona, true);
            return;
          } catch (autoErr) {
            console.error('[AI Tool Auto-Execute] Error:', autoErr);
          }
        } else {
          // Mutating operations (create invoice, approve funds, etc.) trigger Gate 2 approval modal
          setPendingToolCall(aiRes.toolCall);
        }
      }

      // Speak response out loud automatically using persona's voice!
      speakText(aiRes.text, persona, isVoiceInput);
    } catch (err) {
      console.error('[AI Copilot] Inference error:', err);
      setIsTyping(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleTriggerActionButton = (actionKey: string, label: string) => {
    if (actionKey === 'open-document-extractor') {
      window.dispatchEvent(new CustomEvent('open-document-extractor'));
      setIsOpen(false);
      return;
    }
    if (onNavigate) {
      onNavigate(actionKey, label);
      setIsOpen(false);
    } else {
      window.dispatchEvent(
        new CustomEvent('alsulaim_navigate', {
          detail: { tab: actionKey, title: label },
        })
      );
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 1. Docked Edge Pill Tab (When minimized/docked on desktop, or compact floating orb on mobile) */}
      {!isOpen && (
        <div
          className={`dock-pill-slide-in fixed bottom-[calc(74px+env(safe-area-inset-bottom,0px))] lg:bottom-6 left-3 lg:left-6 z-[9990] ${
            isDocked ? 'block' : 'block lg:hidden'
          }`}
          style={{ direction: 'rtl' }}
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
            className="group flex items-center gap-2 px-3.5 py-2 bg-[#ffffff] border border-[#e0e0e0] rounded-full hover:bg-[#f3f3f3] hover:border-[#141414] shadow-md transition-all cursor-pointer"
            title={`التحدث مع ${persona === 'noura' ? 'نُورة' : 'فارس'}`}
          >
            <div className="relative w-7 h-7 flex-shrink-0 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] p-0.5">
              <img
                src={persona === 'noura' ? '/noura.png' : '/mascot.png'}
                alt={persona === 'noura' ? 'نُورة' : 'فارس'}
                className="w-full h-full object-contain"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#0066ff] border-2 border-[#ffffff]" />
            </div>

            <div className="flex flex-col text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#141414]">
                  {persona === 'noura' ? 'نُورة' : 'فارس'}
                </span>
                <span className="text-[10px] text-[#141414] font-semibold bg-[#f3f3f3] border border-[#e0e0e0] px-2 py-0.5 rounded-full">
                  AI
                </span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 2. Frameless 3D Mascot Character (Desktop Only so it never blocks mobile viewport) */}
      {!isDocked && !isOpen && (
        <div
          className="mascot-pop-in group hidden lg:flex fixed bottom-4 left-6 z-[9999] flex-col items-center"
          style={{
            direction: 'rtl',
          }}
        >
          {/* Floating Greeting Bubble with Persona Switcher & Dismiss/Dock Button */}
          {showTooltip && (
            <div
              className="speech-bubble-anim relative mb-2 max-w-[280px] bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-3 shadow-xl select-none"
            >
              {/* Top Control Bar: Persona Switcher & Minimize to Dock */}
              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#f0f0f0] text-[10.5px]">
                <div className="inline-flex items-center bg-[#f3f3f3] rounded-full p-0.5 border border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      switchPersona('faris');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      persona === 'faris'
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    فارس
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      switchPersona('noura');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      persona === 'noura'
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    نُورة
                  </button>
                </div>

                {/* Quick Dismiss / Minimize to Dock */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDocked(true);
                    localStorage.setItem('assistant_mascot_docked', 'true');
                  }}
                  className="text-[#707070] hover:text-[#141414] p-1 rounded-full hover:bg-[#f3f3f3] transition-colors cursor-pointer"
                  title="تصغير إلى الشريط الجانبي"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bubble Message / Click Prompt */}
              <div
                onClick={() => {
                  setIsOpen(true);
                  setShowTooltip(false);
                }}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              >
                <p className="text-xs font-bold text-[#141414] leading-snug m-0">
                  {persona === 'noura'
                    ? 'أهلاً بكِ! أنا نُورة، المستشارة المؤسسية'
                    : 'أهلاً بك! أنا فارس، المستشار التنفيذي'}
                </p>
                <p className="text-[11px] text-[#707070] mt-1 mb-0 flex items-center gap-1">
                  <span>انقر للمحادثة أو نادني صوتياً: </span>
                  <strong className="text-[#141414] font-bold whitespace-nowrap">
                    {persona === 'noura' ? '"يا نُورة"' : '"يا فارس"'}
                  </strong>
                </p>
              </div>

              {/* Bubble Pointer Arrow pointing down to character */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '36px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ffffff',
                  borderRight: '1px solid #e0e0e0',
                  borderBottom: '1px solid #e0e0e0',
                  transform: 'rotate(45deg)',
                }}
              />
            </div>
          )}

          {/* The Frameless 3D Mascot Character */}
          <div
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
            className="relative cursor-pointer select-none flex flex-col items-center"
            title={persona === 'noura' ? 'انقري للتحدث مع نُورة' : 'انقر للتحدث مع فارس'}
          >
            <div className="mascot-float relative transition-all duration-300 group-hover:scale-105">
              <img
                src={persona === 'noura' ? '/noura.png' : '/mascot.png'}
                alt={persona === 'noura' ? 'نُورة - المستشارة المؤسسية' : 'فارس - المستشار التنفيذي'}
                className="w-auto h-32 sm:h-36 object-contain pointer-events-auto"
                style={{
                  filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.12))',
                }}
                loading="eager"
              />

              <span
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  right: '12px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#0066ff',
                  border: '2px solid #ffffff',
                }}
                title="متصل بالخدمة"
              />
            </div>

            <div
              className="mascot-shadow w-24 h-3.5 rounded-full pointer-events-none -mt-1"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.05) 55%, transparent 75%)',
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Mobbin Light Mode Institutional Advisor Window */}
      {isOpen && (
        <div
          className="speech-bubble-anim fixed inset-x-2.5 bottom-[calc(70px+env(safe-area-inset-bottom,0px))] lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[450px] max-w-[calc(100vw-20px)] h-[calc(100dvh-86px-env(safe-area-inset-bottom,0px))] lg:h-[84vh] lg:max-h-[680px] z-[9999] flex flex-col overflow-hidden rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] shadow-2xl"
          style={{
            fontFamily: 'var(--font-family-ui)',
            direction: 'rtl',
          }}
        >
          {/* Header - Clean Mobbin Gallery-White Bar */}
          <div className="p-3.5 sm:p-4 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] shrink-0">
            {/* Row 1: Identity & Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Avatar & Title */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-11 h-11 rounded-[14px] p-0.5 shrink-0 bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="w-full h-full rounded-[12px] bg-[#ffffff] flex items-center justify-center overflow-hidden">
                    <img
                      src={persona === 'noura' ? '/noura.png' : '/mascot.png'}
                      alt={persona === 'noura' ? 'نُورة' : 'فارس'}
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#0066ff] border-2 border-[#ffffff]" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-[14.5px] text-[#141414] tracking-tight m-0 truncate">
                      {persona === 'noura' ? 'نُورة • المستشارة المؤسسية' : 'فارس • المستشار التنفيذي'}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] shrink-0">
                      {persona === 'noura' ? 'نُورة' : 'فارس'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#707070] m-0 truncate flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-[#141414] shrink-0 inline" />
                    <span>نظام التوجيه والحوكمة المؤسسية المعزول</span>
                  </p>
                </div>
              </div>

              {/* Window Control Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Voice Toggle */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={voiceEnabled ? 'تعطيل القراءة الصوتية' : 'تفعيل القراءة الصوتية'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    voiceEnabled
                      ? 'bg-[#141414] text-[#ffffff] font-bold'
                      : 'bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5]'
                  }`}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Voice Commands Guide Button */}
                <button
                  type="button"
                  onClick={() => setShowVoiceGuide((prev) => !prev)}
                  title={showVoiceGuide ? 'إخفاء دليل الأوامر الصوتية' : 'عرض دليل الأوامر الصوتية'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    showVoiceGuide
                      ? 'bg-[#141414] text-[#ffffff] font-bold'
                      : 'bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5]'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                </button>

                {/* Wake Word Mic */}
                <button
                  type="button"
                  onClick={toggleWakeWord}
                  title={wakeWordEnabled ? 'المناداة الصوتية مفعلة (يا فارس / يا نُورة)' : 'تفعيل المناداة الصوتية التلقائية'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    wakeWordEnabled
                      ? 'bg-[#0066ff] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5]'
                  }`}
                >
                  {wakeWordEnabled ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                </button>

                {/* Minimize to Dock */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsDocked(true);
                    localStorage.setItem('assistant_mascot_docked', 'true');
                  }}
                  title="تصغير إلى الشاشة"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5] transition-all cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="إغلاق"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5] transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Persona Switcher & Company Scope Badges */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#f0f0f0]">
              {/* Persona Switcher Pill */}
              <div className="inline-flex items-center bg-[#f3f3f3] p-0.5 rounded-full border border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => switchPersona('faris')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    persona === 'faris'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  <span>فارس (تنفيذي)</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchPersona('noura')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    persona === 'noura'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  <span>نُورة (مؤسسي)</span>
                </button>
              </div>

              {/* Company Data Isolation Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] truncate max-w-[220px]"
                title={`عزل بيانات الشركة: ${activeCompany.name}`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                <span className="truncate">{activeCompany.name}</span>
              </div>
            </div>

            {/* Row 3: Dynamic Audio Equalizer Wave (shown when speaking or listening) */}
            {(isSpeaking || isListening) && (
              <div
                onClick={
                  isSpeaking
                    ? () => {
                        stopAllAudio();
                        setIsSpeaking(false);
                      }
                    : undefined
                }
                className="mt-2.5 px-3 py-1.5 rounded-[14px] border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] flex items-center justify-between gap-2 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <Volume2 className="w-4 h-4 text-[#141414] animate-pulse shrink-0" />
                  ) : (
                    <Mic className="w-4 h-4 text-[#0066ff] animate-pulse shrink-0" />
                  )}
                  <span className="text-xs font-semibold">
                    {isSpeaking
                      ? `${persona === 'noura' ? 'نُورة' : 'فارس'} يتحدث الآن... (انقر للإيقاف)`
                      : 'جاري الاستماع لصوتك عبر المايكروفون...'}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 h-5 px-1">
                  <span className="w-1 rounded-full bg-[#141414] anim-wave-1" />
                  <span className="w-1 rounded-full bg-[#141414] anim-wave-2" />
                  <span className="w-1 rounded-full bg-[#141414] anim-wave-3" />
                  <span className="w-1 rounded-full bg-[#141414] anim-wave-4" />
                  <span className="w-1 rounded-full bg-[#141414] anim-wave-5" />
                </div>
              </div>
            )}
          </div>

          {/* Employee Identity & Co-Pilot Task Bar */}
          <div className="px-3.5 py-2 bg-[#f3f3f3] border-b border-[#e5e5e5] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <CorporateAvatar
                name={currentUserProfile?.full_name || 'موظف المجموعة'}
                email={currentUserProfile?.email}
                role={currentUserProfile?.role}
                departmentId={departmentPlaybook.departmentId}
                size="xs"
                status="online"
              />
              <span className="text-[11px] font-bold text-[#141414] truncate">
                {currentUserProfile?.full_name || 'موظف المجموعة'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ffffff] text-[#707070] border border-[#e0e0e0] truncate">
                {departmentPlaybook.departmentNameAr}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDailyBriefing}
                title="إيجاز مهامي اليومي ومؤشرات القسم"
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#141414] text-[#ffffff] hover:bg-[#262626] transition-all flex items-center gap-1 cursor-pointer"
              >
                <ClipboardList className="w-3 h-3 text-[#ffffff]" />
                <span>إيجاز مهامي</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-document-extractor'));
                  setIsOpen(false);
                }}
                title="فتح مستخرج الـ 100 فاتورة ومستندات PDF/Word/Excel الذكي"
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#ffffff] text-[#141414] border border-[#e0e0e0] hover:bg-[#e5e5e5] transition-all flex items-center gap-1 cursor-pointer"
              >
                <Paperclip className="w-3 h-3 text-[#141414]" />
                <span>مستخرج المستندات</span>
              </button>
            </div>
          </div>

          {/* Contextual Department Task Playbook Pill Bar */}
          <div className="px-3.5 py-2.5 bg-[#ffffff] border-b border-[#f0f0f0] flex gap-2 overflow-x-auto thin-scrollbar shrink-0">
            {getContextualPrompts().map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.query)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:border-[#141414] hover:bg-[#e5e5e5] transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Voice Commands Guide Panel (When toggled) */}
          {showVoiceGuide && (
            <div className="p-3.5 bg-[#f3f3f3] border-b border-[#e5e5e5] text-[#141414] shrink-0 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-[#141414]">
                  <Radio className="w-4 h-4 text-[#0066ff] animate-pulse" />
                  <span>دليل الأوامر الصوتية المباشرة (تحدث بالمايكروفون)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoiceGuide(false)}
                  className="text-[#707070] hover:text-[#141414] p-1 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar pr-1">
                {VOICE_COMMANDS_GUIDE.map((cat, idx) => (
                  <div key={idx} className="bg-[#ffffff] p-2.5 rounded-[14px] border border-[#e0e0e0]">
                    <div className="flex items-center justify-between font-bold text-[#141414] mb-1 text-[11px]">
                      <span>{cat.category}</span>
                      {cat.badge && (
                        <span className="text-[10px] bg-[#f3f3f3] text-[#141414] px-2 py-0.5 rounded-full font-semibold border border-[#e0e0e0]">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cat.phrases.map((phrase, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            setShowVoiceGuide(false);
                            handleSendMessage(phrase);
                          }}
                          className="text-[11px] bg-[#f3f3f3] hover:bg-[#e5e5e5] border border-[#e0e0e0] px-2.5 py-0.5 rounded-full text-[#141414] transition-all text-right cursor-pointer"
                        >
                          "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages Section */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto flex flex-col gap-3.5 bg-[#ffffff]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start max-w-[90%] ${
                  msg.sender === 'user' ? 'self-start flex-row-reverse' : 'self-end'
                }`}
              >
                {/* Advisor Avatar */}
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] p-0.5 shrink-0 overflow-hidden mt-1">
                    <img
                      src={persona === 'noura' ? '/noura.png' : '/mascot.png'}
                      alt={persona === 'noura' ? 'نُورة' : 'فارس'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 text-xs sm:text-[13px] leading-relaxed transition-all ${
                      msg.sender === 'user'
                        ? 'bg-[#141414] text-[#ffffff] rounded-[20px] rounded-tl-xs'
                        : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] rounded-[20px] rounded-tr-xs'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="m-0 whitespace-pre-wrap font-medium">{msg.text}</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {msg.text.split('\n').map((line, lIdx) => {
                          const trimmed = line.trim();
                          if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                            const content = trimmed.replace(/^[•\-\*]\s*/, '');
                            return (
                              <div key={lIdx} className="flex items-start gap-2 my-0.5 pr-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#141414] mt-2 shrink-0" />
                                <span className="leading-relaxed text-[#141414]">{content}</span>
                              </div>
                            );
                          }
                          if (!trimmed) {
                            return <div key={lIdx} className="h-1.5" />;
                          }
                          return (
                            <p key={lIdx} className="m-0 leading-relaxed text-[#141414] font-medium">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Direct Action Button (if present) */}
                  {msg.actionButton && (
                    <button
                      type="button"
                      onClick={() => {
                        if (msg.actionButton) {
                          handleTriggerActionButton(msg.actionButton.actionKey, msg.actionButton.label);
                        }
                      }}
                      className="self-start mt-1 px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#ffffff]" />
                      <span>{msg.actionButton.label}</span>
                      <ArrowLeft className="w-3.5 h-3.5 text-[#ffffff]" />
                    </button>
                  )}

                  {/* Persona Collaboration Handoff Button (Faris <-> Noura) */}
                  {msg.suggestedPersonaHandoff && msg.suggestedPersonaHandoff.persona !== persona && (
                    <button
                      type="button"
                      onClick={() => {
                        if (msg.suggestedPersonaHandoff) {
                          switchPersona(msg.suggestedPersonaHandoff.persona);
                        }
                      }}
                      className="self-start mt-1 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] font-semibold text-[11px] border border-[#e0e0e0] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#141414]" />
                      <span>
                        التحويل إلى {msg.suggestedPersonaHandoff.persona === 'noura' ? 'نُورة' : 'فارس'}: {msg.suggestedPersonaHandoff.reasonAr}
                      </span>
                    </button>
                  )}

                  {/* Timestamp, Copy Action & Speech Read Action */}
                  <div className="flex items-center justify-between gap-2 px-1 text-[10.5px] text-[#707070]">
                    <span>{msg.timestamp}</span>

                    {msg.sender === 'ai' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          title="نسخ النص أو الخطاب"
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#e5e5e5] transition-all cursor-pointer"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#0066ff]" />
                              <span className="text-[#0066ff]">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#141414]" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => speakText(msg.spokenSummary || msg.text, persona, true)}
                          title={persona === 'noura' ? 'استمع لصوت نُورة' : 'استمع لصوت فارس'}
                          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#e5e5e5] transition-all cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3 text-[#141414]" />
                          <span>استمع</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="self-end flex items-center gap-2.5 p-3 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-[#141414] shrink-0" />
                <span className="font-semibold">
                  {persona === 'noura'
                    ? 'نُورة تراجع السجلات المؤسسية...'
                    : 'فارس يراجع السجلات والدفاتر المحاسبية...'}
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input, File Attachment & Voice Controls Command Center */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 sm:p-3.5 bg-[#ffffff] border-t border-[#e5e5e5] flex items-center gap-2 shrink-0"
          >
            {/* Hidden File Input for Direct Invoice/CV/Contract Attachment */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv"
              onChange={handleFileAttachment}
              className="hidden"
            />

            {/* Attach File / Invoice Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="إرفاق فاتورة أو سيرة ذاتية أو عقد (PDF, Excel, Word, صورة)"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5] border border-[#e0e0e0]"
            >
              <Paperclip className="w-4 h-4 text-[#141414]" />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleListening}
              title={
                isListening
                  ? 'إيقاف الاستماع'
                  : persona === 'noura'
                  ? 'تحدثي بالمايكروفون إلى نُورة'
                  : 'تحدث بالمايكروفون إلى فارس'
              }
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-[#141414] text-[#ffffff] animate-pulse'
                  : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5] border border-[#e0e0e0]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                isListening
                  ? interimSpeech || 'جاري الاستماع لصوتك الآن...'
                  : persona === 'noura'
                  ? 'اطلبي مهمة من نُورة (تسكين، عقد، خطاب، نهاية خدمة)...'
                  : 'اطلب مهمة من فارس (فاتورة، قيد، سند، عقد، BOQ)...'
              }
              className="flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm text-[#141414] placeholder:text-[#707070] outline-none transition-all bg-[#f3f3f3] border border-[#e0e0e0] focus:bg-[#ffffff] focus:border-[#141414]"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              title="إرسال"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                inputQuery.trim()
                  ? 'bg-[#141414] text-[#ffffff] hover:bg-[#262626]'
                  : 'bg-[#f3f3f3] text-[#adadad] cursor-not-allowed border border-[#e0e0e0]'
              }`}
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      )}

      {/* ═══ TOOL CALL CONFIRMATION MODAL (Gate 2) ═══ */}
      {pendingToolCall && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(20, 20, 20, 0.55)',
            backdropFilter: 'blur(6px)',
            direction: 'rtl',
          }}
          onClick={handleCancelToolCall}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="speech-bubble-anim bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl overflow-hidden"
            style={{
              width: '420px',
              maxWidth: 'calc(100vw - 32px)',
              fontFamily: 'var(--font-family-ui)',
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5]">
              <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center">
                {pendingToolCall.tool.riskLevel === 'high' || pendingToolCall.tool.riskLevel === 'critical' ? (
                  <ShieldAlert className="w-5 h-5 text-[#141414]" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#141414]" />
                )}
              </div>
              <div>
                <h3 className="m-0 text-sm font-bold text-[#141414]">تأكيد تنفيذ الأمر المؤسسي</h3>
                <p className="m-0 text-xs text-[#707070] font-semibold">{pendingToolCall.tool.nameAr}</p>
              </div>
            </div>

            {/* Confirmation Summary */}
            <div className="px-5 py-4">
              <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs leading-relaxed text-[#141414] whitespace-pre-wrap">
                {pendingToolCall.confirmationSummary}
              </div>

              {(pendingToolCall.tool.riskLevel === 'high' || pendingToolCall.tool.riskLevel === 'critical') && (
                <div className="mt-3 p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                  <p className="m-0 text-xs text-[#141414] font-semibold leading-relaxed">
                    تنبيه حوكمة: هذا الإجراء يُعدّل سجلات رسمية. يرجى التحقق من التفاصيل قبل الاعتماد.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-5 pb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmToolCall}
                disabled={isExecutingTool}
                className="flex-1 px-4 py-2.5 rounded-full font-semibold text-sm bg-[#141414] text-[#ffffff] hover:bg-[#262626] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExecutingTool ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري التنفيذ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وتنفيذ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelToolCall}
                disabled={isExecutingTool}
                className="px-4 py-2.5 rounded-full font-semibold text-sm bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#e5e5e5] transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AICopilotWidget;


