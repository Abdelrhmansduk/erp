import { realErpDataStore } from './realErpDataStore';

export interface GroupWebsiteModules {
  analytics: boolean;
  seo: boolean;
  lead_capture: boolean;
  ai: boolean;
}

export interface CrmGroupWebsite {
  id: string;
  company_id: string;
  name_ar: string;
  domain: string;
  site_key: string;
  enabled_modules: GroupWebsiteModules;
  last_seo_score?: number | null;
  last_ttfb_ms?: number | null;
  pageviews_count: number;
  conversions_count: number;
  monthly_ai_cap_sar: number;
  status: 'نشط' | 'مجمّد';
  created_by_email?: string;
  created_at: string;
  updated_at?: string;
}

export interface SeoAuditIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  messageAr: string;
}

export interface CrmSiteSeoAuditReport {
  id: string;
  site_id: string;
  company_id: string;
  url_checked: string;
  score: number;
  http_status: number;
  ttfb_ms: number;
  title_text: string;
  meta_description: string;
  h1_count: number;
  missing_alt_count: number;
  has_https: boolean;
  has_canonical: boolean;
  has_og: boolean;
  has_robots: boolean;
  has_sitemap: boolean;
  issues_json: SeoAuditIssue[];
  ai_recommendations?: string;
  audited_at: string;
}

export interface CrmAiUsageEntry {
  id: string;
  site_id: string;
  company_id: string;
  feature: 'seo_audit' | 'ad_generator' | 'site_content' | 'crm_analyst';
  model: string;
  tokens_used: number;
  estimated_cost_sar: number;
  actor_email: string;
  month_key: string;
  created_at: string;
}

export const DEFAULT_GROUP_WEBSITES: CrmGroupWebsite[] = [
  {
    id: 'SITE-SAF-MAIN',
    company_id: 'SAF',
    name_ar: 'بوابة السفير الماسي للاستقدام',
    domain: 'https://saf.kas-erp.com',
    site_key: 'kas_site_saf_01',
    enabled_modules: { analytics: true, seo: true, lead_capture: true, ai: true },
    last_seo_score: 92,
    last_ttfb_ms: 145,
    pageviews_count: 4820,
    conversions_count: 142,
    monthly_ai_cap_sar: 750,
    status: 'نشط',
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'SITE-TOP-MAIN',
    company_id: 'TOP',
    name_ar: 'بوابة توباز للاستقدام والخدمات العمالية',
    domain: 'https://top.kas-erp.com',
    site_key: 'kas_site_top_02',
    enabled_modules: { analytics: true, seo: true, lead_capture: true, ai: true },
    last_seo_score: 89,
    last_ttfb_ms: 158,
    pageviews_count: 3410,
    conversions_count: 96,
    monthly_ai_cap_sar: 600,
    status: 'نشط',
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'SITE-YAQ-MAIN',
    company_id: 'YAQ',
    name_ar: 'بوابة ياقوت نجد للتأجير والتشغيل',
    domain: 'https://yaq.kas-erp.com',
    site_key: 'kas_site_yaq_03',
    enabled_modules: { analytics: true, seo: true, lead_capture: true, ai: true },
    last_seo_score: 88,
    last_ttfb_ms: 162,
    pageviews_count: 2950,
    conversions_count: 84,
    monthly_ai_cap_sar: 600,
    status: 'نشط',
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'SITE-DAR-MAIN',
    company_id: 'DAR',
    name_ar: 'بوابة مراكز دار الرواد للإيواء',
    domain: 'https://dar.kas-erp.com',
    site_key: 'kas_site_dar_04',
    enabled_modules: { analytics: true, seo: true, lead_capture: true, ai: true },
    last_seo_score: 90,
    last_ttfb_ms: 149,
    pageviews_count: 1840,
    conversions_count: 51,
    monthly_ai_cap_sar: 500,
    status: 'نشط',
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 'SITE-KAS-TRADE',
    company_id: 'KAS',
    name_ar: 'بوابة كاس للتجارة والمعرض والمنافسات',
    domain: 'https://trade.kas-erp.com',
    site_key: 'kas_site_kas_05',
    enabled_modules: { analytics: true, seo: true, lead_capture: true, ai: true },
    last_seo_score: 94,
    last_ttfb_ms: 132,
    pageviews_count: 3190,
    conversions_count: 73,
    monthly_ai_cap_sar: 750,
    status: 'نشط',
    created_by_email: 'm.alkhader.marketing@kas.sa',
    created_at: '2026-11-01T08:00:00Z',
  },
];

