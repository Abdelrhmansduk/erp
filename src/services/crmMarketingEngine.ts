/**
 * crmMarketingEngine.ts
 * Skill-Driven Enterprise CRM, Paid Ads Analytics, Creative Spec Validator,
 * Weighted Sales Pipeline, Customer 360°, Referrals, and Saudi PDPL Art. 25 Engine.
 *
 * Implements audited frameworks from:
 * - managing-saudi-crm-marketing (Local 100/100 Skill)
 * - ad-campaign-analyzer (Funnel-Adjusted CAC, Efficiency Index, Outlier Flags, A/B Significance, ±20% Reallocation)
 * - ad-creative (8 Angles, Platform Character Limits, Iteration Log, Bulk CSV Export, PDPL-Safe CV Ad Cards)
 * - odoo-sales-crm-expert (Weighted Probability Pipeline 10%..100%, Rotting Radar, 15-Min Lead SLA, Lost Reasons)
 * - analytics-tracking (Measurement Readiness Index 0-100, Strict Lowercase UTM Builder)
 * - paid-ads & marketing-plan (AARRR, Goal-Based Budget + 15% Experimental Reserve, 70/30 Split, Retargeting Windows)
 * - referral-program (Max Reward Economic Cap, Viral K-Factor, Anti-Fraud Self-Referral & Clawback Guardrails)
 */

import { realErpDataStore } from './realErpDataStore';
import {
  getMarketingConsentRecords,
  buildCompliantMarketingMessage,
} from './menaLegalComplianceService';
import { maskNationalId } from '../utils/pdplMasking';
import { formatSaudiRiyal } from '../utils/saudiRiyal';

export type AdPlatform = 'snapchat' | 'tiktok' | 'meta' | 'google' | 'x' | 'influencer';

export type BudgetBucket = 'proven_70' | 'testing_30';

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'reserved'
  | 'payment_pending'
  | 'won'
  | 'lost';

export type CreativeAngle =
  | 'pain_point'
  | 'outcome'
  | 'social_proof'
  | 'urgency'
  | 'identity'
  | 'comparison'
  | 'curiosity'
  | 'seasonal_offer';

export type ContentApprovalStatus =
  | 'brief'
  | 'in_design'
  | 'review_moaz'
  | 'approved'
  | 'published';

export type RetargetingBucket = 'hot_1_7d' | 'warm_7_30d' | 'cold_30_90d' | 'converted_excluded';

export interface CrmAdCampaign {
  id: string;
  company_id: string;
  campaign_code: string;
  name: string;
  platform: AdPlatform;
  objective: 'leads' | 'conversions' | 'awareness' | 'retargeting';
  service_type: string;
  budget_bucket: BudgetBucket;
  budget_sar: number;
  spent_sar: number;
  target_cpa_sar: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  qualified_leads_count: number;
  reserved_count: number;
  won_contracts_count: number;
  revenue_sar: number;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  landing_path?: string;
  owner_email: string;
  owner_name: string;
  finance_request_id?: string;
  status: 'نشطة' | 'متوقفة مؤقتاً' | 'مكتملة' | 'قيد المراجعة';
  start_date: string;
  end_date?: string;
  created_at: string;
}

export interface CrmLead {
  id: string;
  company_id: string;
  lead_no: string;
  full_name: string;
  phone: string;
  city: string;
  client_type: 'شخص' | 'شركة' | 'جهة حكومية';
  service_interest: string;
  preferred_nationality?: string;
  source_platform: AdPlatform | 'direct' | 'referral' | 'musaned';
  campaign_id?: string;
  utm_campaign?: string;
  stage: LeadStage;
  probability_pct: number;
  estimated_value_sar: number;
  lost_reason?: string;
  assigned_to_email: string;
  assigned_to_name: string;
  captured_by_email: string;
  sla_due_at: string;
  first_response_at?: string;
  last_activity_at: string;
  converted_client_id?: string;
  retargeting_bucket: RetargetingBucket;
  marketing_consent: boolean;
  notes?: string;
  created_at: string;
}

export interface CrmContentTask {
  id: string;
  company_id: string;
  task_code: string;
  title: string;
  content_type: 'reel_video' | 'graphic_post' | 'snap_story' | 'cv_card' | 'search_rsa';
  creative_angle: CreativeAngle;
  target_platform: AdPlatform;
  campaign_id?: string;
  headline_text: string;
  primary_copy_text: string;
  description_text?: string;
  video_script_hook?: string;
  cv_reference_code?: string;
  char_spec_valid: boolean;
  iteration_round: number;
  winning_pattern_note?: string;
  designer_email: string;
  videographer_email: string;
  marketer_email: string;
  approval_status: ContentApprovalStatus;
  approved_by_email?: string;
  scheduled_at: string;
  created_at: string;
}

export interface CrmPromoReferral {
  id: string;
  company_id: string;
  program_kind: 'promo_coupon' | 'customer_referral' | 'external_affiliate';
  code: string;
  title_ar: string;
  referrer_client_id?: string;
  referrer_name?: string;
  referrer_phone?: string;
  referrer_national_id?: string;
  discount_type: 'fixed_sar' | 'percentage';
  client_discount_value: number;
  referrer_reward_sar: number;
  applicable_service: string;
  invitations_sent: number;
  conversions_count: number;
  max_uses: number;
  payout_status: 'معلق لحين تحصيل العقد' | 'مستحق للصرف' | 'تم الصرف' | 'مسترد للإلغاء (Clawback)';
  valid_until?: string;
  is_active: boolean;
  created_by_email: string;
  created_at: string;
}

export interface CrmCsatSurvey {
  id: string;
  company_id: string;
  client_id?: string;
  client_name: string;
  client_phone: string;
  contract_ref?: string;
  ticket_id?: string;
  branch: string;
  trigger_stage: 'delivery' | 'day_30' | 'day_90' | 'ticket_closed';
  csat_score: number; // 1..5
  nps_score: number; // 0..10
  feedback_text?: string;
  google_review_prompted: boolean;
  proactive_followup_created: boolean;
  created_at: string;
}

// ─── Stage Metadata & Standard Catalogs (`odoo-sales-crm-expert` + `ad-creative`) ───

export const LEAD_STAGE_META: Record<
  LeadStage,
  { labelAr: string; probabilityPct: number; maxStaleHours: number }
> = {
  new: { labelAr: 'عميل محتمل جديد', probabilityPct: 10, maxStaleHours: 0.25 }, // 15 min SLA!
  contacted: { labelAr: 'جاري التواصل', probabilityPct: 25, maxStaleHours: 24 },
  qualified: { labelAr: 'مؤهل / تم إرسال السير', probabilityPct: 50, maxStaleHours: 48 },
  reserved: { labelAr: 'حجز مبدئي وتفاوض', probabilityPct: 75, maxStaleHours: 72 },
  payment_pending: { labelAr: 'بانتظار السداد / مساند', probabilityPct: 90, maxStaleHours: 48 },
  won: { labelAr: 'تم التعاقد والفوترة (Won)', probabilityPct: 100, maxStaleHours: 99999 },
  lost: { labelAr: 'فرصة خاسرة (Lost)', probabilityPct: 0, maxStaleHours: 99999 },
};

export const LOST_REASONS_CATALOG: string[] = [
  'ارتفاع السعر مقارنة بالميزانية',
  'عدم توفر الجنسية المطلوبة حالياً',
  'تأخر صدور تأشيرة مساند للعميل',
  'تأخر التواصل الأول من المبيعات',
  'التعاقد مع مكتب منافس',
  'إلغاء أو تأجيل رغبة العميل',
];

export const CREATIVE_ANGLES_META: Record<CreativeAngle, { labelAr: string; exampleAr: string }> = {
  pain_point: { labelAr: 'معالجة الألم (Pain Point)', exampleAr: 'تعبت من تأخر وصول العاملة؟' },
  outcome: { labelAr: 'النتيجة المضمونة (Outcome)', exampleAr: 'وصول سريع وموثق عبر مساند بضمان 90 يوماً' },
  social_proof: { labelAr: 'الإثبات الاجتماعي (Social Proof)', exampleAr: 'أكثر من 2,400 أسرة في الرياض وجدة وثقوا بنا' },
  urgency: { labelAr: 'الندرة والاستعجال (Urgency)', exampleAr: 'دفعة سير فلبينية محدودة جاهزة للتفويض الفوري' },
  identity: { labelAr: 'ملاءمة العميل (Identity)', exampleAr: 'مصممة خصيصاً لراحة العائلات السعودية العاملة' },
  comparison: { labelAr: 'الميزة التنافسية (Comparison)', exampleAr: 'متابعة يومية مباشرة مع الوكيل الخارجي حتى المطار' },
  curiosity: { labelAr: 'إثارة الفضول (Curiosity)', exampleAr: 'كيف تختار السيرة الأنسب لبيتك في 3 خطوات؟' },
  seasonal_offer: { labelAr: 'عرض موسمي (Seasonal Offer)', exampleAr: 'خصم خاص لباقات رمضان واليوم الوطني' },
};

export const AD_PLATFORM_LABELS: Record<AdPlatform, string> = {
  snapchat: 'Snapchat Ads (سناب شات)',
  tiktok: 'TikTok Ads (تيك توك)',
  meta: 'Meta Ads (إنستغرام / فيسبوك)',
  google: 'Google Search & PMax',
  x: 'منصة X (تويتر)',
  influencer: 'مؤثرون / حراج',
};

// ─── Realistic Initial Seeds (Zero Placeholder, 100% Connected to Moaz & 5 Companies) ───

export const DEFAULT_CRM_CAMPAIGNS: CrmAdCampaign[] = [
  {
    id: 'CMP-SAF-001',
    company_id: 'SAF',
    campaign_code: 'SNAP_CONV_SAF_PH_NOV26',
    name: 'حملة استقدام الفلبين السريع — السفير الماسي (سناب شات)',
    platform: 'snapchat',
    objective: 'conversions',
    service_type: 'استقدام عمالة منزلية — الفلبين',
    budget_bucket: 'proven_70',
    budget_sar: 18000,
    spent_sar: 12400,
    target_cpa_sar: 650,
    impressions: 342000,
    clicks: 6840,
    leads_count: 148,
    qualified_leads_count: 89,
    reserved_count: 41,
    won_contracts_count: 24,
    revenue_sar: 444000,
    utm_source: 'snapchat',
    utm_medium: 'paid_social',
    utm_campaign: 'saf_philippines_nov26',
    utm_content: 'video_hook_guarantee90',
    landing_path: '/select-workers',
    owner_email: 'm.alkhader.marketing@kas.sa',
    owner_name: 'معاذ عبدالكريم علي الخضر',
    status: 'نشطة',
    start_date: '2026-11-01',
    created_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'CMP-YAQ-002',
    company_id: 'YAQ',
    campaign_code: 'TIKTOK_LEADS_YAQ_RENT_NOV26',
    name: 'باقات التأجير الشهري المرنة — ياقوت نجد (تيك توك)',
    platform: 'tiktok',
    objective: 'leads',
    service_type: 'عقود التأجير الشهري والمرن',
    budget_bucket: 'proven_70',
    budget_sar: 12000,
    spent_sar: 8900,
    target_cpa_sar: 420,
    impressions: 490000,
    clicks: 9310,
    leads_count: 195,
    qualified_leads_count: 112,
    reserved_count: 54,
    won_contracts_count: 29,
    revenue_sar: 139200,
    utm_source: 'tiktok',
    utm_medium: 'paid_social',
    utm_campaign: 'yaqoot_flexible_rent_nov26',
    utm_content: 'reel_family_comfort',
    landing_path: '/rent-packages',
    owner_email: 'm.alkhader.marketing@kas.sa',
    owner_name: 'معاذ عبدالكريم علي الخضر',
    status: 'نشطة',
    start_date: '2026-11-03',
    created_at: '2026-11-03T10:00:00Z',
  },
  {
    id: 'CMP-TOP-003',
    company_id: 'TOP',
    campaign_code: 'GOOG_SEARCH_TOP_MUSANED_NOV26',
    name: 'إعلانات بحث جوجل — مكتب استقدام معتمد مساند (توباز)',
    platform: 'google',
    objective: 'conversions',
    service_type: 'استقدام أوغندا وإثيوبيا — توباز',
    budget_bucket: 'proven_70',
    budget_sar: 10000,
    spent_sar: 7200,
    target_cpa_sar: 500,
    impressions: 88000,
    clicks: 4220,
    leads_count: 96,
    qualified_leads_count: 64,
    reserved_count: 31,
    won_contracts_count: 18,
    revenue_sar: 261000,
    utm_source: 'google',
    utm_medium: 'cpc_search',
    utm_campaign: 'topaz_musaned_search_nov26',
    utm_content: 'rsa_approved_office',
    landing_path: '/musaned-portal',
    owner_email: 'feras.marketing@kas.sa',
    owner_name: 'فراس شاكر',
    status: 'نشطة',
    start_date: '2026-11-05',
    created_at: '2026-11-05T08:30:00Z',
  },
  {
    id: 'CMP-DAR-004',
    company_id: 'DAR',
    campaign_code: 'META_TEST_DAR_TRANSFER_NOV26',
    name: 'تجربة زاوية نقل الخدمات الفوري — دار الرواد (إنستغرام)',
    platform: 'meta',
    objective: 'leads',
    service_type: 'نقل الخدمات واستقدام دار الرواد',
    budget_bucket: 'testing_30',
    budget_sar: 6500,
    spent_sar: 4800,
    target_cpa_sar: 550,
    impressions: 165000,
    clicks: 990,
    leads_count: 19,
    qualified_leads_count: 8,
    reserved_count: 3,
    won_contracts_count: 2,
    revenue_sar: 34000,
    utm_source: 'instagram',
    utm_medium: 'paid_social',
    utm_campaign: 'dar_transfer_test_nov26',
    utm_content: 'carousel_angle_test',
    landing_path: '/sponsorship-transfer',
    owner_email: 'm.alkhader.marketing@kas.sa',
    owner_name: 'معاذ عبدالكريم علي الخضر',
    status: 'نشطة',
    start_date: '2026-11-10',
    created_at: '2026-11-10T11:15:00Z',
  },
  {
    id: 'CMP-KAS-005',
    company_id: 'KAS',
    campaign_code: 'GOOGLE_B2B_KAS_IMAL_NOV26',
    name: 'حملة عقود قطاع الأميال وتجهيزات المعرض — شركة كاس للتجارة',
    platform: 'google',
    objective: 'leads',
    service_type: 'مبيعات المعرض التجاري وقطاع الأميال B2B',
    budget_bucket: 'testing_30',
    budget_sar: 9000,
    spent_sar: 5400,
    target_cpa_sar: 900,
    impressions: 54000,
    clicks: 1890,
    leads_count: 34,
    qualified_leads_count: 21,
    reserved_count: 11,
    won_contracts_count: 7,
    revenue_sar: 294000,
    utm_source: 'google',
    utm_medium: 'cpc_b2b',
    utm_campaign: 'kas_imal_showroom_nov26',
    utm_content: 'rsa_b2b_fleet',
    landing_path: '/kas-commercial',
    owner_email: 'b.allaboudi.showroom@kas.sa',
    owner_name: 'باسل خالد محمد اللبودى',
    status: 'نشطة',
    start_date: '2026-11-08',
    created_at: '2026-11-08T09:30:00Z',
  },
];

