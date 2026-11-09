const fs = require('fs');
const path = require('path');

const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

console.log('Inspecting button handlers in 54 pages...');

let totalButtons = 0;
let buttonsWithoutOnClick = 0;
const buttonReport = [];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Match <button ... > tags
  const buttonTags = content.match(/<button[\s\S]*?>/g) || [];
  totalButtons += buttonTags.length;

  buttonTags.forEach(btn => {
    // Check if button has onClick or type="submit" or disabled
    const hasOnClick = btn.includes('onClick');
    const isSubmit = btn.includes('type="submit"') || btn.includes("type='submit'");
    if (!hasOnClick && !isSubmit) {
      buttonsWithoutOnClick++;
      // console.log(`[${file}] Button without onClick/submit: ${btn.slice(0, 80)}`);
    }
  });
});

console.log(`Total buttons found: ${totalButtons}`);
console.log(`Buttons without onClick/submit: ${buttonsWithoutOnClick}`);
