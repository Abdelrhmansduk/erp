---
name: managing-saudi-crm-marketing
description: "Manage multi-company CRM pipelines, Saudi paid ad campaigns (Snapchat, TikTok, Meta, Google, X), creative spec validation, AARRR analytics, referrals, and PDPL Art. 25 marketing consent in Khalid Al-Sulaim ERP. Use when implementing, auditing, or operating CRM leads, marketing studio, ad ROAS/CAC analytics, promo codes, or customer 360 views."
category: marketing
allowed-tools: Read Edit Write Bash
license: MIT
---

# Managing Saudi CRM, Paid Ads & Marketing Operations

## Overview

Standardizes architecture, mathematical formulas, creative validation, and regulatory guardrails for Department 7 (CRM, Marketing & Customer Relations) across Khalid Al-Sulaim Holding Group (`SAF`, `TOP`, `YAQ`, `DAR`, `KAS`, `HOLDING`), led by the corporate marketing workspace (`m.alkhader.marketing@kas.sa`).

## When to Use This Skill

- Implementing or modifying CRM lead pipelines, Customer 360 profiles, CSAT/NPS surveys, or referral/affiliate workflows in `src/pages/` and `src/services/`.
- Calculating paid advertising metrics (`CTR`, `CPL`, `CPA`, `Funnel-Adjusted CAC`, `ROAS`, `Historical Efficiency Index`, or `70/30` budget pacing) in Saudi Riyal (`⃁`).
- Validating ad copy character limits, `UTM` tracking links, or PDPL-safe CV promotional cards in the Marketing Studio.
- Auditing outbound WhatsApp, SMS, or Email broadcasts for Saudi PDPL Article 25 consent compliance.
- **Do NOT use** when modifying core double-entry accounting ledgers, ZATCA cryptographic signing, or HR WPS payroll SIF generation (use `saudi-erp-compliance` instead), or when editing KAS Etimad BOQ tenders (use `dept-9-tenders` workflows).

## Core Engineering & Analytical Rules

### 1. Multi-Channel Ad Analytics & Budget Guardrails (`ad-campaign-analyzer` + `paid-ads`)
- Format all monetary spend, CPL, CPA, CAC, and revenue strictly with the official SAMA Saudi Riyal symbol (`⃁` `U+20C1`) via `src/utils/saudiRiyal.ts`.
- Compute **Funnel-Adjusted CAC** only from aligned funnel conversion rates:
  `Channel CAC = CPL / (QualifiedRate * ReservationRate * CloseRate)`
- Compute **Historical Efficiency Index** as `BlendedCPA / ChannelCPA`.
- Flag investigation candidates automatically:
  - `ZERO_CONVERSIONS`: `spent_sar >= reviewThreshold` and `won_contracts_count === 0`.
  - `HIGH_CPA_OUTLIER`: `cpa > 3 * targetCpa`.
  - `CREATIVE_FATIGUE`: `ctr < 0.5 * channelAvgCtr`.
- Enforce the **70/30 Budget Pacing Rule**: allocate `70%` to proven campaigns and `30%` to creative/audience experiments (or add a `15%` experimental layer on goal-based budgets), and cap single budget increases at `25%`.

### 2. Platform Creative Character Validator (`ad-creative`)
Validate every ad variation before approval or CSV export:
- **Snapchat & TikTok Ads**: `adText <= 80` chars recommended (`100` max); video script follows `0-3s Hook -> 3-8s Problem -> 8-20s Solution -> 20-30s CTA`.
- **Google Search RSA**: `headline <= 30` chars (up to 15), `description <= 90` chars (up to 4).
- **Meta (Instagram / Facebook)**: `primaryHook <= 125` visible chars (`2200` max), `headline <= 40` chars, `description <= 30` chars.
- **X (Twitter)**: `tweetText <= 280` chars, `cardHeadline <= 70` chars.
- **PDPL-Safe CV Promo Cards**: Never include full worker passport numbers, personal phone numbers, or unmasked identity documents on social media cards; display only reservation code, profession, nationality, experience years, skills, and a `UTM`-tagged booking QR/link.