export function generateSiteKey(companyId: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `kas_site_${companyId.toLowerCase()}_${rand}`;
}

export function normalizeWebsiteDomain(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    return u.origin + (u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '');
  } catch {
    return '';
  }
}

export function buildSiteIntegrationSnippets(site: CrmGroupWebsite, gatewayOrigin = 'https://kas-erp.com') {
  const analyticsTag = `<script defer data-site="${site.site_key}" src="${gatewayOrigin}/api/marketing-sites/collect.js"></script>`;
  const webhookEndpoint = `${gatewayOrigin}/api/marketing-sites/lead`;
  const webhookExample = `fetch("${webhookEndpoint}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n    siteKey: "${site.site_key}",\n    fullName: "اسم العميل",\n    phone: "+9665XXXXXXXX",\n    city: "الرياض",\n    service: "طلب عبر ${site.name_ar}"\n  })\n});`;
  return { analyticsTag, webhookEndpoint, webhookExample };
}

export async function loadGroupWebsitesData(): Promise<{
  websites: CrmGroupWebsite[];
  seoAudits: CrmSiteSeoAuditReport[];
  aiUsage: CrmAiUsageEntry[];
}> {
  const [rawSites, rawAudits, rawUsage] = await Promise.all([
    realErpDataStore.getRecords<CrmGroupWebsite>('crm_group_websites', DEFAULT_GROUP_WEBSITES, 'all'),
    realErpDataStore.getRecords<CrmSiteSeoAuditReport>('crm_site_seo_audits', [], 'all'),
    realErpDataStore.getRecords<CrmAiUsageEntry>('crm_ai_usage_ledger', [], 'all'),
  ]);

  const websites = (rawSites.length ? rawSites : DEFAULT_GROUP_WEBSITES).map((s) => ({
    ...s,
    enabled_modules: {
      analytics: s.enabled_modules?.analytics !== false,
      seo: s.enabled_modules?.seo !== false,
      lead_capture: s.enabled_modules?.lead_capture !== false,
      ai: s.enabled_modules?.ai !== false,
    },
    pageviews_count: Number(s.pageviews_count || 0),
    conversions_count: Number(s.conversions_count || 0),
    monthly_ai_cap_sar: Number(s.monthly_ai_cap_sar || 500),
  }));

  return { websites, seoAudits: rawAudits, aiUsage: rawUsage };
}

export async function runLiveSiteSeoAudit(
  site: CrmGroupWebsite,
  actorEmail: string
): Promise<{ ok: boolean; audit?: CrmSiteSeoAuditReport; error?: string }> {
  try {
    const resp = await fetch('/api/marketing-sites/seo-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: site.domain }),
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok || !payload?.ok || !payload?.report) {
      return { ok: false, error: payload?.error || `HTTP ${resp.status}` };
    }
    const r = payload.report;
    const audit: CrmSiteSeoAuditReport = {
      id: `SEO-${site.id}-${Date.now().toString().slice(-5)}`,
      site_id: site.id,
      company_id: site.company_id,
      url_checked: site.domain,
      score: Number(r.score || 0),
      http_status: Number(r.httpStatus || 200),
      ttfb_ms: Number(r.ttfbMs || 0),
      title_text: String(r.titleText || ''),
      meta_description: String(r.metaDescription || ''),
      h1_count: Number(r.h1Count || 0),
      missing_alt_count: Number(r.missingAltCount || 0),
      has_https: Boolean(r.hasHttps),
      has_canonical: Boolean(r.hasCanonical),
      has_og: Boolean(r.hasOg),
      has_robots: Boolean(r.hasRobots),
      has_sitemap: Boolean(r.hasSitemap),
      issues_json: Array.isArray(r.issues) ? r.issues : [],
      audited_at: new Date().toISOString(),
    };

    await realErpDataStore.importRealRecordsBatch('crm_site_seo_audits', [audit]).catch(() => {});
    void actorEmail;
    return { ok: true, audit };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'تعذّر الاتصال بمحرك فحص السيو.' };
  }
}