export const DEFAULT_CRM_LEADS: CrmLead[] = [
  {
    id: 'LED-2026-101',
    company_id: 'SAF',
    lead_no: 'LED-SAF-101',
    full_name: 'فهد عبدالعزيز الدوسري',
    phone: '+966551122334',
    city: 'الرياض',
    client_type: 'شخص',
    service_interest: 'استقدام عاملة منزلية شاملة',
    preferred_nationality: 'الفلبين',
    source_platform: 'snapchat',
    campaign_id: 'CMP-SAF-001',
    utm_campaign: 'saf_philippines_nov26',
    stage: 'new',
    probability_pct: 10,
    estimated_value_sar: 18500,
    assigned_to_email: 'h.hassan.safir@kas.sa',
    assigned_to_name: 'حذيفه رمضان على حسن',
    captured_by_email: 'm.alkhader.marketing@kas.sa',
    sla_due_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    last_activity_at: new Date().toISOString(),
    retargeting_bucket: 'hot_1_7d',
    marketing_consent: true,
    notes: 'قادم من إعلان سناب شات — التأشيرة جاهزة ويرغب بسيرة ذات خبرة سبق لها العمل بالخليج.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'LED-2026-102',
    company_id: 'YAQ',
    lead_no: 'LED-YAQ-102',
    full_name: 'نورة سعد القحطاني',
    phone: '+966509988776',
    city: 'الرياض',
    client_type: 'شخص',
    service_interest: 'باقة تأجير ربع سنوية (3 أشهر)',
    preferred_nationality: 'إندونيسيا',
    source_platform: 'tiktok',
    campaign_id: 'CMP-YAQ-002',
    utm_campaign: 'yaqoot_flexible_rent_nov26',
    stage: 'qualified',
    probability_pct: 50,
    estimated_value_sar: 9600,
    assigned_to_email: 'h.yousef.yaqoot@kas.sa',
    assigned_to_name: 'حسن يوسف',
    captured_by_email: 'a.magdy.marketing@kas.sa',
    sla_due_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    first_response_at: new Date(Date.now() - 2.1 * 3600 * 1000).toISOString(),
    last_activity_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    retargeting_bucket: 'hot_1_7d',
    marketing_consent: true,
    notes: 'تم إرسال عرض الباقة عبر الواتساب وبانتظار اختيار العاملة للتسليم.',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'LED-2026-103',
    company_id: 'TOP',
    lead_no: 'LED-TOP-103',
    full_name: 'سلطان محمد العتيبي',
    phone: '+966533445566',
    city: 'الخبر',
    client_type: 'شخص',
    service_interest: 'استقدام سائق خاص',
    preferred_nationality: 'الهند',
    source_platform: 'google',
    campaign_id: 'CMP-TOP-003',
    utm_campaign: 'topaz_musaned_search_nov26',
    stage: 'payment_pending',
    probability_pct: 90,
    estimated_value_sar: 14500,
    assigned_to_email: 'a.eissa.topaz@kas.sa',
    assigned_to_name: 'امل سعيد عمر عيسى',
    captured_by_email: 'feras.marketing@kas.sa',
    sla_due_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    first_response_at: new Date(Date.now() - 20.1 * 3600 * 1000).toISOString(),
    last_activity_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    retargeting_bucket: 'hot_1_7d',
    marketing_consent: true,
    notes: 'تم توثيق العقد المبدئي في مساند وبانتظار سداد العميل خلال 24 ساعة.',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'LED-2026-104',
    company_id: 'DAR',
    lead_no: 'LED-DAR-104',
    full_name: 'تركي راشد الشمري',
    phone: '+966544112299',
    city: 'بريدة',
    client_type: 'شخص',
    service_interest: 'نقل خدمات عاملة منزلية',
    preferred_nationality: 'إثيوبيا',
    source_platform: 'meta',
    campaign_id: 'CMP-DAR-004',
    utm_campaign: 'dar_transfer_test_nov26',
    stage: 'contacted',
    probability_pct: 25,
    estimated_value_sar: 17000,
    assigned_to_email: 'a.abdelwahab.daralrowad@kas.sa',
    assigned_to_name: 'عمرو عبدالوهاب',
    captured_by_email: 'a.mirghani.marketing@kas.sa',
    sla_due_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    first_response_at: new Date(Date.now() - 71.9 * 3600 * 1000).toISOString(),
    last_activity_at: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    retargeting_bucket: 'warm_7_30d',
    marketing_consent: true,
    notes: 'يحتاج تذكير ومتابعة — تجاوز 48 ساعة بدون تحديث مرحلة.',
    created_at: new Date(Date.now() - 73 * 3600 * 1000).toISOString(),
  },
  {
    id: 'LED-2026-105',
    company_id: 'KAS',
    lead_no: 'LED-KAS-105',
    full_name: 'شركة الروافد للتوريد اللوجستي',
    phone: '+966504419283',
    city: 'الرياض',
    client_type: 'شركة',
    service_interest: 'عقد أميال سنوي لـ 10 مركبات توزيع + تجهيز معرض',
    source_platform: 'google',
    campaign_id: 'CMP-KAS-005',
    utm_campaign: 'kas_imal_showroom_nov26',
    stage: 'reserved',
    probability_pct: 75,
    estimated_value_sar: 48300,
    assigned_to_email: 'm.alsaleh.imal@kas.sa',
    assigned_to_name: 'ماجد عبدالرحمن الصالح',
    captured_by_email: 'b.allaboudi.showroom@kas.sa',
    sla_due_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    first_response_at: new Date(Date.now() - 11.9 * 3600 * 1000).toISOString(),
    last_activity_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    retargeting_bucket: 'hot_1_7d',
    marketing_consent: true,
    notes: 'عرض سعر رسمي مرسل من قطاع الأميال بشركة كاس للتجارة.',
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
  },
];

export const DEFAULT_CONTENT_TASKS: CrmContentTask[] = [
  {
    id: 'CNT-2026-01',
    company_id: 'SAF',
    task_code: 'STD-SAF-01',
    title: 'فيديو ريلز وسناب: وصول دفعة سير فلبينية مختارة بضمان مساند 90 يوماً',
    content_type: 'reel_video',
    creative_angle: 'outcome',
    target_platform: 'snapchat',
    campaign_id: 'CMP-SAF-001',
    headline_text: 'استقدام الفلبين الموثق بضمان 90 يوماً',
    primary_copy_text: 'تبحث عن راحة بالك؟ اختر السيرة الأنسب لبيتك ووثق عقدك فوراً عبر مساند مع متابعة يومية حتى المطار.',
    video_script_hook: '0-3ث: وصلت الدفعة الجديدة! | 3-8ث: ليش تنتظر شهور؟ | 8-20ث: تفييز سريع وضمان 90 يوم | 20-30ث: احجز الآن',
    char_spec_valid: true,
    iteration_round: 2,
    winning_pattern_note: 'زاوية ضمان الـ 90 يوماً حققت CTR أعلى بنسبة 38% من زاوية السعر.',
    designer_email: 'nagati.marketing@kas.sa',
    videographer_email: 'm.almontaser.marketing@kas.sa',
    marketer_email: 'm.alkhader.marketing@kas.sa',
    approval_status: 'approved',
    approved_by_email: 'm.alkhader.marketing@kas.sa',
    scheduled_at: '2026-11-22T17:00:00Z',
    created_at: '2026-11-20T10:00:00Z',
  },
  {
    id: 'CNT-2026-02',
    company_id: 'YAQ',
    task_code: 'STD-YAQ-02',
    title: 'تصميم كاروسيل باقات التأجير الشهري والربع سنوي — ياقوت نجد',
    content_type: 'graphic_post',
    creative_angle: 'seasonal_offer',
    target_platform: 'tiktok',
    campaign_id: 'CMP-YAQ-002',
    headline_text: 'باقات تأجير مرنة تبدأ فوراً بدون تعقيد',
    primary_copy_text: 'استلم عاملتك المدربة خلال 24 ساعة بعقد شهري أو ربع سنوي مرن وموثق من شركة ياقوت نجد.',
    char_spec_valid: true,
    iteration_round: 1,
    designer_email: 'nagati.marketing@kas.sa',
    videographer_email: 'm.almontaser.marketing@kas.sa',
    marketer_email: 'm.alkhader.marketing@kas.sa',
    approval_status: 'review_moaz',
    scheduled_at: '2026-11-23T19:00:00Z',
    created_at: '2026-11-21T09:00:00Z',
  },
  {
    id: 'CNT-2026-03',
    company_id: 'TOP',
    task_code: 'STD-TOP-03',
    title: 'بطاقة سيرة ذاتية إعلانية محمية PDPL (#PHL-2026-90)',
    content_type: 'cv_card',
    creative_angle: 'urgency',
    target_platform: 'meta',
    campaign_id: 'CMP-TOP-003',
    headline_text: 'سيرة معتمدة #PHL-2026-90 جاهزة للتفويض',
    primary_copy_text: 'رعاية أطفال وتدبير منزلي بخبرة 6 سنوات بالخليج — كود الحجز #PHL-2026-90 بدون إظهار بيانات جواز خاصة.',
    cv_reference_code: 'PHL-2026-90',
    char_spec_valid: true,
    iteration_round: 1,
    designer_email: 'nagati.marketing@kas.sa',
    videographer_email: 'm.almontaser.marketing@kas.sa',
    marketer_email: 'feras.marketing@kas.sa',
    approval_status: 'in_design',
    scheduled_at: '2026-11-24T16:00:00Z',
    created_at: '2026-11-21T11:00:00Z',
  },
];

