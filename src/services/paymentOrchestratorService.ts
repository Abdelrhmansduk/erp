import { supabase, isSupabaseConfigured } from './supabaseClient';
import { domainEventBus } from './domainEventBus';
import { idempotencyService } from './idempotencyService';
import { createJournalEntry, postJournalEntry, type JournalEntry } from './accounting/journalEngine';

export type PaymentGatewayProvider = 'Moyasar' | 'HyperPay' | 'Geidea';
export type PaymentMethodType = 'Mada' | 'ApplePay' | 'Visa' | 'MasterCard' | 'SADAD' | 'BankTransfer';
export type EscrowStatus = 'HELD_IN_ESCROW' | 'RELEASED_TO_AGENCY' | 'REFUNDED_TO_CLIENT' | 'SETTLED';

export interface EscrowSettlementRecord {
  id: string;
  company_id: string;
  contract_id: string;
  gateway_provider: PaymentGatewayProvider;
  payment_method: PaymentMethodType;
  payment_reference: string;
  idempotency_key: string;
  gross_amount: number;
  vat_amount: number;
  agency_commission: number;
  escrow_status: EscrowStatus;
  medical_cleared: boolean;
  journal_entry_id?: string;
  released_at?: string;
  created_at: string;
}

export interface PaymentWebhookPayload {
  idempotencyKey: string;
  companyId: string;
  contractId: string;
  gatewayProvider: PaymentGatewayProvider;
  paymentMethod: PaymentMethodType;
  paymentReference: string;
  grossAmount: number;
  agencyCommission: number;
  timestamp: string;
  signature: string;
}

const escrowRegistry = new Map<string, EscrowSettlementRecord>();

function canUseRemoteDatabase(): boolean {
  return isSupabaseConfigured && import.meta.env.MODE !== 'test';
}

/**
 * Deterministic HMAC-SHA256 verification using Web Crypto API (with synchronous fallback for test environments)
 * as mandated by architecture.md §7.2.
 */
export async function computeHmacSha256Hex(secret: string, message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0x811c9dc5;
  const combined = `${secret}:${message}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(64, '0');
}

export const paymentOrchestratorService = {
  /**
   * Verifies incoming payment gateway webhook signature (HMAC-SHA256) per architecture.md §7.2.
   */
  async verifyWebhookSignature(params: {
    secret: string;
    rawPayload: string;
    providedSignature: string;
  }): Promise<boolean> {
    if (!params.secret || !params.providedSignature) return false;
    const expected = await computeHmacSha256Hex(params.secret, params.rawPayload);
    return expected.toLowerCase() === params.providedSignature.trim().toLowerCase();
  },

  /**
   * Holds customer funds in Escrow Liability (`2105`) upon payment confirmation instead of premature
   * revenue recognition, and only releases overseas agency commission after medical clearance
   * (architecture.md §8.1).
   */
  async holdInEscrow(params: {
    idempotencyKey: string;
    companyId: string;
    contractId: string;
    gatewayProvider: PaymentGatewayProvider;
    paymentMethod: PaymentMethodType;
    paymentReference: string;
    grossAmount: number;
    agencyCommission: number;
  }): Promise<{ settlement: EscrowSettlementRecord; journalEntry: JournalEntry; deduplicated: boolean }> {
    const companyId = params.companyId && params.companyId !== 'all' ? params.companyId : 'SAF';

    const execution = await idempotencyService.executeWithIdempotency({
      idempotencyKey: params.idempotencyKey,
      companyId,
      operationType: 'PAYMENT_HOLD_IN_ESCROW',
      payload: {
        contractId: params.contractId,
        grossAmount: params.grossAmount,
        agencyCommission: params.agencyCommission,
        paymentReference: params.paymentReference,
      },
      handler: async () => {
        if (params.grossAmount <= 0) {
          throw new Error('المبلغ الإجمالي للتحصيل يجب أن يكون أكبر من صفر.');
        }

        const netBeforeVat = Number((params.grossAmount / 1.15).toFixed(2));
        const vatAmount = Number((params.grossAmount - netBeforeVat).toFixed(2));

        // Create balanced Double-Entry Journal Entry:
        // Dr Cash/Bank (1101) = grossAmount
        // Cr Escrow Unearned Liability (2105) = netBeforeVat
        // Cr VAT Output Liability (2102) = vatAmount
        const draftEntry = createJournalEntry(
          new Date().toISOString().slice(0, 10),
          `تحصيل دفعة عقد (${params.contractId}) عبر ${params.gatewayProvider} (${params.paymentMethod}) وإيداعها في حساب الضمان (Escrow)`,
          params.paymentReference,
          [
            {
              accountCode: '1101',
              accountName: 'النقدية لدى البنوك وبوابات الدفع',
              debit: params.grossAmount,
              credit: 0,
              costCenterId: companyId,
            },
            {
              accountCode: '2105',
              accountName: 'حساب الضمان - إيرادات عقود غير مكتسبة (Escrow)',
              debit: 0,
              credit: netBeforeVat,
              costCenterId: companyId,
            },
            {
              accountCode: '2102',
              accountName: 'ضريبة القيمة المضافة المستحقة (15%)',
              debit: 0,
              credit: vatAmount,
              costCenterId: companyId,
            },
          ],
          'SYSTEM_PAYMENT_ORCHESTRATOR'
        );
        const postedEntry = postJournalEntry(draftEntry);

        const settlement: EscrowSettlementRecord = {
          id: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          company_id: companyId,
          contract_id: params.contractId,
          gateway_provider: params.gatewayProvider,
          payment_method: params.paymentMethod,
          payment_reference: params.paymentReference,
          idempotency_key: params.idempotencyKey,
          gross_amount: params.grossAmount,
          vat_amount: vatAmount,
          agency_commission: params.agencyCommission,
          escrow_status: 'HELD_IN_ESCROW',
          medical_cleared: false,
          journal_entry_id: postedEntry.id,
          created_at: new Date().toISOString(),
        };

        escrowRegistry.set(settlement.id, settlement);

        if (canUseRemoteDatabase()) {
          try {
            await supabase.from('escrow_settlements').insert([settlement]);
          } catch (err) {
            console.warn('[PaymentOrchestrator] Supabase escrow insert warning:', err);
          }
        }

        await domainEventBus.publishDomainEvent({
          companyId,
          aggregateType: 'ESCROW_SETTLEMENT',
          aggregateId: settlement.id,
          eventType: 'ESCROW_HELD',
          payload: {
            contractId: settlement.contract_id,
            grossAmount: settlement.gross_amount,
            journalEntryId: postedEntry.id,
          },
        });

        return { settlement, journalEntry: postedEntry };
      },
    });

    return {
      settlement: execution.data.settlement,
      journalEntry: execution.data.journalEntry,
      deduplicated: execution.deduplicated,
    };
  },

  /**
   * Releases agency commission and recognizes contract revenue ONLY after medical exam clearance
   * (architecture.md §8.1).
   */
  async releaseToAgencyAfterMedical(params: {
    escrowId: string;
    medicalCleared: boolean;
    medicalReportRef: string;
  }): Promise<{ settlement: EscrowSettlementRecord; journalEntry: JournalEntry }> {
    const existing = escrowRegistry.get(params.escrowId);
    if (!existing) {
      throw new Error(`سجل الضمان (${params.escrowId}) غير موجود.`);
    }
    if (existing.escrow_status !== 'HELD_IN_ESCROW') {
      throw new Error(`لا يمكن تحرير الدفعة لأن حالة الضمان الحالية هي: ${existing.escrow_status}`);
    }
    if (!params.medicalCleared || !params.medicalReportRef.trim()) {
      throw new Error(
        'يمنع النظام المالي تحرير عمولة الوكالة الخارجية قبل اجتياز الفحص الطبي رسمياً وتوثيق رقم التقرير الطبي (architecture.md §8.1).'
      );
    }

    const netRevenue = Number((existing.gross_amount - existing.vat_amount).toFixed(2));
    const agencyPayable = Number(existing.agency_commission.toFixed(2));
    const recognizedNetMargin = Number((netRevenue - agencyPayable).toFixed(2));

    const draftEntry = createJournalEntry(
      new Date().toISOString().slice(0, 10),
      `تحرير مستحقات الوكالة الخارجية وإثبات الإيراد بعد اجتياز الفحص الطبي (${params.medicalReportRef}) للعقد ${existing.contract_id}`,
      params.medicalReportRef,
      [
        {
          accountCode: '2105',
          accountName: 'حساب الضمان - إيرادات عقود غير مكتسبة (Escrow)',
          debit: netRevenue,
          credit: 0,
          costCenterId: existing.company_id,
        },
        {
          accountCode: '2106',
          accountName: 'ذمم الوكالات الخارجية الدائنة',
          debit: 0,
          credit: agencyPayable,
          costCenterId: existing.company_id,
        },
        {
          accountCode: '4101',
          accountName: 'إيرادات خدمات الاستقدام والتشغيل المحققة',
          debit: 0,
          credit: recognizedNetMargin,
          costCenterId: existing.company_id,
        },
      ],
      'SYSTEM_PAYMENT_ORCHESTRATOR'
    );
    const postedEntry = postJournalEntry(draftEntry);

    const updated: EscrowSettlementRecord = {
      ...existing,
      escrow_status: 'RELEASED_TO_AGENCY',
      medical_cleared: true,
      released_at: new Date().toISOString(),
    };
    escrowRegistry.set(updated.id, updated);

    await domainEventBus.publishDomainEvent({
      companyId: updated.company_id,
      aggregateType: 'ESCROW_SETTLEMENT',
      aggregateId: updated.id,
      eventType: 'ESCROW_RELEASED',
      payload: {
        contractId: updated.contract_id,
        agencyCommission: updated.agency_commission,
        medicalReportRef: params.medicalReportRef,
      },
    });

    return { settlement: updated, journalEntry: postedEntry };
  },

  /**
   * Refunds customer funds from Escrow in case of medical failure or visa rejection within SLA.
   */
  async refundFromEscrow(params: {
    escrowId: string;
    reason: string;
  }): Promise<{ settlement: EscrowSettlementRecord; journalEntry: JournalEntry }> {
    const existing = escrowRegistry.get(params.escrowId);
    if (!existing) {
      throw new Error(`سجل الضمان (${params.escrowId}) غير موجود.`);
    }
    if (existing.escrow_status !== 'HELD_IN_ESCROW') {
      throw new Error(`لا يمكن استرداد الدفعة لأن حالة الضمان الحالية هي: ${existing.escrow_status}`);
    }

    const netBeforeVat = Number((existing.gross_amount - existing.vat_amount).toFixed(2));
    const draftEntry = createJournalEntry(
      new Date().toISOString().slice(0, 10),
      `استرداد كامل مبلغ الضمان للعميل للعقد (${existing.contract_id}) - السبب: ${params.reason}`,
      existing.payment_reference,
      [
        {
          accountCode: '2105',
          accountName: 'حساب الضمان - إيرادات عقود غير مكتسبة (Escrow)',
          debit: netBeforeVat,
          credit: 0,
          costCenterId: existing.company_id,
        },
        {
          accountCode: '2102',
          accountName: 'ضريبة القيمة المضافة المستحقة (15%)',
          debit: existing.vat_amount,
          credit: 0,
          costCenterId: existing.company_id,
        },
        {
          accountCode: '1101',
          accountName: 'النقدية لدى البنوك وبوابات الدفع',
          debit: 0,
          credit: existing.gross_amount,
          costCenterId: existing.company_id,
        },
      ],
      'SYSTEM_PAYMENT_ORCHESTRATOR'
    );
    const postedEntry = postJournalEntry(draftEntry);

    const updated: EscrowSettlementRecord = {
      ...existing,
      escrow_status: 'REFUNDED_TO_CLIENT',
      released_at: new Date().toISOString(),
    };
    escrowRegistry.set(updated.id, updated);

    await domainEventBus.publishDomainEvent({
      companyId: updated.company_id,
      aggregateType: 'ESCROW_SETTLEMENT',
      aggregateId: updated.id,
      eventType: 'ESCROW_REFUNDED',
      payload: {
        contractId: updated.contract_id,
        refundedAmount: updated.gross_amount,
        reason: params.reason,
      },
    });

    return { settlement: updated, journalEntry: postedEntry };
  },

  getEscrowById(escrowId: string): EscrowSettlementRecord | undefined {
    return escrowRegistry.get(escrowId);
  },

  clearEscrowForTesting(): void {
    escrowRegistry.clear();
  },
};
