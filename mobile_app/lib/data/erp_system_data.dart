import 'package:flutter/material.dart';

/// Corporate Department Definition matching `CORPORATE_DEPARTMENTS` in `src/services/authService.ts`
class CorporateDepartment {
  final String id; // 'finance' | 'recruitment' | 'rental' | 'ats' | 'hr' | 'crm' | 'shelter' | 'tenders' | 'executive'
  final String nameAr;
  final String nameEn;
  final String emoji;
  final String badgeText;
  final String defaultTab;
  final String defaultTabTitle;
  final String descriptionAr;
  final List<String> allowedSections;
  final List<String> allowedTabs;

  const CorporateDepartment({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.emoji,
    required this.badgeText,
    required this.defaultTab,
    required this.defaultTabTitle,
    required this.descriptionAr,
    required this.allowedSections,
    required this.allowedTabs,
  });

  String get shortNameAr => badgeText;
}

/// Ready-to-use Department Staff Account matching `CORPORATE_STAFF_DIRECTORY` in `src/services/authService.ts`
class StaffDirectoryAccount {
  final String id;
  final String username;
  final String email;
  final String fullName;
  final String role;
  final String companyId; // 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | 'all'
  final String departmentId;
  final String branch;
  final String badgeEmoji;

  const StaffDirectoryAccount({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.role,
    required this.companyId,
    required this.departmentId,
    required this.branch,
    required this.badgeEmoji,
  });
}

/// Exact Portal Model from `src/pages/LoginPage.tsx` (`SYSTEM_PORTALS`) & `src/pages/LandingPage.tsx` (`companies`)
class SystemPortalOption {
  final String id;
  final String key;
  final String companyId; // 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | 'all'
  final String companyCodeBadge; // e.g. 'COMPANY 01 [SAF]'
  final String nameAr;
  final String nameEn;
  final String category; // 'شركات المجموعة' | 'البوابات الرقمية' | 'الإدارة والسيطرة'
  final String license;
  final String sectorTagAr;
  final String badge;
  final String desc;
  final String stats;
  final Color themeColor;
  final String emailDomain;
  final String routePath;
  final String assetLogo;
  final String targetTab;
  final String targetTitle;
  final String demoEmail;
  final String demoEmployeeName;
  final String demoRole;
  final String defaultDepartmentId;
  final String emoji;
  final IconData icon;

  const SystemPortalOption({
    required this.id,
    required this.key,
    required this.companyId,
    required this.companyCodeBadge,
    required this.nameAr,
    required this.nameEn,
    required this.category,
    required this.license,
    required this.sectorTagAr,
    required this.badge,
    required this.desc,
    required this.stats,
    required this.themeColor,
    required this.emailDomain,
    required this.routePath,
    required this.assetLogo,
    required this.targetTab,
    required this.targetTitle,
    required this.demoEmail,
    required this.demoEmployeeName,
    required this.demoRole,
    this.defaultDepartmentId = 'recruitment',
    this.emoji = '🏛️',
    required this.icon,
  });
}

/// Exact App Tile Model from `src/pages/AppLauncherPage.tsx` (`ALL_SYSTEM_APPS`)
class ErpAppTile {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final String emoji;
  final String smaccCode;
  final String href;
  final String category; // 'finance' | 'operations' | 'crm' | 'hr' | 'governance' | 'tech'
  final String categoryLabel;
  final String? metricBadge;
  final String? exclusiveToCompany;

  const ErpAppTile({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.emoji = '🏛️',
    this.smaccCode = 'SMACC-01',
    required this.href,
    required this.category,
    required this.categoryLabel,
    this.metricBadge,
    this.exclusiveToCompany,
  });
}

/// Exact Sidebar Tree Item Model from `src/data/sidebarMenu.ts` (`SIDEBAR_MENU`)
class ErpSidebarItem {
  final String id;
  final String title;
  final IconData icon;
  final String? href;
  final String? badge;
  final String? badgeType;
  final String? exclusiveToCompany;
  final List<ErpSidebarItem> children;

  const ErpSidebarItem({
    required this.id,
    required this.title,
    required this.icon,
    this.href,
    this.badge,
    this.badgeType,
    this.exclusiveToCompany,
    this.children = const [],
  });
}

class ErpBranchOption {
  final String id;
  final String name;
  final String city;

  const ErpBranchOption({
    required this.id,
    required this.name,
    required this.city,
  });
}

class ErpOperationalRecord {
  final String id;
  final String companyId;
  final String moduleKey; // 'contracts' | 'orders' | 'rent' | 'cvs' | 'shelter' | 'kas' | 'finance' | 'clients' | 'hr' | 'complaints'
  final String title;
  final String subtitle;
  final String status;
  final String badgeText;
  final String amountOrMetric;
  final String updatedAt;
  final String? attachmentLabel;
  final String? sourceFormat;

  const ErpOperationalRecord({
    required this.id,
    required this.companyId,
    required this.moduleKey,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.badgeText,
    required this.amountOrMetric,
    required this.updatedAt,
    this.attachmentLabel,
    this.sourceFormat,
  });
}

class ErpSystemData {
  ErpSystemData._();

  /// Official Corporate Departments (`CORPORATE_DEPARTMENTS` in `src/services/authService.ts`)
  static const Map<String, CorporateDepartment> departments = {
    'finance': CorporateDepartment(
      id: 'finance',
      nameAr: 'قسم المحاسبة والمالية (نظام سماك SMACC)',
      nameEn: 'SMACC Accounting & Financial Control',
      emoji: '📊',
      badgeText: 'محاسبة سماك SMACC',
      defaultTab: 'smacc-accounting',
      defaultTabTitle: 'نظام سماك المحاسبي المتكامل (SMACC)',
      descriptionAr: 'الأستاذ العام، سندات القبض والصرف، البنوك والخزائن، الفوترة الضريبية ZATCA، ومراكز التكلفة.',
      allowedSections: ['finance-section'],
      allowedTabs: [
        'smacc-accounting',
        'finance-home',
        'finance',
        'finance-smacc-gl',
        'finance-smacc-cash',
        'finance-smacc-ar',
        'finance-smacc-ap',
        'finance-smacc-cost',
        'finance-smacc-reports',
        'smacc-gl',
        'smacc-cash',
        'smacc-ar',
        'smacc-ap',
        'smacc-cost',
        'smacc-reports',
        'chart-accounts',
        'general-ledger',
        'journals',
        'vouchers',
        'receipt-vouchers',
        'payment-vouchers',
        'banks-boxes',
        'bank-reconciliation',
        'custodies',
        'cost-centers',
        'zatca',
        'financial-requests',
        'vat-declaration',
        'trial-balance',
        'income-statement',
        'balance-sheet',
        'smacc-inventory',
        'smacc-modules',
        'reports',
        'profile',
      ],
    ),
    'recruitment': CorporateDepartment(
      id: 'recruitment',
      nameAr: 'قسم الاستقدام وعقود مساند والتأشيرات',
      nameEn: 'Recruitment, Musaned Contracts & Visas',
      emoji: '📑',
      badgeText: 'الاستقدام ومساند',
      defaultTab: 'recruitment-contracts',
      defaultTabTitle: 'عقود الاستقدام الموثقة (مساند)',
      descriptionAr: 'إدارة عقود الاستقدام، طلبات الحجز، تفاويض إنجاز، نقل الخدمات، ورحلات الوصول.',
      allowedSections: ['operations-section'],
      allowedTabs: [
        'recruitment',
        'recruitment-contracts',
        'musaned-sync',
        'orders',
        'ingaz',
        'sponsorship-transfer',
        'travel',
        'profile',
      ],
    ),
    'rental': CorporateDepartment(
      id: 'rental',
      nameAr: 'قسم التأجير والتشغيل المرن',
      nameEn: 'Flexible Rental & Operations Department',
      emoji: '🏢',
      badgeText: 'التأجير والتشغيل',
      defaultTab: 'rent-contracts',
      defaultTabTitle: 'عقود التأجير والتشغيل المرن',
      descriptionAr: 'إدارة عقود التأجير الشهرية وبالساعة، الباقات والأسعار، السائقين والعاملات، والتسليم.',
      allowedSections: ['operations-section'],
      allowedTabs: [
        'rent-contracts',
        'rent-packages',
        'orders',
        'cvs-recruitment',
        'profile',
      ],
    ),
    'ats': CorporateDepartment(
      id: 'ats',
      nameAr: 'قسم التوظيف والسير الذاتية والوكلاء',
      nameEn: 'Talent Acquisition, CVs & Foreign Agencies',
      emoji: '🗂️',
      badgeText: 'التوظيف والوكلاء',
      defaultTab: 'cvs-recruitment',
      defaultTabTitle: 'بنك السير الذاتية والوكلاء الخارجيين',
      descriptionAr: 'فرز وتدقيق السير الذاتية، استقطاب الكفاءات، وإدارة المكاتب والوكلاء الخارجيين.',
      allowedSections: ['operations-section', 'hr-section'],
      allowedTabs: [
        'cvs-recruitment',
        'ats-pipeline',
        'agent-imports',
        'offices',
        'external-offices',
        'foreign-agency-portal',
        'profile',
      ],
    ),
    'hr': CorporateDepartment(
      id: 'hr',
      nameAr: 'قسم الموارد البشرية والرواتب (HR & WPS)',
      nameEn: 'Human Resources & Payroll Protection (WPS)',
      emoji: '👥',
      badgeText: 'الموارد البشرية والرواتب',
      defaultTab: 'employees',
      defaultTabTitle: 'إدارة الموارد البشرية ومسير الرواتب (WPS)',
      descriptionAr: 'سجل الموظفين، مسير الرواتب وحماية الأجور، الحضور والانصراف، الإجازات، ونهاية الخدمة.',
      allowedSections: ['hr-section'],
      allowedTabs: [
        'employees',
        'payrolls',
        'attendances',
        'employee-monitoring',
        'custodies',
        'profile',
      ],
    ),
    'crm': CorporateDepartment(
      id: 'crm',
      nameAr: 'قسم المبيعات وخدمة العملاء والشكاوى',
      nameEn: 'CRM, Sales & Customer Relations Department',
      emoji: '🏛️',
      badgeText: 'العملاء والشكاوى',
      defaultTab: 'clients',
      defaultTabTitle: 'إدارة العملاء والمبيعات والشكاوى (CRM)',
      descriptionAr: 'سجل العملاء، بوابة المستفيدين، معالجة الشكاوى والتعويضات، والتواصل المؤسسي.',
      allowedSections: ['crm-section'],
      allowedTabs: [
        'clients',
        'client-portal',
        'whatsapp-inbox',
        'sent-messages',
        'website-visitors',
        'complaints',
        'profile',
      ],
    ),
    'shelter': CorporateDepartment(
      id: 'shelter',
      nameAr: 'قسم الإيواء والتسكين والإعاشة والترحيل',
      nameEn: 'Shelter, Housing & Welfare Operations (HRSD)',
      emoji: '🏨',
      badgeText: 'الإيواء والتسكين',
      defaultTab: 'shelter-suite',
      defaultTabTitle: 'منظومة مراكز الإيواء والتسكين والرعاية (HRSD)',
      descriptionAr: 'إدارة الغرف والأسرة، التسكين والاستلام، الإعاشة اليومية، وإجراءات الترحيل النظامي.',
      allowedSections: ['operations-section'],
      allowedTabs: [
        'shelter-suite',
        'travel',
        'profile',
      ],
    ),
    'tenders': CorporateDepartment(
      id: 'tenders',
      nameAr: 'قسم المنافسات الحكومية ومنصة اعتماد (BOQ)',
      nameEn: 'Government Tenders, Etimad & BOQ Pricing',
      emoji: '⚖️',
      badgeText: 'منافسات اعتماد BOQ',
      defaultTab: 'kas-suite',
      defaultTabTitle: 'البوابة المستقلة لشركة كاس ومنافسات اعتماد',
      descriptionAr: 'إدارة كراسات الشروط، تسعير جداول الكميات BOQ، الضمانات البنكية، ومستخلصات منصة اعتماد.',
      allowedSections: ['governance-section'],
      allowedTabs: [
        'kas-suite',
        'tenders-boq',
        'profile',
      ],
    ),
    'executive': CorporateDepartment(
      id: 'executive',
      nameAr: 'الإدارة التنفيذية العليا والحوكمة المركزية',
      nameEn: 'Executive Command & Group Governance',
      emoji: '🛡️',
      badgeText: 'الإدارة العليا للمجموعة',
      defaultTab: 'dashboard',
      defaultTabTitle: 'الرئيسية والمؤشرات التشغيلية الشاملة',
      descriptionAr: 'الإشراف الكامل على كافة شركات وأقسام المجموعة، التقارير الختامية، ومصفوفة الصلاحيات.',
      allowedSections: [
        'crm-section',
        'operations-section',
        'hr-section',
        'finance-section',
        'governance-section',
      ],
      allowedTabs: ['*'],
    ),
  };

