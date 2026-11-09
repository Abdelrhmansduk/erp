-- Complete Missing Database Tables & RLS Policies for ERP Group Khalid Al-Sulaim System

-- 18. Activity Logs Table (سجلات الأنشطة والفعاليات)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name VARCHAR(255) NOT NULL DEFAULT 'المستخدم الحالي',
  action_type VARCHAR(100) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Agent Imports Table (سجل استيراد وربط الوكلاء)
CREATE TABLE IF NOT EXISTS public.agent_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  cvs_count INTEGER DEFAULT 0,
  license_number VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'نشط معتمد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Attendances Table (حضور وانصراف الموظفين)
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(255) NOT NULL,
  emp_no VARCHAR(50) NOT NULL,
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'حاضر',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Branch Communications Table (مراسلات وتعاميم الفروع)
CREATE TABLE IF NOT EXISTS public.branch_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no VARCHAR(50) UNIQUE NOT NULL,
  sender_branch VARCHAR(100) NOT NULL,
  target_branch VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'عادي',
  status VARCHAR(50) DEFAULT 'تم الاستلام',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Branch Departments Table (هيكل وأقسام الفروع)
CREATE TABLE IF NOT EXISTS public.branch_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code VARCHAR(50) UNIQUE NOT NULL,
  dept_name VARCHAR(255) NOT NULL,
  manager_name VARCHAR(255) NOT NULL,
  branch VARCHAR(100) DEFAULT 'فرع الرياض',
  employees_count INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Custodies Table (العهد المالية والعينية)
CREATE TABLE IF NOT EXISTS public.custodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custody_code VARCHAR(50) UNIQUE NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  custody_type VARCHAR(100) NOT NULL, -- مالية / عينية
  amount_or_item VARCHAR(255) NOT NULL,
  received_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'قيد الاستخدام',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Financial Requests Table (طلبات السلف والعهد)
CREATE TABLE IF NOT EXISTS public.financial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no VARCHAR(50) UNIQUE NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  request_type VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'بانتظار الاعتماد',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Group Dispatches Table (توزيع ونقل المجموعات)
CREATE TABLE IF NOT EXISTS public.group_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_no VARCHAR(50) UNIQUE NOT NULL,
  group_name VARCHAR(255) NOT NULL,
  workers_count INTEGER DEFAULT 1,
  destination VARCHAR(255) NOT NULL,
  dispatch_date DATE NOT NULL,
  supervisor VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'جاري النقل',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Leave Requests Table (طلبات الإجازات للموظفين)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(255) NOT NULL,
  leave_type VARCHAR(100) DEFAULT 'سنوية',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'مقبولة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Master Constants Table (ثوابت النظام والمهن والجنسيات)
CREATE TABLE IF NOT EXISTS public.master_constants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL, -- جنسية / مهنة / فرع / حالة
  constant_code VARCHAR(50) UNIQUE NOT NULL,
  constant_name VARCHAR(255) NOT NULL,
  value_en VARCHAR(255),
  status VARCHAR(50) DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Rent Packages Table (باقات وأسعار عقود الإيجار)
CREATE TABLE IF NOT EXISTS public.rent_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code VARCHAR(50) UNIQUE NOT NULL,
  package_name VARCHAR(255) NOT NULL,
  duration_type VARCHAR(50) DEFAULT 'شهري', -- يومي / أسبوعي / شهري / سنوي
  price NUMERIC(10,2) NOT NULL,
  features TEXT,
  status VARCHAR(50) DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. Sent Messages Table (سجل الرسائل والإشعارات)
CREATE TABLE IF NOT EXISTS public.sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL,
  channel VARCHAR(50) DEFAULT 'SMS', -- SMS / WhatsApp / Email
  message_body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'تم الإرسال',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. System Settings Table (إعدادات النظام الفنية والهوية)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. System Users Table (إدارة المستخدمين والأدوار)
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100) DEFAULT 'مدير نظام',
  branch VARCHAR(100) DEFAULT 'المقر الرئيسي',
  status VARCHAR(50) DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. Website Visitors Table (تحليلات وزوار الموقع)
CREATE TABLE IF NOT EXISTS public.website_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_ip VARCHAR(50) NOT NULL,
  page_visited VARCHAR(255) NOT NULL,
  device_type VARCHAR(100) DEFAULT 'Desktop',
  country VARCHAR(100) DEFAULT 'السعودية',
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- 33. WhatsApp Messages Table (رسائل ومحادثات الواتساب)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  message_text TEXT NOT NULL,
  direction VARCHAR(20) DEFAULT 'وارد', -- وارد / صادرة
  status VARCHAR(50) DEFAULT 'مقروءة',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all 16 new tables
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_constants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Grant Full Access Policies for System Users
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'activity_logs', 'agent_imports', 'attendances', 'branch_communications',
      'branch_departments', 'custodies', 'financial_requests', 'group_dispatches',
      'leave_requests', 'master_constants', 'rent_packages', 'sent_messages',
      'system_settings', 'system_users', 'website_visitors', 'whatsapp_messages'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access on %I" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "Allow authenticated full access on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END $$;
