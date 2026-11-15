/**
 * Enterprise Payroll Extensions:
 *   1. Retroactive Payroll Calculator (New Hire Pro-Rata + Mid-Month Promotion Diff + Backpay)
 *   2. Automatic Upfront Annual Leave Salary Payroll Deduction Guard
 *   3. Off-Cycle Payroll Runs (Bonuses, Commissions, Retro, EOSB, Leave Encashment) + Balanced GL
 *   4. Mudad WPS Violation Justification Engine (>50% Art.93 Deduction, GOSI Variance, Zero Net Pay + CSV + Outbox)
 *   5. Direct Bank B2B Payout & ISO-20022 pain.001.001.03 XML Settlement Engine
 */

import { realErpDataStore } from './realErpDataStore';
import { journalEngine } from './accounting/journalEngine';
import { govOutbox, getGovEnvironment, type GovCompanyCode } from './govIntegrationHubService';
import { maskIban, maskNationalId } from '../utils/pdplMasking';

type CompanyCode = Parameters<typeof journalEngine.createJournalEntry>[0];

export type ArrearType = 'NEW_HIRE_PRORATA' | 'PROMOTION_DIFF' | 'ALLOWANCE_BACKPAY';

export interface RetroactiveArrearRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  period_month: string; // YYYY-MM
  arrear_type: ArrearType;
  effective_date: string; // YYYY-MM-DD
  prior_salary_sar: number;
  new_salary_sar: number;
  prorata_days: number;
  retro_amount_sar: number;
  notes?: string;
  status: 'PENDING' | 'APPLIED_TO_RUN' | 'PAID_OFFCYCLE';
  payroll_run_id?: string;
  created_at: string;
}

export type OffCycleCategory =
  | 'BONUS'
  | 'COMMISSION'
  | 'RETRO_ARREARS'
  | 'EOSB_SETTLEMENT'
  | 'LEAVE_ENCASHMENT';

export interface OffCyclePayrollItem {
  employeeId: string;
  employeeName: string;
  department: string;
  costCenterCode?: string;
  grossAmountSar: number;
  deductionAmountSar: number;
  netAmountSar: number;
  notes?: string;
}

export interface OffCyclePayrollRunRecord {
  id: string;
  company_id: string;
  period_month: string;
  run_title: string;
  run_category: OffCycleCategory;
  payment_date: string;
  employee_count: number;
  total_gross_sar: number;
  total_deductions_sar: number;
  total_net_sar: number;
  items_json: OffCyclePayrollItem[];
  status: 'DRAFT' | 'POSTED_TO_GL' | 'PAID';
  journal_entry_id?: string;
  created_by: string;
  created_at: string;
}

export type MudadViolationType =
  | 'DEDUCTION_OVER_50_PCT'
  | 'GOSI_WAGE_VARIANCE'
  | 'ZERO_NET_PAY'
  | 'UNPAID_LEAVE_GAP';

export interface MudadCatalogReason {
  code: string;
  violationType: MudadViolationType;
  labelAr: string;
  legalBasisAr: string;
}

export const MUDAD_JUSTIFICATION_CATALOG: MudadCatalogReason[] = [
  {
    code: 'MUD-01',
    violationType: 'DEDUCTION_OVER_50_PCT',
    labelAr: 'موافقة خطية من العامل أو تنفيذ حكم قضائي / قسط سلفة موثق (المادة 93)',
    legalBasisAr: 'المادة 93 من نظام العمل السعودي — يجوز تجاوز حد 50% بموافقة العامل الخطية',
  },
  {
    code: 'MUD-02',
    violationType: 'ZERO_NET_PAY',
    labelAr: 'إجازة بدون راتب أو غياب غير مأجور كامل الشهر / تسوية راتب إجازة مصروف مقدماً',
    legalBasisAr: 'لائحة الالتزام بنظام حماية الأجور (مدد) — تغطية حالات صافي الصفر',
  },
  {
    code: 'MUD-03',
    violationType: 'GOSI_WAGE_VARIANCE',
    labelAr: 'تعديل أجر خلال الشهر أو عمولات ومزايا متغيرة غير خاضعة للاشتراك التراكمي',
    legalBasisAr: 'ضوابط المطابقة الشهرية بين منصة مدد والتأمينات الاجتماعية (GOSI)',
  },
  {
    code: 'MUD-04',
    violationType: 'UNPAID_LEAVE_GAP',
    labelAr: 'توقف مؤقت عن العمل أو مباشرة متأخرة بعد عودة من إجازة طويلة',
    legalBasisAr: 'قواعد احتساب أيام العمل الفعلية في حماية الأجور',
  },
];

