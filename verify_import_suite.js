import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/a420f6ff-bfd2-4eb4-a7b0-5a5f93fc23d2';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyImportSuite() {
  console.log('🚀 Verifying Universal Data Import Suite on http://localhost:3000 ...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // 1. Login flow to workspace
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await page.click('.nav-card-landing');
    await new Promise(r => setTimeout(r, 600));
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 600));
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    // 2. Click CRM in launcher to get to workspace
    await page.click('.card-crm');
    await new Promise(r => setTimeout(r, 2000));

    // 3. Capture Clients page with new Import button in DataTable
    const shot1 = path.join(ARTIFACT_DIR, 'screen_datatable_import_button.png');
    await page.screenshot({ path: shot1 });
    console.log(`📸 Saved DataTable with Import Button: ${shot1}`);

    // 4. Click Import in Sidebar under Settings
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button, div, span'));
      const importLink = links.find(el => el.textContent && el.textContent.includes('استيراد بيانات (Excel / CSV)'));
      if (importLink) importLink.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // 5. Screenshot Step 1 of Data Import Wizard
    const shot2 = path.join(ARTIFACT_DIR, 'screen_data_import_wizard_step1.png');
    await page.screenshot({ path: shot2 });
    console.log(`📸 Saved Data Import Wizard Step 1: ${shot2}`);

    // 6. Click on "المالية والمحاسبة والضرائب" category filter
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const financeBtn = buttons.find(b => b.textContent && b.textContent.includes('المالية والمحاسبة'));
      if (financeBtn) financeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const shot3 = path.join(ARTIFACT_DIR, 'screen_data_import_wizard_finance_filter.png');
    await page.screenshot({ path: shot3 });
    console.log(`📸 Saved Finance Filter in Import Wizard: ${shot3}`);

  } catch (err) {
    console.error('Error during import verification:', err);
  } finally {
    await browser.close();
  }
}

verifyImportSuite();
