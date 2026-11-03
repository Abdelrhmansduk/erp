# Mobbin Design System Specification — Khalid Al-Sulaim Holding Group ERP
**Canonical Reference:** `c:\Users\ALIENWARE\Downloads\DESIGN-mobbin.md` · `src/styles/tokens.css` · `src/styles/index.css` · `src/pages/LoginPage.tsx`

---

## 1. Visual Theme & Atmosphere (فلسفة التصميم والهوية البصرية — Mobbin Monochrome)

نظام واجهات **أبيض معارض نقي (Gallery-White Monochrome)** مصمم ليختفي خلف المحتوى التشغيلي والبيانات التي يعرضها:
- **حبر أسود داكن (`#141414` — `{colors.ink}`) على خلفية بيضاء نقية (`#ffffff` — `{colors.canvas}`)**.
- **بناء العمق عبر سُلّم التدرجات الرمادية الخفيفة بدلاً من الظلال (Shadow-Free Tint Ladder)**: لا توجد ظلال ساقطة (`drop-shadows`) على البطاقات أو الأزرار أو شريط التنقل؛ يتم التمييز البصري عبر فروق التعبئة (`#ffffff` مقابل `#f3f3f3` و `#f0f0f0`) وخطوط الإطار الدقيقة بعرض `1px` (`#f0f0f0` و `#e0e0e0`).
- **الأزرار الكبسولية (Stadium-Pill Controls — `{rounded.full}` `9999px`)**: شريط التنقل العائم، جميع الأزرار، محولات التبويبات، والشارات.
- **هندسة البطاقات (`24px` — `{rounded.md}`)** وحقول الإدخال (`16px` — `{rounded.sm}`) وأيقونات السكويركل (`30%` — `app-icon-squircle`).
- **نبرة لونية واحدة فقط (`#0066ff` — `{colors.accent}` Electric Blue)**: مخصصة حصرياً للشارات التجارية المميزة (`badge-popular` مثل `PRO 2026` و `ENTERPRISE`)، ولا تُستخدم أبداً للأزرار أو الزخرفة.

---

## 2. Color Palette & Roles (رموز الألوان الدلالية — `DESIGN-mobbin.md`)

| Token | Hex / Value | Functional Role (الدور الوظيفي) |
| :--- | :--- | :--- |
| `{colors.primary}` | `#141414` | **Ink Black**: لون الهوية الأساسي؛ يملأ جميع أزرار `button-primary` الكبسولية، الشريط السفلي `footer`، والعناوين الكبرى |
| `{colors.on-primary}` | `#ffffff` | النص الأبيض النقي فوق `#141414` أو فوق شارة `#0066ff` |
| `{colors.ink}` | `#141414` | جميع العناوين، النصوص الأساسية، وروابط التنقل |
| `{colors.ink-soft}` | `#262626` | درجة داكنة مخففة للشعارات الثانوية وحالات التحويم على الأزرار السوداء |
| `{colors.text-muted}` | `#707070` | النصوص الثانوية، الأوصاف الفرعية، التبويبات غير النشطة، والروابط المسطرة |
| `{colors.text-faint}` | `#adadad` | النصوص الثلاثية، نصوص العناصر النائبة (`placeholders`)، والهوامش السفلية |
| `{colors.canvas}` | `#ffffff` | الخلفية الافتراضية لجميع الصفحات والبطاقات الأساسية |
| `{colors.canvas-soft}` | `#f3f3f3` | **Soft Canvas (6% ink wash)**: يملأ شريط `nav-pill` العائم، بطاقة المصادقة `ex-auth-form-card`، البطاقات المميزة، ومسار `segmented-control` |
| `{colors.field}` | `#f0f0f0` | **Field (8% ink wash)**: تعبئة حقول الإدخال بدون إطار في حالة السكون |
| `{colors.hairline-soft}` | `#f0f0f0` | إطار `1px` خفيف جداً للبطاقات البيضاء فوق الخلفية البيضاء (`pricing-card`, `testimonial-card`) |
| `{colors.hairline}` | `#e0e0e0` | إطار `1px` أقوى بنسبة 16% للأزرار المفرغة (`button-outline`) والفواصل |
| `{colors.accent}` | `#0066ff` | **Electric Blue**: اللون الوحيد خارج التدرج الأحادي؛ يُحجز حصرياً لشارة `badge-popular` |

---

## 3. Typography Hierarchy (سُلّم الخطوط المتغير — Saans / Inter Variable)

يعتمد النظام خط **Saans** (مع البديل المعياري **Inter Variable** + **Readex Pro** للعربية) بأوزان متغيرة دقيقة (`652` للعناوين، `456` للنصوص، `300` للعناوين الفرعية) مع **`letter-spacing: 0`** في جميع الأحجام، وإنهاء العناوين الرئيسية بنقطة (`.`).

