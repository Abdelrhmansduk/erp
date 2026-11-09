import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Admin Abdelrhman\\.gemini\\antigravity-ide\\brain\\dcee35d8-6343-4621-a343-95e8e527bfd0\\scratch\\comparison_screenshots';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runComparison() {
  console.log('Starting Puppeteer comparison with Chrome executable...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // -------------------------------------------------------------
    // PART 2: CLONED LOCAL SITE (http://localhost:3001/)
    // -------------------------------------------------------------
    console.log('Navigating to Local Cloned System on port 3001...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Set localStorage auth & navigate event
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
      
      // Dispatch navigation event
      window.dispatchEvent(new CustomEvent('alsulaim_navigate', {
        detail: { tab: 'kas-etmad', title: 'منظومة سحابة اعتماد كاس' }
      }));
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log('Capturing Cloned Dashboard...');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cloned_01_dashboard.png'), fullPage: false });

    // Click Competitions Tab
    console.log('Clicking Cloned Competitions tab...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('المنافسات'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cloned_02_competitions.png'), fullPage: false });

    // Click Invoices Tab
    console.log('Clicking Cloned Invoices tab...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('الفواتير'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cloned_03_invoices.png'), fullPage: false });

    // Click Settings Tab
    console.log('Clicking Cloned Settings tab...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('تصنيفات المنافسات'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cloned_04_categories.png'), fullPage: false });

    // Click Staff Tab
    console.log('Clicking Cloned Staff tab...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('الطاقم'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cloned_05_staff.png'), fullPage: false });

    // Open Add Invoice Modal
    console.log('Opening Add Invoice Modal...');
    await page.evaluate(() => {
      const invBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('الفواتير'));
      if (invBtn) invBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('إنشاء فاتورة جديدة'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cloned_06_invoice_modal.png'), fullPage: false });

    console.log('Cloned screenshots updated successfully in:', ARTIFACTS_DIR);
  } catch (err) {
    console.error('Error during comparison capture:', err);
  } finally {
    await browser.close();
  }
}

runComparison();
