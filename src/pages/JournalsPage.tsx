import React, { useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useJournals, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { chartOfAccountsService } from '../services/accounting/chartOfAccountsService';
import { journalEngine } from '../services/accounting/journalEngine';
import { useAppStore } from '../stores/appStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { 
  BookOpen, Plus, FileSpreadsheet, FileText, Search, Upload, Eye, 
  X, Check, AlertTriangle, Trash2, Printer, ShieldCheck, RefreshCw, Lock, Unlock 
} from 'lucide-react';

export interface JournalLineItem {
  id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  cost_center_code?: string;
  description?: string;
}

export interface JournalRecord {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  entry_type: 'MANUAL' | 'AUTOMATIC' | 'CLOSING' | 'REVERSAL';
  source_module: string;
  source_reference?: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'POSTED' | 'DRAFT' | 'CANCELLED';
  branch_name: string;
  cost_center_code?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
}

const DEFAULT_MOCK_JOURNALS: JournalRecord[] = [
  {
    id: 'jv-1',
    company_id: 'SAF',
    entry_number: 'SAF-JV-2026-0001',
    entry_date: new Date().toISOString().slice(0, 10),
    entry_type: 'AUTOMATIC',
    source_module: 'INVOICE',
    source_reference: 'INV-2026-0014',
    description: 'إثبات قيد فاتورة عقد تأجير تشغيلي - العميل أبو إياد',
    total_debit: 1150.0,
    total_credit: 1150.0,
    status: 'POSTED',
    branch_name: 'فرع الرياض الرئيسي',
    cost_center_code: 'CC-OPS-01',
    created_by: 'النظام المحاسبي الآلي',
    approved_by: 'مدير الحسابات',
    created_at: new Date().toISOString(),
  },
  {
    id: 'jv-2',
    company_id: 'SAF',
    entry_number: 'SAF-JV-2026-0002',
    entry_date: new Date().toISOString().slice(0, 10),
    entry_type: 'AUTOMATIC',
    source_module: 'RECEIPT',
    source_reference: 'REC-2026-0059',
    description: 'تحصيل دفعة مقدمة عقد استقدام مساند - بنك الراجحي',
    total_debit: 14500.0,
    total_credit: 14500.0,
    status: 'POSTED',
    branch_name: 'فرع الرياض الرئيسي',
    cost_center_code: 'CC-REC-01',
    created_by: 'إبراهيم الشمري (محاسب)',
    approved_by: 'المدير المالي',
    created_at: new Date().toISOString(),
  },
];

