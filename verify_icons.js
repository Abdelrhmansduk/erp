import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/a420f6ff-bfd2-4eb4-a7b0-5a5f93fc23d2';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function verifyEnterpriseIcons() {
  console.log('🚀 Verifying Enterprise Icons on http://localhost:3000 ...');

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

    // 2. In Launcher -> Finance to expand sidebar
    await page.click('.card-finance');
    await new Promise(r => setTimeout(r, 2000));

    const shot1 = path.join(ARTIFACT_DIR, 'screen_enterprise_icons_sidebar.png');
    await page.screenshot({ path: shot1 });
    console.log(`📸 Saved Enterprise Sidebar with Icons: ${shot1}`);

  } catch (err) {
    console.error('Error during icon verification:', err);
  } finally {
    await browser.close();
  }
}

verifyEnterpriseIcons();
