import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { authService } from '../../services/authService';
import { printSpecificElement } from '../../utils/printManager';
import {
  GOOGLE_2FA_CHANGED_EVENT,
  GoogleOnlineReachabilityResult,
  UserGoogleTwoFactorRecord,
  checkGoogleOnlineReachability,
  confirmTotpEnrollment,
  disableUserTwoFactor,
  enableGoogleOnline2FA,
  generateTotpCodeAtTime,
  getSecondsRemainingInTotpStep,
  getUserTwoFactorStatus,
  performOnlineGoogleSecondFactorAuth,
  regenerateBackupCodes,
  startTotpEnrollmentDraft,
} from '../../services/googleTwoFactorService';

export const GoogleTwoFactorHub: React.FC = () => {
  const { addNotification } = useAppStore();
  const currentUser = authService.getCurrentUser();
  const activeKasEmail = (currentUser?.email || 'khalid@kas.sa').trim().toLowerCase();

  const [status, setStatus] = useState<UserGoogleTwoFactorRecord>(() =>
    getUserTwoFactorStatus(activeKasEmail)
  );
  const [reachability, setReachability] = useState<GoogleOnlineReachabilityResult | null>(null);
  const [checkingNet, setCheckingNet] = useState<boolean>(false);

  // Google Online 2-Step Binding State
  const [googleEmailInput, setGoogleEmailInput] = useState<string>(() => {
    const existing = getUserTwoFactorStatus(activeKasEmail);
    const linked = authService.getLinkedGoogleAccountForKasEmail(activeKasEmail);
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

  const backupCardRef = useRef<HTMLDivElement | null>(null);

  const runReachabilityCheck = async () => {
    setCheckingNet(true);
    const res = await checkGoogleOnlineReachability(4500);
    setReachability(res);
    setCheckingNet(false);
  };

  useEffect(() => {
    setStatus(getUserTwoFactorStatus(activeKasEmail));
    void runReachabilityCheck();

    const onChanged = () => {
      setStatus(getUserTwoFactorStatus(activeKasEmail));
    };
    window.addEventListener(GOOGLE_2FA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(GOOGLE_2FA_CHANGED_EVENT, onChanged);
  }, [activeKasEmail]);

  useEffect(() => {
    if (!totpDraft && !status.totpEnabled) return;
    const timer = setInterval(() => {
      setSecondsRemaining(getSecondsRemainingInTotpStep());
    }, 1000);
    return () => clearInterval(timer);
  }, [totpDraft, status.totpEnabled]);

  const handleEnableGoogleOnline2FA = async () => {
    setIsEnablingOnline(true);
    setOnlineFeedback(null);
    const res = await enableGoogleOnline2FA(
      activeKasEmail,
      googleEmailInput,
      currentUser?.full_name
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

    setStatus(res.record);
    setGoogleEmailInput(res.record.googleEmail || googleEmailInput);
    const msg = `تم ربط وتفعيل المصادقة الثنائية عبر Google بالإنترنت (${res.record.googleEmail})${res.latencyMs ? ` — زمن الاستجابة ${res.latencyMs}ms` : ''}.`;
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

  const handleGenerateLocalPreviewCode = async () => {
    const targetSecret = totpDraft?.secret || status.totpSecret;
    if (!targetSecret) return;
    const code = await generateTotpCodeAtTime(targetSecret, Date.now());
    setPreviewLiveCode(code);
    setTotpVerifyCode(code);
  };

  const handleConfirmTotpEnrollment = async () => {
    if (!totpDraft) return;
    setIsConfirmingTotp(true);
    setTotpFeedback(null);
    const res = await confirmTotpEnrollment(activeKasEmail, totpDraft.secret, totpVerifyCode);
    setIsConfirmingTotp(false);

    if (!res.success || !res.record) {
      setTotpFeedback({
        success: false,
        message: res.error || 'الرمز غير صحيح.',
      });
      return;
    }

    setStatus(res.record);
    setTotpDraft(null);
    setTotpVerifyCode('');
    setPreviewLiveCode('');
    setTotpFeedback({
      success: true,
      message: 'تم تفعيل تطبيق Google Authenticator وتوليد 8 رموز استرداد احتياطية بنجاح.',
    });
    addNotification({
      title: 'تم ربط Google Authenticator بنجاح',
      message: 'سيتم طلب رمز التحقق المتجدد (6 أرقام) عند تسجيل الدخول.',
      type: 'success',
    });
  };

  const handleDisableChannel = (channel: 'google_online' | 'totp' | 'all') => {
    const updated = disableUserTwoFactor(activeKasEmail, channel);
    setStatus(updated);
    setTotpDraft(null);
    setOnlineFeedback(null);
    setTotpFeedback(null);
    addNotification({
      title: 'تحديث المصادقة الثنائية',
      message:
        channel === 'all'
          ? 'تم إيقاف المصادقة الثنائية للحساب.'
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

  const isOnlineConnected = Boolean(reachability?.online);

  return (
    <div
      className="p-5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-5"
      data-slot="google-2fa-hub"
    >
      {/* Top Status & Online Google Connectivity Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#e0e0e0] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" data-force-colored="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141414] m-0">
              المصادقة الثنائية عبر Google بالإنترنت وتطبيق Google Authenticator
            </h3>
            <p className="text-xs text-[#707070] mt-0.5 m-0">
              حماية الحساب المؤسسي (<span dir="ltr" className="font-mono">{activeKasEmail}</span>) بخطوة تحقق ثانية حية عبر خوادم Google.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            data-slot="google-online-status-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
              isOnlineConnected
                ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                : 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]'
            }`}
          >
            {isOnlineConnected ? (
              <Wifi className="w-3.5 h-3.5" data-force-colored="true" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" data-force-colored="true" />
            )}
            <span>
              {checkingNet
                ? 'جاري فحص الاتصال بخوادم Google...'
                : reachability?.googleCloudReachable
                ? `متصل بخوادم Google بالنت (${reachability.latencyMs}ms)`
                : isOnlineConnected
                ? 'الإنترنت متصل — وضع التحقق النشط'
                : 'غير متصل بالإنترنت (Offline)'}
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

      {/* Summary Banner when Active */}
      <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              status.enabled
                ? 'bg-[#047857] text-white'
                : 'bg-[#e5e7eb] text-[#374151]'
            }`}
          >
            {status.enabled ? 'المصادقة الثنائية مفعّلة' : 'غير مفعّلة بعد'}
          </span>
          <span className="text-xs text-[#141414] font-semibold">
            {status.enabled
              ? `القنوات النشطة: ${[
                  status.googleOnlineEnabled ? `حساب Google (${status.googleEmail})` : null,
                  status.totpEnabled ? 'تطبيق Google Authenticator' : null,
                ]
                  .filter(Boolean)
                  .join(' + ')}`
              : 'اختر إحدى القناتين أدناه لتأمين دخولك بخطوتين عبر Google.'}
          </span>
        </div>

        {status.enabled && (
          <button
            type="button"
            data-slot="disable-all-2fa-btn"
            onClick={() => handleDisableChannel('all')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#be123c] hover:bg-[#fff1f2] text-[11px] font-bold cursor-pointer"
          >
            <ShieldOff className="w-3.5 h-3.5" />
            <span>إيقاف المصادقة الثنائية</span>
          </button>
        )}
      </div>

      {/* Two Parallel Channels: Online Google Account + Google Authenticator App */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel 1: Online Google Account 2-Step Verification */}
        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0284c7]" />
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  1. المصادقة الثنائية عبر حساب Google بالإنترنت
                </h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status.googleOnlineEnabled
                    ? 'bg-[#047857] text-white'
                    : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {status.googleOnlineEnabled ? 'مفعل بالإنترنت' : 'متاح للتفعيل'}
              </span>
            </div>

            <p className="text-[11px] text-[#707070] leading-relaxed m-0">
              عند تسجيل الدخول بكلمة المرور المؤسسية، يُطلب تأكيد الهوية عبر حساب Google المرتبط عبر الإنترنت (OAuth / Google Verification).
            </p>

            <div>
              <label
                htmlFor="google-2fa-email-input"
                className="block text-[11px] font-bold text-[#141414] mb-1"
              >
                بريد حساب Google المعتمد للتحقق الثنائي
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
                className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
                  onlineFeedback.success
                    ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                    : 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]'
                }`}
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
              disabled={isEnablingOnline}
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
                  className="px-3 py-2 rounded-full bg-[#ffffff] hover:bg-[#fafafa] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                >
                  {isTestingOnline ? 'جاري التحقق...' : 'اختبار حي الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDisableChannel('google_online')}
                  className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#be123c] text-[11px] font-bold cursor-pointer"
                >
                  تعطيل
                </button>
              </>
            )}
          </div>
        </div>

        {/* Channel 2: Google Authenticator Mobile App (QR + RFC-6238 TOTP) */}
        <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#059669]" />
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  2. تطبيق Google Authenticator (رمز متجدد 6 أرقام)
                </h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status.totpEnabled
                    ? 'bg-[#047857] text-white'
                    : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
                }`}
              >
                {status.totpEnabled ? 'مربوط ومفعّل' : 'متاح للإعداد'}
              </span>
            </div>

            <p className="text-[11px] text-[#707070] leading-relaxed m-0">
              امسح رمز الاستجابة السريعة (QR) بتطبيق Google Authenticator على جوالك لتوليد رمز أمان كل 30 ثانية (RFC-6238).
            </p>

            {totpDraft && (
              <div
                data-slot="google-authenticator-qr-panel"
                className="p-3.5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div
                    className="qr-container p-2 rounded-xl bg-white border border-[#e0e0e0] shrink-0"
                    dangerouslySetInnerHTML={{ __html: totpDraft.qrSvg }}
                  />
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#141414]">
                        مفتاح الإعداد اليدوي (Base32 Secret):
                      </span>
                      <span className="text-[10px] font-mono text-[#047857] font-bold">
                        يتجدد خلال {secondsRemaining}ث
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code
                        dir="ltr"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-mono text-[#141414] truncate"
                      >
                        {totpDraft.secret}
                      </code>
                      <button
                        type="button"
                        onClick={() => void handleCopyText(totpDraft.secret, 'مفتاح Google Authenticator')}
                        className="p-1.5 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                        title="نسخ المفتاح السري"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="settings-totp-verify-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        dir="ltr"
                        value={totpVerifyCode}
                        onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-32 text-center font-mono font-bold tracking-widest bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-2 text-sm text-[#141414] focus:border-[#141414] focus:outline-none"
                      />
                      <button
                        type="button"
                        data-slot="confirm-totp-enroll-btn"
                        disabled={isConfirmingTotp || totpVerifyCode.length !== 6}
                        onClick={() => void handleConfirmTotpEnrollment()}
                        className="button-primary-pill flex-1"
                        style={{ fontSize: '11px', padding: '6px 12px', minHeight: '36px' }}
                      >
                        {isConfirmingTotp ? 'جاري التحقق...' : 'تأكيد وتفعيل'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        data-slot="generate-preview-totp-btn"
                        onClick={() => void handleGenerateLocalPreviewCode()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>جلب الرمز الحالي للتحقق الفوري</span>
                      </button>
                      {previewLiveCode && (
                        <span className="font-mono text-xs font-bold text-[#047857]">
                          {previewLiveCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {totpFeedback && (
              <div
                role="status"
                className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 border ${
                  totpFeedback.success
                    ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                    : 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]'
                }`}
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
            <button
              type="button"
              data-slot="start-totp-setup-btn"
              onClick={handleStartTotpSetup}
              className="button-primary-pill flex-1"
              style={{ fontSize: '11.5px', padding: '7px 14px', minHeight: '36px' }}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>
                {totpDraft
                  ? 'توليد مفتاح QR جديد'
                  : status.totpEnabled
                  ? 'إعادة ربط Google Authenticator'
                  : 'إعداد Google Authenticator (QR)'}
              </span>
            </button>

            {status.totpEnabled && (
              <button
                type="button"
                onClick={() => handleDisableChannel('totp')}
                className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#be123c] text-[11px] font-bold cursor-pointer"
              >
                إلغاء الربط
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Backup Codes Card (Printable on clean A4) */}
      {status.enabled && status.backupCodes.length > 0 && (
        <div
          ref={backupCardRef}
          data-printable-card="true"
          data-slot="google-2fa-backup-codes"
          className="p-4 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#b45309]" />
              <div>
                <h4 className="text-xs font-bold text-[#141414] m-0">
                  رموز الاسترداد الاحتياطية للمصادقة الثنائية (Single-Use Backup Codes)
                </h4>
                <p className="text-[11px] text-[#707070] m-0">
                  استخدم أي رمز عند فقدان الهاتف أو انقطاع الشبكة — كل رمز يُستخدم لمرة واحدة فقط.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap no-print">
              <button
                type="button"
                onClick={() =>
                  void handleCopyText(
                    status.backupCodes
                      .filter((c) => !c.usedAt)
                      .map((c) => c.code)
                      .join('\n'),
                    'رموز الاسترداد'
                  )
                }
                className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>نسخ المتاحة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  regenerateBackupCodes(activeKasEmail);
                  setStatus(getUserTwoFactorStatus(activeKasEmail));
                  addNotification({
                    title: 'توليد رموز استرداد جديدة',
                    message: 'تم استبدال الرموز السابقة بـ 8 رموز احتياطية جديدة.',
                    type: 'info',
                  });
                }}
                className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>توليد جديدة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (backupCardRef.current) {
                    printSpecificElement(backupCardRef.current);
                  }
                }}
                className="px-2.5 py-1.5 rounded-full bg-[#141414] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>طباعة A4</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" dir="ltr">
            {status.backupCodes.map((entry) => (
              <div
                key={entry.code}
                className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold text-center ${
                  entry.usedAt
                    ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#9ca3af] line-through'
                    : 'bg-[#fafafa] border-[#d4d4d4] text-[#141414]'
                }`}
              >
                {entry.code}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleTwoFactorHub;
