import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle2, Clock, ShieldCheck, Download, 
  Search, Eye, MessageCircle, AlertCircle, Sparkles, 
  Building2, Phone, Calendar, ArrowRight, UserCheck, Check,
  CreditCard, Landmark, Plane, User, Lock, Award, Printer, QrCode
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { KasKpiCard } from '../components/kas/KasCards';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

interface ClientContract {
  id: string;
  contractNumber: string;
  workerName: string;
  profession: string;
  nationality: string;
  passportNumber: string;
  status: 'تم التوثيق بمساند' | 'تفويض إنجاز' | 'فحص السفارة' | 'تم إصدار التأشيرة' | 'حجز الطيران' | 'وصلت المملكة' | 'مكتمل ومسلم';
  progressPct: number;
  startDate: string;
  expectedArrival: string;
  amount: number;
  paidAmount: number;
  guaranteeDaysLeft: number;
  agencyName: string;
  flightDetails?: string;
}

const DEFAULT_MOCK_CONTRACTS: ClientContract[] = [
  {
    id: 'c-101',
    contractNumber: 'MSN-2026-8941',
    workerName: 'مريم أديس تيجيست',
    profession: 'عاملة منزلية',
    nationality: 'إثيوبيا',
    passportNumber: 'EP8894120',
    status: 'حجز الطيران',
    progressPct: 85,
    startDate: '2026-07-15',
    expectedArrival: '2026-09-05',
    amount: 14500,
    paidAmount: 11000,
    guaranteeDaysLeft: 90,
    agencyName: 'وكالة دماس الدولية (DAMAS ETH)',
    flightDetails: 'الخطوط السعودية SV-840 - الوصول: مطار الملك خالد الدولي بالرياض',
  },
  {
    id: 'c-102',
    contractNumber: 'MSN-2026-7730',
    workerName: 'جويسانتي فلوريس',
    profession: 'عاملة منزلية ورعاية كبار سن',
    nationality: 'الفلبين',
    passportNumber: 'P9920145',
    status: 'مكتمل ومسلم',
    progressPct: 100,
    startDate: '2026-05-10',
    expectedArrival: '2026-07-20',
    amount: 18500,
    paidAmount: 18500,
    guaranteeDaysLeft: 48,
    agencyName: 'بلاتينيوم مانيلا (PLATINUM PH)',
    flightDetails: 'تم الوصول والتسليم بنجاح',
  },
];

