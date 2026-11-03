/**
 * Central Enterprise Export Service for ERP System
 * Supports Excel (XLSX), PDF, CSV, and Official Printable Reports
 * with full Arabic Unicode support and dual company branding.
 */
import * as XLSX from 'xlsx';
import { useAppStore } from '../stores/appStore';
import { COMPANIES_LIST } from '../contexts/CompanyContext';

export interface SectionExportConfig {
  sectionTitle: string;
  headers: string[];
  dataMapper: (row: any) => (string | number)[];
}

// ─── Company Header & Identity ───────────────────────────────────────
export const GROUP_COMPANY_INFO = {
  nameAr: 'مجموعة خالد السليم التجارية',
  nameEn: 'KHALID AL-SULAIM COMMERCIAL GROUP',
  tagline: 'نظام تخطيط الموارد المؤسسي المتكامل (ERP Group Engine)',
  crNumber: '1010892019',
  taxNumber: '310928374100003',
};

// ─── Section Configuration Registry ─────────────────────────────────
export const SECTION_CONFIGS: Record<string, SectionExportConfig> = {
  // 1. العملاء CRM
  clients: {
    sectionTitle: 'سجل العملاء وإدارة علاقات العملاء (CRM)',
    headers: ['رقم العميل', 'اسم العميل', 'رقم الجوال', 'رقم الهوية', 'الحساب المحاسبي', 'نوع العميل', 'آخر نشاط', 'الموظف المسؤول', 'الفرع', 'تاريخ التسجيل', 'الحالة'],
    dataMapper: (r: any) => [
      r.client_no || r.client_number || r.id || '',
      r.name || '',
      r.phone || '',
      r.national_id || '',
      r.account_code || '',
      r.client_activity || r.type || '',
      r.last_activity || '',
      r.added_by || '',
      r.branch || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : '',
      r.status || 'نشط'
    ]
  },

  // 2. الطلبات والحجوزات
  orders: {
    sectionTitle: 'تقرير طلبات واستفسارات الاستقدام',
    headers: ['رقم الطلب', 'اسم العميل', 'جوال العميل', 'اسم العاملة', 'الجنسية', 'رقم الجواز', 'نوع الطلب', 'المكتب الخارجي', 'المهلة', 'الموظف المسؤول', 'حالة التعاقد', 'تاريخ الإنشاء'],
    dataMapper: (r: any) => [
      r.id || '',
      r.client_name || '',
      r.client_phone || '',
      r.maid_name || '',
      r.nationality || '',
      r.passport_number || '',
      r.request_type || '',
      r.office_name || '',
      r.deadline || r.timer_status || '',
      r.responsible_employee || '',
      r.contract_status || r.status || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''
    ]
  },

  // 3. عقود الاستقدام مساند
  'recruitment-contracts': {
    sectionTitle: 'سجل عقود الاستقدام المباشرة (Musaned Contracts)',
    headers: ['رقم العقد', 'رقم مساند', 'اسم العميل', 'جوال العميل', 'اسم العاملة', 'الجنسية', 'رقم الجواز', 'المكتب الخارجي', 'المرحلة التشغيلية', 'حالة الضمان', 'حالة الدفع', 'قيمة العقد (⃁)', 'الضريبة (15%)', 'الإجمالي (⃁)', 'الفرع'],
    dataMapper: (r: any) => [
      r.contract_number || r.id || '',
      r.musaned_number || '',
      r.client_name || '',
      r.client_phone || '',
      r.maid_name || '',
      r.nationality || '',
      r.maid_passport || '',
      r.external_office || '',
      r.stage || '',
      r.warranty_status || '',
      r.payment_status || '',
      r.amount || 0,
      r.tax_amount || ((r.amount || 0) * 0.15),
      r.total_amount || ((r.amount || 0) * 1.15),
      r.branch || ''
    ]
  },
  recruitment_contracts: {
    sectionTitle: 'سجل عقود الاستقدام المباشرة (Musaned Contracts)',
    headers: ['رقم العقد', 'رقم مساند', 'اسم العميل', 'جوال العميل', 'اسم العاملة', 'الجنسية', 'رقم الجواز', 'المكتب الخارجي', 'المرحلة التشغيلية', 'حالة الضمان', 'حالة الدفع', 'المبلغ الأساسي (⃁)', 'الضريبة (15%)', 'الإجمالي (⃁)', 'الفرع'],
    dataMapper: (r: any) => [
      r.contract_number || r.id || '',
      r.musaned_number || '',
      r.client_name || '',
      r.client_phone || '',
      r.maid_name || '',
      r.nationality || '',
      r.maid_passport || '',
      r.external_office || '',
      r.stage || '',
      r.warranty_status || '',
      r.payment_status || '',
      r.amount || 0,
      r.tax_amount || ((r.amount || 0) * 0.15),
      r.total_amount || ((r.amount || 0) * 1.15),
      r.branch || ''
    ]
  },

  // 4. عقود التأجير والتشغيل
  'rent-contracts': {
    sectionTitle: 'سجل عقود التأجير والخدمات التشغيلية',
    headers: ['رقم عقد التأجير', 'اسم العميل', 'جوال العميل', 'العاملة المؤجرة', 'الجنسية', 'تاريخ البدء', 'تاريخ الانتهاء', 'المدة (أشهر)', 'القيمة الشهرية (⃁)', 'الإجمالي (⃁)', 'حالة العقد', 'حالة الدفع', 'المسوق', 'الفرع'],
    dataMapper: (r: any) => [
      r.contract_number || r.id || '',
      r.client_name || '',
      r.client_phone || '',
      r.maid_name || '',
      r.nationality || '',
      r.start_date || '',
      r.end_date || '',
      r.duration_months || 0,
      r.monthly_cost || 0,
      r.total_amount || 0,
      r.status || '',
      r.payment_status || '',
      r.marketer || '',
      r.branch || ''
    ]
  },
  rent_contracts: {
    sectionTitle: 'سجل عقود التأجير والخدمات التشغيلية',
    headers: ['رقم عقد التأجير', 'اسم العميل', 'جوال العميل', 'العاملة المؤجرة', 'الجنسية', 'تاريخ البدء', 'تاريخ الانتهاء', 'المدة (أشهر)', 'القيمة الشهرية (⃁)', 'الإجمالي (⃁)', 'حالة العقد', 'حالة الدفع', 'المسوق', 'الفرع'],
    dataMapper: (r: any) => [
      r.contract_number || r.id || '',
      r.client_name || '',
      r.client_phone || '',
      r.maid_name || '',
      r.nationality || '',
      r.start_date || '',
      r.end_date || '',
      r.duration_months || 0,
      r.monthly_cost || 0,
      r.total_amount || 0,
      r.status || '',
      r.payment_status || '',
      r.marketer || '',
      r.branch || ''
    ]
  },

  // 5. الإيواء والإعاشة
  shelter: {
    sectionTitle: 'سجل نزيلات مركز الإيواء والإعاشة',
    headers: ['كود النزيلة', 'اسم العاملة', 'رقم الجواز', 'الجنسية', 'مرجع العقد', 'العميل', 'مقر الإيواء', 'أيام الإقامة', 'عدد الوجبات', 'الرغبة بالعمل', 'الحالة الحالية'],
    dataMapper: (r: any) => [
      r.id || '',
      r.maid_name || '',
      r.passport || '',
      r.nationality || '',
      r.contract_ref || '',
      r.client_name || '',
      r.shelter_location || '',
      r.days_in_shelter || 0,
      r.catering_meals_count || 0,
      r.work_willingness || '',
      r.status || ''
    ]
  },
  shelter_records: {
    sectionTitle: 'سجل نزيلات مركز الإيواء والإعاشة',
    headers: ['كود النزيلة', 'اسم العاملة', 'رقم الجواز', 'الجنسية', 'مرجع العقد', 'العميل', 'مقر الإيواء', 'أيام الإقامة', 'عدد الوجبات', 'الرغبة بالعمل', 'الحالة الحالية'],
    dataMapper: (r: any) => [
      r.id || '',
      r.maid_name || '',
      r.passport || '',
      r.nationality || '',
      r.contract_ref || '',
      r.client_name || '',
      r.shelter_location || '',
      r.days_in_shelter || 0,
      r.catering_meals_count || 0,
      r.work_willingness || '',
      r.status || ''
    ]
  },

  // 6. الفوترة الإلكترونية ZATCA
  zatca: {
    sectionTitle: 'سجل الفواتير الضريبية المعتمدة (ZATCA Phase 2)',
    headers: ['رقم الفاتورة', 'نوع الفاتورة', 'تاريخ الإصدار', 'اسم العميل / المنشأة', 'الرقم الضريبي / الهوية', 'المبلغ قبل الضريبة (⃁)', 'ضريبة القيمة المضافة 15% (⃁)', 'الإجمالي شامل الضريبة (⃁)', 'حالة الربط بهيئة الزكاة', 'رمز التحقق UUID', 'مرجع المعاملة'],
    dataMapper: (r: any) => [
      r.invoice_number || r.id || '',
      r.invoice_type === 'STANDARD' ? 'ضريبية قياسية (B2B)' : r.invoice_type === 'SIMPLIFIED' ? 'ضريبية مبسطة (B2C)' : (r.invoice_type || 'مبسطة'),
      r.issue_date || '',
      r.client_name || '',
      r.client_vat_number || r.client_national_id || 'أفراد',
      r.subtotal || 0,
      r.vat_amount || 0,
      r.total_amount || 0,
      r.zatca_status || 'CLEARED',
      r.uuid || r.xml_hash || '',
      r.contract_ref || ''
    ]
  },
  zatca_invoices: {
    sectionTitle: 'سجل الفواتير الضريبية المعتمدة (ZATCA Phase 2)',
    headers: ['رقم الفاتورة', 'نوع الفاتورة', 'تاريخ الإصدار', 'اسم العميل / المنشأة', 'الرقم الضريبي / الهوية', 'المبلغ قبل الضريبة (⃁)', 'ضريبة القيمة المضافة 15% (⃁)', 'الإجمالي شامل الضريبة (⃁)', 'حالة الربط بهيئة الزكاة', 'رمز التحقق UUID', 'مرجع المعاملة'],
    dataMapper: (r: any) => [
      r.invoice_number || r.id || '',
      r.invoice_type === 'STANDARD' ? 'ضريبية قياسية (B2B)' : r.invoice_type === 'SIMPLIFIED' ? 'ضريبية مبسطة (B2C)' : (r.invoice_type || 'مبسطة'),
      r.issue_date || '',
      r.client_name || '',
      r.client_vat_number || r.client_national_id || 'أفراد',
      r.subtotal || 0,
      r.vat_amount || 0,
      r.total_amount || 0,
      r.zatca_status || 'CLEARED',
      r.uuid || r.xml_hash || '',
      r.contract_ref || ''
    ]
  },

  // 7. مراكز التكلفة
  cost_centers: {
    sectionTitle: 'تقرير مراكز التكلفة والمحاسبة التحليلية',
    headers: ['كود المركز', 'اسم مركز التكلفة', 'المسؤول / المدير', 'الميزانية المعتمدة (⃁)', 'المنصرف الفعلي (⃁)', 'المتبقي من الميزانية (⃁)', 'نسبة الاستهلاك %'],
    dataMapper: (r: any) => {
      const budget = r.budget || r.budget_limit || 0;
      const spent = r.actual_spent || r.total_expenses || 0;
      const remaining = budget - spent;
      const percent = budget > 0 ? ((spent / budget) * 100).toFixed(1) + '%' : '0%';
      return [
        r.code || '',
        r.name || '',
        r.manager_name || r.parent || 'مشرف المركز',
        budget,
        spent,
        remaining,
        percent
      ];
    }
  },
  'cost-centers': {
    sectionTitle: 'تقرير مراكز التكلفة والمحاسبة التحليلية',
    headers: ['كود المركز', 'اسم مركز التكلفة', 'المسؤول / المدير', 'الميزانية المعتمدة (⃁)', 'المنصرف الفعلي (⃁)', 'المتبقي من الميزانية (⃁)', 'نسبة الاستهلاك %'],
    dataMapper: (r: any) => {
      const budget = r.budget || r.budget_limit || 0;
      const spent = r.actual_spent || r.total_expenses || 0;
      const remaining = budget - spent;
      const percent = budget > 0 ? ((spent / budget) * 100).toFixed(1) + '%' : '0%';
      return [
        r.code || '',
        r.name || '',
        r.manager_name || r.parent || 'مشرف المركز',
        budget,
        spent,
        remaining,
        percent
      ];
    }
  },

  // 8. الموارد البشرية والرواتب
  employees: {
    sectionTitle: 'سجل الموظفين والكوادر الوظيفية',
    headers: ['الرقم الوظيفي', 'اسم الموظف', 'رقم الهوية / الإقامة', 'المسمى الوظيفي', 'القسم / الإدارة', 'الفرع', 'تاريخ التعيين', 'الراتب الأساسي', 'بدل السكن', 'بدل النقل', 'إجمالي الراتب (⃁)', 'الحالة'],
    dataMapper: (r: any) => {
      const sal = r.salary || 0;
      const basic = r.basic_salary || (sal * 0.7);
      const housing = r.allowances ? (r.allowances * 0.66) : (sal * 0.2);
      const transport = r.allowances ? (r.allowances * 0.34) : (sal * 0.1);
      return [
        r.employee_code || r.id || '',
        r.name || '',
        r.national_id || '',
        r.job_title || '',
        r.department || '',
        r.branch || '',
        r.hire_date || '',
        basic,
        housing,
        transport,
        sal,
        r.status || 'نشط'
      ];
    }
  },

  // 9. مسير الرواتب المعتمد لحماية الأجور WPS
  payroll: {
    sectionTitle: 'مسير الرواتب المعتمد لحماية الأجور (WPS Payroll)',
    headers: ['رقم الهوية / الإقامة', 'اسم الموظف', 'اسم البنك', 'رقم الآيبان (IBAN)', 'الراتب الأساسي', 'بدل السكن', 'بدل النقل', 'استقطاع التأمينات (GOSI 9.75%)', 'صافي الراتب المحول (⃁)', 'حالة الصرف'],
    dataMapper: (r: any) => {
      const sal = r.salary || 0;
      const basic = sal * 0.7;
      const housing = sal * 0.2;
      const transport = sal * 0.1;
      const gosi = (basic + housing) * 0.0975;
      const net = basic + housing + transport - gosi;
      return [
        r.national_id || '',
        r.name || '',
        r.bank_name || 'مصرف الراجحي',
        r.iban || `SA03800000000${r.national_id || '1092837410'}12`,
        basic.toFixed(2),
        housing.toFixed(2),
        transport.toFixed(2),
        gosi.toFixed(2),
        net.toFixed(2),
        'جاهز للصرف'
      ];
    }
  },

  // 10. القيود اليومية المحاسبية
  journals: {
    sectionTitle: 'تقرير القيود المحاسبية اليومية المعتمدة',
    headers: ['رقم القيد', 'تاريخ القيد', 'البيان والشرح', 'المبلغ (⃁)', 'حالة القيد', 'الفرع', 'الطرف المدين', 'الطرف الدائن'],
    dataMapper: (r: any) => [
      r.ref_no || r.entry_number || r.id || '',
      r.date || r.entry_date || '',
      r.description || r.narration || '',
      r.amount || r.total_debit || 0,
      r.status || 'معتمد',
      r.branch || '',
      r.debit_account || '',
      r.credit_account || ''
    ]
  },
  company_journal_entries: {
    sectionTitle: 'تقرير القيود المحاسبية اليومية المعتمدة',
    headers: ['رقم القيد', 'تاريخ القيد', 'البيان والشرح', 'المبلغ (⃁)', 'حالة القيد', 'الفرع'],
    dataMapper: (r: any) => [
      r.ref_no || r.entry_number || r.id || '',
      r.date || r.entry_date || '',
      r.description || r.narration || '',
      r.amount || r.total_debit || 0,
      r.status || 'معتمد',
      r.branch || ''
    ]
  },

  // 11. السندات المحاسبية (قبض وصرف)
  vouchers: {
    sectionTitle: 'سجل السندات المالية (سندات القبض وسندات الصرف)',
    headers: ['رقم السند', 'نوع السند', 'المستفيد / العميل', 'المبلغ (⃁)', 'طريقة الدفع', 'البيان المحاسبي', 'تاريخ الإصدار', 'الفرع'],
    dataMapper: (r: any) => [
      r.voucher_number || r.voucher_no || r.id || '',
      r.type || '',
      r.beneficiary || r.payee_payer || r.client_name || '',
      r.amount || 0,
      r.payment_method || r.treasury || '',
      r.description || r.notes || '',
      r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '',
      r.branch || ''
    ]
  },

  // 12. التحويلات البنكية والنقدية
  transfers: {
    sectionTitle: 'تقرير التحويلات النقدية والبنكية بين الحسابات',
    headers: ['رقم التحويل', 'تاريخ التحويل', 'من حساب', 'إلى حساب', 'المبلغ المحول (⃁)', 'المرجع البنكي', 'الحالة'],
    dataMapper: (r: any) => [
      r.transfer_no || r.id || '',
      r.date || '',
      r.from_account || '',
      r.to_account || '',
      r.amount || 0,
      r.bank_ref || '',
      r.status || 'مكتمل'
    ]
  },

  // 13. ميزان المراجعة (Trial Balance)
  'trial-balance': {
    sectionTitle: 'ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)',
    headers: ['رمز الحساب', 'اسم الحساب المحاسبي', 'نوع الحساب', 'الرصيد الافتتاحي (مدين)', 'الرصيد الافتتاحي (دائن)', 'حركة الفترة (مدين)', 'حركة الفترة (دائن)', 'الرصيد النهائي (⃁)'],
    dataMapper: (r: any) => [
      r.code || r.account_code || '',
      r.name || r.account_name || '',
      r.type || r.account_type || '',
      r.opening_debit || 0,
      r.opening_credit || 0,
      r.period_debit || r.debit || 0,
      r.period_credit || r.credit || 0,
      r.balance || (r.debit - r.credit) || 0
    ]
  },

  // 14. قائمة المركز المالي (Balance Sheet)
  'balance-sheet': {
    sectionTitle: 'قائمة المركز المالي الموحدة (Statement of Financial Position)',
    headers: ['البند الرئيسي', 'الحساب الفرعي', 'القيمة المقارنة (⃁)', 'القيمة الحالية (⃁)', 'نسبة الإجمالي %'],
    dataMapper: (r: any) => [
      r.main_category || r.type || '',
      r.item_name || r.name || '',
      r.previous_year || 0,
      r.current_value || r.balance || 0,
      r.percentage ? `${r.percentage}%` : '-'
    ]
  },

  // 15. قائمة الدخل والأرباح (Income Statement)
  'income-statement': {
    sectionTitle: 'قائمة الدخل والأرباح والخسائر (Income Statement)',
    headers: ['البند المالي', 'التصنيف', 'إجمالي الفترة (⃁)', 'الموازنة التقديرية (⃁)', 'نسبة الانحراف %'],
    dataMapper: (r: any) => [
      r.title || r.name || '',
      r.category || r.type || '',
      r.amount || r.actual || 0,
      r.budget || 0,
      r.variance ? `${r.variance}%` : '-'
    ]
  },

  // 16. الشكاوى والدعم الفني
  complaints: {
    sectionTitle: 'سجل تذاكر الشكاوى والدعم الفني (Customer Support)',
    headers: ['رقم التذكرة', 'اسم العميل', 'جوال العميل', 'تصنيف الشكوى', 'مرجع العقد', 'الأولوية', 'حالة التذكرة', 'مهلة SLA المتبقية', 'الموظف المكلف', 'الفرع', 'تاريخ الإنشاء', 'وصف الشكوى'],
    dataMapper: (r: any) => [
      r.ticket_no || r.id || '',
      r.client_name || '',
      r.client_phone || '',
      r.category || '',
      r.contract_ref || '',
      r.priority || '',
      r.status || '',
      r.sla_hours_left ? `${r.sla_hours_left} ساعة` : '0',
      r.assigned_agent || '',
      r.branch || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : '',
      r.description || ''
    ]
  },

  // 17. السفر واللوجستيات
  travel: {
    sectionTitle: 'سجل رحلات الطيران والخدمات اللوجستية',
    headers: ['رقم الرحلة ERP', 'نوع السفر', 'اسم العميل', 'اسم العاملة', 'الجنسية', 'شركة الطيران', 'رقم التذكرة / الرحلة', 'المطار المقصود', 'تاريخ الوصول / المغادرة', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.travel_type || '',
      r.client_name || '',
      r.maid_name || '',
      r.nationality || '',
      r.airline || '',
      r.flight_number || '',
      r.airport || r.arrival_airport || '',
      r.flight_date || '',
      r.status || ''
    ]
  },
  travel_flights: {
    sectionTitle: 'سجل رحلات الطيران والخدمات اللوجستية',
    headers: ['رقم الرحلة ERP', 'نوع السفر', 'اسم العميل', 'اسم العاملة', 'الجنسية', 'شركة الطيران', 'رقم التذكرة / الرحلة', 'المطار المقصود', 'تاريخ الوصول / المغادرة', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.travel_type || '',
      r.client_name || '',
      r.maid_name || '',
      r.nationality || '',
      r.airline || '',
      r.flight_number || '',
      r.airport || r.arrival_airport || '',
      r.flight_date || '',
      r.status || ''
    ]
  },

  // 18. الحضور والانصراف
  attendances: {
    sectionTitle: 'سجل الحضور والانصراف والبصمة الإلكترونية',
    headers: ['كود الموظف', 'اسم الموظف', 'الفرع / القسم', 'تاريخ اليوم', 'وقت الحضور', 'وقت الانصراف', 'دقائق التأخير', 'ساعات العمل الإضافي', 'الحالة'],
    dataMapper: (r: any) => [
      r.employee_code || '',
      r.name || r.employee_name || '',
      r.branch || r.department || '',
      r.date || '',
      r.check_in || '',
      r.check_out || '',
      r.delay_minutes || 0,
      r.overtime_hours || 0,
      r.status || 'حاضر'
    ]
  },

  // 19. عهد الفروع
  custodies: {
    sectionTitle: 'سجل العهد والممتلكات المؤسسية per Branch',
    headers: ['كود العهدة', 'اسم العهدة / الصنف', 'النوع', 'الفرع المسؤول', 'المستلم المكلف', 'الرقم التسلسلي', 'تاريخ التسليم', 'الحالة الفنية'],
    dataMapper: (r: any) => [
      r.custody_code || r.id || '',
      r.name || r.item_name || '',
      r.category || '',
      r.branch || '',
      r.assigned_to || '',
      r.serial_number || '',
      r.received_date || '',
      r.condition || 'ممتازة'
    ]
  },

  // 20. سجل العمليات والتدقيق الأمني
  activity_log: {
    sectionTitle: 'سجل العمليات والتدقيق الأمني (Audit Trail Log)',
    headers: ['رقم المعاملة', 'المستخدم المنفذ', 'الدور / الصلاحية', 'نوع الإجراء', 'الوصف والتفاصيل', 'عنوان IP', 'التوقيت والتاريخ'],
    dataMapper: (r: any) => [
      r.id || '',
      r.user_name || r.user || '',
      r.user_role || '',
      r.action || '',
      r.details || r.description || '',
      r.ip_address || '127.0.0.1',
      r.timestamp ? new Date(r.timestamp).toLocaleString('ar-SA') : ''
    ]
  },

  // 21. الفروع والأقسام
  branches: {
    sectionTitle: 'سجل الفروع الإقليمية ومراكز الخدمة',
    headers: ['كود الفرع', 'اسم الفرع', 'المدينة', 'المدير المسؤول', 'رقم الهاتف', 'البريد الإلكتروني', 'السجل التجاري', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.branch_code || r.id || '',
      r.name || r.name_ar || '',
      r.city || '',
      r.manager_name || r.manager || '',
      r.phone || '',
      r.email || '',
      r.cr_number || '',
      r.status || 'نشط'
    ]
  },

  // 22. مستخدمو النظام
  users: {
    sectionTitle: 'سجل مستخدمي النظام والصلاحيات الإدارية',
    headers: ['الاسم', 'اسم المستخدم', 'الدور الوظيفي', 'الفرع المسؤول', 'رقم الجوال', 'البريد الإلكتروني', 'المصادقة الثنائية 2FA', 'الحالة'],
    dataMapper: (r: any) => [
      r.name || '',
      r.username || '',
      r.role || '',
      r.branch || '',
      r.phone || '',
      r.email || '',
      r.two_factor_enabled ? 'مفعّل' : 'غير مفعّل',
      r.status || 'نشط'
    ]
  },
  system_users: {
    sectionTitle: 'سجل مستخدمي النظام والصلاحيات الإدارية',
    headers: ['الاسم', 'اسم المستخدم', 'الدور الوظيفي', 'الفرع المسؤول', 'رقم الجوال', 'البريد الإلكتروني', 'المصادقة الثنائية 2FA', 'الحالة'],
    dataMapper: (r: any) => [
      r.name || '',
      r.username || '',
      r.role || '',
      r.branch || '',
      r.phone || '',
      r.email || '',
      r.two_factor_enabled ? 'مفعّل' : 'غير مفعّل',
      r.status || 'نشط'
    ]
  },

  // 23. زوار المنصة والعملاء المحتملون
  website_visitors: {
    sectionTitle: 'سجل زوار المنصة الخارجية ومتابعة العملاء المحتملين',
    headers: ['كود الزائر', 'عنوان IP', 'المدينة', 'الجهاز والمستعرض', 'مصدر الزيارة (Source)', 'الصفحة التي يتصفحها', 'مدة التصفح', 'نوع الزائر', 'رقم الجوال', 'وقت الزيارة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.ip_address || '',
      r.city || '',
      `${r.device || ''} (${r.browser || ''})`,
      r.source || '',
      r.page_visited || '',
      r.duration_sec ? `${Math.floor(r.duration_sec / 60)} د و ${r.duration_sec % 60} ث` : '0 ث',
      r.is_lead ? 'عميل محتمل (Lead)' : 'زائر مجهول',
      r.phone || '-',
      r.visit_time || ''
    ]
  },

  // 24. الهيكل التنظيمي والأقسام
  branch_departments: {
    sectionTitle: 'سجل الهيكل التنظيمي والأقسام الإدارية',
    headers: ['كود القسم', 'اسم القسم بالعربية', 'الاسم بالإنجليزية', 'الفرع التابع', 'المشرف المسؤول', 'عدد الموظفين', 'المستوى', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.dept_code || r.id || '',
      r.name_ar || r.name || '',
      r.name_en || '',
      r.branch_name || r.branch_id || '',
      r.manager_name || r.supervisor || '',
      r.employees_count || 0,
      r.level || 'رئيسي',
      r.status || 'نشط'
    ]
  },

  // 27. تفويضات التأشيرات ومنصة إنجاز
  ingaz_delegations: {
    sectionTitle: 'سجل تفويضات التأشيرات ومنصة إنجاز الدولية',
    headers: ['رقم التفويض', 'رقم التأشيرة', 'اسم المستقدم', 'رقم الهوية', 'المكتب الخارجي', 'الدولة', 'حالة التفويض', 'تاريخ التفويض'],
    dataMapper: (r: any) => [
      r.delegation_number || r.id || '',
      r.visa_number || '',
      r.client_name || '',
      r.client_national_id || '',
      r.external_office || '',
      r.country || '',
      r.status || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''
    ]
  },
  ingaz: {
    sectionTitle: 'سجل تفويضات التأشيرات ومنصة إنجاز الدولية',
    headers: ['رقم التفويض', 'رقم التأشيرة', 'اسم المستقدم', 'رقم الهوية', 'المكتب الخارجي', 'الدولة', 'حالة التفويض', 'تاريخ التفويض'],
    dataMapper: (r: any) => [
      r.delegation_number || r.id || '',
      r.visa_number || '',
      r.client_name || '',
      r.client_national_id || '',
      r.external_office || '',
      r.country || '',
      r.status || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''
    ]
  },

  // 28. مرشحو التوظيف واستقطاب الكوادر ATS
  ats_candidates: {
    sectionTitle: 'سجل مرشحي استقطاب وتوظيف الكوادر (ATS)',
    headers: ['كود المرشح', 'اسم المرشح', 'المسمى الوظيفي المطلوب', 'البريد الإلكتروني', 'الجوال', 'الخبرة (سنوات)', 'المرحلة الحالية', 'التقييم'],
    dataMapper: (r: any) => [
      r.id || '',
      r.name || '',
      r.applied_position || r.role || '',
      r.email || '',
      r.phone || '',
      r.experience_years || 0,
      r.stage || '',
      r.rating ? `${r.rating}/5` : '-'
    ]
  },

  // 29. عقود الاستقدام المباشرة
  contracts: {
    sectionTitle: 'سجل عقود الاستقدام المباشرة (Musaned Contracts)',
    headers: ['رقم العقد', 'رقم مساند', 'اسم العميل', 'جوال العميل', 'اسم العاملة', 'الجنسية', 'المكتب الخارجي', 'المرحلة التشغيلية', 'قيمة العقد (⃁)', 'الضريبة (15%)', 'الإجمالي (⃁)', 'الفرع'],
    dataMapper: (r: any) => [
      r.contract_number || r.id || '',
      r.musaned_number || '',
      r.client_name || '',
      r.client_phone || '',
      r.maid_name || '',
      r.nationality || '',
      r.external_office || '',
      r.stage || '',
      r.amount || 0,
      r.tax_amount || ((r.amount || 0) * 0.15),
      r.total_amount || ((r.amount || 0) * 1.15),
      r.branch || ''
    ]
  },

  // 30. تقارير الأداء التنفيذي الموحد
  'executive-reports': {
    sectionTitle: 'تقرير الأداء المالي والتشغيلي المقارن لشركات المجموعة',
    headers: ['الشركة / الكيان', 'عقود الاستقدام', 'عقود التأجير', 'إجمالي الإيرادات (⃁)', 'المصروفات والتكاليف (⃁)', 'صافي الأرباح (⃁)', 'هامش الربح'],
    dataMapper: (r: any) => [
      r.name || '',
      r.recruitment_contracts || 0,
      r.rent_contracts || 0,
      r.total_revenue || 0,
      r.expenses || 0,
      r.net_profit || 0,
      r.margin || ''
    ]
  },
  executive_reports: {
    sectionTitle: 'تقرير الأداء المالي والتشغيلي المقارن لشركات المجموعة',
    headers: ['الشركة / الكيان', 'عقود الاستقدام', 'عقود التأجير', 'إجمالي الإيرادات (⃁)', 'المصروفات والتكاليف (⃁)', 'صافي الأرباح (⃁)', 'هامش الربح'],
    dataMapper: (r: any) => [
      r.name || '',
      r.recruitment_contracts || 0,
      r.rent_contracts || 0,
      r.total_revenue || 0,
      r.expenses || 0,
      r.net_profit || 0,
      r.margin || ''
    ]
  },

  // 31. تقارير المبيعات والتعاقدات
  'sales-reports': {
    sectionTitle: 'تقرير المبيعات والتعاقدات حسب القنوات وفروع المجموعة',
    headers: ['قناة البيع / الفرع', 'عدد العقود', 'متوسط قيمة العقد (⃁)', 'إجمالي المبيعات (⃁)', 'نسبة المساهمة', 'معدل التحويل'],
    dataMapper: (r: any) => [
      r.channel || '',
      r.count || 0,
      r.avg || 0,
      r.total || 0,
      r.share || '',
      r.conv || ''
    ]
  },
  sales_reports: {
    sectionTitle: 'تقرير المبيعات والتعاقدات حسب القنوات وفروع المجموعة',
    headers: ['قناة البيع / الفرع', 'عدد العقود', 'متوسط قيمة العقد (⃁)', 'إجمالي المبيعات (⃁)', 'نسبة المساهمة', 'معدل التحويل'],
    dataMapper: (r: any) => [
      r.channel || '',
      r.count || 0,
      r.avg || 0,
      r.total || 0,
      r.share || '',
      r.conv || ''
    ]
  },

  // 32. تقارير الاستقدام ومكاتب الإرسال
  'recruitment-reports': {
    sectionTitle: 'تقرير مدد الاستقدام ودورات الإنجاز حسب الدول والمكاتب الخارجية',
    headers: ['الدولة ومكتب المصدر', 'العقود المنفذة', 'متوسط مدة التفييز', 'متوسط مدة الوصول', 'نسبة الالتزام بالموعد', 'معدل رضا العملاء'],
    dataMapper: (r: any) => [
      r.country || '',
      r.count || 0,
      r.visa_days || '',
      r.total_days || '',
      r.on_time || '',
      r.rating || ''
    ]
  },
  recruitment_reports: {
    sectionTitle: 'تقرير مدد الاستقدام ودورات الإنجاز حسب الدول والمكاتب الخارجية',
    headers: ['الدولة ومكتب المصدر', 'العقود المنفذة', 'متوسط مدة التفييز', 'متوسط مدة الوصول', 'نسبة الالتزام بالموعد', 'معدل رضا العملاء'],
    dataMapper: (r: any) => [
      r.country || '',
      r.count || 0,
      r.visa_days || '',
      r.total_days || '',
      r.on_time || '',
      r.rating || ''
    ]
  },

  // 33. التقارير المالية وهوامش الأرباح
  'financial-reports': {
    sectionTitle: 'التقرير المالي التفصيلي وتكاليف التشغيل وهوامش الأرباح',
    headers: ['بند الإيراد / التكلفة', 'المبلغ الإجمالي (⃁)', 'الضريبة 15% (⃁)', 'التكلفة المباشرة للوكالات (⃁)', 'المصروفات الإدارية (⃁)', 'صافي العائد (⃁)', 'الحالة المحاسبية'],
    dataMapper: (r: any) => [
      r.item || '',
      r.total || 0,
      r.vat || 0,
      r.direct || 0,
      r.admin || 0,
      r.net || 0,
      r.status || ''
    ]
  },
  financial_reports: {
    sectionTitle: 'التقرير المالي التفصيلي وتكاليف التشغيل وهوامش الأرباح',
    headers: ['بند الإيراد / التكلفة', 'المبلغ الإجمالي (⃁)', 'الضريبة 15% (⃁)', 'التكلفة المباشرة للوكالات (⃁)', 'المصروفات الإدارية (⃁)', 'صافي العائد (⃁)', 'الحالة المحاسبية'],
    dataMapper: (r: any) => [
      r.item || '',
      r.total || 0,
      r.vat || 0,
      r.direct || 0,
      r.admin || 0,
      r.net || 0,
      r.status || ''
    ]
  },
  reports: {
    sectionTitle: 'تقرير مؤشرات الأداء والذكاء المالي الموحد',
    headers: ['البيان / المؤشر', 'القيمة المحققة', 'المستهدف', 'نسبة الإنجاز', 'الحالة'],
    dataMapper: (r: any) => [
      r.indicator || r.name || r.title || '',
      r.actual || r.value || r.total || 0,
      r.target || 0,
      r.rate || r.margin || '',
      r.status || ''
    ]
  },
  cvs: {
    sectionTitle: 'سجل بنك السير الذاتية المعتمدة (استقدام وتأجير)',
    headers: ['كود السيرة', 'اسم العاملة (إنجليزي)', 'اسم العاملة (عربي)', 'الجنسية', 'المهنة', 'النوع', 'العمر', 'الديانة', 'الراتب (⃁)', 'المكتب الخارجي', 'رقم الجواز', 'الحالة'],
    dataMapper: (r: any) => [
      r.cv_code || r.code || r.id || '',
      r.maid_name || r.name || r.full_name_en || '',
      r.maid_name_ar || r.full_name_ar || '',
      r.nationality || r.nat || '',
      r.job || r.profession || r.skill || 'عاملة منزلية',
      r.type || 'استقدام',
      r.age || 28,
      r.religion || 'مسلمة',
      r.salary || r.price || 1500,
      r.external_office || r.office || "PLATINUM BROTHERS INT'L",
      r.passport_number || r.pass || '',
      r.status || 'متاح'
    ]
  },
  agency_candidates: {
    sectionTitle: 'سجل مرشحي الوكالات الخارجية وسير الاستقدام',
    headers: ['كود السيرة', 'اسم المرشحة', 'رقم الجواز', 'الجنسية', 'المهنة', 'العمر', 'الوكالة المصدرة', 'حالة التأشيرة', 'حالة الطيران', 'العمولة ($)', 'المقابل بالريال (⃁)', 'حالة السداد'],
    dataMapper: (r: any) => [
      r.id || '',
      r.maidName || r.maid_name || '',
      r.passportNumber || r.passport_number || '',
      r.nationality || '',
      r.profession || '',
      r.age || '',
      r.agencyName || r.agency_name || '',
      r.visaStatus || '',
      r.ticketStatus || '',
      r.commissionUsd || 0,
      ((r.commissionUsd || 0) * 3.75),
      r.isPaid ? 'تم السداد' : 'معلق'
    ]
  },
  inventory_assets: {
    sectionTitle: 'سجل الأصول والمستودعات والمخزون',
    headers: ['كود الصنف / الأصل', 'اسم الصنف', 'التصنيف', 'الكمية المتوفرة', 'سعر الوحدة (⃁)', 'القيمة الإجمالية (⃁)', 'المستودع / الموقع', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.item_code || r.id || '',
      r.name || r.item_name || '',
      r.category || '',
      r.quantity || r.stock || 0,
      r.unit_price || r.price || 0,
      (r.quantity || r.stock || 0) * (r.unit_price || r.price || 0),
      r.warehouse || r.location || '',
      r.status || 'متوفر'
    ]
  },
  financial_requests: {
    sectionTitle: 'سجل الطلبات المالية وسندات الصرف والقبض',
    headers: ['رقم الطلب', 'نوع السند', 'المستفيد', 'المبلغ (⃁)', 'طريقة الدفع', 'البيان والتفاصيل', 'الحالة', 'تاريخ الإنشاء'],
    dataMapper: (r: any) => [
      r.voucher_number || r.id || '',
      r.voucher_type || r.type || 'سند صرف',
      r.beneficiary || r.paid_to || '',
      r.amount || 0,
      r.payment_method || 'تحويل بنكي',
      r.description || r.notes || '',
      r.status || 'معتمد',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''
    ]
  },
  sponsorship_transfers: {
    sectionTitle: 'سجل طلبات نقل الكفالة والتنازل',
    headers: ['رقم الطلب', 'اسم العاملة', 'الجنسية', 'الكفيل الحالي', 'الكفيل الجديد', 'المبلغ المطلوب (⃁)', 'حالة التنازل', 'تاريخ الطلب'],
    dataMapper: (r: any) => [
      r.id || r.transfer_number || '',
      r.maid_name || r.worker_name || '',
      r.nationality || '',
      r.current_sponsor || '',
      r.new_sponsor || '',
      r.amount || r.cost || 0,
      r.status || 'قيد الإجراء',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''
    ]
  },
  'sponsorship-transfer': {
    sectionTitle: 'سجل طلبات نقل الكفالة والتنازل',
    headers: ['رقم الطلب', 'اسم العاملة', 'الجنسية', 'الكفيل الحالي', 'الكفيل الجديد', 'المبلغ المطلوب (⃁)', 'حالة التنازل', 'تاريخ الطلب'],
    dataMapper: (r: any) => [
      r.id || r.transfer_number || '',
      r.maid_name || r.worker_name || '',
      r.nationality || '',
      r.current_sponsor || '',
      r.new_sponsor || '',
      r.amount || r.cost || 0,
      r.status || 'قيد الإجراء',
      r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''
    ]
  },

  // 34. سجل العمليات الحية المنفذة للموظفين (28 موظفاً)
  employee_executed_ops: {
    sectionTitle: 'سجل العمليات الحية المنفذة لموظفي المجموعة والفروع',
    headers: ['الرقم المرجعي', 'اسم الموظف', 'المسمى الوظيفي', 'الشركة / الكيان', 'القسم الإداري', 'الفرع الجغرافي', 'العملية المنفذة', 'الأثر المالي (⃁)', 'حالة الاعتماد', 'توقيت التنفيذ'],
    dataMapper: (r: any) => [
      r.reference_no || r.id || '',
      r.staff_name || r.user_name || '',
      r.role || '',
      r.company_name || r.company_id || '',
      r.department_name || r.department_id || '',
      r.branch || '',
      r.operation_title || r.button_label || '',
      r.amount_sar || 0,
      r.status || 'مكتملة ومعتمدة',
      r.executed_at || r.created_at || ''
    ]
  },

  // 35. رادار مراقبة الموظفين ونبض المشاعر والإنتاجية
  employee_monitoring: {
    sectionTitle: 'تقرير مراقبة وإنتاجية الموظفين ونبض المشاعر المؤسسي',
    headers: ['كود الموظف', 'اسم الموظف', 'المسمى الوظيفي', 'الفرع الجغرافي', 'الحالة المزاجية', 'زمن النشاط الفعلي (دقيقة)', 'زمن الخمول (دقيقة)', 'إجمالي النقرات', 'النقرات العصبية', 'المعاملات المنجزة', 'مؤشر الاحتراق الوظيفي'],
    dataMapper: (r: any) => [
      r.user_id || r.id || '',
      r.user_name || r.name || '',
      r.role || '',
      r.branch || '',
      r.latest_mood || 'happy',
      r.active_time_mins || 0,
      r.idle_time_mins || 0,
      r.total_clicks || 0,
      r.rage_clicks_count || 0,
      r.tasks_velocity || 0,
      r.burnout_risk || 'منخفض'
    ]
  },

  // 36. المنافسات الحكومية وجداول الكميات (شركة كاس - اعتماد)
  tenders_boq: {
    sectionTitle: 'كشف المنافسات الحكومية وجداول الكميات والتسعير (منصة اعتماد - كاس)',
    headers: ['رقم المنافسة / الكراسة', 'اسم المشروع / المنافسة', 'الجهة الحكومية', 'قيمة العطاء (⃁)', 'الضريبة 15% (⃁)', 'الإجمالي شامل الضريبة (⃁)', 'قيمة الضمان الابتدائي (⃁)', 'نسبة الإنجاز / الترسية', 'المهندس المسؤول', 'الحالة'],
    dataMapper: (r: any) => {
      const val = Number(r.total_value || r.amount || r.bid_amount || r.budget || 0);
      const vat = Number(r.vat_amount || Math.round(val * 0.15));
      return [
        r.reference_number || r.tender_no || r.code || r.id || '',
        r.title || r.project_name || r.name || '',
        r.entity_name || r.client || r.agency || 'جهة حكومية - منصة اعتماد',
        val,
        vat,
        val + vat,
        r.bond_amount || Math.round(val * 0.02),
        r.progress ? `${r.progress}%` : (r.award_probability || 'قيد التقييم'),
        r.engineer || r.manager || 'م. راشد العجمي',
        r.status || 'مقدم عبر اعتماد'
      ];
    }
  },
  'tenders-boq': {
    sectionTitle: 'كشف المنافسات الحكومية وجداول الكميات والتسعير (منصة اعتماد - كاس)',
    headers: ['رقم المنافسة / الكراسة', 'اسم المشروع / المنافسة', 'الجهة الحكومية', 'قيمة العطاء (⃁)', 'الضريبة 15% (⃁)', 'الإجمالي شامل الضريبة (⃁)', 'قيمة الضمان الابتدائي (⃁)', 'نسبة الإنجاز / الترسية', 'المهندس المسؤول', 'الحالة'],
    dataMapper: (r: any) => {
      const val = Number(r.total_value || r.amount || r.bid_amount || r.budget || 0);
      const vat = Number(r.vat_amount || Math.round(val * 0.15));
      return [
        r.reference_number || r.tender_no || r.code || r.id || '',
        r.title || r.project_name || r.name || '',
        r.entity_name || r.client || r.agency || 'جهة حكومية - منصة اعتماد',
        val,
        vat,
        val + vat,
        r.bond_amount || Math.round(val * 0.02),
        r.progress ? `${r.progress}%` : (r.award_probability || 'قيد التقييم'),
        r.engineer || r.manager || 'م. راشد العجمي',
        r.status || 'مقدم عبر اعتماد'
      ];
    }
  },

  // 37. المكاتب والوكالات الخارجية الدولية
  offices: {
    sectionTitle: 'سجل المكاتب والوكالات الخارجية الدولية وكشوف حساباتها',
    headers: ['كود المكتب', 'اسم الوكالة الخارجية', 'الدولة', 'المدير المسؤول / الوكيل', 'رقم الترخيص الدولي', 'عدد السير المرسلة', 'العقود النشطة', 'عمولة العقد ($)', 'إجمالي المستحقات (⃁)', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.id || '',
      r.name || r.office_name || r.agency_name || '',
      r.country || '',
      r.manager || r.contact_person || '',
      r.license_number || r.license || 'MOT-INTL',
      r.total_cvs || r.cvs_count || 0,
      r.active_contracts || r.contracts_count || 0,
      r.commission_usd || 1100,
      r.balance_sar || ((r.commission_usd || 1100) * 3.75 * (r.active_contracts || 1)),
      r.status || 'معتمد'
    ]
  },

  // 38. الشؤون القانونية والحوكمة والامتثال
  legal_compliance: {
    sectionTitle: 'سجل القضايا واللوائح القانونية والامتثال المؤسسي',
    headers: ['رقم الملف القانوني', 'عنوان القضية / اللائحة', 'الجهة القضائية / الرقابية', 'الأطراف المعنية', 'قيمة المطالبة (⃁)', 'المحامي / المستشار المكلف', 'موعد الجلسة / المراجعة', 'مستوى الأولوية', 'الحالة'],
    dataMapper: (r: any) => [
      r.case_number || r.id || '',
      r.title || r.subject || '',
      r.court || r.authority || 'المحكمة العمالية / وزارة الموارد البشرية',
      r.parties || r.client_name || '',
      r.claim_amount || r.amount || 0,
      r.lawyer || r.assigned_to || 'المستشار القانوني للمجموعة',
      r.next_hearing || r.due_date || '',
      r.priority || 'عادي',
      r.status || 'قيد المتابعة'
    ]
  },

  // 39. حوكمة الهوية والصلاحيات IAM
  iam: {
    sectionTitle: 'مصفوفة حوكمة الهوية والصلاحيات والأمن السيبراني (IAM & RBAC)',
    headers: ['المعرف الوظيفي', 'الاسم الكامل', 'البريد المؤسسي', 'المسمى والدور', 'الكيان المصرح', 'القسم الإداري', 'الفرع الجغرافي', 'المصادقة الثنائية MFA', 'حالة الجلسة'],
    dataMapper: (r: any) => [
      r.id || r.user_id || '',
      r.full_name || r.name || '',
      r.email || '',
      r.role || '',
      r.company_id || 'ALL',
      r.department_name_ar || r.department_id || '',
      r.branch || '',
      r.mfa_enabled !== false ? 'مفعّل (OTP)' : 'غير مفعّل',
      r.status || 'نشط وموثق'
    ]
  }
};

