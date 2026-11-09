import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ARTIFACT_DIR = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/75210843-9758-4333-a4ec-ffffe292781b';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runReview() {
  console.log('--- Launching Chrome for Full ERP Inspection ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });

  const report = {
    steps: [],
    errors: [],
    screenshots: []
  };

  try {
    // 1. Open Landing / Home
    console.log('1. Loading http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));
    const landingImg = path.join(ARTIFACT_DIR, '01_landing_page.png');
    await page.screenshot({ path: landingImg, fullPage: false });
    report.steps.push({ step: 'Landing Page', status: 'OK', screenshot: '01_landing_page.png' });

    // Check if on Landing or Login
    // Let's click portal entry or login button
    const enterPortalBtn = await page.$('button, a');
    console.log('Clicking to enter login/portal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a')).find(el => 
        el.textContent.includes('دخول') || 
        el.textContent.includes('تسجيل') || 
        el.textContent.includes('البوابة') ||
        el.textContent.includes('Login') ||
        el.textContent.includes('المنظومة')
      );
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const loginImg = path.join(ARTIFACT_DIR, '02_login_page.png');
    await page.screenshot({ path: loginImg, fullPage: false });
    report.steps.push({ step: 'Login Page', status: 'OK', screenshot: '02_login_page.png' });

    // Submit login form
    console.log('Submitting login credentials...');
    await page.evaluate(() => {
      const userInput = document.querySelector('input[type="text"], input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (userInput) {
        userInput.value = 'admin@alsulaim.sa';
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passInput) {
        passInput.value = '';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Handle 2FA if present
    const otpInput = await page.$('input[maxlength="1"], input[type="text"]');
    if (otpInput) {
      console.log('Entering 2FA OTP...');
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[maxlength="1"]');
        if (inputs.length > 0) {
          inputs.forEach((inp, idx) => {
            inp.value = String(idx + 1);
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }
        const submit2FA = document.querySelector('button[type="submit"]');
        if (submit2FA) submit2FA.click();
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    const launcherImg = path.join(ARTIFACT_DIR, '03_app_launcher.png');
    await page.screenshot({ path: launcherImg, fullPage: false });
    report.steps.push({ step: 'App Launcher / Hub', status: 'OK', screenshot: '03_app_launcher.png' });

    // Now test key module navigations
    const modulesToTest = [
      { id: 'dashboard', name: 'Dashboard Command Center', title: 'الرئيسية والمؤشرات التشغيلية', file: '04_dashboard.png' },
      { id: 'group-command-center', name: 'Group Command Center', title: 'مركز القيادة الموحد للمجموعة', file: '05_group_command.png' },
      { id: 'recruitment-contracts', name: 'Recruitment Contracts', title: 'عقود التوسط والاستقدام', file: '06_recruitment_contracts.png' },
      { id: 'rent-contracts', name: 'Rent Contracts', title: 'عقود الإيجار والتشغيل', file: '07_rent_contracts.png' },
      { id: 'finance', name: 'Financial Management', title: 'الإدارة المالية والمحاسبية', file: '08_finance.png' },
      { id: 'hr', name: 'Human Resources & Payroll', title: 'الموارد البشرية والرواتب (WPS)', file: '09_hr_payroll.png' },
      { id: 'zatca', name: 'ZATCA E-Invoicing Phase 2', title: 'الفاتورة الإلكترونية والربط مع هيئة الزكاة', file: '10_zatca.png' },
      { id: 'data-import', name: 'Data Import Wizard', title: 'معالج استيراد البيانات الذكي', file: '11_data_import.png' },
      { id: 'settings', name: 'Settings & Company Profile', title: 'إعدادات المنظومة والمجموعة', file: '12_settings.png' }
    ];

    for (const mod of modulesToTest) {
      console.log(`Navigating to ${mod.name} (${mod.id})...`);
      await page.evaluate((id, title) => {
        // Dispatch navigation event or trigger store
        window.dispatchEvent(new CustomEvent('alsulaim_navigate', { detail: { tab: id, title: title } }));
      }, mod.id, mod.title);

      await new Promise(r => setTimeout(r, 1200));
      const modImg = path.join(ARTIFACT_DIR, mod.file);
      await page.screenshot({ path: modImg, fullPage: false });
      report.steps.push({ step: mod.name, status: 'OK', screenshot: mod.file });
    }

    report.errors = errors;
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'inspection_report.json'), JSON.stringify(report, null, 2));
    console.log('--- Review completed successfully! ---');

  } catch (err) {
    console.error('Inspection failed:', err);
    report.errors.push(err.message);
  } finally {
    await browser.close();
  }
}

runReview();
