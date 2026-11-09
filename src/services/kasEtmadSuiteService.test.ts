import { describe, it, expect, beforeEach } from 'vitest';
import { kasEtmadSuiteService } from './kasEtmadSuiteService';

describe('KasEtmadSuiteService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize default data for competitions and categories', () => {
    const competitions = kasEtmadSuiteService.getCompetitions();
    const categories = kasEtmadSuiteService.getCategories();
    expect(competitions.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
  });

  it('should calculate dashboard stats correctly', () => {
    const stats = kasEtmadSuiteService.getDashboardStats();
    expect(stats.totalCompetitions).toBeGreaterThan(0);
    expect(stats.totalInvoicesAmount).toBeGreaterThan(0);
    expect(stats.totalClients).toBeGreaterThan(0);
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
    expect(stats.winRate).toBeLessThanOrEqual(100);
  });

  it('should add, update, and delete a competition', () => {
    const initialCount = kasEtmadSuiteService.getCompetitions().length;
    const newComp = kasEtmadSuiteService.addCompetition({
      title: 'منافسة اختبارية جديدة لشركة كاس',
      referenceNumber: 'REF-TEST-001',
      isWinner: 'No',
      dueDate: '2026-09-01',
      deadlineDate: '2026-09-05',
      category: 'التجارة',
      governmentEntity: 'وزارة الحرس الوطني',
      createdAt: '2026-08-30',
      totalItemsValue: 50000,
      status: 'جديد'
    });

    expect(newComp.id).toBeDefined();
    expect(kasEtmadSuiteService.getCompetitions().length).toBe(initialCount + 1);

    // Update
    const updated = kasEtmadSuiteService.updateCompetition(newComp.id, { status: 'تمت الترسية', isWinner: 'Yes' });
    expect(updated).toBe(true);
    const found = kasEtmadSuiteService.getCompetitions().find(c => c.id === newComp.id);
    expect(found?.status).toBe('تمت الترسية');
    expect(found?.isWinner).toBe('Yes');

    // Delete
    const deleted = kasEtmadSuiteService.deleteCompetition(newComp.id);
    expect(deleted).toBe(true);
    expect(kasEtmadSuiteService.getCompetitions().length).toBe(initialCount);
  });

  it('should add, update and delete a proposal', () => {
    const initialCount = kasEtmadSuiteService.getProposals().length;
    const newProp = kasEtmadSuiteService.addProposal({
      proposalNumber: 'PROP-999',
      subject: 'عرض توريد مواد غذائية',
      toClient: 'أمانة الرياض',
      totalAmount: 150000,
      date: '2026-08-30',
      openTill: '2026-09-30',
      createdAt: '2026-08-30',
      status: 'مسودة',
      items: [{ description: 'بند تجريبي', qty: 1, rate: 150000, taxPct: 15, total: 172500 }]
    });

    expect(newProp.id).toBeDefined();
    expect(kasEtmadSuiteService.getProposals().length).toBe(initialCount + 1);

    kasEtmadSuiteService.updateProposal(newProp.id, { status: 'مقبول' });
    const found = kasEtmadSuiteService.getProposals().find(p => p.id === newProp.id);
    expect(found?.status).toBe('مقبول');

    kasEtmadSuiteService.deleteProposal(newProp.id);
    expect(kasEtmadSuiteService.getProposals().length).toBe(initialCount);
  });

  it('should manage subscriptions and credit notes properly', () => {
    const sub = kasEtmadSuiteService.addSubscription({
      subscriptionName: 'خدمة دعم فني شهري',
      clientName: 'شركة كاس',
      billingInterval: 'شهري',
      amount: 5000,
      status: 'نشط',
      startDate: '2026-08-01',
      nextBillingDate: '2026-09-01'
    });
    expect(sub.id).toBeDefined();

    const cn = kasEtmadSuiteService.addCreditNote({
      creditNoteNumber: 'CN-999',
      clientName: 'شركة كاس',
      date: '2026-08-30',
      status: 'مفتوح',
      remainingAmount: 1000,
      totalAmount: 1000
    });
    expect(cn.id).toBeDefined();
  });

  it('should compute Interim Payment Certificate (IPC) progress billing with 10% retention and 15% VAT', () => {
    const ipc = kasEtmadSuiteService.computeProgressBillingIPC({
      contractValueSar: 1000000,
      previousCompletionPct: 20,
      currentCompletionPct: 50,
      retentionRatePct: 10,
      advanceRecoveryPct: 5,
      vatRatePct: 15,
    });

    // Incremental 30% of 1,000,000 = 300,000 gross
    // Retention 10% = 30,000; Advance recovery 5% = 15,000 -> Net taxable = 255,000
    // VAT 15% = 38,250 -> Net payable IPC = 293,250
    expect(ipc.incrementalCompletionPct).toBe(30);
    expect(ipc.currentWorkGrossSar).toBe(300000);
    expect(ipc.retentionHoldbackSar).toBe(30000);
    expect(ipc.advanceRecoverySar).toBe(15000);
    expect(ipc.netTaxableSar).toBe(255000);
    expect(ipc.vatAmountSar).toBe(38250);
    expect(ipc.netPayableIpcSar).toBe(293250);
    expect(ipc.remainingContractBalanceSar).toBe(500000);
  });

  it('should evaluate LG bank credit line utilization, quarterly commission, and 15-day expiry alerts', () => {
    const facility = kasEtmadSuiteService.evaluateLgBankFacility({
      facilityLimitSar: 500000,
      referenceDate: '2026-11-01',
      guarantees: [
        {
          id: 'lg-1',
          lgNumber: 'LG-RAJHI-101',
          type: 'INITIAL',
          amountSar: 100000,
          expiryDate: '2026-11-10',
          annualCommissionPct: 2,
        },
        {
          id: 'lg-2',
          lgNumber: 'LG-SNB-202',
          type: 'FINAL',
          amountSar: 200000,
          expiryDate: '2027-03-01',
          annualCommissionPct: 2,
        },
      ],
    });

    expect(facility.utilizedFacilitySar).toBe(300000);
    expect(facility.availableHeadroomSar).toBe(200000);
    expect(facility.utilizationPct).toBe(60);
    expect(facility.exceedsCreditLimit).toBe(false);
    expect(facility.quarterlyCommissionSar).toBe(1500);
    expect(facility.expiringWithin15Days).toContain('LG-RAJHI-101');
  });

  it('should rank 3-quote supplier RFQs by weighted financial, technical, and delivery score', () => {
    const comparison = kasEtmadSuiteService.compareSupplierRfqQuotes([
      {
        supplierId: 'sup-1',
        supplierName: 'مصنع الجزيرة للتوريدات',
        totalPriceSar: 120000,
        deliveryDays: 14,
        technicalScoreOutOf100: 85,
        sasoCompliant: true,
      },
      {
        supplierId: 'sup-2',
        supplierName: 'شركة الرواد للصناعات الوطنية',
        totalPriceSar: 95000,
        deliveryDays: 7,
        technicalScoreOutOf100: 94,
        sasoCompliant: true,
      },
      {
        supplierId: 'sup-3',
        supplierName: 'مورد غير مطابق للمواصفات',
        totalPriceSar: 70000,
        deliveryDays: 5,
        technicalScoreOutOf100: 90,
        sasoCompliant: false,
      },
    ]);

    expect(comparison.recommendedWinner?.supplierId).toBe('sup-2');
    expect(comparison.savingsVsHighestSar).toBe(25000);
    expect(comparison.rankedQuotes.length).toBe(2);
  });
});
