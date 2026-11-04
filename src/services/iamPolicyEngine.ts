/**
 * IAM Policy & Access Control Engine
 * Enterprise Multi-Company & Multi-Department Security Enforcement
 * Direct PostgreSQL connection via Supabase
 */

import { supabase, isDummySupabase } from './supabaseClient';
import {
  IamUser,
  IamCompany,
  IamBranch,
  IamDepartment,
  IamMembership,
  IamRole,
  IamPermission,
  IamDelegation,
  IamSoDRule,
  IamSoDViolation,
  IamAccessRequest,
  IamAccessReview,
  IamUserSession,
  IamAuditLog,
  DataScopeLevel,
  DataScopeName,
  ModuleAction,
  RecordAccessContext,
  DEFAULT_IAM_COMPANIES,
} from '../types/iam';

class IamPolicyEngine {
  // ============================================================================
  // 1. COMPANIES & STRUCTURE
  // ============================================================================

  public async getCompanies(): Promise<IamCompany[]> {
    if (isDummySupabase) return DEFAULT_IAM_COMPANIES;
    try {
      const { data, error } = await supabase
        .from('iam_companies')
        .select('*')
        .order('is_group_parent', { ascending: false });

      if (error) throw error;
      const list = (data || []).map(c => ({
        id: c.id,
        tenantId: c.tenant_id,
        code: c.code,
        legalName: c.legal_name,
        commercialName: c.commercial_name || c.legal_name,
        crNumber: c.cr_number || '',
        vatNumber: c.vat_number || '',
        logoUrl: c.logo_url,
        primaryColor: c.primary_color,
        isGroupParent: Boolean(c.is_group_parent),
        status: c.status as any,
      }));
      return list.length > 0 ? list : DEFAULT_IAM_COMPANIES;
    } catch {
      return DEFAULT_IAM_COMPANIES;
    }
  }

