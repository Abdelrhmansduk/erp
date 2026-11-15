import React, { useState, useEffect } from 'react';
import { useModalEscape } from '../hooks/useModalEscape';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useCompany } from '../contexts/CompanyContext';
import { realErpDataStore } from '../services/realErpDataStore';
import { journalEngine } from '../services/accounting/journalEngine';
import { useAppStore } from '../stores/appStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { FileText, Plus, FileSpreadsheet, Search, X, Check, CheckCircle2, Trash2 } from 'lucide-react';

export interface FinancialReq {
  id: string;
  request_number: string;
  paid_to: string;
  branch: string;
  accounting_name: string;
  request_type: 'سداد مساند' | 'رسوم إقامة' | 'فحص طبي' | 'تذكرة طيران' | 'تسوية وكيل' | 'عهدة فرع' | 'أخرى';
  escalation: 'عادي' | 'هام' | 'شديد الأهمية';
  date: string;
  amount: number;
  entry_type: 'مدين' | 'دائن';
  payment_method: 'تحويل بنكي' | 'نقداً من الصندوق' | 'بطاقة مدى' | 'شيك مصرفي';
  description: string;
  accounting_account: string;
  bank_name: string;
  account_owner: string;
  account_number: string;
  iban: string;
  status: 'تجهيز' | 'بانتظار الاعتماد' | 'تم السداد' | 'طلب إقفال';
  applicant: string;
}

const MOCK_FIN_REQUESTS: FinancialReq[] = [
  {
    id: 'FIN-01',
    request_number: '#FIN-2026-001',
    paid_to: 'منصة مساند الحكومية',
    branch: 'الفرع الرئيسي - الرياض',
    accounting_name: 'رسوم توثيق عقود استقدام مساند',
    request_type: 'سداد مساند',
    escalation: 'هام',
    date: '2026-08-10',
    amount: 150.0,
    entry_type: 'مدين',
    payment_method: 'تحويل بنكي',
    description: 'سداد رسوم العقد الإلكتروني رقم #RC-2026-0592',
    accounting_account: '52010 - مصروفات وتراخيص حكومية',
    bank_name: 'مصرف الراجحي',
    account_owner: 'شركة خالد السليم للاستقدام',
    account_number: '10928374112',
    iban: 'SA038000000010928374112',
    status: 'تم السداد',
    applicant: 'فهد العتيبي (مسؤول التشغيل)',
  },
  {
    id: 'FIN-02',
    request_number: '#FIN-2026-002',
    paid_to: 'المديرية العامة للجوازات',
    branch: 'فرع جدة',
    accounting_name: 'رسوم إصدار وتجديد إقامة',
    request_type: 'رسوم إقامة',
    escalation: 'شديد الأهمية',
    date: '2026-08-12',
    amount: 650.0,
    entry_type: 'مدين',
    payment_method: 'بطاقة مدى',
    description: 'رسوم إقامة للعاملة ماريا سانتوس لعقد الإيجار الشهري',
    accounting_account: '52020 - رسوم الجوازات والإقامات',
    bank_name: 'البنك الأهلي السعودي',
    account_owner: 'شركة خالد السليم',
    account_number: '20938475611',
    iban: 'SA031000000020938475611',
    status: 'بانتظار الاعتماد',
    applicant: 'سارة خالد',
  },
  {
    id: 'FIN-03',
    request_number: '#FIN-2026-003',
    paid_to: 'PLATINUM BROTHERS INT’L',
    branch: 'الإدارة العامة للمجموعة',
    accounting_name: 'دفعة حساب وكيل خارجي',
    request_type: 'تسوية وكيل',
    escalation: 'شديد الأهمية',
    date: '2026-08-15',
    amount: 18500.0,
    entry_type: 'مدين',
    payment_method: 'تحويل بنكي',
    description: 'تسوية إرسالية عدد 15 جواز سفر معتمد للسفارة',
    accounting_account: '21040 - حسابات المكاتب الخارجية الدائنة',
    bank_name: 'بنك الرياض',
    account_owner: 'PLATINUM BROTHERS AGENCY',
    account_number: '99018273645',
    iban: 'PH0380000099018273645',
    status: 'تجهيز',
    applicant: 'عبدالفتح (مسؤول الوكلاء)',
  },
];

