import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Users, FileText, Handshake, Hotel, IdCard,
  TrendingUp, Sliders, Wallet, Search, ArrowLeft,
  Layers, Building2, ShieldCheck,
  LayoutDashboard, ShoppingBag, Stamp, RefreshCw, Plane,
  Headphones, Building, QrCode, BookOpen, Network,
  CreditCard, PiggyBank, UserCheck, MapPin,
  SlidersHorizontal, GitPullRequest, Radio, FolderSync,
  Cloud, UploadCloud, Clock, UserCog, Settings,
  MessageSquare, Send, Globe, PackageCheck, LucideIcon, Scale, Briefcase,
  LogOut, Lock
} from 'lucide-react';
import {
  authService,
  resolveDepartmentAndCompany,
  CORPORATE_DEPARTMENTS,
  DepartmentId,
} from '../services/authService';
import { useCompany } from '../contexts/CompanyContext';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

interface AppTile {
  id: string;
  titleKey: string;
  defaultTitle: string;
  subKey: string;
  defaultSubtitle: string;
  icon: LucideIcon;
  emoji: string;
  href: string;
  category: 'finance' | 'operations' | 'crm' | 'hr' | 'governance' | 'tech';
  categoryLabel: string;
  smaccCode: string;
  metricBadge?: string;
}

interface AppLauncherPageProps {
  onSelectApp: (href: string, title: string) => void;
}

