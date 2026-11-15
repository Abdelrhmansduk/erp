/**
 * Enterprise Cards, Leave Rollover/Encashment & Time Cutoff Engine:
 *   1. Corporate Spend Cards (Virtual/Physical, Daily/Monthly Limits, MCC allowlist, Freeze/Unfreeze, ZATCA QR + GL)
 *   2. Attendance Cut-Off Period Resolver (e.g., 25th -> 24th) & Monthly Permission Hours Quota Bucket
 *   3. Real-Time Biometric Cloud Push (ZKTeco ADMS ATTLOG parser + SHA-256-like deduplication)
 *   4. Year-End Leave Carryover & Forfeiture Cap + In-Service Leave Encashment with Balanced GL
 */

import { realErpDataStore } from './realErpDataStore';
import { journalEngine } from './accounting/journalEngine';
import {
  decodeZatcaQrTlvBase64,
  computeReceiptFingerprint,
} from './jisrAdvancedComplianceEngine';
import { syncEmployeeLeaveBalanceAcrossTables } from './hrLeaveLifecycleService';

type CompanyCode = Parameters<typeof journalEngine.createJournalEntry>[0];

export interface CorporateCardRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  card_holder_name: string;
  card_type: 'VIRTUAL' | 'PHYSICAL';
  last_four: string;
  masked_pan: string;
  daily_limit_sar: number;
  monthly_limit_sar: number;
  spent_today_sar: number;
  spent_month_sar: number;
  allowed_mccs: string[];
  status: 'ACTIVE' | 'FROZEN' | 'CANCELLED';
  cost_center: string;
  issued_at: string;
  updated_at: string;
}

export type CardTxStatus =
  | 'APPROVED'
  | 'DECLINED_LIMIT'
  | 'DECLINED_MCC'
  | 'DECLINED_FROZEN'
  | 'DECLINED_DUPLICATE_QR';

export interface CorporateCardTxRecord {
  id: string;
  company_id: string;
  card_id: string;
  employee_id: string;
  employee_name: string;
  merchant_name: string;
  merchant_vat_number?: string;
  mcc: string;
  gross_amount_sar: number;
  net_amount_sar: number;
  vat_amount_sar: number;
  expense_gl_code: string;
  zatca_qr_raw?: string;
  receipt_fingerprint?: string;
  authorization_status: CardTxStatus;
  decline_reason?: string;
  journal_entry_id?: string;
  transacted_at: string;
  created_at: string;
}

export interface AttendanceCutoffPolicy {
  id: string;
  company_id: string;
  cutoff_start_day: number; // e.g., 25
  cutoff_end_day: number; // e.g., 24
  monthly_permission_hours_quota: number; // e.g., 4
  max_single_permission_hours: number;
  auto_deduct_over_quota: boolean;
  updated_at: string;
}

export interface AttendanceCutoffWindow {
  payrollMonth: string;
  startDateIso: string;
  endDateIso: string;
  totalDays: number;
  labelAr: string;
}

export interface PermissionQuotaEvaluation {
  monthlyQuotaHours: number;
  usedHoursBefore: number;
  requestedHours: number;
  remainingQuotaBefore: number;
  coveredByQuotaHours: number;
  excessHours: number;
  exceededQuota: boolean;
  hourlyRateSar: number;
  excessDeductionSar: number;
}

export interface AdmsPunchEventRecord {
  id: string;
  company_id: string;
  device_sn: string;
  employee_pin: string;
  employee_id?: string;
  employee_name?: string;
  punch_timestamp: string;
  punch_state: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT';
  verify_mode: string;
  dedup_hash: string;
  synced_to_attendance: boolean;
  raw_payload?: string;
  received_at: string;
}

export interface LeaveCarryoverEmployeeResult {
  employeeId: string;
  employeeName: string;
  balanceBefore: number;
  carriedForwardDays: number;
  forfeitedDays: number;
}

export interface LeaveCarryoverRunRecord {
  id: string;
  company_id: string;
  fiscal_year: number;
  max_carryover_cap_days: number;
  employee_count: number;
  total_carried_days: number;
  total_forfeited_days: number;
  details_json: LeaveCarryoverEmployeeResult[];
  executed_by: string;
  executed_at: string;
}