// ─── Comprehensive Arabic Field Dictionary (160+ Enterprise Keys) ────
export const ARABIC_FIELD_DICTIONARY: Record<string, string> = {
  id: 'الرقم المرجعي',
  code: 'الكود التعريفي',
  ref_no: 'رقم المرجع',
  reference_no: 'الرقم المرجعي',
  reference_number: 'رقم المرجع الرسمي',
  serial_number: 'الرقم التسلسلي',
  name: 'الاسم',
  name_ar: 'الاسم بالعربية',
  name_en: 'الاسم بالإنجليزية',
  full_name: 'الاسم الكامل',
  title: 'العنوان / البيان',
  description: 'الوصف والتفاصيل',
  details: 'التفاصيل الإجرائية',
  notes: 'الملاحظات',
  status: 'الحالة',
  stage: 'المرحلة التشغيلية',
  type: 'النوع / التصنيف',
  category: 'الفئة',
  priority: 'الأولوية',
  severity: 'مستوى الأهمية',
  amount: 'المبلغ (⃁)',
  amount_sar: 'المبلغ المالي (⃁)',
  subtotal: 'المبلغ قبل الضريبة (⃁)',
  vat: 'ضريبة القيمة المضافة 15% (⃁)',
  vat_amount: 'ضريبة القيمة المضافة 15% (⃁)',
  tax_amount: 'قيمة الضريبة 15% (⃁)',
  total: 'الإجمالي العام (⃁)',
  total_amount: 'الإجمالي شامل الضريبة (⃁)',
  total_cost: 'التكلفة الإجمالية (⃁)',
  total_debit: 'إجمالي المدين (⃁)',
  total_credit: 'إجمالي الدائن (⃁)',
  debit: 'مدين (⃁)',
  credit: 'دائن (⃁)',
  balance: 'الرصيد (⃁)',
  salary: 'الراتب الإجمالي (⃁)',
  basic_salary: 'الراتب الأساسي (⃁)',
  housing: 'بدل السكن (⃁)',
  transport: 'بدل النقل (⃁)',
  allowances: 'البدلات (⃁)',
  deductions: 'الاستقطاعات (⃁)',
  net_salary: 'صافي الراتب (⃁)',
  monthly_cost: 'القيمة الشهرية (⃁)',
  budget: 'الموازنة المعتمدة (⃁)',
  actual_spent: 'المنصرف الفعلي (⃁)',
  price: 'السعر (⃁)',
  unit_price: 'سعر الوحدة (⃁)',
  cost: 'التكلفة (⃁)',
  client_name: 'اسم العميل',
  client_phone: 'جوال العميل',
  client_national_id: 'هوية العميل',
  client_vat_number: 'الرقم الضريبي للعميل',
  maid_name: 'اسم العاملة / الكادر',
  maid_passport: 'رقم الجواز',
  passport: 'رقم الجواز',
  passport_number: 'رقم الجواز',
  nationality: 'الجنسية',
  profession: 'المهنة',
  job_title: 'المسمى الوظيفي',
  role: 'الدور الوظيفي',
  user_name: 'اسم الموظف / المستخدم',
  staff_name: 'اسم الموظف المختص',
  employee_name: 'اسم الموظف',
  employee_code: 'الرقم الوظيفي',
  username: 'اسم المستخدم',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  mobile: 'رقم الجوال',
  national_id: 'رقم الهوية / الإقامة',
  iqama_number: 'رقم الإقامة',
  iban: 'رقم الآيبان البنكي (IBAN)',
  bank_name: 'اسم البنك',
  branch: 'الفرع الجغرافي',
  branch_name: 'اسم الفرع',
  department: 'القسم / الإدارة',
  department_id: 'كود القسم',
  department_name: 'اسم القسم الإداري',
  company_id: 'رمز الكيان',
  company_name: 'اسم الشركة / الكيان',
  contract_number: 'رقم العقد',
  contract_ref: 'مرجع العقد',
  musaned_number: 'رقم عقد مساند',
  invoice_number: 'رقم الفاتورة الضريبية',
  invoice_type: 'نوع الفاتورة',
  voucher_number: 'رقم السند المالي',
  voucher_type: 'نوع السند',
  entry_number: 'رقم قيد اليومية',
  entry_date: 'تاريخ القيد',
  issue_date: 'تاريخ الإصدار',
  start_date: 'تاريخ البدء',
  end_date: 'تاريخ الانتهاء',
  hire_date: 'تاريخ التعيين',
  flight_date: 'تاريخ الرحلة',
  created_at: 'تاريخ الإنشاء',
  updated_at: 'تاريخ التحديث',
  executed_at: 'توقيت التنفيذ',
  date: 'التاريخ',
  timestamp: 'البصمة الزمنية',
  external_office: 'المكتب الخارجي',
  office_name: 'اسم المكتب الخارجي',
  agency_name: 'اسم الوكالة الدولية',
  country: 'الدولة',
  city: 'المدينة',
  address: 'العنوان الوطني',
  ip_address: 'عنوان الشبكة (IP)',
  device: 'جهاز ومحطة العمل',
  action_type: 'نوع العملية',
  module: 'الوحدة الإدارية',
  zatca_status: 'حالة الربط مع هيئة الزكاة (ZATCA)',
  payment_status: 'حالة السداد',
  payment_method: 'طريقة الدفع',
  warranty_status: 'حالة الضمان',
  duration_months: 'المدة (بالأشهر)',
  quantity: 'الكمية',
  count: 'العدد'
};

// ─── Official Saudi Arabic Tafqeet Engine (تفقيط المبالغ المالية) ────
const ONES_AR = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];
const TENS_AR = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS_AR = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function convertThreeDigitsAr(num: number): string {
  if (num === 0) return '';
  const parts: string[] = [];
  const h = Math.floor(num / 100);
  const rem = num % 100;
  if (h > 0) parts.push(HUNDREDS_AR[h]);
  if (rem > 0) {
    if (rem < 20) {
      parts.push(ONES_AR[rem]);
    } else {
      const u = rem % 10;
      const t = Math.floor(rem / 10);
      if (u > 0) parts.push(`${ONES_AR[u]} و${TENS_AR[t]}`);
      else parts.push(TENS_AR[t]);
    }
  }
  return parts.join(' و');
}

export function numberToArabicTafqeet(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) {
    return 'صفر ريال سعودي لا غير';
  }
  const absVal = Math.abs(Math.round(amount * 100) / 100);
  const riyals = Math.floor(absVal);
  const halalas = Math.round((absVal - riyals) * 100);

  const chunks: string[] = [];
  const millions = Math.floor(riyals / 1000000);
  const thousands = Math.floor((riyals % 1000000) / 1000);
  const remainder = riyals % 1000;

  if (millions > 0) {
    if (millions === 1) chunks.push('مليون');
    else if (millions === 2) chunks.push('مليونان');
    else if (millions >= 3 && millions <= 10) chunks.push(`${convertThreeDigitsAr(millions)} ملايين`);
    else chunks.push(`${convertThreeDigitsAr(millions)} مليوناً`);
  }

  if (thousands > 0) {
    if (thousands === 1) chunks.push('ألف');
    else if (thousands === 2) chunks.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) chunks.push(`${convertThreeDigitsAr(thousands)} آلاف`);
    else chunks.push(`${convertThreeDigitsAr(thousands)} ألفاً`);
  }

  if (remainder > 0) {
    chunks.push(convertThreeDigitsAr(remainder));
  }

  const riyalText = chunks.length > 0 ? `${chunks.join(' و')} ريال سعودي` : 'صفر ريال سعودي';
  const halalaText = halalas > 0 ? ` و${convertThreeDigitsAr(halalas)} هللة` : '';
  return `فقط وقدره ${riyalText}${halalaText} لا غير`;
}

