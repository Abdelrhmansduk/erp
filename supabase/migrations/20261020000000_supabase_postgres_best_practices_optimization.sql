-- ============================================================================
-- SUPABASE POSTGRES BEST PRACTICES OPTIMIZATION MIGRATION
-- Migration: 20261020000000_supabase_postgres_best_practices_optimization.sql
-- Applied Rules from .agents/skills/supabase-postgres-best-practices:
--   1. schema-foreign-key-indexes: Index all Foreign Key & relationship columns
--   2. query-partial-indexes & query-covering-indexes: Partial & covering indexes for hot paths
--   3. advanced-jsonb-indexing: GIN jsonb_path_ops indexes on JSONB ledger & outbox columns
--   4. security-rls-performance: STABLE InitPlan helper functions & strict append-only audit RLS
-- ============================================================================

-- 1. STABLE Helper Functions for Zero-Overhead RLS InitPlan Evaluation (security-rls-performance)
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'),
    'SAF'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_group_executive()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'), '') = 'all'
    OR COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') IN (
      'رئيس مجلس الإدارة',
      'رئيس المجموعة',
      'مدير نظام',
      'مدير تنفيذي'
    )
  );
$$;

-- 2. Foreign Key & Relationship Indexes (schema-foreign-key-indexes)
CREATE INDEX IF NOT EXISTS idx_idempotency_actor_id
    ON public.idempotency_records (actor_id)
    WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by
    ON public.accounting_journal_entries (created_by)
    WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_reversed_by
    ON public.accounting_journal_entries (reversed_by_entry_id)
    WHERE reversed_by_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_settlements_contract_id
    ON public.escrow_settlements (company_id, contract_id);

CREATE INDEX IF NOT EXISTS idx_escrow_settlements_foreign_agency
    ON public.escrow_settlements (company_id, foreign_agency_id)
    WHERE foreign_agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_guarantees_tender_id
    ON public.bank_guarantees (company_id, tender_id)
    WHERE tender_id IS NOT NULL;

-- 3. Partial & Covering Indexes for High-Frequency Operational Queries (query-partial-indexes)
CREATE INDEX IF NOT EXISTS idx_escrow_active_held
    ON public.escrow_settlements (company_id, created_at DESC)
    INCLUDE (contract_id, total_escrow_amount, client_name)
    WHERE escrow_status = 'HELD_IN_ESCROW';

CREATE INDEX IF NOT EXISTS idx_bank_guarantees_active_expiry
    ON public.bank_guarantees (company_id, expiry_date ASC)
    INCLUDE (letter_number, amount, beneficiary_entity)
    WHERE status IN ('ساري', 'قارب على الانتهاء');

CREATE INDEX IF NOT EXISTS idx_ecommerce_sync_logs_company_time
    ON public.ecommerce_store_sync_logs (company_id, platform, synced_at DESC);

-- 4. GIN JSONB Indexes for Fast Ledger Account & Outbox Payload Lookups (advanced-jsonb-indexing)
CREATE INDEX IF NOT EXISTS idx_journal_entries_lines_gin
    ON public.accounting_journal_entries
    USING GIN (lines jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_outbox_events_payload_gin
    ON public.domain_outbox_events
    USING GIN (payload jsonb_path_ops);

-- 5. Upgrade Tenant RLS Policies to Use STABLE InitPlan Helpers (security-rls-performance)
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
        EXECUTE format('DROP POLICY IF EXISTS optimal_tenant_isolation_policy ON public.%I;', tbl.tablename);

        EXECUTE format(
            'CREATE POLICY optimal_tenant_isolation_policy ON public.%I
             FOR ALL TO authenticated
             USING (
               company_id = (SELECT public.current_user_company_id())
               OR (SELECT public.current_user_is_group_executive())
             )
             WITH CHECK (
               company_id = (SELECT public.current_user_company_id())
               OR (SELECT public.current_user_is_group_executive())
             );',
            tbl.tablename
        );
    END LOOP;
END $$;
