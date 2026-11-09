import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = 'C:\\Users\\Admin Abdelrhman\\.gemini\\antigravity-ide\\brain\\dcee35d8-6343-4621-a343-95e8e527bfd0\\scratch\\etmad_scrape';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture network requests/responses
  const apiResponses = [];
  page.on('response', async (res) => {
    try {
      const url = res.url();
      const contentType = res.headers()['content-type'] || '';
      if (contentType.includes('application/json') || url.includes('/api/')) {
        const body = await res.text();
        apiResponses.push({ url, status: res.status(), body });
      }
    } catch {}
  });

  console.log('Navigating to login page...');
  await page.goto('https://etmad.inova-cloud.com/admin/authentication', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.screenshot({ path: path.join(outputDir, '01_login_page.png'), fullPage: true });

  console.log('Current URL:', page.url());
  const loginHtml = await page.content();
  fs.writeFileSync(path.join(outputDir, '01_login.html'), loginHtml);

  // Inspect form inputs
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({
      name: i.name,
      id: i.id,
      type: i.type,
      placeholder: i.placeholder,
      className: i.className
    }));
  });
  console.log('Login Inputs:', inputs);

  // Type credentials
  console.log('Filling credentials...');
  // Find email input
  const emailSelector = 'input[type="email"], input[name="email"], input[name="username"], input[name="login"], input[type="text"]';
  await page.waitForSelector(emailSelector, { timeout: 10000 });
  await page.type(emailSelector, process.env.ETMAD_EMAIL || '');

  const passwordSelector = 'input[type="password"], input[name="password"]';
  await page.waitForSelector(passwordSelector, { timeout: 10000 });
  await page.type(passwordSelector, process.env.ETMAD_PASSWORD || '');

  await page.screenshot({ path: path.join(outputDir, '02_credentials_filled.png') });

  // Submit form
  console.log('Submitting login form...');
  const submitSelector = 'button[type="submit"], input[type="submit"], button.btn-primary, button:has-text("تسجيل"), button:has-text("دخول"), form button';
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
    page.click(submitSelector).catch(async () => {
      await page.keyboard.press('Enter');
    })
  ]);

  // Wait extra 3 seconds for dynamic rendering
  await new Promise(r => setTimeout(r, 3000));

  console.log('Post-login URL:', page.url());
  await page.screenshot({ path: path.join(outputDir, '03_dashboard.png'), fullPage: true });

  const dashboardHtml = await page.content();
  fs.writeFileSync(path.join(outputDir, '03_dashboard.html'), dashboardHtml);

  // Extract all menu links, structure, and text
  const navStructure = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a, button, li, .nav-item, .menu-item')).map(el => ({
      tag: el.tagName,
      href: el.getAttribute('href'),
      text: el.innerText ? el.innerText.trim() : '',
      className: el.className,
      id: el.id
    })).filter(item => item.text && item.text.length < 50);

    const title = document.title;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
      tag: h.tagName,
      text: h.innerText.trim()
    }));

    const cards = Array.from(document.querySelectorAll('.card, .stat, .widget, .box, [class*="card"], [class*="stat"]')).map(c => ({
      className: c.className,
      text: c.innerText ? c.innerText.trim() : ''
    }));

    return { title, links, headings, cards };
  });

  fs.writeFileSync(path.join(outputDir, 'nav_structure.json'), JSON.stringify(navStructure, null, 2));
  fs.writeFileSync(path.join(outputDir, 'api_responses.json'), JSON.stringify(apiResponses, null, 2));

  console.log('Page Title:', navStructure.title);
  console.log('Found Headings:', navStructure.headings);
  console.log('Sample Navigation Links:', navStructure.links.slice(0, 25));

  // Extract all unique internal links
  const internalLinks = await page.evaluate(() => {
    const origin = window.location.origin;
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return Array.from(new Set(anchors.map(a => a.href).filter(href => href.startsWith(origin) && !href.includes('logout') && !href.includes('#'))));
  });

  console.log('\n--- Internal Routes to Scrape ---');
  console.log(internalLinks);

  // Scrape up to 15 key subpages
  for (let i = 0; i < Math.min(internalLinks.length, 15); i++) {
    const routeUrl = internalLinks[i];
    try {
      console.log(`\nNavigating to [${i + 1}/${internalLinks.length}] ${routeUrl}...`);
      await page.goto(routeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const safeName = routeUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(-40);
      await page.screenshot({ path: path.join(outputDir, `page_${i + 1}_${safeName}.png`), fullPage: true });
      const pageHtml = await page.content();
      fs.writeFileSync(path.join(outputDir, `page_${i + 1}_${safeName}.html`), pageHtml);
      console.log(`Saved screenshot and HTML for: ${routeUrl}`);
    } catch (err) {
      console.error(`Failed scraping ${routeUrl}:`, err.message);
    }
  }

  await browser.close();
  console.log('\n=== Scrape Finished Successfully ===');
}

run().catch(console.error);
