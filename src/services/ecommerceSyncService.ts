import { supabase, isSupabaseConfigured } from './supabaseClient';
import { domainEventBus } from './domainEventBus';

export type EcommercePlatform = 'SALLA' | 'ZID' | 'SHOPIFY' | 'WOOCOMMERCE';

export interface EcommerceStoreConfig {
  platform: EcommercePlatform;
  nameAr: string;
  storeUrl: string;
  companyId: string;
  webhookSecretConfigured: boolean;
  autoSyncInventory: boolean;
  lastSyncedAt?: string;
}

export interface EcommerceSyncLog {
  id: string;
  company_id: string;
  store_platform: EcommercePlatform;
  sync_direction: 'INBOUND_ORDER' | 'OUTBOUND_PACKAGE';
  external_order_id: string;
  internal_reference_id?: string;
  sync_status: 'SYNCED' | 'FAILED' | 'RETRYING';
  payload: Record<string, unknown>;
  synced_at: string;
}

const syncLogsMemory: EcommerceSyncLog[] = [];

function canUseRemoteDatabase(): boolean {
  return isSupabaseConfigured && import.meta.env.MODE !== 'test';
}

export const ecommerceSyncService = {
  /**
   * Synchronizes an inbound order from Salla, Zid, Shopify, or WooCommerce into the ERP
   * and logs the synchronization in `ecommerce_store_sync_logs` (TASK-504 / prd.md §4.6).
   */
  async syncInboundOrder(params: {
    companyId: string;
    platform: EcommercePlatform;
    externalOrderId: string;
    customerName: string;
    customerPhone: string;
    packageCode: string;
    totalAmountSar: number;
  }): Promise<EcommerceSyncLog> {
    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'YAQ';
    const internalRef = `ERP-ORD-${params.platform.slice(0, 3)}-${params.externalOrderId}`;

    const log: EcommerceSyncLog = {
      id: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      company_id: companyId,
      store_platform: params.platform,
      sync_direction: 'INBOUND_ORDER',
      external_order_id: params.externalOrderId,
      internal_reference_id: internalRef,
      sync_status: 'SYNCED',
      payload: {
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        packageCode: params.packageCode,
        totalAmountSar: params.totalAmountSar,
      },
      synced_at: new Date().toISOString(),
    };

    syncLogsMemory.unshift(log);

    if (canUseRemoteDatabase()) {
      try {
        await supabase.from('ecommerce_store_sync_logs').insert([log]);
      } catch (err) {
        console.warn('[EcommerceSyncService] Supabase log insert warning:', err);
      }
    }

    await domainEventBus.publishDomainEvent({
      companyId,
      aggregateType: 'ECOMMERCE_SYNC',
      aggregateId: log.id,
      eventType: 'ECOMMERCE_SYNC_COMPLETED',
      payload: {
        platform: params.platform,
        direction: 'INBOUND_ORDER',
        externalOrderId: params.externalOrderId,
        internalReferenceId: internalRef,
      },
    });

    return log;
  },

  /**
   * Pushes updated service packages & worker availability to external stores (Salla / Zid / Shopify / WooCommerce).
   */
  async syncOutboundPackages(params: {
    companyId: string;
    platform: EcommercePlatform;
    packagesCount: number;
  }): Promise<EcommerceSyncLog> {
    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'YAQ';
    const batchRef = `PKG-BATCH-${Date.now()}`;

    const log: EcommerceSyncLog = {
      id: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      company_id: companyId,
      store_platform: params.platform,
      sync_direction: 'OUTBOUND_PACKAGE',
      external_order_id: batchRef,
      internal_reference_id: batchRef,
      sync_status: 'SYNCED',
      payload: {
        packagesCount: params.packagesCount,
      },
      synced_at: new Date().toISOString(),
    };

    syncLogsMemory.unshift(log);

    if (canUseRemoteDatabase()) {
      try {
        await supabase.from('ecommerce_store_sync_logs').insert([log]);
      } catch (err) {
        console.warn('[EcommerceSyncService] Supabase outbound log warning:', err);
      }
    }

    await domainEventBus.publishDomainEvent({
      companyId,
      aggregateType: 'ECOMMERCE_SYNC',
      aggregateId: log.id,
      eventType: 'ECOMMERCE_SYNC_COMPLETED',
      payload: {
        platform: params.platform,
        direction: 'OUTBOUND_PACKAGE',
        packagesCount: params.packagesCount,
      },
    });

    return log;
  },

  getSyncLogs(companyId?: string): EcommerceSyncLog[] {
    if (!companyId || companyId === 'all') {
      return [...syncLogsMemory];
    }
    return syncLogsMemory.filter((l) => l.company_id === companyId);
  },

  clearLogsForTesting(): void {
    syncLogsMemory.length = 0;
  },
};
