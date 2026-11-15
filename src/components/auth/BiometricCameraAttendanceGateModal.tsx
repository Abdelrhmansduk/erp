import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Fingerprint,
  Camera,
  CameraOff,
  QrCode,
  ScanLine,
  CheckCircle2,
  RefreshCw,
  LogOut,
  LogIn,
  ShieldCheck,
  Printer,
  X,
  AlertCircle,
  Clock,
  Building2,
  SwitchCamera,
  Copy,
  Check,
} from 'lucide-react';
import { printSpecificElement } from '../../utils/printManager';
import { UserProfile } from '../../services/authService';
import {
  authenticateWithHardwareBiometric,
  detectPlatformBiometricSupport,
  generateEmployeeBarcodeIdentity,
  getSessionCheckInStamp,
  logCrossEmployeeGateMismatch,
  recordGateAttendanceAction,
  verifyEmployeeBarcodeInput,
  type GateVerificationChannel,
} from '../../services/biometricAttendanceGateService';
import { resolveDocumentBranding } from '../../services/entityBrandingService';
import {
  generateRealCode128BarcodeSvg,
  generateRealQrSvg,
} from '../../utils/realBarcodeGenerator';

export type GateModalMode = 'CHECK_IN' | 'CHECK_OUT' | 'BADGE_VIEW';

export interface BiometricCameraAttendanceGateModalProps {
  isOpen: boolean;
  mode: GateModalMode;
  user: UserProfile;
  onVerified: (result: {
    timeHHMM: string;
    workHours: number;
    channel: GateVerificationChannel;
    badgeCode: string;
  }) => void;
  onCancel?: () => void;
  onSwitchAccount?: () => void;
}

type ActiveMethodTab = 'BIOMETRIC' | 'BARCODE';

export const BiometricCameraAttendanceGateModal: React.FC<
  BiometricCameraAttendanceGateModalProps
