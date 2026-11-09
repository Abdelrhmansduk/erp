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
import { useLanguage } from '../../i18n/LanguageContext';
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
import { getPinnedTabs, type PinnedTabItem } from '../../utils/pinnedTabs';

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
  const { currentLanguage, t } = useLanguage();
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
          label: 'المالية والمحاسبة',
          title: 'الأستاذ العام والمحاسبة العامة',
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
          data-mobile-sheet="true"
          className="fixed inset-0 bg-[#141414]/50 backdrop-blur-xs z-[250] lg:hidden flex items-end justify-center"
          onClick={() => setShowQuickSheet(false)}
          dir={currentLanguage.dir}
        >
          <div
            className="w-full max-w-md bg-[#ffffff] rounded-t-[24px] border-t border-[#e0e0e0] shadow-2xl p-4 space-y-3 pb-24 motion-silk-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-[12px] bg-[#141414] text-[#ffffff] flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[#141414] m-0">
                    {t('nav.quickSheetTitle', 'مركز الإجراءات السريعة للهاتف')}
                  </h4>
                  <p className="text-[10.5px] text-[#707070] m-0">{deptMeta.nameAr}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickSheet(false)}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center cursor-pointer transition-colors"
                aria-label="إغلاق"
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
                className="p-3 min-h-[56px] rounded-[16px] bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center gap-2.5 text-right border border-[#e0e0e0] motion-spring-press cursor-pointer"
              >
                <Search className="w-4 h-4 text-[#141414] shrink-0" />
                <div>
                  <div className="text-xs font-bold">{t('nav.searchAndCommands', 'البحث والأوامر')}</div>
                  <div className="text-[10px] text-[#707070]">{t('nav.instantGlobalSearch', 'بحث شامل فوري')}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  window.dispatchEvent(new CustomEvent('open-universal-extractor'));
                }}
                className="p-3 min-h-[56px] rounded-[16px] bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] flex items-center gap-2.5 text-right border border-[#e0e0e0] motion-spring-press cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-[#141414] shrink-0" />
                <div>
                  <div className="text-xs font-bold">{t('nav.ocrScanner', 'ماسح الفواتير OCR')}</div>
                  <div className="text-[10px] text-[#707070]">{t('nav.ocrSub', '100+ فاتورة ومستند')}</div>
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
                className="p-3 min-h-[56px] rounded-[16px] bg-[#141414] hover:bg-[#262626] text-[#ffffff] flex items-center gap-2.5 text-right font-bold motion-spring-press cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#ffffff] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#ffffff]">{t('nav.aiAssistant', 'فارس ونُورة AI')}</div>
                  <div className="text-[10px] text-[#ffffff]/80">{t('nav.aiAssistantSub', 'مساعد المهام الذكي')}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickSheet(false);
                  onOpenAppLauncher();
                }}
                className="p-3 min-h-[56px] rounded-[16px] bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] flex items-center gap-2.5 text-right border border-[#e0e0e0] motion-spring-press cursor-pointer"
              >
                <Grid className="w-4 h-4 text-[#141414] shrink-0" />
                <div>
                  <div className="text-xs font-bold">{t('nav.appPlatform', 'منصة التطبيقات')}</div>
                  <div className="text-[10px] text-[#707070]">{t('nav.appPlatformSub', 'كافة وحدات القسم')}</div>
                </div>
              </button>
            </div>

            {pinnedTabs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-[#141414] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-[#141414] text-[#141414]" />
                  <span>{t('nav.pinnedScreens', 'شاشاتي المثبتة في المفضلة:')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pinnedTabs.map((pin) => (
                    <button
                      key={pin.href}
                      type="button"
                      onClick={() => {
                        setShowQuickSheet(false);
                        onSelectTab(pin.href, t(pin.href, pin.title));
                      }}
                      className="px-3 py-2 min-h-[40px] rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414] cursor-pointer"
                    >
                      {t(pin.href, pin.title)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <nav
        data-slot="mobile-bottom-nav"
        dir={currentLanguage.dir}
        aria-label="شريط التنقل السفلي للهاتف"
        className="fixed bottom-0 inset-x-0 z-[95] lg:hidden bg-[#ffffff]/95 backdrop-blur-xl border-t border-[#e0e0e0] shadow-[0_-8px_24px_rgba(20,20,20,0.06)] select-none"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Top Micro Status Strip: Shown when Offline or Pending Background Sync */}
        {(!bgState.isOnline || bgState.pendingOfflineCount > 0) && (
          <div
            className={`px-3 py-1.5 text-[10.5px] font-bold flex items-center justify-between border-b ${
              !bgState.isOnline
                ? 'bg-[#141414] text-[#ffffff] border-[#262626]'
                : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {!bgState.isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#ffffff] shrink-0 animate-pulse" />
                  <span className="truncate">
                    وضع عدم الاتصال • المزامنة الخلفية نشطة ({bgState.pendingOfflineCount} بالانتظار)
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0066ff] shrink-0" />
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold shrink-0 cursor-pointer"
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
            onClick={() => onSelectTab('dashboard', t('dashboard', 'الرئيسية والمؤشرات التشغيلية'))}
            className={`flex flex-col items-center justify-center gap-1 h-full min-h-[48px] rounded-[14px] transition-colors motion-spring-press cursor-pointer ${
              isHomeActive ? 'text-[#141414] font-bold' : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                isHomeActive ? 'bg-[#141414] text-[#ffffff]' : ''
              }`}
            >
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] leading-none truncate">{t('nav.home', 'الرئيسية')}</span>
          </button>

          {/* 2. Primary Department Screen */}
          <button
            type="button"
            onClick={() => onSelectTab(primaryOpsTab.href, t(primaryOpsTab.href, primaryOpsTab.title))}
            className={`flex flex-col items-center justify-center gap-1 h-full min-h-[48px] rounded-[14px] transition-colors motion-spring-press cursor-pointer ${
              isOpsActive ? 'text-[#141414] font-bold' : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                isOpsActive ? 'bg-[#141414] text-[#ffffff]' : ''
              }`}
            >
              <OpsIcon className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] leading-none truncate">
              {currentLanguage.code === 'ar'
                ? primaryOpsTab.label
                : t(primaryOpsTab.href, primaryOpsTab.label)}
            </span>
          </button>

          {/* 3. Center Elevated Action Button: Quick Action Sheet + App Launcher */}
          <div className="flex items-center justify-center h-full">
            <button
              type="button"
              onClick={() => setShowQuickSheet((prev) => !prev)}
              aria-label="الإجراءات السريعة ووحدات القسم"
              className="w-12 h-12 min-w-[48px] min-h-[48px] -mt-4 rounded-[18px] bg-[#141414] text-[#ffffff] border-2 border-[#ffffff] shadow-lg flex flex-col items-center justify-center gap-0.5 motion-spring-press cursor-pointer"
            >
              <Zap className="w-4 h-4 text-[#ffffff]" />
              <span className="text-[9px] font-bold text-[#ffffff] leading-none">
                {t('nav.quickAction', 'إجراء سريع')}
              </span>
            </button>
          </div>

          {/* 4. Mobile Notification Center Trigger */}
          <button
            type="button"
            onClick={onToggleNotifications}
            className={`relative flex flex-col items-center justify-center gap-1 h-full min-h-[48px] rounded-[14px] transition-colors motion-spring-press cursor-pointer ${
              isNotificationsOpen ? 'text-[#141414] font-bold' : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            <div
              className={`relative w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                isNotificationsOpen ? 'bg-[#141414] text-[#ffffff]' : ''
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0066ff] text-[#ffffff] text-[9.5px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10.5px] leading-none truncate">{t('nav.notifications', 'الإشعارات')}</span>
          </button>

          {/* 5. Full Sidebar Menu Drawer */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex flex-col items-center justify-center gap-1 h-full min-h-[48px] rounded-[14px] text-[#707070] hover:text-[#141414] transition-colors motion-spring-press cursor-pointer"
          >
            <div className="w-10 h-7 rounded-full flex items-center justify-center">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[10.5px] leading-none truncate">{t('nav.menu', 'القائمة')}</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
