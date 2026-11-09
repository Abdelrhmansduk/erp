import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from './authService';
import { DEMO_AUTH_ENABLED } from '../config/authMode';

describe('authService — session hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('never creates a session automatically (no default chairman profile)', () => {
    expect(authService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('ALSULAIM_AUTH_USER')).toBeNull();
  });

  it('denies tab access when there is no profile', () => {
    expect(authService.isTabAuthorizedForUser(null, 'finance-home')).toBe(false);
    expect(authService.isTabAuthorizedForUser(null, 'dashboard')).toBe(true);
  });

  it('rejects empty credentials', async () => {
    const res = await authService.signIn('', '');
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
  });

  it('demo mode is enabled in the test/dev environment only', () => {
    // vitest runs with import.meta.env.DEV = true and no VITE_DEMO_AUTH override
    expect(DEMO_AUTH_ENABLED).toBe(true);
  });
});
