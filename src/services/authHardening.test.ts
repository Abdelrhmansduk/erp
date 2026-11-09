import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from './authService';
import { DEMO_AUTH_ENABLED } from '../config/authMode';

describe('authService — session hardening & hybrid email auth characterization', () => {
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
    expect(DEMO_AUTH_ENABLED).toBe(true);
  });

  it('characterize: signIn given executive identifier, returns executive profile and locks company session', async () => {
    // Captures Hybrid Email Auth behavior for pre-registered executive account
    const res = await authService.signIn('chairman@alsulaim.sa', 'ValidPass2026!');
    expect(res.error).toBeNull();
    expect(res.data?.department_id).toBe('executive');
    expect(res.data?.company_id).toBe('all');
  });

  it('characterize: signIn given subsidiary finance email (@saf-rec.sa), routes to finance department and authorizes finance tabs', async () => {
    const res = await authService.signIn('finance.accountant@saf-rec.sa', 'SecurePass99');
    expect(res.error).toBeNull();
    expect(res.data?.company_id).toBe('SAF');
    expect(res.data?.department_id).toBe('finance');
    expect(authService.isTabAuthorizedForUser(res.data, 'finance-home')).toBe(true);
    expect(authService.isTabAuthorizedForUser(res.data, 'shelter-suite')).toBe(false);
  });

  it('characterize: signInWithEmail rejects empty email and accepts valid corporate email with custom full name', async () => {
    const emptyRes = await authService.signInWithEmail('   ');
    expect(emptyRes.data).toBeNull();
    expect(emptyRes.error).not.toBeNull();

    const validRes = await authService.signInWithEmail('hr.lead@yaqoot-ops.sa', 'مدير الموارد البشرية', 'YAQ');
    expect(validRes.error).toBeNull();
    expect(validRes.data?.email).toBe('hr.lead@yaqoot-ops.sa');
    expect(validRes.data?.full_name).toBe('مدير الموارد البشرية');
  });

  it('characterize: validateCompanyAccess enforces strict multi-company tenant isolation for subsidiary staff', async () => {
    const safStaff = await authService.signIn('saf.specialist@saf-rec.sa', 'SecurePass99', 'SAF');
    expect(safStaff.data).not.toBeNull();

    const sameComp = authService.validateCompanyAccess(safStaff.data, 'SAF');
    expect(sameComp.allowed).toBe(true);

    const crossComp = authService.validateCompanyAccess(safStaff.data, 'YAQ');
    expect(crossComp.allowed).toBe(false);
    expect(crossComp.reason).toContain('رفض أمني');
  });
});