### 3. Weighted Sales Pipeline & Rotting Radar (`odoo-sales-crm-expert`)
- Map CRM leads across weighted probability stages: `new (10%)`, `contacted (25%)`, `qualified (50%)`, `reserved (75%)`, `payment_pending (90%)`, `won (100%)`, `lost (0%)`.
- Enforce a **15-minute First-Response SLA** on inbound ad leads and flag stale opportunities (`rottingDays`) when untouched past stage thresholds.
- Require a structured `lost_reason` (`السعر`, `عدم توفر الجنسية`, `تأخر التأشيرة`, `تأخر التواصل`, `منافس`, `تراجع العميل`) whenever transitioning a lead to `lost`.
- Isolate `KAS` commercial showroom/Imal deals (`company_id = 'KAS'`) from Recruitment/Rental/Shelter entities (`SAF`, `TOP`, `YAQ`, `DAR`).

### 4. Signal Quality, UTM Discipline & Saudi PDPL Art. 25 (`analytics-tracking` + `PDPL`)
- Score campaign tracking health with the **Measurement Readiness Index (`0–100`)** across 6 weights (`Decision Alignment 25`, `Event Clarity 20`, `Data Integrity 20`, `Conversion Quality 15`, `UTM Discipline 10`, `PDPL Governance 10`). Block automated budget scaling if score `< 55`.
- Enforce lowercase, underscore-separated `UTM` parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) with zero PII in query strings.
- Gate every promotional WhatsApp/SMS/Email broadcast through `menaLegalComplianceService.ts` (`getMarketingConsentRecords` & `buildCompliantMarketingMessage`), excluding unsubscribed recipients immediately.

### 5. Double-Sided Referrals & Affiliate Anti-Fraud (`referral-program`)
- Bound maximum referral/affiliate payout by: `MaxReward = (CustomerLTV * GrossMargin) - TargetCAC`.
- Prevent self-referrals (matching phone, National ID, or IBAN) and hold commission payouts until contract payment clearance, applying automatic clawback on cancelled contracts.

## Examples

### Example 1: Validating UTM & Snapchat Ad Spec
Input:
```json
{
  "platform": "snapchat",
  "companyId": "SAF",
  "headline": "استقدام نخبة الكوادر المنزلية من الفلبين عبر مساند بضمان 90 يوماً",
  "campaignSlug": "SAF Philippines Nov26"
}
```
Output:
- Normalized UTM: `?utm_source=snapchat&utm_medium=paid_social&utm_campaign=saf_philippines_nov26`
- Spec Verdict: `PASS (65/80 chars)`

### Example 2: Blocking Unconsented Promotional Broadcast
Input: Recipient `+966550001111` has status `unsubscribed` in `mena_marketing_consent`.
Output: Exclude recipient from broadcast batch, increment `blockedByPdplCount`, and log compliance skip without transmitting message.

## Output Format

When auditing or reporting CRM & Marketing operations, return:
1. **Signal Readiness & AARRR Summary**: Readiness score (`0–100`), blended `CPL`, `CPA`, `ROAS` (`⃁`), and weighted pipeline forecast (`⃁`).
2. **Campaign & Funnel Diagnostics**: Table of active campaigns with efficiency index, outlier flags (`ZERO_CONVERSIONS`, `HIGH_CPA_OUTLIER`, `CREATIVE_FATIGUE`), and bounded `±20%` budget recommendations.
3. **Compliance & SLA Status**: Count of rotting/overdue SLA leads and PDPL Art. 25 consent verification status.

## Limitations

- Historical ROAS and Efficiency Index are descriptive metrics and do not prove causal incrementality without controlled holdout or bounded budget tests.
- External ad platform spend figures require CSV import or manual sync unless live platform OAuth credentials are configured in environment variables.
- Never bypass `company_id` Row Level Security (`RLS`) or departmental RBAC isolation (`kasAllowedEmails.ts`).
