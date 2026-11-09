-- ==============================================================================
-- MIGRATION: 20260816000000_enterprise_master_schema_v2.sql
-- Master Enterprise Schema for Khalid Al-Sulaim ERP System
-- Multi-Company Architecture (SAF, YAQ, TOP, DAR, GRP) with Complete RLS & Audit
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. COMPANIES & BRANCHES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(50) PRIMARY KEY, -- 'SAF', 'YAQ', 'TOP', 'DAR', 'GRP'
    code VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    cr_number VARCHAR(100),
    tax_number VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) REFERENCES public.companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    manager_name VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, code)
);

-- ==============================================================================
-- 2. CRM & CLIENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    client_no VARCHAR(50) UNIQUE,
    client_number VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    national_id VARCHAR(50),
    city VARCHAR(100) DEFAULT 'الرياض',
    address TEXT,
    email VARCHAR(100),
    account_code VARCHAR(50),
    client_activity VARCHAR(255),
    last_activity VARCHAR(255),
    added_by VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    status VARCHAR(50) DEFAULT 'نشط',
    type VARCHAR(50) DEFAULT 'شخص',
    rating INT DEFAULT 5,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    orders_count INT DEFAULT 0,
    active_orders INT DEFAULT 0,
    recruitment_contracts INT DEFAULT 0,
    rent_contracts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 3. CVS (CANDIDATES & RESUMES) & RECRUITMENT ATS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    cv_code VARCHAR(50) UNIQUE NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    job VARCHAR(100) NOT NULL,
    passport_number VARCHAR(100) NOT NULL,
    age INT,
    experience_years INT DEFAULT 0,
    salary NUMERIC(10, 2) DEFAULT 1500.00,
    marital_status VARCHAR(50),
    religion VARCHAR(50),
    skills TEXT[],
    photo_url TEXT,
    video_url TEXT,
    external_office VARCHAR(255),
    external_office_id UUID,
    type VARCHAR(50) DEFAULT 'توسط',
    status VARCHAR(50) DEFAULT 'متاح', -- 'متاح', 'محجوز', 'تم التعاقد', 'مرفوض', 'معلق'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 4. CONTRACTS & PIPELINES (RECRUITMENT & RENT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    musaned_number VARCHAR(100),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    cv_id UUID REFERENCES public.cvs(id) ON DELETE SET NULL,
    maid_name VARCHAR(255) NOT NULL,
    maid_passport VARCHAR(100),
    nationality VARCHAR(100) NOT NULL,
    external_office VARCHAR(255),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 14500.00,
    tax_amount NUMERIC(15, 2) DEFAULT 2175.00,
    total_amount NUMERIC(15, 2) DEFAULT 16675.00,
    stage VARCHAR(50) DEFAULT 'عقود جديدة', -- 'عقود جديدة', 'مساند', 'تفويض', 'تفييز', 'تذكرة', 'وصول', 'مكتمل', 'مرتجع'
    warranty_status VARCHAR(50) DEFAULT 'نشط',
    payment_status VARCHAR(50) DEFAULT 'تم الدفع',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.rent_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_months INT DEFAULT 1,
    monthly_cost NUMERIC(15, 2) DEFAULT 3450.00,
    total_amount NUMERIC(15, 2) DEFAULT 3450.00,
    deposit_amount NUMERIC(15, 2) DEFAULT 500.00,
    status VARCHAR(50) DEFAULT 'نشط',
    payment_status VARCHAR(50) DEFAULT 'تم الدفع',
    marketer VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 5. ORDERS & DISPATCH
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    maid_name VARCHAR(255),
    nationality VARCHAR(100),
    passport_number VARCHAR(100),
    request_type VARCHAR(50) DEFAULT 'حسب المواصفات',
    status VARCHAR(50) DEFAULT 'جديد',
    timer_status VARCHAR(50) DEFAULT 'عادي',
    deadline VARCHAR(50) DEFAULT '24 ساعة',
    contract_status VARCHAR(50) DEFAULT 'بدون عقد',
    responsible_employee VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    office_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 6. FINANCE, ACCOUNTING & ZATCA PHASE 2
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    code VARCHAR(50) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    category VARCHAR(50) NOT NULL, -- 'أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'مصروفات'
    parent_code VARCHAR(50),
    balance NUMERIC(18, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'SAR',
    is_header BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS public.company_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    entry_number VARCHAR(100) NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    entry_type VARCHAR(50) DEFAULT 'MANUAL', -- 'MANUAL', 'AUTOMATIC', 'CLOSING', 'REVERSAL'
    source_module VARCHAR(100) DEFAULT 'GENERAL_LEDGER',
    source_reference VARCHAR(100),
    description TEXT NOT NULL,
    total_debit NUMERIC(18, 2) NOT NULL,
    total_credit NUMERIC(18, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'POSTED', -- 'DRAFT', 'POSTED', 'CANCELLED'
    branch_name VARCHAR(100) DEFAULT 'فرع الرياض',
    cost_center_code VARCHAR(50),
    created_by VARCHAR(150) NOT NULL,
    approved_by VARCHAR(150),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, entry_number)
);

CREATE TABLE IF NOT EXISTS public.company_journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_id UUID REFERENCES public.company_journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit NUMERIC(18, 2) DEFAULT 0.00,
    credit NUMERIC(18, 2) DEFAULT 0.00,
    cost_center_code VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.zatca_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_type VARCHAR(50) DEFAULT 'SIMPLIFIED', -- 'STANDARD', 'SIMPLIFIED', 'CREDIT_NOTE', 'DEBIT_NOTE'
    issue_date DATE DEFAULT CURRENT_DATE,
    issue_time TIME DEFAULT CURRENT_TIME,
    client_name VARCHAR(255) NOT NULL,
    client_vat_number VARCHAR(50),
    client_national_id VARCHAR(50),
    subtotal NUMERIC(15, 2) NOT NULL,
    vat_amount NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    qr_code_payload TEXT,
    cryptographic_stamp TEXT,
    zatca_status VARCHAR(50) DEFAULT 'CLEARED', -- 'REPORTED', 'CLEARED', 'REJECTED'
    xml_hash TEXT,
    contract_ref VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    voucher_no VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'قبض', -- 'قبض', 'صرف'
    date DATE DEFAULT CURRENT_DATE,
    payee_payer VARCHAR(255) NOT NULL,
    treasury VARCHAR(150) DEFAULT 'الصندوق الرئيسي',
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'معتمد',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    manager_name VARCHAR(150),
    budget NUMERIC(15, 2) DEFAULT 0.00,
    actual_spent NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, code)
);

