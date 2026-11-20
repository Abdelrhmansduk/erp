import { describe, expect, it } from 'vitest';
import {
  cryptoRandomAlphanumeric,
  cryptoRandomFloat,
  cryptoRandomInt,
  decryptStoragePayload,
  encryptStoragePayload,
  sanitizeHtmlMarkup,
  sanitizeSafeHref,
  sanitizeSafeMediaSrc,
} from '../utils/securitySanitizers';
import {
  computeKasPbkdf2Digest,
  saveCustomEmployeePassword,
  verifyKasEmployeePassword,
} from '../config/kasEmployeePasswordHashes';

describe('Security Sanitizers & CodeQL Hardening Suite', () => {
  it('neutralizes XSS payloads in sanitizeHtmlMarkup while preserving SVG QR codes', () => {
    const malicious =
      '<div>مرحباً<script>window.__xss=1</script><img src="x" onerror="alert(1)" /><svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg></div>';
    const clean = sanitizeHtmlMarkup(malicious);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<svg');
    expect(clean).toContain('مرحباً');
  });

  it('validates safe URLs and blocks javascript:, vbscript:, and data:text/html schemes', () => {
    expect(sanitizeSafeHref('javascript:alert(1)')).toBe('#');
    expect(sanitizeSafeHref('vbscript:msgbox(1)')).toBe('#');
    expect(sanitizeSafeHref('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');
    expect(sanitizeSafeHref('//evil.example.com/payload')).toBe('#');
    expect(sanitizeSafeHref('https://kas-erp.com/docs')).toBe('https://kas-erp.com/docs');
    expect(sanitizeSafeHref('mailto:HR@kas.sa')).toBe('mailto:HR@kas.sa');
    expect(sanitizeSafeHref('tel:+966501234567')).toContain('tel:');
    expect(sanitizeSafeMediaSrc('/logos/group-logo.png')).toBe('/logos/group-logo.png');
    expect(sanitizeSafeMediaSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')).toMatch(
      /^data:image\/png;base64,/
    );
  });

  it('generates unbiased CSPRNG integers and floats within strict bounds', () => {
    for (let i = 0; i < 64; i += 1) {
      const n = cryptoRandomInt(1000, 10000);
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThan(10000);
      const f = cryptoRandomFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    expect(cryptoRandomAlphanumeric(12)).toHaveLength(12);
  });

  it('encrypts sensitive Web Storage payloads with ENC1 prefix and supports legacy JSON seamlessly', () => {
    const payload = JSON.stringify({ email: 'khalid@kas.sa', company_id: 'SAF', amount: '1500 ⃁' });
    const encrypted = encryptStoragePayload(payload);
    expect(encrypted.startsWith('ENC1:')).toBe(true);
    expect(encrypted).not.toContain('khalid@kas.sa');
    expect(decryptStoragePayload(encrypted)).toBe(payload);
    expect(decryptStoragePayload(payload)).toBe(payload);
    expect(decryptStoragePayload(null)).toBeNull();
  });

  it('matches WebCrypto PBKDF2-HMAC-SHA256 byte-for-byte over 100,000 rounds', async () => {
    const email = 'khalid@kas.sa';
    const pass = 'KsStrong#2026!Az';
    const browserPbkdf2 = computeKasPbkdf2Digest(email, pass);

    const enc = new TextEncoder();
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(pass),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivedBits = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(`KAS-PBKDF2-V1|${email}`),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const subtleHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(browserPbkdf2).toBe(`pbkdf2:${subtleHex}`);

    localStorage.clear();
    saveCustomEmployeePassword(email, pass);
    const storedRaw = localStorage.getItem('ALSULAIM_STAFF_PASSWORD_HASHES_V1');
    expect(storedRaw?.startsWith('ENC1:')).toBe(true);
    expect(verifyKasEmployeePassword(email, pass)).toBe(true);
    expect(verifyKasEmployeePassword(email, 'WrongPass#2026!')).toBe(false);
    localStorage.clear();
  });
});
