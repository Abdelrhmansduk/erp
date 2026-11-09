import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['رئيسي'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('=== All Non-empty rows in "رئيسي" ===');
data.forEach((row, idx) => {
  const clean = (row || []).filter(c => c !== '');
  if (clean.length > 0) {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row.slice(0, 20)));
  }
});
