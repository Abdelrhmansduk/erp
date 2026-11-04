-- ============================================================================
-- Module visibility settings (hide departments / sub-pages / UI parts)
-- Migration: 20261104000000_module_visibility_settings.sql
--
-- One row per scope: 'ALL' (whole group) or a company code (SAF, YAQ, TOP, KAS, DAR).
-- Everyone signed in can READ (needed to render their menu);
-- only group executives / system admins can WRITE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.module_visibility_settings (
  scope       TEXT PRIMARY KEY
              CHECK (scope IN ('ALL', 'SAF', 'YAQ', 'TOP', 'KAS', 'DAR')),
  hidden_ids  TEXT[] NOT NULL DEFAULT '{}',
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.module_visibility_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS module_visibility_read ON public.module_visibility_settings;
CREATE POLICY module_visibility_read
  ON public.module_visibility_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS module_visibility_insert_admin ON public.module_visibility_settings;
CREATE POLICY module_visibility_insert_admin
  ON public.module_visibility_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.current_user_is_group_executive()));

DROP POLICY IF EXISTS module_visibility_update_admin ON public.module_visibility_settings;
CREATE POLICY module_visibility_update_admin
  ON public.module_visibility_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.current_user_is_group_executive()))
  WITH CHECK ((SELECT public.current_user_is_group_executive()));

-- No DELETE policy: rows are reset by saving an empty hidden_ids array.

REVOKE ALL ON public.module_visibility_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.module_visibility_settings TO authenticated;
