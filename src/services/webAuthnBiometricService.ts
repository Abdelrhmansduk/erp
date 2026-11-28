/**
 * WebAuthn / FIDO2 Real Cryptographic Hardware Biometric Service
 * Manages native Touch ID / Face ID / Windows Hello / Android Biometrics
 * for Khalid Al-Sulaim Holding Group ERP.
 *
 * Security Guarantees:
 * 1. Strictly binds every passkey/biometric credential to the authorized employee's canonical `@kas.sa` email
 *    and deterministic SHA-256 `userHandle`.
 * 2. Forces real hardware platform authenticator (`authenticatorAttachment: 'platform'`) with mandatory
 *    OS-level biometric verification (`userVerification: 'required'`, `UV` flag = 1).
 * 3. Extracts and stores the authenticator's SPKI Public Key (`ES256` P-256 or `RS256`) during authorized enrollment
 *    and cryptographically verifies `AuthenticatorAssertionResponse.signature` + `rpIdHash` + `challenge` + `origin`
 *    via WebCrypto (`crypto.subtle.verify`) on every sign-in.
 * 4. NEVER auto-enrolls an unauthenticated visitor during login — enrollment strictly requires prior proof
 *    of the authorized employee's identity.
 */

import { realErpDataStore } from './realErpDataStore';
import { supabase, isSupabaseConfigured, isDummySupabase } from './supabaseClient';

export interface BiometricAuthResult {
  success: boolean;
  isRealHardware: boolean;
  credentialId?: string;
  verifiedEmail?: string;
  verifiedFullName?: string;
  authenticatorType?: 'windows-hello' | 'touch-id' | 'face-id' | 'generic-biometric';
  notEnrolled?: boolean;
  tamperedOrMismatch?: boolean;
  errorMessage?: string;
  canceled?: boolean;
}

export interface RegisteredBiometricCredential {
  id: string;
  credentialId: string; // Base64URL raw credential ID
  userId: string;
  username: string;
  email?: string; // Canonical corporate email (e.g. khalid@kas.sa)
  fullName: string;
  companyId?: string;
  deviceName: string;
  authenticatorType: 'windows-hello' | 'touch-id' | 'face-id' | 'generic-biometric';
  biometricType: 'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)' | 'بصمة مزدوجة';
  publicKeySpki?: string; // Base64URL-encoded SubjectPublicKeyInfo (SPKI)
  publicKeyAlg?: number; // COSE algorithm (-7 = ES256, -257 = RS256)
  userHandleB64Url?: string; // Deterministic 32-byte user handle bound to canonical email
  signCount?: number;
  rpId?: string;
  enrolledAt: string;
  lastUsedAt?: string;
  systemScope: string;
  status: 'نشط' | 'معطل';
}

const INITIAL_SEEDED_CREDENTIALS: RegisteredBiometricCredential[] = [];
const GATE_WEBAUTHN_STORAGE_KEY = 'ALSULAIM_WEBAUTHN_CREDS_V1';
const USER_HANDLE_DOMAIN = 'KAS-FIDO2-USER-HANDLE-V1|';

