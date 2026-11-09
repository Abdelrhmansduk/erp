const fs = require('fs');

const sidebarContent = fs.readFileSync('src/data/sidebarMenu.ts', 'utf8');
const appContent = fs.readFileSync('src/App.tsx', 'utf8');

const hrefRegex = /href:\s*['"]([^'"]+)['"]/g;
const hrefs = [];
let match;
while ((match = hrefRegex.exec(sidebarContent)) !== null) {
  hrefs.push(match[1]);
}

const caseRegex = /case\s+['"]([^'"]+)['"]:/g;
const cases = new Set();
while ((match = caseRegex.exec(appContent)) !== null) {
  cases.add(match[1]);
}

console.log('Total sidebar hrefs:', hrefs.length);
console.log('Total App cases:', cases.size);

const missing = hrefs.filter(h => !cases.has(h));
console.log('Missing sidebar hrefs in App.tsx:', missing);
