-- Clean Production Seed Data for ERP Group Khalid Al-Sulaim
-- Demo operational records removed; only core system settings are seeded.

INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('COMPANY_NAME', 'مجموعة خالد السليم ERP', 'الاسم الرسمي للمجموعة'),
  ('CURRENCY', 'SAR', 'العملة الرئيسية للنظام'),
  ('TAX_RATE', '15%', 'نسبة ضريبة القيمة المضافة ZATCA')
ON CONFLICT (setting_key) DO NOTHING;