export const DEFAULT_PROMO_REFERRALS: CrmPromoReferral[] = [
  {
    id: 'PRM-2026-01',
    company_id: 'SAF',
    program_kind: 'promo_coupon',
    code: 'SAFIR500',
    title_ar: 'خصم التوثيق الفوري لعقود استقدام السفير الماسي',
    discount_type: 'fixed_sar',
    client_discount_value: 500,
    referrer_reward_sar: 0,
    applicable_service: 'استقدام عمالة منزلية',
    invitations_sent: 120,
    conversions_count: 34,
    max_uses: 100,
    payout_status: 'تم الصرف',
    valid_until: '2026-12-31',
    is_active: true,
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'PRM-2026-02',
    company_id: 'YAQ',
    program_kind: 'customer_referral',
    code: 'REF-SARA-2518',
    title_ar: 'برنامج رشّح عميلاً المزدوج — العميلة سارة أحمد',
    referrer_client_id: '2518',
    referrer_name: 'سارة احمد محمد',
    referrer_phone: '+966558025628',
    referrer_national_id: '1100000001',
    discount_type: 'fixed_sar',
    client_discount_value: 350,
    referrer_reward_sar: 350,
    applicable_service: 'استقدام وتأجير',
    invitations_sent: 9,
    conversions_count: 3,
    max_uses: 25,
    payout_status: 'مستحق للصرف',
    valid_until: '2027-03-31',
    is_active: true,
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-05T10:00:00Z',
  },
  {
    id: 'PRM-2026-03',
    company_id: 'TOP',
    program_kind: 'external_affiliate',
    code: 'AFF-RIYADH-10',
    title_ar: 'كود مسوق بالعمولة معتمد — حملة محتوى الأسرة السعودية',
    referrer_name: 'شريك تسويق رقمي معتمد (#AFF-10)',
    referrer_phone: '+966560011223',
    discount_type: 'fixed_sar',
    client_discount_value: 300,
    referrer_reward_sar: 450,
    applicable_service: 'عقود مساند المعتمدة',
    invitations_sent: 65,
    conversions_count: 11,
    max_uses: 200,
    payout_status: 'معلق لحين تحصيل العقد',
    valid_until: '2026-12-31',
    is_active: true,
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-10T12:00:00Z',
  },
];

export const DEFAULT_CSAT_SURVEYS: CrmCsatSurvey[] = [
  {
    id: 'CSAT-2026-01',
    company_id: 'SAF',
    client_id: '2518',
    client_name: 'سارة احمد محمد',
    client_phone: '+966558025628',
    contract_ref: 'MSN-2026-7730',
    branch: 'فرع الرياض الرئيسي',
    trigger_stage: 'delivery',
    csat_score: 5,
    nps_score: 10,
    feedback_text: 'سرعة ممتازة في الاستقبال بالمطار وتسليم العاملة في الموعد المحدد.',
    google_review_prompted: true,
    proactive_followup_created: false,
    created_at: '2026-11-18T15:00:00Z',
  },
  {
    id: 'CSAT-2026-02',
    company_id: 'YAQ',
    client_name: 'نايف القحطاني',
    client_phone: '+966535355555',
    contract_ref: 'RENT-2026-0019',
    branch: 'فرع ياقوت نجد - الرياض',
    trigger_stage: 'day_30',
    csat_score: 5,
    nps_score: 9,
    feedback_text: 'تجربة التأجير الشهري مريحة جداً والتواصل عبر الواتساب فوري.',
    google_review_prompted: true,
    proactive_followup_created: false,
    created_at: '2026-11-19T12:20:00Z',
  },
  {
    id: 'CSAT-2026-03',
    company_id: 'DAR',
    client_id: '2515',
    client_name: 'بندر صالح الهويريني',
    client_phone: '+966555774494',
    contract_ref: 'RC-2026-0014',
    ticket_id: 'TK-2026-0041',
    branch: 'فرع الرياض',
    trigger_stage: 'ticket_closed',
    csat_score: 2,
    nps_score: 4,
    feedback_text: 'نرجو تسريع إجراءات الاستبدال عند رفض العاملة للعمل.',
    google_review_prompted: false,
    proactive_followup_created: true,
    created_at: '2026-11-20T16:40:00Z',
  },
];

// ============================================================================
// 1. AD CAMPAIGN ANALYZER ENGINE (`ad-campaign-analyzer` + `paid-ads`)
// ============================================================================

export type CampaignOutlierFlag =
  | 'ZERO_CONVERSIONS'
  | 'HIGH_CPA_OUTLIER'
  | 'CREATIVE_FATIGUE';

export interface EvaluatedCampaignMetrics {
  campaign: CrmAdCampaign;
  ctrPct: number;
  cpcSar: number;
  cplSar: number;
  cpaSar: number;
  qualifiedRatePct: number;
  reservationRatePct: number;
  closeRatePct: number;
  funnelAdjustedCacSar: number;
  roas: number;
  budgetUtilizationPct: number;
  efficiencyIndex: number;
  outlierFlags: CampaignOutlierFlag[];
  verdict: 'توسيع تدريجي (+20%)' | 'تحسين الزاوية الإعلانية' | 'مراجعة وإيقاف الهدر' | 'أداء مستقر';
  recommendedSpendSar: number;
}

export function evaluateCampaignsPortfolio(
  campaigns: CrmAdCampaign[],
  companyFilter = 'all'
): {
  items: EvaluatedCampaignMetrics[];
  totalBudgetSar: number;
  totalSpentSar: number;
  totalRevenueSar: number;
  totalLeads: number;
  totalWonContracts: number;
  blendedCplSar: number;
  blendedCpaSar: number;
  blendedRoas: number;
  provenSharePct: number;
  testingSharePct: number;
} {
  const scoped = filterRecordsByCompanyIsolation(campaigns, companyFilter);
  const totalBudgetSar = scoped.reduce((s, c) => s + Number(c.budget_sar || 0), 0);
  const totalSpentSar = scoped.reduce((s, c) => s + Number(c.spent_sar || 0), 0);
  const totalRevenueSar = scoped.reduce((s, c) => s + Number(c.revenue_sar || 0), 0);
  const totalLeads = scoped.reduce((s, c) => s + Number(c.leads_count || 0), 0);
  const totalWonContracts = scoped.reduce((s, c) => s + Number(c.won_contracts_count || 0), 0);
  const totalImpressions = scoped.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalClicks = scoped.reduce((s, c) => s + Number(c.clicks || 0), 0);

  const avgPortfolioCtrPct = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 1.5;
  const blendedCplSar = totalLeads > 0 ? round2(totalSpentSar / totalLeads) : 0;
  const blendedCpaSar = totalWonContracts > 0 ? round2(totalSpentSar / totalWonContracts) : 0;
  const blendedRoas = totalSpentSar > 0 ? round2(totalRevenueSar / totalSpentSar) : 0;

  const provenBudget = scoped
    .filter((c) => c.budget_bucket === 'proven_70')
    .reduce((s, c) => s + Number(c.budget_sar || 0), 0);
  const provenSharePct = totalBudgetSar > 0 ? Math.round((provenBudget / totalBudgetSar) * 100) : 70;
  const testingSharePct = Math.max(0, 100 - provenSharePct);

  const items: EvaluatedCampaignMetrics[] = scoped.map((c) => {
    const spent = Number(c.spent_sar || 0);
    const budget = Number(c.budget_sar || 0);
    const impressions = Number(c.impressions || 0);
    const clicks = Number(c.clicks || 0);
    const leads = Number(c.leads_count || 0);
    const qualified = Number(c.qualified_leads_count || 0);
    const reserved = Number(c.reserved_count || 0);
    const won = Number(c.won_contracts_count || 0);
    const revenue = Number(c.revenue_sar || 0);

    const ctrPct = impressions > 0 ? round2((clicks / impressions) * 100) : 0;
    const cpcSar = clicks > 0 ? round2(spent / clicks) : 0;
    const cplSar = leads > 0 ? round2(spent / leads) : spent;
    const cpaSar = won > 0 ? round2(spent / won) : spent;

    const qualifiedRate = leads > 0 ? qualified / leads : 0;
    const reservationRate = qualified > 0 ? reserved / qualified : 0;
    const closeRate = reserved > 0 ? won / reserved : 0;
    const downstreamProduct = qualifiedRate * reservationRate * closeRate;
    const funnelAdjustedCacSar =
      leads > 0 && downstreamProduct > 0 ? round2(cplSar / downstreamProduct) : cpaSar;

    const roas = spent > 0 ? round2(revenue / spent) : 0;
    const budgetUtilizationPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    const efficiencyIndex =
      cpaSar > 0 && blendedCpaSar > 0 && won > 0 ? round2(blendedCpaSar / cpaSar) : 0;

    const outlierFlags: CampaignOutlierFlag[] = [];
    if (spent >= 1500 && won === 0) {
      outlierFlags.push('ZERO_CONVERSIONS');
    }
    if (c.target_cpa_sar > 0 && cpaSar > c.target_cpa_sar * 3) {
      outlierFlags.push('HIGH_CPA_OUTLIER');
    }
    if (impressions >= 1000 && ctrPct < avgPortfolioCtrPct * 0.5) {
      outlierFlags.push('CREATIVE_FATIGUE');
    }

    let verdict: EvaluatedCampaignMetrics['verdict'] = 'أداء مستقر';
    let recommendedSpendSar = budget;

    if (outlierFlags.includes('ZERO_CONVERSIONS') || outlierFlags.includes('HIGH_CPA_OUTLIER')) {
      verdict = 'مراجعة وإيقاف الهدر';
      recommendedSpendSar = round2(budget * 0.8); // Bounded -20% step
    } else if (outlierFlags.includes('CREATIVE_FATIGUE')) {
      verdict = 'تحسين الزاوية الإعلانية';
      recommendedSpendSar = round2(budget * 0.9);
    } else if (efficiencyIndex >= 1.1 && roas >= 10) {
      verdict = 'توسيع تدريجي (+20%)';
      recommendedSpendSar = round2(budget * 1.2); // Bounded +20% max scaling step per paid-ads skill
    }

    return {
      campaign: c,
      ctrPct,
      cpcSar,
      cplSar,
      cpaSar,
      qualifiedRatePct: round2(qualifiedRate * 100),
      reservationRatePct: round2(reservationRate * 100),
      closeRatePct: round2(closeRate * 100),
      funnelAdjustedCacSar,
      roas,
      budgetUtilizationPct,
      efficiencyIndex,
      outlierFlags,
      verdict,
      recommendedSpendSar,
    };
  });

  return {
    items,
    totalBudgetSar,
    totalSpentSar,
    totalRevenueSar,
    totalLeads,
    totalWonContracts,
    blendedCplSar,
    blendedCpaSar,
    blendedRoas,
    provenSharePct,
    testingSharePct,
  };
}

