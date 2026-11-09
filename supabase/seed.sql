-- Seed Data for ERP Group Khalid Al-Sulaim

-- 1. Initial Clients
INSERT INTO public.clients (client_no, name, phone, national_id, account_code, client_activity, branch, status, type, orders_count) VALUES
  ('CLI-1001', 'عبدالله محمد الغامدي', '0501234567', '1098765432', '120101', 'عقد استقدام ساري', 'فرع الرياض', 'نشط', 'شخص', 3),
  ('CLI-1002', 'سارة خالد الدوسري', '0559876543', '1087654321', '120102', 'عقد تأجير تشغيلي', 'فرع جدة', 'نشط', 'شخص', 1),
  ('CLI-1003', 'شركة الأمل للمقاولات', '0541122334', '7001234567', '120103', 'توريد عمالة مهنية', 'فرع الدمام', 'نشط', 'شركة', 12)
ON CONFLICT (client_no) DO NOTHING;

-- 2. Initial CVs
INSERT INTO public.cvs (cv_code, maid_name, nationality, job, passport_number, age, salary, external_office, type, status) VALUES
  ('CV-8801', 'ماريا سانتوس', 'الفلبين', 'عاملة منزلية', 'P9876543A', 28, 1500.00, 'مكتب مانيلا الدولي', 'توسط', 'متاح'),
  ('CV-8802', 'سيتي نورعيني', 'إندونيسيا', 'عاملة منزلية', 'A1234567B', 32, 1500.00, 'مكتب جاكرتا للخدمات', 'إيجار', 'متاح'),
  ('CV-8803', 'رحمة أديسي', 'أثيوبيا', 'عاملة منزلية', 'EP554433C', 26, 1200.00, 'مكتب أديس أبابا', 'توسط', 'متاح')
ON CONFLICT (cv_code) DO NOTHING;

-- 3. Initial Recruitment Contracts
INSERT INTO public.contracts (contract_number, musaned_number, client_name, client_phone, maid_name, nationality, external_office, amount, stage, branch) VALUES
  ('REC-2026-001', 'MSN-998811', 'عبدالله محمد الغامدي', '0501234567', 'ماريا سانتوس', 'الفلبين', 'مكتب مانيلا الدولي', 17500.00, 'وصول العمالة', 'فرع الرياض')
ON CONFLICT (contract_number) DO NOTHING;

-- 4. Initial System Users & Roles
INSERT INTO public.system_users (username, full_name, email, role, branch, status) VALUES
  ('khalid.admin', 'خالد السليم', 'khalid@alsulaim.sa', 'رئيس المجموعة', 'المقر الرئيسي', 'نشط'),
  ('finance.manager', 'أحمد المحاسب', 'finance@alsulaim.sa', 'مدير الحسابات', 'فرع الرياض', 'نشط'),
  ('operation.user', 'فهد العمليات', 'ops@alsulaim.sa', 'مشرف تشغيل', 'فرع جدة', 'نشط')
ON CONFLICT (username) DO NOTHING;

-- 5. System Settings Initial Seeds
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('COMPANY_NAME', 'مجموعة خالد السليم ERP', 'الاسم الرسمي للمجموعة'),
  ('CURRENCY', 'SAR', 'العملة الرئيسية للنظام'),
  ('TAX_RATE', '15%', 'نسبة ضريبة القيمة المضافة ZATCA')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Initial Employees
INSERT INTO public.employees (employee_code, name, national_id, job_title, department, branch, hire_date, salary, status) VALUES
  ('EMP-2026-001', 'عبدالفتح (مسؤول الوكلاء)', '1092837410', 'مدير شؤون المكاتب الخارجية', 'التشغيل والاستقدام', 'الإدارة العامة - الرياض', '2022-01-15', 12500.00, 'نشط'),
  ('EMP-2026-002', 'فهد العتيبي', '1088273641', 'مشرف التشغيل والإيواء', 'إدارة الإيواء', 'فرع الرياض', '2023-03-01', 9800.00, 'نشط'),
  ('EMP-2026-003', 'إبراهيم الشمري', '1077283940', 'محاسب عام قيد وسندات', 'الإدارة المالية', 'الإدارة العامة', '2023-06-10', 8500.00, 'نشط'),
  ('EMP-2026-004', 'سارة خالد', '1066283910', 'أخصائية خدمة عملاء وواتساب', 'خدمة العملاء (CRM)', 'فرع جدة', '2024-01-10', 7200.00, 'نشط')
ON CONFLICT (employee_code) DO NOTHING;

-- 7. Rent Packages
INSERT INTO public.rent_packages (package_code, package_name, duration_type, price, features, status) VALUES
  ('PKG-MONTHLY-01', 'الباقة الشهرية المرنة', 'شهري', 3450.00, 'تأمين طبي شامل، بديل مجاني خلال 24 ساعة', 'نشط'),
  ('PKG-YEARLY-01', 'الباقة السنوية المتميزة', 'سنوي', 36000.00, 'خصم 15%، صيانة وإشراف دوري شهري', 'نشط')
ON CONFLICT (package_code) DO NOTHING;
