/**
 * Cloudflare Pages Edge Telemetry Endpoint: GET /api/edge-context
 * Exposes safe, non-secret Cloudflare Pro edge & security diagnostics for the ERP Settings UI.
 */
export async function onRequestGet(context) {
  const cf = context.request?.cf || {};
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const isStaging =
    host === 'staging.kas-erp.com' ||
    host.endsWith('.pages.dev') ||
    host.startsWith('preview.');

  const zeroTrustEmail =
    context.request.headers.get('Cf-Access-Authenticated-User-Email') || null;

  const payload = {
    ok: true,
    provider: 'cloudflare-pages-pro',
    domain: host,
    environment: isStaging ? 'staging' : 'production',
    timestamp: new Date().toISOString(),
    network: {
      colo: cf.colo || 'UNKNOWN',
      country: cf.country || 'UNKNOWN',
      city: cf.city || null,
      httpProtocol: cf.httpProtocol || 'HTTP/2',
      tlsVersion: cf.tlsVersion || 'TLSv1.3',
      tlsCipher: cf.tlsCipher || null,
      asn: cf.asn || null,
    },
    security: {
      zeroTrustActive: Boolean(zeroTrustEmail),
      zeroTrustUser: zeroTrustEmail,
      turnstileEnforced: Boolean(context.env?.TURNSTILE_SECRET_KEY),
      supabaseProxyReady: Boolean(
        context.env?.SUPABASE_UPSTREAM_URL || context.env?.VITE_SUPABASE_URL
      ),
      wafManaged: true,
      hstsPreload: true,
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
