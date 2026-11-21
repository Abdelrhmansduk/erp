/**
 * KAS Marketing Sites & EveryApp-Style Modular Gateway (Server-Side Runtime-Agnostic)
 * -----------------------------------------------------------------------------------
 * Shared across Cloudflare Edge Worker (`cloudflare/edge-worker.mjs`) and Vite Dev Server.
 * Provides:
 *   1. `GET  /api/marketing-sites/collect.js` — Cookie-free PDPL-compliant web analytics snippet
 *   2. `POST /api/marketing-sites/collect`    — Receives pageviews & conversion events
 *   3. `POST /api/marketing-sites/seo-audit`  — SSRF-safe live HTML/SEO/TTFB auditor
 *   4. `POST /api/marketing-sites/lead`       — Captures website form leads straight into `crm_leads`
 */

/** Validates that a target URL is a safe public HTTP(S) origin (blocks SSRF to private/loopback IPs). */
export function validatePublicWebsiteUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    return { ok: false, error: 'رابط الموقع غير صالح.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'يُسمح فقط بروابط HTTP/HTTPS العامة.' };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    host.startsWith('[') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    !host.includes('.')
  ) {
    return { ok: false, error: 'رفض أمني (SSRF Guard): لا يُسمح بفحص عناوين الشبكة الداخلية أو المحلية.' };
  }
  return { ok: true, url: parsed.toString(), origin: parsed.origin, hostname: host };
}

