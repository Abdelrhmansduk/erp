import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRetroactiveArrears,
  computeUpfrontLeavePayrollDeduction,
  createAndPostOffCyclePayrollRun,
  auditPayrollForMudadViolations,
  submitMudadJustification,
  buildMudadJustificationManifestCsv,
  generateIso20022Pain001Xml,
  createBankB2BPayoutBatch,
  settleBankB2BBatch,
} from './hrPayrollArrearsAndB2BEngine';
import {
  issueCorporateCard,
  toggleCorporateCardFreeze,
  authorizeAndRecordCardSpend,
  resolveAttendanceCutoffWindow,
  evaluatePermissionQuotaBucket,
  parseAdmsAttlogPayload,
  ingestAdmsPunchBatch,
  executeYearEndLeaveCarryover,
  executeInServiceLeaveEncashment,
} from './hrSpendCardsAndAttendanceCutoffEngine';
import {
  validateCustomFieldValues,
  issueEsignOtpChallenge,
  verifyAndSignDocument,
  benchmarkEmployeeSalary,
  submitCareerPortalApplication,
  calculateEnpsSummary,
  generateCelebrationsFeed,
  DEFAULT_CAREER_JOB_POSTINGS,
  type CustomFieldDefinitionRecord,
  type EnpsResponseRecord,
} from './hrGovernanceTalentPulseEngine';
import { HrWorkflowEngine, type ConditionalWorkflowRule } from './hrWorkflowEngine';
import { journalEngine } from './accounting/journalEngine';

