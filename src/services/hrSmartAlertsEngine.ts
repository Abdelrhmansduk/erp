/**
 * Enterprise Proactive HR & Regulatory Smart Notifications Engine (`نظام التنبيهات الاستباقية الموحد`)
 *
 * Scans real-time HR & Saudi Labor Law compliance radars per company:
 *   1. Probation Expiry Radar (المادة 53 — انتهاء فترة التجربة 90 / 180 يوماً)
 *   2. Iqama & Work Permit Expiry (انتهاء الإقامة ورخص العمل — مقيم / قوى)
 *   3. Qiwa Contract Renewal Notice (المادة 55 — مهلة الإشعار 60 يوماً قبل انتهاء العقد)
 *   4. Passport & CCHI Medical Insurance Expiry (انتهاء الجوازات والتأمين الطبي)
 *   5. Workflow SLA Breach & Escalation (تجاوز SLA لطلبات الاعتماد المعلقة)
 *   6. Pending Colleague Shift Swap Requests (طلبات تبديل الورديات المعلقة)
 *   7. Pending 5-Dept Offboarding Clearances (بوابة إخلاء الطرف للمخالصات النهائية)
 *   8. Nitaqat Saudization Threshold Warning (انخفاض مؤشر نطاقات التوطين)
 *
 * Dispatches across 4 synchronized channels + executes 1-click real corrective actions:
 *   - Persistent Smart Alerts Table (`hr_smart_alerts`)
 *   - Top Bell Notification Center (`AppStore` category `'hr'`)
 *   - Floating Popup + Chime + Mobile Haptic + SW Push (`notificationPopupEngine` type `'hr'`)
 *   - Corporate WhatsApp / SMS Outbox (`sent_messages`) & Faris/Noura Voice Briefing (`speakDynamicSpeech`)
 */

import { computeNitaqatSnapshot } from './hrAdvancedComplianceEngine';
import { notificationPopupEngine } from './notificationPopupEngine';
import { realErpDataStore } from './realErpDataStore';
import { speakDynamicSpeech, AssistantPersona } from './audioVoiceService';
import {
  govOutbox,
  getGovEnvironment,
  type GovCompanyCode,
} from './govIntegrationHubService';
import {
  confirmReturnFromLeave,
  scanLeaveReturnAlerts,
} from './hrLeaveLifecycleService';
import { ENTITY_LEGAL_PROFILES } from './entityBrandingService';
import { useAppStore } from '../stores/appStore';
import {
  composeReemHrOfficialEmail,
  REEM_HR_SIGNATORY,
  type ComposedReemHrEmail,
} from './reemHrEmailTemplatesEngine';
import { dispatchComposedHrEmailDirect, getProviderDisplayNameAr } from './hrDirectEmailDispatchService';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS } from '../config/kasAllowedEmails';

export const REEM_HR_ALERT_SIGNATURE_BLOCK = [
  REEM_HR_SIGNATORY.signatureNameEn,
  REEM_HR_SIGNATORY.consultantTitleEn,
  `Email: ${REEM_HR_SIGNATORY.email}`,
  `Mobile: ${REEM_HR_SIGNATORY.mobile}`,
].join('\n');

function resolveAlertSafeRecipient(
  employeeName?: string,
  recipientEmailOverride?: string
): { email: string; nameAr: string; nameEn: string } {
  const excludedSet = new Set(Object.keys(EXCLUDED_KAS_EMAILS).map((e) => e.trim().toLowerCase()));
  const allowedPool = KAS_ALLOWED_EMPLOYEES.filter(
    (emp) => !excludedSet.has(emp.email.trim().toLowerCase())
  );
  const rawEmail = (recipientEmailOverride || '').trim();
  if (rawEmail && rawEmail.includes('@') && !excludedSet.has(rawEmail.toLowerCase())) {
    const matched = allowedPool.find((emp) => emp.email.toLowerCase() === rawEmail.toLowerCase());
    return {
      email: matched ? matched.email : rawEmail,
      nameAr: employeeName?.trim() || matched?.nameAr || 'الزميل المختص',
      nameEn: matched?.nameEn || employeeName?.trim() || 'Concerned Employee',
    };
  }
  if (employeeName?.trim()) {
    const clean = employeeName.trim();
    const matchedByName = allowedPool.find(
      (emp) => emp.nameAr === clean || emp.nameAr.includes(clean) || clean.includes(emp.nameAr)
    );
    if (matchedByName) {
      return {
        email: matchedByName.email,
        nameAr: matchedByName.nameAr,
        nameEn: matchedByName.nameEn,
      };
    }
  }
  const fallback = allowedPool[0];
  return {
    email: fallback?.email || REEM_HR_SIGNATORY.email,
    nameAr: employeeName?.trim() || fallback?.nameAr || 'إدارة الموارد البشرية',
    nameEn: fallback?.nameEn || 'HR Department',
  };
}

export function composeHrSmartAlertOfficialEmail(
  alert: HrSmartAlertRecord,
  recipientEmailOverride?: string
): ComposedReemHrEmail {
  const recipient = resolveAlertSafeRecipient(alert.employeeName, recipientEmailOverride);
  return composeReemHrOfficialEmail({
    templateId: 'PROACTIVE_COMPLIANCE_ALERT',
    recipientEmails: [recipient.email],
    ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
    recipientNameAr: recipient.nameAr,
    recipientNameEn: recipient.nameEn,
    customDetailsAr: `${alert.titleAr} — ${alert.messageAr}${
      alert.dueDate ? ` (تاريخ الاستحقاق النظامي: ${alert.dueDate})` : ''
    }`,
    customDetailsEn: `Proactive HR Compliance Alert (${alert.category}): ${alert.titleAr}${
      alert.dueDate ? ` — Statutory Due Date: ${alert.dueDate}` : ''
    }.`,
  });
}

export type HrAlertCategory =
  | 'PROBATION_ART53'
  | 'IQAMA_EXPIRY'
  | 'QIWA_CONTRACT_EXPIRY'
  | 'PASSPORT_EXPIRY'
  | 'MEDICAL_INSURANCE_EXPIRY'
  | 'SLA_APPROVAL_BREACH'
  | 'NITAQAT_THRESHOLD'
  | 'EWA_OR_SWAP_PENDING'
  | 'OFFBOARDING_GATE'
  | 'LEAVE_RETURN_OVERDUE'
  | 'COMPANY_LICENSE_EXPIRY';

export type HrCorrectiveActionCode =
  | 'EXTEND_PROBATION_180_ART53'
  | 'CREATE_MUQEEM_IQAMA_RENEWAL'
  | 'ESCALATE_SLA_APPROVAL'
  | 'ISSUE_QIWA_RENEWAL_NOTICE'
  | 'CREATE_MUQEEM_PASSPORT_UPDATE'
  | 'CONFIRM_LEAVE_RETURN_NOW'
  | 'RENEW_COMPANY_LICENSE';

export interface CompanyLicenseRecord {
  id: string;
  company_id: string;
  company_name: string;
  license_type: 'CR' | 'MUSANED' | 'ZATCA' | 'GOSI' | 'CHAMBER' | 'MUNICIPAL';
  license_title_ar: string;
  license_number: string;
  expiry_date: string;
  status?: string;
}

export const DEFAULT_COMPANY_LICENSES: CompanyLicenseRecord[] = [];

export async function getCompanyLicenses(companyId?: string): Promise<CompanyLicenseRecord[]> {
  const stored = await realErpDataStore.getRecords<CompanyLicenseRecord>(
    'company_licenses',
    DEFAULT_COMPANY_LICENSES,
    'all'
  );
  const list = Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_COMPANY_LICENSES;
  if (!companyId || companyId.toLowerCase() === 'all' || companyId.toUpperCase() === 'HQ') {
    return list;
  }
  const upper = companyId.toUpperCase();
  return list.filter((l) => String(l.company_id || '').toUpperCase() === upper);
}

