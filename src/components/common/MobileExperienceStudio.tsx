import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  X,
  BellRing,
  RefreshCw,
  Wifi,
  WifiOff,
  Sun,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Building2,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
} from 'lucide-react';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import {
  backgroundExecutionService,
  BackgroundExecutionState,
} from '../../services/backgroundExecutionService';
import { offlineQueueService } from '../../services/offlineQueueService';
import { useAppStore } from '../../stores/appStore';

interface DevicePreset {
  id: 'iphone15pro' | 's24ultra' | 'iphonese';
  name: string;
  width: number;
  height: number;
  badge: string;
}

const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone15pro',
    name: 'iPhone 15 Pro',
    width: 390,
    height: 800,
    badge: '390 × 800 • iOS PWA',
  },
  {
    id: 's24ultra',
    name: 'Galaxy S24 Ultra',
    width: 412,
    height: 820,
    badge: '412 × 820 • Android',
  },
  {
    id: 'iphonese',
    name: 'iPhone SE / Compact',
    width: 375,
    height: 667,
    badge: '375 × 667 • Compact',
  },
];

const QUICK_PORTALS = [
  { code: 'landing', label: 'الواجهة الرئيسية للمجموعة', path: '/?mobileFrame=1' },
  { code: 'saf', label: 'بوابة ساف للاستقدام (SAF)', path: '/login/saf?mobileFrame=1' },
  { code: 'yaq', label: 'بوابة ياقوت للتشغيل (YAQ)', path: '/login/yaq?mobileFrame=1' },
  { code: 'top', label: 'بوابة توباز للتوظيف (TOP)', path: '/login/top?mobileFrame=1' },
  { code: 'kas', label: 'بوابة كاس للمنافسات (KAS)', path: '/login/kas?mobileFrame=1' },
  { code: 'shelter', label: 'بوابة دار الإيواء (DAR)', path: '/login/shelter?mobileFrame=1' },
  { code: 'admin', label: 'بوابة الإدارة العليا للمجموعة', path: '/login/admin?mobileFrame=1' },
];

