/**
 * Supabase Edge Function: Gov Gateway Proxy (Mudad, GOSI, Qiwa, Muqeem, ZATCA, B2B Bank)
 * Environment Secrets read strictly from Deno.env.get(...)
 * Compatible with defaultGovTransport in src/services/govIntegrationHubService.ts:
 *   POST /gov-gateway/:agencyId
 *   Headers: Idempotency-Key, X-Company-Id, X-Gov-Environment
 *   Body: { format: string, body: string }
 *   Response: { ok: true, agencyId, reference, environment, idempotencyKey, processedAt, upstreamMode }
 */

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed =
    origin === 'https://kas-erp.com' ||
    /^https:\/\/[a-z0-9-]+\.kas-erp\.com$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.kas-erp\.workers\.dev$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://kas-erp.com',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, idempotency-key, x-company-id, x-gov-environment',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

async function verifyAuthorizedCaller(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const apikey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
  if (!/^Bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/.test(authHeader) || !supabaseUrl || !apikey) {
    return false;
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

const SUPPORTED_AGENCIES = new Set([
  'zatca',
  'mudad',
  'gosi',
  'qiwa',
  'muqeem',
  'musaned',
  'etec',
  'mol',
  'saudi-post',
  'cchi',
  'tawtheeq',
  'b2b-bank',
]);

const ENV_UPSTREAM_MAP: Record<string, string> = {
  zatca: 'GOV_ZATCA_ENDPOINT',
  mudad: 'GOV_MUDAD_ENDPOINT',
  gosi: 'GOV_GOSI_ENDPOINT',
  qiwa: 'GOV_QIWA_ENDPOINT',
  muqeem: 'GOV_MUQEEM_ENDPOINT',
  musaned: 'GOV_MUSANED_ENDPOINT',
  etec: 'GOV_ETEC_ENDPOINT',
  mol: 'GOV_MOL_ENDPOINT',
  'saudi-post': 'GOV_SPL_ENDPOINT',
  cchi: 'GOV_CCHI_ENDPOINT',
  tawtheeq: 'GOV_TAWTHEEQ_ENDPOINT',
  'b2b-bank': 'GOV_B2B_BANK_ENDPOINT',
};

const ENV_TOKEN_MAP: Record<string, string> = {
  zatca: 'GOV_ZATCA_TOKEN',
  mudad: 'GOV_MUDAD_TOKEN',
  gosi: 'GOV_GOSI_TOKEN',
  qiwa: 'GOV_QIWA_TOKEN',
  muqeem: 'GOV_MUQEEM_TOKEN',
  musaned: 'GOV_MUSANED_TOKEN',
  etec: 'GOV_ETEC_TOKEN',
  mol: 'GOV_MOL_TOKEN',
  'saudi-post': 'GOV_SPL_TOKEN',
  cchi: 'GOV_CCHI_TOKEN',
  tawtheeq: 'GOV_TAWTHEEQ_TOKEN',
  'b2b-bank': 'GOV_B2B_BANK_TOKEN',
};

const AGENCY_PREFIX: Record<string, string> = {
  zatca: 'ZATCA-EINV',
  mudad: 'MUDAD-WPS',
  gosi: 'GOSI-SOC',
  qiwa: 'QIWA-CNT',
  muqeem: 'MUQEEM-IQM',
  musaned: 'MUSANED-CNT',
  etec: 'QAYIM-IND',
  mol: 'MOL-HRSD',
  'saudi-post': 'SPL-NAT',
  cchi: 'CCHI-MED',
  tawtheeq: 'TAW-MSG',
  'b2b-bank': 'B2B-ISO20022',
};

// In-memory idempotency cache for warm Edge worker isolates
const idempotencyStore = new Map<string, { reference: string; processedAt: string; upstreamMode: string }>();

async function sha256ShortHex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 6)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

Deno.serve(async (req: Request): Promise<Response> => {
  const CORS_HEADERS = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // Require authenticated ERP JWT in production (opt-out only via GOV_REQUIRE_AUTH=0 for local smoke)
  if (Deno.env.get('GOV_REQUIRE_AUTH') !== '0' && !(await verifyAuthorizedCaller(req))) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized ERP session' }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const agencyId = (segments[segments.length - 1] || '').toLowerCase();

    if (!SUPPORTED_AGENCIES.has(agencyId)) {
      return new Response(
        JSON.stringify({ error: `Unsupported government/bank agency endpoint: ${agencyId}` }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const companyId = req.headers.get('x-company-id') || 'SAF';
    const govEnvironment = (req.headers.get('x-gov-environment') || 'SANDBOX').toUpperCase();
    const idempotencyKey = req.headers.get('idempotency-key') || `${companyId}-${agencyId}-${Date.now()}`;
    const cacheKey = `${companyId}:${agencyId}:${idempotencyKey}`;

    const cached = idempotencyStore.get(cacheKey);
    if (cached) {
      return new Response(
        JSON.stringify({
          ok: true,
          replayed: true,
          agencyId,
          companyId,
          environment: govEnvironment,
          idempotencyKey,
          ...cached,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const payload = (await req.json()) as {
      action?: 'push' | 'pull';
      resource?: string;
      sinceIso?: string;
      format?: string;
      body?: string;
    };

    // Pull mode: fetch live contracts / visas / arrivals from Musaned (or other agencies) into the ERP
    if (payload?.action === 'pull') {
      const upstreamUrl = Deno.env.get(ENV_UPSTREAM_MAP[agencyId]);
      const upstreamToken = Deno.env.get(ENV_TOKEN_MAP[agencyId]);
      const resource = String(payload?.resource || 'contracts').replace(/[^a-z0-9_-]/gi, '');
      const sinceIso = typeof payload?.sinceIso === 'string' ? payload.sinceIso.trim() : '';

      if (upstreamUrl && upstreamToken && govEnvironment === 'PRODUCTION') {
        const pullUrl = new URL(`${upstreamUrl.replace(/\/+$/, '')}/${resource}`);
        if (sinceIso) pullUrl.searchParams.set('since', sinceIso);
        const pullRes = await fetch(pullUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${upstreamToken}`,
            Accept: 'application/json',
            'X-Company-Id': companyId,
            'Idempotency-Key': idempotencyKey,
          },
        });
        if (!pullRes.ok) {
          const errText = await pullRes.text();
          return new Response(
            JSON.stringify({
              ok: false,
              agencyId,
              status: pullRes.status,
              error: `Upstream ${agencyId} pull failed: ${errText.slice(0, 240)}`,
            }),
            { status: 502, headers: CORS_HEADERS }
          );
        }
        const upJson = (await pullRes.json().catch(() => ({}))) as { records?: unknown[]; data?: unknown[] };
        const records = Array.isArray(upJson.records)
          ? upJson.records
          : Array.isArray(upJson.data)
            ? upJson.data
            : Array.isArray(upJson)
              ? upJson
              : [];
        return new Response(
          JSON.stringify({
            ok: true,
            action: 'pull',
            agencyId,
            companyId,
            resource,
            environment: govEnvironment,
            upstreamMode: 'LIVE_M2M',
            records,
            processedAt: new Date().toISOString(),
          }),
          { status: 200, headers: CORS_HEADERS }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          action: 'pull',
          agencyId,
          companyId,
          resource,
          environment: govEnvironment,
          upstreamMode: 'EDGE_CERTIFIED_SANDBOX',
          records: [],
          noteAr: 'بوابة السحب جاهزة ومؤمّنة — أضف GOV_MUSANED_ENDPOINT و GOV_MUSANED_TOKEN في أسرار الخادم لبدء السحب الحي من مساند.',
          processedAt: new Date().toISOString(),
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const rawBody = typeof payload?.body === 'string' ? payload.body : JSON.stringify(payload ?? {});
    const format = typeof payload?.format === 'string' ? payload.format : 'JSON';

    const upstreamUrl = Deno.env.get(ENV_UPSTREAM_MAP[agencyId]);
    const upstreamToken = Deno.env.get(ENV_TOKEN_MAP[agencyId]);
    const prefix = AGENCY_PREFIX[agencyId] || agencyId.toUpperCase();
    const hashSuffix = await sha256ShortHex(`${companyId}:${agencyId}:${idempotencyKey}:${rawBody.length}`);
    let reference = `${prefix}-${govEnvironment === 'PRODUCTION' ? 'PRD' : 'SBX'}-${hashSuffix}`;
    let upstreamMode: 'LIVE_M2M' | 'EDGE_CERTIFIED_SANDBOX' = 'EDGE_CERTIFIED_SANDBOX';

    if (upstreamUrl && upstreamToken && govEnvironment === 'PRODUCTION') {
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': format === 'XML' ? 'application/xml' : format === 'CSV' ? 'text/csv' : 'application/json',
          Authorization: `Bearer ${upstreamToken}`,
          'Idempotency-Key': idempotencyKey,
          'X-Company-Id': companyId,
        },
        body: rawBody,
      });

      if (!upstreamRes.ok) {
        const errText = await upstreamRes.text();
        return new Response(
          JSON.stringify({
            ok: false,
            agencyId,
            status: upstreamRes.status,
            error: `Upstream ${agencyId} gateway rejected payload: ${errText.slice(0, 240)}`,
          }),
          { status: 502, headers: CORS_HEADERS }
        );
      }

      const contentType = upstreamRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const upJson = (await upstreamRes.json()) as { reference?: string; id?: string };
        if (upJson.reference || upJson.id) {
          reference = String(upJson.reference || upJson.id);
        }
      }
      upstreamMode = 'LIVE_M2M';
    }

    const processedAt = new Date().toISOString();
    idempotencyStore.set(cacheKey, { reference, processedAt, upstreamMode });

    return new Response(
      JSON.stringify({
        ok: true,
        replayed: false,
        agencyId,
        companyId,
        format,
        payloadBytes: rawBody.length,
        environment: govEnvironment,
        idempotencyKey,
        reference,
        upstreamMode,
        processedAt,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Unexpected Edge Function error',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
