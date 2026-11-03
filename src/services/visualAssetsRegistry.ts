/**
 * visualAssetsRegistry.ts
 * Central registry mapping Khalid Al-Sulaim Holding Group's 5 Companies, 9 Departments,
 * 28+ Staff Roles, Candidate Professions, and ERP Modules to Corporate Avatars
 * and IconScout-Style Business Illustrations.
 */

export type AvatarArchetype =
  | 'saudi-executive'
  | 'saudi-specialist'
  | 'saudi-female-specialist'
  | 'finance-cfo'
  | 'tenders-engineer'
  | 'candidate-maid'
  | 'candidate-nurse'
  | 'candidate-driver'
  | 'candidate-chef'
  | 'client-vip'
  | 'client-b2b'
  | 'ai-faris'
  | 'ai-noura';

export type IllustrationKey =
  | 'exec-command'
  | 'smacc-finance'
  | 'zatca-einvoice'
  | 'ocr-extractor'
  | 'musaned-recruitment'
  | 'flexible-rental'
  | 'ats-talent'
  | 'hr-wps'
  | 'crm-customer'
  | 'shelter-care'
  | 'kas-tenders'
  | 'empty-search'
  | 'ai-copilot'
  | 'innovation'
  | 'treasury-vouchers'
  | 'whatsapp-chat'
  | 'legal-compliance'
  | 'iam-security'
  | 'attendance-monitoring'
  | 'inventory-custody'
  | 'reports-bi'
  | 'foreign-agencies'
  | 'client-portal'
  | 'travel-logistics'
  | 'branch-network'
  | 'unified-comm'
  | 'sent-messages'
  | 'rent-packages'
  | 'sponsorship-transfer'
  | 'master-constants'
  | 'group-command';

export interface IllustrationMetadata {
  key: IllustrationKey;
  titleAr: string;
  subtitleAr: string;
  badgeAr: string;
  accentHex: string;
  secondaryHex: string;
  funkywaysSvgUrl: string;
}

