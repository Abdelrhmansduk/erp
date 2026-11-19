/**
 * Cloudflare Pages Global Edge Middleware — kas-erp.com & staging.kas-erp.com
 * - Enforces canonical domain (www.kas-erp.com -> kas-erp.com)
 * - Prevents search-engine indexing of staging/preview hosts
 * - Attaches Edge Request-ID, Colo, and Cloudflare Zero Trust Access status headers
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();

  // 1. Canonical apex redirect: www.kas-erp.com -> kas-erp.com
  if (host === 'www.kas-erp.com') {
    url.hostname = 'kas-erp.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();
  const nextHeaders = new Headers(response.headers);

  const cf = context.request.cf || {};
  const isStagingOrPreview =
    host === 'staging.kas-erp.com' ||
    host.endsWith('.pages.dev') ||
    host.startsWith('preview.');

  // 2. Request tracing & edge telemetry headers
  if (!nextHeaders.has('X-Request-Id')) {
    nextHeaders.set('X-Request-Id', crypto.randomUUID());
  }
  if (cf.colo) {
    nextHeaders.set('X-KAS-Edge-Colo', String(cf.colo));
  }
  nextHeaders.set('X-KAS-Environment', isStagingOrPreview ? 'staging' : 'production');

  // 3. Block search engine indexing on staging & preview environments
  if (isStagingOrPreview) {
    nextHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  // 4. Reflect Cloudflare Zero Trust Access verification (without leaking PII in headers)
  const accessEmail = context.request.headers.get('Cf-Access-Authenticated-User-Email');
  if (accessEmail) {
    nextHeaders.set('X-KAS-ZeroTrust', 'verified');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  });
}
