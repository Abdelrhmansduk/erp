import { describe, it, expect, beforeEach } from 'vitest';
import { domainEventBus } from './domainEventBus';
import { idempotencyService } from './idempotencyService';
import { inventoryReservationService, SOFT_LEASE_DURATION_MS } from './inventoryReservationService';
import { paymentOrchestratorService, computeHmacSha256Hex } from './paymentOrchestratorService';
import { maskNationalId, maskPassport, maskIban, maskPhone, maskSensitiveRecord } from '../utils/pdplMasking';
import { musanedLifecycleEngine } from './musanedLifecycleEngine';
import { fleetDispatchEngine } from './fleetDispatchEngine';
import {
  createBankGuarantee,
  checkExpiringBankGuarantees,
  benchmarkBoqItemPricing,
} from './tenderAnalyticsService';
import { chainZatcaInvoices, ZATCA_GENESIS_PIH } from './zatcaPhase2Service';
import { journalEngine } from './accounting/journalEngine';
import { ecommerceSyncService } from './ecommerceSyncService';
import { offlineQueueService, computeExponentialBackoffMs } from './offlineQueueService';
import {
  authService,
  setLockedSessionCompany,
  getLockedSessionCompany,
  UserProfile,
} from './authService';
import { normalizePortalRouteCode, useAppStore } from '../stores/appStore';
import { notificationPopupEngine } from './notificationPopupEngine';
import { backgroundExecutionService } from './backgroundExecutionService';

