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

export interface EmployeePayrollRecord {
  employeeId: string;
  employeeNumber: string;
  nationalIdOrIqama: string;
  employeeName: string;
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
  separationReason: 'RESIGNATION' | 'TERMINATION_BY_EMPLOYER' | 'CONTRACT_EXPIRY' | 'FORCE_MAJEURE' | 'CONSENT';
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
  memo: string;
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
    separationReason: 'RESIGNATION' | 'TERMINATION_BY_EMPLOYER' | 'CONTRACT_EXPIRY' | 'FORCE_MAJEURE' | 'CONSENT';
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

    // Determine percentage based on separation reason (Article 85)
    let entitlementPercentage = 100;
    let legalArticleNote = 'المادة (84): استحقاق كامل المكافأة.';

    if (params.separationReason === 'RESIGNATION') {
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
    separationReason: 'RESIGNATION' | 'TERMINATION_BY_EMPLOYER' | 'CONTRACT_EXPIRY' | 'FORCE_MAJEURE' | 'CONSENT';
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
}
