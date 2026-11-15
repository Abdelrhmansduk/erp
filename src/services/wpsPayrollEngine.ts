/**
 * Saudi Wages Protection System (WPS / SIF) & Labor Law Engine
 * Implements:
 * 1. Standard SAMA / Ministry of Human Resources SIF 4.0 file structure & IBAN MOD-97 validation
 * 2. End of Service Calculator & Final Clearance (Articles 84, 85, 87 & 88 of Saudi Labor Law)
 * 3. GOSI Contribution calculation (Saudi vs Non-Saudi + 2024/2026 Gradual Reform & 45,000 SAR cap)
 * 4. Article 92 Deduction Cap Enforcement (Max 50% wage deduction per month)
 * 5. Annual Leave Accrual (Art. 109), Sick Leave Tiers (Art. 117), and Overtime (Art. 107)
 * 6. Double-Entry GL Payroll Journal Builder & Nitaqat / Document Expiry Compliance Radar
 */

export interface CostCenterAllocation {
  code: string;
  name: string;
  percent: number; // 0..100, sum per employee = 100
}

export type PayGroupType =
  | 'الإدارة العامة'
  | 'الفروع والتشغيل'
  | 'مراكز الإيواء'
  | 'الكوادر الميدانية';

export type SeparationReasonCode =
  | 'RESIGNATION'
  | 'TERMINATION_BY_EMPLOYER'
  | 'CONTRACT_EXPIRY'
  | 'FORCE_MAJEURE'
  | 'CONSENT'
  | 'MARRIAGE_OR_MATERNITY_ART87'
  | 'DISCIPLINARY_ART80';

export interface EmployeePayrollRecord {
  employeeId: string;
  employeeNumber: string;
  nationalIdOrIqama: string;
  employeeName: string;
  payGroup?: PayGroupType | string;
  costCenterAllocations?: CostCenterAllocation[];
  bankCode: string; // e.g. 'ALRAJHI', 'SNB', 'RIBL', 'ALINMA', 'BSFR', 'SABB'
  iban: string;
  isSaudi: boolean;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  overtimePay?: number;
  rewardsAmount?: number;
  grossSalary?: number;
  advanceDeduction?: number;
  sanctionDeduction?: number;
  absenceDeduction?: number;
  deductions: number;
  carriedForwardDeduction?: number;
  gosiDeduction: number;
  gosiEmployerShare?: number;
  gosiEmployeeRatePercent?: number;
  gosiEmployerRatePercent?: number;
  netSalary: number;
  workingDays: number;
  deductionCapApplied?: boolean;
  deductionCapNote?: string;
}

export interface WpsSifHeader {
  employerCrNumber: string; // 10 digits CR or 700 MOL ID
  employerName: string;
  bankRoutingCode: string; // 4 digits bank routing code
  fileCreationDate: string; // YYYY-MM-DD
  fileCreationTime: string; // HH:mm
  payrollMonth: string; // YYYY-MM
  totalSalariesAmount: number;
  totalRecordsCount: number;
  currency: string; // 'SAR'
}

export interface EndOfServiceCalculation {
  serviceYears: number;
  serviceMonths: number;
  serviceDays: number;
  lastBasicSalary: number;
  totalAllowances: number;
  totalWage: number;
  contractType: 'FIXED_TERM' | 'UNLIMITED';
  separationReason: SeparationReasonCode;
  entitlementPercentage: number;
  awardAmount: number;
  leaveBalanceCompensation: number;
  gratuityTotal: number;
  legalArticleNote: string;
}

export interface FinalClearanceCalculation extends EndOfServiceCalculation {
  workedDaysInFinalMonth: number;
  finalMonthSalaryPayable: number;
  remainingAdvanceBalance: number;
  otherFinancialDeductions: number;
  custodyCleared: boolean;
  grossEntitlements: number;
  totalSettlementDeductions: number;
  netFinalPayable: number;
  canIssueClearanceCertificate: boolean;
  clearanceBlockReason?: string;
}

export interface PayrollGlJournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenterCode?: string;
  costCenterName?: string;
  memo: string;
}

export interface MonthlyHrAccrualSummary {
  accrualMonth: string;
  companyCode: string;
  employeesCount: number;
  eosbProvisionAmount: number;
  leaveProvisionAmount: number;
  ticketProvisionAmount: number;
  medicalAmortizationAmount: number;
  totalAccrualAmount: number;
  journalPayload: PayrollGlJournalPayload;
}

export interface PayrollGlJournalPayload {
  companyCode: string;
  payrollMonth: string;
  entryDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lines: PayrollGlJournalLine[];
}

export interface DocumentExpiryAlert {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  documentType: 'IQAMA_OR_ID' | 'PASSPORT' | 'QIWA_CONTRACT' | 'MEDICAL_INSURANCE';
  documentLabelAr: string;
  expiryDate: string;
  daysRemaining: number;
  severity: 'EXPIRED' | 'CRITICAL_7D' | 'WARNING_30D' | 'UPCOMING_60D' | 'VALID';
  statusLabelAr: string;
}

export interface NitaqatComplianceSummary {
  totalEmployees: number;
  saudiCount: number;
  nonSaudiCount: number;
  effectiveSaudiWeight: number;
  saudizationPercentage: number;
  nitaqatBand: 'بلاتيني' | 'أخضر مرتفع' | 'أخضر متوسط' | 'أخضر منخفض' | 'أحمر';
  bandColor: 'emerald' | 'teal' | 'amber' | 'rose';
  visasEligible: boolean;
  nextBandTargetSaudis: number;
}

export class WpsPayrollEngine {
  /**
   * Bank Routing Codes mapping in Saudi Arabia
   */
  public static readonly SAUDI_BANKS_ROUTING: Record<string, { code: string; nameAr: string; ibanCode: string }> = {
    ALRAJHI: { code: '8000', nameAr: 'مصرف الراجحي', ibanCode: '80' },
    SNB: { code: '1000', nameAr: 'البنك الأهلي السعودي', ibanCode: '10' },
    RIBL: { code: '2000', nameAr: 'بنك الرياض', ibanCode: '20' },
    ALINMA: { code: '0500', nameAr: 'مصرف الإنماء', ibanCode: '05' },
    BSFR: { code: '4500', nameAr: 'البنك السعودي الفرنسي', ibanCode: '55' },
    ANB: { code: '3000', nameAr: 'البنك العربي الوطني', ibanCode: '30' },
    SABB: { code: '5000', nameAr: 'البنك الأول (SAB)', ibanCode: '45' },
    BJAZ: { code: '6000', nameAr: 'بنك الجزيرة', ibanCode: '60' },
    ALBILAD: { code: '1500', nameAr: 'بنك البلاد', ibanCode: '15' },
    GIB: { code: '6500', nameAr: 'بنك الخليج الدولي (ميم)', ibanCode: '65' },
  };

  /**
   * Validates a Saudi IBAN (SA + 22 digits = 24 chars, plus MOD-97 check when strict)
   */
  public static validateSaudiIban(rawIban: string): {
    isValid: boolean;
    checksumValid: boolean;
    normalized: string;
    bankCode: string;
    bankNameAr: string;
    error?: string;
  } {
    const normalized = (rawIban || '').replace(/\s+/g, '').toUpperCase();
    if (!normalized.startsWith('SA')) {
      return {
        isValid: false,
        checksumValid: false,
        normalized,
        bankCode: 'ALRAJHI',
        bankNameAr: 'غير محدد',
        error: 'يجب أن يبدأ رقم الآيبان السعودي بـ SA',
      };
    }
    if (!/^SA\d{22}$/.test(normalized)) {
      return {
        isValid: false,
        checksumValid: false,
        normalized,
        bankCode: 'ALRAJHI',
        bankNameAr: 'غير محدد',
        error: 'يجب أن يتكون رقم الآيبان السعودي من 24 خانة (SA متبوعة بـ 22 رقماً)',
      };
    }

    const ibanBankDigits = normalized.slice(4, 6);
    let matchedBankCode = 'ALRAJHI';
    let matchedBankName = 'مصرف الراجحي';
    for (const [key, info] of Object.entries(this.SAUDI_BANKS_ROUTING)) {
      if (info.ibanCode === ibanBankDigits) {
        matchedBankCode = key;
        matchedBankName = info.nameAr;
        break;
      }
    }

    // ISO 7064 MOD-97-10 calculation
    const rearranged = normalized.slice(4) + '2810' + normalized.slice(2, 4);
    let remainder = 0;
    for (let i = 0; i < rearranged.length; i++) {
      remainder = (remainder * 10 + Number(rearranged[i])) % 97;
    }
    const checksumValid = remainder === 1;

    return {
      isValid: true,
      checksumValid,
      normalized,
      bankCode: matchedBankCode,
      bankNameAr: matchedBankName,
    };
  }

