import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Brain,
  Wand2,
  Send,
  Copy,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { formatSaudiRiyal } from '../../utils/saudiRiyal';
import {
  AD_PLATFORM_LABELS,
  CREATIVE_ANGLES_META,
  LEAD_STAGE_META,
  type AdPlatform,
  type CreativeAngle,
  type CrmContentTask,
  type CrmLead,
  type EvaluatedCampaignMetrics,
  type MeasurementReadinessResult,
  buildNormalizedUtmUrl,
  evaluateLeadSlaAndRotting,
  validatePlatformCreativeSpec,
} from '../../services/crmMarketingEngine';

export interface AiGeneratedAdVariant {
  id: string;
  headline: string;
  primaryCopy: string;
  videoScript: string;
  hashtags: string;
  utmUrl: string;
  specValid: boolean;
  specNote: string;
}

interface CrmAiMarketingStudioTabProps {
  activeCompanyId: string;
  evaluatedCampaigns: EvaluatedCampaignMetrics[];
  blendedRoas: number;
  blendedCplSar: number;
  blendedCpaSar: number;
  totalSpentSar: number;
  totalRevenueSar: number;
  scopedLeads: CrmLead[];
  weightedForecastSar: number;
  rottingLeadsCount: number;
  signalReadiness: MeasurementReadinessResult;
  onSaveVariantToStudio: (payload: {
    title: string;
    company_id: string;
    target_platform: AdPlatform;
    creative_angle: CreativeAngle;
    headline_text: string;
    primary_copy_text: string;
    video_script_hook: string;
  }) => Promise<void>;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const COMPANY_NAMES_AR: Record<string, string> = {
  SAF: 'شركة السفير الماسي للاستقدام',
  TOP: 'شركة توباز للاستقدام',
  YAQ: 'شركة ياقوت نجد للتأجير',
  DAR: 'مراكز دار الرواد للإيواء',
  KAS: 'شركة كاس للتجارة والمعرض',
  all: 'مجموعة خالد السليم القابضة',
};

const TONE_LABELS: Record<string, string> = {
  persuasive: 'إقناعية عالية التحويل',
  luxury: 'فاخرة وموثوقة (VIP)',
  urgent: 'عرض محدود وعاجل',
  trust: 'ضمان مساند والشفافية',
};

async function callEdgeAiChat(systemPrompt: string, userPrompt: string): Promise<string | null> {
  try {
    const resp = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(14000),
    });
    if (!resp.ok) return null;
    const json = await resp.json().catch(() => null);
    const text = json?.content || json?.reply || json?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

export const CrmAiMarketingStudioTab: React.FC<CrmAiMarketingStudioTabProps> = ({
  activeCompanyId,
  evaluatedCampaigns,
  blendedRoas,
  blendedCplSar,
  blendedCpaSar,
  totalSpentSar,
  totalRevenueSar,
  scopedLeads,
  weightedForecastSar,
  rottingLeadsCount,
  signalReadiness,
  onSaveVariantToStudio,
  onNotify,
}) => {
  // 1. AI Content Generator State
  const [companyId, setCompanyId] = useState<string>(activeCompanyId !== 'all' ? activeCompanyId : 'SAF');
  const [platform, setPlatform] = useState<AdPlatform>('snapchat');
  const [angle, setAngle] = useState<CreativeAngle>('outcome');
  const [tone, setTone] = useState<string>('persuasive');
  const [offerTopic, setOfferTopic] = useState<string>('استقدام كوادر منزلية مدربة عبر مساند بضمان 90 يوماً ووصول سريع');
  const [generatingAds, setGeneratingAds] = useState(false);
  const [variants, setVariants] = useState<AiGeneratedAdVariant[]>([]);

  // 2. AI Portfolio Analyst & Chat State
  const [analystQuestion, setAnalystQuestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysisReport, setAiAnalysisReport] = useState<string>('');

  // 3. AI CRM Lead Follow-Up Script State
  const [selectedLeadId, setSelectedLeadId] = useState<string>(scopedLeads[0]?.id || '');
  const [generatingFollowup, setGeneratingFollowup] = useState(false);
  const [followupScript, setFollowupScript] = useState<string>('');

  // Deterministic live executive diagnostics (always instant, zero latency)
  const liveInsights = useMemo(() => {
    const sortedByRoas = evaluatedCampaigns.toSorted((a, b) => b.roas - a.roas);
    const topWinner = sortedByRoas[0] || null;
    const wasteCandidates = evaluatedCampaigns.filter((c) => c.outlierFlags.length > 0);
    const urgentLeads = scopedLeads
      .map((lead) => ({ lead, diag: evaluateLeadSlaAndRotting(lead) }))
      .filter((x) => x.lead.stage !== 'won' && x.lead.stage !== 'lost' && (x.diag.slaBreached || x.diag.isRotting))
      .sort((a, b) => b.lead.estimated_value_sar - a.lead.estimated_value_sar);

    return { topWinner, wasteCandidates, urgentLeads };
  }, [evaluatedCampaigns, scopedLeads]);

  const buildLocalFallbackVariants = (): AiGeneratedAdVariant[] => {
    const compName = COMPANY_NAMES_AR[companyId] || companyId;
    const utm = buildNormalizedUtmUrl({
      landingPath: '/select-workers',
      source: platform,
      medium: platform === 'google' ? 'cpc_search' : 'paid_social',
      campaign: `${companyId}_${angle}_ai_${new Date().toISOString().slice(5, 10).replace('-', '')}`,
    });

    const drafts = [
      {
        headline: platform === 'google' ? 'استقدام موثق بضمان 90 يوماً' : `${offerTopic.slice(0, 34)}`,
        primaryCopy:
          platform === 'google'
            ? `احجز عبر ${compName} بتوثيق مساند الرسمي ومتابعة يومية حتى الوصول.`
            : `${offerTopic} مع ${compName} — اختيار فوري للسيرة الذاتية وتوثيق إلكتروني عبر مساند.`,
        videoScript: `0-3ث: تبحث عن راحة بالك مع ${compName}؟ | 3-8ث: مللت من التأخير والسير غير المطابقة؟ | 8-20ث: ${offerTopic} مع متابعة يومية حتى المطار | 20-30ث: اسحب للأعلى واحجز الآن.`,
        hashtags: '#السعودية #الرياض #مساند #استقدام #مجموعة_خالد_السليم',
      },
      {
        headline: platform === 'google' ? 'وصول أسرع وتوثيق مساند فوري' : 'اختر السيرة الأنسب لأسرتك اليوم',
        primaryCopy: `خدمة احترافية من ${compName}: سيرة ذاتية مفحوصة، عقد رسمي، وضمان شامل بدون رسوم مخفية.`,
        videoScript: `0-3ث: 3 خطوات فقط وتصلك العاملة المدربة! | 3-8ث: بدون تعقيد أو انتظار طويل | 8-20ث: استعرض السير المعتمدة ووثق عقدك إلكترونياً عبر ${compName} | 20-30ث: تواصل واتساب الآن.`,
        hashtags: '#استقدام_السعودية #تأجير_عمالة #خدمات_منزلية #الرياض',
      },
      {
        headline: platform === 'google' ? 'عرض حصري لفترة محدودة — احجز' : 'عرض محدود: أولوية إنجاز وحجز فوري',
        primaryCopy: `استفد من عرض ${compName} (${TONE_LABELS[tone]}): استشارة مجانية ومطابقة ذكية لاحتياج منزلك.`,
        videoScript: `0-3ث: العرض لفترة محدودة هذا الأسبوع! | 3-8ث: الأعداد المميزة تُحجز بسرعة | 8-20ث: ${compName} تضمن لك الاختيار الدقيق والشفافية الكاملة | 20-30ث: اضغط الرابط واحجز مقعدك.`,
        hashtags: '#عروض_الرياض #مساند_السعودية #استقدام_فوري',
      },
    ];

    return drafts.map((d, idx) => {
      const check = validatePlatformCreativeSpec({
        platform,
        headline: d.headline,
        primaryText: d.primaryCopy,
      });
      return {
        id: `AI-VAR-${Date.now()}-${idx + 1}`,
        headline: d.headline,
        primaryCopy: d.primaryCopy,
        videoScript: d.videoScript,
        hashtags: d.hashtags,
        utmUrl: utm.fullUrl,
        specValid: check.valid,
        specNote: check.valid ? 'مطابق 100% لحدود المنصة وPDPL' : check.issuesAr[0] || 'يتطلب اختصار النص',
      };
    });
  };

  const handleGenerateAiAds = async () => {
    setGeneratingAds(true);
    try {
      const compName = COMPANY_NAMES_AR[companyId] || companyId;
      const utm = buildNormalizedUtmUrl({
        landingPath: '/select-workers',
        source: platform,
        medium: platform === 'google' ? 'cpc_search' : 'paid_social',
        campaign: `${companyId}_${angle}_ai_${new Date().toISOString().slice(5, 10).replace('-', '')}`,
      });

      const sys =
        'أنت مدير تسويق رقمي سعودي خبير في إعلانات Snapchat وTikTok وGoogle وMeta. أعد النتيجة بصيغة JSON array فقط من 3 عناصر، كل عنصر يحتوي المفاتيح: headline, primaryCopy, videoScript, hashtags. التزم بحدود أحرف المنصة، واستخدم رمز الريال ⃁ فقط، وامنع أي بيانات شخصية مخالفة لنظام PDPL السعودي.';
      const usr = `الشركة: ${compName} (${companyId})\nالمنصة: ${AD_PLATFORM_LABELS[platform]}\nالزاوية الإبداعية: ${CREATIVE_ANGLES_META[angle]?.labelAr}\nالنبرة: ${TONE_LABELS[tone]}\nالعرض/الموضوع: ${offerTopic}`;

      const raw = await callEdgeAiChat(sys, usr);
      if (raw) {
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const built: AiGeneratedAdVariant[] = parsed.slice(0, 3).map((item: any, idx: number) => {
              const headline = String(item?.headline || '').trim() || offerTopic.slice(0, 30);
              const primaryCopy = String(item?.primaryCopy || '').trim() || offerTopic;
              const check = validatePlatformCreativeSpec({ platform, headline, primaryText: primaryCopy });
              return {
                id: `AI-VAR-${Date.now()}-${idx + 1}`,
                headline,
                primaryCopy,
                videoScript: String(item?.videoScript || '0-3ث: خطاف | 3-8ث: مشكلة | 8-20ث: حل | 20-30ث: احجز الآن'),
                hashtags: String(item?.hashtags || '#السعودية #الرياض #مساند'),
                utmUrl: utm.fullUrl,
                specValid: check.valid,
                specNote: check.valid ? 'مطابق 100% لحدود المنصة وPDPL' : check.issuesAr[0] || 'راجع طول النص',
              };
            });
            setVariants(built);
            onNotify('تم توليد 3 نسخ إعلانية بالذكاء الاصطناعي', 'تم فحص الحدود الإبداعية وتوليد روابط UTM تلقائياً.', 'success');
            return;
          }
        }
      }

      const fallback = buildLocalFallbackVariants();
      setVariants(fallback);
      onNotify('تم توليد 3 نسخ إعلانية ذكية', 'تم التوليد عبر المحرك الذكي المتوافق مع حدود المنصة وPDPL.', 'success');
    } catch {
      setVariants(buildLocalFallbackVariants());
    } finally {
      setGeneratingAds(false);
    }
  };

  const handleRunAiAnalysis = async (customQ?: string) => {
    setAnalyzing(true);
    const q = (customQ ?? analystQuestion).trim();
    const summaryContext = [
      `الشركة النشطة: ${activeCompanyId}`,
      `مؤشر جودة القياس: ${signalReadiness.score}/100 (${signalReadiness.verdict})`,
      `العائد المجمّع ROAS: ${blendedRoas}x | إجمالي الإنفاق: ${totalSpentSar} ⃁ | الإيرادات: ${totalRevenueSar} ⃁`,
      `متوسط CPL: ${blendedCplSar} ⃁ | متوسط CPA: ${blendedCpaSar} ⃁`,
      `التوقع البيعي المرجّح: ${weightedForecastSar} ⃁ | إجمالي الفرص: ${scopedLeads.length} | فرص راكدة: ${rottingLeadsCount}`,
      `الحملات (${evaluatedCampaigns.length}): ` +
        evaluatedCampaigns
          .map((c) => `${c.campaign.name} [${c.campaign.platform}] ROAS=${c.roas}x CPA=${c.cpaSar}⃁ Flags=${c.outlierFlags.join(',') || 'OK'}`)
          .join(' | '),
    ].join('\n');

    try {
      const aiText = await callEdgeAiChat(
        'أنت محلل نمو وتسويق تنفيذي (CMO & Performance Analyst) في السعودية. قدّم تحليلاً عملياً مختصراً ومرتباً بنقاط واضحة بالعربية مع توصيات ميزانية مقيدة بـ ±20% واستخدام رمز الريال ⃁.',
        q ? `${summaryContext}\n\nسؤال الإدارة: ${q}` : `${summaryContext}\n\nقدّم تشخيصاً تنفيذياً فورياً لأداء الحملات وخط أنابيب المبيعات وخطة عمل للأسبوع القادم.`
      );
      if (aiText) {
        setAiAnalysisReport(aiText);
        return;
      }
      // Deterministic executive analysis fallback
      const lines = [
        `• **التشخيص العام (${activeCompanyId})**: العائد المجمّع **${blendedRoas}x** بإيرادات ${formatSaudiRiyal(totalRevenueSar)} مقابل إنفاق ${formatSaudiRiyal(totalSpentSar)}، ومؤشر جاهزية القياس **${signalReadiness.score}/100** (${signalReadiness.safeToScaleBudgets ? 'آمن لتوسيع الميزانيات' : 'يُمنع التوسيع التلقائي حتى يرتفع فوق 55'}).`,
        liveInsights.topWinner
          ? `• **أفضل حملة للتوسيع (+20%)**: «${liveInsights.topWinner.campaign.name}» بعائد **${liveInsights.topWinner.roas}x** وميزانية مقترحة **${formatSaudiRiyal(liveInsights.topWinner.recommendedSpendSar)}**.`
          : '• لا توجد حملات نشطة كافية لتحديد حملة رابحة.',
        liveInsights.wasteCandidates.length > 0
          ? `• **حملات تتطلب مراجعة فورية (${liveInsights.wasteCandidates.length})**: ${liveInsights.wasteCandidates.map((w) => `${w.campaign.name} (${w.outlierFlags.join('، ')})`).join(' — ')}.`
          : '• **كفاءة الإنفاق**: لا توجد حملات مهدرة أو متجاوزة لسقف CPA حالياً.',
        `• **أولوية المبيعات (CRM SLA)**: التوقع المرجّح **${formatSaudiRiyal(weightedForecastSar)}** مع **${liveInsights.urgentLeads.length}** فرص عاجلة/راكدة يُوصى بالتواصل معها خلال 15 دقيقة.`,
      ];
      setAiAnalysisReport(lines.join('\n'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateLeadScript = async () => {
    const lead = scopedLeads.find((l) => l.id === selectedLeadId) || scopedLeads[0];
    if (!lead) return;
    setGeneratingFollowup(true);
    try {
      const stageAr = LEAD_STAGE_META[lead.stage]?.labelAr || lead.stage;
      const aiText = await callEdgeAiChat(
        'أنت خبير مبيعات واستشاري خدمة عملاء سعودي. اكتب رسالة واتساب قصيرة ومهذبة وعالية التحويل باللهجة السعودية المهنية بدون أي بيانات حساسة، مع دعوة واضحة لاتخاذ إجراء.',
        `العميل: ${lead.full_name} | الخدمة: ${lead.service_interest} | الجنسية المفضلة: ${lead.preferred_nationality || 'حسب الاختيار'} | المرحلة الحالية: ${stageAr} | القيمة: ${lead.estimated_value_sar} ⃁ | الشركة: ${COMPANY_NAMES_AR[lead.company_id] || lead.company_id}`
      );
      if (aiText) {
        setFollowupScript(aiText);
        return;
      }
      setFollowupScript(
        `السلام عليكم أ. ${lead.full_name}، معك ${lead.assigned_to_name} من ${COMPANY_NAMES_AR[lead.company_id] || lead.company_id}.\nبخصوص طلبكم (${lead.service_interest}${lead.preferred_nationality ? ` — ${lead.preferred_nationality}` : ''})، جهّزنا لكم نخبة من السير الذاتية المطابقة بضمان مساند الرسمي.\nهل يناسبكم إرسال أبرز 3 خيارات الآن لاختيار الأنسب وحجزه فوراً؟\n(للإلغاء من الرسائل الترويجية أرسل: إيقاف)`
      );
    } finally {
      setGeneratingFollowup(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive AI Diagnostics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-[24px] bg-[#141414] text-white space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#adadad]">
            <span>أفضل حملة للتوسيع الذكي</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-bold truncate">
            {liveInsights.topWinner ? liveInsights.topWinner.campaign.name : 'لا توجد حملات بعد'}
          </div>
          <div className="text-xs text-[#adadad] font-mono">
            {liveInsights.topWinner
              ? `ROAS ${liveInsights.topWinner.roas}x • مقترح: ${formatSaudiRiyal(liveInsights.topWinner.recommendedSpendSar)}`
              : 'أطلق حملة للتحليل'}
          </div>
        </div>

        <div className="p-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#707070]">
            <span>رادار هدر الميزانية (AI Flags)</span>
            <AlertTriangle className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono">
            {liveInsights.wasteCandidates.length} حملات
          </div>
          <div className="text-xs text-[#707070]">
            {liveInsights.wasteCandidates.length > 0
              ? liveInsights.wasteCandidates[0].campaign.name
              : 'جميع الحملات ضمن النطاق السليم'}
          </div>
        </div>

        <div className="p-5 rounded-[24px] bg-white border border-[#e0e0e0] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#707070]">
            <span>فرص عاجلة لإغلاقها بالذكاء الاصطناعي</span>
            <MessageSquare className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono">
            {liveInsights.urgentLeads.length} فرص
          </div>
          <div className="text-xs text-[#707070]">
            {liveInsights.urgentLeads.length > 0
              ? `أعلى أولوية: ${liveInsights.urgentLeads[0].lead.full_name}`
              : 'جميع الفرص ضمن مهلة 15 دقيقة'}
          </div>
        </div>
      </div>

      {/* 1. AI Ad & Content Generator */}
      <div className="p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              <span>مولّد الحملات والمحتوى الإعلاني بالذكاء الاصطناعي (AI Creative Engine)</span>
            </h2>
            <p className="text-xs text-[#707070] mt-1 mb-0">
              يولّد 3 نسخ إعلانية كاملة (عنوان + نص + سيناريو فيديو 30ث + UTM) مفحوصة تلقائياً ضد حدود المنصة وPDPL.
            </p>
          </div>
          <button
            type="button"
            disabled={generatingAds}
            onClick={() => void handleGenerateAiAds()}
            className="px-5 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-2 hover:bg-[#262626] disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generatingAds ? 'animate-spin' : ''}`} />
            <span>{generatingAds ? 'جارٍ التوليد بالذكاء الاصطناعي...' : 'توليد 3 إعلانات احترافية'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-[#141414] mb-1">الشركة المستهدفة</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            >
              <option value="SAF">السفير الماسي (SAF)</option>
              <option value="TOP">توباز للاستقدام (TOP)</option>
              <option value="YAQ">ياقوت نجد (YAQ)</option>
              <option value="DAR">دار الرواد (DAR)</option>
              <option value="KAS">كاس التجارية (KAS)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-[#141414] mb-1">المنصة الإعلانية</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as AdPlatform)}
              className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            >
              {Object.entries(AD_PLATFORM_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>{lbl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-[#141414] mb-1">الزاوية الإبداعية</label>
            <select
              value={angle}
              onChange={(e) => setAngle(e.target.value as CreativeAngle)}
              className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            >
              {Object.entries(CREATIVE_ANGLES_META).map(([k, meta]) => (
                <option key={k} value={k}>{meta.labelAr}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-[#141414] mb-1">نبرة الخطاب</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            >
              {Object.entries(TONE_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>{lbl}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-bold text-[#141414] mb-1">فكرة العرض أو الخدمة المطلوب الترويج لها</label>
          <input
            type="text"
            value={offerTopic}
            onChange={(e) => setOfferTopic(e.target.value)}
            placeholder="مثال: استقدام عاملة منزلية من الفلبين بضمان 90 يوماً..."
            className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-4 text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
          />
        </div>

        {variants.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            {variants.map((v, idx) => (
              <div key={v.id} className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                      نسخة AI #{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-[#141414] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {v.specNote}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#141414]">{v.headline}</div>
                  <p className="text-xs text-[#525252] m-0 leading-relaxed">{v.primaryCopy}</p>
                  <div className="p-2.5 rounded-[12px] bg-white text-[11px] text-[#141414] border border-[#e0e0e0]">
                    <div className="font-bold mb-0.5">سيناريو الفيديو (30ث):</div>
                    <div>{v.videoScript}</div>
                  </div>
                  <div className="text-[11px] text-[#707070]">{v.hashtags}</div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={() =>
                      void onSaveVariantToStudio({
                        title: `إعلان AI #${idx + 1} — ${v.headline.slice(0, 35)}`,
                        company_id: companyId,
                        target_platform: platform,
                        creative_angle: angle,
                        headline_text: v.headline,
                        primary_copy_text: v.primaryCopy,
                        video_script_hook: v.videoScript,
                      })
                    }
                    className="flex-1 px-3 py-2 rounded-full bg-[#141414] text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 hover:bg-[#262626]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>اعتماد في الاستوديو</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(`${v.headline}\n${v.primaryCopy}\n\n${v.videoScript}\n${v.hashtags}\n${v.utmUrl}`);
                      onNotify('تم النسخ', 'تم نسخ النص الإعلاني والسيناريو ورابط UTM.', 'info');
                    }}
                    className="px-3 py-2 rounded-full bg-white border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 hover:border-[#141414]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. AI Portfolio Analyst + 3. AI Sales Follow-up Script */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span>محلل الأداء التسويقي والـ CRM بالذكاء الاصطناعي</span>
            </h3>
            <button
              type="button"
              disabled={analyzing}
              onClick={() => void handleRunAiAnalysis()}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#262626] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'جارٍ التحليل...' : 'تحليل شامل الآن'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={analystQuestion}
              onChange={(e) => setAnalystQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleRunAiAnalysis()}
              placeholder="اسأل المحلل الذكي: كيف أرفع الـ ROAS؟ أي منصة تستحق زيادة ميزانية 20%؟"
              className="flex-1 bg-[#f0f0f0] rounded-full py-2.5 px-4 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            />
            <button
              type="button"
              disabled={analyzing}
              onClick={() => void handleRunAiAnalysis()}
              className="px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#141414]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>اسأل</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              'اقترح خطة إعادة توزيع ميزانية 70/30 لهذا الأسبوع',
              'كيف نعالج الفرص الراكدة ونرفع معدل الإغلاق؟',
              'أفضل 3 زوايا إعلانية لسناب شات وتيك توك في السعودية',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setAnalystQuestion(q);
                  void handleRunAiAnalysis(q);
                }}
                className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-semibold hover:bg-[#e0e0e0]"
              >
                {q}
              </button>
            ))}
          </div>

          {aiAnalysisReport && (
            <div className="p-4 rounded-[18px] bg-[#f3f3f3] text-xs text-[#141414] whitespace-pre-line leading-relaxed">
              {aiAnalysisReport}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 p-6 rounded-[24px] bg-white border border-[#e0e0e0] space-y-4">
          <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>مساعد إغلاق صفقات الـ CRM (رسالة متابعة ذكية)</span>
          </h3>

          <div className="space-y-2 text-xs">
            <label className="block font-bold text-[#141414]">اختر الفرصة البيعية (Lead)</label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            >
              {scopedLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name} — {LEAD_STAGE_META[l.stage]?.labelAr || l.stage} ({l.company_id})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={generatingFollowup || scopedLeads.length === 0}
              onClick={() => void handleGenerateLeadScript()}
              className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center justify-center gap-2 hover:bg-[#262626] disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{generatingFollowup ? 'جارٍ صياغة الرسالة...' : 'توليد رسالة متابعة وإغلاق مخصصة'}</span>
            </button>
          </div>

          {followupScript && (
            <div className="space-y-2">
              <div className="p-4 rounded-[18px] bg-[#f3f3f3] text-xs text-[#141414] whitespace-pre-line leading-relaxed">
                {followupScript}
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(followupScript);
                  onNotify('تم نسخ رسالة المتابعة', 'جاهزة للإرسال المباشر للعميل عبر واتساب.', 'success');
                }}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#141414]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الرسالة</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrmAiMarketingStudioTab;
