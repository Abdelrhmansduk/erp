-- ============================================================================
-- Migration: 20261110000000_kas_allowed_emails_whitelist.sql
-- Purpose: Official @kas.sa Corporate Email Whitelist & Department Access Matrix
--          Synchronized 100% with src/config/kasAllowedEmails.ts (69 Approved
--          Accounts + 1 Excluded Account: o.saeed.hospitality@kas.sa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kas_allowed_emails (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  username text NOT NULL,
  full_name_ar text NOT NULL,
  full_name_en text NOT NULL,
  job_title_ar text NOT NULL,
  company_id text NOT NULL,
  department_id text NOT NULL,
  default_tab text NOT NULL,
  default_tab_title text NOT NULL,
  suffix_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_excluded boolean NOT NULL DEFAULT false,
  exclusion_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kas_allowed_emails_lower_email
  ON public.kas_allowed_emails (lower(email));

CREATE INDEX IF NOT EXISTS idx_kas_allowed_emails_company_dept
  ON public.kas_allowed_emails (company_id, department_id);

ALTER TABLE public.kas_allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kas_allowed_emails_read_policy" ON public.kas_allowed_emails;
CREATE POLICY "kas_allowed_emails_read_policy"
  ON public.kas_allowed_emails
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "kas_allowed_emails_admin_write_policy" ON public.kas_allowed_emails;
CREATE POLICY "kas_allowed_emails_admin_write_policy"
  ON public.kas_allowed_emails
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (
          lower(u.email) IN ('khalid@kas.sa', 'a.salif.dev@kas.sa', 'chairman@alsulaim.sa', 'abdo12uk@gmail.com')
          OR u.role IN ('رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مطور النظام')
        )
    )
  );

