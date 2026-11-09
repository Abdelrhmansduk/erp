/* TypeScript Types for Enterprise ERP - Khalid Al-Sulaim Group */

export type CompanyId = 'all' | 'SAF' | 'YAQ' | 'TOP' | 'DAR' | 'KAS' | 'masi' | 'yaqoot' | 'topaz' | 'ruwad' | 'kas' | 'shelter';

export interface CompanyBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  headerLogoUrl: string;
  watermarkUrl?: string;
  reportHeaderTemplate: string;
}

export interface CompanyEntity {
  id: CompanyId;
  code: 'SAF' | 'YAQ' | 'TOP' | 'DAR' | 'KAS' | 'GRP';
  name: string;
  nameEn: string;
  logo: string;
  taxNumber: string;
  crNumber: string;
  address: string;
  phone: string;
  email: string;
  branchesCount: number;
  employeesCount: number;
  activeOrdersCount: number;
  revenueYTD: number;
  branding?: CompanyBranding;
  vatRate?: number;
  currency?: string;
}

export interface NavItem {
  id: string;
  title: string;
  icon?: string;
  href?: string;
  badge?: string | number;
  badgeType?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'info';
  exclusiveToCompany?: CompanyId | 'KAS' | 'SAF' | 'YAQ' | 'TOP';
  children?: NavItem[];
}

export interface Client {
  id: string;
  client_number: string;
  name: string;
  phone: string;
  national_id: string;
  city: string;
  status: 'نشط' | 'محظور';
  type: 'شخص' | 'شركة';
  orders_count: number;
  active_orders: number;
  recruitment_contracts: number;
  rent_contracts: number;
  created_at: string;
  added_by: string;
  branch: string;
  companyId?: CompanyId;
}

export interface Order {
  id: string;
  maid_name: string;
  maid_photo?: string;
  client_name: string;
  client_phone: string;
  nationality: string;
  passport_number: string;
  request_type: 'معروفة' | 'معينة' | 'حسب المواصفات';
  status: 'جديد' | 'تحت الإجراء' | 'تم التعاقد' | 'مكتملة' | 'مرفوضة';
  timer_status: 'عادي' | 'عاجل' | 'متأخر';
  deadline: string;
  contract_status: 'بدون عقد' | 'تم التعاقد';
  created_at: string;
  responsible_employee: string;
  branch: string;
  office_name: string;
  companyId?: CompanyId;
}

export interface RecruitmentContract {
  id: string;
  contract_number: string;
  client_name: string;
  client_phone: string;
  maid_name: string;
  maid_passport: string;
  nationality: string;
  musaned_number: string;
  external_office: string;
  stage: 'عقود جديدة' | 'مساند' | 'تفويض' | 'تفييز' | 'تذكرة' | 'وصول' | 'مكتمل' | 'مرتجع';
  warranty_status: 'نشط' | 'منتهي' | 'غير مطبق';
  payment_status: 'تم الدفع' | 'مدفوع جزئياً' | 'معلق';
  amount: number;
  created_at: string;
  branch: string;
  companyId?: CompanyId;
}

export interface RentContract {
  id: string;
  contract_number: string;
  client_name: string;
  client_phone: string;
  maid_name: string;
  nationality: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  monthly_cost: number;
  total_amount: number;
  status: 'جديد' | 'نشط' | 'بانتظار التوقيع' | 'تم تسليم العاملة' | 'مكتمل' | 'تم النقل' | 'ملغي';
  payment_status: 'معلق' | 'تم الدفع' | 'بانتظار التحويل';
  marketer: string;
  branch: string;
  companyId?: CompanyId;
}

export interface ShelterItem {
  id: string;
  maid_name: string;
  passport: string;
  nationality: string;
  contract_ref: string;
  client_name: string;
  shelter_location: string;
  status: 'داخل الإيواء' | 'خارج الإيواء' | 'متاح للنقل' | 'مرحلة الترحيل' | 'تم الترحيل';
  days_in_shelter: number;
  catering_meals_count: number;
  work_willingness: 'ترغب بالعمل' | 'لا ترغب بالعمل' | 'غير محدد';
  companyId?: CompanyId;
}

export interface EmployeeDocument {
  id: string;
  title: string;
  category: 'هوية/إقامة' | 'جواز سفر' | 'عقد عمل' | 'مؤهل دراسي' | 'شهادة صحية' | 'ترخيص عمل' | 'بنكي' | 'اتفاقية قانونية' | 'أخرى';
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'ساري' | 'قريب الانتهاء' | 'منتهي' | 'مفقود';
  verified: boolean;
  version: number;
  fileUrl?: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  national_id: string;
  hire_date: string;
  job_title: string;
  department: string;
  status: 'نشط' | 'إجازة' | 'معطل' | 'نهاية خدمة';
  salary: number;
  branch: string;
  allowances?: number;
  basicSalary?: number;
  companyId?: CompanyId;
  costCenter?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  bankIban?: string;
  bankName?: string;
  documents?: EmployeeDocument[];
  leaveBalance?: number;
  performanceScore?: number;
}

export interface AccountNode {
  code: string;
  name: string;
  type: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات';
  balance: number;
  children_count?: number;
  companyId?: CompanyId;
}

/* ATS & Candidate Types */
export type CandidateStage =
  | 'تقديم جديد'
  | 'فرز أولى'
  | 'مؤهل' | 'مقابلة أولى'
  | 'اختبار تقني'
  | 'المقابلة النهائية'
  | 'عرض عمل'
  | 'قبول العرض'
  | 'ما قبل الانضمام'
  | 'تأشيرة وتذكرة'
  | 'وصول وانضمام'
  | 'مرفوض';

