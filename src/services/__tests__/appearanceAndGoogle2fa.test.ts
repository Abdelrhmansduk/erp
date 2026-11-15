import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  APPEARANCE_STORAGE_KEY,
  getDefaultAppearanceSettings,
  loadAppearanceSettings,
  saveAppearanceSettings,
  resetAppearanceSettings,
  initAppearanceSettings,
} from '../appearanceSettingsService';
import {
  getLoginChallengeForUser,
  startTotpEnrollmentDraft,
  generateTotpCodeAtTime,
  confirmTotpEnrollment,
  checkGoogleOnlineReachability,
  enableGoogleOnline2FA,
  verifyLoginSecondFactor,
  regenerateBackupCodes,
  disableUserTwoFactor,
} from '../googleTwoFactorService';

describe('Appearance & Display Customization Service', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppearanceSettings();
  });

  afterEach(() => {
    localStorage.clear();
    resetAppearanceSettings();
  });

  it('returns default Mobbin Monochrome Light settings initially', () => {
    const def = getDefaultAppearanceSettings();
    expect(def.paletteId).toBe('mobbin-ink');
    expect(def.themeMode).toBe('light');
    expect(def.surfaceTone).toBe('pure-white');
    expect(def.iconColorMode).toBe('colored');
    expect(def.fontScale).toBe('md');
    expect(def.density).toBe('comfortable');
    expect(def.sidebarMode).toBe('default');
    expect(def.borderRadiusMode).toBe('modern');
    expect(def.highContrastBorders).toBe(false);

    const loaded = loadAppearanceSettings();
    expect(loaded.paletteId).toBe('mobbin-ink');
  });

  it('applies saudi-emerald preset and persists tokens cleanly to localStorage and DOM', () => {
    const updated = saveAppearanceSettings({ paletteId: 'saudi-emerald' });
    expect(updated.paletteId).toBe('saudi-emerald');

    const root = document.documentElement;
    expect(root.getAttribute('data-erp-palette')).toBe('saudi-emerald');
    expect(root.getAttribute('data-erp-custom-palette')).toBe('true');
    expect(root.style.getPropertyValue('--erp-brand-primary')).toBe('#047857');
    expect(root.style.getPropertyValue('--company-accent')).toBe('#047857');

    const persistedRaw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    expect(persistedRaw).toBeTruthy();
    expect(JSON.parse(persistedRaw!).paletteId).toBe('saudi-emerald');
  });

  it('supports custom primary hex color, dark mode, font scale, density, sidebar width, icon mode, contrast, and reset', () => {
    saveAppearanceSettings({
      paletteId: 'custom',
      customPrimaryHex: '#7c3aed',
      themeMode: 'dark',
      fontScale: 'lg',
      density: 'compact',
      sidebarMode: 'wide',
      iconColorMode: 'monochrome',
      highContrastBorders: true,
    });

    const root = document.documentElement;
    expect(root.getAttribute('data-erp-palette')).toBe('custom');
    expect(root.getAttribute('data-erp-custom-palette')).toBe('true');
    expect(root.style.getPropertyValue('--erp-brand-primary')).toBe('#7c3aed');
    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(root.style.getPropertyValue('--color-canvas')).toBe('#0f1115');
    expect(root.style.fontSize).toBe('17px');
    expect(root.getAttribute('data-erp-density')).toBe('compact');
    expect(root.style.getPropertyValue('--sidebar-width')).toBe('316px');
    expect(root.getAttribute('data-erp-icon-mode')).toBe('monochrome');
    expect(root.getAttribute('data-erp-contrast')).toBe('high');

    initAppearanceSettings();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const reset = resetAppearanceSettings();
    expect(reset.paletteId).toBe('mobbin-ink');
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(root.getAttribute('data-erp-icon-mode')).toBe('colored');
    expect(root.style.fontSize).toBe('16px');
    expect(root.style.getPropertyValue('--sidebar-width')).toBe('280px');
  });
});

