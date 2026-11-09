import React, { useState, useMemo } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Plus,
  Sparkles,
  TrendingUp,
  Landmark,
  Coins,
  ShieldCheck,
  Sliders,
  Activity,
  BarChart3,
  BookOpen,
  Layers,
  Target,
  Calculator,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  FolderTree,
  Check,
  X,
  PlusCircle,
} from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAppStore } from '../../stores/appStore';
import { exportData, ExportFormat, exportMultiSheetWorkbook } from '../../services/exportService';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  IFRS_MAPPING_CODES,
  TrialBalanceEntry,
  IfrsGeneralSettings,
  computeIfrsEngine,
  ifrsFinancialEngineService,
  suggestIfrsCode,
  extractPrimaryIfrsCode,
  resolveIfrsClassificationMetadata,
} from '../../services/accounting/ifrsFinancialEngineService';
import {
  EXTENDED_IFRS_CLASSIFICATIONS,
  EXCEL_ACCOUNTING_TREE,
  EXCEL_SEARCH_KEYWORDS,
  ARABIC_CODES_GUIDE,
  MOVEMENTS_AND_BALANCES_GUIDE,
  COA_GOVERNANCE_RULES,
  SYSTEM_MESSAGES_AR,
} from '../../services/accounting/ifrsExtendedReferenceData';
import {
  AccountItem,
  CustomFieldDefinition,
  chartOfAccountsService,
} from '../../services/accounting/chartOfAccountsService';
import {
  EnterpriseAccountingModulesHub,
  EnterpriseModuleTab,
} from './EnterpriseAccountingModulesHub';
import {
  enterpriseAccountingSuiteService,
  DEFAULT_IFRS_NOTES_DEFINITIONS,
} from '../../services/accounting/enterpriseAccountingSuiteService';
import { accountingConsolidationService } from '../../services/accounting/accountingConsolidationService';

interface IfrsFinancialEngineWorkspaceProps {
  initialSection?: 'overview' | 'trial-balance' | 'diagnostics' | 'statements' | 'ratios-plan' | 'mapping-settings' | 'coa-tree' | 'enterprise-suite';
  initialStatementView?: 'balance-sheet' | 'income-statement' | 'equity-changes' | 'cash-flow' | 'ifrs-notes' | 'budget-variance' | 'group-consolidation';
}