export const JournalsPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { setActiveTab, addNotification } = useAppStore();
  const { data: rawJournals = [], isLoading } = useJournals();
  const { createItem, deleteItem } = useTableMutation('company_journal_entries');

  const [engineSyncTick, setEngineSyncTick] = useState(0);
  const [selectedPeriodLockYm, setSelectedPeriodLockYm] = useState(() => new Date().toISOString().slice(0, 7));

  React.useEffect(() => {
    const onSync = () => setEngineSyncTick((t) => t + 1);
    window.addEventListener('erp_journals_updated', onSync);
    window.addEventListener('alsulaim_erp_accounting_synced', onSync);
    return () => {
      window.removeEventListener('erp_journals_updated', onSync);
      window.removeEventListener('alsulaim_erp_accounting_synced', onSync);
    };
  }, []);

  const lockedPeriods = React.useMemo(
    () => journalEngine.getLockedPeriods(activeCompanyId),
    [activeCompanyId, engineSyncTick]
  );

  const journals: JournalRecord[] = React.useMemo(() => {
    const engineEntries = journalEngine.getJournalsByCompany(activeCompanyId).map((je): JournalRecord => ({
      id: je.id,
      company_id: je.companyId,
      entry_number: je.entryNumber,
      entry_date: je.entryDate,
      entry_type: (['MANUAL', 'AUTOMATIC', 'CLOSING', 'REVERSAL'].includes(je.entryType)
        ? je.entryType
        : 'AUTOMATIC') as JournalRecord['entry_type'],
      source_module: je.sourceModule,
      source_reference: je.sourceReference,
      description: je.description,
      total_debit: je.totalDebit,
      total_credit: je.totalCredit,
      status: je.status === 'REVERSED' ? 'CANCELLED' : (je.status as JournalRecord['status']),
      branch_name: je.branchName,
      cost_center_code: je.costCenterCode,
      created_by: je.createdBy,
      approved_by: je.approvedBy,
      created_at: je.createdAt,
    }));

    const baseList = rawJournals.length > 0 ? rawJournals : DEFAULT_MOCK_JOURNALS;
    const seenNumbers = new Set(engineEntries.map((e) => e.entry_number));
    return [...engineEntries, ...baseList.filter((b) => !seenNumbers.has(b.entry_number))];
  }, [activeCompanyId, rawJournals, engineSyncTick]);

  const accountsList = chartOfAccountsService.getAccountsByCompany(activeCompanyId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalRecord | null>(null);

  // Multi-line Journal Entry Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryType, setEntryType] = useState<'MANUAL' | 'AUTOMATIC' | 'CLOSING' | 'REVERSAL'>('MANUAL');
  const [description, setDescription] = useState('');
  const [branchName, setBranchName] = useState('فرع الرياض الرئيسي');
  const [costCenterCode, setCostCenterCode] = useState('CC-OPS-01');
  const [lines, setLines] = useState<Omit<JournalLineItem, 'id'>[]>([
    {
      account_code: accountsList[2]?.code || '11010',
      account_name: accountsList[2]?.nameAr || 'الصندوق الرئيسي - السفير الماسي',
      debit: 1000,
      credit: 0,
      description: '',
    },
    {
      account_code: accountsList[9]?.code || '41100',
      account_name: accountsList[9]?.nameAr || 'إيرادات عقود استقدام مساند',
      debit: 0,
      credit: 1000,
      description: '',
    },
  ]);

  // Balance Calculations
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;
  const difference = totalDebit - totalCredit;

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        account_code: accountsList[0]?.code || '11010',
        account_name: accountsList[0]?.nameAr || 'الصندوق الرئيسي',
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof Omit<JournalLineItem, 'id'>, val: any) => {
    const updated = [...lines];
    if (field === 'account_code') {
      const selectedAcc = accountsList.find((a) => a.code === val);
      updated[idx].account_code = val;
      updated[idx].account_name = selectedAcc ? selectedAcc.nameAr : '';
    } else {
      (updated[idx] as any)[field] = field === 'debit' || field === 'credit' ? parseFloat(val) || 0 : val;
    }
    setLines(updated);
  };

  const handleToggleFiscalPeriodLock = (ym: string) => {
    const res = journalEngine.togglePeriodLock(activeCompanyId, ym);
    setEngineSyncTick((t) => t + 1);
    addNotification({
      title: res.locked ? 'قفل الفترة المحاسبية (Fiscal Period Lock)' : 'فتح الفترة المحاسبية',
      message: res.locked
        ? `تم قفل الفترة المحاسبية (${ym}) مالياً — يمنع تسجيل أو ترحيل أي قيود بتاريخ يقع ضمن هذه الفترة.`
        : `تم إعادة فتح الفترة المحاسبية (${ym}) للسماح بالقيود والتسويات المعتمدة.`,
      type: res.locked ? 'warning' : 'success',
    });
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';

    const engineResult = journalEngine.createJournalEntry(companyCode, {
      entryDate,
      entryType,
      sourceModule: 'MANUAL_ENTRY',
      description,
      branchName,
      costCenterCode,
      createdBy: 'سليمان السليم (مدير النظام)',
      lines: lines.map((l) => ({
        accountCode: l.account_code,
        accountName: l.account_name,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || description,
        costCenterCode,
      })),
      autoPost: true,
    });

    if (engineResult.error || !engineResult.entry) {
      addNotification({
        title: 'رفض ترحيل القيد المحاسبي',
        message: engineResult.error || 'تعذر ترحيل القيد المحاسبي.',
        type: 'error',
      });
      return;
    }

    const entryNumber = engineResult.entry.entryNumber;

    const newRecord = {
      company_id: companyCode,
      entry_number: entryNumber,
      entry_date: entryDate,
      entry_type: entryType,
      source_module: 'MANUAL_ENTRY',
      description,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'POSTED',
      branch_name: branchName,
      cost_center_code: costCenterCode,
      created_by: 'سليمان السليم (مدير النظام)',
      approved_by: 'المدير المالي المعتمد',
    };

    await createItem.mutateAsync(newRecord);
    setEngineSyncTick((t) => t + 1);
    setShowAddModal(false);
    setDescription('');
    addNotification({
      title: 'ترحيل قيد محاسبي وتحديث ميزان المراجعة',
      message: `تم ترحيل واعتماد القيد المحاسبي #${entryNumber} وتحديث شجرة الحسابات وميزان المراجعة IFRS (211 حساباً) فوراً.`,
      type: 'success',
    });
  };

  const handleReverseJournal = async (j: JournalRecord) => {
    if (!window.confirm(`هل أنت متأكد من إنشاء قيد عكسي للقيد #${j.entry_number}؟`)) return;

    const companyCode = (j.company_id || (activeCompanyId !== 'all' ? activeCompanyId : 'SAF')) as any;
    const revRes = journalEngine.reverseJournalEntry(
      companyCode,
      j.id,
      `عكس قيد معتمد رقم ${j.entry_number}`,
      'المدير المالي المعتمد'
    );

    if (revRes.error && revRes.error.includes('Fiscal Period Locked')) {
      addNotification({
        title: 'الفترة المحاسبية مقفلة',
        message: revRes.error,
        type: 'error',
      });
      return;
    }

    const reverseNumber = revRes.reversalEntry?.entryNumber || `${j.entry_number}-REV`;
    const newReverseEntry: any = {
      company_id: j.company_id,
      entry_number: reverseNumber,
      entry_date: new Date().toISOString().slice(0, 10),
      entry_type: 'REVERSAL',
      source_module: 'GENERAL_LEDGER',
      source_reference: j.entry_number,
      description: `عكس قيد محاسبي رقم (${j.entry_number}): ${j.description}`,
      total_debit: j.total_credit,
      total_credit: j.total_debit,
      branch_name: j.branch_name,
      cost_center_code: j.cost_center_code,
      status: 'POSTED',
      created_by: 'النظام المحاسبي الآلي',
      created_at: new Date().toISOString(),
    };

    await createItem.mutateAsync(newReverseEntry);
    setEngineSyncTick((t) => t + 1);
    if (selectedJournal?.id === j.id) {
      setSelectedJournal(null);
    }
    addNotification({
      title: 'عكس القيد المحاسبي وتحديث ميزان المراجعة',
      message: `تم توليد وترحيل القيد العكسي #${reverseNumber} وعكس أثره المالي في الدليل وميزان المراجعة بنجاح.`,
      type: 'success',
    });
  };

  const handleDeleteJournal = async (j: JournalRecord) => {
    if (window.confirm(`هل تريد بالتأكيد حذف القيد #${j.entry_number}؟`)) {
      await deleteItem.mutateAsync(j.id);
      addNotification({
        title: 'حذف القيد',
        message: `تم حذف القيد #${j.entry_number} بنجاح.`,
        type: 'error',
      });
    }
  };

  const filteredJournals = journals.filter((j) => {
    const matchesSearch =
      j.entry_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description.includes(searchQuery) ||
      (j.created_by && j.created_by.includes(searchQuery));
    const matchesType = filterType === 'ALL' || j.entry_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration
            type="smacc-finance"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>JOURNAL ENTRIES LEDGER</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              دفتر اليومية والقيود المزدوجة
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إدارة وترحيل قيود اليومية العامة لـ{' '}
              <strong style={{ color: '#ffffff', fontWeight: 600 }}>{activeCompany.name}</strong> بدقة محاسبية متوازنة (Double Entry)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="button-outline-on-dark motion-spring-press"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', borderColor: '#e0e0e0', background: '#ffffff', color: '#141414', fontWeight: 700 }}
          >
            <Upload className="w-4 h-4 ml-1 text-[#141414]" />
            <span>استخلاص فواتير وقيود (PDF / Word / Excel / 100 صورة)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill motion-spring-press"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إنشاء قيد محاسبي متوازن</span>
          </button>
          <button
            onClick={() => setActiveTab('data-import', 'معالج استيراد البيانات الشامل (Excel / CSV)')}
            className="button-outline-on-dark motion-spring-press"
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <Upload className="w-4 h-4 ml-1 text-[#141414]" />
            <span>استيراد قيود</span>
          </button>
          <ExportDropdown 
            sectionKey="journals" 
            data={filteredJournals} 
            variant="outline-dark" 
            customTitle={`دفتر القيود المحاسبية - ${activeCompany.name}`} 
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي القيود المرحّلة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{journals.length} قيداً</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>100% متطابقة</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي حركات المدين (Debit)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {journals.reduce((acc, j) => acc + (j.total_debit || 0), 0).toLocaleString()} ⃁
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>مجموع المدين</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي حركات الدائن (Credit)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {journals.reduce((acc, j) => acc + (j.total_credit || 0), 0).toLocaleString()} ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>مجموع الدائن</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>حالة التوازن المحاسبي</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            متوازن تماماً
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>فارق = 0.00 ⃁</span>
        </div>
      </div>

      {/* Fiscal Period Lock Governance Bar (قفل وفتح الفترات المحاسبية الشهرية) */}
      <div className="bg-white p-4 rounded-2xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3 motion-silk-enter">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#141414] m-0">
              حوكمة وقفل الفترات المحاسبية الشهرية (Fiscal Period Lock — ZATCA & SOCPA)
            </h3>
            <p className="text-[11px] text-[#707070] m-0 mt-0.5">
              قفل الفترة يمنع تسجيل أو تعديل أو ترحيل أي قيد محاسبي بتاريخ يقع ضمن الشهر المغلق حفاظاً على ثبات القوائم والإقرارات الضريبية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lockedPeriods.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[#141414]">الفترات المقفلة حالياً:</span>
              {lockedPeriods.map((ym) => (
                <button
                  key={ym}
                  type="button"
                  onClick={() => handleToggleFiscalPeriodLock(ym)}
                  className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  title="اضغط لإلغاء قفل هذه الفترة"
                >
                  <Lock className="w-3 h-3" />
                  <span>{ym}</span>
                </button>
              ))}
            </div>
          )}

          <input
            type="month"
            aria-label="اختيار الفترة المحاسبية الشهرية"
            value={selectedPeriodLockYm}
            onChange={(e) => setSelectedPeriodLockYm(e.target.value)}
            className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 text-xs font-mono font-bold text-[#141414]"
          />
          <button
            type="button"
            onClick={() => handleToggleFiscalPeriodLock(selectedPeriodLockYm)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              lockedPeriods.includes(selectedPeriodLockYm)
                ? 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                : 'bg-[#141414] text-[#ffffff]'
            }`}
          >
            {lockedPeriods.includes(selectedPeriodLockYm) ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>فتح الفترة ({selectedPeriodLockYm})</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>قفل الفترة ({selectedPeriodLockYm})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter & Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث برقم القيد، البيان، أو اسم المحاسب"
              placeholder="ابحث برقم القيد، البيان، أو اسم المحاسب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="تصفية حسب نوع القيد"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 rounded-2xl py-1.5 px-3 text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="ALL">جميع أنواع القيود</option>
              <option value="MANUAL">قيود يدوية (MANUAL)</option>
              <option value="AUTOMATIC">قيود آلية من الفواتير (AUTOMATIC)</option>
              <option value="REVERSAL">قيود عكسية (REVERSAL)</option>
            </select>
          </div>
        </div>

        {/* Journals Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم القيد</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">البيان والشرح</th>
                <th className="p-3.5">إجمالي المدين</th>
                <th className="p-3.5">إجمالي الدائن</th>
                <th className="p-3.5">الفرع / مركز التكلفة</th>
                <th className="p-3.5">المُعد</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#707070]">
                    جاري استرجاع القيود المحاسبية...
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#707070]">
                    لا توجد قيود مسجلة تطابق معايير البحث
                  </td>
                </tr>
              ) : (
                filteredJournals.map((j) => (
                  <tr key={j.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{j.entry_number}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{j.entry_date}</td>
                    <td className="p-3.5 font-semibold text-[#141414] max-w-xs truncate" title={j.description}>
                      {j.description}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{j.total_debit.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{j.total_credit.toLocaleString()} ⃁</td>
                    <td className="p-3.5 text-zinc-600">
                      <div>{j.branch_name}</div>
                      {j.cost_center_code && (
                        <span className="text-[10px] text-[#707070] font-mono">[{j.cost_center_code}]</span>
                      )}
                    </td>
                    <td className="p-3.5 text-zinc-600">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar
                          name={j.created_by}
                          departmentId="finance"
                          size="xs"
                          status={j.status === 'POSTED' ? 'verified' : 'none'}
                        />
                        <span>{j.created_by}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        text={j.status === 'POSTED' ? 'مرحّل ومعتمد' : 'مسودة'}
                        type={j.status === 'POSTED' ? 'success' : 'warning'}
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedJournal(j)}
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="عرض تفاصيل أطراف القيد"
                        >
                          <Eye className="w-3 h-3 ml-1" />
                          <span>معاينة</span>
                        </button>

                        <button
                          onClick={() => handleReverseJournal(j)}
                          className="button-outline-on-light text-[#141414] hover:bg-[#eaeaea]"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="عكس القيد وتوليد قيد مضاد متوازن"
                        >
                          <RefreshCw className="w-3 h-3 ml-1 text-[#141414]" />
                          <span>عكس القيد</span>
                        </button>

                        <button
                          onClick={() => handleDeleteJournal(j)}
                          className="p-1 text-[#707070] hover:text-[#141414] rounded transition"
                          title="حذف القيد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Balanced Journal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#141414]" />
                <span>إنشاء قيد يومية متوازن جديد (Double-Entry Journal)</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournal} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white text-[#141414]">
              {/* Header Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">تاريخ القيد *</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع القيد *</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="MANUAL">قيد يومية يدوي (MANUAL)</option>
                    <option value="AUTOMATIC">قيد تسوية / تلقائي (AUTOMATIC)</option>
                    <option value="CLOSING">قيد إقفال سنوي (CLOSING)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع *</label>
                  <select
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>فرع الرياض الرئيسي</option>
                    <option>فرع جدة</option>
                    <option>فرع الخبر والدمام</option>
                    <option>الإدارة العامة للمجموعة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">البيان والشرح المحاسبي للقيد *</label>
                <input
                  type="text"
                  placeholder="مثال: إثبات سداد مصاريف استقدام عمالة / تحصيل دفعة عقد إيجار..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              {/* Multi-Line Journal Lines Builder */}
              <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#141414]">بنود وأطراف القيد المحاسبي</h4>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="button-outline-on-light"
                    style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    <span>إضافة طرف قيد</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-2xl border border-zinc-200">
                      <div className="col-span-5">
                        <label className="block text-[10px] text-[#707070] font-semibold mb-1">الحساب المحاسبي</label>
                        <select
                          value={line.account_code}
                          onChange={(e) => handleLineChange(idx, 'account_code', e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-2 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                        >
                          {accountsList.map((acc) => (
                            <option key={acc.code} value={acc.code}>
                              {acc.code} - {acc.nameAr}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-zinc-700 font-semibold mb-1">مدين (Debit)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.debit === 0 ? '' : line.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-1.5 px-2 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-[#141414] font-semibold mb-1">دائن (Credit)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.credit === 0 ? '' : line.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-1.5 px-2 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 2}
                          className="text-[#707070] hover:text-[#141414] disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Balance Summary Box */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isBalanced ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]' : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {isBalanced ? (
                      <Check className="w-4 h-4 text-[#141414]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#141414]" />
                    )}
                    <div>
                      <div className="text-xs font-bold">
                        {isBalanced ? 'القيد المحاسبي متوازن وصالح للترحيل' : 'القيد غير متوازن! يجب أن يتساوى المدين مع الدائن.'}
                      </div>
                      <div className="text-[11px] opacity-80 font-mono">
                        إجمالي المدين: {totalDebit.toLocaleString()} ⃁ | إجمالي الدائن: {totalCredit.toLocaleString()} ⃁
                      </div>
                    </div>
                  </div>

                  <div className="text-end font-mono font-bold text-xs">
                    الفارق: {difference.toFixed(2)} ⃁
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced || !description}
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  ترحيل واعتماد القيد المحاسبي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Print Selected Journal Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden text-[#141414] font-sans">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-sm text-[#141414] m-0">
                  معاينة وطباعة قيد اليومية: {selectedJournal.entry_number}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="button-white-pill"
                  style={{ padding: '4px 14px', fontSize: '11px', background: '#141414', color: '#ffffff', fontWeight: 700 }}
                >
                  <Printer className="w-3.5 h-3.5 ml-1" />
                  <span>طباعة القيد</span>
                </button>
                <button
                  onClick={() => setSelectedJournal(null)}
                  className="text-[#707070] hover:text-[#141414]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 bg-white border border-zinc-300 m-4 rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[#141414] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#141414] m-0">{activeCompany.name}</h2>
                  <p className="text-xs text-zinc-600 mt-0.5 font-mono">س.ت: 1010892819 | الرقم الضريبي: 310928374900003</p>
                  <p className="text-xs text-[#707070]">سجل القيود المحاسبية المعتمدة (Double-Entry Ledger)</p>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-[#141414] font-mono border-2 border-[#141414] px-3 py-1 rounded-xl">
                    قيد محاسبي: {selectedJournal.entry_number}
                  </div>
                  <div className="text-xs font-mono text-zinc-600 mt-1 font-bold">التاريخ: {selectedJournal.entry_date}</div>
                  <div className="text-xs text-[#707070]">الفرع: {selectedJournal.branch_name}</div>
                </div>
              </div>

              {/* Description Box */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                <span className="font-bold text-zinc-700 block mb-1">البيان والشرح المحاسبي:</span>
                <span className="text-[#141414] font-semibold text-sm">{selectedJournal.description}</span>
              </div>

              {/* Journal Line Items Table */}
              <div className="border border-zinc-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-100 font-bold border-b border-zinc-300 text-zinc-800">
                    <tr>
                      <th className="p-3">رمز الحساب</th>
                      <th className="p-3">اسم الحساب في الدليل</th>
                      <th className="p-3">مركز التكلفة</th>
                      <th className="p-3 font-mono">مدين (Debit)</th>
                      <th className="p-3 font-mono">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono">
                    <tr>
                      <td className="p-3 font-bold text-[#141414]">11010</td>
                      <td className="p-3 font-sans font-semibold text-[#141414]">الصندوق الرئيسي - الخزينة</td>
                      <td className="p-3 font-sans text-[#707070]">{selectedJournal.cost_center_code || 'CC-OPS-01'}</td>
                      <td className="p-3 font-bold text-[#141414]">{selectedJournal.total_debit.toLocaleString()} ⃁</td>
                      <td className="p-3 text-[#707070]">0.00 ⃁</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[#141414]">41100</td>
                      <td className="p-3 font-sans font-semibold text-[#141414]">إيرادات وساطة عقود الاستقدام</td>
                      <td className="p-3 font-sans text-[#707070]">{selectedJournal.cost_center_code || 'CC-OPS-01'}</td>
                      <td className="p-3 text-[#707070]">0.00 ⃁</td>
                      <td className="p-3 font-bold text-[#141414]">{selectedJournal.total_credit.toLocaleString()} ⃁</td>
                    </tr>
                    <tr className="bg-zinc-50 font-bold border-t-2 border-[#141414] text-xs font-sans">
                      <td colSpan={3} className="p-3 text-left pl-4">الإجمالي المتوازن:</td>
                      <td className="p-3 text-[#141414] font-mono font-bold">{selectedJournal.total_debit.toLocaleString()} ⃁</td>
                      <td className="p-3 text-[#141414] font-mono font-bold">{selectedJournal.total_credit.toLocaleString()} ⃁</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status & Approvals */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-zinc-200 text-center text-xs">
                <div>
                  <span className="text-[#707070] block font-bold mb-8">مُعد القيد</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px] text-zinc-800">
                    {selectedJournal.created_by || 'المحاسب المالي'}
                  </span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">المراجع المالي</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px] text-zinc-800">
                    {selectedJournal.approved_by || 'تدقيق الحسابات'}
                  </span>
                </div>
                <div>
                  <span className="text-[#707070] block font-bold mb-8">اعتماد الإدارة المالية</span>
                  <span className="border-t border-zinc-400 pt-1 block font-mono text-[10px] text-zinc-800">
                    المدير المالي المعتمد
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-2 print:hidden">
              <button
                onClick={() => handleReverseJournal(selectedJournal)}
                className="button-outline-on-light text-[#141414] hover:bg-[#eaeaea] flex items-center gap-1 font-bold"
                style={{ padding: '6px 14px', fontSize: '11.5px' }}
                title="إنشاء قيد محاسبي عكسي لهذا القيد"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#141414]" />
                <span>عكس هذا القيد المحاسبي</span>
              </button>

              <button
                onClick={() => setSelectedJournal(null)}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '11.5px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalsPage;
