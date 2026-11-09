/**
 * IAM & Multi-Company / Multi-Department Access Control Types
 * Based on Khalid_ERP_Access_Control_Plan_AR.docx blueprint.
 */

export type AccountType = 
  | 'Group Super Admin'
  | 'Board / Group Executive'
  | 'Company Admin'
  | 'Branch Manager'
  | 'Department Manager'
  | 'Employee'
  | 'Auditor'
  | 'Shared Services'
  | 'Shelter Supervisor'
  | 'KAS General Manager'
  | 'KAS Tenders Specialist';

export type UserStatus = 'نشط' | 'معلق' | 'موقوف' | 'منتهي الصلاحية';

export type DataScopeLevel = 
  | 0 // 0 — No Access: لا وصول
  | 1 // 1 — Own: سجلات المستخدم ومعاملاته فقط
  | 2 // 2 — Team: فريق العمل المحدد
  | 3 // 3 — Department: القسم المحدد
  | 4 // 4 — Branch: الفرع المحدد
  | 5 // 5 — Company: كامل الشركة
  | 6; // 6 — Group: جميع شركات المجموعة، للإدارة العليا المخولة فقط

export type DataScopeName = 
  | 'No Access'
  | 'Own'
  | 'Team'
  | 'Department'
  | 'Branch'
  | 'Company'
  | 'Group';

export type ModuleAction = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'print'
  | 'import'
  | 'assign'
  | 'archive'
  | 'restore';

export interface RecordAccessContext {
  tenant_id?: string;
  company_id?: string;
  branch_id?: string;
  department_id?: string;
  created_by?: string;
  assigned_to?: string;
  [key: string]: any;
}

export interface IamUser {
  id: string;
  identityId?: string;
  employeeNumber: string;
  fullName: string;
  username?: string;
  email: string;
  phone: string;
  jobTitle: string;
  accountType: AccountType;
  status: UserStatus;
  dataScope?: DataScopeLevel;
  branchId?: string;
  departmentId?: string;
  mfaEnabled: boolean;
  mfaMethod: 'Google Authenticator' | 'SMS' | 'WhatsApp' | 'Email' | 'بصمة بيومترية (FIDO2)';
  biometricEnabled: boolean;
  biometricType?: 'Touch ID' | 'Face ID' | 'بصمة مزدوجة';
  sessionTimeoutMinutes: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  created_at?: string;
  memberships?: IamMembership[];
}

export interface IamCompany {
  id: string;
  tenantId: string;
  code: string;
  legalName: string;
  commercialName: string;
  crNumber: string;
  vatNumber: string;
  logoUrl?: string;
  primaryColor?: string;
  isGroupParent: boolean;
  status: 'نشط' | 'موقوف';
}

export interface IamBranch {
  id: string;
  companyId: string;
  code: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  isMainBranch: boolean;
  status: 'نشط' | 'موقوف';
}

export interface IamDepartment {
  id: string;
  companyId: string;
  branchId?: string;
  parentId?: string;
  code: string;
  name: string;
  departmentType: 'HR' | 'Finance' | 'Operations' | 'Procurement' | 'IT' | 'Management' | 'Legal' | string;
  managerId?: string;
  status: 'نشط' | 'موقوف';
}

export interface IamMembership {
  id: string;
  userId: string;
  companyId: string;
  companyCode?: string;
  companyName?: string;
  dataScope: DataScopeLevel;
  dataScopeName?: DataScopeName;
  branchScope: string[]; // ["*"] or list of branch IDs
  departmentScope: string[]; // ["*"] or list of department IDs
  isPrimary: boolean;
  status: 'نشط' | 'غير نشط' | 'مجمد';
  validFrom: string;
  validTo?: string;
  roles?: IamRole[];
}

export interface IamRole {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  description: string;
  roleType: 'Global' | 'Company' | 'Department';
  isSystemRole: boolean;
  status: 'نشط' | 'موقوف';
  permissions?: IamPermission[];
}

export interface IamPermission {
  id: string;
  code: string;
  resource: string;
  action: string;
  name: string;
  module: string;
  sensitivityLevel: 'عادي' | 'متوسط' | 'عالي الحساسية' | 'سري للغاية' | 'حرج';
  description?: string;
}

export interface IamRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  constraintsJson?: Record<string, any>;
}

export interface IamDelegation {
  id: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  companyId: string;
  companyName?: string;
  roleId?: string;
  roleName?: string;
  permissionsScope: string[];
  reason: string;
  validFrom: string;
  validTo: string;
  status: 'نشط' | 'منتهي' | 'ملغي';
  approvedBy?: string;
}

export interface IamSoDRule {
  id: string;
  code: string;
  name: string;
  description: string;
  permissionA: string;
  permissionB: string;
  riskLevel: 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
  mitigationControl?: string;
  status: 'نشط' | 'معطل';
}

export interface IamSoDViolation {
  id: string;
  userId: string;
  userName?: string;
  sodRuleId: string;
  ruleName?: string;
  status: 'مرصود' | 'استثناء معتمد' | 'تم تصحيحه';
  exceptionApprovedBy?: string;
  exceptionExpiry?: string;
  notes?: string;
  detectedAt: string;
}

