import i18n from '../i18n/config';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe2,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Plus,
  Plane,
  ShieldCheck,
  Eye,
  AlertTriangle,
  X,
  ClipboardCheck,
  Paperclip,
  MessageSquare,
  Edit3,
  Languages,
  Send,
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuthContext } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { KasKpiCard } from '../components/kas/KasCards';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { SmartCvExtractorModal } from '../components/cvs/SmartCvExtractorModal';
import {
  ProfessionalAgencyCvTemplate,
  type PrintableAgencyCvData,
} from '../components/cvs/ProfessionalAgencyCvTemplate';
import {
  getUnifiedAgenciesSync,
  loadUnifiedAgencies,
  getMusanedTransactions,
  sanitizeTransactionForExternalAgent,
  updateMusanedTransactionStage,
  getStageLabelAr,
  dispatchViaEmailAndWhatsApp,
  resolveCoordinatorForAgencyOrTx,
  normalizeAgencyCandidate,
  addTransactionAttachment,
  removeTransactionAttachment,
  addTransactionThreadMessage,
  type UnifiedExternalAgency,
  type NormalizedAgencyCandidate,
  type MusanedFollowupTransaction,
  type SanitizedAgencyTransaction,
  type TransactionStage,
} from '../services/externalAgencyMasterService';

export interface AgencyCandidate {
  id: string;
  agency_id?: string;
  maidName: string;
  passportNumber: string;
  nationality: string;
  age: number;
  profession: string;
  medicalStatus: 'FIT' | 'PENDING' | 'UNFIT';
  visaStatus: 'ISSUED' | 'APPLIED' | 'READY';
  ticketStatus: 'BOOKED' | 'PENDING';
  commissionUsd: number;
  deductionUsd?: number;
  deductionReason?: string;
  paymentStatus: 'PAID' | 'UNPAID';
  uploadedAt: string;
  agencyName?: string;
}

const INITIAL_AGENCY_CANDIDATES: AgencyCandidate[] = [
  {
    id: 'cand-1',
    agency_id: 'AGY-ETH-SHEGER',
    maidName: 'MOMINA KEDIR GURMU',
    passportNumber: 'EP9249575',
    nationality: 'أثيوبيا',
    age: 25,
    profession: 'عاملة منزلية',
    medicalStatus: 'FIT',
    visaStatus: 'ISSUED',
    ticketStatus: 'BOOKED',
    commissionUsd: 1050,
    paymentStatus: 'PAID',
    uploadedAt: '2026-10-15',
    agencyName: 'وكالة شيجر الدولية للاستقدام',
  },
  {
    id: 'cand-2',
    agency_id: 'AGY-ETH-TELA',
    maidName: 'HALIMA KEBEDE TESFAYE',
    passportNumber: 'EP9920140',
    nationality: 'أثيوبيا',
    age: 24,
    profession: 'عاملة منزلية',
    medicalStatus: 'FIT',
    visaStatus: 'READY',
    ticketStatus: 'PENDING',
    commissionUsd: 1050,
    paymentStatus: 'UNPAID',
    uploadedAt: '2026-11-02',
    agencyName: 'وكالة تيلا للاستقدام الخارجي',
  },
  {
    id: 'cand-3',
    agency_id: 'AGY-PHL-YOSHI',
    maidName: 'MARIA CRISTINA DELA CRUZ',
    passportNumber: 'P9482716A',
    nationality: 'الفلبين',
    age: 28,
    profession: 'عاملة منزلية',
    medicalStatus: 'FIT',
    visaStatus: 'ISSUED',
    ticketStatus: 'BOOKED',
    commissionUsd: 1350,
    paymentStatus: 'UNPAID',
    uploadedAt: '2026-11-10',
    agencyName: 'وكالة يوشي بروموشنز — الفلبين',
  },
];

type PortalViewTab = 'contracts' | 'uploaded_cvs' | 'statement';

