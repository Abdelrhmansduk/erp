import React, { useEffect, useMemo, useState } from 'react';
import {
  Globe,
  Plus,
  Search,
  Sparkles,
  Code2,
  Activity,
  ShieldCheck,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
} from 'lucide-react';
import { formatSaudiRiyal } from '../../utils/saudiRiyal';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  type CrmAiUsageEntry,
  type CrmGroupWebsite,
  type CrmSiteSeoAuditReport,
  type GroupWebsiteModules,
  buildSiteIntegrationSnippets,
  generateAiSiteGrowthPlan,
  generateSiteKey,
  loadGroupWebsitesData,
  normalizeWebsiteDomain,
  runLiveSiteSeoAudit,
} from '../../services/crmGroupSitesService';

interface CrmGroupWebsitesHubTabProps {
  activeCompanyId: string;
  actorEmail: string;
  onSitesChanged?: (sites: CrmGroupWebsite[]) => void;
  onLeadCapturedFromWebhookTest?: () => Promise<void>;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const CrmGroupWebsitesHubTab: React.FC<CrmGroupWebsitesHubTabProps> = ({
  activeCompanyId,
  actorEmail,
  onSitesChanged,
  onLeadCapturedFromWebhookTest,
  onNotify,
}) => {
  const [websites, setWebsites] = useState<CrmGroupWebsite[]>([]);
  const [seoAudits, setSeoAudits] = useState<CrmSiteSeoAuditReport[]>([]);
  const [aiUsage, setAiUsage] = useState<CrmAiUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditingSiteId, setAuditingSiteId] = useState<string | null>(null);
  const [aiBusySiteId, setAiBusySiteId] = useState<string | null>(null);
  const [snippetSite, setSnippetSite] = useState<CrmGroupWebsite | null>(null);
  const [activeAuditModal, setActiveAuditModal] = useState<CrmSiteSeoAuditReport | null>(null);
  const [aiPlansBySite, setAiPlansBySite] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  const [newSiteForm, setNewSiteForm] = useState({
    name_ar: '',
    domain: '',
    company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
    monthly_ai_cap_sar: 600,
    analytics: true,
    seo: true,
    lead_capture: true,
    ai: true,
  });

