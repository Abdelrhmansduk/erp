import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone,
  TrendingUp,
  Target,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Send,
  Download,
  Copy,
  ShieldCheck,
  Clock,
  Users,
  Layers,
  Award,
  Wallet,
  X,
  Check,
  ArrowLeft,
  Flame,
  Calculator,
  FileSpreadsheet,
  PhoneCall,
  Undo2,
  Redo2,
  Eye,
  RefreshCw,
  Brain,
  Globe,
} from 'lucide-react';
import { useModalEscape } from '../hooks/useModalEscape';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { authService } from '../services/authService';
import { realErpDataStore } from '../services/realErpDataStore';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { ExportPreviewModal } from '../components/common/ExportPreviewModal';
import { CrmMarketingKpiDetailsModal, type CrmKpiDetailKind } from '../components/crm/CrmMarketingKpiDetailsModal';
import { CrmAiMarketingStudioTab } from '../components/crm/CrmAiMarketingStudioTab';
import { CrmGroupWebsitesHubTab } from '../components/crm/CrmGroupWebsitesHubTab';
import { DEFAULT_GROUP_WEBSITES, type CrmGroupWebsite } from '../services/crmGroupSitesService';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { formatSaudiRiyal } from '../utils/saudiRiyal';
import {
  type AdPlatform,
  type CrmAdCampaign,
  type CrmLead,
  type CrmContentTask,
  type CrmPromoReferral,
  type LeadStage,
  type CreativeAngle,
  type ContentApprovalStatus,
  AD_PLATFORM_LABELS,
  LEAD_STAGE_META,
  LOST_REASONS_CATALOG,
  CREATIVE_ANGLES_META,
  DEFAULT_CRM_CAMPAIGNS,
  DEFAULT_CRM_LEADS,
  DEFAULT_CONTENT_TASKS,
  DEFAULT_PROMO_REFERRALS,
  loadCrmMarketingWorkspaceData,
  evaluateCampaignsPortfolio,
  evaluateAbTestTwoProportion,
  calculateScientificGoalBudget,
  computeMeasurementReadinessIndex,
  buildNormalizedUtmUrl,
  validatePlatformCreativeSpec,
  buildPdplSafeCvAdCard,
  exportAdVariationsCsv,
  resolveAutoAssignedSalesRep,
  evaluateLeadSlaAndRotting,
  computeWeightedPipelineForecast,
  calculateReferralEconomics,
  validateReferralAntiFraud,
  preparePdplCompliantBroadcast,
} from '../services/crmMarketingEngine';

type HubTabId = 'overview' | 'campaigns' | 'pipeline' | 'studio' | 'referrals' | 'ai-studio' | 'group-sites';

function resolveInitialHubTab(storeTab: string): HubTabId {
  if (storeTab === 'marketing-campaigns') return 'campaigns';
  if (storeTab === 'crm-leads-pipeline') return 'pipeline';
  if (storeTab === 'marketing-studio') return 'studio';
  if (storeTab === 'crm-promos-referrals') return 'referrals';
  return 'overview';
}

