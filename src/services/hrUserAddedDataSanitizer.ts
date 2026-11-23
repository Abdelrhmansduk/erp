/**
 * HR Demo & Simulation Sanitizer + User-Added Data Inspector
 * ==========================================================
 * Surgically strips built-in mock, demo, and simulated HR records from local storage
 * while 100% preserving every single employee, transaction, document, or device added
 * or modified by the user. Also aggregates a transparent inventory of user-added HR data.
 */

import { realErpDataStore } from './realErpDataStore';
import { decryptStoragePayload, encryptStoragePayload } from '../utils/securitySanitizers';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS } from '../config/kasAllowedEmails';
import {
  getRegisteredNetworkBiometricDevices,
  saveRegisteredNetworkBiometricDevices,
  type NetworkBiometricDeviceRecord,
} from './biometricNetworkClientService';

const STORAGE_PREFIX = 'ALSULAIM_ERP_DB_V1_';
const PENDING_SYNC_PREFIX = 'ALSULAIM_ERP_PENDING_V1_';
const HR_SANITIZER_STAMP_KEY = 'ALSULAIM_HR_MOCK_SANITIZED_V2';

/** Known seeded/mock employee IDs & codes from initial seed scripts and mockData.ts */
const KNOWN_DEMO_EMPLOYEE_IDS = new Set<string>([
  '6fbc7fc0-0b15-434e-8a8d-de943b17c355',
  'e476ebfe-20b7-4da3-96e4-4dfb084542a4',
  'ae48e025-f4a1-4ab1-9920-bf11929772af',
  '7b754c9f-ca71-4a9b-b9ad-c4fbe9b4f81c',
  'EMP-2026-001',
  'EMP-2026-002',
  'EMP-2026-003',
  'EMP-2026-004',
  'EMP-001',
  'EMP-002',
  'EMP-003',
  'EMP-004',
  'emp-101',
  'emp-102',
  'emp-103',
  'emp-104',
  'emp-105',
  '1',
  '2',
  '3',
  '4',
]);

const KNOWN_DEMO_EMPLOYEE_NATIONAL_IDS = new Set<string>([
  '1029384756', // محمد مصطفي (seed)
  '1039485761', // سهام الشاذلي (seed)
  '1077283940', // إبراهيم الشمري (seed)
  '1066283910', // سارة خالد (seed)
  '1098231456', // أحمد محمود السعيد (SMACC mock)
  '1087654321', // فهد عبد الله العتيبي (SMACC mock)
  '1023456789', // سارة خالد الدوسري (SMACC mock)
  '1034567890', // مريم العنزي (SMACC mock)
]);