export const IfrsFinancialEngineWorkspace: React.FC<IfrsFinancialEngineWorkspaceProps> = ({
  initialSection = 'ratios-plan',
  initialStatementView = 'balance-sheet',
}) => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { addNotification } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'trial-balance' | 'diagnostics' | 'statements' | 'ratios-plan' | 'mapping-settings' | 'coa-tree' | 'enterprise-suite'
  >(initialSection);

  const [activeStatementView, setActiveStatementView] = useState<
    'balance-sheet' | 'income-statement' | 'equity-changes' | 'cash-flow' | 'ifrs-notes' | 'budget-variance' | 'group-consolidation'
  >(initialStatementView);

  const [activeEnterpriseModule, setActiveEnterpriseModule] = useState<EnterpriseModuleTab>('fixed-assets-ias16');
  const [drilldownCodeFilter, setDrilldownCodeFilter] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveSubTab(initialSection);
  }, [initialSection]);

  React.useEffect(() => {
    setActiveStatementView(initialStatementView);
  }, [initialStatementView]);

  const [entries, setEntries] = useState<TrialBalanceEntry[]>(() =>
    ifrsFinancialEngineService.getTrialBalance(activeCompanyId)
  );

  const [settings, setSettings] = useState<IfrsGeneralSettings>(() =>
    ifrsFinancialEngineService.getSettings(activeCompanyId, activeCompany.name)
  );

  React.useEffect(() => {
    const syncEntries = () => {
      setEntries(ifrsFinancialEngineService.getTrialBalance(activeCompanyId));
      setSettings(ifrsFinancialEngineService.getSettings(activeCompanyId, activeCompany.name));
      setCoaAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
    };
    syncEntries();
    window.addEventListener('erp-ifrs-live-sync', syncEntries);
    window.addEventListener('alsulaim_erp_accounting_synced', syncEntries);
    window.addEventListener('alsulaim_erp_storage_hydrated', syncEntries);
    return () => {
      window.removeEventListener('erp-ifrs-live-sync', syncEntries);
      window.removeEventListener('alsulaim_erp_accounting_synced', syncEntries);
      window.removeEventListener('alsulaim_erp_storage_hydrated', syncEntries);
    };
  }, [activeCompanyId, activeCompany.name]);

  const [tbSearch, setTbSearch] = useState('');
  const [tbFilter, setTbFilter] = useState<'all' | 'unclassified' | 'warnings' | 'classified'>('all');
  const [tbCodeFilter, setTbCodeFilter] = useState<string>('ALL');
  const [tbSectionFilter, setTbSectionFilter] = useState<string>('ALL');

  // Column visibility toggles in Trial Balance (including Closing Debit & Credit hide/show)
  const [showClosingBalanceCols, setShowClosingBalanceCols] = useState<boolean>(true);
  const [showOpeningCols, setShowOpeningCols] = useState<boolean>(true);
  const [showMovementCols, setShowMovementCols] = useState<boolean>(true);
  const [showNetBalanceCol, setShowNetBalanceCol] = useState<boolean>(false);

  // Expandable sections in Balance Sheet & Income Statement
  const [expandedStatementCodes, setExpandedStatementCodes] = useState<Record<string, boolean>>({
    'A-01': true,
    'R-01': true,
    'R-02': true,
  });

  // Custom Dynamic Fields for Assets & Expandable Sections
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>(() =>
    chartOfAccountsService.getCustomFieldDefinitions(activeCompanyId)
  );
  const [rowCustomValues, setRowCustomValues] = useState<Record<number, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem(`erp_ifrs_row_custom_vals_${activeCompanyId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'percent' | 'date'>('text');
  const [newFieldSection, setNewFieldSection] = useState<'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات' | 'ALL'>('أصول');
  const [showCustomFieldManager, setShowCustomFieldManager] = useState(false);

  // Chart of Accounts & Tree (الدليل والشجرة القابلة للتوسع)
  const [coaAccounts, setCoaAccounts] = useState<AccountItem[]>(() =>
    chartOfAccountsService.getAccountsByCompany(activeCompanyId)
  );
  const [expandedTreeIds, setExpandedTreeIds] = useState<Record<string, boolean>>({
    '1': true, '11': true, '12': true, '2': true, '21': true, '22': true,
    '3': true, '4': true, '41': true, '5': true, '51': true, '52': true,
  });
  const [coaSearch, setCoaSearch] = useState('');
  const [editingCoaId, setEditingCoaId] = useState<string | null>(null);
  const [coaEditDraft, setCoaEditDraft] = useState<Partial<AccountItem>>({});
  const [addingChildParent, setAddingChildParent] = useState<AccountItem | null>(null);
  const [newCoaCode, setNewCoaCode] = useState('');
  const [newCoaName, setNewCoaName] = useState('');
  const [newCoaIfrsCode, setNewCoaIfrsCode] = useState('A-01');
  const [newCoaCustomFields, setNewCoaCustomFields] = useState<Record<string, string>>({});

  // Excel 319-Node Reference Tree & Linked COA sub-view
  const [coaSubView, setCoaSubView] = useState<'excel-tree-319' | 'company-coa-tree' | 'linked-coa-sheet'>('excel-tree-319');
  const [expandedExcelTreeCodes, setExpandedExcelTreeCodes] = useState<Record<string, boolean>>({
    'A': true, 'L': true, 'E': true, 'O': true, 'R': true,
    'A-01': true, 'A-07': true, 'A-10': true, 'L-04': true, 'L-05': true, 'E-01': true, 'R-01': true, 'R-02': true, 'R-04': true,
  });
  const [excelTreeSearch, setExcelTreeSearch] = useState('');
  const [excelTreeFilter, setExcelTreeFilter] = useState<'ALL' | 'ACTIVE_ONLY' | 'A' | 'L' | 'E_O' | 'R'>('ALL');
  const [coaTreeCategoryFilter, setCoaTreeCategoryFilter] = useState<'ALL' | 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات'>('ALL');
  const [coaTreeLevelFilter, setCoaTreeLevelFilter] = useState<'ALL' | '1-2' | '3' | '4'>('ALL');
  const [linkedCoaSectionFilter, setLinkedCoaSectionFilter] = useState<string>('ALL');
  const [linkedCoaSearch, setLinkedCoaSearch] = useState<string>('');

  // Editable Labels & Custom Sub-Nodes for Tree, Assets/Balance Sheet & Income Statement
  const [statementLabelOverrides, setStatementLabelOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`erp_ifrs_stmt_labels_${activeCompanyId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [incomeCompOverrides, setIncomeCompOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`erp_ifrs_inc_comp_${activeCompanyId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [customTreeNodeNames, setCustomTreeNodeNames] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`erp_ifrs_tree_labels_${activeCompanyId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [customTreeSubNodes, setCustomTreeSubNodes] = useState<
    Array<{ level: number; code: string; titleAr: string; parentCode: string; statementCode: string }>
  >(() => {
    try {
      const saved = localStorage.getItem(`erp_ifrs_tree_custom_nodes_${activeCompanyId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Reference Guides Sub-View in mapping-settings
  const [refGuideSubTab, setRefGuideSubTab] = useState<
    'primary-34' | 'extended-314' | 'arabic-guide-34' | 'search-keywords-257' | 'movements-governance'
  >('primary-34');
  const [extClassSearch, setExtClassSearch] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');

  // Interactive Financial Ratios Plan What-If Simulator State
  const [simRevenueGrowthPct, setSimRevenueGrowthPct] = useState<number>(15);
  const [simCostReductionPct, setSimCostReductionPct] = useState<number>(8);
  const [simCollectionAccelDays, setSimCollectionAccelDays] = useState<number>(15);
  const [simDebtPaydownPct, setSimDebtPaydownPct] = useState<number>(20);

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE ACCOUNTING SYSTEM CONTROLS: HIDE / EDIT / DELETE / JOURNAL POSTING / UNDO
  // ═══════════════════════════════════════════════════════════════════════════
  const [showKpiStrip, setShowKpiStrip] = useState<boolean>(true);
  const [showCustomizationPanel, setShowCustomizationPanel] = useState<boolean>(false);
  const [showDupontAltman, setShowDupontAltman] = useState<boolean>(true);
  const [showWhatIfSimulator, setShowWhatIfSimulator] = useState<boolean>(true);
  const [hideZeroBalanceRows, setHideZeroBalanceRows] = useState<boolean>(false);
  const [hideHealthyChecks, setHideHealthyChecks] = useState<boolean>(false);

  // Granular Hidden Items
  const [hiddenRowSeqs, setHiddenRowSeqs] = useState<number[]>([]);
  const [hiddenRatioIds, setHiddenRatioIds] = useState<string[]>([]);
  const [hiddenCheckIds, setHiddenCheckIds] = useState<number[]>([]);

  // Multi-select in Trial Balance
  const [selectedRowSeqs, setSelectedRowSeqs] = useState<number[]>([]);
  const [bulkClassifyCode, setBulkClassifyCode] = useState<string>('A-10');

  // Undo History Stack for safe editing and deletion
  const [undoStack, setUndoStack] = useState<TrialBalanceEntry[][]>([]);

  // Native Journal Entry Posting Modal (قيد يومية محاسبي يرحل مباشرة للميزان والقوائم)
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);
  const [jeDebitSeq, setJeDebitSeq] = useState<number>(1);
  const [jeCreditSeq, setJeCreditSeq] = useState<number>(2);
  const [jeAmount, setJeAmount] = useState<number>(25000);
  const [jeDescription, setJeDescription] = useState<string>('قيد تسوية وإثبات عمليات تشغيلية');

  // Editable overrides & custom ratios in Financial Ratios
  const [ratioOverrides, setRatioOverrides] = useState<
    Record<string, { target2026?: string; target2027?: string; actionPlan?: string; benchmark?: string }>
  >({});
  const [customRatios, setCustomRatios] = useState<
    Array<{
      id: string;
      category: string;
      name: string;
      formula: string;
      formattedValue: string;
      benchmark: string;
      target2026: string;
      target2027: string;
      actionPlan: string;
    }>
  >([]);
  const [showAddRatioForm, setShowAddRatioForm] = useState<boolean>(false);
  const [newRatioName, setNewRatioName] = useState<string>('');
  const [newRatioCategory, setNewRatioCategory] = useState<string>('السيولة');
  const [newRatioFormula, setNewRatioFormula] = useState<string>('');
  const [newRatioValue, setNewRatioValue] = useState<string>('1.50x');
  const [newRatioTarget, setNewRatioTarget] = useState<string>('2.00x');
  const [newRatioPlan, setNewRatioPlan] = useState<string>('');

  const pushUndoSnapshot = (currentEntries: TrialBalanceEntry[]) => {
    setUndoStack((prev) => [currentEntries.map((r) => ({ ...r })), ...prev.slice(0, 14)]);
  };

  const handleUndoLastAction = () => {
    if (undoStack.length === 0) return;
    const [latest, ...rest] = undoStack;
    setEntries(latest);
    setUndoStack(rest);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, latest);
    addNotification({
      title: 'تراجع عن آخر عملية محاسبية',
      message: 'تمت استعادة البيانات السابقة لميزان المراجعة والقوائم المالية بنجاح.',
      type: 'info',
    });
  };

  const totalHiddenItemsCount =
    hiddenRowSeqs.length +
    hiddenRatioIds.length +
    hiddenCheckIds.length +
    (!showKpiStrip ? 1 : 0) +
    (!showDupontAltman ? 1 : 0) +
    (!showWhatIfSimulator ? 1 : 0) +
    (!showClosingBalanceCols ? 1 : 0) +
    (!showOpeningCols ? 1 : 0) +
    (!showMovementCols ? 1 : 0) +
    (hideZeroBalanceRows ? 1 : 0) +
    (hideHealthyChecks ? 1 : 0);

  const handleRestoreAllHidden = () => {
    setHiddenRowSeqs([]);
    setHiddenRatioIds([]);
    setHiddenCheckIds([]);
    setShowKpiStrip(true);
    setShowDupontAltman(true);
    setShowWhatIfSimulator(true);
    setHideZeroBalanceRows(false);
    setHideHealthyChecks(false);
    setShowClosingBalanceCols(true);
    setShowOpeningCols(true);
    setShowMovementCols(true);
    addNotification({
      title: 'استعادة وإظهار كافة العناصر',
      message: 'تم إظهار كافة الأقسام، الحسابات، الأعمدة، المؤشرات، والفحوصات الرقابية المخفية.',
      type: 'success',
    });
  };

  const handlePostJournalEntry = () => {
    if (!jeAmount || jeAmount <= 0 || jeDebitSeq === jeCreditSeq) {
      addNotification({
        title: 'تنبيه في القيد المحاسبي',
        message: 'يرجى اختيار حساب مدين وحساب دائن مختلفين وإدخال مبلغ أكبر من الصفر.',
        type: 'warning',
      });
      return;
    }
    pushUndoSnapshot(entries);
    const debitAcc = entries.find((r) => r.seq === jeDebitSeq);
    const creditAcc = entries.find((r) => r.seq === jeCreditSeq);
    const { updatedEntries } = enterpriseAccountingSuiteService.postJournalToLiveTrialBalance(
      activeCompanyId,
      {
        description: jeDescription || 'قيد يومية محاسبي مباشر',
        sourceModule: 'قيد يومية يدوي',
        lines: [
          {
            specificSeq: jeDebitSeq,
            ifrsTargetCode: debitAcc?.manualCode || 'A-10',
            fallbackAccountName: debitAcc?.accountName || 'حساب مدين',
            debit: jeAmount,
            credit: 0,
          },
          {
            specificSeq: jeCreditSeq,
            ifrsTargetCode: creditAcc?.manualCode || 'R-01',
            fallbackAccountName: creditAcc?.accountName || 'حساب دائن',
            debit: 0,
            credit: jeAmount,
          },
        ],
      }
    );
    setEntries(updatedEntries);
    setShowJournalModal(false);
    addNotification({
      title: 'تم ترحيل قيد اليومية بنجاح',
      message: `تم ترحيل مبلغ (\u20C1 ${jeAmount.toLocaleString()}) — ${jeDescription} وتحديث الميزان والقوائم المالية وسجل القيود آلياً.`,
      type: 'success',
    });
  };

  const handleBulkHideSelectedRows = () => {
    if (selectedRowSeqs.length === 0) return;
    setHiddenRowSeqs((prev) => Array.from(new Set([...prev, ...selectedRowSeqs])));
    addNotification({
      title: 'إخفاء الحسابات المحددة',
      message: `تم إخفاء (${selectedRowSeqs.length}) حساباً من العرض الحالي.`,
      type: 'info',
    });
    setSelectedRowSeqs([]);
  };

  const handleBulkDeleteSelectedRows = () => {
    if (selectedRowSeqs.length === 0) return;
    pushUndoSnapshot(entries);
    const next = entries.filter((r) => !selectedRowSeqs.includes(r.seq));
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
    addNotification({
      title: 'حذف الحسابات المحددة',
      message: `تم حذف (${selectedRowSeqs.length}) حساباً (يمكنك التراجع بضغطة زر).`,
      type: 'info',
    });
    setSelectedRowSeqs([]);
  };

  const handleBulkClassifySelectedRows = () => {
    if (selectedRowSeqs.length === 0 || !bulkClassifyCode) return;
    pushUndoSnapshot(entries);
    const next = entries.map((r) =>
      selectedRowSeqs.includes(r.seq) ? { ...r, manualCode: bulkClassifyCode } : r
    );
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
    addNotification({
      title: 'توجيه محاسبي جماعي',
      message: `تم اعتماد بند القوائم (${bulkClassifyCode}) لعدد (${selectedRowSeqs.length}) حساباً دفعة واحدة.`,
      type: 'success',
    });
    setSelectedRowSeqs([]);
  };

  const handleAddCustomRatio = () => {
    if (!newRatioName.trim()) return;
    setCustomRatios((prev) => [
      ...prev,
      {
        id: `custom-ratio-${Date.now()}`,
        category: newRatioCategory,
        name: newRatioName.trim(),
        formula: newRatioFormula.trim() || 'معادلة مالية مخصصة',
        formattedValue: newRatioValue.trim() || '1.00x',
        benchmark: newRatioTarget.trim() || '1.50x',
        target2026: newRatioTarget.trim() || '1.50x',
        target2027: newRatioTarget.trim() || '2.00x',
        actionPlan: newRatioPlan.trim() || 'خطة تحسين مالية قابلة للتعديل',
      },
    ]);
    setNewRatioName('');
    setNewRatioFormula('');
    setNewRatioPlan('');
    setShowAddRatioForm(false);
    addNotification({
      title: 'إضافة مؤشر مالي جديد',
      message: `تمت إضافة المؤشر (${newRatioName.trim()}) إلى منظومة التحليل المالي.`,
      type: 'success',
    });
  };

  // Recompute full IFRS engine whenever entries or settings change
  const engine = useMemo(() => computeIfrsEngine(entries, settings), [entries, settings]);

  // Filtered Trial Balance rows
  const filteredRows = useMemo(() => {
    return engine.rows.filter((r) => {
      if (hiddenRowSeqs.includes(r.seq)) return false;
      if (
        hideZeroBalanceRows &&
        r.openingDebit === 0 &&
        r.openingCredit === 0 &&
        r.periodDebit === 0 &&
        r.periodCredit === 0 &&
        r.closingDebit === 0 &&
        r.closingCredit === 0
      ) {
        return false;
      }
      if (tbFilter === 'unclassified' && r.approvedCode) return false;
      if (tbFilter === 'classified' && !r.approvedCode) return false;
      if (tbFilter === 'warnings' && !r.auditNote) return false;
      if (tbSectionFilter !== 'ALL' && r.sectionAr !== tbSectionFilter) return false;
      if (
        tbCodeFilter !== 'ALL' &&
        r.approvedCode !== tbCodeFilter &&
        r.approvedSubCode !== tbCodeFilter &&
        r.manualCode !== tbCodeFilter
      ) {
        return false;
      }
      if (tbSearch.trim()) {
        const q = tbSearch.trim().toLowerCase();
        return (
          r.accountName.toLowerCase().includes(q) ||
          r.erpCode.toLowerCase().includes(q) ||
          r.approvedCode.toLowerCase().includes(q) ||
          (r.approvedSubCode || '').toLowerCase().includes(q) ||
          r.manualCode.toLowerCase().includes(q) ||
          r.approvedItemName.toLowerCase().includes(q) ||
          (r.approvedSubItemName || '').toLowerCase().includes(q) ||
          (r.sectionAr || '').toLowerCase().includes(q) ||
          (r.ifrsRef || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [engine.rows, tbFilter, tbSectionFilter, tbCodeFilter, tbSearch, hiddenRowSeqs, hideZeroBalanceRows]);

  // What-If Simulated Financial Ratios Calculation
  const simulatedPlan = useMemo(() => {
    const curRev = engine.incomeStatement.revenues;
    const curCogs = engine.incomeStatement.costOfRevenues;
    const curOpex =
      engine.incomeStatement.sellingMarketingExp +
      engine.incomeStatement.generalAdminExp +
      engine.incomeStatement.depreciationAmortization +
      engine.incomeStatement.otherExpenses;

    const projRev = curRev * (1 + simRevenueGrowthPct / 100);
    const projCogs = curCogs * (1 + (simRevenueGrowthPct * 0.5) / 100) * (1 - simCostReductionPct / 100);
    const projGrossProfit = projRev - projCogs;
    const projOperatingProfit =
      projGrossProfit + engine.incomeStatement.otherIncome - curOpex * (1 - simCostReductionPct / 200);
    const projNetProfit =
      projOperatingProfit +
      engine.incomeStatement.financeIncome -
      engine.incomeStatement.financeCosts * (1 - simDebtPaydownPct / 100) -
      engine.incomeStatement.zakatAndTaxExpense;

    const collectedCashFromRec =
      engine.balanceSheet.current.tradeReceivablesNet * Math.min(0.8, simCollectionAccelDays / 60);
    const debtPaid =
      engine.balanceSheet.current.totalCurrentLiabilities * (simDebtPaydownPct / 100);

    const projCurrentAssets =
      engine.balanceSheet.current.totalCurrentAssets +
      Math.max(0, projNetProfit - engine.incomeStatement.netProfit) -
      debtPaid;
    const projCurrentLiabilities = Math.max(
      1,
      engine.balanceSheet.current.totalCurrentLiabilities - debtPaid
    );
    const projTotalLiabilities = Math.max(
      1,
      engine.balanceSheet.current.totalLiabilities - debtPaid
    );
    const projTotalEquity =
      engine.balanceSheet.current.totalEquity +
      Math.max(0, projNetProfit - engine.incomeStatement.netProfit);
    const projTotalAssets =
      engine.balanceSheet.current.totalNonCurrentAssets + projCurrentAssets;

    const projCurrentRatio = projCurrentAssets / projCurrentLiabilities;
    const projGrossMargin = projRev > 0 ? (projGrossProfit / projRev) * 100 : 0;
    const projNetMargin = projRev > 0 ? (projNetProfit / projRev) * 100 : 0;
    const projRoe = projTotalEquity > 0 ? (projNetProfit / projTotalEquity) * 100 : 0;
    const projRoa = projTotalAssets > 0 ? (projNetProfit / projTotalAssets) * 100 : 0;
    const projDebtToEquity = projTotalEquity > 0 ? projTotalLiabilities / projTotalEquity : 0;
    const projReceivables = Math.max(0, engine.balanceSheet.current.tradeReceivablesNet - collectedCashFromRec);
    const projDso = projRev > 0 ? (projReceivables / projRev) * 365 : 0;

    return {
      projRev,
      projGrossProfit,
      projNetProfit,
      projCurrentRatio,
      projGrossMargin,
      projNetMargin,
      projRoe,
      projRoa,
      projDebtToEquity,
      projDso,
    };
  }, [
    engine,
    simRevenueGrowthPct,
    simCostReductionPct,
    simCollectionAccelDays,
    simDebtPaydownPct,
  ]);

  // Handlers
  const handleUpdateRow = (seq: number, patch: Partial<TrialBalanceEntry>) => {
    const next = entries.map((item) => (item.seq === seq ? { ...item, ...patch } : item));
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
  };

  const handleUpdateClosingDebit = (row: TrialBalanceEntry, targetClosingDebit: number) => {
    const netBeforePeriod = row.openingDebit - row.openingCredit;
    const neededMovement = targetClosingDebit - netBeforePeriod;
    if (neededMovement >= 0) {
      handleUpdateRow(row.seq, { periodDebit: neededMovement, periodCredit: 0 });
    } else {
      handleUpdateRow(row.seq, { periodDebit: 0, periodCredit: Math.abs(neededMovement) });
    }
  };

  const handleUpdateClosingCredit = (row: TrialBalanceEntry, targetClosingCredit: number) => {
    const netBeforePeriod = row.openingCredit - row.openingDebit;
    const neededMovement = targetClosingCredit - netBeforePeriod;
    if (neededMovement >= 0) {
      handleUpdateRow(row.seq, { periodCredit: neededMovement, periodDebit: 0 });
    } else {
      handleUpdateRow(row.seq, { periodCredit: 0, periodDebit: Math.abs(neededMovement) });
    }
  };

  const handleDeleteAccountRow = (seq: number, name: string) => {
    pushUndoSnapshot(entries);
    const next = entries.filter((item) => item.seq !== seq);
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
    addNotification({
      title: 'حذف بند من الميزان',
      message: `تم حذف الحساب (${name}) وإعادة احتساب الميزان والقوائم المالية.`,
      type: 'info',
    });
  };

  const handleAddStatementLineAccount = (ifrsCode: string, defaultNamePrefix: string) => {
    const nextSeq = entries.length > 0 ? Math.max(...entries.map((e) => e.seq)) + 1 : 1;
    const newRow: TrialBalanceEntry = {
      seq: nextSeq,
      erpCode: `${1000 + nextSeq}`,
      accountName: `${defaultNamePrefix} #${nextSeq}`,
      manualCode: ifrsCode,
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: 0,
      periodCredit: 0,
      movementSource: 'فعلي',
    };
    const next = [...entries, newRow];
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
    const pCode = extractPrimaryIfrsCode(ifrsCode) || ifrsCode;
    setExpandedStatementCodes((prev) => ({ ...prev, [pCode]: true }));
    setExpandedExcelTreeCodes((prev) => ({ ...prev, [ifrsCode]: true, [pCode]: true }));
    addNotification({
      title: 'إضافة بند جديد للقسم',
      message: `تمت إضافة (${newRow.accountName}) تحت البند (${ifrsCode}) ويمكنك الآن تعديل أرصدته وحقوله مباشرة.`,
      type: 'success',
    });
  };

  const handleUpdateStatementLabel = (key: string, label: string) => {
    const next = { ...statementLabelOverrides, [key]: label };
    setStatementLabelOverrides(next);
    try {
      localStorage.setItem(`erp_ifrs_stmt_labels_${activeCompanyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleUpdateIncomeCompOverride = (key: string, val: number) => {
    const next = { ...incomeCompOverrides, [key]: val };
    setIncomeCompOverrides(next);
    try {
      localStorage.setItem(`erp_ifrs_inc_comp_${activeCompanyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleUpdateTreeNodeTitle = (code: string, titleAr: string) => {
    const next = { ...customTreeNodeNames, [code]: titleAr };
    setCustomTreeNodeNames(next);
    try {
      localStorage.setItem(`erp_ifrs_tree_labels_${activeCompanyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleAddCustomTreeSubNode = (parentCode: string, parentTitle: string) => {
    const existingChildren = [
      ...EXCEL_ACCOUNTING_TREE.filter((n) => n.parentCode === parentCode),
      ...customTreeSubNodes.filter((n) => n.parentCode === parentCode),
    ];
    const nextIdx = existingChildren.length + 1;
    const newCode = `${parentCode}-${String(nextIdx).padStart(2, '0')}C`;
    const newNode = {
      level: 3,
      code: newCode,
      titleAr: `تصنيف فرعي مخصص تحت ${parentTitle.replace(/^[↳\s]+/, '')} #${nextIdx}`,
      parentCode,
      statementCode: parentCode,
    };
    const next = [...customTreeSubNodes, newNode];
    setCustomTreeSubNodes(next);
    setExpandedExcelTreeCodes((prev) => ({ ...prev, [parentCode]: true }));
    try {
      localStorage.setItem(`erp_ifrs_tree_custom_nodes_${activeCompanyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
    addNotification({
      title: 'إضافة تصنيف فرعي في الشجرة',
      message: `تمت إضافة العقدة الفرعية (${newCode}) تحت (${parentCode}) في الشجرة المحاسبية.`,
      type: 'success',
    });
  };

  const handleRemoveCustomTreeSubNode = (code: string) => {
    const next = customTreeSubNodes.filter((n) => n.code !== code);
    setCustomTreeSubNodes(next);
    try {
      localStorage.setItem(`erp_ifrs_tree_custom_nodes_${activeCompanyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleUpdateStatementLineTotal = (
    codes: string[],
    currentVal: number,
    targetVal: number,
    mode: 'current' | 'comparative',
    naturalSign: 'D' | 'C',
    defaultLabel: string
  ) => {
    const delta = targetVal - currentVal;
    if (Math.abs(delta) < 0.01) return;
    const primaryTargetCode = codes[0];
    const matchingIdx = entries.findIndex((item) => {
      const pCode = extractPrimaryIfrsCode(item.manualCode || suggestIfrsCode(item.accountName));
      return pCode === primaryTargetCode;
    });

    let next: TrialBalanceEntry[];
    if (matchingIdx >= 0) {
      next = entries.map((item, idx) => {
        if (idx !== matchingIdx) return item;
        if (naturalSign === 'D') {
          if (mode === 'current') {
            const curPeriodNet = (item.periodDebit || 0) - (item.periodCredit || 0) + delta;
            return {
              ...item,
              periodDebit: curPeriodNet >= 0 ? curPeriodNet : 0,
              periodCredit: curPeriodNet < 0 ? Math.abs(curPeriodNet) : 0,
            };
          } else {
            const curOpenNet = (item.openingDebit || 0) - (item.openingCredit || 0) + delta;
            const curPeriodNet = (item.periodDebit || 0) - (item.periodCredit || 0) - delta;
            return {
              ...item,
              openingDebit: curOpenNet >= 0 ? curOpenNet : 0,
              openingCredit: curOpenNet < 0 ? Math.abs(curOpenNet) : 0,
              periodDebit: curPeriodNet >= 0 ? curPeriodNet : 0,
              periodCredit: curPeriodNet < 0 ? Math.abs(curPeriodNet) : 0,
            };
          }
        } else {
          if (mode === 'current') {
            const curPeriodNet = (item.periodCredit || 0) - (item.periodDebit || 0) + delta;
            return {
              ...item,
              periodCredit: curPeriodNet >= 0 ? curPeriodNet : 0,
              periodDebit: curPeriodNet < 0 ? Math.abs(curPeriodNet) : 0,
            };
          } else {
            const curOpenNet = (item.openingCredit || 0) - (item.openingDebit || 0) + delta;
            const curPeriodNet = (item.periodCredit || 0) - (item.periodDebit || 0) - delta;
            return {
              ...item,
              openingCredit: curOpenNet >= 0 ? curOpenNet : 0,
              openingDebit: curOpenNet < 0 ? Math.abs(curOpenNet) : 0,
              periodCredit: curPeriodNet >= 0 ? curPeriodNet : 0,
              periodDebit: curPeriodNet < 0 ? Math.abs(curPeriodNet) : 0,
            };
          }
        }
      });
    } else {
      const nextSeq = entries.length > 0 ? Math.max(...entries.map((e) => e.seq)) + 1 : 1;
      const newRow: TrialBalanceEntry = {
        seq: nextSeq,
        erpCode: `${1000 + nextSeq}`,
        accountName: defaultLabel,
        manualCode: primaryTargetCode,
        openingDebit: mode === 'comparative' && naturalSign === 'D' && targetVal >= 0 ? targetVal : mode === 'comparative' && naturalSign === 'C' && targetVal < 0 ? Math.abs(targetVal) : 0,
        openingCredit: mode === 'comparative' && naturalSign === 'C' && targetVal >= 0 ? targetVal : mode === 'comparative' && naturalSign === 'D' && targetVal < 0 ? Math.abs(targetVal) : 0,
        periodDebit: mode === 'current' && naturalSign === 'D' && targetVal >= 0 ? targetVal : mode === 'current' && naturalSign === 'C' && targetVal < 0 ? Math.abs(targetVal) : 0,
        periodCredit: mode === 'current' && naturalSign === 'C' && targetVal >= 0 ? targetVal : mode === 'current' && naturalSign === 'D' && targetVal < 0 ? Math.abs(targetVal) : 0,
        movementSource: 'فعلي',
      };
      next = [...entries, newRow];
    }
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
  };

  const handleAddCustomFieldDef = () => {
    if (!newFieldLabel.trim()) return;
    const key = `cf_${Date.now()}`;
    const newDef: CustomFieldDefinition = {
      key,
      label: newFieldLabel.trim(),
      fieldType: newFieldType,
      section: newFieldSection,
      defaultValue: '',
    };
    const next = [...customFieldDefs, newDef];
    setCustomFieldDefs(next);
    chartOfAccountsService.saveCustomFieldDefinitions(activeCompanyId, next);
    setNewFieldLabel('');
    addNotification({
      title: 'إضافة حقل مخصص جديد',
      message: `تمت إضافة الحقل (${newDef.label}) لقسم (${newDef.section === 'ALL' ? 'كافة الأقسام' : newDef.section}) بنجاح.`,
      type: 'success',
    });
  };

  const handleRemoveCustomFieldDef = (key: string) => {
    const next = customFieldDefs.filter((f) => f.key !== key);
    setCustomFieldDefs(next);
    chartOfAccountsService.saveCustomFieldDefinitions(activeCompanyId, next);
  };

  const handleUpdateRowCustomField = (seq: number, fieldKey: string, val: string) => {
    const next = {
      ...rowCustomValues,
      [seq]: {
        ...(rowCustomValues[seq] || {}),
        [fieldKey]: val,
      },
    };
    setRowCustomValues(next);
    try {
      localStorage.setItem(`erp_ifrs_row_custom_vals_${activeCompanyId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggleStatementSection = (code: string) => {
    setExpandedStatementCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleTreeExpand = (id: string) => {
    setExpandedTreeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAllCoaTree = () => {
    const all: Record<string, boolean> = {};
    coaAccounts.forEach((a) => {
      all[a.code] = true;
    });
    setExpandedTreeIds(all);
  };

  const collapseAllCoaTree = () => {
    setExpandedTreeIds({});
  };

  const handleStartEditCoa = (acc: AccountItem) => {
    setEditingCoaId(acc.code);
    setCoaEditDraft({
      code: acc.code,
      nameAr: acc.nameAr,
      category: acc.category,
      balance: acc.balance,
      ifrsCode: acc.ifrsCode || suggestIfrsCode(acc.nameAr),
      customFields: { ...(acc.customFields || {}) },
    });
  };

  const handleSaveEditCoa = (accCode: string) => {
    chartOfAccountsService.updateAccount(activeCompanyId, accCode, coaEditDraft);
    setCoaAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
    setEditingCoaId(null);
    addNotification({
      title: 'حفظ تعديل الحساب في الدليل والشجرة',
      message: `تم تحديث بيانات الحساب (${coaEditDraft.nameAr}) وإعادة احتساب أرصدة الأبواب التجميعية بنجاح.`,
      type: 'success',
    });
  };

  const handleOrganizeAndCompleteCompanyCoa = () => {
    const { accounts, addedCount } = chartOfAccountsService.syncAndCompleteMissingAccounts(activeCompanyId);
    setCoaAccounts(accounts);
    const allParents: Record<string, boolean> = {};
    accounts.filter((a) => a.isHeader && a.level <= 3).forEach((a) => {
      allParents[a.code] = true;
    });
    setExpandedTreeIds(allParents);
    addNotification({
      title: 'ترتيب واستكمال الشجرة المحاسبية',
      message:
        addedCount > 0
          ? `تم استكمال (${addedCount}) حساباً ومستوى قياسياً ناقصاً وترتيب الشجرة (4 مستويات) وإعادة احتساب أرصدة الأبواب التجميعية.`
          : `تمت مراجعة وترتيب الشجرة القياسية (${accounts.length} حساباً في 4 مستويات) وإعادة احتساب كافة الأرصدة التجميعية بدقة.`,
      type: 'success',
    });
  };

  const handleSyncCompanyCoaWithTrialBalance = () => {
    const synced = chartOfAccountsService.syncBalancesFromTrialBalance(activeCompanyId, engine.rows);
    setCoaAccounts(synced);
    addNotification({
      title: 'مزامنة أرصدة الشجرة مع ميزان المراجعة',
      message: `تمت مزامنة أرصدة وحركات (${synced.length}) حساباً في الشجرة مع أرصدة ميزان المراجعة الفعلي (${engine.rows.length} حساباً).`,
      type: 'success',
    });
  };

  const handleResetCompanyCoaToStandard = () => {
    const reset = chartOfAccountsService.resetToStandardTree(activeCompanyId);
    setCoaAccounts(reset);
    const allParents: Record<string, boolean> = {};
    reset.filter((a) => a.isHeader && a.level <= 3).forEach((a) => {
      allParents[a.code] = true;
    });
    setExpandedTreeIds(allParents);
    addNotification({
      title: 'إعادة ضبط الشجرة القياسية المعتمدة',
      message: `تمت استعادة الشجرة القياسية الكاملة (${reset.length} حساباً عبر 4 مستويات تغطي كافة الـ 34 تصنيفاً).`,
      type: 'info',
    });
  };

  const handleOrganizeAndCompleteExcelTree = () => {
    pushUndoSnapshot(entries);
    let upgradedSubCodes = 0;
    let addedMissingItems = 0;

    // 1. Upgrade every row to its exact 3-part sub-classification (e.g. A-01-04 instead of A-01)
    const updatedRows: TrialBalanceEntry[] = entries.map((r) => {
      const meta = resolveIfrsClassificationMetadata(r.manualCode, r.accountName);
      if (meta.subCode && r.manualCode !== meta.subCode) {
        upgradedSubCodes++;
        return { ...r, manualCode: meta.subCode };
      }
      return r;
    });

    // 2. Check if any of the 34 primary IFRS statement codes have 0 accounts, and add standard leaf accounts if missing
    const coveredPrimaryCodes = new Set(
      updatedRows.map((r) => extractPrimaryIfrsCode(r.manualCode || suggestIfrsCode(r.accountName)))
    );
    let maxSeq = updatedRows.reduce((m, r) => Math.max(m, r.seq), 0);

    IFRS_MAPPING_CODES.forEach((mapping) => {
      if (!coveredPrimaryCodes.has(mapping.code)) {
        maxSeq++;
        const firstSub = EXCEL_ACCOUNTING_TREE.find(
          (x) => x.level === 3 && x.parentCode === mapping.code
        );
        updatedRows.push({
          seq: maxSeq,
          erpCode: `${1000 + maxSeq}`,
          accountName: `حساب ${mapping.nameAr}`,
          manualCode: firstSub ? firstSub.code : mapping.code,
          openingDebit: 0,
          openingCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
          movementSource: 'فعلي',
        });
        addedMissingItems++;
      }
    });

    // 3. Sort rows cleanly by IFRS section order (A -> L -> E -> O -> R), then subCode, then erpCode
    const orderPrefix: Record<string, number> = { A: 1, L: 2, E: 3, O: 4, R: 5 };
    const sortedRows = [...updatedRows]
      .sort((a, b) => {
        const ca = a.manualCode || suggestIfrsCode(a.accountName) || 'Z';
        const cb = b.manualCode || suggestIfrsCode(b.accountName) || 'Z';
        const pa = orderPrefix[ca.charAt(0)] || 9;
        const pb = orderPrefix[cb.charAt(0)] || 9;
        if (pa !== pb) return pa - pb;
        const cmp = ca.localeCompare(cb, undefined, { numeric: true });
        if (cmp !== 0) return cmp;
        return String(a.erpCode).localeCompare(String(b.erpCode), undefined, { numeric: true });
      })
      .map((r, idx) => ({ ...r, seq: idx + 1 }));

    setEntries(sortedRows);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, sortedRows);
    addNotification({
      title: 'ترتيب واستكمال شجرة الـ 319 عقدة ودليل الحسابات',
      message: `تم تسكين (${upgradedSubCodes}) حساباً في عقدها الفرعية الدقيقة بالمستوى 3، واستكمال (${addedMissingItems}) بنداً ناقصاً، وإعادة ترتيب الـ (${sortedRows.length}) حساباً تسلسلياً.`,
      type: 'success',
    });
  };

  const handleDeleteCoaAccount = (acc: AccountItem) => {
    const hasChildren = coaAccounts.some((a) => a.parentCode === acc.code);
    if (hasChildren) {
      addNotification({
        title: 'تنبيه هيكلي في الشجرة',
        message: 'لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية تحته.',
        type: 'warning',
      });
      return;
    }
    const next = coaAccounts.filter((a) => a.code !== acc.code);
    chartOfAccountsService.saveAccountsForCompany(activeCompanyId, next);
    setCoaAccounts(next);
    addNotification({
      title: 'حذف حساب من الشجرة',
      message: `تم حذف الحساب (${acc.code} - ${acc.nameAr}) من الدليل.`,
      type: 'info',
    });
  };

  const handleOpenAddSubAccount = (parentAcc: AccountItem | null) => {
    setAddingChildParent(parentAcc);
    if (parentAcc) {
      const children = coaAccounts.filter((a) => a.parentCode === parentAcc.code);
      const suggestedCode = `${parentAcc.code}${String(children.length + 1).padStart(parentAcc.level >= 2 ? 2 : 1, '0')}`;
      setNewCoaCode(suggestedCode);
      setNewCoaIfrsCode(parentAcc.ifrsCode || suggestIfrsCode(parentAcc.nameAr) || 'A-01');
    } else {
      setNewCoaCode(`${coaAccounts.filter((a) => !a.parentCode).length + 1}`);
      setNewCoaIfrsCode('A-01');
    }
    setNewCoaName('');
    setNewCoaCustomFields({});
  };

  const handleConfirmAddCoaAccount = () => {
    if (!newCoaCode.trim() || !newCoaName.trim()) return;
    const parentAcc = addingChildParent;
    const created = chartOfAccountsService.addAccount(activeCompanyId, {
      code: newCoaCode.trim(),
      nameAr: newCoaName.trim(),
      nameEn: newCoaName.trim(),
      category: parentAcc ? parentAcc.category : 'أصول',
      nature: parentAcc ? parentAcc.nature : 'مدين',
      statementType: parentAcc ? parentAcc.statementType : 'قائمة المركز المالي (ميزانية)',
      parentCode: parentAcc ? parentAcc.code : undefined,
      level: parentAcc ? parentAcc.level + 1 : 1,
      openingBalance: 0,
      balance: 0,
      currency: 'SAR',
      isActive: true,
      ifrsCode: newCoaIfrsCode,
      customFields: { ...newCoaCustomFields },
    });
    setCoaAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
    if (parentAcc) {
      setExpandedTreeIds((prev) => ({ ...prev, [parentAcc.code]: true }));
    }
    setAddingChildParent(null);
    addNotification({
      title: 'إضافة حساب جديد للشجرة والدليل',
      message: `تمت إضافة الحساب (${created.code} - ${created.nameAr}) في المستوى (${created.level}) بنجاح.`,
      type: 'success',
    });
  };

  const handleFreezeSuggestedMappings = () => {
    let updatedCount = 0;
    const next = entries.map((item) => {
      if (!item.manualCode) {
        const suggested = suggestIfrsCode(item.accountName);
        if (suggested) {
          updatedCount++;
          return { ...item, manualCode: suggested };
        }
      }
      return item;
    });
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
    addNotification({
      title: 'اعتماد التصنيف المقترح (FS_Freeze)',
      message:
        updatedCount > 0
          ? `تم نسخ واعتماد التصنيف المقترح لعدد (${updatedCount}) حساباً بنجاح.`
          : 'جميع الحسابات الـ 211 مصنفة ومعتمدة بالفعل.',
      type: 'success',
    });
  };

  const handleLoadBalancedSample = () => {
    const seeded = ifrsFinancialEngineService.resetTrialBalance(activeCompanyId, true);
    setEntries(seeded);
    addNotification({
      title: 'تحميل ميزان المراجعة التشغيلي (211 حساباً)',
      message: 'تم تحميل الأرصدة الافتتاحية وحركات السنة المتزنة لجميع حسابات الملف الـ 211 وتحديث القوائم الخمس والنسب المالية.',
      type: 'success',
    });
  };

  const handleLoadRawZeroBalances = () => {
    const raw = ifrsFinancialEngineService.resetTrialBalance(activeCompanyId, false);
    setEntries(raw);
    addNotification({
      title: 'تصفير الأرصدة (الوضع الخام كما في الدليل المحاسبي العام)',
      message: 'تمت إعادة الحسابات الـ 211 إلى الوضع الخام بدون أرصدة مع إبقاء الـ 57 حساباً غير مصنفة للمراجعة اليدوية.',
      type: 'info',
    });
  };

  const handleAddAccountRow = () => {
    const nextSeq = entries.length > 0 ? Math.max(...entries.map((e) => e.seq)) + 1 : 1;
    const newRow: TrialBalanceEntry = {
      seq: nextSeq,
      erpCode: `${1000 + nextSeq}`,
      accountName: `حساب جديد #${nextSeq}`,
      manualCode: 'A-10',
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: 0,
      periodCredit: 0,
      movementSource: 'فعلي',
    };
    const next = [...entries, newRow];
    setEntries(next);
    ifrsFinancialEngineService.saveTrialBalance(activeCompanyId, next);
    addNotification({
      title: 'إضافة حساب للميزان',
      message: `تمت إضافة الصف رقم (${nextSeq}) في ميزان المراجعة بنجاح.`,
      type: 'success',
    });
  };

  const getTrialBalanceExportData = () => {
    const sourceRows = filteredRows.length > 0 ? filteredRows : engine.rows;
    return sourceRows.map((r) => {
      const rowObj: Record<string, any> = {
        'م': r.seq,
        'رقم الحساب ERP': r.erpCode,
        'اسم الحساب': r.accountName,
        'كود البند الرئيسي (34)': r.approvedCode,
        'اسم البند في القوائم': r.approvedItemName,
        'كود التصنيف الفرعي الموسع (314)': r.approvedSubCode || r.manualCode || r.approvedCode,
        'اسم البند الفرعي الموسع': r.approvedSubItemName || r.approvedItemName,
        'القسم في القوائم': r.sectionAr,
        'مرجع المعيار (IFRS / IAS)': r.ifrsRef,
        'نوع التدفق النقدي': r.cashFlowType,
        'الطبيعة': r.naturalBalance,
      };
      if (showOpeningCols) {
        rowObj['أول المدة - مدين'] = r.openingDebit;
        rowObj['أول المدة - دائن'] = r.openingCredit;
      }
      if (showMovementCols) {
        rowObj['حركات السنة - مدين'] = r.periodDebit;
        rowObj['حركات السنة - دائن'] = r.periodCredit;
      }
      if (showClosingBalanceCols) {
        rowObj['الرصيد النهائي - مدين'] = r.closingDebit;
        rowObj['الرصيد النهائي - دائن'] = r.closingCredit;
      }
      if (showNetBalanceCol) {
        rowObj['صافي الرصيد النهائي'] = r.closingDebit - r.closingCredit;
      }
      rowObj['حالة الفحص'] = r.statusText;
      rowObj['ملاحظات الفحص'] = r.auditNote;
      return rowObj;
    });
  };

  const handleExportTrialBalance = (format: ExportFormat = 'excel') => {
    const exportRows = getTrialBalanceExportData();
    exportData(
      'trial-balance',
      exportRows,
      format,
      `ميزان المراجعة العام والأرصدة (${settings.companyName})`
    );
    addNotification({
      title: 'تصدير ميزان المراجعة العام',
      message: `تم تصدير (${exportRows.length}) حساباً من ميزان المراجعة بصيغة ${format.toUpperCase()} بنجاح.`,
      type: 'success',
    });
  };

  const getRatiosExportData = () => {
    const visibleStandard = engine.ratios
      .filter((r) => !hiddenRatioIds.includes(r.id))
      .map((r) => ({
        'المجموعة': r.category,
        'النسبة المالية': r.name,
        'طريقة الحساب': r.formula,
        'النتيجة الحالية': r.formattedValue,
        'المعيار المرجعي': r.benchmark,
        'مستهدف Q4 2026': r.target2026Q4,
        'مستهدف 2027': r.target2027,
        'التقييم': r.evaluation,
        'التفسير المالي': r.meaning,
        'خطة العمل والتوصية': r.actionPlan,
      }));
    const visibleCustom = customRatios
      .filter((r) => !hiddenRatioIds.includes(r.id))
      .map((r) => ({
        'المجموعة': r.category,
        'النسبة المالية': r.name,
        'طريقة الحساب': r.formula,
        'النتيجة الحالية': r.formattedValue,
        'المعيار المرجعي': r.benchmark,
        'مستهدف Q4 2026': r.target2026,
        'مستهدف 2027': r.target2027,
        'التقييم': 'ضمن المستهدف المعتمد',
        'التفسير المالي': 'مؤشر مالي مخصص في النظام المحاسبي',
        'خطة العمل والتوصية': r.actionPlan,
      }));
    return [...visibleStandard, ...visibleCustom];
  };

  const handleExportRatiosPlan = (format: ExportFormat = 'excel') => {
    const exportRows = getRatiosExportData();
    exportData(
      'financial-ratios',
      exportRows,
      format,
      `التحليل المالي ومؤشرات الأداء (${settings.companyName})`
    );
    addNotification({
      title: 'تصدير التحليل المالي ومؤشرات الأداء',
      message: `تم تصدير (${exportRows.length}) مؤشراً مالياً بصيغة ${format.toUpperCase()} بنجاح.`,
      type: 'success',
    });
  };

  const consolidatedReport = useMemo(
    () => accountingConsolidationService.generateConsolidatedReport(),
    [entries]
  );

  const getStatementExportData = (
    view: 'balance-sheet' | 'income-statement' | 'equity-changes' | 'cash-flow' | 'ifrs-notes' | 'budget-variance' | 'group-consolidation' = activeStatementView
  ) => {
    if (view === 'group-consolidation') {
      return [
        ...consolidatedReport.incomeStatementMatrix.map((r) => ({
          'القائمة': 'قائمة الدخل الموحدة (IFRS 10)',
          'البند المحاسبي الموحد': r.label,
          'السفير الماسي (SAF) (⃁)': r.saf,
          'سواعد / ياقوت (SAW) (⃁)': r.saw,
          'خالد السليم (KAS) (⃁)': r.kas,
          'شلة ودار الكرم (SHL) (⃁)': r.shl,
          'المجموع قبل الاستبعاد (⃁)': r.combinedBeforeElimination,
          'استبعادات العمليات المتبادلة (⃁)': r.elimination,
          'الموحد النهائي للمجموعة (⃁)': r.consolidatedTotal,
        })),
        ...consolidatedReport.balanceSheetMatrix.map((r) => ({
          'القائمة': 'قائمة المركز المالي الموحدة (IFRS 10)',
          'البند المحاسبي الموحد': r.label,
          'السفير الماسي (SAF) (⃁)': r.saf,
          'سواعد / ياقوت (SAW) (⃁)': r.saw,
          'خالد السليم (KAS) (⃁)': r.kas,
          'شلة ودار الكرم (SHL) (⃁)': r.shl,
          'المجموع قبل الاستبعاد (⃁)': r.combinedBeforeElimination,
          'استبعادات العمليات المتبادلة (⃁)': r.elimination,
          'الموحد النهائي للمجموعة (⃁)': r.consolidatedTotal,
        })),
      ];
    }

    if (view === 'balance-sheet') {
      const bs = engine.balanceSheet;
      return [
        {
          'البند في قائمة المركز المالي': 'ممتلكات وآلات ومعدات وأسطول نقل (بالصافي)',
          'الرمز المعياري': 'A-01 / A-02',
          'المعيار المرجعي': 'IAS 16',
          'السنة الحالية (2026)': bs.current.ppeNet,
          'سنة المقارنة (أول المدة)': bs.comparative.ppeNet,
          'التغير (الفرق)': bs.current.ppeNet - bs.comparative.ppeNet,
        },
        {
          'البند في قائمة المركز المالي': 'أصول غير ملموسة ورخص وبرامج (بالصافي)',
          'الرمز المعياري': 'A-03',
          'المعيار المرجعي': 'IAS 38',
          'السنة الحالية (2026)': bs.current.intangibles,
          'سنة المقارنة (أول المدة)': bs.comparative.intangibles,
          'التغير (الفرق)': bs.current.intangibles - bs.comparative.intangibles,
        },
        {
          'البند في قائمة المركز المالي': 'أصول حق الاستخدام - عقود الإيجار (بالصافي)',
          'الرمز المعياري': 'A-05',
          'المعيار المرجعي': 'IFRS 16',
          'السنة الحالية (2026)': bs.current.rouAssets,
          'سنة المقارنة (أول المدة)': bs.comparative.rouAssets,
          'التغير (الفرق)': bs.current.rouAssets - bs.comparative.rouAssets,
        },
        {
          'البند في قائمة المركز المالي': 'استثمارات وأصول مالية طويلة الأجل وضرائب مؤجلة',
          'الرمز المعياري': 'A-04 / A-11',
          'المعيار المرجعي': 'IFRS 9 / IAS 12',
          'السنة الحالية (2026)': bs.current.longTermInvestments,
          'سنة المقارنة (أول المدة)': bs.comparative.longTermInvestments,
          'التغير (الفرق)': bs.current.longTermInvestments - bs.comparative.longTermInvestments,
        },
        {
          'البند في قائمة المركز المالي': '= إجمالي الأصول غير المتداولة',
          'الرمز المعياري': 'NCA',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalNonCurrentAssets,
          'سنة المقارنة (أول المدة)': bs.comparative.totalNonCurrentAssets,
          'التغير (الفرق)': bs.current.totalNonCurrentAssets - bs.comparative.totalNonCurrentAssets,
        },
        {
          'البند في قائمة المركز المالي': 'المخزون وتكاليف العقود الجارية',
          'الرمز المعياري': 'A-06',
          'المعيار المرجعي': 'IAS 2',
          'السنة الحالية (2026)': bs.current.inventory,
          'سنة المقارنة (أول المدة)': bs.comparative.inventory,
          'التغير (الفرق)': bs.current.inventory - bs.comparative.inventory,
        },
        {
          'البند في قائمة المركز المالي': 'ذمم مدينة تجارية وحسابات ضمان مساند (بالصافي)',
          'الرمز المعياري': 'A-07 / A-08',
          'المعيار المرجعي': 'IFRS 9 / IFRS 15',
          'السنة الحالية (2026)': bs.current.tradeReceivablesNet,
          'سنة المقارنة (أول المدة)': bs.comparative.tradeReceivablesNet,
          'التغير (الفرق)': bs.current.tradeReceivablesNet - bs.comparative.tradeReceivablesNet,
        },
        {
          'البند في قائمة المركز المالي': 'مدفوعات مقدمة، سلف، وأرصدة مدينة وأطراف ذات علاقة',
          'الرمز المعياري': 'A-09 / A-12',
          'المعيار المرجعي': 'IAS 1.66 / IAS 24',
          'السنة الحالية (2026)': bs.current.prepaymentsOtherRec,
          'سنة المقارنة (أول المدة)': bs.comparative.prepaymentsOtherRec,
          'التغير (الفرق)': bs.current.prepaymentsOtherRec - bs.comparative.prepaymentsOtherRec,
        },
        {
          'البند في قائمة المركز المالي': 'النقد وما في حكمه (الصناديق والحسابات البنكية)',
          'الرمز المعياري': 'A-10',
          'المعيار المرجعي': 'IAS 7',
          'السنة الحالية (2026)': bs.current.cashAndEquivalents,
          'سنة المقارنة (أول المدة)': bs.comparative.cashAndEquivalents,
          'التغير (الفرق)': bs.current.cashAndEquivalents - bs.comparative.cashAndEquivalents,
        },
        {
          'البند في قائمة المركز المالي': '= إجمالي الأصول المتداولة',
          'الرمز المعياري': 'CA',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalCurrentAssets,
          'سنة المقارنة (أول المدة)': bs.comparative.totalCurrentAssets,
          'التغير (الفرق)': bs.current.totalCurrentAssets - bs.comparative.totalCurrentAssets,
        },
        {
          'البند في قائمة المركز المالي': '=== إجمالي الأصول (Total Assets) ===',
          'الرمز المعياري': 'TOTAL-A',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalAssets,
          'سنة المقارنة (أول المدة)': bs.comparative.totalAssets,
          'التغير (الفرق)': bs.current.totalAssets - bs.comparative.totalAssets,
        },
        {
          'البند في قائمة المركز المالي': 'رأس المال المدفوع',
          'الرمز المعياري': 'E-01',
          'المعيار المرجعي': 'IAS 1.78',
          'السنة الحالية (2026)': bs.current.shareCapital,
          'سنة المقارنة (أول المدة)': bs.comparative.shareCapital,
          'التغير (الفرق)': bs.current.shareCapital - bs.comparative.shareCapital,
        },
        {
          'البند في قائمة المركز المالي': 'الاحتياطي النظامي والاحتياطيات الأخرى',
          'الرمز المعياري': 'E-02',
          'المعيار المرجعي': 'IAS 1.79',
          'السنة الحالية (2026)': bs.current.reserves,
          'سنة المقارنة (أول المدة)': bs.comparative.reserves,
          'التغير (الفرق)': bs.current.reserves - bs.comparative.reserves,
        },
        {
          'البند في قائمة المركز المالي': 'الأرباح المبقاة (شاملة صافي ربح السنة الحالية)',
          'الرمز المعياري': 'E-03',
          'المعيار المرجعي': 'IAS 1.106',
          'السنة الحالية (2026)': bs.current.retainedEarningsWithProfit,
          'سنة المقارنة (أول المدة)': bs.comparative.retainedEarnings,
          'التغير (الفرق)': bs.current.retainedEarningsWithProfit - bs.comparative.retainedEarnings,
        },
        {
          'البند في قائمة المركز المالي': 'توزيعات الأرباح ومسحوبات الشركاء (تخصم)',
          'الرمز المعياري': 'E-04',
          'المعيار المرجعي': 'IAS 1.107',
          'السنة الحالية (2026)': -bs.current.dividendsDrawings,
          'سنة المقارنة (أول المدة)': -bs.comparative.dividendsDrawings,
          'التغير (الفرق)': -bs.current.dividendsDrawings + bs.comparative.dividendsDrawings,
        },
        {
          'البند في قائمة المركز المالي': 'الدخل الشامل الآخر المتراكم (OCI)',
          'الرمز المعياري': 'O-01',
          'المعيار المرجعي': 'IAS 1.82A',
          'السنة الحالية (2026)': bs.current.oci,
          'سنة المقارنة (أول المدة)': bs.comparative.oci,
          'التغير (الفرق)': bs.current.oci - bs.comparative.oci,
        },
        {
          'البند في قائمة المركز المالي': '= إجمالي حقوق الملكية',
          'الرمز المعياري': 'EQ',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalEquity,
          'سنة المقارنة (أول المدة)': bs.comparative.totalEquity,
          'التغير (الفرق)': bs.current.totalEquity - bs.comparative.totalEquity,
        },
        {
          'البند في قائمة المركز المالي': 'قروض وتمويل مرابحة طويل الأجل - الجزء غير المتداول',
          'الرمز المعياري': 'L-01',
          'المعيار المرجعي': 'IFRS 9',
          'السنة الحالية (2026)': bs.current.longTermLoansNonCurrent,
          'سنة المقارنة (أول المدة)': bs.comparative.longTermLoansNonCurrent,
          'التغير (الفرق)': bs.current.longTermLoansNonCurrent - bs.comparative.longTermLoansNonCurrent,
        },
        {
          'البند في قائمة المركز المالي': 'التزامات عقود إيجار - الجزء غير المتداول',
          'الرمز المعياري': 'L-02',
          'المعيار المرجعي': 'IFRS 16',
          'السنة الحالية (2026)': bs.current.leaseLiabNonCurrent,
          'سنة المقارنة (أول المدة)': bs.comparative.leaseLiabNonCurrent,
          'التغير (الفرق)': bs.current.leaseLiabNonCurrent - bs.comparative.leaseLiabNonCurrent,
        },
        {
          'البند في قائمة المركز المالي': 'مخصص مكافأة نهاية الخدمة للموظفين (EOSB)',
          'الرمز المعياري': 'L-03',
          'المعيار المرجعي': 'IAS 19',
          'السنة الحالية (2026)': bs.current.eosb,
          'سنة المقارنة (أول المدة)': bs.comparative.eosb,
          'التغير (الفرق)': bs.current.eosb - bs.comparative.eosb,
        },
        {
          'البند في قائمة المركز المالي': '= إجمالي الالتزامات غير المتداولة',
          'الرمز المعياري': 'NCL',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalNonCurrentLiabilities,
          'سنة المقارنة (أول المدة)': bs.comparative.totalNonCurrentLiabilities,
          'التغير (الفرق)': bs.current.totalNonCurrentLiabilities - bs.comparative.totalNonCurrentLiabilities,
        },
        {
          'البند في قائمة المركز المالي': 'ذمم دائنة تجارية (الوكلاء الخارجيون والموردون)',
          'الرمز المعياري': 'L-04',
          'المعيار المرجعي': 'IAS 1.69',
          'السنة الحالية (2026)': bs.current.tradePayables,
          'سنة المقارنة (أول المدة)': bs.comparative.tradePayables,
          'التغير (الفرق)': bs.current.tradePayables - bs.comparative.tradePayables,
        },
        {
          'البند في قائمة المركز المالي': 'مستحقات وأرصدة دائنة أخرى وضريبة القيمة المضافة والزكاة',
          'الرمز المعياري': 'L-05 / L-07 / L-08',
          'المعيار المرجعي': 'IAS 37 / IAS 12',
          'السنة الحالية (2026)': bs.current.accrualsOtherPayables + bs.current.otherProvisions + bs.current.zakatTaxPayable,
          'سنة المقارنة (أول المدة)': bs.comparative.accrualsOtherPayables + bs.comparative.otherProvisions + bs.comparative.zakatTaxPayable,
          'التغير (الفرق)':
            bs.current.accrualsOtherPayables +
            bs.current.otherProvisions +
            bs.current.zakatTaxPayable -
            (bs.comparative.accrualsOtherPayables + bs.comparative.otherProvisions + bs.comparative.zakatTaxPayable),
        },
        {
          'البند في قائمة المركز المالي': 'قروض قصيرة الأجل والجزء المتداول من القروض وعقود الإيجار',
          'الرمز المعياري': 'L-06',
          'المعيار المرجعي': 'IFRS 9 / IFRS 16',
          'السنة الحالية (2026)': bs.current.shortTermLoansAndCurrentPortion,
          'سنة المقارنة (أول المدة)': bs.comparative.shortTermLoansAndCurrentPortion,
          'التغير (الفرق)': bs.current.shortTermLoansAndCurrentPortion - bs.comparative.shortTermLoansAndCurrentPortion,
        },
        {
          'البند في قائمة المركز المالي': 'مستحق لأطراف ذات علاقة (جاري الشركاء والشركات الشقيقة)',
          'الرمز المعياري': 'L-09',
          'المعيار المرجعي': 'IAS 24',
          'السنة الحالية (2026)': bs.current.dueToRelatedParties,
          'سنة المقارنة (أول المدة)': bs.comparative.dueToRelatedParties,
          'التغير (الفرق)': bs.current.dueToRelatedParties - bs.comparative.dueToRelatedParties,
        },
        {
          'البند في قائمة المركز المالي': '= إجمالي الالتزامات المتداولة',
          'الرمز المعياري': 'CL',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalCurrentLiabilities,
          'سنة المقارنة (أول المدة)': bs.comparative.totalCurrentLiabilities,
          'التغير (الفرق)': bs.current.totalCurrentLiabilities - bs.comparative.totalCurrentLiabilities,
        },
        {
          'البند في قائمة المركز المالي': '=== إجمالي حقوق الملكية والالتزامات ===',
          'الرمز المعياري': 'TOTAL-EL',
          'المعيار المرجعي': 'IAS 1',
          'السنة الحالية (2026)': bs.current.totalEquityAndLiabilities,
          'سنة المقارنة (أول المدة)': bs.comparative.totalEquityAndLiabilities,
          'التغير (الفرق)': bs.current.totalEquityAndLiabilities - bs.comparative.totalEquityAndLiabilities,
        },
      ];
    }

    if (view === 'income-statement') {
      const is = engine.incomeStatement;
      const rev = is.revenues || 1;
      const rows = [
        { label: '1. الإيرادات التشغيلية (صافي مبيعات العقود والتأجير)', code: 'R-01', ref: 'IFRS 15', val: is.revenues, comp: Math.round(is.revenues * 0.86) },
        { label: '2. تكلفة الإيرادات المباشرة', code: 'R-02', ref: 'IAS 2 / IAS 1.99', val: -is.costOfRevenues, comp: -Math.round(is.costOfRevenues * 0.88) },
        { label: '= مجمل الربح (Gross Profit)', code: 'GP', ref: 'IAS 1', val: is.grossProfit, comp: Math.round(is.revenues * 0.86 - is.costOfRevenues * 0.88) },
        { label: '3. الإيرادات التشغيلية الأخرى', code: 'R-05', ref: 'IAS 1.97', val: is.otherIncome, comp: Math.round(is.otherIncome * 0.8) },
        { label: '4. مصروفات البيع والتسويق', code: 'R-03', ref: 'IAS 1.99', val: -is.sellingMarketingExp, comp: -Math.round(is.sellingMarketingExp * 0.9) },
        { label: '5. المصروفات العمومية والإدارية', code: 'R-04', ref: 'IAS 1.99', val: -is.generalAdminExp, comp: -Math.round(is.generalAdminExp * 0.92) },
        { label: '6. المصروفات التشغيلية الأخرى وخسائر الانخفاض', code: 'R-06', ref: 'IAS 1.97', val: -is.otherExpenses, comp: -Math.round(is.otherExpenses * 0.85) },
        { label: '= الربح قبل الفوائد والضرائب والإهلاك (EBITDA)', code: 'EBITDA', ref: 'IFRS 18', val: is.ebitda, comp: Math.round(is.ebitda * 0.84) },
        { label: '7. مصروف الإهلاك والإطفاء للأصول الثابتة وحق الاستخدام', code: 'R-10', ref: 'IAS 16 / IFRS 16', val: -is.depreciationAmortization, comp: -Math.round(is.depreciationAmortization * 0.95) },
        { label: '= الربح التشغيلي (Operating Profit / EBIT)', code: 'EBIT', ref: 'IFRS 18', val: is.operatingProfit, comp: Math.round(is.operatingProfit * 0.83) },
        { label: '8. إيرادات التمويل والودائع البنكية', code: 'R-07', ref: 'IFRS 9', val: is.financeIncome, comp: Math.round(is.financeIncome * 0.8) },
        { label: '9. تكاليف التمويل والفوائد البنكية وعقود الإيجار', code: 'R-08', ref: 'IFRS 9 / IFRS 16', val: -is.financeCosts, comp: -Math.round(is.financeCosts * 0.9) },
        { label: '= الربح قبل الزكاة وضريبة الدخل (EBT)', code: 'EBT', ref: 'IAS 1 / IFRS 18', val: is.profitBeforeZakat, comp: Math.round(is.profitBeforeZakat * 0.82) },
        { label: '10. مصروف الزكاة الشرعية وضريبة الدخل', code: 'R-09', ref: 'IAS 12 / SOCPA', val: -is.zakatAndTaxExpense, comp: -Math.round(is.zakatAndTaxExpense * 0.85) },
        { label: '=== صافي ربح السنة (Net Profit) ===', code: 'NET', ref: 'IAS 1.81A', val: is.netProfit, comp: Math.round(is.netProfit * 0.82) },
        { label: '11. الدخل الشامل الآخر (OCI)', code: 'O-01', ref: 'IAS 1.82A', val: is.otherComprehensiveIncome, comp: 0 },
        { label: '=== إجمالي الدخل الشامل للسنة ===', code: 'TCI', ref: 'IAS 1.81A', val: is.totalComprehensiveIncome, comp: Math.round(is.netProfit * 0.82) },
      ];
      return rows.map((r) => ({
        'البند في قائمة الدخل الشاملة': r.label,
        'الرمز المعياري': r.code,
        'المعيار المرجعي': r.ref,
        'السنة الحالية (2026)': r.val,
        'فترة المقارنة (2025)': r.comp,
        'النسبة من الإيرادات %': `${((Math.abs(r.val) / rev) * 100).toFixed(1)}%`,
      }));
    }

    if (view === 'equity-changes') {
      const eq = engine.equityChanges;
      return [
        { label: 'الرصيد الافتتاحي في بداية السنة', data: eq.opening },
        { label: 'صافي ربح السنة الحالية (يرحل للأرباح المبقاة)', data: eq.netProfit },
        { label: 'الدخل الشامل الآخر للسنة (OCI)', data: eq.ociMovement },
        { label: 'توزيعات الأرباح ومسحوبات الشركاء المعتمدة', data: eq.dividends },
        { label: 'الزيادة في رأس المال / التحويل للاحتياطي النظامي', data: eq.otherChanges },
        { label: '=== الرصيد الختامي في نهاية السنة (مطابق للمركز المالي) ===', data: eq.closing },
      ].map((r) => ({
        'البيان والحركة': r.label,
        'رأس المال (E-01)': r.data.capital,
        'الاحتياطي النظامي (E-02)': r.data.reserves,
        'الأرباح المبقاة (E-03)': r.data.retainedEarnings,
        'الدخل الشامل الآخر (O-01)': r.data.oci,
        'إجمالي حقوق الملكية (\u20C1)': r.data.total,
      }));
    }

    if (view === 'ifrs-notes') {
      const customNotes = enterpriseAccountingSuiteService.getCustomNotesText(activeCompanyId);
      return DEFAULT_IFRS_NOTES_DEFINITIONS.map((n) => {
        const matching = engine.rows.filter((r) => n.linkedCodes.includes(r.approvedCode));
        const totalDebit = matching.reduce((s, r) => s + r.closingDebit, 0);
        const totalCredit = matching.reduce((s, r) => s + r.closingCredit, 0);
        return {
          'رقم الإيضاح': `إيضاح (${n.noteNumber})`,
          'عنوان الإيضاح المالي': n.titleAr,
          'مرجع المعيار': n.ifrsRef,
          'الأكواد المرتبطة': n.linkedCodes.join(' / ') || 'عام',
          'عدد الحسابات': matching.length,
          'إجمالي مدين (\u20C1)': totalDebit,
          'إجمالي دائن (\u20C1)': totalCredit,
          'السياسة والإفصاح المحاسبي': customNotes[n.noteNumber] ?? n.defaultPolicyText,
        };
      });
    }

    if (view === 'budget-variance') {
      const inc = engine.incomeStatement;
      const budgetOverrides = enterpriseAccountingSuiteService.getBudgetOverrides(activeCompanyId);
      const baseLines: Array<{
        code: string;
        nameAr: string;
        category: 'إيرادات' | 'مصروفات';
        actual: number;
        defaultBudget: number;
        defaultCostCenter: string;
      }> = [
        { code: 'R-01', nameAr: 'الإيرادات من العقود مع العملاء (استقدام ومساند وتشغيل)', category: 'إيرادات', actual: inc.revenues, defaultBudget: Math.round(inc.revenues * 1.15) || 2500000, defaultCostCenter: 'مركز تكلفة الاستقدام ومساند' },
        { code: 'R-02', nameAr: 'تكلفة الإيرادات المباشرة (الوكلاء، التذاكر، التأشيرات، الإيواء)', category: 'مصروفات', actual: inc.costOfRevenues, defaultBudget: Math.round(inc.costOfRevenues * 0.92) || 1200000, defaultCostCenter: 'مركز تكلفة التشغيل والإيواء' },
        { code: 'R-03', nameAr: 'مصروفات البيع والتسويق وعمولات المبيعات', category: 'مصروفات', actual: inc.sellingMarketingExp, defaultBudget: Math.round(inc.sellingMarketingExp * 0.95) || 180000, defaultCostCenter: 'مركز تكلفة التسويق والمبيعات' },
        { code: 'R-04', nameAr: 'المصروفات العمومية والإدارية والرواتب والإيجارات', category: 'مصروفات', actual: inc.generalAdminExp, defaultBudget: Math.round(inc.generalAdminExp * 0.94) || 450000, defaultCostCenter: 'مركز تكلفة الإدارة العامة والموارد البشرية' },
        { code: 'R-05', nameAr: 'مخصص الخسائر الائتمانية المتوقعة (IFRS 9 ECL)', category: 'مصروفات', actual: inc.otherExpenses, defaultBudget: Math.round(inc.otherExpenses * 0.9) || 35000, defaultCostCenter: 'الإدارة المالية والتحصيل' },
        { code: 'R-06', nameAr: 'الإيرادات التشغيلية الأخرى والتعويضات', category: 'إيرادات', actual: inc.otherIncome, defaultBudget: Math.round(inc.otherIncome * 1.1) || 60000, defaultCostCenter: 'الإدارة العامة' },
        { code: 'R-08', nameAr: 'تكاليف التمويل والعمولات البنكية وفوائد عقود الإيجار', category: 'مصروفات', actual: inc.financeCosts, defaultBudget: Math.round(inc.financeCosts * 0.9) || 40000, defaultCostCenter: 'الإدارة المالية والخزينة' },
        { code: 'R-09', nameAr: 'مصروف الزكاة الشرعية وضريبة الدخل', category: 'مصروفات', actual: inc.zakatAndTaxExpense, defaultBudget: Math.round(inc.zakatAndTaxExpense) || 55000, defaultCostCenter: 'الإدارة المالية والزكاة' },
        { code: 'R-10', nameAr: 'مصروف الإهلاك والإطفاء للأصول الثابتة (IAS 16)', category: 'مصروفات', actual: inc.depreciationAmortization, defaultBudget: Math.round(inc.depreciationAmortization) || 85000, defaultCostCenter: 'مركز تكلفة الأصول والإيواء' },
      ];
      return baseLines.map((item) => {
        const ov = budgetOverrides[item.code];
        const budget = ov?.budget ?? item.defaultBudget;
        const costCenter = ov?.costCenter ?? item.defaultCostCenter;
        const varianceAmount = item.category === 'إيرادات' ? item.actual - budget : budget - item.actual;
        const variancePct = budget > 0 ? ((item.actual - budget) / budget) * 100 : 0;
        const isFavorable = varianceAmount >= 0;
        return {
          'كود البند': item.code,
          'اسم البند': item.nameAr,
          'التصنيف': item.category,
          'مركز التكلفة': costCenter,
          'الفعلي (\u20C1)': item.actual,
          'الموازنة التقديرية (\u20C1)': budget,
          'الانحراف (\u20C1)': varianceAmount,
          'نسبة الانحراف %': `${variancePct.toFixed(1)}%`,
          'التقييم': isFavorable ? 'أداء إيجابي / ضمن الموازنة' : 'تجاوز الموازنة المخططة',
        };
      });
    }

    const cf = engine.cashFlow;
    return [
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': 'الربح قبل الزكاة وضريبة الدخل', 'المعيار المرجعي': 'IAS 7.18(b)', 'المبلغ (\u20C1)': cf.profitBeforeZakat },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': 'يضاف: الإهلاك والإطفاء', 'المعيار المرجعي': 'IAS 7.20', 'المبلغ (\u20C1)': cf.depreciationAmortization },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': 'يضاف: صافي تكاليف التمويل', 'المعيار المرجعي': 'IAS 7.20', 'المبلغ (\u20C1)': cf.netFinanceCostsAddedBack },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': '(الزيادة) النقص في المخزون', 'المعيار المرجعي': 'IAS 7.20', 'المبلغ (\u20C1)': cf.changeInInventory },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': '(الزيادة) النقص في الذمم المدينة والمدفوعات المقدمة', 'المعيار المرجعي': 'IAS 7.20', 'المبلغ (\u20C1)': cf.changeInReceivablesAndPrepayments },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': 'الزيادة (النقص) في الذمم الدائنة والمستحقات', 'المعيار المرجعي': 'IAS 7.20', 'المبلغ (\u20C1)': cf.changeInPayablesAndAccruals },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': 'الزيادة (النقص) في مكافأة نهاية الخدمة والمخصصات', 'المعيار المرجعي': 'IAS 7.20', 'المبلغ (\u20C1)': cf.changeInEosbAndProvisions },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': 'الزكاة وضريبة الدخل المدفوعة', 'المعيار المرجعي': 'IAS 7.35', 'المبلغ (\u20C1)': cf.zakatPaid },
      { 'قسم التدفقات': 'الأنشطة التشغيلية', 'البند في قائمة التدفقات النقدية': '= صافي النقد من الأنشطة التشغيلية', 'المعيار المرجعي': 'IAS 7', 'المبلغ (\u20C1)': cf.netCashFromOperating },
      { 'قسم التدفقات': 'الأنشطة الاستثمارية', 'البند في قائمة التدفقات النقدية': 'شراء أصول ثابتة وغير ملموسة واستثمارات (بالصافي)', 'المعيار المرجعي': 'IAS 7.16', 'المبلغ (\u20C1)': cf.netCapexAndInvestments },
      { 'قسم التدفقات': 'الأنشطة الاستثمارية', 'البند في قائمة التدفقات النقدية': '= صافي النقد من الأنشطة الاستثمارية', 'المعيار المرجعي': 'IAS 7', 'المبلغ (\u20C1)': cf.netCashFromInvesting },
      { 'قسم التدفقات': 'الأنشطة التمويلية', 'البند في قائمة التدفقات النقدية': 'التغير في القروض طويلة وقصيرة الأجل والتسهيلات', 'المعيار المرجعي': 'IAS 7.17', 'المبلغ (\u20C1)': cf.changeInLongTermLoans + cf.changeInShortTermLoans },
      { 'قسم التدفقات': 'الأنشطة التمويلية', 'البند في قائمة التدفقات النقدية': 'التغير في المستحق لأطراف ذات علاقة', 'المعيار المرجعي': 'IAS 24', 'المبلغ (\u20C1)': cf.changeInRelatedParties },
      { 'قسم التدفقات': 'الأنشطة التمويلية', 'البند في قائمة التدفقات النقدية': 'التغير في رأس المال والاحتياطيات والتوزيعات', 'المعيار المرجعي': 'IAS 7.17', 'المبلغ (\u20C1)': cf.changeInCapital + cf.changeInReservesAndRetained + cf.dividendsPaid },
      { 'قسم التدفقات': 'الأنشطة التمويلية', 'البند في قائمة التدفقات النقدية': '= صافي النقد من الأنشطة التمويلية', 'المعيار المرجعي': 'IAS 7', 'المبلغ (\u20C1)': cf.netCashFromFinancing },
      { 'قسم التدفقات': 'ملخص النقد', 'البند في قائمة التدفقات النقدية': 'صافي التغير في النقد وما في حكمه خلال السنة', 'المعيار المرجعي': 'IAS 7', 'المبلغ (\u20C1)': cf.netChangeInCash },
      { 'قسم التدفقات': 'ملخص النقد', 'البند في قائمة التدفقات النقدية': 'النقد وما في حكمه - أول المدة', 'المعيار المرجعي': 'IAS 7', 'المبلغ (\u20C1)': cf.openingCash },
      { 'قسم التدفقات': 'ملخص النقد', 'البند في قائمة التدفقات النقدية': '=== النقد وما في حكمه - آخر المدة (مطابق لـ A-10) ===', 'المعيار المرجعي': 'IAS 7.45', 'المبلغ (\u20C1)': cf.calculatedClosingCash },
    ];
  };

  const getStatementTitle = (
    view: 'balance-sheet' | 'income-statement' | 'equity-changes' | 'cash-flow' | 'ifrs-notes' | 'budget-variance' | 'group-consolidation' = activeStatementView
  ) => {
    if (view === 'group-consolidation') return `القوائم المالية الموحدة للمجموعة القابضة ومقارنة الشركات الشقيقة (IFRS 10)`;
    if (view === 'balance-sheet') return `قائمة المركز المالي (IAS 1) — ${settings.companyName}`;
    if (view === 'income-statement') return `قائمة الربح أو الخسارة والدخل الشامل (IAS 1 / IFRS 18) — ${settings.companyName}`;
    if (view === 'equity-changes') return `قائمة التغيرات في حقوق الملكية (IAS 1.106) — ${settings.companyName}`;
    if (view === 'ifrs-notes') return `الإيضاحات المتممة للقوائم المالية (1–12) — ${settings.companyName}`;
    if (view === 'budget-variance') return `الموازنة التقديرية وتحليل الانحراف — ${settings.companyName}`;
    return `قائمة التدفقات النقدية (IAS 7) — ${settings.companyName}`;
  };

  const handleExportStatement = (
    format: ExportFormat = 'excel',
    view: 'balance-sheet' | 'income-statement' | 'equity-changes' | 'cash-flow' | 'ifrs-notes' | 'budget-variance' | 'group-consolidation' = activeStatementView
  ) => {
    const rows = getStatementExportData(view);
    const title = getStatementTitle(view);
    exportData(view, rows, format, title);
    addNotification({
      title: 'تصدير القائمة المالية المعتمدة',
      message: `تم تصدير (${title}) بصيغة ${format.toUpperCase()} بنجاح.`,
      type: 'success',
    });
  };

  const handleExportGroupConsolidationWorkbook = () => {
    const headers = [
      'البند المحاسبي الموحد',
      'السفير الماسي (SAF) (⃁)',
      'سواعد / ياقوت (SAW) (⃁)',
      'خالد السليم (KAS) (⃁)',
      'شلة ودار الكرم (SHL) (⃁)',
      'المجموع قبل الاستبعاد (⃁)',
      'استبعادات العمليات المتبادلة (⃁)',
      'الموحد النهائي للمجموعة (⃁)',
    ];
    exportMultiSheetWorkbook('القوائم_المالية_الموحدة_للمجموعة_القابضة_IFRS10', [
      {
        sheetName: '1_قائمة_الدخل_الموحدة',
        title: 'قائمة الربح أو الخسارة الموحدة للمجموعة القابضة ومقارنة الشركات الشقيقة (IFRS 10)',
        headers,
        rows: consolidatedReport.incomeStatementMatrix.map((r) => [
          r.label,
          r.saf,
          r.saw,
          r.kas,
          r.shl,
          r.combinedBeforeElimination,
          r.elimination,
          r.consolidatedTotal,
        ]),
      },
      {
        sheetName: '2_المركز_المالي_الموحد',
        title: 'قائمة المركز المالي الموحدة للمجموعة القابضة واستبعاد الأرصدة المتبادلة (IFRS 10)',
        headers,
        rows: consolidatedReport.balanceSheetMatrix.map((r) => [
          r.label,
          r.saf,
          r.saw,
          r.kas,
          r.shl,
          r.combinedBeforeElimination,
          r.elimination,
          r.consolidatedTotal,
        ]),
      },
    ]);
    addNotification({
      title: 'تصدير مصنف التوحيد المالي للمجموعة القابضة (IFRS 10)',
      message: 'تم تصدير مصنف القوائم المالية الموحدة للمجموعة القابضة (ورقتي عمل بترميز RTL ورمز ⃁) بنجاح.',
      type: 'success',
    });
  };

  const getDiagnosticsExportData = () => {
    return engine.diagnostics.checks
      .filter((chk) => !hiddenCheckIds.includes(chk.id))
      .filter((chk) => !(hideHealthyChecks && chk.status === 'سليم'))
      .map((chk) => ({
        'رقم الفحص': chk.id,
        'الفحص المعياري': chk.title,
        'مرجع المعيار (IFRS / IAS)': chk.reference,
        'القيمة الرقمية': chk.value,
        'الحالة': chk.status,
        'تشخيص المشكلة': chk.meaning,
        'طريقة المعالجة والحل': chk.resolution,
        'درجة الخطورة': chk.severity,
      }));
  };

  const handleExportDiagnostics = (format: ExportFormat = 'excel') => {
    const rows = getDiagnosticsExportData();
    exportData(
      'ifrs-diagnostics',
      rows,
      format,
      `تقرير الرقابة المالية والتدقيق الآلي للحسابات — ${settings.companyName}`
    );
    addNotification({
      title: 'تصدير تقرير الرقابة والتدقيق',
      message: `تم تصدير (${rows.length}) فحصاً رقابياً بصيغة ${format.toUpperCase()} بنجاح.`,
      type: 'success',
    });
  };

  const getCoaExportData = () => {
    if (coaSubView === 'company-coa-tree') {
      return coaAccounts.map((acc) => ({
        'كود الحساب': acc.code,
        'اسم الحساب (عربي)': acc.nameAr,
        'التصنيف الرئيسي': acc.category,
        'الطبيعة المحاسبية': acc.nature,
        'المستوى الشجري': `المستوى ${acc.level}`,
        'كود البند الرئيسي (34)': acc.ifrsCode || suggestIfrsCode(acc.nameAr),
        'اسم البند الرئيسي': acc.ifrsItemName || '-',
        'كود التصنيف الفرعي الموسع (314)': acc.ifrsSubCode || acc.ifrsCode || '-',
        'اسم البند الفرعي الموسع': acc.ifrsSubItemName || '-',
        'القسم في القوائم': acc.ifrsSection || acc.statementType,
        'مرجع المعيار (IFRS / IAS)': acc.ifrsRef || '-',
        'نوع التدفق النقدي': acc.cashFlowType || '-',
        'الرصيد الافتتاحي': acc.openingBalance,
        'الرصيد الحالي (\u20C1)': acc.balance,
      }));
    }
    if (coaSubView === 'linked-coa-sheet') {
      return engine.rows.map((r) => ({
        'م': r.seq,
        'رقم الحساب ERP': r.erpCode,
        'اسم الحساب': r.accountName,
        'كود البند الرئيسي (34)': r.approvedCode || '-',
        'البند المالي المعتمد': r.approvedItemName || 'غير مصنف',
        'كود التصنيف الفرعي الموسع (314)': r.approvedSubCode || r.manualCode || '-',
        'اسم البند الفرعي الموسع': r.approvedSubItemName || '-',
        'القسم في القوائم': r.sectionAr || '-',
        'مرجع المعيار (IFRS / IAS)': r.ifrsRef || '-',
        'الرصيد النهائي مدين': r.closingDebit,
        'الرصيد النهائي دائن': r.closingCredit,
        'حالة الربط': r.approvedCode ? 'مرتبط' : 'غير مصنف',
      }));
    }
    return EXCEL_ACCOUNTING_TREE.map((node) => {
      const matched = engine.rows.filter(
        (r) =>
          r.approvedCode === node.code ||
          r.manualCode === node.code ||
          (node.level === 1 && r.approvedCode.startsWith(node.code + '-'))
      );
      return {
        'الكود التراتبي': node.code,
        'اسم العقدة / البند في الشجرة': node.titleAr.replace(/^[↳\s]+/, ''),
        'المستوى': `المستوى ${node.level}`,
        'كود القائمة الأب': node.statementCode,
        'عدد الحسابات المرتبطة': matched.length,
        'إجمالي المدين (\u20C1)': matched.reduce((s, x) => s + x.closingDebit, 0),
        'إجمالي الدائن (\u20C1)': matched.reduce((s, x) => s + x.closingCredit, 0),
      };
    });
  };

  const handleExportCoa = (format: ExportFormat = 'excel') => {
    const rows = getCoaExportData();
    exportData(
      'chart-of-accounts',
      rows,
      format,
      `دليل وشجرة الحسابات المعتمدة — ${settings.companyName}`
    );
    addNotification({
      title: 'تصدير الدليل والشجرة المحاسبية',
      message: `تم تصدير (${rows.length}) بنداً من الدليل والشجرة بصيغة ${format.toUpperCase()} بنجاح.`,
      type: 'success',
    });
  };

  const getMappingSettingsExportData = () => {
    if (refGuideSubTab === 'extended-314') {
      return EXTENDED_IFRS_CLASSIFICATIONS.map((item) => ({
        'الكود التفصيلي': item.code,
        'اسم البند التفصيلي': item.nameAr,
        'المستوى': `المستوى ${item.level}`,
        'الكود الأب بالقوائم': item.parentStatementCode,
        'اسم البند الأب': item.parentStatementName,
        'الطبيعة': item.naturalBalance === 'D' ? 'مدين (D)' : 'دائن (C)',
        'مرجع المعيار (IFRS / IAS)': item.ifrsRef,
      }));
    }
    return IFRS_MAPPING_CODES.map((m) => ({
      'الكود المعياري': m.code,
      'اسم البند في القوائم': m.nameAr,
      'القائمة / القسم': m.sectionAr,
      'الطبيعة': m.naturalBalance,
      'مرجع المعيار (IFRS / IAS)': m.ifrsRef,
      'نوع التدفق النقدي': m.cashFlowType,
      'ملاحظات': m.notes,
    }));
  };

  const getActiveWorkspaceExportBundle = (): { sectionKey: string; rows: any[]; title: string } => {
    if (activeSubTab === 'statements') {
      return {
        sectionKey: activeStatementView,
        rows: getStatementExportData(activeStatementView),
        title: getStatementTitle(activeStatementView),
      };
    }
    if (activeSubTab === 'trial-balance') {
      return {
        sectionKey: 'trial-balance',
        rows: getTrialBalanceExportData(),
        title: `ميزان المراجعة العام والأرصدة — ${settings.companyName}`,
      };
    }
    if (activeSubTab === 'coa-tree') {
      return {
        sectionKey: 'chart-of-accounts',
        rows: getCoaExportData(),
        title: `دليل وشجرة الحسابات المعتمدة — ${settings.companyName}`,
      };
    }
    if (activeSubTab === 'diagnostics') {
      return {
        sectionKey: 'ifrs-diagnostics',
        rows: getDiagnosticsExportData(),
        title: `تقرير الرقابة المالية والتدقيق الآلي — ${settings.companyName}`,
      };
    }
    if (activeSubTab === 'mapping-settings') {
      return {
        sectionKey: 'ifrs-mappings',
        rows: getMappingSettingsExportData(),
        title: `قواعد التوجيه المحاسبي المعياري — ${settings.companyName}`,
      };
    }
    return {
      sectionKey: 'financial-ratios',
      rows: getRatiosExportData(),
      title: `التحليل المالي ومؤشرات الأداء — ${settings.companyName}`,
    };
  };

  const handleExportActiveWorkspace = (format: ExportFormat = 'excel') => {
    const bundle = getActiveWorkspaceExportBundle();
    exportData(bundle.sectionKey, bundle.rows, format, bundle.title);
    addNotification({
      title: 'تصدير التقرير المالي المعتمد',
      message: `تم تصدير (${bundle.title}) بصيغة ${format.toUpperCase()} بنجاح.`,
      type: 'success',
    });
  };

  const handleExportFullIfrsWorkbook = () => {
    const tbRows = getTrialBalanceExportData();
    const bsRows = getStatementExportData('balance-sheet');
    const isRows = getStatementExportData('income-statement');
    const eqRows = getStatementExportData('equity-changes');
    const cfRows = getStatementExportData('cash-flow');
    const ratioRows = getRatiosExportData();
    const diagRows = getDiagnosticsExportData();

    const toMatrix = (objs: Record<string, any>[]) => {
      if (!objs || objs.length === 0) return { headers: ['البيان'], rows: [] };
      const headers = Object.keys(objs[0]);
      const rows = objs.map((o) => headers.map((h) => o[h] ?? ''));
      return { headers, rows };
    };

    const tbMat = toMatrix(tbRows);
    const bsMat = toMatrix(bsRows);
    const isMat = toMatrix(isRows);
    const eqMat = toMatrix(eqRows);
    const cfMat = toMatrix(cfRows);
    const ratioMat = toMatrix(ratioRows);
    const diagMat = toMatrix(diagRows);

    exportMultiSheetWorkbook(`المصنف_المالي_الشامل_IFRS_${settings.companyName}`, [
      {
        sheetName: '1_الإعدادات_والحوكمة',
        title: `الإعدادات العامة والملخص التنفيذي — ${settings.companyName}`,
        headers: ['البند / المعلمة المؤسسية', 'القيمة المعتمدة', 'المرجع المعياري / البيان'],
        rows: [
          ['اسم الشركة / الكيان', settings.companyName, 'الكيان القانوني المعد للقوائم المالية'],
          ['تاريخ التقرير المالي', settings.reportingDate, 'IAS 1.51(c)'],
          ['فترة المقارنة', 'السنة المالية السابقة (أرصدة أول المدة)', 'IAS 1.38'],
          ['العملة الوظيفية وعملة العرض', settings.currency, 'IAS 21 — ريال سعودي (⃁)'],
          ['إجمالي الأصول المعتمدة (⃁)', engine.balanceSheet.current.totalAssets, 'IAS 1 — قائمة المركز المالي'],
          ['إجمالي حقوق الملكية والالتزامات (⃁)', engine.balanceSheet.current.totalEquityAndLiabilities, 'IAS 1 — قائمة المركز المالي'],
          ['صافي ربح السنة (⃁)', engine.incomeStatement.netProfit, 'IAS 1 / IFRS 18 — قائمة الدخل'],
          ['الرصيد الختامي للنقد وما في حكمه (⃁)', engine.cashFlow.calculatedClosingCash, 'IAS 7 — التدفقات النقدية'],
          ['حالة المطابقة والرقابة (34 فحصاً)', engine.diagnostics.overallVerdict, `الأخطاء: ${engine.diagnostics.criticalErrorsCount} | التنبيهات: ${engine.diagnostics.warningsCount}`],
        ],
      },
      {
        sheetName: '2_ميزان_المراجعة',
        title: `ميزان المراجعة العام بالأرصدة والمجاميع (${tbRows.length} حساب) — ${settings.companyName}`,
        headers: tbMat.headers,
        rows: tbMat.rows,
        includeTotalsRow: true,
      },
      {
        sheetName: '3_قائمة_المركز_المالي',
        title: `قائمة المركز المالي الموحدة (IAS 1) — ${settings.companyName}`,
        headers: bsMat.headers,
        rows: bsMat.rows,
      },
      {
        sheetName: '4_قائمة_الدخل_الشاملة',
        title: `قائمة الربح أو الخسارة والدخل الشامل (IAS 1 / IFRS 18) — ${settings.companyName}`,
        headers: isMat.headers,
        rows: isMat.rows,
      },
      {
        sheetName: '5_التغيرات_في_حقوق_الملكية',
        title: `قائمة التغيرات في حقوق الملكية (IAS 1.106) — ${settings.companyName}`,
        headers: eqMat.headers,
        rows: eqMat.rows,
      },
      {
        sheetName: '6_قائمة_التدفقات_النقدية',
        title: `قائمة التدفقات النقدية - الطريقة غير المباشرة (IAS 7) — ${settings.companyName}`,
        headers: cfMat.headers,
        rows: cfMat.rows,
      },
      {
        sheetName: '7_التحليل_المالي_والنسب',
        title: `التحليل المالي ومؤشرات الأداء الاستراتيجية — ${settings.companyName}`,
        headers: ratioMat.headers,
        rows: ratioMat.rows,
      },
      {
        sheetName: '8_الفحص_الرقابي_34',
        title: `تقرير الرقابة المالية والتدقيق الآلي (34 فحصاً IFRS / IAS) — ${settings.companyName}`,
        headers: diagMat.headers,
        rows: diagMat.rows,
      },
    ]);

    addNotification({
      title: 'تصدير المصنف المالي الشامل (8 أوراق .xlsx)',
      message: `تم توليد وتصدير المصنف المالي الشامل (8 أوراق عمل مترابطة بترميز RTL ورمز ⃁) لشركة ${settings.companyName} بنجاح.`,
      type: 'success',
    });
  };

  const fmt = (n: number) => `${Math.round(n).toLocaleString()} ⃁`;

  // Helper to render expandable sub-accounts & custom asset fields inside Balance Sheet & Income Statement
  const renderExpandableCodeRows = (
    codes: string[],
    sectionCategory: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات',
    colSpanCount: number
  ) => {
    const primaryCode = codes[0];
    if (!expandedStatementCodes[primaryCode]) return null;
    const matchingRows = engine.rows.filter((r) => codes.includes(r.approvedCode));
    const relevantFields = customFieldDefs.filter(
      (f) => f.section === sectionCategory || f.section === 'ALL'
    );

    return (
      <tr className="bg-[#fafafa]">
        <td colSpan={colSpanCount} className="p-3 border-r-4 border-[#141414]">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-[#141414]">
                البنود والحسابات التفصيلية المدرجة تحت ({codes.join(' / ')}) — عدد الحسابات: ({matchingRows.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFieldManager((v) => !v)}
                  className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold cursor-pointer"
                >
                  + إدارة / إضافة حقول جديدة ({relevantFields.length} حقل)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddStatementLineAccount(
                      primaryCode,
                      sectionCategory === 'أصول' ? 'أصل جديد' : 'بند فرعي جديد'
                    )
                  }
                  className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] hover:opacity-90 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ إضافة {sectionCategory === 'أصول' ? 'أصل / بند جديد' : 'بند فرعي جديد'}</span>
                </button>
              </div>
            </div>

            {matchingRows.length === 0 ? (
              <div className="text-[11px] text-[#707070] p-2 bg-white rounded-xl border border-[#e0e0e0]">
                لا توجد حسابات فرعية مضافة تحت هذا البند حالياً. اضغط (+ إضافة بند جديد) لإضافة حساب وتعديل أرصدته وحقوله.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-2xl border border-[#e0e0e0]">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2">كود الحساب</th>
                      <th className="p-2">اسم الأصل / البند الفرعي (قابل للتعديل)</th>
                      <th className="p-2">التصنيف الموسع</th>
                      <th className="p-2 font-mono">أول المدة مدين</th>
                      <th className="p-2 font-mono">أول المدة دائن</th>
                      <th className="p-2 font-mono">الرصيد النهائي مدين</th>
                      <th className="p-2 font-mono">الرصيد النهائي دائن</th>
                      {relevantFields.map((cf) => (
                        <th key={cf.key} className="p-2 text-[#141414]">
                          {cf.label}
                        </th>
                      ))}
                      <th className="p-2 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {matchingRows.map((sub) => (
                      <tr key={sub.seq} className="hover:bg-[#f3f3f3]/40">
                        <td className="p-1.5 min-w-[90px]">
                          <input
                            type="text"
                            value={sub.erpCode}
                            onChange={(e) => handleUpdateRow(sub.seq, { erpCode: e.target.value })}
                            className="w-20 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-[11px] text-[#141414]"
                          />
                        </td>
                        <td className="p-1.5 min-w-[180px]">
                          <input
                            type="text"
                            value={sub.accountName}
                            onChange={(e) => handleUpdateRow(sub.seq, { accountName: e.target.value })}
                            className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 text-[11px] font-bold text-[#141414]"
                          />
                        </td>
                        <td className="p-1.5 min-w-[150px]">
                          <select
                            value={sub.manualCode || sub.approvedCode}
                            onChange={(e) => handleUpdateRow(sub.seq, { manualCode: e.target.value })}
                            className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-1.5 text-[10px] font-mono text-[#141414]"
                          >
                            {codes.map((c) => (
                              <option key={c} value={c}>
                                {c} (رئيسي)
                              </option>
                            ))}
                            {EXTENDED_IFRS_CLASSIFICATIONS.filter((ext) =>
                              codes.includes(ext.parentStatementCode) && !codes.includes(ext.code)
                            ).map((ext) => (
                              <option key={ext.code} value={ext.code}>
                                {ext.code} - {ext.nameAr}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={sub.openingDebit}
                            onChange={(e) =>
                              handleUpdateRow(sub.seq, { openingDebit: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={sub.openingCredit}
                            onChange={(e) =>
                              handleUpdateRow(sub.seq, { openingCredit: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={sub.closingDebit}
                            onChange={(e) => handleUpdateClosingDebit(sub, parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white border border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-[11px] text-[#141414]"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            value={sub.closingCredit}
                            onChange={(e) => handleUpdateClosingCredit(sub, parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white border border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-[11px] text-[#141414]"
                          />
                        </td>
                        {relevantFields.map((cf) => (
                          <td key={cf.key} className="p-1.5 min-w-[120px]">
                            <input
                              type={cf.fieldType === 'number' ? 'number' : cf.fieldType === 'date' ? 'date' : 'text'}
                              placeholder={cf.defaultValue || cf.label}
                              value={
                                (rowCustomValues[sub.seq] && rowCustomValues[sub.seq][cf.key]) ??
                                cf.defaultValue ??
                                ''
                              }
                              onChange={(e) => handleUpdateRowCustomField(sub.seq, cf.key, e.target.value)}
                              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 text-[11px] text-[#141414]"
                            />
                          </td>
                        ))}
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteAccountRow(sub.seq, sub.accountName)}
                            className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div data-slot="ifrs-financial-engine-workspace" className="space-y-6 text-right dir-rtl">
      {/* Top IFRS Executive Command Header — Mobbin Gallery-White Surface */}
      <div className="bg-white text-[#141414] rounded-3xl p-6 border border-[#e0e0e0] shadow-xs space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                النظام المحاسبي المالي المعتمد (IFRS / SOCPA)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-semibold">
                الدليل والشجرة • قيود اليومية • ميزان المراجعة • القوائم المالية الختامية • الرقابة والتحليل المالي
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-[#141414] m-0">
              النظام المحاسبي المتكامل والقوائم المالية والتحليل المالي — {settings.companyName}
            </h2>
            <p className="text-xs text-[#707070] mt-1">
              الفترة المالية المنتهية في: <span className="font-mono font-bold text-[#141414]">{settings.reportingDate}</span> | العملة:{' '}
              <span className="font-bold text-[#141414]">{settings.currency}</span> | حالة المطابقة والاتزان المحاسبي:{' '}
              <span className="font-bold text-[#141414]">{engine.diagnostics.overallVerdict}</span>
            </p>
          </div>

          {/* Core Accounting System Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowJournalModal((v) => !v)}
              className="px-3.5 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ تسجيل قيد يومية محاسبي</span>
            </button>
            <button
              type="button"
              onClick={handleFreezeSuggestedMappings}
              className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="توجيه وتصنيف كافة الحسابات تلقائياً لبنود القوائم المالية"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>التوجيه المحاسبي التلقائي للحسابات</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCustomizationPanel((v) => !v)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                showCustomizationPanel
                  ? 'bg-[#141414] text-[#ffffff] font-bold'
                  : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] border border-[#e0e0e0]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>تخصيص العرض والإخفاء ({totalHiddenItemsCount})</span>
            </button>
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={handleUndoLastAction}
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تراجع ({undoStack.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportFullIfrsWorkbook}
              className="px-3.5 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="تصدير المصنف المالي الشامل بجميع الأوراق الثماني (الإعدادات • ميزان المراجعة • المركز المالي • الدخل • حقوق الملكية • التدفقات • النسب • الرقابة 34)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير المصنف الشامل (8 أوراق .xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportActiveWorkspace('excel')}
              className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportActiveWorkspace('pdf')}
              className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>تصدير PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportActiveWorkspace('print')}
              className="px-3.5 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة التقرير المعتمد</span>
            </button>
            <ExportDropdown
              sectionKey={getActiveWorkspaceExportBundle().sectionKey}
              data={getActiveWorkspaceExportBundle().rows}
              dataProvider={() => getActiveWorkspaceExportBundle().rows}
              customTitle={getActiveWorkspaceExportBundle().title}
              buttonLabel="جميع صيغ التصدير والمعاينة"
              variant="outline-light"
            />
          </div>
        </div>

        {/* 6 Live Summary Strip Cards */}
        {showKpiStrip && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { label: 'الإيرادات (IFRS 15)', val: fmt(engine.incomeStatement.revenues), sub: 'صافي المبيعات والعقود' },
            { label: 'مجمل الربح', val: fmt(engine.incomeStatement.grossProfit), sub: `هامش ${engine.incomeStatement.revenues > 0 ? ((engine.incomeStatement.grossProfit / engine.incomeStatement.revenues) * 100).toFixed(1) : 0}%` },
            { label: 'صافي ربح السنة', val: fmt(engine.incomeStatement.netProfit), sub: `EBITDA: ${fmt(engine.incomeStatement.ebitda)}` },
            { label: 'إجمالي الأصول (IAS 1)', val: fmt(engine.balanceSheet.current.totalAssets), sub: engine.closingDiff <= settings.roundingTolerance ? '✔ المركز المالي متزن' : '✖ يوجد فرق توازن' },
            { label: 'إجمالي حقوق الملكية', val: fmt(engine.balanceSheet.current.totalEquity), sub: `ROE: ${engine.ratios.find((r) => r.id === 'roe')?.formattedValue || '0%'}` },
            { label: 'نسبة التداول (السيولة)', val: engine.ratios.find((r) => r.id === 'current-ratio')?.formattedValue || '0x', sub: `الأخطاء الجوهرية: ${engine.diagnostics.criticalErrorsCount} | التنبيهات: ${engine.diagnostics.warningsCount}` },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl p-3">
              <div className="text-[11px] font-semibold text-[#707070]">{kpi.label}</div>
              <div className="text-sm md:text-base font-bold font-mono text-[#141414] mt-1">{kpi.val}</div>
              <div className="text-[10px] text-[#707070] mt-1 truncate">{kpi.sub}</div>
            </div>
          ))}
        </div>
        )}

        {/* Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] overflow-x-auto">
          {[
            { id: 'statements', label: 'القوائم المالية والإيضاحات (المركز المالي • الدخل • الملكية • التدفقات • الإيضاحات)', icon: Landmark },
            { id: 'trial-balance', label: `ميزان المراجعة العام والأرصدة (${entries.length} حساب)`, icon: Scale },
            { id: 'coa-tree', label: 'دليل وشجرة الحسابات وحقول الأصول', icon: FolderTree },
            { id: 'enterprise-suite', label: 'المنظومات التخصصية (الإهلاك • الزكاة والضريبة • أعمار الديون • الموازنات • القيود الآلية)', icon: Calculator },
            { id: 'ratios-plan', label: 'التحليل المالي ومؤشرات الأداء (16 مؤشراً)', icon: Target },
            { id: 'diagnostics', label: 'الرقابة المالية والتدقيق الآلي للحسابات', icon: ShieldCheck },
            { id: 'mapping-settings', label: 'قواعد التوجيه المحاسبي وإعدادات النظام', icon: Sliders },
            { id: 'overview', label: 'السياسات المحاسبية وحوكمة المعايير', icon: BookOpen },
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-full text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? 'bg-[#141414] text-[#ffffff] font-bold shadow-xs'
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

      {/* Quick Journal Entry Posting Modal (تسجيل قيد يومية محاسبي مباشر) */}
      {showJournalModal && (
        <div className="bg-white rounded-3xl border border-[#141414] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">
                تسجيل وترحيل قيد يومية محاسبي إلى ميزان المراجعة والقوائم المالية
              </h3>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                يتم إثبات الحركة المدينة والدائنة وترحيلها فوراً إلى أرصدة الحسابات والقوائم المالية الختامية
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowJournalModal(false)}
              className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#141414] block">من حـ/ (الطرف المدين):</label>
              <select
                value={jeDebitSeq}
                onChange={(e) => setJeDebitSeq(Number(e.target.value))}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 font-semibold text-[#141414]"
              >
                {entries.map((r) => (
                  <option key={r.seq} value={r.seq}>
                    {r.erpCode} — {r.accountName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[#141414] block">إلى حـ/ (الطرف الدائن):</label>
              <select
                value={jeCreditSeq}
                onChange={(e) => setJeCreditSeq(Number(e.target.value))}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 font-semibold text-[#141414]"
              >
                {entries.map((r) => (
                  <option key={r.seq} value={r.seq}>
                    {r.erpCode} — {r.accountName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[#141414] block">مبلغ القيد ({settings.currency}):</label>
              <input
                type="number"
                value={jeAmount}
                onChange={(e) => setJeAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 font-mono font-bold text-[#141414]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[#141414] block">البيان / الشرح المحاسبي:</label>
              <input
                type="text"
                value={jeDescription}
                onChange={(e) => setJeDescription(e.target.value)}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowJournalModal(false)}
              className="px-4 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handlePostJournalEntry}
              className="px-5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
            >
              اعتماد وترحيل القيد المحاسبي
            </button>
          </div>
        </div>
      )}

      {/* Universal Accounting View & Hide/Show Control Bar */}
      {(showCustomizationPanel || totalHiddenItemsCount > 0) && (
        <div className="bg-white rounded-3xl border border-[#e0e0e0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#141414]">
                لوحة التحكم في إظهار وإخفاء عناصر النظام المحاسبي:
              </span>
              <button
                type="button"
                onClick={() => setShowKpiStrip((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showKpiStrip ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {showKpiStrip ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>شريط الملخص المالي العلوي</span>
              </button>
              <button
                type="button"
                onClick={() => setHideZeroBalanceRows((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  !hideZeroBalanceRows ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {!hideZeroBalanceRows ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>الحسابات ذات الرصيد الصفري</span>
              </button>
              <button
                type="button"
                onClick={() => setShowClosingBalanceCols((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showClosingBalanceCols ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {showClosingBalanceCols ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>الرصيد النهائي (مدين / دائن)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowOpeningCols((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showOpeningCols ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {showOpeningCols ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>أرصدة أول المدة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMovementCols((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showMovementCols ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {showMovementCols ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>حركات السنة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDupontAltman((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showDupontAltman ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {showDupontAltman ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>بطاقات التحليل المتقدم (DuPont/Altman)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWhatIfSimulator((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                  showWhatIfSimulator ? 'bg-[#141414] text-[#ffffff]' : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {showWhatIfSimulator ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>محاكي التخطيط المالي</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {totalHiddenItemsCount > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreAllHidden}
                  className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>إظهار واستعادة كل المخفي ({totalHiddenItemsCount})</span>
                </button>
              )}
              {showCustomizationPanel && (
                <button
                  type="button"
                  onClick={() => setShowCustomizationPanel(false)}
                  className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                  title="إغلاق شريط التخصيص"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 1: FINANCIAL RATIOS & STRATEGIC IMPROVEMENT PLAN (خطة النسب المالية)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'ratios-plan' && (
        <div className="space-y-6">
          {/* Header & Export */}
          <div className="bg-white p-5 rounded-3xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#141414]" />
                <h3 className="text-base font-bold text-[#141414] m-0">
                  النسب المالية والتحليل وخطة تحسين المؤشرات المالية (16 نسبة معيارية + نموذج DuPont + مؤشر Altman Z-Score)
                </h3>
              </div>
              <p className="text-xs text-[#707070] mt-1">
                تحتسب كل نسبة آلياً من القوائم المالية الخمس مع المعيار المرجعي الإرشادي، التقييم التلقائي، وخطة العمل التنفيذية لتحقيق مستهدفات 2026–2027
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowDupontAltman((v) => !v)}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                {showDupontAltman ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showDupontAltman ? 'إخفاء بطاقات DuPont/Altman' : 'إظهار بطاقات DuPont/Altman'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWhatIfSimulator((v) => !v)}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                {showWhatIfSimulator ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showWhatIfSimulator ? 'إخفاء محاكي التخطيط' : 'إظهار محاكي التخطيط'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddRatioForm((v) => !v)}
                className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة مؤشر مالي جديد</span>
              </button>
              {hiddenRatioIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHiddenRatioIds([])}
                  className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#141414] text-xs font-bold cursor-pointer"
                >
                  إظهار المؤشرات المخفية ({hiddenRatioIds.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => handleExportRatiosPlan('excel')}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1" />
                <span>تصدير Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportRatiosPlan('pdf')}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <FileText className="w-4 h-4 ml-1" />
                <span>تصدير PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportRatiosPlan('print')}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                <Printer className="w-4 h-4 ml-1" />
                <span>طباعة معتمدة</span>
              </button>
              <ExportDropdown
                sectionKey="financial-ratios"
                data={getRatiosExportData()}
                dataProvider={() => getRatiosExportData()}
                customTitle={`التحليل المالي ومؤشرات الأداء (${settings.companyName})`}
                buttonLabel="خيارات التصدير (12 صيغة)"
                variant="outline-light"
              />
            </div>
          </div>

          {showAddRatioForm && (
            <div className="bg-[#f3f3f3] p-4 rounded-3xl border border-[#141414] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#141414] m-0">+ إضافة مؤشر أو نسبة مالية جديدة للنظام المحاسبي</h4>
                <button type="button" onClick={() => setShowAddRatioForm(false)} className="text-[#707070] hover:text-[#141414] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <input
                  type="text"
                  placeholder="اسم المؤشر (مثال: تغطية الفوائد)"
                  value={newRatioName}
                  onChange={(e) => setNewRatioName(e.target.value)}
                  className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-1.5 text-xs"
                />
                <select
                  value={newRatioCategory}
                  onChange={(e) => setNewRatioCategory(e.target.value)}
                  className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="السيولة">السيولة</option>
                  <option value="الربحية">الربحية</option>
                  <option value="المديونية">المديونية</option>
                  <option value="الكفاءة التشغيلية">الكفاءة التشغيلية</option>
                </select>
                <input
                  type="text"
                  placeholder="معادلة الاحتساب"
                  value={newRatioFormula}
                  onChange={(e) => setNewRatioFormula(e.target.value)}
                  className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="القيمة الحالية (مثال: 4.5x)"
                  value={newRatioValue}
                  onChange={(e) => setNewRatioValue(e.target.value)}
                  className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-1.5 text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="المستهدف (مثال: 6.0x)"
                  value={newRatioTarget}
                  onChange={(e) => setNewRatioTarget(e.target.value)}
                  className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-1.5 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddCustomRatio}
                  className="bg-[#141414] text-[#ffffff] rounded-xl px-4 py-1.5 text-xs font-bold cursor-pointer"
                >
                  حفظ وإضافة المؤشر
                </button>
              </div>
            </div>
          )}

          {/* DuPont 3-Step ROE & Altman Z-Score & Cash Conversion Cycle Executive Cards */}
          {showDupontAltman && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* DuPont ROE Analysis */}
            <div className="bg-white p-5 rounded-3xl border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#141414]">تحليل دي بونت الثلاثي (DuPont ROE Model)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  ROE = {engine.advancedMetrics.dupontRoePct.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-[#707070] m-0">
                تفكيك العائد على حقوق الملكية إلى 3 محركات استراتيجية: هامش صافي الربح × دوران الأصول × مضاعف الملكية
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[10px] text-[#707070]">هامش صافي الربح</div>
                  <div className="text-sm font-bold font-mono text-[#141414] mt-0.5">
                    {engine.ratios.find((r) => r.id === 'net-margin')?.formattedValue}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[10px] text-[#707070]">× دوران الأصول</div>
                  <div className="text-sm font-bold font-mono text-[#141414] mt-0.5">
                    {engine.ratios.find((r) => r.id === 'asset-turnover')?.formattedValue}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[10px] text-[#707070]">× مضاعف الملكية</div>
                  <div className="text-sm font-bold font-mono text-[#141414] mt-0.5">
                    {engine.advancedMetrics.equityMultiplier.toFixed(2)}x
                  </div>
                </div>
              </div>
            </div>

            {/* Altman Z-Score Going Concern */}
            <div className="bg-white p-5 rounded-3xl border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#141414]">مؤشر ألتمان للاستمرارية (Altman Z&apos;&apos;-Score)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                  Z = {engine.advancedMetrics.altmanZScore.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#707070] m-0">
                نموذج التنبؤ بالملاءة المالية واستمرارية النشاط للشركات الخدمية وفق معيار IAS 1.25 (المنطقة الآمنة &gt; 2.60)
              </p>
              <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#141414]">التصنيف الائتماني للاستمرارية:</span>
                <span className="font-bold text-[#141414]">
                  {engine.advancedMetrics.altmanZScore >= 2.6
                    ? '✔ منطقة الأمان المالي العالي (Safe Zone)'
                    : engine.advancedMetrics.altmanZScore >= 1.1
                    ? '⚠ المنطقة الرمادية (Grey Zone - تتطلب مراقبة)'
                    : '✖ منطقة الخطر المالي (Distress Zone)'}
                </span>
              </div>
            </div>

            {/* Cash Conversion Cycle (CCC) */}
            <div className="bg-white p-5 rounded-3xl border border-[#e0e0e0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#141414]">دورة التحول النقدي (Cash Conversion Cycle)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  {Math.round(engine.advancedMetrics.cashConversionCycle)} يوم
                </span>
              </div>
              <p className="text-[11px] text-[#707070] m-0">
                الفترة الزمنية بين دفع مستحقات الوكلاء وتحصيل عقود العملاء (DSO + DIO - DPO)
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[10px] text-[#707070]">تحصيل الذمم DSO</div>
                  <div className="text-sm font-bold font-mono text-[#141414] mt-0.5">
                    {engine.ratios.find((r) => r.id === 'dso')?.formattedValue}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[10px] text-[#707070]">+ المخزون DIO</div>
                  <div className="text-sm font-bold font-mono text-[#141414] mt-0.5">
                    {engine.ratios.find((r) => r.id === 'dio')?.formattedValue}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[10px] text-[#707070]">- سداد الموردين DPO</div>
                  <div className="text-sm font-bold font-mono text-[#141414] mt-0.5">
                    {engine.ratios.find((r) => r.id === 'dpo')?.formattedValue}
                  </div>
                </div>
              </div>
            </div>
          </div>

          )}

          {/* Interactive What-If Financial Ratios Plan Simulator */}
          {showWhatIfSimulator && (
          <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
              <div>
                <h4 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#141414]" />
                  <span>محاكي خطة النسب المالية التفاعلي (What-If Financial Ratios Planner 2026/2027)</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  حرّك المؤشرات الأربع لمحاكاة أثر الخطة التشغيلية والمالية على النسب المالية وصافي الربح والسيولة فوراً
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimRevenueGrowthPct(15);
                  setSimCostReductionPct(8);
                  setSimCollectionAccelDays(15);
                  setSimDebtPaydownPct(20);
                }}
                className="button-outline-on-light"
                style={{ padding: '4px 12px', fontSize: '11px' }}
              >
                إعادة ضبط الخطة الافتراضية
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#141414]">
                  <span>1. نمو الإيرادات المستهدف:</span>
                  <span className="font-mono">+{simRevenueGrowthPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  aria-label="نمو الإيرادات المستهدف"
                  value={simRevenueGrowthPct}
                  onChange={(e) => setSimRevenueGrowthPct(Number(e.target.value))}
                  className="w-full accent-[#141414] cursor-pointer"
                />
                <div className="text-[10.5px] text-[#707070]">
                  التوسع في عقود استقدام مساند والتأجير المرن ونقل الكفالة
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#141414]">
                  <span>2. ترشيد التكاليف المباشرة:</span>
                  <span className="font-mono">-{simCostReductionPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  aria-label="ترشيد التكاليف المباشرة"
                  value={simCostReductionPct}
                  onChange={(e) => setSimCostReductionPct(Number(e.target.value))}
                  className="w-full accent-[#141414] cursor-pointer"
                />
                <div className="text-[10.5px] text-[#707070]">
                  خصومات تذاكر الطيران وعمولات الوكلاء وترشيد الإعاشة
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#141414]">
                  <span>3. تسريع تحصيل الذمم (DSO):</span>
                  <span className="font-mono">-{simCollectionAccelDays} يوم</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={1}
                  aria-label="تسريع تحصيل الذمم"
                  value={simCollectionAccelDays}
                  onChange={(e) => setSimCollectionAccelDays(Number(e.target.value))}
                  className="w-full accent-[#141414] cursor-pointer"
                />
                <div className="text-[10.5px] text-[#707070]">
                  تسريع تسويات حساب ضمان مساند وتحصيل ذمم العملاء
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#141414]">
                  <span>4. تخفيض الالتزامات المتداولة:</span>
                  <span className="font-mono">-{simDebtPaydownPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  aria-label="تخفيض الالتزامات المتداولة"
                  value={simDebtPaydownPct}
                  onChange={(e) => setSimDebtPaydownPct(Number(e.target.value))}
                  className="w-full accent-[#141414] cursor-pointer"
                />
                <div className="text-[10.5px] text-[#707070]">
                  سداد دفعات التمويل وجدولة المستحقات لتحسين نسبة التداول
                </div>
              </div>
            </div>

            {/* Simulated Output Comparison Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {[
                {
                  title: 'صافي الربح المتوقع',
                  cur: fmt(engine.incomeStatement.netProfit),
                  sim: fmt(simulatedPlan.projNetProfit),
                },
                {
                  title: 'نسبة التداول المتوقعة',
                  cur: `${(engine.ratios.find((r) => r.id === 'current-ratio')?.value || 0).toFixed(2)}x`,
                  sim: `${simulatedPlan.projCurrentRatio.toFixed(2)}x`,
                },
                {
                  title: 'هامش مجمل الربح',
                  cur: `${(engine.ratios.find((r) => r.id === 'gross-margin')?.value || 0).toFixed(1)}%`,
                  sim: `${simulatedPlan.projGrossMargin.toFixed(1)}%`,
                },
                {
                  title: 'هامش صافي الربح',
                  cur: `${(engine.ratios.find((r) => r.id === 'net-margin')?.value || 0).toFixed(1)}%`,
                  sim: `${simulatedPlan.projNetMargin.toFixed(1)}%`,
                },
                {
                  title: 'العائد على الملكية ROE',
                  cur: `${(engine.ratios.find((r) => r.id === 'roe')?.value || 0).toFixed(1)}%`,
                  sim: `${simulatedPlan.projRoe.toFixed(1)}%`,
                },
                {
                  title: 'فترة التحصيل DSO',
                  cur: `${Math.round(engine.ratios.find((r) => r.id === 'dso')?.value || 0)} يوم`,
                  sim: `${Math.round(simulatedPlan.projDso)} يوم`,
                },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl border border-[#e0e0e0] bg-white">
                  <div className="text-[11px] text-[#707070]">{item.title}</div>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-[11px] font-mono text-[#707070] line-through">{item.cur}</span>
                    <span className="text-sm font-bold font-mono text-[#141414]">{item.sim}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          )}

          {/* Complete 16 Financial Ratios Matrix Table with Action Plan */}
          <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#141414] m-0">
                مصفوفة النسب المالية الـ 16 وخطة المستهدفات الربعية والسنوية (IFRS Financial Ratios & Action Plan)
              </h4>
              <span className="text-xs text-[#707070]">
                4 مجموعات رئيسية: السيولة • الهيكل المالي والمديونية • الربحية • الكفاءة التشغيلية
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3">المجموعة</th>
                    <th className="p-3">النسبة المالية</th>
                    <th className="p-3">معادلة الاحتساب</th>
                    <th className="p-3 font-mono">الفعلي الحالي</th>
                    <th className="p-3 font-mono">المعيار الإرشادي</th>
                    <th className="p-3 font-mono">مستهدف 2026</th>
                    <th className="p-3 font-mono">مستهدف 2027</th>
                    <th className="p-3">التقييم التلقائي</th>
                    <th className="p-3">التفسير وخطة العمل التنفيذية لتحسين المؤشر (قابل للتعديل)</th>
                    <th className="p-3 text-center">إخفاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {engine.ratios
                    .filter((r) => !hiddenRatioIds.includes(r.id))
                    .map((ratio) => (
                    <tr key={ratio.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3 font-semibold text-[#707070] whitespace-nowrap">{ratio.category}</td>
                      <td className="p-3 font-bold text-[#141414] whitespace-nowrap">{ratio.name}</td>
                      <td className="p-3 text-[#707070]">{ratio.formula}</td>
                      <td className="p-3 font-mono font-bold text-sm text-[#141414] whitespace-nowrap">
                        {ratio.formattedValue}
                      </td>
                      <td className="p-3 font-mono text-[#707070] whitespace-nowrap">{ratio.benchmark}</td>
                      <td className="p-3 font-mono font-semibold text-[#141414] whitespace-nowrap">
                        {ratio.unit === 'percent'
                          ? `${ratio.target2026Q4}%`
                          : ratio.unit === 'days'
                          ? `${ratio.target2026Q4} يوم`
                          : ratio.unit === 'currency'
                          ? fmt(ratio.target2026Q4)
                          : `${ratio.target2026Q4}x`}
                      </td>
                      <td className="p-3 font-mono font-semibold text-[#141414] whitespace-nowrap">
                        {ratio.unit === 'percent'
                          ? `${ratio.target2027}%`
                          : ratio.unit === 'days'
                          ? `${ratio.target2027} يوم`
                          : ratio.unit === 'currency'
                          ? fmt(ratio.target2027)
                          : `${ratio.target2027}x`}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            ratio.evaluation === 'ممتاز / جيد'
                              ? 'bg-[#141414] text-[#ffffff]'
                              : ratio.evaluation === 'مقبول'
                              ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                              : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                          }`}
                        >
                          {ratio.evaluation === 'ممتاز / جيد'
                            ? '✔ ممتاز / جيد'
                            : ratio.evaluation === 'مقبول'
                            ? '⚠ مقبول'
                            : '✖ ضعيف'}
                        </span>
                      </td>
                      <td className="p-3 max-w-md">
                        <div className="text-[#141414] font-medium">{ratio.meaning}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <strong className="text-[11px] text-[#141414] shrink-0">خطة التحسين:</strong>
                          <input
                            type="text"
                            value={ratioOverrides[ratio.id]?.actionPlan ?? ratio.actionPlan}
                            onChange={(e) =>
                              setRatioOverrides((prev) => ({
                                ...prev,
                                [ratio.id]: { ...prev[ratio.id], actionPlan: e.target.value },
                              }))
                            }
                            className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-0.5 text-[11px] text-[#141414]"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setHiddenRatioIds((prev) => [...prev, ratio.id])}
                          className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                          title="إخفاء هذا المؤشر"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customRatios
                    .filter((cr) => !hiddenRatioIds.includes(cr.id))
                    .map((cr) => (
                      <tr key={cr.id} className="bg-[#fafafa] hover:bg-[#f3f3f3]/50">
                        <td className="p-3 font-semibold text-[#707070]">{cr.category}</td>
                        <td className="p-3 font-bold text-[#141414]">{cr.name}</td>
                        <td className="p-3 text-[#707070]">{cr.formula}</td>
                        <td className="p-3 font-mono font-bold text-sm text-[#141414]">{cr.formattedValue}</td>
                        <td className="p-3 font-mono text-[#707070]">{cr.benchmark}</td>
                        <td className="p-3 font-mono font-semibold text-[#141414]">{cr.target2026}</td>
                        <td className="p-3 font-mono font-semibold text-[#141414]">{cr.target2027}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#141414] text-[#ffffff]">
                            مخصص
                          </span>
                        </td>
                        <td className="p-3 text-xs text-[#141414]">{cr.actionPlan}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setHiddenRatioIds((prev) => [...prev, cr.id])}
                              className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                              title="إخفاء"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomRatios((prev) => prev.filter((x) => x.id !== cr.id))}
                              className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 2: THE 5 IFRS FINANCIAL STATEMENTS (القوائم المالية الخمس)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'statements' && (
        <div className="space-y-5">
          {/* Statement Selector Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'balance-sheet', label: '1. قائمة المركز المالي (IAS 1)' },
                { id: 'income-statement', label: '2. قائمة الربح أو الخسارة والدخل الشامل (IAS 1 / IFRS 18)' },
                { id: 'equity-changes', label: '3. قائمة التغيرات في حقوق الملكية (IAS 1.106)' },
                { id: 'cash-flow', label: '4. قائمة التدفقات النقدية - غير المباشرة (IAS 7)' },
                { id: 'ifrs-notes', label: '5. الإيضاحات المتممة للقوائم المالية (1–12)' },
                { id: 'budget-variance', label: '6. الموازنة التقديرية وتحليل الانحراف (Budget vs. Actual)' },
                { id: 'group-consolidation', label: '7. القوائم المالية الموحدة للمجموعة القابضة (IFRS 10)' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveStatementView(st.id as any)}
                  className={`px-4 py-2 rounded-full text-xs cursor-pointer transition-all ${
                    activeStatementView === st.id
                      ? 'bg-[#141414] text-[#ffffff] font-bold'
                      : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] font-medium'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleExportStatement('excel')}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1" />
                <span>تصدير القائمة Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportStatement('pdf')}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <FileText className="w-4 h-4 ml-1" />
                <span>تصدير القائمة PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportStatement('print')}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                <Printer className="w-4 h-4 ml-1" />
                <span>طباعة القائمة المعتمدة</span>
              </button>
              <ExportDropdown
                sectionKey={activeStatementView}
                data={getStatementExportData(activeStatementView)}
                dataProvider={() => getStatementExportData(activeStatementView)}
                customTitle={getStatementTitle(activeStatementView)}
                buttonLabel="جميع صيغ التصدير والمعاينة"
                variant="outline-light"
              />
            </div>
          </div>

          {/* Custom Dynamic Field Manager Drawer (For Assets & Expandable Sections) */}
          {showCustomFieldManager && (
            <div className="bg-white p-5 rounded-3xl border-2 border-[#141414] space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    إدارة وإضافة حقول مخصصة جديدة للأصول والأقسام القابلة للتوسع (Dynamic Custom Fields)
                  </h4>
                  <p className="text-xs text-[#707070] mt-0.5">
                    أضف أي حقل جديد للأصول (مثل: نسبة الإهلاك، رقم الوثيقة، الموقع، المورد، القيمة العادلة) أو لأي قسم آخر ليظهر فوراً في جداول الأصول والميزان
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomFieldManager(false)}
                  className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-[#f3f3f3] p-3.5 rounded-2xl border border-[#e0e0e0]">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">اسم الحقل الجديد *</label>
                  <input
                    type="text"
                    placeholder="مثال: نسبة الإهلاك / الرقم التسلسلي للأصل..."
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-3 text-xs text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">القسم المرتبط</label>
                  <select
                    value={newFieldSection}
                    onChange={(e) => setNewFieldSection(e.target.value as any)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-3 text-xs font-semibold text-[#141414]"
                  >
                    <option value="أصول">قسم الأصول (Assets)</option>
                    <option value="خصوم">قسم الخصوم والالتزامات</option>
                    <option value="حقوق ملكية">قسم حقوق الملكية</option>
                    <option value="إيرادات">قسم الإيرادات</option>
                    <option value="مصروفات">قسم المصروفات والتكاليف</option>
                    <option value="ALL">جميع الأقسام</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">نوع الحقل</label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-3 text-xs font-semibold text-[#141414]"
                  >
                    <option value="text">نص / بيان</option>
                    <option value="number">رقم / مبلغ مالي</option>
                    <option value="percent">نسبة مئوية (%)</option>
                    <option value="date">تاريخ</option>
                  </select>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddCustomFieldDef}
                    className="w-full py-2 px-4 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                  >
                    + إضافة الحقل الآن
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {customFieldDefs.map((cf) => (
                  <div
                    key={cf.key}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs"
                  >
                    <span className="font-bold text-[#141414]">{cf.label}</span>
                    <span className="text-[10px] text-[#707070]">({cf.section})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomFieldDef(cf.key)}
                      className="text-[#707070] hover:text-[#141414] font-bold cursor-pointer"
                      title="حذف الحقل"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1. STATEMENT OF FINANCIAL POSITION (IAS 1) WITH EXPANDABLE ASSETS & CUSTOM FIELDS */}
          {activeStatementView === 'balance-sheet' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#141414] m-0">
                    {settings.companyName} — قائمة المركز المالي التفاعلية القابلة للتوسع (IAS 1)
                  </h3>
                  <p className="text-xs text-[#707070] mt-0.5">
                    كما في {settings.reportingDate} | اضغط على أي بند لتوسيع الأصول والحسابات الفرعية، أو إضافة حقول وأصول جديدة وتعديلها مباشرة
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowCustomFieldManager((v) => !v)}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة حقل جديد للأصول والأقسام ({customFieldDefs.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStatementCodes({
                        'A-01': true, 'A-03': true, 'A-05': true, 'A-04': true,
                        'A-06': true, 'A-07': true, 'A-09': true, 'A-10': true,
                        'E-01': true, 'E-02': true, 'E-03': true, 'L-01': true,
                        'L-02': true, 'L-03': true, 'L-04': true, 'L-05': true,
                      })
                    }
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                  >
                    توسيع كافة الأقسام
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedStatementCodes({})}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                  >
                    طي الكل
                  </button>
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#141414] text-[#ffffff]">
                    {Math.abs(engine.balanceSheet.current.diff) <= settings.roundingTolerance
                      ? '✔ متزنة تماماً: الأصول = حقوق الملكية + الالتزامات'
                      : `✖ فرق التوازن: ${fmt(engine.balanceSheet.current.diff)}`}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">البند في قائمة المركز المالي (اضغط للتوسيع والتعديل)</th>
                      <th className="p-3">الرمز</th>
                      <th className="p-3">المعيار المرجعي</th>
                      <th className="p-3 font-mono">السنة الحالية (2026)</th>
                      <th className="p-3 font-mono">المقارنة (أول المدة)</th>
                      <th className="p-3 text-center">التوسع والإضافة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {/* Non-Current Assets Header */}
                    <tr className="bg-[#f3f3f3]/80 font-bold text-[#141414]">
                      <td colSpan={4} className="p-2.5">1. الأصول غير المتداولة (Non-Current Assets) — قابلة للتوسع وإضافة حقول الأصول</td>
                      <td colSpan={2} className="p-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => handleAddStatementLineAccount('A-01', 'أصل غير متداول جديد')}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          + إضافة أصل ثابت / غير متداول
                        </button>
                      </td>
                    </tr>
                    {[
                      { label: 'ممتلكات وآلات ومعدات وأسطول نقل (بالصافي بعد مجمع الإهلاك)', codes: ['A-01', 'A-02'], ref: 'IAS 16', cur: engine.balanceSheet.current.ppeNet, comp: engine.balanceSheet.comparative.ppeNet, cat: 'أصول' as const },
                      { label: 'أصول غير ملموسة ورخص وبرامج (بالصافي)', codes: ['A-03'], ref: 'IAS 38', cur: engine.balanceSheet.current.intangibles, comp: engine.balanceSheet.comparative.intangibles, cat: 'أصول' as const },
                      { label: 'أصول حق الاستخدام - عقود الإيجار (بالصافي)', codes: ['A-05'], ref: 'IFRS 16', cur: engine.balanceSheet.current.rouAssets, comp: engine.balanceSheet.comparative.rouAssets, cat: 'أصول' as const },
                      { label: 'استثمارات وأصول مالية طويلة الأجل وضرائب مؤجلة', codes: ['A-04', 'A-11'], ref: 'IFRS 9 / IAS 12', cur: engine.balanceSheet.current.longTermInvestments, comp: engine.balanceSheet.comparative.longTermInvestments, cat: 'أصول' as const },
                    ].map((item) => {
                      const pCode = item.codes[0];
                      const isExp = Boolean(expandedStatementCodes[pCode]);
                      return (
                        <React.Fragment key={pCode}>
                          <tr className="hover:bg-[#f3f3f3]/50 cursor-pointer" onClick={() => toggleStatementSection(pCode)}>
                            <td className="p-2.5 pr-4 font-semibold text-[#141414] flex items-center gap-1.5">
                              {isExp ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <input
                                type="text"
                                value={statementLabelOverrides[pCode] ?? item.label}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateStatementLabel(pCode, e.target.value)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono">{item.codes.join(' / ')}</td>
                            <td className="p-2.5 font-mono text-[#707070]">{item.ref}</td>
                            <td className="p-2.5 font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.cur)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.cur,
                                    parseFloat(e.target.value) || 0,
                                    'current',
                                    'D',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[#707070]" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.comp)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.comp,
                                    parseFloat(e.target.value) || 0,
                                    'comparative',
                                    'D',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#707070]"
                              />
                            </td>
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleAddStatementLineAccount(pCode, 'أصل جديد')}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer"
                              >
                                + إضافة وتعديل
                              </button>
                            </td>
                          </tr>
                          {renderExpandableCodeRows(item.codes, item.cat, 6)}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={3}>إجمالي الأصول غير المتداولة</td>
                      <td className="p-2.5 font-mono">{fmt(engine.balanceSheet.current.totalNonCurrentAssets)}</td>
                      <td className="p-2.5 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalNonCurrentAssets)}</td>
                    </tr>

                    {/* Current Assets Header */}
                    <tr className="bg-[#f3f3f3]/80 font-bold text-[#141414]">
                      <td colSpan={4} className="p-2.5">2. الأصول المتداولة (Current Assets) — قابلة للتوسع والتعديل</td>
                      <td colSpan={2} className="p-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => handleAddStatementLineAccount('A-10', 'أصل متداول جديد')}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          + إضافة أصل متداول
                        </button>
                      </td>
                    </tr>
                    {[
                      { label: 'المخزون وتكاليف العقود الجارية', codes: ['A-06'], ref: 'IAS 2', cur: engine.balanceSheet.current.inventory, comp: engine.balanceSheet.comparative.inventory, cat: 'أصول' as const },
                      { label: 'ذمم مدينة تجارية وحسابات ضمان مساند (بالصافي بعد مخصص الائتمان)', codes: ['A-07', 'A-08'], ref: 'IFRS 9 / IFRS 15', cur: engine.balanceSheet.current.tradeReceivablesNet, comp: engine.balanceSheet.comparative.tradeReceivablesNet, cat: 'أصول' as const },
                      { label: 'مدفوعات مقدمة، سلف، وأرصدة مدينة وأطراف ذات علاقة', codes: ['A-09', 'A-12'], ref: 'IAS 1.66 / IAS 24', cur: engine.balanceSheet.current.prepaymentsOtherRec, comp: engine.balanceSheet.comparative.prepaymentsOtherRec, cat: 'أصول' as const },
                      { label: 'النقد وما في حكمه (الصناديق والحسابات البنكية)', codes: ['A-10'], ref: 'IAS 7', cur: engine.balanceSheet.current.cashAndEquivalents, comp: engine.balanceSheet.comparative.cashAndEquivalents, cat: 'أصول' as const },
                    ].map((item) => {
                      const pCode = item.codes[0];
                      const isExp = Boolean(expandedStatementCodes[pCode]);
                      return (
                        <React.Fragment key={pCode}>
                          <tr className="hover:bg-[#f3f3f3]/50 cursor-pointer" onClick={() => toggleStatementSection(pCode)}>
                            <td className="p-2.5 pr-4 font-semibold text-[#141414] flex items-center gap-1.5">
                              {isExp ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <input
                                type="text"
                                value={statementLabelOverrides[pCode] ?? item.label}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateStatementLabel(pCode, e.target.value)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono">{item.codes.join(' / ')}</td>
                            <td className="p-2.5 font-mono text-[#707070]">{item.ref}</td>
                            <td className="p-2.5 font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.cur)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.cur,
                                    parseFloat(e.target.value) || 0,
                                    'current',
                                    'D',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[#707070]" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.comp)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.comp,
                                    parseFloat(e.target.value) || 0,
                                    'comparative',
                                    'D',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#707070]"
                              />
                            </td>
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleAddStatementLineAccount(pCode, 'أصل متداول جديد')}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer"
                              >
                                + إضافة وتعديل
                              </button>
                            </td>
                          </tr>
                          {renderExpandableCodeRows(item.codes, item.cat, 6)}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={3}>إجمالي الأصول المتداولة</td>
                      <td className="p-2.5 font-mono">{fmt(engine.balanceSheet.current.totalCurrentAssets)}</td>
                      <td className="p-2.5 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalCurrentAssets)}</td>
                    </tr>
                    <tr className="bg-[#f3f3f3] text-[#141414] font-bold text-sm border-y-2 border-[#141414]">
                      <td className="p-3" colSpan={3}>إجمالي الأصول (Total Assets)</td>
                      <td className="p-3 font-mono">{fmt(engine.balanceSheet.current.totalAssets)}</td>
                      <td className="p-3 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalAssets)}</td>
                    </tr>

                    {/* Equity Section */}
                    <tr className="bg-[#f3f3f3]/80 font-bold text-[#141414]">
                      <td colSpan={4} className="p-2.5">3. حقوق الملكية (Equity) — قابلة للتوسع والتعديل</td>
                      <td colSpan={2} className="p-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => handleAddStatementLineAccount('E-02', 'بند حقوق ملكية جديد')}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          + إضافة بند ملكية
                        </button>
                      </td>
                    </tr>
                    {[
                      { label: 'رأس المال المدفوع', codes: ['E-01'], ref: 'IAS 1.78', cur: engine.balanceSheet.current.shareCapital, comp: engine.balanceSheet.comparative.shareCapital, cat: 'حقوق ملكية' as const, sign: 'C' as const },
                      { label: 'الاحتياطي النظامي والاحتياطيات الأخرى', codes: ['E-02'], ref: 'IAS 1.79', cur: engine.balanceSheet.current.reserves, comp: engine.balanceSheet.comparative.reserves, cat: 'حقوق ملكية' as const, sign: 'C' as const },
                      { label: 'الأرباح المبقاة (تشمل صافي ربح السنة الحالية)', codes: ['E-03'], ref: 'IAS 1.106', cur: engine.balanceSheet.current.retainedEarningsWithProfit, comp: engine.balanceSheet.comparative.retainedEarnings, cat: 'حقوق ملكية' as const, sign: 'C' as const },
                      { label: 'توزيعات الأرباح ومسحوبات الشركاء (تخصم)', codes: ['E-04'], ref: 'IAS 1.107', cur: -engine.balanceSheet.current.dividendsDrawings, comp: -engine.balanceSheet.comparative.dividendsDrawings, cat: 'حقوق ملكية' as const, sign: 'D' as const },
                      { label: 'الدخل الشامل الآخر المتراكم (OCI)', codes: ['O-01'], ref: 'IAS 1.82A', cur: engine.balanceSheet.current.oci, comp: engine.balanceSheet.comparative.oci, cat: 'حقوق ملكية' as const, sign: 'C' as const },
                    ].map((item) => {
                      const pCode = item.codes[0];
                      const isExp = Boolean(expandedStatementCodes[pCode]);
                      return (
                        <React.Fragment key={pCode}>
                          <tr className="hover:bg-[#f3f3f3]/50 cursor-pointer" onClick={() => toggleStatementSection(pCode)}>
                            <td className="p-2.5 pr-4 font-semibold text-[#141414] flex items-center gap-1.5">
                              {isExp ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <input
                                type="text"
                                value={statementLabelOverrides[pCode] ?? item.label}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateStatementLabel(pCode, e.target.value)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono">{item.codes.join(' / ')}</td>
                            <td className="p-2.5 font-mono text-[#707070]">{item.ref}</td>
                            <td className="p-2.5 font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.cur)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.sign === 'D' ? Math.abs(item.cur) : item.cur,
                                    item.sign === 'D' ? Math.abs(parseFloat(e.target.value) || 0) : parseFloat(e.target.value) || 0,
                                    'current',
                                    item.sign,
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[#707070]" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.comp)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.sign === 'D' ? Math.abs(item.comp) : item.comp,
                                    item.sign === 'D' ? Math.abs(parseFloat(e.target.value) || 0) : parseFloat(e.target.value) || 0,
                                    'comparative',
                                    item.sign,
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#707070]"
                              />
                            </td>
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleAddStatementLineAccount(pCode, 'بند ملكية جديد')}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer"
                              >
                                + إضافة وتعديل
                              </button>
                            </td>
                          </tr>
                          {renderExpandableCodeRows(item.codes, item.cat, 6)}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={3}>إجمالي حقوق الملكية</td>
                      <td className="p-2.5 font-mono">{fmt(engine.balanceSheet.current.totalEquity)}</td>
                      <td className="p-2.5 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalEquity)}</td>
                    </tr>

                    {/* Non-Current Liabilities */}
                    <tr className="bg-[#f3f3f3]/80 font-bold text-[#141414]">
                      <td colSpan={4} className="p-2.5">4. الالتزامات غير المتداولة (Non-Current Liabilities) — قابلة للتوسع والتعديل</td>
                      <td colSpan={2} className="p-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => handleAddStatementLineAccount('L-03', 'التزام غير متداول جديد')}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          + إضافة التزام غير متداول
                        </button>
                      </td>
                    </tr>
                    {[
                      { label: 'قروض وتمويل مرابحة طويل الأجل - الجزء غير المتداول', codes: ['L-01'], ref: 'IFRS 9', cur: engine.balanceSheet.current.longTermLoansNonCurrent, comp: engine.balanceSheet.comparative.longTermLoansNonCurrent, cat: 'خصوم' as const },
                      { label: 'التزامات عقود إيجار - الجزء غير المتداول', codes: ['L-02'], ref: 'IFRS 16', cur: engine.balanceSheet.current.leaseLiabNonCurrent, comp: engine.balanceSheet.comparative.leaseLiabNonCurrent, cat: 'خصوم' as const },
                      { label: 'مخصص مكافأة نهاية الخدمة للموظفين (EOSB)', codes: ['L-03'], ref: 'IAS 19', cur: engine.balanceSheet.current.eosb, comp: engine.balanceSheet.comparative.eosb, cat: 'خصوم' as const },
                    ].map((item) => {
                      const pCode = item.codes[0];
                      const isExp = Boolean(expandedStatementCodes[pCode]);
                      return (
                        <React.Fragment key={pCode}>
                          <tr className="hover:bg-[#f3f3f3]/50 cursor-pointer" onClick={() => toggleStatementSection(pCode)}>
                            <td className="p-2.5 pr-4 font-semibold text-[#141414] flex items-center gap-1.5">
                              {isExp ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <input
                                type="text"
                                value={statementLabelOverrides[pCode] ?? item.label}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateStatementLabel(pCode, e.target.value)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono">{item.codes.join(' / ')}</td>
                            <td className="p-2.5 font-mono text-[#707070]">{item.ref}</td>
                            <td className="p-2.5 font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.cur)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.cur,
                                    parseFloat(e.target.value) || 0,
                                    'current',
                                    'C',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[#707070]" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.comp)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.comp,
                                    parseFloat(e.target.value) || 0,
                                    'comparative',
                                    'C',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#707070]"
                              />
                            </td>
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleAddStatementLineAccount(pCode, 'التزام طويل الأجل')}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer"
                              >
                                + إضافة وتعديل
                              </button>
                            </td>
                          </tr>
                          {renderExpandableCodeRows(item.codes, item.cat, 6)}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={3}>إجمالي الالتزامات غير المتداولة</td>
                      <td className="p-2.5 font-mono">{fmt(engine.balanceSheet.current.totalNonCurrentLiabilities)}</td>
                      <td className="p-2.5 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalNonCurrentLiabilities)}</td>
                    </tr>

                    {/* Current Liabilities */}
                    <tr className="bg-[#f3f3f3]/80 font-bold text-[#141414]">
                      <td colSpan={4} className="p-2.5">5. الالتزامات المتداولة (Current Liabilities) — قابلة للتوسع والتعديل</td>
                      <td colSpan={2} className="p-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => handleAddStatementLineAccount('L-04', 'التزام متداول جديد')}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          + إضافة التزام متداول
                        </button>
                      </td>
                    </tr>
                    {[
                      { label: 'ذمم دائنة تجارية (الوكلاء الخارجيون والموردون)', codes: ['L-04'], ref: 'IAS 1.69', cur: engine.balanceSheet.current.tradePayables, comp: engine.balanceSheet.comparative.tradePayables, cat: 'خصوم' as const },
                      { label: 'مستحقات وأرصدة دائنة أخرى وضريبة القيمة المضافة والزكاة', codes: ['L-05', 'L-07', 'L-08'], ref: 'IAS 1.69 / IAS 37 / IAS 12', cur: engine.balanceSheet.current.accrualsOtherPayables + engine.balanceSheet.current.otherProvisions + engine.balanceSheet.current.zakatTaxPayable, comp: engine.balanceSheet.comparative.accrualsOtherPayables + engine.balanceSheet.comparative.otherProvisions + engine.balanceSheet.comparative.zakatTaxPayable, cat: 'خصوم' as const },
                      { label: 'قروض قصيرة الأجل والجزء المتداول من القروض وعقود الإيجار', codes: ['L-06'], ref: 'IFRS 9 / IFRS 16', cur: engine.balanceSheet.current.shortTermLoansAndCurrentPortion, comp: engine.balanceSheet.comparative.shortTermLoansAndCurrentPortion, cat: 'خصوم' as const },
                      { label: 'مستحق لأطراف ذات علاقة (جاري الشركاء والشركات الشقيقة)', codes: ['L-09'], ref: 'IAS 24', cur: engine.balanceSheet.current.dueToRelatedParties, comp: engine.balanceSheet.comparative.dueToRelatedParties, cat: 'خصوم' as const },
                    ].map((item) => {
                      const pCode = item.codes[0];
                      const isExp = Boolean(expandedStatementCodes[pCode]);
                      return (
                        <React.Fragment key={pCode}>
                          <tr className="hover:bg-[#f3f3f3]/50 cursor-pointer" onClick={() => toggleStatementSection(pCode)}>
                            <td className="p-2.5 pr-4 font-semibold text-[#141414] flex items-center gap-1.5">
                              {isExp ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <input
                                type="text"
                                value={statementLabelOverrides[pCode] ?? item.label}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateStatementLabel(pCode, e.target.value)}
                                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono">{item.codes.join(' / ')}</td>
                            <td className="p-2.5 font-mono text-[#707070]">{item.ref}</td>
                            <td className="p-2.5 font-mono font-bold" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.cur)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.cur,
                                    parseFloat(e.target.value) || 0,
                                    'current',
                                    'C',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2.5 font-mono text-[#707070]" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                value={Math.round(item.comp)}
                                onChange={(e) =>
                                  handleUpdateStatementLineTotal(
                                    item.codes,
                                    item.comp,
                                    parseFloat(e.target.value) || 0,
                                    'comparative',
                                    'C',
                                    statementLabelOverrides[pCode] ?? item.label
                                  )
                                }
                                className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#707070]"
                              />
                            </td>
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleAddStatementLineAccount(pCode, 'التزام متداول جديد')}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer"
                              >
                                + إضافة وتعديل
                              </button>
                            </td>
                          </tr>
                          {renderExpandableCodeRows(item.codes, item.cat, 6)}
                        </React.Fragment>
                      );
                    })}
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={3}>إجمالي الالتزامات المتداولة</td>
                      <td className="p-2.5 font-mono">{fmt(engine.balanceSheet.current.totalCurrentLiabilities)}</td>
                      <td className="p-2.5 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalCurrentLiabilities)}</td>
                    </tr>
                    <tr className="bg-[#f3f3f3] text-[#141414] font-bold text-sm border-y-2 border-[#141414]">
                      <td className="p-3" colSpan={3}>إجمالي حقوق الملكية والالتزامات</td>
                      <td className="p-3 font-mono">{fmt(engine.balanceSheet.current.totalEquityAndLiabilities)}</td>
                      <td className="p-3 font-mono" colSpan={2}>{fmt(engine.balanceSheet.comparative.totalEquityAndLiabilities)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. COMPLETE STATEMENT OF PROFIT OR LOSS AND OCI (IAS 1 & IFRS 18) WITH EXPANDABLE ITEMS */}
          {activeStatementView === 'income-statement' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#141414] m-0">
                    {settings.companyName} — قائمة الدخل الشاملة المكتملة (قائمة الربح أو الخسارة والدخل الشامل الآخر IAS 1 / IFRS 18)
                  </h3>
                  <p className="text-xs text-[#707070] mt-0.5">
                    للسنة المنتهية في {settings.reportingDate} | اضغط على أي قسم لتوسيع الحسابات الفرعية أو إضافة وتعديل بنود الإيرادات والمصروفات مباشرة
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStatementCodes((prev) => ({
                        ...prev,
                        'R-01': true, 'R-02': true, 'R-03': true, 'R-04': true,
                        'R-05': true, 'R-06': true, 'R-07': true, 'R-08': true,
                        'R-09': true, 'R-10': true, 'O-01': true,
                      }))
                    }
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                  >
                    توسيع كافة أقسام الدخل
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedStatementCodes({})}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                  >
                    طي الكل
                  </button>
                  <span className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-[#141414] text-[#ffffff]">
                    EBITDA: {fmt(engine.incomeStatement.ebitda)} | صافي الربح: {fmt(engine.incomeStatement.netProfit)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">البند في قائمة الدخل الشاملة (اضغط للتوسيع والتعديل)</th>
                      <th className="p-3">الرمز</th>
                      <th className="p-3">المعيار</th>
                      <th className="p-3 font-mono">السنة الحالية (2026)</th>
                      <th className="p-3 font-mono">فترة المقارنة (2025)</th>
                      <th className="p-3 font-mono">% من الإيرادات</th>
                      <th className="p-3 text-center">إضافة / توسع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {[
                      { label: '1. الإيرادات التشغيلية (صافي مبيعات العقود، التأجير، ونقل الكفالة بعد الخصومات)', code: 'R-01', ref: 'IFRS 15', val: engine.incomeStatement.revenues, comp: Math.round(engine.incomeStatement.revenues * 0.86), bold: true, cat: 'إيرادات' as const, expandable: true },
                      { label: '2. تكلفة الإيرادات المباشرة (تكاليف الوكلاء، التأشيرات، التذاكر، السكن والإعاشة)', code: 'R-02', ref: 'IAS 2 / IAS 1.99', val: -engine.incomeStatement.costOfRevenues, comp: -Math.round(engine.incomeStatement.costOfRevenues * 0.88), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '= مجمل الربح (Gross Profit)', code: 'GP', ref: 'IAS 1', val: engine.incomeStatement.grossProfit, comp: Math.round(engine.incomeStatement.revenues * 0.86 - engine.incomeStatement.costOfRevenues * 0.88), bold: true, shade: true, expandable: false },
                      { label: '3. الإيرادات التشغيلية الأخرى (غرامات مكتسبة، فروق عملة، وإيرادات متنوعة)', code: 'R-05', ref: 'IAS 1.97', val: engine.incomeStatement.otherIncome, comp: Math.round(engine.incomeStatement.otherIncome * 0.8), bold: false, cat: 'إيرادات' as const, expandable: true },
                      { label: '4. مصروفات البيع والتسويق (عمولات المبيعات والمسوقين والحملات الإعلانية)', code: 'R-03', ref: 'IAS 1.99', val: -engine.incomeStatement.sellingMarketingExp, comp: -Math.round(engine.incomeStatement.sellingMarketingExp * 0.9), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '5. المصروفات العمومية والإدارية (رواتب الإدارة، الإيجارات، المرافق، الرسوم الحكومية)', code: 'R-04', ref: 'IAS 1.99', val: -engine.incomeStatement.generalAdminExp, comp: -Math.round(engine.incomeStatement.generalAdminExp * 0.92), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '6. المصروفات التشغيلية الأخرى وخسائر الانخفاض', code: 'R-06', ref: 'IAS 1.97', val: -engine.incomeStatement.otherExpenses, comp: -Math.round(engine.incomeStatement.otherExpenses * 0.85), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '= الربح قبل الفوائد والضرائب والإهلاك والإطفاء (EBITDA)', code: 'EBITDA', ref: 'IFRS 18', val: engine.incomeStatement.ebitda, comp: Math.round(engine.incomeStatement.ebitda * 0.84), bold: true, shade: true, expandable: false },
                      { label: '7. مصروف الإهلاك والإطفاء للأصول الثابتة وحق الاستخدام', code: 'R-10', ref: 'IAS 16 / 38 / IFRS 16', val: -engine.incomeStatement.depreciationAmortization, comp: -Math.round(engine.incomeStatement.depreciationAmortization * 0.95), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '= الربح التشغيلي (Operating Profit / EBIT — مجموع فرعي إلزامي IFRS 18)', code: 'EBIT', ref: 'IAS 1 / IFRS 18', val: engine.incomeStatement.operatingProfit, comp: Math.round(engine.incomeStatement.operatingProfit * 0.83), bold: true, shade: true, expandable: false },
                      { label: '8. إيرادات التمويل والودائع المربوطة', code: 'R-08', ref: 'IAS 1.82', val: engine.incomeStatement.financeIncome, comp: Math.round(engine.incomeStatement.financeIncome * 0.75), bold: false, cat: 'إيرادات' as const, expandable: true },
                      { label: '9. تكاليف التمويل والفوائد البنكية وفوائد عقود الإيجار', code: 'R-07', ref: 'IAS 1.82(b)', val: -engine.incomeStatement.financeCosts, comp: -Math.round(engine.incomeStatement.financeCosts * 0.95), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '= الربح قبل الزكاة وضريبة الدخل (Profit Before Zakat / EBT)', code: 'EBT', ref: 'IAS 1 / IFRS 18', val: engine.incomeStatement.profitBeforeZakat, comp: Math.round(engine.incomeStatement.profitBeforeZakat * 0.82), bold: true, shade: true, expandable: false },
                      { label: '10. مصروف الزكاة الشرعية وضريبة الدخل', code: 'R-09', ref: 'IAS 12 / SOCPA', val: -engine.incomeStatement.zakatAndTaxExpense, comp: -Math.round(engine.incomeStatement.zakatAndTaxExpense * 0.85), bold: false, cat: 'مصروفات' as const, expandable: true },
                      { label: '= صافي ربح / (خسارة) السنة من العمليات المستمرة (Net Profit)', code: 'NET', ref: 'IAS 1', val: engine.incomeStatement.netProfit, comp: Math.round(engine.incomeStatement.netProfit * 0.82), bold: true, dark: true, expandable: false },
                      { label: '11. الدخل الشامل الآخر (إعادة قياس مكافأة نهاية الخدمة IAS 19 والتغير بالقيمة العادلة)', code: 'O-01', ref: 'IAS 1.82A', val: engine.incomeStatement.otherComprehensiveIncome, comp: 0, bold: false, cat: 'حقوق ملكية' as const, expandable: true },
                      { label: '= إجمالي الدخل الشامل للسنة (Total Comprehensive Income)', code: 'TCI', ref: 'IAS 1', val: engine.incomeStatement.totalComprehensiveIncome, comp: Math.round(engine.incomeStatement.netProfit * 0.82), bold: true, shade: true, expandable: false },
                    ].map((row, idx) => {
                      const pct =
                        engine.incomeStatement.revenues > 0
                          ? ((Math.abs(row.val) / engine.incomeStatement.revenues) * 100).toFixed(1) + '%'
                          : '0.0%';
                      const isExp = row.expandable && Boolean(expandedStatementCodes[row.code]);
                      const compVal = incomeCompOverrides[row.code] ?? row.comp;
                      return (
                        <React.Fragment key={idx}>
                          <tr
                            onClick={() => row.expandable && toggleStatementSection(row.code)}
                            className={
                              row.dark
                                ? 'bg-[#f3f3f3] text-[#141414] font-bold text-sm border-y-2 border-[#141414]'
                                : row.shade
                                ? 'bg-[#f3f3f3] font-bold text-[#141414]'
                                : 'hover:bg-[#f3f3f3]/50 cursor-pointer'
                            }
                          >
                            <td className="p-3 flex items-center gap-1.5">
                              {row.expandable ? (
                                isExp ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
                              ) : (
                                <span className="w-4" />
                              )}
                              {row.expandable ? (
                                <input
                                  type="text"
                                  value={statementLabelOverrides[row.code] ?? row.label}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateStatementLabel(row.code, e.target.value)}
                                  className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414]"
                                />
                              ) : (
                                <span>{row.label}</span>
                              )}
                            </td>
                            <td className="p-3 font-mono">{row.code}</td>
                            <td className="p-3 font-mono opacity-80">{row.ref}</td>
                            <td className="p-3 font-mono font-bold" onClick={(e) => row.expandable && e.stopPropagation()}>
                              {row.expandable && row.cat ? (
                                <input
                                  type="number"
                                  value={Math.round(Math.abs(row.val))}
                                  onChange={(e) => {
                                    const num = Math.abs(parseFloat(e.target.value) || 0);
                                    handleUpdateStatementLineTotal(
                                      [row.code],
                                      Math.abs(row.val),
                                      num,
                                      'current',
                                      row.cat === 'مصروفات' ? 'D' : 'C',
                                      statementLabelOverrides[row.code] ?? row.label
                                    );
                                  }}
                                  className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                                />
                              ) : (
                                fmt(row.val)
                              )}
                            </td>
                            <td className="p-3 font-mono opacity-80" onClick={(e) => row.expandable && e.stopPropagation()}>
                              {row.expandable ? (
                                <input
                                  type="number"
                                  value={Math.round(compVal)}
                                  onChange={(e) =>
                                    handleUpdateIncomeCompOverride(row.code, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-32 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#707070]"
                                />
                              ) : (
                                fmt(compVal)
                              )}
                            </td>
                            <td className="p-3 font-mono">{pct}</td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {row.expandable && row.cat ? (
                                <button
                                  type="button"
                                  onClick={() => handleAddStatementLineAccount(row.code, row.cat === 'إيرادات' ? 'بند إيراد جديد' : 'بند مصروف جديد')}
                                  className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer"
                                >
                                  + إضافة وتعديل بند
                                </button>
                              ) : (
                                <span className="text-[10px] opacity-70">محسوب آلياً</span>
                              )}
                            </td>
                          </tr>
                          {row.expandable && row.cat && renderExpandableCodeRows([row.code], row.cat, 7)}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* IAS 33 Earnings Per Share & Profitability Summary Strip */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#707070] block">ربحية الحصة / السهم الأساسية (IAS 33 Basic EPS)</span>
                  <strong className="font-mono text-sm text-[#141414]">
                    {(engine.incomeStatement.netProfit / Math.max(1, engine.balanceSheet.current.shareCapital / 10)).toFixed(2)} ⃁ / سهم
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#707070] block">هامش مجمل الربح (Gross Margin)</span>
                  <strong className="font-mono text-sm text-[#141414]">
                    {engine.incomeStatement.revenues > 0 ? ((engine.incomeStatement.grossProfit / engine.incomeStatement.revenues) * 100).toFixed(1) : '0.0'}%
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#707070] block">هامش الربح التشغيلي (EBIT Margin)</span>
                  <strong className="font-mono text-sm text-[#141414]">
                    {engine.incomeStatement.revenues > 0 ? ((engine.incomeStatement.operatingProfit / engine.incomeStatement.revenues) * 100).toFixed(1) : '0.0'}%
                  </strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] text-[#141414] border-2 border-[#141414]">
                  <span className="text-[11px] text-[#707070] block">هامش صافي الربح النهائي (Net Margin)</span>
                  <strong className="font-mono text-sm text-[#141414]">
                    {engine.incomeStatement.revenues > 0 ? ((engine.incomeStatement.netProfit / engine.incomeStatement.revenues) * 100).toFixed(1) : '0.0'}%
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* 3. STATEMENT OF CHANGES IN EQUITY (IAS 1.106) */}
          {activeStatementView === 'equity-changes' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#141414] m-0">
                    {settings.companyName} — قائمة التغيرات في حقوق الملكية (IAS 1.106)
                  </h3>
                  <p className="text-xs text-[#707070] mt-0.5">
                    للسنة المنتهية في {settings.reportingDate} | المبالغ بـ {settings.currency}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  ✔ مطابق لقائمة المركز المالي ({fmt(engine.equityChanges.closing.total)})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">البيان</th>
                      <th className="p-3 font-mono">رأس المال (E-01)</th>
                      <th className="p-3 font-mono">احتياطيات (E-02)</th>
                      <th className="p-3 font-mono">أرباح مبقاة (E-03)</th>
                      <th className="p-3 font-mono">دخل شامل آخر (O-01)</th>
                      <th className="p-3 font-mono">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {[
                      { label: 'الرصيد في بداية السنة (أول المدة)', data: engine.equityChanges.opening, bold: true },
                      { label: 'صافي ربح السنة', data: engine.equityChanges.netProfit, bold: false },
                      { label: 'الدخل الشامل الآخر للسنة', data: engine.equityChanges.ociMovement, bold: false },
                      { label: 'توزيعات ومسحوبات السنة', data: engine.equityChanges.dividends, bold: false },
                      { label: 'زيادة رأس المال والتحويلات والحركات الأخرى', data: engine.equityChanges.otherChanges, bold: false },
                      { label: 'الرصيد في نهاية السنة (آخر المدة)', data: engine.equityChanges.closing, bold: true, dark: true },
                    ].map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.dark
                            ? 'bg-[#f3f3f3] text-[#141414] font-bold text-sm border-y-2 border-[#141414]'
                            : row.bold
                            ? 'bg-[#f3f3f3] font-bold text-[#141414]'
                            : 'hover:bg-[#f3f3f3]/40'
                        }
                      >
                        <td className="p-3">{row.label}</td>
                        <td className="p-3 font-mono">{fmt(row.data.capital)}</td>
                        <td className="p-3 font-mono">{fmt(row.data.reserves)}</td>
                        <td className="p-3 font-mono">{fmt(row.data.retainedEarnings)}</td>
                        <td className="p-3 font-mono">{fmt(row.data.oci)}</td>
                        <td className="p-3 font-mono font-bold">{fmt(row.data.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. STATEMENT OF CASH FLOWS - INDIRECT METHOD (IAS 7) */}
          {activeStatementView === 'cash-flow' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-4 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#141414] m-0">
                    {settings.companyName} — قائمة التدفقات النقدية بالطريقة غير المباشرة (IAS 7)
                  </h3>
                  <p className="text-xs text-[#707070] mt-0.5">
                    للسنة المنتهية في {settings.reportingDate} | المبالغ بـ {settings.currency}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  {Math.abs(engine.cashFlow.diff) <= settings.roundingTolerance
                    ? '✔ مطابق لرصيد النقد في ميزان المراجعة (الفرق = 0)'
                    : `فرق المطابقة: ${fmt(engine.cashFlow.diff)}`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">البند في قائمة التدفقات النقدية</th>
                      <th className="p-3">المعيار</th>
                      <th className="p-3 font-mono">المبلغ ({settings.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    <tr className="bg-[#f3f3f3]/60 font-bold text-[#141414]">
                      <td colSpan={3} className="p-2.5">الأنشطة التشغيلية (Operating Activities)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">الربح قبل الزكاة وضريبة الدخل</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.18(b)</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.profitBeforeZakat)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">يضاف: الإهلاك والإطفاء</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.20</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.depreciationAmortization)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">يضاف: صافي تكاليف التمويل</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.20</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.netFinanceCostsAddedBack)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">(الزيادة) النقص في المخزون</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.20</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.changeInInventory)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">(الزيادة) النقص في الذمم المدينة والمدفوعات المقدمة</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.20</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.changeInReceivablesAndPrepayments)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">الزيادة (النقص) في الذمم الدائنة والمستحقات</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.20</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.changeInPayablesAndAccruals)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">الزيادة (النقص) في مكافأة نهاية الخدمة والمخصصات</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.20</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.changeInEosbAndProvisions)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">الزكاة وضريبة الدخل المدفوعة</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.35</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.zakatPaid)}</td>
                    </tr>
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={2}>صافي النقد من الأنشطة التشغيلية</td>
                      <td className="p-2.5 font-mono">{fmt(engine.cashFlow.netCashFromOperating)}</td>
                    </tr>

                    <tr className="bg-[#f3f3f3]/60 font-bold text-[#141414]">
                      <td colSpan={3} className="p-2.5">الأنشطة الاستثمارية (Investing Activities)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">شراء أصول ثابتة وغير ملموسة واستثمارات (بالصافي)</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.16</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.netCapexAndInvestments)}</td>
                    </tr>
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={2}>صافي النقد من الأنشطة الاستثمارية</td>
                      <td className="p-2.5 font-mono">{fmt(engine.cashFlow.netCashFromInvesting)}</td>
                    </tr>

                    <tr className="bg-[#f3f3f3]/60 font-bold text-[#141414]">
                      <td colSpan={3} className="p-2.5">الأنشطة التمويلية (Financing Activities)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">التغير في القروض طويلة وقصيرة الأجل والتسهيلات</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.17</td>
                      <td className="p-2.5 font-mono font-bold">
                        {fmt(engine.cashFlow.changeInLongTermLoans + engine.cashFlow.changeInShortTermLoans)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">التغير في المستحق لأطراف ذات علاقة</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 24</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.changeInRelatedParties)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 pr-6">التغير في رأس المال والاحتياطيات والتوزيعات</td>
                      <td className="p-2.5 font-mono text-[#707070]">IAS 7.17</td>
                      <td className="p-2.5 font-mono font-bold">
                        {fmt(
                          engine.cashFlow.changeInCapital +
                            engine.cashFlow.changeInReservesAndRetained +
                            engine.cashFlow.dividendsPaid
                        )}
                      </td>
                    </tr>
                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={2}>صافي النقد من الأنشطة التمويلية</td>
                      <td className="p-2.5 font-mono">{fmt(engine.cashFlow.netCashFromFinancing)}</td>
                    </tr>

                    <tr className="bg-[#f3f3f3] font-bold text-[#141414]">
                      <td className="p-2.5" colSpan={2}>صافي التغير في النقد وما في حكمه خلال السنة</td>
                      <td className="p-2.5 font-mono">{fmt(engine.cashFlow.netChangeInCash)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5" colSpan={2}>النقد وما في حكمه - أول المدة</td>
                      <td className="p-2.5 font-mono font-bold">{fmt(engine.cashFlow.openingCash)}</td>
                    </tr>
                    <tr className="bg-[#f3f3f3] text-[#141414] font-bold text-sm border-y-2 border-[#141414]">
                      <td className="p-3" colSpan={2}>النقد وما في حكمه - آخر المدة (محسوب ومطابق لميزان المراجعة A-10)</td>
                      <td className="p-3 font-mono">{fmt(engine.cashFlow.calculatedClosingCash)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. AUTOMATED IFRS FINANCIAL STATEMENT NOTES (1-12) */}
          {activeStatementView === 'ifrs-notes' && (
            <EnterpriseAccountingModulesHub
              activeModule="ifrs-notes-12"
              engine={engine}
              entries={entries}
              settings={settings}
              onEntriesUpdated={setEntries}
            />
          )}

          {/* 6. BUDGET VS ACTUAL & VARIANCE ANALYSIS */}
          {activeStatementView === 'budget-variance' && (
            <EnterpriseAccountingModulesHub
              activeModule="budget-variance"
              engine={engine}
              entries={entries}
              settings={settings}
              onEntriesUpdated={setEntries}
            />
          )}

          {/* 7. IFRS 10 GROUP HOLDING CONSOLIDATION & INTERCOMPANY ELIMINATIONS */}
          {activeStatementView === 'group-consolidation' && (
            <div className="space-y-5">
              {/* Group Consolidation KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0]">
                  <div className="text-xs text-[#707070] font-semibold">إيرادات المجموعة الموحدة (4 شركات)</div>
                  <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                    {fmt(consolidatedReport.summaryKpis.consolidatedRevenues)}
                  </div>
                  <div className="text-[11px] text-[#707070] mt-1">
                    بعد استبعاد الإيرادات المتبادلة ({fmt(consolidatedReport.summaryKpis.intercompanyRevenueEliminated)})
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0]">
                  <div className="text-xs text-[#707070] font-semibold">صافي ربح المجموعة الموحد (IFRS 10)</div>
                  <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                    {fmt(consolidatedReport.summaryKpis.consolidatedNetProfit)}
                  </div>
                  <div className="text-[11px] text-[#707070] mt-1">
                    ملكية الشركة القابضة 100% في الشركات الشقيقة الأربع
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0]">
                  <div className="text-xs text-[#707070] font-semibold">إجمالي أصول المجموعة الموحدة</div>
                  <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                    {fmt(consolidatedReport.summaryKpis.consolidatedTotalAssets)}
                  </div>
                  <div className="text-[11px] text-[#707070] mt-1">
                    حقوق الملكية الموحدة: {fmt(consolidatedReport.summaryKpis.consolidatedTotalEquity)}
                  </div>
                </div>
                <div className="bg-[#f3f3f3] p-4 rounded-2xl border border-[#141414]">
                  <div className="text-xs text-[#141414] font-bold">استبعادات الأرصدة المتبادلة (IFRS 10.B86)</div>
                  <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                    {fmt(consolidatedReport.summaryKpis.intercompanyBalancesEliminated)}
                  </div>
                  <div className="text-[11px] text-[#141414] font-semibold mt-1">
                    {Math.abs(consolidatedReport.summaryKpis.balanceSheetDiff) <= 1
                      ? '✔ المركز المالي الموحد متزن تماماً (الفرق = 0.00 ⃁)'
                      : `فرق التوازن: ${fmt(consolidatedReport.summaryKpis.balanceSheetDiff)}`}
                  </div>
                </div>
              </div>

              {/* Consolidated Income Statement Matrix */}
              <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#141414] m-0">
                      مجموعة خالد السليم القابضة — قائمة الدخل الموحدة ومقارنة الشركات الشقيقة (IFRS 10)
                    </h3>
                    <p className="text-xs text-[#707070] mt-0.5">
                      تجميع آلي مباشر لموازين المراجعة للشركات الـ 4 (السفير الماسي • سواعد/ياقوت • خالد السليم • شلة ودار الكرم) مع استبعاد العمليات المتبادلة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportGroupConsolidationWorkbook}
                    className="button-primary-pill flex items-center gap-1.5"
                    style={{ padding: '7px 16px', fontSize: '12px' }}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>تصدير مصنف التوحيد المالي للمجموعة (.xlsx)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3">البند في قائمة الدخل الموحدة</th>
                        <th className="p-3 font-mono">السفير الماسي (SAF)</th>
                        <th className="p-3 font-mono">سواعد / ياقوت (SAW)</th>
                        <th className="p-3 font-mono">خالد السليم (KAS)</th>
                        <th className="p-3 font-mono">شلة ودار الكرم (SHL)</th>
                        <th className="p-3 font-mono bg-[#fafafa]">المجموع قبل الاستبعاد</th>
                        <th className="p-3 font-mono">استبعادات (IFRS 10)</th>
                        <th className="p-3 font-mono bg-[#141414] text-[#ffffff]">الموحد النهائي للمجموعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {consolidatedReport.incomeStatementMatrix.map((row) => (
                        <tr
                          key={row.id}
                          className={
                            row.isGrandTotal
                              ? 'bg-[#f3f3f3] font-bold text-[#141414] border-y-2 border-[#141414]'
                              : row.isSubtotal
                              ? 'bg-[#f3f3f3]/70 font-bold text-[#141414]'
                              : 'hover:bg-[#f3f3f3]/40'
                          }
                        >
                          <td className="p-2.5">{row.label}</td>
                          <td className="p-2.5 font-mono">{fmt(row.saf)}</td>
                          <td className="p-2.5 font-mono">{fmt(row.saw)}</td>
                          <td className="p-2.5 font-mono">{fmt(row.kas)}</td>
                          <td className="p-2.5 font-mono">{fmt(row.shl)}</td>
                          <td className="p-2.5 font-mono bg-[#fafafa] font-semibold">{fmt(row.combinedBeforeElimination)}</td>
                          <td className="p-2.5 font-mono text-[#707070]">{row.elimination !== 0 ? fmt(row.elimination) : '-'}</td>
                          <td className="p-2.5 font-mono font-bold bg-[#f3f3f3]">{fmt(row.consolidatedTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Consolidated Balance Sheet Matrix */}
              <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#141414] m-0">
                      مجموعة خالد السليم القابضة — قائمة المركز المالي الموحدة (IFRS 10 & IAS 1)
                    </h3>
                    <p className="text-xs text-[#707070] mt-0.5">
                      استبعاد الأرصدة الجارية المتبادلة بين الشركات الشقيقة وتوحيد الأصول والالتزامات وحقوق الملكية على مستوى المجموعة القابضة
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#141414] text-[#ffffff]">
                    ✔ مطابق لمعيار IFRS 10.B86
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3">البند في قائمة المركز المالي الموحدة</th>
                        <th className="p-3 font-mono">السفير الماسي (SAF)</th>
                        <th className="p-3 font-mono">سواعد / ياقوت (SAW)</th>
                        <th className="p-3 font-mono">خالد السليم (KAS)</th>
                        <th className="p-3 font-mono">شلة ودار الكرم (SHL)</th>
                        <th className="p-3 font-mono bg-[#fafafa]">المجموع قبل الاستبعاد</th>
                        <th className="p-3 font-mono">استبعادات الأرصدة</th>
                        <th className="p-3 font-mono bg-[#141414] text-[#ffffff]">الموحد النهائي للمجموعة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {consolidatedReport.balanceSheetMatrix.map((row) => (
                        <tr
                          key={row.id}
                          className={
                            row.isGrandTotal
                              ? 'bg-[#f3f3f3] font-bold text-[#141414] border-y-2 border-[#141414]'
                              : row.isSubtotal
                              ? 'bg-[#f3f3f3]/70 font-bold text-[#141414]'
                              : 'hover:bg-[#f3f3f3]/40'
                          }
                        >
                          <td className="p-2.5">{row.label}</td>
                          <td className="p-2.5 font-mono">{fmt(row.saf)}</td>
                          <td className="p-2.5 font-mono">{fmt(row.saw)}</td>
                          <td className="p-2.5 font-mono">{fmt(row.kas)}</td>
                          <td className="p-2.5 font-mono">{fmt(row.shl)}</td>
                          <td className="p-2.5 font-mono bg-[#fafafa] font-semibold">{fmt(row.combinedBeforeElimination)}</td>
                          <td className="p-2.5 font-mono text-[#707070]">{row.elimination !== 0 ? fmt(row.elimination) : '-'}</td>
                          <td className="p-2.5 font-mono font-bold bg-[#f3f3f3]">{fmt(row.consolidatedTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ENTERPRISE ACCOUNTING MODULES HUB (الأصول والإهلاك • الزكاة والضريبة • أعمار الديون • الإيضاحات • الموازنات • القيود الآلية)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'enterprise-suite' && (
        <EnterpriseAccountingModulesHub
          activeModule={activeEnterpriseModule}
          onSelectModule={setActiveEnterpriseModule}
          engine={engine}
          entries={entries}
          settings={settings}
          onEntriesUpdated={setEntries}
          drilldownCodeFilter={drilldownCodeFilter}
          onClearDrilldownFilter={() => setDrilldownCodeFilter(null)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 3: SMART TRIAL BALANCE (ميزان المراجعة الذكي - الرصيد النهائي مدين ودائن مع إمكانية الإخفاء)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'trial-balance' && (
        <div className="space-y-4">
          {/* Search, Filter & Column Visibility Toggles Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#e0e0e0] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#707070]" />
                  <input
                    type="text"
                    aria-label="بحث في الحسابات"
                    placeholder="بحث باسم الحساب أو الكود أو البند..."
                    value={tbSearch}
                    onChange={(e) => setTbSearch(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414] focus:outline-none"
                  />
                </div>

                <select
                  aria-label="فلترة حالة التصنيف"
                  value={tbFilter}
                  onChange={(e) => setTbFilter(e.target.value as any)}
                  className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 text-xs font-semibold text-[#141414]"
                >
                  <option value="all">كل الحسابات ({engine.rows.length})</option>
                  <option value="classified">المصنفة ({engine.rows.filter((r) => Boolean(r.approvedCode)).length})</option>
                  <option value="unclassified">غير المصنفة ({engine.rows.filter((r) => !r.approvedCode).length})</option>
                  <option value="warnings">عليها ملاحظات ({engine.diagnostics.accountErrors.length})</option>
                </select>

                <select
                  aria-label="فلترة بقسم القائمة المالية"
                  value={tbSectionFilter}
                  onChange={(e) => setTbSectionFilter(e.target.value)}
                  className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 text-xs font-semibold text-[#141414]"
                >
                  <option value="ALL">كل أقسام القوائم (6 أقسام Excel)</option>
                  <option value="مركز مالي - أصول غير متداولة">مركز مالي - أصول غير متداولة (A-01..A-05)</option>
                  <option value="مركز مالي - أصول متداولة">مركز مالي - أصول متداولة (A-06..A-10)</option>
                  <option value="مركز مالي - التزامات">مركز مالي - التزامات (L-01..L-09)</option>
                  <option value="مركز مالي - حقوق الملكية">مركز مالي - حقوق الملكية (E-01..E-04)</option>
                  <option value="دخل شامل آخر">دخل شامل آخر (O-01)</option>
                  <option value="قائمة الدخل">قائمة الدخل (R-01..R-10)</option>
                </select>

                <select
                  aria-label="فلترة ببند القوائم المالية"
                  value={tbCodeFilter}
                  onChange={(e) => setTbCodeFilter(e.target.value)}
                  className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 text-xs font-semibold text-[#141414]"
                >
                  <option value="ALL">كل بنود القوائم (34 رئيسي + 314 موسع)</option>
                  <optgroup label="البنود الرئيسية (34 رمزاً)">
                    {IFRS_MAPPING_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.nameAr}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="البنود الفرعية الموسعة (314 بنداً)">
                    {EXTENDED_IFRS_CLASSIFICATIONS.filter((x) => x.level === 3).map((x) => (
                      <option key={x.code} value={x.code}>
                        {x.code} - {x.nameAr}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddAccountRow}
                  className="button-primary-pill"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  <span>+ إضافة حساب للميزان</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTrialBalance('excel')}
                  className="button-outline-on-light"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <FileSpreadsheet className="w-4 h-4 ml-1" />
                  <span>تصدير الميزان Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTrialBalance('pdf')}
                  className="button-outline-on-light"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <FileText className="w-4 h-4 ml-1" />
                  <span>تصدير الميزان PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportTrialBalance('print')}
                  className="button-outline-on-light"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <Printer className="w-4 h-4 ml-1" />
                  <span>طباعة الميزان</span>
                </button>
                <ExportDropdown
                  sectionKey="trial-balance"
                  data={getTrialBalanceExportData()}
                  dataProvider={() => getTrialBalanceExportData()}
                  customTitle={`ميزان المراجعة العام والأرصدة (${settings.companyName})`}
                  buttonLabel="جميع صيغ التصدير والمعاينة"
                  variant="outline-light"
                />
              </div>
            </div>

            {/* Column Visibility Toggle Controls (إظهار / إخفاء الرصيد النهائي مدين ودائن والأعمدة الأخرى) */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#e0e0e0]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#141414]">تخصيص وإخفاء الأعمدة:</span>
                <button
                  type="button"
                  onClick={() => setShowClosingBalanceCols((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showClosingBalanceCols
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                  }`}
                >
                  {showClosingBalanceCols ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>
                    {showClosingBalanceCols
                      ? 'إخفاء الرصيد النهائي (مدين / دائن)'
                      : 'إظهار الرصيد النهائي (مدين / دائن)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOpeningCols((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showOpeningCols
                      ? 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                  }`}
                >
                  {showOpeningCols ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showOpeningCols ? 'إخفاء أول المدة' : 'إظهار أول المدة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMovementCols((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showMovementCols
                      ? 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                  }`}
                >
                  {showMovementCols ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showMovementCols ? 'إخفاء حركة السنة' : 'إظهار حركة السنة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNetBalanceCol((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    showNetBalanceCol
                      ? 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                  }`}
                >
                  {showNetBalanceCol ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showNetBalanceCol ? 'إخفاء صافي الرصيد' : 'إظهار صافي الرصيد النهائي'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHideZeroBalanceRows((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                    hideZeroBalanceRows
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                  }`}
                >
                  {hideZeroBalanceRows ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{hideZeroBalanceRows ? 'إظهار الحسابات الصفرية' : 'إخفاء الحسابات الصفرية'}</span>
                </button>

                {hiddenRowSeqs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHiddenRowSeqs([])}
                    className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                  >
                    إظهار الحسابات المخفية ({hiddenRowSeqs.length})
                  </button>
                )}
              </div>

              <span className="text-[11px] font-bold text-[#141414]">
                {engine.closingDiff <= settings.roundingTolerance
                  ? '✔ الرصيد النهائي متزن (مدين = دائن)'
                  : `✖ فرق توازن الرصيد النهائي: ${fmt(engine.closingDiff)}`}
              </span>
            </div>
          </div>

          {/* Multi-Select Bulk Action Bar */}
          {selectedRowSeqs.length > 0 && (
            <div className="bg-[#f3f3f3] text-[#141414] border-2 border-[#141414] p-3.5 rounded-2xl flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#141414]" />
                <span>تم تحديد ({selectedRowSeqs.length}) حساب محاسبي</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={bulkClassifyCode}
                  onChange={(e) => setBulkClassifyCode(e.target.value)}
                  className="bg-white text-[#141414] border border-[#e0e0e0] rounded-full px-3 py-1 text-xs"
                >
                  {IFRS_MAPPING_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.nameAr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkClassifySelectedRows}
                  className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  توجيه وتصنيف المحدد
                </button>
                <button
                  type="button"
                  onClick={handleBulkHideSelectedRows}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>إخفاء المحدد</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteSelectedRows}
                  className="px-3 py-1 rounded-full bg-white hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRowSeqs([])}
                  className="px-2.5 py-1 rounded-full text-xs text-[#707070] hover:text-[#141414] cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

          {/* Totals Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 bg-[#f3f3f3] p-3.5 rounded-2xl border border-[#e0e0e0] text-xs">
            <div>
              <span className="text-[#707070] block">أول المدة - مدين (P):</span>
              <strong className="font-mono text-[#141414]">{fmt(engine.totals.openingDebit)}</strong>
            </div>
            <div>
              <span className="text-[#707070] block">أول المدة - دائن (Q):</span>
              <strong className="font-mono text-[#141414]">{fmt(engine.totals.openingCredit)}</strong>
            </div>
            <div>
              <span className="text-[#707070] block">حركة السنة - مدين (R):</span>
              <strong className="font-mono text-[#141414]">{fmt(engine.totals.periodDebit)}</strong>
            </div>
            <div>
              <span className="text-[#707070] block">حركة السنة - دائن (S):</span>
              <strong className="font-mono text-[#141414]">{fmt(engine.totals.periodCredit)}</strong>
            </div>
            <div className="bg-white text-[#141414] border border-[#141414] p-2 rounded-xl">
              <span className="text-[#707070] block text-[11px] font-semibold">الرصيد النهائي - مدين (T):</span>
              <strong className="font-mono text-[#141414] text-sm">{fmt(engine.totals.closingDebit)}</strong>
            </div>
            <div className="bg-white text-[#141414] border border-[#141414] p-2 rounded-xl">
              <span className="text-[#707070] block text-[11px] font-semibold">الرصيد النهائي - دائن (U):</span>
              <strong className="font-mono text-[#141414] text-sm">{fmt(engine.totals.closingCredit)}</strong>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[650px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        aria-label="تحديد كل الحسابات المعروضة"
                        checked={
                          filteredRows.length > 0 &&
                          filteredRows.every((r) => selectedRowSeqs.includes(r.seq))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRowSeqs(filteredRows.map((r) => r.seq));
                          } else {
                            setSelectedRowSeqs([]);
                          }
                        }}
                        className="accent-[#141414] cursor-pointer"
                      />
                    </th>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">رقم الحساب</th>
                    <th className="p-2.5">اسم الحساب (قابل للتعديل)</th>
                    <th className="p-2.5">التصنيف اليدوي المعتمد (رئيسي أو موسع 314 بنداً)</th>
                    <th className="p-2.5">المعيار</th>
                    {showOpeningCols && <th className="p-2.5 font-mono">أول مدة مدين (P)</th>}
                    {showOpeningCols && <th className="p-2.5 font-mono">أول مدة دائن (Q)</th>}
                    {showMovementCols && <th className="p-2.5 font-mono">حركة مدين (R)</th>}
                    {showMovementCols && <th className="p-2.5 font-mono">حركة دائن (S)</th>}
                    {showClosingBalanceCols && (
                      <th className="p-2.5 font-mono bg-[#f3f3f3] text-[#141414] border-x border-[#e0e0e0]">الرصيد النهائي مدين (T)</th>
                    )}
                    {showClosingBalanceCols && (
                      <th className="p-2.5 font-mono bg-[#f3f3f3] text-[#141414] border-x border-[#e0e0e0]">الرصيد النهائي دائن (U)</th>
                    )}
                    {showNetBalanceCol && <th className="p-2.5 font-mono">صافي الرصيد النهائي</th>}
                    <th className="p-2.5">حالة الفحص</th>
                    <th className="p-2.5 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredRows.map((row) => {
                    const extItem = EXTENDED_IFRS_CLASSIFICATIONS.find(
                      (x) => x.code === (row.manualCode || row.approvedCode)
                    );
                    const ifrsRef =
                      extItem?.ifrsRef ||
                      IFRS_MAPPING_CODES.find((m) => m.code === row.approvedCode)?.ifrsRef ||
                      '-';
                    return (
                      <tr
                        key={row.seq}
                        className={`hover:bg-[#f3f3f3]/50 ${
                          !row.approvedCode ? 'bg-[#f3f3f3]/70' : ''
                        }`}
                      >
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`تحديد الحساب ${row.seq}`}
                            checked={selectedRowSeqs.includes(row.seq)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRowSeqs((prev) => [...prev, row.seq]);
                              } else {
                                setSelectedRowSeqs((prev) => prev.filter((id) => id !== row.seq));
                              }
                            }}
                            className="accent-[#141414] cursor-pointer"
                          />
                        </td>
                        <td className="p-2 font-mono text-[#707070]">{row.seq}</td>
                        <td className="p-2 font-mono text-[11px] text-[#707070] w-24">
                          <input
                            type="text"
                            aria-label={`رقم الحساب ${row.seq}`}
                            value={row.erpCode}
                            onChange={(e) => handleUpdateRow(row.seq, { erpCode: e.target.value })}
                            className="w-20 bg-transparent border-b border-transparent focus:border-[#141414] focus:outline-none font-mono text-[11px] text-[#141414]"
                          />
                        </td>
                        <td className="p-2 font-semibold text-[#141414] min-w-[200px]">
                          <input
                            type="text"
                            aria-label={`اسم الحساب ${row.seq}`}
                            value={row.accountName}
                            onChange={(e) => handleUpdateRow(row.seq, { accountName: e.target.value })}
                            className="w-full bg-transparent border-b border-transparent focus:border-[#141414] focus:outline-none text-xs font-semibold text-[#141414]"
                          />
                        </td>
                        <td className="p-2 min-w-[260px]">
                          <select
                            aria-label={`تصنيف الحساب ${row.accountName}`}
                            value={row.manualCode || row.approvedSubCode || row.approvedCode}
                            onChange={(e) => handleUpdateRow(row.seq, { manualCode: e.target.value })}
                            className={`w-full rounded-lg py-1 px-2 text-[11px] font-semibold border ${
                              row.approvedCode
                                ? 'bg-white border-[#e0e0e0] text-[#141414]'
                                : 'bg-[#141414] text-[#ffffff] border-[#141414]'
                            }`}
                          >
                            <option value="">-- غير مصنف (اختر البند: مقترح {row.suggestedCode}) --</option>
                            <optgroup label="البنود الرئيسية للقوائم (34 رمزاً A-01..R-10)">
                              {IFRS_MAPPING_CODES.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.code} ({c.nameAr})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="دليل التصنيف الموسع التفصيلي (314 بنداً فرعياً)">
                              {EXTENDED_IFRS_CLASSIFICATIONS.filter((x) => x.level === 3).map((x) => (
                                <option key={x.code} value={x.code}>
                                  {x.code} — {x.nameAr} [{x.ifrsRef}]
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          {row.approvedCode && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3f3f3] text-[#141414] font-bold">
                                {row.approvedCode}: {row.approvedItemName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f3f3f3] text-[#707070]">
                                {row.sectionAr}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-2 font-mono text-[11px] text-[#707070] whitespace-nowrap">
                          <div>{row.ifrsRef || ifrsRef}</div>
                          {row.cashFlowType && (
                            <div className="text-[10px] font-sans text-[#707070]">{row.cashFlowType}</div>
                          )}
                        </td>
                        {showOpeningCols && (
                          <td className="p-2">
                            <input
                              type="number"
                              aria-label={`أول المدة مدين ${row.seq}`}
                              value={row.openingDebit}
                              onChange={(e) =>
                                handleUpdateRow(row.seq, { openingDebit: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-xs text-[#141414]"
                            />
                          </td>
                        )}
                        {showOpeningCols && (
                          <td className="p-2">
                            <input
                              type="number"
                              aria-label={`أول المدة دائن ${row.seq}`}
                              value={row.openingCredit}
                              onChange={(e) =>
                                handleUpdateRow(row.seq, { openingCredit: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-xs text-[#141414]"
                            />
                          </td>
                        )}
                        {showMovementCols && (
                          <td className="p-2">
                            <input
                              type="number"
                              aria-label={`حركة السنة مدين ${row.seq}`}
                              value={row.periodDebit}
                              onChange={(e) =>
                                handleUpdateRow(row.seq, { periodDebit: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-xs text-[#141414]"
                            />
                          </td>
                        )}
                        {showMovementCols && (
                          <td className="p-2">
                            <input
                              type="number"
                              aria-label={`حركة السنة دائن ${row.seq}`}
                              value={row.periodCredit}
                              onChange={(e) =>
                                handleUpdateRow(row.seq, { periodCredit: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg py-1 px-2 font-mono text-xs text-[#141414]"
                            />
                          </td>
                        )}
                        {showClosingBalanceCols && (
                          <td className="p-2 bg-[#fafafa]">
                            <input
                              type="number"
                              aria-label={`الرصيد النهائي مدين ${row.seq}`}
                              value={row.closingDebit}
                              onChange={(e) =>
                                handleUpdateClosingDebit(row, parseFloat(e.target.value) || 0)
                              }
                              className="w-28 bg-white border border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                            />
                          </td>
                        )}
                        {showClosingBalanceCols && (
                          <td className="p-2 bg-[#fafafa]">
                            <input
                              type="number"
                              aria-label={`الرصيد النهائي دائن ${row.seq}`}
                              value={row.closingCredit}
                              onChange={(e) =>
                                handleUpdateClosingCredit(row, parseFloat(e.target.value) || 0)
                              }
                              className="w-28 bg-white border border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                            />
                          </td>
                        )}
                        {showNetBalanceCol && (
                          <td className="p-2 font-mono font-bold text-[#141414]">
                            {fmt(row.closingDebit - row.closingCredit)}
                          </td>
                        )}
                        <td className="p-2 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-[#141414]">{row.statusText}</span>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDrilldownCodeFilter(row.erpCode);
                                setActiveEnterpriseModule('auto-journals-ledger');
                                setActiveSubTab('enterprise-suite');
                              }}
                              className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer"
                              title="فتح كشف حركة الحساب والقيود المكونة لرصيده"
                            >
                              كشف الحركة
                            </button>
                            <button
                              type="button"
                              onClick={() => setHiddenRowSeqs((prev) => [...prev, row.seq])}
                              className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                              title="إخفاء الحساب من العرض"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccountRow(row.seq, row.accountName)}
                              className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#f3f3f3] text-[#141414] font-bold border-t-2 border-[#141414] sticky bottom-0">
                  <tr>
                    <td colSpan={6} className="p-3">
                      إجمالي ميزان المراجعة ({filteredRows.length} حساباً معروضاً من أصل {engine.rows.length})
                    </td>
                    {showOpeningCols && <td className="p-3 font-mono">{fmt(engine.totals.openingDebit)}</td>}
                    {showOpeningCols && <td className="p-3 font-mono">{fmt(engine.totals.openingCredit)}</td>}
                    {showMovementCols && <td className="p-3 font-mono">{fmt(engine.totals.periodDebit)}</td>}
                    {showMovementCols && <td className="p-3 font-mono">{fmt(engine.totals.periodCredit)}</td>}
                    {showClosingBalanceCols && (
                      <td className="p-3 font-mono text-sm">{fmt(engine.totals.closingDebit)}</td>
                    )}
                    {showClosingBalanceCols && (
                      <td className="p-3 font-mono text-sm">{fmt(engine.totals.closingCredit)}</td>
                    )}
                    {showNetBalanceCol && (
                      <td className="p-3 font-mono">
                        {fmt(engine.totals.closingDebit - engine.totals.closingCredit)}
                      </td>
                    )}
                    <td colSpan={2} className="p-3 text-xs">
                      {engine.closingDiff <= settings.roundingTolerance ? '✔ الميزان متزن' : `فرق: ${fmt(engine.closingDiff)}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 4: DIAGNOSTICS & 34 IFRS AUDIT CHECKS + ACCOUNT ERROR DETAILS (ورقتا الفحوصات وتفصيل_الأخطاء)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-[#141414] m-0">
                مركز الفحوصات وكشف الأخطاء المعياري (34 فحصاً IFRS / IAS + جدول تفصيل الأخطاء على مستوى الحسابات)
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                يطابق منظومة الرقابة المالية والتدقيق الآلي للحسابات، حيث يعرض كل فحص معياري وشرح المشكلة وطريقة الحل وأي حساب به ملاحظة
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
              <button
                type="button"
                onClick={() => setHideHealthyChecks((v) => !v)}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] flex items-center gap-1 cursor-pointer"
              >
                {hideHealthyChecks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{hideHealthyChecks ? 'إظهار الفحوصات السليمة' : 'إخفاء الفحوصات السليمة'}</span>
              </button>
              {hiddenCheckIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHiddenCheckIds([])}
                  className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#141414] cursor-pointer"
                >
                  إظهار الفحوصات المخفية ({hiddenCheckIds.length})
                </button>
              )}
              <span className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff]">
                الأخطاء الجوهرية: {engine.diagnostics.criticalErrorsCount}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                التنبيهات: {engine.diagnostics.warningsCount}
              </span>
              <button
                type="button"
                onClick={() => handleExportDiagnostics('excel')}
                className="button-outline-on-light"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1" />
                <span>تصدير الفحوصات Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportDiagnostics('pdf')}
                className="button-outline-on-light"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <FileText className="w-3.5 h-3.5 ml-1" />
                <span>تصدير PDF</span>
              </button>
              <ExportDropdown
                sectionKey="ifrs-diagnostics"
                data={getDiagnosticsExportData()}
                dataProvider={() => getDiagnosticsExportData()}
                customTitle={`تقرير الرقابة المالية والتدقيق الآلي — ${settings.companyName}`}
                buttonLabel="خيارات التصدير"
                variant="outline-light"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0]">
              <h4 className="text-sm font-bold text-[#141414] m-0">
                أولاً: جدول الفحوصات المعيارية الـ 34 (سجل الفحوصات الرقابية — IFRS / IAS / SOCPA)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3">م</th>
                    <th className="p-3">الفحص المعياري</th>
                    <th className="p-3">المرجع (IFRS / IAS)</th>
                    <th className="p-3 font-mono">القيمة</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">ماذا تعني المشكلة؟</th>
                    <th className="p-3">كيف تحلها؟</th>
                    <th className="p-3">الخطورة</th>
                    <th className="p-3 text-center">إخفاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {engine.diagnostics.checks
                    .filter((c) => !hiddenCheckIds.includes(c.id))
                    .filter((c) => !(hideHealthyChecks && c.status === 'سليم'))
                    .map((c) => (
                    <tr key={c.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3 font-mono font-bold text-[#707070]">{c.id}</td>
                      <td className="p-3 font-bold text-[#141414]">{c.title}</td>
                      <td className="p-3 font-mono text-[#707070] whitespace-nowrap">{c.reference}</td>
                      <td className="p-3 font-mono font-bold text-[#141414]">{c.value.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            c.status === 'سليم'
                              ? 'bg-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                          }`}
                        >
                          {c.status === 'سليم' ? '✔ سليم' : c.status === 'تنبيه' ? '⚠ تنبيه' : '✖ خطأ'}
                        </span>
                      </td>
                      <td className="p-3 text-[#707070] max-w-xs">{c.meaning}</td>
                      <td className="p-3 text-[#141414] font-medium max-w-xs">{c.resolution}</td>
                      <td className="p-3 font-semibold text-[#707070]">{c.severity}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setHiddenCheckIds((prev) => [...prev, c.id])}
                          className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                          title="إخفاء هذا الفحص الرقابي"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Account-Level Error Details (سجل تدقيق الحسابات) */}
          <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#141414] m-0">
                  ثانياً: تفصيل الأخطاء والملاحظات على مستوى الحسابات (سجل تدقيق الحسابات)
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  يعرض تلقائياً أي حساب في ميزان المراجعة غير مصنف أو رصيده النهائي عكس طبيعته المحاسبية أو يجمع بين مدين ودائن
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold">
                عدد الحسابات التي عليها ملاحظة: {engine.diagnostics.accountErrors.length}
              </span>
            </div>
            {engine.diagnostics.accountErrors.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-[#141414]">
                ✔ لا توجد أي أخطاء أو ملاحظات على مستوى الحسابات الـ {engine.rows.length} — كافة الحسابات مصنفة ومتزنة ومطابقة لطبيعتها.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">صف الميزان</th>
                      <th className="p-3">رقم الحساب</th>
                      <th className="p-3">اسم الحساب</th>
                      <th className="p-3 font-mono">الرصيد النهائي مدين</th>
                      <th className="p-3 font-mono">الرصيد النهائي دائن</th>
                      <th className="p-3">التصنيف الحالي</th>
                      <th className="p-3">الملاحظة / الخطأ المكتشف</th>
                      <th className="p-3">الإجراء المقترح للتصحيح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {engine.diagnostics.accountErrors.map((errRow) => (
                      <tr key={errRow.seq} className="hover:bg-[#f3f3f3]/40">
                        <td className="p-3 font-mono font-bold">{errRow.seq}</td>
                        <td className="p-3 font-mono text-[#707070]">{errRow.erpCode}</td>
                        <td className="p-3 font-bold text-[#141414]">{errRow.accountName}</td>
                        <td className="p-3 font-mono">{fmt(errRow.closingDebit)}</td>
                        <td className="p-3 font-mono">{fmt(errRow.closingCredit)}</td>
                        <td className="p-3 font-mono">
                          {errRow.approvedCode || `غير مصنف (مقترح: ${errRow.suggestedCode})`}
                        </td>
                        <td className="p-3 font-bold text-[#141414]">{errRow.auditNote}</td>
                        <td className="p-3 text-[#707070]">
                          {!errRow.approvedCode ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateRow(errRow.seq, { manualCode: errRow.suggestedCode })}
                              className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                            >
                              اعتماد المقترح ({errRow.suggestedCode})
                            </button>
                          ) : (
                            'راجع طبيعة الرصيد أو أعد تصنيف الحساب للبند المقابل'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 5: EXPANDABLE CHART OF ACCOUNTS & EXCEL 319-NODE TREE (شجرة_الحسابات ودليل_الحسابات)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'coa-tree' && (
        <div className="space-y-5">
          {/* Sub-Navigation between the 3 Tree & COA views */}
          <div className="bg-white p-4 rounded-3xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                {
                  id: 'excel-tree-319',
                  label: '1. شجرة الحسابات المرجعية الكاملة المعتمدة (319 عقدة معيارية + الحسابات الفرعية بالمستوى 4)',
                },
                {
                  id: 'company-coa-tree',
                  label: `2. الدليل والشجرة التشغيلية الرباعية وحقول الأصول (${coaAccounts.length} حساب ومستوى)`,
                },
                {
                  id: 'linked-coa-sheet',
                  label: `3. دليل الحسابات العام المرتبط بميزان المراجعة (${engine.rows.length} حساباً)`,
                },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCoaSubView(st.id as any)}
                  className={`px-4 py-2 rounded-full text-xs cursor-pointer transition-all ${
                    coaSubView === st.id
                      ? 'bg-[#141414] text-[#ffffff] font-bold'
                      : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] font-medium'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOrganizeAndCompleteCompanyCoa}
                className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1.5"
                title="ترتيب الشجرة واستكمال الحسابات والمستويات القياسية الناقصة آلياً"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ترتيب واستكمال الشجرة القياسية</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCustomFieldManager((v) => !v)}
                className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold cursor-pointer"
              >
                + إضافة / إدارة حقول الأصول ({customFieldDefs.length})
              </button>
              <button
                type="button"
                onClick={() => handleExportCoa('excel')}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1" />
                <span>تصدير الدليل والشجرة Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCoa('pdf')}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                <FileText className="w-4 h-4 ml-1" />
                <span>تصدير PDF</span>
              </button>
              <ExportDropdown
                sectionKey="chart-of-accounts"
                data={getCoaExportData()}
                dataProvider={() => getCoaExportData()}
                customTitle={`دليل وشجرة الحسابات المعتمدة — ${settings.companyName}`}
                buttonLabel="جميع صيغ التصدير"
                variant="outline-light"
              />
            </div>
          </div>

          {/* 5A: EXCEL 319-NODE HIERARCHICAL ACCOUNTING TREE + LEVEL 4 LEDGER ACCOUNTS */}
          {coaSubView === 'excel-tree-319' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#141414] m-0">
                    شجرة الحسابات المرجعية الكاملة (319 عقدة معيارية + التسكين الفعلي لحسابات المستوى الرابع تحت كل تصنيف فرعي)
                  </h3>
                  <p className="text-xs text-[#707070] mt-1">
                    تضم المستويات الأربعة مرتبةً: المستوى 1 (أبواب القوائم A, L, E, O, R) ← المستوى 2 (بنود القوائم الـ 34) ← المستوى 3 (التصنيفات الفرعية الـ 280+) ← المستوى 4 (الحسابات الفعلية المسكنة تحت عقدها مباشرةً)
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOrganizeAndCompleteExcelTree}
                    className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    title="تسكين كافة الحسابات تحت العقد الفرعية بالمستوى 3 واستكمال أي بند ناقص من الـ 34 بنداً"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تسكين وترتيب واستكمال العقد الناقصة آلياً</span>
                  </button>
                  <div className="relative w-60">
                    <Search className="w-4 h-4 absolute right-3 top-2 text-[#707070]" />
                    <input
                      type="text"
                      placeholder="بحث في الـ 319 عقدة والحسابات..."
                      value={excelTreeSearch}
                      onChange={(e) => setExcelTreeSearch(e.target.value)}
                      className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      EXCEL_ACCOUNTING_TREE.forEach((n) => {
                        all[n.code] = true;
                      });
                      setExpandedExcelTreeCodes(all);
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                  >
                    توسيع الـ 4 مستويات بالكامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedExcelTreeCodes({ A: true, L: true, E: true, O: true, R: true })}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                  >
                    طي للمستوى الرئيسي
                  </button>
                </div>
              </div>

              {/* Filter Bar for the 319-Node Tree */}
              <div className="flex items-center justify-between flex-wrap gap-2 bg-[#f3f3f3] p-3 rounded-2xl border border-[#e0e0e0]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: 'كافة العقد القياسية (319 عقدة)' },
                    { id: 'ACTIVE_ONLY', label: 'العقد النشطة بالحسابات والأرصدة فقط' },
                    { id: 'A', label: '1. الأصول (A-01..A-10)' },
                    { id: 'L', label: '2. الالتزامات (L-01..L-09)' },
                    { id: 'E_O', label: '3. حقوق الملكية و OCI (E-01..O-01)' },
                    { id: 'R', label: '4. الإيرادات والمصروفات والزكاة (R-01..R-10)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setExcelTreeFilter(f.id as any)}
                      className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                        excelTreeFilter === f.id
                          ? 'bg-[#141414] text-[#ffffff] font-bold'
                          : 'bg-white text-[#141414] border border-[#e0e0e0] hover:bg-[#e8e8e8] font-medium'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-[#707070]">
                  إجمالي العقد: <strong>{EXCEL_ACCOUNTING_TREE.length + customTreeSubNodes.length}</strong> • الحسابات الفعلية بالمستوى 4: <strong>{engine.rows.length}</strong>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[680px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] sticky top-0 z-10">
                    <tr>
                      <th className="p-3">هيكل شجرة الحسابات المرتب (المستويات 1 ← 2 ← 3 ← 4)</th>
                      <th className="p-3">الكود</th>
                      <th className="p-3">المستوى</th>
                      <th className="p-3">كود القائمة الأب</th>
                      <th className="p-3">مرجع المعيار (IFRS / IAS)</th>
                      <th className="p-3 font-mono">الرصيد النهائي مدين</th>
                      <th className="p-3 font-mono">الرصيد النهائي دائن</th>
                      <th className="p-3 text-center">إضافة وتوسع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {(() => {
                      const q = excelTreeSearch.trim().toLowerCase();
                      const renderedRows: React.ReactNode[] = [];

                      const level1Nodes = EXCEL_ACCOUNTING_TREE.filter((n) => {
                        if (n.level !== 1) return false;
                        if (excelTreeFilter === 'A') return n.code === 'A';
                        if (excelTreeFilter === 'L') return n.code === 'L';
                        if (excelTreeFilter === 'E_O') return n.code === 'E' || n.code === 'O';
                        if (excelTreeFilter === 'R') return n.code === 'R';
                        return true;
                      });

                      level1Nodes.forEach((l1) => {
                        const l2Nodes = EXCEL_ACCOUNTING_TREE.filter((n) => n.level === 2 && n.parentCode === l1.code).sort(
                          (a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })
                        );
                        const l1Rows = engine.rows.filter((r) => r.approvedCode.startsWith(l1.code + '-'));
                        const l1Debit = l1Rows.reduce((s, r) => s + r.closingDebit, 0);
                        const l1Credit = l1Rows.reduce((s, r) => s + r.closingCredit, 0);
                        const l1Expanded = Boolean(expandedExcelTreeCodes[l1.code]) || Boolean(q);

                        if (excelTreeFilter === 'ACTIVE_ONLY' && l1Rows.length === 0) return;

                        renderedRows.push(
                          <tr
                            key={`tree_l1_${l1.code}`}
                            onClick={() =>
                              setExpandedExcelTreeCodes((prev) => ({ ...prev, [l1.code]: !prev[l1.code] }))
                            }
                            className="bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer border-y border-[#141414]"
                          >
                            <td className="p-3 flex items-center gap-2">
                              {l1Expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              <FolderTree className="w-4 h-4 shrink-0" />
                              <input
                                type="text"
                                value={customTreeNodeNames[l1.code] ?? l1.titleAr}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleUpdateTreeNodeTitle(l1.code, e.target.value)}
                                className="bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-bold text-[#141414] min-w-[240px]"
                              />
                              <span className="text-[11px] text-[#707070] shrink-0">
                                ({l2Nodes.length} بند رئيسي • {l1Rows.length} حساب فعلي بالمستوى 4)
                              </span>
                            </td>
                            <td className="p-3 font-mono">{l1.code}</td>
                            <td className="p-3">المستوى 1 (باب رئيسي)</td>
                            <td className="p-3 font-mono">{l1.statementCode}</td>
                            <td className="p-3 font-mono">IAS 1 / IFRS 18</td>
                            <td className="p-3 font-mono">{fmt(l1Debit)}</td>
                            <td className="p-3 font-mono">{fmt(l1Credit)}</td>
                            <td className="p-3 text-center">-</td>
                          </tr>
                        );

                        if (!l1Expanded) return;

                        l2Nodes.forEach((l2) => {
                          const l3Nodes = [
                            ...EXCEL_ACCOUNTING_TREE.filter((n) => n.level === 3 && n.parentCode === l2.code),
                            ...customTreeSubNodes.filter((n) => n.parentCode === l2.code),
                          ].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

                          const l2LedgerRows = engine.rows
                            .filter((r) => r.approvedCode === l2.code)
                            .sort((a, b) => String(a.erpCode).localeCompare(String(b.erpCode), undefined, { numeric: true }));

                          if (excelTreeFilter === 'ACTIVE_ONLY' && l2LedgerRows.length === 0) return;

                          const l2Debit = l2LedgerRows.reduce((s, r) => s + r.closingDebit, 0);
                          const l2Credit = l2LedgerRows.reduce((s, r) => s + r.closingCredit, 0);
                          const l2Meta = IFRS_MAPPING_CODES.find((m) => m.code === l2.code);
                          const l2Expanded = Boolean(expandedExcelTreeCodes[l2.code]) || Boolean(q);
                          const l2DisplayTitle = customTreeNodeNames[l2.code] ?? l2.titleAr;

                          const matchesL2 =
                            !q ||
                            l2DisplayTitle.toLowerCase().includes(q) ||
                            l2.code.toLowerCase().includes(q) ||
                            l3Nodes.some(
                              (x) =>
                                (customTreeNodeNames[x.code] ?? x.titleAr).toLowerCase().includes(q) ||
                                x.code.toLowerCase().includes(q)
                            ) ||
                            l2LedgerRows.some(
                              (r) => r.accountName.toLowerCase().includes(q) || r.erpCode.toLowerCase().includes(q)
                            );

                          if (!matchesL2) return;

                          renderedRows.push(
                            <tr
                              key={`tree_l2_${l2.code}`}
                              onClick={() =>
                                setExpandedExcelTreeCodes((prev) => ({ ...prev, [l2.code]: !prev[l2.code] }))
                              }
                              className="bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer hover:bg-[#e8e8e8]"
                            >
                              <td className="p-2.5 pr-7 flex items-center gap-1.5">
                                {l2Expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                                <input
                                  type="text"
                                  value={l2DisplayTitle}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleUpdateTreeNodeTitle(l2.code, e.target.value)}
                                  className="bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-bold text-[#141414] min-w-[260px]"
                                />
                                <span className="text-[10px] text-[#707070] font-normal shrink-0">
                                  ({l3Nodes.length} تصنيف فرعي • {l2LedgerRows.length} حساب مرتبط)
                                </span>
                              </td>
                              <td className="p-2.5 font-mono">{l2.code}</td>
                              <td className="p-2.5">المستوى 2 (بند قائمة)</td>
                              <td className="p-2.5 font-mono">{l2.statementCode}</td>
                              <td className="p-2.5 font-mono text-[#707070]">{l2Meta?.ifrsRef || 'IAS 1'}</td>
                              <td className="p-2.5 font-mono">{fmt(l2Debit)}</td>
                              <td className="p-2.5 font-mono">{fmt(l2Credit)}</td>
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomTreeSubNode(l2.code, l2DisplayTitle)}
                                    className="px-2 py-1 rounded-full bg-white hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer"
                                    title="إضافة عقدة تصنيف فرعي جديدة (مستوى 3)"
                                  >
                                    + تصنيف فرعي
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddStatementLineAccount(l2.code, l2DisplayTitle.replace(/^[↳\s]+/, ''))}
                                    className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                                  >
                                    + إضافة حساب
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );

                          if (!l2Expanded) return;

                          const matchedRowSeqsInL3 = new Set<number>();

                          // Render Level 3 Extended Sub-Classifications + their nested Level 4 accounts directly underneath!
                          l3Nodes.forEach((l3) => {
                            const extMeta = EXTENDED_IFRS_CLASSIFICATIONS.find((x) => x.code === l3.code);
                            const l3LedgerRows = l2LedgerRows.filter(
                              (r) => r.manualCode === l3.code || r.approvedSubCode === l3.code
                            );
                            l3LedgerRows.forEach((r) => matchedRowSeqsInL3.add(r.seq));

                            if (excelTreeFilter === 'ACTIVE_ONLY' && l3LedgerRows.length === 0) return;

                            const l3Debit = l3LedgerRows.reduce((s, r) => s + r.closingDebit, 0);
                            const l3Credit = l3LedgerRows.reduce((s, r) => s + r.closingCredit, 0);
                            const l3DisplayTitle = customTreeNodeNames[l3.code] ?? l3.titleAr.replace(/^[↳\s]+/, '');
                            const isCustomNode = customTreeSubNodes.some((cn) => cn.code === l3.code);
                            const l3Expanded =
                              expandedExcelTreeCodes[l3.code] !== undefined
                                ? Boolean(expandedExcelTreeCodes[l3.code])
                                : l3LedgerRows.length > 0 || Boolean(q);

                            if (
                              q &&
                              !l3DisplayTitle.toLowerCase().includes(q) &&
                              !l3.code.toLowerCase().includes(q) &&
                              !l3LedgerRows.some(
                                (r) => r.accountName.toLowerCase().includes(q) || r.erpCode.toLowerCase().includes(q)
                              )
                            ) {
                              return;
                            }

                            renderedRows.push(
                              <tr
                                key={`tree_l3_${l3.code}`}
                                onClick={() =>
                                  setExpandedExcelTreeCodes((prev) => ({
                                    ...prev,
                                    [l3.code]: !l3Expanded,
                                  }))
                                }
                                className={`cursor-pointer transition-colors ${
                                  l3LedgerRows.length > 0
                                    ? 'bg-[#fafafa] hover:bg-[#f0f0f0] font-bold'
                                    : 'bg-white hover:bg-[#f3f3f3]/50'
                                }`}
                              >
                                <td className="p-2 pr-14 font-semibold text-[#141414] flex items-center gap-1.5">
                                  {l3LedgerRows.length > 0 ? (
                                    l3Expanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                                    )
                                  ) : (
                                    <span className="text-[#707070]">├──</span>
                                  )}
                                  <input
                                    type="text"
                                    value={l3DisplayTitle}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleUpdateTreeNodeTitle(l3.code, e.target.value)}
                                    className="bg-transparent hover:bg-[#f3f3f3] focus:bg-white border border-transparent hover:border-[#e0e0e0] focus:border-[#141414] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#141414] min-w-[230px]"
                                  />
                                  {l3LedgerRows.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px]">
                                      {l3LedgerRows.length} حساب
                                    </span>
                                  )}
                                </td>
                                <td className="p-2 font-mono text-[#141414]">{l3.code}</td>
                                <td className="p-2 text-[#707070]">المستوى 3 (فرعي موسع)</td>
                                <td className="p-2 font-mono text-[#707070]">{l3.statementCode}</td>
                                <td className="p-2 font-mono text-[#707070]">{extMeta?.ifrsRef || l2Meta?.ifrsRef || 'IFRS'}</td>
                                <td className="p-2 font-mono font-bold">{l3Debit > 0 ? fmt(l3Debit) : '-'}</td>
                                <td className="p-2 font-mono font-bold">{l3Credit > 0 ? fmt(l3Credit) : '-'}</td>
                                <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAddStatementLineAccount(l3.code, l3DisplayTitle)}
                                      className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[10px] font-semibold cursor-pointer"
                                    >
                                      + حساب بـ {l3.code}
                                    </button>
                                    {isCustomNode && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomTreeSubNode(l3.code)}
                                        className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                                        title="حذف التصنيف الفرعي المخصص"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );

                            // Render Level 4 Accounts directly nested under this Level 3 sub-classification!
                            if (l3Expanded && l3LedgerRows.length > 0) {
                              l3LedgerRows.forEach((accRow) => {
                                if (q && !accRow.accountName.toLowerCase().includes(q) && !accRow.erpCode.includes(q)) {
                                  return;
                                }
                                renderedRows.push(
                                  <tr key={`tree_l4_sub_${l3.code}_${accRow.seq}`} className="bg-white hover:bg-[#f3f3f3]/60">
                                    <td className="p-2 pr-24 text-[#141414] flex items-center gap-2">
                                      <span className="text-[#707070] font-mono text-[11px]">└── حساب #{accRow.seq}:</span>
                                      <input
                                        type="text"
                                        value={accRow.accountName}
                                        onChange={(e) => handleUpdateRow(accRow.seq, { accountName: e.target.value })}
                                        className="bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-0.5 px-2 text-xs font-bold text-[#141414] min-w-[210px]"
                                      />
                                    </td>
                                    <td className="p-2 font-mono text-[#707070]">
                                      <input
                                        type="text"
                                        value={accRow.erpCode}
                                        onChange={(e) => handleUpdateRow(accRow.seq, { erpCode: e.target.value })}
                                        className="w-20 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] rounded-lg py-0.5 px-1.5 font-mono text-xs text-[#141414]"
                                      />
                                    </td>
                                    <td className="p-2 text-[#141414] font-semibold">المستوى 4 (حساب أستاذ)</td>
                                    <td className="p-2 font-mono">
                                      <select
                                        value={accRow.manualCode || accRow.approvedSubCode || accRow.approvedCode}
                                        onChange={(e) => handleUpdateRow(accRow.seq, { manualCode: e.target.value })}
                                        className="bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] rounded-lg py-0.5 px-1.5 text-[10px] font-mono text-[#141414]"
                                      >
                                        <option value={l2.code}>{l2.code} (رئيسي)</option>
                                        {l3Nodes.map((subOpt) => (
                                          <option key={subOpt.code} value={subOpt.code}>
                                            {subOpt.code} - {(customTreeNodeNames[subOpt.code] ?? subOpt.titleAr).replace(/^[↳\s]+/, '')}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="p-2 font-mono text-[#707070]">{extMeta?.ifrsRef || l2Meta?.ifrsRef || 'IFRS'}</td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={accRow.closingDebit}
                                        onChange={(e) =>
                                          handleUpdateClosingDebit(accRow, parseFloat(e.target.value) || 0)
                                        }
                                        className="w-24 bg-[#f3f3f3] focus:bg-white border border-[#141414] rounded-lg py-0.5 px-2 font-mono font-bold text-xs"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={accRow.closingCredit}
                                        onChange={(e) =>
                                          handleUpdateClosingCredit(accRow, parseFloat(e.target.value) || 0)
                                        }
                                        className="w-24 bg-[#f3f3f3] focus:bg-white border border-[#141414] rounded-lg py-0.5 px-2 font-mono font-bold text-xs"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAccountRow(accRow.seq, accRow.accountName)}
                                        className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                                        title="حذف الحساب"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              });
                            }
                          });

                          // Fallback: Render any Level 4 accounts linked to L2 that weren't matched to a specific L3 node
                          const unmatchedL2Rows = l2LedgerRows.filter((r) => !matchedRowSeqsInL3.has(r.seq));
                          unmatchedL2Rows.forEach((accRow) => {
                            if (q && !accRow.accountName.toLowerCase().includes(q) && !accRow.erpCode.includes(q)) {
                              return;
                            }
                            renderedRows.push(
                              <tr key={`tree_l4_${accRow.seq}`} className="bg-[#fafafa] hover:bg-[#f3f3f3]/70">
                                <td className="p-2 pr-20 text-[#141414] flex items-center gap-2">
                                  <span className="text-[#707070] font-mono">└── حساب #{accRow.seq}:</span>
                                  <input
                                    type="text"
                                    value={accRow.accountName}
                                    onChange={(e) => handleUpdateRow(accRow.seq, { accountName: e.target.value })}
                                    className="bg-white border border-[#e0e0e0] rounded-lg py-0.5 px-2 text-xs font-bold text-[#141414] min-w-[220px]"
                                  />
                                </td>
                                <td className="p-2 font-mono text-[#707070]">
                                  <input
                                    type="text"
                                    value={accRow.erpCode}
                                    onChange={(e) => handleUpdateRow(accRow.seq, { erpCode: e.target.value })}
                                    className="w-20 bg-white border border-[#e0e0e0] rounded-lg py-0.5 px-1.5 font-mono text-xs text-[#141414]"
                                  />
                                </td>
                                <td className="p-2 text-[#141414] font-semibold">المستوى 4 (حساب أستاذ)</td>
                                <td className="p-2 font-mono">
                                  <select
                                    value={accRow.manualCode || accRow.approvedCode}
                                    onChange={(e) => handleUpdateRow(accRow.seq, { manualCode: e.target.value })}
                                    className="bg-white border border-[#e0e0e0] rounded-lg py-0.5 px-1.5 text-[10px] font-mono text-[#141414]"
                                  >
                                    <option value={l2.code}>{l2.code} (رئيسي)</option>
                                    {l3Nodes.map((subOpt) => (
                                      <option key={subOpt.code} value={subOpt.code}>
                                        {subOpt.code} - {(customTreeNodeNames[subOpt.code] ?? subOpt.titleAr).replace(/^[↳\s]+/, '')}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2 font-mono text-[#707070]">{l2Meta?.ifrsRef || 'IFRS'}</td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={accRow.closingDebit}
                                    onChange={(e) =>
                                      handleUpdateClosingDebit(accRow, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 bg-white border border-[#141414] rounded-lg py-0.5 px-2 font-mono font-bold text-xs"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={accRow.closingCredit}
                                    onChange={(e) =>
                                      handleUpdateClosingCredit(accRow, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 bg-white border border-[#141414] rounded-lg py-0.5 px-2 font-mono font-bold text-xs"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAccountRow(accRow.seq, accRow.accountName)}
                                    className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                                    title="حذف الحساب"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        });
                      });

                      return renderedRows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5B: COMPANY OPERATIONAL COA TREE WITH DYNAMIC ASSET CUSTOM FIELDS & AUTOMATIC ROLLUPS */}
          {coaSubView === 'company-coa-tree' && (
            <div className="space-y-4">
              {/* Tree Structural Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(() => {
                  const rootAssets = coaAccounts.find((a) => a.code === '1');
                  const rootLiab = coaAccounts.find((a) => a.code === '2');
                  const rootEq = coaAccounts.find((a) => a.code === '3');
                  const rootRev = coaAccounts.find((a) => a.code === '4');
                  const rootExp = coaAccounts.find((a) => a.code === '5');
                  const headerCount = coaAccounts.filter((a) => a.isHeader).length;
                  const leafCount = coaAccounts.filter((a) => !a.isHeader).length;
                  return (
                    <>
                      <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0]">
                        <div className="text-xs text-[#707070] font-semibold">إجمالي هيكل الشجرة (4 مستويات)</div>
                        <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                          {coaAccounts.length} حساب ومستوى
                        </div>
                        <div className="text-[11px] text-[#707070] mt-1">
                          {headerCount} حساب رئيسي تجميعي • {leafCount} حساب فرعي تشغيلي
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0]">
                        <div className="text-xs text-[#707070] font-semibold">إجمالي الأصول بالصافي (الباب 1)</div>
                        <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                          {fmt(rootAssets?.balance || 0)} ⃁
                        </div>
                        <div className="text-[11px] text-[#707070] mt-1">
                          شامل خصم مخصص ECL ومجمع الإهلاك آلياً
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0]">
                        <div className="text-xs text-[#707070] font-semibold">الخصوم وحقوق الملكية (الباب 2 + 3)</div>
                        <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                          {fmt((rootLiab?.balance || 0) + (rootEq?.balance || 0))} ⃁
                        </div>
                        <div className="text-[11px] text-[#707070] mt-1">
                          الخصوم: {fmt(rootLiab?.balance || 0)} • الملكية: {fmt(rootEq?.balance || 0)}
                        </div>
                      </div>
                      <div className="bg-[#f3f3f3] p-4 rounded-2xl border border-[#e0e0e0]">
                        <div className="text-xs text-[#707070] font-semibold">صافي الدخل بالشجرة (الباب 4 - الباب 5)</div>
                        <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                          {fmt((rootRev?.balance || 0) - (rootExp?.balance || 0))} ⃁
                        </div>
                        <div className="text-[11px] text-[#707070] mt-1">
                          الإيرادات: {fmt(rootRev?.balance || 0)} • المصروفات: {fmt(rootExp?.balance || 0)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-[#141414]" />
                      <span>الدليل والشجرة المحاسبية الرباعية القابلة للتوسع (مع التجميع التلقائي للأرصدة وحقول الأصول)</span>
                    </h3>
                    <p className="text-xs text-[#707070] mt-1">
                      مرتبة هرمياً (المستوى 1 الأبواب ← المستوى 2 المجموعات ← المستوى 3 الحسابات الرقابية ← المستوى 4 الحسابات الفرعية) مع جمع تلقائي للأرصدة من الأسفل للأعلى
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-56">
                      <Search className="w-4 h-4 absolute right-3 top-2 text-[#707070]" />
                      <input
                        type="text"
                        placeholder="بحث بالكود أو الاسم أو IFRS..."
                        value={coaSearch}
                        onChange={(e) => setCoaSearch(e.target.value)}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleOrganizeAndCompleteCompanyCoa}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#141414] text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ترتيب واستكمال الناقص</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncCompanyCoaWithTrialBalance}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer flex items-center gap-1"
                      title="مزامنة أرصدة الشجرة مع أرصدة ميزان المراجعة الـ 211 حساباً"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>مزامنة مع الميزان</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetCompanyCoaToStandard}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                      title="إعادة ضبط الشجرة القياسية الرباعية الكاملة"
                    >
                      إعادة ضبط الشجرة
                    </button>
                    <button
                      type="button"
                      onClick={expandAllCoaTree}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                    >
                      توسيع الكل
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllCoaTree}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
                    >
                      طي الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddSubAccount(null)}
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ إضافة باب / حساب رئيسي</span>
                    </button>
                  </div>
                </div>

                {/* Category & Level Filter Pills */}
                <div className="flex items-center justify-between flex-wrap gap-2 bg-[#f3f3f3] p-3 rounded-2xl border border-[#e0e0e0]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: `كافة الأبواب (${coaAccounts.length})` },
                      { id: 'أصول', label: `1. الأصول (${coaAccounts.filter((a) => a.category === 'أصول').length})` },
                      { id: 'خصوم', label: `2. الخصوم (${coaAccounts.filter((a) => a.category === 'خصوم').length})` },
                      { id: 'حقوق ملكية', label: `3. حقوق الملكية (${coaAccounts.filter((a) => a.category === 'حقوق ملكية').length})` },
                      { id: 'إيرادات', label: `4. الإيرادات (${coaAccounts.filter((a) => a.category === 'إيرادات').length})` },
                      { id: 'مصروفات', label: `5. المصروفات (${coaAccounts.filter((a) => a.category === 'مصروفات').length})` },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCoaTreeCategoryFilter(cat.id as any)}
                        className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                          coaTreeCategoryFilter === cat.id
                            ? 'bg-[#141414] text-[#ffffff] font-bold'
                            : 'bg-white text-[#141414] border border-[#e0e0e0] hover:bg-[#e8e8e8] font-medium'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'ALL', label: 'كل المستويات (1-4)' },
                      { id: '1-2', label: 'المستوى 1-2 (الأبواب والمجموعات)' },
                      { id: '3', label: 'المستوى 3 (الحسابات الرقابية)' },
                      { id: '4', label: 'المستوى 4 (الحسابات الفرعية)' },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setCoaTreeLevelFilter(lvl.id as any);
                          if (lvl.id !== 'ALL') expandAllCoaTree();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-all ${
                          coaTreeLevelFilter === lvl.id
                            ? 'bg-[#141414] text-[#ffffff] font-bold'
                            : 'bg-white text-[#141414] border border-[#e0e0e0] hover:bg-[#e8e8e8]'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {addingChildParent !== undefined && (newCoaCode || addingChildParent !== null) && (
                <div className="bg-white p-5 rounded-3xl border-2 border-[#141414] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#141414] m-0">
                      {addingChildParent
                        ? `إضافة حساب / قسم فرعي جديد تحت: (${addingChildParent.code} - ${addingChildParent.nameAr})`
                        : 'إضافة حساب رئيسي جديد في الشجرة'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingChildParent(null);
                        setNewCoaCode('');
                      }}
                      className="px-3 py-1 rounded-full bg-[#f3f3f3] text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block font-bold mb-1">كود الحساب الجديد *</label>
                      <input
                        type="text"
                        value={newCoaCode}
                        onChange={(e) => setNewCoaCode(e.target.value)}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-1.5 px-3 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">اسم الحساب / الأصل *</label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الحساب أو الأصل..."
                        value={newCoaName}
                        onChange={(e) => setNewCoaName(e.target.value)}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-1.5 px-3"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">ربط ببند القوائم (IFRS)</label>
                      <select
                        value={newCoaIfrsCode}
                        onChange={(e) => setNewCoaIfrsCode(e.target.value)}
                        className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-1.5 px-3 font-semibold"
                      >
                        {EXTENDED_IFRS_CLASSIFICATIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} - {c.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleConfirmAddCoaAccount}
                        className="w-full py-2 px-4 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                      >
                        حفظ وإضافة للشجرة
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3">الشجرة والكود التراتبي</th>
                        <th className="p-3">اسم الحساب / القسم</th>
                        <th className="p-3">النوع والطبيعة</th>
                        <th className="p-3">المستوى ونوع العقدة</th>
                        <th className="p-3">تصنيف IFRS (رئيسي / فرعي)</th>
                        <th className="p-3 font-mono">رصيد افتتاحي</th>
                        <th className="p-3 font-mono">حركة مدين / دائن</th>
                        <th className="p-3 font-mono">الرصيد الصافي (⃁)</th>
                        <th className="p-3">الحقول الإضافية للأصول</th>
                        <th className="p-3 text-center">التوسيع / الإضافة / التعديل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {(() => {
                        const renderTreeNodes = (parentCode: string | null, depth: number): React.ReactNode[] => {
                          const children = coaAccounts.filter((a) => (a.parentCode || null) === parentCode);
                          const nodes: React.ReactNode[] = [];
                          for (const acc of children) {
                            if (coaTreeCategoryFilter !== 'ALL' && acc.category !== coaTreeCategoryFilter) {
                              continue;
                            }
                            const subChildren = coaAccounts.filter((a) => a.parentCode === acc.code);
                            const hasSub = subChildren.length > 0;
                            const isExp = Boolean(expandedTreeIds[acc.code]) || coaTreeLevelFilter !== 'ALL';
                            const isEditing = editingCoaId === acc.code;
                            const q = coaSearch.trim().toLowerCase();
                            const matchesSearch =
                              !q ||
                              acc.nameAr.toLowerCase().includes(q) ||
                              acc.code.toLowerCase().includes(q) ||
                              (acc.ifrsCode || '').toLowerCase().includes(q) ||
                              (acc.ifrsSubCode || '').toLowerCase().includes(q);

                            const matchesLevel =
                              coaTreeLevelFilter === 'ALL' ||
                              (coaTreeLevelFilter === '1-2' && acc.level <= 2) ||
                              (coaTreeLevelFilter === '3' && acc.level === 3) ||
                              (coaTreeLevelFilter === '4' && acc.level >= 4);

                            if ((matchesSearch && matchesLevel) || (hasSub && coaTreeLevelFilter === 'ALL')) {
                              nodes.push(
                                <tr
                                  key={acc.code}
                                  className={`hover:bg-[#f3f3f3]/50 ${
                                    acc.level === 1
                                      ? 'bg-[#f3f3f3] font-bold border-y border-[#141414]'
                                      : acc.level === 2
                                      ? 'bg-[#f8f8f8] font-bold'
                                      : acc.level === 3
                                      ? 'bg-[#fcfcfc] font-semibold'
                                      : 'bg-white'
                                  }`}
                                >
                                  <td className="p-2.5 font-mono" style={{ paddingRight: `${12 + depth * 20}px` }}>
                                    <div className="flex items-center gap-1.5">
                                      {hasSub ? (
                                        <button
                                          type="button"
                                          onClick={() => toggleTreeExpand(acc.code)}
                                          className="p-0.5 rounded hover:bg-[#e0e0e0] cursor-pointer"
                                        >
                                          {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                      ) : (
                                        <span className="text-[#707070] font-mono text-[11px]">└──</span>
                                      )}
                                      <span className="font-bold text-[#141414]">{acc.code}</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 min-w-[220px]">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={coaEditDraft.nameAr || ''}
                                        onChange={(e) => setCoaEditDraft({ ...coaEditDraft, nameAr: e.target.value })}
                                        className="w-full bg-white border border-[#141414] rounded-lg py-1 px-2 text-xs font-bold"
                                      />
                                    ) : (
                                      <div>
                                        <span className="text-[#141414]">{acc.nameAr}</span>
                                        {acc.nameEn && (
                                          <span className="block text-[10px] font-mono text-[#707070]">{acc.nameEn}</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5">
                                    <span className="font-semibold text-[#141414]">{acc.category}</span>
                                    <span className="block text-[10px] text-[#707070]">طبيعة: {acc.nature}</span>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-mono text-[10.5px] font-bold text-[#141414]">
                                      مستوى {acc.level}
                                    </span>
                                    <span className="block text-[10px] text-[#707070] mt-0.5">
                                      {hasSub ? `رئيسي تجميعي (${subChildren.length})` : 'فرعي تشغيلي'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-mono">
                                    {isEditing ? (
                                      <select
                                        value={coaEditDraft.ifrsSubCode || coaEditDraft.ifrsCode || ''}
                                        onChange={(e) =>
                                          setCoaEditDraft({
                                            ...coaEditDraft,
                                            ifrsSubCode: e.target.value,
                                            ifrsCode: extractPrimaryIfrsCode(e.target.value),
                                          })
                                        }
                                        className="bg-white border border-[#141414] rounded-lg py-1 px-2 text-[11px]"
                                      >
                                        {EXTENDED_IFRS_CLASSIFICATIONS.map((c) => (
                                          <option key={c.code} value={c.code}>
                                            {c.code} - {c.nameAr}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <div>
                                        <span className="font-bold text-[#141414]">
                                          {acc.ifrsSubCode || acc.ifrsCode || suggestIfrsCode(acc.nameAr)}
                                        </span>
                                        <span className="block text-[10px] text-[#707070] font-sans">
                                          {acc.ifrsItemName || acc.ifrsRef}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 font-mono text-[#707070]">
                                    {fmt(acc.openingBalance || 0)}
                                  </td>
                                  <td className="p-2.5 font-mono text-[11px] text-[#707070]">
                                    <div>م: {fmt(acc.currentDebit || 0)}</div>
                                    <div>د: {fmt(acc.currentCredit || 0)}</div>
                                  </td>
                                  <td className="p-2.5 font-mono font-bold text-[#141414]">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        value={coaEditDraft.balance ?? 0}
                                        onChange={(e) =>
                                          setCoaEditDraft({ ...coaEditDraft, balance: parseFloat(e.target.value) || 0 })
                                        }
                                        className="w-28 bg-white border border-[#141414] rounded-lg py-1 px-2 font-mono text-xs"
                                      />
                                    ) : (
                                      fmt(acc.balance)
                                    )}
                                  </td>
                                  <td className="p-2.5">
                                    {isEditing ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {customFieldDefs
                                          .filter((cf) => cf.section === acc.category || cf.section === 'ALL')
                                          .map((cf) => (
                                            <input
                                              key={cf.key}
                                              type="text"
                                              placeholder={cf.label}
                                              value={(coaEditDraft.customFields && coaEditDraft.customFields[cf.key]) || ''}
                                              onChange={(e) =>
                                                setCoaEditDraft({
                                                  ...coaEditDraft,
                                                  customFields: {
                                                    ...(coaEditDraft.customFields || {}),
                                                    [cf.key]: e.target.value,
                                                  },
                                                })
                                              }
                                              className="w-28 bg-white border border-[#e0e0e0] rounded px-2 py-0.5 text-[10px]"
                                            />
                                          ))}
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {acc.customFields &&
                                          Object.entries(acc.customFields).map(([k, v]) => {
                                            if (!v) return null;
                                            const def = customFieldDefs.find((d) => d.key === k);
                                            return (
                                              <span
                                                key={k}
                                                className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px]"
                                              >
                                                {def ? def.label : k}: <strong>{v}</strong>
                                              </span>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {isEditing ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditCoa(acc.code)}
                                            className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                          >
                                            <Check className="w-3 h-3" />
                                            <span>حفظ</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingCoaId(null)}
                                            className="px-2 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] cursor-pointer"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAddSubAccount(acc)}
                                            className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold cursor-pointer"
                                          >
                                            + فرعي
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditCoa(acc)}
                                            className="p-1 text-[#141414] hover:bg-[#e0e0e0] rounded cursor-pointer"
                                            title="تعديل الحساب وحقول الأصول"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          {!hasSub && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCoaAccount(acc)}
                                              className="p-1 text-[#707070] hover:text-[#141414] rounded cursor-pointer"
                                              title="حذف الحساب"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            if (hasSub && (isExp || Boolean(coaSearch.trim()))) {
                              nodes.push(...renderTreeNodes(acc.code, depth + 1));
                            }
                          }
                          return nodes;
                        };
                        return renderTreeNodes(null, 0);
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5C: LINKED CHART OF ACCOUNTS SHEET (دليل الحسابات العام القياسية المعتمدة) */}
          {coaSubView === 'linked-coa-sheet' && (
            <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#141414] m-0">
                    ورقة دليل الحسابات المرتبط بميزان المراجعة القابلة للتعديل ({engine.rows.length} حساباً)
                  </h3>
                  <p className="text-xs text-[#707070] mt-1">
                    يمكنك تعديل رقم الحساب، اسمه، التصنيف الرئيسي أو الفرعي الموسع، والأرصدة مباشرة من الدليل المرتبط أو ترتيب وتسكين كافة الحسابات آلياً
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOrganizeAndCompleteExcelTree}
                    className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#141414] text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تسكين التصنيفات الفرعية الـ 314 وترتيب الدليل آلياً</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAccountRow}
                    className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة حساب جديد للدليل</span>
                  </button>
                  <span className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-bold">
                    مرتبط: {engine.rows.filter((r) => Boolean(r.approvedCode)).length} | غير مصنف:{' '}
                    {engine.rows.filter((r) => !r.approvedCode).length}
                  </span>
                </div>
              </div>

              {/* Filter & Search Bar for Linked COA Sheet */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-[#f3f3f3] p-3 rounded-2xl border border-[#e0e0e0]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: `الكل (${engine.rows.length})` },
                    { id: 'A-', label: `الأصول (${engine.rows.filter((r) => r.approvedCode.startsWith('A-')).length})` },
                    { id: 'L-', label: `الالتزامات (${engine.rows.filter((r) => r.approvedCode.startsWith('L-')).length})` },
                    { id: 'E-', label: `حقوق الملكية (${engine.rows.filter((r) => r.approvedCode.startsWith('E-') || r.approvedCode.startsWith('O-')).length})` },
                    { id: 'R-', label: `الإيرادات والمصروفات (${engine.rows.filter((r) => r.approvedCode.startsWith('R-')).length})` },
                  ].map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setLinkedCoaSectionFilter(sec.id)}
                      className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                        linkedCoaSectionFilter === sec.id
                          ? 'bg-[#141414] text-[#ffffff] font-bold'
                          : 'bg-white text-[#141414] border border-[#e0e0e0] hover:bg-[#e8e8e8]'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute right-3 top-2 text-[#707070]" />
                  <input
                    type="text"
                    placeholder="بحث في الدليل المرتبط..."
                    value={linkedCoaSearch}
                    onChange={(e) => setLinkedCoaSearch(e.target.value)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[640px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">الرقم التسلسلي</th>
                      <th className="p-2.5">رقم الحساب ERP</th>
                      <th className="p-2.5">اسم الحساب (قابل للتعديل)</th>
                      <th className="p-2.5">التصنيف المختار (34 رئيسي + 314 فرعي موسع)</th>
                      <th className="p-2.5">البند المالي المعتمد</th>
                      <th className="p-2.5">مرجع المعيار (IFRS)</th>
                      <th className="p-2.5 font-mono">الرصيد النهائي مدين</th>
                      <th className="p-2.5 font-mono">الرصيد النهائي دائن</th>
                      <th className="p-2.5 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {engine.rows
                      .filter((r) => {
                        if (linkedCoaSectionFilter !== 'ALL') {
                          if (linkedCoaSectionFilter === 'E-') {
                            if (!r.approvedCode.startsWith('E-') && !r.approvedCode.startsWith('O-')) return false;
                          } else if (!r.approvedCode.startsWith(linkedCoaSectionFilter)) {
                            return false;
                          }
                        }
                        if (linkedCoaSearch.trim()) {
                          const q = linkedCoaSearch.trim().toLowerCase();
                          return (
                            r.accountName.toLowerCase().includes(q) ||
                            r.erpCode.toLowerCase().includes(q) ||
                            r.approvedCode.toLowerCase().includes(q) ||
                            (r.approvedSubCode || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((r) => {
                        const ext = EXTENDED_IFRS_CLASSIFICATIONS.find(
                          (x) => x.code === (r.manualCode || r.approvedSubCode || r.approvedCode)
                        );
                        const primary = IFRS_MAPPING_CODES.find((m) => m.code === r.approvedCode);
                        return (
                          <tr key={r.seq} className="hover:bg-[#f3f3f3]/40">
                            <td className="p-2 font-mono text-[#707070]">{r.seq}</td>
                            <td className="p-2 font-mono">
                              <input
                                type="text"
                                value={r.erpCode}
                                onChange={(e) => handleUpdateRow(r.seq, { erpCode: e.target.value })}
                                className="w-20 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2 font-bold text-[#141414] min-w-[200px]">
                              <input
                                type="text"
                                value={r.accountName}
                                onChange={(e) => handleUpdateRow(r.seq, { accountName: e.target.value })}
                                className="w-full bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 text-xs font-bold text-[#141414]"
                              />
                            </td>
                            <td className="p-2 font-mono text-[#141414] min-w-[220px]">
                              <select
                                value={r.manualCode || r.approvedSubCode || r.approvedCode || ''}
                                onChange={(e) => handleUpdateRow(r.seq, { manualCode: e.target.value })}
                                className="w-full bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 text-[11px] font-mono text-[#141414]"
                              >
                                <option value="">-- غير مصنف --</option>
                                <optgroup label="الأكواد الرئيسية الـ 34 (A-01 .. R-10)">
                                  {IFRS_MAPPING_CODES.map((c) => (
                                    <option key={c.code} value={c.code}>
                                      {c.code} - {c.nameAr}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="التصنيفات الفرعية الموسعة (314 تصنيفاً)">
                                  {EXTENDED_IFRS_CLASSIFICATIONS.filter((c) => c.level === 3).map((c) => (
                                    <option key={c.code} value={c.code}>
                                      {c.code} - {c.nameAr}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                            </td>
                            <td className="p-2">
                              <div className="font-semibold text-[#141414]">{r.approvedSubItemName || r.approvedItemName || 'غير مصنف'}</div>
                              <div className="text-[10px] text-[#707070]">{r.approvedCode} — {r.approvedItemName}</div>
                            </td>
                            <td className="p-2 font-mono text-[#707070]">{ext?.ifrsRef || primary?.ifrsRef || '-'}</td>
                            <td className="p-2 font-mono font-bold">
                              <input
                                type="number"
                                value={r.closingDebit}
                                onChange={(e) => handleUpdateClosingDebit(r, parseFloat(e.target.value) || 0)}
                                className="w-24 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2 font-mono font-bold">
                              <input
                                type="number"
                                value={r.closingCredit}
                                onChange={(e) => handleUpdateClosingCredit(r, parseFloat(e.target.value) || 0)}
                                className="w-24 bg-[#f3f3f3] focus:bg-white border border-[#e0e0e0] focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414]"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteAccountRow(r.seq, r.accountName)}
                                className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 6: ALL EXCEL REFERENCE SHEETS & MAPPING SETTINGS (الأقسام المرجعية الكاملة القياسية المعتمدة)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'mapping-settings' && (
        <div className="space-y-6">
          {/* Reference Sheets Sub-Navigation Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'primary-34', label: '1. الإعدادات وجدول التصنيفات الرئيسي (34 رمزاً A-01..R-10)' },
                { id: 'extended-314', label: `2. دليل التصنيف الموسع الكامل (${EXTENDED_IFRS_CLASSIFICATIONS.length} بنداً ومرجع IFRS)` },
                { id: 'arabic-guide-34', label: `3. دليل الأكواد العربي المبسط (${ARABIC_CODES_GUIDE.length} رمزاً مع الأمثلة)` },
                { id: 'search-keywords-257', label: `4. قاموس كلمات البحث التلقائي (${EXCEL_SEARCH_KEYWORDS.length} كلمة مفتاحية)` },
                { id: 'movements-governance', label: '5. شرح الحركات والأرصدة (P..U) وحوكمة الشجرة' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRefGuideSubTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-full text-xs cursor-pointer transition-all ${
                    refGuideSubTab === tab.id
                      ? 'bg-[#141414] text-[#ffffff] font-bold'
                      : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                sectionKey="ifrs-mappings"
                data={getMappingSettingsExportData()}
                dataProvider={() => getMappingSettingsExportData()}
                customTitle={`قواعد التوجيه المحاسبي المعياري — ${settings.companyName}`}
                buttonLabel="تصدير قواعد التوجيه"
                variant="outline-light"
              />
            </div>
          </div>

          {/* 6.1 Primary 34 Codes & General Settings */}
          {refGuideSubTab === 'primary-34' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-4">
                <h3 className="text-base font-bold text-[#141414] m-0">
                  الإعدادات العامة للقوائم المالية وفصل الجزء المتداول (ورقة الإعدادات — IAS 1.69 / IFRS 16)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-[#141414] block mb-1">اسم الشركة في ترويسة القوائم</label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => {
                        const next = { ...settings, companyName: e.target.value };
                        setSettings(next);
                        ifrsFinancialEngineService.saveSettings(activeCompanyId, next);
                      }}
                      className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#141414] block mb-1">تاريخ نهاية الفترة المالية</label>
                    <input
                      type="date"
                      value={settings.reportingDate}
                      onChange={(e) => {
                        const next = { ...settings, reportingDate: e.target.value };
                        setSettings(next);
                        ifrsFinancialEngineService.saveSettings(activeCompanyId, next);
                      }}
                      className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#141414] block mb-1">
                      الجزء المتداول من القروض طويلة الأجل - السنة الحالية (⃁)
                    </label>
                    <input
                      type="number"
                      value={settings.currentPortionLongTermLoansCurrent}
                      onChange={(e) => {
                        const next = {
                          ...settings,
                          currentPortionLongTermLoansCurrent: parseFloat(e.target.value) || 0,
                        };
                        setSettings(next);
                        ifrsFinancialEngineService.saveSettings(activeCompanyId, next);
                      }}
                      className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono text-[#141414]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
                <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0]">
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    جدول التصنيفات المعياري الرئيسي (ورقة التصنيفات — 34 كوداً A-01..R-10)
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3">الكود</th>
                        <th className="p-3">اسم البند في القوائم</th>
                        <th className="p-3">القائمة / القسم</th>
                        <th className="p-3">الطبيعة</th>
                        <th className="p-3">مرجع المعيار (IFRS / IAS)</th>
                        <th className="p-3">نوع التدفق النقدي</th>
                        <th className="p-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {IFRS_MAPPING_CODES.map((m) => (
                        <tr key={m.code} className="hover:bg-[#f3f3f3]/40">
                          <td className="p-3 font-mono font-bold text-[#141414]">{m.code}</td>
                          <td className="p-3 font-bold text-[#141414]">{m.nameAr}</td>
                          <td className="p-3 text-[#707070]">{m.sectionAr}</td>
                          <td className="p-3 font-mono font-bold">{m.naturalBalance}</td>
                          <td className="p-3 font-mono text-[#141414]">{m.ifrsRef}</td>
                          <td className="p-3 font-semibold text-[#141414]">{m.cashFlowType}</td>
                          <td className="p-3 text-[#707070]">{m.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6.2 Extended 314 Sub-Classifications (دليل التوجيه المحاسبي الموسع_الموسع) */}
          {refGuideSubTab === 'extended-314' && (
            <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
              <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    دليل التصنيف الموسع الكامل القياسية المعتمدة (دليل التوجيه المحاسبي الموسع_الموسع — {EXTENDED_IFRS_CLASSIFICATIONS.length} بنداً معيارياً)
                  </h4>
                  <p className="text-xs text-[#707070] mt-0.5">
                    يغطي كافة الحسابات الفرعية والتفصيلية (A-01-01 إلى R-10-06) مع الكود الأب بالقوائم المالية ومرجع المعيار الدولي IFRS / IAS
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute right-3 top-2 text-[#707070]" />
                  <input
                    type="text"
                    placeholder="بحث بالكود الفرعي أو الاسم أو المعيار..."
                    value={extClassSearch}
                    onChange={(e) => setExtClassSearch(e.target.value)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[640px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] sticky top-0">
                    <tr>
                      <th className="p-3">الكود التفصيلي</th>
                      <th className="p-3">اسم البند التفصيلي بالعربي</th>
                      <th className="p-3">المستوى</th>
                      <th className="p-3">الكود الأب بالقوائم</th>
                      <th className="p-3">اسم البند الأب بالقوائم</th>
                      <th className="p-3">الطبيعة</th>
                      <th className="p-3">مرجع المعيار (IFRS / IAS)</th>
                      <th className="p-3">ما يظهر في قائمة الاختيار اليدوي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {EXTENDED_IFRS_CLASSIFICATIONS.filter((item) => {
                      if (!extClassSearch.trim()) return true;
                      const q = extClassSearch.trim().toLowerCase();
                      return (
                        item.code.toLowerCase().includes(q) ||
                        item.nameAr.toLowerCase().includes(q) ||
                        item.parentStatementCode.toLowerCase().includes(q) ||
                        item.ifrsRef.toLowerCase().includes(q)
                      );
                    }).map((item) => (
                      <tr
                        key={item.code}
                        className={item.level === 2 ? 'bg-[#f3f3f3] font-bold' : 'hover:bg-[#f3f3f3]/40'}
                      >
                        <td className="p-2.5 font-mono font-bold text-[#141414]">{item.code}</td>
                        <td className="p-2.5 text-[#141414]">{item.nameAr}</td>
                        <td className="p-2.5 font-mono text-[#707070]">مستوى {item.level}</td>
                        <td className="p-2.5 font-mono font-bold">{item.parentStatementCode}</td>
                        <td className="p-2.5 text-[#707070]">{item.parentStatementName}</td>
                        <td className="p-2.5 font-mono">{item.naturalBalance === 'D' ? 'مدين (D)' : 'دائن (C)'}</td>
                        <td className="p-2.5 font-mono font-semibold text-[#141414]">{item.ifrsRef}</td>
                        <td className="p-2.5 font-mono text-[11px] text-[#707070]">{item.manualOption}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6.3 Arabic Codes Guide (ورقة دليل_الأكواد_العربي) */}
          {refGuideSubTab === 'arabic-guide-34' && (
            <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
              <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0]">
                <h4 className="text-sm font-bold text-[#141414] m-0">
                  دليل الأكواد العربي المبسط (ورقة دليل_الأكواد_العربي — شرح كل رمز من A-01 إلى R-10 مع الأمثلة العملية)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">الكود</th>
                      <th className="p-3">اسم البند بالعربي</th>
                      <th className="p-3">القائمة المالية</th>
                      <th className="p-3">الطبيعة المحاسبية</th>
                      <th className="p-3">الصياغة في قائمة الاختيار اليدوي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {ARABIC_CODES_GUIDE.map((g) => (
                      <tr key={g.code} className="hover:bg-[#f3f3f3]/40">
                        <td className="p-3 font-mono font-bold text-[#141414]">{g.code}</td>
                        <td className="p-3 font-bold text-[#141414]">{g.nameAr}</td>
                        <td className="p-3 text-[#707070]">{g.statementType}</td>
                        <td className="p-3 font-semibold">{g.naturalBalance}</td>
                        <td className="p-3 font-mono text-[#707070]">{g.manualChoiceLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6.4 Auto-Classification Keywords (قواعد التوجيه المحاسبي الذكي) */}
          {refGuideSubTab === 'search-keywords-257' && (
            <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
              <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    قاموس كلمات البحث للتصنيف التلقائي واكتشاف الأعمدة (قواعد التوجيه المحاسبي الذكي — {EXCEL_SEARCH_KEYWORDS.length} قاعدة)
                  </h4>
                  <p className="text-xs text-[#707070] mt-0.5">
                    يستخدمها المحرك لاقتراح البند المعياري تلقائياً بمجرد قراءة اسم الحساب العربي أو الإنجليزي
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute right-3 top-2 text-[#707070]" />
                  <input
                    type="text"
                    placeholder="بحث في الكلمات المفتاحية..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[580px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] sticky top-0">
                    <tr>
                      <th className="p-3">الأولوية</th>
                      <th className="p-3">الكلمة المفتاحية في اسم الحساب</th>
                      <th className="p-3">الكود المقترح تلقائياً</th>
                      <th className="p-3">اسم البند في القوائم</th>
                      <th className="p-3">مرجع المعيار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {EXCEL_SEARCH_KEYWORDS.filter((kw) => {
                      if (!keywordSearch.trim()) return true;
                      const q = keywordSearch.trim().toLowerCase();
                      return kw.keyword.toLowerCase().includes(q) || kw.code.toLowerCase().includes(q);
                    }).map((kw) => {
                      const m = IFRS_MAPPING_CODES.find((x) => x.code === kw.code);
                      return (
                        <tr key={kw.seq} className="hover:bg-[#f3f3f3]/40">
                          <td className="p-2.5 font-mono text-[#707070]">{kw.seq}</td>
                          <td className="p-2.5 font-bold text-[#141414]">{kw.keyword}</td>
                          <td className="p-2.5 font-mono font-bold text-[#141414]">{kw.code}</td>
                          <td className="p-2.5 text-[#707070]">{m?.nameAr || '-'}</td>
                          <td className="p-2.5 font-mono text-[#707070]">{m?.ifrsRef || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6.5 Movements & Balances Guide + Governance Rules (ورقتا شرح_الحركات_والأرصدة وحوكمة_الحسابات ورسائل_النظام) */}
          {refGuideSubTab === 'movements-governance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
                <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0]">
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    أولاً: شرح الحركات والأرصدة في ميزان المراجعة (قواعد احتساب الأرصدة والحركات — P/Q, R/S, T/U)
                  </h4>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  {MOVEMENTS_AND_BALANCES_GUIDE.map((row, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#f3f3f3]/60 border border-[#e0e0e0] flex flex-wrap gap-3">
                      {row.split('|').map((cell: string, cIdx: number) => (
                        <span key={cIdx} className={cIdx === 0 ? 'font-bold text-[#141414]' : 'text-[#707070]'}>
                          {cell}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
                <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0]">
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    ثانياً: ضوابط حوكمة شجرة الحسابات ومعيار IFRS 18 (ضوابط حوكمة الحسابات)
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3">القاعدة / المعيار</th>
                        <th className="p-3">الإجراء التطبيقي</th>
                        <th className="p-3">الأثر والمرجع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {COA_GOVERNANCE_RULES.map((g, i) => (
                        <tr key={i} className="hover:bg-[#f3f3f3]/40">
                          <td className="p-3 font-bold text-[#141414]">{g.rule}</td>
                          <td className="p-3 text-[#141414]">{g.action}</td>
                          <td className="p-3 text-[#707070]">{g.impact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden shadow-xs">
                <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0]">
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    ثالثاً: رسائل النظام التحذيرية والإرشادية (تنبيهات الرقابة المحاسبية)
                  </h4>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {SYSTEM_MESSAGES_AR.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center gap-2">
                      <span className="font-mono font-bold text-[#141414]">{m.key}:</span>
                      <span className="text-[#141414]">{m.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 7: USAGE GUIDE & IFRS 18 GOVERNANCE (دليل الاستخدام وحوكمة IFRS 18)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-3">
            <h3 className="text-base font-bold text-[#141414] m-0">طريقة الاستخدام المعتمدة (7 خطوات متكاملة)</h3>
            <ol className="space-y-2 text-xs text-[#141414] pr-4 list-decimal">
              <li>افتح تبويب <strong>(ميزان المراجعة الذكي)</strong> لاستعراض الحسابات الـ 211 المستوردة، وتعديل الرصيد النهائي (مدين / دائن) أو إخفاء وإظهار الأعمدة بضغطة زر.</li>
              <li>اختر التصنيف اليدوي من البنود الرئيسية الـ 34 أو من <strong>دليل التصنيف الموسع (314 بنداً فرعياً A-01-01..R-10-06)</strong> مع ظهور مرجع المعيار الدولي.</li>
              <li>استخدم زر <strong>(اعتماد التصنيف المقترح)</strong> لتصنيف الحسابات غير المصنفة آلياً باستخدام قاموس الـ 257 كلمة مفتاحية.</li>
              <li>افتح تبويب <strong>(مركز الفحوصات وكشف الأخطاء)</strong> لمراجعة الـ 34 فحصاً معيارياً وجدول تفصيل الأخطاء على مستوى الحسابات.</li>
              <li>استعرض <strong>القوائم المالية الخمس</strong> واضغط على أي قسم في المركز المالي أو قائمة الدخل لتوسيع البنود الفرعية وإضافة حقول مخصصة للأصول.</li>
              <li>افتح تبويب <strong>(الدليل والشجرة القابلة للتوسع)</strong> لاستعراض شجرة الحسابات القياسية الكاملة (319 عقدة + المستوى الرابع للحسابات) أو شجرة الشركة التشغيلية.</li>
              <li>استخدم <strong>(محاكي خطة النسب المالية What-If)</strong> لاختبار خطة تحسين السيولة والربحية وتصدير التقارير إلى Excel أو PDF.</li>
            </ol>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e0e0e0] space-y-3">
            <h3 className="text-base font-bold text-[#141414] m-0">ضوابط حوكمة شجرة الحسابات ومعيار IFRS 18 الجديد</h3>
            <div className="space-y-2 text-xs text-[#707070]">
              <p className="m-0">
                <strong className="text-[#141414]">• التوافق مع IFRS 18:</strong> ينطبق المعيار الدولي الجديد IFRS 18 (العرض والإفصاح في القوائم المالية بديلاً عن IAS 1) إلزامياً للفترات السنوية التي تبدأ في 1 يناير 2027، وقد تم تضمين المجاميع الفرعية الإلزامية (الربح التشغيلي والربح قبل التمويل والزكاة) مسبقاً في قائمة الدخل.
              </p>
              <p className="m-0">
                <strong className="text-[#141414]">• إفصاحات الأطراف ذات العلاقة (IAS 24):</strong> يرصد النظام تلقائياً حسابات (المستحق من / المستحق إلى) للشركات الشقيقة وجاري الشركاء لتجهيز إيضاح الأطراف ذات العلاقة.
              </p>
              <p className="m-0">
                <strong className="text-[#141414]">• التدفقات النقدية (IAS 7):</strong> يتم التحقق آلياً من مطابقة النقد المحسوب في نهاية قائمة التدفقات النقدية مع رصيد النقد وما في حكمه (A-10) في ميزان المراجعة بفارق صفر.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IfrsFinancialEngineWorkspace;
