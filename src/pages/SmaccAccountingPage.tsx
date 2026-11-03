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
import { realErpDataStore } from '../services/realErpDataStore';

export interface SmaccAccountNode {
  code: string;
  name: string;
  nameEn?: string;
  type: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات';
  nature: 'مدين' | 'دائن';
  balance: number;
  level: number;
  parentCode?: string;
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
  }
];

export const SmaccAccountingPage: React.FC = () => {
  const { activeTab: storeActiveTab, setActiveTab: setGlobalActiveTab, addNotification } = useAppStore();
  const { activeCompanyId, activeCompany } = useCompany();

  const mapStoreTabToSmaccTab = (
    tabKey: string
  ): 'coa' | 'cost-centers' | 'journals' | 'vouchers' | 'ledger' | 'trial-balance' | 'income-statement' | 'balance-sheet' | 'fiscal-closing' => {
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
      default:
        return 'coa';
    }
  };

  const [activeTab, setActiveTab] = useState<
    'coa' | 'cost-centers' | 'journals' | 'vouchers' | 'ledger' | 'trial-balance' | 'income-statement' | 'balance-sheet' | 'fiscal-closing'
  >(() => mapStoreTabToSmaccTab(storeActiveTab));

  const [searchQuery, setSearchQuery] = useState('');
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
    return () => window.removeEventListener('erp-data-updated', handleDataUpdated);
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

    // Roll up balances recursively
    const rollup = (node: SmaccAccountNode): number => {
      if (!node.children || node.children.length === 0) return node.balance;
      const childrenSum = node.children.reduce((sum, c) => sum + rollup(c), 0);
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
    openingBalance: string;
  }>({
    code: '',
    name: '',
    nameEn: '',
    type: 'أصول',
    nature: 'مدين',
    parentCode: '11',
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
      isHeader: false
    });

    if (created) {
      setRawAccounts(chartOfAccountsService.getAccountsByCompany(activeCompanyId));
      setIsAccountModalOpen(false);
      addNotification({
        title: 'إضافة حساب جديد',
        message: `تمت إضافة الحساب (${newAccount.name} - #${newAccount.code}) في دليل SMACC بنجاح.`,
        type: 'success',
      });
      setNewAccount({
        code: '',
        name: '',
        nameEn: '',
        type: 'أصول',
        nature: 'مدين',
        parentCode: '11',
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

    const updated = [newJv, ...journals];
    setJournals(updated);
    await realErpDataStore.addRecord('company_journal_entries', newJv);

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

    const updatedVouchers = [newVou, ...vouchers];
    setVouchers(updatedVouchers);
    await realErpDataStore.addRecord('finance_vouchers', newVou);

    const updatedJournals = [autoJv, ...journals];
    setJournals(updatedJournals);
    await realErpDataStore.addRecord('company_journal_entries', autoJv);

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

  // Financial Statements Dynamic Rollups
  const totalAssets = rawAccounts.filter(a => a.category === 'أصول').reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalLiabilities = rawAccounts.filter(a => a.category === 'خصوم').reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalEquity = rawAccounts.filter(a => a.category === 'حقوق ملكية').reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalRevenues = rawAccounts.filter(a => a.category === 'إيرادات').reduce((sum, a) => sum + (a.balance || 0), 0) +
    journals.flatMap(j => j.lines || []).filter(l => l.accountCode.startsWith('4')).reduce((sum, l) => sum + Number(l.credit), 0);
  const totalExpenses = rawAccounts.filter(a => a.category === 'مصروفات').reduce((sum, a) => sum + (a.balance || 0), 0) +
    journals.flatMap(j => j.lines || []).filter(l => l.accountCode.startsWith('5')).reduce((sum, l) => sum + Number(l.debit), 0);
  const netProfit = totalRevenues - totalExpenses;

  // Render Account Node Tree Item
  const renderAccountNode = (node: SmaccAccountNode, depth = 0) => {
    const isExpanded = expandedNodes[node.code] ?? (depth < 2);
    const hasChildren = node.children && node.children.length > 0;

    if (searchQuery) {
      const match = node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    node.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match && !node.children?.some(c => c.name.includes(searchQuery) || c.code.includes(searchQuery))) {
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
                  onClick={() => toggleNode(node.code)}
                  className="p-1 text-zinc-400 hover:text-black rounded"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="w-5" />
              )}
              <span className="font-bold text-black">{node.code}</span>
            </div>
          </td>
          <td className="p-3">
            <span className={depth === 0 ? 'text-black font-bold text-sm' : depth === 1 ? 'text-zinc-900 font-semibold text-xs' : 'text-zinc-700 text-xs'}>
              {node.name}
            </span>
            {node.nameEn && <span className="text-[10px] text-zinc-400 font-mono block">{node.nameEn}</span>}
          </td>
          <td className="p-3">
            <span className="pill-tag-shade text-[10px] py-0.5 px-2">
              {node.type}
            </span>
          </td>
          <td className="p-3 text-xs">
            <span className={node.nature === 'مدين' ? 'text-emerald-700 font-bold' : 'text-[#8C681E] font-bold'}>
              {node.nature}
            </span>
          </td>
          <td className="p-3 font-mono font-bold text-xs text-left pl-4">
            <span className={node.balance >= 0 ? 'text-black' : 'text-rose-700'}>
              {node.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ⃁
            </span>
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
                  className="p-1 text-zinc-400 hover:text-rose-600 rounded"
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
      {/* Cinematic Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
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
                <span className="pill-tag-mint text-[11px]">SMACC FINANCIAL ERP V2</span>
                <span className="pill-tag-shade text-[11px]" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
                  {activeCompany.name} ({activeCompanyId === 'all' ? 'GROUP' : activeCompanyId})
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white m-0">
                منظومة سماك (SMACC) للمحاسبة المالية الموحدة — 6 أنظمة متكاملة
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                عزل محاسبي مستقل لكل شركة • دليل الحسابات الشجري الخماسي، قيود اليومية المزدوجة، سندات القبض والصرف، المبيعات و ZATCA، المشتريات، المخزون والأصول، ومراكز التكلفة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowBatchExtractor(true)}
              className="px-4 py-2 rounded-full bg-[#CFA64A] hover:bg-[#b88f38] text-black font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>استيراد فواتير / مستندات / نظام محاسبي منفصل (100 صورة / PDF / Word / Excel)</span>
            </button>
            <button
              onClick={() => {
                loadData();
                addNotification({ title: 'تحديث البيانات', message: 'تمت مزامنة الحسابات والقيود والسندات بنجاح.', type: 'info' });
              }}
              className="button-outline-on-dark"
              style={{ padding: '6px 14px', fontSize: '11px', minHeight: '34px' }}
            >
              <RefreshCw className="w-3.5 h-3.5 ml-1" />
              <span>مزامنة الحسابات</span>
            </button>
            <button
              onClick={() => setIsJournalModalOpen(true)}
              className="button-white-pill"
              style={{ padding: '6px 16px', fontSize: '11px', minHeight: '34px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1 text-black" />
              <span>تسجيل قيد محاسبي</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex flex-wrap items-center bg-white/10 p-1.5 rounded-full border border-white/15 gap-1 text-xs mt-6 overflow-x-auto">
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
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#000000' : '#d4d4d8',
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

      {/* SMACC 6-Division Architecture Quick Navigation Strip (Per-Company Isolated) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {[
          {
            code: 'SMACC-01',
            title: '1. الأستاذ العام والحسابات',
            subtitle: 'شجرة الحسابات والقيود والقوائم',
            emoji: '',
            onClick: () => setActiveTab('coa'),
            active: ['coa', 'journals', 'ledger', 'trial-balance', 'income-statement', 'balance-sheet', 'fiscal-closing'].includes(activeTab),
          },
          {
            code: 'SMACC-02',
            title: '2. النقدية والبنوك والسندات',
            subtitle: 'سندات القبض والصرف والخزائن',
            emoji: '',
            onClick: () => setActiveTab('vouchers'),
            active: activeTab === 'vouchers',
          },
          {
            code: 'SMACC-03',
            title: '3. المبيعات والفوترة ZATCA',
            subtitle: 'فواتير العملاء والربط الضريبي',
            emoji: '',
            onClick: () => setGlobalActiveTab('zatca', 'الفاتورة الإلكترونية ZATCA المرحلة 2'),
            active: false,
          },
          {
            code: 'SMACC-04',
            title: '4. المشتريات والوكلاء',
            subtitle: 'مستحقات الموردين وأوامر الصرف',
            emoji: '',
            onClick: () => setGlobalActiveTab('financial-requests', 'المطالبات وأوامر الصرف المعتمدة'),
            active: false,
          },
          {
            code: 'SMACC-05',
            title: '5. المخزون والأصول الثابتة',
            subtitle: 'سجل الأصول والمستودعات والباقات',
            emoji: '',
            onClick: () => setGlobalActiveTab('smacc-inventory', 'سجل الأصول الثابتة والمخزون والمستودعات'),
            active: false,
          },
          {
            code: 'SMACC-06',
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
                ? 'bg-[#F5EDDC] border-[#CFA64A] shadow-xs'
                : 'bg-white hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-base">{div.emoji}</span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-black text-[#CFA64A]">
                {div.code}
              </span>
            </div>
            <div>
              <div className="text-xs font-extrabold text-black leading-snug">{div.title}</div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5 line-clamp-1">{div.subtitle}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 1. CHART OF ACCOUNTS TAB */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="البحث بالرمز أو اسم الحساب..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewAccount({
                    code: '',
                    name: '',
                    nameEn: '',
                    type: 'أصول',
                    nature: 'مدين',
                    parentCode: '11',
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
                    'الرصيد': a.balance || 0
                  }));
                  exportData(flattened, `دليل_حسابات_سماك_${activeCompany.code}`, 'excel');
                  addNotification({ title: 'تصدير الدليل', message: 'تم تصدير دليل الحسابات بنجاح إلى ملف Excel.', type: 'success' });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-emerald-600" />
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
                  <th className="p-3">التصنيف المحاسبي</th>
                  <th className="p-3">طبيعة الحساب</th>
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

      {/* 2. JOURNALS TAB */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-black m-0">سجل القيود المحاسبية والترحيل المزدوج (Journals)</h3>
              <p className="text-xs text-zinc-500 m-0">كافة القيود اليومية المرحلة والمسودات مع التدقيق الآلي للتوازن</p>
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
                <FileSpreadsheet className="w-4 h-4 ml-1 text-emerald-600" />
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
                    <td className="p-3 font-mono font-bold text-black">{j.ref_no}</td>
                    <td className="p-3 font-mono text-zinc-500">{j.date}</td>
                    <td className="p-3 text-zinc-700">{j.branch}</td>
                    <td className="p-3 font-semibold text-black max-w-xs truncate">{j.description}</td>
                    <td className="p-3 font-mono font-bold text-black">{j.total_debit.toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono font-bold text-rose-700">{j.total_credit.toLocaleString()} ⃁</td>
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
              <h3 className="text-sm font-bold text-black m-0">سندات القبض وسندات الصرف الرسمية</h3>
              <p className="text-xs text-zinc-500 m-0">توثيق المتحصلات والمصروفات مع الترحيل الآلي الفوري للقيود</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setVoucherType('قبض');
                  setIsVoucherModalOpen(true);
                }}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px', background: '#10b981', borderColor: '#10b981' }}
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
                style={{ padding: '6px 16px', fontSize: '12px', background: '#e11d48', borderColor: '#e11d48' }}
              >
                <ArrowUpRight className="w-4 h-4 ml-1" />
                <span>+ سند صرف جديد</span>
              </button>
              <ExportDropdown
                sectionKey="vouchers"
                data={vouchers}
                customTitle={`سندات القبض والصرف (SMACC) - ${activeCompany.name}`}
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
                    <td className="p-3 font-mono font-bold text-black">{v.voucher_no}</td>
                    <td className="p-3">
                      <span className={`pill-tag-${v.type === 'قبض' ? 'mint' : 'shade'} text-[10.5px]`}>
                        سند {v.type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-zinc-500">{v.date}</td>
                    <td className="p-3 font-semibold text-black">
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
                    <td className="p-3 font-mono font-bold text-emerald-700">{v.amount.toLocaleString()} ⃁</td>
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
                className="bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-black font-semibold focus:border-black focus:outline-none"
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
                <FileSpreadsheet className="w-4 h-4 ml-1 text-emerald-600" />
                <span>تصدير كشف الحساب Excel</span>
              </button>
              <button
                onClick={() => window.print()}
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
                    <td className="p-3 font-mono text-zinc-500">{row.date}</td>
                    <td className="p-3 font-mono font-bold text-black">{row.refNo}</td>
                    <td className="p-3 font-medium text-black">{row.desc}</td>
                    <td className="p-3 font-mono font-bold text-black">{row.debit > 0 ? `${row.debit.toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-3 font-mono font-bold text-rose-700">{row.credit > 0 ? `${row.credit.toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-3 font-mono font-extrabold text-black text-left pl-4">{row.cumulative.toLocaleString()} ⃁</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TRIAL BALANCE TAB */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-black m-0">ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</h3>
              <p className="text-xs text-zinc-500 m-0">تحقق توازن الحسابات الإجمالية ومطابقة جانبي المدين والدائن</p>
            </div>
            <button
              onClick={() => {
                const flattened = rawAccounts.map(a => ({
                  'رمز الحساب': a.code,
                  'اسم الحساب': a.nameAr,
                  'النوع': a.category,
                  'أرصدة مدينة': a.nature === 'مدين' ? a.balance : 0,
                  'أرصدة دائنة': a.nature === 'دائن' ? a.balance : 0,
                }));
                exportData(flattened, 'ميزان_المراجعة', 'excel');
                addNotification({ title: 'تصدير ميزان المراجعة', message: 'تم التصدير بنجاح.', type: 'success' });
              }}
              className="button-outline-on-light"
              style={{ padding: '6px 14px', fontSize: '12px', minHeight: '34px' }}
            >
              <FileSpreadsheet className="w-4 h-4 ml-1 text-emerald-600" />
              <span>تصدير ميزان المراجعة Excel</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">رمز الحساب</th>
                  <th className="p-3">اسم الحساب</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3 font-mono">الرصيد المدين</th>
                  <th className="p-3 font-mono">الرصيد الدائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rawAccounts.map(a => (
                  <tr key={a.code} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-black">{a.code}</td>
                    <td className="p-3 font-semibold text-black">{a.nameAr}</td>
                    <td className="p-3"><span className="pill-tag-shade text-[10px]">{a.category}</span></td>
                    <td className="p-3 font-mono font-bold text-black">{a.nature === 'مدين' ? `${(a.balance || 0).toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-3 font-mono font-bold text-rose-700">{a.nature === 'دائن' ? `${(a.balance || 0).toLocaleString()} ⃁` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. INCOME STATEMENT TAB */}
      {activeTab === 'income-statement' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-black m-0">قائمة الدخل والأرباح والخسائر (Income Statement)</h3>
              <p className="text-xs text-zinc-500 m-0">مقارنة الإيرادات التشغيلية بالمصروفات لحساب صافي الربح</p>
            </div>
            <button
              onClick={() => window.print()}
              className="button-primary-pill"
              style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
            >
              <Printer className="w-4 h-4 ml-1" />
              <span>طباعة قائمة الدخل</span>
            </button>
          </div>

          <div className="card-pricing p-6 bg-white rounded-2xl space-y-4 border border-zinc-200">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <span className="font-bold text-sm text-black">إجمالي الإيرادات التشغيلية المكتسبة</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">+{totalRevenues.toLocaleString()} ⃁</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
              <span className="font-bold text-sm text-black">خصم: تكلفة التشغيل والمصروفات العمومية</span>
              <span className="font-mono font-bold text-rose-700 text-sm">‎- ⃁</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-black text-white rounded-2xl">
              <span className="font-bold text-base">صافي أرباح الفترة التشغيلية (Net Profit):</span>
              <span className="font-mono font-extrabold text-emerald-400 text-lg">
                {netProfit.toLocaleString()} ⃁
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. BALANCE SHEET TAB */}
      {activeTab === 'balance-sheet' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-black m-0">قائمة المركز المالي والميزانية العمومية (Balance Sheet)</h3>
              <p className="text-xs text-zinc-500 m-0">إجمالي الأصول والخصوم وحقوق الملكية وفق المعادلة المحاسبية</p>
            </div>
            <button
              onClick={() => window.print()}
              className="button-primary-pill"
              style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
            >
              <Printer className="w-4 h-4 ml-1" />
              <span>طباعة الميزانية العمومية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-pricing p-5 bg-white rounded-2xl border border-zinc-200">
              <h4 className="font-bold text-sm text-black pb-2 border-b border-zinc-100">جانب الأصول (Assets)</h4>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">الأصول المتداولة (البنوك، الخزائن، الأمانات)</span>
                  <span className="font-mono font-bold text-black">{totalAssets.toLocaleString()} ⃁</span>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex justify-between font-bold text-sm text-black">
                  <span>إجمالي الأصول:</span>
                  <span className="font-mono text-emerald-700">{totalAssets.toLocaleString()} ⃁</span>
                </div>
              </div>
            </div>

            <div className="card-pricing p-5 bg-white rounded-2xl border border-zinc-200">
              <h4 className="font-bold text-sm text-black pb-2 border-b border-zinc-100">جانب الخصوم وحقوق الملكية (Liabilities & Equity)</h4>
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-600">الالتزامات والخصوم المتداولة</span>
                  <span className="font-mono font-bold text-black">{totalLiabilities.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">رأس المال وحقوق الملكية</span>
                  <span className="font-mono font-bold text-black">{totalEquity.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">أرباح الفترة التشغيلية</span>
                  <span className="font-mono font-bold text-emerald-700">{netProfit.toLocaleString()} ⃁</span>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex justify-between font-bold text-sm text-black">
                  <span>إجمالي الخصوم وحقوق الملكية:</span>
                  <span className="font-mono text-amber-700">{(totalLiabilities + totalEquity + netProfit).toLocaleString()} ⃁</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. COST CENTERS TAB */}
      {activeTab === 'cost-centers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-black m-0">مراكز التكلفة التشغيلية والتحليل المالي</h3>
              <p className="text-xs text-zinc-500 m-0">توزيع الإيرادات والمصروفات حسب الفروع ومراكز النشاط</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { code: 'CC-OPS-01', name: 'مركز عمليات الاستقدام والتفويج', budget: 120000, actual: 95400, type: 'تشغيلي' },
              { code: 'CC-SHL-01', name: 'مركز تشغيل وإيواء الكوادر بالرياض', budget: 85000, actual: 72100, type: 'خدمي' },
              { code: 'CC-RNT-01', name: 'مركز عقود التأجير والتشغيل المرن', budget: 110000, actual: 88500, type: 'استثماري' },
            ].map(cc => (
              <div key={cc.code} className="card-pricing p-5 bg-white rounded-2xl border border-zinc-200">
                <span className="pill-tag-shade text-[10.5px]">{cc.code}</span>
                <h4 className="font-bold text-sm text-black mt-2">{cc.name}</h4>
                <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>الميزانية المرصودة:</span>
                    <span className="font-mono font-bold text-black">{cc.budget.toLocaleString()} ⃁</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المنصرف الفعلي:</span>
                    <span className="font-mono font-bold text-rose-700">{cc.actual.toLocaleString()} ⃁</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-zinc-100 font-bold text-emerald-700">
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
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-black m-0">إقفال السنة المالية وترحيل الأرباح والخسائر</h3>
              <p className="text-xs text-zinc-500 m-0">إقفال الحسابات المؤقتة وترحيل صافي الربح إلى الأرباح المبقاة (حساب #3102)</p>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 text-xs border border-zinc-200">
            <div className="flex justify-between">
              <span className="text-zinc-600">السنة المالية:</span>
              <span className="font-mono font-bold text-black">2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">صافي الربح المعد للترحيل:</span>
              <span className="font-mono font-bold text-emerald-700">{netProfit.toLocaleString()} ⃁</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">حساب الإقفال المرحل إليه:</span>
              <span className="font-semibold text-black">3102 - الأرباح المبقاة (Retained Earnings)</span>
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

      {/* MODAL 1: Add New Account */}
      <SmaccFormModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="إضافة حساب جديد في شجرة SMACC"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">التصنيف الرئيسي</label>
            <select
              value={newAccount.type}
              onChange={e => setNewAccount({ ...newAccount, type: e.target.value as any })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
            />
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
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">التاريخ</label>
              <input
                type="date"
                value={journalHeader.date}
                onChange={e => setJournalHeader({ ...journalHeader, date: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">الفرع المسؤول</label>
              <input
                type="text"
                value={journalHeader.branch}
                onChange={e => setJournalHeader({ ...journalHeader, branch: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
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
                        className="bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs font-mono text-black"
                      >
                        {rawAccounts.map(a => (
                          <option key={a.code} value={a.code}>{a.code} - {a.nameAr}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 font-semibold text-black">{line.accountName}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={line.debit}
                        onChange={e => {
                          const val = e.target.value;
                          setJournalLines(prev => prev.map((l, i) => i === idx ? { ...l, debit: val } : l));
                        }}
                        className="w-24 bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs font-mono font-bold text-black"
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
                        className="w-24 bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-xs font-mono font-bold text-rose-700"
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
                        className="text-zinc-400 hover:text-rose-600"
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
                <span>إجمالي المدين: <strong className="text-black font-mono">{totalDebit.toFixed(2)} ⃁</strong></span>
                <span>إجمالي الدائن: <strong className="text-rose-700 font-mono">{totalCredit.toFixed(2)} ⃁</strong></span>
                <span className={`pill-tag-${isJournalBalanced ? 'mint' : 'shade'}`}>
                  {isJournalBalanced ? '✓ القيد متوازن' : '✕ غير متوازن'}
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">التاريخ</label>
            <input
              type="date"
              value={newVoucher.date}
              onChange={e => setNewVoucher({ ...newVoucher, date: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الخزينة / الحساب البنكي</label>
            <select
              value={newVoucher.treasury}
              onChange={e => setNewVoucher({ ...newVoucher, treasury: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
            >
              <option value="بنك الراجحي الرئيسي">بنك الراجحي الرئيسي</option>
              <option value="بنك الرياض - حساب الاستقدام">بنك الرياض - حساب الاستقدام</option>
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">مركز التكلفة</label>
            <select
              value={newVoucher.costCenter}
              onChange={e => setNewVoucher({ ...newVoucher, costCenter: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
            >
              <option value="فرع الرياض الرئيسي">فرع الرياض الرئيسي</option>
              <option value="فرع جدة">فرع جدة</option>
              <option value="مركز الإيواء والضيافة">مركز الإيواء والضيافة</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">البيان والشرح</label>
            <input
              type="text"
              placeholder="البيان التفصيلي للعملية..."
              value={newVoucher.notes}
              onChange={e => setNewVoucher({ ...newVoucher, notes: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black"
            />
          </div>
        </div>
      </SmaccFormModal>

      {/* PREVIEW MODAL 1: View Journal */}
      {selectedJournalForPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-black font-sans">
            <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white m-0">معاينة وطباعة قيد اليومية: {selectedJournalForPreview.ref_no}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#10b981', color: '#000', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة القيد</span>
                </button>
                <button onClick={() => setSelectedJournalForPreview(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-white border border-zinc-300 m-4 rounded-2xl">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div>
                  <h2 className="text-base font-bold text-black m-0">{activeCompany.name}</h2>
                  <p className="text-[11px] text-zinc-500 font-mono">س.ت: 1010892819 | الرقم الضريبي: 310928374900003</p>
                </div>
                <div className="text-left font-mono">
                  <span className="font-bold text-sm block">{selectedJournalForPreview.ref_no}</span>
                  <span className="text-xs text-zinc-500 block">{selectedJournalForPreview.date}</span>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-50 rounded-xl text-xs">
                <span className="font-bold text-zinc-700 block">البيان:</span>
                <span className="text-black font-medium">{selectedJournalForPreview.description}</span>
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
                        <td className="p-2 font-bold text-black">{l.debit > 0 ? `${l.debit.toLocaleString()} ⃁` : '-'}</td>
                        <td className="p-2 font-bold text-rose-700">{l.credit > 0 ? `${l.credit.toLocaleString()} ⃁` : '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-zinc-50 font-bold border-t-2 border-black">
                      <td colSpan={2} className="p-2 font-sans text-left pl-4">الإجمالي المتوازن:</td>
                      <td className="p-2 font-extrabold text-black">{selectedJournalForPreview.total_debit.toLocaleString()} ⃁</td>
                      <td className="p-2 font-extrabold text-rose-700">{selectedJournalForPreview.total_credit.toLocaleString()} ⃁</td>
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
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-black font-sans">
            <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white m-0">سند {selectedVoucherForPreview.type} رقم: {selectedVoucherForPreview.voucher_no}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#10b981', color: '#000', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة السند</span>
                </button>
                <button onClick={() => setSelectedVoucherForPreview(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-white border border-zinc-300 m-4 rounded-2xl">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div>
                  <h2 className="text-base font-bold text-black m-0">{activeCompany.name}</h2>
                  <p className="text-[11px] text-zinc-500 font-mono">الرقم الضريبي: 310928374900003</p>
                </div>
                <div className="text-left font-mono">
                  <span className="font-bold text-sm block border border-black px-2 py-0.5 rounded-lg">سند {selectedVoucherForPreview.type}</span>
                  <span className="text-xs text-zinc-500 block mt-1">{selectedVoucherForPreview.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 rounded-xl">
                <div><span className="text-zinc-500">المستفيد / المستلم منه:</span> <strong className="text-black block">{selectedVoucherForPreview.payee}</strong></div>
                <div><span className="text-zinc-500">المبلغ بالأرقام:</span> <strong className="text-black font-mono text-sm block">{selectedVoucherForPreview.amount.toLocaleString()} ⃁</strong></div>
                <div><span className="text-zinc-500">الخزينة / الحساب:</span> <span className="font-semibold block">{selectedVoucherForPreview.treasury}</span></div>
                <div><span className="text-zinc-500">مركز التكلفة:</span> <span className="font-semibold block">{selectedVoucherForPreview.cost_center}</span></div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl text-xs">
                <span className="text-zinc-500 block mb-0.5">البيان والشرح:</span>
                <span className="font-medium text-black">{selectedVoucherForPreview.notes}</span>
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
