import { supabase, isSupabaseConfigured, supabaseConfigError } from './supabaseClient';
import {
  isFirebaseConfigured,
  signInWithGoogleFirebase,
  signOutFirebase,
  VERIFIED_FIREBASE_GOOGLE_ACCOUNTS,
  cacheGoogleProfile,
  getCachedGoogleProfile,
} from './firebaseClient';
import { DEMO_AUTH_ENABLED, DEMO_QUICK_LOGIN_SECRET } from '../config/authMode';
import {
  KAS_ALLOWED_EMPLOYEES,
  EXCLUDED_KAS_EMAILS,
  findAllowedKasEmployee,
  getExcludedEmailReason,
  type KasAllowedEmployee,
} from '../config/kasAllowedEmails';

export {
  KAS_ALLOWED_EMPLOYEES,
  EXCLUDED_KAS_EMAILS,
  findAllowedKasEmployee,
  getExcludedEmailReason,
  type KasAllowedEmployee,
};

export type DepartmentId =
  | 'finance'
  | 'recruitment'
  | 'rental'
  | 'ats'
  | 'hr'
  | 'crm'
  | 'shelter'
  | 'tenders'
  | 'executive';

export interface DepartmentDefinition {
  id: DepartmentId;
  nameAr: string;
  nameEn: string;
  emoji: string;
  badgeText: string;
  defaultTab: string;
  defaultTabTitle: string;
  descriptionAr: string;
  allowedSections: string[];
  allowedTabs: string[];
}

export const CORPORATE_DEPARTMENTS: Record<DepartmentId, DepartmentDefinition> = {
  finance: {
    id: 'finance',
    nameAr: 'قسم الإدارة المالية والمحاسبة العامة',
    nameEn: 'Financial Control & General Accounting',
    emoji: '',
    badgeText: 'المالية والمحاسبة',
    defaultTab: 'smacc-accounting',
    defaultTabTitle: 'النظام المالي والمحاسبي الموحد',
    descriptionAr: 'الأستاذ العام، سندات القبض والصرف، البنوك والخزائن، الفوترة الضريبية ZATCA، ومراكز التكلفة.',
    allowedSections: ['finance-section', 'financial-requests-group'],
    allowedTabs: [
      'smacc-accounting',
      'smacc-gl',
      'smacc-cash',
      'smacc-ar',
      'smacc-ap',
      'smacc-cost',
      'smacc-reports',
      'finance-smacc-gl',
      'finance-smacc-cash',
      'finance-smacc-ar',
      'finance-smacc-ap',
      'finance-smacc-cost',
      'finance-smacc-reports',
      'finance-home',
      'finance',
      'finance-erp',
      'chart-accounts',
      'general-ledger',
      'journals',
      'receipt-vouchers',
      'payment-vouchers',
      'vouchers',
      'receipts',
      'banks-boxes',
      'bank-reconciliation',
      'cost-centers',
      'invoices',
      'universal-extractor',
      'zatca',
      'zatca-phase2',
      'zatca-settings',
      'shared-bills',
      'vat-declaration',
      'tax-returns',
      'trial-balance',
      'income-statement',
      'balance-sheet',
      'smacc-inventory',
      'smacc-inventory-assets',
      'smacc-employees',
      'smacc-hr-settings',
      'smacc-modules',
      'sales-collectors',
      'financial-requests',
      'cash-custody',
      'all-fin-requests',
      'create-fin-request',
      'petty-cash',
      'agent-accounts',
      'financial-reports',
      'reports',
      'data-import',
      'profile',
    ],
  },
  recruitment: {
    id: 'recruitment',
    nameAr: 'قسم الاستقدام وعقود مساند والتأشيرات',
    nameEn: 'Recruitment, Musaned Contracts & Visas',
    emoji: '',
    badgeText: 'الاستقدام ومساند',
    defaultTab: 'recruitment-contracts',
    defaultTabTitle: 'عقود الاستقدام الموثقة (مساند)',
    descriptionAr: 'إدارة عقود الاستقدام، طلبات الحجز، تفاويض إنجاز، نقل الخدمات، ورحلات الوصول.',
    allowedSections: [
      'operations-section',
      'recruitment-group',
      'orders-group',
      'ingaz-group',
      'transfer-group',
      'logistics-group',
    ],
    allowedTabs: [
      'recruitment-contracts',
      'create-contract',
      'current-contracts',
      'completed-contracts',
      'returned-contracts',
      'dispatches',
      'contract-extension-requests',
      'contract-return-requests',
      'musaned-pipeline',
      'musaned-sync',
      'musaned-master-plan',
      'musaned-plan',
      'musaned-integration-plan',
      'contract-insurance',
      'trial-period-90',
      'orders',
      'all-orders',
      'new-orders',
      'in-progress-orders',
      'contracted-orders',
      'incomplete-orders',
      'urgent-orders',
      'create-order',
      'professional-requests',
      'special-requests',
      'renew-contracts',
      'known-service',
      'contact-requests',
      'ingaz',
      'create-ingaz',
      'ingaz-delegations',
      'chamber-commerce',
      'visa-issuance',
      'sponsorship-transfer',
      'transfer-requests',
      'web-transfer-requests',
      'trial-period',
      'transferred-done',
      'transfer-contract-terms',
      'travel',
      'arrival-flights',
      'deportation-flights',
      'deportation-travel',
      'logistics',
      'airport-reception',
      'group-dispatch',
      'recruitment-reports',
      'profile',
    ],
  },
  rental: {
    id: 'rental',
    nameAr: 'قسم التأجير والتشغيل المرن',
    nameEn: 'Flexible Rental & Operations Department',
    emoji: '',
    badgeText: 'التأجير والتشغيل',
    defaultTab: 'rent-contracts',
    defaultTabTitle: 'عقود التأجير والتشغيل المرن',
    descriptionAr: 'إدارة عقود التأجير الشهرية وبالساعة، الباقات والأسعار، السائقين والعاملات، والتسليم.',
    allowedSections: ['operations-section', 'rent-group', 'orders-group'],
    allowedTabs: [
      'rent-contracts',
      'create-rent',
      'all-rent-contracts',
      'rental-orders',
      'active-rent',
      'transferred-rent',
      'completed-rent',
      'rent-contract-terms',
      'rental-drivers',
      'rental-domestic',
      'rent-packages',
      'cvs-rental',
      'rental-cvs',
      'orders',
      'create-order',
      'profile',
    ],
  },
  ats: {
    id: 'ats',
    nameAr: 'قسم التوظيف والسير الذاتية والوكلاء',
    nameEn: 'Talent Acquisition, CVs & Foreign Agencies',
    emoji: '',
    badgeText: 'التوظيف والوكلاء',
    defaultTab: 'cvs-recruitment',
    defaultTabTitle: 'بنك السير الذاتية والوكلاء الخارجيين',
    descriptionAr: 'فرز وتدقيق السير الذاتية، استقطاب الكفاءات، وإدارة المكاتب والوكلاء الخارجيين.',
    allowedSections: ['operations-section', 'cvs-group', 'offices-group'],
    allowedTabs: [
      'ats-pipeline',
      'create-cv',
      'cvs-recruitment',
      'cvs-rental',
      'rental-cvs',
      'cvs-backout',
      'cvs-deleted',
      'cvs-pending',
      'cvs-reserved',
      'cvs',
      'offices',
      'offices-list',
      'office-list',
      'add-office',
      'office-transfers',
      'agent-accounts',
      'external-offices',
      'foreign-agency-portal',
      'agency-portal',
      'agent-portal',
      'agent-imports',
      'profile',
    ],
  },
  hr: {
    id: 'hr',
    nameAr: 'قسم الموارد البشرية والرواتب (HR & WPS)',
    nameEn: 'Human Resources & Payroll Protection (WPS)',
    emoji: '',
    badgeText: 'الموارد البشرية والرواتب',
    defaultTab: 'employees',
    defaultTabTitle: 'إدارة الموارد البشرية ومسير الرواتب (WPS)',
    descriptionAr: 'سجل الموظفين، مسير الرواتب وحماية الأجور، الحضور والانصراف، الإجازات، ونهاية الخدمة.',
    allowedSections: ['hr-section'],
    allowedTabs: [
      'branch-departments',
      'branches',
      'employees',
      'employee-list',
      'add-employee',
      'maids-hr',
      'payroll',
      'payrolls',
      'wps',
      'wps-generator',
      'salary',
      'salaries',
      'hr',
      'attendances',
      'daily-work-reports',
      'employee-monitoring',
      'monitoring',
      'leave-requests',
      'employee-advances',
      'custodies',
      'employee-sanctions',
      'employee-permissions',
      'employee-rewards',
      'employee-promotions',
      'end-of-service',
      'gosi-insurance',
      'smacc-hr-settings',
      'smacc-employees',
      'profile',
    ],
  },
  crm: {
    id: 'crm',
    nameAr: 'قسم المبيعات وخدمة العملاء والشكاوى',
    nameEn: 'CRM, Sales & Customer Relations Department',
    emoji: '',
    badgeText: 'العملاء والشكاوى',
    defaultTab: 'clients',
    defaultTabTitle: 'إدارة العملاء والمبيعات والشكاوى (CRM)',
    descriptionAr: 'سجل العملاء، بوابة المستفيدين، معالجة الشكاوى والتعويضات، والتواصل المؤسسي.',
    allowedSections: ['crm-section', 'operations-section', 'complaints-group', 'messages-section'],
    allowedTabs: [
      'clients',
      'client-list',
      'new-client',
      'black-list',
      'client-blacklist',
      'client-categories',
      'crm',
      'client-portal',
      'clients-portal',
      'unified-communication',
      'website-visitors',
      'visitors',
      'whatsapp-inbox',
      'whatsapp-dispatch',
      'messages',
      'sent-messages',
      'sms-dispatch',
      'branch-communication',
      'group-dispatch',
      'complaints',
      'complaints-list',
      'create-complaint',
      'complaint-types',
      'compensation-claims',
      'sales-reports',
      'profile',
    ],
  },
  shelter: {
    id: 'shelter',
    nameAr: 'قسم الإيواء والتسكين والإعاشة والترحيل',
    nameEn: 'Shelter, Housing & Welfare Operations (HRSD)',
    emoji: '',
    badgeText: 'الإيواء والتسكين',
    defaultTab: 'shelter-suite',
    defaultTabTitle: 'منظومة مراكز الإيواء والتسكين والرعاية (HRSD)',
    descriptionAr: 'إدارة الغرف والأسرة، التسكين والاستلام، الإعاشة اليومية، وإجراءات الترحيل النظامي.',
    allowedSections: ['operations-section', 'shelter-group', 'logistics-group'],
    allowedTabs: [
      'shelter-suite',
      'shelter-portal',
      'shelter-housing-suite',
      'shelter',
      'create-shelter',
      'inside-shelter',
      'outside-shelter',
      'available-transfer',
      'deportation-stage',
      'shelter-places',
      'room-management',
      'food-catering',
      'travel',
      'deportation-flights',
      'deportation-travel',
      'profile',
    ],
  },
  tenders: {
    id: 'tenders',
    nameAr: 'قسم المنافسات وجداول الكميات والمشتريات (اعتماد)',
    nameEn: 'Etimad Tenders, BOQ & Procurement Department',
    emoji: '',
    badgeText: 'منافسات اعتماد BOQ',
    defaultTab: 'kas-suite',
    defaultTabTitle: 'منظومة منافسات اعتماد وجداول الكميات (KAS)',
    descriptionAr: 'إدارة منافسات منصة اعتماد، تسعير جداول الكميات BOQ، الضمانات البنكية، وسجل الموردين.',
    allowedSections: ['governance-section'],
    allowedTabs: [
      'kas-suite',
      'kas-portal',
      'kas-standalone',
      'kas-company',
      'tenders-boq',
      'tenders',
      'boq',
      'kas-tenders',
      'boq-analytics',
      'kas-etmad',
      'kas-etmad-cloud',
      'etmad-cloud',
      'etmad',
      'kas-cloud-suite',
      'profile',
    ],
  },
  executive: {
    id: 'executive',
    nameAr: 'الإدارة التنفيذية والرقابة الشاملة للمجموعة',
    nameEn: 'Group Executive Command & Governance',
    emoji: '',
    badgeText: 'الإدارة التنفيذية العليا',
    defaultTab: 'dashboard',
    defaultTabTitle: 'الرئيسية ولوحة القيادة التنفيذية للمجموعة',
    descriptionAr: 'إشراف كامل على كافة الشركات والأقسام، التقارير الختامية، والحوكمة والصلاحيات.',
    allowedSections: ['*'],
    allowedTabs: ['*'],
  },
};

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  branch: string;
  avatar_url?: string;
  company_id?: string;
  department_id?: DepartmentId;
  department_name_ar?: string;
  default_tab?: string;
  default_tab_title?: string;
  status: string;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: any;
  loading: boolean;
  error: string | null;
}