function buildZatcaTlvBase64(tags: Array<[number, string]>): string {
  const encoder = new TextEncoder();
  const chunks: number[] = [];
  for (const [tag, value] of tags) {
    const valBytes = encoder.encode(value);
    chunks.push(tag, valBytes.length, ...Array.from(valBytes));
  }
  let binary = '';
  for (const b of chunks) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

describe('Enterprise HR Complete Parity Suite (13 Capabilities)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('1. Calculates retroactive new-hire pro-rata & promotion diff backpay', () => {
    const newHire = calculateRetroactiveArrears({
      companyId: 'SAF',
      employeeId: 'EMP-901',
      employeeName: 'طارق الحربي',
      periodMonth: '2026-08',
      arrearType: 'NEW_HIRE_PRORATA',
      effectiveDate: '2026-08-16',
      priorSalarySar: 0,
      newSalarySar: 9300,
    });

    expect(newHire.prorata_days).toBe(16);
    expect(newHire.retro_amount_sar).toBe(4800);

    const promo = calculateRetroactiveArrears({
      companyId: 'SAF',
      employeeId: 'EMP-902',
      employeeName: 'نورة القحطاني',
      periodMonth: '2026-08',
      arrearType: 'PROMOTION_DIFF',
      effectiveDate: '2026-07-01',
      priorSalarySar: 10000,
      newSalarySar: 12000,
    });

    expect(promo.prorata_days).toBe(31);
    expect(promo.retro_amount_sar).toBe(2000);
  });

  it('2. Detects upfront leave salary journals (jv-lvpay-*) for automatic payroll deduction', () => {
    const match = computeUpfrontLeavePayrollDeduction({
      employeeId: 'EMP-77',
      employeeName: 'سلمان الدوسري',
      periodMonth: '2026-08',
      journalEntries: [
        {
          id: 'jv-lvpay-8801',
          ref_no: 'JV-LVPAY-8801',
          date: '2026-08-05',
          employee_id: 'EMP-77',
          description: 'صرف راتب الإجازة السنوية مقدماً للموظف سلمان الدوسري عن 2026-08',
          amount: 4500,
        },
        {
          id: 'jv-other-1',
          ref_no: 'JV-OP-1',
          date: '2026-08-10',
          employee_id: 'EMP-77',
          description: 'مصروف تشغيل',
          amount: 900,
        },
      ],
    });

    expect(match.totalUpfrontPaidSar).toBe(4500);
    expect(match.matchedReferences).toEqual(['JV-LVPAY-8801']);
  });

  it('3. Creates & posts balanced GL journal for Off-Cycle Payroll run', async () => {
    const result = await createAndPostOffCyclePayrollRun({
      companyId: 'SAF',
      periodMonth: '2026-08',
      runTitle: 'مكافأة الأداء الربعي',
      runCategory: 'BONUS',
      paymentDate: '2026-08-25',
      items: [
        {
          employeeId: 'EMP-101',
          employeeName: 'فيصل العتيبي',
          department: 'المبيعات',
          grossAmountSar: 5000,
          deductionAmountSar: 500,
          netAmountSar: 4500,
        },
      ],
    });

    expect(result.journalEntryId).toBeTruthy();
    expect(result.run.total_gross_sar).toBe(5000);
    expect(result.run.total_net_sar).toBe(4500);
    const companyJournals = journalEngine.getJournalsByCompany('SAF');
    const posted = companyJournals.find((j) => j.id === result.journalEntryId);
    expect(posted).toBeDefined();
    expect(posted!.totalDebit).toBe(posted!.totalCredit);
    expect(posted!.totalDebit).toBe(5000);
  });

  it('4. Audits Mudad WPS violations, submits masked justifications to Outbox & builds CSV', async () => {
    const violations = auditPayrollForMudadViolations([
      {
        employeeId: 'EMP-M1',
        employeeName: 'عادل السبيعي',
        nationalId: '1088776655',
        grossSalarySar: 10000,
        totalDeductionsSar: 6200,
        netSalarySar: 3800,
        payrollGosiWageSar: 9000,
        registeredGosiWageSar: 8000,
      },
      {
        employeeId: 'EMP-M2',
        employeeName: 'ماجد الغامدي',
        nationalId: '1099887766',
        grossSalarySar: 8000,
        totalDeductionsSar: 8000,
        netSalarySar: 0,
        payrollGosiWageSar: 8000,
        registeredGosiWageSar: 8000,
      },
    ]);

    expect(violations.some((v) => v.violationType === 'DEDUCTION_OVER_50_PCT' && v.suggestedCode === 'MUD-01')).toBe(true);
    expect(violations.some((v) => v.violationType === 'GOSI_WAGE_VARIANCE' && v.suggestedCode === 'MUD-03')).toBe(true);
    expect(violations.some((v) => v.violationType === 'ZERO_NET_PAY' && v.suggestedCode === 'MUD-02')).toBe(true);

    const art93Violation = violations.find((v) => v.violationType === 'DEDUCTION_OVER_50_PCT')!;
    const submitted = await submitMudadJustification({
      companyId: 'SAF',
      periodMonth: '2026-08',
      auditItem: art93Violation,
      mudadReasonCode: 'MUD-01',
      justificationNotes: 'موافقة خطية بموجب المادة 93 لسداد قسط عهدة.',
      supportingReference: 'DOC-ART93-2026',
    });

    expect(submitted.submission_status).toBe('ENQUEUED_TO_MUDAD');
    expect(submitted.outbox_record_id).toBeTruthy();
    expect(submitted.national_id_masked).not.toContain('1088776655');
    expect(submitted.national_id_masked).toContain('*');

    const csv = buildMudadJustificationManifestCsv([submitted]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('MUD-01');
  });

  it('5. Generates ISO-20022 pain.001.001.03 XML & settles B2B bank batch with GL posting', async () => {
    const batch = await createBankB2BPayoutBatch({
      companyId: 'SAF',
      companyName: 'شركة صفوة الموارد للاستثمار',
      periodMonth: '2026-08',
      bankCode: 'ALRAJHI_B2B',
      debitIban: 'SA0380000000608010167519',
      executionDateIso: '2026-08-25',
      instructions: [
        {
          employeeId: 'EMP-1',
          employeeName: 'خالد السليم',
          beneficiaryIban: 'SA4480000000608010999888',
          netSalarySar: 12500.5,
        },
      ],
    });

    expect(batch.pain001_xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.03');
    expect(batch.pain001_xml).toContain('<CtrlSum>12500.50</CtrlSum>');
    expect(batch.pain001_xml).toContain('<NbOfTxs>1</NbOfTxs>');
    expect(batch.pain001_xml).toContain('<BIC>RJHISARI</BIC>');
    expect(batch.debit_iban).toContain('*');

    const settled = await settleBankB2BBatch({
      batch,
      bankAckReference: 'ACK-RJH-8877',
      settlementDateIso: '2026-08-25',
    });

    expect(settled.batch.settlement_status).toBe('SETTLED_ACK');
    expect(settled.journalEntryId).toBeTruthy();
    const posted = journalEngine.getJournalsByCompany('SAF').find((j) => j.id === settled.journalEntryId);
    expect(posted).toBeDefined();
    expect(posted!.totalDebit).toBe(12500.5);
    expect(posted!.totalCredit).toBe(12500.5);
  });

  it('6. Enforces Corporate Card freeze, MCC allowlist, daily limit, ZATCA QR duplicate guard & GL posting', async () => {
    const card = await issueCorporateCard({
      companyId: 'SAF',
      employeeId: 'EMP-CARD-1',
      employeeName: 'محمد الشهري',
      cardType: 'VIRTUAL',
      dailyLimitSar: 500,
      monthlyLimitSar: 5000,
      allowedMccs: ['5812', '4511'],
    });

    const frozenCard = await toggleCorporateCardFreeze(card, 'FROZEN');
    const frozenTry = await authorizeAndRecordCardSpend({
      card: frozenCard,
      merchantName: 'مطعم الضيافة',
      mcc: '5812',
      grossAmountSar: 100,
      entryDateIso: '2026-08-25',
    });
    expect(frozenTry.approved).toBe(false);
    expect(frozenTry.transaction.authorization_status).toBe('DECLINED_FROZEN');

    const activeCard = await toggleCorporateCardFreeze(frozenCard, 'ACTIVE');
    const mccTry = await authorizeAndRecordCardSpend({
      card: activeCard,
      merchantName: 'متجر إلكترونيات',
      mcc: '5732',
      grossAmountSar: 100,
      entryDateIso: '2026-08-25',
    });
    expect(mccTry.transaction.authorization_status).toBe('DECLINED_MCC');

    const limitTry = await authorizeAndRecordCardSpend({
      card: activeCard,
      merchantName: 'الخطوط السعودية',
      mcc: '4511',
      grossAmountSar: 750,
      entryDateIso: '2026-08-25',
    });
    expect(limitTry.transaction.authorization_status).toBe('DECLINED_LIMIT');

    const qrBase64 = buildZatcaTlvBase64([
      [1, 'شركة الضيافة المحدودة'],
      [2, '310122393500003'],
      [3, '2026-08-25T10:30:00Z'],
      [4, '115.00'],
      [5, '15.00'],
    ]);

    const okTry = await authorizeAndRecordCardSpend({
      card: activeCard,
      merchantName: 'Fallback',
      mcc: '5812',
      grossAmountSar: 115,
      zatcaQrRaw: qrBase64,
      entryDateIso: '2026-08-25',
      existingTransactions: [],
    });
    expect(okTry.approved).toBe(true);
    expect(okTry.transaction.authorization_status).toBe('APPROVED');
    expect(okTry.transaction.net_amount_sar).toBe(100);
    expect(okTry.transaction.vat_amount_sar).toBe(15);
    expect(okTry.transaction.journal_entry_id).toBeTruthy();

    const dupTry = await authorizeAndRecordCardSpend({
      card: okTry.updatedCard,
      merchantName: 'Fallback',
      mcc: '5812',
      grossAmountSar: 115,
      zatcaQrRaw: qrBase64,
      entryDateIso: '2026-08-25',
      existingTransactions: [okTry.transaction],
    });
    expect(dupTry.approved).toBe(false);
    expect(dupTry.transaction.authorization_status).toBe('DECLINED_DUPLICATE_QR');
  });

  it('7. Resolves 25th-24th Attendance Cut-off Window & Permission Quota hourly deductions', () => {
    const window = resolveAttendanceCutoffWindow('2026-08', 25, 24);
    expect(window.startDateIso).toBe('2026-07-25');
    expect(window.endDateIso).toBe('2026-08-24');
    expect(window.totalDays).toBe(31);

    const withinQuota = evaluatePermissionQuotaBucket({
      monthlyQuotaHours: 4,
      usedHoursThisCutoff: 1.5,
      requestedHours: 2,
      monthlyGrossSalarySar: 12000,
    });
    expect(withinQuota.exceededQuota).toBe(false);
    expect(withinQuota.excessDeductionSar).toBe(0);

    const overQuota = evaluatePermissionQuotaBucket({
      monthlyQuotaHours: 4,
      usedHoursThisCutoff: 3,
      requestedHours: 3,
      monthlyGrossSalarySar: 12000,
    });
    expect(overQuota.exceededQuota).toBe(true);
    expect(overQuota.coveredByQuotaHours).toBe(1);
    expect(overQuota.excessHours).toBe(2);
    expect(overQuota.hourlyRateSar).toBe(50);
    expect(overQuota.excessDeductionSar).toBe(100);
  });

  it('8. Parses & deduplicates ZKTeco ADMS / BioTime ATTLOG biometric pushes', async () => {
    const rawText = [
      '1001\t2026-08-25 08:00:05\t0\t1',
      '1001\t2026-08-25 17:02:10\t1\t15',
    ].join('\n');

    const parsed = parseAdmsAttlogPayload({
      companyId: 'SAF',
      deviceSn: 'ZK-RUH-99',
      rawText,
      employeeLookup: [{ id: 'EMP-1001', name: 'بدر الزهراني', pin: '1001' }],
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0].punch_state).toBe('CHECK_IN');
    expect(parsed[1].punch_state).toBe('CHECK_OUT');
    expect(parsed[1].verify_mode).toBe('FACE_ID');

    const firstIngest = await ingestAdmsPunchBatch({
      companyId: 'SAF',
      deviceSn: 'ZK-RUH-99',
      rawText,
      employeeLookup: [{ id: 'EMP-1001', name: 'بدر الزهراني', pin: '1001' }],
    });
    expect(firstIngest.inserted).toBe(2);
    expect(firstIngest.duplicatesSkipped).toBe(0);

    const replayIngest = await ingestAdmsPunchBatch({
      companyId: 'SAF',
      deviceSn: 'ZK-RUH-99',
      rawText,
    });
    expect(replayIngest.inserted).toBe(0);
    expect(replayIngest.duplicatesSkipped).toBe(2);
  });

  it('9. Executes Year-End Leave Carryover forfeiture & In-Service Leave Encashment GL', async () => {
    const carryover = await executeYearEndLeaveCarryover({
      companyId: 'SAF',
      fiscalYear: 2026,
      maxCarryoverCapDays: 30,
      employees: [
        { id: 'EMP-L1', name: 'سلطان المالكي', currentBalanceDays: 42 },
        { id: 'EMP-L2', name: 'هدى التميمي', currentBalanceDays: 18 },
      ],
    });

    expect(carryover.total_carried_days).toBe(48);
    expect(carryover.total_forfeited_days).toBe(12);
    expect(carryover.details_json[0].forfeitedDays).toBe(12);

    const encashResult = await executeInServiceLeaveEncashment({
      companyId: 'SAF',
      employeeId: 'EMP-L2',
      employeeName: 'هدى التميمي',
      currentBalanceDays: 20,
      daysToEncash: 6,
      monthlyWageSar: 9000,
      entryDateIso: '2026-08-25',
    });

    expect(encashResult.encashment.daily_rate_sar).toBe(300);
    expect(encashResult.encashment.total_payout_sar).toBe(1800);
    expect(encashResult.encashment.remaining_balance_after).toBe(14);
    const posted = journalEngine.getJournalsByCompany('SAF').find((j) => j.id === encashResult.journalEntryId);
    expect(posted).toBeDefined();
    expect(posted!.totalDebit).toBe(1800);
  });

  it('10. Evaluates Custom Fields & Conditional Workflow Rules (ADD_APPROVER_STEP, REQUIRE_ESIGN, AUTO_APPROVE)', () => {
    const fields: CustomFieldDefinitionRecord[] = [
      {
        id: 'CF-1',
        company_id: 'SAF',
        target_module: 'HR_REQUEST',
        field_key: 'cost_center_justification',
        label_ar: 'مبرر مركز التكلفة',
        field_type: 'TEXT',
        select_options: [],
        is_required: true,
        is_active: true,
        created_at: '2026-08-01',
      },
    ];

    expect(validateCustomFieldValues(fields, {}).valid).toBe(false);
    expect(validateCustomFieldValues(fields, { 'CF-1': 'مشروع التوسع' }).valid).toBe(true);

    const rules: ConditionalWorkflowRule[] = [
      {
        id: 'RULE-1',
        company_id: 'SAF',
        rule_name_ar: 'موافقة الرئيس التنفيذي فوق 10 آلاف',
        request_category: 'EXPENSE_CLAIM',
        condition_field: 'AMOUNT',
        operator: 'GT',
        threshold_value: '10000',
        action_type: 'ADD_APPROVER_STEP',
        extra_approver_role: 'EXECUTIVE_CEO',
        extra_approver_name: 'الرئيس التنفيذي',
        priority: 1,
        is_active: true,
        created_at: '2026-08-01',
      },
      {
        id: 'RULE-2',
        company_id: 'SAF',
        rule_name_ar: 'إلزام التوقيع الإلكتروني',
        request_category: 'EXPENSE_CLAIM',
        condition_field: 'AMOUNT',
        operator: 'GT',
        threshold_value: '10000',
        action_type: 'REQUIRE_ESIGN',
        priority: 2,
        is_active: true,
        created_at: '2026-08-01',
      },
      {
        id: 'RULE-3',
        company_id: 'SAF',
        rule_name_ar: 'اعتماد تلقائي لطلبات تحديث البيانات',
        request_category: 'DATA_UPDATE',
        condition_field: 'AMOUNT',
        operator: 'GTE',
        threshold_value: '0',
        action_type: 'AUTO_APPROVE',
        priority: 3,
        is_active: true,
        created_at: '2026-08-01',
      },
    ];

    const highExpense = HrWorkflowEngine.initiateRequestWorkflow({
      companyId: 'SAF',
      category: 'EXPENSE_CLAIM',
      sourceRecordId: 'EXP-55',
      requesterId: 'EMP-1',
      requesterName: 'ريم المطيري',
      department: 'المشاريع',
      summaryAr: 'مطالبة سفر ومؤتمر',
      amount: 14500,
      conditionalRules: rules,
    });
    expect(highExpense.requires_esign).toBe(true);
    expect(highExpense.steps_state.some((s) => s.roleKey === 'EXECUTIVE_CEO')).toBe(true);

    const autoUpdateReq = HrWorkflowEngine.initiateRequestWorkflow({
      companyId: 'SAF',
      category: 'DATA_UPDATE',
      sourceRecordId: 'UPD-12',
      requesterId: 'EMP-1',
      requesterName: 'ريم المطيري',
      department: 'المشاريع',
      summaryAr: 'تحديث بيانات التواصل البنكي',
      amount: 0,
      conditionalRules: rules,
    });
    expect(autoUpdateReq.overall_status).toBe('APPROVED');
  });

  it('11. Issues OTP challenge & signs document with SHA-256 integrity digest', async () => {
    const challenge = await issueEsignOtpChallenge({
      employeeId: 'EMP-SIGN-1',
      documentId: 'CONTRACT-2026-88',
      channel: 'NAFATH_SIM',
    });

    const badSign = await verifyAndSignDocument({
      companyId: 'SAF',
      challenge,
      enteredOtp: '000000',
      signerName: 'فهد الشمري',
      documentType: 'EMPLOYMENT_CONTRACT',
      documentContentPayload: 'عقد عمل محدد المدة 2026',
    });
    expect(badSign.verified).toBe(false);

    const goodSign = await verifyAndSignDocument({
      companyId: 'SAF',
      challenge,
      enteredOtp: challenge.dispatchedPreviewCode,
      signerName: 'فهد الشمري',
      documentType: 'EMPLOYMENT_CONTRACT',
      documentContentPayload: 'عقد عمل محدد المدة 2026',
    });
    expect(goodSign.verified).toBe(true);
    expect(goodSign.record?.otp_verified).toBe(true);
    expect(goodSign.record?.document_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('12. Computes Saudi Salary Benchmarking (Compa-Ratio) & scores Public Career applications', async () => {
    const benchmark = benchmarkEmployeeSalary('مدير مالي أول', 26000);
    expect(benchmark.marketP50).toBeGreaterThan(0);
    expect(benchmark.compaRatioPct).toBeGreaterThan(0);

    const job = DEFAULT_CAREER_JOB_POSTINGS[0] || {
      id: 'JOB-TEST-01',
      company_id: 'SAF',
      title_ar: 'أخصائي أول موارد بشرية وحماية الأجور (Mudad / Qiwa)',
      department: 'الموارد البشرية والتوطين',
      city: 'الرياض',
      employment_type: 'FULL_TIME' as const,
      salary_min_sar: 9500,
      salary_max_sar: 14500,
      saudization_target: true,
      description_ar: 'إدارة ملفات حماية الأجور وتوثيق عقود قوى',
      requirements_json: ['قوى', 'مدد', 'GOSI', 'نظام العمل السعودي', 'موارد بشرية'],
      is_published: true,
      created_at: '2026-08-01T08:00:00Z',
    };
    const app = await submitCareerPortalApplication({
      job,
      candidateName: 'لولوة السديري',
      email: 'luluah@example.com',
      phone: '0551234567',
      nationalIdRaw: '1055443322',
      nationality: 'سعودية',
      yearsExperience: 5,
      expectedSalarySar: job.salary_min_sar || 8000,
      skillsSummary: job.requirements_json.join(' '),
    });

    expect(app.ai_match_score).toBeGreaterThanOrEqual(70);
    expect(app.national_id_masked).toContain('*');
    expect(app.national_id_masked).not.toContain('1055443322');
  });

  it('13. Suppresses eNPS (< 3 responses), calculates >= 3 responses & builds Celebrations feed', () => {
    const twoResponses: EnpsResponseRecord[] = [
      {
        id: 'R1',
        company_id: 'SAF',
        survey_id: 'SRV-1',
        department_group: 'المالية',
        score: 10,
        category: 'PROMOTER',
        responder_token_hash: 'h1',
        submitted_at: '2026-08-25',
      },
      {
        id: 'R2',
        company_id: 'SAF',
        survey_id: 'SRV-1',
        department_group: 'المالية',
        score: 8,
        category: 'PASSIVE',
        responder_token_hash: 'h2',
        submitted_at: '2026-08-25',
      },
    ];

    const suppressed = calculateEnpsSummary(twoResponses, 3);
    expect(suppressed.isSuppressedForAnonymity).toBe(true);
    expect(suppressed.enpsScore).toBeNull();

    const fourResponses: EnpsResponseRecord[] = [
      ...twoResponses,
      {
        id: 'R3',
        company_id: 'SAF',
        survey_id: 'SRV-1',
        department_group: 'التقنية',
        score: 9,
        category: 'PROMOTER',
        responder_token_hash: 'h3',
        submitted_at: '2026-08-25',
      },
      {
        id: 'R4',
        company_id: 'SAF',
        survey_id: 'SRV-1',
        department_group: 'التقنية',
        score: 4,
        category: 'DETRACTOR',
        responder_token_hash: 'h4',
        submitted_at: '2026-08-25',
      },
    ];

    const computed = calculateEnpsSummary(fourResponses, 3);
    expect(computed.isSuppressedForAnonymity).toBe(false);
    // 2 promoters (50%) - 1 detractor (25%) = +25
    expect(computed.enpsScore).toBe(25);
    expect(computed.averageScore).toBe(7.75);

    const feed = generateCelebrationsFeed({
      companyId: 'SAF',
      employees: [
        { id: 'EMP-C1', name: 'نواف العلي', hireDate: '2021-08-25' },
      ],
      existingKudos: [],
      referenceDateIso: '2026-08-25',
    });
    expect(feed.some((c) => c.event_type === 'WORK_ANNIVERSARY' && c.target_employee_id === 'EMP-C1')).toBe(true);
  });
});
