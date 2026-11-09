import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('List of all sheets:');
workbook.SheetNames.forEach((name, i) => {
  const sheet = workbook.Sheets[name];
  const ref = sheet['!ref'] || '';
  console.log(`${i + 1}. [${name}] (ref: ${ref})`);
});
