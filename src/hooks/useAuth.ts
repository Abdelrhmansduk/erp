import { useState, useEffect, useCallback } from 'react';
import { authService, UserProfile, MfaRequirement, TotpEnrollment } from '../services/authService';

export interface AuthContext {
  user: UserProfile | null;
  session: any;
  loading: boolean;
  error: string | null;
  mfaRequirement: MfaRequirement;
  isAuthenticated: boolean;
  signIn: (
    identifier: string,
    password: string,
    targetCompanyId?: string
  ) => Promise<{ success: boolean; error?: string; mfa?: MfaRequirement; user?: UserProfile }>;
  signInWithGoogle: (googleAccount?: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
  }) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  signInWithEmail: (
    email: string,
    fullName?: string,
    targetCompanyId?: string,
    password?: string
  ) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  verifyMfa: (code: string, factorId?: string) => Promise<{ success: boolean; error?: string }>;
  enrollMfa: () => Promise<{ data: TotpEnrollment | null; error: string | null }>;
  refreshMfa: () => Promise<MfaRequirement>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isFinance: boolean;
  isHR: boolean;
  isOperations: boolean;
  isCustomerService: boolean;
}

export const useAuth = (): AuthContext => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [session, setSession] = useState<any>(() => {
    const cached = authService.getCurrentUser();
    return cached ? { user: { id: cached.id, email: cached.email, profile: cached } } : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequirement, setMfaRequirement] = useState<MfaRequirement>('none');

  const refreshMfa = useCallback(async () => {
    const req = await authService.getMfaRequirement();
    setMfaRequirement(req);
    return req;
  }, []);

  useEffect(() => {
    let active = true;

    authService.getSession().then(async ({ session: initial, error: sessionError }) => {
      if (!active) return;
      if (sessionError) console.warn('Auth session error:', sessionError);
      setSession(initial);
      setUser(initial?.user?.profile || null);
      if (initial) await refreshMfa();
      if (active) setLoading(false);
    });

    const { data: { subscription } } = authService.onAuthStateChange(async (event, next) => {
      if (!active) return;
      setSession(next);
      setUser(next?.user?.profile || null);
      if (next) {
        await refreshMfa();
      } else {
        setMfaRequirement('none');
      }
      if (active && event !== 'INITIAL_SESSION') setLoading(false);
    });

    const handleDirectAuthUpdate = (e: any) => {
      if (!active) return;
      const profile = e.detail?.profile as UserProfile | null;
      if (profile) {
        setUser(profile);
        setSession({ user: { id: profile.id, email: profile.email, profile } });
        setMfaRequirement('none');
      } else {
        setUser(null);
        setSession(null);
        setMfaRequirement('none');
      }
    };
    window.addEventListener('alsulaim-auth-updated', handleDirectAuthUpdate);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('alsulaim-auth-updated', handleDirectAuthUpdate);
    };
  }, [refreshMfa]);

  const signIn = useCallback(async (identifier: string, password: string, targetCompanyId?: string) => {
    setError(null);
    const { data, error: signInError, mfa } = await authService.signIn(identifier, password, targetCompanyId);
    if (signInError || !data) {
      const errMsg = signInError?.message || 'فشل تسجيل الدخول';
      setError(errMsg);
      return { success: false, error: errMsg };
    }
    setUser(data);
    setSession({ user: { id: data.id, email: data.email, profile: data } });
    setMfaRequirement(mfa);
    return { success: true, mfa, user: data };
  }, []);

  const verifyMfa = useCallback(async (code: string, factorId?: string) => {
    setError(null);
    const result = await authService.verifyTotp(code, factorId);
    if (!result.success) {
      setError(result.error);
      return { success: false, error: result.error || undefined };
    }
    await refreshMfa();
    return { success: true };
  }, [refreshMfa]);

  const enrollMfa = useCallback(() => authService.enrollTotp(), []);

  const signInWithGoogle = useCallback(
    async (googleAccount?: { email?: string; full_name?: string; avatar_url?: string }) => {
      setError(null);
      const { data, error: googleError } = await authService.signInWithGoogle(googleAccount);
      if (googleError) {
        setError(googleError.message);
        return { success: false, error: googleError.message };
      }
      if (data) {
        setUser(data);
        setSession({ user: { id: data.id, email: data.email, profile: data } });
        setMfaRequirement('none');
      }
      return { success: true, user: data || undefined };
    },
    []
  );

  const signInWithEmail = useCallback(
    async (emailInput: string, fullName?: string, targetCompanyId?: string, password?: string) => {
      setError(null);
      const { data, error: emailError } = await authService.signInWithEmail(
        emailInput,
        fullName,
        targetCompanyId,
        password
      );
      if (emailError || !data) {
        const errMsg = emailError?.message || 'تعذر تسجيل الدخول عبر البريد الإلكتروني';
        setError(errMsg);
        return { success: false, error: errMsg };
      }
      setUser(data);
      setSession({ user: { id: data.id, email: data.email, profile: data } });
      setMfaRequirement('none');
      return { success: true, user: data };
    },
    []
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setMfaRequirement('none');
  }, []);

  return {
    user,
    session,
    loading,
    error,
    mfaRequirement,
    isAuthenticated: Boolean(session?.user || user) && mfaRequirement === 'none',
    signIn,
    signInWithGoogle,
    signInWithEmail,
    verifyMfa,
    enrollMfa,
    refreshMfa,
    signOut,
    isAdmin: authService.isAdmin(user),
    isFinance: authService.isFinance(user),
    isHR: authService.isHR(user),
    isOperations: authService.isOperations(user),
    isCustomerService: authService.isCustomerService(user),
  };
};

export default useAuth;