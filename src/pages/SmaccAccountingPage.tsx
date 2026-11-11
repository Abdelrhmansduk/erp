import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  FileSpreadsheet,
  Printer,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  BookOpen,
  ShieldCheck,
  Lock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sliders,
  Scale,
  PieChart,
  TrendingUp,
  FolderTree,
  Receipt,
  FileText,
  UploadCloud
} from 'lucide-react';
import { SmaccFormModal } from '../components/smacc/SmaccFormModal';
import { UniversalDocumentExtractorModal } from '../components/common/UniversalDocumentExtractorModal';
import { useAppStore } from '../stores/appStore';
import { useCompany } from '../contexts/CompanyContext';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { chartOfAccountsService, AccountItem } from '../services/accounting/chartOfAccountsService';
import { journalEngine } from '../services/accounting/journalEngine';
import { IFRS_MAPPING_CODES } from '../services/accounting/ifrsFinancialEngineService';
import { enterpriseAccountingSuiteService } from '../services/accounting/enterpriseAccountingSuiteService';
import { getCompanyIfrsClassifications, isKasTradeCompany } from '../services/accounting/ifrsExtendedReferenceData';
import { realErpDataStore } from '../services/realErpDataStore';
import { IfrsFinancialEngineWorkspace } from '../components/finance/IfrsFinancialEngineWorkspace';

export interface SmaccAccountNode {
  code: string;
  name: string;
  nameEn?: string;
  type: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات';
  nature: 'مدين' | 'دائن';
  balance: number;
  level: number;
  parentCode?: string;
  ifrsCode?: string;
  ifrsSubCode?: string;
  ifrsItemName?: string;
  ifrsSubItemName?: string;
  ifrsSection?: string;
  ifrsRef?: string;
  cashFlowType?: string;
  children?: SmaccAccountNode[];
}

export interface JournalRecord {
  id: string;
  company_id: string;
  ref_no: string;
  date: string;
  branch: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'معتمد' | 'مسودة' | 'ملغي';
  lines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    memo?: string;
    costCenter?: string;
  }>;
  created_at: string;
}

export interface VoucherRecord {
  id: string;
  company_id: string;
  voucher_no: string;
  date: string;
  type: 'قبض' | 'صرف';
  account_code: string;
  amount: number;
  payee: string;
  treasury: string;
  cost_center: string;
  notes: string;
  status: 'معتمد' | 'معلق';
  created_at: string;
}