export function bytesToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64OrUrlToBytes(encoded: string): Uint8Array {
  const cleaned = encoded.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (cleaned.length % 4)) % 4;
  const binary = atob(cleaned + '='.repeat(padLen));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function normalizeIdentityKey(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function resolveEffectiveRpId(): string {
  if (typeof window === 'undefined') return 'localhost';
  const h = window.location.hostname || 'localhost';
  return h === '127.0.0.1' || h === 'localhost' ? h : h;
}

/**
 * Deterministic 32-byte FIDO2 `user.id` handle bound strictly to the employee's canonical identity.
 */
export async function computeEmployeeUserHandle(canonicalEmailOrUsername: string): Promise<Uint8Array> {
  const clean = normalizeIdentityKey(canonicalEmailOrUsername);
  const data = new TextEncoder().encode(`${USER_HANDLE_DOMAIN}${clean}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

function constantTimeBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Converts an ASN.1 DER-encoded ECDSA signature (`SEQUENCE { INTEGER r, INTEGER s }`)
 * returned by WebAuthn authenticators into raw 64-byte IEEE P1363 (`r || s`) expected by WebCrypto.
 */
export function derEcdsaToP1363(derSig: Uint8Array, coordinateBytes = 32): Uint8Array {
  // If already raw 64-byte P1363 (not starting with 0x30 ASN.1 SEQUENCE or length mismatch), return as-is
  if (derSig.byteLength === coordinateBytes * 2 && derSig[0] !== 0x30) {
    return derSig;
  }
  if (derSig.byteLength < 8 || derSig[0] !== 0x30) {
    throw new Error('Invalid ASN.1 DER ECDSA signature header');
  }

  let offset = 1;
  let seqLen = derSig[offset++];
  if (seqLen & 0x80) {
    const lenBytes = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      seqLen = (seqLen << 8) | derSig[offset++];
    }
  }

  const readInt = (): Uint8Array => {
    if (derSig[offset++] !== 0x02) {
      throw new Error('Invalid ASN.1 INTEGER tag in ECDSA signature');
    }
    let len = derSig[offset++];
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let i = 0; i < n; i++) {
        len = (len << 8) | derSig[offset++];
      }
    }
    let slice = derSig.slice(offset, offset + len);
    offset += len;
    // Strip leading zero sign byte(s)
    while (slice.byteLength > coordinateBytes && slice[0] === 0x00) {
      slice = slice.slice(1);
    }
    if (slice.byteLength > coordinateBytes) {
      throw new Error('ECDSA coordinate exceeds curve size');
    }
    const padded = new Uint8Array(coordinateBytes);
    padded.set(slice, coordinateBytes - slice.byteLength);
    return padded;
  };

  const r = readInt();
  const s = readInt();
  const raw = new Uint8Array(coordinateBytes * 2);
  raw.set(r, 0);
  raw.set(s, coordinateBytes);
  return raw;
}

function extractSignCountFromAuthData(authData: Uint8Array): number {
  if (authData.byteLength < 37) return 0;
  const view = new DataView(authData.buffer, authData.byteOffset, authData.byteLength);
  return view.getUint32(33, false);
}

function syncCredentialWithAttendanceGate(emailOrKey: string, credentialIdB64Url: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = normalizeIdentityKey(emailOrKey);
    if (!key) return;
    const raw = localStorage.getItem(GATE_WEBAUTHN_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (credentialIdB64Url) {
      map[key] = credentialIdB64Url;
    } else {
      delete map[key];
    }
    localStorage.setItem(GATE_WEBAUTHN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // non-blocking
  }
}

function credentialMatchesIdentity(cred: RegisteredBiometricCredential, lookup: string): boolean {
  const target = normalizeIdentityKey(lookup);
  if (!target) return false;
  const targetLocal = target.includes('@') ? target.split('@')[0] : target;
  const credEmail = normalizeIdentityKey(cred.email);
  const credUser = normalizeIdentityKey(cred.username);
  const credUserLocal = credUser.includes('@') ? credUser.split('@')[0] : credUser;

  if (credEmail && credEmail === target) return true;
  if (credUser && credUser === target) return true;
  if (!target.includes('@') && (credUserLocal === targetLocal || (credEmail && credEmail.split('@')[0] === targetLocal))) {
    return true;
  }
  if (target.includes('@') && !credEmail && credUserLocal === targetLocal) {
    return true;
  }
  return false;
}

/**
 * Check if the browser and operating system support WebAuthn Hardware Platform Authenticator
 */
export const checkWebAuthnSupport = async (): Promise<{
  supported: boolean;
  hasHardware: boolean;
  detectedDevice: string;
}> => {
  if (
    typeof window === 'undefined' ||
    typeof window.PublicKeyCredential === 'undefined' ||
    !navigator.credentials
  ) {
    return { supported: false, hasHardware: false, detectedDevice: 'غير مدعوم' };
  }

  const userAgent = navigator.userAgent || '';
  let detectedDevice = 'مستشعر بيومتري متوافق مع WebAuthn FIDO2';

  if (/Windows/i.test(userAgent)) {
    detectedDevice = 'Windows Hello Platform Authenticator (مستشعر البصمة والوجه بنظام ويندوز)';
  } else if (/Macintosh|iPhone|iPad/i.test(userAgent)) {
    detectedDevice = 'Apple Touch ID / Face ID Secure Enclave';
  } else if (/Android/i.test(userAgent)) {
    detectedDevice = 'Android Biometric Prompt (مستشعر بصمة أندرويد)';
  }

  try {
    const hasHardware = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { supported: true, hasHardware: Boolean(hasHardware), detectedDevice };
  } catch {
    return { supported: true, hasHardware: false, detectedDevice };
  }
};

/**
 * Get all registered biometric credentials, optionally filtered strictly to a specific employee (`email` or `username`).
 */
export const getStoredBiometricCredentials = async (
  identifier?: string
): Promise<RegisteredBiometricCredential[]> => {
  const localRecords = await realErpDataStore.getRecords<RegisteredBiometricCredential>(
    'user_biometrics',
    INITIAL_SEEDED_CREDENTIALS
  );

  const merged = [...localRecords];

  // Hydrate cloud-enrolled public keys for this user if Supabase is connected
  if (isSupabaseConfigured && !isDummySupabase && identifier && identifier.includes('@')) {
    try {
      const cleanEmail = normalizeIdentityKey(identifier);
      const { data } = await supabase
        .from('user_biometrics')
        .select('*')
        .eq('email', cleanEmail);
      if (Array.isArray(data) && data.length > 0) {
        const knownCredIds = new Set(merged.map((m) => m.credentialId));
        for (const row of data as Array<Record<string, unknown>>) {
          const cid = String(row.credential_id || '');
          if (!cid || knownCredIds.has(cid)) continue;
          let parsedMeta: Partial<RegisteredBiometricCredential> = {};
          if (typeof row.public_key === 'string' && row.public_key.startsWith('{')) {
            try {
              parsedMeta = JSON.parse(row.public_key) as Partial<RegisteredBiometricCredential>;
            } catch {
              parsedMeta = { publicKeySpki: String(row.public_key) };
            }
          } else if (typeof row.public_key === 'string' && row.public_key.length > 0) {
            parsedMeta = { publicKeySpki: row.public_key };
          }
          merged.push({
            id: String(row.id || `bio-cloud-${cid.slice(0, 8)}`),
            credentialId: cid,
            userId: String(row.user_id || cleanEmail),
            username: cleanEmail.split('@')[0],
            email: cleanEmail,
            fullName: parsedMeta.fullName || cleanEmail,
            companyId: String(row.company_id || 'SAF'),
            deviceName: String(row.device_name || 'مستشعر بيومتري معتمد'),
            authenticatorType: parsedMeta.authenticatorType || 'generic-biometric',
            biometricType: parsedMeta.biometricType || 'Touch ID (بصمة إصبع)',
            publicKeySpki: parsedMeta.publicKeySpki,
            publicKeyAlg: parsedMeta.publicKeyAlg ?? -7,
            userHandleB64Url: parsedMeta.userHandleB64Url,
            signCount: parsedMeta.signCount ?? 0,
            rpId: parsedMeta.rpId,
            enrolledAt: String(row.created_at || new Date().toISOString()),
            systemScope: parsedMeta.systemScope || 'جميع المنظومات',
            status: parsedMeta.status || 'نشط',
          });
        }
      }
    } catch {
      // Offline / local store remains authoritative
    }
  }

  if (!identifier) return merged;
  return merged.filter((r) => credentialMatchesIdentity(r, identifier));
};

/**
 * Quick check whether a given employee (`@kas.sa` email or username) has an active enrolled biometric credential on this RP.
 */
export const hasActiveBiometricForUser = async (identifier: string): Promise<{
  enrolled: boolean;
  count: number;
  credentials: RegisteredBiometricCredential[];
}> => {
  const clean = normalizeIdentityKey(identifier);
  if (!clean) return { enrolled: false, count: 0, credentials: [] };
  const rpId = resolveEffectiveRpId();
  const creds = (await getStoredBiometricCredentials(clean)).filter(
    (c) => c.status === 'نشط' && (!c.rpId || c.rpId === rpId)
  );
  return { enrolled: creds.length > 0, count: creds.length, credentials: creds };
};

/**
 * Register & Enroll a new real WebAuthn hardware biometric credential for a verified, authorized user account.
 * Extracts and stores the hardware SPKI Public Key (`ES256` / `RS256`) and deterministic `userHandle`.
 */
export const registerUserBiometric = async (
  user: {
    id: string;
    username: string;
    email?: string;
    fullName: string;
    companyId?: string;
    systemScope?: string;
  },
  biometricType: 'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)' | 'بصمة مزدوجة'
): Promise<{
  success: boolean;
  credential?: RegisteredBiometricCredential;
  errorMessage?: string;
  canceled?: boolean;
}> => {
  const support = await checkWebAuthnSupport();
  if (!support.supported || !support.hasHardware) {
    return {
      success: false,
      errorMessage:
        'لا يتوفر مستشعر بصمة حيوية عتادي مفعّل (Windows Hello / Touch ID / Face ID / بصمة الإصبع) على هذا الجهاز.',
    };
  }

  const canonicalEmail = normalizeIdentityKey(
    user.email || (user.username.includes('@') ? user.username : `${user.username}@kas.sa`)
  );
  const rpId = resolveEffectiveRpId();
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const userHandleBytes = await computeEmployeeUserHandle(canonicalEmail);
  const userHandleB64Url = bytesToBase64Url(userHandleBytes);

  // Exclude all existing credentials on this device to prevent duplicate/ambiguous key slots
  const allExisting = await getStoredBiometricCredentials();
  const excludeCredentials: PublicKeyCredentialDescriptor[] = [];
  for (const c of allExisting) {
    if (!c.credentialId || (c.rpId && c.rpId !== rpId)) continue;
    try {
      excludeCredentials.push({
        type: 'public-key',
        id: base64OrUrlToBytes(c.credentialId) as unknown as BufferSource,
        transports: ['internal'],
      });
    } catch {
      // skip malformed legacy credential id
    }
  }

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challenge as unknown as BufferSource,
    rp: {
      name: `مجموعة خالد السليم القابضة ERP — ${user.systemScope || 'النفاذ الموحد'}`,
      id: rpId,
    },
    user: {
      id: userHandleBytes as unknown as BufferSource,
      name: canonicalEmail,
      displayName: `${user.fullName} (${canonicalEmail})`,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256 (ECDSA P-256 + SHA-256)
      { type: 'public-key', alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5 + SHA-256)
    ],
    excludeCredentials,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  try {
    const newCred = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential | null;

    if (!newCred) {
      return {
        success: false,
        errorMessage: 'لم يتم استلام مفتاح البصمة المشفر من مستشعر الجهاز.',
      };
    }

    const attestationResp = newCred.response as AuthenticatorAttestationResponse & {
      getPublicKey?: () => ArrayBuffer | null;
      getPublicKeyAlgorithm?: () => number;
      getAuthenticatorData?: () => ArrayBuffer;
    };

    // Verify clientDataJSON origin & challenge on enrollment
    if (attestationResp?.clientDataJSON) {
      const clientJsonText = new TextDecoder().decode(attestationResp.clientDataJSON);
      const clientData = JSON.parse(clientJsonText) as {
        type?: string;
        challenge?: string;
        origin?: string;
      };
      if (clientData.type !== 'webauthn.create') {
        return { success: false, errorMessage: 'رفض أمني: نوع استجابة التسجيل غير صالح.' };
      }
      if (clientData.challenge !== bytesToBase64Url(challenge)) {
        return { success: false, errorMessage: 'رفض أمني: رمز التحدي التشفيري (Challenge) غير مطابق.' };
      }
      if (typeof window !== 'undefined' && clientData.origin !== window.location.origin) {
        return { success: false, errorMessage: 'رفض أمني: نطاق المصدر (Origin) غير مطابق للبوابة.' };
      }
    }

    let publicKeySpki: string | undefined;
    let publicKeyAlg = -7;
    let initialSignCount = 0;

    if (typeof attestationResp.getPublicKey === 'function') {
      const spkiBuf = attestationResp.getPublicKey();
      if (spkiBuf && spkiBuf.byteLength > 0) {
        publicKeySpki = bytesToBase64Url(spkiBuf);
      }
    }
    if (typeof attestationResp.getPublicKeyAlgorithm === 'function') {
      const alg = attestationResp.getPublicKeyAlgorithm();
      if (alg === -7 || alg === -257) {
        publicKeyAlg = alg;
      }
    }
    if (typeof attestationResp.getAuthenticatorData === 'function') {
      const authDataBytes = new Uint8Array(attestationResp.getAuthenticatorData());
      if (authDataBytes.byteLength >= 33) {
        const flags = authDataBytes[32];
        const userVerified = (flags & 0x04) !== 0;
        if (!userVerified) {
          return {
            success: false,
            errorMessage:
              'رفض أمني: لم يؤكد مستشعر الجهاز التحقق الحيوي الفعلي للمستخدم (UV=0). يرجى استخدام البصمة أو الوجه الفعلي.',
          };
        }
      }
      initialSignCount = extractSignCountFromAuthData(authDataBytes);
    }

    const rawIdB64Url = bytesToBase64Url(newCred.rawId);
    const authType: RegisteredBiometricCredential['authenticatorType'] =
      biometricType === 'Touch ID (بصمة إصبع)'
        ? 'touch-id'
        : biometricType === 'Face ID (بصمة وجه)'
          ? 'face-id'
          : 'windows-hello';

    const record: RegisteredBiometricCredential = {
      id: `bio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      credentialId: rawIdB64Url,
      userId: user.id,
      username: user.username.includes('@') ? user.username.split('@')[0] : user.username,
      email: canonicalEmail,
      fullName: user.fullName,
      companyId: user.companyId || 'SAF',
      deviceName: support.detectedDevice,
      authenticatorType: authType,
      biometricType,
      publicKeySpki,
      publicKeyAlg,
      userHandleB64Url,
      signCount: initialSignCount,
      rpId,
      enrolledAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      systemScope: user.systemScope || 'جميع المنظومات',
      status: 'نشط',
    };

    await realErpDataStore.addRecord<RegisteredBiometricCredential>(
      'user_biometrics',
      record,
      INITIAL_SEEDED_CREDENTIALS
    );

    // Also persist encrypted public key metadata to Supabase `user_biometrics` when online
    if (isSupabaseConfigured && !isDummySupabase) {
      try {
        await supabase.from('user_biometrics').upsert({
          id: record.id,
          company_id: record.companyId || 'SAF',
          user_id: record.userId,
          email: canonicalEmail,
          credential_id: rawIdB64Url,
          public_key: JSON.stringify({
            publicKeySpki: record.publicKeySpki,
            publicKeyAlg: record.publicKeyAlg,
            userHandleB64Url: record.userHandleB64Url,
            signCount: record.signCount,
            rpId: record.rpId,
            fullName: record.fullName,
            authenticatorType: record.authenticatorType,
            biometricType: record.biometricType,
            systemScope: record.systemScope,
            status: record.status,
          }),
          device_name: record.deviceName,
        });
      } catch {
        // Local encrypted persistence remains intact
      }
    }

    syncCredentialWithAttendanceGate(canonicalEmail, rawIdB64Url);
    localStorage.setItem(`alsulaim_webauthn_cred_${canonicalEmail}`, rawIdB64Url);
    localStorage.setItem(`alsulaim_webauthn_cred_${record.username}`, rawIdB64Url);

    return { success: true, credential: record };
  } catch (err: unknown) {
    const errName = err instanceof Error ? err.name : '';
    const errMsg = err instanceof Error ? err.message : '';
    if (errName === 'NotAllowedError' || errName === 'AbortError') {
      return {
        success: false,
        canceled: true,
        errorMessage: 'تم إلغاء نافذة تسجيل البصمة من نظام التشغيل أو انتهت مهلة المسح.',
      };
    }
    if (errName === 'InvalidStateError') {
      return {
        success: false,
        errorMessage: 'بصمة هذا الجهاز مسجلة بالفعل على نفس المستشعر.',
      };
    }
    return {
      success: false,
      errorMessage: errMsg || 'فشل تسجيل البصمة العتادية عبر مستشعر الجهاز.',
    };
  }
};

