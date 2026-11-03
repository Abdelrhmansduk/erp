import React from 'react';
import { 
  Award, DollarSign, CheckCircle2, Clock, Send, RefreshCw, 
  Briefcase, CheckSquare, TrendingUp, Building2, Eye, Edit3, 
  Trash2, Printer, FileSpreadsheet, QrCode, Phone, Mail, 
  MapPin, Star, ShieldCheck, ArrowUpRight, Copy, ChevronLeft,
  Activity, Check, Sparkles, Hash, Calendar, FileText
} from 'lucide-react';
import { Badge } from '../ui/Badge';

// ============================================================================
// 1. KAS KPI METRIC CARD (بطاقة المؤشرات المالية والتشغيلية الفاخرة)
// ============================================================================

export interface KasKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'emerald' | 'gold' | 'sky' | 'purple' | 'rose' | 'slate';
  progressPct?: number;
  onClick?: () => void;
}

export const KasKpiCard: React.FC<KasKpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'emerald',
  progressPct,
  onClick,
}) => {
  const variantStyles = {
    emerald: {
      cardBg: 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/[0.03] to-white dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-900',
      border: 'border-emerald-500/30 hover:border-emerald-500',
      topBeam: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600',
      iconGradient: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/30',
      glow: 'hover:shadow-emerald-500/15',
      valueColor: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      bar: 'bg-gradient-to-r from-emerald-600 to-teal-400',
    },
    gold: {
      cardBg: 'bg-gradient-to-b from-amber-500/10 via-amber-500/[0.03] to-white dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-900',
      border: 'border-amber-500/30 hover:border-amber-500',
      topBeam: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600',
      iconGradient: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30',
      glow: 'hover:shadow-amber-500/15',
      valueColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    },
    sky: {
      cardBg: 'bg-gradient-to-b from-sky-500/10 via-sky-500/[0.03] to-white dark:from-sky-950/40 dark:via-zinc-900 dark:to-zinc-900',
      border: 'border-sky-500/30 hover:border-sky-500',
      topBeam: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-600',
      iconGradient: 'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md shadow-sky-500/30',
      glow: 'hover:shadow-sky-500/15',
      valueColor: 'text-sky-700 dark:text-sky-400',
      badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700',
      bar: 'bg-gradient-to-r from-sky-500 to-cyan-400',
    },
    purple: {
      cardBg: 'bg-gradient-to-b from-amber-500/10 via-amber-500/[0.03] to-white dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-900',
      border: 'border-amber-500/30 hover:border-amber-500',
      topBeam: 'bg-gradient-to-r from-amber-500 via-fuchsia-400 to-amber-600',
      iconGradient: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/30',
      glow: 'hover:shadow-amber-500/15',
      valueColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      bar: 'bg-gradient-to-r from-amber-600 to-amber-400',
    },
    rose: {
      cardBg: 'bg-gradient-to-b from-rose-500/10 via-rose-500/[0.03] to-white dark:from-rose-950/40 dark:via-zinc-900 dark:to-zinc-900',
      border: 'border-rose-500/30 hover:border-rose-500',
      topBeam: 'bg-gradient-to-r from-rose-500 via-pink-400 to-red-600',
      iconGradient: 'bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-md shadow-rose-500/30',
      glow: 'hover:shadow-rose-500/15',
      valueColor: 'text-rose-700 dark:text-rose-400',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700',
      bar: 'bg-gradient-to-r from-rose-500 to-pink-400',
    },
    slate: {
      cardBg: 'bg-gradient-to-b from-slate-500/10 via-slate-500/[0.03] to-white dark:from-slate-800/40 dark:via-zinc-900 dark:to-zinc-900',
      border: 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-500',
      topBeam: 'bg-gradient-to-r from-slate-600 via-zinc-400 to-slate-700',
      iconGradient: 'bg-gradient-to-br from-slate-700 to-zinc-900 text-white shadow-md shadow-slate-700/30',
      glow: 'hover:shadow-slate-500/15',
      valueColor: 'text-zinc-800 dark:text-zinc-100',
      badgeBg: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-600',
      bar: 'bg-gradient-to-r from-slate-600 to-slate-400',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl ${style.cardBg} border ${style.border} p-4 sm:p-5 shadow-sm hover:shadow-xl ${style.glow} transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top Radiant Color Accent Beam */}
      <div className={`absolute top-0 right-0 left-0 h-1.5 ${style.topBeam}`} />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-3.5 pt-1">
        {/* Top Row: Icon + Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${style.iconGradient} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-extrabold text-zinc-800 dark:text-zinc-100 block truncate leading-tight">
                {title}
              </span>
              {subtitle && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block truncate mt-0.5">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {trend && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
              trend.isPositive 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend.isPositive ? '' : 'rotate-180'}`} />
              {trend.value}
            </span>
          )}
        </div>

        {/* Big Bold Value */}
        <div className="flex items-baseline justify-between pt-1">
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${style.valueColor}`}>
            {value}
          </div>
        </div>

        {/* Optional Progress Bar */}
        {progressPct !== undefined && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
              <span>نسبة الإنجاز</span>
              <span className="font-mono">{progressPct}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-200/60 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
              <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(progressPct, 100)}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. KAS TENDER / COMPETITION CARD (بطاقة كراسة المنافسة وجدول الكميات الفاخرة)
// ============================================================================

export interface KasTenderCardProps {
  tender: {
    id: string;
    referenceNumber: string;
    title: string;
    clientName: string;
    entityName?: string;
    category?: string;
    status: string;
    grandTotal: number;
    subtotal?: number;
    vatAmount?: number;
    itemsCount: number;
    submissionDate?: string;
    supplyDuration?: string;
  };
  onOpenBOQ: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export const KasTenderCard: React.FC<KasTenderCardProps> = ({
  tender,
  onOpenBOQ,
  onEdit,
  onPrint,
  onDuplicate,
  onDelete,
}) => {
  const isAwarded = tender.status.includes('ترسية') || tender.status.includes('فائز') || tender.status.includes('معتمد');

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between space-y-5 overflow-hidden">
      {/* Top Accent Strip */}
      <div className={`absolute top-0 right-0 left-0 h-1.5 ${
        isAwarded 
          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600' 
          : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500'
      }`} />

      {/* Header Info */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            {tender.referenceNumber}
          </span>
          <span className={isAwarded ? 'pill-tag-mint text-xs font-bold' : 'pill-tag-shade text-xs font-bold'}>
            {tender.status}
          </span>
        </div>

        <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pt-1">
          {tender.title}
        </h3>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">{tender.clientName}</span>
        </div>
      </div>

      {/* Financial & Items Overview Box */}
      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">القيمة شاملة الضريبة:</span>
          <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
            {tender.grandTotal.toLocaleString()} <span className="text-xs font-sans">⃁</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
          <span>بنود الكراسة: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">{tender.itemsCount}</strong> بند</span>
          {tender.submissionDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {tender.submissionDate}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onOpenBOQ}
          className="button-primary-pill flex-1 text-xs font-bold flex items-center justify-center gap-2"
          style={{ minHeight: '36px', padding: '6px 16px' }}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>محرر جدول الكميات (BOQ)</span>
        </button>

        {onPrint && (
          <button
            onClick={onPrint}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition"
            title="طباعة العرض الرسمي"
          >
            <Printer className="w-4 h-4" />
          </button>
        )}

        {onEdit && (
          <button
            onClick={onEdit}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-amber-50 hover:text-amber-600 dark:bg-zinc-800 dark:hover:bg-amber-950 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition"
            title="تعديل المنافسة"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition"
            title="نسخ المنافسة"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-red-950 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition"
            title="حذف المنافسة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. KAS SUPPLIER SCORECARD CARD (بطاقة المورد المعتمد والتقييم)
// ============================================================================

export interface KasSupplierCardProps {
  supplier: {
    id: string;
    name: string;
    category: string;
    city: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    rating: number;
    qualityScore: number;
    commitmentScore: number;
    priceCompetitiveness: number;
    totalDeals: number;
    totalValue: number;
    status: string;
  };
  onContactWhatsApp?: () => void;
  onEdit?: () => void;
}

export const KasSupplierCard: React.FC<KasSupplierCardProps> = ({
  supplier,
  onContactWhatsApp,
  onEdit,
}) => {
  return (
    <div className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="pill-tag-mint text-[10px] font-bold">
            {supplier.category}
          </span>
          <h4 className="text-base font-black text-slate-900 dark:text-white mt-1.5 group-hover:text-emerald-600 transition-colors">
            {supplier.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{supplier.city}</span>
            <span>•</span>
            <span>{supplier.contactPerson}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="font-bold text-xs text-amber-700 dark:text-amber-300">{supplier.rating}.0</span>
        </div>
      </div>

      {/* Triple Score Metric Bars */}
      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl space-y-2 text-xs">
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-zinc-600 dark:text-zinc-400">جودة المواد والتوريد</span>
            <span className="font-mono font-bold text-emerald-600">{supplier.qualityScore}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${supplier.qualityScore}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-zinc-600 dark:text-zinc-400">الالتزام بمواعيد التسليم</span>
            <span className="font-mono font-bold text-sky-600">{supplier.commitmentScore}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${supplier.commitmentScore}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-zinc-600 dark:text-zinc-400">التنافسية السعرية</span>
            <span className="font-mono font-bold text-amber-600">{supplier.priceCompetitiveness}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${supplier.priceCompetitiveness}%` }} />
          </div>
        </div>
      </div>

      {/* Contact Action */}
      <div className="flex items-center gap-2 pt-1">
        <a
          href={`tel:${supplier.phone}`}
          className="button-outline-on-light flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ minHeight: '34px', padding: '6px 14px' }}
        >
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
          <span>اتصال</span>
        </a>
        <a
          href={`mailto:${supplier.email}`}
          className="button-outline-on-light flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ minHeight: '34px', padding: '6px 14px' }}
        >
          <Mail className="w-3.5 h-3.5 text-sky-600" />
          <span>بريد</span>
        </a>
      </div>
    </div>
  );
};

