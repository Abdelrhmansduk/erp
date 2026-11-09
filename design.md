# Mobbin Design System Specification — Khalid Al-Sulaim Holding Group ERP
**Canonical Reference:** `c:\Users\ALIENWARE\Downloads\DESIGN-mobbin.md` · [`src/styles/tokens.css`](src/styles/tokens.css) · [`src/styles/index.css`](src/styles/index.css) · [`src/pages/LandingPage.tsx`](src/pages/LandingPage.tsx) · [`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx)

---

## 1. Visual Theme & Atmosphere (فلسفة التصميم والهوية البصرية — Mobbin Monochrome)

نظام واجهات **أبيض معارض نقي (Gallery-White Monochrome)** مصمم ليختفي خلف المحتوى التشغيلي والبيانات المؤسسية:
- **حبر أسود داكن (`#141414` — `{colors.ink}`) على خلفية بيضاء نقية (`#ffffff` — `{colors.canvas}`)**.
- **بناء العمق عبر سُلّم التدرجات الرمادية الخفيفة بدلاً من الظلال (Shadow-Free Tint Ladder)**: يتم التمييز البصري عبر فروق التعبئة (`#ffffff` مقابل `#f3f3f3` و `#f0f0f0`) وخطوط الإطار الدقيقة بعرض `1px` (`#f0f0f0` و `#e0e0e0`).
- **الأزرار الكبسولية (Stadium-Pill Controls — `{rounded.full}` `9999px`)**: شريط التنقل، الأزرار، محولات التبويبات، ومحددات الفروع.
- **هندسة البطاقات (`24px` — `{rounded.md}`)** وحقول الإدخال (`16px` — `{rounded.sm}`) وأيقونات السكويركل (`44x44px` بحواف `14px` وأيقونة متجهة `20x20px` في المنتصف).
- **نبرة لونية واحدة فقط (`#0066ff` — `{colors.accent}` Electric Blue)**: مخصصة حصرياً للشارات النشطة وعناصر التمييز الوظيفي الدقيق.
- **خلو كامل من الرموز التعبيرية (Zero Unprofessional Emojis)**: استبدال كافة الإيموجي بأيقونات `lucide-react` المتجهة النظيفة.

---

## 2. Color Palette & Roles (رموز الألوان الدلالية — `DESIGN-mobbin.md`)

| Token | Hex / Value | Functional Role (الدور الوظيفي) |
| :--- | :--- | :--- |
| `{colors.primary}` | `#141414` | **Ink Black**: لون الهوية الأساسي؛ يملأ أزرار `button-primary` الكبسولية، التبويبات النشطة، والعناوين الكبرى |
| `{colors.on-primary}` | `#ffffff` | النص الأبيض النقي فوق `#141414` أو فوق شارة `#0066ff` |
| `{colors.ink}` | `#141414` | جميع العناوين، النصوص الأساسية، والأرقام المالية |
| `{colors.ink-soft}` | `#262626` | درجة داكنة مخففة لحالات التحويم على الأزرار السوداء |
| `{colors.text-muted}` | `#707070` | النصوص الثانوية، الأوصاف الفرعية، والتبويبات غير النشطة |
| `{colors.text-faint}` | `#adadad` | النصوص الثلاثية، نصوص العناصر النائبة (`placeholders`)، والهوامش السفلية |
| `{colors.canvas}` | `#ffffff` | الخلفية الافتراضية لجميع الصفحات، البطاقات الأساسية، والنوافذ المنبثقة |
| `{colors.canvas-soft}` | `#f3f3f3` | **Soft Canvas (6% ink wash)**: يملأ شريط `nav-pill`، البطاقات الثانوية، ومسار `segmented-control` |
| `{colors.field}` | `#f0f0f0` | **Field (8% ink wash)**: تعبئة حقول الإدخال في حالة السكون |
| `{colors.hairline-soft}` | `#f0f0f0` | إطار `1px` خفيف جداً للبطاقات البيضاء فوق الخلفية البيضاء |
| `{colors.hairline}` | `#e0e0e0` | إطار `1px` للأزرار المفرغة (`button-outline`) والفواصل الهيكلية |
| `{colors.accent}` | `#0066ff` | **Electric Blue**: اللون الوحيد خارج التدرج الأحادي؛ يُحجز للشارات وعناصر التمييز النشطة |

---

## 3. Split Institutional Login & Landing Layout (واجهة التعريف والدخول المقسومة)

تعتمد [`src/pages/LandingPage.tsx`](src/pages/LandingPage.tsx) و[`src/pages/LoginPage.tsx`](src/pages/LoginPage.tsx) تخطيطاً مؤسسياً مقسوماً (Split Layout) متطابقاً:
1. **الجانب الأيمن (التعريف المؤسسي للمجموعة — Right Brand Column)**:
   - العنوان الرئيسي: `خالد السليم | Al-Sulaim`
   - الشعار المؤسسي: `نستثمر في الفرص.. نصنع المستقبل`
   - الوصف المختصر: `منظومة الإدارة والتشغيل المؤسسي الموحدة`
   - 3 ركائز مؤسسية موجزة بعلامة `✓`:
     - `إدارة الشركات والفروع من منصة واحدة`
     - `الفوترة الإلكترونية والربط الحكومي المعتمد`
     - `حوكمة الصلاحيات والتقارير المالية الفورية`
   - أيقونات دائرية عائمة ناعمة تحيط بمنطقة الهوية.
2. **الجانب الأيسر (بطاقة تسجيل الدخول البيضاء — Left Interactive Login Card)**:
   - محول علوي كبسولي: `حساب موظف | مركز الشركات`
   - ترحيب مؤسسي: `مرحباً بعودتك — الدخول إلى بوابة الأعمال والأقسام`
   - تبويب مزدوج: `تسجيل الدخول | تفعيل حساب`
   - أزرار النفاذ السريع: `الدخول بالبصمة الرقمية` و`الرابط السحري`
   - حقول البريد الإلكتروني وكلمة المرور بتعبئة `#f3f3f3`، مع نافذة منبثقة نظيفة لاختيار الشركة التابعة أو القسم الإداري عند الطلب.

---

## 4. Unified AppShell, Header, Sidebar & App Launcher Specifications

1. **الترويسة الموحدة ([`src/components/layout/Header.tsx`](src/components/layout/Header.tsx))**:
   - عرض اسم الفرع الكامل (`المقر الرئيسي للمجموعة - الرياض`) داخل كبسولة واضحة بدون قص (`whitespace-nowrap`)، مع كبسولات متوازنة لرادار الأخطاء، مستخرج المستندات، المساعد الذكي، والشركة النشطة.
2. **القائمة الجانبية الموحدة للأقسام الـ 9 ([`src/components/layout/Sidebar.tsx`](src/components/layout/Sidebar.tsx))**:
   - محول عرض ثلاثي متوازن (`الأقسام | بطاقات | طي`) يتيح التبديل بين الشجرة الكاملة للأقسام الـ 9، عرض البطاقات، والطي الأيقوني (`76px`).
   - تذييل القائمة الجانبية يعرض اسم المسؤول على السطر الأول والفرع النشط على السطر الثاني بوضوح تام.
3. **منصة إطلاق الوحدات ([`src/pages/AppLauncherPage.tsx`](src/pages/AppLauncherPage.tsx) & [`src/components/common/BusinessIllustration.tsx`](src/components/common/BusinessIllustration.tsx))**:
   - أيقونات موحدة بمقاس `44x44px` (`rounded-[14px]`) وبداخلها أيقونة متجهة `20x20px` بدون أي نصوص فرعية مقصوصة، مع بطاقات بيضاء نقية (`#ffffff`) وإطارات `#e5e5e5`.
4. **مركز مراقبة وتشخيص الأخطاء ([`src/components/monitoring/EnterpriseErrorMonitorPanel.tsx`](src/components/monitoring/EnterpriseErrorMonitorPanel.tsx))**:
   - مصمم بالكامل بالنمط النهاري النقي (`#ffffff` و`#f3f3f3` و`#141414`) بدون أي بانرات داكنة أو ذهبية قديمة.

---

## 6. ضوابط رمز الريال السعودي المعتمد من البنك المركزي السعودي (SAMA SRS Guidelines)
المرجع التنظيمي: `https://sama.gov.sa/ar-sa/Currency/SRS/Documents/Guidelines.pdf`
- **الترميز الموحد والخط المتجهي**: استخدام رمز اليونيكود الرسمي `U+20C1` (`⃁`) وخط `saudi_riyal` المدمج بصيغة `WOFF2 Base64` وملفات `/fonts/saudi-riyal/` ومكون المتجهات [`SaudiRiyalSymbol.tsx`](src/components/common/SaudiRiyalSymbol.tsx).
- **موقع الرمز (يسار الرقم دائماً)**: يوضع رمز الريال السعودي دائماً على **يسار القيمة العددية** في جميع اللغات (العربية RTL والإنجليزية LTR).
- **المسافة الفاصلة**: الالتزام بترك مسافة واضحة بين رمز الريال السعودي والرقم المجاور له وعدم إلصاقه بالرقم مباشرة.
- **القيم السالبة**: يوضع رمز الريال السعودي على يسار علامة السالب والرقم (`⃁ -1,250.00`).
- **التناسب الهندسي واللون الأحادي**: مطابقة ارتفاع الرمز وخط الأساس مع الأرقام المجاورة (`tabular-nums`) مع وراثة اللون الأحادي عالي التباين (`currentColor`) دون أي تشويه أو تغيير في النسب الهندسية.
