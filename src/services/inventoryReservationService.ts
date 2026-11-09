import { supabase, isSupabaseConfigured } from './supabaseClient';
import { domainEventBus } from './domainEventBus';

export type ReservationState = 'AVAILABLE' | 'SOFT_LOCKED' | 'CONTRACTED';

export interface InventorySoftLease {
  resourceId: string;
  resourceType: 'CV' | 'RENTAL_WORKER' | 'HEADHUNT_CANDIDATE';
  companyId: string;
  lockedByUserId: string;
  reservationState: ReservationState;
  acquiredAt: string;
  leaseExpiresAt: string;
  contractId?: string;
}

/**
 * 15-Minute Soft Lease Lock duration as mandated by architecture.md §6.1.
 */
export const SOFT_LEASE_DURATION_MS = 15 * 60 * 1000;

const leaseRegistry = new Map<string, InventorySoftLease>();

function canUseRemoteDatabase(): boolean {
  return isSupabaseConfigured && import.meta.env.MODE !== 'test';
}

export const inventoryReservationService = {
  /**
   * Acquires a 15-minute Soft Lease Lock on a CV or worker resource to prevent double-booking
   * while a customer is completing contract terms and payment (architecture.md §6.1).
   */
  async acquireSoftLease(params: {
    resourceId: string;
    resourceType?: 'CV' | 'RENTAL_WORKER' | 'HEADHUNT_CANDIDATE';
    companyId: string;
    userId: string;
    durationMs?: number;
    nowMs?: number;
  }): Promise<InventorySoftLease> {
    const nowMs = params.nowMs ?? Date.now();
    this.releaseExpiredLeases(nowMs);

    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'SAF';
    const existing = leaseRegistry.get(params.resourceId);

    if (existing) {
      if (existing.reservationState === 'CONTRACTED') {
        throw new Error(`العنصر (${params.resourceId}) مرتبط بعقد نشط ولا يمكن حجزه.`);
      }
      const expiresMs = new Date(existing.leaseExpiresAt).getTime();
      if (
        existing.reservationState === 'SOFT_LOCKED' &&
        expiresMs > nowMs &&
        existing.lockedByUserId !== params.userId
      ) {
        const remainingMinutes = Math.max(1, Math.ceil((expiresMs - nowMs) / 60000));
        throw new Error(
          `السيرة الذاتية (${params.resourceId}) محجوزة مؤقتاً لعميل آخر حالياً. تنتهي مهلة الحجز خلال ${remainingMinutes} دقيقة.`
        );
      }
    }

    const durationMs = params.durationMs ?? SOFT_LEASE_DURATION_MS;
    const lease: InventorySoftLease = {
      resourceId: params.resourceId,
      resourceType: params.resourceType ?? 'CV',
      companyId,
      lockedByUserId: params.userId,
      reservationState: 'SOFT_LOCKED',
      acquiredAt: new Date(nowMs).toISOString(),
      leaseExpiresAt: new Date(nowMs + durationMs).toISOString(),
    };

    leaseRegistry.set(params.resourceId, lease);

    if (canUseRemoteDatabase() && lease.resourceType === 'CV') {
      try {
        await supabase
          .from('cvs')
          .update({
            lease_locked_by: lease.lockedByUserId,
            lease_expires_at: lease.leaseExpiresAt,
            reservation_state: 'SOFT_LOCKED',
          })
          .eq('id', lease.resourceId)
          .eq('company_id', companyId);
      } catch (err) {
        console.warn('[InventoryReservationService] Supabase lease update warning:', err);
      }
    }

    await domainEventBus.publishDomainEvent({
      companyId,
      aggregateType: lease.resourceType,
      aggregateId: lease.resourceId,
      eventType: 'SOFT_LEASE_ACQUIRED',
      payload: {
        lockedByUserId: lease.lockedByUserId,
        leaseExpiresAt: lease.leaseExpiresAt,
      },
    });

    return lease;
  },

  /**
   * Commits an active soft lease into a permanent CONTRACTED state upon successful payment/signing.
   */
  async commitLease(params: {
    resourceId: string;
    userId: string;
    contractId: string;
    nowMs?: number;
  }): Promise<InventorySoftLease> {
    const nowMs = params.nowMs ?? Date.now();
    this.releaseExpiredLeases(nowMs);

    const existing = leaseRegistry.get(params.resourceId);
    if (!existing) {
      throw new Error(`لا يوجد حجز نشط للعنصر (${params.resourceId}) لإتمام التعاقد.`);
    }
    if (existing.reservationState === 'CONTRACTED') {
      throw new Error(`العنصر (${params.resourceId}) تم التعاقد عليه مسبقاً.`);
    }
    if (existing.lockedByUserId !== params.userId) {
      throw new Error(`لا يملك المستخدم (${params.userId}) صلاحية تأكيد حجز العنصر (${params.resourceId}).`);
    }

    const updated: InventorySoftLease = {
      ...existing,
      reservationState: 'CONTRACTED',
      contractId: params.contractId,
    };
    leaseRegistry.set(params.resourceId, updated);

    if (canUseRemoteDatabase() && updated.resourceType === 'CV') {
      try {
        await supabase
          .from('cvs')
          .update({
            reservation_state: 'CONTRACTED',
            status: 'Selected',
          })
          .eq('id', updated.resourceId)
          .eq('company_id', updated.companyId);
      } catch (err) {
        console.warn('[InventoryReservationService] Supabase commit lease warning:', err);
      }
    }

    return updated;
  },

  /**
   * Explicitly releases a soft lease (e.g. when user cancels checkout).
   */
  async releaseLease(resourceId: string, userId?: string): Promise<boolean> {
    const existing = leaseRegistry.get(resourceId);
    if (!existing) return false;
    if (existing.reservationState === 'CONTRACTED') {
      throw new Error(`لا يمكن إلغاء الحجز المؤقت بعد تحوله إلى عقد رسمي (${existing.contractId}).`);
    }
    if (userId && existing.lockedByUserId !== userId) {
      throw new Error('غير مصرح بإلغاء حجز مستخدم آخر.');
    }

    leaseRegistry.delete(resourceId);

    if (canUseRemoteDatabase() && existing.resourceType === 'CV') {
      try {
        await supabase
          .from('cvs')
          .update({
            lease_locked_by: null,
            lease_expires_at: null,
            reservation_state: 'AVAILABLE',
          })
          .eq('id', resourceId)
          .eq('company_id', existing.companyId);
      } catch (err) {
        console.warn('[InventoryReservationService] Supabase release lease warning:', err);
      }
    }

    return true;
  },

  /**
   * Releases all expired soft leases whose 15-minute window has elapsed.
   */
  releaseExpiredLeases(nowMs: number = Date.now()): string[] {
    const expiredIds: string[] = [];
    for (const [resourceId, lease] of leaseRegistry.entries()) {
      if (
        lease.reservationState === 'SOFT_LOCKED' &&
        new Date(lease.leaseExpiresAt).getTime() <= nowMs
      ) {
        expiredIds.push(resourceId);
        leaseRegistry.delete(resourceId);
        void domainEventBus.publishDomainEvent({
          companyId: lease.companyId,
          aggregateType: lease.resourceType,
          aggregateId: resourceId,
          eventType: 'SOFT_LEASE_EXPIRED',
          payload: { expiredAt: new Date(nowMs).toISOString() },
        });
      }
    }
    return expiredIds;
  },

  /**
   * Returns current reservation status for a CV/resource.
   */
  getLeaseStatus(
    resourceId: string,
    nowMs: number = Date.now()
  ): { state: ReservationState; lease?: InventorySoftLease; remainingSeconds: number } {
    this.releaseExpiredLeases(nowMs);
    const lease = leaseRegistry.get(resourceId);
    if (!lease) {
      return { state: 'AVAILABLE', remainingSeconds: 0 };
    }
    if (lease.reservationState === 'CONTRACTED') {
      return { state: 'CONTRACTED', lease, remainingSeconds: 0 };
    }
    const remainingMs = Math.max(0, new Date(lease.leaseExpiresAt).getTime() - nowMs);
    return {
      state: remainingMs > 0 ? 'SOFT_LOCKED' : 'AVAILABLE',
      lease: remainingMs > 0 ? lease : undefined,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    };
  },

  clearRegistryForTesting(): void {
    leaseRegistry.clear();
  },
};