export interface MudadViolationAuditItem {
  employeeId: string;
  employeeName: string;
  nationalId: string;
  violationType: MudadViolationType;
  suggestedCode: string;
  suggestedLabelAr: string;
  deductionRatioPct: number;
  gosiVarianceSar: number;
  grossSalarySar: number;
  netSalarySar: number;
}

export interface MudadJustificationRecord {
  id: string;
  company_id: string;
  period_month: string;
  employee_id: string;
  employee_name: string;
  national_id_masked?: string;
  violation_type: MudadViolationType;
  mudad_reason_code: string;
  mudad_reason_label_ar: string;
  deduction_ratio_pct: number;
  gosi_variance_sar: number;
  supporting_reference?: string;
  justification_notes: string;
  submission_status: 'PENDING_SUBMISSION' | 'ENQUEUED_TO_MUDAD' | 'ACCEPTED';
  outbox_record_id?: string;
  created_at: string;
}

export type SaudiCorporateBankCode = 'ALRAJHI_B2B' | 'SNB_CORP' | 'RIYAD_DIRECT' | 'ALINMA_B2B';

export interface B2BBankBatchRecord {
  id: string;
  company_id: string;
  period_month: string;
  bank_code: SaudiCorporateBankCode;
  debit_iban: string;
  bank_gl_code: string;
  message_id: string;
  instruction_count: number;
  total_amount_sar: number;
  pain001_xml: string;
  settlement_status: 'DRAFT' | 'TRANSMITTED' | 'SETTLED_ACK' | 'PARTIAL_REJECT';
  bank_ack_reference?: string;
  journal_entry_id?: string;
  created_at: string;
  settled_at?: string;
}

export interface B2BPaymentInstructionInput {
  employeeId: string;
  employeeName: string;
  beneficiaryIban: string;
  beneficiaryBic?: string;
  netSalarySar: number;
  endToEndRef?: string;
}

export interface UpfrontLeaveDeductionMatch {
  employeeId: string;
  periodMonth: string;
  totalUpfrontPaidSar: number;
  matchedReferences: string[];
}

function toHalalas(sar: number): number {
  return Math.round((Number(sar) || 0) * 100);
}

