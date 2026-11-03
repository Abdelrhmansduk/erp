import React, { useEffect, useState } from 'react';
import {
  Home,
  Briefcase,
  Grid,
  Bell,
  Menu,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  Building2,
  HeartHandshake,
  Wallet,
  FileText,
  Users,
  IdCard,
  Zap,
  Search,
  UploadCloud,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useCompany } from '../../contexts/CompanyContext';
import {
  authService,
  resolveDepartmentAndCompany,
  CORPORATE_DEPARTMENTS,
  DepartmentId,
} from '../../services/authService';
import {
  backgroundExecutionService,
  BackgroundExecutionState,
} from '../../services/backgroundExecutionService';
import { getPinnedTabs, PinnedTabItem } from '../common/QuickSearchModal';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (href: string, title: string) => void;
  onOpenAppLauncher: () => void;
  onToggleSidebar: () => void;
  onToggleNotifications: () => void;
  isNotificationsOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenAppLauncher,
  onToggleSidebar,
  onToggleNotifications,
  isNotificationsOpen,
}) => {
  const { unreadCount, setQuickSearchOpen } = useAppStore();
  const { activeCompanyId } = useCompany();
  const [bgState, setBgState] = useState<BackgroundExecutionState>(() =>
    backgroundExecutionService.getState()
  );
  const [syncingNow, setSyncingNow] = useState(false);
  const [showQuickSheet, setShowQuickSheet] = useState(false);
  const [pinnedTabs, setPinnedTabs] = useState<PinnedTabItem[]>(() => getPinnedTabs());

  useEffect(() => {
    const unsub = backgroundExecutionService.subscribe((next) => {
      setBgState(next);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (showQuickSheet) {
      setPinnedTabs(getPinnedTabs());
    }
  }, [showQuickSheet]);

  const currentUser = authService.getCurrentUser();
  const resolvedScope = resolveDepartmentAndCompany(
    currentUser?.email || currentUser?.username || '',
    currentUser?.role,
    currentUser?.company_id || activeCompanyId,
    currentUser?.department_id
  );

  const deptMeta =
    CORPORATE_DEPARTMENTS[resolvedScope.departmentId as DepartmentId] ||
    CORPORATE_DEPARTMENTS.executive;

  // Resolve primary operations tab dynamically per employee's locked department
  const primaryOpsTab = (() => {
    switch (resolvedScope.departmentId) {
      case 'finance':
        return {
          href: 'finance-home',
          label: 'سماك المحاسبي',
          title: 'الأستاذ العام والمحاسبة (SMACC)',
          icon: Wallet,
        };
      case 'rental':
        return {
          href: 'rent-contracts',
          label: 'عقود التأجير',
          title: 'عقود التأجير والتشغيل المرن',
          icon: Briefcase,
        };
      case 'ats':
        return {
          href: 'cvs-recruitment',
          label: 'بنك السير',
          title: 'بنك السير الذاتية والفرز (ATS)',
          icon: FileText,
        };
      case 'hr':
        return {
          href: 'employees',
          label: 'شؤون الموظفين',
          title: 'الموارد البشرية ومسيرات الرواتب',
          icon: IdCard,
        };
      case 'crm':
        return {
          href: 'clients',
          label: 'العملاء CRM',
          title: 'إدارة علاقات العملاء والشكاوى',
          icon: Users,
        };
      case 'shelter':
        return {
          href: 'shelter-suite',
          label: 'الإيواء DAR',
          title: 'بوابة مراكز الإيواء والتسكين (DAR)',
          icon: HeartHandshake,
        };
      case 'tenders':
        return {
          href: 'kas-suite',
          label: 'منافسات كاس',
          title: 'البوابة المستقلة لشركة كاس (KAS Suite)',
          icon: Building2,
        };
      case 'recruitment':
      default:
        return {
          href: 'recruitment-contracts',
          label: 'عقود مساند',
          title: 'عقود الاستقدام الموثقة (مساند)',
          icon: Briefcase,
        };
    }
  })();

  const OpsIcon = primaryOpsTab.icon;
  const isHomeActive = activeTab === 'dashboard' && !isNotificationsOpen;
  const isOpsActive =
    (activeTab === primaryOpsTab.href || activeTab === deptMeta.defaultTab) &&
    !isNotificationsOpen;

  const handleManualSync = async () => {
    if (syncingNow) return;
    setSyncingNow(true);
    try {
      await backgroundExecutionService.flushBackgroundQueues('manual-mobile-bar');
    } finally {
      setSyncingNow(false);
    }
  };

  return (
    <>
      {/* Mobile Quick-Action Bottom Sheet */}
      {showQuickSheet && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[250] lg:hidden flex items-end justify-center"
          onClick={() => setShowQuickSheet(false)}
          dir="rtl"
        >
          <div
            className="w-full max-w-md bg-[#FBFBF5] rounded-t-3xl border-t-2 border-[#CFA64A] shadow-2xl p-4 space-y-3 pb-24"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#1D2428] text-[#CFA64A] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-[#1D2428]">
                    مركز الإجراءات السريعة للهاتف
                  </h4>
                  <p className="text-[10.5px] text-zinc-500">{deptMeta.nameAr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickSheet(false)}
                className="p-1.5 rounded-lg bg-zinc-200/70 text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  setQuickSearchOpen(true);
                }}
                className="p-3 rounded-xl bg-[#1D2428] text-white flex items-center gap-2.5 text-right border border-[#CFA64A]/40"
              >
                <Search className="w-4 h-4 text-[#CFA64A] shrink-0" />
                <div>
                  <div className="text-xs font-black">البحث والأوامر</div>
                  <div className="text-[10px] text-zinc-400">بحث شامل فوري</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  window.dispatchEvent(new CustomEvent('open-universal-extractor'));
                }}
                className="p-3 rounded-xl bg-white text-[#1D2428] flex items-center gap-2.5 text-right border border-zinc-200 shadow-2xs"
              >
                <UploadCloud className="w-4 h-4 text-[#8C681E] shrink-0" />
                <div>
                  <div className="text-xs font-black">ماسح الفواتير OCR</div>
                  <div className="text-[10px] text-zinc-500">100+ فاتورة ومستند</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  window.dispatchEvent(
                    new CustomEvent('open-faris-assistant', {
                      detail: {
                        persona: 'faris',
                        prompt: 'أعطني إيجاز مهامي اليومي في قسمي الآن.',
                      },
                    })
                  );
                }}
                className="p-3 rounded-xl bg-[#CFA64A] text-[#1D2428] flex items-center gap-2.5 text-right font-black"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <div>
                  <div className="text-xs font-black">فارس ونُورة AI</div>
                  <div className="text-[10px] text-[#1D2428]/80">مساعد المهام الذكي</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  onOpenAppLauncher();
                }}
                className="p-3 rounded-xl bg-white text-[#1D2428] flex items-center gap-2.5 text-right border border-zinc-200 shadow-2xs"
              >
                <Grid className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-xs font-black">منصة التطبيقات</div>
                  <div className="text-[10px] text-zinc-500">كافة وحدات القسم</div>
                </div>
              </button>
            </div>

            {pinnedTabs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-black text-[#8C681E] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#CFA64A] text-[#CFA64A]" />
                  <span>شاشاتي المثبتة في المفضلة:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pinnedTabs.map((pin) => (
                    <button
                      key={pin.href}
                      type="button"
                      onClick={() => {
                        setShowQuickSheet(false);
                        onSelectTab(pin.href, pin.title);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#CFA64A]/40 text-[11px] font-bold text-[#1D2428]"
                    >
                      {pin.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <nav
        dir="rtl"
        aria-label="شريط التنقل السفلي للهاتف"
        className="fixed bottom-0 inset-x-0 z-[95] lg:hidden bg-white/95 backdrop-blur-xl border-t border-zinc-200 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] select-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Top Micro Status Strip: Shown when Offline or Pending Background Sync */}
        {(!bgState.isOnline || bgState.pendingOfflineCount > 0) && (
          <div
            className={`px-3 py-1 text-[10.5px] font-bold flex items-center justify-between border-b ${
              !bgState.isOnline
                ? 'bg-[#FAEBD7] text-[#8C6239] border-[#CFA64A]/40'
                : 'bg-zinc-900 text-[#CFA64A] border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {!bgState.isOnline ? (
                <>
                  <WifiOff className="w-3 h-3 text-[#8C6239] shrink-0 animate-pulse" />
                  <span className="truncate">
                    وضع عدم الاتصال • المزامنة الخلفية نشطة ({bgState.pendingOfflineCount} بالانتظار)
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 text-[#CFA64A] shrink-0" />
                  <span className="truncate">
                    طابور المزامنة الخلفية ({bgState.pendingOfflineCount} عمليات جاهزة للمزامنة)
                  </span>
                </>
              )}
            </div>

            {bgState.isOnline && bgState.pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#CFA64A] text-black text-[10px] font-extrabold shrink-0"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${syncingNow ? 'animate-spin' : ''}`} />
                <span>مزامنة الآن</span>
              </button>
            )}
          </div>
        )}

        {/* 5-Column Ergonomic Mobile Navigation Bar */}
        <div className="grid grid-cols-5 items-center h-16 px-1 max-w-md mx-auto">
          {/* 1. Home / Dashboard */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard', 'الرئيسية والمؤشرات التشغيلية')}
            className={`flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-colors ${
              isHomeActive ? 'text-black font-extrabold' : 'text-zinc-500 hover:text-black'
            }`}
          >
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
                isHomeActive ? 'bg-black text-[#CFA64A]' : ''
              }`}
            >
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] leading-none truncate">الرئيسية</span>
          </button>

          {/* 2. Primary Department Screen */}
          <button
            type="button"
            onClick={() => onSelectTab(primaryOpsTab.href, primaryOpsTab.title)}
            className={`flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-colors ${
              isOpsActive ? 'text-black font-extrabold' : 'text-zinc-500 hover:text-black'
            }`}
          >
            <div
              className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
                isOpsActive ? 'bg-black text-[#CFA64A]' : ''
              }`}
            >
              <OpsIcon className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] leading-none truncate">{primaryOpsTab.label}</span>
          </button>

          {/* 3. Center Elevated Action Button: Quick Action Sheet + App Launcher */}
          <div className="flex items-center justify-center h-full">
            <button
              type="button"
              onClick={() => setShowQuickSheet((prev) => !prev)}
              aria-label="الإجراءات السريعة ووحدات القسم"
              className="w-12 h-12 -mt-4 rounded-2xl bg-[#1D2428] text-[#CFA64A] border-2 border-[#CFA64A] shadow-lg shadow-black/20 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
            >
              <Zap className="w-4 h-4" />
              <span className="text-[9px] font-black text-white leading-none">إجراء سريع</span>
            </button>
          </div>

          {/* 4. Mobile Notification Center Trigger */}
          <button
            type="button"
            onClick={onToggleNotifications}
            className={`relative flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-colors ${
              isNotificationsOpen ? 'text-black font-extrabold' : 'text-zinc-500 hover:text-black'
            }`}
          >
            <div
              className={`relative w-9 h-7 rounded-full flex items-center justify-center transition-all ${
                isNotificationsOpen ? 'bg-black text-[#CFA64A]' : ''
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10.5px] leading-none truncate">الإشعارات</span>
          </button>

          {/* 5. Full Sidebar Menu Drawer */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex flex-col items-center justify-center gap-1 h-full rounded-xl text-zinc-500 hover:text-black transition-colors"
          >
            <div className="w-9 h-7 rounded-full flex items-center justify-center">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] leading-none truncate">القائمة</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
