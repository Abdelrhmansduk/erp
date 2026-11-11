/**
 * Firebase Client Integration for ERP Khalid Al-Sulaim
 * Dual Architecture: Combines Supabase (PostgreSQL relational data, ERP tables, RLS)
 * with Firebase (Google Authentication, Push Notifications, Cloud Messaging).
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User,
  UserCredential,
} from 'firebase/auth';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const config: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured: boolean = Boolean(
  config.apiKey && config.projectId
);

export interface FirebaseGoogleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  federatedId?: string;
  lastLoginAt?: string;
  idToken: string;
}

export const GOOGLE_SYNC_STORAGE_KEY = 'ALSULAIM_GOOGLE_PROFILE_V1';

/**
 * Verified Google accounts synchronized from Firebase Auth & Supabase `public.users`.
 */
export const VERIFIED_FIREBASE_GOOGLE_ACCOUNTS: Array<{
  uid: string;
  email: string;
  displayName: string;
  fullNameAr: string;
  photoURL: string;
  phone?: string;
  federatedId: string;
  emailVerified: boolean;
  roleAr: string;
  companyId: 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | 'all';
  departmentId: 'executive' | 'finance' | 'recruitment' | 'hr' | 'crm' | 'rental' | 'ats' | 'tenders' | 'shelter';
  lastLoginAt: string;
}> = [
  {
    uid: 'kuEF4X7vLbM5dPek7jqLVYY2Zhk2',
    email: 'abdo12uk@gmail.com',
    displayName: 'Abdelrhman Abusalif',
    fullNameAr: 'م. عبدالرحمن أبوسليف (Abdelrhman Abusalif)',
    photoURL:
      'https://lh3.googleusercontent.com/a/ACg8ocLxbw3dlULzEUEu_WKwk9heYd45HPHkowiVEm1jqn7KtiUizKuwsg=s96-c',
    phone: '+966543389314',
    federatedId: '103252941451557989110',
    emailVerified: true,
    roleAr: 'مطور النظام ومدير الصلاحيات العليا — الإدارة التنفيذية',
    companyId: 'all',
    departmentId: 'executive',
    lastLoginAt: '2026-11-09T11:55:59.331Z',
  },
  {
    uid: 'UYhWtPQ8vwSmeqsET6dlfVHhOmz2',
    email: 'abdulfattahfarahat@gmail.com',
    displayName: 'Abdulfattah',
    fullNameAr: 'أ. عبدالفتاح فرحات (Abdulfattah)',
    photoURL:
      'https://lh3.googleusercontent.com/a/ACg8ocIsXG9IR2LxY_zNEoPGIrNrSB3wWKy_n0KFNOsFIr7PQXEAkA=s96-c',
    federatedId: '100421961648003580217',
    emailVerified: true,
    roleAr: 'مدير العمليات التنفيذية — الإدارة العليا',
    companyId: 'all',
    departmentId: 'executive',
    lastLoginAt: '2026-11-08T11:28:02.244Z',
  },
  {
    uid: 'gZrOhBO7lvZ9FDDgUdkqdfM41GA2',
    email: 'abdulfattahft@gmail.com',
    displayName: 'abdulfattah farahat',
    fullNameAr: 'أ. عبدالفتاح فرحات (حساب العمليات)',
    photoURL:
      'https://lh3.googleusercontent.com/a/ACg8ocKcbTr6ICckyqFmX3UMaqy5rvQKiMXdUrB9zwj8qqa5H9TdOyE=s96-c',
    federatedId: '107056963762810701227',
    emailVerified: true,
    roleAr: 'مشرف العقود والتشغيل — شركة السفير الماسي',
    companyId: 'SAF',
    departmentId: 'recruitment',
    lastLoginAt: '2026-11-07T14:43:31.936Z',
  },
  {
    uid: 'D0MrD5NFm2fRda1s8bneCdhwSzJ2',
    email: 'kamel.adsens@gmail.com',
    displayName: 'كامل',
    fullNameAr: 'أ. كامل — التسويق الرقمي وعلاقات العملاء',
    photoURL:
      'https://lh3.googleusercontent.com/a/ACg8ocIqxQBYKJMfcXgGywje-dBOcwnmeYvuT3NhT04x9fkBQ3HKBg=s96-c',
    federatedId: '101216203341271864138',
    emailVerified: true,
    roleAr: 'مدير التسويق الرقمي وخدمة العملاء (CRM)',
    companyId: 'SAF',
    departmentId: 'crm',
    lastLoginAt: '2026-11-05T17:25:32.364Z',
  },
  {
    uid: 'Zzqbfjuvx5h9BlTG7fwWjvczEIb2',
    email: 'msalhnwr@gmail.com',
    displayName: 'Mohamed Salih',
    fullNameAr: 'أ. محمد صالح محمد نور (Mohamed Salih)',
    photoURL:
      'https://lh3.googleusercontent.com/a/ACg8ocKGUhgrAazV2GiTMCdjbOBOvs94e-__EnNlts9B3WV_nJ9w8Igi=s96-c',
    federatedId: '115911926839278730255',
    emailVerified: true,
    roleAr: 'مدير المتابعة المالية والمحاسبية',
    companyId: 'SAF',
    departmentId: 'finance',
    lastLoginAt: '2026-11-05T11:50:20.342Z',
  },
];

