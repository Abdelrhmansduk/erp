/**
 * Ensures a real Supabase Auth session (JWT) exists for an employee who signed in
 * with the directory strong password. Without it every query runs as `anon` and
 * RLS-protected tables (inventory `wms_*`, etc.) silently reject writes.
 *
 * Flow:
 *  1. Session already active for this e-mail → done.
 *  2. Try `signInWithPassword` directly (works once the Auth user is aligned).
 *  3. Ask the server bridge (`/api/auth/supabase-session`) to re-verify the password
 *     server-side and align the Auth user, then sign in again.
 */
import { supabase, isSupabaseConfigured, isDummySupabase } from './supabaseClient';

export const SUPABASE_SESSION_READY_EVENT = 'kas-supabase-session-ready';

let inFlight: Promise<{ ok: boolean; error?: string }> | null = null;

function isTestRuntime(): boolean {
  return Boolean(
    (import.meta as any)?.env?.VITEST ||
      (import.meta as any)?.env?.MODE === 'test' ||
      (globalThis as any)?.process?.env?.VITEST
  );
}

export async function hasSupabaseSession(email?: string): Promise<boolean> {
  if (!isSupabaseConfigured || isDummySupabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    const sessEmail = data?.session?.user?.email?.toLowerCase();
    if (!sessEmail) return false;
    return email ? sessEmail === email.trim().toLowerCase() : true;
  } catch {
    return false;
  }
}

export function ensureSupabaseSession(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || isDummySupabase || isTestRuntime()) {
    return Promise.resolve({ ok: false, error: 'Supabase not configured' });
  }
  if (inFlight) return inFlight;

  const cleanEmail = (email || '').trim().toLowerCase();
  inFlight = (async () => {
    try {
      if (await hasSupabaseSession(cleanEmail)) return { ok: true };

      const first = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (!first.error && first.data?.session) {
        window.dispatchEvent(new CustomEvent(SUPABASE_SESSION_READY_EVENT, { detail: { email: cleanEmail } }));
        return { ok: true };
      }

      const resp = await fetch('/api/auth/supabase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        return { ok: false, error: body?.error || `HTTP ${resp.status}` };
      }

      const second = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (second.error || !second.data?.session) {
        return { ok: false, error: second.error?.message || 'Supabase sign-in failed' };
      }
      window.dispatchEvent(new CustomEvent(SUPABASE_SESSION_READY_EVENT, { detail: { email: cleanEmail } }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Session bridge error' };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
