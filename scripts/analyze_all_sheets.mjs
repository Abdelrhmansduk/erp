import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Total Sheets:', workbook.SheetNames.length);

const summary = [];

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Find non-empty header row
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i] || [];
    const nonEmpty = row.filter(c => c !== '');
    if (nonEmpty.length > 3) {
      headerRowIdx = i;
      break;
    }
  }
  
  const headers = headerRowIdx >= 0 ? data[headerRowIdx] : [];
  summary.push({
    name: sheetName,
    rows: data.length,
    headerRowIdx,
    headers: headers.filter(h => h !== '').slice(0, 15),
    totalHeaders: headers.filter(h => h !== '').length
  });
});

console.log(JSON.stringify(summary, null, 2));