  const reload = async () => {
    setLoading(true);
    try {
      const data = await loadGroupWebsitesData();
      setWebsites(data.websites);
      setSeoAudits(data.seoAudits);
      setAiUsage(data.aiUsage);
      onSitesChanged?.(data.websites);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopedSites = useMemo(
    () =>
      activeCompanyId === 'all'
        ? websites
        : websites.filter((s) => s.company_id.toUpperCase() === activeCompanyId.toUpperCase()),
    [websites, activeCompanyId]
  );

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const aiSpendBySite = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of aiUsage) {
      if (u.month_key === currentMonthKey && u.site_id) {
        map.set(u.site_id, (map.get(u.site_id) || 0) + Number(u.estimated_cost_sar || 0));
      }
    }
    return map;
  }, [aiUsage, currentMonthKey]);

  const kpis = useMemo(() => {
    const totalViews = scopedSites.reduce((s, w) => s + Number(w.pageviews_count || 0), 0);
    const totalConv = scopedSites.reduce((s, w) => s + Number(w.conversions_count || 0), 0);
    const scored = scopedSites.filter((w) => typeof w.last_seo_score === 'number');
    const avgSeo = scored.length
      ? Math.round(scored.reduce((s, w) => s + Number(w.last_seo_score || 0), 0) / scored.length)
      : 0;
    const totalAiCap = scopedSites.reduce((s, w) => s + Number(w.monthly_ai_cap_sar || 0), 0);
    const totalAiSpent = scopedSites.reduce((s, w) => s + (aiSpendBySite.get(w.id) || 0), 0);
    return { totalViews, totalConv, avgSeo, totalAiCap, totalAiSpent };
  }, [scopedSites, aiSpendBySite]);

  const persistWebsiteUpdate = async (nextList: CrmGroupWebsite[], changed: CrmGroupWebsite) => {
    setWebsites(nextList);
    onSitesChanged?.(nextList);
    await realErpDataStore.saveRecords('crm_group_websites', nextList);
    await realErpDataStore.importRealRecordsBatch('crm_group_websites', [changed]).catch(() => {});
  };

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = normalizeWebsiteDomain(newSiteForm.domain);
    if (!newSiteForm.name_ar.trim() || !cleanDomain) {
      onNotify('بيانات غير مكتملة', 'أدخل اسم الموقع ورابط النطاق الصحيح (مثال: https://example.com).', 'warning');
      return;
    }
    const site: CrmGroupWebsite = {
      id: `SITE-${newSiteForm.company_id}-${Date.now().toString().slice(-5)}`,
      company_id: newSiteForm.company_id,
      name_ar: newSiteForm.name_ar.trim(),
      domain: cleanDomain,
      site_key: generateSiteKey(newSiteForm.company_id),
      enabled_modules: {
        analytics: newSiteForm.analytics,
        seo: newSiteForm.seo,
        lead_capture: newSiteForm.lead_capture,
        ai: newSiteForm.ai,
      },
      last_seo_score: null,
      last_ttfb_ms: null,
      pageviews_count: 0,
      conversions_count: 0,
      monthly_ai_cap_sar: Number(newSiteForm.monthly_ai_cap_sar) || 500,
      status: 'نشط',
      created_by_email: actorEmail,
      created_at: new Date().toISOString(),
    };
    const next = [site, ...websites];
    await persistWebsiteUpdate(next, site);
    setShowAddModal(false);
    setNewSiteForm({ ...newSiteForm, name_ar: '', domain: '' });
    setSnippetSite(site);
    onNotify('تم تسجيل موقع المجموعة بنجاح', `تم تفعيل بوابة التحليلات والسيو والـ CRM للموقع (${site.name_ar}).`, 'success');
  };

  const handleToggleModule = async (site: CrmGroupWebsite, modKey: keyof GroupWebsiteModules) => {
    const updated: CrmGroupWebsite = {
      ...site,
      enabled_modules: { ...site.enabled_modules, [modKey]: !site.enabled_modules[modKey] },
      updated_at: new Date().toISOString(),
    };
    const next = websites.map((w) => (w.id === site.id ? updated : w));
    await persistWebsiteUpdate(next, updated);
  };

  const handleRunSeo = async (site: CrmGroupWebsite) => {
    setAuditingSiteId(site.id);
    try {
      const res = await runLiveSiteSeoAudit(site, actorEmail);
      if (!res.ok || !res.audit) {
        onNotify('تنبيه فحص السيو', res.error || 'تعذّر فحص الموقع.', 'warning');
        return;
      }
      const updated: CrmGroupWebsite = {
        ...site,
        last_seo_score: res.audit.score,
        last_ttfb_ms: res.audit.ttfb_ms,
        updated_at: new Date().toISOString(),
      };
      const next = websites.map((w) => (w.id === site.id ? updated : w));
      await persistWebsiteUpdate(next, updated);
      setSeoAudits((prev) => [res.audit!, ...prev]);
      setActiveAuditModal(res.audit);
      onNotify(
        `اكتمل فحص السيو (${res.audit.score}/100)`,
        `تم فحص (${site.domain}) بزمن استجابة ${res.audit.ttfb_ms}ms.`,
        'success'
      );
    } finally {
      setAuditingSiteId(null);
    }
  };

  const handleGenerateSiteAiPlan = async (site: CrmGroupWebsite) => {
    setAiBusySiteId(site.id);
    try {
      const latestAudit = seoAudits.find((a) => a.site_id === site.id) || null;
      const spent = aiSpendBySite.get(site.id) || 0;
      const res = await generateAiSiteGrowthPlan({
        site,
        latestAudit,
        currentMonthSpendSar: spent,
        actorEmail,
      });
      setAiPlansBySite((prev) => ({ ...prev, [site.id]: res.planText }));
      if (res.blockedByCap) {
        onNotify('سقف إنفاق الذكاء الاصطناعي', res.planText, 'warning');
      } else {
        setAiUsage((prev) => [
          {
            id: `AIU-LOCAL-${Date.now()}`,
            site_id: site.id,
            company_id: site.company_id,
            feature: 'site_content',
            model: 'default',
            tokens_used: 650,
            estimated_cost_sar: res.costSar,
            actor_email: actorEmail,
            month_key: currentMonthKey,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        onNotify('تم توليد خطة النمو والمحتوى بالذكاء الاصطناعي', `خطة مخصصة لموقع (${site.name_ar}).`, 'success');
      }
    } finally {
      setAiBusySiteId(null);
    }
  };

  const handleTestLeadWebhook = async (site: CrmGroupWebsite) => {
    try {
      const resp = await fetch('/api/marketing-sites/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteKey: site.site_key,
          fullName: `عميل رقمي — ${site.name_ar}`,
          phone: '+966550009988',
          city: 'الرياض',
          service: `طلب حجز وارد من ${site.name_ar}`,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (resp.ok && json?.ok) {
        await onLeadCapturedFromWebhookTest?.();
        await reload();
        onNotify(
          'نجح اختبار ربط الموقع بالـ CRM',
          `تم التقاط العميل (${json.leadNo}) وإدراجه تلقائياً في خط أنابيب المبيعات Kanban بمهلة 15 دقيقة.`,
          'success'
        );
      } else {
        onNotify('تنبيه اختبار الويب هوك', json?.error || 'تأكد من مزامنة الموقع مع السحابة أولاً.', 'warning');
      }
    } catch {
      onNotify('تنبيه اتصال', 'تعذّر الوصول إلى نقطة نهاية الويب هوك.', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* EveryApp-Style Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[24px] bg-[#141414] text-white">
          <div className="text-xs text-[#adadad] font-semibold">مواقع المجموعة المربوطة بالبوابة</div>
          <div className="text-3xl font-light font-mono mt-1.5">{scopedSites.length} مواقع</div>
          <div className="text-[11px] text-[#adadad] mt-1">عزل مفاتيح مركزي بدون كشف أسرار</div>
        </div>

        <div className="p-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]">
          <div className="text-xs text-[#707070] font-semibold">زيارات بدون كوكيز (OpenAnalytics)</div>
          <div className="text-2xl font-bold font-mono mt-1.5">{kpis.totalViews.toLocaleString('en-US')}</div>
          <div className="text-[11px] text-[#707070] mt-1">
            تحويلات للـ CRM: <strong className="text-[#141414] font-mono">{kpis.totalConv}</strong> • متوافق PDPL
          </div>
        </div>

        <div className="p-5 rounded-[24px] bg-white border border-[#e0e0e0] text-[#141414]">
          <div className="text-xs text-[#707070] font-semibold">متوسط صحة السيو التقني (OpenSEO)</div>
          <div className="text-2xl font-bold font-mono mt-1.5">{kpis.avgSeo}/100</div>
          <div className="text-[11px] text-[#707070] mt-1">فحص حي لـ Title • Meta • H1 • TTFB • HTTPS</div>
        </div>

        <div className="p-5 rounded-[24px] bg-white border border-[#e0e0e0] text-[#141414]">
          <div className="text-xs text-[#707070] font-semibold">استهلاك وسقف الذكاء الاصطناعي الشهري</div>
          <div className="text-xl font-bold font-mono mt-1.5">
            {formatSaudiRiyal(Number(kpis.totalAiSpent.toFixed(2)))} / {formatSaudiRiyal(kpis.totalAiCap)}
          </div>
          <div className="text-[11px] text-[#707070] mt-1">حماية تلقائية من تجاوز الميزانية (Usage Cap)</div>
        </div>
      </div>

      {/* Action Header */}
      <div className="p-5 rounded-[24px] bg-white border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#141414] m-0">
              منصة مواقع المجموعة الموحّدة (Analytics • Live SEO • CRM Webhook • AI Gateway)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#0066ff] text-white text-[10px] font-bold">
              EVERYAPP ENGINE
            </span>
          </div>
          <p className="text-xs text-[#707070] mt-1 mb-0">
            أضف أي موقع أو صفحة هبوط لشركات المجموعة لتحصل فوراً على كود تتبع خالٍ من الكوكيز، وفحص سيو حي، واستقبال تلقائي للعملاء في الـ CRM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#e0e0e0]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#262626]"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة موقع للمجموعة</span>
          </button>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scopedSites.map((site) => {
          const siteSpent = aiSpendBySite.get(site.id) || 0;
          const convRate =
            site.pageviews_count > 0
              ? ((site.conversions_count / site.pageviews_count) * 100).toFixed(2)
              : '0.00';

          return (
            <div
              key={site.id}
              className="p-5 rounded-[24px] bg-white border border-[#e0e0e0] flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-mono font-bold">
                        {site.company_id}
                      </span>
                      <h3 className="text-sm font-bold text-[#141414] m-0">{site.name_ar}</h3>
                    </div>
                    <a
                      href={site.domain}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#707070] font-mono hover:text-[#141414] underline mt-0.5 inline-block"
                    >
                      {site.domain}
                    </a>
                  </div>
                  <div className="text-left">
                    <div className="px-3 py-1 rounded-full bg-[#f3f3f3] text-xs font-bold font-mono text-[#141414]">
                      SEO: {site.last_seo_score ?? '—'}/100
                    </div>
                    {site.last_ttfb_ms ? (
                      <div className="text-[10px] text-[#707070] font-mono mt-0.5 text-center">
                        TTFB {site.last_ttfb_ms}ms
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-[14px] bg-[#f3f3f3]">
                    <div className="text-[10px] text-[#707070]">الزيارات</div>
                    <div className="text-sm font-bold font-mono text-[#141414]">
                      {site.pageviews_count.toLocaleString('en-US')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[14px] bg-[#f3f3f3]">
                    <div className="text-[10px] text-[#707070]">التحويلات للـ CRM</div>
                    <div className="text-sm font-bold font-mono text-[#141414]">
                      {site.conversions_count} ({convRate}%)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[14px] bg-[#f3f3f3]">
                    <div className="text-[10px] text-[#707070]">سقف AI الشهري</div>
                    <div className="text-xs font-bold font-mono text-[#141414]">
                      {siteSpent.toFixed(2)} / {site.monthly_ai_cap_sar} ⃁
                    </div>
                  </div>
                </div>

                {/* Module Toggles (EveryApp Capabilities) */}
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['analytics', 'تحليلات بدون كوكيز'],
                      ['seo', 'فاحص السيو'],
                      ['lead_capture', 'ربط نماذج CRM'],
                      ['ai', 'بوابة الذكاء الاصطناعي'],
                    ] as Array<[keyof GroupWebsiteModules, string]>
                  ).map(([modKey, label]) => {
                    const on = site.enabled_modules[modKey];
                    return (
                      <button
                        key={modKey}
                        type="button"
                        onClick={() => void handleToggleModule(site, modKey)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-colors ${
                          on
                            ? 'bg-[#141414] text-white'
                            : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {aiPlansBySite[site.id] && (
                  <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] text-xs text-[#141414] whitespace-pre-line leading-relaxed">
                    {aiPlansBySite[site.id]}
                  </div>
                )}
              </div>

              {/* Action Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#f0f0f0]">
                <button
                  type="button"
                  disabled={auditingSiteId === site.id || !site.enabled_modules.seo}
                  onClick={() => void handleRunSeo(site)}
                  className="px-3.5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#262626] disabled:opacity-40"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{auditingSiteId === site.id ? 'جارٍ الفحص الحي...' : 'فحص SEO حي الآن'}</span>
                </button>

                <button
                  type="button"
                  disabled={aiBusySiteId === site.id || !site.enabled_modules.ai}
                  onClick={() => void handleGenerateSiteAiPlan(site)}
                  className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#e0e0e0] disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiBusySiteId === site.id ? 'جارٍ التوليد...' : 'خطة AI للموقع'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSnippetSite(site)}
                  className="px-3.5 py-2 rounded-full bg-white border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#141414]"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>كود الربط</span>
                </button>

                <button
                  type="button"
                  disabled={!site.enabled_modules.lead_capture}
                  onClick={() => void handleTestLeadWebhook(site)}
                  className="px-3 py-2 rounded-full bg-white border border-[#e0e0e0] text-[#141414] text-xs font-semibold inline-flex items-center gap-1 hover:border-[#141414] disabled:opacity-40"
                  title="إرسال عميل تجريبي مباشر من هذا الموقع إلى لوحة مبيعات Kanban"
                >
                  <Send className="w-3 h-3" />
                  <span>اختبار Lead</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Group Website Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-[2050] bg-black/50 flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>إضافة موقع جديد إلى منظومة تسويق المجموعة</span>
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <X className="w-4 h-4 text-[#141414]" />
              </button>
            </div>
            <form onSubmit={handleAddWebsite} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم الموقع أو صفحة الهبوط</label>
                <input
                  type="text"
                  required
                  value={newSiteForm.name_ar}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, name_ar: e.target.value })}
                  placeholder="مثال: الموقع الرسمي لشركة السفير الماسي"
                  className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">رابط النطاق (URL)</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newSiteForm.domain}
                    onChange={(e) => setNewSiteForm({ ...newSiteForm, domain: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 font-mono focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">الشركة المالكة</label>
                  <select
                    value={newSiteForm.company_id}
                    onChange={(e) => setNewSiteForm({ ...newSiteForm, company_id: e.target.value })}
                    className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  >
                    <option value="SAF">السفير الماسي (SAF)</option>
                    <option value="TOP">توباز للاستقدام (TOP)</option>
                    <option value="YAQ">ياقوت نجد (YAQ)</option>
                    <option value="DAR">دار الرواد (DAR)</option>
                    <option value="KAS">كاس التجارية (KAS)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">سقف استهلاك الذكاء الاصطناعي الشهري للموقع (⃁)</label>
                <input
                  type="number"
                  min={50}
                  value={newSiteForm.monthly_ai_cap_sar}
                  onChange={(e) => setNewSiteForm({ ...newSiteForm, monthly_ai_cap_sar: Number(e.target.value) })}
                  className="w-full bg-[#f0f0f0] rounded-[16px] py-2.5 px-3 font-mono focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full border border-[#e0e0e0] font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
                >
                  تسجيل الموقع وتوليد مفاتيح الربط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Integration Snippets Modal */}
      {snippetSite && (
        <div
          className="fixed inset-0 z-[2050] bg-black/50 flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setSnippetSite(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const snippets = buildSiteIntegrationSnippets(
                snippetSite,
                typeof window !== 'undefined' ? window.location.origin : 'https://kas-erp.com'
              );
              return (
                <>
                  <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#141414] m-0">
                        أكواد ربط موقع «{snippetSite.name_ar}» ببوابة التسويق والـ CRM
                      </h3>
                      <div className="text-[11px] text-[#707070] font-mono mt-0.5">
                        Site Key: {snippetSite.site_key}
                      </div>
                    </div>
                    <button type="button" onClick={() => setSnippetSite(null)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <X className="w-4 h-4 text-[#141414]" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[#141414] flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          1. كود تحليلات الزوار بدون كوكيز (يوضع داخل &lt;head&gt;)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(snippets.analyticsTag);
                            onNotify('تم النسخ', 'تم نسخ وسم التتبع الخالي من الكوكيز.', 'success');
                          }}
                          className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ الوسم</span>
                        </button>
                      </div>
                      <pre dir="ltr" className="p-3 rounded-[14px] bg-[#f3f3f3] font-mono text-[11px] overflow-x-auto m-0">
                        {snippets.analyticsTag}
                      </pre>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[#141414] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          2. كود إرسال نماذج العملاء مباشرة إلى لوحة مبيعات الـ CRM
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(snippets.webhookExample);
                            onNotify('تم النسخ', 'تم نسخ كود ربط نموذج العملاء بالـ CRM.', 'success');
                          }}
                          className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>نسخ الكود</span>
                        </button>
                      </div>
                      <pre dir="ltr" className="p-3 rounded-[14px] bg-[#f3f3f3] font-mono text-[11px] overflow-x-auto m-0">
                        {snippets.webhookExample}
                      </pre>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Live SEO Audit Report Modal */}
      {activeAuditModal && (
        <div
          className="fixed inset-0 z-[2050] bg-black/50 flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setActiveAuditModal(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  تقرير الفحص الحي للسيو والأداء — {activeAuditModal.score}/100
                </h3>
                <div className="text-[11px] text-[#707070] font-mono mt-0.5">{activeAuditModal.url_checked}</div>
              </div>
              <button type="button" onClick={() => setActiveAuditModal(null)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <X className="w-4 h-4 text-[#141414]" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-[14px] bg-[#f3f3f3]">
                  <div className="text-[10px] text-[#707070]">درجة السيو</div>
                  <div className="text-base font-bold font-mono">{activeAuditModal.score}/100</div>
                </div>
                <div className="p-3 rounded-[14px] bg-[#f3f3f3]">
                  <div className="text-[10px] text-[#707070]">سرعة الاستجابة</div>
                  <div className="text-base font-bold font-mono">{activeAuditModal.ttfb_ms}ms</div>
                </div>
                <div className="p-3 rounded-[14px] bg-[#f3f3f3]">
                  <div className="text-[10px] text-[#707070]">عناوين H1 / صور بلا alt</div>
                  <div className="text-base font-bold font-mono">
                    {activeAuditModal.h1_count} / {activeAuditModal.missing_alt_count}
                  </div>
                </div>
                <div className="p-3 rounded-[14px] bg-[#f3f3f3]">
                  <div className="text-[10px] text-[#707070]">HTTPS / Sitemap</div>
                  <div className="text-xs font-bold">
                    {activeAuditModal.has_https ? 'آمن' : 'غير آمن'} • {activeAuditModal.has_sitemap ? 'متوفر' : 'ناقص'}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] space-y-1">
                <div><strong>العنوان المكتشف (Title):</strong> {activeAuditModal.title_text || '— غير موجود —'}</div>
                <div><strong>الوصف (Meta Description):</strong> {activeAuditModal.meta_description || '— غير موجود —'}</div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-[#141414]">الملاحظات والتشخيصات ({activeAuditModal.issues_json.length}):</div>
                {activeAuditModal.issues_json.length === 0 ? (
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] font-semibold">
                    ممتاز! لم يتم رصد أي مخالفات تقنية في الصفحة المفحوصة.
                  </div>
                ) : (
                  activeAuditModal.issues_json.map((iss, idx) => (
                    <div key={idx} className="p-3 rounded-[14px] bg-[#f3f3f3] flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#141414]" />
                      <span>{iss.messageAr}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmGroupWebsitesHubTab;
