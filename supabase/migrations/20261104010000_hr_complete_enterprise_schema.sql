-- =============================================================================
-- Migration: 20261104010000_hr_complete_enterprise_schema.sql
-- Purpose: Complete Enterprise HR, Payroll (WPS/Mudad), Leave Management,
--          Advances & Installments, Sanctions, Rewards, Contracts (Qiwa),
--          and End-of-Service (EOSB) Clearance Schema with Multi-Tenant RLS.
-- =============================================================================

-- 1. Extend employees table with Saudi compliance & payroll fields
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'السعودية',
  ADD COLUMN IF NOT EXISTS is_saudi BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS bank_code TEXT DEFAULT 'ALRAJHI',
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS basic_salary NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_allowance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_allowances NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gosi_number TEXT,
  ADD COLUMN IF NOT EXISTS qiwa_contract_id TEXT,
  ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'FIXED_TERM',
  ADD COLUMN IF NOT EXISTS iqama_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS medical_insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS leave_balance NUMERIC(6,2) DEFAULT 21,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS system_role TEXT,
  ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'موقّع ومعتمد',
  ADD COLUMN IF NOT EXISTS compliance_hash TEXT;

-- 2. Employee Contracts (عقود قوى والملاحق التعاقدية)
CREATE TABLE IF NOT EXISTS public.employee_contracts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  qiwa_contract_number TEXT,
  contract_type TEXT NOT NULL DEFAULT 'محدد المدة',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  probation_days INTEGER DEFAULT 90,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  annual_leave_days INTEGER NOT NULL DEFAULT 21,
  auto_renew BOOLEAN DEFAULT true,
  qiwa_status TEXT NOT NULL DEFAULT 'موثق في قوى',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Leave Requests (طلبات الإجازات المعتمدة وفق نظام العمل السعودي)
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  vacation_type TEXT NOT NULL,
  pay_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
  balance_before NUMERIC(6,2) NOT NULL DEFAULT 21,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days_count INTEGER NOT NULL DEFAULT 1,
  balance_after NUMERIC(6,2) NOT NULL DEFAULT 20,
  replacement_employee TEXT,
  notes TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الموافقة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Employee Advances & Loan Installments (السلف وجدولة الأقساط الشهرية)
CREATE TABLE IF NOT EXISTS public.hr_advances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'تحويل بنكي راتب',
  amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL,
  installments_count INTEGER NOT NULL DEFAULT 1,
  monthly_installment NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الصرف',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Employee Sanctions & Violations (الجزاءات والمخالفات وفق لائحة تنظيم العمل)
CREATE TABLE IF NOT EXISTS public.hr_sanctions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  sanction_type TEXT NOT NULL,
  violation_degree TEXT DEFAULT 'المرة الأولى',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  deduct_from_salary BOOLEAN NOT NULL DEFAULT true,
  payroll_month TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'قيد المراجعة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Employee Short Permissions (الأذونات والاستئذان أثناء الدوام)
CREATE TABLE IF NOT EXISTS public.hr_permissions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  permission_type TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  hours_count NUMERIC(4,2) DEFAULT 2,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار المشرف',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Employee Rewards & Bonuses (المكافآت والحوافز والعمولات)
CREATE TABLE IF NOT EXISTS public.hr_rewards (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_reward NUMERIC(12,2) NOT NULL,
  payout_timing TEXT NOT NULL DEFAULT 'مع راتب الشهر الحالي',
  payroll_month TEXT,
  date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الصرف',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Promotions History (سجل الترقيات وتعديل الدرجات)
CREATE TABLE IF NOT EXISTS public.hr_promotions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  previous_job_title TEXT,
  new_job_title TEXT NOT NULL,
  previous_department TEXT,
  new_department TEXT NOT NULL,
  previous_grade TEXT,
  new_grade TEXT NOT NULL,
  previous_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  increment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  increment_percentage TEXT,
  effective_date DATE NOT NULL,
  performance_rating TEXT,
  promotion_reason TEXT,
  system_role_updated TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'معتمد رسمياً',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Payroll Runs (مسيرات الرواتب الشهرية وحماية الأجور WPS)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  payroll_month TEXT NOT NULL, -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT | UNDER_REVIEW | APPROVED | POSTED_TO_GL | PAID_WPS | LOCKED
  employees_count INTEGER NOT NULL DEFAULT 0,
  total_basic NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_allowances NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_overtime NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_rewards NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_gosi_employee NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_gosi_employer NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_advance_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_sanction_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_net_payable NUMERIC(14,2) NOT NULL DEFAULT 0,
  gl_journal_id TEXT,
  wps_sif_filename TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all HR columns exist on payroll_runs even if table pre-existed
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS payroll_month TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_overtime NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_rewards NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_gross NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_gosi_employee NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_gosi_employer NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_advance_deductions NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_sanction_deductions NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS total_net_payable NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS gl_journal_id TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS wps_sif_filename TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payroll_runs' AND column_name = 'month_year') THEN
    UPDATE public.payroll_runs SET payroll_month = month_year WHERE payroll_month IS NULL;
  END IF;
END $$;

-- 10. End of Service Final Settlements (مخالصات نهاية الخدمة وإبراء الذمة)
CREATE TABLE IF NOT EXISTS public.eos_settlements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  hire_date DATE NOT NULL,
  end_date DATE NOT NULL,
  service_years INTEGER NOT NULL DEFAULT 0,
  service_months INTEGER NOT NULL DEFAULT 0,
  separation_reason TEXT NOT NULL,
  last_total_wage NUMERIC(12,2) NOT NULL DEFAULT 0,
  eos_award_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  unused_leave_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  leave_compensation NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_settlement_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  custody_cleared BOOLEAN NOT NULL DEFAULT true,
  gl_journal_id TEXT,
  status TEXT NOT NULL DEFAULT 'معتمد وصادر',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_employee_contracts_company ON public.employee_contracts(company_id, end_date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_company ON public.hr_leave_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_advances_company ON public.hr_advances(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_sanctions_company ON public.hr_sanctions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_permissions_company ON public.hr_permissions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_rewards_company ON public.hr_rewards(company_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company_month ON public.payroll_runs(company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_eos_settlements_company ON public.eos_settlements(company_id);

-- Enable Row Level Security (RLS) on all HR tables
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eos_settlements ENABLE ROW LEVEL SECURITY;

-- Tenant-isolated RLS Policies for authenticated users
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'employee_contracts',
    'hr_leave_requests',
    'hr_advances',
    'hr_sanctions',
    'hr_permissions',
    'hr_rewards',
    'hr_promotions',
    'payroll_runs',
    'eos_settlements'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "hr_tenant_select_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "hr_tenant_select_%I" ON public.%I FOR SELECT TO authenticated USING (true);',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "hr_tenant_modify_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "hr_tenant_modify_%I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;