export interface Candidate {
  id: string;
  candidateCode: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  appliedPosition: string;
  targetCompanyId: CompanyId;
  targetBranch: string;
  stage: CandidateStage;
  aiScore: number; // 0 - 100
  experienceYears: number;
  education: string;
  expectedSalary: number;
  source: 'موقع الشركة' | 'مكتب خارجي' | 'وكيل' | 'معرض توظيف' | 'تطبيق جوال';
  externalOfficeName?: string;
  agentName?: string;
  cvUrl?: string;
  appliedDate: string;
}

/* International Office & Agency Types */
export interface ExternalOffice {
  id: string;
  officeName: string;
  country: 'الفلبين' | 'إثيوبيا' | 'الهند' | 'كينيا' | 'أوغندا' | 'سريلانكا';
  countryCode: string;
  managerName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  activeCandidatesCount: number;
  arrivedCountCount: number;
  rating: number; // 1 - 5
  authorizedCompanies: CompanyId[];
}

/* Microsoft Integration Types */
export interface MsProjectTask {
  id: string;
  taskName: string;
  companyId: CompanyId;
  assignedResource: string;
  startDate: string;
  endDate: string;
  progressPercent: number;
  status: 'قيد التنفيذ' | 'مكتمل' | 'متأخر' | 'لم يبدأ';
  milestone: boolean;
}

export interface PowerBiDashboardItem {
  id: string;
  title: string;
  category: 'تنفيذي' | 'محاسبة' | 'موارد بشرية' | 'توظيف ATS' | 'عمليات';
  reportUrl: string;
  datasetName: string;
  rlsApplied: boolean;
  lastSyncTime: string;
}

/* Audit Log Type */
export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actionType:
    | 'تسجيل دخول'
    | 'تبديل شركة'
    | 'محاكاة موظف'
    | 'تعديل راتب'
    | 'إصدار فاتورة'
    | 'حذف مستند'
    | 'اعتماد عرض'
    | 'تصدير بيانات'
    | 'طباعة تقرير'
    | 'تغيير إعدادات ZATCA'
    | 'إنشاء قيد محاسبي';
  companyId: CompanyId;
  branchName: string;
  ipAddress: string;
  details: string;
  impersonatedEmployeeId?: string;
}

/* RBAC & Governance Types */
export type RoleType =
  | 'SUPER_ADMIN'
  | 'GROUP_ADMIN'
  | 'GROUP_FINANCE'
  | 'GROUP_HR'
  | 'COMPANY_ADMIN'
  | 'COMPANY_MANAGER'
  | 'BRANCH_MANAGER'
  | 'FINANCE_MANAGER'
  | 'ACCOUNTANT'
  | 'HR_MANAGER'
  | 'HR_OFFICER'
  | 'PAYROLL'
  | 'RECRUITMENT_MANAGER'
  | 'RECRUITER'
  | 'PROJECT_MANAGER'
  | 'EMPLOYEE'
  | 'AUDITOR'
  | 'EXTERNAL_OFFICE'
  | 'AGENT'
  | 'PROCUREMENT_MANAGER'
  | 'OPERATIONS_OFFICER'
  | 'VIEWER';

export type PermissionScope = 'GROUP' | 'COMPANY' | 'BRANCH' | 'DEPARTMENT' | 'OWN';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'approve'
  | 'post'
  | 'cancel'
  | 'export'
  | 'print'
  | 'download'
  | 'share'
  | 'delete'
  | 'multi_approve';

export interface UserPermission {
  module: string;
  actions: PermissionAction[];
  scope: PermissionScope;
  companyId?: CompanyId;
}

/* Multi-Approval Rule */
export interface ApprovalRule {
  id: string;
  module: string;
  condition: string; // e.g. 'amount > 100000'
  requiredApprovers: number;
  approverRoles: RoleType[];
  currentApprovals: { userId: string; userName: string; approvedAt: string }[];
  status: 'pending' | 'partially_approved' | 'fully_approved' | 'rejected';
}

/* Document Numbering & Sequence Config */
export interface DocumentSequence {
  id: string;
  companyId: CompanyId;
  documentType: 'INV' | 'REC' | 'PAY' | 'JV' | 'CN' | 'DN' | 'PO' | 'PR' | 'HR' | 'EMP' | 'CONTRACT' | 'PROJECT';
  prefix: string; // e.g. SAF-INV-
  currentNumber: number;
  digits: number; // e.g. 6 -> 000001
}

/* E-Commerce & Online Store Integration Types */
export interface EcommerceStore {
  id: string;
  name: string;
  platform: 'سلة (Salla)' | 'زد (Zid)' | 'شوبيفاي (Shopify)' | 'ووكومرس (WooCommerce)' | 'بوابة الدفع (Moyasar)';
  companyId: CompanyId;
  storeUrl: string;
  status: 'متصل' | 'معطل' | 'جاري المزامنة' | 'خطأ اتصال';
  lastSyncTime: string;
  syncedOrdersCount: number;
  syncedProductsCount: number;
  webhookStatus: 'نشط' | 'متوقف';
  autoSyncOrders: boolean;
  autoSyncInventory: boolean;
}

export interface EcommerceStoreOrder {
  id: string;
  storeId: string;
  platform: string;
  externalOrderNo: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  totalAmount: number;
  paymentStatus: 'مدفوع' | 'بانتظار السداد' | 'مسترجع';
  orderStatus: 'جديد' | 'قيد التنفيذ' | 'مكتمل' | 'ملغي';
  createdAt: string;
}

