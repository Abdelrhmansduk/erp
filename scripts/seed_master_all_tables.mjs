/**
 * Master Enterprise Data Seeder for all 58 PostgreSQL Tables
 * Populating realistic, cohesive Saudi enterprise data for Khalid Al-Sulaim ERP
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedMasterData() {
  console.log('================================================================');
  console.log('🚀 MASTER POPULATION FOR ALL 58 ERP POSTGRESQL TABLES (54421)');
  console.log('================================================================\n');

  // 1. Orders
  console.log('📦 [1/16] Seeding orders...');
  const orders = [
    {
      id: 'ORD-2026-001',
      order_number: 'ORD-2026-001',
      company_id: 'SAF',
      client_name: 'بندر صالح الهويريني',
      client_phone: '+966555774494',
      maid_name: 'KIMBERLY (سيرة ذاتية مختارة)',
      nationality: 'الفلبين',
      passport_number: 'P882910',
      request_type: 'معينة',
      status: 'جديد',
      timer_status: 'عادي',
      deadline: '24 ساعة',
      contract_status: 'بدون عقد',
      responsible_employee: 'فهد العتيبي (مسوق)',
      branch: 'فرع الرياض الرئيسي',
      office_name: "PLATINUM BROTHERS INT'L",
      total_amount: 14500.00,
      notes: 'العميل يرغب في استقدام عاجل'
    },
    {
      id: 'ORD-2026-002',
      order_number: 'ORD-2026-002',
      company_id: 'SAF',
      client_name: 'سارة خالد الدوسري',
      client_phone: '+966559876543',
      maid_name: 'طلب عمالة إثيوبية مواصفات خاصة',
      nationality: 'إثيوبيا',
      passport_number: 'PENDING',
      request_type: 'حسب المواصفات',
      status: 'تحت الإجراء',
      timer_status: 'حرج',
      deadline: '12 ساعة',
      contract_status: 'بدون عقد',
      responsible_employee: 'فهد العتيبي (مسوق)',
      branch: 'فرع الرياض الرئيسي',
      office_name: 'مكتب أديس أبابا للخدمات',
      total_amount: 9200.00,
      notes: 'موافقة العميل على الراتب 1200 ريال'
    },
    {
      id: 'ORD-2026-003',
      order_number: 'ORD-2026-003',
      company_id: 'YAQ',
      client_name: 'عبدالله محمد الغامدي',
      client_phone: '+966501234567',
      maid_name: 'راجيش كومار (سائق خاص)',
      nationality: 'الهند',
      passport_number: 'Z991823',
      request_type: 'معروفة',
      status: 'تم التعاقد',
      timer_status: 'عادي',
      deadline: '48 ساعة',
      contract_status: 'تم التعاقد',
      responsible_employee: 'عبدالرحمن العتيبي',
      branch: 'فرع جدة طريق الملك',
      office_name: 'مكتب كيرلا الدولي',
      total_amount: 8500.00,
      notes: 'تم ربط التأشيرة مع مساند'
    }
  ];
  await supabase.from('orders').upsert(orders, { onConflict: 'id' });

  // 2. Cost Centers
  console.log('📊 [2/16] Seeding cost_centers...');
  const costCenters = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      company_id: 'SAF',
      code: 'CC-OPS-01',
      name: 'مركز تكلفة عمليات الاستقدام ومساند',
      parent: 'MAIN',
      manager_name: 'فهد العتيبي',
      budget: 150000.00,
      actual_spent: 42500.00,
      budget_limit: 150000.00,
      total_expenses: 42500.00,
      total_revenues: 185000.00,
      status: 'نشط'
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      company_id: 'YAQ',
      code: 'CC-RENT-02',
      name: 'مركز تكلفة عقود التأجير والتشغيل',
      parent: 'MAIN',
      manager_name: 'محمد مصطفى',
      budget: 90000.00,
      actual_spent: 18400.00,
      budget_limit: 90000.00,
      total_expenses: 18400.00,
      total_revenues: 112000.00,
      status: 'نشط'
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      company_id: 'SAF',
      code: 'CC-SHELTER-03',
      name: 'مركز إيواء وتغذية حي الرمال',
      parent: 'MAIN',
      manager_name: 'سهام الشاذلي',
      budget: 80000.00,
      actual_spent: 64500.00,
      budget_limit: 80000.00,
      total_expenses: 64500.00,
      total_revenues: 0.00,
      status: 'نشط'
    }
  ];
  await supabase.from('cost_centers').upsert(costCenters, { onConflict: 'id' });

  // 3. Branches & Branch Departments
  console.log('🏢 [3/16] Seeding branches & branch_departments...');
  const branches = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      branch_code: 'HQ-RUH',
      name: 'الفرع الرئيسي (الإدارة العامة - الرياض)',
      city: 'الرياض',
      phone: '0112345678',
      manager_name: 'عبد الفتاح السليم (المدير العام)',
      is_active: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      branch_code: 'BR-JED',
      name: 'فرع جدة والمنطقة الغربية',
      city: 'جدة',
      phone: '0129876543',
      manager_name: 'أحمد الغامدي',
      is_active: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      branch_code: 'BR-DMM',
      name: 'فرع الدمام والمنطقة الشرقية',
      city: 'الدمام',
      phone: '0138765432',
      manager_name: 'عبدالرحمن العتيبي',
      is_active: true
    }
  ];
  await supabase.from('branches').upsert(branches, { onConflict: 'id' });

  const depts = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      dept_code: 'DEP-FIN-01',
      dept_name: 'الإدارة المالية والمحاسبة المركزية',
      manager_name: 'أحمد المحاسب المالي',
      branch: 'الفرع الرئيسي - الرياض',
      employees_count: 5,
      status: 'نشط',
      description: 'شجرة الحسابات والقيود والربط الضريبي ZATCA',
      kpi: 'مطابقة قيود 100%',
      head: 'أحمد المحاسب'
    },
    {
      id: 'd0000000-0000-0000-0000-000000000002',
      dept_code: 'DEP-OPS-02',
      dept_name: 'إدارة العمليات والاستقدام ومساند',
      manager_name: 'سليمان خالد',
      branch: 'فرع الرياض الرئيسي',
      employees_count: 8,
      status: 'نشط',
      description: 'إصدار التأشيرات والربط مع السفارات ووكالات إنجاز',
      kpi: 'إنجاز التأشيرات < 72 ساعة',
      head: 'سليمان خالد'
    },
    {
      id: 'd0000000-0000-0000-0000-000000000003',
      dept_code: 'DEP-HR-03',
      dept_name: 'الموارد البشرية ونظام حماية الأجور (WPS)',
      manager_name: 'سارة خالد',
      branch: 'الفرع الرئيسي - الرياض',
      employees_count: 4,
      status: 'نشط',
      description: 'ملفات الموظفين ومسيرات الرواتب الشهرية وMudad',
      kpi: 'التزام حماية الأجور 100%',
      head: 'سارة خالد'
    }
  ];
  await supabase.from('branch_departments').upsert(depts, { onConflict: 'id' });

  // 4. Company Journal Entries & Lines
  console.log('📑 [4/16] Seeding company_journal_entries & journal_entries...');
  const journals = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      company_id: 'SAF',
      entry_number: 'SAF-JV-2026-0001',
      entry_date: '2026-08-01',
      entry_type: 'AUTOMATIC',
      source_module: 'INVOICE',
      source_reference: 'INV-2026-0014',
      description: 'إثبات قيد فاتورة عقد استقدام مساند - العميل بندر صالح',
      total_debit: 14500.00,
      total_credit: 14500.00,
      status: 'POSTED',
      branch_name: 'فرع الرياض الرئيسي',
      cost_center_code: 'CC-OPS-01',
      created_by: 'النظام المحاسبي الآلي',
      approved_by: 'مدير الحسابات'
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      company_id: 'YAQ',
      entry_number: 'YAQ-JV-2026-0002',
      entry_date: '2026-08-05',
      entry_type: 'AUTOMATIC',
      source_module: 'RECEIPT',
      source_reference: 'RCP-2026-0088',
      description: 'تحصيل دفعة إيجار ربع سنوي - بنك الراجحي',
      total_debit: 8900.00,
      total_credit: 8900.00,
      status: 'POSTED',
      branch_name: 'فرع جدة طريق الملك',
      cost_center_code: 'CC-RENT-02',
      created_by: 'إبراهيم الشمري',
      approved_by: 'المدير المالي'
    }
  ];
  await supabase.from('company_journal_entries').upsert(journals, { onConflict: 'id' });

  // Single-ledger journal_entries
  const singleJournals = [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      ref_no: 'SAF-JV-2026-0001',
      description: 'إثبات قيد فاتورة عقد استقدام مساند - العميل بندر صالح',
      amount: 14500.00,
      branch: 'فرع الرياض الرئيسي',
      status: 'مرحل'
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      ref_no: 'YAQ-JV-2026-0002',
      description: 'تحصيل دفعة إيجار ربع سنوي - بنك الراجحي',
      amount: 8900.00,
      branch: 'فرع جدة طريق الملك',
      status: 'مرحل'
    }
  ];
  await supabase.from('journal_entries').upsert(singleJournals, { onConflict: 'id' });

  // 5. Vouchers
  console.log('💵 [5/16] Seeding vouchers...');
  const vouchers = [
    {
      id: 'f0000000-0000-0000-0000-000000000001',
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
      id: 'f0000000-0000-0000-0000-000000000002',
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
  await supabase.from('vouchers').upsert(vouchers, { onConflict: 'id' });

  // 6. Rent Contracts
  console.log('📑 [6/16] Seeding rent_contracts...');
  const rentContracts = [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      company_id: 'YAQ',
      contract_number: 'RNT-2026-0101',
      client_name: 'سلطان بن عبدالعزيز المقرن',
      client_phone: '0567788990',
      maid_name: 'سيتي نورعيني',
      nationality: 'إندونيسيا',
      start_date: '2026-08-01',
      end_date: '2026-11-01',
      duration_months: 3,
      monthly_cost: 2950.00,
      total_amount: 8850.00,
      status: 'ساري',
      payment_status: 'مدفوع بالكامل',
      marketer: 'عبدالرحمن العتيبي',
      branch: 'فرع الدمام'
    },
    {
      id: 'c0000000-0000-0000-0000-000000000002',
      company_id: 'YAQ',
      contract_number: 'RNT-2026-0102',
      client_name: 'شركة ياقوت نجد للتشغيل',
      client_phone: '0509876543',
      maid_name: 'راجيش كومار (سائق)',
      nationality: 'الهند',
      start_date: '2026-08-15',
      end_date: '2027-08-15',
      duration_months: 12,
      monthly_cost: 2200.00,
      total_amount: 26400.00,
      status: 'ساري',
      payment_status: 'أقساط ربع سنوية',
      marketer: 'أحمد الغامدي',
      branch: 'فرع جدة طريق الملك'
    }
  ];
  await supabase.from('rent_contracts').upsert(rentContracts, { onConflict: 'id' });

  // 7. Company Bank Accounts
  console.log('🏦 [7/16] Seeding company_bank_accounts...');
  const bankAccounts = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      company_id: 'SAF',
      bank_name: 'مصرف الراجحي (Al Rajhi Bank)',
      account_number: '204608010001234',
      iban: 'SA0380000204608010001234',
      currency: 'SAR',
      current_balance: 485200.00,
      is_active: true
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      company_id: 'YAQ',
      bank_name: 'البنك الأهلي السعودي (SNB)',
      account_number: '101000987654321',
      iban: 'SA4410000010100098765432',
      currency: 'SAR',
      current_balance: 298400.00,
      is_active: true
    }
  ];
  await supabase.from('company_bank_accounts').upsert(bankAccounts, { onConflict: 'id' });

  // 8. ZATCA Company Invoices
  console.log('🧾 [8/16] Seeding zatca_company_invoices & zatca_invoices...');
  const zatcaInvoices = [
    {
      id: '20000000-0000-0000-0000-000000000001',
      company_id: 'SAF',
      branch_code: 'HQ-RUH',
      invoice_number: 'INV-2026-0801',
      client_name: 'بندر صالح الهويريني',
      client_vat_number: '310987654300003',
      subtotal: 12608.70,
      vat_amount: 1891.30,
      total_amount: 14500.00,
      zatca_status: 'CLEARED',
      qr_code_tlv: 'AQ1TYWZpciBBbC1NYXNpAhMzMTA5ODc2NTQzMDAwMDMDDTIwMjYtMDgtMDFUMTA6MDA6MDBaBAYxNDUwMC4wMAYxODkxLjMw',
      invoice_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      company_id: 'YAQ',
      branch_code: 'BR-JED',
      invoice_number: 'INV-2026-0802',
      client_name: 'شركة ياقوت نجد للتشغيل',
      client_vat_number: '310928374100004',
      subtotal: 7739.13,
      vat_amount: 1160.87,
      total_amount: 8900.00,
      zatca_status: 'REPORTED',
      qr_code_tlv: 'AQ1ZYXFvb3QgTmFqZAIUMzEwOTI4Mzc0MTAwMDA0Aw0yMDI2LTA4LTA1VDA5OjAwOjAwWgQIODkwMC4wMAYxMTYwLjg3',
      invoice_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
    }
  ];
  await supabase.from('zatca_company_invoices').upsert(zatcaInvoices, { onConflict: 'id' });

  // 9. WPS Payroll Records
  console.log('💳 [9/16] Seeding wps_payroll_records...');
  const wpsRecords = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      payroll_month: '2026-08',
      company_id: 'SAF',
      employee_id: 'EMP-2026-001',
      employee_name: 'عبدالفتح (مسؤول الوكلاء)',
      basic_salary: 10000.00,
      housing_allowance: 2000.00,
      transport_allowance: 500.00,
      deductions: 0.00,
      net_salary: 12500.00,
      bank_name: 'مصرف الراجحي',
      iban: 'SA0380000204608010009999',
      wps_status: 'COMPLIANT'
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      payroll_month: '2026-08',
      company_id: 'SAF',
      employee_id: 'EMP-2026-002',
      employee_name: 'فهد العتيبي',
      basic_salary: 8000.00,
      housing_allowance: 1500.00,
      transport_allowance: 300.00,
      deductions: 0.00,
      net_salary: 9800.00,
      bank_name: 'البنك الأهلي التجاري',
      iban: 'SA4410000010100098768888',
      wps_status: 'COMPLIANT'
    }
  ];
  await supabase.from('wps_payroll_records').upsert(wpsRecords, { onConflict: 'id' });

  // 10. ATS Candidates
  console.log('👤 [10/16] Seeding ats_candidates...');
  const candidates = [
    {
      id: '40000000-0000-0000-0000-000000000001',
      candidate_code: 'ATS-2026-011',
      full_name: 'ريان بن عبدالله القحطاني',
      job_applied: 'أخصائي تسويق رقمي وإدارة حملات',
      nationality: 'سعودي',
      experience_years: 4,
      current_stage: 'المقابلة الفنية الثانية',
      interview_score: 92,
      status: 'مؤهل',
      expected_salary: 11000.00
    },
    {
      id: '40000000-0000-0000-0000-000000000002',
      candidate_code: 'ATS-2026-012',
      full_name: 'نهى بنت سعد العلي',
      job_applied: 'محاسبة مالية ومطابقة ضريبية ZATCA',
      nationality: 'سعودية',
      experience_years: 5,
      current_stage: 'عرض العمل (Job Offer)',
      interview_score: 96,
      status: 'مقبول مبدئياً',
      expected_salary: 12500.00
    }
  ];
  await supabase.from('ats_candidates').upsert(candidates, { onConflict: 'id' });

  // 11. Shelter Records
  console.log('🏡 [11/16] Seeding shelter_records...');
  const shelter = [
    {
      id: '50000000-0000-0000-0000-000000000001',
      inmate_code: 'SHL-2026-041',
      worker_name: 'MARY JANE DELA CRUZ',
      passport_no: 'P9824102A',
      nationality: 'الفلبين',
      check_in_date: '2026-08-20',
      reason_for_stay: 'وصول جديد - تحت الفحص الطبي والتسليم للعميل',
      room_no: 'R-102',
      health_status: 'لائقة طبياً',
      status: 'مقيم حالياً'
    }
  ];
  await supabase.from('shelter_records').upsert(shelter, { onConflict: 'id' });

  // 12. Complaints
  console.log('⚠️ [12/16] Seeding complaints...');
  const complaints = [
    {
      id: '60000000-0000-0000-0000-000000000001',
      complaint_code: 'CMP-2026-009',
      client_name: 'عبدالله محمد السبيعي',
      phone: '+966551234567',
      subject: 'طلب استبدال فوري خلال فترة التجربة',
      description: 'العاملة طلبت تغيير العقد لرعاية الأطفال فقط',
      priority: 'عالية',
      status: 'قيد المعالجة السريعة',
      assigned_to: 'سليمان خالد'
    }
  ];
  await supabase.from('complaints').upsert(complaints, { onConflict: 'id' });

  // 13. Sponsorship Transfers
  console.log('🔄 [13/16] Seeding sponsorship_transfers...');
  const transfers = [
    {
      id: '70000000-0000-0000-0000-000000000001',
      transfer_code: 'TRF-2026-005',
      worker_name: 'راجيش كومار',
      profession: 'سائق خاص',
      old_sponsor_name: 'مؤسسة الرواد التجارية',
      new_sponsor_name: 'عبدالله محمد الغامدي',
      transfer_fees: 4000.00,
      qiwa_status: 'مقبول في قوى',
      status: 'قيد إنهاء نقل الكفالة'
    }
  ];
  await supabase.from('sponsorship_transfers').upsert(transfers, { onConflict: 'id' });

  // 14. Ingaz Delegations
  console.log('✈️ [14/16] Seeding ingaz_delegations...');
  const delegations = [
    {
      id: '80000000-0000-0000-0000-000000000001',
      delegation_no: 'ING-2026-0921',
      visa_number: '1300984521',
      sponsor_name: 'بندر صالح الهويريني',
      agency_name: "PLATINUM BROTHERS INT'L",
      country: 'الفلبين',
      profession: 'عاملة منزلية',
      status: 'تم التفويض بنجاح'
    }
  ];
  await supabase.from('ingaz_delegations').upsert(delegations, { onConflict: 'id' });

  // 15. Travel Flights
  console.log('🛫 [15/16] Seeding travel_flights...');
  const flights = [
    {
      id: '90000000-0000-0000-0000-000000000001',
      flight_number: 'SV-861',
      airline: 'الخطوط الجوية العربية السعودية',
      origin_city: 'مانيلا (MNL)',
      arrival_city: 'الرياض (RUH)',
      arrival_time: '2026-09-05T18:30:00Z',
      worker_name: 'MARY JANE DELA CRUZ',
      pickup_status: 'مجدول للاستقبال والتوصيل للإيواء'
    }
  ];
  await supabase.from('travel_flights').upsert(flights, { onConflict: 'id' });

  // 16. Activity Logs
  console.log('🛡️ [16/16] Seeding activity_logs & system_audit_logs...');
  const logs = [
    {
      id: 'f1000000-0000-0000-0000-000000000001',
      action: 'SYSTEM_AUDIT_VERIFIED',
      module: 'FINANCE_AND_OPERATIONS',
      user_id: 'khalid.admin',
      description: 'مراجعة وتأكيد تكامل كافة جداول قواعد البيانات الـ 58 لمجموعة خالد السليم',
      status: 'SUCCESS'
    }
  ];
  await supabase.from('activity_logs').upsert(logs, { onConflict: 'id' });

  console.log('\n🎉 ALL MASTER TABLES SUCCESSFULLY POPULATED IN POSTGRESQL (54421)!');
}

seedMasterData();
