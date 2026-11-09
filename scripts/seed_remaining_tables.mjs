/**
 * Seed Remaining Empty Tables with Exact PostgreSQL Schema Mapping
 * ERP Group Khalid Al-Sulaim
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedRemaining() {
  console.log('================================================================');
  console.log('⚡ SEEDING REMAINING TABLES WITH EXACT COLUMN ARCHITECTURE');
  console.log('================================================================\n');

  // 1. branches
  console.log('🏢 [1/11] Seeding branches...');
  const branches = [
    {
      company_id: 'SAF',
      code: 'HQ-RUH',
      name: 'الفرع الرئيسي (الإدارة العامة - الرياض)',
      city: 'الرياض',
      phone: '0112345678',
      manager_name: 'عبد الفتاح السليم',
      is_active: true
    },
    {
      company_id: 'YAQ',
      code: 'BR-JED',
      name: 'فرع جدة طريق الملك',
      city: 'جدة',
      phone: '0129876543',
      manager_name: 'أحمد الغامدي',
      is_active: true
    },
    {
      company_id: 'TOP',
      code: 'BR-DMM',
      name: 'فرع الدمام والمنطقة الشرقية',
      city: 'الدمام',
      phone: '0138765432',
      manager_name: 'عبدالرحمن العتيبي',
      is_active: true
    }
  ];
  const { error: brErr } = await supabase.from('branches').insert(branches);
  if (brErr) console.error('branches err:', brErr.message);
  else console.log('✅ branches seeded');

  // 2. vouchers
  console.log('💵 [2/11] Seeding vouchers...');
  const vouchers = [
    {
      voucher_no: 'RCP-2026-1001',
      type: 'سند قبض',
      payee_payer: 'بندر صالح الهويريني',
      treasury: 'حساب بنك الراجحي - السفير الماسي',
      amount: 14500.00,
      status: 'معتمد',
      description: 'دفعة استقدام مساند عقد #REC-2026-001',
      payment_method: 'مدى / سداد',
      company_id: 'SAF',
      branch: 'فرع الرياض الرئيسي'
    },
    {
      voucher_no: 'PAY-2026-1002',
      type: 'سند صرف',
      payee_payer: 'مكتب مانيلا الدولي للاستقدام',
      treasury: 'حساب البنك الأهلي التجاري (SNB)',
      amount: 5500.00,
      status: 'معتمد',
      description: 'عمولة استقدام وفحص طبي معتمد',
      payment_method: 'تحويل بنكي دولي',
      company_id: 'SAF',
      branch: 'فرع الرياض الرئيسي'
    }
  ];
  const { error: vErr } = await supabase.from('vouchers').insert(vouchers);
  if (vErr) console.error('vouchers err:', vErr.message);
  else console.log('✅ vouchers seeded');

  // 3. ats_candidates
  console.log('👤 [3/11] Seeding ats_candidates...');
  const candidates = [
    {
      candidate_code: 'ATS-2026-011',
      full_name: 'ريان بن عبدالله القحطاني',
      email: 'rayan.qahtani@gmail.com',
      phone: '0551122334',
      nationality: 'سعودي',
      applied_position: 'أخصائي تسويق رقمي وإدارة حملات',
      target_company_id: 'SAF',
      stage: 'المقابلة الفنية',
      ai_score: 92,
      experience_years: 4,
      expected_salary: 11000.00
    },
    {
      candidate_code: 'ATS-2026-012',
      full_name: 'نهى بنت سعد العلي',
      email: 'noha.ali@yahoo.com',
      phone: '0567788990',
      nationality: 'سعودية',
      applied_position: 'محاسبة مالية ومطابقة ضريبية ZATCA',
      target_company_id: 'SAF',
      stage: 'عرض العمل',
      ai_score: 96,
      experience_years: 5,
      expected_salary: 12500.00
    }
  ];
  const { error: atsErr } = await supabase.from('ats_candidates').insert(candidates);
  if (atsErr) console.error('ats_candidates err:', atsErr.message);
  else console.log('✅ ats_candidates seeded');

  // 4. shelter_records
  console.log('🏡 [4/11] Seeding shelter_records...');
  const shelter = [
    {
      id: 'SHL-2026-001',
      company_id: 'SAF',
      maid_name: 'MARY JANE DELA CRUZ',
      nationality: 'الفلبين',
      passport: 'P9824102A',
      client_name: 'عبدالله محمد السبيعي',
      contract_ref: 'REC-2026-001',
      shelter_location: 'مجمع إيواء حي الرمال - الرياض',
      days_in_shelter: 2,
      catering_meals_count: 6,
      work_willingness: 'مستعدة للعمل',
      status: 'تحت التسليم للعميل'
    }
  ];
  const { error: shErr } = await supabase.from('shelter_records').insert(shelter);
  if (shErr) console.error('shelter_records err:', shErr.message);
  else console.log('✅ shelter_records seeded');

  // 5. complaints
  console.log('⚠️ [5/11] Seeding complaints...');
  const complaints = [
    {
      id: 'CMP-2026-001',
      company_id: 'SAF',
      ticket_no: 'TKT-2026-091',
      client_name: 'عبدالله محمد السبيعي',
      client_phone: '+966551234567',
      category: 'فترة التجربة والضمان',
      contract_ref: 'REC-2026-001',
      priority: 'عالية',
      status: 'قيد المعالجة',
      sla_hours_left: 18,
      assigned_agent: 'سليمان خالد',
      branch: 'فرع الرياض الرئيسي',
      description: 'العميل يرغب في فحص طبي إضافي للعاملة والتأكد من ملاءمتها'
    }
  ];
  const { error: cmpErr } = await supabase.from('complaints').insert(complaints);
  if (cmpErr) console.error('complaints err:', cmpErr.message);
  else console.log('✅ complaints seeded');

  // 6. company_bank_accounts
  console.log('🏦 [6/11] Seeding company_bank_accounts...');
  const banks = [
    {
      company_id: 'SAF',
      bank_name: 'مصرف الراجحي (Al Rajhi Bank)',
      account_number: '204608010001234',
      iban: 'SA0380000204608010001234',
      currency: 'SAR',
      gl_account_code: '110201',
      current_balance: 485200.00,
      is_active: true
    },
    {
      company_id: 'YAQ',
      bank_name: 'البنك الأهلي السعودي (SNB)',
      account_number: '101000987654321',
      iban: 'SA4410000010100098765432',
      currency: 'SAR',
      gl_account_code: '110202',
      current_balance: 298400.00,
      is_active: true
    }
  ];
  const { error: bErr } = await supabase.from('company_bank_accounts').insert(banks);
  if (bErr) console.error('company_bank_accounts err:', bErr.message);
  else console.log('✅ company_bank_accounts seeded');

  // 7. wps_payroll_records
  console.log('💳 [7/11] Seeding wps_payroll_records...');
  const wps = [
    {
      company_id: 'SAF',
      payroll_month: '2026-08',
      basic_paid: 10000.00,
      allowances_paid: 2500.00,
      deductions: 0.00,
      net_salary: 12500.00,
      wps_file_generated: true,
      payment_status: 'PAID'
    },
    {
      company_id: 'SAF',
      payroll_month: '2026-08',
      basic_paid: 8000.00,
      allowances_paid: 1800.00,
      deductions: 0.00,
      net_salary: 9800.00,
      wps_file_generated: true,
      payment_status: 'PAID'
    }
  ];
  const { error: wpsErr } = await supabase.from('wps_payroll_records').insert(wps);
  if (wpsErr) console.error('wps_payroll_records err:', wpsErr.message);
  else console.log('✅ wps_payroll_records seeded');

  // 8. ingaz_delegations
  console.log('✈️ [8/11] Seeding ingaz_delegations...');
  const delegations = [
    {
      delegation_no: 'ING-2026-0921',
      delegation_date: '2026-08-15',
      client_name: 'بندر صالح الهويريني',
      musaned_contract_no: 'MSN-998811',
      country: 'الفلبين',
      profession: 'عاملة منزلية',
      status: 'تم التفويض'
    }
  ];
  const { error: ingErr } = await supabase.from('ingaz_delegations').insert(delegations);
  if (ingErr) console.error('ingaz_delegations err:', ingErr.message);
  else console.log('✅ ingaz_delegations seeded');

  // 9. sponsorship_transfers
  console.log('🔄 [9/11] Seeding sponsorship_transfers...');
  const transfers = [
    {
      transfer_no: 'TRF-2026-005',
      prev_sponsor: 'مؤسسة الرواد التجارية',
      new_sponsor: 'عبدالله محمد الغامدي',
      maid_name: 'راجيش كومار',
      trial_days: 15,
      trial_start_date: '2026-08-20',
      contract_amount: 8500.00,
      paid_amount: 8500.00,
      status: 'ساري وموثق'
    }
  ];
  const { error: trfErr } = await supabase.from('sponsorship_transfers').insert(transfers);
  if (trfErr) console.error('sponsorship_transfers err:', trfErr.message);
  else console.log('✅ sponsorship_transfers seeded');

  // 10. travel_flights
  console.log('🛫 [10/11] Seeding travel_flights...');
  const flights = [
    {
      flight_no: 'SV-861',
      airline: 'الخطوط السعودية',
      client_name: 'عبدالله محمد السبيعي',
      maid_name: 'MARY JANE DELA CRUZ',
      flight_type: 'قدوم جديد',
      flight_date: '2026-09-05',
      arrival_airport: 'مطار الملك خالد الدولي بالرياض (RUH)',
      status: 'مؤكد ومجدول'
    }
  ];
  const { error: flErr } = await supabase.from('travel_flights').insert(flights);
  if (flErr) console.error('travel_flights err:', flErr.message);
  else console.log('✅ travel_flights seeded');

  // 11. activity_logs
  console.log('🛡️ [11/11] Seeding activity_logs...');
  const logs = [
    {
      user_name: 'khalid.admin',
      action_type: 'SYSTEM_AUDIT',
      module_name: 'DATABASE_CORE',
      details: 'مراجعة وتحديث سلامة كافة جداول قواعد البيانات الـ 58 لمجموعة خالد السليم',
      ip_address: '127.0.0.1'
    }
  ];
  const { error: logErr } = await supabase.from('activity_logs').insert(logs);
  if (logErr) console.error('activity_logs err:', logErr.message);
  else console.log('✅ activity_logs seeded');

  console.log('\n🎉 ALL 11 REMAINING TABLES SUCCESSFULLY POPULATED IN POSTGRESQL (54421)!');
}

seedRemaining();
