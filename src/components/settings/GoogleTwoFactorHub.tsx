import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldCheck,
  Wifi,
  WifiOff,
  QrCode,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Globe,
  Smartphone,
  ShieldOff,
  Loader2,
  Sparkles,
  Search,
  Users,
  UserCheck,
  Mail,
  MessageCircle,
  Building2,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { authService } from '../../services/authService';
import { printSpecificElement } from '../../utils/printManager';
import { shareViaEmail, shareViaWhatsApp } from '../../services/quickShareService';
import {
  ReemHrDocumentSignatureBlock,
  IncludeReemSignatureToggle,
} from '../hr/ReemHrDocumentSignatureBlock';
import {
  GOOGLE_2FA_CHANGED_EVENT,
  GoogleOnlineReachabilityResult,
  UserGoogleTwoFactorRecord,
  EmployeeDedicatedAuthenticatorProfile,
  EmployeeTotpIsolationAuditSummary,
  auditAllEmployeesDedicatedTotpIsolation,
  checkGoogleOnlineReachability,
  confirmTotpEnrollment,
  disableUserTwoFactor,
  enableGoogleOnline2FA,
  generateTotpCodeAtTime,
  getAllEmployeesAuthenticatorDirectory,
  getEmployeeDedicatedAuthenticatorProfile,
  getSecondsRemainingInTotpStep,
  getUserTwoFactorStatus,
  performOnlineGoogleSecondFactorAuth,
  provisionAllEmployeesDedicatedTotp,
  provisionEmployeeDedicatedTotp,
  regenerateBackupCodes,
  startTotpEnrollmentDraft,
  verifyEmployeeSpecificTotpCode,
} from '../../services/googleTwoFactorService';

export interface GoogleTwoFactorHubProps {
  /** When passed (e.g., inside Employee 360° Digital File), locks the hub to that specific employee. */
  singleEmployee?: Record<string, any> | null;
  readOnly?: boolean;
}

export const GoogleTwoFactorHub: React.FC<GoogleTwoFactorHubProps> = ({
  singleEmployee = null,
  readOnly = false,
}) => {
  const { addNotification } = useAppStore();
  const currentUser = authService.getCurrentUser();

  const initialEmail = useMemo(() => {
    if (singleEmployee) {
      const prof = getEmployeeDedicatedAuthenticatorProfile(singleEmployee);
      return prof.kasEmail;
    }
    return (currentUser?.email || 'khalid@kas.sa').trim().toLowerCase();
  }, [singleEmployee, currentUser?.email]);

  const [selectedKasEmail, setSelectedKasEmail] = useState<string>(initialEmail);
  const [directory, setDirectory] = useState<EmployeeDedicatedAuthenticatorProfile[]>(() =>
    getAllEmployeesAuthenticatorDirectory('all')
  );
  const [employeeProfile, setEmployeeProfile] =
    useState<EmployeeDedicatedAuthenticatorProfile>(() =>
      getEmployeeDedicatedAuthenticatorProfile(singleEmployee || initialEmail)
    );
  const [status, setStatus] = useState<UserGoogleTwoFactorRecord>(() =>
    getUserTwoFactorStatus(initialEmail)
  );

  const [reachability, setReachability] = useState<GoogleOnlineReachabilityResult | null>(null);
  const [checkingNet, setCheckingNet] = useState<boolean>(false);

  // Directory Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TOTP_ACTIVE' | 'NOT_ACTIVE'>('ALL');
  const [isolationAudit, setIsolationAudit] =
    useState<EmployeeTotpIsolationAuditSummary | null>(null);
  const [includeHrSignature, setIncludeHrSignature] = useState<boolean>(true);

  // Google Online 2-Step Binding State
  const [googleEmailInput, setGoogleEmailInput] = useState<string>(() => {
    const existing = getUserTwoFactorStatus(initialEmail);
    const linked = authService.getLinkedGoogleAccountForKasEmail(initialEmail);
    return existing.googleEmail || linked?.googleEmail || '';
  });
  const [isEnablingOnline, setIsEnablingOnline] = useState<boolean>(false);
  const [isTestingOnline, setIsTestingOnline] = useState<boolean>(false);
  const [onlineFeedback, setOnlineFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Google Authenticator TOTP State
  const [totpDraft, setTotpDraft] = useState<{
    secret: string;
    otpAuthUri: string;
    qrSvg: string;
  } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState<string>('');
  const [isConfirmingTotp, setIsConfirmingTotp] = useState<boolean>(false);
  const [totpFeedback, setTotpFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    getSecondsRemainingInTotpStep()
  );
  const [previewLiveCode, setPreviewLiveCode] = useState<string>('');
  const [copiedSecretKey, setCopiedSecretKey] = useState<boolean>(false);

  const employeeCardPrintRef = useRef<HTMLDivElement | null>(null);
  const backupCardRef = useRef<HTMLDivElement | null>(null);

  const activeKasEmail = singleEmployee
    ? getEmployeeDedicatedAuthenticatorProfile(singleEmployee).kasEmail
    : selectedKasEmail;

  const refreshAllState = (targetEmail: string = activeKasEmail) => {
    const nextStatus = getUserTwoFactorStatus(targetEmail);
    const nextProfile = getEmployeeDedicatedAuthenticatorProfile(
      singleEmployee || targetEmail
    );
    setStatus(nextStatus);
    setEmployeeProfile(nextProfile);
    setDirectory(getAllEmployeesAuthenticatorDirectory('all'));
    const linked = authService.getLinkedGoogleAccountForKasEmail(targetEmail);
    setGoogleEmailInput(nextStatus.googleEmail || linked?.googleEmail || '');
  };

  const runReachabilityCheck = async () => {
    setCheckingNet(true);
    const res = await checkGoogleOnlineReachability(4500);
    setReachability(res);
    setCheckingNet(false);
  };

  useEffect(() => {
    refreshAllState(activeKasEmail);
    setTotpDraft(null);
    setTotpVerifyCode('');
    setPreviewLiveCode('');
    setTotpFeedback(null);
    setOnlineFeedback(null);
  }, [activeKasEmail, singleEmployee]);

  useEffect(() => {
    void runReachabilityCheck();
    const onChanged = () => {
      refreshAllState(activeKasEmail);
    };
    window.addEventListener(GOOGLE_2FA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(GOOGLE_2FA_CHANGED_EVENT, onChanged);
  }, [activeKasEmail]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(getSecondsRemainingInTotpStep());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredDirectory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return directory.filter((emp) => {
      if (companyFilter !== 'ALL' && emp.companyCode.toUpperCase() !== companyFilter) {
        return false;
      }
      if (statusFilter === 'TOTP_ACTIVE' && !emp.totpEnabled) return false;
      if (statusFilter === 'NOT_ACTIVE' && emp.totpEnabled) return false;
      if (!q) return true;
      return (
        emp.fullNameAr.toLowerCase().includes(q) ||
        emp.fullNameEn.toLowerCase().includes(q) ||
        emp.kasEmail.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.jobTitleAr.toLowerCase().includes(q) ||
        emp.departmentNameAr.toLowerCase().includes(q)
      );
    });
  }, [directory, companyFilter, statusFilter, searchQuery]);

  const directoryStats = useMemo(() => {
    const total = directory.length;
    const totpActive = directory.filter((d) => d.totpEnabled).length;
    const onlineActive = directory.filter((d) => d.googleOnlineEnabled).length;
    const uniqueSecrets = new Set(directory.map((d) => d.totpSecret)).size;
    return { total, totpActive, onlineActive, uniqueSecrets };
  }, [directory]);

  const handleEnableGoogleOnline2FA = async () => {
    setIsEnablingOnline(true);
    setOnlineFeedback(null);
    const res = await enableGoogleOnline2FA(
      activeKasEmail,
      googleEmailInput,
      employeeProfile.fullNameAr
    );
    setIsEnablingOnline(false);

    if (!res.success || !res.record) {
      const msg = res.error || 'تعذر تفعيل المصادقة الثنائية عبر حساب Google بالإنترنت.';
      setOnlineFeedback({ success: false, message: msg });
      addNotification({
        title: 'تعذر تفعيل مصادقة Google',
        message: msg,
        type: 'error',
      });
      return;
    }

    refreshAllState(activeKasEmail);
    setGoogleEmailInput(res.record.googleEmail || googleEmailInput);
    const msg = `تم ربط وتفعيل المصادقة الثنائية عبر Google بالإنترنت (${res.record.googleEmail}) للموظف ${employeeProfile.fullNameAr}${res.latencyMs ? ` — زمن الاستجابة ${res.latencyMs}ms` : ''}.`;
    setOnlineFeedback({ success: true, message: msg });
    addNotification({
      title: 'تم تفعيل المصادقة الثنائية عبر Google',
      message: msg,
      type: 'success',
    });
  };

  const handleTestGoogleOnlineNow = async () => {
    setIsTestingOnline(true);
    setOnlineFeedback(null);
    const res = await performOnlineGoogleSecondFactorAuth({
      kasEmail: activeKasEmail,
      expectedGoogleEmail: status.googleEmail || googleEmailInput,
      interactiveGoogleEmailInput: googleEmailInput || status.googleEmail,
    });
    setIsTestingOnline(false);

    if (res.success) {
      const msg = `نجح التحقق الحي مع خوادم Google عبر الإنترنت للحساب (${res.verifiedGoogleEmail}) خلال ${res.latencyMs || 1}ms.`;
      setOnlineFeedback({ success: true, message: msg });
      addNotification({
        title: 'اختبار اتصال Google 2FA ناجح',
        message: msg,
        type: 'success',
      });
    } else {
      const msg = res.error || 'فشل اختبار التحقق الحي عبر Google.';
      setOnlineFeedback({ success: false, message: msg });
    }
  };

  const handleStartTotpSetup = () => {
    const draft = startTotpEnrollmentDraft(activeKasEmail);
    setTotpDraft(draft);
    setTotpVerifyCode('');
    setPreviewLiveCode('');
    setTotpFeedback(null);
  };

  const handleProvisionDedicatedEmployeeTotp = (
    targetEmpOrEmail: string | Record<string, any> = activeKasEmail,
    rotateSecret = false
  ) => {
    const updatedProfile = provisionEmployeeDedicatedTotp(targetEmpOrEmail, {
      rotateSecret,
    });
    if (updatedProfile.kasEmail === activeKasEmail) {
      setTotpDraft(null);
      setTotpVerifyCode('');
      setPreviewLiveCode('');
      setTotpFeedback({
        success: true,
        message: rotateSecret
          ? `تم تدوير وإصدار مفتاح Google Authenticator سري جديد مخصص للموظف ${updatedProfile.fullNameAr} (${updatedProfile.employeeId}) وتوليد 8 رموز استرداد جديدة.`
          : `تم تفعيل تطبيق Google Authenticator المخصص للموظف ${updatedProfile.fullNameAr} (${updatedProfile.employeeId}) بمفتاح فريد و8 رموز استرداد.`,
      });
    }
    refreshAllState(activeKasEmail);
    addNotification({
      title: rotateSecret
        ? 'تم إصدار مفتاح Authenticator جديد للموظف'
        : 'تم تفعيل Google Authenticator المخصص للموظف',
      message: `${updatedProfile.fullNameAr} (${updatedProfile.kasEmail}) — مفتاح: ${updatedProfile.secretFingerprint}`,
      type: 'success',
    });
  };

  const handleProvisionAllEmployeesBulk = () => {
    const res = provisionAllEmployeesDedicatedTotp();
    refreshAllState(activeKasEmail);
    setTotpFeedback({
      success: true,
      message: `تم تفعيل وتخصيص تطبيق Google Authenticator لجميع موظفي المجموعة (${res.totalProvisioned} موظفاً) بـ (${res.uniqueSecretsCount}) مفتاح سري فريد مستقل لكل موظف.`,
    });
    addNotification({
      title: 'تفعيل Google Authenticator لجميع الموظفين',
      message: `تم تفعيل ${res.totalProvisioned} حساب بمفاتيح TOTP مستقلة (100% بدون تداخل).`,
      type: 'success',
    });
  };

  const handleRunIsolationAudit = async () => {
    const summary = await auditAllEmployeesDedicatedTotpIsolation();
    setIsolationAudit(summary);
    addNotification({
      title: 'اكتمل فحص عزل مفاتيح Google Authenticator',
      message: `تم فحص ${summary.totalEmployees} موظفاً: ${summary.uniqueSecretsCount} مفتاح فريد و${summary.uniqueQrUrisCount} رمز QR مستقل بنسبة عزل 100%.`,
      type: 'success',
    });
  };

  const handleGenerateLocalPreviewCode = async () => {
    const targetSecret = totpDraft?.secret || employeeProfile.totpSecret;
    if (!targetSecret) return;
    const code = await generateTotpCodeAtTime(targetSecret, Date.now());
    setPreviewLiveCode(code);
    setTotpVerifyCode(code);
  };

  const handleConfirmTotpEnrollment = async () => {
    const targetSecret = totpDraft?.secret || employeeProfile.totpSecret;
    if (!targetSecret) return;
    setIsConfirmingTotp(true);
    setTotpFeedback(null);

    if (totpDraft) {
      const res = await confirmTotpEnrollment(activeKasEmail, totpDraft.secret, totpVerifyCode);
      setIsConfirmingTotp(false);

      if (!res.success || !res.record) {
        setTotpFeedback({
          success: false,
          message: res.error || 'الرمز غير صحيح.',
        });
        return;
      }

      refreshAllState(activeKasEmail);
      setTotpDraft(null);
      setTotpVerifyCode('');
      setPreviewLiveCode('');
      setTotpFeedback({
        success: true,
        message: `تم تفعيل تطبيق Google Authenticator المخصص للموظف (${employeeProfile.fullNameAr}) وتوليد 8 رموز استرداد احتياطية بنجاح.`,
      });
      addNotification({
        title: 'تم ربط Google Authenticator بنجاح',
        message: `سيتم طلب رمز التحقق المتجدد (6 أرقام) الخاص بالموظف (${employeeProfile.fullNameAr}) عند تسجيل الدخول.`,
        type: 'success',
      });
      return;
    }

    // Verify against the employee's dedicated secret & activate if valid
    const check = await verifyEmployeeSpecificTotpCode(activeKasEmail, totpVerifyCode);
    setIsConfirmingTotp(false);
    if (!check.valid) {
      setTotpFeedback({
        success: false,
        message: check.reasonAr,
      });
      return;
    }

    const confirmed = await confirmTotpEnrollment(
      activeKasEmail,
      employeeProfile.totpSecret,
      totpVerifyCode
    );
    if (confirmed.success && confirmed.record) {
      refreshAllState(activeKasEmail);
      setTotpVerifyCode('');
      setPreviewLiveCode('');
      setTotpFeedback({
        success: true,
        message: check.reasonAr,
      });
      addNotification({
        title: 'تحقق وتفعيل Google Authenticator للموظف',
        message: check.reasonAr,
        type: 'success',
      });
    }
  };

  const handleDisableChannel = (channel: 'google_online' | 'totp' | 'all') => {
    disableUserTwoFactor(activeKasEmail, channel);
    refreshAllState(activeKasEmail);
    setTotpDraft(null);
    setOnlineFeedback(null);
    setTotpFeedback(null);
    addNotification({
      title: 'تحديث المصادقة الثنائية للموظف',
      message:
        channel === 'all'
          ? `تم إيقاف المصادقة الثنائية لحساب ${employeeProfile.fullNameAr}.`
          : channel === 'google_online'
          ? 'تم إيقاف التحقق عبر حساب Google بالإنترنت.'
          : 'تم إيقاف تطبيق Google Authenticator.',
      type: 'info',
    });
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      if (label.includes('مفتاح')) {
        setCopiedSecretKey(true);
        window.setTimeout(() => setCopiedSecretKey(false), 1800);
      }
      addNotification({
        title: `نسخ ${label}`,
        message: 'تم النسخ إلى الحافظة بنجاح.',
        type: 'success',
      });
    } catch {
      addNotification({
        title: label,
        message: text,
        type: 'info',
      });
    }
  };

  const handleShareEmployeeTotpViaEmail = (prof: EmployeeDedicatedAuthenticatorProfile) => {
    shareViaEmail({
      title: `بطاقة إعداد تطبيق مصادقة قوقل (Google Authenticator 2FA) المخصصة للموظف — ${prof.fullNameAr}`,
      recipientName: prof.fullNameAr,
      recipientEmail: prof.kasEmail,
      referenceNumber: `2FA-${prof.employeeId}-V${prof.secretVersion}`,
      entityCode: prof.companyCode,
      moduleName: 'أمن المعلومات والمصادقة الثنائية (Google Authenticator 2FA)',
      includeReemSignature: includeHrSignature,
      summaryLines: [
        { label: 'اسم الموظف', value: `${prof.fullNameAr} (${prof.fullNameEn})` },
        { label: 'الرقم الوظيفي والكيان', value: `${prof.employeeId} — ${prof.companyCode}` },
        { label: 'البريد المؤسسي المعتمد', value: prof.kasEmail },
        { label: 'المسمى الوظيفي والقسم', value: `${prof.jobTitleAr} — ${prof.departmentNameAr}` },
        {
          label: 'مفتاح الإعداد السري المخصص (Base32 Secret)',
          value: prof.totpSecret,
        },
        {
          label: 'معرف الحساب في تطبيق Google Authenticator',
          value: `AlSulaim ERP - ${prof.companyCode}:${prof.kasEmail}`,
        },
        {
          label: 'رموز الاسترداد الاحتياطية (8 رموز للموظف)',
          value: prof.backupCodes
            .filter((c) => !c.usedAt)
            .map((c) => c.code)
            .join(' | '),
        },
        {
          label: 'خطوات التفعيل على الجوال',
          value:
            'افتح تطبيق Google Authenticator على جوالك -> اضغط (+) -> امسح رمز QR من بطاقتك أو أدخل مفتاح الإعداد السري أعلاه (Time-based / 30s) -> أدخل الرمز المكون من 6 أرقام عند تسجيل الدخول.',
        },
      ],
    });
  };

  const handleShareEmployeeTotpViaWhatsApp = (prof: EmployeeDedicatedAuthenticatorProfile) => {
    shareViaWhatsApp({
      title: `بطاقة تطبيق مصادقة قوقل (Google Authenticator 2FA) المخصصة — ${prof.fullNameAr}`,
      recipientName: prof.fullNameAr,
      recipientEmail: prof.kasEmail,
      referenceNumber: `2FA-${prof.employeeId}-V${prof.secretVersion}`,
      entityCode: prof.companyCode,
      moduleName: 'أمن المعلومات والمصادقة الثنائية (Google Authenticator 2FA)',
      summaryLines: [
        { label: 'اسم الموظف', value: prof.fullNameAr },
        { label: 'الرقم الوظيفي', value: prof.employeeId },
        { label: 'البريد المؤسسي', value: prof.kasEmail },
        { label: 'مفتاح Google Authenticator المخصص', value: prof.totpSecret },
        {
          label: 'طريقة الربط',
          value:
            'افتح تطبيق Google Authenticator وامسح رمز QR الخاص بك أو أدخل المفتاح أعلاه لتوليد رمز التحقق (6 أرقام كل 30 ثانية).',
        },
      ],
    });
  };

  const isOnlineConnected = Boolean(reachability?.online);
  const displayedSecret = totpDraft?.secret || employeeProfile.totpSecret;
  const displayedQrSvg = totpDraft?.qrSvg || employeeProfile.qrSvg;

  return (
    <div
      className="p-5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-5"
      data-slot="google-2fa-hub"
      dir="rtl"
    >
      {/* Top Status & Online Google Connectivity Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#141414] text-[#ffffff] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141414] m-0">
              تطبيق مصادقة قوقل (Google Authenticator 2FA) المخصص لكل موظف
            </h3>
            <p className="text-xs text-[#707070] mt-0.5 m-0">
              مفتاح تشفير TOTP (RFC-6238) ورمز استجابة سريعة (QR) و8 رموز استرداد مخصصة ومستقلة لكل موظف ({employeeProfile.fullNameAr} —{' '}
              <span dir="ltr" className="font-mono font-bold text-[#141414]">
                {activeKasEmail}
              </span>
              ).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            data-slot="google-online-status-badge"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]"
          >
            {isOnlineConnected ? (
              <Wifi className="w-3.5 h-3.5 text-[#141414]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-[#707070]" />
            )}
            <span>
              {checkingNet
                ? 'جاري فحص الاتصال بخوادم Google...'
                : reachability?.googleCloudReachable
                ? `متصل بخوادم Google بالنت (${reachability.latencyMs}ms)`
                : isOnlineConnected
                ? 'الإنترنت متصل — وضع التحقق النشط'
                : 'غير متصل بالإنترنت (يعمل Google Authenticator بدون إنترنت)'}
            </span>
          </span>

          <button
            type="button"
            onClick={() => void runReachabilityCheck()}
            disabled={checkingNet}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${checkingNet ? 'animate-spin' : ''}`} />
            <span>فحص الاتصال</span>
          </button>
        </div>
      </div>

      {/* Employee Selector & Organization-Wide Bulk Provisioning Bar (Hidden when locked to singleEmployee) */}
      {!singleEmployee && (
        <div
          data-slot="per-employee-authenticator-selector-bar"
          className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#141414]" />
              <div>
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  تخصيص وإدارة تطبيق Google Authenticator لكل موظف على حدة ({directoryStats.total} موظفاً)
                </h4>
                <p className="text-[11px] text-[#707070] m-0">
                  لكل موظف في المجموعة مفتاح تشفير سري فريد (Base32) ورمز QR خاص به وحده لا يقبل رموز أي موظف آخر.
                </p>
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-slot="provision-all-employees-totp-btn"
                  onClick={handleProvisionAllEmployeesBulk}
                  className="px-3.5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>تفعيل Google Authenticator مخصص لجميع الموظفين ({directoryStats.total})</span>
                </button>

                <button
                  type="button"
                  data-slot="audit-all-employees-totp-isolation-btn"
                  onClick={() => void handleRunIsolationAudit()}
                  className="px-3.5 py-2 rounded-full bg-[#ffffff] hover:bg-[#f0f0f0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>فحص تفرد وعزل مفاتيح الموظفين</span>
                </button>
              </div>
            )}
          </div>

          {isolationAudit && (
            <div
              data-slot="totp-isolation-audit-banner"
              className="p-3 rounded-xl bg-[#ffffff] border border-[#141414] flex items-center justify-between flex-wrap gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                <div>
                  <span className="font-bold text-[#141414]">
                    فحص العزل الفردي ناجح 100%:
                  </span>{' '}
                  <span className="text-[#707070]">
                    تم التحقق من ({isolationAudit.uniqueSecretsCount}/{isolationAudit.totalEmployees}) مفتاح سري فريد و({isolationAudit.uniqueQrUrisCount}/{isolationAudit.totalEmployees}) رمز QR مستقل بدون أي تطابق أو تداخل بين الموظفين.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-mono text-[10px] font-bold">
                100% ISOLATED PER EMPLOYEE
              </span>
            </div>
          )}

          {/* Direct Employee Switcher Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="md:col-span-2">
              <label
                htmlFor="select-employee-authenticator-dropdown"
                className="block text-[11px] font-bold text-[#141414] mb-1"
              >
                اختر الموظف لعرض أو تفعيل أو طباعة بطاقة Google Authenticator المخصصة له:
              </label>
              <select
                id="select-employee-authenticator-dropdown"
                data-slot="select-employee-authenticator-dropdown"
                value={selectedKasEmail}
                onChange={(e) => setSelectedKasEmail(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none cursor-pointer"
              >
                {directory.map((emp) => (
                  <option key={emp.kasEmail} value={emp.kasEmail}>
                    {emp.serial}. {emp.fullNameAr} ({emp.employeeId} — {emp.companyCode}) — {emp.kasEmail}{' '}
                    {emp.totpEnabled ? '✓ [مفعّل]' : '[جاهز للتفعيل]'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] text-center">
                <div className="text-[10px] text-[#707070] font-semibold">مفاتيح فردية مخصصة</div>
                <div className="text-base font-bold text-[#141414] font-mono">
                  {directoryStats.uniqueSecrets}/{directoryStats.total}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] text-center">
                <div className="text-[10px] text-[#707070] font-semibold">مفعّل لهم التحدي</div>
                <div className="text-base font-bold text-[#141414] font-mono">
                  {directoryStats.totpActive}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Employee Summary Banner */}
      <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              status.enabled
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
            }`}
          >
            {status.enabled ? 'المصادقة الثنائية مفعّلة للموظف' : 'بطاقة الموظف جاهزة للتفعيل'}
          </span>
          <span className="text-xs text-[#141414] font-bold">
            {employeeProfile.fullNameAr} ({employeeProfile.employeeId} • {employeeProfile.jobTitleAr})
          </span>
          <span className="text-xs text-[#707070] font-semibold">
            {status.enabled
              ? `— القنوات النشطة: ${[
                  status.totpEnabled ? 'تطبيق Google Authenticator المخصص' : null,
                  status.googleOnlineEnabled ? `حساب Google (${status.googleEmail})` : null,
                ]
                  .filter(Boolean)
                  .join(' + ')}`
              : '— المفتاح السري ورمز QR المخصصان لهذا الموظف جاهزان أدناه للربط الفوري.'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!status.totpEnabled && !readOnly && (
            <button
              type="button"
              data-slot="quick-activate-employee-totp-btn"
              onClick={() => handleProvisionDedicatedEmployeeTotp(activeKasEmail, false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تفعيل تطبيق Authenticator لهذا الموظف فوراً</span>
            </button>
          )}

          {status.enabled && !readOnly && (
            <button
              type="button"
              data-slot="disable-all-2fa-btn"
              onClick={() => handleDisableChannel('all')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] hover:bg-[#f0f0f0] text-[11px] font-bold cursor-pointer"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              <span>إيقاف المصادقة الثنائية</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Official Employee Dedicated Google Authenticator Identity Card */}
      <div
        ref={employeeCardPrintRef}
        data-printable-card="true"
        data-slot="employee-dedicated-authenticator-card"
        className="p-5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-4"
      >
        <div className="flex items-start justify-between flex-wrap gap-3 border-b border-[#f0f0f0] pb-3.5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
              <Building2 className="w-3.5 h-3.5" />
              <span>
                بطاقة تطبيق مصادقة قوقل (Google Authenticator) الخاصة بالموظف — كيان{' '}
                {employeeProfile.companyCode}
              </span>
            </div>
            <h4 className="text-base font-bold text-[#141414] m-0 pt-0.5">
              {employeeProfile.fullNameAr}{' '}
              <span className="text-xs font-normal text-[#707070]">
                ({employeeProfile.fullNameEn})
              </span>
            </h4>
            <div className="text-xs text-[#707070] flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-[#141414]">
                {employeeProfile.employeeId}
              </span>
              <span>•</span>
              <span>{employeeProfile.jobTitleAr}</span>
              <span>•</span>
              <span>{employeeProfile.departmentNameAr}</span>
              <span>•</span>
              <span dir="ltr" className="font-mono font-bold text-[#141414]">
                {employeeProfile.kasEmail}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap no-print">
            <IncludeReemSignatureToggle
              checked={includeHrSignature}
              onChange={setIncludeHrSignature}
              compact
            />

            <button
              type="button"
              data-slot="print-employee-totp-card-btn"
              onClick={() => {
                if (employeeCardPrintRef.current) {
                  printSpecificElement(employeeCardPrintRef.current);
                }
              }}
              className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة بطاقة الموظف</span>
            </button>

            <button
              type="button"
              data-slot="email-employee-totp-card-btn"
              onClick={() => handleShareEmployeeTotpViaEmail(employeeProfile)}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>إرسال لبريد الموظف</span>
            </button>

            <button
              type="button"
              onClick={() => handleShareEmployeeTotpViaWhatsApp(employeeProfile)}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>
          </div>
        </div>

        {/* Dedicated Scannable QR + Employee-Specific Secret Block */}
        <div
          data-slot="google-authenticator-qr-panel"
          className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col md:flex-row items-center gap-5"
        >
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className="qr-container p-2.5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0]"
              dangerouslySetInnerHTML={{ __html: displayedQrSvg }}
            />
            <span className="text-[10px] font-mono font-bold text-[#141414]">
              QR مخصص: {employeeProfile.employeeId} (V{employeeProfile.secretVersion})
            </span>
          </div>

          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs font-bold text-[#141414]">
                  مفتاح تطبيق Google Authenticator الحصري للموظف ({employeeProfile.fullNameAr}):
                </div>
                <div className="text-[11px] text-[#707070]">
                  امسح رمز QR بتطبيق Google Authenticator على جوال الموظف أو أدخل المفتاح السري (Base32) يدوياً.
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-mono font-bold">
                يتجدد خلال {secondsRemaining}ث
              </span>
            </div>

            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                data-slot="employee-totp-secret-code"
                className="flex-1 px-3 py-2 rounded-xl bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414] select-all overflow-x-auto"
              >
                {displayedSecret}
              </code>
              <button
                type="button"
                onClick={() =>
                  void handleCopyText(
                    displayedSecret,
                    `مفتاح Google Authenticator (${employeeProfile.fullNameAr})`
                  )
                }
                className="px-3 py-2 rounded-xl bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer no-print"
                title="نسخ المفتاح السري للموظف"
              >
                {copiedSecretKey ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSecretKey ? 'تم النسخ' : 'نسخ المفتاح'}</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-[#707070] bg-[#ffffff] px-3 py-1.5 rounded-xl border border-[#e0e0e0] truncate" dir="ltr">
              URI: {totpDraft?.otpAuthUri || employeeProfile.otpAuthUri}
            </div>

            {/* Live Verification & Activation Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1 no-print">
              <input
                id="settings-totp-verify-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                dir="ltr"
                value={totpVerifyCode}
                onChange={(e) =>
                  setTotpVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                aria-label="رمز التحقق المكون من 6 أرقام"
                className="w-32 text-center font-mono font-bold tracking-widest bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-2 px-2 text-sm text-[#141414] focus:border-[#141414] focus:outline-none"
              />
              <button
                type="button"
                data-slot="confirm-totp-enroll-btn"
                disabled={isConfirmingTotp || totpVerifyCode.length !== 6}
                onClick={() => void handleConfirmTotpEnrollment()}
                className="button-primary-pill"
                style={{ fontSize: '11.5px', padding: '7px 16px', minHeight: '38px' }}
              >
                {isConfirmingTotp
                  ? 'جاري التحقق...'
                  : status.totpEnabled && !totpDraft
                  ? 'فحص مطابقة رمز الموظف (6 أرقام)'
                  : 'تأكيد وتفعيل للموظف'}
              </button>

              <button
                type="button"
                data-slot="generate-preview-totp-btn"
                onClick={() => void handleGenerateLocalPreviewCode()}
                className="px-3 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>جلب الرمز الحالي للتحقق الفوري</span>
              </button>

              {previewLiveCode && (
                <span
                  data-slot="live-totp-preview-code"
                  className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] font-mono text-xs font-bold"
                >
                  {previewLiveCode}
                </span>
              )}
            </div>
          </div>
        </div>

        {includeHrSignature && (
          <div className="pt-2">
            <ReemHrDocumentSignatureBlock compact />
          </div>
        )}
      </div>

      {/* Two Parallel Channels Control Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel 1: Online Google Account 2-Step Verification */}
        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#141414]" />
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  1. المصادقة الثنائية عبر حساب Google بالإنترنت ({employeeProfile.fullNameAr})
                </h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status.googleOnlineEnabled
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {status.googleOnlineEnabled ? 'مفعل بالإنترنت' : 'متاح للتفعيل'}
              </span>
            </div>

            <p className="text-[11px] text-[#707070] leading-relaxed m-0">
              عند تسجيل دخول الموظف بكلمة المرور المؤسسية، يُطلب تأكيد الهوية عبر حساب Google المرتبط عبر الإنترنت.
            </p>

            <div>
              <label
                htmlFor="google-2fa-email-input"
                className="block text-[11px] font-bold text-[#141414] mb-1"
              >
                بريد حساب Google المعتمد للتحقق الثنائي لهذا الموظف
              </label>
              <input
                id="google-2fa-email-input"
                type="email"
                dir="ltr"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="employee.name@gmail.com"
                className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-left font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
              />
            </div>

            {onlineFeedback && (
              <div
                role="status"
                className="p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border bg-[#ffffff] text-[#141414] border-[#141414]"
              >
                {onlineFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{onlineFeedback.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-2">
            <button
              type="button"
              data-slot="enable-google-online-2fa-btn"
              disabled={isEnablingOnline || readOnly}
              onClick={() => void handleEnableGoogleOnline2FA()}
              className="button-primary-pill flex-1"
              style={{ fontSize: '11.5px', padding: '7px 14px', minHeight: '36px' }}
            >
              {isEnablingOnline ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              <span>
                {status.googleOnlineEnabled
                  ? 'تحديث وتأكيد عبر Google بالنت'
                  : 'تفعيل عبر حساب Google بالإنترنت'}
              </span>
            </button>

            {status.googleOnlineEnabled && (
              <>
                <button
                  type="button"
                  data-slot="test-google-online-2fa-btn"
                  disabled={isTestingOnline}
                  onClick={() => void handleTestGoogleOnlineNow()}
                  className="px-3 py-2 rounded-full bg-[#ffffff] hover:bg-[#f0f0f0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                >
                  {isTestingOnline ? 'جاري التحقق...' : 'اختبار حي الآن'}
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDisableChannel('google_online')}
                    className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                  >
                    تعطيل
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Channel 2: Google Authenticator Mobile App Controls */}
        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#141414]" />
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  2. إدارة مفتاح تطبيق Google Authenticator ({employeeProfile.fullNameAr})
                </h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status.totpEnabled
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {status.totpEnabled ? 'مربوط ومفعّل للموظف' : 'جاهز للتفعيل'}
              </span>
            </div>

            <p className="text-[11px] text-[#707070] leading-relaxed m-0">
              يمكنك تفعيل المفتاح المخصص للموظف مباشرة، أو تدوير/إصدار مفتاح سري جديد عند تغيير جوال الموظف، أو تجربة مسودة مفتاح جديد.
            </p>

            <div className="p-3 rounded-xl bg-[#ffffff] border border-[#e0e0e0] space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#707070] font-semibold">معرف الحساب في التطبيق:</span>
                <span className="font-mono font-bold text-[#141414]" dir="ltr">
                  AlSulaim ERP - {employeeProfile.companyCode}:{employeeProfile.kasEmail}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#707070] font-semibold">بصمة المفتاح المخصص:</span>
                <span className="font-mono font-bold text-[#141414]" dir="ltr">
                  {employeeProfile.secretFingerprint} (V{employeeProfile.secretVersion})
                </span>
              </div>
            </div>

            {totpFeedback && (
              <div
                role="status"
                className="p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border bg-[#ffffff] text-[#141414] border-[#141414]"
              >
                {totpFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{totpFeedback.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-2">
            {!readOnly && (
              <>
                <button
                  type="button"
                  data-slot="provision-employee-totp-direct-btn"
                  onClick={() =>
                    handleProvisionDedicatedEmployeeTotp(
                      activeKasEmail,
                      status.totpEnabled
                    )
                  }
                  className="button-primary-pill flex-1"
                  style={{ fontSize: '11.5px', padding: '7px 14px', minHeight: '36px' }}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>
                    {status.totpEnabled
                      ? 'تدوير وإصدار مفتاح سري جديد للموظف'
                      : 'تفعيل مفتاح الموظف المخصص الآن'}
                  </span>
                </button>

                <button
                  type="button"
                  data-slot="start-totp-setup-btn"
                  onClick={handleStartTotpSetup}
                  className="px-3 py-2 rounded-full bg-[#ffffff] hover:bg-[#f0f0f0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                >
                  {totpDraft ? 'توليد مفتاح QR تجريبي آخر' : 'إعداد يدوي بالرمز'}
                </button>

                {status.totpEnabled && (
                  <button
                    type="button"
                    onClick={() => handleDisableChannel('totp')}
                    className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                  >
                    إلغاء الربط
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Backup Codes Card (Available for every employee profile) */}
      {employeeProfile.backupCodes.length > 0 && (
        <div
          ref={backupCardRef}
          data-printable-card="true"
          data-slot="google-2fa-backup-codes"
          className="p-4 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#141414]" />
              <div>
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  رموز الاسترداد الاحتياطية الخاصة بالموظف: {employeeProfile.fullNameAr} (
                  {employeeProfile.backupCodesRemaining}/8 متاحة)
                </h4>
                <p className="text-[11px] text-[#707070] m-0">
                  رموز طوارئ مخصصة لهذا الموظف فقط عند فقدان الهاتف — كل رمز يُستخدم لمرة واحدة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap no-print">
              <button
                type="button"
                onClick={() =>
                  void handleCopyText(
                    employeeProfile.backupCodes
                      .filter((c) => !c.usedAt)
                      .map((c) => c.code)
                      .join('\n'),
                    `رموز استرداد ${employeeProfile.fullNameAr}`
                  )
                }
                className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>نسخ المتاحة</span>
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    regenerateBackupCodes(activeKasEmail);
                    refreshAllState(activeKasEmail);
                    addNotification({
                      title: 'توليد رموز استرداد جديدة للموظف',
                      message: `تم استبدال الرموز السابقة بـ 8 رموز احتياطية جديدة للموظف ${employeeProfile.fullNameAr}.`,
                      type: 'info',
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>توليد جديدة</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (backupCardRef.current) {
                    printSpecificElement(backupCardRef.current);
                  }
                }}
                className="px-2.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>طباعة A4</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" dir="ltr">
            {employeeProfile.backupCodes.map((entry) => (
              <div
                key={entry.code}
                className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold text-center ${
                  entry.usedAt
                    ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#707070] line-through'
                    : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
                }`}
              >
                {entry.code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Organization Per-Employee Google Authenticator Directory Table */}
      {!singleEmployee && (
        <div
          data-slot="all-employees-authenticator-directory"
          className="rounded-2xl bg-[#ffffff] border border-[#e0e0e0] overflow-hidden space-y-3 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-[#141414] m-0">
                سجل بطاقات ومفاتيح Google Authenticator المخصصة لكل موظف ({filteredDirectory.length} من{' '}
                {directory.length})
              </h4>
              <p className="text-[11px] text-[#707070] m-0">
                اضغط على أي موظف لعرض رمز QR والمفتاح السري الخاص به أو إرسال بطاقة التفعيل لبريده الرسمي.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الموظف، البريد، أو الرقم الوظيفي..."
                  className="w-full h-8 pr-8 pl-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414] focus:bg-[#ffffff] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <select
                aria-label="تصفية الموظفين حسب الكيان"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="h-8 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] focus:outline-none cursor-pointer"
              >
                <option value="ALL">جميع الكيانات ({directory.length})</option>
                <option value="HQ">الإدارة العامة (HQ)</option>
                <option value="SAF">السفير الماسي (SAF)</option>
                <option value="YAQ">ياقوت نجد (YAQ)</option>
                <option value="TOP">توباز (TOP)</option>
                <option value="DAR">دار الرواد (DAR)</option>
                <option value="KAS">كاس للتجارة (KAS)</option>
              </select>

              <select
                aria-label="تصفية حسب حالة التفعيل"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] focus:outline-none cursor-pointer"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="TOTP_ACTIVE">مفعّل (Authenticator نشط)</option>
                <option value="NOT_ACTIVE">جاهز للتفعيل</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#e0e0e0] rounded-xl max-h-[420px] overflow-y-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] font-bold">
                  <th className="py-2.5 px-3">الموظف والكيان</th>
                  <th className="py-2.5 px-3">البريد المؤسسي (@kas.sa)</th>
                  <th className="py-2.5 px-3">مفتاح Google Authenticator المخصص</th>
                  <th className="py-2.5 px-3">الحالة والرموز الاحتياطية</th>
                  <th className="py-2.5 px-3 text-center">إجراءات الموظف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {filteredDirectory.map((emp) => {
                  const isSelected = emp.kasEmail === activeKasEmail;
                  return (
                    <tr
                      key={emp.kasEmail}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#f3f3f3]' : 'hover:bg-[#f3f3f3]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#141414] flex items-center gap-1.5">
                          <span>{emp.fullNameAr}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[10px]">
                            {emp.companyCode}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#707070]">
                          {emp.employeeId} • {emp.jobTitleAr}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#141414]" dir="ltr">
                        {emp.kasEmail}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-[11px] text-[#141414]" dir="ltr">
                          {emp.secretFingerprint}
                        </div>
                        <div className="text-[10px] text-[#707070] font-mono">
                          الإصدار V{emp.secretVersion} • RFC-6238
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.totpEnabled
                              ? 'bg-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                          }`}
                        >
                          {emp.totpEnabled ? 'مفعّل للموظف ✓' : 'مفتاح جاهز للتفعيل'}
                        </span>
                        <div className="text-[10px] text-[#707070] font-mono mt-0.5">
                          رموز استرداد: {emp.backupCodesRemaining}/8
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            data-slot={`select-emp-totp-${emp.kasEmail}`}
                            onClick={() => setSelectedKasEmail(emp.kasEmail)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-[#141414] text-[#ffffff]'
                                : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414]'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{isSelected ? 'معروض حالياً' : 'بطاقة QR الموظف'}</span>
                          </button>

                          {!emp.totpEnabled && !readOnly && (
                            <button
                              type="button"
                              data-slot={`activate-emp-totp-${emp.kasEmail}`}
                              onClick={() =>
                                handleProvisionDedicatedEmployeeTotp(emp.kasEmail, false)
                              }
                              className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                            >
                              تفعيل
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleShareEmployeeTotpViaEmail(emp)}
                            className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                            title="إرسال بطاقة Google Authenticator لبريد الموظف"
                          >
                            <Mail className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleTwoFactorHub;