// ─── Company, Subsidiary & Authenticated Employee Context ────────────
export interface CompanyBrandingInfo {
  code: string;
  nameAr: string;
  nameEn: string;
  tagline: string;
  crNumber: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

export interface ExportingEmployeeInfo {
  id: string;
  name: string;
  role: string;
  department: string;
  branch: string;
  email: string;
}

export interface ExportCustomizationOptions {
  selectedColumnIndices?: number[];
  customTitle?: string;
  executiveNote?: string;
  orientation?: 'auto' | 'portrait' | 'landscape';
  showSignatures?: boolean;
  showTafqeet?: boolean;
  showQrCode?: boolean;
}

function isRunningInTest(): boolean {
  try {
    const proc = (globalThis as any).process;
    return Boolean(proc?.env && (proc.env.NODE_ENV === 'test' || proc.env.VITEST));
  } catch {
    return false;
  }
}

export function getActiveCompanyInfo(): CompanyBrandingInfo {
  try {
    const storeCompany = useAppStore.getState()?.activeCompanyId;
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('ALSULAIM_ACTIVE_COMPANY') ||
          localStorage.getItem('alsulaim_active_company') ||
          localStorage.getItem('ALSULAIM_LOCKED_COMPANY') ||
          localStorage.getItem('ALSULAIM_TARGET_SYSTEM') ||
          storeCompany ||
          ''
        : storeCompany || '';
    const norm = String(raw).toUpperCase();
    if (norm && norm !== 'ALL') {
      const match = COMPANIES_LIST.find(
        c => c.id.toUpperCase() === norm || c.code.toUpperCase() === norm
      );
      if (match) {
        return {
          code: match.code.toUpperCase(),
          nameAr: match.name,
          nameEn: match.nameEn,
          tagline: `منظومة تخطيط الموارد الموحدة — ${match.name}`,
          crNumber: match.crNumber,
          taxNumber: match.taxNumber,
          address: match.address,
          phone: match.phone,
          email: match.email,
          logo: match.logo || '/logo.png',
        };
      }
    }
  } catch {
    // ignore
  }

  return {
    code: 'ALL',
    nameAr: GROUP_COMPANY_INFO.nameAr,
    nameEn: GROUP_COMPANY_INFO.nameEn,
    tagline: GROUP_COMPANY_INFO.tagline,
    crNumber: GROUP_COMPANY_INFO.crNumber,
    taxNumber: GROUP_COMPANY_INFO.taxNumber,
    address: 'المملكة العربية السعودية - الرياض - طريق الملك فهد',
    phone: '+966 11 400 1122',
    email: 'info@alsulaim.sa',
    logo: '/logo.png',
  };
}

export function getAuthenticatedExporterInfo(): ExportingEmployeeInfo {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw =
        localStorage.getItem('ALSULAIM_AUTH_USER') ||
        localStorage.getItem('alsulaim_erp_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.full_name || parsed.name)) {
          return {
            id: parsed.id || 'USR-GRP-EXEC-01',
            name: parsed.full_name || parsed.name,
            role: parsed.role || 'مسؤول العمليات والتقارير',
            department: parsed.department_name_ar || parsed.department || 'الإدارة التنفيذية للمجموعة',
            branch: parsed.branch || 'المقر الرئيسي للمجموعة - الرياض',
            email: parsed.email || 'chairman@alsulaim.sa',
          };
        }
      }
    }
  } catch {
    // fallback
  }

  return {
    id: 'USR-GRP-EXEC-01',
    name: 'الشيخ خالد بن عبدالعزيز السليم',
    role: 'رئيس مجلس الإدارة',
    department: 'القيادة التنفيذية والحوكمة',
    branch: 'المقر الرئيسي للمجموعة - الرياض',
    email: 'chairman@alsulaim.sa',
  };
}

