import React, { useMemo, useState } from 'react';
import {
  Package,
  ScanBarcode,
  AlertTriangle,
  CheckCircle2,
  BatteryCharging,
  ClipboardList,
  Sparkles,
  FileSpreadsheet,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export type WmsAvatarMood =
  | 'overview'
  | 'catalog'
  | 'vouchers'
  | 'scanner-labels'
  | 'world-class'
  | 'quick-consumables'
  | 'serials-samples'
  | 'cycle-counts'
  | 'reconciliation'
  | 'analytics-settings'
  | 'celebrate';

interface WmsInteractiveAvatarProps {
  activeTab: WmsAvatarMood;
  actorName: string;
  totalItems: number;
  lowStockCount: number;
  pendingDiscrepancies: number;
  onQuickAction: (action: 'scan' | 'excel' | 'reconcile' | 'guide' | 'grn' | 'gin') => void;
}

export const WmsInteractiveAvatar: React.FC<WmsInteractiveAvatarProps> = ({
  activeTab,
  actorName,
  totalItems,
  lowStockCount,
  pendingDiscrepancies,
  onQuickAction,
}) => {
  const [pulseCount, setPulseCount] = useState(0);
  const firstName = (actorName || 'حاتم').split(' ')[0];

  const config = useMemo(() => {
    switch (activeTab) {
      case 'scanner-labels':
        return {
          badge: 'SCANNER LIVE',
          title: `محطة الباركود جاهزة يا ${firstName}!`,
          hint: 'وصّل قارئ USB/Bluetooth أو افتح الكاميرا لمسح أي قطعة داخل أو خارج المستودع.',
          ctaLabel: 'افتح إرشادات الباركود',
          ctaAction: 'guide' as const,
          mode: 'scan' as const,
          Icon: ScanBarcode,
        };
      case 'reconciliation':
        return {
          badge: pendingDiscrepancies > 0 ? `${pendingDiscrepancies} للتسوية` : 'متطابق 100%',
          title:
            pendingDiscrepancies > 0
              ? `رصدت ${pendingDiscrepancies} بنداً يحتاج مراجعتك`
              : 'ممتاز! جميع فروقات الإكسل تمت تسويتها',
          hint: 'أدخل الرصيد الفعلي على الرف (مثل DVD DRIVE) ليصبح الرصيد دقيقاً 100%.',
          ctaLabel: 'إذن وارد جديد',
          ctaAction: 'grn' as const,
          mode: pendingDiscrepancies > 0 ? ('alert' as const) : ('ok' as const),
          Icon: pendingDiscrepancies > 0 ? AlertTriangle : CheckCircle2,
        };
      case 'quick-consumables':
        return {
          badge: 'FAST ISSUE',
          title: 'صرف سريع لحجارة الكمبيوتر والمستهلكات',
          hint: 'خصم فوري من العلب (1 علبة = 24 حجر) مع جدول استهلاك تلقائي لكل موظف.',
          ctaLabel: 'صرف مخزني عام',
          ctaAction: 'gin' as const,
          mode: 'bounce' as const,
          Icon: BatteryCharging,
        };
      case 'serials-samples':
        return {
          badge: 'SERIAL & CUSTODY',
          title: 'حماية الأصول المسلسلة والعهد والعينات',
          hint: 'رحّل أي جهاز تقني (Nikon Z8 / HP / Fluke) إلى عهدة موظف بضغطة واحدة.',
          ctaLabel: 'طباعة باركود تسلسلي',
          ctaAction: 'scan' as const,
          mode: 'radar' as const,
          Icon: ShieldCheck,
        };
      case 'cycle-counts':
        return {
          badge: 'CYCLE COUNT',
          title: 'الجرد الدوري الأعمى بدقة عالمية',
          hint: 'ابدأ جلسة جرد وأدخل الكميات بالباركود لإصدار تسوية الفروقات (ADJ) آلياً.',
          ctaLabel: 'جرد بجهاز الباركود',
          ctaAction: 'scan' as const,
          mode: 'radar' as const,
          Icon: ClipboardList,
        };
      case 'vouchers':
        return {
          badge: 'DOUBLE-ENTRY',
          title: 'دفتر الأذونات (وارد • صادر • مرتجع)',
          hint: 'عدّل، اطبع PDF، أرفق صورة الفاتورة، أو أرسل السند عبر واتساب فوراً.',
          ctaLabel: 'رفع ملف Excel',
          ctaAction: 'excel' as const,
          mode: 'flow' as const,
          Icon: Truck,
        };
      case 'catalog':
        return {
          badge: `${totalItems} SKU`,
          title: 'دليل الأصناف الموحّد وهندسة الوحدات',
          hint: 'أرفق صورة لكل صنف واطبع ملصق Code-128B + QR حقيقي للرفوف.',
          ctaLabel: 'رفع واستخراج Excel',
          ctaAction: 'excel' as const,
          mode: 'bounce' as const,
          Icon: Package,
        };
      case 'analytics-settings':
        return {
          badge: 'IAS 2 + AUDIT',
          title: 'التحليلات وسياسة التسعير المزدوجة',
          hint: 'بدّل بين التكلفة الاختيارية أو الإلزامية وتابع استهلاك كل مكتب وسكن.',
          ctaLabel: 'دليل الاستخدام',
          ctaAction: 'guide' as const,
          mode: 'radar' as const,
          Icon: FileSpreadsheet,
        };
      default:
        return {
          badge: lowStockCount > 0 ? `${lowStockCount} تنبيه طلب` : 'WMS ACTIVE',
          title: `أهلاً بك يا ${firstName} — المساعد التفاعلي للمستودع`,
          hint:
            pendingDiscrepancies > 0
              ? `يوجد ${pendingDiscrepancies} بند تسوية من الإكسل و ${lowStockCount} صنف تحت حد إعادة الطلب.`
              : `المستودع مستقر (${totalItems} صنف موحّد) — جاهز للمسح أو الوارد والصادر.`,
          ctaLabel: pendingDiscrepancies > 0 ? 'مراجعة التسويات' : 'تشغيل محطة الباركود',
          ctaAction: pendingDiscrepancies > 0 ? ('reconcile' as const) : ('scan' as const),
          mode: 'radar' as const,
          Icon: Package,
        };
    }
  }, [activeTab, firstName, totalItems, lowStockCount, pendingDiscrepancies]);

  const ActiveIcon = config.Icon;

  return (
    <div
      className="flex items-center gap-3.5 p-3 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] max-w-xl"
      dir="rtl"
    >
      {/* Inline keyframes scoped cleanly for smooth monochrome vector motion */}
      <style>{`
        @keyframes wmsAvatarFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes wmsLaserSweep {
          0% { transform: translateY(-14px); opacity: 0.2; }
          50% { transform: translateY(14px); opacity: 1; }
          100% { transform: translateY(-14px); opacity: 0.2; }
        }
        @keyframes wmsRadarSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wmsEyeBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.15); }
        }
      `}</style>

      {/* Interactive Animated Icon Avatar (30% Mobbin Squircle) */}
      <button
        type="button"
        onClick={() => setPulseCount((c) => c + 1)}
        title="مساعد المستودعات التفاعلي — اضغط للتفاعل"
        className="relative w-16 h-16 shrink-0 bg-[#141414] text-white flex items-center justify-center overflow-hidden cursor-pointer select-none transition-transform active:scale-95"
        style={{ borderRadius: '30%' }}
      >
        {/* Subtle Rotating Radar Ring */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <circle
            cx="32"
            cy="32"
            r="27"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            style={{ transformOrigin: '32px 32px', animation: 'wmsRadarSpin 12s linear infinite' }}
          />
          {/* Animated Smart Bot Eyes at top */}
          <g style={{ transformOrigin: '32px 15px', animation: 'wmsEyeBlink 4.2s ease-in-out infinite' }}>
            <circle cx="26" cy="14" r="1.8" fill="#ffffff" />
            <circle cx="38" cy="14" r="1.8" fill="#ffffff" />
          </g>
          {/* Antenna / Signal Dot */}
          <circle cx="32" cy="7" r="2" fill="#0066ff" />
        </svg>

        {/* Center Floating Icon */}
        <div
          key={pulseCount}
          className="relative z-10 mt-2.5 flex items-center justify-center"
          style={{ animation: 'wmsAvatarFloat 2.6s ease-in-out infinite' }}
        >
          <ActiveIcon className="w-6 h-6 text-white" />
        </div>

        {/* Sweeping Laser Scan Line (in Scanner / Catalog / Alert modes) */}
        {(config.mode === 'scan' || config.mode === 'radar') && (
          <div
            className="absolute left-2 right-2 h-[2px] bg-[#0066ff] rounded-full pointer-events-none"
            style={{ animation: 'wmsLaserSweep 2.4s ease-in-out infinite' }}
          />
        )}

        {/* Live Status Pulse Dot */}
        <span className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-[#0066ff] border-2 border-[#141414] animate-pulse" />
      </button>

      {/* Interactive Speech & Quick Action Pill */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white text-[9.5px] font-mono font-bold inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {config.badge}
          </span>
          <span className="text-xs font-bold text-[#141414] truncate">{config.title}</span>
        </div>
        <p className="text-[11px] text-[#707070] leading-snug">{config.hint}</p>
        <div className="pt-0.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickAction(config.ctaAction)}
            className="px-3 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] hover:border-[#141414] hover:bg-[#141414] hover:text-white text-[10.5px] font-bold text-[#141414] transition-colors"
          >
            {config.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