  /// Ready-to-use Department Staff Accounts (`CORPORATE_STAFF_DIRECTORY` in `src/services/authService.ts` — 28 Accounts)
  static final List<StaffDirectoryAccount> staffDirectory = [
    // 1. SAF — السفير الماسي (8 Accounts)
    const StaffDirectoryAccount(
      id: 'USR-SAF-FIN-01',
      username: 'saf.accounting',
      email: 'accounting@saf-rec.sa',
      fullName: 'أ. عبدالإله بن فهد الدوسري',
      role: 'رئيس الحسابات — نظام سماك (السفير الماسي)',
      companyId: 'SAF',
      departmentId: 'finance',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '📊',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-REC-01',
      username: 'saf.recruitment',
      email: 'musaned@saf-rec.sa',
      fullName: 'م. سلطان بن خالد السليم',
      role: 'مدير قسم الاستقدام وعقود مساند',
      companyId: 'SAF',
      departmentId: 'recruitment',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '📑',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-HR-01',
      username: 'saf.hr',
      email: 'hr@saf-rec.sa',
      fullName: 'أ. نايف بن محمد العتيبي',
      role: 'مدير الموارد البشرية والرواتب — السفير الماسي',
      companyId: 'SAF',
      departmentId: 'hr',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '👥',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-CRM-01',
      username: 'saf.crm',
      email: 'crm@saf-rec.sa',
      fullName: 'أ. ريم بنت عبدالله الحربي',
      role: 'مسؤولة علاقات العملاء والشكاوى — السفير الماسي',
      companyId: 'SAF',
      departmentId: 'crm',
      branch: 'فرع الرياض (التخصصي)',
      badgeEmoji: '🏛️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-RNT-01',
      username: 'saf.rental',
      email: 'rental@saf-rec.sa',
      fullName: 'أ. فهد بن راشد الدوسري',
      role: 'مشرف عقود التأجير الشهري — السفير الماسي',
      companyId: 'SAF',
      departmentId: 'rental',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🏢',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-ATS-01',
      username: 'saf.ats',
      email: 'cvs@saf-rec.sa',
      fullName: 'أ. منى بنت عبدالرحمن السليم',
      role: 'أخصائية بنك السير الذاتية والوكالات — السفير الماسي',
      companyId: 'SAF',
      departmentId: 'ats',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🗂️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-SHL-01',
      username: 'saf.shelter',
      email: 'shelter@saf-rec.sa',
      fullName: 'أ. خالد بن ناصر القحطاني',
      role: 'مشرف جناح الإيواء والاستلام — السفير الماسي',
      companyId: 'SAF',
      departmentId: 'shelter',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🏨',
    ),
    const StaffDirectoryAccount(
      id: 'USR-SAF-EXEC-01',
      username: 'faris.saf',
      email: 'faris@saf-rec.sa',
      fullName: 'م. فارس بن خالد السليم',
      role: 'المدير التنفيذي لقطاع الاستقدام — السفير الماسي',
      companyId: 'SAF',
      departmentId: 'recruitment',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '📑',
    ),

    // 2. YAQ — الياقوت للتشغيل والتأجير (5 Accounts)
    const StaffDirectoryAccount(
      id: 'USR-YAQ-RNT-01',
      username: 'yaq.rental',
      email: 'ops@yaqoot-ops.sa',
      fullName: 'أ. فيصل بن عبدالعزيز القحطاني',
      role: 'مدير قسم التأجير والتشغيل المرن — الياقوت',
      companyId: 'YAQ',
      departmentId: 'rental',
      branch: 'فرع الدمام',
      badgeEmoji: '🏢',
    ),
    const StaffDirectoryAccount(
      id: 'USR-YAQ-FIN-01',
      username: 'yaq.accounting',
      email: 'accounting@yaqoot-ops.sa',
      fullName: 'أ. طارق بن سعد الغامدي',
      role: 'محاسب نظام سماك — شركة الياقوت الشرقية',
      companyId: 'YAQ',
      departmentId: 'finance',
      branch: 'فرع الدمام',
      badgeEmoji: '📊',
    ),
    const StaffDirectoryAccount(
      id: 'USR-YAQ-HR-01',
      username: 'yaq.hr',
      email: 'hr@yaqoot-ops.sa',
      fullName: 'أ. ماجد بن علي الزهراني',
      role: 'مسؤول شؤون الموظفين وحماية الأجور — الياقوت',
      companyId: 'YAQ',
      departmentId: 'hr',
      branch: 'فرع الدمام',
      badgeEmoji: '👥',
    ),
    const StaffDirectoryAccount(
      id: 'USR-YAQ-CRM-01',
      username: 'yaq.crm',
      email: 'crm@yaqoot-ops.sa',
      fullName: 'أ. لطيفة بنت محمد الدوسري',
      role: 'مسؤولة خدمة عملاء التأجير — الياقوت الشرقية',
      companyId: 'YAQ',
      departmentId: 'crm',
      branch: 'فرع الدمام',
      badgeEmoji: '🏛️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-YAQ-SHL-01',
      username: 'yaq.shelter',
      email: 'shelter@yaqoot-ops.sa',
      fullName: 'أ. بدر بن سعيد الغامدي',
      role: 'مشرف سكن الكوادر والتسليم — الياقوت الشرقية',
      companyId: 'YAQ',
      departmentId: 'shelter',
      branch: 'فرع الخبر',
      badgeEmoji: '🏨',
    ),

    // 3. TOP — توب تالنت للتوظيف (4 Accounts)
    const StaffDirectoryAccount(
      id: 'USR-TOP-ATS-01',
      username: 'top.ats',
      email: 'talent@topaz-rec.sa',
      fullName: 'أ. نورة بنت سلطان العتيبي',
      role: 'مديرة قسم التوظيف والسير الذاتية والوكلاء — توب تالنت',
      companyId: 'TOP',
      departmentId: 'ats',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🗂️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-TOP-FIN-01',
      username: 'top.accounting',
      email: 'accounting@topaz-rec.sa',
      fullName: 'أ. وليد بن حمد الشمري',
      role: 'محاسب نظام سماك — شركة توب تالنت',
      companyId: 'TOP',
      departmentId: 'finance',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '📊',
    ),
    const StaffDirectoryAccount(
      id: 'USR-TOP-HR-01',
      username: 'top.hr',
      email: 'hr@topaz-rec.sa',
      fullName: 'أ. أمل بنت خالد الحربي',
      role: 'مسؤولة شؤون الكفاءات والرواتب — توب تالنت',
      companyId: 'TOP',
      departmentId: 'hr',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '👥',
    ),
    const StaffDirectoryAccount(
      id: 'USR-TOP-CRM-01',
      username: 'top.crm',
      email: 'crm@topaz-rec.sa',
      fullName: 'أ. تركي بن فهد المطيري',
      role: 'مسؤول علاقات الشركات والتوظيف — توب تالنت',
      companyId: 'TOP',
      departmentId: 'crm',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🏛️',
    ),

    // 4. KAS — شركة كاس للتجارة والمقاولات (5 Accounts)
    const StaffDirectoryAccount(
      id: 'USR-KAS-TND-01',
      username: 'kas.tenders',
      email: 'tenders@kas-etimad.sa',
      fullName: 'م. عبدالرحمن بن صالح القحطاني',
      role: 'مدير قسم منافسات اعتماد وجداول الكميات BOQ — كاس',
      companyId: 'KAS',
      departmentId: 'tenders',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '⚖️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-KAS-FIN-01',
      username: 'kas.accounting',
      email: 'accounting@kas-etimad.sa',
      fullName: 'أ. بندر بن محمد السبيعي',
      role: 'مدير الحسابات والضمانات البنكية (سماك) — شركة كاس',
      companyId: 'KAS',
      departmentId: 'finance',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '📊',
    ),
    const StaffDirectoryAccount(
      id: 'USR-KAS-HR-01',
      username: 'kas.hr',
      email: 'hr@kas-etimad.sa',
      fullName: 'أ. سعود بن عبدالعزيز المالك',
      role: 'مدير شؤون الكوادر الهندسية والرواتب — شركة كاس',
      companyId: 'KAS',
      departmentId: 'hr',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '👥',
    ),
    const StaffDirectoryAccount(
      id: 'USR-KAS-CRM-01',
      username: 'kas.crm',
      email: 'crm@kas-etimad.sa',
      fullName: 'أ. نواف بن سلطان الشمري',
      role: 'مدير علاقات الجهات الحكومية والموردين — شركة كاس',
      companyId: 'KAS',
      departmentId: 'crm',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🏛️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-KAS-BOQ-02',
      username: 'faris.kas',
      email: 'faris@kas-etimad.sa',
      fullName: 'م. فارس بن خالد السليم',
      role: 'المشرف العام على المنافسات الحكومية والتسعير — كاس',
      companyId: 'KAS',
      departmentId: 'tenders',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '⚖️',
    ),

    // 5. DAR — دار الرواد للإيواء (4 Accounts)
    const StaffDirectoryAccount(
      id: 'USR-DAR-SHL-01',
      username: 'dar.shelter',
      email: 'warden@alruwad.sa',
      fullName: 'أ. سارة بنت عبدالله الشهري',
      role: 'مديرة قسم الإيواء والتسكين والإعاشة — دار الرواد',
      companyId: 'DAR',
      departmentId: 'shelter',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🏨',
    ),
    const StaffDirectoryAccount(
      id: 'USR-DAR-FIN-01',
      username: 'dar.accounting',
      email: 'accounting@alruwad.sa',
      fullName: 'أ. ياسر بن فهد المطيري',
      role: 'محاسب نظام سماك — دار الرواد للإيواء',
      companyId: 'DAR',
      departmentId: 'finance',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '📊',
    ),
    const StaffDirectoryAccount(
      id: 'USR-DAR-HR-01',
      username: 'dar.hr',
      email: 'hr@alruwad.sa',
      fullName: 'أ. حنان بنت محمد القحطاني',
      role: 'مسؤولة مشرفات الإيواء وشؤون الموظفات — دار الرواد',
      companyId: 'DAR',
      departmentId: 'hr',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '👥',
    ),
    const StaffDirectoryAccount(
      id: 'USR-DAR-CRM-01',
      username: 'dar.crm',
      email: 'crm@alruwad.sa',
      fullName: 'أ. عبير بنت سعد العتيبي',
      role: 'مسؤولة التنسيق واستلام وتسليم الكوادر — دار الرواد',
      companyId: 'DAR',
      departmentId: 'crm',
      branch: 'الفرع الرئيسي - الرياض',
      badgeEmoji: '🏛️',
    ),

    // 6. Executive Group Admin (2 Accounts)
    const StaffDirectoryAccount(
      id: 'USR-GRP-EXEC-01',
      username: 'khalid.admin',
      email: 'chairman@alsulaim.sa',
      fullName: 'الشيخ خالد بن عبدالعزيز السليم',
      role: 'رئيس مجلس الإدارة (Group Super Admin)',
      companyId: 'all',
      departmentId: 'executive',
      branch: 'المقر الرئيسي للمجموعة - الرياض',
      badgeEmoji: '🛡️',
    ),
    const StaffDirectoryAccount(
      id: 'USR-GRP-FIN-01',
      username: 'group.cfo',
      email: 'cfo@alsulaim.sa',
      fullName: 'أ. محمد بن عبدالرحمن السليم',
      role: 'المدير المالي التنفيذي للمجموعة (SMACC Group CFO)',
      companyId: 'all',
      departmentId: 'executive',
      branch: 'المقر الرئيسي للمجموعة - الرياض',
      badgeEmoji: '📊',
    ),
    const StaffDirectoryAccount(
      id: 'USR-GRP-DEV-01',
      username: 'abdo12uk',
      email: 'abdo12uk@gmail.com',
      fullName: 'م. عبدالرحمن (مطور النظام الرئيسي)',
      role: 'مطور النظام ومدير الصلاحيات العليا (System Developer)',
      companyId: 'all',
      departmentId: 'executive',
      branch: 'المقر الرئيسي للمجموعة - الرياض',
      badgeEmoji: '💻',
    ),
  ];