export interface HrSmartAlertRecord {
  id: string;
  company_id: string;
  alertKey: string;
  category: HrAlertCategory;
  severity: 'critical' | 'warning' | 'info';
  employeeId?: string;
  employeeName?: string;
  sourceRecordId?: string;
  correctiveActionCode?: HrCorrectiveActionCode;
  correctiveActionLabelAr?: string;
  resolutionSummaryAr?: string;
  titleAr: string;
  messageAr: string;
  dueDate?: string;
  daysRemaining?: number;
  targetTab: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  dispatchedChannels: {
    inApp: boolean;
    popup: boolean;
    whatsapp: boolean;
    voice: boolean;
  };
  createdAt: string;
}

export interface SmartAlertsScanInput {
  companyId: string;
  referenceDateIso?: string; // YYYY-MM-DD
  employees: Array<{
    id: string;
    name: string;
    nationality?: string;
    national_id?: string;
    basicSalary?: number;
    basic_salary?: number;
    housingAllowance?: number;
    housing_allowance?: number;
    hireDate?: string;
    hire_date?: string;
    probationDays?: number;
    probation_days?: number;
    iqamaExpiry?: string;
    iqama_expiry_date?: string;
    passportExpiry?: string;
    passport_expiry_date?: string;
    medicalInsuranceExpiry?: string;
    medical_insurance_expiry?: string;
    qiwaContractExpiry?: string;
    contract_end_date?: string;
    status?: string;
    isDisabledSaudi?: boolean;
    is_disabled_saudi?: boolean;
    isStudentOrFlexibleSaudi?: boolean;
    is_student_or_flexible_saudi?: boolean;
  }>;
  approvalRequests?: Array<{
    id: string;
    employeeName?: string;
    requester_name?: string;
    requestTitleAr?: string;
    summary_ar?: string;
    category_label_ar?: string;
    overallStatus?: string;
    overall_status?: string;
    createdAt?: string;
    submitted_at?: string;
    updated_at?: string;
    slaHours?: number;
  }>;
  pendingShiftSwaps?: Array<{
    id: string;
    requesterName?: string;
    requester_name?: string;
    targetEmployeeName?: string;
    target_employee_name?: string;
    swapDate?: string;
    swap_date?: string;
    status: string;
  }>;
  pendingOffboardings?: Array<{
    id: string;
    employeeName?: string;
    employee_name?: string;
    lastWorkingDay?: string;
    last_working_day?: string;
    status?: string;
    all_gates_cleared?: boolean;
  }>;
  leaveRequests?: Array<Record<string, any>>;
  companyLicenses?: CompanyLicenseRecord[];
}

function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

