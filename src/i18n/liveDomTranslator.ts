import { TRANSLATIONS } from './languages';

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;

/**
 * High-frequency exact Arabic -> English ERP phrase dictionary for 0ms synchronous translation.
 */
const AR_EXACT_EN: Record<string, string> = {
  // Common Statuses & Badges
  'نشط': 'Active',
  'نشطة': 'Active',
  'مفعل': 'Enabled',
  'مفعّل': 'Enabled',
  'معتمد': 'Approved',
  'معتمدة': 'Approved',
  'مكتمل': 'Completed',
  'مكتملة': 'Completed',
  'معلق': 'Pending',
  'معلقة': 'Pending',
  'قيد المراجعة': 'Under Review',
  'قيد الإجراء': 'In Progress',
  'بانتظار الاعتماد': 'Awaiting Approval',
  'تحت التقييم': 'Under Evaluation',
  'مرفوض': 'Rejected',
  'ملغي': 'Cancelled',
  'مسودة': 'Draft',
  'ساري': 'Valid',
  'سارية': 'Valid',
  'متاح': 'Available',
  'متوفر': 'Available',
  'محظور': 'Blocked',
  'متأخر': 'Overdue',
  'عاجل': 'Urgent',
  'حرج': 'Critical',
  'مرتفع': 'High',
  'متوسط': 'Medium',
  'منخفض': 'Low',
  'عادي': 'Normal',
  'جديد': 'New',
  'الكل': 'All',
  'غير محدد': 'Unspecified',
  'متصل': 'Connected',
  'وضع عدم الاتصال': 'Offline Mode',

  // Common Actions & Buttons
  'إلغاء': 'Cancel',
  'إغلاق': 'Close',
  'حفظ': 'Save',
  'تعديل': 'Edit',
  'حذف': 'Delete',
  'إنشاء': 'Create',
  'إضافة': 'Add',
  'تصدير': 'Export',
  'طباعة': 'Print',
  'بحث': 'Search',
  'تحديث': 'Refresh',
  'معاينة': 'Preview',
  'اعتماد': 'Approve',
  'رفض': 'Reject',
  'إرسال': 'Send',
  'تأكيد': 'Confirm',
  'رجوع': 'Back',
  'التالي': 'Next',
  'السابق': 'Previous',
  'تفاصيل': 'Details',
  'عرض الكل': 'View All',
  'تصفية': 'Filter',
  'مسح الفلاتر': 'Clear Filters',
  'مزامنة الآن': 'Sync Now',
  'تسجيل الخروج': 'Sign Out',
  'تسجيل الخروج من القسم': 'Sign Out of Department',

  // Common Table Headers & Fields
  'الحالة': 'Status',
  'الإجراءات': 'Actions',
  'التاريخ': 'Date',
  'الجنسية': 'Nationality',
  'المهنة': 'Profession',
  'المسمى الوظيفي': 'Job Title',
  'المبلغ': 'Amount',
  'الإجمالي': 'Total',
  'الإجمالي شامل الضريبة': 'Total (Incl. VAT)',
  'ضريبة القيمة المضافة (15%)': 'VAT (15%)',
  'الكمية': 'Quantity',
  'البيان': 'Description',
  'الملاحظات': 'Notes',
  'اسم العميل': 'Client Name',
  'العميل': 'Client',
  'اسم الموظف': 'Employee Name',
  'الموظف': 'Employee',
  'اسم العاملة': 'Worker Name',
  'العاملة': 'Worker',
  'رقم الجوال': 'Mobile Number',
  'البريد الإلكتروني': 'Email Address',
  'رقم الجواز': 'Passport No.',
  'رقم العقد': 'Contract No.',
  'رقم الفاتورة': 'Invoice No.',
  'رقم الطلب': 'Order No.',
  'الرقم المرجعي': 'Reference No.',
  'الفرع': 'Branch',
  'المسؤول': 'Assignee',
  'المكتب الخارجي': 'Foreign Agency',
  'مكتب خارجي': 'Foreign Agency',

  // Nationalities & Countries
  'الفلبين': 'Philippines',
  'إثيوبيا': 'Ethiopia',
  'اثيوبيا': 'Ethiopia',
  'إندونيسيا': 'Indonesia',
  'كينيا': 'Kenya',
  'أوغندا': 'Uganda',
  'الهند': 'India',
  'سريلانكا': 'Sri Lanka',
  'بنغلاديش': 'Bangladesh',
  'باكستان': 'Pakistan',
  'نيبال': 'Nepal',
  'السعودية': 'Saudi Arabia',

  // Professions
  'عاملة منزلية': 'Domestic Worker',
  'سائق خاص': 'Private Driver',
  'ممرضة منزلية': 'Home Nurse',
  'طباخ منزلي': 'Home Chef',
  'حارس منزلي': 'Home Guard',

  // Accounting & Finance
  'مدين': 'Debit',
  'دائن': 'Credit',
  'قبض': 'Receipt',
  'صرف': 'Payment',
  'أصول': 'Assets',
  'خصوم': 'Liabilities',
  'إيرادات': 'Revenues',
  'مصروفات': 'Expenses',
  'تحويل بنكي': 'Bank Transfer',
  'نقدي': 'Cash',
  'مصرف الراجحي': 'Al Rajhi Bank',
  'البنك الأهلي السعودي': 'Saudi National Bank (SNB)',
  'بنك الرياض': 'Riyad Bank',
  'مصرف الإنماء': 'Alinma Bank',
  'قائمة المركز المالي (ميزانية)': 'Statement of Financial Position (Balance Sheet)',
  'الإدارة المالية': 'Financial Management',
  'الموارد البشرية': 'Human Resources',

  // Shelter & Operations
  'داخل الإيواء': 'Inside Shelter',
  'خرجت للعميل': 'Delivered to Client',
  'متاحة لنقل الخدمات': 'Available for Transfer',
  'بانتظار نقل الخدمات': 'Awaiting Sponsorship Transfer',
  'مرحلة الترحيل': 'Repatriation Stage',
  'ترغب بالعمل': 'Willing to Work',
  'لا ترغب بالعمل': 'Unwilling to Work',
  'تم التعاقد': 'Contracted',
  'نقل خدمات': 'Sponsorship Transfer',
  'استقدام': 'Recruitment',
  'تأجير': 'Rental',
  'مساند': 'Musaned',

  // Branches & Corporate Entities
  'الفرع الرئيسي - الرياض': 'Main Branch - Riyadh',
  'فرع الرياض الرئيسي': 'Riyadh Main Branch',
  'الفرع الرئيسي': 'Main Branch',
  'فرع الرياض (التخصصي)': 'Riyadh Branch (Takhassusi)',
  'فرع الرياض': 'Riyadh Branch',
  'فرع جدة': 'Jeddah Branch',
  'فرع الدمام': 'Dammam Branch',
  'فرع خميس مشيط': 'Khamis Mushait Branch',
  'الرياض': 'Riyadh',
  'جدة': 'Jeddah',
  'الدمام': 'Dammam',
  'خميس مشيط': 'Khamis Mushait',
  'الشيخ خالد بن عبدالعزيز السليم': 'Sheikh Khalid bin Abdulaziz Al-Sulaim',
  'رئيس مجلس الإدارة': 'Chairman of the Board',
  'فارس': 'Faris',
  'نُورة': 'Noura',

  // Screen & Module Titles from SLUG_ARABIC_TITLES
  'الرئيسية (لوحة المؤشرات التنفيذية)': 'Home (Executive KPI Dashboard)',
  'لوحة المؤشرات التنفيذية': 'Executive KPI Dashboard',
  'مركز القيادة الموحد للمجموعة': 'Unified Group Command Center',
  'لوحة الرقابة العليا والحوكمة': 'Supreme Governance & Audit Dashboard',
  'مركز الإدارة المالية والمحاسبية الموحد': 'Unified Financial & Accounting Hub',
  'شجرة الحسابات والأستاذ العام': 'Chart of Accounts & General Ledger',
  'سندات القبض والصرف والتسويات البنكية': 'Receipt, Payment Vouchers & Bank Reconciliation',
  'إدارة المخزون والأصول الثابتة': 'Inventory & Fixed Assets Management',
  'الأقسام المالية والمحاسبية الستة': 'Six Core Financial & Accounting Modules',
  'إعدادات موظفي وصلاحيات المالية': 'Finance Staff & Permissions Settings',
  'لوحة المؤشرات والقوائم المالية': 'Financial KPIs & Statements Dashboard',
  'الإدارة المالية والمحاسبة العامة': 'Financial Management & General Accounting',
  'ميزان المراجعة بالمجاميع والأرصدة': 'Trial Balance (Totals & Balances)',
  'قائمة الدخل والأرباح والخسائر': 'Income Statement (Profit & Loss)',
  'الفوترة الإلكترونية ZATCA المرحلة الثانية': 'ZATCA E-Invoicing Phase 2',
  'فواتير المبيعات والعقود الضريبية': 'Sales & Tax Contract Invoices',
  'قيود اليومية المزدوجة والترحيل': 'Double-Entry Journal Vouchers & Posting',
  'العهد المالية وطلبات الصرف': 'Financial Custodies & Payment Requests',
  'مراكز التكلفة وتوزيع المشاريع': 'Cost Centers & Project Allocation',
  'العهد النقدية والعينية للموظفين': 'Employee Cash & Asset Custodies',
  'إدارة عقود الاستقدام الموحدة (مساند)': 'Unified Musaned Recruitment Contracts',
  'عقود الاستقدام الموثقة (مساند)': 'Authenticated Musaned Recruitment Contracts',
  'إنشاء عقد استقدام مساند جديد': 'Create New Musaned Recruitment Contract',
  'عقود الاستقدام السارية': 'Active Recruitment Contracts',
  'الربط المباشر مع منصة مساند': 'Direct Musaned Portal Integration',
  'طلبات الاستقدام والحجوزات (SLA)': 'Recruitment Orders & Bookings (SLA)',
  'طلبات الاستقدام قيد الإجراء': 'In-Progress Recruitment Orders',
  'تفاويض إنجاز والتأشيرات والغرف التجارية': 'Enjaz Delegations, Visas & Chamber of Commerce',
  'نقل الخدمات والتنازل وفترة التجربة': 'Sponsorship Transfer & Probation Period',
  'متابعة فترة التجربة (90 يوماً)': '90-Day Probation Period Tracking',
  'إدارة حركة السفر والرحلات والمطارات': 'Flight, Travel & Airport Reception Management',
  'تفويج العاملات الجماعي وجدولة الاستقبال': 'Group Worker Dispatch & Reception Scheduling',
  'إدارة عقود التأجير والتشغيل المرن': 'Flexible Rental & Operations Management',
  'سجل عقود التأجير والتشغيل المرن': 'Flexible Rental Contracts Register',
  'إضافة عقد تأجير مرن جديد': 'Create New Flexible Rental Contract',
  'باقات وأسعار التأجير المعتمدة': 'Approved Rental Packages & Pricing',
  'تشغيل وجدولة السائقين': 'Drivers Operations & Scheduling',
  'تشغيل العمالة المنزلية بالساعة والشهر': 'Hourly & Monthly Domestic Workers Operations',
  'سير التأجير الجاهزة للتسليم الفوري': 'Rental CVs Ready for Immediate Handover',
  'عقود التأجير المرتجعة والتسويات': 'Returned Rental Contracts & Settlements',
  'مسار الفرز والتوظيف المؤسسي الذكي (ATS)': 'Smart Enterprise ATS Recruitment Pipeline',
  'بنك السير الذاتية والمرشحين المعتمد': 'Certified Candidate CV Bank',
  'إضافة سيرة ذاتية ومسح جواز السفر': 'Add Candidate CV & Passport OCR Scan',
  'إدارة المكاتب والوكالات الخارجية': 'Foreign Offices & Agencies Management',
  'عقود وحصص الوكالات الدولية': 'International Agency Contracts & Quotas',
  'كشوف حسابات الوكلاء الخارجيين': 'Foreign Agents Account Statements',
  'حوالات المكاتب والوكالات الدولية': 'International Agency Remittances',
  'بوابة الشركاء والوكالات الخارجية': 'Foreign Partners & Agencies Portal',
  'استيراد دفعات السير الذاتية من الوكلاء': 'Batch CV Import from Foreign Agents',
  'إدارة الموارد البشرية ومسيرات الرواتب': 'Human Resources & Payroll Management',
  'سجل الموظفين والملفات الوظيفية (HR)': 'Employee Directory & Personnel Files (HR)',
  'مسيرات الرواتب وحماية الأجور (WPS)': 'Payroll Runs & Wage Protection System (WPS)',
  'عقود قوى والتأمينات الاجتماعية (GOSI)': 'Qiwa Contracts & Social Insurance (GOSI)',
  'الإجازات والاستحقاقات ونهاية الخدمة': 'Leaves, Entitlements & End of Service (EOSB)',
  'سجل الحضور والانصراف والبصمة الذكية': 'Biometric Attendance & Shifts Register',
  'رادار الإنتاجية والنبض الوظيفي الذكي': 'Smart Workforce Productivity & Pulse Radar',
  'منظومة متابعة النقرات والإنتاجية الذكية': 'Smart Clicks & Workforce Activity Tracker',
  'دليل الهيكلية والأقسام التخصصية للفروع': 'Branch Organizational Structure & Departments',
  'دليل الهيكلية والأقسام التخصصية للشركات والفروع': 'Corporate & Branch Organizational Directory',
  'سجل العملاء وأصحاب العمل (CRM)': 'Clients & Employers Register (CRM)',
  'كبار العملاء وحسابات VIP': 'VIP Clients & Key Accounts',
  'عملاء قطاع الأعمال والشركات (B2B)': 'Corporate & B2B Clients',
  'مركز علاقات العملاء والشكاوى ومؤشر SLA': 'Customer Care, Complaints & SLA Center',
  'صندوق الواتساب المؤسسي الموحد': 'Unified Enterprise WhatsApp Inbox',
  'مركز الاتصال الموحد وقنوات التراسل': 'Unified Contact Center & Messaging Channels',
  'سجل الإشعارات والرسائل النصية (SMS)': 'Notifications & SMS Dispatch Log',
  'بوابة الخدمة الذاتية للعملاء': 'Client Self-Service Portal',
  'تحليلات زوار المنصة وطلبات البوابة': 'Portal Visitor Analytics & Online Leads',
  'بوابة مراكز الإيواء والتسكين (دار الرواد)': 'Ewaa Shelter & Welfare Hub (Dar Al-Ruwad)',
  'منظومة إدارة مركز الإيواء الشاملة (HRSD)': 'Comprehensive HRSD Shelter Management Suite',
  'سجل العاملات داخل مركز الإيواء': 'Workers Inside Shelter Register',
  'إدارة الغرف والأجنحة والأسرة': 'Rooms, Wings & Bed Capacity Management',
  'الإعاشة اليومية والرعاية الصحية': 'Daily Catering & Healthcare Log',
  'العاملات الجاهزات لنقل الكفالة': 'Workers Ready for Sponsorship Transfer',
  'إجراءات السفر والترحيل النظامي': 'Travel & Authorized Repatriation Procedures',
  'أرشيف الخروج النهائي والمخالصات': 'Final Exit & Clearance Archive',
  'منظومة شركة كاس للمنافسات والمشاريع (KAS Suite)': 'KAS Tenders & Government Projects Suite',
  'منافسات اعتماد وجداول الكميات (BOQ)': 'Etimad Tenders & Bill of Quantities (BOQ)',
  'سحابة منافسات اعتماد (2,650+ منافسة)': 'Etimad Tenders Cloud (2,650+ Tenders)',
  'سحابة منافسات اعتماد (KAS Etimad Cloud)': 'KAS Etimad Tenders Cloud',
  'أوامر الشراء والتوريد للمشاريع': 'Project Purchase & Supply Orders',
  'خطابات الضمان البنكية للمنافسات': 'Tender Bank Guarantees (Letters of Guarantee)',
  'إدارة الهوية والصلاحيات والأمان (IAM & RBAC)': 'Identity, Access & Security Management (IAM & RBAC)',
  'إدارة الهوية والصلاحيات والأمان (IAM)': 'Identity, Access & Security Management (IAM)',
  'إدارة المستخدمين وحسابات الأقسام': 'Department Users & Accounts Management',
  'التقارير التحليلية الموحدة وذكاء الأعمال (BI)': 'Unified Analytical Reports & Business Intelligence (BI)',
  'الحوكمة والامتثال القانوني والنظامي': 'Governance, Legal & Regulatory Compliance',
  'ثوابت النظام المرجعية والترميز': 'System Master Constants & Coding',
  'سجل التدقيق الأمني والعمليات (Audit Trail)': 'Security & Operations Audit Trail',
  'إعدادات النظام والربط السحابي': 'System Settings & Cloud Integration',
};

