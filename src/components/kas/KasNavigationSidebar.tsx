import i18n from '../../i18n/config';
import React from 'react';
import { 
  Building2, Briefcase, FileSpreadsheet, Layers, ShieldCheck, 
  Users, Truck, Receipt, CloudLightning, ShieldAlert, ArrowRight,
  ChevronLeft, Award, Sparkles, MapPin, PhoneCall, ExternalLink,
  CheckCircle2, Flame, Calculator, Store
} from 'lucide-react';

export type KasDepartmentId = 
  | 'command-center'
  | 'monafasat'
  | 'boq-editor'
  | 'suppliers'
  | 'purchase-orders'
  | 'contracts-projects'
  | 'zatca-invoices'
  | 'etmad-cloud-api'
  | 'audit-security';

interface KasNavigationSidebarProps {
  activeDept: KasDepartmentId;
  onSelectDept: (dept: KasDepartmentId) => void;
  onReturnToErp?: () => void;
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
}

export const KAS_DEPARTMENTS: {
  id: KasDepartmentId;
  title: string;
  titleEn: string;
  badge?: string;
  badgeColor?: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}[] = [
  {
    id: 'command-center',
    title: 'مركز العمليات والمؤشرات التنفيذية',
    titleEn: 'Command Center & Executive KPIs',
    badge: 'لحظي',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Building2,
    description: 'مؤشرات الترسية، مبيعات ZATCA، كراسات BOQ، ونسب الإنجاز',
  },
  {
    id: 'monafasat',
    title: 'منصة اعتماد والمنافسات الحكومية',
    titleEn: 'Etmad Competitions Directory',
    badge: '2,651 منافسة',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Layers,
    description: 'استعراض المنافسات المطروحة، مواعيد الإغلاق، والضمانات البنكية',
  },
  {
    id: 'boq-editor',
    title: 'محرر جداول الكميات الذكي (BOQ)',
    titleEn: 'Live Excel-Style BOQ Editor',
    badge: 'Excel Live',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Calculator,
    description: 'تسعير البنود، حساب الهامش، الضريبة 15%، التفقيط، والتصدير 10 صيغ',
  },
  {
    id: 'suppliers',
    title: 'سجل الموردين والمقاولين المعتمدين',
    titleEn: 'Approved Suppliers & Subcontractors',
    badge: '48 مورد',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Store,
    description: 'مقارنة عروض الأسعار، سجل الأسعار التاريخي، والتقييم الفني',
  },
  {
    id: 'purchase-orders',
    title: 'أوامر التوريد وصرف المستودعات',
    titleEn: 'Purchase Orders & Warehousing',
    badge: '18 أمر صرف',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Truck,
    description: 'إصدار أوامر الصرف لمستودعات كاس المركزية للمشاريع المعتمدة',
  },
  {
    id: 'contracts-projects',
    title: 'ترسية المشاريع والعقود الحكومية',
    titleEn: 'Awards, Projects & Contracts',
    badge: '12 مشروع',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Award,
    description: 'مشاريع اليوم الوطني، الموانئ، الوزارات، والمستخلصات الدورية',
  },
  {
    id: 'zatca-invoices',
    title: 'الفوترة الإلكترونية ZATCA المرحلة 2',
    titleEn: 'E-Invoicing & Tax Compliance',
    badge: 'QR مشفر',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: Receipt,
    description: 'فواتير ضريبية معتمدة، إشعارات دائنة/مدينة، وربط هيئة الزكاة',
  },
  {
    id: 'etmad-cloud-api',
    title: 'مركز تكامل سحابة اعتماد (API)',
    titleEn: 'Etmad Cloud Hub & Webhooks',
    badge: 'Active Hub',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: CloudLightning,
    description: 'المزامنة السحابية اللحظية للمنافسات والبيانات والمستندات الرسمية',
  },
  {
    id: 'audit-security',
    title: 'الأمان وسجل التدقيق وعزل البيانات',
    titleEn: 'KAS Audit Log & Zero Leakage',
    badge: 'عزل تام 100%',
    badgeColor: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
    icon: ShieldCheck,
    description: 'سجل حركات الفريق، تشفير المعاملات، ومنع التسريب المشترك',
  },
];

export const KAS_BRANCHES = [
  { id: 'riyadh', name: 'المقر الرئيسي — الرياض (طريق الملك فهد)', code: 'RUH-HQ' },
  { id: 'jeddah', name: 'فرع المشاريع الغربية — جدة (الميناء)', code: 'JED-PRJ' },
  { id: 'dammam', name: 'فرع التوريدات الشرقية — الدمام (الصناعية)', code: 'DMM-SUP' },
];

