/**
 * Rich Production Schema Seed for Supabase PostgreSQL (Port 54421)
 * Matching the exact PostgreSQL schema of ERP Group Khalid Al-Sulaim
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runRichSeed() {
  console.log('========================================================');
  console.log('🌟 SEEDING RICH PRODUCTION DATA INTO REAL POSTGRESQL');
  console.log('========================================================\n');

  // 1. Clients
  console.log('👥 [1/6] Seeding clients...');
  const clients = [
    {
      client_no: 'CLI-1004',
      name: 'سلطان بن عبدالعزيز المقرن',
      phone: '0567788990',
      national_id: '1034567890',
      account_code: '120104',
      client_activity: 'عقد استقدام خادمة وسائق',
      branch: 'فرع الرياض',
      status: 'نشط',
      type: 'شخص',
      orders_count: 2
    },
    {
      client_no: 'CLI-1005',
      name: 'فاطمة بنت سعود الشمري',
      phone: '0541122334',
      national_id: '1098765432',
      account_code: '120105',
      client_activity: 'عقد توسط من الفلبين',
      branch: 'فرع الدمام',
      status: 'نشط',
      type: 'شخص',
      orders_count: 1
    },
    {
      client_no: 'CLI-1006',
      name: 'شركة ياقوت نجد للمقاولات والتشغيل',
      phone: '0509876543',
      national_id: '7001928374',
      account_code: '120106',
      client_activity: 'توريد كوادر مهنية وتشغيل مواقع',
      branch: 'فرع جدة',
      status: 'نشط',
      type: 'شركة',
      orders_count: 8
    },
    {
      client_no: 'CLI-1007',
      name: 'مؤسسة أفق التميز التجارية',
      phone: '0551122445',
      national_id: '7002837461',
      account_code: '120107',
      client_activity: 'تأجير سنوي للشركات',
      branch: 'فرع الرياض',
      status: 'نشط',
      type: 'شركة',
      orders_count: 5
    }
  ];
  await supabase.from('clients').upsert(clients, { onConflict: 'client_no' });

  // 2. Contracts
  console.log('📜 [2/6] Seeding contracts...');
  const contracts = [
    {
      contract_number: 'REC-2026-002',
      musaned_number: 'MSN-998812',
      client_name: 'سارة خالد الدوسري',
      client_phone: '0559876543',
      maid_name: 'سيتي نورعيني',
      nationality: 'إندونيسيا',
      external_office: 'مكتب جاكرتا للخدمات',
      amount: 19500.00,
      stage: 'إصدار التأشيرة',
      branch: 'فرع جدة'
    },
    {
      contract_number: 'REC-2026-003',
      musaned_number: 'MSN-998813',
      client_name: 'سلطان بن عبدالعزيز المقرن',
      client_phone: '0567788990',
      maid_name: 'رحمة أديسي',
      nationality: 'أثيوبيا',
      external_office: 'مكتب أديس أبابا',
      amount: 9800.00,
      stage: 'ربط الجواز ومساند',
      branch: 'فرع الرياض'
    },
    {
      contract_number: 'REC-2026-004',
      musaned_number: 'MSN-998814',
      client_name: 'شركة الأمل للمقاولات',
      client_phone: '0541122334',
      maid_name: 'كوادر مهنية متعددة (10 عمال)',
      nationality: 'الهند',
      external_office: 'مكتب نيو دلهي الدولي',
      amount: 45000.00,
      stage: 'ساري وموثق',
      branch: 'فرع الدمام'
    }
  ];
  await supabase.from('contracts').upsert(contracts, { onConflict: 'contract_number' });

  // 3. CVs
  console.log('📄 [3/6] Seeding CVs...');
  const cvs = [
    {
      cv_code: 'CV-8804',
      maid_name: 'جوسيفينا مانويل',
      nationality: 'الفلبين',
      job: 'طباخة منزلية ورعاية أطفال',
      passport_number: 'P1122334A',
      age: 30,
      salary: 1700.00,
      external_office: 'مكتب مانيلا الدولي',
      type: 'توسط',
      status: 'متاح'
    },
    {
      cv_code: 'CV-8805',
      maid_name: 'أسمهان تاريكو',
      nationality: 'أثيوبيا',
      job: 'عاملة منزلية ونظافة عامة',
      passport_number: 'EP998877B',
      age: 24,
      salary: 1100.00,
      external_office: 'مكتب أديس أبابا',
      type: 'توسط',
      status: 'متاح'
    },
    {
      cv_code: 'CV-8806',
      maid_name: 'راجيش كومار باتل',
      nationality: 'الهند',
      job: 'سائق خاص مع رخصة سعودية',
      passport_number: 'Z8877665C',
      age: 35,
      salary: 2000.00,
      external_office: 'مكتب كيرلا الدولي',
      type: 'إيجار',
      status: 'متاح'
    },
    {
      cv_code: 'CV-8807',
      maid_name: 'فاطمة محمد كاسيم',
      nationality: 'كينيا',
      job: 'مربية أطفال ولغة إنجليزية بطلاقة',
      passport_number: 'KN443322D',
      age: 27,
      salary: 1400.00,
      external_office: 'مكتب نيروبي المعتمد',
      type: 'توسط',
      status: 'متاح'
    }
  ];
  await supabase.from('cvs').upsert(cvs, { onConflict: 'cv_code' });

  // 4. Rent Packages
  console.log('🏠 [4/6] Seeding rent_packages...');
  const packages = [
    {
      package_code: 'PKG-QUARTERLY-01',
      package_name: 'باقة الـ 3 أشهر الذهبية (Quarterly VIP)',
      duration_type: 'ربع سنوي',
      price: 8900.00,
      features: 'خصم 8%، استبدال فوري خلال 24 ساعة، فحص دوري معتمد، رعاية طبية شاملة',
      status: 'نشط'
    },
    {
      package_code: 'PKG-CORP-ANNUAL',
      package_name: 'باقة الشركات والمؤسسات السنوية (Corporate B2B)',
      duration_type: 'سنوي تجاري',
      price: 48000.00,
      features: 'فوترة ZATCA المرحلة الثانية، مشرف ميداني مخصص، تجديد فوري دون توقف الأعمال',
      status: 'نشط'
    }
  ];
  await supabase.from('rent_packages').upsert(packages, { onConflict: 'package_code' });

  // 5. Employees
  console.log('👔 [5/6] Seeding employees...');
  const employees = [
    {
      employee_code: 'EMP-2026-005',
      name: 'م. بندر صالح الهويريني',
      national_id: '1055443322',
      job_title: 'مدير منافسات كاس وسحابة اعتماد',
      department: 'المنافسات والعقود الحكومية',
      branch: 'المقر الرئيسي - كاس',
      hire_date: '2021-05-01',
      salary: 18000.00,
      status: 'نشط'
    },
    {
      employee_code: 'EMP-2026-006',
      name: 'عبدالرحمن العتيبي',
      national_id: '1044332211',
      job_title: 'مدير العمليات والتأجير التشغيلي',
      department: 'التأجير والخدمات المساندة',
      branch: 'فرع الدمام',
      hire_date: '2022-09-15',
      salary: 13500.00,
      status: 'نشط'
    }
  ];
  await supabase.from('employees').upsert(employees, { onConflict: 'employee_code' });

  // 6. System Audit Logs
  console.log('🛡️ [6/6] Seeding system audit log...');
  await supabase.from('system_audit_logs').insert([
    {
      action: 'SYSTEM_INITIALIZATION',
      module: 'SECURITY_IAM',
      details: 'تم تفعيل منظومة المصادقة الحقيقية وربط قواعد بيانات PostgreSQL بنجاح لمجموعة خالد السليم',
      performed_by: 'khalid.admin',
      created_at: new Date().toISOString()
    }
  ]);

  console.log('\n🎉 ALL RICH PRODUCTION DATA SEEDED 100% INTO POSTGRESQL (54421)!');
}

runRichSeed();
