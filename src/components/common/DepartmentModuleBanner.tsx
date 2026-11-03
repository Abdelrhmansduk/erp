import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  Layers,
  ArrowUpLeft,
  Star,
  ChevronLeft,
  Minimize2,
  Maximize2,
  Lightbulb,
  Search,
  UploadCloud,
  CheckCircle2,
  X,
  Users,
  Zap,
  MapPin,
  Play,
} from 'lucide-react';
import { BusinessIllustration } from './BusinessIllustration';
import { CorporateAvatar } from './CorporateAvatar';
import { EmployeePhotoAvatar } from '../auth/EmployeePhotoAvatar';
import { DynamicActionButton } from './DynamicActionButton';
import {
  resolveIllustrationForTab,
  getIllustrationMetadata,
} from '../../services/visualAssetsRegistry';
import {
  authService,
  CORPORATE_DEPARTMENTS,
  DepartmentId,
  resolveDepartmentAndCompany,
  getFullStaffDirectory,
  COMPANY_AUTH_METADATA,
} from '../../services/authService';
import {
  employeeOperationsEngine,
  ExecutedEmployeeOperation,
} from '../../services/employeeOperationsEngine';
import { realErpDataStore } from '../../services/realErpDataStore';
import { ExportDropdown } from './ExportDropdown';
import { useCompany } from '../../contexts/CompanyContext';
import { useAppStore } from '../../stores/appStore';
import { getPinnedTabs, togglePinnedTab, PinnedTabItem } from './QuickSearchModal';
import { SLUG_ARABIC_TITLES } from '../layout/Header';

interface DepartmentModuleBannerProps {
  activeTab: string;
  activeTabTitle?: string;
  onSelectTab: (href: string, title: string) => void;
}

const SLIM_BANNER_STORAGE_KEY = 'alsulaim_banner_slim_mode_v1';

const DEPARTMENT_QUICK_TABS: Record<DepartmentId, Array<{ key: string; label: string }>> = {
  finance: [
    { key: 'smacc-accounting', label: 'النظام المحاسبي والمالي' },
    { key: 'smacc-gl-tree', label: 'شجرة الحسابات (GL)' },
    { key: 'smacc-vouchers', label: 'سندات القبض والصرف' },
    { key: 'finance-home', label: 'القوائم المالية' },
    { key: 'trial-balance', label: 'ميزان المراجعة' },
    { key: 'income-statement', label: 'قائمة الدخل' },
    { key: 'zatca', label: 'الفوترة الإلكترونية ZATCA' },
    { key: 'invoices', label: 'فواتير المبيعات والعقود' },
    { key: 'journals', label: 'قيود اليومية' },
    { key: 'financial-requests', label: 'العهد وطلبات الصرف' },
    { key: 'cost-centers', label: 'مراكز التكلفة' },
    { key: 'smacc-inventory', label: 'المخزون والأصول' },
    { key: 'smacc-modules', label: 'الأقسام المحاسبية الـ 6' },
    { key: 'universal-extractor', label: 'مستخرج الـ 100 فاتورة' },
  ],
  recruitment: [
    { key: 'recruitment-contracts', label: 'عقود الاستقدام (مساند)' },
    { key: 'new-recruitment-contract', label: '+ عقد استقدام جديد' },
    { key: 'orders', label: 'طلبات الاستقدام والحجوزات' },
    { key: 'pending-orders', label: 'طلبات قيد الإجراء' },
    { key: 'ingaz', label: 'تفاويض إنجاز والتأشيرات' },
    { key: 'sponsorship-transfer', label: 'نقل الخدمات والكفالة' },
    { key: 'probation-transfer', label: 'فترة التجربة (90 يوم)' },
    { key: 'travel', label: 'الرحلات واستقبال المطار' },
    { key: 'group-dispatch', label: 'تفويج العاملات الجماعي' },
    { key: 'musaned-master-plan', label: 'الربط المباشر مع مساند' },
  ],
  rental: [
    { key: 'rent-contracts', label: 'عقود التأجير المرن' },
    { key: 'new-rent-contract', label: '+ عقد تأجير جديد' },
    { key: 'rent-packages', label: 'باقات وأسعار التأجير' },
    { key: 'rental-drivers', label: 'تشغيل السائقين' },
    { key: 'rental-domestic', label: 'تشغيل العمالة المنزلية' },
    { key: 'cvs-rental', label: 'سير التأجير الجاهزة' },
    { key: 'returned-rent', label: 'عقود التأجير المرتجعة' },
  ],
  ats: [
    { key: 'cvs-recruitment', label: 'بنك السير الذاتية' },
    { key: 'ats-pipeline', label: 'مسار الفرز الذكي ATS' },
    { key: 'create-cv', label: '+ إضافة سيرة ذاتية' },
    { key: 'offices', label: 'المكاتب والوكالات الخارجية' },
    { key: 'agent-accounts', label: 'كشوف حسابات الوكلاء' },
    { key: 'office-transfers', label: 'حوالات المكاتب الخارجية' },
    { key: 'external-offices', label: 'عقود وحصص الوكلاء' },
    { key: 'foreign-agency-portal', label: 'بوابة الوكيل الخارجي' },
    { key: 'agent-imports', label: 'استيراد دفعات السير' },
  ],
  hr: [
    { key: 'employees', label: 'شؤون الموظفين والرواتب' },
    { key: 'employee-salaries', label: 'مسيرات الرواتب WPS' },
    { key: 'employee-contracts', label: 'عقود قوى والتأمينات' },
    { key: 'employee-leaves', label: 'الإجازات والاستحقاقات' },
    { key: 'attendances', label: 'الحضور والانصراف الذكي' },
    { key: 'employee-monitoring', label: 'مراقبة الأداء والإنتاجية' },
    { key: 'custodies', label: 'العهد العينية للموظفين' },
    { key: 'branch-departments', label: 'هيكل الفروع والأقسام' },
    { key: 'smacc-employees', label: 'إعدادات موظفي المالية' },
  ],
  crm: [
    { key: 'clients', label: 'سجل العملاء والمبيعات' },
    { key: 'vip-clients', label: 'كبار العملاء VIP' },
    { key: 'corporate-clients', label: 'عملاء الشركات B2B' },
    { key: 'complaints', label: 'الشكاوى ومؤشر SLA' },
    { key: 'whatsapp-inbox', label: 'صندوق واتساب الموحد' },
    { key: 'unified-communication', label: 'مركز الاتصال الموحد' },
    { key: 'sent-messages', label: 'حملات الرسائل والإشعارات' },
    { key: 'client-portal', label: 'بوابة الخدمة الذاتية للعميل' },
    { key: 'website-visitors', label: 'تحليلات زوار المنصة' },
  ],
  shelter: [
    { key: 'shelter-suite', label: 'بوابة دار الرواد للإيواء' },
    { key: 'inside-shelter', label: 'العاملات داخل الإيواء' },
    { key: 'room-management', label: 'إدارة الغرف والأسرة' },
    { key: 'food-catering', label: 'الإعاشة والرعاية الصحية' },
    { key: 'available-transfer', label: 'جاهزات لنقل الكفالة' },
    { key: 'deportation-stage', label: 'إجراءات الترحيل النظامي' },
    { key: 'shelter-archive', label: 'أرشيف الخروج النهائي' },
  ],
  tenders: [
    { key: 'kas-suite', label: 'بوابة شركة كاس المستقلة' },
    { key: 'tenders-boq', label: 'منافسات اعتماد وجداول BOQ' },
    { key: 'kas-etmad-cloud', label: 'سحابة اعتماد (2,650+ منافسة)' },
    { key: 'purchase-orders', label: 'أوامر الشراء والتوريد' },
    { key: 'project-guarantees', label: 'الضمانات البنكية للمشاريع' },
  ],
  executive: [
    { key: 'dashboard', label: 'لوحة القيادة التنفيذية' },
    { key: 'group-command-center', label: 'مركز قيادة المجموعة (5 شركات)' },
    { key: 'admin-dashboard', label: 'لوحة الرقابة العليا' },
    { key: 'reports', label: 'التقارير التحليلية BI' },
    { key: 'iam', label: 'الهوية والصلاحيات IAM' },
    { key: 'users', label: 'إدارة المستخدمين' },
    { key: 'legal-compliance', label: 'الحوكمة والامتثال القانوني' },
    { key: 'master-constants', label: 'ثوابت النظام المرجعية' },
    { key: 'activity-logs', label: 'سجل التدقيق والعمليات' },
    { key: 'settings', label: 'إعدادات النظام والربط' },
  ],
};