-- ==============================================================================
-- 7. HR, PAYROLL & EMPLOYEE DIGITAL FILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    national_id VARCHAR(50) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    hire_date DATE NOT NULL,
    basic_salary NUMERIC(15, 2) NOT NULL,
    allowances NUMERIC(15, 2) DEFAULT 0.00,
    salary NUMERIC(15, 2) NOT NULL,
    iban VARCHAR(50),
    bank_name VARCHAR(100),
    leave_balance INT DEFAULT 30,
    status VARCHAR(50) DEFAULT 'نشط', -- 'نشط', 'إجازة', 'نهاية خدمة', 'معلق'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    emp_no VARCHAR(50),
    employee_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT 'عام',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    date DATE DEFAULT CURRENT_DATE,
    check_in VARCHAR(50),
    check_out VARCHAR(50),
    status VARCHAR(50) DEFAULT 'حاضر',
    work_hours NUMERIC(5, 2) DEFAULT 8.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    leave_type VARCHAR(50) NOT NULL, -- 'سنوية', 'مرضية', 'طارئة', 'بدون راتب'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'بانتظار الاعتماد', -- 'معتمد', 'مرفوض', 'بانتظار الاعتماد'
    approved_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    month_year VARCHAR(20) NOT NULL, -- '2026-08'
    total_basic NUMERIC(18, 2) NOT NULL,
    total_allowances NUMERIC(18, 2) NOT NULL,
    total_deductions NUMERIC(18, 2) NOT NULL,
    total_net NUMERIC(18, 2) NOT NULL,
    employees_count INT NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'APPROVED', 'PROCESSED'
    wps_file_url TEXT,
    approved_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 8. SHELTER, CUSTODIES & COMPLAINTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shelter_records (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    passport VARCHAR(100) NOT NULL,
    client_name VARCHAR(255),
    contract_ref VARCHAR(100),
    shelter_location VARCHAR(255) DEFAULT 'مقر الإيواء الرئيسي - الرياض',
    days_in_shelter INT DEFAULT 1,
    catering_meals_count INT DEFAULT 3,
    work_willingness VARCHAR(100) DEFAULT 'ترغب بالعمل',
    status VARCHAR(50) DEFAULT 'داخل الإيواء',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.complaints (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
    ticket_no VARCHAR(100) UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    contract_ref VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'عادي',
    status VARCHAR(50) DEFAULT 'جديدة',
    sla_hours_left INT DEFAULT 24,
    assigned_agent VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.custodies (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
    custody_code VARCHAR(50),
    item_name VARCHAR(255),
    custody_type VARCHAR(100) DEFAULT 'عينية',
    amount_or_item VARCHAR(255),
    employee_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) DEFAULT 'الفرع الرئيسي',
    received_date DATE DEFAULT CURRENT_DATE,
    serial_number VARCHAR(100),
    estimated_value NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'قيد الاستخدام',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 9. AUDIT LOGS & NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    user_name VARCHAR(150) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES & SCHEMA GRANTS
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'companies', 'branches', 'clients', 'cvs', 'contracts', 'rent_contracts', 'orders',
      'accounts', 'company_journal_entries', 'company_journal_lines', 'zatca_invoices',
      'vouchers', 'cost_centers', 'employees', 'attendances', 'leave_requests', 'payroll_runs',
      'shelter_records', 'complaints', 'custodies', 'activity_logs', 'system_notifications',
      'system_users', 'system_settings', 'rent_packages'
    )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_access_%I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "allow_all_access_%I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
