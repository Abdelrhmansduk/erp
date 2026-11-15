/**
 * Unified Employee Profile & Persistent Digital Archive Service
 * Synchronizes `hr_employees` and `employees` tables in realErpDataStore,
 * logs field-level audit changes, manages 30-day Soft-Delete / Restore,
 * and persists employee documents (`hr_employee_documents`).
 */

import { realErpDataStore } from './realErpDataStore';
import {
  CanonicalEntityCode,
  normalizeCanonicalEntityCode,
  resolveDocumentBranding,
} from './entityBrandingService';
import {
  archiveRecordBeforeSoftDelete,
  recordFieldLevelChanges,
  RecycleBinEntry,
} from './quickShareService';

export interface PersistentEmployeeDocument {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  company_id: string;
  title: string;
  category:
    | 'هوية/إقامة'
    | 'جواز سفر'
    | 'عقد قوى'
    | 'تأمين طبي'
    | 'تأمينات GOSI'
    | 'شهادة علمية/مهنية'
    | 'اتفاقية قانونية'
    | 'أخرى';
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'ساري' | 'وشيك الانتهاء' | 'منتهي';
  verified: boolean;
  version: number;
  fileName?: string;
  fileDataUrl?: string;
  notes?: string;
}

export function computeDocumentStatusFromExpiry(
  expiryDate?: string
): 'ساري' | 'وشيك الانتهاء' | 'منتهي' {
  if (!expiryDate || expiryDate.includes('مستمر')) return 'ساري';
  const clean = String(expiryDate).slice(0, 10);
  const dt = new Date(clean);
  if (Number.isNaN(dt.getTime())) return 'ساري';
  const diffDays = Math.ceil((dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'منتهي';
  if (diffDays <= 45) return 'وشيك الانتهاء';
  return 'ساري';
}

export function normalizeEmployeeEntityCode(emp: any): CanonicalEntityCode {
  const explicit =
    normalizeCanonicalEntityCode(emp?.company_id) ||
    normalizeCanonicalEntityCode(emp?.companyCode) ||
    normalizeCanonicalEntityCode(emp?.company_code) ||
    normalizeCanonicalEntityCode(emp?.company_name);
  if (explicit) return explicit;
  return resolveDocumentBranding(emp).code;
}

export async function saveUnifiedEmployeeProfile(
  input: Record<string, any>,
  existingRecord?: Record<string, any> | null,
  actorName?: string
): Promise<Record<string, any>> {
  const base = existingRecord || {};
  const entityCode = normalizeEmployeeEntityCode({ ...base, ...input });

  const basic = Number(
    input.basic_salary ?? base.basic_salary ?? Math.round(Number(input.salary ?? base.salary ?? 8000) * 0.65)
  );
  const housing = Number(
    input.housing_allowance ?? base.housing_allowance ?? Math.round(Number(input.salary ?? base.salary ?? 8000) * 0.25)
  );
  const transport = Number(
    input.transport_allowance ?? base.transport_allowance ?? Math.round(Number(input.salary ?? base.salary ?? 8000) * 0.1)
  );
  const otherAllowances = Number(
    input.other_allowances ?? input.allowances ?? base.other_allowances ?? base.allowances ?? 0
  );

  const computedTotalSalary =
    input.basic_salary !== undefined ||
    input.housing_allowance !== undefined ||
    input.transport_allowance !== undefined ||
    input.other_allowances !== undefined
      ? basic + housing + transport + otherAllowances
      : Number(input.salary ?? base.salary ?? basic + housing + transport + otherAllowances);

  const nowIso = new Date().toISOString().slice(0, 10);
  const empId = String(input.id || base.id || `emp-${Date.now()}`);
  const empCode = String(
    input.employee_code ||
      base.employee_code ||
      `EMP-${entityCode}-${Math.floor(100 + Math.random() * 900)}`
  );
  const jobTitle = String(
    input.job_title || input.role || base.job_title || base.role || 'أخصائي عمليات'
  );

  const merged: Record<string, any> = {
    ...base,
    ...input,
    id: empId,
    employee_code: empCode,
    company_id: entityCode,
    name: String(input.name ?? base.name ?? '').trim(),
    name_en: String(input.name_en ?? base.name_en ?? '').trim(),
    job_title: jobTitle,
    role: jobTitle,
    department: String(input.department ?? base.department ?? 'الإدارة العامة'),
    branch: String(input.branch ?? base.branch ?? 'المركز الرئيسي - الرياض'),
    nationality: String(
      input.nationality ??
        base.nationality ??
        (String(input.national_id ?? base.national_id ?? '1').startsWith('1') ? 'سعودي' : 'مقيم')
    ),
    national_id: String(input.national_id ?? base.national_id ?? '1098765432'),
    iqama_expiry: String(input.iqama_expiry ?? base.iqama_expiry ?? '2027-12-31'),
    passport_number: String(input.passport_number ?? base.passport_number ?? ''),
    passport_expiry: String(input.passport_expiry ?? base.passport_expiry ?? '2028-06-30'),
    qiwa_contract_no: String(
      input.qiwa_contract_no ?? base.qiwa_contract_no ?? `QW-${empCode}`
    ),
    qiwa_contract_expiry: String(
      input.qiwa_contract_expiry ?? base.qiwa_contract_expiry ?? '2027-06-30'
    ),
    gosi_number: String(input.gosi_number ?? base.gosi_number ?? ''),
    medical_insurance_provider: String(
      input.medical_insurance_provider ?? base.medical_insurance_provider ?? 'بوبا العربية للتأمين التعاوني'
    ),
    medical_insurance_class: String(
      input.medical_insurance_class ?? base.medical_insurance_class ?? 'VIP - A'
    ),
    medical_insurance_expiry: String(
      input.medical_insurance_expiry ?? base.medical_insurance_expiry ?? '2027-05-15'
    ),
    phone: String(input.phone ?? base.phone ?? '0500000000'),
    email: String(input.email ?? base.email ?? ''),
    emergency_contact_name: String(
      input.emergency_contact_name ?? base.emergency_contact_name ?? ''
    ),
    emergency_contact_phone: String(
      input.emergency_contact_phone ?? base.emergency_contact_phone ?? ''
    ),
    national_address: String(input.national_address ?? base.national_address ?? 'الرياض'),
    marital_status: String(input.marital_status ?? base.marital_status ?? 'متزوج'),
    gender: String(input.gender ?? base.gender ?? 'ذكر'),
    qualification: String(input.qualification ?? base.qualification ?? 'بكالوريوس'),
    birth_date: String(input.birth_date ?? base.birth_date ?? '1992-01-01'),
    manager_id:
      input.manager_id !== undefined
        ? input.manager_id
        : base.manager_id !== undefined
        ? base.manager_id
        : undefined,
    default_shift_id: String(
      input.default_shift_id ?? base.default_shift_id ?? 'SHF-MAIN-FIXED'
    ),
    pay_group: String(input.pay_group ?? base.pay_group ?? 'إداري قياسي'),
    cost_center_allocations: Array.isArray(input.cost_center_allocations)
      ? input.cost_center_allocations
      : Array.isArray(base.cost_center_allocations)
      ? base.cost_center_allocations
      : undefined,
    annual_ticket_allowance: Number(
      input.annual_ticket_allowance ?? base.annual_ticket_allowance ?? 0
    ),
    medical_insurance_annual_cost: Number(
      input.medical_insurance_annual_cost ?? base.medical_insurance_annual_cost ?? 3600
    ),
    is_disabled_saudi: Boolean(
      input.is_disabled_saudi ?? base.is_disabled_saudi ?? false
    ),
    is_student_or_flexible_saudi: Boolean(
      input.is_student_or_flexible_saudi ?? base.is_student_or_flexible_saudi ?? false
    ),
    hire_date: String(input.hire_date ?? base.hire_date ?? nowIso),
    probation_days: Number(input.probation_days ?? base.probation_days ?? 90),
    contract_type: String(input.contract_type ?? base.contract_type ?? 'محدد المدة (قوى)'),
    grade: String(input.grade ?? base.grade ?? 'الدرجة الثالثة'),
    basic_salary: basic,
    housing_allowance: housing,
    transport_allowance: transport,
    other_allowances: otherAllowances,
    allowances: otherAllowances,
    salary: computedTotalSalary,
    bank_code: String(input.bank_code ?? base.bank_code ?? 'RJHI'),
    bank_name: String(input.bank_name ?? base.bank_name ?? 'مصرف الراجحي'),
    iban: String(input.iban ?? base.iban ?? ''),
    leave_balance: Number(input.leave_balance ?? base.leave_balance ?? 21),
    status: String(input.status ?? base.status ?? 'على رأس العمل'),
  };

  if (existingRecord && existingRecord.id) {
    recordFieldLevelChanges({
      tableName: 'hr_employees',
      recordId: empId,
      recordLabel: merged.name,
      before: existingRecord,
      after: merged,
      actorName,
      companyId: entityCode,
    });
  }

  // Sync hr_employees
  const hrRows = await realErpDataStore.getRecords<any>('hr_employees', []);
  const existingHr = hrRows.find(
    (r) => String(r.id) === empId || (r.employee_code && r.employee_code === empCode)
  );
  if (existingHr) {
    await realErpDataStore.updateRecord<any>('hr_employees', existingHr.id, merged);
  } else {
    await realErpDataStore.addRecord<any>('hr_employees', merged);
  }

  // Sync employees
  const coreRows = await realErpDataStore.getRecords<any>('employees', []);
  const existingCore = coreRows.find(
    (r) =>
      String(r.id) === empId ||
      (r.employee_code && r.employee_code === empCode) ||
      (r.name && r.name === base.name)
  );
  if (existingCore) {
    await realErpDataStore.updateRecord<any>('employees', existingCore.id, {
      ...existingCore,
      ...merged,
      id: existingCore.id,
    });
  } else {
    await realErpDataStore.addRecord<any>('employees', merged);
  }

  return merged;
}

export async function softDeleteUnifiedEmployeeProfile(
  employee: Record<string, any>,
  reason?: string
): Promise<RecycleBinEntry> {
  const entry = archiveRecordBeforeSoftDelete({
    tableName: 'hr_employees',
    record: employee,
    recordTitle: employee.name || employee.employee_code || String(employee.id),
    reason: reason || 'نقل ملف الموظف إلى سلة المحذوفات المؤقتة',
    companyId: employee.company_id,
  });

  await realErpDataStore.deleteRecord('hr_employees', String(employee.id));

  const coreRows = await realErpDataStore.getRecords<any>('employees', []);
  const matchCore = coreRows.find(
    (r) =>
      String(r.id) === String(employee.id) ||
      (employee.employee_code && r.employee_code === employee.employee_code) ||
      (employee.name && r.name === employee.name)
  );
  if (matchCore) {
    await realErpDataStore.deleteRecord('employees', String(matchCore.id));
  }

  return entry;
}

export async function restoreUnifiedEmployeeFromBin(entry: RecycleBinEntry): Promise<void> {
  if (!entry?.payload) return;
  await saveUnifiedEmployeeProfile(entry.payload, null, 'استعادة من سلة المحذوفات');
}

export async function getPersistentEmployeeDocuments(
  employee: Record<string, any>
): Promise<PersistentEmployeeDocument[]> {
  const empId = String(employee.id || '');
  const empCode = String(employee.employee_code || empId);
  const companyId = normalizeEmployeeEntityCode(employee);
  const allDocs = await realErpDataStore.getRecords<PersistentEmployeeDocument>(
    'hr_employee_documents',
    []
  );

  const matching = (Array.isArray(allDocs) ? allDocs : []).filter(
    (d) => d.employee_id === empId || (empCode && d.employee_code === empCode)
  );

  if (matching.length > 0) {
    return matching.map((d) => ({
      ...d,
      status: computeDocumentStatusFromExpiry(d.expiryDate),
    }));
  }

  // Seed default persistent official documents for this employee once
  const seeded: PersistentEmployeeDocument[] = [
    {
      id: `DOC-${empId}-ID`,
      employee_id: empId,
      employee_code: empCode,
      employee_name: employee.name || '',
      company_id: companyId,
      title: 'بطاقة الهوية الوطنية / هوية مقيم',
      category: 'هوية/إقامة',
      documentNumber: employee.national_id || '1098765432',
      issueDate: employee.hire_date || '2024-01-15',
      expiryDate: employee.iqama_expiry || '2027-12-31',
      status: computeDocumentStatusFromExpiry(employee.iqama_expiry || '2027-12-31'),
      verified: true,
      version: 1,
    },
    {
      id: `DOC-${empId}-QIWA`,
      employee_id: empId,
      employee_code: empCode,
      employee_name: employee.name || '',
      company_id: companyId,
      title: 'عقد العمل الإلكتروني الموحد (منصة قوى)',
      category: 'عقد قوى',
      documentNumber: employee.qiwa_contract_no || `QW-${empCode}`,
      issueDate: employee.hire_date || '2024-01-15',
      expiryDate: employee.qiwa_contract_expiry || '2027-06-30',
      status: computeDocumentStatusFromExpiry(employee.qiwa_contract_expiry || '2027-06-30'),
      verified: true,
      version: 1,
    },
    {
      id: `DOC-${empId}-MED`,
      employee_id: empId,
      employee_code: empCode,
      employee_name: employee.name || '',
      company_id: companyId,
      title: `وثيقة التأمين الطبي المعتمد (${employee.medical_insurance_provider || 'مجلس الضمان الصحي'})`,
      category: 'تأمين طبي',
      documentNumber: `MED-${empCode}`,
      issueDate: '2025-05-15',
      expiryDate: employee.medical_insurance_expiry || '2027-05-15',
      status: computeDocumentStatusFromExpiry(employee.medical_insurance_expiry || '2027-05-15'),
      verified: true,
      version: 1,
    },
    {
      id: `DOC-${empId}-NDA`,
      employee_id: empId,
      employee_code: empCode,
      employee_name: employee.name || '',
      company_id: companyId,
      title: 'اتفاقية عدم الإفشاء وحماية البيانات الشخصية (PDPL & NDA)',
      category: 'اتفاقية قانونية',
      documentNumber: `NDA-${companyId}-${empCode}`,
      issueDate: employee.hire_date || '2024-01-15',
      expiryDate: 'مستمر طيلة فترة العمل',
      status: 'ساري',
      verified: true,
      version: 1,
    },
  ];

  for (const doc of seeded) {
    await realErpDataStore.addRecord('hr_employee_documents', doc);
  }

  return seeded;
}

export async function addPersistentEmployeeDocument(
  doc: Omit<PersistentEmployeeDocument, 'id' | 'status'>
): Promise<PersistentEmployeeDocument> {
  const newDoc: PersistentEmployeeDocument = {
    ...doc,
    id: `DOC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    status: computeDocumentStatusFromExpiry(doc.expiryDate),
  };
  await realErpDataStore.addRecord('hr_employee_documents', newDoc);
  return newDoc;
}

export async function updatePersistentEmployeeDocument(
  docId: string,
  patch: Partial<PersistentEmployeeDocument>
): Promise<PersistentEmployeeDocument | null> {
  const nextPatch = {
    ...patch,
    ...(patch.expiryDate ? { status: computeDocumentStatusFromExpiry(patch.expiryDate) } : {}),
  };
  const updatedList = await realErpDataStore.updateRecord<PersistentEmployeeDocument>(
    'hr_employee_documents',
    docId,
    nextPatch
  );
  return updatedList.find((d) => d.id === docId) || null;
}

export async function softDeletePersistentEmployeeDocument(
  doc: PersistentEmployeeDocument,
  reason?: string
): Promise<void> {
  archiveRecordBeforeSoftDelete({
    tableName: 'hr_employee_documents',
    record: doc,
    recordTitle: `${doc.title} (${doc.employee_name})`,
    reason: reason || 'حذف مستند من أرشيف الموظف',
    companyId: doc.company_id,
  });
  await realErpDataStore.deleteRecord('hr_employee_documents', doc.id);
}