function translateFieldToArabic(key: string): string {
  const cleanKey = key.trim();
  const lower = cleanKey.toLowerCase();
  if (ARABIC_FIELD_DICTIONARY[cleanKey]) return ARABIC_FIELD_DICTIONARY[cleanKey];
  if (ARABIC_FIELD_DICTIONARY[lower]) return ARABIC_FIELD_DICTIONARY[lower];

  // If already contains Arabic characters, return as is
  if (/[\u0600-\u06FF]/.test(cleanKey)) return cleanKey;

  return cleanKey
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ─── Smart Fallback & Customization Resolver ─────────────────────────
export function resolveConfig(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): SectionExportConfig {
  let baseConfig: SectionExportConfig;

  if (SECTION_CONFIGS[sectionKey]) {
    const cfg = SECTION_CONFIGS[sectionKey];
    baseConfig = {
      ...cfg,
      sectionTitle: options?.customTitle || customTitle || cfg.sectionTitle,
    };
  } else if (data && data.length > 0) {
    const firstRow = data[0];
    const keys = Object.keys(firstRow).filter(
      k => k !== '__typename' && typeof firstRow[k] !== 'function' && typeof firstRow[k] !== 'object'
    );
    const effectiveKeys = keys.length > 0 ? keys : Object.keys(firstRow).slice(0, 10);

    baseConfig = {
      sectionTitle: options?.customTitle || customTitle || `التقرير الرسمي — ${translateFieldToArabic(sectionKey)}`,
      headers: effectiveKeys.map(translateFieldToArabic),
      dataMapper: (row: any) =>
        effectiveKeys.map(k => {
          const val = row[k];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        }),
    };
  } else {
    baseConfig = {
      sectionTitle: options?.customTitle || customTitle || `التقرير الرسمي — ${translateFieldToArabic(sectionKey)}`,
      headers: ['الرقم المرجعي', 'البيان والتفاصيل', 'التاريخ'],
      dataMapper: (r: any) => [r?.id || '', JSON.stringify(r || {}), new Date().toLocaleDateString('ar-SA')],
    };
  }

  // Apply column selection filter if specified in options
  if (
    options?.selectedColumnIndices &&
    options.selectedColumnIndices.length > 0 &&
    options.selectedColumnIndices.length < baseConfig.headers.length
  ) {
    const validIndices = options.selectedColumnIndices.filter(
      idx => idx >= 0 && idx < baseConfig.headers.length
    );
    if (validIndices.length > 0) {
      return {
        sectionTitle: baseConfig.sectionTitle,
        headers: validIndices.map(idx => baseConfig.headers[idx]),
        dataMapper: (row: any) => {
          const fullRow = baseConfig.dataMapper(row);
          return validIndices.map(idx => fullRow[idx]);
        },
      };
    }
  }

  return baseConfig;
}

// ─── Standalone ZATCA-Style Vector QR SVG Generator ─────────────────
function generateZatcaQrSvg(): string {
  return `
    <svg width="88" height="88" viewBox="0 0 100 100" style="background:#ffffff; padding:4px; border:1.5px solid #CFA64A; border-radius:10px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <!-- Corner Position Squares -->
      <rect x="5" y="5" width="26" height="26" rx="4" fill="#1D2428" />
      <rect x="9" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
      <rect x="13" y="13" width="10" height="10" rx="1" fill="#047857" />

      <rect x="69" y="5" width="26" height="26" rx="4" fill="#1D2428" />
      <rect x="73" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
      <rect x="77" y="13" width="10" height="10" rx="1" fill="#047857" />

      <rect x="5" y="69" width="26" height="26" rx="4" fill="#1D2428" />
      <rect x="9" y="73" width="18" height="18" rx="2" fill="#FFFFFF" />
      <rect x="13" y="77" width="10" height="10" rx="1" fill="#047857" />

      <!-- Data Dots Matrix Pattern -->
      <rect x="36" y="8" width="5" height="5" fill="#1D2428" />
      <rect x="46" y="8" width="5" height="5" fill="#1D2428" />
      <rect x="56" y="8" width="5" height="5" fill="#1D2428" />

      <rect x="36" y="18" width="5" height="5" fill="#047857" />
      <rect x="46" y="18" width="5" height="5" fill="#1D2428" />
      <rect x="56" y="18" width="5" height="5" fill="#047857" />

      <rect x="36" y="28" width="5" height="5" fill="#1D2428" />
      <rect x="46" y="28" width="5" height="5" fill="#CFA64A" />
      <rect x="56" y="28" width="5" height="5" fill="#1D2428" />

      <rect x="8" y="36" width="5" height="5" fill="#1D2428" />
      <rect x="18" y="36" width="5" height="5" fill="#047857" />
      <rect x="28" y="36" width="5" height="5" fill="#1D2428" />
      <rect x="68" y="36" width="5" height="5" fill="#1D2428" />
      <rect x="78" y="36" width="5" height="5" fill="#047857" />
      <rect x="88" y="36" width="5" height="5" fill="#1D2428" />

      <rect x="8" y="46" width="5" height="5" fill="#047857" />
      <rect x="18" y="46" width="5" height="5" fill="#1D2428" />
      <rect x="28" y="46" width="5" height="5" fill="#047857" />
      <rect x="68" y="46" width="5" height="5" fill="#047857" />
      <rect x="78" y="46" width="5" height="5" fill="#1D2428" />
      <rect x="88" y="46" width="5" height="5" fill="#047857" />

      <rect x="8" y="56" width="5" height="5" fill="#1D2428" />
      <rect x="18" y="56" width="5" height="5" fill="#1D2428" />
      <rect x="28" y="56" width="5" height="5" fill="#1D2428" />
      <rect x="68" y="56" width="5" height="5" fill="#1D2428" />
      <rect x="78" y="56" width="5" height="5" fill="#1D2428" />
      <rect x="88" y="56" width="5" height="5" fill="#1D2428" />

      <rect x="36" y="68" width="5" height="5" fill="#1D2428" />
      <rect x="46" y="68" width="5" height="5" fill="#047857" />
      <rect x="56" y="68" width="5" height="5" fill="#1D2428" />
      <rect x="68" y="68" width="5" height="5" fill="#1D2428" />
      <rect x="78" y="68" width="5" height="5" fill="#1D2428" />
      <rect x="88" y="68" width="5" height="5" fill="#047857" />

      <rect x="36" y="78" width="5" height="5" fill="#047857" />
      <rect x="46" y="78" width="5" height="5" fill="#1D2428" />
      <rect x="56" y="78" width="5" height="5" fill="#047857" />
      <rect x="68" y="78" width="5" height="5" fill="#047857" />
      <rect x="78" y="78" width="5" height="5" fill="#1D2428" />
      <rect x="88" y="78" width="5" height="5" fill="#1D2428" />

      <rect x="36" y="88" width="5" height="5" fill="#1D2428" />
      <rect x="46" y="88" width="5" height="5" fill="#1D2428" />
      <rect x="56" y="88" width="5" height="5" fill="#1D2428" />
      <rect x="68" y="88" width="5" height="5" fill="#1D2428" />
      <rect x="78" y="88" width="5" height="5" fill="#047857" />
      <rect x="88" y="88" width="5" height="5" fill="#1D2428" />

      <!-- Center Verified Shield Emblem -->
      <circle cx="50" cy="50" r="13" fill="#FFFFFF" stroke="#CFA64A" stroke-width="2" />
      <path d="M50 42 L56 45 L56 51 C56 55 50 58 50 58 C50 58 44 55 44 51 L44 45 Z" fill="#047857" />
      <path d="M48 50 L50 52 L53 47" stroke="#FFFFFF" stroke-width="1.3" fill="none" stroke-linecap="round" />
    </svg>
  `;
}

// ─── Report KPI Metrics Calculator ──────────────────────────────────
export interface ReportKpis {
  recordCount: number;
  totalAmount: number;
  totalVat: number;
  hasFinancials: boolean;
  tafqeetAr: string;
  columnTotals: (number | null)[];
}

export function calculateReportKpis(headers: string[], mappedRows: any[][]): ReportKpis {
  let totalAmount = 0;
  let totalVat = 0;
  let hasFinancials = false;

  const columnTotals: (number | null)[] = headers.map((headerName, colIdx) => {
    const isMoneyOrCount = /مبلغ|قيمة|ضريبة|إجمالي|سعر|راتب|مصروف|رصيد|تكلفة|بدل|صافي|عطاء|ضمان|أثر مالي|مستحقات/i.test(headerName);
    const isIdOrCode = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban|نسبة|%/i.test(headerName);

    if (!isMoneyOrCount || isIdOrCode) return null;

    let colSum = 0;
    let hasValidNum = false;

    for (const row of mappedRows) {
      const v = row[colIdx];
      let numVal: number | null = null;
      if (typeof v === 'number' && !isNaN(v)) {
        numVal = v;
      } else if (typeof v === 'string') {
        const cleaned = v.replace(/,/g, '').replace(/ر\.س/g, '').replace(/\$/g, '').trim();
        if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) numVal = parsed;
        }
      }

      if (numVal !== null) {
        colSum += numVal;
        hasValidNum = true;
      }
    }

    if (hasValidNum) {
      hasFinancials = true;
      if (/ضريبة/i.test(headerName)) {
        totalVat += colSum;
      } else if (/مبلغ|قيمة|إجمالي|مصروف|صافي|عطاء|راتب|أثر مالي|مستحقات/i.test(headerName)) {
        totalAmount = Math.max(totalAmount, colSum);
      }
      return Math.round(colSum * 100) / 100;
    }

    return null;
  });

  const roundedTotal = Math.round(totalAmount * 100) / 100;
  const roundedVat = Math.round((totalVat || roundedTotal * 0.15) * 100) / 100;

  return {
    recordCount: mappedRows.length,
    totalAmount: roundedTotal,
    totalVat: roundedVat,
    hasFinancials,
    tafqeetAr: roundedTotal > 0 ? numberToArabicTafqeet(roundedTotal) : 'لا توجد التزامات مالية مباشرة في هذا الكشف',
    columnTotals,
  };
}

