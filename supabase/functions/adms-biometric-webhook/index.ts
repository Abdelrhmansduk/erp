/**
 * Supabase Edge Function: Real-Time Biometric Cloud Push (ZKTeco ADMS / BioTime)
 * Supports:
 *   1. GET  /iclock/cdata?SN=... -> Handshake & configuration flags for ZKTeco terminals
 *   2. POST /iclock/cdata?SN=...&table=ATTLOG -> Raw tab-separated ZKTeco ATTLOG lines
 *   3. POST /adms-biometric-webhook -> JSON batch payload from BioTime/ERP clients
 * Writes deduplicated punch rows into public.hr_adms_punch_events using Deno.env secrets.
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-company-id, x-adms-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const PUNCH_STATE_MAP: Record<string, string> = {
  '0': 'CHECK_IN',
  '1': 'CHECK_OUT',
  '2': 'BREAK_OUT',
  '3': 'BREAK_IN',
  '4': 'OVERTIME_IN',
  '5': 'OVERTIME_OUT',
};

const VERIFY_MODE_MAP: Record<string, string> = {
  '0': 'PASSWORD',
  '1': 'FINGERPRINT',
  '2': 'RFID_CARD',
  '15': 'FACE_ID',
};

async function computeDedupHash(companyId: string, deviceSn: string, pin: string, ts: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${companyId}|${deviceSn}|${pin}|${ts}`)
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const deviceSn = url.searchParams.get('SN') || 'ZK-CLOUD-01';
  const companyId = req.headers.get('x-company-id') || url.searchParams.get('companyId') || 'SAF';

  // Handshake for ZKTeco ADMS hardware terminals
  if (req.method === 'GET') {
    const handshake = [
      `GET OPTION FROM: ${deviceSn}`,
      'Stamp=9999',
      'OpStamp=9999',
      'ErrorDelay=30',
      'Delay=10',
      'TransTimes=00:00;14:05',
      'TransInterval=1',
      'TransFlag=TransData\tAttLog\tOpLog',
      'Realtime=1',
    ].join('\n');
    return new Response(handshake, {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const configuredSecret = Deno.env.get('ADMS_WEBHOOK_SECRET');
    if (configuredSecret) {
      const provided = req.headers.get('x-adms-secret') || url.searchParams.get('token') || '';
      if (provided !== configuredSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized ADMS device signature' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    const contentType = req.headers.get('content-type') || 'text/plain';
    const rawText = await req.text();
    const parsedEvents: Array<{
      id: string;
      company_id: string;
      device_sn: string;
      employee_pin: string;
      punch_timestamp: string;
      punch_state: string;
      verify_mode: string;
      dedup_hash: string;
      synced_to_attendance: boolean;
      raw_payload: string;
    }> = [];

    if (contentType.includes('application/json')) {
      const bodyJson = JSON.parse(rawText || '{}') as {
        deviceSn?: string;
        companyId?: string;
        punches?: Array<{ pin: string; timestamp: string; state?: string; verifyMode?: string }>;
      };
      const effectiveSn = bodyJson.deviceSn || deviceSn;
      const effectiveCompany = bodyJson.companyId || companyId;
      for (const p of bodyJson.punches || []) {
        const tsIso = new Date(p.timestamp).toISOString();
        const dedupHash = await computeDedupHash(effectiveCompany, effectiveSn, p.pin, tsIso);
        parsedEvents.push({
          id: `adms-${dedupHash}`,
          company_id: effectiveCompany,
          device_sn: effectiveSn,
          employee_pin: p.pin,
          punch_timestamp: tsIso,
          punch_state: PUNCH_STATE_MAP[p.state || '0'] || p.state || 'CHECK_IN',
          verify_mode: VERIFY_MODE_MAP[p.verifyMode || '1'] || p.verifyMode || 'FINGERPRINT',
          dedup_hash: dedupHash,
          synced_to_attendance: false,
          raw_payload: JSON.stringify(p),
        });
      }
    } else {
      // ZKTeco ATTLOG tabular stream: <PIN>\t<YYYY-MM-DD HH:mm:ss>\t<State>\t<VerifyMode>
      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('OPLOG'));
      for (const line of lines) {
        const cols = line.split('\t');
        if (cols.length < 2) continue;
        const pin = cols[0].trim();
        const rawTs = cols[1].trim().replace(' ', 'T');
        const tsIso = rawTs.includes('Z') || rawTs.includes('+') ? rawTs : `${rawTs}+03:00`;
        const stateCode = (cols[2] || '0').trim();
        const verifyCode = (cols[3] || '1').trim();
        const dedupHash = await computeDedupHash(companyId, deviceSn, pin, tsIso);
        parsedEvents.push({
          id: `adms-${dedupHash}`,
          company_id: companyId,
          device_sn: deviceSn,
          employee_pin: pin,
          punch_timestamp: tsIso,
          punch_state: PUNCH_STATE_MAP[stateCode] || 'CHECK_IN',
          verify_mode: VERIFY_MODE_MAP[verifyCode] || 'FINGERPRINT',
          dedup_hash: dedupHash,
          synced_to_attendance: false,
          raw_payload: line,
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let persistedCount = 0;

    if (supabaseUrl && serviceRoleKey && parsedEvents.length > 0) {
      const restRes = await fetch(
        `${supabaseUrl}/rest/v1/hr_adms_punch_events?on_conflict=company_id,dedup_hash`,
        {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=representation',
          },
          body: JSON.stringify(parsedEvents),
        }
      );
      if (restRes.ok) {
        const inserted = (await restRes.json()) as unknown[];
        persistedCount = Array.isArray(inserted) ? inserted.length : parsedEvents.length;
      }
    }

    // ZKTeco terminals expect literal "OK: <count>" on /iclock/cdata
    if (!contentType.includes('application/json')) {
      return new Response(`OK: ${parsedEvents.length}`, {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deviceSn,
        companyId,
        parsedCount: parsedEvents.length,
        persistedCount,
        events: parsedEvents,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'ADMS webhook error',
      }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
