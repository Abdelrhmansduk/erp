import { describe, it, expect, beforeEach } from 'vitest';
import {
  type CrmAdCampaign,
  type CrmLead,
  type CrmContentTask,
  evaluateCampaignsPortfolio,
  evaluateAbTestTwoProportion,
  calculateScientificGoalBudget,
  computeMeasurementReadinessIndex,
  buildNormalizedUtmUrl,
  validatePlatformCreativeSpec,
  buildPdplSafeCvAdCard,
  exportAdVariationsCsv,
  computeWeightedPipelineForecast,
  evaluateLeadSlaAndRotting,
  resolveAutoAssignedSalesRep,
  calculateReferralEconomics,
  validateReferralAntiFraud,
  preparePdplCompliantBroadcast,
} from '../crmMarketingEngine';

const TEST_CRM_CAMPAIGNS: CrmAdCampaign[] = [
  {
    id: 'CMP-SAF-001',
    company_id: 'SAF',
    campaign_code: 'SNAP_CONV_SAF_PH',
    name: 'حملة استقدام السفير الماسي',
    platform: 'snapchat',
    objective: 'conversions',
    service_type: 'استقدام الفلبين',
    budget_bucket: 'proven_70',
    budget_sar: 18000,
    spent_sar: 12400,
    target_cpa_sar: 650,
    impressions: 342000,
    clicks: 6840,
    leads_count: 148,
    qualified_leads_count: 89,
    reserved_count: 41,
    won_contracts_count: 26,
    revenue_sar: 429000,
    utm_source: 'snapchat',
    utm_medium: 'paid_social',
    utm_campaign: 'saf_ph_conv',
    owner_email: 'm.alkhader.marketing@kas.sa',
    owner_name: 'معاذ الخضر',
    status: 'نشطة',
    start_date: '2026-11-01',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'CMP-DAR-004',
    company_id: 'DAR',
    campaign_code: 'META_TEST_DAR',
    name: 'حملة تجريبية دار الرواد',
    platform: 'meta',
    objective: 'leads',
    service_type: 'نقل خدمات',
    budget_bucket: 'testing_30',
    budget_sar: 6500,
    spent_sar: 6500,
    target_cpa_sar: 700,
    impressions: 210000,
    clicks: 950,
    leads_count: 18,
    qualified_leads_count: 7,
    reserved_count: 4,
    won_contracts_count: 3,
    revenue_sar: 49500,
    utm_source: 'meta',
    utm_medium: 'paid_social',
    utm_campaign: 'dar_transfer_test',
    owner_email: 'm.alkhader.marketing@kas.sa',
    owner_name: 'معاذ الخضر',
    status: 'نشطة',
    start_date: '2026-11-01',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'CMP-KAS-005',
    company_id: 'KAS',
    campaign_code: 'GOOGLE_B2B_KAS',
    name: 'حملة قطاع الأميال — كاس للتجارة',
    platform: 'google',
    objective: 'leads',
    service_type: 'مبيعات المعرض والأميال',
    budget_bucket: 'proven_70',
    budget_sar: 12000,
    spent_sar: 8000,
    target_cpa_sar: 800,
    impressions: 90000,
    clicks: 3600,
    leads_count: 60,
    qualified_leads_count: 35,
    reserved_count: 18,
    won_contracts_count: 12,
    revenue_sar: 310000,
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'kas_imal_b2b',
    owner_email: 'm.alkhader.marketing@kas.sa',
    owner_name: 'معاذ الخضر',
    status: 'نشطة',
    start_date: '2026-11-01',
    created_at: '2026-11-01T08:00:00Z',
  },
];