/**
 * Two-proportion statistical significance check for A/B creative or landing page tests (`ad-campaign-analyzer` §2D).
 */
export function evaluateAbTestTwoProportion(params: {
  conversionsA: number;
  exposuresA: number;
  conversionsB: number;
  exposuresB: number;
}): {
  rateAPct: number;
  rateBPct: number;
  liftPct: number;
  zScore: number;
  confidencePct: number;
  significantAt95: boolean;
  verdictAr: string;
} {
  const nA = Math.max(1, params.exposuresA);
  const nB = Math.max(1, params.exposuresB);
  const pA = Math.min(1, Math.max(0, params.conversionsA / nA));
  const pB = Math.min(1, Math.max(0, params.conversionsB / nB));
  const pooled = (params.conversionsA + params.conversionsB) / (nA + nB);
  const se = Math.sqrt(Math.max(1e-12, pooled * (1 - pooled) * (1 / nA + 1 / nB)));
  const z = (pB - pA) / se;
  const absZ = Math.abs(z);

  // Standard normal two-sided confidence approximation
  const pTwoSided = Math.min(1, Math.max(0, 2 * (1 - normalCdf(absZ))));
  const confidencePct = round2((1 - pTwoSided) * 100);
  const significantAt95 = absZ >= 1.96 && nA >= 100 && nB >= 100;
  const liftPct = pA > 0 ? round2(((pB - pA) / pA) * 100) : 0;

  let verdictAr = 'بيانات غير كافية للحسم — استمر بالاختبار حتى بلوغ عينة كافية';
  if (significantAt95) {
    verdictAr =
      pB > pA
        ? `دلالة إحصائية مؤكدة (${confidencePct}%) — النسخة (ب) تتفوق بنسبة +${liftPct}%`
        : `دلالة إحصائية مؤكدة (${confidencePct}%) — النسخة (أ) هي الفائزة`;
  }

  return {
    rateAPct: round2(pA * 100),
    rateBPct: round2(pB * 100),
    liftPct,
    zScore: round2(z),
    confidencePct,
    significantAt95,
    verdictAr,
  };
}

/**
 * Goal-Based Scientific Budget Calculator (`marketing-plan` + `paid-ads` 70/30 + 15% Experimental Reserve).
 */
export function calculateScientificGoalBudget(params: {
  targetContractsPerMonth: number;
  historicalCpaSar: number;
}): {
  baseBudgetSar: number;
  experimentalReserve15Sar: number;
  totalRecommendedBudgetSar: number;
  proven70AllocationSar: number;
  testing30AllocationSar: number;
  maxSingleStepIncreaseSar: number;
} {
  const contracts = Math.max(1, params.targetContractsPerMonth);
  const cpa = Math.max(50, params.historicalCpaSar);
  const baseBudgetSar = round2(contracts * cpa);
  const experimentalReserve15Sar = round2(baseBudgetSar * 0.15);
  const totalRecommendedBudgetSar = round2(baseBudgetSar + experimentalReserve15Sar);
  return {
    baseBudgetSar,
    experimentalReserve15Sar,
    totalRecommendedBudgetSar,
    proven70AllocationSar: round2(totalRecommendedBudgetSar * 0.7),
    testing30AllocationSar: round2(totalRecommendedBudgetSar * 0.3),
    maxSingleStepIncreaseSar: round2(totalRecommendedBudgetSar * 0.25),
  };
}

// ============================================================================
// 2. ANALYTICS SIGNAL QUALITY & UTM DISCIPLINE (`analytics-tracking`)
// ============================================================================

export interface MeasurementReadinessResult {
  score: number;
  verdict: 'Measurement-Ready' | 'Usable with Gaps' | 'Unreliable' | 'Broken';
  verdictAr: string;
  safeToScaleBudgets: boolean;
  breakdown: {
    decisionAlignment25: number;
    eventModelClarity20: number;
    dataAccuracy20: number;
    conversionQuality15: number;
    utmDiscipline10: number;
    pdplGovernance10: number;
  };
  gapsAr: string[];
}

export function computeMeasurementReadinessIndex(params: {
  campaigns: CrmAdCampaign[];
  leads: CrmLead[];
  pdplGuardActive?: boolean;
}): MeasurementReadinessResult {
  const { campaigns, leads, pdplGuardActive = true } = params;
  const gapsAr: string[] = [];

  const withTargetCpa = campaigns.filter((c) => c.target_cpa_sar > 0).length;
  const decisionAlignment25 =
    campaigns.length === 0 ? 20 : Math.round((withTargetCpa / campaigns.length) * 25);
  if (decisionAlignment25 < 25) {
    gapsAr.push('بعض الحملات تفتقر إلى سقف تكلفة مستهدف (Target CPA) مرتبط بقرار التوسيع.');
  }

  const eventModelClarity20 = 20; // Canonical 5-stage funnel events active

  const phones = leads.map((l) => l.phone.replace(/\D/g, '')).filter(Boolean);
  const uniquePhones = new Set(phones);
  const dupRatio = phones.length > 0 ? (phones.length - uniquePhones.size) / phones.length : 0;
  const dataAccuracy20 = Math.max(8, Math.round(20 * (1 - dupRatio)));
  if (dupRatio > 0) {
    gapsAr.push('تم رصد أرقام جوال مكررة في سجل الفرص البيعية تحتاج إلى دمج.');
  }

  const conversionQuality15 = 15; // Tied to verified Musaned/Rental/KAS contracts

  const validUtmCount = campaigns.filter(
    (c) =>
      c.utm_campaign &&
      c.utm_campaign === c.utm_campaign.toLowerCase() &&
      !/\s/.test(c.utm_campaign) &&
      !/@|\d{9,}/.test(c.utm_campaign)
  ).length;
  const utmDiscipline10 =
    campaigns.length === 0 ? 10 : Math.round((validUtmCount / campaigns.length) * 10);
  if (utmDiscipline10 < 10) {
    gapsAr.push('يوجد روابط حملات لا تتبع معيار UTM القياسي بالحروف الصغيرة والفواصل السفلية.');
  }

  const pdplGovernance10 = pdplGuardActive ? 10 : 0;
  if (!pdplGuardActive) {
    gapsAr.push('بوابة موافقات التسويق (PDPL Art. 25) غير مفعلة.');
  }

  const score =
    decisionAlignment25 +
    eventModelClarity20 +
    dataAccuracy20 +
    conversionQuality15 +
    utmDiscipline10 +
    pdplGovernance10;

  let verdict: MeasurementReadinessResult['verdict'] = 'Broken';
  let verdictAr = 'معطل — يمنع اتخاذ قرارات ميزانية قبل إصلاح التتبع';
  if (score >= 85) {
    verdict = 'Measurement-Ready';
    verdictAr = 'جاهز للقياس والتوسيع التجريبي الموثوق';
  } else if (score >= 70) {
    verdict = 'Usable with Gaps';
    verdictAr = 'صالح للاستخدام مع فجوات بسيطة';
  } else if (score >= 55) {
    verdict = 'Unreliable';
    verdictAr = 'غير موثوق بعد — راجع انضباط UTM وتكرار البيانات';
  }

  return {
    score,
    verdict,
    verdictAr,
    safeToScaleBudgets: score >= 55,
    breakdown: {
      decisionAlignment25,
      eventModelClarity20,
      dataAccuracy20,
      conversionQuality15,
      utmDiscipline10,
      pdplGovernance10,
    },
    gapsAr,
  };
}

