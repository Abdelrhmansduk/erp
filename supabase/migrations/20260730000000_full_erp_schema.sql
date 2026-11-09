-- ==============================================================================
-- FULL ERP PLATFORM SCHEMA & SEED FOR KHALID AL-SULAIM COMMERCIAL GROUP
-- Local Supabase / PostgreSQL Database Migration Script
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    cr_number VARCHAR(100),
    vat_number VARCHAR(100),
    tax_number VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    logo VARCHAR(255),
    logo_url TEXT,
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO public.companies (id, name, name_ar, name_en, cr_number, vat_number, tax_number, color) VALUES
  ('SAF', 'شركة السفير الماسي للاستقدام', 'شركة السفير الماسي للاستقدام', 'Al-Saffir Al-Masi Recruitment Co.', '1010992810', '310928374100003', '310928374100003', '#714B67'),
  ('YAQ', 'شركة ياقوت نجد للخدمات', 'شركة ياقوت نجد للخدمات', 'Yaqoot Najd Operations Co.', '1010882910', '310928374100004', '310928374100004', '#00A09D'),
  ('TOP', 'شركة توباز للتأجير والخدمات', 'شركة توباز للتأجير والخدمات', 'Topaz Rental & Services Co.', '1010773910', '310928374100005', '310928374100005', '#0f6b6e'),
  ('DAR', 'شركة دار الرواد للمقاولات', 'شركة دار الرواد للمقاولات', 'Dar Al-Ruwad Contracting Co.', '1010664910', '310928374100006', '310928374100006', '#005154')
ON CONFLICT (id) DO NOTHING;

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    client_no VARCHAR(50) UNIQUE NOT NULL,
    client_number VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    national_id VARCHAR(50),
    account_code VARCHAR(50),
    client_activity VARCHAR(255),
    last_activity VARCHAR(255),
    added_by VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    city VARCHAR(100) DEFAULT 'الرياض',
    status VARCHAR(50) DEFAULT 'نشط',
    type VARCHAR(50) DEFAULT 'شخص',
    orders_count INT DEFAULT 0,
    active_orders INT DEFAULT 0,
    recruitment_contracts INT DEFAULT 0,
    rent_contracts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. CVS (CANDIDATES & RESUMES) TABLE
CREATE TABLE IF NOT EXISTS public.cvs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    cv_code VARCHAR(50) UNIQUE NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    job VARCHAR(100) NOT NULL,
    passport_number VARCHAR(100) NOT NULL,
    age INT,
    salary NUMERIC(10, 2),
    external_office VARCHAR(255),
    type VARCHAR(50) DEFAULT 'توسط',
    status VARCHAR(50) DEFAULT 'متاح',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. RECRUITMENT CONTRACTS (MUSANED) TABLE
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    musaned_number VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    external_office VARCHAR(255),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 14500.00,
    stage VARCHAR(50) DEFAULT 'عقود جديدة',
    warranty_status VARCHAR(50) DEFAULT 'نشط',
    payment_status VARCHAR(50) DEFAULT 'تم الدفع',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. RENT CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS public.rent_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_months INT DEFAULT 1,
    monthly_cost NUMERIC(15, 2) NOT NULL DEFAULT 3450.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 3450.00,
    status VARCHAR(50) DEFAULT 'نشط',
    payment_status VARCHAR(50) DEFAULT 'تم الدفع',
    marketer VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
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

-- 7. SHELTER RECORDS TABLE
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

-- 8. EMPLOYEES & HR TABLE
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
    salary NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 9. BIOMETRIC ATTENDANCES TABLE
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    emp_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    check_in VARCHAR(50),
    check_out VARCHAR(50),
    status VARCHAR(50) DEFAULT 'حاضر',
    work_hours NUMERIC(5, 2) DEFAULT 8.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. CUSTODIES & ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.custodies (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
    item_name VARCHAR(255) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    received_date DATE NOT NULL,
    serial_number VARCHAR(100),
    estimated_value NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'في حوزة الموظف',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 11. COMPLAINTS & TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.complaints (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(50) DEFAULT 'SAF',
    ticket_no VARCHAR(100) UNIQUE NOT NULL,
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

-- 12. CHART OF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.company_chart_of_accounts_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    account_name_ar VARCHAR(255) NOT NULL,
    account_name_en VARCHAR(255) NOT NULL,
    account_category VARCHAR(50) NOT NULL,
    account_subcategory VARCHAR(100),
    parent_account_code VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'SAR',
    balance NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    is_header BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, account_code)
);