  /// Register a newly created staff account into the in-memory directory
  static StaffDirectoryAccount registerCustomStaffAccount({
    required String email,
    required String fullName,
    required String companyId,
    required String departmentId,
    String branch = 'الفرع الرئيسي - الرياض',
  }) {
    final dept = departments[departmentId] ?? departments['recruitment']!;
    final cleanEmail = email.trim().toLowerCase();
    final username = cleanEmail.contains('@') ? cleanEmail.split('@').first : cleanEmail;
    final newAccount = StaffDirectoryAccount(
      id: 'USR-CUSTOM-${DateTime.now().millisecondsSinceEpoch}',
      username: username,
      email: cleanEmail,
      fullName: fullName.trim().isNotEmpty ? fullName.trim() : 'موظف قسم (${dept.shortNameAr})',
      role: '${dept.nameAr} — معتمد',
      companyId: companyId,
      departmentId: departmentId,
      branch: branch,
      badgeEmoji: dept.emoji,
    );
    staffDirectory.removeWhere(
      (s) => s.email.toLowerCase() == cleanEmail || s.username.toLowerCase() == username,
    );
    staffDirectory.insert(0, newAccount);
    return newAccount;
  }

  /// Resolve Staff Account, Company, and Department from email or username
  static ({
    SystemPortalOption portal,
    CorporateDepartment department,
    StaffDirectoryAccount? staffAccount,
  }) resolveUnifiedCredentials(
    String rawIdentifier, {
    String? fallbackCompanyCode,
    String? fallbackDepartmentId,
  }) {
    final clean = rawIdentifier.trim().toLowerCase();

    // 1. Check exact or prefix match in staffDirectory
    for (final staff in staffDirectory) {
      final emailPrefix = staff.email.toLowerCase().split('@').first;
      if (staff.email.toLowerCase() == clean ||
          staff.username.toLowerCase() == clean ||
          (clean.isNotEmpty && !clean.contains('@') && emailPrefix == clean)) {
        final portal = resolvePortalByCode(staff.companyId);
        final deptId = fallbackDepartmentId ?? staff.departmentId;
        final dept = departments[deptId] ?? departments[staff.departmentId] ?? departments['recruitment']!;
        return (portal: portal, department: dept, staffAccount: staff);
      }
    }

    // 2. Detect company from domain or shorthand
    SystemPortalOption resolvedPortal = resolvePortalByCode(fallbackCompanyCode ?? 'SAF');
    if (clean.endsWith('@saf-rec.sa') || clean == 'saf' || clean.startsWith('saf.')) {
      resolvedPortal = resolvePortalByCode('SAF');
    } else if (clean.endsWith('@yaqoot-ops.sa') || clean == 'yaq' || clean.startsWith('yaq.')) {
      resolvedPortal = resolvePortalByCode('YAQ');
    } else if (clean.endsWith('@topaz-rec.sa') || clean == 'top' || clean.startsWith('top.')) {
      resolvedPortal = resolvePortalByCode('TOP');
    } else if (clean.endsWith('@kas-etimad.sa') || clean == 'kas' || clean.startsWith('kas.')) {
      resolvedPortal = resolvePortalByCode('KAS');
    } else if (clean.endsWith('@alruwad.sa') || clean == 'dar' || clean.startsWith('dar.')) {
      resolvedPortal = resolvePortalByCode('DAR');
    } else if (clean.endsWith('@alsulaim.sa') || clean == 'admin' || clean == 'chairman') {
      resolvedPortal = resolvePortalByCode('all');
    }

    // 3. Detect department from explicit override or prefix
    final localPart = clean.split('@').first;
    String deptId = fallbackDepartmentId ?? resolvedPortal.defaultDepartmentId;
    if (fallbackDepartmentId == null) {
      if (resolvedPortal.companyId == 'all' ||
          localPart.contains('chairman') ||
          localPart.contains('ceo') ||
          localPart.contains('admin') ||
          localPart.contains('super')) {
        deptId = 'executive';
      } else if (localPart.contains('acc') ||
          localPart.contains('fin') ||
          localPart.contains('smacc') ||
          localPart.contains('zatca') ||
          localPart.contains('cfo')) {
        deptId = 'finance';
      } else if (localPart.contains('hr') ||
          localPart.contains('payroll') ||
          localPart.contains('wps')) {
        deptId = 'hr';
      } else if (localPart.contains('crm') ||
          localPart.contains('client') ||
          localPart.contains('sales')) {
        deptId = 'crm';
      } else if (localPart.contains('rent') || localPart.contains('ops')) {
        deptId = 'rental';
      } else if (localPart.contains('ats') ||
          localPart.contains('talent') ||
          localPart.contains('noura') ||
          localPart.contains('cv')) {
        deptId = 'ats';
      } else if (localPart.contains('shelter') || localPart.contains('warden')) {
        deptId = 'shelter';
      } else if (localPart.contains('tender') ||
          localPart.contains('boq') ||
          localPart.contains('etimad')) {
        deptId = 'tenders';
      } else if (localPart.contains('musaned') ||
          localPart.contains('rec') ||
          localPart.contains('faris')) {
        deptId = 'recruitment';
      }
    }

    final dept = departments[deptId] ?? departments['recruitment']!;
    return (portal: resolvedPortal, department: dept, staffAccount: null);
  }

