/**
 * Module Visibility Engine — hide or grant whole departments, sub-pages, or shared UI parts
 * per Company, per Department, or per Individual Employee.
 *
 * Layers:
 *   1. Organisation rules — per company scope ('ALL', 'SAF', 'YAQ', 'TOP', 'KAS', 'DAR').
 *   2. Department rules — per corporate department ('hr', 'finance', ...), seeded with HR isolation defaults
 *      (hiding Finance Center `dept-2-finance` & Unified Gov Integration Hub `gov-integrations` from HR).
 *   3. Per-Employee rules — granular per-employee customization controlled by Eng. Abdulrahman (`a.salif.dev@kas.sa`)
 *      and system executives, supporting BOTH hiding default items (`hiddenIds`) AND showing/granting extra
 *      departments or sub-pages (`grantedIds`) for each individual employee across all 69+ corporate accounts!
 *   4. Personal rules — each employee can declutter their own menu locally.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NavItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type VisibilityScope = 'ALL' | 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR';

export const VISIBILITY_SCOPES: VisibilityScope[] = ['ALL', 'SAF', 'YAQ', 'TOP', 'KAS', 'DAR'];

export type VisibilityDepartmentId =
  | 'executive'
  | 'finance'
  | 'recruitment'
  | 'rental'
  | 'ats'
  | 'hr'
  | 'crm'
  | 'shelter'
  | 'tenders';

export const VISIBILITY_DEPARTMENTS: { id: VisibilityDepartmentId; labelAr: string }[] = [
  { id: 'executive', labelAr: '1. القيادة التنفيذية والحوكمة' },
  { id: 'finance', labelAr: '2. الإدارة المالية والمحاسبة وZATCA' },
  { id: 'recruitment', labelAr: '3. الاستقدام وعقود مساند' },
  { id: 'rental', labelAr: '4. التأجير وتشغيل الكوادر' },
  { id: 'ats', labelAr: '5. المتابعة الخارجية والفرز (ATS)' },
  { id: 'hr', labelAr: '6. الموارد البشرية والرواتب (HR)' },
  { id: 'crm', labelAr: '7. العملاء والمبيعات والشكاوى (CRM)' },
  { id: 'shelter', labelAr: '8. الإيواء والتسكين والحركة' },
  { id: 'tenders', labelAr: '9. المنافسات والتجارة (شركة كاس)' },
];

/** Shared interface parts that can be hidden across the whole workspace. */
export const UI_PARTS: { id: string; title: string; description: string }[] = [
  {
    id: 'part:department-banner',
    title: 'شريط القسم العلوي',
    description: 'بطاقة عنوان القسم والمسار والاختصارات أعلى كل صفحة.',
  },
  {
    id: 'part:ai-copilot',
    title: 'المساعد الذكي العائم',
    description: 'زر المساعد الذكي في زاوية الشاشة.',
  },
  {
    id: 'part:mobile-bottom-nav',
    title: 'شريط التنقل السفلي (الجوال)',
    description: 'شريط الاختصارات أسفل الشاشة على الجوال.',
  },
];

/** Items that can never be hidden globally (prevents visibility controller lock-out). */
export const LOCKED_NAV_IDS = new Set<string>(['dashboard', 'module-visibility']);
export const ALWAYS_ALLOWED_HREFS = new Set<string>(['profile', 'ess-self-service', 'logout']);

