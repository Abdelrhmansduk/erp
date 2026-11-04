import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { useIamSession } from '../../contexts/IamSessionContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAppStore } from '../../stores/appStore';
import {
  authService,
  CORPORATE_DEPARTMENTS,
  COMPANY_AUTH_METADATA,
  resolveDepartmentAndCompany,
} from '../../services/authService';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { ProductionDataHubModal } from '../database/ProductionDataHubModal';
import { UniversalDocumentExtractorModal } from '../common/UniversalDocumentExtractorModal';
import { CorporateAvatar } from '../common/CorporateAvatar';
import { EmployeePhotoAvatar } from '../auth/EmployeePhotoAvatar';
import { BusinessIllustration } from '../common/BusinessIllustration';
import { EnterpriseErrorMonitorPanel } from '../monitoring/EnterpriseErrorMonitorPanel';
import { errorMonitorService } from '../../services/errorMonitorService';
import { SIDEBAR_MENU } from '../../data/sidebarMenu';
import { SLUG_ARABIC_TITLES } from '../../data/slugArabicTitles';
import {
  Menu,
  Grid,
  Search,
  Bell,
  Maximize,
  Minimize,
  MapPin,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Check,
  X,
  Globe,
  Database,
  User,
  Lock,
  UploadCloud,
  Activity,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  activeTabTitle: string;
  onToggleSidebar: () => void;
  onOpenAppLauncher: () => void;
  onLogout?: () => void;
}