const ALL_SYSTEM_APPS: AppTile[] = [
  // ============================================================================
  // 1. SMACC Accounting & Finance (نظام سماك المحاسبي المعتمد - 6 تقسيمات)
  // ============================================================================
  {
    id: 'smacc-gl',
    titleKey: 'finance',
    defaultTitle: '١. الأستاذ العام وشجرة الحسابات (SMACC GL)',
    subKey: 'financeSub',
    defaultSubtitle: 'دليل الحسابات الشجري، قيود اليومية المزدوجة، الأرصدة الافتتاحية، وإقفال الفترات المحاسبية.',
    icon: Wallet,
    emoji: '',
    href: 'finance-home',
    category: 'finance',
    categoryLabel: 'سماك ١ • الأستاذ العام',
    smaccCode: 'SMACC-01',
    metricBadge: 'شجرة حسابات سماك'
  },
  {
    id: 'smacc-journals',
    titleKey: 'journals',
    defaultTitle: '١.٢ قيود اليومية المزدوجة والترحيل',
    subKey: 'journalsSub',
    defaultSubtitle: 'إنشاء ومراجعة قيود اليومية المحاسبية المتوازنة وترحيلها الفوري للأستاذ العام.',
    icon: BookOpen,
    emoji: '',
    href: 'journals',
    category: 'finance',
    categoryLabel: 'سماك ١ • قيود اليومية',
    smaccCode: 'SMACC-01B',
    metricBadge: '1,420 قيد مرحّل'
  },
  {
    id: 'smacc-cash',
    titleKey: 'vouchers',
    defaultTitle: '٢. النقدية والبنوك وسندات القبض والصرف',
    subKey: 'vouchersSub',
    defaultSubtitle: 'الصناديق النقدية، الحسابات البنكية، سندات القبض والصرف، التسويات البنكية، والعهد النقدية.',
    icon: PiggyBank,
    emoji: '',
    href: 'vouchers',
    category: 'finance',
    categoryLabel: 'سماك ٢ • النقدية والبنوك',
    smaccCode: 'SMACC-02',
    metricBadge: 'سندات وتسويات'
  },
  {
    id: 'smacc-custodies',
    titleKey: 'custodies',
    defaultTitle: '٢.٥ العهد النقدية والسلف التشغيلية',
    subKey: 'custodiesSub',
    defaultSubtitle: 'متابعة العهد النقدية المسلمة للموظفين والمشرفين وتسويتها محاسبياً مع الصندوق.',
    icon: CreditCard,
    emoji: '',
    href: 'custodies',
    category: 'finance',
    categoryLabel: 'سماك ٢ • العهد والسلف',
    smaccCode: 'SMACC-02B',
    metricBadge: '6 عهد نشطة'
  },
  {
    id: 'smacc-ar',
    titleKey: 'zatca',
    defaultTitle: '٣. حسابات العملاء والمبيعات والفوترة (ZATCA)',
    subKey: 'zatcaSub',
    defaultSubtitle: 'إصدار الفواتير الضريبية والمبسطة (المرحلة الثانية ZATCA)، إشعارات الدائن والمدين، وأعمار الديون.',
    icon: QrCode,
    emoji: '',
    href: 'zatca',
    category: 'finance',
    categoryLabel: 'سماك ٣ • العملاء وZATCA',
    smaccCode: 'SMACC-03',
    metricBadge: 'امتثال ZATCA 100%'
  },
  {
    id: 'smacc-ap',
    titleKey: 'financial-requests',
    defaultTitle: '٤. حسابات الموردين والوكلاء والمشتريات',
    subKey: 'financialRequestsSub',
    defaultSubtitle: 'ذمم الوكلاء الخارجيين، أوامر الصرف والاعتمادات المالية، رسوم مساند، والإقرارات الضريبية VAT.',
    icon: CreditCard,
    emoji: '',
    href: 'financial-requests',
    category: 'finance',
    categoryLabel: 'سماك ٤ • الموردين والوكلاء',
    smaccCode: 'SMACC-04',
    metricBadge: '16 أمر صرف'
  },
  {
    id: 'smacc-cc',
    titleKey: 'cost-centers',
    defaultTitle: '٥. مراكز التكلفة والأصول الثابتة والمستودعات',
    subKey: 'costCentersSub',
    defaultSubtitle: 'توزيع الإيرادات والمصروفات على الشركات والفروع والمشاريع، وإدارة الأصول والإهلاك.',
    icon: Network,
    emoji: '',
    href: 'cost-centers',
    category: 'finance',
    categoryLabel: 'سماك ٥ • مراكز التكلفة',
    smaccCode: 'SMACC-05',
    metricBadge: '8 مراكز تكلفة'
  },
  {
    id: 'smacc-reports',
    titleKey: 'trial-balance',
    defaultTitle: '٦. التقارير والكشوفات المالية الموحدة',
    subKey: 'trialBalanceSub',
    defaultSubtitle: 'ميزان المراجعة بالمجاميع والأرصدة، قائمة الدخل والأرباح والخسائر، والميزانية العمومية.',
    icon: TrendingUp,
    emoji: '',
    href: 'trial-balance',
    category: 'finance',
    categoryLabel: 'سماك ٦ • القوائم الختامية',
    smaccCode: 'SMACC-06',
    metricBadge: 'قوائم مالية فورية'
  },

  // ============================================================================
  // 2. Operations & Recruitment (تقسيم سماك للعمليات والاستقدام والتأجير)
  // ============================================================================
  {
    id: 'recruitment-contracts',
    titleKey: 'recruitment-contracts',
    defaultTitle: '١. عقود الاستقدام الموثقة (مساند)',
    subKey: 'recruitmentContractsSub',
    defaultSubtitle: 'إدارة عقود الاستقدام، الربط مع منصة مساند، وتتبع مراحل التفييز والتذاكر.',
    icon: Handshake,
    emoji: '',
    href: 'recruitment-contracts',
    category: 'operations',
    categoryLabel: 'الاستقدام • العقود والتوثيق',
    smaccCode: 'OPS-01',
    metricBadge: '121 عقد نشط'
  },
  {
    id: 'orders',
    titleKey: 'orders',
    defaultTitle: '٢. طلبات الاستقدام والعمليات (SLA)',
    subKey: 'ordersSub',
    defaultSubtitle: 'استقبال طلبات الاستقدام الجديدة، متابعة مؤقتات الإنجاز، والتحويل الفوري لعقود.',
    icon: ShoppingBag,
    emoji: '',
    href: 'orders',
    category: 'operations',
    categoryLabel: 'الاستقدام • الحركة اليومية',
    smaccCode: 'OPS-02',
    metricBadge: '48 طلب جديد'
  },
  {
    id: 'cvs',
    titleKey: 'cvs',
    defaultTitle: '٣. بنك السير الذاتية والمرشحين (CVs)',
    subKey: 'cvsSub',
    defaultSubtitle: 'فلترة وتصنيف الكوادر البشرية، السير المحجوزة، والمتاحة للتعاقد الفوري.',
    icon: FileText,
    emoji: '',
    href: 'cvs-recruitment',
    category: 'operations',
    categoryLabel: 'الفرز والترشيح • المدخلات',
    smaccCode: 'ATS-01',
    metricBadge: '163 سيرة جاهزة'
  },
  {
    id: 'ats-pipeline',
    titleKey: 'ats-pipeline',
    defaultTitle: '٤. مسار الفرز والتدقيق (12 مرحلة ATS)',
    subKey: 'atsPipelineSub',
    defaultSubtitle: 'تتبع المرشحين عبر 12 مرحلة نظامية من الاستقبال والفحص الطبي حتى إصدار التأشيرة.',
    icon: GitPullRequest,
    emoji: '',
    href: 'ats-pipeline',
    category: 'operations',
    categoryLabel: 'الفرز والترشيح • الحركة',
    smaccCode: 'ATS-02',
    metricBadge: '12 مرحلة نظامية'
  },
  {
    id: 'rent-contracts',
    titleKey: 'rent-contracts',
    defaultTitle: '٥. عقود التأجير والتشغيل المرن',
    subKey: 'rentContractsSub',
    defaultSubtitle: 'إدارة عقود الإيجار الشهرية والسنوية ومتابعة التسليم والتحصيل والدفعات.',
    icon: Layers,
    emoji: '',
    href: 'rent-contracts',
    category: 'operations',
    categoryLabel: 'التأجير • العقود والحركة',
    smaccCode: 'RNT-01',
    metricBadge: '34 عقد إيجار'
  },
  {
    id: 'rent-packages',
    titleKey: 'rent-packages',
    defaultTitle: '٦. باقات وأسعار التأجير المعتمدة',
    subKey: 'rentPackagesSub',
    defaultSubtitle: 'تسعير مدد التأجير (شهر، 3 أشهر، 6 أشهر، سنة) واحتساب ضريبة القيمة المضافة.',
    icon: PackageCheck,
    emoji: '',
    href: 'rent-packages',
    category: 'operations',
    categoryLabel: 'التأجير • المدخلات والتسعير',
    smaccCode: 'RNT-02',
    metricBadge: '12 باقة نشطة'
  },
  {
    id: 'ingaz',
    titleKey: 'ingaz',
    defaultTitle: '٧. تفاويض إنجاز والتأشيرات والغرف التجارية',
    subKey: 'ingazSub',
    defaultSubtitle: 'إصدار وتوثيق تفاويض إنجاز الإلكترونية وتصديق الغرف التجارية والربط مع السفارات.',
    icon: Stamp,
    emoji: '',
    href: 'ingaz',
    category: 'operations',
    categoryLabel: 'التأشيرات • الربط الحكومي',
    smaccCode: 'OPS-03',
    metricBadge: '29 تفويض موثق'
  },
  {
    id: 'sponsorship-transfer',
    titleKey: 'sponsorship-transfer',
    defaultTitle: '٨. نقل الخدمات والتنازل وفترة التجربة',
    subKey: 'sponsorshipTransferSub',
    defaultSubtitle: 'إدارة عقود التنازل ونقل الخدمات المعتمدة، فترات التجربة النظامية، والتسويات المالية.',
    icon: RefreshCw,
    emoji: '',
    href: 'sponsorship-transfer',
    category: 'operations',
    categoryLabel: 'نقل الخدمات • قوى وأبشر',
    smaccCode: 'OPS-04',
    metricBadge: '8 قيد التجربة'
  },
  {
    id: 'travel',
    titleKey: 'travel',
    defaultTitle: '٩. الرحلات الجوية والاستقبال بالمطار',
    subKey: 'travelSub',
    defaultSubtitle: 'جدولة رحلات الوصول والاستقبال بالمطار، حجوزات التذاكر، وتتبع الترحيل.',
    icon: Plane,
    emoji: '',
    href: 'travel',
    category: 'operations',
    categoryLabel: 'الحركة واللوجستيات',
    smaccCode: 'OPS-05',
    metricBadge: '14 رحلة قادمة'
  },
  {
    id: 'shelter',
    titleKey: 'shelter',
    defaultTitle: '١٠. منظومة مراكز الإيواء والتسكين (DAR)',
    subKey: 'shelterSub',
    defaultSubtitle: 'إدارة الغرف، الأسرة، الإعاشة والتموين، الرعاية الصحية، والترحيل النظامي (HRSD).',
    icon: Hotel,
    emoji: '',
    href: 'shelter-suite',
    category: 'operations',
    categoryLabel: 'الإيواء والتسكين • الحركة',
    smaccCode: 'SHL-01',
    metricBadge: 'منظومة الإيواء'
  },
  {
    id: 'agent-imports',
    titleKey: 'agent-imports',
    defaultTitle: '١١. استيراد دفعات السير الذاتية من الوكلاء',
    subKey: 'agentImportsSub',
    defaultSubtitle: 'استعراض الدفعات المرفوعة من المكاتب الدولية واعتمادها في بنك السير.',
    icon: FolderSync,
    emoji: '',
    href: 'agent-imports',
    category: 'operations',
    categoryLabel: 'الوكلاء • توريد السير',
    smaccCode: 'ATS-03',
    metricBadge: '5 دفعات معلقة'
  },

  // ============================================================================
  // 3. CRM & Client Service (تقسيم سماك لخدمة العملاء والمبيعات)
  // ============================================================================
  {
    id: 'crm',
    titleKey: 'crm',
    defaultTitle: '١. سجل العملاء والتصنيفات الائتمانية (CRM)',
    subKey: 'crmSub',
    defaultSubtitle: 'بطاقات العملاء، التصنيفات الائتمانية، القوائم السوداء، وتاريخ العقود الموحد.',
    icon: Users,
    emoji: '',
    href: 'clients',
    category: 'crm',
    categoryLabel: 'العملاء • المدخلات والسجلات',
    smaccCode: 'CRM-01',
    metricBadge: '241 عميل نشط'
  },
  {
    id: 'complaints',
    titleKey: 'complaints',
    defaultTitle: '٢. الشكاوى والدعم الفني ومؤشرات SLA',
    subKey: 'complaintsSub',
    defaultSubtitle: 'إدارة بلاغات رفض العمل، تأخير الوصول، تذاكر SLA، والمطالبات والتعويضات.',
    icon: Headphones,
    emoji: '',
    href: 'complaints',
    category: 'crm',
    categoryLabel: 'العملاء • البلاغات والتذاكر',
    smaccCode: 'CRM-02',
    metricBadge: '3 تذاكر عاجلة'
  },
  {
    id: 'whatsapp-inbox',
    titleKey: 'whatsapp-inbox',
    defaultTitle: '٣. صندوق الواتساب المؤسسي الموحد',
    subKey: 'whatsappInboxSub',
    defaultSubtitle: 'مراسلة العملاء عبر قنوات واتساب الرسمية وإرسال العقود وسندات القبض.',
    icon: MessageSquare,
    emoji: '',
    href: 'whatsapp-inbox',
    category: 'crm',
    categoryLabel: 'العملاء • قنوات التواصل',
    smaccCode: 'CRM-03',
    metricBadge: 'متصل ومفعل'
  },
  {
    id: 'sent-messages',
    titleKey: 'sent-messages',
    defaultTitle: '٤. سجل الإشعارات والرسائل النصية (SMS)',
    subKey: 'sentMessagesSub',
    defaultSubtitle: 'سجل إرسال الإشعارات التلقائية عبر SMS والواتساب وتنبيهات العقود.',
    icon: Send,
    emoji: '',
    href: 'sent-messages',
    category: 'crm',
    categoryLabel: 'العملاء • التقارير والرسائل',
    smaccCode: 'CRM-04',
    metricBadge: '3,890 رسالة'
  },
  {
    id: 'website-visitors',
    titleKey: 'website-visitors',
    defaultTitle: '٥. طلبات البوابة الإلكترونية وزوار الموقع',
    subKey: 'websiteVisitorsSub',
    defaultSubtitle: 'تتبع طلبات الاستقدام والتأجير الواردة من البوابة الإلكترونية وتحويلها لعملاء.',
    icon: Globe,
    emoji: '',
    href: 'website-visitors',
    category: 'crm',
    categoryLabel: 'العملاء • الاستقطاب الرقمي',
    smaccCode: 'CRM-05',
    metricBadge: '52 طلب بوابة'
  },

  // ============================================================================
  // 4. HR & External Agencies (تقسيم سماك للموارد البشرية والوكلاء)
  // ============================================================================
  {
    id: 'hr',
    titleKey: 'hr',
    defaultTitle: '١. شؤون الموظفين ومسيرات الرواتب (WPS)',
    subKey: 'hrSub',
    defaultSubtitle: 'ملفات الموظفين، العقود، الإجازات، ومسيرات الرواتب المتوافقة مع حماية الأجور والتأمينات.',
    icon: IdCard,
    emoji: '',
    href: 'employees',
    category: 'hr',
    categoryLabel: 'الموارد البشرية • الرواتب',
    smaccCode: 'HRM-01',
    metricBadge: '32 موظف'
  },
  {
    id: 'attendances',
    titleKey: 'attendances',
    defaultTitle: '٢. الحضور والانصراف وأجهزة البصمة',
    subKey: 'attendancesSub',
    defaultSubtitle: 'مزامنة سجلات البصمة الحيوية، التأخيرات، العمل الإضافي، وتقارير الدوام اليومية.',
    icon: UserCheck,
    emoji: '',
    href: 'attendances',
    category: 'hr',
    categoryLabel: 'الموارد البشرية • الدوام',
    smaccCode: 'HRM-02',
    metricBadge: 'مزامنة مباشرة'
  },
  {
    id: 'offices',
    titleKey: 'offices',
    defaultTitle: '٣. المكاتب والوكلاء الدوليين بالخارج',
    subKey: 'officesSub',
    defaultSubtitle: 'إدارة المكاتب المصدرة في الفلبين وإثيوبيا وأوغندا وسريلانكا وكشوف حساباتها.',
    icon: Building,
    emoji: '',
    href: 'offices',
    category: 'hr',
    categoryLabel: 'الوكلاء • العقود والحسابات',
    smaccCode: 'AGN-01',
    metricBadge: '14 مكتب دولي'
  },
  {
    id: 'external-offices',
    titleKey: 'external-offices',
    defaultTitle: '٤. تراخيص وحصص الوكلاء الدوليين',
    subKey: 'externalOfficesSub',
    defaultSubtitle: 'تتبع تراخيص المكاتب الخارجية، أسعار التوريد، ونسب الإنجاز والامتثال.',
    icon: MapPin,
    emoji: '',
    href: 'external-offices',
    category: 'hr',
    categoryLabel: 'الوكلاء • التراخيص والحصص',
    smaccCode: 'AGN-02',
    metricBadge: '5 دول معتمدة'
  },

  // ============================================================================
  // 5. Governance, Tenders & Executive (الحوكمة والمنافسات والإدارة العليا)
  // ============================================================================
  {
    id: 'dashboard',
    titleKey: 'dashboard',
    defaultTitle: '١. لوحة المؤشرات التشغيلية للقسم',
    subKey: 'dashboardSub',
    defaultSubtitle: 'مؤشرات الأداء التشغيلية والمالية وملخص العقود والحركات اليومية للقسم المعتمد.',
    icon: LayoutDashboard,
    emoji: '',
    href: 'dashboard',
    category: 'governance',
    categoryLabel: 'القيادة • المؤشرات اليومية',
    smaccCode: 'GOV-01',
    metricBadge: 'الرئيسية'
  },
  {
    id: 'kas-suite',
    titleKey: 'kas-suite',
    defaultTitle: '٢. بوابة المنافسات الحكومية ومنصة اعتماد (KAS)',
    subKey: 'kasSuiteSub',
    defaultSubtitle: 'كراسات الشروط، جداول الكميات BOQ، الضمانات البنكية، ومستخلصات منصة اعتماد.',
    icon: Briefcase,
    emoji: '',
    href: 'kas-suite',
    category: 'governance',
    categoryLabel: 'المنافسات • منصة اعتماد',
    smaccCode: 'KAS-01',
    metricBadge: 'جناح كاس KAS'
  },
  {
    id: 'tenders-boq',
    titleKey: 'tenders-boq',
    defaultTitle: '٣. تسعير المنافسات وجداول الكميات (BOQ)',
    subKey: 'tendersBoqSub',
    defaultSubtitle: 'تحليل بنود المناقصات الحكومية، احتساب التكاليف المباشرة، وهوامش الربح.',
    icon: FileText,
    emoji: '',
    href: 'tenders-boq',
    category: 'governance',
    categoryLabel: 'المنافسات • جداول الكميات',
    smaccCode: 'KAS-02',
    metricBadge: 'تسعير BOQ'
  },
  {
    id: 'group-command-center',
    titleKey: 'group-command-center',
    defaultTitle: '٤. مركز قيادة المجموعة والحوكمة المركزية',
    subKey: 'groupCommandCenterSub',
    defaultSubtitle: 'الرقابة الموحدة على شركات المجموعة، مقارنة الإيرادات، ومؤشرات الالتزام.',
    icon: Building2,
    emoji: '',
    href: 'group-command-center',
    category: 'governance',
    categoryLabel: 'الإدارة العليا • الحوكمة',
    smaccCode: 'GOV-02',
    metricBadge: 'إشراف مركزي'
  },
  {
    id: 'company-selector',
    titleKey: 'company-selector',
    defaultTitle: '٥. بوابة الكيانات والشركات التابعة',
    subKey: 'companySelectorSub',
    defaultSubtitle: 'استعراض الكيانات القانونية الخمسة للمجموعة وإعدادات العزل المؤسسي.',
    icon: SlidersHorizontal,
    emoji: '',
    href: 'company-selector',
    category: 'governance',
    categoryLabel: 'الإدارة العليا • الكيانات',
    smaccCode: 'GOV-03',
    metricBadge: '5 كيانات'
  },
  {
    id: 'reports',
    titleKey: 'reports',
    defaultTitle: '٦. مركز التقارير الإدارية والمالية الشامل',
    subKey: 'reportsSub',
    defaultSubtitle: 'استخراج تقارير الأداء المالي، معدلات وصول العمالة، ونسب الربحية.',
    icon: TrendingUp,
    emoji: '',
    href: 'reports',
    category: 'governance',
    categoryLabel: 'التقارير • التحليل المالي',
    smaccCode: 'GOV-04',
    metricBadge: 'تقارير رسمية'
  },

  // ============================================================================
  // 6. Security, Compliance & System Settings (الأمان والامتثال والإعدادات)
  // ============================================================================
  {
    id: 'users',
    titleKey: 'users',
    defaultTitle: '١. إدارة الهوية وصلاحيات الأقسام (IAM)',
    subKey: 'usersSub',
    defaultSubtitle: 'إدارة حسابات الموظفين، عزل الصلاحيات حسب الشركة والقسم، والمصادقة الثنائية.',
    icon: UserCog,
    emoji: '',
    href: 'users',
    category: 'tech',
    categoryLabel: 'الأمان • صلاحيات الأقسام',
    smaccCode: 'SEC-01',
    metricBadge: 'RBAC & IAM'
  },
  {
    id: 'activity-log',
    titleKey: 'activity-log',
    defaultTitle: '٢. سجل التدقيق والعمليات الأمنية (Audit Log)',
    subKey: 'activityLogSub',
    defaultSubtitle: 'تتبع كافة الحركات التشغيلية والمالية مع توثيق المستخدم والوقت والفرع.',
    icon: Clock,
    emoji: '',
    href: 'activity-log',
    category: 'tech',
    categoryLabel: 'الأمان • سجل الرقابة',
    smaccCode: 'SEC-02',
    metricBadge: 'Audit Trail'
  },
  {
    id: 'legal-compliance',
    titleKey: 'legal-compliance',
    defaultTitle: '٣. الامتثال القانوني والتواقيع الرقمية',
    subKey: 'legalComplianceSub',
    defaultSubtitle: 'سياسات استخدام النظام المخصصة لكل قسم، التواقيع الإلكترونية، وإقرارات عدم الإفصاح.',
    icon: Scale,
    emoji: '',
    href: 'legal-compliance',
    category: 'tech',
    categoryLabel: 'الحوكمة • الامتثال القانوني',
    smaccCode: 'SEC-03',
    metricBadge: 'أنظمة KSA'
  },
  {
    id: 'branch-communication',
    titleKey: 'branch-communication',
    defaultTitle: '٤. مركز التعاميم ومراسلات الفروع',
    subKey: 'branchCommunicationSub',
    defaultSubtitle: 'التواصل الإداري الرسمي والتعاميم المعتمدة بين الإدارة العامة والفروع.',
    icon: Radio,
    emoji: '',
    href: 'branch-communication',
    category: 'tech',
    categoryLabel: 'الاتصال الداخلي • الفروع',
    smaccCode: 'SYS-01',
    metricBadge: 'تعاميم داخلية'
  },
  {
    id: 'group-dispatch',
    titleKey: 'group-dispatch',
    defaultTitle: '٥. المناقلة والترحيل بين شركات المجموعة',
    subKey: 'groupDispatchSub',
    defaultSubtitle: 'نقل وتوزيع السير الذاتية والطلبات بين كيانات المجموعة المعتمدة.',
    icon: FolderSync,
    emoji: '',
    href: 'group-dispatch',
    category: 'tech',
    categoryLabel: 'العمليات البينية • المجموعة',
    smaccCode: 'SYS-02',
    metricBadge: 'مزامنة داخلية'
  },
  {
    id: 'microsoft-center',
    titleKey: 'microsoft-center',
    defaultTitle: '٦. التكامل السحابي مع Microsoft 365',
    subKey: 'microsoftCenterSub',
    defaultSubtitle: 'الربط مع البريد الرسمي Outlook وتقويم الاجتماعات وأرشفة العقود.',
    icon: Cloud,
    emoji: '',
    href: 'microsoft-center',
    category: 'tech',
    categoryLabel: 'التكامل السحابي • M365',
    smaccCode: 'SYS-03',
    metricBadge: 'Azure & M365'
  },
  {
    id: 'data-import',
    titleKey: 'data-import',
    defaultTitle: '٧. معالج استيراد البيانات (Excel / CSV)',
    subKey: 'dataImportSub',
    defaultSubtitle: 'استيراد وترحيل البيانات المحاسبية والسير الذاتية والعقود من ملفات Excel.',
    icon: UploadCloud,
    emoji: '',
    href: 'data-import',
    category: 'tech',
    categoryLabel: 'أدوات النظام • الاستيراد',
    smaccCode: 'SYS-04',
    metricBadge: 'Excel / CSV'
  },
  {
    id: 'master-constants',
    titleKey: 'master-constants',
    defaultTitle: '٨. الثوابت والترميزات القياسية للنظام',
    subKey: 'masterConstantsSub',
    defaultSubtitle: 'إدارة الجنسيات، المهن، المطارات، والبنوك المعتمدة في النظام.',
    icon: Settings,
    emoji: '',
    href: 'master-constants',
    category: 'tech',
    categoryLabel: 'إعدادات النظام • الثوابت',
    smaccCode: 'SYS-05',
    metricBadge: '7 قوائم ترميز'
  },
  {
    id: 'settings',
    titleKey: 'settings',
    defaultTitle: '٩. إعدادات المنشأة والأمان والنسخ الاحتياطي',
    subKey: 'settingsSub',
    defaultSubtitle: 'ضبط بيانات السجل التجاري، الرقم الضريبي، سياسات الأمان، والنسخ الاحتياطي.',
    icon: Sliders,
    emoji: '',
    href: 'settings',
    category: 'tech',
    categoryLabel: 'إعدادات المنظومة',
    smaccCode: 'SYS-06',
    metricBadge: 'إعدادات عامة'
  }
];

