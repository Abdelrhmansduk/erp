import { create } from 'zustand';
import { CompanyId } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: 'zatca' | 'etimad' | 'musaned' | 'shelter' | 'system';
  companyId?: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

const NOTIFICATIONS_STORAGE_KEY = 'ALSULAIM_ERP_NOTIFICATIONS_V2';

export function syncAppBadgeCount(count: number): void {
  try {
    if (typeof navigator !== 'undefined') {
      const nav = navigator as Navigator & {
        setAppBadge?: (c?: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      if (count > 0 && typeof nav.setAppBadge === 'function') {
        void nav.setAppBadge(count).catch(() => {});
      } else if (count <= 0 && typeof nav.clearAppBadge === 'function') {
        void nav.clearAppBadge().catch(() => {});
      }
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_BADGE',
          count,
        });
      }
    }
  } catch {
    // Ignore unsupported platform errors
  }
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    title: 'وصول رحلة استقدام جديدة',
    message: 'وصلت العاملة KIMBERLY (الفلبين) إلى مطار الملك خالد الدولي بنجاح.',
    type: 'success',
    category: 'musaned',
    companyId: 'SAF',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    link: 'travel',
  },
  {
    id: 'n-2',
    title: 'تنبيه SLA عقد إيجار',
    message: 'عقد التأجير #RENT-2026-0016 بحاجة إلى توقيع العميل قبل نهاية اليوم.',
    type: 'warning',
    category: 'system',
    companyId: 'YAQ',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: false,
    link: 'rent-contracts',
  },
  {
    id: 'n-3',
    title: 'فاتورة ZATCA معتمدة',
    message: 'تمت مصادقة الفاتورة الضريبية المبسطة بنجاح مع منصة فاتورة (ZATCA Phase 2).',
    type: 'info',
    category: 'zatca',
    companyId: 'SAF',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    read: true,
    link: 'zatca',
  },
];

function loadSavedNotifications(): AppNotification[] {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_NOTIFICATIONS;
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_NOTIFICATIONS;
}

function saveNotifications(list: AppNotification[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore
  }
}

export type FlowState = 'landing' | 'login' | 'welcome' | 'launcher' | 'workspace';

interface AppState {
  // Navigation & Flow
  flowState: FlowState;
  loginPortalCode: string | null;
  activeTab: string;
  activeTabTitle: string;
  setFlowState: (flow: FlowState) => void;
  setLoginPortalCode: (portalCode: string | null) => void;
  navigateToCompanyLogin: (portalCode: string | null) => void;
  setActiveTab: (tab: string, title: string) => void;

  // Realtime Notifications
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;

  // Global Quick Search Modal
  isQuickSearchOpen: boolean;
  setQuickSearchOpen: (open: boolean) => void;

  // Active Company Filter (mirrored in store for performance)
  activeCompanyId: CompanyId;
  setActiveCompanyId: (id: CompanyId) => void;
  syncFromUrlLocation: () => void;
}

export function normalizePortalRouteCode(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (!clean || clean === 'login' || clean === 'gateway') return null;
  if (clean === 'all') return 'admin';
  if (clean === 'dar') return 'shelter';
  return clean;
}

