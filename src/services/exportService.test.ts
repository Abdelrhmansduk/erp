import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  exportData,
  sanitizeCSVField,
  getActiveCompanyInfo,
  generateExecutiveReportHtml,
  numberToArabicTafqeet,
  resolveConfig,
  calculateReportKpis,
  buildStyledExcelBuffer,
  SECTION_CONFIGS,
} from './exportService';

describe('Executive Export Suite 4.0 & Security Standards', () => {
  it('should sanitize CSV fields to prevent formula injection attacks (=, +, -, @)', () => {
    expect(sanitizeCSVField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCSVField('+cmd|/c calc.exe')).toBe("'+cmd|/c calc.exe");
    expect(sanitizeCSVField('-100')).toBe("'-100");
    expect(sanitizeCSVField('@SUM(1,2)')).toBe("'@SUM(1,2)");
    expect(sanitizeCSVField('Normal Text')).toBe('Normal Text');
    expect(sanitizeCSVField(15000)).toBe('15000');
  });

  it('should safely handle empty data arrays without throwing errors', () => {
    expect(() => {
      exportData('test_empty', [], 'csv');
    }).not.toThrow();
  });

  it('should resolve active company info with corporate fallback', () => {
    const company = getActiveCompanyInfo();
    expect(company).toBeDefined();
    expect(company.nameAr).toBeDefined();
    expect(company.crNumber).toBeDefined();
    expect(company.taxNumber).toBeDefined();
  });

  it('should convert financial amounts into official Saudi Arabic Tafqeet', () => {
    const tafqeet = numberToArabicTafqeet(14500.5);
    expect(tafqeet).toContain('فقط وقدره');
    expect(tafqeet).toContain('أربعة عشر ألفاً وخمسمائة');
    expect(tafqeet).toContain('ريال سعودي');
    expect(tafqeet).toContain('لا غير');
  });

  it('should generate executive HTML in Mobbin Light Mode with SAMA symbol (⃁), ZATCA QR, KPIs, Arabic Tafqeet, and official tripartite signatures', () => {
    const sampleContracts = [
      {
        contract_number: 'SAF-RC-2026-0001',
        musaned_number: 'MSN-998811',
        client_name: 'أحمد محمد السديري',
        client_phone: '0501234567',
        maid_name: 'Maria Santos',
        nationality: 'الفلبين',
        external_office: 'Manila Recruitment Agency',
        stage: 'سداد الرسوم وتفويض إنجاز',
        amount: 14500,
        branch: 'الفرع الرئيسي - الرياض',
      },
    ];

    const html = generateExecutiveReportHtml(
      'contracts',
      sampleContracts,
      'كشف عقود الاستقدام المعتمدة',
      true,
      {
        executiveNote: 'معتمد للصرف والمطابقة الربعية',
        showTafqeet: true,
        showSignatures: true,
        showQrCode: true,
      }
    );

    // Validate core components & Mobbin Light Mode tokens + SAMA symbol (U+20C1)
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('س.ت:');
    expect(html).toContain('الرقم الضريبي:');
    expect(html).toContain('ZATCA & ERP COMPLIANT');
    expect(html).toContain('\u200E\u20C1');
    expect(html).toContain('#141414');
    expect(html).toContain('#ffffff');
    expect(html).toContain('إجمالي السجلات');
    expect(html).toContain('SAF-RC-2026-0001');
    expect(html).toContain('أحمد محمد السديري');
    expect(html).toContain('فقط وقدره');
    expect(html).toContain('معتمد للصرف والمطابقة الربعية');
    expect(html).toContain('إعداد الموظف المختص');
    expect(html).toContain('تدقيق الإدارة المالية');
    expect(html).toContain('اعتماد الإدارة والختم الرسمي');
    expect(html).toContain('SHA256:');
  });

  it('should verify that all 9 departments and specialized sub-modules are registered in SECTION_CONFIGS', () => {
    const requiredKeys = [
      'branches',
      'branch_departments',
      'vouchers',
      'ingaz_delegations',
      'ats_candidates',
      'contracts',
      'iam-security',
      'chart_of_accounts',
      'smacc-gl-tree',
      'smacc_ecommerce_orders',
      'smacc_fixed_assets',
      'smacc_sales_reps',
      'external_offices',
      'whatsapp_inbox',
      'purchase_orders',
      'project_guarantees',
    ];
    requiredKeys.forEach((key) => {
      expect(SECTION_CONFIGS[key]).toBeDefined();
      expect(SECTION_CONFIGS[key].headers.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('should preserve pre-mapped Arabic column keys when passed alongside a known sectionKey', () => {
    const preMappedRows = [
      {
        'رمز الحساب': '110101',
        'اسم الحساب (عربي)': 'مصرف الراجحي - الحساب الجاري',
        'التصنيف المحاسبي': 'الأصول المتداولة',
        'إجمالي المدين (⃁)': '250,000.00 ⃁',
        'إجمالي الدائن (⃁)': '50,000.00 ⃁',
        'الرصيد الصافي (⃁)': '200,000.00 ⃁',
      },
    ];

    const resolved = resolveConfig('smacc-gl-tree', preMappedRows, 'شجرة الحسابات');
    expect(resolved.headers).toEqual([
      'رمز الحساب',
      'اسم الحساب (عربي)',
      'التصنيف المحاسبي',
      'إجمالي المدين (⃁)',
      'إجمالي الدائن (⃁)',
      'الرصيد الصافي (⃁)',
    ]);
    const mappedRow = resolved.dataMapper(preMappedRows[0]);
    expect(mappedRow[0]).toBe('110101');
    expect(mappedRow[1]).toBe('مصرف الراجحي - الحساب الجاري');

    const kpis = calculateReportKpis(resolved.headers, [mappedRow]);
    expect(kpis.hasFinancials).toBe(true);
    expect(kpis.totalAmount).toBeGreaterThan(0);
  });

  it('should support and safely execute all 12 enterprise export formats (Excel, PDF, Word, Print, HTML, PNG, WPS, XML, CSV, TSV, JSON, Markdown)', () => {
    const sampleData = [
      { id: '1', name: 'فرع الرياض', city: 'الرياض', budget: 50000 },
      { id: '2', name: 'فرع الدمام', city: 'الدمام', budget: 35000 },
    ];

    const allFormats = [
      'excel',
      'pdf',
      'csv',
      'print',
      'json',
      'word',
      'xml',
      'html',
      'tsv',
      'markdown',
      'png',
      'wps',
    ] as const;

    allFormats.forEach((fmt) => {
      expect(() => {
        exportData('branches', sampleData, fmt, 'تقرير الفروع الإقليمية');
      }).not.toThrow();
    });
  });

  it('should generate rich OpenXML Excel (.xlsx) buffer with Mobbin #141414 headers, frozen panes, RTL view, and SAMA symbol (⃁) currency format', () => {
    const sampleContracts = [
      {
        contract_number: 'SAF-RC-2026-0001',
        musaned_number: 'MSN-998811',
        client_name: 'أحمد محمد السديري',
        client_phone: '0501234567',
        maid_name: 'Maria Santos',
        nationality: 'الفلبين',
        external_office: 'Manila Recruitment Agency',
        stage: 'سداد الرسوم وتفويض إنجاز',
        amount: '14,500.00 ⃁',
        branch: 'الفرع الرئيسي - الرياض',
      },
      {
        contract_number: 'SAF-RC-2026-0002',
        musaned_number: 'MSN-998812',
        client_name: 'فهد عبد الله العتيبي',
        client_phone: '0559876543',
        maid_name: 'Siti Rahmah',
        nationality: 'إندونيسيا',
        external_office: 'Jakarta Manpower',
        stage: 'إصدار التأشيرة',
        amount: 16200,
        branch: 'فرع جدة',
      },
    ];

    const { buffer: xlsxBytes, fileName } = buildStyledExcelBuffer('contracts', sampleContracts, 'كشف عقود الاستقدام');
    expect(xlsxBytes).toBeInstanceOf(Uint8Array);
    expect(xlsxBytes.byteLength).toBeGreaterThan(1000);
    expect(fileName).toContain('.xlsx');

    const cfb = XLSX.CFB.read(xlsxBytes, { type: 'array' });
    const stylesEntry = XLSX.CFB.find(cfb, 'Root Entry/xl/styles.xml');
    const sheet1Entry = XLSX.CFB.find(cfb, 'Root Entry/xl/worksheets/sheet1.xml');

    expect(stylesEntry).toBeDefined();
    expect(sheet1Entry).toBeDefined();

    const decoder = new TextDecoder('utf-8');
    const stylesXml = decoder.decode(stylesEntry!.content as Uint8Array);
    const sheet1Xml = decoder.decode(sheet1Entry!.content as Uint8Array);

    // Verify Mobbin #141414 Ink Black header fill and SAMA Saudi Riyal symbol (⃁) number format
    expect(stylesXml).toContain('numFmtId="164"');
    expect(stylesXml).toContain('\u20C1');
    expect(stylesXml).toContain('FF141414');
    expect(stylesXml).toContain('FFF3F3F3');

    // Verify RTL worksheet, frozen top 6 header rows, and styled cells
    expect(sheet1Xml).toContain('rightToLeft="1"');
    expect(sheet1Xml).toContain('state="frozen"');
    expect(sheet1Xml).toContain('ySplit="6"');
    expect(sheet1Xml).toContain('s="4"');
    expect(sheet1Xml).toContain('s="7"');
    expect(sheet1Xml).toContain('s="11"');
  });
});