interface CategoryMeta {
  id: string;
  label: string;
  emoji: string;
  cellBg: string;
  cellHover: string;
  titleColor: string;
  subColor: string;
  iconBg: string;
  iconColor: string;
  categoryTagBg: string;
  categoryTagColor: string;
  metricTagBg: string;
  metricTagColor: string;
  footerBorder: string;
  actionColor: string;
  activePillBg: string;
  activePillText: string;
  isDark?: boolean;
}

/**
 * Strict Adherence to Original Institutional Theme:
 * Primary Ink (#000000), Warm Cream Canvas (#FBFBF5), Pure White Cards (#FFFFFF),
 * Champagne Gold Accents (#CFA64A / #FAEBD7), Hairline Borders (#E4E4E7).
 */
const CATEGORY_STYLES: Record<string, CategoryMeta> = {
  finance: {
    id: 'finance',
    label: 'محاسبة سماك (SMACC)',
    emoji: '',
    cellBg: 'bg-white',
    cellHover: 'hover:bg-[#FBFBF5]',
    titleColor: 'text-black',
    subColor: 'text-zinc-600',
    iconBg: 'bg-black',
    iconColor: 'text-[#CFA64A]',
    categoryTagBg: 'bg-[#FAEBD7]',
    categoryTagColor: 'text-[#8C6239]',
    metricTagBg: 'bg-zinc-100',
    metricTagColor: 'text-zinc-800',
    footerBorder: 'border-zinc-200',
    actionColor: 'text-black group-hover:text-[#8C6239]',
    activePillBg: 'bg-black border-black',
    activePillText: 'text-[#CFA64A]'
  },
  operations: {
    id: 'operations',
    label: 'العمليات والاستقدام والتأجير',
    emoji: '',
    cellBg: 'bg-white',
    cellHover: 'hover:bg-[#FBFBF5]',
    titleColor: 'text-black',
    subColor: 'text-zinc-600',
    iconBg: 'bg-zinc-900',
    iconColor: 'text-white',
    categoryTagBg: 'bg-zinc-100',
    categoryTagColor: 'text-zinc-800',
    metricTagBg: 'bg-[#FAEBD7]/70',
    metricTagColor: 'text-[#8C6239]',
    footerBorder: 'border-zinc-200',
    actionColor: 'text-black group-hover:text-zinc-700',
    activePillBg: 'bg-black border-black',
    activePillText: 'text-white'
  },
  crm: {
    id: 'crm',
    label: 'خدمة العملاء والمبيعات',
    emoji: '',
    cellBg: 'bg-white',
    cellHover: 'hover:bg-[#FBFBF5]',
    titleColor: 'text-black',
    subColor: 'text-zinc-600',
    iconBg: 'bg-zinc-900',
    iconColor: 'text-[#CFA64A]',
    categoryTagBg: 'bg-zinc-100',
    categoryTagColor: 'text-zinc-800',
    metricTagBg: 'bg-zinc-100',
    metricTagColor: 'text-zinc-800',
    footerBorder: 'border-zinc-200',
    actionColor: 'text-black group-hover:text-zinc-700',
    activePillBg: 'bg-black border-black',
    activePillText: 'text-white'
  },
  hr: {
    id: 'hr',
    label: 'الموارد البشرية والوكلاء',
    emoji: '',
    cellBg: 'bg-white',
    cellHover: 'hover:bg-[#FBFBF5]',
    titleColor: 'text-black',
    subColor: 'text-zinc-600',
    iconBg: 'bg-zinc-900',
    iconColor: 'text-white',
    categoryTagBg: 'bg-[#FAEBD7]/60',
    categoryTagColor: 'text-[#8C6239]',
    metricTagBg: 'bg-zinc-100',
    metricTagColor: 'text-zinc-800',
    footerBorder: 'border-zinc-200',
    actionColor: 'text-black group-hover:text-zinc-700',
    activePillBg: 'bg-black border-black',
    activePillText: 'text-white'
  },
  governance: {
    id: 'governance',
    label: 'القيادة والمنافسات والحوكمة',
    emoji: '',
    cellBg: 'bg-[#09090b]',
    cellHover: 'hover:bg-[#18181b]',
    titleColor: 'text-white',
    subColor: 'text-zinc-400',
    iconBg: 'bg-zinc-800',
    iconColor: 'text-[#CFA64A]',
    categoryTagBg: 'bg-zinc-800',
    categoryTagColor: 'text-[#CFA64A]',
    metricTagBg: 'bg-zinc-800',
    metricTagColor: 'text-zinc-200',
    footerBorder: 'border-zinc-800',
    actionColor: 'text-[#CFA64A] group-hover:text-white',
    activePillBg: 'bg-black border-black',
    activePillText: 'text-[#CFA64A]',
    isDark: true
  },
  tech: {
    id: 'tech',
    label: 'الأمان والامتثال والإعدادات',
    emoji: '',
    cellBg: 'bg-white',
    cellHover: 'hover:bg-[#FBFBF5]',
    titleColor: 'text-black',
    subColor: 'text-zinc-600',
    iconBg: 'bg-black',
    iconColor: 'text-white',
    categoryTagBg: 'bg-zinc-100',
    categoryTagColor: 'text-zinc-700',
    metricTagBg: 'bg-zinc-100',
    metricTagColor: 'text-zinc-800',
    footerBorder: 'border-zinc-200',
    actionColor: 'text-black group-hover:text-zinc-700',
    activePillBg: 'bg-black border-black',
    activePillText: 'text-white'
  }
};

