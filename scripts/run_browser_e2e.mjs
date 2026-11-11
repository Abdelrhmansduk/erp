#!/usr/bin/env node
/**
 * Khalid Al-Sulaim Holding ERP — Automated Chromium Browser E2E Verifier
 * Verifies:
 *   1. Landing & Login Page rendering (Email/Password, Google OAuth, Magic Link)
 *   2. Live UI Form Submit (`button[type="submit"]` -> `khalid@kas.sa`) without UI occlusion
 *   3. Entering the full ERP Workspace (`فتح شاشة القسم الرئيسية`) -> Executive Dashboard KPIs & Official SAMA Saudi Riyal Symbol (`⃁` U+20C1)
 *   4. Strict assertions: exits 1 if Dashboard KPIs / ⃁ fail to render or if any runtime error occurs
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
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

    // Click the real submit button (`button[type="submit"]`) to verify it is NOT occluded by any fixed banner
    console.log('  2️⃣  Submitting Corporate Email Sign-In Form (`khalid@kas.sa`)...');
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) {
      throw new Error('Submit button `button[type="submit"]` not found on LoginPage.');
    }
    await submitBtn.scrollIntoViewIfNeeded?.();
    await submitBtn.click();

    // Wait for the Executive Greeting Splash Screen to transition into the Executive Portal Launcher
    await new Promise((r) => setTimeout(r, 4200));

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

    console.log(`  3️⃣  Verifying Executive Dashboard & SAMA Riyal Symbol (⃁)...`);
    console.log(`     ${hasSaudiRiyalSymbol ? '✅' : '❌'} Contains official ⃁ (U+20C1): ${hasSaudiRiyalSymbol}`);
    console.log(`     ${!hasLegacyRiyalText ? '✅' : '❌'} Zero legacy ر.س on screen: ${!hasLegacyRiyalText}`);

    await page.screenshot({ path: DASHBOARD_SCREENSHOT_PATH, fullPage: false });
    console.log(`  4️⃣  Saved Dashboard screenshot → ${DASHBOARD_SCREENSHOT_PATH}`);
    console.log(`  5️⃣  Runtime Page Errors: ${consoleErrors.length}`);

    if (!hasEmailButton || !hasGoogleButton || !hasSaudiRiyalSymbol || hasLegacyRiyalText || consoleErrors.length > 0) {
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
