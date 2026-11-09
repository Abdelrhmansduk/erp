---
name: testing-and-qa
description: "Mandatory 4-gate verification pipeline for Khalid Al-Sulaim Holding Group ERP: TypeScript check, 27 Vitest unit/integration suites (204 tests), 77-module automated workflow verifier, and 58-page system auditor."
---

# Testing & Quality Assurance Skill (`testing-and-qa`)

## Mandatory 4-Gate Verification Pipeline

Before completing any feature, refactor, or bugfix, run and pass all 4 verification gates:

### Gate 1: Zero TypeScript Errors (`tsc --noEmit`)
```bash
npx tsc --noEmit
```
- Must exit with code `0` and `0` errors across all `.ts` and `.tsx` files.

### Gate 2: Full Vitest Unit & Integration Suite (`27 Suites / 204 Tests`)
```bash
npx vitest run
```
- Covers key domain suites including:
  - [`src/services/accounting/journalEngine.test.ts`](../../../src/services/accounting/journalEngine.test.ts) & [`chartOfAccountsService.test.ts`](../../../src/services/accounting/chartOfAccountsService.test.ts)
  - [`src/services/exportService.test.ts`](../../../src/services/exportService.test.ts) (all 23 HR & ERP export schemas + WPS CSV)
  - [`src/services/wpsPayrollEngine.test.ts`](../../../src/services/wpsPayrollEngine.test.ts) & [`zatcaPhase2Service.test.ts`](../../../src/services/zatcaPhase2Service.test.ts)
  - [`src/services/ewaaHousingEngine.test.ts`](../../../src/services/ewaaHousingEngine.test.ts) & [`musanedLifecycleEngine.test.ts`](../../../src/services/musanedLifecycleEngine.test.ts)
  - [`src/services/authHardening.test.ts`](../../../src/services/authHardening.test.ts) & [`iamPolicyEngine.test.ts`](../../../src/services/iamPolicyEngine.test.ts)
  - [`src/test/multiCompanyIsolation.test.ts`](../../../src/test/multiCompanyIsolation.test.ts) & [`appInsightsService.test.ts`](../../../src/services/appInsightsService.test.ts)

### Gate 3: 77-Module Automated ERP Verifier
```bash
node scripts/run_automated_tests.js
```
- Verifies all 77 operational modules across Operations, Finance, HR, Governance, Analytics, Legal, Procurement, and Security (`77/77 PASSED`).

### Gate 4: 58-Page System & Theme Auditor
```bash
node scripts/audit_system.cjs
```
- Audits all 58 pages in [`src/pages/`](../../../src/pages) to ensure `[]` (zero placeholder/TODO texts or unhandled interactive states).
