-- ============================================================================
-- EMERGENCY DATABASE LOCKDOWN & RLS ENFORCEMENT MIGRATION
-- Migration: 20261004000000_emergency_lockdown.sql
-- Description:
--   1. Drops all insecure/permissive policies (qual='true' or with_check='true')
--   2. Enables RLS on ALL public tables
--   3. Strips table, sequence, and routine privileges from anon role
--   4. Creates the authoritative public.legal_undertakings audit table with strict own-row RLS
--   5. Creates authenticated baseline access policies preventing anon data leaks
-- ============================================================================

-- 1. Create the authoritative legal_undertakings table
CREATE TABLE IF NOT EXISTS public.legal_undertakings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    policy_version TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT,
    signature_hash TEXT NOT NULL,
    signature_data_url TEXT,
    compliance_hash TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_undertakings_user_ver
    ON public.legal_undertakings (user_id, policy_version);

ALTER TABLE public.legal_undertakings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_undertakings_select_own ON public.legal_undertakings;
CREATE POLICY legal_undertakings_select_own
    ON public.legal_undertakings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS legal_undertakings_insert_own ON public.legal_undertakings;
CREATE POLICY legal_undertakings_insert_own
    ON public.legal_undertakings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Ensure NO update or delete policies exist on legal_undertakings (immutable audit log)
DROP POLICY IF EXISTS legal_undertakings_update ON public.legal_undertakings;
DROP POLICY IF EXISTS legal_undertakings_delete ON public.legal_undertakings;

-- 2. Drop all insecure "true" policies across all tables in schema public
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
            trim(qual) = 'true'
            OR trim(with_check) = 'true'
            OR policyname ILIKE '%universal_access%'
            OR policyname ILIKE '%allow_all%'
            OR policyname ILIKE '%public_access%'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. Enable RLS on every regular and partitioned table in public schema
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;

-- 4. Revoke anonymous access completely from public tables and sequences
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

-- Grant usage on schema public to authenticated and service_role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Grant standard CRUD on existing and future tables to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- 5. Baseline authenticated security policies
-- For any table that currently has NO policies, add a safe authenticated policy so authenticated
-- users are allowed to operate while anon is completely locked out.
DO $$
DECLARE
    tbl RECORD;
    pol_count INT;
BEGIN
    FOR tbl IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('legal_undertakings', 'iam_audit_logs', 'activity_logs', 'system_audit_logs')
    ) LOOP
        SELECT count(*) INTO pol_count
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl.tablename;

        IF pol_count = 0 THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);',
                'authenticated_baseline_access',
                tbl.tablename
            );
        END IF;
    END LOOP;
END $$;

-- 6. Audit logs immutability policies (allow SELECT & INSERT for authenticated, block UPDATE & DELETE)
DO $$
DECLARE
    audit_table TEXT;
BEGIN
    FOR audit_table IN SELECT unnest(ARRAY['iam_audit_logs', 'activity_logs', 'system_audit_logs', 'activity_log']) LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = audit_table) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'audit_insert_policy', audit_table);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'audit_select_policy', audit_table);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'authenticated_baseline_access', audit_table);

            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);',
                'audit_insert_policy',
                audit_table
            );
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);',
                'audit_select_policy',
                audit_table
            );
        END IF;
    END LOOP;
END $$;