  /// Strict Department & Company Isolation Guard
  static bool isTabAuthorized({
    required String departmentId,
    required String companyId,
    required String tabHref,
  }) {
    if (tabHref == 'logout' || tabHref == 'profile') return true;
    if (departmentId == 'executive' || companyId == 'all') return true;

    const kasExclusive = {
      'kas-suite',
      'kas-portal',
      'kas-standalone',
      'kas-company',
      'kas-etmad',
      'tenders-boq',
    };
    if (companyId != 'KAS' && kasExclusive.contains(tabHref)) {
      return false;
    }

    final dept = departments[departmentId];
    if (dept == null) return false;
    if (dept.allowedTabs.contains('*')) return true;
    return dept.allowedTabs.contains(tabHref);
  }

  /// Exact `SYSTEM_PORTALS` from `src/pages/LoginPage.tsx` & `LandingPage.tsx`
  static const List<SystemPortalOption> systemPortals = [
    SystemPortalOption(
      id: 'saf',
      key: 'saf',
      companyId: 'SAF',
      companyCodeBadge: 'COMPANY 01 [SAF]',
      nameAr: 'شركة السفير الماسي للاستقدام',
      nameEn: 'Al-Safeer Al-Masi Recruitment Co.',
      category: 'شركات المجموعة',
      license: 'ترخيص مساند RC01 • س.ت 1010123456',
      sectorTagAr: 'استقدام العمالة المنزلية والمهنية',
      badge: 'عقود الاستقدام مساند',
      desc: 'بوابة متكاملة لإدارة عقود استقدام الأفراد، إصدار التأشيرات الفورية، التوثيق عبر مساند، ومحاسبة سماك.',
      stats: '1,420+ عقد نشط',
      themeColor: Color(0xFF000000),
      emailDomain: 'saf-rec.sa',
      routePath: '/login/saf',
      assetLogo: 'assets/alsulaim-gold-emblem.png',
      targetTab: 'recruitment-contracts',
      targetTitle: 'عقود استقدام مساند - شركة السفير الماسي',
      demoEmail: 'musaned@saf-rec.sa',
      demoEmployeeName: 'م. سلطان بن خالد السليم',
      demoRole: 'مدير قسم الاستقدام وعقود مساند',
      defaultDepartmentId: 'recruitment',
      emoji: '📑',
      icon: Icons.verified_user_rounded,
    ),
    SystemPortalOption(
      id: 'yaq',
      key: 'yaq',
      companyId: 'YAQ',
      companyCodeBadge: 'COMPANY 02 [YAQ]',
      nameAr: 'شركة الياقوت الشرقية للتشغيل والتأجير',
      nameEn: 'Yaqoot Eastern Operation & Rental Co.',
      category: 'شركات المجموعة',
      license: 'ترخيص مساند RC02 • س.ت 1010543210',
      sectorTagAr: 'باقات التأجير المرن بالساعة والشهر',
      badge: 'التأجير والتشغيل المرن',
      desc: 'حلول تشغيلية مرنة لقطاع الأعمال وباقات تأجير الكوادر المهنية والعمالة المنزلية المعتمدة.',
      stats: '890+ عقد إيجار',
      themeColor: Color(0xFF000000),
      emailDomain: 'yaqoot-ops.sa',
      routePath: '/login/yaq',
      assetLogo: 'assets/logos/yaqoot.png',
      targetTab: 'rent-contracts',
      targetTitle: 'عقود التأجير والتشغيل - شركة الياقوت',
      demoEmail: 'ops@yaqoot-ops.sa',
      demoEmployeeName: 'أ. فيصل بن عبدالعزيز القحطاني',
      demoRole: 'مدير قسم التأجير والتشغيل المرن — الياقوت',
      defaultDepartmentId: 'rental',
      emoji: '🏢',
      icon: Icons.business_rounded,
    ),
    SystemPortalOption(
      id: 'top',
      key: 'top',
      companyId: 'TOP',
      companyCodeBadge: 'COMPANY 03 [TOP]',
      nameAr: 'شركة توب تالنت الدولية للتوظيف والـ ATS',
      nameEn: 'Top Talent ATS & Recruitment Co.',
      category: 'شركات المجموعة',
      license: 'ترخيص مساند RC03 • س.ت 1010776543',
      sectorTagAr: 'استقطاب الكفاءات التنفيذية والتوظيف',
      badge: 'الفرز والترشيح ATS',
      desc: 'منظومة الفرز والتدقيق المرحلي للمرشحين (ATS)، استيراد السير بالدفعة، وشبكة الوكلاء في 14 دولة.',
      stats: '3,250+ سيرة ذاتية',
      themeColor: Color(0xFF000000),
      emailDomain: 'topaz-rec.sa',
      routePath: '/login/top',
      assetLogo: 'assets/logos/topaz.png',
      targetTab: 'cvs-recruitment',
      targetTitle: 'بنك السير الذاتية والفرز المرحلي - توب تالنت',
      demoEmail: 'talent@topaz-rec.sa',
      demoEmployeeName: 'أ. نورة بنت سلطان العتيبي',
      demoRole: 'مديرة قسم التوظيف والسير الذاتية والوكلاء',
      defaultDepartmentId: 'ats',
      emoji: '🗂️',
      icon: Icons.folder_shared_rounded,
    ),
    SystemPortalOption(
      id: 'kas',
      key: 'kas',
      companyId: 'KAS',
      companyCodeBadge: 'COMPANY 04 [KAS]',
      nameAr: 'شركة كاس للمنافسات والتشغيل',
      nameEn: 'KAS Trading & Etmad Enterprise Suite',
      category: 'شركات المجموعة',
      license: 'سجل تجاري 1010789234 • ضريبي 310284759200003',
      sectorTagAr: 'منافسات اعتماد وجداول الكميات BOQ',
      badge: 'منافسات اعتماد وجداول BOQ',
      desc: 'بوابة مستقلة ومعزولة كلياً لإدارة منافسات اعتماد، جداول الكميات BOQ، الضمانات البنكية، والفوترة ZATCA.',
      stats: '2,650+ منافسة اعتماد',
      themeColor: Color(0xFF000000),
      emailDomain: 'kas-etimad.sa',
      routePath: '/login/kas',
      assetLogo: 'assets/logo.png',
      targetTab: 'kas-suite',
      targetTitle: 'البوابة المستقلة لشركة كاس (KAS Suite)',
      demoEmail: 'tenders@kas-etimad.sa',
      demoEmployeeName: 'م. عبدالرحمن بن صالح القحطاني',
      demoRole: 'مدير قسم منافسات اعتماد وجداول الكميات BOQ',
      defaultDepartmentId: 'tenders',
      emoji: '⚖️',
      icon: Icons.account_balance_rounded,
    ),
    SystemPortalOption(
      id: 'shelter',
      key: 'shelter',
      companyId: 'DAR',
      companyCodeBadge: 'FACILITY 05 [SHELTER]',
      nameAr: 'دار الرواد لمراكز الإيواء والتسكين والرعاية',
      nameEn: 'Dar Al-Ruwad Shelter, Housing & Care Suite (HRSD)',
      category: 'شركات المجموعة',
      license: 'ترخيص مراكز الإيواء HRSD-MOL • س.ت 1010642918',
      sectorTagAr: 'إدارة الإيواء والإعاشة والترحيل النظامي',
      badge: 'ترخيص مراكز الإيواء HRSD',
      desc: 'بوابة إدارة غرف وأسرة الإيواء والضيافة، المتابعة الصحية والغذائية، وإجراءات الترحيل الممتثلة لمعايير وزارة الموارد البشرية.',
      stats: '120 سرير • امتثال 100%',
      themeColor: Color(0xFF000000),
      emailDomain: 'alruwad.sa',
      routePath: '/login/shelter',
      assetLogo: 'assets/logos/ruwad.png',
      targetTab: 'shelter-suite',
      targetTitle: 'منظومة وبوابة مراكز الإيواء والتسكين المستقلة',
      demoEmail: 'warden@alruwad.sa',
      demoEmployeeName: 'أ. سارة بنت عبدالله الشهري',
      demoRole: 'مديرة قسم الإيواء والتسكين والإعاشة — دار الرواد',
      defaultDepartmentId: 'shelter',
      emoji: '🏨',
      icon: Icons.night_shelter_rounded,
    ),
    SystemPortalOption(
      id: 'admin',
      key: 'admin',
      companyId: 'all',
      companyCodeBadge: 'EXECUTIVE [GROUP]',
      nameAr: 'الإدارة المركزية والسيطرة العليا',
      nameEn: 'Executive Command & Super Admin',
      category: 'الإدارة والسيطرة',
      license: 'مجموعة خالد السليم القابضة الموحدة',
      sectorTagAr: 'الحوكمة المركزية والمراقبة المالية الشاملة',
      badge: 'القيادة المركزية الموحدة',
      desc: 'مركز القيادة الموحد لمجلس الإدارة والرقابة المالية الشاملة عبر كافة شركات وأقسام المجموعة.',
      stats: '5 شركات • حوكمة 100%',
      themeColor: Color(0xFFCFA64A),
      emailDomain: 'alsulaim.sa',
      routePath: '/login/admin',
      assetLogo: 'assets/alsulaim-gold-emblem.png',
      targetTab: 'dashboard',
      targetTitle: 'الرئيسية والمؤشرات التشغيلية الشاملة',
      demoEmail: 'chairman@alsulaim.sa',
      demoEmployeeName: 'الشيخ خالد بن عبدالعزيز السليم',
      demoRole: 'رئيس مجلس الإدارة (Group Super Admin)',
      defaultDepartmentId: 'executive',
      emoji: '🛡️',
      icon: Icons.shield_rounded,
    ),
    SystemPortalOption(
      id: 'client',
      key: 'client',
      companyId: 'SAF',
      companyCodeBadge: 'PORTAL [CRM]',
      nameAr: 'قسم خدمة العملاء وبوابة المستفيدين',
      nameEn: 'CRM & Client Service Department',
      category: 'البوابات الرقمية',
      license: 'خدمة العملاء والشكاوى والمتابعة 24/7',
      sectorTagAr: 'سجل العملاء والشكاوى وتذاكر SLA',
      badge: 'خدمة العملاء CRM',
      desc: 'متابعة سجل العملاء، الشكاوى، وصندوق الواتساب المؤسسي الموحد.',
      stats: '241 عميل نشط',
      themeColor: Color(0xFF000000),
      emailDomain: 'saf-rec.sa',
      routePath: '/login/client',
      assetLogo: 'assets/alsulaim-gold-emblem.png',
      targetTab: 'clients',
      targetTitle: 'إدارة العملاء والمبيعات والشكاوى (CRM)',
      demoEmail: 'crm@saf-rec.sa',
      demoEmployeeName: 'أ. ريم بنت عبدالله الحربي',
      demoRole: 'مسؤولة علاقات العملاء والشكاوى',
      defaultDepartmentId: 'crm',
      emoji: '🏛️',
      icon: Icons.people_alt_rounded,
    ),
    SystemPortalOption(
      id: 'agent',
      key: 'agent',
      companyId: 'SAF',
      companyCodeBadge: 'PORTAL [SMACC]',
      nameAr: 'قسم المحاسبة والمالية (نظام سماك SMACC)',
      nameEn: 'SMACC Accounting & ZATCA Division',
      category: 'البوابات الرقمية',
      license: 'الأستاذ العام • السندات • ZATCA المرحلة 2',
      sectorTagAr: 'شجرة الحسابات وقيود اليومية والقوائم المالية',
      badge: '6 تقسيمات سماك',
      desc: 'نظام سماك المحاسبي المعتمد: الأستاذ العام، الصناديق والبنوك، الفوترة ZATCA، ومراكز التكلفة.',
      stats: 'امتثال 100%',
      themeColor: Color(0xFF000000),
      emailDomain: 'saf-rec.sa',
      routePath: '/login/smacc',
      assetLogo: 'assets/logos/saf.png',
      targetTab: 'smacc-accounting',
      targetTitle: 'نظام سماك المحاسبي المتكامل (SMACC)',
      demoEmail: 'accounting@saf-rec.sa',
      demoEmployeeName: 'أ. عبدالإله بن فهد الدوسري',
      demoRole: 'رئيس الحسابات — نظام سماك (السفير الماسي)',
      defaultDepartmentId: 'finance',
      emoji: '📊',
      icon: Icons.account_balance_wallet_rounded,
    ),
    SystemPortalOption(
      id: 'ecommerce',
      key: 'ecommerce',
      companyId: 'SAF',
      companyCodeBadge: 'PORTAL [HR & WPS]',
      nameAr: 'قسم الموارد البشرية ومسيرات الرواتب (WPS)',
      nameEn: 'Human Resources & Payroll Protection',
      category: 'البوابات الرقمية',
      license: 'شؤون الموظفين • مسيرات مدد • البصمة',
      sectorTagAr: 'إدارة الكوادر وحماية الأجور والتأمينات',
      badge: 'الموارد البشرية WPS',
      desc: 'ملفات الموظفين، الحضور والانصراف، ومسيرات الرواتب المتوافقة مع نظام حماية الأجور.',
      stats: '32 موظف',
      themeColor: Color(0xFF000000),
      emailDomain: 'saf-rec.sa',
      routePath: '/login/hr',
      assetLogo: 'assets/alsulaim-gold-emblem.png',
      targetTab: 'employees',
      targetTitle: 'إدارة الموارد البشرية ومسير الرواتب (WPS)',
      demoEmail: 'hr@saf-rec.sa',
      demoEmployeeName: 'أ. نايف بن محمد العتيبي',
      demoRole: 'مدير الموارد البشرية والرواتب',
      defaultDepartmentId: 'hr',
      emoji: '👥',
      icon: Icons.badge_rounded,
    ),
  ];

