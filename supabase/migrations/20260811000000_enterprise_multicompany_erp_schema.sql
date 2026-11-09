-- Migration: 20260811_enterprise_multicompany_erp_schema.sql
-- Enterprise Multi-Company ERP + HRIS + ATS Platform Schema for Khalid Al-Sulaim Group

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE (Company Isolation Master)
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    logo_url TEXT,
    tax_number VARCHAR(50) NOT NULL UNIQUE,
    cr_number VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Seed 4 Companies + Group Master Entity
INSERT INTO public.companies (id, name, name_en, tax_number, cr_number, address, phone, email) VALUES
('all', 'خالد السليم للاستقدام والتشغيل', 'Khalid Al-Sulaim Group for Recruitment & Operations', '310099887766003', '1010998877', 'الرياض - طريق الملك فهد - البرج الموحد', '920001234', 'group@alsulaim.com.sa'),
('masi', 'شركة السفير الماسي', 'Al-Sfeer Al-Masi Company', '310123456700003', '1010123456', 'الرياض - حي الملز - شارع الستين', '0114001122', 'info@masi.com.sa'),
('yaqoot', 'شركة ياقوت نجد', 'Yaqoot Najd Company', '310234567800003', '1010234567', 'جدة - طريق المدينة المنورة', '0126002233', 'contact@yaqoot.com.sa'),
('topaz', 'شركة توباز للاستقدام', 'Topaz Recruitment Company', '310345678900003', '1010345678', 'الدمام - شارع الأشرعة', '0138003344', 'recruitment@topaz.com.sa'),
('ruwad', 'دار الرواد', 'Dar Al-Ruwad Entity', '310456789000003', '1010456789', 'الرياض - حي العليا', '0112004455', 'info@ruwad.com.sa')
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
tax_number = EXCLUDED.tax_number;

-- 2. COMPANY BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.company_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL,
    address TEXT,
    manager_name VARCHAR(255),
    cost_center_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, branch_code)
);

-- 3. COMPANY CHART OF ACCOUNTS & GENERAL LEDGER
CREATE TABLE IF NOT EXISTS public.company_chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- أصول, خصوم, حقوق ملكية, إيرادات, مصروفات
    parent_account_code VARCHAR(50),
    balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, account_code)
);

-- 4. ZATCA PHASE 2 E-INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.zatca_company_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_code VARCHAR(50),
    invoice_number VARCHAR(100) NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    client_name VARCHAR(255) NOT NULL,
    client_vat_number VARCHAR(50),
    subtotal NUMERIC(15, 2) NOT NULL,
    vat_amount NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    zatca_status VARCHAR(50) DEFAULT 'CLEARED', -- REPORTED, CLEARED, FAILED
    qr_code_tlv TEXT,
    invoice_hash TEXT,
    csid_certificate_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, invoice_number)
);

-- 5. COMPANY EMPLOYEES (HRIS 360 Digital Files)
CREATE TABLE IF NOT EXISTS public.company_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(50) NOT NULL,
    nationality VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    job_title VARCHAR(100),
    department VARCHAR(100),
    branch_name VARCHAR(100),
    cost_center VARCHAR(50),
    hire_date DATE NOT NULL,
    basic_salary NUMERIC(12, 2) NOT NULL,
    allowances NUMERIC(12, 2) DEFAULT 0.00,
    gross_salary NUMERIC(12, 2) NOT NULL,
    bank_name VARCHAR(100),
    bank_iban VARCHAR(50),
    status VARCHAR(50) DEFAULT 'نشط',
    leave_balance INT DEFAULT 30,
    performance_score INT DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, employee_code)
);

-- 6. EMPLOYEE DIGITAL DOCUMENTS (Document Center & Versioning)
CREATE TABLE IF NOT EXISTS public.employee_digital_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.company_employees(id) ON DELETE CASCADE,
    document_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- هوية/إقامة, جواز سفر, عقد عمل, شهادة صحية
    document_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'ساري',
    verified BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    file_url TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. WPS PAYROLL RECORDS
CREATE TABLE IF NOT EXISTS public.wps_payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    payroll_month VARCHAR(20) NOT NULL, -- e.g. 2026-08
    employee_id UUID REFERENCES public.company_employees(id) ON DELETE CASCADE,
    basic_paid NUMERIC(12, 2) NOT NULL,
    allowances_paid NUMERIC(12, 2) NOT NULL,
    deductions NUMERIC(12, 2) DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL,
    wps_file_generated BOOLEAN DEFAULT TRUE,
    payment_status VARCHAR(50) DEFAULT 'تم التحويل',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. 12-STAGE ATS CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.ats_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50),
    nationality VARCHAR(100),
    applied_position VARCHAR(150) NOT NULL,
    target_company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    stage VARCHAR(100) DEFAULT 'تقديم جديد', -- 12 stages
    ai_score INT DEFAULT 85,
    experience_years INT DEFAULT 0,
    education VARCHAR(255),
    expected_salary NUMERIC(10, 2),
    source VARCHAR(100), -- مكتب خارجي, وكيل, موقع
    external_office_name VARCHAR(255),
    agent_name VARCHAR(255),
    applied_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 9. EXTERNAL OFFICES (5 Countries International Recruitment)
CREATE TABLE IF NOT EXISTS public.external_recruitment_offices (
    id VARCHAR(50) PRIMARY KEY,
    office_name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL, -- الفلبين, إثيوبيا, الهند, كينيا, أوغندا
    country_code VARCHAR(10) NOT NULL,
    manager_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(100),
    license_number VARCHAR(100) UNIQUE NOT NULL,
    active_candidates_count INT DEFAULT 0,
    arrived_count INT DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 4.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. MICROSOFT INTEGRATION TASKS & POWER BI DASHBOARDS
CREATE TABLE IF NOT EXISTS public.ms_project_tasks (
    id VARCHAR(50) PRIMARY KEY,
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    assigned_resource VARCHAR(150),
    start_date DATE,
    end_date DATE,
    progress_percent INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'قيد التنفيذ',
    is_milestone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 11. SECURITY AUDIT LOGS (Admin Impersonation & Security Trail)
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(100) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL, -- محاكاة موظف, تبديل شركة, تعديل راتب
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_name VARCHAR(100),
    ip_address VARCHAR(50),
    details TEXT NOT NULL,
    impersonated_employee_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ----------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES FOR COMPANY DATA ISOLATION
-- ----------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_company_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wps_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users
CREATE POLICY "Allow public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow public read branches" ON public.company_branches FOR SELECT USING (true);
CREATE POLICY "Allow public read accounts" ON public.company_chart_of_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public read invoices" ON public.zatca_company_invoices FOR SELECT USING (true);
CREATE POLICY "Allow public read employees" ON public.company_employees FOR SELECT USING (true);
CREATE POLICY "Allow public read payrolls" ON public.wps_payroll_records FOR SELECT USING (true);
CREATE POLICY "Allow public read candidates" ON public.ats_candidates FOR SELECT USING (true);
CREATE POLICY "Allow public read ms_tasks" ON public.ms_project_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read audit_logs" ON public.system_audit_logs FOR SELECT USING (true);
