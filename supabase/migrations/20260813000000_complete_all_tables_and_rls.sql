-- Migration: 20260813000000_complete_all_tables_and_rls.sql
-- Master Migration to Ensure All ERP System Tables Exist with Full RLS Policies

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    client_no VARCHAR(50) UNIQUE,
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

-- 2. CVS (CANDIDATES & RESUMES)
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

-- 3. RECRUITMENT CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    musaned_number VARCHAR(100),
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    maid_passport VARCHAR(100),
    nationality VARCHAR(100) NOT NULL,
    external_office VARCHAR(255),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 14500.00,
    stage VARCHAR(50) DEFAULT 'عقود جديدة',
    warranty_status VARCHAR(50) DEFAULT 'نشط',
    payment_status VARCHAR(50) DEFAULT 'تم الدفع',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. RENT CONTRACTS
CREATE TABLE IF NOT EXISTS public.rent_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50) NOT NULL,
    maid_name VARCHAR(255) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    duration_months INT DEFAULT 1,
    monthly_cost NUMERIC(15, 2) DEFAULT 3450.00,
    total_amount NUMERIC(15, 2) DEFAULT 3450.00,
    status VARCHAR(50) DEFAULT 'نشط',
    payment_status VARCHAR(50) DEFAULT 'تم الدفع',
    marketer VARCHAR(150),
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. ORDERS
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

-- 6. SHELTER RECORDS
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

-- 7. EMPLOYEES & HR
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
    allowances NUMERIC(15, 2) DEFAULT 0.00,
    basic_salary NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. ATTENDANCES
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    emp_no VARCHAR(50),
    employee_name VARCHAR(255) NOT NULL,
    emp_name VARCHAR(255),
    department VARCHAR(100) DEFAULT 'عام',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    date DATE DEFAULT CURRENT_DATE,
    check_in VARCHAR(50),
    check_out VARCHAR(50),
    status VARCHAR(50) DEFAULT 'حاضر',
    work_hours NUMERIC(5, 2) DEFAULT 8.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 9. CUSTODIES
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

-- 10. COMPLAINTS
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

-- 11. VOUCHERS
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'SAF',
    voucher_no VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'قبض',
    date DATE DEFAULT CURRENT_DATE,
    payee_payer VARCHAR(255) NOT NULL,
    treasury VARCHAR(150) DEFAULT 'الصندوق الرئيسي',
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'معتمد',
    branch VARCHAR(100) DEFAULT 'فرع الرياض',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 12. SPONSORSHIP TRANSFERS
CREATE TABLE IF NOT EXISTS public.sponsorship_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_no VARCHAR(100) UNIQUE NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    passport_number VARCHAR(100) NOT NULL,
    old_sponsor VARCHAR(255) NOT NULL,
    new_sponsor VARCHAR(255) NOT NULL,
    transfer_fee NUMERIC(15, 2) DEFAULT 2000.00,
    status VARCHAR(50) DEFAULT 'قيد الإجراء',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 13. TRAVEL FLIGHTS
CREATE TABLE IF NOT EXISTS public.travel_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_no VARCHAR(100) UNIQUE NOT NULL,
    passenger_name VARCHAR(255) NOT NULL,
    passport_number VARCHAR(100) NOT NULL,
    airline VARCHAR(100) NOT NULL,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    flight_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'مؤكدة',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 14. INGAZ DELEGATIONS
CREATE TABLE IF NOT EXISTS public.ingaz_delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegation_no VARCHAR(100) UNIQUE NOT NULL,
    visa_number VARCHAR(100) NOT NULL,
    sponsor_name VARCHAR(255) NOT NULL,
    agency_name VARCHAR(255) NOT NULL,
    delegation_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'مفوضة',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 15. OFFICES
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_code VARCHAR(50) UNIQUE NOT NULL,
    office_name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ENABLE RLS & CREATE UNIVERSAL PERMISSIVE POLICIES FOR DEV & PROD SYNC
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'clients', 'cvs', 'contracts', 'rent_contracts', 'orders',
      'shelter_records', 'employees', 'attendances', 'custodies',
      'complaints', 'vouchers', 'sponsorship_transfers', 'travel_flights',
      'ingaz_delegations', 'offices', 'activity_logs', 'agent_imports',
      'branch_communications', 'branch_departments', 'financial_requests',
      'group_dispatches', 'leave_requests', 'master_constants', 'rent_packages',
      'sent_messages', 'system_settings', 'system_users', 'website_visitors',
      'whatsapp_messages', 'ats_candidates', 'external_recruitment_offices',
      'ms_project_tasks', 'system_audit_logs', 'company_chart_of_accounts_v2',
      'company_journal_entries', 'cost_centers', 'zatca_invoices'
    )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "universal_access_policy_%I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "universal_access_policy_%I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
