# ERP Site Architecture & Navigation Restructuring Plan

## Goal
Standardize the enterprise information architecture, 3-level URL/tab hierarchy, breadcrumb navigation, and cross-module internal linking across the 9 official departments and 4 sister companies (`SAF`, `YAQ`, `KAS`, `DAR`) of Khalid Al-Sulaim Holding Group ERP.

## Tasks
- [x] Task 1: Map and register all 20 financial & IFRS sub-routes (`ifrs-engine`, `group-consolidation`, `musaned-escrow`, `suppliers-agents`, `eosb-zakat`, `period-closing`, `cash-flow`, `aging`, `budget`, `financial-ratios`) in `src/App.tsx` so zero orphan routes exist → Verify: Navigate to `?tab=ifrs-engine` or `?tab=musaned-escrow` and confirm `FinancePage` renders without fallback.
- [x] Task 2: Align `getMappedTab` in `src/pages/FinancePage.tsx` with all Sidebar and URL slugs (`cash-flow-statement`, `ar-aging`, `ap-aging`, `group-consolidation`, `eosb-zakat`) → Verify: Selecting any financial item from `Sidebar.tsx` opens the exact corresponding tab inside `FinancePage.tsx`.
- [x] Task 3: Expose the 4 core accounting hubs (`ifrs-engine`, `period-closing`, `musaned-escrow`, `suppliers-agents`) directly under Department 2 (`2. المالية والمحاسبة وZATCA`) in `src/data/sidebarMenu.ts` to enforce the 3-Click Rule (L0 Dashboard → L1 Dept 2 → L2 Screen) → Verify: Expand `2. المالية والمحاسبة وZATCA` in the sidebar and confirm all 24 items appear and route cleanly.
- [x] Task 4: Wire Hub-and-Spoke internal linking between Operational Spokes (`RecruitmentContractsPage`, `RentContractsPage`, `SponsorshipTransferPage`, `HRPage`, `FinancialRequestsPage`, `CostCentersPage`, `kasEtmadSuiteService`) and the Unified Accounting Hub (`journalEngine` → `chartOfAccountsService` + `ifrsFinancialEngineService`) → Verify: Run `npx vitest run src/services/accounting/journalEngine.test.ts` and confirm all 9 double-entry & consolidation tests pass.
- [x] Task 5: Build the IFRS 10 Group Holding Consolidation Matrix (`accountingConsolidationService.ts` + Tab 7 in `IfrsFinancialEngineWorkspace.tsx`) with intercompany eliminations across `SAF`, `YAQ`, `KAS`, and `DAR` → Verify: Open `محرك القوائم الموحدة للمجموعة (IFRS 10)` and verify `balanceSheetDiff === 0.00`.
- [x] Task 6: Add interactive Breadcrumb navigation (`الرئيسية / القسم الإداري / الشاشة الحالية`) in `src/components/layout/Header.tsx` mirroring the L0 → L1 → L2 hierarchy → Verify: Click parent department or home segment in the header breadcrumb bar to navigate back in 1 click.
- [x] Task 7: Run full TypeScript verification (`npx tsc --noEmit`) and production bundle build (`npm run build`) → Verify: Zero compiler errors and clean Vite production output in `dist/`.

## Done When
- [x] Every ERP screen is reachable within ≤ 2 clicks from the Sidebar or App Launcher (3-Click Rule satisfied).
- [x] Zero orphan tabs or unmapped URL slugs exist between `SIDEBAR_MENU`, `App.tsx`, and `FinancePage.tsx`.
- [x] All operational spokes automatically post balanced double-entry journals to the General Ledger, COA (86 accounts), and IFRS Trial Balance (211 accounts).
- [x] `npx tsc --noEmit`, `npx vitest run src/services/accounting/journalEngine.test.ts`, and `npm run build` pass with 0 errors.