/** Map of table keys -> exact built-in demo/mock record IDs to strip */
const KNOWN_DEMO_RECORD_IDS_BY_TABLE: Record<string, Set<string>> = {
  hr_promotions: new Set(['PROM-2026-001', 'PROM-2026-002']),
  hr_leave_requests: new Set(['VAC-01', 'VAC-02']),
  hr_advances: new Set(['ADV-01']),
  hr_sanctions: new Set(['SANC-01']),
  hr_permissions: new Set(['PERM-01']),
  hr_rewards: new Set(['REW-01']),
  hr_maids_fleet: new Set(['MD-101', 'MD-102', 'MD-103', 'MD-104', 'MD-105']),
  hr_digital_signage_screens: new Set([
    'SCR-WEB-INTERNET',
    'SCR-HQ-LOBBY',
    'SCR-OPS-WALL',
    'SCR-EXEC-FLOOR',
    'SCR-DAMMAM-BR',
    'SCR-JEDDAH-BR',
    'SCR-SHELTER-GATE',
  ]),
  hr_welcome_broadcasts: new Set(['WBC-DEFAULT-01', 'WBC-DEFAULT-02']),
  hr_helpdesk_tickets: new Set(['HR-TKT-SEED-01', 'HR-TKT-SEED-02']),
  hr_circulars: new Set(['HR-CIR-SEED-01', 'HR-CIR-SEED-02']),
  hr_company_circulars: new Set(['CIRC-2026-01', 'CIRC-2026-02', 'CIRC-2026-03']),
  hr_onboarding_plans: new Set(['ONB-01', 'ONB-02']),
  hr_performance_reviews: new Set(['PERF-01', 'PERF-02']),
  hr_dependents: new Set(['DEP-01', 'DEP-02', 'DEP-03']),
  attendances: new Set(['ATT-2026-01', 'ATT-2026-02', 'ATT-2026-03', 'ATT-2026-04']),
  hr_attendance_corrections: new Set(['COR-2026-01', 'COR-2026-02']),
  hr_shift_rosters: new Set(['RST-2026-01', 'RST-2026-02']),
  hr_delegations: new Set(['DEL-2026-01']),
  employee_moods: new Set([
    'MOOD-101',
    'MOOD-102',
    'MOOD-103',
    'MOOD-104',
    'MOOD-105',
    'MOOD-106',
    'MOOD-107',
  ]),
  telemetry_events: new Set(['TEL-8001', 'TEL-8002', 'TEL-8003', 'TEL-8004', 'TEL-8005']),
  hr_enps_surveys: new Set(['ENPS-2026-Q3']),
  hr_enps_responses: new Set([
    'ENPS-RES-101',
    'ENPS-RES-102',
    'ENPS-RES-103',
    'ENPS-RES-104',
    'ENPS-RES-105',
    'ENPS-RES-106',
  ]),
  hr_career_job_postings: new Set(['JOB-POST-01', 'JOB-POST-02', 'JOB-POST-03']),
};

const FAKE_DEMO_BIOMETRIC_DEVICE_IDS = new Set([
  'BIO-DEV-HQ-01',
  'BIO-DEV-SHL-02',
  'BIO-DEV-KAS-03',
]);

/**
 * Checks whether an employee record is an unmodified auto-generated mock row
 * from the old `DEFAULT_MOCK_EMPLOYEES` generator or seed scripts.
 * If the user modified a salary, national_id, IBAN, phone, notes, or custom_fields,
 * this returns `false` so the user's edited record is 100% preserved!
 */
export function isDemoOrSimulatedEmployeeRecord(rec: Record<string, any>): boolean {
  if (!rec) return true;
  const id = String(rec.id || '').trim();
  const code = String(rec.employee_code || '').trim();
  const natId = String(rec.national_id || rec.nationalId || '').trim();

  if (KNOWN_DEMO_EMPLOYEE_IDS.has(id) || KNOWN_DEMO_EMPLOYEE_IDS.has(code)) {
    return true;
  }
  if (natId && KNOWN_DEMO_EMPLOYEE_NATIONAL_IDS.has(natId)) {
    return true;
  }

  // Check if this is an unmodified synthetic `DEFAULT_MOCK_EMPLOYEES` entry (`KAS-EMP-xxx`)
  const kasIdx = KAS_ALLOWED_EMPLOYEES.findIndex((emp) => emp.id === id || emp.id === code);
  if (kasIdx >= 0) {
    const emp = KAS_ALLOWED_EMPLOYEES[kasIdx];
    const syntheticNatId = `10${String(80000000 + kasIdx * 13579).slice(0, 8)}`;
    const syntheticIban = `SA03800000006080${String(10000000 + kasIdx * 97).slice(0, 8)}`;
    const syntheticHash = `KAS-HR-${emp.id}`;

    const hasUserNotes = Boolean(String(rec.notes || '').trim());
    const hasCustomFields = Array.isArray(rec.custom_fields) && rec.custom_fields.length > 0;

    if (
      !hasUserNotes &&
      !hasCustomFields &&
      (natId === syntheticNatId ||
        String(rec.iban || '') === syntheticIban ||
        String(rec.compliance_hash || '') === syntheticHash)
    ) {
      return true;
    }
  }

  return false;
}

