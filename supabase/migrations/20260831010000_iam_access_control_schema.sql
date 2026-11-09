-- ============================================================================
-- KHALID AL-SULAIM GROUP ERP - ENTERPRISE IAM & MULTI-COMPANY ACCESS CONTROL
-- Migration: 20260831010000_iam_access_control_schema.sql
-- Architecture Blueprint: Khalid_ERP_Access_Control_Plan_AR.docx
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANTS (المستأجرون)
CREATE TABLE IF NOT EXISTS public.iam_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COMPANIES (الشركات)
CREATE TABLE IF NOT EXISTS public.iam_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.iam_tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    cr_number VARCHAR(50),
    vat_number VARCHAR(50),
    logo_url TEXT,
    primary_color VARCHAR(50),
    is_group_parent BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BRANCHES & LOCATIONS (الفروع والمواقع)
CREATE TABLE IF NOT EXISTS public.iam_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_main_branch BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- 4. DEPARTMENTS (الأقسام)
CREATE TABLE IF NOT EXISTS public.iam_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.iam_branches(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.iam_departments(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_type VARCHAR(50) DEFAULT 'تشغيلي', -- HR, Finance, Operations, Procurement, IT, Management
    manager_id UUID,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USERS (سجل المستخدمين المركزي)
CREATE TABLE IF NOT EXISTS public.iam_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id VARCHAR(100) UNIQUE, -- Supabase auth.users ID
    employee_number VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    job_title VARCHAR(150),
    account_type VARCHAR(50) DEFAULT 'Employee', -- Group Super Admin, Board, Company Admin, Branch Manager, Department Manager, Employee, Auditor, Shared Services
    status VARCHAR(50) DEFAULT 'نشط', -- نشط, معلق, موقوف, منتهي الصلاحية
    mfa_enabled BOOLEAN DEFAULT TRUE,
    mfa_method VARCHAR(50) DEFAULT 'Google Authenticator',
    biometric_enabled BOOLEAN DEFAULT FALSE,
    biometric_type VARCHAR(50) DEFAULT 'Touch ID',
    session_timeout_minutes INT DEFAULT 30,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEMBERSHIPS (عضويات المستخدم ونطاق الوصول للشركات)
CREATE TABLE IF NOT EXISTS public.iam_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE CASCADE,
    branch_scope JSONB DEFAULT '["*"]'::jsonb, -- Array of branch IDs or ["*"] for all branches
    department_scope JSONB DEFAULT '["*"]'::jsonb, -- Array of department IDs or ["*"] for all departments
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'نشط', -- نشط, غير نشط, مجمد
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, company_id)
);

-- 7. ROLES (الأدوار الهرمية)
CREATE TABLE IF NOT EXISTS public.iam_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE CASCADE, -- NULL for Global Group roles
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    role_type VARCHAR(50) DEFAULT 'Company', -- Global, Company, Department
    is_system_role BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PERMISSIONS (كتالوج الصلاحيات الدقيقة)
CREATE TABLE IF NOT EXISTS public.iam_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. employee.salary.read, invoice.approve
    resource VARCHAR(100) NOT NULL, -- employee, invoice, payment, tender, etc.
    action VARCHAR(50) NOT NULL, -- read, create, update, delete, approve, export, print
    name VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL, -- HR, Finance, Procurement, Operations, ZATCA, IAM, etc.
    sensitivity_level VARCHAR(50) DEFAULT 'عادي', -- عادي, متوسط, عالي الحساسية, سري للغاية
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ROLE PERMISSIONS (مصفوفة ربط الأدوار بالصلاحيات)
CREATE TABLE IF NOT EXISTS public.iam_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.iam_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.iam_permissions(id) ON DELETE CASCADE,
    constraints_json JSONB DEFAULT '{}'::jsonb, -- e.g. {"max_amount": 100000, "only_own_records": true}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (role_id, permission_id)
);