// Also index all ar -> lang pairs from TRANSLATIONS
const REVERSE_AR_MAP: Record<string, string> = {};
if (TRANSLATIONS.ar && TRANSLATIONS.en) {
  for (const [key, arVal] of Object.entries(TRANSLATIONS.ar)) {
    if (arVal && TRANSLATIONS.en[key]) {
      AR_EXACT_EN[arVal.trim()] = TRANSLATIONS.en[key];
      REVERSE_AR_MAP[arVal.trim()] = key;
    }
  }
}

/**
 * Phrase/word token replacements for compound Arabic UI strings (used for instant 0ms preview before async batch resolves).
 */
const AR_SUBPHRASE_EN: Array<[string, string]> = [
  ['مجموعة خالد السليم', 'Khalid Al-Sulaim Group'],
  ['شركة السليم للاستقدام', 'Al-Sulaim Recruitment Co.'],
  ['شركة دار الرواد', 'Dar Al-Ruwad Co.'],
  ['شركة كاس', 'KAS Tenders Co.'],
  ['شركة رواد التميز', 'Ruwad Al-Tamayuz Co.'],
  ['مركز الإيواء', 'Shelter Center'],
  ['عقود الاستقدام', 'Recruitment Contracts'],
  ['عقود التأجير', 'Rental Contracts'],
  ['السير الذاتية', 'Candidate CVs'],
  ['الموارد البشرية', 'Human Resources'],
  ['الإدارة المالية', 'Financial Management'],
  ['ضريبة القيمة المضافة', 'VAT'],
  ['الفاتورة الإلكترونية', 'E-Invoicing'],
  ['حماية الأجور', 'Wage Protection'],
  ['نقل الكفالة', 'Sponsorship Transfer'],
  ['نقل الخدمات', 'Sponsorship Transfer'],
  ['الفرع الرئيسي', 'Main Branch'],
  ['فرع الرياض', 'Riyadh Branch'],
  ['فرع جدة', 'Jeddah Branch'],
  ['فرع الدمام', 'Dammam Branch'],
  ['فرع خميس مشيط', 'Khamis Mushait Branch'],
  ['إجمالي', 'Total'],
  ['سجل', 'Register'],
  ['إدارة', 'Management'],
  ['مركز', 'Center'],
  ['لوحة', 'Dashboard'],
  ['تقرير', 'Report'],
  ['تقارير', 'Reports'],
  ['فاتورة', 'Invoice'],
  ['فواتير', 'Invoices'],
  ['عقد', 'Contract'],
  ['عقود', 'Contracts'],
  ['طلب', 'Order'],
  ['طلبات', 'Orders'],
  ['عميل', 'Client'],
  ['عملاء', 'Clients'],
  ['موظف', 'Employee'],
  ['موظفين', 'Employees'],
  ['عاملة', 'Worker'],
  ['عاملات', 'Workers'],
  ['سند قبض', 'Receipt Voucher'],
  ['سند صرف', 'Payment Voucher'],
  ['قيد يومية', 'Journal Entry'],
  ['نشط', 'Active'],
  ['معتمد', 'Approved'],
  ['معلق', 'Pending'],
  ['مكتمل', 'Completed'],
  ['بنجاح', 'Successfully'],
];

