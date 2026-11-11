---
name: supabase-integration
description: "Hybrid Supabase + Firebase authentication, multi-company Row Level Security (RLS), table alias mapping in realErpDataStore, and schema migrations for Khalid Al-Sulaim Holding Group ERP."
---

# Supabase & Hybrid Auth Integration Skill (`supabase-integration`)

## Rules for Supabase & Hybrid Authentication Operations

### 1. Hybrid Authentication Architecture (`Supabase + Firebase + @kas.sa Whitelist`)
- **Primary Auth Service**: [`src/services/authService.ts`](../../../src/services/authService.ts) & [`src/config/kasAllowedEmails.ts`](../../../src/config/kasAllowedEmails.ts) coordinate:
  1. **Strict `@kas.sa` Whitelist & Exclusions**: Enforces the 69 approved `@kas.sa` employee accounts across 9 isolated departments and permanently blocks excluded accounts (`o.saeed.hospitality@kas.sa` — أسامة سعيد / مطبخ البوفيه).
  2. **Email & Password / Direct Email Sign-In (`signIn` & `signInWithEmail`)**: Authenticates against Supabase Auth when configured, with deterministic fallback to `signInWithDirectoryOrAutoRoute` and per-employee `default_tab` routing.
  2. **Magic Link (`sendMagicLink`)**: Triggers Supabase OTP and activates the verified department/company session.
  3. **Google Sign-In (`signInWithGoogle`)**: Supports Firebase Popup OAuth ([`src/services/firebaseClient.ts`](../../../src/services/firebaseClient.ts)), Supabase OAuth, and the interactive Google Account Chooser.
- **Session Invariant**: Never create an unauthenticated session automatically on boot (`authService.getCurrentUser()` must be `null` until explicit login, verified by [`src/services/authHardening.test.ts`](../../../src/services/authHardening.test.ts)).

### 2. Multi-Company Data Store & Table Alias Mapping
- Use [`src/services/realErpDataStore.ts`](../../../src/services/realErpDataStore.ts) for CRUD operations with offline fallback ([`src/services/offlineQueueService.ts`](../../../src/services/offlineQueueService.ts)).
- Respect canonical Supabase table alias mappings in `resolveSupabaseTableName`:
  - `'hr_employees'` -> `'employees'`
  - `'recruitment-contracts'` -> `'contracts'`
  - `'rent-contracts'` -> `'rent_contracts'`
  - `'sponsorship-transfers'` -> `'sponsorship_transfers'`
  - `'activity_log'` -> `'activity_logs'`

### 3. Row Level Security (RLS) & Multi-Tenant Isolation
- Every operational table in [`supabase/migrations/`](../../../supabase/migrations) must enable RLS and scope records by `company_id` (`SAF`, `YAQ`, `TOP`, `KAS`, `DAR`, `HOLDING`).
- Wrap JWT claim lookups in `(SELECT ...)` subqueries (e.g., `(SELECT public.current_user_company_id())`) and set `SECURITY INVOKER SET search_path = public, extensions` on helper functions.
- Never hardcode `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `project_ref` in tracked scripts or config files.
