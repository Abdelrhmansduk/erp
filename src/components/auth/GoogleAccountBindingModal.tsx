import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ShieldCheck, X, Sparkles, Loader2, Mail } from 'lucide-react';
import {
  authService,
  COMPANY_AUTH_METADATA,
  type UserProfile,
  type ApprovedGoogleAccountBinding,
} from '../../services/authService';
import { isFirebaseConfigured, signInWithGoogleFirebase } from '../../services/firebaseClient';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';

interface GoogleAccountBindingModalProps {
  user: UserProfile;
  existingBinding?: ApprovedGoogleAccountBinding | null;
  onApproved: (binding: ApprovedGoogleAccountBinding) => void;
  onRemindLater: () => void;
}

export const GoogleAccountBindingModal: React.FC<GoogleAccountBindingModalProps> = ({
  user,
  existingBinding,
  onApproved,
  onRemindLater,
}) => {
  const [googleEmail, setGoogleEmail] = useState<string>(existingBinding?.googleEmail || '');
  const [googleEmailConfirm, setGoogleEmailConfirm] = useState<string>(
    existingBinding?.googleEmail || ''
  );
  const [googleDisplayName, setGoogleDisplayName] = useState<string>(
    existingBinding?.googleDisplayName || user.full_name || ''
  );
  const [confirmedOwnership, setConfirmedOwnership] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [approvedBinding, setApprovedBinding] = useState<ApprovedGoogleAccountBinding | null>(null);

  const compKey = (user.company_id || 'ALL').toUpperCase();
  const companyNameAr =
    COMPANY_AUTH_METADATA[compKey]?.nameAr || 'مجموعة خالد السليم القابضة';

  const handleLiveGoogleOAuthBind = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const fbRes = await signInWithGoogleFirebase();
      if (fbRes.error || !fbRes.data?.email) {
        setErrorMsg(
          fbRes.error?.message ||
            'تعذر جلب حساب Google عبر النافذة المنبثقة. يمكنك إدخال بريد حساب Google أدناه لاعتماده مباشرة.'
        );
        setLoading(false);
        return;
      }

      const bindRes = authService.bindApprovedGoogleAccount({
        googleEmail: fbRes.data.email,
        googleDisplayName: fbRes.data.displayName || user.full_name,
        googlePhotoUrl: fbRes.data.photoURL || undefined,
      });

      if (bindRes.error || !bindRes.data) {
        setErrorMsg(bindRes.error || 'تعذر اعتماد حساب Google.');
        setLoading(false);
        return;
      }

      setApprovedBinding(bindRes.data);
      notificationPopupEngine.success(
        'تم اعتماد حساب Google بنجاح',
        `تم ربط حساب (${bindRes.data.googleEmail}) بملفك الوظيفي (${user.email}). يمكنك تسجيل الدخول عبر Google من المرة القادمة.`
      );
      setTimeout(() => {
        onApproved(bindRes.data!);
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء مصادقة حساب Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPrimary = googleEmail.trim().toLowerCase();
    const cleanConfirm = googleEmailConfirm.trim().toLowerCase();

    if (!cleanPrimary || !cleanConfirm) {
      setErrorMsg('يرجى إدخال بريد حساب Google الشخصي وتأكيده.');
      return;
    }

    if (cleanPrimary !== cleanConfirm) {
      setErrorMsg('بريد حساب Google وتأكيده غير متطابقين. يرجى التحقق والمحاولة مجدداً.');
      return;
    }

    if (!confirmedOwnership) {
      setErrorMsg('يرجى الإقرار بملكية حساب Google لاعتماده للدخول في المرات القادمة.');
      return;
    }

    const bindRes = authService.bindApprovedGoogleAccount({
      googleEmail: cleanPrimary,
      googleDisplayName: googleDisplayName.trim() || user.full_name,
    });

    if (bindRes.error || !bindRes.data) {
      setErrorMsg(bindRes.error || 'تعذر اعتماد حساب Google.');
      return;
    }

    setApprovedBinding(bindRes.data);
    notificationPopupEngine.success(
      'تم اعتماد حساب Google الشخصي',
      `تم ربط (${bindRes.data.googleEmail}) بحسابك (${user.email}) لتسجيل الدخول منه بدءاً من المرة الثانية.`
    );
    setTimeout(() => {
      onApproved(bindRes.data!);
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-binding-modal-title"
      dir="rtl"
      className="fixed inset-0 z-50 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[28px] max-w-lg w-full p-6 sm:p-7 space-y-5 text-right shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.98-2.18-6.96-5.13H1.04v3.14C3.05 21.15 7.21 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.04 14.02c-.25-.72-.39-1.5-.39-2.32s.14-1.6.39-2.32V6.24H1.04C.38 7.56 0 9.05 0 11.7s.38 4.14 1.04 5.46l4-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.21 0 3.05 2.85 1.04 6.24l4 3.14c.98-2.95 3.72-4.63 6.96-4.63z"
                />
              </svg>
            </div>
            <div>
              <h3
                id="google-binding-modal-title"
                className="text-base sm:text-lg font-bold text-[#141414] m-0"
              >
                اعتماد حساب Google الشخصي للدخول السريع
              </h3>
              <p className="text-xs text-[#707070] mt-0.5 m-0">
                لتسجيل الدخول بحسابك مباشرة من المرة الثانية دون إعادة كتابة كلمة المرور
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRemindLater}
            aria-label="تذكيري لاحقاً"
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] flex items-center justify-center text-[#141414] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verified Employee Summary Banner */}
        <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#141414]">
              <ShieldCheck className="w-4 h-4 text-[#141414] shrink-0" />
              <span className="truncate">{user.full_name}</span>
            </div>
            <div className="text-[11px] text-[#525252] mt-0.5 truncate">
              {user.role} • {companyNameAr}
            </div>
          </div>
          <span
            dir="ltr"
            className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-mono font-bold text-[#141414] shrink-0"
          >
            {user.email}
          </span>
        </div>

        {approvedBinding ? (
          <div className="p-5 rounded-2xl bg-[#f3f3f3] border border-[#141414] space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-[#141414] mx-auto" />
            <div className="text-sm font-bold text-[#141414]">
              تم اعتماد وربط حساب Google الخاص بك بنجاح
            </div>
            <p className="text-xs text-[#525252] m-0 leading-relaxed">
              الحساب المعتمد:{' '}
              <span dir="ltr" className="font-mono font-bold text-[#141414]">
                {approvedBinding.googleEmail}
              </span>
              <br />
              يمكنك بدءاً من المرة القادمة الضغط على «تسجيل الدخول عبر Google» للدخول الفوري إلى لوحتك.
            </p>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-[#fff1f2] border border-[#fecdd3] text-[#141414] text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isFirebaseConfigured && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleLiveGoogleOAuthBind()}
                className="w-full h-11 px-4 rounded-2xl bg-[#f3f3f3] hover:bg-[#e8e8e8] border border-[#d4d4d4] text-[#141414] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                )}
                <span>مصادقة وربط تلقائي عبر نافذة Google الرسمية</span>
              </button>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="bind-google-email-input"
                  className="block text-xs font-bold text-[#141414] mb-1.5"
                >
                  حساب Google الشخصي المراد اعتماده *
                </label>
                <div className="relative">
                  <input
                    id="bind-google-email-input"
                    type="email"
                    dir="ltr"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="your.name@gmail.com"
                    className="w-full h-11 pl-4 pr-10 rounded-2xl bg-[#f3f3f3] focus:bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[#141414] placeholder:text-[#737373] text-sm font-mono text-left focus:outline-none"
                    required
                  />
                  <Mail className="w-4 h-4 text-[#525252] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="bind-google-email-confirm-input"
                    className="block text-xs font-bold text-[#141414] mb-1.5"
                  >
                    تأكيد حساب Google *
                  </label>
                  <input
                    id="bind-google-email-confirm-input"
                    type="email"
                    dir="ltr"
                    value={googleEmailConfirm}
                    onChange={(e) => setGoogleEmailConfirm(e.target.value)}
                    placeholder="your.name@gmail.com"
                    className="w-full h-11 px-3.5 rounded-2xl bg-[#f3f3f3] focus:bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[#141414] placeholder:text-[#737373] text-xs font-mono text-left focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="bind-google-display-name"
                    className="block text-xs font-bold text-[#141414] mb-1.5"
                  >
                    الاسم على حساب Google
                  </label>
                  <input
                    id="bind-google-display-name"
                    type="text"
                    value={googleDisplayName}
                    onChange={(e) => setGoogleDisplayName(e.target.value)}
                    placeholder={user.full_name}
                    className="w-full h-11 px-3.5 rounded-2xl bg-[#f3f3f3] focus:bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[#141414] text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#f8f8f7] border border-[#e5e5e5] text-xs text-[#141414] cursor-pointer">
                <input
                  id="bind-google-consent-checkbox"
                  type="checkbox"
                  checked={confirmedOwnership}
                  onChange={(e) => setConfirmedOwnership(e.target.checked)}
                  className="mt-0.5 accent-[#141414]"
                />
                <span className="leading-relaxed">
                  أقرّ بأن حساب Google المدخل يخصني شخصياً وأعتمد ربطه بحسابي الوظيفي (
                  <strong className="font-mono" dir="ltr">
                    {user.email}
                  </strong>
                  ) لتسجيل الدخول منه بدءاً من المرة الثانية.
                </span>
              </label>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  id="bind-google-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#ffffff]" />
                  <span>اعتماد وربط حساب Google الآن</span>
                </button>

                <button
                  id="bind-google-later-btn"
                  type="button"
                  onClick={onRemindLater}
                  className="h-11 px-5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
                >
                  تذكيري لاحقاً
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAccountBindingModal;
