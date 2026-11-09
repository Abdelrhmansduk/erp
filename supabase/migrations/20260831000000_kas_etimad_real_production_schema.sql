-- ============================================================================
-- KAS TRADING & CONTRACTING - PRODUCTION ENTERPRISE SCHEMA (KAS ETIMAD CLOUD)
-- Migration: 20260831000000_kas_etimad_real_production_schema.sql
-- ============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Master Table: KAS Tenders & BOQs (كراسات المنافسات وجداول الكميات)
CREATE TABLE IF NOT EXISTS public.kas_tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    entity_name VARCHAR(255) NOT NULL DEFAULT 'مؤسسة خالد عبدالعزيز السليم للتجارة',
    client_name VARCHAR(255) NOT NULL,
    tender_type VARCHAR(100) NOT NULL DEFAULT 'توريد عام وتجارة',
    category VARCHAR(100) NOT NULL DEFAULT 'توريدات وتقنية',
    status VARCHAR(50) NOT NULL DEFAULT 'مسودة قيد الدراسة',
    supply_duration VARCHAR(100) NOT NULL DEFAULT '30 يوماً عمل',
    commitment_days INT NOT NULL DEFAULT 90,
    items_count INT NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    subtotal_in_words TEXT DEFAULT '',
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_in_words TEXT DEFAULT '',
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total_in_words TEXT DEFAULT '',
    awarded_date TIMESTAMPTZ,
    submission_deadline TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant lookup and sorting
CREATE INDEX IF NOT EXISTS idx_kas_tenders_ref ON public.kas_tenders(reference_number);
CREATE INDEX IF NOT EXISTS idx_kas_tenders_status ON public.kas_tenders(status);
CREATE INDEX IF NOT EXISTS idx_kas_tenders_created ON public.kas_tenders(created_at DESC);

-- 3. BOQ Itemized Lines (بنود جدول الكميات والأسعار)
CREATE TABLE IF NOT EXISTS public.kas_boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.kas_tenders(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    description TEXT NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'عدد',
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_price_in_words TEXT DEFAULT '',
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_price_in_words TEXT DEFAULT '',
    vat NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_with_vat NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_with_vat_in_words TEXT DEFAULT '',
    specifications TEXT,
    supplier_ref VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kas_boq_tender ON public.kas_boq_items(tender_id, item_number);

-- 4. Master Database: Etimad 11,700+ Monafasat Records (قاعدة بيانات منافسات اعتماد الضخمة)
CREATE TABLE IF NOT EXISTS public.kas_monafasat_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100),
    tender_name TEXT NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    government_entity TEXT NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'مفتوحة للعطاءات',
    tender_type VARCHAR(100) NOT NULL DEFAULT 'منافسة عامة',
    category VARCHAR(100) NOT NULL DEFAULT 'عام',
    sub_category VARCHAR(100) DEFAULT 'عام',
    booklet_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estimated_value NUMERIC(15, 2) DEFAULT 0.00,
    winning_bid_value NUMERIC(15, 2) DEFAULT 0.00,
    winning_company TEXT DEFAULT '',
    award_gap_percentage NUMERIC(6, 2) DEFAULT 0.00,
    bids_count INT DEFAULT 0,
    location VARCHAR(100) DEFAULT 'الرياض',
    submission_deadline TIMESTAMPTZ,
    award_date TIMESTAMPTZ,
    etimad_url TEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    our_bid_status VARCHAR(50) DEFAULT 'لم يقدم',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram Indexes for Instant Full-Text Arabic Searching across 11,700+ rows in <20ms