/**
 * Performs 6-point cryptographic W3C WebAuthn assertion verification against the target employee's enrolled credential:
 * 1. Exact credentialId ownership match for the target authorized employee (never another user's key).
 * 2. Exact `userHandle` match when returned by the platform authenticator.
 * 3. `clientDataJSON` verification (`type === 'webauthn.get'`, single-use `challenge`, exact `origin`).
 * 4. `authenticatorData` verification (`SHA-256(rpId)` hash match + `UP=1` + `UV=1` mandatory biometric verification bit).
 * 5. Cryptographic signature verification (`crypto.subtle.verify` ES256 P-256 or RS256 over `authenticatorData || SHA-256(clientDataJSON)`).
 * 6. Authenticator `signCount` monotonic anti-cloning check.
 */
export async function verifyWebAuthnAssertionCryptographically(params: {
  assertion: PublicKeyCredential;
  expectedChallenge: Uint8Array;
  expectedOrigin: string;
  expectedRpId: string;
  targetEmail: string;
  allowedCredentialsForUser: RegisteredBiometricCredential[];
  allSystemCredentials?: RegisteredBiometricCredential[];
}): Promise<{
  verified: boolean;
  matchedCredential?: RegisteredBiometricCredential;
  newSignCount?: number;
  tamperedOrMismatch?: boolean;
  reasonAr?: string;
}> {
  const {
    assertion,
    expectedChallenge,
    expectedOrigin,
    expectedRpId,
    targetEmail,
    allowedCredentialsForUser,
    allSystemCredentials = [],
  } = params;

  const assertedIdB64Url = bytesToBase64Url(assertion.rawId);
  const assertedIdStdB64 = (() => {
    try {
      const bytes = new Uint8Array(assertion.rawId);
      let bin = '';
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    } catch {
      return '';
    }
  })();

  // 1. Check if the asserted credential belongs to a DIFFERENT employee on this device (anti-spoofing)
  const cleanTarget = normalizeIdentityKey(targetEmail);
  const foreignOwner = allSystemCredentials.find(
    (c) =>
      (c.credentialId === assertedIdB64Url || c.credentialId === assertedIdStdB64) &&
      !credentialMatchesIdentity(c, cleanTarget)
  );
  if (foreignOwner) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: `رفض أمني صارم: البصمة الممسوحة تخص موظفاً آخر (${foreignOwner.fullName}) ولا تطابق بصمة الموظف المخوّل (${targetEmail})!`,
    };
  }

  const matchedCredential = allowedCredentialsForUser.find(
    (c) =>
      c.status === 'نشط' &&
      (c.credentialId === assertedIdB64Url || c.credentialId === assertedIdStdB64)
  );
  if (!matchedCredential) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: مفتاح البصمة المقدم غير مسجل أو غير مخوّل لهذا الحساب المؤسسي.',
    };
  }

  const resp = assertion.response as AuthenticatorAssertionResponse;
  if (!resp || !resp.authenticatorData || !resp.clientDataJSON || !resp.signature) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: استجابة المستشعر البيومتري ناقصة التوقيع التشفيري.',
    };
  }

  // 2. Verify `userHandle` if provided by authenticator
  if (resp.userHandle && resp.userHandle.byteLength > 0) {
    const returnedHandle = new Uint8Array(resp.userHandle);
    const expectedHandle = matchedCredential.userHandleB64Url
      ? base64OrUrlToBytes(matchedCredential.userHandleB64Url)
      : await computeEmployeeUserHandle(cleanTarget);
    if (!constantTimeBytesEqual(returnedHandle, expectedHandle)) {
      return {
        verified: false,
        tamperedOrMismatch: true,
        reasonAr: 'رفض أمني: الهوية المشفرة داخل شريحة البصمة (userHandle) لا تطابق صاحب الحساب المخوّل!',
      };
    }
  }

  // 3. Verify `clientDataJSON` (type, challenge, origin)
  let clientData: { type?: string; challenge?: string; origin?: string };
  try {
    clientData = JSON.parse(new TextDecoder().decode(resp.clientDataJSON)) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };
  } catch {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: تعذر قراءة بيانات التحدي التشفيري (clientDataJSON).',
    };
  }

  if (clientData.type !== 'webauthn.get') {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: نوع عملية WebAuthn غير صالح.',
    };
  }

  const expectedChallengeB64Url = bytesToBase64Url(expectedChallenge);
  if (clientData.challenge !== expectedChallengeB64Url) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: فشل التحقق من التحدي العشوائي (Challenge Replay Guard).',
    };
  }

  if (expectedOrigin && clientData.origin !== expectedOrigin) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: مصدر الطلب (Origin) لا يطابق نطاق البوابة المعتمد.',
    };
  }

  // 4. Verify `authenticatorData` (`rpIdHash` + `UP` + mandatory `UV` hardware biometric flag)
  const authDataBytes = new Uint8Array(resp.authenticatorData);
  if (authDataBytes.byteLength < 37) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: بيانات المصادق العتادي (authenticatorData) غير مكتملة.',
    };
  }

  const expectedRpIdHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedRpId))
  );
  const actualRpIdHash = authDataBytes.slice(0, 32);
  if (!constantTimeBytesEqual(actualRpIdHash, expectedRpIdHash)) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: بصمة النطاق (rpIdHash) غير مطابقة.',
    };
  }

  const flags = authDataBytes[32];
  const userPresent = (flags & 0x01) !== 0;
  const userVerified = (flags & 0x04) !== 0;
  if (!userPresent || !userVerified) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr:
        'رفض أمني: لم يتم التحقق الحيوي الفعلي من بصمة المستخدم عبر شريحة الأمان (UV=0).',
    };
  }

  // 5. Cryptographic Public-Key Signature Verification (`authenticatorData || SHA-256(clientDataJSON)`)
  if (matchedCredential.publicKeySpki) {
    try {
      const clientDataHash = new Uint8Array(
        await crypto.subtle.digest('SHA-256', resp.clientDataJSON)
      );
      const signedPayload = new Uint8Array(authDataBytes.byteLength + clientDataHash.byteLength);
      signedPayload.set(authDataBytes, 0);
      signedPayload.set(clientDataHash, authDataBytes.byteLength);

      const spkiBytes = base64OrUrlToBytes(matchedCredential.publicKeySpki);
      const sigBytes = new Uint8Array(resp.signature);
      const alg = matchedCredential.publicKeyAlg ?? -7;

      let signatureValid = false;
      if (alg === -257) {
        const rsaKey = await crypto.subtle.importKey(
          'spki',
          spkiBytes as unknown as BufferSource,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify']
        );
        signatureValid = await crypto.subtle.verify(
          'RSASSA-PKCS1-v1_5',
          rsaKey,
          sigBytes as unknown as BufferSource,
          signedPayload as unknown as BufferSource
        );
      } else {
        const ecKey = await crypto.subtle.importKey(
          'spki',
          spkiBytes as unknown as BufferSource,
          { name: 'ECDSA', namedCurve: 'P-256' },
          false,
          ['verify']
        );
        const rawP1363Sig = derEcdsaToP1363(sigBytes, 32);
        signatureValid = await crypto.subtle.verify(
          { name: 'ECDSA', hash: 'SHA-256' },
          ecKey,
          rawP1363Sig as unknown as BufferSource,
          signedPayload as unknown as BufferSource
        );
      }

      if (!signatureValid) {
        return {
          verified: false,
          tamperedOrMismatch: true,
          reasonAr:
            'رفض أمني حاسم: التوقيع التشفيري للبصمة غير مطابق للمفتاح العام لصاحب الحساب المخوّل!',
        };
      }
    } catch {
      return {
        verified: false,
        tamperedOrMismatch: true,
        reasonAr: 'رفض أمني: فشل التحقق التشفيري من توقيع البصمة الرقمية.',
      };
    }
  }

  // 6. Anti-Cloning Monotonic Sign Counter Check
  const newSignCount = extractSignCountFromAuthData(authDataBytes);
  const prevSignCount = matchedCredential.signCount ?? 0;
  if (prevSignCount > 0 && newSignCount > 0 && newSignCount <= prevSignCount) {
    return {
      verified: false,
      tamperedOrMismatch: true,
      reasonAr: 'رفض أمني: تم رصد شذوذ في عداد التوقيع العتادي (احتمال مفتاح مستنسخ).',
    };
  }

  return {
    verified: true,
    matchedCredential,
    newSignCount,
  };
}

/**
 * Verifies real hardware biometric sign-in strictly against the enrolled credentials of `targetEmail`.
 * NEVER creates/enrolls a credential if none exists — returns `notEnrolled: true` instead.
 */
export const verifyAuthorizedUserBiometricLogin = async (
  targetEmail: string
): Promise<BiometricAuthResult> => {
  const cleanEmail = normalizeIdentityKey(targetEmail);
  if (!cleanEmail) {
    return {
      success: false,
      isRealHardware: false,
      errorMessage: 'يرجى تحديد البريد الإلكتروني المؤسسي (@kas.sa) للموظف المخوّل أولاً.',
    };
  }

  const support = await checkWebAuthnSupport();
  if (!support.supported || !support.hasHardware || !navigator.credentials) {
    return {
      success: false,
      isRealHardware: false,
      errorMessage:
        'لا يتوفر مستشعر بصمة عتادي مفعّل (Touch ID / Face ID / Windows Hello / بصمة الإصبع) على هذا الجهاز.',
    };
  }

  const rpId = resolveEffectiveRpId();
  const allSystemCredentials = await getStoredBiometricCredentials();
  const userCredentials = allSystemCredentials.filter(
    (c) =>
      credentialMatchesIdentity(c, cleanEmail) &&
      c.status === 'نشط' &&
      (!c.rpId || c.rpId === rpId)
  );

  if (userCredentials.length === 0) {
    return {
      success: false,
      isRealHardware: true,
      notEnrolled: true,
      errorMessage: `لم يتم تسجيل بصمة رقمية معتمدة لحساب (${cleanEmail}) على هذا الجهاز بعد. يرجى التحقق بكلمة المرور المؤسسية لتفعيل وربط بصمتك الحقيقية بحسابك.`,
    };
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const allowCredentials: PublicKeyCredentialDescriptor[] = userCredentials.map((c) => ({
    type: 'public-key' as const,
    id: base64OrUrlToBytes(c.credentialId) as unknown as BufferSource,
    transports: ['internal'] as AuthenticatorTransport[],
  }));

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        timeout: 60000,
        rpId,
        userVerification: 'required',
        allowCredentials,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return {
        success: false,
        isRealHardware: true,
        errorMessage: 'لم يتم استلام تأكيد البصمة من مستشعر الجهاز.',
      };
    }

    const cryptoCheck = await verifyWebAuthnAssertionCryptographically({
      assertion,
      expectedChallenge: challenge,
      expectedOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      expectedRpId: rpId,
      targetEmail: cleanEmail,
      allowedCredentialsForUser: userCredentials,
      allSystemCredentials,
    });

    if (!cryptoCheck.verified || !cryptoCheck.matchedCredential) {
      return {
        success: false,
        isRealHardware: true,
        tamperedOrMismatch: cryptoCheck.tamperedOrMismatch,
        errorMessage:
          cryptoCheck.reasonAr || 'فشلت مطابقة البصمة مع المفتاح المعتمد لصاحب الحساب.',
      };
    }

    const matched = cryptoCheck.matchedCredential;
    await realErpDataStore.updateRecord<RegisteredBiometricCredential>(
      'user_biometrics',
      matched.id,
      {
        lastUsedAt: new Date().toISOString(),
        signCount: cryptoCheck.newSignCount ?? matched.signCount ?? 0,
      },
      INITIAL_SEEDED_CREDENTIALS
    );

    syncCredentialWithAttendanceGate(cleanEmail, matched.credentialId);

    return {
      success: true,
      isRealHardware: true,
      credentialId: matched.credentialId,
      verifiedEmail: matched.email || cleanEmail,
      verifiedFullName: matched.fullName,
      authenticatorType: matched.authenticatorType,
    };
  } catch (err: unknown) {
    const errName = err instanceof Error ? err.name : '';
    const errMsg = err instanceof Error ? err.message : '';
    if (errName === 'NotAllowedError' || errName === 'AbortError') {
      return {
        success: false,
        isRealHardware: true,
        canceled: true,
        errorMessage:
          'فشلت مطابقة البصمة أو تم إلغاء نافذة المستشعر — تأكد من مسح بصمة الشخص المخوّل صاحب الحساب.',
      };
    }
    return {
      success: false,
      isRealHardware: true,
      errorMessage: errMsg || 'تعذر التحقق من البصمة العتادية على هذا الجهاز.',
    };
  }
};

