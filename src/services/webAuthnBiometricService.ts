/**
 * WebAuthn Real Hardware Biometric Service
 * Manages native Touch ID / Face ID / Windows Hello / Android Biometrics
 * for Khalid Al-Sulaim Holding Group ERP.
 * 
 * Provides comprehensive enrollment, verification, persistence,
 * and user account configuration.
 */

import { realErpDataStore } from './realErpDataStore';

export interface BiometricAuthResult {
  success: boolean;
  isRealHardware: boolean;
  credentialId?: string;
  authenticatorType?: 'windows-hello' | 'touch-id' | 'face-id' | 'generic-biometric';
  errorMessage?: string;
  canceled?: boolean;
}

export interface RegisteredBiometricCredential {
  id: string;
  credentialId: string;
  userId: string;
  username: string;
  fullName: string;
  deviceName: string;
  authenticatorType: 'windows-hello' | 'touch-id' | 'face-id' | 'generic-biometric';
  biometricType: 'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)' | 'بصمة مزدوجة';
  enrolledAt: string;
  lastUsedAt?: string;
  systemScope: string;
  status: 'نشط' | 'معطل';
}

const INITIAL_SEEDED_CREDENTIALS: RegisteredBiometricCredential[] = [];

/**
 * Check if the browser and operating system support WebAuthn
 */
export const checkWebAuthnSupport = async (): Promise<{ supported: boolean; hasHardware: boolean; detectedDevice: string }> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
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
  } catch (error) {
    return { supported: true, hasHardware: false, detectedDevice };
  }
};

/**
 * Convert string to Uint8Array buffer
 */
const strToBuffer = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

/**
 * Convert ArrayBuffer to Base64
 */
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Get all registered biometric credentials for all or a specific user
 */
export const getStoredBiometricCredentials = async (username?: string): Promise<RegisteredBiometricCredential[]> => {
  const allRecords = await realErpDataStore.getRecords<RegisteredBiometricCredential>(
    'user_biometrics',
    INITIAL_SEEDED_CREDENTIALS
  );

  if (!username) return allRecords;
  return allRecords.filter(r => r.username.toLowerCase() === username.toLowerCase());
};

/**
 * Register & Enroll a new real WebAuthn hardware biometric credential for a user account
 */