  static List<SystemPortalOption> get mainSubsidiaryCompanies =>
      systemPortals.where((p) => p.category == 'شركات المجموعة').toList();

  static SystemPortalOption resolvePortalByCode(String? rawCode) {
    if (rawCode == null || rawCode.trim().isEmpty) return systemPortals.first;
    final clean = rawCode.trim().toLowerCase();
    if (clean == 'all' || clean == 'group' || clean == 'grp') {
      return systemPortals.firstWhere((p) => p.id == 'admin', orElse: () => systemPortals.first);
    }
    if (clean == 'dar') {
      return systemPortals.firstWhere((p) => p.id == 'shelter', orElse: () => systemPortals.first);
    }
    return systemPortals.firstWhere(
      (p) =>
          p.id.toLowerCase() == clean ||
          p.key.toLowerCase() == clean ||
          p.companyId.toLowerCase() == clean,
      orElse: () => systemPortals.first,
    );
  }

  /// Branches from `src/components/layout/Header.tsx`
  static const List<ErpBranchOption> branches = [
    ErpBranchOption(id: 'main', name: 'الفرع الرئيسي - الرياض', city: 'الرياض - طريق الملك فهد'),
    ErpBranchOption(id: 'riyadh_takhassusi', name: 'فرع الرياض (التخصصي)', city: 'الرياض'),
    ErpBranchOption(id: 'jeddah', name: 'فرع جدة', city: 'طريق المدينة المنورة'),
    ErpBranchOption(id: 'dammam', name: 'فرع الدمام', city: 'شارع الملك سعود'),
    ErpBranchOption(id: 'khamis', name: 'فرع خميس مشيط', city: 'طريق الملك فهد'),
    ErpBranchOption(id: 'online', name: 'البوابة الرقمية الموحدة', city: 'السعودية'),
  ];