export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  onToggleSidebar,
  onOpenAppLauncher,
  onLogout,
}) => {
  const { currentLanguage, availableLanguages, setLanguage, t } = useLanguage();
  const { currentUser: iamUser } = useIamSession();
  const { user: authUser } = useAuthContext();
  const { impersonatedState, stopImpersonation } = useImpersonation();
  const { unreadCount, setQuickSearchOpen, activeTab } = useAppStore();

  const resolvedTabTitle = useMemo(() => {
    if (activeTabTitle && !/^[a-z0-9-_]+$/i.test(activeTabTitle)) {
      return activeTabTitle;
    }
    const targetSlug = (activeTab || activeTabTitle || 'dashboard').trim().toLowerCase();
    if (SLUG_ARABIC_TITLES[targetSlug]) {
      return SLUG_ARABIC_TITLES[targetSlug];
    }
    const findTitle = (items: typeof SIDEBAR_MENU): string | null => {
      for (const item of items) {
        if (item.href === targetSlug || item.id === targetSlug) return item.title;
        if (item.children) {
          const found = findTitle(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return (
      findTitle(SIDEBAR_MENU) ||
      SLUG_ARABIC_TITLES[activeTabTitle?.toLowerCase()] ||
      'لوحة المؤشرات التنفيذية'
    );
  }, [activeTabTitle, activeTab]);

  const effectiveProfile = authUser || authService.getCurrentUser();
  const resolvedScope = useMemo(() => {
    if (!effectiveProfile) {
      return resolveDepartmentAndCompany('accounting@saf-rec.sa');
    }
    return resolveDepartmentAndCompany(
      effectiveProfile.email,
      effectiveProfile.role,
      effectiveProfile.company_id,
      effectiveProfile.department_id
    );
  }, [effectiveProfile]);

  const companyMeta = useMemo(() => {
    const key = resolvedScope.companyId === 'all' ? 'ALL' : resolvedScope.companyId.toUpperCase();
    return COMPANY_AUTH_METADATA[key] || COMPANY_AUTH_METADATA.SAF;
  }, [resolvedScope.companyId]);

  const departmentDef = CORPORATE_DEPARTMENTS[resolvedScope.departmentId];

  const [selectedBranch, setSelectedBranch] = useState<string>(
    effectiveProfile?.branch || 'الفرع الرئيسي - الرياض'
  );
  const [showBranchDropdown, setShowBranchDropdown] = useState<boolean>(false);
  const [showLangDropdown, setShowLangDropdown] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [showDataHubModal, setShowDataHubModal] = useState<boolean>(false);
  const [showErrorMonitorModal, setShowErrorMonitorModal] = useState<boolean>(false);
  const [openErrorCount, setOpenErrorCount] = useState<number>(
    () => errorMonitorService.getSystemHealthSummary().openIncidents
  );
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showUniversalExtractor, setShowUniversalExtractor] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [langSearch, setLangSearch] = useState<string>('');

  useEffect(() => {
    if (effectiveProfile?.branch) {
      setSelectedBranch(effectiveProfile.branch);
    }
  }, [effectiveProfile?.branch]);

  useEffect(() => {
    const handleToggleMobileNotifs = () => {
      setShowNotifDropdown((prev) => !prev);
      setShowUserDropdown(false);
      setShowLangDropdown(false);
    };
    const handleOpenDocExtractor = () => {
      setShowUniversalExtractor(true);
    };
    const handleSyncErrorMonitor = () => {
      setOpenErrorCount(errorMonitorService.getSystemHealthSummary().openIncidents);
    };
    const handleOpenErrorMonitor = () => {
      setShowErrorMonitorModal(true);
    };
    window.addEventListener('toggle-mobile-notifications', handleToggleMobileNotifs);
    window.addEventListener('open-document-extractor', handleOpenDocExtractor);
    window.addEventListener('erp-error-monitor-updated', handleSyncErrorMonitor);
    window.addEventListener('open-error-monitor', handleOpenErrorMonitor);
    return () => {
      window.removeEventListener('toggle-mobile-notifications', handleToggleMobileNotifs);
      window.removeEventListener('open-document-extractor', handleOpenDocExtractor);
      window.removeEventListener('erp-error-monitor-updated', handleSyncErrorMonitor);
      window.removeEventListener('open-error-monitor', handleOpenErrorMonitor);
    };
  }, []);

  const navigateGuarded = (tab: string, title: string) => {
    window.dispatchEvent(
      new CustomEvent('alsulaim_navigate', {
        detail: { tab, title },
      })
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const branches = [
    { id: 'main', name: 'الفرع الرئيسي - الرياض', city: 'الرياض - طريق الملك فهد' },
    { id: 'riyadh_takhassusi', name: 'فرع الرياض (التخصصي)', city: 'الرياض' },
    { id: 'jeddah', name: 'فرع جدة', city: 'طريق المدينة المنورة' },
    { id: 'dammam', name: 'فرع الدمام', city: 'شارع الملك سعود' },
    { id: 'khamis', name: 'فرع خميس مشيط', city: 'طريق الملك فهد' },
  ];

  const filteredLanguages = availableLanguages.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const displayName = effectiveProfile?.full_name || iamUser?.fullName || 'خالد السليم';
  const displayEmail = effectiveProfile?.email || iamUser?.email || 'chairman@alsulaim.sa';

  return (
    <>
      {impersonatedState.isImpersonating && (
        <div className="bg-[#141414] text-[#ffffff] px-4 py-2 text-xs font-semibold flex items-center justify-between z-[1100] border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <span>
              وضع المعاينة والتدقيق الكلي: أنت تتصفح بصلاحيات (
              <strong>{impersonatedState.employeeName}</strong>)
            </span>
          </div>
          <button
            type="button"
            onClick={stopImpersonation}
            className="bg-[#ffffff] text-[#141414] px-3 py-1 rounded-full text-xs font-semibold hover:bg-[#f3f3f3] cursor-pointer"
          >
            العودة لنمط الأدمن الرئيسي
          </button>
        </div>
      )}

      {/* Mobbin Clean Top Bar: #ffffff surface, 1px #f0f0f0 hairline, zero shadow, zero collision */}
      <header className="h-16 bg-[#ffffff] border-b border-[#f0f0f0] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-[90] gap-4">
        {/* Right Section: Sidebar Toggle, App Launcher Pill, Branch Switcher, Active Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            onClick={onToggleSidebar}
            title="القائمة الجانبية"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-xs font-semibold shrink-0 whitespace-nowrap cursor-pointer transition-colors"
            onClick={onOpenAppLauncher}
            title={t('appLauncherTitle', 'شاشات القسم المصرح بها')}
          >
            <Grid className="w-3.5 h-3.5 shrink-0" />
            <span>شاشات القسم</span>
          </button>

          {/* Active Branch Switcher — Responsive width with safe truncation & zero overflow */}
          <div className="relative hidden md:block min-w-0 shrink">
            <button
              type="button"
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="max-w-full px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] cursor-pointer flex items-center gap-1.5 text-xs font-semibold transition-colors overflow-hidden"
              title={selectedBranch}
            >
              <MapPin className="w-3.5 h-3.5 text-[#141414] shrink-0" />
              <span className="truncate">{selectedBranch}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#707070] shrink-0" />
            </button>

            {showBranchDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-64 z-[250] p-2.5 space-y-1 shadow-lg">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-[#707070] border-b border-[#f0f0f0]">
                  الفرع التشغيلي:
                </div>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBranch(b.name);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full text-right px-3 py-2 rounded-[16px] text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selectedBranch === b.name
                        ? 'bg-[#141414] text-[#ffffff] font-semibold'
                        : 'hover:bg-[#f3f3f3] text-[#141414]'
                    }`}
                  >
                    <span>{b.name}</span>
                    {selectedBranch === b.name && <Check className="w-3.5 h-3.5 text-[#ffffff]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden 2xl:block min-w-0 flex-1 overflow-hidden">
            <h1 className="text-sm font-bold text-[#141414] m-0 truncate">
              {resolvedTabTitle}
            </h1>
          </div>
        </div>

        {/* Left Section: Clean Non-Overlapping Mobbin Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {resolvedScope.departmentId === 'executive' && (
            <button
              type="button"
              onClick={() => setShowDataHubModal(true)}
              className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] cursor-pointer shrink-0 flex items-center justify-center transition-colors"
              title="حالة الاتصال بقاعدة البيانات السحابية"
              aria-label="قاعدة البيانات"
            >
              <Database className="w-4 h-4 text-[#141414] shrink-0" />
            </button>
          )}

          {/* Live Enterprise Error Monitor */}
          <button
            type="button"
            onClick={() => setShowErrorMonitorModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            title="رادار مراقبة وتشخيص الأخطاء المباشر ومحرك الإصلاح الذاتي"
          >
            <Activity className="w-3.5 h-3.5 text-[#141414] shrink-0" />
            <span className="hidden 2xl:inline">
              {openErrorCount > 0 ? 'الأخطاء' : 'سلامة النظام'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold font-mono leading-none">
              {openErrorCount > 0 ? openErrorCount : '100%'}
            </span>
          </button>

          {/* Universal Document & 100-Invoice Auto-Extractor Button */}
          <button
            type="button"
            onClick={() => setShowUniversalExtractor(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#262626] text-[#ffffff] rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            title="رفع واستخلاص آلي لأي مستند (100 صورة فاتورة / PDF / Word / Excel)"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#ffffff] shrink-0" />
            <span className="hidden xl:inline">مستخرج المستندات</span>
          </button>

          {/* Faris & Noura Institutional Advisor Quick Trigger */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-faris-assistant'));
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            title="استدعاء المستشار المؤسسي الصوتي والنصي (فارس / نُورة)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#141414] shrink-0" />
            <span className="hidden 2xl:inline">فارس ونُورة</span>
          </button>

          {/* Language Selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowLangDropdown(!showLangDropdown);
                setShowUserDropdown(false);
                setShowNotifDropdown(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f3f3f3] hover:bg-[#e0e0e0] rounded-full transition-colors text-xs font-semibold text-[#141414] cursor-pointer whitespace-nowrap"
              title="تغيير لغة المنظومة"
            >
              <span className="text-xs font-mono font-bold">{currentLanguage.code.toUpperCase()}</span>
              <span className="hidden 2xl:inline text-xs">{currentLanguage.nativeName}</span>
              <ChevronDown className="w-3 h-3 text-[#707070] shrink-0" />
            </button>

            {showLangDropdown && (
              <div className="fixed inset-x-3 top-[calc(var(--header-height,64px)+8px)] sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:left-0 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] sm:w-64 max-w-[calc(100vw-24px)] z-[350] p-3 space-y-2 text-right">
                <div className="px-2 pt-1 pb-2 border-b border-[#f0f0f0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#141414] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#141414]" />
                    <span>لغات النظام الرسمية</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLangDropdown(false)}
                    className="text-[#707070] hover:text-[#141414] p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative px-1">
                  <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث عن لغة..."
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    className="w-full bg-[#f0f0f0] rounded-[16px] pr-8 pl-3 py-1.5 text-xs text-[#141414] outline-none"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                  {filteredLanguages.map((lang) => {
                    const isSelected = currentLanguage.code === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang);
                          setShowLangDropdown(false);
                          setLangSearch('');
                        }}
                        className={`w-full text-right px-3 py-2 rounded-[16px] text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#141414] text-[#ffffff] font-semibold'
                            : 'hover:bg-[#f3f3f3] text-[#141414]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{lang.flag}</span>
                          <div>
                            <div className="font-semibold leading-tight">{lang.nativeName}</div>
                            <div
                              className={`text-[10px] leading-none mt-0.5 ${
                                isSelected ? 'text-[#adadad]' : 'text-[#707070]'
                              }`}
                            >
                              {lang.name} ({lang.code.toUpperCase()})
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#ffffff]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Search Button */}
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] transition-colors shrink-0 cursor-pointer"
            onClick={() => setQuickSearchOpen(true)}
            title="البحث السريع (Ctrl + K)"
            aria-label="البحث السريع"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="hidden sm:flex w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] items-center justify-center text-[#141414] transition-colors shrink-0 cursor-pointer"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
            aria-label="ملء الشاشة"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] transition-colors relative shrink-0 cursor-pointer"
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowUserDropdown(false);
                setShowLangDropdown(false);
              }}
              title="الإشعارات والتنبيهات"
              aria-label="الإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#141414] text-[#ffffff] rounded-full px-1.5 py-0.2 text-[9px] font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown
              isOpen={showNotifDropdown}
              onClose={() => setShowNotifDropdown(false)}
              onNavigate={(href, title) => navigateGuarded(href, title)}
            />
          </div>

          {/* User Profile & Logout Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifDropdown(false);
                setShowLangDropdown(false);
              }}
              className="flex items-center gap-2 bg-[#f3f3f3] hover:bg-[#e0e0e0] rounded-full px-2.5 py-1 transition-colors shrink-0 cursor-pointer"
            >
              <EmployeePhotoAvatar
                name={displayName}
                email={displayEmail}
                role={effectiveProfile?.role}
                departmentId={resolvedScope.departmentId}
                size="xs"
                status="online"
              />
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-semibold text-[#141414] leading-tight truncate max-w-[110px] xl:max-w-[150px]">
                  {displayName}
                </div>
                <div className="hidden lg:block text-[10px] text-[#707070] font-medium truncate max-w-[110px] xl:max-w-[150px]">
                  {departmentDef.badgeText}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-[#707070]" />
            </button>

            {showUserDropdown && (
              <div className="fixed inset-x-3 top-[calc(var(--header-height,64px)+8px)] sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:left-0 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] sm:w-72 max-w-[calc(100vw-24px)] z-[350] p-3 space-y-1.5">
                <div className="p-3 bg-[#f3f3f3] rounded-[16px] mb-1 flex items-center gap-2.5">
                  <EmployeePhotoAvatar
                    name={displayName}
                    email={displayEmail}
                    role={effectiveProfile?.role}
                    departmentId={resolvedScope.departmentId}
                    size="md"
                    status="verified"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#141414] truncate">{displayName}</div>
                    <div className="text-[10.5px] text-[#707070] font-mono truncate">{displayEmail}</div>
                    <div className="pt-0.5 flex flex-wrap items-center gap-1">
                      <span className="px-2 py-0.5 bg-[#141414] text-[#ffffff] text-[10px] font-semibold rounded-full">
                        {companyMeta.nameAr}
                      </span>
                      <span className="px-2 py-0.5 bg-[#ffffff] text-[#141414] border border-[#e0e0e0] text-[10px] font-semibold rounded-full">
                        {departmentDef.nameAr}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full text-right px-3 py-2 rounded-[16px] text-xs hover:bg-[#f3f3f3] text-[#141414] font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-[#141414]" />
                  <span>بطاقة الموظف وصلاحيات القسم</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenAppLauncher();
                  }}
                  className="w-full text-right px-3 py-2 rounded-[16px] text-xs hover:bg-[#f3f3f3] text-[#707070] hover:text-[#141414] flex items-center gap-2 cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>مستكشف شاشات القسم</span>
                </button>

                {resolvedScope.departmentId === 'executive' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      navigateGuarded('iam', 'إدارة الهوية وصلاحيات الأقسام (IAM)');
                    }}
                    className="w-full text-right px-3 py-2 rounded-[16px] text-xs hover:bg-[#f3f3f3] text-[#141414] font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0066ff]" />
                    <span>إدارة الهوية وصلاحيات الأقسام (IAM)</span>
                  </button>
                )}

                <div className="border-t border-[#f0f0f0] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full text-right px-3 py-2.5 rounded-full text-xs bg-[#141414] hover:bg-[#262626] text-[#ffffff] flex items-center justify-center gap-2 font-semibold cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج والعودة لبوابة الدخول</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProductionDataHubModal
        isOpen={showDataHubModal}
        onClose={() => setShowDataHubModal(false)}
      />

      {/* Enterprise Live Error Monitor Global Modal */}
      {showErrorMonitorModal && (
        <div
          className="fixed inset-0 z-[2300] bg-[#141414]/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setShowErrorMonitorModal(false)}
          dir="rtl"
        >
          <div
            className="w-full max-w-6xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414]">
                  <Activity className="w-4 h-4 text-[#0066ff]" />
                </div>
                <span className="text-sm font-bold text-[#141414]">
                  مركز مراقبة وتشخيص الأخطاء المباشر والإصلاح الذاتي
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorMonitorModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#ffffff]">
              <EnterpriseErrorMonitorPanel
                onNavigate={(href, title) => {
                  setShowErrorMonitorModal(false);
                  navigateGuarded(href, title);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Employee Profile & Locked Department Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[500] bg-[#141414]/60 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] max-w-md w-full p-6 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div className="flex items-center gap-2.5">
                <EmployeePhotoAvatar
                  name={displayName}
                  email={displayEmail}
                  role={effectiveProfile?.role}
                  departmentId={resolvedScope.departmentId}
                  size="sm"
                  status="verified"
                />
                <h3 className="text-sm font-semibold text-[#141414] m-0">
                  بطاقة الهوية الوظيفية ونطاق القسم.
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-[16px] bg-[#f3f3f3] space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#e0e0e0]">
                <div className="flex items-center gap-2.5">
                  <EmployeePhotoAvatar
                    name={displayName}
                    email={displayEmail}
                    role={effectiveProfile?.role}
                    departmentId={resolvedScope.departmentId}
                    size="md"
                    status="online"
                  />
                  <div>
                    <div className="font-semibold text-[#141414] text-sm">{displayName}</div>
                    <div className="text-[11px] text-[#707070] font-medium">{departmentDef.badgeText}</div>
                  </div>
                </div>
                <BusinessIllustration
                  departmentId={resolvedScope.departmentId}
                  size="sm"
                  showBackground={false}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">اسم الموظف:</span>
                <span className="font-semibold text-[#141414]">{displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">البريد الوظيفي:</span>
                <span className="font-mono font-semibold text-[#141414]">{displayEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">الشركة التابع لها:</span>
                <span className="font-semibold text-[#141414]">
                  {companyMeta.nameAr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">القسم الوظيفي المختص:</span>
                <span className="font-semibold text-[#141414]">
                  {departmentDef.nameAr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">الفرع التشغيلي:</span>
                <span className="font-semibold text-[#141414]">{selectedBranch}</span>
              </div>
            </div>

            <div className="p-3 rounded-[16px] bg-[#f3f3f3] text-[11px] text-[#141414] flex items-start gap-2">
              <Lock className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
              <span>
                <strong>عزل الصلاحيات النشط:</strong> حسابك مقيد للعمل داخل ({departmentDef.nameAr}) في ({companyMeta.nameAr}) فقط وفق سياسة الحوكمة المؤسسية.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="mobbin-btn-primary flex-1"
              >
                العودة لبيئة العمل
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  if (onLogout) onLogout();
                }}
                className="mobbin-btn-outline px-4"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <UniversalDocumentExtractorModal
        isOpen={showUniversalExtractor}
        onClose={() => setShowUniversalExtractor(false)}
        defaultEntityKey="auto"
        onImportSuccess={() => {
          window.dispatchEvent(new CustomEvent('erp-data-updated'));
        }}
      />
    </>
  );
};