const DEPARTMENT_GUIDED_PLAYBOOKS: Record<
  DepartmentId,
  Array<{ title: string; desc: string; targetTab: string; badge: string }>
> = {
  finance: [
    {
      title: 'استخلاص 100+ فاتورة وترحيلها للدفتر المحاسبي',
      desc: 'ارفع ملفات PDF أو صور الفواتير ليقوم الماسح الذكي بتوليد قيود اليومية تلقائياً.',
      targetTab: 'universal-extractor',
      badge: 'OCR ذكي',
    },
    {
      title: 'مراجعة ميزان المراجعة والأقسام المالية الـ 6',
      desc: 'افحص توازن المدين والدائن وحسابات الصندوق والبنوك والذمم.',
      targetTab: 'smacc-accounting',
      badge: 'المحاسبة',
    },
    {
      title: 'إصدار وتوثيق فاتورة ضريبية ZATCA',
      desc: 'توليد فاتورة المرحلة الثانية بصيغة XML UBL 2.1 مع ختم QR المشفر.',
      targetTab: 'zatca',
      badge: 'فاتورة ZATCA',
    },
    {
      title: 'اعتماد طلبات الصرف والعهد المالية',
      desc: 'مراجعة طلبات السلف والعهد المرفوعة من الفروع وإصدار سندات الصرف.',
      targetTab: 'financial-requests',
      badge: 'سندات',
    },
  ],
  recruitment: [
    {
      title: 'إنشاء وتوثيق عقد استقدام مساند جديد',
      desc: 'تسجيل بيانات العميل والتأشيرة والمرشحة وإصدار العقد الموحد.',
      targetTab: 'recruitment-contracts',
      badge: 'مساند',
    },
    {
      title: 'متابعة تفاويض التأشيرات في منصة إنجاز',
      desc: 'ربط رقم التأشيرة بالوكالة الخارجية ومتابعة التفييز بالسفارة.',
      targetTab: 'ingaz',
      badge: 'إنجاز',
    },
    {
      title: 'جدولة رحلات الوصول واستقبال المطار',
      desc: 'متابعة بوليصات الطيران وتوجيه السائقين لاستلام العاملات من المطار.',
      targetTab: 'travel',
      badge: 'المطار',
    },
    {
      title: 'إدارة إجراءات نقل الخدمات وفترة التجربة',
      desc: 'تقييم الـ 90 يوماً وإتمام نقل الكفالة والمقاصة المالية.',
      targetTab: 'sponsorship-transfer',
      badge: 'نقل خدمات',
    },
  ],
  rental: [
    {
      title: 'تحرير عقد تأجير مرن (شهري / موسمي / بالساعة)',
      desc: 'اختيار الكادر المتاح والباقة المناسبة وجدولة دفعات الإيجار.',
      targetTab: 'rent-contracts',
      badge: 'عقد إيجار',
    },
    {
      title: 'تحديث باقات وأسعار التأجير والعروض',
      desc: 'إدارة تسعير الباقات والخصومات الموسمية لشركة الياقوت.',
      targetTab: 'rent-packages',
      badge: 'الباقات',
    },
    {
      title: 'جدولة تشغيل السائقين والعمالة المنزلية',
      desc: 'متابعة العقود النشطة وتواريخ التجديد والاستبدال.',
      targetTab: 'rental-drivers',
      badge: 'التشغيل',
    },
    {
      title: 'فرز السير الذاتية الجاهزة للتأجير الفوري',
      desc: 'استعراض الكوادر المتوفرة داخل المملكة والجاهزة للتسليم.',
      targetTab: 'cvs-rental',
      badge: 'جاهز للتسليم',
    },
  ],
  ats: [
    {
      title: 'إضافة سيرة ذاتية أو مسح جواز سفر مرشح',
      desc: 'إنشاء بطاقة مرشح احترافية مع معاينة الأفاتار واستخلاص بيانات الجواز.',
      targetTab: 'create-cv',
      badge: 'إنشاء سيرة',
    },
    {
      title: 'تحريك المرشحين عبر مسار الفرز ATS (12 مرحلة)',
      desc: 'متابعة الفحص الطبي، المقابلة، التدريب، وإصدار التذكرة.',
      targetTab: 'ats-pipeline',
      badge: 'ATS Kanban',
    },
    {
      title: 'إدارة عقود وحوالات الوكالات والمكاتب الخارجية',
      desc: 'ضبط حصص المكاتب في 14 دولة ومتابعة العمولات والحوالات الدولية.',
      targetTab: 'offices',
      badge: 'الوكلاء',
    },
    {
      title: 'استيراد دفعة سير ذاتية من الوكيل الخارجي',
      desc: 'فحص وقبول دفعات المرشحين المرسلة من الوكالات المعتمدة.',
      targetTab: 'agent-imports',
      badge: 'استيراد دفعات',
    },
  ],
  hr: [
    {
      title: 'إصدار مسير الرواتب وملف حماية الأجور WPS',
      desc: 'احتساب الرواتب، البدلات، التأمينات GOSI، وتصدير ملف البنك.',
      targetTab: 'employees',
      badge: 'WPS & GOSI',
    },
    {
      title: 'مراقبة البصمة الجغرافية والحضور والانصراف',
      desc: 'متابعة الالتزام اليومي وساعات العمل الإضافي والاستئذان.',
      targetTab: 'attendances',
      badge: 'الحضور',
    },
    {
      title: 'رادار الإنتاجية والنبض الوظيفي الذكي',
      desc: 'تحليل مؤشرات الإنجاز والوقاية من الاحتراق الوظيفي وجلسات 1-on-1.',
      targetTab: 'employee-monitoring',
      badge: 'الإنتاجية',
    },
    {
      title: 'إدارة العهد العينية وهيكل الفروع والأقسام',
      desc: 'توثيق تسليم الأجهزة والسيارات وتوزيع الإدارات عبر الشركات الخمس.',
      targetTab: 'custodies',
      badge: 'العهد والفروع',
    },
  ],
  crm: [
    {
      title: 'إدارة سجل العملاء وتصنيفات VIP والشركات',
      desc: 'متابعة ملفات العملاء، العقود المرتبطة، وسجل التواصل.',
      targetTab: 'clients',
      badge: 'العملاء',
    },
    {
      title: 'معالجة الشكاوى والمطالبات ضمن مؤشر SLA',
      desc: 'حل بلاغات العملاء وإصدار التسويات والحوالات البنكية المعتمدة.',
      targetTab: 'complaints',
      badge: 'SLA الشكاوى',
    },
    {
      title: 'الرد الفوري عبر صندوق واتساب المؤسسي الموحد',
      desc: 'محادثات العملاء الفورية وقوالب الرد السريع المعتمدة.',
      targetTab: 'whatsapp-inbox',
      badge: 'واتساب',
    },
    {
      title: 'متابعة بوابة العميل وتحليلات زوار المنصة',
      desc: 'رصد الطلبات الرقمية الواردة من الموقع وتحويل الزوار إلى عقود.',
      targetTab: 'website-visitors',
      badge: 'زوار المنصة',
    },
  ],
  shelter: [
    {
      title: 'تسكين عاملة جديدة وإدارة الغرف والأسرة',
      desc: 'توثيق دخول العاملة لمركز دار الرواد وتخصيص الغرفة والجناح.',
      targetTab: 'shelter-suite',
      badge: 'دار الرواد',
    },
    {
      title: 'متابعة الإعاشة اليومية والرعاية الصحية والنفسية',
      desc: 'جدولة الوجبات والفحوصات الدورية للنزيلات داخل الإيواء.',
      targetTab: 'food-catering',
      badge: 'الإعاشة والرعاية',
    },
    {
      title: 'تجهيز العاملات المتاحات لنقل الخدمات الفوري',
      desc: 'عرض ملفات العاملات الجاهزات للتجربة ونقل الكفالة.',
      targetTab: 'available-transfer',
      badge: 'نقل الكفالة',
    },
    {
      title: 'إتمام إجراءات السفر والترحيل النظامي النهائي',
      desc: 'إصدار تأشيرة الخروج النهائي وحجز تذكرة العودة وتوثيق المخالصة.',
      targetTab: 'deportation-stage',
      badge: 'الترحيل',
    },
  ],
  tenders: [
    {
      title: 'استعراض سحابة منافسات اعتماد (2,650+ منافسة)',
      desc: 'تحليل المنافسات الحكومية ونسب التطابق والفرص الاستثمارية.',
      targetTab: 'kas-etmad-cloud',
      badge: 'سحابة اعتماد',
    },
    {
      title: 'تسعير جداول الكميات BOQ وإصدار أوامر الشراء',
      desc: 'حساب التكاليف المباشرة وهوامش الربح والضمانات البنكية.',
      targetTab: 'tenders-boq',
      badge: 'BOQ & PO',
    },
    {
      title: 'إدارة محفظة المشاريع في بوابة شركة كاس المستقلة',
      desc: 'متابعة نسب الإنجاز، المستخلصات المالية، والجدول الزمني للمشاريع.',
      targetTab: 'kas-suite',
      badge: 'بوابة كاس',
    },
    {
      title: 'استخلاص كراسة الشروط وجداول الكميات بالذكاء الاصطناعي',
      desc: 'رفع ملف المنافسة PDF/Excel لتحليله واستخراج البنود تلقائياً.',
      targetTab: 'universal-extractor',
      badge: 'ماسح الكراسات',
    },
  ],
  executive: [
    {
      title: 'مراقبة أداء الشركات الـ 5 في مركز قيادة المجموعة',
      desc: 'مقارنة الإيرادات، التدفقات النقدية، والعقود النشطة لكل كيان.',
      targetTab: 'group-command-center',
      badge: 'قيادة المجموعة',
    },
    {
      title: 'ضبط الهوية والصلاحيات ومصفوفة الأدوار IAM',
      desc: 'إدارة الـ 28 حساباً، فصل المهام SoD، والتفويضات الإدارية.',
      targetTab: 'iam',
      badge: 'IAM & RBAC',
    },
    {
      title: 'استعراض القوائم المالية الموحدة وتقارير BI',
      desc: 'تحليل قائمة الدخل والميزانية العمومية المجمعة للمجموعة.',
      targetTab: 'reports',
      badge: 'تقارير BI',
    },
    {
      title: 'فحص سجل الرقابة والتدقيق الأمني والامتثال القانوني',
      desc: 'متابعة كافة العمليات الحساسة والتعهدات النظامية.',
      targetTab: 'activity-logs',
      badge: 'التدقيق الأمني',
    },
  ],
};

