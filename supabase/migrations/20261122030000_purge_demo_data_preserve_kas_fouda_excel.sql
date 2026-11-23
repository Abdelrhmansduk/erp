-- =================================================================================
-- MIGRATION: 20261122030000_purge_demo_data_preserve_kas_fouda_excel.sql
-- PURPOSE:
--   Purge all synthetic / demo operational records across Recruitment, Rental,
--   Shelter, HR, Finance, ZATCA, and CRM while strictly preserving:
--     1. KAS Trading & KAS Warehouse Excel datasets (`company_id = 'KAS'`, `wms_*`, `kas_*`)
--     2. Mahmoud Fouda & External Agencies Excel datasets (`external_agencies_master`, `musaned_followup_transactions`, `external_agency_accounts`)
--     3. Official 68 `@kas.sa` employee whitelist (`kas_allowed_emails`)
--     4. Structural system tables (`companies`, `iam_*`, `constants_*`, `shared_master_reference`, `system_settings`)
-- =================================================================================

-- 1. Purge synthetic Recruitment, Rental, Shelter & Travel demo records
DELETE FROM public.contract_extensions;
DELETE FROM public.contract_insurance;
DELETE FROM public.contract_returns;
DELETE FROM public.contracts;
DELETE FROM public.orders;
DELETE FROM public.clients;
DELETE FROM public.rent_contracts;
DELETE FROM public.rent_packages;
DELETE FROM public.cvs;
DELETE FROM public.ats_candidates;
DELETE FROM public.agent_imports;
DELETE FROM public.offices;
DELETE FROM public.external_recruitment_offices;
DELETE FROM public.ingaz_delegations;
DELETE FROM public.shelter_inmates;
DELETE FROM public.shelter_records;
DELETE FROM public.sponsorship_transfers;
DELETE FROM public.flights;
DELETE FROM public.travel_flights;
DELETE FROM public.dispatches;

-- 2. Purge synthetic Finance & ZATCA demo records
DELETE FROM public.vouchers WHERE id IN ('VCH-2026-101', 'VCH-2026-102', 'VCH-2026-103') OR company_id IS DISTINCT FROM 'KAS';
DELETE FROM public.zatca_company_invoices WHERE id IN ('ZAT-2026-01', 'ZAT-2026-02', 'ZAT-2026-03') OR company_id IS DISTINCT FROM 'KAS';
UPDATE public.accounts SET balance = 0;
UPDATE public.cost_centers SET budget = 0, spent = 0, total_expenses = 0, total_revenues = 0;
UPDATE public.branch_entities SET active_contracts = 0, monthly_revenue = 0, employees_count = 0;
UPDATE public.branches SET employees_count = 0;

-- 3. Purge synthetic CRM & Marketing demo campaigns, leads, tasks, referrals & CSAT surveys
DELETE FROM public.crm_content_calendar;
DELETE FROM public.crm_promo_referrals;
DELETE FROM public.crm_csat_surveys;
DELETE FROM public.crm_leads;
DELETE FROM public.crm_marketing_campaigns;
UPDATE public.crm_group_websites
SET pageviews_count = 0,
    conversions_count = 0,
    last_seo_score = NULL,
    last_ttfb_ms = NULL;

-- 4. Purge legacy fake non-@kas.sa employees, fake @alsulaim.sa system_users, and synthetic HR demo rows
DELETE FROM public.employees WHERE email IS NULL OR LOWER(email) NOT LIKE '%@kas.sa';
DELETE FROM public.system_users WHERE email IS NULL OR LOWER(email) NOT LIKE '%@kas.sa';
DELETE FROM public.hr_employee_documents WHERE id LIKE 'DOC-KAS-EMP-%';
DELETE FROM public.kas_allowed_emails WHERE LOWER(email) IN ('o.saeed.hospitality@kas.sa', 'mustafa.marketing@kas.sa');

-- 5. Purge dev outbox & error logs
DELETE FROM public.domain_outbox_events;
DELETE FROM public.system_error_logs;
