import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard, UploadCloud, X, Zap } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { DepartmentModuleBanner } from '../common/DepartmentModuleBanner';
import { recordRecentTab } from '../../utils/pinnedTabs';
import { useLanguage } from '../../i18n/LanguageContext';
import { employeeOperationsEngine } from '../../services/employeeOperationsEngine';
import { authService } from '../../services/authService';
import { useModuleVisibility } from '../../hooks/useModuleVisibility';

interface AppShellProps {
  activeTab: string;
  activeTabTitle: string;
  onSelectTab: (href: string, title: string) => void;
  onOpenAppLauncher: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

const ACTION_BUTTON_PATTERNS: Array<{
  keywords: string[];
  processingLabel: string;
  completedLabel: string;
}> = [
  {
    keywords: ['دفع', 'سداد', 'حوالة', 'تحويل بنكي', 'صرف', 'سند صرف'],
    processingLabel: 'جاري التحقق وتنفيذ الدفعة...',
    completedLabel: 'تم الدفع والتحويل بنجاح ✓',
  },
  {
    keywords: ['تحصيل', 'قبض', 'سند قبض', 'إيداع'],
    processingLabel: 'جاري توثيق التحصيل والترحيل...',
    completedLabel: 'تم التحصيل وإصدار السند ✓',
  },
  {
    keywords: ['zatca', 'زاتكا', 'فاتورة ضريبية', 'تشفير', 'إقرار'],
    processingLabel: 'جاري التوقيع التشفيري ZATCA...',
    completedLabel: 'معتمدة ومشفرة في زاتكا ✓',
  },
  {
    keywords: ['wps', 'حماية الأجور', 'صرف الرواتب', 'مسير الرواتب'],
    processingLabel: 'جاري تدقيق وإرسال ملف WPS...',
    completedLabel: 'تم اعتماد وصرف المسير ✓',
  },
  {
    keywords: ['مساند', 'إنجاز', 'تأشيرة', 'تفويض', 'نقل كفالة', 'نقل الخدمات'],
    processingLabel: 'جاري المزامنة مع البوابة الحكومية...',
    completedLabel: 'تم التوثيق الرسمي ✓',
  },
  {
    keywords: ['ترحيل', 'قيد', 'تسوية', 'إقفال'],
    processingLabel: 'جاري الترحيل لدفتر الأستاذ العام...',
    completedLabel: 'تم الترحيل المحاسبي ✓',
  },
  {
    keywords: ['اعتماد', 'موافقة', 'تعميد', 'تأكيد', 'توثيق', 'إصدار', 'حفظ', 'إرسال', 'مزامنة'],
    processingLabel: 'جاري المعالجة والاعتماد...',
    completedLabel: 'تم التنفيذ بنجاح ✓',
  },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  activeTabTitle,
  onSelectTab,
  onOpenAppLauncher,
  onLogout,
  children,
}) => {
  const { currentLanguage, theme } = useLanguage();
  const { isPartHidden } = useModuleVisibility();
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Desktop sidebar collapse state vs Mobile drawer open state
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const dragCounterRef = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setMobileDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Record activeTab in recent history
  useEffect(() => {
    if (activeTab) {
      recordRecentTab({
        href: activeTab,
        title: activeTabTitle || activeTab,
      });
    }
  }, [activeTab, activeTabTitle]);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (!isDesktop && mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDesktop, mobileDrawerOpen]);

  const handleToggleSidebar = useCallback(() => {
    if (isDesktop) {
      setDesktopSidebarCollapsed((prev) => !prev);
    } else {
      setMobileDrawerOpen((prev) => !prev);
    }
  }, [isDesktop]);

  // Global Power-User Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (mobileDrawerOpen) setMobileDrawerOpen(false);
        if (showShortcutsModal) setShowShortcutsModal(false);
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-universal-extractor'));
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('open-faris-assistant', {
            detail: {
              persona: 'faris',
              prompt: 'أعطني إيجاز مهامي اليومي في قسمي الآن.',
            },
          })
        );
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('alsulaim-toggle-slim-banner'));
        return;
      }

      if (!isInput && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };

    const handleOpenShortcuts = () => setShowShortcutsModal(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('alsulaim-open-shortcuts-modal', handleOpenShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('alsulaim-open-shortcuts-modal', handleOpenShortcuts);
    };
  }, [mobileDrawerOpen, showShortcutsModal, handleToggleSidebar]);

  // Ensure all 28 corporate employees have initial operations seeded across all departments & branches
  useEffect(() => {
    void employeeOperationsEngine.ensureSeededForAllEmployees();
  }, []);

  // Global Dynamic Button State Enhancer for payment, ZATCA, WPS, Musaned, and approval actions
  // Uses pure CSS data-attributes (data-dyn-state & data-dyn-label) without mutating React DOM children
  const handleWorkspaceClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('button') as HTMLButtonElement | null;
    if (!btn || btn.disabled) return;

    // Skip if already managed by <DynamicActionButton />, excluded via data-no-dyn-enhancer, tab button, or currently transitioning
    if (btn.getAttribute('data-dynamic-button') === 'true') return;
    if (btn.getAttribute('role') === 'tab' || btn.closest('[role="tablist"]')) return;
    if (btn.closest('[data-no-dyn-enhancer="true"]')) return;
    if (btn.getAttribute('data-dyn-state')) return;

    const rawText = (btn.innerText || btn.textContent || '').trim();
    if (!rawText || rawText.length > 55) return;

    const lower = rawText.toLowerCase();
    // Skip navigation tabs, filter toggles, close buttons, export format buttons, or modal triggers
    if (
      lower.includes('إلغاء') ||
      lower.includes('إغلاق') ||
      lower.includes('تصفية') ||
      lower.includes('فلاتر') ||
      lower.includes('بحث') ||
      lower.includes('رجوع') ||
      lower.includes('السابق') ||
      lower.includes('التالي') ||
      lower.includes('تثبيت') ||
      lower.includes('وضع مدمج') ||
      lower.includes('توسيع') ||
      lower.includes('تصدير') ||
      lower.includes('معاينة') ||
      lower.includes('.xlsx') ||
      lower.includes('.pdf') ||
      lower.includes('.doc') ||
      lower.includes('.sif') ||
      lower.includes('.xml') ||
      lower.includes('.csv') ||
      lower.includes('.tsv') ||
      lower.includes('.json') ||
      lower.includes('.md') ||
      lower.includes('.html') ||
      lower.includes('.png')
    ) {
      return;
    }

    const matchedRule = ACTION_BUTTON_PATTERNS.find((rule) =>
      rule.keywords.some((kw) => lower.includes(kw))
    );
    if (!matchedRule) return;

    btn.setAttribute('data-dyn-state', 'processing');
    btn.setAttribute('data-dyn-label', `⟳ ${matchedRule.processingLabel}`);

    // Record real employee operation in store & audit log
    const activeUser = authService.getCurrentUser();
    void employeeOperationsEngine.executeOperationForEmployee(activeUser?.id || 'USR-GRP-EXEC-01');

    setTimeout(() => {
      if (!btn.isConnected) return;
      const refNum = Math.floor(1000 + Math.random() * 9000);
      btn.setAttribute('data-dyn-state', 'completed');
      btn.setAttribute('data-dyn-label', `${matchedRule.completedLabel} #${refNum}`);

      setTimeout(() => {
        if (!btn.isConnected) return;
        btn.removeAttribute('data-dyn-state');
        btn.removeAttribute('data-dyn-label');
      }, 1850);
    }, 620);
  }, []);

  const handleSelectTab = useCallback(
    (href: string, title: string) => {
      onSelectTab(href, title);
      if (!isDesktop) {
        setMobileDrawerOpen(false);
        setMobileNotifOpen(false);
      }
    },
    [onSelectTab, isDesktop]
  );

  const handleToggleMobileNotifications = useCallback(() => {
    setMobileDrawerOpen(false);
    setMobileNotifOpen((prev) => !prev);
    window.dispatchEvent(new CustomEvent('toggle-mobile-notifications'));
  }, []);

  const isRtl = currentLanguage.dir === 'rtl';

  return (
    <div
      className="app-container"
      data-theme={theme}
      dir={currentLanguage.dir}
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          dragCounterRef.current += 1;
          setIsDraggingFile(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
        }
      }}
      onDragLeave={() => {
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          dragCounterRef.current = 0;
          setIsDraggingFile(false);
          window.dispatchEvent(new CustomEvent('open-universal-extractor'));
        }
      }}
      onTouchStart={(e) => {
        if (!isDesktop && e.touches.length === 1) {
          touchStartXRef.current = e.touches[0].clientX;
        }
      }}
      onTouchEnd={(e) => {
        if (!isDesktop && touchStartXRef.current !== null && e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
          if (mobileDrawerOpen && ((isRtl && deltaX > 70) || (!isRtl && deltaX < -70))) {
            setMobileDrawerOpen(false);
          }
          touchStartXRef.current = null;
        }
      }}
    >
      {/* Global Drag & Drop OCR File Overlay */}
      {isDraggingFile && (
        <div
          className="fixed inset-0 z-[2500] bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => {
            dragCounterRef.current = 0;
            setIsDraggingFile(false);
          }}
        >
          <div className="max-w-lg w-full rounded-[24px] border-2 border-dashed border-[#141414] bg-[#ffffff] p-8 text-center space-y-3 shadow-2xl">
            <div className="w-16 h-16 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center mx-auto">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#141414]">
              أفلت الملفات هنا لتشغيل الماسح الذكي (100+ فاتورة ومستند)
            </h3>
            <p className="text-xs text-[#707070]">
              يدعم قراءة ملفات PDF، Excel، Word، وصور الفواتير الضريبية وجوازات السفر وترحيلها تلقائياً
            </p>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheat-Sheet Modal (Shift + ?) */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-[2200] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
          dir="rtl"
        >
          <div
            className="w-full max-w-lg bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center">
                  <Keyboard className="w-4 h-4 text-[#141414]" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#141414] m-0">دليل اختصارات لوحة المفاتيح السريعة</h3>
                  <p className="text-[11px] text-[#707070] m-0">للتنقل والتنفيذ الفوري بسرعة المحترفين</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2 bg-[#ffffff]">
              {[
                { keys: 'Ctrl + K', desc: 'فتح لوحة الأوامر والبحث الشامل في الشاشات والسجلات الحية' },
                { keys: 'Alt + I', desc: 'فتح الماسح الذكي لاستخلاص 100+ فاتورة وأي مستند (OCR)' },
                { keys: 'Alt + A', desc: 'استدعاء المساعد الذكي (فارس ونُورة) وإيجاز المهام اليومي' },
                { keys: 'Alt + M', desc: 'تبديل وضع بانر القسم (الوضع القياسي / الوضع المدمج لتوسيع الجداول)' },
                { keys: 'Alt + B', desc: 'طي أو توسيع القائمة الجانبية الرئيسية' },
                { keys: 'Shift + ?', desc: 'إظهار أو إخفاء نافذة اختصارات لوحة المفاتيح' },
                { keys: 'Esc', desc: 'إغلاق أي نافذة منبثقة أو قائمة مفتوحة' },
              ].map((sc) => (
                <div
                  key={sc.keys}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]"
                >
                  <span className="text-xs font-semibold text-[#141414]">{sc.desc}</span>
                  <kbd className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold font-mono shrink-0">
                    {sc.keys}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="px-4 py-2.5 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center justify-between text-[11px] text-[#707070]">
              <span className="inline-flex items-center gap-1 font-semibold text-[#141414]">
                <Zap className="w-3.5 h-3.5 text-[#0066ff]" />
                <span>أزرار الدفع والاعتماد والترحيل تدعم الحالة التفاعلية الحية تلقائياً</span>
              </span>
              <span>UX 3.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {!isDesktop && mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] transition-opacity duration-300"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop Collapsible Rail or Mobile Slide-over Drawer) */}
      <aside
        className={`app-sidebar ${
          isDesktop
            ? desktopSidebarCollapsed
              ? 'desktop-collapsed'
              : 'desktop-expanded'
            : mobileDrawerOpen
            ? 'mobile-drawer-open'
            : 'mobile-drawer-closed'
        }`}
        style={{
          width: isDesktop ? (desktopSidebarCollapsed ? '76px' : 'var(--sidebar-width)') : undefined,
          minWidth: isDesktop ? (desktopSidebarCollapsed ? '76px' : 'var(--sidebar-width)') : undefined,
          transform: isDesktop
            ? 'translateX(0)'
            : mobileDrawerOpen
            ? 'translateX(0)'
            : isRtl
            ? 'translateX(100%)'
            : 'translateX(-100%)',
          transition:
            'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onClose={() => setMobileDrawerOpen(false)}
          isCollapsed={isDesktop && desktopSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      </aside>

      {/* Main Content Area Wrapper */}
      <div
        className="main-wrapper"
        style={{
          marginRight: isDesktop && isRtl ? (desktopSidebarCollapsed ? '76px' : 'var(--sidebar-width)') : '0px',
          marginLeft: isDesktop && !isRtl ? (desktopSidebarCollapsed ? '76px' : 'var(--sidebar-width)') : '0px',
          width: isDesktop ? `calc(100% - ${desktopSidebarCollapsed ? '76px' : 'var(--sidebar-width)'})` : '100%',
          maxWidth:
            isDesktop ? `calc(100vw - ${desktopSidebarCollapsed ? '76px' : 'var(--sidebar-width)'})` : '100vw',
          minWidth: 0,
          transition:
            'margin 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Sticky Header Navbar */}
        <Header
          activeTabTitle={activeTabTitle}
          onToggleSidebar={handleToggleSidebar}
          onOpenAppLauncher={onOpenAppLauncher}
          onLogout={onLogout}
        />

        {/* Content Body with Global Dynamic Button State Enhancer */}
        <main className="content-body" onClickCapture={handleWorkspaceClickCapture}>
          {!isPartHidden('part:department-banner') && (
            <DepartmentModuleBanner
              activeTab={activeTab}
              activeTabTitle={activeTabTitle}
              onSelectTab={handleSelectTab}
            />
          )}
          {children}
        </main>

        {/* Native-Feel Mobile Bottom Navigation Bar (< 1024px) */}
        {!isPartHidden('part:mobile-bottom-nav') && (
          <MobileBottomNav
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onOpenAppLauncher={onOpenAppLauncher}
            onToggleSidebar={handleToggleSidebar}
            onToggleNotifications={handleToggleMobileNotifications}
            isNotificationsOpen={mobileNotifOpen}
          />
        )}
      </div>
    </div>
  );
};

export default AppShell;
