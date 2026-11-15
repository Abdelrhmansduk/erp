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
  Users,
  ShieldCheck,
  Lock,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { NavItem } from '../../types';
import { SIDEBAR_MENU } from '../../data/sidebarMenu';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  COMPANY_AUTH_METADATA,
  CORPORATE_DEPARTMENTS,
  KAS_ALLOWED_EMPLOYEES,
  authService,
  type DepartmentId,
  type UserProfile,
} from '../../services/authService';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  useModuleVisibilityStore,
  collectDescendantIds,
  LOCKED_NAV_IDS,
  UI_PARTS,
  VISIBILITY_SCOPES,
  VISIBILITY_DEPARTMENTS,
  DEFAULT_DEPARTMENT_RULES,
  isVisibilityControllerUser,
  normalizeEmployeeVisibilityKey,
  resolveUserVisibilityAccess,
  type VisibilityScope,
  type VisibilityDepartmentId,
} from '../../services/moduleVisibility';

type EditMode = 'employee' | 'department' | 'org' | 'personal';

interface ManagedEmployeeEntry {
  key: string;
  id: string;
  nameAr: string;
  email: string;
  username: string;
  titleAr: string;
  companyId: string;
  departmentId: DepartmentId;
  branch: string;
  defaultTab?: string;
  allowedTabsOverride?: string[];
  extraAllowedDepartments?: DepartmentId[];
}

const scopeLabel = (scope: VisibilityScope) =>
  scope === 'ALL' ? 'كل الشركات (المجموعة كاملة)' : COMPANY_AUTH_METADATA[scope]?.nameAr || scope;

const countLeaves = (item: NavItem): number =>
  item.children && item.children.length > 0
    ? item.children.reduce((sum, c) => sum + countLeaves(c), 0)
    : 1;

interface ToggleProps {
  visible: boolean;
  isCustomGrant?: boolean;
  isCustomHide?: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
}

