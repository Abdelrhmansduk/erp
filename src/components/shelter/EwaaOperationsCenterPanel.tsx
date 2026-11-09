import React, { useState, useMemo } from 'react';
import {
  EWAA_BELONGING_KINDS,
  EWAA_BELONGING_CUSTODY,
  EwaaBelongingInput,
  intakeObservation,
  IntakeObservationInput,
  EWAA_WORKFLOW_STATES,
  EWAA_WORKFLOW_ROUTES,
  EwaaWorkflowStateKey,
} from '../../services/ewaaHousingEngine';
import { shelterTransferStore } from '../../services/shelterTransferStore';
import { GroupOfficeId } from '../../types/shelterTransferSuite';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  PlaneTakeoff,
  Scale,
  Briefcase,
  UserCheck,
  HelpCircle,
  Lock,
  Sparkles,
  Plus,
} from 'lucide-react';

interface EwaaOperationsCenterPanelProps {
  onRefresh?: () => void;
}

export const EwaaOperationsCenterPanel: React.FC<EwaaOperationsCenterPanelProps> = ({ onRefresh }) => {
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(() => {
    const list = shelterTransferStore.getWorkers();
    return list[0]?.id || 'w-101';
  });
  const [activeSubMode, setActiveSubMode] = useState<'command' | 'stages_matrix' | 'fact_intake' | 'claims_and_departure'>('command');
  const [activeDistributionFilter, setActiveDistributionFilter] = useState<string>('all');
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fact-driven Intake State
  const [workerName, setWorkerName] = useState('');
  const [nationality, setNationality] = useState('الفلبين');
  const [passportNo, setPassportNo] = useState('');
  const [officeId, setOfficeId] = useState<GroupOfficeId>('SAF');
  const [sponsorName, setSponsorName] = useState('');
  const [receivingEmployee, setReceivingEmployee] = useState('مشرف الإيواء المناوب');

  const [obsForm, setObsForm] = useState<IntakeObservationInput>({
    source: 'employer',
    worker_intent: 'undecided',
    employer_intent: 'undecided',
    reported_refusal: 'unknown',
    refusing_party: 'unknown',
    unpaid_wages: 'unknown',
    salary_amount: '',
    passport_available: 'unknown',
    passport_valid: 'unknown',
    residency_issue: 'unknown',
    absconding_status: 'unknown',
    final_exit_status: 'unknown',
    ticket_responsible: 'unknown',
    safety_concern: 'no',
    medical_concern: 'no',
    official_case_open: 'no',
    flight_disrupted: 'no',
    unknown_whereabouts: 'no',
    in_housing_receipt: true,
    direct_airport_handover: false,
    handover_recipient_name: '',
    handover_recipient_id: '',
    handover_receipt_ref: '',
    refusal_document_available: false,
    refusal_exemption_reason: '',
    topics: ['intake'],
  });

  const [belongings, setBelongings] = useState<EwaaBelongingInput[]>(() =>
    EWAA_BELONGING_KINDS.map((k) => ({
      item_key: k.key,
      custody: 'unknown',
      description: '',
      amount: null,
    }))
  );

  // Wage Payment & Departure Gate Forms
  const [claimTotalInput, setClaimTotalInput] = useState('3000');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'reported_unverified' | 'verified_with_evidence'>('verified_with_evidence');
  const [paymentEvidenceRef, setPaymentEvidenceRef] = useState('');
  const [departureEvidenceRef, setDepartureEvidenceRef] = useState('');
  const [departureVerifier, setDepartureVerifier] = useState('مندوب المطار - فهد العتيبي');

  const workers = useMemo(() => {
    void refreshTick;
    return shelterTransferStore.getWorkers();
  }, [refreshTick]);

  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) || workers[0],
    [workers, selectedWorkerId]
  );

  const diagnostic = useMemo(() => {
    void refreshTick;
    if (!selectedWorker) return null;
    return shelterTransferStore.getWorkerEwaaDiagnostic(selectedWorker.id);
  }, [selectedWorker, refreshTick]);

  const operationalBoard = useMemo(() => {
    void refreshTick;
    return shelterTransferStore.getHousingOperationalBoard();
  }, [refreshTick]);

  const filteredBoardRows = useMemo(() => {
    const rows = operationalBoard.rows;
    switch (activeDistributionFilter) {
      case 'intake':
        return rows.filter((r) => r.routeKey === 'intake');
      case 'arrival':
        return rows.filter((r) => r.routeKey === 'arrival_delivery');
      case 'transfer':
        return rows.filter((r) => r.routeKey === 'transfer');
      case 'final':
        return rows.filter((r) => r.routeKey === 'final_exit');
      case 'visa-ticket-pending':
        return rows.filter((r) => r.issuedAwaitingTicket);
      case 'formal':
        return rows.filter((r) => ['legal', 'labor_dispute', 'health', 'verification'].includes(r.routeKey));
      case 'return':
        return rows.filter((r) => r.routeKey === 'return');
      case 'action':
        return rows.filter((r) => r.missingCount > 0);
      case 'overdue':
        return rows.filter((r) => r.slaOverdue);
      case 'residence':
        return rows.filter((r) => r.residenceOverLimit);
      default:
        return rows;
    }
  }, [operationalBoard, activeDistributionFilter]);

  const handleTransitionStage = (nextStateKey: EwaaWorkflowStateKey) => {
    if (!selectedWorker) return;
    try {
      const def = shelterTransferStore.updateWorkerJourneyState({
        workerId: selectedWorker.id,
        nextStateKey,
        actorEmployee: receivingEmployee,
      });
      setFeedbackBanner({
        type: 'success',
        text: `تم نقل العاملة (${selectedWorker.fullNameAr}) إلى المرحلة النظامية: ${def.label_ar} (${def.state_key}).`,
      });
      triggerReload();
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    }
  };

  // Live preview of intakeObservation
  const liveObservationPreview = useMemo(() => {
    try {
      const res = intakeObservation({
        ...obsForm,
        belongings,
      });
      return { ok: true as const, result: res };
    } catch (err: any) {
      return { ok: false as const, error: err.message };
    }
  }, [obsForm, belongings]);

  const triggerReload = () => {
    setRefreshTick((t) => t + 1);
    if (onRefresh) onRefresh();
  };

  const handleFactIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackBanner(null);
    if (!workerName.trim() || !passportNo.trim()) {
      setFeedbackBanner({ type: 'error', text: 'يرجى إدخال اسم العاملة ورقم الجواز.' });
      return;
    }

    const res = shelterTransferStore.intakeWorkerWithEwaaFacts({
      fullNameAr: workerName.trim(),
      nationality,
      passportNumber: passportNo.trim(),
      originalOfficeId: officeId,
      shelterBranch: 'الرياض - المقر الرئيسي',
      sponsorName: sponsorName.trim() || undefined,
      receivingEmployee,
      observationInput: {
        ...obsForm,
        belongings,
      },
    });

    if (!res.success || !res.worker) {
      setFeedbackBanner({ type: 'error', text: res.error || 'تعذر حفظ الاستلام المبني على الوقائع' });
      return;
    }

    setSelectedWorkerId(res.worker.id);
    setWorkerName('');
    setPassportNo('');
    setFeedbackBanner({
      type: 'success',
      text: res.observationResult?.creates_housing_stay
        ? `تم استلام وتسكين العاملة (${res.worker.fullNameAr}) واشتقاق المسار التشغيلي تلقائياً من الوقائع.`
        : `تم توثيق الحالة للعاملة (${res.worker.fullNameAr}) بدون إنشاء إقامة وهمية بالسكن (${res.observationResult?.current_location}).`,
    });
    triggerReload();
    setActiveSubMode('command');
  };

  const handleRecordWagePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setFeedbackBanner(null);
    try {
      if ((selectedWorker.wageClaimTotal || 0) === 0 && Number(claimTotalInput) > 0) {
        selectedWorker.wageClaimTotal = Number(claimTotalInput);
      }
      const rec = shelterTransferStore.recordWageClaimPayment({
        workerId: selectedWorker.id,
        amount: Number(paymentAmount),
        status: paymentStatus,
        evidenceRef: paymentEvidenceRef,
        recordedBy: receivingEmployee,
      });
      setPaymentAmount('');
      setPaymentEvidenceRef('');
      setFeedbackBanner({
        type: 'success',
        text: rec.statusSummaryAr,
      });
      triggerReload();
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    }
  };

  const handleVerifyDeparture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setFeedbackBanner(null);
    try {
      shelterTransferStore.verifyFinalDeparture({
        workerId: selectedWorker.id,
        departureEvidenceRef,
        verifiedByEmployee: departureVerifier,
      });
      setDepartureEvidenceRef('');
      setFeedbackBanner({
        type: 'success',
        text: `تم توثيق المغادرة النهائية للعاملة (${selectedWorker.fullNameAr}) بموجب الدليل المرفق وإغلاق عهدة السكن رسمياً.`,
      });
      triggerReload();
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', text: err.message });
    }
  };

  const handleReconfirmIntent = (intent: 'transfer' | 'final_exit' | 'return_employer') => {
    if (!selectedWorker) return;
    shelterTransferStore.reconfirmWorkerIntentAfterReturn({
      workerId: selectedWorker.id,
      confirmedIntent: intent,
      actorEmployee: receivingEmployee,
    });
    setFeedbackBanner({
      type: 'success',
      text: `تم توثيق وتأكيد رغبة العاملة (${selectedWorker.fullNameAr}) المحدثة بنجاح.`,
    });
    triggerReload();
  };

  return (
    <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 sm:p-6 space-y-5 text-[#141414]" dir="rtl">
      {/* Top Header & Sub-Mode Switcher */}
      <div className="flex flex-col gap-3.5 border-b border-[#f0f0f0] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>محرك قرارات الإيواء المبني على الوقائع والأدلة (Ewaa Engine)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414]">
                قاعدة: غير معروف ≠ لا • تجربة 10 أيام (بحد أقصى 3 تجارب) • بوابة إثبات المغادرة
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#141414] m-0">
              مركز التحكم التشغيلي والوقائع والبدائل الحتمية للسكن ونقل الخدمات
            </h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[#f3f3f3] p-1.5 rounded-2xl border border-[#e0e0e0] flex-wrap self-start">
          <button
            type="button"
            onClick={() => setActiveSubMode('command')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubMode === 'command' ? 'bg-[#141414] text-[#ffffff]' : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            لوحة السكن وخطة التشغيل ({workers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubMode('stages_matrix')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubMode === 'stages_matrix' ? 'bg-[#141414] text-[#ffffff]' : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            مراحل الإيواء والسكن (28 مرحلة نظامية)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubMode('fact_intake')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              activeSubMode === 'fact_intake' ? 'bg-[#141414] text-[#ffffff]' : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>استلام مبني على الوقائع / تسليم مطار مباشر</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubMode('claims_and_departure')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubMode === 'claims_and_departure'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414]'
            }`}
          >
            مطالبات الأجور وبوابة إثبات المغادرة
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            feedbackBanner.type === 'success'
              ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
              : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline px-2 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* =====================================================================
          MODE 1: UNIFIED COMMAND & SCENARIO OUTLOOK
         ===================================================================== */}
      {activeSubMode === 'command' && selectedWorker && diagnostic && (
        <div className="space-y-5">
          {/* 1A. Canonical Operational Distribution Cards (8 Cards) + Attention Indicators (3 Cards) — Parity with ewaa/app/housing/page.tsx */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-[#141414]">
                توزيع حالات السكن ومؤشرات الانتباه (مطابق لـ ewaa/app/housing/page.tsx)
              </div>
              <span className="text-[11px] text-[#707070]">
                اضغط على أي مرحلة لتصفية جدول السكن وتقدم المعاملة أدناه
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {operationalBoard.operationalCards.map((card) => {
                const isActive = activeDistributionFilter === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setActiveDistributionFilter(card.key)}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                        : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#eaeaea]'
                    }`}
                  >
                    <span className={`text-[11px] font-bold leading-snug ${isActive ? 'text-[#ffffff]' : 'text-[#707070]'}`}>
                      {card.label_ar}
                    </span>
                    <span className="text-lg font-bold font-mono mt-1.5">{card.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {operationalBoard.attentionCards.map((card) => {
                const isActive = activeDistributionFilter === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setActiveDistributionFilter(card.key)}
                    className={`px-3.5 py-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                        : 'bg-white text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#141414]'}`} />
                      <span>مؤشر انتباه: {card.label_ar}</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        isActive ? 'bg-[#f3f3f3] text-[#141414]' : 'bg-[#f3f3f3] text-[#141414]'
                      }`}
                    >
                      {card.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Worker Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {workers.map((w) => {
              const isSelected = w.id === selectedWorker.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e5e5e5]'
                  }`}
                >
                  <span>{w.fullNameAr}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-[#f3f3f3] text-[#141414]' : 'bg-white text-[#707070]'
                    }`}
                  >
                    تجارب: {w.clientTrialsCount || 0}/3
                  </span>
                </button>
              );
            })}
          </div>

          {/* Unified Operational Plan Card + Canonical Stage Progression & Requirements */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold">
                  {diagnostic.summary.physicalVsStageBadgeAr}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-[#e0e0e0] text-xs font-bold text-[#141414]">
                  المسار النظامي: {diagnostic.canonicalRouteDef.label_ar} ({diagnostic.canonicalRouteDef.key})
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-[#e0e0e0] text-xs font-bold text-[#141414]">
                  بانتظار: {diagnostic.canonicalStateDef.waiting_on_default || 'المكتب'} • SLA:{' '}
                  {diagnostic.canonicalStateDef.sla_hours ? `${diagnostic.canonicalStateDef.sla_hours} ساعة` : 'مفتوح'}
                </span>
                <span className="px-3 py-1 rounded-full bg-white border border-[#e0e0e0] text-xs font-bold text-[#141414]">
                  طابور السكن: {diagnostic.showInHousingWorkQueue ? 'نشط' : 'خارج الطابور'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#707070]">
                  تغيير المرحلة النظامية:
                </span>
                <select
                  value={diagnostic.canonicalStateKey}
                  onChange={(e) => handleTransitionStage(e.target.value as EwaaWorkflowStateKey)}
                  className="bg-white border border-[#e0e0e0] rounded-full px-3 py-1 text-xs font-bold text-[#141414] cursor-pointer"
                  aria-label="تغيير مرحلة الإيواء والسكن"
                >
                  {EWAA_WORKFLOW_STATES.map((st) => (
                    <option key={st.state_key} value={st.state_key}>
                      [{st.route_key}] {st.label_ar}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {diagnostic.summary.intentConflictWarningAr && (
              <div className="p-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#141414]" />
                <span>{diagnostic.summary.intentConflictWarningAr}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-[#e0e0e0]">
                <div className="text-[11px] font-semibold text-[#707070] mb-1">الإجراء المطلوب الآن (Next Best Action)</div>
                <div className="text-xs font-bold text-[#141414] leading-relaxed">
                  {diagnostic.summary.nextBestActionAr}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#e0e0e0]">
                <div className="text-[11px] font-semibold text-[#707070] mb-1">وصف المرحلة الحالية والوقائع</div>
                <div className="text-xs font-medium text-[#141414] leading-relaxed">
                  {diagnostic.canonicalStateDef.description_ar}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-[#e0e0e0] space-y-1.5">
                <div className="text-[11px] font-semibold text-[#707070]">ضوابط أهلية النقل والتجارب (Ewaa Guard)</div>
                {diagnostic.eligibility.allowed ? (
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>مؤهلة لنقل الخدمات (مدة التجربة النظامية: {diagnostic.defaultTrialDays} أيام)</span>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-[#141414] space-y-1">
                    {diagnostic.eligibility.blockersAr.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
                {diagnostic.eligibility.warningsAr.map((w, idx) => (
                  <div key={idx} className="text-[11px] font-semibold text-[#141414]">
                    • {w}
                  </div>
                ))}
                {selectedWorker.clientTrialsCount > 0 && selectedWorker.intentConfirmedAfterReturn === false && (
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleReconfirmIntent('transfer')}
                      className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold cursor-pointer"
                    >
                      تأكيد رغبتها بنقل جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReconfirmIntent('final_exit')}
                      className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                    >
                      تأكيد رغبتها بالخروج النهائي
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Canonical Stage Requirements (workflow_state_requirements) & Remaining Stages (remainingJourneyStages) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-white border border-[#e0e0e0] space-y-2">
                <div className="text-[11px] font-bold text-[#141414] flex items-center justify-between">
                  <span>متطلبات المرحلة الحالية ({diagnostic.canonicalStateDef.label_ar})</span>
                  <span className="text-[10px] font-mono text-[#707070]">
                    {diagnostic.canonicalRequirements.length} متطلب
                  </span>
                </div>
                {diagnostic.canonicalRequirements.length === 0 ? (
                  <div className="text-xs text-[#707070]">
                    لا توجد متطلبات معلقة خاصة بهذه المرحلة؛ تُدار عبر متابعة المسار الزمني.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {diagnostic.canonicalRequirements.map((req) => (
                      <span
                        key={req.requirement_key}
                        className="px-2.5 py-1 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414] flex items-center gap-1.5"
                      >
                        <FileCheck2 className="w-3 h-3 text-[#707070]" />
                        <span>{req.label_ar}</span>
                        <span className="text-[10px] text-[#707070]">
                          ({req.requirement_type === 'evidence' ? `دليل: ${req.document_type}` : 'واقعة'})
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#e0e0e0] space-y-2">
                <div className="text-[11px] font-bold text-[#141414] flex items-center justify-between">
                  <span>المراحل المتبقية المتوقعة في المسار (remainingJourneyStages)</span>
                  <span className="text-[10px] font-mono text-[#707070]">
                    {diagnostic.remainingStages.length} مراحل تالية
                  </span>
                </div>
                {diagnostic.remainingStages.length === 0 ? (
                  <div className="text-xs text-[#707070]">
                    وصلت العاملة إلى المرحلة الختامية في هذا المسار.
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {diagnostic.remainingStages.map((st, idx) => (
                      <button
                        key={st.state_key}
                        type="button"
                        onClick={() => handleTransitionStage(st.state_key)}
                        className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#262626] hover:text-[#141414] border border-[#e0e0e0] text-[11px] font-bold transition-all cursor-pointer"
                        title={`انقل المرحلة إلى: ${st.label_ar}`}
                      >
                        {idx + 1}. {st.label_ar}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Canonical 16-Column Housing & Transaction Progress Table (قائمة السكن وتقدم المعاملة — ewaa/app/housing/page.tsx) */}
          <div className="border border-[#e0e0e0] rounded-2xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-[#141414] m-0">
                  قائمة السكن وتقدم المعاملة ({filteredBoardRows.length})
                </h4>
                {activeDistributionFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setActiveDistributionFilter('all')}
                    className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold cursor-pointer"
                  >
                    عرض الكل ({operationalBoard.rows.length})
                  </button>
                )}
              </div>
              <span className="text-[11px] text-[#707070]">
                الأعمدة الـ 16 المطابقة لصفحة السكن في الكود السابق (ewaa/app/housing/page.tsx)
              </span>
            </div>

            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="جدول الإيواء ومتابعة المعاملة">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f8f8f8] text-[#707070] font-bold border-b border-[#e0e0e0] whitespace-nowrap">
                  <tr>
                    <th className="p-2.5">العاملة</th>
                    <th className="p-2.5">رقم العاملة</th>
                    <th className="p-2.5">الجنسية</th>
                    <th className="p-2.5">الجواز</th>
                    <th className="p-2.5">الإقامة</th>
                    <th className="p-2.5">العميل / صاحب العمل</th>
                    <th className="p-2.5">الهوية</th>
                    <th className="p-2.5">حالة العاملة</th>
                    <th className="p-2.5">المعاملة الحالية</th>
                    <th className="p-2.5">المطلوب الآن</th>
                    <th className="p-2.5">أيام السكن</th>
                    <th className="p-2.5">مسؤول الإجراء</th>
                    <th className="p-2.5">بانتظار</th>
                    <th className="p-2.5">مهلة الإجراء (الرياض)</th>
                    <th className="p-2.5">نوع الحالة</th>
                    <th className="p-2.5">التصعيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {filteredBoardRows.map((row) => {
                    const isSelected = row.workerId === selectedWorker.id;
                    return (
                      <tr
                        key={row.workerId}
                        onClick={() => setSelectedWorkerId(row.workerId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#f3f3f3] font-semibold' : 'hover:bg-[#fafafa]'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-[#141414] whitespace-nowrap">{row.fullNameAr}</td>
                        <td className="p-2.5 font-mono text-[11px] text-[#707070] whitespace-nowrap">{row.workerCode}</td>
                        <td className="p-2.5 whitespace-nowrap">{row.nationality}</td>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{row.passportNumber}</td>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{row.iqamaNumber}</td>
                        <td className="p-2.5 whitespace-nowrap">{row.employerName}</td>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">{row.employerId}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold">
                            {row.workerStatusAr}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                            {row.stateLabelAr}
                          </span>
                        </td>
                        <td className="p-2.5 max-w-[220px] truncate" title={row.requiredNowAr}>
                          {row.requiredNowAr}
                        </td>
                        <td className="p-2.5 font-mono font-bold whitespace-nowrap">{row.daysInHousing} يوم</td>
                        <td className="p-2.5 whitespace-nowrap">{row.responsibleEmployee}</td>
                        <td className="p-2.5 whitespace-nowrap">{row.waitingOnAr}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.slaOverdue
                                ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                                : 'bg-[#f3f3f3] text-[#141414]'
                            }`}
                          >
                            {row.slaDisplayAr}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">{row.caseTypeAr}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.escalationAr.includes('عاجل')
                                ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                                : row.escalationAr.includes('عالية')
                                ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                                : 'bg-[#f3f3f3] text-[#707070]'
                            }`}
                          >
                            {row.escalationAr}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deterministic Scenario Outlook Cards (getHousingOutlook) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#141414] m-0">
                توقعات السيناريوهات والبدائل الحتمية للحالة ({diagnostic.outlook.length} سيناريوهات نشطة)
              </h4>
              <span className="text-[11px] text-[#707070]">مرتبة تلقائياً حسب الأولوية: حرج ← عالي ← اعتيادي</span>
            </div>

            {diagnostic.outlook.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#f3f3f3] text-xs text-[#707070]">
                لا توجد سيناريوهات حرجة مفتوحة حالياً لهذه العاملة؛ الملف في المسار الاعتيادي.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {diagnostic.outlook.map((sc) => (
                  <div
                    key={sc.code}
                    className="p-4 rounded-2xl border border-[#e0e0e0] bg-white space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#141414]">{sc.arTitle}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sc.priority === 'critical'
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : sc.priority === 'high'
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                        }`}
                      >
                        {sc.priority === 'critical' ? 'أولوية حرجة' : sc.priority === 'high' ? 'أولوية عالية' : 'اعتيادي'}
                      </span>
                    </div>
                    <div className="text-xs text-[#141414] bg-[#f3f3f3] p-2.5 rounded-xl">
                      <strong>المطلوب الآن:</strong> {sc.arNow}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]">
                        <strong>المسار (أ):</strong> {sc.arIfYes}
                      </div>
                      <div className="p-2 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]">
                        <strong>المسار البديل (ب):</strong> {sc.arIfNo}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#707070] pt-1 border-t border-[#f0f0f0]">
                      <strong>ما يُوثق بالنظام:</strong> {sc.arSystemRecord}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 1.5: CANONICAL 28 WORKFLOW STAGES & 9 ROUTES MATRIX
         ===================================================================== */}
      {activeSubMode === 'stages_matrix' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-[#141414] m-0">
                دليل مراحل الإيواء والسكن النظامية (28 مرحلة و9 مسارات — مطابقة لـ workflow_states في ewaa)
              </h4>
              <p className="text-xs text-[#707070] m-0 mt-1">
                تنتقل العاملة تلقائياً بين هذه المراحل بناءً على الوقائع والأدلة الموثقة (determine_worker_journey_state).
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-mono font-bold">
              {EWAA_WORKFLOW_ROUTES.length} مسارات • {EWAA_WORKFLOW_STATES.length} مرحلة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {EWAA_WORKFLOW_ROUTES.map((route) => {
              const routeStates = EWAA_WORKFLOW_STATES.filter((s) => s.route_key === route.key);
              return (
                <div
                  key={route.key}
                  className="p-4 rounded-2xl border border-[#e0e0e0] bg-white space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-2">
                    <div>
                      <div className="text-xs font-bold text-[#141414]">{route.label_ar}</div>
                      <div className="text-[10px] font-mono text-[#707070]">route_key: {route.key}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">
                      {routeStates.length} مراحل
                    </span>
                  </div>

                  <div className="space-y-2">
                    {routeStates.map((st) => (
                      <div
                        key={st.state_key}
                        className="p-2.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[#141414]">{st.label_ar}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#e0e0e0]">
                            {st.sla_hours ? `SLA ${st.sla_hours}h` : st.is_terminal ? 'نهائية' : 'مفتوح'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#707070]">
                          {st.state_key} • بانتظار: {st.waiting_on_default || 'المكتب'}
                        </div>
                        <div className="text-[11px] text-[#707070] leading-snug">{st.description_ar}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2: FACT-DRIVEN INTAKE & BELONGINGS / DIRECT AIRPORT HANDOVER
         ===================================================================== */}
      {activeSubMode === 'fact_intake' && (
        <form onSubmit={handleFactIntakeSubmit} className="space-y-5">
          <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
            <div className="text-xs font-bold text-[#141414]">
              1. البيانات الأساسية ومصدر الاستلام الفعلي (بدون فرض مسار قانوني يدوي)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">اسم العاملة *</label>
                <input
                  type="text"
                  required
                  aria-label="اسم العاملة"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="الاسم الكامل..."
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">رقم الجواز *</label>
                <input
                  type="text"
                  required
                  aria-label="رقم الجواز"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value)}
                  placeholder="مثال: PH928172..."
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الجنسية</label>
                <select
                  aria-label="الجنسية"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs text-[#141414]"
                >
                  <option value="الفلبين">الفلبين</option>
                  <option value="إندونيسيا">إندونيسيا</option>
                  <option value="إثيوبيا">إثيوبيا</option>
                  <option value="أوغندا">أوغندا</option>
                  <option value="كينيا">كينيا</option>
                  <option value="سريلانكا">سريلانكا</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">جهة الاستلام (Source)</label>
                <select
                  aria-label="جهة الاستلام"
                  value={obsForm.source}
                  onChange={(e) => setObsForm({ ...obsForm, source: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs text-[#141414]"
                >
                  <option value="employer">صاحب العمل (الكفيل)</option>
                  <option value="airport">المطار (وصول جديد / مرتجع مطار)</option>
                  <option value="police">الشرطة / الجهات الأمنية</option>
                  <option value="embassy">السفارة</option>
                  <option value="slslc">مركز سلسلك / الحماية</option>
                  <option value="other">جهة أخرى</option>
                </select>
              </div>
            </div>

            {/* Direct Airport Handover Toggle */}
            {obsForm.source === 'airport' && (
              <div className="p-3.5 rounded-xl bg-white border border-[#e0e0e0] space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-[#141414] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(obsForm.direct_airport_handover)}
                    onChange={(e) =>
                      setObsForm({ ...obsForm, direct_airport_handover: e.target.checked })
                    }
                  />
                  <span>
                    تسليم مباشر من المطار لصاحب العمل (توثيق الاستلام والتسليم دون إنشاء إقامة وهمية بالسكن)
                  </span>
                </label>
                {obsForm.direct_airport_handover && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      aria-label="اسم المستلم رباعياً"
                      placeholder="اسم المستلم رباعياً *"
                      value={obsForm.handover_recipient_name || ''}
                      onChange={(e) =>
                        setObsForm({ ...obsForm, handover_recipient_name: e.target.value })
                      }
                      className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      aria-label="رقم هوية المستلم"
                      placeholder="رقم هوية المستلم *"
                      value={obsForm.handover_recipient_id || ''}
                      onChange={(e) =>
                        setObsForm({ ...obsForm, handover_recipient_id: e.target.value })
                      }
                      className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                    />
                    <input
                      type="text"
                      aria-label="رقم محضر التسليم بالمطار"
                      placeholder="رقم محضر التسليم بالمطار"
                      value={obsForm.handover_receipt_ref || ''}
                      onChange={(e) =>
                        setObsForm({ ...obsForm, handover_receipt_ref: e.target.value })
                      }
                      className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Intents & Observed Facts (Unknown != No) */}
          <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
            <div className="text-xs font-bold text-[#141414]">
              2. الرغبات والوقائع المرصودة (الإجابات غير المؤكدة تسجل "غير معروف" وتفتح مهمة تحقق)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">رغبة العاملة المصرّح بها</label>
                <select
                  aria-label="رغبة العاملة المصرح بها"
                  value={obsForm.worker_intent}
                  onChange={(e) => setObsForm({ ...obsForm, worker_intent: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="undecided">غير محسومة بعد (تفتح مهمة تحقق)</option>
                  <option value="transfer">ترغب بنقل الخدمات لكفيل جديد</option>
                  <option value="final_exit">ترغب بالخروج النهائي والسفر</option>
                  <option value="return_employer">ترغب بالعودة لصاحب العمل</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">رغبة صاحب العمل</label>
                <select
                  aria-label="رغبة صاحب العمل"
                  value={obsForm.employer_intent}
                  onChange={(e) => setObsForm({ ...obsForm, employer_intent: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="undecided">غير معروف / لم يُحسم بعد</option>
                  <option value="transfer">تنازل ونقل خدمات</option>
                  <option value="final_exit">تأشيرة خروج نهائي</option>
                  <option value="return_worker">استرجاع العاملة</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">توفر أصل الجواز</label>
                <select
                  aria-label="توفر أصل الجواز"
                  value={obsForm.passport_available}
                  onChange={(e) => setObsForm({ ...obsForm, passport_available: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="unknown">غير معروف بعد</option>
                  <option value="yes">نعم — متوفر</option>
                  <option value="no">لا — مفقود أو محتجز</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">بلاغ التغيب (الهروب)</label>
                <select
                  aria-label="بلاغ التغيب"
                  value={obsForm.absconding_status}
                  onChange={(e) => setObsForm({ ...obsForm, absconding_status: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="unknown">غير معروف (يفحص في أبشر/مساند)</option>
                  <option value="none">لا يوجد بلاغ تغيب</option>
                  <option value="active">يوجد بلاغ تغيب نشط (يمنع النقل العادي)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">رواتب متأخرة غير مستلمة؟</label>
                <select
                  aria-label="رواتب متأخرة غير مستلمة"
                  value={obsForm.unpaid_wages}
                  onChange={(e) => setObsForm({ ...obsForm, unpaid_wages: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="unknown">غير معروف بعد</option>
                  <option value="no">لا توجد رواتب متأخرة</option>
                  <option value="yes">نعم — توجد مطالبة أجور</option>
                </select>
              </div>
              {obsForm.unpaid_wages === 'yes' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">إجمالي الرواتب المطالب بها (⃁)</label>
                  <input
                    type="number"
                    aria-label="إجمالي الرواتب المطالب بها"
                    value={String(obsForm.salary_amount || '')}
                    onChange={(e) => setObsForm({ ...obsForm, salary_amount: e.target.value })}
                    placeholder="مثال: 4500"
                    className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">إفادة رفض العمل</label>
                <select
                  aria-label="إفادة رفض العمل"
                  value={obsForm.reported_refusal}
                  onChange={(e) => setObsForm({ ...obsForm, reported_refusal: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="unknown">غير معروف</option>
                  <option value="no">لا يوجد رفض عمل</option>
                  <option value="yes">نعم — يوجد رفض عمل (يتطلب إقرار)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">مخاوف حماية وسلامة عاجلة؟</label>
                <select
                  aria-label="مخاوف حماية وسلامة عاجلة"
                  value={obsForm.safety_concern}
                  onChange={(e) => setObsForm({ ...obsForm, safety_concern: e.target.value })}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="no">لا</option>
                  <option value="yes">نعم — فتح مسار حماية فوري وعزل عن الكفيل</option>
                </select>
              </div>
            </div>

            {obsForm.reported_refusal === 'yes' && (
              <div className="p-3 rounded-xl bg-white border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(obsForm.refusal_document_available)}
                    onChange={(e) =>
                      setObsForm({ ...obsForm, refusal_document_available: e.target.checked })
                    }
                  />
                  <span>تم توقيع وإرفاق إقرار رفض العمل الرسمي</span>
                </label>
                {!obsForm.refusal_document_available && (
                  <input
                    type="text"
                    aria-label="سبب استثناء المشرف"
                    placeholder="أو اكتب سبب استثناء المشرف (8 أحرف على الأقل)..."
                    value={obsForm.refusal_exemption_reason || ''}
                    onChange={(e) =>
                      setObsForm({ ...obsForm, refusal_exemption_reason: e.target.value })
                    }
                    className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                  />
                )}
              </div>
            )}
          </div>

          {/* 3. Belongings Custody Matrix */}
          <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
            <div className="text-xs font-bold text-[#141414]">
              3. جرد المقتنيات والأمانات الـ 6 عند الاستلام (مع فحص التعارض التلقائي مع الجواز والنقدية)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {belongings.map((item, idx) => {
                const kindMeta = EWAA_BELONGING_KINDS.find((k) => k.key === item.item_key);
                return (
                  <div key={item.item_key} className="p-3 rounded-xl bg-white border border-[#e0e0e0] space-y-2">
                    <div className="text-xs font-bold text-[#141414]">{kindMeta?.ar}</div>
                    <select
                      aria-label={`عهدة ${kindMeta?.ar || item.item_key}`}
                      value={item.custody}
                      onChange={(e) => {
                        const nextCustody = e.target.value;
                        const copy = [...belongings];
                        copy[idx] = {
                          ...copy[idx],
                          custody: nextCustody,
                          amount:
                            item.item_key === 'cash' && nextCustody === 'with_worker'
                              ? copy[idx].amount
                              : null,
                        };
                        setBelongings(copy);
                      }}
                      className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2.5 py-1.5 text-xs"
                    >
                      {EWAA_BELONGING_CUSTODY.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.ar}
                        </option>
                      ))}
                    </select>
                    {item.item_key === 'cash' && item.custody === 'with_worker' && (
                        <input
                          type="number"
                          aria-label="المبلغ النقدي الإلزامي"
                          placeholder="المبلغ النقدي الإلزامي (⃁) *"
                          value={item.amount ?? ''}
                          onChange={(e) => {
                            const copy = [...belongings];
                            copy[idx] = {
                              ...copy[idx],
                              amount: e.target.value ? Number(e.target.value) : null,
                            };
                            setBelongings(copy);
                          }}
                          className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                        />
                      )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Live Engine Output Preview */}
          <div className="p-4 rounded-2xl border border-[#e0e0e0] bg-white space-y-2">
            <div className="text-xs font-bold text-[#141414]">
              معاينة فورية لقرار محرك (Ewaa) المشتق من الوقائع:
            </div>
            {!liveObservationPreview.ok ? (
              <div className="p-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold">
                حارس الوقائع (منع الإدخال المتعارض): {liveObservationPreview.error}
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-bold">
                    المرحلة المشتقة: {liveObservationPreview.result.journey_stage}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold">
                    المسار النظامي: {liveObservationPreview.result.legal_path}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold">
                    إقامة فعلية بالسكن: {liveObservationPreview.result.creates_housing_stay ? 'نعم' : 'لا (بدون إقامة وهمية)'}
                  </span>
                </div>
                <div className="text-[#141414]">
                  <strong>الإجراءات المتوازية المشتقة:</strong>{' '}
                  {liveObservationPreview.result.parallel_actions.join(' • ')}
                </div>
                {liveObservationPreview.result.missing_verifications.length > 0 && (
                  <div className="text-[#141414] font-semibold">
                    <strong>مهام التحقق المفتوحة تلقائياً (غير معروف ≠ لا):</strong>{' '}
                    {liveObservationPreview.result.missing_verifications.join(' ، ')}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!liveObservationPreview.ok}
                className="px-5 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                اعتماد الاستلام وتطبيق المسار المشتق
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          MODE 3: WAGE CLAIMS LEDGER & DEPARTURE EVIDENCE GATE
         ===================================================================== */}
      {activeSubMode === 'claims_and_departure' && selectedWorker && diagnostic && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Wage Claims: Reported vs Verified Payments */}
          <form
            onSubmit={handleRecordWagePayment}
            className="p-4 sm:p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                <span>دفتر مطالبات الأجور ({selectedWorker.fullNameAr})</span>
              </h4>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#e0e0e0]">
                {diagnostic.wageReconciliation.canCloseClaim ? 'قابلة للإغلاق' : 'مفتوحة — بانتظار دليل سداد'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e0e0e0] text-xs space-y-1">
              <div>
                <strong>ملخص المطالبة:</strong> {diagnostic.wageReconciliation.statusSummaryAr}
              </div>
              <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-[#707070]">
                <span>إجمالي المطالبة: ⃁ {diagnostic.wageReconciliation.totalClaimed.toLocaleString()}</span>
                <span className="text-[#141414] font-bold">
                  مسدد موثق بدليل: ⃁ {diagnostic.wageReconciliation.verifiedPaid.toLocaleString()}
                </span>
                <span className="text-[#141414] font-bold">
                  مسجل حسب الإفادة فقط: ⃁ {diagnostic.wageReconciliation.reportedUnverifiedPaid.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">إجمالي المطالبة (إن لم يسجل سابقاً)</label>
                <input
                  type="number"
                  aria-label="إجمالي المطالبة"
                  value={claimTotalInput}
                  onChange={(e) => setClaimTotalInput(e.target.value)}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">مبلغ الدفعة الجديدة (⃁) *</label>
                <input
                  type="number"
                  required
                  aria-label="مبلغ الدفعة الجديدة"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="مثال: 1500"
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">نوع التوثيق (قاعدة Ewaa)</label>
                <select
                  aria-label="نوع التوثيق"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                >
                  <option value="verified_with_evidence">دفعة موثقة بدليل (تخصم من الرصيد)</option>
                  <option value="reported_unverified">إفادة شفهية بدون إيصال (لا تغلق المطالبة)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  رقم مرجع الحوالة / الإيصال {paymentStatus === 'verified_with_evidence' ? '*' : '(اختياري)'}
                </label>
                <input
                  type="text"
                  aria-label="رقم مرجع الحوالة أو الإيصال"
                  value={paymentEvidenceRef}
                  onChange={(e) => setPaymentEvidenceRef(e.target.value)}
                  placeholder="مثال: STCPAY-882716..."
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold cursor-pointer"
            >
              تسجيل الدفعة وتحديث رصيد المطالبة
            </button>
          </form>

          {/* Evidence-Gated Final Departure */}
          <form
            onSubmit={handleVerifyDeparture}
            className="p-4 sm:p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-1.5">
                <PlaneTakeoff className="w-4 h-4" />
                <span>بوابة إثبات المغادرة النهائية ({selectedWorker.fullNameAr})</span>
              </h4>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#e0e0e0]">
                {selectedWorker.departureEvidenceRef ? 'غادرت بدليل موثق' : 'لم توثق المغادرة بعد'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e0e0e0] text-xs text-[#707070] leading-relaxed">
              تمنع معمارية (Ewaa) إغلاق ملف العاملة كمغادرة نهائية لمجرد توجهها للمطار أو مضي تاريخ الرحلة؛ يلزم إدخال مرجع صعود الطائرة أو ختم المغادرة الفعلي.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  رقم مرجع صعود الطائرة / ختم المغادرة *
                </label>
                <input
                  type="text"
                  required
                  aria-label="رقم مرجع صعود الطائرة أو ختم المغادرة"
                  value={departureEvidenceRef}
                  onChange={(e) => setDepartureEvidenceRef(e.target.value)}
                  placeholder="مثال: BOARDING-SV890-OK"
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الموظف المتحقق من الإقلاع *</label>
                <input
                  type="text"
                  required
                  aria-label="الموظف المتحقق من الإقلاع"
                  value={departureVerifier}
                  onChange={(e) => setDepartureVerifier(e.target.value)}
                  className="w-full bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold cursor-pointer"
            >
              توثيق دليل المغادرة وإغلاق عهدة السكن نهائياً
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default EwaaOperationsCenterPanel;