-- 10. USER ROLES (إسناد الأدوار للمستخدمين مع نطاق العضوية)
CREATE TABLE IF NOT EXISTS public.iam_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.iam_memberships(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.iam_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.iam_users(id),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, membership_id, role_id)
);

-- 11. DELEGATIONS (التفويضات المؤقتة والإجازات)
CREATE TABLE IF NOT EXISTS public.iam_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.iam_roles(id) ON DELETE SET NULL,
    permissions_scope JSONB DEFAULT '["*"]'::jsonb,
    reason TEXT NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'نشط', -- نشط, منتهي, ملغي
    approved_by UUID REFERENCES public.iam_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SOD RULES (قواعد فصل المهام المتعارضة)
CREATE TABLE IF NOT EXISTS public.iam_sod_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    permission_a VARCHAR(100) NOT NULL, -- e.g. vendor.create
    permission_b VARCHAR(100) NOT NULL, -- e.g. payment.release
    risk_level VARCHAR(50) DEFAULT 'حرج', -- منخفض, متوسط, عالي, حرج
    mitigation_control TEXT,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SOD VIOLATIONS & EXCEPTIONS (تجاوزات ورصد تعارضات SoD)
CREATE TABLE IF NOT EXISTS public.iam_sod_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    sod_rule_id UUID REFERENCES public.iam_sod_rules(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'مرصود', -- مرصود, استثناء معتمد, تم تصحيحه
    exception_approved_by UUID REFERENCES public.iam_users(id),
    exception_expiry TIMESTAMPTZ,
    notes TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ACCESS REQUESTS (طلبات الصلاحيات والتعيين)
CREATE TABLE IF NOT EXISTS public.iam_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE CASCADE,
    requested_roles JSONB DEFAULT '[]'::jsonb,
    requested_permissions JSONB DEFAULT '[]'::jsonb,
    justification TEXT NOT NULL,
    department_manager_status VARCHAR(50) DEFAULT 'قيد المراجعة',
    security_admin_status VARCHAR(50) DEFAULT 'قيد المراجعة',
    final_status VARCHAR(50) DEFAULT 'قيد المراجعة', -- قيد المراجعة, معتمد, مرفوض
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. ACCESS REVIEWS & CERTIFICATIONS (حملات المراجعة الدورية)
CREATE TABLE IF NOT EXISTS public.iam_access_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(255) NOT NULL,
    quarter VARCHAR(20) NOT NULL, -- e.g. Q3-2026
    reviewer_id UUID REFERENCES public.iam_users(id),
    company_id UUID REFERENCES public.iam_companies(id),
    total_users_reviewed INT DEFAULT 0,
    revoked_permissions_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'مكتملة', -- جارية, مكتملة, متأخرة
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. ACTIVE SESSIONS (الجلسات والأجهزة)
CREATE TABLE IF NOT EXISTS public.iam_user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.iam_users(id) ON DELETE CASCADE,
    active_company_id UUID REFERENCES public.iam_companies(id) ON DELETE SET NULL,
    session_token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_type VARCHAR(50) DEFAULT 'سطح المكتب',
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'نشطة', -- نشطة, منتهية, ملغاة إجبارياً
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AUDIT LOGS (سجل التدقيق الشامل غير القابل للتعديل)
CREATE TABLE IF NOT EXISTS public.iam_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.iam_users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES public.iam_companies(id) ON DELETE SET NULL,
    company_code VARCHAR(50),
    action VARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, COMPANY_SWITCH, ROLE_CHANGE, EXPORT, READ_SENSITIVE, SOD_BLOCKED
    resource VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    result VARCHAR(50) NOT NULL, -- SUCCESS, FORBIDDEN, FAILED
    severity VARCHAR(50) DEFAULT 'معلومات', -- معلومات, تحذير, خطر أمني
    ip_address VARCHAR(50),
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for high-performance security checks
CREATE INDEX IF NOT EXISTS idx_iam_memberships_user_company ON public.iam_memberships(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_iam_role_permissions_role ON public.iam_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_iam_user_roles_user ON public.iam_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_iam_audit_logs_actor_time ON public.iam_audit_logs(actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iam_audit_logs_company ON public.iam_audit_logs(company_code, created_at DESC);

-- ============================================================================
-- SEED INITIAL FOUNDATIONAL IAM DATA
-- ============================================================================

-- 1. Create Main Tenant
INSERT INTO public.iam_tenants (id, code, name, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'ALSULAIM-HOLDING', 'مجموعة خالد السليم القابضة', 'نشط')
ON CONFLICT (code) DO NOTHING;

-- 2. Create the 5 Group Companies
INSERT INTO public.iam_companies (id, tenant_id, code, legal_name, commercial_name, cr_number, vat_number, primary_color, is_group_parent, status)
VALUES 
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'SAF', 'شركة السفير الماسي للاستقدام', 'السفير الماسي', '1010123456', '310123456700003', '#0284c7', FALSE, 'نشط'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'YAQ', 'شركة ياقوت نجد للاستقدام', 'ياقوت نجد', '1010234567', '310234567800003', '#b91c1c', FALSE, 'نشط'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'TOP', 'شركة توباز للاستقدام', 'توباز للاستقدام', '1010345678', '310345678900003', '#0d9488', FALSE, 'نشط'),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'DAR', 'دار الرواد للاستقدام', 'دار الرواد', '1010456789', '310456789000003', '#7c3aed', FALSE, 'نشط'),
('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'KAS', 'مؤسسة خالد عبدالعزيز السليم للتجارة', 'شركة كاس للتجارة والمقاولات', '1010789234', '310284759200003', '#d97706', FALSE, 'نشط')
ON CONFLICT (code) DO NOTHING;

-- 3. Create Core Roles
INSERT INTO public.iam_roles (id, code, name, description, role_type, is_system_role)
VALUES
('33333333-3333-3333-3333-333333333331', 'GROUP_SUPER_ADMIN', 'مدير النظام المركزي للمجموعة', 'صلاحيات تقنية وأمنية عليا على مستوى كافة الشركات', 'Global', TRUE),
('33333333-3333-3333-3333-333333333332', 'GROUP_BOARD_EXEC', 'مجلس الإدارة والقيادة التنفيذية', 'لوحات مؤشرات تجميعية ورقابة عليا دون صلاحيات تشغيلية مباشرة', 'Global', TRUE),
('33333333-3333-3333-3333-333333333333', 'COMPANY_ADMIN', 'المدير التنفيذي للشركة', 'إدارة كاملة لعمليات ومستخدمي وإعدادات شركة واحدة محددة', 'Company', TRUE),
('33333333-3333-3333-3333-333333333334', 'BRANCH_MANAGER', 'مدير الفرع / الموقع', 'إدارة العمليات والموظفين والطلبات داخل الفرع المسند فقط', 'Company', TRUE),
('33333333-3333-3333-3333-333333333335', 'DEPT_HR_MANAGER', 'مدير الموارد البشرية', 'إدارة شؤون الموظفين، الرواتب، الإجازات، والتوظيف بالشركة', 'Department', TRUE),
('33333333-3333-3333-3333-333333333336', 'DEPT_FINANCE_MANAGER', 'المدير المالي', 'إدارة الحسابات، القيود، الفواتير، ZATCA، والاعتمادات المالية', 'Department', TRUE),
('33333333-3333-3333-3333-333333333337', 'DEPT_PROCUREMENT_SPECIALIST', 'أخصائي المشتريات والمنافسات', 'إدارة كراسات اعتماد، الموردين، وجداول الكميات والتسعير', 'Department', TRUE),
('33333333-3333-3333-3333-333333333338', 'STANDARD_EMPLOYEE', 'موظف تشغيلي', 'أقل نطاق وصول مطلوب للقيام بالمهام اليومية المباشرة', 'Department', TRUE),
('33333333-3333-3333-3333-333333333339', 'EXTERNAL_AUDITOR', 'مراجع حسابات ورقابي', 'صلاحية قراءة فقط وسجلات تدقيق لنطاق زمني محدد', 'Global', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. Create Core Permissions Catalog
INSERT INTO public.iam_permissions (code, resource, action, name, module, sensitivity_level)
VALUES
('dashboard.view', 'dashboard', 'read', 'عرض لوحة المؤشرات التشغيلية', 'Dashboard', 'عادي'),
('group.dashboard.view', 'group_dashboard', 'read', 'عرض لوحة المؤشرات التجميعية للمجموعة', 'Dashboard', 'سري للغاية'),
('employee.read', 'employee', 'read', 'استعراض سجلات الموظفين', 'HR', 'عادي'),
('employee.salary.read', 'employee', 'read', 'الاطلاع على رواتب الموظفين والبدلات', 'HR', 'سري للغاية'),
('employee.create', 'employee', 'create', 'إضافة موظف جديد', 'HR', 'متوسط'),
('employee.edit', 'employee', 'update', 'تعديل بيانات موظف', 'HR', 'متوسط'),
('invoice.read', 'invoice', 'read', 'استعراض الفواتير الضريبية', 'Finance', 'عادي'),
('invoice.create', 'invoice', 'create', 'إنشاء فاتورة ضريبية', 'Finance', 'متوسط'),
('invoice.approve', 'invoice', 'approve', 'اعتماد الفواتير الضريبية ZATCA', 'Finance', 'عالي الحساسية'),
('payment.release', 'payment', 'release', 'إطلاق وصرف الدفعات المالية', 'Finance', 'حرج'),
('vendor.create', 'vendor', 'create', 'إنشاء مورد جديد', 'Procurement', 'متوسط'),
('vendor.manage', 'vendor', 'update', 'إدارة واعتماد الموردين', 'Procurement', 'عالي الحساسية'),
('tender.manage', 'tender', 'update', 'إدارة كراسات منافسات اعتماد', 'Procurement', 'متوسط'),
('boq.price', 'boq', 'update', 'تسعير جداول الكميات واعتماد الهوامش', 'Procurement', 'عالي الحساسية'),
('report.export', 'report', 'export', 'تصدير التقارير المالية والتشغيلية', 'Reports', 'عالي الحساسية'),
('iam.manage', 'iam', 'manage', 'إدارة المستخدمين والصلاحيات والأمان', 'IAM', 'حرج'),
('audit.read', 'audit', 'read', 'الاطلاع على سجلات التدقيق والامتثال', 'IAM', 'سري للغاية')
ON CONFLICT (code) DO NOTHING;

-- 5. Create Core SoD Rules (Separation of Duties)
INSERT INTO public.iam_sod_rules (code, name, description, permission_a, permission_b, risk_level, mitigation_control)
VALUES
('SOD-001', 'فصل إنشاء المورد عن صرف الدفعات', 'يمنع جمع صلاحية إضافة مورد جديد مع صلاحية إطلاق الدفعات المالية لمنع الاحتيال', 'vendor.create', 'payment.release', 'حرج', 'تطلب مراجعة من مراجع مالي مستقل'),
('SOD-002', 'فصل إنشاء الفاتورة عن اعتمادها', 'يمنع قيام نفس المحاسب بإنشاء الفاتورة واعتمادها رسمياً', 'invoice.create', 'invoice.approve', 'عالي', 'يجب اعتماد الفاتورة من المدير المالي'),
('SOD-003', 'فصل إدارة الرواتب عن صرف الحوالات', 'يمنع جمع إعداد مسيرات الرواتب مع صلاحية إطلاق التحويلات البنكية', 'employee.salary.read', 'payment.release', 'حرج', 'مطابقة شهرية من المدقق الداخلي')
ON CONFLICT (code) DO NOTHING;