export const ILLUSTRATION_METADATA: Record<IllustrationKey, IllustrationMetadata> = {
  'exec-command': {
    key: 'exec-command',
    titleAr: 'مركز القيادة التنفيذية والتحليلات الحية',
    subtitleAr: 'مراقبة الأداء المالي والتشغيلي الموحد عبر الشركات الـ 5 والأقسام الـ 9 لحظياً',
    badgeAr: 'حوكمة المجموعة 360°',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/exec-command.svg',
  },
  'smacc-finance': {
    key: 'smacc-finance',
    titleAr: 'منظومة سماك المحاسبية السحابية (SMACC 6-Divisions)',
    subtitleAr: 'دفتر الأستاذ العام، القيود المزدوجة المتوازنة، سندات القبض والصرف، ومراكز التكلفة',
    badgeAr: 'توازن محاسبي 100%',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/smacc-finance.svg',
  },
  'zatca-einvoice': {
    key: 'zatca-einvoice',
    titleAr: 'الفوترة الإلكترونية المشفرة (ZATCA المرحلة الثانية)',
    subtitleAr: 'ربط وتوقيع الفواتير الضريبية والمبسطة بصيغة XML UBL 2.1 وختم QR التشفيري',
    badgeAr: 'معتمد في منصة فاتورة',
    accentHex: '#047857',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/zatca-einvoice.svg',
  },
  'ocr-extractor': {
    key: 'ocr-extractor',
    titleAr: 'محرك الاستخلاص الذكي (100+ فاتورة وأي مستند)',
    subtitleAr: 'قراءة آلية لملفات PDF وExcel وWord وصور الفواتير وترحيلها مباشرة لدفتر سماك',
    badgeAr: 'ماسح OCR الذكي',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/ocr-extractor.svg',
  },
  'musaned-recruitment': {
    key: 'musaned-recruitment',
    titleAr: 'منظومة عقود الاستقدام والربط الدولي (مساند)',
    subtitleAr: 'إدارة دورة حياة العقد، تفاويض التأشيرات، والربط مع الوكالات الخارجية حتى الوصول',
    badgeAr: 'تكامل مساند وإنجاز',
    accentHex: '#8C681E',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/musaned-recruitment.svg',
  },
  'flexible-rental': {
    key: 'flexible-rental',
    titleAr: 'عقود التأجير والتشغيل المرن (شركة الياقوت)',
    subtitleAr: 'إدارة الباقات الشهرية والموسمية، جدولة الكوادر، والتحصيل التلقائي للدفعات',
    badgeAr: 'تشغيل مرن بالساعة والشهر',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/flexible-rental.svg',
  },
  'ats-talent': {
    key: 'ats-talent',
    titleAr: 'بنك السير الذاتية واستقطاب الكفاءات (ATS)',
    subtitleAr: 'فرز ومطابقة المرشحين، فحص الجاهزية الطبية، وربط طلبات العملاء آلياً',
    badgeAr: 'توب تالنت ATS',
    accentHex: '#8C681E',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/ats-talent.svg',
  },
  'hr-wps': {
    key: 'hr-wps',
    titleAr: 'إدارة رأس المال البشري وحماية الأجور (WPS)',
    subtitleAr: 'الملف الرقمي للموظف 360°، مسيرات الرواتب، الحضور الذكي، وحاسبة نهاية الخدمة',
    badgeAr: 'متوافق مع نظام العمل السعودي',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/hr-wps.svg',
  },
  'crm-customer': {
    key: 'crm-customer',
    titleAr: 'منظومة علاقات العملاء والمبيعات (CRM)',
    subtitleAr: 'إدارة ملفات العملاء VIP والشركات، تصنيف الفئات، ومتابعة العقود والطلبات',
    badgeAr: 'مركز إسعاد العملاء',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/crm-customer.svg',
  },
  'shelter-care': {
    key: 'shelter-care',
    titleAr: 'بوابة دار الرواد لمراكز الإيواء والتسكين والرعاية',
    subtitleAr: 'متابعة إشغال الغرف، الإعاشة اليومية، الرعاية الطبية، وتسويات نقل الخدمات والترحيل',
    badgeAr: 'معايير الإيواء HRSD',
    accentHex: '#047857',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/shelter-care.svg',
  },
  'kas-tenders': {
    key: 'kas-tenders',
    titleAr: 'منظومة كاس للمنافسات الحكومية وجداول الكميات (BOQ)',
    subtitleAr: 'رصد منافسات منصة اعتماد، التسعير الهندسي الدقيق، الضمانات البنكية، وأوامر التوريد',
    badgeAr: 'سحابة اعتماد كاس',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/kas-tenders.svg',
  },
  'empty-search': {
    key: 'empty-search',
    titleAr: 'لا توجد سجلات مطابقة لمعايير البحث الحالية',
    subtitleAr: 'جرب تعديل كلمات البحث أو إعادة ضبط الفلاتر أو إضافة سجل جديد مباشرة',
    badgeAr: 'البحث والتصفية الذكية',
    accentHex: '#CFA64A',
    secondaryHex: '#64748B',
    funkywaysSvgUrl: '/illustrations/funkyways/empty-search.svg',
  },
  'ai-copilot': {
    key: 'ai-copilot',
    titleAr: 'المساعد الذكي التنفيذي والمؤسسي (فارس ونُورة)',
    subtitleAr: 'تنفيذ آلي لـ 22 أداة محاسبية وتشغيلية وتوجيه فوري بالصوت والنص لكل موظف',
    badgeAr: 'ذكاء اصطناعي مؤسسي',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/ai-copilot.svg',
  },
  'innovation': {
    key: 'innovation',
    titleAr: 'الابتكار والتحول الرقمي المؤسسي',
    subtitleAr: 'بنية سحابية موحدة تربط القطاعات التشغيلية والمالية برؤية المملكة 2030',
    badgeAr: 'تقنية Funkyways',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/innovation.svg',
  },
  'treasury-vouchers': {
    key: 'treasury-vouchers',
    titleAr: 'إدارة الخزينة والبنوك وسندات القبض والصرف والعهد',
    subtitleAr: 'متابعة السيولة النقدية، التسويات البنكية، العهد النقدية، وطلبات الصرف المعتمدة',
    badgeAr: 'الخزينة والسندات المالية',
    accentHex: '#8C681E',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/treasury-vouchers.svg',
  },
  'whatsapp-chat': {
    key: 'whatsapp-chat',
    titleAr: 'مركز التواصل الموحد وصندوق رسائل واتساب والأفرع',
    subtitleAr: 'إدارة محادثات العملاء الفورية، إرسال الإشعارات الجماعية، والتنسيق اللحظي بين الفروع',
    badgeAr: 'تواصل موحد فوري',
    accentHex: '#047857',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/whatsapp-chat.svg',
  },
  'legal-compliance': {
    key: 'legal-compliance',
    titleAr: 'الحوكمة القانونية والامتثال والتفاويض الرسمية',
    subtitleAr: 'توثيق الإقرارات القانونية، تفاويض منصة إنجاز، تصديق الغرف التجارية، وحماية البيانات',
    badgeAr: 'امتثال نظامي وتوثيق',
    accentHex: '#047857',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/legal-compliance.svg',
  },
  'iam-security': {
    key: 'iam-security',
    titleAr: 'إدارة الهوية والصلاحيات والأمن السيبراني (IAM & RBAC)',
    subtitleAr: 'عزل صارم للصلاحيات حسب الشركة والقسم، التوثيق الثنائي FIDO2، وسجل التدقيق الأمني',
    badgeAr: 'حوكمة النفاذ والأمان',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/iam-security.svg',
  },
  'attendance-monitoring': {
    key: 'attendance-monitoring',
    titleAr: 'متابعة الحضور والأداء ومؤشرSLA ومعالجة الشكاوى',
    subtitleAr: 'رصد البصمة الجغرافية، مؤشرات الإنجاز اليومي للموظفين، ومعالجة بلاغات العملاء ضمن SLA',
    badgeAr: 'رقابة الأداء والانضباط',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/attendance-monitoring.svg',
  },
  'inventory-custody': {
    key: 'inventory-custody',
    titleAr: 'إدارة المخزون والأصول الثابتة والعهد ومراكز التكلفة',
    subtitleAr: 'جرد المستودعات، إهلاك الأصول الثابتة، تسليم واستلام العهد العينية، وتوزيع التكاليف',
    badgeAr: 'الأصول والعهد والمخزون',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/inventory-custody.svg',
  },
  'reports-bi': {
    key: 'reports-bi',
    titleAr: 'مركز التقارير التحليلية والقوائم المالية الختامية (BI)',
    subtitleAr: 'تقارير الميزانية العمومية، قائمة الدخل، التدفقات النقدية، ومؤشرات ربحية كل شركة',
    badgeAr: 'ذكاء الأعمال والتقارير',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/reports-bi.svg',
  },
  'foreign-agencies': {
    key: 'foreign-agencies',
    titleAr: 'إدارة المكاتب والوكالات الخارجية وشركاء الاستقدام',
    subtitleAr: 'متابعة حصص الوكلاء في 14 دولة، عمولات المكاتب الخارجية، واستيراد السير بالدفعة',
    badgeAr: 'شبكة الوكلاء الدوليين',
    accentHex: '#8C681E',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/foreign-agencies.svg',
  },
  'client-portal': {
    key: 'client-portal',
    titleAr: 'البوابة الرقمية للعملاء ومنصة التطبيقات الذكية',
    subtitleAr: 'متابعة العقود والطلبات إلكترونياً، تحليلات زوار الموقع، والوصول السريع لتطبيقات المجموعة',
    badgeAr: 'الخدمات الرقمية الذكية',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/client-portal.svg',
  },
  'travel-logistics': {
    key: 'travel-logistics',
    titleAr: 'إدارة الحركة والرحلات الجوية والاستقبال بالمطار',
    subtitleAr: 'جدولة رحلات الوصول والترحيل، تفويج العمالة، واستقبال المطار والتوصيل للفروع',
    badgeAr: 'الحركة والرحلات الجوية',
    accentHex: '#8C681E',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/travel-logistics.svg',
  },
  'branch-network': {
    key: 'branch-network',
    titleAr: 'الهيكل التنظيمي والفروع وشبكة التراسل الداخلي',
    subtitleAr: 'إدارة فروع الشركات الـ 5، توزيع الإدارات الفرعية، وقنوات التواصل المباشر بين الفروع',
    badgeAr: 'شبكة الفروع والهيكل التنظيمي',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/branch-network.svg',
  },
  'unified-comm': {
    key: 'unified-comm',
    titleAr: 'منصة التواصل الموحد متعدد القنوات (Omnichannel Hub)',
    subtitleAr: 'ربط مكالمات السنترال، الواتساب، البريد، والتذاكر الفورية في شاشة موحدة لخدمة العملاء',
    badgeAr: 'مركز الاتصال الموحد',
    accentHex: '#047857',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/unified-comm.svg',
  },
  'sent-messages': {
    key: 'sent-messages',
    titleAr: 'سجل الرسائل المرسلة والحملات الإشعارية',
    subtitleAr: 'أرشفة وتتبع رسائل SMS والواتساب والبريد المرسلة للعملاء والكوادر مع تقارير التسليم',
    badgeAr: 'الإشعارات والرسائل الصادرة',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/sent-messages.svg',
  },
  'rent-packages': {
    key: 'rent-packages',
    titleAr: 'باقات وعروض التأجير والتسعير المرن',
    subtitleAr: 'تصميم باقات الساعات والأشهر والمواسم، العروض الترويجية، وحاسبة التسعير التلقائي',
    badgeAr: 'هندسة الباقات والعروض',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/rent-packages.svg',
  },
  'sponsorship-transfer': {
    key: 'sponsorship-transfer',
    titleAr: 'منظومة نقل الكفالة والخدمات وفترة التجربة',
    subtitleAr: 'متابعة إجراءات نقل الخدمات في مساند وأبشر، تقييم فترة التجربة، والمقاصة المالية',
    badgeAr: 'نقل الخدمات والكفالات',
    accentHex: '#047857',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/sponsorship-transfer.svg',
  },
  'master-constants': {
    key: 'master-constants',
    titleAr: 'الثوابت العامة وإعدادات النظام والربط الحكومي',
    subtitleAr: 'إدارة الجنسيات، المهن، البنوك، الضرائب، القوالب التعاقدية، ومفاتيح الربط السحابي',
    badgeAr: 'مركز التهيئة والثوابت',
    accentHex: '#8C681E',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/master-constants.svg',
  },
  'group-command': {
    key: 'group-command',
    titleAr: 'مركز القيادة الموحد للمجموعة القابضة (5 كيانات)',
    subtitleAr: 'لوحة السيطرة الاستراتيجية لمتابعة أداء الشركات الخمس، التدفقات النقدية، ومؤشرات النمو',
    badgeAr: 'القيادة الاستراتيجية للمجموعة',
    accentHex: '#CFA64A',
    secondaryHex: '#1D2428',
    funkywaysSvgUrl: '/illustrations/funkyways/group-command.svg',
  },
};