/** Extra route aliases blocked whenever a major hub or department ID is hidden. */
const EXTRA_BLOCKED_HREFS_BY_ID: Record<string, string[]> = {
  'dept-2-finance': [
    'smacc-accounting',
    'journal-accounting',
    'finance-home',
    'ifrs-engine',
    'zatca',
    'invoices',
    'chart-accounts',
    'journals',
    'period-closing',
    'trial-balance',
    'income-statement',
    'balance-sheet',
    'musaned-escrow',
    'suppliers-agents',
    'receipt-vouchers',
    'payment-vouchers',
    'banks-boxes',
    'bank-reconciliation',
    'petty-cash',
    'cash-custody',
    'vat-declaration',
    'financial-requests',
    'cost-centers',
    'odoo-accounting',
    'smacc-inventory',
    'financial-reports',
    'hr-accruals',
    'hr-expenses',
    'gov-integrations-finance',
  ],
  'gov-integrations': ['gov-integrations', 'government-hub', 'gov-integration-hub'],
  'gov-integrations-exec': ['gov-integrations', 'government-hub', 'gov-integration-hub'],
  'gov-integrations-finance': ['gov-integrations', 'government-hub', 'gov-integration-hub'],
  'gov-integrations-hr': ['gov-integrations', 'government-hub', 'gov-integration-hub'],
  payroll: ['payroll', 'payrolls'],
  payrolls: ['payroll', 'payrolls'],
};

/**
 * Default department visibility isolation rules:
 * Finance Center (`dept-2-finance`) and Unified Gov Integration Hub (`gov-integrations` — 11 agencies)
 * are hidden from HR (`hr`) out of the box unless explicitly granted by Abdulrahman.
 */
export const DEFAULT_DEPARTMENT_RULES: Partial<Record<VisibilityDepartmentId, CustomAccessRule>> = {
  hr: {
    hiddenIds: [
      'dept-2-finance',
      'gov-integrations',
      'gov-integrations-finance',
      'gov-integrations-hr',
      'hr-accruals',
      'hr-expenses',
    ],
    grantedIds: [],
    updatedBy: 'سياسة العزل الافتراضية للموارد البشرية',
  },
};

const REMOTE_TABLE = 'module_visibility_settings';
const GRANT_PREFIX = '+grant:';

export interface ScopeRule {
  hiddenIds: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface CustomAccessRule {
  hiddenIds: string[];
  grantedIds: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface ModuleVisibilityState {
  orgRules: Partial<Record<VisibilityScope, ScopeRule>>;
  departmentRules: Partial<Record<VisibilityDepartmentId, CustomAccessRule>>;
  employeeRules: Record<string, CustomAccessRule>;
  personalRules: Record<string, string[]>;
  remoteLoaded: boolean;
  setOrgRule: (
    scope: VisibilityScope,
    hiddenIds: string[],
    updatedBy?: string
  ) => Promise<{ synced: boolean; error: string | null }>;
  setDepartmentRule: (
    departmentId: VisibilityDepartmentId,
    rule: { hiddenIds: string[]; grantedIds?: string[] },
    updatedBy?: string
  ) => Promise<{ synced: boolean; error: string | null }>;
  setEmployeeRule: (
    employeeKey: string,
    rule: { hiddenIds: string[]; grantedIds?: string[] },
    updatedBy?: string
  ) => Promise<{ synced: boolean; error: string | null }>;
  clearEmployeeRule: (employeeKey: string) => Promise<{ synced: boolean; error: string | null }>;
  setPersonalRule: (userId: string, hiddenIds: string[]) => void;
  loadRemoteRules: () => Promise<void>;
}

const sanitizeHidden = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => typeof id === 'string' && id && !LOCKED_NAV_IDS.has(id))));

const sanitizeGranted = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => typeof id === 'string' && Boolean(id))));

export function normalizeEmployeeVisibilityKey(
  userOrEmail?:
    | string
    | { email?: string | null; username?: string | null; id?: string | null }
    | null
): string {
  if (!userOrEmail) return '';
  if (typeof userOrEmail === 'string') {
    return userOrEmail.trim().toLowerCase();
  }
  const email = String(userOrEmail.email || '').trim().toLowerCase();
  if (email) return email;
  const username = String(userOrEmail.username || '').trim().toLowerCase();
  if (username) return username.includes('@') ? username : `${username}@kas.sa`;
  return String(userOrEmail.id || '').trim().toLowerCase();
}