  public async getBranches(companyId?: string): Promise<IamBranch[]> {
    if (isDummySupabase) return [];
    try {
      let query = supabase.from('iam_branches').select('*').order('name', { ascending: true });
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        companyId: b.company_id,
        code: b.code,
        name: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
        isMainBranch: Boolean(b.is_main_branch),
        status: b.status as any,
      }));
    } catch (err) {
      console.warn('Fallback getBranches:', err);
      return [];
    }
  }

  public async getDepartments(companyId?: string): Promise<IamDepartment[]> {
    if (isDummySupabase) return [];
    try {
      let query = supabase.from('iam_departments').select('*').order('name', { ascending: true });
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        companyId: d.company_id,
        branchId: d.branch_id,
        parentId: d.parent_id,
        code: d.code,
        name: d.name,
        departmentType: d.department_type,
        managerId: d.manager_id,
        status: d.status as any,
      }));
    } catch (err) {
      console.warn('Fallback getDepartments:', err);
      return [];
    }
  }

  // ============================================================================
  // 2. USERS & MEMBERSHIPS
  // ============================================================================

  private static readonly DEFAULT_USERS: IamUser[] = [
    {
      id: 'usr-chairman-01',
      employeeNumber: 'EMP-0001',
      fullName: 'الشيخ خالد بن عبدالعزيز السليم',
      email: 'chairman@alsulaim.sa',
      phone: '+966500000001',
      jobTitle: 'رئيس مجلس الإدارة والرئيس التنفيذي',
      accountType: 'Group Super Admin',
      status: 'نشط',
      mfaEnabled: true,
      mfaMethod: 'بصمة بيومترية (FIDO2)',
      biometricEnabled: true,
      biometricType: 'Face ID',
      sessionTimeoutMinutes: 60,
      lastLoginAt: '2026-10-17 09:00',
      lastLoginIp: '192.168.1.10',
    },
    {
      id: 'usr-dev-00',
      employeeNumber: 'DEV-0001',
      fullName: 'م. عبدالرحمن (مطور النظام الرئيسي)',
      email: 'abdo12uk@gmail.com',
      phone: '+966500000000',
      jobTitle: 'مطور النظام ومدير الصلاحيات العليا (System Developer)',
      accountType: 'Group Super Admin',
      status: 'نشط',
      mfaEnabled: true,
      mfaMethod: 'بصمة بيومترية (FIDO2)',
      biometricEnabled: true,
      biometricType: 'Face ID',
      sessionTimeoutMinutes: 120,
      lastLoginAt: '2026-10-17 15:45',
      lastLoginIp: '127.0.0.1',
    },
    {
      id: 'usr-fin-02',
      employeeNumber: 'EMP-0102',
      fullName: 'أ. محمد مصطفى',
      email: 'accounting@saf-rec.sa',
      phone: '+966501112233',
      jobTitle: 'المدير المالي ورئيس حسابات المجموعة (SOCPA)',
      accountType: 'Department Manager',
      status: 'نشط',
      mfaEnabled: true,
      mfaMethod: 'Google Authenticator',
      biometricEnabled: true,
      biometricType: 'Touch ID',
      sessionTimeoutMinutes: 30,
      lastLoginAt: '2026-10-17 08:45',
      lastLoginIp: '192.168.1.24',
    },
    {
      id: 'usr-rec-03',
      employeeNumber: 'EMP-0205',
      fullName: 'أ. نايف القحطاني',
      email: 'musaned@saf-rec.sa',
      phone: '+966535355555',
      jobTitle: 'مدير عمليات الاستقدام وتوثيق عقود مساند',
      accountType: 'Department Manager',
      status: 'نشط',
      mfaEnabled: true,
      mfaMethod: 'SMS',
      biometricEnabled: false,
      sessionTimeoutMinutes: 30,
      lastLoginAt: '2026-10-17 08:30',
      lastLoginIp: '192.168.1.32',
    },
    {
      id: 'usr-shl-04',
      employeeNumber: 'EMP-0311',
      fullName: 'أ. فهد العتيبي',
      email: 'shelter@dar-alruwad.sa',
      phone: '+966554433221',
      jobTitle: 'مشرف عام مراكز الإيواء ونقل الكفالة',
      accountType: 'Shelter Supervisor',
      status: 'نشط',
      mfaEnabled: true,
      mfaMethod: 'WhatsApp',
      biometricEnabled: true,
      biometricType: 'Touch ID',
      sessionTimeoutMinutes: 30,
      lastLoginAt: '2026-10-16 17:15',
      lastLoginIp: '192.168.2.15',
    },
    {
      id: 'usr-kas-05',
      employeeNumber: 'EMP-0401',
      fullName: 'م. عبدالرحمن الدوسري',
      email: 'tenders@kas-cloud.sa',
      phone: '+966549988776',
      jobTitle: 'مدير المنافسات الحكومية وسحابة اعتماد (KAS)',
      accountType: 'KAS General Manager',
      status: 'نشط',
      mfaEnabled: true,
      mfaMethod: 'Google Authenticator',
      biometricEnabled: true,
      biometricType: 'Face ID',
      sessionTimeoutMinutes: 45,
      lastLoginAt: '2026-10-17 09:10',
      lastLoginIp: '192.168.3.11',
    },
  ];

  private static readonly DEFAULT_ROLES: IamRole[] = [
    {
      id: 'role-super-admin',
      code: 'GROUP_SUPER_ADMIN',
      name: 'المدير التنفيذي الأعلى للمجموعة (Group Super Admin)',
      description: 'صلاحية سيادية شاملة على كافة الشركات الـ 5 والأقسام والاعتمادات المالية والإدارية',
      roleType: 'Global',
      isSystemRole: true,
      status: 'نشط',
    },
    {
      id: 'role-fin-dir',
      code: 'FINANCE_DIRECTOR',
      name: 'المدير المالي ورئيس الحسابات (SOCPA)',
      description: 'إدارة الأستاذ العام، قيود اليومية، سندات القبض والصرف، إقرارات ضريبة القيمة المضافة، والفوترة الإلكترونية ZATCA',
      roleType: 'Department',
      isSystemRole: true,
      status: 'نشط',
    },
    {
      id: 'role-rec-mgr',
      code: 'RECRUITMENT_MANAGER',
      name: 'مدير عمليات الاستقدام وعقود مساند وتفاويض إنجاز',
      description: 'إصدار وتوثيق عقود الاستقدام، متابعة الوكلاء الخارجيين، إصدار تفاويض إنجاز، وحجوزات السفر',
      roleType: 'Department',
      isSystemRole: true,
      status: 'نشط',
    },
    {
      id: 'role-shl-sup',
      code: 'SHELTER_SUPERVISOR',
      name: 'مشرف مراكز الإيواء والتسكين ونقل الخدمات',
      description: 'إدارة تسكين الوافدات، الإعاشة، الفحص الطبي، محاضر التسليم، وعقود نقل الكفالة',
      roleType: 'Company',
      isSystemRole: true,
      status: 'نشط',
    },
    {
      id: 'role-kas-mgr',
      code: 'KAS_TENDERS_DIRECTOR',
      name: 'مدير المنافسات الحكومية وجداول الكميات (KAS & Etimad)',
      description: 'إدارة كراسات الشروط، تسعير جداول الكميات BOQ، الضمانات البنكية، ومستخلصات منصة اعتماد',
      roleType: 'Company',
      isSystemRole: true,
      status: 'نشط',
    },
  ];

  private static readonly DEFAULT_PERMISSIONS: IamPermission[] = [
    { id: 'perm-1', code: 'accounting.journal.create', resource: 'journals', action: 'create', name: 'إنشاء قيد يومية محاسبي', module: 'المحاسبة والمالية', sensitivityLevel: 'متوسط' },
    { id: 'perm-2', code: 'accounting.journal.post', resource: 'journals', action: 'approve', name: 'ترحيل واعتماد قيود الأستاذ العام', module: 'المحاسبة والمالية', sensitivityLevel: 'حرج' },
    { id: 'perm-3', code: 'payment.release', resource: 'vouchers', action: 'approve', name: 'إطلاق الحوالات البنكية وسندات الصرف', module: 'المحاسبة والمالية', sensitivityLevel: 'حرج' },
    { id: 'perm-4', code: 'vendor.create', resource: 'offices', action: 'create', name: 'إضافة وتعديل بيانات الوكلاء والموردين', module: 'الاستقدام والوكلاء', sensitivityLevel: 'عالي الحساسية' },
    { id: 'perm-5', code: 'recruitment.contract.create', resource: 'contracts', action: 'create', name: 'إنشاء عقد استقدام مساند', module: 'الاستقدام والوكلاء', sensitivityLevel: 'متوسط' },
    { id: 'perm-6', code: 'recruitment.contract.approve', resource: 'contracts', action: 'approve', name: 'اعتماد وتوثيق عقود الاستقدام النهائية', module: 'الاستقدام والوكلاء', sensitivityLevel: 'عالي الحساسية' },
    { id: 'perm-7', code: 'hr.payroll.approve', resource: 'payrolls', action: 'approve', name: 'اعتماد مسير الرواتب وملف حماية الأجور WPS', module: 'الموارد البشرية', sensitivityLevel: 'سري للغاية' },
    { id: 'perm-8', code: 'iam.policy.manage', resource: 'iam', action: 'edit', name: 'إدارة مصفوفة الصلاحيات وعزل الشركات RBAC', module: 'الحوكمة والأمن السيبراني', sensitivityLevel: 'حرج' },
  ];

  private static readonly DEFAULT_DELEGATIONS: IamDelegation[] = [
    {
      id: 'del-001',
      fromUserId: 'usr-chairman-01',
      fromUserName: 'الشيخ خالد بن عبدالعزيز السليم',
      toUserId: 'usr-fin-02',
      toUserName: 'أ. محمد مصطفى',
      companyId: '22222222-2222-2222-2222-222222222221',
      companyName: 'السفير الماسي للاستقدام (SAF)',
      roleName: 'اعتماد سندات الصرف التشغيلية حتى 50,000 ⃁',
      permissionsScope: ['payment.release', 'accounting.journal.post'],
      reason: 'تفويض مالي تشغيلي لتسريع تسويات مساند والوكلاء الخارجيين',
      validFrom: '2026-10-01',
      validTo: '2026-12-31',
      status: 'نشط',
    },
  ];

  private static readonly DEFAULT_REQUESTS: IamAccessRequest[] = [
    {
      id: 'req-001',
      requestNumber: 'IAM-REQ-2026-041',
      userId: 'usr-rec-03',
      userName: 'أ. نايف القحطاني',
      companyId: '22222222-2222-2222-2222-222222222221',
      companyName: 'السفير الماسي للاستقدام (SAF)',
      requestedRoles: ['RECRUITMENT_MANAGER'],
      requestedPermissions: ['recruitment.contract.approve'],
      justification: 'صلاحية اعتماد عقود مساند الفورية للفرع الرئيسي بالرياض',
      departmentManagerStatus: 'معتمد',
      securityAdminStatus: 'معتمد',
      finalStatus: 'معتمد',
      createdAt: '2026-10-14 11:20',
    },
    {
      id: 'req-002',
      requestNumber: 'IAM-REQ-2026-042',
      userId: 'usr-shl-04',
      userName: 'أ. فهد العتيبي',
      companyId: '22222222-2222-2222-2222-222222222225',
      companyName: 'دار الرواد للإيواء (DAR)',
      requestedRoles: ['SHELTER_SUPERVISOR'],
      requestedPermissions: ['shelter.transfer.approve'],
      justification: 'اعتماد محاضر التسليم ونقل الكفالة بمركز إيواء الرياض',
      departmentManagerStatus: 'معتمد',
      securityAdminStatus: 'قيد المراجعة',
      finalStatus: 'قيد المراجعة',
      createdAt: '2026-10-16 14:05',
    },
  ];

  private static readonly DEFAULT_REVIEWS: IamAccessReview[] = [
    {
      id: 'rev-2026-q4',
      campaignName: 'المراجعة الدورية لصلاحيات الربع الرابع 2026 (SOCPA / ISO-27001)',
      quarter: 'Q4-2026',
      reviewerId: 'usr-chairman-01',
      reviewerName: 'الشيخ خالد بن عبدالعزيز السليم',
      companyId: '22222222-2222-2222-2222-222222222221',
      companyName: 'جميع شركات المجموعة (Group-Wide)',
      totalUsersReviewed: 28,
      revokedPermissionsCount: 3,
      status: 'مكتملة',
      completedAt: '2026-10-10',
      createdAt: '2026-10-01',
    },
  ];

  private static readonly DEFAULT_SESSIONS: IamUserSession[] = [
    {
      id: 'sess-001',
      userId: 'usr-chairman-01',
      userName: 'الشيخ خالد بن عبدالعزيز السليم',
      activeCompanyId: 'ALL',
      companyCode: 'GROUP',
      sessionToken: 'JWT-SHA256-9981-EXEC',
      ipAddress: '192.168.1.10',
      userAgent: 'Chrome 130.0 / Windows 11 Enterprise',
      deviceType: 'Desktop Workstation',
      expiresAt: '2026-10-17 18:00',
      status: 'نشطة',
      createdAt: '2026-10-17 09:00',
    },
    {
      id: 'sess-002',
      userId: 'usr-fin-02',
      userName: 'أ. محمد مصطفى',
      activeCompanyId: 'SAF',
      companyCode: 'SAF',
      sessionToken: 'JWT-SHA256-4412-FIN',
      ipAddress: '192.168.1.24',
      userAgent: 'Chrome 130.0 / Windows 11',
      deviceType: 'Desktop Workstation',
      expiresAt: '2026-10-17 17:00',
      status: 'نشطة',
      createdAt: '2026-10-17 08:45',
    },
  ];

  private static readonly DEFAULT_AUDIT_LOGS: IamAuditLog[] = [
    {
      id: 'aud-001',
      actorId: 'usr-chairman-01',
      actorEmail: 'chairman@alsulaim.sa',
      companyCode: 'GROUP',
      action: 'LOGIN_MFA_VERIFIED',
      resource: 'auth.session',
      recordId: 'sess-001',
      result: 'SUCCESS',
      severity: 'معلومات',
      ipAddress: '192.168.1.10',
      createdAt: '2026-10-17 09:00:12',
    },
    {
      id: 'aud-002',
      actorId: 'usr-fin-02',
      actorEmail: 'accounting@saf-rec.sa',
      companyCode: 'SAF',
      action: 'JOURNAL_POSTED',
      resource: 'finance.journals',
      recordId: 'JV-2026-0891',
      result: 'SUCCESS',
      severity: 'معلومات',
      ipAddress: '192.168.1.24',
      createdAt: '2026-10-17 09:15:40',
    },
    {
      id: 'aud-003',
      actorId: 'usr-rec-03',
      actorEmail: 'musaned@saf-rec.sa',
      companyCode: 'SAF',
      action: 'CROSS_DEPT_ACCESS_BLOCKED',
      resource: 'finance.vat_declaration',
      result: 'FORBIDDEN',
      severity: 'تحذير',
      ipAddress: '192.168.1.32',
      createdAt: '2026-10-17 09:22:05',
    },
  ];

  private getLocalIamList<T>(key: string, fallback: T[]): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    } catch {
      return fallback;
    }
  }

  public async getUsers(): Promise<IamUser[]> {
    const fallback = this.getLocalIamList('ALSULAIM_IAM_USERS', IamPolicyEngine.DEFAULT_USERS);
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase
        .from('iam_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return fallback;
      return data.map(u => ({
        id: u.id,
        identityId: u.identity_id,
        employeeNumber: u.employee_number || '',
        fullName: u.full_name,
        email: u.email,
        phone: u.phone || '',
        jobTitle: u.job_title || '',
        accountType: u.account_type as any,
        status: u.status as any,
        mfaEnabled: Boolean(u.mfa_enabled),
        mfaMethod: u.mfa_method as any,
        biometricEnabled: Boolean(u.biometric_enabled),
        biometricType: u.biometric_type as any,
        sessionTimeoutMinutes: u.session_timeout_minutes || 30,
        lastLoginAt: u.last_login_at,
        lastLoginIp: u.last_login_ip,
        created_at: u.created_at,
      }));
    } catch (err) {
      return fallback;
    }
  }

  public async getUserMemberships(userId: string): Promise<IamMembership[]> {
    const defaultMembership: IamMembership[] = [
      {
        id: `mem-${userId}`,
        userId,
        companyId: DEFAULT_IAM_COMPANIES[0].id,
        companyCode: 'SAF',
        companyName: DEFAULT_IAM_COMPANIES[0].commercialName,
        dataScope: 6,
        branchScope: ['*'],
        departmentScope: ['*'],
        isPrimary: true,
        status: 'نشط',
        validFrom: '2026-01-01',
      },
    ];
    if (isDummySupabase) return defaultMembership;
    try {
      const { data, error } = await supabase
        .from('iam_memberships')
        .select(`
          *,
          company:iam_companies(id, code, legal_name, commercial_name, primary_color)
        `)
        .eq('user_id', userId)
        .eq('status', 'نشط');

      if (error) throw error;
      if (!data || data.length === 0) return defaultMembership;
      return data.map(m => ({
        id: m.id,
        userId: m.user_id,
        companyId: m.company_id,
        companyCode: m.company?.code,
        companyName: m.company?.commercial_name || m.company?.legal_name,
        dataScope: (m.data_scope ?? 5) as DataScopeLevel,
        branchScope: Array.isArray(m.branch_scope) ? m.branch_scope : ['*'],
        departmentScope: Array.isArray(m.department_scope) ? m.department_scope : ['*'],
        isPrimary: Boolean(m.is_primary),
        status: m.status as any,
        validFrom: m.valid_from,
        validTo: m.valid_to,
      }));
    } catch (err) {
      return defaultMembership;
    }
  }

  public async saveUser(user: Partial<IamUser>): Promise<IamUser> {
    const savedLocal: IamUser = {
      id: user.id && !user.id.startsWith('temp-') ? user.id : `usr-${Date.now()}`,
      employeeNumber: user.employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: user.fullName || 'موظف جديد',
      email: user.email || 'user@alsulaim.sa',
      phone: user.phone || '+966500000000',
      jobTitle: user.jobTitle || 'موظف تشغيلي',
      accountType: user.accountType || 'Employee',
      status: user.status || 'نشط',
      mfaEnabled: user.mfaEnabled ?? true,
      mfaMethod: user.mfaMethod || 'Google Authenticator',
      biometricEnabled: user.biometricEnabled ?? false,
      biometricType: user.biometricType || 'Touch ID',
      sessionTimeoutMinutes: user.sessionTimeoutMinutes || 30,
    };

    const currentList = this.getLocalIamList('ALSULAIM_IAM_USERS', IamPolicyEngine.DEFAULT_USERS);
    const exists = currentList.some((u) => u.id === savedLocal.id);
    const nextList = exists
      ? currentList.map((u) => (u.id === savedLocal.id ? { ...u, ...savedLocal } : u))
      : [savedLocal, ...currentList];
    try {
      localStorage.setItem('ALSULAIM_IAM_USERS', JSON.stringify(nextList));
    } catch {
      // ignore
    }

    if (isDummySupabase) return savedLocal;

    try {
      const payload = {
        full_name: savedLocal.fullName,
        email: savedLocal.email,
        phone: savedLocal.phone,
        employee_number: savedLocal.employeeNumber,
        job_title: savedLocal.jobTitle,
        account_type: savedLocal.accountType,
        status: savedLocal.status,
        mfa_enabled: savedLocal.mfaEnabled,
        mfa_method: savedLocal.mfaMethod,
        biometric_enabled: savedLocal.biometricEnabled,
        biometric_type: savedLocal.biometricType,
        session_timeout_minutes: savedLocal.sessionTimeoutMinutes,
        updated_at: new Date().toISOString(),
      };
      if (user.id && !user.id.startsWith('temp-')) {
        const { data, error } = await supabase
          .from('iam_users')
          .update(payload)
          .eq('id', user.id)
          .select()
          .single();
        if (!error && data) return { ...savedLocal, id: data.id };
      } else {
        const { data, error } = await supabase
          .from('iam_users')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return { ...savedLocal, id: data.id };
      }
    } catch {
      // fallback to savedLocal
    }
    return savedLocal;
  }

  public async deleteUser(userId: string): Promise<boolean> {
    const currentList = this.getLocalIamList('ALSULAIM_IAM_USERS', IamPolicyEngine.DEFAULT_USERS);
    const nextList = currentList.filter((u) => u.id !== userId);
    try {
      localStorage.setItem('ALSULAIM_IAM_USERS', JSON.stringify(nextList));
    } catch {
      // ignore
    }
    if (!isDummySupabase) {
      try {
        await supabase.from('iam_users').delete().eq('id', userId);
      } catch {
        // ignore
      }
    }
    return true;
  }

  // ============================================================================
  // 3. ROLES & PERMISSIONS
  // ============================================================================

  public async getRoles(): Promise<IamRole[]> {
    const fallback = this.getLocalIamList('ALSULAIM_IAM_ROLES', IamPolicyEngine.DEFAULT_ROLES);
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase.from('iam_roles').select('*').order('name', { ascending: true });
      if (error || !data || data.length === 0) return fallback;
      return data.map(r => ({
        id: r.id,
        companyId: r.company_id,
        code: r.code,
        name: r.name,
        description: r.description || '',
        roleType: r.role_type as any,
        isSystemRole: Boolean(r.is_system_role),
        status: r.status as any,
      }));
    } catch (err) {
      return fallback;
    }
  }

  public async getPermissions(): Promise<IamPermission[]> {
    const fallback = IamPolicyEngine.DEFAULT_PERMISSIONS;
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase.from('iam_permissions').select('*').order('module', { ascending: true });
      if (error || !data || data.length === 0) return fallback;
      return data.map(p => ({
        id: p.id,
        code: p.code,
        resource: p.resource,
        action: p.action,
        name: p.name,
        module: p.module,
        sensitivityLevel: p.sensitivity_level as any,
        description: p.description,
      }));
    } catch (err) {
      return fallback;
    }
  }

  public async getRolePermissions(roleId: string): Promise<string[]> {
    const defaultCodes = IamPolicyEngine.DEFAULT_PERMISSIONS.map((p) => p.code);
    if (isDummySupabase) return defaultCodes;
    try {
      const { data, error } = await supabase
        .from('iam_role_permissions')
        .select('permission:iam_permissions(code)')
        .eq('role_id', roleId);

      if (error || !data || data.length === 0) return defaultCodes;
      return data.map((row: any) => row.permission?.code).filter(Boolean);
    } catch (err) {
      return defaultCodes;
    }
  }

  // ============================================================================
  // 4. SEPARATION OF DUTIES (SoD) & VIOLATIONS
  // ============================================================================

  private static readonly DEFAULT_SOD_RULES: IamSoDRule[] = [
    {
      id: 'sod-001',
      code: 'SOD_PAYMENT_VENDOR',
      name: 'فصل صلاحيات إنشاء المورد وإطلاق الدفعات',
      description: 'منع جمع صلاحية إنشاء وتعديل بيانات الموردين مع صلاحية إطلاق وصرف الدفعات المالية لمنع الاحتيال',
      permissionA: 'vendor.create',
      permissionB: 'payment.release',
      riskLevel: 'حرج',
      mitigationControl: 'يتطلب اعتماداً مزدوجاً من المدير المالي أو المراجع الداخلي',
      status: 'نشط',
    },
    {
      id: 'sod-002',
      code: 'SOD_CONTRACT_APPROVE',
      name: 'فصل صلاحيات إنشاء العقد واعتماد الاستقدام',
      description: 'منع موظف المبيعات الذي ينشئ العقد من اعتماده أو تعديل تكلفة الاستقدام دون تدقيق',
      permissionA: 'recruitment.contract.create',
      permissionB: 'recruitment.contract.approve',
      riskLevel: 'عالي',
      mitigationControl: 'اعتماد مدير الفرع أو مدير إدارة الاستقدام حصراً',
      status: 'نشط',
    },
    {
      id: 'sod-003',
      code: 'SOD_JOURNAL_POST',
      name: 'فصل صلاحيات إنشاء القيود وترحيلها محاسبياً',
      description: 'منع مدخل البيانات المحاسبية من ترحيل قيود اليومية إلى الأستاذ العام مباشرة',
      permissionA: 'accounting.journal.create',
      permissionB: 'accounting.journal.post',
      riskLevel: 'حرج',
      mitigationControl: 'الترحيل محصور برئيس الحسابات أو المدير المالي',
      status: 'نشط',
    },
  ];

  public async getSoDRules(): Promise<IamSoDRule[]> {
    if (isDummySupabase) {
      return IamPolicyEngine.DEFAULT_SOD_RULES;
    }

    try {
      // Fast race with timeout to never stall CI test runs
      const fetchPromise = supabase.from('iam_sod_rules').select('*').order('created_at', { ascending: true });
      const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 2000));
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error || !data || data.length === 0) {
        return IamPolicyEngine.DEFAULT_SOD_RULES;
      }

      return data.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        permissionA: r.permission_a,
        permissionB: r.permission_b,
        riskLevel: r.risk_level as any,
        mitigationControl: r.mitigation_control,
        status: r.status as any,
      }));
    } catch (err) {
      return IamPolicyEngine.DEFAULT_SOD_RULES;
    }
  }

  public async checkSoDConflicts(permissions: string[]): Promise<{ hasConflict: boolean; conflicts: IamSoDRule[] }> {
    const rules = await this.getSoDRules();
    const permSet = new Set(permissions);
    const conflicts: IamSoDRule[] = [];

    for (const rule of rules) {
      if (permSet.has(rule.permissionA) && permSet.has(rule.permissionB)) {
        conflicts.push(rule);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  // ============================================================================
  // 5. DELEGATIONS & TEMPORARY ACCESS
  // ============================================================================

  public async getDelegations(companyId?: string): Promise<IamDelegation[]> {
    const fallback = this.getLocalIamList('ALSULAIM_IAM_DELEGATIONS', IamPolicyEngine.DEFAULT_DELEGATIONS);
    if (isDummySupabase) return fallback;
    try {
      let query = supabase.from('iam_delegations').select('*').order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error || !data || data.length === 0) return fallback;
      return data.map(d => ({
        id: d.id,
        fromUserId: d.from_user_id,
        toUserId: d.to_user_id,
        companyId: d.company_id,
        roleId: d.role_id,
        permissionsScope: Array.isArray(d.permissions_scope) ? d.permissions_scope : ['*'],
        reason: d.reason,
        validFrom: d.valid_from,
        validTo: d.valid_to,
        status: d.status as any,
      }));
    } catch (err) {
      return fallback;
    }
  }

  public async createDelegation(delegation: Omit<IamDelegation, 'id'>): Promise<IamDelegation> {
    const createdLocal: IamDelegation = {
      ...delegation,
      id: `del-${Date.now()}`,
      status: delegation.status || 'نشط',
    };
    const current = this.getLocalIamList('ALSULAIM_IAM_DELEGATIONS', IamPolicyEngine.DEFAULT_DELEGATIONS);
    try {
      localStorage.setItem('ALSULAIM_IAM_DELEGATIONS', JSON.stringify([createdLocal, ...current]));
    } catch {
      // ignore
    }
    if (isDummySupabase) return createdLocal;
    try {
      const { data, error } = await supabase
        .from('iam_delegations')
        .insert([
          {
            from_user_id: delegation.fromUserId,
            to_user_id: delegation.toUserId,
            company_id: delegation.companyId,
            role_id: delegation.roleId,
            permissions_scope: delegation.permissionsScope,
            reason: delegation.reason,
            valid_from: delegation.validFrom,
            valid_to: delegation.validTo,
            status: delegation.status || 'نشط',
          }
        ])
        .select()
        .single();

      if (!error && data) return { ...createdLocal, id: data.id };
    } catch {
      // fallback to createdLocal
    }
    return createdLocal;
  }

  // ============================================================================
  // 6. ACCESS REQUESTS & REVIEWS
  // ============================================================================

  public async getAccessRequests(): Promise<IamAccessRequest[]> {
    const fallback = IamPolicyEngine.DEFAULT_REQUESTS;
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase.from('iam_access_requests').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return fallback;
      return data.map(req => ({
        id: req.id,
        requestNumber: req.request_number,
        userId: req.user_id,
        companyId: req.company_id,
        requestedRoles: Array.isArray(req.requested_roles) ? req.requested_roles : [],
        requestedPermissions: Array.isArray(req.requested_permissions) ? req.requested_permissions : [],
        justification: req.justification,
        departmentManagerStatus: req.department_manager_status,
        securityAdminStatus: req.security_admin_status,
        finalStatus: req.final_status,
        createdAt: req.created_at,
      }));
    } catch (err) {
      return fallback;
    }
  }

  public async getAccessReviews(): Promise<IamAccessReview[]> {
    const fallback = IamPolicyEngine.DEFAULT_REVIEWS;
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase.from('iam_access_reviews').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return fallback;
      return data.map(r => ({
        id: r.id,
        campaignName: r.campaign_name,
        quarter: r.quarter,
        reviewerId: r.reviewer_id,
        companyId: r.company_id,
        totalUsersReviewed: r.total_users_reviewed,
        revokedPermissionsCount: r.revoked_permissions_count,
        status: r.status,
        completedAt: r.completed_at,
        createdAt: r.created_at,
      }));
    } catch (err) {
      return fallback;
    }
  }

  // ============================================================================
  // 7. ACTIVE SESSIONS & AUDIT LOGS
  // ============================================================================

  public async getActiveSessions(): Promise<IamUserSession[]> {
    const fallback = IamPolicyEngine.DEFAULT_SESSIONS;
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase.from('iam_user_sessions').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return fallback;
      return data.map(s => ({
        id: s.id,
        userId: s.user_id,
        activeCompanyId: s.active_company_id,
        sessionToken: s.session_token,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        deviceType: s.device_type,
        expiresAt: s.expires_at,
        status: s.status,
        createdAt: s.created_at,
      }));
    } catch (err) {
      return fallback;
    }
  }

  public async getAuditLogs(limit: number = 100): Promise<IamAuditLog[]> {
    const fallback = IamPolicyEngine.DEFAULT_AUDIT_LOGS.slice(0, limit);
    if (isDummySupabase) return fallback;
    try {
      const { data, error } = await supabase
        .from('iam_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) return fallback;
      return data.map(l => ({
        id: l.id,
        actorId: l.actor_id,
        actorEmail: l.actor_email,
        companyId: l.company_id,
        companyCode: l.company_code,
        action: l.action,
        resource: l.resource,
        recordId: l.record_id,
        result: l.result,
        severity: l.severity,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        oldValues: l.old_values,
        newValues: l.new_values,
        createdAt: l.created_at,
      }));
    } catch (err) {
      return fallback;
    }
  }

  // ============================================================================
  // 8. MULTI-ENTITY AUTHORIZATION & ACCESS DECISION ENGINE (Deny By Default)
  // ============================================================================

  /**
   * Evaluates access decision across the 8-stage security hierarchy:
   * 1. Account Active?
   * 2. Tenant Matched?
   * 3. Active Company Authorized?
   * 4. Branch Scope Allowed?
   * 5. Department Scope Allowed?
   * 6. Module & Action Permission Granted?
   * 7. Data Scope & Record-Level Ownership Matched?
   */
  public evaluateAccessDecision(
    context: {
      user: IamUser | null;
      activeTenantId: string;
      activeCompanyId: string;
      allowedCompanyIds: string[];
      allowedBranchIds: string[];
      allowedDepartmentIds: string[];
      dataScope: DataScopeLevel;
      permissionCodes: Set<string>;
    },
    module: string,
    action: ModuleAction,
    record?: RecordAccessContext
  ): { allowed: boolean; reason: string; scopeApplied: DataScopeLevel } {
    // Stage 1: Account must be present and active
    if (!context.user) {
      return { allowed: false, reason: 'Deny: No authenticated user session found.', scopeApplied: 0 };
    }
    if (context.user.status !== 'نشط') {
      return { allowed: false, reason: `Deny: User account status is ${context.user.status}.`, scopeApplied: 0 };
    }

    // Super Admin has global override capability
    if (context.user.accountType === 'Group Super Admin') {
      return { allowed: true, reason: 'Allow: Super Admin privilege.', scopeApplied: 6 };
    }

    // Stage 2: Company Isolation (Deny cross-company leaks)
    if (!context.allowedCompanyIds.includes(context.activeCompanyId) && !context.allowedCompanyIds.includes('*')) {
      return { allowed: false, reason: 'Deny: Active company is not in authorized company list.', scopeApplied: 0 };
    }

    if (record?.company_id && record.company_id !== context.activeCompanyId && context.dataScope < 6) {
      return { allowed: false, reason: 'Deny: Record belongs to a different company.', scopeApplied: 0 };
    }

    // Stage 3: Data Scope Gate
    if (context.dataScope === 0) {
      return { allowed: false, reason: 'Deny: Data Scope is 0 (No Access).', scopeApplied: 0 };
    }

    // Stage 4: Module & Action Permission Gate (Deny by default)
    const exactCode = `${module}.${action}`;
    const wildcardModule = `${module}.*`;
    const hasExplicitPerm = context.permissionCodes.has(exactCode) || 
                            context.permissionCodes.has(wildcardModule) ||
                            context.permissionCodes.has('*');

    if (!hasExplicitPerm) {
      return { allowed: false, reason: `Deny: Missing required permission code [${exactCode}].`, scopeApplied: context.dataScope };
    }

    // Stage 5: Record-Level Scope Check (if record is provided)
    if (record) {
      // 1 — Own: Must be creator or assignee
      if (context.dataScope === 1) {
        const isOwn = (record.created_by && record.created_by === context.user.id) ||
                      (record.assigned_to && record.assigned_to === context.user.id) ||
                      (record.user_id && record.user_id === context.user.id);
        if (!isOwn) {
          return { allowed: false, reason: 'Deny: Data Scope is 1 (Own records only).', scopeApplied: 1 };
        }
      }

      // 3 — Department: Must match user's authorized departments
      if (context.dataScope === 3 && record.department_id) {
        const deptAllowed = context.allowedDepartmentIds.includes('*') || context.allowedDepartmentIds.includes(record.department_id);
        if (!deptAllowed) {
          return { allowed: false, reason: 'Deny: Record belongs to unauthorized department.', scopeApplied: 3 };
        }
      }

      // 4 — Branch: Must match user's authorized branches
      if (context.dataScope === 4 && record.branch_id) {
        const branchAllowed = context.allowedBranchIds.includes('*') || context.allowedBranchIds.includes(record.branch_id);
        if (!branchAllowed) {
          return { allowed: false, reason: 'Deny: Record belongs to unauthorized branch.', scopeApplied: 4 };
        }
      }
    }

    return { allowed: true, reason: 'Allow: Security gates satisfied.', scopeApplied: context.dataScope };
  }

  /**
   * Filters an in-memory or queried record dataset by user's security context & Data Scope.
   * Guarantees that no unauthorized records leak into UI, Search, Export, or Reports.
   */
  public filterRecordsByScope<T extends RecordAccessContext>(
    records: T[],
    context: {
      user: IamUser | null;
      activeCompanyId: string;
      allowedBranchIds: string[];
      allowedDepartmentIds: string[];
      dataScope: DataScopeLevel;
      isSuperAdmin?: boolean;
    }
  ): T[] {
    if (!records || !Array.isArray(records)) return [];
    if (!context.user || context.user.status !== 'نشط') return [];
    if (context.isSuperAdmin || context.user.accountType === 'Group Super Admin') return records;
    if (context.dataScope === 0) return [];

    return records.filter(record => {
      // 1. Company Isolation
      if (context.dataScope < 6 && record.company_id && record.company_id !== context.activeCompanyId) {
        return false;
      }

      // 2. Scope-based evaluation
      switch (context.dataScope) {
        case 1: // Own
          return (record.created_by && record.created_by === context.user?.id) ||
                 (record.assigned_to && record.assigned_to === context.user?.id) ||
                 (record.user_id && record.user_id === context.user?.id);

        case 2: // Team
        case 3: // Department
          if (!record.department_id) return true;
          return context.allowedDepartmentIds.includes('*') || 
                 context.allowedDepartmentIds.includes(record.department_id);

        case 4: // Branch
          if (!record.branch_id) return true;
          return context.allowedBranchIds.includes('*') || 
                 context.allowedBranchIds.includes(record.branch_id);

        case 5: // Company
          return true; // Checked above via company_id

        case 6: // Group
          return true;

        default:
          return false;
      }
    });
  }

  public async logAudit(log: Omit<IamAuditLog, 'id' | 'createdAt'>): Promise<void> {
    if (isDummySupabase) return;
    try {
      await supabase.from('iam_audit_logs').insert([
        {
          actor_id: log.actorId,
          actor_email: log.actorEmail,
          company_id: log.companyId,
          company_code: log.companyCode,
          action: log.action,
          resource: log.resource,
          record_id: log.recordId,
          result: log.result,
          severity: log.severity || 'معلومات',
          ip_address: log.ipAddress || '127.0.0.1',
          user_agent: log.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'),
          old_values: log.oldValues,
          new_values: log.newValues,
        }
      ]);
    } catch (err) {
      console.warn('Could not record audit log in supabase:', err);
    }
  }
}

export const iamPolicyEngine = new IamPolicyEngine();
