import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { 
  Network, Plus, FileSpreadsheet, FileText, Building2, Users, 
  Check, X, Shield, Plane, Globe, Handshake, DollarSign, 
  PhoneCall, Hotel, Stethoscope, Utensils, Archive, Gem, 
  Landmark, Repeat, Crown, ShieldAlert, Sparkles, Activity,
  Briefcase, CheckCircle2, TrendingUp, Compass, Award, ArrowUpRight,
  Layers, MapPin, Search
} from 'lucide-react';
import { KasKpiCard } from '../components/kas/KasCards';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';

export interface BranchEntity {
  id: string;
  name: string;
  code: string;
  category: 'فرع منطقي' | 'شركة مجموعة' | 'مكتب خارجي';
  location: string;
  manager: string;
  staff_count: number;
  departments: SubDepartment[];
}

export interface SubDepartment {
  id: string;
  name: string;
  description: string;
  head: string;
  staff_count: number;
  status: 'مفعل' | 'قيد التطوير';
  kpi: string;
  icon?: string;
}

const ALL_GROUP_ENTITIES: BranchEntity[] = [
  // 1. Regional Branches & Centers
  {
    id: 'b-1',
    name: 'الفرع الرئيسي (الإدارة العامة - الرياض)',
    code: 'HQ-RUH',
    category: 'فرع منطقي',
    location: 'الرياض - حي اليرموك',
    manager: 'عبد الفتاح السليم (المدير العام)',
    staff_count: 14,
    departments: [
      { id: 'd-101', name: 'إدارة القيادة العليا والتخطيط الإستراتيجي', description: 'لوحة الآدمن الـ 30 ميزة، الحوكمة، وكشوفات الأرباح المجمعة.', head: 'عبد الفتاح السليم', staff_count: 3, status: 'مفعل', kpi: 'نسبة النمو 99.8%' },
      { id: 'd-102', name: 'إدارة الموارد البشرية والرواتب (HR & Payroll)', description: 'سجلات الموظفين، مسير الرواتب الشهرية، الحضور والانصراف.', head: 'سارة خالد', staff_count: 4, status: 'مفعل', kpi: 'مسير الرواتب 100%' },
      { id: 'd-103', name: 'الإدارة المالية والمحاسبة العامة (Central Finance)', description: 'شجرة الحسابات (336)، مراكز التكلفة، والربط الضريبي ZATCA.', head: 'محمد مصطفى', staff_count: 4, status: 'مفعل', kpi: 'مطابقة ضريبية 100%' },
      { id: 'd-104', name: 'إدارة الأمن وحوكمة المصادقة 2FA', description: 'مصفوفة الصلاحيات RBAC، سياسات 2FA، وجدار الحماية.', head: 'مشرف الأمان', staff_count: 3, status: 'مفعل', kpi: 'تأمين 2FA بنسبة 100%' }
    ]
  },
  {
    id: 'b-2',
    name: 'فرع جدة والمنطقة الغربية',
    code: 'BR-JED',
    category: 'فرع منطقي',
    location: 'جدة - طريق الملك عبد العزيز',
    manager: 'خالد العتيبي',
    staff_count: 8,
    departments: [
      { id: 'd-201', name: 'إدارة الاستقبال والموانئ والمطارات', description: 'استقبال رحلات الوصول بمطار الملك عبد العزيز وتأكيد الجوازات.', head: 'أحمد الزهراني', staff_count: 2, status: 'مفعل', kpi: 'سرعة الاستلام 45 دقيقة' },
      { id: 'd-202', name: 'إدارة عقود الاستقدام وتفاويض الإنجاز', description: 'عقود مساند، توثيق تفاويض الإنجاز الإلكترونية، وتتبع التفييز.', head: 'ماجد الغامدي', staff_count: 3, status: 'مفعل', kpi: '891 تفويض موثق' },
      { id: 'd-203', name: 'قسم العلاقات مع الوكلاء الخارجيين', description: 'المتابعة مع مكاتب إثيوبيا DAMAS، الفلبين PLATINUM، والهند.', head: 'خالد العتيبي', staff_count: 3, status: 'مفعل', kpi: '18 مكتب خارجي' }
    ]
  },
  {
    id: 'b-3',
    name: 'فرع الخبر والمنطقة الشرقية',
    code: 'BR-DMM',
    category: 'فرع منطقي',
    location: 'الخبر - شارع الظهران',
    manager: 'عمر الدوسري',
    staff_count: 6,
    departments: [
      { id: 'd-301', name: 'إدارة عقود التشغيل والتأجير للمؤسسات', description: 'إدارة عقود التأجير الشهرية والسنوية وباقات الكوادر.', head: 'عمر الدوسري', staff_count: 2, status: 'مفعل', kpi: '610 عقود تأجير' },
      { id: 'd-302', name: 'إدارة التحصيل والطلبات المالية بين الفروع', description: 'سندات القبض والصرف، وطلبات المناقلات المالية السريعة.', head: 'فهد الخالدي', staff_count: 2, status: 'مفعل', kpi: 'تحصيل 98%' },
      { id: 'd-303', name: 'مركز الاتصال والتسويق الرقمي CRM', description: 'متابعة زوار المنصة، محادثات الواتساب، والفرص البيعية.', head: 'نورة الشمري', staff_count: 2, status: 'مفعل', kpi: '241 عميل نشط' }
    ]
  },
  {
    id: 'b-4',
    name: 'مركز الإيواء والرعاية الرئيسية (الرياض)',
    code: 'SHL-RUH',
    category: 'فرع منطقي',
    location: 'الرياض - مجمع الإيواء الموحد',
    manager: 'سارة خالد',
    staff_count: 12,
    departments: [
      { id: 'd-401', name: 'إدارة السكن والتسكين والغرف', description: 'تسجيل دخول وتسكين 61 عاملة بالنزل وتوزيع الغرف.', head: 'مريم العنزي', staff_count: 3, status: 'مفعل', kpi: 'سعة 120 أسرة' },
      { id: 'd-402', name: 'قسم الرعاية الطبية والفحوصات', description: 'الفحص الطبي الشامل، تأمين العيوب الخفية، واللياقة البدنية.', head: 'د. عادل القحطاني', staff_count: 3, status: 'مفعل', kpi: 'فحص 100% لائق' },
      { id: 'd-403', name: 'قسم التغذية والإعاشة والخدمات اللوجستية', description: 'الإعاشة اليومية وحافلات التوصيل اليومي بين الفروع.', head: 'سليمان الحربي', staff_count: 3, status: 'مفعل', kpi: '3 وجبات صحية/يوم' },
      { id: 'd-404', name: 'قسم فترة التجربة والترحيل (90 يوم)', description: 'متابعة فترة التجربة، حالات الباك أوت، وتذاكر المغادرة.', head: 'عبد الله الشهري', staff_count: 3, status: 'مفعل', kpi: 'ضمان 90 يوماً' }
    ]
  },

  // 2. Landing Page Group Subsidiaries & KAS Trading Network
  {
    id: 'b-kas',
    name: 'شركة كاس للتجارة (مؤسسة خالد عبدالعزيز السليم للتجارة)',
    code: 'HQ-KAS-RUH',
    category: 'شركة مجموعة',
    location: 'الرياض - طريق الملك فهد - برج كاس التجاري',
    manager: 'خالد عبدالعزيز السليم (المدير العام)',
    staff_count: 28,
    departments: [
      { id: 'd-kas-1', name: 'إدارة المناقصات وجداول الكميات والأسعار (BOQ)', description: 'دراسة وتحليل كراسات الشروط، تسعير جداول الكميات، والتفقيط المعتمد للمنافسات الحكومية.', head: 'م. أحمد حلمي', staff_count: 8, status: 'مفعل', kpi: 'ترسية منافسات 96.4%' },
      { id: 'd-kas-2', name: 'إدارة التوريدات الحكومية والتجارة العامة', description: 'تأمين مستلزمات اليوم الوطني، التمور الفاخرة، والضيافة المتكاملة للقطاعات الحكومية.', head: 'فيصل السليم', staff_count: 7, status: 'مفعل', kpi: 'توريد معتمد 100%' },
      { id: 'd-kas-3', name: 'إدارة المستودعات وسلاسل الإمداد اللوجستية', description: 'التخزين المركزي، إدارة المخزون، وسرعة تجهيز الشحنات والتوصيل خلال المواعيد المحددة.', head: 'سلطان الحربي', staff_count: 7, status: 'مفعل', kpi: 'تسليم قبل الموعد' },
      { id: 'd-kas-4', name: 'الإدارة المالية والمحاسبة التجارية والفوترة', description: 'الفوترة الإلكترونية ZATCA، سندات الصرف والقبض، ومتابعة التحصيل والدفعات التعاقدية.', head: 'عبدالله القحطاني', staff_count: 6, status: 'مفعل', kpi: 'تحصيل 99.1%' }
    ]
  },
  {
    id: 'b-kas-jed',
    name: 'فرع شركة كاس للتجارة والخدمات اللوجستية - جدة',
    code: 'BR-KAS-JED',
    category: 'فرع منطقي',
    location: 'جدة - ميناء جدة الإسلامي وطريق المدينة',
    manager: 'عبدالرحمن الشهري',
    staff_count: 14,
    departments: [
      { id: 'd-kas-jed-1', name: 'قسم توريدات ميناء جدة الإسلامي والفعاليات', description: 'تنفيذ احتفالات اليوم الوطني 96 وتوريد بوكسات التوزيعات والضيافة لميناء جدة.', head: 'عبدالرحمن الشهري', staff_count: 7, status: 'مفعل', kpi: 'تنفيذ 100%' },
      { id: 'd-kas-jed-2', name: 'قسم التوزيع اللوجستي للمنطقة الغربية', description: 'التنسيق مع الموانئ والجمارك وتوصيل طلبيات القطاع الحكومي والخاص.', head: 'مازن الغامدي', staff_count: 7, status: 'مفعل', kpi: 'سرعة توصيل 24h' }
    ]
  },
  {
    id: 'b-kas-expo',
    name: 'مؤسسة كاس لتنظيم المعارض والمؤتمرات',
    code: 'KAS-EXPO',
    category: 'شركة مجموعة',
    location: 'الرياض - مركز المؤتمرات والمعارض',
    manager: 'نايف السليم',
    staff_count: 16,
    departments: [
      { id: 'd-expo-1', name: 'إدارة تنظيم وتجهيز الفعاليات والمؤتمرات', description: 'إدارة وتخطيط المعارض، المسارح، منصات العرض، وتجهيز المواقع الاحتفالية.', head: 'نايف السليم', staff_count: 8, status: 'مفعل', kpi: 'تنظيم 34 فعالية' },
      { id: 'd-expo-2', name: 'قسم الضيافة والفرق الشعبية والعرضة النجدية', description: 'توفير فرق العرضة النجدية الرسمية، القهوة العربية، والمباشرين المحترفين.', head: 'سعد الدوسري', staff_count: 8, status: 'مفعل', kpi: 'أداء تراثي 100%' }
    ]
  },
  {
    id: 'b-sulaim-adv',
    name: 'وكالة خالد عبدالعزيز السليم للدعاية والإعلان',
    code: 'SULAIM-ADV',
    category: 'شركة مجموعة',
    location: 'الرياض - حي الملز - شارع الستين',
    manager: 'بدر التميمي',
    staff_count: 15,
    departments: [
      { id: 'd-adv-1', name: 'إدارة التصميم والإنتاج الإعلاني والطباعة', description: 'تصميم الهويات الوطنية، طباعة استيكرات الباك دروب، المصاعد، واللوحات الإرشادية.', head: 'بدر التميمي', staff_count: 8, status: 'مفعل', kpi: 'دقة طباعة 100%' },
      { id: 'd-adv-2', name: 'قسم التركيبات الميدانية والتجهيز الخارجي', description: 'فرق التركيب الميداني لاستيكرات الواجهات والمصاعد وأطقم الباك دروب 6*6.', head: 'طارق العلي', staff_count: 7, status: 'مفعل', kpi: 'تركيب فوري' }
    ]
  },
  {
    id: 'b-smart-bld',
    name: 'مؤسسة بنايات ذكية للمقاولات',
    code: 'SMART-BLD',
    category: 'شركة مجموعة',
    location: 'الرياض - حي العليا',
    manager: 'م. فهد السليم',
    staff_count: 22,
    departments: [
      { id: 'd-bld-1', name: 'إدارة المقاولات والتجهيزات الإنشائية الذكية', description: 'تنفيذ أعمال الديكورات، التجهيزات المعمارية، وتشييد منصات الفعاليات الكبرى.', head: 'م. فهد السليم', staff_count: 12, status: 'مفعل', kpi: 'جودة تنفيذ 100%' },
      { id: 'd-bld-2', name: 'قسم الصيانة والتشغيل والدعم الفني', description: 'أعمال الكهرباء، الإضاءات التفاعلية للمباني الخارجية، والإشراف الهندسي.', head: 'م. كمال الدين', staff_count: 10, status: 'مفعل', kpi: 'استجابة سريعة' }
    ]
  },
  {
    id: 'b-super-touch',
    name: 'مؤسسة اللمسة الخارقة للاتصالات وتقنية المعلومات',
    code: 'SUPER-TOUCH',
    category: 'شركة مجموعة',
    location: 'الرياض - واحة التقنية الرقمية',
    manager: 'م. عاصم السليم',
    staff_count: 18,
    departments: [
      { id: 'd-touch-1', name: 'إدارة الحلول الرقمية وتطوير الأنظمة الذكية', description: 'تطوير وتشغيل منظومة الـ ERP، الربط السحابي، والذكاء الاصطناعي المؤسسي.', head: 'م. عاصم السليم', staff_count: 10, status: 'مفعل', kpi: 'تواجدية 99.9%' },
      { id: 'd-touch-2', name: 'قسم أمن المعلومات والشبكات والبنية التحتية', description: 'حماية الخوادم، تأمين البيانات السحابية، وضوابط الأمن السيبراني NCA.', head: 'م. رامي حسن', staff_count: 8, status: 'مفعل', kpi: 'حماية 100%' }
    ]
  },
  {
    id: 'b-topaz',
    name: 'شركة توباز للاستقدام والتشغيل (TOP - RC03)',
    code: 'TOP-RC03',
    category: 'شركة مجموعة',
    location: 'الرياض - البرج الرئيسي',
    manager: 'المهندس أحمد السليم',
    staff_count: 18,
    departments: [
      { id: 'd-topaz-1', name: 'إدارة الابتكار والحلول الصناعية المستقبلي', description: 'تطوير الحلول النوعية وتوجيه الاستقدام المتقدم للمؤسسات.', head: 'م. أحمد السليم', staff_count: 8, status: 'مفعل', kpi: 'ابتكار 100%' },
      { id: 'd-topaz-2', name: 'إدارة المشروعات والتعاقدات الإستراتيجية', description: 'إدارة المشاريع الكبرى للمجموعة وتوفير الكوادر التخصصية.', head: 'فيصل القحطاني', staff_count: 10, status: 'مفعل', kpi: '42 مشروع نشط' },
      { id: 'd-topaz-3', name: 'النظام المحاسبي المستقل لشركة توباز', description: 'دفتر أستاذ مستقل، فواتير ضريبية ZATCA، ومراكز تكلفة خاصة بتوباز.', head: 'ماجد الشهري', staff_count: 4, status: 'مفعل', kpi: 'عزل مالي 100%' }
    ]
  },
  {
    id: 'b-ruwad',
    name: 'شركة دار الرواد للاستقدام والحلول العمالية (DAR - RC04)',
    code: 'DAR-RC04',
    category: 'شركة مجموعة',
    location: 'الرياض - حي طريق الملك فهد',
    manager: 'سليمان العتيبي',
    staff_count: 15,
    departments: [
      { id: 'd-ruwad-1', name: 'إدارة الاستقدام والحلول العمالية للمشاريع', description: 'توريد الكوادر المهنية والعمالية وإدارة عقود مساند وقوى.', head: 'سليمان العتيبي', staff_count: 7, status: 'مفعل', kpi: 'إنجاز عقود 98%' },
      { id: 'd-ruwad-2', name: 'إدارة الأصول ومجمعات الإيواء التابعة', description: 'إدارة الأصول التشغيلية ومراكز الإيواء لشركة دار الرواد.', head: 'خالد المطيري', staff_count: 5, status: 'مفعل', kpi: 'عائد تشغيلي +14%' },
      { id: 'd-ruwad-3', name: 'النظام المحاسبي المستقل لدار الرواد', description: 'شجرة حسابات مستقلة، قيود يومية، وفوترة ضريبية معزولة.', head: 'ياسر الحربي', staff_count: 3, status: 'مفعل', kpi: 'عزل مالي 100%' }
    ]
  },
  {
    id: 'b-saffir',
    name: 'شركة السفير الماسي للاستقدام (SAF - RC01)',
    code: 'SAF-RC01',
    category: 'شركة مجموعة',
    location: 'الرياض - طريق العليا العام',
    manager: 'عبد العزيز السليم',
    staff_count: 24,
    departments: [
      { id: 'd-saffir-1', name: 'إدارة عقود مساند وتفاويض إنجاز والتفييز', description: 'إصدار عقود الاستقدام الموحدة، الربط مع مساند، وتفاويض السفارات.', head: 'عبد العزيز السليم', staff_count: 10, status: 'مفعل', kpi: '940 عقد موثق' },
      { id: 'd-saffir-2', name: 'إدارة خدمات نقل الكفالة والتنازل وفترة التجربة', description: 'إدارة طلبات نقل الخدمة والتنازل وفترة التجربة (90 يوماً).', head: 'ناصر السبيعي', staff_count: 8, status: 'مفعل', kpi: 'اعتماد 100%' },
      { id: 'd-saffir-3', name: 'النظام المحاسبي المستقل للسفير الماسي', description: 'دفتر الأستاذ العام، سندات القبض والصرف، والفوترة الإلكترونية ZATCA.', head: 'نورة القحطاني', staff_count: 6, status: 'مفعل', kpi: 'مطابقة ZATCA 100%' }
    ]
  },
  {
    id: 'b-yaqoot',
    name: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير (YAQ - RC02)',
    code: 'YAQ-RC02',
    category: 'شركة مجموعة',
    location: 'الرياض - حي العليا والخدمات الفاخرة',
    manager: 'بندر الهويريني',
    staff_count: 20,
    departments: [
      { id: 'd-yaq-1', name: 'إدارة باقات التأجير الشهري والسنوي وخدمة معروف', description: 'تصميم وإدارة عقود التأجير للعمالة المنزلية والسائقين وتأمين العيوب.', head: 'بندر الهويريني', staff_count: 9, status: 'مفعل', kpi: 'رضا العملاء 99%' },
      { id: 'd-yaq-2', name: 'قسم الضمان والبديل الفوري خلال 24 ساعة', description: 'توفير البديل الفوري وتغطية التأمين الشامل للنزل والعملاء.', head: 'هند العلي', staff_count: 6, status: 'مفعل', kpi: 'استبدال 24h' },
      { id: 'd-yaq-3', name: 'النظام المحاسبي المستقل لياقوت نجد', description: 'دفتر محاسبي مستقل لعقود التأجير وإيرادات الباقات والضريبة.', head: 'وليد الدوسري', staff_count: 5, status: 'مفعل', kpi: 'عزل مالي 100%' }
    ]
  },
  {
    id: 'b-ayal',
    name: 'وكالة الأَمْيال للسفر والسياحة',
    code: 'AYAL-TRV',
    category: 'شركة مجموعة',
    location: 'الرياض - طريق الملك فهد',
    manager: 'خالد السليم (الأَمْيال)',
    staff_count: 9,
    departments: [
      { id: 'd-ayal-1', name: 'إدارة حجز وتأكيد تذاكر الطيران (Ticketing)', description: 'إصدار حجوزات طيران الوصول والمغادرة للعمالة والعملاء.', head: 'خالد السليم', staff_count: 4, status: 'مفعل', kpi: '77 رحلة وصول' },
      { id: 'd-ayal-2', name: 'إدارة أسطول النقل البري والحافلات', description: 'إدارة الحافلات والسيارات الخاصة بنقل الكوادر من وإلى المطارات.', head: 'إبراهيم الفايز', staff_count: 5, status: 'مفعل', kpi: 'أسطول 12 حافلة' }
    ]
  },

  // 3. International Foreign Agencies
  {
    id: 'b-damas',
    name: 'مكتب داماس الإثيوبي (DAMAS Agency - Addis Ababa)',
    code: 'DAMAS-ETH',
    category: 'مكتب خارجي',
    location: 'أديس أبابا - إثيوبيا',
    manager: 'Mr. Solomon Bekele',
    staff_count: 24,
    departments: [
      { id: 'd-damas-1', name: 'قسم الفحص الطبي المقارن وتوثيق السفارة', description: 'إجراء الفحوصات الطبية واعتماد لياءة الكوادر بالسفارة السعودية.', head: 'Dr. Tadesse', staff_count: 12, status: 'مفعل', kpi: 'فحص لائق 100%' },
      { id: 'd-damas-2', name: 'قسم التدريب المنزلي واللغة العربية', description: 'تدريب العاملات على الطبخ والطهي الخليجي واللغة والأعراف.', head: 'Mrs. Aster', staff_count: 12, status: 'مفعل', kpi: 'تدريب 14 يوم' }
    ]
  },
  {
    id: 'b-platinum',
    name: 'مكتب بلاتينيوم الفلبيني (PLATINUM Brothers - Manila)',
    code: 'PLT-PHL',
    category: 'مكتب خارجي',
    location: 'مانيلا - الفلبين',
    manager: 'Mr. Ricardo Santos',
    staff_count: 30,
    departments: [
      { id: 'd-plt-1', name: 'قسم التدريب المهني والمهارات الفلبينية', description: 'اختبار مهارات التمريض والعناية بكبار السن والأطفال.', head: 'Maria Santos', staff_count: 15, status: 'مفعل', kpi: 'اعتماد POEA 100%' },
      { id: 'd-plt-2', name: 'قسم إنهاء إجراءات السفارة وتوثيق التأشيرات', description: 'تثبيت الفيزا والجوازات وإصدار تصاريح السفر الرسمية.', head: 'Juan Dela Cruz', staff_count: 15, status: 'مفعل', kpi: 'إنهاء خلال 7 أيام' }
    ]
  },
  {
    id: 'b-versatile',
    name: 'مكتب فيرساتيل الهندي (VERSATILE Overseas - New Delhi)',
    code: 'VRST-IND',
    category: 'مكتب خارجي',
    location: 'نيودلهي - الهند',
    manager: 'Mr. Rajesh Kumar',
    staff_count: 22,
    departments: [
      { id: 'd-vrst-1', name: 'قسم اختيار واختبار العمالة المهنية والسائقين', description: 'اختبار رخص القيادة المهنية والمهن الحرفية للمؤسسات.', head: 'Rajesh Kumar', staff_count: 11, status: 'مفعل', kpi: 'اختبار ميداني 100%' },
      { id: 'd-vrst-2', name: 'قسم الفحوصات الطبية والجوازات بالهند', description: 'المتابعة مع المراكز الطبية المعتمدة بـ WAMY والسفارة.', head: 'Amitabh Sharma', staff_count: 11, status: 'مفعل', kpi: 'اعتماد سفارة 100%' }
    ]
  }
];

export const BranchDepartmentsPage: React.FC = () => {
  const [entities, setEntities] = useState<BranchEntity[]>(ALL_GROUP_ENTITIES);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('b-1');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'فرع منطقي' | 'شركة مجموعة' | 'مكتب خارجي'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const { addNotification } = useAppStore();

  // SubDepartment Form State
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    head: '',
    kpi: 'أداء 100%'
  });

  // Entity / Branch Form State
  const [entityForm, setEntityForm] = useState({
    name: '',
    code: '',
    category: 'فرع منطقي' as 'فرع منطقي' | 'شركة مجموعة' | 'مكتب خارجي',
    location: '',
    manager: '',
    staff_count: '6'
  });

  useEffect(() => {
    realErpDataStore.getRecords<BranchEntity>('branch_entities', ALL_GROUP_ENTITIES).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setEntities(data);
      } else {
        setEntities(ALL_GROUP_ENTITIES);
      }
    });
  }, []);

  const filteredEntities = useMemo(() => {
    return entities.filter(e => {
      if (!e) return false;
      if (activeCategoryFilter !== 'all' && e.category !== activeCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (e.name || '').toLowerCase().includes(q);
        const matchCode = (e.code || '').toLowerCase().includes(q);
        const matchLoc = (e.location || '').toLowerCase().includes(q);
        const matchMgr = (e.manager || '').toLowerCase().includes(q);
        const matchDept = (e.departments || []).some(d => (d?.name || '').toLowerCase().includes(q) || (d?.head || '').toLowerCase().includes(q));
        if (!matchName && !matchCode && !matchLoc && !matchMgr && !matchDept) return false;
      }
      return true;
    });
  }, [entities, activeCategoryFilter, searchQuery]);

  const selectedEntity = entities.find(e => e?.id === selectedEntityId) || filteredEntities[0] || entities[0] || ALL_GROUP_ENTITIES[0];

  // Overall KPI statistics
  const stats = useMemo(() => {
    const list = entities && entities.length > 0 ? entities : ALL_GROUP_ENTITIES;
    const totalStaff = list.reduce((acc, curr) => acc + (curr?.staff_count || 0), 0);
    const totalDepts = list.reduce((acc, curr) => acc + ((curr?.departments || []).length), 0);
    const branchesCount = list.filter(e => e?.category === 'فرع منطقي').length;
    const companiesCount = list.filter(e => e?.category === 'شركة مجموعة').length;
    const agenciesCount = list.filter(e => e?.category === 'مكتب خارجي').length;

    return {
      totalEntities: list.length,
      totalStaff,
      totalDepts,
      branchesCount,
      companiesCount,
      agenciesCount
    };
  }, [entities]);

  const handleAddSubDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.description) return;

    const newDept: SubDepartment = {
      id: `d-${Date.now()}`,
      name: deptForm.name,
      description: deptForm.description,
      head: deptForm.head || 'غير محدد',
      staff_count: 2,
      status: 'مفعل',
      kpi: deptForm.kpi,
    };

    const nextEntities = entities.map(eItem => {
      if (eItem.id === selectedEntityId) {
        return {
          ...eItem,
          departments: [...eItem.departments, newDept],
          staff_count: eItem.staff_count + 2
        };
      }
      return eItem;
    });

    setEntities(nextEntities);
    await realErpDataStore.saveRecords('branch_entities', nextEntities);

    // Also persist to PostgreSQL branch_departments table
    await realErpDataStore.addRecord('branch_departments', {
      id: `DEP-${Date.now()}`,
      dept_code: `DEP-${Date.now().toString().slice(-4)}`,
      dept_name: newDept.name,
      manager_name: newDept.head,
      branch: selectedEntity?.name || 'الفرع الرئيسي',
      employees_count: 2,
      status: 'نشط',
      description: newDept.description,
      kpi: newDept.kpi,
      head: newDept.head
    });

    setShowAddDeptModal(false);
    setDeptForm({ name: '', description: '', head: '', kpi: 'أداء 100%' });

    addNotification({
      title: 'إضافة قسم تخصصي',
      message: `تم إضافة قسم (${newDept.name}) بنجاح وحفظه في قاعدة البيانات.`,
      type: 'success',
    });
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityForm.name || !entityForm.code) return;

    const newEnt: BranchEntity = {
      id: `b-${Date.now()}`,
      name: entityForm.name,
      code: entityForm.code.toUpperCase(),
      category: entityForm.category,
      location: entityForm.location || 'المملكة العربية السعودية',
      manager: entityForm.manager || 'الإدارة العامة',
      staff_count: parseInt(entityForm.staff_count) || 6,
      departments: [
        {
          id: `d-${Date.now()}-1`,
          name: 'إدارة العمليات والتشغيل',
          description: 'الإشراف على خطط العمل اليومية وخدمة العملاء.',
          head: entityForm.manager || 'المدير التنفيذي',
          staff_count: 3,
          status: 'مفعل',
          kpi: 'جاهزية 100%'
        }
      ]
    };

    const updated = await realErpDataStore.addRecord<BranchEntity>('branch_entities', newEnt, ALL_GROUP_ENTITIES);
    setEntities(updated);

    // Also persist to PostgreSQL branches table
    await realErpDataStore.addRecord('branches', {
      id: `BR-${Date.now()}`,
      company_id: 'SAF',
      code: newEnt.code,
      name: newEnt.name,
      city: newEnt.location || 'الرياض',
      phone: '0112345678',
      manager_name: newEnt.manager,
      is_active: true
    });

    setSelectedEntityId(newEnt.id);
    setShowAddEntityModal(false);
    setEntityForm({
      name: '',
      code: '',
      category: 'فرع منطقي',
      location: '',
      manager: '',
      staff_count: '6'
    });

    addNotification({
      title: 'إضافة كيان أو فرع جديد',
      message: `تم تأسيس الكيان (${newEnt.name}) وتثبيته في قاعدة بيانات المنظومة بنجاح.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Pitch Black Cinematic Header matching ActivityLog/Master Design */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:block">
              <BusinessIllustration type="branch-network" size="sm" showBackground={false} />
            </div>
            <div className="sm:hidden" style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Network className="w-5 h-5 text-champagne-light" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  ENTERPRISE MATRIX
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  الهيكلية والأقسام التخصصية للمجموعة
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                دليل الهيكلية والأقسام التخصصية للشركات والفروع
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                مجموعة خالد السليم • توباز، دار الرواد، السفير، الماسي، الأيام للسفر، كاس للتجارة والمعارض، الفروع الإقليمية، والوكالات الدولية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowAddEntityModal(true)}
              className="button-white-pill text-xs font-bold flex items-center gap-2 shadow-lg"
              style={{ minHeight: '38px', padding: '8px 20px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ إضافة فرع / شركة جديدة</span>
            </button>

            <button
              onClick={() => setShowAddDeptModal(true)}
              className="button-white-pill text-xs font-bold flex items-center gap-2 shadow-lg hover:border-champagne"
              style={{ minHeight: '38px', padding: '8px 20px', backgroundColor: '#ffffff', color: '#000000', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 text-champagne-dark" />
              <span>+ إضافة قسم لـ ({selectedEntity?.code || 'الفرع'})</span>
            </button>

            <ExportDropdown
              sectionKey="branches"
              data={entities.flatMap(ent =>
                (ent?.departments || []).map(d => ({
                  entity_code: ent?.code || '',
                  entity_name: ent?.name || '',
                  category: ent?.category || 'فرع منطقي',
                  location: ent?.location || '',
                  manager: ent?.manager || '',
                  dept_name: d?.name || '',
                  head: d?.head || '',
                  staff_count: d?.staff_count || 0,
                  kpi: d?.kpi || '',
                  status: d?.status || 'مفعل',
                }))
              )}
              variant="outline-dark"
              customTitle="الهيكلية والأقسام التخصصية المعتمدة - مجموعة خالد السليم"
            />
          </div>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي الكيانات والشركات</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalEntities} كيان
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>{stats.companiesCount} شركات رئيسية</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>الفروع ومراكز الإيواء</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.branchesCount} فروع
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>الرياض، جدة، الخبر</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>الأقسام التخصصية المفعلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalDepts} قسم
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>{stats.agenciesCount} وكالات دولية</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>القوة البشرية الإجمالية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalStaff}
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-emerald-500 rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>كوادر إدارية وميدانية</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: `الكل (${entities.length})`, icon: Sparkles },
            { id: 'فرع منطقي', label: `الفروع والإيواء (${stats.branchesCount})`, icon: Landmark },
            { id: 'شركة مجموعة', label: `شركات المجموعة (${stats.companiesCount})`, icon: Gem },
            { id: 'مكتب خارجي', label: `المكاتب الخارجية (${stats.agenciesCount})`, icon: Globe },
          ].map(tab => {
            const isActive = activeCategoryFilter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id as any)}
                className={isActive ? 'button-primary-pill text-xs font-bold flex items-center gap-1.5' : 'button-outline-on-light text-xs font-medium flex items-center gap-1.5'}
                style={{ padding: '6px 18px', minHeight: '36px' }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الكود، المدير أو القسم..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Group Entities Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredEntities.map(e => {
          const isSelected = selectedEntityId === e.id;
          return (
            <div
              key={e.id}
              onClick={() => setSelectedEntityId(e.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-[#000000] bg-gradient-to-br from-[#1D2428] to-black text-white border-champagne shadow-xl scale-[1.02]'
                  : 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-zinc-200 dark:border-zinc-800 hover:border-champagne/40 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono border ${
                  isSelected
                    ? 'bg-champagne-pale/20 text-champagne-light border-champagne/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}>
                  {e.code}
                </span>
                <span className={isSelected ? 'pill-tag-mint text-[10px]' : 'pill-tag-shade text-[10px]'}>
                  {e.category}
                </span>
              </div>

              <h4 className="font-black text-sm mb-1 line-clamp-1 leading-snug">{e.name}</h4>
              <div className={`text-xs mt-2 flex items-center justify-between font-medium ${
                isSelected ? 'text-champagne-light/70' : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                  <CorporateAvatar name={e.manager} role={e.name} size="xs" />
                  <span className="truncate">{e.manager}</span>
                </div>
                <span className="font-bold text-[11px] shrink-0 font-mono">{(e.departments || []).length} أقسام • {e.staff_count || 0} موظف</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Entity Hero Overview Banner */}
      {selectedEntity && (
        <div className="rounded-3xl bg-gradient-to-r from-champagne-pale/80 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 border border-champagne/30 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-charcoal text-champagne-light font-mono font-black text-xs border border-champagne/30">
                  {selectedEntity.code}
                </span>
                <span className="pill-tag-mint text-xs">
                  {selectedEntity.category}
                </span>
                <span className="pill-tag-shade text-xs font-mono">
                  إجمالي الكادر: {selectedEntity.staff_count || 0} موظف
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{selectedEntity.name}</span>
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 font-medium">({selectedEntity.location})</span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 font-medium pt-0.5">
                <CorporateAvatar name={selectedEntity.manager} role={selectedEntity.name} size="sm" status="verified" />
                <span>
                  المشرف / المدير المسؤول: <strong className="text-champagne-dark dark:text-champagne-light">{selectedEntity.manager}</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAddDeptModal(true)}
              className="button-primary-pill text-xs font-black flex items-center gap-2 shadow-lg self-start md:self-center cursor-pointer"
              style={{ padding: '8px 22px', minHeight: '38px' }}
            >
              <Plus className="w-4 h-4" />
              <span>تطوير وإضافة قسم تخصصي</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Departments Cards Grid */}
      {selectedEntity && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-champagne-dark" />
              <span>الأقسام التخصصية والوحدات المفعلة داخل ({selectedEntity.name})</span>
            </h3>
            <span className="pill-tag-mint text-xs font-mono">
              {(selectedEntity.departments || []).length} أقسام تشغيلية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(selectedEntity.departments || []).map(dept => (
              <div 
                key={dept.id} 
                className="card-pricing border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-champagne/40 transition-all flex flex-col justify-between group bg-white dark:bg-zinc-900"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 rounded-full bg-champagne-pale dark:bg-zinc-800 text-champagne-dark border border-champagne/30 flex items-center justify-center font-bold shadow-xs">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="pill-tag-mint text-xs font-black">
                      {dept.kpi}
                    </span>
                  </div>

                  <h4 className="font-black text-base text-slate-900 dark:text-white mb-2 group-hover:text-champagne-dark transition-colors">
                    {dept.name}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium mb-4">
                    {dept.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <CorporateAvatar name={dept.head} role={dept.name} size="sm" />
                    <div>
                      <span>رئيس القسم: </span>
                      <strong className="text-slate-900 dark:text-white font-bold">{dept.head}</strong>
                    </div>
                  </div>
                  <span className="pill-tag-shade text-xs font-mono">
                    {dept.staff_count} كوادر
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Sub-Department Modal */}
      {showAddDeptModal && selectedEntity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-pricing bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 text-slate-900 dark:text-white relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-champagne via-champagne-light to-champagne-dark rounded-t-3xl" />

            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-champagne-dark" />
                <span>إضافة قسم تخصصي لـ ({selectedEntity.name})</span>
              </h3>
              <button 
                onClick={() => setShowAddDeptModal(false)} 
                className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم القسم التخصصي *</label>
                <input
                  type="text"
                  placeholder="مثال: إدارة الرعاية الطبية والفحوصات..."
                  value={deptForm.name}
                  onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-champagne font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">رئيس / مشرف القسم *</label>
                <input
                  type="text"
                  placeholder="اسم مسؤول القسم..."
                  value={deptForm.head}
                  onChange={e => setDeptForm({ ...deptForm, head: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-champagne font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الوصف المهني ومسؤوليات القسم *</label>
                <textarea
                  rows={3}
                  placeholder="اكتب مهام وأهداف هذا القسم التخصصي..."
                  value={deptForm.description}
                  onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-champagne font-medium text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">مؤشر الأداء المستهدف KPI</label>
                <input
                  type="text"
                  value={deptForm.kpi}
                  onChange={e => setDeptForm({ ...deptForm, kpi: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-champagne font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setShowAddDeptModal(false)} 
                  className="button-outline-on-light text-xs font-bold"
                  style={{ padding: '8px 20px' }}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="button-primary-pill text-xs font-bold flex items-center gap-2"
                  style={{ padding: '8px 22px' }}
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد القسم التخصصي</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Entity / Branch Modal */}
      {showAddEntityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-pricing bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-right dir-rtl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  إضافة فرع أو شركة مجموعة جديدة
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddEntityModal(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الفرع / الكيان المؤسسي *</label>
                <input
                  type="text"
                  placeholder="مثال: فرع مكة المكرمة أو شركة توباز للأعمال الذكية..."
                  value={entityForm.name}
                  onChange={e => setEntityForm({ ...entityForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كود الكيان المختصر (Code) *</label>
                  <input
                    type="text"
                    placeholder="مثال: BR-MAK"
                    value={entityForm.code}
                    onChange={e => setEntityForm({ ...entityForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-slate-900 dark:text-white uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تصنيف الكيان *</label>
                  <select
                    value={entityForm.category}
                    onChange={e => setEntityForm({ ...entityForm, category: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                  >
                    <option value="فرع منطقي">فرع منطقي وإقليمي</option>
                    <option value="شركة مجموعة">شركة شقيقة بالمجموعة</option>
                    <option value="مكتب خارجي">مكتب خارجي دولي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الموقع الجغرافي / المدينة</label>
                  <input
                    type="text"
                    placeholder="مثال: مكة المكرمة - العزيزية"
                    value={entityForm.location}
                    onChange={e => setEntityForm({ ...entityForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المدير المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم مدير الفرع أو المسؤول"
                    value={entityForm.manager}
                    onChange={e => setEntityForm({ ...entityForm, manager: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عدد الموظفين المبدئي</label>
                <input
                  type="number"
                  value={entityForm.staff_count}
                  onChange={e => setEntityForm({ ...entityForm, staff_count: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setShowAddEntityModal(false)} 
                  className="button-outline-on-light text-xs font-bold"
                  style={{ padding: '8px 20px' }}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="button-primary-pill text-xs font-bold flex items-center gap-2"
                  style={{ padding: '8px 22px', background: '#10b981' }}
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وتفعيل الكيان بقاعدة البيانات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchDepartmentsPage;
