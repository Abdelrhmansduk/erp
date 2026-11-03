import React, { useState, useCallback } from 'react';
import {
  CheckCircle2,
  Loader2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  ArrowUpLeft,
  Lock,
  Receipt,
  Send,
} from 'lucide-react';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';

export type DynamicButtonPreset =
  | 'payment'
  | 'receipt'
  | 'wps-payroll'
  | 'zatca-clearance'
  | 'journal-post'
  | 'musaned-auth'
  | 'approval'
  | 'custom';

export type DynamicButtonPhase = 'idle' | 'verifying' | 'executing' | 'success' | 'error';

export interface DynamicActionButtonProps {
  /** Preset workflow type determining default step messages and styling */
  preset?: DynamicButtonPreset;
  /** Default label in idle state (defaults to preset label if omitted) */
  label?: string;
  /** Optional custom label during step 1 (verifying) */
  verifyingLabel?: string;
  /** Optional custom label during step 2 (executing) */
  executingLabel?: string;
  /** Optional custom label on completion */
  successLabel?: string;
  /** Optional amount to display in payment/receipt badge (e.g. "18,500 ⃁") */
  amountBadge?: string;
  /** Action handler (can be sync or async) */
  onAction?: () => void | Promise<void>;
  /** Whether the button should stay in the "success" state permanently after completion */
  lockOnSuccess?: boolean;
  /** Duration in ms before resetting back to idle (if lockOnSuccess is false) */
  resetAfterMs?: number;
  /** Visual size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'gold' | 'charcoal' | 'emerald' | 'outline';
  /** Optional icon override in idle state */
  icon?: React.ReactNode;
  /** Optional disabled state */
  disabled?: boolean;
  /** Additional classes */
  className?: string;
  /** Optional toast notification on completion */
  toastTitle?: string;
  toastMessage?: string;
}

const PRESET_CONFIG: Record<
  DynamicButtonPreset,
  {
    defaultLabel: string;
    verifying: string;
    executing: string;
    success: string;
    defaultIcon: React.ReactNode;
  }
