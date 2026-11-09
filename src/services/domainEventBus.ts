import { supabase, isSupabaseConfigured } from './supabaseClient';

export type DomainEventType =
  | 'CONTRACT_CREATED'
  | 'CONTRACT_STAGE_CHANGED'
  | 'INVOICE_CLEARED'
  | 'ESCROW_HELD'
  | 'ESCROW_RELEASED'
  | 'ESCROW_REFUNDED'
  | 'SOFT_LEASE_ACQUIRED'
  | 'SOFT_LEASE_EXPIRED'
  | 'JOURNAL_ENTRY_POSTED'
  | 'JOURNAL_ENTRY_REVERSED'
  | 'BANK_GUARANTEE_ISSUED'
  | 'ECOMMERCE_SYNC_COMPLETED';

export type OutboxEventStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface DomainOutboxEvent<TPayload = Record<string, unknown>> {
  id: string;
  company_id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: DomainEventType | string;
  payload: TPayload;
  status: OutboxEventStatus;
  retry_count: number;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

type EventSubscriber<TPayload = Record<string, unknown>> = (
  event: DomainOutboxEvent<TPayload>
) => Promise<void> | void;

const subscribers = new Map<string, Set<EventSubscriber>>();
const localOutboxStore: DomainOutboxEvent[] = [];

function canUseRemoteDatabase(): boolean {
  return isSupabaseConfigured && import.meta.env.MODE !== 'test';
}

export const domainEventBus = {
  /**
   * Subscribes an asynchronous handler to a specific domain event type (or '*' for all events).
   */
  subscribe<TPayload = Record<string, unknown>>(
    eventType: DomainEventType | '*' | string,
    handler: EventSubscriber<TPayload>
  ): () => void {
    const bucket = subscribers.get(eventType) || new Set<EventSubscriber>();
    bucket.add(handler as EventSubscriber);
    subscribers.set(eventType, bucket);

    return () => {
      const current = subscribers.get(eventType);
      if (current) {
        current.delete(handler as EventSubscriber);
      }
    };
  },

  /**
   * Publishes a domain event using the Transactional Outbox Pattern (architecture.md §2.3).
   * Persists the event in `domain_outbox_events` and triggers registered subscribers.
   */
  async publishDomainEvent<TPayload extends Record<string, unknown>>(params: {
    companyId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: DomainEventType | string;
    payload: TPayload;
  }): Promise<DomainOutboxEvent<TPayload>> {
    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'SAF';
    const now = new Date().toISOString();
    const outboxEvent: DomainOutboxEvent<TPayload> = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      company_id: companyId,
      aggregate_type: params.aggregateType,
      aggregate_id: params.aggregateId,
      event_type: params.eventType,
      payload: params.payload,
      status: 'PENDING',
      retry_count: 0,
      created_at: now,
    };

    localOutboxStore.unshift(outboxEvent);

    if (canUseRemoteDatabase()) {
      try {
        await supabase.from('domain_outbox_events').insert([
          {
            company_id: outboxEvent.company_id,
            aggregate_type: outboxEvent.aggregate_type,
            aggregate_id: outboxEvent.aggregate_id,
            event_type: outboxEvent.event_type,
            payload: outboxEvent.payload,
            status: 'PENDING',
            retry_count: 0,
          },
        ]);
      } catch (err) {
        console.warn('[DomainEventBus] Outbox DB insert warning:', err);
      }
    }

    await this.dispatchEvent(outboxEvent);
    return outboxEvent;
  },

  /**
   * Dispatches an outbox event to in-memory subscribers and updates its status.
   */
  async dispatchEvent<TPayload = Record<string, unknown>>(
    event: DomainOutboxEvent<TPayload>
  ): Promise<void> {
    const specificHandlers = subscribers.get(event.event_type) || new Set();
    const wildcardHandlers = subscribers.get('*') || new Set();
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    event.status = 'PROCESSING';
    try {
      for (const handler of allHandlers) {
        await handler(event as DomainOutboxEvent);
      }
      event.status = 'PROCESSED';
      event.processed_at = new Date().toISOString();
    } catch (error) {
      event.retry_count += 1;
      event.status = 'FAILED';
      event.error_message = error instanceof Error ? error.message : String(error);
      throw error;
    }
  },

  /**
   * Flushes any pending or failed events in the outbox (up to maxRetries).
   */
  async flushOutbox(companyId?: string, maxRetries = 3): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    const candidates = localOutboxStore.filter(
      (evt) =>
        (evt.status === 'PENDING' || (evt.status === 'FAILED' && evt.retry_count < maxRetries)) &&
        (!companyId || companyId === 'all' || evt.company_id === companyId)
    );

    for (const evt of candidates) {
      try {
        await this.dispatchEvent(evt);
        processed += 1;
      } catch {
        failed += 1;
      }
    }

    return { processed, failed };
  },

  /**
   * Returns outbox events scoped to the requested company.
   */
  getOutboxEvents(companyId?: string): DomainOutboxEvent[] {
    if (!companyId || companyId === 'all') {
      return [...localOutboxStore];
    }
    return localOutboxStore.filter((evt) => evt.company_id === companyId);
  },

  /**
   * Clears in-memory store (used in unit testing).
   */
  clearStoreForTesting(): void {
    localOutboxStore.length = 0;
    subscribers.clear();
  },
};