| Token | CSS Class | Size | Weight | Line Height | Letter Spacing | Use |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `{typography.display}` | `.mobbin-display` | `80px` | `652` | `1.0` | `0` | عدادات المنظومة الكبرى وعناوين الـ Hero (`54.`) |
| `{typography.heading-1}` | `.mobbin-heading-1` | `56px` | `652` | `1.0` | `0` | عناوين الصفحات الرئيسية |
| `{typography.heading-2}` | `.mobbin-heading-2` | `44px` | `652` | `1.13` | `0` | عناوين الأقسام الرئيسية |
| `{typography.heading-3}` | `.mobbin-heading-3` | `32px` | `652` | `1.13` | `0` | عناوين بطاقات المصادقة (`تسجيل دخول الإدارة العليا.`) |
| `{typography.heading-4}` | `.mobbin-heading-4` | `24px` | `652` | `1.25` | `0` | عناوين النوافذ الفرعية والخطط |
| `{typography.title}` | `.mobbin-title` | `20px` | `600` | `1.3` | `0` | عناوين الميزات والصفوف المميزة |
| `{typography.body-lg}` | `.mobbin-body-lg` | `20px` | `300` | `1.38` | `0` | العناوين الفرعية الخفيفة المقابلة لعناوين `652` |
| `{typography.body}` | `.mobbin-body` | `16px` | `456` | `1.38` | `0` | النص الأساسي الافتراضي |
| `{typography.body-sm}` | `.mobbin-body-sm` | `14px` | `456` | `1.43` | `0` | النصوص الداعمة وقوائم الميزات |
| `{typography.link}` | `.mobbin-link` | `16px` | `600` | `1.38` | `0` | روابط التنقل وتسميات الأزرار |
| `{typography.label}` | `.mobbin-label` | `12px` | `600` | `1.33` | `0` | تسميات الشارات والحقول |
| `{typography.caption}` | `.mobbin-caption` | `12px` | `456` | `1.33` | `0` | البيانات الوصفية والهوامش |

---

## 4. Geometry, Spacing & Elevation (الأشكال، المسافات، والعمق)

### 4.1. Border Radius Scale (`rounded`)
- `{rounded.none}` (`0px`): شرائط الوسائط الممتدة بعرض الشاشة.
- `{rounded.sm}` (`16px`): حقول الإدخال (`text-input`)، صفوف الأسئلة (`faq-row`)، وبطاقات الحسابات الفرعية.
- `{rounded.md}` (`24px`): البطاقات (`ex-auth-form-card`, `pricing-card`, `ex-modal-card`) والحواف العلوية للفوتر (`footer`).
- `{rounded.full}` (`9999px`): كل عنصر تفاعلي (`nav-pill`, `button-primary`, `button-outline`, `button-pill-soft`, `segmented-control`, `badge-popular`).
- `app-icon-squircle` (`30%`): أيقونات التطبيقات والقطاعات بأسلوب iOS Squircle.

### 4.2. Spacing Scale (`spacing`)
- `{spacing.xxs}`: `4px` · `{spacing.xs}`: `8px` · `{spacing.sm}`: `12px` · `{spacing.md}`: `16px` · `{spacing.lg}`: `24px` · `{spacing.xl}`: `32px` · `{spacing.xxl}`: `48px` · `{spacing.section}`: `80px` · `{spacing.section-lg}`: `120px`.

---

## 5. Canonical Component Specifications (`DESIGN-mobbin.md` §Components)

1. **`nav-pill`**: شريط عائم في منتصف أعلى الصفحة بخلفية `#f3f3f3` (`{colors.canvas-soft}`) وحواف `{rounded.full}` منفصل عن حافة الشاشة.
2. **`button-primary`**: خلفية `#141414`، نص `#ffffff` بخط `{typography.link}` (`16px/600`)، حواف `{rounded.full}`، بدون ظل.
3. **`button-outline`**: خلفية `#ffffff`، نص `#141414`، إطار `1px solid #e0e0e0` (`{colors.hairline}`)، حواف `{rounded.full}`.
4. **`button-pill-soft`**: خلفية `#f3f3f3`، نص `#141414`، بدون إطار، حواف `{rounded.full}`.
5. **`text-input` & `text-input-focused`**: تعبئة `#f0f0f0` (`{colors.field}`) أو `#ffffff` داخل البطاقة الرمادية، بدون إطار في حالة السكون، حواف `16px` (`{rounded.sm}`)، وعند التركيز يظهر إطار `2px solid #141414` (`{colors.ink}`).
6. **`segmented-control` + `segmented-control-active`**: مسار كبسولي `#f3f3f3` (`{rounded.full}`) يحمل خيارات كبسولية؛ الخيار النشط حبة بيضاء `#ffffff` بنص `#141414`، وغير النشط بنص `#707070`.
7. **`ex-auth-form-card`**: بطاقة تسجيل الدخول بخلفية `#f3f3f3` (`{colors.canvas-soft}`)، حواف `24px` (`{rounded.md}`)، وحاشية داخلية `24px` (`{spacing.lg}`).
8. **`footer`**: شريط سفلي بعرض كامل بخلفية `#141414` (`{colors.ink}`) ونص `#ffffff` مع حواف علوية دائرية `24px` (`{rounded.md}`).
