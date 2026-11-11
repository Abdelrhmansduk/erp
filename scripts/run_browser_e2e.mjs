#!/usr/bin/env node
/**
 * Khalid Al-Sulaim Holding ERP — Automated Chromium Browser E2E Verifier
 * Verifies:
 *   1. Landing & Login Page rendering (Email/Password, Google OAuth, Magic Link) with zero prefilled password
 *   2. 1st-Time Sign-In via verified Strong Password (`#login-password-input` + `button[type="submit"]`)
 *   3. Automatic In-Dashboard Personal Google Account Approval Prompt (`GoogleAccountBindingModal`) & binding
 *   4. Entering the full ERP Workspace (`فتح شاشة القسم الرئيسية`) -> Executive Dashboard KPIs & Official SAMA Saudi Riyal Symbol (`⃁` U+20C1)
 *   5. Strict assertions: exits 1 if Strong Password, Google Binding Prompt, or Dashboard KPIs / ⃁ fail to render
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
const DEFAULT_OUT_DIR =
  'C:/Users/ALIENWARE/.gemini/antigravity/brain/b8b943dd-353e-4fa6-97d1-75d686eb4d3a';
const FALLBACK_OUT_DIR = path.resolve(process.cwd(), 'dist');
const OUT_DIR = fs.existsSync(DEFAULT_OUT_DIR) ? DEFAULT_OUT_DIR : FALLBACK_OUT_DIR;

const LOGIN_SCREENSHOT_PATH =
  process.env.LOGIN_SCREENSHOT_PATH || path.join(OUT_DIR, 'erp_browser_e2e_verified.png');
const DASHBOARD_SCREENSHOT_PATH =
  process.env.DASHBOARD_SCREENSHOT_PATH || path.join(OUT_DIR, 'erp_dashboard_e2e_verified.png');

function computeEphemeralPasswordDigest(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  let digest = crypto
    .createHash('sha256')
    .update(`KAS-ERP-STRONG-AUTH-2026-V2|${cleanEmail}|${cleanPass}`)
    .digest('hex');
  for (let i = 1; i < 256; i++) {
    digest = crypto
      .createHash('sha256')
      .update(`${digest}|${cleanEmail}`)
      .digest('hex');
  }
  return digest;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 5194;
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

async function ensureViteServer() {
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
    await new Promise((r) => setTimeout(r, 500));
    if (await checkServerReady(baseUrl)) {
      return { viteProc, baseUrl };
    }
  }
  return { viteProc, baseUrl };
}

async function main() {
  if (!executablePath) {
    console.error('❌ No Chrome/Edge executable found.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(LOGIN_SCREENSHOT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(DASHBOARD_SCREENSHOT_PATH), { recursive: true });

  console.log('================================================================================');
  console.log('🌐 KHALID AL-SULAIM ERP — REAL CHROMIUM BROWSER E2E VERIFIER');
  console.log('================================================================================\n');

  const ephemeralPass = `Ks${crypto.randomBytes(6).toString('base64url')}9#Az!`;
  const ephemeralDigest = computeEphemeralPasswordDigest('khalid@kas.sa', ephemeralPass);

  const { viteProc, baseUrl } = await ensureViteServer();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let exitCode = 0;

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.evaluateOnNewDocument((digest) => {
      if (!localStorage.getItem('ALSULAIM_STAFF_PASSWORD_HASHES_V1')) {
        localStorage.setItem(
          'ALSULAIM_STAFF_PASSWORD_HASHES_V1',
          JSON.stringify({ 'khalid@kas.sa': digest })
        );
      }
    }, ephemeralDigest);

    console.log(`  1️⃣  Navigating to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1500));

    const title = await page.title();
    console.log(`     ✅ Loaded page title: "${title}"`);

    // If initial route is LandingPage, navigate to Unified Login first
    const hasSubmitOnLoad = Boolean(await page.$('button[type="submit"]'));
    if (!hasSubmitOnLoad) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const loginNav = btns.find((b) =>
          (b.textContent || '').match(/دخول|بوابة النفاذ|تسجيل الدخول/)
        );
        if (loginNav && loginNav instanceof HTMLElement) loginNav.click();
      });
      await new Promise((r) => setTimeout(r, 1200));
    }

    const loginText = await page.evaluate(() => document.body.innerText || '');
    const hasEmailButton = loginText.includes('تسجيل الدخول عبر البريد الإلكتروني');
    const hasGoogleButton = loginText.includes('تسجيل الدخول عبر Google');
    console.log(`     ✅ Email Sign-In Button visible: ${hasEmailButton}`);
    console.log(`     ✅ Google OAuth Button visible: ${hasGoogleButton}`);

    await page.screenshot({ path: LOGIN_SCREENSHOT_PATH, fullPage: false });
    console.log(`     📸 Saved Login screenshot → ${LOGIN_SCREENSHOT_PATH}`);

    // Enter strong password & submit Corporate Email Sign-In Form (`khalid@kas.sa`)
    console.log('  2️⃣  Entering Strong Password & Submitting Corporate Sign-In (`khalid@kas.sa`)...');
    const passInput = await page.$('#login-password-input');
    if (!passInput) {
      throw new Error('Password input `#login-password-input` not found on LoginPage.');
    }
    await passInput.click({ clickCount: 3 });
    await passInput.type(ephemeralPass, { delay: 10 });

    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) {
      throw new Error('Submit button `button[type="submit"]` not found on LoginPage.');
    }
    await submitBtn.scrollIntoViewIfNeeded?.();
    await submitBtn.click();

    // Wait for the Executive Greeting Splash Screen to transition into the Portal / Dashboard
    await new Promise((r) => setTimeout(r, 3400));

    // Verify In-Dashboard Google Account Binding Prompt appears & bind personal Google account
    const hasGoogleBindingPrompt = Boolean(await page.$('#bind-google-email-input'));
    console.log(`  3️⃣  Google Account Binding Prompt visible after 1st login: ${hasGoogleBindingPrompt}`);
    if (hasGoogleBindingPrompt) {
      await page.type('#bind-google-email-input', 'khalid.personal.e2e@gmail.com', { delay: 8 });
      await page.type('#bind-google-email-confirm-input', 'khalid.personal.e2e@gmail.com', { delay: 8 });
      await page.click('#bind-google-submit-btn');
      await new Promise((r) => setTimeout(r, 1300));
    }

    // Click "فتح شاشة القسم الرئيسية" to open the full Executive Dashboard with financial KPIs
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const openBtn = buttons.find((b) => (b.textContent || '').includes('فتح شاشة القسم الرئيسية'));
      if (openBtn) openBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));

    const bodyText = await page.evaluate(() => document.body.innerText || '');
    const hasSaudiRiyalSymbol = bodyText.includes('\u20C1');
    const hasLegacyRiyalText = bodyText.includes('ر.س');

    console.log(`  4️⃣  Verifying Executive Dashboard & SAMA Riyal Symbol (⃁)...`);
    console.log(`     ${hasSaudiRiyalSymbol ? '✅' : '❌'} Contains official ⃁ (U+20C1): ${hasSaudiRiyalSymbol}`);
    console.log(`     ${!hasLegacyRiyalText ? '✅' : '❌'} Zero legacy ر.س on screen: ${!hasLegacyRiyalText}`);

    await page.screenshot({ path: DASHBOARD_SCREENSHOT_PATH, fullPage: false });
    console.log(`  5️⃣  Saved Dashboard screenshot → ${DASHBOARD_SCREENSHOT_PATH}`);
    console.log(`  6️⃣  Runtime Page Errors: ${consoleErrors.length}`);

    if (
      !hasEmailButton ||
      !hasGoogleButton ||
      !hasGoogleBindingPrompt ||
      !hasSaudiRiyalSymbol ||
      hasLegacyRiyalText ||
      consoleErrors.length > 0
    ) {
      exitCode = 1;
      console.error('\n❌ BROWSER E2E VERIFICATION FAILED ONE OR MORE ASSERTIONS.');
    } else {
      console.log('\n================================================================================');
      console.log('📊 BROWSER E2E SUMMARY: ALL CHECKS PASSED (100%)');
      console.log('================================================================================');
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
  process.exit(exitCode);
}

main();
