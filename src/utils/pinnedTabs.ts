/**
 * Pinned & recent workspace tabs (persisted in localStorage).
 * Kept outside React component files so Vite Fast Refresh works reliably.
 */

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
        { href: 'smacc-accounting', title: 'الإدارة المالية والمحاسبة', category: 'الإدارة المالية' },
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
