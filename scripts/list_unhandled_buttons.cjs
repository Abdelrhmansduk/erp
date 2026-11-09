const fs = require('fs');
const path = require('path');

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const buttonMatches = [...content.matchAll(/<button([\s\S]*?)>/g)];
  buttonMatches.forEach(m => {
    const attrs = m[1];
    if (!attrs.includes('onClick') && !attrs.includes('type="submit"') && !attrs.includes("type='submit'")) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      console.log(`[${file}:${lineNum}] ${m[0].replace(/\s+/g, ' ')}`);
    }
  });
});
