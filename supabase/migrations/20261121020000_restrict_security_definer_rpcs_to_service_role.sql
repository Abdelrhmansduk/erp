-- ============================================================================
-- Migration: 20261121020000_restrict_security_definer_rpcs_to_service_role.sql
-- Purpose: Resolve Supabase Security Advisor lints:
--   - 0028_anon_security_definer_function_executable
--   - 0029_authenticated_security_definer_function_executable
-- Revokes direct anon/authenticated EXECUTE on external agency SECURITY DEFINER
-- authentication RPCs and restricts execution strictly to `service_role`
-- (invoked exclusively via Cloudflare Edge /api/external-agency-auth).
-- ============================================================================

REVOKE ALL ON FUNCTION public.resolve_external_agency_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_external_agency_email(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.verify_external_agency_login(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_external_agency_login(TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
