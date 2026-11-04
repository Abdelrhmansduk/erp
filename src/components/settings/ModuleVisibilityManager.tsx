import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  Search,
  RotateCcw,
  Save,
  Building2,
  User,
  Lock,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { NavItem } from '../../types';
import { SIDEBAR_MENU } from '../../data/sidebarMenu';
import { useAuthContext } from '../../contexts/AuthContext';
import { COMPANY_AUTH_METADATA, authService } from '../../services/authService';
import {
  useModuleVisibilityStore,
  collectDescendantIds,
  LOCKED_NAV_IDS,
  UI_PARTS,
  VISIBILITY_SCOPES,
  type VisibilityScope,
} from '../../services/moduleVisibility';

type EditMode = 'org' | 'personal';

const scopeLabel = (scope: VisibilityScope) =>
  scope === 'ALL' ? 'كل الشركات (المجموعة كاملة)' : COMPANY_AUTH_METADATA[scope]?.nameAr || scope;

const countLeaves = (item: NavItem): number =>
  item.children && item.children.length > 0
    ? item.children.reduce((sum, c) => sum + countLeaves(c), 0)
    : 1;

interface ToggleProps {
  hidden: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}

const VisibilityToggle: React.FC<ToggleProps> = ({ hidden, disabled, onToggle, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!hidden}
    aria-label={`${hidden ? 'إظهار' : 'إخفاء'} ${label}`}
    disabled={disabled}
    onClick={onToggle}
    className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold border transition-colors ${
      disabled
        ? 'bg-[#f6f6f6] text-[#b0b0b0] border-[#eeeeee] cursor-not-allowed'
        : hidden
          ? 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3] hover:bg-[#ffe4e6] cursor-pointer'
          : 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0] hover:bg-[#dcfce7] cursor-pointer'
    }`}
  >
    {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    <span>{hidden ? 'مخفي' : 'ظاهر'}</span>
  </button>
);

export const ModuleVisibilityManager: React.FC = () => {
  const { user } = useAuthContext();
  const isAdmin = authService.isAdmin(user);
  const orgRules = useModuleVisibilityStore((s) => s.orgRules);
  const personalRules = useModuleVisibilityStore((s) => s.personalRules);
  const setOrgRule = useModuleVisibilityStore((s) => s.setOrgRule);
  const setPersonalRule = useModuleVisibilityStore((s) => s.setPersonalRule);
  const loadRemoteRules = useModuleVisibilityStore((s) => s.loadRemoteRules);

  const [mode, setMode] = useState<EditMode>(isAdmin ? 'org' : 'personal');
  const [scope, setScope] = useState<VisibilityScope>('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    void loadRemoteRules();
  }, [loadRemoteRules]);

  const savedIds = useMemo<string[]>(() => {
    if (mode === 'org') return orgRules[scope]?.hiddenIds || [];
    return (user?.id && personalRules[user.id]) || [];
  }, [mode, scope, orgRules, personalRules, user?.id]);

  // Items already hidden by the organisation (shown as locked in personal mode)
  const orgEnforcedIds = useMemo(() => {
    if (mode !== 'personal') return new Set<string>();
    const ids = new Set<string>(orgRules.ALL?.hiddenIds || []);
    const own = String(user?.company_id || '').toUpperCase() as VisibilityScope;
    if (own && own !== 'ALL') (orgRules[own]?.hiddenIds || []).forEach((id) => ids.add(id));
    return ids;
  }, [mode, orgRules, user?.company_id]);

  const [draft, setDraft] = useState<Set<string>>(() => new Set(savedIds));
  useEffect(() => {
    setDraft(new Set(savedIds));
    setStatus(null);
  }, [savedIds]);

  const isDirty = useMemo(() => {
    if (draft.size !== savedIds.length) return true;
    return savedIds.some((id) => !draft.has(id));
  }, [draft, savedIds]);

  const toggleId = (id: string) => {
    if (LOCKED_NAV_IDS.has(id)) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setStatus(null);
  };

  const sections = useMemo(() => SIDEBAR_MENU.filter((s) => s.id !== 'dashboard'), []);

  const query = search.trim().toLowerCase();
  const matches = (item: NavItem): boolean =>
    !query ||
    item.title.toLowerCase().includes(query) ||
    (item.children || []).some((c) => matches(c));

  const hiddenLeafCount = useMemo(() => {
    let count = 0;
    const walk = (item: NavItem, parentHidden: boolean) => {
      const hidden = parentHidden || draft.has(item.id) || orgEnforcedIds.has(item.id);
      if (item.children && item.children.length > 0) item.children.forEach((c) => walk(c, hidden));
      else if (hidden) count += 1;
    };
    sections.forEach((s) => walk(s, false));
    return count;
  }, [draft, sections, orgEnforcedIds]);

  const totalLeafCount = useMemo(() => sections.reduce((sum, s) => sum + countLeaves(s), 0), [sections]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const ids = Array.from(draft);
    if (mode === 'org') {
      const res = await setOrgRule(scope, ids, user?.email || user?.username);
      setStatus(
        res.synced
          ? { type: 'success', text: `تم الحفظ وتطبيقه على ${scopeLabel(scope)} لجميع المستخدمين.` }
          : { type: 'warning', text: res.error || 'تم الحفظ على هذا الجهاز. فعّل قاعدة البيانات لتعميمه على كل الأجهزة.' }
      );
    } else if (user?.id) {
      setPersonalRule(user.id, ids);
      setStatus({ type: 'success', text: 'تم حفظ تخصيص قائمتك الشخصية.' });
    }
    setSaving(false);
  };

  const renderItem = (item: NavItem, depth: number, parentHidden: boolean): React.ReactNode => {
    if (!matches(item)) return null;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const locked = LOCKED_NAV_IDS.has(item.id);
    const enforced = orgEnforcedIds.has(item.id);
    const selfHidden = draft.has(item.id) || enforced;
    const effectiveHidden = parentHidden || selfHidden;
    const isOpen = query ? true : Boolean(expanded[item.id]);
    const hiddenDescendants = hasChildren
      ? collectDescendantIds(item).filter((id) => draft.has(id) || orgEnforcedIds.has(id)).length
      : 0;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 py-2 pl-2 rounded-xl ${
            depth === 0 ? 'bg-[#fafafa] border border-[#efefef] px-3' : 'hover:bg-[#fafafa]'
          } ${effectiveHidden ? 'opacity-60' : ''}`}
          style={depth > 0 ? { paddingRight: `${depth * 22 + 10}px` } : undefined}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'طي' : 'توسيع'} ${item.title}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#707070] hover:bg-[#eeeeee] cursor-pointer shrink-0"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-7 shrink-0" />
          )}

          <div className="flex-1 min-w-0 text-right">
            <div className={`text-xs truncate ${depth === 0 ? 'font-extrabold text-[#141414]' : 'font-semibold text-[#262626]'}`}>
              {item.title}
            </div>
            <div className="text-[10.5px] text-[#8a8a8a] truncate">
              {locked
                ? 'لا يمكن إخفاؤه (لضمان الوصول للإعدادات)'
                : enforced
                  ? 'مخفي بقرار من إدارة المنظومة'
                  : parentHidden
                    ? 'مخفي تلقائياً لأن القسم الأعلى مخفي'
                    : hasChildren
                      ? `${countLeaves(item)} صفحة فرعية${hiddenDescendants ? ` • ${hiddenDescendants} مخفية` : ''}`
                      : item.href}
            </div>
          </div>

          {locked ? (
            <span className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11px] font-bold bg-[#f6f6f6] text-[#8a8a8a] border border-[#eeeeee]">
              <Lock className="w-3.5 h-3.5" />
              مثبّت
            </span>
          ) : (
            <VisibilityToggle
              hidden={selfHidden}
              disabled={parentHidden || enforced}
              onToggle={() => toggleId(item.id)}
              label={item.title}
            />
          )}
        </div>

        {hasChildren && isOpen && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1, effectiveHidden))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[#f0f0f0] pb-4">
        <div>
          <h3 className="text-sm font-black text-[#141414] m-0">إظهار وإخفاء الأقسام والواجهات</h3>
          <p className="text-[11.5px] text-[#707070] mt-1 mb-0 leading-relaxed">
            أخفِ قسماً رئيسياً كاملاً، أو صفحات فرعية بعينها، أو أجزاء من الواجهة. يختفي العنصر من القائمة الجانبية
            وبطاقات الصلاحيات والبحث السريع، ويُمنع فتحه مباشرة.
          </p>
        </div>
        <div className="text-[11px] font-bold text-[#141414] bg-[#f5f5f5] rounded-full px-3 py-1.5 whitespace-nowrap">
          {hiddenLeafCount} مخفية من أصل {totalLeafCount} صفحة
        </div>
      </div>

      {/* Mode + scope */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="bg-[#f3f3f3] p-1 rounded-full inline-flex gap-1">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setMode('org')}
              className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                mode === 'org' ? 'bg-white text-[#141414] shadow-xs' : 'text-[#707070]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              لكل المستخدمين
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode('personal')}
            className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
              mode === 'personal' ? 'bg-white text-[#141414] shadow-xs' : 'text-[#707070]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            قائمتي الشخصية فقط
          </button>
        </div>

        {mode === 'org' && (
          <label className="inline-flex items-center gap-2 text-xs font-bold text-[#141414]">
            <span>نطاق التطبيق:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as VisibilityScope)}
              className="h-9 px-3 rounded-full border border-[#e5e5e5] bg-white text-xs font-semibold focus:outline-none focus:border-[#141414] cursor-pointer"
            >
              {VISIBILITY_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {scopeLabel(s)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#9a9a9a] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن قسم أو صفحة..."
            aria-label="بحث في الأقسام"
            className="w-full h-9 pr-9 pl-3 rounded-full border border-[#e5e5e5] bg-white text-xs focus:outline-none focus:border-[#141414]"
          />
        </div>
      </div>

      {mode === 'org' && scope !== 'ALL' && (
        <p className="text-[11px] text-[#707070] m-0">
          ما تخفيه هنا يُضاف إلى ما هو مخفي على مستوى «كل الشركات»، ويُطبَّق فقط على موظفي {scopeLabel(scope)}.
        </p>
      )}

      {/* Departments tree */}
      <div className="space-y-2">
        {sections.map((section) => renderItem(section, 0, false))}
      </div>

      {/* UI parts */}
      {!query && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#141414]">
            <Layers className="w-4 h-4" />
            أجزاء الواجهة المشتركة
          </div>
          {UI_PARTS.map((part) => {
            const enforced = orgEnforcedIds.has(part.id);
            const hidden = draft.has(part.id) || enforced;
            return (
              <div
                key={part.id}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border border-[#efefef] ${hidden ? 'opacity-60' : ''}`}
              >
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-xs font-semibold text-[#262626]">{part.title}</div>
                  <div className="text-[10.5px] text-[#8a8a8a]">
                    {enforced ? 'مخفي بقرار من إدارة المنظومة' : part.description}
                  </div>
                </div>
                <VisibilityToggle
                  hidden={hidden}
                  disabled={enforced}
                  onToggle={() => toggleId(part.id)}
                  label={part.title}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Status */}
      {status && (
        <div
          role="status"
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            status.type === 'success'
              ? 'bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d]'
              : 'bg-[#fffbeb] border border-[#fde68a] text-[#92400e]'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status.text}</span>
        </div>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 bg-white pt-3 border-t border-[#f0f0f0] flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setDraft(new Set());
            setStatus(null);
          }}
          disabled={draft.size === 0}
          className="h-10 px-4 rounded-full border border-[#e5e5e5] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5 hover:bg-[#f7f7f7] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          إظهار الكل
        </button>
        <div className="flex items-center gap-3">
          {isDirty && <span className="text-[11px] font-bold text-[#b45309]">تغييرات غير محفوظة</span>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="h-10 px-5 rounded-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            حفظ وتطبيق
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleVisibilityManager;
