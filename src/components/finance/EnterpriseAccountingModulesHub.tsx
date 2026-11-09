import React, { useState, useMemo, useEffect } from 'react';
import {
  Landmark,
  FileSpreadsheet,
  FileText,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Scale,
  BookOpen,
  Calculator,
  Clock,
  Layers,
  Target,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAppStore } from '../../stores/appStore';
import { exportData, ExportFormat } from '../../services/exportService';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  computeIfrsEngine,
  TrialBalanceEntry,
  IfrsGeneralSettings,
  IFRS_MAPPING_CODES,
} from '../../services/accounting/ifrsFinancialEngineService';
import {
  enterpriseAccountingSuiteService,
  FixedAssetRecord,
  AgingPartyRecord,
  EclBucketRates,
  LiveJournalEntryRecord,
  DEFAULT_IFRS_NOTES_DEFINITIONS,
} from '../../services/accounting/enterpriseAccountingSuiteService';

export type EnterpriseModuleTab =
  | 'fixed-assets-ias16'
  | 'zatca-vat-zakat'
  | 'aging-ifrs9-ecl'
  | 'ifrs-notes-12'
  | 'budget-variance'
  | 'auto-journals-ledger';

interface EnterpriseAccountingModulesHubProps {
  activeModule?: EnterpriseModuleTab;
  onSelectModule?: (tab: EnterpriseModuleTab) => void;
  engine: ReturnType<typeof computeIfrsEngine>;
  entries: TrialBalanceEntry[];
  settings: IfrsGeneralSettings;
  onEntriesUpdated: (nextEntries: TrialBalanceEntry[]) => void;
  drilldownCodeFilter?: string | null;
  onClearDrilldownFilter?: () => void;
}