describe('Online Google 2FA & Google Authenticator Service', () => {
  const TEST_KAS_EMAIL = 'khalid@kas.sa';
  const originalFetch = globalThis.fetch;
  const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    'onLine'
  );

  const mockNavigatorOnline = (online: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
  };

  beforeEach(() => {
    localStorage.clear();
    disableUserTwoFactor(TEST_KAS_EMAIL, 'all');
    mockNavigatorOnline(true);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ issuer: 'https://accounts.google.com' }),
    } as unknown as Response);
  });

  afterEach(() => {
    localStorage.clear();
    globalThis.fetch = originalFetch;
    if (originalOnLineDescriptor) {
      Object.defineProperty(window.navigator, 'onLine', originalOnLineDescriptor);
    } else {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
    }
    vi.restoreAllMocks();
  });

  it('does not block non-enrolled accounts during login', () => {
    const challenge = getLoginChallengeForUser(TEST_KAS_EMAIL);
    expect(challenge.required).toBe(false);
    expect(challenge.googleOnlineEnabled).toBe(false);
    expect(challenge.totpEnabled).toBe(false);
  });

  it('enrolls and verifies RFC-6238 Google Authenticator TOTP + 8 backup codes', async () => {
    const draft = startTotpEnrollmentDraft(TEST_KAS_EMAIL);
    expect(draft.secret.length).toBeGreaterThanOrEqual(16);
    expect(draft.otpAuthUri).toContain('otpauth://totp/');
    expect(draft.qrSvg).toContain('<svg');

    const badConfirm = await confirmTotpEnrollment(TEST_KAS_EMAIL, draft.secret, '000000');
    expect(badConfirm.success).toBe(false);

    const validCode = await generateTotpCodeAtTime(draft.secret);
    expect(validCode).toMatch(/^\d{6}$/);

    const goodConfirm = await confirmTotpEnrollment(TEST_KAS_EMAIL, draft.secret, validCode);
    expect(goodConfirm.success).toBe(true);
    expect(goodConfirm.record?.totpEnabled).toBe(true);
    expect(goodConfirm.record?.backupCodes).toHaveLength(8);

    const challenge = getLoginChallengeForUser(TEST_KAS_EMAIL);
    expect(challenge.required).toBe(true);
    expect(challenge.totpEnabled).toBe(true);
    expect(challenge.backupCodesRemaining).toBe(8);

    const badFactor = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'totp',
      code: '123456',
    });
    if (validCode !== '123456') {
      expect(badFactor.success).toBe(false);
    }

    const goodFactor = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'totp',
      code: validCode,
    });
    expect(goodFactor.success).toBe(true);
  });

  it('verifies Online Google 2FA reachability, blocks when offline, and allows TOTP fallback offline', async () => {
    const reach = await checkGoogleOnlineReachability();
    expect(reach.online).toBe(true);
    expect(reach.googleCloudReachable).toBe(true);

    // Also enroll TOTP alongside Online Google 2FA
    const draft = startTotpEnrollmentDraft(TEST_KAS_EMAIL);
    const code = await generateTotpCodeAtTime(draft.secret);
    await confirmTotpEnrollment(TEST_KAS_EMAIL, draft.secret, code);

    const onlineEnable = await enableGoogleOnline2FA(
      TEST_KAS_EMAIL,
      'khalid.sulaim@gmail.com',
      'Khalid Al-Sulaim'
    );
    expect(onlineEnable.success).toBe(true);
    expect(onlineEnable.record?.googleOnlineEnabled).toBe(true);
    expect(onlineEnable.record?.googleEmail).toBe('khalid.sulaim@gmail.com');

    // Matching Google account passes when online
    const onlineMatch = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'google_online',
      googleEmailConfirmation: 'khalid.sulaim@gmail.com',
    });
    expect(onlineMatch.success).toBe(true);

    // Mismatched Google account fails
    const onlineMismatch = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'google_online',
      googleEmailConfirmation: 'other.user@gmail.com',
    });
    expect(onlineMismatch.success).toBe(false);

    // Offline rejects online Google 2FA cleanly while TOTP still works
    mockNavigatorOnline(false);
    const offlineOnlineAttempt = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'google_online',
      googleEmailConfirmation: 'khalid.sulaim@gmail.com',
    });
    expect(offlineOnlineAttempt.success).toBe(false);
    expect(offlineOnlineAttempt.error).toContain('غير متصل بالإنترنت');

    const offlineTotpAttempt = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'totp',
      code,
    });
    expect(offlineTotpAttempt.success).toBe(true);
  });

  it('enforces single-use recovery backup codes, supports regeneration, and cleans up on disable', async () => {
    const draft = startTotpEnrollmentDraft(TEST_KAS_EMAIL);
    const code = await generateTotpCodeAtTime(draft.secret);
    const enrolled = await confirmTotpEnrollment(TEST_KAS_EMAIL, draft.secret, code);
    const firstBackupCode = enrolled.record!.backupCodes[0].code;

    const firstUse = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'backup_code',
      code: firstBackupCode,
    });
    expect(firstUse.success).toBe(true);
    expect(getLoginChallengeForUser(TEST_KAS_EMAIL).backupCodesRemaining).toBe(7);

    const secondUse = await verifyLoginSecondFactor(TEST_KAS_EMAIL, {
      method: 'backup_code',
      code: firstBackupCode,
    });
    expect(secondUse.success).toBe(false);

    const freshCodes = regenerateBackupCodes(TEST_KAS_EMAIL);
    expect(freshCodes).toHaveLength(8);
    expect(getLoginChallengeForUser(TEST_KAS_EMAIL).backupCodesRemaining).toBe(8);

    disableUserTwoFactor(TEST_KAS_EMAIL, 'all');
    expect(getLoginChallengeForUser(TEST_KAS_EMAIL).required).toBe(false);
  });
});