const VisibilityToggle: React.FC<ToggleProps> = ({
  visible,
  isCustomGrant,
  isCustomHide,
  disabled,
  onToggle,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={visible}
    aria-label={`${visible ? 'إخفاء' : 'إظهار'} ${label}`}
    disabled={disabled}
    onClick={onToggle}
    className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-bold border transition-colors ${
      disabled
        ? 'bg-[#f3f3f3] text-[#9a9a9a] border-[#e0e0e0] cursor-not-allowed'
        : visible
          ? 'bg-[#141414] text-[#ffffff] border-[#141414] hover:bg-[#262626] cursor-pointer'
          : 'bg-[#ffffff] text-[#707070] border-[#e0e0e0] hover:bg-[#f3f3f3] hover:text-[#141414] cursor-pointer'
    }`}
  >
    {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    <span>
      {visible
        ? isCustomGrant
          ? 'ظاهر (ممنوح)'
          : 'ظاهر'
        : isCustomHide
          ? 'مخفي (مخصص)'
          : 'مخفي'}
    </span>
  </button>
);

function buildEmployeeTargetProfile(emp: ManagedEmployeeEntry): UserProfile {
  return {
    id: emp.id,
    email: emp.email,
    username: emp.username,
    full_name: emp.nameAr,
    role: emp.titleAr,
    branch: emp.branch,
    status: 'نشط',
    created_at: '2026-01-01T00:00:00.000Z',
    company_id: emp.companyId,
    department_id: emp.departmentId,
    default_tab: emp.defaultTab,
    allowed_tabs_override: emp.allowedTabsOverride,
    extra_allowed_departments: emp.extraAllowedDepartments,
  };
}

export const ModuleVisibilityManager: React.FC = () => {
  const { user } = useAuthContext();
  const activeUser = user || authService.getCurrentUser();
  const canControlAll =
    isVisibilityControllerUser(activeUser) || authService.canManageModuleVisibility(activeUser);

  const orgRules = useModuleVisibilityStore((s) => s.orgRules);
  const departmentRules = useModuleVisibilityStore((s) => s.departmentRules);
  const employeeRules = useModuleVisibilityStore((s) => s.employeeRules);
  const personalRules = useModuleVisibilityStore((s) => s.personalRules);

  const setOrgRule = useModuleVisibilityStore((s) => s.setOrgRule);
  const setDepartmentRule = useModuleVisibilityStore((s) => s.setDepartmentRule);
  const setEmployeeRule = useModuleVisibilityStore((s) => s.setEmployeeRule);
  const clearEmployeeRule = useModuleVisibilityStore((s) => s.clearEmployeeRule);
  const setPersonalRule = useModuleVisibilityStore((s) => s.setPersonalRule);
  const loadRemoteRules = useModuleVisibilityStore((s) => s.loadRemoteRules);

  const [mode, setMode] = useState<EditMode>(canControlAll ? 'employee' : 'personal');
  const [scope, setScope] = useState<VisibilityScope>('ALL');
  const [selectedDept, setSelectedDept] = useState<VisibilityDepartmentId>('hr');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState<string>('ALL');
  const [employeeCompanyFilter, setEmployeeCompanyFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const [dynamicHrRows, setDynamicHrRows] = useState<Array<{ id: string | number; [key: string]: unknown }>>([]);

  useEffect(() => {
    void loadRemoteRules();
    let mounted = true;
    realErpDataStore
      .getRecords<{ id: string | number; [key: string]: unknown }>('hr_employees', [], 'all')
      .then((rows) => {
        if (mounted && Array.isArray(rows)) setDynamicHrRows(rows);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [loadRemoteRules]);

  // Build unified directory of all 69 @kas.sa employees + any dynamically added HR employees
  const allEmployees = useMemo<ManagedEmployeeEntry[]>(() => {
    const map = new Map<string, ManagedEmployeeEntry>();

    for (const emp of KAS_ALLOWED_EMPLOYEES) {
      const key = normalizeEmployeeVisibilityKey({
        email: emp.email,
        username: emp.username,
        id: emp.id,
      });
      if (!key) continue;
      map.set(key, {
        key,
        id: emp.id,
        nameAr: emp.nameAr,
        email: emp.email,
        username: emp.username,
        titleAr: emp.titleAr,
        companyId: emp.company_id,
        departmentId: emp.department_id,
        branch: emp.branch,
        defaultTab: emp.defaultTab,
        allowedTabsOverride: emp.allowedTabsOverride,
        extraAllowedDepartments: emp.extraAllowedDepartments,
      });
    }

    for (const row of dynamicHrRows) {
      const rawEmail = String(row.email || '').trim().toLowerCase();
      const rawId = String(row.id || row.employee_code || '').trim();
      const key = normalizeEmployeeVisibilityKey({ email: rawEmail || undefined, id: rawId || undefined });
      if (!key || map.has(key)) continue;
      const rawName = String(row.name || '').replace(/\s*\([^)]*@[^)]*\)\s*/g, '').trim();
      if (!rawName) continue;
      const rawDept = String(row.department_id || 'hr').toLowerCase() as DepartmentId;
      const validDept: DepartmentId = CORPORATE_DEPARTMENTS[rawDept] ? rawDept : 'hr';
      map.set(key, {
        key,
        id: rawId || key,
        nameAr: rawName,
        email: rawEmail || `${key}@kas.sa`,
        username: rawEmail ? rawEmail.split('@')[0] : key,
        titleAr: String(row.job_title || 'موظف'),
        companyId: String(row.company_id || 'SAF'),
        departmentId: validDept,
        branch: String(row.branch || 'الفرع الرئيسي - الرياض'),
      });
    }

    return Array.from(map.values());
  }, [dynamicHrRows]);

  const [selectedEmpKey, setSelectedEmpKey] = useState<string>(() => {
    const hrDefault = allEmployees.find((e) => e.email.toLowerCase() === 'hr@kas.sa');
    return hrDefault?.key || allEmployees[0]?.key || 'hr@kas.sa';
  });

  const selectedEmployee = useMemo<ManagedEmployeeEntry>(
    () => allEmployees.find((e) => e.key === selectedEmpKey) || allEmployees[0],
    [allEmployees, selectedEmpKey]
  );

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return allEmployees.filter((emp) => {
      if (employeeDeptFilter !== 'ALL' && emp.departmentId !== employeeDeptFilter) return false;
      if (
        employeeCompanyFilter !== 'ALL' &&
        emp.companyId.toUpperCase() !== employeeCompanyFilter.toUpperCase()
      ) {
        return false;
      }
      if (!q) return true;
      return (
        emp.nameAr.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.username.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.titleAr.toLowerCase().includes(q)
      );
    });
  }, [allEmployees, employeeSearch, employeeDeptFilter, employeeCompanyFilter]);

  // Draft states for Employee / Department modes (supporting BOTH hiddenIds and grantedIds)
  const savedAccessRule = useMemo<{ hiddenIds: string[]; grantedIds: string[] }>(() => {
    if (mode === 'employee' && selectedEmployee) {
      const r = employeeRules[selectedEmployee.key];
      return {
        hiddenIds: r?.hiddenIds || [],
        grantedIds: r?.grantedIds || [],
      };
    }
    if (mode === 'department') {
      const r = departmentRules[selectedDept] ?? DEFAULT_DEPARTMENT_RULES[selectedDept];
      return {
        hiddenIds: r?.hiddenIds || [],
        grantedIds: r?.grantedIds || [],
      };
    }
    if (mode === 'org') {
      return {
        hiddenIds: orgRules[scope]?.hiddenIds || [],
        grantedIds: [],
      };
    }
    return {
      hiddenIds: (activeUser?.id && personalRules[activeUser.id]) || [],
      grantedIds: [],
    };
  }, [
    mode,
    selectedEmployee,
    employeeRules,
    selectedDept,
    departmentRules,
    orgRules,
    scope,
    activeUser?.id,
    personalRules,
  ]);

  const [draftHidden, setDraftHidden] = useState<Set<string>>(() => new Set(savedAccessRule.hiddenIds));
  const [draftGranted, setDraftGranted] = useState<Set<string>>(() => new Set(savedAccessRule.grantedIds));

  useEffect(() => {
    setDraftHidden(new Set(savedAccessRule.hiddenIds));
    setDraftGranted(new Set(savedAccessRule.grantedIds));
    setStatus(null);
  }, [savedAccessRule]);

  const isDirty = useMemo(() => {
    if (draftHidden.size !== savedAccessRule.hiddenIds.length) return true;
    if (draftGranted.size !== savedAccessRule.grantedIds.length) return true;
    if (savedAccessRule.hiddenIds.some((id) => !draftHidden.has(id))) return true;
    if (savedAccessRule.grantedIds.some((id) => !draftGranted.has(id))) return true;
    return false;
  }, [draftHidden, draftGranted, savedAccessRule]);

  // Org-enforced IDs for personal mode
  const orgEnforcedIds = useMemo(() => {
    if (mode !== 'personal') return new Set<string>();
    const ids = new Set<string>(orgRules.ALL?.hiddenIds || []);
    const own = String(activeUser?.company_id || '').toUpperCase() as VisibilityScope;
    if (own && own !== 'ALL') (orgRules[own]?.hiddenIds || []).forEach((id) => ids.add(id));
    const dept = String(activeUser?.department_id || '').toLowerCase() as VisibilityDepartmentId;
    const deptRule = departmentRules[dept] ?? DEFAULT_DEPARTMENT_RULES[dept];
    if (deptRule) deptRule.hiddenIds.forEach((id) => ids.add(id));
    return ids;
  }, [mode, orgRules, departmentRules, activeUser?.company_id, activeUser?.department_id]);

  const sections = useMemo(() => SIDEBAR_MENU.filter((s) => s.id !== 'dashboard'), []);

  // Compute live preview of what the selected employee (or department) actually sees under the current draft!
  const employeePreview = useMemo(() => {
    if (mode !== 'employee' || !selectedEmployee) return null;
    const profile = buildEmployeeTargetProfile(selectedEmployee);
    const simulatedEmployeeRules = {
      ...employeeRules,
      [selectedEmployee.key]: {
        hiddenIds: Array.from(draftHidden),
        grantedIds: Array.from(draftGranted),
      },
    };
    const visWithDraft = resolveUserVisibilityAccess(SIDEBAR_MENU, profile, undefined, {
      orgRules,
      departmentRules,
      employeeRules: simulatedEmployeeRules,
      personalRules: {},
    });

    // Baseline without any employee override (to know whether an item needs an explicit grant)
    const emptyEmployeeRules = { ...employeeRules };
    delete emptyEmployeeRules[selectedEmployee.key];
    const baselineVis = resolveUserVisibilityAccess(SIDEBAR_MENU, profile, undefined, {
      orgRules,
      departmentRules,
      employeeRules: emptyEmployeeRules,
      personalRules: {},
    });

    const isBaseRbacAllowed = (item: NavItem): boolean => {
      if (!item.href) return false;
      const compUpper = (profile.company_id || '').toUpperCase();
      if (
        item.exclusiveToCompany &&
        !authService.isAdmin(profile) &&
        compUpper !== item.exclusiveToCompany.toUpperCase()
      ) {
        return false;
      }
      if (baselineVis.blockedHrefs.has(item.href) || baselineVis.hiddenIds.has(item.id)) {
        return false;
      }
      const deptDef = CORPORATE_DEPARTMENTS[(profile.department_id as DepartmentId) || 'hr'];
      if (authService.isAdmin(profile) || profile.department_id === 'executive') return true;
      if (profile.allowed_tabs_override && profile.allowed_tabs_override.length > 0) {
        return (
          profile.allowed_tabs_override.includes(item.href) || profile.default_tab === item.href
        );
      }
      if (profile.default_tab && profile.default_tab === item.href) return true;
      if (deptDef && (deptDef.allowedTabs.includes('*') || deptDef.allowedTabs.includes(item.href))) {
        return true;
      }
      for (const extraId of profile.extra_allowed_departments || []) {
        const extraDef = CORPORATE_DEPARTMENTS[extraId];
        if (extraDef && (extraDef.allowedTabs.includes('*') || extraDef.allowedTabs.includes(item.href))) {
          return true;
        }
      }
      return false;
    };

    const isLeafVisibleForEmployee = (leaf: NavItem, parentId?: string): boolean => {
      if (LOCKED_NAV_IDS.has(leaf.id) && isVisibilityControllerUser(profile)) return true;
      if (visWithDraft.hiddenIds.has(leaf.id) || (parentId && visWithDraft.hiddenIds.has(parentId))) {
        return false;
      }
      if (leaf.href && visWithDraft.blockedHrefs.has(leaf.href)) {
        return false;
      }
      if (
        visWithDraft.grantedIds.has(leaf.id) ||
        (leaf.href && visWithDraft.grantedHrefs.has(leaf.href))
      ) {
        return true;
      }
      return isBaseRbacAllowed(leaf);
    };

    return {
      profile,
      visWithDraft,
      baselineVis,
      isBaseRbacAllowed,
      isLeafVisibleForEmployee,
    };
  }, [mode, selectedEmployee, employeeRules, draftHidden, draftGranted, orgRules, departmentRules]);

  // Compute live preview for Department mode
  const departmentPreview = useMemo(() => {
    if (mode !== 'department') return null;
    const deptDef = CORPORATE_DEPARTMENTS[selectedDept];
    const isLeafDefaultInDept = (leaf: NavItem): boolean => {
      if (!leaf.href) return false;
      if (selectedDept === 'executive') return true;
      return Boolean(
        deptDef && (deptDef.allowedTabs.includes('*') || deptDef.allowedTabs.includes(leaf.href))
      );
    };
    const isLeafVisibleForDept = (leaf: NavItem, parentId?: string): boolean => {
      if (draftHidden.has(leaf.id) || (parentId && draftHidden.has(parentId))) return false;
      if (draftGranted.has(leaf.id) || (parentId && draftGranted.has(parentId))) return true;
      return isLeafDefaultInDept(leaf);
    };
    return {
      deptDef,
      isLeafDefaultInDept,
      isLeafVisibleForDept,
    };
  }, [mode, selectedDept, draftHidden, draftGranted]);

  const toggleItemInEmployeeOrDeptMode = (item: NavItem, parentSection?: NavItem) => {
    if (
      LOCKED_NAV_IDS.has(item.id) &&
      mode === 'employee' &&
      selectedEmployee &&
      isVisibilityControllerUser({ email: selectedEmployee.email, id: selectedEmployee.id })
    ) {
      return;
    }

    const hasChildren = Boolean(item.children && item.children.length > 0);
    const nextHidden = new Set(draftHidden);
    const nextGranted = new Set(draftGranted);

    if (mode === 'employee' && employeePreview) {
      if (hasChildren) {
        const leaves = item.children || [];
        const anyVisible = leaves.some((c) => employeePreview.isLeafVisibleForEmployee(c, item.id));
        if (anyVisible) {
          // Hide entire department for this employee
          nextHidden.add(item.id);
          nextGranted.delete(item.id);
          leaves.forEach((c) => {
            nextGranted.delete(c.id);
            nextHidden.delete(c.id);
          });
        } else {
          // Show/Grant entire department for this employee
          nextHidden.delete(item.id);
          leaves.forEach((c) => nextHidden.delete(c.id));
          const allBaseAllowed = leaves.every((c) => employeePreview.isBaseRbacAllowed(c));
          if (!allBaseAllowed || employeePreview.baselineVis.hiddenIds.has(item.id)) {
            nextGranted.add(item.id);
          }
        }
      } else {
        const currentlyVisible = employeePreview.isLeafVisibleForEmployee(item, parentSection?.id);
        if (currentlyVisible) {
          nextHidden.add(item.id);
          nextGranted.delete(item.id);
        } else {
          nextHidden.delete(item.id);
          if (parentSection && nextHidden.has(parentSection.id)) {
            // Unblock parent section while keeping sibling non-granted leaves hidden if needed
            nextHidden.delete(parentSection.id);
            (parentSection.children || []).forEach((sib) => {
              if (sib.id !== item.id && employeePreview.isBaseRbacAllowed(sib)) {
                nextHidden.add(sib.id);
              }
            });
          }
          if (!employeePreview.isBaseRbacAllowed(item)) {
            nextGranted.add(item.id);
          }
        }
      }
    } else if (mode === 'department' && departmentPreview) {
      if (hasChildren) {
        const leaves = item.children || [];
        const anyVisible = leaves.some((c) => departmentPreview.isLeafVisibleForDept(c, item.id));
        if (anyVisible) {
          nextHidden.add(item.id);
          nextGranted.delete(item.id);
          leaves.forEach((c) => {
            nextGranted.delete(c.id);
            nextHidden.delete(c.id);
          });
        } else {
          nextHidden.delete(item.id);
          leaves.forEach((c) => nextHidden.delete(c.id));
          if (!leaves.every((c) => departmentPreview.isLeafDefaultInDept(c))) {
            nextGranted.add(item.id);
          }
        }
      } else {
        const currentlyVisible = departmentPreview.isLeafVisibleForDept(item, parentSection?.id);
        if (currentlyVisible) {
          nextHidden.add(item.id);
          nextGranted.delete(item.id);
        } else {
          nextHidden.delete(item.id);
          if (parentSection) nextHidden.delete(parentSection.id);
          if (!departmentPreview.isLeafDefaultInDept(item)) {
            nextGranted.add(item.id);
          }
        }
      }
    } else {
      // Org or Personal mode (simple hiddenIds toggle)
      if (LOCKED_NAV_IDS.has(item.id)) return;
      if (nextHidden.has(item.id)) nextHidden.delete(item.id);
      else nextHidden.add(item.id);
    }

    setDraftHidden(nextHidden);
    setDraftGranted(nextGranted);
    setStatus(null);
  };

  const query = search.trim().toLowerCase();
  const matches = (item: NavItem): boolean =>
    !query ||
    item.title.toLowerCase().includes(query) ||
    (item.children || []).some((c) => matches(c));

  const totalLeafCount = useMemo(
    () => sections.reduce((sum, s) => sum + countLeaves(s), 0),
    [sections]
  );

  const visibleSummaryCount = useMemo(() => {
    if (mode === 'employee' && employeePreview) {
      let visible = 0;
      sections.forEach((sec) => {
        (sec.children || [sec]).forEach((leaf) => {
          if (employeePreview.isLeafVisibleForEmployee(leaf, sec.children ? sec.id : undefined)) {
            visible += 1;
          }
        });
      });
      return { visible, hidden: Math.max(0, totalLeafCount - visible) };
    }
    if (mode === 'department' && departmentPreview) {
      let visible = 0;
      sections.forEach((sec) => {
        (sec.children || [sec]).forEach((leaf) => {
          if (departmentPreview.isLeafVisibleForDept(leaf, sec.children ? sec.id : undefined)) {
            visible += 1;
          }
        });
      });
      return { visible, hidden: Math.max(0, totalLeafCount - visible) };
    }
    let hidden = 0;
    const walk = (item: NavItem, parentHidden: boolean) => {
      const isH = parentHidden || draftHidden.has(item.id) || orgEnforcedIds.has(item.id);
      if (item.children && item.children.length > 0) item.children.forEach((c) => walk(c, isH));
      else if (isH) hidden += 1;
    };
    sections.forEach((s) => walk(s, false));
    return { visible: Math.max(0, totalLeafCount - hidden), hidden };
  }, [mode, employeePreview, departmentPreview, sections, totalLeafCount, draftHidden, orgEnforcedIds]);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const actor = activeUser?.email || activeUser?.username || 'a.salif.dev@kas.sa';

    if (mode === 'employee' && selectedEmployee) {
      if (draftHidden.size === 0 && draftGranted.size === 0) {
        const res = await clearEmployeeRule(selectedEmployee.key);
        setStatus({
          type: res.synced ? 'success' : 'warning',
          text: `تمت إعادة صلاحيات ظهور الأقسام للموظف (${selectedEmployee.nameAr}) إلى الوضع الافتراضي المعتمد.`,
        });
      } else {
        const res = await setEmployeeRule(
          selectedEmployee.key,
          {
            hiddenIds: Array.from(draftHidden),
            grantedIds: Array.from(draftGranted),
          },
          actor
        );
        setStatus({
          type: res.synced ? 'success' : 'warning',
          text: `تم حفظ وتطبيق تخصيص الأقسام للموظف (${selectedEmployee.nameAr} — ${selectedEmployee.email}) بنجاح (${visibleSummaryCount.visible} صفحة ظاهرة).`,
        });
      }
    } else if (mode === 'department') {
      const deptLabel =
        VISIBILITY_DEPARTMENTS.find((d) => d.id === selectedDept)?.labelAr || selectedDept;
      const res = await setDepartmentRule(
        selectedDept,
        {
          hiddenIds: Array.from(draftHidden),
          grantedIds: Array.from(draftGranted),
        },
        actor
      );
      setStatus({
        type: res.synced ? 'success' : 'warning',
        text: `تم حفظ وتطبيق سياسة ظهور الأقسام على (${deptLabel}) لجميع موظفي القسم.`,
      });
    } else if (mode === 'org') {
      const res = await setOrgRule(scope, Array.from(draftHidden), actor);
      setStatus(
        res.synced
          ? { type: 'success', text: `تم الحفظ وتطبيقه على ${scopeLabel(scope)} لجميع المستخدمين.` }
          : {
              type: 'warning',
              text: res.error || 'تم الحفظ محلياً وتطبيقه فوراً على المتصفح.',
            }
      );
    } else if (activeUser?.id) {
      setPersonalRule(activeUser.id, Array.from(draftHidden));
      setStatus({ type: 'success', text: 'تم حفظ تخصيص قائمتك الشخصية.' });
    }
    setSaving(false);
  };

  const handleGrantAllToSelectedEmployee = () => {
    const nextGranted = new Set<string>();
    sections.forEach((s) => nextGranted.add(s.id));
    setDraftHidden(new Set());
    setDraftGranted(nextGranted);
    setStatus(null);
  };

  const handleResetCurrentDraft = () => {
    if (mode === 'department') {
      const defaults = DEFAULT_DEPARTMENT_RULES[selectedDept];
      setDraftHidden(new Set(defaults?.hiddenIds || []));
      setDraftGranted(new Set(defaults?.grantedIds || []));
    } else {
      setDraftHidden(new Set());
      setDraftGranted(new Set());
    }
    setStatus(null);
  };

  const renderSectionOrLeaf = (
    item: NavItem,
    depth: number,
    parentSection?: NavItem,
    parentOrgHidden = false
  ): React.ReactNode => {
    if (!matches(item)) return null;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isOpen = query ? true : Boolean(expanded[item.id]);

    const lockedForTarget =
      LOCKED_NAV_IDS.has(item.id) &&
      (mode === 'org' ||
        mode === 'personal' ||
        (mode === 'employee' &&
          selectedEmployee &&
          isVisibilityControllerUser({ email: selectedEmployee.email, id: selectedEmployee.id })));

    let isVisible = true;
    let isCustomGrant = false;
    let isCustomHide = false;
    let subtitle = '';
    let toggleDisabled = false;

    if (mode === 'employee' && employeePreview) {
      if (hasChildren) {
        const leaves = item.children || [];
        const visLeaves = leaves.filter((c) =>
          employeePreview.isLeafVisibleForEmployee(c, item.id)
        ).length;
        isVisible = visLeaves > 0;
        isCustomGrant = draftGranted.has(item.id);
        isCustomHide = draftHidden.has(item.id);
        subtitle = `${visLeaves} ظاهرة من أصل ${leaves.length} صفحة للموظف`;
      } else {
        isVisible = employeePreview.isLeafVisibleForEmployee(item, parentSection?.id);
        isCustomGrant =
          draftGranted.has(item.id) ||
          Boolean(parentSection && draftGranted.has(parentSection.id));
        isCustomHide =
          draftHidden.has(item.id) ||
          Boolean(parentSection && draftHidden.has(parentSection.id));
        subtitle = isCustomGrant
          ? 'ممنوح استثنائياً للموظف بقرار م. عبدالرحمن'
          : isCustomHide
            ? 'مخفي خصيصاً عن هذا الموظف'
            : isVisible
              ? 'متاح ضمن صلاحيات قسمه المعتمدة'
              : 'خارج نطاق قسمه الافتراضي (اضغط لإظهاره للموظف)';
      }
    } else if (mode === 'department' && departmentPreview) {
      if (hasChildren) {
        const leaves = item.children || [];
        const visLeaves = leaves.filter((c) =>
          departmentPreview.isLeafVisibleForDept(c, item.id)
        ).length;
        isVisible = visLeaves > 0;
        isCustomGrant = draftGranted.has(item.id);
        isCustomHide = draftHidden.has(item.id);
        subtitle = `${visLeaves} ظاهرة من أصل ${leaves.length} صفحة لموظفي القسم`;
      } else {
        isVisible = departmentPreview.isLeafVisibleForDept(item, parentSection?.id);
        isCustomGrant = draftGranted.has(item.id);
        isCustomHide = draftHidden.has(item.id);
        subtitle = isCustomHide
          ? 'مخفي عن جميع موظفي هذا القسم'
          : isCustomGrant
            ? 'مضاف ومفعّل لموظفي هذا القسم'
            : isVisible
              ? 'مفعّل افتراضياً للقسم'
              : 'غير مدرج افتراضياً للقسم';
      }
    } else {
      const enforced = orgEnforcedIds.has(item.id);
      const selfHidden = draftHidden.has(item.id) || enforced;
      const effectiveHidden = parentOrgHidden || selfHidden;
      isVisible = !effectiveHidden;
      isCustomHide = draftHidden.has(item.id);
      toggleDisabled = parentOrgHidden || enforced;
      const hiddenDescendants = hasChildren
        ? collectDescendantIds(item).filter((id) => draftHidden.has(id) || orgEnforcedIds.has(id))
            .length
        : 0;
      subtitle = lockedForTarget
        ? 'مثبّت لضمان عدم فقدان الوصول لإعدادات الظهور'
        : enforced
          ? 'مخفي بقرار تنظيمي مركزي'
          : parentOrgHidden
            ? 'مخفي تلقائياً لأن القسم الرئيسي مخفي'
            : hasChildren
              ? `${countLeaves(item)} صفحة فرعية${hiddenDescendants ? ` • ${hiddenDescendants} مخفية` : ''}`
              : item.href || '';
    }

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 py-2.5 pl-2.5 rounded-[18px] transition-colors ${
            depth === 0
              ? 'bg-[#f8f8f8] border border-[#e0e0e0] px-3'
              : 'hover:bg-[#f8f8f8] border border-transparent'
          } ${!isVisible ? 'opacity-70' : ''}`}
          style={depth > 0 ? { paddingRight: `${depth * 22 + 10}px` } : undefined}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'طي' : 'توسيع'} ${item.title}`}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#707070] hover:bg-[#e0e0e0] hover:text-[#141414] cursor-pointer shrink-0"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-7 shrink-0" />
          )}

          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs truncate ${
                  depth === 0 ? 'font-bold text-[#141414]' : 'font-semibold text-[#141414]'
                }`}
              >
                {item.title}
              </span>
              {(isCustomGrant || isCustomHide) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffffff] border border-[#141414] text-[#141414]">
                  {isCustomGrant ? 'صلاحية مخصصة +' : 'محجوب خصيصاً'}
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-[#707070] truncate mt-0.5">{subtitle}</div>
          </div>

          {lockedForTarget ? (
            <span className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]">
              <Lock className="w-3.5 h-3.5" />
              مثبّت
            </span>
          ) : (
            <VisibilityToggle
              visible={isVisible}
              isCustomGrant={isCustomGrant}
              isCustomHide={isCustomHide}
              disabled={toggleDisabled}
              onToggle={() => toggleItemInEmployeeOrDeptMode(item, parentSection)}
              label={item.title}
            />
          )}
        </div>

        {hasChildren && isOpen && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((child) =>
              renderSectionOrLeaf(child, depth + 1, item, !isVisible && (mode === 'org' || mode === 'personal'))
            )}
          </div>
        )}
      </div>
    );
  };

  const customizedEmployeesCount = useMemo(
    () =>
      Object.values(employeeRules).filter(
        (r) => (r?.hiddenIds?.length || 0) > 0 || (r?.grantedIds?.length || 0) > 0
      ).length,
    [employeeRules]
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. Monochrome Header Banner */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-[#141414] m-0">
              منظومة تخصيص وإظهار وإخفاء الأقسام للموظفين والأقسام
            </h3>
            {canControlAll && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                صلاحية التحكم الشامل • م. عبدالرحمن أبو سالف (a.salif.dev@kas.sa)
              </span>
            )}
          </div>
          <p className="text-xs text-[#707070] m-0 leading-relaxed">
            تحكم فوري ودقيق في الأقسام الـ 9 والصفحات الفرعية لكل موظف على حدة ({allEmployees.length} حساب رسمي)، أو لكل قسم إداري (مع عزل مركز المالية ومركز التكامل الحكومي عن الموارد البشرية تلقائياً)، أو على مستوى شركات المجموعة.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[11px] font-bold text-[#141414] bg-[#f3f3f3] border border-[#e0e0e0] rounded-full px-3.5 py-1.5 whitespace-nowrap">
            ظاهر: {visibleSummaryCount.visible} • مخفي: {visibleSummaryCount.hidden} من {totalLeafCount}
          </div>
          {canControlAll && customizedEmployeesCount > 0 && (
            <div className="text-[11px] font-bold text-[#ffffff] bg-[#141414] rounded-full px-3.5 py-1.5 whitespace-nowrap">
              {customizedEmployeesCount} موظف بتخصيص خاص
            </div>
          )}
        </div>
      </div>

      {/* 2. Control Mode Selector Pills */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-[#f3f3f3] border border-[#e0e0e0] p-1 rounded-full inline-flex flex-wrap gap-1">
          {canControlAll && (
            <>
              <button
                type="button"
                onClick={() => setMode('employee')}
                className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  mode === 'employee'
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'text-[#707070] hover:text-[#141414]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>تخصيص لكل موظف ({allEmployees.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('department')}
                className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  mode === 'department'
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'text-[#707070] hover:text-[#141414]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>تخصيص حسب القسم (9 أقسام)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('org')}
                className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  mode === 'org'
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'text-[#707070] hover:text-[#141414]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>تخصيص حسب الشركة</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMode('personal')}
            className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              mode === 'personal'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>قائمتي الشخصية</span>
          </button>
        </div>

        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن قسم أو صفحة فرعية..."
            aria-label="بحث في الأقسام"
            className="w-full h-9 pr-9 pl-3 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-xs text-[#141414] focus:outline-none focus:border-[#141414]"
          />
        </div>
      </div>

      {/* 3A. Per-Employee Selector Panel (Primary Panel for Eng. Abdulrahman) */}
      {mode === 'employee' && canControlAll && selectedEmployee && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#141414]">اختر الموظف لتخصيص أقسامه:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414]">
                {filteredEmployees.length} موظف مطابق
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={employeeDeptFilter}
                onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                aria-label="تصفية حسب القسم"
                className="h-9 px-3 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414] cursor-pointer"
              >
                <option value="ALL">كل الأقسام الإدارية (9)</option>
                {VISIBILITY_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.labelAr}
                  </option>
                ))}
              </select>

              <select
                value={employeeCompanyFilter}
                onChange={(e) => setEmployeeCompanyFilter(e.target.value)}
                aria-label="تصفية حسب الشركة"
                className="h-9 px-3 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414] cursor-pointer"
              >
                <option value="ALL">كل الشركات (5 كيانات)</option>
                {VISIBILITY_SCOPES.filter((s) => s !== 'ALL').map((s) => (
                  <option key={s} value={s}>
                    {scopeLabel(s)}
                  </option>
                ))}
              </select>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="اسم الموظف أو البريد @kas.sa..."
                  aria-label="بحث عن موظف"
                  className="w-full h-9 pr-8 pl-3 rounded-full border border-[#e0e0e0] bg-[#f8f8f8] text-xs text-[#141414] focus:outline-none focus:border-[#141414]"
                />
              </div>
            </div>
          </div>

          {/* Horizontal / Grid Scrollable Employee Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredEmployees.map((emp) => {
              const isSelected = emp.key === selectedEmployee.key;
              const customRule = employeeRules[emp.key];
              const customCount =
                (customRule?.hiddenIds?.length || 0) + (customRule?.grantedIds?.length || 0);
              const deptLabel = CORPORATE_DEPARTMENTS[emp.departmentId]?.nameAr || emp.departmentId;
              return (
                <button
                  key={emp.key}
                  type="button"
                  onClick={() => setSelectedEmpKey(emp.key)}
                  className={`text-right p-3 rounded-[16px] border transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#f8f8f8] hover:bg-[#f0f0f0] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{emp.nameAr}</div>
                    <div
                      className={`text-[10.5px] font-mono truncate mt-0.5 ${
                        isSelected ? 'text-[#d4d4d4]' : 'text-[#707070]'
                      }`}
                    >
                      {emp.email}
                    </div>
                    <div
                      className={`text-[10px] truncate mt-0.5 ${
                        isSelected ? 'text-[#e0e0e0]' : 'text-[#707070]'
                      }`}
                    >
                      {deptLabel} • {emp.companyId.toUpperCase()}
                    </div>
                  </div>
                  {customCount > 0 && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? 'bg-[#ffffff] text-[#141414]'
                          : 'bg-[#141414] text-[#ffffff]'
                      }`}
                    >
                      مخصص ({customCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Employee Summary Bar + Quick Presets */}
          <div className="pt-2 border-t border-[#f0f0f0] flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[#141414]">
              الموظف المحدد حالياً:{' '}
              <strong className="font-bold">{selectedEmployee.nameAr}</strong>{' '}
              <span className="font-mono text-[11px] text-[#707070]">({selectedEmployee.email})</span>{' '}
              —{' '}
              <span className="text-[#707070]">
                {CORPORATE_DEPARTMENTS[selectedEmployee.departmentId]?.nameAr}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleGrantAllToSelectedEmployee}
                className="h-8 px-3.5 rounded-full border border-[#141414] bg-[#ffffff] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>إظهار جميع الأقسام للموظف</span>
              </button>
              <button
                type="button"
                onClick={handleResetCurrentDraft}
                className="h-8 px-3.5 rounded-full border border-[#e0e0e0] bg-[#f8f8f8] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة للوضع الافتراضي لقسمه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3B. Per-Department Selector Panel */}
      {mode === 'department' && canControlAll && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold text-[#141414]">
                سياسة إظهار وإخفاء الأقسام على مستوى القسم الإداري بالكامل
              </div>
              <div className="text-[11px] text-[#707070] mt-0.5">
                مثال نشط: قسم الموارد البشرية (HR) معزول تلقائياً عن «مركز المالية» وعن «مركز التكامل والربط الحكومي الموحد (11 جهة حكومية)».
              </div>
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as VisibilityDepartmentId)}
              aria-label="اختيار القسم الإداري"
              className="h-9 px-4 rounded-full border border-[#141414] bg-[#ffffff] text-xs font-bold text-[#141414] focus:outline-none cursor-pointer"
            >
              {VISIBILITY_DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.labelAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 3C. Per-Company Scope Selector */}
      {mode === 'org' && canControlAll && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-[#707070]">
            ما تخفيه هنا يُطبَّق على مستوى الكيان القانوني المختار ({scopeLabel(scope)}).
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-bold text-[#141414]">
            <span>نطاق الكيان:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as VisibilityScope)}
              className="h-9 px-4 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414] cursor-pointer"
            >
              {VISIBILITY_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {scopeLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* 4. Corporate 9 Departments & Sub-Pages Tree */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-[#f0f0f0]">
          <span className="text-xs font-bold text-[#141414]">
            شجرة الأقسام الإدارية الـ 9 والصفحات الفرعية (اضغط على السهم لتوسيع الصفحات أو الزر للإظهار/الإخفاء)
          </span>
          <button
            type="button"
            onClick={() => {
              const anyOpen = sections.some((s) => expanded[s.id]);
              if (anyOpen) {
                setExpanded({});
              } else {
                const all: Record<string, boolean> = {};
                sections.forEach((s) => {
                  all[s.id] = true;
                });
                setExpanded(all);
              }
            }}
            className="h-7 px-3 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
          >
            {sections.some((s) => expanded[s.id]) ? 'طي جميع الأقسام' : 'توسيع جميع الأقسام'}
          </button>
        </div>

        <div className="space-y-2 pt-1">
          {sections.map((section) => renderSectionOrLeaf(section, 0))}
        </div>
      </div>

      {/* 5. Shared UI Parts */}
      {!query && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#141414]">
            <Layers className="w-4 h-4" />
            أجزاء الواجهة المشتركة
          </div>
          {UI_PARTS.map((part) => {
            const enforced = orgEnforcedIds.has(part.id);
            const hidden = draftHidden.has(part.id) || enforced;
            return (
              <div
                key={part.id}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-[16px] border border-[#e0e0e0] bg-[#f8f8f8] ${
                  hidden ? 'opacity-70' : ''
                }`}
              >
                <div className="flex-1 min-w-0 text-right">
                  <div className="text-xs font-semibold text-[#141414]">{part.title}</div>
                  <div className="text-[10.5px] text-[#707070]">
                    {enforced ? 'مخفي بقرار تنظيمي مركزي' : part.description}
                  </div>
                </div>
                <VisibilityToggle
                  visible={!hidden}
                  isCustomHide={draftHidden.has(part.id)}
                  disabled={enforced}
                  onToggle={() => {
                    setDraftHidden((prev) => {
                      const next = new Set(prev);
                      if (next.has(part.id)) next.delete(part.id);
                      else next.add(part.id);
                      return next;
                    });
                    setStatus(null);
                  }}
                  label={part.title}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Status Banner */}
      {status && (
        <div
          role="status"
          className="p-3.5 rounded-[18px] text-xs font-bold flex items-center gap-2 bg-[#f8f8f8] border border-[#141414] text-[#141414]"
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {/* 7. Sticky Save & Reset Footer */}
      <div className="sticky bottom-0 bg-[#ffffff] py-3 px-4 rounded-[20px] border border-[#e0e0e0] flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleResetCurrentDraft}
          disabled={draftHidden.size === 0 && draftGranted.size === 0}
          className="h-10 px-4 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5 hover:bg-[#f3f3f3] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{mode === 'employee' ? 'إلغاء التخصيص والعودة للافتراضي' : 'استعادة الوضع الافتراضي'}</span>
        </button>

        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-[11px] font-bold text-[#141414] bg-[#f3f3f3] px-3 py-1 rounded-full border border-[#e0e0e0]">
              تغييرات غير محفوظة
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="h-10 px-5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>
              {mode === 'employee' && selectedEmployee
                ? `حفظ وتطبيق للموظف (${selectedEmployee.nameAr.split(' ')[0]})`
                : 'حفظ وتطبيق الصلاحيات'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleVisibilityManager;
