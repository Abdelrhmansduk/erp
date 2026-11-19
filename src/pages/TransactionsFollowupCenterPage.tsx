import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Globe2,
  Search,
  Key,
  Mail,
  MessageCircle,
  Plane,
  ShieldCheck,
  GitPullRequest,
  Plus,
  X,
  RefreshCw,
  Award,
  UserCheck,
  Lock,
  Unlock,
  Copy,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { SAUDI_RIYAL_SYMBOL } from '../utils/saudiRiyal';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import {
  FOLLOWUP_COORDINATORS,
  TRANSACTION_STAGES,
  SUBSIDIARY_DISPLAY_NAMES,
  getStageLabelAr,
  getUnifiedAgenciesSync,
  getExternalAgencyAccountsSync,
  getMusanedTransactions,
  updateMusanedTransactionStage,
  evaluateTransactionSla,
  importMusanedFollowupWorkbook,
  exportMusanedFollowupWorkbook,
  confirmAliasMergeToAgency,
  assignAgencyCoordinator,
  provisionExternalAgencyAccount,
  toggleExternalAgencyAccountStatus,
  resetExternalAgencyPassword,
  dispatchViaEmailAndWhatsApp,
  type UnifiedExternalAgency,
  type ExternalAgencyAccount,
  type MusanedFollowupTransaction,
  type TransactionStage,
  type FollowupCoordinatorEmail,
  type WorkbookImportHygieneReport,
  type RecruitmentSubsidiaryCode,
} from '../services/externalAgencyMasterService';
import { realErpDataStore } from '../services/realErpDataStore';

type CenterSubView = 'today_sla' | 'pipeline' | 'agent_master' | 'forecast_scorecard' | 'archive';