function fromHalalas(halalas: number): number {
  return Number((halalas / 100).toFixed(2));
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

function xmlEscape(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeCompanyCode(companyId: string): CompanyCode {
  const upper = (companyId || 'SAF').toUpperCase();
  if (upper === 'YAQ' || upper === 'TOP' || upper === 'KAS' || upper === 'DAR') {
    return upper;
  }
  return 'SAF';
}

function resolveBankGlInfo(bankCode: SaudiCorporateBankCode): { code: string; name: string; bic: string } {
  switch (bankCode) {
    case 'RIYAD_DIRECT':
      return { code: '110202', name: 'بنك الرياض - الحساب التشغيلي', bic: 'RIBLSARI' };
    case 'SNB_CORP':
      return { code: '110203', name: 'البنك الأهلي السعودي SNB - حساب التسويات', bic: 'NCBKSAJE' };
    case 'ALINMA_B2B':
      return { code: '110201', name: 'مصرف الإنماء / الراجحي - حساب B2B', bic: 'INMASARI' };
    case 'ALRAJHI_B2B':
    default:
      return { code: '110201', name: 'مصرف الراجحي - الحساب التشغيلي الرئيسي', bic: 'RJHISARI' };
  }
}

/**
 * 1. Retroactive Payroll Calculation (New-Hire Pro-Rata & Mid-Month / Prior-Month Promotion Diff)
 */
export function calculateRetroactiveArrears(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  periodMonth: string; // e.g. '2026-08'
  arrearType: ArrearType;
  effectiveDate: string; // YYYY-MM-DD
  priorSalarySar: number;
  newSalarySar: number;
  notes?: string;
}): RetroactiveArrearRecord {
  const [pYear, pMonth] = params.periodMonth.split('-').map(Number);
  const totalDays = daysInMonth(pYear || 2026, pMonth || 8);
  const effIso = params.effectiveDate.slice(0, 10);
  const [eYear, eMonth, eDay] = effIso.split('-').map(Number);

  const periodStartIso = `${params.periodMonth}-01`;
  const periodEndIso = `${params.periodMonth}-${String(totalDays).padStart(2, '0')}`;

  let prorataDays = 0;
  let retroHalalas = 0;

  if (params.arrearType === 'NEW_HIRE_PRORATA') {
    if (effIso >= periodStartIso && effIso <= periodEndIso) {
      prorataDays = Math.max(0, totalDays - (eDay || 1) + 1);
      retroHalalas = Math.round((toHalalas(params.newSalarySar) * prorataDays) / totalDays);
    } else if (effIso < periodStartIso) {
      // Joined before current period: calculate days in join month missed from prior run
      const joinMonthDays = daysInMonth(eYear || pYear, eMonth || pMonth);
      prorataDays = Math.max(0, joinMonthDays - (eDay || 1) + 1);
      retroHalalas = Math.round((toHalalas(params.newSalarySar) * prorataDays) / joinMonthDays);
    }
  } else {
    // PROMOTION_DIFF or ALLOWANCE_BACKPAY
    const monthlyDiffHalalas = Math.max(0, toHalalas(params.newSalarySar) - toHalalas(params.priorSalarySar));
    if (effIso >= periodStartIso && effIso <= periodEndIso) {
      prorataDays = Math.max(0, totalDays - (eDay || 1) + 1);
      retroHalalas = Math.round((monthlyDiffHalalas * prorataDays) / totalDays);
    } else if (effIso < periodStartIso) {
      // Backpay across previous effective month partial days + any intermediate full months
      const effMonthDays = daysInMonth(eYear || pYear, eMonth || pMonth);
      const effMonthPartialDays = Math.max(0, effMonthDays - (eDay || 1) + 1);
      const monthsGap = Math.max(0, (pYear - eYear) * 12 + (pMonth - eMonth) - 1);
      prorataDays = effMonthPartialDays + monthsGap * 30;
      const partialHalalas = Math.round((monthlyDiffHalalas * effMonthPartialDays) / effMonthDays);
      retroHalalas = partialHalalas + monthsGap * monthlyDiffHalalas;
    }
  }

  return {
    id: `RETRO-${params.periodMonth.replace('-', '')}-${params.employeeId}-${Date.now().toString().slice(-4)}`,
    company_id: params.companyId || 'SAF',
    employee_id: params.employeeId,
    employee_name: params.employeeName,
    period_month: params.periodMonth,
    arrear_type: params.arrearType,
    effective_date: effIso,
    prior_salary_sar: fromHalalas(toHalalas(params.priorSalarySar)),
    new_salary_sar: fromHalalas(toHalalas(params.newSalarySar)),
    prorata_days: prorataDays,
    retro_amount_sar: fromHalalas(retroHalalas),
    notes: params.notes,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  };
}

export async function saveRetroactiveArrear(record: RetroactiveArrearRecord): Promise<RetroactiveArrearRecord[]> {
  return realErpDataStore.addRecord<RetroactiveArrearRecord>('hr_payroll_retro_arrears', record);
}

/**
 * 2. Automatic Upfront Leave Salary Payroll Deduction Guard
 * Matches `jv-lvpay-*` journal entries or prepaid leave vouchers for `periodMonth` so employees
 * paid leave salary upfront are automatically offset in monthly WPS payroll (zero double-pay).
 */
export function computeUpfrontLeavePayrollDeduction(params: {
  employeeId: string;
  employeeName: string;
  periodMonth: string; // YYYY-MM
  journalEntries: Array<{
    id?: string;
    ref_no?: string;
    date?: string;
    description?: string;
    amount?: number;
    employee_id?: string;
  }>;
}): UpfrontLeaveDeductionMatch {
  const matchedRefs: string[] = [];
  let totalHalalas = 0;

  for (const jv of params.journalEntries) {
    const idStr = String(jv.id || '').toLowerCase();
    const refStr = String(jv.ref_no || '').toUpperCase();
    const descStr = String(jv.description || '');
    const isUpfrontLeave =
      idStr.startsWith('jv-lvpay-') ||
      refStr.startsWith('JV-LVPAY-') ||
      descStr.includes('صرف راتب الإجازة السنوية مقدماً');

    if (!isUpfrontLeave) continue;

    const entryMonth = String(jv.date || '').slice(0, 7);
    const sameMonth = !entryMonth || entryMonth === params.periodMonth || descStr.includes(params.periodMonth);
    const matchesEmployee =
      (jv.employee_id && jv.employee_id === params.employeeId) ||
      descStr.includes(params.employeeId) ||
      (params.employeeName.trim().length > 2 && descStr.includes(params.employeeName.trim()));

    if (sameMonth && matchesEmployee && Number(jv.amount || 0) > 0) {
      totalHalalas += toHalalas(Number(jv.amount || 0));
      matchedRefs.push(jv.ref_no || jv.id || `LVPAY-${matchedRefs.length + 1}`);
    }
  }

  return {
    employeeId: params.employeeId,
    periodMonth: params.periodMonth,
    totalUpfrontPaidSar: fromHalalas(totalHalalas),
    matchedReferences: matchedRefs,
  };
}

/**
 * 3. Off-Cycle Payroll Run Creator + Balanced Integer-Halala Double-Entry GL Posting
 */
export async function createAndPostOffCyclePayrollRun(params: {
  companyId: string;
  periodMonth: string;
  runTitle: string;
  runCategory: OffCycleCategory;
  paymentDate: string; // YYYY-MM-DD (unlocked accounting period)
  items: OffCyclePayrollItem[];
  payoutImmediate?: boolean;
  createdBy?: string;
}): Promise<{ run: OffCyclePayrollRunRecord; journalEntryId: string }> {
  const companyCode = normalizeCompanyCode(params.companyId);
  const cleanItems: OffCyclePayrollItem[] = params.items.map((item) => {
    const grossH = Math.max(0, toHalalas(item.grossAmountSar));
    const dedH = Math.min(grossH, Math.max(0, toHalalas(item.deductionAmountSar)));
    const netH = grossH - dedH;
    return {
      ...item,
      grossAmountSar: fromHalalas(grossH),
      deductionAmountSar: fromHalalas(dedH),
      netAmountSar: fromHalalas(netH),
    };
  });

  const totalGrossH = cleanItems.reduce((acc, it) => acc + toHalalas(it.grossAmountSar), 0);
  const totalDedH = cleanItems.reduce((acc, it) => acc + toHalalas(it.deductionAmountSar), 0);
  const totalNetH = totalGrossH - totalDedH;

  if (totalGrossH <= 0) {
    throw new Error('يجب أن يتجاوز إجمالي مسير الدورة الإضافية (Off-Cycle) صفر ريال.');
  }

  const runId = `OFFCYC-${params.periodMonth.replace('-', '')}-${Date.now().toString().slice(-5)}`;
  const expenseAccount =
    params.runCategory === 'COMMISSION'
      ? { code: '520101', name: 'عمولات المبيعات والتسويق والحوافز' }
      : params.runCategory === 'EOSB_SETTLEMENT'
      ? { code: '530102', name: 'التأمينات ومكافأة نهاية الخدمة ومزايا الموظفين' }
      : { code: '530101', name: 'الرواتب والأجور والبدلات والمكافآت الإضافية' };

  const creditSettlement = params.payoutImmediate
    ? { code: '110201', name: 'مصرف الراجحي - الحساب التشغيلي الرئيسي' }
    : { code: '210201', name: 'الرواتب والأجور المستحقة (WPS / Off-Cycle)' };

  const glLines = [
    {
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      debit: fromHalalas(totalGrossH),
      credit: 0,
      costCenterCode: cleanItems[0]?.costCenterCode || 'CC-HQ-01',
      description: `${params.runTitle} (${params.runCategory}) — إجمالي استحقاقات ${cleanItems.length} موظف`,
    },
  ];

  if (totalDedH > 0) {
    glLines.push({
      accountCode: '110702',
      accountName: 'سلف وعهد الموظفين (تسوية استقطاعات Off-Cycle)',
      debit: 0,
      credit: fromHalalas(totalDedH),
      costCenterCode: cleanItems[0]?.costCenterCode || 'CC-HQ-01',
      description: `تسوية سلف واستقطاعات ضمن ${params.runTitle}`,
    });
  }

  if (totalNetH > 0) {
    glLines.push({
      accountCode: creditSettlement.code,
      accountName: creditSettlement.name,
      debit: 0,
      credit: fromHalalas(totalNetH),
      costCenterCode: cleanItems[0]?.costCenterCode || 'CC-HQ-01',
      description: `صافي مستحق الصرف — ${params.runTitle} (${runId})`,
    });
  }

  const jeResult = journalEngine.createJournalEntry(companyCode, {
    entryDate: params.paymentDate,
    entryType: 'AUTOMATIC',
    sourceModule: 'HR_PAYROLL',
    sourceReference: runId,
    description: `مسير رواتب إضافي (Off-Cycle): ${params.runTitle} [${params.periodMonth}]`,
    costCenterCode: cleanItems[0]?.costCenterCode || 'CC-HQ-01',
    createdBy: params.createdBy || 'مدير الموارد البشرية والرواتب',
    autoPost: true,
    lines: glLines,
  });

  if (jeResult.error || !jeResult.entry) {
    throw new Error(jeResult.error || 'تعذر ترحيل قيد مسير الدورات الإضافية.');
  }
  const je = jeResult.entry;

  const runRecord: OffCyclePayrollRunRecord = {
    id: runId,
    company_id: companyCode,
    period_month: params.periodMonth,
    run_title: params.runTitle,
    run_category: params.runCategory,
    payment_date: params.paymentDate,
    employee_count: cleanItems.length,
    total_gross_sar: fromHalalas(totalGrossH),
    total_deductions_sar: fromHalalas(totalDedH),
    total_net_sar: fromHalalas(totalNetH),
    items_json: cleanItems,
    status: params.payoutImmediate ? 'PAID' : 'POSTED_TO_GL',
    journal_entry_id: je.id,
    created_by: params.createdBy || 'HR_ADMIN',
    created_at: new Date().toISOString(),
  };

  await realErpDataStore.addRecord<OffCyclePayrollRunRecord>('hr_offcycle_payroll_runs', runRecord);
  await realErpDataStore.addRecord('company_journal_entries', {
    id: `jv-offcyc-${Date.now().toString().slice(-6)}`,
    company_id: companyCode,
    ref_no: je.entryNumber,
    date: params.paymentDate,
    branch: 'المركز المالي الرئيسي',
    description: `قيد مسير رواتب إضافي (Off-Cycle): ${params.runTitle}`,
    debit_account: `${expenseAccount.code} ${expenseAccount.name}`,
    credit_account: `${creditSettlement.code} ${creditSettlement.name}`,
    amount: fromHalalas(totalGrossH),
    status: 'مُرحّل آلياً',
  });

  return { run: runRecord, journalEntryId: je.id };
}

/**
 * 4. Mudad WPS Violation Audit & Official Code Justification Submission
 */
export function auditPayrollForMudadViolations(
  rows: Array<{
    employeeId: string;
    employeeName: string;
    nationalId: string;
    grossSalarySar: number;
    totalDeductionsSar: number;
    netSalarySar: number;
    payrollGosiWageSar: number;
    registeredGosiWageSar: number;
  }>
): MudadViolationAuditItem[] {
  const violations: MudadViolationAuditItem[] = [];

  for (const row of rows) {
    const gross = Math.max(0, Number(row.grossSalarySar) || 0);
    const ded = Math.max(0, Number(row.totalDeductionsSar) || 0);
    const ratioPct = gross > 0 ? Number(((ded / gross) * 100).toFixed(2)) : 0;
    const gosiDiff = Number((row.payrollGosiWageSar - row.registeredGosiWageSar).toFixed(2));

    if (row.netSalarySar <= 0) {
      const cat = MUDAD_JUSTIFICATION_CATALOG.find((c) => c.code === 'MUD-02')!;
      violations.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        nationalId: row.nationalId,
        violationType: 'ZERO_NET_PAY',
        suggestedCode: cat.code,
        suggestedLabelAr: cat.labelAr,
        deductionRatioPct: ratioPct,
        gosiVarianceSar: gosiDiff,
        grossSalarySar: gross,
        netSalarySar: row.netSalarySar,
      });
    } else if (gross > 0 && ded > gross * 0.5) {
      const cat = MUDAD_JUSTIFICATION_CATALOG.find((c) => c.code === 'MUD-01')!;
      violations.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        nationalId: row.nationalId,
        violationType: 'DEDUCTION_OVER_50_PCT',
        suggestedCode: cat.code,
        suggestedLabelAr: cat.labelAr,
        deductionRatioPct: ratioPct,
        gosiVarianceSar: gosiDiff,
        grossSalarySar: gross,
        netSalarySar: row.netSalarySar,
      });
    }

    if (Math.abs(gosiDiff) > 1) {
      const cat = MUDAD_JUSTIFICATION_CATALOG.find((c) => c.code === 'MUD-03')!;
      violations.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        nationalId: row.nationalId,
        violationType: 'GOSI_WAGE_VARIANCE',
        suggestedCode: cat.code,
        suggestedLabelAr: cat.labelAr,
        deductionRatioPct: ratioPct,
        gosiVarianceSar: gosiDiff,
        grossSalarySar: gross,
        netSalarySar: row.netSalarySar,
      });
    }
  }

  return violations;
}

