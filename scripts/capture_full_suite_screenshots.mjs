import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Admin Abdelrhman\\.gemini\\antigravity-ide\\brain\\dcee35d8-6343-4621-a343-95e8e527bfd0';

async function captureScreenshots() {
  console.log('Launching browser to capture Kas Etmad Suite design screenshots...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log('Opening local app on http://localhost:3001/ ...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Set auth
    await page.evaluate(() => {
      localStorage.setItem('currentUser', JSON.stringify({
        id: 'admin-1',
        name: 'م. أحمد البشير',
        username: 'admin',
        email: 'mr.ahmed.elbashir@gmail.com',
        role: 'admin',
        companyId: 'company-kas'
      }));
      localStorage.setItem('alsulaim_legal_acknowledged_admin', 'true');
      localStorage.setItem('alsulaim_legal_acknowledged_undefined', 'true');
      localStorage.setItem('erp_active_company_id', 'company-kas');
      
      window.dispatchEvent(new CustomEvent('alsulaim_navigate', {
        detail: { tab: 'kas-etmad', title: 'منظومة سحابة اعتماد كاس' }
      }));
    });

    await new Promise(r => setTimeout(r, 2000));

    // 1. Dashboard
    console.log('1. Capturing Dashboard...');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'design_01_dashboard.png'), fullPage: false });

    // 2. Proposals Tab
    console.log('2. Capturing Proposals...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('العروض (Proposals)'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'design_02_proposals.png'), fullPage: false });

    // 3. Calendar Tab
    console.log('3. Capturing Calendar...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('التقويم'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'design_03_calendar.png'), fullPage: false });

    // 4. Reports Tab
    console.log('4. Capturing Reports...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('التقارير'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'design_04_reports.png'), fullPage: false });

    // 5. Utilities Tab
    console.log('5. Capturing Utilities...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('الأدوات'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'design_05_utilities.png'), fullPage: false });

    // 6. Invoices & Detail Print Modal
    console.log('6. Capturing ZATCA Print Modal...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('الفواتير'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const printBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('عرض / ZATCA') || b.textContent.includes('عرض / طباعة ZATCA'));
      if (printBtn) printBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'design_06_zatca_modal.png'), fullPage: false });

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