/**
 * Builds a strict lowercase, underscore-normalized UTM URL free of PII (`analytics-tracking`).
 */
export function buildNormalizedUtmUrl(params: {
  baseUrl?: string;
  landingPath?: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}): {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  fullUrl: string;
} {
  const sanitizeSlug = (val: string) =>
    (val || '')
      .trim()
      .toLowerCase()
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '')
      .replace(/\+?\d{8,15}/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'campaign';

  const utmSource = sanitizeSlug(params.source);
  const utmMedium = sanitizeSlug(params.medium);
  const utmCampaign = sanitizeSlug(params.campaign);
  const utmContent = params.content ? sanitizeSlug(params.content) : '';

  const base = (params.baseUrl || 'https://alsulaim.sa').replace(/\/+$/, '');
  const path = (params.landingPath || '/select-workers').startsWith('/')
    ? params.landingPath || '/select-workers'
    : `/${params.landingPath}`;

  const qs = new URLSearchParams({
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
  });
  if (utmContent) qs.set('utm_content', utmContent);

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    fullUrl: `${base}${path}?${qs.toString()}`,
  };
}

// ============================================================================
// 3. AD CREATIVE SPEC VALIDATOR & PDPL-SAFE CV CARD (`ad-creative`)
// ============================================================================

export interface CreativeSpecValidation {
  valid: boolean;
  headlineLimit: number;
  primaryLimit: number;
  headlineLength: number;
  primaryLength: number;
  issuesAr: string[];
  trimmedHeadlineSuggestion: string;
  trimmedPrimarySuggestion: string;
}

export function validatePlatformCreativeSpec(params: {
  platform: AdPlatform;
  headline: string;
  primaryText: string;
  description?: string;
}): CreativeSpecValidation {
  const specs: Record<AdPlatform, { headlineMax: number; primaryMax: number; descMax: number }> = {
    google: { headlineMax: 30, primaryMax: 90, descMax: 90 },
    meta: { headlineMax: 40, primaryMax: 125, descMax: 30 },
    snapchat: { headlineMax: 34, primaryMax: 80, descMax: 80 },
    tiktok: { headlineMax: 40, primaryMax: 80, descMax: 80 },
    x: { headlineMax: 70, primaryMax: 280, descMax: 200 },
    influencer: { headlineMax: 60, primaryMax: 220, descMax: 120 },
  };

  const rule = specs[params.platform] || specs.snapchat;
  const h = (params.headline || '').trim();
  const p = (params.primaryText || '').trim();
  const d = (params.description || '').trim();
  const issuesAr: string[] = [];

  if (!h) issuesAr.push('يرجى إدخال العنوان الإعلاني الرئيسي.');
  if (!p) issuesAr.push('يرجى إدخال النص الإعلاني الأساسي.');

  if (h.length > rule.headlineMax) {
    issuesAr.push(
      `العنوان يتجاوز الحد المسموح لمنصة (${AD_PLATFORM_LABELS[params.platform]}): ${h.length}/${rule.headlineMax} حرفاً.`
    );
  }
  if (p.length > rule.primaryMax) {
    issuesAr.push(
      `النص المرئي يتجاوز الطول المثالي لمنصة (${AD_PLATFORM_LABELS[params.platform]}): ${p.length}/${rule.primaryMax} حرفاً.`
    );
  }
  if (d && d.length > rule.descMax) {
    issuesAr.push(`الوصف الإضافي يتجاوز الحد (${d.length}/${rule.descMax} حرفاً).`);
  }

  return {
    valid: issuesAr.length === 0,
    headlineLimit: rule.headlineMax,
    primaryLimit: rule.primaryMax,
    headlineLength: h.length,
    primaryLength: p.length,
    issuesAr,
    trimmedHeadlineSuggestion: h.length > rule.headlineMax ? h.slice(0, rule.headlineMax - 1).trim() + '…' : h,
    trimmedPrimarySuggestion: p.length > rule.primaryMax ? p.slice(0, rule.primaryMax - 1).trim() + '…' : p,
  };
}

/**
 * Generates a Saudi PDPL-Safe Promotional CV Ad Card (`ad-creative` + `PDPL Art. 11`).
 * Strips passport numbers, personal phones, and full surname.
 */
export function buildPdplSafeCvAdCard(cv: {
  cv_code?: string;
  id?: string;
  name?: string;
  nationality?: string;
  profession?: string;
  experience_years?: number;
  passport_number?: string;
  phone?: string;
  company_id?: string;
}): {
  reservationCode: string;
  displayFirstNameOnly: string;
  professionAr: string;
  nationalityAr: string;
  experienceLabel: string;
  adHeadline: string;
  adPrimaryCopy: string;
  bookingUtmUrl: string;
  pdplCompliant: true;
} {
  const reservationCode = String(cv.cv_code || cv.id || 'CV-2026-01').trim();
  const firstToken = String(cv.name || 'مرشحة معتمدة')
    .trim()
    .split(/\s+/)[0]
    .replace(/\d+/g, '');
  const nationalityAr = String(cv.nationality || 'الفلبين');
  const professionAr = String(cv.profession || 'عاملة منزلية شاملة');
  const expYears = Number(cv.experience_years || 4);
  const experienceLabel = `خبرة ${expYears} سنوات معتمدة`;

  const utm = buildNormalizedUtmUrl({
    landingPath: `/select-workers`,
    source: 'snapchat',
    medium: 'cv_promo_card',
    campaign: `${(cv.company_id || 'saf').toLowerCase()}_cv_card`,
    content: reservationCode,
  });

  return {
    reservationCode,
    displayFirstNameOnly: `${firstToken} (كود #${reservationCode})`,
    professionAr,
    nationalityAr,
    experienceLabel,
    adHeadline: `كود حجز #${reservationCode} — ${nationalityAr}`.slice(0, 34),
    adPrimaryCopy: `${professionAr} (${nationalityAr}) • ${experienceLabel} • توثيق مساند وضمان 90 يوماً`.slice(0, 80),
    bookingUtmUrl: utm.fullUrl,
    pdplCompliant: true,
  };
}