/** Pure HTML technical SEO analyzer (0-100 score + actionable Arabic diagnostics). */
export function analyzeHtmlForSeo({ html, finalUrl, httpStatus, ttfbMs, hasRobots, hasSitemap }) {
  const src = String(html || '');
  const hasHttps = String(finalUrl || '').startsWith('https://');

  const titleMatch = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  const descMatch =
    src.match(/<meta[^>]+name=['"]description['"][^>]+content=['"]([^'"]*)['"]/i) ||
    src.match(/<meta[^>]+content=['"]([^'"]*)['"][^>]+name=['"]description['"]/i);
  const metaDescription = descMatch ? descMatch[1].trim() : '';

  const h1Matches = src.match(/<h1\b[^>]*>/gi) || [];
  const h1Count = h1Matches.length;

  const hasCanonical = /<link[^>]+rel=['"]canonical['"]/i.test(src);
  const hasOg = /<meta[^>]+property=['"]og:(title|description|image)['"]/i.test(src);
  const hasViewport = /<meta[^>]+name=['"]viewport['"]/i.test(src);

  const imgTags = src.match(/<img\b[^>]*>/gi) || [];
  let missingAltCount = 0;
  for (const tag of imgTags) {
    if (!/\balt\s*=/i.test(tag)) missingAltCount += 1;
  }

  let score = 100;
  const issues = [];

  if (httpStatus >= 400) {
    score -= 40;
    issues.push({ severity: 'critical', messageAr: `الموقع أعاد حالة خطأ HTTP ${httpStatus}.` });
  }
  if (!hasHttps) {
    score -= 15;
    issues.push({ severity: 'high', messageAr: 'الموقع لا يعمل ببروتوكول HTTPS الآمن.' });
  }
  if (!titleText) {
    score -= 15;
    issues.push({ severity: 'high', messageAr: 'وسم العنوان <title> مفقود تماماً.' });
  } else if (titleText.length < 15 || titleText.length > 70) {
    score -= 6;
    issues.push({ severity: 'medium', messageAr: `طول العنوان (${titleText.length} حرفاً) خارج النطاق المثالي (15–70 حرفاً).` });
  }
  if (!metaDescription) {
    score -= 15;
    issues.push({ severity: 'high', messageAr: 'الوصف التعريفي Meta Description مفقود.' });
  } else if (metaDescription.length < 50 || metaDescription.length > 170) {
    score -= 5;
    issues.push({ severity: 'low', messageAr: `طول الوصف التعريفي (${metaDescription.length} حرفاً) يفضّل أن يكون بين 50 و160 حرفاً.` });
  }
  if (h1Count === 0) {
    score -= 10;
    issues.push({ severity: 'medium', messageAr: 'لا يوجد عنوان رئيسي <h1> في الصفحة.' });
  } else if (h1Count > 1) {
    score -= 4;
    issues.push({ severity: 'low', messageAr: `يوجد ${h1Count} عناوين <h1> (يفضّل عنوان رئيسي واحد فقط).` });
  }
  if (!hasCanonical) {
    score -= 6;
    issues.push({ severity: 'low', messageAr: 'وسم الرابط الأساسي Canonical غير مضاف.' });
  }
  if (!hasOg) {
    score -= 6;
    issues.push({ severity: 'low', messageAr: 'وسوم المشاركة الاجتماعية OpenGraph غير مكتملة.' });
  }
  if (!hasViewport) {
    score -= 8;
    issues.push({ severity: 'medium', messageAr: 'وسم التوافق مع الجوال viewport غير موجود.' });
  }
  if (missingAltCount > 0) {
    score -= Math.min(10, missingAltCount * 2);
    issues.push({ severity: 'medium', messageAr: `يوجد ${missingAltCount} صورة بدون نص بديل (alt).` });
  }
  if (!hasRobots) {
    score -= 4;
    issues.push({ severity: 'low', messageAr: 'ملف robots.txt غير متوفر.' });
  }
  if (!hasSitemap) {
    score -= 5;
    issues.push({ severity: 'low', messageAr: 'ملف خريطة الموقع sitemap.xml غير متوفر.' });
  }
  if (ttfbMs > 1200) {
    score -= 8;
    issues.push({ severity: 'medium', messageAr: `زمن استجابة الخادم مرتفع (${ttfbMs}ms > 1200ms).` });
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    httpStatus,
    ttfbMs,
    titleText,
    metaDescription,
    h1Count,
    missingAltCount,
    hasHttps,
    hasCanonical,
    hasOg,
    hasRobots: Boolean(hasRobots),
    hasSitemap: Boolean(hasSitemap),
    issues,
  };
}

/** Builds the cookie-free (<1.5KB) browser tracker script served at `/api/marketing-sites/collect.js`. */
export function buildCollectorScriptJs(gatewayOrigin) {
  const endpoint = `${gatewayOrigin}/api/marketing-sites/collect`;
  return `(function(){try{var s=document.currentScript;var k=s&&s.getAttribute('data-site');if(!k)return;var u=new URL(location.href);var send=function(t){var p={siteKey:k,eventType:t||'pageview',path:u.pathname,referrer:document.referrer||'',utmSource:u.searchParams.get('utm_source')||'',utmMedium:u.searchParams.get('utm_medium')||'',utmCampaign:u.searchParams.get('utm_campaign')||'',deviceType:innerWidth<768?'mobile':'desktop'};fetch(${JSON.stringify(endpoint)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true}).catch(function(){});};send('pageview');window.kasTrack=send;}catch(e){}})();`;
}

async function lookupSiteByKey(supabaseUrl, serviceKey, siteKey) {
  if (!supabaseUrl || !serviceKey || !siteKey) return null;
  const resp = await fetch(
    `${supabaseUrl}/rest/v1/crm_group_websites?site_key=eq.${encodeURIComponent(siteKey)}&select=*&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!resp.ok) return null;
  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/** Unified handler for `/api/marketing-sites/*` routes. */
export async function handleMarketingSitesGateway({
  method,
  pathname,
  origin,
  body,
  country,
  supabaseUrl,
  serviceKey,
  assetsFetcher,
}) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-KAS-Webhook-Secret',
  };

  if (method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders, rawBody: '' };
  }

  // 1. Cookie-free tracker JS
  if (pathname === '/api/marketing-sites/collect.js' && method === 'GET') {
    return {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
      rawBody: buildCollectorScriptJs(origin),
    };
  }

  // 2. Collect analytics event
  if (pathname === '/api/marketing-sites/collect' && method === 'POST') {
    const siteKey = String(body?.siteKey || '').trim();
    const site = await lookupSiteByKey(supabaseUrl, serviceKey, siteKey);
    if (!site || site.enabled_modules?.analytics === false) {
      return { status: 404, headers: corsHeaders, jsonBody: { ok: false, error: 'Unknown or disabled site_key' } };
    }
    const eventType = ['pageview', 'conversion', 'cta_click'].includes(body?.eventType) ? body.eventType : 'pageview';
    const evt = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      site_id: site.id,
      company_id: site.company_id || 'SAF',
      path: String(body?.path || '/').slice(0, 240),
      referrer: String(body?.referrer || '').slice(0, 240) || null,
      utm_source: String(body?.utmSource || '').slice(0, 80) || null,
      utm_medium: String(body?.utmMedium || '').slice(0, 80) || null,
      utm_campaign: String(body?.utmCampaign || '').slice(0, 120) || null,
      device_type: body?.deviceType === 'mobile' ? 'mobile' : 'desktop',
      country: String(country || 'SA').slice(0, 8),
      event_type: eventType,
    };
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };
    await fetch(`${supabaseUrl}/rest/v1/crm_site_analytics_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(evt),
    }).catch(() => {});

    const patch =
      eventType === 'conversion'
        ? { conversions_count: Number(site.conversions_count || 0) + 1, updated_at: new Date().toISOString() }
        : { pageviews_count: Number(site.pageviews_count || 0) + 1, updated_at: new Date().toISOString() };
    await fetch(`${supabaseUrl}/rest/v1/crm_group_websites?id=eq.${encodeURIComponent(site.id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    }).catch(() => {});

    return { status: 200, headers: corsHeaders, jsonBody: { ok: true } };
  }

  // 3. Live SSRF-safe SEO Audit
  if (pathname === '/api/marketing-sites/seo-audit' && method === 'POST') {
    const check = validatePublicWebsiteUrl(body?.url);
    if (!check.ok) {
      return { status: 400, headers: corsHeaders, jsonBody: { ok: false, error: check.error } };
    }
    try {
      const isSelfZone =
        assetsFetcher &&
        (check.hostname === 'kas-erp.com' || check.hostname.endsWith('.kas-erp.com'));
      const doFetch = (targetUrl, opts = {}) =>
        isSelfZone ? assetsFetcher.fetch(new Request(targetUrl, opts)) : fetch(targetUrl, opts);

      const t0 = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const pageResp = await doFetch(check.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KAS-Marketing-SEO-Auditor/1.0)' },
        redirect: 'follow',
        signal: ctrl.signal,
      });
      const ttfbMs = Math.max(1, Date.now() - t0);
      const html = (await pageResp.text()).slice(0, 250000);
      clearTimeout(timer);

      const [robotsRes, sitemapRes] = await Promise.all([
        doFetch(`${check.origin}/robots.txt`, { method: 'GET' }).catch(() => null),
        doFetch(`${check.origin}/sitemap.xml`, { method: 'GET' }).catch(() => null),
      ]);
      const isNonHtmlAsset = (res) =>
        Boolean(res && res.ok && !(res.headers.get('content-type') || '').includes('text/html'));

      const report = analyzeHtmlForSeo({
        html,
        finalUrl: pageResp.url || check.url,
        httpStatus: pageResp.status,
        ttfbMs,
        hasRobots: isNonHtmlAsset(robotsRes),
        hasSitemap: isNonHtmlAsset(sitemapRes),
      });

      return { status: 200, headers: corsHeaders, jsonBody: { ok: true, report } };
    } catch (err) {
      return {
        status: 502,
        headers: corsHeaders,
        jsonBody: { ok: false, error: `تعذّر الوصول إلى الموقع لفحصه: ${err?.message || 'Timeout'}` },
      };
    }
  }

  // 4. Website Lead Webhook -> Direct CRM Kanban Lead
  if (pathname === '/api/marketing-sites/lead' && method === 'POST') {
    const siteKey = String(body?.siteKey || '').trim();
    const fullName = String(body?.fullName || body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    if (!siteKey || !fullName || !phone) {
      return { status: 400, headers: corsHeaders, jsonBody: { ok: false, error: 'siteKey, fullName, and phone are required' } };
    }
    const site = await lookupSiteByKey(supabaseUrl, serviceKey, siteKey);
    if (!site || site.enabled_modules?.lead_capture === false) {
      return { status: 404, headers: corsHeaders, jsonBody: { ok: false, error: 'Unknown or disabled site_key' } };
    }
    const companyId = site.company_id || 'SAF';
    const nowIso = new Date().toISOString();
    const leadId = `LED-WEB-${Date.now().toString().slice(-6)}`;
    const leadRow = {
      id: leadId,
      company_id: companyId,
      lead_no: `WEB-${companyId}-${Date.now().toString().slice(-4)}`,
      full_name: fullName.slice(0, 120),
      phone: phone.slice(0, 32),
      city: String(body?.city || 'الرياض').slice(0, 60),
      client_type: 'شخص',
      service_interest: String(body?.service || `طلب وارد من ${site.name_ar}`).slice(0, 140),
      preferred_nationality: body?.nationality ? String(body.nationality).slice(0, 60) : null,
      source_platform: 'google',
      utm_campaign: String(body?.utmCampaign || site.site_key).slice(0, 120),
      stage: 'new',
      probability_pct: 10,
      estimated_value_sar: Number(body?.estimatedValueSar) || 17500,
      assigned_to_email: 'm.alkhader.marketing@kas.sa',
      assigned_to_name: 'فريق مبيعات البوابة الرقمية',
      captured_by_email: 'website-gateway@kas.sa',
      sla_due_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      last_activity_at: nowIso,
      retargeting_bucket: 'hot_1_7d',
      marketing_consent: body?.marketingConsent !== false,
      notes: `تم الالتقاط تلقائياً من موقع (${site.name_ar} — ${site.domain})`,
      created_at: nowIso,
    };

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };
    const ins = await fetch(`${supabaseUrl}/rest/v1/crm_leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(leadRow),
    });
    if (!ins.ok) {
      return { status: 502, headers: corsHeaders, jsonBody: { ok: false, error: `Upstream HTTP ${ins.status}` } };
    }
    await fetch(`${supabaseUrl}/rest/v1/crm_group_websites?id=eq.${encodeURIComponent(site.id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        conversions_count: Number(site.conversions_count || 0) + 1,
        updated_at: nowIso,
      }),
    }).catch(() => {});

    return { status: 200, headers: corsHeaders, jsonBody: { ok: true, leadId, leadNo: leadRow.lead_no } };
  }

  return { status: 404, headers: corsHeaders, jsonBody: { ok: false, error: 'not_found' } };
}
