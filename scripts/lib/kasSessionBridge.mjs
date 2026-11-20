/**
 * KAS Supabase Session Bridge (server-side only)
 * ------------------------------------------------
 * Employees sign in with their issued strong password, which the ERP verifies
 * against the salted digest table in `src/config/kasEmployeePasswordHashes.ts`.
 * That check alone never creates a Supabase Auth session, so every database call
 * ran as `anon` and RLS-protected tables (e.g. all `wms_*` inventory tables)
 * silently rejected writes.
 *
 * This bridge re-verifies the password SERVER-SIDE against the same digest table,
 * then provisions/aligns the matching Supabase Auth user (service_role Admin API)
 * so the browser can call `supabase.auth.signInWithPassword()` and obtain a real
 * JWT. No secret ever reaches the browser.
 *
 * Runtime-agnostic: uses only `fetch` + WebCrypto (`crypto.subtle`), so it runs in
 * Node 18+ (Vite dev middleware) and Cloudflare Workers (inlined by the deployer).
 */

const KAS_PASSWORD_DOMAIN_SALT = 'KAS-ERP-STRONG-AUTH-2026-V2';
const KAS_PBKDF2_SALT_PREFIX = 'KAS-PBKDF2-V1|';
const KAS_PBKDF2_ITERATIONS = 100000;
const KAS_PASSWORD_STRETCH_ROUNDS = 256;
const KAS_BRIDGE_EXCLUDED_EMAILS = ['o.saeed.hospitality@kas.sa', 'o.saeed.hospitality@kas-erp.com'];

function kasBridgeHex(buf) {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

async function kasBridgeSha256Hex(text) {
  return kasBridgeHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function kasBridgeLegacyDigest(email, password) {
  let digest = await kasBridgeSha256Hex(`${KAS_PASSWORD_DOMAIN_SALT}|${email}|${password}`);
  for (let i = 1; i < KAS_PASSWORD_STRETCH_ROUNDS; i += 1) {
    digest = await kasBridgeSha256Hex(`${digest}|${email}`);
  }
  return digest;
}

async function kasBridgePbkdf2Digest(email, password) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`${KAS_PBKDF2_SALT_PREFIX}${email}`), iterations: KAS_PBKDF2_ITERATIONS },
    key,
    256
  );
  return `pbkdf2:${kasBridgeHex(bits)}`;
}

function kasBridgeTimingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function kasBridgeVerifyPassword(hashes, email, password) {
  const expected = hashes[email];
  if (!expected) return false;
  const actual = expected.startsWith('pbkdf2:')
    ? await kasBridgePbkdf2Digest(email, password)
    : await kasBridgeLegacyDigest(email, password);
  return kasBridgeTimingSafeEqual(actual, expected);
}

async function kasBridgeFindAuthUserId(supabaseUrl, serviceKey, email) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  for (let page = 1; page <= 20; page += 1) {
    const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers });
    if (!resp.ok) throw new Error(`Auth admin list HTTP ${resp.status}`);
    const body = await resp.json();
    const users = Array.isArray(body?.users) ? body.users : [];
    const match = users.find((u) => String(u?.email || '').toLowerCase() === email);
    if (match) return match.id;
    if (users.length < 200) return null;
  }
  return null;
}

/**
 * @param {{ supabaseUrl: string, serviceKey: string, hashes: Record<string,string>, email: string, password: string }} params
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
export async function kasSessionBridge({ supabaseUrl, serviceKey, hashes, email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!supabaseUrl || !serviceKey) {
    return { status: 503, body: { ok: false, error: 'Session bridge not configured' } };
  }
  if (!cleanEmail || !cleanPass || cleanEmail.length > 160 || cleanPass.length > 256) {
    return { status: 400, body: { ok: false, error: 'Invalid credentials payload' } };
  }
  if (KAS_BRIDGE_EXCLUDED_EMAILS.includes(cleanEmail)) {
    return { status: 403, body: { ok: false, error: 'Account excluded' } };
  }

  const valid = await kasBridgeVerifyPassword(hashes || {}, cleanEmail, cleanPass);
  if (!valid) {
    // Generic response: never reveal whether the e-mail exists in the directory
    return { status: 401, body: { ok: false, error: 'Invalid credentials' } };
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  const existingId = await kasBridgeFindAuthUserId(supabaseUrl, serviceKey, cleanEmail);

  const resp = existingId
    ? await fetch(`${supabaseUrl}/auth/v1/admin/users/${existingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ password: cleanPass, email_confirm: true }),
      })
    : await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
          email_confirm: true,
          app_metadata: { provisioned_by: 'kas-session-bridge' },
        }),
      });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { status: 502, body: { ok: false, error: `Auth admin HTTP ${resp.status}`, detail: text.slice(0, 200) } };
  }
  return { status: 200, body: { ok: true, provisioned: !existingId } };
}

/** Extracts the issued-password digest map from the TypeScript source (single source of truth). */
export function extractKasEmployeeHashes(tsSource) {
  const start = tsSource.indexOf('KAS_EMPLOYEE_PASSWORD_HASHES');
  if (start < 0) return {};
  const end = tsSource.indexOf('});', start);
  const block = tsSource.slice(start, end > start ? end : undefined);
  const map = {};
  const re = /'([^'\s]+@[^'\s]+)'\s*:\s*'((?:pbkdf2:)?[0-9a-f]{64})'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1].toLowerCase()] = m[2];
  }
  return map;
}