CREATE INDEX IF NOT EXISTS idx_kas_monafasat_name_trgm ON public.kas_monafasat_master USING gin (tender_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kas_monafasat_entity_trgm ON public.kas_monafasat_master USING gin (government_entity gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kas_monafasat_ref ON public.kas_monafasat_master(reference_number);
CREATE INDEX IF NOT EXISTS idx_kas_monafasat_category ON public.kas_monafasat_master(category, sub_category);

-- 5. Clients & Government Entities Directory (دليل العملاء والجهات)
CREATE TABLE IF NOT EXISTS public.kas_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    entity_type VARCHAR(100) DEFAULT 'جهة حكومية',
    vat_number VARCHAR(50),
    cr_number VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100) DEFAULT 'الرياض',
    credit_limit NUMERIC(15, 2) DEFAULT 1000000.00,
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'نشط',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Approved Suppliers Registry (سجل الموردين المعتمدين)
CREATE TABLE IF NOT EXISTS public.kas_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    category VARCHAR(100) NOT NULL,
    city VARCHAR(100) DEFAULT 'الرياض',
    contact_person VARCHAR(150),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    vat_number VARCHAR(50),
    cr_number VARCHAR(50),
    rating INT DEFAULT 5,
    quality_score INT DEFAULT 95,
    commitment_score INT DEFAULT 95,
    price_competitiveness INT DEFAULT 90,
    total_deals INT DEFAULT 0,
    total_value NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'معتمد',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Invoices & ZATCA Phase 2 E-Invoicing (الفواتير الضريبية والربط الإلكتروني)
CREATE TABLE IF NOT EXISTS public.kas_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    tender_id UUID REFERENCES public.kas_tenders(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.kas_clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'غير مدفوعة',
    -- ZATCA Compliance Fields
    zatca_uuid UUID DEFAULT uuid_generate_v4(),
    zatca_hash TEXT,
    zatca_previous_hash TEXT,
    zatca_xml_ubl TEXT,
    zatca_qr_code TEXT,
    zatca_status VARCHAR(50) DEFAULT 'جاهزة للإرسال',
    zatca_reporting_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kas_invoices_num ON public.kas_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_kas_invoices_status ON public.kas_invoices(status);

-- 8. Invoice Line Items (بنود الفواتير)
CREATE TABLE IF NOT EXISTS public.kas_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.kas_invoices(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    description TEXT NOT NULL,
    unit VARCHAR(50) DEFAULT 'عدد',
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_with_vat NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Proposals & Quotations (عروض الأسعار)
CREATE TABLE IF NOT EXISTS public.kas_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_number VARCHAR(100) NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    tender_id UUID REFERENCES public.kas_tenders(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(100),
    client_phone VARCHAR(50),
    open_till DATE,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'مسودة',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Credit Notes (إشعارات الائتمان)
CREATE TABLE IF NOT EXISTS public.kas_credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_id UUID REFERENCES public.kas_invoices(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'معتمد',
    zatca_qr_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Subscriptions & Periodic Services (الاشتراكات والخدمات الدورية)
CREATE TABLE IF NOT EXISTS public.kas_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_number VARCHAR(100) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'شهري',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    next_billing_date DATE,
    recurring_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'نشط',
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Estimate Requests (طلبات عروض الأسعار)
CREATE TABLE IF NOT EXISTS public.kas_estimate_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(100) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    requested_by VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'قيد المراجعة',
    requirements TEXT,
    estimated_budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Contracts & Awards (العقود والترسيات الرسمية)
CREATE TABLE IF NOT EXISTS public.kas_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    tender_id UUID REFERENCES public.kas_tenders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    warranty_period_months INT DEFAULT 12,
    completion_percentage INT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'قيد التنفيذ',
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Operational & Tender Expenses (المصروفات والتكاليف)
CREATE TABLE IF NOT EXISTS public.kas_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(100) NOT NULL UNIQUE,
    tender_id UUID REFERENCES public.kas_tenders(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'تحويل بنكي',
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Staff & Estimators (فريق العمل ومقدري التكاليف)
CREATE TABLE IF NOT EXISTS public.kas_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'مهندس تسعير',
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(50),
    department VARCHAR(100) DEFAULT 'إدارة المناقصات والتوريدات',
    active_tenders_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'نشط',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Actionable Tasks (المهام والمتابعات)
CREATE TABLE IF NOT EXISTS public.kas_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID REFERENCES public.kas_tenders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    assigned_to UUID REFERENCES public.kas_staff(id) ON DELETE SET NULL,
    due_date DATE,
    priority VARCHAR(50) DEFAULT 'متوسط',
    status VARCHAR(50) DEFAULT 'قيد التنفيذ',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Client & Tender Tickets (تذاكر الدعم والملاحظات)
CREATE TABLE IF NOT EXISTS public.kas_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(100) NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    tender_id UUID REFERENCES public.kas_tenders(id) ON DELETE SET NULL,
    priority VARCHAR(50) DEFAULT 'متوسط',
    status VARCHAR(50) DEFAULT 'مفتوحة',
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Official Email & Notification Templates (قوالب البريد والمراسلات)
CREATE TABLE IF NOT EXISTS public.kas_email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_code VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::JSONB,
    category VARCHAR(100) DEFAULT 'مناقصات',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Comprehensive Audit Trail (سجل التدقيق والعمليات)
CREATE TABLE IF NOT EXISTS public.kas_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by VARCHAR(255) DEFAULT 'System Admin',
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATIC CALCULATION TRIGGERS & PROCEDURES
-- ============================================================================

-- Procedure: Auto-calculate BOQ item totals
CREATE OR REPLACE FUNCTION public.fn_calculate_boq_item()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price := ROUND((NEW.quantity * NEW.unit_price)::NUMERIC, 2);
    NEW.vat := ROUND((NEW.total_price * 0.15)::NUMERIC, 2);
    NEW.total_with_vat := NEW.total_price + NEW.vat;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_boq_item ON public.kas_boq_items;
CREATE TRIGGER trg_calculate_boq_item
    BEFORE INSERT OR UPDATE ON public.kas_boq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_calculate_boq_item();

-- Procedure: Auto-update tender totals when BOQ items change
CREATE OR REPLACE FUNCTION public.fn_sync_tender_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_tender_id UUID;
    calc_subtotal NUMERIC(15, 2);
    calc_items_count INT;
    calc_vat NUMERIC(15, 2);
    calc_grand_total NUMERIC(15, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_tender_id := OLD.tender_id;
    ELSE
        target_tender_id := NEW.tender_id;
    END IF;

    SELECT 
        COALESCE(SUM(total_price), 0.00),
        COUNT(*),
        COALESCE(SUM(vat), 0.00),
        COALESCE(SUM(total_with_vat), 0.00)
    INTO 
        calc_subtotal,
        calc_items_count,
        calc_vat,
        calc_grand_total
    FROM public.kas_boq_items
    WHERE tender_id = target_tender_id;

    UPDATE public.kas_tenders
    SET 
        subtotal = calc_subtotal,
        items_count = calc_items_count,
        vat_amount = calc_vat,
        grand_total = calc_grand_total,
        updated_at = NOW()
    WHERE id = target_tender_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_tender_totals ON public.kas_boq_items;
CREATE TRIGGER trg_sync_tender_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.kas_boq_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_tender_totals();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.kas_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_monafasat_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_estimate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users and public (service role or demo mode)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'kas_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow full access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END;
$$;
