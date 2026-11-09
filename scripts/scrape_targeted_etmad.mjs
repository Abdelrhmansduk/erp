import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = 'C:\\Users\\Admin Abdelrhman\\.gemini\\antigravity-ide\\brain\\dcee35d8-6343-4621-a343-95e8e527bfd0\\scratch\\etmad_scrape';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('Logging in...');
  await page.goto('https://etmad.inova-cloud.com/admin/authentication', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"], input[name="email"], input[name="username"]', process.env.ETMAD_EMAIL || '');
  await page.type('input[type="password"]', process.env.ETMAD_PASSWORD || '');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]')
  ]);

  const targetRoutes = [
    { name: 'competitions_list', url: 'https://etmad.inova-cloud.com/admin/competitions' },
    { name: 'competitions_settings', url: 'https://etmad.inova-cloud.com/admin/competitions/settings' },
    { name: 'invoices_list', url: 'https://etmad.inova-cloud.com/admin/invoices' },
    { name: 'estimates_list', url: 'https://etmad.inova-cloud.com/admin/estimates' },
    { name: 'proposals_list', url: 'https://etmad.inova-cloud.com/admin/proposals' },
    { name: 'contracts_list', url: 'https://etmad.inova-cloud.com/admin/contracts' },
    { name: 'expenses_list', url: 'https://etmad.inova-cloud.com/admin/expenses' },
    { name: 'projects_list', url: 'https://etmad.inova-cloud.com/admin/projects' },
    { name: 'tasks_list', url: 'https://etmad.inova-cloud.com/admin/tasks' },
    { name: 'tickets_list', url: 'https://etmad.inova-cloud.com/admin/tickets' },
    { name: 'leads_list', url: 'https://etmad.inova-cloud.com/admin/leads' },
    { name: 'staff_list', url: 'https://etmad.inova-cloud.com/admin/staff' },
    { name: 'invoice_items_list', url: 'https://etmad.inova-cloud.com/admin/invoice_items' }
  ];

  for (const route of targetRoutes) {
    try {
      console.log(`Navigating to ${route.name} (${route.url})...`);
      await page.goto(route.url, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      await page.screenshot({ path: path.join(outputDir, `${route.name}.png`), fullPage: true });
      const html = await page.content();
      fs.writeFileSync(path.join(outputDir, `${route.name}.html`), html);

      // Extract table headers, columns, filters, and sample rows
      const tableData = await page.evaluate(() => {
        const title = document.title;
        const tables = Array.from(document.querySelectorAll('table')).map(tbl => {
          const headers = Array.from(tbl.querySelectorAll('th')).map(th => th.innerText.trim());
          const rows = Array.from(tbl.querySelectorAll('tbody tr')).slice(0, 10).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          });
          return { headers, rowsCount: tbl.querySelectorAll('tbody tr').length, sampleRows: rows };
        });

        const buttons = Array.from(document.querySelectorAll('button, a.btn')).map(b => b.innerText.trim()).filter(Boolean);
        const stats = Array.from(document.querySelectorAll('.stat, .widget, .card, [class*="stat"], [class*="summary"]')).map(s => s.innerText.trim()).filter(Boolean);

        return { title, tables, buttons, stats };
      });

      fs.writeFileSync(path.join(outputDir, `${route.name}_data.json`), JSON.stringify(tableData, null, 2));
      console.log(`Extracted data for ${route.name}: Tables found = ${tableData.tables.length}`);
    } catch (e) {
      console.error(`Error scraping ${route.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('Targeted scrape finished.');
}

run().catch(console.error);