export const ForeignAgencyPortalPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuthContext();
  const { addNotification } = useAppStore();

  const currentProfile = user || authService.getCurrentUser();
  const isExternalPartner = authService.isExternalAgency(currentProfile);
  const canSettleCommissions = !isExternalPartner && authService.isFinance(currentProfile);

  const [portalLang, setPortalLang] = useState<'ar' | 'en'>('ar');
  const [unifiedAgencies, setUnifiedAgencies] = useState<UnifiedExternalAgency[]>(() =>
    getUnifiedAgenciesSync()
  );
  useEffect(() => {
    void loadUnifiedAgencies().then(setUnifiedAgencies);
  }, []);

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(() => {
    if (currentProfile?.agency_id) return currentProfile.agency_id;
    return unifiedAgencies[0]?.id || 'AGY-ETH-SHEGER';
  });

  useEffect(() => {
    if (isExternalPartner && currentProfile?.agency_id) {
      setSelectedAgencyId(currentProfile.agency_id);
    }
  }, [isExternalPartner, currentProfile?.agency_id]);

  const activeAgencyObj = useMemo(
    () =>
      unifiedAgencies.find((a) => a.id === selectedAgencyId) ||
      unifiedAgencies[0],
    [unifiedAgencies, selectedAgencyId]
  );

  const activeAgencyLabel =
    portalLang === 'en'
      ? activeAgencyObj?.name_en || currentProfile?.agency_name || 'Authorized Foreign Agency'
      : activeAgencyObj?.name_ar || currentProfile?.agency_name || 'وكالة دولية معتمدة';

  const [portalTab, setPortalTab] = useState<PortalViewTab>('contracts');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSmartExtractor, setShowSmartExtractor] = useState(false);
  const [contractForCvAssign, setContractForCvAssign] = useState<SanitizedAgencyTransaction | null>(null);
  const [showBatchPayoutModal, setShowBatchPayoutModal] = useState(false);
  const [previewCv, setPreviewCv] = useState<PrintableAgencyCvData | null>(null);

  const [sanitizedContracts, setSanitizedContracts] = useState<SanitizedAgencyTransaction[]>([]);
  const [rawScopedTxsMap, setRawScopedTxsMap] = useState<Record<string, MusanedFollowupTransaction>>({});
  const [agencyCvs, setAgencyCvs] = useState<Record<string, any>[]>([]);
  const [candidates, setCandidates] = useState<AgencyCandidate[]>([]);
  const [txDrawerId, setTxDrawerId] = useState<string | null>(null);
  const [txAttachCat, setTxAttachCat] = useState<
    'مستند مرحلة' | 'تذكرة طيران' | 'تأشيرة' | 'فحص طبي' | 'تفويض' | 'أخرى'
  >('مستند مرحلة');
  const [txThreadText, setTxThreadText] = useState('');
  const [resubmitCvTarget, setResubmitCvTarget] = useState<Record<string, any> | null>(null);
  const [resubmitForm, setResubmitForm] = useState({
    maid_name: '',
    maid_name_ar: '',
    passport_number: '',
    salary: '1000',
    age: '26',
    video_url: '',
  });

  const [flightBookingTarget, setFlightBookingTarget] = useState<SanitizedAgencyTransaction | null>(null);
  const [ticketForm, setTicketForm] = useState({
    flightNumber: 'ET-462',
    airline: 'الخطوط الإثيوبية',
    arrivalDate: new Date().toISOString().slice(0, 10),
    arrivalDestination: 'الرياض',
  });

  const loadAgencyScopedData = useCallback(async () => {
    const targetAgId = isExternalPartner && currentProfile?.agency_id
      ? currentProfile.agency_id
      : selectedAgencyId;

    // 1. Load & sanitize Musaned contracts strictly for THIS agency (PDPL safe!)
    const allTxs = await getMusanedTransactions();
    const scopedRawTxs = allTxs.filter((t) => !t.is_archive && !t.is_deleted && t.agency_id === targetAgId);
    const txMap: Record<string, MusanedFollowupTransaction> = {};
    scopedRawTxs.forEach((t) => {
      txMap[t.id] = t;
    });
    setRawScopedTxsMap(txMap);
    const scopedTxs = scopedRawTxs.map((t) => sanitizeTransactionForExternalAgent(t, unifiedAgencies));
    setSanitizedContracts(scopedTxs);

    // 2. Load CVs uploaded by THIS agency
    const allCvs = await realErpDataStore.getRecords<any>('cvs', []);
    const scopedCvs = allCvs.filter(
      (c) =>
        c.agency_id === targetAgId ||
        String(c.external_office || '').toLowerCase() === String(activeAgencyObj?.name_ar || '').toLowerCase() ||
        (activeAgencyObj &&
          String(c.external_office || '').toLowerCase() === activeAgencyObj.name_en.toLowerCase())
    );
    setAgencyCvs(scopedCvs);

    // 3. Load Financial Commission Statement strictly for THIS agency (with deduction normalization)
    const allCands = await realErpDataStore.getRecords<any>(
      'agency_candidates',
      INITIAL_AGENCY_CANDIDATES
    );
    const scopedCands = allCands
      .map(normalizeAgencyCandidate)
      .filter((c): c is NormalizedAgencyCandidate => Boolean(c))
      .filter(
        (c) =>
          c.agency_id === targetAgId ||
          (activeAgencyObj &&
            (c.agencyName === activeAgencyObj.name_ar || c.agencyName === activeAgencyObj.name_en))
      );
    setCandidates(scopedCands as AgencyCandidate[]);
  }, [isExternalPartner, currentProfile?.agency_id, selectedAgencyId, unifiedAgencies, activeAgencyObj]);

  useEffect(() => {
    void loadAgencyScopedData();
    window.addEventListener('erp-data-updated', loadAgencyScopedData);
    return () => window.removeEventListener('erp-data-updated', loadAgencyScopedData);
  }, [loadAgencyScopedData]);

  const totalUsdBalance = candidates.reduce(
    (sum, c) =>
      c.paymentStatus === 'UNPAID'
        ? sum + Math.max(0, c.commissionUsd - (c.deductionUsd || 0))
        : sum,
    0
  );
  const totalPaidUsd = candidates.reduce(
    (sum, c) => (c.paymentStatus === 'PAID' ? sum + c.commissionUsd : sum),
    0
  );

  const handleAgentStageUpdate = async (
    tx: SanitizedAgencyTransaction,
    nextStage: TransactionStage
  ) => {
    if (nextStage === 'TICKET_BOOKED') {
      setFlightBookingTarget(tx);
      return;
    }

    await updateMusanedTransactionStage({
      transactionId: tx.id,
      nextStage,
      actorName: `بوابة الوكيل (${activeAgencyLabel})`,
    });

    const coord = resolveCoordinatorForAgencyOrTx({
      agencyId: activeAgencyObj?.id,
      nationality: tx.nationality,
      explicitEmail: tx.assigned_coordinator_email,
    });
    await dispatchViaEmailAndWhatsApp({
      recipientName: coord.nameAr,
      recipientPhone: coord.phone,
      recipientEmail: coord.email,
      subject: `تحديث من الوكيل (${activeAgencyLabel}) للعقد #${tx.musaned_contract_no}`,
      bodyText: `قامت وكالة (${activeAgencyLabel}) بتحديث حالة العقد #${tx.musaned_contract_no} للعاملة (${tx.maid_name || '—'}) إلى مرحلة [${getStageLabelAr(nextStage)}].`,
      channel: 'both',
      templateName: 'تحديث مسار من بوابة الوكيل',
      companyId: tx.company_id,
      openExternalClient: false,
    });

    await loadAgencyScopedData();
    addNotification({
      title: portalLang === 'en' ? 'Stage Updated & Coordinator Notified' : 'تم تحديث مرحلة العقد وإشعار قسم المتابعة',
      message: `تم تحديث العقد #${tx.musaned_contract_no} إلى (${getStageLabelAr(nextStage)}) وإشعار المتابعة (${coord.nameAr}).`,
      type: 'success',
    });
  };

  const handleConfirmFlightTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flightBookingTarget) return;

    await updateMusanedTransactionStage({
      transactionId: flightBookingTarget.id,
      nextStage: 'TICKET_BOOKED',
      actorName: `بوابة الوكيل (${activeAgencyLabel})`,
      flightNumber: ticketForm.flightNumber,
      airline: ticketForm.airline,
      arrivalDate: ticketForm.arrivalDate,
      arrivalDestination: ticketForm.arrivalDestination,
    });

    const coord = resolveCoordinatorForAgencyOrTx({
      agencyId: activeAgencyObj?.id,
      nationality: flightBookingTarget.nationality,
      explicitEmail: flightBookingTarget.assigned_coordinator_email,
    });
    await dispatchViaEmailAndWhatsApp({
      recipientName: `${coord.nameAr} + قسم استقبال المطار`,
      recipientPhone: coord.phone,
      recipientEmail: coord.email,
      subject: `تأكيد تذكرة وصول رحلة (${ticketForm.flightNumber}) — عقد #${flightBookingTarget.musaned_contract_no}`,
      bodyText: `تم حجز تذكرة الطيران للعاملة (${flightBookingTarget.maid_name}) على الرحلة (${ticketForm.flightNumber} — ${ticketForm.airline}) وصول يوم ${ticketForm.arrivalDate} إلى مطار ${ticketForm.arrivalDestination} وتمت جدولتها في قسم الحركة والمطار تلقائياً.`,
      channel: 'both',
      templateName: 'إشعار تذكرة سفر واستقبال مطار',
      companyId: flightBookingTarget.company_id,
      openExternalClient: false,
    });

    setFlightBookingTarget(null);
    await loadAgencyScopedData();
    addNotification({
      title: 'تم تسجيل التذكرة وجدولة استقبال المطار تلقائياً',
      message: `انشئ سجل استقبال في صفحة رحلات القدوم والمطار بتاريخ (${ticketForm.arrivalDate}) وتم إشعار المتابعة عبر البريد والواتساب.`,
      type: 'success',
    });
  };

  const handleSettleCommission = async (cand: AgencyCandidate) => {
    if (!canSettleCommissions) return;
    await realErpDataStore.updateRecord<AgencyCandidate>(
      'agency_candidates',
      cand.id,
      { paymentStatus: 'PAID' },
      INITIAL_AGENCY_CANDIDATES
    );
    await realErpDataStore.addRecord('vouchers', {
      id: `VOU-PAY-${Date.now()}`,
      voucher_type: 'سند صرف',
      voucher_number: `PV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: cand.commissionUsd * 3.75,
      amount_usd: cand.commissionUsd,
      currency: 'SAR',
      beneficiary: `وكالة ${activeAgencyLabel} - تسوية عمولة (${cand.maidName})`,
      payment_method: 'تحويل بنكي دولي',
      description: `سداد عمولة استقدام للعاملة ${cand.maidName} (جواز: ${cand.passportNumber})`,
      status: 'معتمد',
      company_id: activeCompany.id === 'all' ? 'SAF' : activeCompany.id,
      created_at: new Date().toISOString(),
    });
    await loadAgencyScopedData();
    addNotification({
      title: 'تم سداد عمولة الوكالة الخارجية',
      message: `تم سداد عمولة (${cand.maidName}) بمبلغ $${cand.commissionUsd} (${(
        cand.commissionUsd * 3.75
      ).toLocaleString()} ⃁) وإصدار سند الصرف.`,
      type: 'success',
    });
  };

  const handleBatchPayout = async () => {
    if (!canSettleCommissions) return;
    const unpaid = candidates.filter((c) => c.paymentStatus === 'UNPAID');
    if (unpaid.length === 0) return;
    const totalUsd = unpaid.reduce((sum, c) => sum + c.commissionUsd, 0);
    const totalSar = totalUsd * 3.75;

    for (const cand of unpaid) {
      await realErpDataStore.updateRecord<AgencyCandidate>(
        'agency_candidates',
        cand.id,
        { paymentStatus: 'PAID' },
        INITIAL_AGENCY_CANDIDATES
      );
    }

    await realErpDataStore.addRecord('vouchers', {
      id: `VOU-PAY-BATCH-${Date.now()}`,
      voucher_type: 'سند صرف',
      voucher_number: `PV-BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: totalSar,
      amount_usd: totalUsd,
      currency: 'SAR',
      beneficiary: `وكالة ${activeAgencyLabel} - سداد مجمع لعمولات ${unpaid.length} مرشحة`,
      payment_method: 'سويفت بنكي دولي (SWIFT)',
      description: `سداد مجمع للعمولات المستحقة لـ (${unpaid.length}) عاملة`,
      status: 'معتمد',
      company_id: activeCompany.id === 'all' ? 'SAF' : activeCompany.id,
      created_at: new Date().toISOString(),
    });

    setShowBatchPayoutModal(false);
    await loadAgencyScopedData();
    addNotification({
      title: 'تم السداد المجمع للعمولات الدولية',
      message: `تم سداد مستحقات ${unpaid.length} مرشحة بإجمالي $${totalUsd.toLocaleString()} (${totalSar.toLocaleString()} ⃁).`,
      type: 'success',
    });
  };

  const handleResubmitRevisedCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitCvTarget) return;
    await realErpDataStore.updateRecord<any>('cvs', resubmitCvTarget.id, {
      maid_name: resubmitForm.maid_name.toUpperCase(),
      maid_name_ar: resubmitForm.maid_name_ar || resubmitForm.maid_name,
      passport_number: resubmitForm.passport_number.toUpperCase(),
      salary: Number(resubmitForm.salary) || 1000,
      age: Number(resubmitForm.age) || 26,
      video_url: resubmitForm.video_url,
      status: 'بانتظار مراجعة القسم',
      approval_status: 'PENDING_REVIEW',
      revision_note: '',
    });

    const coord = resolveCoordinatorForAgencyOrTx({
      agencyId: activeAgencyObj?.id,
      nationality: resubmitCvTarget.nationality,
    });
    await dispatchViaEmailAndWhatsApp({
      recipientName: coord.nameAr,
      recipientPhone: coord.phone,
      recipientEmail: coord.email,
      subject: `إعادة إرسال السيرة المعدلة #${resubmitCvTarget.cv_code} — (${activeAgencyLabel})`,
      bodyText: `قامت وكالة (${activeAgencyLabel}) بتعديل السيرة #${resubmitCvTarget.cv_code} (${resubmitForm.maid_name}) وإعادة إرسالها لاعتماد قسم المتابعة.`,
      channel: 'both',
      templateName: 'إشعار إعادة إرسال سيرة بعد التعديل',
      companyId: 'SAF',
      openExternalClient: false,
    });

    setResubmitCvTarget(null);
    await loadAgencyScopedData();
    addNotification({
      title: portalLang === 'en' ? 'CV Resubmitted for Approval' : 'تمت إعادة إرسال السيرة للاعتماد',
      message:
        portalLang === 'en'
          ? `CV #${resubmitCvTarget.cv_code} sent back to ${coord.nameAr}.`
          : `تم حفظ التعديلات وإشعار (${coord.nameAr}) للمراجعة.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6" dir={portalLang === 'en' ? 'ltr' : 'rtl'}>
      {/* Top Pitch-Black Mobbin Header */}
      <div className="bg-[#141414] text-[#ffffff] rounded-[24px] p-6 sm:p-7 border border-[#262626]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration type="foreign-agencies" size="sm" />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-3 py-0.5 rounded-full bg-[#262626] text-[#ffffff] text-[11px] font-semibold">
                  {portalLang === 'en'
                    ? 'Isolated Foreign Agency Portal'
                    : i18n.t('ats.internationalAgencyPortal', 'بوابة الوكيل الخارجي المعزولة')}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {portalLang === 'en'
                      ? 'Strict Tenant & PDPL PII Isolation'
                      : 'عزل كامل للبيانات وحماية خصوصية العملاء (PDPL)'}
                  </span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#ffffff]">
                {activeAgencyLabel}.
              </h1>
              <p className="text-xs text-[#adadad] mt-1">
                {portalLang === 'en'
                  ? 'Manage assigned Musaned contracts, upload bilingual CVs (PDF/MRZ), track medical/visa/flight stages, and reconcile USD commissions.'
                  : 'متابعة عقود مساند المسندة للوكالة، رفع السير الذاتية بالاستخلاص الذكي (PDF + MRZ)، وإدخال الفحص الطبي والتأشيرات وتذاكر السفر.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPortalLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
              className="px-3.5 py-2 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{portalLang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            {!isExternalPartner && (
              <select
                aria-label="معاينة بوابة وكالة محددة (للمتابعة والإدارة)"
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                className="px-3.5 py-2 rounded-full bg-[#262626] text-[#ffffff] border border-[#404040] text-xs font-bold"
              >
                {unifiedAgencies.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    معاينة وكالة: {ag.name_ar} ({ag.country})
                  </option>
                ))}
              </select>
            )}

            {canSettleCommissions && totalUsdBalance > 0 && (
              <button
                type="button"
                onClick={() => setShowBatchPayoutModal(true)}
                className="px-4 py-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>سداد مجمع (${totalUsdBalance.toLocaleString()})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setContractForCvAssign(null);
                setShowSmartExtractor(true);
              }}
              className="px-5 py-2.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>رفع سيرة ذاتية ذكي (PDF / MRZ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KasKpiCard
          title="عقود مساند المسندة للوكالة"
          value={sanitizedContracts.length.toString()}
          subtitle={`${sanitizedContracts.filter((t) => t.stage === 'UNASSIGNED').length} عقد ينتظر تعيين عاملة`}
          icon={ClipboardCheck}
          variant="emerald"
        />
        <KasKpiCard
          title="السير الذاتية المرفوعة"
          value={agencyCvs.length.toString()}
          subtitle={`${agencyCvs.filter((c) => c.status === 'بانتظار الاعتماد').length} قيد تدقيق المتابعة`}
          icon={FileText}
          variant="sky"
        />
        <KasKpiCard
          title="العمولات المستحقة ($ USD)"
          value={`$${totalUsdBalance.toLocaleString()}`}
          subtitle={`${(totalUsdBalance * 3.75).toLocaleString()} ⃁ معادل`}
          icon={Clock}
          variant="gold"
        />
        <KasKpiCard
          title="إجمالي العمولات المسددة"
          value={`$${totalPaidUsd.toLocaleString()}`}
          subtitle={`${(totalPaidUsd * 3.75).toLocaleString()} ⃁ محول`}
          icon={CheckCircle2}
          variant="purple"
        />
      </div>

      {/* Segmented Tabs */}
      <div className="bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] flex items-center gap-1 overflow-x-auto">
        {[
          {
            id: 'contracts',
            label: `عقود مساند المسندة للوكالة (${sanitizedContracts.length})`,
          },
          {
            id: 'uploaded_cvs',
            label: `السير المرفوعة وحالة الاعتماد (${agencyCvs.length})`,
          },
          {
            id: 'statement',
            label: `كشف الحساب والعمولات ($ USD) (${candidates.length})`,
          },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPortalTab(t.id as PortalViewTab)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              portalTab === t.id
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414] hover:bg-[#ffffff]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: PDPL-MASKED MUSANED CONTRACTS ================= */}
      {portalTab === 'contracts' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">
                عقود مساند المطلوب تعيينها ومتابعتها (تُحجب بيانات العميل الشخصية وفق نظام PDPL)
              </h2>
              <p className="text-[11px] text-[#707070]">
                عيّن العاملة على العقود غير المعيّنة أو حدّث الفحص الطبي وتأشيرة السفارة وتذكرة السفر مباشرة.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-3.5">رقم عقد مساند</th>
                  <th className="p-3.5">المكتب السعودي</th>
                  <th className="p-3.5">المهنة والراتب</th>
                  <th className="p-3.5">العاملة والجواز</th>
                  <th className="p-3.5">انتهاء التأشيرة / مهلة التعيين</th>
                  <th className="p-3.5">المرحلة الحالية</th>
                  <th className="p-3.5 text-center">إجراء الوكيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {sanitizedContracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#707070]">
                      لا توجد عقود نشطة مسندة لهذه الوكالة حالياً.
                    </td>
                  </tr>
                ) : (
                  sanitizedContracts.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#f3f3f3]">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">
                        #{tx.musaned_contract_no}
                        <div className="text-[10px] text-[#707070]">تأشيرة: {tx.visa_number || '—'}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-[#141414]">{tx.company_name_ar}</td>
                      <td className="p-3.5">
                        <div>{tx.profession}</div>
                        <div className="font-mono text-[#707070]">{tx.monthly_salary} ⃁ / شهر</div>
                      </td>
                      <td className="p-3.5">
                        {tx.maid_name ? (
                          <div>
                            <div className="font-bold text-[#141414]">{tx.maid_name}</div>
                            <div className="font-mono text-[11px] text-[#707070]">{tx.passport_number}</div>
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                            مطلوب تعيين عاملة
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <div>انتهاء التأشيرة: {tx.visa_expiry_date || '—'}</div>
                        <div className="text-[#707070]">مهلة SLA: {tx.sla_assign_deadline || '—'}</div>
                      </td>
                      <td className="p-3.5 font-bold">{getStageLabelAr(tx.stage)}</td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                          {tx.stage === 'UNASSIGNED' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setContractForCvAssign(tx);
                                setShowSmartExtractor(true);
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>عيّن عاملة وارفع السيرة</span>
                            </button>
                          ) : (
                            <>
                              {tx.stage !== 'MEDICAL_FIT' &&
                                tx.stage !== 'VISA_STAMPED' &&
                                tx.stage !== 'TICKET_BOOKED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleAgentStageUpdate(tx, 'MEDICAL_FIT')}
                                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                                  >
                                    فحص طبي لائق
                                  </button>
                                )}
                              {tx.stage !== 'VISA_STAMPED' && tx.stage !== 'TICKET_BOOKED' && (
                                <button
                                  type="button"
                                  onClick={() => handleAgentStageUpdate(tx, 'VISA_STAMPED')}
                                  className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                                >
                                  تم تختيم التأشيرة
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAgentStageUpdate(tx, 'TICKET_BOOKED')}
                                className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Plane className="w-3 h-3" />
                                <span>{portalLang === 'en' ? 'Book Flight' : 'إدخال تذكرة الطيران'}</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setTxDrawerId(tx.id)}
                            className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title={portalLang === 'en' ? 'Documents & Chat' : 'المرفقات ومحادثة المتابعة'}
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>
                              {(rawScopedTxsMap[tx.id]?.attachments?.length || 0) +
                                (rawScopedTxsMap[tx.id]?.messages_thread?.length || 0)}
                            </span>
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
      )}

      {/* ================= TAB 2: AGENCY UPLOADED CVS & APPROVAL STATUS ================= */}
      {portalTab === 'uploaded_cvs' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="بحث في السير الذاتية المرفوعة"
                placeholder="بحث بالاسم أو رقم الجواز..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-full bg-[#f0f0f0] text-xs text-[#141414]"
              />
            </div>
            <span className="text-xs text-[#707070]">
              تمر جميع السير المرفوعة وجوبياً على اعتماد قسم المتابعة (أ. إسلام عرفة وأ. محمود فودة) قبل إتاحتها للمبيعات.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-3.5">كود السيرة</th>
                  <th className="p-3.5">اسم المرشحة</th>
                  <th className="p-3.5">رقم الجواز</th>
                  <th className="p-3.5">المهنة والراتب</th>
                  <th className="p-3.5">حالة الاعتماد والحجز</th>
                  <th className="p-3.5">ملاحظات قسم المتابعة</th>
                  <th className="p-3.5 text-center">معاينة القالب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {agencyCvs
                  .filter(
                    (c) =>
                      !searchQuery.trim() ||
                      String(c.maid_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      String(c.passport_number || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((cv) => (
                    <tr key={cv.id} className="hover:bg-[#f3f3f3]">
                      <td className="p-3.5 font-mono font-bold">{cv.cv_code}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{cv.maid_name}</td>
                      <td className="p-3.5 font-mono">{cv.passport_number}</td>
                      <td className="p-3.5">
                        {cv.job} • {cv.salary} ⃁
                      </td>
                      <td className="p-3.5">
                        <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold text-[11px] text-[#141414]">
                          {cv.status === 'بانتظار الاعتماد'
                            ? 'بانتظار اعتماد المتابعة'
                            : cv.status === 'محجوز'
                            ? 'محجوزة للمبيعات (مقفلة)'
                            : cv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#707070]">
                        {cv.revision_note ? (
                          <span className="font-bold text-[#141414] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{cv.revision_note}</span>
                          </span>
                        ) : (
                          'مطابقة'
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {cv.revision_note && (
                            <button
                              type="button"
                              onClick={() => {
                                setResubmitCvTarget(cv);
                                setResubmitForm({
                                  maid_name: cv.maid_name || '',
                                  maid_name_ar: cv.maid_name_ar || '',
                                  passport_number: cv.passport_number || '',
                                  salary: String(cv.salary || 1000),
                                  age: String(cv.age || 26),
                                  video_url: cv.video_url || '',
                                });
                              }}
                              className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{portalLang === 'en' ? 'Edit & Resubmit' : 'تعديل وإعادة إرسال'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPreviewCv(cv as PrintableAgencyCvData)}
                            className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{portalLang === 'en' ? 'Preview A4' : 'معاينة A4'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: FINANCIAL COMMISSION STATEMENT ================= */}
      {portalTab === 'statement' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold text-[#141414]">
              كشف حساب العمولات الدولية للوكالة ({activeAgencyLabel})
            </h2>
            <ExportDropdown
              sectionKey="agency_candidates"
              data={candidates}
              customTitle={`كشف عمولات الوكالة (${activeAgencyLabel})`}
              buttonLabel="تصدير كشف العمولات"
              variant="outline-light"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-4">اسم العاملة</th>
                  <th className="p-4">رقم الجواز</th>
                  <th className="p-4">التأشيرة</th>
                  <th className="p-4">{portalLang === 'en' ? 'Ticket' : 'التذكرة'}</th>
                  <th className="p-4">{portalLang === 'en' ? 'Commission ($ USD)' : 'العمولة ($ USD)'}</th>
                  <th className="p-4">{portalLang === 'en' ? 'Clawback / Deduction' : 'الخصم / المسبب'}</th>
                  <th className="p-4">{portalLang === 'en' ? 'Net ($)' : 'الصافي ($)'}</th>
                  <th className="p-4">{portalLang === 'en' ? 'Status' : 'حالة السداد'}</th>
                  {canSettleCommissions && <th className="p-4 text-center">تسوية المالية</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {candidates.map((cand) => {
                  const ded = Number(cand.deductionUsd || 0);
                  const netUsd = Math.max(0, Number(cand.commissionUsd || 0) - ded);
                  return (
                  <tr key={cand.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-4 font-bold text-[#141414]">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={cand.maidName} profession={cand.profession} isCandidate size="sm" />
                        <span>{cand.maidName}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono">{cand.passportNumber}</td>
                    <td className="p-4">
                      {cand.visaStatus === 'ISSUED' ? 'صادرة' : 'قيد الإجراء'}
                    </td>
                    <td className="p-4">
                      {cand.ticketStatus === 'BOOKED' ? 'مؤكدة' : 'بانتظار الحجز'}
                    </td>
                    <td className="p-4 font-mono font-bold">${cand.commissionUsd.toLocaleString()}</td>
                    <td className="p-4 font-mono text-[11px] text-[#707070]">
                      {ded > 0 ? `-$${ded.toLocaleString()} (${cand.deductionReason || 'Backout'})` : '—'}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#141414]">${netUsd.toLocaleString()}</td>
                    <td className="p-4 font-bold">
                      {cand.paymentStatus === 'PAID'
                        ? portalLang === 'en'
                          ? 'Paid'
                          : 'مسددة'
                        : portalLang === 'en'
                        ? 'Unpaid'
                        : 'مستحقة'}
                    </td>
                    {canSettleCommissions && (
                      <td className="p-4 text-center">
                        {cand.paymentStatus === 'UNPAID' && (
                          <button
                            type="button"
                            onClick={() => handleSettleCommission(cand)}
                            className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                          >
                            سداد وإصدار سند صرف
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Smart CV Extractor Modal */}
      <SmartCvExtractorModal
        isOpen={showSmartExtractor}
        onClose={() => {
          setShowSmartExtractor(false);
          setContractForCvAssign(null);
        }}
        agencyId={activeAgencyObj?.id}
        agencyName={activeAgencyLabel}
        isExternalAgentSession={isExternalPartner}
        linkedContractNo={contractForCvAssign?.musaned_contract_no}
        onSaved={async (savedCv) => {
          if (contractForCvAssign) {
            await updateMusanedTransactionStage({
              transactionId: contractForCvAssign.id,
              nextStage: 'ASSIGNED',
              actorName: `بوابة الوكيل (${activeAgencyLabel})`,
              maidName: savedCv.maid_name,
              passportNumber: savedCv.passport_number,
              cvId: savedCv.id,
            });
          }
          await loadAgencyScopedData();
        }}
      />

      {/* Flight Ticket Booking Modal -> Auto Airport Reception */}
      {flightBookingTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setFlightBookingTarget(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                تأكيد تذكرة الطيران — عقد #{flightBookingTarget.musaned_contract_no}
              </h3>
              <button
                type="button"
                onClick={() => setFlightBookingTarget(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmFlightTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#707070] mb-1">رقم الرحلة (Flight No.)</label>
                <input
                  type="text"
                  required
                  value={ticketForm.flightNumber}
                  onChange={(e) => setTicketForm({ ...ticketForm, flightNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block font-bold text-[#707070] mb-1">شركة الطيران</label>
                <input
                  type="text"
                  required
                  value={ticketForm.airline}
                  onChange={(e) => setTicketForm({ ...ticketForm, airline: e.target.value })}
                  className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">تاريخ الوصول</label>
                  <input
                    type="date"
                    required
                    value={ticketForm.arrivalDate}
                    onChange={(e) => setTicketForm({ ...ticketForm, arrivalDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">مطار الوصول</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.arrivalDestination}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, arrivalDestination: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlightBookingTarget(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ التذكرة وإشعار المطار والمتابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-Page SHEGER Preview Modal */}
      {previewCv && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewCv(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto"
          >
            <ProfessionalAgencyCvTemplate
              cv={previewCv}
              defaultOfficeCode="SAF"
              canViewInternalAudit={!isExternalPartner}
              onClose={() => setPreviewCv(null)}
            />
          </div>
        </div>
      )}

      {/* Batch Payout Modal (Finance Only) */}
      {showBatchPayoutModal && canSettleCommissions && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowBatchPayoutModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">سداد مجمع لعمولات الوكالة</h3>
              <button
                type="button"
                onClick={() => setShowBatchPayoutModal(false)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="bg-[#f3f3f3] p-4 rounded-[16px] text-xs space-y-1.5">
              <div>الوكالة: <strong>{activeAgencyLabel}</strong></div>
              <div>الإجمالي بالدولار: <strong className="font-mono">${totalUsdBalance.toLocaleString()}</strong></div>
              <div>المعادل بالريال: <strong className="font-mono">{(totalUsdBalance * 3.75).toLocaleString()} ⃁</strong></div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchPayoutModal(false)}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleBatchPayout}
                className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold text-xs cursor-pointer"
              >
                تأكيد السداد المجمع وإصدار السند
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit & Resubmit CV with Revision Note */}
      {resubmitCvTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setResubmitCvTarget(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                {portalLang === 'en' ? 'Edit & Resubmit CV' : 'تعديل وإعادة إرسال السيرة'}{' '}
                {resubmitCvTarget.cv_code}
              </h3>
              <button
                type="button"
                onClick={() => setResubmitCvTarget(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            {resubmitCvTarget.revision_note && (
              <div className="bg-[#f3f3f3] border border-[#141414] rounded-[14px] p-3 text-xs font-semibold text-[#141414]">
                {portalLang === 'en' ? 'Coordinator Note: ' : 'ملاحظة قسم المتابعة: '}
                {resubmitCvTarget.revision_note}
              </div>
            )}
            <form onSubmit={handleResubmitRevisedCv} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#707070] mb-1">Full Name (EN)</label>
                <input
                  type="text"
                  required
                  value={resubmitForm.maid_name}
                  onChange={(e) => setResubmitForm({ ...resubmitForm, maid_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">Passport</label>
                  <input
                    type="text"
                    required
                    value={resubmitForm.passport_number}
                    onChange={(e) =>
                      setResubmitForm({ ...resubmitForm, passport_number: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">Salary</label>
                  <input
                    type="number"
                    value={resubmitForm.salary}
                    onChange={(e) => setResubmitForm({ ...resubmitForm, salary: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">Age</label>
                  <input
                    type="number"
                    value={resubmitForm.age}
                    onChange={(e) => setResubmitForm({ ...resubmitForm, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#707070] mb-1">Video Link</label>
                <input
                  type="text"
                  value={resubmitForm.video_url}
                  onChange={(e) => setResubmitForm({ ...resubmitForm, video_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  dir="ltr"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResubmitCvTarget(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  {portalLang === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  {portalLang === 'en' ? 'Resubmit to Follow-up' : 'حفظ وإعادة الإرسال للاعتماد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Stage Document Attachments & Contract Messaging (Isolated from Customer PII) */}
      {txDrawerId && rawScopedTxsMap[txDrawerId] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setTxDrawerId(null)}
          className="fixed inset-0 z-50 bg-black/60 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border-r border-[#e0e0e0] w-full max-w-lg h-full overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#141414]">
                  {portalLang === 'en' ? 'Documents & Coordinator Chat' : 'المرفقات ومحادثة المتابعة'} — #
                  {rawScopedTxsMap[txDrawerId].musaned_contract_no}
                </h3>
                <p className="text-[11px] text-[#707070]">
                  {rawScopedTxsMap[txDrawerId].maid_name || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTxDrawerId(null)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-[#141414]">
                {portalLang === 'en' ? 'Stage Attachments' : 'مرفقات المرحلة (فحص طبي / تأشيرة / تذكرة)'}
              </div>
              <div className="flex items-center gap-2 flex-wrap bg-[#f3f3f3] p-3 rounded-[16px] border border-[#e0e0e0]">
                <select
                  value={txAttachCat}
                  onChange={(e) => setTxAttachCat(e.target.value as any)}
                  className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  <option value="فحص طبي">فحص طبي / Medical</option>
                  <option value="تأشيرة">تأشيرة / Visa</option>
                  <option value="تذكرة طيران">تذكرة طيران / Ticket</option>
                  <option value="مستند مرحلة">مستند مرحلة / Stage Doc</option>
                </select>
                <label className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{portalLang === 'en' ? 'Upload File' : 'رفع ملف'}</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1_500_000) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        await addTransactionAttachment(txDrawerId, {
                          name: file.name,
                          category: txAttachCat,
                          mimeType: file.type || 'application/octet-stream',
                          sizeBytes: file.size,
                          dataUrl: String(reader.result || ''),
                          uploadedBy: activeAgencyLabel,
                          uploadedByRole: 'external_agency',
                        });
                        await loadAgencyScopedData();
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <div className="space-y-2">
                {(rawScopedTxsMap[txDrawerId].attachments || []).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#141414] truncate">{att.name}</div>
                      <div className="text-[10.5px] text-[#707070]">{att.category}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={att.dataUrl}
                        download={att.name}
                        className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]"
                      >
                        Download
                      </a>
                      {att.uploadedByRole === 'external_agency' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await removeTransactionAttachment(txDrawerId, att.id);
                            await loadAgencyScopedData();
                          }}
                          className="px-2 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10.5px] font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#e0e0e0]">
              <div className="text-xs font-bold text-[#141414]">
                {portalLang === 'en' ? 'Direct Messages with Follow-up Desk' : 'المحادثة المباشرة مع قسم المتابعة'}
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto bg-[#f3f3f3] p-3 rounded-[16px] border border-[#e0e0e0]">
                {(rawScopedTxsMap[txDrawerId].messages_thread || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-[12px] text-xs ${
                      msg.senderRole === 'agency'
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                    }`}
                  >
                    <div className="text-[10px] opacity-75 mb-1">
                      {msg.senderName} • {msg.sentAt.slice(0, 16).replace('T', ' ')}
                    </div>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!txThreadText.trim()) return;
                  await addTransactionThreadMessage(txDrawerId, {
                    senderName: activeAgencyLabel,
                    senderRole: 'agency',
                    body: txThreadText.trim(),
                  });
                  setTxThreadText('');
                  await loadAgencyScopedData();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={portalLang === 'en' ? 'Write message to coordinator...' : 'اكتب رسالة لقسم المتابعة...'}
                  value={txThreadText}
                  onChange={(e) => setTxThreadText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-full bg-[#f0f0f0] text-xs text-[#141414]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{portalLang === 'en' ? 'Send' : 'إرسال'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForeignAgencyPortalPage;