export const MobileExperienceStudio: React.FC = () => {
  // Never render the studio wrapper inside the phone iframe itself
  const isInsideMobileFrame =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mobileFrame') === '1';

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined' || isInsideMobileFrame) return false;
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('mobile') === '1' ||
      params.get('view') === 'mobile' ||
      window.location.pathname === '/mobile'
    );
  });

  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(DEVICE_PRESETS[0]);
  const [iframeSrc, setIframeSrc] = useState<string>(() => {
    if (typeof window === 'undefined') return '/?mobileFrame=1';
    const currentPath =
      window.location.pathname === '/mobile' ? '/' : window.location.pathname || '/';
    return `${currentPath}?mobileFrame=1`;
  });
  const [bgState, setBgState] = useState<BackgroundExecutionState>(() =>
    backgroundExecutionService.getState()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isMuted, setIsMuted] = useState(() => notificationPopupEngine.getIsMuted());
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const unreadCount = useAppStore((s) => s.unreadCount);

  useEffect(() => {
    if (isInsideMobileFrame) return;

    const unsubscribe = backgroundExecutionService.subscribe((next) => {
      setBgState(next);
    });

    const handleOpenStudio = (e: Event) => {
      const customEvt = e as CustomEvent<{ path?: string }>;
      if (customEvt.detail?.path) {
        setIframeSrc(
          customEvt.detail.path.includes('?')
            ? `${customEvt.detail.path}&mobileFrame=1`
            : `${customEvt.detail.path}?mobileFrame=1`
        );
      } else {
        const currentPath =
          window.location.pathname === '/mobile' ? '/' : window.location.pathname || '/';
        setIframeSrc(`${currentPath}?mobileFrame=1`);
      }
      setIsOpen(true);
    };

    window.addEventListener('open-mobile-experience-studio', handleOpenStudio);

    const clockInterval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      );
    }, 30000);

    return () => {
      unsubscribe();
      window.removeEventListener('open-mobile-experience-studio', handleOpenStudio);
      clearInterval(clockInterval);
    };
  }, [isInsideMobileFrame]);

  if (isInsideMobileFrame) {
    return null;
  }

  const reloadPhoneFrame = (targetPath?: string) => {
    const nextUrl = targetPath || iframeSrc;
    setIframeSrc(nextUrl);
    if (iframeRef.current) {
      iframeRef.current.src = nextUrl;
    }
  };

  const handleTriggerMobileNotification = async (
    presetType: 'musaned' | 'zatca' | 'etimad' | 'shelter'
  ) => {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      await notificationPopupEngine.requestBrowserPermission();
    }

    const payloads = {
      musaned: {
        title: 'إشعار مساند الفوري (نسخة الهاتف)',
        message: 'تم توثيق واعتماد عقد الاستقدام رقم MUS-2026-8841 في الخلفية بنجاح.',
        type: 'musaned' as const,
        companyId: 'SAF',
        companyName: 'شركة ساف للاستقدام',
        action: { label: 'فتح العقود', tabKey: 'recruitment' },
      },
      zatca: {
        title: 'اعتماد فاتورة ZATCA المرحلة الثانية',
        message: 'تمت مصادقة الفاتورة الضريبية وتوليد ختم التشفير PIH في الخلفية.',
        type: 'zatca' as const,
        companyId: 'YAQ',
        companyName: 'شركة ياقوت للتشغيل',
        action: { label: 'فتح ZATCA', tabKey: 'zatca' },
      },
      etimad: {
        title: 'ترسية منافسة حكومية - منصة اعتماد',
        message: 'إشعار فوري: تحديث حالة الضمان البنكي للمنافسة رقم ETM-7720.',
        type: 'etimad' as const,
        companyId: 'KAS',
        companyName: 'شركة كاس للمنافسات',
        action: { label: 'منافسات كاس', tabKey: 'kas-etmad' },
      },
      shelter: {
        title: 'تحديث إيواء ونقل خدمات',
        message: 'تم تسجيل وصول العاملة وتحديث حالة الإيواء الميداني في الخلفية.',
        type: 'shelter' as const,
        companyId: 'DAR',
        companyName: 'دار الإيواء والترحيل',
        action: { label: 'إدارة الإيواء', tabKey: 'shelter' },
      },
    };

    const chosen = payloads[presetType];
    notificationPopupEngine.show(chosen);

    // Also forward notification into the embedded phone iframe so the user sees it inside the phone screen simultaneously!
    try {
      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin) {
        iframeWin.postMessage(
          {
            type: 'MOBILE_STUDIO_TRIGGER_NOTIFICATION',
            payload: chosen,
          },
          '*'
        );
      }
    } catch {
      // ignore cross-frame issues
    }
  };

  const handleSimulateOfflineEnqueue = () => {
    offlineQueueService.enqueue({
      companyId: 'YAQ',
      operationType: 'MOBILE_FIELD_CHECKIN',
      payload: {
        workerName: 'سائق ميداني - ياقوت',
        coordinates: '24.7136° N, 46.6753° E',
        timestamp: new Date().toISOString(),
      },
    });
    notificationPopupEngine.show({
      title: 'تمت إضافة عملية لطابور الخلفية',
      message:
        'تم حفظ العملية الميدانية في طابور عدم الاتصال (Offline Queue) ليتم رفعها تلقائياً في الخلفية.',
      type: 'info',
      companyName: 'محرك العمل في الخلفية',
    });
  };

  const handleFlushBackgroundSync = async () => {
    setIsSyncing(true);
    try {
      const res = await backgroundExecutionService.flushBackgroundQueues('manual-studio');
      notificationPopupEngine.show({
        title: 'اكتملت المزامنة الخلفية للهاتف',
        message: `تمت مزامنة (${res.syncedMutations}) عمليات ميدانية ومعالجة (${res.processedEvents}) أحداث في الخلفية بنجاح.`,
        type: 'success',
        companyName: 'Service Worker v3',
      });
    } finally {
      setTimeout(() => setIsSyncing(false), 450);
    }
  };

  const mobileAccessUrl =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://192.168.0.106:${window.location.port || '3000'}`
        : window.location.origin
      : 'http://192.168.0.106:3000';

  const handleCopyMobileUrl = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(mobileAccessUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  const handleToggleMute = () => {
    const nextMuted = notificationPopupEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(
    mobileAccessUrl
  )}`;

  return (
    <>
      {/* Always-visible Floating Launcher Button — Positioned above MobileBottomNav on phones (<1024px) */}
      {!isOpen && (
        <div
          className="fixed bottom-[76px] lg:bottom-5 left-3 lg:left-5 z-[90] flex items-center gap-2"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 min-h-[44px] rounded-full bg-[#ffffff] text-[#141414] border border-[#e0e0e0] shadow-[0_8px_24px_rgba(20,20,20,0.08)] hover:border-[#141414] transition-all duration-200 motion-spring-press cursor-pointer"
            title="فتح نسخة الهاتف التفاعلية وإشعاراتها والعمل في الخلفية"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] group-hover:bg-[#262626] group-hover:text-[#ffffff] transition-colors">
              <Smartphone className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#0066ff] ring-2 ring-[#ffffff]" />
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold tracking-tight flex items-center gap-1.5 text-[#141414]">
                <span>نسخة الهاتف الجوال</span>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  مباشر بالملي
                </span>
              </div>
              <div className="text-[10px] text-[#707070] font-medium">
                معاينة الشاشة + الإشعارات + الخلفية
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Full Interactive Mobile Experience Studio Modal — Mobbin Pure Light Mode */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-[#141414]/60 backdrop-blur-md flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 my-auto">
            {/* Right Panel: Controls, Notifications, Background Sync & Real Phone QR */}
            <div className="w-full lg:w-[440px] bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 text-[#141414] flex flex-col justify-between shadow-2xl shrink-0">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414]">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#141414] flex items-center gap-2 m-0">
                        <span>مركز نسخة الهاتف الذكي</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-bold">
                          PWA v3
                        </span>
                      </h2>
                      <p className="text-xs text-[#707070] m-0 mt-0.5">
                        شاشة هاتف حقيقية بالملي + إشعارات فورية + مزامنة خلفية
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
                    title="إغلاق معاينة الهاتف"
                    aria-label="إغلاق معاينة الهاتف"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. Device Size Selector */}
                <div>
                  <label className="text-[11px] font-bold text-[#707070] block mb-2">
                    1. اختر مقاس شاشة الهاتف (أبعاد حقيقية بالملي):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEVICE_PRESETS.map((dev) => {
                      const active = selectedDevice.id === dev.id;
                      return (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => setSelectedDevice(dev)}
                          className={`p-2 rounded-[14px] border text-right transition-all cursor-pointer ${
                            active
                              ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414] hover:border-[#141414]'
                          }`}
                        >
                          <div className="text-xs font-bold truncate">{dev.name}</div>
                          <div className="text-[10px] opacity-75 mt-0.5">{dev.badge}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quick Portal Switcher inside the Phone */}
                <div>
                  <label className="text-[11px] font-bold text-[#707070] block mb-2">
                    2. افتح أي بوابة شركة مباشرة داخل شاشة الهاتف:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {QUICK_PORTALS.map((portal) => {
                      const isCurrent = iframeSrc.startsWith(portal.path.split('?')[0]);
                      return (
                        <button
                          key={portal.code}
                          type="button"
                          onClick={() => reloadPhoneFrame(portal.path)}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-[14px] text-[11px] font-bold border text-right transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414] hover:border-[#141414]'
                          }`}
                        >
                          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[#ffffff]' : 'text-[#141414]'}`} />
                          <span className="truncate">{portal.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Live Mobile Notifications Tester */}
                <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[18px] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                      <BellRing className="w-4 h-4" />
                      <span>اختبار إشعارات الهاتف الفورية (Push + اهتزاز)</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] font-bold">
                        غير مقروء: {unreadCount}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] hover:bg-[#e5e5e5] cursor-pointer"
                        title={isMuted ? 'تشغيل صوت الإشعارات' : 'كتم صوت الإشعارات'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-3.5 h-3.5 text-[#707070]" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-[#141414]" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('musaned')}
                      className="px-2.5 py-2 rounded-full bg-[#ffffff] hover:bg-[#262626] hover:text-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>إشعار عقد مساند</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('zatca')}
                      className="px-2.5 py-2 rounded-full bg-[#ffffff] hover:bg-[#262626] hover:text-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>إشعار فاتورة ZATCA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('etimad')}
                      className="px-2.5 py-2 rounded-full bg-[#ffffff] hover:bg-[#262626] hover:text-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>إشعار منافسة اعتماد</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('shelter')}
                      className="px-2.5 py-2 rounded-full bg-[#ffffff] hover:bg-[#262626] hover:text-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>إشعار إيواء ميداني</span>
                    </button>
                  </div>
                </div>

                {/* 4. Background Execution & Offline Sync Engine Controls */}
                <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[18px] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>محرك العمل في الخلفية (Background Worker)</span>
                    </span>
                    <span
                      className="text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 bg-[#ffffff] border border-[#e0e0e0] text-[#141414]"
                    >
                      {bgState.isOnline ? (
                        <>
                          <Wifi className="w-3 h-3 text-[#0066ff]" /> متصل
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 text-[#707070]" /> وضع عدم الاتصال
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-[#ffffff] rounded-[14px] p-2 border border-[#e0e0e0]">
                    <div>
                      <div className="text-[10px] text-[#707070]">طابور الخلفية</div>
                      <div className="text-sm font-bold text-[#141414]">
                        {bgState.pendingOfflineCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#707070]">مزامنات ناجحة</div>
                      <div className="text-sm font-bold text-[#141414]">
                        {bgState.totalBackgroundSyncs}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#707070]">بقاء الشاشة</div>
                      <div className="text-xs font-bold text-[#0066ff]">
                        {bgState.wakeLockActive ? 'مفعّل' : 'تلقائي'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={handleSimulateOfflineEnqueue}
                      className="px-2 py-2 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] border border-[#e0e0e0] text-[#141414] text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      + عملية بالخلفية
                    </button>
                    <button
                      type="button"
                      onClick={handleFlushBackgroundSync}
                      disabled={isSyncing}
                      className="px-2 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>مزامنة الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => backgroundExecutionService.toggleWakeLock()}
                      className={`px-2 py-2 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border cursor-pointer ${
                        bgState.wakeLockActive
                          ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                          : 'bg-[#ffffff] hover:bg-[#e5e5e5] text-[#141414] border-[#e0e0e0]'
                      }`}
                    >
                      <Sun className="w-3 h-3" />
                      <span>بقاء الشاشة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Open on Real Physical Phone (QR Code + Copy URL) */}
              <div className="mt-4 pt-3.5 border-t border-[#e5e5e5] flex items-center gap-3 bg-[#f3f3f3] p-3 rounded-[18px]">
                {qrCodeImageUrl && (
                  <img loading="lazy" decoding="async"
                    src={qrCodeImageUrl}
                    alt="QR Code لفتح التطبيق على الهاتف"
                    className="w-16 h-16 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] p-1 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#141414]" />
                    <span>افتحه على جوالك الحقيقي الآن</span>
                  </div>
                  <p className="text-[10px] text-[#707070] mt-0.5 leading-relaxed m-0">
                    امسح رمز QR بكاميرا الجوال أو انسخ الرابط لتثبيت تطبيق الـ PWA الأصلي.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handleCopyMobileUrl}
                      className="px-3 py-1 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] border border-[#e0e0e0] text-[10px] font-bold text-[#141414] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3 h-3 text-[#141414]" />
                          <span>تم نسخ الرابط</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>نسخ رابط الجوال</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => reloadPhoneFrame()}
                      className="px-3 py-1 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] border border-[#e0e0e0] text-[10px] font-bold text-[#141414] flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>تحديث الشاشة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Panel: Real-Time Pixel-Perfect Phone Hardware Frame */}
            <div className="flex flex-col items-center justify-center">
              <div
                className="relative rounded-[48px] bg-[#141414] p-3 shadow-[0_25px_80px_-15px_rgba(20,20,20,0.65)] border-[4px] border-[#262626] transition-all duration-300"
                style={{
                  width: `${selectedDevice.width + 24}px`,
                }}
              >
                {/* Hardware Side Buttons Decoration */}
                <div className="absolute -left-[6px] top-28 w-[3px] h-10 bg-[#262626] rounded-l-md" />
                <div className="absolute -left-[6px] top-44 w-[3px] h-14 bg-[#262626] rounded-l-md" />
                <div className="absolute -right-[6px] top-36 w-[3px] h-16 bg-[#262626] rounded-r-md" />

                {/* Phone Screen Viewport — Mobbin Gallery-White Native Status Bar & Frame */}
                <div
                  className="relative rounded-[38px] overflow-hidden bg-[#ffffff] flex flex-col"
                  style={{
                    width: `${selectedDevice.width}px`,
                    height: `${selectedDevice.height}px`,
                  }}
                >
                  {/* Native Phone Status Bar + Dynamic Island */}
                  <div
                    className="h-9 bg-[#ffffff] text-[#141414] px-6 flex items-center justify-between text-[11px] font-bold select-none shrink-0 border-b border-[#f0f0f0]"
                    dir="ltr"
                  >
                    <span>{currentTime}</span>
                    <div className="w-24 h-4 bg-[#141414] rounded-full flex items-center justify-end px-2">
                      <span className="w-2 h-2 rounded-full bg-[#0066ff] animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#141414] font-bold">5G</span>
                      <Wifi className="w-3.5 h-3.5 text-[#141414]" />
                      <div className="w-5 h-2.5 rounded-sm border border-[#141414] p-0.5 flex items-center">
                        <div className="w-full h-full bg-[#141414] rounded-[1px]" />
                      </div>
                    </div>
                  </div>

                  {/* Genuine Mobile Viewport Iframe (Triggers all <1024px / <640px responsive & touch layouts) */}
                  <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    title="معاينة نسخة الهاتف الجوال"
                    className="w-full flex-1 border-0 bg-[#ffffff]"
                  />

                  {/* iOS / Android Home Indicator Bar */}
                  <div className="h-5 bg-[#ffffff] border-t border-[#f0f0f0] flex items-center justify-center shrink-0">
                    <div className="w-32 h-1 rounded-full bg-[#141414]/30" />
                  </div>
                </div>
              </div>

              <div className="mt-3 px-4 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] shadow-sm flex items-center gap-3 text-xs text-[#707070]">
                <span>
                  المقاس الفعلي: <strong className="text-[#141414]">{selectedDevice.width}px × {selectedDevice.height}px</strong>
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => window.open(iframeSrc.replace('?mobileFrame=1', ''), '_blank')}
                  className="text-[#141414] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>فتح في تبويب مستقل</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