export async function submitMudadJustification(params: {
  companyId: string;
  periodMonth: string;
  auditItem: MudadViolationAuditItem;
  mudadReasonCode: string;
  justificationNotes: string;
  supportingReference?: string;
}): Promise<MudadJustificationRecord> {
  const companyCode = normalizeCompanyCode(params.companyId);
  const catalogMatch =
    MUDAD_JUSTIFICATION_CATALOG.find((c) => c.code === params.mudadReasonCode) ||
    MUDAD_JUSTIFICATION_CATALOG[0];

  const recordId = `MUD-JST-${Date.now().toString().slice(-6)}`;
  const payloadRow = {
    id: recordId,
    company_id: companyCode,
    period_month: params.periodMonth,
    employee_id: params.auditItem.employeeId,
    employee_name: params.auditItem.employeeName,
    national_id_masked: maskNationalId(params.auditItem.nationalId),
    violation_type: params.auditItem.violationType,
    mudad_reason_code: catalogMatch.code,
    mudad_reason_label_ar: catalogMatch.labelAr,
    deduction_ratio_pct: params.auditItem.deductionRatioPct,
    gosi_variance_sar: params.auditItem.gosiVarianceSar,
    supporting_reference: params.supportingReference || 'HR-ART93-SIGNED',
    notes: params.justificationNotes,
  };

  const outboxEntry = govOutbox.enqueue('mudad', [payloadRow], {
    companyId: companyCode as GovCompanyCode,
    environment: 'SIMULATION',
  });

  const record: MudadJustificationRecord = {
    id: recordId,
    company_id: companyCode,
    period_month: params.periodMonth,
    employee_id: params.auditItem.employeeId,
    employee_name: params.auditItem.employeeName,
    national_id_masked: maskNationalId(params.auditItem.nationalId),
    violation_type: params.auditItem.violationType,
    mudad_reason_code: catalogMatch.code,
    mudad_reason_label_ar: catalogMatch.labelAr,
    deduction_ratio_pct: params.auditItem.deductionRatioPct,
    gosi_variance_sar: params.auditItem.gosiVarianceSar,
    supporting_reference: params.supportingReference,
    justification_notes: params.justificationNotes,
    submission_status: 'ENQUEUED_TO_MUDAD',
    outbox_record_id: outboxEntry.id,
    created_at: new Date().toISOString(),
  };

  await realErpDataStore.addRecord<MudadJustificationRecord>('hr_mudad_justifications', record);
  return record;
}

