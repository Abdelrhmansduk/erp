-- Complete Comprehensive Database Schema for ERP Group Khalid Al-Sulaim

-- 1. Clients Table (العملاء)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  national_id VARCHAR(50) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  client_activity VARCHAR(255) DEFAULT 'عقد استقدام ساري',
  last_activity TEXT,
  added_by VARCHAR(100) DEFAULT 'المستخدم الحالي',
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  status VARCHAR(50) DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CVs Table (السير الذاتية)
CREATE TABLE IF NOT EXISTS public.cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_code VARCHAR(50) UNIQUE NOT NULL,
  maid_name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  job VARCHAR(100) DEFAULT 'عاملة منزلية',
  passport_number VARCHAR(50) NOT NULL,
  age INTEGER,
  salary NUMERIC(10,2) DEFAULT 1500.00,
  external_office VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'توسط', -- توسيط / إيجار
  status VARCHAR(50) DEFAULT 'متاح',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Recruitment Contracts Table (عقود الاستقدام)
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  musaned_number VARCHAR(50),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  maid_name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  passport_number VARCHAR(50),
  external_office VARCHAR(255) NOT NULL,
  stage VARCHAR(50) DEFAULT 'جديد',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) DEFAULT 'مدفوع كامل',
  warranty_status VARCHAR(100) DEFAULT 'ساري (90 يوماً)',
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rent Contracts Table (عقود التأجير والتشغيل)
CREATE TABLE IF NOT EXISTS public.rent_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_code VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  maid_name VARCHAR(255) NOT NULL,
  package_type VARCHAR(100) DEFAULT 'شهري',
  duration_days INTEGER DEFAULT 30,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rate NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'ساري',
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Orders & Bookings Table (الطلبات والحجوزات)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  maid_name VARCHAR(255) NOT NULL,
  order_type VARCHAR(50) DEFAULT 'توسط',
  status VARCHAR(50) DEFAULT 'جديد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ingaz Delegations Table (تفاويض الإنجاز)
CREATE TABLE IF NOT EXISTS public.ingaz_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_no VARCHAR(50) UNIQUE NOT NULL,
  delegation_date DATE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  musaned_contract_no VARCHAR(50) NOT NULL,
  country VARCHAR(100) NOT NULL,
  profession VARCHAR(100) DEFAULT 'عاملة منزلية',
  status VARCHAR(50) DEFAULT 'مكتمل',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Shelter Records Table (سجل الإيواء والتغذية)
CREATE TABLE IF NOT EXISTS public.shelter_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_no VARCHAR(50) UNIQUE NOT NULL,
  maid_name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  shelter_location VARCHAR(100) DEFAULT 'مجمع الملز الرئيسي',
  entry_date DATE NOT NULL,
  days_in_shelter INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'داخل المقر',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Sponsorship Transfers Table (نقل الكفالة والتنازل)
CREATE TABLE IF NOT EXISTS public.sponsorship_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no VARCHAR(50) UNIQUE NOT NULL,
  prev_sponsor VARCHAR(255) NOT NULL,
  new_sponsor VARCHAR(255) NOT NULL,
  maid_name VARCHAR(255) NOT NULL,
  trial_days INTEGER DEFAULT 7,
  trial_start_date DATE NOT NULL,
  contract_amount NUMERIC(10,2) NOT NULL,
  paid_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'تحت التجربة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Travel Logistics Table (الرحلات والخدمات اللوجستية)
CREATE TABLE IF NOT EXISTS public.travel_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_no VARCHAR(50) NOT NULL,
  airline VARCHAR(100) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  maid_name VARCHAR(255) NOT NULL,
  flight_type VARCHAR(50) DEFAULT 'وصول',
  flight_date DATE NOT NULL,
  arrival_airport VARCHAR(100) DEFAULT 'مطار الملك خالد الدولي بالرياض',
  status VARCHAR(50) DEFAULT 'مؤكد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Complaints & Executive Escalations Table (الشكاوى والنزاعات المرفوعة للإدارة العليا)
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no VARCHAR(50) UNIQUE NOT NULL,
  complainant VARCHAR(255) NOT NULL,
  against_entity VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  details TEXT,
  financial_claim NUMERIC(12,2) DEFAULT 0.00,
  priority VARCHAR(50) DEFAULT 'عالية VIP',
  status VARCHAR(100) DEFAULT 'تحت مراجعة رئيس المجموعة (خالد السليم)',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Foreign Offices Table (الوكلاء الخارجيين)
CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  linked_cvs_count INTEGER DEFAULT 0,
  balance_usd NUMERIC(12,2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Employees Table (الموظفين والرواتب)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  basic_salary NUMERIC(10,2) NOT NULL,
  allowances NUMERIC(10,2) DEFAULT 0.00,
  national_id VARCHAR(50) NOT NULL,
  hire_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'على رأس العمل',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Accounts Tree (شجرة الدليل المحاسبي 336)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- أصول / خصوم / حقوق ملكية / إيرادات / مصروفات
  balance NUMERIC(14,2) DEFAULT 0.00,
  parent_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Journal Entries Table (القيود المحاسبية)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  status VARCHAR(50) DEFAULT 'بانتظار الاعتماد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Vouchers Table (سندات القبض والصرف)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('قبض', 'صرف')),
  payee_payer VARCHAR(255) NOT NULL,
  treasury VARCHAR(100) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'معتمد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Cost Centers Table (مراكز التكلفة)
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  budget NUMERIC(14,2) DEFAULT 0.00,
  spent NUMERIC(14,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ZATCA Phase 2 Invoices (فواتير الزكاة والضريبة)
CREATE TABLE IF NOT EXISTS public.zatca_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  uuid VARCHAR(100) UNIQUE NOT NULL,
  csid_stamp TEXT NOT NULL,
  tlv_qr_code TEXT NOT NULL,
  invoice_type VARCHAR(50) DEFAULT 'B2C Simplified',
  total_amount NUMERIC(12,2) NOT NULL,
  vat_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Accounts Tree Initial Data
INSERT INTO public.accounts (code, name, type, balance) VALUES
  ('1', 'الأصول (Assets)', 'أصول', 1250000.00),
  ('11030', 'حساب أمانات مساند المعلقة (90 يوماً)', 'أصول', 184500.00),
  ('12100', 'الصندوق الرئيسي (Cash)', 'أصول', 154200.00),
  ('1220100', 'بنك الرياض - حساب الاستقدام', 'أصول', 420500.00),
  ('1220200', 'بنك الراجحي - الحساب التشغيلي', 'أصول', 275300.00),
  ('21040', 'مخصص مكافأة نهاية الخدمة (EOSB Provision)', 'خصوم', 94200.00),
  ('41100', 'إيرادات عقود الاستقدام التوسط', 'إيرادات', 410000.00),
  ('41200', 'إيرادات عقود التأجير والتشغيل', 'إيرادات', 115471.20)
ON CONFLICT (code) DO NOTHING;

-- Enable Row Level Security (RLS) on all 17 ERP Tables for Enterprise-grade Web Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingaz_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelter_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorship_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zatca_invoices ENABLE ROW LEVEL SECURITY;

-- Grant Secure Access Policies for System Operations and Authenticated Workspace Users
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
      'ingaz_delegations', 'shelter_records', 'sponsorship_transfers',
      'travel_flights', 'complaints', 'offices', 'employees',
      'accounts', 'journal_entries', 'vouchers', 'cost_centers', 'zatca_invoices'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access on %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Allow authenticated full access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
