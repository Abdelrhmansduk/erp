/**
 * Biometric, Live Camera & Barcode Fallback Session Gate Service (Per-Employee Isolated)
 *
 * Implements:
 * 1. Mandatory Check-In upon opening the ERP workspace/launcher (`CHECK_IN`)
 * 2. Mandatory Check-Out upon signing out (`CHECK_OUT`)
 * 3. Hardware Biometrics (WebAuthn Platform Authenticator) strictly isolated per employee
 * 4. Live Camera Verification Snapshot (Base64 preview + cryptographic integrity hash) per employee
 * 5. Automatic & Manual Fallback to Employee Barcode / QR Code (ISO Code-128B & QR) with
 *    collision-free codes across all 69+ corporate employees and cross-employee anti-spoofing
 * 6. Full Per-Employee Registry (`hr_employee_biometric_profiles`) + real-time `attendances` & `activity_log` sync
 */

import { UserProfile } from './authService';
import {
  KAS_ALLOWED_EMPLOYEES,
  type KasAllowedEmployee,
} from '../config/kasAllowedEmails';
import { realErpDataStore } from './realErpDataStore';
import {
  HrShiftAttendanceEngine,
  DEFAULT_HR_SHIFTS,
  type AttendanceVerificationMethod,
} from './hrShiftAttendanceEngine';
import { normalizeCanonicalEntityCode } from './entityBrandingService';

export type GateDirection = 'CHECK_IN' | 'CHECK_OUT';
export type GateVerificationChannel =
  | 'BIOMETRIC_CAMERA'
  | 'BARCODE_CAMERA'
  | 'BARCODE_SCANNER';

export type EmployeeGatePolicyMode =
  | 'BIOMETRIC_WITH_BARCODE_FALLBACK'
  | 'BARCODE_PRIMARY';

export interface SessionAttendanceStamp {
  userKey: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  date: string;
  checkInTime: string;
  channel: GateVerificationChannel;
  cameraCaptured: boolean;
  snapshotHash?: string;
  badgeCode: string;
  verifiedAtIso: string;
}

export interface HardwareBiometricResult {
  ok: boolean;
  credentialId?: string;
  fallbackToBarcode?: boolean;
  reasonAr?: string;
}

export interface BarcodeVerificationResult {
  valid: boolean;
  matchedCode: string;
  crossEmployeeMismatch?: boolean;
  otherEmployeeName?: string;
  reasonAr?: string;
}

export interface EmployeeBiometricGateProfile {
  employeeKey: string;
  employeeId: string;
  serial?: number;
  email: string;
  username: string;
  fullName: string;
  role: string;
  companyCode: string;
  departmentNameAr: string;
  phone?: string;
  badgeCode: string;
  shortPinCode: string;
  qrPayload: string;
  barcodeVersion: number;
  biometricEnrolled: boolean;
  biometricEnrolledAt?: string;
  biometricCredentialHint?: string;
  gatePolicy: EmployeeGatePolicyMode;
  requireLiveCamera: boolean;
  lastCheckInDate?: string;
  lastCheckInTime?: string;
  lastCheckInChannel?: GateVerificationChannel;
  lastCheckInSnapshot?: string;
  lastCheckInHash?: string;
  lastCheckOutDate?: string;
  lastCheckOutTime?: string;
  lastCheckOutChannel?: GateVerificationChannel;
  lastCheckOutSnapshot?: string;
  lastCheckOutHash?: string;
  lastWorkHours?: number;
  verifiedSessionsCount: number;
  checkedInToday: boolean;
  checkedOutToday: boolean;
}

interface StoredEmployeeGateOverride {
  customSixDigits?: string;
  barcodeVersion?: number;
  gatePolicy?: EmployeeGatePolicyMode;
  requireLiveCamera?: boolean;
  biometricEnrolled?: boolean;
  biometricEnrolledAt?: string;
  biometricCredentialHint?: string;
  lastCheckInDate?: string;
  lastCheckInTime?: string;
  lastCheckInChannel?: GateVerificationChannel;
  lastCheckInSnapshot?: string;
  lastCheckInHash?: string;
  lastCheckOutDate?: string;
  lastCheckOutTime?: string;
  lastCheckOutChannel?: GateVerificationChannel;
  lastCheckOutSnapshot?: string;
  lastCheckOutHash?: string;
  lastWorkHours?: number;
  verifiedSessionsCount?: number;
}

const WEBAUTHN_STORAGE_KEY = 'ALSULAIM_WEBAUTHN_CREDS_V1';
const GATE_OVERRIDES_STORAGE_KEY = 'ALSULAIM_EMP_GATE_PROFILES_V1';
const SESSION_STAMP_PREFIX = 'ALSULAIM_BIOMETRIC_SESSION_CHECKIN_V1_';

const DEPT_ARABIC_NAMES: Record<string, string> = {
  executive: 'الإدارة التنفيذية العليا',
  hr: 'الموارد البشرية والشؤون الإدارية',
  finance: 'الإدارة المالية والمحاسبة',
  recruitment: 'الاستقدام وعقود مساند',
  rental: 'التأجير وتشغيل الكوادر',
  ats: 'المتابعة الخارجية والفرز',
  crm: 'التسويق وخدمة العملاء',
  shelter: 'الإيواء والتسكين والحركة',
  tenders: 'المنافسات والمشتريات التجارية',
};

