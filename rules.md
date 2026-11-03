# ميثاق القواعد والمعايير الهندسية (Engineering Rules & Architecture Governance)
## منظومة ERP مجموعة خالد السليم القابضة (`خالد السليم | Al-Sulaim`)

---

### 1. سياسة الواقعية ومنع المحاكاة الوهمية (Zero-Mock Infrastructure Policy)
1.1. **محركات أعمال حتمية ومختبرة**: كافة العمليات المالية، والضريبية، والتعاقدية تمر عبر محركات منطق أعمال حقيقية مختبرة آلياً في [`src/services/`](src/services/).
1.2. **الاعتماد على Supabase و PostgreSQL مع طبقة الصمود الهجينة**:
   - جميع عمليات القراءة والكتابة للبيانات تمر عبر استعلامات مؤمنة بقواعد `Row-Level Security (RLS)` مع دعم طابور المزامنة غير المتصل ([`offlineQueueService.ts`](src/services/offlineQueueService.ts)) وصندوق الصادر التبادلي ([`domainEventBus.ts`](src/services/domainEventBus.ts)).
1.3. **التوقيع والتشفير الحقيقي**:
   - الفوترة الإلكترونية (`ZATCA Phase 2`) تستخدم التوليد الفعلي لشفرات `TLV Base64` ووثائق `UBL 2.1 XML` وسلسلة الهاش المشفر `SHA-256 (PIH)` في [`zatcaPhase2Service.ts`](src/services/zatcaPhase2Service.ts).
   - بوابات الدفع تتحقق رياضياً من تواقيع `HMAC-SHA256` ومفاتيح عدم التكرار (`Idempotency-Key`) في [`paymentOrchestratorService.ts`](src/services/paymentOrchestratorService.ts) و[`idempotencyService.ts`](src/services/idempotencyService.ts).

---

### 2. قواعد العزل الصارم بين الشركات التابعة (Multi-Tenancy Isolation Invariants)
2.1. **إلزامية معرّف الشركة (`company_id`)**:
   - كل سجل تشغيلي ومالي يحمل حقل `company_id` إلزامياً ينتمي لأحد الكيانات الخمسة المعتمدة (`SAF`, `YAQ`, `TOP`, `KAS`, `DAR`).
   - تُطبق سياسة العزل في قاعدة البيانات وفي طبقة التطبيق عبر [`CompanyContext.tsx`](src/contexts/CompanyContext.tsx) و[`iamPolicyEngine.ts`](src/services/iamPolicyEngine.ts):
     ```sql
     CREATE POLICY "Optimal_Tenant_Isolation" ON recruitment_contracts
     FOR ALL TO authenticated
     USING (
       company_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id'))
       OR (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('رئيس المجموعة', 'مدير نظام')
     );
     ```
2.2. **حظر تسريب البيانات العابر للشركات (Zero Cross-Tenant Leakage)**:
   - يُمنع ظهور عقود أو فواتير أو وحدات حصرية لشركة تابعة (مثل وحدات `exclusiveToCompany: 'KAS'` الخاصة بشركة كاس للمنافسات) لموظفي شركات الاستقدام أو التأجير (`SAF`, `YAQ`, `TOP`).
   - يُقفل حساب الموظف غير التنفيذي على شركته المعينة (`getLockedSessionCompany`) ويُرفض دخوله لأي بوابة شركة أخرى عبر [`authService.validateCompanyAccess`](src/services/authService.ts).

---

### 3. معايير هندسة الكود، عدم التكرار، والتايب سكريبت (TypeScript & Idempotency Standards)
3.1. **الصرامة النوعية (`tsc --noEmit` = 0 Errors)**:
   - جميع العقود البرمجية، الكيانات، والأحداث النطاقية معرفة بأنواع صارمة في [`src/types/`](src/types/).