-- 13. DOUBLE ENTRY JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.company_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    entry_number VARCHAR(100) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    source_module VARCHAR(50) DEFAULT 'GENERAL_LEDGER',
    source_reference VARCHAR(100),
    description TEXT NOT NULL,
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'POSTED',
    branch_name VARCHAR(100) DEFAULT 'الفرع الرئيسي',
    cost_center_code VARCHAR(50),
    created_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, entry_number)
);

-- 14. COST CENTERS TABLE
CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent VARCHAR(100) NOT NULL,
    total_expenses NUMERIC(15, 2) DEFAULT 0.00,
    total_revenues NUMERIC(15, 2) DEFAULT 0.00,
    budget_limit NUMERIC(15, 2) DEFAULT 50000.00,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 15. ZATCA INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.zatca_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    invoice_number VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    invoice_type VARCHAR(50) DEFAULT 'B2B (فاتورة ضريبية)',
    amount NUMERIC(15, 2) NOT NULL,
    tax NUMERIC(15, 2) NOT NULL,
    zatca_status VARCHAR(100) DEFAULT 'تمت المشاركة (Clearance)',
    uuid VARCHAR(100) NOT NULL,
    hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS UNRESTRICTED READ POLICIES FOR ALL TABLES
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelter_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_chart_of_accounts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public select cvs" ON public.cvs FOR SELECT USING (true);
CREATE POLICY "Allow public select contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Allow public select rent_contracts" ON public.rent_contracts FOR SELECT USING (true);
CREATE POLICY "Allow public select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public select shelter_records" ON public.shelter_records FOR SELECT USING (true);
CREATE POLICY "Allow public select employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Allow public select attendances" ON public.attendances FOR SELECT USING (true);
CREATE POLICY "Allow public select custodies" ON public.custodies FOR SELECT USING (true);
CREATE POLICY "Allow public select complaints" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Allow public select coa" ON public.company_chart_of_accounts_v2 FOR SELECT USING (true);
CREATE POLICY "Allow public select journals" ON public.company_journal_entries FOR SELECT USING (true);
CREATE POLICY "Allow public select cost_centers" ON public.cost_centers FOR SELECT USING (true);
CREATE POLICY "Allow public select zatca" ON public.zatca_invoices FOR SELECT USING (true);

-- SEED INITIAL SEEDS FOR DEMO PLATFORM
INSERT INTO public.clients (client_no, name, phone, national_id, account_code, client_activity, branch, status) VALUES
  ('CLI-2026-0242', 'بندر صالح الهويريني', '0501234567', '1098765432', '110201', 'عقد استقدام ساري (مساند)', 'فرع الرياض', 'نشط'),
  ('CLI-2026-0243', 'سارة خالد الدوسري', '0559876543', '1087654321', '110202', 'عقد تأجير تشغيلي ساري', 'فرع جدة', 'نشط')
ON CONFLICT (client_no) DO NOTHING;

INSERT INTO public.employees (employee_code, name, national_id, job_title, department, branch, hire_date, salary, status) VALUES
  ('EMP-2026-001', 'محمد مصطفي', '1029384756', 'مدير الموارد البشرية', 'الموارد البشرية', 'الإدارة العامة', '2024-01-15', 14500.00, 'نشط'),
  ('EMP-2026-002', 'سهام الشاذلي', '1039485761', 'أخصائية استقدام', 'التشغيل والاستقدام', 'فرع الرياض', '2024-05-10', 9500.00, 'نشط')
ON CONFLICT (employee_code) DO NOTHING;
