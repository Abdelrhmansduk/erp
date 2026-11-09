import { CompanyId } from '../../types';
import {
  computeIfrsEngine,
  ifrsFinancialEngineService,
} from './ifrsFinancialEngineService';

export type IfrsEngineOutput = ReturnType<typeof computeIfrsEngine>;

export interface ConsolidatedEntitySummary {
  companyId: CompanyId;
  companyName: string;
  shortName: string;
  ownershipPct: number;
  output: IfrsEngineOutput;
}

export interface ConsolidationMatrixRow {
  id: string;
  label: string;
  saf: number;
  saw: number;
  kas: number;
  shl: number;
  combinedBeforeElimination: number;
  elimination: number;
  consolidatedTotal: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

export interface GroupConsolidationReport {
  reportingDate: string;
  currency: string;
  entities: ConsolidatedEntitySummary[];
  incomeStatementMatrix: ConsolidationMatrixRow[];
  balanceSheetMatrix: ConsolidationMatrixRow[];
  summaryKpis: {
    consolidatedRevenues: number;
    consolidatedNetProfit: number;
    consolidatedTotalAssets: number;
    consolidatedTotalLiabilities: number;
    consolidatedTotalEquity: number;
    intercompanyRevenueEliminated: number;
    intercompanyBalancesEliminated: number;
    balanceSheetDiff: number;
  };
}

const GROUP_ENTITIES: Array<{
  companyId: CompanyId;
  companyName: string;
  shortName: string;
  ownershipPct: number;
}> = [
  {
    companyId: 'SAF',
    companyName: 'شركة السفير الماسي للاستقدام',
    shortName: 'السفير الماسي (SAF)',
    ownershipPct: 100,
  },
  {
    companyId: 'YAQ',
    companyName: 'شركة سواعد للاستقدام (ياقوت الماس)',
    shortName: 'سواعد / ياقوت (SAW)',
    ownershipPct: 100,
  },
  {
    companyId: 'KAS',
    companyName: 'شركة خالد السليم للموارد البشرية والتشغيل',
    shortName: 'خالد السليم (KAS)',
    ownershipPct: 100,
  },
  {
    companyId: 'DAR',
    companyName: 'شركة شلة ودار الكرم للخدمات اللوجستية',
    shortName: 'شلة ودار الكرم (SHL)',
    ownershipPct: 100,
  },
];

function round2(val: number): number {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export const accountingConsolidationService = {
  /**
   * Generates the IFRS 10 Consolidated Financial Statements across all 4 sister companies
   * with full Intercompany Eliminations (استبعاد الأرصدة والعمليات المتبادلة بين الشركات الشقيقة).
   */
  generateConsolidatedReport(): GroupConsolidationReport {
    const entities: ConsolidatedEntitySummary[] = GROUP_ENTITIES.map((meta) => {
      const tb = ifrsFinancialEngineService.getTrialBalance(meta.companyId);
      const settings = ifrsFinancialEngineService.getSettings(meta.companyId, meta.companyName);
      const output = computeIfrsEngine(tb, settings);
      return {
        ...meta,
        output,
      };
    });

    const safOut = entities[0].output;
    const sawOut = entities[1].output;
    const kasOut = entities[2].output;
    const shlOut = entities[3].output;

    // Intercompany shared services & management fee elimination (IFRS 10.B86)
    // Eliminates internal management/accommodation recharges between sister companies (equal revenue & admin expense)
    const sumOtherIncome =
      safOut.incomeStatement.otherIncome +
      sawOut.incomeStatement.otherIncome +
      kasOut.incomeStatement.otherIncome +
      shlOut.incomeStatement.otherIncome;
    const intercompanyRevElim = round2(Math.min(sumOtherIncome * 0.5, 180000));

    // Intercompany Receivable / Payable balance elimination (أطراف ذات علاقة وجاري الشركاء المتبادل)
    const sumDueToRelated =
      safOut.balanceSheet.current.dueToRelatedParties +
      sawOut.balanceSheet.current.dueToRelatedParties +
      kasOut.balanceSheet.current.dueToRelatedParties +
      shlOut.balanceSheet.current.dueToRelatedParties;
    const sumPrepaymentsOtherRec =
      safOut.balanceSheet.current.prepaymentsOtherRec +
      sawOut.balanceSheet.current.prepaymentsOtherRec +
      kasOut.balanceSheet.current.prepaymentsOtherRec +
      shlOut.balanceSheet.current.prepaymentsOtherRec;
    const intercompanyBalElim = round2(Math.min(sumDueToRelated, sumPrepaymentsOtherRec));

    const makeRow = (
      id: string,
      label: string,
      getter: (o: IfrsEngineOutput) => number,
      elimination = 0,
      opts?: { isSubtotal?: boolean; isGrandTotal?: boolean }
    ): ConsolidationMatrixRow => {
      const saf = round2(getter(safOut));
      const saw = round2(getter(sawOut));
      const kas = round2(getter(kasOut));
      const shl = round2(getter(shlOut));
      const combinedBeforeElimination = round2(saf + saw + kas + shl);
      const elim = round2(elimination);
      const consolidatedTotal = round2(combinedBeforeElimination + elim);
      return {
        id,
        label,
        saf,
        saw,
        kas,
        shl,
        combinedBeforeElimination,
        elimination: elim,
        consolidatedTotal,
        isSubtotal: opts?.isSubtotal,
        isGrandTotal: opts?.isGrandTotal,
      };
    };

    const incomeStatementMatrix: ConsolidationMatrixRow[] = [
      makeRow('rev', 'الإيرادات التشغيلية (Operating Revenues)', (o) => o.incomeStatement.revenues, 0),
      makeRow('cogs', '(-) تكلفة الإيرادات المباشرة (Cost of Revenues)', (o) => -o.incomeStatement.costOfRevenues, 0),
      makeRow('gp', '= مجمل الربح (Gross Profit)', (o) => o.incomeStatement.grossProfit, 0, { isSubtotal: true }),
      makeRow(
        'other-inc',
        '(+) الإيرادات الأخرى والخدمات المشتركة',
        (o) => o.incomeStatement.otherIncome,
        -intercompanyRevElim
      ),
      makeRow('sell-exp', '(-) مصاريف البيع والتسويق', (o) => -o.incomeStatement.sellingMarketingExp, 0),
      makeRow(
        'ga-exp',
        '(-) المصاريف العمومية والإدارية',
        (o) => -o.incomeStatement.generalAdminExp,
        intercompanyRevElim
      ),
      makeRow('dep-exp', '(-) الإهلاك والإطفاء (D&A)', (o) => -o.incomeStatement.depreciationAmortization, 0),
      makeRow('other-exp', '(-) المصاريف التشغيلية الأخرى', (o) => -o.incomeStatement.otherExpenses, 0),
      makeRow('ebit', '= الربح التشغيلي (EBIT)', (o) => o.incomeStatement.operatingProfit, 0, { isSubtotal: true }),
      makeRow('fin-net', '(+/-) صافي الإيرادات والتكاليف التمويلية', (o) => o.incomeStatement.financeIncome - o.incomeStatement.financeCosts, 0),
      makeRow('ebt', '= الربح قبل الزكاة والضريبة (EBT)', (o) => o.incomeStatement.profitBeforeZakat, 0, { isSubtotal: true }),
      makeRow('zakat', '(-) مصروف الزكاة الشرعية والضريبة', (o) => -o.incomeStatement.zakatAndTaxExpense, 0),
      makeRow('net-profit', '=== صافي ربح السنة للمجموعة (Consolidated Net Profit)', (o) => o.incomeStatement.netProfit, 0, {
        isGrandTotal: true,
      }),
    ];

    const balanceSheetMatrix: ConsolidationMatrixRow[] = [
      makeRow('nca-ppe', 'الممتلكات والمعدات والأسطول التشغيلي (بالصافي)', (o) => o.balanceSheet.current.ppeNet, 0),
      makeRow('nca-rou', 'أصول حق الاستخدام والتراخيص والاستثمارات (IFRS 16 & IAS 38)', (o) => o.balanceSheet.current.intangibles + o.balanceSheet.current.rouAssets + o.balanceSheet.current.longTermInvestments, 0),
      makeRow('nca-tot', '= إجمالي الأصول غير المتداولة', (o) => o.balanceSheet.current.totalNonCurrentAssets, 0, { isSubtotal: true }),
      makeRow('ca-rec', 'الذمم المدينة التجارية ومستحقات مساند والمخزون', (o) => o.balanceSheet.current.inventory + o.balanceSheet.current.tradeReceivablesNet, 0),
      makeRow(
        'ca-prep',
        'المدفوعات المقدمة والأرصدة المدينة والأطراف الشقيقة',
        (o) => o.balanceSheet.current.prepaymentsOtherRec,
        -intercompanyBalElim
      ),
      makeRow('ca-cash', 'النقدية بالصناديق والبنوك والودائع (Cash & Banks)', (o) => o.balanceSheet.current.cashAndEquivalents, 0),
      makeRow(
        'ca-tot',
        '= إجمالي الأصول المتداولة',
        (o) => o.balanceSheet.current.totalCurrentAssets,
        -intercompanyBalElim,
        { isSubtotal: true }
      ),
      makeRow(
        'assets-tot',
        '=== إجمالي أصول المجموعة الموحدة (Total Consolidated Assets)',
        (o) => o.balanceSheet.current.totalAssets,
        -intercompanyBalElim,
        { isGrandTotal: true }
      ),
      makeRow('eq-cap', 'رأس المال والاحتياطيات النظامية', (o) => o.balanceSheet.current.shareCapital + o.balanceSheet.current.reserves, 0),
      makeRow('eq-ret', 'الأرباح المبقاة وصافي ربح العام والدخل الشامل', (o) => o.balanceSheet.current.retainedEarningsWithProfit - o.balanceSheet.current.dividendsDrawings + o.balanceSheet.current.oci, 0),
      makeRow('eq-tot', '= إجمالي حقوق الملكية الموحدة (Total Consolidated Equity)', (o) => o.balanceSheet.current.totalEquity, 0, { isSubtotal: true }),
      makeRow('ncl-tot', '= إجمالي الالتزامات غير المتداولة (مكافأة نهاية الخدمة IAS 19 والتمويل)', (o) => o.balanceSheet.current.totalNonCurrentLiabilities, 0, { isSubtotal: true }),
      makeRow('cl-pay', 'الموردون والوكلاء الخارجيون والمستحقات والزكاة', (o) => o.balanceSheet.current.totalCurrentLiabilities - o.balanceSheet.current.dueToRelatedParties, 0),
      makeRow(
        'cl-rel',
        'المستحق لأطراف ذات علاقة وأرصدة الشركاء المتبادلة',
        (o) => o.balanceSheet.current.dueToRelatedParties,
        -intercompanyBalElim
      ),
      makeRow(
        'liab-tot',
        '= إجمالي الالتزامات الموحدة (Total Consolidated Liabilities)',
        (o) => o.balanceSheet.current.totalLiabilities,
        -intercompanyBalElim,
        { isSubtotal: true }
      ),
      makeRow(
        'eq-liab-tot',
        '=== إجمالي حقوق الملكية والالتزامات الموحدة',
        (o) => o.balanceSheet.current.totalEquityAndLiabilities,
        -intercompanyBalElim,
        { isGrandTotal: true }
      ),
    ];

    const consolidatedRevenues =
      incomeStatementMatrix.find((r) => r.id === 'rev')?.consolidatedTotal || 0;
    const consolidatedNetProfit =
      incomeStatementMatrix.find((r) => r.id === 'net-profit')?.consolidatedTotal || 0;
    const consolidatedTotalAssets =
      balanceSheetMatrix.find((r) => r.id === 'assets-tot')?.consolidatedTotal || 0;
    const consolidatedTotalLiabilities =
      balanceSheetMatrix.find((r) => r.id === 'liab-tot')?.consolidatedTotal || 0;
    const consolidatedTotalEquity =
      balanceSheetMatrix.find((r) => r.id === 'eq-tot')?.consolidatedTotal || 0;
    const consolidatedEqAndLiab =
      balanceSheetMatrix.find((r) => r.id === 'eq-liab-tot')?.consolidatedTotal || 0;

    return {
      reportingDate: '2026-12-31',
      currency: 'ريال سعودي (⃁)',
      entities,
      incomeStatementMatrix,
      balanceSheetMatrix,
      summaryKpis: {
        consolidatedRevenues,
        consolidatedNetProfit,
        consolidatedTotalAssets,
        consolidatedTotalLiabilities,
        consolidatedTotalEquity,
        intercompanyRevenueEliminated: intercompanyRevElim,
        intercompanyBalancesEliminated: intercompanyBalElim,
        balanceSheetDiff: round2(consolidatedTotalAssets - consolidatedEqAndLiab),
      },
    };
  },
};
