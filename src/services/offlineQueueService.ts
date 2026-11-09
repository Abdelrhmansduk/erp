/**
 * Offline Mutation Queue with Exponential Backoff (`1s -> 2s -> 4s -> 8s -> 16s`)
 * Blueprint: TASK-604 & architecture.md §7.2
 * Supports field drivers (`YAQ`), shelter supervisors (`DAR`), and mobile operators in areas with intermittent connectivity.
 */

export interface QueuedOfflineMutation<TPayload = Record<string, unknown>> {
  id: string;
  companyId: string;
  operationType: string;
  payload: TPayload;
  attemptCount: number;
  maxAttempts: number;
  nextRetryDelayMs: number;
  status: 'QUEUED' | 'SYNCED' | 'DEAD_LETTER';
  createdAt: string;
  lastError?: string;
}

export type OfflineQueueSubscriber = (queue: QueuedOfflineMutation[]) => void;

const OFFLINE_QUEUE_STORAGE_KEY = 'ALSULAIM_ERP_OFFLINE_MUTATION_QUEUE_V1';

/**
 * Computes exponential backoff delay in milliseconds: `1000 * 2^attempt` (1s, 2s, 4s, 8s, 16s).
 */
export function computeExponentialBackoffMs(attemptIndex: number, baseDelayMs = 1000, maxDelayMs = 32000): number {
  const safeAttempt = Math.max(0, attemptIndex);
  return Math.min(maxDelayMs, baseDelayMs * Math.pow(2, safeAttempt));
}

class OfflineQueueService {
  private queue: QueuedOfflineMutation[] = [];
  private listeners: Set<OfflineQueueSubscriber> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = [...this.queue];
    this.listeners.forEach((fn) => fn(snapshot));
  }

  public subscribe(listener: OfflineQueueSubscriber): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private requestServiceWorkerBackgroundSync(): void {
    try {
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'REGISTER_BACKGROUND_SYNC',
          tag: 'alsulaim-erp-offline-sync',
        });
      }
    } catch {
      // Ignore if SW is not active
    }
  }

  public enqueue<TPayload extends Record<string, unknown>>(params: {
    companyId: string;
    operationType: string;
    payload: TPayload;
    maxAttempts?: number;
  }): QueuedOfflineMutation<TPayload> {
    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'SAF';
    const item: QueuedOfflineMutation<TPayload> = {
      id: `OFFQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      companyId,
      operationType: params.operationType,
      payload: params.payload,
      attemptCount: 0,
      maxAttempts: params.maxAttempts ?? 5,
      nextRetryDelayMs: computeExponentialBackoffMs(0),
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    };

    this.queue.push(item);
    this.saveToStorage();
    this.requestServiceWorkerBackgroundSync();
    return item;
  }

  public async processQueue(
    executor: (item: QueuedOfflineMutation) => Promise<void>
  ): Promise<{ synced: number; deadLettered: number; remaining: number }> {
    let synced = 0;
    let deadLettered = 0;

    for (const item of this.queue) {
      if (item.status !== 'QUEUED') continue;

      try {
        await executor(item);
        item.status = 'SYNCED';
        synced += 1;
      } catch (err) {
        item.attemptCount += 1;
        item.lastError = err instanceof Error ? err.message : String(err);
        if (item.attemptCount >= item.maxAttempts) {
          item.status = 'DEAD_LETTER';
          deadLettered += 1;
        } else {
          item.nextRetryDelayMs = computeExponentialBackoffMs(item.attemptCount);
        }
      }
    }

    const remaining = this.queue.filter((i) => i.status === 'QUEUED').length;
    this.saveToStorage();
    return { synced, deadLettered, remaining };
  }

  public getQueuedItems(companyId?: string): QueuedOfflineMutation[] {
    if (!companyId || companyId === 'all') {
      return [...this.queue];
    }
    return this.queue.filter((i) => i.companyId === companyId);
  }

  public getPendingCount(companyId?: string): number {
    return this.getQueuedItems(companyId).filter((i) => i.status === 'QUEUED').length;
  }

  public clearQueueForTesting(): void {
    this.queue = [];
    this.saveToStorage();
  }
}

export const offlineQueueService = new OfflineQueueService();