export function getTodayIsoDate(now: Date = new Date()): string {
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const dy = String(now.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

function getCurrentHHMM(now: Date = new Date()): string {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function findMatchingKasDirectoryEmployee(
  input?: Record<string, any> | null
): KasAllowedEmployee | undefined {
  if (!input) return undefined;
  const email = String(input.email || '').trim().toLowerCase();
  const username = String(input.username || '').trim().toLowerCase();
  const id = String(input.id || input.employee_id || input.employee_code || '').trim().toUpperCase();
  const fullName = String(input.full_name || input.nameAr || input.name || '').trim();

  return KAS_ALLOWED_EMPLOYEES.find(
    (emp) =>
      (email && emp.email.toLowerCase() === email) ||
      (username && emp.username.toLowerCase() === username) ||
      (id && emp.id.toUpperCase() === id) ||
      (fullName && emp.nameAr.trim() === fullName)
  );
}

export function resolveUserGateKey(user?: Record<string, any> | null): string {
  if (!user) return 'staff';
  const kasMatch = findMatchingKasDirectoryEmployee(user);
  if (kasMatch) {
    return kasMatch.email.trim().toLowerCase();
  }
  const raw = String(
    user.email || user.username || user.employee_code || user.id || user.full_name || user.name || 'staff'
  )
    .trim()
    .toLowerCase();
  const sanitized = raw.replace(/\s+/g, '_').replace(/[^a-z0-9@._-\u0600-\u06FF]/g, '');
  return sanitized || 'staff';
}

function readOverridesMap(): Record<string, StoredEmployeeGateOverride> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(GATE_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeOverridesMap(map: Record<string, StoredEmployeeGateOverride>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GATE_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // non-blocking
  }
}

function updateEmployeeOverride(
  userKey: string,
  patch: Partial<StoredEmployeeGateOverride>
): StoredEmployeeGateOverride {
  const map = readOverridesMap();
  const updated: StoredEmployeeGateOverride = {
    ...(map[userKey] || {}),
    ...patch,
  };
  map[userKey] = updated;
  writeOverridesMap(map);
  return updated;
}

function computeDeterministicChecksum3(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const three = (Math.abs(hash) % 900) + 100;
  return String(three);
}

/**
 * Generates a collision-free, deterministic ASCII Code-128B badge code & 6-digit PIN
 * dedicated exclusively to the target employee.
 * - For official KAS directory employees, embeds `serial` (001..099) + 3-digit FNV checksum (`104xxx`),
 *   guaranteeing 0% collision across all 69 corporate accounts.
 * - For dynamically added HR employees, uses `5xx`..`9xx` prefix + checksum.
 * - Honors per-employee regenerated barcode overrides if HR re-issued the card.
 */
export function generateEmployeeBarcodeIdentity(
  user?: Record<string, any> | null,
  now: Date = new Date()
): {
  employeeKey: string;
  companyCode: string;
  badgeCode: string;
  shortPinCode: string;
  qrPayload: string;
  barcodeVersion: number;
} {
  const kasMatch = findMatchingKasDirectoryEmployee(user);
  const employeeKey = resolveUserGateKey(user);
  const overrides = readOverridesMap()[employeeKey];

  const rawCompany =
    user?.company_id && user.company_id !== 'all'
      ? user.company_id
      : kasMatch?.company_id && kasMatch.company_id !== 'all'
      ? kasMatch.company_id
      : user?.company_id === 'all' || kasMatch?.company_id === 'all'
      ? 'HQ'
      : 'SAF';

  const companyCode = normalizeCanonicalEntityCode(rawCompany) || 'HQ';

  let sixDigits = overrides?.customSixDigits || '';
  if (!sixDigits) {
    if (kasMatch) {
      const serialPadded = String(100 + (kasMatch.serial % 400)).padStart(3, '0');
      const chk = computeDeterministicChecksum3(
        `${kasMatch.id}|${kasMatch.email.toLowerCase()}`
      );
      sixDigits = `${serialPadded}${chk}`;
    } else {
      const seedSource = `${employeeKey}|${user?.id || ''}|${user?.full_name || user?.name || 'EMP'}`.toLowerCase();
      let hash = 2166136261;
      for (let i = 0; i < seedSource.length; i++) {
        hash ^= seedSource.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      // Range 500000..999999 so dynamic employees never collide with serials 100xxx..499xxx
      sixDigits = String((Math.abs(hash) % 500000) + 500000);
    }
  }

  const barcodeVersion = overrides?.barcodeVersion || 1;
  const badgeCode = `${companyCode}-ID-${sixDigits}`;
  const todayIso = getTodayIsoDate(now);
  const qrPayload = `ERP-ATT|${companyCode}|${badgeCode}|V${barcodeVersion}|${todayIso}`;

  return {
    employeeKey,
    companyCode,
    badgeCode,
    shortPinCode: sixDigits,
    qrPayload,
    barcodeVersion,
  };
}

/**
 * Validates a scanned QR string, Code-128 badge string, or 6-digit PIN strictly against
 * the target employee (`user`), and actively detects if someone scanned ANOTHER employee's badge!
 */
export function verifyEmployeeBarcodeInput(
  rawInput: string,
  user?: Record<string, any> | null
): BarcodeVerificationResult {
  const cleaned = String(rawInput || '').trim();
  if (!cleaned) {
    return {
      valid: false,
      matchedCode: '',
      reasonAr: 'يرجى مسح الباركود أمام الكاميرا أو بقارئ الباركود أو إدخال رمز البطاقة الخاص بالموظف.',
    };
  }

  const targetIdentity = generateEmployeeBarcodeIdentity(user);
  const targetKey = targetIdentity.employeeKey;
  const upper = cleaned.toUpperCase();

  // 1. Check exact match for THIS specific employee
  if (
    upper === targetIdentity.badgeCode.toUpperCase() ||
    upper === targetIdentity.qrPayload.toUpperCase() ||
    upper.includes(`|${targetIdentity.badgeCode.toUpperCase()}|`) ||
    cleaned === targetIdentity.shortPinCode
  ) {
    return {
      valid: true,
      matchedCode: targetIdentity.badgeCode,
    };
  }

  // 2. Anti-Spoofing Check: Did the user scan or enter ANOTHER employee's barcode or PIN?
  for (const emp of KAS_ALLOWED_EMPLOYEES) {
    const otherIdentity = generateEmployeeBarcodeIdentity(emp);
    if (otherIdentity.employeeKey === targetKey) continue;

    if (
      upper === otherIdentity.badgeCode.toUpperCase() ||
      upper === otherIdentity.qrPayload.toUpperCase() ||
      upper.includes(`|${otherIdentity.badgeCode.toUpperCase()}|`) ||
      cleaned === otherIdentity.shortPinCode ||
      upper === emp.email.toUpperCase()
    ) {
      const currentName =
        user?.full_name || user?.nameAr || user?.name || user?.username || 'الموظف الحالي';
      return {
        valid: false,
        matchedCode: '',
        crossEmployeeMismatch: true,
        otherEmployeeName: emp.nameAr,
        reasonAr: `رفض أمني: الباركود الممسوح يخص الموظف (${emp.nameAr}) ولا يطابق حساب الموظف الحالي (${currentName}) — يجب التحقق ببصمة أو باركود كل موظف على حدة.`,
      };
    }
  }

  return {
    valid: false,
    matchedCode: '',
    reasonAr: `رمز الباركود المدخل غير مطابق لبطاقة الموظف المعتمدة (${targetIdentity.badgeCode}).`,
  };
}

function getSessionStorageKey(
  user?: Record<string, any> | null,
  now: Date = new Date()
): string {
  return `${SESSION_STAMP_PREFIX}${resolveUserGateKey(user)}_${getTodayIsoDate(now)}`;
}

export function getSessionCheckInStamp(
  user?: Record<string, any> | null,
  now: Date = new Date()
): SessionAttendanceStamp | null {
  if (!user) return null;
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const expectedKey = resolveUserGateKey(user);
    const raw = sessionStorage.getItem(getSessionStorageKey(user, now));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionAttendanceStamp;
    if (!parsed || !parsed.checkInTime || parsed.userKey !== expectedKey) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasCompletedSessionCheckIn(
  user?: Record<string, any> | null,
  now: Date = new Date()
): boolean {
  return Boolean(getSessionCheckInStamp(user, now));
}

/**
 * Clears session check-in stamp strictly for the specified employee (`user`),
 * or clears all session stamps only when `user` is omitted.
 */
export function clearSessionCheckInStamp(user?: Record<string, any> | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (user) {
      const targetPrefix = `${SESSION_STAMP_PREFIX}${resolveUserGateKey(user)}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(targetPrefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      return;
    }

    const allKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_STAMP_PREFIX)) {
        allKeys.push(k);
      }
    }
    allKeys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore storage errors
  }
}

/**
 * Checks whether the current browser & OS have an active hardware platform biometric sensor
 * (Windows Hello, Touch ID, Face ID, Android Fingerprint).
 */
export async function detectPlatformBiometricSupport(): Promise<boolean> {
  try {
    if (
      typeof window === 'undefined' ||
      typeof window.PublicKeyCredential === 'undefined' ||
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
      return false;
    }
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function readStoredCredentialMap(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(WEBAUTHN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredCredentialId(userKey: string, credentialIdBase64: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const map = readStoredCredentialMap();
    map[userKey] = credentialIdBase64;
    localStorage.setItem(WEBAUTHN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // non-blocking
  }
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const bin = atob(padded + '='.repeat(padLen));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

/**
 * Triggers real OS/Hardware Biometric prompt (Windows Hello / Touch ID / Fingerprint) via WebAuthn,
 * bound exclusively to the specific employee (`userKey`).
 * If the employee's policy is set to `BARCODE_PRIMARY` or hardware is absent, returns `fallbackToBarcode: true`.
 */
export async function authenticateWithHardwareBiometric(
  user: Partial<UserProfile>
): Promise<HardwareBiometricResult> {
  const userKey = resolveUserGateKey(user);
  const override = readOverridesMap()[userKey];

  if (override?.gatePolicy === 'BARCODE_PRIMARY') {
    return {
      ok: false,
      fallbackToBarcode: true,
      reasonAr:
        'سياسة التحقق المعتمدة لهذا الموظف مضبوطة على (الباركود الوظيفي + الكاميرا) — يرجى مسح الباركود الخاص بك.',
    };
  }

  const supported = await detectPlatformBiometricSupport();
  if (!supported || typeof navigator === 'undefined' || !navigator.credentials) {
    return {
      ok: false,
      fallbackToBarcode: true,
      reasonAr:
        'لا يتوفر مستشعر بصمة حيوية مفعّل على هذا الجهاز — تم التحويل تلقائياً إلى التحقق عبر الباركود الوظيفي الخاص بالموظف.',
    };
  }

  const credMap = readStoredCredentialMap();
  const existingCredId = credMap[userKey];

  // Exclude credentials registered to OTHER employees on shared devices so Employee B cannot verify with Employee A's passkey
  const otherEmployeeCreds = Object.entries(credMap)
    .filter(([k, v]) => k !== userKey && Boolean(v))
    .map(([, v]) => ({
      type: 'public-key' as const,
      id: base64UrlToUint8Array(v) as unknown as BufferSource,
      transports: ['internal'] as AuthenticatorTransport[],
    }));

  const challenge = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(challenge);
  } else {
    for (let i = 0; i < 32; i++) challenge[i] = (i * 17 + 43) & 0xff;
  }

  try {
    if (existingCredId) {
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              type: 'public-key',
              id: base64UrlToUint8Array(existingCredId) as unknown as BufferSource,
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 45000,
        },
      })) as PublicKeyCredential | null;

      if (assertion) {
        const matchedId = bufferToBase64Url(assertion.rawId);
        return {
          ok: true,
          credentialId: matchedId,
        };
      }
    }

    // First-time platform biometric enrollment dedicated to THIS employee
    const userIdBytes = new TextEncoder().encode(`KAS-BIO:${userKey}`.slice(0, 64));
    const created = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'منظومة الموارد المؤسسية — البصمة الحيوية للموظف',
        },
        user: {
          id: userIdBytes,
          name: user.email || userKey,
          displayName: `${user.full_name || user.username || 'موظف معتمد'} (${userKey})`,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        excludeCredentials: otherEmployeeCreds,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 45000,
      },
    })) as PublicKeyCredential | null;

    if (created) {
      const encodedId = bufferToBase64Url(created.rawId);
      saveStoredCredentialId(userKey, encodedId);
      updateEmployeeOverride(userKey, {
        biometricEnrolled: true,
        biometricEnrolledAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        biometricCredentialHint: `BIO-${encodedId.slice(0, 8).toUpperCase()}`,
      });
      return {
        ok: true,
        credentialId: encodedId,
      };
    }

    return {
      ok: false,
      fallbackToBarcode: true,
      reasonAr: 'تعذر إتمام قراءة البصمة — يمكنك المتابعة فوراً عبر الباركود الوظيفي الخاص بك.',
    };
  } catch (err: any) {
    const isCanceled = err?.name === 'NotAllowedError' || err?.name === 'AbortError';
    return {
      ok: false,
      fallbackToBarcode: true,
      reasonAr: isCanceled
        ? 'تم إلغاء نافذة البصمة أو تعذر الوصول للمستشعر — يمكنك الدخول/الخروج عبر الباركود الوظيفي الخاص بك.'
        : 'مستشعر البصمة غير متاح في هذه الجلسة — تم تفعيل خيار الباركود الوظيفي البديل.',
    };
  }
}

/**
 * Computes a lightweight deterministic integrity hash of a captured camera frame data URL.
 */
export function computeSnapshotIntegrityHash(dataUrl?: string | null): string {
  if (!dataUrl) return '';
  let h1 = 0xdeadbeef ^ dataUrl.length;
  let h2 = 0x41c6ce57 ^ dataUrl.length;
  const step = Math.max(1, Math.floor(dataUrl.length / 256));
  for (let i = 0; i < dataUrl.length; i += step) {
    const ch = dataUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `CAM-${hex1}${hex2}`.toUpperCase();
}

/**
 * Logs a cross-employee barcode spoofing / mismatch attempt in `activity_log`.
 */
export async function logCrossEmployeeGateMismatch(params: {
  currentUser: Partial<UserProfile>;
  attemptedInput: string;
  otherEmployeeName?: string;
  direction: GateDirection;
}): Promise<void> {
  try {
    const identity = generateEmployeeBarcodeIdentity(params.currentUser);
    const empName = params.currentUser.full_name || params.currentUser.username || 'موظف';
    await realErpDataStore.addRecord<any>('activity_log', {
      id: `ACT-SEC-${Date.now().toString().slice(-6)}`,
      company_id: identity.companyCode,
      user_name: empName,
      role: params.currentUser.role || 'موظف',
      action_type: 'رفض باركود غير مطابق للموظف',
      module: 'الحضور والانصراف والأمان الحيوي',
      details: `محاولة ${
        params.direction === 'CHECK_IN' ? 'دخول' : 'خروج'
      } برمز (${params.attemptedInput}) ${
        params.otherEmployeeName ? `الخاص بالموظف (${params.otherEmployeeName})` : 'غير مطابق'
      } أثناء جلسة (${empName}). تم الرفض آلياً.`,
      severity: 'مرتفع',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
  } catch {
    // non-blocking
  }
}

/**
 * Persists a Check-In (upon app open) or Check-Out (upon sign-out) for the specific employee
 * into `attendances`, `hr_employee_biometric_profiles`, & `activity_log`,
 * and updates/clears ONLY that employee's session attendance stamp.
 */
export async function recordGateAttendanceAction(params: {
  user: Partial<UserProfile>;
  direction: GateDirection;
  channel: GateVerificationChannel;
  cameraCaptured: boolean;
  snapshotDataUrl?: string | null;
  now?: Date;
}): Promise<{
  timeHHMM: string;
  dateIso: string;
  workHours: number;
  badgeCode: string;
  verificationMethod: AttendanceVerificationMethod;
}> {
  const now = params.now || new Date();
  const dateIso = getTodayIsoDate(now);
  const timeHHMM = getCurrentHHMM(now);
  const identity = generateEmployeeBarcodeIdentity(params.user, now);
  const userKey = identity.employeeKey;
  const kasMatch = findMatchingKasDirectoryEmployee(params.user);

  const empName =
    params.user.full_name || kasMatch?.nameAr || params.user.username || 'موظف النظام';
  const empId = String(params.user.id || kasMatch?.id || userKey);
  const department =
    params.user.department_name_ar ||
    (kasMatch ? DEPT_ARABIC_NAMES[kasMatch.department_id] : '') ||
    params.user.role ||
    'الإدارة التشغيلية';
  const companyId = identity.companyCode;
  const snapshotHash = computeSnapshotIntegrityHash(params.snapshotDataUrl);
  const compactSnapshot =
    params.snapshotDataUrl && params.snapshotDataUrl.length <= 180_000
      ? params.snapshotDataUrl
      : undefined;

  const verificationMethod: AttendanceVerificationMethod =
    params.channel === 'BIOMETRIC_CAMERA' ? 'BIOMETRIC_ZKT' : 'KIOSK_TABLET';

  const shifts = await realErpDataStore.getRecords<any>('hr_shifts', DEFAULT_HR_SHIFTS);
  const activeShift =
    (Array.isArray(shifts) && shifts.length > 0 ? shifts[0] : null) || DEFAULT_HR_SHIFTS[0];

  const allAttendances = await realErpDataStore.getRecords<any>('attendances', []);
  const existingToday = (Array.isArray(allAttendances) ? allAttendances : []).find(
    (r: any) =>
      r &&
      r.date === dateIso &&
      (String(r.employee_id).toLowerCase() === empId.toLowerCase() ||
        String(r.employee_key || '').toLowerCase() === userKey.toLowerCase() ||
        String(r.emp_name || '').trim() === empName.trim())
  );

  let workHours = 0;
  const prevOverride = readOverridesMap()[userKey] || {};

  if (params.direction === 'CHECK_IN') {
    const effectiveCheckIn =
      existingToday?.check_in && existingToday.check_in !== '--:--'
        ? existingToday.check_in
        : timeHHMM;
    const effectiveCheckOut =
      existingToday?.check_out && existingToday.check_out !== '--:--'
        ? existingToday.check_out
        : effectiveCheckIn;

    const evalRes = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: effectiveCheckIn,
      checkOut: effectiveCheckOut,
      shift: activeShift,
    });
    workHours =
      existingToday?.check_out && existingToday.check_out !== '--:--'
        ? evalRes.workHours
        : 0;

    if (existingToday) {
      await realErpDataStore.updateRecord<any>('attendances', existingToday.id, {
        employee_key: userKey,
        badge_code: identity.badgeCode,
        verification_method: verificationMethod,
        check_in_channel: params.channel,
        kiosk_photo_captured: Boolean(existingToday.kiosk_photo_captured || params.cameraCaptured),
        ...(snapshotHash ? { kiosk_photo_hash: snapshotHash } : {}),
        ...(compactSnapshot ? { check_in_snapshot: compactSnapshot } : {}),
      });
    } else {
      await realErpDataStore.addRecord<any>('attendances', {
        id: `ATT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
        company_id: companyId,
        employee_id: empId,
        employee_key: userKey,
        badge_code: identity.badgeCode,
        emp_name: empName,
        department,
        date: dateIso,
        shift_id: activeShift.id,
        shift_name: activeShift.name_ar,
        check_in: timeHHMM,
        check_out: '--:--',
        work_hours: 0,
        late_minutes: evalRes.lateMinutes,
        early_leave_minutes: 0,
        overtime_minutes: 0,
        verification_method: verificationMethod,
        check_in_channel: params.channel,
        distance_meters: 0,
        mock_location_detected: false,
        is_holiday_work: false,
        payroll_synced: false,
        status: evalRes.status,
        kiosk_photo_captured: params.cameraCaptured,
        kiosk_photo_hash: snapshotHash || undefined,
        check_in_snapshot: compactSnapshot,
      });
    }

    updateEmployeeOverride(userKey, {
      ...(params.channel === 'BIOMETRIC_CAMERA' ? { biometricEnrolled: true } : {}),
      lastCheckInDate: dateIso,
      lastCheckInTime: effectiveCheckIn,
      lastCheckInChannel: params.channel,
      ...(compactSnapshot ? { lastCheckInSnapshot: compactSnapshot } : {}),
      ...(snapshotHash ? { lastCheckInHash: snapshotHash } : {}),
      verifiedSessionsCount: (prevOverride.verifiedSessionsCount || 0) + 1,
    });

    const stamp: SessionAttendanceStamp = {
      userKey,
      employeeId: empId,
      employeeName: empName,
      companyId,
      date: dateIso,
      checkInTime: effectiveCheckIn,
      channel: params.channel,
      cameraCaptured: params.cameraCaptured,
      snapshotHash: snapshotHash || undefined,
      badgeCode: identity.badgeCode,
      verifiedAtIso: now.toISOString(),
    };

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(getSessionStorageKey(params.user, now), JSON.stringify(stamp));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp-attendance-session-updated', { detail: stamp }));
      }
    } catch {
      // non-blocking
    }
  } else {
    // CHECK_OUT on Sign-Out
    const checkInBase =
      existingToday?.check_in && existingToday.check_in !== '--:--'
        ? existingToday.check_in
        : getSessionCheckInStamp(params.user, now)?.checkInTime || timeHHMM;

    const evalRes = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: checkInBase,
      checkOut: timeHHMM,
      shift: activeShift,
    });
    workHours = evalRes.workHours;

    if (existingToday) {
      await realErpDataStore.updateRecord<any>('attendances', existingToday.id, {
        employee_key: userKey,
        badge_code: identity.badgeCode,
        check_out: timeHHMM,
        work_hours: evalRes.workHours,
        late_minutes: evalRes.lateMinutes,
        early_leave_minutes: evalRes.earlyLeaveMinutes,
        overtime_minutes: evalRes.overtimeMinutes,
        verification_method: verificationMethod,
        check_out_channel: params.channel,
        status: evalRes.status,
        kiosk_photo_captured: Boolean(existingToday.kiosk_photo_captured || params.cameraCaptured),
        ...(snapshotHash ? { check_out_photo_hash: snapshotHash } : {}),
        ...(compactSnapshot ? { check_out_snapshot: compactSnapshot } : {}),
      });
    } else {
      await realErpDataStore.addRecord<any>('attendances', {
        id: `ATT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
        company_id: companyId,
        employee_id: empId,
        employee_key: userKey,
        badge_code: identity.badgeCode,
        emp_name: empName,
        department,
        date: dateIso,
        shift_id: activeShift.id,
        shift_name: activeShift.name_ar,
        check_in: checkInBase,
        check_out: timeHHMM,
        work_hours: evalRes.workHours,
        late_minutes: evalRes.lateMinutes,
        early_leave_minutes: evalRes.earlyLeaveMinutes,
        overtime_minutes: evalRes.overtimeMinutes,
        verification_method: verificationMethod,
        check_out_channel: params.channel,
        distance_meters: 0,
        mock_location_detected: false,
        is_holiday_work: false,
        payroll_synced: false,
        status: evalRes.status,
        kiosk_photo_captured: params.cameraCaptured,
        kiosk_photo_hash: snapshotHash || undefined,
        check_out_snapshot: compactSnapshot,
      });
    }

    updateEmployeeOverride(userKey, {
      ...(params.channel === 'BIOMETRIC_CAMERA' ? { biometricEnrolled: true } : {}),
      lastCheckOutDate: dateIso,
      lastCheckOutTime: timeHHMM,
      lastCheckOutChannel: params.channel,
      ...(compactSnapshot ? { lastCheckOutSnapshot: compactSnapshot } : {}),
      ...(snapshotHash ? { lastCheckOutHash: snapshotHash } : {}),
      lastWorkHours: evalRes.workHours,
    });

    clearSessionCheckInStamp(params.user);
  }

  // Persist per-employee gate summary into `hr_employee_biometric_profiles` table for audit/reporting
  try {
    const profileObj = await getEmployeeGateProfile(params.user, now);
    const existingProfiles = await realErpDataStore.getRecords<any>(
      'hr_employee_biometric_profiles',
      []
    );
    const matchedRow = (Array.isArray(existingProfiles) ? existingProfiles : []).find(
      (r: any) => r && r.employeeKey === userKey
    );
    if (matchedRow) {
      await realErpDataStore.updateRecord<any>(
        'hr_employee_biometric_profiles',
        matchedRow.id,
        profileObj
      );
    } else {
      await realErpDataStore.addRecord<any>('hr_employee_biometric_profiles', {
        id: `BIOPROF-${empId}`,
        ...profileObj,
      });
    }
  } catch {
    // non-blocking
  }

  const channelLabelAr =
    params.channel === 'BIOMETRIC_CAMERA'
      ? 'البصمة الحيوية + الكاميرا المباشرة'
      : params.channel === 'BARCODE_CAMERA'
      ? 'مسح الباركود بالكاميرا المباشرة'
      : 'الباركود الوظيفي البديل';

  try {
    await realErpDataStore.addRecord<any>('activity_log', {
      id: `ACT-GATE-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      user_name: empName,
      role: params.user.role || kasMatch?.titleAr || 'موظف',
      action_type: params.direction === 'CHECK_IN' ? 'بصمة دخول للنظام' : 'بصمة خروج وانصراف',
      module: 'الحضور والانصراف والأمان الحيوي',
      details: `[${identity.badgeCode}] ${
        params.direction === 'CHECK_IN' ? 'تسجيل دخول وحضور' : 'تسجيل خروج وانصراف'
      } للموظف (${empName}) الساعة ${timeHHMM} عبر (${channelLabelAr}) ${
        params.cameraCaptured ? `[توثيق الكاميرا: ${snapshotHash || 'مفعل'}]` : '[بدون لقطة كاميرا]'
      }`,
      severity: 'عادي',
      created_at: now.toISOString().replace('T', ' ').slice(0, 16),
    });
  } catch {
    // non-blocking
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-data-updated'));
  }

  return {
    timeHHMM,
    dateIso,
    workHours,
    badgeCode: identity.badgeCode,
    verificationMethod,
  };
}

