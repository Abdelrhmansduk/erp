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
});