3.2. **فصل طبقات التصميم (Clean Modular Architecture)**:
   - **طبقة العرض (`src/pages/` و`src/components/`)**: تلتزم حصرياً بنظام تصميم `DESIGN-mobbin.md` الأحادي النقي، وتفوض جميع العمليات لطبقة الخدمات.
   - **طبقة النطاق والخدمات (`src/services/`)**: تضم محركات النطاق المستقلة (`musanedLifecycleEngine`, `fleetDispatchEngine`, `paymentOrchestratorService`, `inventoryReservationService`, `journalEngine`, `zatcaPhase2Service`, `iamPolicyEngine`).
   - **طبقة الحالة والجلسة (`src/contexts/` و`src/stores/`)**: تدير جلسة الـ IAM، الشركة النشطة، والإشعارات اللحظية.
3.3. **حتمية عدم التكرار (`Idempotency-Key` Enforcement)**:
   - كل عملية تحصيل مالي أو حجز ضمان في [`paymentOrchestratorService.ts`](src/services/paymentOrchestratorService.ts) تمر وجوباً عبر [`idempotencyService.executeWithIdempotency`](src/services/idempotencyService.ts) لمنع الازدواج المالي عند تذبذب الشبكة.

---

### 4. حوكمة الأستاذ العام وحسابات الضمان (Ledger & Escrow Invariants)
4.1. **دفتر أستاذ غير قابل للتعديل أو الحذف (`Append-Only General Ledger`)**:
   - يُحظر تعديل (`updateJournalEntry`) أو حذف (`deleteJournalEntry`) أي قيد يومية بعد ترحيله (`status === 'POSTED'`).
   - التصحيح المحاسبي يتم حصراً عبر إصدار قيد عكسي متوازن (`reverseJournalEntry`) يعكس أطراف المدين والدائن ويسم القيد الأصلي بالحالة `REVERSED`.
4.2. **شرط الفحص الطبي لتحرير الضمان (`Escrow Medical Clearance Gate`)**:
   - تُحتجز مبالغ العقود المحصلة في حساب التزامات الضمان (`2105`)، ويُحظر تحرير عمولة الوكالة الخارجية أو إثبات الإيراد المحقق قبل توثيق اجتياز الفحص الطبي (`releaseToAgencyAfterMedical`).

---

### 5. أمن المعلومات وحوكمة الهوية والـ PDPL (IAM & Security Governance)
5.1. **سياسة المنع الافتراضي (`Deny by Default`)**:
   - يرفض [`iamPolicyEngine.evaluateAccessDecision`](src/services/iamPolicyEngine.ts) أي طلب غير مصادق عليه، أو صادر من حساب موقوف، أو يفتقر لرمز الصلاحية الصريح، أو يحاول الوصول لسجل خارج `company_id` أو `DataScopeLevel`.
5.2. **الامتثال لنظام حماية البيانات الشخصية السعودي (`PDPL`)**:
   - تُعمّى أرقام الهويات الوطنية (`10******32`)، الجوازات (`P*****43`)، الآيبان (`SA44****************1234`)، والجوالات للأدوار غير المخولة عبر [`src/utils/pdplMasking.ts`](src/utils/pdplMasking.ts).
5.3. **الهوية البصرية المؤسسية الموحدة (`Mobbin Monochrome UI Rules`)**:
   - التزام كامل بلوحة الألوان الأحادية (`#ffffff`, `#f3f3f3`, `#141414`, `#707070`, `#0066ff`)، ومنع الرموز التعبيرية العشوائية (Emojis) في مكونات الواجهة، ومنع تكرار الترويسات أو القوائم الجانبية داخل الصفحات الفرعية.

---

### 6. بوابات الجودة الإلزامية قبل الرفع (Pre-Push Quality Gates)
6.1. نجاح فحص الأنواع `npx tsc --noEmit` بنسبة 100% بدون أي أخطاء.
6.2. نجاح حزمة الاختبارات الآلية `npx vitest run` (20 ملف اختبار / 97 اختباراً للوحدات والتكامل).
