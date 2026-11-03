import React, { useState, useEffect } from 'react';
import { 
  Globe2, Building2, UploadCloud, FileText, CheckCircle2, 
  Clock, DollarSign, Search, Plus, Filter, Download, 
  Sparkles, ShieldCheck, Eye, MessageCircle, AlertCircle,
  FileSpreadsheet, ArrowUpRight, Check, X, Plane
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { KasKpiCard, KasSupplierCard } from '../components/kas/KasCards';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface AgencyCandidate {
  id: string;
  maidName: string;
  passportNumber: string;
  nationality: string;
  age: number;
  profession: string;
  medicalStatus: 'FIT' | 'PENDING' | 'UNFIT';
  visaStatus: 'ISSUED' | 'APPLIED' | 'READY';
  ticketStatus: 'BOOKED' | 'PENDING';
  commissionUsd: number;
  paymentStatus: 'PAID' | 'UNPAID';
  uploadedAt: string;
  agencyName?: string;
}

const INITIAL_AGENCY_CANDIDATES: AgencyCandidate[] = [
  {
    id: 'cand-1',
    maidName: 'مريم أديس تيجيست',
    passportNumber: 'EP8894120',
    nationality: 'إثيوبيا',
    age: 26,
    profession: 'عاملة منزلية',
    medicalStatus: 'FIT',
    visaStatus: 'ISSUED',
    ticketStatus: 'BOOKED',
    commissionUsd: 1100,
    paymentStatus: 'PAID',
    uploadedAt: '2026-08-10',
    agencyName: 'DAMAS ETHIOPIA'
  },
  {
    id: 'cand-2',
    maidName: 'حليمة كيبيدي',
    passportNumber: 'EP9920140',
    nationality: 'إثيوبيا',
    age: 24,
    profession: 'عاملة منزلية',
    medicalStatus: 'FIT',
    visaStatus: 'READY',
    ticketStatus: 'PENDING',
    commissionUsd: 1100,
    paymentStatus: 'UNPAID',
    uploadedAt: '2026-08-22',
    agencyName: 'DAMAS ETHIOPIA'
  },
  {
    id: 'cand-3',
    maidName: 'فاطمة محمد نور',
    passportNumber: 'EP7731209',
    nationality: 'إثيوبيا',
    age: 29,
    profession: 'طباخة منزلية',
    medicalStatus: 'PENDING',
    visaStatus: 'APPLIED',
    ticketStatus: 'PENDING',
    commissionUsd: 1200,
    paymentStatus: 'UNPAID',
    uploadedAt: '2026-08-28',
    agencyName: 'DAMAS ETHIOPIA'
  },
];

export const ForeignAgencyPortalPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();
  const [activeAgency, setActiveAgency] = useState('DAMAS ETHIOPIA');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBatchPayoutModal, setShowBatchPayoutModal] = useState(false);
  const [candidates, setCandidates] = useState<AgencyCandidate[]>([]);

  // Manual Candidate Form State
  const [newCandForm, setNewCandForm] = useState({
    maidName: '',
    passportNumber: '',
    nationality: 'إثيوبيا',
    age: '25',
    profession: 'عاملة منزلية',
    commissionUsd: '1100'
  });

  useEffect(() => {
    realErpDataStore.getRecords<AgencyCandidate>('agency_candidates', INITIAL_AGENCY_CANDIDATES).then(data => {
      setCandidates(data);
    });
  }, []);

  const totalUsdBalance = candidates.reduce((sum, c) => c.paymentStatus === 'UNPAID' ? sum + c.commissionUsd : sum, 0);
  const totalPaidUsd = candidates.reduce((sum, c) => c.paymentStatus === 'PAID' ? sum + c.commissionUsd : sum, 0);

  const filteredCandidates = candidates.filter(c => 
    c.maidName.includes(searchQuery) ||
    c.passportNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSettleCommission = async (cand: AgencyCandidate) => {
    const updated = await realErpDataStore.updateRecord<AgencyCandidate>(
      'agency_candidates',
      cand.id,
      { paymentStatus: 'PAID' },
      INITIAL_AGENCY_CANDIDATES
    );
    setCandidates(updated);

    // Auto generate cash/bank disbursement voucher
    await realErpDataStore.addRecord('vouchers', {
      id: `VOU-PAY-${Date.now()}`,
      voucher_type: 'سند صرف',
      voucher_number: `PV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: cand.commissionUsd * 3.75,
      amount_usd: cand.commissionUsd,
      currency: 'SAR',
      beneficiary: `وكالة ${activeAgency} - تسوية عمولة (${cand.maidName})`,
      payment_method: 'تحويل بنكي دولي',
      description: `سداد عمولة استقدام للعاملة ${cand.maidName} (جواز: ${cand.passportNumber})`,
      status: 'معتمد',
      created_at: new Date().toISOString(),
    });

    addNotification({
      title: 'سداد عمولة وكالة خارجية',
      message: `تم سداد عمولة (${cand.maidName}) بمبلغ $${cand.commissionUsd} (${(cand.commissionUsd * 3.75).toLocaleString()} ر.س) وتوليد سند الصرف بنجاح.`,
      type: 'success',
    });
  };

  const handleAdvanceStatus = async (cand: AgencyCandidate) => {
    let nextVisa = cand.visaStatus;
    let nextTicket = cand.ticketStatus;

    if (cand.visaStatus === 'APPLIED') nextVisa = 'READY';
    else if (cand.visaStatus === 'READY') nextVisa = 'ISSUED';
    else if (cand.visaStatus === 'ISSUED' && cand.ticketStatus === 'PENDING') nextTicket = 'BOOKED';

    const updated = await realErpDataStore.updateRecord<AgencyCandidate>(
      'agency_candidates',
      cand.id,
      { visaStatus: nextVisa, ticketStatus: nextTicket },
      INITIAL_AGENCY_CANDIDATES
    );
    setCandidates(updated);
    addNotification({
      title: 'تحديث مسار العاملة',
      message: `تم تحديث مسار المعاملة للعاملة (${cand.maidName}) إلى (تأشيرة: ${nextVisa} | طيران: ${nextTicket}).`,
      type: 'info',
    });
  };

  const handleDeleteCandidate = async (cand: AgencyCandidate) => {
    if (window.confirm(`هل أنت متأكد من حذف السيرة الذاتية للمرشحة (${cand.maidName})؟`)) {
      const updated = await realErpDataStore.deleteRecord<AgencyCandidate>(
        'agency_candidates',
        cand.id,
        INITIAL_AGENCY_CANDIDATES
      );
      setCandidates(updated);
      addNotification({
        title: 'حذف سيرة مرشحة',
        message: `تم حذف المرشحة (${cand.maidName}) من قائمة الوكالة.`,
        type: 'error',
      });
    }
  };

  const handleBatchPayout = async () => {
    const unpaid = candidates.filter(c => c.paymentStatus === 'UNPAID');
    if (unpaid.length === 0) return;

    const totalUsd = unpaid.reduce((sum, c) => sum + c.commissionUsd, 0);
    const totalSar = totalUsd * 3.75;

    let current = candidates;
    for (const cand of unpaid) {
      current = await realErpDataStore.updateRecord<AgencyCandidate>(
        'agency_candidates',
        cand.id,
        { paymentStatus: 'PAID' },
        INITIAL_AGENCY_CANDIDATES
      );
    }
    setCandidates(current);

    await realErpDataStore.addRecord('vouchers', {
      id: `VOU-PAY-BATCH-${Date.now()}`,
      voucher_type: 'سند صرف',
      voucher_number: `PV-BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: totalSar,
      amount_usd: totalUsd,
      currency: 'SAR',
      beneficiary: `وكالة ${activeAgency} - سداد مجمع لعمولات ${unpaid.length} مرشحة`,
      payment_method: 'سويفت بنكي دولي (SWIFT)',
      description: `سداد مجمع للعمولات المستحقة لـ (${unpaid.length}) عاملة بقيمة $${totalUsd.toLocaleString()}`,
      status: 'معتمد',
      created_at: new Date().toISOString(),
    });

    setShowBatchPayoutModal(false);
    addNotification({
      title: 'سداد مجمع للعمولات الدولية',
      message: `تم سداد مستحقات ${unpaid.length} مرشحة بإجمالي $${totalUsd.toLocaleString()} (${totalSar.toLocaleString()} ر.س) وإصدار سند الصرف الموحد.`,
      type: 'success',
    });
  };

  const handleManualAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandForm.maidName || !newCandForm.passportNumber) return;

    const newC: AgencyCandidate = {
      id: `cand-${Date.now()}`,
      maidName: newCandForm.maidName,
      passportNumber: newCandForm.passportNumber.toUpperCase(),
      nationality: newCandForm.nationality,
      age: parseInt(newCandForm.age) || 25,
      profession: newCandForm.profession,
      medicalStatus: 'FIT',
      visaStatus: 'READY',
      ticketStatus: 'PENDING',
      commissionUsd: parseFloat(newCandForm.commissionUsd) || 1100,
      paymentStatus: 'UNPAID',
      uploadedAt: new Date().toISOString().slice(0, 10),
      agencyName: activeAgency,
    };

    const updated = await realErpDataStore.addRecord<AgencyCandidate>(
      'agency_candidates',
      newC,
      INITIAL_AGENCY_CANDIDATES
    );
    setCandidates(updated);
    setShowUploadModal(false);
    setNewCandForm({
      maidName: '',
      passportNumber: '',
      nationality: 'إثيوبيا',
      age: '25',
      profession: 'عاملة منزلية',
      commissionUsd: '1100'
    });

    addNotification({
      title: 'تسجيل مرشحة جديدة',
      message: `تمت إضافة المرشحة (${newC.maidName}) وحفظها بقاعدة البيانات بنجاح.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Pitch Black Cinematic Header matching ActivityLog/Master Design */}
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <BusinessIllustration type="foreign-agencies" size="sm" />
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Globe2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  INTERNATIONAL AGENCY PORTAL
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  {activeAgency}
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '6px 0 0 0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
                بوابة الوكلاء بالخارج وتدقيق السير الذاتية
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
                إدارة السير الذاتية المرفوعة من مكاتب إثيوبيا، الفلبين، والهند وتتبع الفحوصات والعمولات بالدولار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
              <CorporateAvatar name={activeAgency} role="وكيل دولي معتمد" size="sm" status="verified" />
              <div className="text-right">
                <div className="text-xs font-bold text-white">{activeAgency}</div>
                <div className="text-[10px] text-zinc-400">وكالة دولية معتمدة</div>
              </div>
            </div>
            {totalUsdBalance > 0 && (
              <button
                onClick={() => setShowBatchPayoutModal(true)}
                className="button-white-pill flex items-center gap-1.5"
                style={{ fontSize: '12px', padding: '8px 18px', minHeight: '38px', background: '#10b981', color: '#ffffff' }}
              >
                <DollarSign className="w-4 h-4" />
                <span>سداد مجمع للعمولات (${totalUsdBalance.toLocaleString()})</span>
              </button>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="button-white-pill flex items-center gap-1.5"
              style={{ fontSize: '12px', padding: '8px 18px', minHeight: '38px' }}
            >
              <Plus className="w-4 h-4 text-black" />
              <span>إضافة / رفع سيرة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KasKpiCard
          title="إجمالي السير المرفوعة"
          value={candidates.length.toString()}
          subtitle="سيرة ذاتية قيد المعالجة"
          icon={FileText}
          variant="emerald"
        />
        <KasKpiCard
          title="التأشيرات المنجزة"
          value={candidates.filter(c => c.visaStatus === 'ISSUED').length.toString()}
          subtitle="تأشيرة صادرة من السفارة"
          icon={CheckCircle2}
          variant="sky"
        />
        <KasKpiCard
          title="العمولات المستحقة للوكالة"
          value={`$${totalUsdBalance.toLocaleString()}`}
          subtitle={`${(totalUsdBalance * 3.75).toLocaleString()} ر.س معلق`}
          icon={Clock}
          variant="gold"
        />
        <KasKpiCard
          title="إجمالي العمولات المسددة"
          value={`$${totalPaidUsd.toLocaleString()}`}
          subtitle={`${(totalPaidUsd * 3.75).toLocaleString()} ر.س محول`}
          icon={DollarSign}
          variant="purple"
        />
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم العاملة أو رقم الجواز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <ExportDropdown
            sectionKey="agency_candidates"
            data={filteredCandidates}
            customTitle={`كشف حساب وسير الوكالة الخارجية (${activeAgency})`}
            buttonLabel="تصدير كشف السير والعمولات"
            variant="outline-light"
          />
        </div>
      </div>

      {/* Candidates Table */}
      <div className="table-card bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="p-4">المرشح / العاملة</th>
                <th className="p-4">رقم الجواز</th>
                <th className="p-4">المهنة والجنسية</th>
                <th className="p-4">الفحص الطبي</th>
                <th className="p-4">حالة التأشيرة</th>
                <th className="p-4">تذكرة الطيران</th>
                <th className="p-4">العمولة ($ USD)</th>
                <th className="p-4">حالة السداد</th>
                <th className="p-4 text-center">الإجراءات والعمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredCandidates.map((cand) => (
                <tr key={cand.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <CorporateAvatar name={cand.maidName} profession={cand.profession} isCandidate size="sm" />
                      <span>{cand.maidName}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    {cand.passportNumber}
                  </td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400">
                    {cand.profession} ({cand.nationality})
                  </td>
                  <td className="p-4">
                    <span className={cand.medicalStatus === 'FIT' ? 'pill-tag-mint text-xs' : 'pill-tag-shade text-xs'}>
                      {cand.medicalStatus === 'FIT' ? '✓ لائق طبياً' : 'قيد الفحص'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="pill-tag-mint text-xs font-bold">
                      {cand.visaStatus === 'ISSUED' ? '✓ صادرة' : cand.visaStatus === 'READY' ? 'جاهز للتفييز' : 'قيد المعالجة'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cand.ticketStatus === 'BOOKED' ? 'pill-tag-mint text-xs' : 'pill-tag-shade text-xs'}>
                      {cand.ticketStatus === 'BOOKED' ? 'مؤكد الحجز' : 'بانتظار الحجز'}
                    </span>
                  </td>
                  <td className="p-4 font-bold font-mono text-slate-900 dark:text-white text-sm">
                    ${cand.commissionUsd.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={cand.paymentStatus === 'PAID' ? 'pill-tag-mint text-xs' : 'pill-tag-shade text-xs'}>
                      {cand.paymentStatus === 'PAID' ? '✓ مسدد' : 'مستحق'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {cand.paymentStatus === 'UNPAID' && (
                        <button
                          onClick={() => handleSettleCommission(cand)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                          title="سداد عمولة العاملة وإصدار سند صرف"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>سداد</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleAdvanceStatus(cand)}
                        className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                        title="ترقية مرحلة التأشيرة أو حجز الطيران"
                      >
                        <Plane className="w-3 h-3 text-cyan-600" />
                        <span>ترقية المسار</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(cand)}
                        className="p-1 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                        title="حذف السيرة"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Payout Modal */}
      {showBatchPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-right dir-rtl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  سداد مجمع لعمولات الوكالة
                </h3>
              </div>
              <button 
                onClick={() => setShowBatchPayoutModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">الوكالة المستفيدة:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeAgency}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">عدد المرشحات المستحقات:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{candidates.filter(c => c.paymentStatus === 'UNPAID').length} عاملة</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span className="text-zinc-600 dark:text-zinc-400">إجمالي المبلغ بالدولار:</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">${totalUsdBalance.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">المعادل بالريال السعودي (3.75):</span>
                <span className="font-extrabold text-sm text-emerald-600">{(totalUsdBalance * 3.75).toLocaleString()} ر.س</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              * سيقوم النظام تلقائياً بتوليد سند صرف مالي رسمي وتحديث حالة جميع المرشحات إلى "مسدد" في قاعدة البيانات.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchPayoutModal(false)}
                className="button-outline-on-light text-xs font-bold"
                style={{ padding: '8px 20px' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBatchPayout}
                className="button-primary-pill text-xs font-bold"
                style={{ padding: '8px 22px', background: '#10b981' }}
              >
                تأكيد السداد المجمع وإصدار السند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Add Candidate Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-right dir-rtl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  إضافة مرشحة جديدة / رفع سيرة
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualAddCandidate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">اسم المرشحة بالكامل</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مريم أديس تسفاي"
                    value={newCandForm.maidName}
                    onChange={(e) => setNewCandForm({ ...newCandForm, maidName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">رقم جواز السفر</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: EP8891234"
                    value={newCandForm.passportNumber}
                    onChange={(e) => setNewCandForm({ ...newCandForm, passportNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">الجنسية</label>
                  <select
                    value={newCandForm.nationality}
                    onChange={(e) => setNewCandForm({ ...newCandForm, nationality: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="الفلبين">الفلبين</option>
                    <option value="الهند">الهند</option>
                    <option value="أوغندا">أوغندا</option>
                    <option value="سريلانكا">سريلانكا</option>
                    <option value="كينيا">كينيا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">المهنة</label>
                  <select
                    value={newCandForm.profession}
                    onChange={(e) => setNewCandForm({ ...newCandForm, profession: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="عاملة منزلية">عاملة منزلية</option>
                    <option value="طباخة منزلية">طباخة منزلية</option>
                    <option value="رعاية كبار سن">رعاية كبار سن</option>
                    <option value="سائق خاص">سائق خاص</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">العمولة ($ USD)</label>
                  <input
                    type="number"
                    value={newCandForm.commissionUsd}
                    onChange={(e) => setNewCandForm({ ...newCandForm, commissionUsd: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                  style={{ padding: '8px 20px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold"
                  style={{ padding: '8px 22px' }}
                >
                  حفظ السيرة بقاعدة البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