  /// Exact `ALL_SYSTEM_APPS` from `src/pages/AppLauncherPage.tsx` (with all 6 SMACC Divisions)
  static const List<ErpAppTile> allSystemApps = [
    // 1. SMACC Accounting & Finance (6 Official SMACC Divisions)
    ErpAppTile(
      id: 'smacc-accounting',
      title: '١. الأستاذ العام وشجرة الحسابات (SMACC GL)',
      subtitle: 'دليل الحسابات الشجري، قيود اليومية المزدوجة، الأرصدة الافتتاحية، وإقفال الفترات.',
      icon: Icons.account_tree_rounded,
      emoji: '📊',
      smaccCode: 'SMACC-01',
      href: 'smacc-accounting',
      category: 'finance',
      categoryLabel: 'سماك ١ • الأستاذ العام',
      metricBadge: 'شجرة حسابات سماك',
    ),
    ErpAppTile(
      id: 'journals',
      title: '١.٢ قيود اليومية المزدوجة والترحيل',
      subtitle: 'إنشاء ومراجعة قيود اليومية المحاسبية المتوازنة وترحيلها الفوري للأستاذ العام.',
      icon: Icons.menu_book_rounded,
      emoji: '📘',
      smaccCode: 'SMACC-01B',
      href: 'journals',
      category: 'finance',
      categoryLabel: 'سماك ١ • قيود اليومية',
      metricBadge: '1,420 قيد مرحّل',
    ),
    ErpAppTile(
      id: 'vouchers',
      title: '٢. النقدية والبنوك وسندات القبض والصرف',
      subtitle: 'الصناديق النقدية، الحسابات البنكية، سندات القبض والصرف، والتسويات البنكية.',
      icon: Icons.account_balance_wallet_rounded,
      emoji: '🏦',
      smaccCode: 'SMACC-02',
      href: 'vouchers',
      category: 'finance',
      categoryLabel: 'سماك ٢ • النقدية والبنوك',
      metricBadge: 'سندات وتسويات',
    ),
    ErpAppTile(
      id: 'zatca',
      title: '٣. حسابات العملاء والمبيعات والفوترة (ZATCA)',
      subtitle: 'إصدار الفواتير الضريبية والمبسطة (المرحلة الثانية ZATCA)، إشعارات الدائن والمدين، وأعمار الديون.',
      icon: Icons.qr_code_2_rounded,
      emoji: '🧾',
      smaccCode: 'SMACC-03',
      href: 'zatca',
      category: 'finance',
      categoryLabel: 'سماك ٣ • العملاء وZATCA',
      metricBadge: 'امتثال ZATCA 100%',
    ),
    ErpAppTile(
      id: 'financial-requests',
      title: '٤. حسابات الموردين والوكلاء والمشتريات',
      subtitle: 'ذمم الوكلاء الخارجيين، أوامر الصرف والاعتمادات المالية، رسوم مساند، والإقرارات الضريبية VAT.',
      icon: Icons.credit_card_rounded,
      emoji: '📑',
      smaccCode: 'SMACC-04',
      href: 'financial-requests',
      category: 'finance',
      categoryLabel: 'سماك ٤ • الموردين والوكلاء',
      metricBadge: '16 أمر صرف',
    ),
    ErpAppTile(
      id: 'cost-centers',
      title: '٥. مراكز التكلفة والأصول الثابتة والمستودعات',
      subtitle: 'توزيع الإيرادات والمصروفات على الشركات والفروع والمشاريع، وإدارة الأصول والإهلاك.',
      icon: Icons.hub_rounded,
      emoji: '🏗️',
      smaccCode: 'SMACC-05',
      href: 'cost-centers',
      category: 'finance',
      categoryLabel: 'سماك ٥ • مراكز التكلفة',
      metricBadge: '8 مراكز تكلفة',
    ),
    ErpAppTile(
      id: 'trial-balance',
      title: '٦. التقارير والكشوفات المالية الموحدة',
      subtitle: 'ميزان المراجعة بالمجاميع والأرصدة، قائمة الدخل والأرباح والخسائر، والميزانية العمومية.',
      icon: Icons.assessment_rounded,
      emoji: '📈',
      smaccCode: 'SMACC-06',
      href: 'trial-balance',
      category: 'finance',
      categoryLabel: 'سماك ٦ • القوائم الختامية',
      metricBadge: 'قوائم مالية فورية',
    ),

    // 2. Operations, Recruitment, Rental, ATS, Shelter
    ErpAppTile(
      id: 'recruitment-contracts',
      title: '١. عقود الاستقدام الموثقة (مساند)',
      subtitle: 'إدارة عقود الاستقدام، الربط مع مساند، وتتبع مراحل التفييز والتذاكر.',
      icon: Icons.handshake_rounded,
      emoji: '📑',
      smaccCode: 'OPS-01',
      href: 'recruitment-contracts',
      category: 'operations',
      categoryLabel: 'الاستقدام • العقود والتوثيق',
      metricBadge: '121 عقد نشط',
    ),
    ErpAppTile(
      id: 'orders',
      title: '٢. طلبات الاستقدام والعمليات (SLA)',
      subtitle: 'استقبال طلبات الاستقدام الجديدة، مؤقتات الـ SLA، والتحويل الفوري لعقود.',
      icon: Icons.shopping_bag_rounded,
      emoji: '📋',
      smaccCode: 'OPS-02',
      href: 'orders',
      category: 'operations',
      categoryLabel: 'الاستقدام • الحركة اليومية',
      metricBadge: '48 طلب جديد',
    ),
    ErpAppTile(
      id: 'cvs',
      title: '٣. بنك السير الذاتية والمرشحين (CVs)',
      subtitle: 'فلترة وتصنيف الكوادر البشرية، السير المحجوزة، والمتاحة للتعاقد الفوري.',
      icon: Icons.badge_rounded,
      emoji: '🗂️',
      smaccCode: 'ATS-01',
      href: 'cvs-recruitment',
      category: 'operations',
      categoryLabel: 'الفرز والترشيح • المدخلات',
      metricBadge: '163 سيرة جاهزة',
    ),
    ErpAppTile(
      id: 'ats-pipeline',
      title: '٤. مسار الفرز والتدقيق المرحلي (12 مرحلة ATS)',
      subtitle: 'تتبع المرشحين عبر 12 مرحلة نظامية من الاستقبال والفحص الطبي حتى إصدار التأشيرة.',
      icon: Icons.rule_folder_rounded,
      emoji: '🔍',
      smaccCode: 'ATS-02',
      href: 'ats-pipeline',
      category: 'operations',
      categoryLabel: 'الفرز والترشيح • الحركة',
      metricBadge: '12 مرحلة نظامية',
    ),
    ErpAppTile(
      id: 'rent-contracts',
      title: '٥. عقود التأجير والتشغيل المرن',
      subtitle: 'إدارة عقود الإيجار الشهرية والسنوية ومتابعة التسليم والتحصيل والدفعات.',
      icon: Icons.layers_rounded,
      emoji: '🏢',
      smaccCode: 'RNT-01',
      href: 'rent-contracts',
      category: 'operations',
      categoryLabel: 'التأجير • العقود والحركة',
      metricBadge: '34 عقد إيجار',
    ),
    ErpAppTile(
      id: 'rent-packages',
      title: '٦. باقات وأسعار التأجير المعتمدة',
      subtitle: 'تسعير مدد التأجير (شهر، 3 أشهر، سنة) واحتساب ضريبة القيمة المضافة.',
      icon: Icons.inventory_2_rounded,
      emoji: '📦',
      smaccCode: 'RNT-02',
      href: 'rent-packages',
      category: 'operations',
      categoryLabel: 'التأجير • التسعير',
      metricBadge: '12 باقة نشطة',
    ),
    ErpAppTile(
      id: 'ingaz',
      title: '٧. تفاويض إنجاز والتأشيرات والغرف التجارية',
      subtitle: 'إصدار وتوثيق تفاويض إنجاز الإلكترونية والربط مع السفارات الخارجية.',
      icon: Icons.verified_rounded,
      emoji: '🛂',
      smaccCode: 'OPS-03',
      href: 'ingaz',
      category: 'operations',
      categoryLabel: 'التأشيرات والربط',
      metricBadge: '29 تفويض موثق',
    ),
    ErpAppTile(
      id: 'sponsorship-transfer',
      title: '٨. نقل الخدمات والتنازل وفترة التجربة',
      subtitle: 'إدارة عقود التنازل ونقل الخدمات المعتمدة، فترات التجربة النظامية، والتسويات المالية.',
      icon: Icons.sync_alt_rounded,
      emoji: '🔄',
      smaccCode: 'OPS-04',
      href: 'sponsorship-transfer',
      category: 'operations',
      categoryLabel: 'نقل الخدمات والتنازل',
      metricBadge: '8 قيد التجربة',
    ),
    ErpAppTile(
      id: 'travel',
      title: '٩. الرحلات الجوية والاستقبال بالمطار',
      subtitle: 'جدولة رحلات الوصول والاستقبال بالمطار، حجوزات التذاكر، وتتبع الترحيل.',
      icon: Icons.flight_land_rounded,
      emoji: '✈️',
      smaccCode: 'OPS-05',
      href: 'travel',
      category: 'operations',
      categoryLabel: 'الخدمات اللوجستية',
      metricBadge: '14 رحلة قادمة',
    ),
    ErpAppTile(
      id: 'shelter',
      title: '١٠. منظومة مراكز الإيواء والتسكين (DAR)',
      subtitle: 'إدارة الغرف، الأسرة، الإعاشة والتموين، الرعاية الصحية، والترحيل (HRSD).',
      icon: Icons.hotel_rounded,
      emoji: '🏨',
      smaccCode: 'SHL-01',
      href: 'shelter-suite',
      category: 'operations',
      categoryLabel: 'الإيواء والتسكين',
      metricBadge: 'منظومة الإيواء • 9 أقسام',
    ),

    // 3. CRM & Client Service
    ErpAppTile(
      id: 'crm',
      title: '١. سجل العملاء والتصنيفات الائتمانية (CRM)',
      subtitle: 'سجل العملاء، التصنيفات، التقييم الائتماني، وتاريخ المعاملات الموحد.',
      icon: Icons.people_alt_rounded,
      emoji: '🤝',
      smaccCode: 'CRM-01',
      href: 'clients',
      category: 'crm',
      categoryLabel: 'العملاء والمبيعات',
      metricBadge: '241 عميل نشط',
    ),
    ErpAppTile(
      id: 'complaints',
      title: '٢. الشكاوى والدعم الفني ومؤشرات SLA',
      subtitle: 'تذاكر الدعم الفني، تسوية النزاعات، واحتساب تعويضات ضمان الـ 90 يوماً.',
      icon: Icons.support_agent_rounded,
      emoji: '🎧',
      smaccCode: 'CRM-02',
      href: 'complaints',
      category: 'crm',
      categoryLabel: 'خدمة العملاء',
      metricBadge: '4 تذاكر مفتوحة',
    ),
    ErpAppTile(
      id: 'whatsapp-inbox',
      title: '٣. صندوق واتساب المؤسسي الموحد',
      subtitle: 'مراسلة العملاء وتوزيع المحادثات وإرسال العقود وسندات القبض.',
      icon: Icons.chat_rounded,
      emoji: '💬',
      smaccCode: 'CRM-03',
      href: 'whatsapp-inbox',
      category: 'crm',
      categoryLabel: 'التواصل الموحد',
      metricBadge: '8 محادثات نشطة',
    ),

    // 4. HR & WPS
    ErpAppTile(
      id: 'employees',
      title: '١. شؤون الموظفين ومسير الرواتب (WPS)',
      subtitle: 'سجل الموظفين، حماية الأجور، الإجازات، ومكافأة نهاية الخدمة.',
      icon: Icons.badge_outlined,
      emoji: '👥',
      smaccCode: 'HRM-01',
      href: 'employees',
      category: 'hr',
      categoryLabel: 'الموارد البشرية',
      metricBadge: 'حماية الأجور WPS',
    ),
    ErpAppTile(
      id: 'attendances',
      title: '٢. الحضور والانصراف وأجهزة البصمة',
      subtitle: 'تسجيل الحضور الجغرافي والبيومتري وتقارير الدوام اليومية.',
      icon: Icons.fingerprint_rounded,
      emoji: '⏱️',
      smaccCode: 'HRM-02',
      href: 'attendances',
      category: 'hr',
      categoryLabel: 'الموارد البشرية',
      metricBadge: 'مزامنة البصمة',
    ),

    // 5. Governance, Tenders & Executive
    ErpAppTile(
      id: 'dashboard',
      title: '١. لوحة المؤشرات التشغيلية الشاملة',
      subtitle: 'لوحة التحكم الهيكلية SMACC والمؤشرات الفورية للعقود والطلبات.',
      icon: Icons.dashboard_rounded,
      emoji: '🏛️',
      smaccCode: 'GOV-01',
      href: 'dashboard',
      category: 'governance',
      categoryLabel: 'القيادة والمؤشرات',
      metricBadge: 'الرئيسية',
    ),
    ErpAppTile(
      id: 'kas-suite',
      title: '٢. البوابة المستقلة لشركة كاس (KAS Suite)',
      subtitle: 'منظومة معزولة كلياً: منصة اعتماد، جداول الكميات BOQ، سجل الموردين، والفوترة ZATCA.',
      icon: Icons.business_center_rounded,
      emoji: '⚖️',
      smaccCode: 'KAS-01',
      href: 'kas-suite',
      category: 'governance',
      categoryLabel: 'المنافسات ومنصة اعتماد',
      metricBadge: 'جناح مستقل KAS',
      exclusiveToCompany: 'KAS',
    ),
    ErpAppTile(
      id: 'tenders-boq',
      title: '٣. تسعير المنافسات وجداول الكميات (BOQ)',
      subtitle: 'تحليل بنود المناقصات الحكومية، احتساب التكاليف المباشرة، وهوامش الربح.',
      icon: Icons.gavel_rounded,
      emoji: '📐',
      smaccCode: 'KAS-02',
      href: 'tenders-boq',
      category: 'governance',
      categoryLabel: 'المنافسات • جداول الكميات',
      metricBadge: 'تسعير BOQ',
      exclusiveToCompany: 'KAS',
    ),
    ErpAppTile(
      id: 'group-command-center',
      title: '٤. مركز القيادة الموحد للمجموعة',
      subtitle: 'مراقبة حية لكافة الشركات والفروع والربط الحكومي المركزي.',
      icon: Icons.radar_rounded,
      emoji: '👑',
      smaccCode: 'GOV-02',
      href: 'group-command-center',
      category: 'governance',
      categoryLabel: 'الحوكمة والقيادة',
      metricBadge: 'سيطرة مركزية',
    ),
    ErpAppTile(
      id: 'iam-matrix',
      title: '٥. مصفوفة الصلاحيات وعزل الأقسام (IAM)',
      subtitle: 'إدارة الأدوار، عزل الشركات والأقسام Strict RLS، وحماية البيانات PDPL.',
      icon: Icons.admin_panel_settings_rounded,
      emoji: '🔐',
      smaccCode: 'SEC-01',
      href: 'iam-matrix',
      category: 'governance',
      categoryLabel: 'الأمان والحوكمة',
      metricBadge: 'RLS 100%',
    ),
    ErpAppTile(
      id: 'reports',
      title: '٦. مركز التقارير الموحدة والتصدير',
      subtitle: 'التقارير التنفيذية، تقارير المبيعات، الاستقدام، والقوائم المالية.',
      icon: Icons.analytics_rounded,
      emoji: '📊',
      smaccCode: 'GOV-03',
      href: 'reports',
      category: 'governance',
      categoryLabel: 'التقارير والتحليلات',
      metricBadge: 'تصدير فوري',
    ),
  ];