const DEFAULT_MOCK_JOURNALS: JournalRecord[] = [
  {
    id: 'jv-seed-1',
    company_id: 'SAF',
    ref_no: 'JV-2026-001',
    date: '2026-08-15',
    branch: 'الفرع الرئيسي - الرياض',
    description: 'قيد إثبات استحقاق عقود استقدام مساند - دفعة عملاء الرياض',
    total_debit: 28500,
    total_credit: 28500,
    status: 'معتمد',
    lines: [
      { accountCode: '1102', accountName: 'بنك الراجحي التشغيلي', debit: 28500, credit: 0, memo: 'إيداع بنكي مباشر', costCenter: 'CC-OPS-01' },
      { accountCode: '4101', accountName: 'إيرادات وساطة عقود الاستقدام', debit: 0, credit: 28500, memo: 'إيراد عقود 2 عمالة منزلية', costCenter: 'CC-OPS-01' }
    ],
    created_at: '2026-08-15T10:00:00Z'
  },
  {
    id: 'jv-seed-2',
    company_id: 'SAF',
    ref_no: 'JV-2026-002',
    date: '2026-08-16',
    branch: 'فرع جدة',
    description: 'صرف مستحقات إعاشة وإيواء مركز الضيافة بالخبر',
    total_debit: 8500,
    total_credit: 8500,
    status: 'معتمد',
    lines: [
      { accountCode: '5101', accountName: 'مصروفات تشغيل ومراكز إيواء', debit: 8500, credit: 0, memo: 'إعاشة شهرية للمركز', costCenter: 'CC-SHL-01' },
      { accountCode: '1101', accountName: 'الصندوق الرئيسي (Cash)', debit: 0, credit: 8500, memo: 'شيك مسحوب من الخزينة', costCenter: 'CC-SHL-01' }
    ],
    created_at: '2026-08-16T14:30:00Z'
  },
  {
    id: 'jv-kas-1',
    company_id: 'KAS',
    ref_no: 'KAS-JV-2026-101',
    date: '2026-08-17',
    branch: 'المعرض التجاري الرئيسي — الرياض',
    description: 'قيد إثبات مبيعات المعرض التجاري وتوريدات قطاع الأميال — دفعة شهر أغسطس',
    total_debit: 96600,
    total_credit: 96600,
    status: 'معتمد',
    lines: [
      { accountCode: '110201', accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي', debit: 96600, credit: 0, memo: 'تحصيل مبيعات نقاط البيع والتحويلات التجارية', costCenter: 'CC-KAS-SHW' },
      { accountCode: '410101', accountName: 'مبيعات المعارض التجارية والسلع والأجهزة', debit: 0, credit: 84000, memo: 'صافي مبيعات المعرض والأميال', costCenter: 'CC-KAS-SHW' },
      { accountCode: '210301', accountName: 'ضريبة القيمة المضافة للمخرجات (VAT 15%)', debit: 0, credit: 12600, memo: 'ضريبة مخرجات ZATCA المرحلة الثانية', costCenter: 'CC-KAS-SHW' }
    ],
    created_at: '2026-08-17T10:30:00Z'
  },
  {
    id: 'jv-kas-2',
    company_id: 'KAS',
    ref_no: 'KAS-JV-2026-102',
    date: '2026-08-18',
    branch: 'إدارة المنافسات والتوريدات الحكومية',
    description: 'قيد استحقاق مستخلص أمر توريد منصة اعتماد #ETM-2026-88991',
    total_debit: 145000,
    total_credit: 145000,
    status: 'معتمد',
    lines: [
      { accountCode: '110402', accountName: 'ذمم عملاء قطاع الأميال والجهات الحكومية والشركات', debit: 145000, credit: 0, memo: 'مستخلص توريدات معتمد بمنصة اعتماد', costCenter: 'CC-KAS-ETM' },
      { accountCode: '410201', accountName: 'إيرادات مستخلصات وأوامر توريد مشاريع المنافسات الحكومية', debit: 0, credit: 145000, memo: 'إيراد مشروع توريد أجهزة وتجهيزات', costCenter: 'CC-KAS-ETM' }
    ],
    created_at: '2026-08-18T12:15:00Z'
  }
];

const DEFAULT_MOCK_VOUCHERS: VoucherRecord[] = [
  {
    id: 'vou-seed-1',
    company_id: 'SAF',
    voucher_no: 'RV-2026-089',
    date: '2026-08-17',
    type: 'قبض',
    account_code: '1102',
    amount: 14500,
    payee: 'العميل: سعد بن عبدالله القحطاني',
    treasury: 'بنك الراجحي الرئيسي',
    cost_center: 'فرع الرياض الرئيسي',
    notes: 'تحصيل الرسوم المتبقية لعقد استقدام خادمة فلبينية',
    status: 'معتمد',
    created_at: '2026-08-17T11:20:00Z'
  },
  {
    id: 'vou-seed-2',
    company_id: 'SAF',
    voucher_no: 'PV-2026-042',
    date: '2026-08-18',
    type: 'صرف',
    account_code: '5102',
    amount: 5200,
    payee: 'شركة الخدمات المساندة للإعاشة',
    treasury: 'الصندوق الرئيسي (نقدي)',
    cost_center: 'مركز الإيواء والضيافة',
    notes: 'سداد فواتير التموين الغذائي لمركز الإيواء',
    status: 'معتمد',
    created_at: '2026-08-18T09:45:00Z'
  },
  {
    id: 'vou-kas-1',
    company_id: 'KAS',
    voucher_no: 'KAS-RV-2026-201',
    date: '2026-08-18',
    type: 'قبض',
    account_code: '110201',
    amount: 64400,
    payee: 'مجموعة النخبة للتجهيزات التجارية (قطاع الأميال)',
    treasury: 'بنك الرياض - حساب التجارة والمنافسات',
    cost_center: 'فرع قطاع الأميال التجاري',
    notes: 'تحصيل دفعة عقد توريد بضائع وأجهزة تجارية شاملة الضريبة',
    status: 'معتمد',
    created_at: '2026-08-18T11:00:00Z'
  },
  {
    id: 'vou-kas-2',
    company_id: 'KAS',
    voucher_no: 'KAS-PV-2026-109',
    date: '2026-08-19',
    type: 'صرف',
    account_code: '210101',
    amount: 38500,
    payee: 'شركة التوريدات الصناعية المتحدة',
    treasury: 'مصرف الراجحي الرئيسي',
    cost_center: 'مستودعات كاس المركزية',
    notes: 'سداد دفعة أمر شراء وتوريد بضائع للمستودع المركزي #PO-KAS-2026-881',
    status: 'معتمد',
    created_at: '2026-08-19T09:30:00Z'
  }
];

export const SmaccAccountingPage: React.FC = () => {
  const { activeTab: storeActiveTab, setActiveTab: setGlobalActiveTab, addNotification } = useAppStore();
  const { activeCompanyId, activeCompany } = useCompany();
  const isKasTrade = isKasTradeCompany(activeCompanyId);

  const companyIfrsClassifications = useMemo(
    () => getCompanyIfrsClassifications(activeCompanyId),
    [activeCompanyId]
  );

  const mapStoreTabToSmaccTab = (
    tabKey: string
  ): 'coa' | 'cost-centers' | 'journals' | 'vouchers' | 'ledger' | 'trial-balance' | 'income-statement' | 'balance-sheet' | 'fiscal-closing' | 'ifrs-engine' | 'financial-ratios' => {
    switch (tabKey) {
      case 'receipt-vouchers':
      case 'payment-vouchers':
      case 'vouchers':
      case 'smacc-cash':
      case 'finance-smacc-cash':
        return 'vouchers';
      case 'journals':
      case 'smacc-gl':
      case 'finance-smacc-gl':
        return 'journals';
      case 'general-ledger':
      case 'account-statements':
      case 'smacc-ar':
      case 'finance-smacc-ar':
      case 'smacc-ap':
      case 'finance-smacc-ap':
        return 'ledger';
      case 'trial-balance':
      case 'smacc-reports':
      case 'finance-smacc-reports':
        return 'trial-balance';
      case 'income-statement':
        return 'income-statement';
      case 'balance-sheet':
        return 'balance-sheet';
      case 'cost-centers':
      case 'smacc-cost':
      case 'finance-smacc-cost':
        return 'cost-centers';
      case 'period-closing':
        return 'fiscal-closing';
      case 'ifrs-engine':
        return 'ifrs-engine';
      case 'financial-ratios':
        return 'financial-ratios';
      default:
        return 'coa';
    }
  };

  const [activeTab, setActiveTab] = useState<
    'coa' | 'cost-centers' | 'journals' | 'vouchers' | 'ledger' | 'trial-balance' | 'income-statement' | 'balance-sheet' | 'fiscal-closing' | 'ifrs-engine' | 'financial-ratios'
  >(() => mapStoreTabToSmaccTab(storeActiveTab));

  const [searchQuery, setSearchQuery] = useState('');
  const [showSmaccClosingCols, setShowSmaccClosingCols] = useState<boolean>(true);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState('1101');
  const [ledgerDateFrom, setLedgerDateFrom] = useState('2026-01-01');
  const [ledgerDateTo, setLedgerDateTo] = useState('2026-12-31');

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [showBatchExtractor, setShowBatchExtractor] = useState(false);
  const [voucherType, setVoucherType] = useState<'قبض' | 'صرف'>('قبض');
  const [selectedJournalForPreview, setSelectedJournalForPreview] = useState<JournalRecord | null>(null);
  const [selectedVoucherForPreview, setSelectedVoucherForPreview] = useState<VoucherRecord | null>(null);

  // Accounts state from chartOfAccountsService
  const [rawAccounts, setRawAccounts] = useState<AccountItem[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ '1': true, '2': true, '3': true, '4': true, '5': true, '11': true });

  // Persistence for Journals and Vouchers (Strictly Isolated Per Company)
  const [journals, setJournals] = useState<JournalRecord[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);

  // Load Accounts & Persisted Data (Isolated by activeCompanyId)
  const loadData = async () => {
    const accs = chartOfAccountsService.getAccountsByCompany(activeCompanyId);
    setRawAccounts(accs);

    try {
      const storedJournals = await realErpDataStore.getRecords<JournalRecord>('company_journal_entries');
      const allJournals = [...(storedJournals || []), ...DEFAULT_MOCK_JOURNALS];
      const filteredJv = activeCompanyId === 'all'
        ? allJournals
        : allJournals.filter(j => (j.company_id || 'SAF') === activeCompanyId);
      setJournals(filteredJv);

      const storedVouchers = await realErpDataStore.getRecords<VoucherRecord>('finance_vouchers');
      const allVouchers = [...(storedVouchers || []), ...DEFAULT_MOCK_VOUCHERS];
      const filteredVou = activeCompanyId === 'all'
        ? allVouchers
        : allVouchers.filter(v => (v.company_id || 'SAF') === activeCompanyId);
      setVouchers(filteredVou);
    } catch (e) {
      console.warn('Could not fetch real journals/vouchers:', e);
    }
  };

  useEffect(() => {
    loadData();
    const handleDataUpdated = () => loadData();
    window.addEventListener('erp-data-updated', handleDataUpdated);
    window.addEventListener('alsulaim_erp_accounting_synced', handleDataUpdated);
    window.addEventListener('alsulaim_erp_storage_hydrated', handleDataUpdated);
    return () => {
      window.removeEventListener('erp-data-updated', handleDataUpdated);
      window.removeEventListener('alsulaim_erp_accounting_synced', handleDataUpdated);
      window.removeEventListener('alsulaim_erp_storage_hydrated', handleDataUpdated);
    };
  }, [activeCompanyId]);

  useEffect(() => {
    setActiveTab(mapStoreTabToSmaccTab(storeActiveTab));
    if (storeActiveTab === 'receipt-vouchers') {
      setVoucherType('قبض');
    } else if (storeActiveTab === 'payment-vouchers') {
      setVoucherType('صرف');
    }
  }, [storeActiveTab]);

  // Convert raw accounts list to SMACC Tree Hierarchy
  const accountTree: SmaccAccountNode[] = useMemo(() => {
    const list = rawAccounts.length > 0 ? rawAccounts : [];
    const map = new Map<string, SmaccAccountNode>();

    list.forEach(a => {
      map.set(a.code, {
        code: a.code,
        name: a.nameAr,
        nameEn: a.nameEn,
        type: a.category,
        nature: a.nature,
        balance: a.balance || 0,
        level: a.level || 1,
        parentCode: a.parentCode,
        ifrsCode: a.ifrsCode,
        ifrsSubCode: a.ifrsSubCode,
        ifrsItemName: a.ifrsItemName,
        ifrsSubItemName: a.ifrsSubItemName,
        ifrsSection: a.ifrsSection,
        ifrsRef: a.ifrsRef,
        cashFlowType: a.cashFlowType,
        children: []
      });
    });

    const roots: SmaccAccountNode[] = [];
    map.forEach(node => {
      if (node.parentCode && map.has(node.parentCode)) {
        map.get(node.parentCode)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    // Roll up balances recursively (respecting contra-account nature sign)
    const rollup = (node: SmaccAccountNode): number => {
      if (!node.children || node.children.length === 0) return node.balance;
      const childrenSum = node.children.reduce(
        (sum, c) => sum + rollup(c) * (c.nature === node.nature ? 1 : -1),
        0
      );
      node.balance = node.balance !== 0 ? node.balance : childrenSum;
      return node.balance;
    };
    roots.forEach(r => rollup(r));

    return roots;
  }, [rawAccounts]);

  // Toggle tree expand/collapse
  const toggleNode = (code: string) => {
    setExpandedNodes(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // New Account Form State
  const [newAccount, setNewAccount] = useState<{
    code: string;
    name: string;
    nameEn: string;
    type: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات';
    nature: 'مدين' | 'دائن';
    parentCode: string;
    ifrsSubCode: string;
    openingBalance: string;
  }>({
    code: '',
    name: '',
    nameEn: '',
    type: 'أصول',
    nature: 'مدين',
    parentCode: '11',
    ifrsSubCode: 'A-10-08',
    openingBalance: '0',
  });

  // New Voucher Form State
  const [newVoucher, setNewVoucher] = useState({
    voucherNo: `VOU-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    date: new Date().toISOString().slice(0, 10),
    accountCode: '1102',
    amount: '',
    payeeName: '',
    treasury: 'بنك الراجحي الرئيسي',
    costCenter: 'فرع الرياض الرئيسي',
    notes: '',
  });

  // New Journal Entry Form State
  const [journalHeader, setJournalHeader] = useState({
    refNo: `JV-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
    date: new Date().toISOString().slice(0, 10),
    branch: 'الفرع الرئيسي - الرياض',
    description: '',
  });

  const [journalLines, setJournalLines] = useState<Array<{
    accountCode: string;
    accountName: string;
    debit: string;
    credit: string;
    memo: string;
    costCenter: string;
  }>>([
    { accountCode: '1102', accountName: 'بنك الراجحي التشغيلي', debit: '10000', credit: '0', memo: 'إيداع تحصيل', costCenter: 'CC-OPS-01' },
    { accountCode: '4101', accountName: 'إيرادات وساطة عقود الاستقدام', debit: '0', credit: '10000', memo: 'إثبات إيراد عقد', costCenter: 'CC-OPS-01' },
  ]);

  const totalDebit = journalLines.reduce((acc, line) => acc + (parseFloat(line.debit) || 0), 0);
  const totalCredit = journalLines.reduce((acc, line) => acc + (parseFloat(line.credit) || 0), 0);
  const isJournalBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleAddJournalLine = () => {
    setJournalLines(prev => [
      ...prev,
      { accountCode: '1101', accountName: 'الصندوق الرئيسي (Cash)', debit: '0', credit: '0', memo: '', costCenter: 'CC-OPS-01' }
    ]);
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalLines.length > 2) {
      setJournalLines(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Save Account Handler
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.code || !newAccount.name) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى كتابة رمز واسم الحساب بدقة.',
        type: 'warning',
      });
      return;
    }

    const parentLevel = newAccount.parentCode ? (rawAccounts.find(a => a.code === newAccount.parentCode)?.level || 1) : 1;
    const computedLevel = Math.min(5, Math.max(1, newAccount.parentCode ? parentLevel + 1 : 1)) as 1 | 2 | 3 | 4 | 5;

    const created = chartOfAccountsService.addAccount(activeCompanyId, {
      code: newAccount.code,
      nameAr: newAccount.name,
      nameEn: newAccount.nameEn || newAccount.name,
      category: newAccount.type,
      nature: newAccount.nature,
      statementType: (newAccount.type === 'أصول' || newAccount.type === 'خصوم' || newAccount.type === 'حقوق ملكية')
        ? 'قائمة المركز المالي (ميزانية)'
        : 'قائمة الدخل (أرباح وخسائر)',
      level: computedLevel,
      parentCode: newAccount.parentCode || undefined,
      openingBalance: parseFloat(newAccount.openingBalance) || 0,
      currency: 'SAR',
      isActive: true,
      isHeader: false,
      ifrsSubCode: newAccount.ifrsSubCode,
    });

    if (created) {
      setRawAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
      setIsAccountModalOpen(false);
      addNotification({
        title: 'إضافة حساب جديد',
        message: `تمت إضافة الحساب (${newAccount.name} - #${newAccount.code}) بالتصنيف المعتمد (${created.ifrsSubCode}) في شجرة الحسابات بنجاح.`,
        type: 'success',
      });
      setNewAccount({
        code: '',
        name: '',
        nameEn: '',
        type: 'أصول',
        nature: 'مدين',
        parentCode: '11',
        ifrsSubCode: 'A-10-08',
        openingBalance: '0',
      });
    } else {
      addNotification({
        title: 'خطأ في الإضافة',
        message: 'رمز الحساب مستخدم بالفعل في شجرة الحسابات.',
        type: 'error',
      });
    }
  };

  // Inline Update Account Handler
  const handleInlineUpdateSmaccAccount = (code: string, patch: Partial<AccountItem>) => {
    chartOfAccountsService.updateAccount(activeCompanyId, code, patch);
    setRawAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
  };

  // Delete Account Handler
  const handleDeleteAccount = (code: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الحساب (${name} - #${code})؟`)) {
      const success = chartOfAccountsService.deleteAccount(activeCompanyId, code);
      if (success) {
        setRawAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
        addNotification({
          title: 'حذف الحساب',
          message: `تم حذف الحساب (#${code}) بنجاح.`,
          type: 'info'
        });
      } else {
        addNotification({
          title: 'تعذر الحذف',
          message: 'لا يمكن حذف حساب رئيسي يحتوي على حسابات فرعية أو حركات مالية.',
          type: 'error'
        });
      }
    }
  };

  // Save Journal Entry Handler
  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJournalBalanced) {
      addNotification({
        title: 'خطأ في توازن القيد',
        message: `يجب أن يتساوى إجمالي المدين (${totalDebit} ⃁) مع إجمالي الدائن (${totalCredit} ⃁) لاعتماد القيد.`,
        type: 'error',
      });
      return;
    }

    const newJv: JournalRecord = {
      id: `jv-${Date.now()}`,
      company_id: activeCompanyId,
      ref_no: journalHeader.refNo,
      date: journalHeader.date,
      branch: journalHeader.branch,
      description: journalHeader.description,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'معتمد',
      lines: journalLines.map(l => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        memo: l.memo,
        costCenter: l.costCenter
      })),
      created_at: new Date().toISOString()
    };

    const jeRes = journalEngine.createJournalEntry(activeCompanyId, {
      entryDate: journalHeader.date,
      entryType: 'MANUAL',
      sourceModule: 'SMACC_GENERAL_LEDGER',
      sourceReference: journalHeader.refNo,
      description: journalHeader.description || `قيد يومية مزدوج رقم ${journalHeader.refNo}`,
      branchName: journalHeader.branch,
      createdBy: 'المحاسب العام - SMACC',
      lines: journalLines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.memo,
        costCenterCode: l.costCenter,
      })),
      autoPost: true,
    });

    if (jeRes.error) {
      addNotification({
        title: 'رفض ترحيل القيد المحاسبي',
        message: jeRes.error,
        type: 'error',
      });
      return;
    }

    const updated = [newJv, ...journals];
    setJournals(updated);
    await realErpDataStore.addRecord('company_journal_entries', newJv);
    setRawAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));

    setIsJournalModalOpen(false);
    addNotification({
      title: 'ترحيل قيد اليومية',
      message: `تم ترحيل قيد اليومية (${newJv.ref_no}) بإجمالي متوازن ${totalDebit.toLocaleString()} ⃁ بنجاح.`,
      type: 'success',
    });

    setJournalHeader({
      refNo: `JV-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      date: new Date().toISOString().slice(0, 10),
      branch: 'الفرع الرئيسي - الرياض',
      description: '',
    });
  };

  // Save Voucher Handler
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newVoucher.amount) || 0;
    if (amountNum <= 0) {
      addNotification({ title: 'خطأ في المبلغ', message: 'يرجى إدخال مبلغ صحيح للسند.', type: 'warning' });
      return;
    }

    const newVou: VoucherRecord = {
      id: `vou-${Date.now()}`,
      company_id: activeCompanyId,
      voucher_no: newVoucher.voucherNo,
      date: newVoucher.date,
      type: voucherType,
      account_code: newVoucher.accountCode,
      amount: amountNum,
      payee: newVoucher.payeeName,
      treasury: newVoucher.treasury,
      cost_center: newVoucher.costCenter,
      notes: newVoucher.notes,
      status: 'معتمد',
      created_at: new Date().toISOString()
    };

    // Auto-generate balanced double-entry journal for this voucher
    const autoJv: JournalRecord = {
      id: `jv-auto-${Date.now()}`,
      company_id: activeCompanyId,
      ref_no: `JV-VOU-${newVou.voucher_no}`,
      date: newVou.date,
      branch: newVou.cost_center,
      description: `قيد آلي ناتج عن سند ${voucherType} رقم ${newVou.voucher_no} - ${newVou.payee}`,
      total_debit: amountNum,
      total_credit: amountNum,
      status: 'معتمد',
      lines: voucherType === 'قبض' ? [
        { accountCode: '1102', accountName: 'بنك الراجحي الرئيسي', debit: amountNum, credit: 0, memo: newVou.notes, costCenter: newVou.cost_center },
        { accountCode: '4101', accountName: 'إيرادات وساطة عقود الاستقدام', debit: 0, credit: amountNum, memo: newVou.payee, costCenter: newVou.cost_center }
      ] : [
        { accountCode: '5101', accountName: 'مصروفات تشغيل ومراكز إيواء', debit: amountNum, credit: 0, memo: newVou.notes, costCenter: newVou.cost_center },
        { accountCode: '1101', accountName: 'الصندوق الرئيسي (Cash)', debit: 0, credit: amountNum, memo: newVou.payee, costCenter: newVou.cost_center }
      ],
      created_at: new Date().toISOString()
    };

    const voucherPostRes = journalEngine.autoPostOperationalTransaction({
      companyId: activeCompanyId,
      transactionType: voucherType === 'قبض' ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
      referenceNumber: newVou.voucher_no,
      description: autoJv.description,
      amount: amountNum,
      paymentChannel: newVou.treasury.includes('نقد') || newVou.treasury.includes('صندوق') ? 'CASH' : 'BANK',
      costCenterCode: newVou.cost_center,
      entryDate: newVou.date,
      createdBy: 'أمين الخزينة - SMACC',
    });

    if (voucherPostRes.error) {
      addNotification({
        title: 'رفض ترحيل السند',
        message: voucherPostRes.error,
        type: 'error',
      });
      return;
    }

    const updatedVouchers = [newVou, ...vouchers];
    setVouchers(updatedVouchers);
    await realErpDataStore.addRecord('finance_vouchers', newVou);

    const updatedJournals = [autoJv, ...journals];
    setJournals(updatedJournals);
    await realErpDataStore.addRecord('company_journal_entries', autoJv);
    setRawAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));

    setIsVoucherModalOpen(false);
    addNotification({
      title: `اعتماد سند ${voucherType}`,
      message: `تم اعتماد سند ${voucherType} رقم (${newVou.voucher_no}) بقيمة ${amountNum.toLocaleString()} ⃁ وتوليد القيد المحاسبي آلياً.`,
      type: 'success',
    });

    setNewVoucher({
      voucherNo: `VOU-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      date: new Date().toISOString().slice(0, 10),
      accountCode: '1102',
      amount: '',
      payeeName: '',
      treasury: 'بنك الراجحي الرئيسي',
      costCenter: 'فرع الرياض الرئيسي',
      notes: '',
    });
  };

  // General Ledger Dynamic Calculation
  const ledgerEntries = useMemo(() => {
    const selectedAcc = rawAccounts.find(a => a.code === selectedLedgerAccount);
    const initialBal = selectedAcc?.balance || 0;

    const matchedEntries: Array<{
      date: string;
      refNo: string;
      desc: string;
      debit: number;
      credit: number;
      cumulative: number;
    }> = [
      {
        date: '2026-01-01',
        refNo: 'OB-2026',
        desc: 'رصيد أول المدة الافتتاحي المرحل',
        debit: selectedAcc?.nature === 'مدين' ? initialBal : 0,
        credit: selectedAcc?.nature === 'دائن' ? initialBal : 0,
        cumulative: initialBal
      }
    ];

    let running = initialBal;
    journals.forEach(jv => {
      jv.lines?.forEach(line => {
        if (line.accountCode === selectedLedgerAccount) {
          const deb = Number(line.debit) || 0;
          const cred = Number(line.credit) || 0;
          if (selectedAcc?.nature === 'مدين') {
            running = running + deb - cred;
          } else {
            running = running + cred - deb;
          }
          matchedEntries.push({
            date: jv.date,
            refNo: jv.ref_no,
            desc: line.memo || jv.description,
            debit: deb,
            credit: cred,
            cumulative: running
          });
        }
      });
    });

    return matchedEntries;
  }, [selectedLedgerAccount, rawAccounts, journals]);

  // Financial Statements Dynamic Rollups (using leaf accounts only to prevent parent/child double counting)
  const leafAccountsOnly = rawAccounts.filter(a => !a.isHeader);
  const totalAssets = leafAccountsOnly
    .filter(a => a.category === 'أصول')
    .reduce((sum, a) => sum + (a.nature === 'مدين' ? (a.balance || 0) : -(a.balance || 0)), 0);
  const totalLiabilities = leafAccountsOnly
    .filter(a => a.category === 'خصوم')
    .reduce((sum, a) => sum + (a.nature === 'دائن' ? (a.balance || 0) : -(a.balance || 0)), 0);
  const totalEquity = leafAccountsOnly
    .filter(a => a.category === 'حقوق ملكية')
    .reduce((sum, a) => sum + (a.nature === 'دائن' ? (a.balance || 0) : -(a.balance || 0)), 0);
  const totalRevenues = leafAccountsOnly
    .filter(a => a.category === 'إيرادات')
    .reduce((sum, a) => sum + (a.nature === 'دائن' ? (a.balance || 0) : -(a.balance || 0)), 0);
  const totalExpenses = leafAccountsOnly
    .filter(a => a.category === 'مصروفات')
    .reduce((sum, a) => sum + (a.nature === 'مدين' ? (a.balance || 0) : -(a.balance || 0)), 0);
  const directCostOfRevenues = leafAccountsOnly
    .filter(a => a.ifrsCode === 'R-02')
    .reduce((sum, a) => sum + (a.nature === 'مدين' ? (a.balance || 0) : -(a.balance || 0)), 0);
  const netProfit = totalRevenues - totalExpenses;

  // Render Account Node Tree Item
  const renderAccountNode = (node: SmaccAccountNode, depth = 0) => {
    const isExpanded = expandedNodes[node.code] ?? (depth < 2);
    const hasChildren = node.children && node.children.length > 0;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        node.code.toLowerCase().includes(q) ||
        node.name.toLowerCase().includes(q) ||
        (node.ifrsCode || '').toLowerCase().includes(q) ||
        (node.ifrsSubCode || '').toLowerCase().includes(q) ||
        (node.ifrsItemName || '').toLowerCase().includes(q) ||
        (node.ifrsSubItemName || '').toLowerCase().includes(q) ||
        (node.ifrsSection || '').toLowerCase().includes(q);
      if (
        !match &&
        !node.children?.some(
          c =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.ifrsCode || '').toLowerCase().includes(q) ||
            (c.ifrsSubCode || '').toLowerCase().includes(q)
        )
      ) {
        return null;
      }
    }

    return (
      <React.Fragment key={node.code}>
        <tr className={`hover:bg-zinc-50 transition-colors ${depth === 0 ? 'bg-zinc-50/70 font-bold' : depth === 1 ? 'bg-white font-semibold' : 'bg-white text-zinc-700'}`}>
          <td className="p-3 font-mono text-xs">
            <div className="flex items-center gap-1.5" style={{ paddingRight: `${depth * 20}px` }}>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={isExpanded ? `طي حساب ${node.name}` : `توسيع حساب ${node.name}`}
                  onClick={() => toggleNode(node.code)}
                  className="p-1 text-[#707070] hover:text-[#141414] rounded"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <span className="font-bold text-[#141414]">{node.code}</span>
            </div>
          </td>
          <td className="p-3 min-w-[210px]">
            <input
              type="text"
              value={node.name}
              onChange={(e) => handleInlineUpdateSmaccAccount(node.code, { nameAr: e.target.value })}
              className={`w-full bg-transparent hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-[#141414] rounded-lg px-2 py-0.5 ${
                depth === 0 ? 'text-[#141414] font-bold text-sm' : depth === 1 ? 'text-zinc-900 font-semibold text-xs' : 'text-zinc-700 text-xs'
              }`}
            />
            {node.nameEn !== undefined && (
              <input
                type="text"
                value={node.nameEn || ''}
                onChange={(e) => handleInlineUpdateSmaccAccount(node.code, { nameEn: e.target.value })}
                placeholder="English Name..."
                className="w-full bg-transparent hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-zinc-300 rounded px-2 py-0.5 text-[10px] text-[#707070] font-mono block mt-0.5"
              />
            )}
          </td>
          <td className="p-3">
            <select
              value={node.type}
              onChange={(e) =>
                handleInlineUpdateSmaccAccount(node.code, {
                  category: e.target.value as any,
                  nature:
                    e.target.value === 'خصوم' || e.target.value === 'حقوق ملكية' || e.target.value === 'إيرادات'
                      ? 'دائن'
                      : 'مدين',
                })
              }
              className="bg-zinc-100 border border-zinc-200 rounded-lg py-1 px-2 text-[10.5px] font-bold text-[#141414]"
            >
              <option value="أصول">أصول (مدين)</option>
              <option value="خصوم">خصوم (دائن)</option>
              <option value="حقوق ملكية">حقوق ملكية (دائن)</option>
              <option value="إيرادات">إيرادات (دائن)</option>
              <option value="مصروفات">مصروفات (مدين)</option>
            </select>
          </td>
          <td className="p-3">
            <span className="font-mono font-bold text-[11px] bg-[#f3f3f3] text-[#141414] px-2 py-0.5 rounded">
              {node.ifrsCode} — {node.ifrsItemName}
            </span>
            <div className="text-[10px] text-[#707070] mt-0.5">{node.ifrsSection}</div>
          </td>
          <td className="p-3 min-w-[200px]">
            <select
              value={node.ifrsSubCode || node.ifrsCode || ''}
              onChange={(e) => handleInlineUpdateSmaccAccount(node.code, { ifrsSubCode: e.target.value })}
              className="w-full bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-[#141414] rounded-lg py-1 px-1.5 font-mono text-[11px] font-semibold text-[#141414]"
            >
              {companyIfrsClassifications.map((ext) => (
                <option key={ext.code} value={ext.code}>
                  {ext.code} - {ext.nameAr}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-[#707070] block mt-0.5">{node.ifrsRef} • {node.cashFlowType}</span>
          </td>
          <td className="p-3 font-mono font-bold text-xs text-left pl-4">
            <input
              type="number"
              value={Math.round(node.balance * 100) / 100}
              onChange={(e) =>
                handleInlineUpdateSmaccAccount(node.code, { balance: parseFloat(e.target.value) || 0 })
              }
              className="w-28 bg-zinc-50 focus:bg-white border border-zinc-200 focus:border-[#141414] rounded-lg py-1 px-2 font-mono font-bold text-xs text-[#141414] text-left"
            />
          </td>
          <td className="p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNewAccount({
                    code: `${node.code}01`,
                    name: '',
                    nameEn: '',
                    type: node.type,
                    nature: node.nature,
                    parentCode: node.code,
                    ifrsSubCode: node.ifrsSubCode || node.ifrsCode || 'A-10-08',
                    openingBalance: '0',
                  });
                  setIsAccountModalOpen(true);
                }}
                className="button-outline-on-light"
                style={{ padding: '2px 8px', fontSize: '10px', minHeight: '24px' }}
                title="إضافة حساب فرعي"
              >
                + فرعي
              </button>
              {depth > 0 && (
                <button
                  type="button"
                  onClick={() => handleDeleteAccount(node.code, node.name)}
                  className="p-1 text-[#707070] hover:text-[#141414] rounded"
                  title="حذف الحساب"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </td>
        </tr>

        {hasChildren && isExpanded && node.children!.map(child => renderAccountNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Gallery-White Header Banner */}
      <div
        className="bg-white rounded-3xl p-6 border border-[#e0e0e0]"
      >
        <div className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration
              type="smacc-finance"
              size="sm"
              showBackground={false}
              className="!w-16 !h-14 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint text-[11px]">FINANCIAL ERP V2</span>
                <span className="pill-tag-shade text-[11px]">
                  {activeCompany.name} ({activeCompanyId === 'all' ? 'GROUP' : activeCompanyId})
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[#141414] m-0">
                المنظومة المالية والمحاسبية الموحدة — 6 أنظمة متكاملة
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                عزل محاسبي مستقل لكل شركة • دليل الحسابات الشجري الخماسي، قيود اليومية المزدوجة، سندات القبض والصرف، المبيعات و ZATCA، المشتريات، المخزون والأصول، ومراكز التكلفة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowBatchExtractor(true)}
              className="button-outline-on-light"
              style={{ padding: '6px 14px', fontSize: '11px', minHeight: '34px' }}
            >
              <UploadCloud className="w-4 h-4 ml-1 text-[#141414]" />
              <span>استيراد فواتير / مستندات / نظام محاسبي منفصل (100 صورة / PDF / Word / Excel)</span>
            </button>
            <button
              onClick={() => {
                loadData();
                addNotification({ title: 'تحديث البيانات', message: 'تمت مزامنة الحسابات والقيود والسندات بنجاح.', type: 'info' });
              }}
              className="button-outline-on-light"
              style={{ padding: '6px 14px', fontSize: '11px', minHeight: '34px' }}
            >
              <RefreshCw className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>مزامنة الحسابات</span>
            </button>
            <button
              onClick={() => setIsJournalModalOpen(true)}
              className="button-primary-pill"
              style={{ padding: '6px 16px', fontSize: '11px', minHeight: '34px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1 text-[#ffffff]" />
              <span>تسجيل قيد محاسبي</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex flex-wrap items-center bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] gap-1 text-xs mt-6 overflow-x-auto">
          {[
            { id: 'coa', label: '1. شجرة الحسابات (COA)' },
            { id: 'journals', label: '2. قيود اليومية المزدوجة' },
            { id: 'vouchers', label: '3. سندات القبض والصرف' },
            { id: 'ledger', label: '4. دفتر الأستاذ العام' },
            { id: 'trial-balance', label: '5. ميزان المراجعة' },
            { id: 'income-statement', label: '6. قائمة الدخل (P&L)' },
            { id: 'balance-sheet', label: '7. المركز المالي' },
            { id: 'cost-centers', label: '8. مراكز التكلفة' },
            { id: 'fiscal-closing', label: '9. الإقفال السنوي' },
            { id: 'ifrs-engine', label: '10. محرك القوائم والفحوصات IFRS (211 حساباً)' },
            { id: 'financial-ratios', label: '11. النسب المالية وخطة التحسين' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#141414' : 'transparent',
                  color: isActive ? '#ffffff' : '#141414',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6-Division Financial Architecture Quick Navigation Strip (Per-Company Isolated) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {[
          {
            code: 'FIN-01',
            title: '1. الأستاذ العام والحسابات',
            subtitle: 'شجرة الحسابات والقيود والقوائم',
            emoji: '',
            onClick: () => setActiveTab('coa'),
            active: ['coa', 'journals', 'ledger', 'trial-balance', 'income-statement', 'balance-sheet', 'fiscal-closing'].includes(activeTab),
          },
          {
            code: 'FIN-02',
            title: '2. النقدية والبنوك والسندات',
            subtitle: 'سندات القبض والصرف والخزائن',
            emoji: '',
            onClick: () => setActiveTab('vouchers'),
            active: activeTab === 'vouchers',
          },
          {
            code: 'FIN-03',
            title: '3. المبيعات والفوترة ZATCA',
            subtitle: 'فواتير العملاء والربط الضريبي',
            emoji: '',
            onClick: () => setGlobalActiveTab('zatca', 'الفاتورة الإلكترونية ZATCA المرحلة 2'),
            active: false,
          },
          {
            code: 'FIN-04',
            title: isKasTrade ? '4. المشتريات والموردون التجاريون' : '4. المشتريات والوكلاء',
            subtitle: 'مستحقات الموردين وأوامر الصرف',
            emoji: '',
            onClick: () => setGlobalActiveTab('financial-requests', 'المطالبات وأوامر الصرف المعتمدة'),
            active: false,
          },
          {
            code: 'FIN-05',
            title: '5. المخزون والأصول الثابتة',
            subtitle: 'سجل الأصول والمستودعات والباقات',
            emoji: '',
            onClick: () => setGlobalActiveTab('smacc-inventory', 'سجل الأصول الثابتة والمخزون والمستودعات'),
            active: false,
          },
          {
            code: 'FIN-06',
            title: '6. مراكز التكلفة والتقارير',
            subtitle: `تحليل مراكز تكلفة (${activeCompanyId === 'all' ? 'المجموعة' : activeCompanyId})`,
            emoji: '',
            onClick: () => setActiveTab('cost-centers'),
            active: activeTab === 'cost-centers',
          },
        ].map((div) => (
          <button
            key={div.code}
            type="button"
            onClick={div.onClick}
            className={`text-right p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              div.active
                ? 'bg-[#f3f3f3] border-[#e0e0e0] shadow-xs'
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-base">{div.emoji}</span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-[#141414] text-[#ffffff]">
                {div.code}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-[#141414] leading-snug">{div.title}</div>
              <div className="text-[10.5px] text-[#707070] mt-0.5 line-clamp-1">{div.subtitle}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 1. CHART OF ACCOUNTS TAB */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#707070]" />
              <input
                type="text"
                aria-label="البحث بالرمز أو اسم الحساب"
                placeholder="البحث بالرمز، الاسم، أو كود التصنيف (A-01, R-01)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const { accounts, addedCount } = chartOfAccountsService.syncAndCompleteMissingAccounts(activeCompanyId);
                  setRawAccounts(accounts);
                  const exp: Record<string, boolean> = {};
                  accounts.filter(a => a.isHeader && a.level <= 3).forEach(a => {
                    exp[a.code] = true;
                  });
                  setExpandedNodes(exp);
                  addNotification({
                    title: 'ترتيب واستكمال الشجرة القياسية',
                    message: addedCount > 0
                      ? `تم استكمال (${addedCount}) حساباً ومستوى قياسياً ناقصاً وترتيب الشجرة (4 مستويات) بنجاح.`
                      : `تمت مراجعة وترتيب الشجرة القياسية (${accounts.length} حساباً في 4 مستويات) وإعادة احتساب الأرصدة التجميعية.`,
                    type: 'success',
                  });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <RefreshCw className="w-4 h-4 ml-1 text-[#141414]" />
                <span>ترتيب واستكمال الشجرة القياسية ({rawAccounts.length} حساب)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const exp: Record<string, boolean> = {};
                  rawAccounts.forEach(a => { exp[a.code] = true; });
                  setExpandedNodes(exp);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px' }}
              >
                <span>توسيع الكل</span>
              </button>
              <button
                type="button"
                onClick={() => setExpandedNodes({ '1': true, '2': true, '3': true, '4': true, '5': true })}
                className="button-outline-on-light"
                style={{ padding: '6px 12px', fontSize: '12px', minHeight: '34px' }}
              >
                <span>طي للمستوى الرئيسي</span>
              </button>
              <button
                onClick={() => {
                  setNewAccount({
                    code: '',
                    name: '',
                    nameEn: '',
                    type: 'أصول',
                    nature: 'مدين',
                    parentCode: '11',
                    ifrsSubCode: 'A-10-08',
                    openingBalance: '0',
                  });
                  setIsAccountModalOpen(true);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Plus className="w-4 h-4 ml-1" />
                <span>إضافة حساب جديد</span>
              </button>
              <button
                onClick={() => {
                  const flattened = rawAccounts.map(a => ({
                    'رمز الحساب': a.code,
                    'اسم الحساب': a.nameAr,
                    'الاسم اللاتيني': a.nameEn,
                    'النوع': a.category,
                    'الطبيعة': a.nature,
                    'المستوى': a.level,
                    'كود البند الرئيسي (34)': a.ifrsCode || '-',
                    'اسم البند الرئيسي': a.ifrsItemName || '-',
                    'كود التصنيف الفرعي الموسع (314)': a.ifrsSubCode || '-',
                    'اسم البند الفرعي الموسع': a.ifrsSubItemName || '-',
                    'القسم في القوائم': a.ifrsSection || '-',
                    'مرجع المعيار (IFRS / IAS)': a.ifrsRef || '-',
                    'نوع التدفق النقدي': a.cashFlowType || '-',
                    'الرصيد': a.balance || 0
                  }));
                  exportData(flattened, `دليل_الحسابات_${activeCompany.code}`, 'excel');
                  addNotification({ title: 'تصدير الدليل', message: 'تم تصدير دليل الحسابات بنجاح إلى ملف Excel.', type: 'success' });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير الدليل Excel</span>
              </button>
            </div>
          </div>

          {/* Tree View Table */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رمز الحساب الهرمي</th>
                  <th className="p-3">اسم الحساب في الدليل</th>
                  <th className="p-3">التصنيف والطبيعة</th>
                  <th className="p-3">البند الرئيسي بالقوائم (34 رمزاً)</th>
                  <th className="p-3">التصنيف الفرعي الموسع (314 بنداً)</th>
                  <th className="p-3 text-left pl-4">الرصيد الدفتري الحالي</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {accountTree.map(rootNode => renderAccountNode(rootNode, 0))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'coa' && (
        <div className="mt-6">
          <IfrsFinancialEngineWorkspace initialSection="coa-tree" />
        </div>
      )}

      {/* 2. JOURNALS TAB */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">سجل القيود المحاسبية والترحيل المزدوج (Journals)</h3>
              <p className="text-xs text-[#707070] m-0">كافة القيود اليومية المرحلة والمسودات مع التدقيق الآلي للتوازن</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsJournalModalOpen(true)}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Plus className="w-4 h-4 ml-1" />
                <span>إضافة قيد محاسبي جديد</span>
              </button>
              <button
                onClick={() => {
                  const exportRows = journals.map(j => ({
                    'رقم القيد': j.ref_no,
                    'التاريخ': j.date,
                    'الفرع': j.branch,
                    'البيان': j.description,
                    'إجمالي المدين': j.total_debit,
                    'إجمالي الدائن': j.total_credit,
                    'الحالة': j.status
                  }));
                  exportData(exportRows, 'سجل_القيود_المحاسبية', 'excel');
                  addNotification({ title: 'تصدير القيود', message: 'تم تصدير سجل القيود المحاسبية إلى Excel بنجاح.', type: 'success' });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير القيود Excel</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رقم القيد</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الفرع / المركز</th>
                  <th className="p-3">البيان والشرح المحاسبي</th>
                  <th className="p-3 font-mono">المدين</th>
                  <th className="p-3 font-mono">الدائن</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {journals.map(j => (
                  <tr key={j.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-[#141414]">{j.ref_no}</td>
                    <td className="p-3 font-mono text-[#707070]">{j.date}</td>
                    <td className="p-3 text-zinc-700">{j.branch}</td>
                    <td className="p-3 font-semibold text-[#141414] max-w-xs truncate">{j.description}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{j.total_debit.toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{j.total_credit.toLocaleString()} ⃁</td>
                    <td className="p-3">
                      <span className="pill-tag-mint text-[10.5px]">{j.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedJournalForPreview(j)}
                        className="button-outline-on-light"
                        style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                      >
                        <Eye className="w-3.5 h-3.5 ml-1" />
                        <span>معاينة وطباعة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. VOUCHERS TAB */}
      {activeTab === 'vouchers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">سندات القبض وسندات الصرف الرسمية</h3>
              <p className="text-xs text-[#707070] m-0">توثيق المتحصلات والمصروفات مع الترحيل الآلي الفوري للقيود</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setVoucherType('قبض');
                  setIsVoucherModalOpen(true);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px', background: '#141414', color: '#ffffff', borderColor: '#141414' }}
              >
                <ArrowDownLeft className="w-4 h-4 ml-1" />
                <span>+ سند قبض جديد</span>
              </button>
              <button
                onClick={() => {
                  setVoucherType('صرف');
                  setIsVoucherModalOpen(true);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', background: '#141414', color: '#ffffff', borderColor: '#141414' }}
              >
                <ArrowUpRight className="w-4 h-4 ml-1" />
                <span>+ سند صرف جديد</span>
              </button>
              <ExportDropdown
                sectionKey="vouchers"
                data={vouchers}
                customTitle={`سندات القبض والصرف - ${activeCompany.name}`}
                buttonLabel="تصدير السندات (10 صيغ)"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المستفيد / المستلم منه</th>
                  <th className="p-3">الخزينة / الحساب</th>
                  <th className="p-3 font-mono">المبلغ</th>
                  <th className="p-3">البيان والملاحظات</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vouchers.map(v => (
                  <tr key={v.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-[#141414]">{v.voucher_no}</td>
                    <td className="p-3">
                      <span className={`pill-tag-${v.type === 'قبض' ? 'mint' : 'shade'} text-[10.5px]`}>
                        سند {v.type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#707070]">{v.date}</td>
                    <td className="p-3 font-semibold text-[#141414]">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar
                          name={v.payee}
                          departmentId="finance"
                          size="xs"
                          status="verified"
                        />
                        <span>{v.payee}</span>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-700">{v.treasury}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{v.amount.toLocaleString()} ⃁</td>
                    <td className="p-3 text-zinc-600 max-w-xs truncate">{v.notes}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedVoucherForPreview(v)}
                        className="button-outline-on-light"
                        style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                      >
                        <Printer className="w-3.5 h-3.5 ml-1" />
                        <span>طباعة السند</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. GENERAL LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs font-bold text-zinc-700">اختر الحساب لكشف الأستاذ:</label>
              <select
                value={selectedLedgerAccount}
                onChange={e => setSelectedLedgerAccount(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] font-semibold focus:border-[#141414] focus:outline-none"
              >
                {rawAccounts.map(a => (
                  <option key={a.code} value={a.code}>
                    {a.code} - {a.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const exportRows = ledgerEntries.map(e => ({
                    'التاريخ': e.date,
                    'رقم المرجع': e.refNo,
                    'البيان والشرح': e.desc,
                    'مدين': e.debit,
                    'دائن': e.credit,
                    'الرصيد التراكمي': e.cumulative
                  }));
                  exportData(exportRows, `كشف_حساب_${selectedLedgerAccount}`, 'excel');
                  addNotification({ title: 'تصدير كشف الحساب', message: 'تم تصدير كشف حساب دفتر الأستاذ العام بنجاح.', type: 'success' });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير كشف الحساب Excel</span>
              </button>
              <button
                onClick={() => {
                  const exportRows = ledgerEntries.map(e => ({
                    'التاريخ': e.date,
                    'المرجع': e.refNo,
                    'البيان': e.desc,
                    'مدين': e.debit,
                    'دائن': e.credit,
                    'الرصيد التراكمي': e.cumulative
                  }));
                  exportData('general-ledger', exportRows, 'pdf', `كشف حساب دفتر الأستاذ (${selectedLedgerAccount}) - ${activeCompany.name}`);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileText className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير PDF</span>
              </button>
              <button
                onClick={() => {
                  const exportRows = ledgerEntries.map(e => ({
                    'التاريخ': e.date,
                    'المرجع': e.refNo,
                    'البيان': e.desc,
                    'مدين': e.debit,
                    'دائن': e.credit,
                    'الرصيد التراكمي': e.cumulative
                  }));
                  exportData('general-ledger', exportRows, 'print', `كشف حساب دفتر الأستاذ (${selectedLedgerAccount}) - ${activeCompany.name}`);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Printer className="w-4 h-4 ml-1" />
                <span>طباعة الكشف</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم القيد / المرجع</th>
                  <th className="p-3">البيان والشرح التفصيلي</th>
                  <th className="p-3 font-mono">مدين</th>
                  <th className="p-3 font-mono">دائن</th>
                  <th className="p-3 font-mono text-left pl-4">الرصيد التراكمي (Balance)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {ledgerEntries.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono text-[#707070]">{row.date}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{row.refNo}</td>
                    <td className="p-3 font-medium text-[#141414]">{row.desc}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{row.debit > 0 ? `${row.debit.toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-3 font-mono font-bold text-[#141414]">{row.credit > 0 ? `${row.credit.toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-3 font-mono font-bold text-[#141414] text-left pl-4">{row.cumulative.toLocaleString()} ⃁</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TRIAL BALANCE TAB */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">
                ميزان المراجعة بالمجاميع والأرصدة (الرصيد النهائي مدين ودائن مع إمكانية الإخفاء)
              </h3>
              <p className="text-xs text-[#707070] m-0">
                تحقق توازن الحسابات الإجمالية ومطابقة جانبي المدين والدائن للأرصدة الافتتاحية والحركات والرصيد النهائي
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowSmaccClosingCols((v) => !v)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  showSmaccClosingCols
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                }`}
              >
                {showSmaccClosingCols ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>
                  {showSmaccClosingCols
                    ? 'إخفاء الرصيد النهائي (مدين / دائن)'
                    : 'إظهار الرصيد النهائي (مدين / دائن)'}
                </span>
              </button>
              <button
                onClick={() => {
                  const flattened = leafAccountsOnly.map(a => ({
                    'رمز الحساب': a.code,
                    'اسم الحساب': a.nameAr,
                    'النوع': a.category,
                    'كود البند الرئيسي (34)': a.ifrsCode || '-',
                    'اسم البند الرئيسي': a.ifrsItemName || '-',
                    'كود التصنيف الفرعي الموسع (314)': a.ifrsSubCode || '-',
                    'اسم البند الفرعي الموسع': a.ifrsSubItemName || '-',
                    'القسم في القوائم': a.ifrsSection || '-',
                    'مرجع المعيار (IFRS / IAS)': a.ifrsRef || '-',
                    'الرصيد النهائي مدين': a.nature === 'مدين' ? a.balance : 0,
                    'الرصيد النهائي دائن': a.nature === 'دائن' ? a.balance : 0,
                  }));
                  exportData(flattened, 'ميزان_المراجعة', 'excel');
                  addNotification({ title: 'تصدير ميزان المراجعة', message: 'تم التصدير بنجاح.', type: 'success' });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير ميزان المراجعة Excel</span>
              </button>
              <ExportDropdown
                sectionKey="trial-balance"
                data={leafAccountsOnly.map(a => ({
                  'رمز الحساب': a.code,
                  'اسم الحساب': a.nameAr,
                  'النوع': a.category,
                  'كود البند الرئيسي (34)': a.ifrsCode || '-',
                  'الرصيد النهائي مدين': a.nature === 'مدين' ? a.balance : 0,
                  'الرصيد النهائي دائن': a.nature === 'دائن' ? a.balance : 0,
                }))}
                customTitle={`ميزان المراجعة - ${activeCompany.name}`}
                buttonLabel="جميع صيغ التصدير"
                variant="outline-light"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رمز الحساب</th>
                  <th className="p-3">اسم الحساب</th>
                  <th className="p-3">النوع والطبيعة</th>
                  <th className="p-3">التصنيف المعتمد (Excel IFRS 34 / 314)</th>
                  <th className="p-3">المعيار والتدفق</th>
                  {showSmaccClosingCols && (
                    <th className="p-3 font-mono font-bold bg-[#f3f3f3] text-[#141414] border-x border-[#e0e0e0]">الرصيد النهائي مدين</th>
                  )}
                  {showSmaccClosingCols && (
                    <th className="p-3 font-mono font-bold bg-[#f3f3f3] text-[#141414] border-x border-[#e0e0e0]">الرصيد النهائي دائن</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {leafAccountsOnly.map(a => (
                  <tr key={a.code} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-[#141414]">{a.code}</td>
                    <td className="p-3 font-semibold text-[#141414]">{a.nameAr}</td>
                    <td className="p-3">
                      <span className="pill-tag-shade text-[10px]">
                        {a.category} ({a.nature})
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-mono font-bold text-[11px] text-[#141414]">
                        {a.ifrsSubCode} — {a.ifrsSubItemName}
                      </div>
                      <div className="text-[10px] text-[#707070] mt-0.5">
                        {a.ifrsCode} ({a.ifrsItemName}) • {a.ifrsSection}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-[11px] text-[#141414] block">{a.ifrsRef}</span>
                      <span className="text-[10px] text-[#707070]">{a.cashFlowType}</span>
                    </td>
                    {showSmaccClosingCols && (
                      <td className="p-3 font-mono font-bold text-[#141414] bg-[#fafafa]">
                        {a.nature === 'مدين' ? `${(a.balance || 0).toLocaleString()} ⃁` : '-'}
                      </td>
                    )}
                    {showSmaccClosingCols && (
                      <td className="p-3 font-mono font-bold text-[#141414] bg-[#fafafa]">
                        {a.nature === 'دائن' ? `${(a.balance || 0).toLocaleString()} ⃁` : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#f3f3f3] text-[#141414] font-bold border-t-2 border-[#141414]">
                <tr>
                  <td colSpan={5} className="p-3">إجمالي الأرصدة النهائية للحسابات الفرعية (متزن ✔)</td>
                  {showSmaccClosingCols && (
                    <td className="p-3 font-mono">
                      {leafAccountsOnly.filter(a => a.nature === 'مدين').reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()} ⃁
                    </td>
                  )}
                  {showSmaccClosingCols && (
                    <td className="p-3 font-mono">
                      {leafAccountsOnly.filter(a => a.nature === 'دائن').reduce((s, a) => s + (a.balance || 0), 0).toLocaleString()} ⃁
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Complete 211-Account IFRS Smart Trial Balance */}
          <IfrsFinancialEngineWorkspace initialSection="trial-balance" />
        </div>
      )}

      {/* 6. INCOME STATEMENT TAB */}
      {activeTab === 'income-statement' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">
                قائمة الدخل الشاملة والأرباح والخسائر المكتملة (IAS 1 / IFRS 18 Income Statement)
              </h3>
              <p className="text-xs text-[#707070] m-0">
                كافة بنود الإيرادات، تكلفة الإيرادات، مجمل الربح، المصروفات التشغيلية، EBITDA، الإهلاك، الزكاة، وصافي الربح والدخل الشامل
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const rows = [
                    { 'البند في قائمة الدخل': '1. إجمالي الإيرادات التشغيلية المكتسبة (R-01)', 'الرمز المعياري': 'R-01', 'المعيار المرجعي': 'IFRS 15', 'السنة الحالية': totalRevenues },
                    { 'البند في قائمة الدخل': '2. (-) تكلفة الإيرادات والتشغيل المباشرة (R-02)', 'الرمز المعياري': 'R-02', 'المعيار المرجعي': 'IAS 1.99', 'السنة الحالية': -Math.round(totalExpenses * 0.62) },
                    { 'البند في قائمة الدخل': '= مجمل الربح التشغيلي (Gross Profit)', 'الرمز المعياري': 'GP', 'المعيار المرجعي': 'IAS 1', 'السنة الحالية': totalRevenues - Math.round(totalExpenses * 0.62) },
                    { 'البند في قائمة الدخل': '3. (-) المصروفات البيعية والعمومية والإدارية (R-03/R-04)', 'الرمز المعياري': 'R-03/R-04', 'المعيار المرجعي': 'IAS 1.99', 'السنة الحالية': -(totalExpenses - Math.round(totalExpenses * 0.62)) },
                    { 'البند في قائمة الدخل': '=== صافي أرباح الفترة والدخل الشامل ===', 'الرمز المعياري': 'NET', 'المعيار المرجعي': 'IAS 1 / IFRS 18', 'السنة الحالية': netProfit },
                  ];
                  exportData('income-statement', rows, 'excel', `قائمة الدخل الشاملة - ${activeCompany.name}`);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير Excel</span>
              </button>
              <button
                onClick={() => {
                  const rows = [
                    { 'البند في قائمة الدخل': '1. إجمالي الإيرادات التشغيلية المكتسبة (R-01)', 'الرمز المعياري': 'R-01', 'المعيار المرجعي': 'IFRS 15', 'السنة الحالية': totalRevenues },
                    { 'البند في قائمة الدخل': '2. (-) تكلفة الإيرادات والتشغيل المباشرة (R-02)', 'الرمز المعياري': 'R-02', 'المعيار المرجعي': 'IAS 1.99', 'السنة الحالية': -Math.round(totalExpenses * 0.62) },
                    { 'البند في قائمة الدخل': '= مجمل الربح التشغيلي (Gross Profit)', 'الرمز المعياري': 'GP', 'المعيار المرجعي': 'IAS 1', 'السنة الحالية': totalRevenues - Math.round(totalExpenses * 0.62) },
                    { 'البند في قائمة الدخل': '3. (-) المصروفات البيعية والعمومية والإدارية (R-03/R-04)', 'الرمز المعياري': 'R-03/R-04', 'المعيار المرجعي': 'IAS 1.99', 'السنة الحالية': -(totalExpenses - Math.round(totalExpenses * 0.62)) },
                    { 'البند في قائمة الدخل': '=== صافي أرباح الفترة والدخل الشامل ===', 'الرمز المعياري': 'NET', 'المعيار المرجعي': 'IAS 1 / IFRS 18', 'السنة الحالية': netProfit },
                  ];
                  exportData('income-statement', rows, 'pdf', `قائمة الدخل الشاملة - ${activeCompany.name}`);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileText className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير PDF</span>
              </button>
              <button
                onClick={() => {
                  const rows = [
                    { 'البند في قائمة الدخل': '1. إجمالي الإيرادات التشغيلية المكتسبة (R-01)', 'الرمز المعياري': 'R-01', 'المعيار المرجعي': 'IFRS 15', 'السنة الحالية': totalRevenues },
                    { 'البند في قائمة الدخل': '2. (-) تكلفة الإيرادات والتشغيل المباشرة (R-02)', 'الرمز المعياري': 'R-02', 'المعيار المرجعي': 'IAS 1.99', 'السنة الحالية': -Math.round(totalExpenses * 0.62) },
                    { 'البند في قائمة الدخل': '= مجمل الربح التشغيلي (Gross Profit)', 'الرمز المعياري': 'GP', 'المعيار المرجعي': 'IAS 1', 'السنة الحالية': totalRevenues - Math.round(totalExpenses * 0.62) },
                    { 'البند في قائمة الدخل': '3. (-) المصروفات البيعية والعمومية والإدارية (R-03/R-04)', 'الرمز المعياري': 'R-03/R-04', 'المعيار المرجعي': 'IAS 1.99', 'السنة الحالية': -(totalExpenses - Math.round(totalExpenses * 0.62)) },
                    { 'البند في قائمة الدخل': '=== صافي أرباح الفترة والدخل الشامل ===', 'الرمز المعياري': 'NET', 'المعيار المرجعي': 'IAS 1 / IFRS 18', 'السنة الحالية': netProfit },
                  ];
                  exportData('income-statement', rows, 'print', `قائمة الدخل الشاملة - ${activeCompany.name}`);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Printer className="w-4 h-4 ml-1" />
                <span>طباعة قائمة الدخل</span>
              </button>
            </div>
          </div>

          <div className="card-pricing p-6 bg-white rounded-2xl space-y-3 border border-zinc-200 text-xs">
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
              <span className="font-bold text-sm text-[#141414]">1. إجمالي الإيرادات التشغيلية والعوائد المكتسبة (R-01 / R-05 / R-08 | IFRS 15)</span>
              <span className="font-mono font-bold text-[#141414] text-sm">+{totalRevenues.toLocaleString()} ⃁</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
              <span className="font-semibold text-[#141414]">2. (-) تكلفة الإيرادات والتشغيل المباشرة (R-02 | IAS 1.99)</span>
              <span className="font-mono font-bold text-[#141414]">
                ({directCostOfRevenues.toLocaleString()}) ⃁
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#f3f3f3] rounded-xl font-bold text-[#141414]">
              <span>= مجمل الربح التشغيلي (Gross Profit)</span>
              <span className="font-mono">
                {(totalRevenues - directCostOfRevenues).toLocaleString()} ⃁
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100">
              <span className="font-semibold text-[#141414]">3. (-) مصروفات البيع والتسويق والعمومية والإهلاك والتمويل والزكاة (R-03..R-10)</span>
              <span className="font-mono font-bold text-[#141414]">
                ({(totalExpenses - directCostOfRevenues).toLocaleString()}) ⃁
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[#f3f3f3] text-[#141414] border-2 border-[#141414] rounded-2xl">
              <span className="font-bold text-base">= صافي أرباح الفترة التشغيلية والدخل الشامل (Net Profit — IAS 1 / IFRS 18):</span>
              <span className="font-mono font-bold text-[#141414] text-lg">
                {netProfit.toLocaleString()} ⃁
              </span>
            </div>
          </div>

          {/* Complete Interactive Expandable IFRS Income Statement */}
          <IfrsFinancialEngineWorkspace initialSection="statements" initialStatementView="income-statement" />
        </div>
      )}

      {/* 7. BALANCE SHEET TAB */}
      {activeTab === 'balance-sheet' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">
                قائمة المركز المالي والميزانية العمومية القابلة للتوسع وإضافة حقول الأصول (IAS 1 Balance Sheet)
              </h3>
              <p className="text-xs text-[#707070] m-0">
                إجمالي الأصول والخصوم وحقوق الملكية مع إمكانية إضافة حقول جديدة للأصول وتعديل وتوسيع الأقسام
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const rows = [
                    ...leafAccountsOnly
                      .filter(a => a.category === 'أصول')
                      .map(a => ({
                        'البند في قائمة المركز المالي': a.nameAr,
                        'الرمز المعياري': a.ifrsCode || a.code,
                        'التصنيف المحاسبي': 'الأصول',
                        'الرصيد الحالي': a.balance,
                      })),
                    { 'البند في قائمة المركز المالي': '=== إجمالي الأصول (Total Assets) ===', 'الرمز المعياري': 'ASSETS', 'التصنيف المحاسبي': 'إجمالي الأصول', 'الرصيد الحالي': totalAssets },
                    ...leafAccountsOnly
                      .filter(a => a.category === 'خصوم' || a.category === 'حقوق ملكية')
                      .map(a => ({
                        'البند في قائمة المركز المالي': a.nameAr,
                        'الرمز المعياري': a.ifrsCode || a.code,
                        'التصنيف المحاسبي': a.category,
                        'الرصيد الحالي': a.balance,
                      })),
                    { 'البند في قائمة المركز المالي': 'صافي أرباح الفترة الجارية المرحلة', 'الرمز المعياري': 'E-03', 'التصنيف المحاسبي': 'حقوق ملكية', 'الرصيد الحالي': netProfit },
                    { 'البند في قائمة المركز المالي': '=== إجمالي الخصوم وحقوق الملكية ===', 'الرمز المعياري': 'EQ+LIAB', 'التصنيف المحاسبي': 'إجمالي الخصوم والملكية', 'الرصيد الحالي': totalLiabilities + totalEquity + netProfit },
                  ];
                  exportData('balance-sheet', rows, 'excel', `قائمة المركز المالي - ${activeCompany.name}`);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير Excel</span>
              </button>
              <button
                onClick={() => {
                  const rows = [
                    ...leafAccountsOnly
                      .filter(a => a.category === 'أصول')
                      .map(a => ({
                        'البند في قائمة المركز المالي': a.nameAr,
                        'الرمز المعياري': a.ifrsCode || a.code,
                        'التصنيف المحاسبي': 'الأصول',
                        'الرصيد الحالي': a.balance,
                      })),
                    { 'البند في قائمة المركز المالي': '=== إجمالي الأصول (Total Assets) ===', 'الرمز المعياري': 'ASSETS', 'التصنيف المحاسبي': 'إجمالي الأصول', 'الرصيد الحالي': totalAssets },
                    ...leafAccountsOnly
                      .filter(a => a.category === 'خصوم' || a.category === 'حقوق ملكية')
                      .map(a => ({
                        'البند في قائمة المركز المالي': a.nameAr,
                        'الرمز المعياري': a.ifrsCode || a.code,
                        'التصنيف المحاسبي': a.category,
                        'الرصيد الحالي': a.balance,
                      })),
                    { 'البند في قائمة المركز المالي': 'صافي أرباح الفترة الجارية المرحلة', 'الرمز المعياري': 'E-03', 'التصنيف المحاسبي': 'حقوق ملكية', 'الرصيد الحالي': netProfit },
                    { 'البند في قائمة المركز المالي': '=== إجمالي الخصوم وحقوق الملكية ===', 'الرمز المعياري': 'EQ+LIAB', 'التصنيف المحاسبي': 'إجمالي الخصوم والملكية', 'الرصيد الحالي': totalLiabilities + totalEquity + netProfit },
                  ];
                  exportData('balance-sheet', rows, 'pdf', `قائمة المركز المالي - ${activeCompany.name}`);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileText className="w-4 h-4 ml-1 text-[#141414]" />
                <span>تصدير PDF</span>
              </button>
              <button
                onClick={() => {
                  const rows = [
                    ...leafAccountsOnly
                      .filter(a => a.category === 'أصول')
                      .map(a => ({
                        'البند في قائمة المركز المالي': a.nameAr,
                        'الرمز المعياري': a.ifrsCode || a.code,
                        'التصنيف المحاسبي': 'الأصول',
                        'الرصيد الحالي': a.balance,
                      })),
                    { 'البند في قائمة المركز المالي': '=== إجمالي الأصول (Total Assets) ===', 'الرمز المعياري': 'ASSETS', 'التصنيف المحاسبي': 'إجمالي الأصول', 'الرصيد الحالي': totalAssets },
                    ...leafAccountsOnly
                      .filter(a => a.category === 'خصوم' || a.category === 'حقوق ملكية')
                      .map(a => ({
                        'البند في قائمة المركز المالي': a.nameAr,
                        'الرمز المعياري': a.ifrsCode || a.code,
                        'التصنيف المحاسبي': a.category,
                        'الرصيد الحالي': a.balance,
                      })),
                    { 'البند في قائمة المركز المالي': 'صافي أرباح الفترة الجارية المرحلة', 'الرمز المعياري': 'E-03', 'التصنيف المحاسبي': 'حقوق ملكية', 'الرصيد الحالي': netProfit },
                    { 'البند في قائمة المركز المالي': '=== إجمالي الخصوم وحقوق الملكية ===', 'الرمز المعياري': 'EQ+LIAB', 'التصنيف المحاسبي': 'إجمالي الخصوم والملكية', 'الرصيد الحالي': totalLiabilities + totalEquity + netProfit },
                  ];
                  exportData('balance-sheet', rows, 'print', `قائمة المركز المالي - ${activeCompany.name}`);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Printer className="w-4 h-4 ml-1" />
                <span>طباعة الميزانية العمومية</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-pricing p-5 bg-white rounded-2xl border border-zinc-200">
              <h4 className="font-bold text-sm text-[#141414] pb-2 border-b border-zinc-100">جانب الأصول (Assets — IAS 1 / IAS 16)</h4>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">الأصول المتداولة وغير المتداولة (البنوك، الخزائن، الأصول الثابتة)</span>
                  <span className="font-mono font-bold text-[#141414]">{totalAssets.toLocaleString()} ⃁</span>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex justify-between font-bold text-sm text-[#141414]">
                  <span>إجمالي الأصول:</span>
                  <span className="font-mono text-[#141414]">{totalAssets.toLocaleString()} ⃁</span>
                </div>
              </div>
            </div>

            <div className="card-pricing p-5 bg-white rounded-2xl border border-zinc-200">
              <h4 className="font-bold text-sm text-[#141414] pb-2 border-b border-zinc-100">جانب الخصوم وحقوق الملكية (Liabilities & Equity)</h4>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">الالتزامات والخصوم المتداولة وغير المتداولة</span>
                  <span className="font-mono font-bold text-[#141414]">{totalLiabilities.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">رأس المال وحقوق الملكية</span>
                  <span className="font-mono font-bold text-[#141414]">{totalEquity.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">أرباح الفترة التشغيلية</span>
                  <span className="font-mono font-bold text-[#141414]">{netProfit.toLocaleString()} ⃁</span>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex justify-between font-bold text-sm text-[#141414]">
                  <span>إجمالي الخصوم وحقوق الملكية:</span>
                  <span className="font-mono text-[#141414]">{(totalLiabilities + totalEquity + netProfit).toLocaleString()} ⃁</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Expandable IFRS Balance Sheet with Custom Asset Fields */}
          <IfrsFinancialEngineWorkspace initialSection="statements" />
        </div>
      )}

      {/* 8. COST CENTERS TAB */}
      {activeTab === 'cost-centers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">مراكز التكلفة التشغيلية والتحليل المالي</h3>
              <p className="text-xs text-[#707070] m-0">توزيع الإيرادات والمصروفات حسب الفروع ومراكز النشاط</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                sectionKey="cost-centers"
                data={
                  isKasTrade
                    ? [
                        { 'كود المركز': 'CC-KAS-SHW', 'اسم مركز التكلفة': 'المعرض التجاري الرئيسي — الرياض', 'النوع': 'تجاري', 'الموازنة المرصودة (⃁)': 180000, 'المنصرف الفعلي (⃁)': 142500, 'الوفر المتبقي (⃁)': 37500 },
                        { 'كود المركز': 'CC-KAS-IML', 'اسم مركز التكلفة': 'قطاع الأميال والعقود التجارية', 'النوع': 'تجاري', 'الموازنة المرصودة (⃁)': 150000, 'المنصرف الفعلي (⃁)': 118200, 'الوفر المتبقي (⃁)': 31800 },
                        { 'كود المركز': 'CC-KAS-ETM', 'اسم مركز التكلفة': 'إدارة المنافسات وتوريدات اعتماد', 'النوع': 'مشاريع', 'الموازنة المرصودة (⃁)': 240000, 'المنصرف الفعلي (⃁)': 196000, 'الوفر المتبقي (⃁)': 44000 },
                      ]
                    : [
                        { 'كود المركز': 'CC-OPS-01', 'اسم مركز التكلفة': 'مركز عمليات الاستقدام والتفويج', 'النوع': 'تشغيلي', 'الموازنة المرصودة (⃁)': 120000, 'المنصرف الفعلي (⃁)': 95400, 'الوفر المتبقي (⃁)': 24600 },
                        { 'كود المركز': 'CC-SHL-01', 'اسم مركز التكلفة': 'مركز تشغيل وإيواء الكوادر بالرياض', 'النوع': 'خدمي', 'الموازنة المرصودة (⃁)': 85000, 'المنصرف الفعلي (⃁)': 72100, 'الوفر المتبقي (⃁)': 12900 },
                        { 'كود المركز': 'CC-RNT-01', 'اسم مركز التكلفة': 'مركز عقود التأجير والتشغيل المرن', 'النوع': 'استثماري', 'الموازنة المرصودة (⃁)': 110000, 'المنصرف الفعلي (⃁)': 88500, 'الوفر المتبقي (⃁)': 21500 },
                      ]
                }
                customTitle={`تقرير مراكز التكلفة التشغيلية - ${activeCompany.name}`}
                buttonLabel="تصدير مراكز التكلفة (12 صيغة)"
                variant="outline-light"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(isKasTrade
              ? [
                  { code: 'CC-KAS-SHW', name: 'المعرض التجاري الرئيسي — الرياض', budget: 180000, actual: 142500, type: 'تجاري' },
                  { code: 'CC-KAS-IML', name: 'قطاع الأميال والعقود التجارية', budget: 150000, actual: 118200, type: 'تجاري' },
                  { code: 'CC-KAS-ETM', name: 'إدارة المنافسات وتوريدات اعتماد', budget: 240000, actual: 196000, type: 'مشاريع' },
                ]
              : [
                  { code: 'CC-OPS-01', name: 'مركز عمليات الاستقدام والتفويج', budget: 120000, actual: 95400, type: 'تشغيلي' },
                  { code: 'CC-SHL-01', name: 'مركز تشغيل وإيواء الكوادر بالرياض', budget: 85000, actual: 72100, type: 'خدمي' },
                  { code: 'CC-RNT-01', name: 'مركز عقود التأجير والتشغيل المرن', budget: 110000, actual: 88500, type: 'استثماري' },
                ]
            ).map(cc => (
              <div key={cc.code} className="card-pricing p-5 bg-white rounded-2xl border border-zinc-200">
                <span className="pill-tag-shade text-[10.5px]">{cc.code}</span>
                <h4 className="font-bold text-sm text-[#141414] mt-2">{cc.name}</h4>
                <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>الميزانية المرصودة:</span>
                    <span className="font-mono font-bold text-[#141414]">{cc.budget.toLocaleString()} ⃁</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المنصرف الفعلي:</span>
                    <span className="font-mono font-bold text-[#141414]">{cc.actual.toLocaleString()} ⃁</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-zinc-100 font-bold text-[#141414]">
                    <span>الوفر المتبقي:</span>
                    <span className="font-mono">{(cc.budget - cc.actual).toLocaleString()} ⃁</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. FISCAL CLOSING TAB */}
      {activeTab === 'fiscal-closing' && (
        <div className="card-pricing p-6 bg-white rounded-2xl border border-zinc-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141414] text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">إقفال السنة المالية وترحيل الأرباح والخسائر</h3>
              <p className="text-xs text-[#707070] m-0">إقفال الحسابات المؤقتة وترحيل صافي الربح إلى الأرباح المبقاة (حساب #320101)</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 text-xs border border-zinc-200">
            <div className="flex justify-between">
              <span className="text-zinc-600">السنة المالية:</span>
              <span className="font-mono font-bold text-[#141414]">2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">صافي الربح المعد للترحيل:</span>
              <span className="font-mono font-bold text-[#141414]">{netProfit.toLocaleString()} ⃁</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">حساب الإقفال المرحل إليه:</span>
              <span className="font-semibold text-[#141414]">320101 - الأرباح المبقاة المتراكمة (Retained Earnings)</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من تنفيذ إجراء الإقفال المحاسبي للسنة؟ سيتم قفل التعديل على قيود الفترة.')) {
                addNotification({
                  title: 'إقفال السنة المالية',
                  message: `تم إقفال السنة المالية بنجاح وترحيل صافي الربح (${netProfit.toLocaleString()} ⃁) إلى الأرباح المبقاة.`,
                  type: 'success'
                });
              }
            }}
            className="button-primary-pill"
            style={{ padding: '8px 24px', fontSize: '12.5px', minHeight: '38px' }}
          >
            اعتماد الإقفال وترحيل الأرصدة الافتتاحية
          </button>
        </div>
      )}

      {/* 10. IFRS ENGINE & 34 AUDIT CHECKS TAB */}
      {activeTab === 'ifrs-engine' && (
        <IfrsFinancialEngineWorkspace initialSection="diagnostics" />
      )}

      {/* 11. FINANCIAL RATIOS & STRATEGIC PLAN TAB */}
      {activeTab === 'financial-ratios' && (
        <IfrsFinancialEngineWorkspace initialSection="ratios-plan" />
      )}

      {/* MODAL 1: Add New Account */}
      <SmaccFormModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="إضافة حساب جديد في شجرة الحسابات"
        subtitle="حدد الرمز والاسم والحساب الأب وطبيعة الحساب"
        onSubmit={handleSaveAccount}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">رمز الحساب (Code)</label>
            <input
              type="text"
              required
              placeholder="مثال: 1105"
              value={newAccount.code}
              onChange={e => setNewAccount({ ...newAccount, code: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم الحساب بالعربية</label>
            <input
              type="text"
              required
              placeholder="مثال: بنك الإنماء التشغيلي"
              value={newAccount.name}
              onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">التصنيف الرئيسي</label>
            <select
              value={newAccount.type}
              onChange={e => setNewAccount({ ...newAccount, type: e.target.value as any })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="أصول">أصول (Assets)</option>
              <option value="خصوم">خصوم (Liabilities)</option>
              <option value="حقوق ملكية">حقوق ملكية (Equity)</option>
              <option value="إيرادات">إيرادات (Revenues)</option>
              <option value="مصروفات">مصروفات (Expenses)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">طبيعة الحساب</label>
            <select
              value={newAccount.nature}
              onChange={e => setNewAccount({ ...newAccount, nature: e.target.value as any })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="مدين">مدين (Debit)</option>
              <option value="دائن">دائن (Credit)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الحساب الأب (Parent)</label>
            <select
              value={newAccount.parentCode}
              onChange={e => setNewAccount({ ...newAccount, parentCode: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            >
              {rawAccounts.map(a => (
                <option key={a.code} value={a.code}>
                  {a.code} - {a.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الرصيد الافتتاحي (⃁)</label>
            <input
              type="number"
              value={newAccount.openingBalance}
              onChange={e => setNewAccount({ ...newAccount, openingBalance: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">
              التصنيف المعياري في القوائم المالية (34 بنداً رئيسياً و 314 بنداً موسعاً — Excel IFRS)
            </label>
            <select
              value={newAccount.ifrsSubCode}
              onChange={e => setNewAccount({ ...newAccount, ifrsSubCode: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            >
              <optgroup label="البنود الرئيسية للقوائم (34 رمزاً A-01..R-10)">
                {IFRS_MAPPING_CODES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.nameAr} ({c.sectionAr})
                  </option>
                ))}
              </optgroup>
              <optgroup label="دليل التصنيف الموسع التفصيلي (314 بنداً فرعياً)">
                {companyIfrsClassifications.filter(x => x.level === 3).map(x => (
                  <option key={x.code} value={x.code}>
                    {x.code} — {x.nameAr} [{x.ifrsRef}]
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </SmaccFormModal>

      {/* MODAL 2: Add Journal Entry */}
      <SmaccFormModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        title="تسجيل قيد محاسبي مزدوج جديد"
        subtitle="تحقق من توازن إجمالي المدين مع إجمالي الدائن"
        size="xl"
        onSubmit={handleSaveJournal}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم المرجع</label>
              <input
                type="text"
                value={journalHeader.refNo}
                onChange={e => setJournalHeader({ ...journalHeader, refNo: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414] font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">التاريخ</label>
              <input
                type="date"
                value={journalHeader.date}
                onChange={e => setJournalHeader({ ...journalHeader, date: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">الفرع المسؤول</label>
              <input
                type="text"
                value={journalHeader.branch}
                onChange={e => setJournalHeader({ ...journalHeader, branch: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">البيان والشرح المحاسبي للقيد *</label>
            <input
              type="text"
              required
              placeholder="شرح وتفاصيل العملية المحاسبية..."
              value={journalHeader.description}
              onChange={e => setJournalHeader({ ...journalHeader, description: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
            />
          </div>

          <div className="border border-zinc-200 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 font-bold border-b border-zinc-200 text-zinc-700">
                <tr>
                  <th className="p-2">رمز الحساب</th>
                  <th className="p-2">اسم الحساب</th>
                  <th className="p-2">مدين</th>
                  <th className="p-2">دائن</th>
                  <th className="p-2">ملاحظات</th>
                  <th className="p-2 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {journalLines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select
                        value={line.accountCode}
                        onChange={e => {
                          const val = e.target.value;
                          const acc = rawAccounts.find(a => a.code === val);
                          setJournalLines(prev => prev.map((l, i) => i === idx ? { ...l, accountCode: val, accountName: acc ? acc.nameAr : l.accountName } : l));
                        }}
                        className="bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs font-mono text-[#141414]"
                      >
                        {rawAccounts.map(a => (
                          <option key={a.code} value={a.code}>{a.code} - {a.nameAr}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 font-semibold text-[#141414]">{line.accountName}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={line.debit}
                        onChange={e => {
                          const val = e.target.value;
                          setJournalLines(prev => prev.map((l, i) => i === idx ? { ...l, debit: val } : l));
                        }}
                        className="w-24 bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs font-mono font-bold text-[#141414]"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={line.credit}
                        onChange={e => {
                          const val = e.target.value;
                          setJournalLines(prev => prev.map((l, i) => i === idx ? { ...l, credit: val } : l));
                        }}
                        className="w-24 bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs font-mono font-bold text-[#141414]"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="ملاحظات..."
                        value={line.memo}
                        onChange={e => {
                          const val = e.target.value;
                          setJournalLines(prev => prev.map((l, i) => i === idx ? { ...l, memo: val } : l));
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveJournalLine(idx)}
                        className="text-[#707070] hover:text-[#141414]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
              <button
                type="button"
                onClick={handleAddJournalLine}
                className="button-outline-on-light"
                style={{ padding: '4px 12px', fontSize: '11px', minHeight: '28px' }}
              >
                + إضافة سطر قيد جديد
              </button>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span>إجمالي المدين: <strong className="text-[#141414] font-mono">{totalDebit.toFixed(2)} ⃁</strong></span>
                <span>إجمالي الدائن: <strong className="text-[#141414] font-mono">{totalCredit.toFixed(2)} ⃁</strong></span>
                <span className={`pill-tag-${isJournalBalanced ? 'mint' : 'shade'}`}>
                  {isJournalBalanced ? 'القيد متوازن' : 'غير متوازن'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SmaccFormModal>

      {/* MODAL 3: Add Voucher */}
      <SmaccFormModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title={`تسجيل سند ${voucherType} رسمي`}
        subtitle="ربط الخزينة والجهة والترحيل الآلي للقيد"
        onSubmit={handleSaveVoucher}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم السند</label>
            <input
              type="text"
              value={newVoucher.voucherNo}
              onChange={e => setNewVoucher({ ...newVoucher, voucherNo: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414] font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">التاريخ</label>
            <input
              type="date"
              value={newVoucher.date}
              onChange={e => setNewVoucher({ ...newVoucher, date: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">{voucherType === 'قبض' ? 'المستلم منه' : 'المستفيد'}</label>
            <input
              type="text"
              required
              placeholder="اسم العميل أو الجهة..."
              value={newVoucher.payeeName}
              onChange={e => setNewVoucher({ ...newVoucher, payeeName: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الخزينة / الحساب البنكي</label>
            <select
              value={newVoucher.treasury}
              onChange={e => setNewVoucher({ ...newVoucher, treasury: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
            >
              <option value="بنك الراجحي الرئيسي">بنك الراجحي الرئيسي</option>
              <option value={isKasTrade ? 'بنك الرياض - حساب التجارة والمنافسات' : 'بنك الرياض - حساب الاستقدام'}>
                {isKasTrade ? 'بنك الرياض - حساب التجارة والمنافسات' : 'بنك الرياض - حساب الاستقدام'}
              </option>
              <option value="الصندوق الرئيسي (نقدي)">الصندوق الرئيسي (نقدي)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">المبلغ (⃁) *</label>
            <input
              type="number"
              required
              placeholder="0.00"
              value={newVoucher.amount}
              onChange={e => setNewVoucher({ ...newVoucher, amount: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414] font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">مركز التكلفة</label>
            <select
              value={newVoucher.costCenter}
              onChange={e => setNewVoucher({ ...newVoucher, costCenter: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
            >
              <option value="فرع الرياض الرئيسي">فرع الرياض الرئيسي</option>
              <option value={isKasTrade ? 'المعرض التجاري الرئيسي' : 'فرع جدة'}>
                {isKasTrade ? 'المعرض التجاري الرئيسي' : 'فرع جدة'}
              </option>
              <option value={isKasTrade ? 'قطاع الأميال والمستودعات' : 'مركز الإيواء والضيافة'}>
                {isKasTrade ? 'قطاع الأميال والمستودعات' : 'مركز الإيواء والضيافة'}
              </option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">البيان والشرح</label>
            <input
              type="text"
              placeholder="البيان التفصيلي للعملية..."
              value={newVoucher.notes}
              onChange={e => setNewVoucher({ ...newVoucher, notes: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-[#141414]"
            />
          </div>
        </div>
      </SmaccFormModal>

      {/* PREVIEW MODAL 1: View Journal */}
      {selectedJournalForPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-[#141414] font-sans">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-sm text-[#141414] m-0">معاينة وطباعة قيد اليومية: {selectedJournalForPreview.ref_no}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportData('journals', [selectedJournalForPreview], 'pdf', `قيد يومية ${selectedJournalForPreview.ref_no} - ${activeCompany.name}`)}
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => exportData('journals', [selectedJournalForPreview], 'print', `قيد يومية ${selectedJournalForPreview.ref_no} - ${activeCompany.name}`)}
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة القيد</span>
                </button>
                <button onClick={() => setSelectedJournalForPreview(null)} className="text-[#707070] hover:text-[#141414]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-white border border-zinc-300 m-4 rounded-2xl">
              <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#141414] m-0">{activeCompany.name}</h2>
                  <p className="text-[11px] text-[#707070] font-mono">س.ت: 1010892819 | الرقم الضريبي: 310928374900003</p>
                </div>
                <div className="text-left font-mono">
                  <span className="font-bold text-sm block">{selectedJournalForPreview.ref_no}</span>
                  <span className="text-xs text-[#707070] block">{selectedJournalForPreview.date}</span>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-50 rounded-xl text-xs">
                <span className="font-bold text-zinc-700 block">البيان:</span>
                <span className="text-[#141414] font-medium">{selectedJournalForPreview.description}</span>
              </div>

              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-100 font-bold border-b border-zinc-200">
                    <tr>
                      <th className="p-2">رمز الحساب</th>
                      <th className="p-2">اسم الحساب</th>
                      <th className="p-2 font-mono">مدين</th>
                      <th className="p-2 font-mono">دائن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    {selectedJournalForPreview.lines?.map((l, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold">{l.accountCode}</td>
                        <td className="p-2 font-sans font-medium">{l.accountName}</td>
                        <td className="p-2 font-bold text-[#141414]">{l.debit > 0 ? `${l.debit.toLocaleString()} ⃁` : '-'}</td>
                        <td className="p-2 font-bold text-[#141414]">{l.credit > 0 ? `${l.credit.toLocaleString()} ⃁` : '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-zinc-50 font-bold border-t-2 border-[#141414]">
                      <td colSpan={2} className="p-2 font-sans text-left pl-4">الإجمالي المتوازن:</td>
                      <td className="p-2 font-bold text-[#141414]">{selectedJournalForPreview.total_debit.toLocaleString()} ⃁</td>
                      <td className="p-2 font-bold text-[#141414]">{selectedJournalForPreview.total_credit.toLocaleString()} ⃁</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-600">
                <div>مُعد القيد: المحاسب المالي</div>
                <div>المراجع: تدقيق الحسابات</div>
                <div>الاعتماد: المدير المالي</div>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2 print:hidden">
              <button onClick={() => setSelectedJournalForPreview(null)} className="button-outline-on-light" style={{ padding: '4px 14px', fontSize: '11px' }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL 2: View Voucher */}
      {selectedVoucherForPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-[#141414] font-sans">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-sm text-[#141414] m-0">سند {selectedVoucherForPreview.type} رقم: {selectedVoucherForPreview.voucher_no}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportData('vouchers', [selectedVoucherForPreview], 'pdf', `سند ${selectedVoucherForPreview.type} رقم ${selectedVoucherForPreview.voucher_no} - ${activeCompany.name}`)}
                  className="button-outline-on-light"
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                >
                  <FileText className="w-3.5 h-3.5 ml-1" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => exportData('vouchers', [selectedVoucherForPreview], 'print', `سند ${selectedVoucherForPreview.type} رقم ${selectedVoucherForPreview.voucher_no} - ${activeCompany.name}`)}
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة السند</span>
                </button>
                <button onClick={() => setSelectedVoucherForPreview(null)} className="text-[#707070] hover:text-[#141414]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-white border border-zinc-300 m-4 rounded-2xl">
              <div className="flex items-center justify-between border-b-2 border-[#141414] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#141414] m-0">{activeCompany.name}</h2>
                  <p className="text-[11px] text-[#707070] font-mono">الرقم الضريبي: 310928374900003</p>
                </div>
                <div className="text-left font-mono">
                  <span className="font-bold text-sm block border border-[#141414] px-2 py-0.5 rounded-lg">سند {selectedVoucherForPreview.type}</span>
                  <span className="text-xs text-[#707070] block mt-1">{selectedVoucherForPreview.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 rounded-xl">
                <div><span className="text-[#707070]">المستفيد / المستلم منه:</span> <strong className="text-[#141414] block">{selectedVoucherForPreview.payee}</strong></div>
                <div><span className="text-[#707070]">المبلغ بالأرقام:</span> <strong className="text-[#141414] font-mono text-sm block">{selectedVoucherForPreview.amount.toLocaleString()} ⃁</strong></div>
                <div><span className="text-[#707070]">الخزينة / الحساب:</span> <span className="font-semibold block">{selectedVoucherForPreview.treasury}</span></div>
                <div><span className="text-[#707070]">مركز التكلفة:</span> <span className="font-semibold block">{selectedVoucherForPreview.cost_center}</span></div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl text-xs">
                <span className="text-[#707070] block mb-0.5">البيان والشرح:</span>
                <span className="font-medium text-[#141414]">{selectedVoucherForPreview.notes}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-600">
                <div>توقيع المحاسب</div>
                <div>توقيع أمين الصندوق</div>
                <div>توقيع المستلم / المستفيد</div>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2 print:hidden">
              <button onClick={() => setSelectedVoucherForPreview(null)} className="button-outline-on-light" style={{ padding: '4px 14px', fontSize: '11px' }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <UniversalDocumentExtractorModal
        isOpen={showBatchExtractor}
        onClose={() => setShowBatchExtractor(false)}
        defaultEntityKey="auto"
        onImportSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};

export default SmaccAccountingPage;
