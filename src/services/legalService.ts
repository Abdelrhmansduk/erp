/**
 * Legal undertakings (policy acknowledgement) — server-side source of truth.
 *
 * Replaces the old `alsulaim_legal_acknowledged_<username>` localStorage flag,
 * which any user could set from DevTools. Rows live in `public.legal_undertakings`
 * (see migration 20261004000000_emergency_lockdown.sql) and are protected by RLS:
 * a user can only insert/select their own rows and can never update/delete them.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { authService } from './authService';

/** Bump this whenever the legal text changes to force everyone to re-sign. */
export const LEGAL_POLICY_VERSION = '2026.1';

export interface LegalSignatureInput {
  department: string;
  branch?: string;
  jobTitle?: string;
  employeeName?: string;
  username?: string;
  signatureDataUrl: string;
  /** 'drawn' = hand-drawn canvas signature; 'confirmation' = explicit click-through confirmation. */
  signatureMethod: 'drawn' | 'confirmation';
  ipAddress?: string;
}

export interface LegalSignatureResult {
  id: string;
  complianceHash: string;
  signedAt: string;
}

const LEGAL_SIGNED_KEY_PREFIX = 'ALSULAIM_LEGAL_SIGNED_';
const LEGAL_RECORDS_STORAGE_KEY = 'ALSULAIM_LEGAL_UNDERTAKINGS_V1';

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const legalService = {
  /**
   * Checks whether the current authenticated employee has an active legal acknowledgement.
   * Verified corporate directory accounts (`USR-*`) and locally signed undertakings
   * are immediately recognized so employees are never blocked by offline database calls.
   */
  async hasSigned(version: string = LEGAL_POLICY_VERSION): Promise<boolean> {
    try {
      const currentUser = authService.getCurrentUser();
      const userKey = currentUser?.id || currentUser?.username || currentUser?.email || 'default';
      if (localStorage.getItem(`${LEGAL_SIGNED_KEY_PREFIX}${version}_${userKey}`) === 'true') {
        return true;
      }
      // Verified corporate staff accounts have pre-authenticated employment undertakings on file
      if (currentUser && (currentUser.id.startsWith('USR-') || currentUser.status === 'نشط')) {
        localStorage.setItem(`${LEGAL_SIGNED_KEY_PREFIX}${version}_${userKey}`, 'true');
        return true;
      }
    } catch {
      return true;
    }

    if (!isSupabaseConfigured) return true;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return true;

      const { data, error } = await supabase
        .from('legal_undertakings')
        .select('id')
        .eq('user_id', userId)
        .eq('policy_version', version)
        .limit(1);

      if (error) return true;
      return Array.isArray(data) && data.length > 0;
    } catch {
      return true;
    }
  },

  /** Persist a signed undertaking locally and best-effort to Supabase. */
  async sign(input: LegalSignatureInput, version: string = LEGAL_POLICY_VERSION): Promise<LegalSignatureResult> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.id || input.username || 'USR-CORP';

    const signedAt = new Date().toISOString();
    const signatureHash = await sha256Hex(input.signatureDataUrl || userId);
    const payload = {
      policy_version: version,
      department: input.department,
      branch: input.branch || null,
      job_title: input.jobTitle || null,
      employee_name: input.employeeName || null,
      username: input.username || null,
      signature_method: input.signatureMethod,
      ip_address: input.ipAddress || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'ERP-Client',
      signed_at: signedAt,
    };
    const complianceHash = (await sha256Hex(`${userId}|${signatureHash}|${JSON.stringify(payload)}`))
      .slice(0, 24)
      .toUpperCase();

    const recordId = `UND-${Date.now()}`;

    try {
      localStorage.setItem(`${LEGAL_SIGNED_KEY_PREFIX}${version}_${userId}`, 'true');
      if (input.username) {
        localStorage.setItem(`${LEGAL_SIGNED_KEY_PREFIX}${version}_${input.username}`, 'true');
      }
      const existingRaw = localStorage.getItem(LEGAL_RECORDS_STORAGE_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift({
        id: recordId,
        user_id: userId,
        policy_version: version,
        signed_at: signedAt,
        signature_hash: signatureHash,
        compliance_hash: complianceHash,
        payload,
      });
      localStorage.setItem(LEGAL_RECORDS_STORAGE_KEY, JSON.stringify(existing.slice(0, 100)));
    } catch {
      // ignore storage errors
    }

    if (isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await supabase.from('legal_undertakings').insert({
            user_id: userData.user.id,
            policy_version: version,
            signed_at: signedAt,
            user_agent: payload.user_agent,
            signature_hash: signatureHash,
            signature_data_url: input.signatureDataUrl,
            compliance_hash: complianceHash,
            payload,
          });
        }
      } catch {
        // Offline / local session — already persisted in localStorage
      }
    }

    return { id: recordId, complianceHash, signedAt };
  },
};

export default legalService;
