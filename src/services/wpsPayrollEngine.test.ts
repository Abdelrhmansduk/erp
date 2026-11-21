import { describe, it, expect } from 'vitest';
import { WpsPayrollEngine } from './wpsPayrollEngine';

describe('WpsPayrollEngine — Saudi Labor Law & WPS Enterprise Suite', () => {
  describe('1. GOSI Contributions (Saudi, Non-Saudi, 45k Cap & 2024/2026 Reform)', () => {
    it('calculates standard Saudi GOSI (9.75% employee, 11.75% employer)', () => {
      const res = WpsPayrollEngine.calculateGosi(7000, 2000, true);
      expect(res.contributoryWage).toBe(9000);
      expect(res.employeeShare).toBe(877.5);
      expect(res.employerShare).toBe(1057.5);
      expect(res.totalGosi).toBe(1935);
    });

    it('calculates Non-Saudi GOSI (0% employee, 2% employer occupational hazard)', () => {
      const res = WpsPayrollEngine.calculateGosi(4000, 1000, false);
      expect(res.contributoryWage).toBe(5000);
      expect(res.employeeShare).toBe(0);
      expect(res.employerShare).toBe(100);
      expect(res.totalGosi).toBe(100);
    });

    it('enforces the 45,000 SAR maximum contributory wage ceiling', () => {
      const res = WpsPayrollEngine.calculateGosi(50000, 15000, true);
      expect(res.contributoryWage).toBe(45000);
      expect(res.employeeShare).toBe(Number((45000 * 0.0975).toFixed(2)));
    });

    it('supports Post-July 2024 gradual GOSI reform rates for new subscribers', () => {
      const res2026 = WpsPayrollEngine.calculateGosi(8000, 2000, true, {
        isNewSubscriberPostJuly2024: true,
        calculationYear: 2026,
      });
      // 2026: 10% annuities + 0.75% Saned = 10.75% employee; + 2% hazard = 12.75% employer
      expect(res2026.employeeRatePercent).toBe(10.75);
      expect(res2026.employerRatePercent).toBe(12.75);
      expect(res2026.employeeShare).toBe(1075);
      expect(res2026.employerShare).toBe(1275);
    });
  });

  describe('2. End of Service Gratuity (Articles 84 & 85) & Final Clearance', () => {
    it('awards 0% on resignation before completing 2 years (Art. 85)', () => {
      const eos = WpsPayrollEngine.calculateEndOfService({
        startDate: '2025-01-01',
        endDate: '2026-06-01',
        lastBasicSalary: 7000,
        totalAllowances: 3000,
        contractType: 'UNLIMITED',
        separationReason: 'RESIGNATION',
      });
      expect(eos.entitlementPercentage).toBe(0);
      expect(eos.awardAmount).toBe(0);
    });

    it('awards 1/3 on resignation between 2 and 5 years (Art. 85)', () => {
      const eos = WpsPayrollEngine.calculateEndOfService({
        startDate: '2023-01-01',
        endDate: '2026-01-01',
        lastBasicSalary: 6000,
        totalAllowances: 3000,
        contractType: 'UNLIMITED',
        separationReason: 'RESIGNATION',
      });
      expect(eos.entitlementPercentage).toBeCloseTo(33.333, 2);
      expect(eos.awardAmount).toBeGreaterThan(4400);
      expect(eos.awardAmount).toBeLessThan(4600);
    });

    it('awards 100% on employer termination and computes final clearance with advance deduction', () => {
      const clearance = WpsPayrollEngine.calculateFinalClearance({
        startDate: '2020-01-01',
        endDate: '2026-01-01',
        lastBasicSalary: 7000,
        totalAllowances: 3000,
        contractType: 'FIXED_TERM',
        separationReason: 'TERMINATION_BY_EMPLOYER',
        unusedLeaveDays: 15,
        workedDaysInFinalMonth: 15,
        remainingAdvanceBalance: 2000,
        custodyCleared: true,
      });
      expect(clearance.entitlementPercentage).toBe(100);
      expect(clearance.leaveBalanceCompensation).toBe(5000); // 15 days * (10000/30)
      expect(clearance.finalMonthSalaryPayable).toBe(5000);
      expect(clearance.netFinalPayable).toBeCloseTo(
        clearance.awardAmount + 5000 + 5000 - 2000,
        1
      );
      expect(clearance.canIssueClearanceCertificate).toBe(true);
    });

    it('blocks clearance certificate when custody is not cleared', () => {
      const clearance = WpsPayrollEngine.calculateFinalClearance({
        startDate: '2022-01-01',
        endDate: '2026-01-01',
        lastBasicSalary: 6000,
        totalAllowances: 2000,
        contractType: 'FIXED_TERM',
        separationReason: 'CONTRACT_EXPIRY',
        custodyCleared: false,
      });
      expect(clearance.canIssueClearanceCertificate).toBe(false);
      expect(clearance.clearanceBlockReason).toContain('العهد');
    });
  });

  describe('3. Leave Accrual (Art. 109), Sick Leave Tiers (Art. 117) & Overtime (Art. 107)', () => {
    it('grants 21 days/year before 5 years and 30 days/year after 5 years', () => {
      const junior = WpsPayrollEngine.calculateAnnualLeaveEntitlement('2024-01-01', '2026-01-01');
      expect(junior.annualEntitlementDays).toBe(21);
      expect(junior.monthlyAccrualRate).toBe(1.75);

      const senior = WpsPayrollEngine.calculateAnnualLeaveEntitlement('2019-01-01', '2026-01-01');
      expect(senior.annualEntitlementDays).toBe(30);
      expect(senior.monthlyAccrualRate).toBe(2.5);
    });

    it('computes sick leave tiers (30d 100%, 60d 75%, 30d 0%) per Art. 117', () => {
      const sick = WpsPayrollEngine.calculateSickLeavePay(300, 25, 15);
      // Days 26..30 = 5 days at 100%; Days 31..40 = 10 days at 75%
      expect(sick.fullPayDays).toBe(5);
      expect(sick.threeQuarterPayDays).toBe(10);
      expect(sick.unpaidDays).toBe(0);
      expect(sick.payableAmount).toBe(5 * 300 + 10 * 300 * 0.75);
    });

    it('computes overtime pay per Art. 107', () => {
      const ot = WpsPayrollEngine.calculateOvertimePay(4800, 7200, 10);
      // hourlyBasic = 4800/240 = 20; hourlyTotal = 7200/240 = 30; rate = 30 + 10 = 40
      expect(ot.hourlyBasic).toBe(20);
      expect(ot.hourlyTotal).toBe(30);
      expect(ot.overtimeRatePerHour).toBe(40);
      expect(ot.totalOvertimePay).toBe(400);
    });
  });

  describe('4. Article 92 (50% Deduction Cap) & Balanced Double-Entry GL Journal', () => {
    it('caps total monthly deductions at 50% of gross wage and carries forward excess', () => {
      const item = WpsPayrollEngine.calculateComprehensivePayrollItem({
        employeeId: 'emp-1',
        employeeNumber: 'EMP-001',
        nationalIdOrIqama: '1012345678',
        employeeName: 'موظف اختبار',
        isSaudi: true,
        basicSalary: 7000,
        housingAllowance: 2000,
        transportAllowance: 1000,
        advanceInstallment: 4500,
        sanctionAmount: 1000,
      });

      // Gross = 10,000 -> Max total deduction (50%) = 5,000
      // GOSI employee = 9000 * 0.0975 = 877.50 -> Max non-GOSI allowed = 4,122.50
      // Raw non-GOSI = 5,500 -> Carried forward = 1,377.50 -> Net salary = 5,000.00
      expect(item.deductionCapApplied).toBe(true);
      expect(item.netSalary).toBe(5000);
      expect(item.carriedForwardDeduction).toBe(1377.5);
    });

    it('generates a strictly balanced double-entry GL payroll journal', () => {
      const item1 = WpsPayrollEngine.calculateComprehensivePayrollItem({
        employeeId: 'emp-1',
        employeeNumber: 'EMP-001',
        nationalIdOrIqama: '1012345678',
        employeeName: 'موظف 1',
        isSaudi: true,
        basicSalary: 7000,
        housingAllowance: 2000,
        transportAllowance: 1000,
        advanceInstallment: 1000,
        sanctionAmount: 250,
        rewardsAmount: 500,
      });

      const gl = WpsPayrollEngine.buildPayrollGlJournalEntry('2026-11', 'SAF', [item1]);
      expect(gl.isBalanced).toBe(true);
      expect(gl.totalDebit).toBe(gl.totalCredit);
      expect(gl.lines.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('5. Saudi IBAN Validator, Nitaqat & Document Expiry Radar', () => {
    it('validates Saudi IBAN format and detects bank code', () => {
      const valid = WpsPayrollEngine.validateSaudiIban('SA03 8000 0000 6080 1016 7519');
      expect(valid.isValid).toBe(true);
      expect(valid.bankCode).toBe('ALRAJHI');

      const invalid = WpsPayrollEngine.validateSaudiIban('AE0380000000123');
      expect(invalid.isValid).toBe(false);
    });

    it('computes Nitaqat band and scans document expiries accurately', () => {
      const nitaqat = WpsPayrollEngine.calculateNitaqatStatus([
        { national_id: '1092837410', salary: 12000, status: 'نشط' },
        { national_id: '2498102931', salary: 4000, status: 'نشط' },
      ]);
      expect(nitaqat.saudizationPercentage).toBe(50);
      expect(nitaqat.nitaqatBand).toBe('بلاتيني');

      const alerts = WpsPayrollEngine.scanDocumentExpiries(
        [
          {
            id: 'emp-1',
            name: 'فهد',
            iqama_expiry_date: '2026-11-08',
            contract_end_date: '2026-10-01',
          },
        ],
        '2026-11-04'
      );
      expect(alerts.some((a) => a.severity === 'EXPIRED')).toBe(true);
      expect(alerts.some((a) => a.severity === 'CRITICAL_7D')).toBe(true);
    });
  });

  describe('6. Sanction Cap (Art. 66/70), Advance Cap (Art. 93) & Leave Classification', () => {
    it('caps disciplinary sanctions at 5 days of basic salary per violation and per month (Articles 66 & 70)', () => {
      // Basic salary = 6,000 -> daily = 200 -> max 5 days = 1,000 SAR
      const res = WpsPayrollEngine.validateSanctionCap(6000, 1500, 200);
      expect(res.maxFiveDaysBasicWage).toBe(1000);
      expect(res.wasCapped).toBe(true);
      expect(res.allowedAmountThisMonth).toBe(800);
      expect(res.excessCarriedForward).toBe(700);
    });

    it('validates advance monthly installment against the 10% ceiling (Article 93)', () => {
      const withinCap = WpsPayrollEngine.validateAdvanceInstallmentCap(10000, 900);
      expect(withinCap.exceedsTenPercent).toBe(false);
      expect(withinCap.maxTenPercentInstallment).toBe(1000);

      const overCap = WpsPayrollEngine.validateAdvanceInstallmentCap(10000, 1500);
      expect(overCap.exceedsTenPercent).toBe(true);
    });

    it('only deducts Annual Leave from annual leave balance and classifies Sick/Personal/Unpaid leaves accurately', () => {
      const annual = WpsPayrollEngine.classifyLeaveDeductionRule('إجازة اعتيادية سنوية', 5, 300);
      expect(annual.deductFromAnnualBalance).toBe(true);
      expect(annual.annualDaysToDeduct).toBe(5);

      const sick = WpsPayrollEngine.classifyLeaveDeductionRule('إجازة مرضية بتقرير طبي معتمد (صحتي)', 10, 300, 25);
      expect(sick.deductFromAnnualBalance).toBe(false);
      expect(sick.annualDaysToDeduct).toBe(0);
      expect(sick.legalReference).toContain('117');

      const bereavement = WpsPayrollEngine.classifyLeaveDeductionRule('إجازة وفاة قريب / زواج (5 أيام مدفوعة)', 5, 300);
      expect(bereavement.deductFromAnnualBalance).toBe(false);
      expect(bereavement.annualDaysToDeduct).toBe(0);

      const unpaid = WpsPayrollEngine.classifyLeaveDeductionRule('إجازة استثنائية بدون راتب', 4, 300);
      expect(unpaid.deductFromAnnualBalance).toBe(false);
      expect(unpaid.unpaidDaysForPayroll).toBe(4);
    });
  });

  describe('7. HR 2.0 Extensions: Art. 87 EOSB, Cost-Center Splitting, IFRS Accruals & Skip Installment', () => {
    it('awards 100% EOSB under Article 87 (female marriage/maternity resignation) even under 2 years', () => {
      const eos = WpsPayrollEngine.calculateEndOfService({
        startDate: '2025-06-01',
        endDate: '2026-11-01',
        lastBasicSalary: 6000,
        totalAllowances: 3000,
        contractType: 'FIXED_TERM',
        separationReason: 'MARRIAGE_OR_MATERNITY_ART87',
      });
      expect(eos.entitlementPercentage).toBe(100);
      expect(eos.awardAmount).toBeGreaterThan(6000);
      expect(eos.legalArticleNote).toContain('87');
    });

    it('splits payroll GL journal debit lines across employee cost center allocations with exact equilibrium', () => {
      const item = WpsPayrollEngine.calculateComprehensivePayrollItem({
        employeeId: 'emp-split',
        employeeNumber: 'EMP-900',
        nationalIdOrIqama: '1012345678',
        employeeName: 'طلال الشهري',
        isSaudi: true,
        basicSalary: 7000,
        housingAllowance: 2000,
        transportAllowance: 1000,
      });
      item.costCenterAllocations = [
        { code: 'CC-OPS-01', name: 'عمليات الاستقدام', percent: 60 },
        { code: 'CC-SHELTER-03', name: 'مركز الإيواء', percent: 40 },
      ];

      const gl = WpsPayrollEngine.buildCostAllocatedPayrollGlJournal('2026-11', 'SAF', [item]);
      expect(gl.isBalanced).toBe(true);
      expect(gl.totalDebit).toBe(gl.totalCredit);

      const salaryDebits = gl.lines.filter((l) => l.accountCode === '530101');
      expect(salaryDebits).toHaveLength(2);
      expect(salaryDebits[0].debit).toBe(6000);
      expect(salaryDebits[1].debit).toBe(4000);
    });

    it('builds balanced monthly IFRS HR accruals (EOSB, Leave, Tickets, Medical Amortization)', () => {
      const acc = WpsPayrollEngine.buildMonthlyHrAccrualsJournal('2026-11', 'SAF', [
        {
          id: 'emp-1',
          name: 'موظف 1',
          hire_date: '2024-01-01',
          salary: 12000,
          annual_ticket_allowance: 2400,
          medical_insurance_annual_cost: 3600,
          status: 'نشط',
        },
      ]);
      expect(acc.eosbProvisionAmount).toBe(500); // (12000/2)/12
      expect(acc.leaveProvisionAmount).toBe(700); // (12000/30)*1.75
      expect(acc.ticketProvisionAmount).toBe(200);
      expect(acc.medicalAmortizationAmount).toBe(300);
      expect(acc.journalPayload.isBalanced).toBe(true);
      expect(acc.journalPayload.totalDebit).toBe(acc.journalPayload.totalCredit);
    });

    it('defers loan installment when payrollMonth is in deferred_months (Skip Installment)', () => {
      const deferred = WpsPayrollEngine.getEffectiveAdvanceInstallmentForMonth(
        {
          amount: 6000,
          remaining_amount: 4000,
          monthly_installment: 1000,
          installments_count: 6,
          deferred_months: ['2026-03'],
          status: 'معتمد',
        },
        '2026-03'
      );
      expect(deferred.isDeferredThisMonth).toBe(true);
      expect(deferred.effectiveInstallment).toBe(0);

      const normal = WpsPayrollEngine.getEffectiveAdvanceInstallmentForMonth(
        {
          amount: 6000,
          remaining_amount: 4000,
          monthly_installment: 1000,
          installments_count: 6,
          deferred_months: ['2026-03'],
          status: 'معتمد',
        },
        '2026-04'
      );
      expect(normal.isDeferredThisMonth).toBe(false);
      expect(normal.effectiveInstallment).toBe(1000);
    });
  });

  describe('Saudi Labor Law Payroll Automation (Art. 117 Sick Tiers, Art. 109 21/30 Upgrade, HRSD Lateness Schedule)', () => {
    it('automatically computes progressive lateness penalties and enforces Art. 66 5-day monthly fine cap', () => {
      // Daily wage = 300 SAR, Basic = 6000 SAR (5-day basic cap = 1000 SAR)
      const res = WpsPayrollEngine.calculateSaudiLatenessPenalties(300, 6000, [
        { minutesLate: 20 }, // 1st 15-30m => written warning (0%)
        { minutesLate: 25 }, // 2nd 15-30m => 5% = 15
        { minutesLate: 28 }, // 3rd 15-30m => 10% = 30
        { minutesLate: 20, excused: true }, // excused => 0
        { minutesLate: 45 }, // 1st 31-60m => 10% = 30
      ]);
      expect(res.unexcusedCount).toBe(4);
      expect(res.writtenWarnings).toBe(1);
      expect(res.rawPenaltyAmount).toBe(75);
      expect(res.allowedPenaltyThisMonth).toBe(75);
      expect(res.wasCappedByArt66).toBe(false);
    });

    it('integrates Art. 117 sick leave tiers, Art. 109 21/30 annual upgrade, and lateness penalties directly into payroll items', () => {
      // Fixed wage = 9000 SAR => daily wage = 300 SAR
      // Previous sick days = 28, this month = 5 => 2 days @100% (0 ded) + 3 days @75% (25% ded = 225 SAR)
      // Hire date = 2020-01-01 vs 2026-11-21 => >5 years => auto-upgraded to 30 days (2.5/month)
      const item = WpsPayrollEngine.calculateComprehensivePayrollItem({
        employeeId: 'EMP-99',
        employeeNumber: '99',
        nationalIdOrIqama: '1099887766',
        employeeName: 'سعد بن محمد القحطاني',
        isSaudi: true,
        basicSalary: 6000,
        housingAllowance: 2000,
        transportAllowance: 1000,
        hireDate: '2020-01-01',
        referenceDate: '2026-11-21',
        previousSickDaysInYear: 28,
        sickDaysThisMonth: 5,
        latenessEvents: [
          { minutesLate: 20 }, // warning 0%
          { minutesLate: 25 }, // 5% of 300 = 15 SAR
        ],
      });

      expect(item.sickLeaveDeduction).toBe(225);
      expect(item.latenessPenaltyDeduction).toBe(15);
      expect(item.annualLeaveEntitlementDays).toBe(30);
      expect(item.annualLeaveMonthlyAccrual).toBe(2.5);
      expect(item.annualLeaveUpgradedTo30).toBe(true);
      expect(item.deductions).toBe(240); // 225 sick + 15 lateness
      expect(item.netSalary).toBe(Number((9000 - item.gosiDeduction - 240).toFixed(2)));
    });

    it('enforces all Feb 2025 Saudi Labor Law Amendments (Art. 151 12w maternity, Art. 113 sibling 3d, Art. 53 180d probation, Art. 75/79bis, Art. 98/107 Ramadan & comp leave, Nitaqat Mutawwar)', () => {
      // Art. 151: 12 weeks (84 days) fully paid maternity; 90 days -> 6 unpaid
      const mat = WpsPayrollEngine.classifyLeaveDeductionRule('إجازة وضع', 90, 300);
      expect(mat.unpaidDaysForPayroll).toBe(6);

      // Art. 113: Sibling bereavement 3 days fully paid
      const sib = WpsPayrollEngine.classifyLeaveDeductionRule('إجازة وفاة أخ', 3, 300);
      expect(sib.payRatePercent).toBe(100);
      expect(sib.unpaidDaysForPayroll).toBe(0);

      // Art. 160: Iddah 130 days Muslim vs 15 days non-Muslim
      expect(WpsPayrollEngine.classifyLeaveDeductionRule('إجازة عدة', 130, 300).unpaidDaysForPayroll).toBe(0);
      expect(WpsPayrollEngine.classifyLeaveDeductionRule('إجازة عدة غير مسلمة', 20, 300).unpaidDaysForPayroll).toBe(5);

      // Art. 53: Probation max 180 days + excludes Eid/sick days
      const prob = WpsPayrollEngine.calculateProbationCompliance({
        startDate: '2026-01-01',
        agreedDays: 180,
        eidDaysWithinProbation: 5,
        sickDaysWithinProbation: 3,
        referenceDate: '2026-03-01',
      });
      expect(prob.isValidDuration).toBe(true);
      expect(prob.mutualTerminationAllowed).toBe(true);
      expect(WpsPayrollEngine.calculateProbationCompliance({ startDate: '2026-01-01', agreedDays: 200 }).isValidDuration).toBe(false);

      // Art. 75 & 79 bis
      expect(
        WpsPayrollEngine.calculateNoticeAndResignationRules({
          contractType: 'INDEFINITE',
          initiatedBy: 'EMPLOYEE',
          submissionDate: '2026-11-01',
        }).requiredNoticeDays
      ).toBe(30);
      expect(
        WpsPayrollEngine.calculateNoticeAndResignationRules({
          contractType: 'INDEFINITE',
          initiatedBy: 'EMPLOYER',
          submissionDate: '2026-11-01',
        }).requiredNoticeDays
      ).toBe(60);
      const resig = WpsPayrollEngine.calculateNoticeAndResignationRules({
        contractType: 'FIXED_TERM',
        initiatedBy: 'EMPLOYEE',
        submissionDate: '2026-11-01',
        referenceDate: '2026-11-05',
        employerDeferralDays: 45,
      });
      expect(resig.employeeCanWithdraw).toBe(true);
      expect(resig.deferralValid).toBe(true);

      // Art. 98 Ramadan 6h + Art. 107 Compensatory Leave
      const ramadanComp = WpsPayrollEngine.calculateOvertimeOrCompLeave({
        basicSalary: 6000,
        totalWage: 9000,
        dailyWorkedHours: 9,
        isRamadan: true,
        isMuslim: true,
        compensateAsLeave: true,
      });
      expect(ramadanComp.standardDailyHours).toBe(6);
      expect(ramadanComp.overtimeHours).toBe(3);
      expect(ramadanComp.cashOvertimePay).toBe(0);
      expect(ramadanComp.compensatoryLeaveDays).toBe(0.5);

      // Nitaqat Mutawwar: disability = 4.0 weight + 26-week rolling average + professional quotas
      const nitaqat = WpsPayrollEngine.calculateNitaqatStatus(
        [
          { isSaudi: true, salary: 5000, hasDisability: true },
          { isSaudi: false, salary: 4000 },
          { isSaudi: false, salary: 4000 },
        ],
        [42, 44, 46]
      );
      expect(nitaqat.effectiveSaudiWeight).toBe(4);
      expect(nitaqat.saudizationPercentage).toBe(44);
      expect(nitaqat.nitaqatBand).toBe('بلاتيني');

      const profQuotas = WpsPayrollEngine.evaluateProfessionalSaudization([
        { isSaudi: true, profession: 'محاسب عام' },
        { isSaudi: false, profession: 'محاسب تكاليف' },
        { isSaudi: false, profession: 'خدمة عملاء' },
      ]);
      expect(profQuotas.find((p) => p.professionGroupAr === 'المهن المحاسبية')?.compliant).toBe(true);
      expect(profQuotas.find((p) => p.professionGroupAr === 'خدمة العملاء')?.compliant).toBe(false);
    });
  });
});
