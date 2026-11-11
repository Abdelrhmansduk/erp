import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Star,
  Clock,
  Zap,
  ArrowUpLeft,
  UploadCloud,
  Keyboard,
  FileText,
  Users,
  Briefcase,
  Receipt,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useModuleVisibility } from '../../hooks/useModuleVisibility';
import { authService } from '../../services/authService';
import { BusinessIllustration } from './BusinessIllustration';
import { CorporateAvatar } from './CorporateAvatar';
import { resolveIllustrationForTab } from '../../services/visualAssetsRegistry';

import {
  getPinnedTabs,
  togglePinnedTab,
  getRecentTabs,
  recordRecentTab,
  type PinnedTabItem,
} from '../../utils/pinnedTabs';

interface QuickSearchModalProps {
  onNavigate: (href: string, title: string) => void;
}

type CommandCategoryFilter = 'all' | 'screens' | 'records' | 'actions';

interface UnifiedCommandItem {
  id: string;
  title: string;
  subtitle: string;
  href?: string;
  kind: 'screen' | 'record' | 'action';
  badge?: string;
  personName?: string;
  personRole?: string;
  onExecute?: () => void;
}

function maskSensitiveValue(value: string): string {
  const clean = (value || '').trim();
  if (!clean) return '—';
  if (clean.length <= 4) return '••••';
  return `${clean.slice(0, 3)}${'•'.repeat(Math.min(5, Math.max(3, clean.length - 5)))}${clean.slice(-2)}`;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ onNavigate }) => {
  const { isQuickSearchOpen, setQuickSearchOpen } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommandCategoryFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pinnedTabs, setPinnedTabs] = useState<PinnedTabItem[]>(() => getPinnedTabs());
  const [recentTabs, setRecentTabs] = useState<PinnedTabItem[]>(() => getRecentTabs());
  const inputRef = useRef<HTMLInputElement>(null);
  const { visibleMenu } = useModuleVisibility();
  const currentUser = authService.getCurrentUser();
  const isAdminUser = authService.isAdmin(currentUser);
  const userCompanyUpper = (currentUser?.company_id || '').toUpperCase();

  // Flatten sidebar menu into searchable screens strictly authorized for the current user & company
  const allScreenItems = useMemo<UnifiedCommandItem[]>(() => {
    const list: UnifiedCommandItem[] = [];
    const seenHrefs = new Set<string>();

    const canAccessItem = (href?: string, exclusiveToCompany?: string) => {
      if (!href) return false;
      if (exclusiveToCompany && !isAdminUser && userCompanyUpper !== exclusiveToCompany.toUpperCase()) {
        return false;
      }
      return authService.isTabAuthorizedForUser(currentUser, href);
    };

    visibleMenu.forEach((section) => {
      if (section.href && canAccessItem(section.href, section.exclusiveToCompany) && !seenHrefs.has(section.href)) {
        seenHrefs.add(section.href);
        list.push({
          id: `screen-${section.id}`,
          title: section.title,
          subtitle: 'القسم الرئيسي',
          href: section.href,
          kind: 'screen',
          badge: `#${section.href}`,
        });
      }
      if (section.children) {
        section.children.forEach((item) => {
          if (item.href && canAccessItem(item.href, item.exclusiveToCompany) && !seenHrefs.has(item.href)) {
            seenHrefs.add(item.href);
            list.push({
              id: `screen-${item.id}`,
              title: item.title,
              subtitle: section.title,
              href: item.href,
              kind: 'screen',
              badge: `#${item.href}`,
            });
          }
          if (item.children) {
            item.children.forEach((subItem) => {
              if (
                subItem.href &&
                canAccessItem(subItem.href, subItem.exclusiveToCompany) &&
                !seenHrefs.has(subItem.href)
              ) {
                seenHrefs.add(subItem.href);
                list.push({
                  id: `screen-${subItem.id}`,
                  title: `${item.title} › ${subItem.title}`,
                  subtitle: section.title,
                  href: subItem.href,
                  kind: 'screen',
                  badge: `#${subItem.href}`,
                });
              }
            });
          }
        });
      }
    });

    if (currentUser && !seenHrefs.has('profile')) {
      list.push({
        id: 'screen-self-service',
        title: 'بوابة الخدمة الذاتية للموظف',
        subtitle: 'الملف الوظيفي وطلبات الإجازات والتعريف بالراتب',
        href: 'profile',
        kind: 'screen',
        badge: '#profile',
      });
    }

    return list;
  }, [visibleMenu, currentUser, isAdminUser, userCompanyUpper]);

  // Quick Executive Actions (strictly filtered by user RBAC)
  const quickActionItems = useMemo<UnifiedCommandItem[]>(() => {
    const rawActions: Array<UnifiedCommandItem & { requiredHref?: string }> = [
      {
        id: 'act-ocr-extractor',
        title: 'فتح الماسح الذكي لاستخلاص 100+ فاتورة وأي مستند (OCR)',
        subtitle: 'قراءة ملفات PDF وExcel وWord وصور الفواتير وترحيلها لدفتر الأستاذ العام',
        kind: 'action',
        badge: 'Alt + I',
        requiredHref: 'universal-extractor',
        onExecute: () => {
          window.dispatchEvent(new CustomEvent('open-universal-extractor'));
        },
      },
      {
        id: 'act-faris-briefing',
        title: 'طلب إيجاز المهام اليومي من المساعد الذكي (فارس ونُورة)',
        subtitle: 'تحليل فوري للمؤشرات المالية والتشغيلية والمهام العاجلة لقسمك',
        kind: 'action',
        badge: 'Alt + A',
        onExecute: () => {
          window.dispatchEvent(
            new CustomEvent('open-faris-assistant', {
              detail: {
                persona: 'faris',
                prompt: 'أعطني إيجاز مهامي اليومي وأهم الأولويات التنفيذية في قسمي الآن.',
              },
            })
          );
        },
      },
      {
        id: 'act-new-zatca',
        title: 'إصدار فاتورة ضريبية إلكترونية (ZATCA المرحلة الثانية)',
        subtitle: 'الانتقال المباشر لمنظومة الفوترة الإلكترونية والربط مع فاتورة',
        href: 'zatca',
        requiredHref: 'zatca',
        kind: 'action',
        badge: 'ZATCA XML',
      },
      {
        id: 'act-new-musaned',
        title: 'إنشاء عقد استقدام جديد موثق (مساند)',
        subtitle: 'فتح شاشة عقود الاستقدام وتوليد عقد مساند وربطه بالعميل',
        href: 'recruitment-contracts',
        requiredHref: 'recruitment-contracts',
        kind: 'action',
        badge: 'مساند',
      },
      {
        id: 'act-new-cv',
        title: 'إضافة سيرة ذاتية جديدة / استخلاص جواز سفر مرشح',
        subtitle: 'فتح معالج إنشاء السيرة الذاتية مع المعاينة الحية للأفاتار',
        href: 'create-cv',
        requiredHref: 'create-cv',
        kind: 'action',
        badge: 'ATS',
      },
      {
        id: 'act-shortcuts',
        title: 'عرض دليل اختصارات لوحة المفاتيح السريعة',
        subtitle: 'قائمة كافة اختصارات المحترفين للتنقل والتنفيذ السريع',
        kind: 'action',
        badge: 'Shift + ?',
        onExecute: () => {
          window.dispatchEvent(new CustomEvent('alsulaim-open-shortcuts-modal'));
        },
      },
    ];

    return rawActions.filter(
      (act) => !act.requiredHref || authService.isTabAuthorizedForUser(currentUser, act.requiredHref)
    );
  }, [currentUser]);

  // Search Live ERP Records from localStorage — strictly isolated by Company + Department + PDPL PII Masking
  const liveRecordItems = useMemo<UnifiedCommandItem[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2 || !currentUser) return [];
    const results: UnifiedCommandItem[] = [];

    const readTable = (tableKey: string): any[] => {
      try {
        const raw = localStorage.getItem(`ALSULAIM_ERP_DB_V1_${tableKey}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const matchesCompanyScope = (row: Record<string, any>): boolean => {
      if (isAdminUser || userCompanyUpper === 'ALL') {
        // Non-KAS group staff still must NEVER see KAS Trade records and vice versa
        const rowComp = String(row.company_id || row.companyId || '').toUpperCase();
        if (!isAdminUser && rowComp === 'KAS' && userCompanyUpper !== 'KAS') return false;
        return true;
      }
      const rowComp = String(row.company_id || row.companyId || '').toUpperCase();
      if (!rowComp) return userCompanyUpper !== 'KAS';
      return rowComp === userCompanyUpper;
    };

    // 0. KAS Commercial Trade Deals (strictly for KAS Trade Company / Admin)
    if (authService.isTabAuthorizedForUser(currentUser, 'kas-commercial')) {
      readTable('kas_commercial_deals').forEach((deal) => {
        const ref = String(deal.reference_no || deal.id || '');
        const client = String(deal.client_name || '');
        const item = String(deal.item_description || '');
        if (
          ref.toLowerCase().includes(q) ||
          client.toLowerCase().includes(q) ||
          item.toLowerCase().includes(q)
        ) {
          results.push({
            id: `rec-kas-deal-${deal.id}`,
            title: `عقد تجاري (${deal.division || 'كاس'}): ${client}`,
            subtitle: `المرجع: ${ref} • الإجمالي: ${Number(deal.total_with_vat || 0).toLocaleString()} ⃁`,
            href: 'kas-commercial',
            kind: 'record',
            badge: 'كاس للتجارة',
            personName: client,
            personRole: deal.division || 'عميل تجاري',
          });
        }
      });
    }

    // 1. Clients (only if user is authorized for `clients` — NEVER KAS Trade)
    if (authService.isTabAuthorizedForUser(currentUser, 'clients')) {
      readTable('clients').forEach((c) => {
        if (!matchesCompanyScope(c)) return;
        const name = String(c.name || c.full_name || '');
        const phone = String(c.phone || c.mobile || '');
        const natId = String(c.national_id || c.id_number || '');
        if (
          name.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          natId.toLowerCase().includes(q)
        ) {
          results.push({
            id: `rec-client-${c.id}`,
            title: `عميل: ${name}`,
            subtitle: `هوية: ${maskSensitiveValue(natId)} • جوال: ${maskSensitiveValue(phone)} • ${c.city || 'الرياض'}`,
            href: 'clients',
            kind: 'record',
            badge: 'سجل العملاء CRM',
            personName: name,
            personRole: 'عميل معتمد',
          });
        }
      });
    }

    // 2. Recruitment Contracts (only if user is authorized for `recruitment-contracts` — NEVER KAS Trade)
    if (authService.isTabAuthorizedForUser(currentUser, 'recruitment-contracts')) {
      readTable('recruitment_contracts').forEach((rc) => {
        if (!matchesCompanyScope(rc)) return;
        const num = String(rc.contract_number || rc.id || '');
        const client = String(rc.client_name || '');
        const worker = String(rc.worker_name || rc.maid_name || '');
        if (
          num.toLowerCase().includes(q) ||
          client.toLowerCase().includes(q) ||
          worker.toLowerCase().includes(q)
        ) {
          results.push({
            id: `rec-contract-${rc.id}`,
            title: `عقد استقدام #${num} — ${client}`,
            subtitle: `العاملة: ${worker || '—'} • الدولة: ${rc.country || '—'} • الحالة: ${rc.status || 'نشط'}`,
            href: 'recruitment-contracts',
            kind: 'record',
            badge: 'عقود مساند',
            personName: client || worker,
            personRole: rc.profession || 'عقد استقدام',
          });
        }
      });
    }

    // 3. Candidate CVs (only if user is authorized for `cvs-recruitment` — NEVER KAS Trade)
    if (authService.isTabAuthorizedForUser(currentUser, 'cvs-recruitment')) {
      readTable('cvs').forEach((cv) => {
        if (!matchesCompanyScope(cv)) return;
        const name = String(cv.full_name || cv.name || '');
        const pass = String(cv.passport_number || '');
        const job = String(cv.job_title || cv.profession || '');
        if (
          name.toLowerCase().includes(q) ||
          pass.toLowerCase().includes(q) ||
          job.toLowerCase().includes(q)
        ) {
          results.push({
            id: `rec-cv-${cv.id}`,
            title: `سيرة ذاتية: ${name}`,
            subtitle: `المهنة: ${job || 'عاملة منزلية'} • الجواز: ${maskSensitiveValue(pass)} • الجنسية: ${cv.nationality || '—'}`,
            href: 'cvs-recruitment',
            kind: 'record',
            badge: 'بنك السير ATS',
            personName: name,
            personRole: job || 'عاملة منزلية',
          });
        }
      });
    }

    // 4. Employees (only if user is authorized for `employees`)
    if (authService.isTabAuthorizedForUser(currentUser, 'employees')) {
      readTable('employees').forEach((emp) => {
        if (!matchesCompanyScope(emp)) return;
        const name = String(emp.name || emp.full_name || '');
        const role = String(emp.job_title || emp.position || emp.department || '');
        if (name.toLowerCase().includes(q) || role.toLowerCase().includes(q)) {
          results.push({
            id: `rec-emp-${emp.id}`,
            title: `موظف: ${name}`,
            subtitle: `المسمى: ${role || '—'} • القسم: ${emp.department || '—'}`,
            href: 'employees',
            kind: 'record',
            badge: 'الموارد البشرية HR',
            personName: name,
            personRole: role || 'موظف',
          });
        }
      });
    }

    // 5. ZATCA Invoices (only if user is authorized for `zatca` AND company matches)
    if (authService.isTabAuthorizedForUser(currentUser, 'zatca')) {
      readTable('zatca_invoices').forEach((inv) => {
        if (!matchesCompanyScope(inv)) return;
        const num = String(inv.invoice_number || inv.id || '');
        const client = String(inv.client_name || inv.customer || '');
        if (num.toLowerCase().includes(q) || client.toLowerCase().includes(q)) {
          results.push({
            id: `rec-inv-${inv.id}`,
            title: `فاتورة ضريبية #${num} — ${client}`,
            subtitle: `الإجمالي: ${inv.total_amount || inv.total || ''} ⃁ • الحالة: ${inv.status || 'معتمدة ZATCA'}`,
            href: 'zatca',
            kind: 'record',
            badge: 'فاتورة ZATCA',
            personName: client,
            personRole: 'عميل فاتورة ضريبية',
          });
        }
      });
    }

    return results.slice(0, 10);
  }, [searchTerm, currentUser, isAdminUser, userCompanyUpper]);

  const filteredItems = useMemo<UnifiedCommandItem[]>(() => {
    const q = searchTerm.trim().toLowerCase();

    const matchedScreens =
      q === ''
        ? allScreenItems.slice(0, 8)
        : allScreenItems.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.subtitle.toLowerCase().includes(q) ||
              (a.href && a.href.toLowerCase().includes(q))
          );

    const matchedActions =
      q === ''
        ? quickActionItems
        : quickActionItems.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.subtitle.toLowerCase().includes(q)
          );

    if (categoryFilter === 'screens') return matchedScreens.slice(0, 18);
    if (categoryFilter === 'records') return liveRecordItems;
    if (categoryFilter === 'actions') return matchedActions;

    if (q === '') {
      return [...matchedActions.slice(0, 4), ...matchedScreens.slice(0, 8)];
    }

    return [
      ...matchedActions.slice(0, 4),
      ...liveRecordItems.slice(0, 6),
      ...matchedScreens.slice(0, 10),
    ];
  }, [searchTerm, categoryFilter, allScreenItems, quickActionItems, liveRecordItems]);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen(!isQuickSearchOpen);
      }
      if (e.key === 'Escape' && isQuickSearchOpen) {
        setQuickSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickSearchOpen, setQuickSearchOpen]);

  useEffect(() => {
    if (isQuickSearchOpen) {
      setPinnedTabs(getPinnedTabs());
      setRecentTabs(getRecentTabs());
      setTimeout(() => inputRef.current?.focus(), 40);
      setSelectedIndex(0);
    }
  }, [isQuickSearchOpen]);

  if (!isQuickSearchOpen) return null;

  const handleExecuteItem = (item: UnifiedCommandItem) => {
    if (item.onExecute) {
      item.onExecute();
      setQuickSearchOpen(false);
      setSearchTerm('');
      return;
    }
    if (item.href) {
      recordRecentTab({ href: item.href, title: item.title, category: item.subtitle });
      onNavigate(item.href, item.title);
      setQuickSearchOpen(false);
      setSearchTerm('');
    }
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleExecuteItem(filteredItems[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#141414]/60 backdrop-blur-xs z-[2000] flex items-start justify-center pt-12 sm:pt-16 p-3 sm:p-4"
      onClick={() => setQuickSearchOpen(false)}
      dir="rtl"
    >
      <div
        className="w-full max-w-3xl bg-[#ffffff] rounded-[24px] shadow-2xl border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Command Input Bar — Mobbin Light Mode */}
        <div className="p-3.5 sm:p-4 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-[#141414]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInInput}
            placeholder={
              userCompanyUpper === 'KAS'
                ? 'ابحث في منظومة شركة كاس للتجارة: المعارض، الأميال، المنافسات، الموردين، أو فواتير ZATCA... (Ctrl + K)'
                : 'ابحث عن أي شاشة، عميل، عقد مساند، سيرة ذاتية، فاتورة ZATCA، أو أمر سريع... (Ctrl + K)'
            }
            className="flex-1 text-[#141414] text-sm sm:text-base placeholder-[#707070] outline-none bg-transparent font-semibold"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-xs text-[#141414] font-semibold cursor-pointer"
            >
              مسح
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-bold text-[#707070] bg-[#f3f3f3] border border-[#e0e0e0] rounded-full">
            ESC للإغلاق
          </kbd>
        </div>

        {/* Category Filter Tabs + Pinned / Recent Chips */}
        <div className="px-4 py-2.5 bg-[#ffffff] border-b border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', label: 'الكل', icon: Sparkles },
                { id: 'screens', label: `الشاشات (${allScreenItems.length})`, icon: Briefcase },
                { id: 'records', label: `السجلات الحية (${liveRecordItems.length})`, icon: Users },
                { id: 'actions', label: 'أوامر تنفيذية ', icon: Zap },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCategoryFilter(tab.id);
                    setSelectedIndex(0);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-semibold text-[#707070] hidden md:inline">
            اكتب اسم العميل أو رقم العقد للبحث الفوري في قاعدة البيانات
          </span>
        </div>

        {/* Pinned Favorites & Recent Visited Strip (shown when searchTerm is empty & authorized) */}
        {(() => {
          const authPinned = pinnedTabs.filter((p) => authService.isTabAuthorizedForUser(currentUser, p.href));
          const authRecent = recentTabs.filter((r) => authService.isTabAuthorizedForUser(currentUser, r.href));
          if (searchTerm.trim() !== '' || (authPinned.length === 0 && authRecent.length === 0)) {
            return null;
          }
          return (
            <div className="px-4 py-2.5 bg-[#f3f3f3] border-b border-[#e5e5e5] space-y-2">
              {authPinned.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141414] shrink-0 pl-2">
                    <Star className="w-3.5 h-3.5 fill-[#141414] text-[#141414]" />
                    <span>المفضلة المثبتة:</span>
                  </span>
                  {authPinned.map((pin) => (
                    <button
                      key={pin.href}
                      type="button"
                      onClick={() => {
                        onNavigate(pin.href, pin.title);
                        setQuickSearchOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#ffffff] hover:bg-[#262626] hover:text-[#ffffff] border border-[#e0e0e0] text-[11px] font-semibold transition-all shrink-0 cursor-pointer"
                    >
                      {pin.title}
                    </button>
                  ))}
                </div>
              )}

              {authRecent.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#707070] shrink-0 pl-2">
                    <Clock className="w-3.5 h-3.5 text-[#707070]" />
                    <span>زرتها مؤخراً:</span>
                  </span>
                  {authRecent.map((rec) => (
                    <button
                      key={rec.href}
                      type="button"
                      onClick={() => {
                        onNavigate(rec.href, rec.title);
                        setQuickSearchOpen(false);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold transition-all shrink-0 cursor-pointer"
                    >
                      {rec.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Unified Results List */}
        <div className="max-h-[55vh] overflow-y-auto p-2.5 space-y-1.5 bg-[#ffffff]">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <BusinessIllustration type="empty-search" size="sm" className="mx-auto mb-3" />
              <p className="text-sm font-bold text-[#141414]">
                لا توجد شاشات أو سجلات مطابقة لـ "{searchTerm}"
              </p>
              <p className="text-xs text-[#707070] mt-1">
                جرّب البحث باسم العميل، رقم الهوية، اسم العاملة، أو اسأل المساعد الذكي فارس مباشرةً
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuickSearchOpen(false);
                  window.dispatchEvent(
                    new CustomEvent('open-faris-assistant', {
                      detail: { persona: 'faris', prompt: searchTerm },
                    })
                  );
                }}
                className="mt-3 px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>اسأل فارس ونُورة عن "{searchTerm}"</span>
              </button>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const illKey = resolveIllustrationForTab(item.href || item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => handleExecuteItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 sm:p-3 rounded-[16px] flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.kind === 'record' ? (
                      <CorporateAvatar
                        name={item.personName || item.title}
                        role={item.personRole}
                        size="sm"
                        status="verified"
                      />
                    ) : (
                      <BusinessIllustration
                        type={illKey}
                        size="sm"
                        showBackground={false}
                        className="!w-10 !h-10 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] p-1 shrink-0"
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`font-bold text-xs sm:text-sm truncate ${
                            isSelected ? 'text-[#ffffff]' : 'text-[#141414]'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {item.kind === 'action' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ffffff] text-[#141414] border border-[#e0e0e0]">
                            أمر سريع
                          </span>
                        )}
                        {item.kind === 'record' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0066ff] text-[#ffffff]">
                            سجل حي
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] block truncate ${
                          isSelected ? 'text-[#adadad]' : 'text-[#707070]'
                        }`}
                      >
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full font-mono ${
                          isSelected
                            ? 'bg-[#ffffff]/15 text-[#ffffff]'
                            : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ArrowUpLeft
                      className={`w-4 h-4 ${isSelected ? 'text-[#ffffff]' : 'text-[#707070]'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2.5 bg-[#f3f3f3] text-[#707070] border-t border-[#e5e5e5] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3 font-semibold">
            <span>↑↓ للتنقل</span>
            <span>↵ للتنفيذ والانتقال</span>
            <span className="hidden sm:inline text-[#141414]">• Alt+I مستخرج الفواتير</span>
            <span className="hidden sm:inline text-[#141414]">• Alt+A المساعد الذكي</span>
          </div>
          <span className="text-[10.5px] text-[#707070] font-semibold">
            محرك الأوامر والبحث الموحد • مجموعة خالد السليم القابضة
          </span>
        </div>
      </div>
    </div>
  );
};