  /// Exact `SIDEBAR_MENU` from `src/data/sidebarMenu.ts` (Structured by SMACC Divisions)
  static const List<ErpSidebarItem> sidebarMenu = [
    ErpSidebarItem(
      id: 'dashboard',
      title: 'الرئيسية (لوحة المؤشرات)',
      icon: Icons.dashboard_rounded,
      href: 'dashboard',
    ),
    ErpSidebarItem(
      id: 'finance-section',
      title: 'نظام سماك المحاسبي والمالية (SMACC)',
      icon: Icons.account_balance_wallet_rounded,
      children: [
        ErpSidebarItem(
          id: 'smacc-accounting',
          title: '١. الأستاذ العام وشجرة الحسابات (GL)',
          icon: Icons.account_tree_rounded,
          href: 'smacc-accounting',
          badge: 'SMACC 1',
        ),
        ErpSidebarItem(
          id: 'journals',
          title: '١.٢ قيود اليومية المزدوجة والترحيل',
          icon: Icons.menu_book_rounded,
          href: 'journals',
        ),
        ErpSidebarItem(
          id: 'vouchers',
          title: '٢. النقدية والبنوك وسندات القبض والصرف',
          icon: Icons.payments_rounded,
          href: 'vouchers',
          badge: 'SMACC 2',
        ),
        ErpSidebarItem(
          id: 'zatca',
          title: '٣. حسابات العملاء والفوترة (ZATCA 2)',
          icon: Icons.qr_code_scanner_rounded,
          href: 'zatca',
          badge: 'SMACC 3',
        ),
        ErpSidebarItem(
          id: 'financial-requests',
          title: '٤. حسابات الموردين والوكلاء وأوامر الصرف',
          icon: Icons.receipt_long_rounded,
          href: 'financial-requests',
          badge: 'SMACC 4',
        ),
        ErpSidebarItem(
          id: 'cost-centers',
          title: '٥. مراكز التكلفة والأصول والمستودعات',
          icon: Icons.hub_rounded,
          href: 'cost-centers',
          badge: 'SMACC 5',
        ),
        ErpSidebarItem(
          id: 'trial-balance',
          title: '٦. التقارير المالية وميزان المراجعة والقوائم',
          icon: Icons.bar_chart_rounded,
          href: 'trial-balance',
          badge: 'SMACC 6',
        ),
      ],
    ),
    ErpSidebarItem(
      id: 'operations-section',
      title: 'العمليات والاستقدام والتأجير والفرز',
      icon: Icons.layers_rounded,
      children: [
        ErpSidebarItem(
          id: 'recruitment-contracts',
          title: '١. عقود الاستقدام الموثقة (مساند)',
          icon: Icons.description_rounded,
          href: 'recruitment-contracts',
          badge: '121',
        ),
        ErpSidebarItem(
          id: 'musaned-sync',
          title: '١.٢ مزامنة وتوثيق عقود مساند',
          icon: Icons.sync_rounded,
          href: 'musaned-sync',
        ),
        ErpSidebarItem(
          id: 'orders',
          title: '٢. طلبات الاستقدام والحجوزات (SLA)',
          icon: Icons.shopping_cart_checkout_rounded,
          href: 'orders',
          badge: '48',
        ),
        ErpSidebarItem(
          id: 'cvs-recruitment',
          title: '٣. بنك السير الذاتية والمرشحين (CVs)',
          icon: Icons.badge_rounded,
          href: 'cvs-recruitment',
          badge: '163',
        ),
        ErpSidebarItem(
          id: 'ats-pipeline',
          title: '٤. مسار الفرز والتدقيق المرحلي (ATS)',
          icon: Icons.fact_check_rounded,
          href: 'ats-pipeline',
          badge: '12 مرحلة',
        ),
        ErpSidebarItem(
          id: 'rent-contracts',
          title: '٥. عقود التأجير والتشغيل المرن',
          icon: Icons.handshake_rounded,
          href: 'rent-contracts',
          badge: '34',
        ),
        ErpSidebarItem(
          id: 'rent-packages',
          title: '٦. باقات وأسعار التأجير المعتمدة',
          icon: Icons.inventory_2_rounded,
          href: 'rent-packages',
        ),
        ErpSidebarItem(
          id: 'ingaz',
          title: '٧. تفاويض الإنجاز والتأشيرات',
          icon: Icons.approval_rounded,
          href: 'ingaz',
          badge: '29',
        ),
        ErpSidebarItem(
          id: 'sponsorship-transfer',
          title: '٨. نقل الخدمات والتنازل وفترة التجربة',
          icon: Icons.swap_horiz_rounded,
          href: 'sponsorship-transfer',
          badge: '8',
        ),
        ErpSidebarItem(
          id: 'travel',
          title: '٩. الرحلات الجوية والاستقبال بالمطار',
          icon: Icons.flight_land_rounded,
          href: 'travel',
        ),
        ErpSidebarItem(
          id: 'shelter-suite',
          title: '١٠. مراكز الإيواء والتسكين (HRSD)',
          icon: Icons.hotel_rounded,
          href: 'shelter-suite',
          badge: '44',
        ),
      ],
    ),
    ErpSidebarItem(
      id: 'crm-section',
      title: 'إدارة العملاء والشكاوى (CRM)',
      icon: Icons.contacts_rounded,
      children: [
        ErpSidebarItem(id: 'clients', title: '١. سجل العملاء والتصنيفات', icon: Icons.people_alt_rounded, href: 'clients', badge: '241'),
        ErpSidebarItem(id: 'complaints', title: '٢. الشكاوى والدعم الفني ومؤشرات SLA', icon: Icons.headset_mic_rounded, href: 'complaints', badge: '4'),
        ErpSidebarItem(id: 'whatsapp-inbox', title: '٣. صندوق واتساب المؤسسي الموحد', icon: Icons.chat_bubble_rounded, href: 'whatsapp-inbox', badge: '8'),
        ErpSidebarItem(id: 'sent-messages', title: '٤. سجل الرسائل والإشعارات النصية', icon: Icons.mark_email_read_rounded, href: 'sent-messages'),
        ErpSidebarItem(id: 'client-portal', title: '٥. بوابة تتبع العقود للعملاء', icon: Icons.verified_user_rounded, href: 'client-portal'),
      ],
    ),
    ErpSidebarItem(
      id: 'hr-section',
      title: 'الموارد البشرية والرواتب (HR & WPS)',
      icon: Icons.groups_rounded,
      children: [
        ErpSidebarItem(id: 'employees', title: '١. سجل الموظفين والكادر الوظيفي', icon: Icons.person_search_rounded, href: 'employees', badge: '32'),
        ErpSidebarItem(id: 'payrolls', title: '٢. مسير الرواتب وحماية الأجور (WPS)', icon: Icons.payments_rounded, href: 'payrolls'),
        ErpSidebarItem(id: 'attendances', title: '٣. الحضور والانصراف وأجهزة البصمة', icon: Icons.access_time_filled_rounded, href: 'attendances'),
        ErpSidebarItem(id: 'employee-monitoring', title: '٤. مؤشرات الأداء والإنتاجية الوظيفية', icon: Icons.monitor_heart_rounded, href: 'employee-monitoring'),
      ],
    ),
    ErpSidebarItem(
      id: 'governance-section',
      title: 'الحوكمة والمنافسات والإدارة العليا',
      icon: Icons.account_balance_rounded,
      children: [
        ErpSidebarItem(id: 'group-command-center', title: '١. مركز القيادة الموحد للمجموعة', icon: Icons.radar_rounded, href: 'group-command-center'),
        ErpSidebarItem(
          id: 'kas-suite',
          title: '٢. البوابة المستقلة لشركة كاس (KAS Suite)',
          icon: Icons.business_center_rounded,
          href: 'kas-suite',
          badge: 'جناح كاس',
          exclusiveToCompany: 'KAS',
        ),
        ErpSidebarItem(
          id: 'tenders-boq',
          title: '٣. منافسات اعتماد وجداول الكميات (BOQ)',
          icon: Icons.gavel_rounded,
          href: 'tenders-boq',
          exclusiveToCompany: 'KAS',
        ),
        ErpSidebarItem(id: 'iam-matrix', title: '٤. مصفوفة الصلاحيات وعزل الأقسام (IAM)', icon: Icons.security_rounded, href: 'iam-matrix'),
        ErpSidebarItem(id: 'reports', title: '٥. مركز التقارير الإدارية والمالية', icon: Icons.pie_chart_rounded, href: 'reports'),
        ErpSidebarItem(id: 'settings', title: '٦. إعدادات النظام والمزامنة الخلفية', icon: Icons.settings_rounded, href: 'settings'),
      ],
    ),
  ];