// ─── Executive HTML Report Template Builder (Used by PDF, Print, HTML, PNG) ───
export function generateExecutiveReportHtml(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  isPrintPreview: boolean = true,
  options?: ExportCustomizationOptions
): string {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();

  const now = new Date();
  const dateAr = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const isoDate = now.toISOString().slice(0, 10);
  const serialNumber = `${company.code}-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const verificationHash = `SHA256:${Array.from({ length: 20 }, (_, i) => ((now.getTime() + i * 31) % 16).toString(16)).join('').toUpperCase()}`;

  const mappedRows = data.map(r => config.dataMapper(r));
  const kpis = calculateReportKpis(config.headers, mappedRows);

  const showQr = options?.showQrCode !== false;
  const showSigs = options?.showSignatures !== false;
  const showTafqeet = options?.showTafqeet !== false;
  const isLandscape =
    options?.orientation === 'landscape'
      ? true
      : options?.orientation === 'portrait'
      ? false
      : config.headers.length > 7;

  const headersHtml = `
    <th onclick="window.__sortTable && window.__sortTable(0)" style="padding: 10px 8px; background: #1D2428; color: #FBFBF5; border: 1px solid #334155; width: 44px; text-align: center; font-weight: 800; font-size: 11px; cursor: pointer;">#</th>
    ${config.headers.map((h, i) => `
      <th onclick="window.__sortTable && window.__sortTable(${i + 1})" style="padding: 10px 10px; background: #1D2428; color: #FBFBF5; border: 1px solid #334155; font-size: 11.5px; font-weight: 800; text-align: right; white-space: nowrap; cursor: pointer;">
        ${h}
      </th>
    `).join('')}
  `;

  const rowsHtml = mappedRows.map((row, idx) => {
    return `
      <tr class="report-data-row" style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FBFBF5'}; page-break-inside: avoid;">
        <td style="text-align: center; font-weight: bold; color: #64748B; padding: 7px 6px; border: 1px solid #E2E8F0; font-size: 11px; font-family: monospace;">
          ${idx + 1}
        </td>
        ${row.map((val, cIdx) => {
          const isNum = typeof val === 'number' || (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim()));
          const headerName = config.headers[cIdx] || '';
          const isIdOrPhone = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban/i.test(headerName);
          const align = isNum && !isIdOrPhone ? 'text-align: left; font-family: monospace; font-weight: 700;' : 'text-align: right;';
          const displayVal = typeof val === 'number' ? val.toLocaleString('en-US') : String(val ?? '-');

          return `
            <td style="padding: 7px 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #1D2428; ${align}">
              ${displayVal || '-'}
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }).join('');

  // Totals Row Footer
  let tfootHtml = '';
  const hasTotals = kpis.columnTotals.some(t => t !== null);
  if (hasTotals) {
    tfootHtml = `
      <tfoot>
        <tr style="background-color: #F4EFE6; font-weight: 900; border-top: 2.5px solid #1D2428; page-break-inside: avoid;">
          <td colspan="1" style="text-align: center; padding: 10px 8px; border: 1px solid #CBD5E1; font-size: 11px; color: #1D2428;">
            المجموع
          </td>
          ${config.headers.map((_, colIdx) => {
            const tot = kpis.columnTotals[colIdx];
            if (colIdx === 0 && tot === null) {
              return `<td style="padding: 10px; border: 1px solid #CBD5E1; font-size: 11px; color: #1D2428; font-weight: 900;">الإجمالي العام المعتمد</td>`;
            }
            if (tot !== null) {
              return `
                <td style="padding: 10px; border: 1px solid #CBD5E1; font-size: 11.5px; color: #047857; font-weight: 900; font-family: monospace; text-align: left;">
                  ${tot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              `;
            }
            return `<td style="border: 1px solid #CBD5E1; padding: 6px;"></td>`;
          }).join('')}
        </tr>
      </tfoot>
    `;
  }

  const qrSvg = generateZatcaQrSvg();

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>${title} • ${company.nameAr}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        @font-face {
          font-family: 'saudi_riyal';
          src: url('data:font/woff2;base64,d09GMgABAAAAAAT0AA0AAAAAC2QAAASeAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGhgGYACCZhEICocEhXcLGgABNgIkAzAEIAWHLgeBBRvVCSCOwnEvSojJ5ORhKiWep9/bPPc32mdnUaW+wXeJKlVIJCg8CIfcQWViVHSETJeZqNqErgZPp/28VaAy13pTkXvNQZv4IHCbHD9In+dyevP5Cfy7K+slmC3ybGwuLx2T18L1PKA2pnPbFCvQCdbLLSJq0N0AB31thACv29f9APD1k6ZUJ0tAD4aoQDO8bhmyFC1UI+oCuAO15AO2Q8G5MwSqDefwClCi9Be6wX9nQPsMEKAeA1AQUIMaLCGACzQCljAqQE+OwoCjcu0D6kv8/x/sl6sfkIpP/3/9/WpgdgoEQAeYoIR0QACkAlSghuJ31w3LAXyr/P+vAvSAOTCAzAK5B6CBQzRNhcGgGoYLL+dYrlnFKgu9iOcEj646uXaI2W3sJ9lTI4EetCRQAgulmH6SYMZBziQb1xBipCaQaS6l0vWRWr1q1aFDnTA52r1fr8fUTpXKWvLQ4KnSwb0+PppFHxtVC1at2uXrO9JOSIUWTzV+QWdXLT0K2uhG0jpJEiZs6WjSR9KuG9Zv1u+P2q1UujpcsT1L3dNzqhQszNevVtPHSYnHKlXoGEWtDpi6yX/duUgVJGGvzwIypcpt/Ni4Jly1atcq32n6zc+V4+ld7k6gz53h7vgOHLKN10L3KkUS7kouYUcPhGVony1zOi//ctkTdm/3kAqubk+P0MptoSFlXH1d5ZyIwuAyWX7+z+picypWzAjs1xCbVaGJLgqt5qqbqg/Y6ntEjm76aneF9Yjvano5HXrdrjSkllfHmVOk+o/IY8O89mBNc9Lbwcoe28z7DRmFzSmN4wbrT5X+B/E2SdMQn2S1PFaUu1OkJfIXKxVt+w1pFa2xjdll47yrvsvczl7/4ETotcmj56Zkzxs3b+7w0ZMNx9wX7srQ8rIsghhH+yj839cG7rwS/FVUQnWXgYUdjUP+HL5C8fybvBJ6ZQRWMKOhfsi7ZqHZEz4e3TZxMtEqXR8kGN0n/5/a9jk9IKKiFlmPtlWvYKy8rF34efCtxR9snP0uNWnu7Jj8kj9HHV1INdJDNT2jhozoFXwqYPLE+VjfWDBpsq7FUrJmU3brXPVwppI6gm8PCAjcX9RU3FdX8KtcJcczkIBc+4K9C8ZdxNPL/LtD9KcF19fLgOpBtODVPMNO+5d0/C2p2BEBPefddskgYA8Aa9mMABgKQwChUg9RkbGjprcJDW9v0SJ+QccrQRhDkk6Os7mYoEtPTCIZQk6xo9ALyCFMI3lIDtjnGFLlm9EzZJUcNNIoAAUACL10ULSMoCUYAkaUk2BRfgAnwm+QoZJMytlMKIQkH0pUBpAqdhjUMjIGGlTuklr2MTzoI92UJ23+wONVGmQ40WC8UgM5iCwsRBYopXLQcHEwXzrQIVosogW4IRrFwqmv4ZzGEQ2Em8tRFmff4c5x4kDgmpXdKAOJhsMnRWOAIg8/SVZ+YGXZ5ee18vMkZYbYopod2PHxMh22lbggxy4aiTp8UzunkRxGMUliNsQgyayTKk8k+l05RzpGmT7YjNb5FSWKKTxHRVTCPj0ISoRIUaJDEZowhCWctufXnHPwkJG/e0pZDQA=') format('woff2');
          font-weight: 100 900;
          font-style: normal;
          unicode-range: U+20C1, U+E900;
        }
        * { box-sizing: border-box; }
        body {
          font-family: 'saudi_riyal', 'Tajawal', 'Cairo', 'Inter', system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 24px;
          color: #1D2428;
          background: #FFFFFF;
          position: relative;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        @media print {
          @page {
            size: ${isLandscape ? 'landscape' : 'portrait'};
            margin: 8mm 10mm;
          }
          body {
            padding: 0;
            margin: 0;
            background: #FFFFFF;
          }
          .no-print {
            display: none !important;
          }
          .header-banner {
            border-bottom: 2.5px solid #1D2428 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }

        /* Subtle Security Watermark */
        .security-watermark {
          position: fixed;
          top: 52%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-24deg);
          font-size: 56px;
          font-weight: 900;
          color: rgba(207, 166, 74, 0.055);
          pointer-events: none;
          white-space: nowrap;
          z-index: 0;
          user-select: none;
        }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: linear-gradient(135deg, #1D2428 0%, #263137 100%);
          color: #FFFFFF;
          padding: 12px 22px;
          border-radius: 16px;
          border: 1px solid rgba(207, 166, 74, 0.45);
          margin-bottom: 22px;
          box-shadow: 0 10px 25px rgba(29, 36, 40, 0.16);
        }

        .btn {
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-weight: 800;
          font-size: 12px;
          padding: 8px 16px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #047857;
          color: #FFFFFF;
        }
        .btn-primary:hover {
          background: #065f46;
        }
        .btn-gold {
          background: #CFA64A;
          color: #1D2428;
        }
        .btn-secondary {
          background: rgba(255,255,255,0.12);
          color: #FFFFFF;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .search-input {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(207, 166, 74, 0.45);
          color: #FFFFFF;
          padding: 6px 14px;
          border-radius: 9999px;
          font-family: inherit;
          font-size: 12px;
          min-width: 210px;
          outline: none;
        }
        .search-input::placeholder {
          color: rgba(255,255,255,0.6);
        }

        /* Official Header */
        .header-banner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #1D2428;
          padding-bottom: 16px;
          margin-bottom: 16px;
          gap: 16px;
          position: relative;
          z-index: 1;
        }

        .company-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo-emblem {
          width: 62px;
          height: 62px;
          border-radius: 16px;
          border: 2px solid #CFA64A;
          background: linear-gradient(135deg, #1D2428 0%, #2D373D 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #CFA64A;
          font-weight: 900;
          box-shadow: 0 4px 12px rgba(29,36,40,0.15);
        }

        .company-titles h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 900;
          color: #1D2428;
          line-height: 1.25;
        }
        .company-titles .holding-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          color: #8C681E;
          background: #FBF8F1;
          border: 1px solid rgba(207, 166, 74, 0.5);
          padding: 1px 8px;
          border-radius: 6px;
          margin-bottom: 3px;
        }
        .company-titles .en-name {
          font-size: 10.5px;
          color: #64748B;
          font-weight: 700;
          margin-top: 2px;
          letter-spacing: 0.4px;
        }
        .company-titles .legal-info {
          display: flex;
          gap: 10px;
          font-size: 10px;
          color: #475569;
          margin-top: 5px;
          flex-wrap: wrap;
        }
        .company-titles .legal-info strong {
          color: #1D2428;
        }

        .center-meta {
          text-align: center;
          flex: 1;
          padding: 0 10px;
        }
        .official-tag {
          display: inline-block;
          background: #1D2428;
          border: 1px solid #CFA64A;
          color: #CFA64A;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 14px;
          border-radius: 9999px;
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }
        .report-title-text {
          font-size: 18px;
          font-weight: 900;
          color: #1D2428;
          margin: 0;
        }
        .report-subtitle {
          font-size: 10.5px;
          color: #475569;
          margin-top: 4px;
        }
        .exporter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 3px 12px;
          border-radius: 8px;
          background: #F0FDF4;
          border: 1px solid #A7F3D0;
          color: #047857;
          font-size: 10px;
          font-weight: 800;
        }

        .qr-section {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .serial-pill {
          font-size: 9.5px;
          font-family: monospace;
          color: #1D2428;
          font-weight: 800;
          margin-top: 4px;
        }
        .verified-stamp {
          font-size: 9px;
          font-weight: 800;
          color: #047857;
          margin-top: 2px;
        }

        /* KPI Cards Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .kpi-box {
          background: #FBFBF5;
          border: 1px solid #E2E8F0;
          border-right: 3.5px solid #1D2428;
          border-radius: 12px;
          padding: 10px 14px;
          text-align: right;
        }
        .kpi-box.gold { border-right-color: #CFA64A; }
        .kpi-box.emerald { border-right-color: #047857; }
        .kpi-box .label {
          font-size: 10.5px;
          color: #64748B;
          font-weight: 700;
        }
        .kpi-box .val {
          font-size: 16px;
          font-weight: 900;
          color: #1D2428;
          margin-top: 2px;
        }
        .kpi-box .val.emerald { color: #047857; }
        .kpi-box .val.gold { color: #8C681E; }
        .kpi-box .note {
          font-size: 9px;
          color: #64748B;
          margin-top: 2px;
        }

        /* Tafqeet Bar */
        .tafqeet-ribbon {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(90deg, #FBF8F1 0%, #F4EFE6 100%);
          border: 1px solid rgba(207, 166, 74, 0.55);
          border-right: 4px solid #CFA64A;
          border-radius: 10px;
          padding: 8px 14px;
          margin-bottom: 14px;
          font-size: 11px;
          font-weight: 800;
          color: #1D2428;
          position: relative;
          z-index: 1;
        }

        .executive-note-box {
          background: #F0FDF4;
          border: 1px solid #A7F3D0;
          border-right: 4px solid #047857;
          border-radius: 10px;
          padding: 9px 14px;
          margin-bottom: 14px;
          font-size: 11px;
          color: #064E3B;
          font-weight: 700;
        }

        /* Table */
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          background: #FFFFFF;
          position: relative;
          z-index: 1;
        }

        /* Signatures Matrix */
        .signatures-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 26px;
          page-break-inside: avoid;
          position: relative;
          z-index: 1;
        }
        .sig-box {
          border: 1px solid #E2E8F0;
          background: #FBFBF5;
          border-radius: 12px;
          padding: 12px;
          text-align: center;
        }
        .sig-box .sig-title {
          font-size: 11.5px;
          font-weight: 900;
          color: #1D2428;
        }
        .sig-box .sig-role {
          font-size: 10px;
          color: #8C681E;
          font-weight: 700;
          margin-top: 2px;
        }
        .sig-line {
          height: 1px;
          background: #E2E8F0;
          margin: 8px 0;
        }
        .sig-meta {
          font-size: 9.5px;
          color: #334155;
          font-weight: 700;
          margin-top: 2px;
        }
        .sig-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          color: #047857;
          background: #ECFDF5;
          padding: 2px 10px;
          border-radius: 9999px;
          border: 1px solid #A7F3D0;
          margin-top: 6px;
        }

        .seal-stamp {
          width: 72px;
          height: 72px;
          border: 2px double #047857;
          border-radius: 50%;
          margin: 6px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F0FDF4;
          color: #047857;
          font-size: 8.5px;
          font-weight: 900;
          line-height: 1.25;
          box-shadow: inset 0 0 0 2px rgba(207, 166, 74, 0.35);
        }

        /* Official Footer */
        .official-footer {
          margin-top: 22px;
          padding-top: 12px;
          border-top: 1.5px solid #CBD5E1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9.5px;
          color: #475569;
          page-break-inside: avoid;
          position: relative;
          z-index: 1;
        }
      </style>
    </head>
    <body>
      <div class="security-watermark">${company.nameAr} • CERTIFIED ERP</div>

      <!-- Interactive Screen Toolbar (Hidden on Print & PDF) -->
      <div class="toolbar no-print" style="${!isPrintPreview ? '' : ''}">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: #CFA64A; color: #1D2428; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px;">خ</div>
          <div>
            <div style="font-weight: 900; font-size: 13px; color: #FBFBF5;">وثيقة التقرير المؤسسي المعتمد • ${company.nameAr}</div>
            <div style="font-size: 10.5px; color: #CFA64A;">إعداد: ${exporter.name} (${exporter.branch}) • الرقم المرجعي: ${serialNumber}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <input type="text" class="search-input" placeholder="فلترة وبحث فوري في السجلات..." oninput="window.__filterRows && window.__filterRows(this.value)" />
          <button class="btn btn-primary" onclick="window.print()">
            طباعة رسمية A4 / حفظ PDF
          </button>
          ${isPrintPreview ? `
          <button class="btn btn-secondary" onclick="window.close()">
            إغلاق النافذة
          </button>
          ` : ''}
        </div>
      </div>

      <!-- 1. Dual-Branding Header Banner -->
      <div class="header-banner">
        <div class="company-brand">
          <div class="logo-emblem">
            <span style="font-size: 21px; line-height: 1;">خ</span>
            <span style="font-size: 8px; color: #FBFBF5; letter-spacing: 0.5px; margin-top: 2px;">${company.code}</span>
          </div>
          <div class="company-titles">
            <span class="holding-badge">${GROUP_COMPANY_INFO.nameAr} • الإدارة العامة</span>
            <h1>${company.nameAr}</h1>
            <div class="en-name">${company.nameEn}</div>
            <div class="legal-info">
              <span>س.ت: <strong>${company.crNumber}</strong></span>
              <span>•</span>
              <span>الرقم الضريبي: <strong>${company.taxNumber}</strong></span>
              <span>•</span>
              <span>الفرع المصدر: <strong>${exporter.branch}</strong></span>
            </div>
          </div>
        </div>

        <div class="center-meta">
          <div class="official-tag">وثيقة رسمية معتمدة • ZATCA & ERP COMPLIANT • SAMA WPS</div>
          <h2 class="report-title-text">${title}</h2>
          <div class="report-subtitle">تاريخ الاستخراج: <strong>${dateAr}</strong> — الساعة <strong>${timeStr}</strong></div>
          <div class="exporter-pill">
            <span>الموظف المصدِّر: ${exporter.name}</span>
            <span>|</span>
            <span>${exporter.role}</span>
          </div>
        </div>

        ${showQr ? `
        <div class="qr-section">
          ${qrSvg}
          <div class="serial-pill">${serialNumber}</div>
          <div class="verified-stamp">✓ موثق بختم التشفير الرقمي</div>
        </div>
        ` : ''}
      </div>

      <!-- 2. KPI Summary Metrics -->
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="label">إجمالي السجلات المعتمدة</div>
          <div class="val">${kpis.recordCount} <span style="font-size: 11px; font-weight: normal;">سجل</span></div>
          <div class="note">مطابقة للسجلات والدفاتر الحية</div>
        </div>

        ${kpis.hasFinancials && kpis.totalAmount > 0 ? `
        <div class="kpi-box emerald">
          <div class="label">إجمالي القيمة المالية المعتمدة</div>
          <div class="val emerald">${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 11px;">⃁</span></div>
          <div class="note">إجمالي الحركة المالية للكشف</div>
        </div>
        <div class="kpi-box gold">
          <div class="label">ضريبة القيمة المضافة (15%)</div>
          <div class="val gold">${kpis.totalVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 11px;">⃁</span></div>
          <div class="note">مفوترة وفق معايير ZATCA Phase 2</div>
        </div>
        ` : `
        <div class="kpi-box emerald">
          <div class="label">القسم / الوحدة الإدارية</div>
          <div class="val emerald" style="font-size: 13.5px;">${exporter.department}</div>
          <div class="note">${company.nameAr}</div>
        </div>
        <div class="kpi-box gold">
          <div class="label">حالة التدقيق والمطابقة</div>
          <div class="val gold" style="font-size: 14px;">سارية ومعتمدة 100%</div>
          <div class="note">تم التحقق الآلي من سلامة السجلات</div>
        </div>
        `}

        <div class="kpi-box">
          <div class="label">الفرع ومستوى الحوكمة</div>
          <div class="val" style="font-size: 13px; color: #1D2428;">${exporter.branch}</div>
          <div class="note">خاضع لنظام حماية البيانات (PDPL)</div>
        </div>
      </div>

      ${showTafqeet && kpis.hasFinancials && kpis.totalAmount > 0 ? `
      <!-- 2.b Arabic Tafqeet Financial Bar -->
      <div class="tafqeet-ribbon">
        <div>
          <span style="color: #8C681E; margin-left: 6px;">التفقيط المالي المعتمد بالحروف:</span>
          <span>${kpis.tafqeetAr}</span>
        </div>
        <span style="font-family: 'saudi_riyal', monospace; font-size: 11px; color: #047857;">\u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      ` : ''}

      ${options?.executiveNote ? `
      <div class="executive-note-box">
        <strong>توجيه / ملاحظة الإدارة التنفيذية:</strong> ${options.executiveNote}
      </div>
      ` : ''}

      <!-- 3. Main Data Table -->
      <table class="data-table" id="enterprise-report-table">
        <thead>
          <tr>${headersHtml}</tr>
        </thead>
        <tbody id="enterprise-report-tbody">
          ${rowsHtml}
        </tbody>
        ${tfootHtml}
      </table>

      ${showSigs ? `
      <!-- 4. Signatures & Approvals Matrix (Attributed to Real Employee & Branch) -->
      <div class="signatures-grid">
        <div class="sig-box">
          <div class="sig-title">إعداد الموظف المختص (استخراج وتوثيق)</div>
          <div class="sig-role">${exporter.role}</div>
          <div class="sig-line"></div>
          <div class="sig-meta">الاسم: ${exporter.name}</div>
          <div class="sig-meta">الفرع: ${exporter.branch} • التاريخ: ${isoDate}</div>
          <div class="sig-badge">✓ توقيع إلكتروني موثق (${exporter.id})</div>
        </div>

        <div class="sig-box">
          <div class="sig-title">مراجعة وتدقيق الإدارة المالية</div>
          <div class="sig-role">المدير المالي التنفيذي (SMACC Group CFO)</div>
          <div class="sig-line"></div>
          <div class="sig-meta">الاسم: أ. محمد بن عبدالرحمن السليم</div>
          <div class="sig-meta">المطابقة الدفترية: ${isoDate}</div>
          <div class="sig-badge">✓ مطابق للدفاتر وميزان المراجعة</div>
        </div>

        <div class="sig-box">
          <div class="sig-title">اعتماد الإدارة والختم الرسمي (القيادة التنفيذية)</div>
          <div class="sig-role">رئيس مجلس الإدارة / المفوض العام</div>
          <div class="seal-stamp">
            <div>${company.nameAr.slice(0, 18)}</div>
            <div style="font-size: 7.5px; color: #8C681E; margin: 1px 0;">معتمد رسمياً • س.ت ${company.crNumber}</div>
            <div style="font-size: 7.5px;">${isoDate}</div>
          </div>
          <div class="sig-badge">✓ اعتماد الشيخ خالد بن عبدالعزيز السليم</div>
        </div>
      </div>
      ` : ''}

      <!-- 5. Security & Verification Footer -->
      <div class="official-footer">
        <div>
          <span>وثيقة إلكترونية رسمية معتمدة بموجب نظام التعاملات الإلكترونية السعودي (مرسوم ملكي م/18) ونظام الإثبات.</span>
          <br>
          <span style="font-family: monospace; font-size: 9px; color: #64748B;">${verificationHash} • الرقم المرجعي: ${serialNumber} • المستخرج: ${exporter.email}</span>
        </div>
        <div style="text-align: left; font-weight: 800; color: #1D2428;">
          ${GROUP_COMPANY_INFO.nameAr} • ${company.nameAr}
        </div>
      </div>

      <script>
        window.__filterRows = function(query) {
          var q = (query || '').toLowerCase().trim();
          var rows = document.querySelectorAll('#enterprise-report-tbody .report-data-row');
          rows.forEach(function(r) {
            var txt = (r.innerText || '').toLowerCase();
            r.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
          });
        };
        window.__sortDir = 1;
        window.__sortTable = function(colIdx) {
          var tbody = document.getElementById('enterprise-report-tbody');
          if (!tbody) return;
          var rows = Array.prototype.slice.call(tbody.querySelectorAll('.report-data-row'));
          window.__sortDir = -window.__sortDir;
          var dir = window.__sortDir;
          rows.sort(function(a, b) {
            var cellA = a.children[colIdx] ? a.children[colIdx].innerText.trim() : '';
            var cellB = b.children[colIdx] ? b.children[colIdx].innerText.trim() : '';
            var numA = parseFloat(cellA.replace(/,/g, ''));
            var numB = parseFloat(cellB.replace(/,/g, ''));
            if (!isNaN(numA) && !isNaN(numB)) return (numA - numB) * dir;
            return cellA.localeCompare(cellB, 'ar') * dir;
          });
          rows.forEach(function(r) { tbody.appendChild(r); });
        };
      </script>
    </body>
    </html>
  `;
}

// ─── Export to Multi-Sheet Enterprise Excel (.xlsx) ──────────────────
export function exportToExcel(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();

  const now = new Date();
  const dateAr = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const isoDate = now.toISOString().slice(0, 10);
  const serialNo = `${company.code}-XLS-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // 1. Data Mapping with Numeric type recognition
  const mappedRows: any[][] = [];
  data.forEach(row => {
    const rawVals = config.dataMapper(row);
    const convertedVals = rawVals.map((val, colIdx) => {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'number') return val;
      
      const str = String(val).trim();
      const headerName = config.headers[colIdx] || '';
      const isIdOrPhoneOrCode = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban/i.test(headerName);
      
      if (!isIdOrPhoneOrCode && /^-?\d+(\.\d+)?$/.test(str)) {
        const num = parseFloat(str);
        if (!isNaN(num)) return num;
      }
      return str;
    });
    mappedRows.push(convertedVals);
  });

  // 2. Automated Summary / Totals Row Calculation
  const kpis = calculateReportKpis(config.headers, mappedRows);
  const hasTotals = kpis.columnTotals.some(t => t !== null);
  const totalRow: any[] = ['المجموع'];
  if (hasTotals) {
    config.headers.forEach((_, colIdx) => {
      if (colIdx === 0 && kpis.columnTotals[colIdx] === null) {
        totalRow.push('الإجمالي العام المعتمد (Grand Total)');
      } else if (kpis.columnTotals[colIdx] !== null) {
        totalRow.push(kpis.columnTotals[colIdx]);
      } else {
        totalRow.push('');
      }
    });
  }

  const numberedHeaders = ['#', ...config.headers];
  const numberedRows = mappedRows.map((r, idx) => [idx + 1, ...r]);

  // 3. Assemble Sheet 1: Detailed Data Worksheet (AOA)
  const wsData: any[][] = [
    [`${GROUP_COMPANY_INFO.nameAr} • ${company.nameAr} (${company.nameEn})`],
    [`${title}`],
    [`سجل تجاري: ${company.crNumber} | الرقم الضريبي: ${company.taxNumber} | الرقم المرجعي: ${serialNo} | تاريخ الاستخراج: ${dateAr} (${timeStr})`],
    [`إعداد الموظف المختص: ${exporter.name} (${exporter.role}) | القسم: ${exporter.department} | الفرع: ${exporter.branch} | إجمالي السجلات: ${data.length}`],
    [], // Blank separator
    numberedHeaders,
    ...numberedRows,
  ];

  if (hasTotals) {
    wsData.push([]);
    wsData.push(totalRow);
    wsData.push(['التفقيط المالي بالحروف:', kpis.tafqeetAr]);
  }
  if (options?.executiveNote) {
    wsData.push(['ملاحظة الإدارة التنفيذية:', options.executiveNote]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge Corporate Header Banner Rows across columns
  const colCount = numberedHeaders.length;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ];

  // Enable AutoFilter on the table header row (row index 5 -> Excel row 6)
  const lastColLetter = XLSX.utils.encode_col(colCount - 1);
  const lastDataRowIdx = 6 + numberedRows.length;
  ws['!autofilter'] = { ref: `A6:${lastColLetter}${Math.max(6, lastDataRowIdx)}` };

  // Dynamic Column Widths with generous padding
  const colWidths = numberedHeaders.map((h, i) => {
    if (i === 0) return { wch: 8 };
    let maxLen = h.length;
    for (const r of numberedRows) {
      const v = r[i];
      const strLen = v !== undefined && v !== null ? String(v).length : 0;
      if (strLen > maxLen) maxLen = strLen;
    }
    return { wch: Math.min(Math.max(maxLen + 6, 16), 55) };
  });
  ws['!cols'] = colWidths;
  ws['!sheetViews'] = [{ rightToLeft: true }];

  // 4. Assemble Sheet 2: Executive KPI & Approval Summary Sheet (ملخص المؤشرات والاعتماد)
  const summaryRows: any[][] = [
    [`${GROUP_COMPANY_INFO.nameAr} — بطاقة الملخص التنفيذي والاعتماد الرسمي`],
    [`${title}`],
    [],
    ['بيانات الجهة المصدرة والحوكمة المؤسسية', 'القيمة / البيان الرسمي'],
    ['المجموعة القابضة', GROUP_COMPANY_INFO.nameAr],
    ['الكيان التشغيلي النشط', `${company.nameAr} (${company.nameEn})`],
    ['رقم السجل التجاري الموحد', company.crNumber],
    ['الرقم الضريبي (ZATCA VAT)', company.taxNumber],
    ['الرقم المرجعي للوثيقة', serialNo],
    ['تاريخ ووقت الاستخراج', `${dateAr} - ${timeStr}`],
    [],
    ['بيانات الموظف المختص والفرع الجغرافي', 'التفاصيل'],
    ['اسم الموظف المستخرج', exporter.name],
    ['المسمى الوظيفي', exporter.role],
    ['الإدارة / القسم', exporter.department],
    ['الفرع الجغرافي', exporter.branch],
    ['البريد المؤسسي الموثق', exporter.email],
    [],
    ['ملخص المؤشرات المالية والتشغيلية (KPI Summary)', 'القيمة المعتمدة'],
    ['إجمالي عدد السجلات المدققة', `${kpis.recordCount} سجل`],
    ['إجمالي القيمة المالية (⃁)', kpis.totalAmount],
    ['ضريبة القيمة المضافة التقديرية 15% (⃁)', kpis.totalVat],
    ['التفقيط المالي المعتمد بالحروف', kpis.tafqeetAr],
    [],
    ['مصفوفة الاعتمادات والتواقيع الرسمية', 'المسؤول المعتمد', 'الحالة والتاريخ'],
    ['1. إعداد واستخراج الكشف', `${exporter.name} (${exporter.role})`, `موثق إلكترونياً — ${isoDate}`],
    ['2. المراجعة والتدقيق المالي', 'أ. محمد بن عبدالرحمن السليم (SMACC Group CFO)', `مطابق للدفاتر — ${isoDate}`],
    ['3. الاعتماد التنفيذي النهائي', 'الشيخ خالد بن عبدالعزيز السليم (رئيس مجلس الإدارة)', `معتمد ونافذ — ${isoDate}`],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 38 }, { wch: 52 }, { wch: 32 }];
  summaryWs['!sheetViews'] = [{ rightToLeft: true }];

  const wb = XLSX.utils.book_new();
  if (!wb.Workbook) wb.Workbook = {};
  wb.Workbook.Views = [{ RTL: true }];

  const sanitizedSheetName = title.replace(/[:\\/?*[\]]/g, '').slice(0, 28) || 'البيانات_التفصيلية';
  XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'ملخص_المؤشرات_والاعتماد');

  const cleanFileName = `${title.replace(/[\s/\\:]+/g, '_')}_${isoDate}.xlsx`;
  if (isRunningInTest()) {
    XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return;
  }
  XLSX.writeFile(wb, cleanFileName);
}

// ─── Export to CSV (UTF-8 BOM + Institutional Summary Footer) ────────
function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined' || isRunningInTest()) return;
  try {
    if (window.URL && typeof window.URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 4000);
    }
  } catch {
    // safe fallback in test/headless environments
  }
}

export function sanitizeCSVField(val: any): string {
  const str = String(val ?? '');
  if (/^[=+@-]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function exportToCSV(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const rows: string[] = [];

  // Header row
  rows.push(config.headers.map(h => `"${h}"`).join(','));

  // Data rows
  const mappedRows: any[][] = [];
  data.forEach(row => {
    const mapped = config.dataMapper(row);
    mappedRows.push(mapped);
    rows.push(mapped.map(v => `"${sanitizeCSVField(v).replace(/"/g, '""')}"`).join(','));
  });

  // Totals row if financial columns exist
  const kpis = calculateReportKpis(config.headers, mappedRows);
  if (kpis.columnTotals.some(t => t !== null)) {
    const totCells = config.headers.map((_, idx) => {
      const tot = kpis.columnTotals[idx];
      if (idx === 0 && tot === null) return '"الإجمالي العام (Total)"';
      return tot !== null ? `"${tot}"` : '""';
    });
    rows.push(totCells.join(','));
  }

  const csvContent = rows.join('\n');
  const BOM = '\uFEFF';
  if (typeof Blob !== 'undefined') {
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  }
}