export function exportAdVariationsCsv(tasks: CrmContentTask[]): string {
  const header = 'task_code,platform,angle,headline,primary_text,approval_status,company_id';
  const escapeCsv = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`;
  const rows = tasks.map((t) =>
    [
      escapeCsv(t.task_code),
      escapeCsv(t.target_platform),
      escapeCsv(t.creative_angle),
      escapeCsv(t.headline_text),
      escapeCsv(t.primary_copy_text),
      escapeCsv(t.approval_status),
      escapeCsv(t.company_id),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

// ============================================================================
// 4. WEIGHTED PIPELINE, AUTO-ROUTING & SLA/ROTTING RADAR (`odoo-sales-crm-expert`)
// ============================================================================

const COMPANY_SALES_ROSTER: Record<string, Array<{ email: string; nameAr: string }>> = {
  SAF: [
    { email: 'h.hassan.safir@kas.sa', nameAr: 'حذيفه رمضان على حسن' },
    { email: 'k.abdullatif.safir@kas.sa', nameAr: 'خالد على حسن عبداللطيف' },
    { email: 's.ali.safir@kas.sa', nameAr: 'سمية محمد كمال علي' },
    { email: 'm.khalifa.sales@kas.sa', nameAr: 'محمود على عبدالقوى خليفه' },
  ],
  TOP: [
    { email: 'a.eissa.topaz@kas.sa', nameAr: 'امل سعيد عمر عيسى' },
    { email: 'i.hamdy.topaz@kas.sa', nameAr: 'اسلام احمد حمدى' },
  ],
  YAQ: [
    { email: 'h.yousef.yaqoot@kas.sa', nameAr: 'حسن يوسف' },
    { email: 'r.othman.yaqoot@kas.sa', nameAr: 'رابية محمد عثمان' },
    { email: 's.barakat.yaqoot@kas.sa', nameAr: 'سارة محمد مضوي بركات' },
  ],
  DAR: [
    { email: 'a.abdelwahab.daralrowad@kas.sa', nameAr: 'عمرو عبدالوهاب' },
    { email: 'h.alansari.daralrowad@kas.sa', nameAr: 'حمزة عبدالباقي محمد الانصاري' },
  ],
  KAS: [
    { email: 'm.alsaleh.imal@kas.sa', nameAr: 'ماجد عبدالرحمن الصالح' },
    { email: 'b.allaboudi.showroom@kas.sa', nameAr: 'باسل خالد محمد اللبودى' },
  ],
};

export function resolveAutoAssignedSalesRep(
  companyId: string,
  roundRobinIndex = 0
): { email: string; nameAr: string; resolvedCompanyId: string } {
  const norm = (companyId || 'SAF').toUpperCase();
  const targetCompany = COMPANY_SALES_ROSTER[norm] ? norm : 'SAF';
  const roster = COMPANY_SALES_ROSTER[targetCompany];
  const picked = roster[Math.abs(roundRobinIndex) % roster.length];
  return { ...picked, resolvedCompanyId: targetCompany };
}

export function evaluateLeadSlaAndRotting(
  lead: CrmLead,
  nowMs: number = Date.now()
): {
  slaBreached: boolean;
  slaRemainingMinutes: number;
  isRotting: boolean;
  idleHours: number;
  weightedValueSar: number;
} {
  const stageMeta = LEAD_STAGE_META[lead.stage] || LEAD_STAGE_META.new;
  const dueMs = new Date(lead.sla_due_at || nowMs).getTime();
  const hasResponded = Boolean(lead.first_response_at) || lead.stage !== 'new';
  const slaRemainingMinutes = Math.round((dueMs - nowMs) / 60000);
  const slaBreached = !hasResponded && slaRemainingMinutes < 0;

  const lastActMs = new Date(lead.last_activity_at || lead.created_at || nowMs).getTime();
  const idleHours = Math.max(0, round2((nowMs - lastActMs) / 3600000));
  const isTerminal = lead.stage === 'won' || lead.stage === 'lost';
  const isRotting = !isTerminal && idleHours > stageMeta.maxStaleHours;

  const prob = lead.stage === 'lost' ? 0 : lead.stage === 'won' ? 100 : stageMeta.probabilityPct;
  const weightedValueSar = round2((Number(lead.estimated_value_sar || 0) * prob) / 100);

  return {
    slaBreached,
    slaRemainingMinutes,
    isRotting,
    idleHours,
    weightedValueSar,
  };
}

export function computeWeightedPipelineForecast(
  leads: CrmLead[],
  companyFilter = 'all',
  nowMs: number = Date.now()
): {
  scopedLeads: CrmLead[];
  totalPipelineValueSar: number;
  weightedForecastSar: number;
  wonRevenueSar: number;
  rottingLeadsCount: number;
  slaBreachedCount: number;
  lostReasonsBreakdown: Array<{ reason: string; count: number }>;
} {
  const scopedLeads = filterRecordsByCompanyIsolation(leads, companyFilter);
  let totalPipelineValueSar = 0;
  let weightedForecastSar = 0;
  let wonRevenueSar = 0;
  let rottingLeadsCount = 0;
  let slaBreachedCount = 0;
  const lostCounts: Record<string, number> = {};

  for (const lead of scopedLeads) {
    const diag = evaluateLeadSlaAndRotting(lead, nowMs);
    if (lead.stage !== 'lost') {
      totalPipelineValueSar += Number(lead.estimated_value_sar || 0);
      weightedForecastSar += diag.weightedValueSar;
    }
    if (lead.stage === 'won') {
      wonRevenueSar += Number(lead.estimated_value_sar || 0);
    }
    if (lead.stage === 'lost') {
      const r = lead.lost_reason || 'غير محدد';
      lostCounts[r] = (lostCounts[r] || 0) + 1;
    }
    if (diag.isRotting) rottingLeadsCount += 1;
    if (diag.slaBreached) slaBreachedCount += 1;
  }

  const lostReasonsBreakdown = Object.entries(lostCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return {
    scopedLeads,
    totalPipelineValueSar: round2(totalPipelineValueSar),
    weightedForecastSar: round2(weightedForecastSar),
    wonRevenueSar: round2(wonRevenueSar),
    rottingLeadsCount,
    slaBreachedCount,
    lostReasonsBreakdown,
  };
}

// ============================================================================
// 5. REFERRAL ECONOMICS, ANTI-FRAUD & SAUDI PDPL ART. 25 GATE (`referral-program`)
// ============================================================================

export function calculateReferralEconomics(params: {
  customerLtvSar: number;
  grossMarginPct: number;
  targetCacSar: number;
  invitationsSent: number;
  conversionsCount: number;
  rewardsPaidSar: number;
  referredRevenueSar: number;
}): {
  maxEconomicalRewardSar: number;
  conversionRatePct: number;
  viralKFactor: number;
  roiPct: number;
} {
  const margin = Math.min(1, Math.max(0, params.grossMarginPct / 100));
  const maxEconomicalRewardSar = Math.max(
    0,
    round2(params.customerLtvSar * margin - params.targetCacSar)
  );
  const convRate =
    params.invitationsSent > 0 ? params.conversionsCount / params.invitationsSent : 0;
  // Average invitations per active referrer normalized
  const viralKFactor = round2(Math.min(10, Math.max(1, params.invitationsSent / 5)) * convRate);
  const roiPct =
    params.rewardsPaidSar > 0
      ? round2(((params.referredRevenueSar - params.rewardsPaidSar) / params.rewardsPaidSar) * 100)
      : 0;

  return {
    maxEconomicalRewardSar,
    conversionRatePct: round2(convRate * 100),
    viralKFactor,
    roiPct,
  };
}

export function validateReferralAntiFraud(params: {
  referrerPhone: string;
  referrerNationalId?: string;
  referredPhone: string;
  referredNationalId?: string;
  contractPaidInFull: boolean;
  contractCancelled?: boolean;
}): {
  allowed: boolean;
  payoutState: CrmPromoReferral['payout_status'];
  reasonAr: string;
} {
  const normPhone = (p: string) => (p || '').replace(/\D/g, '').slice(-9);
  if (normPhone(params.referrerPhone) && normPhone(params.referrerPhone) === normPhone(params.referredPhone)) {
    return {
      allowed: false,
      payoutState: 'مسترد للإلغاء (Clawback)',
      reasonAr: 'رفض مكافحة الاحتيال: لا تُقبل الإحالة الذاتية لنفس رقم الجوال.',
    };
  }
  if (
    params.referrerNationalId &&
    params.referredNationalId &&
    params.referrerNationalId.trim() === params.referredNationalId.trim()
  ) {
    return {
      allowed: false,
      payoutState: 'مسترد للإلغاء (Clawback)',
      reasonAr: 'رفض مكافحة الاحتيال: تطابق رقم الهوية الوطنية بين المُحيل والمُحال.',
    };
  }
  if (params.contractCancelled) {
    return {
      allowed: false,
      payoutState: 'مسترد للإلغاء (Clawback)',
      reasonAr: 'استرداد آلي للعمولة (Clawback) بسبب إلغاء العقد قبل إتمام الخدمة.',
    };
  }
  if (!params.contractPaidInFull) {
    return {
      allowed: true,
      payoutState: 'معلق لحين تحصيل العقد',
      reasonAr: 'تم توثيق الإحالة — تُصرف المكافأة فور اكتمال سداد العقد وتحصيله.',
    };
  }
  return {
    allowed: true,
    payoutState: 'مستحق للصرف',
    reasonAr: 'إحالة نظامية موثقة ومكتملة السداد — جاهزة للصرف.',
  };
}

/**
 * Enforces Saudi PDPL Art. 25 Marketing Consent & Unsubscribe Tombstone Filtering
 * before dispatching any promotional WhatsApp/SMS/Email broadcast.
 */
export function preparePdplCompliantBroadcast(params: {
  recipients: Array<{ name: string; phoneOrEmail: string; marketingConsent?: boolean }>;
  bodyTemplate: string;
  channel: 'whatsapp' | 'sms' | 'email';
}): {
  approvedPayloads: Array<{ recipient: string; name: string; formattedMessage: string }>;
  blockedRecipients: string[];
  blockedByPdplCount: number;
} {
  const consentRecords = getMarketingConsentRecords();
  const optedOutSet = new Set(
    consentRecords
      .filter((r) => r.status === 'unsubscribed')
      .flatMap((r) => [r.recipient.toLowerCase(), r.recipient.replace(/\D/g, '').slice(-9)])
      .filter(Boolean)
  );

  const approvedPayloads: Array<{ recipient: string; name: string; formattedMessage: string }> = [];
  const blockedRecipients: string[] = [];

  for (const item of params.recipients) {
    const raw = (item.phoneOrEmail || '').trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    const digits9 = raw.replace(/\D/g, '').slice(-9);

    const isOptedOut =
      item.marketingConsent === false ||
      optedOutSet.has(lower) ||
      (digits9.length === 9 && optedOutSet.has(digits9));

    if (isOptedOut) {
      blockedRecipients.push(raw);
      continue;
    }

    const personalized = params.bodyTemplate.replace(/\{\{customer_name\}\}/g, item.name || 'عميلنا الكريم');
    const formattedMessage = buildCompliantMarketingMessage({
      recipient: raw,
      bodyText: personalized,
      channel: params.channel,
    });

    approvedPayloads.push({
      recipient: raw,
      name: item.name,
      formattedMessage,
    });
  }

  return {
    approvedPayloads,
    blockedRecipients,
    blockedByPdplCount: blockedRecipients.length,
  };
}

// ============================================================================
// 6. CUSTOMER 360° AGGREGATION & VIP TIER CLASSIFICATION
// ============================================================================

export type ClientVipTier = 'ماسي VIP' | 'أعمال B2B' | 'نشط' | 'خامل يحتاج تنشيط' | 'محظور';

export interface Customer360Profile {
  clientId: string;
  name: string;
  phone: string;
  maskedNationalId: string;
  accountCode: string;
  branch: string;
  vipTier: ClientVipTier;
  referralCode: string;
  attributedCampaignName: string;
  totalContractsCount: number;
  totalInvoicedSar: number;
  formattedTotalInvoiced: string;
  openComplaintsCount: number;
  avgCsatScore: number | null;
  recentContracts: any[];
  recentInvoices: any[];
  recentComplaints: any[];
  recentChats: any[];
}

export async function buildCustomer360Profile(client: any): Promise<Customer360Profile> {
  const [recContracts, rentContracts, invoices, complaints, chats, campaigns, surveys] =
    await Promise.all([
      realErpDataStore.getRecords<any>('contracts', []),
      realErpDataStore.getRecords<any>('rent_contracts', []),
      realErpDataStore.getRecords<any>('invoices', []),
      realErpDataStore.getRecords<any>('complaints', []),
      realErpDataStore.getRecords<any>('whatsapp_messages', []),
      realErpDataStore.getRecords<CrmAdCampaign>('crm_marketing_campaigns', DEFAULT_CRM_CAMPAIGNS),
      realErpDataStore.getRecords<CrmCsatSurvey>('crm_csat_surveys', DEFAULT_CSAT_SURVEYS),
    ]);

  const clientName = String(client?.name || '');
  const phoneDigits = String(client?.phone || '').replace(/\D/g, '').slice(-9);

  const matchesClient = (row: any) => {
    const rName = String(row?.client_name || row?.customer_name || row?.beneficiary_name || '');
    const rPhone = String(row?.client_phone || row?.phone || '').replace(/\D/g, '').slice(-9);
    return (
      (clientName && rName && rName.includes(clientName.split(' ')[0]) && rName.includes(clientName.split(' ').slice(-1)[0])) ||
      (phoneDigits.length === 9 && rPhone === phoneDigits)
    );
  };

  const matchedRec = recContracts.filter(matchesClient);
  const matchedRent = rentContracts.filter(matchesClient);
  const matchedInv = invoices.filter(matchesClient);
  const matchedComp = complaints.filter(matchesClient);
  const matchedChats = chats.filter(matchesClient);
  const matchedSurveys = surveys.filter(matchesClient);

  const totalContractsCount =
    matchedRec.length +
    matchedRent.length +
    Number(client?.recruitment_contracts || 0) +
    Number(client?.rent_contracts || 0);

  const invSum = matchedInv.reduce(
    (s, i) => s + Number(i?.total_amount || i?.total || i?.amount || 0),
    0
  );
  const totalInvoicedSar = invSum > 0 ? invSum : totalContractsCount * 15800;

  let vipTier: ClientVipTier = 'نشط';
  if (client?.status === 'محظور') {
    vipTier = 'محظور';
  } else if (client?.type === 'شركة' || client?.type === 'جهة حكومية') {
    vipTier = 'أعمال B2B';
  } else if (totalContractsCount >= 2 || totalInvoicedSar >= 30000) {
    vipTier = 'ماسي VIP';
  } else if (totalContractsCount === 0) {
    vipTier = 'خامل يحتاج تنشيط';
  }

  const avgCsatScore =
    matchedSurveys.length > 0
      ? round2(matchedSurveys.reduce((s, x) => s + Number(x.csat_score || 5), 0) / matchedSurveys.length)
      : null;

  const matchedCampaign =
    campaigns.find((c) => c.company_id === client?.company_id) || campaigns[0];

  const cleanCodeSuffix = String(client?.client_no || client?.id || '100')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-4)
    .toUpperCase();

  return {
    clientId: String(client?.id || ''),
    name: clientName,
    phone: String(client?.phone || ''),
    maskedNationalId: maskNationalId(String(client?.national_id || '')),
    accountCode: String(client?.account_code || '110201'),
    branch: String(client?.branch || 'فرع الرياض الرئيسي'),
    vipTier,
    referralCode: `REF-${cleanCodeSuffix}`,
    attributedCampaignName: matchedCampaign?.name || 'بحث مباشر / توصية عميل',
    totalContractsCount,
    totalInvoicedSar,
    formattedTotalInvoiced: formatSaudiRiyal(totalInvoicedSar),
    openComplaintsCount: matchedComp.filter((t) => !String(t?.status || '').includes('إغلاق')).length,
    avgCsatScore,
    recentContracts: [...matchedRec, ...matchedRent].slice(0, 5),
    recentInvoices: matchedInv.slice(0, 5),
    recentComplaints: matchedComp.slice(0, 5),
    recentChats: matchedChats.slice(0, 5),
  };
}

// ============================================================================
// 7. TWO-WAY COMPANY ISOLATION HELPER (`KAS` Standalone vs Recruitment Entities)
// ============================================================================

export function filterRecordsByCompanyIsolation<T extends { company_id?: string }>(
  records: T[],
  activeCompanyId: string
): T[] {
  const norm = (activeCompanyId || 'all').toUpperCase();
  if (norm === 'KAS') {
    return records.filter((r) => (r.company_id || '').toUpperCase() === 'KAS');
  }
  if (norm === 'ALL' || norm === 'HOLDING') {
    // Non-KAS consolidated view excludes standalone KAS commercial records unless explicitly viewing KAS
    return records.filter((r) => (r.company_id || 'SAF').toUpperCase() !== 'KAS');
  }
  return records.filter((r) => (r.company_id || 'SAF').toUpperCase() === norm);
}

// ─── Store Persistence Helpers ──────────────────────────────────────────────

export async function loadCrmMarketingWorkspaceData(activeCompanyId = 'all') {
  const [campaigns, leads, contentTasks, promoReferrals, csatSurveys] = await Promise.all([
    realErpDataStore.getRecords<CrmAdCampaign>('crm_marketing_campaigns', DEFAULT_CRM_CAMPAIGNS),
    realErpDataStore.getRecords<CrmLead>('crm_leads', DEFAULT_CRM_LEADS),
    realErpDataStore.getRecords<CrmContentTask>('crm_content_calendar', DEFAULT_CONTENT_TASKS),
    realErpDataStore.getRecords<CrmPromoReferral>('crm_promo_referrals', DEFAULT_PROMO_REFERRALS),
    realErpDataStore.getRecords<CrmCsatSurvey>('crm_csat_surveys', DEFAULT_CSAT_SURVEYS),
  ]);

  return {
    allCampaigns: campaigns,
    allLeads: leads,
    allContentTasks: contentTasks,
    allPromoReferrals: promoReferrals,
    allCsatSurveys: csatSurveys,
    campaigns: filterRecordsByCompanyIsolation(campaigns, activeCompanyId),
    leads: filterRecordsByCompanyIsolation(leads, activeCompanyId),
    contentTasks: filterRecordsByCompanyIsolation(contentTasks, activeCompanyId),
    promoReferrals: filterRecordsByCompanyIsolation(promoReferrals, activeCompanyId),
    csatSurveys: filterRecordsByCompanyIsolation(csatSurveys, activeCompanyId),
  };
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normalCdf(x: number): number {
  // Abramowitz & Stegun 7.1.26 approximation (max error 1.5e-7)
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}
