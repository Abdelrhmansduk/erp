---
name: saudi-erp-compliance
description: "Saudi regulatory, financial, accounting, and operational compliance rules for Khalid Al-Sulaim Holding Group ERP: SAMA Saudi Riyal symbol (U+20C1 ⃁), IFRS 10 multi-company consolidation, 4-level Chart of Accounts, double-entry journal engine, ZATCA Phase 2 e-invoicing, HRSD Mudad WPS SIF payroll, Saudi Labor Law Art. 84/85 EOSB, Musaned 90-day escrow, Ewaa shelter standards, and 23 standardized export schemas."
---

# Saudi ERP Financial & Regulatory Compliance Skill (`saudi-erp-compliance`)

## When to Use This Skill
Use this skill whenever implementing, modifying, or auditing accounting, ZATCA e-invoicing, HR/payroll (WPS/GOSI/EOSB), Musaned recruitment contracts, Ewaa shelter operations, currency formatting, or data export schemas in the Khalid Al-Sulaim Holding Group ERP.

---

## 1. SAMA Official Saudi Riyal Symbol (`U+20C1` `⃁`)
- Always format currency values using [`src/utils/saudiRiyal.ts`](../../../src/utils/saudiRiyal.ts) (`formatSaudiRiyal`, `ensureSaudiRiyalSymbol`, `SAUDI_RIYAL_SYMBOL = '\u20C1'`) and [`src/components/common/SaudiRiyalSymbol.tsx`](../../../src/components/common/SaudiRiyalSymbol.tsx).
- Follow SAMA guidelines: place the symbol (`⃁`) to the left of the numeric value with a space separator, preserve geometric proportions, and use the embedded `saudi_riyal` font face across UI, PDF printouts, and Excel/CSV exports.

---

## 2. IFRS 10 Consolidation & Double-Entry Accounting Engine
- **4-Level Chart of Accounts**: Maintained in [`src/services/accounting/chartOfAccountsService.ts`](../../../src/services/accounting/chartOfAccountsService.ts) (124 standard IFRS accounts across Assets `1xxx`, Liabilities `2xxx`, Equity `3xxx`, Revenue `4xxx`, and Expenses `5xxx`). Parent account balances must dynamically roll up all child Level 4 leaf balances.
- **Double-Entry Invariant**: Every journal entry in [`src/services/accounting/journalEngine.ts`](../../../src/services/accounting/journalEngine.ts) must satisfy $\sum \text{Debit} = \sum \text{Credit}$ (`Math.abs(totalDebit - totalCredit) < 0.01`), enforce fiscal period lock dates, and support IFRS 10 intercompany elimination (`SAF`, `YAQ`, `TOP`, `KAS`, `DAR`).

---

## 3. ZATCA Phase 2 (Fatoora) E-Invoicing
- Handled by [`src/services/zatcaPhase2Service.ts`](../../../src/services/zatcaPhase2Service.ts) and [`src/services/realZatcaEngine.ts`](../../../src/services/realZatcaEngine.ts).
- Every tax invoice must generate a valid **TLV Base64 QR Code** (Tags 1–5: Seller Name, 15-digit VAT Number starting/ending with `3`, ISO Timestamp, Invoice Total with 15% VAT, and VAT Total), UUID, SHA-256 cryptographic stamp, and Previous Invoice Hash (`PIH`).

---

## 4. HRSD, Mudad WPS Payroll & Saudi Labor Law (Articles 84 & 85)
- **WPS SIF Generation**: Handled by [`src/services/wpsPayrollEngine.ts`](../../../src/services/wpsPayrollEngine.ts) and `exportToWPS` in [`src/services/exportService.ts`](../../../src/services/exportService.ts). Validate 24-character Saudi IBANs (`^SA\d{22}$`), 10-digit National ID / Iqama (`^[12]\d{9}$`), and exact net salary formula (`basic + housing + transport + otherAllowances - deductions - gosi`).
- **End-of-Service Benefit (EOSB)**: Half-month wage per year for the first 5 years and full-month wage per year thereafter (Article 84), with Article 85 resignation scaling ($0\%$ under 2 years, $\frac{1}{3}$ for 2–5 years, $\frac{2}{3}$ for 5–10 years, $100\%$ for $10+$ years).
- **23 Standardized Export Schemas**: Every HR and ERP table export in [`src/services/exportService.ts`](../../../src/services/exportService.ts) (`SECTION_CONFIGS`) must use explicit Arabic column headers and realistic default rows when exporting empty views.

---

## 5. Musaned 90-Day Escrow & Ewaa Shelter Standards
- **Musaned Lifecycle**: [`src/services/musanedLifecycleEngine.ts`](../../../src/services/musanedLifecycleEngine.ts) enforces the 90-day probation/guarantee escrow hold before recognizing final revenue, and calculates pro-rata refunds or replacement costs upon contract return.
- **Ewaa Shelter Suite**: [`src/services/ewaaHousingEngine.ts`](../../../src/services/ewaaHousingEngine.ts) enforces room/bed capacity limits, daily health/meal logs, and legal clearance before worker dispatch or repatriation.
