import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tv,
  Wifi,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Building2,
  UserCheck,
  Calendar,
  Hash,
  Sparkles,
  Sun,
  Moon,
  X,
  Globe,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  DEFAULT_COMPANY_DISPLAY_SCREENS,
  DEFAULT_WELCOME_BROADCASTS,
  KAS_SIGNAGE_BROADCAST_CHANNEL,
  KAS_SIGNAGE_STORAGE_PING_KEY,
  buildWelcomeEmailQrPayload,
  filterActiveBroadcastsForScreen,
  type DigitalSignageScreenRecord,
  type WelcomeBroadcastRecord,
} from '../../services/employeeWelcomeBroadcastService';
import { generateEmployeeBarcodeIdentity } from '../../services/biometricAttendanceGateService';
import {
  generateRealCode128BarcodeSvg,
  generateRealQrSvg,
} from '../../utils/realBarcodeGenerator';

export interface CorporateDigitalSignagePlayerProps {
  screenId?: string;
  companyCode?: string;
  standaloneMode?: boolean;
  onClose?: () => void;
}

export const CorporateDigitalSignagePlayer: React.FC<CorporateDigitalSignagePlayerProps> = ({
  screenId = 'ALL',
  companyCode,
  standaloneMode = false,
  onClose,
}) => {
  const [selectedScreenCode, setSelectedScreenCode] = useState<string>(screenId || 'ALL');
  const [screens, setScreens] = useState<DigitalSignageScreenRecord[]>(
    DEFAULT_COMPANY_DISPLAY_SCREENS
  );
  const [allBroadcasts, setAllBroadcasts] = useState<WelcomeBroadcastRecord[]>(
    DEFAULT_WELCOME_BROADCASTS
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [darkGalleryMode, setDarkGalleryMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nowTime, setNowTime] = useState<Date>(() => new Date());
  const [lastSyncStamp, setLastSyncStamp] = useState<string>(() =>
    new Date().toLocaleTimeString('en-GB', { hour12: false })
  );

  const loadLiveSignageData = useCallback(async () => {
    const [storedScreens, storedBroadcasts] = await Promise.all([
      realErpDataStore.getRecords<DigitalSignageScreenRecord>(
        'hr_digital_signage_screens',
        DEFAULT_COMPANY_DISPLAY_SCREENS
      ),
      realErpDataStore.getRecords<WelcomeBroadcastRecord>(
        'hr_welcome_broadcasts',
        DEFAULT_WELCOME_BROADCASTS
      ),
    ]);
    setScreens(
      Array.isArray(storedScreens) && storedScreens.length > 0
        ? storedScreens
        : DEFAULT_COMPANY_DISPLAY_SCREENS
    );
    setAllBroadcasts(
      Array.isArray(storedBroadcasts) && storedBroadcasts.length > 0
        ? storedBroadcasts
        : DEFAULT_WELCOME_BROADCASTS
    );
    setLastSyncStamp(new Date().toLocaleTimeString('en-GB', { hour12: false }));
  }, []);

  useEffect(() => {
    void loadLiveSignageData();
  }, [loadLiveSignageData]);

  // Real-time listener: BroadcastChannel + Storage + CustomEvent + 15s Cloud Heartbeat
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(KAS_SIGNAGE_BROADCAST_CHANNEL);
        channel.onmessage = () => {
          void loadLiveSignageData();
        };
      }
    } catch {
      channel = null;
    }

    const handleStorage = (ev: StorageEvent) => {
      if (!ev.key || ev.key === KAS_SIGNAGE_STORAGE_PING_KEY || ev.key.includes('hr_welcome_broadcasts')) {
        void loadLiveSignageData();
      }
    };

    const handleCustomUpdate = () => {
      void loadLiveSignageData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('kas-signage-updated', handleCustomUpdate);

    const pollTimer = window.setInterval(() => {
      void loadLiveSignageData();
    }, 15000);

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('kas-signage-updated', handleCustomUpdate);
      window.clearInterval(pollTimer);
    };
  }, [loadLiveSignageData]);

  // Live 1-second clock
  useEffect(() => {
    const timer = window.setInterval(() => setNowTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeSlides = useMemo(
    () => filterActiveBroadcastsForScreen(allBroadcasts, selectedScreenCode, companyCode),
    [allBroadcasts, selectedScreenCode, companyCode]
  );

  useEffect(() => {
    if (currentIndex >= activeSlides.length) {
      setCurrentIndex(0);
    }
  }, [activeSlides.length, currentIndex]);

  const currentSlide = activeSlides[currentIndex] || null;

  // Auto-advance carousel based on slide_duration_seconds
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;
    const durationMs = Math.max(5, Number(currentSlide?.slide_duration_seconds) || 12) * 1000;
    const timer = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [isPaused, activeSlides.length, currentIndex, currentSlide?.slide_duration_seconds]);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(false);
    }
  };

  const activeScreenMeta = useMemo(
    () => screens.find((s) => s.screen_code === selectedScreenCode || s.id === selectedScreenCode),
    [screens, selectedScreenCode]
  );

  const onlineScreensCount = useMemo(
    () => screens.filter((s) => s.is_online).length,
    [screens]
  );

  const currentDateKey = nowTime.toISOString().slice(0, 10);

  const dailyBadgeIdentity = useMemo(() => {
    if (!currentSlide) return null;
    return generateEmployeeBarcodeIdentity(
      {
        id: currentSlide.employee_id,
        employee_code: currentSlide.employee_code,
        email: currentSlide.corporate_email,
        full_name: currentSlide.employee_name,
        company_id: currentSlide.company_id,
      },
      new Date()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, currentDateKey]);

  const qrSvgMarkup = useMemo(() => {
    if (!currentSlide) return '';
    const qrPayload = buildWelcomeEmailQrPayload(currentSlide, new Date());
    return generateRealQrSvg(qrPayload, {
      sizePx: 118,
      darkColor: '#141414',
      lightColor: '#ffffff',
      borderStyle: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, currentDateKey]);

  const dailyBadgeCode128Svg = useMemo(() => {
    if (!dailyBadgeIdentity) return '';
    return generateRealCode128BarcodeSvg(dailyBadgeIdentity.badgeCode, {
      widthPx: 188,
      heightPx: 40,
      darkColor: '#141414',
      lightColor: '#ffffff',
      showText: true,
    });
  }, [dailyBadgeIdentity]);

  const initials = useMemo(() => {
    if (!currentSlide?.employee_name) return 'KS';
    const parts = currentSlide.employee_name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0].charAt(0)} ${parts[1].charAt(0)}`
      : parts[0].slice(0, 2);
  }, [currentSlide]);

  const formattedClock = nowTime.toLocaleTimeString('en-GB', { hour12: false });
  const formattedHijriDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(nowTime);
    } catch {
      return nowTime.toISOString().slice(0, 10);
    }
  }, [nowTime]);

  const rootBg = darkGalleryMode
    ? 'bg-[#141414] text-[#ffffff]'
    : 'bg-[#f3f3f3] text-[#141414]';
  const cardBg = darkGalleryMode
    ? 'bg-[#262626] border-[#262626] text-[#ffffff]'
    : 'bg-[#ffffff] border-[#e0e0e0] text-[#141414]';
  const subtleBg = darkGalleryMode
    ? 'bg-[#262626] border-[#262626] text-[#ffffff]'
    : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]';
  const mutedText = darkGalleryMode ? 'text-[#adadad]' : 'text-[#707070]';

  return (
    <div
      dir="rtl"
      className={`${
        standaloneMode ? 'min-h-screen w-full' : 'fixed inset-0 z-[2600]'
      } ${rootBg} flex flex-col justify-between p-4 sm:p-8 font-sans select-none overflow-y-auto transition-colors`}
    >
      {/* Top Broadcast Control & Network Telemetry Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-current/15">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`w-11 h-11 rounded-[16px] border flex items-center justify-center ${subtleBg}`}
          >
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-bold tracking-tight">
                منظومة شاشات العرض والترحيب المؤسسي — مجموعة خالد السليم القابضة
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border ${subtleBg}`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>متصل بالشبكة الحية • مزامنة {lastSyncStamp}</span>
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              {activeScreenMeta
                ? `${activeScreenMeta.screen_name_ar} — ${activeScreenMeta.location_zone} (${activeScreenMeta.ip_or_host})`
                : `البث الموحد المتزامن على جميع شاشات الشركة المتصلة بالإنترنت والشبكة الداخلية (${onlineScreensCount} شاشات نشطة)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="اختيار شاشة العرض"
            value={selectedScreenCode}
            onChange={(e) => setSelectedScreenCode(e.target.value)}
            className={`h-9 px-3.5 rounded-full text-xs font-bold border focus:outline-none cursor-pointer ${subtleBg}`}
          >
            <option value="ALL">جميع شاشات الشركة والإنترنت (ALL)</option>
            {screens.map((scr) => (
              <option key={scr.id} value={scr.screen_code}>
                {scr.screen_name_ar} ({scr.screen_code})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDarkGalleryMode((prev) => !prev)}
            className={`h-9 px-3.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${subtleBg}`}
            title="تبديل نمط إضاءة شاشة الصالة"
          >
            {darkGalleryMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkGalleryMode ? 'نمط نهاري' : 'نمط شاشة داكن'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleToggleFullscreen()}
            className={`h-9 px-3.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${subtleBg}`}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
            <span>{isFullscreen ? 'إنهاء ملء الشاشة' : 'عرض ملء الشاشة (TV)'}</span>
          </button>

          <div className={`px-4 py-1.5 rounded-full border text-left ${subtleBg}`}>
            <div className="font-mono text-sm font-bold tabular-nums">{formattedClock}</div>
            <div className={`text-[10px] ${mutedText}`}>{formattedHijriDate}</div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                darkGalleryMode
                  ? 'bg-[#ffffff] text-[#141414]'
                  : 'bg-[#141414] text-[#ffffff]'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>إغلاق الشاشة</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Stage: Active New Employee Welcome Card */}
      <main className="my-auto py-6 flex items-center justify-center">
        {currentSlide ? (
          <div
            className={`w-full max-w-6xl rounded-[28px] border p-6 sm:p-10 lg:p-12 transition-all ${cardBg}`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              {/* Right Column: Identity & Welcome Message */}
              <div className="flex-1 space-y-5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold ${
                      darkGalleryMode
                        ? 'bg-[#ffffff] text-[#141414]'
                        : 'bg-[#141414] text-[#ffffff]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ترحيب رسمي بانضمام موظف جديد</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${subtleBg}`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{currentSlide.company_name_ar}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono border ${subtleBg}`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>
                      {currentSlide.target_screen_ids.includes('ALL')
                        ? 'معروض على كافة شاشات الشركة والإنترنت'
                        : `شاشات مخصصة (${currentSlide.target_screen_ids.length})`}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
                  <div
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] flex items-center justify-center text-3xl sm:text-4xl font-bold shrink-0 border ${
                      darkGalleryMode
                        ? 'bg-[#ffffff] text-[#141414] border-[#ffffff]'
                        : 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    }`}
                  >
                    {initials}
                  </div>
                  <div className="space-y-1.5">
                    <div className={`text-sm sm:text-base font-semibold ${mutedText}`}>
                      {currentSlide.headline_ar}
                    </div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight m-0">
                      {currentSlide.employee_name}
                    </h1>
                    <div className="text-base sm:text-xl font-semibold pt-1">
                      {currentSlide.job_title} — {currentSlide.department}
                    </div>
                  </div>
                </div>

                <p
                  className={`text-sm sm:text-lg leading-relaxed max-w-3xl border-r-4 pr-4 ${
                    darkGalleryMode
                      ? 'border-[#ffffff] text-[#e0e0e0]'
                      : 'border-[#141414] text-[#262626]'
                  }`}
                >
                  {currentSlide.welcome_quote_ar}
                </p>

                {/* Metadata Pills Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className={`p-3.5 rounded-[18px] border ${subtleBg}`}>
                    <div className={`text-[11px] flex items-center gap-1 ${mutedText}`}>
                      <Hash className="w-3.5 h-3.5" />
                      <span>الرقم الوظيفي</span>
                    </div>
                    <div className="font-mono font-bold text-sm mt-1">
                      {currentSlide.employee_code}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-[18px] border ${subtleBg}`}>
                    <div className={`text-[11px] flex items-center gap-1 ${mutedText}`}>
                      <Building2 className="w-3.5 h-3.5" />
                      <span>الفرع ومقر المباشرة</span>
                    </div>
                    <div className="font-bold text-sm mt-1">{currentSlide.branch}</div>
                  </div>

                  <div className={`p-3.5 rounded-[18px] border ${subtleBg}`}>
                    <div className={`text-[11px] flex items-center gap-1 ${mutedText}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تاريخ الانضمام</span>
                    </div>
                    <div className="font-mono font-bold text-sm mt-1">
                      {currentSlide.hire_date}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-[18px] border ${subtleBg}`}>
                    <div className={`text-[11px] flex items-center gap-1 ${mutedText}`}>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>الزميل المرشد (Buddy)</span>
                    </div>
                    <div className="font-bold text-sm mt-1 truncate">
                      {currentSlide.buddy_name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Left Column: Scannable Welcome Email Info QR + Real Daily-Rotating Employee Barcode */}
              <div
                className={`w-full lg:w-72 shrink-0 rounded-[24px] border p-5 flex flex-col items-center text-center space-y-3 ${subtleBg}`}
              >
                <div className="bg-[#ffffff] p-3 rounded-[18px] border border-[#e0e0e0]">
                  <div dangerouslySetInnerHTML={{ __html: qrSvgMarkup }} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold">باركود الترحيب ومعلومات الإيميل</div>
                  <p className={`text-[11px] leading-snug m-0 ${mutedText}`}>
                    امسح الرمز لإرسال واستلام معلومات البريد الوظيفي (@kas.sa) وبوابة النظام فوراً
                  </p>
                </div>
                {dailyBadgeCode128Svg && (
                  <div className="w-full bg-[#ffffff] p-2.5 rounded-[14px] border border-[#e0e0e0] flex flex-col items-center gap-1">
                    <div
                      className="max-w-full overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: dailyBadgeCode128Svg }}
                    />
                    <span className="text-[10px] font-mono text-[#707070]">
                      باركود الموظف اليومي المتجدد ({dailyBadgeIdentity?.validForDate})
                    </span>
                  </div>
                )}
                <div className="w-full pt-2 border-t border-current/10 text-[11px] font-mono space-y-0.5">
                  <div className="font-bold">{currentSlide.corporate_email || 'HR@kas.sa'}</div>
                  {currentSlide.auto_email_sent && (
                    <div className="text-[10px] font-sans font-semibold">
                      أُرسل الترحيب تلقائياً لإيميل الموظف ✓
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Carousel Controls if multiple active welcome cards exist */}
            <div className="mt-8 pt-4 border-t border-current/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${mutedText}`}>
                  بطاقة الترحيب ({currentIndex + 1} من {activeSlides.length}) • مدة العرض{' '}
                  <span className="font-mono font-bold">
                    {currentSlide.slide_duration_seconds || 12}s
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex(
                      (prev) => (prev - 1 + activeSlides.length) % activeSlides.length
                    )
                  }
                  className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer ${subtleBg}`}
                  title="البطاقة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  className={`px-3.5 h-9 rounded-full border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${subtleBg}`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'استئناف التدوير' : 'تثبيت البطاقة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % activeSlides.length)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer ${subtleBg}`}
                  title="البطاقة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`w-full max-w-xl rounded-[24px] border p-10 text-center space-y-3 ${cardBg}`}>
            <Tv className="w-10 h-10 mx-auto" />
            <h2 className="text-lg font-bold m-0">شاشة العرض متصلة وجاهزة لاستقبال البث</h2>
            <p className={`text-xs m-0 ${mutedText}`}>
              لا توجد بطاقات ترحيب نشطة مخصصة لهذه الشاشة حالياً. بمجرد إطلاق بث ترحيبي من قسم
              الموارد البشرية سيظهر هنا تلقائياً في نفس اللحظة.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Connected Screens Network Strip */}
      <footer className="pt-4 border-t border-current/15 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">شبكة شاشات العرض المتصلة ({onlineScreensCount}/{screens.length}):</span>
          {screens.map((scr) => (
            <button
              key={scr.id}
              type="button"
              onClick={() => setSelectedScreenCode(scr.screen_code)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                selectedScreenCode === scr.screen_code
                  ? darkGalleryMode
                    ? 'bg-[#ffffff] text-[#141414] border-[#ffffff]'
                    : 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : subtleBg
              }`}
            >
              {scr.is_online ? '● ' : '○ '}
              {scr.screen_name_ar.split('—')[0].trim()}
            </button>
          ))}
        </div>
        <div className={`font-mono text-[11px] ${mutedText}`}>
          KAS Digital Signage Engine v2.0 • Live BroadcastChannel + Cloud Sync
        </div>
      </footer>
    </div>
  );
};

export default CorporateDigitalSignagePlayer;
