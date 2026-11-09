/**
 * aiToolRegistry.ts
 * Central registry of all tools (functions) available for Faris & Noura AI-driven execution
 * across all 9 corporate departments and 5 companies.
 * Each tool declares its name, description (Arabic), required parameters,
 * company scope, department scope, required permissions, and risk level.
 *
 * SECURITY: All tools are descriptive metadata only — actual execution is in aiToolExecutor.ts.
 */

export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ToolParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  description: string;
  required: boolean;
  enumValues?: string[];
}

export interface AiToolDefinition {
  /** Unique tool identifier (snake_case) */
  id: string;
  /** Arabic display name shown in confirmation modal */
  nameAr: string;
  /** Arabic description for the LLM system prompt */
  descriptionAr: string;
  /** Which companies can use this tool (empty = all companies) */
  companyScope: string[];
  /** Which corporate departments use this tool primarily */
  departmentScope?: string[];
  /** Required IAM permission key (checked before execution) */
  requiredPermission: string;
  /** Risk level determines confirmation UI severity */
  riskLevel: ToolRiskLevel;
  /** Parameter schema for structured extraction */
  parameters: ToolParameterSchema[];
  /** Category for grouping in UI */
  category: 'finance' | 'hr' | 'operations' | 'shelter' | 'recruitment' | 'crm' | 'general';
  /** Whether this tool modifies data (vs. read-only) */
  isMutating: boolean;
}

/**
 * Master Tool Registry (22 Enterprise Departmental Tools)
 * All tools that Faris & Noura can invoke to help employees execute their daily tasks.
 */
