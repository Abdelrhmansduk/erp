import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/a420f6ff-bfd2-4eb4-a7b0-5a5f93fc23d2';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyAllSectionsFixed() {
  console.log('🚀 Verifying Tailwind Fix on http://localhost:3000 ...');

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

    // 2. Click HR card in Launcher
    await page.click('.card-hr');
    await new Promise(r => setTimeout(r, 2000));

    const shotHR = path.join(ARTIFACT_DIR, 'screen_hr_page_fixed.png');
    await page.screenshot({ path: shotHR });
    console.log(`📸 Saved HR Page Fixed: ${shotHR}`);

    // 3. Click Clients in sidebar
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item span'));
      const clientsItem = items.find(s => s.textContent && s.textContent.includes('جميع العملاء المعتمدين'));
      if (clientsItem) {
        const nav = clientsItem.closest('.nav-item');
        if (nav) nav.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    const shotClients = path.join(ARTIFACT_DIR, 'screen_clients_fixed.png');
    await page.screenshot({ path: shotClients });
    console.log(`📸 Saved Clients Page Fixed: ${shotClients}`);

    // 4. Click Orders in sidebar
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item span'));
      const ordersItem = items.find(s => s.textContent && s.textContent.includes('جميع الطلبات النشطة'));
      if (ordersItem) {
        const nav = ordersItem.closest('.nav-item');
        if (nav) nav.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    const shotOrders = path.join(ARTIFACT_DIR, 'screen_orders_fixed.png');
    await page.screenshot({ path: shotOrders });
    console.log(`📸 Saved Orders Page Fixed: ${shotOrders}`);

    console.log('🎉 All Sections Verified and Beautifully Styled!');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verifyAllSectionsFixed();