  /**
   * Generates standard Saudi Wages Protection File (.SIF) text
   */
  public static generateSifFileContent(
    header: WpsSifHeader,
    records: EmployeePayrollRecord[]
  ): string {
    const lines: string[] = [];

    // 1. Header Record (SCR: Salary Control Record)
    const cleanCr = header.employerCrNumber.padStart(10, '0');
    const dateFormatted = header.fileCreationDate.replace(/-/g, '');
    const timeFormatted = header.fileCreationTime.replace(/:/g, '');
    const totalAmtStr = header.totalSalariesAmount.toFixed(2);
    const countStr = records.length.toString();

    const scrLine = [
      'SCR',
      cleanCr,
      header.bankRoutingCode,
      dateFormatted,
      timeFormatted,
      header.employerName.replace(/,/g, ' '),
      countStr,
      totalAmtStr,
      'SAR',
      header.payrollMonth.replace(/-/g, ''),
    ].join(',');

    lines.push(scrLine);

    // 2. Employee Detail Records (DTR: Detail Transaction Record)
    records.forEach((rec, idx) => {
      const basic = (Number(rec.basicSalary) || 0).toFixed(2);
      const housing = (Number(rec.housingAllowance) || 0).toFixed(2);
      const transport = (Number(rec.transportAllowance) || 0).toFixed(2);
      const other = (
        (Number(rec.otherAllowances) || 0) +
        (Number(rec.overtimePay) || 0) +
        (Number(rec.rewardsAmount) || 0)
      ).toFixed(2);
      const deductions = ((Number(rec.deductions) || 0) + (Number(rec.gosiDeduction) || 0)).toFixed(2);
      const net = (Number(rec.netSalary) || 0).toFixed(2);
      const days = (rec.workingDays || 30).toString();

      const dtrLine = [
        'DTR',
        rec.employeeNumber || (idx + 1).toString(),
        rec.employeeName.replace(/,/g, ' '),
        rec.nationalIdOrIqama,
        rec.iban.replace(/\s+/g, ''),
        rec.bankCode || 'ALRAJHI',
        basic,
        housing,
        transport,
        other,
        deductions,
        net,
        days,
      ].join(',');

      lines.push(dtrLine);
    });

    return lines.join('\r\n');
  }

  /**
   * Calculates GOSI contributions according to Saudi GOSI Law
   * Standard Saudi: 9.75% Employee (9% Annuities + 0.75% Saned) + 11.75% Employer (9% Annuities + 2% Hazard + 0.75% Saned)
   * New Entrant Post-July 2024 Reform (optional): Gradual 0.5% annual increase on Annuities from 9% up to 11%
   * Non-Saudi: 0% Employee + 2% Occupational Hazard (Employer)
   * Capped at 45,000 SAR max contributory wage.
   */
  public static calculateGosi(
    basicSalary: number,
    housingAllowance: number,
    isSaudi: boolean,
    options?: {
      isNewSubscriberPostJuly2024?: boolean;
      calculationYear?: number;
    }
  ): {
    employeeShare: number;
    employerShare: number;
    totalGosi: number;
    contributoryWage: number;
    employeeRatePercent: number;
    employerRatePercent: number;
  } {
    const rawWage = (Number(basicSalary) || 0) + (Number(housingAllowance) || 0);
    const contributoryWage = Math.min(Math.max(0, rawWage), 45000); // 45,000 SAR ceiling

    if (isSaudi) {
      let annuitiesRate = 0.09; // 9% default
      if (options?.isNewSubscriberPostJuly2024) {
        const year = options.calculationYear || new Date().getFullYear();
        if (year <= 2024) annuitiesRate = 0.09;
        else if (year === 2025) annuitiesRate = 0.095;
        else if (year === 2026) annuitiesRate = 0.10;
        else if (year === 2027) annuitiesRate = 0.105;
        else annuitiesRate = 0.11;
      }
      const sanedRate = 0.0075; // 0.75%
      const hazardRate = 0.02; // 2%

      const empRate = annuitiesRate + sanedRate;
      const emprRate = annuitiesRate + sanedRate + hazardRate;

      const employeeShare = Number((contributoryWage * empRate).toFixed(2));
      const employerShare = Number((contributoryWage * emprRate).toFixed(2));

      return {
        employeeShare,
        employerShare,
        totalGosi: Number((employeeShare + employerShare).toFixed(2)),
        contributoryWage,
        employeeRatePercent: Number((empRate * 100).toFixed(2)),
        employerRatePercent: Number((emprRate * 100).toFixed(2)),
      };
    } else {
      const employeeShare = 0;
      const employerShare = Number((contributoryWage * 0.02).toFixed(2)); // 2% Occupational hazard
      return {
        employeeShare,
        employerShare,
        totalGosi: employerShare,
        contributoryWage,
        employeeRatePercent: 0,
        employerRatePercent: 2,
      };
    }
  }

