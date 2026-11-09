# منظومة توجيه وتشغيل المهارات (`AGENTS.md` — Skill Orchestrator)
## مشروع ERP مجموعة خالد السليم القابضة (`خالد السليم | Al-Sulaim`)

يعمل هذا الملف كموجه مركزي (`Skill Router`) يربط كل مهمة برمجية أو تشغيلية في المشروع بالمهارة المختصة داخل [`.agents/skills/`](.agents/skills/) والمهارات التخصصية المثبتة في البيئة.

---

## 1. جدول توجيه المهارات حسب المهمة (`Skill Routing Matrix`)

| مجال العمل / المهمة | المهارة المحلية في المشروع (`.agents/skills/`) | المهارات المساندة في البيئة (`Global Skills`) |
| :--- | :--- | :--- |
| **تصميم الواجهات والثيم الأحادي (Mobbin UI)** | [`.agents/skills/ui-ux-design-system/SKILL.md`](.agents/skills/ui-ux-design-system/SKILL.md) | `ui-a11y`, `ui-review`, `frontend-design` |
| **مكونات React 19 وTypeScript وإدارة الحالة** | [`.agents/skills/react-typescript-best-practices/SKILL.md`](.agents/skills/react-typescript-best-practices/SKILL.md)<br>[`.agents/skills/vercel-react-best-practices/SKILL.md`](.agents/skills/vercel-react-best-practices/SKILL.md) | `zustand-store-ts`, `react-component-performance`, `react-patterns` |
| **قواعد البيانات، العزل `RLS`، والمصادقة الهجينة** | [`.agents/skills/supabase-integration/SKILL.md`](.agents/skills/supabase-integration/SKILL.md)<br>[`.agents/skills/supabase/SKILL.md`](.agents/skills/supabase/SKILL.md)<br>[`.agents/skills/supabase-postgres-best-practices/SKILL.md`](.agents/skills/supabase-postgres-best-practices/SKILL.md) | `database-admin`, `nextjs-supabase-auth` |
| **المحاسبة، ZATCA، حماية الأجور WPS، مساند، وإيواء** | [`.agents/skills/saudi-erp-compliance/SKILL.md`](.agents/skills/saudi-erp-compliance/SKILL.md) | `xlsx-official`, `data-storytelling` |
| **المساعد الصوتي الذكي (فارس `salim_1` ونورة)** | [`.agents/skills/saudi-voice-copilot-tts/SKILL.md`](.agents/skills/saudi-voice-copilot-tts/SKILL.md) | `voice-agents` |
| **التصدير (`23 قالب Excel/CSV/WPS`) والتتبع** | [`.agents/skills/saudi-erp-compliance/SKILL.md`](.agents/skills/saudi-erp-compliance/SKILL.md) | `xlsx-official`, `analytics-tracking` |
| **تطبيق الجوال (`mobile_app/` Flutter)** | [`.agents/skills/ui-ux-design-system/SKILL.md`](.agents/skills/ui-ux-design-system/SKILL.md) | `flutter-expert`, `android_ui_verification` |
| **الاختبارات الآلية، جودة الاختبارات، واختبار الحمل** | [`.agents/skills/testing-and-qa/SKILL.md`](.agents/skills/testing-and-qa/SKILL.md)<br>[`.agents/skills/playwright-best-practices/SKILL.md`](.agents/skills/playwright-best-practices/SKILL.md)<br>[`.agents/skills/playwright-cli/SKILL.md`](.agents/skills/playwright-cli/SKILL.md) | `brooks-test`, `k6-load-testing`, `test-driven-development`, `webapp-testing` |
| **الأمان، حماية المفاتيح، وخصوصية البيانات `PDPL`** | [`.agents/skills/code-review-security-audit/SKILL.md`](.agents/skills/code-review-security-audit/SKILL.md) | `secrets-management`, `security-auditor`, `vercel-deployment` |

---

## 2. أوامر التشغيل والفحص السريع (`Quick Execution Commands`)

- **فحص جاهزية جميع المهارات وبوابات الجودة والأمان**:
  ```bash
  npm run skills:verify
  ```
- **تشغيل فحص الأنواع وحزم اختبارات Vitest (`27 حزمة / 208 اختبارات`)**:
  ```bash
  npx tsc --noEmit && npx vitest run
  ```
- **تشغيل اختبار الحمل والأداء (`k6-load-testing` — 500 طلب متزامن عبر 3 مراحل)**:
  ```bash
  npm run test:load
  ```
- **تشغيل فحص المتصفح الآلي (`Chromium E2E Browser Verifier`)**:
  ```bash
  npm run test:browser
  ```
- **تشغيل فحص الـ 77 وحدة تشغيلية وتدقيق الـ 58 صفحة**:
  ```bash
  node scripts/run_automated_tests.js && node scripts/audit_system.cjs
  ```
