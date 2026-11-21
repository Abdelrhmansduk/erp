-- ============================================================================
-- Migration: 20261121060000_remove_mustafa_marketing_account.sql
-- Purpose: Permanently revoke & exclude former staff account mustafa.marketing@kas.sa
--          (KAS-EMP-032) and update Marketing & CRM team titles under Moaz Al-Khader
--          (m.alkhader.marketing@kas.sa).
-- ============================================================================

UPDATE public.kas_allowed_emails
SET
  department_id = 'excluded',
  default_tab = 'none',
  default_tab_title = 'مستبعد من الأنظمة',
  is_active = false,
  is_excluded = true,
  exclusion_reason = 'رفض أمني: تم حذف وإيقاف هذا الحساب نهائياً لانتهاء العلاقة الوظيفية بالمجموعة.'
WHERE lower(email) = 'mustafa.marketing@kas.sa'
   OR id = 'KAS-EMP-032';

UPDATE public.kas_allowed_emails
SET
  job_title_ar = 'مسؤول الدعاية والتسويق وعلاقات العملاء',
  default_tab = 'crm-marketing-hub',
  default_tab_title = 'بوابة إدارة الدعاية والتسويق وعلاقات العملاء (CRM)'
WHERE lower(email) = 'm.alkhader.marketing@kas.sa'
   OR id = 'KAS-EMP-033';

UPDATE public.kas_allowed_emails
SET
  default_tab = 'marketing-studio'
WHERE lower(email) IN ('nagati.marketing@kas.sa', 'm.almontaser.marketing@kas.sa')
   OR id IN ('KAS-EMP-035', 'KAS-EMP-036');

UPDATE public.kas_allowed_emails
SET
  job_title_ar = 'فريق الدعاية والتسويق',
  default_tab = 'crm-leads-pipeline'
WHERE lower(email) IN ('a.magdy.marketing@kas.sa', 'a.mirghani.marketing@kas.sa')
   OR id IN ('KAS-EMP-037', 'KAS-EMP-038');

DELETE FROM public.system_users
WHERE lower(email) = 'mustafa.marketing@kas.sa';
