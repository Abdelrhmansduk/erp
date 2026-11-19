/**
 * Cloudflare Pages First-Party Edge Proxy for Supabase:
 * Routes https://kas-erp.com/api/supabase-proxy/* -> env.SUPABASE_UPSTREAM_URL (or env.VITE_SUPABASE_URL)
 * Benefits:
 * - Protects all ERP DB/Auth/Storage traffic behind Cloudflare Pro WAF, Rate Limiting & DDoS
 * - Eliminates corporate firewall/ISP blocking of *.supabase.co
 * - Strictly allowlists Supabase API prefixes to prevent SSRF
 */
const ALLOWED_PREFIXES = ['rest/v1/', 'auth/v1/', 'storage/v1/', 'functions/v1/'];

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-profile',
  'apikey',
  'authorization',
  'content-profile',
  'content-type',
  'prefer',
  'range',
  'range-unit',
  'x-client-info',
  'x-supabase-api-version',
  'x-upsert',
];

function buildCorsHeaders(request) {
  const origin = request.headers.get('Origin') || 'https://kas-erp.com';
  const isKasSubdomain = /^https:\/\/[a-z0-9-]+\.kas-erp\.com$/i.test(origin);
  const allowedOrigin =
    origin === 'https://kas-erp.com' ||
    isKasSubdomain ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
      ? origin
      : 'https://kas-erp.com';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': FORWARDED_REQUEST_HEADERS.join(', '),
    'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count, X-KAS-Edge-Proxy',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const corsHeaders = buildCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const upstreamBase = String(env?.SUPABASE_UPSTREAM_URL || env?.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');

  if (!upstreamBase || !upstreamBase.startsWith('https://')) {
    return new Response(
      JSON.stringify({
        error: 'supabase_proxy_unconfigured',
        message: 'Set SUPABASE_UPSTREAM_URL or VITE_SUPABASE_URL in Cloudflare Pages environment variables.',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  const rawSegments = Array.isArray(params?.path)
    ? params.path
    : params?.path
      ? [params.path]
      : [];
  const relativePath = rawSegments.join('/');

  if (
    !relativePath ||
    relativePath.includes('..') ||
    relativePath.includes('//') ||
    !ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
  ) {
    return new Response(
      JSON.stringify({
        error: 'forbidden_proxy_path',
        message: 'Requested upstream path is not in the Supabase proxy allowlist.',
      }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = `${upstreamBase}/${relativePath}${incomingUrl.search}`;

  const proxyHeaders = new Headers();
  for (const h of FORWARDED_REQUEST_HEADERS) {
    const val = request.headers.get(h);
    if (val !== null) {
      proxyHeaders.set(h, val);
    }
  }

  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) {
    proxyHeaders.set('X-Forwarded-For', clientIp);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase());

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  });

  const outHeaders = new Headers(upstreamResponse.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    outHeaders.set(k, v);
  }
  outHeaders.set('X-KAS-Edge-Proxy', 'cloudflare-pro');
  outHeaders.set('Cache-Control', 'no-store');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: outHeaders,
  });
}
