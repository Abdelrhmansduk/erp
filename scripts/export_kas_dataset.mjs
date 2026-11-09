import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

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

const sheetsData = {};
let totalCount = 0;

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

  const list = [];
  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const title = (row[3] || row[2] || '').toString().trim();
    if (!title || title.length < 3 || title === 'اسم المنافسة') continue;

    const refNum = (row[4] || row[5] || '').toString().trim();
    const tenderCode = (row[2] || '').toString().trim();
    const company = (row[1] || '').toString().trim() || (sheetName === 'تجارة' ? 'مؤسسة خالد السليم للتجارة' : sheetName);

    const tender = {
      id: `KAS-${sheetName.replace(/\s+/g, '_')}-${r}`,
      sheetName,
      seq: row[0] || (list.length + 1),
      company: company,
      tenderCode: tenderCode,
      title: title,
      referenceNumber: refNum,
      tenderNumber: (row[5] || '').toString().trim(),
      entity: (row[6] || row[7] || '').toString().trim(),
      managerName: (row[7] !== row[6] ? row[7] : '') || (row[8] && typeof row[8] === 'string' && isNaN(Number(row[8])) ? row[8] : '') || '',
      managerPhone: (typeof row[8] === 'number' || (row[8] && !isNaN(Number(row[8])))) ? row[8].toString().trim() : '',
      managerEmail: (row[9] || '').toString().trim(),
      startDate: parseExcelDate(row[10]),
      deadlineDate: parseExcelDate(row[11]),
      durationDays: row[12] ? parseInt(row[12]) || row[12].toString().trim() : '',
      executionDuration: (row[13] || '').toString().trim(),
      bidValue: parseFloat((row[14] || '').toString().replace(/[^0-9.]/g, '')) || 0,
      winningBidValue: parseFloat((row[15] || '').toString().replace(/[^0-9.]/g, '')) || 0,
      notes: (row[16] || '').toString().trim(),
      rejectionReason: (row[17] || '').toString().trim(),
      biddersCount: parseInt(row[18]) || 0,
      boqStatus: (row[19] || '').toString().trim() === 'true' ? 'تم' : (row[19] || '').toString().trim(),
      filePrepStatus: (row[20] || '').toString().trim() === 'true' ? 'تم' : (row[20] || '').toString().trim(),
      reviewStatus: (row[21] || '').toString().trim() || '',
      sampleDeliveryStatus: (row[22] || '').toString().trim() || '',
      awardingStatus: (row[23] || '').toString().trim() || '',
      approvalsStatus: (row[24] || '').toString().trim() || '',
      platformType: (row[25] || '').toString().trim() || 'منصة اعتماد',
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

    list.push(tender);
    totalCount++;
  }

  sheetsData[sheetName] = list;
});

console.log(`Extracted total ${totalCount} records across ${Object.keys(sheetsData).length} sheets.`);

// Save JSON
const outDir = 'd:/OneDrive - University of the People/erp/src/data';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const jsonPath = path.join(outDir, 'kasMonafasatSheetData.json');
fs.writeFileSync(jsonPath, JSON.stringify(sheetsData));
const stats = fs.statSync(jsonPath);
console.log(`Written JSON to ${jsonPath}, size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