export const FinancialRequestsPage: React.FC = () => {
  useModalEscape();
  const { activeCompany } = useCompany();
  const { activeTab: storeActiveTab, addNotification } = useAppStore();
  const [requests, setRequests] = useState<FinancialReq[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'incomplete' | 'paid' | 'hr-outputs'>('all');
  const [hrCategoryFilter, setHrCategoryFilter] = useState<'ALL' | 'hr_expense_claims' | 'hr_business_trips' | 'hr_advances' | 'hr_ewa_withdrawals' | 'hr_offboarding_clearances'>('ALL');
  const [hrOutputs, setHrOutputs] = useState<Array<{
    id: string;
    tableKey: 'hr_expense_claims' | 'hr_business_trips' | 'hr_advances' | 'hr_ewa_withdrawals' | 'hr_offboarding_clearances';
    categoryLabel: string;
    employeeName: string;
    department: string;
    referenceNo: string;
    amount: number;
    vatAmount: number;
    date: string;
    description: string;
    status: string;
    debitAccountCode: string;
    debitAccountName: string;
  }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() =>
    storeActiveTab === 'create-fin-request' || storeActiveTab === 'petty-cash' || storeActiveTab === 'cash-custody'
  );

  useEffect(() => {
    const loadFinReqs = async () => {
      const data = await realErpDataStore.getRecords<FinancialReq>('financial_requests', MOCK_FIN_REQUESTS);
      setRequests(data);

      const [expClaims, trips, advances, ewaRows, clearances] = await Promise.all([
        realErpDataStore.getRecords<any>('hr_expense_claims', [
          {
            id: 'EXP-CLM-101',
            employee_name: 'فهد العتيبي',
            department: 'إدارة العمليات والاستقدام',
            category: 'فاتورة ضريبية ZATCA QR',
            amount: 1150,
            vat_amount: 150,
            date: '2026-11-10',
            description: 'رسوم تصديق وتوثيق غرفة الرياض وضيافة وفد خارجي',
            status: 'بانتظار الصرف المالي',
          },
        ]),
        realErpDataStore.getRecords<any>('hr_business_trips', [
          {
            id: 'TRP-2026-04',
            employee_name: 'عبدالرحمن السليم',
            department: 'الإدارة التنفيذية والتطوير',
            destination: 'جدة — الدمام',
            total_per_diem: 3200,
            start_date: '2026-11-08',
            purpose: 'انتداب رسمي لتدقيق الفروع ومطابقة أنظمة الاستقدام (4 أيام)',
            status: 'معتمد إدارياً — بانتظار الصرف',
          },
        ]),
        realErpDataStore.getRecords<any>('hr_advances', [
          {
            id: 'ADV-2026-11',
            employee_name: 'محمد مصطفى',
            department: 'قسم التأجير والتشغيل',
            amount: 6000,
            remaining_balance: 4500,
            request_date: '2026-11-05',
            reason: 'سلفة شخصية معتمدة تقسط على 6 أشهر',
            status: 'بانتظار الصرف البنكي',
          },
        ]),
        realErpDataStore.getRecords<any>('hr_ewa_withdrawals', [
          {
            id: 'EWA-2026-19',
            employee_name: 'سارة خالد',
            department: 'خدمة العملاء CRM',
            requested_amount: 2100,
            request_date: '2026-11-12',
            notes: 'سحب راتب مرن مبكر (EWA) من الأيام المكتسبة فعلياً بالحضور',
            status: 'قيد التحويل الفوري',
          },
        ]),
        realErpDataStore.getRecords<any>('hr_offboarding_clearances', [
          {
            id: 'EOS-CLR-88',
            employee_name: 'خالد الحربي',
            department: 'العلاقات الحكومية والتعقيب',
            net_payable: 28450,
            last_working_day: '2026-11-14',
            separation_reason: 'انتهاء مدة العقد النظامي (المادة 84)',
            status: 'مخالصة معتمدة — بانتظار الصرف',
          },
        ]),
      ]);

      const normalizedHrItems = [
        ...(Array.isArray(expClaims) ? expClaims : []).map((row: any, idx: number) => ({
          id: String(row.id || `EXP-${idx + 1}`),
          tableKey: 'hr_expense_claims' as const,
          categoryLabel: 'مطالبة مصروفات وفاتورة ZATCA',
          employeeName: String(row.employee_name || row.employeeName || 'موظف'),
          department: String(row.department || 'العمليات'),
          referenceNo: String(row.invoice_number || row.id || `EXP-${idx + 101}`),
          amount: Number(row.amount ?? row.total_amount ?? 850),
          vatAmount: Number(row.vat_amount ?? row.vatAmount ?? 0),
          date: String(row.date || row.created_at || '2026-11-10').slice(0, 10),
          description: String(row.description || row.category || 'استرداد نفقات تشغيلية وفاتورة ضريبية'),
          status: String(row.status || 'بانتظار الصرف'),
          debitAccountCode: '530401',
          debitAccountName: 'مصروفات تشغيلية وعهد موظفين وفواتير ZATCA',
        })),
        ...(Array.isArray(trips) ? trips : []).map((row: any, idx: number) => ({
          id: String(row.id || `TRP-${idx + 1}`),
          tableKey: 'hr_business_trips' as const,
          categoryLabel: 'بدل سفر وانتداب عمل',
          employeeName: String(row.employee_name || row.employeeName || 'موظف'),
          department: String(row.department || 'التشغيل'),
          referenceNo: String(row.id || `TRP-${idx + 201}`),
          amount: Number(row.total_per_diem ?? row.totalAmount ?? row.amount ?? 2400),
          vatAmount: 0,
          date: String(row.start_date || row.date || '2026-11-08').slice(0, 10),
          description: String(row.purpose || row.destination || 'بدل انتداب وسفر عمل رسمي'),
          status: String(row.status || 'بانتظار الصرف'),
          debitAccountCode: '530101',
          debitAccountName: 'بدلات السفر والانتداب والمهام الرسمية للموظفين',
        })),
        ...(Array.isArray(advances) ? advances : []).map((row: any, idx: number) => ({
          id: String(row.id || `ADV-${idx + 1}`),
          tableKey: 'hr_advances' as const,
          categoryLabel: 'سلفة / قرض موظف',
          employeeName: String(row.employee_name || row.employeeName || 'موظف'),
          department: String(row.department || 'الموارد البشرية'),
          referenceNo: String(row.id || `ADV-${idx + 301}`),
          amount: Number(row.amount ?? row.loan_amount ?? 5000),
          vatAmount: 0,
          date: String(row.request_date || row.date || '2026-11-05').slice(0, 10),
          description: String(row.reason || row.notes || 'صرف سلفة موظف مستردة على أقساط شهرية'),
          status: String(row.status || 'بانتظار الصرف'),
          debitAccountCode: '110601',
          debitAccountName: 'سلف وقروض الموظفين قصيرة الأجل',
        })),
        ...(Array.isArray(ewaRows) ? ewaRows : []).map((row: any, idx: number) => ({
          id: String(row.id || `EWA-${idx + 1}`),
          tableKey: 'hr_ewa_withdrawals' as const,
          categoryLabel: 'سحب راتب مرن مبكر (EWA)',
          employeeName: String(row.employee_name || row.employeeName || 'موظف'),
          department: String(row.department || 'الموارد البشرية'),
          referenceNo: String(row.id || `EWA-${idx + 401}`),
          amount: Number(row.requested_amount ?? row.amount ?? 1800),
          vatAmount: 0,
          date: String(row.request_date || row.date || '2026-11-12').slice(0, 10),
          description: String(row.notes || 'دفعة راتب مرن مكتسب من أيام الحضور الفعلي'),
          status: String(row.status || 'قيد التحويل'),
          debitAccountCode: '110601',
          debitAccountName: 'دفعات الراتب المرن المبكر المستحقة على مسير الرواتب (EWA)',
        })),
        ...(Array.isArray(clearances) ? clearances : []).map((row: any, idx: number) => ({
          id: String(row.id || `EOS-${idx + 1}`),
          tableKey: 'hr_offboarding_clearances' as const,
          categoryLabel: 'مخالصة نهاية خدمة (EOSB)',
          employeeName: String(row.employee_name || row.employeeName || 'موظف'),
          department: String(row.department || 'الموارد البشرية'),
          referenceNo: String(row.id || `EOS-${idx + 501}`),
          amount: Number(row.net_payable ?? row.netPayable ?? row.amount ?? 24500),
          vatAmount: 0,
          date: String(row.last_working_day || row.date || '2026-11-14').slice(0, 10),
          description: String(row.separation_reason || row.notes || 'صرف مخالصة ومستحقات نهاية الخدمة (IAS 19)'),
          status: String(row.status || 'مخالصة معتمدة'),
          debitAccountCode: '220101',
          debitAccountName: 'مخصص مكافأة نهاية الخدمة ومستحقات المخالصات (IAS 19)',
        })),
      ];

      setHrOutputs(normalizedHrItems);
    };
    void loadFinReqs();
    window.addEventListener('erp-data-updated', loadFinReqs);
    return () => window.removeEventListener('erp-data-updated', loadFinReqs);
  }, []);

  // Form State
  const [paidTo, setPaidTo] = useState('');
  const [branch, setBranch] = useState('الفرع الرئيسي - الرياض');
  const [accountingName, setAccountingName] = useState('');
  const [requestType, setRequestType] = useState<FinancialReq['request_type']>('سداد مساند');
  const [escalation, setEscalation] = useState<FinancialReq['escalation']>('عادي');
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState<'مدين' | 'دائن'>('مدين');
  const [paymentMethod, setPaymentMethod] = useState<FinancialReq['payment_method']>('تحويل بنكي');
  const [description, setDescription] = useState('');
  const [bankName, setBankName] = useState('مصرف الراجحي');
  const [accountOwner, setAccountOwner] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');

  useEffect(() => {
    if (storeActiveTab === 'create-fin-request') {
      setShowAddModal(true);
    } else if (storeActiveTab === 'petty-cash' || storeActiveTab === 'cash-custody') {
      setRequestType('عهدة فرع');
      setAccountingName('عهدة نقدية تشغيلية');
      setShowAddModal(true);
    }
  }, [storeActiveTab]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!paidTo.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      addNotification({
        title: 'بيانات الطلب غير مكتملة',
        message: 'يرجى إدخال المستفيد ومبلغ أكبر من صفر قبل الحفظ.',
        type: 'warning',
      });
      return;
    }
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    if (cleanIban.startsWith('SA') && !/^SA\d{22}$/.test(cleanIban)) {
      addNotification({
        title: 'رقم الآيبان غير صالح',
        message: 'الآيبان السعودي يجب أن يتكون من 24 خانة (SA متبوعة بـ 22 رقماً).',
        type: 'warning',
      });
      return;
    }

    const nextSeq =
      requests.reduce((max, r) => {
        const n = parseInt(String(r.request_number || '').replace(/\D/g, '').slice(-3), 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;

    const newReq: FinancialReq = {
      id: `FIN-${Date.now().toString().slice(-4)}`,
      request_number: `#FIN-2026-${String(nextSeq).padStart(3, '0')}`,
      paid_to: paidTo,
      branch,
      accounting_name: accountingName || 'طلب مصروفات تشغيلية',
      request_type: requestType,
      escalation,
      date: new Date().toISOString().slice(0, 10),
      amount: parsedAmount,
      entry_type: entryType,
      payment_method: paymentMethod,
      description,
      accounting_account: '51000 - المصروفات التشغيلية',
      bank_name: bankName,
      account_owner: accountOwner || paidTo,
      account_number: accountNumber || '10000000',
      iban: cleanIban || 'SA0000000000000000',
      status: 'بانتظار الاعتماد',
      applicant: 'عبد الفتاح (مشرف عام)',
    };

    await realErpDataStore.addRecord('financial_requests', newReq);
    setRequests([newReq, ...requests]);
    addNotification({
      title: 'إنشاء طلب مالي',
      message: `تم رفع الطلب المالي #${newReq.request_number} للمستفيد (${paidTo}) بمبلغ ${newReq.amount} ⃁.`,
      type: 'success',
    });
    setShowAddModal(false);
    setPaidTo('');
    setAmount('');
    setDescription('');
  };

  const handleApproveRequest = async (req: FinancialReq) => {
    try {
      const entry = journalEngine.autoPostOperationalTransaction({
        companyId: activeCompany.id,
        transactionType: req.request_type === 'تسوية وكيل' ? 'FOREIGN_AGENT_SETTLEMENT' : 'FINANCIAL_REQUEST_APPROVAL',
        referenceId: req.request_number,
        partyName: req.paid_to,
        amount: req.amount,
        paymentMethod: req.payment_method.includes('نقد') ? 'CASH' : 'BANK',
        costCenterName: req.branch,
        description: `سداد واعتماد الطلب المالي ${req.request_number} — ${req.accounting_name} (${req.paid_to})`,
        createdBy: 'المدير المالي',
      });
      const updated = { ...req, status: 'تم السداد' as const };
      await realErpDataStore.updateRecord<FinancialReq>('financial_requests', req.id, { status: 'تم السداد' });
      setRequests(requests.map(r => r.id === req.id ? updated : r));
      addNotification({
        title: 'اعتماد وسداد الطلب المالي وترحيل القيد',
        message: `تم سداد الطلب ${req.request_number} وترحيل القيد المحاسبي (${entry.entryNumber}) إلى شجرة الحسابات وميزان المراجعة.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر اعتماد الطلب المالي',
        message: err?.message || 'الفترة المالية مقفلة أو حدث خطأ في الترحيل',
        type: 'warning',
      });
    }
  };

  const handleDeleteRequest = async (req: FinancialReq) => {
    await realErpDataStore.deleteRecord('financial_requests', req.id);
    setRequests(requests.filter(r => r.id !== req.id));
    addNotification({
      title: 'حذف الطلب المالي',
      message: `تم حذف الطلب #${req.request_number} بنجاح.`,
      type: 'info',
    });
  };

  const handleApproveAndDisburseHrOutput = async (item: (typeof hrOutputs)[number]) => {
    try {
      // 1. Update HR record status in realErpDataStore
      await realErpDataStore.updateRecord<any>(item.tableKey, item.id, {
        status: 'تم السداد والترحيل المالي',
        disbursed_at: new Date().toISOString(),
      });
      setHrOutputs((prev) =>
        prev.map((row) =>
          row.id === item.id && row.tableKey === item.tableKey
            ? { ...row, status: 'تم السداد والترحيل المالي' }
            : row
        )
      );

      // 2. Create a payment voucher in financial_requests & vouchers
      const voucherRef = `#FIN-HR-${Date.now().toString().slice(-4)}`;
      const finVoucher: FinancialReq = {
        id: `FIN-HR-${Date.now().toString().slice(-5)}`,
        request_number: voucherRef,
        paid_to: item.employeeName,
        branch: item.department || 'الفرع الرئيسي - الرياض',
        accounting_name: `${item.categoryLabel} — ${item.employeeName}`,
        request_type: 'أخرى',
        escalation: 'هام',
        date: new Date().toISOString().slice(0, 10),
        amount: item.amount,
        entry_type: 'مدين',
        payment_method: 'تحويل بنكي',
        description: `${item.categoryLabel} (${item.referenceNo}): ${item.description}`,
        accounting_account: `${item.debitAccountCode} - ${item.debitAccountName}`,
        bank_name: 'مصرف الراجحي',
        account_owner: item.employeeName,
        account_number: '10099887766',
        iban: 'SA038000000010099887766',
        status: 'تم السداد',
        applicant: 'تكامل الموارد البشرية والمالية الآلي',
      };
      await realErpDataStore.addRecord('financial_requests', finVoucher);
      await realErpDataStore.addRecord('vouchers', {
        id: finVoucher.id,
        voucher_number: voucherRef,
        voucher_type: 'سند صرف موارد بشرية',
        date: finVoucher.date,
        beneficiary: item.employeeName,
        amount: item.amount,
        payment_method: 'تحويل بنكي',
        description: finVoucher.description,
        status: 'معتمد ومصروف',
        company_id: activeCompany.id,
        created_at: new Date().toISOString(),
      });
      setRequests((prev) => [finVoucher, ...prev]);

      // 3. Post balanced double-entry journal entry via journalEngine
      const netDebit = item.vatAmount > 0 ? Math.max(0, item.amount - item.vatAmount) : item.amount;
      const jvLines: Array<{
        accountCode: string;
        accountName: string;
        description: string;
        debit: number;
        credit: number;
      }> = [
        {
          accountCode: item.debitAccountCode,
          accountName: item.debitAccountName,
          description: `${item.categoryLabel} - ${item.employeeName} (${item.referenceNo})`,
          debit: netDebit,
          credit: 0,
        },
      ];
      if (item.vatAmount > 0) {
        jvLines.push({
          accountCode: '110801',
          accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)',
          description: `ضريبة مدخلات فاتورة ZATCA - ${item.referenceNo}`,
          debit: item.vatAmount,
          credit: 0,
        });
      }
      jvLines.push({
        accountCode: '110201',
        accountName: 'النقدية لدى البنوك والمصارف المحلية (حساب الجاري الرئيسي)',
        description: `صرف مستحقات ${item.employeeName} بموجب سند ${voucherRef}`,
        debit: 0,
        credit: item.amount,
      });

      const anyEngine = journalEngine as any;
      const jvRes =
        typeof anyEngine.createEntry === 'function'
          ? anyEngine.createEntry(activeCompany.id, {
              entryDate: finVoucher.date,
              entryType: 'AUTOMATIC',
              sourceModule: item.tableKey.toUpperCase(),
              sourceReference: voucherRef,
              description: finVoucher.description,
              createdBy: 'المدير المالي',
              lines: jvLines,
              autoPost: true,
            })
          : journalEngine.createJournalEntry(activeCompany.id, {
              entryDate: finVoucher.date,
              entryType: 'AUTOMATIC',
              sourceModule: item.tableKey.toUpperCase(),
              sourceReference: voucherRef,
              description: finVoucher.description,
              createdBy: 'المدير المالي',
              lines: jvLines,
              autoPost: true,
            });

      addNotification({
        title: 'تم الاعتماد والصرف وترحيل القيد المالي',
        message: `تم صرف (${item.categoryLabel}) للموظف (${item.employeeName}) بمبلغ ${item.amount.toLocaleString()} ⃁ وتوليد سند الصرف (${voucherRef}) وترحيل القيد المزدوج (#${jvRes?.entry?.entryNumber || voucherRef}).`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر ترحيل القيد المالي',
        message: err?.message || 'حدث خطأ أثناء ترحيل القيد المالي',
        type: 'warning',
      });
    }
  };

  const getFilteredRequests = () => {
    return requests.filter((r) => {
      const matchesSearch =
        (r.request_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.paid_to || '').includes(searchQuery) ||
        (r.description || '').includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeTab === 'incomplete') return r.status === 'تجهيز' || r.status === 'بانتظار الاعتماد';
      if (activeTab === 'paid') return r.status === 'تم السداد' || r.status === 'طلب إقفال';

      return true;
    });
  };

  const currentDisplayList = getFilteredRequests();

  return (
    <div className="space-y-6 motion-silk-enter">
      {/* Top Banner */}
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
            type="treasury-vouchers"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>FINANCIAL OPERATIONAL REQUESTS</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة الطلبات المالية والتشغيلية
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إصدار طلبات سداد الرسوم الحكومية، الجوازات، تذاكر الطيران، وتسويات المكاتب الخارجية لـ{' '}
              <strong style={{ color: '#ffffff' }}>{activeCompany.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="button-outline-on-dark motion-spring-press"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', borderColor: '#e0e0e0', background: '#ffffff', color: '#141414', fontWeight: 700 }}
          >
            <FileText className="w-4 h-4 ml-1 text-[#141414]" />
            <span>استخلاص مطالبات وفواتير الصرف (PDF / Word / Excel)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill motion-spring-press"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إنشاء طلب مالي جديد</span>
          </button>

          <ExportDropdown
            sectionKey="financial_requests"
            data={currentDisplayList}
            customTitle={`الطلبات المالية والمصروفات - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير كشوفات الطلبات المالية (10 صيغ)"
          />
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'all', label: `جميع الطلبات المالية (${requests.length})` },
          { id: 'hr-outputs', label: `مخرجات الموارد البشرية والرواتب (${hrOutputs.length})` },
          { id: 'incomplete', label: 'الطلبات غير المكتملة / قيد المراجعة' },
          { id: 'paid', label: 'الطلبات المسددة والمقفلة' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e4e4e7',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live HR Financial Outputs Hub (مخرجات الموارد البشرية والرواتب) */}
      {(activeTab === 'hr-outputs' || activeTab === 'all') && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#e0e0e0]">
            <div>
              <h3 className="text-sm font-bold text-[#141414] m-0">
                مخرجات الموارد البشرية والرواتب الجاهزة للصرف والترحيل المحاسبي
              </h3>
              <p className="text-xs text-[#707070] mt-1">
                تكامل حي مباشر مع مطالبات مصروفات الموظفين وفواتير ZATCA، بدلات السفر والانتدابات، السلف والقروض، سحوبات الراتب المرن (EWA)، ومخالصات نهاية الخدمة
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `الكل (${hrOutputs.length})` },
                { id: 'hr_expense_claims', label: 'مطالبات ZATCA والمصروفات' },
                { id: 'hr_business_trips', label: 'بدلات السفر والانتدابات' },
                { id: 'hr_advances', label: 'السلف والقروض' },
                { id: 'hr_ewa_withdrawals', label: 'الراتب المرن (EWA)' },
                { id: 'hr_offboarding_clearances', label: 'مخالصات نهاية الخدمة' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setHrCategoryFilter(cat.id as any)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                    hrCategoryFilter === cat.id
                      ? 'bg-[#141414] text-white border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e8e8e8]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3">المرجع</th>
                  <th className="p-3">نوع المخرج المالي</th>
                  <th className="p-3">الموظف والقسم</th>
                  <th className="p-3">البيان والتفاصيل</th>
                  <th className="p-3 font-mono">المبلغ (⃁)</th>
                  <th className="p-3">الحساب المحاسبي</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراء المالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {hrOutputs
                  .filter((item) => hrCategoryFilter === 'ALL' || item.tableKey === hrCategoryFilter)
                  .map((item) => {
                    const isDisbursed =
                      item.status.includes('تم السداد') || item.status.includes('مصروف');
                    return (
                      <tr key={`${item.tableKey}-${item.id}`} className="hover:bg-[#f3f3f3]/40">
                        <td className="p-3 font-mono font-bold text-[#141414]">{item.referenceNo}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold">
                            {item.categoryLabel}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-[#141414]">{item.employeeName}</div>
                          <div className="text-[10.5px] text-[#707070]">{item.department}</div>
                        </td>
                        <td className="p-3 text-[#141414] max-w-xs">{item.description}</td>
                        <td className="p-3 font-mono font-bold text-[#141414]">
                          {item.amount.toLocaleString()} ⃁
                        </td>
                        <td className="p-3 text-[11px] text-[#707070] font-mono">
                          {item.debitAccountCode} — {item.debitAccountName}
                        </td>
                        <td className="p-3">
                          <Badge
                            text={item.status}
                            type={isDisbursed ? 'success' : 'warning'}
                          />
                        </td>
                        <td className="p-3 text-center">
                          {isDisbursed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141414] px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تم الصرف والترحيل</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleApproveAndDisburseHrOutput(item)}
                              className="button-primary-pill bg-[#141414] text-white text-[11px] font-bold"
                              style={{ padding: '4px 12px', minHeight: '28px' }}
                            >
                              <Check className="w-3.5 h-3.5 ml-1" />
                              <span>اعتماد وصرف وترحيل قيد مالي</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests Table */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              aria-label="البحث بالرقم، المدفوع له، أو الوصف"
              placeholder="البحث بالرقم، المدفوع له، أو الوصف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            العدد المعروض: {currentDisplayList.length} طلب
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم الطلب</th>
                <th className="p-3.5">المدفوع له</th>
                <th className="p-3.5">نوع الطلب</th>
                <th className="p-3.5">الفرع</th>
                <th className="p-3.5">المبلغ المطلوب</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">الأولوية والتصعيد</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5">مقدم الطلب</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {currentDisplayList.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="p-3.5 font-mono font-bold text-[#141414]">{r.request_number}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-[#141414]">{r.paid_to}</div>
                    <div className="text-[11px] text-[#707070]">{r.accounting_name}</div>
                  </td>
                  <td className="p-3.5"><Badge text={r.request_type} type="purple" /></td>
                  <td className="p-3.5 text-zinc-600">{r.branch}</td>
                  <td className="p-3.5 font-mono font-bold text-[#141414]">{r.amount.toLocaleString()} ⃁</td>
                  <td className="p-3.5 text-zinc-600">{r.payment_method}</td>
                  <td className="p-3.5"><Badge text={r.escalation} type={r.escalation === 'شديد الأهمية' ? 'danger' : 'warning'} /></td>
                  <td className="p-3.5"><Badge text={r.status} type={r.status === 'تم السداد' ? 'success' : 'warning'} /></td>
                  <td className="p-3.5 font-semibold text-[#141414]">
                    <div className="flex items-center gap-2">
                      <CorporateAvatar
                        name={r.applicant}
                        departmentId="finance"
                        size="sm"
                        status={r.status === 'تم السداد' ? 'verified' : 'none'}
                      />
                      <span>{r.applicant}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.status !== 'تم السداد' && (
                        <button
                          onClick={() => handleApproveRequest(r)}
                          className="button-primary-pill"
                          style={{ padding: '2px 10px', fontSize: '11px', minHeight: '26px' }}
                          title="اعتماد وسداد الطلب"
                        >
                          <Check className="w-3 h-3 ml-1" />
                          <span>سداد</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRequest(r)}
                        className="p-1 rounded-full hover:bg-[#eaeaea] text-[#707070] hover:text-[#141414] transition-colors"
                        title="حذف الطلب"
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="w-full max-w-2xl bg-white rounded-[24px] border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#141414]" />
                <span>إنشاء طلب مالي جديد</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white text-[#141414]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المدفوع له *</label>
                  <input type="text" required value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="جهة الصرف أو المستفيد" className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع *</label>
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none">
                    <option>الفرع الرئيسي - الرياض</option>
                    <option>فرع جدة</option>
                    <option>فرع الدمام</option>
                    <option>فرع خميس مشيط</option>
                    <option>الإدارة العامة للمجموعة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع الطلب *</label>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none">
                    <option value="سداد مساند">سداد مساند</option>
                    <option value="رسوم إقامة">رسوم إقامة</option>
                    <option value="فحص طبي">فحص طبي</option>
                    <option value="تذكرة طيران">تذكرة طيران</option>
                    <option value="تسوية وكيل">تسوية وكيل</option>
                    <option value="عهدة فرع">عهدة فرع</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المبلغ المطلوب (⃁) *</label>
                  <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">طريقة الدفع *</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none">
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="نقداً من الصندوق">نقداً من الصندوق</option>
                    <option value="بطاقة مدى">بطاقة مدى</option>
                    <option value="شيك مصرفي">شيك مصرفي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الأولوية / التصعيد *</label>
                  <select value={escalation} onChange={(e) => setEscalation(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none">
                    <option value="عادي">عادي</option>
                    <option value="هام">هام</option>
                    <option value="شديد الأهمية">شديد الأهمية VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">وصف الدفع والغرض منه *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="سبب الصرف وتفاصيل المعاملة..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم البنك المستفيد</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الآيبان (IBAN)</label>
                  <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="SA..." className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
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
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  حفظ وإرسال الطلب للاعتماد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialRequestsPage;
