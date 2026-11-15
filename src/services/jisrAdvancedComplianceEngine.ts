/**
 * jisrAdvancedComplianceEngine.ts
 * Complete Jisr 2026 Regulatory & Financial Compliance Engine for Khalid Al-Sulaim Holding Group ERP:
 *   1. Official Saudi Public Holidays Calendar & Annual Leave Net-Days Exclusion (Eid Al-Fitr, Eid Al-Adha, Founding Day, National Day)
 *   2. Monthly Shift Roster Resolution & Colleague Shift Swap Validator
 *   3. HRSD Saudi Labor Law Disciplinary Matrix (Articles 66–72: 180-day repeat reset, Art. 69 30-day discovery limit, Art. 71 mandatory investigation, Art. 67 5-day monthly deduction cap)
 *   4. ZATCA Phase 1/2 TLV Base64 QR Receipt Decoder & Duplicate Expense Fingerprint Guard
 *   5. Jisr Pay — Earned Wage Access (EWA — الراتب المرن المبكر المستحق الفعلي من الحضور)
 *   6. Qiwa Nitaqat Live Enforcement & Visa Eligibility Gate (4,000 ⃁ = 1.0, 3,000–3,999 ⃁ = 0.5, disabled Saudi = 4.0, student/flex = 0.5)
 */

export interface SaudiPublicHoliday {
  id: string;
  holidayCode: string;
  titleAr: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  overtimeMultiplier: number;
  excludeFromAnnualLeave: boolean;
}

export const DEFAULT_SAUDI_PUBLIC_HOLIDAYS: SaudiPublicHoliday[] = [
  {
    id: 'HOL-FOUNDING-2026',
    holidayCode: 'FOUNDING_DAY',
    titleAr: 'يوم التأسيس السعودي',
    startDate: '2026-02-22',
    endDate: '2026-02-22',
    overtimeMultiplier: 1.5,
    excludeFromAnnualLeave: true,
  },
  {
    id: 'HOL-FITR-2026',
    holidayCode: 'EID_AL_FITR',
    titleAr: 'إجازة عيد الفطر المبارك (4 أيام عمل نظامية)',
    startDate: '2026-03-20',
    endDate: '2026-03-23',
    overtimeMultiplier: 2.0,
    excludeFromAnnualLeave: true,
  },
  {
    id: 'HOL-ADHA-2026',
    holidayCode: 'EID_AL_ADHA',
    titleAr: 'إجازة عيد الأضحى المبارك (4 أيام عمل نظامية)',
    startDate: '2026-05-26',
    endDate: '2026-05-29',
    overtimeMultiplier: 2.0,
    excludeFromAnnualLeave: true,
  },
  {
    id: 'HOL-NATIONAL-2026',
    holidayCode: 'NATIONAL_DAY',
    titleAr: 'اليوم الوطني للمملكة العربية السعودية',
    startDate: '2026-09-23',
    endDate: '2026-09-23',
    overtimeMultiplier: 1.5,
    excludeFromAnnualLeave: true,
  },
];

export interface NetLeaveCalculationResult {
  calendarDays: number;
  excludedHolidayDays: number;
  excludedWeekendDays: number;
  matchedHolidays: string[];
  netDeductibleLeaveDays: number;
}

function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

