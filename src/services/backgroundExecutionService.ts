/**
 * backgroundExecutionService.ts
 * Enterprise Mobile & Background Execution Orchestrator
 * Handles:
 *  1. Non-throttled Web Worker Background Heartbeat (immune to mobile tab background timer throttling)
 *  2. Service Worker Background Sync (`alsulaim-erp-offline-sync`) & Periodic Sync (`alsulaim-erp-periodic-check`)
 *  3. Page Visibility (`visibilitychange`), `pageshow`, and Network (`online` / `offline`) Auto-Recovery
 *  4. Screen Wake Lock API (`navigator.wakeLock`) for uninterrupted mobile field/dispatch operations
 *  5. Domain Event Bus -> Native Background Notification Bridge
 */

import { offlineQueueService, QueuedOfflineMutation } from './offlineQueueService';
import { domainEventBus } from './domainEventBus';
import { notificationPopupEngine } from './notificationPopupEngine';
import { useAppStore, syncAppBadgeCount } from '../stores/appStore';

export interface BackgroundExecutionState {
  isOnline: boolean;
  visibilityState: 'visible' | 'hidden';
  wakeLockActive: boolean;
  pendingOfflineCount: number;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
  totalBackgroundSyncs: number;
  serviceWorkerReady: boolean;
}

type BackgroundStateListener = (state: BackgroundExecutionState) => void;

