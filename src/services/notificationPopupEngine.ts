/**
 * notificationPopupEngine.ts
 * Real-time Pop-up Toast, Mobile ServiceWorker Push & App Badging Notification Engine
 * Khalid Group ERP — Supports multi-tenant company isolation, mobile vibration, SW notifications & audio chimes.
 */

import { useAppStore } from '../stores/appStore';

export interface PopupNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'zatca' | 'etimad' | 'musaned' | 'shelter' | 'system' | 'sponsorship';
  priority?: 'critical' | 'actionable' | 'micro';
  companyId?: string;
  companyName?: string;
  timestamp: string;
  durationMs?: number;
  skipHistory?: boolean;
  action?: {
    label: string;
    tabKey: string;
  };
}

type NotificationListener = (notifications: PopupNotification[]) => void;

class NotificationPopupEngine {
  private notifications: PopupNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isAudioMuted = false;
  private isFocusMode = false;
  private swListenerAttached = false;

  constructor() {
    try {
      if (typeof localStorage !== 'undefined') {
        this.isAudioMuted = localStorage.getItem('khalid_popups_muted') === 'true';
        this.isFocusMode = localStorage.getItem('khalid_focus_mode') === 'true';
      }
    } catch {
      this.isAudioMuted = false;
      this.isFocusMode = false;
    }
    this.initServiceWorkerBridge();
  }

