/**
 * Extracts all 4 KAS November XLSM Workbooks (شهر11 نسخة 1..4.xlsm)
 * and the Establishments table (المؤسسات) into public/data/kasNovemberBoqWorkbooks.json
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:\\Users\\ALIENWARE\\Downloads\\كاس';
const OUTPUT_JSON = path.join(__dirname, '..', 'public', 'data', 'kasNovemberBoqWorkbooks.json');

const WORKBOOK_FILES = [
  { file: 'شهر11 نسخة 1.xlsm', id: 'nov11_v1', label: 'شهر 11 — نسخة 1' },
  { file: 'شهر11 نسخة 2.xlsm', id: 'nov11_v2', label: 'شهر 11 — نسخة 2' },
  { file: 'شهر11 نسخة 3.xlsm', id: 'nov11_v3', label: 'شهر 11 — نسخة 3' },
  { file: 'شهر11 نسخة 4.xlsm', id: 'nov11_v4', label: 'شهر 11 — نسخة 4' },
];

const DEFAULT_ESTABLISHMENTS = [
  {
    id: 'est-1',
    name: 'مؤسسة بنايات ذكية للمقاولات',
    aliases: ['مؤسسة بنايات ذكية للمقاولات'],
    endingToday: 0,
    endingAfterToday: 0,
  },
  {
    id: 'est-2',
    name: 'شركة الاميال للسفر و السياحة',
    aliases: ['شركة الاميال للسفر و السياحة', 'وكالة الاميال للسفر و السياحة'],
    endingToday: 0,
    endingAfterToday: 0,
  },
  {
    id: 'est-3',
    name: 'مؤسسة أحلى العطلات لتنظيم الرحلات',
    aliases: ['مؤسسة أحلى العطلات لتنظيم الرحلات'],
    endingToday: 0,
    endingAfterToday: 0,
  },
  {
    id: 'est-4',
    name: 'مؤسسة خالد عبدالعزيز السليم للتجارة',
    aliases: ['مؤسسة خالد عبدالعزيز السليم للتجارة', 'مؤسسة خالد السليم للتجارة (كاس)'],
    endingToday: 0,
    endingAfterToday: 0,
  },
  {
    id: 'est-5',
    name: 'شركة كاس ميديا للدعاية والاعلان',
    aliases: ['شركة كاس ميديا للدعاية والاعلان', 'وكالة خالد عبدالعزيز السليم للدعاية والاعلان'],
    endingToday: 0,
    endingAfterToday: 0,
  },
  {
    id: 'est-6',
    name: 'شركة كاس تك للاتصالات و تقنية المعلومات',
    aliases: ['شركة كاس تك للاتصالات و تقنية المعلومات', 'مؤسسة اللمسة الخارقة للاتصالات و تقنية المعلومات'],
    endingToday: 0,
    endingAfterToday: 0,
  },
  {
    id: 'est-7',
    name: 'مؤسسة كاس لتنظيم المعارض والمؤتمرات',
    aliases: ['مؤسسة كاس لتنظيم المعارض والمؤتمرات'],
    endingToday: 0,
    endingAfterToday: 0,
  },
];

function extractAll() {
  const workbooksData = [];
  const allTenders = [];

  for (const wbMeta of WORKBOOK_FILES) {
    const fullPath = path.join(SOURCE_DIR, wbMeta.file);
    if (!fs.existsSync(fullPath)) {
      console.warn('File not found:', fullPath);
      continue;
    }

    const wb = XLSX.readFile(fullPath, { cellFormula: true });
    const sheets = [];

    for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
      const sheetName = wb.SheetNames[sIdx];
      if (sheetName === 'المؤسسات') continue;

      const ws = wb.Sheets[sheetName];
      const orgRaw = ws['E3'] && ws['E3'].v !== undefined ? String(ws['E3'].v).trim() : '';
      const refRaw = ws['M3'] && ws['M3'].v !== undefined ? String(ws['M3'].v).trim() : '';
      const titleRaw = ws['E4'] && ws['E4'].v !== undefined ? String(ws['E4'].v).trim() : '';
      const supplyDurationRaw = ws['E111'] && ws['E111'].v !== undefined ? String(ws['E111'].v).trim() : '';
      const validityDurationRaw = ws['E112'] && ws['E112'].v !== undefined ? String(ws['E112'].v).trim() : '180 يوم';

      const items = [];
      for (let r = 6; r <= 105; r++) {
        const seqVal = ws[`C${r}`] && ws[`C${r}`].v !== undefined ? Number(ws[`C${r}`].v) || (r - 5) : (r - 5);
        const descVal = ws[`D${r}`] && ws[`D${r}`].v !== undefined ? String(ws[`D${r}`].v).trim() : '';
        const unitVal = ws[`E${r}`] && ws[`E${r}`].v !== undefined ? String(ws[`E${r}`].v).trim() : '';
        const qtyVal = ws[`F${r}`] && ws[`F${r}`].v !== undefined && ws[`F${r}`].v !== '' ? Number(ws[`F${r}`].v) || 0 : 0;
        const priceVal = ws[`G${r}`] && ws[`G${r}`].v !== undefined && ws[`G${r}`].v !== '' ? Number(ws[`G${r}`].v) || 0 : 0;
        const unitWordsVal = ws[`H${r}`] && ws[`H${r}`].v !== undefined ? String(ws[`H${r}`].v).trim() : '';
        const totalWordsVal = ws[`J${r}`] && ws[`J${r}`].v !== undefined ? String(ws[`J${r}`].v).trim() : '';
        const totalVatWordsVal = ws[`M${r}`] && ws[`M${r}`].v !== undefined ? String(ws[`M${r}`].v).trim() : '';

        if (descVal || qtyVal > 0 || priceVal > 0) {
          const totalPrice = Number((qtyVal * priceVal).toFixed(2));
          const vat = Number((totalPrice * 0.15).toFixed(2));
          const totalWithVat = Number((totalPrice + vat).toFixed(2));
          items.push({
            itemNumber: items.length + 1,
            originalRow: seqVal,
            description: descVal || `بند رقم ${items.length + 1}`,
            unit: unitVal || 'عدد',
            quantity: qtyVal,
            unitPrice: priceVal,
            unitPriceInWords: unitWordsVal,
            totalPrice,
            totalPriceInWords: totalWordsVal,
            vat,
            totalWithVat,
            totalWithVatInWords: totalVatWordsVal,
          });
        }
      }

      // Skip blank template sheets that have no reference number, no title, and no items
      if (!orgRaw && !refRaw && !titleRaw && items.length === 0) {
        continue;
      }

      const subtotal = Number(items.reduce((s, it) => s + it.totalPrice, 0).toFixed(2));
      const vatAmount = Number((subtotal * 0.15).toFixed(2));
      const grandTotal = Number((subtotal + vatAmount).toFixed(2));

      const subtotalWordsCell = ws['J107'] && ws['J107'].v ? String(ws['J107'].v).trim() : '';
      const vatWordsCell = ws['J108'] && ws['J108'].v ? String(ws['J108'].v).trim() : '';
      const grandWordsCell = ws['J109'] && ws['J109'].v ? String(ws['J109'].v).trim() : '';

      const sheetRecord = {
        id: `KAS-NOV11-${wbMeta.id}-${sIdx}`,
        workbookId: wbMeta.id,
        workbookLabel: wbMeta.label,
        sourceFileName: wbMeta.file,
        sheetName,
        referenceNumber: refRaw || `25113900${String(sIdx).padStart(4, '0')}`,
        entityName: orgRaw || 'مؤسسة خالد عبدالعزيز السليم للتجارة',
        title: titleRaw || `كراسة كميات وأسعار (${sheetName})`,
        supplyDuration: supplyDurationRaw || 'خلال 15 يوم من تاريخ استلام التعميد',
        validityDuration: validityDurationRaw || '180 يوم',
        commitmentDays: parseInt(validityDurationRaw, 10) || 180,
        itemsCount: items.length,
        subtotal,
        subtotalInWords: subtotalWordsCell,
        vatAmount,
        vatInWords: vatWordsCell,
        grandTotal,
        grandTotalInWords: grandWordsCell,
        items,
      };

      sheets.push(sheetRecord);
      allTenders.push(sheetRecord);
    }

    workbooksData.push({
      id: wbMeta.id,
      label: wbMeta.label,
      fileName: wbMeta.file,
      sheetsCount: sheets.length,
    });
  }

  // Compute initial counts per establishment
  const establishments = DEFAULT_ESTABLISHMENTS.map((est) => {
    const matching = allTenders.filter((t) =>
      est.aliases.some((a) => t.entityName.includes(a) || a.includes(t.entityName))
    );
    return {
      ...est,
      endingAfterToday: matching.length,
      totalTenders: matching.length,
      totalValueWithVat: Number(matching.reduce((s, t) => s + t.grandTotal, 0).toFixed(2)),
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    workbooks: workbooksData,
    establishments,
    tendersCount: allTenders.length,
    tenders: allTenders,
  };

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(payload, null, 2), 'utf8');

  // Also write a compact seed file (32 diverse real tenders across the 4 workbooks & 7 establishments) for instant sync load & Vitest
  const seedTenders = [];
  const seenWorkbooks = {};
  for (const t of allTenders) {
    if (t.items && t.items.length > 0 && t.grandTotal > 0) {
      seenWorkbooks[t.workbookId] = (seenWorkbooks[t.workbookId] || 0) + 1;
      if (seenWorkbooks[t.workbookId] <= 8 || seedTenders.length < 32) {
        if (seedTenders.length < 32) {
          seedTenders.push(t);
        }
      }
    }
  }
  const seedOutput = path.join(__dirname, '..', 'src', 'data', 'kasNovemberSeedData.json');
  fs.mkdirSync(path.dirname(seedOutput), { recursive: true });
  fs.writeFileSync(
    seedOutput,
    JSON.stringify(
      {
        workbooks: workbooksData,
        establishments,
        tendersCount: allTenders.length,
        tenders: seedTenders,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Extracted ${allTenders.length} tenders across ${workbooksData.length} workbooks to ${OUTPUT_JSON}`);
  console.log(`Seed file written with ${seedTenders.length} tenders to ${seedOutput}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_JSON).size / 1024).toFixed(1)} KB`);
}

extractAll();