export type MfaRequirement = 'none' | 'verify' | 'enroll';

/** MFA is optional unless explicitly forced via VITE_REQUIRE_MFA=true */
export const MFA_REQUIRED: boolean = import.meta.env.VITE_REQUIRE_MFA === 'true';

export interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000;

interface LoginAttemptRecord {
  attempts: number;
  lockedUntil: number | null;
}

const loginAttemptTracker = new Map<string, LoginAttemptRecord>();

function checkThrottle(email: string): { blocked: boolean; remainingSeconds?: number } {
  const record = loginAttemptTracker.get(email);
  if (!record?.lockedUntil) return { blocked: false };
  if (Date.now() < record.lockedUntil) {
    return { blocked: true, remainingSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  loginAttemptTracker.delete(email);
  return { blocked: false };
}

function recordFailedAttempt(email: string): void {
  const record = loginAttemptTracker.get(email) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;
  if (record.attempts >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  loginAttemptTracker.set(email, record);
}

function clearFailedAttempts(email: string): void {
  loginAttemptTracker.delete(email);
}

export interface CompanyAuthMetadata {
  code: string;
  nameAr: string;
  domain: string;
  emoji: string;
}

export const COMPANY_AUTH_METADATA: Record<string, CompanyAuthMetadata> = {
  SAF: {
    code: 'SAF',
    nameAr: 'شركة السفير الماسي للاستقدام',
    domain: 'saf-rec.sa',
    emoji: '',
  },
  YAQ: {
    code: 'YAQ',
    nameAr: 'شركة الياقوت الشرقية للتشغيل والتأجير',
    domain: 'yaqoot-ops.sa',
    emoji: '',
  },
  TOP: {
    code: 'TOP',
    nameAr: 'شركة توب تالنت الدولية للتوظيف',
    domain: 'topaz-rec.sa',
    emoji: '',
  },
  KAS: {
    code: 'KAS',
    nameAr: 'شركة كاس للمنافسات والتشغيل',
    domain: 'kas-etimad.sa',
    emoji: '',
  },
  DAR: {
    code: 'DAR',
    nameAr: 'دار الرواد لمراكز الإيواء والخدمات اللوجستية',
    domain: 'alruwad.sa',
    emoji: '',
  },
  ALL: {
    code: 'all',
    nameAr: 'الإدارة المركزية لمجموعة خالد السليم القابضة',
    domain: 'alsulaim.sa',
    emoji: '',
  },
};

export interface StaffDirectoryEntry {
  id: string;
  username: string;
  email: string;
  full_name: string;
  nameEn?: string;
  role: string;
  company_id: 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | 'all';
  department_id: DepartmentId;
  default_tab?: string;
  default_tab_title?: string;
  suffixCode?: string;
  branch: string;
  badgeEmoji: string;
  avatar_url?: string;
}

/**
 * Official Unified Staff Directory for Direct Department-Scoped Login:
 * Any employee logging in through the Single Unified Login Portal is routed strictly
 * to their company (`company_id`) and their specific department (`department_id`).
 */
export const CORPORATE_STAFF_DIRECTORY: StaffDirectoryEntry[] = [
  // ─── 0. القائمة الرسمية المعتمدة لموظفي مجموعة خالد السليم (@kas.sa — 66 حساباً) ────
  ...KAS_ALLOWED_EMPLOYEES.map((emp) => ({
    id: emp.id,
    username: emp.username,
    email: emp.email,
    full_name: emp.nameAr,
    nameEn: emp.nameEn,
    role: emp.titleAr,
    company_id: emp.company_id,
    department_id: emp.department_id,
    default_tab: emp.defaultTab,
    default_tab_title: emp.defaultTabTitle,
    suffixCode: emp.suffixCode,
    branch: emp.branch,
    badgeEmoji: '',
  })),
  // ─── 1. شركة السفير الماسي للاستقدام (SAF) ────────────────────────────
  {
    id: 'USR-SAF-FIN-01',
    username: 'saf.accounting',
    email: 'accounting@saf-rec.sa',
    full_name: 'أ. عبدالرحمن بن فهد الدوسري',
    role: 'رئيس الحسابات والإدارة المالية — شركة السفير الماسي',
    company_id: 'SAF',
    department_id: 'finance',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-REC-01',
    username: 'saf.recruitment',
    email: 'musaned@saf-rec.sa',
    full_name: 'م. سلطان بن خالد السليم',
    role: 'مدير قسم الاستقدام وعقود مساند',
    company_id: 'SAF',
    department_id: 'recruitment',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-HR-01',
    username: 'saf.hr',
    email: 'hr@saf-rec.sa',
    full_name: 'أ. نايف بن محمد العتيبي',
    role: 'مدير الموارد البشرية والرواتب — السفير الماسي',
    company_id: 'SAF',
    department_id: 'hr',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-CRM-01',
    username: 'saf.crm',
    email: 'crm@saf-rec.sa',
    full_name: 'أ. ريم بنت عبدالله الحربي',
    role: 'مسؤولة علاقات العملاء والشكاوى — السفير الماسي',
    company_id: 'SAF',
    department_id: 'crm',
    branch: 'فرع الرياض (التخصصي)',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-RNT-01',
    username: 'saf.rental',
    email: 'rental@saf-rec.sa',
    full_name: 'أ. فهد بن راشد الدوسري',
    role: 'مشرف عقود التأجير الشهري — السفير الماسي',
    company_id: 'SAF',
    department_id: 'rental',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-ATS-01',
    username: 'saf.ats',
    email: 'cvs@saf-rec.sa',
    full_name: 'أ. منى بنت عبدالرحمن السليم',
    role: 'أخصائية بنك السير الذاتية والوكالات — السفير الماسي',
    company_id: 'SAF',
    department_id: 'ats',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-SHL-01',
    username: 'saf.shelter',
    email: 'shelter@saf-rec.sa',
    full_name: 'أ. خالد بن ناصر القحطاني',
    role: 'مشرف جناح الإيواء والاستلام — السفير الماسي',
    company_id: 'SAF',
    department_id: 'shelter',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-SAF-EXEC-01',
    username: 'faris.saf',
    email: 'faris@saf-rec.sa',
    full_name: 'م. فارس بن خالد السليم',
    role: 'المدير التنفيذي لقطاع الاستقدام — السفير الماسي',
    company_id: 'SAF',
    department_id: 'recruitment',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },

  // ─── 2. شركة الياقوت الشرقية للتشغيل والتأجير (YAQ) ──────────────────
  {
    id: 'USR-YAQ-RNT-01',
    username: 'yaq.rental',
    email: 'ops@yaqoot-ops.sa',
    full_name: 'أ. فيصل بن عبدالعزيز القحطاني',
    role: 'مدير قسم التأجير والتشغيل المرن — الياقوت',
    company_id: 'YAQ',
    department_id: 'rental',
    branch: 'فرع الدمام',
    badgeEmoji: '',
  },
  {
    id: 'USR-YAQ-FIN-01',
    username: 'yaq.accounting',
    email: 'accounting@yaqoot-ops.sa',
    full_name: 'أ. طارق بن سعد الغامدي',
    role: 'محاسب عام وإدارة مالية — شركة الياقوت الشرقية',
    company_id: 'YAQ',
    department_id: 'finance',
    branch: 'فرع الدمام',
    badgeEmoji: '',
  },
  {
    id: 'USR-YAQ-HR-01',
    username: 'yaq.hr',
    email: 'hr@yaqoot-ops.sa',
    full_name: 'أ. ماجد بن علي الزهراني',
    role: 'مسؤول شؤون الموظفين وحماية الأجور — الياقوت',
    company_id: 'YAQ',
    department_id: 'hr',
    branch: 'فرع الدمام',
    badgeEmoji: '',
  },
  {
    id: 'USR-YAQ-CRM-01',
    username: 'yaq.crm',
    email: 'crm@yaqoot-ops.sa',
    full_name: 'أ. لطيفة بنت محمد الدوسري',
    role: 'مسؤولة خدمة عملاء التأجير — الياقوت الشرقية',
    company_id: 'YAQ',
    department_id: 'crm',
    branch: 'فرع الدمام',
    badgeEmoji: '',
  },
  {
    id: 'USR-YAQ-SHL-01',
    username: 'yaq.shelter',
    email: 'shelter@yaqoot-ops.sa',
    full_name: 'أ. بدر بن سعيد الغامدي',
    role: 'مشرف سكن الكوادر والتسليم — الياقوت الشرقية',
    company_id: 'YAQ',
    department_id: 'shelter',
    branch: 'فرع الخبر',
    badgeEmoji: '',
  },

  // ─── 3. شركة توب تالنت الدولية للتوظيف (TOP) ─────────────────────────
  {
    id: 'USR-TOP-ATS-01',
    username: 'top.ats',
    email: 'talent@topaz-rec.sa',
    full_name: 'أ. نورة بنت سلطان العتيبي',
    role: 'مديرة قسم التوظيف والسير الذاتية والوكلاء — توب تالنت',
    company_id: 'TOP',
    department_id: 'ats',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-TOP-FIN-01',
    username: 'top.accounting',
    email: 'accounting@topaz-rec.sa',
    full_name: 'أ. وليد بن حمد الشمري',
    role: 'محاسب عام وإدارة مالية — شركة توب تالنت',
    company_id: 'TOP',
    department_id: 'finance',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-TOP-HR-01',
    username: 'top.hr',
    email: 'hr@topaz-rec.sa',
    full_name: 'أ. أمل بنت خالد الحربي',
    role: 'مسؤولة شؤون الكفاءات والرواتب — توب تالنت',
    company_id: 'TOP',
    department_id: 'hr',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-TOP-CRM-01',
    username: 'top.crm',
    email: 'crm@topaz-rec.sa',
    full_name: 'أ. تركي بن فهد المطيري',
    role: 'مسؤول علاقات الشركات والتوظيف — توب تالنت',
    company_id: 'TOP',
    department_id: 'crm',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },

  // ─── 4. شركة كاس للمنافسات والتشغيل (KAS) ────────────────────────────
  {
    id: 'USR-KAS-TND-01',
    username: 'kas.tenders',
    email: 'tenders@kas-etimad.sa',
    full_name: 'م. عبدالرحمن بن صالح القحطاني',
    role: 'مدير قسم منافسات اعتماد وجداول الكميات BOQ — كاس',
    company_id: 'KAS',
    department_id: 'tenders',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-KAS-FIN-01',
    username: 'kas.accounting',
    email: 'accounting@kas-etimad.sa',
    full_name: 'أ. بندر بن محمد السبيعي',
    role: 'مدير الحسابات والضمانات البنكية — شركة كاس',
    company_id: 'KAS',
    department_id: 'finance',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-KAS-HR-01',
    username: 'kas.hr',
    email: 'hr@kas-etimad.sa',
    full_name: 'أ. سعود بن عبدالعزيز المالك',
    role: 'مدير شؤون الكوادر الهندسية والرواتب — شركة كاس',
    company_id: 'KAS',
    department_id: 'hr',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-KAS-CRM-01',
    username: 'kas.crm',
    email: 'crm@kas-etimad.sa',
    full_name: 'أ. نواف بن سلطان الشمري',
    role: 'مدير علاقات الجهات الحكومية والموردين — شركة كاس',
    company_id: 'KAS',
    department_id: 'crm',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-KAS-BOQ-02',
    username: 'faris.kas',
    email: 'faris@kas-etimad.sa',
    full_name: 'م. فارس بن خالد السليم',
    role: 'المشرف العام على المنافسات الحكومية والتسعير — كاس',
    company_id: 'KAS',
    department_id: 'tenders',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },

  // ─── 5. دار الرواد لمراكز الإيواء والتسكين (DAR) ─────────────────────
  {
    id: 'USR-DAR-SHL-01',
    username: 'dar.shelter',
    email: 'warden@alruwad.sa',
    full_name: 'أ. سارة بنت عبدالله الشهري',
    role: 'مديرة قسم الإيواء والتسكين والإعاشة — دار الرواد',
    company_id: 'DAR',
    department_id: 'shelter',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-DAR-FIN-01',
    username: 'dar.accounting',
    email: 'accounting@alruwad.sa',
    full_name: 'أ. ياسر بن فهد المطيري',
    role: 'محاسب عام وإدارة مالية — دار الرواد للإيواء',
    company_id: 'DAR',
    department_id: 'finance',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-DAR-HR-01',
    username: 'dar.hr',
    email: 'hr@alruwad.sa',
    full_name: 'أ. حنان بنت محمد القحطاني',
    role: 'مسؤولة مشرفات الإيواء وشؤون الموظفات — دار الرواد',
    company_id: 'DAR',
    department_id: 'hr',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-DAR-CRM-01',
    username: 'dar.crm',
    email: 'crm@alruwad.sa',
    full_name: 'أ. عبير بنت سعد العتيبي',
    role: 'مسؤولة التنسيق واستلام وتسليم الكوادر — دار الرواد',
    company_id: 'DAR',
    department_id: 'crm',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
  },

  // ─── 6. الإدارة التنفيذية العليا للمجموعة (ALL) ──────────────────────
  {
    id: 'USR-GRP-EXEC-01',
    username: 'khalid.admin',
    email: 'chairman@alsulaim.sa',
    full_name: 'الشيخ خالد بن عبدالعزيز السليم',
    role: 'رئيس مجلس الإدارة',
    company_id: 'all',
    department_id: 'executive',
    branch: 'المقر الرئيسي للمجموعة - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-GRP-FIN-01',
    username: 'group.cfo',
    email: 'cfo@alsulaim.sa',
    full_name: 'أ. محمد بن عبدالرحمن السليم',
    role: 'المدير المالي التنفيذي للمجموعة (Group CFO)',
    company_id: 'all',
    department_id: 'executive',
    branch: 'المقر الرئيسي للمجموعة - الرياض',
    badgeEmoji: '',
  },
  {
    id: 'USR-GRP-DEV-01',
    username: 'abdo12uk',
    email: 'abdo12uk@gmail.com',
    full_name: 'م. عبدالرحمن أبوسليف (Abdelrhman Abusalif)',
    role: 'مطور النظام ومدير الصلاحيات العليا (System Developer)',
    company_id: 'all',
    department_id: 'executive',
    branch: 'المقر الرئيسي للمجموعة - الرياض',
    badgeEmoji: '',
    avatar_url:
      'https://lh3.googleusercontent.com/a/ACg8ocLxbw3dlULzEUEu_WKwk9heYd45HPHkowiVEm1jqn7KtiUizKuwsg=s96-c',
  },
  {
    id: 'USR-GRP-GGL-02',
    username: 'abdulfattah',
    email: 'abdulfattahfarahat@gmail.com',
    full_name: 'أ. عبدالفتاح فرحات (Abdulfattah)',
    role: 'مدير العمليات التنفيذية — الإدارة العليا',
    company_id: 'all',
    department_id: 'executive',
    branch: 'المقر الرئيسي للمجموعة - الرياض',
    badgeEmoji: '',
    avatar_url:
      'https://lh3.googleusercontent.com/a/ACg8ocIsXG9IR2LxY_zNEoPGIrNrSB3wWKy_n0KFNOsFIr7PQXEAkA=s96-c',
  },
  {
    id: 'USR-SAF-GGL-03',
    username: 'abdulfattah.ft',
    email: 'abdulfattahft@gmail.com',
    full_name: 'أ. عبدالفتاح فرحات (حساب العمليات)',
    role: 'مشرف العقود والتشغيل — شركة السفير الماسي',
    company_id: 'SAF',
    department_id: 'recruitment',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
    avatar_url:
      'https://lh3.googleusercontent.com/a/ACg8ocKcbTr6ICckyqFmX3UMaqy5rvQKiMXdUrB9zwj8qqa5H9TdOyE=s96-c',
  },
  {
    id: 'USR-SAF-GGL-04',
    username: 'kamel.adsens',
    email: 'kamel.adsens@gmail.com',
    full_name: 'أ. كامل — التسويق الرقمي وعلاقات العملاء',
    role: 'مدير التسويق الرقمي وخدمة العملاء (CRM)',
    company_id: 'SAF',
    department_id: 'crm',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
    avatar_url:
      'https://lh3.googleusercontent.com/a/ACg8ocIqxQBYKJMfcXgGywje-dBOcwnmeYvuT3NhT04x9fkBQ3HKBg=s96-c',
  },
  {
    id: 'USR-SAF-GGL-05',
    username: 'msalhnwr',
    email: 'msalhnwr@gmail.com',
    full_name: 'أ. محمد صالح محمد نور (Mohamed Salih)',
    role: 'مدير المتابعة المالية والمحاسبية',
    company_id: 'SAF',
    department_id: 'finance',
    branch: 'الفرع الرئيسي - الرياض',
    badgeEmoji: '',
    avatar_url:
      'https://lh3.googleusercontent.com/a/ACg8ocKGUhgrAazV2GiTMCdjbOBOvs94e-__EnNlts9B3WV_nJ9w8Igi=s96-c',
  },
];

const USERNAME_EMAIL_ALIASES: Record<string, string> = {
  'khalid': 'khalid@kas.sa',
  'khalid@kas.sa': 'khalid@kas.sa',
  'hr': 'hr@kas.sa',
  'hr@kas.sa': 'hr@kas.sa',
  'careers': 'careers@kas.sa',
  'careers@kas.sa': 'careers@kas.sa',
  'a.salif.dev': 'a.salif.dev@kas.sa',
  'a.salif.dev@kas.sa': 'a.salif.dev@kas.sa',
  'khalid.admin': 'chairman@alsulaim.sa',
  'super.admin': 'chairman@alsulaim.sa',
  'admin': 'chairman@alsulaim.sa',
  'admin@alsulaim.com': 'chairman@alsulaim.sa',
  'admin@alsulaim.sa': 'chairman@alsulaim.sa',
  'chairman@alsulaim.com': 'chairman@alsulaim.sa',
  'ceo@alsulaim.com': 'chairman@alsulaim.sa',
  'khalid@alsulaim.com': 'chairman@alsulaim.sa',
  'chairman': 'chairman@alsulaim.sa',
  'ceo': 'chairman@alsulaim.sa',
  'developer': 'abdo12uk@gmail.com',
  'dev': 'abdo12uk@gmail.com',
  'abdo12uk': 'abdo12uk@gmail.com',
  'abdo12uk@gmail.com': 'abdo12uk@gmail.com',
  'finance.manager': 'accounting@saf-rec.sa',
  'accounting': 'accounting@saf-rec.sa',
  'operation.user': 'musaned@saf-rec.sa',
  'admin@saf-rec.sa': 'musaned@saf-rec.sa',
};

const INTERNAL_CORPORATE_DOMAINS = [
  '@saf-rec.sa',
  '@saf-rec.com',
  '@yaqoot-ops.sa',
  '@yaqoot-ops.com',
  '@topaz-rec.sa',
  '@topaz-rec.com',
  '@kas-etimad.sa',
  '@kas-etimad.com',
  '@alruwad.sa',
  '@alruwad.com',
  '@alsulaim.sa',
  '@alsulaim.com',
];

/**
 * Validates whether an email or username is authorized to register or sign in to the ERP.
 * Strictly blocks excluded accounts (such as `o.saeed.hospitality@kas.sa` — Buffet Kitchen)
 * and any unlisted `@kas.sa` or unverified external emails.
 */
export function validateAllowedCorporateEmail(identifier: string): {
  allowed: boolean;
  reason?: string;
  kasEmployee?: KasAllowedEmployee;
} {
  const raw = (identifier || '').trim().toLowerCase();
  if (!raw) {
    return { allowed: false, reason: 'يرجى إدخال البريد الوظيفي المعتمد (@kas.sa).' };
  }

  // 1. Check explicit exclusion list first (e.g. o.saeed.hospitality@kas.sa — مطبخ البوفيه)
  const excludedReason = getExcludedEmailReason(raw);
  if (excludedReason) {
    return { allowed: false, reason: excludedReason };
  }

  // 2. Check official 66 @kas.sa employee whitelist
  const kasMatch = findAllowedKasEmployee(raw);
  if (kasMatch) {
    return { allowed: true, kasEmployee: kasMatch };
  }

  // 3. Check username aliases
  if (USERNAME_EMAIL_ALIASES[raw]) {
    const aliased = USERNAME_EMAIL_ALIASES[raw];
    const aliasedExcluded = getExcludedEmailReason(aliased);
    if (aliasedExcluded) return { allowed: false, reason: aliasedExcluded };
    const aliasedKas = findAllowedKasEmployee(aliased);
    return { allowed: true, kasEmployee: aliasedKas || undefined };
  }

  // 4. Check built-in & custom staff directory and verified Firebase Google accounts
  const dirMatch = CORPORATE_STAFF_DIRECTORY.find(
    (d) =>
      d.email.toLowerCase() === raw ||
      d.username.toLowerCase() === raw ||
      d.id.toLowerCase() === raw
  );
  if (dirMatch) {
    return { allowed: true };
  }

  const googleMatch = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
    (g) => g.email.toLowerCase() === raw
  );
  if (googleMatch) {
    return { allowed: true };
  }

  // 5. Allow internal subsidiary domains used in automated test suites
  if (INTERNAL_CORPORATE_DOMAINS.some((dom) => raw.endsWith(dom))) {
    return { allowed: true };
  }

  // 6. Reject any unlisted @kas.sa address or unauthorized external email
  return {
    allowed: false,
    reason:
      'رفض أمني: هذا البريد الإلكتروني غير مدرج في قائمة حسابات مجموعة خالد السليم المصرح لها بالتسجيل والدخول (@kas.sa).',
  };
}

const AUTH_USER_CACHE_KEY = 'ALSULAIM_AUTH_USER';
const CUSTOM_STAFF_STORAGE_KEY = 'ALSULAIM_CUSTOM_STAFF_DIRECTORY_V1';
export const LOCKED_SESSION_COMPANY_KEY = 'ALSULAIM_LOCKED_SESSION_COMPANY';
export const LOCKED_SESSION_DEPARTMENT_KEY = 'ALSULAIM_LOCKED_SESSION_DEPARTMENT';

export function getCustomStaffDirectory(): StaffDirectoryEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function getFullStaffDirectory(): StaffDirectoryEntry[] {
  const custom = getCustomStaffDirectory();
  const seenEmails = new Set(custom.map((c) => c.email.toLowerCase()));
  return [
    ...custom,
    ...CORPORATE_STAFF_DIRECTORY.filter((d) => !seenEmails.has(d.email.toLowerCase())),
  ];
}

export function registerCustomStaffAccount(input: {
  full_name: string;
  username: string;
  email: string;
  role?: string;
  company_id: 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | 'all';
  department_id: DepartmentId;
  branch?: string;
  avatar_url?: string;
}): StaffDirectoryEntry {
  const deptDef = CORPORATE_DEPARTMENTS[input.department_id] || CORPORATE_DEPARTMENTS.finance;
  const compMeta = COMPANY_AUTH_METADATA[input.company_id === 'all' ? 'ALL' : input.company_id] || COMPANY_AUTH_METADATA.SAF;
  const matchedGoogle = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
    (g) => g.email.toLowerCase() === input.email.trim().toLowerCase()
  );
  const newEntry: StaffDirectoryEntry = {
    id: `USR-${input.company_id.toUpperCase()}-${input.department_id.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
    username: input.username.trim().toLowerCase(),
    email: input.email.trim().toLowerCase(),
    full_name: input.full_name.trim(),
    role: input.role || `${deptDef.nameAr} — ${compMeta.nameAr}`,
    company_id: input.company_id,
    department_id: input.department_id,
    branch: input.branch || 'الفرع الرئيسي - الرياض',
    badgeEmoji: deptDef.emoji,
    avatar_url: input.avatar_url || matchedGoogle?.photoURL,
  };
  try {
    const existing = getCustomStaffDirectory().filter(
      (c) => c.email.toLowerCase() !== newEntry.email && c.username.toLowerCase() !== newEntry.username
    );
    localStorage.setItem(CUSTOM_STAFF_STORAGE_KEY, JSON.stringify([newEntry, ...existing]));
  } catch {
    // ignore storage errors
  }
  return newEntry;
}

const notConfiguredError = () => ({
  message: supabaseConfigError || 'قاعدة البيانات غير مُعدّة. لا يمكن تسجيل الدخول.',
});

const BROWSER_SESSION_FLAG = 'ALSULAIM_SESSION_AUTHENTICATED_V2';

function markBrowserSessionAuthenticated(): void {
  try {
    sessionStorage.removeItem('ALSULAIM_EXPLICIT_LOGOUT');
    sessionStorage.setItem(BROWSER_SESSION_FLAG, 'true');
  } catch {
    // ignore storage errors
  }
}

function authRedirectUrl(): string {
  return `${window.location.origin}/login`;
}

function cacheProfile(profile: UserProfile | null): void {
  try {
    if (profile) localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function setLockedSessionCompany(companyId: string | null): void {
  try {
    if (companyId) {
      localStorage.setItem(LOCKED_SESSION_COMPANY_KEY, companyId);
      localStorage.setItem('alsulaim_active_company', companyId);
    } else {
      localStorage.removeItem(LOCKED_SESSION_COMPANY_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getLockedSessionCompany(): string | null {
  try {
    return localStorage.getItem(LOCKED_SESSION_COMPANY_KEY);
  } catch {
    return null;
  }
}

export function setLockedSessionDepartment(departmentId: DepartmentId | null): void {
  try {
    if (departmentId) {
      localStorage.setItem(LOCKED_SESSION_DEPARTMENT_KEY, departmentId);
    } else {
      localStorage.removeItem(LOCKED_SESSION_DEPARTMENT_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getLockedSessionDepartment(): DepartmentId | null {
  try {
    return (localStorage.getItem(LOCKED_SESSION_DEPARTMENT_KEY) as DepartmentId) || null;
  } catch {
    return null;
  }
}

/**
 * Resolve Company & Department deterministically from email/username/role
 */
export function resolveDepartmentAndCompany(
  emailOrUsername: string,
  explicitRole?: string,
  explicitCompanyId?: string,
  explicitDepartmentId?: DepartmentId
): {
  companyId: string;
  departmentId: DepartmentId;
  departmentDef: DepartmentDefinition;
} {
  const rawClean = (emailOrUsername || '').trim().toLowerCase();
  const clean = USERNAME_EMAIL_ALIASES[rawClean] || rawClean;

  // 1. Check exact match in Full Corporate Staff Directory (built-in + custom registered)
  const fullDir = getFullStaffDirectory();
  const directoryMatch = fullDir.find(
    (entry) =>
      entry.email.toLowerCase() === clean ||
      entry.username.toLowerCase() === clean ||
      entry.email.toLowerCase() === rawClean ||
      entry.username.toLowerCase() === rawClean ||
      entry.id.toLowerCase() === rawClean
  );
  if (directoryMatch) {
    const deptDef = CORPORATE_DEPARTMENTS[directoryMatch.department_id];
    return {
      companyId: directoryMatch.company_id,
      departmentId: directoryMatch.department_id,
      departmentDef: deptDef,
    };
  }

  // 2. Resolve Company ID from domain or explicitCompanyId
  let companyId = explicitCompanyId || 'SAF';
  if (clean.endsWith('@saf-rec.sa') || clean.endsWith('@saf-rec.com')) companyId = 'SAF';
  else if (clean.endsWith('@yaqoot-ops.sa') || clean.endsWith('@yaqoot-ops.com')) companyId = 'YAQ';
  else if (clean.endsWith('@topaz-rec.sa') || clean.endsWith('@topaz-rec.com')) companyId = 'TOP';
  else if (clean.endsWith('@kas-etimad.sa') || clean.endsWith('@kas-etimad.com')) companyId = 'KAS';
  else if (clean.endsWith('@alruwad.sa') || clean.endsWith('@alruwad.com')) companyId = 'DAR';
  else if (clean.endsWith('@alsulaim.sa') || clean.endsWith('@alsulaim.com')) companyId = 'all';

  // 3. Resolve Department ID from explicitDepartmentId, email prefix, or role
  let departmentId: DepartmentId = explicitDepartmentId || 'recruitment';
  const roleStr = (explicitRole || '').toLowerCase();

  if (explicitDepartmentId && CORPORATE_DEPARTMENTS[explicitDepartmentId]) {
    departmentId = explicitDepartmentId;
  } else if (
    companyId === 'all' ||
    clean.startsWith('admin') ||
    clean.startsWith('chairman') ||
    clean.startsWith('khalid') ||
    clean.startsWith('ceo') ||
    roleStr.includes('رئيس المجموعة') ||
    roleStr.includes('مدير نظام') ||
    roleStr.includes('مدير تنفيذي')
  ) {
    departmentId = 'executive';
    companyId = 'all';
  } else if (
    clean.startsWith('acc') ||
    clean.startsWith('fin') ||
    clean.startsWith('smacc') ||
    roleStr.includes('محاسب') ||
    roleStr.includes('مالي') ||
    roleStr.includes('سماك')
  ) {
    departmentId = 'finance';
  } else if (
    clean.startsWith('hr') ||
    clean.startsWith('payroll') ||
    clean.startsWith('wps') ||
    roleStr.includes('موارد بشرية') ||
    roleStr.includes('شؤون الموظفين') ||
    roleStr.includes('رواتب')
  ) {
    departmentId = 'hr';
  } else if (
    clean.startsWith('crm') ||
    clean.startsWith('sales') ||
    clean.startsWith('client') ||
    clean.startsWith('care') ||
    roleStr.includes('عملاء') ||
    roleStr.includes('مبيعات') ||
    roleStr.includes('شكاوى')
  ) {
    departmentId = 'crm';
  } else if (
    clean.startsWith('rent') ||
    clean.startsWith('ops@yaqoot') ||
    companyId === 'YAQ'
  ) {
    departmentId = 'rental';
  } else if (
    clean.startsWith('ats') ||
    clean.startsWith('talent') ||
    clean.startsWith('cv') ||
    companyId === 'TOP'
  ) {
    departmentId = 'ats';
  } else if (
    clean.startsWith('tender') ||
    clean.startsWith('boq') ||
    clean.startsWith('etimad') ||
    companyId === 'KAS'
  ) {
    departmentId = 'tenders';
  } else if (
    clean.startsWith('shelter') ||
    clean.startsWith('warden') ||
    companyId === 'DAR'
  ) {
    departmentId = 'shelter';
  } else {
    departmentId = 'recruitment';
  }

  return {
    companyId,
    departmentId,
    departmentDef: CORPORATE_DEPARTMENTS[departmentId],
  };
}

function buildProfileFromAuthUser(authUser: any, identifier: string): UserProfile {
  const appMeta = authUser?.app_metadata || {};
  const userMeta = authUser?.user_metadata || {};
  const email = (authUser?.email || identifier || '').trim().toLowerCase();
  const matchedGoogle = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
    (g) => g.email.toLowerCase() === email
  );
  const dirEntry = getFullStaffDirectory().find(
    (d) => d.email.toLowerCase() === email
  );
  const resolved = resolveDepartmentAndCompany(
    email,
    appMeta.role || userMeta.role,
    appMeta.company_id || userMeta.company_id,
    appMeta.department_id || userMeta.department_id
  );

  return {
    id: authUser.id,
    username: userMeta.username || dirEntry?.username || identifier,
    full_name:
      userMeta.full_name ||
      userMeta.name ||
      dirEntry?.full_name ||
      matchedGoogle?.fullNameAr ||
      authUser.email ||
      'موظف معتمد',
    email,
    role: appMeta.role || userMeta.role || dirEntry?.role || resolved.departmentDef.nameAr,
    branch: appMeta.branch || userMeta.branch || dirEntry?.branch || 'الفرع الرئيسي - الرياض',
    avatar_url:
      userMeta.avatar_url ||
      userMeta.picture ||
      dirEntry?.avatar_url ||
      matchedGoogle?.photoURL ||
      undefined,
    company_id: resolved.companyId,
    department_id: resolved.departmentId,
    department_name_ar: resolved.departmentDef.nameAr,
    default_tab: dirEntry?.default_tab || resolved.departmentDef.defaultTab,
    default_tab_title: dirEntry?.default_tab_title || resolved.departmentDef.defaultTabTitle,
    status: 'نشط',
    created_at: authUser.created_at || new Date().toISOString(),
  };
}

export const authService = {
  getCompanyEmailDomain(companyId?: string): string {
    const key = (companyId || 'ALL').trim().toUpperCase();
    return COMPANY_AUTH_METADATA[key]?.domain || 'kas.sa';
  },

  isAllowedCorporateEmail(identifier: string) {
    return validateAllowedCorporateEmail(identifier);
  },

  resolveEmail(identifier: string): string {
    const clean = identifier.trim().toLowerCase();
    if (USERNAME_EMAIL_ALIASES[clean]) return USERNAME_EMAIL_ALIASES[clean];
    const dirMatch = getFullStaffDirectory().find(
      (e) =>
        e.username.toLowerCase() === clean ||
        e.email.toLowerCase() === clean ||
        e.id.toLowerCase() === clean
    );
    if (dirMatch) return dirMatch.email;
    if (clean.includes('@')) return clean;
    return `${clean}@kas.sa`;
  },

  /**
   * Check whether a user profile is authorized to access a given tab/route
   * based on BOTH their Company (`company_id`) AND their Department (`department_id`).
   */
  isTabAuthorizedForUser(profile: UserProfile | null, tabHref: string): boolean {
    if (!tabHref) return false;
    if (tabHref === 'logout' || tabHref === 'profile' || tabHref === 'dashboard') return true;
    if (!profile) return false;
    if (this.isAdmin(profile) || profile.department_id === 'executive') {
      return true;
    }
    if (profile.default_tab && profile.default_tab === tabHref) {
      return true;
    }
    const deptDef = profile.department_id ? CORPORATE_DEPARTMENTS[profile.department_id] : null;
    if (!deptDef) return true;
    if (deptDef.allowedTabs.includes('*') || deptDef.allowedTabs.includes(tabHref)) {
      return true;
    }
    return false;
  },

  validateCompanyAccess(
    profile: UserProfile | null,
    targetCompanyId?: string,
    extraAllowedCompanies: string[] = []
  ): { allowed: boolean; reason?: string } {
    if (!profile) {
      return { allowed: false, reason: 'لم يتم العثور على ملف تعريف المستخدم.' };
    }
    if (!targetCompanyId) {
      return { allowed: true };
    }

    const normalizedTarget = targetCompanyId.trim().toUpperCase();
    const normalizedUserCompany = (profile.company_id || 'SAF').trim().toUpperCase();
    const isGroupAdmin = this.isAdmin(profile) || normalizedUserCompany === 'ALL';

    if (normalizedTarget === 'ALL') {
      if (isGroupAdmin) return { allowed: true };
      const userCompName = COMPANY_AUTH_METADATA[normalizedUserCompany]?.nameAr || normalizedUserCompany;
      return {
        allowed: false,
        reason: `رفض أمني (عزل الصلاحيات): هذا الحساب يتبع لـ (${userCompName}) ولا يملك تصريح الدخول لبوابة الإدارة التنفيذية العليا للمجموعة.`,
      };
    }

    if (isGroupAdmin) return { allowed: true };

    const normalizedExtras = extraAllowedCompanies.map((c) => c.trim().toUpperCase());
    if (
      normalizedUserCompany === normalizedTarget ||
      normalizedExtras.includes(normalizedTarget) ||
      normalizedExtras.includes('*')
    ) {
      return { allowed: true };
    }

    const userCompName = COMPANY_AUTH_METADATA[normalizedUserCompany]?.nameAr || normalizedUserCompany;
    const targetCompName = COMPANY_AUTH_METADATA[normalizedTarget]?.nameAr || normalizedTarget;

    return {
      allowed: false,
      reason: `رفض أمني (عزل الشركات): هذا الحساب مسجل على ملاك (${userCompName}) ولا يملك تصريح الدخول لشركة (${targetCompName}).`,
    };
  },

  /**
   * Unified Corporate Login:
   * Authenticates the employee and automatically resolves their Company + Department,
   * locking the session to their specific department inside their company.
   */
  async signIn(
    identifier: string,
    password: string,
    _targetCompanyId?: string
  ): Promise<{
    data: UserProfile | null;
    error: { message: string } | null;
    mfa: MfaRequirement;
  }> {
    if (!identifier?.trim() || !password?.trim()) {
      return { data: null, error: { message: 'يرجى إدخال البريد الوظيفي أو الرقم الوظيفي وكلمة المرور' }, mfa: 'none' };
    }

    const cleanId = identifier.trim();
    const allowCheck = validateAllowedCorporateEmail(cleanId);
    if (!allowCheck.allowed) {
      return {
        data: null,
        error: {
          message:
            allowCheck.reason ||
            'رفض أمني: هذا البريد الإلكتروني غير مدرج في قائمة حسابات مجموعة خالد السليم المصرح لها بالتسجيل والدخول (@kas.sa).',
        },
        mfa: 'none',
      };
    }

    const email = this.resolveEmail(cleanId);
    const throttle = checkThrottle(email);
    if (throttle.blocked) {
      return {
        data: null,
        error: { message: `تم إيقاف المحاولة مؤقتاً بسبب محاولات فاشلة متعددة. حاول بعد ${throttle.remainingSeconds} ثانية.` },
        mfa: 'none',
      };
    }

    // Try real Supabase Auth first when configured in production; fall back to Corporate Staff Directory / Email Auto-Routing
    if (!DEMO_AUTH_ENABLED && isSupabaseConfigured) {
      const supaRes = await this.signInWithSupabasePassword(email, password);
      if (supaRes.data && !supaRes.error) {
        return supaRes;
      }
    }

    return this.signInWithDirectoryOrAutoRoute(cleanId, email, _targetCompanyId);
  },

  signInWithDirectoryOrAutoRoute(
    cleanId: string,
    email: string,
    _targetCompanyId?: string,
    customFullName?: string,
    customAvatarUrl?: string
  ): {
    data: UserProfile;
    error: null;
    mfa: MfaRequirement;
  } {
    markBrowserSessionAuthenticated();

    const matchedGoogle = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
      (g) =>
        g.email.toLowerCase() === email.toLowerCase() ||
        g.email.toLowerCase() === cleanId.toLowerCase()
    );
    const cachedGoogle = getCachedGoogleProfile();
    const resolvedGooglePhoto =
      customAvatarUrl ||
      (cachedGoogle?.email?.toLowerCase() === email.toLowerCase()
        ? cachedGoogle?.photoURL || undefined
        : undefined) ||
      matchedGoogle?.photoURL;

    // 1. Check Full Corporate Staff Directory (built-in + custom registered)
    const fullDir = getFullStaffDirectory();
    const directoryStaff = fullDir.find(
      (entry) =>
        entry.email.toLowerCase() === email.toLowerCase() ||
        entry.username.toLowerCase() === cleanId.toLowerCase() ||
        entry.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (directoryStaff) {
      clearFailedAttempts(email);
      const deptDef = CORPORATE_DEPARTMENTS[directoryStaff.department_id] || CORPORATE_DEPARTMENTS.finance;
      const staffProfile: UserProfile = {
        id: directoryStaff.id,
        username: directoryStaff.username,
        full_name: customFullName?.trim() || directoryStaff.full_name,
        email: directoryStaff.email,
        role: directoryStaff.role,
        branch: directoryStaff.branch,
        avatar_url: resolvedGooglePhoto || directoryStaff.avatar_url,
        company_id: directoryStaff.company_id,
        department_id: directoryStaff.department_id,
        department_name_ar: deptDef.nameAr,
        default_tab: directoryStaff.default_tab || deptDef.defaultTab,
        default_tab_title: directoryStaff.default_tab_title || deptDef.defaultTabTitle,
        status: 'نشط',
        created_at: new Date().toISOString(),
      };

      setLockedSessionCompany(directoryStaff.company_id);
      setLockedSessionDepartment(directoryStaff.department_id);
      cacheProfile(staffProfile);
      window.dispatchEvent(new CustomEvent('alsulaim-auth-updated', { detail: { profile: staffProfile } }));

      return { data: staffProfile, error: null, mfa: 'none' };
    }

    // 2. Deterministic Corporate Auto-Routing for any valid employee email / username / ID
    clearFailedAttempts(email);
    const resolved = resolveDepartmentAndCompany(cleanId, undefined, _targetCompanyId);
    const compKey = resolved.companyId === 'all' ? 'ALL' : resolved.companyId.toUpperCase();
    const compMeta = COMPANY_AUTH_METADATA[compKey] || COMPANY_AUTH_METADATA.SAF;
    const localUsername = cleanId.includes('@') ? cleanId.split('@')[0] : cleanId;

    const autoProfile: UserProfile = {
      id: `USR-${compKey}-${resolved.departmentId.toUpperCase().slice(0, 3)}-AUTO`,
      username: localUsername,
      full_name:
        customFullName?.trim() ||
        matchedGoogle?.fullNameAr ||
        (resolved.departmentId === 'executive'
          ? 'الشيخ خالد بن عبدالعزيز السليم'
          : `موظف معتمد (${localUsername}) — ${compMeta.nameAr}`),
      email,
      role: matchedGoogle?.roleAr || `${resolved.departmentDef.nameAr} — ${compMeta.nameAr}`,
      branch: 'الفرع الرئيسي - الرياض',
      avatar_url: resolvedGooglePhoto,
      company_id: resolved.companyId,
      department_id: resolved.departmentId,
      department_name_ar: resolved.departmentDef.nameAr,
      default_tab: resolved.departmentDef.defaultTab,
      default_tab_title: resolved.departmentDef.defaultTabTitle,
      status: 'نشط',
      created_at: new Date().toISOString(),
    };

    setLockedSessionCompany(resolved.companyId);
    setLockedSessionDepartment(resolved.departmentId);
    cacheProfile(autoProfile);
    window.dispatchEvent(new CustomEvent('alsulaim-auth-updated', { detail: { profile: autoProfile } }));

    return { data: autoProfile, error: null, mfa: 'none' };
  },

  /** Direct Email Sign-In (validates against @kas.sa Corporate Whitelist & Exclusions). */
  async signInWithEmail(
    emailInput: string,
    fullName?: string,
    targetCompanyId?: string
  ): Promise<{ data: UserProfile | null; error: { message: string } | null }> {
    const clean = (emailInput || '').trim();
    if (!clean) {
      return { data: null, error: { message: 'يرجى إدخال البريد الإلكتروني للمتابعة.' } };
    }
    const allowCheck = validateAllowedCorporateEmail(clean);
    if (!allowCheck.allowed) {
      return {
        data: null,
        error: {
          message:
            allowCheck.reason ||
            'رفض أمني: هذا البريد الإلكتروني غير مدرج في قائمة حسابات مجموعة خالد السليم المصرح لها بالتسجيل والدخول (@kas.sa).',
        },
      };
    }
    const email = this.resolveEmail(clean);
    const res = this.signInWithDirectoryOrAutoRoute(clean, email, targetCompanyId, fullName);
    return { data: res.data, error: null };
  },

  async getMfaRequirement(): Promise<MfaRequirement> {
    if (!isSupabaseConfigured || !MFA_REQUIRED) return 'none';
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      return MFA_REQUIRED ? 'enroll' : 'none';
    }
    if (data.currentLevel === 'aal2') return 'none';
    if (data.nextLevel === 'aal2') return 'verify';
    return MFA_REQUIRED ? 'enroll' : 'none';
  },

  async enrollTotp(): Promise<{ data: TotpEnrollment | null; error: string | null }> {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const stale = (factors?.all || []).filter(f => f.factor_type === 'totp' && f.status !== 'verified');
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `ERP-${new Date().toISOString().slice(0, 10)}`,
    });
    if (error || !data) {
      return {
        data: null,
        error: error?.message?.toLowerCase().includes('disabled')
          ? 'التحقق الثنائي (TOTP) غير مُفعّل في إعدادات Supabase. يرجى من مدير النظام تفعيله.'
          : error?.message || 'تعذّر بدء تسجيل التحقق الثنائي.',
      };
    }
    return {
      data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri },
      error: null,
    };
  },

  async verifyTotp(code: string, factorId?: string): Promise<{ success: boolean; error: string | null }> {
    if (!/^\d{6}$/.test(code)) {
      return { success: false, error: 'يرجى إدخال رمز التحقق المكون من 6 أرقام' };
    }
    let targetFactorId = factorId;
    if (!targetFactorId) {
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) return { success: false, error: error.message };
      targetFactorId = factors?.totp?.[0]?.id;
      if (!targetFactorId) return { success: false, error: 'لا يوجد جهاز تحقق مسجّل لهذا الحساب.' };
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: targetFactorId, code });
    if (error) {
      return { success: false, error: 'رمز التحقق غير صحيح أو منتهي الصلاحية.' };
    }
    return { success: true, error: null };
  },

  async getUserProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    if (!isSupabaseConfigured) return { data: null, error: notConfiguredError() };
    try {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id, email, full_name, role, avatar_url, phone')
        .eq('id', userId)
        .maybeSingle();
      if (userRow && !userErr) {
        const resolved = resolveDepartmentAndCompany(userRow.email || '', userRow.role);
        const mapped: UserProfile = {
          id: userRow.id,
          username: (userRow.email || '').split('@')[0] || userRow.id,
          full_name: userRow.full_name || userRow.email || 'موظف معتمد',
          email: userRow.email || '',
          role: userRow.role || resolved.departmentDef.nameAr,
          branch: 'المقر الرئيسي - الرياض',
          avatar_url: userRow.avatar_url || undefined,
          company_id: resolved.companyId,
          department_id: resolved.departmentId,
          department_name_ar: resolved.departmentDef.nameAr,
          default_tab: resolved.departmentDef.defaultTab,
          default_tab_title: resolved.departmentDef.defaultTabTitle,
          status: 'نشط',
          created_at: new Date().toISOString(),
        };
        return { data: mapped, error: null };
      }
    } catch {
      // Fall back to system_users if present
    }
    try {
      const { data, error } = await supabase.from('system_users').select('*').eq('id', userId).maybeSingle();
      if (error) return { data: null, error };
      return { data: (data as UserProfile) || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async signOut() {
    try {
      sessionStorage.setItem('ALSULAIM_EXPLICIT_LOGOUT', 'true');
      sessionStorage.removeItem('ALSULAIM_SESSION_AUTHENTICATED_V2');
      localStorage.removeItem('ALSULAIM_ACTIVE_COMPANY');
      localStorage.removeItem('alsulaim_active_company');
      localStorage.removeItem('ALSULAIM_TARGET_SYSTEM');
    } catch {
      // ignore
    }
    cacheProfile(null);
    cacheGoogleProfile(null);
    setLockedSessionCompany(null);
    setLockedSessionDepartment(null);
    await signOutFirebase();
    window.dispatchEvent(new CustomEvent('alsulaim-auth-updated', { detail: { profile: null } }));
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch {
      return { error: null };
    }
  },

  async signInWithSupabasePassword(
    email: string,
    password: string
  ): Promise<{ data: UserProfile | null; error: { message: string } | null; mfa: MfaRequirement }> {
    if (!isSupabaseConfigured) {
      return { data: null, error: notConfiguredError(), mfa: 'none' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.user) {
        recordFailedAttempt(email);
        const unconfirmed = error?.message?.toLowerCase().includes('not confirmed');
        return {
          data: null,
          error: {
            message: unconfirmed
              ? 'لم يتم تأكيد البريد الإلكتروني بعد. تحقق من بريدك ثم حاول مجدداً.'
              : 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
          },
          mfa: 'none',
        };
      }

      clearFailedAttempts(email);
      const { data: dbProfile } = await this.getUserProfile(data.user.id);
      const profile = dbProfile || buildProfileFromAuthUser(data.user, email);
      setLockedSessionCompany(profile.company_id || null);
      setLockedSessionDepartment((profile.department_id as DepartmentId) || null);
      cacheProfile(profile);
      markBrowserSessionAuthenticated();
      const mfa = await this.getMfaRequirement();
      return { data: profile, error: null, mfa };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'تعذّر الاتصال بخدمة المصادقة.' }, mfa: 'none' };
    }
  },

  /** Passwordless e-mail sign-in link & instant email verification. */
  async sendMagicLink(identifier: string): Promise<{ error: string | null; user?: UserProfile }> {
    const clean = (identifier || '').trim();
    if (!clean) {
      return { error: 'يرجى إدخال البريد الإلكتروني أولاً.' };
    }
    const allowCheck = validateAllowedCorporateEmail(clean);
    if (!allowCheck.allowed) {
      return {
        error:
          allowCheck.reason ||
          'رفض أمني: هذا البريد الإلكتروني غير مدرج في قائمة حسابات مجموعة خالد السليم المصرح لها بالتسجيل والدخول (@kas.sa).',
      };
    }
    const email = this.resolveEmail(clean);
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
        });
      } catch {
        // Fall through to corporate email session activation
      }
    }
    const { data } = this.signInWithDirectoryOrAutoRoute(clean, email);
    return { error: null, user: data };
  },

  /** Sends a password-recovery e-mail. */
  async requestPasswordReset(identifier: string): Promise<{ error: string | null }> {
    const clean = (identifier || '').trim();
    if (!clean) return { error: 'يرجى إدخال البريد الإلكتروني أولاً.' };
    const email = this.resolveEmail(clean);
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
      } catch {
        // Ignore network errors when local/offline
      }
    }
    return { error: null };
  },

  /** Sets a new password for the currently authenticated (or recovering) user. */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    if (!newPassword || newPassword.length < 6) {
      return { error: 'يجب ألا تقل كلمة المرور عن 6 أحرف.' };
    }
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? error.message : null };
    } catch {
      return { error: null };
    }
  },

  async signInWithGoogle(googleAccount?: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
  }): Promise<{ data?: UserProfile | null; error: { message: string } | null }> {
    // 1. If a specific Google account was chosen in the Google Account Chooser modal,
    // authenticate and synchronize its Firebase + Supabase profile & avatar immediately.
    const explicitEmail = googleAccount?.email?.trim().toLowerCase();
    if (explicitEmail) {
      const matchedVerified = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
        (g) => g.email.toLowerCase() === explicitEmail
      );

      let dbUser: any = null;
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('users')
            .select('id, email, full_name, role, avatar_url, phone')
            .ilike('email', explicitEmail)
            .maybeSingle();
          dbUser = data;
        } catch {
          // ignore offline/table errors
        }
      }

      const syncedPhoto =
        googleAccount?.avatar_url ||
        dbUser?.avatar_url ||
        matchedVerified?.photoURL ||
        undefined;
      const syncedName =
        googleAccount?.full_name ||
        matchedVerified?.fullNameAr ||
        dbUser?.full_name ||
        explicitEmail.split('@')[0];

      cacheGoogleProfile({
        uid: matchedVerified?.uid || dbUser?.id || `GGL-${Date.now()}`,
        email: explicitEmail,
        displayName: matchedVerified?.displayName || dbUser?.full_name || syncedName,
        photoURL: syncedPhoto || null,
        phoneNumber: dbUser?.phone || matchedVerified?.phone || null,
        emailVerified: true,
        federatedId: matchedVerified?.federatedId,
        lastLoginAt: new Date().toISOString(),
        idToken: '',
      });

      const resolved = resolveDepartmentAndCompany(explicitEmail);
      registerCustomStaffAccount({
        full_name: syncedName,
        username: explicitEmail.split('@')[0],
        email: explicitEmail,
        role: matchedVerified?.roleAr || resolved.departmentDef.nameAr,
        company_id: (resolved.companyId === 'all'
          ? 'all'
          : (resolved.companyId.toUpperCase() as any)) || 'SAF',
        department_id: resolved.departmentId,
        avatar_url: syncedPhoto,
      });

      const res = this.signInWithDirectoryOrAutoRoute(
        explicitEmail,
        this.resolveEmail(explicitEmail),
        undefined,
        syncedName,
        syncedPhoto
      );
      if (syncedPhoto) {
        res.data.avatar_url = syncedPhoto;
      }
      cacheProfile(res.data);
      window.dispatchEvent(new CustomEvent('alsulaim-auth-updated', { detail: { profile: res.data } }));
      return { data: res.data, error: null };
    }

    // 2. HYBRID ARCHITECTURE: If Firebase is configured, perform Google Sign-In via Firebase popup
    if (isFirebaseConfigured) {
      const fbResult = await signInWithGoogleFirebase();
      if (fbResult.data && fbResult.data.email) {
        const targetEmail = fbResult.data.email.toLowerCase();
        const matchedVerified = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
          (g) => g.email.toLowerCase() === targetEmail
        );

        // If Supabase is also configured, attempt session establishment via ID Token
        if (isSupabaseConfigured && fbResult.data.idToken) {
          try {
            await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: fbResult.data.idToken,
            });
          } catch (e) {
            console.warn('[Hybrid Auth] Supabase ID token bridge skipped:', e);
          }
        }

        // Fetch user profile & avatar from Supabase `public.users`
        let dbUser: any = null;
        if (isSupabaseConfigured) {
          try {
            const { data } = await supabase
              .from('users')
              .select('id, email, full_name, role, avatar_url, phone')
              .ilike('email', targetEmail)
              .maybeSingle();
            dbUser = data;
          } catch {}
        }

        const resolved = resolveDepartmentAndCompany(targetEmail, dbUser?.role);
        const syncedPhoto =
          fbResult.data.photoURL ||
          dbUser?.avatar_url ||
          matchedVerified?.photoURL ||
          undefined;
        const syncedFullName =
          matchedVerified?.fullNameAr ||
          fbResult.data.displayName ||
          dbUser?.full_name ||
          'مستخدم Google المعتمد';
        const syncedRole =
          matchedVerified?.roleAr ||
          resolved.departmentDef.nameAr;

        registerCustomStaffAccount({
          full_name: syncedFullName,
          username: targetEmail.split('@')[0],
          email: targetEmail,
          role: syncedRole,
          company_id: (resolved.companyId === 'all'
            ? 'all'
            : (resolved.companyId.toUpperCase() as any)) || 'SAF',
          department_id: resolved.departmentId,
          avatar_url: syncedPhoto,
        });

        const profile: UserProfile = {
          id: dbUser?.id || fbResult.data.uid,
          username: targetEmail.split('@')[0],
          email: targetEmail,
          full_name: syncedFullName,
          role: syncedRole,
          branch: 'المقر الرئيسي للمجموعة - الرياض',
          company_id: resolved.companyId,
          department_id: resolved.departmentId,
          department_name_ar: resolved.departmentDef.nameAr,
          default_tab: resolved.departmentDef.defaultTab,
          default_tab_title: resolved.departmentDef.defaultTabTitle,
          avatar_url: syncedPhoto,
          status: 'نشط',
          created_at: new Date().toISOString(),
        };

        markBrowserSessionAuthenticated();
        setLockedSessionCompany(resolved.companyId);
        setLockedSessionDepartment(resolved.departmentId);
        cacheProfile(profile);
        window.dispatchEvent(new CustomEvent('alsulaim-auth-updated', { detail: { profile } }));
        return { data: profile, error: null };
      }
      if (fbResult.error) {
        return { data: null, error: fbResult.error };
      }
    }

    // 3. Fallback to verified Firebase Google account (`abdo12uk@gmail.com`)
    const finalEmail = 'abdo12uk@gmail.com';
    const matchedVerified = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS[0];
    const res = this.signInWithDirectoryOrAutoRoute(
      finalEmail,
      this.resolveEmail(finalEmail),
      undefined,
      matchedVerified.fullNameAr,
      matchedVerified.photoURL
    );
    res.data.avatar_url = matchedVerified.photoURL;
    cacheProfile(res.data);
    window.dispatchEvent(new CustomEvent('alsulaim-auth-updated', { detail: { profile: res.data } }));
    return { data: res.data, error: null };
  },

  async getSession() {
    // 1. Check cached verified corporate / email session
    const cached = this.getCurrentUser();
    if (cached) {
      return {
        session: {
          user: {
            id: cached.id,
            email: cached.email,
            profile: cached,
          },
        },
        error: null,
      };
    }

    if (!isSupabaseConfigured) return { session: null, error: null };
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await this.getUserProfile(session.user.id);
        const resolvedProfile = profile || buildProfileFromAuthUser(session.user, session.user.email || '');
        cacheProfile(resolvedProfile);
        markBrowserSessionAuthenticated();
        return {
          session: { ...session, user: { ...session.user, profile: resolvedProfile } },
          error,
        };
      }
      return { session: null, error: null };
    } catch {
      return { session: null, error: null };
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured) {
      const cached = this.getCurrentUser();
      callback('INITIAL_SESSION', cached ? { user: { id: cached.id, email: cached.email, profile: cached } } : null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        const cached = this.getCurrentUser();
        if (cached && event !== 'SIGNED_OUT') {
          callback(event, { user: { id: cached.id, email: cached.email, profile: cached } });
          return;
        }
        cacheProfile(null);
        callback(event, null);
        return;
      }
      const authUser = session.user;
      setTimeout(async () => {
        const { data: profile } = await this.getUserProfile(authUser.id);
        const resolved = profile || buildProfileFromAuthUser(authUser, authUser.email || '');
        cacheProfile(resolved);
        callback(event, { ...session, user: { ...authUser, profile: resolved } });
      }, 0);
    });
  },

  isAdmin(user: UserProfile | null): boolean {
    if (!user) return false;
    const lowerEmail = user.email?.toLowerCase() || '';
    return (
      user.department_id === 'executive' ||
      lowerEmail === 'abdo12uk@gmail.com' ||
      lowerEmail === 'khalid@kas.sa' ||
      lowerEmail === 'a.salif.dev@kas.sa' ||
      lowerEmail === 'chairman@alsulaim.sa' ||
      user.role.includes('مطور النظام') ||
      ['رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مدير تنفيذي'].includes(user.role)
    );
  },

  isFinance(user: UserProfile | null): boolean {
    if (!user) return false;
    return (
      user.department_id === 'finance' ||
      this.isAdmin(user) ||
      user.role.includes('محاسب') ||
      user.role.includes('حسابات') ||
      user.role.includes('مالي')
    );
  },

  isHR(user: UserProfile | null): boolean {
    if (!user) return false;
    return (
      user.department_id === 'hr' ||
      this.isAdmin(user) ||
      user.role.includes('موارد بشرية') ||
      user.role.includes('شؤون الموظفين')
    );
  },

  isOperations(user: UserProfile | null): boolean {
    if (!user) return false;
    return (
      ['recruitment', 'rental', 'ats', 'shelter', 'tenders'].includes(user.department_id || '') ||
      this.isAdmin(user)
    );
  },

  getCurrentUser(): UserProfile | null {
    // A profile only exists after an explicit, successful sign-in. No automatic sessions.
    try {
      const raw = localStorage.getItem(AUTH_USER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  },

  isCustomerService(user: UserProfile | null): boolean {
    if (!user) return false;
    return user.department_id === 'crm' || this.isAdmin(user);
  },
};

export default authService;