export interface IamAccessRequest {
  id: string;
  requestNumber: string;
  userId: string;
  userName?: string;
  companyId: string;
  companyName?: string;
  requestedRoles: string[];
  requestedPermissions: string[];
  justification: string;
  departmentManagerStatus: 'قيد المراجعة' | 'معتمد' | 'مرفوض';
  securityAdminStatus: 'قيد المراجعة' | 'معتمد' | 'مرفوض';
  finalStatus: 'قيد المراجعة' | 'معتمد' | 'مرفوض';
  createdAt: string;
}

export interface IamAccessReview {
  id: string;
  campaignName: string;
  quarter: string;
  reviewerId: string;
  reviewerName?: string;
  companyId: string;
  companyName?: string;
  totalUsersReviewed: number;
  revokedPermissionsCount: number;
  status: 'جارية' | 'مكتملة' | 'متأخرة';
  completedAt?: string;
  createdAt: string;
}

export interface IamUserSession {
  id: string;
  userId: string;
  userName?: string;
  activeCompanyId?: string;
  companyCode?: string;
  sessionToken: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  expiresAt: string;
  status: 'نشطة' | 'منتهية' | 'ملغاة إجبارياً';
  createdAt: string;
}

export interface IamAuditLog {
  id: string;
  actorId?: string;
  actorEmail: string;
  companyId?: string;
  companyCode?: string;
  action: string;
  resource: string;
  recordId?: string;
  result: 'SUCCESS' | 'FORBIDDEN' | 'FAILED';
  severity: 'معلومات' | 'تحذير' | 'خطر أمني';
  ipAddress?: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
}

export interface IamSessionContext {
  currentUser: IamUser | null;
  activeTenantId: string;
  activeCompanyId: string;
  activeCompany: IamCompany | null;
  allowedCompanyIds: string[];
  allowedBranchIds: string[];
  allowedDepartmentIds: string[];
  dataScope: DataScopeLevel;
  dataScopeName: DataScopeName;
  userMemberships: IamMembership[];
  activeMembership: IamMembership | null;
  activeRoles: IamRole[];
  permissionCodes: Set<string>;
  delegations: IamDelegation[];
  isSuperAdmin: boolean;
  isBoardExecutive: boolean;
  isCompanyAdmin: boolean;
  isBranchManager: boolean;
  isDepartmentManager: boolean;
  canSwitchCompany: boolean;
  switchCompany: (companyId: string) => Promise<boolean>;
  hasPermission: (permissionCode: string) => boolean;
  canPerform: (module: string, action: ModuleAction, recordContext?: RecordAccessContext) => boolean;
  canAccessBranch: (branchId: string) => boolean;
  canAccessDepartment: (deptId: string) => boolean;
  filterRecords: <T extends RecordAccessContext>(records: T[]) => T[];
  logAuditAction: (action: string, resource: string, result: 'SUCCESS' | 'FORBIDDEN' | 'FAILED', recordId?: string, details?: any) => Promise<void>;
}

export const DEFAULT_IAM_COMPANIES: IamCompany[] = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'SAF',
    legalName: 'شركة السفير الماسي للاستقدام',
    commercialName: 'السفير الماسي للاستقدام (SAF RC01)',
    crNumber: '1010123456',
    vatNumber: '310123456700003',
    primaryColor: '#0284c7',
    isGroupParent: false,
    status: 'نشط',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'YAQ',
    legalName: 'شركة الياقوت الشرقية للتشغيل والتأجير',
    commercialName: 'الياقوت الشرقية للتشغيل (YAQ RC02)',
    crNumber: '1010234567',
    vatNumber: '310234567800003',
    primaryColor: '#b91c1c',
    isGroupParent: false,
    status: 'نشط',
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'TOP',
    legalName: 'شركة توب تالنت الدولية للتوظيف',
    commercialName: 'توب تالنت الدولية للتوظيف (TOP RC03)',
    crNumber: '1010345678',
    vatNumber: '310345678900003',
    primaryColor: '#0d9488',
    isGroupParent: false,
    status: 'نشط',
  },
  {
    id: '22222222-2222-2222-2222-222222222224',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'KAS',
    legalName: 'مؤسسة كاس وسحابة اعتماد للمنافسات والتشغيل',
    commercialName: 'كاس للمنافسات والتشغيل (KAS RC04)',
    crNumber: '1010789234',
    vatNumber: '310284759200003',
    primaryColor: '#CFA64A',
    isGroupParent: false,
    status: 'نشط',
  },
  {
    id: '22222222-2222-2222-2222-222222222225',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'DAR',
    legalName: 'دار الرواد لمراكز الإيواء والتسكين والرعاية',
    commercialName: 'دار الرواد للإيواء ونقل الخدمات (DAR RC05)',
    crNumber: '1010998877',
    vatNumber: '310998877600003',
    primaryColor: '#047857',
    isGroupParent: false,
    status: 'نشط',
  },
];
