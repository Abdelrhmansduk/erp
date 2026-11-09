import { describe, it, expect } from 'vitest';
import { chartOfAccountsService } from './chartOfAccountsService';
import {
  IFRS_MAPPING_CODES,
  buildDefault211TrialBalance,
  computeIfrsEngine,
  ifrsFinancialEngineService,
} from './ifrsFinancialEngineService';

describe('chartOfAccountsService (Multi-Company Accounting Tree)', () => {
  it('should load chart of accounts for each specific company', () => {
    const safAccounts = chartOfAccountsService.getAccountsByCompany('SAF');
    expect(safAccounts.length).toBeGreaterThan(0);
    expect(safAccounts[0].companyId).toBe('SAF');

    const yaqAccounts = chartOfAccountsService.getAccountsByCompany('YAQ');
    expect(yaqAccounts.length).toBeGreaterThan(0);
    expect(yaqAccounts[0].companyId).toBe('YAQ');
  });

  it('should maintain 100% mathematical equilibrium across all leaf accounts and cover all 34 IFRS codes', () => {
    const accounts = chartOfAccountsService.resetToStandardTree('SAF');
    const leaves = accounts.filter((a) => !a.isHeader);

    const openDebit = leaves
      .filter((a) => a.nature === 'مدين')
      .reduce((s, a) => s + a.openingBalance, 0);
    const openCredit = leaves
      .filter((a) => a.nature === 'دائن')
      .reduce((s, a) => s + a.openingBalance, 0);
    expect(openDebit).toBe(openCredit);

    const curDebit = leaves.reduce((s, a) => s + a.currentDebit, 0);
    const curCredit = leaves.reduce((s, a) => s + a.currentCredit, 0);
    expect(curDebit).toBe(curCredit);

    const closeDebit = leaves
      .filter((a) => a.nature === 'مدين')
      .reduce((s, a) => s + a.balance, 0);
    const closeCredit = leaves
      .filter((a) => a.nature === 'دائن')
      .reduce((s, a) => s + a.balance, 0);
    expect(closeDebit).toBe(closeCredit);

    const totalAssets = leaves
      .filter((a) => a.category === 'أصول')
      .reduce((s, a) => s + (a.nature === 'مدين' ? a.balance : -a.balance), 0);
    const totalLiabilities = leaves
      .filter((a) => a.category === 'خصوم')
      .reduce((s, a) => s + (a.nature === 'دائن' ? a.balance : -a.balance), 0);
    const totalEquity = leaves
      .filter((a) => a.category === 'حقوق ملكية')
      .reduce((s, a) => s + (a.nature === 'دائن' ? a.balance : -a.balance), 0);
    const totalRevenues = leaves
      .filter((a) => a.category === 'إيرادات')
      .reduce((s, a) => s + (a.nature === 'دائن' ? a.balance : -a.balance), 0);
    const totalExpenses = leaves
      .filter((a) => a.category === 'مصروفات')
      .reduce((s, a) => s + (a.nature === 'مدين' ? a.balance : -a.balance), 0);
    const netProfit = totalRevenues - totalExpenses;

    expect(totalAssets).toBe(totalLiabilities + totalEquity + netProfit);

    const presentPrimaryCodes = new Set(leaves.map((a) => a.ifrsCode));
    expect(presentPrimaryCodes.size).toBe(34);
    for (const m of IFRS_MAPPING_CODES) {
      expect(presentPrimaryCodes.has(m.code)).toBe(true);
    }
  });

  it('should compute 211-account IFRS Trial Balance with 0 critical errors, 0 warnings, and all 34 primary classifications', () => {
    const entries = buildDefault211TrialBalance(true);
    const settings = ifrsFinancialEngineService.getSettings('SAF');
    const engine = computeIfrsEngine(entries, settings);

    expect(engine.openingDiff).toBeLessThanOrEqual(0.01);
    expect(engine.periodDiff).toBeLessThanOrEqual(0.01);
    expect(engine.closingDiff).toBeLessThanOrEqual(0.01);
    expect(Math.abs(engine.balanceSheet.current.diff)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(engine.balanceSheet.comparative.diff)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(engine.cashFlow.diff)).toBeLessThanOrEqual(0.01);

    expect(engine.diagnostics.criticalErrorsCount).toBe(0);
    expect(engine.diagnostics.warningsCount).toBe(0);
    expect(engine.diagnostics.overallVerdict).toContain('جاهزة ومطابقة بالكامل');

    const tbPrimaryCodes = new Set(engine.rows.map((r) => r.approvedCode));
    expect(tbPrimaryCodes.size).toBe(34);
  });

  it('should find specific account by code within company scope', () => {
    const cashAccount = chartOfAccountsService.getAccountByCode('SAF', '110101');
    expect(cashAccount).toBeDefined();
    expect(cashAccount?.code).toBe('110101');
    expect(cashAccount?.nameAr).toContain('الصندوق الرئيسي');
  });

  it('should successfully add new account to company chart of accounts', () => {
    const created = chartOfAccountsService.addAccount('SAF', {
      code: '110999',
      nameAr: 'حساب تجريبي جديد',
      nameEn: 'New Test Account',
      category: 'أصول',
      nature: 'مدين',
      statementType: 'قائمة المركز المالي (ميزانية)',
      level: 4,
      openingBalance: 50000,
      currency: 'SAR',
      isActive: true,
    });

    expect(created.id).toBeDefined();
    expect(created.code).toBe('110999');

    const found = chartOfAccountsService.getAccountByCode('SAF', '110999');
    expect(found).toBeDefined();
    expect(found?.nameAr).toBe('حساب تجريبي جديد');
  });

  it('should build a hierarchical tree structure', () => {
    const accounts = chartOfAccountsService.getAccountsByCompany('SAF');
    const tree = chartOfAccountsService.buildTree(accounts);
    expect(tree.length).toBeGreaterThan(0);
    expect(tree[0].children).toBeDefined();
  });
});
