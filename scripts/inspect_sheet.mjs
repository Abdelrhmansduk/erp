import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';

console.log('Loading workbook...');
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const ref = sheet['!ref'];
  console.log(`\n================ Sheet: ${sheetName} (Ref: ${ref}) ================`);
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Total Rows: ${data.length}`);
  console.log('First 15 rows:');
  data.slice(0, 15).forEach((row, idx) => {
    // filter out empty trailing cells
    const cleanRow = (row || []).map(c => typeof c === 'string' ? c.trim() : c);
    console.log(`Row ${idx + 1}:`, JSON.stringify(cleanRow));
  });
}
