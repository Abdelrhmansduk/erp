import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAppStore } from '../../stores/appStore';
import {
  authService,
   resolveDepartmentAndCompany,
} from '../../services/authService';
import { ProductionDataHubModal } from '../database/ProductionDataHubModal';
import { UniversalDocumentExtractorModal } from '../common/UniversalDocumentExtractorModal';
import { EnterpriseErrorMonitorPanel } from '../monitoring/EnterpriseErrorMonitorPanel';
import { errorMonitorService } from '../../services/errorMonitorService';
import { SIDEBAR_MENU } from '../../data/sidebarMenu';
import { SLUG_ARABIC_TITLES } from '../../data/slugArabicTitles';
import {
  Menu,
  Grid,
  Search,
  MapPin,
  ChevronDown,
  Check,
  X,
  Globe,
  Database,
  UploadCloud,
  Activity,
  Sparkles,
  Maximize2,
  Minimize2,
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
}) => {
  const { currentLanguage, availableLanguages, setLanguage, t } = useLanguage();
  const { user: authUser } = useAuthContext();
  const { impersonatedState, stopImpersonation } = useImpersonation();
  const { setQuickSearchOpen, activeTab, setActiveTab } = useAppStore();

  const parentSection = useMemo(() => {
    const targetSlug = (activeTab || 'dashboard').trim().toLowerCase();
    for (const section of SIDEBAR_MENU) {
      if (section.children?.some((c) => c.href === targetSlug || c.id === targetSlug)) {
        return section;
      }
    }
    return null;
  }, [activeTab]);

  const resolvedTabTitle = useMemo(() => {
    const targetSlug = (activeTab || activeTabTitle || 'dashboard').trim().toLowerCase();
    if (currentLanguage.code !== 'ar') {
      const translated = t(targetSlug, '');
      if (translated && translated !== targetSlug) {
        return translated;
      }
    }
    if (activeTabTitle && !/^[a-z0-9-_]+$/i.test(activeTabTitle)) {
      return activeTabTitle;
    }
    if (SLUG_ARABIC_TITLES[targetSlug]) {
      return SLUG_ARABIC_TITLES[targetSlug];
    }
    const findTitle = (items: typeof SIDEBAR_MENU): string | null => {
      for (const item of items) {
        if (item.href === targetSlug || item.id === targetSlug) return t(item.id, item.title);
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
      t('dashboard', 'لوحة المؤشرات التنفيذية')
    );
  }, [activeTabTitle, activeTab, currentLanguage.code, t]);

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

  const [selectedBranch, setSelectedBranch] = useState<string>(
    effectiveProfile?.branch || 'الفرع الرئيسي - الرياض'
  );
  const [showBranchDropdown, setShowBranchDropdown] = useState<boolean>(false);
  const [showLangDropdown, setShowLangDropdown] = useState<boolean>(false);
  const [showDataHubModal, setShowDataHubModal] = useState<boolean>(false);
  const [showErrorMonitorModal, setShowErrorMonitorModal] = useState<boolean>(false);
  const [openErrorCount, setOpenErrorCount] = useState<number>(
    () => errorMonitorService.getSystemHealthSummary().openIncidents
  );
  const [showUniversalExtractor, setShowUniversalExtractor] = useState<boolean>(false);
  const [langSearch, setLangSearch] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = React.useCallback(async () => {
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };

      const currentlyFull = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (!currentlyFull && !isFullscreen) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        document.documentElement.classList.add('erp-fullscreen-mode');
        setIsFullscreen(true);
      } else {
        if (doc.fullscreenElement && doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        document.documentElement.classList.remove('erp-fullscreen-mode');
        setIsFullscreen(false);
      }
    } catch {
      const next = !isFullscreen;
      document.documentElement.classList.toggle('erp-fullscreen-mode', next);
      setIsFullscreen(next);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(active);
      document.documentElement.classList.toggle('erp-fullscreen-mode', active);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F' || e.key === 'ب')) {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    const handleCustomToggle = () => {
      void toggleFullscreen();
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('erp-toggle-fullscreen', handleCustomToggle);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('erp-toggle-fullscreen', handleCustomToggle);
    };
  }, [toggleFullscreen]);

  useEffect(() => {
    if (effectiveProfile?.branch) {
      setSelectedBranch(effectiveProfile.branch);
    }
  }, [effectiveProfile?.branch]);

  useEffect(() => {
    const handleOpenDocExtractor = () => {
      setShowUniversalExtractor(true);
    };
    const handleSyncErrorMonitor = () => {
      setOpenErrorCount(errorMonitorService.getSystemHealthSummary().openIncidents);
    };
    const handleOpenErrorMonitor = () => {
      setShowErrorMonitorModal(true);
    };
    window.addEventListener('open-document-extractor', handleOpenDocExtractor);
    window.addEventListener('open-universal-extractor', handleOpenDocExtractor);
    window.addEventListener('erp-error-monitor-updated', handleSyncErrorMonitor);
    window.addEventListener('open-error-monitor', handleOpenErrorMonitor);
    return () => {
      window.removeEventListener('open-document-extractor', handleOpenDocExtractor);
      window.removeEventListener('open-universal-extractor', handleOpenDocExtractor);
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
      <header data-slot="header" className="h-16 bg-[#ffffff] border-b border-[#f0f0f0] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-[90] gap-4">
        {/* Right Section: Sidebar Toggle, App Launcher Pill, Branch Switcher, Active Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] flex items-center justify-center shrink-0 cursor-pointer transition-colors motion-spring-press"
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
            <span>{t('header.departmentScreens', 'شاشات القسم')}</span>
          </button>

          {/* Mobile & Tablet Active Screen Title (< 768px) */}
          <div className="block md:hidden min-w-0 flex-1 overflow-hidden">
            <h1 className="text-xs font-bold text-[#141414] m-0 truncate">
              {resolvedTabTitle}
            </h1>
          </div>

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
                  {t('header.operationalBranch', 'الفرع التشغيلي:')}
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

          <nav
            aria-label="Breadcrumb"
            className="hidden xl:flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden text-xs"
          >
            <button
              type="button"
              onClick={() => setActiveTab('dashboard', 'لوحة المؤشرات التنفيذية')}
              className="text-[#707070] hover:text-[#141414] font-medium shrink-0 cursor-pointer transition-colors"
            >
              الرئيسية
            </button>
            {parentSection && (
              <>
                <span className="text-[#d4d4d8] shrink-0">/</span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      parentSection.href || parentSection.children?.[0]?.href || 'dashboard',
                      parentSection.title
                    )
                  }
                  className="text-[#707070] hover:text-[#141414] font-medium truncate max-w-[180px] cursor-pointer transition-colors"
                  title={parentSection.title}
                >
                  {parentSection.title.replace(/^\d+\.\s*/, '')}
                </button>
              </>
            )}
            <span className="text-[#d4d4d8] shrink-0">/</span>
            <h1 className="text-xs font-bold text-[#141414] m-0 truncate" title={resolvedTabTitle}>
              {resolvedTabTitle}
            </h1>
          </nav>
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
              {openErrorCount > 0
                ? t('header.systemErrors', 'الأخطاء')
                : t('header.systemHealth', 'سلامة النظام')}
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
            <span className="hidden xl:inline">{t('header.docExtractor', 'مستخرج المستندات')}</span>
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
            <span className="hidden 2xl:inline">{t('header.aiAdvisor', 'فارس ونُورة')}</span>
          </button>

          {/* Language Selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowLangDropdown(!showLangDropdown);
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
                    <span>{t('header.officialLanguages', 'لغات النظام الرسمية')}</span>
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
                    placeholder={t('header.searchLanguage', 'ابحث عن لغة...')}
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    className="w-full bg-[#f0f0f0] rounded-[16px] pr-8 pl-3 py-1.5 text-xs text-[#141414] outline-none"
                  />
                </div>

                <div data-no-translate="true" className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
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

          {/* Fullscreen / Screen Maximize Toggle Button */}
          <button
            type="button"
            data-slot="fullscreen-toggle-btn"
            className={`px-2.5 h-9 rounded-full border flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 ${
              isFullscreen
                ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border-[#e0e0e0]'
            }`}
            onClick={() => void toggleFullscreen()}
            title={isFullscreen ? 'تصغير الشاشة (Alt + F / Esc)' : 'تكبير الشاشة - ملء الشاشة (Alt + F)'}
            aria-label={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 shrink-0" />
            ) : (
              <Maximize2 className="w-4 h-4 shrink-0" />
            )}
            <span className="hidden xl:inline">
              {isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة'}
            </span>
          </button>

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
                  <Activity className="w-4 h-4 text-[#141414]" />
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