const CATEGORIES = [
  { id: 'all', label: 'كافة الوحدات المصرحة للقسم', emoji: '' },
  { id: 'finance', label: 'محاسبة سماك (SMACC)', emoji: '' },
  { id: 'operations', label: 'العمليات والاستقدام والتأجير', emoji: '' },
  { id: 'crm', label: 'العملاء والشكاوى (CRM)', emoji: '' },
  { id: 'hr', label: 'الموارد البشرية والوكلاء', emoji: '' },
  { id: 'governance', label: 'الحوكمة والمنافسات', emoji: '' },
  { id: 'tech', label: 'الأمان والإعدادات', emoji: '' },
];

export const AppLauncherPage: React.FC<AppLauncherPageProps> = ({ onSelectApp }) => {
  const { t } = useLanguage();
  const { activeCompany } = useCompany();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const currentUser = authService.getCurrentUser();
  const isGroupAdmin = authService.isAdmin(currentUser);
  const resolvedScope = useMemo(
    () =>
      resolveDepartmentAndCompany(
        currentUser?.email || currentUser?.username || '',
        currentUser?.role,
        currentUser?.company_id,
        currentUser?.department_id
      ),
    [currentUser]
  );

  const currentDeptMeta =
    CORPORATE_DEPARTMENTS[resolvedScope.departmentId as DepartmentId] ||
    CORPORATE_DEPARTMENTS.executive;

  // Enforce strict department + company isolation on the App Launcher tiles
  const authorizedApps = useMemo(() => {
    return ALL_SYSTEM_APPS.filter((app) =>
      authService.isTabAuthorizedForUser(currentUser, app.href)
    );
  }, [currentUser]);

  const filteredApps = useMemo(() => {
    return authorizedApps.filter((app) => {
      const title = t(app.titleKey, app.defaultTitle);
      const subtitle = t(app.subKey, app.defaultSubtitle);
      const categoryMatch = selectedCategory === 'all' || app.category === selectedCategory;
      const searchMatch =
        !search ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        subtitle.toLowerCase().includes(search.toLowerCase()) ||
        app.categoryLabel.toLowerCase().includes(search.toLowerCase()) ||
        app.smaccCode.toLowerCase().includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [authorizedApps, search, selectedCategory, t]);

  const countsByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: authorizedApps.length };
    authorizedApps.forEach((app) => {
      counts[app.category] = (counts[app.category] || 0) + 1;
    });
    return counts;
  }, [authorizedApps]);

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((cat) => cat.id === 'all' || (countsByCategory[cat.id] || 0) > 0);
  }, [countsByCategory]);

  return (
    <main
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full bg-[#FBFBF5] text-zinc-900 flex flex-col font-sans selection:bg-[#FAEBD7] selection:text-black"
    >
      {/* Top Institutional Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-8 lg:px-12 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <CorporateAvatar
            name={currentUser?.full_name || 'موظف معتمد'}
            role={currentUser?.role || currentDeptMeta.nameAr}
            email={currentUser?.email}
            departmentId={currentDeptMeta.id}
            size="md"
            status="verified"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm sm:text-base text-black font-display leading-tight">
                {currentDeptMeta.nameAr}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAEBD7] text-[#8C6239] border border-[#CFA64A]/40">
                {isGroupAdmin ? 'صلاحية الإدارة العليا الشاملة' : 'معزول ومقيد للقسم فقط'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-semibold truncate mt-0.5">
              {currentUser?.full_name || 'موظف معتمد'} • {activeCompany.name} ({resolvedScope.companyId}) •{' '}
              {authorizedApps.length} وحدة نظامية مصرحة
            </div>
          </div>
        </div>

        {/* Search Bar & Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchAppPlaceholder', 'ابحث في وحدات قسمك...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#FBFBF5] border border-zinc-300 rounded-full pr-9 pl-4 py-1.5 text-xs text-black placeholder-zinc-400 outline-none w-36 sm:w-64 focus:border-black focus:ring-1 focus:ring-black transition-all"
            />
          </div>

          <button
            type="button"
            className="bg-black hover:bg-zinc-800 text-[#CFA64A] border border-black flex items-center gap-1.5 text-xs px-4 py-2 rounded-full font-bold min-h-[36px] transition-all cursor-pointer"
            onClick={() =>
              onSelectApp(currentDeptMeta.defaultTab, currentDeptMeta.defaultTabTitle)
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">فتح شاشة القسم الرئيسية</span>
            <span className="md:hidden">شاشة القسم</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectApp('logout', 'تسجيل الخروج')}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full font-bold min-h-[36px] transition-all cursor-pointer"
            title="تسجيل الخروج والعودة لبوابة الدخول الموحدة"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* Department Isolation Banner */}
      <div className="bg-black text-white border-b border-zinc-800 px-4 sm:px-8 lg:px-12 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <BusinessIllustration
              tabKey={currentDeptMeta.defaultTab}
              departmentId={currentDeptMeta.id}
              size="sm"
              showBackground={false}
              className="!w-12 !h-12 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#CFA64A] shrink-0" />
                <span className="font-bold text-[#CFA64A]">
                  بوابة القسم المعزولة (تقسيمات نظام سماك SMACC المعتمدة):
                </span>
              </div>
              <span className="text-zinc-300 block mt-0.5">
                يتم عرض الوحدات المصرحة فقط لقسم ({currentDeptMeta.nameAr}) داخل ({activeCompany.name}).
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>DEPT: {currentDeptMeta.id.toUpperCase()}</span>
            <span>•</span>
            <span>ENTITY: {String(resolvedScope.companyId).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Explorer Content Container */}
      <div className="w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-8 flex-1 space-y-6">
        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {visibleCategories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const count = countsByCategory[cat.id] || 0;
            const catStyle = CATEGORY_STYLES[cat.id];

            let activeClass = 'bg-black text-[#CFA64A] border-black shadow-xs';
            let activeCountBadge = 'bg-zinc-800 text-[#CFA64A]';
            if (isActive && catStyle) {
              activeClass = `${catStyle.activePillBg} ${catStyle.activePillText} shadow-xs`;
              activeCountBadge = 'bg-white/15 text-white';
            }

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isActive
                    ? activeClass
                    : 'bg-white text-zinc-800 border-zinc-200 hover:border-black hover:bg-[#FBFBF5]'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? activeCountBadge : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Seamless Institutional Bento Grid */}
        <div className="bg-zinc-200 border border-zinc-200 rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-[1px]">
          {filteredApps.map((app) => {
            const title = t(app.titleKey, app.defaultTitle);
            const subtitle = t(app.subKey, app.defaultSubtitle);
            const Icon = app.icon;
            const style = CATEGORY_STYLES[app.category] || CATEGORY_STYLES.operations;

            return (
              <div
                key={app.id}
                onClick={() => onSelectApp(app.href, title)}
                className={`p-5 sm:p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative min-h-[220px] ${style.cellBg} ${style.cellHover}`}
              >
                <div className="space-y-3">
                  {/* Top Badges & Funkyways Illustration Row */}
                  <div className="flex items-center justify-between gap-2">
                    <BusinessIllustration
                      tabKey={app.href}
                      departmentId={currentDeptMeta.id}
                      size="sm"
                      showBackground={false}
                      className="!w-12 !h-12 shrink-0"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="text-[9.5px] px-2 py-0.5 rounded-md font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {app.smaccCode}
                      </span>
                      {app.metricBadge && (
                        <span
                          className={`text-[9.5px] px-2.5 py-0.5 rounded-full font-bold font-mono ${style.metricTagBg} ${style.metricTagColor}`}
                        >
                          {app.metricBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold tracking-wider ${style.categoryTagBg} ${style.categoryTagColor}`}
                      >
                        {app.categoryLabel}
                      </span>
                    </div>
                    <h3
                      className={`text-sm sm:text-base font-extrabold font-display mb-1.5 leading-snug line-clamp-1 ${style.titleColor}`}
                    >
                      {title}
                    </h3>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${style.subColor}`}>
                      {subtitle}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div
                  className={`pt-3 mt-3 border-t flex items-center justify-between text-xs font-bold ${style.footerBorder}`}
                >
                  <span className={`inline-flex items-center gap-1.5 transition-colors ${style.actionColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>فتح الوحدة النظامية</span>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  </span>
                  <span className={`text-[10px] font-mono font-medium opacity-70 ${style.titleColor}`}>
                    معتمد
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredApps.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center text-zinc-500 flex flex-col items-center">
            <BusinessIllustration type="empty-search" size="md" className="mb-3" />
            <p className="font-bold text-black text-sm">لم يتم العثور على أي وحدة تطابق بحثك في قسمك</p>
            <p className="text-xs text-zinc-400 mt-1">
              جرب البحث بكلمات أخرى أو اختر "كافة الوحدات المصرحة للقسم"
            </p>
          </div>
        )}
      </div>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 mt-auto">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#8C6239]" />
          <span className="font-semibold text-zinc-700">
            مجموعة خالد السليم للاستقدام والتشغيل • المنظومة السحابية الموحدة المعتمدة على تقسيمات سماك (SMACC)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-[#FAEBD7] text-[#8C6239] font-bold text-[10px]">
            عزل صارم للأقسام والشركات
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[10px]">
            ZATCA المرحلة الثانية
          </span>
        </div>
      </footer>
    </main>
  );
};

export default AppLauncherPage;