INSERT INTO public.kas_allowed_emails (
  id, email, username, full_name_ar, full_name_en, job_title_ar,
  company_id, department_id, default_tab, default_tab_title, suffix_code,
  is_active, is_excluded, exclusion_reason
) VALUES
  ('KAS-EMP-001', 'khalid@kas.sa', 'khalid', 'خالد عبدالعزيز السليم', 'Khalid Abdulaziz Al-Salim', 'المالك — رئيس مجلس الإدارة', 'all', 'executive', 'dashboard', 'لوحة القيادة التنفيذية العليا للمجموعة', 'group', true, false, NULL),
  ('KAS-EMP-002', 'h.alsalim@kas.sa', 'h.alsalim', 'هاني عبدالله السليم', 'Hani Abdullah Al-Salim', 'استشاري تطوير أعمال', 'all', 'executive', 'dashboard', 'لوحة القيادة وتطوير الأعمال للمجموعة', 'group', true, false, NULL),
  ('KAS-EMP-003', 'n.alshetwi@kas.sa', 'n.alshetwi', 'ناصر شتوى الشتوى', 'Nasser Shetwy Al-Shetwy', 'تطوير ومتابعة', 'all', 'executive', 'dashboard', 'لوحة التطوير والمتابعة التنفيذية', 'group', true, false, NULL),
  ('KAS-EMP-034', 'a.salif.dev@kas.sa', 'a.salif.dev', 'عبدالرحمن أبو سالف', 'Abdulrahman Abu Salif', 'مبرمج النظام وتطوير الأنظمة', 'all', 'executive', 'dashboard', 'لوحة القيادة وإدارة الأنظمة والبرمجة', 'dev', true, false, NULL),
  ('KAS-EMP-004', 'hr@kas.sa', 'hr', 'ريم احمد بن حسين', 'Reem Ahmed Bin Hussein', 'مديرة الموارد البشرية', 'all', 'hr', 'employees', 'بوابة الموارد البشرية ومسير الرواتب (WPS)', 'hr', true, false, NULL),
  ('KAS-EMP-010', 'a.alanazi@kas.sa', 'a.alanazi', 'الجوري العنزي', 'Aljory Al-Anazi', 'خدمات حكومية', 'all', 'hr', 'employees', 'بوابة الخدمات الحكومية والموارد البشرية', 'group', true, false, NULL),
  ('KAS-EMP-039', 'a.alkinani.acc@kas.sa', 'a.alkinani.acc', 'اكرم محمد الكناني', 'Akram Mohammed Al-Kinani', 'محاسب استقدام', 'SAF', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة الاستقدام', 'acc', true, false, NULL),
  ('KAS-EMP-040', 'a.eissa.acc@kas.sa', 'a.eissa.acc', 'احمد حلمى عبدالمقصود عيسى', 'Ahmed Helmy Abdelmaksoud Eissa', 'محاسب استقدام', 'SAF', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة الاستقدام', 'acc', true, false, NULL),
  ('KAS-EMP-041', 'm.aljarm.acc@kas.sa', 'm.aljarm.acc', 'محمد شعبان الجرم', 'Mohammed Shaaban Al-Jarm', 'محاسب استقدام', 'SAF', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة الاستقدام', 'acc', true, false, NULL),
  ('KAS-EMP-042', 'a.ibrahim.acc@kas.sa', 'a.ibrahim.acc', 'عمرو المحمدي إبراهيم', 'Amr Al-Mohammadi Ibrahim', 'محاسب استقدام', 'SAF', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة الاستقدام', 'acc', true, false, NULL),
  ('KAS-EMP-043', 'a.aljarm.imal@kas.sa', 'a.aljarm.imal', 'احمد شعبان الجرم', 'Ahmed Shaaban Al-gerem', 'محاسب الاميال', 'KAS', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة الأميال', 'imal', true, false, NULL),
  ('KAS-EMP-044', 'm.alata.trade@kas.sa', 'm.alata.trade', 'محمود على محمد ابوالعطا', 'Mahmoud Ali Mohammed Abu Al-Ata', 'محاسب التجارة', 'KAS', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة التجارة', 'trade', true, false, NULL),
  ('KAS-EMP-045', 'm.mohammed.acc@kas.sa', 'm.mohammed.acc', 'محمد خالد السيد', 'Mohammed Khalid El-Sayed', 'محاسب التجارة', 'KAS', 'finance', 'smacc-accounting', 'النظام المالي والمحاسبي — محاسبة التجارة', 'acc', true, false, NULL),
  ('KAS-EMP-012', 'h.hassan.safir@kas.sa', 'h.hassan.safir', 'حذيفه رمضان على حسن', 'Huzaifa Ramadan Ali Hassan', 'مبيعات استقدام — السفير الماسي', 'SAF', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة السفير الماسي', 'safir', true, false, NULL),
  ('KAS-EMP-015', 'k.abdullatif.safir@kas.sa', 'k.abdullatif.safir', 'خالد على حسن عبداللطيف', 'Khalid Ali Hassan Abdullatif', 'مبيعات استقدام — السفير الماسي', 'SAF', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة السفير الماسي', 'safir', true, false, NULL),
  ('KAS-EMP-020', 's.ali.safir@kas.sa', 's.ali.safir', 'سمية محمد كمال علي', 'Somaya Mohammed Kamal Ali', 'مبيعات استقدام — السفير الماسي', 'SAF', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة السفير الماسي', 'safir', true, false, NULL),
  ('KAS-EMP-009', 'm.alabdullatif.topaz@kas.sa', 'm.alabdullatif.topaz', 'ملاك عبدالله العبداللطيف', 'Malak Abdullah Al-Abdullatif', 'مسؤولة مشتريات وعقود — توباز', 'TOP', 'recruitment', 'recruitment-contracts', 'بوابة المشتريات وعقود الاستقدام — شركة توباز', 'topaz', true, false, NULL),
  ('KAS-EMP-013', 'a.eissa.topaz@kas.sa', 'a.eissa.topaz', 'امل سعيد عمر عيسى', 'Amal Saeed Omar Eissa', 'مبيعات استقدام — توباز', 'TOP', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة توباز', 'topaz', true, false, NULL),
  ('KAS-EMP-016', 'i.hamdy.topaz@kas.sa', 'i.hamdy.topaz', 'اسلام احمد حمدى', 'Islam Ahmed Hamdy', 'مبيعات استقدام — توباز', 'TOP', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة توباز', 'topaz', true, false, NULL),
  ('KAS-EMP-014', 'h.yousef.yaqoot@kas.sa', 'h.yousef.yaqoot', 'حسن يوسف', 'Hassan Yousef', 'مبيعات استقدام — ياقوت نجد', 'YAQ', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة ياقوت نجد', 'yaqoot', true, false, NULL),
  ('KAS-EMP-017', 'r.othman.yaqoot@kas.sa', 'r.othman.yaqoot', 'رابية محمد عثمان', 'Rabia Mohammed Othman', 'مبيعات استقدام — ياقوت نجد', 'YAQ', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة ياقوت نجد', 'yaqoot', true, false, NULL),
  ('KAS-EMP-018', 's.barakat.yaqoot@kas.sa', 's.barakat.yaqoot', 'سارة محمد مضوي بركات', 'Sara Mohammed Mudawi Barakat', 'مبيعات استقدام — ياقوت نجد', 'YAQ', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة ياقوت نجد', 'yaqoot', true, false, NULL),
  ('KAS-EMP-019', 'a.abdelwahab.daralrowad@kas.sa', 'a.abdelwahab.daralrowad', 'عمرو عبدالوهاب', 'Amr Abdelwahab', 'مبيعات استقدام — دار الرواد', 'DAR', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة دار الرواد', 'daralrowad', true, false, NULL),
  ('KAS-EMP-021', 'h.alansari.daralrowad@kas.sa', 'h.alansari.daralrowad', 'حمزة عبدالباقي محمد الانصاري', 'Hamza Abdelbagi Mohammed Al-Ansari', 'مبيعات استقدام — دار الرواد', 'DAR', 'recruitment', 'recruitment-contracts', 'بوابة عقود ومبيعات الاستقدام — شركة دار الرواد', 'daralrowad', true, false, NULL),
  ('KAS-EMP-022', 'm.khalifa.sales@kas.sa', 'm.khalifa.sales', 'محمود على عبدالقوى خليفه', 'Mahmoud Ali Abdelkawi Khalifa', 'مبيعات تفاويض رجالي', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة مبيعات التفاويض الرجالي وتصديق إنجاز', 'sales', true, false, NULL),
  ('KAS-EMP-023', 'm.alrahman.sales@kas.sa', 'm.alrahman.sales', 'محمد فواز العبد الرحمن', 'Mohammed Fawaz Al-Abd Al-Rahman', 'مبيعات تفاويض رجالي', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة مبيعات التفاويض الرجالي وتصديق إنجاز', 'sales', true, false, NULL),
  ('KAS-EMP-024', 'a.abdulhakim.sales@kas.sa', 'a.abdulhakim.sales', 'عبدالحكيم', 'Abdulhakim', 'مبيعات تفاويض رجالي', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة مبيعات التفاويض الرجالي وتصديق إنجاز', 'sales', true, false, NULL),
  ('KAS-EMP-025', 'r.elsayed.sales@kas.sa', 'r.elsayed.sales', 'رجب عبد اللاه على السيد', 'Ragab Abdel Allah Ali El-Sayed', 'مبيعات تفاويض رجالي', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة مبيعات التفاويض الرجالي وتصديق إنجاز', 'sales', true, false, NULL),
  ('KAS-EMP-028', 'a.allah.sales@kas.sa', 'a.allah.sales', 'عمار الأمين النور عوض الله', 'Ammar Al-Amin Al-Noor Awad Allah', 'موظف تفاويض ومترجم', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة التفاويض والترجمة وتصديق إنجاز', 'sales', true, false, NULL),
  ('KAS-EMP-056', 'm.hazzaa.sales@kas.sa', 'm.hazzaa.sales', 'مصطفي هزاع', 'Mostafa Hazzaa', 'مندوب في بنجلاديش', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة المندوب الدولي — بنجلاديش', 'sales', true, false, NULL),
  ('KAS-EMP-057', 'a.abubakar.sales@kas.sa', 'a.abubakar.sales', 'عبدالرحمن ابوبكر', 'Abdulrahman Abubakar', 'مندوب في كينيا', 'SAF', 'recruitment', 'ingaz-delegations', 'بوابة المندوب الدولي — كينيا', 'sales', true, false, NULL),
  ('KAS-EMP-026', 'm.fouda.followup@kas.sa', 'm.fouda.followup', 'محمود فودة', 'Mahmoud Fouda', 'متابعة المكاتب الخارجية', 'all', 'ats', 'cvs-recruitment', 'بوابة متابعة المكاتب الخارجية وبنك السير الذاتية', 'followup', true, false, NULL),
  ('KAS-EMP-027', 'i.mahmoud.followup@kas.sa', 'i.mahmoud.followup', 'اسلام احمد عرفه محمود', 'Islam Ahmed Arafa Mahmoud', 'متابعة المكاتب الخارجية', 'all', 'ats', 'cvs-recruitment', 'بوابة متابعة المكاتب الخارجية وبنك السير الذاتية', 'followup', true, false, NULL),
  ('KAS-EMP-070', 'careers@kas.sa', 'careers', 'بوابة التوظيف واستقطاب الكفاءات', 'KAS Careers & Talent Acquisition', 'إدارة التوظيف والسير الذاتية', 'all', 'ats', 'cvs-recruitment', 'بوابة التوظيف واستقطاب الكفاءات (Careers)', 'careers', true, false, NULL),
  ('KAS-EMP-005', 'a.farahat@kas.sa', 'a.farahat', 'عبدالفتاح احمد فرحات', 'Abdulfattah Ahmed Farahat', 'خدمات لوجستية', 'all', 'shelter', 'shelter-suite', 'بوابة الخدمات اللوجستية وإدارة السكن والحركة', 'group', true, false, NULL),
  ('KAS-EMP-011A', 'a.alazzam.housing@kas.sa', 'a.alazzam.housing', 'عبير العزام', 'Abeer Alazzam', 'خدمات مساندة — السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة مراكز الإيواء والسكن والخدمات المساندة', 'housing', true, false, NULL),
  ('KAS-EMP-011B', 'r.aljbr.housing@kas.sa', 'r.aljbr.housing', 'رجاء الجبر', 'Rajaa AL Jabr', 'مشرفة سكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة إشراف السكن والإيواء والتسكين', 'housing', true, false, NULL),
  ('KAS-EMP-046', 'l.sharabi.housing@kas.sa', 'l.sharabi.housing', 'لين باسل شرابي', 'Leen Basel Sharabi', 'إدارة السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة مراكز الإيواء والتسكين (السكن)', 'housing', true, false, NULL),
  ('KAS-EMP-047', 'r.mohammed.housing@kas.sa', 'r.mohammed.housing', 'رزان محمد', 'Razan Mohammed', 'إدارة السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة مراكز الإيواء والتسكين (السكن)', 'housing', true, false, NULL),
  ('KAS-EMP-048', 'f.ethiopian.housing@kas.sa', 'f.ethiopian.housing', 'فانوس المترجمة الاثيوبية', 'Fanos Translator Ethiopian', 'مترجمة — السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة الإيواء والترجمة والرعاية بالسكن', 'housing', true, false, NULL),
  ('KAS-EMP-049', 'c.gaspo.housing@kas.sa', 'c.gaspo.housing', 'كولين جاسبو', 'Colleen Gaspo', 'إدارة السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة مراكز الإيواء والتسكين (السكن)', 'housing', true, false, NULL),
  ('KAS-EMP-050', 'k.karini.housing@kas.sa', 'k.karini.housing', 'كاريني', 'Karini', 'إدارة السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة مراكز الإيواء والتسكين (السكن)', 'housing', true, false, NULL),
  ('KAS-EMP-052', 'm.housing.housing@kas.sa', 'm.housing.housing', 'مريم مشرفة سكن', 'Maryam Supervisor Housing', 'مشرفة سكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة إشراف السكن والإيواء والتسكين', 'housing', true, false, NULL),
  ('KAS-EMP-053', 'm.ahmed.housing@kas.sa', 'm.ahmed.housing', 'مريم احمد', 'Maryam Ahmed', 'مترجمة — السكن', 'DAR', 'shelter', 'shelter-suite', 'منظومة الإيواء والترجمة والرعاية بالسكن', 'housing', true, false, NULL),
  ('KAS-EMP-058', 's.adebo.housing@kas.sa', 's.adebo.housing', 'شامم اديبو', 'Shamim Adebo', 'خدمات داخلية — المكاتب والسكن', 'DAR', 'shelter', 'profile', 'بوابة الخدمة الذاتية للموظف', 'housing', true, false, NULL),
  ('KAS-EMP-060', 'l.lalis.housing@kas.sa', 'l.lalis.housing', 'لاليس', 'Lalis', 'خدمات داخلية — السكن', 'DAR', 'shelter', 'profile', 'بوابة الخدمة الذاتية للموظف', 'housing', true, false, NULL),
  ('KAS-EMP-063', 'j.encajas.driver@kas.sa', 'j.encajas.driver', 'جوريل كونديس انكاجاس', 'Joriel Condes Encajas', 'سائق', 'DAR', 'shelter', 'travel', 'بوابة حركة النقل ورحلات المطار والتوصيل', 'driver', true, false, NULL),
  ('KAS-EMP-064', 'm.rahman.driver@kas.sa', 'm.rahman.driver', 'منصور رحمن', 'Mansour Rahman', 'سائق', 'DAR', 'shelter', 'travel', 'بوابة حركة النقل ورحلات المطار والتوصيل', 'driver', true, false, NULL),
  ('KAS-EMP-065', 'a.hindi.driver@kas.sa', 'a.hindi.driver', 'عبدالرحمن السائق', 'Abdulrahman Driver Hindi', 'سائق', 'DAR', 'shelter', 'travel', 'بوابة حركة النقل ورحلات المطار والتوصيل', 'driver', true, false, NULL),
  ('KAS-EMP-066', 'm.soliman.driver@kas.sa', 'm.soliman.driver', 'محمود مصطفى سليمان', 'Mahmoud Mostafa Soliman', 'سائق', 'DAR', 'shelter', 'travel', 'بوابة حركة النقل ورحلات المطار والتوصيل', 'driver', true, false, NULL),
  ('KAS-EMP-006', 'm.alsaleh.imal@kas.sa', 'm.alsaleh.imal', 'ماجد عبدالرحمن الصالح', 'Majed Abdulrahman Al-Saleh', 'مدير الاميال', 'KAS', 'tenders', 'kas-suite', 'بوابة إدارة قطاع الأميال والعقود التشغيلية', 'imal', true, false, NULL),
  ('KAS-EMP-025A', 'g.hafez.imal@kas.sa', 'g.hafez.imal', 'جمال محمد حافظ', 'Gamal Mohammed Hafez', 'مبيعات الاميال', 'KAS', 'tenders', 'kas-suite', 'بوابة مبيعات وعقود قطاع الأميال', 'imal', true, false, NULL),
  ('KAS-EMP-025B', 'm.elsayed.imal@kas.sa', 'm.elsayed.imal', 'محمد علي السيد', 'Mohammed Ali El-Sayed', 'مبيعات الاميال', 'KAS', 'tenders', 'kas-suite', 'بوابة مبيعات وعقود قطاع الأميال', 'imal', true, false, NULL),
  ('KAS-EMP-007', 'f.alhassan.trade@kas.sa', 'f.alhassan.trade', 'فراس دحام الخلف الحسن', 'Firas Daham Al-Khalaf Al-Hassan', 'مدير التجارة', 'KAS', 'tenders', 'kas-suite', 'بوابة إدارة قطاع التجارة والمشتريات والمنافسات', 'trade', true, false, NULL),
  ('KAS-EMP-008', 'b.allaboudi.showroom@kas.sa', 'b.allaboudi.showroom', 'باسل خالد محمد اللبودى', 'Basel Khalid Mohammed Al-Laboudi', 'مسؤول المعرض', 'KAS', 'tenders', 'kas-suite', 'بوابة إدارة المعرض والمبيعات التجارية', 'showroom', true, false, NULL),
  ('KAS-EMP-029', 'm.ismail.trade@kas.sa', 'm.ismail.trade', 'محمد عبد الناقد اسماعيل', 'Mohammed Abdel Al-Naqid Ismail', 'داتا انتري', 'KAS', 'tenders', 'kas-suite', 'بوابة إدخال البيانات والعمليات التجارية (Data Entry)', 'trade', true, false, NULL),
  ('KAS-EMP-030', 'h.salman.trade@kas.sa', 'h.salman.trade', 'حاتم سلمان ابوالذهب سلمان', 'Hatem Salman Abu Al-Dahab Salman', 'داتا انتري', 'KAS', 'tenders', 'kas-suite', 'بوابة إدخال البيانات والعمليات التجارية (Data Entry)', 'trade', true, false, NULL),
  ('KAS-EMP-031', 'a.albashir.trade@kas.sa', 'a.albashir.trade', 'احمد جمال احمد البشير', 'Ahmed Gamal Ahmed Al-Bashir', 'داتا انتري', 'KAS', 'tenders', 'kas-suite', 'بوابة إدخال البيانات والعمليات التجارية (Data Entry)', 'trade', true, false, NULL),
  ('KAS-EMP-054', 'g.ahmed.trade@kas.sa', 'g.ahmed.trade', 'جلال محمد جلال احمد', 'Galal Mohammed Galal Ahmed', 'مندوب مشتريات', 'KAS', 'tenders', 'kas-suite', 'بوابة المشتريات والتوريد التجاري', 'trade', true, false, NULL),
  ('KAS-EMP-055', 'k.alshennawy.trade@kas.sa', 'k.alshennawy.trade', 'كريم طارق محمود الشناوى', 'Karim Tarek Mahmoud Al-Shennawy', 'مندوب مشتريات', 'KAS', 'tenders', 'kas-suite', 'بوابة المشتريات والتوريد التجاري', 'trade', true, false, NULL),
  ('KAS-EMP-061', 'm.robel.trade@kas.sa', 'm.robel.trade', 'محمد روبل', 'Mohammed Robel', 'خدمات مكتبية — التجارة', 'KAS', 'tenders', 'profile', 'بوابة الخدمة الذاتية للموظف', 'trade', true, false, NULL),
  ('KAS-EMP-062', 'b.pathan.trade@kas.sa', 'b.pathan.trade', 'بلال احمد باثان', 'Bilal Ahmed Pathan', 'خدمات مكتبية — التجارة', 'KAS', 'tenders', 'profile', 'بوابة الخدمة الذاتية للموظف', 'trade', true, false, NULL),
  ('KAS-EMP-032', 'mustafa.marketing@kas.sa', 'mustafa.marketing', 'مصطفي عبدالرحيم جلال الدين', 'Mostafa Abdelrahim Galal Al-Din', 'مدير الدعاية والتسويق', 'all', 'crm', 'clients', 'بوابة إدارة الدعاية والتسويق وعلاقات العملاء (CRM)', 'marketing', true, false, NULL),
  ('KAS-EMP-033', 'm.alkhader.marketing@kas.sa', 'm.alkhader.marketing', 'معاذ عبدالكريم علي الخضر', 'Moaz Abdulkarim Ali Al-Khader', 'موظف في الدعاية والتسويق', 'all', 'crm', 'clients', 'بوابة الدعاية والتسويق والتواصل الموحد', 'marketing', true, false, NULL),
  ('KAS-EMP-035', 'nagati.marketing@kas.sa', 'nagati.marketing', 'محمد جمال احمد', 'Mohammed Gamal Ahmed', 'مصمم جرافيك', 'all', 'crm', 'clients', 'بوابة التصميم الإبداعي والدعاية والتسويق', 'marketing', true, false, NULL),
  ('KAS-EMP-036', 'm.almontaser.marketing@kas.sa', 'm.almontaser.marketing', 'محمد المنتصر', 'Mohammed Al-Montaser', 'صانع محتوي مرئي ومصور', 'all', 'crm', 'clients', 'بوابة صناعة المحتوى المرئي والتسويق الرقمي', 'marketing', true, false, NULL),
  ('KAS-EMP-037', 'a.magdy.marketing@kas.sa', 'a.magdy.marketing', 'عبدالرحمن مجدي', 'Abdulrahman Magdy', 'فريق مصطفي الدعاية', 'all', 'crm', 'clients', 'بوابة فريق الدعاية والتسويق والحملات', 'marketing', true, false, NULL),
  ('KAS-EMP-038', 'a.mirghani.marketing@kas.sa', 'a.mirghani.marketing', 'عبدالرحمن مرغني', 'Abdulrahman Mirghani', 'فريق مصطفي الدعاية', 'all', 'crm', 'clients', 'بوابة فريق الدعاية والتسويق والحملات', 'marketing', true, false, NULL),
  ('KAS-EMP-069', 'feras.marketing@kas.sa', 'feras.marketing', 'فراس شاكر', 'Feras Shaker', 'أخصائي تسويق ودعاية', 'all', 'crm', 'clients', 'بوابة الدعاية والتسويق وعلاقات العملاء', 'marketing', true, false, NULL),
  ('KAS-EMP-068', 'o.saeed.hospitality@kas.sa', 'o.saeed.hospitality', 'أسامة سعيد', 'Osama Saeed', 'بوفيه', 'all', 'excluded', 'none', 'مستبعد من الأنظمة', 'hospitality', false, true, 'رفض أمني: هذا الحساب مخصص لمطبخ البوفيه ومستبعد نهائياً من الدخول على أنظمة المجموعة.')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  full_name_ar = EXCLUDED.full_name_ar,
  full_name_en = EXCLUDED.full_name_en,
  job_title_ar = EXCLUDED.job_title_ar,
  company_id = EXCLUDED.company_id,
  department_id = EXCLUDED.department_id,
  default_tab = EXCLUDED.default_tab,
  default_tab_title = EXCLUDED.default_tab_title,
  suffix_code = EXCLUDED.suffix_code,
  is_active = EXCLUDED.is_active,
  is_excluded = EXCLUDED.is_excluded,
  exclusion_reason = EXCLUDED.exclusion_reason;

CREATE OR REPLACE FUNCTION public.is_kas_email_allowed(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kas_allowed_emails k
    WHERE lower(k.email) = lower(trim(check_email))
      AND k.is_active = true
      AND k.is_excluded = false
  );
$$;
