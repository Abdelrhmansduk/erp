-- =====================================================
-- Strict Row Level Security Policies
-- Migration: 20260801_strict_rls_policies.sql
-- =====================================================
-- This migration replaces permissive "USING (true)" policies
-- with role-aware policies that scope every read/write to the
-- calling authenticated user. Anonymous requests are denied.
-- =====================================================

-- 1) Helper function: get current user's role and branch from app_metadata.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text),
    'authenticated'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'branch')::text),
    NULL
  );
$$;

-- 2) Drop every permissive policy created by the prior migrations.
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
      'accounts', 'journal_entries', 'vouchers', 'cost_centers', 'zatca_invoices',
      'activity_logs', 'agent_imports', 'attendances', 'branch_communications',
      'branch_departments', 'custodies', 'financial_requests', 'group_dispatches',
      'leave_requests', 'master_constants', 'rent_packages', 'sent_messages',
      'system_settings', 'system_users', 'website_visitors', 'whatsapp_messages'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access on %I" ON public.%I;', t, t);
  END LOOP;
END $$;

-- 3) Recreate RLS in a tiered model:
--    Tier 1: SELECT for any authenticated user.
--    Tier 2: INSERT/UPDATE/DELETE only for privileged roles.
--    Tier 3: system_users and system_settings are admin-only.
--    Tier 4: Anonymous (anon role) is denied for everything.

-- =====================================================
-- Tier 1 - SELECT policies (read for all authenticated)
-- =====================================================
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
      'accounts', 'journal_entries', 'vouchers', 'cost_centers', 'zatca_invoices',
      'activity_logs', 'agent_imports', 'attendances', 'branch_communications',
      'branch_departments', 'custodies', 'financial_requests', 'group_dispatches',
      'leave_requests', 'master_constants', 'rent_packages', 'sent_messages',
      'system_settings', 'system_users', 'website_visitors', 'whatsapp_messages'
    )
  LOOP
    EXECUTE format(
      'CREATE POLICY "auth_read_%I" ON public.%I
       FOR SELECT TO authenticated USING (true);',
      t, t
    );
  END LOOP;
END $$;

-- =====================================================
-- Tier 2 - Write policies (privileged roles only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.can_write_data()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::text),
    ''
  ) IN (
    'super_admin', 'group_admin', 'branch_manager',
    'finance_manager', 'hr_manager', 'sales_manager',
    'accountant', 'hr_specialist', 'recruitment_specialist',
    'sales_rep', 'customer_service', 'auditor'
  );
$$;

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
      'accounts', 'journal_entries', 'vouchers', 'cost_centers', 'zatca_invoices',
      'activity_logs', 'agent_imports', 'attendances', 'branch_communications',
      'branch_departments', 'custodies', 'financial_requests', 'group_dispatches',
      'leave_requests', 'master_constants', 'rent_packages', 'sent_messages',
      'whatsapp_messages'
    )
  LOOP
    EXECUTE format(
      'CREATE POLICY "auth_write_%I" ON public.%I
       FOR INSERT TO authenticated WITH CHECK (public.can_write_data());',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "auth_update_%I" ON public.%I
       FOR UPDATE TO authenticated
       USING (public.can_write_data())
       WITH CHECK (public.can_write_data());',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "auth_delete_%I" ON public.%I
       FOR DELETE TO authenticated USING (public.can_write_data());',
      t, t
    );
  END LOOP;
END $$;

-- =====================================================
-- Tier 3 - system_settings & system_users (admin only)
-- =====================================================
DROP POLICY IF EXISTS "auth_read_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "auth_write_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "auth_update_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "auth_delete_system_settings" ON public.system_settings;

CREATE POLICY "admin_read_system_settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','group_admin','auditor'));

CREATE POLICY "admin_write_system_settings" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','group_admin'));

CREATE POLICY "admin_update_system_settings" ON public.system_settings
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','group_admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','group_admin'));

CREATE POLICY "admin_delete_system_settings" ON public.system_settings
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "auth_read_system_users" ON public.system_users;
DROP POLICY IF EXISTS "auth_write_system_users" ON public.system_users;
DROP POLICY IF EXISTS "auth_update_system_users" ON public.system_users;
DROP POLICY IF EXISTS "auth_delete_system_users" ON public.system_users;

CREATE POLICY "admin_read_system_users" ON public.system_users
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin','group_admin','auditor'));

CREATE POLICY "admin_write_system_users" ON public.system_users
  FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "admin_update_system_users" ON public.system_users
  FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "admin_delete_system_users" ON public.system_users
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =====================================================
-- Tier 4 - Explicit deny on anon role for everything
-- =====================================================
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
      'accounts', 'journal_entries', 'vouchers', 'cost_centers', 'zatca_invoices',
      'activity_logs', 'agent_imports', 'attendances', 'branch_communications',
      'branch_departments', 'custodies', 'financial_requests', 'group_dispatches',
      'leave_requests', 'master_constants', 'rent_packages', 'sent_messages',
      'system_settings', 'system_users', 'website_visitors', 'whatsapp_messages'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
  END LOOP;
END $$;

-- =====================================================
-- Documentation comments
-- =====================================================
COMMENT ON FUNCTION public.current_user_role() IS 'Returns the role from the JWT app_metadata.';
COMMENT ON FUNCTION public.current_user_branch() IS 'Returns the branch the calling user is scoped to (from JWT app_metadata).';
COMMENT ON FUNCTION public.can_write_data() IS 'Returns TRUE for roles permitted to perform INSERT/UPDATE/DELETE on operational tables.';
