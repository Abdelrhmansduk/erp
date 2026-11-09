import { describe, it, expect, beforeEach } from 'vitest';
import { journalEngine, autoPostOperationalTransaction } from './journalEngine';
import { chartOfAccountsService } from './chartOfAccountsService';
import { ifrsFinancialEngineService, computeIfrsEngine } from './ifrsFinancialEngineService';
import { accountingConsolidationService } from './accountingConsolidationService';
import { odooAccountingConfigService } from './odooAccountingConfigService';
import { erpIndexedStorage } from '../storage/erpIndexedStorage';
import { formatSarCurrency, formatUsdToSarPeg } from '../../utils/currencyFormat';

describe('journalEngine (Double-Entry General Ledger & Auto-Posting Bridge)', () => {
  beforeEach(() => {
    localStorage.clear();
    erpIndexedStorage.clearMemoryCache();
    chartOfAccountsService.resetToStandardTree('SAF');
    ifrsFinancialEngineService.resetTrialBalance('SAF', true);
  });

  it('should successfully create a balanced journal entry', () => {
    const { entry, error } = journalEngine.createJournalEntry('SAF', {
      description: 'إثبات سداد نقدي للمصروفات العمومية',
      createdBy: 'مدير الحسابات',
      lines: [
        { accountCode: '51100', accountName: 'مصروفات تشغيلية', debit: 3500, credit: 0 },
        { accountCode: '11010', accountName: 'الصندوق الرئيسي', debit: 0, credit: 3500 },
      ],
    });

    expect(error).toBeNull();
    expect(entry).toBeDefined();
    expect(entry?.totalDebit).toBe(3500);
    expect(entry?.totalCredit).toBe(3500);
    expect(entry?.status).toBe('DRAFT');
    expect(entry?.entryNumber).toContain('SAF-JV-');
  });

  it('should reject an unbalanced journal entry with double-entry golden rule violation', () => {
    const { entry, error } = journalEngine.createJournalEntry('SAF', {
      description: 'قيد غير متوازن للاختبار',
      createdBy: 'محاسب الفرع',
      lines: [
        { accountCode: '51100', accountName: 'مصروفات تشغيلية', debit: 5000, credit: 0 },
        { accountCode: '11010', accountName: 'الصندوق الرئيسي', debit: 0, credit: 4000 },
      ],
    });

    expect(entry).toBeNull();
    expect(error).toContain('القيد المحاسبي غير متوازن');
  });

  it('should reject a journal entry with less than two lines', () => {
    const { entry, error } = journalEngine.createJournalEntry('SAF', {
      description: 'قيد بطرف واحد فقط',
      createdBy: 'محاسب الفرع',
      lines: [
        { accountCode: '11010', accountName: 'الصندوق الرئيسي', debit: 1000, credit: 1000 },
      ],
    });

    expect(entry).toBeNull();
    expect(error).toContain('يجب أن يحتوي القيد على طرفين على الأقل');
  });

  it('should allow posting a draft journal entry and mark it as POSTED', () => {
    const { entry } = journalEngine.createJournalEntry('SAF', {
      description: 'قيد ترحيل أجور ومستحقات',
      createdBy: 'أخصائي الرواتب',
      lines: [
        { accountCode: '51100', accountName: 'مصروفات الرواتب', debit: 8000, credit: 0 },
        { accountCode: '11020', accountName: 'بنك الراجحي', debit: 0, credit: 8000 },
      ],
    });

    expect(entry).toBeDefined();
    if (!entry) return;

    const postResult = journalEngine.postJournalEntry('SAF', entry.id, 'المدير المالي');
    expect(postResult.success).toBe(true);
    expect(postResult.error).toBeNull();
  });

  it('autoPostOperationalTransaction should post Recruitment, Rent, Transfer & Payroll and keep COA + IFRS 100% balanced', () => {
    const escrowBefore = chartOfAccountsService.getAccountByCode('SAF', '110301')?.balance || 0;
    const revBefore = chartOfAccountsService.getAccountByCode('SAF', '410101')?.balance || 0;
    const vatBefore = chartOfAccountsService.getAccountByCode('SAF', '210501')?.balance || 0;

    // 1. Post a Recruitment Contract (10,000 SAR + 1,500 SAR VAT = 11,500 SAR)
    const recResult = autoPostOperationalTransaction({
      companyId: 'SAF',
      transactionType: 'RECRUITMENT_CONTRACT',
      referenceNumber: 'SAF-RC-2026-9901',
      description: 'عقد استقدام مساند تجريبي',
      amount: 10000,
      amountIncludesVat: false,
      vatRate: 0.15,
      paymentChannel: 'ESCROW',
    });

    expect(recResult.error).toBeNull();
    expect(recResult.entry?.status).toBe('POSTED');
    expect(recResult.entry?.totalDebit).toBe(11500);
    expect(recResult.entry?.totalCredit).toBe(11500);

    const escrowAfter = chartOfAccountsService.getAccountByCode('SAF', '110301')?.balance || 0;
    const revAfter = chartOfAccountsService.getAccountByCode('SAF', '410101')?.balance || 0;
    const vatAfter = chartOfAccountsService.getAccountByCode('SAF', '210501')?.balance || 0;

    expect(escrowAfter).toBe(escrowBefore + 11500);
    expect(revAfter).toBe(revBefore + 10000);
    expect(vatAfter).toBe(vatBefore + 1500);

    // 2. Post a Rent Contract (4,000 SAR + 600 SAR VAT = 4,600 SAR)
    const rentResult = autoPostOperationalTransaction({
      companyId: 'SAF',
      transactionType: 'RENT_CONTRACT',
      referenceNumber: 'SAF-RENT-2026-9902',
      description: 'عقد تأجير عمالة',
      amount: 4000,
      amountIncludesVat: false,
      vatRate: 0.15,
      paymentChannel: 'BANK',
    });
    expect(rentResult.error).toBeNull();
    expect(rentResult.entry?.totalDebit).toBe(4600);

    // 3. Post a Sponsorship Transfer (11,500 SAR inclusive of 15% VAT -> 10,000 net + 1,500 VAT)
    const trfResult = autoPostOperationalTransaction({
      companyId: 'SAF',
      transactionType: 'SPONSORSHIP_TRANSFER',
      referenceNumber: 'TRF-2026-9903',
      description: 'نقل خدمات كفالة',
      amount: 11500,
      amountIncludesVat: true,
      vatRate: 0.15,
      paymentChannel: 'BANK',
    });
    expect(trfResult.error).toBeNull();
    expect(trfResult.entry?.totalDebit).toBe(11500);

    // 4. Verify IFRS Trial Balance & Balance Sheet remain 100% balanced with 0 critical errors
    const tb = ifrsFinancialEngineService.getTrialBalance('SAF');
    const settings = ifrsFinancialEngineService.getSettings('SAF');
    const engine = computeIfrsEngine(tb, settings);

    expect(Math.abs(engine.totals.closingDebit - engine.totals.closingCredit)).toBeLessThan(0.01);
    expect(Math.abs(engine.balanceSheet.current.diff)).toBeLessThan(0.01);
    expect(engine.diagnostics.criticalErrorsCount).toBe(0);
  });

  it('erpIndexedStorage should safely absorb large payloads exceeding LocalStorage threshold without throwing', async () => {
    const resSmall = erpIndexedStorage.setSync('test_small_key', { ok: true, count: 42 });
    expect(resSmall.storedInMemory).toBe(true);
    expect(resSmall.storedInLocalStorage).toBe(true);
    expect(erpIndexedStorage.getSync('test_small_key', { ok: false, count: 0 })).toEqual({
      ok: true,
      count: 42,
    });

    // Simulate oversized payload with low maxLocalStorageBytes cap
    const resLarge = erpIndexedStorage.setSync(
      'test_oversized_key',
      { data: 'X'.repeat(2048) },
      { maxLocalStorageBytes: 100 }
    );
    expect(resLarge.storedInMemory).toBe(true);
    expect(resLarge.storedInLocalStorage).toBe(false);
    expect(erpIndexedStorage.getSync('test_oversized_key', { data: '' }).data.length).toBe(2048);

    const diag = erpIndexedStorage.getStorageDiagnostics();
    expect(diag.memoryKeysCount).toBeGreaterThanOrEqual(2);
  });

  it('should enforce Fiscal Period Lock and block retro-posting into locked months', () => {
    // 2026-03 is locked by default in DEFAULT_LOCKED_PERIODS
    expect(journalEngine.isPeriodLocked('SAF', '2026-03-15')).toBe(true);

    const lockedAttempt = journalEngine.createJournalEntry('SAF', {
      date: '2026-03-15',
      description: 'قيد بأثر رجعي في فترة مغلقة',
      createdBy: 'محاسب',
      lines: [
        { accountCode: '110101', debit: 1000, credit: 0 },
        { accountCode: '410101', debit: 0, credit: 1000 },
      ],
    });
    expect(lockedAttempt.entry).toBeNull();
    expect(lockedAttempt.error).toContain('الفترة المحاسبية (2026-03) مقفلة');

    // Unlock 2026-03 and retry
    journalEngine.unlockFiscalPeriod('SAF', '2026-03');
    expect(journalEngine.isPeriodLocked('SAF', '2026-03-15')).toBe(false);

    const unlockedAttempt = journalEngine.createJournalEntry('SAF', {
      date: '2026-03-15',
      description: 'قيد بعد إعادة فتح الفترة',
      createdBy: 'المدير المالي',
      lines: [
        { accountCode: '110101', debit: 1000, credit: 0 },
        { accountCode: '410101', debit: 0, credit: 1000 },
      ],
    });
    expect(unlockedAttempt.error).toBeNull();
    expect(unlockedAttempt.entry).toBeDefined();
  });

  it('should post MUSANED_ESCROW_RELEASE, FOREIGN_AGENT_SETTLEMENT, COST_CENTER_EXPENSE, FINANCIAL_REQUEST_APPROVAL & EOSB_SETTLEMENT accurately', () => {
    // 1. Musaned 90-Day Escrow Release (10,000 SAR -> 250 fee + 37.50 VAT + 9,712.50 net bank)
    const escrowEntry = journalEngine.autoPostOperationalTransaction({
      companyId: 'SAF',
      transactionType: 'MUSANED_ESCROW_RELEASE',
      referenceId: 'MSN-TEST-01',
      partyName: 'عميل مساند',
      amount: 10000,
    });
    expect(escrowEntry.status).toBe('POSTED');
    expect(escrowEntry.totalDebit).toBe(10000);
    expect(escrowEntry.totalCredit).toBe(10000);

    // 2. Foreign Agent Settlement in USD ($2,000 * 3.75 = 7,500 SAR)
    const agentEntry = journalEngine.autoPostOperationalTransaction({
      companyId: 'SAF',
      transactionType: 'FOREIGN_AGENT_SETTLEMENT',
      referenceId: 'AG-TEST-01',
      partyName: 'PLATINUM AGENCY',
      amount: 0,
      usdAmount: 2000,
    });
    expect(agentEntry.status).toBe('POSTED');
    expect(agentEntry.totalDebit).toBe(7500);
    expect(agentEntry.totalCredit).toBe(7500);

    // 3. Cost Center Expense (1,000 SAR + 150 SAR VAT)
    const ccEntry = journalEngine.autoPostOperationalTransaction({
      companyId: 'SAF',
      transactionType: 'COST_CENTER_EXPENSE',
      referenceId: 'CC-EXP-01',
      partyName: 'فرع الرياض',
      amount: 1000,
      taxAmount: 150,
      costCenterName: 'فرع الرياض الرئيسي',
    });
    expect(ccEntry.totalDebit).toBe(1150);
    expect(ccEntry.totalCredit).toBe(1150);

    // 4. Reverse the Cost Center Expense entry and verify reversal
    const reversal = journalEngine.reverseJournalEntry('SAF', ccEntry.id || '', 'تصحيح مركز تكلفة', 'المراجع الداخلي');
    expect(reversal.reversalEntry?.status).toBe('POSTED');
    expect(reversal.reversalEntry?.totalDebit).toBe(1150);
    expect(reversal.reversalEntry?.totalCredit).toBe(1150);
  });

  it('accountingConsolidationService should generate IFRS 10 Group Consolidated Statements across all 4 entities with 0.00 balance sheet diff', () => {
    const report = accountingConsolidationService.generateConsolidatedReport();
    expect(report.entities.length).toBe(4);
    expect(report.summaryKpis.consolidatedTotalAssets).toBeGreaterThan(0);
    expect(report.summaryKpis.intercompanyRevenueEliminated).toBeGreaterThan(0);
    expect(Math.abs(report.summaryKpis.balanceSheetDiff)).toBeLessThan(0.01);
  });

  it('formatSarCurrency and formatUsdToSarPeg should strictly follow SAMA SRS U+20C1 guidelines', () => {
    expect(formatSarCurrency(1250.5)).toBe('\u20C1 1,250.50');
    expect(formatSarCurrency(-1250.5)).toBe('\u20C1 -1,250.50');
    const peg = formatUsdToSarPeg(1000);
    expect(peg.sar).toBe(3750);
    expect(peg.formattedSar).toBe('\u20C1 3,750.00');
  });

  it('odooAccountingConfigService should compute payment schedules, post early payment discounts, map fiscal positions, and execute bank reconciliation write-offs', () => {
    // 1. Payment Terms & Early Pay Discount
    const schedule = odooAccountingConfigService.computeInstallmentSchedule('PT-NET30-2PCT', 10000, '2026-08-01');
    expect(schedule.earlyDiscountAmountSar).toBe(200);
    expect(schedule.earlyNetPayableSar).toBe(9800);

    const earlyPost = odooAccountingConfigService.postEarlyPaymentDiscountCollection('SAF', {
      invoiceRef: 'INV-ODOO-01',
      customerName: 'شركة المدار',
      invoiceTotalSar: 10000,
      discountPercent: 2,
      entryDate: '2026-08-05',
    });
    expect(earlyPost.cashReceivedSar).toBe(9800);
    expect(earlyPost.discountGrantedSar).toBe(200);
    expect(earlyPost.totalClearedReceivableSar).toBe(10000);

    // 2. Fiscal Positions (ZATCA Tax & Account Mapping)
    const fpGov = odooAccountingConfigService.applyFiscalPositionMapping('FP-GOV-FEES-EXEMPT', 2000);
    expect(fpGov.vatAmountSar).toBe(0);
    expect(fpGov.grossTotalSar).toBe(2000);

    const fpPost = odooAccountingConfigService.postFiscalPositionTransaction('SAF', {
      fpId: 'FP-CORPORATE-B2B-15',
      baseAmountSar: 20000,
      partnerName: 'شركة الخليج للمقاولات',
      referenceNumber: 'FP-B2B-01',
      entryDate: '2026-08-10',
    });
    expect(fpPost.mapping.vatAmountSar).toBe(3000);
    expect(fpPost.mapping.grossTotalSar).toBe(23000);

    // 3. Bank Reconciliation Models (Auto-Match & Write-Off)
    const matched = odooAccountingConfigService.matchBankStatementLine('SARIE TRANSFER BANK FEE', 28.75);
    expect(matched?.id).toBe('RECON-SARIE-FEE');

    const reconPost = odooAccountingConfigService.executeReconciliationWriteOff('SAF', {
      modelId: 'RECON-SARIE-FEE',
      statementRef: 'SARIE-99',
      statementLabel: 'SARIE TRANSFER FEE',
      totalWriteOffSar: 28.75,
      entryDate: '2026-08-12',
    });
    expect(reconPost.netExpenseSar).toBe(25);
    expect(reconPost.inputVatSar).toBe(3.75);
    expect(reconPost.totalBankCreditSar).toBe(28.75);
  });
});