// ============================================================================
// 4. KAS INVOICE CARD (بطاقة الفاتورة الضريبية ZATCA الفاخرة)
// ============================================================================

export interface KasInvoiceCardProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    taxAmount: number;
    total?: number;
    date: string;
    dueDate: string;
    status: string;
    project?: string;
  };
  onViewZatca: () => void;
  onQuickPay?: () => void;
  onDelete?: () => void;
}

export const KasInvoiceCard: React.FC<KasInvoiceCardProps> = ({
  invoice,
  onViewZatca,
  onQuickPay,
  onDelete,
}) => {
  const isPaid = invoice.status === 'مدفوع';
  const grandTotal = invoice.total || (invoice.amount + invoice.taxAmount);

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 space-y-4 overflow-hidden">
      {/* Top Accent line */}
      <div className={`absolute top-0 right-0 left-0 h-1.5 ${
        isPaid 
          ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
          : 'bg-gradient-to-r from-amber-500 to-rose-400'
      }`} />

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
          <Hash className="w-3.5 h-3.5" />
          {invoice.invoiceNumber}
        </span>
        <span className={isPaid ? 'pill-tag-mint text-xs font-bold' : 'pill-tag-shade text-xs font-bold'}>
          {invoice.status}
        </span>
      </div>

      <div>
        <h4 className="text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-emerald-600 transition-colors">
          {invoice.clientName}
        </h4>
        {invoice.project && (
          <span className="text-xs text-zinc-400 mt-0.5 block truncate">
            المشروع: {invoice.project}
          </span>
        )}
      </div>

      {/* Financial Details */}
      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">الإجمالي شامل الضريبة:</span>
          <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
            {grandTotal.toLocaleString()} <span className="text-xs font-sans">⃁</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
          <span>الضريبة (15%): <strong className="text-zinc-600 dark:text-zinc-300 font-mono">{invoice.taxAmount.toLocaleString()} ⃁</strong></span>
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-zinc-400" />
            استحقاق: {invoice.dueDate}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onViewZatca}
          className="button-primary-pill flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ minHeight: '36px', padding: '6px 14px' }}
        >
          <QrCode className="w-4 h-4" />
          <span>عرض / ZATCA Phase 2</span>
        </button>

        {!isPaid && onQuickPay && (
          <button
            onClick={onQuickPay}
            className="button-outline-on-light text-xs font-bold"
            style={{ minHeight: '36px', padding: '6px 14px' }}
            title="تسجيل سداد"
          >
            سداد
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-red-950 text-zinc-600 flex items-center justify-center transition"
            title="حذف الفاتورة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

