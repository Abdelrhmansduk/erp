import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SAUDI_PUBLIC_HOLIDAYS,
  calculateNetLeaveDaysExcludingHolidays,
  resolveEffectiveShiftForDate,
  validateShiftSwapRequest,
  HRSD_DISCIPLINARY_CATALOG,
  evaluateDisciplinaryAction,
  encodeZatcaQrTlvBase64,
  decodeZatcaQrTlvBase64,
  computeReceiptFingerprint,
  resolveRealWorkedDaysForMonth,
  calculateEarnedWageAccess,
  computeEmployeeNitaqatWeight,
  computeNitaqatSnapshot,
  evaluateQiwaVisaEligibility,
  calculateSaudiOvertimePay,
  calculateHrFinalSettlement,
  mapSeparationReasonLabelToType,
  computeEmployee360Completeness,
} from './hrAdvancedComplianceEngine';

describe('HR Advanced Compliance Engine (Saudi Labor Law, ZATCA, EWA & Live Qiwa Nitaqat)', () => {
  it('excludes official Saudi public holidays (Eid Al-Fitr & National Day) from annual leave balance deduction', () => {
    expect(DEFAULT_SAUDI_PUBLIC_HOLIDAYS.length).toBeGreaterThanOrEqual(4);
    const res = calculateNetLeaveDaysExcludingHolidays('2026-03-19', '2026-03-25');
    expect(res.calendarDays).toBe(7);
    expect(res.excludedHolidayDays).toBe(4);
    expect(res.netDeductibleLeaveDays).toBe(3);
    expect(res.matchedHolidays[0]).toContain('عيد الفطر');

    const natDay = calculateNetLeaveDaysExcludingHolidays('2026-09-22', '2026-09-24');
    expect(natDay.excludedHolidayDays).toBe(1);
    expect(natDay.netDeductibleLeaveDays).toBe(2);
  });

  it('resolves effective shift priority (Approved Swap > Monthly Roster > Default Shift) and validates swaps', () => {
    const effective = resolveEffectiveShiftForDate(
      'EMP-1',
      '2026-11-15',
      'SHF-MAIN-FIXED',
      [
        {
          id: 'R1',
          employeeId: 'EMP-1',
          employeeName: 'أحمد',
          rosterDate: '2026-11-15',
          shiftId: 'SHF-MORNING',
          shiftName: 'صباحية',
          isDayOff: false,
        },
      ],
      [
        {
          id: 'SW1',
          requesterId: 'EMP-1',
          requesterName: 'أحمد',
          targetEmployeeId: 'EMP-2',
          targetEmployeeName: 'خالد',
          swapDate: '2026-11-15',
          requesterShiftId: 'SHF-MORNING',
          targetShiftId: 'SHF-EVENING',
          reason: 'ظرف عائلي',
          colleagueAccepted: true,
          status: 'معتمد',
        },
      ]
    );
    expect(effective.source).toBe('SWAP');
    expect(effective.shiftId).toBe('SHF-EVENING');

    const invalidSelf = validateShiftSwapRequest({
      requesterId: 'EMP-1',
      targetEmployeeId: 'EMP-1',
      swapDate: '2026-11-20',
      requesterShiftId: 'SHF-A',
      targetShiftId: 'SHF-B',
      existingSwaps: [],
    });
    expect(invalidSelf.valid).toBe(false);
  });

  it('enforces Saudi Labor Law Art. 69 (30-day discovery), Art. 71 (mandatory investigation), 180-day decay, and Art. 67 (5-day monthly cap)', () => {
    expect(HRSD_DISCIPLINARY_CATALOG.length).toBeGreaterThanOrEqual(5);

    // 1. Art. 69 block (>30 days since discovery)
    const expiredDiscovery = evaluateDisciplinaryAction({
      employeeId: 'EMP-10',
      monthlyBasicSalary: 6000,
      violationCode: 'VIO-ABSENT-NO-EXCUSE',
      incidentDate: '2026-09-01',
      discoveryDate: '2026-09-02',
      decisionDate: '2026-10-15',
      investigationSessionDate: '2026-10-10',
      investigationMinutesRef: 'INV-101',
      employeeDefenseSummary: 'تم سماع أقوال الموظف',
      priorRecords: [],
    });
    expect(expiredDiscovery.allowed).toBe(false);
    expect(expiredDiscovery.blockingReasonAr).toContain('المادة 69');

    // 2. Art. 71 block (missing investigation minutes on financial deduction)
    const missingInvestigation = evaluateDisciplinaryAction({
      employeeId: 'EMP-10',
      monthlyBasicSalary: 6000,
      violationCode: 'VIO-ABSENT-NO-EXCUSE',
      incidentDate: '2026-11-10',
      discoveryDate: '2026-11-10',
      decisionDate: '2026-11-12',
      priorRecords: [],
    });
    expect(missingInvestigation.allowed).toBe(false);
    expect(missingInvestigation.blockingReasonAr).toContain('المادة 71');

    // 3. 180-day decay resets occurrence while Art. 67 caps monthly deduction at 5 days
    const validWithCapAndDecay = evaluateDisciplinaryAction({
      employeeId: 'EMP-10',
      monthlyBasicSalary: 6000, // daily wage = 200 ⃁
      violationCode: 'VIO-SAFETY-BREACH',
      incidentDate: '2026-11-12',
      discoveryDate: '2026-11-12',
      decisionDate: '2026-11-14',
      investigationSessionDate: '2026-11-13',
      investigationMinutesRef: 'INV-2026-55',
      employeeDefenseSummary: 'أقر الموظف بالمخالفة وتعهد بالالتزام',
      priorRecords: [
        {
          employeeId: 'EMP-10',
          violationCode: 'VIO-SAFETY-BREACH',
          incidentDate: '2026-01-01',
          payrollMonth: '2026-01',
          appliedMonthDays: 1,
          status: 'معتمد ونافذ',
        },
        {
          employeeId: 'EMP-10',
          violationCode: 'VIO-SAFETY-BREACH',
          incidentDate: '2026-11-02',
          payrollMonth: '2026-11',
          appliedMonthDays: 4,
          status: 'معتمد ونافذ',
        },
      ],
    });

    expect(validWithCapAndDecay.allowed).toBe(true);
    expect(validWithCapAndDecay.decayedCountOver180Days).toBe(1);
    expect(validWithCapAndDecay.occurrenceNumber).toBe(2);
    expect(validWithCapAndDecay.rawDeductionDays).toBe(3);
    expect(validWithCapAndDecay.appliedMonthDays).toBe(1);
    expect(validWithCapAndDecay.carriedForwardDays).toBe(2);
    expect(validWithCapAndDecay.appliedDeductionAmount).toBe(200);
  });

  it('encodes and decodes Saudi ZATCA TLV Base64 QR receipts and generates deterministic duplicate fingerprints', () => {
    const b64 = encodeZatcaQrTlvBase64({
      sellerName: 'محطة الدريس للخدمات البترولية',
      vatRegistrationNumber: '300055667700003',
      invoiceTimestamp: '2026-11-14T14:20:00Z',
      totalWithVat: 230,
      vatAmount: 30,
    });

    const decoded = decodeZatcaQrTlvBase64(b64);
    expect(decoded.valid).toBe(true);
    expect(decoded.sellerName).toBe('محطة الدريس للخدمات البترولية');
    expect(decoded.vatRegistrationNumber).toBe('300055667700003');
    expect(decoded.totalWithVat).toBe(230);
    expect(decoded.vatAmount).toBe(30);
    expect(decoded.netBeforeVat).toBe(200);
    expect(decoded.receiptFingerprint).toBe(
      computeReceiptFingerprint('300055667700003', '2026-11-14T14:20:00Z', 230)
    );
  });

  it('resolves verified worked days from real attendance punches or hire/month start and computes Earned Wage Access (EWA)', () => {
    const punchBased = resolveRealWorkedDaysForMonth({
      employeeId: 'EMP-50',
      employeeName: 'عبدالله السبيعي',
      payrollMonth: '2026-11',
      referenceDateIso: '2026-11-14',
      attendances: [
        { employee_id: 'EMP-50', date: '2026-11-01', status: 'حاضر' },
        { employee_id: 'EMP-50', date: '2026-11-02', status: 'حاضر' },
        { employee_id: 'EMP-50', date: '2026-11-03', status: 'غائب' },
        { emp_name: 'عبدالله السبيعي', date: '2026-11-04', status: 'متأخر' },
      ],
    });
    expect(punchBased.source).toBe('ATTENDANCE_PUNCHES');
    expect(punchBased.workedDaysToDate).toBe(3);

    const calendarSynced = resolveRealWorkedDaysForMonth({
      employeeId: 'EMP-51',
      employeeName: 'نورة الحربي',
      hireDate: '2026-11-05',
      payrollMonth: '2026-11',
      referenceDateIso: '2026-11-14',
      attendances: [],
    });
    expect(calendarSynced.source).toBe('CALENDAR_ELAPSED_SYNC');
    expect(calendarSynced.workedDaysToDate).toBe(10);

    const ewa = calculateEarnedWageAccess({
      basicSalary: 8000,
      housingAllowance: 2000,
      transportAllowance: 1000,
      isSaudi: true, // GOSI 9.75% of 10,000 = 975 -> net = 10,025
      dayOfMonth: 15, // half month earned = 5,012.50 -> 50% cap = 2,506.25
      alreadyWithdrawnThisMonth: 500,
    });
    expect(ewa.monthlyNetEstimated).toBe(10025);
    expect(ewa.availableWithdrawableAmount).toBe(2006.25);
    expect(ewa.shariaTransferFee).toBe(0);
  });

  it('computes real Qiwa Nitaqat employee weights and enforces Red-band visa blocking vs Green/Platinum approval', () => {
    expect(computeEmployeeNitaqatWeight({ id: '1', isSaudi: true, totalWage: 4500 }).weight).toBe(1.0);
    expect(computeEmployeeNitaqatWeight({ id: '2', isSaudi: true, totalWage: 3500 }).weight).toBe(0.5);
    expect(computeEmployeeNitaqatWeight({ id: '3', isSaudi: true, totalWage: 2500 }).weight).toBe(0);
    expect(
      computeEmployeeNitaqatWeight({
        id: '4',
        isSaudi: true,
        totalWage: 4200,
        isDisabledSaudi: true,
      }).weight
    ).toBe(4.0);
    expect(
      computeEmployeeNitaqatWeight({
        id: '5',
        isSaudi: true,
        totalWage: 4200,
        isStudentOrFlexible: true,
      }).weight
    ).toBe(0.5);
    expect(computeEmployeeNitaqatWeight({ id: '6', isSaudi: false, totalWage: 6000 }).weight).toBe(0);

    // Red band scenario: 0.5 Saudi points across 8 headcount = 6.25% (< 16%)
    const redWorkforce = [
      { id: 'S1', isSaudi: true, totalWage: 3500 },
      { id: 'E1', isSaudi: false, totalWage: 2500 },
      { id: 'E2', isSaudi: false, totalWage: 2500 },
      { id: 'E3', isSaudi: false, totalWage: 2500 },
      { id: 'E4', isSaudi: false, totalWage: 2500 },
      { id: 'E5', isSaudi: false, totalWage: 2500 },
      { id: 'E6', isSaudi: false, totalWage: 2500 },
      { id: 'E7', isSaudi: false, totalWage: 2500 },
    ];
    const redSnap = computeNitaqatSnapshot(redWorkforce);
    expect(redSnap.band).toBe('أحمر');

    const blockedVisa = evaluateQiwaVisaEligibility({
      employees: redWorkforce,
      requestType: 'NEW_WORK_VISA',
      requestedCount: 1,
    });
    expect(blockedVisa.eligible).toBe(false);
    expect(blockedVisa.decisionCode).toBe('BLOCKED_RED_BAND');

    // Platinum / High Green scenario after adding 1 disabled Saudi (4.0 pts -> 4.5 / 9 = 50% Platinum)
    const platinumWorkforce = [
      ...redWorkforce,
      { id: 'S-DIS', isSaudi: true, totalWage: 4500, isDisabledSaudi: true },
    ];
    const platSnap = computeNitaqatSnapshot(platinumWorkforce);
    expect(platSnap.weightedSaudiPoints).toBe(4.5);
    expect(platSnap.band).toBe('بلاتيني');

    const approvedVisa = evaluateQiwaVisaEligibility({
      employees: platinumWorkforce,
      requestType: 'SPONSORSHIP_TRANSFER_IN',
      requestedCount: 2,
    });
    expect(approvedVisa.eligible).toBe(true);
    expect(approvedVisa.decisionCode).toBe('APPROVED_ELIGIBLE');
  });

  it('calculates Saudi Labor Law Art. 107 overtime (actual + 50% basic regular, actual + 100% basic holiday) and tardiness/absence', () => {
    // Basic = 7,200 (30/hr), Housing = 1,800, Transport = 600 -> Gross = 9,600 (40/hr)
    // Regular OT rate = 40 + 15 = 55/hr | Holiday OT rate = 40 + 30 = 70/hr
    const ot = calculateSaudiOvertimePay({
      basicSalary: 7200,
      housingAllowance: 1800,
      transportAllowance: 600,
      regularOvertimeHours: 4, // 220
      holidayOrEidOvertimeHours: 2, // 140
      lateAndEarlyMinutes: 60, // 1 hour * 40 = 40
      unpaidAbsenceDays: 1, // 9,600 / 30 = 320
    });

    expect(ot.basicHourlyWage).toBe(30);
    expect(ot.actualHourlyWage).toBe(40);
    expect(ot.regularOvertimeHourlyRate).toBe(55);
    expect(ot.holidayOvertimeHourlyRate).toBe(70);
    expect(ot.regularOvertimePay).toBe(220);
    expect(ot.holidayOvertimePay).toBe(140);
    expect(ot.totalOvertimePay).toBe(360);
    expect(ot.lateAndEarlyDeductionAmount).toBe(40);
    expect(ot.unpaidAbsenceDeductionAmount).toBe(320);
    expect(ot.netAttendancePayrollImpact).toBe(0);
  });

  it('computes comprehensive final settlement across Art. 84, Art. 85 resignation tiers, Art. 87, Art. 80, and Art. 111 leave encashment', () => {
    expect(mapSeparationReasonLabelToType('استقالة نظامية (المادة 85)')).toBe('RESIGNATION_ART85');
    expect(mapSeparationReasonLabelToType('فسخ عقد تأديبي (المادة 80)')).toBe('DISCIPLINARY_ART80');
    expect(mapSeparationReasonLabelToType('استقالة زواج / وضع للموظفة (المادة 87)')).toBe(
      'FORCE_MAJEURE_OR_MATERNITY_ART87'
    );
    expect(mapSeparationReasonLabelToType('انتهاء مدة العقد الموحد (المادة 84)')).toBe(
      'CONTRACT_EXPIRY_OR_EMPLOYER_ART84'
    );

    // 1. Art. 85 resignation < 2 years -> 0% EOSB, still receives pro-rata pay & Art. 111 unused leave
    const shortResignation = calculateHrFinalSettlement({
      hireDate: '2025-11-15',
      lastWorkingDay: '2026-11-14',
      basicSalary: 6000,
      housingAllowance: 2000,
      transportAllowance: 1000, // Gross = 9,000 (300/day)
      isSaudi: false,
      separationType: 'RESIGNATION_ART85',
      unusedLeaveDays: 10, // 3,000
      earnedCurrentMonthDays: 15, // 4,500
      remainingAdvancesBalance: 1000,
      unsettledEwaBalance: 500,
    });
    expect(shortResignation.eosbRatioApplied).toBe(0);
    expect(shortResignation.netEosbEntitlement).toBe(0);
    expect(shortResignation.unusedLeaveCompensation).toBe(3000);
    expect(shortResignation.proRataCurrentMonthNet).toBe(4500);
    expect(shortResignation.totalDeductions).toBe(1500);
    expect(shortResignation.netPayable).toBe(6000);

    // 2. Art. 85 resignation ~3 years (between 2 and 5 years) -> 1/3 EOSB
    const midResignation = calculateHrFinalSettlement({
      hireDate: '2023-01-01',
      lastWorkingDay: '2026-01-01',
      basicSalary: 6000,
      housingAllowance: 2000,
      transportAllowance: 1000,
      isSaudi: true,
      separationType: 'RESIGNATION_ART85',
      unusedLeaveDays: 0,
      earnedCurrentMonthDays: 0,
    });
    expect(midResignation.eosbRatioApplied).toBeCloseTo(0.3333, 3);
    expect(midResignation.netEosbEntitlement).toBeGreaterThan(4400);

    // 3. Art. 80 disciplinary -> 0% EOSB
    const art80 = calculateHrFinalSettlement({
      hireDate: '2018-01-01',
      lastWorkingDay: '2026-11-14',
      basicSalary: 6000,
      housingAllowance: 2000,
      transportAllowance: 1000,
      isSaudi: true,
      separationType: 'DISCIPLINARY_ART80',
      unusedLeaveDays: 5,
      earnedCurrentMonthDays: 0,
    });
    expect(art80.netEosbEntitlement).toBe(0);
    expect(art80.unusedLeaveCompensation).toBe(1500);
  });

  it('evaluates Employee 360° profile completeness across all 14 Saudi HR/Qiwa/GOSI/WPS/CCHI/PDPL checks', () => {
    const completeProfile = computeEmployee360Completeness({
      name: 'سلطان خالد السليم',
      name_en: 'Sultan Khalid Al-Sulaim',
      national_id: '1098765432',
      iqama_expiry: '2028-12-31',
      job_title: 'مدير العمليات',
      department: 'التشغيل والاستقدام',
      manager_id: 'EMP-CEO-01',
      hire_date: '2022-03-01',
      qiwa_contract_no: 'QW-998877',
      qiwa_contract_expiry: '2027-03-01',
      gosi_number: '445566778',
      medical_insurance_provider: 'بوبا العربية',
      medical_insurance_expiry: '2027-06-30',
      iban: 'SA0380000000608010167519',
      basic_salary: 9000,
      phone: '0501234567',
      email: 'sultan@alsulaim.sa',
      emergency_contact_name: 'خالد السليم',
      emergency_contact_phone: '0509876543',
      national_address: 'RRRD2929 - حي الملقا - الرياض',
    });

    expect(completeProfile.completedCount).toBe(14);
    expect(completeProfile.totalChecks).toBe(14);
    expect(completeProfile.scorePercent).toBe(100);
    expect(completeProfile.readinessTierAr).toBe('مكتمل وممتثل 100%');
    expect(completeProfile.missingFieldsAr).toHaveLength(0);

    const incompleteProfile = computeEmployee360Completeness({
      name: 'موظف جديد',
      national_id: '1055443322',
      basic_salary: 5000,
    });
    expect(incompleteProfile.scorePercent).toBeLessThan(50);
    expect(incompleteProfile.readinessTierAr).toBe('يحتاج استكمال بيانات');
    expect(incompleteProfile.missingFieldsAr.length).toBeGreaterThan(8);
  });
});
