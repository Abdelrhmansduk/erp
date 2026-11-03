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
import { SIDEBAR_MENU } from '../../data/sidebarMenu';
import { BusinessIllustration } from './BusinessIllustration';
import { CorporateAvatar } from './CorporateAvatar';
import { resolveIllustrationForTab } from '../../services/visualAssetsRegistry';

interface QuickSearchModalProps {
  onNavigate: (href: string, title: string) => void;
}

export interface PinnedTabItem {
  href: string;
  title: string;
  category?: string;
}

const PINNED_TABS_KEY = 'alsulaim_pinned_tabs_v1';
const RECENT_TABS_KEY = 'alsulaim_recent_tabs_v1';

export function getPinnedTabs(): PinnedTabItem[] {
  try {
    const raw = localStorage.getItem(PINNED_TABS_KEY);
    if (!raw) {
      return [
        { href: 'smacc-accounting', title: 'محاسبة سماك SMACC', category: 'الإدارة المالية' },
        { href: 'recruitment-contracts', title: 'عقود الاستقدام (مساند)', category: 'إدارة الاستقدام' },
        { href: 'zatca', title: 'الفوترة الإلكترونية ZATCA', category: 'الإدارة المالية' },
        { href: 'employees', title: 'شؤون الموظفين ومسيرات WPS', category: 'الموارد البشرية' },
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function togglePinnedTab(item: PinnedTabItem): PinnedTabItem[] {
  const current = getPinnedTabs();
  const exists = current.some((t) => t.href === item.href);
  const next = exists
    ? current.filter((t) => t.href !== item.href)
    : [item, ...current].slice(0, 8);
  try {
    localStorage.setItem(PINNED_TABS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('alsulaim-favorites-updated', { detail: next }));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function getRecentTabs(): PinnedTabItem[] {
  try {
    const raw = localStorage.getItem(RECENT_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentTab(item: PinnedTabItem): void {
  if (!item.href || item.href === 'login' || item.href === 'landing') return;
  try {
    const current = getRecentTabs().filter((t) => t.href !== item.href);
    const next = [item, ...current].slice(0, 6);
    localStorage.setItem(RECENT_TABS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
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

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({ onNavigate }) => {
  const { isQuickSearchOpen, setQuickSearchOpen } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CommandCategoryFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pinnedTabs, setPinnedTabs] = useState<PinnedTabItem[]>(() => getPinnedTabs());
  const [recentTabs, setRecentTabs] = useState<PinnedTabItem[]>(() => getRecentTabs());
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten sidebar menu into searchable screens
  const allScreenItems = useMemo<UnifiedCommandItem[]>(() => {
    const list: UnifiedCommandItem[] = [];
    SIDEBAR_MENU.forEach((section) => {
      if (section.href) {
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
          if (item.href) {
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
              if (subItem.href) {
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
    return list;
  }, []);

  // Quick Executive Actions
  const quickActionItems = useMemo<UnifiedCommandItem[]>(
    () => [
      {
        id: 'act-ocr-extractor',
        title: 'فتح الماسح الذكي لاستخلاص 100+ فاتورة وأي مستند (OCR)',
        subtitle: 'قراءة ملفات PDF وExcel وWord وصور الفواتير وترحيلها لدفتر سماك',
        kind: 'action',
        badge: 'Alt + I',
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
        kind: 'action',
        badge: 'ZATCA XML',
      },
      {
        id: 'act-new-musaned',
        title: 'إنشاء عقد استقدام جديد موثق (مساند)',
        subtitle: 'فتح شاشة عقود الاستقدام وتوليد عقد مساند وربطه بالعميل',
        href: 'recruitment-contracts',
        kind: 'action',
        badge: 'مساند',
      },
      {
        id: 'act-new-cv',
        title: 'إضافة سيرة ذاتية جديدة / استخلاص جواز سفر مرشح',
        subtitle: 'فتح معالج إنشاء السيرة الذاتية مع المعاينة الحية للأفاتار',
        href: 'create-cv',
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
    ],
    []
  );

  // Search Live ERP Records from localStorage when user types a query
  const liveRecordItems = useMemo<UnifiedCommandItem[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];
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

    // 1. Clients
    readTable('clients').forEach((c) => {
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
          subtitle: `هوية: ${natId || '—'} • جوال: ${phone || '—'} • ${c.city || 'الرياض'}`,
          href: 'clients',
          kind: 'record',
          badge: 'سجل العملاء CRM',
          personName: name,
          personRole: 'عميل معتمد',
        });
      }
    });

    // 2. Recruitment Contracts
    readTable('recruitment_contracts').forEach((rc) => {
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

    // 3. Candidate CVs
    readTable('cvs').forEach((cv) => {
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
          subtitle: `المهنة: ${job || 'عاملة منزلية'} • الجواز: ${pass || '—'} • الجنسية: ${cv.nationality || '—'}`,
          href: 'cvs-recruitment',
          kind: 'record',
          badge: 'بنك السير ATS',
          personName: name,
          personRole: job || 'عاملة منزلية',
        });
      }
    });

    // 4. Employees
    readTable('employees').forEach((emp) => {
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

    // 5. ZATCA Invoices
    readTable('zatca_invoices').forEach((inv) => {
      const num = String(inv.invoice_number || inv.id || '');
      const client = String(inv.client_name || inv.customer || '');
      if (num.toLowerCase().includes(q) || client.toLowerCase().includes(q)) {
        results.push({
          id: `rec-inv-${inv.id}`,
          title: `فاتورة ضريبية #${num} — ${client}`,
          subtitle: `الإجمالي: ${inv.total_amount || inv.total || ''} ر.س • الحالة: ${inv.status || 'معتمدة ZATCA'}`,
          href: 'zatca',
          kind: 'record',
          badge: 'فاتورة ZATCA',
          personName: client,
          personRole: 'عميل فاتورة ضريبية',
        });
      }
    });

    return results.slice(0, 10);
  }, [searchTerm]);

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
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[2000] flex items-start justify-center pt-12 sm:pt-16 p-3 sm:p-4"
      onClick={() => setQuickSearchOpen(false)}
      dir="rtl"
    >
      <div
        className="w-full max-w-3xl bg-[#FBFBF5] rounded-2xl shadow-2xl border border-[#CFA64A]/45 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Command Input Bar */}
        <div className="p-3.5 sm:p-4 bg-[#1D2428] text-white border-b border-[#CFA64A]/30 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#CFA64A]/20 border border-[#CFA64A]/40 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-[#CFA64A]" />
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
            placeholder="ابحث عن أي شاشة، عميل، عقد مساند، سيرة ذاتية، فاتورة ZATCA، أو أمر سريع... (Ctrl + K)"
            className="flex-1 text-white text-sm sm:text-base placeholder-zinc-400 outline-none bg-transparent font-bold"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-zinc-200 cursor-pointer"
            >
              مسح
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-black text-[#E6D3A7] bg-white/10 border border-white/15 rounded-lg">
            ESC للإغلاق
          </kbd>
        </div>

        {/* Category Filter Tabs + Pinned / Recent Chips */}
        <div className="px-4 py-2.5 bg-white border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
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
                  className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1D2428] text-[#CFA64A] shadow-2xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-bold text-zinc-500 hidden md:inline">
            اكتب اسم العميل أو رقم العقد للبحث الفوري في قاعدة البيانات
          </span>
        </div>

        {/* Pinned Favorites & Recent Visited Strip (shown when searchTerm is empty) */}
        {searchTerm.trim() === '' && (pinnedTabs.length > 0 || recentTabs.length > 0) && (
          <div className="px-4 py-2.5 bg-[#FBFBF5] border-b border-[#E6DEC8] space-y-2">
            {pinnedTabs.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#8C681E] shrink-0 pl-2">
                  <Star className="w-3.5 h-3.5 fill-[#CFA64A] text-[#CFA64A]" />
                  <span>المفضلة المثبتة:</span>
                </span>
                {pinnedTabs.map((pin) => (
                  <button
                    key={pin.href}
                    type="button"
                    onClick={() => {
                      onNavigate(pin.href, pin.title);
                      setQuickSearchOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#1D2428] hover:text-[#CFA64A] text-[#1D2428] border border-[#CFA64A]/40 text-[11px] font-extrabold transition-all shrink-0 cursor-pointer shadow-2xs"
                  >
                    {pin.title}
                  </button>
                ))}
              </div>
            )}

            {recentTabs.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 shrink-0 pl-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>زرتها مؤخراً:</span>
                </span>
                {recentTabs.map((rec) => (
                  <button
                    key={rec.href}
                    type="button"
                    onClick={() => {
                      onNavigate(rec.href, rec.title);
                      setQuickSearchOpen(false);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                  >
                    {rec.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unified Results List */}
        <div className="max-h-[55vh] overflow-y-auto p-2.5 space-y-1.5 bg-white">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <BusinessIllustration type="empty-search" size="sm" className="mx-auto mb-3" />
              <p className="text-sm font-black text-[#1D2428]">
                لا توجد شاشات أو سجلات مطابقة لـ "{searchTerm}"
              </p>
              <p className="text-xs text-zinc-500 mt-1">
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
                className="mt-3 px-4 py-2 rounded-xl bg-[#1D2428] text-[#CFA64A] text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
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
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#1D2428] text-white border-[#CFA64A]'
                      : 'bg-[#FBFBF5]/70 hover:bg-zinc-100 text-[#1D2428] border-zinc-200/70'
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
                        className="!w-10 !h-10 rounded-xl bg-[#FBFBF5] border border-[#CFA64A]/40 p-1 shrink-0"
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`font-black text-xs sm:text-sm truncate ${
                            isSelected ? 'text-white' : 'text-[#1D2428]'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {item.kind === 'action' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#CFA64A] text-[#1D2428]">
                            أمر سريع </span>
                        )}
                        {item.kind === 'record' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                            سجل حي
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] block truncate ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md font-mono ${
                          isSelected
                            ? 'bg-white/15 text-[#E6D3A7]'
                            : 'bg-zinc-200/70 text-zinc-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ArrowUpLeft
                      className={`w-4 h-4 ${isSelected ? 'text-[#CFA64A]' : 'text-zinc-400'}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2.5 bg-[#1D2428] text-zinc-300 border-t border-[#CFA64A]/30 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3 font-bold">
            <span>↑↓ للتنقل</span>
            <span>↵ للتنفيذ والانتقال</span>
            <span className="hidden sm:inline text-[#CFA64A]">• Alt+I مستخرج الفواتير</span>
            <span className="hidden sm:inline text-[#CFA64A]">• Alt+A المساعد الذكي</span>
          </div>
          <span className="text-[10.5px] text-[#E6D3A7] font-bold">
            محرك الأوامر والبحث الموحد • مجموعة خالد السليم القابضة
          </span>
        </div>
      </div>
    </div>
  );
};
