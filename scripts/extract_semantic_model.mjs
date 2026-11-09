import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('--- Analyzing sheet "رئيسي" ---');
const mainSheet = workbook.Sheets['رئيسي'];
const mainData = XLSX.utils.sheet_to_json(mainSheet, { header: 1, defval: '' });
console.log('Main sheet rows count:', mainData.length);
mainData.slice(0, 20).forEach((row, i) => {
  const nonEmpty = (row || []).filter(c => c !== '');
  if (nonEmpty.length > 0) {
    console.log(`Row ${i + 1}:`, JSON.stringify(row.slice(0, 15)));
  }
});

// Check if there are formulas in any cell in 'رئيسي'
console.log('\nFormulas in "رئيسي":');
let formulaCount = 0;
for (const cell in mainSheet) {
  if (cell[0] === '!') continue;
  if (mainSheet[cell].f) {
    if (formulaCount < 20) {
      console.log(`Cell ${cell}: formula=${mainSheet[cell].f}, value=${mainSheet[cell].v}`);
    }
    formulaCount++;
  }
}
console.log(`Total formulas in "رئيسي": ${formulaCount}`);

// Analyze unique values across all sheets
const statusSet = new Set();
const reasonSet = new Set();
const companySet = new Set();
const stageFields = {
  boq: new Set(),
  filePrep: new Set(),
  review: new Set(),
  sample: new Set(),
  awarding: new Set(),
  approvals: new Set(),
  platformStatus: new Set(),
  contractStatus: new Set(),
  completionCert: new Set()
};

let totalRecordsAcrossAll = 0;

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
  
  // Find column indices
  const getCol = (namePatterns) => {
    return headers.findIndex(h => h && namePatterns.some(p => h.toString().includes(p)));
  };
  
  const compIdx = getCol(['اسم المؤسسة']);
  const statusIdx = getCol(['ملاحظات']);
  const reasonIdx = getCol(['سبب عدم الترسية']);
  const boqIdx = getCol(['جدول الكميات']);
  const prepIdx = getCol(['إعداد الملف', 'اعداد الملف']);
  const reviewIdx = getCol(['المراجعة', 'المراجعه']);
  const sampleIdx = getCol(['تسليم العينة', 'العينة']);
  const awardIdx = getCol(['الترسية']);
  const approvalIdx = getCol(['الاعتمادات']);
  const platformIdx = getCol(['موجودة بالمنصة']);
  const contractIdx = getCol(['حالة العقد']);
  const certIdx = getCol(['شهادة الانجاز', 'شهاده']);

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    if (!row || !row.some(c => c !== '')) continue;
    // verify it's a tender row (has name or ref number or tender code)
    const tenderName = row[3] || row[2] || '';
    if (!tenderName) continue;
    
    totalRecordsAcrossAll++;
    if (compIdx >= 0 && row[compIdx]) companySet.add(row[compIdx].toString().trim());
    if (statusIdx >= 0 && row[statusIdx]) statusSet.add(row[statusIdx].toString().trim());
    if (reasonIdx >= 0 && row[reasonIdx]) reasonSet.add(row[reasonIdx].toString().trim());
    if (boqIdx >= 0 && row[boqIdx]) stageFields.boq.add(row[boqIdx].toString().trim());
    if (prepIdx >= 0 && row[prepIdx]) stageFields.filePrep.add(row[prepIdx].toString().trim());
    if (reviewIdx >= 0 && row[reviewIdx]) stageFields.review.add(row[reviewIdx].toString().trim());
    if (sampleIdx >= 0 && row[sampleIdx]) stageFields.sample.add(row[sampleIdx].toString().trim());
    if (awardIdx >= 0 && row[awardIdx]) stageFields.awarding.add(row[awardIdx].toString().trim());
    if (approvalIdx >= 0 && row[approvalIdx]) stageFields.approvals.add(row[approvalIdx].toString().trim());
    if (platformIdx >= 0 && row[platformIdx]) stageFields.platformStatus.add(row[platformIdx].toString().trim());
    if (contractIdx >= 0 && row[contractIdx]) stageFields.contractStatus.add(row[contractIdx].toString().trim());
    if (certIdx >= 0 && row[certIdx]) stageFields.completionCert.add(row[certIdx].toString().trim());
  }
});

console.log('\n--- Extraction Summary ---');
console.log('Total valid tender records across all sheets:', totalRecordsAcrossAll);
console.log('Companies found:', Array.from(companySet));
console.log('\nStatus values (ملاحظات):', Array.from(statusSet));
console.log('\nRejection reasons (سبب عدم الترسية):', Array.from(reasonSet));
console.log('\nBOQ statuses:', Array.from(stageFields.boq));
console.log('File Prep statuses:', Array.from(stageFields.filePrep));
console.log('Review statuses:', Array.from(stageFields.review));
console.log('Sample delivery statuses:', Array.from(stageFields.sample));
console.log('Awarding statuses:', Array.from(stageFields.awarding));
console.log('Approvals statuses:', Array.from(stageFields.approvals));
console.log('Platform statuses:', Array.from(stageFields.platformStatus));
console.log('Contract statuses:', Array.from(stageFields.contractStatus));
console.log('Completion Cert statuses:', Array.from(stageFields.completionCert));
