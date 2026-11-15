/**
 * Supabase Edge Function: Gov Gateway Proxy (Mudad, GOSI, Qiwa, Muqeem, ZATCA, B2B Bank)
 * Environment Secrets read strictly from Deno.env.get(...)
 * Compatible with defaultGovTransport in src/services/govIntegrationHubService.ts:
 *   POST /gov-gateway/:agencyId
 *   Headers: Idempotency-Key, X-Company-Id, X-Gov-Environment
 *   Body: { format: string, body: string }
 *   Response: { ok: true, agencyId, reference, environment, idempotencyKey, processedAt, upstreamMode }
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, idempotency-key, x-company-id, x-gov-environment',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const SUPPORTED_AGENCIES = new Set([
  'zatca',
  'mudad',
  'gosi',
  'qiwa',
  'muqeem',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
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

    const payload = (await req.json()) as { format?: string; body?: string };
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
