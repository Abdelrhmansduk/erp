---
name: code-review-security-audit
description: "Enterprise security audit, Saudi PDPL PII masking, zero-secret repository enforcement, telemetry URL scrubbing, and npm audit dependency hardening for Khalid Al-Sulaim ERP."
---

# Code Review & Security Audit Skill (`code-review-security-audit`)

## Security & Quality Audit Checklist

### 1. Zero Hardcoded Secrets & Keys Invariant
- Never commit API keys, JWTs, `sb_publishable_*`, `sb_secret_*`, `sbp_*`, `sntryu_*`, `project_ref`, or hardcoded passwords in `src/`, `scripts/`, `mcp.json`, or `.vscode/mcp.json`.
- Read all credentials exclusively from `import.meta.env.VITE_*` (frontend public config) or `process.env.*` (Node scripts).
- Run secret pattern verification before pushing:
  ```bash
  node scripts/verify_skills_health.mjs
  ```

### 2. Saudi PDPL Data Masking & Telemetry Scrubbing
- Mask National IDs, Iqama numbers, Passports, IBANs, and phone numbers for non-authorized roles using [`src/utils/pdplMasking.ts`](../../../src/utils/pdplMasking.ts).
- Scrub sensitive query-string parameters (`token`, `sig`, `key`, `secret`, `password`, `apikey`, `access_token`, `auth`) in [`src/services/appInsightsService.ts`](../../../src/services/appInsightsService.ts) (`scrubUrlSecrets`).

### 3. Dependency Vulnerability Hardening (`npm audit`)
- Maintain `0 vulnerabilities` in `npm audit` using targeted version overrides in [`package.json`](../../../package.json) (`"overrides"`).
- Remove OneDrive conflict files (`*-DESKTOP-*`) and keep them ignored in [`.gitignore`](../../../.gitignore).
