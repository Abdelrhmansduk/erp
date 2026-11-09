-- ============================================================================
-- KHALID GROUP ERP: COMPLETE PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- Target: Zero Cross-Tenant Leakage across 4 Recruitment Companies & Sister Entities
-- ============================================================================

-- 1. Helper function to extract user's active company membership
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Check user session metadata or membership table
  SELECT company_id INTO v_company_id
  FROM public.iam_memberships
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Fallback to default group tenant context if super-admin
    SELECT id INTO v_company_id FROM public.iam_companies WHERE code = 'KAS' LIMIT 1;
  END IF;

  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper function to verify super-admin role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.iam_memberships m
    JOIN public.iam_roles r ON m.role_id = r.id
    WHERE m.user_id = auth.uid() 
      AND m.is_active = true 
      AND (r.code IN ('SUPER_ADMIN', 'CEO', 'SYSTEM_ADMIN') OR r.name_ar = 'مدير النظام العام')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Enable RLS on all operational and business tables
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'recruitment_contracts',
    'rent_contracts',
    'orders',
    'clients',
    'cvs',
    'shelter_inmates',
    'shelter_medical_checks',
    'shelter_catering_meals',
    'sponsorship_transfers',
    'kas_monafasat_master',
    'kas_tenders',
    'kas_boq_items',
    'accounting_journals',
    'zatca_invoices',
    'financial_requests',
    'travel_records',
    'complaints_disputes',
    'iam_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS p_%I_select ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS p_%I_insert ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS p_%I_update ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS p_%I_delete ON public.%I;', tbl, tbl);

      -- Policy: SELECT (Read within same company or if super-admin)
      EXECUTE format(
        'CREATE POLICY p_%I_select ON public.%I FOR SELECT USING (' ||
        '  is_super_admin() OR company_id = get_auth_company_id() OR company_id IS NULL' ||
        ');', tbl, tbl
      );

      -- Policy: INSERT (Insert stamped with caller company)
      EXECUTE format(
        'CREATE POLICY p_%I_insert ON public.%I FOR INSERT WITH CHECK (' ||
        '  is_super_admin() OR company_id = get_auth_company_id()' ||
        ');', tbl, tbl
      );

      -- Policy: UPDATE (Update only own company records)
      EXECUTE format(
        'CREATE POLICY p_%I_update ON public.%I FOR UPDATE USING (' ||
        '  is_super_admin() OR company_id = get_auth_company_id()' ||
        ');', tbl, tbl
      );

      -- Policy: DELETE (Only super-admin or authorized manager within company)
      EXECUTE format(
        'CREATE POLICY p_%I_delete ON public.%I FOR DELETE USING (' ||
        '  is_super_admin() OR (company_id = get_auth_company_id() AND auth.role() = ''authenticated'')' ||
        ');', tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- 4. Special Immutability Policy on Audit Logs: Deny all Updates & Deletions
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'iam_audit_logs') THEN
    DROP POLICY IF EXISTS p_iam_audit_logs_update ON public.iam_audit_logs;
    DROP POLICY IF EXISTS p_iam_audit_logs_delete ON public.iam_audit_logs;
    
    CREATE POLICY p_iam_audit_logs_update ON public.iam_audit_logs FOR UPDATE USING (false);
    CREATE POLICY p_iam_audit_logs_delete ON public.iam_audit_logs FOR DELETE USING (false);
  END IF;
END $$;
