import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

function parseExcelDate(serial) {
  if (!serial) return '';
  if (typeof serial === 'string') {
    if (serial.includes('-') || serial.includes('/')) return serial.trim();
    const num = parseFloat(serial);
    if (isNaN(num)) return serial.trim();
    serial = num;
  }
  if (typeof serial === 'number') {
    if (serial > 20000 && serial < 60000) {
      const utc_days = Math.floor(serial - 25569);
      const date = new Date(utc_days * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return serial.toString();
  }
  return '';
}

const allTenders = [];
const seenKeys = new Set();

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

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const title = (row[3] || row[2] || '').toString().trim();
    if (!title || title.length < 3 || title === 'اسم المنافسة') continue;
    
    const refNum = (row[4] || row[5] || '').toString().trim().replace(/[^0-9A-Za-z-]/g, '');
    const tenderCode = (row[2] || '').toString().trim();
    const company = (row[1] || '').toString().trim() || (sheetName === 'تجارة' ? 'مؤسسة خالد السليم للتجارة' : sheetName);
    
    // De-duplicate if same refNum + title
    const key = `${refNum || tenderCode}_${title}`;
    
    const tender = {
      sheetOrigin: sheetName,
      seq: row[0] || allTenders.length + 1,
      institution: company,
      tenderCode: tenderCode,
      title: title,
      referenceNumber: refNum || row[4]?.toString().trim() || '',
      internalNumber: (row[5] || '').toString().trim(),
      entity: (row[6] || row[7] || '').toString().trim(),
      contactPerson: (row[7] !== row[6] ? row[7] : '') || (row[8] && typeof row[8] === 'string' && isNaN(Number(row[8])) ? row[8] : '') || '',
      contactPhone: (typeof row[8] === 'number' || (row[8] && !isNaN(Number(row[8])))) ? row[8].toString().trim() : '',
      contactEmail: (row[9] || '').toString().trim(),
      startDate: parseExcelDate(row[10]),
      deadlineDate: parseExcelDate(row[11]),
      biddingDurationDays: row[12] ? parseInt(row[12]) || row[12].toString().trim() : '',
      executionDuration: (row[13] || '').toString().trim(),
      bidValue: parseFloat((row[14] || '').toString().replace(/[^0-9.]/g, '')) || 0,
      winningBidValue: parseFloat((row[15] || '').toString().replace(/[^0-9.]/g, '')) || 0,
      notes: (row[16] || '').toString().trim(),
      awardReason: (row[17] || '').toString().trim(),
      biddersCount: parseInt(row[18]) || 0,
      boqStatus: (row[19] || '').toString().trim() === 'true' ? 'تم' : (row[19] || '').toString().trim(),
      filePrepStatus: (row[20] || '').toString().trim() === 'true' ? 'تم' : (row[20] || '').toString().trim(),
      reviewStatus: (row[21] || '').toString().trim() || '',
      sampleDeliveryStatus: (row[22] || '').toString().trim() || '',
      awardingStatus: (row[23] || '').toString().trim() || '',
      approvalsStatus: (row[24] || '').toString().trim() || '',
      platformOrPaper: (row[25] || '').toString().trim() || 'منصة اعتماد',
      platformContractStatus: (row[26] || '').toString().trim() || '',
      completionCertStatus: (row[27] || '').toString().trim() || '',
      city: (row[28] || '').toString().trim() || '',
      supplyDurationDays: (row[29] || '').toString().trim() || '',
      supplyStartDate: parseExcelDate(row[30]),
      supplyEndDate: parseExcelDate(row[31]),
      estimatedCost: parseFloat((row[32] || '').toString().replace(/[^0-9.]/g, '')) || 0,
      profitPercentage: parseFloat((row[33] || '').toString().replace(/[^0-9.]/g, '')) || 0,
      sampleRequired: (row[34] || '').toString().trim() || 'لا',
      siteVisitRequired: (row[35] || '').toString().trim() || 'لا',
    };

    allTenders.push(tender);
  }
});

console.log('Total tenders parsed:', allTenders.length);
console.log('Sample parsed tender:', JSON.stringify(allTenders[0], null, 2));

// Stats by sheet
const sheetCounts = {};
allTenders.forEach(t => {
  sheetCounts[t.sheetOrigin] = (sheetCounts[t.sheetOrigin] || 0) + 1;
});
console.log('Counts by sheet:', sheetCounts);
