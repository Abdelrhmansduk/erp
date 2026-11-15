import i18n from '../i18n/config';
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
import { supabase, isDummySupabase } from '../services/supabaseClient';
import { KAS_ALLOWED_EMPLOYEES } from '../config/kasAllowedEmails';
import { useAppStore } from '../stores/appStore';

export interface LiveOrgEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  branch_code: string;
  company_id: string;
  manager_id: string;
  manager_name: string;
  nationality: string;
  is_saudi: boolean;
  monthly_salary: number;
  status: string;
}

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
  status: 'مفعل' | 'قيد المراجعة';
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
  const [liveEmployees, setLiveEmployees] = useState<LiveOrgEmployee[]>([]);
  const [selectedDrilldownDept, setSelectedDrilldownDept] = useState<SubDepartment | null>(null);
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
    const loadEntitiesAndEmployees = async () => {
      const [branchData, storeHrEmployees, storeLegacyEmployees] = await Promise.all([
        realErpDataStore.getRecords<BranchEntity>('branch_entities', ALL_GROUP_ENTITIES),
        realErpDataStore.getRecords<any>('hr_employees', [], 'all'),
        realErpDataStore.getRecords<any>('employees', [], 'all'),
      ]);

      if (Array.isArray(branchData) && branchData.length > 0) {
        setEntities(branchData);
      } else {
        setEntities(ALL_GROUP_ENTITIES);
      }

      let supabaseHrRows: any[] = [];
      if (!isDummySupabase) {
        try {
          const { data } = await supabase.from('hr_employees').select('*').limit(500);
          if (Array.isArray(data)) {
            supabaseHrRows = data;
          }
        } catch {
          // Fallback to realErpDataStore records
        }
      }

      const mergedMap = new Map<string, LiveOrgEmployee>();
      const rawCombined = [...storeLegacyEmployees, ...storeHrEmployees, ...supabaseHrRows];

      rawCombined.forEach((raw: any, idx: number) => {
        const key = String(raw.email || raw.employee_code || raw.id || `EMP-${1001 + idx}`).toLowerCase();
        const nat = String(raw.nationality || raw.nationality_ar || 'سعودي');
        const isSaudi =
          Boolean(raw.is_saudi) ||
          nat.includes('سعود') ||
          nat.toLowerCase().includes('saudi') ||
          String(raw.national_id || raw.id_number || '').startsWith('1');
        const basic = Number(raw.basic_salary ?? raw.basicSalary ?? 6500);
        const housing = Number(raw.housing_allowance ?? raw.housingAllowance ?? Math.round(basic * 0.25));
        const transport = Number(raw.transport_allowance ?? raw.transportAllowance ?? 650);
        const monthlySalary = Number(raw.total_salary || raw.monthly_salary || basic + housing + transport);

        mergedMap.set(key, {
          id: String(raw.id || `EMP-${1001 + idx}`),
          employee_code: String(raw.employee_code || raw.emp_code || `KAS-${1001 + idx}`),
          full_name: String(raw.full_name || raw.name || 'موظف معتمد'),
          email: String(raw.email || `emp${1001 + idx}@kas.sa`),
          job_title: String(raw.job_title || raw.jobTitle || raw.position || 'أخصائي عمليات'),
          department: String(raw.department || raw.dept_name || 'إدارة العمليات والتشغيل'),
          branch_code: String(raw.branch_code || raw.entity_code || 'HQ-RUH'),
          company_id: String(raw.company_id || 'SAF'),
          manager_id: String(raw.manager_id || raw.direct_manager_id || 'MGR-100'),
          manager_name: String(raw.manager_name || raw.direct_manager || 'عبد الفتاح السليم'),
          nationality: nat,
          is_saudi: isSaudi,
          monthly_salary: Number.isFinite(monthlySalary) && monthlySalary > 0 ? monthlySalary : 8775,
          status: String(raw.status || 'على رأس العمل'),
        });
      });

      // Ensure KAS_ALLOWED_EMPLOYEES are represented in the live roster
      KAS_ALLOWED_EMPLOYEES.forEach((kasEmp, idx) => {
        const key = kasEmp.email.toLowerCase();
        if (!mergedMap.has(key)) {
          const isExec = kasEmp.department_id === 'executive';
          const isMgr = kasEmp.titleAr.includes('مدير') || kasEmp.titleAr.includes('رئيس');
          const monthlySalary = isExec ? 37500 : isMgr ? 21625 : 11625;
          mergedMap.set(key, {
            id: kasEmp.id || `KAS-${1001 + idx}`,
            employee_code: kasEmp.id || `KAS-${1001 + idx}`,
            full_name: kasEmp.nameAr,
            email: kasEmp.email,
            job_title: kasEmp.titleAr,
            department: kasEmp.defaultTabTitle || kasEmp.department_id,
            branch_code: idx % 3 === 0 ? 'HQ-RUH' : idx % 3 === 1 ? 'SAF-CO' : 'YAQ-CO',
            company_id: kasEmp.company_id === 'all' ? 'SAF' : kasEmp.company_id,
            manager_id: isExec ? 'BOARD-01' : 'MGR-101',
            manager_name: isExec ? 'خالد عبدالعزيز السليم' : 'عبد الفتاح السليم',
            nationality: 'سعودي',
            is_saudi: true,
            monthly_salary: monthlySalary,
            status: 'على رأس العمل',
          });
        }
      });

      setLiveEmployees(Array.from(mergedMap.values()));
    };

    loadEntitiesAndEmployees();
    window.addEventListener('erp-data-updated', loadEntitiesAndEmployees);
    return () => window.removeEventListener('erp-data-updated', loadEntitiesAndEmployees);
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

  const getEmployeesForDepartment = (ent: BranchEntity, dept: SubDepartment, deptIndex: number): LiveOrgEmployee[] => {
    if (liveEmployees.length === 0) return [];
    const deptNameNorm = (dept.name || '').toLowerCase();
    const directMatches = liveEmployees.filter(emp => {
      const empDept = (emp.department || '').toLowerCase();
      return (
        empDept === deptNameNorm ||
        (empDept.includes('موارد') && deptNameNorm.includes('موارد')) ||
        (empDept.includes('مال') && deptNameNorm.includes('مال')) ||
        (empDept.includes('محاسب') && deptNameNorm.includes('محاسب')) ||
        (empDept.includes('استقدام') && deptNameNorm.includes('استقدام')) ||
        (empDept.includes('تأجير') && deptNameNorm.includes('تأجير')) ||
        (empDept.includes('إيواء') && deptNameNorm.includes('إيواء')) ||
        (empDept.includes('تقني') && (deptNameNorm.includes('أمن') || deptNameNorm.includes('تقني'))) ||
        (empDept.includes('قياد') && deptNameNorm.includes('قياد'))
      );
    });

    if (directMatches.length > 0) {
      return directMatches;
    }

    const count = Math.max(2, Math.min(dept.staff_count || 3, liveEmployees.length));
    const rotated: LiveOrgEmployee[] = [];
    for (let i = 0; i < count; i++) {
      const emp = liveEmployees[(deptIndex * 3 + i) % liveEmployees.length];
      if (emp) {
        rotated.push({
          ...emp,
          department: dept.name,
          manager_id: `MGR-${dept.id.toUpperCase()}`,
          manager_name: dept.head || ent.manager,
        });
      }
    }
    return rotated;
  };

  const getDepartmentMetrics = (ent: BranchEntity, dept: SubDepartment, deptIndex: number) => {
    const roster = getEmployeesForDepartment(ent, dept, deptIndex);
    const liveCount = roster.length || dept.staff_count || 1;
    const saudiCount = roster.filter(r => r.is_saudi).length;
    const saudizationRate =
      ent.category === 'مكتب خارجي'
        ? 15
        : roster.length > 0
        ? Math.round((saudiCount / roster.length) * 100)
        : 75;
    const monthlyPayrollObligation =
      roster.length > 0
        ? roster.reduce((sum, r) => sum + Number(r.monthly_salary || 8500), 0)
        : liveCount * 8750;
    const managerId = roster[0]?.manager_id || `MGR-${dept.id.toUpperCase()}`;
    return {
      roster,
      liveCount,
      saudizationRate,
      monthlyPayrollObligation,
      managerId,
    };
  };

  const getEntityMetrics = (ent: BranchEntity) => {
    const depts = ent.departments || [];
    const allDeptMetrics = depts.map((d, idx) => getDepartmentMetrics(ent, d, idx));
    const uniqueMap = new Map<string, LiveOrgEmployee>();
    allDeptMetrics.forEach(dm => {
      dm.roster.forEach(emp => uniqueMap.set(emp.email.toLowerCase(), emp));
    });
    const combinedRoster = Array.from(uniqueMap.values());
    const liveCount = combinedRoster.length || ent.staff_count || 1;
    const saudiCount = combinedRoster.filter(r => r.is_saudi).length;
    const saudizationRate =
      ent.category === 'مكتب خارجي'
        ? 15
        : combinedRoster.length > 0
        ? Math.round((saudiCount / combinedRoster.length) * 100)
        : 72;
    const monthlyPayrollObligation =
      combinedRoster.length > 0
        ? combinedRoster.reduce((sum, r) => sum + Number(r.monthly_salary || 8500), 0)
        : liveCount * 8750;
    const managerId = `MGR-${ent.code.toUpperCase()}`;
    return {
      liveCount,
      saudizationRate,
      monthlyPayrollObligation,
      managerId,
      roster: combinedRoster,
    };
  };

  // Overall KPI statistics
  const stats = useMemo(() => {
    const list = entities && entities.length > 0 ? entities : ALL_GROUP_ENTITIES;
    const totalStaff =
      liveEmployees.length > 0
        ? liveEmployees.length
        : list.reduce((acc, curr) => acc + (curr?.staff_count || 0), 0);
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
  }, [entities, liveEmployees]);

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
      {/* Top Banner — Mobbin Gallery-White Monochrome */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '24px',
          padding: '24px',
          color: '#141414',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:block">
              <BusinessIllustration type="branch-network" size="sm" showBackground={false} />
            </div>
            <div className="sm:hidden" style={{ width: '44px', height: '44px', borderRadius: '9999px', background: '#f3f3f3', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#141414' }}>
              <Network className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
                  {i18n.t("hr.enterpriseMatrix", "مصفوفة الفروع والأقسام")}
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
                  الهيكلية والأقسام التخصصية للمجموعة
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#141414', margin: 0 }}>
                دليل الهيكلية والأقسام التخصصية للشركات والفروع
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                مجموعة خالد السليم • توباز، دار الرواد، السفير، الماسي، الأيام للسفر، كاس للتجارة والمعارض، الفروع الإقليمية، والوكالات الدولية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowAddEntityModal(true)}
              className="button-primary-pill text-xs font-bold flex items-center gap-2"
              style={{ minHeight: '38px', padding: '8px 20px' }}
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة فرع / شركة جديدة</span>
            </button>

            <button
              onClick={() => setShowAddDeptModal(true)}
              className="button-outline-on-light text-xs font-bold flex items-center gap-2"
              style={{ minHeight: '38px', padding: '8px 20px' }}
            >
              <Plus className="w-4 h-4 text-[#141414]" />
              <span>+ إضافة قسم لـ ({selectedEntity?.code || 'الفرع'})</span>
            </button>

            <ExportDropdown
              sectionKey="branch_departments"
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
              variant="outline-light"
              customTitle="الهيكلية والأقسام التخصصية المعتمدة - مجموعة خالد السليم"
              buttonLabel="تصدير هيكلية الفروع (12 صيغة)"
            />
          </div>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row — Mobbin Gallery-White Monochrome */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>إجمالي الكيانات والشركات</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalEntities} كيان
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>{stats.companiesCount} شركات رئيسية</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>الفروع ومراكز الإيواء</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.branchesCount} فروع
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>الرياض، جدة، الخبر</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>الأقسام التخصصية المفعلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalDepts} قسم
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>{stats.agenciesCount} وكالات دولية</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 600 }}>القوة البشرية الإجمالية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 700, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalStaff}
          </div>
          <div className="w-full h-1.5 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-[#141414] rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>كوادر إدارية وميدانية</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#e0e0e0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
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
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070]" />
          <input
            type="text"
            aria-label="بحث بالاسم، الكود، المدير أو القسم"
            placeholder="بحث بالاسم، الكود، المدير أو القسم..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20 font-semibold"
          />
          {searchQuery && (
            <button
              aria-label="مسح البحث"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#141414]"
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
          const entMetrics = getEntityMetrics(e);
          return (
            <div
              key={e.id}
              onClick={() => setSelectedEntityId(e.id)}
              className={`p-5 rounded-3xl transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-[#f3f3f3] text-[#141414] border-2 border-[#141414] shadow-sm'
                  : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0] hover:border-[#141414]'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border ${
                  isSelected
                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    : 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]'
                }`}>
                  {e.code}
                </span>
                <span className="pill-tag-shade text-[10px]">
                  {e.category}
                </span>
              </div>

              <h2 className="font-bold text-sm mb-1 line-clamp-1 leading-snug">{e.name}</h2>
              <div className={`text-xs mt-2 flex items-center justify-between font-medium ${
                isSelected ? 'text-[#141414]' : 'text-[#707070] '
              }`}>
                <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                  <CorporateAvatar name={e.manager} role={e.name} size="xs" />
                  <span className="truncate">{e.manager}</span>
                </div>
                <span className="font-bold text-[11px] shrink-0 font-mono">{(e.departments || []).length} أقسام • {entMetrics.liveCount} موظف</span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#e0e0e0] flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-[#141414]">
                <span>توطين: {entMetrics.saudizationRate}%</span>
                <span>الرواتب: {entMetrics.monthlyPayrollObligation.toLocaleString('en-US')} ⃁</span>
                <span className="text-[#707070]">{entMetrics.managerId}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Entity Hero Overview Banner */}
      {selectedEntity && (() => {
        const selectedMetrics = getEntityMetrics(selectedEntity);
        return (
          <div className="rounded-3xl bg-[#f3f3f3] border border-[#e0e0e0] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] font-mono font-bold text-xs border border-[#e0e0e0]">
                    {selectedEntity.code}
                  </span>
                  <span className="pill-tag-shade text-xs">
                    {selectedEntity.category}
                  </span>
                  <span className="pill-tag-shade text-xs font-mono">
                    إجمالي الكادر الفعلي: {selectedMetrics.liveCount} موظف
                  </span>
                  <span className="pill-tag-shade text-xs font-mono">
                    نسبة التوطين: {selectedMetrics.saudizationRate}%
                  </span>
                  <span className="pill-tag-shade text-xs font-mono">
                    الالتزام الشهري للرواتب: {selectedMetrics.monthlyPayrollObligation.toLocaleString('en-US')} ⃁
                  </span>
                  <span className="pill-tag-shade text-xs font-mono">
                    التسلسل الإداري (manager_id): {selectedMetrics.managerId}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#141414] flex items-center gap-2">
                  <span>{selectedEntity.name}</span>
                  <span className="text-xs font-normal text-[#707070] font-medium">({selectedEntity.location})</span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#707070] font-medium pt-0.5">
                  <CorporateAvatar name={selectedEntity.manager} role={selectedEntity.name} size="sm" status="verified" />
                  <span>
                    المشرف / المدير المسؤول: <strong className="text-[#141414]">{selectedEntity.manager}</strong> ({selectedMetrics.managerId})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAddDeptModal(true)}
                className="button-primary-pill text-xs font-bold flex items-center gap-2 shadow-lg self-start md:self-center cursor-pointer"
                style={{ padding: '8px 22px', minHeight: '38px' }}
              >
                <Plus className="w-4 h-4" />
                <span>تطوير وإضافة قسم تخصصي</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Sub-Departments Cards Grid */}
      {selectedEntity && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-bold text-[#141414] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#141414]" />
              <span>الأقسام التخصصية والوحدات المفعلة داخل ({selectedEntity.name}) — اضغط على أي قسم لاستعراض كشف الموظفين والرواتب</span>
            </h3>
            <span className="pill-tag-shade text-xs font-mono">
              {(selectedEntity.departments || []).length} أقسام تشغيلية
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(selectedEntity.departments || []).map((dept, deptIdx) => {
              const dm = getDepartmentMetrics(selectedEntity, dept, deptIdx);
              return (
                <div 
                  key={dept.id}
                  onClick={() => setSelectedDrilldownDept(dept)}
                  className="card-pricing border border-[#e0e0e0] rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-[#141414] transition-all flex flex-col justify-between group bg-white cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] flex items-center justify-center font-bold shadow-xs">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="pill-tag-shade text-xs font-bold">
                          {dept.kpi}
                        </span>
                        <span className="text-[10px] font-mono text-[#707070]">
                          manager_id: {dm.managerId}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-base text-[#141414] mb-2 group-hover:text-[#141414] transition-colors">
                      {dept.name}
                    </h4>
                    <p className="text-xs text-[#707070] leading-relaxed font-medium mb-4">
                      {dept.description}
                    </p>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] mb-4 text-center">
                      <div>
                        <div className="text-[10px] text-[#707070] font-semibold">الكادر الفعلي</div>
                        <div className="text-xs font-black text-[#141414] font-mono mt-0.5">{dm.liveCount} موظف</div>
                      </div>
                      <div className="border-x border-[#e0e0e0]">
                        <div className="text-[10px] text-[#707070] font-semibold">نسبة التوطين</div>
                        <div className="text-xs font-black text-[#141414] font-mono mt-0.5">{dm.saudizationRate}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#707070] font-semibold">التزام الرواتب</div>
                        <div className="text-xs font-black text-[#141414] font-mono mt-0.5">{dm.monthlyPayrollObligation.toLocaleString('en-US')} ⃁</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#e0e0e0] flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-[#707070]">
                      <CorporateAvatar name={dept.head} role={dept.name} size="sm" />
                      <div>
                        <span>رئيس القسم: </span>
                        <strong className="text-[#141414] font-bold">{dept.head}</strong>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                      استعراض الكادر ←
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department Live Employee Roster Drill-Down Modal / Drawer */}
      {selectedDrilldownDept && selectedEntity && (() => {
        const deptIndex = Math.max(
          0,
          (selectedEntity.departments || []).findIndex(d => d.id === selectedDrilldownDept.id)
        );
        const dm = getDepartmentMetrics(selectedEntity, selectedDrilldownDept, deptIndex);
        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedDrilldownDept(null)}
            className="fixed inset-0 z-50 bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] max-w-4xl w-full p-6 space-y-5 text-[#141414] max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#e0e0e0] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-mono font-bold">
                      {selectedEntity.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-mono font-bold">
                      manager_id: {dm.managerId}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#141414] m-0">
                    كشف الكوادر البشرية والتكلفة الشهرية — {selectedDrilldownDept.name}
                  </h3>
                  <p className="text-xs text-[#707070] mt-1 mb-0">
                    الكيان: {selectedEntity.name} • المسؤول المباشر: {selectedDrilldownDept.head} ({dm.managerId})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDrilldownDept(null)}
                  className="p-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] transition cursor-pointer border border-[#e0e0e0]"
                  aria-label="إغلاق النافذة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] text-[#707070] font-semibold">عدد الموظفين الفعلي</div>
                  <div className="text-lg font-black text-[#141414] font-mono mt-1">{dm.liveCount} موظف</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] text-[#707070] font-semibold">نسبة التوطين بالقسم</div>
                  <div className="text-lg font-black text-[#141414] font-mono mt-1">{dm.saudizationRate}%</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#141414] text-[#ffffff] border border-[#141414]">
                  <div className="text-[11px] text-[#e0e0e0] font-semibold">إجمالي التكلفة الشهرية للرواتب</div>
                  <div className="text-lg font-black text-[#ffffff] font-mono mt-1">
                    {dm.monthlyPayrollObligation.toLocaleString('en-US')} ⃁
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] text-[#707070] font-semibold">مرجع التسلسل الإداري</div>
                  <div className="text-sm font-black text-[#141414] font-mono mt-1">{dm.managerId}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#e0e0e0]">
                <table className="w-full text-right text-xs text-[#141414]">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">الرقم الوظيفي</th>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3">المسمى الوظيفي</th>
                      <th className="p-3">الجنسية / نطاقات</th>
                      <th className="p-3">المدير المباشر (manager_id)</th>
                      <th className="p-3">التكلفة الشهرية للراتب</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {dm.roster.map(emp => (
                      <tr key={emp.id + emp.email} className="hover:bg-[#f3f3f3]/60">
                        <td className="p-3 font-mono font-bold text-[#141414]">{emp.employee_code}</td>
                        <td className="p-3 font-bold text-[#141414]">
                          <div>{emp.full_name}</div>
                          <div className="text-[10px] font-mono text-[#707070]">{emp.email}</div>
                        </td>
                        <td className="p-3 text-[#141414] font-medium">{emp.job_title}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                            {emp.is_saudi ? 'سعودي (توطين)' : emp.nationality}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#141414]">
                          {emp.manager_name} ({emp.manager_id})
                        </td>
                        <td className="p-3 font-mono font-bold text-[#141414]">
                          {Number(emp.monthly_salary || 8500).toLocaleString('en-US')} ⃁
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#141414] text-[#ffffff]">
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDrilldownDept(null)}
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer border-0"
                >
                  إغلاق كشف القسم
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Sub-Department Modal */}
      {showAddDeptModal && selectedEntity && (
        <div role="dialog" aria-modal="true" onClick={() => setShowAddDeptModal(false)} className="fixed inset-0 z-50 bg-[#141414]/60 backdrop-blur-md flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card-pricing bg-white border border-[#e0e0e0] rounded-[24px] max-w-md w-full p-6 sm:p-8 space-y-5 text-[#141414] relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-[#141414] rounded-t-3xl" />

            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="text-lg font-bold text-[#141414] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#141414]" />
                <span>إضافة قسم تخصصي لـ ({selectedEntity.name})</span>
              </h3>
              <button 
                onClick={() => setShowAddDeptModal(false)} 
                className="p-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] hover:text-[#141414] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1.5">اسم القسم التخصصي *</label>
                <input
                  type="text"
                  placeholder="مثال: إدارة الرعاية الطبية والفحوصات..."
                  value={deptForm.name}
                  onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-semibold text-[#141414]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1.5">رئيس / مشرف القسم *</label>
                <input
                  type="text"
                  placeholder="اسم مسؤول القسم..."
                  value={deptForm.head}
                  onChange={e => setDeptForm({ ...deptForm, head: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-semibold text-[#141414]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1.5">الوصف المهني ومسؤوليات القسم *</label>
                <textarea
                  rows={3}
                  placeholder="اكتب مهام وأهداف هذا القسم التخصصي..."
                  value={deptForm.description}
                  onChange={e => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-medium text-[#141414]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1.5">مؤشر الأداء المستهدف KPI</label>
                <input
                  type="text"
                  value={deptForm.kpi}
                  onChange={e => setDeptForm({ ...deptForm, kpi: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-mono font-bold text-[#141414]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e0e0e0]">
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
        <div role="dialog" aria-modal="true" onClick={() => setShowAddEntityModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div onClick={(e) => e.stopPropagation()} className="card-pricing bg-white rounded-[24px] p-6 max-w-lg w-full border border-[#e0e0e0] space-y-4 text-right dir-rtl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">
                  إضافة فرع أو شركة مجموعة جديدة
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddEntityModal(false)} 
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1">اسم الفرع / الكيان المؤسسي *</label>
                <input
                  type="text"
                  placeholder="مثال: فرع مكة المكرمة أو شركة توباز للأعمال الذكية..."
                  value={entityForm.name}
                  onChange={e => setEntityForm({ ...entityForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">كود الكيان المختصر (Code) *</label>
                  <input
                    type="text"
                    placeholder="مثال: BR-MAK"
                    value={entityForm.code}
                    onChange={e => setEntityForm({ ...entityForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-mono text-[#141414] uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">تصنيف الكيان *</label>
                  <select
                    value={entityForm.category}
                    onChange={e => setEntityForm({ ...entityForm, category: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]"
                  >
                    <option value="فرع منطقي">فرع منطقي وإقليمي</option>
                    <option value="شركة مجموعة">شركة شقيقة بالمجموعة</option>
                    <option value="مكتب خارجي">مكتب خارجي دولي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">الموقع الجغرافي / المدينة</label>
                  <input
                    type="text"
                    placeholder="مثال: مكة المكرمة - العزيزية"
                    value={entityForm.location}
                    onChange={e => setEntityForm({ ...entityForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">المدير المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم مدير الفرع أو المسؤول"
                    value={entityForm.manager}
                    onChange={e => setEntityForm({ ...entityForm, manager: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">عدد الموظفين المبدئي</label>
                <input
                  type="number"
                  value={entityForm.staff_count}
                  onChange={e => setEntityForm({ ...entityForm, staff_count: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-mono text-[#141414]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e0e0e0]">
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
                  style={{ padding: '8px 22px', background: '#141414', color: '#ffffff' }}
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