const TEST_CRM_LEADS: CrmLead[] = [
  {
    id: 'LED-2026-101',
    company_id: 'SAF',
    lead_no: 'LED-SAF-101',
    full_name: 'عميل اختبار الصلاحية',
    phone: '+966551122334',
    city: 'الرياض',
    client_type: 'شخص',
    service_interest: 'استقدام الفلبين',
    source_platform: 'snapchat',
    campaign_id: 'CMP-SAF-001',
    utm_campaign: 'saf_ph_conv',
    stage: 'reserved',
    probability_pct: 75,
    estimated_value_sar: 16500,
    assigned_to_email: 'h.hassan.safir@kas.sa',
    assigned_to_name: 'حذيفة رمضان',
    captured_by_email: 'a.magdy.marketing@kas.sa',
    sla_due_at: new Date(Date.now() + 10 * 60000).toISOString(),
    first_response_at: new Date(Date.now() - 5 * 60000).toISOString(),
    last_activity_at: new Date().toISOString(),
    retargeting_bucket: 'hot_1_7d',
    marketing_consent: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'LED-2026-104',
    company_id: 'DAR',
    lead_no: 'LED-DAR-104',
    full_name: 'فرصة متأخرة للاختبار',
    phone: '+966544112299',
    city: 'الرياض',
    client_type: 'شخص',
    service_interest: 'نقل خدمات',
    source_platform: 'meta',
    campaign_id: 'CMP-DAR-004',
    utm_campaign: 'dar_transfer_test',
    stage: 'qualified',
    probability_pct: 50,
    estimated_value_sar: 18000,
    assigned_to_email: 'a.abdelwahab.daralrowad@kas.sa',
    assigned_to_name: 'عمرو عبدالوهاب',
    captured_by_email: 'a.magdy.marketing@kas.sa',
    sla_due_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    last_activity_at: new Date(Date.now() - 96 * 3600000).toISOString(),
    retargeting_bucket: 'warm_7_30d',
    marketing_consent: true,
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
];

const TEST_CONTENT_TASKS: CrmContentTask[] = [
  {
    id: 'CNT-TEST-01',
    company_id: 'SAF',
    task_code: 'STD-SAF-01',
    title: 'إعلان اختبار المواصفات',
    content_type: 'reel_video',
    creative_angle: 'outcome',
    target_platform: 'snapchat',
    campaign_id: 'CMP-SAF-001',
    headline_text: 'استقدام موثق عبر مساند',
    primary_copy_text: 'عقود استقدام نظامية بضمان 90 يوماً.',
    char_spec_valid: true,
    iteration_round: 1,
    designer_email: 'nagati.marketing@kas.sa',
    videographer_email: 'm.almontaser.marketing@kas.sa',
    marketer_email: 'm.alkhader.marketing@kas.sa',
    approval_status: 'approved',
    scheduled_at: '2026-11-25T10:00:00Z',
    created_at: '2026-11-20T08:00:00Z',
  },
];
import {
  recordMarketingConsent,
  unsubscribeMarketingImmediately,
} from '../menaLegalComplianceService';
import {
  findAllowedKasEmployee,
  EXCLUDED_KAS_EMAILS,
} from '../../config/kasAllowedEmails';
import { authService } from '../authService';

describe('Skill-Driven Saudi CRM, Paid Ads & Moaz Marketing Hub Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('routes Moaz Al-Khader & Marketing team to their dedicated CRM/Marketing/Studio hubs and permanently blocks Mustafa', () => {
    expect(EXCLUDED_KAS_EMAILS['mustafa.marketing@kas.sa']).toBeDefined();
    expect(findAllowedKasEmployee('mustafa.marketing@kas.sa')).toBeNull();

    const moaz = findAllowedKasEmployee('m.alkhader.marketing@kas.sa');
    expect(moaz).not.toBeNull();
    expect(moaz?.defaultTab).toBe('crm-marketing-hub');
    expect(moaz?.allowedTabsOverride).toContain('crm-marketing-hub');
    expect(moaz?.allowedTabsOverride).toContain('marketing-studio');
    expect(moaz?.allowedTabsOverride).toContain('crm-leads-pipeline');

    const designer = findAllowedKasEmployee('nagati.marketing@kas.sa');
    expect(designer?.defaultTab).toBe('marketing-studio');

    const videographer = findAllowedKasEmployee('m.almontaser.marketing@kas.sa');
    expect(videographer?.defaultTab).toBe('marketing-studio');

    const magdy = findAllowedKasEmployee('a.magdy.marketing@kas.sa');
    expect(magdy?.defaultTab).toBe('crm-leads-pipeline');
    expect(magdy?.titleAr).not.toContain('مصطفي');

    // Enforce two-way isolation: Moaz (.marketing) cannot open standalone KAS Trade tenders
    const moazProfile = {
      id: moaz!.id,
      username: moaz!.username,
      full_name: moaz!.nameAr,
      email: moaz!.email,
      role: moaz!.titleAr,
      branch: moaz!.branch,
      company_id: moaz!.company_id,
      department_id: moaz!.department_id,
      allowed_tabs_override: moaz!.allowedTabsOverride,
    };
    expect(authService.isTabAuthorizedForUser(moazProfile, 'crm-marketing-hub')).toBe(true);
    expect(authService.isTabAuthorizedForUser(moazProfile, 'kas-suite')).toBe(false);
    expect(authService.isTabAuthorizedForUser(moazProfile, 'kas-commercial')).toBe(false);
  });

  it('evaluates multi-channel ad campaigns (ROAS, Funnel-Adjusted CAC, Efficiency Index, Outliers & 70/30 Split)', () => {
    const portfolio = evaluateCampaignsPortfolio(TEST_CRM_CAMPAIGNS, 'all');
    // 'all' view isolates standalone KAS commercial campaign
    expect(portfolio.items.some((i) => i.campaign.company_id === 'KAS')).toBe(false);
    expect(portfolio.blendedRoas).toBeGreaterThan(10);
    expect(portfolio.provenSharePct).toBeGreaterThan(60);

    // DAR testing campaign has low CTR & high CPA relative to target -> flagged
    const darItem = portfolio.items.find((i) => i.campaign.company_id === 'DAR');
    expect(darItem).toBeDefined();
    expect(darItem!.outlierFlags).toContain('HIGH_CPA_OUTLIER');
    expect(darItem!.verdict).toBe('مراجعة وإيقاف الهدر');
    expect(darItem!.recommendedSpendSar).toBe(5200); // 6500 * 0.8 bounded -20%

    // KAS standalone view sees ONLY KAS campaign
    const kasPortfolio = evaluateCampaignsPortfolio(TEST_CRM_CAMPAIGNS, 'KAS');
    expect(kasPortfolio.items).toHaveLength(1);
    expect(kasPortfolio.items[0].campaign.company_id).toBe('KAS');
  });

  it('computes scientific goal-based budget (+15% experimental, 70/30 split) and two-proportion A/B significance', () => {
    const budget = calculateScientificGoalBudget({
      targetContractsPerMonth: 50,
      historicalCpaSar: 400,
    });
    expect(budget.baseBudgetSar).toBe(20000);
    expect(budget.experimentalReserve15Sar).toBe(3000);
    expect(budget.totalRecommendedBudgetSar).toBe(23000);
    expect(budget.proven70AllocationSar).toBe(16100);
    expect(budget.testing30AllocationSar).toBe(6900);

    const abWinner = evaluateAbTestTwoProportion({
      exposuresA: 3000,
      conversionsA: 60, // 2.0%
      exposuresB: 3000,
      conversionsB: 105, // 3.5%
    });
    expect(abWinner.significantAt95).toBe(true);
    expect(abWinner.liftPct).toBe(75);
  });

  it('enforces Signal Readiness Index (0-100), lowercase PII-free UTM URLs, platform char specs, and PDPL-safe CV ad cards', () => {
    const readiness = computeMeasurementReadinessIndex({
      campaigns: TEST_CRM_CAMPAIGNS,
      leads: TEST_CRM_LEADS,
      pdplGuardActive: true,
    });
    expect(readiness.score).toBeGreaterThanOrEqual(85);
    expect(readiness.verdict).toBe('Measurement-Ready');

    const utm = buildNormalizedUtmUrl({
      source: 'SnapChat Ads',
      medium: 'Paid Social',
      campaign: 'SAF Offer +966551122334 user@test.com',
      content: 'Hook A',
    });
    expect(utm.utmSource).toBe('snapchat_ads');
    expect(utm.utmCampaign).toBe('saf_offer');
    expect(utm.fullUrl).not.toContain('966551122334');
    expect(utm.fullUrl).not.toContain('user@test.com');

    const overSpec = validatePlatformCreativeSpec({
      platform: 'google',
      headline: 'هذا العنوان الإعلاني طويل جداً ويتجاوز ثلاثين حرفاً بكثير',
      primaryText: 'نص إعلاني قصير ومطابق للمواصفات.',
    });
    expect(overSpec.valid).toBe(false);
    expect(overSpec.trimmedHeadlineSuggestion.length).toBeLessThanOrEqual(30);

    const cvCard = buildPdplSafeCvAdCard({
      cv_code: 'PHL-9988',
      name: 'MARIA LOURDES SANTOS',
      passport_number: 'P99112233',
      phone: '+639171234567',
      nationality: 'الفلبين',
      profession: 'عاملة منزلية',
      experience_years: 5,
    });
    expect(cvCard.pdplCompliant).toBe(true);
    expect(cvCard.displayFirstNameOnly).toBe('MARIA (كود #PHL-9988)');
    expect(cvCard.adPrimaryCopy).not.toContain('P99112233');
    expect(cvCard.adPrimaryCopy).not.toContain('SANTOS');

    const csv = exportAdVariationsCsv(TEST_CONTENT_TASKS);
    expect(csv).toContain('task_code,platform,angle,headline');
  });

  it('tracks weighted pipeline forecast, 15-min SLA, rotting deals, referral anti-fraud, and PDPL Art. 25 broadcast blocking', async () => {
    const forecast = computeWeightedPipelineForecast(TEST_CRM_LEADS, 'all');
    expect(forecast.weightedForecastSar).toBeGreaterThan(0);
    expect(forecast.rottingLeadsCount).toBeGreaterThanOrEqual(1);

    const staleLead = TEST_CRM_LEADS.find((l) => l.id === 'LED-2026-104')!;
    expect(evaluateLeadSlaAndRotting(staleLead).isRotting).toBe(true);

    const repTopaz = resolveAutoAssignedSalesRep('TOP', 0);
    expect(repTopaz.email).toContain('.topaz@kas.sa');

    const econ = calculateReferralEconomics({
      customerLtvSar: 18000,
      grossMarginPct: 25,
      targetCacSar: 500,
      invitationsSent: 20,
      conversionsCount: 5,
      rewardsPaidSar: 1500,
      referredRevenueSar: 82500,
    });
    expect(econ.maxEconomicalRewardSar).toBe(4000);
    expect(econ.roiPct).toBeGreaterThan(100);

    // Self-referral blocked
    const selfRef = validateReferralAntiFraud({
      referrerPhone: '+966558025628',
      referredPhone: '0558025628',
      contractPaidInFull: true,
    });
    expect(selfRef.allowed).toBe(false);

    // PDPL Art. 25 Marketing Consent & Unsubscribe Tombstone
    await recordMarketingConsent({
      recipient: '+966551111111',
      channel: 'whatsapp',
      source: 'crm_lead_form',
    });
    await unsubscribeMarketingImmediately('+966552222222');

    const broadcast = preparePdplCompliantBroadcast({
      recipients: [
        { name: 'عميل موافق', phoneOrEmail: '+966551111111', marketingConsent: true },
        { name: 'عميل منسحب', phoneOrEmail: '+966552222222', marketingConsent: true },
        { name: 'بدون موافقة', phoneOrEmail: '+966553333333', marketingConsent: false },
      ],
      bodyTemplate: 'عرض خاص لك يا {{customer_name}}',
      channel: 'whatsapp',
    });

    expect(broadcast.approvedPayloads).toHaveLength(1);
    expect(broadcast.blockedByPdplCount).toBe(2);
    expect(broadcast.approvedPayloads[0].formattedMessage).toContain('لإلغاء الاشتراك الفوري');
  });
});