class BackgroundExecutionService {
  private state: BackgroundExecutionState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    visibilityState:
      typeof document !== 'undefined' && document.visibilityState === 'hidden'
        ? 'hidden'
        : 'visible',
    wakeLockActive: false,
    pendingOfflineCount: 0,
    lastHeartbeatAt: null,
    lastSyncAt: null,
    totalBackgroundSyncs: 0,
    serviceWorkerReady: false,
  };

  private listeners: Set<BackgroundStateListener> = new Set();
  private worker: Worker | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private wakeLockSentinel: { release: () => Promise<void>; addEventListener?: (type: string, fn: () => void) => void } | null = null;
  private wantWakeLock = false;
  private initialized = false;
  private cleanupFns: Array<() => void> = [];

  public getState(): BackgroundExecutionState {
    return { ...this.state };
  }

  public subscribe(listener: BackgroundStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(patch: Partial<BackgroundExecutionState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  /**
   * Initializes all background execution channels, Web Worker heartbeat, Service Worker listeners,
   * visibility/network recovery hooks, and domain event notification bridges.
   */
  public start(): () => void {
    if (this.initialized) {
      return () => this.stop();
    }
    this.initialized = true;

    // 1. Subscribe to OfflineQueueService changes
    const unsubQueue = offlineQueueService.subscribe((queue) => {
      const pending = queue.filter((i) => i.status === 'QUEUED').length;
      this.updateState({ pendingOfflineCount: pending });
    });
    this.cleanupFns.push(unsubQueue);

    // 2. Subscribe to DomainEventBus wildcard events to trigger background push notifications
    const unsubDomainEvents = domainEventBus.subscribe('*', (event) => {
      const isHidden =
        typeof document !== 'undefined' && document.visibilityState === 'hidden';

      const titleMap: Record<string, string> = {
        CONTRACT_CREATED: 'تم إنشاء عقد استقدام جديد',
        CONTRACT_STAGE_CHANGED: 'تحديث مرحلة عقد في مساند',
        INVOICE_CLEARED: 'اعتماد فاتورة إلكترونية ZATCA Phase 2',
        ESCROW_HELD: 'إيداع مبلغ في حساب الضمان',
        ESCROW_RELEASED: 'تحرير دفعة من حساب الضمان',
        BANK_GUARANTEE_ISSUED: 'إصدار خطاب ضمان بنكي لمنافسة',
        ECOMMERCE_SYNC_COMPLETED: 'اكتمال مزامنة المتاجر الإلكترونية',
      };

      const title = titleMap[event.event_type] || `تحديث نظام (${event.event_type})`;
      const message = `المرجع: ${event.aggregate_id} • الكيان: ${event.company_id}`;

      if (isHidden) {
        // When app is in background on mobile, immediately dispatch OS/ServiceWorker Notification
        notificationPopupEngine.info(title, message, {
          label: 'عرض التفاصيل',
          tabKey: event.event_type === 'INVOICE_CLEARED' ? 'zatca' : 'dashboard',
        });
      }
    });
    this.cleanupFns.push(unsubDomainEvents);

    if (typeof window === 'undefined') {
      return () => this.stop();
    }

    // 3. Network Online / Offline Listeners
    const handleOnline = () => {
      this.updateState({ isOnline: true });
      void this.flushBackgroundQueues('network-restored');
    };

    const handleOffline = () => {
      this.updateState({ isOnline: false });
      notificationPopupEngine.warning(
        'وضع العمل بدون اتصال (Offline Mode)',
        'يستمر النظام بالعمل في الخلفية وحفظ جميع العمليات في طابور المزامنة المشفر تلقائياً.'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    this.cleanupFns.push(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });

    // 4. Page Visibility & Mobile App Resume Listeners
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === 'hidden';
      this.updateState({
        visibilityState: isHidden ? 'hidden' : 'visible',
        lastHeartbeatAt: new Date().toISOString(),
      });

      if (isHidden) {
        // App moved to background on phone: sync badge count & register SW background sync
        syncAppBadgeCount(useAppStore.getState().unreadCount);
        this.registerServiceWorkerSync();
      } else {
        // App returned to foreground on phone: flush queues & re-acquire Wake Lock if desired
        syncAppBadgeCount(useAppStore.getState().unreadCount);
        void this.flushBackgroundQueues('app-resumed');
        if (this.wantWakeLock) {
          void this.requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handleVisibilityChange);
    this.cleanupFns.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handleVisibilityChange);
    });

    // 5. Service Worker Message Bridge (Background Sync & Periodic Sync Wakeups)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          this.updateState({ serviceWorkerReady: true });
        })
        .catch(() => {});

      const handleSwMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'PROCESS_OFFLINE_QUEUE') {
          void this.flushBackgroundQueues('sw-background-sync');
        } else if (data.type === 'PERIODIC_BACKGROUND_HEARTBEAT') {
          this.updateState({ lastHeartbeatAt: data.timestamp || new Date().toISOString() });
          void this.flushBackgroundQueues('sw-periodic-sync');
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      this.cleanupFns.push(() => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      });
    }

    // 6. Start Non-Throttled Web Worker Background Heartbeat
    this.startHeartbeatWorker();

    return () => this.stop();
  }

  private startHeartbeatWorker(): void {
    if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return;

    try {
      if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const workerCode = `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data === 'START') {
              if (timer) clearInterval(timer);
              timer = setInterval(function() {
                self.postMessage({ type: 'HEARTBEAT_TICK', timestamp: new Date().toISOString() });
              }, 25000);
            } else if (e.data === 'STOP') {
              if (timer) clearInterval(timer);
              timer = null;
            }
          };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);
        this.worker.onmessage = (e) => {
          if (e.data?.type === 'HEARTBEAT_TICK') {
            this.onBackgroundHeartbeat(e.data.timestamp);
          }
        };
        this.worker.postMessage('START');
        return;
      }
    } catch {
      // Fallback to standard interval if Blob Worker is blocked by CSP
    }

    this.fallbackTimer = setInterval(() => {
      this.onBackgroundHeartbeat(new Date().toISOString());
    }, 25000);
  }

  private onBackgroundHeartbeat(timestamp: string): void {
    this.updateState({
      lastHeartbeatAt: timestamp,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    });

    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'KEEP_ALIVE_PING' });
    }

    if (this.state.isOnline && offlineQueueService.getPendingCount() > 0) {
      void this.flushBackgroundQueues('worker-heartbeat');
    }
  }

  /**
   * Flushes both OfflineQueueService and DomainEventBus outbox in the background
   */
  public async flushBackgroundQueues(
    reason: string = 'manual'
  ): Promise<{ syncedMutations: number; processedEvents: number }> {
    if (!this.state.isOnline) {
      return { syncedMutations: 0, processedEvents: 0 };
    }

    const pendingBefore = offlineQueueService.getPendingCount();

    const queueResult = await offlineQueueService.processQueue(async (item: QueuedOfflineMutation) => {
      // Publish queued offline mutation to DomainEventBus outbox for persistence
      await domainEventBus.publishDomainEvent({
        companyId: item.companyId,
        aggregateType: 'OFFLINE_MUTATION',
        aggregateId: item.id,
        eventType: item.operationType,
        payload: item.payload,
      });
    });

    const outboxResult = await domainEventBus.flushOutbox();

    const now = new Date().toISOString();
    const totalSynced = queueResult.synced + outboxResult.processed;

    this.updateState({
      lastSyncAt: now,
      pendingOfflineCount: queueResult.remaining,
      totalBackgroundSyncs: this.state.totalBackgroundSyncs + (totalSynced > 0 ? 1 : 0),
    });

    if (pendingBefore > 0 && queueResult.synced > 0) {
      notificationPopupEngine.success(
        'تمت المزامنة الخلفية بنجاح',
        `تمت مزامنة (${queueResult.synced}) عمليات محفوظة في الخلفية (${reason}).`
      );
    }

    return {
      syncedMutations: queueResult.synced,
      processedEvents: outboxResult.processed,
    };
  }

  /**
   * Requests Service Worker Background Sync registration
   */
  public registerServiceWorkerSync(): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REGISTER_BACKGROUND_SYNC',
          tag: 'alsulaim-erp-offline-sync',
        });
      }
    } catch {
      // ignore
    }
  }

  /**
   * Requests Screen Wake Lock so mobile screen does not sleep during active field/voice operations
   */
  public async requestWakeLock(): Promise<boolean> {
    this.wantWakeLock = true;
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        const navWithWake = navigator as Navigator & {
          wakeLock: {
            request: (type: 'screen') => Promise<{
              release: () => Promise<void>;
              addEventListener?: (type: string, fn: () => void) => void;
            }>;
          };
        };
        this.wakeLockSentinel = await navWithWake.wakeLock.request('screen');
        this.updateState({ wakeLockActive: true });
        if (this.wakeLockSentinel.addEventListener) {
          this.wakeLockSentinel.addEventListener('release', () => {
            this.updateState({ wakeLockActive: false });
          });
        }
        return true;
      }
    } catch {
      // WakeLock may fail if battery saver is active or tab is hidden
    }
    this.updateState({ wakeLockActive: false });
    return false;
  }

  public async releaseWakeLock(): Promise<void> {
    this.wantWakeLock = false;
    try {
      if (this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
    } catch {
      // ignore
    }
    this.updateState({ wakeLockActive: false });
  }

  public async toggleWakeLock(): Promise<boolean> {
    if (this.state.wakeLockActive) {
      await this.releaseWakeLock();
      return false;
    }
    return this.requestWakeLock();
  }

  public stop(): void {
    if (this.worker) {
      this.worker.postMessage('STOP');
      this.worker.terminate();
      this.worker = null;
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.initialized = false;
  }
}

export const backgroundExecutionService = new BackgroundExecutionService();
