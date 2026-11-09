# Rules.md — القواعد والضوابط الهندسية الصارمة للمنظومة
*(Living Governance Rules — Khalid Al-Sulaim Holding Group ERP v4.2)*

تُعد هذه الوثيقة المرجع الإلزامي لجميع عمليات التطوير، المراجعة الهندسية (`/vibers-code-review`)، التنظيف الجراحي (`/vibe-code-cleanup`)، وفحص الجاهزية الإنتاجية (`/vibecode-production-qa-validator`). **تعليمات المستخدم الحية لها الأولوية القصوى دائماً، ويتم تحديث هذا الملف فور صدور أي توجيه جديد.**

---

## 1. الهوية البصرية ونظام التصميم (`Mobbin Gallery-White Monochrome`)
المرجع التفصيلي: [`DESIGN.md`](DESIGN.md) · [`src/styles/tokens.css`](src/styles/tokens.css) · [`src/styles/index.css`](src/styles/index.css)
- **لوحة الألوان الحصرية (Strict Monochrome Ladder)**:
  - حبر أسود داكن (`#141414`) على خلفية بيضاء نقية (`#ffffff`).
  - تدرجات الأسطح الفرعية: `#f3f3f3` و`#f0f0f0` مع حدود دقيقة `1px solid #e0e0e0`.
  - النص الثانوي: `#707070` و`#a0a0a0`.
  - لون التمييز الوظيفي الوحيد المسموح للشارات النشطة: `#0066ff` (Electric Blue).
- **ممنوعات بصرية صارمة**:
  - يُمنع استخدام الألوان الزخرفية العشوائية أو التدرجات اللونية الصاخبة أو الظلال الثقيلة.
  - يُمنع استخدام الرموز التعبيرية (Emojis) داخل الواجهات التشغيلية؛ وتُستبدل حصراً بأيقونات `lucide-react` متجهة (`20x20px`) داخل حاويات سكويركل (`44x44px` بحواف `14px`).

---

## 2. ضوابط رمز الريال السعودي (`SAMA SRS Guidelines — U+20C1`)
المرجع البرمجي: [`src/components/common/SaudiRiyalSymbol.tsx`](src/components/common/SaudiRiyalSymbol.tsx) · [`src/utils/currencyFormat.ts`](src/utils/currencyFormat.ts)
- استخدام رمز اليونيكود الرسمي `U+20C1` (`⃁`) حصراً عبر خط `saudi_riyal`.
- يوضع رمز الريال السعودي (`⃁`) دائماً على **يسار الرقم** في اللغتين العربية (RTL) والإنجليزية (LTR) مع ترك مسافة فاصلة واضحة (`⃁ 1,250.00`).
- في القيم السالبة يوضع الرمز على يسار إشارة السالب (`⃁ -1,250.00`).
- تفعيل `font-variant-numeric: tabular-nums` في جميع الجداول المالية وميزان المراجعة.

---

## 3. القواعد الذهبية للمحاسبة والقوائم المالية (`SOCPA / IFRS / ZATCA`)
المرجع البرمجي: [`src/services/accounting/journalEngine.ts`](src/services/accounting/journalEngine.ts) · [`src/services/accounting/ifrsFinancialEngineService.ts`](src/services/accounting/ifrsFinancialEngineService.ts) · [`src/services/accounting/accountingConsolidationService.ts`](src/services/accounting/accountingConsolidationService.ts)
1. **توازن القيد المزدوج الإلزامي (`Double-Entry Invariant`)**:
   - لا يُقبل ترحيل أي قيد يومية ما لم يتطابق إجمالي المدين مع إجمالي الدائن بدقة تامة ($\sum \text{Debit} = \sum \text{Credit}$ وبفارق `< 0.001`).
2. **سجل قيود غير قابل للتعديل المباشر (`Append-Only Posted Ledger`)**:
   - القيود المرحّلة (`POSTED`) لا تُحذف ولا تُعدّل مباشرة؛ بل تُعالج حصراً عبر إصدار قيد عكسي (`reverseJournalEntry` — `REVERSAL`) مرتبط برقم القيد الأصلي.
3. **حوكمة قفل الفترات المحاسبية (`Fiscal Period Lock`)**:
   - يُمنع إنشاء أو ترحيل أو عكس أي قيد يقع تاريخه ضمن فترة مالية مقفلة (`isPeriodLocked(companyId, entryDate)`).
4. **التزامن الفوري مع شجرة الحسابات وميزان المراجعة (`Real-Time Ledger Sync`)**:
   - كل قيد مرحّل يحدث فوراً أرصدة شجرة الحسابات ذات الـ 4 مستويات (`chartOfAccountsService`) وميزان المراجعة المكون من 211 حساباً و34 تصنيفاً رئيسياً (`ifrsFinancialEngineService`).

---

## 4. ضوابط حركات الواجهة (`StyleSeed /ui-motion Rules`)
المرجع البرمجي: [`src/styles/index.css`](src/styles/index.css)
1. **بذرة حركة موحدة (`One Seed Per Context`)**:
   - `motion-silk-enter`: لحاويات الصفحات، النوافذ المنبثقة (`Modals`)، ومصفوفات التحليل المالي.
   - `motion-snap-enter`: للتبويبات الفرعية والقوائم المنسدلة.
   - `motion-spring-press`: لأزرار التنفيذ والاعتماد المالي.
2. **عدم تأخير البيانات المالية (`Never Delay the Payload`)**:
   - يُمنع تطبيق أي تأخير حركي (`animation-delay`) على الأرقام المالية أو أرصدة الحسابات أو مؤشرات الأداء (`KPIs`).
3. **تسريع العتاد وإمكانية الوصول (`GPU Compositing & Accessibility`)**:
   - الاقتصار على تحريك `transform` و`opacity` فقط، مع الالتزام الكامل بـ `@media (prefers-reduced-motion: reduce)`.

---

## 5. التنظيف الجراحي ومعايير الـ Commit والمراجعة (`/vibe-code-cleanup` & `/vibers-code-review`)
1. **الجراحة لا الهدم (`Surgery, Not Demolition`)**:
   - عدم تغيير المسارات (`?tab=...`) أو عقود البيانات أو منطق المصادقة (`AuthContext` / `RBACContext` / `IamSessionContext`) إلا بطلب صريح.
   - منع كتل `catch {}` الصامتة واستبدالها بتسجيل تشخيصي منظم.
2. **إلزامية قسم `"How to test"` في رسائل الـ Commit (`/vibers-code-review`)**:
   - يجب أن تتضمن كل رسالة `git commit` وصفاً واضحاً للتغيير متبوعاً بقسم `How to test:` يوضح خطوات التحقق للمراجع البشري أو الآلي:
   ```text
   feat(accounting): enforce fiscal period lock and auto-post operational vouchers

   How to test:
   1. Open /?tab=journals and lock period 2026-06.
   2. Attempt to post a journal entry dated 2026-06-15 -> verify rejection toast.
   3. Run `npx vitest run src/services/accounting/journalEngine.test.ts` -> verify 9/9 pass.
   ```