// Tabs that already render their own full-width hero banner inside the page component
const TABS_WITH_INTERNAL_HERO = new Set([
  'dashboard',
  'group-command-center',
  'smacc-accounting',
  'smacc-gl-tree',
  'smacc-vouchers',
  'smacc-inventory',
  'smacc-modules',
  'kas-suite',
  'shelter-suite',
  'iam',
  'iam-security',
  'tenders-boq',
  'kas-etmad-cloud',
  'kas-etmad',
  'admin-dashboard',
  'employee-monitoring',
  'universal-extractor',
  'musaned-master-plan',
  'ats-pipeline',
  'foreign-agency-portal',
  'client-portal',
  'legal-compliance',
]);

export const DepartmentModuleBanner: React.FC<DepartmentModuleBannerProps> = ({
  activeTab,
  activeTabTitle,
  onSelectTab,
}) => {
  const { activeCompany, activeCompanyId, setActiveCompanyId } = useCompany();
  const { setQuickSearchOpen, addNotification } = useAppStore();
  const currentUser = authService.getCurrentUser();
  const scope = resolveDepartmentAndCompany(
    currentUser?.email || currentUser?.username || '',
    currentUser?.role,
    currentUser?.company_id || activeCompany?.id,
    currentUser?.department_id
  );

  const [isSlimMode, setIsSlimMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SLIM_BANNER_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [pinnedTabs, setPinnedTabs] = useState<PinnedTabItem[]>(() => getPinnedTabs());
  const [showPlaybook, setShowPlaybook] = useState<boolean>(false);
  const [showStaffOpsDrawer, setShowStaffOpsDrawer] = useState<boolean>(false);
  const [staffScopeFilter, setStaffScopeFilter] = useState<'all' | 'dept'>('all');
  const [executedOps, setExecutedOps] = useState<ExecutedEmployeeOperation[]>([]);
  const [activeSectionRows, setActiveSectionRows] = useState<any[]>([]);
  const [runningStaffId, setRunningStaffId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const tabExportTarget = React.useMemo(() => {
    const t = (activeTab || '').toLowerCase();
    if (t.includes('zatca')) return { sectionKey: 'zatca_invoices', storeTable: 'zatca_invoices' };
    if (t.includes('trial-balance')) return { sectionKey: 'trial_balance', storeTable: '' };
    if (t.includes('income-statement') || t.includes('balance-sheet'))
      return { sectionKey: 'income_statement', storeTable: '' };
    if (t.includes('smacc-gl-tree') || t.includes('chart-of-account'))
      return { sectionKey: 'chart_of_accounts', storeTable: '' };
    if (t.includes('journal') || t.includes('smacc-voucher') || t.includes('smacc-journal'))
      return { sectionKey: 'journals', storeTable: 'journal_entries' };
    if (t.includes('financial-request'))
      return { sectionKey: 'financial_requests', storeTable: 'financial_requests' };
    if (t.includes('cost-center')) return { sectionKey: 'cost_centers', storeTable: 'cost_centers' };
    if (t.includes('inventory')) return { sectionKey: 'inventory', storeTable: '' };
    if (t.includes('custod')) return { sectionKey: 'custodies', storeTable: 'custodies' };
    if (t.includes('invoice') || t.includes('finance') || t.includes('smacc'))
      return { sectionKey: 'invoices', storeTable: 'invoices' };
    if (t.includes('recruitment-contract') || t.includes('musaned') || t.includes('create-contract'))
      return { sectionKey: 'recruitment_contracts', storeTable: 'recruitment_contracts' };
    if (t.includes('rent') || t.includes('rental'))
      return { sectionKey: 'rent_contracts', storeTable: 'rent_contracts' };
    if (t.includes('order') && !t.includes('purchase'))
      return { sectionKey: 'orders', storeTable: 'orders' };
    if (t.includes('ingaz')) return { sectionKey: 'ingaz', storeTable: 'ingaz_records' };
    if (t.includes('dispatch')) return { sectionKey: 'group_dispatch', storeTable: '' };
    if (t.includes('travel')) return { sectionKey: 'travel', storeTable: 'travel_flights' };
    if (t.includes('transfer') || t.includes('probation'))
      return { sectionKey: 'sponsorship_transfer', storeTable: 'sponsorship_transfers' };
    if (t.includes('cv') || t.includes('ats') || t.includes('agent-import') || t.includes('foreign'))
      return { sectionKey: 'cvs_recruitment', storeTable: 'cvs' };
    if (t.includes('external-office'))
      return { sectionKey: 'external_offices', storeTable: 'offices' };
    if (t.includes('office') || t.includes('agent-account'))
      return { sectionKey: 'offices', storeTable: 'offices' };
    if (t.includes('attendance')) return { sectionKey: 'attendances', storeTable: 'attendances' };
    if (t.includes('monitoring'))
      return { sectionKey: 'employee_monitoring', storeTable: 'attendances' };
    if (t.includes('branch-department'))
      return { sectionKey: 'branch_departments', storeTable: '' };
    if (t.includes('employee')) return { sectionKey: 'employees', storeTable: 'employees' };
    if (t.includes('complaint')) return { sectionKey: 'complaints', storeTable: 'complaints' };
    if (t.includes('whatsapp')) return { sectionKey: 'whatsapp_inbox', storeTable: '' };
    if (t.includes('visitor')) return { sectionKey: 'website_visitors', storeTable: '' };
    if (t.includes('communication') || t.includes('message'))
      return { sectionKey: 'sent_messages', storeTable: '' };
    if (t.includes('client')) return { sectionKey: 'clients', storeTable: 'clients' };
    if (
      t.includes('shelter') ||
      t.includes('room-management') ||
      t.includes('catering') ||
      t.includes('deportation')
    )
      return { sectionKey: 'shelter_workers', storeTable: 'shelter_workers' };
    if (t.includes('purchase-order'))
      return { sectionKey: 'purchase_orders', storeTable: '' };
    if (t.includes('guarantee'))
      return { sectionKey: 'project_guarantees', storeTable: '' };
    if (t.includes('kas') || t.includes('tender'))
      return { sectionKey: 'tenders_boq', storeTable: 'tenders' };
    if (t.includes('legal')) return { sectionKey: 'legal_compliance', storeTable: '' };
    if (t.includes('report')) return { sectionKey: 'reports', storeTable: '' };
    if (t.includes('iam')) return { sectionKey: 'iam-security', storeTable: 'users' };
    if (t.includes('user')) return { sectionKey: 'users', storeTable: 'users' };
    if (t.includes('activity-log'))
      return { sectionKey: 'activity_logs', storeTable: 'activity_log' };
    return { sectionKey: 'employee_executed_ops', storeTable: '' };
  }, [activeTab]);

  const loadExecutedOps = async () => {
    const ops = await employeeOperationsEngine.getExecutedOperations();
    setExecutedOps(ops);
  };

  const loadActiveSectionStoreData = React.useCallback(async () => {
    if (!tabExportTarget.storeTable) {
      setActiveSectionRows([]);
      return;
    }
    try {
      const res = await realErpDataStore.getRecords<any>(tabExportTarget.storeTable, []);
      if (Array.isArray(res) && res.length > 0) {
        setActiveSectionRows(res);
      } else {
        setActiveSectionRows([]);
      }
    } catch {
      setActiveSectionRows([]);
    }
  }, [tabExportTarget.storeTable]);

  useEffect(() => {
    void loadActiveSectionStoreData();
  }, [loadActiveSectionStoreData]);

  const resolveWorkspaceExportData = React.useCallback((): any[] => {
    if (typeof document !== 'undefined') {
      const tables = Array.from(document.querySelectorAll('main table, .page-content table, table'));
      for (const tbl of tables) {
        const headers = Array.from(tbl.querySelectorAll('thead th'))
          .map((th) => (th.textContent || '').trim())
          .filter((h) => h && h !== 'إجراءات' && h !== 'الإجراءات' && h !== 'التحكم');
        const bodyRows = Array.from(tbl.querySelectorAll('tbody tr'));
        if (headers.length >= 2 && bodyRows.length >= 1) {
          const extracted: Record<string, any>[] = [];
          for (const tr of bodyRows) {
            const cells = Array.from(tr.querySelectorAll('td'));
            if (cells.length < 2) continue;
            const hasLeadingCheckbox = Boolean(cells[0]?.querySelector('input[type="checkbox"]'));
            const offset = hasLeadingCheckbox ? 1 : 0;
            const rowObj: Record<string, any> = {};
            let nonEmptyCount = 0;
            headers.forEach((h, idx) => {
              const cell = cells[idx + offset];
              if (cell) {
                const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
                rowObj[h] = text;
                if (text) nonEmptyCount++;
              }
            });
            if (nonEmptyCount >= 2) {
              extracted.push(rowObj);
            }
          }
          if (extracted.length > 0 && activeSectionRows.length === 0) {
            return extracted;
          }
        }
      }
    }
    if (activeSectionRows.length > 0) {
      return activeSectionRows;
    }
    return executedOps;
  }, [activeSectionRows, executedOps]);

  useEffect(() => {
    void loadExecutedOps();
    const handleToggleSlim = () => {
      setIsSlimMode((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(SLIM_BANNER_STORAGE_KEY, String(next));
        } catch {
          // ignore
        }
        return next;
      });
    };
    const handleFavoritesUpdated = (e: Event) => {
      const custom = e as CustomEvent<PinnedTabItem[]>;
      if (custom.detail) {
        setPinnedTabs(custom.detail);
      } else {
        setPinnedTabs(getPinnedTabs());
      }
    };
    const handleOpsUpdated = () => {
      void loadExecutedOps();
      void loadActiveSectionStoreData();
    };
    window.addEventListener('alsulaim-toggle-slim-banner', handleToggleSlim);
    window.addEventListener('alsulaim-favorites-updated', handleFavoritesUpdated);
    window.addEventListener('employee-operations-updated', handleOpsUpdated);
    window.addEventListener('erp-data-updated', handleOpsUpdated);
    return () => {
      window.removeEventListener('alsulaim-toggle-slim-banner', handleToggleSlim);
      window.removeEventListener('alsulaim-favorites-updated', handleFavoritesUpdated);
      window.removeEventListener('employee-operations-updated', handleOpsUpdated);
      window.removeEventListener('erp-data-updated', handleOpsUpdated);
    };
  }, [loadActiveSectionStoreData]);

  const toggleSlim = () => {
    const next = !isSlimMode;
    setIsSlimMode(next);
    try {
      localStorage.setItem(SLIM_BANNER_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  };

  // Determine which department owns the current tab
  const resolvedDeptId: DepartmentId = React.useMemo(() => {
    const t = (activeTab || '').toLowerCase();
    for (const [deptKey, def] of Object.entries(CORPORATE_DEPARTMENTS)) {
      if (deptKey !== 'executive' && def.allowedTabs.includes(t)) {
        return deptKey as DepartmentId;
      }
    }
    return (scope.departmentId as DepartmentId) || 'executive';
  }, [activeTab, scope.departmentId]);

  const deptDef = CORPORATE_DEPARTMENTS[resolvedDeptId] || CORPORATE_DEPARTMENTS.executive;
  const illustrationKey = resolveIllustrationForTab(activeTab, resolvedDeptId);
  const meta = getIllustrationMetadata(illustrationKey);
  const quickTabs = DEPARTMENT_QUICK_TABS[resolvedDeptId] || DEPARTMENT_QUICK_TABS.executive;
  const playbookItems =
    DEPARTMENT_GUIDED_PLAYBOOKS[resolvedDeptId] || DEPARTMENT_GUIDED_PLAYBOOKS.executive;

  const allStaff = React.useMemo(() => getFullStaffDirectory(), []);
  const filteredStaff = React.useMemo(() => {
    if (staffScopeFilter === 'dept') {
      return allStaff.filter((s) => s.department_id === resolvedDeptId);
    }
    return allStaff;
  }, [allStaff, staffScopeFilter, resolvedDeptId]);

  const handleRunSingleEmployeeOp = async (staffId: string) => {
    setRunningStaffId(staffId);
    const op = await employeeOperationsEngine.executeOperationForEmployee(staffId);
    await loadExecutedOps();
    addNotification({
      title: `تمت العملية للموظف: ${op.staff_name}`,
      message: `${op.operation_title} — (${op.branch}) برقم مرجعي #${op.reference_no}`,
      type: 'success',
    });
    setTimeout(() => setRunningStaffId(null), 500);
  };

  const handleRunAllEmployeesBatch = async () => {
    if (batchProgress) return;
    setBatchProgress({ current: 0, total: allStaff.length });
    const results = await employeeOperationsEngine.executeOperationsForAllEmployees(
      (_op, idx, total) => {
        setBatchProgress({ current: idx, total });
      }
    );
    await loadExecutedOps();
    addNotification({
      title: `اكتمل تنفيذ عمليات جميع الموظفين (${results.length} موظفاً)`,
      message: `تم إجراء وتوثيق ${results.length} عملية حية عبر الأقسام الـ 9 وكافة الفروع والشركات في السجل المحاسبي وسجل التدقيق.`,
      type: 'success',
    });
    setTimeout(() => setBatchProgress(null), 900);
  };

  // Resolve Arabic title reliably (never show raw ASCII slug)
  const isRawAsciiSlug = (str?: string) => Boolean(str && /^[a-z0-9-_]+$/i.test(str.trim()));
  const currentTitle =
    SLUG_ARABIC_TITLES[activeTab] ||
    (!isRawAsciiSlug(activeTabTitle) && activeTabTitle ? activeTabTitle : '') ||
    meta.titleAr;

  const isPinned = pinnedTabs.some((t) => t.href === activeTab);

  const handleTogglePin = () => {
    const next = togglePinnedTab({
      href: activeTab,
      title: currentTitle,
      category: deptDef.nameAr,
    });
    setPinnedTabs(next);
  };

  const isInternalHeroTab = TABS_WITH_INTERNAL_HERO.has(activeTab);

  return (
    <div className="mb-4 rounded-[24px] bg-[#ffffff] text-[#141414] border border-[#e0e0e0] overflow-hidden transition-all">
      {/* Top Interactive Breadcrumb, Company Switcher & Workspace Ergonomics Strip */}
      <div className="px-4 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Right: Interactive Breadcrumb Trail & Company Pills */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard', 'الرئيسية ولوحة القيادة')}
            className="text-[#707070] hover:text-[#141414] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#707070]" />
            <span className="truncate max-w-[180px]">
              {activeCompany?.name || 'مجموعة خالد السليم القابضة'}
            </span>
          </button>
          <ChevronLeft className="w-3 h-3 text-[#adadad] shrink-0" />
          <button
            type="button"
            onClick={() => onSelectTab(deptDef.defaultTab, deptDef.nameAr)}
            className="text-[#262626] hover:text-[#141414] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{deptDef.nameAr}</span>
          </button>
          <ChevronLeft className="w-3 h-3 text-[#adadad] shrink-0" />
          <span className="text-[#141414] font-bold truncate max-w-[260px]">{currentTitle}</span>

          <div className="hidden xl:flex items-center gap-1 shrink-0 mr-2 pr-2 border-r border-[#e0e0e0]">
            <MapPin className="w-3 h-3 text-[#0066ff]" />
            {[
              { id: 'all', label: 'المجموعة' },
              { id: 'SAF', label: 'السفير الماسي' },
              { id: 'YAQ', label: 'الياقوت' },
              { id: 'TOP', label: 'توب تالنت' },
              { id: 'KAS', label: 'كاس' },
              { id: 'DAR', label: 'دار الرواد' },
            ].map((comp) => {
              const isSelected = (activeCompanyId || 'all').toUpperCase() === comp.id.toUpperCase();
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setActiveCompanyId(comp.id as any)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#0066ff] text-white'
                      : 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#707070] border border-[#e0e0e0]'
                  }`}
                >
                  {comp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Left: Quick Ergonomic Controls */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowStaffOpsDrawer((prev) => !prev)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
              showStaffOpsDrawer
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#262626] border-[#e0e0e0]'
            }`}
            title="فتح مركز إجراء عمليات الموظفين الـ 28 عبر الأقسام والفروع"
          >
            <Users className="w-3 h-3" />
            <span>عمليات الموظفين ({allStaff.length})</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white text-[#141414] border border-[#e0e0e0] font-mono text-[9.5px]">
              {executedOps.length}
            </span>
          </button>

          <ExportDropdown
            sectionKey={tabExportTarget.sectionKey}
            data={activeSectionRows.length > 0 ? activeSectionRows : executedOps}
            dataProvider={resolveWorkspaceExportData}
            customTitle={`كشف وتقرير ${currentTitle} — ${deptDef.nameAr}`}
            buttonLabel="تصدير ومعاينة (12 صيغة)"
            variant="outline-light"
            showCountBadge={true}
            className="!text-[11px] !rounded-full"
          />

          <button
            type="button"
            onClick={handleTogglePin}
            title={isPinned ? 'إزالة الشاشة من المفضلة' : 'تثبيت الشاشة في المفضلة السريعة'}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer border ${
              isPinned
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#262626] border-[#e0e0e0]'
            }`}
          >
            <Star
              className={`w-3 h-3 ${isPinned ? 'fill-white text-white' : 'text-[#707070]'}`}
            />
            <span>{isPinned ? 'مثبتة بالمفضلة' : 'تثبيت'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPlaybook((prev) => !prev)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer border ${
              showPlaybook
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#262626] border-[#e0e0e0]'
            }`}
          >
            <Lightbulb className="w-3 h-3" />
            <span>دليل مهام القسم</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickSearchOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#262626] border border-[#e0e0e0] cursor-pointer"
            title="فتح لوحة الأوامر والبحث الشامل (Ctrl+K)"
          >
            <Search className="w-3 h-3 text-[#707070]" />
            <span>أوامر سريعة</span>
            <kbd className="text-[9.5px] text-[#707070] font-mono">Ctrl+K</kbd>
          </button>

          <button
            type="button"
            onClick={toggleSlim}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#262626] border border-[#e0e0e0] inline-flex items-center gap-1 cursor-pointer"
            title={isSlimMode ? 'توسيع بانر القسم (Alt+M)' : 'الوضع المدمج لتوسيع مساحة الجدول (Alt+M)'}
          >
            {isSlimMode ? (
              <>
                <Maximize2 className="w-3 h-3 text-[#141414]" />
                <span className="hidden md:inline">توسيع</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3 h-3 text-[#707070]" />
                <span className="hidden md:inline">وضع مدمج</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive 28-Employee Operations Execution & Branch Switcher Drawer */}
      {showStaffOpsDrawer && (
        <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-[10px] bg-[#141414] text-white flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#141414]">
                  محرك تنفيذ العمليات الحية للموظفين عبر الأقسام الـ 9 والفروع ({allStaff.length} موظفاً)
                </h3>
                <p className="text-[11px] text-[#707070]">
                  نفّذ عمليات محاسبية وتشغيلية حقيقية لكل موظف في قسمه وفرعه، أو انتقل فوراً لحساب أي موظف
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white p-0.5 rounded-full border border-[#e0e0e0] text-[10.5px]">
                <button
                  type="button"
                  onClick={() => setStaffScopeFilter('all')}
                  className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
                    staffScopeFilter === 'all'
                      ? 'bg-[#141414] text-white'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  جميع موظفي المجموعة ({allStaff.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffScopeFilter('dept')}
                  className={`px-3 py-1 rounded-full font-semibold cursor-pointer ${
                    staffScopeFilter === 'dept'
                      ? 'bg-[#141414] text-white'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  موظفو هذا القسم فقط
                </button>
              </div>

              <button
                type="button"
                onClick={handleRunAllEmployeesBatch}
                disabled={Boolean(batchProgress)}
                className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {batchProgress
                    ? `جاري التنفيذ (${batchProgress.current}/${batchProgress.total})...`
                    : `تنفيذ عملية حية لكل موظف (${allStaff.length} موظفاً)`}
                </span>
              </button>

              <ExportDropdown
                sectionKey="employee_executed_ops"
                data={executedOps}
                customTitle="السجل التنفيذي لعمليات موظفي المجموعة عبر الأقسام الـ 9 والفروع"
                buttonLabel="تصدير سجل العمليات"
                variant="outline-light"
                showCountBadge={true}
              />

              <button
                type="button"
                onClick={() => setShowStaffOpsDrawer(false)}
                className="p-1.5 rounded-full bg-white hover:bg-[#e5e5e5] text-[#262626] border border-[#e0e0e0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {filteredStaff.map((staff) => {
              const staffOps = executedOps.filter((o) => o.staff_id === staff.id);
              const latestOp = staffOps[0];
              const isRunning = runningStaffId === staff.id;
              const compKey = staff.company_id === 'all' ? 'ALL' : staff.company_id.toUpperCase();
              const compMeta = COMPANY_AUTH_METADATA[compKey] || COMPANY_AUTH_METADATA.SAF;

              return (
                <div
                  key={staff.id}
                  className="p-3 rounded-[16px] bg-white border border-[#e0e0e0] hover:border-[#141414] transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CorporateAvatar
                        name={staff.full_name}
                        role={staff.role}
                        email={staff.email}
                        departmentId={staff.department_id}
                        size="sm"
                        status="verified"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#141414] truncate">{staff.full_name}</div>
                        <div className="text-[10px] text-[#707070] truncate">{staff.role}</div>
                        <div className="text-[10px] text-[#adadad] truncate">
                          {compMeta.emoji} {staff.branch}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] shrink-0">
                      {staffOps.length} عملية
                    </span>
                  </div>

                  {latestOp && (
                    <div className="p-2 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] text-[#262626] space-y-0.5">
                      <div className="flex items-center justify-between text-[#141414] font-semibold">
                        <span className="truncate">{latestOp.button_label}</span>
                        <span className="font-mono text-[9.5px]">#{latestOp.reference_no.slice(-4)}</span>
                      </div>
                      <div className="text-[#707070] line-clamp-1">{latestOp.operation_title}</div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleRunSingleEmployeeOp(staff.id)}
                      disabled={isRunning}
                      className="flex-1 px-2.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-white font-semibold text-[10.5px] inline-flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      <Zap className="w-3 h-3" />
                      <span>{isRunning ? 'جاري التنفيذ...' : 'إجراء عملية الآن'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        employeeOperationsEngine.switchToEmployeeSession(staff, onSelectTab);
                        setShowStaffOpsDrawer(false);
                      }}
                      className="px-2.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#262626] border border-[#e0e0e0] font-semibold text-[10.5px] cursor-pointer transition-all"
                      title="التبديل لحساب الموظف وفتح قسمه وفرعه"
                    >
                      فتح قسمه
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Departmental Guided Playbook Drawer (when toggled) */}
      {showPlaybook && (
        <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-[8px] bg-[#141414] text-white flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#141414]">
                  دليل المهام اليومية السريعة — {deptDef.nameAr}
                </h3>
                <p className="text-[11px] text-[#707070]">
                  اختر أي مهمة للانتقال الفوري إليها أو تشغيل الأداة الذكية المرتبطة بها
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPlaybook(false)}
              className="p-1.5 rounded-full bg-white hover:bg-[#e5e5e5] text-[#262626] border border-[#e0e0e0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {playbookItems.map((task, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setShowPlaybook(false);
                  if (task.targetTab === 'universal-extractor') {
                    window.dispatchEvent(new CustomEvent('open-universal-extractor'));
                  } else {
                    onSelectTab(task.targetTab, task.title);
                  }
                }}
                className="p-3 rounded-[16px] bg-white border border-[#e0e0e0] hover:border-[#141414] transition-all cursor-pointer flex flex-col justify-between gap-2 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                      {task.badge}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0066ff]" />
                  </div>
                  <h4 className="text-xs font-bold text-[#141414]">
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-[#707070] leading-relaxed line-clamp-2">
                    {task.desc}
                  </p>
                </div>
                <div className="text-[10.5px] font-semibold text-[#0066ff] inline-flex items-center gap-1 pt-1">
                  <span>بدء المهمة الآن</span>
                  <ArrowUpLeft className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Banner Body — Mobbin Clean Gallery Header (Hidden when Slim Mode is active or when page has internal hero) */}
      {!isSlimMode && !isInternalHeroTab && (
        <div className="px-4 py-3.5 bg-white border-t border-[#f0f0f0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Right: Squircle Illustration + Module Context */}
          <div className="flex items-center gap-3.5 min-w-0">
            <BusinessIllustration
              type={illustrationKey}
              size="sm"
              showBackground={false}
              className="!w-14 !h-14 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-1.5 shrink-0"
            />

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  <span>{deptDef.emoji}</span>
                  <span>{deptDef.badgeText}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#0066ff] text-white">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{meta.badgeAr}</span>
                </span>
              </div>

              <h2 className="text-base sm:text-[18px] font-bold text-[#141414] tracking-[-0.02em] truncate">
                {currentTitle}
              </h2>
              <p className="text-xs text-[#707070] line-clamp-1">{meta.subtitleAr}</p>
            </div>
          </div>

          {/* Left: Responsible Specialist Avatar & Actions */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#f0f0f0] shrink-0">
            <div className="flex items-center gap-2 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full px-3 py-1">
              <EmployeePhotoAvatar
                name={currentUser?.full_name || 'مسؤول القسم'}
                role={currentUser?.role || deptDef.nameAr}
                email={currentUser?.email}
                departmentId={resolvedDeptId}
                size="xs"
                status="verified"
              />
              <div className="text-right pl-1">
                <div className="text-[11px] font-bold text-[#141414] leading-tight">
                  {currentUser?.full_name || 'المختص المعتمد'}
                </div>
                <div className="text-[10px] text-[#707070] font-medium">{deptDef.nameAr}</div>
              </div>
            </div>

            <DynamicActionButton
              preset={
                activeTab === 'zatca'
                  ? 'zatca-clearance'
                  : resolvedDeptId === 'finance'
                    ? 'payment'
                    : resolvedDeptId === 'hr'
                      ? 'wps-payroll'
                      : resolvedDeptId === 'recruitment'
                        ? 'musaned-auth'
                        : resolvedDeptId === 'rental'
                          ? 'receipt'
                          : 'approval'
              }
              variant={resolvedDeptId === 'finance' || activeTab === 'zatca' ? 'emerald' : 'gold'}
              size="sm"
            />

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-universal-extractor'));
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="استخلاص 100+ فاتورة أو مستند آلياً (Alt+I)"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#141414]" />
              <span className="hidden sm:inline">مستخرج المستندات</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const persona =
                  resolvedDeptId === 'shelter' ||
                  resolvedDeptId === 'hr' ||
                  resolvedDeptId === 'crm' ||
                  resolvedDeptId === 'ats'
                    ? 'noura'
                    : 'faris';
                window.dispatchEvent(
                  new CustomEvent('open-faris-assistant', {
                    detail: {
                      persona,
                      prompt: `أهلاً بك، أحتاج مساعدتك في (${currentTitle}) ضمن ${deptDef.nameAr}. ما أهم المهام والإجراءات المتاحة لي الآن؟`,
                    },
                  })
                );
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>مساعدة فارس ونُورة</span>
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentModuleBanner;
