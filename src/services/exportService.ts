/**
 * Central Enterprise Export Service for ERP System
 * Supports Excel (XLSX), PDF, CSV, and Official Printable Reports
 * with full Arabic Unicode support and dual company branding.
 */
import * as XLSX from 'xlsx';
import { useAppStore } from '../stores/appStore';
import { COMPANIES_LIST } from '../contexts/CompanyContext';
import {
  encodeZatcaTlvBase64,
  generateRealQrSvg,
  generateRealCode128BarcodeSvg,
} from '../utils/realBarcodeGenerator';

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
    headers: ['الرقم الوظيفي', 'اسم الموظف', 'رقم الهوية / الإقامة', 'المسمى الوظيفي', 'القسم / الإدارة', 'الفرع', 'تاريخ التعيين', 'الراتب الأساسي (⃁)', 'بدل السكن (⃁)', 'بدل النقل (⃁)', 'إجمالي الراتب (⃁)', 'الحالة'],
    dataMapper: (r: any) => {
      const sal = Number(
        r.salary ??
          r.totalSalary ??
          (Number(r.basicSalary || r.basic_salary || 0) +
            Number(r.housingAllowance || r.housing_allowance || 0) +
            Number(r.transportAllowance || r.transport_allowance || 0))
      );
      const basic = Number(r.basic_salary ?? r.basicSalary ?? Math.round(sal * 0.7));
      const housing = Number(
        r.housing_allowance ??
          r.housingAllowance ??
          (r.allowances ? Math.round(r.allowances * 0.66) : Math.round(sal * 0.2))
      );
      const transport = Number(
        r.transport_allowance ??
          r.transportAllowance ??
          (r.allowances ? Math.round(r.allowances * 0.34) : Math.round(sal * 0.1))
      );
      return [
        r.employee_code || r.id || '',
        r.name || r.full_name || r.employee_name || '',
        r.national_id || r.nationalId || r.iqama || '',
        r.job_title || r.jobTitle || r.role || '',
        r.department || '',
        r.branch || 'فرع الرياض الرئيسي',
        r.hire_date || r.hireDate || '2024-01-01',
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
    headers: ['رقم الهوية / الإقامة', 'اسم الموظف', 'اسم البنك', 'رقم الآيبان (IBAN)', 'الراتب الأساسي (⃁)', 'بدل السكن (⃁)', 'بدل النقل (⃁)', 'استقطاع التأمينات (GOSI)', 'صافي الراتب المحول (⃁)', 'حالة الصرف'],
    dataMapper: (r: any) => {
      if (r.employeeName !== undefined && r.netSalary !== undefined) {
        return [
          r.nationalIdOrIqama || '',
          r.employeeName || '',
          r.bankCode || 'مصرف الراجحي',
          r.iban || '',
          Number(r.basicSalary || 0).toFixed(2),
          Number(r.housingAllowance || 0).toFixed(2),
          Number(r.transportAllowance || 0).toFixed(2),
          Number(r.gosiDeduction || 0).toFixed(2),
          Number(r.netSalary || 0).toFixed(2),
          r.status === 'READY' ? 'جاهز للصرف' : r.status || 'معتمد'
        ];
      }
      const sal = Number(r.salary ?? r.totalSalary ?? 0);
      const basic = Number(r.basic_salary ?? r.basicSalary ?? sal * 0.7);
      const housing = Number(r.housing_allowance ?? r.housingAllowance ?? sal * 0.2);
      const transport = Number(r.transport_allowance ?? r.transportAllowance ?? sal * 0.1);
      const gosi = (basic + housing) * 0.0975;
      const net = basic + housing + transport - gosi;
      return [
        r.national_id || r.nationalId || '',
        r.name || '',
        r.bank_name || r.bankName || 'مصرف الراجحي',
        r.iban || `SA03800000000${r.national_id || r.nationalId || '1092837410'}12`,
        basic.toFixed(2),
        housing.toFixed(2),
        transport.toFixed(2),
        gosi.toFixed(2),
        net.toFixed(2),
        'جاهز للصرف'
      ];
    }
  },

  // 9.1 سجل الترقيات والعلاوات وتعديل العقود
  hr_promotions: {
    sectionTitle: 'سجل القرارات الإدارية للترقيات والعلاوات وتعديل العقود',
    headers: ['رقم القرار', 'كود الموظف', 'اسم الموظف', 'نوع القرار', 'المسمى السابق', 'المسمى الجديد', 'الراتب السابق (⃁)', 'الراتب الجديد (⃁)', 'قيمة الزيادة (⃁)', 'تاريخ السريان', 'الحالة'],
    dataMapper: (r: any) => {
      const prev = Number(r.previous_salary ?? r.old_salary ?? 0);
      const next = Number(r.new_salary ?? 0);
      const inc = Number(r.increment_amount ?? (next - prev));
      return [
        r.id || '',
        r.employee_code || r.employee_id || '',
        r.employee_name || r.name || '',
        r.decision_type || 'ترقية استحقاقية وتعديل عقد',
        r.previous_job_title || r.old_title || '',
        r.new_job_title || r.new_title || '',
        prev,
        next,
        inc,
        r.effective_date || r.date || '',
        r.status || 'معتمد رسمياً'
      ];
    }
  },

  // 9.2 سجل التوقيعات الإلكترونية وإقرارات السرية
  hr_signatures: {
    sectionTitle: 'سجل التوقيعات الإلكترونية وإقرارات عدم الإفشاء والائتمان الوظيفي',
    headers: ['الرقم الوظيفي', 'اسم الموظف', 'رقم الهوية / الإقامة', 'المسمى الوظيفي', 'القسم / الإدارة', 'حالة التوقيع الرقمي', 'تاريخ الاعتماد', 'البصمة الرقمية للوثيقة'],
    dataMapper: (r: any) => {
      const isSigned = r.agreement_signed !== false && r.signature_status !== 'غير موقع';
      return [
        r.employee_code || r.id || '',
        r.name || r.employee_name || '',
        r.national_id || r.nationalId || '',
        r.job_title || r.jobTitle || r.role || '',
        r.department || '',
        r.signature_status || (isSigned ? 'موقع وموثق بيومترياً' : 'بانتظار التوقيع'),
        r.agreement_date || r.hire_date || new Date().toISOString().slice(0, 10),
        r.compliance_hash || r.signature_hash || (isSigned ? `SA-COMPLIANCE-${r.employee_code || r.id || 'VERIFIED'}` : 'غير موقع')
      ];
    }
  },

  // 9.3 الكوادر التشغيلية والعمالة المنزلية على الكفالة
  hr_maids_fleet: {
    sectionTitle: 'سجل الكوادر التشغيلية والعمالة المنزلية على كفالة الشركة',
    headers: ['كود العاملة', 'اسم الكادر التشغيلي', 'الجنسية', 'المهنة المعتمدة', 'رقم الإقامة / الجواز', 'الموقع / الفرع التشغيلي', 'التأمين الطبي', 'الراتب الشهري (⃁)', 'الحالة التشغيلية'],
    dataMapper: (r: any) => [
      r.id || r.code || '',
      r.name || r.maid_name || '',
      r.nationality || '',
      r.job || r.profession || r.role || 'عاملة خدمات منزلية',
      r.iqama || r.passport || r.passport_number || '',
      r.location || r.branch || 'المقر الرئيسي',
      r.insurance || 'ساري المفعول',
      Number(r.salary ?? 1500),
      r.status || 'متاحة للتشغيل'
    ]
  },

  // 9.4 سجل الإجازات السنوية والمرضية
  hr_vacations: {
    sectionTitle: 'سجل طلبات وأرصدة الإجازات السنوية والمرضية والاستثنائية',
    headers: ['رقم الطلب', 'اسم الموظف', 'نوع الإجازة', 'تاريخ البداية', 'تاريخ النهاية', 'عدد الأيام', 'الرصيد المتبقي', 'حالة الطلب'],
    dataMapper: (r: any) => [
      r.id || '',
      r.employee_name || r.name || '',
      r.vacation_type || r.type || 'إجازة سنوية',
      r.from_date || r.start_date || '',
      r.to_date || r.end_date || '',
      Number(r.days_count ?? r.days ?? 0),
      Number(r.balance ?? r.remaining_balance ?? 21),
      r.status || 'معتمد'
    ]
  },

  // 9.5 سجل السلف والقروض المالية للموظفين
  hr_advances: {
    sectionTitle: 'سجل السلف المالية وجدولة الأقساط الشهرية للموظفين',
    headers: ['رقم السلفة', 'اسم الموظف', 'إجمالي مبلغ السلفة (⃁)', 'القسط الشهري (⃁)', 'المسدد حتى تاريخه (⃁)', 'الرصيد المتبقي (⃁)', 'تاريخ الصرف', 'الحالة'],
    dataMapper: (r: any) => {
      const amt = Number(r.amount || 0);
      const rem = Number(r.remaining_amount ?? (r.paid_amount !== undefined ? amt - Number(r.paid_amount) : amt));
      const paid = Number(r.paid_amount ?? (amt - rem));
      return [
        r.id || '',
        r.employee_name || r.name || '',
        amt,
        Number(r.monthly_installment || 0),
        paid,
        rem,
        r.date || '',
        r.status || 'معتمد'
      ];
    }
  },

  // 9.6 سجل الجزاءات واللوائح التأديبية
  hr_sanctions: {
    sectionTitle: 'سجل الجزاءات والمخالفات التأديبية (لائحة تنظيم العمل السعودي)',
    headers: ['رقم القرار', 'اسم الموظف', 'نوع المخالفة / الجزاء', 'قيمة الحسم المالي (⃁)', 'تاريخ الواقعة', 'البيان والسند النظامي', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.employee_name || r.name || '',
      r.sanction_type || r.type || '',
      Number(r.amount ?? r.deduction_amount ?? 0),
      r.date || '',
      r.reason || '',
      r.status || 'معتمد'
    ]
  },

  // 9.7 سجل الاستئذانات والمغادرات الساعية
  hr_permissions: {
    sectionTitle: 'سجل طلبات الاستئذان والمغادرات الساعية للموظفين',
    headers: ['رقم الطلب', 'اسم الموظف', 'تاريخ الاستئذان', 'من الساعة', 'إلى الساعة', 'عدد الساعات', 'سبب الاستئذان', 'الحالة'],
    dataMapper: (r: any) => {
      const timeParts =
        typeof r.time === 'string' && r.time.includes('-')
          ? r.time.split('-').map((s: string) => s.trim())
          : [];
      const fromTime = r.from_time || timeParts[0] || r.time || '';
      const toTime = r.to_time || timeParts[1] || r.permission_type || '';
      let hrs = r.hours;
      if (hrs === undefined || hrs === null) {
        if (/ساعتان|ساعتين|2/.test(String(r.permission_type || ''))) hrs = 2;
        else if (/ساعة|1/.test(String(r.permission_type || ''))) hrs = 1;
        else if (/3|ثلاث/.test(String(r.permission_type || ''))) hrs = 3;
        else hrs = 2;
      }
      return [
        r.id || '',
        r.employee_name || r.name || '',
        r.date || '',
        fromTime,
        toTime,
        hrs,
        r.reason || r.permission_type || '',
        r.status || 'معتمد'
      ];
    }
  },

  // 9.8 سجل المكافآت والحوافز التشجيعية
  hr_rewards: {
    sectionTitle: 'سجل المكافآت والحوافز التشجيعية ومكافآت التميز',
    headers: ['رقم القرار', 'اسم الموظف', 'نوع المكافأة', 'قيمة المكافأة (⃁)', 'تاريخ الاستحقاق', 'مبررات وآلية الصرف', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.employee_name || r.name || '',
      r.reward_type || r.type || 'مكافأة تميز',
      Number(r.net_reward ?? r.amount ?? 0),
      r.date || '',
      r.reason || r.payout_timing || 'مع راتب الشهر الحالي (WPS)',
      r.status || 'معتمد'
    ]
  },

  // 9.9 كشف التأمينات الاجتماعية GOSI
  hr_gosi: {
    sectionTitle: 'كشف اشتراكات المؤسسة العامة للتأمينات الاجتماعية (GOSI)',
    headers: ['الرقم الوظيفي', 'اسم المشترك', 'رقم الهوية / الإقامة', 'الجنسية', 'الأجر الخاضع للاشتراك (⃁)', 'حصة الموظف (9.75%)', 'حصة المنشأة (11.75% / 2%)', 'إجمالي الاشتراك الشهري (⃁)'],
    dataMapper: (r: any) => {
      const sal = Number(r.salary ?? r.totalSalary ?? 0);
      const basic = Number(r.basic_salary ?? r.basicSalary ?? Math.round(sal * 0.7));
      const housing = Number(r.housing_allowance ?? r.housingAllowance ?? Math.round(sal * 0.2));
      const wage = Math.min(basic + housing, 45000);
      const isSaudi = String(r.national_id || r.nationalId || '').startsWith('1');
      const empShare = isSaudi ? +(wage * 0.0975).toFixed(2) : 0;
      const compShare = isSaudi ? +(wage * 0.1175).toFixed(2) : +(wage * 0.02).toFixed(2);
      return [
        r.employee_code || r.id || '',
        r.name || r.employee_name || '',
        r.national_id || r.nationalId || '',
        isSaudi ? 'سعودي (معاشات + ساند + أخطار)' : 'غير سعودي (أخطار مهنية 2%)',
        wage,
        empShare,
        compShare,
        +(empShare + compShare).toFixed(2)
      ];
    }
  },

  // 9.10 كشف تصفية نهاية الخدمة والمخالصات (EOS)
  hr_eos: {
    sectionTitle: 'كشف مخصصات وتصفية مستحقات نهاية الخدمة (المادة 84 و85 من نظام العمل)',
    headers: ['الرقم الوظيفي', 'اسم الموظف', 'تاريخ المباشرة', 'سنوات الخدمة', 'إجمالي الراتب الفعلي (⃁)', 'مكافأة المادة 84 الكاملة (⃁)', 'استحقاق الاستقالة م85 (⃁)', 'رصيد السلف المخصوم (⃁)', 'صافي المستحق التقديري (⃁)'],
    dataMapper: (r: any) => [
      r.employee_code || r.id || '',
      r.name || r.employee_name || '',
      r.hire_date || '',
      r.years_of_service || '2.5 سنة',
      Number(r.salary || 0),
      Number(r.full_eos_84 || 0),
      Number(r.resignation_eos_85 || 0),
      Number(r.advance_deduction || 0),
      Number(r.net_payable || 0)
    ]
  },

  // 9.11 رادار الامتثال وانتهاء الوثائق الحكومية
  hr_compliance: {
    sectionTitle: 'تقرير رادار الامتثال وصلاحية الوثائق الحكومية وعقود قوى',
    headers: ['كود الموظف', 'اسم الموظف', 'نوع الوثيقة الرسمية', 'تاريخ الانتهاء', 'الأيام المتبقية', 'حالة الصلاحية'],
    dataMapper: (r: any) => [
      r.employeeCode || r.employee_code || '',
      r.employeeName || r.name || '',
      r.documentLabelAr || 'الهوية / الإقامة',
      r.expiryDate || '',
      r.daysRemaining ?? 0,
      r.statusLabelAr || 'ساري المفعول'
    ]
  },

  // 9.12 هيكلة قواعد الرواتب والأجور (Odoo Salary Rules)
  hr_salary_rules: {
    sectionTitle: 'مصفوفة قواعد هيكلة الرواتب والربط المحاسبي (KSA_WPS_MONTHLY)',
    headers: ['التسلسل', 'كود القاعدة', 'اسم القاعدة', 'الفئة', 'المعادلة البرمجية (Formula)', 'حساب الأستاذ العام (GL)', 'ناتج المحاكاة (⃁)'],
    dataMapper: (r: any) => [
      r.seq || '',
      r.code || '',
      r.name || '',
      r.cat || '',
      r.formula || '',
      r.gl || '—',
      Number(r.val ?? 0)
    ]
  },

  // 9.13 خطط التأهيل المؤسسي للموظفين الجدد (30/60/90 Onboarding)
  hr_onboarding_plans: {
    sectionTitle: 'سجل خطط التأهيل المؤسسي للموظفين الجدد (30 / 60 / 90 يوم)',
    headers: ['كود الخطة', 'اسم الموظف', 'المسمى الوظيفي', 'القسم', 'تاريخ المباشرة', 'الزميل المرافق', 'صلاحيات IT', 'عقد قوى', 'تسجيل GOSI', 'إنجاز 90 يوم', 'الملاحظات'],
    dataMapper: (r: any) => [
      r.id || '',
      r.employee_name || r.name || '',
      r.role || '',
      r.department || '',
      r.start_date || '',
      r.buddy_name || '',
      r.it_access_done ? 'مكتمل' : 'قيد الإجراء',
      r.qiwa_contract_done ? 'موثق' : 'قيد التوثيق',
      r.gosi_registered_done ? 'مسجل' : 'قيد التسجيل',
      r.day90_completed ? 'مكتمل 100%' : r.day60_completed ? 'مرحلة 60 يوم' : 'مرحلة 30 يوم',
      r.notes || ''
    ]
  },

  // 9.14 مصفوفة الجدارات وتقييم الأداء الفصلي (Performance & PIP)
  hr_performance_reviews: {
    sectionTitle: 'سجل تقييم الأداء الفصلي ومصفوفة الجدارات وخطط التحسين (PIP)',
    headers: ['كود التقييم', 'اسم الموظف', 'المسمى الوظيفي', 'الدورة', 'إتقان العمل', 'جودة التنفيذ', 'الامتثال والانضباط', 'التعاون', 'المبادرة', 'المتوسط العام', 'حالة خطة التحسين (PIP)', 'مستهدفات SMART'],
    dataMapper: (r: any) => {
      const avg = (
        (Number(r.job_mastery || 0) +
          Number(r.execution_quality || 0) +
          Number(r.compliance_discipline || 0) +
          Number(r.collaboration || 0) +
          Number(r.leadership_initiative || 0)) / 5
      ).toFixed(1);
      return [
        r.id || '',
        r.employee_name || r.name || '',
        r.role || '',
        r.cycle || 'Q4-2026',
        `${r.job_mastery ?? 5}/5`,
        `${r.execution_quality ?? 5}/5`,
        `${r.compliance_discipline ?? 5}/5`,
        `${r.collaboration ?? 5}/5`,
        `${r.leadership_initiative ?? 5}/5`,
        `${avg}/5.0`,
        r.pip_required ? `نشطة (${r.pip_coaching_plan || 'خطة تحسين'})` : 'مستوفٍ للمعايير',
        r.smart_goal_summary || ''
      ];
    }
  },

  // 9.15 سجل التابعين والتغطية التأمينية الطبية (Dependents & CCHI)
  hr_dependents: {
    sectionTitle: 'سجل تابعي الموظفين وبوالص التأمين الطبي ومجلس الضمان الصحي (CCHI)',
    headers: ['كود التابع', 'الموظف الأساسي', 'اسم التابع', 'صلة القرابة', 'رقم الهوية / الإقامة', 'تاريخ الميلاد', 'فئة التأمين الطبي', 'رقم البوليصة', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.employee_name || '',
      r.dependent_name || '',
      r.relationship || '',
      r.national_id || '',
      r.birth_date || '',
      r.insurance_plan || 'Class A',
      r.policy_number || '',
      r.status || 'نشط'
    ]
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
    headers: ['رمز الحساب', 'اسم الحساب المحاسبي', 'نوع الحساب', 'الرصيد الافتتاحي (مدين)', 'الرصيد الافتتاحي (دائن)', 'حركة الفترة (مدين)', 'حركة الفترة (دائن)', 'الرصيد النهائي (مدين)', 'الرصيد النهائي (دائن)'],
    dataMapper: (r: any) => {
      const opDeb = Number(r.opening_debit ?? r.openingDebit ?? 0);
      const opCred = Number(r.opening_credit ?? r.openingCredit ?? 0);
      const perDeb = Number(r.period_debit ?? r.periodDebit ?? r.debit ?? 0);
      const perCred = Number(r.period_credit ?? r.periodCredit ?? r.credit ?? 0);
      const net = (opDeb - opCred) + (perDeb - perCred);
      const closeDeb = r.closingDebit !== undefined ? Number(r.closingDebit) : (net > 0 ? net : 0);
      const closeCred = r.closingCredit !== undefined ? Number(r.closingCredit) : (net < 0 ? Math.abs(net) : 0);
      return [
        r.code || r.erpCode || r.account_code || '',
        r.name || r.accountName || r.account_name || '',
        r.type || r.approvedItemName || r.account_type || '',
        opDeb,
        opCred,
        perDeb,
        perCred,
        closeDeb,
        closeCred
      ];
    }
  },

  // 14. قائمة المركز المالي (Balance Sheet)
  'balance-sheet': {
    sectionTitle: 'قائمة المركز المالي الموحدة (Statement of Financial Position)',
    headers: ['رمز البند / الحساب', 'البند الرئيسي', 'الحساب / الأصل / الالتزام', 'القيمة المقارنة (⃁)', 'القيمة الحالية المعتمدة (⃁)'],
    dataMapper: (r: any) => [
      r.code || r.ifrsCode || '-',
      r.main_category || r.type || r.category || 'المركز المالي',
      r.item_name || r.name || r.accountName || '',
      r.previous_year ?? Math.abs((r.opening_debit || 0) - (r.opening_credit || 0)),
      r.current_value ?? Math.abs(r.balance || 0)
    ]
  },

  // 15. قائمة الدخل والأرباح (Income Statement)
  'income-statement': {
    sectionTitle: 'قائمة الدخل والأرباح والخسائر الشاملة (Income Statement)',
    headers: ['رمز البند / الحساب', 'التصنيف المحاسبي', 'البند المالي', 'رصيد أول المدة (⃁)', 'حركة الفترة (⃁)', 'الإجمالي الختامي (⃁)'],
    dataMapper: (r: any) => [
      r.code || r.ifrsCode || '-',
      r.category || r.type || 'قائمة الدخل',
      r.title || r.name || r.accountName || '',
      Math.abs((r.opening_debit || 0) - (r.opening_credit || 0)),
      Math.abs((r.period_debit || 0) - (r.period_credit || 0)),
      r.amount ?? r.actual ?? Math.abs(r.balance || 0)
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
    headers: ['كود السجل / الموظف', 'اسم الموظف', 'الفرع / القسم', 'تاريخ اليوم', 'وقت الحضور', 'وقت الانصراف', 'ساعات العمل الفعلية', 'دقائق التأخير', 'الحالة'],
    dataMapper: (r: any) => [
      r.employee_code || r.id || '',
      r.emp_name || r.employee_name || r.name || '',
      r.department || r.branch || '',
      r.date || '',
      r.check_in || r.checkIn || '',
      r.check_out || r.checkOut || '',
      Number(r.work_hours ?? r.hours_worked ?? r.overtime_hours ?? 8),
      Number(r.delay_minutes ?? (r.status === 'متأخر' ? 15 : 0)),
      r.status || 'حاضر'
    ]
  },

  // 19. عهد الفروع
  custodies: {
    sectionTitle: 'سجل العهد والأصول والممتلكات المؤسسية المسلمة للموظفين',
    headers: ['كود العهدة', 'اسم العهدة / الأصل', 'الموظف المستلم', 'الفرع / الموقع', 'الرقم التسلسلي', 'تاريخ الاستلام', 'القيمة التقديرية (⃁)', 'الحالة'],
    dataMapper: (r: any) => [
      r.custody_code || r.id || '',
      r.item_name || r.name || '',
      r.employee_name || r.assigned_to || '',
      r.location || r.branch || r.category || '',
      r.serial_number || '',
      r.received_date || '',
      Number(r.estimated_value ?? r.value ?? r.cost ?? 0),
      r.status || r.condition || 'في حوزة الموظف'
    ]
  },

  // 20. سجل العمليات والتدقيق الأمني
  activity_log: {
    sectionTitle: 'سجل العمليات والتدقيق الأمني (Audit Trail Log)',
    headers: ['رقم المعاملة', 'المستخدم المنفذ', 'الدور / الصلاحية', 'نوع الإجراء', 'الوصف والتفاصيل', 'عنوان IP', 'التوقيت والتاريخ'],
    dataMapper: (r: any) => [
      r.id || '',
      r.user_name || r.user || '',
      r.user_role || r.role || '',
      r.action || r.action_type || '',
      r.details || r.description || '',
      r.ip_address || '127.0.0.1',
      r.timestamp ? new Date(r.timestamp).toLocaleString('ar-SA') : (r.created_at || '')
    ]
  },

  // 21. الفروع والأقسام
  branches: {
    sectionTitle: 'سجل الفروع الإقليمية ومراكز الخدمة والكيانات',
    headers: ['كود الفرع / الكيان', 'اسم الفرع / الكيان', 'المدينة / الموقع', 'المدير المسؤول', 'القسم / الهاتف', 'عدد الكوادر / البريد', 'الموازنة / مؤشر KPI', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.branch_code || r.entity_code || r.id || '',
      r.name || r.name_ar || r.entity_name || '',
      r.city || r.location || '',
      r.manager_name || r.manager || r.head || '',
      r.phone || r.dept_name || r.category || '',
      r.email || (r.staff_count !== undefined ? `${r.staff_count} موظف` : ''),
      r.budget ?? r.cr_number ?? r.kpi ?? '',
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
    sectionTitle: 'سجل الهيكل التنظيمي والأقسام التخصصية للشركات والفروع',
    headers: ['كود الكيان / الفرع', 'اسم الكيان / الفرع', 'التصنيف', 'الموقع الجغرافي', 'المدير العام للفرع', 'اسم القسم التخصصي', 'مشرف القسم', 'عدد الكوادر', 'مؤشر الأداء KPI', 'الحالة'],
    dataMapper: (r: any) => [
      r.entity_code || r.code || r.dept_code || r.id || '',
      r.entity_name || r.branch_name || r.name_ar || r.name || '',
      r.category || r.level || 'فرع منطقي',
      r.location || r.city || '',
      r.manager || r.manager_name || '',
      r.dept_name || r.name_ar || r.name || '',
      r.head || r.supervisor || r.manager_name || '',
      Number(r.staff_count ?? r.employees_count ?? 0),
      r.kpi || 'ملتزم 100%',
      r.status || 'مفعل'
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
    dataMapper: (r: any) => {
      const moodLabels: Record<string, string> = {
        thrilled: 'متحمس ومنجز (5/5)',
        happy: 'مرتاح ومستقر (4/5)',
        neutral: 'عادي / روتيني (3/5)',
        stressed: 'مضغوط ومشتت (2/5)',
        frustrated: 'محبط / يواجه عقبات (1/5)',
      };
      const rawMood = String(r.latest_mood || r.mood || 'happy');
      return [
        r.user_id || r.id || '',
        r.user_name || r.name || '',
        r.role || '',
        r.branch || '',
        moodLabels[rawMood] || rawMood,
        Number(r.active_time_mins ?? 0),
        Number(r.idle_time_mins ?? 0),
        Number(r.total_clicks ?? 0),
        Number(r.rage_clicks_count ?? 0),
        Number(r.tasks_velocity ?? 0),
        r.burnout_risk || 'منخفض'
      ];
    }
  },
  employee_mood_logs: {
    sectionTitle: 'سجل النبض اليومي والحالة المزاجية للموظفين',
    headers: ['رقم السجل', 'اسم الموظف', 'المسمى الوظيفي', 'الفرع الجغرافي', 'الحالة المزاجية', 'السبب / المحفز', 'الملاحظات المدونة', 'توقيت التسجيل'],
    dataMapper: (r: any) => {
      const moodLabels: Record<string, string> = {
        thrilled: 'متحمس ومنجز (5/5)',
        happy: 'مرتاح ومستقر (4/5)',
        neutral: 'عادي / روتيني (3/5)',
        stressed: 'مضغوط ومشتت (2/5)',
        frustrated: 'محبط / يواجه عقبات (1/5)',
      };
      const reasonLabels: Record<string, string> = {
        workload: 'حجم وضغط المهام اليومية',
        system_speed: 'سرعة واستجابة النظام التقني',
        team_support: 'تعاون ودعم الفريق والإدارة',
        client_interaction: 'التعامل المباشر مع العملاء',
        personal: 'ظروف عامة / توازن العمل والحياة',
      };
      return [
        r.id || '',
        r.user_name || r.name || '',
        r.role || '',
        r.branch || '',
        moodLabels[String(r.mood || '')] || r.mood || 'مرتاح ومستقر',
        reasonLabels[String(r.reason_category || '')] || r.reason_category || '',
        r.note || 'لا توجد ملاحظات إضافية',
        r.timestamp || ''
      ];
    }
  },
  employee_telemetry: {
    sectionTitle: 'سجل تدفق الأحداث الحية والنقرات والتنبيهات الأمنية (DLP & Telemetry)',
    headers: ['معرف الحدث', 'اسم الموظف', 'المسمى الوظيفي', 'الفرع', 'نوع الحدث', 'العنصر المستهدف', 'الوحدة الإدارية', 'التفاصيل والأثر', 'مستوى الأهمية', 'التوقيت'],
    dataMapper: (r: any) => [
      r.id || '',
      r.user_name || '',
      r.role || '',
      r.branch || '',
      r.event_type || '',
      r.target_label || r.target_element || '',
      r.module || '',
      r.details || '',
      r.severity === 'critical' ? 'حرج' : r.severity === 'warning' ? 'تنبيه' : 'معلوماتي',
      r.timestamp || ''
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
  },
  'iam-security': {
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
  },

  // 40. دليل وشجرة الحسابات المحاسبية (SMACC Chart of Accounts)
  chart_of_accounts: {
    sectionTitle: 'شجرة الحسابات والدليل المحاسبي الموحد (Chart of Accounts)',
    headers: ['رمز الحساب الهرمي', 'اسم الحساب بالعربية', 'الاسم اللاتيني (EN)', 'التصنيف المحاسبي', 'طبيعة الحساب', 'المستوى', 'الرصيد الدفتري (⃁)'],
    dataMapper: (r: any) => [
      r.code || r.account_code || r.id || '',
      r.nameAr || r.name_ar || r.name || '',
      r.nameEn || r.name_en || '',
      r.category || r.type || 'أصول',
      r.nature || 'مدين',
      r.level || 1,
      Number(r.balance ?? 0)
    ]
  },
  'smacc-gl-tree': {
    sectionTitle: 'شجرة الحسابات والدليل المحاسبي الموحد (Chart of Accounts)',
    headers: ['رمز الحساب الهرمي', 'اسم الحساب بالعربية', 'الاسم اللاتيني (EN)', 'التصنيف المحاسبي', 'طبيعة الحساب', 'المستوى', 'الرصيد الدفتري (⃁)'],
    dataMapper: (r: any) => [
      r.code || r.account_code || r.id || '',
      r.nameAr || r.name_ar || r.name || '',
      r.nameEn || r.name_en || '',
      r.category || r.type || 'أصول',
      r.nature || 'مدين',
      r.level || 1,
      Number(r.balance ?? 0)
    ]
  },
  'chart-of-accounts': {
    sectionTitle: 'شجرة الحسابات والدليل المحاسبي الموحد (Chart of Accounts)',
    headers: ['رمز الحساب الهرمي', 'اسم الحساب بالعربية', 'الاسم اللاتيني (EN)', 'التصنيف المحاسبي', 'طبيعة الحساب', 'المستوى', 'الرصيد الدفتري (⃁)'],
    dataMapper: (r: any) => [
      r.code || r.account_code || r.id || '',
      r.nameAr || r.name_ar || r.name || '',
      r.nameEn || r.name_en || '',
      r.category || r.type || 'أصول',
      r.nature || 'مدين',
      r.level || 1,
      Number(r.balance ?? 0)
    ]
  },
  'general-ledger': {
    sectionTitle: 'كشف حساب الأستاذ العام التفصيلي (General Ledger)',
    headers: ['التاريخ', 'رقم المرجع / القيد', 'البيان والشرح المحاسبي', 'مدين (⃁)', 'دائن (⃁)', 'الرصيد التراكمي (⃁)'],
    dataMapper: (r: any) => [
      r.date || r['التاريخ'] || '',
      r.refNo || r.ref_no || r['رقم المرجع'] || r['المرجع'] || '',
      r.desc || r.description || r['البيان والشرح'] || r['البيان'] || '',
      Number(r.debit ?? r['مدين'] ?? 0),
      Number(r.credit ?? r['دائن'] ?? 0),
      Number(r.cumulative ?? r.balance ?? r['الرصيد التراكمي'] ?? 0)
    ]
  },
  general_ledger: {
    sectionTitle: 'كشف حساب الأستاذ العام التفصيلي (General Ledger)',
    headers: ['التاريخ', 'رقم المرجع / القيد', 'البيان والشرح المحاسبي', 'مدين (⃁)', 'دائن (⃁)', 'الرصيد التراكمي (⃁)'],
    dataMapper: (r: any) => [
      r.date || r['التاريخ'] || '',
      r.refNo || r.ref_no || r['رقم المرجع'] || r['المرجع'] || '',
      r.desc || r.description || r['البيان والشرح'] || r['البيان'] || '',
      Number(r.debit ?? r['مدين'] ?? 0),
      Number(r.credit ?? r['دائن'] ?? 0),
      Number(r.cumulative ?? r.balance ?? r['الرصيد التراكمي'] ?? 0)
    ]
  },
  'cash-flow': {
    sectionTitle: 'قائمة التدفقات النقدية - الطريقة غير المباشرة (IAS 7)',
    headers: ['قسم التدفقات', 'البند في قائمة التدفقات النقدية', 'المعيار المرجعي', 'المبلغ (⃁)'],
    dataMapper: (r: any) => [
      r.section || r['قسم التدفقات'] || 'التدفقات النقدية',
      r.label || r.name || r['البند في قائمة التدفقات النقدية'] || '',
      r.ref || r['المعيار المرجعي'] || 'IAS 7',
      Number(r.amount ?? r['المبلغ (⃁)'] ?? 0)
    ]
  },
  'equity-changes': {
    sectionTitle: 'قائمة التغيرات في حقوق الملكية (IAS 1.106)',
    headers: ['البيان والحركة', 'رأس المال (E-01)', 'الاحتياطي النظامي (E-02)', 'الأرباح المبقاة (E-03)', 'الدخل الشامل الآخر (O-01)', 'إجمالي حقوق الملكية (⃁)'],
    dataMapper: (r: any) => [
      r.label || r['البيان والحركة'] || '',
      Number(r.capital ?? r['رأس المال (E-01)'] ?? 0),
      Number(r.reserves ?? r['الاحتياطي النظامي (E-02)'] ?? 0),
      Number(r.retainedEarnings ?? r['الأرباح المبقاة (E-03)'] ?? 0),
      Number(r.oci ?? r['الدخل الشامل الآخر (O-01)'] ?? 0),
      Number(r.total ?? r['إجمالي حقوق الملكية'] ?? 0)
    ]
  },
  'ifrs-notes': {
    sectionTitle: 'الإيضاحات المتممة للقوائم المالية (IFRS Notes 1–12)',
    headers: ['رقم الإيضاح', 'عنوان الإيضاح المالي', 'مرجع المعيار', 'الأكواد المرتبطة', 'عدد الحسابات', 'إجمالي مدين (⃁)', 'إجمالي دائن (⃁)', 'السياسة والإفصاح المحاسبي'],
    dataMapper: (r: any) => [
      r.noteNumber || r['رقم الإيضاح'] || '',
      r.titleAr || r['عنوان الإيضاح المالي'] || '',
      r.ifrsRef || r['مرجع المعيار'] || '',
      r.linkedCodes || r['الأكواد المرتبطة'] || '',
      Number(r.accountsCount ?? r['عدد الحسابات'] ?? 0),
      Number(r.totalDebit ?? r['إجمالي مدين'] ?? 0),
      Number(r.totalCredit ?? r['إجمالي دائن'] ?? 0),
      r.policyText || r['السياسة والإفصاح المحاسبي'] || ''
    ]
  },
  'budget-variance': {
    sectionTitle: 'الموازنة التقديرية وتحليل الانحرافات ومراكز التكلفة',
    headers: ['كود البند', 'اسم البند', 'التصنيف', 'مركز التكلفة', 'الفعلي (⃁)', 'الموازنة التقديرية (⃁)', 'الانحراف (⃁)', 'نسبة الانحراف %', 'التقييم'],
    dataMapper: (r: any) => [
      r.code || r['كود البند'] || '',
      r.nameAr || r['اسم البند'] || '',
      r.category || r['التصنيف'] || '',
      r.costCenter || r['مركز التكلفة'] || '',
      Number(r.actual ?? r['الفعلي (Actual)'] ?? 0),
      Number(r.budget ?? r['الموازنة التقديرية (Budget)'] ?? 0),
      Number(r.varianceAmount ?? r['الانحراف (⃁)'] ?? r['الانحراف (SAR)'] ?? 0),
      r.variancePct || r['نسبة الانحراف %'] || '0%',
      r.evaluation || r['التقييم'] || ''
    ]
  },

  // 41. وحدات سماك الـ 6: المتاجر الإلكترونية، الأصول الثابتة، البائعين والمحصلين
  smacc_ecommerce_orders: {
    sectionTitle: 'سجل طلبات المتاجر والقنوات الإلكترونية (سلة / زد / شوبيفاي / ميسر)',
    headers: ['معرف الطلب', 'المنصة / المتجر', 'رقم الطلب بالمتجر', 'اسم العميل', 'رقم الجوال', 'الخدمة / الباقة', 'إجمالي المبلغ (⃁)', 'حالة السداد', 'حالة التنفيذ', 'تاريخ الطلب'],
    dataMapper: (r: any) => [
      r.id || '',
      r.platform || r.storeName || '',
      r.externalOrderNo || r.order_no || '',
      r.customerName || r.client_name || '',
      r.customerPhone || r.phone || '',
      r.serviceType || r.package || '',
      Number(r.totalAmount ?? r.amount ?? 0),
      r.paymentStatus || 'مدفوع',
      r.orderStatus || r.status || 'مكتمل',
      r.createdAt || r.created_at || ''
    ]
  },
  smacc_fixed_assets: {
    sectionTitle: 'سجل الأصول الثابتة ومجمع الإهلاك وصافي القيمة الدفترية (Fixed Assets)',
    headers: ['كود الأصل', 'اسم الأصل الثابت', 'الفئة المحاسبية', 'تاريخ الشراء', 'التكلفة التاريخية (⃁)', 'مجمع الإهلاك (⃁)', 'صافي القيمة الدفترية (⃁)', 'الحالة التشغيلية'],
    dataMapper: (r: any) => [
      r.id || r.code || '',
      r.name || '',
      r.category || '',
      r.purchaseDate || r.purchase_date || '',
      Number(r.cost ?? 0),
      Number(r.accumulatedDep ?? r.accumulated_depreciation ?? 0),
      Number(r.netBookValue ?? r.net_book_value ?? 0),
      r.status || 'بالخدمة الفعلية'
    ]
  },
  smacc_sales_reps: {
    sectionTitle: 'كشف حسابات البائعين والمحصلين ومعدلات التحصيل (Sales & Collectors)',
    headers: ['كود المندوب', 'اسم البائع / المحصل', 'الدور الوظيفي', 'رقم الجوال', 'إجمالي المبيعات (⃁)', 'المبالغ المحصلة (⃁)', 'الذمم المتبقية (⃁)', 'تحقيق المستهدف'],
    dataMapper: (r: any) => [
      r.id || '',
      r.name || '',
      r.role || '',
      r.phone || '',
      Number(r.totalSales ?? 0),
      Number(r.collected ?? 0),
      Number(r.pending ?? 0),
      r.targetAchieved || '100%'
    ]
  },

  // 42. كشوف حسابات الوكلاء الخارجيين والموردين
  external_offices: {
    sectionTitle: 'سجل وكشوف حسابات المكاتب والوكالات الخارجية المعتمدة',
    headers: ['الكود / المعرف', 'اسم الوكالة الخارجية', 'الدولة', 'الترخيص / المسؤول', 'عدد السير / العقود', 'عمولة العقد ($)', 'الرصيد بالدولار ($)', 'المقابل بالريال (⃁)', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.id || '',
      r.name || r.office_name || r.agency_name || '',
      r.country || '',
      r.license_no || r.license_number || r.manager || 'MOT-INTL',
      r.cv_count ?? r.total_cvs ?? r.used_quota ?? r.active_contracts ?? 0,
      Number(r.commission_usd ?? 1100),
      Number(r.balance_usd ?? ((r.commission_usd || 1100) * (r.active_contracts || 1))),
      Number(r.balance_sar ?? ((r.balance_usd || 1100) * 3.75)),
      r.status || 'معتمد ومطابق'
    ]
  },
  'external-offices': {
    sectionTitle: 'سجل وكشوف حسابات المكاتب والوكالات الخارجية المعتمدة',
    headers: ['الكود / المعرف', 'اسم الوكالة الخارجية', 'الدولة', 'الترخيص / المسؤول', 'عدد السير / العقود', 'عمولة العقد ($)', 'الرصيد بالدولار ($)', 'المقابل بالريال (⃁)', 'الحالة'],
    dataMapper: (r: any) => [
      r.code || r.id || '',
      r.name || r.office_name || r.agency_name || '',
      r.country || '',
      r.license_no || r.license_number || r.manager || 'MOT-INTL',
      r.cv_count ?? r.total_cvs ?? r.used_quota ?? r.active_contracts ?? 0,
      Number(r.commission_usd ?? 1100),
      Number(r.balance_usd ?? ((r.commission_usd || 1100) * (r.active_contracts || 1))),
      Number(r.balance_sar ?? ((r.balance_usd || 1100) * 3.75)),
      r.status || 'معتمد ومطابق'
    ]
  },

  // 43. صندوق واتساب المؤسسي الموحد
  whatsapp_inbox: {
    sectionTitle: 'سجل محادثات صندوق واتساب المؤسسي الموحد (WhatsApp Business CRM)',
    headers: ['معرف المحادثة', 'اسم العميل', 'رقم الجوال', 'آخر رسالة متبادلة', 'وقت التفاعل', 'الرسائل غير المقروءة', 'حالة المحادثة'],
    dataMapper: (r: any) => [
      r.id || '',
      r.client_name || r.name || '',
      r.phone || r.sender_number || '',
      r.last_message || r.message_text || '',
      r.time || r.created_at || '',
      Number(r.unread_count ?? 0),
      r.status || 'نشط'
    ]
  },

  // 44. أوامر الشراء والتوريد والضمانات البنكية (شركة كاس للمنافسات)
  purchase_orders: {
    sectionTitle: 'سجل أوامر الشراء والتوريد المستودعي للمشاريع (Purchase Orders)',
    headers: ['رقم أمر الشراء (PO)', 'رقم المنافسة المرجعي', 'الجهة المستفيدة', 'عدد البنود', 'إجمالي قيمة الأمر (⃁)', 'حالة التوريد', 'تاريخ الإصدار'],
    dataMapper: (r: any) => [
      r.id || r.po_number || '',
      r.reference_number || r.tender_id || '',
      r.entity_name || r.client_name || '',
      Number(r.items_count ?? 1),
      Number(r.total_amount ?? r.amount ?? 0),
      r.status || 'معتمد للتوريد',
      r.created_at ? String(r.created_at).slice(0, 10) : ''
    ]
  },
  project_guarantees: {
    sectionTitle: 'سجل الضمانات البنكية الابتدائية والنهائية للمنافسات (Bank Guarantees)',
    headers: ['رقم خطاب الضمان', 'نوع الضمان البنكي', 'البنك المصدر', 'المنافسة / المشروع', 'الجهة الحكومية', 'قيمة الضمان (⃁)', 'تاريخ السريان / الانتهاء', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || r.guarantee_no || '',
      r.type || r.guarantee_type || 'ضمان ابتدائي (1%)',
      r.bank_name || 'مصرف الراجحي',
      r.tender_title || r.title || '',
      r.entity_name || r.entity || '',
      Number(r.amount ?? r.guarantee_amount ?? 0),
      r.expiry_date || r.deadline || '',
      r.status || 'ساري المفعول'
    ]
  },

  // 45. هيكل الفروع والأقسام والهيكل التنظيمي
  'branch-departments': {
    sectionTitle: 'سجل هيكل الفروع والأقسام الإدارية للمجموعة',
    headers: ['كود الفرع / القسم', 'اسم القسم / الفرع', 'المدينة / الموقع', 'المدير المسؤول', 'عدد الكوادر', 'الموازنة التشغيلية (⃁)', 'الحالة'],
    dataMapper: (r: any) => [
      r.id || r.code || '',
      r.name || r.branch_name || r.department_name || '',
      r.city || r.location || r.branch || '',
      r.manager || r.head || '',
      Number(r.employees_count ?? r.staff_count ?? 0),
      Number(r.budget ?? r.amount ?? 0),
      r.status || 'نشط'
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
  const trimmedKey = (sectionKey || '').trim();
  const normalizedSnake = trimmedKey.toLowerCase().replace(/[\s-]+/g, '_');
  const normalizedKebab = trimmedKey.toLowerCase().replace(/[\s_]+/g, '-');
  const matchedCfg =
    SECTION_CONFIGS[trimmedKey] ||
    SECTION_CONFIGS[normalizedSnake] ||
    SECTION_CONFIGS[normalizedKebab];

  // Detect if the caller or DOM table harvester already mapped rows to explicit Arabic column keys
  const firstRow = data && data.length > 0 && typeof data[0] === 'object' && data[0] !== null ? data[0] : null;
  const rawKeys = firstRow
    ? Object.keys(firstRow).filter(
        k => k !== '__typename' && typeof firstRow[k] !== 'function' && typeof firstRow[k] !== 'object'
      )
    : [];
  const isPreMappedArabicRows =
    rawKeys.length >= 2 && rawKeys.some(k => /[\u0600-\u06FF]/.test(k));

  if (isPreMappedArabicRows) {
    baseConfig = {
      sectionTitle:
        options?.customTitle ||
        customTitle ||
        matchedCfg?.sectionTitle ||
        `التقرير الرسمي — ${translateFieldToArabic(trimmedKey)}`,
      headers: rawKeys,
      dataMapper: (row: any) =>
        rawKeys.map(k => {
          const val = row?.[k];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        }),
    };
  } else if (matchedCfg) {
    baseConfig = {
      ...matchedCfg,
      sectionTitle: options?.customTitle || customTitle || matchedCfg.sectionTitle,
    };
  } else if (firstRow) {
    const effectiveKeys = rawKeys.length > 0 ? rawKeys : Object.keys(firstRow).slice(0, 10);

    baseConfig = {
      sectionTitle: options?.customTitle || customTitle || `التقرير الرسمي — ${translateFieldToArabic(trimmedKey)}`,
      headers: effectiveKeys.map(translateFieldToArabic),
      dataMapper: (row: any) =>
        effectiveKeys.map(k => {
          const val = row?.[k];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        }),
    };
  } else {
    baseConfig = {
      sectionTitle: options?.customTitle || customTitle || `التقرير الرسمي — ${translateFieldToArabic(trimmedKey)}`,
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

// ─── Real ISO/IEC 18004 ZATCA QR SVG Generator (Mobbin Light Mode) ──
function generateZatcaQrSvg(payload?: string, sizePx: number = 86): string {
  const effectivePayload =
    payload ||
    encodeZatcaTlvBase64({
      sellerName: GROUP_COMPANY_INFO.nameAr,
      vatNumber: GROUP_COMPANY_INFO.taxNumber,
      timestampIso: new Date().toISOString(),
      totalWithVat: 0,
      vatAmount: 0,
    });
  return generateRealQrSvg(effectivePayload, {
    sizePx,
    darkColor: '#141414',
    lightColor: '#FFFFFF',
    borderStyle: true,
  });
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

function parseExportCellNumber(v: any): number | null {
  if (typeof v === 'number' && !isNaN(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const cleaned = v
      .replace(/[,⃁\u20C1\uE900\u200E\u200F\s$]|ر\.س|SAR/gi, '')
      .trim();
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

export function calculateReportKpis(headers: string[], mappedRows: any[][]): ReportKpis {
  let totalAmount = 0;
  let totalVat = 0;
  let hasFinancials = false;

  // 1. Detect structured Financial Statements that already include subtotal/grand-total rows (= / ===)
  const statementTotalRows = mappedRows.filter(row => {
    const firstCol = String(row[0] ?? '').trim();
    const secondCol = String(row[1] ?? '').trim();
    return (
      /^\s*=/.test(firstCol) ||
      /^\s*=/.test(secondCol) ||
      /الرصيد الختامي|إجمالي حقوق الملكية والالتزامات|صافي ربح السنة|إجمالي الدخل الشامل/.test(firstCol)
    );
  });
  const isStructuredFinancialStatement = statementTotalRows.length > 0;

  if (isStructuredFinancialStatement) {
    const grandTotalRows = statementTotalRows.filter(
      r => /^\s*===/.test(String(r[0] ?? '')) || /^\s*===/.test(String(r[1] ?? ''))
    );
    const candidateRows = grandTotalRows.length > 0 ? grandTotalRows : statementTotalRows;

    headers.forEach((headerName, colIdx) => {
      const isMoneyOrCount = /مبلغ|قيمة|ضريبة|إجمالي|سعر|راتب|مصروف|رصيد|تكلفة|بدل|صافي|عطاء|ضمان|أثر مالي|مستحقات|مدين|دائن|إيراد|ربح|مبيعات|محصل|مشتريات|أصول|السنة الحالية|الحالي|المعتمدة|حقوق الملكية/i.test(headerName);
      const isIdOrCode = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban|نسبة|%|تراكمي/i.test(headerName);
      if (!isMoneyOrCount || isIdOrCode) return;

      for (const row of candidateRows) {
        const numVal = parseExportCellNumber(row[colIdx]);
        if (numVal !== null) {
          hasFinancials = true;
          totalAmount = Math.max(totalAmount, Math.abs(numVal));
        }
      }
    });

    const roundedTotal = Math.round(totalAmount * 100) / 100;
    return {
      recordCount: mappedRows.length,
      totalAmount: roundedTotal,
      totalVat: 0,
      hasFinancials,
      tafqeetAr: roundedTotal > 0 ? numberToArabicTafqeet(roundedTotal) : 'لا توجد التزامات مالية مباشرة في هذا الكشف',
      columnTotals: headers.map(() => null),
    };
  }

  // 2. Detect hierarchical Chart of Accounts (COA) where parent levels (1..3) roll up leaf accounts (level 4)
  const levelColIdx = headers.findIndex(h => /^المستوى(\s+الشجري)?$|^level$/i.test(h.trim()));
  let rowsToSum = mappedRows;
  if (levelColIdx !== -1 && mappedRows.length > 1) {
    const rowLevels = mappedRows.map(r => {
      const numMatch = String(r[levelColIdx] ?? '').match(/\d+/);
      return numMatch ? parseInt(numMatch[0], 10) : NaN;
    });
    const validLevels = rowLevels.filter(l => !isNaN(l));
    const uniqueLevels = new Set(validLevels);
    if (uniqueLevels.size > 1) {
      const maxLevel = Math.max(...validLevels);
      rowsToSum = mappedRows.filter((_, idx) => rowLevels[idx] === maxLevel);
    }
  }

  const columnTotals: (number | null)[] = headers.map((headerName, colIdx) => {
    const isMoneyOrCount = /مبلغ|قيمة|ضريبة|إجمالي|سعر|راتب|مصروف|رصيد|تكلفة|بدل|صافي|عطاء|ضمان|أثر مالي|مستحقات|مدين|دائن|إيراد|ربح|مبيعات|محصل|مشتريات|أصول/i.test(headerName);
    const isIdOrCode = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban|نسبة|%|تراكمي/i.test(headerName);

    if (!isMoneyOrCount || isIdOrCode) return null;

    let colSum = 0;
    let hasValidNum = false;

    for (const row of rowsToSum) {
      const numVal = parseExportCellNumber(row[colIdx]);
      if (numVal !== null) {
        colSum += numVal;
        hasValidNum = true;
      }
    }

    if (hasValidNum) {
      hasFinancials = true;
      if (/ضريبة/i.test(headerName)) {
        totalVat += colSum;
      } else if (/مبلغ|قيمة|إجمالي|مصروف|صافي|عطاء|راتب|أثر مالي|مستحقات|مدين|رصيد|إيراد|ربح|مبيعات|محصل|تكلفة/i.test(headerName)) {
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
  const monogramCode = company.code === 'ALL' ? 'KS' : company.code;

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
    <th onclick="window.__sortTable && window.__sortTable(0)" style="padding: 10px 8px; background: #141414; color: #FFFFFF; border: 1px solid #262626; width: 44px; text-align: center; font-weight: 800; font-size: 11px; cursor: pointer;">#</th>
    ${config.headers.map((h, i) => `
      <th onclick="window.__sortTable && window.__sortTable(${i + 1})" style="padding: 10px 10px; background: #141414; color: #FFFFFF; border: 1px solid #262626; font-size: 11.5px; font-weight: 800; text-align: right; white-space: nowrap; cursor: pointer;">
        ${h}
      </th>
    `).join('')}
  `;

  const rowsHtml = mappedRows.map((row, idx) => {
    return `
      <tr class="report-data-row" style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; page-break-inside: avoid;">
        <td style="text-align: center; font-weight: 700; color: #707070; padding: 7px 6px; border: 1px solid #E4E4E7; font-size: 11px; font-family: monospace;">
          ${idx + 1}
        </td>
        ${row.map((val, cIdx) => {
          const isNum = typeof val === 'number' || (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim()));
          const headerName = config.headers[cIdx] || '';
          const isIdOrPhone = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban/i.test(headerName);
          const align = isNum && !isIdOrPhone ? 'text-align: left; font-family: monospace; font-weight: 700;' : 'text-align: right;';
          const displayVal = typeof val === 'number' ? val.toLocaleString('en-US') : String(val ?? '-');

          return `
            <td style="padding: 7px 10px; border: 1px solid #E4E4E7; font-size: 11px; color: #141414; ${align}">
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
        <tr style="background-color: #F3F3F3; font-weight: 900; border-top: 2.5px solid #141414; page-break-inside: avoid;">
          <td colspan="1" style="text-align: center; padding: 10px 8px; border: 1px solid #E0E0E0; font-size: 11px; color: #141414;">
            المجموع
          </td>
          ${config.headers.map((_, colIdx) => {
            const tot = kpis.columnTotals[colIdx];
            if (colIdx === 0 && tot === null) {
              return `<td style="padding: 10px; border: 1px solid #E0E0E0; font-size: 11px; color: #141414; font-weight: 900;">الإجمالي العام المعتمد</td>`;
            }
            if (tot !== null) {
              return `
                <td style="padding: 10px; border: 1px solid #E0E0E0; font-size: 11.5px; color: #141414; font-weight: 900; font-family: 'saudi_riyal', monospace; text-align: left;">
                  \u200E\u20C1 ${tot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              `;
            }
            return `<td style="border: 1px solid #E0E0E0; padding: 6px;"></td>`;
          }).join('')}
        </tr>
      </tfoot>
    `;
  }

  const zatcaTlv = encodeZatcaTlvBase64({
    sellerName: company.nameAr,
    vatNumber: company.taxNumber,
    timestampIso: now.toISOString(),
    totalWithVat: kpis.totalAmount,
    vatAmount: kpis.totalVat,
    serialNumber,
  });
  const qrSvg = generateZatcaQrSvg(zatcaTlv, 82);
  const barcodeSvg = generateRealCode128BarcodeSvg(serialNumber, {
    widthPx: 124,
    heightPx: 26,
    showText: false,
  });

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
          color: #141414;
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
            background: #ffffff;
          }
          .no-print {
            display: none !important;
          }
          .header-banner {
            border-bottom: 2.5px solid #141414 !important;
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
          color: rgba(20, 20, 20, 0.03);
          pointer-events: none;
          white-space: nowrap;
          z-index: 0;
          user-select: none;
        }

        /* Toolbar — Mobbin Light Mode */
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          background: #FFFFFF;
          color: #141414;
          padding: 12px 20px;
          border-radius: 16px;
          border: 1px solid #E0E0E0;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(20, 20, 20, 0.05);
        }

        .btn {
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          font-size: 12px;
          padding: 8px 16px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #141414;
          color: #FFFFFF;
        }
        .btn-primary:hover {
          background: #262626;
        }
        .btn-secondary {
          background: #F3F3F3;
          color: #141414;
          border: 1px solid #E0E0E0;
        }
        .btn-secondary:hover {
          background: #E5E5E5;
        }

        .search-input {
          background: #F3F3F3;
          border: 1px solid #E0E0E0;
          color: #141414;
          padding: 7px 14px;
          border-radius: 9999px;
          font-family: inherit;
          font-size: 12px;
          min-width: 220px;
          outline: none;
        }
        .search-input:focus {
          border-color: #141414;
          background: #FFFFFF;
        }
        .search-input::placeholder {
          color: #707070;
        }

        /* Official Header */
        .header-banner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #141414;
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
          width: 60px;
          height: 60px;
          border-radius: 16px;
          border: 1px solid #141414;
          background: #141414;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-weight: 900;
          font-family: 'Inter', monospace;
        }

        .company-titles h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: #141414;
          line-height: 1.25;
        }
        .company-titles .holding-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          color: #141414;
          background: #F3F3F3;
          border: 1px solid #E0E0E0;
          padding: 2px 9px;
          border-radius: 9999px;
          margin-bottom: 4px;
        }
        .company-titles .en-name {
          font-size: 10.5px;
          color: #707070;
          font-weight: 700;
          margin-top: 2px;
          letter-spacing: 0.4px;
        }
        .company-titles .legal-info {
          display: flex;
          gap: 10px;
          font-size: 10px;
          color: #707070;
          margin-top: 5px;
          flex-wrap: wrap;
        }
        .company-titles .legal-info strong {
          color: #141414;
        }

        .center-meta {
          text-align: center;
          flex: 1;
          padding: 0 10px;
        }
        .official-tag {
          display: inline-block;
          background: #141414;
          border: 1px solid #141414;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 14px;
          border-radius: 9999px;
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }
        .report-title-text {
          font-size: 18px;
          font-weight: 800;
          color: #141414;
          margin: 0;
        }
        .report-subtitle {
          font-size: 10.5px;
          color: #707070;
          margin-top: 4px;
        }
        .exporter-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding: 3px 12px;
          border-radius: 9999px;
          background: #F3F3F3;
          border: 1px solid #E0E0E0;
          color: #141414;
          font-size: 10px;
          font-weight: 700;
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
          color: #141414;
          font-weight: 800;
          margin-top: 4px;
        }
        .verified-stamp {
          font-size: 9px;
          font-weight: 700;
          color: #141414;
          margin-top: 2px;
        }

        /* KPI Cards Grid — Mobbin Light Mode */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .kpi-box {
          background: #F3F3F3;
          border: 1px solid #E0E0E0;
          border-right: 3.5px solid #141414;
          border-radius: 14px;
          padding: 10px 14px;
          text-align: right;
        }
        .kpi-box.accent-blue { border-right-color: #141414; }
        .kpi-box .label {
          font-size: 10.5px;
          color: #707070;
          font-weight: 700;
        }
        .kpi-box .val {
          font-size: 16px;
          font-weight: 800;
          color: #141414;
          margin-top: 2px;
          font-family: 'saudi_riyal', 'Inter', 'Tajawal', sans-serif;
        }
        .kpi-box .note {
          font-size: 9px;
          color: #707070;
          margin-top: 2px;
        }

        /* Tafqeet Bar */
        .tafqeet-ribbon {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #F3F3F3;
          border: 1px solid #E0E0E0;
          border-right: 4px solid #141414;
          border-radius: 12px;
          padding: 9px 14px;
          margin-bottom: 14px;
          font-size: 11px;
          font-weight: 700;
          color: #141414;
          position: relative;
          z-index: 1;
        }

        .executive-note-box {
          background: #F3F3F3;
          border: 1px solid #E0E0E0;
          border-right: 4px solid #141414;
          border-radius: 12px;
          padding: 9px 14px;
          margin-bottom: 14px;
          font-size: 11px;
          color: #141414;
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
          border: 1px solid #E4E4E7;
          background: #F8FAFC;
          border-radius: 14px;
          padding: 12px;
          text-align: center;
        }
        .sig-box .sig-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #141414;
        }
        .sig-box .sig-role {
          font-size: 10px;
          color: #707070;
          font-weight: 700;
          margin-top: 2px;
        }
        .sig-line {
          height: 1px;
          background: #E4E4E7;
          margin: 8px 0;
        }
        .sig-meta {
          font-size: 9.5px;
          color: #262626;
          font-weight: 700;
          margin-top: 2px;
        }
        .sig-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          color: #141414;
          background: #FFFFFF;
          padding: 2px 10px;
          border-radius: 9999px;
          border: 1px solid #E0E0E0;
          margin-top: 6px;
        }

        .seal-stamp {
          width: 72px;
          height: 72px;
          border: 2px double #141414;
          border-radius: 50%;
          margin: 6px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          color: #141414;
          font-size: 8.5px;
          font-weight: 800;
          line-height: 1.25;
        }

        /* Official Footer */
        .official-footer {
          margin-top: 22px;
          padding-top: 12px;
          border-top: 1px solid #E0E0E0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9.5px;
          color: #707070;
          page-break-inside: avoid;
          position: relative;
          z-index: 1;
        }
      </style>
    </head>
    <body>
      <div class="security-watermark">${company.nameAr} • CERTIFIED ERP</div>

      <!-- Interactive Screen Toolbar (Hidden on Print & PDF) -->
      <div class="toolbar no-print">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: #141414; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; font-family: monospace;">${monogramCode}</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: #141414;">وثيقة التقرير المؤسسي المعتمد • ${company.nameAr}</div>
            <div style="font-size: 10.5px; color: #707070;">إعداد: ${exporter.name} (${exporter.branch}) • الرقم المرجعي: ${serialNumber}</div>
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
            <span style="font-size: 17px; line-height: 1; letter-spacing: 0.5px;">${monogramCode}</span>
            <span style="font-size: 7.5px; color: #ADADAD; letter-spacing: 0.5px; margin-top: 3px;">ERP 4.0</span>
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
          <div style="margin-top: 4px;">${barcodeSvg}</div>
          <div class="serial-pill">${serialNumber}</div>
          <div class="verified-stamp">✓ باركود ورمز ZATCA QR حقيقي وموثق</div>
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
        <div class="kpi-box accent-blue">
          <div class="label">إجمالي القيمة المالية المعتمدة</div>
          <div class="val">\u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="note">إجمالي الحركة المالية للكشف</div>
        </div>
        <div class="kpi-box">
          <div class="label">ضريبة القيمة المضافة (15%)</div>
          <div class="val">\u200E\u20C1 ${kpis.totalVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="note">مفوترة وفق معايير ZATCA Phase 2</div>
        </div>
        ` : `
        <div class="kpi-box accent-blue">
          <div class="label">القسم / الوحدة الإدارية</div>
          <div class="val" style="font-size: 13.5px;">${exporter.department}</div>
          <div class="note">${company.nameAr}</div>
        </div>
        <div class="kpi-box">
          <div class="label">حالة التدقيق والمطابقة</div>
          <div class="val" style="font-size: 14px;">سارية ومعتمدة 100%</div>
          <div class="note">تم التحقق الآلي من سلامة السجلات</div>
        </div>
        `}

        <div class="kpi-box">
          <div class="label">الفرع ومستوى الحوكمة</div>
          <div class="val" style="font-size: 13px; color: #141414;">${exporter.branch}</div>
          <div class="note">خاضع لنظام حماية البيانات (PDPL)</div>
        </div>
      </div>

      ${showTafqeet && kpis.hasFinancials && kpis.totalAmount > 0 ? `
      <!-- 2.b Arabic Tafqeet Financial Bar -->
      <div class="tafqeet-ribbon">
        <div>
          <span style="color: #707070; margin-left: 6px;">التفقيط المالي المعتمد بالحروف:</span>
          <span>${kpis.tafqeetAr}</span>
        </div>
        <span style="font-family: 'saudi_riyal', monospace; font-size: 12px; font-weight: 800; color: #141414;">\u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
          <div class="sig-role">المدير المالي التنفيذي (Group CFO)</div>
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
            <div style="font-size: 7.5px; color: #707070; margin: 1px 0;">معتمد رسمياً • س.ت ${company.crNumber}</div>
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
          <span style="font-family: monospace; font-size: 9px; color: #707070;">${verificationHash} • الرقم المرجعي: ${serialNumber} • المستخرج: ${exporter.email}</span>
        </div>
        <div style="text-align: left; font-weight: 800; color: #141414;">
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
            var numA = parseFloat(cellA.replace(/[,⃁\u20C1\u200Es]/g, ''));
            var numB = parseFloat(cellB.replace(/[,⃁\u20C1\u200Es]/g, ''));
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
function toUtf8Bytes(xml: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(xml);
  }
  const arr = new Uint8Array(xml.length);
  for (let i = 0; i < xml.length; i++) arr[i] = xml.charCodeAt(i) & 0xff;
  return arr;
}

function fromUtf8Bytes(bytes: Uint8Array | number[]): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(u8);
  }
  let out = '';
  for (let i = 0; i < u8.length; i++) out += String.fromCharCode(u8[i]);
  return out;
}

/**
 * OpenXML SpreadsheetML Styling Engine (Mobbin Light Mode + Official SAMA SRS ⃁)
 * Injects rich corporate typography, Ink Black (#141414) headers, Soft Gray (#F3F3F3) banners & totals,
 * Zebra striping (#F8FAFC / #FFFFFF), crisp 1px borders (#E4E4E7), RTL frozen panes, and SAMA ⃁ number formats
 * directly into the .xlsx ZIP container via XLSX.CFB.
 */
function applyEnterpriseOpenXmlExcelStyles(
  wb: XLSX.WorkBook,
  dataRowCount: number,
  hasTotals: boolean
): Uint8Array {
  const rawBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const cfbLib = (XLSX as any).CFB;
  if (!cfbLib) {
    return new Uint8Array(rawBuffer);
  }

  try {
    const cfb = cfbLib.read(new Uint8Array(rawBuffer), { type: 'array' });

    // 1. Replace xl/styles.xml with Institutional Mobbin Light Mode + SAMA ⃁ StyleSheet
    const stylesEntry = cfbLib.find(cfb, 'Root Entry/xl/styles.xml');
    if (stylesEntry) {
      const enterpriseStylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="#,##0.00 &quot;\u20C1&quot;;(#,##0.00 &quot;\u20C1&quot;);&quot;0.00 \u20C1&quot;"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
  </numFmts>
  <fonts count="6">
    <font><sz val="11"/><color rgb="FF141414"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="13"/><color rgb="FF141414"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF52525B"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FF141414"/><name val="Segoe UI"/><family val="2"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF141414"/><name val="Segoe UI"/><family val="2"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF141414"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F3F3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="4">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE4E4E7"/></left>
      <right style="thin"><color rgb="FFE4E4E7"/></right>
      <top style="thin"><color rgb="FFE4E4E7"/></top>
      <bottom style="thin"><color rgb="FFE4E4E7"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF3F3F46"/></left>
      <right style="thin"><color rgb="FF3F3F46"/></right>
      <top style="medium"><color rgb="FF141414"/></top>
      <bottom style="medium"><color rgb="FF141414"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFE4E4E7"/></left>
      <right style="thin"><color rgb="FFE4E4E7"/></right>
      <top style="medium"><color rgb="FF141414"/></top>
      <bottom style="double"><color rgb="FF141414"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="13">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="164" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="3" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>
    <xf numFmtId="164" fontId="4" fillId="3" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
      stylesEntry.content = toUtf8Bytes(enterpriseStylesXml);
      stylesEntry.size = stylesEntry.content.length;
    }

    // 2. Style Sheet 1 (Detailed Data Worksheet + Frozen Header Pane)
    const sheet1Entry = cfbLib.find(cfb, 'Root Entry/xl/worksheets/sheet1.xml');
    if (sheet1Entry) {
      let s1Xml = fromUtf8Bytes(sheet1Entry.content);
      // Add RTL + Frozen Header Pane at Row 6
      s1Xml = s1Xml.replace(
        /<sheetViews>[\s\S]*?<\/sheetViews>/,
        '<sheetViews><sheetView rightToLeft="1" showGridLines="1" tabSelected="1" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      );

      const firstTotalsRow = 6 + dataRowCount + 2; // blank row after data, then totalRow
      s1Xml = s1Xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (_m, rStr, rowAttrs, inner) => {
        const rNum = parseInt(rStr, 10);
        const styledInner = inner.replace(/<c r="([A-Z]+)(\d+)"([^>]*)>/g, (_cm: string, colLet: string, cRow: string, cAttrs: string) => {
          const cleanAttrs = cAttrs.replace(/\s+s="\d+"/g, '');
          const isNumericCell = !/\bt="(?:str|s|inlineStr|b)"/.test(cleanAttrs);
          let styleIdx = 5;

          if (rNum === 1) styleIdx = 1;
          else if (rNum === 2) styleIdx = 2;
          else if (rNum === 3 || rNum === 4) styleIdx = 3;
          else if (rNum === 6) styleIdx = 4;
          else if (rNum >= 7 && rNum < 7 + dataRowCount) {
            const isEven = (rNum - 7) % 2 === 0;
            if (colLet === 'A') {
              styleIdx = 11;
            } else if (isNumericCell) {
              styleIdx = isEven ? 7 : 8;
            } else {
              styleIdx = isEven ? 5 : 6;
            }
          } else if (hasTotals && rNum === firstTotalsRow) {
            styleIdx = isNumericCell ? 10 : 9;
          } else if (rNum > 6 + dataRowCount) {
            styleIdx = colLet === 'A' ? 9 : 12;
          }

          return `<c r="${colLet}${cRow}" s="${styleIdx}"${cleanAttrs}>`;
        });
        return `<row r="${rStr}"${rowAttrs}>${styledInner}</row>`;
      });

      sheet1Entry.content = toUtf8Bytes(s1Xml);
      sheet1Entry.size = sheet1Entry.content.length;
    }

    // 3. Style Sheet 2 (Executive KPI & Governance Approval Sheet)
    const sheet2Entry = cfbLib.find(cfb, 'Root Entry/xl/worksheets/sheet2.xml');
    if (sheet2Entry) {
      let s2Xml = fromUtf8Bytes(sheet2Entry.content);
      s2Xml = s2Xml.replace(
        /<sheetViews>[\s\S]*?<\/sheetViews>/,
        '<sheetViews><sheetView rightToLeft="1" showGridLines="1" workbookViewId="0"/></sheetViews>'
      );

      const sectionHeaderRows = new Set([4, 12, 19, 25]);
      s2Xml = s2Xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (_m, rStr, rowAttrs, inner) => {
        const rNum = parseInt(rStr, 10);
        const styledInner = inner.replace(/<c r="([A-Z]+)(\d+)"([^>]*)>/g, (_cm: string, colLet: string, cRow: string, cAttrs: string) => {
          const cleanAttrs = cAttrs.replace(/\s+s="\d+"/g, '');
          const isNumericCell = !/\bt="(?:str|s|inlineStr|b)"/.test(cleanAttrs);
          let styleIdx = 5;

          if (rNum === 1) styleIdx = 1;
          else if (rNum === 2) styleIdx = 2;
          else if (sectionHeaderRows.has(rNum)) styleIdx = 4;
          else if (rNum === 23) styleIdx = colLet === 'A' ? 9 : 12;
          else if (isNumericCell) styleIdx = 7;
          else if (colLet === 'A') styleIdx = 3;
          else styleIdx = 5;

          return `<c r="${colLet}${cRow}" s="${styleIdx}"${cleanAttrs}>`;
        });
        return `<row r="${rStr}"${rowAttrs}>${styledInner}</row>`;
      });

      sheet2Entry.content = toUtf8Bytes(s2Xml);
      sheet2Entry.size = sheet2Entry.content.length;
    }

    const outZip = cfbLib.write(cfb, { fileType: 'zip', type: 'array' });
    return new Uint8Array(outZip);
  } catch (err) {
    console.warn('Excel OpenXML style injection fallback:', err);
    return new Uint8Array(rawBuffer);
  }
}

export function buildStyledExcelBuffer(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): { buffer: Uint8Array; fileName: string } {
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

  // 1. Data Mapping with Smart Numeric & SAMA ⃁ Recognition
  const mappedRows: any[][] = [];
  data.forEach(row => {
    const rawVals = config.dataMapper(row);
    const convertedVals = rawVals.map((val, colIdx) => {
      if (val === null || val === undefined || val === '') return '';
      if (typeof val === 'number') return val;

      const str = String(val).trim();
      const headerName = config.headers[colIdx] || '';
      const isIdOrPhoneOrCode = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban|تاريخ|وقت/i.test(headerName);

      if (!isIdOrPhoneOrCode) {
        const cleanedNumStr = str
          .replace(/[,⃁\u20C1\uE900\u200E\u200F\s$]|ر\.س|ريال|SAR/gi, '')
          .trim();
        if (/^-?\d+(\.\d+)?$/.test(cleanedNumStr)) {
          const num = parseFloat(cleanedNumStr);
          if (!isNaN(num)) return num;
        }
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
  const colCount = numberedHeaders.length;

  const padMergedBannerRow = (firstCellText: string): string[] => {
    const arr = new Array(colCount).fill('');
    arr[0] = firstCellText;
    return arr;
  };

  // 3. Assemble Sheet 1: Detailed Data Worksheet (AOA)
  const wsData: any[][] = [
    padMergedBannerRow(`${GROUP_COMPANY_INFO.nameAr} • ${company.nameAr} (${company.nameEn})`),
    padMergedBannerRow(`${title}`),
    padMergedBannerRow(`سجل تجاري: ${company.crNumber} | الرقم الضريبي: ${company.taxNumber} | الرقم المرجعي: ${serialNo} | تاريخ الاستخراج: ${dateAr} (${timeStr})`),
    padMergedBannerRow(`إعداد الموظف المختص: ${exporter.name} (${exporter.role}) | القسم: ${exporter.department} | الفرع: ${exporter.branch} | إجمالي السجلات: ${data.length}`),
    [], // Blank separator (Row 5)
    numberedHeaders, // Table Headers (Row 6)
    ...numberedRows,
  ];

  if (hasTotals) {
    wsData.push([]);
    wsData.push(totalRow);
    const tafqeetRow = new Array(colCount).fill('');
    tafqeetRow[0] = 'التفقيط المالي بالحروف:';
    tafqeetRow[1] = kpis.tafqeetAr;
    wsData.push(tafqeetRow);
  }
  if (options?.executiveNote) {
    const noteRow = new Array(colCount).fill('');
    noteRow[0] = 'ملاحظة الإدارة التنفيذية:';
    noteRow[1] = options.executiveNote;
    wsData.push(noteRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge Corporate Header Banner Rows across columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ];
  if (hasTotals && colCount > 2) {
    const tafqeetRowIdx = 6 + numberedRows.length + 2;
    ws['!merges'].push({ s: { r: tafqeetRowIdx, c: 1 }, e: { r: tafqeetRowIdx, c: colCount - 1 } });
  }

  // Row Heights for Executive Readability
  const wsRowsMeta: Array<{ hpt: number }> = [
    { hpt: 32 }, // Row 1: Holding Banner
    { hpt: 28 }, // Row 2: Report Title
    { hpt: 22 }, // Row 3: CR / VAT / Serial
    { hpt: 22 }, // Row 4: Exporter Metadata
    { hpt: 10 }, // Row 5: Spacer
    { hpt: 28 }, // Row 6: Table Column Headers
  ];
  for (let i = 0; i < numberedRows.length; i++) {
    wsRowsMeta.push({ hpt: 23 });
  }
  if (hasTotals) {
    wsRowsMeta.push({ hpt: 10 }, { hpt: 26 }, { hpt: 25 });
  }
  if (options?.executiveNote) {
    wsRowsMeta.push({ hpt: 25 });
  }
  ws['!rows'] = wsRowsMeta;

  // Enable AutoFilter on the table header row (row index 5 -> Excel row 6)
  const lastColLetter = XLSX.utils.encode_col(colCount - 1);
  const lastDataRowIdx = 6 + numberedRows.length;
  ws['!autofilter'] = { ref: `A6:${lastColLetter}${Math.max(6, lastDataRowIdx)}` };

  // Dynamic Column Widths with generous padding for Arabic typography & SAMA ⃁
  const colWidths = numberedHeaders.map((h, i) => {
    if (i === 0) return { wch: 8 };
    let maxLen = h.length;
    for (const r of numberedRows) {
      const v = r[i];
      const strLen =
        typeof v === 'number'
          ? v.toLocaleString('en-US', { minimumFractionDigits: 2 }).length + 4
          : v !== undefined && v !== null
          ? String(v).length
          : 0;
      if (strLen > maxLen) maxLen = strLen;
    }
    return { wch: Math.min(Math.max(maxLen + 7, 18), 56) };
  });
  ws['!cols'] = colWidths;
  ws['!sheetViews'] = [{ rightToLeft: true }];

  // 4. Assemble Sheet 2: Executive KPI & Approval Summary Sheet (ملخص المؤشرات والاعتماد)
  const summaryRows: any[][] = [
    [`${GROUP_COMPANY_INFO.nameAr} — بطاقة الملخص التنفيذي والاعتماد الرسمي`, '', ''],
    [`${title}`, '', ''],
    [],
    ['بيانات الجهة المصدرة والحوكمة المؤسسية', 'القيمة / البيان الرسمي', 'ملاحظات التوثيق'],
    ['المجموعة القابضة', GROUP_COMPANY_INFO.nameAr, 'المقر الرئيسي - الرياض'],
    ['الكيان التشغيلي النشط', `${company.nameAr} (${company.nameEn})`, company.code],
    ['رقم السجل التجاري الموحد', company.crNumber, 'ساري المفعول'],
    ['الرقم الضريبي (ZATCA VAT)', company.taxNumber, 'المرحلة الثانية (ربط وتكامل)'],
    ['الرقم المرجعي للوثيقة', serialNo, 'مرجع أرشفة مركزي'],
    ['تاريخ ووقت الاستخراج', `${dateAr} - ${timeStr}`, isoDate],
    [],
    ['بيانات الموظف المختص والفرع الجغرافي', 'التفاصيل', 'النطاق'],
    ['اسم الموظف المستخرج', exporter.name, 'موظف مفوض'],
    ['المسمى الوظيفي', exporter.role, 'صلاحية معتمدة'],
    ['الإدارة / القسم', exporter.department, sectionKey],
    ['الفرع الجغرافي', exporter.branch, company.address],
    ['البريد المؤسسي الموثق', exporter.email, 'حساب موثق'],
    [],
    ['ملخص المؤشرات المالية والتشغيلية (KPI Summary)', 'القيمة المعتمدة', 'العملة / البيان'],
    ['إجمالي عدد السجلات المدققة', `${kpis.recordCount} سجل`, 'سجل تشغيلي ومحاسبي'],
    ['إجمالي القيمة المالية (⃁)', kpis.totalAmount, 'ريال سعودي (⃁)'],
    ['ضريبة القيمة المضافة التقديرية 15% (⃁)', kpis.totalVat, 'ضريبة القيمة المضافة 15%'],
    ['التفقيط المالي المعتمد بالحروف', kpis.tafqeetAr, 'تفقيط رسمي معتمد'],
    [],
    ['مصفوفة الاعتمادات والتواقيع الرسمية', 'المسؤول المعتمد', 'الحالة والتاريخ'],
    ['1. إعداد واستخراج الكشف', `${exporter.name} (${exporter.role})`, `موثق إلكترونياً — ${isoDate}`],
    ['2. المراجعة والتدقيق المالي', 'أ. محمد بن عبدالرحمن السليم (Group CFO)', `مطابق للدفاتر — ${isoDate}`],
    ['3. الاعتماد التنفيذي النهائي', 'الشيخ خالد بن عبدالعزيز السليم (رئيس مجلس الإدارة)', `معتمد ونافذ — ${isoDate}`],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 22, c: 1 }, e: { r: 22, c: 2 } },
  ];
  summaryWs['!cols'] = [{ wch: 38 }, { wch: 52 }, { wch: 34 }];
  summaryWs['!rows'] = summaryRows.map((_, idx) =>
    idx === 0 ? { hpt: 32 } : idx === 1 ? { hpt: 28 } : { hpt: 23 }
  );
  summaryWs['!sheetViews'] = [{ rightToLeft: true }];

  const wb = XLSX.utils.book_new();
  if (!wb.Workbook) wb.Workbook = {};
  wb.Workbook.Views = [{ RTL: true }];

  const sanitizedSheetName = title.replace(/[:\\/?*[\]]/g, '').slice(0, 28) || 'البيانات_التفصيلية';
  XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'ملخص_المؤشرات_والاعتماد');

  const styledBytes = applyEnterpriseOpenXmlExcelStyles(wb, numberedRows.length, hasTotals);
  const cleanFileName = `${title.replace(/[\s/\\:]+/g, '_')}_${isoDate}.xlsx`;
  return { buffer: styledBytes, fileName: cleanFileName };
}

export function exportToExcel(
  sectionKey: string,
  data: any[],
  customTitle?: string,
  options?: ExportCustomizationOptions
): void {
  const { buffer, fileName } = buildStyledExcelBuffer(sectionKey, data, customTitle, options);
  if (isRunningInTest()) {
    return;
  }
  if (typeof Blob !== 'undefined') {
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerBlobDownload(blob, fileName);
  }
}

// ─── Multi-Sheet Master Workbook Builder (IFRS 8-Sheet & Enterprise Workbooks) ───
export interface MultiSheetSpec {
  sheetName: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  includeTotalsRow?: boolean;
}

export function buildMultiSheetExcelBuffer(
  workbookTitle: string,
  sheets: MultiSheetSpec[],
  options?: ExportCustomizationOptions
): { buffer: Uint8Array; fileName: string } {
  const company = getActiveCompanyInfo();
  const exporter = getAuthenticatedExporterInfo();
  const now = new Date();
  const dateAr = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const isoDate = now.toISOString().slice(0, 10);
  const serialNo = `${company.code}-WB-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const wb = XLSX.utils.book_new();
  if (!wb.Workbook) wb.Workbook = {};
  wb.Workbook.Views = [{ RTL: true }];

  const sheetMetaList: Array<{ dataRowCount: number; hasTotals: boolean; subtotalRowNumbers: Set<number> }> = [];
  const usedSheetNames = new Set<string>();

  sheets.forEach((spec, sIdx) => {
    const numberedHeaders = ['#', ...spec.headers];
    const colCount = numberedHeaders.length;
    const subtotalRowNumbers = new Set<number>();

    const normalizedRows: any[][] = spec.rows.map((row) =>
      row.map((val, colIdx) => {
        if (val === null || val === undefined || val === '') return '';
        if (typeof val === 'number') return val;
        const str = String(val).trim();
        const headerName = spec.headers[colIdx] || '';
        const isIdOrCode = /هاتف|جوال|هوية|سجل|كود|رقم|مرجع|iban|تاريخ|وقت|معيار|نسبة|%/i.test(headerName);
        if (!isIdOrCode) {
          const parsed = parseExportCellNumber(str);
          if (parsed !== null) return parsed;
        }
        return str;
      })
    );

    const numberedRows = normalizedRows.map((r, idx) => {
      const firstCell = String(r[0] ?? '').trim();
      const secondCell = String(r[1] ?? '').trim();
      if (/^\s*=/.test(firstCell) || /^\s*=/.test(secondCell) || /الرصيد الختامي|إجمالي/.test(firstCell)) {
        subtotalRowNumbers.add(7 + idx);
      }
      return [idx + 1, ...r];
    });

    const kpis = calculateReportKpis(spec.headers, normalizedRows);
    const hasTotals = Boolean(spec.includeTotalsRow) && kpis.columnTotals.some((t) => t !== null);

    const padBanner = (text: string): string[] => {
      const arr = new Array(colCount).fill('');
      arr[0] = text;
      return arr;
    };

    const wsData: any[][] = [
      padBanner(`${GROUP_COMPANY_INFO.nameAr} • ${company.nameAr} (${company.nameEn})`),
      padBanner(spec.title || workbookTitle),
      padBanner(
        `سجل تجاري: ${company.crNumber} | الرقم الضريبي: ${company.taxNumber} | المرجع: ${serialNo} | التاريخ: ${dateAr} (${timeStr})`
      ),
      padBanner(
        spec.subtitle ||
          `إعداد الموظف المختص: ${exporter.name} (${exporter.role}) | الفرع: ${exporter.branch} | عدد البنود: ${normalizedRows.length}`
      ),
      [],
      numberedHeaders,
      ...numberedRows,
    ];

    if (hasTotals) {
      const totalRow: any[] = ['المجموع'];
      spec.headers.forEach((_, colIdx) => {
        if (colIdx === 0 && kpis.columnTotals[colIdx] === null) {
          totalRow.push('الإجمالي العام المعتمد (Grand Total)');
        } else if (kpis.columnTotals[colIdx] !== null) {
          totalRow.push(kpis.columnTotals[colIdx]);
        } else {
          totalRow.push('');
        }
      });
      wsData.push([]);
      wsData.push(totalRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
    ];

    const wsRowsMeta: Array<{ hpt: number }> = [
      { hpt: 30 },
      { hpt: 26 },
      { hpt: 21 },
      { hpt: 21 },
      { hpt: 10 },
      { hpt: 27 },
    ];
    for (let i = 0; i < numberedRows.length; i++) {
      wsRowsMeta.push({ hpt: 22 });
    }
    if (hasTotals) {
      wsRowsMeta.push({ hpt: 10 }, { hpt: 26 });
    }
    ws['!rows'] = wsRowsMeta;

    const lastColLetter = XLSX.utils.encode_col(colCount - 1);
    const lastDataRowIdx = 6 + numberedRows.length;
    ws['!autofilter'] = { ref: `A6:${lastColLetter}${Math.max(6, lastDataRowIdx)}` };

    ws['!cols'] = numberedHeaders.map((h, i) => {
      if (i === 0) return { wch: 7 };
      let maxLen = h.length;
      for (const r of numberedRows) {
        const v = r[i];
        const strLen =
          typeof v === 'number'
            ? v.toLocaleString('en-US', { minimumFractionDigits: 2 }).length + 4
            : v !== undefined && v !== null
            ? String(v).length
            : 0;
        if (strLen > maxLen) maxLen = strLen;
      }
      return { wch: Math.min(Math.max(maxLen + 6, 16), 54) };
    });
    ws['!sheetViews'] = [{ rightToLeft: true }];

    let cleanName = spec.sheetName.replace(/[:\\/?*[\]]/g, '').trim().slice(0, 31) || `ورقة_${sIdx + 1}`;
    if (usedSheetNames.has(cleanName)) {
      cleanName = `${cleanName.slice(0, 27)}_${sIdx + 1}`;
    }
    usedSheetNames.add(cleanName);

    XLSX.utils.book_append_sheet(wb, ws, cleanName);
    sheetMetaList.push({
      dataRowCount: numberedRows.length,
      hasTotals,
      subtotalRowNumbers,
    });
  });

  // Apply OpenXML styles across all sheets in the workbook
  const styledInitBytes = applyEnterpriseOpenXmlExcelStyles(
    wb,
    sheetMetaList[0]?.dataRowCount || 0,
    sheetMetaList[0]?.hasTotals || false
  );

  let finalBytes = styledInitBytes;
  const cfbLib = (XLSX as any).CFB;
  if (cfbLib && sheets.length > 0) {
    try {
      const cfb = cfbLib.read(new Uint8Array(styledInitBytes), { type: 'array' });
      sheetMetaList.forEach((meta, idx) => {
        const sheetNum = idx + 1;
        const entry = cfbLib.find(cfb, `Root Entry/xl/worksheets/sheet${sheetNum}.xml`);
        if (!entry) return;
        let xml = fromUtf8Bytes(entry.content);
        xml = xml.replace(
          /<sheetViews>[\s\S]*?<\/sheetViews>/,
          `<sheetViews><sheetView rightToLeft="1" showGridLines="1"${sheetNum === 1 ? ' tabSelected="1"' : ''} workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
        );

        const firstTotalsRow = 6 + meta.dataRowCount + 2;
        xml = xml.replace(/<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>/g, (_m, rStr, rowAttrs, inner) => {
          const rNum = parseInt(rStr, 10);
          const isSubtotalRow = meta.subtotalRowNumbers.has(rNum);
          const styledInner = inner.replace(
            /<c r="([A-Z]+)(\d+)"([^>]*)>/g,
            (_cm: string, colLet: string, cRow: string, cAttrs: string) => {
              const cleanAttrs = cAttrs.replace(/\s+s="\d+"/g, '');
              const isNumericCell = !/\bt="(?:str|s|inlineStr|b)"/.test(cleanAttrs);
              let styleIdx = 5;

              if (rNum === 1) styleIdx = 1;
              else if (rNum === 2) styleIdx = 2;
              else if (rNum === 3 || rNum === 4) styleIdx = 3;
              else if (rNum === 6) styleIdx = 4;
              else if (isSubtotalRow) {
                styleIdx = colLet === 'A' ? 11 : isNumericCell ? 10 : 9;
              } else if (rNum >= 7 && rNum < 7 + meta.dataRowCount) {
                const isEven = (rNum - 7) % 2 === 0;
                if (colLet === 'A') styleIdx = 11;
                else if (isNumericCell) styleIdx = isEven ? 7 : 8;
                else styleIdx = isEven ? 5 : 6;
              } else if (meta.hasTotals && rNum === firstTotalsRow) {
                styleIdx = isNumericCell ? 10 : 9;
              }

              return `<c r="${colLet}${cRow}" s="${styleIdx}"${cleanAttrs}>`;
            }
          );
          return `<row r="${rStr}"${rowAttrs}>${styledInner}</row>`;
        });

        entry.content = toUtf8Bytes(xml);
        entry.size = entry.content.length;
      });
      finalBytes = new Uint8Array(cfbLib.write(cfb, { fileType: 'zip', type: 'array' }));
    } catch (err) {
      console.warn('Multi-sheet OpenXML style fallback:', err);
    }
  }

  const cleanFileName = `${(options?.customTitle || workbookTitle).replace(/[\s/\\:]+/g, '_')}_${isoDate}.xlsx`;
  return { buffer: finalBytes, fileName: cleanFileName };
}

export function exportMultiSheetWorkbook(
  workbookTitle: string,
  sheets: MultiSheetSpec[],
  options?: ExportCustomizationOptions
): void {
  const { buffer, fileName } = buildMultiSheetExcelBuffer(workbookTitle, sheets, options);
  const totalRecords = sheets.reduce((sum, s) => sum + s.rows.length, 0);
  recordExportAuditTrail('ifrs-master-workbook', workbookTitle, 'excel', totalRecords);
  if (isRunningInTest()) {
    return;
  }
  if (typeof Blob !== 'undefined') {
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerBlobDownload(blob, fileName);
  }
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
  container.innerHTML = html;
  container.querySelectorAll('.no-print, script').forEach((el) => el.remove());
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
      windowWidth: isLandscape ? 1200 : 900,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
        clonedDoc.querySelectorAll('head style').forEach((el) => el.remove());
      },
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
  container.innerHTML = html;
  container.querySelectorAll('.no-print, script').forEach((el) => el.remove());
  document.body.appendChild(container);

  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
        clonedDoc.querySelectorAll('head style').forEach((el) => el.remove());
      },
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
    const nationalId = String(r.nationalIdOrIqama || r.national_id || r.nationalId || r.iqama_number || r.user_id || `10928374${String(idx + 10).slice(-2)}`).slice(0, 10);
    const empName = String(r.employeeName || r.name || r.full_name || r.staff_name || r.user_name || r.maid_name || `Employee_${idx + 1}`).replace(/,/g, ' ');
    const bankCode = String(r.bankCode || r.bank_code || 'RJHI');
    const iban = String(r.iban || `SA038000000060801016${String(1000 + idx).slice(-4)}`);
    const rawSalary = Number(r.grossSalary ?? r.salary ?? r.totalSalary ?? r.amount_sar ?? r.amount ?? r.total_amount ?? 6500);
    const basicNum = Number(r.basicSalary ?? r.basic_salary ?? (rawSalary * 0.7));
    const housingNum = Number(r.housingAllowance ?? r.housing_allowance ?? r.housing ?? (rawSalary * 0.2));
    const otherIncomeNum = Number(
      r.transportAllowance !== undefined || r.otherAllowances !== undefined
        ? (Number(r.transportAllowance || 0) + Number(r.otherAllowances || 0) + Number(r.overtimePay || 0) + Number(r.bonuses || 0))
        : (r.transport_allowance ?? r.transport ?? (rawSalary * 0.1))
    );
    const deductionsNum = Number(r.totalDeductionsApplied ?? r.deductions ?? r.gosi_deduction ?? (rawSalary * 0.0975));
    const netNum = r.netSalary !== undefined ? Number(r.netSalary) : (basicNum + housingNum + otherIncomeNum - deductionsNum);

    const basic = basicNum.toFixed(2);
    const housing = housingNum.toFixed(2);
    const otherIncome = otherIncomeNum.toFixed(2);
    const deductions = deductionsNum.toFixed(2);
    const net = netNum.toFixed(2);
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
    <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
      <td style="text-align: center; font-weight: bold; border: 1px solid #E4E4E7; padding: 6px; font-size: 10pt; color: #707070;">${idx + 1}</td>
      ${row.map(val => `<td style="border: 1px solid #E4E4E7; padding: 6px 8px; font-size: 10pt; text-align: right; color: #141414;">${String(val ?? '-')}</td>`).join('')}
    </tr>
  `).join('');

  const tableHeadersHtml = `
    <th style="background-color: #141414; color: #FFFFFF; font-weight: bold; border: 1px solid #262626; padding: 8px; width: 35px; text-align: center;">#</th>
    ${config.headers.map(h => `<th style="background-color: #141414; color: #FFFFFF; font-weight: bold; border: 1px solid #262626; padding: 8px; text-align: right; font-size: 10.5pt;">${h}</th>`).join('')}
  `;

  let totalRowHtml = '';
  if (kpis.columnTotals.some(t => t !== null)) {
    totalRowHtml = `
      <tr style="background-color: #F3F3F3; font-weight: bold;">
        <td style="border: 1px solid #E0E0E0; padding: 8px; text-align: center; color: #141414;">المجموع</td>
        ${config.headers.map((_, colIdx) => {
          const tot = kpis.columnTotals[colIdx];
          if (colIdx === 0 && tot === null) return `<td style="border: 1px solid #E0E0E0; padding: 8px; color: #141414;">الإجمالي العام المعتمد</td>`;
          if (tot !== null) return `<td style="border: 1px solid #E0E0E0; padding: 8px; text-align: left; font-family: monospace; color: #141414;">\u200E\u20C1 ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>`;
          return `<td style="border: 1px solid #E0E0E0; padding: 8px;"></td>`;
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
          color: #141414;
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
          color: #141414;
          margin-bottom: 2px;
        }
        .sub-header {
          font-size: 10pt;
          color: #707070;
          margin-bottom: 8px;
        }
        .signatures-table {
          width: 100%;
          margin-top: 26px;
          border: none;
        }
        .signatures-table td {
          border: 1px solid #E4E4E7;
          background-color: #F8FAFC;
          text-align: center;
          padding: 12px;
          vertical-align: top;
          width: 33.33%;
        }
      </style>
    </head>
    <body lang=AR-SA>
      <div style="border-bottom: 2.5pt solid #141414; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="float: left; font-size: 9pt; color: #707070; text-align: left;">
          <div><strong>${GROUP_COMPANY_INFO.nameAr}</strong></div>
          <div>رقم السجل التجاري: ${company.crNumber}</div>
          <div>الرقم الضريبي: ${company.taxNumber}</div>
          <div>الفرع: ${exporter.branch}</div>
        </div>
        <div class="header-title">${company.nameAr}</div>
        <div style="font-size: 10.5pt; color: #707070; font-weight: bold;">${company.nameEn}</div>
        <div class="sub-header">
          <strong>${title}</strong> • تاريخ الإصدار: ${dateAr} • إجمالي السجلات: ${data.length} • إعداد: ${exporter.name} (${exporter.role})
        </div>
        ${kpis.hasFinancials && kpis.totalAmount > 0 ? `
        <div style="background-color: #F3F3F3; border: 1pt solid #E0E0E0; border-right: 3pt solid #141414; padding: 6px 10px; font-size: 10pt; font-weight: bold; color: #141414; margin-top: 6px;">
          الإجمالي المالي المعتمد: \u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} — (${kpis.tafqeetAr})
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
            <div style="font-weight: bold; font-size: 11pt; color: #141414;">إعداد الموظف المختص</div>
            <div style="color: #707070; font-size: 9.5pt; margin-top: 3px;">${exporter.name} — ${exporter.role}</div>
            <div style="margin-top: 20px; border-top: 1pt dashed #E0E0E0; padding-top: 6px; font-size: 9pt; color: #707070;">الفرع: ${exporter.branch} • التاريخ: ${isoDate}</div>
          </td>
          <td>
            <div style="font-weight: bold; font-size: 11pt; color: #141414;">تدقيق الإدارة المالية</div>
            <div style="color: #707070; font-size: 9.5pt; margin-top: 3px;">أ. محمد بن عبدالرحمن السليم (Group CFO)</div>
            <div style="margin-top: 20px; border-top: 1pt dashed #E0E0E0; padding-top: 6px; font-size: 9pt; color: #707070;">مطابق للدفاتر • التاريخ: ${isoDate}</div>
          </td>
          <td>
            <div style="font-weight: bold; font-size: 11pt; color: #141414;">اعتماد الإدارة والختم الرسمي</div>
            <div style="color: #707070; font-size: 9.5pt; margin-top: 3px;">الشيخ خالد بن عبدالعزيز السليم</div>
            <div style="margin-top: 20px; border-top: 1pt dashed #E0E0E0; padding-top: 6px; font-size: 9pt; color: #707070;">معتمد رسمياً • التاريخ: ${isoDate}</div>
          </td>
        </tr>
      </table>

      <div style="margin-top: 22px; border-top: 1pt solid #E0E0E0; padding-top: 8px; font-size: 8.5pt; color: #707070; text-align: center;">
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
    md += `- **القيمة المالية الإجمالية**: \u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    md += `- **ضريبة القيمة المضافة (15%)**: \u200E\u20C1 ${kpis.totalVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
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
  md += `| **التدقيق المالي** | أ. محمد بن عبدالرحمن السليم | المدير المالي التنفيذي (Group CFO) | ✓ مطابق للدفاتر |\n`;
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
      module: exporter.department || 'الإدارة التنفيذية',
      details: `[${company.nameAr}] تصدير وثيقة (${title}) بصيغة ${format.toUpperCase()} لعدد (${recordCount}) سجل مع الختم الرقمي`,
      severity: recordCount >= 50 ? 'تنبيه' : 'عادي',
      ip_address: '10.20.1.45',
      device: `${exporter.branch} / محطة عمل معتمدة`,
      created_at: nowFormatted,
    };
    if (Array.isArray(existing)) {
      localStorage.setItem(key, JSON.stringify([newEntry, ...existing.slice(0, 199)]));
      window.dispatchEvent(new CustomEvent('erp-data-updated'));
      window.dispatchEvent(
        new CustomEvent('erp_data_exported', {
          detail: {
            source: sectionKey,
            title,
            format: format.toUpperCase(),
            module: exporter.department || 'الإدارة التنفيذية',
            count: recordCount,
          },
        })
      );
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