> = ({ isOpen, mode, user, onVerified, onCancel, onSwitchAccount }) => {
  const [activeTab, setActiveTab] = useState<ActiveMethodTab>(
    mode === 'BADGE_VIEW' ? 'BARCODE' : 'BIOMETRIC'
  );
  const [biometricSupported, setBiometricSupported] = useState<boolean | null>(null);
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'blocked'>('starting');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraErrorAr, setCameraErrorAr] = useState<string>('');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusNoticeAr, setStatusNoticeAr] = useState<string>('');
  const [errorMessageAr, setErrorMessageAr] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [opticalScannerSupported, setOpticalScannerSupported] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [liveTimeStr, setLiveTimeStr] = useState<string>(() =>
    new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  const identity = useMemo(() => generateEmployeeBarcodeIdentity(user), [user]);
  const entityBranding = useMemo(
    () => resolveDocumentBranding(user, { entityCode: identity.companyCode }),
    [user, identity.companyCode]
  );
  const existingStamp = useMemo(
    () => (isOpen ? getSessionCheckInStamp(user) : null),
    [isOpen, user]
  );

  const code128Svg = useMemo(
    () =>
      generateRealCode128BarcodeSvg(identity.badgeCode, {
        widthPx: 228,
        heightPx: 52,
        darkColor: '#141414',
        lightColor: '#FFFFFF',
        showText: true,
      }),
    [identity.badgeCode]
  );

  const qrCodeSvg = useMemo(
    () =>
      generateRealQrSvg(identity.qrPayload, {
        sizePx: 96,
        darkColor: '#141414',
        lightColor: '#FFFFFF',
        borderStyle: true,
      }),
    [identity.qrPayload]
  );

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore track stop error
          }
        });
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCameraStream = useCallback(
    async (preferredFacing: 'user' | 'environment') => {
      stopCameraStream();
      setCameraState('starting');
      setCameraErrorAr('');

      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
          setCameraState('blocked');
          setCameraErrorAr(
            'الكاميرا غير مدعومة في هذا المتصفح — يمكنك المتابعة عبر البصمة أو الباركود الوظيفي.'
          );
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: preferredFacing,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // autoPlay handles playback
          }
        }
        setCameraState('active');
      } catch {
        setCameraState('blocked');
        setCameraErrorAr(
          'تعذر فتح الكاميرا تلقائياً (يرجى السماح بصلاحية الكاميرا في المتصفح أو المتابعة عبر الباركود الوظيفي).'
        );
      }
    },
    [stopCameraStream]
  );

  const captureVideoSnapshot = useCallback((): string | null => {
    try {
      const videoEl = videoRef.current;
      if (!videoEl || cameraState !== 'active' || videoEl.videoWidth <= 0) {
        return capturedSnapshot;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(480, videoEl.videoWidth);
      canvas.height = Math.min(360, videoEl.videoHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) return capturedSnapshot;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      setCapturedSnapshot(dataUrl);
      return dataUrl;
    } catch {
      return capturedSnapshot;
    }
  }, [cameraState, capturedSnapshot]);

  // Live clock ticker while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setInterval(() => {
      setLiveTimeStr(
        new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  // Initialize Camera & Hardware Biometric detection immediately upon open
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      isCompletingRef.current = false;
      return;
    }

    isCompletingRef.current = false;
    setErrorMessageAr('');
    setStatusNoticeAr('');
    setBarcodeInput('');
    setCapturedSnapshot(null);

    const hasBarcodeDetector =
      typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setOpticalScannerSupported(hasBarcodeDetector);

    if (mode === 'BADGE_VIEW') {
      setActiveTab('BARCODE');
      return;
    }

    let cancelled = false;
    let autoBioTimer: number | undefined;
    void startCameraStream(facingMode);

    detectPlatformBiometricSupport()
      .then((supported) => {
        if (cancelled) return;
        setBiometricSupported(supported);
        if (supported) {
          setActiveTab('BIOMETRIC');
          setStatusNoticeAr(
            mode === 'CHECK_IN'
              ? 'جاري مطالبة مستشعر البصمة الحيوية مع الكاميرا المباشرة لتسجيل الدخول...'
              : 'جاري مطالبة مستشعر البصمة الحيوية مع الكاميرا المباشرة لتسجيل الخروج والانصراف...'
          );
          autoBioTimer = window.setTimeout(() => {
            if (!cancelled && !isCompletingRef.current) {
              void handleBiometricVerify();
            }
          }, 450);
        } else {
          setActiveTab('BARCODE');
          setStatusNoticeAr(
            'لم يتم رصد مستشعر بصمة حيوية مفعّل على هذا الجهاز — تم التفعيل التلقائي للتحقق عبر الباركود الوظيفي.'
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setBiometricSupported(false);
        setActiveTab('BARCODE');
      });

    return () => {
      cancelled = true;
      if (autoBioTimer) window.clearTimeout(autoBioTimer);
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Focus barcode input when switching to BARCODE tab so USB scanners & keyboard work immediately
  useEffect(() => {
    if (!isOpen || activeTab !== 'BARCODE' || mode === 'BADGE_VIEW') return;
    const id = window.setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(id);
  }, [isOpen, activeTab, mode]);

  const completeGateVerification = useCallback(
    async (channel: GateVerificationChannel) => {
      if (isCompletingRef.current || mode === 'BADGE_VIEW') return;
      isCompletingRef.current = true;
      setIsProcessing(true);
      setErrorMessageAr('');

      try {
        const snap = captureVideoSnapshot();
        const cameraCaptured = Boolean(snap || cameraState === 'active');
        const result = await recordGateAttendanceAction({
          user,
          direction: mode,
          channel,
          cameraCaptured,
          snapshotDataUrl: snap,
        });

        stopCameraStream();
        onVerified({
          timeHHMM: result.timeHHMM,
          workHours: result.workHours,
          channel,
          badgeCode: result.badgeCode,
        });
      } catch {
        isCompletingRef.current = false;
        setErrorMessageAr('حدث خطأ أثناء تسجيل حركة الحضور والانصراف. يرجى المحاولة مرة أخرى.');
      } finally {
        setIsProcessing(false);
      }
    },
    [captureVideoSnapshot, cameraState, mode, onVerified, stopCameraStream, user]
  );

  // Continuous live camera Barcode/QR optical detection when on BARCODE tab
  useEffect(() => {
    if (
      !isOpen ||
      mode === 'BADGE_VIEW' ||
      activeTab !== 'BARCODE' ||
      cameraState !== 'active' ||
      !opticalScannerSupported
    ) {
      return;
    }

    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: any })
      .BarcodeDetector;
    if (!BarcodeDetectorCtor) return;

    let detector: any = null;
    try {
      detector = new BarcodeDetectorCtor({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
      });
    } catch {
      try {
        detector = new BarcodeDetectorCtor();
      } catch {
        return;
      }
    }

    let stopped = false;
    const scanTimer = window.setInterval(async () => {
      if (stopped || isCompletingRef.current || !videoRef.current) return;
      if (videoRef.current.readyState < 2) return;
      try {
        const detected = await detector.detect(videoRef.current);
        if (Array.isArray(detected) && detected.length > 0) {
          for (const item of detected) {
            const rawVal = String(item?.rawValue || '').trim();
            if (!rawVal) continue;
            const check = verifyEmployeeBarcodeInput(rawVal, user);
            if (check.valid) {
              setBarcodeInput(check.matchedCode);
              void completeGateVerification('BARCODE_CAMERA');
              break;
            } else if (check.crossEmployeeMismatch) {
              setErrorMessageAr(check.reasonAr || 'الباركود الممسوح يخص موظفاً آخر.');
              void logCrossEmployeeGateMismatch({
                currentUser: user,
                attemptedInput: rawVal,
                otherEmployeeName: check.otherEmployeeName,
                direction: mode === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
              });
              break;
            }
          }
        }
      } catch {
        // ignore transient frame scan errors
      }
    }, 450);

    return () => {
      stopped = true;
      window.clearInterval(scanTimer);
    };
  }, [
    isOpen,
    mode,
    activeTab,
    cameraState,
    opticalScannerSupported,
    user,
    completeGateVerification,
  ]);

  const handleBiometricVerify = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessageAr('');

    try {
      const bioRes = await authenticateWithHardwareBiometric(user);
      if (bioRes.ok) {
        setIsProcessing(false);
        await completeGateVerification('BIOMETRIC_CAMERA');
        return;
      }

      if (bioRes.fallbackToBarcode) {
        setActiveTab('BARCODE');
        setStatusNoticeAr(
          bioRes.reasonAr ||
            'تعذر الوصول لمستشعر البصمة — تم التفعيل التلقائي للتحقق عبر الباركود الوظيفي.'
        );
      } else if (bioRes.reasonAr) {
        setErrorMessageAr(bioRes.reasonAr);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualOrScannerBarcodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isProcessing) return;

    const validation = verifyEmployeeBarcodeInput(barcodeInput, user);
    if (!validation.valid) {
      if (validation.crossEmployeeMismatch && mode !== 'BADGE_VIEW') {
        void logCrossEmployeeGateMismatch({
          currentUser: user,
          attemptedInput: barcodeInput,
          otherEmployeeName: validation.otherEmployeeName,
          direction: mode === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
        });
      }
      setErrorMessageAr(
        validation.reasonAr || 'رمز الباركود المدخل غير مطابق لبطاقة الموظف المعتمدة.'
      );
      return;
    }

    await completeGateVerification(
      cameraState === 'active' ? 'BARCODE_CAMERA' : 'BARCODE_SCANNER'
    );
  };

  const handleDigitalBadgeInstantVerify = async () => {
    if (isProcessing) return;
    setBarcodeInput(identity.badgeCode);
    await completeGateVerification(
      cameraState === 'active' ? 'BARCODE_CAMERA' : 'BARCODE_SCANNER'
    );
  };

  const handleToggleFacingMode = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    void startCameraStream(next);
  };

  const handleCopyBadgeCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(identity.badgeCode);
        setCopiedCode(true);
        window.setTimeout(() => setCopiedCode(false), 1800);
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const isCheckIn = mode === 'CHECK_IN';
  const isCheckOut = mode === 'CHECK_OUT';
  const isBadgeOnly = mode === 'BADGE_VIEW';

  const headerTitle = isBadgeOnly
    ? 'بطاقة الباركود الوظيفي وحالة البصمة للجلسة.'
    : isCheckIn
    ? 'بوابة البصمة الحيوية والكاميرا لتسجيل الدخول.'
    : 'بوابة البصمة الحيوية والكاميرا لتسجيل الخروج.';

  const headerSubtitle = isBadgeOnly
    ? 'يمكنك طباعة بطاقة الباركود المعتمدة أو استخدامها عند الدخول والخروج في حال عدم توفر مستشعر البصمة.'
    : isCheckIn
    ? 'يتطلب فتح النظام التحقق الحيوي بالبصمة وفتح الكاميرا المباشرة لتوثيق الحضور — وعند عدم وجود بصمة يتم التحقق عبر الباركود.'
    : 'يتطلب تسجيل الخروج التحقق بالبصمة وفتح الكاميرا المباشرة لتوثيق الانصراف — وعند عدم وجود بصمة يتم التحقق عبر الباركود.';

  return (
    <div
      data-slot="biometric-attendance-gate-modal"
      data-gate-mode={mode}
      dir="rtl"
      className="fixed inset-0 z-[2600] bg-[#141414]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div
        data-printable-modal="true"
        className="w-full max-w-4xl bg-[#ffffff] text-[#141414] rounded-[28px] border border-[#e0e0e0] overflow-hidden my-auto"
      >
        {/* Top Institutional Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-[#ffffff] border-b border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[15px] bg-[#141414] text-[#ffffff] flex items-center justify-center shrink-0">
              {isCheckOut ? (
                <LogOut className="w-5 h-5 text-[#fb7185]" data-colored-icon="true" />
              ) : isBadgeOnly ? (
                <QrCode className="w-5 h-5 text-[#38bdf8]" data-colored-icon="true" />
              ) : (
                <Fingerprint className="w-5 h-5 text-[#34d399]" data-colored-icon="true" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[#141414] m-0 leading-snug">
                  {headerTitle}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#eef2ff] border border-[#c7d2fe] text-[11px] font-bold font-mono text-[#4338ca]">
                  {liveTimeStr}
                </span>
              </div>
              <p className="text-xs text-[#707070] mt-0.5 leading-relaxed m-0">
                {headerSubtitle}
              </p>
            </div>
          </div>

          {(isCheckOut || isBadgeOnly) && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-3.5 rounded-full bg-[#fff1f2] hover:bg-[#ffe4e6] border border-[#fecdd3] text-[#be123c] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors no-print"
            >
              <X className="w-3.5 h-3.5 text-[#e11d48]" data-colored-icon="true" />
              <span>{isCheckOut ? 'إلغاء والبقاء في النظام' : 'إغلاق'}</span>
            </button>
          )}
        </div>

        {/* Employee & Entity Identity Strip */}
        <div className="px-5 sm:px-7 py-3 bg-[#f3f3f3] border-b border-[#e0e0e0] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#141414]">
              {user.full_name || user.username || 'موظف معتمد'}
            </span>
            <span className="text-[#707070]">•</span>
            <span className="text-[#707070] font-medium">
              {user.role || user.department_name_ar || 'الإدارة التشغيلية'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eef2ff] border border-[#c7d2fe] text-[11px] font-semibold text-[#4338ca]">
              <Building2 className="w-3 h-3 text-[#4f46e5]" data-colored-icon="true" />
              <span>{entityBranding.displayNameAr}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {existingStamp && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-[#34d399]" data-colored-icon="true" />
                <span>وقت الدخول المسجل: {existingStamp.checkInTime}</span>
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold text-[11px] text-[#141414]">
              {identity.badgeCode}
            </span>
          </div>
        </div>

        {/* Main Body Grid */}
        <div
          className={`p-5 sm:p-7 grid grid-cols-1 ${
            isBadgeOnly ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
          } gap-5 items-stretch`}
        >
          {/* Left/Right Column 1: Live Camera Feed (Active on both CHECK_IN and CHECK_OUT) */}
          {!isBadgeOnly && (
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#f3f3f3] border border-[#e0e0e0] rounded-[24px] p-4 space-y-3 no-print">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141414]">
                  <Camera className="w-4 h-4" />
                  <span>الكاميرا المباشرة للتوثيق</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    cameraState === 'active'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#ffffff] text-[#707070] border border-[#e0e0e0]'
                  }`}
                >
                  {cameraState === 'active'
                    ? 'الكاميرا متصلة الآن'
                    : cameraState === 'starting'
                    ? 'جاري تشغيل الكاميرا...'
                    : 'الكاميرا غير مفعلة'}
                </span>
              </div>

              {/* Camera Viewport */}
              <div className="relative w-full aspect-[4/3] rounded-[18px] bg-[#141414] overflow-hidden flex items-center justify-center border border-[#262626]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  data-slot="gate-live-camera-video"
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  } ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Framing Reticle Overlay */}
                {cameraState === 'active' && (
                  <div className="pointer-events-none absolute inset-4 border border-dashed border-[#ffffff]/60 rounded-[16px] flex flex-col justify-between p-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#ffffff] bg-[#141414]/70 px-2.5 py-0.5 rounded-full self-start">
                      <span>{isCheckIn ? 'CHECK-IN CAM' : 'CHECK-OUT CAM'}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#ffffff] bg-[#141414]/75 px-3 py-1 rounded-full text-center self-center">
                      {activeTab === 'BARCODE'
                        ? 'وجّه الوجه أو بطاقة الباركود أمام الكاميرا'
                        : 'الكاميرا جاهزة لتوثيق البصمة الحيوية'}
                    </div>
                  </div>
                )}

                {cameraState === 'starting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#ffffff] p-4 text-center space-y-2">
                    <RefreshCw className="w-7 h-7 animate-spin text-[#ffffff]" />
                    <span className="text-xs font-semibold">
                      جاري فتح الكاميرا المباشرة...
                    </span>
                  </div>
                )}

                {cameraState === 'blocked' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-[#ffffff] p-4 text-center space-y-2.5">
                    <CameraOff className="w-8 h-8 text-[#adadad]" />
                    <p className="text-xs text-[#e0e0e0] leading-relaxed m-0">
                      {cameraErrorAr ||
                        'لم يتم تفعيل الكاميرا — اضغط إعادة تشغيل الكاميرا أو تابع عبر الباركود الوظيفي.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => void startCameraStream(facingMode)}
                      className="h-8 px-3.5 rounded-full bg-[#ffffff] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة تشغيل الكاميرا</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls Footer */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="h-8 px-3 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>
                    {facingMode === 'user' ? 'تبديل للكاميرا الخلفية' : 'تبديل للكاميرا الأمامية'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void startCameraStream(facingMode)}
                  className="h-8 px-3 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تحديث الكاميرا</span>
                </button>
              </div>
            </div>
          )}

          {/* Column 2: Biometric & Barcode Verification Controls */}
          <div
            className={`${
              isBadgeOnly ? 'col-span-1' : 'lg:col-span-7'
            } flex flex-col justify-between space-y-4`}
          >
            {/* Segmented Control: Biometric vs Barcode Fallback */}
            {!isBadgeOnly && (
              <div
                role="tablist"
                aria-label="وسيلة التحقق من الحضور والانصراف"
                className="p-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] grid grid-cols-2 gap-1 no-print"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'BIOMETRIC'}
                  data-slot="gate-tab-biometric"
                  onClick={() => {
                    setActiveTab('BIOMETRIC');
                    setErrorMessageAr('');
                  }}
                  className={`h-10 px-4 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'BIOMETRIC'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  <Fingerprint className="w-4 h-4 shrink-0" />
                  <span>١. البصمة الحيوية + الكاميرا</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'BARCODE'}
                  data-slot="gate-tab-barcode"
                  onClick={() => {
                    setActiveTab('BARCODE');
                    setErrorMessageAr('');
                  }}
                  className={`h-10 px-4 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'BARCODE'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>٢. عبر الباركود (عند عدم وجود بصمة)</span>
                </button>
              </div>
            )}

            {/* Status / Fallback Notice */}
            {statusNoticeAr && !isBadgeOnly && (
              <div className="px-4 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] flex items-start gap-2 no-print">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[#141414]" />
                <span className="leading-relaxed font-medium">{statusNoticeAr}</span>
              </div>
            )}

            {/* Error Alert */}
            {errorMessageAr && (
              <div
                role="alert"
                className="px-4 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#141414] text-xs text-[#141414] flex items-start gap-2 no-print"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#141414]" />
                <span className="leading-relaxed font-bold">{errorMessageAr}</span>
              </div>
            )}

            {/* TAB 1: HARDWARE BIOMETRIC + LIVE CAMERA */}
            {activeTab === 'BIOMETRIC' && !isBadgeOnly && (
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
                      <Fingerprint className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141414] m-0">
                        {isCheckIn
                          ? 'التحقق بالبصمة الحيوية لتسجيل الدخول والدوام'
                          : 'التحقق بالبصمة الحيوية لتسجيل الخروج والانصراف'}
                      </h3>
                      <p className="text-xs text-[#707070] mt-0.5 m-0 leading-relaxed">
                        يدعم بصمة الإصبع أو الوجه للنظام (Windows Hello / Touch ID / Fingerprint) مع التقاط لقطة التوثيق الفورية من الكاميرا وتقييدها في سجل الحضور والانصراف.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-[16px] bg-[#f3f3f3] text-xs space-y-1">
                      <div className="text-[#707070] font-medium">حالة مستشعر البصمة</div>
                      <div className="font-bold text-[#141414]">
                        {biometricSupported === null
                          ? 'جاري الفحص...'
                          : biometricSupported
                          ? 'متاح ومفعّل على الجهاز'
                          : 'غير متوفر — استخدم الباركود البديل'}
                      </div>
                    </div>
                    <div className="p-3 rounded-[16px] bg-[#f3f3f3] text-xs space-y-1">
                      <div className="text-[#707070] font-medium">نوع الحركة النظامية</div>
                      <div className="font-bold text-[#141414]">
                        {isCheckIn
                          ? 'تسجيل حضور وبداية جلسة العمل'
                          : 'تسجيل انصراف واحتساب ساعات العمل'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    data-slot="biometric-verify-primary-btn"
                    disabled={isProcessing}
                    onClick={() => void handleBiometricVerify()}
                    className="w-full h-12 px-6 rounded-full bg-[#141414] hover:bg-[#262626] disabled:opacity-60 text-[#ffffff] text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {isCheckIn ? (
                      <LogIn className="w-4 h-4 shrink-0" />
                    ) : (
                      <LogOut className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {isProcessing
                        ? 'جاري التحقق من البصمة والكاميرا...'
                        : isCheckIn
                        ? 'تأكيد البصمة والكاميرا لتسجيل الدخول'
                        : 'تأكيد البصمة والكاميرا لتسجيل الخروج'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-slot="switch-to-barcode-fallback-btn"
                    onClick={() => {
                      setActiveTab('BARCODE');
                      setErrorMessageAr('');
                    }}
                    className="w-full h-10 px-5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <ScanLine className="w-4 h-4 shrink-0" />
                    <span>
                      عدم وجود بصمة؟ التحقق عبر الباركود الوظيفي ({identity.badgeCode})
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: BARCODE FALLBACK + PRINTABLE SCANNABLE EMPLOYEE CARD */}
            {(activeTab === 'BARCODE' || isBadgeOnly) && (
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4 flex-1 flex flex-col justify-between">
                {!isBadgeOnly && (
                  <form
                    onSubmit={(e) => void handleManualOrScannerBarcodeSubmit(e)}
                    className="space-y-3 no-print"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label
                        htmlFor="employee-barcode-gate-input"
                        className="text-xs font-bold text-[#141414] inline-flex items-center gap-1.5"
                      >
                        <ScanLine className="w-4 h-4" />
                        <span>
                          امسح الباركود بالكاميرا / قارئ الباركود أو أدخل رمز البطاقة:
                        </span>
                      </label>
                      {opticalScannerSupported && cameraState === 'active' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                          المسح البصري التلقائي مفعّل
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="employee-barcode-gate-input"
                        ref={barcodeInputRef}
                        data-slot="barcode-gate-input"
                        type="text"
                        dir="ltr"
                        value={barcodeInput}
                        onChange={(e) => {
                          setBarcodeInput(e.target.value);
                          if (errorMessageAr) setErrorMessageAr('');
                        }}
                        placeholder={`${identity.badgeCode} / ${identity.shortPinCode}`}
                        className="flex-1 h-11 px-4 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono text-xs sm:text-sm font-bold outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#141414] transition-all"
                      />
                      <button
                        type="submit"
                        data-slot="barcode-submit-btn"
                        disabled={isProcessing}
                        className="h-11 px-5 rounded-full bg-[#141414] hover:bg-[#262626] disabled:opacity-60 text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isCheckIn ? 'دخول بالباركود' : 'خروج بالباركود'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Scannable Employee Barcode & QR Card */}
                <div
                  data-printable-card="true"
                  className="erp-printable-sheet p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-[11px] font-semibold text-[#707070]">
                        بطاقة الباركود الوظيفي المعتمدة — {entityBranding.displayNameAr}
                      </div>
                      <div className="text-sm font-bold text-[#141414]">
                        {user.full_name || user.username} •{' '}
                        <span className="font-mono">{identity.badgeCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 no-print">
                      <button
                        type="button"
                        onClick={() => void handleCopyBadgeCode()}
                        className="h-8 px-3 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedCode ? 'تم النسخ' : 'نسخ الرمز'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) =>
                          printSpecificElement(
                            e.currentTarget.closest<HTMLElement>('[data-printable-card="true"]')
                          )
                        }
                        className="h-8 px-3 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة البطاقة</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#ffffff] p-3.5 rounded-[16px] border border-[#e0e0e0]">
                    <div className="flex flex-col items-center sm:items-start gap-1.5">
                      <div
                        className="max-w-full overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: code128Svg }}
                      />
                      <span className="text-[11px] text-[#707070] font-mono">
                        الرمز المختصر: <strong className="text-[#141414]">{identity.shortPinCode}</strong>
                      </span>
                    </div>
                    <div
                      className="shrink-0"
                      dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                  </div>

                  {!isBadgeOnly && (
                    <button
                      type="button"
                      data-slot="verify-digital-badge-btn"
                      disabled={isProcessing}
                      onClick={() => void handleDigitalBadgeInstantVerify()}
                      className="w-full h-10 px-4 rounded-full bg-[#141414] hover:bg-[#262626] disabled:opacity-60 text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors no-print"
                    >
                      <QrCode className="w-4 h-4 shrink-0" />
                      <span>
                        {isCheckIn
                          ? 'مسح البطاقة الرقمية المعتمدة مع الكاميرا لتسجيل الدخول فوراً'
                          : 'مسح البطاقة الرقمية المعتمدة مع الكاميرا لتسجيل الخروج فوراً'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Governance & Account Switch Bar */}
        <div className="px-5 sm:px-7 py-3.5 bg-[#141414] text-[#ffffff] flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ffffff] shrink-0" />
            <span className="text-[#e0e0e0]">
              توثيق مباشر مع سجل الحضور والانصراف الموحد (البصمة الحيوية • الكاميرا • الباركود الوظيفي)
            </span>
          </div>

          {isCheckIn && onSwitchAccount && (
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onSwitchAccount();
              }}
              className="h-8 px-3.5 rounded-full bg-[#262626] hover:bg-[#3a3a3a] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تبديل الحساب / العودة لشاشة الدخول</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricCameraAttendanceGateModal;
