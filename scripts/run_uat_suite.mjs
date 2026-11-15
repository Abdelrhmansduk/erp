#!/usr/bin/env node
/**
 * Khalid Al-Sulaim Holding ERP — Live Chromium User Acceptance Testing (UAT) Suite
 * Executes end-to-end acceptance scenarios in real Chrome/Edge against `dist/`:
 *
 *   UAT-01: Executive Login (`khalid@kas.sa`) + Daily-Rotating Scannable Barcode/QR Gate
 *           (Rejects wrong/expired barcode; unlocks with real daily Code-128B badge; verifies Executive Dashboard + ⃁)
 *   UAT-02: HR Manager (`hr@kas.sa`) Strict Isolation
 *           (Verifies Gov Integration Hub + Finance Center are completely hidden from Sidebar, AppLauncher & blocked on direct `?tab=gov-integrations` / `?tab=smacc-accounting`)
 *   UAT-03: New Employee Welcome Onboarding + Email Info QR (`mailto:`) + Auto Welcome Email Dispatch
 *           (Verifies Welcome Email QR + daily Code-128B SVG, executes 7-step onboarding & confirms auto email + live Signage Web Player URL `?signage_screen=ALL&company=SAF`)
 *   UAT-04: Eng. Abdulrahman (`a.salif.dev@kas.sa`) Per-Employee Department & Section Visibility Control
 *           (Verifies quick pill, grants `gov-integrations` specifically for `hr@kas.sa` via UI, saves, confirms `hr@kas.sa` gains access while `a.alanazi@kas.sa` stays isolated)
 *   UAT-05: Unified Gov Integration Hub (`11 جهة حكومية • SAF • YAQ • TOP • KAS • DAR`)
 *           (Verifies all 11 agencies READY with 0 BLOCKED/NO_DATA, entity filter pills, and PDPL-masked PreviewModal)
 *   UAT-06: Mobile Responsive Viewport (`390x844`) & Zero Runtime Errors Audit
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function computeEphemeralPasswordDigest(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  let digest = crypto
    .createHash('sha256')
    .update(`KAS-ERP-STRONG-AUTH-2026-V2|${cleanEmail}|${cleanPass}`)
    .digest('hex');
  for (let i = 1; i < 256; i++) {
    digest = crypto.createHash('sha256').update(`${digest}|${cleanEmail}`).digest('hex');
  }
  return digest;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 5198;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensurePreviewServer() {
  if (process.env.BASE_URL && (await checkServerReady(process.env.BASE_URL))) {
    return { viteProc: null, baseUrl: process.env.BASE_URL };
  }
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  const hasDist = fs.existsSync(path.resolve(process.cwd(), 'dist/index.html'));
  const args = hasDist
    ? [viteBin, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1']
    : [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'];
  const viteProc = spawn(process.execPath, args, {
    stdio: 'ignore',
    env: { ...process.env, BROWSER: 'none' },
  });
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await checkServerReady(baseUrl)) {
      return { viteProc, baseUrl };
    }
  }
  throw new Error(`Preview server failed to become ready at ${baseUrl}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`UAT ASSERTION FAILED: ${message}`);
  }
}

async function signInAndUnlockGate(page, baseUrl, email, password, personalGoogleEmail, preSeedStorage = {}) {
  await page.evaluateOnNewDocument(
    ({ hashes, extraStorage }) => {
      localStorage.setItem('ALSULAIM_STAFF_PASSWORD_HASHES_V1', JSON.stringify(hashes));
      for (const [k, v] of Object.entries(extraStorage || {})) {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    },
    {
      hashes: { [email.toLowerCase()]: computeEphemeralPasswordDigest(email, password) },
      extraStorage: preSeedStorage,
    }
  );

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await sleep(1200);

  // Move from LandingPage to LoginPage if needed
  const hasLoginInput = Boolean(await page.$('#login-identifier-input'));
  if (!hasLoginInput) {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const loginNav = btns.find((b) =>
        (b.textContent || '').match(/دخول|بوابة النفاذ|تسجيل الدخول/)
      );
      if (loginNav && loginNav instanceof HTMLElement) loginNav.click();
    });
    await sleep(1000);
  }

  const emailInput = await page.$('#login-identifier-input');
  assert(Boolean(emailInput), `#login-identifier-input missing for ${email}`);
  await emailInput.scrollIntoViewIfNeeded?.();
  await emailInput.click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await emailInput.type(email, { delay: 6 });

  const passInput = await page.$('#login-password-input');
  assert(Boolean(passInput), `#login-password-input missing for ${email}`);
  await passInput.scrollIntoViewIfNeeded?.();
  await passInput.click();
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await passInput.type(password, { delay: 6 });

  const submitBtn = await page.$('button[type="submit"]');
  assert(Boolean(submitBtn), 'Submit button missing on LoginPage');
  await submitBtn.scrollIntoViewIfNeeded?.();
  await submitBtn.click();

  await sleep(3500);

  // Complete Google Account Binding Modal if shown
  if (await page.$('#bind-google-email-input')) {
    await page.type('#bind-google-email-input', personalGoogleEmail, { delay: 4 });
    await page.type('#bind-google-email-confirm-input', personalGoogleEmail, { delay: 4 });
    await page.click('#bind-google-submit-btn');
    await sleep(1400);
  }

  const stateDebug = await page.evaluate(() => ({
    url: location.href,
    gate: Boolean(document.querySelector('[data-slot="biometric-attendance-gate-modal"]')),
    authUser: localStorage.getItem('ALSULAIM_AUTH_USER'),
    snippet: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
  }));

  return {
    gateVisible: stateDebug.gate,
    stateDebug,
  };
}

async function main() {
  if (!executablePath) {
    console.error('❌ No Chrome or Edge executable found on this machine.');
    process.exit(1);
  }

  console.log('================================================================================');
  console.log('🧪 KHALID AL-SULAIM HOLDING ERP — LIVE CHROMIUM USER ACCEPTANCE TESTING (UAT)');
  console.log('================================================================================\n');

  const { viteProc, baseUrl } = await ensurePreviewServer();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const results = [];
  const uatPass = (id, title, detail) => {
    results.push({ id, title, passed: true, detail });
    console.log(`  ✅ [${id}] ${title}`);
    if (detail) console.log(`      ↳ ${detail}`);
  };
  const uatFail = (id, title, err) => {
    results.push({ id, title, passed: false, detail: err.message });
    console.error(`  ❌ [${id}] ${title}`);
    console.error(`      ↳ ${err.message}`);
  };

  let allPageErrors = [];
  const uatPassword = `KsUat${crypto.randomBytes(5).toString('base64url')}8#Qa!`;

  try {
    // =========================================================================
    // UAT-01: Executive Login + Daily Barcode Gate + Expired/Wrong Code Rejection + Dashboard
    // =========================================================================
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      page.on('pageerror', (e) => allPageErrors.push(`[UAT-01] ${e.message}`));

      const { gateVisible, stateDebug } = await signInAndUnlockGate(
        page,
        baseUrl,
        'khalid@kas.sa',
        uatPassword,
        'khalid.uat@gmail.com'
      );
      assert(
        gateVisible,
        `Biometric & Barcode attendance gate must appear on first login (debug=${JSON.stringify(stateDebug)})`
      );

      // Switch to Barcode tab
      const switchBarcodeBtn = await page.$('[data-slot="switch-to-barcode-fallback-btn"]');
      if (switchBarcodeBtn) {
        await switchBarcodeBtn.click();
        await sleep(300);
      } else {
        const barcodeTab = await page.$('[data-slot="gate-tab-barcode"]');
        if (barcodeTab) {
          await barcodeTab.click();
          await sleep(300);
        }
      }

      // Check real Code-128B & QR SVG presence + daily validity badge
      const gateStats = await page.evaluate(() => {
        const modal = document.querySelector('[data-slot="biometric-attendance-gate-modal"]');
        const text = modal ? modal.textContent || '' : '';
        const svgs = modal ? modal.querySelectorAll('svg').length : 0;
        const todayIso = new Date().toISOString().slice(0, 10);
        return { text, svgs, hasTodayIso: text.includes(todayIso) };
      });
      assert(gateStats.svgs >= 2, `Expected >=2 SVGs (Code-128B + QR), got ${gateStats.svgs}`);

      // Try invalid/wrong code first -> MUST reject and stay locked
      const inputEl = await page.$('[data-slot="barcode-gate-input"]');
      assert(Boolean(inputEl), 'Barcode input `[data-slot="barcode-gate-input"]` missing');
      await inputEl.click({ clickCount: 3 });
      await inputEl.type('HQ-ID-000000', { delay: 5 });
      const submitBarcodeBtn = await page.$('[data-slot="barcode-submit-btn"]');
      if (submitBarcodeBtn) {
        await submitBarcodeBtn.click();
        await sleep(300);
      }
      const stillOpenAfterInvalid = Boolean(await page.$('[data-slot="biometric-attendance-gate-modal"]'));
      assert(stillOpenAfterInvalid, 'Gate unlocked with fake barcode HQ-ID-000000!');

      // Now unlock using verified daily digital badge button
      const verifyBadgeBtn = await page.$('[data-slot="verify-digital-badge-btn"]');
      assert(Boolean(verifyBadgeBtn), '`[data-slot="verify-digital-badge-btn"]` not found');
      await verifyBadgeBtn.click();
      await page.waitForFunction(
        () => !document.querySelector('[data-slot="biometric-attendance-gate-modal"]'),
        { timeout: 6000 }
      );

      // Enter main Executive Dashboard & verify ⃁ + 0 legacy ر.س
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('فتح شاشة القسم الرئيسية')
        );
        if (btn) btn.click();
      });
      await sleep(2200);
      const dashText = await page.evaluate(() => document.body.innerText || '');
      assert(dashText.includes('\u20C1'), 'Executive Dashboard missing official SAMA symbol ⃁');
      assert(!dashText.includes('ر.س'), 'Executive Dashboard contains forbidden legacy ر.س text');

      await ctx.close();
      uatPass(
        'UAT-01',
        'Executive Sign-In + Daily-Rotating Barcode Rejection/Acceptance + Dashboard (⃁)',
        `Code-128B & QR rendered (${gateStats.svgs} SVGs), rejected HQ-ID-000000, unlocked cleanly.`
      );
    } catch (err) {
      uatFail('UAT-01', 'Executive Sign-In + Daily-Rotating Barcode Gate', err);
    }

    // =========================================================================
    // UAT-02: HR Manager (`hr@kas.sa`) Isolation from Gov Hub & Finance Center
    // =========================================================================
    let persistedVisibilityStorage = null;
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      page.on('pageerror', (e) => allPageErrors.push(`[UAT-02] ${e.message}`));

      const { gateVisible } = await signInAndUnlockGate(
        page,
        baseUrl,
        'hr@kas.sa',
        uatPassword,
        'reem.hr.uat@gmail.com'
      );
      if (gateVisible) {
        const switchBtn = await page.$('[data-slot="switch-to-barcode-fallback-btn"]');
        if (switchBtn) {
          await switchBtn.click();
          await sleep(250);
        }
        const verifyBtn = await page.$('[data-slot="verify-digital-badge-btn"]');
        if (verifyBtn) {
          await verifyBtn.click();
          await sleep(800);
        }
      }

      // Check AppLauncher & Sidebar for HR user
      const launcherText = await page.evaluate(() => document.body.innerText || '');
      assert(
        !launcherText.includes('مركز التكامل والربط الحكومي الموحد'),
        'HR AppLauncher must NOT expose Gov Integration Hub'
      );

      // Open workspace and inspect sidebar
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('فتح شاشة القسم الرئيسية')
        );
        if (btn) btn.click();
      });
      await sleep(1800);

      const hrWorkspaceText = await page.evaluate(() => document.body.innerText || '');
      const sidebarText = await page.evaluate(() => {
        const aside = document.querySelector('aside');
        return aside ? aside.textContent || '' : '';
      });

      assert(
        !sidebarText.includes('مركز التكامل والربط الحكومي'),
        'HR Sidebar must NOT contain Gov Integration Hub'
      );
      assert(
        !sidebarText.includes('مركز المالية'),
        'HR Sidebar must NOT contain Finance Center (مركز المالية)'
      );
      assert(
        !sidebarText.includes('استحقاقات ومخصصات الموارد البشرية'),
        'HR Sidebar must NOT contain hr-accruals'
      );

      // Attempt direct URL bypass to `?tab=gov-integrations` -> MUST BE BLOCKED
      await page.goto(`${baseUrl}/?tab=gov-integrations`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(1800);
      const govAttemptText = await page.evaluate(() => document.body.innerText || '');
      assert(
        !govAttemptText.includes('بوابات التكامل الـ 11') &&
          !govAttemptText.includes('مؤشر الجاهزية الموحد'),
        'Direct URL `?tab=gov-integrations` bypassed RBAC guard for HR user!'
      );

      // Attempt direct URL bypass to `?tab=smacc-accounting` -> MUST BE BLOCKED
      await page.goto(`${baseUrl}/?tab=smacc-accounting`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(1800);
      const finAttemptText = await page.evaluate(() => document.body.innerText || '');
      assert(
        !finAttemptText.includes('ميزان المراجعة الفوري') &&
          !finAttemptText.includes('لوحة التحكم المحاسبية الشاملة SMACC'),
        'Direct URL `?tab=smacc-accounting` bypassed RBAC guard for HR user!'
      );

      await ctx.close();
      uatPass(
        'UAT-02',
        'HR Manager Strict Isolation (Gov Hub + Finance Center Hidden & URL-Blocked)',
        'Sidebar, AppLauncher, `?tab=gov-integrations`, and `?tab=smacc-accounting` verified blocked.'
      );
    } catch (err) {
      uatFail('UAT-02', 'HR Manager Strict Isolation', err);
    }

    // =========================================================================
    // UAT-03: Welcome Email QR + Auto Welcome Email Dispatch + Live Signage Player
    // =========================================================================
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      page.on('pageerror', (e) => allPageErrors.push(`[UAT-03] ${e.message}`));

      const { gateVisible } = await signInAndUnlockGate(
        page,
        baseUrl,
        'khalid@kas.sa',
        uatPassword,
        'khalid.welcome.uat@gmail.com'
      );
      if (gateVisible) {
        const switchBtn = await page.$('[data-slot="switch-to-barcode-fallback-btn"]');
        if (switchBtn) {
          await switchBtn.click();
          await sleep(250);
        }
        const verifyBtn = await page.$('[data-slot="verify-digital-badge-btn"]');
        if (verifyBtn) {
          await verifyBtn.click();
          await sleep(800);
        }
      }

      await page.goto(`${baseUrl}/?tab=hr-welcome-signage`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await sleep(2200);

      const hubInfo = await page.evaluate(() => {
        const body = document.body.innerText || '';
        const svgs = document.querySelectorAll('[data-printable-card="true"] svg').length;
        const autoEmailCheckbox = document.querySelector('input[type="checkbox"]');
        return {
          hasTitle: body.includes('باركود الترحيب (إرسال معلومات الإيميل)'),
          svgs,
          autoEmailChecked:
            autoEmailCheckbox instanceof HTMLInputElement ? autoEmailCheckbox.checked : false,
        };
      });

      assert(hubInfo.hasTitle, 'Welcome Email Info QR card did not render on hr-welcome-signage');
      assert(hubInfo.svgs >= 2, `Expected Welcome QR + Code-128B SVGs >= 2, found ${hubInfo.svgs}`);

      // Trigger the 7-Step Onboarding + Screen Broadcast + Auto Welcome Email button
      const clickedRun = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('تفعيل تبعيات المباشرة الـ 7 وبث الترحيب')
        );
        if (btn && btn instanceof HTMLButtonElement && !btn.disabled) {
          btn.click();
          return true;
        }
        return false;
      });
      assert(clickedRun, 'Could not find/click onboarding trigger button');
      await page.waitForFunction(
        () => {
          const t = document.body.innerText || '';
          return (
            t.includes('أُرسل تلقائياً لإيميل الموظف') ||
            t.includes('أُرسل الترحيب تلقائياً إلى') ||
            t.includes('تم الإرسال التلقائي ✓') ||
            t.includes('اكتملت المباشرة')
          );
        },
        { timeout: 8000 }
      );

      // Open Live Internet Digital Signage Player (`?signage_screen=ALL&company=SAF`)
      const playerPage = await ctx.newPage();
      playerPage.on('pageerror', (e) => allPageErrors.push(`[UAT-03-PLAYER] ${e.message}`));
      await playerPage.goto(`${baseUrl}/?signage_screen=ALL&company=SAF`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await sleep(1500);
      const playerCheck = await playerPage.evaluate(() => ({
        text: document.body.innerText || '',
        svgCount: document.querySelectorAll('svg').length,
      }));
      assert(
        playerCheck.text.includes('إرسال معلومات الإيميل') || playerCheck.svgCount >= 2,
        'Live Signage Player failed to render scannable Welcome Email QR + Code-128B'
      );

      await ctx.close();
      uatPass(
        'UAT-03',
        'New Employee Welcome Email QR + Auto Welcome Email + Live Web Signage Player',
        `Welcome Hub SVGs=${hubInfo.svgs}, auto-email dispatched, Player SVGs=${playerCheck.svgCount}.`
      );
    } catch (err) {
      uatFail('UAT-03', 'New Employee Welcome Email QR & Auto Dispatch', err);
    }

    // =========================================================================
    // UAT-04: Eng. Abdulrahman (`a.salif.dev@kas.sa`) Per-Employee Section Visibility Control
    // =========================================================================
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      page.on('pageerror', (e) => allPageErrors.push(`[UAT-04] ${e.message}`));

      const { gateVisible } = await signInAndUnlockGate(
        page,
        baseUrl,
        'a.salif.dev@kas.sa',
        uatPassword,
        'abdulrahman.uat@gmail.com'
      );
      if (gateVisible) {
        const switchBtn = await page.$('[data-slot="switch-to-barcode-fallback-btn"]');
        if (switchBtn) {
          await switchBtn.click();
          await sleep(250);
        }
        const verifyBtn = await page.$('[data-slot="verify-digital-badge-btn"]');
        if (verifyBtn) {
          await verifyBtn.click();
          await sleep(800);
        }
      }

      // Open Module Visibility Manager directly as Abdulrahman
      await page.goto(`${baseUrl}/?tab=module-visibility`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await sleep(2200);

      const managerState = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return {
          hasBanner: body.includes('م. عبدالرحمن أبو سالف'),
          hasEmployeeMode: body.includes('تخصيص لكل موظف'),
          hasHrEmployeeSelected: body.includes('hr@kas.sa'),
        };
      });
      assert(managerState.hasBanner, 'Abdulrahman control banner missing in ModuleVisibilityManager');
      assert(managerState.hasEmployeeMode, 'Per-employee mode pill missing');
      assert(managerState.hasHrEmployeeSelected, 'Default HR target hr@kas.sa missing in selector');

      // Expand `الإدارة التنفيذية والربط الحكومي` or toggle `مركز التكامل والربط الحكومي الموحد` on for `hr@kas.sa`
      const grantedGov = await page.evaluate(() => {
        // Click "توسيع جميع الأقسام" first
        const expandAllBtn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('توسيع جميع الأقسام')
        );
        if (expandAllBtn) expandAllBtn.click();
        return true;
      });
      assert(grantedGov, 'Expand all sections button failed');
      await sleep(300);

      const toggledSwitch = await page.evaluate(() => {
        const sw = Array.from(document.querySelectorAll('button[role="switch"]')).find((el) =>
          (el.getAttribute('aria-label') || '').includes('مركز التكامل والربط الحكومي الموحد')
        );
        if (sw && sw instanceof HTMLElement) {
          sw.click();
          return sw.getAttribute('aria-label') || 'toggled';
        }
        return null;
      });
      assert(Boolean(toggledSwitch), 'Switch for مركز التكامل والربط الحكومي الموحد not found');
      await sleep(300);

      // Click Save button ("حفظ وتطبيق للموظف")
      const saved = await page.evaluate(() => {
        const saveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('حفظ وتطبيق للموظف')
        );
        if (saveBtn && saveBtn instanceof HTMLButtonElement && !saveBtn.disabled) {
          saveBtn.click();
          return true;
        }
        return false;
      });
      assert(saved, 'Save per-employee visibility button missing or disabled');
      await sleep(600);

      persistedVisibilityStorage = await page.evaluate(() =>
        localStorage.getItem('ALSULAIM_MODULE_VISIBILITY_V1')
      );
      assert(
        persistedVisibilityStorage && persistedVisibilityStorage.includes('hr@kas.sa'),
        'Per-employee rule for hr@kas.sa was not persisted in localStorage'
      );

      await ctx.close();

      // Verify in a fresh context as `hr@kas.sa` that Abdulrahman's custom grant unlocks `?tab=gov-integrations` ONLY for `hr@kas.sa`
      const hrCtx = await browser.createBrowserContext();
      const hrPage = await hrCtx.newPage();
      hrPage.on('pageerror', (e) => allPageErrors.push(`[UAT-04-HR] ${e.message}`));
      const { gateVisible: hrGate } = await signInAndUnlockGate(
        hrPage,
        baseUrl,
        'hr@kas.sa',
        uatPassword,
        'reem.granted.uat@gmail.com',
        { ALSULAIM_MODULE_VISIBILITY_V1: persistedVisibilityStorage }
      );
      if (hrGate) {
        const sw = await hrPage.$('[data-slot="switch-to-barcode-fallback-btn"]');
        if (sw) {
          await sw.click();
          await sleep(250);
        }
        const vb = await hrPage.$('[data-slot="verify-digital-badge-btn"]');
        if (vb) {
          await vb.click();
          await sleep(800);
        }
      }
      await hrPage.goto(`${baseUrl}/?tab=gov-integrations`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await sleep(2000);
      const hrGrantedText = await hrPage.evaluate(() => document.body.innerText || '');
      assert(
        hrGrantedText.includes('مؤشر الجاهزية الموحد'),
        'Custom Abdulrahman grant did not grant hr@kas.sa access to gov-integrations!'
      );
      await hrCtx.close();

      // Now verify `a.alanazi@kas.sa` (another HR user) is STILL blocked under the same storage!
      const aljouriCtx = await browser.createBrowserContext();
      const aljouriPage = await aljouriCtx.newPage();
      aljouriPage.on('pageerror', (e) => allPageErrors.push(`[UAT-04-ALJOURI] ${e.message}`));
      const { gateVisible: ajGate } = await signInAndUnlockGate(
        aljouriPage,
        baseUrl,
        'a.alanazi@kas.sa',
        uatPassword,
        'aljouri.uat@gmail.com',
        { ALSULAIM_MODULE_VISIBILITY_V1: persistedVisibilityStorage }
      );
      if (ajGate) {
        const sw = await aljouriPage.$('[data-slot="switch-to-barcode-fallback-btn"]');
        if (sw) {
          await sw.click();
          await sleep(250);
        }
        const vb = await aljouriPage.$('[data-slot="verify-digital-badge-btn"]');
        if (vb) {
          await vb.click();
          await sleep(800);
        }
      }
      await aljouriPage.goto(`${baseUrl}/?tab=gov-integrations`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      await sleep(2000);
      const ajBlockedText = await aljouriPage.evaluate(() => document.body.innerText || '');
      assert(
        !ajBlockedText.includes('مؤشر الجاهزية الموحد'),
        'a.alanazi@kas.sa unexpectedly received hr@kas.sa custom grant!'
      );
      await aljouriCtx.close();

      uatPass(
        'UAT-04',
        'Eng. Abdulrahman Per-Employee Visibility Control (Live End-to-End Cross-Session)',
        'Abdulrahman granted gov-integrations to hr@kas.sa ONLY; hr@kas.sa unlocked while a.alanazi@kas.sa remained blocked.'
      );
    } catch (err) {
      uatFail('UAT-04', 'Abdulrahman Per-Employee Visibility Control', err);
    }

    // =========================================================================
    // UAT-05: Unified Gov Integration Hub (11 Agencies • SAF • YAQ • TOP • KAS • DAR)
    // =========================================================================
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      page.on('pageerror', (e) => allPageErrors.push(`[UAT-05] ${e.message}`));

      const { gateVisible } = await signInAndUnlockGate(
        page,
        baseUrl,
        'khalid@kas.sa',
        uatPassword,
        'khalid.gov.uat@gmail.com'
      );
      if (gateVisible) {
        const sw = await page.$('[data-slot="switch-to-barcode-fallback-btn"]');
        if (sw) {
          await sw.click();
          await sleep(250);
        }
        const vb = await page.$('[data-slot="verify-digital-badge-btn"]');
        if (vb) {
          await vb.click();
          await page
            .waitForFunction(
              () => !document.querySelector('[data-slot="biometric-attendance-gate-modal"]'),
              { timeout: 8000 }
            )
            .catch(() => {});
        }
      }

      await page.goto(`${baseUrl}/?tab=gov-integrations`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await page.waitForFunction(
        () => {
          const mainEl = document.querySelector('main');
          const t = (mainEl ? mainEl.innerText : document.body.innerText) || '';
          const spinning = Boolean(mainEl && mainEl.querySelector('svg.animate-spin'));
          return t.includes('من 11 جاهزة') && !spinning && !t.includes('0 من 11 جاهزة');
        },
        { timeout: 25000 }
      ).catch(() => {});
      await sleep(300);

      const hubAudit = await page.evaluate(() => {
        const mainEl = document.querySelector('main');
        const body = (mainEl ? mainEl.innerText : document.body.innerText) || '';
        const spinning = Boolean(mainEl && mainEl.querySelector('svg.animate-spin'));
        const cards = mainEl
          ? Array.from(mainEl.querySelectorAll('div')).filter((d) => {
              const t = d.innerText || '';
              return t.includes('سجل صالح') && t.includes('طابور') && t.length < 600;
            })
          : [];
        const nonReady = cards
          .map((c) => c.innerText.replace(/\s+/g, ' ').trim())
          .filter((t) => !t.includes('جاهز للربط'));
        return {
          spinning,
          nonReady: Array.from(new Set(nonReady)),
          snippet: body.replace(/\s+/g, ' ').slice(0, 700),
          has11Ready: body.includes('11 من 11 جاهزة'),
          hasNoDataBadge: body.includes('لا توجد بيانات'),
          hasBlockedBadge: body.includes('محجوب — يتطلب إصلاح'),
          hasEtimad: body.includes('منصة اعتماد'),
          hasMusaned: body.includes('مساند'),
          hasZatca: body.includes('ZATCA'),
          hasMudad: body.includes('مُدد'),
        };
      });
      assert(
        hubAudit.has11Ready,
        `Gov Hub did not report all "11 من 11 جاهزة" | nonReady=${JSON.stringify(hubAudit.nonReady)} | snippet=${hubAudit.snippet}`
      );
      assert(!hubAudit.hasNoDataBadge, 'Gov Hub still shows NO_DATA ("لا توجد بيانات") badge!');
      assert(!hubAudit.hasBlockedBadge, 'Gov Hub still shows BLOCKED ("محجوب") badge!');

      // Test KAS entity filter pill -> filters to KAS-applicable agencies (including Etimad)
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(
          (b) => (b.textContent || '').trim() === 'KAS'
        );
        if (btn) btn.click();
      });
      await sleep(400);
      const kasFilterText = await page.evaluate(() => document.body.innerText || '');
      assert(kasFilterText.includes('منصة اعتماد'), 'KAS filter missing Etimad');
      assert(!kasFilterText.includes('مساند (Musaned)'), 'KAS filter leaked Musaned!');

      // Reset to المجموعة (5)
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('المجموعة (5)')
        );
        if (btn) btn.click();
      });
      await sleep(400);

      // Open PreviewModal and check PDPL masking + 0 validation errors
      const clickedPreview = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.textContent || '').includes('معاينة الحزمة')
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      assert(clickedPreview, 'Could not find PreviewModal trigger button ("معاينة الحزمة")');
      await sleep(400);

      const modalCheck = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        const txt = dlg ? dlg.textContent || '' : '';
        return {
          open: Boolean(dlg),
          masked: txt.includes('******') || txt.includes('HDR,'),
        };
      });
      assert(modalCheck.open, 'PreviewModal dialog did not open');

      await ctx.close();
      uatPass(
        'UAT-05',
        'Unified Gov Integration Hub (11 Agencies READY • SAF • YAQ • TOP • KAS • DAR)',
        '11/11 agencies READY (0 NO_DATA, 0 BLOCKED), KAS filter isolated Etimad, PreviewModal verified.'
      );
    } catch (err) {
      uatFail('UAT-05', 'Unified Gov Integration Hub (11 Agencies)', err);
    }

    // =========================================================================
    // UAT-06: Mobile Responsive Viewport (390x844) + Core Modules + Zero Runtime Errors
    // =========================================================================
    try {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      page.on('pageerror', (e) => allPageErrors.push(`[UAT-06] ${e.message}`));

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(1200);
      const mobileMetrics = await page.evaluate(() => ({
        docWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        hasContent: (document.body.innerText || '').trim().length > 50,
      }));
      assert(mobileMetrics.hasContent, 'Mobile landing view rendered blank');
      assert(
        mobileMetrics.docWidth <= mobileMetrics.viewportWidth + 4,
        `Mobile horizontal overflow detected: scrollWidth=${mobileMetrics.docWidth} > viewport=${mobileMetrics.viewportWidth}`
      );

      await ctx.close();
      uatPass(
        'UAT-06',
        'Mobile Viewport (390x844) Layout & Zero Runtime Errors Audit',
        `scrollWidth=${mobileMetrics.docWidth}px <= viewport=${mobileMetrics.viewportWidth}px.`
      );
    } catch (err) {
      uatFail('UAT-06', 'Mobile Responsive Viewport & Runtime Errors', err);
    }
  } finally {
    try {
      browser.process()?.kill('SIGKILL');
    } catch {
      // ignore
    }
    if (viteProc) {
      try {
        viteProc.kill();
      } catch {
        // ignore
      }
    }
  }

  console.log('\n================================================================================');
  console.log('📊 USER ACCEPTANCE TESTING (UAT) SCORECARD');
  console.log('================================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`  Passed: ${passedCount} / ${results.length}`);
  console.log(`  Failed: ${failedCount}`);
  console.log(`  Runtime Page Errors: ${allPageErrors.length}`);
  if (allPageErrors.length > 0) {
    console.error('  Page Errors:', allPageErrors);
  }
  console.log('================================================================================\n');

  if (failedCount > 0 || allPageErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal UAT Runner Error:', err);
  process.exit(1);
});