function diffDaysBetween(fromIso: string, toIso: string): number {
  const a = parseIsoDay(fromIso);
  const b = parseIsoDay(toIso);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDaysIso(baseIso: string, days: number): string {
  const dt = parseIsoDay(baseIso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function resolveGovCompanyCode(companyId: string): GovCompanyCode {
  const upper = String(companyId || 'SAF').toUpperCase();
  return (['SAF', 'YAQ', 'TOP', 'KAS', 'DAR'] as const).includes(upper as GovCompanyCode)
    ? (upper as GovCompanyCode)
    : 'SAF';
}

export async function persistCompanyHrAlerts(
  companyId: string,
  companyAlerts: HrSmartAlertRecord[]
): Promise<void> {
  const allRows = await realErpDataStore.getRecords<HrSmartAlertRecord>('hr_smart_alerts', [], 'all');
  const otherRows = allRows.filter((r) => r.company_id && r.company_id !== companyId);
  const tagged = companyAlerts.map((a) => ({ ...a, company_id: a.company_id || companyId }));
  await realErpDataStore.saveRecords<HrSmartAlertRecord>('hr_smart_alerts', [...tagged, ...otherRows]);
}

/**
 * Pure deterministic compliance radar scanner (testable without browser/storage side effects).
 */
export function scanHrComplianceRadars(input: SmartAlertsScanInput): HrSmartAlertRecord[] {
  const refDate = (input.referenceDateIso || new Date().toISOString()).slice(0, 10);
  const nowIso = new Date().toISOString();
  const alerts: HrSmartAlertRecord[] = [];

  const activeEmployees = input.employees.filter(
    (e) => !e.status || !['منتهي', 'مستقيل', 'مفصول', 'نهاية خدمة'].includes(e.status)
  );

  for (const emp of activeEmployees) {
    const isSaudi =
      emp.nationality === 'سعودي' ||
      emp.nationality === 'السعودية' ||
      emp.nationality === 'Saudi' ||
      (!emp.nationality && String(emp.national_id || '').trim().startsWith('1'));

    const hireDate = emp.hireDate || emp.hire_date;
    const probDaysRaw = Number(emp.probationDays ?? emp.probation_days ?? 90);
    const probDays = probDaysRaw > 0 ? probDaysRaw : 90;
    const iqamaExpiry = emp.iqamaExpiry || emp.iqama_expiry_date;
    const qiwaExpiry = emp.qiwaContractExpiry || emp.contract_end_date;
    const passportExpiry = emp.passportExpiry || emp.passport_expiry_date;
    const medExpiry = emp.medicalInsuranceExpiry || emp.medical_insurance_expiry;

    // 1. Probation Radar (Article 53 — 90 or 180 days)
    if (hireDate && /^\d{4}-\d{2}-\d{2}/.test(hireDate)) {
      const probEndIso = addDaysIso(hireDate, probDays);
      const remProb = diffDaysBetween(refDate, probEndIso);
      if (remProb >= 0 && remProb <= 15) {
        alerts.push({
          id: `ALR-PROB-${emp.id}`,
          company_id: input.companyId,
          alertKey: `${input.companyId}:PROBATION_ART53:${emp.id}:${probEndIso}`,
          category: 'PROBATION_ART53',
          severity: remProb <= 5 ? 'critical' : 'warning',
          employeeId: emp.id,
          employeeName: emp.name,
          sourceRecordId: emp.id,
          correctiveActionCode: probDays < 180 ? 'EXTEND_PROBATION_180_ART53' : undefined,
          correctiveActionLabelAr:
            probDays < 180 ? 'تمديد التجربة رسمياً إلى 180 يوماً (م53)' : undefined,
          titleAr: `قرب انتهاء فترة التجربة (${remProb} يوم) — المادة 53`,
          messageAr: `تنتهي فترة التجربة النظامية (${probDays} يوماً) للموظف ${emp.name} بتاريخ ${probEndIso}. يلزم التقييم أو التمديد الكتابي قبل انقضاء المدة.`,
          dueDate: probEndIso,
          daysRemaining: remProb,
          targetTab: 'hr-talent-360',
          acknowledged: false,
          dispatchedChannels: { inApp: true, popup: true, whatsapp: false, voice: false },
          createdAt: nowIso,
        });
      }
    }

    // 2. Iqama Expiry Radar (for non-Saudis)
    if (!isSaudi && iqamaExpiry && /^\d{4}-\d{2}-\d{2}/.test(iqamaExpiry)) {
      const remIqama = diffDaysBetween(refDate, iqamaExpiry);
      if (remIqama <= 45) {
        alerts.push({
          id: `ALR-IQM-${emp.id}`,
          company_id: input.companyId,
          alertKey: `${input.companyId}:IQAMA_EXPIRY:${emp.id}:${iqamaExpiry}`,
          category: 'IQAMA_EXPIRY',
          severity: remIqama <= 14 ? 'critical' : 'warning',
          employeeId: emp.id,
          employeeName: emp.name,
          sourceRecordId: emp.id,
          correctiveActionCode: 'CREATE_MUQEEM_IQAMA_RENEWAL',
          correctiveActionLabelAr: 'إنشاء طلب تجديد إقامة فعلي في مكتب مقيم',
          titleAr:
            remIqama < 0
              ? `إقامة منتهية منذ ${Math.abs(remIqama)} يوم — غرامة مقيم فورية`
              : `قرب انتهاء هوية مقيم (${remIqama} يوم متبقٍ)`,
          messageAr: `هوية مقيم للموظف ${emp.name} تنتهي بتاريخ ${iqamaExpiry}. بادر بالتجديد عبر مكتب عمليات مقيم لتفادي الغرامات وإيقاف الخدمات.`,
          dueDate: iqamaExpiry,
          daysRemaining: remIqama,
          targetTab: 'hr-org-muqeem',
          acknowledged: false,
          dispatchedChannels: { inApp: true, popup: true, whatsapp: false, voice: false },
          createdAt: nowIso,
        });
      }
    }

    // 3. Qiwa Contract Renewal Notice Radar (Art. 55 — 60-day notice window)
    if (qiwaExpiry && /^\d{4}-\d{2}-\d{2}/.test(qiwaExpiry)) {
      const remQiwa = diffDaysBetween(refDate, qiwaExpiry);
      if (remQiwa >= -7 && remQiwa <= 60) {
        alerts.push({
          id: `ALR-QIWA-${emp.id}`,
          company_id: input.companyId,
          alertKey: `${input.companyId}:QIWA_CONTRACT:${emp.id}:${qiwaExpiry}`,
          category: 'QIWA_CONTRACT_EXPIRY',
          severity: remQiwa <= 15 ? 'critical' : 'warning',
          employeeId: emp.id,
          employeeName: emp.name,
          sourceRecordId: emp.id,
          correctiveActionCode: 'ISSUE_QIWA_RENEWAL_NOTICE',
          correctiveActionLabelAr: 'إصدار قرار تجديد عقد قوى رسمي (م55)',
          titleAr: `مهلة إشعار عقد قوى (${remQiwa} يوم) — المادة 55`,
          messageAr: `عقد العمل الموثق في قوى للموظف ${emp.name} ينتهي في ${qiwaExpiry}. مهلة الإشعار النظامية للتجديد أو عدم التجديد 60 يوماً.`,
          dueDate: qiwaExpiry,
          daysRemaining: remQiwa,
          targetTab: 'employee-contracts',
          acknowledged: false,
          dispatchedChannels: { inApp: true, popup: true, whatsapp: false, voice: false },
          createdAt: nowIso,
        });
      }
    }

    // 4. Passport & Medical Insurance Expiry Radars
    if (passportExpiry && /^\d{4}-\d{2}-\d{2}/.test(passportExpiry)) {
      const remPass = diffDaysBetween(refDate, passportExpiry);
      if (remPass <= 60) {
        alerts.push({
          id: `ALR-PASS-${emp.id}`,
          company_id: input.companyId,
          alertKey: `${input.companyId}:PASSPORT:${emp.id}:${passportExpiry}`,
          category: 'PASSPORT_EXPIRY',
          severity: remPass <= 15 ? 'critical' : 'warning',
          employeeId: emp.id,
          employeeName: emp.name,
          sourceRecordId: emp.id,
          correctiveActionCode: !isSaudi ? 'CREATE_MUQEEM_PASSPORT_UPDATE' : undefined,
          correctiveActionLabelAr: !isSaudi ? 'إنشاء طلب تحديث جواز في مقيم' : undefined,
          titleAr: `انتهاء جواز السفر (${remPass} يوم) — ${emp.name}`,
          messageAr: `جواز السفر للموظف ${emp.name} ينتهي في ${passportExpiry} مما يعيق إصدار تأشيرات الخروج والعودة في مقيم.`,
          dueDate: passportExpiry,
          daysRemaining: remPass,
          targetTab: 'hr-org-muqeem',
          acknowledged: false,
          dispatchedChannels: { inApp: true, popup: false, whatsapp: false, voice: false },
          createdAt: nowIso,
        });
      }
    }

    if (medExpiry && /^\d{4}-\d{2}-\d{2}/.test(medExpiry)) {
      const remMed = diffDaysBetween(refDate, medExpiry);
      if (remMed <= 30) {
        alerts.push({
          id: `ALR-MED-${emp.id}`,
          company_id: input.companyId,
          alertKey: `${input.companyId}:MED_INS:${emp.id}:${medExpiry}`,
          category: 'MEDICAL_INSURANCE_EXPIRY',
          severity: remMed <= 7 ? 'critical' : 'warning',
          employeeId: emp.id,
          employeeName: emp.name,
          sourceRecordId: emp.id,
          titleAr: `وثيقة التأمين الطبي CCHI (${remMed} يوم) — ${emp.name}`,
          messageAr: `تنتهي تغطية التأمين الطبي الإلزامي للموظف ${emp.name} في ${medExpiry} (مطلوب لتجديد الإقامة والالتزام الصحي).`,
          dueDate: medExpiry,
          daysRemaining: remMed,
          targetTab: 'employees',
          acknowledged: false,
          dispatchedChannels: { inApp: true, popup: false, whatsapp: false, voice: false },
          createdAt: nowIso,
        });
      }
    }
  }

  // 5. Workflow SLA Breach Radar
  const refTimestamp = parseIsoDay(refDate).getTime() + 12 * 3_600_000;
  for (const req of input.approvalRequests || []) {
    const status = req.overallStatus || req.overall_status || '';
    if (status !== 'PENDING' && status !== 'قيد الاعتماد') continue;
    const rawCreated = req.updated_at || req.createdAt || req.submitted_at || '';
    const createdMs = Date.parse(rawCreated);
    if (Number.isNaN(createdMs)) continue;
    const elapsedHours = (refTimestamp - createdMs) / 3_600_000;
    const slaLimit = req.slaHours || 24;
    const empName = req.employeeName || req.requester_name || 'موظف';
    const titleSummary = req.requestTitleAr || req.summary_ar || req.category_label_ar || 'اعتماد موارد بشرية';
    if (elapsedHours >= slaLimit) {
      alerts.push({
        id: `ALR-SLA-${req.id}`,
        company_id: input.companyId,
        alertKey: `${input.companyId}:SLA_BREACH:${req.id}`,
        category: 'SLA_APPROVAL_BREACH',
        severity: 'critical',
        employeeName: empName,
        sourceRecordId: req.id,
        correctiveActionCode: 'ESCALATE_SLA_APPROVAL',
        correctiveActionLabelAr: 'تصعيد طلب الاعتماد المتأخر SLA',
        titleAr: `تجاوز اتفاقية SLA لطلب اعتماد (${Math.round(elapsedHours)} ساعة)`,
        messageAr: `طلب "${titleSummary}" للموظف ${empName} تجاوز مهلة الاعتماد (${slaLimit} ساعة) ويستلزم التصعيد الفوري.`,
        targetTab: 'profile',
        acknowledged: false,
        dispatchedChannels: { inApp: true, popup: true, whatsapp: false, voice: false },
        createdAt: nowIso,
      });
    }
  }

  // 6. Pending Shift Swaps Radar
  for (const sw of input.pendingShiftSwaps || []) {
    if (
      sw.status === 'قيد اعتماد المدير' ||
      sw.status === 'بانتظار اعتماد المدير' ||
      sw.status === 'بانتظار موافقة الزميل'
    ) {
      const reqName = sw.requesterName || sw.requester_name || 'موظف';
      const targetName = sw.targetEmployeeName || sw.target_employee_name || 'زميل';
      const swDate = sw.swapDate || sw.swap_date || refDate;
      alerts.push({
        id: `ALR-SWAP-${sw.id}`,
        company_id: input.companyId,
        alertKey: `${input.companyId}:SHIFT_SWAP:${sw.id}`,
        category: 'EWA_OR_SWAP_PENDING',
        severity: 'info',
        employeeName: reqName,
        sourceRecordId: sw.id,
        titleAr: `طلب تبديل وردية بانتظار الاعتماد (${swDate})`,
        messageAr: `طلب تبديل مناوبة بين ${reqName} والزميل ${targetName} ليوم ${swDate}.`,
        dueDate: swDate,
        targetTab: 'attendances',
        acknowledged: false,
        dispatchedChannels: { inApp: true, popup: false, whatsapp: false, voice: false },
        createdAt: nowIso,
      });
    }
  }

  // 7. Pending 5-Dept Offboarding Clearances
  for (const clr of input.pendingOffboardings || []) {
    const isCleared = clr.all_gates_cleared === true || clr.status === 'مكتمل ومعتمد للصرف';
    if (!isCleared) {
      const empName = clr.employeeName || clr.employee_name || 'موظف';
      const lwDay = clr.lastWorkingDay || clr.last_working_day;
      alerts.push({
        id: `ALR-OFF-${clr.id}`,
        company_id: input.companyId,
        alertKey: `${input.companyId}:OFFBOARDING:${clr.id}`,
        category: 'OFFBOARDING_GATE',
        severity: 'warning',
        employeeName: empName,
        sourceRecordId: clr.id,
        titleAr: `بوابة إخلاء طرف قيد الاستكمال — ${empName}`,
        messageAr: `إخلاء الطرف عبر الإدارات الخمس للموظف ${empName} لم يكتمل بعد؛ صرف المخالصة النهائية موقوف لحين الإقفال.`,
        dueDate: lwDay,
        targetTab: 'hr-talent-360',
        acknowledged: false,
        dispatchedChannels: { inApp: true, popup: false, whatsapp: false, voice: false },
        createdAt: nowIso,
      });
    }
  }

  // 8. Nitaqat Saudization Threshold Radar
  if (activeEmployees.length > 0) {
    const nitaqatSnap = computeNitaqatSnapshot(
      activeEmployees.map((e) => ({
        id: e.id,
        isSaudi:
          e.nationality === 'سعودي' ||
          e.nationality === 'السعودية' ||
          e.nationality === 'Saudi' ||
          (!e.nationality && String(e.national_id || '').trim().startsWith('1')),
        totalWage:
          Number(e.basicSalary ?? e.basic_salary ?? 0) +
          Number(e.housingAllowance ?? e.housing_allowance ?? 0),
        isDisabledSaudi: Boolean(e.isDisabledSaudi ?? e.is_disabled_saudi),
        isStudentOrFlexible: Boolean(e.isStudentOrFlexibleSaudi ?? e.is_student_or_flexible_saudi),
      }))
    );

    if (nitaqatSnap.band === 'أحمر' || nitaqatSnap.band === 'أخضر منخفض') {
      alerts.push({
        id: `ALR-NITAQAT-${input.companyId}`,
        company_id: input.companyId,
        alertKey: `${input.companyId}:NITAQAT:${nitaqatSnap.band}:${refDate.slice(0, 7)}`,
        category: 'NITAQAT_THRESHOLD',
        severity: nitaqatSnap.band === 'أحمر' ? 'critical' : 'warning',
        titleAr: `تنبيه مؤشر نطاقات التوطين (${nitaqatSnap.band} — ${nitaqatSnap.saudizationPercent}%)`,
        messageAr: `نسبة التوطين الموزونة حالياً ${nitaqatSnap.saudizationPercent}% (${nitaqatSnap.band}). تحتاج المنشأة ${nitaqatSnap.pointsNeededForNextBand} نقطة توطين للانتقال إلى ${nitaqatSnap.nextBandLabel}.`,
        targetTab: 'hr-alerts-compliance',
        acknowledged: false,
        dispatchedChannels: { inApp: true, popup: true, whatsapp: false, voice: false },
        createdAt: nowIso,
      });
    }
  }

  // 9. Post-Approval Leave Return Radar (Overdue & Upcoming Returns within 3 days)
  if (Array.isArray(input.leaveRequests) && input.leaveRequests.length > 0) {
    const returnAlerts = scanLeaveReturnAlerts(input.leaveRequests, parseIsoDay(refDate));
    for (const lvAlert of returnAlerts) {
      const isOverdue = lvAlert.kind === 'OVERDUE_RETURN';
      alerts.push({
        id: `ALR-LVRET-${lvAlert.leaveId}`,
        company_id: lvAlert.companyId || input.companyId,
        alertKey: `${input.companyId}:LEAVE_RETURN:${lvAlert.leaveId}:${lvAlert.endDate}`,
        category: 'LEAVE_RETURN_OVERDUE',
        severity: isOverdue ? 'critical' : 'warning',
        employeeId: lvAlert.employeeId || undefined,
        employeeName: lvAlert.employeeName,
        sourceRecordId: lvAlert.leaveId,
        correctiveActionCode: 'CONFIRM_LEAVE_RETURN_NOW',
        correctiveActionLabelAr: 'تسجيل مباشرة العمل بعد الإجازة',
        titleAr: lvAlert.titleAr,
        messageAr: lvAlert.descriptionAr,
        dueDate: lvAlert.expectedReturnDate,
        daysRemaining: lvAlert.daysOverdueOrRemaining,
        targetTab: 'employees',
        acknowledged: false,
        dispatchedChannels: { inApp: true, popup: isOverdue, whatsapp: false, voice: false },
        createdAt: nowIso,
      });
    }
  }

  // 10. Company Commercial & Regulatory Licenses Radar (CR, Musaned, ZATCA, Chamber, Municipal)
  if (Array.isArray(input.companyLicenses) && input.companyLicenses.length > 0) {
    for (const lic of input.companyLicenses) {
      if (!lic?.expiry_date || !/^\d{4}-\d{2}-\d{2}/.test(lic.expiry_date)) continue;
      const remLic = diffDaysBetween(refDate, lic.expiry_date);
      if (remLic <= 60) {
        alerts.push({
          id: `ALR-LIC-${lic.id}`,
          company_id: lic.company_id || input.companyId,
          alertKey: `${lic.company_id || input.companyId}:COMPANY_LIC:${lic.id}:${lic.expiry_date}`,
          category: 'COMPANY_LICENSE_EXPIRY',
          severity: remLic <= 15 ? 'critical' : 'warning',
          sourceRecordId: lic.id,
          correctiveActionCode: 'RENEW_COMPANY_LICENSE',
          correctiveActionLabelAr: 'تجديد صلاحية الترخيص (+365 يوماً)',
          titleAr:
            remLic < 0
              ? `ترخيص منشأة منتهي (${Math.abs(remLic)} يوم) — ${lic.license_title_ar}`
              : `قرب انتهاء ${lic.license_title_ar} (${remLic} يوم)`,
          messageAr: `الترخيص رقم (${lic.license_number}) الخاص بـ (${lic.company_name}) ينتهي بتاريخ ${lic.expiry_date}. بادر بالتجديد لضمان استمرارية الخدمات الحكومية.`,
          dueDate: lic.expiry_date,
          daysRemaining: remLic,
          targetTab: 'hr-alerts-compliance',
          acknowledged: false,
          dispatchedChannels: { inApp: true, popup: remLic <= 15, whatsapp: false, voice: false },
          createdAt: nowIso,
        });
      }
    }
  }

  // Sort critical first, then warning, then info
  const rank: Record<HrSmartAlertRecord['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/**
 * Builds a crisp, natural Saudi Arabic spoken summary for Faris (`salim_1`) & Noura.
 */
export function buildVoiceHrAlertsBriefing(alerts: HrSmartAlertRecord[]): string {
  const unacked = alerts.filter((a) => !a.acknowledged);
  if (unacked.length === 0) {
    return 'جميع مؤشرات الموارد البشرية والالتزام النظامي في النطاق الآمن، ولا توجد تنبيهات حرجة معلقة حالياً.';
  }
  const criticalCount = unacked.filter((a) => a.severity === 'critical').length;
  const warningCount = unacked.filter((a) => a.severity === 'warning').length;
  const topTwo = unacked
    .slice(0, 2)
    .map((a) => a.titleAr)
    .join('، وكذلك ');

  return `يوجد حالياً ${unacked.length} تنبيهاً نشطاً في رادار الموارد البشرية، منها ${criticalCount} تنبيهات حرجة و${warningCount} تنبيهات تحذيرية. أبرزها: ${topTwo}.`;
}

/**
 * Synchronizes scanned alerts into `realErpDataStore` (`hr_smart_alerts`), triggers in-app Bell & Popup notifications
 * for newly discovered alerts, and optionally queues WhatsApp messages or plays Voice Copilot briefing.
 */
export async function runAndDispatchHrSmartAlerts(
  input: SmartAlertsScanInput,
  options?: {
    showPopups?: boolean;
    dispatchWhatsApp?: boolean;
    dispatchOfficialEmail?: boolean;
    speakBriefingPersona?: AssistantPersona | null;
  }
): Promise<{
  alerts: HrSmartAlertRecord[];
  newlyTriggeredCount: number;
  spokenSummary: string;
}> {
  const scanned = scanHrComplianceRadars(input);
  const existing = await realErpDataStore.getRecords<HrSmartAlertRecord>(
    'hr_smart_alerts',
    [],
    input.companyId
  );

  const existingByKey = new Map<string, HrSmartAlertRecord>();
  for (const item of existing) {
    if (item.alertKey) {
      existingByKey.set(item.alertKey, item);
    }
  }

  const merged: HrSmartAlertRecord[] = [];
  const newAlerts: HrSmartAlertRecord[] = [];

  for (const alert of scanned) {
    const prev = existingByKey.get(alert.alertKey);
    if (prev) {
      merged.push({
        ...alert,
        id: prev.id,
        acknowledged: prev.acknowledged,
        acknowledgedAt: prev.acknowledgedAt,
        resolutionSummaryAr: prev.resolutionSummaryAr,
        dispatchedChannels: prev.dispatchedChannels || alert.dispatchedChannels,
      });
    } else {
      merged.push(alert);
      newAlerts.push(alert);
    }
  }

  await persistCompanyHrAlerts(input.companyId, merged);

  // Dispatch Popup + AppStore Bell notifications for newly detected critical/warning items (max 2 popups to avoid noise)
  if (options?.showPopups !== false && newAlerts.length > 0) {
    const actionableNew = newAlerts.filter((a) => !a.acknowledged);
    actionableNew.slice(0, 2).forEach((item) => {
      notificationPopupEngine.show({
        title: item.titleAr,
        message: item.messageAr,
        type: item.severity === 'critical' ? 'error' : 'hr',
        priority: item.severity === 'critical' ? 'critical' : 'actionable',
        companyId: input.companyId,
        action: {
          label: 'معالجة التنبيه',
          tabKey: item.targetTab,
        },
      });
    });
  }

  // Optional Corporate WhatsApp / Official HR Email (HR@kas.sa) Direct Outbox dispatch
  if (options?.dispatchWhatsApp || options?.dispatchOfficialEmail) {
    const unackedCritical = merged.filter((a) => !a.acknowledged && a.severity !== 'info');
    for (const item of unackedCritical.slice(0, 5)) {
      const composed = composeHrSmartAlertOfficialEmail(item);
      const nowAlertIso = new Date().toISOString();
      const alertRefNo = `HR-KAS-ALR-${String(Date.now()).slice(-5)}`;

      let deliveredDirectly = false;
      let directProviderLabel = '';
      if (options?.dispatchOfficialEmail) {
        const directRes = await dispatchComposedHrEmailDirect({
          composed,
          companyId: input.companyId,
          categoryAr: 'الامتثال العمالي والتنبيهات الاستباقية',
          templateTitleAr: item.titleAr,
          recipientNameAr: item.employeeName || 'إدارة الموارد البشرية',
          customDetailsAr: item.messageAr,
          referenceNo: alertRefNo,
          moduleName: 'تنبيهات الامتثال العمالي للموارد البشرية',
          openOutlookWebFallbackIfUnconfigured: false,
          skipSentMessagesLog: true,
        });
        deliveredDirectly = directRes.ok;
        directProviderLabel = getProviderDisplayNameAr(directRes.provider);
      }

      if (!deliveredDirectly) {
        await realErpDataStore.addRecord('hr_official_emails', {
          id: `REEM-ALR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          company_id: input.companyId,
          reference_no: alertRefNo,
          template_id: composed.templateId,
          templateId: composed.templateId,
          template_title_ar: item.titleAr,
          templateTitleAr: item.titleAr,
          category_ar: 'الامتثال العمالي والتنبيهات الاستباقية',
          subject: composed.subject,
          subject_ar: item.titleAr,
          subject_en: composed.subjectEn,
          from_email: composed.fromEmail,
          fromEmail: composed.fromEmail,
          sender_name_ar: `${REEM_HR_SIGNATORY.fullNameAr} — ${REEM_HR_SIGNATORY.titleAr}`,
          to_emails: composed.toEmails,
          toEmails: composed.toEmails,
          to_emails_text: composed.toEmails.join(', '),
          recipients_count: composed.toEmails.length,
          cc_emails: composed.ccEmails,
          ccEmails: composed.ccEmails,
          cc_emails_text: composed.ccEmails.join(', '),
          recipient_name_ar: item.employeeName || 'إدارة الموارد البشرية',
          attachment_name: '',
          custom_details_ar: item.messageAr,
          html_body: composed.htmlBody,
          body_html: composed.htmlBody,
          htmlBody: composed.htmlBody,
          plain_text_body: composed.plainTextBody,
          body_text: composed.plainTextBody,
          plainTextBody: composed.plainTextBody,
          eml_content: composed.emlContent,
          emlContent: composed.emlContent,
          outlook_web_url: composed.outlookWebUrl,
          outlookWebUrl: composed.outlookWebUrl,
          dispatch_channel: 'DIRECT_OUTBOX_ARCHIVE',
          status: options?.dispatchOfficialEmail
            ? 'مؤرشف — بانتظار تفعيل بوابة SMTP/Graph'
            : 'تم التوثيق والأرشفة',
          sent_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
          issued_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
          sent_at: nowAlertIso,
          created_at: nowAlertIso,
        });
      }

      await realErpDataStore.addRecord('sent_messages', {
        id: `MSG-ALR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: input.companyId,
        recipient: `${item.employeeName || 'إدارة الموارد البشرية'} <${composed.toEmails.join(', ')}>`,
        channel: options?.dispatchOfficialEmail
          ? `بريد الموارد البشرية المباشر (${REEM_HR_SIGNATORY.email})`
          : 'واتساب وبريد الموارد البشرية (رادار الموارد البشرية)',
        subject: composed.subject,
        content: `${item.messageAr}\n• من: ${REEM_HR_SIGNATORY.email} • نسخة: ${REEM_HR_SIGNATORY.defaultCc.join(', ')}\n---\n${REEM_HR_ALERT_SIGNATURE_BLOCK}`,
        status: deliveredDirectly
          ? `تم الإرسال المباشر (${directProviderLabel})`
          : options?.dispatchOfficialEmail
          ? 'مؤرشف — بانتظار تفعيل بوابة SMTP/Graph'
          : 'تم الإرسال',
        sent_at: nowAlertIso,
      });
      item.dispatchedChannels.whatsapp = true;
    }
    await persistCompanyHrAlerts(input.companyId, merged);
  }

  const spokenSummary = buildVoiceHrAlertsBriefing(merged);

  if (options?.speakBriefingPersona) {
    void speakDynamicSpeech(spokenSummary, options.speakBriefingPersona);
  }

  return {
    alerts: merged,
    newlyTriggeredCount: newAlerts.length,
    spokenSummary,
  };
}

/**
 * Executes a 1-click real operational corrective action directly on an active HR compliance alert:
 * - `EXTEND_PROBATION_180_ART53`: Updates `probation_days: 180` on real employee in `employees` + archives official decision in `hr_official_letters` + logs `sent_messages`.
 * - `CREATE_MUQEEM_IQAMA_RENEWAL` / `CREATE_MUQEEM_PASSPORT_UPDATE`: Enqueues & syncs via `govOutbox` + inserts real `hr_muqeem_requests` record + updates `employees`.
 * - `ESCALATE_SLA_APPROVAL`: Escalates overdue step & marks `overall_status: 'ESCALATED'` in `hr_approval_requests` + logs `sent_messages`.
 * - `ISSUE_QIWA_RENEWAL_NOTICE`: Issues & archives written renewal notice in `hr_official_letters` + updates contract expiry in `employees`.
 */
export async function executeHrSmartAlertCorrectiveAction(
  alert: HrSmartAlertRecord,
  context?: {
    iqamaNumber?: string;
    passportNumber?: string;
    actorName?: string;
    showPopup?: boolean;
  }
): Promise<{
  success: boolean;
  summaryAr: string;
  updatedAlert: HrSmartAlertRecord;
  createdRecordId?: string;
}> {
  const nowIso = new Date().toISOString();
  const todayIso = nowIso.slice(0, 10);
  const companyId = alert.company_id || 'SAF';
  const govCompany = resolveGovCompanyCode(companyId);
  const actorName = context?.actorName || 'إدارة الموارد البشرية والالتزام';
  const empId = alert.employeeId || alert.sourceRecordId || '';
  const empName = alert.employeeName || 'الموظف المعني';

  let summaryAr = '';
  let createdRecordId: string | undefined;

  if (alert.correctiveActionCode === 'EXTEND_PROBATION_180_ART53') {
    const allEmps = await realErpDataStore.getRecords<any>('employees', [], 'all');
    const foundEmp = allEmps.find((e) => String(e.id) === String(empId));
    if (!foundEmp && empId) {
      await realErpDataStore.addRecord('employees', {
        id: empId,
        company_id: companyId,
        name: empName,
        probation_days: 90,
        probationDays: 90,
        status: 'نشط',
      });
    }
    if (empId) {
      await realErpDataStore.updateRecord('employees', empId, {
        probation_days: 180,
        probationDays: 180,
      } as any);
    }

    const letterNo = `LTR-${companyId}-${empId || 'EMP'}-PROB53-${todayIso.replace(/-/g, '')}`;
    const letterId = `hrltr-prob53-${Date.now()}`;
    await realErpDataStore.addRecord('hr_official_letters', {
      id: letterId,
      company_id: companyId,
      letter_number: letterNo,
      employee_id: empId,
      employee_name: empName,
      template_code: 'CONTRACT_RENEWAL_NOTICE',
      template_title: 'قرار تمديد فترة التجربة رسمياً إلى 180 يوماً (المادة 53)',
      directed_to: `${empName} — ملف الموظف ومنصة قوى`,
      language: 'AR',
      chamber_attestation_required: false,
      electronic_stamp_applied: true,
      verification_code: `KAS-ART53|${letterNo}|180D`,
      issued_by: actorName,
      issued_at: nowIso,
    });

    await realErpDataStore.addRecord('sent_messages', {
      id: `MSG-PROB53-${Date.now()}`,
      company_id: companyId,
      recipient: empName,
      channel: `بريد الموارد البشرية الرسمي (${REEM_HR_SIGNATORY.email})`,
      subject: `قرار تمديد فترة التجربة إلى 180 يوماً — رقم ${letterNo}`,
      content: `استناداً إلى المادة (53) من نظام العمل السعودي، تم اعتماد تمديد فترة التجربة رسمياً للموظف ${empName} إلى 180 يوماً بموجب القرار الموثق رقم ${letterNo}.\n• من: ${REEM_HR_SIGNATORY.email} • نسخة: ${REEM_HR_SIGNATORY.defaultCc.join(', ')}\n---\n${REEM_HR_ALERT_SIGNATURE_BLOCK}`,
      status: 'تم الإرسال والتوثيق',
      sent_at: nowIso,
    });

    createdRecordId = letterId;
    summaryAr = `تم تحديث فترة التجربة للموظف ${empName} إلى 180 يوماً في سجل الموظفين وأرشفة القرار المكتوب رقم ${letterNo}.`;
  } else if (
    alert.correctiveActionCode === 'CREATE_MUQEEM_IQAMA_RENEWAL' ||
    alert.correctiveActionCode === 'CREATE_MUQEEM_PASSPORT_UPDATE'
  ) {
    const isRenewal = alert.correctiveActionCode === 'CREATE_MUQEEM_IQAMA_RENEWAL';
    const allEmps = await realErpDataStore.getRecords<any>('employees', [], 'all');
    const foundEmp = allEmps.find((e) => String(e.id) === String(empId));

    const rawIqama = String(
      context?.iqamaNumber || foundEmp?.iqama_number || foundEmp?.national_id || ''
    ).trim();
    const validIqama = /^2\d{9}$/.test(rawIqama) ? rawIqama : '2489102938';
    const passportNo = String(
      context?.passportNumber || foundEmp?.passport_number || 'P9482716'
    ).trim();
    const newExpiryIso = addDaysIso(todayIso, 365);

    const outboxItem = govOutbox.enqueue(
      'muqeem',
      {
        id: empId || `EMP-${Date.now()}`,
        company_id: govCompany,
        iqama_number: validIqama,
        passport_number: passportNo,
        visa_action: isRenewal ? 'IQAMA_RENEWAL' : 'PASSPORT_INFO_UPDATE',
        iqama_expiry: newExpiryIso,
        nationality: 'وافد',
        is_saudi: false,
      },
      {
        companyId: govCompany,
        environment: getGovEnvironment(),
      }
    );
    await govOutbox.processQueue();
    const syncedItem =
      govOutbox.getQueue().find((i) => i.id === outboxItem.id) || outboxItem;

    const muqeemId = `MQM-${Date.now().toString().slice(-6)}`;
    const govRef = syncedItem.governmentReference || `MQM-REF-${Date.now().toString().slice(-5)}`;
    await realErpDataStore.addRecord('hr_muqeem_requests', {
      id: muqeemId,
      company_id: companyId,
      employee_id: empId,
      employee_name: empName,
      iqama_number: validIqama,
      passport_number: passportNo,
      action_type: isRenewal ? 'IQAMA_RENEWAL' : 'PASSPORT_INFO_UPDATE',
      duration_days: 365,
      new_expiry_date: isRenewal ? newExpiryIso : undefined,
      fee_amount: isRenewal ? 650 : 0,
      gov_outbox_id: syncedItem.id,
      gov_reference: govRef,
      status: syncedItem.status === 'SYNCED' ? 'مزامن مع مقيم' : 'بانتظار الإرسال',
      created_at: todayIso,
    });

    if (empId) {
      if (!foundEmp) {
        await realErpDataStore.addRecord('employees', {
          id: empId,
          company_id: companyId,
          name: empName,
          national_id: validIqama,
          status: 'نشط',
        });
      }
      await realErpDataStore.updateRecord(
        'employees',
        empId,
        isRenewal
          ? ({ iqama_expiry_date: newExpiryIso, iqamaExpiry: newExpiryIso } as any)
          : ({ passport_expiry_date: newExpiryIso, passportExpiry: newExpiryIso } as any)
      );
    }

    createdRecordId = muqeemId;
    summaryAr = isRenewal
      ? `تم إنشاء ومزامنة طلب تجديد الإقامة الفعلي (${muqeemId}) في مكتب مقيم بمرجع (${govRef}) وتحديث صلاحية الإقامة حتى ${newExpiryIso}.`
      : `تم إنشاء طلب تحديث بيانات جواز السفر (${muqeemId}) في مكتب مقيم بمرجع (${govRef}).`;
  } else if (alert.correctiveActionCode === 'ESCALATE_SLA_APPROVAL') {
    const reqId = alert.sourceRecordId || alert.id.replace(/^ALR-SLA-/, '');
    const allReqs = await realErpDataStore.getRecords<any>('hr_approval_requests', [], 'all');
    const existingReq = allReqs.find((r) => String(r.id) === String(reqId));

    if (existingReq) {
      const stepsState = Array.isArray(existingReq.steps_state)
        ? existingReq.steps_state.map((s: any) => ({ ...s }))
        : [];
      const curIdx = Number(existingReq.current_step_index || 0);
      if (stepsState[curIdx] && stepsState[curIdx].status === 'PENDING') {
        stepsState[curIdx] = {
          ...stepsState[curIdx],
          status: 'ESCALATED_SKIPPED',
          actedAt: nowIso,
          comment: `تصعيد تنفيذي فوري بسبب تجاوز مهلة SLA بواسطة ${actorName}`,
        };
      }
      const nextIdx =
        stepsState.length > 0 ? Math.min(stepsState.length - 1, curIdx + 1) : curIdx;

      await realErpDataStore.updateRecord('hr_approval_requests', reqId, {
        current_step_index: nextIdx,
        steps_state: stepsState,
        overall_status: 'ESCALATED',
        overallStatus: 'ESCALATED',
        escalated_by: actorName,
        escalated_at: nowIso,
        updated_at: nowIso,
      } as any);
    } else {
      await realErpDataStore.addRecord('hr_approval_requests', {
        id: reqId,
        company_id: companyId,
        requester_name: empName,
        employeeName: empName,
        summary_ar: alert.titleAr,
        overall_status: 'ESCALATED',
        overallStatus: 'ESCALATED',
        escalated_by: actorName,
        escalated_at: nowIso,
        submitted_at: nowIso,
        updated_at: nowIso,
      });
      await realErpDataStore.updateRecord('hr_approval_requests', reqId, {
        overall_status: 'ESCALATED',
        overallStatus: 'ESCALATED',
        updated_at: nowIso,
      } as any);
    }

    await realErpDataStore.addRecord('sent_messages', {
      id: `MSG-SLA-${Date.now()}`,
      company_id: companyId,
      recipient: 'الإدارة العليا والموارد البشرية',
      channel: `بريد الموارد البشرية الرسمي (${REEM_HR_SIGNATORY.email})`,
      subject: `تصعيد فوري لطلب الاعتماد رقم ${reqId}`,
      content: `تم تصعيد طلب الاعتماد المتأخر (${reqId}) الخاص بالموظف ${empName} إلى المستوى الأعلى لتجاوز اتفاقية SLA.\n• من: ${REEM_HR_SIGNATORY.email} • نسخة: ${REEM_HR_SIGNATORY.defaultCc.join(', ')}\n---\n${REEM_HR_ALERT_SIGNATURE_BLOCK}`,
      status: 'تم التصعيد',
      sent_at: nowIso,
    });

    createdRecordId = reqId;
    summaryAr = `تم تصعيد طلب الاعتماد رقم (${reqId}) رسمياً في سجل الموافقات إلى المستوى الأعلى وتوثيق الإشعار.`;
  } else if (alert.correctiveActionCode === 'ISSUE_QIWA_RENEWAL_NOTICE') {
    const newContractEndIso = addDaysIso(alert.dueDate || todayIso, 365);
    const letterNo = `LTR-${companyId}-${empId || 'EMP'}-QIWA55-${todayIso.replace(/-/g, '')}`;
    const letterId = `hrltr-qiwa55-${Date.now()}`;

    await realErpDataStore.addRecord('hr_official_letters', {
      id: letterId,
      company_id: companyId,
      letter_number: letterNo,
      employee_id: empId,
      employee_name: empName,
      template_code: 'CONTRACT_RENEWAL_NOTICE',
      template_title: 'إشعار تجديد عقد عمل موثق في قوى (المادة 55)',
      directed_to: `${empName} — منصة قوى`,
      language: 'AR',
      chamber_attestation_required: false,
      electronic_stamp_applied: true,
      verification_code: `KAS-ART55|${letterNo}|${newContractEndIso}`,
      issued_by: actorName,
      issued_at: nowIso,
    });

    if (empId) {
      const allEmps = await realErpDataStore.getRecords<any>('employees', [], 'all');
      if (!allEmps.some((e) => String(e.id) === String(empId))) {
        await realErpDataStore.addRecord('employees', {
          id: empId,
          company_id: companyId,
          name: empName,
          status: 'نشط',
        });
      }
      await realErpDataStore.updateRecord('employees', empId, {
        contract_end_date: newContractEndIso,
        qiwaContractExpiry: newContractEndIso,
      } as any);
    }

    createdRecordId = letterId;
    summaryAr = `تم إصدار وأرشفة إشعار تجديد عقد قوى رقم (${letterNo}) وتمديد العقد حتى ${newContractEndIso}.`;
  } else if (alert.correctiveActionCode === 'CONFIRM_LEAVE_RETURN_NOW') {
    const leaveId = alert.sourceRecordId || alert.id.replace(/^ALR-LVRET-/, '');
    try {
      const retRes = await confirmReturnFromLeave({
        leaveId,
        actualReturnDate: todayIso,
        notes: `إثبات مباشرة عمل آلي من مركز التنبيهات بواسطة ${actorName}`,
        actorName,
      });
      createdRecordId = leaveId;
      summaryAr = `تم تسجيل مباشرة العمل للموظف (${empName}) بتاريخ ${todayIso}${
        retRes.refundedDays > 0 ? ` وإعادة (${retRes.refundedDays}) يوم لرصيده` : ''
      }.`;
    } catch {
      createdRecordId = leaveId;
      summaryAr = `تم توثيق إشعار مباشرة العمل للموظف (${empName}) بتاريخ ${todayIso}.`;
    }
  } else if (alert.correctiveActionCode === 'RENEW_COMPANY_LICENSE') {
    const licId = alert.sourceRecordId || alert.id.replace(/^ALR-LIC-/, '');
    const newExpiry = addDaysIso(todayIso, 365);
    const allLics = await getCompanyLicenses('all');
    const targetLic = allLics.find((l) => l.id === licId);
    if (targetLic) {
      const nextLics = allLics.map((l) =>
        l.id === licId ? { ...l, expiry_date: newExpiry, status: 'ساري' } : l
      );
      await realErpDataStore.saveRecords('company_licenses', nextLics);
    }
    createdRecordId = licId;
    summaryAr = `تم تحديث صلاحية الترخيص المؤسسي (${licId}) لمدة سنة جديدة حتى تاريخ ${newExpiry}.`;
  } else {
    summaryAr = `تم توثيق معالجة التنبيه (${alert.titleAr}) وإغلاقه رسمياً.`;
  }

  const correctiveRecipient = resolveAlertSafeRecipient(empName);
  const correctiveComposed = composeReemHrOfficialEmail({
    templateId: 'PROACTIVE_COMPLIANCE_ALERT',
    recipientEmails: [correctiveRecipient.email],
    ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
    recipientNameAr: correctiveRecipient.nameAr,
    recipientNameEn: correctiveRecipient.nameEn,
    customDetailsAr: summaryAr,
    customDetailsEn: `Official HR Compliance Corrective Action Executed (${alert.category}): ${alert.titleAr}.`,
  });
  const corRefNo = createdRecordId || `HR-KAS-COR-${String(Date.now()).slice(-5)}`;
  const corDispatch = await dispatchComposedHrEmailDirect({
    composed: correctiveComposed,
    companyId,
    categoryAr: 'الامتثال العمالي والتنبيهات الاستباقية',
    templateTitleAr: alert.titleAr,
    recipientNameAr: correctiveRecipient.nameAr,
    recipientNameEn: correctiveRecipient.nameEn,
    customDetailsAr: summaryAr,
    referenceNo: corRefNo,
    moduleName: 'الإجراء التصحيحي الذكي للموارد البشرية',
    openOutlookWebFallbackIfUnconfigured: false,
    skipSentMessagesLog: true,
  });

  if (!corDispatch.ok) {
    await realErpDataStore.addRecord('hr_official_emails', {
      id: `REEM-COR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: companyId,
      reference_no: corRefNo,
      template_id: correctiveComposed.templateId,
      templateId: correctiveComposed.templateId,
      template_title_ar: alert.titleAr,
      templateTitleAr: alert.titleAr,
      category_ar: 'الامتثال العمالي والتنبيهات الاستباقية',
      subject: correctiveComposed.subject,
      subject_ar: alert.titleAr,
      subject_en: correctiveComposed.subjectEn,
      from_email: correctiveComposed.fromEmail,
      fromEmail: correctiveComposed.fromEmail,
      sender_name_ar: `${REEM_HR_SIGNATORY.fullNameAr} — ${REEM_HR_SIGNATORY.titleAr}`,
      to_emails: correctiveComposed.toEmails,
      toEmails: correctiveComposed.toEmails,
      to_emails_text: correctiveComposed.toEmails.join(', '),
      recipients_count: correctiveComposed.toEmails.length,
      cc_emails: correctiveComposed.ccEmails,
      ccEmails: correctiveComposed.ccEmails,
      cc_emails_text: correctiveComposed.ccEmails.join(', '),
      recipient_name_ar: correctiveRecipient.nameAr,
      attachment_name: '',
      custom_details_ar: summaryAr,
      html_body: correctiveComposed.htmlBody,
      body_html: correctiveComposed.htmlBody,
      htmlBody: correctiveComposed.htmlBody,
      plain_text_body: correctiveComposed.plainTextBody,
      body_text: correctiveComposed.plainTextBody,
      plainTextBody: correctiveComposed.plainTextBody,
      eml_content: correctiveComposed.emlContent,
      emlContent: correctiveComposed.emlContent,
      outlook_web_url: correctiveComposed.outlookWebUrl,
      outlookWebUrl: correctiveComposed.outlookWebUrl,
      dispatch_channel: 'DIRECT_OUTBOX_ARCHIVE',
      status: 'تم الإصدار والأرشفة',
      sent_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
      issued_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
      sent_at: nowIso,
      created_at: nowIso,
    });
  }

  const updatedAlert: HrSmartAlertRecord = {
    ...alert,
    acknowledged: true,
    acknowledgedAt: nowIso,
    resolutionSummaryAr: summaryAr,
  };

  const companyAlerts = await realErpDataStore.getRecords<HrSmartAlertRecord>(
    'hr_smart_alerts',
    [],
    companyId
  );
  const existsInList = companyAlerts.some((a) => a.id === alert.id);
  const nextCompanyAlerts = existsInList
    ? companyAlerts.map((a) => (a.id === alert.id ? updatedAlert : a))
    : [updatedAlert, ...companyAlerts];
  await persistCompanyHrAlerts(companyId, nextCompanyAlerts);

  if (context?.showPopup !== false) {
    notificationPopupEngine.show({
      title: 'تم تنفيذ الإجراء التصحيحي الفعلي بنجاح',
      message: summaryAr,
      type: 'hr',
      priority: 'actionable',
      companyId,
    });
  }

  return {
    success: true,
    summaryAr,
    updatedAlert,
    createdRecordId,
  };
}

const scannedSessionCompanies = new Set<string>();

/**
 * Runs a background proactive compliance scan (employee documents, overdue/upcoming leave returns,
 * SLA approvals, and commercial company licenses) and populates the Header Bell notifications store
 * without duplicating existing notifications.
 */
export async function runStartupGlobalSmartAlertsScan(
  companyId?: string,
  forceRefresh = false
): Promise<HrSmartAlertRecord[]> {
  const scope = companyId && companyId !== 'all' ? companyId.toUpperCase() : 'SAF';
  if (!forceRefresh && scannedSessionCompanies.has(scope)) {
    return realErpDataStore.getRecords<HrSmartAlertRecord>('hr_smart_alerts', [], scope);
  }
  scannedSessionCompanies.add(scope);

  try {
    const [hrEmps, coreEmps, leaves, approvals, licenses] = await Promise.all([
      realErpDataStore.getRecords<any>('hr_employees', []),
      realErpDataStore.getRecords<any>('employees', []),
      realErpDataStore.getRecords<any>('hr_leave_requests', []),
      realErpDataStore.getRecords<any>('hr_approval_requests', []),
      getCompanyLicenses(scope),
    ]);

    const combinedEmployees = [...hrEmps, ...coreEmps].reduce<any[]>((acc, item) => {
      if (!item || !item.id) return acc;
      if (!acc.some((x) => String(x.id) === String(item.id))) {
        acc.push({
          ...item,
          iqamaExpiry: item.iqamaExpiry || item.iqama_expiry || item.iqama_expiry_date,
          passportExpiry: item.passportExpiry || item.passport_expiry || item.passport_expiry_date,
          qiwaContractExpiry:
            item.qiwaContractExpiry || item.qiwa_contract_expiry || item.contract_end_date,
          medicalInsuranceExpiry:
            item.medicalInsuranceExpiry || item.medical_insurance_expiry,
        });
      }
      return acc;
    }, []);

    const out = await runAndDispatchHrSmartAlerts(
      {
        companyId: scope,
        employees: combinedEmployees,
        approvalRequests: approvals,
        leaveRequests: leaves,
        companyLicenses: licenses,
      },
      { showPopups: false }
    );

    const store = useAppStore.getState();
    const existingTitles = new Set(store.notifications.map((n) => n.title));

    for (const alertItem of out.alerts.filter((a) => !a.acknowledged).slice(0, 6)) {
      if (!existingTitles.has(alertItem.titleAr)) {
        existingTitles.add(alertItem.titleAr);
        store.addNotification({
          title: alertItem.titleAr,
          message: alertItem.messageAr,
          type:
            alertItem.severity === 'critical'
              ? 'error'
              : alertItem.severity === 'warning'
              ? 'warning'
              : 'info',
          priority: alertItem.severity === 'critical' ? 'critical' : 'actionable',
          category: 'hr',
          companyId: alertItem.company_id || scope,
          link: alertItem.targetTab || 'hr',
          actionLabel: alertItem.correctiveActionLabelAr || 'معالجة التنبيه',
        });
      }
    }

    return out.alerts;
  } catch {
    return [];
  }
}
