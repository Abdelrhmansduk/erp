import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
  Edit3,
  Trash2,
  RotateCcw,
  Paperclip,
  MessageSquare,
  Download,
  Settings,
  Send,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { sanitizeSafeHref } from '../utils/securitySanitizers';
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
  loadUnifiedAgencies,
  getExternalAgencyAccountsSync,
  loadExternalAgencyAccounts,
  getCoordinatorProfiles,
  saveCoordinatorContact,
  resolveCoordinatorForAgencyOrTx,
  upsertUnifiedAgency,
  getMusanedTransactions,
  updateMusanedTransaction,
  updateMusanedTransactionStage,
  softDeleteMusanedTransaction,
  restoreMusanedTransaction,
  permanentlyDeleteMusanedTransaction,
  reassignTransactionsCoordinator,
  bulkUpdateTransactionsStage,
  buildBulkAgencyReminderDigest,
  addTransactionAttachment,
  removeTransactionAttachment,
  addTransactionThreadMessage,
  computeDynamicAgencyScorecards,
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
  type FollowupCoordinatorProfile,
  type WorkbookImportHygieneReport,
  type RecruitmentSubsidiaryCode,
} from '../services/externalAgencyMasterService';
import { realErpDataStore } from '../services/realErpDataStore';

type CenterSubView = 'today_sla' | 'pipeline' | 'agent_master' | 'forecast_scorecard' | 'archive' | 'trash';

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
  const [coordinators, setCoordinators] = useState<FollowupCoordinatorProfile[]>(() =>
    getCoordinatorProfiles()
  );
  const [showCoordinatorSettingsModal, setShowCoordinatorSettingsModal] = useState(false);
  const [coordEdits, setCoordEdits] = useState<
    Record<FollowupCoordinatorEmail, { nameAr: string; phone: string; whatsapp: string }>
  >(() => {
    const list = getCoordinatorProfiles();
    return {
      'm.fouda.followup@kas.sa': {
        nameAr: list.find((c) => c.email === 'm.fouda.followup@kas.sa')?.nameAr || 'محمود فودة',
        phone: list.find((c) => c.email === 'm.fouda.followup@kas.sa')?.phone || '',
        whatsapp: list.find((c) => c.email === 'm.fouda.followup@kas.sa')?.whatsapp || '',
      },
      'i.mahmoud.followup@kas.sa': {
        nameAr: list.find((c) => c.email === 'i.mahmoud.followup@kas.sa')?.nameAr || 'إسلام أحمد عرفة محمود',
        phone: list.find((c) => c.email === 'i.mahmoud.followup@kas.sa')?.phone || '',
        whatsapp: list.find((c) => c.email === 'i.mahmoud.followup@kas.sa')?.whatsapp || '',
      },
    };
  });

  // Agency Add / Edit Modal
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [agencyForm, setAgencyForm] = useState({
    name_ar: '',
    name_en: '',
    country: 'أثيوبيا',
    musaned_license_no: '',
    license_expiry_date: '2027-06-30',
    email: '',
    phone: '',
    whatsapp: '',
    default_commission_usd: '1050',
    sla_assign_days: '3',
    sla_arrival_days: '38',
    assigned_coordinator_email: 'm.fouda.followup@kas.sa' as FollowupCoordinatorEmail,
    supported_companies: ['SAF', 'TOP', 'YAQ', 'DAR'] as RecruitmentSubsidiaryCode[],
  });

  // Transaction Edit + Soft Delete + Bulk Selection + Drawer
  const [editTxTarget, setEditTxTarget] = useState<MusanedFollowupTransaction | null>(null);
  const [editTxForm, setEditTxForm] = useState({
    client_name: '',
    client_phone: '',
    maid_name: '',
    passport_number: '',
    nationality: 'أثيوبيا',
    visa_number: '',
    visa_expiry_date: '',
    agency_id: '',
    stage: 'UNASSIGNED' as TransactionStage,
    flight_number: '',
    airline: '',
    expected_arrival_date: '',
    arrival_destination: 'الرياض',
    assigned_coordinator_email: 'm.fouda.followup@kas.sa' as FollowupCoordinatorEmail,
    notes: '',
  });
  const [undoDeleteTx, setUndoDeleteTx] = useState<MusanedFollowupTransaction | null>(null);
  const [confirmPermDeleteId, setConfirmPermDeleteId] = useState<string | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [bulkStageTarget, setBulkStageTarget] = useState<TransactionStage>('MEDICAL_FIT');
  const [bulkCoordTarget, setBulkCoordTarget] = useState<FollowupCoordinatorEmail>('m.fouda.followup@kas.sa');
  const [drawerTxId, setDrawerTxId] = useState<string | null>(null);
  const [drawerAttachmentCat, setDrawerAttachmentCat] = useState<
    'مستند مرحلة' | 'تذكرة طيران' | 'تأشيرة' | 'فحص طبي' | 'تفويض' | 'أخرى'
  >('مستند مرحلة');
  const [drawerThreadText, setDrawerThreadText] = useState('');

  // Archive Filters + Pagination
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveCompanyFilter, setArchiveCompanyFilter] = useState<'ALL' | RecruitmentSubsidiaryCode>('ALL');
  const [archiveAgencyFilter, setArchiveAgencyFilter] = useState('ALL');
  const [archiveStageFilter, setArchiveStageFilter] = useState<'ALL' | TransactionStage>('ALL');
  const [archivePage, setArchivePage] = useState(1);

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
    const [txs, cloudAgencies, cloudAccounts] = await Promise.all([
      getMusanedTransactions(true),
      loadUnifiedAgencies(),
      loadExternalAgencyAccounts(),
    ]);
    setTransactions(txs);
    setAgencies(cloudAgencies);
    setAgencyAccounts(cloudAccounts);
    const profiles = getCoordinatorProfiles();
    setCoordinators(profiles);
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const activeTransactions = useMemo(
    () => transactions.filter((t) => !t.is_archive && !t.is_deleted),
    [transactions]
  );

  const archiveTransactions = useMemo(
    () => transactions.filter((t) => t.is_archive && !t.is_deleted),
    [transactions]
  );

  const trashedTransactions = useMemo(
    () => transactions.filter((t) => Boolean(t.is_deleted)),
    [transactions]
  );

  const dynamicScorecards = useMemo(
    () =>
      computeDynamicAgencyScorecards(
        transactions.filter((t) => !t.is_deleted),
        agencies
      ),
    [transactions, agencies]
  );

  const drawerTx = useMemo(
    () => transactions.find((t) => t.id === drawerTxId) || null,
    [transactions, drawerTxId]
  );

  const filteredArchive = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();
    return archiveTransactions.filter((tx) => {
      if (archiveCompanyFilter !== 'ALL' && tx.company_id !== archiveCompanyFilter) return false;
      if (archiveAgencyFilter !== 'ALL' && tx.agency_id !== archiveAgencyFilter) return false;
      if (archiveStageFilter !== 'ALL' && tx.stage !== archiveStageFilter) return false;
      if (q) {
        return (
          tx.musaned_contract_no.toLowerCase().includes(q) ||
          tx.client_name.toLowerCase().includes(q) ||
          tx.maid_name.toLowerCase().includes(q) ||
          tx.passport_number.toLowerCase().includes(q) ||
          tx.agency_canonical_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [archiveTransactions, archiveCompanyFilter, archiveAgencyFilter, archiveStageFilter, archiveSearch]);

  const ARCHIVE_PAGE_SIZE = 50;
  const totalArchivePages = Math.max(1, Math.ceil(filteredArchive.length / ARCHIVE_PAGE_SIZE));
  const safeArchivePage = Math.min(archivePage, totalArchivePages);
  const paginatedArchive = useMemo(() => {
    const start = (safeArchivePage - 1) * ARCHIVE_PAGE_SIZE;
    return filteredArchive.slice(start, start + ARCHIVE_PAGE_SIZE);
  }, [filteredArchive, safeArchivePage]);

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
    const portalUrl =
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
        ? 'https://agents.kas-erp.com'
        : 'https://agents.kas-erp.com';

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

    const coord = resolveCoordinatorForAgencyOrTx({
      agencyId: matchedAg?.id,
      nationality: newContractForm.nationality,
    });

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
      assigned_coordinator_email: matchedAg?.assigned_coordinator_email || coord.email,
      sales_creator_name: newContractForm.salesCreatorName,
      branch_raw_name: SUBSIDIARY_DISPLAY_NAMES[newContractForm.companyId],
      stage: 'UNASSIGNED',
      stage_timestamps: { UNASSIGNED: todayIso },
      contract_start_date: todayIso,
      arrival_destination: 'الرياض',
      paid_amount_sar: parseFloat(newContractForm.paidAmountSar) || 7130,
      commission_usd: matchedAg?.default_commission_usd || 1050,
      attachments: [],
      messages_thread: [],
      updated_at: todayIso,
    };

    await realErpDataStore.addRecord('musaned_followup_transactions', newTx);
    await refreshAll();
    setShowAddContractModal(false);
    addNotification({
      title: 'تم تسجيل عقد مساند في مركز المتابعة',
      message: `تمت إضافة العقد #${newTx.musaned_contract_no} وإسناده تلقائياً للمسؤول (${coord.nameAr}).`,
      type: 'success',
    });
  };

  const handleOpenEditTx = (tx: MusanedFollowupTransaction) => {
    setEditTxForm({
      client_name: tx.client_name || '',
      client_phone: tx.client_phone || '',
      maid_name: tx.maid_name || '',
      passport_number: tx.passport_number || '',
      nationality: tx.nationality || 'أثيوبيا',
      visa_number: tx.visa_number || '',
      visa_expiry_date: tx.visa_expiry_date || '',
      agency_id: tx.agency_id || '',
      stage: tx.stage,
      flight_number: tx.flight_number || '',
      airline: tx.airline || '',
      expected_arrival_date: tx.expected_arrival_date || '',
      arrival_destination: tx.arrival_destination || 'الرياض',
      assigned_coordinator_email: tx.assigned_coordinator_email,
      notes: tx.notes || '',
    });
    setEditTxTarget(tx);
  };

  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTxTarget) return;
    const matchedAg = agencies.find((a) => a.id === editTxForm.agency_id);
    await updateMusanedTransaction(editTxTarget.id, {
      client_name: editTxForm.client_name,
      client_phone: editTxForm.client_phone,
      maid_name: editTxForm.maid_name,
      passport_number: editTxForm.passport_number.toUpperCase(),
      nationality: editTxForm.nationality,
      visa_number: editTxForm.visa_number,
      visa_expiry_date: editTxForm.visa_expiry_date,
      agency_id: matchedAg?.id || editTxTarget.agency_id,
      agency_canonical_name: matchedAg?.name_ar || editTxTarget.agency_canonical_name,
      stage: editTxForm.stage,
      flight_number: editTxForm.flight_number,
      airline: editTxForm.airline,
      expected_arrival_date: editTxForm.expected_arrival_date,
      arrival_destination: editTxForm.arrival_destination,
      assigned_coordinator_email: editTxForm.assigned_coordinator_email,
      notes: editTxForm.notes,
    });
    await refreshAll();
    setEditTxTarget(null);
    addNotification({
      title: 'تم تحديث بيانات المعاملة',
      message: `تم حفظ التعديلات على العقد #${editTxTarget.musaned_contract_no} ومزامنتها.`,
      type: 'success',
    });
  };

  const handleSoftDeleteTx = async (tx: MusanedFollowupTransaction) => {
    await softDeleteMusanedTransaction(tx.id, user?.email || 'قسم المتابعة الخارجية');
    setUndoDeleteTx(tx);
    setSelectedTxIds((prev) => prev.filter((id) => id !== tx.id));
    await refreshAll();
    addNotification({
      title: 'تم نقل العقد إلى سلة المحذوفات',
      message: `العقد #${tx.musaned_contract_no} قابل للاستعادة الفورية.`,
      type: 'info',
    });
  };

  const handleBulkStageApply = async () => {
    if (selectedTxIds.length === 0) return;
    const updatedCount = await bulkUpdateTransactionsStage({
      transactionIds: selectedTxIds,
      nextStage: bulkStageTarget,
      actorName: user?.full_name || 'قسم المتابعة الخارجية',
    });
    setSelectedTxIds([]);
    await refreshAll();
    addNotification({
      title: 'تم التحديث الجماعي للمراحل',
      message: `تم نقل ${updatedCount} معاملة إلى مرحلة (${getStageLabelAr(bulkStageTarget)}).`,
      type: 'success',
    });
  };

  const handleBulkReassignApply = async () => {
    if (selectedTxIds.length === 0) return;
    const updatedCount = await reassignTransactionsCoordinator(selectedTxIds, bulkCoordTarget);
    setSelectedTxIds([]);
    await refreshAll();
    const coordName = coordinators.find((c) => c.email === bulkCoordTarget)?.nameAr || bulkCoordTarget;
    addNotification({
      title: 'تم إعادة توزيع المهام جماعياً',
      message: `تم إسناد ${updatedCount} معاملة إلى (${coordName}).`,
      type: 'success',
    });
  };

  const handleSendGroupedBulkDigests = async () => {
    const selectedTxs = activeTransactions.filter((t) => selectedTxIds.includes(t.id));
    const digests = buildBulkAgencyReminderDigest(selectedTxs, agencies);
    for (const d of digests) {
      await dispatchViaEmailAndWhatsApp({
        recipientName: d.agency?.name_ar || 'الوكيل الخارجي',
        recipientEmail: d.agency?.email,
        recipientPhone: d.agency?.whatsapp || d.agency?.phone,
        subject: d.subject,
        bodyText: d.bodyText,
        channel: 'both',
        templateName: 'ملخص متابعة جماعي للعقود المعلقة',
        companyId: 'SAF',
        openExternalClient: false,
      });
    }
    setSelectedTxIds([]);
    addNotification({
      title: 'تم إرسال ملخصات المتابعة المجمعة',
      message: `تم تجميع العقود وإرسال ${digests.length} رسالة موحدة للوكلاء عبر البريد والواتساب.`,
      type: 'success',
    });
  };

  const handleExportScorecardExcel = () => {
    const rows = dynamicScorecards.map((sc) => ({
      'الوكالة الموحدة': sc.agency.name_ar,
      'الاسم الإنجليزي': sc.agency.name_en,
      الدولة: sc.agency.country,
      'العقود النشطة': sc.activeContractsCount,
      'التاريخي/الإجمالي': sc.totalHandledCount,
      'المتأخرة (SLA)': sc.overdueCount,
      'نسبة Backout %': sc.backoutRatePct,
      'نسبة الهروب %': sc.runawayRatePct,
      'متوسط التعيين (يوم)': sc.avgAssignDays,
      'متوسط الوصول (يوم)': sc.avgArrivalDays,
      'درجة الالتزام %': sc.computedScore,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agency_Scorecard');
    XLSX.writeFile(wb, `external_agency_scorecard_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleOpenCreateAgency = () => {
    setEditingAgencyId(null);
    setAgencyForm({
      name_ar: '',
      name_en: '',
      country: 'أثيوبيا',
      musaned_license_no: '',
      license_expiry_date: '2027-06-30',
      email: '',
      phone: '',
      whatsapp: '',
      default_commission_usd: '1050',
      sla_assign_days: '3',
      sla_arrival_days: '38',
      assigned_coordinator_email: 'm.fouda.followup@kas.sa',
      supported_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    });
    setShowAgencyModal(true);
  };

  const handleOpenEditAgency = (ag: UnifiedExternalAgency) => {
    setEditingAgencyId(ag.id);
    setAgencyForm({
      name_ar: ag.name_ar,
      name_en: ag.name_en,
      country: ag.country,
      musaned_license_no: ag.musaned_license_no || '',
      license_expiry_date: ag.license_expiry_date || '2027-06-30',
      email: ag.email,
      phone: ag.phone,
      whatsapp: ag.whatsapp,
      default_commission_usd: String(ag.default_commission_usd || 1050),
      sla_assign_days: String(ag.sla_assign_days || 3),
      sla_arrival_days: String(ag.sla_arrival_days || 38),
      assigned_coordinator_email: ag.assigned_coordinator_email,
      supported_companies: ag.supported_companies || ['SAF', 'TOP', 'YAQ', 'DAR'],
    });
    setShowAgencyModal(true);
  };

  const handleSaveAgencyModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyForm.name_ar.trim()) return;
    const prevAg = editingAgencyId ? agencies.find((a) => a.id === editingAgencyId) : undefined;
    const coordProfile = coordinators.find((c) => c.email === agencyForm.assigned_coordinator_email);
    const companiesList = agencyForm.supported_companies.length
      ? agencyForm.supported_companies
      : (['SAF'] as RecruitmentSubsidiaryCode[]);

    await upsertUnifiedAgency({
      id: editingAgencyId || undefined,
      company_id: prevAg?.company_id || companiesList[0] || 'SAF',
      canonical_code:
        prevAg?.canonical_code ||
        `AGY_${(agencyForm.name_en || agencyForm.name_ar).replace(/[^A-Za-z0-9]+/g, '_').toUpperCase().slice(0, 12)}`,
      name_ar: agencyForm.name_ar.trim(),
      name_en: agencyForm.name_en.trim() || agencyForm.name_ar.trim().toUpperCase(),
      country: agencyForm.country,
      country_code: prevAg?.country_code || 'INT',
      license_no: agencyForm.musaned_license_no.trim() || prevAg?.license_no || 'PENDING',
      musaned_license_no: agencyForm.musaned_license_no.trim() || prevAg?.musaned_license_no || undefined,
      license_expiry_date: agencyForm.license_expiry_date || undefined,
      manager_name: prevAg?.manager_name || 'مدير الوكالة',
      email: agencyForm.email.trim(),
      phone: agencyForm.phone.trim(),
      whatsapp: agencyForm.whatsapp.trim() || agencyForm.phone.trim(),
      aliases: prevAg?.aliases || [agencyForm.name_ar.trim(), agencyForm.name_en.trim()].filter(Boolean),
      authorized_companies: companiesList,
      supported_companies: companiesList,
      default_commission_usd: Number(agencyForm.default_commission_usd) || 1050,
      sla_assign_days: Number(agencyForm.sla_assign_days) || 3,
      sla_arrival_days: Number(agencyForm.sla_arrival_days) || 38,
      avg_days_to_assign: prevAg?.avg_days_to_assign ?? (Number(agencyForm.sla_assign_days) || 3),
      avg_days_to_arrival: prevAg?.avg_days_to_arrival ?? (Number(agencyForm.sla_arrival_days) || 38),
      historical_total_contracts: prevAg?.historical_total_contracts ?? 0,
      historical_arrived_count: prevAg?.historical_arrived_count ?? 0,
      historical_backout_count: prevAg?.historical_backout_count ?? 0,
      historical_runaway_count: prevAg?.historical_runaway_count ?? 0,
      historical_cancelled_count: prevAg?.historical_cancelled_count ?? 0,
      quality_score: prevAg?.quality_score ?? 95,
      assigned_coordinator_email: agencyForm.assigned_coordinator_email,
      assigned_coordinator_name: coordProfile?.nameAr || prevAg?.assigned_coordinator_name || 'محمود فودة',
      status: prevAg?.status || 'نشط',
    });
    await refreshAll();
    setShowAgencyModal(false);
    addNotification({
      title: editingAgencyId ? 'تم تحديث بيانات الوكيل الموحد' : 'تمت إضافة وكالة خارجية موحدة جديدة',
      message: `تم حفظ سجل (${agencyForm.name_ar}) ومزامنته مع سجل المكاتب السحابي.`,
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

            <button
              type="button"
              onClick={() => setShowCoordinatorSettingsModal(true)}
              className="px-4 py-2.5 rounded-full bg-[#262626] hover:bg-[#333333] text-[#ffffff] border border-[#404040] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>أرقام المنسقين</span>
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

      {/* Undo Soft-Delete Toast Banner */}
      {undoDeleteTx && (
        <div className="bg-[#141414] text-[#ffffff] rounded-[18px] px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold">
            تم نقل عقد مساند #{undoDeleteTx.musaned_contract_no} ({undoDeleteTx.client_name}) إلى سلة المحذوفات.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                await restoreMusanedTransaction(undoDeleteTx.id);
                setUndoDeleteTx(null);
                await refreshAll();
                addNotification({
                  title: 'تمت استعادة المعاملة',
                  message: `عاد العقد #${undoDeleteTx.musaned_contract_no} إلى خط المتابعة.`,
                  type: 'success',
                });
              }}
              className="px-3.5 py-1 rounded-full bg-[#ffffff] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع عن الحذف</span>
            </button>
            <button
              type="button"
              onClick={() => setUndoDeleteTx(null)}
              className="w-6 h-6 rounded-full bg-[#262626] text-[#ffffff] flex items-center justify-center text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mobbin Segmented Sub-Navigation */}
      <div className="bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'today_sla', label: `اليوم عندي ماذا؟ (${urgentTasks.length})`, icon: AlertTriangle },
          { id: 'pipeline', label: `خط أنابيب المعاملات (${activeTransactions.length})`, icon: GitPullRequest },
          { id: 'agent_master', label: `سجل الوكلاء الموحد والحسابات (${agencies.length})`, icon: Globe2 },
          { id: 'forecast_scorecard', label: 'توقع الوصول وتقييم الوكلاء', icon: Award },
          { id: 'archive', label: `سجل الأرشيف والوصول (${archiveTransactions.length})`, icon: CheckCircle2 },
          { id: 'trash', label: `سلة المحذوفات (${trashedTransactions.length})`, icon: Trash2 },
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

          {/* Bulk Action Bar */}
          {selectedTxIds.length > 0 && (
            <div className="px-4 py-3 bg-[#141414] text-[#ffffff] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold">تم تحديد {selectedTxIds.length} معاملة</span>
                <button
                  type="button"
                  onClick={() => setSelectedTxIds([])}
                  className="px-2.5 py-1 rounded-full bg-[#262626] text-[11px] font-bold cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="تحديث المرحلة للمحددين"
                  value={bulkStageTarget}
                  onChange={(e) => setBulkStageTarget(e.target.value as TransactionStage)}
                  className="px-3 py-1 rounded-full bg-[#262626] text-[#ffffff] border border-[#404040] text-[11px] font-bold"
                >
                  {TRANSACTION_STAGES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.labelAr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleBulkStageApply()}
                  className="px-3 py-1 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold cursor-pointer"
                >
                  تطبيق المرحلة
                </button>

                <select
                  aria-label="إسناد المحددين لمنسق"
                  value={bulkCoordTarget}
                  onChange={(e) => setBulkCoordTarget(e.target.value as FollowupCoordinatorEmail)}
                  className="px-3 py-1 rounded-full bg-[#262626] text-[#ffffff] border border-[#404040] text-[11px] font-bold"
                >
                  {coordinators.map((c) => (
                    <option key={c.email} value={c.email}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleBulkReassignApply()}
                  className="px-3 py-1 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold cursor-pointer"
                >
                  توزيع المهام
                </button>

                <button
                  type="button"
                  onClick={() => void handleSendGroupedBulkDigests()}
                  className="px-3.5 py-1 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>ملخص جماعي للوكلاء</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] font-bold">
                <tr>
                  <th className="p-3.5 w-10">
                    <input
                      type="checkbox"
                      aria-label="تحديد جميع العقود الظاهرة"
                      checked={
                        filteredPipeline.length > 0 &&
                        filteredPipeline.every(({ tx }) => selectedTxIds.includes(tx.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTxIds(filteredPipeline.map(({ tx }) => tx.id));
                        } else {
                          setSelectedTxIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-3.5">عقد مساند / الشركة</th>
                  <th className="p-3.5">العميل والمنشئ</th>
                  <th className="p-3.5">العاملة والجواز</th>
                  <th className="p-3.5">الوكيل والمُتابع</th>
                  <th className="p-3.5">المرحلة المنظمة (بلا نص حر)</th>
                  <th className="p-3.5">انتهاء التأشيرة / الوصول المتوقع</th>
                  <th className="p-3.5 text-center">إجراءات ومتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredPipeline.map(({ tx, sla }) => {
                  const checked = selectedTxIds.includes(tx.id);
                  const attachCount = (tx.attachments || []).length;
                  const msgCount = (tx.messages_thread || []).length;
                  return (
                  <tr key={tx.id} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="p-3.5">
                      <input
                        type="checkbox"
                        aria-label={`تحديد العقد ${tx.musaned_contract_no}`}
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTxIds((prev) => Array.from(new Set([...prev, tx.id])));
                          } else {
                            setSelectedTxIds((prev) => prev.filter((id) => id !== tx.id));
                          }
                        }}
                      />
                    </td>
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
                    <td className="p-3.5 space-y-1">
                      <div className="font-bold text-[#141414]">{tx.agency_canonical_name}</div>
                      <select
                        aria-label={`تغيير مسؤول المتابعة للعقد ${tx.musaned_contract_no}`}
                        value={tx.assigned_coordinator_email}
                        onChange={async (e) => {
                          await reassignTransactionsCoordinator(
                            [tx.id],
                            e.target.value as FollowupCoordinatorEmail
                          );
                          await refreshAll();
                          addNotification({
                            title: 'تم تحويل مسؤولية المعاملة',
                            message: `تم إسناد العقد #${tx.musaned_contract_no} بنجاح.`,
                            type: 'info',
                          });
                        }}
                        className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10.5px] font-bold text-[#141414]"
                      >
                        {coordinators.map((c) => (
                          <option key={c.email} value={c.email}>
                            {c.nameAr}
                          </option>
                        ))}
                      </select>
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
                      {tx.warranty_end_date && (
                        <div className="text-[10px] text-[#141414]">ضمان حتى: {tx.warranty_end_date}</div>
                      )}
                      {sla.alertsAr.length > 0 && (
                        <div className="text-[10px] font-sans font-bold text-[#141414] mt-0.5">
                          ! {sla.alertsAr[0]}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 flex-wrap justify-center">
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
                          للمبيعات
                        </button>
                        <button
                          type="button"
                          onClick={() => setDrawerTxId(tx.id)}
                          className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="مرفقات ومحادثة الوكيل"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{attachCount + msgCount}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditTx(tx)}
                          className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                          title="تعديل بيانات العقد"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSoftDeleteTx(tx)}
                          className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                          title="نقل إلى سلة المحذوفات"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: UNIFIED AGENT MASTER & ACCOUNTS ================= */}
      {subView === 'agent_master' && (
        <div className="space-y-4">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-[#141414]">
                  سجل الوكلاء الموحد (Agent Master + Aliases) وإدارة حسابات بوابة الوكلاء
                </h2>
                <p className="text-xs text-[#707070]">
                  يوحّد كل التهجئات الـ 42+ في الشيت بوكيل واحد معتمد، ومنه تُنشأ وتُدار حسابات دخول الوكلاء وتُرسَل عبر البريد والواتساب.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateAgency}
                className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وكالة خارجية موحدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agencies.map((ag) => {
                const acc = agencyAccounts.find((a) => a.agency_id === ag.id);
                const todayIso = new Date().toISOString().slice(0, 10);
                const licenseDaysLeft = ag.license_expiry_date
                  ? Math.round(
                      (new Date(`${ag.license_expiry_date}T00:00:00Z`).getTime() -
                        new Date(`${todayIso}T00:00:00Z`).getTime()) /
                        86_400_000
                    )
                  : null;
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
                          {ag.license_expiry_date && (
                            <div className="text-[10.5px] font-mono mt-0.5 text-[#141414]">
                              ترخيص: {ag.license_expiry_date}
                              {licenseDaysLeft !== null && licenseDaysLeft <= 0 && (
                                <span className="mr-1 px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-sans font-bold text-[10px]">
                                  منتهي
                                </span>
                              )}
                              {licenseDaysLeft !== null && licenseDaysLeft > 0 && licenseDaysLeft <= 60 && (
                                <span className="mr-1 px-2 py-0.5 rounded-full bg-[#e0e0e0] text-[#141414] font-sans font-bold text-[10px]">
                                  ينتهي خلال {licenseDaysLeft} يوم
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                          {ag.country} • {ag.quality_score}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditAgency(ag)}
                          className="p-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] hover:bg-[#e0e0e0] cursor-pointer"
                          title="تعديل بيانات الوكالة والترخيص"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* ================= VIEW 4: EXPECTED ARRIVAL & DYNAMIC AGENCY SCORECARD ================= */}
      {subView === 'forecast_scorecard' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-5 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141414]">
                تقييم أداء الوكلاء الفعلي وقابلية الوصول المتوقعة (محسوب لحظياً من المعاملات والأرشيف)
              </h2>
              <p className="text-xs text-[#707070]">
                يحسب متوسط أيام التعيين، الوصول من التفويض، تأخيرات الـ SLA الحالية، ونسب الـ Backout والهروب لكل وكالة خارجية.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportScorecardExcel}
              className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير بطاقة الأداء Excel</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                <tr>
                  <th className="p-3.5">الوكالة الموحدة</th>
                  <th className="p-3.5">الدولة</th>
                  <th className="p-3.5">النشط / الإجمالي</th>
                  <th className="p-3.5">متأخرة (SLA)</th>
                  <th className="p-3.5">الواصلات فعلياً</th>
                  <th className="p-3.5">نسبة Backout</th>
                  <th className="p-3.5">نسبة الهروب</th>
                  <th className="p-3.5">متوسط التعيين / الوصول</th>
                  <th className="p-3.5">التقييم الديناميكي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {dynamicScorecards.map((sc) => (
                  <tr key={sc.agency.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-3.5 font-bold text-[#141414]">{sc.agency.name_ar}</td>
                    <td className="p-3.5 text-[#707070]">{sc.agency.country}</td>
                    <td className="p-3.5 font-mono font-bold">
                      {sc.activeContractsCount} / {sc.totalHandledCount.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{sc.overdueCount}</td>
                    <td className="p-3.5 font-mono text-[#141414]">{sc.arrivedCount.toLocaleString()}</td>
                    <td className="p-3.5 font-mono">{sc.backoutRatePct.toFixed(1)}%</td>
                    <td className="p-3.5 font-mono">{sc.runawayRatePct.toFixed(1)}%</td>
                    <td className="p-3.5 font-mono">
                      {sc.avgAssignDays}ي / {sc.avgArrivalDays}ي
                    </td>
                    <td className="p-3.5">
                      <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-mono font-bold text-[11px]">
                        {sc.computedScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= VIEW 5: HISTORICAL ARCHIVE WITH SEARCH & PAGINATION ================= */}
      {subView === 'archive' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-5 border-b border-[#e0e0e0] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-[#141414]">
                  سجل الأرشيف التاريخي الكامل ({filteredArchive.length.toLocaleString()} من {archiveTransactions.length.toLocaleString()} سجل)
                </h2>
                <p className="text-xs text-[#707070]">
                  بحث وتصفية كاملة عبر جميع سجلات الوصول 2023–2026 والإلغاءات والهروب مع ترقيم صفحات.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  disabled={safeArchivePage <= 1}
                  onClick={() => setArchivePage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold disabled:opacity-40 cursor-pointer"
                >
                  السابق
                </button>
                <span className="font-mono font-bold text-[#141414]">
                  {safeArchivePage} / {totalArchivePages}
                </span>
                <button
                  type="button"
                  disabled={safeArchivePage >= totalArchivePages}
                  onClick={() => setArchivePage((p) => Math.min(totalArchivePages, p + 1))}
                  className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold disabled:opacity-40 cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث في الأرشيف برقم العقد، العميل، العاملة، الجواز، أو الوكيل..."
                  value={archiveSearch}
                  onChange={(e) => {
                    setArchiveSearch(e.target.value);
                    setArchivePage(1);
                  }}
                  className="w-full pr-10 pl-4 py-2 rounded-full bg-[#f0f0f0] text-xs text-[#141414] focus:outline-none"
                />
              </div>
              <select
                aria-label="تصفية الأرشيف حسب الشركة"
                value={archiveCompanyFilter}
                onChange={(e) => {
                  setArchiveCompanyFilter(e.target.value as any);
                  setArchivePage(1);
                }}
                className="px-3 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                <option value="ALL">جميع الشركات</option>
                <option value="SAF">السفير الماسي (SAF)</option>
                <option value="TOP">توباز (TOP)</option>
                <option value="YAQ">ياقوت نجد (YAQ)</option>
                <option value="DAR">دار الرواد (DAR)</option>
              </select>
              <select
                aria-label="تصفية الأرشيف حسب الوكيل"
                value={archiveAgencyFilter}
                onChange={(e) => {
                  setArchiveAgencyFilter(e.target.value);
                  setArchivePage(1);
                }}
                className="px-3 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                <option value="ALL">جميع الوكلاء</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name_ar}
                  </option>
                ))}
              </select>
              <select
                aria-label="تصفية الأرشيف حسب الحالة"
                value={archiveStageFilter}
                onChange={(e) => {
                  setArchiveStageFilter(e.target.value as any);
                  setArchivePage(1);
                }}
                className="px-3 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                <option value="ALL">جميع الحالات</option>
                {TRANSACTION_STAGES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.labelAr}
                  </option>
                ))}
              </select>
            </div>
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
                  <th className="p-3.5 text-center">مرفقات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {paginatedArchive.map((tx) => (
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
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setDrawerTxId(tx.id)}
                        className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer"
                      >
                        عرض ({(tx.attachments || []).length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= VIEW 6: RECYCLE BIN (SOFT DELETED TRANSACTIONS) ================= */}
      {subView === 'trash' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          <div className="p-5 border-b border-[#e0e0e0]">
            <h2 className="text-base font-bold text-[#141414]">
              سلة المحذوفات القابلة للاستعادة ({trashedTransactions.length})
            </h2>
            <p className="text-xs text-[#707070]">
              يمكن استعادة أي معاملة محذوفة إلى خط المتابعة فوراً أو حذفها نهائياً بعد التأكيد المزدوج.
            </p>
          </div>
          {trashedTransactions.length === 0 ? (
            <div className="p-10 text-center text-xs font-semibold text-[#707070]">
              سلة المحذوفات فارغة حالياً.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold text-[#141414]">
                  <tr>
                    <th className="p-3.5">عقد مساند</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">الوكيل</th>
                    <th className="p-3.5">حُذف بواسطة</th>
                    <th className="p-3.5">تاريخ الحذف</th>
                    <th className="p-3.5 text-center">إجراءات الاستعادة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {trashedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#f3f3f3]">
                      <td className="p-3.5 font-mono font-bold">#{tx.musaned_contract_no}</td>
                      <td className="p-3.5 font-bold">{tx.client_name}</td>
                      <td className="p-3.5">{tx.agency_canonical_name}</td>
                      <td className="p-3.5 text-[#707070]">{tx.deleted_by || '—'}</td>
                      <td className="p-3.5 font-mono">{tx.deleted_at?.slice(0, 10) || '—'}</td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await restoreMusanedTransaction(tx.id);
                              await refreshAll();
                              addNotification({
                                title: 'تمت استعادة المعاملة',
                                message: `تم إرجاع العقد #${tx.musaned_contract_no} لخط المتابعة.`,
                                type: 'success',
                              });
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>استعادة</span>
                          </button>

                          {confirmPermDeleteId === tx.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await permanentlyDeleteMusanedTransaction(tx.id);
                                  setConfirmPermDeleteId(null);
                                  await refreshAll();
                                }}
                                className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                              >
                                تأكيد الحذف النهائي
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmPermDeleteId(null)}
                                className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmPermDeleteId(tx.id)}
                              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                            >
                              حذف نهائي
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* ================= MODAL: COORDINATOR CONTACT SETTINGS ================= */}
      {showCoordinatorSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCoordinatorSettingsModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-lg w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                إعدادات وأرقام تواصل منسقي المتابعة (محمود فودة & إسلام عرفة)
              </h3>
              <button
                type="button"
                onClick={() => setShowCoordinatorSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-xs">
              {(['m.fouda.followup@kas.sa', 'i.mahmoud.followup@kas.sa'] as FollowupCoordinatorEmail[]).map(
                (email) => (
                  <div key={email} className="bg-[#f3f3f3] rounded-[16px] p-3.5 space-y-2 border border-[#e0e0e0]">
                    <div className="font-mono font-bold text-[#141414]">{email}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        aria-label={`اسم ${email}`}
                        placeholder="الاسم"
                        value={coordEdits[email].nameAr}
                        onChange={(e) =>
                          setCoordEdits({
                            ...coordEdits,
                            [email]: { ...coordEdits[email], nameAr: e.target.value },
                          })
                        }
                        className="px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414]"
                      />
                      <input
                        type="text"
                        aria-label={`جوال ${email}`}
                        placeholder="رقم الجوال (05...)"
                        value={coordEdits[email].phone}
                        onChange={(e) =>
                          setCoordEdits({
                            ...coordEdits,
                            [email]: { ...coordEdits[email], phone: e.target.value },
                          })
                        }
                        className="px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] font-mono"
                        dir="ltr"
                      />
                      <input
                        type="text"
                        aria-label={`واتساب ${email}`}
                        placeholder="رقم الواتساب (9665...)"
                        value={coordEdits[email].whatsapp}
                        onChange={(e) =>
                          setCoordEdits({
                            ...coordEdits,
                            [email]: { ...coordEdits[email], whatsapp: e.target.value },
                          })
                        }
                        className="px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoordinatorSettingsModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    for (const email of [
                      'm.fouda.followup@kas.sa',
                      'i.mahmoud.followup@kas.sa',
                    ] as FollowupCoordinatorEmail[]) {
                      saveCoordinatorContact({
                        email,
                        nameAr: coordEdits[email].nameAr,
                        phone: coordEdits[email].phone,
                        whatsapp: coordEdits[email].whatsapp,
                      });
                    }
                    setCoordinators(getCoordinatorProfiles());
                    setShowCoordinatorSettingsModal(false);
                    addNotification({
                      title: 'تم تحديث بيانات منسقي المتابعة',
                      message: 'سيتم توجيه تنبيهات البوابة والاستعجال تلقائياً بالأرقام المحدثة.',
                      type: 'success',
                    });
                  }}
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT UNIFIED AGENCY ================= */}
      {showAgencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAgencyModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                {editingAgencyId ? 'تعديل بيانات الوكالة الخارجية الموحدة' : 'إضافة وكالة خارجية موحدة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAgencyModal(false)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAgencyModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">اسم الوكالة (عربي) *</label>
                  <input
                    type="text"
                    required
                    value={agencyForm.name_ar}
                    onChange={(e) => setAgencyForm({ ...agencyForm, name_ar: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الاسم (إنجليزي)</label>
                  <input
                    type="text"
                    value={agencyForm.name_en}
                    onChange={(e) => setAgencyForm({ ...agencyForm, name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الدولة</label>
                  <input
                    type="text"
                    value={agencyForm.country}
                    onChange={(e) => setAgencyForm({ ...agencyForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">ترخيص مساند</label>
                  <input
                    type="text"
                    value={agencyForm.musaned_license_no}
                    onChange={(e) => setAgencyForm({ ...agencyForm, musaned_license_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">انتهاء الترخيص</label>
                  <input
                    type="date"
                    value={agencyForm.license_expiry_date}
                    onChange={(e) => setAgencyForm({ ...agencyForm, license_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={agencyForm.email}
                    onChange={(e) => setAgencyForm({ ...agencyForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الهاتف</label>
                  <input
                    type="text"
                    value={agencyForm.phone}
                    onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الواتساب</label>
                  <input
                    type="text"
                    value={agencyForm.whatsapp}
                    onChange={(e) => setAgencyForm({ ...agencyForm, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">العمولة ($)</label>
                  <input
                    type="number"
                    value={agencyForm.default_commission_usd}
                    onChange={(e) => setAgencyForm({ ...agencyForm, default_commission_usd: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">SLA التعيين (يوم)</label>
                  <input
                    type="number"
                    value={agencyForm.sla_assign_days}
                    onChange={(e) => setAgencyForm({ ...agencyForm, sla_assign_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">منسق المتابعة</label>
                  <select
                    value={agencyForm.assigned_coordinator_email}
                    onChange={(e) =>
                      setAgencyForm({
                        ...agencyForm,
                        assigned_coordinator_email: e.target.value as FollowupCoordinatorEmail,
                      })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  >
                    {coordinators.map((c) => (
                      <option key={c.email} value={c.email}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAgencyModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ الوكالة الموحدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT TRANSACTION ================= */}
      {editTxTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEditTxTarget(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-sm text-[#141414]">
                تعديل بيانات المعاملة #{editTxTarget.musaned_contract_no}
              </h3>
              <button
                type="button"
                onClick={() => setEditTxTarget(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEditTx} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">اسم العميل</label>
                  <input
                    type="text"
                    value={editTxForm.client_name}
                    onChange={(e) => setEditTxForm({ ...editTxForm, client_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">جوال العميل</label>
                  <input
                    type="text"
                    value={editTxForm.client_phone}
                    onChange={(e) => setEditTxForm({ ...editTxForm, client_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">اسم العاملة</label>
                  <input
                    type="text"
                    value={editTxForm.maid_name}
                    onChange={(e) => setEditTxForm({ ...editTxForm, maid_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم الجواز</label>
                  <input
                    type="text"
                    value={editTxForm.passport_number}
                    onChange={(e) => setEditTxForm({ ...editTxForm, passport_number: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم التأشيرة</label>
                  <input
                    type="text"
                    value={editTxForm.visa_number}
                    onChange={(e) => setEditTxForm({ ...editTxForm, visa_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الوكيل الخارجي</label>
                  <select
                    value={editTxForm.agency_id}
                    onChange={(e) => setEditTxForm({ ...editTxForm, agency_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  >
                    <option value="">غير معيّن</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">المرحلة</label>
                  <select
                    value={editTxForm.stage}
                    onChange={(e) => setEditTxForm({ ...editTxForm, stage: e.target.value as TransactionStage })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  >
                    {TRANSACTION_STAGES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم الرحلة</label>
                  <input
                    type="text"
                    value={editTxForm.flight_number}
                    onChange={(e) => setEditTxForm({ ...editTxForm, flight_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">الوصول المتوقع</label>
                  <input
                    type="date"
                    value={editTxForm.expected_arrival_date}
                    onChange={(e) => setEditTxForm({ ...editTxForm, expected_arrival_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">المسؤول</label>
                  <select
                    value={editTxForm.assigned_coordinator_email}
                    onChange={(e) =>
                      setEditTxForm({
                        ...editTxForm,
                        assigned_coordinator_email: e.target.value as FollowupCoordinatorEmail,
                      })
                    }
                    className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                  >
                    {coordinators.map((c) => (
                      <option key={c.email} value={c.email}>
                        {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#707070] mb-1">ملاحظات المتابعة</label>
                <textarea
                  rows={2}
                  value={editTxForm.notes}
                  onChange={(e) => setEditTxForm({ ...editTxForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTxTarget(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DRAWER: TRANSACTION ATTACHMENTS & AGENCY THREAD ================= */}
      {drawerTx && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDrawerTxId(null)}
          className="fixed inset-0 z-50 bg-black/60 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border-r border-[#e0e0e0] w-full max-w-lg h-full overflow-y-auto p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#141414]">
                  مستندات ومحادثة الوكيل — عقد #{drawerTx.musaned_contract_no}
                </h3>
                <p className="text-[11px] text-[#707070]">
                  {drawerTx.maid_name || 'غير معيّنة'} • {drawerTx.agency_canonical_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerTxId(null)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Attachments Section */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#141414]">
                مرفقات ومستندات المراحل ({(drawerTx.attachments || []).length})
              </div>
              <div className="flex items-center gap-2 flex-wrap bg-[#f3f3f3] p-3 rounded-[16px] border border-[#e0e0e0]">
                <select
                  aria-label="تصنيف المستند المرفق"
                  value={drawerAttachmentCat}
                  onChange={(e) => setDrawerAttachmentCat(e.target.value as any)}
                  className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  <option value="مستند مرحلة">مستند مرحلة</option>
                  <option value="فحص طبي">فحص طبي</option>
                  <option value="تفويض">تفويض إنجاز</option>
                  <option value="تأشيرة">تأشيرة مختومة</option>
                  <option value="تذكرة طيران">تذكرة طيران</option>
                  <option value="أخرى">أخرى</option>
                </select>
                <label className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>رفع مستند</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1_500_000) {
                        addNotification({
                          title: 'حجم الملف كبير',
                          message: 'الحد الأقصى للمرفق 1.5 ميجابايت لضمان سرعة المزامنة.',
                          type: 'warning',
                        });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const res = await addTransactionAttachment(drawerTx.id, {
                          name: file.name,
                          category: drawerAttachmentCat,
                          mimeType: file.type || 'application/octet-stream',
                          sizeBytes: file.size,
                          dataUrl: String(reader.result || ''),
                          uploadedBy: user?.full_name || 'قسم المتابعة الخارجية',
                          uploadedByRole: 'internal_coordinator',
                        });
                        if (res) await refreshAll();
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              <div className="space-y-2">
                {(drawerTx.attachments || []).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#141414] truncate">{att.name || att.fileName || att.title}</div>
                      <div className="text-[10.5px] text-[#707070]">
                        {att.category} • {Math.round((att.sizeBytes || 0) / 1024)} KB • {att.uploadedBy}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={sanitizeSafeHref(att.dataUrl)}
                        download={att.name || att.fileName || 'attachment'}
                        className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]"
                      >
                        تنزيل
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeTransactionAttachment(drawerTx.id, att.id);
                          await refreshAll();
                        }}
                        className="p-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Contract Messaging Thread */}
            <div className="space-y-3 pt-4 border-t border-[#e0e0e0]">
              <div className="text-xs font-bold text-[#141414]">
                سجل الرسائل المباشرة مع الوكيل الخارجي ({(drawerTx.messages_thread || []).length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto bg-[#f3f3f3] p-3 rounded-[16px] border border-[#e0e0e0]">
                {(drawerTx.messages_thread || []).length === 0 ? (
                  <div className="text-[11px] text-[#707070] text-center py-4">
                    لا توجد رسائل على هذا العقد بعد. أرسل أول رسالة متابعة للوكيل.
                  </div>
                ) : (
                  (drawerTx.messages_thread || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-[12px] text-xs ${
                        msg.senderRole === 'internal_coordinator'
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                        <span>{msg.senderName}</span>
                        <span className="font-mono">{msg.sentAt.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))
                )}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!drawerThreadText.trim()) return;
                  await addTransactionThreadMessage(drawerTx.id, {
                    senderName: user?.full_name || 'منسق المتابعة الخارجية',
                    senderRole: 'internal_coordinator',
                    body: drawerThreadText.trim(),
                  });
                  setDrawerThreadText('');
                  await refreshAll();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="اكتب رسالة للوكيل الخارجي حول هذا العقد..."
                  value={drawerThreadText}
                  onChange={(e) => setDrawerThreadText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-full bg-[#f0f0f0] text-xs text-[#141414] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  إرسال
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsFollowupCenterPage;
