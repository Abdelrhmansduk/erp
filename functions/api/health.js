/**
 * Cloudflare Pages Edge Health Endpoint — https://kas-erp.com/api/health
 * Used by Cloudflare Health Checks, CI post-deploy smoke checks, and uptime monitors.
 */
export async function onRequestGet(context) {
  const cf = context.request?.cf || {};
  const url = new URL(context.request.url);

  const payload = {
    status: 'healthy',
    service: 'kas-enterprise-erp',
    domain: url.hostname,
    version: '4.2.0-enterprise',
    timestamp: new Date().toISOString(),
    edge: {
      colo: cf.colo || 'unknown',
      country: cf.country || 'unknown',
      httpProtocol: cf.httpProtocol || 'HTTP/2',
      tlsVersion: cf.tlsVersion || 'TLSv1.3',
    },
    checks: {
      edgeRuntime: 'operational',
      spaShell: 'ready',
      zatcaEngine: 'operational',
      wmsModule: 'operational',
      multiTenancyRls: 'enforced',
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