// Memory cache per language: langCode -> Map<arabicText, translatedText>
const memoryCache = new Map<string, Map<string, string>>();

function getLangCache(langCode: string): Map<string, string> {
  let map = memoryCache.get(langCode);
  if (!map) {
    map = new Map<string, string>();
    try {
      const raw = localStorage.getItem(`erp-live-i18n-v1-${langCode}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        for (const [k, v] of Object.entries(parsed)) {
          map.set(k, v);
        }
      }
    } catch {
      // ignore storage errors
    }
    memoryCache.set(langCode, map);
  }
  return map;
}

function saveLangCache(langCode: string): void {
  const map = memoryCache.get(langCode);
  if (!map) return;
  try {
    const obj: Record<string, string> = {};
    // Keep up to 3500 entries in localStorage
    let count = 0;
    for (const [k, v] of map.entries()) {
      obj[k] = v;
      count++;
      if (count >= 3500) break;
    }
    localStorage.setItem(`erp-live-i18n-v1-${langCode}`, JSON.stringify(obj));
  } catch {
    // ignore quota errors
  }
}

/**
 * Synchronous lookup:
 * 1. Checks memory/localStorage cache for `langCode`
 * 2. Checks TRANSLATIONS[langCode] via REVERSE_AR_MAP
 * 3. If `langCode === 'en'`, checks AR_EXACT_EN
 */
export function lookupExactTranslation(arabicText: string, langCode: string): string | null {
  const trimmed = arabicText.trim();
  if (!trimmed) return null;

  const cache = getLangCache(langCode);
  const cached = cache.get(trimmed);
  if (cached) return cached;

  const key = REVERSE_AR_MAP[trimmed];
  if (key && TRANSLATIONS[langCode] && TRANSLATIONS[langCode][key]) {
    return TRANSLATIONS[langCode][key];
  }

  if (langCode === 'en' && AR_EXACT_EN[trimmed]) {
    return AR_EXACT_EN[trimmed];
  }

  return null;
}

/**
 * Fast fallback approximation when a multi-word string is waiting for async neural translation.
 */
function approximateSyncTranslation(arabicText: string, langCode: string): string | null {
  const trimmed = arabicText.trim();
  const exact = lookupExactTranslation(trimmed, langCode);
  if (exact) {
    return arabicText.replace(trimmed, exact);
  }

  // If English (or LTR fallback), apply subphrase replacements if they cover parts of the text
  let working = trimmed;
  let changed = false;
  for (const [arSub, enSub] of AR_SUBPHRASE_EN) {
    if (working.includes(arSub)) {
      working = working.split(arSub).join(enSub);
      changed = true;
    }
  }
  return changed ? arabicText.replace(trimmed, working) : null;
}

interface ErpTextNode extends Text {
  __erpOrigAr?: string;
  __erpLastTranslatedVal?: string;
  __erpLastLang?: string;
}

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || tag === 'PRE') {
    return true;
  }
  if (el.closest('[data-no-translate="true"]')) {
    return true;
  }
  return false;
}

function processTextNode(node: ErpTextNode, langCode: string): void {
  if (shouldSkipElement(node.parentElement)) return;

  const currentVal = node.nodeValue || '';

  // Restore original Arabic if language is 'ar'
  if (langCode === 'ar') {
    if (node.__erpOrigAr && currentVal !== node.__erpOrigAr) {
      node.nodeValue = node.__erpOrigAr;
      node.__erpLastLang = 'ar';
    }
    return;
  }

  // If React updated the node with fresh Arabic text, capture it as the new original Arabic string
  if (ARABIC_CHAR_REGEX.test(currentVal) && currentVal !== node.__erpLastTranslatedVal) {
    node.__erpOrigAr = currentVal;
  }

  const origAr = node.__erpOrigAr;
  if (!origAr || !ARABIC_CHAR_REGEX.test(origAr)) return;

  // Already translated to this exact language and unchanged
  if (node.__erpLastLang === langCode && currentVal === node.__erpLastTranslatedVal) {
    return;
  }

  const trimmedOrig = origAr.trim();
  const exact = lookupExactTranslation(trimmedOrig, langCode);
  if (exact) {
    const finalVal = origAr.replace(trimmedOrig, exact);
    node.__erpLastTranslatedVal = finalVal;
    node.__erpLastLang = langCode;
    if (node.nodeValue !== finalVal) {
      node.nodeValue = finalVal;
    }
    return;
  }

  // Apply fast synchronous subphrase approximation immediately if available
  const approx = approximateSyncTranslation(origAr, langCode);
  if (approx) {
    node.__erpLastTranslatedVal = approx;
    node.__erpLastLang = langCode;
    if (node.nodeValue !== approx) {
      node.nodeValue = approx;
    }
  } else {
    node.__erpLastTranslatedVal = currentVal;
    node.__erpLastLang = langCode;
  }
}

const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label'] as const;

function processElementAttributes(el: Element, langCode: string): void {
  if (shouldSkipElement(el)) return;

  for (const attr of TRANSLATABLE_ATTRS) {
    const dataAttr = `data-erp-orig-${attr}`;
    const langAttr = `data-erp-lang-${attr}`;
    const currentAttr = el.getAttribute(attr);

    if (langCode === 'ar') {
      const savedOrig = el.getAttribute(dataAttr);
      if (savedOrig && currentAttr !== savedOrig) {
        el.setAttribute(attr, savedOrig);
        el.setAttribute(langAttr, 'ar');
      }
      continue;
    }

    if (el.getAttribute(langAttr) === langCode) {
      continue;
    }

    if (currentAttr && ARABIC_CHAR_REGEX.test(currentAttr) && !el.getAttribute(dataAttr)) {
      el.setAttribute(dataAttr, currentAttr);
    }

    const origAr = el.getAttribute(dataAttr);
    if (!origAr || !ARABIC_CHAR_REGEX.test(origAr)) continue;

    const trimmedOrig = origAr.trim();
    const exact = lookupExactTranslation(trimmedOrig, langCode);
    if (exact) {
      if (currentAttr !== exact) el.setAttribute(attr, exact);
      el.setAttribute(langAttr, langCode);
      continue;
    }

    const approx = approximateSyncTranslation(origAr, langCode);
    if (approx && currentAttr !== approx) {
      el.setAttribute(attr, approx);
    }
    el.setAttribute(langAttr, langCode);
  }
}

export function translateDomSubtree(root: Node | null, langCode: string): void {
  if (!root || typeof document === 'undefined') return;

  try {
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root as ErpTextNode, langCode);
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      processElementAttributes(root as Element, langCode);
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
    );

    let current: Node | null = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.TEXT_NODE) {
        processTextNode(current as ErpTextNode, langCode);
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(current as Element, langCode);
      }
      current = walker.nextNode();
    }
  } catch {
    // Safeguard against detached or exotic DOM nodes
  }
}