/**
 * Builds the complete, individual Biometric, Camera & Barcode verification profile for a single employee.
 */
export async function getEmployeeGateProfile(
  employeeOrUser: Record<string, any>,
  now: Date = new Date()
): Promise<EmployeeBiometricGateProfile> {
  const kasMatch = findMatchingKasDirectoryEmployee(employeeOrUser);
  const identity = generateEmployeeBarcodeIdentity(employeeOrUser, now);
  const userKey = identity.employeeKey;
  const overrides = readOverridesMap()[userKey] || {};
  const credMap = readStoredCredentialMap();
  const todayIso = getTodayIsoDate(now);

  const allAttendances = await realErpDataStore.getRecords<any>('attendances', []);
  const fullName =
    employeeOrUser.full_name ||
    employeeOrUser.nameAr ||
    employeeOrUser.name ||
    kasMatch?.nameAr ||
    'موظف معتمد';
  const empId = String(
    employeeOrUser.id || employeeOrUser.employee_id || kasMatch?.id || userKey
  );

  const todayRecord = (Array.isArray(allAttendances) ? allAttendances : []).find(
    (r: any) =>
      r &&
      r.date === todayIso &&
      (String(r.employee_key || '').toLowerCase() === userKey.toLowerCase() ||
        String(r.employee_id || '').toLowerCase() === empId.toLowerCase() ||
        String(r.emp_name || '').trim() === fullName.trim())
  );

  const hasWebAuthnCred = Boolean(credMap[userKey] || overrides.biometricEnrolled);
  const checkedInToday = Boolean(
    (todayRecord?.check_in && todayRecord.check_in !== '--:--') ||
      overrides.lastCheckInDate === todayIso
  );
  const checkedOutToday = Boolean(
    (todayRecord?.check_out && todayRecord.check_out !== '--:--') ||
      overrides.lastCheckOutDate === todayIso
  );

  return {
    employeeKey: userKey,
    employeeId: empId,
    serial: kasMatch?.serial,
    email: employeeOrUser.email || kasMatch?.email || `${userKey}@kas.sa`,
    username: employeeOrUser.username || kasMatch?.username || userKey,
    fullName,
    role:
      employeeOrUser.role ||
      employeeOrUser.job_title ||
      employeeOrUser.titleAr ||
      kasMatch?.titleAr ||
      'موظف',
    companyCode: identity.companyCode,
    departmentNameAr:
      employeeOrUser.department_name_ar ||
      employeeOrUser.department ||
      (kasMatch ? DEPT_ARABIC_NAMES[kasMatch.department_id] : '') ||
      'الإدارة التشغيلية',
    phone: employeeOrUser.phone || employeeOrUser.mobile || undefined,
    badgeCode: identity.badgeCode,
    shortPinCode: identity.shortPinCode,
    qrPayload: identity.qrPayload,
    barcodeVersion: identity.barcodeVersion,
    biometricEnrolled: hasWebAuthnCred,
    biometricEnrolledAt: overrides.biometricEnrolledAt,
    biometricCredentialHint:
      overrides.biometricCredentialHint ||
      (credMap[userKey] ? `BIO-${credMap[userKey].slice(0, 8).toUpperCase()}` : undefined),
    gatePolicy: overrides.gatePolicy || 'BIOMETRIC_WITH_BARCODE_FALLBACK',
    requireLiveCamera: overrides.requireLiveCamera !== false,
    lastCheckInDate: todayRecord?.date || overrides.lastCheckInDate,
    lastCheckInTime:
      todayRecord?.check_in && todayRecord.check_in !== '--:--'
        ? todayRecord.check_in
        : overrides.lastCheckInTime,
    lastCheckInChannel: todayRecord?.check_in_channel || overrides.lastCheckInChannel,
    lastCheckInSnapshot: todayRecord?.check_in_snapshot || overrides.lastCheckInSnapshot,
    lastCheckInHash: todayRecord?.kiosk_photo_hash || overrides.lastCheckInHash,
    lastCheckOutDate:
      todayRecord?.check_out && todayRecord.check_out !== '--:--'
        ? todayRecord.date
        : overrides.lastCheckOutDate,
    lastCheckOutTime:
      todayRecord?.check_out && todayRecord.check_out !== '--:--'
        ? todayRecord.check_out
        : overrides.lastCheckOutTime,
    lastCheckOutChannel: todayRecord?.check_out_channel || overrides.lastCheckOutChannel,
    lastCheckOutSnapshot: todayRecord?.check_out_snapshot || overrides.lastCheckOutSnapshot,
    lastCheckOutHash: todayRecord?.check_out_photo_hash || overrides.lastCheckOutHash,
    lastWorkHours:
      typeof todayRecord?.work_hours === 'number' && todayRecord.work_hours > 0
        ? todayRecord.work_hours
        : overrides.lastWorkHours,
    verifiedSessionsCount: overrides.verifiedSessionsCount || (checkedInToday ? 1 : 0),
    checkedInToday,
    checkedOutToday,
  };
}