export async function generateAiSiteGrowthPlan(params: {
  site: CrmGroupWebsite;
  latestAudit?: CrmSiteSeoAuditReport | null;
  currentMonthSpendSar: number;
  actorEmail: string;
}): Promise<{ ok: boolean; planText: string; costSar: number; blockedByCap?: boolean }> {
  const { site, latestAudit, currentMonthSpendSar, actorEmail } = params;
  if (currentMonthSpendSar >= site.monthly_ai_cap_sar) {
    return {
      ok: false,
      blockedByCap: true,
      costSar: 0,
      planText: `تم إيقاف الطلب تلقائياً: وصل استهلاك الذكاء الاصطناعي لهذا الموقع إلى السقف الشهري المحدد (${site.monthly_ai_cap_sar} ⃁).`,
    };
  }

  let planText = '';
  try {
    const resp = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'أنت خبير SEO ونمو رقمي سعودي. قدّم خطة عملية مركّزة لرفع زيارات وتحويلات الموقع: 1) عنوان ووصف Meta محسّن، 2) أهم 3 كلمات مفتاحية في السعودية، 3) فكرة صفحة هبوط وإعلان ممول، مع استخدام رمز الريال ⃁.',
          },
          {
            role: 'user',
            content: `الموقع: ${site.name_ar} (${site.domain}) | الشركة: ${site.company_id} | الزيارات: ${site.pageviews_count} | التحويلات: ${site.conversions_count} | درجة السيو: ${latestAudit?.score ?? site.last_seo_score ?? 'غير مفحوص'} | المشاكل المرصودة: ${
              latestAudit?.issues_json?.map((i) => i.messageAr).join('، ') || 'لا توجد مشاكل حرجة'
            }`,
          },
        ],
      }),
    });
    if (resp.ok) {
      const json = await resp.json().catch(() => null);
      planText = String(json?.content || json?.reply || json?.choices?.[0]?.message?.content || '').trim();
    }
  } catch {
    // Fallback below
  }

  if (!planText) {
    planText = [
      `1) مقترح العنوان والوصف المحسّن لـ «${site.name_ar}»:`,
      `• Title: ${site.name_ar} | حجز فوري موثق وضمان رسمي في السعودية`,
      `• Meta Description: استعرض خدمات ${site.name_ar} عبر ${site.domain} بتوثيق إلكتروني رسمي ومتابعة فورية خلال 15 دقيقة.`,
      `2) أهم 3 محاور كلمات مفتاحية مستهدفة:`,
      `• خدمات ${site.name_ar} الرياض • حجز إلكتروني سريع ومضمون • عروض باقات ${site.company_id}.`,
      `3) إجراء التحويل الفوري (CRO):`,
      `• تفعيل ويب هوك النماذج المباشر لربط صفحة الهبوط بلوحة مبيعات الـ CRM ورفع معدل التحويل الحالي (${
        site.pageviews_count > 0 ? ((site.conversions_count / site.pageviews_count) * 100).toFixed(2) : '0.00'
      }%).`,
    ].join('\n');
  }

  const costSar = 0.25;
  const usageEntry: CrmAiUsageEntry = {
    id: `AIU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    site_id: site.id,
    company_id: site.company_id,
    feature: 'site_content',
    model: 'default',
    tokens_used: 650,
    estimated_cost_sar: costSar,
    actor_email: actorEmail,
    month_key: new Date().toISOString().slice(0, 7),
    created_at: new Date().toISOString(),
  };
  await realErpDataStore.importRealRecordsBatch('crm_ai_usage_ledger', [usageEntry]).catch(() => {});

  return { ok: true, planText, costSar };
}
