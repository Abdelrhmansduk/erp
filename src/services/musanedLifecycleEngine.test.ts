import { describe, it, expect } from 'vitest';
import {
  musanedLifecycleEngine,
  MusanedContractMetadata,
  MusanedWebhookPayload,
} from './musanedLifecycleEngine';

const SAMPLE_CONTRACT: MusanedContractMetadata = {
  musanedContractNumber: 'MSN-2026-88990',
  visaNumber: 'VISA-MHRSD-998811',
  workerPassport: 'EP9900881',
  workerName: 'SARA ADDISI',
  clientNationalId: '1092837410',
  clientName: 'بندر صالح الهويريني',
  companyId: 'SAF',
  recruitmentFee: 14000,
  vatAmount: 2100,
  insuranceFee: 450,
  signedDate: '2026-08-01',
  maxSlaDays: 90,
  daysElapsed: 4,
};

describe('Musaned Lifecycle & Legal Refund Engine', () => {
  it('should grant 100% refund during initial cooling off period (<= 5 days)', () => {
    const result = musanedLifecycleEngine.calculateLegalRefund(
      { ...SAMPLE_CONTRACT, daysElapsed: 3 },
      'client',
      'تراجع العميل خلال المهلة النظامية'
    );

    expect(result.eligibleForRefund).toBe(true);
    expect(result.refundPercentage).toBe(100);
    expect(result.netRefundAmount).toBe(14000);
    expect(result.adminFeeDeduction).toBe(0);
  });

  it('should deduct 5% legal administrative fee within first 30 days of contract', () => {
    const result = musanedLifecycleEngine.calculateLegalRefund(
      { ...SAMPLE_CONTRACT, daysElapsed: 20 },
      'client',
      'طلب إلغاء العقد بعد 20 يوماً'
    );

    expect(result.eligibleForRefund).toBe(true);
    expect(result.refundPercentage).toBe(95);
    expect(result.adminFeeDeduction).toBe(700); // 5% of 14,000
    expect(result.netRefundAmount).toBe(13300); // 14,000 - 700
  });

  it('should grant 100% refund if office delays past 90 days SLA limit', () => {
    const result = musanedLifecycleEngine.calculateLegalRefund(
      { ...SAMPLE_CONTRACT, daysElapsed: 95 },
      'client',
      'تجاوز المهلة النظامية القصوى 90 يوماً'
    );

    expect(result.eligibleForRefund).toBe(true);
    expect(result.refundPercentage).toBe(100);
    expect(result.netRefundAmount).toBe(14000);
  });

  it('should grant 100% refund if worker refuses to work or fails medical abroad', () => {
    const result = musanedLifecycleEngine.calculateLegalRefund(
      { ...SAMPLE_CONTRACT, daysElapsed: 45 },
      'worker_refusal',
      'رفض العاملة السفر في بلد الإرسال'
    );

    expect(result.eligibleForRefund).toBe(true);
    expect(result.refundPercentage).toBe(100);
    expect(result.netRefundAmount).toBe(14000);
  });

  it('should process Musaned Webhook events accurately', () => {
    const webhookPayload: MusanedWebhookPayload = {
      eventId: 'evt-1001',
      eventType: 'PAYMENT_RECEIVED',
      musanedContractNumber: 'MSN-2026-88990',
      timestamp: new Date().toISOString(),
      details: {
        paidAmount: 16100,
        paymentGateway: 'MADA',
      },
    };

    const action = musanedLifecycleEngine.processMusanedWebhook(webhookPayload);
    expect(action.nextStage).toBe('client_paid');
    expect(action.auditAction).toBe('MUSANED_PAYMENT_CAPTURED');
    expect(action.notificationTitle).toContain('سداد رسوم الاستقدام');
  });
});
