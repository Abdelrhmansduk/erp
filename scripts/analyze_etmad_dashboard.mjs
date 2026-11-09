import fs from 'fs';
import path from 'path';

const outputDir = 'C:\\Users\\Admin Abdelrhman\\.gemini\\antigravity-ide\\brain\\dcee35d8-6343-4621-a343-95e8e527bfd0\\scratch\\etmad_scrape';
const dashboardHtml = fs.readFileSync(path.join(outputDir, '03_dashboard.html'), 'utf8');

console.log('--- Analyzing 03_dashboard.html ---');

// Extract all menu links from sidebar
const sidebarMatches = dashboardHtml.match(/<li[^>]*class="[^"]*menu-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi) || [];
console.log(`Found ${sidebarMatches.length} menu items in sidebar.`);

const menuTree = [];

const navRegex = /<li\s+class="menu-item-([a-zA-Z0-9_-]+)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
let match;
while ((match = navRegex.exec(dashboardHtml)) !== null) {
  const slug = match[1];
  const content = match[2];
  const titleMatch = content.match(/<span\s+class="menu-text">([^<]+)<\/span>/i) || content.match(/<a[^>]*>([^<]+)<\/a>/i);
  const title = titleMatch ? titleMatch[1].trim() : slug;
  const hrefMatch = content.match(/href="([^"]+)"/i);
  const href = hrefMatch ? hrefMatch[1] : '';
  const iconMatch = content.match(/<i\s+class="([^"]+)"/i);
  const icon = iconMatch ? iconMatch[1] : '';

  // check for submenus
  const subMenuMatches = content.match(/<li\s+class="sub-menu-item-[^"]*"[^>]*>([\s\S]*?)<\/li>/gi) || [];
  const subItems = subMenuMatches.map(sub => {
    const subTitleMatch = sub.match(/<span[^>]*>([^<]+)<\/span>/i) || sub.match(/<a[^>]*>([^<]+)<\/a>/i);
    const subHrefMatch = sub.match(/href="([^"]+)"/i);
    return {
      title: subTitleMatch ? subTitleMatch[1].trim() : '',
      href: subHrefMatch ? subHrefMatch[1] : ''
    };
  });

  menuTree.push({ slug, title, href, icon, subItems });
}

console.log('Extracted Sidebar Menu Structure:');
console.log(JSON.stringify(menuTree, null, 2));

// Extract Dashboard Widgets & Cards
const widgets = [];
const widgetRegex = /<div\s+class="[^"]*(?:widget|card|panel|dashboard-item)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;

// Also look for quick stats headers (e.g. Invoices, Projects, Tasks stats)
const statsHeaders = dashboardHtml.match(/<p\s+class="text-[^"]*">([^<]+)<\/p>/gi) || [];
console.log('Sample text headings in dashboard:', statsHeaders.slice(0, 30));

fs.writeFileSync(path.join(outputDir, 'extracted_menu_tree.json'), JSON.stringify(menuTree, null, 2));
