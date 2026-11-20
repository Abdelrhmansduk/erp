-- ============================================================================
-- Migration: 20261120020000_enable_realtime_publication.sql
-- Purpose: Register core operational tables in `supabase_realtime` publication
--          so Realtime postgres_changes subscriptions (`orders`, `contracts`, etc.)
--          operate with zero Realtime warnings.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY[
      'orders',
      'contracts',
      'clients',
      'cvs',
      'vouchers',
      'employees',
      'attendances',
      'hr_approval_requests',
      'hr_smart_alerts',
      'corporate_internal_mailbox',
      'musaned_followup_transactions'
    ]
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      END IF;
    END LOOP;
  END IF;
END $$;
