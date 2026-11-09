-- ============================================================================
-- ENTERPRISE MULTI-TENANCY RLS (INITPLAN OPTIMIZED) & SHARED KERNEL SCHEMA
-- Migration: 20261015000000_strict_tenant_rls_and_enterprise_kernel.sql
-- Blueprint References:
--   - rules.md §1 & §2 (Zero-Mock & Multi-Tenancy Isolation Invariants)
--   - architecture.md §4, §5, §6, §7, §8, §9 (Outbox, Idempotency, 15m Lease, Immutable Ledger, Escrow)
--   - memory.md §4.2 & §4.3 (Zero Table-Scan InitPlan RLS & Composite/Partial/GIN Indexes)
-- ============================================================================

-- 1. Transactional Outbox Pattern Table (architecture.md §4.1)
CREATE TABLE IF NOT EXISTS public.domain_outbox_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT 'SAF',
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED')),
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON public.domain_outbox_events (company_id, created_at ASC)
    WHERE status = 'PENDING';

-- 2. Idempotency-Key Protocol Table (architecture.md §5.1)
CREATE TABLE IF NOT EXISTS public.idempotency_records (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    company_id VARCHAR(20) NOT NULL DEFAULT 'SAF',
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operation_type VARCHAR(80) NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_company_created
    ON public.idempotency_records (company_id, created_at DESC);

-- 3. Immutable Double-Entry Ledger Table (architecture.md §7.2 & TASK-304)
CREATE TABLE IF NOT EXISTS public.accounting_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL,
    entry_number VARCHAR(50) NOT NULL UNIQUE,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    source_module VARCHAR(50) NOT NULL DEFAULT 'GENERAL_LEDGER',
    source_reference VARCHAR(100),
    description TEXT NOT NULL,
    total_debit NUMERIC(15, 2) NOT NULL CHECK (total_debit >= 0),
    total_credit NUMERIC(15, 2) NOT NULL CHECK (total_credit >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    branch_name VARCHAR(100) DEFAULT 'الفرع الرئيسي',
    cost_center_code VARCHAR(50),
    lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    reversed_by_entry_id UUID REFERENCES public.accounting_journal_entries(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_balanced_entry CHECK (total_debit = total_credit AND total_debit > 0)
);

-- Enforce Append-Only Immutability on Posted Journal Entries
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Immutable Ledger Violation: Deleting journal entries is strictly prohibited.';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'POSTED' AND NEW.status <> 'REVERSED' THEN
        RAISE EXCEPTION 'Immutable Ledger Violation: Posted journal entries cannot be modified. Create a reversal entry instead.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_journal_entries ON public.accounting_journal_entries;
CREATE TRIGGER trg_immutable_journal_entries
    BEFORE UPDATE OR DELETE ON public.accounting_journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_posted_journal_mutation();

-- 4. Escrow Settlement Table (architecture.md §8.1)
CREATE TABLE IF NOT EXISTS public.escrow_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT 'SAF',
    contract_id VARCHAR(100) NOT NULL,
    musaned_contract_number VARCHAR(100),
    client_name TEXT NOT NULL,
    foreign_agency_id VARCHAR(100),
    foreign_agency_name TEXT,
    total_escrow_amount NUMERIC(15, 2) NOT NULL CHECK (total_escrow_amount >= 0),
    agency_commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    company_net_revenue NUMERIC(15, 2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    escrow_status VARCHAR(30) NOT NULL DEFAULT 'HELD_IN_ESCROW'
        CHECK (escrow_status IN ('HELD_IN_ESCROW', 'MEDICAL_VERIFIED', 'RELEASED_TO_AGENCY', 'REFUNDED_TO_CLIENT', 'DISPUTED')),
    medical_passed BOOLEAN NOT NULL DEFAULT FALSE,
    arrival_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    probation_end_date DATE,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. KAS Bank Guarantees Table (TASK-402)
CREATE TABLE IF NOT EXISTS public.bank_guarantees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT 'KAS',
    letter_number VARCHAR(80) NOT NULL UNIQUE,
    tender_id VARCHAR(100),
    tender_title TEXT NOT NULL,
    beneficiary_entity TEXT NOT NULL,
    bank_name VARCHAR(120) NOT NULL,
    guarantee_type VARCHAR(40) NOT NULL CHECK (guarantee_type IN ('ابتدائي', 'نهائي', 'دفعة مقدمة')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    cash_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ساري' CHECK (status IN ('ساري', 'قارب على الانتهاء', 'مجدد', 'مفرج عنه', 'مصادر')),
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. E-Commerce Omnichannel Sync Logs (TASK-504)
CREATE TABLE IF NOT EXISTS public.ecommerce_store_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT 'SAF',
    platform VARCHAR(40) NOT NULL CHECK (platform IN ('salla', 'zid', 'shopify', 'woocommerce')),
    sync_direction VARCHAR(20) NOT NULL CHECK (sync_direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
    synced_orders_count INT NOT NULL DEFAULT 0,
    synced_packages_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. OMS 15-Minute Soft Lease Columns on CVs (architecture.md §6.1)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cvs') THEN
        ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS lease_locked_by VARCHAR(100);
        ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
        ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS reservation_state VARCHAR(30) DEFAULT 'AVAILABLE';
    END IF;
END $$;

-- 8. Performance Composite, Partial & GIN Indexes (memory.md §4.3)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contracts') THEN
        CREATE INDEX IF NOT EXISTS idx_contracts_lookup
            ON public.contracts (company_id, status, created_at DESC);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_company_created
            ON public.orders (company_id, created_at DESC);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounting_journal_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date
            ON public.accounting_journal_entries (company_id, entry_date DESC);
    END IF;
END $$;

-- 9. Strict Tenant-Isolated RLS Policies Using InitPlan Subquery Optimization (memory.md §4.2 & rules.md §2.1)
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT c.table_name AS tablename
        FROM information_schema.columns c
        JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = c.table_schema
        WHERE c.table_schema = 'public'
          AND c.column_name = 'company_id'
          AND c.table_name NOT IN ('legal_undertakings', 'iam_audit_logs', 'activity_logs', 'system_audit_logs', 'activity_log')
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS authenticated_baseline_access ON public.%I;', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS optimal_tenant_isolation_policy ON public.%I;', tbl.tablename);

        EXECUTE format(
            'CREATE POLICY optimal_tenant_isolation_policy ON public.%I
             FOR ALL TO authenticated
             USING (
               company_id = (SELECT COALESCE(auth.jwt() -> ''app_metadata'' ->> ''company_id'', ''SAF''))
               OR (SELECT (auth.jwt() -> ''app_metadata'' ->> ''company_id'')) = ''all''
               OR (SELECT (auth.jwt() -> ''app_metadata'' ->> ''role'')) IN (''رئيس المجموعة'', ''مدير نظام'', ''مدير تنفيذي'')
             )
             WITH CHECK (
               company_id = (SELECT COALESCE(auth.jwt() -> ''app_metadata'' ->> ''company_id'', ''SAF''))
               OR (SELECT (auth.jwt() -> ''app_metadata'' ->> ''company_id'')) = ''all''
               OR (SELECT (auth.jwt() -> ''app_metadata'' ->> ''role'')) IN (''رئيس المجموعة'', ''مدير نظام'', ''مدير تنفيذي'')
             );',
            tbl.tablename
        );
    END LOOP;
END $$;
