/**
 * Module Visibility Engine — hide whole departments, their sub-pages, or shared UI parts.
 *
 * Layers (a page is hidden if ANY layer hides it):
 *   1. Organisation rules — managed by group admins, per scope ('ALL' or a specific company).
 *      Persisted locally AND synced to Supabase table `module_visibility_settings`.
 *   2. Personal rules — each employee can declutter their own menu (local to the browser).
 *
 * Hiding a parent hides all of its descendants. A small set of items can never be hidden
 * (dashboard + the visibility manager itself) so administrators can't lock themselves out.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NavItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type VisibilityScope = 'ALL' | 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR';

export const VISIBILITY_SCOPES: VisibilityScope[] = ['ALL', 'SAF', 'YAQ', 'TOP', 'KAS', 'DAR'];

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

/** Items that can never be hidden (prevents administrator lock-out). */
export const LOCKED_NAV_IDS = new Set<string>(['dashboard', 'module-visibility']);
export const ALWAYS_ALLOWED_HREFS = new Set<string>(['dashboard', 'module-visibility', 'settings', 'profile', 'logout']);

const REMOTE_TABLE = 'module_visibility_settings';

interface ScopeRule {
  hiddenIds: string[];
  updatedAt?: string;
  updatedBy?: string;
}

interface ModuleVisibilityState {
  orgRules: Partial<Record<VisibilityScope, ScopeRule>>;
  personalRules: Record<string, string[]>;
  remoteLoaded: boolean;
  setOrgRule: (
    scope: VisibilityScope,
    hiddenIds: string[],
    updatedBy?: string
  ) => Promise<{ synced: boolean; error: string | null }>;
  setPersonalRule: (userId: string, hiddenIds: string[]) => void;
  loadRemoteRules: () => Promise<void>;
}

const sanitize = (ids: string[]) =>
  Array.from(new Set(ids.filter((id) => typeof id === 'string' && id && !LOCKED_NAV_IDS.has(id))));

export const useModuleVisibilityStore = create<ModuleVisibilityState>()(
  persist(
    (set, get) => ({
      orgRules: {},
      personalRules: {},
      remoteLoaded: false,

      setOrgRule: async (scope, hiddenIds, updatedBy) => {
        const rule: ScopeRule = {
          hiddenIds: sanitize(hiddenIds),
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set({ orgRules: { ...get().orgRules, [scope]: rule } });

        if (!isSupabaseConfigured) {
          return { synced: false, error: null };
        }
        try {
          const { error } = await supabase.from(REMOTE_TABLE).upsert(
            {
              scope,
              hidden_ids: rule.hiddenIds,
              updated_by: updatedBy || null,
              updated_at: rule.updatedAt,
            },
            { onConflict: 'scope' }
          );
          if (error) {
            return {
              synced: false,
              error: 'تم الحفظ على هذا الجهاز فقط — تعذّرت المزامنة مع قاعدة البيانات (تحقق من الصلاحيات أو من تطبيق ملف الترحيل).',
            };
          }
          return { synced: true, error: null };
        } catch {
          return { synced: false, error: 'تم الحفظ على هذا الجهاز فقط — تعذّر الاتصال بقاعدة البيانات.' };
        }
      },

      setPersonalRule: (userId, hiddenIds) => {
        if (!userId) return;
        set({ personalRules: { ...get().personalRules, [userId]: sanitize(hiddenIds) } });
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
          const next: Partial<Record<VisibilityScope, ScopeRule>> = { ...get().orgRules };
          for (const row of data as Array<{
            scope: string;
            hidden_ids: string[] | null;
            updated_by: string | null;
            updated_at: string | null;
          }>) {
            const scope = String(row.scope || '').toUpperCase() as VisibilityScope;
            if (!VISIBILITY_SCOPES.includes(scope)) continue;
            next[scope] = {
              hiddenIds: sanitize(row.hidden_ids || []),
              updatedAt: row.updated_at || undefined,
              updatedBy: row.updated_by || undefined,
            };
          }
          set({ orgRules: next, remoteLoaded: true });
        } catch {
          set({ remoteLoaded: true });
        }
      },
    }),
    {
      name: 'ALSULAIM_MODULE_VISIBILITY_V1',
      partialize: (state) => ({ orgRules: state.orgRules, personalRules: state.personalRules }),
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

/** Hrefs that exist in the full menu but are no longer reachable after hiding. */
export function computeBlockedHrefs(fullMenu: NavItem[], hidden: Set<string>): Set<string> {
  if (hidden.size === 0) return new Set();
  const all = collectHrefs(fullMenu, new Set());
  const visible = collectHrefs(filterNavTree(fullMenu, hidden), new Set());
  const blocked = new Set<string>();
  all.forEach((href) => {
    if (!visible.has(href) && !ALWAYS_ALLOWED_HREFS.has(href)) blocked.add(href);
  });
  return blocked;
}

export function resolveEffectiveHiddenIds(
  state: Pick<ModuleVisibilityState, 'orgRules' | 'personalRules'>,
  companyScope: VisibilityScope | null,
  userId: string | null
): Set<string> {
  const ids = new Set<string>(state.orgRules.ALL?.hiddenIds || []);
  if (companyScope && companyScope !== 'ALL') {
    (state.orgRules[companyScope]?.hiddenIds || []).forEach((id) => ids.add(id));
  }
  if (userId) {
    (state.personalRules[userId] || []).forEach((id) => ids.add(id));
  }
  return ids;
}
