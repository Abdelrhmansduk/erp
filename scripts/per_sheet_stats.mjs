import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheet-by-sheet summary:');
const results = [];

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = (data[i] || []).filter(c => c !== '');
    if (row.length > 5) {
      headerRowIdx = i;
      break;
    }
  }
  
  const headers = data[headerRowIdx] || [];
  let validRows = 0;
  let wonCount = 0;
  let highBidCount = 0;
  let cancelledCount = 0;
  let pendingCount = 0;
  let totalValue = 0;
  let wonValue = 0;

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.some(c => c !== '')) continue;
    const tenderTitle = row[3] || row[2] || '';
    if (!tenderTitle) continue;
    validRows++;

    const val = parseFloat((row[14] || '').toString().replace(/[^0-9.]/g, '')) || 0;
    const wonVal = parseFloat((row[15] || '').toString().replace(/[^0-9.]/g, '')) || 0;
    totalValue += val;
    wonValue += wonVal;

    const reason = (row[17] || row[16] || '').toString();
    if (reason.includes('تم الترسية') || reason.includes('معتمد')) wonCount++;
    else if (reason.includes('مرتفع')) highBidCount++;
    else if (reason.includes('إلغاء') || reason.includes('الغاء')) cancelledCount++;
    else pendingCount++;
  }

  results.push({
    sheet: sheetName,
    validRows,
    totalValue: Math.round(totalValue),
    wonValue: Math.round(wonValue),
    wonCount,
    highBidCount,
    cancelledCount,
    pendingCount
  });
});

console.table(results);