export const AI_TOOL_REGISTRY: AiToolDefinition[] = [
  // ═══════════════════════════════════════════════════════════
  //  1. FINANCE & SMACC ACCOUNTING DEPARTMENT (قسم المحاسبة وسماك)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'create_invoice',
    nameAr: 'إنشاء فاتورة ضريبية إلكترونية (ZATCA)',
    descriptionAr: 'إنشاء فاتورة إلكترونية مشفرة جديدة ممتثلة لمعايير ZATCA المرحلة الثانية وحفظها في دفتر الشركة وتوليد قيدها المحاسبي.',
    companyScope: [],
    departmentScope: ['finance', 'executive', 'crm'],
    requiredPermission: 'finance.invoice.create',
    riskLevel: 'medium',
    category: 'finance',
    isMutating: true,
    parameters: [
      { name: 'customer_name', type: 'string', description: 'اسم العميل أو الجهة المستفيدة', required: true },
      { name: 'amount', type: 'number', description: 'المبلغ بالريال السعودي', required: true },
      { name: 'description', type: 'string', description: 'وصف الخدمة أو البند الضريبي', required: true },
      { name: 'vat_inclusive', type: 'boolean', description: 'هل المبلغ شامل ضريبة القيمة المضافة 15%؟', required: false },
    ],
  },
  {
    id: 'create_journal_entry',
    nameAr: 'إنشاء قيد يومية مزدوج متوازن',
    descriptionAr: 'تسجيل قيد يومية محاسبي مزدوج (مدين/دائن) في دفتر الأستاذ العام للشركة وفق المعايير المحاسبية.',
    companyScope: [],
    departmentScope: ['finance', 'executive'],
    requiredPermission: 'finance.journal.create',
    riskLevel: 'medium',
    category: 'finance',
    isMutating: true,
    parameters: [
      { name: 'description', type: 'string', description: 'بيان وشرح القيد المحاسبي', required: true },
      { name: 'amount', type: 'number', description: 'مبلغ القيد المتوازن بالريال السعودي', required: true },
      { name: 'debit_account', type: 'string', description: 'الحساب المدين (مثال: 110102 مصرف الراجحي)', required: false },
      { name: 'credit_account', type: 'string', description: 'الحساب الدائن (مثال: 410101 إيرادات التشغيل)', required: false },
    ],
  },
  {
    id: 'create_receipt_or_payment_voucher',
    nameAr: 'إصدار سند قبض أو سند صرف مالي',
    descriptionAr: 'إصدار وحفظ سند قبض (تحصيل من عميل) أو سند صرف (دفعة لمورد/مصروف) في خزينة وبنوك الشركة.',
    companyScope: [],
    departmentScope: ['finance', 'executive'],
    requiredPermission: 'finance.voucher.create',
    riskLevel: 'medium',
    category: 'finance',
    isMutating: true,
    parameters: [
      { name: 'voucher_type', type: 'string', description: 'نوع السند', required: true, enumValues: ['سند قبض', 'سند صرف'] },
      { name: 'party_name', type: 'string', description: 'اسم المستفيد أو العميل', required: true },
      { name: 'amount', type: 'number', description: 'المبلغ بالريال السعودي', required: true },
      { name: 'description', type: 'string', description: 'البيان / سبب الصرف أو القبض', required: true },
    ],
  },
  {
    id: 'approve_payment_voucher',
    nameAr: 'اعتماد سند صرف مالي',
    descriptionAr: 'اعتماد سند صرف مالي بعد التحقق من الرصيد والصلاحيات وترحيله لدفتر الأستاذ.',
    companyScope: [],
    departmentScope: ['finance', 'executive'],
    requiredPermission: 'finance.voucher.approve',
    riskLevel: 'high',
    category: 'finance',
    isMutating: true,
    parameters: [
      { name: 'voucher_number', type: 'string', description: 'رقم سند الصرف المراد اعتماده', required: true },
      { name: 'notes', type: 'string', description: 'ملاحظات الاعتماد (اختياري)', required: false },
    ],
  },
  {
    id: 'get_cash_balance',
    nameAr: 'استعراض رصيد السيولة والدفتر المالي',
    descriptionAr: 'عرض رصيد السيولة النقدية الحالي لحسابات البنوك والخزائن وملخص الفواتير والقيود للشركة.',
    companyScope: [],
    departmentScope: ['finance', 'executive'],
    requiredPermission: 'finance.balance.read',
    riskLevel: 'low',
    category: 'finance',
    isMutating: false,
    parameters: [
      { name: 'bank_name', type: 'string', description: 'اسم البنك (اختياري)', required: false },
    ],
  },
  {
    id: 'get_zatca_compliance_report',
    nameAr: 'تقرير امتثال الفوترة الإلكترونية ZATCA',
    descriptionAr: 'فحص جاهزية الفواتير المشفرة وشهادات الأمان والتكامل مع منصة فاتورة (ZATCA Phase 2).',
    companyScope: [],
    departmentScope: ['finance', 'executive'],
    requiredPermission: 'finance.zatca.read',
    riskLevel: 'low',
    category: 'finance',
    isMutating: false,
    parameters: [],
  },

  // ═══════════════════════════════════════════════════════════
  //  2. RECRUITMENT & MUSANED DEPARTMENT (قسم الاستقدام ومساند)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'create_recruitment_contract',
    nameAr: 'تسجيل عقد استقدام مساند جديد',
    descriptionAr: 'إنشاء وتوثيق عقد استقدام جديد عبر منصة مساند مع توليد القيد المحاسبي والفاتورة الضريبية تلقائياً.',
    companyScope: [],
    departmentScope: ['recruitment', 'executive'],
    requiredPermission: 'saf.contract.create',
    riskLevel: 'medium',
    category: 'recruitment',
    isMutating: true,
    parameters: [
      { name: 'client_name', type: 'string', description: 'اسم العميل / صاحب العمل', required: true },
      { name: 'nationality', type: 'string', description: 'جنسية الكادر المطلوب (مثال: الفلبين، إندونيسيا، أوغندا)', required: true },
      { name: 'profession', type: 'string', description: 'المهنة (مثال: عاملة منزلية، سائق خاص)', required: true },
      { name: 'amount', type: 'number', description: 'قيمة العقد شاملة الضريبة بالريال', required: true },
    ],
  },
  {
    id: 'check_contract_status',
    nameAr: 'استعراض وتدقيق حالة عقود الاستقدام',
    descriptionAr: 'البحث عن عقد استقدام عبر مساند بالرقم أو اسم العميل وفحص العقود المتأخرة في السفارة أو التأشيرة.',
    companyScope: [],
    departmentScope: ['recruitment', 'crm', 'executive'],
    requiredPermission: 'saf.contract.read',
    riskLevel: 'low',
    category: 'recruitment',
    isMutating: false,
    parameters: [
      { name: 'contract_number', type: 'string', description: 'رقم العقد (اختياري)', required: false },
      { name: 'customer_name', type: 'string', description: 'اسم العميل / الكفيل (اختياري)', required: false },
    ],
  },
  {
    id: 'schedule_musaned_reminder',
    nameAr: 'جدولة تذكير وتنبيه عقود مساند المتأخرة',
    descriptionAr: 'إنشاء تذكير آلي للعقود المتأخرة في مراحل السفارة أو التأشيرة أو التفويض لتفادي غرامات التأخير.',
    companyScope: [],
    departmentScope: ['recruitment', 'executive'],
    requiredPermission: 'saf.reminder.create',
    riskLevel: 'low',
    category: 'recruitment',
    isMutating: true,
    parameters: [
      { name: 'days_threshold', type: 'number', description: 'عدد الأيام المتأخرة (مثال: 45)', required: true },
      { name: 'stage', type: 'string', description: 'المرحلة المستهدفة', required: false, enumValues: ['السفارة', 'التأشيرة', 'الحجز', 'الوصول', 'الكل'] },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  3. RENTAL & FLEXIBLE OPERATIONS DEPARTMENT (قسم التأجير والتشغيل)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'create_rent_contract',
    nameAr: 'إنشاء عقد تأجير وتشغيل مرن',
    descriptionAr: 'تسجيل عقد تأجير تشغيلي جديد (بالساعة أو شهري أو سنوي) مع حساب الضريبة وتوليد القيد المحاسبي آلياً.',
    companyScope: [],
    departmentScope: ['rental', 'recruitment', 'executive'],
    requiredPermission: 'rental.contract.create',
    riskLevel: 'medium',
    category: 'operations',
    isMutating: true,
    parameters: [
      { name: 'client_name', type: 'string', description: 'اسم العميل أو الجهة المستأجرة', required: true },
      { name: 'worker_name', type: 'string', description: 'اسم الكادر / العاملة / السائق', required: false },
      { name: 'package_type', type: 'string', description: 'نوع الباقة (شهري / سنوي / ساعات)', required: false, enumValues: ['باقة شهرية', 'باقة ربع سنوية', 'باقة سنوية', 'باقة بالساعة'] },
      { name: 'monthly_rate', type: 'number', description: 'قيمة العقد بالريال السعودي', required: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  4. ATS, CV BANK & FOREIGN AGENCIES (قسم التوظيف والسير الذاتية)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'create_candidate_cv',
    nameAr: 'إضافة سيرة ذاتية جديدة لبنك المرشحين (ATS)',
    descriptionAr: 'تسجيل مرشح أو عاملة جديدة في بنك السير الذاتية وربطها بالمكتب الخارجي لتصبح متاحة للتعاقد.',
    companyScope: [],
    departmentScope: ['ats', 'recruitment', 'executive'],
    requiredPermission: 'ats.cv.create',
    riskLevel: 'low',
    category: 'recruitment',
    isMutating: true,
    parameters: [
      { name: 'candidate_name', type: 'string', description: 'اسم المرشح / العاملة', required: true },
      { name: 'nationality', type: 'string', description: 'الجنسية', required: true },
      { name: 'profession', type: 'string', description: 'المهنة', required: true },
      { name: 'salary', type: 'number', description: 'الراتب الشهري بالريال السعودي', required: false },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  5. HR, WPS PAYROLL & MONITORING (قسم الموارد البشرية والرواتب)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'get_expiring_iqamas',
    nameAr: 'فحص الإقامات والعقود المنتهية قريباً',
    descriptionAr: 'عرض قائمة الموظفين والعمالة التي تنتهي إقاماتها خلال فترة محددة بالأيام للبدء بتجديدها.',
    companyScope: [],
    departmentScope: ['hr', 'executive'],
    requiredPermission: 'hr.iqama.read',
    riskLevel: 'low',
    category: 'hr',
    isMutating: false,
    parameters: [
      { name: 'days_ahead', type: 'number', description: 'عدد الأيام المتبقية (مثال: 30 يوماً)', required: true },
    ],
  },
  {
    id: 'calculate_eos_benefits',
    nameAr: 'حاسبة مستحقات نهاية الخدمة والرواتب (نظام العمل)',
    descriptionAr: 'حساب مكافأة نهاية الخدمة ومستحقات الإجازات للموظف بدقة وفق المواد 84 و85 من نظام العمل السعودي.',
    companyScope: [],
    departmentScope: ['hr', 'finance', 'executive'],
    requiredPermission: 'hr.eos.calculate',
    riskLevel: 'low',
    category: 'hr',
    isMutating: false,
    parameters: [
      { name: 'monthly_salary', type: 'number', description: 'الراتب الشهري الإجمالي بالريال', required: true },
      { name: 'years_of_service', type: 'number', description: 'عدد سنوات الخدمة', required: true },
      { name: 'reason', type: 'string', description: 'سبب انتهاء العلاقة العمالية', required: false, enumValues: ['انتهاء العقد / اتفاق الطرفين', 'استقالة الموظف'] },
    ],
  },
  {
    id: 'get_employee_monitoring_summary',
    nameAr: 'استعراض تقرير أداء وسرعة الموظفين',
    descriptionAr: 'عرض ملخص مؤشرات أداء وسرعة إنجاز الموظفين (Velocity)، ساعات العمل الفعلي، ونسب الخمول ونبض الفريق.',
    companyScope: [],
    departmentScope: ['hr', 'executive'],
    requiredPermission: 'hr.monitoring.read',
    riskLevel: 'low',
    category: 'hr',
    isMutating: false,
    parameters: [
      { name: 'period', type: 'string', description: 'الفترة المستهدفة', required: false, enumValues: ['today', 'this_week', 'this_month'] },
      { name: 'department', type: 'string', description: 'القسم أو الفرع (اختياري)', required: false },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  6. CRM, CLIENTS & COMPLAINTS (قسم المبيعات وخدمة العملاء والشكاوى)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'create_client_record',
    nameAr: 'تسجيل عميل جديد في قاعدة البيانات (CRM)',
    descriptionAr: 'إضافة عميل جديد (أفراد أو شركات) إلى سجل العملاء المعتمد مع تفعيل ملفه المالي.',
    companyScope: [],
    departmentScope: ['crm', 'recruitment', 'rental', 'executive'],
    requiredPermission: 'crm.client.create',
    riskLevel: 'low',
    category: 'crm',
    isMutating: true,
    parameters: [
      { name: 'client_name', type: 'string', description: 'اسم العميل الرباعي أو اسم المنشأة', required: true },
      { name: 'phone', type: 'string', description: 'رقم الجوال (مثال: 0501234567)', required: true },
      { name: 'city', type: 'string', description: 'المدينة (مثال: الرياض، الدمام، جدة)', required: false },
      { name: 'client_type', type: 'string', description: 'تصنيف العميل', required: false, enumValues: ['أفراد VIP', 'أفراد', 'شركات B2B', 'قطاع حكومي'] },
    ],
  },
  {
    id: 'create_complaint_ticket',
    nameAr: 'فتح تذكرة شكوى أو مطالبة عميل (SLA)',
    descriptionAr: 'تسجيل شكوى عميل أو طلب استبدال/تعويض مع تعيين أولوية المعالجة ومؤقت اتفاقية مستوى الخدمة SLA.',
    companyScope: [],
    departmentScope: ['crm', 'shelter', 'recruitment', 'executive'],
    requiredPermission: 'crm.complaint.create',
    riskLevel: 'medium',
    category: 'crm',
    isMutating: true,
    parameters: [
      { name: 'client_name', type: 'string', description: 'اسم العميل مقدم الشكوى', required: true },
      { name: 'subject', type: 'string', description: 'موضوع وتفاصيل الشكوى', required: true },
      { name: 'priority', type: 'string', description: 'درجة الأهمية', required: false, enumValues: ['عاجلة جداً', 'مرتفعة', 'متوسطة'] },
    ],
  },
  {
    id: 'draft_official_message',
    nameAr: 'صياغة خطاب رسمي أو رد احترافي للعميل',
    descriptionAr: 'صياغة رسالة واتساب رسمية، أو رد على شكوى عميل، أو خطاب تفويض، أو محضر استلام وتسليم جاهز للنسخ.',
    companyScope: [],
    departmentScope: ['crm', 'hr', 'recruitment', 'rental', 'tenders', 'shelter', 'executive'],
    requiredPermission: 'system.draft',
    riskLevel: 'low',
    category: 'crm',
    isMutating: false,
    parameters: [
      { name: 'recipient_name', type: 'string', description: 'اسم المرسل إليه (العميل / الجهة / الموظف)', required: true },
      { name: 'topic', type: 'string', description: 'موضوع الخطاب أو الرسالة', required: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  7. SHELTER & CARE CENTERS (قسم الإيواء والتسكين — بقيادة نُورة)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'register_shelter_inmate',
    nameAr: 'تسكين وتسجيل نزيلة جديدة بمركز الإيواء',
    descriptionAr: 'تسجيل نزيلة جديدة في مركز الإيواء وتخصيص الغرفة والسرير وتفعيل ملف المتابعة الصحية والغذائية.',
    companyScope: [],
    departmentScope: ['shelter', 'executive'],
    requiredPermission: 'shelter.inmate.create',
    riskLevel: 'high',
    category: 'shelter',
    isMutating: true,
    parameters: [
      { name: 'full_name', type: 'string', description: 'الاسم الكامل للنزيلة', required: true },
      { name: 'nationality', type: 'string', description: 'الجنسية', required: true },
      { name: 'room_number', type: 'number', description: 'رقم الغرفة المخصصة', required: true },
      { name: 'case_type', type: 'string', description: 'نوع الحالة', required: false, enumValues: ['إيواء مؤقت', 'نقل خدمات', 'ترحيل', 'حالة طوارئ'] },
    ],
  },
  {
    id: 'get_shelter_occupancy',
    nameAr: 'استعراض نسبة إشغال المركز والأسرة الشاغرة',
    descriptionAr: 'عرض نسبة الإشغال الحالية لمركز الإيواء مع عدد الأسرة المتاحة والمشغولة.',
    companyScope: [],
    departmentScope: ['shelter', 'executive'],
    requiredPermission: 'shelter.occupancy.read',
    riskLevel: 'low',
    category: 'shelter',
    isMutating: false,
    parameters: [],
  },
  {
    id: 'get_shelter_daily_status',
    nameAr: 'تقرير الإيواء والرعاية الميداني اليومي (HRSD)',
    descriptionAr: 'استعراض تقرير الإيواء الشامل لليوم: نسبة إشغال الأسرة، عدد الوجبات المقدمة، الحالات الطبية، والمشرفات المناوبات.',
    companyScope: [],
    departmentScope: ['shelter', 'executive'],
    requiredPermission: 'shelter.status.read',
    riskLevel: 'low',
    category: 'shelter',
    isMutating: false,
    parameters: [],
  },
  {
    id: 'calculate_sponsorship_transfer',
    nameAr: 'حساب تسوية نقل الخدمات وفترة التجربة',
    descriptionAr: 'حساب المبلغ المسترد للكفيل السابق حسب مدة العقد المستهلكة ورسوم التنازل وفترة التجربة المقررة (7-15 يوماً).',
    companyScope: [],
    departmentScope: ['shelter', 'recruitment', 'finance', 'executive'],
    requiredPermission: 'shelter.transfer.calculate',
    riskLevel: 'low',
    category: 'shelter',
    isMutating: false,
    parameters: [
      { name: 'total_cost', type: 'number', description: 'التكلفة الإجمالية الأصلية للاستقدام بالريال', required: true },
      { name: 'months_worked', type: 'number', description: 'عدد الأشهر المنقضية من العقد', required: true },
    ],
  },
  {
    id: 'check_inmate_medical_status',
    nameAr: 'فحص التقرير الطبي وجناح العزل بمركز الإيواء',
    descriptionAr: 'الاستعلام عن حالات الفحص الطبي للنزيلات، العلامات الحيوية، والحالات الموجودة في جناح العزل المؤقت.',
    companyScope: [],
    departmentScope: ['shelter', 'executive'],
    requiredPermission: 'shelter.medical.read',
    riskLevel: 'low',
    category: 'shelter',
    isMutating: false,
    parameters: [
      { name: 'inmate_name', type: 'string', description: 'اسم النزيلة (اختياري)', required: false },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  8. KAS — TENDERS & BOQ DEPARTMENT (قسم المنافسات وجداول الكميات)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'update_tender_status',
    nameAr: 'تحديث حالة منافسة حكومية (اعتماد)',
    descriptionAr: 'تحديث حالة منافسة حكومية على منصة اعتماد (تحت الدراسة، تقدمنا بعرض، تمت الترسية، لم يتم الترسية).',
    companyScope: [],
    departmentScope: ['tenders', 'executive'],
    requiredPermission: 'kas.tender.update',
    riskLevel: 'medium',
    category: 'operations',
    isMutating: true,
    parameters: [
      { name: 'tender_id', type: 'string', description: 'رقم المنافسة (مثال: 2326-68993)', required: true },
      { name: 'new_status', type: 'string', description: 'الحالة الجديدة', required: true, enumValues: ['تحت الدراسة', 'تقدمنا بعرض', 'تمت الترسية', 'لم يتم الترسية', 'ملغاة'] },
    ],
  },
  {
    id: 'generate_boq_pricing',
    nameAr: 'تسعير بند في جدول الكميات (BOQ)',
    descriptionAr: 'إضافة أو تسعير بند في جدول الكميات BOQ لمنافسة كاس مع حساب الإجمالي والضريبة والتفقيط تلقائياً.',
    companyScope: [],
    departmentScope: ['tenders', 'finance', 'executive'],
    requiredPermission: 'kas.boq.edit',
    riskLevel: 'medium',
    category: 'operations',
    isMutating: true,
    parameters: [
      { name: 'item_description', type: 'string', description: 'وصف البند (مثال: توريد 500 كرسي مكتبي)', required: true },
      { name: 'quantity', type: 'number', description: 'الكمية', required: true },
      { name: 'unit_price', type: 'number', description: 'سعر الوحدة بالريال السعودي', required: true },
      { name: 'unit', type: 'string', description: 'وحدة القياس (قطعة، متر، شهر...)', required: false },
    ],
  },
  {
    id: 'search_etmad_tenders',
    nameAr: 'البحث في منافسات منصة اعتماد',
    descriptionAr: 'البحث في قاعدة بيانات منافسات منصة اعتماد المرصودة لكاس (2,651+ منافسة).',
    companyScope: [],
    departmentScope: ['tenders', 'executive'],
    requiredPermission: 'kas.tender.read',
    riskLevel: 'low',
    category: 'operations',
    isMutating: false,
    parameters: [
      { name: 'query', type: 'string', description: 'كلمة البحث في عنوان أو تفاصيل المنافسة', required: true },
      { name: 'category', type: 'string', description: 'تصنيف المنافسة', required: false },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  //  9. GENERAL & EXECUTIVE NAVIGATION (التنقل العام والقيادة)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'navigate_to_page',
    nameAr: 'الانتقال المباشر إلى شاشة أو قسم',
    descriptionAr: 'التنقل مباشرة إلى صفحة أو قسم محدد في النظام (مثال: لوحة المؤشرات، المحاسبة، الفوترة، مراكز الإيواء).',
    companyScope: [],
    departmentScope: ['finance', 'recruitment', 'rental', 'ats', 'hr', 'crm', 'shelter', 'tenders', 'executive'],
    requiredPermission: 'system.navigate',
    riskLevel: 'low',
    category: 'general',
    isMutating: false,
    parameters: [
      {
        name: 'page_key',
        type: 'string',
        description: 'مفتاح الصفحة المطلوبة',
        required: true,
        enumValues: [
          'dashboard',
          'smacc-accounting',
          'odoo-accounting',
          'ifrs-engine',
          'musaned-escrow',
          'kas-suite',
          'tenders-boq',
          'recruitment-contracts',
          'rent-contracts',
          'cvs',
          'shelter',
          'finance',
          'zatca',
          'group-command-center',
          'group-command',
          'hr',
          'clients',
          'complaints',
          'employee-monitoring',
          'iam',
          'iam-center',
        ],
      },
    ],
  },
];

/**
 * Get tools available for a specific company context.
 */
AI_TOOL_REGISTRY.push({
  id: 'approve_wps_payroll_run',
  nameAr: 'اعتماد مسير الرواتب وحماية الأجور WPS',
  descriptionAr: 'اعتماد مسير الرواتب الشهري وتجهيز ملف البنك SIF لمنصة مُدد وحماية الأجور WPS مع الترحيل المحاسبي.',
  companyScope: [],
  departmentScope: ['hr', 'finance', 'executive'],
  requiredPermission: 'hr.payroll.approve',
  riskLevel: 'high',
  category: 'hr',
  isMutating: true,
  parameters: [
    { name: 'payroll_month', type: 'string', description: 'شهر المسير بصيغة YYYY-MM', required: true },
    { name: 'employees_count', type: 'number', description: 'عدد الموظفين المشمولين بالمسير', required: false },
    { name: 'total_net_sar', type: 'number', description: 'إجمالي صافي الرواتب بالريال السعودي', required: false },
  ],
});

export function getToolsForCompany(companyId: string): AiToolDefinition[] {
  const cid = companyId.toUpperCase();
  return AI_TOOL_REGISTRY.filter(
    (tool) => tool.companyScope.length === 0 || cid === 'ALL' || tool.companyScope.includes(cid)
  );
}

/**
 * Get tools tailored for a specific employee's department.
 */
export function getToolsForDepartment(departmentId: string, companyId = 'all'): AiToolDefinition[] {
  const dept = (departmentId || 'executive').toLowerCase();
  const companyTools = getToolsForCompany(companyId);
  if (dept === 'executive') return companyTools;
  return companyTools.filter(
    (tool) => !tool.departmentScope || tool.departmentScope.includes(dept)
  );
}

/**
 * Find a tool definition by its ID.
 */
export function getToolById(toolId: string): AiToolDefinition | undefined {
  return AI_TOOL_REGISTRY.find((t) => t.id === toolId);
}

/**
 * Build an LLM-friendly tool description list for the system prompt.
 */
export function buildToolDescriptionsForLLM(companyId: string, departmentId?: string): string {
  const tools = departmentId
    ? getToolsForDepartment(departmentId, companyId)
    : getToolsForCompany(companyId);
  if (tools.length === 0) return '';

  const lines = tools.map((tool) => {
    const params = tool.parameters
      .map(
        (p) =>
          `    - ${p.name} (${p.type}${p.required ? ', مطلوب' : ', اختياري'}): ${p.description}${
            p.enumValues ? ` [القيم: ${p.enumValues.join(' | ')}]` : ''
          }`
      )
      .join('\n');

    return `• ${tool.id}: ${tool.descriptionAr}\n  المعاملات:\n${params || '    (بدون معاملات)'}`;
  });

  return `\n[الأدوات المتاحة للتنفيذ المباشر لمساعدة الموظف]\nإذا طلب الموظف تنفيذ إجراء محدد من القائمة التالية، أجب بتنسيق JSON دقيق كالتالي:
{"tool_call": {"id": "tool_id_here", "params": {"param1": "value1"}}}
لا تضع tool_call إلا إذا كان الموظف يطلب تنفيذ إجراء فعلي وليس مجرد سؤال. إذا كان السؤال استفسارياً فقط، أجب بنص عادي بدون tool_call.

الأدوات المتاحة:
${lines.join('\n\n')}`;
}
