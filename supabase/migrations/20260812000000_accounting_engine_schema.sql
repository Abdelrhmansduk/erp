-- Migration: 20260812_accounting_engine_schema.sql
-- Independent Accounting Engine Schema for Multi-Company ERP Platform (Khalid Al-Sulaim Group)

-- 1. FISCAL YEARS & PERIODS PER COMPANY
CREATE TABLE IF NOT EXISTS public.company_fiscal_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year_code VARCHAR(20) NOT NULL, -- e.g. FY2026
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, year_code)
);

CREATE TABLE IF NOT EXISTS public.company_fiscal_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year_id UUID NOT NULL REFERENCES public.company_fiscal_years(id) ON DELETE CASCADE,
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_number INT NOT NULL, -- 1 to 12
    period_name VARCHAR(100) NOT NULL, -- e.g. 2026-01 (يناير)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, period_name)
);

-- 2. ENHANCED CHART OF ACCOUNTS
CREATE TABLE IF NOT EXISTS public.company_chart_of_accounts_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name_ar VARCHAR(255) NOT NULL,
    account_name_en VARCHAR(255) NOT NULL,
    account_category VARCHAR(50) NOT NULL, -- أصول, خصوم, حقوق ملكية, إيرادات, مصروفات
    account_subcategory VARCHAR(100),
    parent_account_code VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'SAR',
    balance NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    is_header BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, account_code)
);

-- 3. JOURNAL ENTRIES & LINES (DOUBLE ENTRY ENGINE)
CREATE TABLE IF NOT EXISTS public.company_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    entry_number VARCHAR(100) NOT NULL, -- e.g. SAF-JV-2026-0001
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL', -- MANUAL, AUTOMATIC, RECURRING, ACCRUAL, ADJUSTMENT, CLOSING, REVERSAL
    source_module VARCHAR(50) DEFAULT 'GENERAL_LEDGER', -- INVOICE, RECEIPT, PAYROLL, EXPENSE, ASSETS
    source_reference VARCHAR(100),
    description TEXT NOT NULL,
    total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, POSTED, REVERSED, CANCELLED
    branch_name VARCHAR(100) DEFAULT 'الفرع الرئيسي',
    cost_center_code VARCHAR(50),
    project_id VARCHAR(100),
    created_by VARCHAR(150) NOT NULL,
    approved_by VARCHAR(150),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, entry_number)
);

CREATE TABLE IF NOT EXISTS public.company_journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES public.company_journal_entries(id) ON DELETE CASCADE,
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    description TEXT,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cost_center_code VARCHAR(50),
    project_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. ACCOUNTS RECEIVABLE (CUSTOMERS & INVOICES)
CREATE TABLE IF NOT EXISTS public.company_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    national_id_or_vat VARCHAR(50),
    city VARCHAR(100),
    address TEXT,
    customer_type VARCHAR(50) DEFAULT 'شخص',
    balance NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, customer_code)
);

-- 5. ACCOUNTS PAYABLE (SUPPLIERS & VENDORS)
CREATE TABLE IF NOT EXISTS public.company_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    vat_number VARCHAR(50),
    country VARCHAR(100) DEFAULT 'المملكة العربية السعودية',
    city VARCHAR(100),
    balance NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, supplier_code)
);

-- 6. BANK ACCOUNTS & RECONCILIATIONS
CREATE TABLE IF NOT EXISTS public.company_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    iban VARCHAR(50) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SAR',
    gl_account_code VARCHAR(50) NOT NULL,
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, iban)
);

CREATE TABLE IF NOT EXISTS public.company_bank_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL REFERENCES public.company_bank_accounts(id) ON DELETE CASCADE,
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    statement_balance NUMERIC(15, 2) NOT NULL,
    book_balance NUMERIC(15, 2) NOT NULL,
    difference NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'متطابق', -- متطابق, معلق, غير متطابق
    reconciled_by VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. FIXED ASSETS & DEPRECIATION
CREATE TABLE IF NOT EXISTS public.company_fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    asset_code VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_cost NUMERIC(15, 2) NOT NULL,
    useful_life_years INT NOT NULL DEFAULT 5,
    depreciation_method VARCHAR(50) DEFAULT 'قسط ثابت',
    accumulated_depreciation NUMERIC(15, 2) DEFAULT 0.00,
    book_value NUMERIC(15, 2) NOT NULL,
    location_branch VARCHAR(100) DEFAULT 'الفرع الرئيسي',
    cost_center_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, asset_code)
);

-- 8. BUDGETS & VARIANCE
CREATE TABLE IF NOT EXISTS public.company_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    budget_year VARCHAR(20) NOT NULL,
    budget_title VARCHAR(255) NOT NULL,
    total_budgeted_amount NUMERIC(15, 2) NOT NULL,
    total_actual_amount NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'معتمد',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(company_id, budget_year)
);

-- 9. RLS POLICIES FOR ACCOUNTING ISOLATION
ALTER TABLE public.company_fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_chart_of_accounts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read fiscal years" ON public.company_fiscal_years FOR SELECT USING (true);
CREATE POLICY "Read fiscal periods" ON public.company_fiscal_periods FOR SELECT USING (true);
CREATE POLICY "Read accounts v2" ON public.company_chart_of_accounts_v2 FOR SELECT USING (true);
CREATE POLICY "Read journal entries" ON public.company_journal_entries FOR SELECT USING (true);
CREATE POLICY "Read journal lines" ON public.company_journal_lines FOR SELECT USING (true);
CREATE POLICY "Read customers" ON public.company_customers FOR SELECT USING (true);
CREATE POLICY "Read suppliers" ON public.company_suppliers FOR SELECT USING (true);
CREATE POLICY "Read bank accounts" ON public.company_bank_accounts FOR SELECT USING (true);
CREATE POLICY "Read bank reconciliations" ON public.company_bank_reconciliations FOR SELECT USING (true);
CREATE POLICY "Read fixed assets" ON public.company_fixed_assets FOR SELECT USING (true);
CREATE POLICY "Read budgets" ON public.company_budgets FOR SELECT USING (true);
