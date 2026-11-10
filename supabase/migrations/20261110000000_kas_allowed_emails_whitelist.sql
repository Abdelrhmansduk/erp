-- ============================================================================
-- Migration: 20261110000000_kas_allowed_emails_whitelist.sql
-- Purpose: Official @kas.sa Corporate Email Whitelist & Department Access Matrix
--          for Khalid Al-Sulaim Holding Group (66 Approved Employees +
--          Explicit Exclusion of o.saeed.hospitality@kas.sa — Buffet Kitchen)
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

-- Seed all 66 Approved @kas.sa Accounts + 1 Excluded Account (o.saeed.hospitality@kas.sa)
INSERT INTO public.kas_allowed_emails (
  id, email, username, full_name_ar, full_name_en, job_title_ar,
  company_id, department_id, default_tab, default_tab_title, suffix_code,
  is_active, is_excluded, exclusion_reason
) VALUES
  -- 1. Executive & IT
  ('USR-KAS-001', 'khalid@kas.sa', 'khalid', 'أ. خالد السليم', 'Khalid Al-Sulaim', 'الرئيس التنفيذي', 'all', 'executive', 'dashboard', 'لوحة القيادة التنفيذية العليا للمجموعة', 'executive', true, false, NULL),
  ('USR-KAS-069', 'a.salif.dev@kas.sa', 'a.salif.dev', 'عبدالله سالف', 'Abdullah Salif', 'مطور أنظمة', 'all', 'executive', 'dashboard', 'لوحة القيادة التنفيذية وإدارة الأنظمة', '.dev', true, false, NULL),

  -- 2. HR & Careers
  ('USR-KAS-002', 'hr@kas.sa', 'hr', 'فهد السحيباني', 'Fahad Al-Suhaibani', 'مدير الموارد البشرية', 'all', 'hr', 'hr-hierarchy', 'شؤون الموظفين والرواتب (WPS)', 'hr', true, false, NULL),
  ('USR-KAS-070', 'careers@kas.sa', 'careers', 'بوابة التوظيف واستقطاب الكفاءات', 'KAS Careers Portal', 'بوابة التوظيف الرسمية واستقطاب الكفاءات', 'all', 'ats', 'ats-hub', 'بوابة التوظيف والفرز الذكي (ATS)', 'careers', true, false, NULL),

  -- 3. Topaz (.topaz) & Follow-up (.followup)
  ('USR-KAS-003', 'a.eissa.topaz@kas.sa', 'a.eissa.topaz', 'أحمد عيسى', 'Ahmed Eissa', 'مشرف توباز', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-007', 'm.fathy.topaz@kas.sa', 'm.fathy.topaz', 'محمد فتحي', 'Mohamed Fathy', 'مدير إدارة التشغيل (توباز)', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-009', 's.abdulwahed.topaz@kas.sa', 's.abdulwahed.topaz', 'سيد عبدالواحد', 'Sayed Abdulwahed', 'مساند توباز', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-014', 'm.azzam.topaz@kas.sa', 'm.azzam.topaz', 'محمد عزام', 'Mohamed Azzam', 'معقب توباز', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-020', 'w.fathy.topaz@kas.sa', 'w.fathy.topaz', 'وليد فتحي', 'Walid Fathy', 'خدمة عملاء توباز', 'TOP', 'crm', 'complaints-crm', 'منظومة خدمة عملاء توباز والشكاوى', '.topaz', true, false, NULL),
  ('USR-KAS-030', 'h.abubakr.topaz@kas.sa', 'h.abubakr.topaz', 'هاجر أبوبكر', 'Hagar Abubakr', 'تشغيل توباز', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-031', 'd.elshahat.topaz@kas.sa', 'd.elshahat.topaz', 'دعاء الشحات', 'Doaa El-Shahat', 'كول سنتر توباز', 'TOP', 'crm', 'call-center-pbx', 'مركز الاتصال الموحد (كول سنتر توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-035', 'a.mostafa.topaz@kas.sa', 'a.mostafa.topaz', 'آية مصطفى', 'Aya Mostafa', 'توباز', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-041', 'z.ali.topaz@kas.sa', 'z.ali.topaz', 'زينب علي', 'Zainab Ali', 'توباز', 'TOP', 'ats', 'ats-hub', 'منظومة التوظيف والفرز الذكي (توباز)', '.topaz', true, false, NULL),
  ('USR-KAS-005', 'm.fouda.followup@kas.sa', 'm.fouda.followup', 'محمد فوده', 'Mohamed Fouda', 'مدير قسم المتابعة والتطوير', 'all', 'ats', 'ats-hub', 'بوابة المتابعة والتطوير ومؤشرات الأداء', '.followup', true, false, NULL),
  ('USR-KAS-036', 'b.ibrahim.followup@kas.sa', 'b.ibrahim.followup', 'بسنت ابراهيم', 'Basant Ibrahim', 'قسم المتابعة والتطوير', 'all', 'ats', 'ats-hub', 'بوابة المتابعة والتطوير ومؤشرات الأداء', '.followup', true, false, NULL),

  -- 4. Al-Safir (.safir)
  ('USR-KAS-006', 'h.hassan.safir@kas.sa', 'h.hassan.safir', 'حماده حسن', 'Hamada Hassan', 'مدير إدارة التشغيل (السفير)', 'SAF', 'recruitment', 'Foreign-Recruitment', 'منظومة الاستقدام الدولي وعقود مساند (السفير)', '.safir', true, false, NULL),
  ('USR-KAS-010', 'o.shaaban.safir@kas.sa', 'o.shaaban.safir', 'عمر شعبان', 'Omar Shaaban', 'مشرف السفير', 'SAF', 'recruitment', 'Foreign-Recruitment', 'منظومة الاستقدام الدولي وعقود مساند (السفير)', '.safir', true, false, NULL),
  ('USR-KAS-017', 'a.fathy.safir@kas.sa', 'a.fathy.safir', 'أحمد فتحي', 'Ahmed Fathy', 'معقب السفير', 'SAF', 'recruitment', 'visa-tracker', 'متابعة التأشيرات والتعقيب الحكومي (السفير)', '.safir', true, false, NULL),
  ('USR-KAS-019', 's.salah.safir@kas.sa', 's.salah.safir', 'شعبان صلاح', 'Shaaban Salah', 'خدمة عملاء السفير', 'SAF', 'crm', 'complaints-crm', 'خدمة عملاء السفير والشكاوى (CRM)', '.safir', true, false, NULL),
  ('USR-KAS-023', 'e.sayed.safir@kas.sa', 'e.sayed.safir', 'إسلام سيد', 'Islam Sayed', 'السفير مساند', 'SAF', 'recruitment', 'musaned-hub', 'بوابة عقود مساند والتفييز (السفير)', '.safir', true, false, NULL),
  ('USR-KAS-029', 'i.ali.safir@kas.sa', 'i.ali.safir', 'إسراء علي', 'Esraa Ali', 'كول سنتر السفير', 'SAF', 'crm', 'call-center-pbx', 'مركز الاتصال الموحد (كول سنتر السفير)', '.safir', true, false, NULL),
  ('USR-KAS-034', 's.adel.safir@kas.sa', 's.adel.safir', 'سارة عادل', 'Sara Adel', 'السفير', 'SAF', 'recruitment', 'Foreign-Recruitment', 'منظومة الاستقدام الدولي وعقود مساند (السفير)', '.safir', true, false, NULL),
  ('USR-KAS-040', 'd.ashraf.safir@kas.sa', 'd.ashraf.safir', 'دينا أشرف', 'Dina Ashraf', 'السفير', 'SAF', 'recruitment', 'Foreign-Recruitment', 'منظومة الاستقدام الدولي وعقود مساند (السفير)', '.safir', true, false, NULL),

  -- 5. Finance & Accounting (.acc)
  ('USR-KAS-008', 'a.alkinani.acc@kas.sa', 'a.alkinani.acc', 'أحمد الكناني', 'Ahmed Al-Kinani', 'رئيس الحسابات', 'all', 'finance', 'finance-home', 'النظام المالي والمحاسبي الموحد (SMACC & ZATCA)', '.acc', true, false, NULL),
  ('USR-KAS-011', 'y.mubarak.acc@kas.sa', 'y.mubarak.acc', 'ياسر مبارك', 'Yasser Mubarak', 'محاسب الياقوت', 'YAQ', 'finance', 'finance-home', 'النظام المالي والمحاسبي — شركة الياقوت', '.acc', true, false, NULL),
  ('USR-KAS-012', 'a.farraj.acc@kas.sa', 'a.farraj.acc', 'أحمد فراج', 'Ahmed Farraj', 'محاسب دار الرواد', 'DAR', 'finance', 'finance-home', 'النظام المالي والمحاسبي — شركة دار الرواد', '.acc', true, false, NULL),
  ('USR-KAS-013', 'm.salih.acc@kas.sa', 'm.salih.acc', 'محمد صالح', 'Mohamed Salih', 'محاسب توباز', 'TOP', 'finance', 'finance-home', 'النظام المالي والمحاسبي — شركة توباز', '.acc', true, false, NULL),
  ('USR-KAS-027', 'a.gamal.acc@kas.sa', 'a.gamal.acc', 'عبدالرحمن جمال', 'Abdulrahman Gamal', 'محاسب (إمال + التجارة)', 'KAS', 'finance', 'finance-home', 'النظام المالي والمحاسبي — شركة إمال والتجارة', '.acc', true, false, NULL),

  -- 6. Al-Yaqoot (.yaqoot)
  ('USR-KAS-024', 'h.yousef.yaqoot@kas.sa', 'h.yousef.yaqoot', 'حماده يوسف', 'Hamada Yousef', 'مشرف الياقوت', 'YAQ', 'rental', 'Labor-Rental', 'منظومة عقود التأجير والتشغيل (الياقوت)', '.yaqoot', true, false, NULL),
  ('USR-KAS-016', 'm.elshafey.yaqoot@kas.sa', 'm.elshafey.yaqoot', 'محمد الشافعي', 'Mohamed El-Shafey', 'مساند الياقوت', 'YAQ', 'rental', 'Labor-Rental', 'منظومة عقود التأجير ومساند (الياقوت)', '.yaqoot', true, false, NULL),
  ('USR-KAS-018', 'a.abdelbadea.yaqoot@kas.sa', 'a.abdelbadea.yaqoot', 'أحمد عبدالبديع', 'Ahmed Abdelbadea', 'معقب الياقوت', 'YAQ', 'rental', 'Labor-Rental', 'منظومة عقود التأجير والتعقيب (الياقوت)', '.yaqoot', true, false, NULL),
  ('USR-KAS-022', 'a.salah.yaqoot@kas.sa', 'a.salah.yaqoot', 'أحمد صلاح', 'Ahmed Salah', 'خدمة عملاء الياقوت', 'YAQ', 'crm', 'complaints-crm', 'خدمة عملاء الياقوت والشكاوى (CRM)', '.yaqoot', true, false, NULL),
  ('USR-KAS-028', 's.hassan.yaqoot@kas.sa', 's.hassan.yaqoot', 'ساره حسن', 'Sara Hassan', 'تشغيل الياقوت', 'YAQ', 'rental', 'Labor-Rental', 'منظومة عقود التأجير والتشغيل (الياقوت)', '.yaqoot', true, false, NULL),
  ('USR-KAS-032', 'k.mohamed.yaqoot@kas.sa', 'k.mohamed.yaqoot', 'خلود محمد', 'Kholoud Mohamed', 'كول سنتر الياقوت', 'YAQ', 'crm', 'call-center-pbx', 'مركز الاتصال الموحد (كول سنتر الياقوت)', '.yaqoot', true, false, NULL),
  ('USR-KAS-039', 'y.ayman.yaqoot@kas.sa', 'y.ayman.yaqoot', 'ياسمين أيمن', 'Yasmin Ayman', 'الياقوت', 'YAQ', 'rental', 'Labor-Rental', 'منظومة عقود التأجير والتشغيل (الياقوت)', '.yaqoot', true, false, NULL),
  ('USR-KAS-042', 'f.atef.yaqoot@kas.sa', 'f.atef.yaqoot', 'فاطمة عاطف', 'Fatma Atef', 'الياقوت', 'YAQ', 'rental', 'Labor-Rental', 'منظومة عقود التأجير والتشغيل (الياقوت)', '.yaqoot', true, false, NULL),

  -- 7. Dar Al-Rowad (.daralrowad)
  ('USR-KAS-025', 'a.abdelwahab.daralrowad@kas.sa', 'a.abdelwahab.daralrowad', 'أحمد عبدالوهاب', 'Ahmed Abdelwahab', 'مساند دار الرواد', 'DAR', 'recruitment', 'musaned-hub', 'بوابة مساند والاستقدام — شركة دار الرواد', '.daralrowad', true, false, NULL),
  ('USR-KAS-026', 'a.elagamawy.daralrowad@kas.sa', 'a.elagamawy.daralrowad', 'أحمد العجماوي', 'Ahmed El-Agamawy', 'خدمة عملاء دار الرواد', 'DAR', 'crm', 'complaints-crm', 'خدمة عملاء دار الرواد والشكاوى (CRM)', '.daralrowad', true, false, NULL),
  ('USR-KAS-033', 'g.mohamed.daralrowad@kas.sa', 'g.mohamed.daralrowad', 'جهاد محمد', 'Gehad Mohamed', 'تشغيل دار الرواد', 'DAR', 'recruitment', 'Foreign-Recruitment', 'منظومة التشغيل والاستقدام — شركة دار الرواد', '.daralrowad', true, false, NULL),
  ('USR-KAS-038', 'a.ehab.daralrowad@kas.sa', 'a.ehab.daralrowad', 'أمل إيهاب', 'Amal Ehab', 'كول سنتر دار الرواد', 'DAR', 'crm', 'call-center-pbx', 'مركز الاتصال الموحد (كول سنتر دار الرواد)', '.daralrowad', true, false, NULL),
  ('USR-KAS-043', 'n.medhat.daralrowad@kas.sa', 'n.medhat.daralrowad', 'ندى مدحت', 'Nada Medhat', 'دار الرواد', 'DAR', 'recruitment', 'Foreign-Recruitment', 'منظومة التشغيل والاستقدام — شركة دار الرواد', '.daralrowad', true, false, NULL),

  -- 8. Marketing, Sales & Showrooms (.marketing, .sales, .showroom)
  ('USR-KAS-007M', 'mustafa.marketing@kas.sa', 'mustafa.marketing', 'مصطفى جلال', 'Mustafa Galal', 'مدير قسم التسويق', 'all', 'crm', 'marketing-campaigns', 'إدارة الحملات التسويقية وعلاقات العملاء', '.marketing', true, false, NULL),
  ('USR-KAS-037', 'r.sayed.marketing@kas.sa', 'r.sayed.marketing', 'روان سيد', 'Rawan Sayed', 'قسم التسويق', 'all', 'crm', 'marketing-campaigns', 'إدارة الحملات التسويقية وعلاقات العملاء', '.marketing', true, false, NULL),
  ('USR-KAS-044', 'a.helmy.marketing@kas.sa', 'a.helmy.marketing', 'عبدالرحمن حلمي', 'Abdulrahman Helmy', 'قسم التسويق', 'all', 'crm', 'marketing-campaigns', 'إدارة الحملات التسويقية وعلاقات العملاء', '.marketing', true, false, NULL),
  ('USR-KAS-021', 'm.khalifa.sales@kas.sa', 'm.khalifa.sales', 'محمد خليفة', 'Mohamed Khalifa', 'مدير صالة المبيعات', 'SAF', 'crm', 'sales-commissions', 'إدارة صالة المبيعات وعقود العملاء والعمولات', '.sales', true, false, NULL),
  ('USR-KAS-045', 'm.medhat.sales@kas.sa', 'm.medhat.sales', 'مينا مدحت', 'Mina Medhat', 'مبيعات الصالة (توباز)', 'TOP', 'crm', 'sales-commissions', 'مبيعات الصالة وعقود العملاء — توباز', '.sales', true, false, NULL),
  ('USR-KAS-046', 'a.antar.sales@kas.sa', 'a.antar.sales', 'أحمد عنتر', 'Ahmed Antar', 'مبيعات الصالة (السفير)', 'SAF', 'crm', 'sales-commissions', 'مبيعات الصالة وعقود العملاء — السفير', '.sales', true, false, NULL),
  ('USR-KAS-047', 'm.rizk.sales@kas.sa', 'm.rizk.sales', 'محمد رزق', 'Mohamed Rizk', 'مبيعات الصالة (الياقوت)', 'YAQ', 'crm', 'sales-commissions', 'مبيعات الصالة وعقود العملاء — الياقوت', '.sales', true, false, NULL),
  ('USR-KAS-048', 's.sami.sales@kas.sa', 's.sami.sales', 'سيف سامي', 'Seif Sami', 'مبيعات الصالة (دار الرواد)', 'DAR', 'crm', 'sales-commissions', 'مبيعات الصالة وعقود العملاء — دار الرواد', '.sales', true, false, NULL),
  ('USR-KAS-049', 'm.atef.sales@kas.sa', 'm.atef.sales', 'محمود عاطف', 'Mahmoud Atef', 'مبيعات الصالة (دار الرواد)', 'DAR', 'crm', 'sales-commissions', 'مبيعات الصالة وعقود العملاء — دار الرواد', '.sales', true, false, NULL),
  ('USR-KAS-015', 'a.shebl.showroom@kas.sa', 'a.shebl.showroom', 'أحمد شبل', 'Ahmed Shebl', 'معرض السفير', 'SAF', 'crm', 'branch-pos-hub', 'نقاط البيع وإدارة معرض السفير (POS)', '.showroom', true, false, NULL),

  -- 9. Imal & Trade (.imal, .trade)
  ('USR-KAS-004', 'o.allam.trade@kas.sa', 'o.allam.trade', 'أسامة علام', 'Osama Allam', 'مشرف شركة السليم للتجارة', 'KAS', 'tenders', 'etimad-tenders', 'منظومة المنافسات والعقود التجارية (السليم للتجارة)', '.trade', true, false, NULL),
  ('USR-KAS-052', 'm.alsaleh.imal@kas.sa', 'm.alsaleh.imal', 'مازن الصالح', 'Mazen Al-Saleh', 'مدير العلاقات العامة (إمال)', 'KAS', 'tenders', 'kas-b2b-corporate', 'منظومة عقود الشركات والمنافسات (شركة إمال)', '.imal', true, false, NULL),
  ('USR-KAS-053', 'k.alanzi.imal@kas.sa', 'k.alanzi.imal', 'خلود العنزي', 'Kholoud Al-Anzi', 'مديرة التوظيف (إمال)', 'KAS', 'tenders', 'kas-b2b-corporate', 'منظومة التوظيف وعقود الشركات (شركة إمال)', '.imal', true, false, NULL),
  ('USR-KAS-054', 'm.abdelkader.imal@kas.sa', 'm.abdelkader.imal', 'محمد عبدالقادر', 'Mohamed Abdelkader', 'سيلز إمال', 'KAS', 'tenders', 'kas-b2b-corporate', 'منظومة مبيعات الشركات والمنافسات (شركة إمال)', '.imal', true, false, NULL),
  ('USR-KAS-055', 'f.alrashidi.imal@kas.sa', 'f.alrashidi.imal', 'فيصل الرشيدي', 'Faisal Al-Rashidi', 'إمال', 'KAS', 'tenders', 'kas-b2b-corporate', 'منظومة عقود الشركات والمنافسات (شركة إمال)', '.imal', true, false, NULL),

  -- 10. Shelter, Housing & Drivers (.housing, .driver)
  ('USR-KAS-050', 'r.aljbr.housing@kas.sa', 'r.aljbr.housing', 'م. راكان الجبر', 'Eng. Rakan Al-Jbr', 'مدير إدارة السكن والنقل', 'DAR', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء والنقل (دار الرواد)', '.housing', true, false, NULL),
  ('USR-KAS-051', 'a.farahat@kas.sa', 'a.farahat', 'عبدالفتاح فرحات', 'Abdelfattah Farahat', 'السكن', 'all', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء الموحدة', '.housing', true, false, NULL),
  ('USR-KAS-056', 'c.manalo.housing@kas.sa', 'c.manalo.housing', 'كارلا مانالو', 'Carla Manalo', 'مشرفة السكن (توباز)', 'TOP', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء — توباز', '.housing', true, false, NULL),
  ('USR-KAS-057', 'j.delacruz.housing@kas.sa', 'j.delacruz.housing', 'جوسيل ديلا كروز', 'Jocel Dela Cruz', 'مشرفة السكن (الياقوت)', 'YAQ', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء — الياقوت', '.housing', true, false, NULL),
  ('USR-KAS-058', 's.ali.housing@kas.sa', 's.ali.housing', 'سميرة علي', 'Samira Ali', 'مشرفة السكن (السفير)', 'SAF', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء — السفير', '.housing', true, false, NULL),
  ('USR-KAS-059', 'h.abdu.housing@kas.sa', 'h.abdu.housing', 'حياة عبده', 'Hayat Abdu', 'مشرفة السكن (توباز)', 'TOP', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء — توباز', '.housing', true, false, NULL),
  ('USR-KAS-060', 's.barrios.housing@kas.sa', 's.barrios.housing', 'شيلا باريوس', 'Sheila Barrios', 'مشرفة السكن (توباز)', 'TOP', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء — توباز', '.housing', true, false, NULL),
  ('USR-KAS-061', 'k.hussein.housing@kas.sa', 'k.hussein.housing', 'كريمة حسين', 'Karima Hussein', 'مشرفة السكن (دار الرواد)', 'DAR', 'shelter', 'shelter-suite', 'منظومة إدارة السكن والإيواء — دار الرواد', '.housing', true, false, NULL),
  ('USR-KAS-062', 'j.encajas.driver@kas.sa', 'j.encajas.driver', 'جويل إنكاخاس', 'Joel Encajas', 'سائق (توباز)', 'TOP', 'shelter', 'housing-Transport', 'منظومة النقل وحركة السائقين — توباز', '.driver', true, false, NULL),
  ('USR-KAS-063', 'k.basha.driver@kas.sa', 'k.basha.driver', 'كريم باشا', 'Karim Basha', 'سائق (السفير)', 'SAF', 'shelter', 'housing-Transport', 'منظومة النقل وحركة السائقين — السفير', '.driver', true, false, NULL),
  ('USR-KAS-064', 'h.mia.driver@kas.sa', 'h.mia.driver', 'هيرو ميا', 'Hero Mia', 'سائق (الياقوت)', 'YAQ', 'shelter', 'housing-Transport', 'منظومة النقل وحركة السائقين — الياقوت', '.driver', true, false, NULL),
  ('USR-KAS-065', 's.miah.driver@kas.sa', 's.miah.driver', 'شابين مياه', 'Shabin Miah', 'سائق (السفير)', 'SAF', 'shelter', 'housing-Transport', 'منظومة النقل وحركة السائقين — السفير', '.driver', true, false, NULL),
  ('USR-KAS-066', 'a.matubber.driver@kas.sa', 'a.matubber.driver', 'أيوب ماتوبر', 'Ayoub Matubber', 'سائق (دار الرواد)', 'DAR', 'shelter', 'housing-Transport', 'منظومة النقل وحركة السائقين — دار الرواد', '.driver', true, false, NULL),
  ('USR-KAS-067', 'b.hossain.driver@kas.sa', 'b.hossain.driver', 'بلال حسين', 'Belal Hossain', 'سائق (توباز)', 'TOP', 'shelter', 'housing-Transport', 'منظومة النقل وحركة السائقين — توباز', '.driver', true, false, NULL),

  -- EXPLICITLY EXCLUDED ACCOUNT (#68 Osama Saeed — Buffet Kitchen)
  ('USR-KAS-068', 'o.saeed.hospitality@kas.sa', 'o.saeed.hospitality', 'أسامة سعيد', 'Osama Saeed', 'بوفيه (مطبخ البوفيه والضيافة)', 'all', 'excluded', 'none', 'مستبعد من الأنظمة', '.hospitality', false, true, 'رفض أمني: حساب مطبخ البوفيه والضيافة (أسامة سعيد — o.saeed.hospitality@kas.sa) مستبعد من صلاحيات الدخول لأنظمة ERP الإدارية والمالية.')
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