function resolveInitialRouteFromUrl(): {
  flowState: FlowState;
  activeTab: string;
  loginPortalCode: string | null;
} {
  if (typeof window === 'undefined') {
    return { flowState: 'login', activeTab: 'dashboard', loginPortalCode: null };
  }
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const searchParams = new URLSearchParams(window.location.search);
  const queryPortal = normalizePortalRouteCode(
    searchParams.get('company') || searchParams.get('system') || searchParams.get('portal')
  );
  const queryFlow = searchParams.get('flow');
  const queryTab = searchParams.get('tab');

  if (queryFlow === 'workspace' || queryTab) {
    return { flowState: 'workspace', activeTab: queryTab || 'dashboard', loginPortalCode: null };
  }
  if (queryFlow === 'launcher') {
    return { flowState: 'launcher', activeTab: 'dashboard', loginPortalCode: null };
  }
  if (queryFlow === 'welcome' || path === 'welcome') {
    return { flowState: 'welcome', activeTab: 'dashboard', loginPortalCode: null };
  }
  if (queryFlow === 'landing' || path === 'landing') {
    return { flowState: 'landing', activeTab: 'dashboard', loginPortalCode: null };
  }

  let savedTarget: string | null = null;
  let hasActiveBrowserLogin = false;
  try {
    savedTarget = normalizePortalRouteCode(localStorage.getItem('ALSULAIM_TARGET_SYSTEM'));
    hasActiveBrowserLogin = sessionStorage.getItem('ALSULAIM_SESSION_AUTHENTICATED_V2') === 'true';
  } catch {
    // ignore storage errors
  }

  if (path.startsWith('login/')) {
    const subCode = normalizePortalRouteCode(path.replace(/^login\//, '').split('/')[0]);
    if (subCode) {
      try {
        localStorage.setItem('ALSULAIM_TARGET_SYSTEM', subCode);
      } catch {
        // ignore storage errors
      }
    }
    return { flowState: 'login', activeTab: 'dashboard', loginPortalCode: subCode };
  }

  // Always open Login directly on root '/' or when first opening the website without an active login session
  if (!path || path === 'login' || !hasActiveBrowserLogin) {
    try {
      if (path !== 'login' && window.history?.replaceState) {
        const targetPortal = queryPortal || savedTarget;
        window.history.replaceState(null, '', targetPortal ? `/login/${targetPortal}` : '/login');
      }
    } catch {
      // ignore history errors
    }
    return { flowState: 'login', activeTab: 'dashboard', loginPortalCode: queryPortal || savedTarget };
  }
  if (path === 'launcher') {
    return { flowState: 'launcher', activeTab: 'dashboard', loginPortalCode: null };
  }
  if (path.startsWith('workspace/')) {
    const tab = path.replace(/^workspace\//, '') || 'dashboard';
    return { flowState: 'workspace', activeTab: tab, loginPortalCode: null };
  }
  if (path.startsWith('erp/')) {
    const tab = path.replace(/^erp\//, '') || 'dashboard';
    return { flowState: 'workspace', activeTab: tab, loginPortalCode: null };
  }
  return { flowState: 'workspace', activeTab: path, loginPortalCode: null };
}

function pushBrowserRoute(
  flowState: FlowState,
  activeTab: string,
  loginPortalCode?: string | null
) {
  if (typeof window === 'undefined' || !window.history?.pushState) return;
  const normalizedPortal = normalizePortalRouteCode(loginPortalCode);
  const targetPath =
    flowState === 'landing'
      ? '/landing'
      : flowState === 'login'
      ? normalizedPortal
        ? `/login/${normalizedPortal}`
        : '/login'
      : flowState === 'welcome'
      ? '/welcome'
      : flowState === 'launcher'
      ? '/launcher'
      : `/workspace/${activeTab || 'dashboard'}`;

  if (window.location.pathname !== targetPath) {
    try {
      window.history.pushState({ flowState, activeTab, loginPortalCode: normalizedPortal }, '', targetPath);
    } catch {
      // Ignore history API restrictions in sandboxed/test environments
    }
  }
}

const initialRoute = resolveInitialRouteFromUrl();

export const useAppStore = create<AppState>((set, get) => ({
  flowState: initialRoute.flowState,
  loginPortalCode: initialRoute.loginPortalCode,
  activeTab: initialRoute.activeTab,
  activeTabTitle: 'الرئيسية والمؤشرات التشغيلية',
  setFlowState: (flowState) => {
    pushBrowserRoute(flowState, get().activeTab, get().loginPortalCode);
    set({ flowState });
  },
  setLoginPortalCode: (portalCode) => {
    const normalized = normalizePortalRouteCode(portalCode);
    try {
      if (normalized) {
        localStorage.setItem('ALSULAIM_TARGET_SYSTEM', normalized);
      } else {
        localStorage.removeItem('ALSULAIM_TARGET_SYSTEM');
      }
    } catch {
      // ignore
    }
    if (get().flowState === 'login') {
      pushBrowserRoute('login', get().activeTab, normalized);
    }
    set({ loginPortalCode: normalized });
  },
  navigateToCompanyLogin: (portalCode) => {
    const normalized = normalizePortalRouteCode(portalCode);
    try {
      if (normalized) {
        localStorage.setItem('ALSULAIM_TARGET_SYSTEM', normalized);
      } else {
        localStorage.removeItem('ALSULAIM_TARGET_SYSTEM');
      }
    } catch {
      // ignore
    }
    pushBrowserRoute('login', get().activeTab, normalized);
    set({ flowState: 'login', loginPortalCode: normalized });
  },
  setActiveTab: (activeTab, activeTabTitle) => {
    pushBrowserRoute('workspace', activeTab, get().loginPortalCode);
    set({ activeTab, activeTabTitle, flowState: 'workspace' });
  },
  syncFromUrlLocation: () => {
    const resolved = resolveInitialRouteFromUrl();
    set({
      flowState: resolved.flowState,
      activeTab: resolved.activeTab,
      loginPortalCode: resolved.loginPortalCode,
    });
  },

  notifications: loadSavedNotifications(),
  unreadCount: loadSavedNotifications().filter((n) => !n.read).length,

  addNotification: (notification) =>
    set((state) => {
      const newNotif: AppNotification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updated = [newNotif, ...state.notifications].slice(0, 50);
      const nextUnread = updated.filter((n) => !n.read).length;
      saveNotifications(updated);
      syncAppBadgeCount(nextUnread);
      return {
        notifications: updated,
        unreadCount: nextUnread,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      const nextUnread = updated.filter((n) => !n.read).length;
      saveNotifications(updated);
      syncAppBadgeCount(nextUnread);
      return {
        notifications: updated,
        unreadCount: nextUnread,
      };
    }),

  markAllAsRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      saveNotifications(updated);
      syncAppBadgeCount(0);
      return {
        notifications: updated,
        unreadCount: 0,
      };
    }),

  clearNotifications: () => {
    saveNotifications([]);
    syncAppBadgeCount(0);
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  isQuickSearchOpen: false,
  setQuickSearchOpen: (isQuickSearchOpen) => set({ isQuickSearchOpen }),

  activeCompanyId: 'SAF',
  setActiveCompanyId: (activeCompanyId) => set({ activeCompanyId }),
}));

