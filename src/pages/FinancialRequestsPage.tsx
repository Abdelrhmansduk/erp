import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useCompany } from '../contexts/CompanyContext';
import { realErpDataStore } from '../services/realErpDataStore';
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
  const { activeCompany } = useCompany();
  const { activeTab: storeActiveTab, addNotification } = useAppStore();
  const [requests, setRequests] = useState<FinancialReq[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'incomplete' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() =>
    storeActiveTab === 'create-fin-request' || storeActiveTab === 'petty-cash' || storeActiveTab === 'cash-custody'
  );

  useEffect(() => {
    const loadFinReqs = () => {
      realErpDataStore.getRecords<FinancialReq>('financial_requests', MOCK_FIN_REQUESTS).then(data => {
        setRequests(data);
      });
    };
    loadFinReqs();
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
    if (!paidTo || !amount) return;

    const newReq: FinancialReq = {
      id: `FIN-${Date.now().toString().slice(-4)}`,
      request_number: `#FIN-2026-00${requests.length + 1}`,
      paid_to: paidTo,
      branch,
      accounting_name: accountingName || 'طلب مصروفات تشغيلية',
      request_type: requestType,
      escalation,
      date: new Date().toISOString().slice(0, 10),
      amount: parseFloat(amount) || 0,
      entry_type: entryType,
      payment_method: paymentMethod,
      description,
      accounting_account: '51000 - المصروفات التشغيلية',
      bank_name: bankName,
      account_owner: accountOwner || paidTo,
      account_number: accountNumber || '10000000',
      iban: iban || 'SA0000000000000000',
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
    const updated = { ...req, status: 'تم السداد' as const };
    await realErpDataStore.updateRecord<FinancialReq>('financial_requests', req.id, { status: 'تم السداد' });
    setRequests(requests.map(r => r.id === req.id ? updated : r));
    addNotification({
      title: 'اعتماد وسداد الطلب المالي',
      message: `تم سداد الطلب #${req.request_number} بنجاح وترحيل القيد المحاسبي.`,
      type: 'success',
    });
  };

  const handleDeleteRequest = async (req: FinancialReq) => {
    if (window.confirm(`هل أنت متأكد من حذف الطلب المالي #${req.request_number}؟`)) {
      await realErpDataStore.deleteRecord('financial_requests', req.id);
      setRequests(requests.filter(r => r.id !== req.id));
      addNotification({
        title: 'حذف الطلب المالي',
        message: `تم حذف الطلب #${req.request_number} بنجاح.`,
        type: 'error',
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
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
            className="button-outline-on-dark"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', borderColor: 'rgba(207, 166, 74, 0.55)', background: 'rgba(207, 166, 74, 0.14)', color: '#F5EDDC', fontWeight: 700 }}
          >
            <FileText className="w-4 h-4 ml-1 text-[#CFA64A]" />
            <span>استخلاص مطالبات وفواتير الصرف (PDF / Word / Excel)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill"
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
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
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

      {/* Requests Table */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
            <input
              type="text"
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
                  <td className="p-3.5 font-mono font-bold text-black">{r.request_number}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-black">{r.paid_to}</div>
                    <div className="text-[11px] text-zinc-500">{r.accounting_name}</div>
                  </td>
                  <td className="p-3.5"><Badge text={r.request_type} type="purple" /></td>
                  <td className="p-3.5 text-zinc-600">{r.branch}</td>
                  <td className="p-3.5 font-mono font-bold text-emerald-700">{r.amount.toLocaleString()} ⃁</td>
                  <td className="p-3.5 text-zinc-600">{r.payment_method}</td>
                  <td className="p-3.5"><Badge text={r.escalation} type={r.escalation === 'شديد الأهمية' ? 'danger' : 'warning'} /></td>
                  <td className="p-3.5"><Badge text={r.status} type={r.status === 'تم السداد' ? 'success' : 'warning'} /></td>
                  <td className="p-3.5 font-semibold text-black">
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
                        className="p-1 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-black text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>إنشاء طلب مالي جديد</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white text-black">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المدفوع له *</label>
                  <input type="text" required value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="جهة الصرف أو المستفيد" className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع *</label>
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none">
                    <option>الفرع الرئيسي - الرياض</option>
                    <option>فرع جدة</option>
                    <option>فرع الدمام</option>
                    <option>فرع خميس مشيط</option>
                    <option>الإدارة العامة للمجموعة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع الطلب *</label>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none">
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
                  <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">طريقة الدفع *</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none">
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="نقداً من الصندوق">نقداً من الصندوق</option>
                    <option value="بطاقة مدى">بطاقة مدى</option>
                    <option value="شيك مصرفي">شيك مصرفي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الأولوية / التصعيد *</label>
                  <select value={escalation} onChange={(e) => setEscalation(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none">
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
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم البنك المستفيد</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الآيبان (IBAN)</label>
                  <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="SA..." className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none" />
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
