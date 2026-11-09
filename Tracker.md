# Tracker.md — سجل التقدم التراكمي للمشروع (Append-Only Progress Tracker)
*(Living Project Memory — Khalid Al-Sulaim Holding Group ERP v4.2)*

> **قاعدة التحديث (`/not-a-vibe-coder`)**: هذا الملف تراكمي (`Append-Only`) يوثق المراحل المنجزة والتحققات المعتمدة دون حذف السجلات السابقة.

---

## [2026-11-08] المرحلة 1: استكمال التكامل المحاسبي والمالي الشامل (5-Track Accounting & IFRS Plan)
- [x] **Track 1 — حوكمة قفل الفترات المحاسبية والقيود العكسية (`journalEngine.ts`)**:
  - تنفيذ دوال `getLockedPeriods`، `isPeriodLocked`، `lockFiscalPeriod`، `unlockFiscalPeriod`، `togglePeriodLock`، و`reverseJournalEntry` مع الربط بـ `erpIndexedStorage`.
  - إضافة شريط حوكمة قفل الفترات المحاسبية الشهرية في [`src/pages/JournalsPage.tsx`](src/pages/JournalsPage.tsx) وربط شاشة إقفال الفترات في [`src/pages/FinancePage.tsx`](src/pages/FinancePage.tsx).
- [x] **Track 2 — الترحيل الآلي للعمليات التشغيلية (`Operational Auto-Posting`)**:
  - دعم أنواع المعاملات التشغيلية: `MUSANED_ESCROW_RELEASE` (تحرير أمانة مساند 90 يوماً)، `FOREIGN_AGENT_SETTLEMENT` (تسوية الوكلاء بالدولار والريال `3.75`)، `COST_CENTER_EXPENSE`، `FINANCIAL_REQUEST_APPROVAL`، `EOSB_SETTLEMENT` (تسوية مكافأة نهاية الخدمة IAS 19)، و`SALES_INVOICE_ISSUED`.
  - ربط [`src/pages/CostCentersPage.tsx`](src/pages/CostCentersPage.tsx)، [`src/pages/FinancialRequestsPage.tsx`](src/pages/FinancialRequestsPage.tsx)، و[`src/services/kasEtmadSuiteService.ts`](src/services/kasEtmadSuiteService.ts) بالترحيل المزدوج الفوري.
- [x] **Track 3 — القوائم المالية الموحدة للمجموعة القابضة (`IFRS 10 Consolidation`)**:
  - إنشاء [`src/services/accounting/accountingConsolidationService.ts`](src/services/accounting/accountingConsolidationService.ts) لتوحيد موازين المراجعة للشركات الـ 4 (`SAF`, `YAQ`, `KAS`, `DAR`) مع استبعادات الأرصدة البينية (`IFRS 10.B86`).
  - إضافة تبويب «القوائم الموحدة للمجموعة (IFRS 10)» في [`src/components/accounting/IfrsFinancialEngineWorkspace.tsx`](src/components/accounting/IfrsFinancialEngineWorkspace.tsx).
- [x] **Track 4 — مصفوفة ربحية مراكز التكلفة والفروع (`Cost Center P&L Matrix`)**:
  - إضافة مصفوفة تحليل الإيرادات والمصروفات الفعلية وهامش المساهمة لكل مركز تكلفة في [`src/pages/CostCentersPage.tsx`](src/pages/CostCentersPage.tsx).
- [x] **Track 5 — اختبارات الوحدة الآلية للمحرك المحاسبي (`journalEngine.test.ts`)**:
  - إضافة واجتياز 9 اختبارات شاملة (`9/9 passed`) تغطي القيد المزدوج، قفل الفترات، تحرير مساند، تسوية الوكلاء، عكس القيود، والتوحيد المالي IFRS 10.

---

## [2026-11-08] المرحلة 2: هيكلة المسارات وشجرة التنقل (`/site-architecture` & `/plan-writing`)
- [x] إنشاء وثيقة المعمارية الشاملة [`erp-site-architecture-plan.md`](erp-site-architecture-plan.md) (نمط `Hub-and-Spoke` عبر 9 أقسام رئيسية و55 شاشة).
- [x] توحيد وتسجيل جميع المسارات المحاسبية والـ IFRS الـ 20 في [`src/App.tsx`](src/App.tsx) و`getMappedTab` في [`src/pages/FinancePage.tsx`](src/pages/FinancePage.tsx).
- [x] ترقية شريط التنقل الجانبي [`src/data/sidebarMenu.ts`](src/data/sidebarMenu.ts) بالمسارات المحاسبية الـ 4 الجديدة (`ifrs-engine`, `financial-ratios`, `musaned-escrow`, `bank-reconciliation`).
- [x] تفعيل مسار التنقل التفاعلي (`Interactive Breadcrumbs`: `الرئيسية / القسم / الشاشة`) في [`src/components/layout/Header.tsx`](src/components/layout/Header.tsx).