> = {
  payment: {
    defaultLabel: 'تنفيذ دفعة / سداد فوري',
    verifying: 'جاري التحقق من الرصيد والآيبان...',
    executing: 'جاري تنفيذ الحوالة البنكية...',
    success: 'تم الدفع والتحويل بنجاح ✓',
    defaultIcon: <CreditCard className="w-3.5 h-3.5" />,
  },
  receipt: {
    defaultLabel: 'تحصيل دفعة وإصدار سند',
    verifying: 'جاري مطابقة دفعة العميل...',
    executing: 'جاري إصدار سند القبض والترحيل...',
    success: 'تم التحصيل وإصدار السند ✓',
    defaultIcon: <Receipt className="w-3.5 h-3.5" />,
  },
  'wps-payroll': {
    defaultLabel: 'صرف مسير حماية الأجور WPS',
    verifying: 'جاري تدقيق مسير GOSI والآيبان...',
    executing: 'جاري إرسال ملف حماية الأجور WPS...',
    success: 'تم صرف الرواتب وإيداع WPS ✓',
    defaultIcon: <Send className="w-3.5 h-3.5" />,
  },
  'zatca-clearance': {
    defaultLabel: 'اعتماد وتشفير ZATCA فوري',
    verifying: 'جاري فحص XML UBL 2.1 والختم...',
    executing: 'جاري الاعتماد من منصة فاتورة ZATCA...',
    success: 'معتمدة ومشفرة ZATCA ✓',
    defaultIcon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  'journal-post': {
    defaultLabel: 'ترحيل القيود لسماك',
    verifying: 'جاري فحص توازن المدين والدائن...',
    executing: 'جاري الترحيل لدفتر الأستاذ العام...',
    success: 'تم ترحيل القيد لسماك ✓',
    defaultIcon: <Lock className="w-3.5 h-3.5" />,
  },
  'musaned-auth': {
    defaultLabel: 'توثيق ومزامنة مساند',
    verifying: 'جاري الاتصال ببوابة مساند...',
    executing: 'جاري توثيق العقد وإصدار الرقم...',
    success: 'موثق رسمياً في مساند ✓',
    defaultIcon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
  approval: {
    defaultLabel: 'اعتماد وتوقيع تنفيذي',
    verifying: 'جاري التحقق من الصلاحية والاعتماد...',
    executing: 'جاري تسجيل التوقيع الرقمي...',
    success: 'تم الاعتماد النهائي ✓',
    defaultIcon: <Sparkles className="w-3.5 h-3.5" />,
  },
  custom: {
    defaultLabel: 'تنفيذ الإجراء الفوري',
    verifying: 'جاري التحقق من البيانات...',
    executing: 'جاري تنفيذ العملية...',
    success: 'تم التنفيذ بنجاح ✓',
    defaultIcon: <ArrowUpLeft className="w-3.5 h-3.5" />,
  },
};

export const DynamicActionButton: React.FC<DynamicActionButtonProps> = ({
  preset = 'custom',
  label,
  verifyingLabel,
  executingLabel,
  successLabel,
  amountBadge,
  onAction,
  lockOnSuccess = false,
  resetAfterMs = 2800,
  size = 'sm',
  variant = 'gold',
  icon,
  disabled = false,
  className = '',
  toastTitle,
  toastMessage,
}) => {
  const [phase, setPhase] = useState<DynamicButtonPhase>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [refCode, setRefCode] = useState<string>('');

  const presetMeta = PRESET_CONFIG[preset] || PRESET_CONFIG.custom;

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled || phase === 'verifying' || phase === 'executing') return;
      if (lockOnSuccess && phase === 'success') return;

      try {
        // Phase 1: Verifying
        setPhase('verifying');
        setProgress(38);
        await new Promise((r) => setTimeout(r, 380));

        // Phase 2: Executing
        setPhase('executing');
        setProgress(82);
        await new Promise((r) => setTimeout(r, 420));

        if (onAction) {
          await onAction();
        }

        // Phase 3: Success
        const generatedRef = `TRX-${Math.floor(100000 + Math.random() * 900000)}`;
        setRefCode(generatedRef);
        setProgress(100);
        setPhase('success');

        notificationPopupEngine.success(
          toastTitle || presetMeta.success,
          toastMessage || `تمت العملية بنجاح • الرقم المرجعي: #${generatedRef}`
        );

        if (!lockOnSuccess) {
          setTimeout(() => {
            setPhase('idle');
            setProgress(0);
          }, resetAfterMs);
        }
      } catch (err) {
        setPhase('error');
        setProgress(0);
        setTimeout(() => setPhase('idle'), 2500);
      }
    },
    [disabled, phase, lockOnSuccess, onAction, resetAfterMs, toastTitle, toastMessage, presetMeta.success]
  );

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5 min-h-[30px]',
    sm: 'px-3.5 py-1.5 text-xs rounded-xl gap-2 min-h-[36px]',
    md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2 min-h-[42px]',
    lg: 'px-5 py-3 text-sm sm:text-base rounded-2xl gap-2.5 min-h-[48px]',
  }[size];

  const getPhaseVariantClasses = () => {
    if (phase === 'success') {
      return 'bg-[#047857] text-white border border-emerald-400/50 shadow-md shadow-emerald-950/20';
    }
    if (phase === 'error') {
      return 'bg-rose-600 text-white border border-rose-400/50';
    }
    if (phase === 'verifying' || phase === 'executing') {
      return 'bg-[#1D2428] text-[#CFA64A] border border-[#CFA64A] shadow-md';
    }
    switch (variant) {
      case 'gold':
        return 'bg-[#CFA64A] hover:bg-[#d8b159] text-[#1D2428] border border-[#8C681E]/30 shadow-xs';
      case 'charcoal':
        return 'bg-[#1D2428] hover:bg-black text-[#CFA64A] border border-[#CFA64A]/45 shadow-xs';
      case 'emerald':
        return 'bg-[#047857] hover:bg-emerald-800 text-white border border-emerald-500/30 shadow-xs';
      case 'outline':
      default:
        return 'bg-[#FBFBF5] hover:bg-[#1D2428] text-[#1D2428] hover:text-[#CFA64A] border border-[#CFA64A]/50';
    }
  };

  const currentLabel = (() => {
    if (phase === 'verifying') return verifyingLabel || presetMeta.verifying;
    if (phase === 'executing') return executingLabel || presetMeta.executing;
    if (phase === 'success') return successLabel || presetMeta.success;
    if (phase === 'error') return 'تعذر التنفيذ — أعد المحاولة';
    return label || presetMeta.defaultLabel;
  })();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      data-dynamic-button="true"
      data-dynamic-phase={phase}
      className={`relative overflow-hidden font-black inline-flex items-center justify-center transition-all duration-200 select-none cursor-pointer active:scale-[0.98] disabled:opacity-50 ${sizeClasses} ${getPhaseVariantClasses()} ${className}`}
    >
      {/* Animated Progress Bar Fill during verifying/executing */}
      {(phase === 'verifying' || phase === 'executing') && (
        <span
          className="absolute bottom-0 right-0 h-1 bg-[#CFA64A] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Icon / Spinner / Checkmark Morph */}
      <span className="shrink-0 flex items-center justify-center">
        {phase === 'verifying' || phase === 'executing' ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#CFA64A]" />
        ) : phase === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
        ) : phase === 'error' ? (
          <AlertTriangle className="w-4 h-4 text-white" />
        ) : (
          icon || presetMeta.defaultIcon
        )}
      </span>

      {/* Dynamic Label */}
      <span className="truncate">{currentLabel}</span>

      {/* Optional Amount Badge in Idle or Reference Code in Success */}
      {phase === 'idle' && amountBadge && (
        <span className="px-2 py-0.5 rounded-md bg-black/15 text-[10.5px] font-extrabold font-mono shrink-0">
          {amountBadge}
        </span>
      )}
      {phase === 'success' && refCode && (
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono font-bold shrink-0">
          #{refCode}
        </span>
      )}
    </button>
  );
};

export default DynamicActionButton;
