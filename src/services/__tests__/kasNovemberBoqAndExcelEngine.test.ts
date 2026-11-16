import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { RealBoqEngine } from '../realBoqEngine';
import { kasNovemberWorkbooksService } from '../kasNovemberWorkbooksService';
import {
  SECTION_CONFIGS,
  resolveConfig,
  calculateReportKpis,
  generateExecutiveReportHtml,
} from '../exportService';
import { findAllowedKasEmployee } from '../../config/kasAllowedEmails';
import { authService } from '../authService';

describe('KAS November Workbooks, Establishments Tracker & Live Excel Engine', () => {
  it('loads the 6 active KAS establishments and real November tenders from شهر 11 (نسخة 1..4)', () => {
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const tenders = kasNovemberWorkbooksService.getTenders();
    const workbooks = kasNovemberWorkbooksService.getWorkbooksMeta();

    expect(establishments.length).toBeGreaterThanOrEqual(6);
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

  it('sets Ahmed Al-Bashir job title to مسؤول المنافسات and computes non-zero financial KPIs + live A4 inline editing', () => {
    const bashir = findAllowedKasEmployee('a.albashir.trade@kas.sa');
    expect(bashir).toBeDefined();
    expect(bashir?.nameAr).toBe('احمد جمال احمد البشير');
    expect(bashir?.titleAr).toContain('مسؤول المنافسات');

    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const estCfg = resolveConfig('kas_establishments_tracker', establishments);
    const mappedRows = establishments.map((r) => estCfg.dataMapper(r));
    const kpis = calculateReportKpis(estCfg.headers, mappedRows);

    expect(kpis.hasFinancials).toBe(true);
    expect(kpis.totalAmount).toBeGreaterThan(100000);
    expect(kpis.tafqeetAr).toContain('ريال سعودي');

    const previewHtml = generateExecutiveReportHtml(
      'kas_establishments_tracker',
      establishments,
      'جدول متابعة مؤسسات وشركات كاس للمنافسات (المؤسسات)',
      false,
      {
        embedPreview: true,
        customPreparerName: 'احمد جمال احمد البشير',
        customPreparerRole: 'مسؤول المنافسات — شركة كاس للتجارة والمنافسات',
      }
    );
    expect(previewHtml).toContain('contenteditable="true"');
    expect(previewHtml).toContain('مسؤول المنافسات — شركة كاس للتجارة والمنافسات');
  });

  it('applies active UI theme & entity palette (Corporate Color KAS/Group vs Mobbin Monochrome) and fullCalcOnLoad to BOQ formula workbooks', () => {
    const tenders = kasNovemberWorkbooksService.getTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const sampleTender = tenders[0];
    const decoder = new TextDecoder('utf-8');

    // 1. Corporate Color + KAS Entity Accent
    const kasColorBuf = RealBoqEngine.exportToExcelWithFormulas(
      sampleTender,
      sampleTender.items,
      establishments,
      { uiTheme: 'corporate-color', entityCode: 'KAS' }
    );
    const kasCfb = XLSX.CFB.read(kasColorBuf, { type: 'array' });
    const kasStyles = decoder.decode(XLSX.CFB.find(kasCfb, 'Root Entry/xl/styles.xml')!.content as Uint8Array);
    const kasWbXml = decoder.decode(XLSX.CFB.find(kasCfb, 'Root Entry/xl/workbook.xml')!.content as Uint8Array);
    const kasSheet1 = decoder.decode(XLSX.CFB.find(kasCfb, 'Root Entry/xl/worksheets/sheet1.xml')!.content as Uint8Array);

    expect(kasStyles).toContain('FFB45309'); // KAS Gold header
    expect(kasStyles).toContain('FFFFFBEB'); // KAS Soft Banner
    expect(kasStyles).toContain('FFECFDF5'); // Live Formula highlight fill
    expect(kasStyles).toContain('FF047857'); // Live Formula Emerald font
    expect(kasStyles).toContain('\u20C1'); // SAMA Riyal symbol
    expect(kasWbXml).toContain('fullCalcOnLoad="1"');
    expect(kasSheet1).toContain('rightToLeft="1"');
    expect(kasSheet1).toContain('ySplit="5"');
    expect(kasSheet1).toContain('s="4"'); // Header style
    expect(kasSheet1).toContain('s="13"'); // Formula style

    // Formulas still parse cleanly
    const kasParsedWb = XLSX.read(kasColorBuf, { type: 'array', cellFormula: true });
    expect(kasParsedWb.Sheets[kasParsedWb.SheetNames[0]]['I6']?.f).toBe('F6*G6');
    expect(kasParsedWb.Sheets['المؤسسات']['E2']?.f).toBe('C2+D2');

    // 2. Mobbin Monochrome
    const monoBuf = RealBoqEngine.exportKasMultiSheetWorkbookWithFormulas(
      establishments,
      tenders.slice(0, 2),
      { uiTheme: 'monochrome', entityCode: 'KAS' }
    );
    const monoCfb = XLSX.CFB.read(monoBuf, { type: 'array' });
    const monoStyles = decoder.decode(XLSX.CFB.find(monoCfb, 'Root Entry/xl/styles.xml')!.content as Uint8Array);
    expect(monoStyles).toContain('FF141414');
    expect(monoStyles).toContain('FFF3F3F3');
    expect(monoStyles).not.toContain('FFB45309');
  });

  it('exports Exact Replica Excel (.xlsx) and Rich HTML Clipboard matching شهر11 نسخة 1..4.xlsm and ورقة المؤسسات colors & merges', () => {
    const tenders = kasNovemberWorkbooksService.getTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const sampleTender = tenders[0];
    const decoder = new TextDecoder('utf-8');

    // Verify all 4 workbook copies (نسخة 1..4) are loaded in seed
    for (const wbId of ['nov11_v1', 'nov11_v2', 'nov11_v3', 'nov11_v4']) {
      expect(tenders.some((t) => t.workbookId === wbId)).toBe(true);
    }

    const exactBuf = RealBoqEngine.exportExactReplicaToExcelWithFormulas(
      sampleTender,
      sampleTender.items,
      establishments
    );
    const exactCfb = XLSX.CFB.read(exactBuf, { type: 'array' });
    const exactStyles = decoder.decode(
      XLSX.CFB.find(exactCfb, 'Root Entry/xl/styles.xml')!.content as Uint8Array
    );
    expect(exactStyles).toContain('FF4472C4'); // المؤسسات Royal Blue header
    expect(exactStyles).toContain('FFF8CBAD'); // انتهاء اليوم Soft Pink header
    expect(exactStyles).toContain('FFA9D18E'); // انتهاء بعد اليوم & BOQ Sage Green
    expect(exactStyles).toContain('FF00B0F0'); // الإجمالى & O4 النص Sky Cyan
    expect(exactStyles).toContain('FFD9E1F2'); // المؤسسات Lavender Blue rows
    expect(exactStyles).toContain('FF00CC00'); // BOQ Bright Green
    expect(exactStyles).toContain('FF92D050'); // O3 الجدول Lime Green
    expect(exactStyles).toContain('FF006600'); // Row 106 Dark Green SUBTOTAL

    const estOnlyBuf = RealBoqEngine.exportExactEstablishmentsOnlyExcel(
      establishments,
      tenders
    );
    const estOnlyWb = XLSX.read(estOnlyBuf, { type: 'array', cellFormula: true });
    expect(estOnlyWb.SheetNames).toEqual(['المؤسسات']);
    expect(estOnlyWb.Sheets['المؤسسات']['E2']?.f).toBe('C2+D2');

    const estHtml = RealBoqEngine.formatExactEstablishmentsHtmlTable(establishments);
    expect(estHtml).toContain('#4472C4');
    expect(estHtml).toContain('#F8CBAD');
    expect(estHtml).toContain('#D9E1F2');

    const boqHtml = RealBoqEngine.formatExactBoqHtmlTable(
      sampleTender,
      sampleTender.items
    );
    expect(boqHtml).toContain('#00CC00');
    expect(boqHtml).toContain('#006600');
    expect(boqHtml).toContain(sampleTender.referenceNumber);
  });

  it('synchronizes edits and additions in real time between the Exact Replica section and other KAS sections, and authorizes Ahmed, Hatem, and all KAS staff', () => {
    const events: string[] = [];
    const unsubscribe = kasNovemberWorkbooksService.subscribe((payload) => {
      events.push(payload.source || 'unknown');
    });

    const initialEsts = kasNovemberWorkbooksService.getEstablishments();
    const updatedEsts = initialEsts.map((e, i) =>
      i === 0 ? { ...e, endingToday: 3, endingAfterToday: 5 } : e
    );
    kasNovemberWorkbooksService.saveEstablishments(updatedEsts, 'kas-exact-sheets');

    expect(events).toContain('kas-exact-sheets');
    expect(kasNovemberWorkbooksService.getEstablishments()[0].endingToday).toBe(3);
    expect(kasNovemberWorkbooksService.getEstablishments()[0].endingAfterToday).toBe(5);

    unsubscribe();

    // Verify Ahmed Al-Bashir, Hatem Salman, Mohammed Ismail, Firas Al-Hassan, Galal, Karim are authorized for kas-exact-sheets
    for (const email of [
      'a.albashir.trade@kas.sa',
      'h.salman.trade@kas.sa',
      'm.ismail.trade@kas.sa',
      'f.alhassan.trade@kas.sa',
      'g.ahmed.trade@kas.sa',
      'k.alshennawy.trade@kas.sa',
      'm.alata.trade@kas.sa',
    ]) {
      const emp = findAllowedKasEmployee(email)!;
      expect(emp).toBeDefined();
      const profile = {
        id: emp.id,
        username: emp.username,
        email: emp.email,
        full_name: emp.nameAr,
        role: emp.titleAr,
        department_id: emp.department_id,
        company_id: emp.company_id,
        default_tab: emp.defaultTab,
        default_tab_title: emp.defaultTabTitle,
      };
      expect(authService.isTabAuthorizedForUser(profile as any, 'kas-exact-sheets')).toBe(true);
      expect(authService.isTabAuthorizedForUser(profile as any, 'kas-replica-tables')).toBe(true);
    }
  });
});
