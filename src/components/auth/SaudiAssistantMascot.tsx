import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SystemPortalOption } from '../../pages/LoginPage';
import { playPersonaSwitchGreeting, stopAllAudio, subscribeAudioState } from '../../services/audioVoiceService';

interface SaudiAssistantMascotProps {
  selectedPortal: SystemPortalOption;
  isRtl?: boolean;
}

const getPortalGreeting = (
  portalId: string, 
  nameAr: string, 
  persona: 'faris' | 'noura'
): { title: string; desc: string; badge: string } => {
  if (persona === 'noura') {
    switch (portalId) {
      case 'shelter':
        return {
          title: 'أهلاً بكِ في بوابة مراكز الإيواء والتسكين!',
          desc: 'أنا "نُورة"، مرشدتكِ الرقمية المعتمدة للقسم النسائي. يسعدني مساعدتكِ في متابعة شؤون النزيلات، التغذية، والفحوصات الطبية الممتثلة لمعايير HRSD.',
          badge: 'مرشدة معتمدة للقسم النسائي'
        };
      case 'saf':
        return {
          title: 'أهلاً بكِ في شركة الصفا الماسي!',
          desc: 'أنا "نُورة"، يسعدني توجيهكِ في عقود استقدام الأفراد والعمالة المنزلية وإصدار التأشيرات الفورية الموثقة عبر مساند.',
          badge: 'خدمة السيدات والأسرة'
        };
      case 'yaq':
        return {
          title: 'مرحباً بكِ في شركة الياقوت الشرقية!',
          desc: 'أنا "نُورة"، مرشدتكِ لباقات التشغيل المرن والتأجير المخصص للكوادر المهنية والمنزلية لقطاعي الأفراد والأعمال.',
          badge: 'حلول تشغيلية معتمدة'
        };
      case 'client':
        return {
          title: 'مرحباً بكِ في بوابة الخدمة الذاتية!',
          desc: 'أنا "نُورة"، أساعدكِ في تتبع طلباتكِ وعقودكِ وسداد الفواتير ZATCA بأمان وخصوصية تامة.',
          badge: 'خدمة المستفيدات 24/7'
        };
      default:
        return {
          title: `أهلاً بكِ في ${nameAr}!`,
          desc: 'أنا "نُورة"، مرشدتكِ الرقمية الذكية لمجموعة خالد السليم. أدخلي بياناتكِ أو استعيني بي لتوجيهكِ المباشر.',
          badge: 'المرشدة الرقمية المعتمدة'
        };
    }
  }

  // Faris Persona Greetings
  switch (portalId) {
    case 'kas':
      return {
        title: 'مرحباً بك في بوابة شركة كاس!',
        desc: 'منظومة المنافسات وجداول الكميات الذكية BOQ وسحابة اعتماد معزولة كلياً ومحمية بأعلى معايير الحوكمة.',
        badge: 'بيئة عمل معزولة 100%'
      };
    case 'shelter':
      return {
        title: 'أهلاً بك في بوابة مراكز الإيواء!',
        desc: 'نظام إدارة وتسكين الكوادر والنزيلات مع التتبع الصحي والغذائي والامتثال الكامل لوزارة الموارد البشرية HRSD.',
        badge: 'ترخيص HRSD معتمد'
      };
    case 'saf':
      return {
        title: 'أهلاً بك في شركة الصفا الماسي!',
        desc: 'بوابة عقود استقدام الأفراد، إصدار التأشيرات الفورية، الربط مع منصة مساند، وبوالص التأمين الشاملة.',
        badge: 'ترخيص مساند RC01'
      };
    case 'yaq':
      return {
        title: 'مرحباً بك في شركة الياقوت الشرقية!',
        desc: 'بوابة عقود التأجير والتشغيل المرن للكوادر المهنية والعمالة المنزلية وخدمات قطاع الأعمال.',
        badge: 'ترخيص مساند RC02'
      };
    case 'top':
      return {
        title: 'مرحباً بك في توب تالنت الدولية!',
        desc: 'المنظومة الذكية لفرز وإدارة السير الذاتية ATS والربط المباشر مع شبكة وكالات التوظيف المعتمدة عالمياً.',
        badge: 'نظام ATS المتقدم'
      };
    case 'client':
      return {
        title: 'مرحباً بك في بوابة الخدمة الذاتية!',
        desc: 'يمكنك متابعة حالة طلباتك وعقود الاستقدام والرحلات وسداد الفواتير المشفرة ZATCA بسهولة وأمان.',
        badge: 'خدمة المستفيدين 24/7'
      };
    case 'agent':
      return {
        title: 'أهلاً بشركائنا الدوليين والوكلاء!',
        desc: 'بوابة رفع السير الذاتية بالدفعة وتفييز إنجاز ومطابقة الحسابات المالية اللحظية عبر القنوات الآمنة.',
        badge: 'بوابة الشركاء المعتمدين'
      };
    case 'ecommerce':
      return {
        title: 'مرحباً بك في بوابة المتاجر الإلكترونية!',
        desc: 'إدارة وتزامن المبيعات وقنوات الدفع الإلكتروني وربط منصات سلة وزد وشوبيفاي مع أنظمة SMACC.',
        badge: 'تزامن Webhook فوري'
      };
    case 'admin':
      return {
        title: 'مرحباً بك في مركز القيادة والسيطرة!',
        desc: 'لوحة التحكم الفائق والحوكمة المركزية الشاملة لكافة شركات المجموعة والرقابة على العمليات المالية والـ IAM.',
        badge: 'صلاحيات الإدارة العليا'
      };
    default:
      return {
        title: `أهلاً بك في ${nameAr}!`,
        desc: 'أنا "فارس"، مرشدك الرقمي الذكي لمجموعة خالد السليم ERP. أدخل بياناتك أو استعن بي لتوجيهك المباشر.',
        badge: 'المرشد الرقمي المعتمد'
      };
  }
};