---

## [2026-11-08] المرحلة 3: فحص الجاهزية الإنتاجية ذو الـ 13 مرحلة (`/vibecode-production-qa-validator`)
- [x] إنشاء [`public/robots.txt`](public/robots.txt) و[`public/sitemap.xml`](public/sitemap.xml) وتأكيد نسخهما إلى `dist/` عبر `scripts/copy_public.js`.
- [x] تدعيم [`index.html`](index.html) بوسوم `Open Graph` (`og:*`)، `Twitter Card` (`twitter:*`)، والبيانات المهيكلة `JSON-LD` (`SoftwareApplication` & `Organization`).
- [x] تحويل حركات الموجات الصوتية (`audioWaveBar1..5`) في [`src/styles/index.css`](src/styles/index.css) من `height` إلى `transform: scaleY(...)` لتسريع العتاد (`GPU-composited`).
- [x] التحقق من استجابة الخادم الحي `200 OK` لجميع المسارات والأصول الثابتة.

---

## [2026-11-08] المرحلة 4: التدقيق الهندسي، التنظيف الجراحي، معايرة الحركات، والحوكمة (`/vibe-code-auditor` · `/vibe-code-cleanup` · `/ui-motion` · `/not-a-vibe-coder` · `/vibers-code-review`)
- [x] معالجة كتل `catch {}` الصامتة في [`src/services/accounting/journalEngine.ts`](src/services/accounting/journalEngine.ts) و[`src/services/kasEtmadSuiteService.ts`](src/services/kasEtmadSuiteService.ts) بتسجيل تحذيري منظم.
- [x] توثيق متغيرات `VITE_PUBLIC_SITE_URL` و`PROD_URL` في [`.env.example`](.env.example).
- [x] إنشاء أداة تنسيق العملة الموحدة [`src/utils/currencyFormat.ts`](src/utils/currencyFormat.ts) (`formatSarCurrency` و`formatUsdToSarPeg`) وفق ضوابط البنك المركزي السعودي (`⃁`).
- [x] تطبيق بذور الحركة المعايرة (`motion-silk-enter`, `motion-snap-enter`, `motion-spring-press`) في [`src/pages/JournalsPage.tsx`](src/pages/JournalsPage.tsx)، [`src/pages/FinancePage.tsx`](src/pages/FinancePage.tsx)، [`src/pages/CostCentersPage.tsx`](src/pages/CostCentersPage.tsx)، و[`src/pages/FinancialRequestsPage.tsx`](src/pages/FinancialRequestsPage.tsx).
- [x] إنشاء [`Rules.md`](Rules.md) و[`Tracker.md`](Tracker.md) وخطوط أنابيب [`.github/workflows/production-qa.yml`](.github/workflows/production-qa.yml) و[`.github/workflows/vibers.yml`](.github/workflows/vibers.yml).

---

## [2026-11-08] المرحلة 5: محرك التهيئة والأتمتة المحاسبية المتقدم (`/odoo-accounting-setup`)
- [x] إنشاء [`src/services/accounting/odooAccountingConfigService.ts`](src/services/accounting/odooAccountingConfigService.ts) لدعم المحاور الثلاثة:
  1. **شروط السداد وخصم التعجيل الآلي (`Odoo Payment Terms & Early Payment Discount`)**: جدولة الدفعات وترحيل القيد الثلاثي لخصم السداد المبكر (`110201` البنك + `520102` خصم تعجيل الدفع + `110402` إقفال ذمة العميل).
  2. **الأوضاع الضريبية والمالية التلقائية (`Odoo Fiscal Positions — ZATCA`)**: التبديل الآلي للضرائب والحسابات بين عقود الأفراد (`15%`)، عقود الشركات B2B (`15%`)، الرسوم الحكومية المعفاة (`0% Out-of-Scope`)، والوكلاء الخارجيين الدوليين (`0% Reverse Charge`).
  3. **نماذج المطابقة البنكية الذكية (`Odoo Reconciliation Models`)**: اكتشاف آلي لرسوم التحويل البنكي (`SARIE`)، عمولات نقاط البيع (`مدى / سداد`)، وفروق تقريب العملة الأجنبية (`FX Rounding`) مع شطب وترحيل آلي وفصل ضريبة المدخلات المستردة (`15%`).
- [x] إنشاء واجهة العمل التفاعلية [`src/components/accounting/OdooAccountingConfigWorkspace.tsx`](src/components/accounting/OdooAccountingConfigWorkspace.tsx) وربطها في [`src/pages/FinancePage.tsx`](src/pages/FinancePage.tsx) و[`src/App.tsx`](src/App.tsx) و[`src/data/sidebarMenu.ts`](src/data/sidebarMenu.ts).
- [x] إضافة اختبارات الوحدة الشاملة في [`src/services/accounting/journalEngine.test.ts`](src/services/accounting/journalEngine.test.ts).