export interface LeaveEncashmentRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  days_encashed: number;
  daily_rate_sar: number;
  total_payout_sar: number;
  remaining_balance_after: number;
  status: 'PENDING' | 'POSTED' | 'PAID';
  journal_entry_id?: string;
  encashed_at: string;
}

function toHalalas(sar: number): number {
  return Math.round((Number(sar) || 0) * 100);
}

function fromHalalas(halalas: number): number {
  return Number((halalas / 100).toFixed(2));
}

function normalizeCompanyCode(companyId: string): CompanyCode {
  const upper = (companyId || 'SAF').toUpperCase();
  if (upper === 'YAQ' || upper === 'TOP' || upper === 'KAS' || upper === 'DAR') {
    return upper;
  }
  return 'SAF';
}

function fnv1aHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 1. Issue Corporate Expense Card (Virtual / Physical)
 */
export async function issueCorporateCard(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  cardHolderName?: string;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  dailyLimitSar: number;
  monthlyLimitSar: number;
  allowedMccs?: string[];
  costCenter?: string;
}): Promise<CorporateCardRecord> {
  const companyCode = normalizeCompanyCode(params.companyId);
  const rand4 = String(Math.floor(1000 + (Date.now() % 9000)));
  const nowIso = new Date().toISOString();
  const card: CorporateCardRecord = {
    id: `CARD-${companyCode}-${rand4}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    company_id: companyCode,
    employee_id: params.employeeId,
    employee_name: params.employeeName,
    card_holder_name: params.cardHolderName || params.employeeName,
    card_type: params.cardType,
    last_four: rand4,
    masked_pan: `4532 •••• •••• ${rand4}`,
    daily_limit_sar: Math.max(100, Number(params.dailyLimitSar) || 1500),
    monthly_limit_sar: Math.max(100, Number(params.monthlyLimitSar) || 15000),
    spent_today_sar: 0,
    spent_month_sar: 0,
    allowed_mccs: params.allowedMccs || [],
    status: 'ACTIVE',
    cost_center: params.costCenter || 'CC-HQ-01',
    issued_at: nowIso,
    updated_at: nowIso,
  };

  await realErpDataStore.addRecord<CorporateCardRecord>('hr_corporate_cards', card);
  return card;
}

export async function toggleCorporateCardFreeze(
  card: CorporateCardRecord,
  targetStatus?: 'ACTIVE' | 'FROZEN'
): Promise<CorporateCardRecord> {
  const nextStatus = targetStatus || (card.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE');
  const updatedAt = new Date().toISOString();
  await realErpDataStore.updateRecord<CorporateCardRecord>('hr_corporate_cards', card.id, {
    status: nextStatus,
    updated_at: updatedAt,
  });
  return { ...card, status: nextStatus, updated_at: updatedAt };
}

/**
 * Authorize corporate card transaction with Limit + MCC + Freeze + ZATCA QR Duplicate Guard + Balanced GL Posting
 */
export async function authorizeAndRecordCardSpend(params: {
  card: CorporateCardRecord;
  merchantName: string;
  mcc: string;
  grossAmountSar: number;
  hasVat15?: boolean;
  zatcaQrRaw?: string;
  entryDateIso?: string;
  expenseGlCode?: string;
  existingTransactions?: CorporateCardTxRecord[];
}): Promise<{ approved: boolean; transaction: CorporateCardTxRecord; updatedCard: CorporateCardRecord }> {
  const companyCode = normalizeCompanyCode(params.card.company_id);
  const nowIso = new Date().toISOString();
  const postingDate = (params.entryDateIso || nowIso).slice(0, 10);

  let effectiveMerchant = params.merchantName.trim() || 'مورد نقاط بيع';
  let merchantVatNo: string | undefined;
  let grossSar = Math.max(0, Number(params.grossAmountSar) || 0);
  let vatSar = 0;
  let receiptFingerprint: string | undefined;

  if (params.zatcaQrRaw && params.zatcaQrRaw.trim().length > 16) {
    const decoded = decodeZatcaQrTlvBase64(params.zatcaQrRaw.trim());
    if (decoded.valid) {
      effectiveMerchant = decoded.sellerName || effectiveMerchant;
      merchantVatNo = decoded.vatRegistrationNumber;
      grossSar = decoded.totalWithVat > 0 ? decoded.totalWithVat : grossSar;
      vatSar = decoded.vatAmount;
      receiptFingerprint = decoded.receiptFingerprint;
    }
  }

  const grossH = toHalalas(grossSar);
  let vatH = toHalalas(vatSar);
  if (vatH === 0 && (params.hasVat15 ?? true)) {
    const netCalcH = Math.round(grossH / 1.15);
    vatH = grossH - netCalcH;
  }
  const netH = grossH - vatH;
  const netSar = fromHalalas(netH);
  vatSar = fromHalalas(vatH);
  grossSar = fromHalalas(grossH);

  if (!receiptFingerprint && grossH > 0) {
    receiptFingerprint = computeReceiptFingerprint(
      merchantVatNo || effectiveMerchant,
      postingDate,
      grossSar
    );
  }

  const existingList =
    params.existingTransactions ||
    (await realErpDataStore.getRecords<CorporateCardTxRecord>('hr_corporate_card_transactions', []));

  let authStatus: CardTxStatus = 'APPROVED';
  let declineReason: string | undefined;

  if (params.card.status !== 'ACTIVE') {
    authStatus = 'DECLINED_FROZEN';
    declineReason = 'البطاقة مجمدة أو ملغاة حالياً ولا تقبل عمليات الصرف.';
  } else if (
    params.card.allowed_mccs.length > 0 &&
    !params.card.allowed_mccs.includes(params.mcc.trim())
  ) {
    authStatus = 'DECLINED_MCC';
    declineReason = `تصنيف التاجر (MCC ${params.mcc}) غير مدرج ضمن الفئات المصرح بها للبطاقة.`;
  } else if (
    toHalalas(params.card.spent_today_sar) + grossH > toHalalas(params.card.daily_limit_sar) ||
    toHalalas(params.card.spent_month_sar) + grossH > toHalalas(params.card.monthly_limit_sar)
  ) {
    authStatus = 'DECLINED_LIMIT';
    declineReason = 'العملية تتجاوز الحد اليومي أو الشهري المعتمد للبطاقة.';
  } else if (
    params.zatcaQrRaw &&
    receiptFingerprint &&
    existingList.some(
      (tx) =>
        tx.authorization_status === 'APPROVED' &&
        tx.receipt_fingerprint === receiptFingerprint
    )
  ) {
    authStatus = 'DECLINED_DUPLICATE_QR';
    declineReason = `فاتورة ZATCA الضريبية مكررة مسبقاً بالبصمة (${receiptFingerprint}).`;
  }

  let journalEntryId: string | undefined;
  let updatedCard = { ...params.card };
  const glCode = params.expenseGlCode || '530201';

  if (authStatus === 'APPROVED' && grossH > 0) {
    const lines = [
      {
        accountCode: glCode,
        accountName: 'مصروفات تشغيلية وتقنية عبر بطاقات الشركة',
        debit: netSar,
        credit: 0,
        costCenterCode: params.card.cost_center || 'CC-HQ-01',
        description: `شراء ببطاقة (${params.card.masked_pan}) لدى ${effectiveMerchant} [MCC ${params.mcc}]`,
      },
    ];

    if (vatH > 0) {
      lines.push({
        accountCode: '110801',
        accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (15%)',
        debit: vatSar,
        credit: 0,
        costCenterCode: params.card.cost_center || 'CC-HQ-01',
        description: `ضريبة مدخلات فاتورة بطاقة (${effectiveMerchant})`,
      });
    }

    lines.push({
      accountCode: '110201',
      accountName: 'مصرف الراجحي - حساب تسوية البطاقات المؤسسية',
      debit: 0,
      credit: grossSar,
      costCenterCode: params.card.cost_center || 'CC-HQ-01',
      description: `تسوية فورية لبطاقة الموظف ${params.card.employee_name}`,
    });

    const jeResult = journalEngine.createJournalEntry(companyCode, {
      entryDate: postingDate,
      entryType: 'AUTOMATIC',
      sourceModule: 'EXPENSE_CARD',
      sourceReference: `CARDTX-${params.card.last_four}-${Date.now().toString().slice(-4)}`,
      description: `مصروف بطاقة شركة (${params.card.masked_pan}) — ${effectiveMerchant}`,
      costCenterCode: params.card.cost_center || 'CC-HQ-01',
      createdBy: params.card.employee_name,
      autoPost: true,
      lines,
    });

    if (jeResult.error || !jeResult.entry) {
      throw new Error(jeResult.error || 'تعذر ترحيل قيد مصروفات بطاقة الشركة.');
    }
    const je = jeResult.entry;

    journalEntryId = je.id;
    updatedCard = {
      ...params.card,
      spent_today_sar: fromHalalas(toHalalas(params.card.spent_today_sar) + grossH),
      spent_month_sar: fromHalalas(toHalalas(params.card.spent_month_sar) + grossH),
      updated_at: nowIso,
    };

    await realErpDataStore.updateRecord<CorporateCardRecord>('hr_corporate_cards', params.card.id, {
      spent_today_sar: updatedCard.spent_today_sar,
      spent_month_sar: updatedCard.spent_month_sar,
      updated_at: nowIso,
    });

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-card-${Date.now().toString().slice(-6)}`,
      company_id: companyCode,
      ref_no: je.entryNumber,
      date: postingDate,
      branch: 'المركز المالي الرئيسي',
      description: `مصروف بطاقة مؤسسية (${params.card.last_four}) لدى ${effectiveMerchant}`,
      debit_account: `${glCode} مصروفات بطاقات الشركة`,
      credit_account: '110201 مصرف الراجحي (تسوية البطاقات)',
      amount: grossSar,
      status: 'مُرحّل آلياً',
    });
  }

  const txRecord: CorporateCardTxRecord = {
    id: `CTX-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
    company_id: companyCode,
    card_id: params.card.id,
    employee_id: params.card.employee_id,
    employee_name: params.card.employee_name,
    merchant_name: effectiveMerchant,
    merchant_vat_number: merchantVatNo,
    mcc: params.mcc,
    gross_amount_sar: grossSar,
    net_amount_sar: netSar,
    vat_amount_sar: vatSar,
    expense_gl_code: glCode,
    zatca_qr_raw: params.zatcaQrRaw,
    receipt_fingerprint: receiptFingerprint,
    authorization_status: authStatus,
    decline_reason: declineReason,
    journal_entry_id: journalEntryId,
    transacted_at: nowIso,
    created_at: nowIso,
  };

  await realErpDataStore.addRecord<CorporateCardTxRecord>('hr_corporate_card_transactions', txRecord);

  return {
    approved: authStatus === 'APPROVED',
    transaction: txRecord,
    updatedCard,
  };
}

/**
 * 2. Attendance Cut-Off Period Resolver (e.g., 25th -> 24th) & Monthly Permission Hours Quota
 */
export function resolveAttendanceCutoffWindow(
  payrollMonth: string, // YYYY-MM
  cutoffStartDay = 25,
  cutoffEndDay = 24
): AttendanceCutoffWindow {
  const [yRaw, mRaw] = payrollMonth.split('-').map(Number);
  const year = yRaw || 2026;
  const month = mRaw || 8;

  let startYear = year;
  let startMonth = month;
  if (cutoffStartDay > cutoffEndDay) {
    startMonth -= 1;
    if (startMonth <= 0) {
      startMonth = 12;
      startYear -= 1;
    }
  }

  const maxStartMonthDays = new Date(Date.UTC(startYear, startMonth, 0)).getUTCDate();
  const clampedStartDay = Math.min(Math.max(1, cutoffStartDay), maxStartMonthDays);

  const maxEndMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const clampedEndDay = Math.min(Math.max(1, cutoffEndDay), maxEndMonthDays);

  const startDate = new Date(Date.UTC(startYear, startMonth - 1, clampedStartDay));
  const endDate = new Date(Date.UTC(year, month - 1, clampedEndDay));

  const startDateIso = startDate.toISOString().slice(0, 10);
  const endDateIso = endDate.toISOString().slice(0, 10);
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);

  return {
    payrollMonth,
    startDateIso,
    endDateIso,
    totalDays,
    labelAr: `فترة الإقفال (${startDateIso} ← ${endDateIso} | ${totalDays} يوماً)`,
  };
}

export function evaluatePermissionQuotaBucket(params: {
  monthlyQuotaHours: number;
  usedHoursThisCutoff: number;
  requestedHours: number;
  monthlyGrossSalarySar: number;
}): PermissionQuotaEvaluation {
  const quota = Math.max(0, Number(params.monthlyQuotaHours) || 0);
  const usedBefore = Math.max(0, Number(params.usedHoursThisCutoff) || 0);
  const requested = Math.max(0, Number(params.requestedHours) || 0);
  const remainingBefore = Number(Math.max(0, quota - usedBefore).toFixed(2));
  const covered = Number(Math.min(requested, remainingBefore).toFixed(2));
  const excess = Number(Math.max(0, requested - covered).toFixed(2));
  const hourlyRate = Number((Math.max(0, params.monthlyGrossSalarySar) / 240).toFixed(2));
  const deductionHalalas = Math.round(excess * toHalalas(hourlyRate));

  return {
    monthlyQuotaHours: quota,
    usedHoursBefore: usedBefore,
    requestedHours: requested,
    remainingQuotaBefore: remainingBefore,
    coveredByQuotaHours: covered,
    excessHours: excess,
    exceededQuota: excess > 0,
    hourlyRateSar: hourlyRate,
    excessDeductionSar: fromHalalas(deductionHalalas),
  };
}

/**
 * 3. Real-Time ZKTeco ADMS / BioTime ATTLOG Parser & Deduplicated Ingestion
 */
const ADMS_STATE_MAP: Record<string, AdmsPunchEventRecord['punch_state']> = {
  '0': 'CHECK_IN',
  '1': 'CHECK_OUT',
  '2': 'BREAK_OUT',
  '3': 'BREAK_IN',
  '4': 'OVERTIME_IN',
  '5': 'OVERTIME_OUT',
};

const ADMS_VERIFY_MAP: Record<string, string> = {
  '0': 'PASSWORD',
  '1': 'FINGERPRINT',
  '2': 'RFID_CARD',
  '15': 'FACE_ID',
};

export function parseAdmsAttlogPayload(params: {
  companyId: string;
  deviceSn: string;
  rawText: string;
  employeeLookup?: Array<{ id: string; name: string; pin?: string; biometricId?: string }>;
}): AdmsPunchEventRecord[] {
  const companyCode = normalizeCompanyCode(params.companyId);
  const lookup = params.employeeLookup || [];
  const seenHashes = new Set<string>();
  const events: AdmsPunchEventRecord[] = [];
  const nowIso = new Date().toISOString();

  const lines = params.rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('OPLOG'));

  for (const line of lines) {
    const cols = line.split(/\t|\s{2,}/);
    if (cols.length < 2) continue;
    const pin = cols[0].trim();
    const rawTs = cols[1].trim().replace(' ', 'T');
    const tsIso = rawTs.includes('Z') || rawTs.includes('+') ? rawTs : `${rawTs}+03:00`;
    const stateCode = (cols[2] || '0').trim();
    const verifyCode = (cols[3] || '1').trim();
    const dedupHash = fnv1aHex(`${companyCode}|${params.deviceSn}|${pin}|${tsIso}`);

    if (seenHashes.has(dedupHash)) continue;
    seenHashes.add(dedupHash);

    const matchedEmp = lookup.find(
      (e) => e.id === pin || e.pin === pin || e.biometricId === pin
    );

    events.push({
      id: `adms-${dedupHash}`,
      company_id: companyCode,
      device_sn: params.deviceSn || 'ZK-CLOUD-01',
      employee_pin: pin,
      employee_id: matchedEmp?.id,
      employee_name: matchedEmp?.name,
      punch_timestamp: tsIso,
      punch_state: ADMS_STATE_MAP[stateCode] || 'CHECK_IN',
      verify_mode: ADMS_VERIFY_MAP[verifyCode] || 'FINGERPRINT',
      dedup_hash: dedupHash,
      synced_to_attendance: Boolean(matchedEmp),
      raw_payload: line,
      received_at: nowIso,
    });
  }

  return events;
}

export async function ingestAdmsPunchBatch(params: {
  companyId: string;
  deviceSn: string;
  rawText: string;
  employeeLookup?: Array<{ id: string; name: string; pin?: string; biometricId?: string }>;
}): Promise<{ parsed: number; inserted: number; duplicatesSkipped: number; events: AdmsPunchEventRecord[] }> {
  const existing = await realErpDataStore.getRecords<AdmsPunchEventRecord>('hr_adms_punch_events', []);
  const existingHashes = new Set(existing.map((e) => e.dedup_hash));
  const parsedEvents = parseAdmsAttlogPayload(params);
  const novelEvents = parsedEvents.filter((e) => !existingHashes.has(e.dedup_hash));

  for (const ev of novelEvents) {
    await realErpDataStore.addRecord<AdmsPunchEventRecord>('hr_adms_punch_events', ev);
  }

  return {
    parsed: parsedEvents.length,
    inserted: novelEvents.length,
    duplicatesSkipped: parsedEvents.length - novelEvents.length,
    events: novelEvents,
  };
}

/**
 * 4A. Year-End Leave Carryover & Forfeiture Engine
 */
export async function executeYearEndLeaveCarryover(params: {
  companyId: string;
  fiscalYear: number;
  maxCarryoverCapDays: number;
  employees: Array<{ id: string; name: string; currentBalanceDays: number }>;
  executedBy?: string;
}): Promise<LeaveCarryoverRunRecord> {
  const companyCode = normalizeCompanyCode(params.companyId);
  const cap = Math.max(0, Number(params.maxCarryoverCapDays) || 30);
  const details: LeaveCarryoverEmployeeResult[] = [];
  let totalCarried = 0;
  let totalForfeited = 0;

  for (const emp of params.employees) {
    const before = Math.max(0, Number(emp.currentBalanceDays) || 0);
    const carried = Number(Math.min(before, cap).toFixed(2));
    const forfeited = Number(Math.max(0, before - carried).toFixed(2));
    totalCarried = Number((totalCarried + carried).toFixed(2));
    totalForfeited = Number((totalForfeited + forfeited).toFixed(2));

    details.push({
      employeeId: emp.id,
      employeeName: emp.name,
      balanceBefore: before,
      carriedForwardDays: carried,
      forfeitedDays: forfeited,
    });

    if (forfeited > 0) {
      await syncEmployeeLeaveBalanceAcrossTables({
        employeeId: emp.id,
        employeeName: emp.name,
        deltaDays: -forfeited,
        actionType: 'MANUAL_ADJUST',
        reason: `ترحيل نهاية العام المالي ${params.fiscalYear} — إسقاط الرصيد الزائد عن سقف (${cap} يوماً)`,
        actorName: params.executedBy || 'نظام ترحيل الإجازات',
      });
    }
  }

  const run: LeaveCarryoverRunRecord = {
    id: `CARRY-${params.fiscalYear}-${Date.now().toString().slice(-5)}`,
    company_id: companyCode,
    fiscal_year: params.fiscalYear,
    max_carryover_cap_days: cap,
    employee_count: details.length,
    total_carried_days: totalCarried,
    total_forfeited_days: totalForfeited,
    details_json: details,
    executed_by: params.executedBy || 'مدير الموارد البشرية',
    executed_at: new Date().toISOString(),
  };

  await realErpDataStore.addRecord<LeaveCarryoverRunRecord>('hr_leave_carryover_runs', run);
  return run;
}

/**
 * 4B. In-Service Annual Leave Encashment (Cash-out + Balance Deduction + Balanced GL)
 */
export async function executeInServiceLeaveEncashment(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  currentBalanceDays: number;
  daysToEncash: number;
  monthlyWageSar: number;
  entryDateIso: string;
  actorName?: string;
}): Promise<{ encashment: LeaveEncashmentRecord; journalEntryId: string }> {
  const companyCode = normalizeCompanyCode(params.companyId);
  const days = Math.max(0, Number(params.daysToEncash) || 0);

  if (days <= 0 || days > params.currentBalanceDays) {
    throw new Error(
      `عدد الأيام المطلوب تسييلها (${days}) يجب أن يكون أكبر من 0 ولا يتجاوز الرصيد المتاح (${params.currentBalanceDays} يوماً).`
    );
  }

  const dailyRateSar = Number((Math.max(0, params.monthlyWageSar) / 30).toFixed(2));
  const payoutHalalas = Math.round((toHalalas(params.monthlyWageSar) / 30) * days);
  const totalPayoutSar = fromHalalas(payoutHalalas);
  const remainingAfter = Number((params.currentBalanceDays - days).toFixed(2));

  const encashId = `ENC-${params.employeeId}-${Date.now().toString().slice(-5)}`;

  const jeResult = journalEngine.createJournalEntry(companyCode, {
    entryDate: params.entryDateIso,
    entryType: 'AUTOMATIC',
    sourceModule: 'HR_PAYROLL',
    sourceReference: encashId,
    description: `تسييل رصيد إجازة سنوية نقداً (${days} يوم) للموظف ${params.employeeName}`,
    costCenterCode: 'CC-HQ-01',
    createdBy: params.actorName || 'مدير الموارد البشرية',
    autoPost: true,
    lines: [
      {
        accountCode: '530101',
        accountName: 'مخصص وتصفية بدلات الإجازات السنوية',
        debit: totalPayoutSar,
        credit: 0,
        costCenterCode: 'CC-HQ-01',
        description: `تسييل (${days}) يوم إجازة × أجر يومي ⃁ ${dailyRateSar}`,
      },
      {
        accountCode: '210201',
        accountName: 'الرواتب والأجور المستحقة للموظفين (WPS)',
        debit: 0,
        credit: totalPayoutSar,
        costCenterCode: 'CC-HQ-01',
        description: `صافي مستحق تسييل الإجازة للموظف ${params.employeeName}`,
      },
    ],
  });

  if (jeResult.error || !jeResult.entry) {
    throw new Error(jeResult.error || 'تعذر ترحيل قيد تسييل رصيد الإجازة.');
  }
  const je = jeResult.entry;

  await syncEmployeeLeaveBalanceAcrossTables({
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    deltaDays: -days,
    actionType: 'MANUAL_ADJUST',
    reason: `تسييل نقدي من رصيد الإجازة (${days} يوماً) بمبلغ ⃁ ${totalPayoutSar}`,
    actorName: params.actorName || 'مدير الموارد البشرية',
  });

  const record: LeaveEncashmentRecord = {
    id: encashId,
    company_id: companyCode,
    employee_id: params.employeeId,
    employee_name: params.employeeName,
    days_encashed: days,
    daily_rate_sar: dailyRateSar,
    total_payout_sar: totalPayoutSar,
    remaining_balance_after: remainingAfter,
    status: 'POSTED',
    journal_entry_id: je.id,
    encashed_at: new Date().toISOString(),
  };

  await realErpDataStore.addRecord<LeaveEncashmentRecord>('hr_leave_encashments', record);
  await realErpDataStore.addRecord('company_journal_entries', {
    id: `jv-enc-${Date.now().toString().slice(-6)}`,
    company_id: companyCode,
    ref_no: je.entryNumber,
    date: params.entryDateIso,
    branch: 'المركز المالي الرئيسي',
    description: `قيد تسييل إجازة سنوية (${days} يوم) — ${params.employeeName}`,
    debit_account: '530101 مخصص وتصفية الإجازات السنوية',
    credit_account: '210201 الرواتب والأجور المستحقة',
    amount: totalPayoutSar,
    status: 'مُرحّل آلياً',
  });

  return { encashment: record, journalEntryId: je.id };
}
