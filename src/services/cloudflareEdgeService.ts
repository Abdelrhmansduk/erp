/**
 * Cloudflare Pro ($25) Edge Security, Turnstile & Proxy Client Service — kas-erp.com
 */

export interface CloudflareEdgeContext {
  ok: boolean;
  provider: 'cloudflare-pages-pro' | 'local-dev';
  domain: string;
  environment: 'production' | 'staging' | 'development';
  timestamp: string;
  latencyMs?: number;
  network: {
    colo: string;
    country: string;
    city: string | null;
    httpProtocol: string;
    tlsVersion: string;
    tlsCipher: string | null;
    asn: number | null;
  };
  security: {
    zeroTrustActive: boolean;
    zeroTrustUser: string | null;
    turnstileEnforced: boolean;
    supabaseProxyReady: boolean;
    wafManaged: boolean;
    hstsPreload: boolean;
  };
}

export interface TurnstileVerificationResult {
  ok: boolean;
  mode: 'enforced' | 'standby' | 'local-bypass' | 'error';
  verified: boolean;
  errorAr?: string;
}

export function getTurnstileSiteKey(): string {
  const key = (import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '').trim();
  return key;
}

export function isLocalDevHostname(hostname?: string): boolean {
  const h = (
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')
  ).toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '';
}

/**
 * Returns true when Cloudflare Turnstile should be rendered and enforced on Login.
 * Automatically stays in standby on localhost unless VITE_CLOUDFLARE_TURNSTILE_LOCAL=true.
 */
export function isTurnstileEnabled(hostname?: string): boolean {
  const siteKey = getTurnstileSiteKey();
  if (!siteKey) return false;
  if (isLocalDevHostname(hostname) && import.meta.env.VITE_CLOUDFLARE_TURNSTILE_LOCAL !== 'true') {
    return false;
  }
  return true;
}

/**
 * Resolves the effective Supabase URL, routing through the first-party Cloudflare Pages
 * Edge Proxy (/api/supabase-proxy) when explicitly enabled via VITE_USE_CLOUDFLARE_SUPABASE_PROXY=true
 * on a remote Cloudflare deployment.
 */
export function resolveSupabaseEdgeUrl(
  rawUrl: string,
  options?: { useEdgeProxy?: boolean; origin?: string; hostname?: string }
): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const useProxy =
    options?.useEdgeProxy ??
    import.meta.env.VITE_USE_CLOUDFLARE_SUPABASE_PROXY === 'true';

  if (!useProxy) return trimmed;

  const host = options?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const origin = options?.origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

  if (isLocalDevHostname(host) || !origin.startsWith('https://')) {
    return trimmed;
  }

  return `${origin.replace(/\/+$/, '')}/api/supabase-proxy`;
}

/**
 * Verifies a Cloudflare Turnstile token via the first-party Edge Function /api/turnstile-verify.
 */
export async function verifyTurnstileTokenAtEdge(
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<TurnstileVerificationResult> {
  if (!isTurnstileEnabled()) {
    return { ok: true, mode: 'standby', verified: false };
  }

  const cleanToken = token.trim();
  if (!cleanToken) {
    return {
      ok: false,
      mode: 'enforced',
      verified: false,
      errorAr: 'يرجى إكمال التحقق الأمني (Cloudflare Turnstile) قبل تسجيل الدخول.',
    };
  }

  try {
    const res = await fetchImpl('/api/turnstile-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });

    // If running in local preview without Cloudflare Pages Functions runtime
    if (res.status === 404 && isLocalDevHostname()) {
      return { ok: true, mode: 'local-bypass', verified: false };
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      return {
        ok: true,
        mode: data.mode === 'standby' ? 'standby' : 'enforced',
        verified: Boolean(data.verified),
      };
    }

    return {
      ok: false,
      mode: 'enforced',
      verified: false,
      errorAr:
        data?.errorAr ||
        'تعذر التحقق الأمني عبر Cloudflare Turnstile. يرجى تحديث التحقق والمحاولة مرة أخرى.',
    };
  } catch {
    if (isLocalDevHostname()) {
      return { ok: true, mode: 'local-bypass', verified: false };
    }
    return {
      ok: false,
      mode: 'error',
      verified: false,
      errorAr: 'تعذر الاتصال بخدمة التحقق الأمني عبر Cloudflare Edge. يرجى إعادة المحاولة.',
    };
  }
}

/**
 * Fetches live Cloudflare Pro Edge & Security telemetry from /api/edge-context.
 */
export async function fetchCloudflareEdgeContext(
  fetchImpl: typeof fetch = fetch
): Promise<CloudflareEdgeContext> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const fallbackHost = typeof window !== 'undefined' ? window.location.hostname : 'kas-erp.com';

  try {
    const res = await fetchImpl('/api/edge-context', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const elapsed = Math.max(
      1,
      Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt)
    );

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as CloudflareEdgeContext;
        return { ...data, latencyMs: elapsed };
      }
    }
  } catch {
    // Fallback cleanly for local dev Vite server
  }

  return {
    ok: true,
    provider: 'local-dev',
    domain: fallbackHost,
    environment: 'development',
    timestamp: new Date().toISOString(),
    latencyMs: 0,
    network: {
      colo: 'LOCAL',
      country: 'SA',
      city: 'Riyadh (Dev)',
      httpProtocol: 'HTTP/1.1',
      tlsVersion: 'Local Dev',
      tlsCipher: null,
      asn: null,
    },
    security: {
      zeroTrustActive: false,
      zeroTrustUser: null,
      turnstileEnforced: isTurnstileEnabled(),
      supabaseProxyReady: import.meta.env.VITE_USE_CLOUDFLARE_SUPABASE_PROXY === 'true',
      wafManaged: false,
      hstsPreload: false,
    },
  };
}
