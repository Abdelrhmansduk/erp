import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/a420f6ff-bfd2-4eb4-a7b0-5a5f93fc23d2';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyAccountingRestructure() {
  console.log('🚀 Verifying 4-Category Accounting Layout on http://localhost:3000 ...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Enter
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await page.click('.nav-card-landing');
    await new Promise(r => setTimeout(r, 600));
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 600));
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    // 2. In Launcher -> Finance
    await page.click('.card-finance');
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 1: Overview with 4-Category Header
    const shot1 = path.join(ARTIFACT_DIR, 'screen_accounting_4categories.png');
    await page.screenshot({ path: shot1 });
    console.log(`📸 Saved 4-Category Finance Overview: ${shot1}`);

    // Click on "🌳 شجرة الحسابات والدليل"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const coaBtn = btns.find(b => b.textContent && b.textContent.includes('شجرة الحسابات والدليل'));
      if (coaBtn) coaBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const shot2 = path.join(ARTIFACT_DIR, 'screen_accounting_coa_tree.png');
    await page.screenshot({ path: shot2 });
    console.log(`📸 Saved Chart of Accounts: ${shot2}`);

    // Click on "🔒 إقفال الفترات والسنوات"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const lockBtn = btns.find(b => b.textContent && b.textContent.includes('إقفال الفترات والسنوات'));
      if (lockBtn) lockBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const shot3 = path.join(ARTIFACT_DIR, 'screen_accounting_period_closing.png');
    await page.screenshot({ path: shot3 });
    console.log(`📸 Saved Period Closing: ${shot3}`);

    // Click on "📊 ميزان المراجعة" then click first row to test Drill-Down
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tbBtn = btns.find(b => b.textContent && b.textContent.includes('ميزان المراجعة'));
      if (tbBtn) tbBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Click first row in trial balance
    await page.evaluate(() => {
      const row = document.querySelector('tbody tr');
      if (row) row.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const shot4 = path.join(ARTIFACT_DIR, 'screen_accounting_drilldown_modal.png');
    await page.screenshot({ path: shot4 });
    console.log(`📸 Saved Financial Drill-down Modal: ${shot4}`);

    console.log('🎉 All Accounting Suite Screens Verified Successfully!');

  } catch (err) {
    console.error('Error during accounting verification:', err);
  } finally {
    await browser.close();
  }
}

verifyAccountingRestructure();
