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
  Auth,
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

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err);
  }
}

export const getFirebaseAuth = (): Auth | null => firebaseAuth;
export const getFirebaseApp = (): FirebaseApp | null => firebaseApp;

export interface FirebaseGoogleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
}

/**
 * Sign in using Google OAuth via Firebase Popup.
 * Provides a seamless browser experience with zero backend redirect complications.
 */
export const signInWithGoogleFirebase = async (): Promise<{
  data: FirebaseGoogleUser | null;
  error: { message: string } | null;
}> => {
  if (!isFirebaseConfigured || !firebaseAuth || !googleProvider) {
    return {
      data: null,
      error: {
        message:
          'خدمة Firebase غير مُهيأة بعد. يرجى ضبط VITE_FIREBASE_API_KEY و VITE_FIREBASE_PROJECT_ID في ملف .env.',
      },
    };
  }

  try {
    const result: UserCredential = await signInWithPopup(firebaseAuth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();

    return {
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        idToken,
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[Firebase] Google sign-in failed:', err);
    let msg = 'تعذّر تسجيل الدخول عبر Google (Firebase).';
    if (err?.code === 'auth/popup-closed-by-user') {
      msg = 'تم إغلاق نافذة تسجيل الدخول من قبل المستخدم.';
    } else if (err?.code === 'auth/cancelled-popup-request') {
      msg = 'تم إلغاء طلب تسجيل الدخول.';
    } else if (err?.message) {
      msg = err.message;
    }
    return { data: null, error: { message: msg } };
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

