const fs = require('fs');
const path = require('path');

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

console.log('Total pages to audit:', files.length);

const issues = [];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for empty onClick handlers: onClick={() => {}}
  const emptyClickMatches = [...content.matchAll(/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g)];
  if (emptyClickMatches.length > 0) {
    issues.push({ file, type: 'Empty onClick handler', count: emptyClickMatches.length });
  }

  // Check for alert()
  const alertMatches = [...content.matchAll(/alert\(/g)];
  if (alertMatches.length > 0) {
    issues.push({ file, type: 'Direct alert() call instead of notification', count: alertMatches.length });
  }

  // Check for placeholder text: "قريباً", "قيد التطوير", "TODO", "FIXME"
  const todoMatches = [...content.matchAll(/TODO|FIXME|قيد التطوير|سيتم إضافته قريباً|قريباً/g)];
  if (todoMatches.length > 0) {
    issues.push({ file, type: 'TODO/Placeholder text', matches: todoMatches.map(m => m[0]) });
  }
});

console.log('\n=== AUDIT RESULTS ===');
console.log(JSON.stringify(issues, null, 2));
