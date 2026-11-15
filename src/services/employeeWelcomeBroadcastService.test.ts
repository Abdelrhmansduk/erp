import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_COMPANY_DISPLAY_SCREENS,
  buildMailtoWelcomeHref,
  buildScreenWebPlayerUrl,
  buildWhatsAppWelcomeMessage,
  filterActiveBroadcastsForScreen,
  triggerNewEmployeeOnboardingConsequences,
  type WelcomeBroadcastRecord,
} from './employeeWelcomeBroadcastService';
import {
  calculateFamilyAirTicketEntitlement,
  calculateRetroactivePayAdjustment,
  evaluateLeaveQuotaAndReplacement,
  evaluatePayrollCutoffWindow,
} from './jisrAdvancedComplianceEngine';
import { realErpDataStore } from './realErpDataStore';

describe('New Employee Welcome, 7-Step Onboarding Consequences & Smart Signage Engine', () => {
  beforeEach(() => {
    realErpDataStore.purgeAllDemoData();
  });

  it('executes all 7 onboarding consequences and broadcasts welcome card to company screens', async () => {
    const res = await triggerNewEmployeeOnboardingConsequences({
      companyId: 'SAF',
      companyNameAr: 'مجموعة خالد السليم القابضة',
      employeeId: 'EMP-TEST-701',
      employeeCode: 'EMP-SAF-701',
      employeeName: 'سعود عبدالله القحطاني',
      nationalId: '1098765432',
      jobTitle: 'أخصائي أول تحول رقمي',
      department: 'الموارد البشرية',
      branch: 'المقر الرئيسي - الرياض',
      hireDate: '2026-11-15',
      salary: 12000,
      phone: '0551234567',
      email: 'saud.q@kas.sa',
      buddyName: 'فهد العتيبي',
      targetScreenIds: ['ALL'],
      autoBroadcastToScreens: true,
    });

    expect(res.consequencesSummary).toHaveLength(7);
    expect(res.consequencesSummary.every((s) => s.completed)).toBe(true);
    expect(res.journey.step_iam_email_ready).toBe(true);
    expect(res.journey.step_qiwa_contract_issued).toBe(true);
    expect(res.journey.step_gosi_registered).toBe(true);
    expect(res.journey.step_medical_insurance_added).toBe(true);
    expect(res.journey.step_starter_custody_assigned).toBe(true);
    expect(res.journey.step_shift_geofence_linked).toBe(true);
    expect(res.journey.step_circular_published).toBe(true);

    const contracts = await realErpDataStore.getRecords<{ id: string; employee_id: string }>(
      'employee_contracts',
      []
    );
    expect(contracts.some((c) => c.employee_id === 'EMP-TEST-701')).toBe(true);

    const custodies = await realErpDataStore.getRecords<{ id: string; employee_id: string }>(
      'custodies',
      []
    );
    expect(custodies.filter((c) => c.employee_id === 'EMP-TEST-701').length).toBeGreaterThanOrEqual(
      2
    );

    const broadcasts = await realErpDataStore.getRecords<WelcomeBroadcastRecord>(
      'hr_welcome_broadcasts',
      []
    );
    expect(broadcasts.some((b) => b.employee_id === 'EMP-TEST-701' && b.is_active)).toBe(true);
  });

  it('filters active broadcasts across ALL company screens and targeted branch screens', () => {
    expect(DEFAULT_COMPANY_DISPLAY_SCREENS.length).toBeGreaterThanOrEqual(6);

    const sampleBroadcasts: WelcomeBroadcastRecord[] = [
      {
        id: 'WBC-1',
        company_id: 'SAF',
        company_name_ar: 'مجموعة خالد السليم',
        employee_id: 'E1',
        employee_code: 'EMP-01',
        employee_name: 'أحمد العلي',
        job_title: 'محاسب',
        department: 'المالية',
        branch: 'الرياض',
        hire_date: '2026-11-14',
        buddy_name: 'فهد',
        headline_ar: 'مرحباً',
        welcome_quote_ar: 'أهلاً بك',
        target_screen_ids: ['ALL'],
        slide_duration_seconds: 10,
        is_active: true,
        broadcasted_by: 'HR',
        created_at: '2026-11-14T10:00:00Z',
      },
      {
        id: 'WBC-2',
        company_id: 'SAF',
        company_name_ar: 'مجموعة خالد السليم',
        employee_id: 'E2',
        employee_code: 'EMP-02',
        employee_name: 'خالد الحربي',
        job_title: 'مشرف فرع',
        department: 'التشغيل',
        branch: 'جدة',
        hire_date: '2026-11-14',
        buddy_name: 'سالم',
        headline_ar: 'مرحباً',
        welcome_quote_ar: 'أهلاً بك في جدة',
        target_screen_ids: ['SCR-JEDDAH-BR'],
        slide_duration_seconds: 12,
        is_active: true,
        broadcasted_by: 'HR',
        created_at: '2026-11-14T10:05:00Z',
      },
    ];

    const lobbySlides = filterActiveBroadcastsForScreen(sampleBroadcasts, 'SCR-HQ-LOBBY', 'SAF');
    expect(lobbySlides.map((s) => s.id)).toEqual(['WBC-1']);

    const jeddahSlides = filterActiveBroadcastsForScreen(sampleBroadcasts, 'SCR-JEDDAH-BR', 'SAF');
    expect(jeddahSlides.map((s) => s.id)).toEqual(['WBC-1', 'WBC-2']);
  });

  it('builds valid internet web screen URLs, WhatsApp welcome text, and mailto links', () => {
    const url = buildScreenWebPlayerUrl('SCR-HQ-LOBBY', 'SAF');
    expect(url).toContain('signage_screen=SCR-HQ-LOBBY');
    expect(url).toContain('company=SAF');

    const bc: WelcomeBroadcastRecord = {
      id: 'WBC-WA',
      company_id: 'SAF',
      company_name_ar: 'مجموعة خالد السليم القابضة',
      employee_id: 'E9',
      employee_code: 'EMP-09',
      employee_name: 'نورة السبيعي',
      job_title: 'أخصائية موارد بشرية',
      department: 'الموارد البشرية',
      branch: 'الرياض',
      hire_date: '2026-11-15',
      buddy_name: 'ريم بن حسين',
      headline_ar: 'أهلاً بانضمام نورة السبيعي',
      welcome_quote_ar: 'نتمنى لك التوفيق',
      corporate_email: 'noura@kas.sa',
      phone: '0559998887',
      target_screen_ids: ['ALL'],
      slide_duration_seconds: 12,
      is_active: true,
      broadcasted_by: 'HR@kas.sa',
      created_at: '2026-11-15T08:00:00Z',
    };

    const directWa = buildWhatsAppWelcomeMessage(bc, 'DIRECT_EMPLOYEE');
    expect(directWa).toContain('نورة السبيعي');
    expect(directWa).toContain('EMP-09');
    expect(directWa).toContain('signage_screen=ALL');

    const groupWa = buildWhatsAppWelcomeMessage(bc, 'COMPANY_GROUP');
    expect(groupWa).toContain('إعلان ترحيب بانضمام زميل جديد');

    const mailHref = buildMailtoWelcomeHref(bc);
    expect(mailHref).toContain('mailto:noura%40kas.sa');
    expect(mailHref).toContain('HR%40kas.sa');
  });
});