  /// Initial Tenant-Scoped Operational Records
  static List<ErpOperationalRecord> buildInitialRecords() {
    return const [
      // SAF Records
      ErpOperationalRecord(
        id: 'MSN-2026-8841',
        companyId: 'SAF',
        moduleKey: 'contracts',
        title: 'عقد استقدام مساند #MSN-2026-8841 — الفلبين',
        subtitle: 'العميل: عبدالله بن محمد العتيبي • المرحلة: التفييز وإصدار التذكرة (5/8)',
        status: 'ساري • ضمان 90 يوم',
        badgeText: 'موثق بمساند',
        amountOrMetric: '17,250 ر.س',
        updatedAt: 'منذ 5 دقائق',
      ),
      ErpOperationalRecord(
        id: 'MSN-2026-8842',
        companyId: 'SAF',
        moduleKey: 'contracts',
        title: 'عقد استقدام مساند #MSN-2026-8842 — أوغندا',
        subtitle: 'العميل: فهد بن عبدالعزيز الشمري • المرحلة: وصول للمطار (7/8)',
        status: 'وصول مطار الملك خالد',
        badgeText: 'تحت الضمان (82 يوم متبقي)',
        amountOrMetric: '9,890 ر.س',
        updatedAt: 'منذ 18 دقيقة',
      ),
      ErpOperationalRecord(
        id: 'ORD-SAF-409',
        companyId: 'SAF',
        moduleKey: 'orders',
        title: 'طلب حجز سيرة ذاتية #ORD-SAF-409 — عاملة منزلية',
        subtitle: 'حجز مؤقت 15 دقيقة • بانتظار سداد دفعة التعاقد وإصدار سند القبض',
        status: 'جديد • SLA نشط',
        badgeText: 'حجز 15 دقيقة',
        amountOrMetric: '16,500 ر.س',
        updatedAt: 'الآن',
      ),
      // YAQ Records
      ErpOperationalRecord(
        id: 'RNT-YAQ-512',
        companyId: 'YAQ',
        moduleKey: 'rent',
        title: 'عقد تأجير شهري مرن #RNT-YAQ-512 — باقة 3 أشهر',
        subtitle: 'العميل: شركة المدار للضيافة • السائق: سليم خان • رمز التسليم OTP: 4829',
        status: 'نشط تحت التشغيل',
        badgeText: 'تم التحقق OTP',
        amountOrMetric: '8,400 ر.س',
        updatedAt: 'منذ 10 دقائق',
      ),
      ErpOperationalRecord(
        id: 'RNT-YAQ-519',
        companyId: 'YAQ',
        moduleKey: 'rent',
        title: 'عقد تأجير بالساعة #RNT-YAQ-519 — الفترة الصباحية',
        subtitle: 'الحي: الملقا - الرياض • المسار التشغيلي: نشط عبر الأسطول',
        status: 'جاري التسليم',
        badgeText: 'توجيه ميداني',
        amountOrMetric: '450 ر.س',
        updatedAt: 'منذ 22 دقيقة',
      ),
      // TOP Records
      ErpOperationalRecord(
        id: 'ATS-TOP-901',
        companyId: 'TOP',
        moduleKey: 'cvs',
        title: 'مرشح تنفيذي #ATS-TOP-901 — مهندس نظم سحابية أول',
        subtitle: 'تقييم لجنة الفرز الفني: 94/100 • الخبرة: 8 سنوات • جاهز للمقابلة النهائية',
        status: 'مرشح معتمد للتعاقد',
        badgeText: 'تقييم 94%',
        amountOrMetric: '28,000 ر.س/شهر',
        updatedAt: 'منذ 12 دقيقة',
      ),
      // KAS Records
      ErpOperationalRecord(
        id: 'ETM-KAS-770',
        companyId: 'KAS',
        moduleKey: 'kas',
        title: 'منافسة منصة اعتماد #ETM-KAS-770 — تشغيل وصيانة المرافق',
        subtitle: 'جدول الكميات BOQ: 42 بنداً مسعراً • الضمان الابتدائي البنكي: 5% جاهز',
        status: 'معتمد للترسية',
        badgeText: 'هامش ربح 18.4%',
        amountOrMetric: '4,850,000 ر.س',
        updatedAt: 'منذ 8 دقائق',
      ),
      ErpOperationalRecord(
        id: 'ETM-KAS-774',
        companyId: 'KAS',
        moduleKey: 'kas',
        title: 'منافسة اعتماد #ETM-KAS-774 — توريد كوادر تشغيلية متخصصة',
        subtitle: 'الضمان النهائي: 10% • مطابقة التسعير المالي: معتمدة',
        status: 'قيد المراجعة الفنية',
        badgeText: 'ضمان بنكي ساري',
        amountOrMetric: '2,190,000 ر.س',
        updatedAt: 'منذ 35 دقيقة',
      ),
      // DAR Shelter Records
      ErpOperationalRecord(
        id: 'SHL-DAR-302',
        companyId: 'DAR',
        moduleKey: 'shelter',
        title: 'سجل إيواء وتسكين #SHL-DAR-302 — الجناح B • غرفة 204',
        subtitle: 'الفحص الطبي: مكتمل • الإعاشة اليومية: معتمدة • الحالة: بانتظار رحلة المغادرة',
        status: 'داخل الإيواء • ممتثل HRSD',
        badgeText: 'سرير B-204-2',
        amountOrMetric: 'امتثال 100%',
        updatedAt: 'منذ 14 دقيقة',
      ),
      // Finance & ZATCA Records
      ErpOperationalRecord(
        id: 'ZAT-2026-9920',
        companyId: 'SAF',
        moduleKey: 'finance',
        title: 'فاتورة ضريبية إلكترونية ZATCA #ZAT-2026-9920 (Phase 2)',
        subtitle: 'UBL 2.1 XML • التوقيع التشفيري ECDSA • الهاش التسلسلي PIH موثق في سماك',
        status: 'معتمدة من فاتورة ZATCA',
        badgeText: 'QR + PIH Verified',
        amountOrMetric: '17,250 ر.س (شامل 15% VAT)',
        updatedAt: 'منذ 6 دقائق',
      ),
    ];
  }
}