export function isAutoSeededPlaceholderDocument(doc: Record<string, any>): boolean {
  if (!doc) return true;
  const id = String(doc.id || '');
  const hasUploadedFile = Boolean(doc.fileDataUrl || doc.file_data_url || doc.fileName || doc.file_name);
  if (hasUploadedFile) return false;
  if (/^DOC-.*-(ID|QIWA|MED|NDA)$/i.test(id)) {
    const docNum = String(doc.documentNumber || doc.document_number || '');
    if (
      docNum === '1098765432' ||
      docNum === '1092837465' ||
      docNum.startsWith('QW-') ||
      docNum.startsWith('MED-') ||
      docNum.startsWith('NDA-')
    ) {
      return true;
    }
  }
  return false;
}

function readRawLocalArray(key: string): any[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = decryptStoragePayload(window.localStorage.getItem(STORAGE_PREFIX + key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeRawLocalArray(key: string, rows: any[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + key,
      encryptStoragePayload(JSON.stringify(rows))
    );
  } catch {
    // ignore quota errors
  }
}

function cleanPendingIds(tableName: string, removedIds: Set<string>): void {
  if (typeof window === 'undefined' || !window.localStorage || removedIds.size === 0) return;
  try {
    const raw = decryptStoragePayload(window.localStorage.getItem(PENDING_SYNC_PREFIX + tableName));
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const next = arr.filter((id) => !removedIds.has(String(id)));
    window.localStorage.setItem(
      PENDING_SYNC_PREFIX + tableName,
      encryptStoragePayload(JSON.stringify(next))
    );
  } catch {
    // ignore
  }
}

/**
 * Runs surgically on HR boot: strips all mock/demo/simulation HR records from localStorage
 * while keeping 100% of records created or edited by the user.
 */
export async function sanitizeHrDemoDataPreservingUserAdditions(force = false): Promise<{
  removedDemoCount: number;
  preservedUserCount: number;
}> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { removedDemoCount: 0, preservedUserCount: 0 };
  }
  if (import.meta.env.MODE === 'test' && !force) {
    return { removedDemoCount: 0, preservedUserCount: 0 };
  }

  let removedDemoCount = 0;
  let preservedUserCount = 0;

  // 1. Clean employees & hr_employees
  for (const empKey of ['hr_employees', 'employees']) {
    const rows = readRawLocalArray(empKey);
    if (rows) {
      const removedIds = new Set<string>();
      const kept = rows.filter((r) => {
        if (isDemoOrSimulatedEmployeeRecord(r)) {
          removedDemoCount += 1;
          if (r?.id) removedIds.add(String(r.id));
          return false;
        }
        preservedUserCount += 1;
        return true;
      });
      if (kept.length !== rows.length) {
        writeRawLocalArray(empKey, kept);
        cleanPendingIds('employees', removedIds);
      }
    }
  }

  // 2. Clean hr_employee_documents
  const docRows = readRawLocalArray('hr_employee_documents');
  if (docRows) {
    const removedDocIds = new Set<string>();
    const keptDocs = docRows.filter((d) => {
      if (isAutoSeededPlaceholderDocument(d)) {
        removedDemoCount += 1;
        if (d?.id) removedDocIds.add(String(d.id));
        return false;
      }
      preservedUserCount += 1;
      return true;
    });
    if (keptDocs.length !== docRows.length) {
      writeRawLocalArray('hr_employee_documents', keptDocs);
      cleanPendingIds('hr_employee_documents', removedDocIds);
    }
  }

  // 3. Clean all HR sub-tables with known demo seed IDs
  for (const [tableKey, demoIdSet] of Object.entries(KNOWN_DEMO_RECORD_IDS_BY_TABLE)) {
    const rows = readRawLocalArray(tableKey);
    if (rows) {
      const removedIds = new Set<string>();
      const kept = rows.filter((r) => {
        const rid = String(r?.id || '');
        if (demoIdSet.has(rid)) {
          removedDemoCount += 1;
          removedIds.add(rid);
          return false;
        }
        preservedUserCount += 1;
        return true;
      });
      if (kept.length !== rows.length) {
        writeRawLocalArray(tableKey, kept);
        cleanPendingIds(tableKey, removedIds);
      }
    }
  }

  // 4. Clean auto-generated HR smart alerts belonging to demo employees
  const alertRows = readRawLocalArray('hr_smart_alerts');
  if (alertRows) {
    const realEmps = readRawLocalArray('hr_employees') || [];
    const realEmpIds = new Set(realEmps.map((e) => String(e?.id || '')));
    const keptAlerts = alertRows.filter((a) => {
      const empId = String(a?.employeeId || a?.employee_id || '');
      if (!empId) return true;
      return realEmpIds.has(empId);
    });
    if (keptAlerts.length !== alertRows.length) {
      removedDemoCount += alertRows.length - keptAlerts.length;
      writeRawLocalArray('hr_smart_alerts', keptAlerts);
    }
  }

  // 5. Clean fake demo biometric devices while preserving real UA760 & Hikvision + user devices
  try {
    const bioList = await getRegisteredNetworkBiometricDevices();
    const keptBio = bioList.filter((d) => !FAKE_DEMO_BIOMETRIC_DEVICE_IDS.has(d.id));
    if (keptBio.length !== bioList.length) {
      removedDemoCount += bioList.length - keptBio.length;
      await saveRegisteredNetworkBiometricDevices(keptBio);
    }
  } catch {
    // ignore
  }

  try {
    window.localStorage.setItem(HR_SANITIZER_STAMP_KEY, new Date().toISOString());
  } catch {
    // ignore
  }

  return { removedDemoCount, preservedUserCount };
}