export const SaudiAssistantMascot: React.FC<SaudiAssistantMascotProps> = ({
  selectedPortal,
  isRtl = true
}) => {
  const isShelter = selectedPortal.id === 'shelter';

  const [persona, setPersona] = useState<'faris' | 'noura'>(() => {
    if (isShelter) return 'noura';
    return (localStorage.getItem('assistant_persona') as 'faris' | 'noura') || 'faris';
  });
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Automatically switch to Noura when shelter portal is selected
  useEffect(() => {
    if (isShelter) {
      setPersona('noura');
    }
  }, [selectedPortal.id, isShelter]);

  // Sync with global persona changes and audio speaking state
  useEffect(() => {
    const handlePersonaChange = (event: any) => {
      if (event.detail?.persona && (event.detail.persona === 'faris' || event.detail.persona === 'noura')) {
        setPersona(event.detail.persona);
      }
    };
    window.addEventListener('assistant-persona-changed', handlePersonaChange);
    const unsubAudio = subscribeAudioState((speaking) => {
      setIsAudioPlaying(speaking);
    });
    return () => {
      window.removeEventListener('assistant-persona-changed', handlePersonaChange);
      unsubAudio();
      stopAllAudio();
    };
  }, []);

  const switchPersona = (newPersona: 'faris' | 'noura') => {
    setPersona(newPersona);
    localStorage.setItem('assistant_persona', newPersona);
    window.dispatchEvent(new CustomEvent('assistant-persona-changed', { detail: { persona: newPersona } }));
    playPersonaSwitchGreeting(newPersona);
  };

  const greeting = getPortalGreeting(selectedPortal.id, selectedPortal.nameAr, persona);

  const handleOpenChat = () => {
    window.dispatchEvent(
      new CustomEvent('open-faris-assistant', {
        detail: {
          persona,
          query: persona === 'noura'
            ? `مرحباً نُورة، أحتاج مساعدة في الدخول إلى ${selectedPortal.nameAr}`
            : `مرحباً فارس، أحتاج مساعدة في الدخول إلى ${selectedPortal.nameAr}`
        }
      })
    );
  };

  return (
    <div className="relative flex flex-col items-center justify-end select-none pointer-events-auto">
      {/* Speech Bubble / Dynamic Greeting Card */}
      <div 
        key={`${selectedPortal.id}-${persona}`}
        className="speech-bubble-anim relative z-30 max-w-[340px] mb-2 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200 shadow-xl text-right cursor-pointer hover:border-amber-400 transition-colors"
        style={{
          boxShadow: '0 16px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)'
        }}
        onClick={handleOpenChat}
      >
        {/* Pointer Triangle */}
        <div 
          className="absolute -bottom-2 w-3.5 h-3.5 bg-white border-b border-l border-zinc-200 rotate-[-45deg]"
          style={{
            [isRtl ? 'right' : 'left']: '48px',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.03)'
          }}
        />

        {/* Header with Live Status Dot and Persona Switcher */}
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-zinc-100">
          <div className="flex items-center gap-1.5">
            <span className="live-pulse-dot" />
            <span className="text-[11px] font-extrabold text-zinc-900 flex items-center gap-1">
              <span>{persona === 'noura' ? 'نُورة • المرشدة الرقمية' : 'فارس • المرشد الرقمي'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Persona Switcher Pill */}
            <div 
              className="inline-flex items-center bg-zinc-100 rounded-full p-0.5 border border-zinc-200 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  switchPersona('faris');
                }}
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold transition-all cursor-pointer ${
                  persona === 'faris'
                    ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                    : 'text-zinc-500 hover:text-zinc-800'
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
                className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold transition-all cursor-pointer ${
                  persona === 'noura'
                    ? 'bg-white text-amber-700 shadow-xs border border-champagne/40'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                نُورة
              </button>
            </div>

            <span 
              className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white shrink-0 whitespace-nowrap"
              style={{ background: selectedPortal.themeColor }}
            >
              {greeting.badge}
            </span>
          </div>
        </div>

        {/* Greeting Title */}
        <h4 className="text-[13px] font-bold text-zinc-900 mb-1 leading-snug">
          {greeting.title}
        </h4>

        {/* Greeting Description */}
        <p className="text-[11px] text-zinc-600 leading-relaxed m-0">
          {greeting.desc}
        </p>

        {/* Interactive Chat Prompt Button */}
        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10.5px]">
          <span className="font-bold text-amber-700 flex items-center gap-1 whitespace-nowrap">
            <span>{persona === 'noura' ? 'تحدثي مع نُورة' : 'تحدث مع فارس'}</span>
            <span>←</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isAudioPlaying) {
                stopAllAudio();
              } else {
                playPersonaSwitchGreeting(persona);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold border transition-all cursor-pointer ${
              isAudioPlaying
                ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                : 'bg-zinc-100 hover:bg-amber-50 text-zinc-700 hover:text-amber-800 border-zinc-200'
            }`}
            title={isAudioPlaying ? 'إيقاف الصوت' : `استمع لصوت ${persona === 'noura' ? 'نُورة' : 'فارس'}`}
          >
            {isAudioPlaying ? <VolumeX className="w-3 h-3 text-amber-700" /> : <Volume2 className="w-3 h-3 text-amber-600" />}
            <span>{isAudioPlaying ? 'إيقاف' : 'استمع'}</span>
          </button>
        </div>
      </div>

      {/* 3D Mascot Character with Smooth Float and Ground Shadow */}
      <div 
        className="relative z-20 flex flex-col items-center cursor-pointer group"
        onClick={handleOpenChat}
        title={persona === 'noura' ? 'انقر للتحدث مع نُورة' : 'انقر للتحدث مع فارس'}
      >
        <div className="mascot-float relative transition-transform group-hover:scale-105">
          <img
            src={persona === 'noura' ? '/noura.png' : '/mascot.png'}
            alt={persona === 'noura' ? 'نُورة - المرشدة الرقمية الذكية لمجموعة خالد السليم' : 'فارس - المرشد الرقمي الذكي لمجموعة خالد السليم'}
            className="w-auto h-[360px] sm:h-[400px] lg:h-[430px] object-contain drop-shadow-xl"
            loading="eager"
            decoding="async"
            style={{
              filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.18))',
              transform: isRtl ? 'none' : 'scaleX(-1)'
            }}
          />
        </div>

        {/* Soft Ambient Ground Shadow */}
        <div 
          className="mascot-shadow w-44 h-4 rounded-full -mt-2.5"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.08) 55%, transparent 75%)'
          }}
        />
      </div>
    </div>
  );
};

export default SaudiAssistantMascot;
