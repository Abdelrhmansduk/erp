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
import {
  buildThemedEstablishmentsHtml,
  buildThemedBoqTableHtml,
  buildEmbeddedTablesHtmlForShare,
  buildInteractiveStandaloneHtmlDocument,
  buildExactKasCsvContent,
  buildKasStudioPreviewHtml,
  executeKasExactExport,
  composeKasShareMessageText,
  buildSelectedAttachmentsBundle,
  buildMultiAttachmentEmlDraft,
  buildExactReplicaPngFile,
  downloadFilesSequentially,
  dispatchKasEmailWithEmbeddedTablesAndAttachments,
  copyBothKasTablesAsIs,
} from '../kasExactExportAndShareEngine';

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

  it('exports across all formats (Excel, PDF, Word, Interactive HTML with live formulas, CSV with formulas, TSV, JSON, XML, Markdown) in both Original KAS XLSM and Corporate Company themes', async () => {
    const tenders = kasNovemberWorkbooksService.getTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const sampleTender = tenders[0];

    // 1. Interactive HTML with embedded live JS formula engine
    const htmlOriginal = buildInteractiveStandaloneHtmlDocument({
      scope: 'both',
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      theme: 'kas-original-xlsm',
      hideHoldingGroupBrand: true,
    });
    expect(htmlOriginal).toContain('#4472C4');
    expect(htmlOriginal).toContain('#00CC00');
    expect(htmlOriginal).toContain('data-formula="=F6*G6"');
    expect(htmlOriginal).toContain('data-formula="=I6*0.15"');
    expect(htmlOriginal).toContain('data-formula="=I6*1.15"');
    expect(htmlOriginal).toContain('data-formula="=C2+D2"');
    expect(htmlOriginal).toContain('recalcAll');

    // 2. Corporate Company Theme HTML
    const htmlCorporate = buildThemedBoqTableHtml(
      sampleTender,
      sampleTender.items,
      'company-corporate',
      { hideHoldingGroupBrand: true }
    );
    expect(htmlCorporate).toContain('#0F3A60');
    expect(htmlCorporate).toContain('#B45309');

    // 3. CSV with working Excel formulas (=F6*G6, =I6*0.15, =SUBTOTAL, =C2+D2)
    const csvFormulas = buildExactKasCsvContent({
      scope: 'boq',
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      includeFormulas: true,
    });
    expect(csvFormulas).toContain('=F6*G6');
    expect(csvFormulas).toContain('=I6*0.15');
    expect(csvFormulas).toContain('=I6*1.15');
    expect(csvFormulas).toContain('=SUBTOTAL(109,I6:I');

    const estCsvFormulas = buildExactKasCsvContent({
      scope: 'establishments',
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      includeFormulas: true,
    });
    expect(estCsvFormulas).toContain('=C2+D2');

    // 4. Studio A4 Preview HTML (`buildKasStudioPreviewHtml`) matching the new section
    const studioHtml = buildKasStudioPreviewHtml({
      scope: 'both',
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      theme: 'kas-original-xlsm',
      preparerName: 'احمد جمال احمد البشير',
    });
    expect(studioHtml).toContain('kas-studio-selectable-root');
    expect(studioHtml).toContain('KAS_STUDIO_BOQ_ROW_EDIT');
    expect(studioHtml).toContain('KAS_STUDIO_EST_ROW_EDIT');
    expect(studioHtml).toContain('#00CC00');
    expect(studioHtml).toContain('#4472C4');

    // 5. Execute all formats via executeKasExactExport
    for (const fmt of [
      'xlsx',
      'pdf',
      'word',
      'html',
      'csv_formulas',
      'tsv',
      'json',
      'xml',
      'markdown',
    ] as const) {
      const res = await executeKasExactExport({
        format: fmt,
        scope: 'both',
        tender: sampleTender,
        items: sampleTender.items,
        establishments,
        theme: 'kas-original-xlsm',
      });
      expect(res.fileName).toContain('طبق_الأصل');
    }
  });

  it('supports WhatsApp & Email multi-attachment bundling, text section selection, EML generation, Mouse Table Copy, and Modification Audit Log Rollback + Undo-Revert', async () => {
    const tenders = kasNovemberWorkbooksService.getTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const sampleTender = tenders[0];

    // 1. WhatsApp & Email Attachment Bundle + Customizable Text
    const files = await buildSelectedAttachmentsBundle({
      selectedTypes: ['excel_boq', 'pdf_exact', 'word_exact', 'excel_establishments', 'csv_formulas'],
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      theme: 'kas-original-xlsm',
    });
    expect(files.length).toBe(5);
    expect(files[0].name).toContain('.xlsx');

    const msgText = composeKasShareMessageText({
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      options: {
        includeHeaderO4: true,
        includeFinancialSummary: true,
        includeItemsTableO3: true,
        includeTerms111_112: true,
        includeEstablishmentsSummary: true,
        includeAttachmentNamesList: true,
      },
      attachmentNames: files.map((f) => f.name),
    });
    expect(msgText).toContain(sampleTender.referenceNumber);
    expect(msgText).toContain('المستندات والملفات المرفقة مع الرسالة (5)');

    const eml = await buildMultiAttachmentEmlDraft({
      recipientEmail: 'a.albashir.trade@kas.sa',
      subject: `عرض أسعار ${sampleTender.referenceNumber}`,
      messageText: msgText,
      tender: sampleTender,
      items: sampleTender.items,
      establishments,
      theme: 'kas-original-xlsm',
      attachments: files.slice(0, 2),
    });
    expect(eml).toContain('Content-Disposition: attachment');
    expect(eml).toContain('multipart/mixed');

    // 2. Mouse Copy of Both Tables as they are
    const copied = await copyBothKasTablesAsIs({
      establishments,
      tender: sampleTender,
      items: sampleTender.items,
      theme: 'kas-original-xlsm',
    });
    expect(typeof copied).toBe('boolean');

    // 3. Modification Audit Log + Revert (التراجع عن التعديل) + Undo-Revert (زر التراجع عن الإرجاع)
    const estsBefore = kasNovemberWorkbooksService.getEstablishments();
    const oldVal = estsBefore[0].endingToday;
    const modifiedEsts = estsBefore.map((e, idx) =>
      idx === 0 ? { ...e, endingToday: 77 } : e
    );
    kasNovemberWorkbooksService.saveEstablishments(modifiedEsts, {
      actionType: 'edit',
      sourceSection: 'قسم جداول كاس المطابق للأصل',
      targetLabel: `جدول المؤسسات — ${estsBefore[0].name}`,
      actionSummary: 'تعديل اختباري لانتهاء اليوم إلى 77',
    });
    expect(kasNovemberWorkbooksService.getEstablishments()[0].endingToday).toBe(77);

    const logs = kasNovemberWorkbooksService.getModificationLogs();
    expect(logs.length).toBeGreaterThan(0);
    const latestLog = logs[0];
    expect(latestLog.actionSummary).toBe('تعديل اختباري لانتهاء اليوم إلى 77');
    expect(latestLog.reverted).toBe(false);

    // Revert the modification (التراجع عن التعديل)
    const revertedEntry = kasNovemberWorkbooksService.revertModificationById(latestLog.id);
    expect(revertedEntry?.reverted).toBe(true);
    expect(kasNovemberWorkbooksService.getEstablishments()[0].endingToday).toBe(oldVal);

    // Undo the revert (زر التراجع عن الإرجاع — استعادة الإجراء)
    const restoredEntry = kasNovemberWorkbooksService.undoRevertModificationById(latestLog.id);
    expect(restoredEntry?.reverted).toBe(false);
    expect(kasNovemberWorkbooksService.getEstablishments()[0].endingToday).toBe(77);
  });

  it('embeds the exact selected table(s) (Establishments only vs BOQ only vs Multi-Sheet BOQ vs Both) and attaches all selected & uploaded documents in WhatsApp & Email', async () => {
    const tenders = kasNovemberWorkbooksService.getTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const firstTender = tenders[0];
    const secondTender = tenders[1] || tenders[0];

    // 1. Selecting Establishments Table ONLY (`scope = 'establishments'`)
    const estOnlyHtml = buildEmbeddedTablesHtmlForShare({
      scope: 'establishments',
      tender: firstTender,
      items: firstTender.items,
      establishments,
      theme: 'kas-original-xlsm',
      hideHoldingGroupBrand: true,
    });
    expect(estOnlyHtml).toContain('ورقة: المؤسسات');
    expect(estOnlyHtml).toContain('#4472C4');
    expect(estOnlyHtml).not.toContain('الرقم التسلسلي');

    const estOnlyText = composeKasShareMessageText({
      scope: 'establishments',
      tender: firstTender,
      items: firstTender.items,
      establishments,
      options: {
        includeHeaderO4: false,
        includeFinancialSummary: false,
        includeItemsTableO3: false,
        includeTerms111_112: false,
        includeEstablishmentsSummary: true,
        includeAttachmentNamesList: true,
      },
      attachmentNames: ['جدول_المؤسسات_طبق_الأصل.xlsx', 'وثيقة_جدول_المؤسسات_طبق_الأصل.pdf'],
    });
    expect(estOnlyText).toContain('جدول متابعة المؤسسات المضمّن');
    expect(estOnlyText).toContain('الإجمالي الكلي للمؤسسات');
    expect(estOnlyText).toContain('جدول_المؤسسات_طبق_الأصل.xlsx');

    // 2. Selecting Multiple BOQ Tables (`selectedTenders = [firstTender, secondTender]`)
    const multiBoqHtml = buildEmbeddedTablesHtmlForShare({
      scope: 'boq',
      tender: firstTender,
      items: firstTender.items,
      establishments,
      selectedTenders: [firstTender, secondTender],
      theme: 'kas-original-xlsm',
      hideHoldingGroupBrand: true,
    });
    expect(multiBoqHtml).toContain(firstTender.referenceNumber);
    expect(multiBoqHtml).toContain(secondTender.referenceNumber);
    expect(multiBoqHtml).not.toContain('جدول متابعة المؤسسات B1:E9');

    const multiBoqText = composeKasShareMessageText({
      scope: 'boq',
      tender: firstTender,
      items: firstTender.items,
      establishments,
      selectedTenders: [firstTender, secondTender],
      options: {
        includeHeaderO4: true,
        includeFinancialSummary: true,
        includeItemsTableO3: true,
        includeTerms111_112: true,
        includeEstablishmentsSummary: false,
        includeAttachmentNamesList: true,
      },
      attachmentNames: ['الجدول_2_جداول_طبق_الأصل.xlsx'],
    });
    expect(multiBoqText).toContain(firstTender.referenceNumber);
    expect(multiBoqText).toContain(secondTender.referenceNumber);

    // 3. Attachments Bundle with `image_png`, `pdf_exact` (%PDF-1.4), and user-uploaded extra document
    const extraCustomDoc = new File(['custom catalog content'], 'كتالوج_العرض_الفني.pdf', {
      type: 'application/pdf',
    });
    const bundledFiles = await buildSelectedAttachmentsBundle({
      scope: 'both',
      selectedTypes: ['excel_boq', 'excel_establishments', 'pdf_exact', 'image_png', 'word_exact'],
      tender: firstTender,
      items: firstTender.items,
      establishments,
      selectedTenders: [firstTender, secondTender],
      theme: 'kas-original-xlsm',
      hideHoldingGroupBrand: true,
      extraUploadedFiles: [extraCustomDoc],
    });
    expect(bundledFiles.length).toBe(6);
    expect(bundledFiles.some((f) => f.name === 'كتالوج_العرض_الفني.pdf')).toBe(true);
    expect(bundledFiles.some((f) => f.name.endsWith('.png'))).toBe(true);
    const pdfAttachment = bundledFiles.find((f) => f.name.startsWith('وثيقة_') && f.name.endsWith('.pdf'))!;
    expect(pdfAttachment).toBeDefined();
    const pdfHeaderText = new TextDecoder().decode(new Uint8Array(await pdfAttachment.arrayBuffer()).slice(0, 8));
    expect(pdfHeaderText).toContain('%PDF-1.4');

    const pngFile = await buildExactReplicaPngFile({
      scope: 'establishments',
      tender: firstTender,
      items: firstTender.items,
      establishments,
      theme: 'kas-original-xlsm',
    });
    expect(pngFile.name).toContain('.png');

    // 4. Sequential Download & Email Dispatch with Embedded Colored Tables and Attachments
    const downloadedNames = await downloadFilesSequentially(bundledFiles, 0);
    expect(downloadedNames.length).toBe(6);

    const emailDispatchResult = await dispatchKasEmailWithEmbeddedTablesAndAttachments({
      scope: 'both',
      recipientEmail: 'a.albashir.trade@kas.sa',
      subject: 'اختبار تضمين الجداول وإرفاق المستندات',
      messageText: multiBoqText,
      tender: firstTender,
      items: firstTender.items,
      establishments,
      selectedTenders: [firstTender, secondTender],
      theme: 'kas-original-xlsm',
      hideHoldingGroupBrand: true,
      attachments: bundledFiles,
    });
    expect(emailDispatchResult.emlFileName).toContain('.eml');
    expect(emailDispatchResult.attachmentNames).toContain('كتالوج_العرض_الفني.pdf');
  });
});