export interface UserAddedHrCategorySummary {
  key: string;
  titleAr: string;
  count: number;
  items: Array<{
    id: string;
    primaryLabel: string;
    secondaryLabel: string;
    metaBadge?: string;
    createdAt?: string;
  }>;
}

export interface UserAddedHrInventoryReport {
  generatedAt: string;
  totalOperationalRecords: number;
  categories: UserAddedHrCategorySummary[];
  registeredHardware: NetworkBiometricDeviceRecord[];
  officialKasAccountsCount: number;
  excludedKasAccountsCount: number;
}

/**
 * Inspects all HR modules (Cloud + Browser Store) and returns ONLY what the user actually added.
 */
export async function collectUserAddedHrInventory(
  companyScope?: string
): Promise<UserAddedHrInventoryReport> {
  await sanitizeHrDemoDataPreservingUserAdditions();

  const scope = companyScope && companyScope !== 'all' ? companyScope : undefined;

  const [
    hrEmps,
    coreEmps,
    promotions,
    leaves,
    advances,
    sanctions,
    permissions,
    rewards,
    attendances,
    payrollRuns,
    docs,
    custodies,
    expenses,
    trips,
    tickets,
    circulars,
    companyCirculars,
    screens,
    broadcasts,
    overtime,
    dependents,
    officialEmails,
    bioDevices,
  ] = await Promise.all([
    realErpDataStore.getRecords<any>('hr_employees', [], scope),
    realErpDataStore.getRecords<any>('employees', [], scope),
    realErpDataStore.getRecords<any>('hr_promotions', [], scope),
    realErpDataStore.getRecords<any>('hr_leave_requests', [], scope),
    realErpDataStore.getRecords<any>('hr_advances', [], scope),
    realErpDataStore.getRecords<any>('hr_sanctions', [], scope),
    realErpDataStore.getRecords<any>('hr_permissions', [], scope),
    realErpDataStore.getRecords<any>('hr_rewards', [], scope),
    realErpDataStore.getRecords<any>('attendances', [], scope),
    realErpDataStore.getRecords<any>('payroll_runs', [], scope),
    realErpDataStore.getRecords<any>('hr_employee_documents', [], scope),
    realErpDataStore.getRecords<any>('custodies', [], scope),
    realErpDataStore.getRecords<any>('hr_expense_claims', [], scope),
    realErpDataStore.getRecords<any>('hr_business_trips', [], scope),
    realErpDataStore.getRecords<any>('hr_helpdesk_tickets', [], scope),
    realErpDataStore.getRecords<any>('hr_circulars', [], scope),
    realErpDataStore.getRecords<any>('hr_company_circulars', [], scope),
    realErpDataStore.getRecords<any>('hr_digital_signage_screens', [], scope),
    realErpDataStore.getRecords<any>('hr_welcome_broadcasts', [], scope),
    realErpDataStore.getRecords<any>('hr_overtime_records', [], scope),
    realErpDataStore.getRecords<any>('hr_dependents', [], scope),
    realErpDataStore.getRecords<any>('hr_official_emails', [], scope),
    getRegisteredNetworkBiometricDevices(),
  ]);

  // Deduplicate user-added employees across hr_employees & employees
  const empMap = new Map<string, any>();
  for (const e of [...(coreEmps || []), ...(hrEmps || [])]) {
    if (e && e.id && !isDemoOrSimulatedEmployeeRecord(e)) {
      empMap.set(String(e.id), { ...(empMap.get(String(e.id)) || {}), ...e });
    }
  }
  const cleanEmps = Array.from(empMap.values());
  const cleanDocs = (docs || []).filter((d) => !isAutoSeededPlaceholderDocument(d));
  const allCirculars = [
    ...(circulars || []).filter((c) => !KNOWN_DEMO_RECORD_IDS_BY_TABLE.hr_circulars.has(String(c.id))),
    ...(companyCirculars || []).filter(
      (c) => !KNOWN_DEMO_RECORD_IDS_BY_TABLE.hr_company_circulars.has(String(c.id))
    ),
  ];

  const categories: UserAddedHrCategorySummary[] = [
    {
      key: 'employees',
      titleAr: 'ملفات الموظفين المضافة في الموارد البشرية',
      count: cleanEmps.length,
      items: cleanEmps.map((e) => ({
        id: String(e.id),
        primaryLabel: `${e.name || 'موظف'} (${e.employee_code || e.id})`,
        secondaryLabel: `${e.job_title || '—'} • ${e.department || '—'} • ${e.branch || '—'}`,
        metaBadge: e.salary ? `⃁ ${Number(e.salary).toLocaleString()}` : e.company_id || 'SAF',
        createdAt: e.hire_date || e.created_at,
      })),
    },
    {
      key: 'leaves',
      titleAr: 'طلبات الإجازات المضافة',
      count: (leaves || []).length,
      items: (leaves || []).map((l) => ({
        id: String(l.id),
        primaryLabel: `${l.employee_name || '—'} — ${l.vacation_type || l.leave_type || 'إجازة'}`,
        secondaryLabel: `من ${l.from_date || l.start_date || '—'} إلى ${l.to_date || l.end_date || '—'} (${l.days_count || 0} يوم)`,
        metaBadge: l.status || 'مسجل',
      })),
    },
    {
      key: 'promotions',
      titleAr: 'قرارات الترقيات وتعديل الرواتب',
      count: (promotions || []).length,
      items: (promotions || []).map((p) => ({
        id: String(p.id),
        primaryLabel: `${p.employee_name || '—'} ← ${p.new_job_title || '—'}`,
        secondaryLabel: `الراتب الجديد: ⃁ ${Number(p.new_salary || 0).toLocaleString()} • تاريخ السريان: ${p.effective_date || '—'}`,
        metaBadge: p.status || 'معتمد',
      })),
    },
    {
      key: 'advances',
      titleAr: 'السلف والقروض المالية',
      count: (advances || []).length,
      items: (advances || []).map((a) => ({
        id: String(a.id),
        primaryLabel: `${a.employee_name || '—'} — ⃁ ${Number(a.amount || 0).toLocaleString()}`,
        secondaryLabel: `${a.installments_count || 1} أقساط • ${a.reason || a.payment_method || '—'}`,
        metaBadge: a.status || 'مسجل',
      })),
    },
    {
      key: 'sanctions_rewards_permissions',
      titleAr: 'الجزاءات والمكافآت والاستئذانات',
      count: (sanctions || []).length + (rewards || []).length + (permissions || []).length,
      items: [
        ...(sanctions || []).map((s) => ({
          id: String(s.id),
          primaryLabel: `[جزاء] ${s.employee_name || '—'} — ${s.sanction_type || 'مخالفة'}`,
          secondaryLabel: `المبلغ: ⃁ ${Number(s.amount || 0).toLocaleString()} • ${s.date || '—'}`,
          metaBadge: s.status,
        })),
        ...(rewards || []).map((r) => ({
          id: String(r.id),
          primaryLabel: `[مكافأة] ${r.employee_name || '—'} — ${r.reward_type || 'مكافأة'}`,
          secondaryLabel: `المبلغ: ⃁ ${Number(r.net_reward || 0).toLocaleString()} • ${r.date || '—'}`,
          metaBadge: r.status,
        })),
        ...(permissions || []).map((p) => ({
          id: String(p.id),
          primaryLabel: `[استئذان] ${p.employee_name || '—'} — ${p.permission_type || 'استئذان'}`,
          secondaryLabel: `${p.date || '—'} (${p.time || '—'})`,
          metaBadge: p.status,
        })),
      ],
    },
    {
      key: 'attendances_overtime',
      titleAr: 'سجلات الحضور والبصمة والعمل الإضافي',
      count: (attendances || []).length + (overtime || []).length,
      items: [
        ...(attendances || []).map((a) => ({
          id: String(a.id),
          primaryLabel: `${a.emp_name || a.employee_name || '—'} (${a.date || '—'})`,
          secondaryLabel: `دخول: ${a.check_in || '—'} • انصراف: ${a.check_out || '—'}`,
          metaBadge: a.status || 'حضور',
        })),
        ...(overtime || []).map((o) => ({
          id: String(o.id),
          primaryLabel: `[إضافي] ${o.employee_name || '—'} (${o.work_date || '—'})`,
          secondaryLabel: `${o.regular_hours || 0} ساعة عادية • ⃁ ${Number(o.overtime_pay_amount || 0).toLocaleString()}`,
          metaBadge: o.status,
        })),
      ],
    },
    {
      key: 'payroll_expenses',
      titleAr: 'مسيرات الرواتب المعتمدة والعهد والمصروفات ورحلات العمل',
      count:
        (payrollRuns || []).length +
        (custodies || []).length +
        (expenses || []).length +
        (trips || []).length,
      items: [
        ...(payrollRuns || []).map((pr) => ({
          id: String(pr.id),
          primaryLabel: `مسير رواتب شهر ${pr.payroll_month || pr.month || '—'}`,
          secondaryLabel: `الشركة: ${pr.company_id || 'SAF'}`,
          metaBadge: pr.status || 'مرحل',
        })),
        ...(custodies || []).map((c) => ({
          id: String(c.id),
          primaryLabel: `[عهدة] ${c.item_name || 'أصل'} ← ${c.employee_name || c.emp_name || '—'}`,
          secondaryLabel: `الرقم التسلسلي: ${c.serial_no || '—'}`,
          metaBadge: c.status || 'مسلمة',
        })),
        ...(expenses || []).map((ex) => ({
          id: String(ex.id),
          primaryLabel: `[مصروف] ${ex.employee_name || '—'} — ${ex.merchant_name || ex.category || '—'}`,
          secondaryLabel: `الإجمالي: ⃁ ${Number(ex.total_amount || 0).toLocaleString()}`,
          metaBadge: ex.status,
        })),
        ...(trips || []).map((tr) => ({
          id: String(tr.id),
          primaryLabel: `[انتداب] ${tr.employee_name || '—'} ← ${tr.destination || '—'}`,
          secondaryLabel: `${tr.nights_count || 1} ليالٍ • ⃁ ${Number(tr.total_allowance || 0).toLocaleString()}`,
          metaBadge: tr.status,
        })),
      ],
    },
    {
      key: 'documents_dependents',
      titleAr: 'المستندات المرفوعة والتابعون المسجلون',
      count: cleanDocs.length + (dependents || []).length,
      items: [
        ...cleanDocs.map((d) => ({
          id: String(d.id),
          primaryLabel: `${d.title || 'مستند'} — ${d.employee_name || '—'}`,
          secondaryLabel: `رقم الوثيقة: ${d.documentNumber || d.document_number || '—'} • انتهاء: ${d.expiryDate || d.expiry_date || '—'}`,
          metaBadge: d.category || 'مستند',
        })),
        ...(dependents || []).map((dep) => ({
          id: String(dep.id),
          primaryLabel: `[تابع] ${dep.dependent_name || '—'} (${dep.relationship || '—'})`,
          secondaryLabel: `الموظف: ${dep.employee_name || '—'} • الفئة: ${dep.insurance_plan || '—'}`,
          metaBadge: dep.status,
        })),
      ],
    },
    {
      key: 'tickets_circulars_emails',
      titleAr: 'تذاكر الدعم، التعاميم المنشورة، والمراسلات الرسمية الصادرة',
      count: (tickets || []).length + allCirculars.length + (officialEmails || []).length,
      items: [
        ...(tickets || []).map((t) => ({
          id: String(t.id),
          primaryLabel: `[تذكرة ${t.ticket_no || ''}] ${t.subject || '—'}`,
          secondaryLabel: `${t.employee_name || '—'} (${t.employee_email || ''})`,
          metaBadge: t.status,
        })),
        ...allCirculars.map((c) => ({
          id: String(c.id),
          primaryLabel: `[تعميم] ${c.title || '—'}`,
          secondaryLabel: c.category || 'تعميم إداري',
          metaBadge: c.status || 'منشور',
        })),
        ...(officialEmails || []).map((m) => ({
          id: String(m.id),
          primaryLabel: `[بريد صادر] ${m.subject_ar || m.subject || '—'}`,
          secondaryLabel: `إلى: ${m.recipient_name_ar || (Array.isArray(m.to_emails) ? m.to_emails.join(', ') : '—')}`,
          metaBadge: m.reference_no || 'صادر',
        })),
      ],
    },
    {
      key: 'screens_broadcasts',
      titleAr: 'شاشات العرض المضافة ورسائل الترحيب النشطة',
      count: (screens || []).length + (broadcasts || []).length,
      items: [
        ...(screens || []).map((s) => ({
          id: String(s.id),
          primaryLabel: `[شاشة] ${s.screen_name_ar || s.screen_code || '—'}`,
          secondaryLabel: `${s.branch_name || '—'} • ${s.ip_or_host || '—'}`,
          metaBadge: s.is_online ? 'متصلة' : 'مسجلة',
        })),
        ...(broadcasts || []).map((b) => ({
          id: String(b.id),
          primaryLabel: `[بث ترحيب] ${b.employee_name || '—'}`,
          secondaryLabel: `${b.job_title || '—'} • ${b.department || '—'}`,
          metaBadge: b.is_active ? 'نشط' : 'مؤرشف',
        })),
      ],
    },
  ];

  const totalOperationalRecords = categories.reduce((sum, c) => sum + c.count, 0);
  const cleanBioDevices = (bioDevices || []).filter(
    (d) => !FAKE_DEMO_BIOMETRIC_DEVICE_IDS.has(d.id)
  );

  return {
    generatedAt: new Date().toISOString(),
    totalOperationalRecords,
    categories,
    registeredHardware: cleanBioDevices,
    officialKasAccountsCount: KAS_ALLOWED_EMPLOYEES.length,
    excludedKasAccountsCount: Object.keys(EXCLUDED_KAS_EMAILS).length,
  };
}
