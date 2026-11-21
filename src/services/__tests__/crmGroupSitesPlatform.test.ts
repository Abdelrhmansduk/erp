import { describe, it, expect } from 'vitest';
// @ts-ignore - shared pure ESM gateway module
import { validatePublicWebsiteUrl, analyzeHtmlForSeo, buildCollectorScriptJs } from '../../../scripts/lib/marketingSitesGateway.mjs';
import {
  generateSiteKey,
  normalizeWebsiteDomain,
  buildSiteIntegrationSnippets,
  DEFAULT_GROUP_WEBSITES,
} from '../crmGroupSitesService';

describe('EveryApp-Style Group Websites Marketing Gateway & SEO Engine', () => {
  it('enforces strict SSRF protection against localhost and private RFC1918 networks', () => {
    expect(validatePublicWebsiteUrl('https://saf.kas-erp.com').ok).toBe(true);
    expect(validatePublicWebsiteUrl('http://localhost:5180').ok).toBe(false);
    expect(validatePublicWebsiteUrl('http://127.0.0.1:8080/admin').ok).toBe(false);
    expect(validatePublicWebsiteUrl('http://192.168.1.1').ok).toBe(false);
    expect(validatePublicWebsiteUrl('http://10.0.0.5').ok).toBe(false);
    expect(validatePublicWebsiteUrl('http://172.20.0.1').ok).toBe(false);
    expect(validatePublicWebsiteUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
    expect(validatePublicWebsiteUrl('file:///etc/passwd').ok).toBe(false);
  });

  it('computes accurate technical SEO score and flags missing tags & alt attributes', () => {
    const perfectHtml = `
      <!doctype html>
      <html>
        <head>
          <title>شركة السفير الماسي للاستقدام — حجز فوري موثق عبر مساند</title>
          <meta name="description" content="استقدام نخبة الكوادر المنزلية المدربة في الرياض وكافة مدن المملكة بتوثيق مساند الرسمي وضمان 90 يوماً." />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="canonical" href="https://saf.kas-erp.com/" />
          <meta property="og:title" content="السفير الماسي" />
        </head>
        <body>
          <h1>استقدام الكوادر المنزلية الموثقة</h1>
          <img src="/hero.webp" alt="بوابة السفير" />
        </body>
      </html>
    `;
    const good = analyzeHtmlForSeo({
      html: perfectHtml,
      finalUrl: 'https://saf.kas-erp.com/',
      httpStatus: 200,
      ttfbMs: 180,
      hasRobots: true,
      hasSitemap: true,
    });
    expect(good.score).toBe(100);
    expect(good.issues).toHaveLength(0);

    const weak = analyzeHtmlForSeo({
      html: '<html><body><img src="/a.png"><img src="/b.png"></body></html>',
      finalUrl: 'http://example.com',
      httpStatus: 200,
      ttfbMs: 1500,
      hasRobots: false,
      hasSitemap: false,
    });
    expect(weak.score).toBeLessThan(40);
    expect(weak.missingAltCount).toBe(2);
    expect(weak.issues.length).toBeGreaterThanOrEqual(6);
  });

  it('generates cookie-free PDPL-compliant collector script and valid site integration snippets', () => {
    const js = buildCollectorScriptJs('https://kas-erp.com');
    expect(js).toContain('https://kas-erp.com/api/marketing-sites/collect');
    expect(js).not.toContain('document.cookie');
    expect(js).not.toContain('localStorage');

    expect(normalizeWebsiteDomain('saf.kas-erp.com')).toBe('https://saf.kas-erp.com');
    const key = generateSiteKey('SAF');
    expect(key.startsWith('kas_site_saf_')).toBe(true);

    const snippets = buildSiteIntegrationSnippets(DEFAULT_GROUP_WEBSITES[0], 'https://kas-erp.com');
    expect(snippets.analyticsTag).toContain('data-site="kas_site_saf_01"');
    expect(snippets.webhookEndpoint).toBe('https://kas-erp.com/api/marketing-sites/lead');
  });
});