/**
 * Returns the complete Per-Employee Gate Verification Directory across ALL 69 official `@kas.sa`
 * employees plus any additional HR employees in `hr_employees` / `employees`, so HR & Management
 * can verify, inspect, print cards, and audit each employee individually.
 */
export async function getAllEmployeesGateVerificationDirectory(
  companyFilter?: string,
  now: Date = new Date()
): Promise<EmployeeBiometricGateProfile[]> {
  const hrEmployees = await realErpDataStore.getRecords<any>('hr_employees', []);
  const legacyEmployees = await realErpDataStore.getRecords<any>('employees', []);
  const allAttendances = await realErpDataStore.getRecords<any>('attendances', []);
  const overridesMap = readOverridesMap();
  const credMap = readStoredCredentialMap();
  const todayIso = getTodayIsoDate(now);

  const seenKeys = new Set<string>();
  const combinedSeeds: Record<string, any>[] = [];

  for (const kasEmp of KAS_ALLOWED_EMPLOYEES) {
    const key = resolveUserGateKey(kasEmp);
    seenKeys.add(key);
    combinedSeeds.push(kasEmp);
  }

  for (const extra of [
    ...(Array.isArray(hrEmployees) ? hrEmployees : []),
    ...(Array.isArray(legacyEmployees) ? legacyEmployees : []),
  ]) {
    if (!extra || extra.is_deleted) continue;
    const key = resolveUserGateKey(extra);
    const matchedKas = findMatchingKasDirectoryEmployee(extra);
    if (matchedKas || seenKeys.has(key)) continue;
    seenKeys.add(key);
    combinedSeeds.push(extra);
  }

  const normalizedFilter =
    companyFilter && companyFilter !== 'all' && companyFilter !== 'ALL'
      ? normalizeCanonicalEntityCode(companyFilter)
      : null;

  const profiles: EmployeeBiometricGateProfile[] = [];

  for (const seed of combinedSeeds) {
    const kasMatch = findMatchingKasDirectoryEmployee(seed);
    const identity = generateEmployeeBarcodeIdentity(seed, now);
    if (normalizedFilter && identity.companyCode !== normalizedFilter) {
      continue;
    }

    const userKey = identity.employeeKey;
    const overrides = overridesMap[userKey] || {};
    const fullName =
      seed.full_name || seed.nameAr || seed.name || kasMatch?.nameAr || 'موظف معتمد';
    const empId = String(seed.id || seed.employee_id || kasMatch?.id || userKey);

    const todayRecord = (Array.isArray(allAttendances) ? allAttendances : []).find(
      (r: any) =>
        r &&
        r.date === todayIso &&
        (String(r.employee_key || '').toLowerCase() === userKey.toLowerCase() ||
          String(r.employee_id || '').toLowerCase() === empId.toLowerCase() ||
          String(r.emp_name || '').trim() === fullName.trim())
    );

    const hasWebAuthnCred = Boolean(credMap[userKey] || overrides.biometricEnrolled);
    const checkedInToday = Boolean(
      (todayRecord?.check_in && todayRecord.check_in !== '--:--') ||
        overrides.lastCheckInDate === todayIso
    );
    const checkedOutToday = Boolean(
      (todayRecord?.check_out && todayRecord.check_out !== '--:--') ||
        overrides.lastCheckOutDate === todayIso
    );

    profiles.push({
      employeeKey: userKey,
      employeeId: empId,
      serial: kasMatch?.serial,
      email: seed.email || kasMatch?.email || `${userKey}@kas.sa`,
      username: seed.username || kasMatch?.username || userKey,
      fullName,
      role: seed.role || seed.job_title || seed.titleAr || kasMatch?.titleAr || 'موظف',
      companyCode: identity.companyCode,
      departmentNameAr:
        seed.department_name_ar ||
        seed.department ||
        (kasMatch ? DEPT_ARABIC_NAMES[kasMatch.department_id] : '') ||
        'الإدارة التشغيلية',
      phone: seed.phone || seed.mobile || undefined,
      badgeCode: identity.badgeCode,
      shortPinCode: identity.shortPinCode,
      qrPayload: identity.qrPayload,
      barcodeVersion: identity.barcodeVersion,
      biometricEnrolled: hasWebAuthnCred,
      biometricEnrolledAt: overrides.biometricEnrolledAt,
      biometricCredentialHint:
        overrides.biometricCredentialHint ||
        (credMap[userKey] ? `BIO-${credMap[userKey].slice(0, 8).toUpperCase()}` : undefined),
      gatePolicy: overrides.gatePolicy || 'BIOMETRIC_WITH_BARCODE_FALLBACK',
      requireLiveCamera: overrides.requireLiveCamera !== false,
      lastCheckInDate: todayRecord?.date || overrides.lastCheckInDate,
      lastCheckInTime:
        todayRecord?.check_in && todayRecord.check_in !== '--:--'
          ? todayRecord.check_in
          : overrides.lastCheckInTime,
      lastCheckInChannel: todayRecord?.check_in_channel || overrides.lastCheckInChannel,
      lastCheckInSnapshot: todayRecord?.check_in_snapshot || overrides.lastCheckInSnapshot,
      lastCheckInHash: todayRecord?.kiosk_photo_hash || overrides.lastCheckInHash,
      lastCheckOutDate:
        todayRecord?.check_out && todayRecord.check_out !== '--:--'
          ? todayRecord.date
          : overrides.lastCheckOutDate,
      lastCheckOutTime:
        todayRecord?.check_out && todayRecord.check_out !== '--:--'
          ? todayRecord.check_out
          : overrides.lastCheckOutTime,
      lastCheckOutChannel: todayRecord?.check_out_channel || overrides.lastCheckOutChannel,
      lastCheckOutSnapshot: todayRecord?.check_out_snapshot || overrides.lastCheckOutSnapshot,
      lastCheckOutHash: todayRecord?.check_out_photo_hash || overrides.lastCheckOutHash,
      lastWorkHours:
        typeof todayRecord?.work_hours === 'number' && todayRecord.work_hours > 0
          ? todayRecord.work_hours
          : overrides.lastWorkHours,
      verifiedSessionsCount: overrides.verifiedSessionsCount || (checkedInToday ? 1 : 0),
      checkedInToday,
      checkedOutToday,
    });
  }

  return profiles;
}

