import fs from 'fs';
import path from 'path';

const outputDir = 'C:\\Users\\Admin Abdelrhman\\.gemini\\antigravity-ide\\brain\\dcee35d8-6343-4621-a343-95e8e527bfd0\\scratch\\etmad_scrape';
const dashboardHtml = fs.readFileSync(path.join(outputDir, '03_dashboard.html'), 'utf8');

// Parse all <ul> and <li> in the sidebar navigation
const ulMatch = dashboardHtml.match(/<ul\s+class="nav\s+metis-menu"[^>]*>([\s\S]*?)<\/ul>/i) || dashboardHtml.match(/<aside[^>]*>([\s\S]*?)<\/aside>/i) || dashboardHtml.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);

console.log('--- Submenus and Navigation Items ---');
const subMenuRegex = /<li\s+class="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi;
let m;
while ((m = subMenuRegex.exec(dashboardHtml)) !== null) {
  const cls = m[1];
  const body = m[2];
  if (cls.includes('menu-item') || cls.includes('sub-menu')) {
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const href = (body.match(/href="([^"]+)"/) || [])[1] || '';
    console.log(`[${cls}] -> text: "${text}", href: "${href}"`);
  }
}

// Check Dashboard widgets and content
console.log('\n--- Dashboard Content Panels & Stats ---');
const panels = dashboardHtml.match(/<div\s+class="[^"]*(?:panel|widget|card|col-md)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi) || [];
console.log(`Found ${panels.length} panel divs.`);

// Look for headings and widgets titles
const widgetTitles = dashboardHtml.match(/<(?:h1|h2|h3|h4|h5|p|span)[^>]*class="[^"]*(?:widget-title|panel-title|heading|stat-title|title)[^"]*"[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4|h5|p|span)>/gi) || [];
widgetTitles.forEach(w => console.log('Widget Heading:', w.replace(/<[^>]+>/g, '').trim()));
