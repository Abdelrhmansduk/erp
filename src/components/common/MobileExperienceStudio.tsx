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
      {/* Always-visible Floating Launcher Button on Desktop so user can open Mobile Version anytime */}
      {!isOpen && (
        <div
          className="fixed bottom-5 left-5 z-[9990] flex items-center gap-2"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-l from-slate-900 via-amber-950 to-slate-900 text-white border border-amber-400/40 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.75)] hover:shadow-[0_16px_40px_-6px_rgba(245,158,11,0.35)] hover:border-amber-400 transition-all duration-200 active:scale-95"
            title="فتح نسخة الهاتف التفاعلية وإشعاراتها والعمل في الخلفية"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 group-hover:scale-110 transition-transform">
              <Smartphone className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
            </div>
            <div className="text-right">
              <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
                <span>نسخة الهاتف الجوال</span>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  مباشر بالملي
                </span>
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                معاينة الشاشة + الإشعارات + الخلفية
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Full Interactive Mobile Experience Studio Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-xl flex flex-col lg:flex-row items-center justify-center p-2 sm:p-4 overflow-y-auto"
          dir="rtl"
        >
          <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 my-auto">
            {/* Right Panel: Controls, Notifications, Background Sync & Real Phone QR */}
            <div className="w-full lg:w-[440px] bg-slate-900/95 border border-slate-800 rounded-3xl p-5 text-white flex flex-col justify-between shadow-2xl shrink-0">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white flex items-center gap-2">
                        <span>مركز نسخة الهاتف الذكي</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          PWA v3
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">
                        شاشة هاتف حقيقية بالملي + إشعارات فورية + مزامنة خلفية
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                    title="إغلاق معاينة الهاتف"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 1. Device Size Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-2">
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
                          className={`p-2 rounded-xl border text-right transition-all ${
                            active
                              ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm'
                              : 'bg-slate-800/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-xs font-extrabold truncate">{dev.name}</div>
                          <div className="text-[10px] opacity-75 mt-0.5">{dev.badge}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quick Portal Switcher inside the Phone */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-2">
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
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold border text-right transition-all ${
                            isCurrent
                              ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{portal.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Live Mobile Notifications Tester */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                      <BellRing className="w-4 h-4" />
                      <span>اختبار إشعارات الهاتف الفورية (Push + اهتزاز)</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                        غير مقروء: {unreadCount}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                        title={isMuted ? 'تشغيل صوت الإشعارات' : 'كتم صوت الإشعارات'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('musaned')}
                      className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>إشعار عقد مساند</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('zatca')}
                      className="px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>إشعار فاتورة ZATCA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('etimad')}
                      className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>إشعار منافسة اعتماد</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerMobileNotification('shelter')}
                      className="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>إشعار إيواء ميداني</span>
                    </button>
                  </div>
                </div>

                {/* 4. Background Execution & Offline Sync Engine Controls */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>محرك العمل في الخلفية (Background Worker)</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        bgState.isOnline
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {bgState.isOnline ? (
                        <>
                          <Wifi className="w-3 h-3" /> متصل
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" /> وضع عدم الاتصال
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/90 rounded-xl p-2 border border-slate-800/80">
                    <div>
                      <div className="text-[10px] text-slate-400">طابور الخلفية</div>
                      <div className="text-sm font-black text-amber-300">
                        {bgState.pendingOfflineCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">مزامنات ناجحة</div>
                      <div className="text-sm font-black text-emerald-400">
                        {bgState.totalBackgroundSyncs}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">بقاء الشاشة</div>
                      <div className="text-xs font-black text-sky-300">
                        {bgState.wakeLockActive ? 'مفعّل' : 'تلقائي'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={handleSimulateOfflineEnqueue}
                      className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors"
                    >
                      + عملية بالخلفية
                    </button>
                    <button
                      type="button"
                      onClick={handleFlushBackgroundSync}
                      disabled={isSyncing}
                      className="px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>مزامنة الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => backgroundExecutionService.toggleWakeLock()}
                      className={`px-2 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                        bgState.wakeLockActive
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Sun className="w-3 h-3" />
                      <span>بقاء الشاشة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Open on Real Physical Phone (QR Code + Copy URL) */}
              <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl">
                {qrCodeImageUrl && (
                  <img
                    src={qrCodeImageUrl}
                    alt="QR Code لفتح التطبيق على الهاتف"
                    className="w-16 h-16 rounded-xl bg-white p-1 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>افتحه على جوالك الحقيقي الآن</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    امسح رمز QR بكاميرا الجوال أو انسخ الرابط لتثبيت تطبيق الـ PWA الأصلي.
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handleCopyMobileUrl}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-1"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
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
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center gap-1"
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
                className="relative rounded-[48px] bg-slate-950 p-3 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)] border-[4px] border-slate-700/90 transition-all duration-300"
                style={{
                  width: `${selectedDevice.width + 24}px`,
                }}
              >
                {/* Hardware Side Buttons Decoration */}
                <div className="absolute -left-[6px] top-28 w-[3px] h-10 bg-slate-600 rounded-l-md" />
                <div className="absolute -left-[6px] top-44 w-[3px] h-14 bg-slate-600 rounded-l-md" />
                <div className="absolute -right-[6px] top-36 w-[3px] h-16 bg-slate-600 rounded-r-md" />

                {/* Phone Screen Viewport */}
                <div
                  className="relative rounded-[38px] overflow-hidden bg-slate-900 flex flex-col"
                  style={{
                    width: `${selectedDevice.width}px`,
                    height: `${selectedDevice.height}px`,
                  }}
                >
                  {/* Native Phone Status Bar + Dynamic Island */}
                  <div
                    className="h-9 bg-slate-950 text-white px-6 flex items-center justify-between text-[11px] font-bold select-none shrink-0 border-b border-white/5"
                    dir="ltr"
                  >
                    <span>{currentTime}</span>
                    <div className="w-24 h-4 bg-black rounded-full border border-white/10 flex items-center justify-end px-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-400 font-extrabold">5G</span>
                      <Wifi className="w-3.5 h-3.5 text-white" />
                      <div className="w-5 h-2.5 rounded-sm border border-white/80 p-0.5 flex items-center">
                        <div className="w-full h-full bg-emerald-400 rounded-[1px]" />
                      </div>
                    </div>
                  </div>

                  {/* Genuine Mobile Viewport Iframe (Triggers all <1024px / <640px responsive & touch layouts) */}
                  <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    title="معاينة نسخة الهاتف الجوال"
                    className="w-full flex-1 border-0 bg-slate-950"
                  />

                  {/* iOS / Android Home Indicator Bar */}
                  <div className="h-5 bg-slate-950 flex items-center justify-center shrink-0">
                    <div className="w-32 h-1 rounded-full bg-white/40" />
                  </div>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-400">
                <span>
                  المقاس الفعلي: <strong className="text-amber-300">{selectedDevice.width}px × {selectedDevice.height}px</strong>
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => window.open(iframeSrc.replace('?mobileFrame=1', ''), '_blank')}
                  className="text-amber-300 hover:text-amber-200 underline flex items-center gap-1"
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
