import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { RealBoqEngine } from '../realBoqEngine';
import { kasNovemberWorkbooksService } from '../kasNovemberWorkbooksService';
import { SECTION_CONFIGS, resolveConfig } from '../exportService';

describe('KAS November Workbooks, Establishments Tracker & Live Excel Engine', () => {
  it('loads the 7 KAS establishments and real November tenders from شهر 11 (نسخة 1..4)', () => {
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const tenders = kasNovemberWorkbooksService.getTenders();
    const workbooks = kasNovemberWorkbooksService.getWorkbooksMeta();

    expect(establishments.length).toBeGreaterThanOrEqual(7);
    expect(establishments.map((e) => e.name)).toEqual(
      expect.arrayContaining([
        'مؤسسة بنايات ذكية للمقاولات',
        'شركة الاميال للسفر و السياحة',
        'مؤسسة خالد عبدالعزيز السليم للتجارة',
        'شركة كاس ميديا للدعاية والاعلان',
        'شركة كاس تك للاتصالات و تقنية المعلومات',
        'مؤسسة كاس لتنظيم المعارض والمؤتمرات',
      ])
    );

    expect(workbooks.length).toBe(4);
    expect(tenders.length).toBeGreaterThanOrEqual(30);

    const firstTender = tenders[0];
    expect(firstTender.referenceNumber).toBeTruthy();
    expect(firstTender.entityName).toBeTruthy();
    expect(firstTender.items.length).toBeGreaterThan(0);
    expect(firstTender.grandTotal).toBeGreaterThan(0);
    expect(firstTender.grandTotalInWords).toContain('ريال');
  });

  it('exports a single BOQ sheet + المؤسسات sheet with live editable Excel formulas and zero formula errors', () => {
    const tenders = kasNovemberWorkbooksService.getTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const sampleTender = tenders[0];

    const buffer = RealBoqEngine.exportToExcelWithFormulas(
      sampleTender,
      sampleTender.items,
      establishments
    );
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const wb = XLSX.read(buffer, { type: 'array', cellFormula: true });
    expect(wb.SheetNames.length).toBe(2);
    expect(wb.SheetNames).toContain('المؤسسات');

    const boqSheet = wb.Sheets[wb.SheetNames[0]];
    expect(boqSheet['C3']?.v).toBe('اسم المؤسسة : ');
    expect(boqSheet['E3']?.v).toBe(sampleTender.entityName);
    expect(boqSheet['M3']?.v).toBe(sampleTender.referenceNumber);
    expect(boqSheet['O3']?.v).toBe('الجدول');
    expect(boqSheet['O4']?.v).toBe(' النص');

    // Verify live Excel formulas in Row 6
    expect(boqSheet['I6']?.f).toBe('F6*G6');
    expect(boqSheet['K6']?.f).toBe('I6*0.15');
    expect(boqSheet['L6']?.f).toBe('I6*1.15');

    // Verify SUBTOTAL row formulas
    const subtotalRow = 6 + sampleTender.items.length;
    expect(boqSheet[`I${subtotalRow}`]?.f).toContain('SUBTOTAL(109,I6:I');
    expect(boqSheet[`K${subtotalRow}`]?.f).toContain('SUBTOTAL(109,K6:K');
    expect(boqSheet[`L${subtotalRow}`]?.f).toContain('SUBTOTAL(109,L6:L');

    // Verify المؤسسات sheet formulas
    const estSheet = wb.Sheets['المؤسسات'];
    expect(estSheet['B1']?.v).toBe('المؤسسات');
    expect(estSheet['C1']?.v).toBe('انتهاء اليوم');
    expect(estSheet['D1']?.v).toBe('انتهاء بعد اليوم');
    expect(estSheet['E1']?.v).toBe('الإجمالى');
    expect(estSheet['E2']?.f).toBe('C2+D2');
  });

  it('converts a multi-sheet KAS workbook (.xlsx/.xlsm) back into live editable system state', () => {
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const sampleTenders = kasNovemberWorkbooksService.getTenders().slice(0, 4);

    const multiBuffer = RealBoqEngine.exportKasMultiSheetWorkbookWithFormulas(
      establishments,
      sampleTenders
    );
    const parsed = RealBoqEngine.parseKasMultiSheetWorkbook(
      multiBuffer,
      'شهر11_نسخة_اختبار.xlsm'
    );

    expect(parsed.errors).toEqual([]);
    expect(parsed.establishments.length).toBe(establishments.length);
    expect(parsed.tenders.length).toBe(sampleTenders.length);
    expect(parsed.tenders[0].referenceNumber).toBe(sampleTenders[0].referenceNumber);
    expect(parsed.tenders[0].grandTotal).toBeCloseTo(sampleTenders[0].grandTotal, 2);
  });

  it('formats O3 (الجدول) and O4 (النص) macro clipboard outputs accurately', () => {
    const tender = kasNovemberWorkbooksService.getTenders()[0];
    const tableClip = RealBoqEngine.formatKasTableClipboardText(tender, tender.items);
    const textClip = RealBoqEngine.formatKasHeaderSummaryClipboardText(tender, tender.items);

    expect(tableClip).toContain(tender.referenceNumber);
    expect(tableClip).toContain('الرقم التسلسلي\tوصف البند\tوحدة القياس');
    expect(tableClip).toContain('مدة التوريد');

    expect(textClip).toContain(`اسم المؤسسة : ${tender.entityName}`);
    expect(textClip).toContain(`رقم مرجعي : ${tender.referenceNumber}`);
    expect(textClip).toContain('الإجمالي شامل الضريبة');
  });

  it('registers all KAS export schemas in exportService SECTION_CONFIGS', () => {
    expect(SECTION_CONFIGS.kas_boq_items).toBeDefined();
    expect(SECTION_CONFIGS.kas_establishments_tracker).toBeDefined();
    expect(SECTION_CONFIGS.kas_november_tenders).toBeDefined();
    expect(SECTION_CONFIGS.kas_suppliers).toBeDefined();
    expect(SECTION_CONFIGS.kas_monafasat_master).toBeDefined();

    const estCfg = resolveConfig(
      'kas_establishments_tracker',
      kasNovemberWorkbooksService.getEstablishments()
    );
    expect(estCfg.headers).toContain('المؤسسات');
    expect(estCfg.headers).toContain('انتهاء اليوم');
    expect(estCfg.headers).toContain('انتهاء بعد اليوم');
  });
});
