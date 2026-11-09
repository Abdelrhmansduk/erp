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
});
