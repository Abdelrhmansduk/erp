-- ============================================================================
-- Migration: 20261122010000_update_hani_alsalim_email_and_name.sql
-- Purpose: Update Hani Al-Salim's official corporate email from h.alsalim@kas.sa
--          to hani@kas.sa (username: hani) and correct display name to
--          'هاني السليم' / 'Hani Al-Salim'.
-- ============================================================================

UPDATE public.kas_allowed_emails
SET
  email = 'hani@kas.sa',
  username = 'hani',
  full_name_ar = 'المستشار هاني السليم',
  full_name_en = 'Advisor Hani Al-Salim'
WHERE id = 'KAS-EMP-002' OR lower(email) = 'h.alsalim@kas.sa';

UPDATE public.system_users
SET
  email = 'hani@kas.sa',
  username = 'hani',
  full_name = 'هاني السليم'
WHERE lower(email) = 'h.alsalim@kas.sa';

UPDATE public.iam_users
SET
  email = 'hani@kas.sa',
  full_name = 'هاني السليم'
WHERE lower(email) = 'h.alsalim@kas.sa';

UPDATE auth.users
SET
  email = 'hani@kas.sa',
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'هاني السليم')
WHERE lower(email) = 'h.alsalim@kas.sa';