export function isVisibilityControllerUser(
  user?: {
    email?: string | null;
    username?: string | null;
    id?: string | null;
    department_id?: string | null;
    role?: string | null;
  } | null
): boolean {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const username = String(user.username || '').trim().toLowerCase();
  const id = String(user.id || '').trim().toUpperCase();
  const role = String(user.role || '');
  return (
    email === 'a.salif.dev@kas.sa' ||
    username === 'a.salif.dev' ||
    id === 'KAS-EMP-034' ||
    email === 'khalid@kas.sa' ||
    user.department_id === 'executive' ||
    role.includes('مبرمج النظام') ||
    role.includes('مطور النظام') ||
    ['رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مدير تنفيذي'].includes(role)
  );
}

function encodeCustomRuleForRemote(rule: CustomAccessRule): string[] {
  return [
    ...rule.hiddenIds,
    ...rule.grantedIds.map((g) => `${GRANT_PREFIX}${g}`),
  ];
}

function decodeCustomRuleFromRemote(
  rawList: string[] | null | undefined,
  updatedAt?: string | null,
  updatedBy?: string | null
): CustomAccessRule {
  const hidden: string[] = [];
  const granted: string[] = [];
  for (const token of rawList || []) {
    if (typeof token !== 'string' || !token) continue;
    if (token.startsWith(GRANT_PREFIX)) {
      granted.push(token.slice(GRANT_PREFIX.length));
    } else {
      hidden.push(token);
    }
  }
  return {
    hiddenIds: sanitizeHidden(hidden),
    grantedIds: sanitizeGranted(granted),
    updatedAt: updatedAt || undefined,
    updatedBy: updatedBy || undefined,
  };
}

async function upsertRemoteScopeRow(
  scopeKey: string,
  encodedIds: string[],
  updatedBy?: string,
  updatedAt?: string
): Promise<{ synced: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { synced: false, error: null };
  }
  try {
    const { error } = await supabase.from(REMOTE_TABLE).upsert(
      {
        scope: scopeKey,
        hidden_ids: encodedIds,
        updated_by: updatedBy || null,
        updated_at: updatedAt || new Date().toISOString(),
      },
      { onConflict: 'scope' }
    );
    if (error) {
      return {
        synced: false,
        error:
          'تم الحفظ وتطبيقه فوراً — تعذّرت المزامنة السحابية مع قاعدة البيانات (تحقق من الصلاحيات).',
      };
    }
    return { synced: true, error: null };
  } catch {
    return { synced: false, error: 'تم الحفظ على هذا الجهاز فقط — تعذّر الاتصال بقاعدة البيانات.' };
  }
}