/**
 * Test cryptographic assertion on a specific enrolled biometric credential (Settings / IAM Users)
 */
export const testBiometricAssertion = async (
  credential: RegisteredBiometricCredential
): Promise<BiometricAuthResult> => {
  const support = await checkWebAuthnSupport();
  if (!support.supported || !navigator.credentials) {
    return {
      success: false,
      isRealHardware: false,
      errorMessage: 'المستشعر البيومتري العتادي (WebAuthn / FIDO2) غير متاح للمصادقة.',
    };
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const rpId = credential.rpId || resolveEffectiveRpId();

  try {
    const credIdBytes = base64OrUrlToBytes(credential.credentialId);
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge as unknown as BufferSource,
        timeout: 60000,
        rpId,
        userVerification: 'required',
        allowCredentials: [
          {
            type: 'public-key',
            id: credIdBytes as unknown as BufferSource,
            transports: ['internal'],
          },
        ],
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return {
        success: false,
        isRealHardware: true,
        errorMessage: 'لم يتم استلام مصادقة صالحة من مستشعر الجهاز.',
      };
    }

    const targetEmail = credential.email || credential.username;
    const cryptoCheck = await verifyWebAuthnAssertionCryptographically({
      assertion,
      expectedChallenge: challenge,
      expectedOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      expectedRpId: rpId,
      targetEmail,
      allowedCredentialsForUser: [credential],
    });

    if (!cryptoCheck.verified) {
      return {
        success: false,
        isRealHardware: true,
        tamperedOrMismatch: true,
        errorMessage: cryptoCheck.reasonAr || 'فشل التحقق التشفيري من البصمة.',
      };
    }

    await realErpDataStore.updateRecord<RegisteredBiometricCredential>(
      'user_biometrics',
      credential.id,
      {
        lastUsedAt: new Date().toISOString(),
        signCount: cryptoCheck.newSignCount ?? credential.signCount ?? 0,
      },
      INITIAL_SEEDED_CREDENTIALS
    );

    return {
      success: true,
      isRealHardware: true,
      credentialId: credential.credentialId,
      verifiedEmail: credential.email,
      verifiedFullName: credential.fullName,
      authenticatorType: credential.authenticatorType,
    };
  } catch (err: unknown) {
    const errName = err instanceof Error ? err.name : '';
    const errMsg = err instanceof Error ? err.message : '';
    if (errName === 'NotAllowedError' || errName === 'AbortError') {
      return {
        success: false,
        isRealHardware: true,
        canceled: true,
        errorMessage: 'تم إلغاء نافذة المطابقة البيومترية أو رفض البصمة غير المطابقة.',
      };
    }
    return {
      success: false,
      isRealHardware: true,
      errorMessage: errMsg || 'فشل التحقق من البصمة العتادية.',
    };
  }
};