export const CrmMarketingHubPage: React.FC = () => {
  useModalEscape();
  const { activeCompanyId } = useCompany();
  const storeActiveTab = useAppStore((s) => s.activeTab);
  const { addNotification } = useAppStore();
  const currentUser = authService.getCurrentUser();

  const [activeTab, setActiveTab] = useState<HubTabId>(() => resolveInitialHubTab(storeActiveTab));
  const [campaigns, setCampaigns] = useState<CrmAdCampaign[]>(DEFAULT_CRM_CAMPAIGNS);
  const [leads, setLeads] = useState<CrmLead[]>(DEFAULT_CRM_LEADS);
  const [contentTasks, setContentTasks] = useState<CrmContentTask[]>(DEFAULT_CONTENT_TASKS);
  const [promoReferrals, setPromoReferrals] = useState<CrmPromoReferral[]>(DEFAULT_PROMO_REFERRALS);
  const [groupSites, setGroupSites] = useState<CrmGroupWebsite[]>(DEFAULT_GROUP_WEBSITES);
  const [kpiDetail, setKpiDetail] = useState<CrmKpiDetailKind | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  type MarketingUndoSnapshot = {
    campaigns: CrmAdCampaign[];
    leads: CrmLead[];
    contentTasks: CrmContentTask[];
    promoReferrals: CrmPromoReferral[];
  };
  const [undoStack, setUndoStack] = useState<MarketingUndoSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<MarketingUndoSnapshot[]>([]);

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-24),
      { campaigns, leads, contentTasks, promoReferrals },
    ]);
    setRedoStack([]);
  }, [campaigns, leads, contentTasks, promoReferrals]);

  const persistCrmTable = useCallback(
    async <T extends { id: string }>(table: string, fullList: T[], changedRows?: T[]) => {
      await realErpDataStore.saveRecords(table, fullList);
      await realErpDataStore
        .importRealRecordsBatch(table, changedRows && changedRows.length ? changedRows : fullList)
        .catch(() => {});
    },
    []
  );

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r.slice(-24), { campaigns, leads, contentTasks, promoReferrals }]);
    setUndoStack((u) => u.slice(0, -1));
    setCampaigns(prevSnap.campaigns);
    setLeads(prevSnap.leads);
    setContentTasks(prevSnap.contentTasks);
    setPromoReferrals(prevSnap.promoReferrals);
    await Promise.all([
      persistCrmTable('crm_marketing_campaigns', prevSnap.campaigns),
      persistCrmTable('crm_leads', prevSnap.leads),
      persistCrmTable('crm_content_calendar', prevSnap.contentTasks),
      persistCrmTable('crm_promo_referrals', prevSnap.promoReferrals),
    ]);
    addNotification({
      title: 'تم التراجع (Undo)',
      message: 'تمت استعادة الحالة السابقة لقسم التسويق ومزامنتها سحابياً.',
      type: 'info',
    });
  }, [undoStack, campaigns, leads, contentTasks, promoReferrals, persistCrmTable, addNotification]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u.slice(-24), { campaigns, leads, contentTasks, promoReferrals }]);
    setRedoStack((r) => r.slice(0, -1));
    setCampaigns(nextSnap.campaigns);
    setLeads(nextSnap.leads);
    setContentTasks(nextSnap.contentTasks);
    setPromoReferrals(nextSnap.promoReferrals);
    await Promise.all([
      persistCrmTable('crm_marketing_campaigns', nextSnap.campaigns),
      persistCrmTable('crm_leads', nextSnap.leads),
      persistCrmTable('crm_content_calendar', nextSnap.contentTasks),
      persistCrmTable('crm_promo_referrals', nextSnap.promoReferrals),
    ]);
    addNotification({
      title: 'تمت الإعادة (Redo)',
      message: 'تمت إعادة تطبيق آخر خطوة في قسم التسويق.',
      type: 'info',
    });
  }, [redoStack, campaigns, leads, contentTasks, promoReferrals, persistCrmTable, addNotification]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && undoStack.length > 0) {
        e.preventDefault();
        void handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) &&
        redoStack.length > 0
      ) {
        e.preventDefault();
        void handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo, undoStack.length, redoStack.length]);

  // Modals
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [losingLead, setLosingLead] = useState<CrmLead | null>(null);
  const [selectedLostReason, setSelectedLostReason] = useState(LOST_REASONS_CATALOG[0]);

  // Calculators State (Tab 1: AARRR + Scientific Budget + A/B Significance)
  const [goalContracts, setGoalContracts] = useState(60);
  const [goalHistoricalCpa, setGoalHistoricalCpa] = useState(480);
  const [abExposuresA, setAbExposuresA] = useState(2400);
  const [abConvA, setAbConvA] = useState(72);
  const [abExposuresB, setAbExposuresB] = useState(2450);
  const [abConvB, setAbConvB] = useState(112);

  // Studio CV Card Generator State (Tab 4)
  const [cvCardForm, setCvCardForm] = useState({
    cv_code: 'PHL-2026-95',
    name: 'MARIA SANTOS REYES',
    nationality: 'الفلبين',
    profession: 'عاملة منزلية ورعاية أطفال',
    experience_years: 5,
  });

  // Retargeting & Referral Economics State (Tab 5)
  const [retargetBucketFilter, setRetargetBucketFilter] = useState<'hot_1_7d' | 'warm_7_30d' | 'cold_30_90d'>('hot_1_7d');
  const [broadcastText, setBroadcastText] = useState(
    'مرحباً {{customer_name}}، وصلت دفعة جديدة من السير المعتمدة عبر مساند بضمان 90 يوماً وخصم فوري بكود SAFIR500.'
  );
  const [broadcastPreviewResult, setBroadcastPreviewResult] = useState<{
    approvedCount: number;
    blockedCount: number;
    sampleText: string;
  } | null>(null);

  const [fraudTestForm, setFraudTestForm] = useState({
    referrerPhone: '+966558025628',
    referredPhone: '+966501122990',
    contractPaidInFull: true,
  });

  // New Campaign Form
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
    platform: 'snapchat' as AdPlatform,
    service_type: 'استقدام عمالة منزلية',
    budget_bucket: 'proven_70' as 'proven_70' | 'testing_30',
    budget_sar: 10000,
    target_cpa_sar: 500,
    utm_campaign: 'saf_winter_offer_2026',
    landing_path: '/select-workers',
  });

  // New Lead Form
  const [leadForm, setLeadForm] = useState({
    full_name: '',
    phone: '',
    city: 'الرياض',
    company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
    client_type: 'شخص' as CrmLead['client_type'],
    service_interest: 'استقدام عاملة منزلية',
    preferred_nationality: 'الفلبين',
    source_platform: 'snapchat' as AdPlatform,
    estimated_value_sar: 17500,
    marketing_consent: true,
    notes: '',
  });

  // New Studio Task Form
  const [studioForm, setStudioForm] = useState({
    title: '',
    company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
    content_type: 'reel_video' as CrmContentTask['content_type'],
    creative_angle: 'outcome' as CreativeAngle,
    target_platform: 'snapchat' as AdPlatform,
    headline_text: 'استقدام الفلبين الموثق بضمان 90 يوماً',
    primary_copy_text: 'اختر السيرة الأنسب لأسرتك ووثق عقدك عبر مساند بمتابعة يومية حتى المطار.',
    video_script_hook: '0-3ث: خطاف جذاب | 3-8ث: المشكلة | 8-20ث: الحل المضمون | 20-30ث: احجز الآن',
  });

  // New Promo / Referral Form
  const [promoForm, setPromoForm] = useState({
    program_kind: 'promo_coupon' as CrmPromoReferral['program_kind'],
    company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
    code: '',
    title_ar: '',
    referrer_name: '',
    referrer_phone: '',
    client_discount_value: 400,
    referrer_reward_sar: 350,
    applicable_service: 'استقدام وتأجير',
  });

  useEffect(() => {
    setActiveTab(resolveInitialHubTab(storeActiveTab));
  }, [storeActiveTab]);

  const reloadData = useCallback(async () => {
    const res = await loadCrmMarketingWorkspaceData(activeCompanyId);
    setCampaigns(res.allCampaigns);
    setLeads(res.allLeads);
    setContentTasks(res.allContentTasks);
    setPromoReferrals(res.allPromoReferrals);
  }, [activeCompanyId]);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  // Derived Skill Analytics
  const campaignPortfolio = useMemo(
    () => evaluateCampaignsPortfolio(campaigns, activeCompanyId),
    [campaigns, activeCompanyId]
  );

  const pipelineForecast = useMemo(
    () => computeWeightedPipelineForecast(leads, activeCompanyId),
    [leads, activeCompanyId]
  );

  const signalReadiness = useMemo(
    () =>
      computeMeasurementReadinessIndex({
        campaigns: campaignPortfolio.items.map((i) => i.campaign),
        leads: pipelineForecast.scopedLeads,
        pdplGuardActive: true,
      }),
    [campaignPortfolio.items, pipelineForecast.scopedLeads]
  );

  const scientificBudget = useMemo(
    () =>
      calculateScientificGoalBudget({
        targetContractsPerMonth: goalContracts,
        historicalCpaSar: goalHistoricalCpa,
      }),
    [goalContracts, goalHistoricalCpa]
  );

  const abTestVerdict = useMemo(
    () =>
      evaluateAbTestTwoProportion({
        exposuresA: abExposuresA,
        conversionsA: abConvA,
        exposuresB: abExposuresB,
        conversionsB: abConvB,
      }),
    [abExposuresA, abConvA, abExposuresB, abConvB]
  );

  const liveStudioValidation = useMemo(
    () =>
      validatePlatformCreativeSpec({
        platform: studioForm.target_platform,
        headline: studioForm.headline_text,
        primaryText: studioForm.primary_copy_text,
      }),
    [studioForm.target_platform, studioForm.headline_text, studioForm.primary_copy_text]
  );

  const scopedContentTasks = useMemo(
    () =>
      contentTasks.filter((t) =>
        activeCompanyId.toUpperCase() === 'KAS'
          ? t.company_id === 'KAS'
          : activeCompanyId === 'all'
          ? t.company_id !== 'KAS'
          : t.company_id === activeCompanyId
      ),
    [contentTasks, activeCompanyId]
  );

  const scopedPromos = useMemo(
    () =>
      promoReferrals.filter((p) =>
        activeCompanyId.toUpperCase() === 'KAS'
          ? p.company_id === 'KAS'
          : activeCompanyId === 'all'
          ? p.company_id !== 'KAS'
          : p.company_id === activeCompanyId
      ),
    [promoReferrals, activeCompanyId]
  );

  const referralEcon = useMemo(() => {
    const totalInv = scopedPromos.reduce((s, p) => s + Number(p.invitations_sent || 0), 0);
    const totalConv = scopedPromos.reduce((s, p) => s + Number(p.conversions_count || 0), 0);
    const totalRewards = scopedPromos.reduce(
      (s, p) => s + Number(p.conversions_count || 0) * Number(p.referrer_reward_sar || 0),
      0
    );
    return calculateReferralEconomics({
      customerLtvSar: 17500,
      grossMarginPct: 24,
      targetCacSar: campaignPortfolio.blendedCpaSar || 480,
      invitationsSent: totalInv || 10,
      conversionsCount: totalConv || 2,
      rewardsPaidSar: totalRewards || 700,
      referredRevenueSar: (totalConv || 2) * 16500,
    });
  }, [scopedPromos, campaignPortfolio.blendedCpaSar]);

  // ─── Action Handlers ───────────────────────────────────────────────────────

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) return;

    const utm = buildNormalizedUtmUrl({
      landingPath: campaignForm.landing_path,
      source: campaignForm.platform,
      medium: campaignForm.platform === 'google' ? 'cpc_search' : 'paid_social',
      campaign: campaignForm.utm_campaign || campaignForm.name,
    });

    const newCamp: CrmAdCampaign = {
      id: `CMP-${campaignForm.company_id}-${Date.now().toString().slice(-4)}`,
      company_id: campaignForm.company_id,
      campaign_code: `${campaignForm.platform.toUpperCase()}_${campaignForm.company_id}_${Date.now().toString().slice(-4)}`,
      name: campaignForm.name.trim(),
      platform: campaignForm.platform,
      objective: 'conversions',
      service_type: campaignForm.service_type,
      budget_bucket: campaignForm.budget_bucket,
      budget_sar: Number(campaignForm.budget_sar) || 5000,
      spent_sar: 0,
      target_cpa_sar: Number(campaignForm.target_cpa_sar) || 500,
      impressions: 0,
      clicks: 0,
      leads_count: 0,
      qualified_leads_count: 0,
      reserved_count: 0,
      won_contracts_count: 0,
      revenue_sar: 0,
      utm_source: utm.utmSource,
      utm_medium: utm.utmMedium,
      utm_campaign: utm.utmCampaign,
      landing_path: campaignForm.landing_path,
      owner_email: currentUser?.email || 'm.alkhader.marketing@kas.sa',
      owner_name: currentUser?.full_name || 'معاذ عبدالكريم علي الخضر',
      status: 'نشطة',
      start_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };

    pushUndo();
    const next = [newCamp, ...campaigns];
    setCampaigns(next);
    await persistCrmTable('crm_marketing_campaigns', next, [newCamp]);
    setShowCampaignModal(false);
    addNotification({
      title: 'إطلاق حملة إعلانية جديدة',
      message: `تم تسجيل الحملة (${newCamp.name}) مع رابط تتبع UTM قياسي بنجاح.`,
      type: 'success',
    });
  };

  const handleApplyBoundedBudgetStep = async (camp: CrmAdCampaign, recommendedSar: number) => {
    if (!signalReadiness.safeToScaleBudgets) {
      addNotification({
        title: 'تنبيه جاهزية القياس',
        message: 'لا يمكن تعديل الميزانيات تلقائياً لأن مؤشر جودة القياس أقل من 55.',
        type: 'warning',
      });
      return;
    }
    pushUndo();
    const next = campaigns.map((c) =>
      c.id === camp.id ? { ...c, budget_sar: recommendedSar } : c
    );
    setCampaigns(next);
    await persistCrmTable('crm_marketing_campaigns', next, [{ ...camp, budget_sar: recommendedSar }]);
    addNotification({
      title: 'تحديث الميزانية بحدود آمنة (±20%)',
      message: `تم تعديل ميزانية (${camp.name}) إلى ${formatSaudiRiyal(recommendedSar)} وفق توصية محلل الأداء.`,
      type: 'success',
    });
  };

  const handleRequestFinanceAdBudget = async (camp: CrmAdCampaign) => {
    const reqNo = `FIN-MKT-${Date.now().toString().slice(-5)}`;
    const finReq = {
      id: reqNo,
      request_no: reqNo,
      company_id: camp.company_id,
      type: 'تمويل حملة إعلانية تسويقية',
      beneficiary: `منصة ${AD_PLATFORM_LABELS[camp.platform]} — بوابة التسويق`,
      amount: camp.budget_sar,
      account_code: '5206',
      cost_center: 'مركز تكلفة التسويق والاستقطاب الرقمي',
      requested_by: currentUser?.full_name || 'معاذ عبدالكريم علي الخضر',
      status: 'بانتظار اعتماد الإدارة العليا والمالية',
      notes: `تمويل الحملة الإعلانية (${camp.name}) بكود ${camp.campaign_code}`,
      created_at: new Date().toISOString(),
    };

    await realErpDataStore.addRecord('financial_requests', finReq);
    const next = campaigns.map((c) =>
      c.id === camp.id ? { ...c, finance_request_id: reqNo } : c
    );
    setCampaigns(next);
    await realErpDataStore.saveRecords('crm_marketing_campaigns', next);

    addNotification({
      title: 'رفع طلب صرف ميزانية إعلانية',
      message: `تم رفع أمر الصرف #${reqNo} بمبلغ ${formatSaudiRiyal(camp.budget_sar)} إلى الإدارة التنفيذية والمالية.`,
      type: 'success',
    });
  };

  const handleCopyUtmLink = (camp: CrmAdCampaign) => {
    const built = buildNormalizedUtmUrl({
      landingPath: camp.landing_path || '/select-workers',
      source: camp.utm_source,
      medium: camp.utm_medium,
      campaign: camp.utm_campaign,
      content: camp.utm_content,
    });
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(built.fullUrl);
    }
    addNotification({
      title: 'نسخ رابط UTM القياسي',
      message: `تم نسخ الرابط: ${built.fullUrl}`,
      type: 'info',
    });
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.full_name.trim() || !leadForm.phone.trim()) return;

    const assigned = resolveAutoAssignedSalesRep(leadForm.company_id, leads.length);
    const matchedCamp = campaigns.find(
      (c) => c.company_id === assigned.resolvedCompanyId && c.platform === leadForm.source_platform
    );

    const newLead: CrmLead = {
      id: `LED-${Date.now().toString().slice(-5)}`,
      company_id: assigned.resolvedCompanyId,
      lead_no: `LED-${assigned.resolvedCompanyId}-${106 + leads.length}`,
      full_name: leadForm.full_name.trim(),
      phone: leadForm.phone.trim(),
      city: leadForm.city,
      client_type: leadForm.client_type,
      service_interest: leadForm.service_interest,
      preferred_nationality: leadForm.preferred_nationality,
      source_platform: leadForm.source_platform,
      campaign_id: matchedCamp?.id,
      utm_campaign: matchedCamp?.utm_campaign,
      stage: 'new',
      probability_pct: 10,
      estimated_value_sar: Number(leadForm.estimated_value_sar) || 16500,
      assigned_to_email: assigned.email,
      assigned_to_name: assigned.nameAr,
      captured_by_email: currentUser?.email || 'm.alkhader.marketing@kas.sa',
      sla_due_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      last_activity_at: new Date().toISOString(),
      retargeting_bucket: 'hot_1_7d',
      marketing_consent: leadForm.marketing_consent,
      notes: leadForm.notes,
      created_at: new Date().toISOString(),
    };

    pushUndo();
    const next = [newLead, ...leads];
    setLeads(next);
    await persistCrmTable('crm_leads', next, [newLead]);
    setShowLeadModal(false);
    setLeadForm({ ...leadForm, full_name: '', phone: '', notes: '' });

    addNotification({
      title: 'توجيه العميل المحتمل وبدء مؤقت 15 دقيقة',
      message: `تم إسناد الفرصة (${newLead.full_name}) آلياً إلى (${assigned.nameAr}) بشركة ${assigned.resolvedCompanyId}.`,
      type: 'success',
    });
  };

  const handleAdvanceLeadStage = async (lead: CrmLead, nextStage: LeadStage, lostReason?: string) => {
    const meta = LEAD_STAGE_META[nextStage];
    const nowIso = new Date().toISOString();
    const updatedLead: CrmLead = {
      ...lead,
      stage: nextStage,
      probability_pct: meta.probabilityPct,
      first_response_at: lead.first_response_at || nowIso,
      last_activity_at: nowIso,
      lost_reason: nextStage === 'lost' ? lostReason || LOST_REASONS_CATALOG[0] : undefined,
      retargeting_bucket: nextStage === 'won' ? 'converted_excluded' : lead.retargeting_bucket,
    };

    // If Won, automatically create a linked Client record in `clients` with accounting code 11020x
    if (nextStage === 'won' && !lead.converted_client_id) {
      const clientCode = `CLI-MKT-${Date.now().toString().slice(-4)}`;
      updatedLead.converted_client_id = clientCode;
      await realErpDataStore.addRecord('clients', {
        id: clientCode,
        company_id: lead.company_id,
        client_no: clientCode,
        name: lead.full_name,
        phone: lead.phone,
        national_id: '',
        account_code: `1102${Math.floor(10 + Math.random() * 89)}`,
        client_activity: `عميل متعاقد (${lead.service_interest}) — مصدر: ${lead.source_platform}`,
        last_activity: 'تحويل تلقائي من خط أنابيب التسويق والمبيعات',
        added_by: currentUser?.full_name || 'معاذ عبدالكريم علي الخضر',
        branch: `فرع ${lead.city}`,
        type: lead.client_type,
        status: 'نشط',
      });
    }

    pushUndo();
    const nextLeads = leads.map((l) => (l.id === lead.id ? updatedLead : l));
    setLeads(nextLeads);
    await persistCrmTable('crm_leads', nextLeads, [updatedLead]);

    addNotification({
      title: nextStage === 'won' ? 'إغلاق العقد بنجاح وفتح حساب عميل' : 'تحديث مرحلة الفرصة البيعية',
      message: `انتقلت الفرصة (${lead.full_name}) إلى مرحلة (${meta.labelAr} — ${meta.probabilityPct}%).`,
      type: nextStage === 'lost' ? 'warning' : 'success',
    });
  };

  const handleCreateStudioTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioForm.title.trim()) return;

    const specCheck = validatePlatformCreativeSpec({
      platform: studioForm.target_platform,
      headline: studioForm.headline_text,
      primaryText: studioForm.primary_copy_text,
    });

    if (!specCheck.valid) {
      addNotification({
        title: 'تجاوز حدود أحرف المنصة الإعلانية',
        message: specCheck.issuesAr[0],
        type: 'warning',
      });
      return;
    }

    const newTask: CrmContentTask = {
      id: `CNT-${Date.now().toString().slice(-4)}`,
      company_id: studioForm.company_id,
      task_code: `STD-${studioForm.company_id}-${contentTasks.length + 1}`,
      title: studioForm.title.trim(),
      content_type: studioForm.content_type,
      creative_angle: studioForm.creative_angle,
      target_platform: studioForm.target_platform,
      headline_text: studioForm.headline_text.trim(),
      primary_copy_text: studioForm.primary_copy_text.trim(),
      video_script_hook: studioForm.video_script_hook,
      char_spec_valid: true,
      iteration_round: 1,
      designer_email: 'nagati.marketing@kas.sa',
      videographer_email: 'm.almontaser.marketing@kas.sa',
      marketer_email: currentUser?.email || 'm.alkhader.marketing@kas.sa',
      approval_status: 'in_design',
      scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    pushUndo();
    const next = [newTask, ...contentTasks];
    setContentTasks(next);
    await persistCrmTable('crm_content_calendar', next, [newTask]);
    setShowStudioModal(false);
    addNotification({
      title: 'إدراج مهمة إبداعية في استوديو التسويق',
      message: `تم إرسال البريف (${newTask.title}) لفريق التصميم والمونتاج بعد اجتياز فحص حدود الأحرف.`,
      type: 'success',
    });
  };

  const handleAdvanceStudioStatus = async (task: CrmContentTask, nextStatus: ContentApprovalStatus) => {
    const updated: CrmContentTask = {
      ...task,
      approval_status: nextStatus,
      approved_by_email:
        nextStatus === 'approved' || nextStatus === 'published'
          ? currentUser?.email || 'm.alkhader.marketing@kas.sa'
          : task.approved_by_email,
    };
    pushUndo();
    const next = contentTasks.map((t) => (t.id === task.id ? updated : t));
    setContentTasks(next);
    await persistCrmTable('crm_content_calendar', next, [updated]);
    addNotification({
      title: 'تحديث حالة المحتوى الإعلاني',
      message: `تم نقل (${task.title}) إلى حالة (${nextStatus === 'approved' ? 'معتمد من معاذ' : nextStatus === 'published' ? 'منشور وممول' : 'قيد المراجعة'}).`,
      type: 'success',
    });
  };

  const handleGeneratePdplCvCard = async () => {
    const card = buildPdplSafeCvAdCard({
      ...cvCardForm,
      company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
    });

    const newTask: CrmContentTask = {
      id: `CNT-CV-${Date.now().toString().slice(-4)}`,
      company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
      task_code: `CV-AD-${card.reservationCode}`,
      title: `بطاقة سيرة إعلانية محمية PDPL — ${card.displayFirstNameOnly}`,
      content_type: 'cv_card',
      creative_angle: 'urgency',
      target_platform: 'snapchat',
      headline_text: card.adHeadline,
      primary_copy_text: card.adPrimaryCopy,
      cv_reference_code: card.reservationCode,
      char_spec_valid: true,
      iteration_round: 1,
      winning_pattern_note: `رابط الحجز المربوط بـ UTM: ${card.bookingUtmUrl}`,
      designer_email: 'nagati.marketing@kas.sa',
      videographer_email: 'm.almontaser.marketing@kas.sa',
      marketer_email: currentUser?.email || 'm.alkhader.marketing@kas.sa',
      approval_status: 'review_moaz',
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    pushUndo();
    const next = [newTask, ...contentTasks];
    setContentTasks(next);
    await persistCrmTable('crm_content_calendar', next, [newTask]);
    addNotification({
      title: 'توليد بطاقة سيرة ذاتية متوافقة مع PDPL',
      message: `تم إخفاء الاسم الكامل ورقم الجواز وتوليد البطاقة الإعلانية للكود #${card.reservationCode}.`,
      type: 'success',
    });
  };

  const handleDownloadCreativeCsv = () => {
    const csvContent = exportAdVariationsCsv(scopedContentTasks);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kas_ad_creatives_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification({
      title: 'تصدير ملف الإعلانات بالجملة (CSV)',
      message: `تم تصدير (${scopedContentTasks.length}) إعلانات جاهزة للرفع على منصات الإعلانات.`,
      type: 'success',
    });
  };

  const handleCreatePromoReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code.trim() || !promoForm.title_ar.trim()) return;

    if (
      promoForm.program_kind !== 'promo_coupon' &&
      Number(promoForm.referrer_reward_sar) > referralEcon.maxEconomicalRewardSar &&
      referralEcon.maxEconomicalRewardSar > 0
    ) {
      addNotification({
        title: 'تجاوز السقف الاقتصادي للمكافأة',
        message: `المكافأة المدخلة تتجاوز السقف المحسوب (${formatSaudiRiyal(referralEcon.maxEconomicalRewardSar)}) وفق هامش الربح.`,
        type: 'warning',
      });
      return;
    }

    const newItem: CrmPromoReferral = {
      id: `PRM-${Date.now().toString().slice(-4)}`,
      company_id: promoForm.company_id,
      program_kind: promoForm.program_kind,
      code: promoForm.code.trim().toUpperCase(),
      title_ar: promoForm.title_ar.trim(),
      referrer_name: promoForm.referrer_name || undefined,
      referrer_phone: promoForm.referrer_phone || undefined,
      discount_type: 'fixed_sar',
      client_discount_value: Number(promoForm.client_discount_value) || 300,
      referrer_reward_sar:
        promoForm.program_kind === 'promo_coupon' ? 0 : Number(promoForm.referrer_reward_sar) || 300,
      applicable_service: promoForm.applicable_service,
      invitations_sent: 0,
      conversions_count: 0,
      max_uses: 100,
      payout_status: 'معلق لحين تحصيل العقد',
      valid_until: '2027-06-30',
      is_active: true,
      created_by_email: currentUser?.email || 'm.alkhader.marketing@kas.sa',
      created_at: new Date().toISOString(),
    };

    pushUndo();
    const next = [newItem, ...promoReferrals];
    setPromoReferrals(next);
    await persistCrmTable('crm_promo_referrals', next, [newItem]);
    setShowPromoModal(false);
    addNotification({
      title: 'تفعيل كود العرض / الإحالة',
      message: `تم تفعيل الكود (${newItem.code}) بنجاح.`,
      type: 'success',
    });
  };

  const handleRunPdplBroadcast = async () => {
    const candidates = pipelineForecast.scopedLeads
      .filter((l) => l.retargeting_bucket === retargetBucketFilter && l.stage !== 'won')
      .map((l) => ({
        name: l.full_name,
        phoneOrEmail: l.phone,
        marketingConsent: l.marketing_consent,
      }));

    const prepared = preparePdplCompliantBroadcast({
      recipients: candidates,
      bodyTemplate: broadcastText,
      channel: 'whatsapp',
    });

    setBroadcastPreviewResult({
      approvedCount: prepared.approvedPayloads.length,
      blockedCount: prepared.blockedByPdplCount,
      sampleText: prepared.approvedPayloads[0]?.formattedMessage || 'لا يوجد مستلمون موافقون في هذه الشريحة.',
    });

    for (const msg of prepared.approvedPayloads) {
      await realErpDataStore.addRecord('sent_messages', {
        id: `MSG-MKT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        company_id: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as string,
        recipient_name: msg.name,
        phone: msg.recipient,
        channel: 'WhatsApp',
        template: `إعادة استهداف (${retargetBucketFilter}) — متوافق PDPL`,
        content: msg.formattedMessage,
        status: 'تم التسليم',
        cost_sar: 0.15,
        sent_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      });
    }

    addNotification({
      title: 'تنفيذ حملة إعادة الاستهداف المحمية (PDPL Art. 25)',
      message: `تم إرسال (${prepared.approvedPayloads.length}) رسالة نظامية، وحجب (${prepared.blockedByPdplCount}) لعدم وجود موافقة تسويقية.`,
      type: 'success',
    });
  };

  const fraudCheckLive = useMemo(
    () =>
      validateReferralAntiFraud({
        referrerPhone: fraudTestForm.referrerPhone,
        referredPhone: fraudTestForm.referredPhone,
        contractPaidInFull: fraudTestForm.contractPaidInFull,
      }),
    [fraudTestForm]
  );

  const handleSyncAllToCloud = async () => {
    setCloudSyncing(true);
    try {
      await Promise.all([
        persistCrmTable('crm_marketing_campaigns', campaigns),
        persistCrmTable('crm_leads', leads),
        persistCrmTable('crm_content_calendar', contentTasks),
        persistCrmTable('crm_promo_referrals', promoReferrals),
      ]);
      await reloadData();
      addNotification({
        title: 'اكتملت المزامنة السحابية لقسم التسويق',
        message: `تمت مزامنة ${campaigns.length} حملة • ${leads.length} فرصة • ${contentTasks.length} مهمة • ${promoReferrals.length} عرض مع Supabase.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تنبيه المزامنة السحابية',
        message: err?.message || 'تم الحفظ محلياً وستُزامَن البيانات عند توفر الجلسة السحابية.',
        type: 'warning',
      });
    } finally {
      setCloudSyncing(false);
    }
  };

  const activeExportMeta = useMemo(() => {
    if (activeTab === 'group-sites') {
      const sites =
        activeCompanyId === 'all'
          ? groupSites
          : groupSites.filter((s) => s.company_id.toUpperCase() === activeCompanyId.toUpperCase());
      return {
        sectionKey: 'crm_group_websites',
        title: `تقرير مواقع المجموعة والمنصة التحليلية (SEO & Analytics) - ${activeCompanyId}`,
        rows: sites.map((s) => ({
          الشركة: s.company_id,
          'اسم الموقع': s.name_ar,
          النطاق: s.domain,
          'مفتاح الموقع': s.site_key,
          'درجة SEO': s.last_seo_score ?? '—',
          'زمن الاستجابة ms': s.last_ttfb_ms ?? '—',
          الزيارات: s.pageviews_count,
          'التحويلات للـ CRM': s.conversions_count,
          'سقف AI الشهري (⃁)': s.monthly_ai_cap_sar,
          الحالة: s.status,
        })),
      };
    }
    if (activeTab === 'pipeline') {
      return {
        sectionKey: 'crm_leads_pipeline',
        title: `تقرير خط أنابيب المبيعات والفرص البيعية (CRM Pipeline) - ${activeCompanyId}`,
        rows: pipelineForecast.scopedLeads.map((l) => ({
          'رقم الفرصة': l.lead_no,
          العميل: l.full_name,
          الشركة: l.company_id,
          الخدمة: l.service_interest,
          المنصة: (AD_PLATFORM_LABELS as Record<string, string>)[l.source_platform] || l.source_platform,
          المرحلة: LEAD_STAGE_META[l.stage]?.labelAr || l.stage,
          'الاحتمالية %': `${l.probability_pct}%`,
          'القيمة (⃁)': l.estimated_value_sar,
          المسؤول: l.assigned_to_name,
        })),
      };
    }
    if (activeTab === 'studio') {
      return {
        sectionKey: 'crm_content_studio',
        title: `تقرير استوديو المحتوى الإعلاني (8 زوايا) - ${activeCompanyId}`,
        rows: scopedContentTasks.map((t) => ({
          الكود: t.task_code,
          العنوان: t.title,
          الشركة: t.company_id,
          المنصة: AD_PLATFORM_LABELS[t.target_platform] || t.target_platform,
          الزاوية: CREATIVE_ANGLES_META[t.creative_angle]?.labelAr || t.creative_angle,
          الحالة: t.approval_status,
          المسوق: t.marketer_email,
        })),
      };
    }
    if (activeTab === 'referrals') {
      return {
        sectionKey: 'crm_promo_referrals',
        title: `تقرير العروض الترويجية وبرامج الإحالة - ${activeCompanyId}`,
        rows: scopedPromos.map((p) => ({
          الكود: p.code,
          العنوان: p.title_ar,
          الشركة: p.company_id,
          الخدمة: p.applicable_service,
          'الخصم': p.client_discount_value,
          'مكافأة المحيل (⃁)': p.referrer_reward_sar,
          'التحويلات': p.conversions_count,
          الحالة: p.is_active ? p.payout_status : 'متوقف',
        })),
      };
    }
    return {
      sectionKey: 'marketing_campaigns',
      title: `تقرير الحملات الإعلانية والعائد التسويقي ROAS - ${activeCompanyId}`,
      rows: campaignPortfolio.items.map((i) => ({
        'كود الحملة': i.campaign.campaign_code,
        'اسم الحملة': i.campaign.name,
        الشركة: i.campaign.company_id,
        المنصة: AD_PLATFORM_LABELS[i.campaign.platform] || i.campaign.platform,
        'الميزانية (⃁)': i.campaign.budget_sar,
        'الإنفاق (⃁)': i.campaign.spent_sar,
        'الإيرادات (⃁)': i.campaign.revenue_sar,
        'CTR %': `${i.ctrPct}%`,
        'CPL (⃁)': i.cplSar,
        'CPA (⃁)': i.cpaSar,
        'ROAS': `${i.roas}x`,
        التوصية: i.verdict,
      })),
    };
  }, [activeTab, activeCompanyId, campaignPortfolio.items, pipelineForecast.scopedLeads, scopedContentTasks, scopedPromos, groupSites]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Cinematic Ink Header */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '24px',
          padding: '28px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <BusinessIllustration type="crm-customer" size="sm" showBackground={false} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#141414]">
                CRM, PAID ADS & CREATIVE COMMAND
              </span>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#0066ff] text-white">
                مؤشر جودة القياس: {signalReadiness.score}/100 ({signalReadiness.verdict})
              </span>
            </div>
            <h1
              className="display-sm"
              style={{
                fontSize: '24px',
                fontWeight: 650,
                color: '#ffffff',
                margin: 0,
                letterSpacing: '0',
              }}
            >
              منظومة إدارة العملاء والتسويق والإعلانات الموحدة.
            </h1>
            <p className="text-xs text-[#adadad] mt-1 mb-0">
              بوابة أ. معاذ عبدالكريم الخضر وفريق التسويق — إدارة حملات سناب شات وتيك توك وجوجل، خط أنابيب المبيعات المرجّح، واستوديو المحتوى المتوافق مع نظام PDPL السعودي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCampaignModal(true)}
            className="px-4 py-2 rounded-full bg-white text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#f3f3f3] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>حملة إعلانية جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLeadModal(true)}
            className="px-4 py-2 rounded-full border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/10 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>+ فرصة بيعية (Lead)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStudioModal(true)}
            className="px-4 py-2 rounded-full border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ مهمة استوديو إعلاني</span>
          </button>

          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={() => void handleUndo()}
            title="تراجع عن آخر تعديل (Ctrl+Z)"
            className="px-3.5 py-2 rounded-full border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>تراجع ({undoStack.length})</span>
          </button>

          <button
            type="button"
            disabled={redoStack.length === 0}
            onClick={() => void handleRedo()}
            title="إعادة (Ctrl+Y)"
            className="px-3.5 py-2 rounded-full border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>إعادة ({redoStack.length})</span>
          </button>

          <button
            type="button"
            disabled={cloudSyncing}
            onClick={() => void handleSyncAllToCloud()}
            className="px-3.5 py-2 rounded-full border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncing ? 'animate-spin' : ''}`} />
            <span>{cloudSyncing ? 'جارٍ المزامنة...' : 'مزامنة سحابية'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={activeExportMeta.rows.length === 0}
            className="px-3.5 py-2 rounded-full border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة</span>
          </button>

          <ExportDropdown
            sectionKey={activeExportMeta.sectionKey}
            data={activeExportMeta.rows}
            customTitle={activeExportMeta.title}
            variant="outline-dark"
            buttonLabel="تصدير تقارير التسويق"
          />
        </div>
      </div>

      {/* Top 4 Executive KPI Cards — clickable for full drill-down details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setKpiDetail('roas')}
          className="text-right p-6 rounded-[24px] bg-[#141414] text-white cursor-pointer hover:bg-[#262626] transition-colors focus:outline-none focus:ring-2 focus:ring-[#707070]"
        >
          <span className="text-xs text-[#adadad] font-semibold">العائد الإعلاني المجمّع (Blended ROAS)</span>
          <div className="text-3xl font-light text-white mt-2 font-mono">{campaignPortfolio.blendedRoas}x</div>
          <div className="text-[11px] text-[#adadad] mt-2">
            إيرادات منسوبة: {formatSaudiRiyal(campaignPortfolio.totalRevenueSar)} مقابل إنفاق{' '}
            {formatSaudiRiyal(campaignPortfolio.totalSpentSar)}
          </div>
          <div className="text-[10px] font-bold text-white mt-2 underline">عرض التفاصيل ←</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiDetail('pipeline')}
          className="text-right p-6 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] hover:border-[#141414] text-[#141414] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#141414]"
        >
          <span className="text-xs text-[#707070] font-semibold">التوقع البيعي المرجّح (Weighted Pipeline)</span>
          <div className="text-2xl font-semibold text-[#141414] mt-2 font-mono">
            {formatSaudiRiyal(pipelineForecast.weightedForecastSar)}
          </div>
          <div className="text-[11px] text-[#707070] mt-2">
            إجمالي الفرص: {pipelineForecast.scopedLeads.length} • راكدة: {pipelineForecast.rottingLeadsCount}
          </div>
          <div className="text-[10px] font-bold text-[#141414] mt-2 underline">عرض التفاصيل ←</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiDetail('cpl_cpa')}
          className="text-right p-6 rounded-[24px] bg-white border border-[#e0e0e0] hover:border-[#141414] text-[#141414] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#141414]"
        >
          <span className="text-xs text-[#707070] font-semibold">متوسط تكلفة الليد والتعاقد (CPL / CPA)</span>
          <div className="text-xl font-semibold text-[#141414] mt-2 font-mono">
            {formatSaudiRiyal(campaignPortfolio.blendedCplSar)} / {formatSaudiRiyal(campaignPortfolio.blendedCpaSar)}
          </div>
          <div className="text-[11px] text-[#707070] mt-2">
            توزيع الميزانية: {campaignPortfolio.provenSharePct}% رابحة • {campaignPortfolio.testingSharePct}% اختبار
          </div>
          <div className="text-[10px] font-bold text-[#141414] mt-2 underline">عرض التفاصيل ←</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiDetail('studio_referrals')}
          className="text-right p-6 rounded-[24px] bg-white border border-[#e0e0e0] hover:border-[#141414] text-[#141414] cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#141414]"
        >
          <span className="text-xs text-[#707070] font-semibold">استوديو المحتوى والإحالات النشطة</span>
          <div className="text-2xl font-semibold text-[#141414] mt-2 font-mono">
            {scopedContentTasks.length} مهام • {scopedPromos.length} عروض
          </div>
          <div className="text-[11px] text-[#707070] mt-2">
            معامل الانتشار K-Factor: {referralEcon.viralKFactor} • بوابة PDPL مفعلة
          </div>
          <div className="text-[10px] font-bold text-[#141414] mt-2 underline">عرض التفاصيل ←</div>
        </button>
      </div>

      {/* 5 Skill-Driven Sub-Navigation Pills */}
      <div className="flex items-center gap-2 flex-wrap p-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] w-fit">
        {[
          { id: 'overview' as const, label: '١. قيادة AARRR وجودة القياس والميزانية', icon: Calculator },
          { id: 'campaigns' as const, label: `٢. محلل الحملات الممولة والـ ROAS (${campaignPortfolio.items.length})`, icon: Megaphone },
          { id: 'pipeline' as const, label: `٣. خط أنابيب المبيعات Kanban (${pipelineForecast.scopedLeads.length})`, icon: Target },
          { id: 'studio' as const, label: `٤. استوديو المحتوى والـ 8 زوايا (${scopedContentTasks.length})`, icon: Sparkles },
          { id: 'referrals' as const, label: `٥. العروض وإعادة الاستهداف والإحالات (${scopedPromos.length})`, icon: Award },
          { id: 'ai-studio' as const, label: '٦. الذكاء الاصطناعي وتوليد المحتوى والتحليل', icon: Brain },
          { id: 'group-sites' as const, label: `٧. مواقع المجموعة والمنصة التحليلية (${groupSites.length})`, icon: Globe },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                active ? 'bg-[#141414] text-white' : 'bg-transparent text-[#707070] hover:text-[#141414]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: AARRR OVERVIEW + SIGNAL READINESS + SCIENTIFIC BUDGET + A/B TEST
         ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 5-Stage AARRR Funnel Row */}
          <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0]">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-base font-bold text-[#141414] m-0">
                قمع النمو الكامل للشركات (AARRR Framework — marketing-plan)
              </h2>
              <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">
                تحديث لحظي من الحملات والعقود
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                {
                  stage: '1. الاستقطاب (Acquisition)',
                  metric: `${campaignPortfolio.items.reduce((s, i) => s + i.campaign.clicks, 0).toLocaleString()} نقرة إعلانية`,
                  sub: 'Snapchat • TikTok • Google • Meta',
                },
                {
                  stage: '2. التفعيل (Activation)',
                  metric: `${campaignPortfolio.totalLeads} عميل محتمل موثق`,
                  sub: 'مؤقت استجابة أولى <= 15 دقيقة',
                },
                {
                  stage: '3. الإيرادات (Revenue)',
                  metric: `${campaignPortfolio.totalWonContracts} عقد مغلق`,
                  sub: formatSaudiRiyal(campaignPortfolio.totalRevenueSar),
                },
                {
                  stage: '4. الاحتفاظ (Retention)',
                  metric: 'تقييم 30 / 90 يوماً',
                  sub: 'تجديد التأجير ومتابعة ضمان مساند',
                },
                {
                  stage: '5. الإحالة (Referral)',
                  metric: `K = ${referralEcon.viralKFactor}`,
                  sub: `سقف مكافأة اقتصادي ${formatSaudiRiyal(referralEcon.maxEconomicalRewardSar)}`,
                },
              ].map((step) => (
                <div key={step.stage} className="p-4 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] font-bold text-[#707070]">{step.stage}</div>
                  <div className="text-sm font-bold text-[#141414] mt-1.5">{step.metric}</div>
                  <div className="text-[11px] text-[#707070] mt-1">{step.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Signal Quality Index (analytics-tracking) */}
            <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  مؤشر جاهزية القياس (Signal Readiness)
                </h3>
                <span className="px-3 py-1 rounded-full bg-[#141414] text-white text-xs font-mono font-bold">
                  {signalReadiness.score}/100
                </span>
              </div>
              <p className="text-xs text-[#707070] m-0">{signalReadiness.verdictAr}</p>

              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'مواءمة القرار وسقف CPA', val: signalReadiness.breakdown.decisionAlignment25, max: 25 },
                  { label: 'وضوح نموذج الأحداث القمعية', val: signalReadiness.breakdown.eventModelClarity20, max: 20 },
                  { label: 'سلامة البيانات ومنع التكرار', val: signalReadiness.breakdown.dataAccuracy20, max: 20 },
                  { label: 'جودة تعريف التحويل الفعلي', val: signalReadiness.breakdown.conversionQuality15, max: 15 },
                  { label: 'انضباط روابط UTM القياسية', val: signalReadiness.breakdown.utmDiscipline10, max: 10 },
                  { label: 'حوكمة الخصوصية PDPL Art. 25', val: signalReadiness.breakdown.pdplGovernance10, max: 10 },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="flex justify-between font-semibold mb-1">
                      <span>{b.label}</span>
                      <span className="font-mono">
                        {b.val}/{b.max}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f3f3f3] overflow-hidden">
                      <div
                        className="h-full bg-[#141414] rounded-full"
                        style={{ width: `${Math.round((b.val / b.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scientific Goal-Based Budget Calculator (marketing-plan + paid-ads) */}
            <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
              <h3 className="text-sm font-bold text-[#141414] m-0">
                حاسبة الميزانية العلمية (قاعدة 70/30 + 15% تجارب)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">
                    العقود المستهدفة شهرياً
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goalContracts}
                    onChange={(e) => setGoalContracts(Number(e.target.value) || 1)}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">
                    متوسط CPA التاريخي (⃁)
                  </label>
                  <input
                    type="number"
                    min={50}
                    value={goalHistoricalCpa}
                    onChange={(e) => setGoalHistoricalCpa(Number(e.target.value) || 100)}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#f3f3f3] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#707070]">الميزانية الأساسية للعقود:</span>
                  <strong className="font-mono">{formatSaudiRiyal(scientificBudget.baseBudgetSar)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707070]">احتياطي التجارب الإعلانية (+15%):</span>
                  <strong className="font-mono">{formatSaudiRiyal(scientificBudget.experimentalReserve15Sar)}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#e0e0e0] text-sm font-bold">
                  <span>إجمالي الميزانية الموصى بها:</span>
                  <span className="font-mono">{formatSaudiRiyal(scientificBudget.totalRecommendedBudgetSar)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#707070] pt-1">
                  <span>70% حملات رابحة: {formatSaudiRiyal(scientificBudget.proven70AllocationSar)}</span>
                  <span>30% اختبار: {formatSaudiRiyal(scientificBudget.testing30AllocationSar)}</span>
                </div>
              </div>
            </div>

            {/* A/B Statistical Significance Tester (ad-campaign-analyzer) */}
            <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
              <h3 className="text-sm font-bold text-[#141414] m-0">
                فاحص الدلالة الإحصائية لاختبارات الإعلانات (A/B Test)
              </h3>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-[#707070] mb-1">مشاهدات/نقرات (أ)</label>
                  <input
                    type="number"
                    value={abExposuresA}
                    onChange={(e) => setAbExposuresA(Number(e.target.value) || 1)}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-1.5 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#707070] mb-1">تحويلات (أ)</label>
                  <input
                    type="number"
                    value={abConvA}
                    onChange={(e) => setAbConvA(Number(e.target.value) || 0)}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-1.5 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#707070] mb-1">مشاهدات/نقرات (ب)</label>
                  <input
                    type="number"
                    value={abExposuresB}
                    onChange={(e) => setAbExposuresB(Number(e.target.value) || 1)}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-1.5 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#707070] mb-1">تحويلات (ب)</label>
                  <input
                    type="number"
                    value={abConvB}
                    onChange={(e) => setAbConvB(Number(e.target.value) || 0)}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-1.5 px-3 font-mono"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#141414] text-white space-y-1.5 text-xs">
                <div className="flex justify-between font-mono">
                  <span>معدل (أ): {abTestVerdict.rateAPct}%</span>
                  <span>معدل (ب): {abTestVerdict.rateBPct}%</span>
                  <span>الثقة: {abTestVerdict.confidencePct}%</span>
                </div>
                <div className="text-[11px] text-[#adadad] pt-1">{abTestVerdict.verdictAr}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MULTI-CHANNEL AD CAMPAIGN ANALYZER & ROAS
         ===================================================================== */}
      {activeTab === 'campaigns' && (
        <div className="rounded-[24px] bg-white border border-[#e0e0e0] overflow-hidden">
          <div className="p-5 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141414] m-0">
                مدير الحملات الممولة ومحلل كفاءة الإنفاق (Snapchat • TikTok • Meta • Google • X)
              </h2>
              <p className="text-xs text-[#707070] mt-0.5 mb-0">
                احتساب تلقائي لـ Funnel-Adjusted CAC ومؤشر الكفاءة وكشف الهدر الإعلاني وطلبات الصرف للمالية
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCampaignModal(true)}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حملة ممولة</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold">
                <tr>
                  <th className="p-3.5">الحملة والكيان</th>
                  <th className="p-3.5">المنصة</th>
                  <th className="p-3.5">الميزانية / المنصرف</th>
                  <th className="p-3.5">CTR / النقرات</th>
                  <th className="p-3.5">الليدز / العقود</th>
                  <th className="p-3.5">CPA / CAC المعدّل</th>
                  <th className="p-3.5">ROAS / الكفاءة</th>
                  <th className="p-3.5">تشخيص المحلل والتوصية</th>
                  <th className="p-3.5 text-center">إجراءات فورية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {campaignPortfolio.items.map((row) => (
                  <tr key={row.campaign.id} className="hover:bg-[#f3f3f3]/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{row.campaign.name}</div>
                      <div className="text-[11px] text-[#707070] font-mono mt-0.5">
                        [{row.campaign.company_id}] {row.campaign.campaign_code} •{' '}
                        {row.campaign.budget_bucket === 'proven_70' ? '70% رابحة' : '30% اختبار'}
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold">{AD_PLATFORM_LABELS[row.campaign.platform]}</td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold">{formatSaudiRiyal(row.campaign.budget_sar)}</div>
                      <div className="text-[11px] text-[#707070]">
                        صُرف: {formatSaudiRiyal(row.campaign.spent_sar)} ({row.budgetUtilizationPct}%)
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold">{row.ctrPct}%</div>
                      <div className="text-[11px] text-[#707070]">
                        {row.campaign.clicks.toLocaleString()} نقرة
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold">{row.campaign.leads_count} ليد</div>
                      <div className="text-[11px] text-[#707070]">
                        {row.campaign.won_contracts_count} عقود مغلقة
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <div className="font-bold">{formatSaudiRiyal(row.cpaSar)}</div>
                      <div className="text-[11px] text-[#707070]">
                        CAC: {formatSaudiRiyal(row.funnelAdjustedCacSar)}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white font-bold text-[11px]">
                        {row.roas}x
                      </span>
                      <div className="text-[11px] text-[#707070] mt-1">مؤشر: {row.efficiencyIndex}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{row.verdict}</div>
                      {row.outlierFlags.length > 0 && (
                        <div className="text-[11px] text-[#707070] flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-[#141414]" />
                          <span>{row.outlierFlags.join(' • ')}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyUtmLink(row.campaign)}
                          className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1"
                          title="نسخ رابط التتبع UTM"
                        >
                          <Copy className="w-3 h-3" />
                          <span>UTM</span>
                        </button>
                        {row.recommendedSpendSar !== row.campaign.budget_sar && (
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyBoundedBudgetStep(row.campaign, row.recommendedSpendSar)
                            }
                            className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-semibold"
                            title="تطبيق توصية تعديل الميزانية الآمنة"
                          >
                            ضبط ±20%
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRequestFinanceAdBudget(row.campaign)}
                          className="px-2.5 py-1 rounded-full border border-[#e0e0e0] hover:bg-[#f3f3f3] text-[11px] font-semibold inline-flex items-center gap-1"
                          title="رفع طلب صرف ميزانية للإدارة المالية"
                        >
                          <Wallet className="w-3 h-3" />
                          <span>
                            {row.campaign.finance_request_id ? 'تم الطلب' : 'طلب صرف مالي'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: WEIGHTED ODOO-STYLE KANBAN PIPELINE & LOST REASONS
         ===================================================================== */}
      {activeTab === 'pipeline' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold">
                إجمالي الأنبوب: {formatSaudiRiyal(pipelineForecast.totalPipelineValueSar)}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]">
                التوقع المرجّح بالاحتمالات: {formatSaudiRiyal(pipelineForecast.weightedForecastSar)}
              </span>
              {pipelineForecast.rottingLeadsCount > 0 && (
                <span className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] border border-[#141414] text-xs font-bold text-[#141414] inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>صفقات راكدة تحتاج تدخل: {pipelineForecast.rottingLeadsCount}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowLeadModal(true)}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل وتوجيه فرصة بيعية جديدة</span>
            </button>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {(['new', 'contacted', 'qualified', 'reserved', 'payment_pending', 'won'] as LeadStage[]).map(
              (stageKey) => {
                const meta = LEAD_STAGE_META[stageKey];
                const colLeads = pipelineForecast.scopedLeads.filter((l) => l.stage === stageKey);
                const nextStageMap: Partial<Record<LeadStage, LeadStage>> = {
                  new: 'contacted',
                  contacted: 'qualified',
                  qualified: 'reserved',
                  reserved: 'payment_pending',
                  payment_pending: 'won',
                };
                const nextStage = nextStageMap[stageKey];

                return (
                  <div
                    key={stageKey}
                    className="p-3.5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col gap-2.5 min-h-[320px]"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#e0e0e0]">
                      <div>
                        <div className="text-xs font-bold text-[#141414]">{meta.labelAr}</div>
                        <div className="text-[11px] text-[#707070] font-mono">
                          احتمال الفوز: {meta.probabilityPct}%
                        </div>
                      </div>
                      <span className="w-6 h-6 rounded-full bg-[#141414] text-white text-[11px] font-bold flex items-center justify-center font-mono">
                        {colLeads.length}
                      </span>
                    </div>

                    {colLeads.map((lead) => {
                      const diag = evaluateLeadSlaAndRotting(lead);
                      return (
                        <div
                          key={lead.id}
                          className="p-3 rounded-[16px] bg-white border border-[#e0e0e0] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-mono font-bold">
                              {lead.company_id} • {lead.source_platform}
                            </span>
                            {diag.isRotting && (
                              <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                                راكدة ({diag.idleHours}س)
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-[#141414]">{lead.full_name}</div>
                          <div className="text-[11px] text-[#707070]">
                            {lead.service_interest} ({lead.preferred_nationality || lead.city})
                          </div>
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold">{formatSaudiRiyal(lead.estimated_value_sar)}</span>
                            <span className="text-[#707070]">{lead.assigned_to_name.split(' ').slice(0, 2).join(' ')}</span>
                          </div>

                          {stageKey === 'new' && (
                            <div className="text-[10px] font-semibold text-[#141414] bg-[#f3f3f3] px-2 py-1 rounded-xl flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {diag.slaBreached
                                  ? 'تجاوز SLA الـ 15 دقيقة!'
                                  : `مهلة الرد الأول: ${Math.max(1, diag.slaRemainingMinutes)} د`}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#f0f0f0]">
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>واتساب</span>
                            </a>

                            <div className="flex items-center gap-1">
                              {nextStage && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceLeadStage(lead, nextStage)}
                                  className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold inline-flex items-center gap-0.5"
                                >
                                  <span>ترقية</span>
                                  <ArrowLeft className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {stageKey !== 'won' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLosingLead(lead);
                                    setSelectedLostReason(LOST_REASONS_CATALOG[0]);
                                  }}
                                  className="px-2 py-1 rounded-full border border-[#e0e0e0] text-[#707070] hover:text-[#141414] text-[10px]"
                                  title="تسجيل كفرصة خاسرة مع السبب"
                                >
                                  خسارة
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
            )}
          </div>

          {/* Lost Reasons Analytics Bar */}
          {pipelineForecast.lostReasonsBreakdown.length > 0 && (
            <div className="p-4 rounded-[20px] bg-white border border-[#e0e0e0] flex items-center gap-3 flex-wrap text-xs">
              <span className="font-bold text-[#141414]">تحليل أسباب خسارة الفرص (تغذية راجعة للإعلانات):</span>
              {pipelineForecast.lostReasonsBreakdown.map((item) => (
                <span key={item.reason} className="px-3 py-1 rounded-full bg-[#f3f3f3] font-semibold">
                  {item.reason}: {item.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: AD CREATIVE STUDIO, 8 ANGLES, PDPL CV CARD & CSV EXPORT
         ===================================================================== */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          {/* PDPL-Safe CV Ad Card Generator */}
          <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-[#141414] m-0">
                  مولّد بطاقات السير الذاتية الإعلانية المتوافق مع الخصوصية (PDPL-Safe CV Ad Card)
                </h2>
                <p className="text-xs text-[#707070] mt-0.5 mb-0">
                  يحجب تلقائياً رقم الجواز واللقب الكامل ويولّد بطاقة سناب شات وتيك توك جاهزة مع رابط حجز UTM
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCreativeCsv}
                  className="px-4 py-2 rounded-full border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير الإعلانات بالجملة (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStudioModal(true)}
                  className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ بريف إعلاني جديد (8 زوايا)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">كود السيرة</label>
                <input
                  type="text"
                  value={cvCardForm.cv_code}
                  onChange={(e) => setCvCardForm({ ...cvCardForm, cv_code: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">اسم المرشحة (يُقتطع تلقائياً)</label>
                <input
                  type="text"
                  value={cvCardForm.name}
                  onChange={(e) => setCvCardForm({ ...cvCardForm, name: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الجنسية</label>
                <input
                  type="text"
                  value={cvCardForm.nationality}
                  onChange={(e) => setCvCardForm({ ...cvCardForm, nationality: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">المهنة والمهارة</label>
                <input
                  type="text"
                  value={cvCardForm.profession}
                  onChange={(e) => setCvCardForm({ ...cvCardForm, profession: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleGeneratePdplCvCard}
                className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold h-[38px]"
              >
                توليد وإرسال للمصمم
              </button>
            </div>
          </div>

          {/* Content Calendar & Approval Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scopedContentTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-[24px] bg-white border border-[#e0e0e0] flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-mono font-bold">
                      {task.task_code} • {task.company_id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        task.approval_status === 'approved' || task.approval_status === 'published'
                          ? 'bg-[#141414] text-white'
                          : 'bg-[#f3f3f3] text-[#141414]'
                      }`}
                    >
                      {task.approval_status === 'brief'
                        ? 'بريف جديد'
                        : task.approval_status === 'in_design'
                        ? 'قيد التصميم / المونتاج'
                        : task.approval_status === 'review_moaz'
                        ? 'بانتظار اعتماد معاذ'
                        : task.approval_status === 'approved'
                        ? 'معتمد للنشر'
                        : 'منشور وممول'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#141414] m-0">{task.title}</h3>
                  <div className="text-[11px] text-[#707070]">
                    المنصة: <strong>{AD_PLATFORM_LABELS[task.target_platform]}</strong> • الزاوية:{' '}
                    <strong>{CREATIVE_ANGLES_META[task.creative_angle]?.labelAr}</strong>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#f3f3f3] space-y-1 text-xs">
                    <div className="font-bold text-[#141414]">{task.headline_text}</div>
                    <div className="text-[#707070]">{task.primary_copy_text}</div>
                  </div>

                  {task.winning_pattern_note && (
                    <div className="text-[11px] text-[#707070] bg-[#f3f3f3] px-3 py-1.5 rounded-xl">
                      ملاحظة الأداء (جولة #{task.iteration_round}): {task.winning_pattern_note}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#e0e0e0] gap-2 flex-wrap">
                  <span className="text-[11px] text-[#707070]">
                    مصمم: محمد جمال • فيديو: محمد المنتصر
                  </span>
                  <div className="flex items-center gap-1.5">
                    {task.approval_status !== 'approved' && task.approval_status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStudioStatus(task, 'approved')}
                        className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                      >
                        اعتماد معاذ
                      </button>
                    )}
                    {task.approval_status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStudioStatus(task, 'published')}
                        className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                      >
                        توثيق النشر
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: PROMOS, PDPL RETARGETING WINDOWS & DOUBLE-SIDED REFERRALS
         ===================================================================== */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PDPL Art. 25 Compliant Retargeting Broadcast Engine */}
            <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  نوافذ إعادة الاستهداف عبر واتساب (بوابة PDPL Art. 25 الإلزامية)
                </h3>
                <ShieldCheck className="w-4 h-4 text-[#141414]" />
              </div>

              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'hot_1_7d' as const, label: 'ساخنة Hot (1 - 7 أيام)' },
                  { id: 'warm_7_30d' as const, label: 'دافئة Warm (7 - 30 يوماً)' },
                  { id: 'cold_30_90d' as const, label: 'باردة Cold (30 - 90 يوماً)' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setRetargetBucketFilter(b.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      retargetBucketFilter === b.id
                        ? 'bg-[#141414] text-white'
                        : 'bg-[#f3f3f3] text-[#707070]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                className="w-full bg-[#f0f0f0] rounded-2xl p-3 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />

              <button
                type="button"
                onClick={handleRunPdplBroadcast}
                className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>فحص موافقات PDPL وإرسال الدفعة</span>
              </button>

              {broadcastPreviewResult && (
                <div className="p-3.5 rounded-2xl bg-[#f3f3f3] space-y-1.5 text-xs">
                  <div className="font-bold text-[#141414]">
                    تم اعتماد ({broadcastPreviewResult.approvedCount}) مستلم • وحجب ({broadcastPreviewResult.blockedCount}) لإلغاء الاشتراك
                  </div>
                  <pre className="text-[10px] whitespace-pre-wrap text-[#707070] font-sans m-0">
                    {broadcastPreviewResult.sampleText}
                  </pre>
                </div>
              )}
            </div>

            {/* Referral Anti-Fraud & Economic Cap Guard */}
            <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  ضابط مكافحة احتيال الإحالات والسقف الاقتصادي (referral-program)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPromoModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ كود خصم / مسوق بالعمولة</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-2xl bg-[#f3f3f3]">
                  <div className="text-[11px] text-[#707070]">السقف الاقتصادي للمكافأة</div>
                  <div className="font-bold font-mono mt-1">
                    {formatSaudiRiyal(referralEcon.maxEconomicalRewardSar)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#f3f3f3]">
                  <div className="text-[11px] text-[#707070]">معدل تحويل الإحالات</div>
                  <div className="font-bold font-mono mt-1">{referralEcon.conversionRatePct}%</div>
                </div>
                <div className="p-3 rounded-2xl bg-[#f3f3f3]">
                  <div className="text-[11px] text-[#707070]">العائد ROI للإحالات</div>
                  <div className="font-bold font-mono mt-1">{referralEcon.roiPct}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] text-[#707070] mb-1">جوال المُحيل</label>
                  <input
                    type="text"
                    value={fraudTestForm.referrerPhone}
                    onChange={(e) =>
                      setFraudTestForm({ ...fraudTestForm, referrerPhone: e.target.value })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-1.5 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#707070] mb-1">جوال العميل المُحال</label>
                  <input
                    type="text"
                    value={fraudTestForm.referredPhone}
                    onChange={(e) =>
                      setFraudTestForm({ ...fraudTestForm, referredPhone: e.target.value })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-1.5 px-3 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#f3f3f3] flex items-center justify-between text-xs">
                <span>{fraudCheckLive.reasonAr}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#e0e0e0] font-bold">
                  {fraudCheckLive.payoutState}
                </span>
              </div>
            </div>
          </div>

          {/* Active Promo Codes, Referrals & Affiliates Table */}
          <div className="rounded-[24px] bg-white border border-[#e0e0e0] overflow-hidden">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] font-bold">
                <tr>
                  <th className="p-3.5">الكود</th>
                  <th className="p-3.5">نوع البرنامج</th>
                  <th className="p-3.5">الوصف والمُحيل</th>
                  <th className="p-3.5">خصم العميل</th>
                  <th className="p-3.5">مكافأة المُحيل / المسوق</th>
                  <th className="p-3.5">الدعوات / التحويلات</th>
                  <th className="p-3.5">حالة استحقاق العمولة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {scopedPromos.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f3f3f3]/70">
                    <td className="p-3.5 font-mono font-bold">{p.code}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] font-semibold">
                        {p.program_kind === 'promo_coupon'
                          ? 'كوبون عرض ترويجي'
                          : p.program_kind === 'customer_referral'
                          ? 'إحالة عميل مزدوجة'
                          : 'مسوق خارجي بالعمولة'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold">{p.title_ar}</div>
                      {p.referrer_name && (
                        <div className="text-[11px] text-[#707070]">{p.referrer_name}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold">
                      {formatSaudiRiyal(p.client_discount_value)}
                    </td>
                    <td className="p-3.5 font-mono font-bold">
                      {formatSaudiRiyal(p.referrer_reward_sar)}
                    </td>
                    <td className="p-3.5 font-mono">
                      {p.invitations_sent} دعوة • {p.conversions_count} تعاقد
                    </td>
                    <td className="p-3.5 font-semibold">{p.payout_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: AI MARKETING CONTENT GENERATOR, PORTFOLIO ANALYST & CRM COPILOT
         ===================================================================== */}
      {activeTab === 'ai-studio' && (
        <CrmAiMarketingStudioTab
          activeCompanyId={activeCompanyId}
          evaluatedCampaigns={campaignPortfolio.items}
          blendedRoas={campaignPortfolio.blendedRoas}
          blendedCplSar={campaignPortfolio.blendedCplSar}
          blendedCpaSar={campaignPortfolio.blendedCpaSar}
          totalSpentSar={campaignPortfolio.totalSpentSar}
          totalRevenueSar={campaignPortfolio.totalRevenueSar}
          scopedLeads={pipelineForecast.scopedLeads}
          weightedForecastSar={pipelineForecast.weightedForecastSar}
          rottingLeadsCount={pipelineForecast.rottingLeadsCount}
          signalReadiness={signalReadiness}
          onSaveVariantToStudio={async (payload) => {
            const newTask: CrmContentTask = {
              id: `CNT-AI-${Date.now().toString().slice(-4)}`,
              company_id: payload.company_id,
              task_code: `AI-${payload.company_id}-${contentTasks.length + 1}`,
              title: payload.title,
              content_type: 'reel_video',
              creative_angle: payload.creative_angle,
              target_platform: payload.target_platform,
              headline_text: payload.headline_text,
              primary_copy_text: payload.primary_copy_text,
              video_script_hook: payload.video_script_hook,
              char_spec_valid: true,
              iteration_round: 1,
              designer_email: 'nagati.marketing@kas.sa',
              videographer_email: 'm.almontaser.marketing@kas.sa',
              marketer_email: currentUser?.email || 'm.alkhader.marketing@kas.sa',
              approval_status: 'review_moaz',
              scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              created_at: new Date().toISOString(),
            };
            pushUndo();
            const next = [newTask, ...contentTasks];
            setContentTasks(next);
            await persistCrmTable('crm_content_calendar', next, [newTask]);
            addNotification({
              title: 'إدراج إعلان الذكاء الاصطناعي في الاستوديو',
              message: `تم حفظ (${newTask.title}) ومزامنته سحابياً مع استوديو المحتوى.`,
              type: 'success',
            });
          }}
          onNotify={(title, message, type = 'info') => addNotification({ title, message, type })}
        />
      )}

      {/* =====================================================================
          TAB 7: EVERYAPP-STYLE GROUP WEBSITES INTELLIGENCE SUITE
         ===================================================================== */}
      {activeTab === 'group-sites' && (
        <CrmGroupWebsitesHubTab
          activeCompanyId={activeCompanyId}
          actorEmail={currentUser?.email || 'm.alkhader.marketing@kas.sa'}
          onSitesChanged={(sites) => setGroupSites(sites)}
          onLeadCapturedFromWebhookTest={reloadData}
          onNotify={(title, message, type = 'info') => addNotification({ title, message, type })}
        />
      )}

      {/* =====================================================================
          MODALS (Add Campaign, Add Lead, Add Studio Brief, Lost Reason, Promo)
         ===================================================================== */}

      {showCampaignModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2050] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCampaignModal(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] m-0">إطلاق حملة إعلانية ممولة جديدة</h3>
              <button type="button" onClick={() => setShowCampaignModal(false)}>
                <X className="w-4 h-4 text-[#707070]" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم الحملة الإعلانية *</label>
                <input
                  type="text"
                  required
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="مثال: حملة استقدام الفلبين — سناب شات الرياض"
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الشركة المستهدفة</label>
                  <select
                    value={campaignForm.company_id}
                    onChange={(e) => setCampaignForm({ ...campaignForm, company_id: e.target.value as typeof campaignForm.company_id })}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    <option value="SAF">السفير الماسي (SAF)</option>
                    <option value="TOP">توباز للاستقدام (TOP)</option>
                    <option value="YAQ">ياقوت نجد للتأجير (YAQ)</option>
                    <option value="DAR">دار الرواد (DAR)</option>
                    <option value="KAS">كاس للتجارة والمعرض (KAS)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">المنصة الإعلانية</label>
                  <select
                    value={campaignForm.platform}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, platform: e.target.value as AdPlatform })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    <option value="snapchat">Snapchat Ads</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="google">Google Search & PMax</option>
                    <option value="meta">Meta (Instagram / FB)</option>
                    <option value="x">منصة X</option>
                    <option value="influencer">مؤثرون / حراج</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">الميزانية (⃁)</label>
                  <input
                    type="number"
                    value={campaignForm.budget_sar}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, budget_sar: Number(e.target.value) })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">سقف CPA (⃁)</label>
                  <input
                    type="number"
                    value={campaignForm.target_cpa_sar}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, target_cpa_sar: Number(e.target.value) })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">تصنيف 70/30</label>
                  <select
                    value={campaignForm.budget_bucket}
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        budget_bucket: e.target.value as 'proven_70' | 'testing_30',
                      })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    <option value="proven_70">70% حملة رابحة</option>
                    <option value="testing_30">30% اختبار جديد</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">معرّف UTM Campaign القياسي</label>
                <input
                  type="text"
                  value={campaignForm.utm_campaign}
                  onChange={(e) => setCampaignForm({ ...campaignForm, utm_campaign: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 rounded-full border border-[#e0e0e0]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
                >
                  حفظ وإطلاق الحملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLeadModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2050] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLeadModal(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] m-0">
                تسجيل فرصة بيعية جديدة (توجيه آلي + SLA 15 دقيقة)
              </h3>
              <button type="button" onClick={() => setShowLeadModal(false)}>
                <X className="w-4 h-4 text-[#707070]" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم العميل المحتمل *</label>
                <input
                  type="text"
                  required
                  value={leadForm.full_name}
                  onChange={(e) => setLeadForm({ ...leadForm, full_name: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    placeholder="+9665..."
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">الشركة المختصة</label>
                  <select
                    value={leadForm.company_id}
                    onChange={(e) => setLeadForm({ ...leadForm, company_id: e.target.value as typeof leadForm.company_id })}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    <option value="SAF">السفير الماسي (SAF)</option>
                    <option value="TOP">توباز (TOP)</option>
                    <option value="YAQ">ياقوت نجد (YAQ)</option>
                    <option value="DAR">دار الرواد (DAR)</option>
                    <option value="KAS">كاس التجارية (KAS)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">القناة الإعلانية</label>
                  <select
                    value={leadForm.source_platform}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, source_platform: e.target.value as AdPlatform })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    <option value="snapchat">Snapchat Ads</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="google">Google Ads</option>
                    <option value="meta">Instagram / Meta</option>
                    <option value="x">منصة X</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">القيمة المتوقعة (⃁)</label>
                  <input
                    type="number"
                    value={leadForm.estimated_value_sar}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, estimated_value_sar: Number(e.target.value) })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold pt-1">
                <input
                  type="checkbox"
                  checked={leadForm.marketing_consent}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, marketing_consent: e.target.checked })
                  }
                />
                <span>توثيق موافقة العميل على استلام العروض التسويقية (PDPL Art. 25)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="px-4 py-2 rounded-full border border-[#e0e0e0]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
                >
                  توجيه فوري للمندوب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStudioModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2050] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStudioModal(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] m-0">
                بريف استوديو المحتوى ومدقق حدود الأحرف اللحظي (ad-creative)
              </h3>
              <button type="button" onClick={() => setShowStudioModal(false)}>
                <X className="w-4 h-4 text-[#707070]" />
              </button>
            </div>
            <form onSubmit={handleCreateStudioTask} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">عنوان المهمة الإبداعية *</label>
                <input
                  type="text"
                  required
                  value={studioForm.title}
                  onChange={(e) => setStudioForm({ ...studioForm, title: e.target.value })}
                  placeholder="مثال: ريلز عرض استقدام الفلبين — زاوية الضمان"
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">المنصة المستهدفة</label>
                  <select
                    value={studioForm.target_platform}
                    onChange={(e) =>
                      setStudioForm({
                        ...studioForm,
                        target_platform: e.target.value as AdPlatform,
                      })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    <option value="snapchat">Snapchat Ads (حد 34 / 80)</option>
                    <option value="tiktok">TikTok Ads (حد 40 / 80)</option>
                    <option value="google">Google RSA (حد 30 / 90)</option>
                    <option value="meta">Meta Feed/Reels (حد 40 / 125)</option>
                    <option value="x">منصة X (حد 70 / 280)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">الزاوية الإعلانية (8 Angles)</label>
                  <select
                    value={studioForm.creative_angle}
                    onChange={(e) =>
                      setStudioForm({
                        ...studioForm,
                        creative_angle: e.target.value as CreativeAngle,
                      })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                  >
                    {Object.entries(CREATIVE_ANGLES_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-bold">العنوان الإعلاني (Headline)</label>
                  <span className="font-mono text-[11px]">
                    {liveStudioValidation.headlineLength}/{liveStudioValidation.headlineLimit}
                  </span>
                </div>
                <input
                  type="text"
                  value={studioForm.headline_text}
                  onChange={(e) => setStudioForm({ ...studioForm, headline_text: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-bold">النص الإعلاني الأساسي المرئي</label>
                  <span className="font-mono text-[11px]">
                    {liveStudioValidation.primaryLength}/{liveStudioValidation.primaryLimit}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={studioForm.primary_copy_text}
                  onChange={(e) =>
                    setStudioForm({ ...studioForm, primary_copy_text: e.target.value })
                  }
                  className="w-full bg-[#f0f0f0] rounded-2xl p-3"
                />
              </div>

              {!liveStudioValidation.valid && (
                <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#141414] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold">
                    {liveStudioValidation.issuesAr[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setStudioForm({
                        ...studioForm,
                        headline_text: liveStudioValidation.trimmedHeadlineSuggestion,
                        primary_copy_text: liveStudioValidation.trimmedPrimarySuggestion,
                      })
                    }
                    className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold shrink-0"
                  >
                    اختصار تلقائي للحد المسموح
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowStudioModal(false)}
                  className="px-4 py-2 rounded-full border border-[#e0e0e0]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
                >
                  اعتماد البريف وإسناده للفريق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {losingLead && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2060] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLosingLead(null);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-[24px] border border-[#e0e0e0] p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#141414] m-0">
              توثيق سبب خسارة الفرصة ({losingLead.full_name}) — إلزامي
            </h3>
            <select
              value={selectedLostReason}
              onChange={(e) => setSelectedLostReason(e.target.value)}
              className="w-full bg-[#f0f0f0] rounded-2xl py-2.5 px-3 font-semibold"
            >
              {LOST_REASONS_CATALOG.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLosingLead(null)}
                className="px-4 py-2 rounded-full border border-[#e0e0e0]"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleAdvanceLeadStage(losingLead, 'lost', selectedLostReason);
                  setLosingLead(null);
                }}
                className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
              >
                تأكيد الإغلاق مع السبب
              </button>
            </div>
          </div>
        </div>
      )}

      {showPromoModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2050] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPromoModal(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] m-0">
                إنشاء كود خصم ترويجي أو مسوق بالعمولة
              </h3>
              <button type="button" onClick={() => setShowPromoModal(false)}>
                <X className="w-4 h-4 text-[#707070]" />
              </button>
            </div>
            <form onSubmit={handleCreatePromoReferral} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">نوع البرنامج</label>
                <select
                  value={promoForm.program_kind}
                  onChange={(e) =>
                    setPromoForm({
                      ...promoForm,
                      program_kind: e.target.value as CrmPromoReferral['program_kind'],
                    })
                  }
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                >
                  <option value="promo_coupon">كوبون عرض موسمي</option>
                  <option value="customer_referral">إحالة عميل مزدوجة (رشّح عميلاً)</option>
                  <option value="external_affiliate">مسوق خارجي بالعمولة (Affiliate)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الكود المختصر *</label>
                  <input
                    type="text"
                    required
                    placeholder="SAFIR2026"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">خصم العميل (⃁)</label>
                  <input
                    type="number"
                    value={promoForm.client_discount_value}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, client_discount_value: Number(e.target.value) })
                    }
                    className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">عنوان العرض بالعربية *</label>
                <input
                  type="text"
                  required
                  value={promoForm.title_ar}
                  onChange={(e) => setPromoForm({ ...promoForm, title_ar: e.target.value })}
                  className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                />
              </div>
              {promoForm.program_kind !== 'promo_coupon' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">اسم المُحيل / المسوق</label>
                    <input
                      type="text"
                      value={promoForm.referrer_name}
                      onChange={(e) =>
                        setPromoForm({ ...promoForm, referrer_name: e.target.value })
                      }
                      className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">
                      مكافأة المُحيل (سقف {formatSaudiRiyal(referralEcon.maxEconomicalRewardSar)})
                    </label>
                    <input
                      type="number"
                      value={promoForm.referrer_reward_sar}
                      onChange={(e) =>
                        setPromoForm({ ...promoForm, referrer_reward_sar: Number(e.target.value) })
                      }
                      className="w-full bg-[#f0f0f0] rounded-2xl py-2 px-3 font-mono"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 rounded-full border border-[#e0e0e0]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
                >
                  حفظ وتفعيل الكود
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CrmMarketingKpiDetailsModal
        kind={kpiDetail}
        activeCompanyId={activeCompanyId}
        evaluatedCampaigns={campaignPortfolio.items}
        blendedRoas={campaignPortfolio.blendedRoas}
        totalRevenueSar={campaignPortfolio.totalRevenueSar}
        totalSpentSar={campaignPortfolio.totalSpentSar}
        blendedCplSar={campaignPortfolio.blendedCplSar}
        blendedCpaSar={campaignPortfolio.blendedCpaSar}
        provenSharePct={campaignPortfolio.provenSharePct}
        testingSharePct={campaignPortfolio.testingSharePct}
        scopedLeads={pipelineForecast.scopedLeads}
        weightedForecastSar={pipelineForecast.weightedForecastSar}
        rottingLeadsCount={pipelineForecast.rottingLeadsCount}
        scopedContentTasks={scopedContentTasks}
        scopedPromos={scopedPromos}
        viralKFactor={referralEcon.viralKFactor}
        undoCount={undoStack.length}
        redoCount={redoStack.length}
        onUndo={() => void handleUndo()}
        onRedo={() => void handleRedo()}
        onJumpToTab={(t) => setActiveTab(t)}
        onClose={() => setKpiDetail(null)}
      />

      {previewOpen && (
        <ExportPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          sectionKey={activeExportMeta.sectionKey}
          data={activeExportMeta.rows}
          customTitle={activeExportMeta.title}
        />
      )}
    </div>
  );
};

export default CrmMarketingHubPage;