function formatIsoDay(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

/**
 * Checks whether a specific YYYY-MM-DD falls on an official Saudi public holiday.
 * Also matches recurring fixed civic dates (`-02-22` Founding Day & `-09-23` National Day) across any year.
 */
export function findSaudiHolidayForDate(
  isoDate: string,
  holidays: SaudiPublicHoliday[] = DEFAULT_SAUDI_PUBLIC_HOLIDAYS
): SaudiPublicHoliday | null {
  const day = isoDate.slice(0, 10);
  const direct = holidays.find((h) => day >= h.startDate && day <= h.endDate);
  if (direct) return direct;

  if (day.endsWith('-02-22')) {
    return {
      id: `HOL-FOUNDING-${day.slice(0, 4)}`,
      holidayCode: 'FOUNDING_DAY',
      titleAr: 'يوم التأسيس السعودي',
      startDate: day,
      endDate: day,
      overtimeMultiplier: 1.5,
      excludeFromAnnualLeave: true,
    };
  }
  if (day.endsWith('-09-23')) {
    return {
      id: `HOL-NATIONAL-${day.slice(0, 4)}`,
      holidayCode: 'NATIONAL_DAY',
      titleAr: 'اليوم الوطني للمملكة العربية السعودية',
      startDate: day,
      endDate: day,
      overtimeMultiplier: 1.5,
      excludeFromAnnualLeave: true,
    };
  }
  return null;
}

/**
 * Saudi Labor Law Art. 109 / 112: Official Eid & Civic Holidays intersecting an Annual Leave
 * are NOT deducted from the employee's annual leave balance.
 */
export function calculateNetLeaveDaysExcludingHolidays(
  startDate: string,
  endDate: string,
  options?: {
    holidays?: SaudiPublicHoliday[];
    excludeWeekends?: boolean;
    weekendUtcDays?: number[]; // default Friday (5) & Saturday (6) when excludeWeekends=true
  }
): NetLeaveCalculationResult {
  const start = parseIsoDay(startDate);
  const end = parseIsoDay(endDate);
  if (end.getTime() < start.getTime()) {
    return {
      calendarDays: 0,
      excludedHolidayDays: 0,
      excludedWeekendDays: 0,
      matchedHolidays: [],
      netDeductibleLeaveDays: 0,
    };
  }

  const holidays = options?.holidays ?? DEFAULT_SAUDI_PUBLIC_HOLIDAYS;
  const excludeWeekends = Boolean(options?.excludeWeekends);
  const weekendDays = options?.weekendUtcDays ?? [5, 6];

  let calendarDays = 0;
  let excludedHolidayDays = 0;
  let excludedWeekendDays = 0;
  const matchedSet = new Set<string>();

  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    calendarDays += 1;
    const iso = formatIsoDay(cursor);
    const holiday = findSaudiHolidayForDate(iso, holidays);
    if (holiday && holiday.excludeFromAnnualLeave) {
      excludedHolidayDays += 1;
      matchedSet.add(holiday.titleAr);
    } else if (excludeWeekends && weekendDays.includes(cursor.getUTCDay())) {
      excludedWeekendDays += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const netDeductibleLeaveDays = Math.max(
    0,
    calendarDays - excludedHolidayDays - excludedWeekendDays
  );

  return {
    calendarDays,
    excludedHolidayDays,
    excludedWeekendDays,
    matchedHolidays: Array.from(matchedSet),
    netDeductibleLeaveDays,
  };
}

// ============================================================================
// 2. MONTHLY SHIFT ROSTER & COLLEAGUE SHIFT SWAP ENGINE
// ============================================================================

export interface ShiftRosterEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  rosterDate: string; // YYYY-MM-DD
  shiftId: string;
  shiftName: string;
  isDayOff: boolean;
  branchName?: string;
}

export interface ShiftSwapRequestRecord {
  id: string;
  requesterId: string;
  requesterName: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  swapDate: string;
  requesterShiftId: string;
  requesterShiftName?: string;
  targetShiftId: string;
  targetShiftName?: string;
  reason: string;
  colleagueAccepted: boolean;
  managerApproved?: boolean;
  status:
    | 'قيد اعتماد المدير'
    | 'بانتظار اعتماد المدير'
    | 'بانتظار موافقة الزميل'
    | 'معتمد'
    | 'مرفوض';
}

export type ShiftSwapRequest = ShiftSwapRequestRecord;

export function resolveEffectiveShiftForDate(
  employeeId: string,
  isoDate: string,
  selectedShiftId: string,
  rosters: ShiftRosterEntry[],
  approvedSwaps: ShiftSwapRequestRecord[]
): { shiftId: string; isDayOff: boolean; source: 'SWAP' | 'ROSTER' | 'DEFAULT' } {
  const dateKey = isoDate.slice(0, 10);
  const swap = approvedSwaps.find(
    (s) =>
      s.status === 'معتمد' &&
      s.swapDate === dateKey &&
      (s.requesterId === employeeId || s.targetEmployeeId === employeeId)
  );
  if (swap) {
    return {
      shiftId: swap.requesterId === employeeId ? swap.targetShiftId : swap.requesterShiftId,
      isDayOff: false,
      source: 'SWAP',
    };
  }

  const roster = rosters.find(
    (r) => r.employeeId === employeeId && r.rosterDate === dateKey
  );
  if (roster) {
    return {
      shiftId: roster.shiftId,
      isDayOff: roster.isDayOff,
      source: 'ROSTER',
    };
  }

  return {
    shiftId: selectedShiftId || 'SHF-MAIN-FIXED',
    isDayOff: false,
    source: 'DEFAULT',
  };
}

export function validateShiftSwapRequest(input: {
  requesterId: string;
  targetEmployeeId: string;
  swapDate: string;
  requesterShiftId: string;
  targetShiftId: string;
  existingSwaps: ShiftSwapRequestRecord[];
}): { valid: boolean; reasonAr?: string } {
  if (!input.requesterId || !input.targetEmployeeId) {
    return { valid: false, reasonAr: 'يرجى تحديد الموظف الطالب والزميل البديل.' };
  }
  if (input.requesterId === input.targetEmployeeId) {
    return { valid: false, reasonAr: 'لا يمكن تبديل الوردية مع نفس الموظف.' };
  }
  if (input.requesterShiftId === input.targetShiftId) {
    return { valid: false, reasonAr: 'الزميل المختار مسجل على نفس الوردية بالفعل في هذا التاريخ.' };
  }
  const duplicate = input.existingSwaps.find(
    (s) =>
      s.swapDate === input.swapDate &&
      s.status !== 'مرفوض' &&
      (s.requesterId === input.requesterId ||
        s.targetEmployeeId === input.requesterId ||
        s.requesterId === input.targetEmployeeId ||
        s.targetEmployeeId === input.targetEmployeeId)
  );
  if (duplicate) {
    return {
      valid: false,
      reasonAr: 'يوجد طلب تبديل مناوبة نشط لأحد الموظفين في نفس اليوم.',
    };
  }
  return { valid: true };
}

// ============================================================================
// 3. HRSD SAUDI LABOR LAW DISCIPLINARY MATRIX (ARTICLES 66 TO 72)
// ============================================================================

export type DisciplinaryPenaltyType =
  | 'WRITTEN_WARNING'
  | 'DEDUCTION_DAYS'
  | 'SUSPENSION_WITHOUT_PAY'
  | 'TERMINATION_ART80';

export interface HrsdPenaltyStep {
  penaltyType: DisciplinaryPenaltyType;
  labelAr: string;
  deductionDays: number; // e.g., 0.25 = 25% of daily wage, 1 = 1 day, 5 = 5 days
}

export interface HrsdViolationDefinition {
  code: string;
  categoryAr: string;
  titleAr: string;
  steps: [HrsdPenaltyStep, HrsdPenaltyStep, HrsdPenaltyStep, HrsdPenaltyStep];
}

export const HRSD_DISCIPLINARY_CATALOG: HrsdViolationDefinition[] = [
  {
    code: 'VIO-LATE-30M',
    categoryAr: 'مخالفات مواعيد العمل',
    titleAr: 'التأخر عن مواعيد الحضور من 15 إلى 30 دقيقة دون عذر مشروع وتترتب عليه تعطيل عمل',
    steps: [
      { penaltyType: 'WRITTEN_WARNING', labelAr: 'إنذار كتابي رسمي', deductionDays: 0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم 25% من أجر اليوم', deductionDays: 0.25 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم 50% من أجر اليوم', deductionDays: 0.5 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يوم كامل', deductionDays: 1.0 },
    ],
  },
  {
    code: 'VIO-LATE-60M',
    categoryAr: 'مخالفات مواعيد العمل',
    titleAr: 'التأخر عن مواعيد الحضور أكثر من 60 دقيقة دون إذن أو عذر مقبول',
    steps: [
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'إنذار كتابي + خصم 25% من اليوم', deductionDays: 0.25 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يوم واحد', deductionDays: 1.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يومين', deductionDays: 2.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر 3 أيام', deductionDays: 3.0 },
    ],
  },
  {
    code: 'VIO-ABSENT-NO-EXCUSE',
    categoryAr: 'الغياب والانقطاع',
    titleAr: 'الغياب دون إذن كتابي أو عذر مقبول لمدة يوم عمل منفصل',
    steps: [
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم يوم عن الإنذار بالإضافة لحرمان أجر الغياب', deductionDays: 1.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يومين', deductionDays: 2.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر 3 أيام', deductionDays: 3.0 },
      { penaltyType: 'TERMINATION_ART80', labelAr: 'إنذار نهائي بالفصل وفق المادة 80 عند بلوغ النصاب', deductionDays: 5.0 },
    ],
  },
  {
    code: 'VIO-LEAVE-WORKPLACE',
    categoryAr: 'تنظيم العمل والسلوك',
    titleAr: 'مغادرة مقر العمل قبل انتهاء الدوام دون إذن رسمي من الرئيس المباشر',
    steps: [
      { penaltyType: 'WRITTEN_WARNING', labelAr: 'إنذار كتابي رسمي', deductionDays: 0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم 25% من أجر اليوم', deductionDays: 0.25 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يوم واحد', deductionDays: 1.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يومين', deductionDays: 2.0 },
    ],
  },
  {
    code: 'VIO-SAFETY-BREACH',
    categoryAr: 'السلامة المهنية وحماية البيانات',
    titleAr: 'مخالفة تعليمات السلامة المهنية أو سياسات أمن وحماية البيانات (PDPL)',
    steps: [
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر يوم واحد مع تعهد خطي', deductionDays: 1.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر 3 أيام', deductionDays: 3.0 },
      { penaltyType: 'DEDUCTION_DAYS', labelAr: 'خصم أجر 5 أيام', deductionDays: 5.0 },
      { penaltyType: 'TERMINATION_ART80', labelAr: 'فسخ العقد دون مكافأة وفق المادة 80 بعد التحقيق', deductionDays: 0 },
    ],
  },
];

export interface HistoricalDisciplinaryItem {
  employeeId: string;
  violationCode: string;
  incidentDate: string; // YYYY-MM-DD
  payrollMonth: string; // YYYY-MM
  appliedMonthDays: number;
  status: string;
}

export interface DisciplinaryEvaluationResult {
  allowed: boolean;
  blockingReasonAr?: string;
  occurrenceNumber: 1 | 2 | 3 | 4;
  priorActiveCountWithin180Days: number;
  decayedCountOver180Days: number;
  penaltyStep: HrsdPenaltyStep;
  dailyWage: number;
  rawDeductionDays: number;
  alreadyDeductedDaysThisMonth: number;
  appliedMonthDays: number;        // Capped so cumulative month <= 5 days (Art. 67)
  carriedForwardDays: number;      // Deferred to next month per Art. 67
  appliedDeductionAmount: number;
  repeatDecayDate: string;         // incidentDate + 180 days
}

/**
 * Evaluates a disciplinary violation strictly against Saudi Labor Law Articles 66–72:
 * - Art. 69: Cannot accuse an employee of a violation discovered more than 30 days ago.
 * - Art. 71: Cannot impose a disciplinary penalty without formal written notification & defense hearing minutes.
 * - HRSD Standard Bylaws: Prior occurrences older than 180 days decay and reset progression.
 * - Art. 67: Single fine cannot exceed 5 days' wages AND total fines executed in one month cannot exceed 5 days' wages.
 */
export function evaluateDisciplinaryAction(input: {
  employeeId: string;
  monthlyBasicSalary: number;
  violationCode: string;
  incidentDate: string;
  discoveryDate: string;
  decisionDate: string;
  investigationSessionDate?: string;
  investigationMinutesRef?: string;
  employeeDefenseSummary?: string;
  priorRecords: HistoricalDisciplinaryItem[];
}): DisciplinaryEvaluationResult {
  const violation =
    HRSD_DISCIPLINARY_CATALOG.find((v) => v.code === input.violationCode) ||
    HRSD_DISCIPLINARY_CATALOG[0];

  const incidentDt = parseIsoDay(input.incidentDate);
  const discoveryDt = parseIsoDay(input.discoveryDate);
  const decisionDt = parseIsoDay(input.decisionDate);
  const dailyWage = Math.round(((Math.max(0, input.monthlyBasicSalary) / 30) + Number.EPSILON) * 100) / 100;

  const decayDt = new Date(incidentDt.getTime());
  decayDt.setUTCDate(decayDt.getUTCDate() + 180);
  const repeatDecayDate = formatIsoDay(decayDt);

  // Count prior records for same employee & violation code
  const empSameCode = input.priorRecords.filter(
    (r) =>
      r.employeeId === input.employeeId &&
      r.violationCode === violation.code &&
      r.status !== 'ملغى'
  );

  let priorActiveCountWithin180Days = 0;
  let decayedCountOver180Days = 0;

  for (const r of empSameCode) {
    const prevDt = parseIsoDay(r.incidentDate);
    const diffDays = Math.floor((incidentDt.getTime() - prevDt.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays <= 180) {
      priorActiveCountWithin180Days += 1;
    } else if (diffDays > 180) {
      decayedCountOver180Days += 1;
    }
  }

  const occurrenceNumber = Math.min(4, priorActiveCountWithin180Days + 1) as 1 | 2 | 3 | 4;
  const penaltyStep = violation.steps[occurrenceNumber - 1];

  // Art. 69 statutory check: 30 days from discovery
  const daysSinceDiscovery = Math.floor(
    (decisionDt.getTime() - discoveryDt.getTime()) / 86_400_000
  );
  if (daysSinceDiscovery > 30) {
    return {
      allowed: false,
      blockingReasonAr:
        'مرفوض نظاماً (المادة 69 من نظام العمل): لا يجوز اتهام العامل بمخالفة مضى على كشفها أكثر من 30 يوماً.',
      occurrenceNumber,
      priorActiveCountWithin180Days,
      decayedCountOver180Days,
      penaltyStep,
      dailyWage,
      rawDeductionDays: penaltyStep.deductionDays,
      alreadyDeductedDaysThisMonth: 0,
      appliedMonthDays: 0,
      carriedForwardDays: 0,
      appliedDeductionAmount: 0,
      repeatDecayDate,
    };
  }

  // Art. 71 mandatory investigation check (required for any financial deduction / suspension / termination)
  if (
    penaltyStep.penaltyType !== 'WRITTEN_WARNING' &&
    (!input.investigationSessionDate?.trim() ||
      !input.investigationMinutesRef?.trim() ||
      !input.employeeDefenseSummary?.trim())
  ) {
    return {
      allowed: false,
      blockingReasonAr:
        'موقوف نظاماً (المادة 71 من نظام العمل): لا يجوز توقيع جزاء تأديبي بالخصم أو الفصل إلا بعد إبلاغ الموظف كتابةً والتحقيق معه وسماع دفاعه وتدوين ذلك في محضر رسمي.',
      occurrenceNumber,
      priorActiveCountWithin180Days,
      decayedCountOver180Days,
      penaltyStep,
      dailyWage,
      rawDeductionDays: penaltyStep.deductionDays,
      alreadyDeductedDaysThisMonth: 0,
      appliedMonthDays: 0,
      carriedForwardDays: 0,
      appliedDeductionAmount: 0,
      repeatDecayDate,
    };
  }

  // Art. 67 cap: max 5 days single penalty & max 5 days deducted inside one payroll month
  const payrollMonth = input.decisionDate.slice(0, 7);
  const alreadyDeductedDaysThisMonth = input.priorRecords
    .filter(
      (r) =>
        r.employeeId === input.employeeId &&
        r.payrollMonth === payrollMonth &&
        r.status !== 'ملغى'
    )
    .reduce((sum, r) => sum + Number(r.appliedMonthDays || 0), 0);

  const rawDeductionDays = Math.min(5, Math.max(0, penaltyStep.deductionDays));
  const remainingQuotaInMonth = Math.max(0, 5 - alreadyDeductedDaysThisMonth);
  const appliedMonthDays = Math.round(Math.min(rawDeductionDays, remainingQuotaInMonth) * 100) / 100;
  const carriedForwardDays = Math.round(Math.max(0, rawDeductionDays - appliedMonthDays) * 100) / 100;
  const appliedDeductionAmount = Math.round(appliedMonthDays * dailyWage * 100) / 100;

  return {
    allowed: true,
    occurrenceNumber,
    priorActiveCountWithin180Days,
    decayedCountOver180Days,
    penaltyStep,
    dailyWage,
    rawDeductionDays,
    alreadyDeductedDaysThisMonth,
    appliedMonthDays,
    carriedForwardDays,
    appliedDeductionAmount,
    repeatDecayDate,
  };
}

// ============================================================================
// 4. ZATCA PHASE 1/2 TLV BASE64 QR RECEIPT DECODER & DUPLICATE GUARD
// ============================================================================

export interface DecodedZatcaReceiptQr {
  valid: boolean;
  errorAr?: string;
  sellerName: string;
  vatRegistrationNumber: string;
  invoiceTimestamp: string;
  totalWithVat: number;
  vatAmount: number;
  netBeforeVat: number;
  isPhase2Signed: boolean;
  receiptFingerprint: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.trim().replace(/\s+/g, '');
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function computeReceiptFingerprint(
  vatNumber: string,
  invoiceTimestamp: string,
  totalWithVat: number
): string {
  const normalized = `${vatNumber.trim()}|${invoiceTimestamp.trim().slice(0, 19)}|${Number(totalWithVat).toFixed(2)}`;
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ZATCA-FP-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Encodes a standard ZATCA TLV Base64 QR payload (Tags 1..5).
 */
export function encodeZatcaQrTlvBase64(fields: {
  sellerName: string;
  vatRegistrationNumber: string;
  invoiceTimestamp: string;
  totalWithVat: string | number;
  vatAmount: string | number;
}): string {
  const encoder = new TextEncoder();
  const entries: Array<[number, Uint8Array]> = [
    [1, encoder.encode(fields.sellerName)],
    [2, encoder.encode(fields.vatRegistrationNumber)],
    [3, encoder.encode(fields.invoiceTimestamp)],
    [4, encoder.encode(Number(fields.totalWithVat).toFixed(2))],
    [5, encoder.encode(Number(fields.vatAmount).toFixed(2))],
  ];

  const totalLen = entries.reduce((sum, [, val]) => sum + 2 + val.length, 0);
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  for (const [tag, val] of entries) {
    buf[offset] = tag;
    buf[offset + 1] = val.length;
    buf.set(val, offset + 2);
    offset += 2 + val.length;
  }
  return bytesToBase64(buf);
}

/**
 * Decodes a Saudi ZATCA e-Invoice QR Base64 TLV string (Tags 1..9) and validates 15-digit VAT number.
 */
export function decodeZatcaQrTlvBase64(rawQrBase64: string): DecodedZatcaReceiptQr {
  try {
    if (!rawQrBase64 || rawQrBase64.trim().length < 16) {
      return {
        valid: false,
        errorAr: 'رمز الباركود ZATCA فارغ أو غير مكتمل.',
        sellerName: '',
        vatRegistrationNumber: '',
        invoiceTimestamp: '',
        totalWithVat: 0,
        vatAmount: 0,
        netBeforeVat: 0,
        isPhase2Signed: false,
        receiptFingerprint: '',
      };
    }

    const bytes = base64ToBytes(rawQrBase64);
    const decoder = new TextDecoder('utf-8');
    const tags = new Map<number, string>();
    let idx = 0;
    let hasPhase2Tags = false;

    while (idx + 2 <= bytes.length) {
      const tag = bytes[idx];
      const len = bytes[idx + 1];
      if (tag < 1 || tag > 9 || idx + 2 + len > bytes.length) {
        break;
      }
      if (tag >= 6) {
        hasPhase2Tags = true;
      } else {
        const slice = bytes.slice(idx + 2, idx + 2 + len);
        tags.set(tag, decoder.decode(slice));
      }
      idx += 2 + len;
    }

    const sellerName = (tags.get(1) || '').trim();
    const vatRegistrationNumber = (tags.get(2) || '').trim();
    const invoiceTimestamp = (tags.get(3) || '').trim();
    const totalWithVat = Math.round((parseFloat(tags.get(4) || '0') || 0) * 100) / 100;
    const vatAmount = Math.round((parseFloat(tags.get(5) || '0') || 0) * 100) / 100;

    if (!sellerName || !/^\d{15}$/.test(vatRegistrationNumber) || totalWithVat <= 0) {
      return {
        valid: false,
        errorAr: 'تعذر التحقق من حقول ZATCA الإلزامية (اسم المورد، الرقم الضريبي المكون من 15 رقماً، أو إجمالي الفاتورة).',
        sellerName,
        vatRegistrationNumber,
        invoiceTimestamp,
        totalWithVat,
        vatAmount,
        netBeforeVat: 0,
        isPhase2Signed: hasPhase2Tags,
        receiptFingerprint: '',
      };
    }

    const netBeforeVat = Math.round(Math.max(0, totalWithVat - vatAmount) * 100) / 100;
    const receiptFingerprint = computeReceiptFingerprint(
      vatRegistrationNumber,
      invoiceTimestamp,
      totalWithVat
    );

    return {
      valid: true,
      sellerName,
      vatRegistrationNumber,
      invoiceTimestamp,
      totalWithVat,
      vatAmount,
      netBeforeVat,
      isPhase2Signed: hasPhase2Tags,
      receiptFingerprint,
    };
  } catch {
    return {
      valid: false,
      errorAr: 'صيغة Base64 TLV غير صالحة لقارئ الفاتورة الضريبية ZATCA.',
      sellerName: '',
      vatRegistrationNumber: '',
      invoiceTimestamp: '',
      totalWithVat: 0,
      vatAmount: 0,
      netBeforeVat: 0,
      isPhase2Signed: false,
      receiptFingerprint: '',
    };
  }
}

// ============================================================================
// 5. JISR PAY — EARNED WAGE ACCESS (EWA — الراتب المرن المبكر المستحق الفعلي)
// ============================================================================

export interface EarnedWageAccessQuote {
  workedDaysToDate: number;
  monthlyNetEstimated: number;
  earnedWageToDate: number;
  maxCapPercent: number;
  alreadyWithdrawnThisMonth: number;
  availableWithdrawableAmount: number;
  shariaTransferFee: number;
}

export interface RealWorkedDaysResolution {
  workedDaysToDate: number;
  attendancePunchDays: number;
  source: 'ATTENDANCE_PUNCHES' | 'CALENDAR_ELAPSED_SYNC';
  sourceLabelAr: string;
}

/**
 * Resolves verified worked days in the current payroll month from real `attendances` records,
 * falling back to elapsed calendar days from hire/month start when attendance punches are synced externally.
 */
export function resolveRealWorkedDaysForMonth(params: {
  employeeId: string;
  employeeName?: string;
  hireDate?: string;
  payrollMonth: string; // YYYY-MM
  referenceDateIso?: string; // YYYY-MM-DD
  attendances: Array<{
    employee_id?: string;
    employeeId?: string;
    emp_name?: string;
    employee_name?: string;
    date?: string;
    status?: string;
    check_in?: string;
  }>;
}): RealWorkedDaysResolution {
  const ym = params.payrollMonth.slice(0, 7);
  const refIso = (params.referenceDateIso || new Date().toISOString()).slice(0, 10);
  const cleanEmpName = (params.employeeName || '').split('(')[0].trim();

  const distinctPunchDates = new Set<string>();
  for (const att of params.attendances || []) {
    const attDate = (att.date || '').slice(0, 10);
    if (!attDate.startsWith(ym)) continue;
    if (att.status === 'غائب') continue;

    const attEmpId = String(att.employee_id || att.employeeId || '').trim();
    const attName = String(att.emp_name || att.employee_name || '').trim();
    const idMatched = Boolean(params.employeeId && attEmpId && attEmpId === params.employeeId);
    const nameMatched = Boolean(
      cleanEmpName &&
        attName &&
        (attName === cleanEmpName ||
          cleanEmpName.includes(attName) ||
          attName.includes(cleanEmpName))
    );

    if (idMatched || nameMatched) {
      distinctPunchDates.add(attDate);
    }
  }

  if (distinctPunchDates.size > 0) {
    const worked = Math.min(30, distinctPunchDates.size);
    return {
      workedDaysToDate: worked,
      attendancePunchDays: distinctPunchDates.size,
      source: 'ATTENDANCE_PUNCHES',
      sourceLabelAr: `محسوب فعلياً من سجلات البصمة والحضور الموثقة للشهر (${distinctPunchDates.size} يوم حضور)`,
    };
  }

  // Elapsed calendar days in the active month from month start or employee hireDate
  const monthStartIso = `${ym}-01`;
  const effectiveStartIso =
    params.hireDate && /^\d{4}-\d{2}-\d{2}/.test(params.hireDate) && params.hireDate.slice(0, 10) > monthStartIso
      ? params.hireDate.slice(0, 10)
      : monthStartIso;

  let elapsedDays = 0;
  if (refIso >= effectiveStartIso) {
    const startDt = parseIsoDay(effectiveStartIso);
    const endDt = parseIsoDay(refIso.slice(0, 7) === ym ? refIso : `${ym}-30`);
    elapsedDays = Math.min(
      30,
      Math.max(1, Math.floor((endDt.getTime() - startDt.getTime()) / 86_400_000) + 1)
    );
  }

  return {
    workedDaysToDate: elapsedDays,
    attendancePunchDays: 0,
    source: 'CALENDAR_ELAPSED_SYNC',
    sourceLabelAr: `محسوب من الأيام الفعلية المنقضية منذ ${effectiveStartIso} (مزامنة الحضور الخارجي)`,
  };
}

export function calculateEarnedWageAccess(input: {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances?: number;
  isSaudi: boolean;
  monthlyAdvanceInstallment?: number;
  dayOfMonth: number; // 0..30 real worked/elapsed days
  alreadyWithdrawnThisMonth?: number;
  maxCapPercent?: number; // default 50%
}): EarnedWageAccessQuote {
  const gross =
    Math.max(0, input.basicSalary) +
    Math.max(0, input.housingAllowance) +
    Math.max(0, input.transportAllowance) +
    Math.max(0, input.otherAllowances || 0);

  const gosiBase = Math.min(45_000, Math.max(0, input.basicSalary) + Math.max(0, input.housingAllowance));
  const employeeGosi = input.isSaudi ? Math.round(gosiBase * 0.0975 * 100) / 100 : 0;
  const monthlyNetEstimated = Math.max(
    0,
    Math.round((gross - employeeGosi - Math.max(0, input.monthlyAdvanceInstallment || 0)) * 100) / 100
  );

  const workedDaysToDate = Math.min(30, Math.max(0, Math.floor(input.dayOfMonth)));
  const earnedWageToDate = Math.round(((monthlyNetEstimated * workedDaysToDate) / 30) * 100) / 100;
  const maxCapPercent = input.maxCapPercent ?? 50;
  const grossCap = Math.round(((earnedWageToDate * maxCapPercent) / 100) * 100) / 100;
  const alreadyWithdrawnThisMonth = Math.max(0, input.alreadyWithdrawnThisMonth || 0);
  const availableWithdrawableAmount = Math.max(
    0,
    Math.round((grossCap - alreadyWithdrawnThisMonth) * 100) / 100
  );

  return {
    workedDaysToDate,
    monthlyNetEstimated,
    earnedWageToDate,
    maxCapPercent,
    alreadyWithdrawnThisMonth,
    availableWithdrawableAmount,
    shariaTransferFee: 0, // بدون أي فوائد ربوية — خدمة المنشأة لمنسوبيها (0 ⃁)
  };
}

// ============================================================================
// 6. QIWA NITAQAT LIVE ENFORCEMENT & VISA ELIGIBILITY GATE
// ============================================================================

export type NitaqatBand =
  | 'أحمر'
  | 'أخضر منخفض'
  | 'أخضر متوسط'
  | 'أخضر مرتفع'
  | 'بلاتيني';

export interface NitaqatEmployeeInput {
  id: string;
  isSaudi: boolean;
  totalWage: number; // Basic + Housing (GOSI registered wage)
  isDisabledSaudi?: boolean;
  isStudentOrFlexible?: boolean;
}

export interface NitaqatLiveSnapshot {
  totalHeadcount: number;
  saudiRawCount: number;
  expatCount: number;
  weightedSaudiPoints: number;
  saudizationPercent: number;
  band: NitaqatBand;
  pointsNeededForNextBand: number;
  nextBandLabel: string;
}

/** Backwards-compatible type alias */
export type NitaqatSimulationSnapshot = NitaqatLiveSnapshot;

export interface EmployeeNitaqatWeightDetail {
  weight: number;
  ruleCode:
    | 'DISABLED_SAUDI_4X'
    | 'STUDENT_OR_FLEX_HALF'
    | 'FULL_SAUDI_1X'
    | 'HALF_SAUDI_3000_3999'
    | 'BELOW_MIN_WAGE_SAUDI'
    | 'EXPAT_ZERO';
  classificationAr: string;
}

/**
 * Computes the exact official Qiwa / GOSI Nitaqat weight for a single active employee:
 * - Disabled Saudi (`>= 4,000 ⃁`) = 4.0 points
 * - Student / Flexible-work Saudi = 0.5 points
 * - Full-wage Saudi (`>= 4,000 ⃁`) = 1.0 point
 * - Half-wage Saudi (`3,000–3,999 ⃁`) = 0.5 points
 * - Saudi below `3,000 ⃁` = 0.0 points
 * - Expat = 0.0 points
 */
export function computeEmployeeNitaqatWeight(
  emp: NitaqatEmployeeInput
): EmployeeNitaqatWeightDetail {
  if (!emp.isSaudi) {
    return {
      weight: 0,
      ruleCode: 'EXPAT_ZERO',
      classificationAr: 'وافد خاضع لحساب القوى العاملة (0 نقطة)',
    };
  }

  if (emp.isDisabledSaudi && emp.totalWage >= 4000) {
    return {
      weight: 4.0,
      ruleCode: 'DISABLED_SAUDI_4X',
      classificationAr: 'سعودي من ذوي الإعاقة (أجر ≥ 4,000 ⃁ — 4.0 نقاط)',
    };
  }

  if (emp.isStudentOrFlexible) {
    return {
      weight: 0.5,
      ruleCode: 'STUDENT_OR_FLEX_HALF',
      classificationAr: 'سعودي طالب / عمل مرن (0.5 نقطة)',
    };
  }

  if (emp.totalWage >= 4000) {
    return {
      weight: 1.0,
      ruleCode: 'FULL_SAUDI_1X',
      classificationAr: 'سعودي كامل الوزن (أجر ≥ 4,000 ⃁ — 1.0 نقطة)',
    };
  }

  if (emp.totalWage >= 3000) {
    return {
      weight: 0.5,
      ruleCode: 'HALF_SAUDI_3000_3999',
      classificationAr: 'سعودي نصف وزن (أجر 3,000–3,999 ⃁ — 0.5 نقطة)',
    };
  }

  return {
    weight: 0,
    ruleCode: 'BELOW_MIN_WAGE_SAUDI',
    classificationAr: 'سعودي دون الحد الأدنى لاحتساب نطاقات (< 3,000 ⃁ — 0 نقطة)',
  };
}

function classifyNitaqatBand(percent: number): {
  band: NitaqatBand;
  nextThreshold: number | null;
  nextLabel: string;
} {
  if (percent < 16) {
    return { band: 'أحمر', nextThreshold: 16, nextLabel: 'أخضر منخفض (16%)' };
  }
  if (percent < 24) {
    return { band: 'أخضر منخفض', nextThreshold: 24, nextLabel: 'أخضر متوسط (24%)' };
  }
  if (percent < 32) {
    return { band: 'أخضر متوسط', nextThreshold: 32, nextLabel: 'أخضر مرتفع (32%)' };
  }
  if (percent < 40) {
    return { band: 'أخضر مرتفع', nextThreshold: 40, nextLabel: 'بلاتيني (40%)' };
  }
  return { band: 'بلاتيني', nextThreshold: null, nextLabel: 'أعلى نطاق (البلاتيني)' };
}

export function computeNitaqatSnapshot(employees: NitaqatEmployeeInput[]): NitaqatLiveSnapshot {
  let saudiRawCount = 0;
  let expatCount = 0;
  let weightedSaudiPoints = 0;

  for (const emp of employees) {
    if (emp.isSaudi) {
      saudiRawCount += 1;
      const detail = computeEmployeeNitaqatWeight(emp);
      weightedSaudiPoints += detail.weight;
    } else {
      expatCount += 1;
    }
  }

  const totalHeadcount = saudiRawCount + expatCount;
  const saudizationPercent =
    totalHeadcount > 0
      ? Math.round(((weightedSaudiPoints / totalHeadcount) * 100 + Number.EPSILON) * 100) / 100
      : 0;

  const { band, nextThreshold, nextLabel } = classifyNitaqatBand(saudizationPercent);
  let pointsNeededForNextBand = 0;
  if (nextThreshold !== null && totalHeadcount > 0) {
    const requiredPoints = (nextThreshold / 100) * totalHeadcount;
    pointsNeededForNextBand = Math.max(
      0,
      Math.ceil((requiredPoints - weightedSaudiPoints) * 10) / 10
    );
  }

  return {
    totalHeadcount,
    saudiRawCount,
    expatCount,
    weightedSaudiPoints: Math.round(weightedSaudiPoints * 100) / 100,
    saudizationPercent,
    band,
    pointsNeededForNextBand,
    nextBandLabel: nextLabel,
  };
}

export type QiwaVisaRequestType =
  | 'NEW_WORK_VISA'
  | 'SPONSORSHIP_TRANSFER_IN';

export interface QiwaVisaEligibilityDecision {
  eligible: boolean;
  band: NitaqatBand;
  saudizationPercent: number;
  weightedSaudiPoints: number;
  totalHeadcount: number;
  requestedVisasCount: number;
  maxAllowedVisasInCurrentBand: number;
  projectedPercentAfterIssuance: number;
  projectedBandAfterIssuance: NitaqatBand;
  decisionCode: 'APPROVED_ELIGIBLE' | 'BLOCKED_RED_BAND' | 'BLOCKED_QUOTA_EXCEEDED';
  decisionTitleAr: string;
  reasonAr: string;
}

/**
 * Evaluates live Qiwa & Muqeem eligibility for issuing new expat work visas or incoming sponsorship transfers:
 * - Strictly BLOCKS requests when the establishment is in the Red band (`أحمر`).
 * - Approves requests when in Green (`أخضر منخفض` / `أخضر متوسط` / `أخضر مرتفع`) or Platinum (`بلاتيني`) within band quota.
 */
export function evaluateQiwaVisaEligibility(input: {
  employees: NitaqatEmployeeInput[];
  requestType: QiwaVisaRequestType;
  requestedCount?: number;
}): QiwaVisaEligibilityDecision {
  const snap = computeNitaqatSnapshot(input.employees);
  const requestedVisasCount = Math.max(1, Math.floor(input.requestedCount || 1));

  const newHeadcount = snap.totalHeadcount + requestedVisasCount;
  const projectedPercentAfterIssuance =
    newHeadcount > 0
      ? Math.round(((snap.weightedSaudiPoints / newHeadcount) * 100 + Number.EPSILON) * 100) / 100
      : 0;
  const projectedBandAfterIssuance = classifyNitaqatBand(projectedPercentAfterIssuance).band;

  if (snap.band === 'أحمر' || snap.totalHeadcount === 0) {
    return {
      eligible: false,
      band: snap.band,
      saudizationPercent: snap.saudizationPercent,
      weightedSaudiPoints: snap.weightedSaudiPoints,
      totalHeadcount: snap.totalHeadcount,
      requestedVisasCount,
      maxAllowedVisasInCurrentBand: 0,
      projectedPercentAfterIssuance,
      projectedBandAfterIssuance,
      decisionCode: 'BLOCKED_RED_BAND',
      decisionTitleAr: 'مرفوض نظاماً — المنشأة في النطاق الأحمر (قوى / مقيم)',
      reasonAr: `تمنع لوائح وزارة الموارد البشرية (منصة قوى ومقيم) إصدار تأشيرات استقدام جديدة أو نقل خدمات وافدين للمنشآت الواقعة في النطاق الأحمر (${snap.saudizationPercent}%). يلزم تحقيق ${snap.pointsNeededForNextBand} نقطة توطين إضافية لبلوغ ${snap.nextBandLabel}.`,
    };
  }

  const safeHeadroomAboveRed = Math.max(
    0,
    Math.floor(snap.weightedSaudiPoints / 0.16 - snap.totalHeadcount)
  );
  const bandTierFloorQuota: Record<Exclude<NitaqatBand, 'أحمر'>, number> = {
    'أخضر منخفض': 2,
    'أخضر متوسط': 5,
    'أخضر مرتفع': 10,
    'بلاتيني': 25,
  };
  const maxAllowedVisasInCurrentBand = Math.max(
    bandTierFloorQuota[snap.band],
    safeHeadroomAboveRed
  );

  if (requestedVisasCount > maxAllowedVisasInCurrentBand) {
    return {
      eligible: false,
      band: snap.band,
      saudizationPercent: snap.saudizationPercent,
      weightedSaudiPoints: snap.weightedSaudiPoints,
      totalHeadcount: snap.totalHeadcount,
      requestedVisasCount,
      maxAllowedVisasInCurrentBand,
      projectedPercentAfterIssuance,
      projectedBandAfterIssuance,
      decisionCode: 'BLOCKED_QUOTA_EXCEEDED',
      decisionTitleAr: 'تجاوز سقف الرصيد المتاح للتأشيرات في النطاق الحالي',
      reasonAr: `رصيد الأهلية المتاح في نطاق (${snap.band}) هو ${maxAllowedVisasInCurrentBand} تأشيرة/نقل خدمة كحد أقصى دون الإخلال بضوابط التوطين.`,
    };
  }

  const reqLabel =
    input.requestType === 'NEW_WORK_VISA'
      ? 'إصدار تأشيرة عمل استقدام مهنية'
      : 'نقل خدمات عامل وافد إلى المنشأة';

  return {
    eligible: true,
    band: snap.band,
    saudizationPercent: snap.saudizationPercent,
    weightedSaudiPoints: snap.weightedSaudiPoints,
    totalHeadcount: snap.totalHeadcount,
    requestedVisasCount,
    maxAllowedVisasInCurrentBand,
    projectedPercentAfterIssuance,
    projectedBandAfterIssuance,
    decisionCode: 'APPROVED_ELIGIBLE',
    decisionTitleAr: `مؤهل نظاماً — المنشأة في نطاق (${snap.band})`,
    reasonAr: `المنشأة مستوفية لاشتراطات التوطين (${snap.saudizationPercent}%) ومؤهلة لتنفيذ (${reqLabel}) عبر بوابة قوى ومقيم. نسبة التوطين بعد الإجراء: ${projectedPercentAfterIssuance}% (${projectedBandAfterIssuance}).`,
  };
}

// ============================================================================
// 7. SAUDI LABOR LAW ART. 107 OVERTIME & MONTHLY TIMESHEET CONSOLIDATION
// ============================================================================

export interface SaudiOvertimeCalculationInput {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances?: number;
  regularOvertimeHours: number;
  holidayOrEidOvertimeHours?: number;
  lateAndEarlyMinutes?: number;
  unpaidAbsenceDays?: number;
}

export interface SaudiOvertimeCalculationResult {
  totalMonthlySalary: number;
  basicHourlyWage: number;
  actualHourlyWage: number;
  regularOvertimeHourlyRate: number; // Art. 107: actualHourlyWage + 50% of basicHourlyWage
  holidayOvertimeHourlyRate: number; // Art. 107/112: actualHourlyWage + 100% of basicHourlyWage
  regularOvertimePay: number;
  holidayOvertimePay: number;
  totalOvertimePay: number;
  lateAndEarlyDeductionAmount: number;
  unpaidAbsenceDeductionAmount: number;
  netAttendancePayrollImpact: number;
  legalFormulaNoteAr: string;
}

/**
 * Computes exact overtime pay & attendance deductions per Saudi Labor Law Article 107:
 * - Basic Hourly = Basic / 240 (30 days × 8h)
 * - Actual Hourly = Total Gross / 240
 * - Regular Overtime Hour = Actual Hourly + 50% of Basic Hourly
 * - Official Holiday / Eid Overtime Hour = Actual Hourly + 100% of Basic Hourly
 */
export function calculateSaudiOvertimePay(
  input: SaudiOvertimeCalculationInput
): SaudiOvertimeCalculationResult {
  const basic = Math.max(0, input.basicSalary);
  const housing = Math.max(0, input.housingAllowance);
  const transport = Math.max(0, input.transportAllowance);
  const other = Math.max(0, input.otherAllowances || 0);
  const totalMonthlySalary = basic + housing + transport + other;

  const basicHourlyWage = Math.round((basic / 240) * 100) / 100;
  const actualHourlyWage = Math.round((totalMonthlySalary / 240) * 100) / 100;

  const regularOvertimeHourlyRate =
    Math.round((actualHourlyWage + 0.5 * basicHourlyWage) * 100) / 100;
  const holidayOvertimeHourlyRate =
    Math.round((actualHourlyWage + 1.0 * basicHourlyWage) * 100) / 100;

  const regHours = Math.max(0, input.regularOvertimeHours);
  const holHours = Math.max(0, input.holidayOrEidOvertimeHours || 0);

  const regularOvertimePay =
    Math.round(regHours * regularOvertimeHourlyRate * 100) / 100;
  const holidayOvertimePay =
    Math.round(holHours * holidayOvertimeHourlyRate * 100) / 100;
  const totalOvertimePay =
    Math.round((regularOvertimePay + holidayOvertimePay) * 100) / 100;

  const lateMinutes = Math.max(0, input.lateAndEarlyMinutes || 0);
  const lateAndEarlyDeductionAmount =
    Math.round(((lateMinutes / 60) * actualHourlyWage) * 100) / 100;

  const absenceDays = Math.max(0, input.unpaidAbsenceDays || 0);
  const dailyGrossWage = totalMonthlySalary / 30;
  const unpaidAbsenceDeductionAmount =
    Math.round(absenceDays * dailyGrossWage * 100) / 100;

  const netAttendancePayrollImpact =
    Math.round(
      (totalOvertimePay - lateAndEarlyDeductionAmount - unpaidAbsenceDeductionAmount) * 100
    ) / 100;

  return {
    totalMonthlySalary,
    basicHourlyWage,
    actualHourlyWage,
    regularOvertimeHourlyRate,
    holidayOvertimeHourlyRate,
    regularOvertimePay,
    holidayOvertimePay,
    totalOvertimePay,
    lateAndEarlyDeductionAmount,
    unpaidAbsenceDeductionAmount,
    netAttendancePayrollImpact,
    legalFormulaNoteAr:
      'المادة 107 من نظام العمل السعودي: أجر الساعة الإضافية = أجر الساعة الفعلي (الإجمالي ÷ 240) + 50% من أجر الساعة الأساسي (100% في الأعياد والعطل الرسمية).',
  };
}

// ============================================================================
// 8. JISR COMPREHENSIVE FINAL SETTLEMENT & CLEARANCE ENGINE (Art. 64, 80, 84, 85, 87, 111)
// ============================================================================

export type JisrSeparationType =
  | 'CONTRACT_EXPIRY_OR_EMPLOYER_ART84'
  | 'RESIGNATION_ART85'
  | 'FORCE_MAJEURE_OR_MATERNITY_ART87'
  | 'DISCIPLINARY_ART80';

export interface JisrFinalSettlementInput {
  hireDate: string;
  lastWorkingDay: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances?: number;
  isSaudi: boolean;
  separationType: JisrSeparationType;
  unusedLeaveDays: number;
  earnedCurrentMonthDays?: number; // defaults to day-of-month of lastWorkingDay (capped at 30)
  pendingOvertimeAndRewards?: number;
  unusedTicketCompensation?: number;
  remainingAdvancesBalance?: number;
  unsettledEwaBalance?: number;
  pendingSanctionsOrCustodyDeductions?: number;
}

export interface JisrFinalSettlementResult {
  serviceYears: number;
  serviceYearsWhole: number;
  serviceMonthsRemainder: number;
  totalMonthlyWage: number;
  fullStatutoryEosb: number;
  eosbRatioApplied: number;
  netEosbEntitlement: number;
  eosbLegalReferenceAr: string;
  earnedCurrentMonthDays: number;
  proRataCurrentMonthNet: number;
  unusedLeaveCompensation: number;
  pendingOvertimeAndRewards: number;
  unusedTicketCompensation: number;
  totalEntitlements: number;
  remainingAdvancesBalance: number;
  unsettledEwaBalance: number;
  pendingSanctionsOrCustodyDeductions: number;
  totalDeductions: number;
  netPayable: number;
  requiresEmployeeReimbursement: boolean;
}

export function mapSeparationReasonLabelToType(reasonAr: string): JisrSeparationType {
  const txt = (reasonAr || '').trim();
  if (txt.includes('80') || txt.includes('فسخ')) {
    return 'DISCIPLINARY_ART80';
  }
  if (txt.includes('87') || txt.includes('زواج') || txt.includes('وضع') || txt.includes('قوة قاهرة')) {
    return 'FORCE_MAJEURE_OR_MATERNITY_ART87';
  }
  if (txt.includes('85') || txt.includes('استقالة')) {
    return 'RESIGNATION_ART85';
  }
  return 'CONTRACT_EXPIRY_OR_EMPLOYER_ART84';
}

export function calculateJisrFinalSettlement(
  input: JisrFinalSettlementInput
): JisrFinalSettlementResult {
  const basic = Math.max(0, input.basicSalary);
  const housing = Math.max(0, input.housingAllowance);
  const transport = Math.max(0, input.transportAllowance);
  const other = Math.max(0, input.otherAllowances || 0);
  const totalMonthlyWage = basic + housing + transport + other;

  const startMs = new Date(`${String(input.hireDate).slice(0, 10)}T00:00:00Z`).getTime();
  const endMs = new Date(`${String(input.lastWorkingDay).slice(0, 10)}T00:00:00Z`).getTime();
  const rawDays =
    !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs
      ? Math.floor((endMs - startMs) / 86_400_000) + 1
      : 365;

  const serviceYears = Math.round((rawDays / 365.25) * 10000) / 10000;
  const serviceYearsWhole = Math.floor(serviceYears);
  const serviceMonthsRemainder = Math.round((serviceYears - serviceYearsWhole) * 12);

  // Art. 84 base calculation: 0.5 month for first 5 years + 1.0 month beyond 5 years
  const firstFiveYears = Math.min(5, serviceYears);
  const beyondFiveYears = Math.max(0, serviceYears - 5);
  const fullStatutoryEosb =
    Math.round((firstFiveYears * 0.5 * totalMonthlyWage + beyondFiveYears * 1.0 * totalMonthlyWage) * 100) /
    100;

  let eosbRatioApplied = 1;
  let eosbLegalReferenceAr = 'المادة 84 — استحقاق كامل (100%) لانتهاء مدة العقد أو الإنهاء النظامي';

  if (input.separationType === 'DISCIPLINARY_ART80') {
    eosbRatioApplied = 0;
    eosbLegalReferenceAr = 'المادة 80 — فسخ العقد لمخالفة جسيمة دون مكافأة نهاية خدمة (0%)';
  } else if (input.separationType === 'FORCE_MAJEURE_OR_MATERNITY_ART87') {
    eosbRatioApplied = 1;
    eosbLegalReferenceAr = 'المادة 87 — استحقاق كامل (100%) للقوة القاهرة أو استقالة الزواج/الوضع نظاماً';
  } else if (input.separationType === 'RESIGNATION_ART85') {
    if (serviceYears < 2) {
      eosbRatioApplied = 0;
      eosbLegalReferenceAr = 'المادة 85 — استقالة قبل إتمام سنتين خدمة (0%)';
    } else if (serviceYears < 5) {
      eosbRatioApplied = 1 / 3;
      eosbLegalReferenceAr = 'المادة 85 — استقالة بين سنتين وأقل من 5 سنوات (ثلث المكافأة 33.33%)';
    } else if (serviceYears < 10) {
      eosbRatioApplied = 2 / 3;
      eosbLegalReferenceAr = 'المادة 85 — استقالة بين 5 وأقل من 10 سنوات (ثلثا المكافأة 66.67%)';
    } else {
      eosbRatioApplied = 1;
      eosbLegalReferenceAr = 'المادة 85 — استقالة بعد إتمام 10 سنوات فأكثر (كامل المكافأة 100%)';
    }
  }

  const netEosbEntitlement = Math.round(fullStatutoryEosb * eosbRatioApplied * 100) / 100;

  // Pro-rata current month net pay
  const parsedLastDayOfMonth = Number(String(input.lastWorkingDay).slice(8, 10));
  const earnedCurrentMonthDays =
    input.earnedCurrentMonthDays !== undefined
      ? Math.min(30, Math.max(0, input.earnedCurrentMonthDays))
      : Math.min(30, Math.max(0, Number.isFinite(parsedLastDayOfMonth) ? parsedLastDayOfMonth : 0));

  const gosiBase = Math.min(45_000, basic + housing);
  const fullMonthEmpGosi = input.isSaudi ? gosiBase * 0.0975 : 0;
  const fullMonthNetAfterGosi = Math.max(0, totalMonthlyWage - fullMonthEmpGosi);
  const proRataCurrentMonthNet =
    Math.round(((fullMonthNetAfterGosi * earnedCurrentMonthDays) / 30) * 100) / 100;

  // Art. 111 unused annual leave compensation on actual gross wage
  const unusedLeaveCompensation =
    Math.round((Math.max(0, input.unusedLeaveDays) * (totalMonthlyWage / 30)) * 100) / 100;

  const pendingOvertimeAndRewards =
    Math.round(Math.max(0, input.pendingOvertimeAndRewards || 0) * 100) / 100;
  const unusedTicketCompensation =
    Math.round(Math.max(0, input.unusedTicketCompensation || 0) * 100) / 100;

  const totalEntitlements =
    Math.round(
      (netEosbEntitlement +
        proRataCurrentMonthNet +
        unusedLeaveCompensation +
        pendingOvertimeAndRewards +
        unusedTicketCompensation) *
        100
    ) / 100;

  const remainingAdvancesBalance =
    Math.round(Math.max(0, input.remainingAdvancesBalance || 0) * 100) / 100;
  const unsettledEwaBalance =
    Math.round(Math.max(0, input.unsettledEwaBalance || 0) * 100) / 100;
  const pendingSanctionsOrCustodyDeductions =
    Math.round(Math.max(0, input.pendingSanctionsOrCustodyDeductions || 0) * 100) / 100;

  const totalDeductions =
    Math.round(
      (remainingAdvancesBalance +
        unsettledEwaBalance +
        pendingSanctionsOrCustodyDeductions) *
        100
    ) / 100;

  const netPayable = Math.round((totalEntitlements - totalDeductions) * 100) / 100;

  return {
    serviceYears: Math.round(serviceYears * 100) / 100,
    serviceYearsWhole,
    serviceMonthsRemainder,
    totalMonthlyWage,
    fullStatutoryEosb,
    eosbRatioApplied: Math.round(eosbRatioApplied * 10000) / 10000,
    netEosbEntitlement,
    eosbLegalReferenceAr,
    earnedCurrentMonthDays,
    proRataCurrentMonthNet,
    unusedLeaveCompensation,
    pendingOvertimeAndRewards,
    unusedTicketCompensation,
    totalEntitlements,
    remainingAdvancesBalance,
    unsettledEwaBalance,
    pendingSanctionsOrCustodyDeductions,
    totalDeductions,
    netPayable,
    requiresEmployeeReimbursement: netPayable < 0,
  };
}

// ============================================================================
// 9. EMPLOYEE 360° PROFILE COMPLETENESS ENGINE (Jisr / Qiwa / WPS / GOSI / CCHI)
// ============================================================================

export interface Employee360CompletenessResult {
  scorePercent: number;
  completedCount: number;
  totalChecks: number;
  readinessTierAr: 'مكتمل وممتثل 100%' | 'جاهزية عالية' | 'يحتاج استكمال بيانات';
  missingFieldsAr: string[];
}

export function computeEmployee360Completeness(
  emp: Record<string, unknown>
): Employee360CompletenessResult {
  const checks: Array<{ ok: boolean; labelAr: string }> = [
    {
      ok: Boolean(String(emp.name || '').trim()) && Boolean(String(emp.name_en || '').trim()),
      labelAr: 'الاسم الرباعي بالعربية والإنجليزية',
    },
    {
      ok: /^\d{10}$/.test(String(emp.national_id || '').trim()),
      labelAr: 'رقم الهوية الوطنية / الإقامة (10 أرقام)',
    },
    {
      ok: Boolean(String(emp.iqama_expiry || '').trim()),
      labelAr: 'تاريخ انتهاء الهوية / الإقامة',
    },
    {
      ok: Boolean(String(emp.job_title || emp.role || '').trim()) && Boolean(String(emp.department || '').trim()),
      labelAr: 'المسمى الوظيفي والقسم',
    },
    {
      ok: Boolean(String(emp.manager_id || '').trim()),
      labelAr: 'المدير المباشر في الهيكل التنظيمي',
    },
    {
      ok: Boolean(String(emp.hire_date || '').trim()),
      labelAr: 'تاريخ المباشرة الفعلي',
    },
    {
      ok: Boolean(String(emp.qiwa_contract_no || '').trim()) && Boolean(String(emp.qiwa_contract_expiry || '').trim()),
      labelAr: 'رقم وتاريخ عقد منصة قوى الموحد',
    },
    {
      ok: Boolean(String(emp.gosi_number || '').trim()),
      labelAr: 'رقم اشتراك التأمينات الاجتماعية (GOSI)',
    },
    {
      ok:
        Boolean(String(emp.medical_insurance_provider || '').trim()) &&
        Boolean(String(emp.medical_insurance_expiry || '').trim()),
      labelAr: 'وثيقة التأمين الطبي ومجلس الضمان الصحي',
    },
    {
      ok: /^SA[A-Z0-9]{22}$/i.test(String(emp.iban || '').replace(/\s+/g, '')),
      labelAr: 'رقم الآيبان البنكي السعودي (24 خانة SA) لحماية الأجور WPS',
    },
    {
      ok: Number(emp.basic_salary || emp.salary || 0) > 0,
      labelAr: 'تفصيل الأجر الأساسي والبدلات',
    },
    {
      ok: Boolean(String(emp.phone || '').trim()) && Boolean(String(emp.email || '').trim()),
      labelAr: 'الجوال الموثق والبريد الإلكتروني الرسمي',
    },
    {
      ok:
        Boolean(String(emp.emergency_contact_name || '').trim()) &&
        Boolean(String(emp.emergency_contact_phone || '').trim()),
      labelAr: 'بيانات التواصل في حالات الطوارئ',
    },
    {
      ok: Boolean(String(emp.national_address || '').trim()),
      labelAr: 'العنوان الوطني المسجل (سبل)',
    },
  ];

  const completedCount = checks.filter((c) => c.ok).length;
  const totalChecks = checks.length;
  const scorePercent = Math.round((completedCount / totalChecks) * 100);
  const missingFieldsAr = checks.filter((c) => !c.ok).map((c) => c.labelAr);

  const readinessTierAr =
    scorePercent === 100
      ? 'مكتمل وممتثل 100%'
      : scorePercent >= 80
      ? 'جاهزية عالية'
      : 'يحتاج استكمال بيانات';

  return {
    scorePercent,
    completedCount,
    totalChecks,
    readinessTierAr,
    missingFieldsAr,
  };
}

// ============================================================================
// 10. JISR PAYROLL CUTOFF CALENDAR & RETROACTIVE PAY ENGINE (تاريخ القطع والأثر الرجعي)
// ============================================================================

export interface PayrollCutoffEvaluationResult {
  eventDate: string;
  cutoffDayOfMonth: number;
  cutoffDateIso: string;
  includedInCurrentMonth: boolean;
  effectivePayrollMonth: string; // YYYY-MM
  statusLabelAr: string;
}

/**
 * Evaluates whether an attendance/overtime/deduction event falls within the current
 * month's payroll cutoff window (e.g., day 25) or rolls over automatically to next month.
 */
export function evaluatePayrollCutoffWindow(params: {
  eventDateIso: string; // YYYY-MM-DD
  cutoffDayOfMonth?: number; // default 25
}): PayrollCutoffEvaluationResult {
  const cleanDate = (params.eventDateIso || new Date().toISOString()).slice(0, 10);
  const cutoffDayOfMonth = Math.min(30, Math.max(15, Math.floor(params.cutoffDayOfMonth ?? 25)));
  const [yrStr, moStr, dyStr] = cleanDate.split('-');
  const yr = Number(yrStr) || 2026;
  const mo = Number(moStr) || 1;
  const dy = Number(dyStr) || 1;

  const paddedMonth = String(mo).padStart(2, '0');
  const paddedCutoff = String(cutoffDayOfMonth).padStart(2, '0');
  const cutoffDateIso = `${yr}-${paddedMonth}-${paddedCutoff}`;
  const currentYm = `${yr}-${paddedMonth}`;

  if (dy <= cutoffDayOfMonth) {
    return {
      eventDate: cleanDate,
      cutoffDayOfMonth,
      cutoffDateIso,
      includedInCurrentMonth: true,
      effectivePayrollMonth: currentYm,
      statusLabelAr: `ضمن فترة المسير الحالي (${currentYm}) — قبل يوم القطع (${cutoffDayOfMonth})`,
    };
  }

  const nextMonthNum = mo === 12 ? 1 : mo + 1;
  const nextYearNum = mo === 12 ? yr + 1 : yr;
  const nextYm = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}`;

  return {
    eventDate: cleanDate,
    cutoffDayOfMonth,
    cutoffDateIso,
    includedInCurrentMonth: false,
    effectivePayrollMonth: nextYm,
    statusLabelAr: `مرحّل تلقائياً إلى مسير الشهر القادم (${nextYm}) لوقوعه بعد يوم القطع (${cutoffDayOfMonth})`,
  };
}

export interface RetroactivePayInput {
  reasonType: 'PROMOTION_DIFF' | 'MID_MONTH_JOIN' | 'POST_CUTOFF_ROLLOVER';
  previousMonthlyGross: number;
  newMonthlyGross: number;
  effectiveDays: number; // e.g., 15 days retroactive or 45 days across 1.5 months
}

export interface RetroactivePayResult {
  dailyDifference: number;
  effectiveDays: number;
  retroactivePayableAmount: number;
  explanationAr: string;
}

/**
 * Calculates retroactive salary adjustments (فروقات الرواتب بأثر رجعي) for promotions,
 * delayed salary increments, or mid-month joiners after payroll cutoff.
 */
export function calculateRetroactivePayAdjustment(
  input: RetroactivePayInput
): RetroactivePayResult {
  const prevGross = Math.max(0, input.previousMonthlyGross);
  const newGross = Math.max(0, input.newMonthlyGross);
  const days = Math.max(0, Math.floor(input.effectiveDays));

  if (input.reasonType === 'MID_MONTH_JOIN') {
    const dailyRate = newGross / 30;
    const retroactivePayableAmount = Math.round(dailyRate * days * 100) / 100;
    return {
      dailyDifference: Math.round(dailyRate * 100) / 100,
      effectiveDays: days,
      retroactivePayableAmount,
      explanationAr: `أثر رجعي لمباشرة موظف جديد بعد تاريخ القطع بعدد (${days} يوم عمل) × ⃁ ${(
        Math.round(dailyRate * 100) / 100
      ).toLocaleString()} يومياً.`,
    };
  }

  const monthlyDiff = Math.max(0, newGross - prevGross);
  const dailyDifference = Math.round((monthlyDiff / 30) * 100) / 100;
  const retroactivePayableAmount = Math.round(((monthlyDiff * days) / 30) * 100) / 100;

  return {
    dailyDifference,
    effectiveDays: days,
    retroactivePayableAmount,
    explanationAr: `فروقات تعديل راتب / ترقية بأثر رجعي لعدد (${days} يوماً) بفرق شهري ⃁ ${monthlyDiff.toLocaleString()}.`,
  };
}

// ============================================================================
// 11. DEPARTMENT LEAVE QUOTA GATE, REPLACEMENT HANDOVER & CONTRACT AIR TICKETS
// ============================================================================

export interface LeaveQuotaAndReplacementResult {
  allowed: boolean;
  departmentHeadcount: number;
  concurrentOnLeaveCount: number;
  projectedLeavePercent: number;
  maxAllowedPercent: number;
  replacementValid: boolean;
  blockingReasonAr?: string;
  advisoryAr: string;
}

export function evaluateLeaveQuotaAndReplacement(params: {
  employeeId: string;
  department: string;
  startDate: string;
  endDate: string;
  departmentEmployeesCount: number;
  existingDepartmentLeaves: Array<{
    employee_id?: string;
    from_date?: string;
    to_date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }>;
  maxConcurrentPercent?: number; // default 25%
  requireReplacementColleague?: boolean;
  replacementEmployeeId?: string;
  replacementConfirmed?: boolean;
}): LeaveQuotaAndReplacementResult {
  const maxAllowedPercent = params.maxConcurrentPercent ?? 25;
  const headcount = Math.max(1, params.departmentEmployeesCount);

  if (params.requireReplacementColleague) {
    if (
      !params.replacementEmployeeId ||
      params.replacementEmployeeId.trim() === '' ||
      params.replacementEmployeeId === params.employeeId ||
      params.replacementConfirmed === false
    ) {
      return {
        allowed: false,
        departmentHeadcount: headcount,
        concurrentOnLeaveCount: 0,
        projectedLeavePercent: 0,
        maxAllowedPercent,
        replacementValid: false,
        blockingReasonAr:
          'يتطلب نظام جسر تحديد زميل بديل مختلف داخل القسم وتأكيد استلامه للمهام قبل رفع طلب الإجازة.',
        advisoryAr: 'يرجى اختيار الموظف البديل لاستلام العهد والمهام التشغيلية.',
      };
    }
  }

  const reqStart = params.startDate.slice(0, 10);
  const reqEnd = (params.endDate || params.startDate).slice(0, 10);

  const overlappingEmpIds = new Set<string>();
  for (const lv of params.existingDepartmentLeaves || []) {
    const st = String(lv.status || '');
    if (st.includes('مرفوض') || st.includes('ملغ')) continue;
    const empKey = String(lv.employee_id || '');
    if (empKey && empKey === params.employeeId) continue;

    const lvFrom = String(lv.from_date || lv.start_date || '').slice(0, 10);
    const lvTo = String(lv.to_date || lv.end_date || lvFrom).slice(0, 10);
    if (!lvFrom) continue;

    if (lvFrom <= reqEnd && lvTo >= reqStart) {
      overlappingEmpIds.add(empKey || `LV-${lvFrom}`);
    }
  }

  const concurrentOnLeaveCount = overlappingEmpIds.size;
  const projectedLeavePercent =
    Math.round((((concurrentOnLeaveCount + 1) / headcount) * 100) * 100) / 100;

  if (headcount >= 4 && projectedLeavePercent > maxAllowedPercent) {
    return {
      allowed: false,
      departmentHeadcount: headcount,
      concurrentOnLeaveCount,
      projectedLeavePercent,
      maxAllowedPercent,
      replacementValid: true,
      blockingReasonAr: `تجاوز سقف الإجازات المتزامنة في قسم (${params.department}): النسبة المتوقعة (${projectedLeavePercent}%) تتخطى الحد الأقصى المسموح (${maxAllowedPercent}%).`,
      advisoryAr: `يوجد حالياً (${concurrentOnLeaveCount}) زملاء مجازين في نفس الفترة من أصل (${headcount}).`,
    };
  }

  return {
    allowed: true,
    departmentHeadcount: headcount,
    concurrentOnLeaveCount,
    projectedLeavePercent,
    maxAllowedPercent,
    replacementValid: true,
    advisoryAr: `نسبة الإجازات المتزامنة في القسم (${projectedLeavePercent}% من أصل سقف ${maxAllowedPercent}%) — مستوفٍ لشروط التغطية.`,
  };
}

export interface FamilyAirTicketEntitlementResult {
  contractStatus: 'SINGLE' | 'FAMILY';
  adultTicketsCount: number;
  childTicketsCount: number;
  baseAdultFare: number;
  childFareRate: number; // 75% of adult fare
  totalAnnualEntitlementAmount: number;
  fulfillmentMode: 'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE';
  summaryAr: string;
}

export function calculateFamilyAirTicketEntitlement(params: {
  contractStatus: 'SINGLE' | 'FAMILY';
  baseAdultTicketFare: number;
  hasEligibleSpouse?: boolean;
  eligibleChildrenUnder18Count?: number;
  maxCoveredChildren?: number; // default 2 per standard Saudi corporate policy
  fulfillmentMode?: 'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE';
}): FamilyAirTicketEntitlementResult {
  const baseAdultFare = Math.max(0, params.baseAdultTicketFare);
  const childFareRate = Math.round(baseAdultFare * 0.75 * 100) / 100;
  const fulfillmentMode = params.fulfillmentMode || 'TRAVEL_AGENCY_ORDER';

  if (params.contractStatus === 'SINGLE') {
    return {
      contractStatus: 'SINGLE',
      adultTicketsCount: 1,
      childTicketsCount: 0,
      baseAdultFare,
      childFareRate,
      totalAnnualEntitlementAmount: baseAdultFare,
      fulfillmentMode,
      summaryAr: `عقد فردي (تذكرة واحدة للموظف) — إجمالي الاستحقاق السنوي: ⃁ ${baseAdultFare.toLocaleString()} (${
        fulfillmentMode === 'TRAVEL_AGENCY_ORDER' ? 'أمر إركاب وكالة سفر' : 'بدل نقدي'
      }).`,
    };
  }

  const maxKids = params.maxCoveredChildren ?? 2;
  const adultTicketsCount = 1 + (params.hasEligibleSpouse !== false ? 1 : 0);
  const childTicketsCount = Math.min(
    maxKids,
    Math.max(0, Math.floor(params.eligibleChildrenUnder18Count ?? 0))
  );

  const totalAnnualEntitlementAmount =
    Math.round((adultTicketsCount * baseAdultFare + childTicketsCount * childFareRate) * 100) / 100;

  return {
    contractStatus: 'FAMILY',
    adultTicketsCount,
    childTicketsCount,
    baseAdultFare,
    childFareRate,
    totalAnnualEntitlementAmount,
    fulfillmentMode,
    summaryAr: `عقد عائلي (${adultTicketsCount} بالغ + ${childTicketsCount} أبناء دون 18 عاماً بسعر 75%) — إجمالي الاستحقاق السنوي: ⃁ ${totalAnnualEntitlementAmount.toLocaleString()}.`,
  };
}