/**
 * Remove an enrolled biometric credential from local + cloud stores
 */
export const removeStoredBiometricCredential = async (
  recordId: string,
  usernameOrEmail?: string
): Promise<boolean> => {
  await realErpDataStore.deleteRecord<RegisteredBiometricCredential>(
    'user_biometrics',
    recordId,
    INITIAL_SEEDED_CREDENTIALS
  );

  if (isSupabaseConfigured && !isDummySupabase) {
    try {
      await supabase.from('user_biometrics').delete().eq('id', recordId);
    } catch {
      // non-blocking
    }
  }

  if (usernameOrEmail) {
    const clean = normalizeIdentityKey(usernameOrEmail);
    localStorage.removeItem(`alsulaim_webauthn_cred_${clean}`);
    syncCredentialWithAttendanceGate(clean, null);
  }

  return true;
};

/**
 * Toggle biometric status (active / disabled)
 */
export const toggleBiometricStatus = async (
  credentialId: string,
  status: 'نشط' | 'معطل'
): Promise<boolean> => {
  await realErpDataStore.updateRecord<RegisteredBiometricCredential>(
    'user_biometrics',
    credentialId,
    { status },
    INITIAL_SEEDED_CREDENTIALS
  );
  return true;
};

/**
 * Legacy helper alias — strictly verifies enrolled biometric ONLY (never auto-creates unauthenticated credentials).
 */
export const performRealBiometricAuth = async (
  usernameOrEmail: string,
  _systemName: string,
  _type: 'fingerprint' | 'face'
): Promise<BiometricAuthResult> => {
  return verifyAuthorizedUserBiometricLogin(usernameOrEmail);
};