export const EnterpriseAccountingModulesHub: React.FC<EnterpriseAccountingModulesHubProps> = ({
  activeModule = 'fixed-assets-ias16',
  onSelectModule,
  engine,
  entries,
  settings,
  onEntriesUpdated,
  drilldownCodeFilter,
  onClearDrilldownFilter,
}) => {
  const { activeCompanyId } = useCompany();
  const { addNotification } = useAppStore();

  const [currentTab, setCurrentTab] = useState<EnterpriseModuleTab>(activeModule);
  useEffect(() => {
    setCurrentTab(activeModule);
  }, [activeModule]);

  const handleTabChange = (tab: EnterpriseModuleTab) => {
    setCurrentTab(tab);
    onSelectModule?.(tab);
  };

  // ==========================================================================
  // STATE FOR ALL 7 ENTERPRISE MODULES
  // ==========================================================================
  const [assets, setAssets] = useState<FixedAssetRecord[]>(() =>
    enterpriseAccountingSuiteService.getFixedAssets(activeCompanyId)
  );
  const [agingRecords, setAgingRecords] = useState<AgingPartyRecord[]>(() =>
    enterpriseAccountingSuiteService.getAgingRecords(activeCompanyId)
  );
  const [eclRates, setEclRates] = useState<EclBucketRates>(() =>
    enterpriseAccountingSuiteService.getEclRates(activeCompanyId)
  );
  const [journalLog, setJournalLog] = useState<LiveJournalEntryRecord[]>(() =>
    enterpriseAccountingSuiteService.getJournalLog(activeCompanyId)
  );
  const [budgetOverrides, setBudgetOverrides] = useState<
    Record<string, { budget: number; costCenter: string; notes: string }>
  >(() => enterpriseAccountingSuiteService.getBudgetOverrides(activeCompanyId));
  const [customNotesText, setCustomNotesText] = useState<Record<number, string>>(() =>
    enterpriseAccountingSuiteService.getCustomNotesText(activeCompanyId)
  );

  // VAT & Zakat editable adjustments
  const [vatZeroRatedSales, setVatZeroRatedSales] = useState<number>(0);
  const [vatInputAdjustments, setVatInputAdjustments] = useState<number>(0);
  const [zakatAddedProvisions, setZakatAddedProvisions] = useState<number>(45000);
  const [zakatDisallowedExpenses, setZakatDisallowedExpenses] = useState<number>(18500);

  // Auto-posting templates amounts
  const [tplPayrollSalaries, setTplPayrollSalaries] = useState<number>(145000);
  const [tplPayrollEosb, setTplPayrollEosb] = useState<number>(12500);
  const [tplMusanedContractVal, setTplMusanedContractVal] = useState<number>(180000);
  const [tplMusanedAgentCost, setTplMusanedAgentCost] = useState<number>(92000);
  const [ledgerFilterText, setLedgerFilterText] = useState<string>(drilldownCodeFilter || '');

  useEffect(() => {
    if (drilldownCodeFilter) {
      setLedgerFilterText(drilldownCodeFilter);
    }
  }, [drilldownCodeFilter]);

  // Reload when company changes or external journal sync occurs
  useEffect(() => {
    const reload = () => {
      setAssets(enterpriseAccountingSuiteService.getFixedAssets(activeCompanyId));
      setAgingRecords(enterpriseAccountingSuiteService.getAgingRecords(activeCompanyId));
      setEclRates(enterpriseAccountingSuiteService.getEclRates(activeCompanyId));
      setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
      setBudgetOverrides(enterpriseAccountingSuiteService.getBudgetOverrides(activeCompanyId));
      setCustomNotesText(enterpriseAccountingSuiteService.getCustomNotesText(activeCompanyId));
    };
    reload();
    window.addEventListener('erp-ifrs-live-sync', reload);
    return () => window.removeEventListener('erp-ifrs-live-sync', reload);
  }, [activeCompanyId]);

  const fmt = (n: number) => `${Math.round(n).toLocaleString()} ⃁`;

  // ==========================================================================
  // 1. IAS 16 FIXED ASSETS COMPUTATIONS & HANDLERS
  // ==========================================================================
  const computedAssets = useMemo(() => {
    return assets.map((a) => {
      const depreciableBase = Math.max(0, a.cost - a.salvageValue);
      const periodDep = Math.round((depreciableBase * (a.annualDepRatePct || 0)) / 100);
      const maxRemaining = Math.max(0, depreciableBase - a.openingAccumDep);
      const actualPeriodDep = Math.min(periodDep, maxRemaining);
      const closingAccumDep = a.openingAccumDep + actualPeriodDep;
      const netBookValue = Math.max(0, a.cost - closingAccumDep);
      return {
        ...a,
        depreciableBase,
        periodDep: actualPeriodDep,
        closingAccumDep,
        netBookValue,
      };
    });
  }, [assets]);

  const assetTotals = useMemo(() => {
    return computedAssets.reduce(
      (acc, a) => {
        acc.cost += a.cost;
        acc.salvage += a.salvageValue;
        acc.openingAccum += a.openingAccumDep;
        acc.periodDep += a.periodDep;
        acc.closingAccum += a.closingAccumDep;
        acc.nbv += a.netBookValue;
        return acc;
      },
      { cost: 0, salvage: 0, openingAccum: 0, periodDep: 0, closingAccum: 0, nbv: 0 }
    );
  }, [computedAssets]);

  const handleUpdateAsset = (id: string, patch: Partial<FixedAssetRecord>) => {
    const next = assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
    setAssets(next);
    enterpriseAccountingSuiteService.saveFixedAssets(activeCompanyId, next);
  };

  const handleAddAsset = () => {
    const nextIdx = assets.length + 1;
    const newAsset: FixedAssetRecord = {
      id: `fa-${Date.now()}`,
      assetCode: `FA-100${nextIdx}`,
      assetName: `أصل ثابت تشغيلي جديد #${nextIdx}`,
      category: 'أثاث وتجهيزات مكتبية',
      assetAccountErpCode: '12106',
      accumDepAccountErpCode: '12204',
      ifrsAssetCode: 'A-01-06',
      ifrsAccumCode: 'A-02-04',
      purchaseDate: new Date().toISOString().slice(0, 10),
      cost: 85000,
      salvageValue: 5000,
      usefulLifeYears: 5,
      annualDepRatePct: 20,
      openingAccumDep: 0,
      costCenter: 'مركز تكلفة التشغيل والإيواء',
      location: 'الرياض — المقر الرئيسي',
      status: 'نشط بالخدمة',
    };
    const next = [...assets, newAsset];
    setAssets(next);
    enterpriseAccountingSuiteService.saveFixedAssets(activeCompanyId, next);
    addNotification({
      title: 'إضافة أصل ثابت جديد (IAS 16)',
      message: `تمت إضافة (${newAsset.assetName}) إلى سجل الأصول الثابتة بنجاح.`,
      type: 'success',
    });
  };

  const handleDeleteAsset = (id: string, name: string) => {
    const next = assets.filter((a) => a.id !== id);
    setAssets(next);
    enterpriseAccountingSuiteService.saveFixedAssets(activeCompanyId, next);
    addNotification({
      title: 'حذف أصل من السجل',
      message: `تم حذف الأصل (${name}) من سجل الأصول الثابتة.`,
      type: 'info',
    });
  };

  const handlePostDepreciationToTrialBalance = () => {
    if (assetTotals.periodDep <= 0) return;
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `إثبات وترحيل قسط إهلاك الأصول الثابتة السنوي المعتمد (IAS 16) لعدد (${assets.length}) أصل`,
        sourceModule: 'إهلاك أصول IAS 16',
        referenceDoc: `DEP-IAS16-${settings.reportingDate}`,
        lines: [
          {
            ifrsTargetCode: 'R-10',
            fallbackAccountName: 'مصروف إهلاك الممتلكات والمعدات والأصول الثابتة (IAS 16)',
            debit: assetTotals.periodDep,
            credit: 0,
            costCenter: 'الإدارة المالية — إهلاك الأصول',
          },
          {
            ifrsTargetCode: 'A-02',
            fallbackAccountName: 'مجمع إهلاك الممتلكات والمباني والمعدات (IAS 16)',
            debit: 0,
            credit: assetTotals.periodDep,
            costCenter: 'الإدارة المالية — إهلاك الأصول',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل قيد الإهلاك الآلي (IAS 16)',
      message: `تم ترحيل قيد إهلاك بمبلغ (${fmt(assetTotals.periodDep)}) برقم (${record.entryNumber}) إلى ميزان المراجعة وقائمة الدخل والمركز المالي.`,
      type: 'success',
    });
  };

  // ==========================================================================
  // 2. ZATCA VAT 15% & ZAKAT 2.5% COMPUTATIONS & HANDLERS
  // ==========================================================================
  const vatSummary = useMemo(() => {
    const standardSales = Math.max(0, engine.incomeStatement.revenues);
    const outputVat15 = Math.round(standardSales * 0.15);
    const taxablePurchases =
      Math.max(0, engine.incomeStatement.costOfRevenues * 0.65) +
      Math.max(0, engine.incomeStatement.sellingMarketingExp * 0.85) +
      Math.max(0, engine.incomeStatement.generalAdminExp * 0.45);
    const inputVat15 = Math.round(taxablePurchases * 0.15);
    const netVatPayable = outputVat15 - inputVat15 - vatInputAdjustments;
    return {
      standardSales,
      zeroRatedSales: vatZeroRatedSales,
      totalSales: standardSales + vatZeroRatedSales,
      outputVat15,
      taxablePurchases: Math.round(taxablePurchases),
      inputVat15,
      vatInputAdjustments,
      netVatPayable,
    };
  }, [engine.incomeStatement, vatZeroRatedSales, vatInputAdjustments]);

  const zakatSummary = useMemo(() => {
    const bs = engine.balanceSheet.current;
    const adjustedNetProfit =
      engine.incomeStatement.profitBeforeZakat + zakatDisallowedExpenses;
    const zakatAdditions =
      bs.shareCapital +
      bs.reserves +
      bs.retainedEarningsWithProfit +
      adjustedNetProfit +
      bs.totalNonCurrentLiabilities +
      zakatAddedProvisions;
    const zakatDeductions = bs.totalNonCurrentAssets;
    const zakatBase = Math.max(adjustedNetProfit, zakatAdditions - zakatDeductions);
    const zakatDue25 = Math.round(zakatBase * 0.025);
    return {
      shareCapital: bs.shareCapital,
      reserves: bs.reserves,
      retainedEarnings: bs.retainedEarningsWithProfit,
      adjustedNetProfit,
      longTermLiabilities: bs.totalNonCurrentLiabilities,
      zakatAddedProvisions,
      totalAdditions: zakatAdditions,
      nonCurrentAssetsDeduction: zakatDeductions,
      zakatBase,
      zakatDue25,
      currentRecordedZakat: Math.max(bs.zakatTaxPayable, engine.incomeStatement.zakatAndTaxExpense),
    };
  }, [engine.balanceSheet.current, engine.incomeStatement, zakatAddedProvisions, zakatDisallowedExpenses]);

  const handlePostZakatProvision = () => {
    if (zakatSummary.zakatDue25 <= 0) return;
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `إثبات مخصص الزكاة الشرعية عن السنة المالية بنسبة 2.5% من الوعاء الزكوي (ZATCA / SOCPA)`,
        sourceModule: 'إقرار ضريبي / زكوي ZATCA',
        referenceDoc: `ZAKAT-${settings.reportingDate}`,
        lines: [
          {
            ifrsTargetCode: 'R-09',
            fallbackAccountName: 'مصروف الزكاة الشرعية للسنة (R-09)',
            debit: zakatSummary.zakatDue25,
            credit: 0,
            costCenter: 'الإدارة المالية — الزكاة والضريبة',
          },
          {
            ifrsTargetCode: 'L-08',
            fallbackAccountName: 'مخصص الزكاة الشرعية المستحقة لهيئة الزكاة والضريبة والجمارك (L-08)',
            debit: 0,
            credit: zakatSummary.zakatDue25,
            costCenter: 'الإدارة المالية — الزكاة والضريبة',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل مخصص الزكاة الشرعية (2.5%)',
      message: `تم إثبات وترحيل قيد الزكاة الشرعية بمبلغ (${fmt(zakatSummary.zakatDue25)}) برقم (${record.entryNumber}) إلى ميزان المراجعة.`,
      type: 'success',
    });
  };

  const handlePostVatSettlement = () => {
    const amount = Math.abs(vatSummary.netVatPayable);
    if (amount <= 0) return;
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `قيد تسوية وسداد إقرار ضريبة القيمة المضافة (15% ZATCA VAT Return)`,
        sourceModule: 'إقرار ضريبي / زكوي ZATCA',
        referenceDoc: `VAT-RET-${settings.reportingDate}`,
        lines: [
          {
            ifrsTargetCode: 'L-05',
            fallbackAccountName: 'تسوية ضريبة القيمة المضافة المستحقة لهيئة الزكاة (L-05-03)',
            debit: amount,
            credit: 0,
            costCenter: 'الإدارة المالية — الزكاة والضريبة',
          },
          {
            ifrsTargetCode: 'A-10',
            fallbackAccountName: 'البنك الأهلي السعودي — سداد سداد الزكاة والضريبة (A-10)',
            debit: 0,
            credit: amount,
            costCenter: 'الإدارة المالية — الزكاة والضريبة',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل قيد تسوية ضريبة القيمة المضافة',
      message: `تم ترحيل قيد تسوية ضريبة القيمة المضافة بمبلغ (${fmt(amount)}) برقم (${record.entryNumber}).`,
      type: 'success',
    });
  };

  // ==========================================================================
  // 3. IFRS 9 AR/AP AGING & ECL PROVISION COMPUTATIONS
  // ==========================================================================
  const computedAging = useMemo(() => {
    return agingRecords.map((rec) => {
      const total = rec.bucket0to30 + rec.bucket31to60 + rec.bucket61to90 + rec.bucketOver90;
      const isReceivable = rec.ifrsCode === 'A-08';
      const eclProvision = isReceivable
        ? Math.round(
            (rec.bucket0to30 * eclRates.rate0to30Pct) / 100 +
              (rec.bucket31to60 * eclRates.rate31to60Pct) / 100 +
              (rec.bucket61to90 * eclRates.rate61to90Pct) / 100 +
              (rec.bucketOver90 * eclRates.rateOver90Pct) / 100
          )
        : 0;
      return {
        ...rec,
        total,
        eclProvision,
        netRealizable: total - eclProvision,
      };
    });
  }, [agingRecords, eclRates]);

  const agingTotals = useMemo(() => {
    const ar = computedAging.filter((r) => r.ifrsCode === 'A-08');
    const ap = computedAging.filter((r) => r.ifrsCode === 'L-04');
    return {
      arTotal: ar.reduce((s, r) => s + r.total, 0),
      arEcl: ar.reduce((s, r) => s + r.eclProvision, 0),
      arOver90: ar.reduce((s, r) => s + r.bucketOver90, 0),
      apTotal: ap.reduce((s, r) => s + r.total, 0),
    };
  }, [computedAging]);

  const handleUpdateAgingRecord = (id: string, patch: Partial<AgingPartyRecord>) => {
    const next = agingRecords.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setAgingRecords(next);
    enterpriseAccountingSuiteService.saveAgingRecords(activeCompanyId, next);
  };

  const handleAddAgingParty = (ifrsCode: 'A-08' | 'L-04') => {
    const newRec: AgingPartyRecord = {
      id: `ag-${Date.now()}`,
      partyCode: ifrsCode === 'A-08' ? `CUST-${100 + agingRecords.length + 1}` : `VEND-${200 + agingRecords.length + 1}`,
      partyName: ifrsCode === 'A-08' ? 'عميل ذمم مدينة جديد' : 'مورد / وكيل خارجي جديد',
      partyType: ifrsCode === 'A-08' ? 'عميل / ذمم مدينة (A-08)' : 'مورد / وكيل خارجي (L-04)',
      ifrsCode,
      bucket0to30: 50000,
      bucket31to60: 15000,
      bucket61to90: 5000,
      bucketOver90: 0,
      notes: 'مضاف حديثاً في جدول أعمار الديون',
    };
    const next = [...agingRecords, newRec];
    setAgingRecords(next);
    enterpriseAccountingSuiteService.saveAgingRecords(activeCompanyId, next);
  };

  const handlePostEclProvision = () => {
    if (agingTotals.arEcl <= 0) return;
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `إثبات مخصص الخسائر الائتمانية المتوقعة للذمم المدينة وفق مصفوفة أعمار الديون (IFRS 9 ECL)`,
        sourceModule: 'مخصص ديون IFRS 9',
        referenceDoc: `ECL-IFRS9-${settings.reportingDate}`,
        lines: [
          {
            ifrsTargetCode: 'R-05',
            fallbackAccountName: 'مصروف مخصص الخسائر الائتمانية المتوقعة (IFRS 9 ECL - R-05)',
            debit: agingTotals.arEcl,
            credit: 0,
            costCenter: 'الإدارة المالية — مخاطر الائتمان والتحصيل',
          },
          {
            ifrsTargetCode: 'A-08',
            fallbackAccountName: 'مجمع مخصص الديون المشكوك في تحصيلها والخسائر الائتمانية (A-08)',
            debit: 0,
            credit: agingTotals.arEcl,
            costCenter: 'الإدارة المالية — مخاطر الائتمان والتحصيل',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل مخصص الخسائر الائتمانية (IFRS 9 ECL)',
      message: `تم إثبات وترحيل قيد مخصص ECL بمبلغ (${fmt(agingTotals.arEcl)}) برقم (${record.entryNumber}) إلى ميزان المراجعة.`,
      type: 'success',
    });
  };

  // ==========================================================================
  // 4. BUDGET VS ACTUAL COMPUTATIONS
  // ==========================================================================
  const budgetRows = useMemo(() => {
    const inc = engine.incomeStatement;
    const baseLines: Array<{
      code: string;
      nameAr: string;
      category: 'إيرادات' | 'مصروفات';
      actual: number;
      defaultBudget: number;
      defaultCostCenter: string;
    }> = [
      {
        code: 'R-01',
        nameAr: 'الإيرادات من العقود مع العملاء (استقدام ومساند وتشغيل)',
        category: 'إيرادات',
        actual: inc.revenues,
        defaultBudget: Math.round(inc.revenues * 1.15) || 2500000,
        defaultCostCenter: 'مركز تكلفة الاستقدام ومساند',
      },
      {
        code: 'R-02',
        nameAr: 'تكلفة الإيرادات المباشرة (الوكلاء، التذاكر، التأشيرات، الإيواء)',
        category: 'مصروفات',
        actual: inc.costOfRevenues,
        defaultBudget: Math.round(inc.costOfRevenues * 0.92) || 1200000,
        defaultCostCenter: 'مركز تكلفة التشغيل والإيواء',
      },
      {
        code: 'R-03',
        nameAr: 'مصروفات البيع والتسويق وعمولات المبيعات',
        category: 'مصروفات',
        actual: inc.sellingMarketingExp,
        defaultBudget: Math.round(inc.sellingMarketingExp * 0.95) || 180000,
        defaultCostCenter: 'مركز تكلفة التسويق والمبيعات',
      },
      {
        code: 'R-04',
        nameAr: 'المصروفات العمومية والإدارية والرواتب والإيجارات',
        category: 'مصروفات',
        actual: inc.generalAdminExp,
        defaultBudget: Math.round(inc.generalAdminExp * 0.94) || 450000,
        defaultCostCenter: 'مركز تكلفة الإدارة العامة والموارد البشرية',
      },
      {
        code: 'R-05',
        nameAr: 'مخصص الخسائر الائتمانية المتوقعة (IFRS 9 ECL)',
        category: 'مصروفات',
        actual: inc.otherExpenses,
        defaultBudget: Math.round(inc.otherExpenses * 0.9) || 35000,
        defaultCostCenter: 'الإدارة المالية والتحصيل',
      },
      {
        code: 'R-06',
        nameAr: 'الإيرادات التشغيلية الأخرى والتعويضات',
        category: 'إيرادات',
        actual: inc.otherIncome,
        defaultBudget: Math.round(inc.otherIncome * 1.1) || 60000,
        defaultCostCenter: 'الإدارة العامة',
      },
      {
        code: 'R-08',
        nameAr: 'تكاليف التمويل والعمولات البنكية وفوائد عقود الإيجار',
        category: 'مصروفات',
        actual: inc.financeCosts,
        defaultBudget: Math.round(inc.financeCosts * 0.9) || 40000,
        defaultCostCenter: 'الإدارة المالية والخزينة',
      },
      {
        code: 'R-09',
        nameAr: 'مصروف الزكاة الشرعية وضريبة الدخل',
        category: 'مصروفات',
        actual: inc.zakatAndTaxExpense,
        defaultBudget: Math.round(inc.zakatAndTaxExpense) || 55000,
        defaultCostCenter: 'الإدارة المالية والزكاة',
      },
      {
        code: 'R-10',
        nameAr: 'مصروف الإهلاك والإطفاء للأصول الثابتة (IAS 16)',
        category: 'مصروفات',
        actual: inc.depreciationAmortization,
        defaultBudget: Math.round(inc.depreciationAmortization) || 85000,
        defaultCostCenter: 'مركز تكلفة الأصول والإيواء',
      },
    ];

    return baseLines.map((item) => {
      const ov = budgetOverrides[item.code];
      const budget = ov?.budget ?? item.defaultBudget;
      const costCenter = ov?.costCenter ?? item.defaultCostCenter;
      const notes = ov?.notes ?? 'موازنة تقديرية معتمدة';
      const varianceAmount =
        item.category === 'إيرادات' ? item.actual - budget : budget - item.actual;
      const variancePct = budget > 0 ? ((item.actual - budget) / budget) * 100 : 0;
      const isFavorable = varianceAmount >= 0;
      return {
        ...item,
        budget,
        costCenter,
        notes,
        varianceAmount,
        variancePct,
        isFavorable,
      };
    });
  }, [engine.incomeStatement, budgetOverrides]);

  const handleUpdateBudgetLine = (
    code: string,
    patch: Partial<{ budget: number; costCenter: string; notes: string }>
  ) => {
    const existing = budgetOverrides[code] || {
      budget: budgetRows.find((r) => r.code === code)?.budget || 0,
      costCenter: budgetRows.find((r) => r.code === code)?.costCenter || '',
      notes: budgetRows.find((r) => r.code === code)?.notes || '',
    };
    const next = {
      ...budgetOverrides,
      [code]: { ...existing, ...patch },
    };
    setBudgetOverrides(next);
    enterpriseAccountingSuiteService.saveBudgetOverrides(activeCompanyId, next);
  };

  // ==========================================================================
  // 5. ONE-CLICK OPERATIONAL AUTO-POSTING TEMPLATES
  // ==========================================================================
  const handlePostPayrollTemplate = () => {
    const total = tplPayrollSalaries + tplPayrollEosb;
    if (total <= 0) return;
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `قيد استحقاق وصرف مسير الرواتب والأجور الشهري (WPS) ومخصص نهاية الخدمة (IAS 19)`,
        sourceModule: 'تسوية مساند / رواتب',
        referenceDoc: `WPS-${new Date().toISOString().slice(0, 7)}`,
        lines: [
          {
            ifrsTargetCode: 'R-04',
            fallbackAccountName: 'رواتب وأجور وبدلات الكوادر الإدارية والتشغيلية (R-04)',
            debit: tplPayrollSalaries,
            credit: 0,
            costCenter: 'مركز تكلفة الموارد البشرية',
          },
          {
            ifrsTargetCode: 'R-04',
            fallbackAccountName: 'مصروف مكافأة نهاية الخدمة للفترة (IAS 19 - R-04)',
            debit: tplPayrollEosb,
            credit: 0,
            costCenter: 'مركز تكلفة الموارد البشرية',
          },
          {
            ifrsTargetCode: 'A-10',
            fallbackAccountName: 'البنك الأهلي السعودي — صرف مسير حماية الأجور (A-10)',
            debit: 0,
            credit: tplPayrollSalaries,
            costCenter: 'مركز تكلفة الموارد البشرية',
          },
          {
            ifrsTargetCode: 'L-03',
            fallbackAccountName: 'مخصص مكافأة نهاية الخدمة للموظفين (IAS 19 - L-03)',
            debit: 0,
            credit: tplPayrollEosb,
            costCenter: 'مركز تكلفة الموارد البشرية',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل قيد مسير الرواتب ومخصص نهاية الخدمة',
      message: `تم ترحيل القيد (${record.entryNumber}) بإجمالي (${fmt(total)}) إلى ميزان المراجعة والقوائم المالية.`,
      type: 'success',
    });
  };

  const handlePostMusanedSettlementTemplate = () => {
    if (tplMusanedContractVal <= 0) return;
    const vat15 = Math.round(tplMusanedContractVal * 0.15);
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `قيد تسوية عقود مساند المكتملة: إثبات الإيراد المكتسب (IFRS 15) وتكلفة الوكيل الخارجي وضريبة 15%`,
        sourceModule: 'تسوية مساند / رواتب',
        referenceDoc: `MUSANED-SETTLE-${Date.now().toString().slice(-4)}`,
        lines: [
          {
            ifrsTargetCode: 'A-10',
            fallbackAccountName: 'البنك / محفظة مساند — تحصيل دفعات العقود شاملة الضريبة (A-10)',
            debit: tplMusanedContractVal + vat15,
            credit: 0,
            costCenter: 'مركز تكلفة الاستقدام ومساند',
          },
          {
            ifrsTargetCode: 'R-01',
            fallbackAccountName: 'إيرادات عقود الاستقدام والتشغيل المعتمدة (IFRS 15 - R-01)',
            debit: 0,
            credit: tplMusanedContractVal,
            costCenter: 'مركز تكلفة الاستقدام ومساند',
          },
          {
            ifrsTargetCode: 'L-05',
            fallbackAccountName: 'ضريبة القيمة المضافة للمخرجات 15% (ZATCA - L-05)',
            debit: 0,
            credit: vat15,
            costCenter: 'الإدارة المالية والضريبة',
          },
          {
            ifrsTargetCode: 'R-02',
            fallbackAccountName: 'تكلفة الإيرادات المباشرة — عمولات الوكلاء والتأشيرات والتذاكر (R-02)',
            debit: tplMusanedAgentCost,
            credit: 0,
            costCenter: 'مركز تكلفة الاستقدام ومساند',
          },
          {
            ifrsTargetCode: 'L-04',
            fallbackAccountName: 'ذمم دائنة تجارية — مستحقات الوكلاء الخارجيين (L-04)',
            debit: 0,
            credit: tplMusanedAgentCost,
            costCenter: 'مركز تكلفة الاستقدام ومساند',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل قيد تسوية عقود مساند والوكلاء',
      message: `تم ترحيل القيد (${record.entryNumber}) بإيراد (${fmt(tplMusanedContractVal)}) وتكلفة (${fmt(tplMusanedAgentCost)}) إلى الميزان والقوائم.`,
      type: 'success',
    });
  };

  const handlePostYearEndClosingTemplate = () => {
    const netProfit = Math.max(0, Math.round(engine.incomeStatement.netProfit));
    if (netProfit <= 0) {
      addNotification({
        title: 'تنبيه إقفال السنة المالية',
        message: 'صافي الربح الحالي غير موجب لإجراء قيد تحويل الاحتياطي النظامي 10%.',
        type: 'warning',
      });
      return;
    }
    const statutoryReserve10 = Math.round(netProfit * 0.1);
    const { updatedEntries, record } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: `قيد توزيع إقفال السنة المالية: تحويل 10% من صافي الربح إلى الاحتياطي النظامي (E-02) من الأرباح المبقاة (E-03)`,
        sourceModule: 'قيد يومية يدوي',
        referenceDoc: `CLOSE-${settings.reportingDate}`,
        lines: [
          {
            ifrsTargetCode: 'E-03',
            fallbackAccountName: 'الأرباح المبقاة — تحويل للاحتياطي النظامي (E-03)',
            debit: statutoryReserve10,
            credit: 0,
            costCenter: 'حقوق الملكية والإقفال السنوي',
          },
          {
            ifrsTargetCode: 'E-02',
            fallbackAccountName: 'الاحتياطي النظامي المكون (10% من صافي الربح - E-02)',
            debit: 0,
            credit: statutoryReserve10,
            costCenter: 'حقوق الملكية والإقفال السنوي',
          },
        ],
      }
    );
    onEntriesUpdated(updatedEntries);
    setJournalLog(enterpriseAccountingSuiteService.getJournalLog(activeCompanyId));
    addNotification({
      title: 'تم ترحيل قيد الاحتياطي النظامي وإقفال السنة',
      message: `تم تحويل 10% (${fmt(statutoryReserve10)}) إلى الاحتياطي النظامي بموجب القيد (${record.entryNumber}).`,
      type: 'success',
    });
  };

  // ==========================================================================
  // EXPORT BUNDLE BUILDER FOR ALL 6 SUB-MODULES
  // ==========================================================================
  const getActiveModuleExportBundle = () => {
    if (currentTab === 'fixed-assets-ias16') {
      return {
        sectionKey: 'fixed-assets-ias16',
        title: `سجل الأصول الثابتة وجدول الإهلاك الآلي (IAS 16) — ${settings.companyName}`,
        rows: computedAssets.map((a) => ({
          'كود الأصل': a.assetCode,
          'اسم الأصل الثابت': a.assetName,
          'الفئة': a.category,
          'كود البند': a.ifrsAssetCode,
          'تاريخ الشراء': a.purchaseDate,
          'التكلفة الرأسمالية': a.cost,
          'القيمة التخريدية': a.salvageValue,
          'العمر الإنتاجي (سنوات)': a.usefulLifeYears,
          'نسبة الإهلاك %': `${a.annualDepRatePct}%`,
          'مجمع إهلاك أول المدة': a.openingAccumDep,
          'قسط إهلاك الفترة': a.periodDep,
          'مجمع إهلاك آخر المدة': a.closingAccumDep,
          'صافي القيمة الدفترية (NBV)': a.netBookValue,
          'مركز التكلفة': a.costCenter,
        })),
      };
    }
    if (currentTab === 'zatca-vat-zakat') {
      return {
        sectionKey: 'zatca-vat-zakat',
        title: `الإقرار الضريبي (VAT 15%) وحاسبة الزكاة الشرعية (2.5%) — ${settings.companyName}`,
        rows: [
          { 'البيان': 'المبيعات الخاضعة للنسبة الأساسية (15%)', 'الوعاء / المبلغ (⃁)': vatSummary.standardSales, 'الضريبة / الزكاة (⃁)': vatSummary.outputVat15, 'المرجع': 'ZATCA Box 1' },
          { 'البيان': 'المشتريات والمصروفات الخاضعة للنسبة الأساسية (15%)', 'الوعاء / المبلغ (⃁)': vatSummary.taxablePurchases, 'الضريبة / الزكاة (⃁)': vatSummary.inputVat15, 'المرجع': 'ZATCA Box 4' },
          { 'البيان': 'صافي ضريبة القيمة المضافة المستحقة للسداد', 'الوعاء / المبلغ (⃁)': vatSummary.totalSales, 'الضريبة / الزكاة (⃁)': vatSummary.netVatPayable, 'المرجع': 'ZATCA Box 6 (L-05-03)' },
          { 'البيان': 'إجمالي إضافات الوعاء الزكوي (حقوق الملكية + الالتزامات + الأرباح)', 'الوعاء / المبلغ (⃁)': zakatSummary.totalAdditions, 'الضريبة / الزكاة (⃁)': 0, 'المرجع': 'SOCPA Zakat' },
          { 'البيان': 'إجمالي حسومات الوعاء الزكوي (صافي الأصول غير المتداولة)', 'الوعاء / المبلغ (⃁)': zakatSummary.nonCurrentAssetsDeduction, 'الضريبة / الزكاة (⃁)': 0, 'المرجع': 'SOCPA Zakat' },
          { 'البيان': 'الوعاء الزكوي المعتمد ومخصص الزكاة الشرعية (2.5%)', 'الوعاء / المبلغ (⃁)': zakatSummary.zakatBase, 'الضريبة / الزكاة (⃁)': zakatSummary.zakatDue25, 'المرجع': 'IAS 12 / L-08' },
        ],
      };
    }
    if (currentTab === 'aging-ifrs9-ecl') {
      return {
        sectionKey: 'aging-ifrs9-ecl',
        title: `جدول أعمار الديون ومخصص الخسائر الائتمانية المتوقعة (IFRS 9 ECL) — ${settings.companyName}`,
        rows: computedAging.map((r) => ({
          'الكود': r.partyCode,
          'اسم العميل / المورد': r.partyName,
          'النوع': r.partyType,
          '0 - 30 يوم': r.bucket0to30,
          '31 - 60 يوم': r.bucket31to60,
          '61 - 90 يوم (ضمان مساند)': r.bucket61to90,
          'أكثر من 90 يوماً': r.bucketOver90,
          'إجمالي الرصيد': r.total,
          'مخصص الخسائر الائتمانية (ECL)': r.eclProvision,
          'صافي القيمة القابلة للتحقق': r.netRealizable,
        })),
      };
    }
    if (currentTab === 'ifrs-notes-12') {
      return {
        sectionKey: 'ifrs-notes-12',
        title: `الإيضاحات المتممة للقوائم المالية (IFRS Notes 1-12) — ${settings.companyName}`,
        rows: DEFAULT_IFRS_NOTES_DEFINITIONS.map((n) => {
          const matching = engine.rows.filter((r) => n.linkedCodes.includes(r.approvedCode));
          const totalDebit = matching.reduce((s, r) => s + r.closingDebit, 0);
          const totalCredit = matching.reduce((s, r) => s + r.closingCredit, 0);
          return {
            'رقم الإيضاح': `إيضاح (${n.noteNumber})`,
            'عنوان الإيضاح المالي': n.titleAr,
            'مرجع المعيار': n.ifrsRef,
            'الأكواد المرتبطة': n.linkedCodes.join(' / ') || 'عام',
            'عدد الحسابات': matching.length,
            'إجمالي مدين': totalDebit,
            'إجمالي دائن': totalCredit,
            'السياسة والإفصاح المحاسبي': customNotesText[n.noteNumber] ?? n.defaultPolicyText,
          };
        }),
      };
    }
    if (currentTab === 'budget-variance') {
      return {
        sectionKey: 'budget-variance',
        title: `الموازنة التقديرية وتحليل الانحرافات ومراكز التكلفة — ${settings.companyName}`,
        rows: budgetRows.map((b) => ({
          'كود البند': b.code,
          'اسم البند': b.nameAr,
          'التصنيف': b.category,
          'مركز التكلفة': b.costCenter,
          'الفعلي (⃁)': b.actual,
          'الموازنة التقديرية (⃁)': b.budget,
          'الانحراف (⃁)': b.varianceAmount,
          'نسبة الانحراف %': `${b.variancePct.toFixed(1)}%`,
          'التقييم': b.isFavorable ? 'أداء إيجابي / ضمن الموازنة' : 'تجاوز الموازنة المخططة',
        })),
      };
    }
    return {
      sectionKey: 'auto-journals-ledger',
      title: `سجل قيود اليومية الموحد وكشف حركة الحسابات — ${settings.companyName}`,
      rows: journalLog.flatMap((j) =>
        j.lines.map((l) => ({
          'رقم القيد': j.entryNumber,
          'التاريخ': j.date,
          'المصدر': j.sourceModule,
          'المرجع': j.referenceDoc || '-',
          'البيان': j.description,
          'رقم الحساب': l.erpCode,
          'اسم الحساب': l.accountName,
          'كود IFRS': l.ifrsCode,
          'مدين': l.debit,
          'دائن': l.credit,
          'مركز التكلفة': l.costCenter || '-',
        }))
      ),
    };
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Sub-Navigation Strip for the 6 Enterprise Modules */}
      <div className="bg-white rounded-3xl p-5 border border-[#e0e0e0] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                ENTERPRISE ACCOUNTING SUITE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-semibold">
                مرتبط لحظياً بميزان المراجعة ({entries.length} حساب) والقوائم المالية الختامية
              </span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-[#141414] m-0">
              المنظومات التخصصية المكملة: الأصول والإهلاك • الزكاة والضريبة • أعمار الديون • الإيضاحات المتممة • الموازنات • القيود الآلية
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const b = getActiveModuleExportBundle();
                exportData(b.sectionKey, b.rows, 'excel', b.title);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const b = getActiveModuleExportBundle();
                exportData(b.sectionKey, b.rows, 'pdf', b.title);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تصدير PDF</span>
            </button>
            <ExportDropdown
              sectionKey={getActiveModuleExportBundle().sectionKey}
              data={getActiveModuleExportBundle().rows}
              dataProvider={() => getActiveModuleExportBundle().rows}
              customTitle={getActiveModuleExportBundle().title}
              buttonLabel="جميع صيغ التصدير والمعاينة"
              variant="outline-light"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] overflow-x-auto">
          {[
            { id: 'fixed-assets-ias16', label: '1. سجل الأصول الثابتة والإهلاك الآلي (IAS 16)', icon: Landmark },
            { id: 'zatca-vat-zakat', label: '2. الإقرار الضريبي (15%) والزكوي (2.5% ZATCA)', icon: Calculator },
            { id: 'aging-ifrs9-ecl', label: '3. أعمار الديون ومخصص الائتمان (IFRS 9 ECL)', icon: Clock },
            { id: 'ifrs-notes-12', label: '4. الإيضاحات المتممة للقوائم المالية (1–12)', icon: BookOpen },
            { id: 'budget-variance', label: '5. الموازنات التقديرية وتحليل الانحرافات', icon: Target },
            { id: 'auto-journals-ledger', label: `6. القيود التشغيلية الآلية وكشف الحركة (${journalLog.length})`, icon: Layers },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as EnterpriseModuleTab)}
                className={`px-3.5 py-2 rounded-full text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#141414] text-[#ffffff] font-bold'
                    : 'text-[#141414] font-medium hover:bg-[#e0e0e0]'
                }`}
              >
                <IconComp className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================
          MODULE 1: IAS 16 FIXED ASSETS REGISTER & AUTO-DEPRECIATION
         ======================================================================== */}
      {currentTab === 'fixed-assets-ias16' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
            <div>
              <h4 className="text-base font-bold text-[#141414] m-0">
                سجل الأصول الثابتة وجدول احتساب وترحيل الإهلاك الآلي (IAS 16 Property, Plant & Equipment)
              </h4>
              <p className="text-xs text-[#707070] mt-0.5">
                جميع الحقول قابلة للتعديل المباشر (التكلفة، الخردة، العمر الإنتاجي، نسبة الإهلاك) مع ترحيل فوري لقيد الإهلاك إلى حسابات (R-10 / A-02)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddAsset}
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة أصل ثابت جديد</span>
              </button>
              <button
                type="button"
                onClick={handlePostDepreciationToTrialBalance}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>احتساب وترحيل قيد الإهلاك للميزان ({fmt(assetTotals.periodDep)})</span>
              </button>
            </div>
          </div>

          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
              <span className="text-[11px] text-[#707070] block">إجمالي التكلفة الرأسمالية (A-01)</span>
              <strong className="font-mono text-sm text-[#141414]">{fmt(assetTotals.cost)}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
              <span className="text-[11px] text-[#707070] block">مجمع إهلاك أول المدة</span>
              <strong className="font-mono text-sm text-[#141414]">{fmt(assetTotals.openingAccum)}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
              <span className="text-[11px] text-[#707070] block">قسط إهلاك الفترة (R-10)</span>
              <strong className="font-mono text-sm text-[#141414]">{fmt(assetTotals.periodDep)}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
              <span className="text-[11px] text-[#707070] block">مجمع إهلاك آخر المدة (A-02)</span>
              <strong className="font-mono text-sm text-[#141414]">{fmt(assetTotals.closingAccum)}</strong>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border-2 border-[#141414]">
              <span className="text-[11px] text-[#707070] block font-semibold">صافي القيمة الدفترية (NBV)</span>
              <strong className="font-mono text-sm text-[#141414]">{fmt(assetTotals.nbv)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#e0e0e0]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5">كود الأصل</th>
                  <th className="p-2.5">اسم الأصل الثابت (قابل للتعديل)</th>
                  <th className="p-2.5">البند المعياري</th>
                  <th className="p-2.5">تاريخ الشراء</th>
                  <th className="p-2.5 font-mono">التكلفة (SAR)</th>
                  <th className="p-2.5 font-mono">الخردة</th>
                  <th className="p-2.5 font-mono">نسبة الإهلاك %</th>
                  <th className="p-2.5 font-mono">مجمع سابق</th>
                  <th className="p-2.5 font-mono bg-[#fafafa]">قسط الفترة (آلي)</th>
                  <th className="p-2.5 font-mono">مجمع ختامي</th>
                  <th className="p-2.5 font-mono font-bold">صافي القيمة (NBV)</th>
                  <th className="p-2.5">مركز التكلفة</th>
                  <th className="p-2.5 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {computedAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-[#f3f3f3]/40">
                    <td className="p-2 font-mono font-bold text-[#141414]">{a.assetCode}</td>
                    <td className="p-2 min-w-[210px]">
                      <input
                        type="text"
                        value={a.assetName}
                        onChange={(e) => handleUpdateAsset(a.id, { assetName: e.target.value })}
                        className="w-full bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-1 text-xs font-bold text-[#141414]"
                      />
                    </td>
                    <td className="p-2 font-mono text-[11px]">{a.ifrsAssetCode}</td>
                    <td className="p-2">
                      <input
                        type="date"
                        value={a.purchaseDate}
                        onChange={(e) => handleUpdateAsset(a.id, { purchaseDate: e.target.value })}
                        className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 text-[11px] font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={a.cost}
                        onChange={(e) => handleUpdateAsset(a.id, { cost: parseFloat(e.target.value) || 0 })}
                        className="w-28 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={a.salvageValue}
                        onChange={(e) => handleUpdateAsset(a.id, { salvageValue: parseFloat(e.target.value) || 0 })}
                        className="w-20 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={a.annualDepRatePct}
                        onChange={(e) => handleUpdateAsset(a.id, { annualDepRatePct: parseFloat(e.target.value) || 0 })}
                        className="w-16 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={a.openingAccumDep}
                        onChange={(e) => handleUpdateAsset(a.id, { openingAccumDep: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 font-mono font-bold text-[#141414] bg-[#fafafa]">{fmt(a.periodDep)}</td>
                    <td className="p-2 font-mono text-[#707070]">{fmt(a.closingAccumDep)}</td>
                    <td className="p-2 font-mono font-bold text-[#141414]">{fmt(a.netBookValue)}</td>
                    <td className="p-2 min-w-[140px]">
                      <input
                        type="text"
                        value={a.costCenter}
                        onChange={(e) => handleUpdateAsset(a.id, { costCenter: e.target.value })}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 text-[11px]"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(a.id, a.assetName)}
                        className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#f3f3f3] text-[#141414] font-bold border-t-2 border-[#141414]">
                <tr>
                  <td colSpan={4} className="p-3">إجمالي سجل الأصول الثابتة ({computedAssets.length} أصول)</td>
                  <td className="p-3 font-mono">{fmt(assetTotals.cost)}</td>
                  <td className="p-3 font-mono">{fmt(assetTotals.salvage)}</td>
                  <td className="p-3">-</td>
                  <td className="p-3 font-mono">{fmt(assetTotals.openingAccum)}</td>
                  <td className="p-3 font-mono">{fmt(assetTotals.periodDep)}</td>
                  <td className="p-3 font-mono">{fmt(assetTotals.closingAccum)}</td>
                  <td className="p-3 font-mono">{fmt(assetTotals.nbv)}</td>
                  <td colSpan={2} className="p-3">متوافق مع IAS 16</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODULE 2: ZATCA VAT 15% RETURN & ZAKAT 2.5% CALCULATOR
         ======================================================================== */}
      {currentTab === 'zatca-vat-zakat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ZATCA VAT 15% Return Box */}
          <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#e0e0e0] pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                  ZATCA VAT RETURN (15%)
                </span>
                <h4 className="text-base font-bold text-[#141414] mt-1 m-0">
                  نموذج إقرار ضريبة القيمة المضافة الآلي (15%)
                </h4>
              </div>
              <button
                type="button"
                onClick={handlePostVatSettlement}
                className="px-3.5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ترحيل قيد تسوية الضريبة ({fmt(Math.abs(vatSummary.netVatPayable))})</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#e0e0e0]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">بند الإقرار الضريبي (ZATCA)</th>
                    <th className="p-2.5 font-mono">المبلغ الخاضع (SAR)</th>
                    <th className="p-2.5 font-mono">قيمة الضريبة 15%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  <tr>
                    <td className="p-2.5 font-semibold">1. المبيعات والإيرادات الخاضعة للنسبة الأساسية 15% (R-01)</td>
                    <td className="p-2.5 font-mono">{fmt(vatSummary.standardSales)}</td>
                    <td className="p-2.5 font-mono font-bold">{fmt(vatSummary.outputVat15)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">2. المبيعات الصفرية أو المعفاة (قابل للتعديل)</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={vatZeroRatedSales}
                        onChange={(e) => setVatZeroRatedSales(parseFloat(e.target.value) || 0)}
                        className="w-28 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2.5 font-mono">0 ⃁</td>
                  </tr>
                  <tr className="bg-[#f3f3f3]/60 font-bold">
                    <td className="p-2.5">3. إجمالي المبيعات وضريبة المخرجات المستحقة</td>
                    <td className="p-2.5 font-mono">{fmt(vatSummary.totalSales)}</td>
                    <td className="p-2.5 font-mono">{fmt(vatSummary.outputVat15)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">4. المشتريات والمصروفات الخاضعة للنسبة الأساسية 15%</td>
                    <td className="p-2.5 font-mono">{fmt(vatSummary.taxablePurchases)}</td>
                    <td className="p-2.5 font-mono font-bold">{fmt(vatSummary.inputVat15)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">5. تعديلات ضريبة المدخلات القابلة للاسترداد (A-09-04)</td>
                    <td className="p-2.5">-</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={vatInputAdjustments}
                        onChange={(e) => setVatInputAdjustments(parseFloat(e.target.value) || 0)}
                        className="w-28 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                  </tr>
                  <tr className="bg-[#f3f3f3] font-bold border-t-2 border-[#141414]">
                    <td className="p-3" colSpan={2}>
                      6. صافي ضريبة القيمة المضافة المستحقة لهيئة الزكاة والضريبة والجمارك (L-05-03)
                    </td>
                    <td className="p-3 font-mono text-sm">{fmt(vatSummary.netVatPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SOCPA / ZATCA Zakat 2.5% Calculator Box */}
          <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#e0e0e0] pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                  SOCPA / ZATCA ZAKAT (2.5%)
                </span>
                <h4 className="text-base font-bold text-[#141414] mt-1 m-0">
                  حاسبة الوعاء الزكوي ومخصص الزكاة الشرعية (2.5%)
                </h4>
              </div>
              <button
                type="button"
                onClick={handlePostZakatProvision}
                className="px-3.5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>إثبات وترحيل مخصص الزكاة ({fmt(zakatSummary.zakatDue25)})</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#e0e0e0]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">مكونات الوعاء الزكوي الشرعي</th>
                    <th className="p-2.5">المرجع</th>
                    <th className="p-2.5 font-mono">المبلغ (SAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  <tr>
                    <td className="p-2.5">(+) رأس المال المدفوع والاحتياطيات (E-01 + E-02)</td>
                    <td className="p-2.5 font-mono">إضافات</td>
                    <td className="p-2.5 font-mono">{fmt(zakatSummary.shareCapital + zakatSummary.reserves)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">(+) الأرباح المبقاة وصافي الربح المعدل زكوياً</td>
                    <td className="p-2.5 font-mono">إضافات</td>
                    <td className="p-2.5 font-mono">{fmt(zakatSummary.retainedEarnings + zakatSummary.adjustedNetProfit)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">(+) الالتزامات طويلة الأجل ومخصص نهاية الخدمة (L-01..L-03)</td>
                    <td className="p-2.5 font-mono">إضافات</td>
                    <td className="p-2.5 font-mono">{fmt(zakatSummary.longTermLiabilities)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">(+) مخصصات مدورة ومصروفات غير جائزة الحسم (قابل للتعديل)</td>
                    <td className="p-2.5 font-mono">تعديل زكوي</td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        value={zakatAddedProvisions}
                        onChange={(e) => setZakatAddedProvisions(parseFloat(e.target.value) || 0)}
                        className="w-28 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">(-) يخصم: صافي الأصول غير المتداولة والممتلكات والمعدات (A-01..A-06)</td>
                    <td className="p-2.5 font-mono">حسومات</td>
                    <td className="p-2.5 font-mono">({fmt(zakatSummary.nonCurrentAssetsDeduction)})</td>
                  </tr>
                  <tr className="bg-[#f3f3f3]/70 font-bold">
                    <td className="p-2.5" colSpan={2}>صافي الوعاء الزكوي الخاضع للزكاة الشرعية</td>
                    <td className="p-2.5 font-mono">{fmt(zakatSummary.zakatBase)}</td>
                  </tr>
                  <tr className="bg-[#f3f3f3] font-bold border-t-2 border-[#141414]">
                    <td className="p-3" colSpan={2}>مقدار الزكاة الشرعية المستحقة للسنة (2.5% — الرمز R-09 / L-08)</td>
                    <td className="p-3 font-mono text-sm">{fmt(zakatSummary.zakatDue25)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODULE 3: IFRS 9 AR/AP AGING & ECL PROVISION MATRIX
         ======================================================================== */}
      {currentTab === 'aging-ifrs9-ecl' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
            <div>
              <h4 className="text-base font-bold text-[#141414] m-0">
                تحليل أعمار الذمم المدينة (A-08) والدائنة (L-04) ومصفوفة الخسائر الائتمانية المتوقعة (IFRS 9 ECL)
              </h4>
              <p className="text-xs text-[#707070] mt-0.5">
                يحسب مخصص الديون المشكوك في تحصيلها آلياً حسب فترات التأخر (0-30، 31-60، 61-90 ضمان مساند، +90 يوماً) ويرحل القيد للميزان
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleAddAgingParty('A-08')}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold cursor-pointer"
              >
                + إضافة عميل ذمم مدينة (A-08)
              </button>
              <button
                type="button"
                onClick={() => handleAddAgingParty('L-04')}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold cursor-pointer"
              >
                + إضافة مورد / وكيل خارجي (L-04)
              </button>
              <button
                type="button"
                onClick={handlePostEclProvision}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ترحيل مخصص الخسائر الائتمانية IFRS 9 ({fmt(agingTotals.arEcl)})</span>
              </button>
            </div>
          </div>

          {/* Editable ECL Risk Rates Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#f3f3f3] p-3.5 rounded-2xl border border-[#e0e0e0] text-xs">
            {[
              { key: 'rate0to30Pct' as const, label: 'نسبة مخاطر (0 - 30 يوم) %' },
              { key: 'rate31to60Pct' as const, label: 'نسبة مخاطر (31 - 60 يوم) %' },
              { key: 'rate61to90Pct' as const, label: 'نسبة مخاطر (61 - 90 يوم ضمان مساند) %' },
              { key: 'rateOver90Pct' as const, label: 'نسبة مخاطر (+90 يوم متأخرات) %' },
            ].map((b) => (
              <div key={b.key} className="bg-white p-2.5 rounded-xl border border-[#e0e0e0] flex items-center justify-between">
                <span className="font-semibold text-[#141414]">{b.label}</span>
                <input
                  type="number"
                  value={eclRates[b.key]}
                  onChange={(e) => {
                    const next = { ...eclRates, [b.key]: parseFloat(e.target.value) || 0 };
                    setEclRates(next);
                    enterpriseAccountingSuiteService.saveEclRates(activeCompanyId, next);
                  }}
                  className="w-16 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold text-xs text-center"
                />
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#e0e0e0]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5">الكود</th>
                  <th className="p-2.5">اسم العميل / المحفظة / المورد</th>
                  <th className="p-2.5">البند</th>
                  <th className="p-2.5 font-mono">0 - 30 يوم</th>
                  <th className="p-2.5 font-mono">31 - 60 يوم</th>
                  <th className="p-2.5 font-mono">61 - 90 يوم</th>
                  <th className="p-2.5 font-mono">+90 يوم</th>
                  <th className="p-2.5 font-mono font-bold">إجمالي الرصيد</th>
                  <th className="p-2.5 font-mono bg-[#fafafa]">مخصص ECL (IFRS 9)</th>
                  <th className="p-2.5 font-mono font-bold">الصافي القابل للتحقق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {computedAging.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#f3f3f3]/40">
                    <td className="p-2 font-mono font-bold">{rec.partyCode}</td>
                    <td className="p-2 min-w-[200px]">
                      <input
                        type="text"
                        value={rec.partyName}
                        onChange={(e) => handleUpdateAgingRecord(rec.id, { partyName: e.target.value })}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 text-xs font-bold text-[#141414]"
                      />
                    </td>
                    <td className="p-2 font-mono text-[11px]">{rec.ifrsCode}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rec.bucket0to30}
                        onChange={(e) => handleUpdateAgingRecord(rec.id, { bucket0to30: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rec.bucket31to60}
                        onChange={(e) => handleUpdateAgingRecord(rec.id, { bucket31to60: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rec.bucket61to90}
                        onChange={(e) => handleUpdateAgingRecord(rec.id, { bucket61to90: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={rec.bucketOver90}
                        onChange={(e) => handleUpdateAgingRecord(rec.id, { bucketOver90: parseFloat(e.target.value) || 0 })}
                        className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="p-2 font-mono font-bold">{fmt(rec.total)}</td>
                    <td className="p-2 font-mono font-bold bg-[#fafafa]">
                      {rec.ifrsCode === 'A-08' ? fmt(rec.eclProvision) : '-'}
                    </td>
                    <td className="p-2 font-mono font-bold">{fmt(rec.netRealizable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODULE 4: AUTOMATED IFRS FINANCIAL NOTES (1-12)
         ======================================================================== */}
      {currentTab === 'ifrs-notes-12' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
            <div>
              <h4 className="text-base font-bold text-[#141414] m-0">
                الإيضاحات المتممة للقوائم المالية المعتمدة (IFRS / SOCPA Financial Statement Notes 1–12)
              </h4>
              <p className="text-xs text-[#707070] mt-0.5">
                مرتبطة آلياً بأرصدة وحسابات ميزان المراجعة والقوائم الأربع مع إمكانية تعديل النص التوضيحي لكل إيضاح وتصديرها للتدقيق القانوني
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_IFRS_NOTES_DEFINITIONS.map((note) => {
              const matchingRows = engine.rows.filter((r) => note.linkedCodes.includes(r.approvedCode));
              const totalDebit = matchingRows.reduce((s, r) => s + r.closingDebit, 0);
              const totalCredit = matchingRows.reduce((s, r) => s + r.closingCredit, 0);
              const netAmount = Math.abs(totalDebit - totalCredit);
              return (
                <div key={note.noteNumber} className="p-4 rounded-2xl bg-[#f3f3f3]/60 border border-[#e0e0e0] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                        إيضاح ({note.noteNumber})
                      </span>
                      <strong className="text-xs text-[#141414]">{note.titleAr}</strong>
                    </div>
                    <span className="text-[11px] font-mono text-[#707070]">{note.ifrsRef}</span>
                  </div>

                  <textarea
                    rows={2}
                    value={customNotesText[note.noteNumber] ?? note.defaultPolicyText}
                    onChange={(e) => {
                      const next = { ...customNotesText, [note.noteNumber]: e.target.value };
                      setCustomNotesText(next);
                      enterpriseAccountingSuiteService.saveCustomNotesText(activeCompanyId, next);
                    }}
                    className="w-full bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-xl p-2 text-xs text-[#141414]"
                  />

                  {note.linkedCodes.length > 0 && (
                    <div className="bg-white rounded-xl p-2.5 border border-[#e0e0e0] text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-[#141414] border-b border-[#e0e0e0] pb-1">
                        <span>الأكواد المرتبطة: ({note.linkedCodes.join(' / ')}) — {matchingRows.length} حساب</span>
                        <span className="font-mono">صافي البند: {fmt(netAmount)}</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto divide-y divide-[#f0f0f0]">
                        {matchingRows.slice(0, 6).map((r) => (
                          <div key={r.seq} className="py-1 flex items-center justify-between text-[#707070]">
                            <span>
                              <strong className="font-mono text-[#141414]">{r.erpCode}</strong> — {r.accountName}
                            </span>
                            <span className="font-mono font-bold text-[#141414]">
                              {fmt(r.closingDebit > 0 ? r.closingDebit : r.closingCredit)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================
          MODULE 5: BUDGET VS ACTUAL & COST CENTER VARIANCE ANALYSIS
         ======================================================================== */}
      {currentTab === 'budget-variance' && (
        <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
            <div>
              <h4 className="text-base font-bold text-[#141414] m-0">
                الموازنة التقديرية ومقارنة الأداء الفعلي وتحليل الانحرافات ومراكز التكلفة (Budget vs. Actual)
              </h4>
              <p className="text-xs text-[#707070] mt-0.5">
                عدّل الموازنة التقديرية أو مركز التكلفة لأي بند من بنود قائمة الدخل لمراقبة نسبة الانحراف المالي الفوري
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#e0e0e0]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3">الكود</th>
                  <th className="p-3">البند في قائمة الدخل</th>
                  <th className="p-3">مركز التكلفة المسؤول</th>
                  <th className="p-3 font-mono">الفعلي (Actual)</th>
                  <th className="p-3 font-mono">الموازنة التقديرية (Budget)</th>
                  <th className="p-3 font-mono">الانحراف (SAR)</th>
                  <th className="p-3 font-mono">نسبة الانحراف %</th>
                  <th className="p-3">حالة الأداء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {budgetRows.map((row) => (
                  <tr key={row.code} className="hover:bg-[#f3f3f3]/40">
                    <td className="p-3 font-mono font-bold text-[#141414]">{row.code}</td>
                    <td className="p-3 font-bold text-[#141414]">{row.nameAr}</td>
                    <td className="p-3 min-w-[180px]">
                      <input
                        type="text"
                        value={row.costCenter}
                        onChange={(e) => handleUpdateBudgetLine(row.code, { costCenter: e.target.value })}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{fmt(row.actual)}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={row.budget}
                        onChange={(e) =>
                          handleUpdateBudgetLine(row.code, { budget: parseFloat(e.target.value) || 0 })
                        }
                        className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#141414] rounded-lg px-2 py-1 font-mono font-bold text-xs text-[#141414]"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-[#141414]">
                      {row.varianceAmount >= 0 ? `+${fmt(row.varianceAmount)}` : fmt(row.varianceAmount)}
                    </td>
                    <td className="p-3 font-mono">{row.variancePct.toFixed(1)}%</td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          row.isFavorable
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : 'bg-[#141414] text-[#ffffff]'
                        }`}
                      >
                        {row.isFavorable ? '✔ ضمن الموازنة / إيجابي' : '⚠ تجاوز الموازنة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODULE 6: AUTO-POSTING TEMPLATES & UNIFIED JOURNAL DRILL-DOWN LEDGER
         ======================================================================== */}
      {currentTab === 'auto-journals-ledger' && (
        <div className="space-y-6">
          {/* 5 Smart Auto-Posting Templates */}
          <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-4">
            <h4 className="text-base font-bold text-[#141414] m-0">
              قوالب القيود التشغيلية التلقائية الجاهزة بضغطة زر (Auto-Posting Accounting Templates)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Template 1: Payroll & EOSB */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                    WPS & IAS 19 EOSB
                  </span>
                  <h5 className="text-xs font-bold text-[#141414] m-0">
                    1. قيد استحقاق وصرف مسير الرواتب ومخصص نهاية الخدمة
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-[#707070] block mb-0.5">الرواتب المنصرفة (R-04):</label>
                      <input
                        type="number"
                        value={tplPayrollSalaries}
                        onChange={(e) => setTplPayrollSalaries(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[#707070] block mb-0.5">مخصص EOSB (L-03):</label>
                      <input
                        type="number"
                        value={tplPayrollEosb}
                        onChange={(e) => setTplPayrollEosb(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePostPayrollTemplate}
                  className="w-full py-2 px-3 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  ترحيل قيد الرواتب ومخصص IAS 19 الآن
                </button>
              </div>

              {/* Template 2: Musaned Contract Settlement */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                    IFRS 15 MUSANED
                  </span>
                  <h5 className="text-xs font-bold text-[#141414] m-0">
                    2. قيد تسوية عقود مساند وإثبات الإيراد وتكلفة الوكيل الخارجي
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-[#707070] block mb-0.5">إيراد العقود (R-01):</label>
                      <input
                        type="number"
                        value={tplMusanedContractVal}
                        onChange={(e) => setTplMusanedContractVal(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[#707070] block mb-0.5">تكلفة الوكيل (R-02):</label>
                      <input
                        type="number"
                        value={tplMusanedAgentCost}
                        onChange={(e) => setTplMusanedAgentCost(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-[#e0e0e0] rounded-lg px-2 py-1 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePostMusanedSettlementTemplate}
                  className="w-full py-2 px-3 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  ترحيل قيد تسوية مساند والوكيل + ضريبة 15%
                </button>
              </div>

              {/* Template 3: Year-End Closing & Statutory Reserve */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                    IAS 1 YEAR-END CLOSING
                  </span>
                  <h5 className="text-xs font-bold text-[#141414] m-0">
                    3. قيد إقفال السنة المالية وتحويل 10% للاحتياطي النظامي
                  </h5>
                  <p className="text-[11px] text-[#707070] m-0">
                    صافي ربح السنة الحالي: <strong className="font-mono text-[#141414]">{fmt(engine.incomeStatement.netProfit)}</strong>
                    <br />
                    حصة الاحتياطي النظامي (10%):{' '}
                    <strong className="font-mono text-[#141414]">
                      {fmt(Math.max(0, engine.incomeStatement.netProfit * 0.1))}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePostYearEndClosingTemplate}
                  className="w-full py-2 px-3 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  ترحيل قيد الاحتياطي النظامي وإقفال الأرباح
                </button>
              </div>
            </div>
          </div>

          {/* Unified Journal Ledger Log & Account Drill-Down */}
          <div className="bg-white rounded-3xl p-6 border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-3">
              <div>
                <h4 className="text-base font-bold text-[#141414] m-0">
                  سجل قيود اليومية الموحد وكشف حركة الحسابات التفصيلي (Unified Drill-Down General Ledger)
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  يعرض كافة القيود المرحلة من شاشات اليومية والسندات والإهلاك والزكاة ومساند مع التحديث اللحظي للأرصدة
                </p>
              </div>
              <div className="flex items-center gap-2">
                {drilldownCodeFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerFilterText('');
                      onClearDrilldownFilter?.();
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-bold cursor-pointer"
                  >
                    إلغاء فلتر الحساب ({drilldownCodeFilter})
                  </button>
                )}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#707070]" />
                  <input
                    type="text"
                    placeholder="بحث برقم القيد أو الحساب أو الكود..."
                    value={ledgerFilterText}
                    onChange={(e) => setLedgerFilterText(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 pr-8 pl-3 text-xs text-[#141414]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {journalLog
                .filter((j) => {
                  const q = ledgerFilterText.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    j.entryNumber.toLowerCase().includes(q) ||
                    j.description.toLowerCase().includes(q) ||
                    j.sourceModule.toLowerCase().includes(q) ||
                    j.lines.some(
                      (l) =>
                        l.erpCode.toLowerCase().includes(q) ||
                        l.accountName.toLowerCase().includes(q) ||
                        l.ifrsCode.toLowerCase().includes(q)
                    )
                  );
                })
                .map((j) => (
                  <div key={j.id} className="rounded-2xl border border-[#e0e0e0] overflow-hidden">
                    <div className="bg-[#f3f3f3] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs border-b border-[#e0e0e0]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#141414] text-[#ffffff]">
                          {j.entryNumber}
                        </span>
                        <span className="font-mono text-[#707070]">{j.date}</span>
                        <strong className="text-[#141414]">{j.description}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#e0e0e0] text-[11px] font-semibold">
                          {j.sourceModule}
                        </span>
                        <span className="font-mono font-bold text-[#141414]">الإجمالي: {fmt(j.totalAmount)}</span>
                      </div>
                    </div>
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#fafafa] text-[#707070] border-b border-[#f0f0f0]">
                        <tr>
                          <th className="p-2">رقم الحساب</th>
                          <th className="p-2">اسم الحساب</th>
                          <th className="p-2">بند القوائم (IFRS)</th>
                          <th className="p-2">مركز التكلفة</th>
                          <th className="p-2 font-mono">مدين (Debit)</th>
                          <th className="p-2 font-mono">دائن (Credit)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f0f0]">
                        {j.lines.map((l, idx) => (
                          <tr key={idx} className="hover:bg-[#f3f3f3]/30">
                            <td className="p-2 font-mono font-bold text-[#141414]">{l.erpCode}</td>
                            <td className="p-2 font-semibold text-[#141414]">{l.accountName}</td>
                            <td className="p-2 font-mono text-[#707070]">{l.ifrsCode}</td>
                            <td className="p-2 text-[#707070]">{l.costCenter || '-'}</td>
                            <td className="p-2 font-mono font-bold text-[#141414]">
                              {l.debit > 0 ? fmt(l.debit) : '-'}
                            </td>
                            <td className="p-2 font-mono font-bold text-[#141414]">
                              {l.credit > 0 ? fmt(l.credit) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseAccountingModulesHub;