export const BUSINESS_ILLUSTRATION_METADATA = ILLUSTRATION_METADATA;

const FEMALE_NAME_INDICATORS = [
  'نورة',
  'نُورة',
  'ريم',
  'منى',
  'سارة',
  'ساره',
  'فاطمة',
  'فاطمه',
  'عائشة',
  'نوف',
  'لولوة',
  'مها',
  'هدى',
  'أمل',
  'امل',
  'عبير',
  'حنان',
  'بنت',
  'أ. ريم',
  'أ. منى',
  'أ. نورة',
  'أ. سارة',
  'أ. نوف',
  'أ. مها',
  'أ. فاطمة',
  'maria',
  'kimberly',
  'siti',
  'amina',
  'grace',
  'joy',
  'fatima',
  'noura',
];

/**
 * Deterministically resolves the best Corporate Avatar archetype for any employee,
 * candidate, client, or AI persona across the ERP.
 */
export function resolveAvatarArchetype(params: {
  name?: string;
  role?: string;
  email?: string;
  departmentId?: string;
  profession?: string;
  gender?: 'male' | 'female';
  category?: string;
  isCandidate?: boolean;
  isClient?: boolean;
}): AvatarArchetype {
  const name = (params.name || '').toLowerCase();
  const role = (params.role || '').toLowerCase();
  const email = (params.email || '').toLowerCase();
  const dept = (params.departmentId || '').toLowerCase();
  const profession = (params.profession || '').toLowerCase();
  const jobCheck = `${profession} ${role}`;
  const category = (params.category || '').toLowerCase();

  if (name === 'فارس' || name === 'faris') return 'ai-faris';
  if (name === 'نورة' || name === 'نُورة' || name === 'noura') return 'ai-noura';

  // Client records
  if (params.isClient || category.includes('شرك') || category.includes('b2b') || category.includes('أفراد') || category.includes('vip')) {
    if (category.includes('شرك') || category.includes('b2b') || name.includes('شركة') || name.includes('مؤسسة') || name.includes('مجموعة')) {
      return 'client-b2b';
    }
    return 'client-vip';
  }

  // Candidate / CV / Shelter worker records (check both profession and role)
  if (
    params.isCandidate ||
    jobCheck.includes('ممرض') ||
    jobCheck.includes('رعاية كبار') ||
    jobCheck.includes('رعاية أطفال') ||
    jobCheck.includes('طباخ') ||
    jobCheck.includes('طاه') ||
    jobCheck.includes('سائق') ||
    jobCheck.includes('عاملة منزلية') ||
    jobCheck.includes('عامل منزلي') ||
    jobCheck.includes('housemaid') ||
    jobCheck.includes('nurse') ||
    jobCheck.includes('driver')
  ) {
    if (jobCheck.includes('ممرض') || jobCheck.includes('رعاية كبار') || jobCheck.includes('طبي') || jobCheck.includes('nurse')) {
      return 'candidate-nurse';
    }
    if (jobCheck.includes('سائق') || jobCheck.includes('نقل') || jobCheck.includes('driver')) {
      return 'candidate-driver';
    }
    if (jobCheck.includes('طاه') || jobCheck.includes('طباخ') || jobCheck.includes('شيف') || jobCheck.includes('cook')) {
      return 'candidate-chef';
    }
    if (
      jobCheck.includes('عامل') ||
      jobCheck.includes('منزل') ||
      jobCheck.includes('نظاف') ||
      jobCheck.includes('مرب') ||
      jobCheck.includes('رعاية أطفال') ||
      jobCheck.includes('housemaid')
    ) {
      return 'candidate-maid';
    }
  }

  // Female employees / supervisors
  const isFemale =
    params.gender === 'female' ||
    FEMALE_NAME_INDICATORS.some((ind) => name.includes(ind)) ||
    role.includes('مشرفة') ||
    role.includes('مسؤولة') ||
    role.includes('أخصائية') ||
    role.includes('مديرة');

  if (isFemale) {
    return 'saudi-female-specialist';
  }

  // Executive / Chairman / System Developer
  if (
    dept === 'executive' ||
    email.includes('chairman') ||
    email.includes('admin') ||
    email === 'abdo12uk@gmail.com' ||
    role.includes('رئيس') ||
    role.includes('تنفيذي') ||
    role.includes('مطور النظام') ||
    name.includes('الشيخ خالد')
  ) {
    return 'saudi-executive';
  }

  // Finance & SMACC Accounting
  if (
    dept === 'finance' ||
    dept.includes('مالي') ||
    dept.includes('محاسب') ||
    role.includes('محاسب') ||
    role.includes('مالي') ||
    role.includes('سماك')
  ) {
    return 'finance-cfo';
  }

  // KAS Tenders & Engineering
  if (
    dept === 'tenders' ||
    dept.includes('منافسات') ||
    role.includes('منافسات') ||
    role.includes('مهندس') ||
    role.includes('كميات')
  ) {
    return 'tenders-engineer';
  }

  return 'saudi-specialist';
}