export const KasNavigationSidebar: React.FC<KasNavigationSidebarProps> = ({
  activeDept,
  onSelectDept,
  onReturnToErp,
  selectedBranch,
  onSelectBranch,
}) => {
  return (
    <aside 
      className="w-72 bg-[#ffffff] text-[#141414] border-l border-[#e0e0e0] flex flex-col h-full select-none shrink-0 shadow-2xl overflow-hidden"
      dir="rtl"
    >
      {/* Brand & Entity Header */}
      <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#141414] text-[#ffffff] flex items-center justify-center font-bold text-base shadow-lg shrink-0">
            {i18n.t("company.kasCode", "KAS")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                منظومة معزولة
              </span>
              <span className="text-[10px] text-[#707070] font-mono">RC04</span>
            </div>
            <h2 className="text-sm font-bold text-[#141414] truncate m-0 mt-0.5">
              مؤسسة كاس للتجارة والمنافسات
            </h2>
            <p className="text-[10px] text-[#707070] truncate m-0 font-sans">
              سحابة اعتماد وجداول الكميات الذكية (BOQ)
            </p>
          </div>
        </div>

        {/* Commercial Registration & Tax Number Pill */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-[10px] font-mono">
          <div>
            <span className="text-[#707070] block">السجل التجاري:</span>
            <span className="text-[#141414] font-bold">1010789234</span>
          </div>
          <div>
            <span className="text-[#707070] block">الرقم الضريبي ZATCA:</span>
            <span className="text-[#141414] font-bold truncate block">310284759200003</span>
          </div>
        </div>

        {/* Branch Quick Switcher */}
        <div className="mt-3">
          <label className="text-[10.5px] font-bold text-[#707070] block mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#141414]" />
            <span>نطاق الفرع التشغيلي لكاس:</span>
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-2.5 py-1.5 text-xs text-[#141414] outline-none focus:border-[#141414] cursor-pointer font-sans"
          >
            {KAS_BRANCHES.map((branch) => (
              <option key={branch.id} value={branch.name} className="bg-[#ffffff] text-[#141414]">
                {branch.name} ({branch.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 9 Specialized Departments Navigation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
        <div className="px-2 py-1 text-[10.5px] font-bold text-[#707070] uppercase tracking-wider">
          أقسام منظومة كاس المستقلة (9 أقسام):
        </div>

        {KAS_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept === dept.id;

          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => onSelectDept(dept.id)}
              className={`w-full text-right p-2.5 rounded-xl transition-all duration-150 flex items-start gap-3 relative group ${
                isActive
                  ? 'bg-gradient-to-l from-[#f3f3f3] to-[#f3f3f3] text-[#141414] border border-[#e0e0e0] shadow-md '
                  : 'text-[#707070] hover:text-[#141414] hover:bg-[#f3f3f3] border border-transparent'
              }`}
            >
              <div 
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-[#141414] text-[#ffffff] shadow-md  font-bold' 
                    : 'bg-[#f3f3f3] text-[#707070] group-hover:text-[#141414] group-hover:bg-[#f3f3f3]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isActive ? 'text-[#141414]' : 'text-[#141414]'}`}>
                    {dept.title}
                  </span>
                  {dept.badge && (
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${dept.badgeColor || 'bg-zinc-800 text-[#141414]'}`}>
                      {dept.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#707070] line-clamp-1 mt-0.5 leading-tight">
                  {dept.description}
                </p>
              </div>

              {isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-1 bg-[#141414] rounded-l-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Emergency Support & Return to Central ERP */}
      <div className="p-3 border-t border-[#e0e0e0] bg-[#ffffff] space-y-2">
        {/* Quick Hotline & Security Status */}
        <div className="p-2 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-[10.5px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#141414]">
            <span className="w-2 h-2 rounded-full bg-[#141414] animate-pulse"></span>
            <span className="font-bold">العزل مفعل (Zero Cross-Leakage)</span>
          </div>
          <span className="text-[#707070] text-[9.5px] font-mono">v2026.9</span>
        </div>

        {onReturnToErp && (
          <button
            type="button"
            onClick={onReturnToErp}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-[#141414] bg-[#f3f3f3] hover:bg-[#f3f3f3] border border-[#e0e0e0] hover:border-[#e0e0e0] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 text-[#141414]" />
            <span>العودة لمنظومة المجموعة الرئيسية (ERP)</span>
          </button>
        )}
      </div>
    </aside>
  );
};
