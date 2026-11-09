/**
 * Seed Database Tables in Supabase PostgreSQL (Port 54421)
 * ERP Group Khalid Al-Sulaim
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedDatabaseTables() {
  console.log('====================================================');
  console.log('📦 SEEDING CORE DATABASE TABLES IN POSTGRESQL (54421)');
  console.log('====================================================\n');

  // 1. Seed company_branches
  console.log('🏢 [1/8] Seeding company_branches...');
  const branches = [
    { id: 'BR-RYD-01', company_id: 'SAF', name: 'فرع الرياض الرئيسي', city: 'الرياض', is_active: true },
    { id: 'BR-JED-02', company_id: 'YAQ', name: 'فرع جدة طريق الملك', city: 'جدة', is_active: true },
    { id: 'BR-DMM-03', company_id: 'TOP', name: 'فرع الدمام والمنطقة الشرقية', city: 'الدمام', is_active: true },
    { id: 'BR-MNS-04', company_id: 'SAF', name: 'فرع المنسكية الحديث', city: 'الرياض', is_active: true }
  ];
  await supabase.from('company_branches').upsert(branches, { onConflict: 'id' });

  // 2. Seed clients
  console.log('👥 [2/8] Seeding clients...');
  const clients = [
    {
      id: 'CLI-1001',
      name: 'عبدالله محمد السبيعي',
      phone: '+966551234567',
      email: 'subaie.a@gmail.com',
      national_id: '1087654321',
      city: 'الرياض',
      status: 'نشط',
      credit_limit: 50000,
      notes: 'عميل مميز - استقدام عمالة منزلية وسائق خاص',
      created_at: '2026-08-01T10:00:00Z'
    },
    {
      id: 'CLI-1002',
      name: 'شركة دار الرائد للمقاولات العامة',
      phone: '+966509876543',
      email: 'info@dar-alraed.com.sa',
      national_id: '7001928374',
      city: 'جدة',
      status: 'نشط',
      credit_limit: 250000,
      notes: 'عقد تشغيل وتأجير كوادر مهنية',
      created_at: '2026-08-05T11:30:00Z'
    },
    {
      id: 'CLI-1003',
      name: 'فاطمة بنت سعود الشمري',
      phone: '+966541122334',
      email: 'f.shammari@hotmail.com',
      national_id: '1098765432',
      city: 'الدمام',
      status: 'نشط',
      credit_limit: 30000,
      notes: 'طلب توسط استقدام من الفلبين',
      created_at: '2026-08-10T14:15:00Z'
    },
    {
      id: 'CLI-1004',
      name: 'سلطان عبدالعزيز المقرن',
      phone: '+966567788990',
      email: 'sultan.muqrin@yahoo.com',
      national_id: '1034567890',
      city: 'الرياض',
      status: 'نشط',
      credit_limit: 40000,
      notes: 'طلب تأجير شهري مرن',
      created_at: '2026-08-12T09:00:00Z'
    }
  ];
  await supabase.from('clients').upsert(clients, { onConflict: 'id' });

  // 3. Seed orders
  console.log('📋 [3/8] Seeding orders...');
  const orders = [
    {
      id: 'ORD-901',
      order_number: 'ORD-2026-0891',
      client_name: 'عبدالله محمد السبيعي',
      phone: '+966551234567',
      nationality: 'الفلبين',
      profession: 'عاملة منزلية',
      status: 'جديد',
      sla_countdown_hours: 24,
      total_amount: 14500,
      created_at: '2026-08-20T08:00:00Z'
    },
    {
      id: 'ORD-902',
      order_number: 'ORD-2026-0892',
      client_name: 'سلطان عبدالعزيز المقرن',
      phone: '+966567788990',
      nationality: 'الهند',
      profession: 'سائق خاص',
      status: 'قيد الإجراء',
      sla_countdown_hours: 48,
      total_amount: 8500,
      created_at: '2026-08-21T09:30:00Z'
    },
    {
      id: 'ORD-903',
      order_number: 'ORD-2026-0893',
      client_name: 'فاطمة بنت سعود الشمري',
      phone: '+966541122334',
      nationality: 'إثيوبيا',
      profession: 'طباخة منزلية',
      status: 'جديد',
      sla_countdown_hours: 12,
      total_amount: 9200,
      created_at: '2026-08-22T11:00:00Z'
    }
  ];
  await supabase.from('orders').upsert(orders, { onConflict: 'id' });

  // 4. Seed contracts
  console.log('📜 [4/8] Seeding contracts...');
  const contracts = [
    {
      id: 'RC-2026-0591',
      contract_no: 'RC-2026-0591',
      musaned_no: 'MSN-998201',
      client_name: 'عبدالله محمد السبيعي',
      client_id: 'CLI-1001',
      company_id: 'SAF',
      worker_name: 'MARY JANE DELA CRUZ',
      nationality: 'الفلبين',
      job_title: 'عاملة منزلية',
      status: 'ساري وموثق',
      subtotal: 12608.70,
      vat_amount: 1891.30,
      total_amount: 14500.00,
      visa_number: '1300984521',
      sponsor_id: '1087654321',
      created_at: '2026-08-01T12:00:00Z'
    },
    {
      id: 'RC-2026-0592',
      contract_no: 'RC-2026-0592',
      musaned_no: 'MSN-998202',
      client_name: 'فاطمة بنت سعود الشمري',
      client_id: 'CLI-1003',
      company_id: 'SAF',
      worker_name: 'TIGIST ABERA HAILU',
      nationality: 'إثيوبيا',
      job_title: 'عاملة منزلية شاملة',
      status: 'في السفارة',
      subtotal: 8000.00,
      vat_amount: 1200.00,
      total_amount: 9200.00,
      visa_number: '1300762145',
      sponsor_id: '1098765432',
      created_at: '2026-08-10T15:00:00Z'
    }
  ];
  await supabase.from('contracts').upsert(contracts, { onConflict: 'id' });

  // 5. Seed rent_packages & rent_contracts
  console.log('🏠 [5/8] Seeding rent_packages & rent_contracts...');
  const rentPackages = [
    {
      id: 'PKG-01',
      name: 'الباقة الشهرية المرنة (Flexible Monthly)',
      category: 'أفراد وعائلات',
      duration_months: 1,
      monthly_rate: 2450,
      discount_percentage: 0,
      security_deposit: 500,
      active_contracts: 8,
      features: ['ضمان استبدال فوري خلال 48 ساعة', 'تغطية تأمينية كاملة ضد هروب العاملة', 'إشراف صحي ورعاية طبية شهرية', 'خدمة توصيل مجانية لمقر العميل'],
      terms_summary: 'تجديد شهري تلقائي ما لم يخطر الطرف الأول قبل 5 أيام من نهاية المدة.'
    },
    {
      id: 'PKG-02',
      name: 'باقة الـ 3 أشهر الذهبية (Quarterly)',
      category: 'أفراد وعائلات',
      duration_months: 3,
      monthly_rate: 2250,
      discount_percentage: 8,
      security_deposit: 1000,
      active_contracts: 14,
      features: ['خصم 8% على إجمالي القيمة', 'ضمان استبدال غير محدود', 'فحص طبي شامل معتمد', 'مدير حساب خاص لخدمة العميل'],
      terms_summary: 'سداد دفعة أولى 50% والباقي بعد مضي 45 يوماً.'
    },
    {
      id: 'PKG-03',
      name: 'الباقة السنوية للشركات والقصور (Annual VIP)',
      category: 'شركات وقطاع تجاري',
      duration_months: 12,
      monthly_rate: 1950,
      discount_percentage: 20,
      security_deposit: 2000,
      active_contracts: 31,
      features: ['خصم 20% وأقل سعر شهري متاح', 'إشراف ومتابعة دورية كل أسبوعين', 'تبديل مجاني فوري وبدون شروط', 'فواتير إلكترونية معتمدة لـ ZATCA'],
      terms_summary: 'عقد سنوي ملزم مع دفعة مقدمة ربع سنوية.'
    }
  ];
  await supabase.from('rent_packages').upsert(rentPackages, { onConflict: 'id' });

  // 6. Seed cost_centers
  console.log('📊 [6/8] Seeding cost_centers...');
  const costCenters = [
    {
      id: 'CC-101',
      code: 'CC-SAF-RYD',
      name: 'مركز تكلفة فرع الرياض الرئيسي (السفير الماسي)',
      company_id: 'SAF',
      manager_name: 'أحمد المحاسب',
      budget: 350000,
      actual_spent: 182400,
      created_at: '2026-08-01T00:00:00Z'
    },
    {
      id: 'CC-102',
      code: 'CC-YAQ-JED',
      name: 'مركز تكلفة فرع جدة ومجمع الإيواء (الياقوت)',
      company_id: 'YAQ',
      manager_name: 'فهد العمليات',
      budget: 280000,
      actual_spent: 145000,
      created_at: '2026-08-01T00:00:00Z'
    },
    {
      id: 'CC-103',
      code: 'CC-TOP-DMM',
      name: 'مركز تكلفة فرع الشرقية والتشغيل (توباز)',
      company_id: 'TOP',
      manager_name: 'سارة خالد',
      budget: 200000,
      actual_spent: 89500,
      created_at: '2026-08-01T00:00:00Z'
    }
  ];
  await supabase.from('cost_centers').upsert(costCenters, { onConflict: 'id' });

  // 7. Seed vouchers
  console.log('💵 [7/8] Seeding vouchers (receipts & payments)...');
  const vouchers = [
    {
      id: 'VOUCH-2026-01',
      voucher_number: 'RCP-2026-1041',
      voucher_type: 'سند قبض',
      amount: 14500.00,
      paid_to: 'شركة السفير الماسي للاستقدام',
      beneficiary: 'عبدالله محمد السبيعي',
      payment_method: 'مدى / سداد',
      description: 'دفعة عقد استقدام مساند #RC-2026-0591',
      status: 'معتمد ومرحل',
      created_at: '2026-08-01T12:30:00Z'
    },
    {
      id: 'VOUCH-2026-02',
      voucher_number: 'PAY-2026-0822',
      voucher_type: 'سند صرف',
      amount: 4500.00,
      paid_to: 'وكالة مانيلا الدولية للتوظيف',
      beneficiary: 'وكالة مانيلا الدولية',
      payment_method: 'تحويل بنكي دولي',
      description: 'عمولة استقدام وفحص طبي معتمد',
      status: 'معتمد ومرحل',
      created_at: '2026-08-05T14:00:00Z'
    }
  ];
  await supabase.from('vouchers').upsert(vouchers, { onConflict: 'id' });

  // 8. Seed cvs
  console.log('📄 [8/8] Seeding cvs (domestic & professional)...');
  const cvs = [
    {
      id: 'CV-PH-01',
      code: 'CV-2026-091',
      name_ar: 'ماريا سانتوس',
      name_en: 'MARIA SANTOS',
      nationality: 'الفلبين',
      job_title: 'عاملة منزلية',
      monthly_salary: 1500,
      passport_no: 'P9824102A',
      status: 'متاح للتعاقد',
      skills: ['طبخ عربي', 'رعاية أطفال', 'تنظيف', 'غسيل وكوي'],
      created_at: '2026-08-01T08:00:00Z'
    },
    {
      id: 'CV-ET-02',
      code: 'CV-2026-092',
      name_ar: 'تيجست هايلو',
      name_en: 'TIGIST HAILU',
      nationality: 'إثيوبيا',
      job_title: 'عاملة منزلية شاملة',
      monthly_salary: 1200,
      passport_no: 'EP776192B',
      status: 'محجوز',
      skills: ['تنظيف', 'غسيل وكوي', 'رعاية كبار سن'],
      created_at: '2026-08-05T09:30:00Z'
    },
    {
      id: 'CV-IN-03',
      code: 'CV-2026-093',
      name_ar: 'راجيش كومار',
      name_en: 'RAJESH KUMAR',
      nationality: 'الهند',
      job_title: 'سائق خاص',
      monthly_salary: 1800,
      passport_no: 'Z5541908C',
      status: 'متاح للتعاقد',
      skills: ['قيادة سيارات فاخرة', 'معرفة طرق الرياض وجدة', 'لغة عربية متوسطة'],
      created_at: '2026-08-10T11:00:00Z'
    }
  ];
  await supabase.from('cvs').upsert(cvs, { onConflict: 'id' });

  console.log('\n🎉 ALL CORE POSTGRESQL TABLES SUCCESSFULLY POPULATED WITH REAL DATA!');
}

seedDatabaseTables();
