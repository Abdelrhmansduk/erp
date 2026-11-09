# خطة المهام وجدول التنفيذ (Engineering Roadmap & Tasks Breakdown)
## منظومة ERP مجموعة خالد السليم القابضة (`خالد السليم | Al-Sulaim`)

---

### 1. ملخص المراحل الاستراتيجية (Milestone Overview)

```
[ المرحلة 1: البنية التحتية والمصادقة ] ────► [ المرحلة 2: محركات العمليات ومساند ]
                   ▲                                            │
                   │                                            ▼
[ المرحلة 8: الحوكمة المعمارية (16 ركيزة) ] ◄── [ المرحلة 3: الفوترة والربط المالي ]
                   ▲                                            │
                   │                                            ▼
[ المرحلة 5/6/7: البوابات والمرصد والتصميم ] ◄── [ المرحلة 4: منافسات كاس واعتماد ]
```

---

### 2. جدول المهام المفصلة (Atomic Tasks Breakdown)

#### المرحلة 1: الأمان والمصادقة والعزل المؤسسي (Security & Multi-Tenancy)
- [x] **TASK-101**: تصميم وبناء واجهة التعريف والدخول المؤسسي المقسومة (التعريف على اليمين وبطاقة تسجيل الدخول على اليسار) في [`src/pages/LandingPage.tsx`](src/pages/LandingPage.tsx) و[`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx).
- [x] **TASK-102**: تفعيل مصادقة الدخول الموحد بـ Supabase وربط دليل حسابات الشركات الـ 5 والأقسام الـ 9 في [`src/services/authService.ts`](src/services/authService.ts).
- [x] **TASK-103**: تفعيل المصادقة البيومترية العتادية (`WebAuthn / Passkeys`) والرابط السحري الموثق.
- [x] **TASK-104**: تفعيل محرك صلاحيات الـ IAM ذي الـ 7 مستويات (`DataScopeLevel 0..6`) وفصل المهام (`SoD`) في [`src/services/iamPolicyEngine.ts`](src/services/iamPolicyEngine.ts).
- [x] **TASK-105**: تطبيق سياسات العزل المؤسسي الصارم (`Multi-Tenancy RLS`) وإخفاء البيانات الحساسة (`PDPL Masking`) في [`src/utils/pdplMasking.ts`](src/utils/pdplMasking.ts).

#### المرحلة 2: محرك خطوط أنابيب الاستقدام والتشغيل (Recruitment, Inventory & Fleet Pipeline)
- [x] **TASK-201**: بناء محرك دورة حياة عقد مساند (`Musaned State Machine`) في [`src/services/musanedLifecycleEngine.ts`](src/services/musanedLifecycleEngine.ts) مع مصفوفة الانتقالات الحتمية (`ALLOWED_STAGE_TRANSITIONS`) وبث أحداث النطاق.
- [x] **TASK-202**: بناء نظام حساب فترة الضمان التلقائي (`90 يوماً`) وحساب نسب الاسترداد والتعويض وفق لائحة وزارة الموارد البشرية.
- [x] **TASK-203**: بناء محرك الحجز المؤقت للمخزون والسير الذاتية (`15-Minute Soft Lease Lock`) في [`src/services/inventoryReservationService.ts`](src/services/inventoryReservationService.ts) لمنع الحجز المزدوج.
- [x] **TASK-204**: تطبيق خوارزمية تسعير باقات التأجير، وتحسين مسارات السائقين جغرافياً (`Haversine`)، والتحقق من التسليم برمز `OTP` في [`src/services/fleetDispatchEngine.ts`](src/services/fleetDispatchEngine.ts).
- [x] **TASK-205**: بناء محرك التقييم والترشيح الذكي للكفاءات (`ATS Candidate Scoring`) في [`src/services/fleetDispatchEngine.ts`](src/services/fleetDispatchEngine.ts).

#### المرحلة 3: المحاسبة المركزية، حساب الضمان، وهيئة الزكاة (Ledger, Escrow & ZATCA Phase 2)
- [x] **TASK-301**: بناء محرك الفوترة الإلكترونية للمرحلة الثانية (`XML UBL 2.1`) في [`src/services/zatcaPhase2Service.ts`](src/services/zatcaPhase2Service.ts).
- [x] **TASK-302**: توليد شفرة الاستجابة السريعة (`QR Code TLV Base64`) وسلسلة الهاش التشفيري المترابط (`PIH SHA-256` عبر `chainZatcaInvoices`).
- [x] **TASK-303**: بناء محرك تنسيق المدفوعات وحساب الضمان (`Escrow Account 2105`) المشروط باجتياز الفحص الطبي في [`src/services/paymentOrchestratorService.ts`](src/services/paymentOrchestratorService.ts) مع حماية `Idempotency-Key` في [`src/services/idempotencyService.ts`](src/services/idempotencyService.ts).
- [x] **TASK-304**: أتمتة قيود اليومية المزدوجة (`Append-Only Double-Entry Ledger`) مع القيد العكسي (`reverseJournalEntry`) في [`src/services/accounting/journalEngine.ts`](src/services/accounting/journalEngine.ts) و[`src/services/accounting/automationEngine.ts`](src/services/accounting/automationEngine.ts).

#### المرحلة 4: منصة اعتماد وجداول الكميات لشركة كاس (KAS Etimad & BOQ)
- [x] **TASK-401**: محرك تفكيك وتحليل ملفات جداول الكميات (`BOQ`) في [`src/services/kasEtmadSuiteService.ts`](src/services/kasEtmadSuiteService.ts).
- [x] **TASK-402**: نظام إصدار وتتبع الضمانات البنكية للمنافسات وتنبيهات الانتهاء في [`src/services/tenderAnalyticsService.ts`](src/services/tenderAnalyticsService.ts).
- [x] **TASK-403**: أداة المقارنة المرجعية لأسعار بنود المنافسات وحساب احتمالية الفوز (`benchmarkBoqItemPricing`).

#### المرحلة 5: البوابات الرقمية، الإيواء، والتجارة الإلكترونية (Portals, Shelter & E-Commerce OMS)
- [x] **TASK-501**: بوابة العملاء للخدمة الذاتية وتتبع العقود في [`src/pages/ClientPortalPage.tsx`](src/pages/ClientPortalPage.tsx).
- [x] **TASK-502**: بوابة المكاتب والوكالات الخارجية في [`src/pages/ForeignAgencyPortalPage.tsx`](src/pages/ForeignAgencyPortalPage.tsx).
- [x] **TASK-503**: منظومة مراكز الإيواء والتسكين ونقل الخدمات (`DAR`) في [`src/services/shelterTransferStore.ts`](src/services/shelterTransferStore.ts) و[`src/pages/ShelterOperationsSuitePage.tsx`](src/pages/ShelterOperationsSuitePage.tsx).
- [x] **TASK-504**: محرك تزامن المتاجر الإلكترونية (`Salla`, `Zid`, `Shopify`, `WooCommerce`) في [`src/services/ecommerceSyncService.ts`](src/services/ecommerceSyncService.ts).

#### المرحلة 6: الأحداث اللحظية، المزامنة الخلفية، وطابور عدم الاتصال (EDA, Real-Time & Offline Sync)
- [x] **TASK-601**: بناء ناقل الأحداث النطاقية بصندوق الصادر التبادلي (`Transactional Outbox`) في [`src/services/domainEventBus.ts`](src/services/domainEventBus.ts).
- [x] **TASK-602**: بناء قنوات البث اللحظي المعزولة لكل شركة (`tenant:[company_id]:orders` و`contract:[contract_id]:milestones`) في [`src/services/realtimeSubscriptionService.ts`](src/services/realtimeSubscriptionService.ts).
- [x] **TASK-603**: بناء طابور العمليات دون اتصال مع التراجع الأسي (`Exponential Backoff 1s..16s`) في [`src/services/offlineQueueService.ts`](src/services/offlineQueueService.ts).
- [x] **TASK-604**: بناء محرك التنفيذ الخلفي ونبض `Web Worker` في [`src/services/backgroundExecutionService.ts`](src/services/backgroundExecutionService.ts).

#### المرحلة 7: المرصد الحي للأخطاء وتوحيد نظام تصميم Mobbin عبر الأقسام الـ 9
- [x] **TASK-701**: بناء محرك رصد الأخطاء الحي والاستشفاء الذاتي ([`src/services/errorMonitorService.ts`](src/services/errorMonitorService.ts)) ولوحة المراقبة النهارية ([`src/components/monitoring/EnterpriseErrorMonitorPanel.tsx`](src/components/monitoring/EnterpriseErrorMonitorPanel.tsx)).
- [x] **TASK-702**: بناء محرك التدقيق الأمني وكشف الشذوذ (`Brute Force` / `IP Whitelist`) في [`src/services/securityAuditService.ts`](src/services/securityAuditService.ts).
- [x] **TASK-703**: توحيد الهوية البصرية (`DESIGN-mobbin.md`) عبر كافة الأقسام الـ 9، وإصلاح مقاسات الأيقونات (`44x44px` squircle) ومحدد الفرع (`المقر الرئيسي للمجموعة - الرياض`) في [`Header.tsx`](src/components/layout/Header.tsx) و[`Sidebar.tsx`](src/components/layout/Sidebar.tsx) و[`AppLauncherPage.tsx`](src/pages/AppLauncherPage.tsx).
- [x] **TASK-704**: التحقق الشامل من الركائز المعمارية الـ 16 واجتياز جميع الاختبارات الآلية (`22/22` ملف اختبار، `111/111` اختباراً ناجحاً، و`0` أخطاء `tsc --noEmit`).
- [x] **TASK-705**: تطبيق الدليل الإرشادي الرسمي لرمز الريال السعودي الصادر عن البنك المركزي السعودي (`SAMA SRS Guidelines.pdf` — `U+20C1` `⃁`) عبر 65 ملفاً ومكوناً وتقريراً في المنظومة.
