import XLSX from 'xlsx';

const filePath = 'C:/Users/Admin Abdelrhman/.gemini/antigravity-ide/brain/dcee35d8-6343-4621-a343-95e8e527bfd0/scratch/downloaded_sheet.xlsx';
const workbook = XLSX.readFile(filePath);

['رئيسي', 'منافسات عامة', 'تجارة', 'دعاية', 'بنايات', 'أميال', 'تقنية', 'معارض'].forEach(name => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n================ Sheet [${name}] Top 5 non-empty rows ================`);
  let count = 0;
  for (let r = 0; r < data.length && count < 5; r++) {
    const row = data[r] || [];
    if (row.some(c => c !== '')) {
      console.log(`Row ${r + 1}:`, JSON.stringify(row.slice(0, 18)));
      count++;
    }
  }
});
