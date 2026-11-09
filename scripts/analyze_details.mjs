import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names in order:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Find non-empty header row
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = (data[i] || []).filter(c => c !== '');
    if (row.length > 5) {
      headerRowIdx = i;
      break;
    }
  }
  
  const headers = data[headerRowIdx] || [];
  console.log(`\n================ Sheet: ${sheetName} (Rows: ${data.length}) ================`);
  console.log('Headers (count: ' + headers.length + '):');
  headers.forEach((h, idx) => {
    if (h) console.log(`  [Col ${idx}] ${h}`);
  });
  
  // Count non-empty data rows
  let dataRowCount = 0;
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r] || [];
    if (row.some(c => c !== '' && c !== null && c !== undefined)) {
      dataRowCount++;
    }
  }
  console.log(`Actual non-empty data rows: ${dataRowCount}`);
  
  // Sample 2 rows
  for (let r = headerRowIdx + 1; r < Math.min(headerRowIdx + 4, data.length); r++) {
    const row = data[r] || [];
    if (row.some(c => c !== '')) {
      console.log(` Sample Row ${r}:`, JSON.stringify(row.slice(0, 15)));
    }
  }
});