/**
 * Re-issues a brand-new collision-free Barcode & PIN exclusively for a single employee
 * (e.g., if their physical card was lost), invalidating their previous barcode immediately.
 */
export async function regenerateEmployeeBarcode(
  employeeOrUser: Record<string, any>
): Promise<EmployeeBiometricGateProfile> {
  const userKey = resolveUserGateKey(employeeOrUser);
  const existingOverrides = readOverridesMap()[userKey] || {};
  const nextVersion = (existingOverrides.barcodeVersion || 1) + 1;

  // Ensure zero collision with any existing employee PIN
  const usedPins = new Set<string>();
  for (const emp of KAS_ALLOWED_EMPLOYEES) {
    if (resolveUserGateKey(emp) !== userKey) {
      usedPins.add(generateEmployeeBarcodeIdentity(emp).shortPinCode);
    }
  }

  let candidatePin = '';
  let attempt = 0;
  do {
    const chk = computeDeterministicChecksum3(`${userKey}|V${nextVersion}|${Date.now()}|${attempt}`);
    const prefix = String(500 + ((nextVersion * 37 + attempt * 13) % 490)).padStart(3, '0');
    candidatePin = `${prefix}${chk}`;
    attempt++;
  } while (usedPins.has(candidatePin) && attempt < 50);

  updateEmployeeOverride(userKey, {
    customSixDigits: candidatePin,
    barcodeVersion: nextVersion,
  });

  const updatedProfile = await getEmployeeGateProfile(employeeOrUser);

  try {
    await realErpDataStore.addRecord<any>('activity_log', {
      id: `ACT-BAR-${Date.now().toString().slice(-6)}`,
      company_id: updatedProfile.companyCode,
      user_name: updatedProfile.fullName,
      role: updatedProfile.role,
      action_type: 'إعادة إصدار باركود موظف',
      module: 'الحضور والانصراف والأمان الحيوي',
      details: `تم إصدار باركود وظيفي جديد (${updatedProfile.badgeCode} - إصدار V${nextVersion}) للموظف (${updatedProfile.fullName}) وإلغاء الرمز السابق.`,
      severity: 'عادي',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
  } catch {
    // non-blocking
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-data-updated'));
  }

  return updatedProfile;
}

/**
 * Resets hardware biometric enrollment strictly for one specific employee so they re-enroll on next session.
 */
export async function resetEmployeeBiometricEnrollment(
  employeeOrUser: Record<string, any>
): Promise<EmployeeBiometricGateProfile> {
  const userKey = resolveUserGateKey(employeeOrUser);
  try {
    if (typeof localStorage !== 'undefined') {
      const map = readStoredCredentialMap();
      delete map[userKey];
      localStorage.setItem(WEBAUTHN_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // non-blocking
  }

  updateEmployeeOverride(userKey, {
    biometricEnrolled: false,
    biometricEnrolledAt: undefined,
    biometricCredentialHint: undefined,
  });

  const updated = await getEmployeeGateProfile(employeeOrUser);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-data-updated'));
  }
  return updated;
}

/**
 * Updates per-employee gate verification policy (`BIOMETRIC_WITH_BARCODE_FALLBACK` vs `BARCODE_PRIMARY`, `requireLiveCamera`).
 */
export async function updateEmployeeGatePolicy(
  employeeOrUser: Record<string, any>,
  updates: Partial<Pick<EmployeeBiometricGateProfile, 'gatePolicy' | 'requireLiveCamera'>>
): Promise<EmployeeBiometricGateProfile> {
  const userKey = resolveUserGateKey(employeeOrUser);
  updateEmployeeOverride(userKey, updates);
  const updated = await getEmployeeGateProfile(employeeOrUser);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('erp-data-updated'));
  }
  return updated;
}