  /**
   * Calculates Annual Leave Entitlement according to Article 109 of Saudi Labor Law
   * < 5 years service: 21 days/year (1.75 days/month)
   * >= 5 years service: 30 days/year (2.50 days/month)
   */
  public static calculateAnnualLeaveEntitlement(
    hireDate: string,
    referenceDate: string = new Date().toISOString().slice(0, 10)
  ): {
    serviceYears: number;
    annualEntitlementDays: 21 | 30;
    monthlyAccrualRate: number;
    accruedDaysTotal: number;
    legalArticle: string;
  } {
    const start = new Date(hireDate);
    const ref = new Date(referenceDate);
    const diffDays = Math.max(0, Math.floor((ref.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const serviceYears = Number((diffDays / 365.25).toFixed(2));
    const annualEntitlementDays: 21 | 30 = serviceYears >= 5 ? 30 : 21;
    const monthlyAccrualRate = annualEntitlementDays === 30 ? 2.5 : 1.75;
    const monthsWorkedThisYear = Math.min(12, Math.max(1, (diffDays % 365.25) / 30.4375));
    const accruedDaysTotal = Number((monthsWorkedThisYear * monthlyAccrualRate).toFixed(1));

    return {
      serviceYears,
      annualEntitlementDays,
      monthlyAccrualRate,
      accruedDaysTotal,
      legalArticle:
        annualEntitlementDays === 30
          ? 'المادة (109): استحقاق 30 يوماً سنوياً لإتمام الموظف 5 سنوات خدمة متصلة أو أكثر.'
          : 'المادة (109): استحقاق 21 يوماً سنوياً (أقل من 5 سنوات خدمة).',
    };
  }

  /**
   * Calculates Sick Leave Pay Tiers according to Article 117 of Saudi Labor Law
   * First 30 days: 100% full pay
   * Next 60 days (31-90): 75% pay (25% deduction)
   * Final 30 days (91-120): 0% pay (unpaid)
   */
  public static calculateSickLeavePay(
    dailyWage: number,
    previousSickDaysInYear: number,
    requestedDays: number
  ): {
    fullPayDays: number;
    threeQuarterPayDays: number;
    unpaidDays: number;
    payableAmount: number;
    deductionAmount: number;
    effectivePayPercent: number;
    legalNote: string;
  } {
    let fullPayDays = 0;
    let threeQuarterPayDays = 0;
    let unpaidDays = 0;

    for (let i = 1; i <= requestedDays; i++) {
      const dayIndex = previousSickDaysInYear + i;
      if (dayIndex <= 30) {
        fullPayDays++;
      } else if (dayIndex <= 90) {
        threeQuarterPayDays++;
      } else {
        unpaidDays++;
      }
    }

    const fullAmount = requestedDays * dailyWage;
    const payableAmount = Number(
      (fullPayDays * dailyWage + threeQuarterPayDays * dailyWage * 0.75).toFixed(2)
    );
    const deductionAmount = Number(Math.max(0, fullAmount - payableAmount).toFixed(2));
    const effectivePayPercent =
      requestedDays > 0 ? Number(((payableAmount / fullAmount) * 100).toFixed(1)) : 100;

    return {
      fullPayDays,
      threeQuarterPayDays,
      unpaidDays,
      payableAmount,
      deductionAmount,
      effectivePayPercent,
      legalNote: `المادة (117): ${fullPayDays} يوم بأجر كامل (100%)، ${threeQuarterPayDays} يوم بثلاثة أرباع الأجر (75%)، ${unpaidDays} يوم بدون أجر.`,
    };
  }

  /**
   * Calculates Overtime Pay according to Article 107 of Saudi Labor Law
   * Hourly overtime = Basic hourly wage + 50% (i.e. 150% of hourly basic wage, or actual hourly wage + 50% basic)
   */
  public static calculateOvertimePay(
    basicSalary: number,
    totalWage: number,
    overtimeHours: number
  ): {
    hourlyBasic: number;
    hourlyTotal: number;
    overtimeRatePerHour: number;
    totalOvertimePay: number;
    legalNote: string;
  } {
    const hourlyBasic = (Number(basicSalary) || 0) / 240; // 30 days * 8 hours = 240 hours
    const hourlyTotal = (Number(totalWage) || 0) / 240;
    // MHRSD standard: actual hourly wage + 50% of basic hourly wage
    const overtimeRatePerHour = Number((hourlyTotal + hourlyBasic * 0.5).toFixed(2));
    const totalOvertimePay = Number((overtimeRatePerHour * Math.max(0, overtimeHours)).toFixed(2));

    return {
      hourlyBasic: Number(hourlyBasic.toFixed(2)),
      hourlyTotal: Number(hourlyTotal.toFixed(2)),
      overtimeRatePerHour,
      totalOvertimePay,
      legalNote: 'المادة (107): أجر الساعة الإضافية يساوي أجر الساعة الفعلي مضافاً إليه 50% من الأجر الأساسي.',
    };
  }

  /**
   * Comprehensive Employee Payroll Item Calculator with Article 92 (50% Deduction Cap)
   */
  public static calculateComprehensivePayrollItem(params: {
    employeeId: string;
    employeeNumber: string;
    nationalIdOrIqama: string;
    employeeName: string;
    bankCode?: string;
    iban?: string;
    isSaudi: boolean;
    isNewSubscriberPostJuly2024?: boolean;
    calculationYear?: number;
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    otherAllowances?: number;
    overtimeHours?: number;
    rewardsAmount?: number;
    advanceInstallment?: number;
    sanctionAmount?: number;
    unpaidAbsenceDays?: number;
    workingDays?: number;
  }): EmployeePayrollRecord {
    const basic = Number(params.basicSalary) || 0;
    const housing = Number(params.housingAllowance) || 0;
    const transport = Number(params.transportAllowance) || 0;
    const other = Number(params.otherAllowances) || 0;
    const fixedWage = basic + housing + transport + other;

    const overtime = this.calculateOvertimePay(basic, fixedWage, params.overtimeHours || 0).totalOvertimePay;
    const rewards = Number(params.rewardsAmount) || 0;
    const grossSalary = Number((fixedWage + overtime + rewards).toFixed(2));

    const gosi = this.calculateGosi(basic, housing, params.isSaudi, {
      isNewSubscriberPostJuly2024: params.isNewSubscriberPostJuly2024,
      calculationYear: params.calculationYear,
    });
    const gosiEmployee = gosi.employeeShare;
    const gosiEmployer = gosi.employerShare;

    const dailyWage = fixedWage / 30;
    const absenceDeduction = Number(((params.unpaidAbsenceDays || 0) * dailyWage).toFixed(2));
    const advanceDeduction = Number(params.advanceInstallment) || 0;
    const sanctionDeduction = Number(params.sanctionAmount) || 0;

    // Article 92 of Saudi Labor Law: Total deductions cannot exceed 50% of the employee's wage
    const maxTotalDeductionAllowed = Number((grossSalary * 0.5).toFixed(2));
    const rawNonGosiDeductions = Number((advanceDeduction + sanctionDeduction + absenceDeduction).toFixed(2));
    const maxNonGosiAllowed = Math.max(0, Number((maxTotalDeductionAllowed - gosiEmployee).toFixed(2)));

    let effectiveNonGosiDeductions = rawNonGosiDeductions;
    let carriedForwardDeduction = 0;
    let deductionCapApplied = false;
    let deductionCapNote: string | undefined;

    if (rawNonGosiDeductions > maxNonGosiAllowed) {
      effectiveNonGosiDeductions = maxNonGosiAllowed;
      carriedForwardDeduction = Number((rawNonGosiDeductions - maxNonGosiAllowed).toFixed(2));
      deductionCapApplied = true;
      deductionCapNote = `تطبيق سقف المادة (92): تم تقليص الخصومات الشهرية لتقف عند 50% من الأجر وترحيل مبلغ (⃁ ${carriedForwardDeduction.toFixed(2)}) للشهر القادم.`;
    }

    const netSalary = Number((grossSalary - gosiEmployee - effectiveNonGosiDeductions).toFixed(2));

    return {
      employeeId: params.employeeId,
      employeeNumber: params.employeeNumber,
      nationalIdOrIqama: params.nationalIdOrIqama,
      employeeName: params.employeeName,
      bankCode: params.bankCode || 'ALRAJHI',
      iban: params.iban || `SA03800000000${params.nationalIdOrIqama || '1010101010'}12`,
      isSaudi: params.isSaudi,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      overtimePay: overtime,
      rewardsAmount: rewards,
      grossSalary,
      advanceDeduction,
      sanctionDeduction,
      absenceDeduction,
      deductions: effectiveNonGosiDeductions,
      carriedForwardDeduction,
      gosiDeduction: gosiEmployee,
      gosiEmployerShare: gosiEmployer,
      gosiEmployeeRatePercent: gosi.employeeRatePercent,
      gosiEmployerRatePercent: gosi.employerRatePercent,
      netSalary,
      workingDays: Math.max(0, (params.workingDays || 30) - (params.unpaidAbsenceDays || 0)),
      deductionCapApplied,
      deductionCapNote,
    };
  }

  /**
   * Enforces Articles 66 & 70 of Saudi Labor Law on Disciplinary Sanctions:
   * - Single violation fine cannot exceed 5 days' basic wage.
   * - Total monthly fine deductions cannot exceed 5 days' basic wage in a single month.
   */
  public static validateSanctionCap(
    basicSalary: number,
    requestedSanctionAmount: number,
    existingMonthlySanctions: number = 0
  ): {
    maxFiveDaysBasicWage: number;
    allowedAmountThisMonth: number;
    excessCarriedForward: number;
    wasCapped: boolean;
    legalNote: string;
  } {
    const dailyBasic = Math.max(0, Number(basicSalary) || 0) / 30;
    const maxFiveDaysBasicWage = Number((dailyBasic * 5).toFixed(2));
    const remainingMonthlyQuota = Math.max(
      0,
      Number((maxFiveDaysBasicWage - Math.max(0, existingMonthlySanctions)).toFixed(2))
    );
    const req = Math.max(0, Number(requestedSanctionAmount) || 0);
    const singleCapped = Math.min(req, maxFiveDaysBasicWage);
    const allowedAmountThisMonth = Number(Math.min(singleCapped, remainingMonthlyQuota).toFixed(2));
    const excessCarriedForward = Number(Math.max(0, req - allowedAmountThisMonth).toFixed(2));
    const wasCapped = req > allowedAmountThisMonth;

    return {
      maxFiveDaysBasicWage,
      allowedAmountThisMonth,
      excessCarriedForward,
      wasCapped,
      legalNote: wasCapped
        ? `المادتان (66 و70) من نظام العمل: لا يجوز أن تزيد الغرامة عن أجر 5 أيام (⃁ ${maxFiveDaysBasicWage.toFixed(2)}) للمخالفة الواحدة أو في الشهر الواحد؛ تم اعتماد ⃁ ${allowedAmountThisMonth.toFixed(2)} وترحيل الفائض.`
        : `مطابق للمادتين (66 و70): ضمن سقف أجر 5 أيام أساسي (⃁ ${maxFiveDaysBasicWage.toFixed(2)}).`,
    };
  }

  /**
   * Enforces Article 93 of Saudi Labor Law on Employee Advances / Loans:
   * - Standard loan deduction installment should not exceed 10% of the employee's wage.
   */
  public static validateAdvanceInstallmentCap(
    grossWage: number,
    monthlyInstallment: number
  ): {
    maxTenPercentInstallment: number;
    exceedsTenPercent: boolean;
    recommendedInstallmentsCount: (totalLoanAmount: number) => number;
    legalNote: string;
  } {
    const maxTenPercentInstallment = Number((Math.max(0, Number(grossWage) || 0) * 0.1).toFixed(2));
    const exceedsTenPercent = monthlyInstallment > maxTenPercentInstallment && maxTenPercentInstallment > 0;
    return {
      maxTenPercentInstallment,
      exceedsTenPercent,
      recommendedInstallmentsCount: (totalLoanAmount: number) =>
        maxTenPercentInstallment > 0 ? Math.max(1, Math.ceil(totalLoanAmount / maxTenPercentInstallment)) : 1,
      legalNote: exceedsTenPercent
        ? `تنبيه المادة (93) من نظام العمل: القسط الشهري (⃁ ${monthlyInstallment.toFixed(2)}) يتجاوز سقف 10% من الأجر (⃁ ${maxTenPercentInstallment.toFixed(2)}).`
        : `مطابق للمادة (93): القسط الشهري لا يتجاوز 10% من الأجر (⃁ ${maxTenPercentInstallment.toFixed(2)}).`,
    };
  }

  /**
   * Classifies Leave / Vacation Requests per Saudi Labor Law Articles 109, 113, 116, 117, 151 & 160
   * Ensures only Annual Leave (Art. 109) deducts from the employee's annual leave balance.
   */
  public static classifyLeaveDeductionRule(
    vacationType: string,
    requestedDays: number,
    dailyWage: number,
    previousSickDaysInYear: number = 0
  ): {
    deductFromAnnualBalance: boolean;
    annualDaysToDeduct: number;
    payRatePercent: number;
    unpaidDaysForPayroll: number;
    legalReference: string;
  } {
    const type = (vacationType || '').trim();
    const days = Math.max(1, Math.round(requestedDays));

    if (type.includes('مرضية')) {
      const sick = this.calculateSickLeavePay(dailyWage, previousSickDaysInYear, days);
      const unpaidEquivalent = Number(((days * (100 - sick.effectivePayPercent)) / 100).toFixed(2));
      return {
        deductFromAnnualBalance: false,
        annualDaysToDeduct: 0,
        payRatePercent: sick.effectivePayPercent,
        unpaidDaysForPayroll: unpaidEquivalent,
        legalReference: `${sick.legalNote} (لا تُخصم من رصيد الإجازة السنوية الاعتيادية)`,
      };
    }

    if (type.includes('زواج') || type.includes('وفاة') || type.includes('مولود') || type.includes('أحوال شخصية')) {
      return {
        deductFromAnnualBalance: false,
        annualDaysToDeduct: 0,
        payRatePercent: 100,
        unpaidDaysForPayroll: 0,
        legalReference:
          'المادة (113) من نظام العمل: إجازة أحوال شخصية مدفوعة الأجر بالكامل (5 أيام للزواج أو الوفاة، 3 أيام للمولود) ولا تُخصم من الرصيد السنوي.',
      };
    }

    if (type.includes('وضع') || type.includes('أمومة') || type.includes('عدة')) {
      return {
        deductFromAnnualBalance: false,
        annualDaysToDeduct: 0,
        payRatePercent: 100,
        unpaidDaysForPayroll: 0,
        legalReference:
          'المادتان (151 و160) من نظام العمل: إجازة وضع/عدة نظامية مدفوعة الأجر ولا تُخصم من رصيد الإجازة السنوية.',
      };
    }

    if (type.includes('بدون أجر') || type.includes('بدون راتب') || type.includes('غير مدفوعة')) {
      return {
        deductFromAnnualBalance: false,
        annualDaysToDeduct: 0,
        payRatePercent: 0,
        unpaidDaysForPayroll: days,
        legalReference:
          'المادة (116) من نظام العمل: إجازة بدون أجر بموافقة الطرفين؛ تُستقطع أيامها من أجر الشهر دون المساس برصيد الإجازة السنوية المدفوعة.',
      };
    }

    // Default: Annual / Emergency Leave (Art. 109)
    return {
      deductFromAnnualBalance: true,
      annualDaysToDeduct: days,
      payRatePercent: 100,
      unpaidDaysForPayroll: 0,
      legalReference: 'المادة (109) من نظام العمل: إجازة سنوية مدفوعة الأجر بالكامل وتُخصم من الرصيد السنوي المستحق.',
    };
  }

  /**
   * Builds a balanced Double-Entry Accounting Journal for Payroll Run Posting (SMACC / GL)
   */
  public static buildPayrollGlJournalEntry(
    payrollMonth: string,
    companyCode: string,
    items: EmployeePayrollRecord[]
  ): PayrollGlJournalPayload {
    const totalGross = Number(
      items
        .reduce(
          (sum, r) =>
            sum +
            (r.grossSalary ??
              r.basicSalary +
                r.housingAllowance +
                r.transportAllowance +
                r.otherAllowances +
                (r.overtimePay || 0) +
                (r.rewardsAmount || 0)),
          0
        )
        .toFixed(2)
    );
    const totalGosiEmployee = Number(items.reduce((sum, r) => sum + (r.gosiDeduction || 0), 0).toFixed(2));
    const totalGosiEmployer = Number(
      items
        .reduce(
          (sum, r) =>
            sum +
            (r.gosiEmployerShare ??
              this.calculateGosi(r.basicSalary, r.housingAllowance, r.isSaudi).employerShare),
          0
        )
        .toFixed(2)
    );
    const totalAdvancesRecovered = Number(
      items.reduce((sum, r) => sum + Math.min(r.advanceDeduction || 0, r.deductions || 0), 0).toFixed(2)
    );
    const totalSanctionsAndAbsences = Number(
      items
        .reduce((sum, r) => sum + Math.max(0, (r.deductions || 0) - Math.min(r.advanceDeduction || 0, r.deductions || 0)), 0)
        .toFixed(2)
    );
    const totalNetPayable = Number(
      (totalGross - totalGosiEmployee - totalAdvancesRecovered - totalSanctionsAndAbsences).toFixed(2)
    );

    const lines: PayrollGlJournalLine[] = [
      {
        accountCode: '51010',
        accountName: 'مصروف الرواتب والأجور والبدلات (شامل الإضافي والمكافآت)',
        debit: totalGross,
        credit: 0,
        memo: `استحقاق رواتب وأجور شهر ${payrollMonth} (${items.length} موظف)`,
      },
      {
        accountCode: '51020',
        accountName: 'مصروف حصة المنشأة في التأمينات الاجتماعية (GOSI)',
        debit: totalGosiEmployer,
        credit: 0,
        memo: `حصة الشركة في التأمينات الاجتماعية وساند لشهر ${payrollMonth}`,
      },
      {
        accountCode: '21040',
        accountName: 'المؤسسة العامة للتأمينات الاجتماعية (مستحقات GOSI)',
        debit: 0,
        credit: Number((totalGosiEmployee + totalGosiEmployer).toFixed(2)),
        memo: `إجمالي فاتورة التأمينات الاجتماعية لشهر ${payrollMonth}`,
      },
    ];

    if (totalAdvancesRecovered > 0) {
      lines.push({
        accountCode: '11040',
        accountName: 'سلف وعهد الموظفين (أقساط مستردة)',
        debit: 0,
        credit: totalAdvancesRecovered,
        memo: `استقطاع أقساط السلف الشهرية من مسير ${payrollMonth}`,
      });
    }

    if (totalSanctionsAndAbsences > 0) {
      lines.push({
        accountCode: '41900',
        accountName: 'خصومات الجزاءات والغياب الإداري',
        debit: 0,
        credit: totalSanctionsAndAbsences,
        memo: `استقطاع جزاءات وغياب لائحة العمل لمسير ${payrollMonth}`,
      });
    }

    lines.push({
      accountCode: '11020',
      accountName: 'بنك الراجحي / مستحقات حماية الأجور (WPS)',
      debit: 0,
      credit: totalNetPayable,
      memo: `صافي الرواتب المحولة عبر نظام حماية الأجور WPS لشهر ${payrollMonth}`,
    });

    const totalDebit = Number(lines.reduce((s, l) => s + l.debit, 0).toFixed(2));
    const totalCredit = Number(lines.reduce((s, l) => s + l.credit, 0).toFixed(2));

    return {
      companyCode,
      payrollMonth,
      entryDate: new Date().toISOString().slice(0, 10),
      description: `قيد استحقاق وصرف مسير الرواتب وحماية الأجور (WPS) لشهر ${payrollMonth}`,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      lines,
    };
  }

  /**
   * Calculates End of Service Gratuity according to Articles 84 and 85 of Saudi Labor Law
   */
  public static calculateEndOfService(params: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    lastBasicSalary: number;
    totalAllowances: number;
    contractType: 'FIXED_TERM' | 'UNLIMITED';
    separationReason: SeparationReasonCode;
    unusedLeaveDays?: number;
  }): EndOfServiceCalculation {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const serviceYears = Math.floor(totalDays / 365.25);
    const remainingDaysAfterYears = totalDays % 365.25;
    const serviceMonths = Math.floor(remainingDaysAfterYears / 30.4375);
    const serviceDays = Math.floor(remainingDaysAfterYears % 30.4375);

    const totalWage = (Number(params.lastBasicSalary) || 0) + (Number(params.totalAllowances) || 0);
    const dailyWage = totalWage / 30;

    // Full entitlement base calculation (Article 84)
    // First 5 years: half month per year
    // Beyond 5 years: full month per year
    const exactYears = totalDays / 365.25;
    let baseGratuity = 0;

    if (exactYears <= 5) {
      baseGratuity = (totalWage / 2) * exactYears;
    } else {
      const firstFiveYearsGratuity = (totalWage / 2) * 5;
      const remainingYears = exactYears - 5;
      const beyondFiveYearsGratuity = totalWage * remainingYears;
      baseGratuity = firstFiveYearsGratuity + beyondFiveYearsGratuity;
    }

    // Determine percentage based on separation reason (Articles 80, 84, 85 & 87)
    let entitlementPercentage = 100;
    let legalArticleNote = 'المادة (84): استحقاق كامل المكافأة.';

    if (params.separationReason === 'DISCIPLINARY_ART80') {
      entitlementPercentage = 0;
      legalArticleNote = 'المادة (80): فسخ العقد لسبب تأديبي مشروع دون مكافأة نهاية خدمة.';
    } else if (params.separationReason === 'MARRIAGE_OR_MATERNITY_ART87') {
      entitlementPercentage = 100;
      legalArticleNote =
        'المادة (87): استحقاق كامل المكافأة (100%) لاستقالة العاملة خلال 6 أشهر من عقد الزواج أو 3 أشهر من الوضع.';
    } else if (params.separationReason === 'RESIGNATION') {
      if (exactYears < 2) {
        entitlementPercentage = 0;
        legalArticleNote = 'المادة (85): استقالة قبل إتمام سنتين (لا يستحق مكافأة).';
      } else if (exactYears >= 2 && exactYears < 5) {
        entitlementPercentage = 33.333; // One third
        legalArticleNote = 'المادة (85): استقالة بين سنتين و5 سنوات (يستحق ثلث المكافأة).';
      } else if (exactYears >= 5 && exactYears < 10) {
        entitlementPercentage = 66.666; // Two thirds
        legalArticleNote = 'المادة (85): استقالة بين 5 و10 سنوات (يستحق ثلثي المكافأة).';
      } else {
        entitlementPercentage = 100;
        legalArticleNote = 'المادة (85): استقالة بعد 10 سنوات خدمة (يستحق كامل المكافأة).';
      }
    } else if (
      params.separationReason === 'TERMINATION_BY_EMPLOYER' ||
      params.separationReason === 'CONTRACT_EXPIRY' ||
      params.separationReason === 'FORCE_MAJEURE' ||
      params.separationReason === 'CONSENT'
    ) {
      entitlementPercentage = 100;
      legalArticleNote = 'المادة (84): إنهاء من صاحب العمل أو انتهاء العقد (استحقاق كامل 100%).';
    }

    const awardAmount = Number(((baseGratuity * entitlementPercentage) / 100).toFixed(2));
    const leaveBalanceCompensation = Number(((params.unusedLeaveDays || 0) * dailyWage).toFixed(2));
    const gratuityTotal = Number((awardAmount + leaveBalanceCompensation).toFixed(2));

    return {
      serviceYears,
      serviceMonths,
      serviceDays,
      lastBasicSalary: params.lastBasicSalary,
      totalAllowances: params.totalAllowances,
      totalWage,
      contractType: params.contractType,
      separationReason: params.separationReason,
      entitlementPercentage,
      awardAmount,
      leaveBalanceCompensation,
      gratuityTotal,
      legalArticleNote,
    };
  }

  /**
   * Calculates Complete End-of-Service Final Clearance & Settlement (مخالصة نهائية وإبراء ذمة)
   */
  public static calculateFinalClearance(params: {
    startDate: string;
    endDate: string;
    lastBasicSalary: number;
    totalAllowances: number;
    contractType: 'FIXED_TERM' | 'UNLIMITED';
    separationReason: SeparationReasonCode;
    unusedLeaveDays?: number;
    workedDaysInFinalMonth?: number;
    remainingAdvanceBalance?: number;
    otherFinancialDeductions?: number;
    custodyCleared?: boolean;
  }): FinalClearanceCalculation {
    const eos = this.calculateEndOfService(params);
    const workedDays = Math.max(0, Math.min(30, params.workedDaysInFinalMonth ?? 0));
    const dailyWage = eos.totalWage / 30;
    const finalMonthSalaryPayable = Number((workedDays * dailyWage).toFixed(2));

    const remainingAdvanceBalance = Math.max(0, Number(params.remainingAdvanceBalance) || 0);
    const otherFinancialDeductions = Math.max(0, Number(params.otherFinancialDeductions) || 0);
    const custodyCleared = params.custodyCleared !== false;

    const grossEntitlements = Number(
      (eos.awardAmount + eos.leaveBalanceCompensation + finalMonthSalaryPayable).toFixed(2)
    );
    const totalSettlementDeductions = Number(
      (remainingAdvanceBalance + otherFinancialDeductions).toFixed(2)
    );
    const netFinalPayable = Number((grossEntitlements - totalSettlementDeductions).toFixed(2));

    const canIssueClearanceCertificate = custodyCleared && netFinalPayable >= 0;
    let clearanceBlockReason: string | undefined;
    if (!custodyCleared) {
      clearanceBlockReason = 'لا يمكن إصدار شهادة إخلاء الطرف قبل تسليم وإغلاق العهد العينية والمالية المسجلة على الموظف.';
    } else if (netFinalPayable < 0) {
      clearanceBlockReason = `يوجد رصيد مديونية متبقٍ على الموظف بقيمة (${Math.abs(netFinalPayable).toFixed(2)} ⃁) يتجاوز إجمالي مستحقاته.`;
    }

    return {
      ...eos,
      workedDaysInFinalMonth: workedDays,
      finalMonthSalaryPayable,
      remainingAdvanceBalance,
      otherFinancialDeductions,
      custodyCleared,
      grossEntitlements,
      totalSettlementDeductions,
      netFinalPayable,
      canIssueClearanceCertificate,
      clearanceBlockReason,
    };
  }

  /**
   * Calculates Nitaqat (Saudization) Compliance Status for the Organization
   */
  public static calculateNitaqatStatus(
    employees: Array<{
      isSaudi?: boolean;
      national_id?: string;
      salary?: number;
      status?: string;
    }>
  ): NitaqatComplianceSummary {
    const active = employees.filter((e) => e.status !== 'نهاية خدمة');
    let saudiCount = 0;
    let nonSaudiCount = 0;
    let effectiveSaudiWeight = 0;

    for (const emp of active) {
      const isSaudi =
        typeof emp.isSaudi === 'boolean'
          ? emp.isSaudi
          : String(emp.national_id || '').trim().startsWith('1');
      const sal = Number(emp.salary) || 0;

      if (isSaudi) {
        saudiCount++;
        // MHRSD Nitaqat wage rule: >= 4,000 SAR = 1.0 weight; 3,000 - 3,999 SAR = 0.5 weight
        if (sal >= 4000) effectiveSaudiWeight += 1;
        else if (sal >= 3000) effectiveSaudiWeight += 0.5;
      } else {
        nonSaudiCount++;
      }
    }

    const totalEmployees = active.length;
    const saudizationPercentage =
      totalEmployees > 0
        ? Number(((effectiveSaudiWeight / totalEmployees) * 100).toFixed(1))
        : 100;

    let nitaqatBand: NitaqatComplianceSummary['nitaqatBand'] = 'بلاتيني';
    let bandColor: NitaqatComplianceSummary['bandColor'] = 'emerald';
    let visasEligible = true;

    if (saudizationPercentage >= 40) {
      nitaqatBand = 'بلاتيني';
      bandColor = 'emerald';
    } else if (saudizationPercentage >= 30) {
      nitaqatBand = 'أخضر مرتفع';
      bandColor = 'emerald';
    } else if (saudizationPercentage >= 22) {
      nitaqatBand = 'أخضر متوسط';
      bandColor = 'teal';
    } else if (saudizationPercentage >= 15) {
      nitaqatBand = 'أخضر منخفض';
      bandColor = 'amber';
      visasEligible = false;
    } else {
      nitaqatBand = 'أحمر';
      bandColor = 'rose';
      visasEligible = false;
    }

    const targetPlatinumWeight = Math.ceil(totalEmployees * 0.4);
    const nextBandTargetSaudis = Math.max(0, Math.ceil(targetPlatinumWeight - effectiveSaudiWeight));

    return {
      totalEmployees,
      saudiCount,
      nonSaudiCount,
      effectiveSaudiWeight,
      saudizationPercentage,
      nitaqatBand,
      bandColor,
      visasEligible,
      nextBandTargetSaudis,
    };
  }

  /**
   * Scans Employee Records for Expiring Documents (Iqama/ID, Passport, Qiwa Contract, Medical Insurance)
   */
  public static scanDocumentExpiries(
    employees: Array<{
      id: string;
      employee_code?: string;
      name: string;
      iqama_expiry_date?: string;
      passport_expiry_date?: string;
      contract_end_date?: string;
      medical_insurance_expiry?: string;
    }>,
    referenceDate: string = new Date().toISOString().slice(0, 10)
  ): DocumentExpiryAlert[] {
    const refTime = new Date(referenceDate).getTime();
    const alerts: DocumentExpiryAlert[] = [];

    const classify = (
      emp: (typeof employees)[number],
      docType: DocumentExpiryAlert['documentType'],
      labelAr: string,
      expiryDate?: string
    ) => {
      if (!expiryDate) return;
      const expTime = new Date(expiryDate).getTime();
      if (Number.isNaN(expTime)) return;
      const daysRemaining = Math.ceil((expTime - refTime) / (1000 * 60 * 60 * 24));

      let severity: DocumentExpiryAlert['severity'] = 'VALID';
      let statusLabelAr = 'ساري المفعول';

      if (daysRemaining < 0) {
        severity = 'EXPIRED';
        statusLabelAr = `منتهي منذ ${Math.abs(daysRemaining)} يوم`;
      } else if (daysRemaining <= 7) {
        severity = 'CRITICAL_7D';
        statusLabelAr = `حرج جداً (${daysRemaining} أيام)`;
      } else if (daysRemaining <= 30) {
        severity = 'WARNING_30D';
        statusLabelAr = `ينتهي خلال ${daysRemaining} يوماً`;
      } else if (daysRemaining <= 60) {
        severity = 'UPCOMING_60D';
        statusLabelAr = `تجديد قادم (${daysRemaining} يوماً)`;
      }

      alerts.push({
        employeeId: emp.id,
        employeeCode: emp.employee_code || emp.id,
        employeeName: emp.name,
        documentType: docType,
        documentLabelAr: labelAr,
        expiryDate,
        daysRemaining,
        severity,
        statusLabelAr,
      });
    };

    for (const emp of employees) {
      classify(emp, 'IQAMA_OR_ID', 'الهوية الوطنية / الإقامة (مقيم)', emp.iqama_expiry_date);
      classify(emp, 'QIWA_CONTRACT', 'عقد العمل الموثق (قوى)', emp.contract_end_date);
      classify(emp, 'MEDICAL_INSURANCE', 'وثيقة التأمين الطبي (مجلس الضمان)', emp.medical_insurance_expiry);
      classify(emp, 'PASSPORT', 'جواز السفر', emp.passport_expiry_date);
    }

    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JISR 2.0 FINANCIAL ERP EXTENSIONS:
  // Cost Center Splitting, Monthly IFRS Accruals, Loan Skip-Installment,
  // Advance Leave Salary Payout, YTD Sick-Leave Tracker, & Travel Per Diem
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Builds a Cost-Center-Allocated Double-Entry GL Payroll Journal (مركز القيود وتوزيع مراكز التكلفة)
   * Uses standard 6-digit Level-4 COA leaf codes (`530101`, `530102`, `210201`, `110702`, `420101`, `110201`)
   */
  public static buildCostAllocatedPayrollGlJournal(
    payrollMonth: string,
    companyCode: string,
    items: EmployeePayrollRecord[],
    defaultCostCenter: CostCenterAllocation = {
      code: 'CC-OPS-01',
      name: 'مركز تكلفة العمليات الرئيسي',
      percent: 100,
    }
  ): PayrollGlJournalPayload {
    const grossByCostCenter = new Map<string, { name: string; amount: number }>();
    const gosiEmpByCostCenter = new Map<string, { name: string; amount: number }>();

    let totalGross = 0;
    let totalGosiEmployee = 0;
    let totalGosiEmployer = 0;
    let totalAdvancesRecovered = 0;
    let totalSanctionsAndAbsences = 0;
    let totalNetPayable = 0;

    for (const r of items) {
      const gross =
        r.grossSalary ??
        r.basicSalary +
          r.housingAllowance +
          r.transportAllowance +
          r.otherAllowances +
          (r.overtimePay || 0) +
          (r.rewardsAmount || 0);
      const gosiEmpr = r.gosiEmployerShare || 0;

      totalGross += gross;
      totalGosiEmployee += r.gosiDeduction || 0;
      totalGosiEmployer += gosiEmpr;

      const rawAdv = r.advanceDeduction || 0;
      const rawSanc = (r.sanctionDeduction || 0) + (r.absenceDeduction || 0);
      const actualNonGosi = r.deductions || 0;
      if (rawAdv + rawSanc > 0 && actualNonGosi > 0) {
        const ratio = Math.min(1, actualNonGosi / (rawAdv + rawSanc));
        totalAdvancesRecovered += rawAdv * ratio;
        totalSanctionsAndAbsences += rawSanc * ratio;
      } else {
        totalSanctionsAndAbsences += actualNonGosi;
      }
      totalNetPayable += r.netSalary;

      const allocations =
        r.costCenterAllocations && r.costCenterAllocations.length > 0
          ? r.costCenterAllocations
          : [defaultCostCenter];
      const pctSum = allocations.reduce((s, a) => s + (Number(a.percent) || 0), 0) || 100;

      allocations.forEach((alloc, idx) => {
        const weight = (Number(alloc.percent) || 0) / pctSum;
        const ccGross =
          idx === allocations.length - 1 && allocations.length === 1
            ? gross
            : gross * weight;
        const ccGosi =
          idx === allocations.length - 1 && allocations.length === 1
            ? gosiEmpr
            : gosiEmpr * weight;

        const prevG = grossByCostCenter.get(alloc.code) || { name: alloc.name, amount: 0 };
        prevG.amount += ccGross;
        grossByCostCenter.set(alloc.code, prevG);

        const prevGosi = gosiEmpByCostCenter.get(alloc.code) || { name: alloc.name, amount: 0 };
        prevGosi.amount += ccGosi;
        gosiEmpByCostCenter.set(alloc.code, prevGosi);
      });
    }

    const lines: PayrollGlJournalLine[] = [];

    // Debit lines split by Cost Center (530101 — Salaries & Allowances)
    let sumGrossRounded = 0;
    const grossEntries = Array.from(grossByCostCenter.entries());
    grossEntries.forEach(([ccCode, info], idx) => {
      const rounded =
        idx === grossEntries.length - 1
          ? Number((Number(totalGross.toFixed(2)) - sumGrossRounded).toFixed(2))
          : Number(info.amount.toFixed(2));
      sumGrossRounded = Number((sumGrossRounded + rounded).toFixed(2));
      if (rounded > 0) {
        lines.push({
          accountCode: '530101',
          accountName: 'الرواتب الأساسية وبدلات السكن والنقل للموظفين الإداريين',
          debit: rounded,
          credit: 0,
          costCenterCode: ccCode,
          costCenterName: info.name,
          memo: `استحقاق رواتب وأجور شهر ${payrollMonth} — مركز تكلفة (${ccCode})`,
        });
      }
    });

    // Debit lines split by Cost Center (530102 — Employer GOSI Share)
    let sumGosiRounded = 0;
    const gosiEntries = Array.from(gosiEmpByCostCenter.entries());
    gosiEntries.forEach(([ccCode, info], idx) => {
      const rounded =
        idx === gosiEntries.length - 1
          ? Number((Number(totalGosiEmployer.toFixed(2)) - sumGosiRounded).toFixed(2))
          : Number(info.amount.toFixed(2));
      sumGosiRounded = Number((sumGosiRounded + rounded).toFixed(2));
      if (rounded > 0) {
        lines.push({
          accountCode: '530102',
          accountName: 'حصة الشركة في التأمينات الاجتماعية والتأمين الطبي ومكافأة نهاية الخدمة',
          debit: rounded,
          credit: 0,
          costCenterCode: ccCode,
          costCenterName: info.name,
          memo: `حصة المنشأة في التأمينات الاجتماعية GOSI لشهر ${payrollMonth} — (${ccCode})`,
        });
      }
    });

    const gosiPayable = Number((totalGosiEmployee + totalGosiEmployer).toFixed(2));
    if (gosiPayable > 0) {
      lines.push({
        accountCode: '210201',
        accountName: 'الرواتب والأجور المستحقة وأمانات التأمينات الاجتماعية (WPS & GOSI)',
        debit: 0,
        credit: gosiPayable,
        costCenterCode: defaultCostCenter.code,
        memo: `إجمالي فاتورة التأمينات الاجتماعية (حصة الموظف + الشركة) لشهر ${payrollMonth}`,
      });
    }

    const advRounded = Number(totalAdvancesRecovered.toFixed(2));
    if (advRounded > 0) {
      lines.push({
        accountCode: '110702',
        accountName: 'سلف الموظفين والدفعات المقدمة',
        debit: 0,
        credit: advRounded,
        costCenterCode: defaultCostCenter.code,
        memo: `استرداد أقساط سلف الموظفين الشهرية لمسير ${payrollMonth}`,
      });
    }

    const sancRounded = Number(totalSanctionsAndAbsences.toFixed(2));
    if (sancRounded > 0) {
      lines.push({
        accountCode: '420101',
        accountName: 'إيرادات رسوم وتسويات خصومات الجزاءات الإدارية',
        debit: 0,
        credit: sancRounded,
        costCenterCode: defaultCostCenter.code,
        memo: `تسوية استقطاعات الجزاءات والغياب لمسير ${payrollMonth}`,
      });
    }

    const totalDebit = Number(lines.reduce((s, l) => s + l.debit, 0).toFixed(2));
    const creditsSoFar = Number(lines.reduce((s, l) => s + l.credit, 0).toFixed(2));
    const bankCredit = Number(Math.max(0, totalDebit - creditsSoFar).toFixed(2));

    if (bankCredit > 0) {
      lines.push({
        accountCode: '110201',
        accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي (WPS)',
        debit: 0,
        credit: bankCredit,
        costCenterCode: defaultCostCenter.code,
        memo: `صافي الرواتب المحولة عبر حماية الأجور مدد لشهر ${payrollMonth} (${totalNetPayable.toFixed(2)} ⃁)`,
      });
    }

    const finalCredit = Number(lines.reduce((s, l) => s + l.credit, 0).toFixed(2));

    return {
      companyCode,
      payrollMonth,
      entryDate: new Date().toISOString().slice(0, 10),
      description: `قيد مسير الرواتب الموزع على مراكز التكلفة (${payrollMonth})`,
      totalDebit,
      totalCredit: finalCredit,
      isBalanced: Math.abs(totalDebit - finalCredit) < 0.01,
      lines,
    };
  }

  /**
   * Builds Monthly IFRS HR Accruals Journal (IAS 19 EOSB + Annual Leave + Air Tickets + Medical Amortization)
   */
  public static buildMonthlyHrAccrualsJournal(
    accrualMonth: string,
    companyCode: string,
    employees: Array<{
      id: string;
      name: string;
      hire_date?: string;
      salary: number;
      annual_ticket_allowance?: number;
      medical_insurance_annual_cost?: number;
      status?: string;
    }>
  ): MonthlyHrAccrualSummary {
    const active = employees.filter((e) => e.status !== 'نهاية خدمة');
    let eosbSum = 0;
    let leaveSum = 0;
    let ticketSum = 0;
    let medicalSum = 0;

    const refDate = `${accrualMonth}-28`;

    for (const emp of active) {
      const wage = Math.max(0, Number(emp.salary) || 0);
      const entitlement = this.calculateAnnualLeaveEntitlement(emp.hire_date || '2024-01-01', refDate);

      // Monthly EOSB provision: <= 5 years -> (wage / 2) / 12 ; > 5 years -> wage / 12
      const monthlyEosb = entitlement.serviceYears < 5 ? wage / 2 / 12 : wage / 12;
      // Monthly Annual Leave provision: dailyWage * monthlyAccrualRate (1.75 or 2.5 days)
      const monthlyLeave = (wage / 30) * entitlement.monthlyAccrualRate;
      const monthlyTicket = Math.max(0, Number(emp.annual_ticket_allowance ?? 2400)) / 12;
      const monthlyMedical = Math.max(0, Number(emp.medical_insurance_annual_cost ?? 3600)) / 12;

      eosbSum += monthlyEosb;
      leaveSum += monthlyLeave;
      ticketSum += monthlyTicket;
      medicalSum += monthlyMedical;
    }

    const eosbProvisionAmount = Number(eosbSum.toFixed(2));
    const leaveProvisionAmount = Number(leaveSum.toFixed(2));
    const ticketProvisionAmount = Number(ticketSum.toFixed(2));
    const medicalAmortizationAmount = Number(medicalSum.toFixed(2));
    const leaveAndTicketTotal = Number((leaveProvisionAmount + ticketProvisionAmount).toFixed(2));
    const totalAccrualAmount = Number(
      (eosbProvisionAmount + leaveAndTicketTotal + medicalAmortizationAmount).toFixed(2)
    );

    const lines: PayrollGlJournalLine[] = [];
    if (eosbProvisionAmount > 0) {
      lines.push(
        {
          accountCode: '530102',
          accountName: 'حصة الشركة في التأمينات الاجتماعية والتأمين الطبي ومكافأة نهاية الخدمة',
          debit: eosbProvisionAmount,
          credit: 0,
          costCenterCode: 'CC-HR-ACC',
          memo: `مصروف مخصص مكافأة نهاية الخدمة الشهري (IAS 19) لشهر ${accrualMonth}`,
        },
        {
          accountCode: '220301',
          accountName: 'مخصص مكافأة نهاية الخدمة للكادر الإداري والعمليات (تقييم اكتواري IAS 19)',
          debit: 0,
          credit: eosbProvisionAmount,
          costCenterCode: 'CC-HR-ACC',
          memo: `استحقاق مخصص مكافأة نهاية الخدمة المتراكم لشهر ${accrualMonth}`,
        }
      );
    }

    if (leaveAndTicketTotal > 0) {
      lines.push(
        {
          accountCode: '530101',
          accountName: 'الرواتب الأساسية وبدلات السكن والنقل للموظفين الإداريين',
          debit: leaveAndTicketTotal,
          credit: 0,
          costCenterCode: 'CC-HR-ACC',
          memo: `مصروف مخصص الإجازات السنوية وتذاكر السفر لشهر ${accrualMonth}`,
        },
        {
          accountCode: '210201',
          accountName: 'الرواتب والأجور المستحقة وأمانات التأمينات الاجتماعية (WPS & GOSI)',
          debit: 0,
          credit: leaveAndTicketTotal,
          costCenterCode: 'CC-HR-ACC',
          memo: `مخصص الإجازات السنوية (${leaveProvisionAmount} ⃁) وتذاكر السفر (${ticketProvisionAmount} ⃁) المستحقة`,
        }
      );
    }

    if (medicalAmortizationAmount > 0) {
      lines.push(
        {
          accountCode: '530102',
          accountName: 'حصة الشركة في التأمينات الاجتماعية والتأمين الطبي ومكافأة نهاية الخدمة',
          debit: medicalAmortizationAmount,
          credit: 0,
          costCenterCode: 'CC-HR-ACC',
          memo: `إطفاء قسط التأمين الطبي الشهري للموظفين والتابعين لشهر ${accrualMonth}`,
        },
        {
          accountCode: '110701',
          accountName: 'إيجارات مقرات وتأمين طبي ورخص مدفوعة مقدماً',
          debit: 0,
          credit: medicalAmortizationAmount,
          costCenterCode: 'CC-HR-ACC',
          memo: `تخفيض رصيد التأمين الطبي المدفوع مقدماً لشهر ${accrualMonth}`,
        }
      );
    }

    const totalDebit = Number(lines.reduce((s, l) => s + l.debit, 0).toFixed(2));
    const totalCredit = Number(lines.reduce((s, l) => s + l.credit, 0).toFixed(2));

    return {
      accrualMonth,
      companyCode,
      employeesCount: active.length,
      eosbProvisionAmount,
      leaveProvisionAmount,
      ticketProvisionAmount,
      medicalAmortizationAmount,
      totalAccrualAmount,
      journalPayload: {
        companyCode,
        payrollMonth: accrualMonth,
        entryDate: new Date().toISOString().slice(0, 10),
        description: `قيد المخصصات الشهرية للموارد البشرية (نهاية الخدمة، الإجازات، التذاكر، التأمين) — ${accrualMonth}`,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        lines,
      },
    };
  }

  /**
   * Jisr Loan Skip-Installment Helper: returns 0 if payrollMonth is in deferred_months
   */
  public static getEffectiveAdvanceInstallmentForMonth(
    advance: {
      amount: number;
      remaining_amount?: number;
      monthly_installment?: number;
      installments_count: number;
      deferred_months?: string[];
      status: string;
    },
    payrollMonth: string
  ): {
    effectiveInstallment: number;
    isDeferredThisMonth: boolean;
  } {
    if (advance.status !== 'معتمد') {
      return { effectiveInstallment: 0, isDeferredThisMonth: false };
    }
    const rem = advance.remaining_amount ?? advance.amount;
    if (rem <= 0) {
      return { effectiveInstallment: 0, isDeferredThisMonth: false };
    }
    if (advance.deferred_months && advance.deferred_months.includes(payrollMonth)) {
      return { effectiveInstallment: 0, isDeferredThisMonth: true };
    }
    const baseMonthly =
      advance.monthly_installment || advance.amount / Math.max(1, advance.installments_count);
    return {
      effectiveInstallment: Number(Math.min(rem, baseMonthly).toFixed(2)),
      isDeferredThisMonth: false,
    };
  }

  /**
   * Calculates Upfront Leave Salary Payout (صرف راتب الإجازة مقدماً قبل التمتع بالإجازة)
   */
  public static calculateAdvanceLeavePayout(
    monthlyTotalSalary: number,
    approvedLeaveDays: number,
    includeTicketAllowance = 0
  ): {
    dailyRate: number;
    leaveSalaryAmount: number;
    ticketAllowance: number;
    totalUpfrontPayout: number;
  } {
    const dailyRate = Number((Math.max(0, monthlyTotalSalary) / 30).toFixed(2));
    const leaveSalaryAmount = Number((dailyRate * Math.max(0, approvedLeaveDays)).toFixed(2));
    const ticketAllowance = Number(Math.max(0, includeTicketAllowance).toFixed(2));
    return {
      dailyRate,
      leaveSalaryAmount,
      ticketAllowance,
      totalUpfrontPayout: Number((leaveSalaryAmount + ticketAllowance).toFixed(2)),
    };
  }

  /**
   * Calculates Cumulative Sick Leave Days Used in the Same Year for Art. 117 Tiers
   */
  public static calculateEmployeeYtdSickDays(
    employeeIdOrName: string,
    yearPrefix: string,
    leaveRequests: Array<{
      employee_id?: string;
      employee_name: string;
      vacation_type: string;
      from_date: string;
      days_count: number;
      status: string;
    }>
  ): number {
    return leaveRequests
      .filter(
        (r) =>
          r.status === 'معتمد' &&
          (r.employee_id === employeeIdOrName || r.employee_name === employeeIdOrName) &&
          r.from_date.startsWith(yearPrefix) &&
          (r.vacation_type.includes('مرض') || /sick/i.test(r.vacation_type))
      )
      .reduce((sum, r) => sum + (Number(r.days_count) || 0), 0);
  }

  /**
   * Calculates Business Travel Per Diem Allowance (بدل الانتداب اليومي حسب الدرجة والوجهة)
   */
  public static calculateBusinessTripPerDiem(params: {
    grade: string;
    tripScope: 'DOMESTIC' | 'INTERNATIONAL';
    nightsCount: number;
    estimatedTicketCost?: number;
  }): {
    dailyPerDiem: number;
    perDiemTotal: number;
    estimatedTicketCost: number;
    totalTripAllowance: number;
  } {
    const isExecutive = params.grade.includes('الخامسة') || params.grade.includes('قيادي');
    const isLead = params.grade.includes('الرابعة') || params.grade.includes('مدير');

    let dailyPerDiem = 400; // Standard Domestic Specialist
    if (params.tripScope === 'DOMESTIC') {
      dailyPerDiem = isExecutive ? 800 : isLead ? 600 : 400;
    } else {
      dailyPerDiem = isExecutive ? 1500 : isLead ? 1100 : 750;
    }

    const nights = Math.max(1, Math.round(params.nightsCount));
    const perDiemTotal = Number((dailyPerDiem * nights).toFixed(2));
    const ticket = Number(Math.max(0, params.estimatedTicketCost || 0).toFixed(2));
    return {
      dailyPerDiem,
      perDiemTotal,
      estimatedTicketCost: ticket,
      totalTripAllowance: Number((perDiemTotal + ticket).toFixed(2)),
    };
  }
}