/**
 * Resolves the appropriate IconScout-style Business Illustration for any active tab or department.
 */
export function resolveIllustrationForTab(
  tabKey?: string,
  departmentId?: string
): IllustrationKey {
  const t = (tabKey || '').toLowerCase();
  const d = (departmentId || '').toLowerCase();

  if (t.includes('zatca') || t.includes('invoices') || t.includes('vat') || t.includes('tax')) {
    return 'zatca-einvoice';
  }
  if (t.includes('extractor') || t.includes('data-import') || t.includes('import-wizard')) {
    return 'ocr-extractor';
  }
  if (
    t.includes('voucher') ||
    t.includes('receipt') ||
    t.includes('banks') ||
    t.includes('reconciliation') ||
    t.includes('financial-requests') ||
    t.includes('petty-cash') ||
    t.includes('cash-custody') ||
    t.includes('fin-request')
  ) {
    return 'treasury-vouchers';
  }
  if (
    t.includes('inventory') ||
    t.includes('custodies') ||
    t.includes('cost-centers')
  ) {
    return 'inventory-custody';
  }
  if (t.includes('report') || t.includes('trial-balance') || t.includes('income-statement') || t.includes('balance-sheet')) {
    return 'reports-bi';
  }
  if (t.includes('smacc') || t.includes('journal') || t.includes('finance') || t.includes('ledger') || t.includes('chart-accounts')) {
    return 'smacc-finance';
  }
  if (t.includes('kas') || t.includes('tender') || t.includes('boq') || t.includes('etmad')) {
    return 'kas-tenders';
  }
  if (t.includes('travel') || t.includes('flight') || t.includes('airport') || t.includes('logistics') || t.includes('group-dispatch')) {
    return 'travel-logistics';
  }
  if (t.includes('legal') || t.includes('ingaz') || t.includes('visa') || t.includes('chamber')) {
    return 'legal-compliance';
  }
  if (t.includes('office') || t.includes('agency') || t.includes('agent')) {
    return 'foreign-agencies';
  }
  if (t.includes('sponsorship') || t.includes('trial-period') || t.includes('transferred-done') || t.includes('transfer-contract')) {
    return 'sponsorship-transfer';
  }
  if (t.includes('shelter') || t.includes('deportation') || t.includes('room') || t.includes('catering') || t.includes('available-transfer')) {
    return 'shelter-care';
  }
  if (t.includes('rent-packages') || t.includes('packages')) return 'rent-packages';
  if (t.includes('rent')) return 'flexible-rental';
  if (t.includes('branch-departments') || t.includes('branches') || t.includes('branch-communication')) {
    return 'branch-network';
  }
  if (t.includes('unified-communication')) {
    return 'unified-comm';
  }
  if (t.includes('sent-messages') || t.includes('sms-gateway')) {
    return 'sent-messages';
  }
  if (t.includes('whatsapp') || t.includes('message') || t.includes('sms') || t.includes('communication')) {
    return 'whatsapp-chat';
  }
  if (t.includes('client-portal') || t.includes('clients-portal') || t.includes('visitor') || t.includes('launcher')) {
    return 'client-portal';
  }
  if (
    t.includes('cv') ||
    t === 'ats' ||
    t.startsWith('ats-') ||
    t.endsWith('-ats') ||
    t.includes('enterprise-ats') ||
    t.includes('talent')
  ) {
    return 'ats-talent';
  }
  if (
    t.includes('attendance') ||
    t.includes('monitoring') ||
    t.includes('telemetry') ||
    t.includes('pulse') ||
    t.includes('activity-log')
  ) {
    return 'attendance-monitoring';
  }
  if (t.includes('hr') || t.includes('employee') || t.includes('payroll') || t.includes('wps') || t.includes('salary') || t.includes('gosi')) {
    return 'hr-wps';
  }
  if (t.includes('microsoft') || t.includes('ai-copilot')) {
    return 'ai-copilot';
  }
  if (t.includes('master-constants') || t.includes('settings')) {
    return 'master-constants';
  }
  if (t.includes('group-command') || t.includes('admin-dashboard')) {
    return 'group-command';
  }
  if (t.includes('iam') || t.includes('users') || t.includes('access') || t.includes('roles')) {
    return 'iam-security';
  }
  if (t.includes('client') || t.includes('crm') || t.includes('complaint') || t.includes('black-list')) {
    return 'crm-customer';
  }
  if (t.includes('recruitment') || t.includes('musaned') || t.includes('order') || t.includes('contract')) {
    return 'musaned-recruitment';
  }

  // Fallback by departmentId
  switch (d) {
    case 'finance':
      return 'smacc-finance';
    case 'recruitment':
      return 'musaned-recruitment';
    case 'rental':
      return 'flexible-rental';
    case 'ats':
      return 'ats-talent';
    case 'hr':
      return 'hr-wps';
    case 'crm':
      return 'crm-customer';
    case 'shelter':
      return 'shelter-care';
    case 'tenders':
      return 'kas-tenders';
    default:
      return 'exec-command';
  }
}

/**
 * Resolves the appropriate IconScout-style Business Illustration for a company portal code.
 */
export function resolveIllustrationForPortal(portalCode?: string | null): IllustrationKey {
  const code = (portalCode || '').toUpperCase();
  switch (code) {
    case 'SAF':
      return 'musaned-recruitment';
    case 'YAQ':
      return 'flexible-rental';
    case 'TOP':
      return 'ats-talent';
    case 'KAS':
      return 'kas-tenders';
    case 'DAR':
    case 'SHELTER':
      return 'shelter-care';
    case 'ADMIN':
    case 'ALL':
    default:
      return 'exec-command';
  }
}

export function getIllustrationMetadata(key: IllustrationKey): IllustrationMetadata {
  return ILLUSTRATION_METADATA[key] || ILLUSTRATION_METADATA['exec-command'];
}