export const useModuleVisibilityStore = create<ModuleVisibilityState>()(
  persist(
    (set, get) => ({
      orgRules: {},
      departmentRules: { ...DEFAULT_DEPARTMENT_RULES },
      employeeRules: {},
      personalRules: {},
      remoteLoaded: false,

      setOrgRule: async (scope, hiddenIds, updatedBy) => {
        const rule: ScopeRule = {
          hiddenIds: sanitizeHidden(hiddenIds),
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set({ orgRules: { ...get().orgRules, [scope]: rule } });
        return upsertRemoteScopeRow(scope, rule.hiddenIds, updatedBy, rule.updatedAt);
      },

      setDepartmentRule: async (departmentId, inputRule, updatedBy) => {
        const rule: CustomAccessRule = {
          hiddenIds: sanitizeHidden(inputRule.hiddenIds || []),
          grantedIds: sanitizeGranted(inputRule.grantedIds || []),
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set({
          departmentRules: {
            ...get().departmentRules,
            [departmentId]: rule,
          },
        });
        return upsertRemoteScopeRow(
          `DEPT:${departmentId}`,
          encodeCustomRuleForRemote(rule),
          updatedBy,
          rule.updatedAt
        );
      },

      setEmployeeRule: async (employeeKey, inputRule, updatedBy) => {
        const normKey = normalizeEmployeeVisibilityKey(employeeKey);
        if (!normKey) return { synced: false, error: null };
        const rule: CustomAccessRule = {
          hiddenIds: sanitizeHidden(inputRule.hiddenIds || []),
          grantedIds: sanitizeGranted(inputRule.grantedIds || []),
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set({
          employeeRules: {
            ...get().employeeRules,
            [normKey]: rule,
          },
        });
        return upsertRemoteScopeRow(
          `EMP:${normKey}`,
          encodeCustomRuleForRemote(rule),
          updatedBy,
          rule.updatedAt
        );
      },

      clearEmployeeRule: async (employeeKey) => {
        const normKey = normalizeEmployeeVisibilityKey(employeeKey);
        if (!normKey) return { synced: false, error: null };
        const nextMap = { ...get().employeeRules };
        delete nextMap[normKey];
        set({ employeeRules: nextMap });
        return upsertRemoteScopeRow(`EMP:${normKey}`, [], 'reset');
      },

      setPersonalRule: (userId, hiddenIds) => {
        if (!userId) return;
        set({ personalRules: { ...get().personalRules, [userId]: sanitizeHidden(hiddenIds) } });
      },

      loadRemoteRules: async () => {
        if (!isSupabaseConfigured) {
          set({ remoteLoaded: true });
          return;
        }
        try {
          const { data, error } = await supabase
            .from(REMOTE_TABLE)
            .select('scope, hidden_ids, updated_by, updated_at');
          if (error || !Array.isArray(data)) {
            set({ remoteLoaded: true });
            return;
          }
          const nextOrg: Partial<Record<VisibilityScope, ScopeRule>> = { ...get().orgRules };
          const nextDept: Partial<Record<VisibilityDepartmentId, CustomAccessRule>> = {
            ...DEFAULT_DEPARTMENT_RULES,
            ...get().departmentRules,
          };
          const nextEmp: Record<string, CustomAccessRule> = { ...get().employeeRules };

          for (const row of data as Array<{
            scope: string;
            hidden_ids: string[] | null;
            updated_by: string | null;
            updated_at: string | null;
          }>) {
            const rawScope = String(row.scope || '').trim();
            if (rawScope.toUpperCase().startsWith('DEPT:')) {
              const deptKey = rawScope.slice(5).toLowerCase() as VisibilityDepartmentId;
              if (VISIBILITY_DEPARTMENTS.some((d) => d.id === deptKey)) {
                nextDept[deptKey] = decodeCustomRuleFromRemote(
                  row.hidden_ids,
                  row.updated_at,
                  row.updated_by
                );
              }
              continue;
            }
            if (rawScope.toUpperCase().startsWith('EMP:')) {
              const empKey = rawScope.slice(4).trim().toLowerCase();
              if (empKey) {
                const decoded = decodeCustomRuleFromRemote(
                  row.hidden_ids,
                  row.updated_at,
                  row.updated_by
                );
                if (decoded.hiddenIds.length === 0 && decoded.grantedIds.length === 0) {
                  delete nextEmp[empKey];
                } else {
                  nextEmp[empKey] = decoded;
                }
              }
              continue;
            }

            const upperScope = rawScope.toUpperCase() as VisibilityScope;
            if (!VISIBILITY_SCOPES.includes(upperScope)) continue;
            nextOrg[upperScope] = {
              hiddenIds: sanitizeHidden(row.hidden_ids || []),
              updatedAt: row.updated_at || undefined,
              updatedBy: row.updated_by || undefined,
            };
          }
          set({
            orgRules: nextOrg,
            departmentRules: nextDept,
            employeeRules: nextEmp,
            remoteLoaded: true,
          });
        } catch {
          set({ remoteLoaded: true });
        }
      },
    }),
    {
      name: 'ALSULAIM_MODULE_VISIBILITY_V1',
      partialize: (state) => ({
        orgRules: state.orgRules,
        departmentRules: state.departmentRules,
        employeeRules: state.employeeRules,
        personalRules: state.personalRules,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...(persistedState || {}),
        departmentRules: {
          ...DEFAULT_DEPARTMENT_RULES,
          ...(persistedState?.departmentRules || {}),
        },
      }),
    }
  )
);

// ───────────────────────────── Tree helpers ─────────────────────────────

export function collectDescendantIds(item: NavItem): string[] {
  const ids: string[] = [];
  const walk = (node: NavItem) => {
    (node.children || []).forEach((child) => {
      ids.push(child.id);
      walk(child);
    });
  };
  walk(item);
  return ids;
}

function collectHrefs(items: NavItem[], into: Set<string>): Set<string> {
  for (const item of items) {
    if (item.href) into.add(item.href);
    if (item.children) collectHrefs(item.children, into);
  }
  return into;
}

/**
 * Returns a copy of the menu with hidden items removed.
 * A section whose children are all hidden disappears entirely.
 */
export function filterNavTree(items: NavItem[], hidden: Set<string>): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    const locked = LOCKED_NAV_IDS.has(item.id);
    if (hidden.has(item.id) && !locked) {
      // Keep locked descendants reachable even when their parent is hidden.
      const lockedChildren = (item.children || []).filter((c) => LOCKED_NAV_IDS.has(c.id));
      if (lockedChildren.length > 0) result.push({ ...item, children: lockedChildren });
      continue;
    }
    if (item.children && item.children.length > 0) {
      const children = filterNavTree(item.children, hidden);
      if (children.length === 0) continue;
      result.push({ ...item, children });
    } else {
      result.push(item);
    }
  }
  return result;
}

/** Hrefs that exist in the full menu (or extra hub aliases) that are no longer reachable after hiding. */
export function computeBlockedHrefs(
  fullMenu: NavItem[],
  hidden: Set<string>,
  grantedHrefs?: Set<string>
): Set<string> {
  if (hidden.size === 0) return new Set();
  const all = collectHrefs(fullMenu, new Set());
  const visible = collectHrefs(filterNavTree(fullMenu, hidden), new Set());
  const blocked = new Set<string>();
  all.forEach((href) => {
    if (
      !visible.has(href) &&
      !ALWAYS_ALLOWED_HREFS.has(href) &&
      href !== 'dashboard' &&
      href !== 'module-visibility' &&
      href !== 'settings' &&
      !grantedHrefs?.has(href)
    ) {
      blocked.add(href);
    }
  });
  hidden.forEach((hiddenId) => {
    const extras = EXTRA_BLOCKED_HREFS_BY_ID[hiddenId];
    if (extras) {
      extras.forEach((extraHref) => {
        if (!grantedHrefs?.has(extraHref)) {
          blocked.add(extraHref);
        }
      });
    }
  });
  return blocked;
}

export function resolveEffectiveHiddenIds(
  state: Pick<ModuleVisibilityState, 'orgRules' | 'personalRules'> &
    Partial<Pick<ModuleVisibilityState, 'departmentRules' | 'employeeRules'>>,
  companyScope: VisibilityScope | null,
  userId: string | null,
  context?: {
    departmentId?: string | null;
    employeeKey?: string | null;
  }
): Set<string> {
  const ids = new Set<string>(state.orgRules.ALL?.hiddenIds || []);
  if (companyScope && companyScope !== 'ALL') {
    (state.orgRules[companyScope]?.hiddenIds || []).forEach((id) => ids.add(id));
  }

  const deptId = String(context?.departmentId || '').toLowerCase() as VisibilityDepartmentId;
  if (deptId) {
    const deptRule = state.departmentRules?.[deptId] ?? DEFAULT_DEPARTMENT_RULES[deptId];
    if (deptRule) {
      deptRule.hiddenIds.forEach((id) => ids.add(id));
      deptRule.grantedIds.forEach((id) => ids.delete(id));
    }
  }

  const empKey = normalizeEmployeeVisibilityKey(context?.employeeKey);
  if (empKey && state.employeeRules?.[empKey]) {
    const empRule = state.employeeRules[empKey];
    empRule.grantedIds.forEach((id) => ids.delete(id));
    empRule.hiddenIds.forEach((id) => ids.add(id));
  }

  if (userId) {
    (state.personalRules[userId] || []).forEach((id) => ids.add(id));
  }
  return ids;
}

/**
 * Resolves the complete effective visibility (hidden IDs, granted IDs, granted hrefs, blocked hrefs, visibleMenu)
 * for any corporate employee (`user`), honoring Org -> Department -> Per-Employee (Abdulrahman's overrides) -> Personal.
 */
export function resolveUserVisibilityAccess(
  arg1:
    | NavItem[]
    | Pick<ModuleVisibilityState, 'orgRules' | 'departmentRules' | 'employeeRules' | 'personalRules'>,
  arg2?:
    | {
        id?: string | null;
        email?: string | null;
        username?: string | null;
        company_id?: string | null;
        department_id?: string | null;
        role?: string | null;
      }
    | NavItem[]
    | null,
  arg3?:
    | string
    | {
        id?: string | null;
        email?: string | null;
        username?: string | null;
        company_id?: string | null;
        department_id?: string | null;
        role?: string | null;
      }
    | null,
  stateOverride?: Pick<
    ModuleVisibilityState,
    'orgRules' | 'departmentRules' | 'employeeRules' | 'personalRules'
  >
): {
  hiddenIds: Set<string>;
  grantedIds: Set<string>;
  grantedHrefs: Set<string>;
  blockedHrefs: Set<string>;
  visibleMenu: NavItem[];
} {
  const isFirstArgMenu = Array.isArray(arg1);
  const fullMenu: NavItem[] = isFirstArgMenu
    ? (arg1 as NavItem[])
    : Array.isArray(arg2)
    ? (arg2 as NavItem[])
    : [];
  const user = (isFirstArgMenu ? arg2 : arg3) as {
    id?: string | null;
    email?: string | null;
    username?: string | null;
    company_id?: string | null;
    department_id?: string | null;
    role?: string | null;
  } | null;
  const activeCompanyId = isFirstArgMenu && typeof arg3 === 'string' ? arg3 : null;
  const state =
    (!isFirstArgMenu
      ? (arg1 as Pick<
          ModuleVisibilityState,
          'orgRules' | 'departmentRules' | 'employeeRules' | 'personalRules'
        >)
      : stateOverride) || useModuleVisibilityStore.getState();
  const rawComp =
    user?.company_id && user.company_id !== 'all'
      ? user.company_id
      : activeCompanyId || null;
  const upperComp = String(rawComp || '').toUpperCase() as VisibilityScope;
  const companyScope = VISIBILITY_SCOPES.includes(upperComp) ? upperComp : null;

  const deptId = String(user?.department_id || '').toLowerCase() as VisibilityDepartmentId;
  const empKey = normalizeEmployeeVisibilityKey(user);

  const hiddenIds = resolveEffectiveHiddenIds(state, companyScope, user?.id || null, {
    departmentId: deptId,
    employeeKey: empKey,
  });

  const rawGranted = new Set<string>();
  const deptRule = deptId ? state.departmentRules?.[deptId] ?? DEFAULT_DEPARTMENT_RULES[deptId] : undefined;
  if (deptRule) {
    deptRule.grantedIds.forEach((id) => rawGranted.add(id));
  }
  const empRule = empKey ? state.employeeRules?.[empKey] : undefined;
  if (empRule) {
    empRule.grantedIds.forEach((id) => rawGranted.add(id));
    empRule.hiddenIds.forEach((id) => rawGranted.delete(id));
  }

  // Expand granted parent departments to their non-hidden children, and unhide parent department if a child is granted!
  const expandedGrantedIds = new Set<string>(rawGranted);
  const grantedHrefs = new Set<string>();
  rawGranted.forEach((gId) => {
    const aliasHrefs = EXTRA_BLOCKED_HREFS_BY_ID[gId];
    if (aliasHrefs && ! gId.startsWith('dept-')) {
      aliasHrefs.forEach((h) => {
        if (!empRule?.hiddenIds.includes(h)) grantedHrefs.add(h);
      });
    }
  });

  for (const section of fullMenu) {
    const sectionChildren = section.children || [];
    if (rawGranted.has(section.id)) {
      hiddenIds.delete(section.id);
      if (section.href && !hiddenIds.has(section.id)) grantedHrefs.add(section.href);
      for (const child of sectionChildren) {
        const explicitlyHiddenByEmp =
          empRule?.hiddenIds.includes(child.id) ||
          Boolean(child.href && empRule?.hiddenIds.includes(child.href));
        if (!explicitlyHiddenByEmp) {
          hiddenIds.delete(child.id);
          expandedGrantedIds.add(child.id);
          if (child.href) grantedHrefs.add(child.href);
        }
      }
    } else {
      let anyChildGranted = false;
      for (const child of sectionChildren) {
        if (rawGranted.has(child.id)) {
          anyChildGranted = true;
          hiddenIds.delete(child.id);
          expandedGrantedIds.add(child.id);
          if (child.href) grantedHrefs.add(child.href);
        }
      }
      if (anyChildGranted) {
        // Ensure parent accordion container stays visible so the employee can reach their granted child page!
        hiddenIds.delete(section.id);
      }
      if (sectionChildren.length === 0 && rawGranted.has(section.id) && section.href) {
        grantedHrefs.add(section.href);
      }
    }
  }

  // Also map any direct leaf items hidden individually into blockedHrefs
  const visibleMenu = filterNavTree(fullMenu, hiddenIds);
  const visibleHrefs = collectHrefs(visibleMenu, new Set());
  const blockedHrefs = computeBlockedHrefs(fullMenu, hiddenIds, grantedHrefs);
  for (const section of fullMenu) {
    if (
      hiddenIds.has(section.id) &&
      section.href &&
      !visibleHrefs.has(section.href) &&
      !grantedHrefs.has(section.href) &&
      !ALWAYS_ALLOWED_HREFS.has(section.href)
    ) {
      if (section.href !== 'dashboard' && section.href !== 'module-visibility') {
        blockedHrefs.add(section.href);
      }
    }
    for (const child of section.children || []) {
      const childExplicitlyHidden =
        hiddenIds.has(child.id) || Boolean(child.href && hiddenIds.has(child.href));
      const parentHiddenOnly = hiddenIds.has(section.id) && !childExplicitlyHidden;
      if (
        (childExplicitlyHidden || (parentHiddenOnly && !visibleHrefs.has(child.href || ''))) &&
        child.href &&
        !grantedHrefs.has(child.href) &&
        !ALWAYS_ALLOWED_HREFS.has(child.href) &&
        child.href !== 'dashboard' &&
        child.href !== 'module-visibility'
      ) {
        blockedHrefs.add(child.href);
      }
    }
  }

  // Safety invariant: Abdulrahman (`a.salif.dev@kas.sa`) and Khalid (`khalid@kas.sa`) can never be blocked from `module-visibility`
  if (isVisibilityControllerUser(user)) {
    blockedHrefs.delete('module-visibility');
    blockedHrefs.delete('dashboard');
  }

  return {
    hiddenIds,
    grantedIds: expandedGrantedIds,
    grantedHrefs,
    blockedHrefs,
    visibleMenu,
  };
}