describe('Enterprise Shared Kernel & Domain Engines Verification Suite', () => {
  beforeEach(() => {
    domainEventBus.clearStoreForTesting();
    idempotencyService.clearCacheForTesting();
    inventoryReservationService.clearRegistryForTesting();
    paymentOrchestratorService.clearEscrowForTesting();
    ecommerceSyncService.clearLogsForTesting();
    offlineQueueService.clearQueueForTesting();
  });

  it('publishes and dispatches events via Transactional Outbox (domainEventBus)', async () => {
    let receivedPayload: Record<string, unknown> | null = null;
    const unsubscribe = domainEventBus.subscribe('CONTRACT_CREATED', (evt) => {
      receivedPayload = evt.payload;
    });

    const outboxEvent = await domainEventBus.publishDomainEvent({
      companyId: 'SAF',
      aggregateType: 'CONTRACT',
      aggregateId: 'CNT-2026-9001',
      eventType: 'CONTRACT_CREATED',
      payload: { clientName: 'فهد الدوسري', amount: 17250 },
    });

    expect(outboxEvent.status).toBe('PROCESSED');
    expect(outboxEvent.company_id).toBe('SAF');
    expect(receivedPayload).toEqual({ clientName: 'فهد الدوسري', amount: 17250 });
    unsubscribe();
  });

  it('enforces Idempotency-Key deduplication and rejects conflicting payloads', async () => {
    let handlerCalls = 0;
    const key = 'IDEMP-SAF-PAYMENT-0001';

    const first = await idempotencyService.executeWithIdempotency({
      idempotencyKey: key,
      companyId: 'SAF',
      operationType: 'CREATE_CONTRACT_PAYMENT',
      payload: { contractId: 'CNT-101', amount: 15000 },
      handler: () => {
        handlerCalls += 1;
        return { receiptNumber: 'REC-001', amount: 15000 };
      },
    });

    const second = await idempotencyService.executeWithIdempotency({
      idempotencyKey: key,
      companyId: 'SAF',
      operationType: 'CREATE_CONTRACT_PAYMENT',
      payload: { contractId: 'CNT-101', amount: 15000 },
      handler: () => {
        handlerCalls += 1;
        return { receiptNumber: 'REC-002', amount: 15000 };
      },
    });

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(second.data.receiptNumber).toBe('REC-001');
    expect(handlerCalls).toBe(1);

    await expect(
      idempotencyService.executeWithIdempotency({
        idempotencyKey: key,
        companyId: 'SAF',
        operationType: 'CREATE_CONTRACT_PAYMENT',
        payload: { contractId: 'CNT-101', amount: 99999 }, // mutated payload
        handler: () => ({ receiptNumber: 'REC-003', amount: 99999 }),
      })
    ).rejects.toThrow('Idempotency Conflict');
  });

  it('enforces 15-Minute Soft Lease Lock on CVs and prevents double booking', async () => {
    const t0 = 1_700_000_000_000;
    const lease = await inventoryReservationService.acquireSoftLease({
      resourceId: 'CV-PH-501',
      companyId: 'SAF',
      userId: 'user-client-A',
      nowMs: t0,
    });

    expect(lease.reservationState).toBe('SOFT_LOCKED');

    // Another client attempting to reserve within 15 minutes must be blocked
    await expect(
      inventoryReservationService.acquireSoftLease({
        resourceId: 'CV-PH-501',
        companyId: 'SAF',
        userId: 'user-client-B',
        nowMs: t0 + 5 * 60 * 1000,
      })
    ).rejects.toThrow('محجوزة مؤقتاً لعميل آخر');

    // After 15 minutes + 1s, lease expires automatically and client B can reserve
    const leaseB = await inventoryReservationService.acquireSoftLease({
      resourceId: 'CV-PH-501',
      companyId: 'SAF',
      userId: 'user-client-B',
      nowMs: t0 + SOFT_LEASE_DURATION_MS + 1000,
    });
    expect(leaseB.lockedByUserId).toBe('user-client-B');

    const committed = await inventoryReservationService.commitLease({
      resourceId: 'CV-PH-501',
      userId: 'user-client-B',
      contractId: 'CNT-SAF-2026-777',
      nowMs: t0 + SOFT_LEASE_DURATION_MS + 2000,
    });
    expect(committed.reservationState).toBe('CONTRACTED');
  });

  it('enforces Escrow Accounting and blocks agency commission release before medical clearance', async () => {
    const secret = 'whsec_test_moyasar_secret';
    const rawBody = JSON.stringify({ id: 'pay_1', amount: 17250 });
    const sig = await computeHmacSha256Hex(secret, rawBody);
    const verified = await paymentOrchestratorService.verifyWebhookSignature({
      secret,
      rawPayload: rawBody,
      providedSignature: sig,
    });
    expect(verified).toBe(true);

    const held = await paymentOrchestratorService.holdInEscrow({
      idempotencyKey: 'IDEMP-ESCROW-901',
      companyId: 'SAF',
      contractId: 'CNT-SAF-901',
      gatewayProvider: 'Moyasar',
      paymentMethod: 'Mada',
      paymentReference: 'MOY-REF-901',
      grossAmount: 17250, // 15,000 + 2,250 VAT
      agencyCommission: 4500,
    });

    expect(held.settlement.escrow_status).toBe('HELD_IN_ESCROW');
    expect(held.settlement.vat_amount).toBe(2250);
    expect(held.journalEntry.status).toBe('POSTED');

    // Attempting to release agency commission without medical clearance must fail
    await expect(
      paymentOrchestratorService.releaseToAgencyAfterMedical({
        escrowId: held.settlement.id,
        medicalCleared: false,
        medicalReportRef: '',
      })
    ).rejects.toThrow('يمنع النظام المالي تحرير عمولة الوكالة الخارجية قبل اجتياز الفحص الطبي');

    // Releasing after medical clearance succeeds and creates balanced revenue recognition journal
    const released = await paymentOrchestratorService.releaseToAgencyAfterMedical({
      escrowId: held.settlement.id,
      medicalCleared: true,
      medicalReportRef: 'MED-GAMCA-2026-8841',
    });
    expect(released.settlement.escrow_status).toBe('RELEASED_TO_AGENCY');
    expect(released.journalEntry.totalDebit).toBe(15000);
    expect(released.journalEntry.totalCredit).toBe(15000);
  });

  it('masks sensitive PII fields according to Saudi PDPL rules for non-privileged roles', () => {
    expect(maskNationalId('1098765432', 'VIEWER')).toBe('10******32');
    expect(maskNationalId('1098765432', 'SUPER_ADMIN')).toBe('1098765432');
    expect(maskPassport('P9876543', 'BRANCH_RECEPTIONIST')).toBe('P*****43');
    expect(maskIban('SA4420000001234567891234', 'VIEWER')).toContain('SA44');
    expect(maskPhone('+966501234567', 'VIEWER')).toBe('+966******567');

    const maskedRecord = maskSensitiveRecord(
      {
        name: 'خالد العتيبي',
        national_id: '1023456789',
        passport_no: 'E1234567',
      },
      'VIEWER'
    );
    expect(maskedRecord.national_id).toBe('10******89');
    expect(maskedRecord.passport_no).toBe('E*****67');
  });

  it('enforces Musaned 8-stage state machine transitions and 90-day warranty calculations', () => {
    const invalidSkip = musanedLifecycleEngine.validateStageTransition('new_order', 'visa_stamped');
    expect(invalidSkip.allowed).toBe(false);

    const validStep = musanedLifecycleEngine.validateStageTransition('agency_delegated', 'medical_passed');
    expect(validStep.allowed).toBe(true);

    const warrantyActive = musanedLifecycleEngine.calculateWarrantyStatus({
      contractId: 'CNT-SAF-500',
      arrivalDate: '2026-09-01',
      evaluationDate: '2026-10-01', // 30 days elapsed (< 90 days)
      recruitmentFee: 18000,
      incidentType: 'worker_refusal',
    });
    expect(warrantyActive.isUnderWarranty).toBe(true);
    expect(warrantyActive.replacementOrderEligible).toBe(true);
    expect(warrantyActive.clientCompensationAmount).toBeGreaterThan(15000);
  });

  it('optimizes Yaqoot driver dispatch routes, verifies OTP, and scores Top Talent ATS candidates', () => {
    const pricing = fleetDispatchEngine.calculateRentalPackagePrice({
      packageDuration: 'MONTHLY',
      shiftWindow: 'MORNING_08_12',
    });
    expect(pricing.grandTotal).toBeGreaterThan(0);
    expect(pricing.vatAmount).toBeCloseTo(pricing.netSubtotal * 0.15, 1);

    const route = fleetDispatchEngine.optimizeDriverRoute({
      driverId: 'DRV-01',
      driverName: 'سالم الدوسري',
      vehiclePlate: 'أ ب ج 1234',
      shiftWindow: 'MORNING_08_12',
      depotOrigin: { lat: 24.7136, lng: 46.6753 }, // Riyadh Center
      stops: [
        {
          visitId: 'V-far',
          contractId: 'RENT-2',
          clientName: 'عميل شمال الرياض البعيد',
          clientPhone: '0500000002',
          workerId: 'W-2',
          workerName: 'Mary',
          shiftWindow: 'MORNING_08_12',
          coordinates: { lat: 24.8500, lng: 46.6200 },
          deliveryOtp: '4821',
          status: 'SCHEDULED',
        },
        {
          visitId: 'V-near',
          contractId: 'RENT-1',
          clientName: 'عميل العليا القريب',
          clientPhone: '0500000001',
          workerId: 'W-1',
          workerName: 'Ana',
          shiftWindow: 'MORNING_08_12',
          coordinates: { lat: 24.7200, lng: 46.6800 },
          deliveryOtp: '9104',
          status: 'SCHEDULED',
        },
      ],
    });

    expect(route.orderedStops[0].visitId).toBe('V-near');
    expect(route.orderedStops[1].visitId).toBe('V-far');

    const delivered = fleetDispatchEngine.verifyDeliveryOtp(route.orderedStops[0], '9104');
    expect(delivered.status).toBe('DELIVERED');

    const atsScore = fleetDispatchEngine.scoreHeadhuntCandidate({
      candidateId: 'CAND-TOP-1',
      fullName: 'م. طارق المنصور',
      yearsOfExperience: 12,
      requiredYears: 10,
      matchedSkills: ['SAP', 'PMP', 'Finance', 'ERP'],
      requiredSkills: ['SAP', 'PMP', 'Finance', 'ERP'],
      certificationsCount: 3,
      interviewRatingOutOf5: 4.8,
      expectedSalarySar: 32000,
      budgetMaxSar: 35000,
    });
    expect(atsScore.totalScore).toBeGreaterThanOrEqual(85);
    expect(atsScore.recommendation).toBe('STRONG_HIRE');
  });

  it('manages KAS Bank Guarantees, expiry alerts, and historical BOQ price benchmarking', () => {
    const bg = createBankGuarantee({
      companyId: 'KAS',
      tenderId: 'TND-100',
      tenderReference: 'ETIMAD-2026-998',
      guaranteeNumber: 'LG-ALRAJHI-7721',
      guaranteeType: 'FINAL',
      bankName: 'مصرف الراجحي',
      beneficiaryEntity: 'وزارة البلديات والإسكان',
      tenderTotalValue: 2_000_000,
      issueDate: '2026-01-01',
      expiryDate: '2026-10-20',
    });

    expect(bg.guaranteePercentage).toBe(5);
    expect(bg.guaranteeAmount).toBe(100_000);

    const alerts = checkExpiringBankGuarantees([bg], 15, '2026-10-15');
    expect(alerts[0].urgency).toBe('CRITICAL');

    const benchmark = benchmarkBoqItemPricing({
      itemDescription: 'توريد وتركيب شاشات عرض رقمية LED',
      proposedUnitPrice: 14500,
      historicalUnitPrices: [15000, 15200, 14800],
    });
    expect(benchmark.pricingPosition).toBe('COMPETITIVE');
    expect(benchmark.winProbabilityScore).toBeGreaterThanOrEqual(90);
  });

  it('chains ZATCA Phase 2 invoices with cryptographic PIH hashes', async () => {
    const chain = await chainZatcaInvoices([
      {
        invoiceNumber: 'INV-001',
        uuid: 'uuid-001',
        issueDate: '2026-10-15',
        issueTime: '10:00:00',
        sellerName: 'شركة السفير الماسي للاستقدام',
        sellerVatNumber: '310123456700003',
        sellerCrNumber: '1010554433',
        sellerAddress: 'الرياض',
        lineItems: [{ name: 'خدمة استقدام', quantity: 1, unitPrice: 15000, vatRate: 0.15, total: 17250 }],
        subtotal: 15000,
        vatAmount: 2250,
        grandTotal: 17250,
      },
      {
        invoiceNumber: 'INV-002',
        uuid: 'uuid-002',
        issueDate: '2026-10-15',
        issueTime: '11:00:00',
        sellerName: 'شركة السفير الماسي للاستقدام',
        sellerVatNumber: '310123456700003',
        sellerCrNumber: '1010554433',
        sellerAddress: 'الرياض',
        lineItems: [{ name: 'خدمة استقدام 2', quantity: 1, unitPrice: 16000, vatRate: 0.15, total: 18400 }],
        subtotal: 16000,
        vatAmount: 2400,
        grandTotal: 18400,
      },
    ]);

    expect(chain[0].previousInvoiceHash).toBe(ZATCA_GENESIS_PIH);
    expect(chain[1].previousInvoiceHash).toBe(chain[0].invoiceHash);
    expect(chain[1].xmlUbl21).toContain(chain[0].invoiceHash);
  });

  it('enforces Append-Only Ledger immutability and reverses posted entries via Reversal Entry', () => {
    const { entry } = journalEngine.createJournalEntry('SAF', {
      description: 'قيد إثبات مصروف صيانة',
      createdBy: 'محاسب',
      lines: [
        { accountCode: '51200', accountName: 'مصروف صيانة', debit: 2000, credit: 0 },
        { accountCode: '11010', accountName: 'الصندوق', debit: 0, credit: 2000 },
      ],
      autoPost: true,
    });
    expect(entry).toBeDefined();
    if (!entry) return;

    // Deleting or updating a POSTED entry must fail
    const delAttempt = journalEngine.deleteJournalEntry('SAF', entry.id);
    expect(delAttempt.success).toBe(false);
    expect(delAttempt.error).toContain('Append-Only Ledger Violation');

    const updAttempt = journalEngine.updateJournalEntry('SAF', entry.id, { description: 'تعديل غير مسموح' });
    expect(updAttempt.entry).toBeNull();
    expect(updAttempt.error).toContain('Append-Only Ledger Violation');

    // Reversing a POSTED entry creates a balanced REVERSAL entry
    const rev = journalEngine.reverseJournalEntry('SAF', entry.id, 'إدخال بالخطأ على مركز التكلفة', 'المدير المالي');
    expect(rev.error).toBeNull();
    expect(rev.originalEntry?.status).toBe('REVERSED');
    expect(rev.reversalEntry?.entryType).toBe('REVERSAL');
    expect(rev.reversalEntry?.totalDebit).toBe(2000);
    expect(rev.reversalEntry?.totalCredit).toBe(2000);
  });

  it('synchronizes omnichannel E-Commerce orders and processes offline queues with exponential backoff', async () => {
    const syncLog = await ecommerceSyncService.syncInboundOrder({
      companyId: 'YAQ',
      platform: 'SALLA',
      externalOrderId: 'SALLA-99881',
      customerName: 'نورة القحطاني',
      customerPhone: '+966551112233',
      packageCode: 'YAQ-MONTHLY-MORNING',
      totalAmountSar: 3450,
    });
    expect(syncLog.sync_status).toBe('SYNCED');
    expect(syncLog.internal_reference_id).toContain('ERP-ORD-SAL-SALLA-99881');

    expect(computeExponentialBackoffMs(0)).toBe(1000);
    expect(computeExponentialBackoffMs(1)).toBe(2000);
    expect(computeExponentialBackoffMs(2)).toBe(4000);
    expect(computeExponentialBackoffMs(3)).toBe(8000);
    expect(computeExponentialBackoffMs(4)).toBe(16000);

    offlineQueueService.enqueue({
      companyId: 'YAQ',
      operationType: 'DRIVER_DELIVERY_OTP',
      payload: { visitId: 'V-101', otp: '4491' },
    });

    const processed = await offlineQueueService.processQueue(async () => {
      // Simulated successful flush
    });
    expect(processed.synced).toBe(1);
    expect(processed.remaining).toBe(0);
  });

  it('enforces strict per-company login isolation, route normalization, and session tenant locks', () => {
    // 1. Per-company route normalization
    expect(normalizePortalRouteCode('SAF')).toBe('saf');
    expect(normalizePortalRouteCode('YAQ')).toBe('yaq');
    expect(normalizePortalRouteCode('TOP')).toBe('top');
    expect(normalizePortalRouteCode('KAS')).toBe('kas');
    expect(normalizePortalRouteCode('DAR')).toBe('shelter');
    expect(normalizePortalRouteCode('all')).toBe('admin');
    expect(normalizePortalRouteCode('gateway')).toBeNull();

    // 2. Company email domains
    expect(authService.getCompanyEmailDomain('SAF')).toBe('saf-rec.sa');
    expect(authService.getCompanyEmailDomain('YAQ')).toBe('yaqoot-ops.sa');
    expect(authService.getCompanyEmailDomain('TOP')).toBe('topaz-rec.sa');
    expect(authService.getCompanyEmailDomain('KAS')).toBe('kas-etimad.sa');
    expect(authService.getCompanyEmailDomain('DAR')).toBe('alruwad.sa');

    // 3. Tenant boundary validation (SAF employee vs YAQ / KAS / Admin portals)
    const safEmployee: UserProfile = {
      id: 'usr-saf-101',
      username: 'ahmed.saf',
      full_name: 'أحمد العتيبي',
      email: 'ahmed@saf-rec.sa',
      role: 'مشرف تشغيل',
      branch: 'الفرع الرئيسي',
      company_id: 'SAF',
      status: 'نشط',
      created_at: '2026-01-01T00:00:00Z',
    };

    // Allowed into SAF portal
    expect(authService.validateCompanyAccess(safEmployee, 'SAF').allowed).toBe(true);

    // Rejected when attempting to log in through YAQ, KAS, TOP, or DAR portals
    const yaqAttempt = authService.validateCompanyAccess(safEmployee, 'YAQ');
    expect(yaqAttempt.allowed).toBe(false);
    expect(yaqAttempt.reason).toContain('رفض أمني (عزل الشركات)');

    const kasAttempt = authService.validateCompanyAccess(safEmployee, 'KAS');
    expect(kasAttempt.allowed).toBe(false);

    // Rejected when attempting to log in through Central Group Admin portal ('all')
    const adminAttempt = authService.validateCompanyAccess(safEmployee, 'all');
    expect(adminAttempt.allowed).toBe(false);
    expect(adminAttempt.reason).toContain('رفض أمني (عزل الصلاحيات)');

    // Allowed if employee holds an active multi-company IAM membership for YAQ
    const multiMemAttempt = authService.validateCompanyAccess(safEmployee, 'YAQ', ['YAQ']);
    expect(multiMemAttempt.allowed).toBe(true);

    // 4. Group Super Admin can access Central Admin and any subsidiary portal
    const groupChairman: UserProfile = {
      id: 'usr-chairman-01',
      username: 'khalid.admin',
      full_name: 'خالد السليم',
      email: 'khalid@alsulaim.sa',
      role: 'رئيس المجموعة',
      branch: 'المركز الرئيسي',
      company_id: 'all',
      status: 'نشط',
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(authService.validateCompanyAccess(groupChairman, 'all').allowed).toBe(true);
    expect(authService.validateCompanyAccess(groupChairman, 'KAS').allowed).toBe(true);
    expect(authService.validateCompanyAccess(groupChairman, 'YAQ').allowed).toBe(true);

    // 5. Session tenant lock persistence and cleanup
    setLockedSessionCompany('YAQ');
    expect(getLockedSessionCompany()).toBe('YAQ');
    setLockedSessionCompany(null);
    expect(getLockedSessionCompany()).toBeNull();
  });

  it('synchronizes mobile notifications with appStore and flushes background execution queues', async () => {
    useAppStore.getState().clearNotifications();
    expect(useAppStore.getState().unreadCount).toBe(0);

    // 1. Triggering notificationPopupEngine.show syncs directly into useAppStore
    const popupId = notificationPopupEngine.show({
      title: 'تنبيه عقد استقدام جديد',
      message: 'تم اعتماد عقد مساند رقم MUS-9941 في الخلفية.',
      type: 'musaned',
      companyId: 'SAF',
      action: {
        label: 'فتح العقود',
        tabKey: 'recruitment',
      },
    });

    const storeAfterNotify = useAppStore.getState();
    expect(storeAfterNotify.notifications.length).toBeGreaterThanOrEqual(1);
    expect(storeAfterNotify.unreadCount).toBeGreaterThanOrEqual(1);
    const matchingNotif = storeAfterNotify.notifications.find(
      (n) => n.title === 'تنبيه عقد استقدام جديد'
    );
    expect(matchingNotif).toBeDefined();
    expect(matchingNotif?.link).toBe('recruitment');
    expect(matchingNotif?.category).toBe('musaned');

    // 2. Marking notification as read updates unreadCount
    if (matchingNotif) {
      useAppStore.getState().markAsRead(matchingNotif.id);
      expect(
        useAppStore.getState().notifications.find((n) => n.id === matchingNotif.id)?.read
      ).toBe(true);
    }
    notificationPopupEngine.dismiss(popupId);

    // 3. Background execution service flushes offline queue and outbox events
    offlineQueueService.enqueue({
      companyId: 'YAQ',
      operationType: 'BG_MOBILE_MUTATION',
      payload: { shiftId: 'SH-101', status: 'ARRIVED' },
    });

    expect(offlineQueueService.getPendingCount()).toBe(1);

    const flushResult = await backgroundExecutionService.flushBackgroundQueues('unit-test');
    expect(flushResult.syncedMutations).toBe(1);
    expect(offlineQueueService.getPendingCount()).toBe(0);

    const bgState = backgroundExecutionService.getState();
    expect(bgState.pendingOfflineCount).toBe(0);
    expect(bgState.totalBackgroundSyncs).toBeGreaterThanOrEqual(1);
  });
});