function extractFirebaseUserFields(user: User, idToken = ''): FirebaseGoogleUser {
  const googleProviderInfo =
    user.providerData?.find((p) => p?.providerId === 'google.com') ||
    user.providerData?.[0];
  const email = user.email || googleProviderInfo?.email || null;
  const matchedVerified = email
    ? VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === email.toLowerCase()
      )
    : undefined;

  return {
    uid: user.uid || matchedVerified?.uid || '',
    email,
    displayName:
      user.displayName ||
      googleProviderInfo?.displayName ||
      matchedVerified?.displayName ||
      null,
    photoURL:
      user.photoURL ||
      googleProviderInfo?.photoURL ||
      matchedVerified?.photoURL ||
      null,
    phoneNumber: user.phoneNumber || googleProviderInfo?.phoneNumber || matchedVerified?.phone || null,
    emailVerified: user.emailVerified ?? matchedVerified?.emailVerified ?? true,
    federatedId: googleProviderInfo?.uid || matchedVerified?.federatedId,
    lastLoginAt: user.metadata?.lastSignInTime || matchedVerified?.lastLoginAt,
    idToken,
  };
}

export function getCachedGoogleProfile(): FirebaseGoogleUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_SYNC_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as FirebaseGoogleUser;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function cacheGoogleProfile(profile: FirebaseGoogleUser | null): void {
  try {
    if (profile) {
      localStorage.setItem(GOOGLE_SYNC_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(GOOGLE_SYNC_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    if (typeof window !== 'undefined') {
      onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          try {
            const token = await user.getIdToken();
            const extracted = extractFirebaseUserFields(user, token);
            cacheGoogleProfile(extracted);
            window.dispatchEvent(
              new CustomEvent('alsulaim-google-user-synced', { detail: extracted })
            );
          } catch {
            // ignore token errors during background sync
          }
        }
      });
    }
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
  }
}

export const getFirebaseAuth = (): Auth | null => firebaseAuth;
export const getFirebaseApp = (): FirebaseApp | null => firebaseApp;

/**
 * Sign in using Google OAuth via Firebase Popup.
 * Provides a seamless browser experience with zero backend redirect complications.
 */
export const signInWithGoogleFirebase = async (): Promise<{
  data: FirebaseGoogleUser | null;
  error: { message: string; code?: string } | null;
}> => {
  if (!isFirebaseConfigured || !firebaseAuth || !googleProvider) {
    return {
      data: null,
      error: {
        message:
          'خدمة Firebase غير مُهيأة بعد. يرجى ضبط VITE_FIREBASE_API_KEY و VITE_FIREBASE_PROJECT_ID في ملف .env.',
        code: 'auth/not-configured',
      },
    };
  }

  try {
    const result: UserCredential = await signInWithPopup(firebaseAuth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    const googleUser = extractFirebaseUserFields(user, idToken);
    cacheGoogleProfile(googleUser);

    return {
      data: googleUser,
      error: null,
    };
  } catch (err: any) {
    console.error('[Firebase] Google sign-in failed:', err);
    let msg = 'تعذّر تسجيل الدخول عبر Google (Firebase).';
    if (err?.code === 'auth/popup-closed-by-user') {
      msg = 'تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.';
    } else if (err?.code === 'auth/cancelled-popup-request') {
      msg = 'تم إلغاء طلب تسجيل الدخول.';
    } else if (err?.code === 'auth/popup-blocked') {
      msg = 'قام المتصفح بحظر نافذة Google المنبثقة. يمكنك اختيار حساب Google المزامن مباشرة.';
    } else if (err?.code === 'auth/unauthorized-domain') {
      msg = 'النطاق الحالي غير مضاف في قائمة النطاقات المصرح بها في Firebase؛ تم تفعيل اختيار الحساب المزامن.';
    } else if (err?.message) {
      msg = err.message;
    }
    return { data: null, error: { message: msg, code: err?.code } };
  }
};

export const signOutFirebase = async (): Promise<void> => {
  if (firebaseAuth) {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (e) {
      console.warn('[Firebase] Sign out error:', e);
    }
  }
};