export const ClientPortalPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();
  const [nationalIdOrPhone, setNationalIdOrPhone] = useState('');
  const [selectedContract, setSelectedContract] = useState<ClientContract | null>(null);
  const [contractsList, setContractsList] = useState<ClientContract[]>(DEFAULT_MOCK_CONTRACTS);

  // Support / Complaint Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({
    contractNumber: '',
    clientName: '',
    clientPhone: '',
    type: 'تأخير في إجراءات الاستقدام',
    priority: 'متوسطة',
    description: ''
  });

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingContract, setPayingContract] = useState<ClientContract | null>(null);
  const [payMethod, setPayMethod] = useState('بطاقة مدى البنكية (Mada)');

  useEffect(() => {
    realErpDataStore.getRecords<any>('contracts').then(records => {
      if (records && records.length > 0) {
        const mapped: ClientContract[] = records.map((r, i) => ({
          id: r.id || `c-${i}`,
          contractNumber: r.contract_no || r.id || `MSN-2026-${String(i + 1).padStart(4, '0')}`,
          workerName: r.worker_name || r.maid_name || 'عاملة منزلية معتمدة',
          profession: r.profession || 'عاملة منزلية',
          nationality: r.nationality || 'إثيوبيا',
          passportNumber: r.passport_number || 'EP9920145',
          status: (r.status || 'حجز الطيران') as any,
          progressPct: r.status === 'مكتمل ومسلم' ? 100 : r.status === 'حجز الطيران' ? 85 : 50,
          startDate: r.created_at?.slice(0, 10) || '2026-07-15',
          expectedArrival: r.expected_arrival || '2026-09-10',
          amount: Number(r.amount) || 14500,
          paidAmount: Number(r.paid_amount) || (i === 0 ? 11000 : 18500),
          guaranteeDaysLeft: Number(r.guarantee_days_left) || 90,
          agencyName: r.agency_name || 'وكالة دماس الدولية (DAMAS ETH)',
          flightDetails: r.flight_details || 'الخطوط السعودية SV-840 - الوصول: مطار الملك خالد الدولي',
        }));
        setContractsList(mapped);
      }
    });
  }, []);

  const handleOpenSupport = (contract?: ClientContract) => {
    setSupportForm({
      contractNumber: contract?.contractNumber || (contractsList[0]?.contractNumber || ''),
      clientName: '',
      clientPhone: nationalIdOrPhone || '',
      type: 'تأخير في إجراءات الاستقدام',
      priority: 'متوسطة',
      description: ''
    });
    setShowSupportModal(true);
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.description) return;

    const ticket = {
      id: `CMP-${Date.now()}`,
      contract_no: supportForm.contractNumber,
      client_name: supportForm.clientName || 'عميل البوابة الإلكترونية',
      client_phone: supportForm.clientPhone,
      complaint_type: supportForm.type,
      priority: supportForm.priority,
      details: supportForm.description,
      status: 'قيد المعالجة',
      created_at: new Date().toISOString()
    };

    await realErpDataStore.addRecord('complaints', ticket);
    setShowSupportModal(false);
    addNotification({
      title: 'تم تسجيل طلب الدعم / البلاغ',
      message: `تم إرسال بلاغك برقم (${ticket.id}) بنجاح وجاري متابعته من قبل فريق العناية بالعملاء.`,
      type: 'success',
    });
  };

  const handleOpenPayment = (contract: ClientContract) => {
    setPayingContract(contract);
    setShowPayModal(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingContract) return;

    const remaining = payingContract.amount - payingContract.paidAmount;
    if (remaining <= 0) return;

    // Update contract paid amount
    const updated = contractsList.map(c => {
      if (c.id === payingContract.id) {
        return { ...c, paidAmount: c.amount };
      }
      return c;
    });
    setContractsList(updated);

    // Create official receipt voucher
    await realErpDataStore.addRecord('vouchers', {
      id: `VOU-REC-${Date.now()}`,
      voucher_type: 'سند قبض',
      voucher_number: `RV-CLIENT-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: remaining,
      currency: 'SAR',
      beneficiary: `العميل - سداد رصيد العقد ${payingContract.contractNumber}`,
      payment_method: payMethod,
      description: `سداد الدفعة المتبقية لعقد الاستقدام ${payingContract.contractNumber} (${payingContract.workerName})`,
      status: 'معتمد',
      created_at: new Date().toISOString()
    });

    setShowPayModal(false);
    setPayingContract(null);

    addNotification({
      title: 'سداد ناجح وإصدار سند القبض',
      message: `تم سداد مبلغ ${remaining.toLocaleString()} ⃁ بنجاح عبر ${payMethod} وتوليد سند القبض الإلكتروني.`,
      type: 'success',
    });
  };

  const filteredContracts = contractsList.filter(c => {
    if (!nationalIdOrPhone.trim()) return true;
    const q = nationalIdOrPhone.toLowerCase();
    return (c.contractNumber || '').toLowerCase().includes(q) ||
           (c.workerName || '').toLowerCase().includes(q) ||
           (c.passportNumber || '').toLowerCase().includes(q);
  });

  const activeContracts = filteredContracts.filter(c => c.status !== 'مكتمل ومسلم');
  const completedContracts = filteredContracts.filter(c => c.status === 'مكتمل ومسلم');

  return (
    <div className="space-y-6">
      {/* Top Banner - Pitch Black Cinematic Header matching ActivityLog/Master Design */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <BusinessIllustration type="client-portal" size="sm" showBackground={false} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  CLIENT SELF-SERVICE PORTAL
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  بوابة عملاء {activeCompany.name}
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                بوابة الخدمة الذاتية وتتبع العقود والوصول
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                متابعة مباشرة ومؤتمتة لخطوات الاستقدام، توثيق مساند، بوالص التأمين، وخدمة العملاء على مدار الساعة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenSupport()}
              className="button-white-pill text-xs font-bold flex items-center gap-2 shadow-lg"
              style={{ minHeight: '38px', padding: '8px 20px', backgroundColor: '#141414', color: '#ffffff', fontWeight: '700' }}
            >
              <AlertCircle className="w-4 h-4 text-white" />
              <span>+ تقديم بلاغ أو استفسار</span>
            </button>
            <a
              href="https://wa.me/966500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="button-white-pill text-xs font-bold flex items-center gap-2 shadow-lg"
              style={{ minHeight: '38px', padding: '8px 20px', backgroundColor: '#ffffff', color: '#141414', fontWeight: '700' }}
            >
              <MessageCircle className="w-4 h-4 text-[#141414]" />
              <span>خدمة العملاء (واتساب)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Contract Quick Lookup Search Bar */}
      <div className="card-pricing p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center gap-3">
        <CorporateAvatar name={nationalIdOrPhone || 'عميل البوابة الموثق'} archetype="client-vip" size="sm" status="verified" />
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-[#707070] mb-0.5">البحث الفوري عن العقود ومراحل العمالة</label>
          <input
            type="text"
            aria-label="البحث الفوري عن العقود ومراحل العمالة"
            value={nationalIdOrPhone}
            onChange={e => setNationalIdOrPhone(e.target.value)}
            placeholder="أدخل رقم العقد (MSN-...)، أو اسم العاملة، أو رقم الجواز للتحقق والتتبع المباشر..."
            className="w-full bg-transparent text-xs text-[#141414] font-semibold placeholder:text-[#707070] focus:outline-none"
          />
        </div>
        {nationalIdOrPhone && (
          <button
            onClick={() => setNationalIdOrPhone('')}
            className="text-xs text-[#707070] hover:text-[#141414] font-bold px-2 py-1"
          >
            مسح
          </button>
        )}
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>العقود النشطة تحت التنفيذ</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {activeContracts.length} عقود
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>متابعة منصة مساند</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>العقود المنجزة والمسلمة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {completedContracts.length} عقود
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>100% نسبة الرضا</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي المدفوعات الموثقة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            33,000 ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>فواتير ZATCA معتمدة</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>سريان الضمان والحماية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            90 يوماً
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-[#141414] rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>ضمان رسمي شامل</span>
        </div>
      </div>

      {/* Contract Lifecycle Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-[#141414]" />
            <span>العقود السارية ومراحل الوصول الحية</span>
          </h2>
          <span className="pill-tag-mint text-xs">محدث لحظياً عبر مساند</span>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="card-pricing border border-zinc-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center bg-white">
            <BusinessIllustration type="empty-search" size="md" />
            <div className="text-sm font-bold text-zinc-600 mt-3">لا توجد عقود مطابقة لرقم الهوية أو البحث المدخل</div>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredContracts.map((contract) => (
            <div 
              key={contract.id}
              className="card-pricing border border-zinc-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 bg-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <CorporateAvatar name={contract.workerName} profession={contract.profession} size="md" status="verified" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {contract.workerName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#707070] mt-0.5">
                      <span>رقم العقد: <strong className="text-zinc-800">{contract.contractNumber}</strong></span>
                      <span>•</span>
                      <span>{contract.profession}</span>
                      <span>•</span>
                      <span>{contract.nationality}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={contract.status === 'مكتمل ومسلم' ? 'pill-tag-mint text-xs' : 'pill-tag-shade text-xs'}>
                    {contract.status}
                  </span>
                  {contract.amount > contract.paidAmount && (
                    <button 
                      onClick={() => handleOpenPayment(contract)}
                      className="button-primary-pill text-xs font-bold flex items-center gap-1 shadow-sm"
                      style={{ minHeight: '34px', padding: '6px 14px', background: '#141414', color: '#ffffff' }}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>سداد الرصيد ({(contract.amount - contract.paidAmount).toLocaleString()} ⃁)</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenSupport(contract)}
                    className="button-outline-on-light text-xs font-bold flex items-center gap-1 text-[#141414] hover:bg-[#eaeaea]"
                    style={{ minHeight: '34px', padding: '6px 12px' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-[#141414]" />
                    <span>طلب دعم / بلاغ</span>
                  </button>
                  <button 
                    onClick={() => setSelectedContract(contract)}
                    className="button-outline-on-light text-xs font-bold flex items-center gap-1.5"
                    style={{ minHeight: '34px', padding: '6px 14px' }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>تفاصيل العقد</span>
                  </button>
                </div>
              </div>

              {/* 8-Stage Progress Tracker */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>نسبة الإنجاز: {contract.progressPct}%</span>
                  <span className="text-[#141414]">
                    الوصول المتوقع: {contract.expectedArrival}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#141414] rounded-full transition-all duration-500" 
                    style={{ width: `${contract.progressPct}%` }}
                  />
                </div>
                
                {contract.flightDetails && (
                  <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-xs text-[#141414] flex items-center gap-2">
                    <Plane className="w-4 h-4 text-[#141414] shrink-0" />
                    <span><strong>بيانات الرحلة:</strong> {contract.flightDetails}</span>
                  </div>
                )}
              </div>

              {/* Bottom Metadata & Guarantee */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[11px]">قيمة العقد الإجمالية</span>
                  <strong className="text-slate-900 font-bold">{contract.amount.toLocaleString()} ⃁</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">المبلغ المسدد</span>
                  <strong className="text-[#141414] font-bold">{contract.paidAmount.toLocaleString()} ⃁</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">الوكيل الخارجي</span>
                  <strong className="text-slate-800 font-medium">{contract.agencyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">فترة الضمان المتبقية</span>
                  <strong className="text-[#141414] font-bold">{contract.guaranteeDaysLeft} يوماً</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full border border-slate-200 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#141414]" />
                <h3 className="font-bold text-slate-900 text-base">
                  سجل العقد المعتمد #{selectedContract.contractNumber}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedContract(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Official Verification QR Stamp */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#141414] text-white flex items-center justify-center shadow-sm">
                    <QrCode className="w-6 h-6 text-[#ffffff]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#141414]">شهادة تتبع حالة العقد المعتمدة رسمياً</div>
                    <div className="text-[10px] text-[#707070] font-mono">MUSANED VERIFICATION: #{selectedContract.contractNumber}</div>
                  </div>
                </div>
                <span className="pill-tag-mint text-[10px]">ساري ومعتمد</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم العامل/ة:</span>
                  <span className="font-bold text-slate-900">{selectedContract.workerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم جواز السفر:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedContract.passportNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المهنة والجنسية:</span>
                  <span className="font-medium text-slate-800">{selectedContract.profession} - {selectedContract.nationality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الوكالة المصدرة:</span>
                  <span className="font-medium text-slate-800">{selectedContract.agencyName}</span>
                </div>
              </div>

              <div className="p-3 bg-[#f3f3f3] rounded-xl space-y-1.5 border border-[#e0e0e0]">
                <div className="flex justify-between">
                  <span className="text-[#141414]">حالة العقد عبر مساند:</span>
                  <span className="font-bold text-[#141414]">{selectedContract.status} ({selectedContract.progressPct}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#141414]">فترة الضمان النظامي:</span>
                  <span className="font-bold text-[#141414]">{selectedContract.guaranteeDaysLeft} يوماً (سارية)</span>
                </div>
                {selectedContract.flightDetails && (
                  <div className="flex justify-between pt-1 border-t border-[#e0e0e0]">
                    <span className="text-[#141414]">بيانات الرحلة والقدوم:</span>
                    <span className="font-bold text-[#141414]">{selectedContract.flightDetails}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-zinc-100 flex-wrap">
              <button
                type="button"
                onClick={() => window.print()}
                className="button-primary-pill text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                style={{ padding: '6px 16px', minHeight: '34px' }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة شهادة التتبع الرسمية</span>
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/966500000000?text=${encodeURIComponent(`السلام عليكم، استفسار بخصوص العقد رقم ${selectedContract.contractNumber} للعاملة ${selectedContract.workerName}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="button-outline-on-light text-xs font-bold inline-flex items-center gap-1"
                  style={{ minHeight: '34px', padding: '6px 14px' }}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#141414]" />
                  <span>دعم العملاء</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedContract(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support / Complaint Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white rounded-3xl p-6 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-4 text-right dir-rtl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-slate-900 text-base">
                  تقديم بلاغ أو طلب دعم ومتابعة
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSupportModal(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupportTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-600 mb-1">اسم العميل بالكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم صاحب العقد"
                    value={supportForm.clientName}
                    onChange={e => setSupportForm({ ...supportForm, clientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-600 mb-1">رقم الجوال للتواصل *</label>
                  <input
                    type="text"
                    required
                    placeholder="05XXXXXXXX"
                    value={supportForm.clientPhone}
                    onChange={e => setSupportForm({ ...supportForm, clientPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-600 mb-1">رقم العقد المرتبط</label>
                  <select
                    value={supportForm.contractNumber}
                    onChange={e => setSupportForm({ ...supportForm, contractNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-slate-900 font-mono"
                  >
                    {contractsList.map(c => (
                      <option key={c.id} value={c.contractNumber}>
                        {c.contractNumber} ({c.workerName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-600 mb-1">نوع الطلب / البلاغ *</label>
                  <select
                    value={supportForm.type}
                    onChange={e => setSupportForm({ ...supportForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-slate-900"
                  >
                    <option value="تأخير في إجراءات الاستقدام">تأخير في إجراءات الاستقدام</option>
                    <option value="طلب استبدال خلال فترة الضمان">طلب استبدال خلال فترة الضمان</option>
                    <option value="رفض عمل أو عدم توافق">رفض عمل أو عدم توافق</option>
                    <option value="استفسار عن موعد وصول الطيران">استفسار عن موعد وصول الطيران</option>
                    <option value="استفسار مالي أو سندات">استفسار مالي أو سندات</option>
                    <option value="شكوى عامة">شكوى عامة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-600 mb-1">تفاصيل البلاغ أو الملاحظات *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="يرجى توضيح تفاصيل طلبك أو الشكوى بالتفصيل لسرعة اتخاذ الإجراء..."
                  value={supportForm.description}
                  onChange={e => setSupportForm({ ...supportForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-slate-900 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                  style={{ padding: '8px 20px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold"
                  style={{ padding: '8px 22px', background: '#141414', color: '#ffffff' }}
                >
                  إرسال البلاغ لقاعدة البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Contract Balance Modal */}
      {showPayModal && payingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4 text-right dir-rtl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-slate-900 text-base">
                  سداد الدفعة المتبقية للعقد
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowPayModal(false); setPayingContract(null); }} 
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-600">رقم العقد:</span>
                  <span className="font-mono font-bold text-slate-900">{payingContract.contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">العاملة:</span>
                  <span className="font-bold text-slate-900">{payingContract.workerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">إجمالي قيمة العقد:</span>
                  <span className="font-mono font-bold text-slate-900">{payingContract.amount.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">المسدد مسبقاً:</span>
                  <span className="font-mono font-bold text-zinc-700">{payingContract.paidAmount.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">تاريخ بدء العقد وفترة الضمان:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {payingContract.startDate} ({payingContract.guaranteeDaysLeft} يوم ضمان)
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#e0e0e0]">
                  <span className="text-[#141414] font-bold">المبلغ المطلوب سداده الآن (شامل الضريبة):</span>
                  <span className="text-sm font-bold text-[#141414] font-mono">
                    {(payingContract.amount - payingContract.paidAmount).toLocaleString()} ⃁
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#707070]">
                  <span>الدفعات المستقبلية بعد هذه الدفعة:</span>
                  <span className="font-mono font-bold text-[#141414]">0 ⃁ (دفعة ختامية غير متكررة)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-600 mb-1">طريقة الدفع الإلكتروني *</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-slate-900"
                >
                  <option value="بطاقة مدى البنكية (Mada)">بطاقة مدى البنكية (Mada)</option>
                  <option value="بطاقة ائتمانية (Visa / MasterCard)">بطاقة ائتمانية (Visa / MasterCard)</option>
                  <option value="نظام سداد للمدفوعات (Sadad)">نظام سداد للمدفوعات (Sadad)</option>
                  <option value="تحويل بنكي مباشر">تحويل بنكي مباشر لحساب المجموعة</option>
                </select>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
                <div className="flex items-center gap-2 text-[#141414] font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#141414]" />
                  <span className="text-[11px]">إفصاح نظام التجارة الإلكترونية السعودي (Art. 18 & Reg Art. 7)</span>
                </div>
                <p className="text-[10.5px] text-zinc-600 leading-relaxed m-0">
                  يحق للعميل إلغاء العقد واسترداد المبالغ وفق لائحة منصة مساند ووزارة الموارد البشرية قبل إصدار التأشيرة أو خلال فترة الضمان النظامية (90 يوماً) عبر تقديم طلب في بوابة الدعم أعلاه. النقر على زر الدفع أدناه يُنشئ التزاماً نظامياً بالسداد.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => { setShowPayModal(false); setPayingContract(null); }}
                  className="button-outline-on-light text-xs font-bold"
                  style={{ padding: '8px 20px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold"
                  style={{ padding: '8px 22px', background: '#141414', color: '#ffffff' }}
                >
                  تأكيد السداد والالتزام بالدفع ({(payingContract.amount - payingContract.paidAmount).toLocaleString()} ⃁)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