export const registerUserBiometric = async (
  user: { id: string; username: string; fullName: string; systemScope?: string },
  biometricType: 'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)' | 'بصمة مزدوجة'
): Promise<{ success: boolean; credential?: RegisteredBiometricCredential; errorMessage?: string; canceled?: boolean }> => {
  const support = await checkWebAuthnSupport();

  // If browser supports WebAuthn, attempt real hardware enrollment
  if (support.supported) {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const hostname = window.location.hostname || 'localhost';
    const userId = strToBuffer(user.username || user.id);

    const creationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as unknown as BufferSource,
      rp: {
        name: `مجموعة خالد السليم ERP - ${user.systemScope || 'منظومة الدخول الموحد'}`,
        id: hostname === 'localhost' ? 'localhost' : hostname
      },
      user: {
        id: userId as unknown as BufferSource,
        name: user.username || 'user@alsulaim.sa',
        displayName: user.fullName || user.username
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none'
    };

    try {
      const newCred = await navigator.credentials.create({
        publicKey: creationOptions
      }) as PublicKeyCredential;

      if (newCred) {
        const rawIdB64 = bufferToBase64(newCred.rawId);
        const authType: RegisteredBiometricCredential['authenticatorType'] = 
          biometricType === 'Touch ID (بصمة إصبع)' ? 'touch-id' :
          biometricType === 'Face ID (بصمة وجه)' ? 'face-id' : 'windows-hello';

        const record: RegisteredBiometricCredential = {
          id: `bio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          credentialId: rawIdB64,
          userId: user.id,
          username: user.username,
          fullName: user.fullName,
          deviceName: support.detectedDevice,
          authenticatorType: authType,
          biometricType,
          enrolledAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          systemScope: user.systemScope || 'جميع المنظومات',
          status: 'نشط'
        };

        // Save credential to local and cloud store
        await realErpDataStore.addRecord<RegisteredBiometricCredential>('user_biometrics', record, INITIAL_SEEDED_CREDENTIALS);
        
        // Save key mapping for quick login
        localStorage.setItem(`alsulaim_webauthn_cred_${user.username}_${user.systemScope || 'default'}`, rawIdB64);
        localStorage.setItem(`alsulaim_webauthn_cred_${user.username}`, rawIdB64);

        return { success: true, credential: record };
      }
    } catch (err: any) {
      console.warn('Hardware biometric registration notice:', err);

      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        return {
          success: false,
          canceled: true,
          errorMessage: 'تم إلغاء نافذة تسجيل البصمة من قبلك على نظام التشغيل.'
        };
      }
      return {
        success: false,
        errorMessage: err?.message || 'فشل تسجيل البصمة العتادية عبر مستشعر الجهاز.'
      };
    }
  }

  return {
    success: false,
    errorMessage: 'المستشعر البيومتري العتادي (WebAuthn / FIDO2) غير متوفر على هذا الجهاز أو المتصفح.'
  };
};

/**
 * Test assertion on an enrolled biometric credential
 */
export const testBiometricAssertion = async (
  credential: RegisteredBiometricCredential
): Promise<BiometricAuthResult> => {
  const support = await checkWebAuthnSupport();

  if (support.supported && navigator.credentials) {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const hostname = window.location.hostname || 'localhost';

    try {
      let credIdBytes: Uint8Array;
      try {
        credIdBytes = Uint8Array.from(atob(credential.credentialId), c => c.charCodeAt(0));
      } catch {
        credIdBytes = strToBuffer(credential.credentialId);
      }

      const getOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge as unknown as BufferSource,
        timeout: 60000,
        rpId: hostname === 'localhost' ? 'localhost' : hostname,
        userVerification: 'preferred',
        allowCredentials: [
          {
            type: 'public-key',
            id: credIdBytes as unknown as BufferSource,
            transports: ['internal']
          }
        ]
      };

      const assertion = await navigator.credentials.get({
        publicKey: getOptions
      }) as PublicKeyCredential;

      if (assertion) {
        // Update last used timestamp
        await realErpDataStore.updateRecord<RegisteredBiometricCredential>(
          'user_biometrics',
          credential.id,
          { lastUsedAt: new Date().toISOString() },
          INITIAL_SEEDED_CREDENTIALS
        );

        return {
          success: true,
          isRealHardware: true,
          credentialId: assertion.id,
          authenticatorType: credential.authenticatorType
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        return {
          success: false,
          isRealHardware: true,
          canceled: true,
          errorMessage: 'تم إلغاء نافذة المطابقة البيومترية.'
        };
      }
      return {
        success: false,
        isRealHardware: true,
        errorMessage: err?.message || 'فشل التحقق من البصمة العتادية.'
      };
    }
  }

  return {
    success: false,
    isRealHardware: false,
    errorMessage: 'المستشعر البيومتري العتادي (WebAuthn / FIDO2) غير متاح للمصادقة.'
  };
};

/**
 * Remove an enrolled biometric credential
 */
export const removeStoredBiometricCredential = async (
  credentialId: string,
  username?: string
): Promise<boolean> => {
  await realErpDataStore.deleteRecord<RegisteredBiometricCredential>(
    'user_biometrics',
    credentialId,
    INITIAL_SEEDED_CREDENTIALS
  );

  if (username) {
    localStorage.removeItem(`alsulaim_webauthn_cred_${username}`);
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
 * Trigger Real Hardware Biometric Authentication for Login
 */
export const performRealBiometricAuth = async (
  username: string,
  systemName: string,
  type: 'fingerprint' | 'face'
): Promise<BiometricAuthResult> => {
  const support = await checkWebAuthnSupport();

  if (!support.supported) {
    return {
      success: false,
      isRealHardware: false,
      errorMessage: 'متصفحك الحالي لا يدعم بروتوكول المصادقة البيومترية WebAuthn.'
    };
  }

  // Generate cryptographically secure random challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  // Hostname check
  const hostname = window.location.hostname || 'localhost';

  // Check if we have an existing registered credential ID for this user/system
  const savedCredKey = `alsulaim_webauthn_cred_${username}_${systemName}`;
  const savedCredId = localStorage.getItem(savedCredKey) || localStorage.getItem(`alsulaim_webauthn_cred_${username}`);

  try {
    if (savedCredId) {
      // Step 1: Try assertion (get existing credential)
      let credIdBytes: Uint8Array;
      try {
        credIdBytes = Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0));
      } catch {
        credIdBytes = strToBuffer(savedCredId);
      }
      
      const getOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge as unknown as BufferSource,
        timeout: 60000,
        rpId: hostname === 'localhost' ? 'localhost' : hostname,
        userVerification: 'preferred',
        allowCredentials: [
          {
            type: 'public-key',
            id: credIdBytes as unknown as BufferSource,
            transports: ['internal']
          }
        ]
      };

      const assertion = await navigator.credentials.get({
        publicKey: getOptions
      }) as PublicKeyCredential;

      if (assertion) {
        return {
          success: true,
          isRealHardware: true,
          credentialId: assertion.id,
          authenticatorType: type === 'fingerprint' ? 'touch-id' : 'face-id'
        };
      }
    }

    // Step 2: If no saved credential or assertion failed, create a new platform credential
    const userId = strToBuffer(username || 'alsulaim_user');
    
    const creationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as unknown as BufferSource,
      rp: {
        name: `مجموعة خالد السليم ERP - ${systemName}`,
        id: hostname === 'localhost' ? 'localhost' : hostname
      },
      user: {
        id: userId as unknown as BufferSource,
        name: username || 'admin@alsulaim.sa',
        displayName: `${username} (${systemName})`
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none'
    };

    const newCredential = await navigator.credentials.create({
      publicKey: creationOptions
    }) as PublicKeyCredential;

    if (newCredential) {
      const rawIdB64 = bufferToBase64(newCredential.rawId);
      localStorage.setItem(savedCredKey, rawIdB64);
      localStorage.setItem(`alsulaim_webauthn_cred_${username}`, rawIdB64);

      return {
        success: true,
        isRealHardware: true,
        credentialId: newCredential.id,
        authenticatorType: type === 'fingerprint' ? 'touch-id' : 'face-id'
      };
    }

    return {
      success: false,
      isRealHardware: true,
      errorMessage: 'لم يتم استلام مصادقة صالحة من الجهاز.'
    };
  } catch (err: any) {
    console.warn('WebAuthn hardware authentication notice:', err);

    // Handle user cancellation specifically
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      return {
        success: false,
        isRealHardware: true,
        canceled: true,
        errorMessage: 'تم إلغاء نافذة المصادقة البيومترية من قبلك على جهازك.'
      };
    }

    if (err.name === 'InvalidStateError') {
      return {
        success: false,
        isRealHardware: true,
        errorMessage: 'جهاز المصادقة البيومترية قيد الاستخدام في جلسة أخرى.'
      };
    }

    return {
      success: false,
      isRealHardware: false,
      errorMessage: err.message || 'تعذر استدعاء مستشعر البصمة على جهازك.'
    };
  }
};