export function buildMudadJustificationManifestCsv(records: MudadJustificationRecord[]): string {
  const headers = [
    'id',
    'company_id',
    'period_month',
    'employee_id',
    'employee_name',
    'national_id_masked',
    'violation_type',
    'mudad_reason_code',
    'mudad_reason_label_ar',
    'deduction_ratio_pct',
    'gosi_variance_sar',
    'supporting_reference',
    'justification_notes',
    'submission_status',
  ];
  const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = records.map((r) =>
    [
      r.id,
      r.company_id,
      r.period_month,
      r.employee_id,
      r.employee_name,
      r.national_id_masked || '',
      r.violation_type,
      r.mudad_reason_code,
      r.mudad_reason_label_ar,
      r.deduction_ratio_pct,
      r.gosi_variance_sar,
      r.supporting_reference || '',
      r.justification_notes,
      r.submission_status,
    ]
      .map(escapeCsv)
      .join(',')
  );
  return `\uFEFF${headers.join(',')}\n${lines.join('\n')}`;
}

/**
 * 5. Direct Bank B2B Payout & ISO-20022 pain.001.001.03 XML Generator + Settlement Posting
 */
export function generateIso20022Pain001Xml(params: {
  companyName: string;
  companyId: string;
  bankCode: SaudiCorporateBankCode;
  debitIban: string;
  executionDateIso: string;
  messageId: string;
  instructions: B2BPaymentInstructionInput[];
}): { xml: string; totalAmountSar: number; instructionCount: number } {
  const bankInfo = resolveBankGlInfo(params.bankCode);
  const validInstructions = params.instructions.filter((i) => toHalalas(i.netSalarySar) > 0);
  const totalHalalas = validInstructions.reduce((sum, i) => sum + toHalalas(i.netSalarySar), 0);
  const ctrlSum = (totalHalalas / 100).toFixed(2);
  const createdIso = new Date().toISOString().slice(0, 19);

  const txXml = validInstructions
    .map((tx, idx) => {
      const amtStr = (toHalalas(tx.netSalarySar) / 100).toFixed(2);
      const e2eId = tx.endToEndRef || `${params.messageId}-TX${idx + 1}`;
      const ibanClean = (tx.beneficiaryIban || 'SA0380000000608010167519').replace(/\s+/g, '');
      const bic = tx.beneficiaryBic || bankInfo.bic;
      return `      <CdtTrfTxInf>
        <PmtId>
          <InstrId>${xmlEscape(`${params.messageId}-${idx + 1}`)}</InstrId>
          <EndToEndId>${xmlEscape(e2eId)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="SAR">${amtStr}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>${xmlEscape(bic)}</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${xmlEscape(tx.employeeName)}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${xmlEscape(ibanClean)}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${xmlEscape(`SALARY WPS ${params.companyId} EMP ${tx.employeeId}`)}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(params.messageId)}</MsgId>
      <CreDtTm>${createdIso}</CreDtTm>
      <NbOfTxs>${validInstructions.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Nm>${xmlEscape(params.companyName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${xmlEscape(`PMT-${params.messageId}`)}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${validInstructions.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <ReqdExctnDt>${xmlEscape(params.executionDateIso.slice(0, 10))}</ReqdExctnDt>
      <Dbtr>
        <Nm>${xmlEscape(params.companyName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${xmlEscape(params.debitIban.replace(/\s+/g, ''))}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${xmlEscape(bankInfo.bic)}</BIC>
        </FinInstnId>
      </DbtrAgt>
${txXml}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return {
    xml,
    totalAmountSar: fromHalalas(totalHalalas),
    instructionCount: validInstructions.length,
  };
}

export async function createBankB2BPayoutBatch(params: {
  companyId: string;
  companyName: string;
  periodMonth: string;
  bankCode: SaudiCorporateBankCode;
  debitIban: string;
  executionDateIso: string;
  instructions: B2BPaymentInstructionInput[];
}): Promise<B2BBankBatchRecord> {
  const companyCode = normalizeCompanyCode(params.companyId);
  const bankInfo = resolveBankGlInfo(params.bankCode);
  const messageId = `B2B-${companyCode}-${params.periodMonth.replace('-', '')}-${Date.now().toString().slice(-5)}`;

  const generated = generateIso20022Pain001Xml({
    companyName: params.companyName,
    companyId: companyCode,
    bankCode: params.bankCode,
    debitIban: params.debitIban,
    executionDateIso: params.executionDateIso,
    messageId,
    instructions: params.instructions,
  });

  if (generated.instructionCount === 0) {
    throw new Error('لا توجد حوالات رواتب موجبة لإنشاء دفعة B2B البنكية.');
  }

  const batch: B2BBankBatchRecord = {
    id: messageId,
    company_id: companyCode,
    period_month: params.periodMonth,
    bank_code: params.bankCode,
    debit_iban: maskIban(params.debitIban),
    bank_gl_code: bankInfo.code,
    message_id: messageId,
    instruction_count: generated.instructionCount,
    total_amount_sar: generated.totalAmountSar,
    pain001_xml: generated.xml,
    settlement_status: 'TRANSMITTED',
    created_at: new Date().toISOString(),
  };

  await realErpDataStore.addRecord<B2BBankBatchRecord>('hr_b2b_bank_batches', batch);
  return batch;
}

export async function settleBankB2BBatch(params: {
  batch: B2BBankBatchRecord;
  bankAckReference: string;
  settlementDateIso: string;
  actorName?: string;
}): Promise<{ batch: B2BBankBatchRecord; journalEntryId: string }> {
  const companyCode = normalizeCompanyCode(params.batch.company_id);
  const bankInfo = resolveBankGlInfo(params.batch.bank_code);
  const amountSar = fromHalalas(toHalalas(params.batch.total_amount_sar));

  const je = journalEngine.createJournalEntry(companyCode, {
    entryDate: params.settlementDateIso,
    entryType: 'AUTOMATIC',
    sourceModule: 'HR_PAYROLL',
    sourceReference: params.batch.message_id,
    description: `تسوية حوالة رواتب B2B (${params.batch.bank_code}) مرجع البنك ${params.bankAckReference}`,
    costCenterCode: 'CC-HQ-01',
    createdBy: params.actorName || 'مدير الخزينة والرواتب',
    autoPost: true,
    lines: [
      {
        accountCode: '210201',
        accountName: 'الرواتب والأجور المستحقة (WPS)',
        debit: amountSar,
        credit: 0,
        costCenterCode: 'CC-HQ-01',
        description: `إقفال مستحقات الرواتب المحولة عبر B2B — دفعة ${params.batch.message_id}`,
      },
      {
        accountCode: bankInfo.code,
        accountName: bankInfo.name,
        debit: 0,
        credit: amountSar,
        costCenterCode: 'CC-HQ-01',
        description: `خصم بنكي مباشر ISO-20022 (${params.bankAckReference}) — ${params.batch.instruction_count} موظف`,
      },
    ],
  });

  if (je.error || !je.entry) {
    throw new Error(je.error || 'تعذر إنشاء القيد المحاسبي المتوازن لتسوية B2B.');
  }

  const settledAt = new Date().toISOString();
  const updatedBatch: B2BBankBatchRecord = {
    ...params.batch,
    settlement_status: 'SETTLED_ACK',
    bank_ack_reference: params.bankAckReference,
    journal_entry_id: je.entry.id,
    settled_at: settledAt,
  };

  await realErpDataStore.updateRecord<B2BBankBatchRecord>('hr_b2b_bank_batches', params.batch.id, {
    settlement_status: 'SETTLED_ACK',
    bank_ack_reference: params.bankAckReference,
    journal_entry_id: je.entry.id,
    settled_at: settledAt,
  });

  await realErpDataStore.addRecord('company_journal_entries', {
    id: `jv-b2b-${Date.now().toString().slice(-6)}`,
    company_id: companyCode,
    ref_no: je.entry.entryNumber,
    date: params.settlementDateIso,
    branch: 'الخزينة المركزية',
    description: `سداد رواتب B2B ISO-20022 (${params.batch.bank_code}) — ${params.bankAckReference}`,
    debit_account: '210201 الرواتب والأجور المستحقة (WPS)',
    credit_account: `${bankInfo.code} ${bankInfo.name}`,
    amount: amountSar,
    status: 'مُرحّل آلياً',
  });

  return { batch: updatedBatch, journalEntryId: je.entry.id };
}