describe('Jisr Advanced Operational Engines (Cutoff, Retro Pay, Quota & Family Tickets)', () => {
  it('evaluates payroll cutoff window and rolls post-cutoff events to next month', () => {
    const preCutoff = evaluatePayrollCutoffWindow({
      eventDateIso: '2026-11-20',
      cutoffDayOfMonth: 25,
    });
    expect(preCutoff.includedInCurrentMonth).toBe(true);
    expect(preCutoff.effectivePayrollMonth).toBe('2026-11');

    const postCutoffDec = evaluatePayrollCutoffWindow({
      eventDateIso: '2026-12-27',
      cutoffDayOfMonth: 25,
    });
    expect(postCutoffDec.includedInCurrentMonth).toBe(false);
    expect(postCutoffDec.effectivePayrollMonth).toBe('2027-01');
  });

  it('calculates retroactive pay adjustments for promotions and mid-month joiners', () => {
    const promoRetro = calculateRetroactivePayAdjustment({
      reasonType: 'PROMOTION_DIFF',
      previousMonthlyGross: 9000,
      newMonthlyGross: 12000,
      effectiveDays: 15,
    });
    expect(promoRetro.dailyDifference).toBe(100);
    expect(promoRetro.retroactivePayableAmount).toBe(1500);

    const joinRetro = calculateRetroactivePayAdjustment({
      reasonType: 'MID_MONTH_JOIN',
      previousMonthlyGross: 0,
      newMonthlyGross: 9000,
      effectiveDays: 6,
    });
    expect(joinRetro.retroactivePayableAmount).toBe(1800);
  });

  it('enforces department concurrent leave quota and replacement colleague handover', () => {
    const blockedNoRep = evaluateLeaveQuotaAndReplacement({
      employeeId: 'E1',
      department: 'التشغيل',
      startDate: '2026-11-20',
      endDate: '2026-11-25',
      departmentEmployeesCount: 8,
      existingDepartmentLeaves: [],
      requireReplacementColleague: true,
      replacementEmployeeId: '',
    });
    expect(blockedNoRep.allowed).toBe(false);
    expect(blockedNoRep.replacementValid).toBe(false);

    const blockedQuota = evaluateLeaveQuotaAndReplacement({
      employeeId: 'E3',
      department: 'التشغيل',
      startDate: '2026-11-20',
      endDate: '2026-11-25',
      departmentEmployeesCount: 4,
      existingDepartmentLeaves: [
        { employee_id: 'E1', from_date: '2026-11-19', to_date: '2026-11-24', status: 'معتمد' },
      ],
      maxConcurrentPercent: 25,
      requireReplacementColleague: true,
      replacementEmployeeId: 'E4',
    });
    expect(blockedQuota.allowed).toBe(false);
    expect(blockedQuota.projectedLeavePercent).toBe(50);
  });

  it('calculates single vs family contract air ticket entitlement with 75% child fare', () => {
    const single = calculateFamilyAirTicketEntitlement({
      contractStatus: 'SINGLE',
      baseAdultTicketFare: 2000,
    });
    expect(single.totalAnnualEntitlementAmount).toBe(2000);

    const family = calculateFamilyAirTicketEntitlement({
      contractStatus: 'FAMILY',
      baseAdultTicketFare: 2000,
      hasEligibleSpouse: true,
      eligibleChildrenUnder18Count: 2,
    });
    // 2 adults * 2000 + 2 kids * 1500 = 7000
    expect(family.adultTicketsCount).toBe(2);
    expect(family.childTicketsCount).toBe(2);
    expect(family.totalAnnualEntitlementAmount).toBe(7000);
  });
});