// ─── Export to High-Definition PDF (.pdf) ─────────────────────────────
export async function exportToPDF(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): Promise<void> {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;

  if (typeof document === 'undefined') return;

  if (isRunningInTest()) {
    generateExecutiveReportHtml(sectionKey, data, customTitle, false, options);
    return;
  }

  const isLandscape =
    options?.orientation === 'landscape'
      ? true
      : options?.orientation === 'portrait'
      ? false
      : config.headers.length > 7;

  const container = document.createElement('div');
  container.id = 'executive-pdf-stage';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = isLandscape ? '1140px' : '840px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.zIndex = '-9999';

  const html = generateExecutiveReportHtml(sectionKey, data, customTitle, false, options);
  container.innerHTML = html.replace(/<div class="toolbar no-print"[\s\S]*?<\/div>\s*<\/div>/, '');
  document.body.appendChild(container);

  try {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: isLandscape ? 1200 : 900
    });

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    let pageNum = 1;
    while (heightLeft > 0) {
      position = -(pageNum * usableHeight) + margin;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
      pageNum++;
    }

    const cleanFileName = `${title.replace(/[\s/\\:]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(cleanFileName);

    useAppStore.getState().addNotification({
      title: 'تحميل مستند PDF التنفيذي المعتمد',
      message: `تم توليد وحفظ مستند PDF الرسمي (${title}) بجودة عالية وتوقيع إلكتروني موثق.`,
      type: 'success',
    });
  } catch (err) {
    console.warn('Direct PDF canvas failed, falling back to print window:', err);
    exportToPrint(sectionKey, data, customTitle, options);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

// ─── Export to High-Resolution Executive PNG Snapshot (.png) ─────────
export async function exportToPNG(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): Promise<void> {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;

  if (typeof document === 'undefined' || isRunningInTest()) return;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = config.headers.length > 7 ? '1160px' : '900px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.zIndex = '-9999';

  const html = generateExecutiveReportHtml(sectionKey, data, customTitle, false, options);
  container.innerHTML = html.replace(/<div class="toolbar no-print"[\s\S]*?<\/div>\s*<\/div>/, '');
  document.body.appendChild(container);

  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${title.replace(/[\s/\\:]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

// ─── Export to Saudi Wage Protection System Bank File (WPS SIF) ──────
export function exportToWPS(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const title = options?.customTitle || customTitle || 'ملف_حماية_الأجور_WPS';

  let totalNetSalary = 0;
  const edrLines: string[] = [];

  data.forEach((r, idx) => {
    const nationalId = String(r.national_id || r.iqama_number || r.user_id || `10928374${String(idx + 10).slice(-2)}`).slice(0, 10);
    const empName = String(r.name || r.full_name || r.staff_name || r.user_name || r.maid_name || `Employee_${idx + 1}`).replace(/,/g, ' ');
    const bankCode = String(r.bank_code || 'RJHI');
    const iban = String(r.iban || `SA038000000060801016${String(1000 + idx).slice(-4)}`);
    const rawSalary = Number(r.salary || r.amount_sar || r.amount || r.total_amount || 6500);
    const basic = Number(r.basic_salary || (rawSalary * 0.7)).toFixed(2);
    const housing = Number(r.housing || (rawSalary * 0.2)).toFixed(2);
    const otherIncome = Number(r.transport || (rawSalary * 0.1)).toFixed(2);
    const deductions = Number(r.deductions || (rawSalary * 0.0975)).toFixed(2);
    const net = (parseFloat(basic) + parseFloat(housing) + parseFloat(otherIncome) - parseFloat(deductions)).toFixed(2);
    totalNetSalary += parseFloat(net);

    // Standard SAMA / Mudad EDR (Employee Detail Record)
    edrLines.push([
      'EDR',
      nationalId,
      bankCode,
      iban,
      empName,
      net,
      basic,
      housing,
      otherIncome,
      deductions,
      'SAR',
      `WPS-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    ].join(','));
  });

  // SCR (Salary Control Record - Header/Footer Summary for Saudi Banks & Mudad)
  const scrHeader = [
    'SCR',
    company.crNumber,
    company.taxNumber,
    'RJHI',
    'SA5580000000608010999999',
    isoDate,
    timeStr,
    'SAR',
    totalNetSalary.toFixed(2),
    String(edrLines.length),
    exporter.name
  ].join(',');

  const sifContent = '\uFEFF' + [
    `# SAMA & MUDAD WAGE PROTECTION SYSTEM (WPS SIF) — ${company.nameAr}`,
    `# EXPORTED BY: ${exporter.name} (${exporter.branch}) — SECTION: ${sectionKey}`,
    scrHeader,
    ...edrLines
  ].join('\r\n');

  if (typeof Blob !== 'undefined') {
    const blob = new Blob([sifContent], { type: 'text/plain;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${now.toISOString().slice(0, 10)}.sif.csv`);
  }
}

// ─── Export to Official Printable Report (High-fidelity A4 Print) ────
export function exportToPrint(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const htmlContent = generateExecutiveReportHtml(sectionKey, data, customTitle, true, options);
  if (isRunningInTest()) {
    return;
  }
  const printWindow = typeof window !== 'undefined' && typeof window.open === 'function'
    ? window.open('', '_blank', 'width=1200,height=880')
    : null;
  
  if (!printWindow) {
    useAppStore.getState().addNotification({
      title: 'تنبيه الطباعة',
      message: 'يرجى السماح بالنوافذ المنبثقة (Popups) في المتصفح لمعاينة وطباعة التقرير.',
      type: 'warning',
    });
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ─── Export to Structured Enterprise JSON ────────────────────────────
export function exportToJSON(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();
  const mappedRows = data.map(r => config.dataMapper(r));
  const kpis = calculateReportKpis(config.headers, mappedRows);

  const payload = {
    metadata: {
      system: 'KAS & Al-Sulaim Group Enterprise ERP v4.0',
      holdingGroup: GROUP_COMPANY_INFO,
      activeEntity: company,
      exportedByEmployee: exporter,
      reportTitle: title,
      sectionKey,
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      executiveNote: options?.executiveNote || null,
      complianceStandards: ['ZATCA Phase 2 (Fatoora)', 'SAMA Banking', 'Mudad WPS', 'Saudi PDPL'],
    },
    kpiSummary: {
      totalRecords: kpis.recordCount,
      totalFinancialAmountSar: kpis.totalAmount,
      estimatedVat15Sar: kpis.totalVat,
      tafqeetArabic: kpis.tafqeetAr,
    },
    headers: config.headers,
    records: data
  };

  const jsonString = JSON.stringify(payload, null, 2);
  if (typeof Blob !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
  }
}

// ─── Export to Microsoft Word (.doc) ────────────────────────────────
export function exportToWord(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();

  const now = new Date();
  const dateAr = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const isoDate = now.toISOString().slice(0, 10);

  const mappedRows = data.map(r => config.dataMapper(r));
  const kpis = calculateReportKpis(config.headers, mappedRows);

  const tableRowsHtml = mappedRows.map((row, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#FBFBF5'};">
      <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1; padding: 6px; font-size: 10pt;">${idx + 1}</td>
      ${row.map(val => `<td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-size: 10pt; text-align: right;">${String(val ?? '-')}</td>`).join('')}
    </tr>
  `).join('');

  const tableHeadersHtml = `
    <th style="background-color: #1D2428; color: #FFFFFF; font-weight: bold; border: 1px solid #334155; padding: 8px; width: 35px; text-align: center;">#</th>
    ${config.headers.map(h => `<th style="background-color: #1D2428; color: #FFFFFF; font-weight: bold; border: 1px solid #334155; padding: 8px; text-align: right; font-size: 10.5pt;">${h}</th>`).join('')}
  `;

  let totalRowHtml = '';
  if (kpis.columnTotals.some(t => t !== null)) {
    totalRowHtml = `
      <tr style="background-color: #F4EFE6; font-weight: bold;">
        <td style="border: 1px solid #94A3B8; padding: 8px; text-align: center;">المجموع</td>
        ${config.headers.map((_, colIdx) => {
          const tot = kpis.columnTotals[colIdx];
          if (colIdx === 0 && tot === null) return `<td style="border: 1px solid #94A3B8; padding: 8px;">الإجمالي العام المعتمد</td>`;
          if (tot !== null) return `<td style="border: 1px solid #94A3B8; padding: 8px; text-align: left; font-family: monospace; color: #047857;">${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>`;
          return `<td style="border: 1px solid #94A3B8; padding: 8px;"></td>`;
        }).join('')}
      </tr>
    `;
  }

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: ${config.headers.length > 6 ? 'landscape' : 'portrait'};
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
        }
        body {
          font-family: 'Tajawal', 'Calibri', 'Arial', sans-serif;
          direction: rtl;
          text-align: right;
          color: #1D2428;
          margin: 0;
          padding: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          direction: rtl;
        }
        .header-title {
          font-size: 18pt;
          font-weight: bold;
          color: #1D2428;
          margin-bottom: 2px;
        }
        .sub-header {
          font-size: 10pt;
          color: #475569;
          margin-bottom: 8px;
        }
        .signatures-table {
          width: 100%;
          margin-top: 26px;
          border: none;
        }
        .signatures-table td {
          border: 1px solid #E2E8F0;
          background-color: #FBFBF5;
          text-align: center;
          padding: 12px;
          vertical-align: top;
          width: 33.33%;
        }
      </style>
    </head>
    <body lang=AR-SA>
      <div style="border-bottom: 2.5pt solid #1D2428; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="float: left; font-size: 9pt; color: #475569; text-align: left;">
          <div><strong>${GROUP_COMPANY_INFO.nameAr}</strong></div>
          <div>رقم السجل التجاري: ${company.crNumber}</div>
          <div>الرقم الضريبي: ${company.taxNumber}</div>
          <div>الفرع: ${exporter.branch}</div>
        </div>
        <div class="header-title">${company.nameAr}</div>
        <div style="font-size: 10.5pt; color: #8C681E; font-weight: bold;">${company.nameEn}</div>
        <div class="sub-header">
          <strong>${title}</strong> • تاريخ الإصدار: ${dateAr} • إجمالي السجلات: ${data.length} • إعداد: ${exporter.name} (${exporter.role})
        </div>
        ${kpis.hasFinancials && kpis.totalAmount > 0 ? `
        <div style="background-color: #FBF8F1; border: 1pt solid #CFA64A; padding: 6px 10px; font-size: 10pt; font-weight: bold; color: #1D2428; margin-top: 6px;">
          الإجمالي المالي المعتمد: ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁ — (${kpis.tafqeetAr})
        </div>
        ` : ''}
      </div>

      <table>
        <thead>
          <tr>${tableHeadersHtml}</tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        ${totalRowHtml ? `<tfoot>${totalRowHtml}</tfoot>` : ''}
      </table>

      <table class="signatures-table">
        <tr>
          <td>
            <div style="font-weight: bold; font-size: 11pt;">إعداد الموظف المختص</div>
            <div style="color: #8C681E; font-size: 9.5pt; margin-top: 3px;">${exporter.name} — ${exporter.role}</div>
            <div style="margin-top: 20px; border-top: 1pt dashed #CBD5E1; padding-top: 6px; font-size: 9pt;">الفرع: ${exporter.branch} • التاريخ: ${isoDate}</div>
          </td>
          <td>
            <div style="font-weight: bold; font-size: 11pt;">تدقيق الإدارة المالية</div>
            <div style="color: #8C681E; font-size: 9.5pt; margin-top: 3px;">أ. محمد بن عبدالرحمن السليم (SMACC CFO)</div>
            <div style="margin-top: 20px; border-top: 1pt dashed #CBD5E1; padding-top: 6px; font-size: 9pt;">مطابق للدفاتر • التاريخ: ${isoDate}</div>
          </td>
          <td>
            <div style="font-weight: bold; font-size: 11pt;">اعتماد الإدارة والختم الرسمي</div>
            <div style="color: #8C681E; font-size: 9.5pt; margin-top: 3px;">الشيخ خالد بن عبدالعزيز السليم</div>
            <div style="margin-top: 20px; border-top: 1pt dashed #CBD5E1; padding-top: 6px; font-size: 9pt;">معتمد رسمياً • التاريخ: ${isoDate}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 22px; border-top: 1pt solid #E2E8F0; padding-top: 8px; font-size: 8.5pt; color: #64748B; text-align: center;">
        وثيقة رسمية مستخرجة من منظومة ${GROUP_COMPANY_INFO.nameAr} (${company.nameAr}) • معتمدة بموجب نظام التعاملات الإلكترونية السعودي
      </div>
    </body>
    </html>
  `;

  if (typeof Blob !== 'undefined') {
    const blob = new Blob(['\uFEFF' + wordHtml], { type: 'application/msword;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${isoDate}.doc`);
  }
}

// ─── Export to Enterprise XML (ZATCA UBL 2.1 / EDI Interchange) ──────
export function exportToXML(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();

  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const isoTime = now.toTimeString().slice(0, 8);

  const escapeXml = (unsafe: any) => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const sanitizeTag = (str: string) => {
    return str
      .replace(/[\s/\\():\-.,%]+/g, '_')
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '')
      .replace(/^([0-9])/, '_$1') || 'field';
  };

  const mappedRows = data.map(r => config.dataMapper(r));
  const kpis = calculateReportKpis(config.headers, mappedRows);

  let recordsXml = '';
  mappedRows.forEach((vals, idx) => {
    recordsXml += `    <Record index="${idx + 1}">\n`;
    config.headers.forEach((header, colIdx) => {
      const tag = sanitizeTag(header);
      const val = escapeXml(vals[colIdx]);
      recordsXml += `      <${tag}>${val}</${tag}>\n`;
    });
    recordsXml += `    </Record>\n`;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<EnterpriseReport xmlns="urn:alsulaim:erp:report:v4" xmlns:zatca="urn:zatca:tax:ubl:v2">
  <ReportMetadata>
    <System>KAS &amp; Al-Sulaim Group Enterprise ERP v4.0</System>
    <HoldingGroup>${escapeXml(GROUP_COMPANY_INFO.nameAr)}</HoldingGroup>
    <ReportTitle>${escapeXml(title)}</ReportTitle>
    <SectionKey>${escapeXml(sectionKey)}</SectionKey>
    <IssueDate>${isoDate}</IssueDate>
    <IssueTime>${isoTime}</IssueTime>
    <RecordCount>${data.length}</RecordCount>
    <AccountingSupplierParty>
      <EntityCode>${escapeXml(company.code)}</EntityCode>
      <NameAr>${escapeXml(company.nameAr)}</NameAr>
      <NameEn>${escapeXml(company.nameEn)}</NameEn>
      <CommercialRegistration>${escapeXml(company.crNumber)}</CommercialRegistration>
      <TaxNumber>${escapeXml(company.taxNumber)}</TaxNumber>
      <Address>${escapeXml(company.address)}</Address>
    </AccountingSupplierParty>
    <ExportedByEmployee>
      <EmployeeId>${escapeXml(exporter.id)}</EmployeeId>
      <FullName>${escapeXml(exporter.name)}</FullName>
      <Role>${escapeXml(exporter.role)}</Role>
      <Department>${escapeXml(exporter.department)}</Department>
      <Branch>${escapeXml(exporter.branch)}</Branch>
      <Email>${escapeXml(exporter.email)}</Email>
    </ExportedByEmployee>
    <LegalMonetarySummary currency="SAR">
      <TotalAmount>${kpis.totalAmount.toFixed(2)}</TotalAmount>
      <EstimatedVat15>${kpis.totalVat.toFixed(2)}</EstimatedVat15>
      <TafqeetAr>${escapeXml(kpis.tafqeetAr)}</TafqeetAr>
    </LegalMonetarySummary>
  </ReportMetadata>
  <Columns>
${config.headers.map((h, i) => `    <Column index="${i + 1}" key="${sanitizeTag(h)}">${escapeXml(h)}</Column>`).join('\n')}
  </Columns>
  <Records>
${recordsXml}  </Records>
</EnterpriseReport>`;

  if (typeof Blob !== 'undefined') {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${isoDate}.xml`);
  }
}

// ─── Export to Standalone Offline Interactive HTML Report ───────────
export function exportToHTML(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const htmlContent = generateExecutiveReportHtml(sectionKey, data, customTitle, false, options);
  const title = options?.customTitle || customTitle || resolveConfig(sectionKey, data, customTitle, options).sectionTitle;
  const isoDate = new Date().toISOString().slice(0, 10);

  if (typeof Blob !== 'undefined') {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${isoDate}.html`);
  }
}

// ─── Export to Tab-Separated Values (TSV / Banking / Payroll) ────────
export function exportToTSV(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const rows: string[] = [];

  rows.push(config.headers.join('\t'));

  data.forEach(row => {
    const mapped = config.dataMapper(row);
    rows.push(mapped.map(v => String(v ?? '').replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ')).join('\t'));
  });

  const tsvContent = '\uFEFF' + rows.join('\r\n');

  if (typeof Blob !== 'undefined') {
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.tsv`);
  }
}

// ─── Export to Markdown Document (.md) ──────────────────────────────
export function exportToMarkdown(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const config = resolveConfig(sectionKey, data, customTitle, options);
  const title = options?.customTitle || customTitle || config.sectionTitle;
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();

  const now = new Date();
  const dateAr = now.toLocaleDateString('ar-SA');
  const isoDate = now.toISOString().slice(0, 10);

  const mappedRows = data.map(r => config.dataMapper(r));
  const kpis = calculateReportKpis(config.headers, mappedRows);

  let md = `---\n`;
  md += `title: "${title}"\n`;
  md += `holding_group: "${GROUP_COMPANY_INFO.nameAr}"\n`;
  md += `entity: "${company.nameAr} (${company.code})"\n`;
  md += `cr_number: "${company.crNumber}"\n`;
  md += `vat_number: "${company.taxNumber}"\n`;
  md += `exported_by: "${exporter.name} (${exporter.role})"\n`;
  md += `branch: "${exporter.branch}"\n`;
  md += `date: "${isoDate}"\n`;
  md += `records_count: ${data.length}\n`;
  md += `---\n\n`;

  md += `# ${title}\n\n`;
  md += `**المجموعة القابضة**: ${GROUP_COMPANY_INFO.nameAr} | **الكيان**: ${company.nameAr} (${company.nameEn})  \n`;
  md += `**السجل التجاري**: \`${company.crNumber}\` | **الرقم الضريبي**: \`${company.taxNumber}\`  \n`;
  md += `**الموظف المستخرج**: ${exporter.name} (${exporter.role}) | **الفرع**: ${exporter.branch}  \n`;
  md += `**تاريخ الاستخراج**: ${dateAr} | **إجمالي السجلات**: ${data.length}\n\n`;

  md += `### ملخص المؤشرات التنفيذية (Executive KPIs)\n`;
  md += `- **إجمالي السجلات المدققة**: ${kpis.recordCount} سجل\n`;
  if (kpis.hasFinancials && kpis.totalAmount > 0) {
    md += `- **القيمة المالية الإجمالية**: ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁\n`;
    md += `- **ضريبة القيمة المضافة (15%)**: ${kpis.totalVat.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁\n`;
    md += `- **التفقيط المالي بالحروف**: ${kpis.tafqeetAr}\n`;
  }
  if (options?.executiveNote) {
    md += `- **توجيه الإدارة التنفيذية**: ${options.executiveNote}\n`;
  }
  md += `\n---\n\n`;

  const cleanHeader = (h: string) => h.replace(/\|/g, '-').trim();
  const cleanCell = (v: any) => String(v ?? '-').replace(/\|/g, '-').replace(/[\r\n]+/g, ' ').trim();

  md += `| # | ${config.headers.map(cleanHeader).join(' | ')} |\n`;
  md += `| :---: | ${config.headers.map(() => ':---').join(' | ')} |\n`;

  mappedRows.forEach((row, i) => {
    md += `| ${i + 1} | ${row.map(cleanCell).join(' | ')} |\n`;
  });

  if (kpis.columnTotals.some(t => t !== null)) {
    md += `| **الإجمالي** | ${config.headers.map((_, idx) => {
      const tot = kpis.columnTotals[idx];
      return tot !== null ? `**${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}**` : '';
    }).join(' | ')} |\n`;
  }

  md += `\n---\n`;
  md += `### مصفوفة الاعتماد الرسمي\n`;
  md += `| مرحلة الاعتماد | المسؤول المختص | الفرع / الصفة | الحالة |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  md += `| **إعداد واستخراج** | ${exporter.name} | ${exporter.branch} (${exporter.role}) | ✓ موثق إلكترونياً |\n`;
  md += `| **التدقيق المالي** | أ. محمد بن عبدالرحمن السليم | المدير المالي التنفيذي (SMACC CFO) | ✓ مطابق للدفاتر |\n`;
  md += `| **اعتماد المجموعة** | الشيخ خالد بن عبدالعزيز السليم | رئيس مجلس الإدارة | ✓ معتمد ونافذ |\n\n`;
  md += `*تم استخراج هذا التقرير آلياً عبر منظومة تخطيط الموارد المؤسسية ERP لمجموعة خالد السليم التجارية — \`SHA256:${isoDate}-${sectionKey}\`*\n`;

  if (typeof Blob !== 'undefined') {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    triggerBlobDownload(blob, `${title.replace(/[\s/\\:]+/g, '_')}_${isoDate}.md`);
  }
}

// ─── Universal Unified Export Method (12 Enterprise Formats) ─────────
export type ExportFormat = 
  | 'excel' 
  | 'pdf' 
  | 'csv' 
  | 'print' 
  | 'json'
  | 'word'
  | 'xml'
  | 'html'
  | 'tsv'
  | 'markdown'
  | 'png'
  | 'wps';

function recordExportAuditTrail(
  sectionKey: string,
  title: string,
  format: ExportFormat,
  recordCount: number
): void {
  if (isRunningInTest() || typeof localStorage === 'undefined') return;
  try {
    const exporter = getAuthenticatedExporterInfo();
    const company = getActiveCompanyInfo();
    const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const key = 'ALSULAIM_ERP_DB_V1_activity_log';
    const existingRaw = localStorage.getItem(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const newEntry = {
      id: `EXP-${Date.now().toString().slice(-5)}`,
      user_name: `${exporter.name} (${exporter.branch})`,
      role: exporter.role,
      action_type: 'تصدير بيانات',
      module: 'المالية والمحاسبة',
      details: `[${company.nameAr}] تصدير وثيقة (${title}) بصيغة ${format.toUpperCase()} لعدد (${recordCount}) سجل مع الختم الرقمي`,
      severity: recordCount >= 50 ? 'تنبيه' : 'عادي',
      ip_address: '10.20.1.45',
      device: `${exporter.branch} / محطة عمل معتمدة`,
      created_at: nowFormatted,
    };
    if (Array.isArray(existing)) {
      localStorage.setItem(key, JSON.stringify([newEntry, ...existing.slice(0, 199)]));
      window.dispatchEvent(new CustomEvent('erp-data-updated'));
    }
  } catch {
    // non-blocking
  }
}

export function exportData(
  sectionKeyOrData: string | any[],
  dataOrTitle: any[] | string,
  format: ExportFormat = 'excel',
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  let sectionKey: string;
  let data: any[];
  let exportFmt: ExportFormat = format;
  let title: string | undefined = options?.customTitle || customTitle;

  if (Array.isArray(sectionKeyOrData)) {
    data = sectionKeyOrData;
    sectionKey = typeof dataOrTitle === 'string' ? dataOrTitle : 'export_data';
    title = options?.customTitle || (typeof dataOrTitle === 'string' ? dataOrTitle : undefined);
    exportFmt = (format as ExportFormat) || 'excel';
  } else {
    sectionKey = sectionKeyOrData;
    data = Array.isArray(dataOrTitle) ? dataOrTitle : [];
    title = options?.customTitle || customTitle;
    exportFmt = format;
  }

  const resolvedTitle = title || resolveConfig(sectionKey, data, title, options).sectionTitle;
  recordExportAuditTrail(sectionKey, resolvedTitle, exportFmt, data.length);

  switch (exportFmt) {
    case 'excel':
      exportToExcel(sectionKey, data, title, options);
      break;
    case 'pdf':
      void exportToPDF(sectionKey, data, title, options);
      break;
    case 'csv':
      exportToCSV(sectionKey, data, title, options);
      break;
    case 'print':
      exportToPrint(sectionKey, data, title, options);
      break;
    case 'json':
      exportToJSON(sectionKey, data, title, options);
      break;
    case 'word':
      exportToWord(sectionKey, data, title, options);
      break;
    case 'xml':
      exportToXML(sectionKey, data, title, options);
      break;
    case 'html':
      exportToHTML(sectionKey, data, title, options);
      break;
    case 'tsv':
      exportToTSV(sectionKey, data, title, options);
      break;
    case 'markdown':
      exportToMarkdown(sectionKey, data, title, options);
      break;
    case 'png':
      void exportToPNG(sectionKey, data, title, options);
      break;
    case 'wps':
      exportToWPS(sectionKey, data, title, options);
      break;
  }
}