  /**
   * Listens for NOTIFICATION_CLICK events from Service Worker (when user taps a lock-screen or shade notification on mobile)
   */
  private initServiceWorkerBridge(): void {
    if (this.swListenerAttached || typeof window === 'undefined') {
      return;
    }
    this.swListenerAttached = true;

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data && typeof data === 'object' && data.type === 'MOBILE_STUDIO_TRIGGER_NOTIFICATION' && data.payload) {
        this.show(data.payload);
      }
    });

    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'NOTIFICATION_CLICK') {
        if (data.notificationId) {
          useAppStore.getState().markAsRead(data.notificationId);
        }
        if (data.action !== 'mark_read' && data.tabKey) {
          window.dispatchEvent(new CustomEvent('erp-navigate-tab', { detail: { tab: data.tabKey } }));
          window.dispatchEvent(new CustomEvent('alsulaim_navigate', { detail: { tab: data.tabKey, title: data.title || data.tabKey } }));
        }
      }
    });
  }

  public getNotifications(): PopupNotification[] {
    return [...this.notifications];
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener(this.getNotifications());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const list = this.getNotifications();
    this.listeners.forEach((fn) => fn(list));
  }

  /**
   * Triggers subtle mobile haptic vibration if supported and unmuted
   */
  private triggerMobileHaptics(type: PopupNotification['type']): void {
    if (this.isAudioMuted) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'error') {
          navigator.vibrate([180, 70, 180, 70, 180]);
        } else if (type === 'warning') {
          navigator.vibrate([140, 60, 140]);
        } else {
          navigator.vibrate([90, 40, 90]);
        }
      }
    } catch {
      // Ignore on devices without vibration hardware
    }
  }

  /**
   * Play a subtle glassmorphic alert chime using Web Audio API
   */
  private playPopupChime(type: PopupNotification['type']) {
    if (this.isAudioMuted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      osc.connect(gain);

      if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.0, now + 0.08); // A5
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.36);

      setTimeout(() => ctx.close().catch(() => {}), 450);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Display a floating popup notification + record in AppStore Notification Center + dispatch Mobile SW Push
   */
  public show(params: Omit<PopupNotification, 'id' | 'timestamp'>): string {
    const id = `popup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const resolvedPriority: 'critical' | 'actionable' | 'micro' =
      params.priority ||
      (params.type === 'error'
        ? 'critical'
        : params.type === 'warning' || params.action
        ? 'actionable'
        : 'micro');

    const defaultDuration =
      resolvedPriority === 'micro'
        ? 2600
        : resolvedPriority === 'actionable'
        ? 4500
        : 6500;
    const durationMs = params.durationMs ?? defaultDuration;

    const notif: PopupNotification = {
      ...params,
      id,
      priority: resolvedPriority,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      durationMs,
    };

    // Record in persistent Notification Center (AppStore) so bell badge & history stay synchronized
    if (!params.skipHistory) {
      const storeType: 'info' | 'success' | 'warning' | 'error' =
        params.type === 'error'
          ? 'error'
          : params.type === 'warning'
          ? 'warning'
          : params.type === 'success' || params.type === 'zatca'
          ? 'success'
          : 'info';

      const storeCategory: 'zatca' | 'etimad' | 'musaned' | 'shelter' | 'hr' | 'finance' | 'system' =
        params.type === 'zatca' || params.type === 'etimad' || params.type === 'musaned' || params.type === 'shelter'
          ? params.type
          : 'system';

      useAppStore.getState().addNotification({
        title: notif.title,
        message: notif.message,
        type: storeType,
        priority: resolvedPriority,
        category: storeCategory,
        companyId: notif.companyId || useAppStore.getState().activeCompanyId,
        link: notif.action?.tabKey,
        actionLabel: notif.action?.label,
      });
    }

    // Focus Mode: suppress non-critical floating popups so user isn't interrupted
    if (this.isFocusMode && resolvedPriority !== 'critical') {
      return id;
    }

    // Keep max 2 active floating popups on screen at once for clean Mobbin UX
    this.notifications = [notif, ...this.notifications.slice(0, 1)];
    this.notifyListeners();

    if (resolvedPriority !== 'micro') {
      this.playPopupChime(params.type);
      this.triggerMobileHaptics(params.type);
      void this.sendNativeBrowserNotification(notif);
    }

    // Auto dismiss after durationMs
    if (durationMs > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
      this.timers.set(id, timer);
    }

    return id;
  }

  public dismiss(id: string) {
    const existingTimer = this.timers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(id);
    }
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notifyListeners();
  }

  public clearAll() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.notifications = [];
    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.isAudioMuted = !this.isAudioMuted;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('khalid_popups_muted', String(this.isAudioMuted));
      }
    } catch {
      // ignore
    }
    return this.isAudioMuted;
  }

  public getIsMuted(): boolean {
    return this.isAudioMuted;
  }

  public toggleFocusMode(): boolean {
    this.isFocusMode = !this.isFocusMode;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('khalid_focus_mode', String(this.isFocusMode));
      }
    } catch {
      // ignore
    }
    if (this.isFocusMode) {
      this.clearAll();
    }
    return this.isFocusMode;
  }

  public getIsFocusMode(): boolean {
    return this.isFocusMode;
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Request permission for Native Desktop & Mobile Browser Push Notifications
   */
  public async requestBrowserPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Sends Native Mobile & Desktop OS Notification using ServiceWorkerRegistration first
   * (mandatory on Android Chrome & mobile PWAs where `new Notification()` throws Illegal Constructor).
   */
  public async sendNativeBrowserNotification(notif: PopupNotification): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }

    const unreadCount = useAppStore.getState().unreadCount;
    const tabKey = notif.action?.tabKey;
    const vibratePattern =
      notif.type === 'error' ? [180, 70, 180, 70, 180] : [140, 60, 140];

    // 1. Preferred Mobile-Compatible Path: Active Service Worker Registration
    try {
      if ('serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              id: notif.id,
              title: notif.title,
              body: notif.message,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: notif.id,
              tabKey,
              actionLabel: notif.action?.label || 'فتح القسم المختص',
              companyId: notif.companyId,
              unreadCount,
              requireInteraction: notif.type === 'error',
              vibrate: vibratePattern,
            },
          });
          return true;
        }

        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(notif.title, {
            body: notif.message,
            icon: '/logo.png',
            badge: '/logo.png',
            dir: 'rtl',
            lang: 'ar',
            tag: notif.id,
            data: {
              url: tabKey ? `/workspace/${tabKey}` : '/',
              tabKey,
              notificationId: notif.id,
            },
          });
          return true;
        }
      }
    } catch {
      // Fallback to desktop Notification constructor if Service Worker is not ready
    }

    // 2. Desktop Fallback Path
    try {
      const nativeNotif = new Notification(notif.title, {
        body: notif.message,
        icon: '/logo.png',
        badge: '/logo.png',
        dir: 'rtl',
        lang: 'ar',
        tag: notif.id,
      });

      if (tabKey) {
        nativeNotif.onclick = () => {
          window.focus();
          window.dispatchEvent(new CustomEvent('erp-navigate-tab', { detail: { tab: tabKey } }));
          nativeNotif.close();
        };
      }
      return true;
    } catch {
      return false;
    }
  }

  // Quick helper methods
  public success(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'success', action });
  }

  public warning(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'warning', action });
  }

  public error(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'error', action });
  }

  public info(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'info', action });
  }

  public zatca(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'zatca', action });
  }

  public etimad(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'etimad', action });
  }

  public musaned(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'musaned', action });
  }

  public shelter(title: string, message: string, action?: PopupNotification['action']) {
    return this.show({ title, message, type: 'shelter', action });
  }
}

export const notificationPopupEngine = new NotificationPopupEngine();

export function triggerNotification(params: { title: string; body?: string; message?: string; type?: PopupNotification['type'] }) {
  notificationPopupEngine.show({
    title: params.title,
    message: params.body || params.message || '',
    type: params.type || 'shelter',
  });
}