export const TransactionsFollowupCenterPage: React.FC = () => {
  const { user } = useAuthContext();
  const { addNotification } = useAppStore();

  const [subView, setSubView] = useState<CenterSubView>('today_sla');
  const [transactions, setTransactions] = useState<MusanedFollowupTransaction[]>([]);
  const [agencies, setAgencies] = useState<UnifiedExternalAgency[]>(() => getUnifiedAgenciesSync());
  const [agencyAccounts, setAgencyAccounts] = useState<ExternalAgencyAccount[]>(() =>
    getExternalAgencyAccountsSync()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState<'ALL' | FollowupCoordinatorEmail>(() => {
    const email = user?.email?.toLowerCase();
    if (email === 'i.mahmoud.followup@kas.sa' || email === 'm.fouda.followup@kas.sa') {
      return email;
    }
    return 'ALL';
  });
  const [companyFilter, setCompanyFilter] = useState<'ALL' | RecruitmentSubsidiaryCode>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | TransactionStage>('ALL');
  const [creatorFilter, setCreatorFilter] = useState<string>('ALL');

  // Modals
  const [hygieneReport, setHygieneReport] = useState<WorkbookImportHygieneReport | null>(null);
  const [importingSheet, setImportingSheet] = useState(false);
  const [stageTransitionTarget, setStageTransitionTarget] = useState<{
    tx: MusanedFollowupTransaction;
    nextStage: TransactionStage;
  } | null>(null);
  const [flightForm, setFlightForm] = useState({
    maidName: '',
    passportNumber: '',
    flightNumber: '',
    airline: 'الخطوط الإثيوبية',
    arrivalDate: new Date().toISOString().slice(0, 10),
    arrivalDestination: 'الرياض',
    replacementContractNo: '',
    notes: '',
  });

  const [credentialsModal, setCredentialsModal] = useState<{
    agency: UnifiedExternalAgency;
    account: ExternalAgencyAccount;
    plainPassword?: string;
  } | null>(null);

  const [newAliasInputs, setNewAliasInputs] = useState<Record<string, string>>({});
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [newContractForm, setNewContractForm] = useState({
    musanedContractNo: '',
    companyId: 'SAF' as RecruitmentSubsidiaryCode,
    clientName: '',
    clientPhone: '',
    visaNumber: '',
    visaExpiryDate: '2027-02-15',
    nationality: 'أثيوبيا',
    workerType: 'غير معين' as 'غير معين' | 'معين' | 'معروفة',
    agencyId: 'AGY-ETH-MZAIN',
    salesCreatorName: 'حذيفه رمضان علي الديب',
    monthlySalary: '1000',
    paidAmountSar: '7130',
  });

  const refreshAll = useCallback(async () => {
    const txs = await getMusanedTransactions();
    setTransactions(txs);
    setAgencies(getUnifiedAgenciesSync());
    setAgencyAccounts(getExternalAgencyAccountsSync());
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const activeTransactions = useMemo(
    () => transactions.filter((t) => !t.is_archive),
    [transactions]
  );

  const archiveTransactions = useMemo(
    () => transactions.filter((t) => t.is_archive),
    [transactions]
  );

  const uniqueCreators = useMemo(() => {
    const s = new Set<string>();
    activeTransactions.forEach((t) => {
      if (t.sales_creator_name) s.add(t.sales_creator_name);
    });
    return Array.from(s);
  }, [activeTransactions]);

  // Evaluate SLA across active transactions
  const evaluatedActive = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return activeTransactions.map((tx) => ({
      tx,
      sla: evaluateTransactionSla(tx, todayIso, agencies),
    }));
  }, [activeTransactions, agencies]);

  const urgentTasks = useMemo(
    () => evaluatedActive.filter((item) => item.sla.alertsAr.length > 0),
    [evaluatedActive]
  );

  const islamWorkloadCount = useMemo(
    () =>
      activeTransactions.filter(
        (t) => t.assigned_coordinator_email === 'i.mahmoud.followup@kas.sa'
      ).length,
    [activeTransactions]
  );

  const mahmoudWorkloadCount = useMemo(
    () =>
      activeTransactions.filter(
        (t) => t.assigned_coordinator_email === 'm.fouda.followup@kas.sa'
      ).length,
    [activeTransactions]
  );

  const filteredPipeline = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return evaluatedActive.filter(({ tx }) => {
      if (coordinatorFilter !== 'ALL' && tx.assigned_coordinator_email !== coordinatorFilter) {
        return false;
      }
      if (companyFilter !== 'ALL' && tx.company_id !== companyFilter) return false;
      if (agencyFilter !== 'ALL' && tx.agency_id !== agencyFilter) return false;
      if (stageFilter !== 'ALL' && tx.stage !== stageFilter) return false;
      if (creatorFilter !== 'ALL' && tx.sales_creator_name !== creatorFilter) return false;

      if (q) {
        return (
          tx.musaned_contract_no.toLowerCase().includes(q) ||
          tx.client_name.toLowerCase().includes(q) ||
          tx.maid_name.toLowerCase().includes(q) ||
          tx.passport_number.toLowerCase().includes(q) ||
          tx.visa_number.toLowerCase().includes(q) ||
          tx.agency_canonical_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    evaluatedActive,
    coordinatorFilter,
    companyFilter,
    agencyFilter,
    stageFilter,
    creatorFilter,
    searchQuery,
  ]);

  const handleImportSheetFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportingSheet(true);
    try {
      const report = await importMusanedFollowupWorkbook(files[0], { includeArchiveSheets: true });
      setHygieneReport(report);
      await refreshAll();
      addNotification({
        title: 'اكتمل الاستيراد الذكي وتنقية البيانات (Upsert)',
        message: `تم فحص ${report.totalRowsScanned.toLocaleString()} سجل عبر (${report.sheetsProcessed.length}) أوراق وتوحيد ${report.correctedAgentAliases} اسم وكيل وتحويل ${report.convertedExcelSerialDates} تاريخ تسلسلي.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر قراءة ملف الشيت',
        message: err?.message || 'تأكد من اختيار ملف Excel (.xlsx) صالح.',
        type: 'error',
      });
    } finally {
      setImportingSheet(false);
    }
  };

  const handleSelectNextStage = (tx: MusanedFollowupTransaction, nextStage: TransactionStage) => {
    if (nextStage === tx.stage) return;
    if (
      nextStage === 'TICKET_BOOKED' ||
      nextStage === 'ASSIGNED' ||
      nextStage === 'REPLACED' ||
      nextStage === 'ARRIVED'
    ) {
      setFlightForm({
        maidName: tx.maid_name || '',
        passportNumber: tx.passport_number || '',
        flightNumber: tx.flight_number || 'ET-462',
        airline: tx.nationality.includes('فلبين') ? 'الخطوط الفلبينية' : 'الخطوط الإثيوبية',
        arrivalDate: tx.expected_arrival_date || new Date().toISOString().slice(0, 10),
        arrivalDestination: tx.arrival_destination || 'الرياض',
        replacementContractNo: tx.replacement_for_contract_no || '',
        notes: tx.notes || '',
      });
      setStageTransitionTarget({ tx, nextStage });
      return;
    }

    void executeStageTransition(tx, nextStage);
  };

  const executeStageTransition = async (
    tx: MusanedFollowupTransaction,
    nextStage: TransactionStage,
    extra?: typeof flightForm
  ) => {
    const actor = user?.full_name || 'قسم المتابعة الخارجية';
    await updateMusanedTransactionStage({
      transactionId: tx.id,
      nextStage,
      actorName: actor,
      maidName: extra?.maidName || tx.maid_name,
      passportNumber: extra?.passportNumber || tx.passport_number,
      flightNumber: extra?.flightNumber,
      airline: extra?.airline,
      arrivalDate: extra?.arrivalDate,
      arrivalDestination: extra?.arrivalDestination,
      replacementForContractNo: extra?.replacementContractNo,
      notes: extra?.notes,
    });

    await refreshAll();
    setStageTransitionTarget(null);
    addNotification({
      title: `تم تحديث مرحلة العقد #${tx.musaned_contract_no}`,
      message: `انتقلت المعاملة إلى (${getStageLabelAr(nextStage)}) مع تسجيل التاريخ تلقائياً وإشعار الأقسام المرتبطة.`,
      type: 'success',
    });
  };

  const handleDispatchAlertForTransaction = async (
    tx: MusanedFollowupTransaction,
    targetAudience: 'agency' | 'sales_and_client',
    channel: 'whatsapp' | 'email' | 'both'
  ) => {
    const agency = agencies.find((a) => a.id === tx.agency_id);
    if (targetAudience === 'agency') {
      const subject = `متابعة عقد مساند #${tx.musaned_contract_no} — ${SUBSIDIARY_DISPLAY_NAMES[tx.company_id]}`;
      const bodyText =
        tx.stage === 'UNASSIGNED'
          ? `يرجى من وكالة (${tx.agency_canonical_name}) سرعة تعيين عاملة ورفع السيرة الذاتية على عقد مساند رقم #${tx.musaned_contract_no} (الجنسية: ${tx.nationality} — المهنة: ${tx.profession} — الراتب: ${tx.monthly_salary} ريال) عبر بوابة الوكلاء المعتمدة.`
          : `تنبيه متابعة للعقد #${tx.musaned_contract_no} — العاملة (${tx.maid_name || 'غير معيّن'}) جواز (${tx.passport_number || '—'}): يرجى استكمال تحديث المرحلة الحالية (${getStageLabelAr(tx.stage)}) عبر البوابة.`;

      await dispatchViaEmailAndWhatsApp({
        recipientName: tx.agency_canonical_name,
        recipientPhone: agency?.whatsapp || agency?.phone,
        recipientEmail: agency?.email,
        subject,
        bodyText,
        channel,
        templateName: 'تنبيه SLA للوكيل الخارجي',
        companyId: tx.company_id,
        openExternalClient: channel !== 'both',
      });

      addNotification({
        title: 'تم إرسال التنبيه للوكيل الخارجي',
        message: `تم إرسال وتوثيق التنبيه لوكالة (${tx.agency_canonical_name}) عبر (${
          channel === 'both' ? 'البريد الإلكتروني والواتساب' : channel === 'whatsapp' ? 'الواتساب' : 'البريد الإلكتروني'
        }).`,
        type: 'success',
      });
    } else {
      const subject = `تحديث حالة عقد الاستقدام #${tx.musaned_contract_no} — ${getStageLabelAr(tx.stage)}`;
      const bodyText = `عميلنا الكريم (${tx.client_name}) / منشئ العقد (${tx.sales_creator_name || 'المبيعات'}):\nنفيدكم بتحديث حالة عقد مساند #${tx.musaned_contract_no} لدى (${SUBSIDIARY_DISPLAY_NAMES[tx.company_id]}) إلى مرحلة: [${getStageLabelAr(tx.stage)}]${
        tx.maid_name ? ` — العاملة: ${tx.maid_name}` : ''
      }${tx.expected_arrival_date ? ` — الوصول المتوقع: ${tx.expected_arrival_date}` : ''}.`;

      await dispatchViaEmailAndWhatsApp({
        recipientName: tx.client_name || tx.sales_creator_name || 'العميل',
        recipientPhone: tx.client_phone,
        recipientEmail: 'sales@kas.sa',
        subject,
        bodyText,
        channel,
        templateName: 'إشعار تحديث مرحلة عقد مساند',
        companyId: tx.company_id,
        openExternalClient: channel !== 'both',
      });

      addNotification({
        title: 'تم إشعار المبيعات والعميل',
        message: `تم إرسال تحديث العقد #${tx.musaned_contract_no} عبر (${
          channel === 'both' ? 'البريد والواتساب' : channel === 'whatsapp' ? 'الواتساب' : 'البريد'
        }).`,
        type: 'success',
      });
    }
  };

  const handleProvisionOrShowAccount = async (agency: UnifiedExternalAgency) => {
    const existing = agencyAccounts.find((a) => a.agency_id === agency.id);
    if (existing) {
      setCredentialsModal({ agency, account: existing });
      return;
    }

    const res = await provisionExternalAgencyAccount({
      agencyId: agency.id,
      createdBy: user?.full_name || 'إسلام أحمد عرفة',
    });
    setAgencyAccounts(getExternalAgencyAccountsSync());
    setCredentialsModal({
      agency,
      account: res.account,
      plainPassword: res.generatedPassword,
    });
    addNotification({
      title: 'تم إنشاء حساب بوابة الوكيل المعزول',
      message: `تم تفعيل حساب الدخول لوكالة (${agency.name_ar}) بعزل كامل على سجلاتها فقط.`,
      type: 'success',
    });
  };

  const handleResetAgencyPasswordClick = async (agency: UnifiedExternalAgency, account: ExternalAgencyAccount) => {
    const res = await resetExternalAgencyPassword(account.id);
    if (!res) return;
    setAgencyAccounts(getExternalAgencyAccountsSync());
    setCredentialsModal({
      agency,
      account: res.account,
      plainPassword: res.newPassword,
    });
    addNotification({
      title: 'تم توليد كلمة مرور مشفرة جديدة',
      message: `تم تحديث كلمة المرور لحساب (${agency.name_ar}) ويمكن إرسالها الآن عبر البريد والواتساب.`,
      type: 'success',
    });
  };

  const handleSendCredentialsViaChannels = async (
    agency: UnifiedExternalAgency,
    account: ExternalAgencyAccount,
    plainPassword: string | undefined,
    channel: 'whatsapp' | 'email' | 'both'
  ) => {
    const passInfo = plainPassword
      ? `كلمة المرور المعتمدة: ${plainPassword}`
      : '(استخدم كلمة المرور المرسلة سابقاً أو اطلب إعادة تعيينها)';
    const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://alsulaim.sa';

    const subject = `بيانات الدخول الرسمية لبوابة الوكلاء الخارجيين — ${agency.name_en}`;
    const bodyText = [
      `Dear Partner (${agency.name_en} / ${agency.name_ar}),`,
      `تم تفعيل حسابكم المعزول على بوابة الوكلاء الخارجيين لمجموعة شركات الاستقدام (${account.authorized_companies.join(', ')}):`,
      `• رابط البوابة: ${portalUrl}`,
      `• البريد / اسم المستخدم: ${account.email} (أو ${account.username})`,
      `• ${passInfo}`,
      `يرجى الدخول لرفع السير الذاتية (PDF / MRZ) وتحديث حالات الفحص الطبي والتأشيرات وتذاكر السفر لعقودكم.`,
    ].join('\n');

    await dispatchViaEmailAndWhatsApp({
      recipientName: `${agency.name_ar} (${account.contact_person})`,
      recipientPhone: account.whatsapp || agency.whatsapp || agency.phone,
      recipientEmail: account.email,
      subject,
      bodyText,
      channel,
      templateName: 'إرسال بيانات دخول بوابة الوكيل الخارجي',
      companyId: account.company_id,
      openExternalClient: channel !== 'both',
    });

    addNotification({
      title: 'تم إرسال بيانات الدخول للوكيل',
      message: `تم إرسال بيانات حساب (${agency.name_ar}) عبر (${
        channel === 'both' ? 'البريد الإلكتروني والواتساب معاً' : channel === 'whatsapp' ? 'الواتساب' : 'البريد الإلكتروني'
      }).`,
      type: 'success',
    });
  };

  const handleAddNewContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractForm.musanedContractNo.trim()) return;
    const matchedAg = agencies.find((a) => a.id === newContractForm.agencyId);
    const todayIso = new Date().toISOString().slice(0, 10);

    const newTx: MusanedFollowupTransaction = {
      id: `MTX-${newContractForm.companyId}-${newContractForm.musanedContractNo.trim()}`,
      company_id: newContractForm.companyId,
      musaned_contract_no: newContractForm.musanedContractNo.trim(),
      source_sheet: 'إدخال مباشر بالنظام',
      is_archive: false,
      client_name: newContractForm.clientName.trim(),
      client_national_id: '',
      client_phone: newContractForm.clientPhone.trim(),
      client_city: 'الرياض',
      visa_number: newContractForm.visaNumber.trim(),
      visa_expiry_date: newContractForm.visaExpiryDate,
      worker_type: newContractForm.workerType,
      maid_name: '',
      passport_number: '',
      nationality: newContractForm.nationality,
      profession: 'عاملة منزلية',
      monthly_salary: parseFloat(newContractForm.monthlySalary) || 1000,
      agency_id: matchedAg?.id,
      agency_raw_name: matchedAg?.name_ar || '',
      agency_canonical_name: matchedAg?.name_ar || 'غير محدد',
      assigned_coordinator_email:
        matchedAg?.assigned_coordinator_email || 'i.mahmoud.followup@kas.sa',
      sales_creator_name: newContractForm.salesCreatorName,
      branch_raw_name: SUBSIDIARY_DISPLAY_NAMES[newContractForm.companyId],
      stage: 'UNASSIGNED',
      stage_timestamps: { UNASSIGNED: todayIso },
      contract_start_date: todayIso,
      arrival_destination: 'الرياض',
      paid_amount_sar: parseFloat(newContractForm.paidAmountSar) || 7130,
      commission_usd: matchedAg?.default_commission_usd || 1050,
      updated_at: todayIso,
    };

    await realErpDataStore.addRecord('musaned_followup_transactions', newTx);
    await refreshAll();
    setShowAddContractModal(false);
    addNotification({
      title: 'تم تسجيل عقد مساند في مركز المتابعة',
      message: `تمت إضافة العقد #${newTx.musaned_contract_no} وإظهاره كمهمة تعيين لدى وكالة (${newTx.agency_canonical_name}).`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Pitch-Black Sovereign Mobbin Hero Header */}
      <div className="bg-[#141414] text-[#ffffff] rounded-[24px] p-6 sm:p-7 border border-[#262626]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration type="foreign-agencies" size="sm" />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-[#262626] text-[#ffffff] text-[11px] font-semibold">
                  مركز متابعة المعاملات والوكلاء الخارجيين • مساند
                </span>
                <span className="px-3 py-0.5 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold">
                  إسلام أحمد عرفة ({islamWorkloadCount}) • محمود فودة ({mahmoudWorkloadCount})
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#ffffff]">
                مركز متابعة المعاملات الموحد وتوحيد الوكلاء.
              </h1>
              <p className="text-xs text-[#adadad] mt-1">
                بديل شيت المتابعة اليومي (5 أوراق): مراحل منظمة بلا نص حر، عدّادات SLA، توحيد 42+ اسم وكيل، وإشعار فوري عبر البريد والواتساب.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="px-4 py-2.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors">
              <UploadCloud className="w-4 h-4" />
              <span>{importingSheet ? 'جاري استيراد وتنقية الشيت...' : 'استيراد شيت مساند (Excel 5 أوراق)'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleImportSheetFile(e.target.files)}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => exportMusanedFollowupWorkbook(transactions)}
              className="px-4 py-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير بنفس شكل الشيت الأصلي</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddContractModal(true)}
              className="px-4 py-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عقد مساند</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-[#262626]">
          <div className="bg-[#262626] rounded-[16px] p-3.5">
            <div className="text-[11px] text-[#adadad]">المعاملات الجارية النشطة</div>
            <div className="text-xl font-bold font-mono text-[#ffffff] mt-0.5">
              {activeTransactions.length}
            </div>
          </div>
          <div className="bg-[#262626] rounded-[16px] p-3.5">
            <div className="text-[11px] text-[#adadad]">عقود «غير معيّن» تنتظر الوكيل</div>
            <div className="text-xl font-bold font-mono text-[#ffffff] mt-0.5">
              {activeTransactions.filter((t) => t.stage === 'UNASSIGNED').length}
            </div>
          </div>
          <div className="bg-[#262626] rounded-[16px] p-3.5">
            <div className="text-[11px] text-[#adadad]">تنبيهات SLA وتأشيرات حرجة</div>
            <div className="text-xl font-bold font-mono text-[#ffffff] mt-0.5">
              {urgentTasks.length}
            </div>
          </div>
          <div className="bg-[#262626] rounded-[16px] p-3.5">
            <div className="text-[11px] text-[#adadad]">الوكلاء الموحدون المعتمدون</div>
            <div className="text-xl font-bold font-mono text-[#ffffff] mt-0.5">
              {agencies.length} وكيل
            </div>
          </div>
          <div className="bg-[#262626] rounded-[16px] p-3.5">
            <div className="text-[11px] text-[#adadad]">حسابات بوابة الوكلاء المفعلة</div>
            <div className="text-xl font-bold font-mono text-[#ffffff] mt-0.5">
              {agencyAccounts.filter((a) => a.status === 'نشط').length} حساب
            </div>
          </div>
        </div>
      </div>

      {/* Mobbin Segmented Sub-Navigation */}
      <div className="bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'today_sla', label: `اليوم عندي ماذا؟ (${urgentTasks.length})`, icon: AlertTriangle },
          { id: 'pipeline', label: `خط أنابيب المعاملات (${activeTransactions.length})`, icon: GitPullRequest },
          { id: 'agent_master', label: `سجل الوكلاء الموحد والحسابات (${agencies.length})`, icon: Globe2 },
          { id: 'forecast_scorecard', label: 'توقع الوصول وتقييم الوكلاء', icon: Award },
          { id: 'archive', label: `سجل الأرشيف والوصول (${archiveTransactions.length})`, icon: CheckCircle2 },
        ].map((tab) => {
          const IconComp = tab.icon;
          const active = subView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id as CenterSubView)}
              className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-[#141414] text-[#ffffff]'
                  : 'text-[#707070] hover:text-[#141414] hover:bg-[#ffffff]'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/*Coordinator Workload Quick Filter Bar*/}
      {(subView === 'today_sla' || subView === 'pipeline') && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#707070]">تقسيم العمل:</span>
            {[
              { key: 'ALL', label: `كل المعاملات (${activeTransactions.length})` },
              {
                key: 'i.mahmoud.followup@kas.sa',
                label: `معاملات إسلام أحمد عرفة (${islamWorkloadCount})`,
              },
              {
                key: 'm.fouda.followup@kas.sa',
                label: `معاملات محمود فودة (${mahmoudWorkloadCount})`,
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCoordinatorFilter(item.key as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                  coordinatorFilter === item.key
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label="تصفية حسب الشركة"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414]"
            >
              <option value="ALL">جميع الشركات (SAF/TOP/YAQ/DAR)</option>
              <option value="SAF">شركة السفير الماسي (SAF)</option>
              <option value="TOP">شركة توباز (TOP)</option>
              <option value="YAQ">شركة ياقوت نجد (YAQ)</option>
              <option value="DAR">دار الرواد (DAR)</option>
            </select>

            <select
              aria-label="تصفية حسب الوكيل الموحد"
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414]"
            >
              <option value="ALL">جميع الوكلاء الموحدين</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar} ({a.country})
                </option>
              ))}
            </select>

            <select
              aria-label="تصفية حسب المرحلة"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414]"
            >
              <option value="ALL">جميع المراحل</option>
              {TRANSACTION_STAGES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.labelAr}
                </option>
              ))}
            </select>

            <select
              aria-label="تصفية حسب موظف المبيعات المنشئ"
              value={creatorFilter}
              onChange={(e) => setCreatorFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414]"
            >
              <option value="ALL">كل موظفي المبيعات المنشئين</option>
              {uniqueCreators.map((cr) => (
                <option key={cr} value={cr}>
                  {cr}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ================= VIEW 1: TODAY SLA & URGENT RADAR ================= */}
      {subView === 'today_sla' && (
        <div className="space-y-4">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#141414]">
                  لوحة «اليوم عندي ماذا؟» — التنبيهات التلقائية وعدّادات الـ SLA
                </h2>
                <p className="text-xs text-[#707070]">
                  تحل محل الفرز اليدوي اليومي في الإكسل: العقود المتأخرة في التعيين، التأشيرات المتبقي لها أقل من 15 يوماً بلا تذكرة، وتأخر الوصول.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubView('pipeline')}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
              >
                عرض كامل خط الأنابيب
              </button>
            </div>

            {urgentTasks.length === 0 ? (
              <div className="bg-[#f3f3f3] rounded-[20px] p-8 text-center text-xs text-[#707070]">
                لا توجد معاملات متجاوزة لعدادات الـ SLA حالياً — جميع المعاملات تسير ضمن المدد الزمنية المعتمدة.
              </div>
            ) : (
              <div className="space-y-3">
                {urgentTasks
                  .filter(({ tx }) =>
                    coordinatorFilter === 'ALL'
                      ? true
                      : tx.assigned_coordinator_email === coordinatorFilter
                  )
                  .map(({ tx, sla }) => (
                    <div
                      key={tx.id}
                      className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              sla.severity === 'CRITICAL'
                                ? 'bg-[#141414] text-[#ffffff]'
                                : 'bg-[#ffffff] text-[#141414] border border-[#141414]'
                            }`}
                          >
                            {sla.severity === 'CRITICAL' ? 'أولوية قصوى (أحمر)' : 'تنبيه متابعة SLA'}
                          </span>
                          <span className="font-mono font-bold text-xs text-[#141414]">
                            عقد مساند #{tx.musaned_contract_no}
                          </span>
                          <span className="text-xs font-semibold text-[#707070]">
                            • {SUBSIDIARY_DISPLAY_NAMES[tx.company_id]} • الوكيل: {tx.agency_canonical_name}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#141414]">
                          {sla.alertsAr.join('  |  ')}
                        </div>
                        <div className="text-[11px] text-[#707070]">
                          العميل: {tx.client_name} • المنشئ (المبيعات): {tx.sales_creator_name || '—'} • العاملة:{' '}
                          {tx.maid_name || 'غير معيّن بعد'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDispatchAlertForTransaction(tx, 'agency', 'both')}
                          className="px-3.5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>استعجال الوكيل (بريد + واتس)</span>
                        </button>
                        <select
                          aria-label={`تحديث حالة العقد ${tx.musaned_contract_no}`}
                          value={tx.stage}
                          onChange={(e) =>
                            handleSelectNextStage(tx, e.target.value as TransactionStage)
                          }
                          className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                        >
                          {TRANSACTION_STAGES.map((st) => (
                            <option key={st.code} value={st.code}>
                              {st.labelAr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: STRUCTURED PIPELINE TABLE ================= */}
      {subView === 'pipeline' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="بحث برقم عقد مساند أو العميل أو العاملة أو الجواز"
                placeholder="بحث برقم عقد مساند، العميل، الجواز، التأشيرة، أو الوكيل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-full bg-[#f0f0f0] text-xs text-[#141414] focus:outline-none"
              />
            </div>
            <div className="text-xs font-bold text-[#707070]">
              المطابق للفرز: <strong className="text-[#141414]">{filteredPipeline.length}</strong> معاملة
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] font-bold">
                <tr>
                  <th className="p-3.5">عقد مساند / الشركة</th>
                  <th className="p-3.5">العميل والمنشئ</th>
                  <th className="p-3.5">العاملة والجواز</th>
                  <th className="p-3.5">الوكيل الخارجي الموحد</th>
                  <th className="p-3.5">المرحلة المنظمة (بلا نص حر)</th>
                  <th className="p-3.5">انتهاء التأشيرة / الوصول المتوقع</th>
                  <th className="p-3.5 text-center">إشعار بريد / واتساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredPipeline.map(({ tx, sla }) => (
                  <tr key={tx.id} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-[#141414]">#{tx.musaned_contract_no}</div>
                      <div className="text-[11px] text-[#707070]">
                        {tx.company_id} • تأشيرة: <span className="font-mono">{tx.visa_number || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{tx.client_name || '—'}</div>
                      <div className="text-[11px] text-[#707070]">
                        مبيعات: {tx.sales_creator_name || '—'} • {SAUDI_RIYAL_SYMBOL}{' '}
                        {tx.paid_amount_sar.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {tx.maid_name ? (
                        <>
                          <div className="font-bold text-[#141414]">{tx.maid_name}</div>
                          <div className="text-[11px] font-mono text-[#707070]">
                            {tx.passport_number || '—'} ({tx.nationality})
                          </div>
                        </>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                          غير معيّن ({tx.nationality})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{tx.agency_canonical_name}</div>
                      <div className="text-[10px] text-[#707070]">
                        المتابع:{' '}
                        {tx.assigned_coordinator_email === 'i.mahmoud.followup@kas.sa'
                          ? 'إسلام عرفة'
                          : 'محمود فودة'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <select
                        aria-label={`المرحلة المنظمة للعقد ${tx.musaned_contract_no}`}
                        value={tx.stage}
                        onChange={(e) =>
                          handleSelectNextStage(tx, e.target.value as TransactionStage)
                        }
                        className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#141414] text-xs font-bold text-[#141414]"
                      >
                        {TRANSACTION_STAGES.map((st) => (
                          <option key={st.code} value={st.code}>
                            {st.labelAr}
                          </option>
                        ))}
                      </select>
                      {tx.flight_number && (
                        <div className="text-[10px] font-mono text-[#707070] mt-1">
                          رحلة: {tx.flight_number} ({tx.arrival_destination})
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <div>تأشيرة: {tx.visa_expiry_date || '—'}</div>
                      <div className="text-[#707070]">متوقع: {tx.expected_arrival_date || '—'}</div>
                      {sla.alertsAr.length > 0 && (
                        <div className="text-[10px] font-sans font-bold text-[#141414] mt-0.5">
                          ! {sla.alertsAr[0]}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDispatchAlertForTransaction(tx, 'agency', 'both')}
                          className="px-2.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                          title="إرسال بريد إلكتروني وواتساب للوكيل الخارجي"
                        >
                          للوكيل
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDispatchAlertForTransaction(tx, 'sales_and_client', 'both')
                          }
                          className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                          title="إشعار موظف المبيعات والعميل عبر البريد والواتساب"
                        >
                          للمبيعات/العميل
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

      {/* ================= VIEW 3: UNIFIED AGENT MASTER & ACCOUNTS ================= */}
      {subView === 'agent_master' && (
        <div className="space-y-4">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#141414]">
                سجل الوكلاء الموحد (Agent Master + Aliases) وإدارة حسابات بوابة الوكلاء
              </h2>
              <p className="text-xs text-[#707070]">
                يوحّد كل التهجئات الـ 42+ في الشيت بوكيل واحد معتمد، ومنه تُنشأ وتُدار حسابات دخول الوكلاء وتُرسَل عبر البريد والواتساب.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agencies.map((ag) => {
                const acc = agencyAccounts.find((a) => a.agency_id === ag.id);
                return (
                  <div
                    key={ag.id}
                    className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar name={ag.name_en} role={ag.country} size="sm" status="verified" />
                        <div>
                          <div className="font-bold text-sm text-[#141414]">{ag.name_ar}</div>
                          <div className="text-[11px] text-[#707070] font-mono">{ag.name_en}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                        {ag.country} • تقييم {ag.quality_score}%
                      </span>
                    </div>

                    {/* Merged Aliases */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#707070]">
                        التهجئات المدمجة تلقائياً ({ag.aliases.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ag.aliases.map((al) => (
                          <span
                            key={al}
                            className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10.5px] font-medium text-[#141414]"
                          >
                            {al}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="إضافة تهجئة بديلة للشيت..."
                          value={newAliasInputs[ag.id] || ''}
                          onChange={(e) =>
                            setNewAliasInputs({ ...newAliasInputs, [ag.id]: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs text-[#141414]"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const val = newAliasInputs[ag.id];
                            if (!val?.trim()) return;
                            await confirmAliasMergeToAgency(ag.id, val);
                            setNewAliasInputs({ ...newAliasInputs, [ag.id]: '' });
                            setAgencies(getUnifiedAgenciesSync());
                            addNotification({
                              title: 'تم دمج التهجئة البديلة',
                              message: `تم ربط الاسم (${val}) بالوكيل الموحد (${ag.name_ar}) دائماً.`,
                              type: 'success',
                            });
                          }}
                          className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          دمج +
                        </button>
                      </div>
                    </div>

                    {/* Coordinator Assignment + Portal Account Controls */}
                    <div className="pt-2 border-t border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
                      <select
                        aria-label={`تعيين مسؤول المتابعة لوكالة ${ag.name_ar}`}
                        value={ag.assigned_coordinator_email}
                        onChange={async (e) => {
                          await assignAgencyCoordinator(
                            ag.id,
                            e.target.value as FollowupCoordinatorEmail
                          );
                          setAgencies(getUnifiedAgenciesSync());
                          addNotification({
                            title: 'تم تحديث تقسيم العمل',
                            message: `تم إسناد متابعة (${ag.name_ar}) بنجاح.`,
                            type: 'info',
                          });
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]"
                      >
                        {FOLLOWUP_COORDINATORS.map((c) => (
                          <option key={c.email} value={c.email}>
                            مسؤول المتابعة: {c.nameAr}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleProvisionOrShowAccount(ag)}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{acc ? 'إدارة وإرسال الحساب' : 'إنشاء حساب بوابة للوكيل'}</span>
                        </button>

                        {acc && (
                          <button
                            type="button"
                            onClick={async () => {
                              const next = acc.status === 'نشط' ? 'مجمّد' : 'نشط';
                              await toggleExternalAgencyAccountStatus(acc.id, next);
                              setAgencyAccounts(getExternalAgencyAccountsSync());
                              addNotification({
                                title: next === 'مجمّد' ? 'تم تجميد حساب الوكيل' : 'تم تنشيط حساب الوكيل',
                                message: `حالة حساب (${ag.name_ar}) الآن: ${next}.`,
                                type: 'info',
                              });
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {acc.status === 'نشط' ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>تجميد</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>تنشيط</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: EXPECTED ARRIVAL & REAL AGENCY SCORECARD ================= */}
      {subView === 'forecast_scorecard' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-5 border-b border-[#e0e0e0]">
            <h2 className="text-base font-bold text-[#141414]">
              تقييم أداء الوكلاء الفعلي وقابلية الوصول المتوقعة (محسوب من 17,000+ سجل أرشيف)
            </h2>
            <p className="text-xs text-[#707070]">
              يقيس متوسط أيام التعيين، متوسط أيام الوصول من التفويض، ونسب الـ Backout والهروب والإلغاء لكل وكالة خارجية.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-3.5">الوكالة الموحدة</th>
                  <th className="p-3.5">الدولة</th>
                  <th className="p-3.5">إجمالي العقود التاريخية</th>
                  <th className="p-3.5">الواصلات فعلياً</th>
                  <th className="p-3.5">نسبة Backout</th>
                  <th className="p-3.5">نسبة الهروب</th>
                  <th className="p-3.5">متوسط التعيين</th>
                  <th className="p-3.5">متوسط الوصول</th>
                  <th className="p-3.5">التقييم العام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {agencies.map((ag) => {
                  const total = Math.max(1, ag.historical_total_contracts);
                  const backoutPct = ((ag.historical_backout_count / total) * 100).toFixed(1);
                  const runawayPct = ((ag.historical_runaway_count / total) * 100).toFixed(1);
                  return (
                    <tr key={ag.id} className="hover:bg-[#f3f3f3]">
                      <td className="p-3.5 font-bold text-[#141414]">{ag.name_ar}</td>
                      <td className="p-3.5 text-[#707070]">{ag.country}</td>
                      <td className="p-3.5 font-mono font-bold">{ag.historical_total_contracts.toLocaleString()}</td>
                      <td className="p-3.5 font-mono text-[#141414]">{ag.historical_arrived_count.toLocaleString()}</td>
                      <td className="p-3.5 font-mono">{backoutPct}%</td>
                      <td className="p-3.5 font-mono">{runawayPct}%</td>
                      <td className="p-3.5 font-mono">{ag.avg_days_to_assign} يوم</td>
                      <td className="p-3.5 font-mono">{ag.avg_days_to_arrival} يوم</td>
                      <td className="p-3.5">
                        <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-mono font-bold text-[11px]">
                          {ag.quality_score}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: HISTORICAL ARCHIVE ================= */}
      {subView === 'archive' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-5 border-b border-[#e0e0e0]">
            <h2 className="text-base font-bold text-[#141414]">
              سجل الأرشيف التاريخي (وصول 2026، وصول 2023–2025، والإلغاءات)
            </h2>
            <p className="text-xs text-[#707070]">
              محفوظ للقراءة والتقارير ومقارنة أداء الوكلاء ومسارات الاستبدال خلال ضمان الـ 90 يوماً.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-3.5">ورقة المصدر</th>
                  <th className="p-3.5">عقد مساند</th>
                  <th className="p-3.5">العميل</th>
                  <th className="p-3.5">العاملة والجواز</th>
                  <th className="p-3.5">الوكيل الموحد</th>
                  <th className="p-3.5">الحالة النهائية</th>
                  <th className="p-3.5">تاريخ الوصول / الإغلاق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {archiveTransactions.slice(0, 100).map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-3.5 text-[#707070]">{tx.source_sheet}</td>
                    <td className="p-3.5 font-mono font-bold">#{tx.musaned_contract_no}</td>
                    <td className="p-3.5 font-bold">{tx.client_name}</td>
                    <td className="p-3.5">
                      {tx.maid_name} ({tx.passport_number || '—'})
                    </td>
                    <td className="p-3.5">{tx.agency_canonical_name}</td>
                    <td className="p-3.5 font-bold">{getStageLabelAr(tx.stage)}</td>
                    <td className="p-3.5 font-mono">{tx.arrival_date || tx.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: WORKBOOK HYGIENE REPORT ================= */}
      {hygieneReport && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setHygieneReport(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-base text-[#141414]">
                تقرير الفحص والتنقية الذكية لشيت المتابعة (Upsert Report)
              </h3>
              <button
                type="button"
                onClick={() => setHygieneReport(null)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#f3f3f3] p-3 rounded-[16px]">
                <div className="text-[#707070]">إجمالي الصفوف المفحوصة</div>
                <div className="text-lg font-bold font-mono">{hygieneReport.totalRowsScanned.toLocaleString()}</div>
              </div>
              <div className="bg-[#f3f3f3] p-3 rounded-[16px]">
                <div className="text-[#707070]">عقود جديدة مضافة</div>
                <div className="text-lg font-bold font-mono">{hygieneReport.activeInserted.toLocaleString()}</div>
              </div>
              <div className="bg-[#f3f3f3] p-3 rounded-[16px]">
                <div className="text-[#707070]">عقود محدثة بدون تكرار</div>
                <div className="text-lg font-bold font-mono">{hygieneReport.activeUpdated.toLocaleString()}</div>
              </div>
              <div className="bg-[#f3f3f3] p-3 rounded-[16px]">
                <div className="text-[#707070]">أسماء وكلاء تم توحيدها</div>
                <div className="text-lg font-bold font-mono">{hygieneReport.correctedAgentAliases.toLocaleString()}</div>
              </div>
              <div className="bg-[#f3f3f3] p-3 rounded-[16px]">
                <div className="text-[#707070]">Backout مفصولة من الاسم</div>
                <div className="text-lg font-bold font-mono">{hygieneReport.extractedBackoutsFromName}</div>
              </div>
              <div className="bg-[#f3f3f3] p-3 rounded-[16px]">
                <div className="text-[#707070]">تواريخ Excel تم تحويلها</div>
                <div className="text-lg font-bold font-mono">{hygieneReport.convertedExcelSerialDates.toLocaleString()}</div>
              </div>
            </div>

            {hygieneReport.unknownAgentSpellings.length > 0 && (
              <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[16px] p-3.5 space-y-2 text-xs">
                <div className="font-bold text-[#141414]">
                  تهجئات وكلاء مقترح دمجها بسجل الوكلاء الموحد:
                </div>
                {hygieneReport.unknownAgentSpellings.slice(0, 6).map((u) => (
                  <div key={u.rawSpelling} className="flex items-center justify-between gap-2">
                    <span>
                      <strong>{u.rawSpelling}</strong> ({u.occurrences} عقد)
                      {u.suggestedAgencyName ? ` ← مقترح: ${u.suggestedAgencyName}` : ''}
                    </span>
                    {u.suggestedAgencyId && (
                      <button
                        type="button"
                        onClick={async () => {
                          await confirmAliasMergeToAgency(u.suggestedAgencyId!, u.rawSpelling);
                          setAgencies(getUnifiedAgenciesSync());
                          addNotification({
                            title: 'تم تأكيد دمج الوكيل',
                            message: `تم ربط (${u.rawSpelling}) بـ (${u.suggestedAgencyName}).`,
                            type: 'success',
                          });
                        }}
                        className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                      >
                        تأكيد الدمج
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setHygieneReport(null)}
                className="px-6 py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                اعتماد وإغلاق التقرير
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STAGE TRANSITION DETAILS (TICKET / ASSIGN / REPLACE) ================= */}
      {stageTransitionTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setStageTransitionTarget(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                تحديث المرحلة إلى: {getStageLabelAr(stageTransitionTarget.nextStage)}
              </h3>
              <button
                type="button"
                onClick={() => setStageTransitionTarget(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void executeStageTransition(
                  stageTransitionTarget.tx,
                  stageTransitionTarget.nextStage,
                  flightForm
                );
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">اسم العاملة</label>
                  <input
                    type="text"
                    value={flightForm.maidName}
                    onChange={(e) => setFlightForm({ ...flightForm, maidName: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم الجواز</label>
                  <input
                    type="text"
                    value={flightForm.passportNumber}
                    onChange={(e) =>
                      setFlightForm({ ...flightForm, passportNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              {(stageTransitionTarget.nextStage === 'TICKET_BOOKED' ||
                stageTransitionTarget.nextStage === 'ARRIVED') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">رقم الرحلة (يرسل للمطار تلقائياً)</label>
                    <input
                      type="text"
                      required
                      value={flightForm.flightNumber}
                      onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">تاريخ الوصول</label>
                    <input
                      type="date"
                      required
                      value={flightForm.arrivalDate}
                      onChange={(e) => setFlightForm({ ...flightForm, arrivalDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    />
                  </div>
                </div>
              )}

              {stageTransitionTarget.nextStage === 'REPLACED' && (
                <div>
                  <label className="block font-bold text-[#707070] mb-1">
                    رقم العقد البديل (مسار استبدال ضمان 90 يوماً)
                  </label>
                  <input
                    type="text"
                    value={flightForm.replacementContractNo}
                    onChange={(e) =>
                      setFlightForm({ ...flightForm, replacementContractNo: e.target.value })
                    }
                    placeholder="رقم العقد السابق المستبدل..."
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStageTransitionTarget(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ وترحيل التحديث للأقسام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXTERNAL AGENCY CREDENTIALS & DISPATCH ================= */}
      {credentialsModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setCredentialsModal(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                حساب بوابة الوكيل الخارجي المعزول — {credentialsModal.agency.name_ar}
              </h3>
              <button
                type="button"
                onClick={() => setCredentialsModal(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[16px] p-4 space-y-2 text-xs">
              <div>
                <span className="text-[#707070]">اسم المستخدم: </span>
                <strong className="font-mono">{credentialsModal.account.username}</strong>
              </div>
              <div>
                <span className="text-[#707070]">البريد المعتمد للدخول: </span>
                <strong className="font-mono">{credentialsModal.account.email}</strong>
              </div>
              <div>
                <span className="text-[#707070]">كلمة المرور المشفرة: </span>
                <strong className="font-mono">
                  {credentialsModal.plainPassword || 'محفوظة بتشفير SHA-256 (اضغط توليد كلمة مرور جديدة لإظهارها)'}
                </strong>
              </div>
              <div>
                <span className="text-[#707070]">الشركات المصرح بها: </span>
                <strong>{credentialsModal.account.authorized_companies.join(' • ')}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSendCredentialsViaChannels(
                    credentialsModal.agency,
                    credentialsModal.account,
                    credentialsModal.plainPassword,
                    'both'
                  )
                }
                className="flex-1 px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>إرسال عبر البريد والواتساب معاً</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleResetAgencyPasswordClick(credentialsModal.agency, credentialsModal.account)
                }
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>توليد كلمة مرور جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `البريد: ${credentialsModal.account.email}\nاسم المستخدم: ${
                      credentialsModal.account.username
                    }\nكلمة المرور: ${credentialsModal.plainPassword || '(مشفرة)'}`
                  );
                  addNotification({
                    title: 'تم نسخ بيانات الدخول',
                    message: 'تم نسخ بيانات حساب الوكيل إلى الحافظة.',
                    type: 'success',
                  });
                }}
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD NEW MUSANED CONTRACT ================= */}
      {showAddContractModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAddContractModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-lg w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">إضافة عقد مساند جديد لخط المتابعة</h3>
              <button
                type="button"
                onClick={() => setShowAddContractModal(false)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddNewContract} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم عقد مساند *</label>
                  <input
                    type="text"
                    required
                    value={newContractForm.musanedContractNo}
                    onChange={(e) =>
                      setNewContractForm({ ...newContractForm, musanedContractNo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الشركة</label>
                  <select
                    value={newContractForm.companyId}
                    onChange={(e) =>
                      setNewContractForm({
                        ...newContractForm,
                        companyId: e.target.value as RecruitmentSubsidiaryCode,
                      })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  >
                    <option value="SAF">السفير الماسي (SAF)</option>
                    <option value="TOP">توباز للاستقدام (TOP)</option>
                    <option value="YAQ">ياقوت نجد (YAQ)</option>
                    <option value="DAR">دار الرواد (DAR)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">اسم العميل</label>
                  <input
                    type="text"
                    required
                    value={newContractForm.clientName}
                    onChange={(e) =>
                      setNewContractForm({ ...newContractForm, clientName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الوكيل الخارجي الموحد</label>
                  <select
                    value={newContractForm.agencyId}
                    onChange={(e) =>
                      setNewContractForm({ ...newContractForm, agencyId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  >
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name_ar} ({a.country})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم التأشيرة</label>
                  <input
                    type="text"
                    value={newContractForm.visaNumber}
                    onChange={(e) =>
                      setNewContractForm({ ...newContractForm, visaNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">تاريخ انتهاء التأشيرة</label>
                  <input
                    type="date"
                    value={newContractForm.visaExpiryDate}
                    onChange={(e) =>
                      setNewContractForm({ ...newContractForm, visaExpiryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ العقد وإسناده للوكيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsFollowupCenterPage;
