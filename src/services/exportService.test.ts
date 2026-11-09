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
  buildMultiSheetExcelBuffer,
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

  it('should prevent hierarchical 4x double-counting in Chart of Accounts by summing only leaf level rows', () => {
    const headers = ['رمز الحساب', 'اسم الحساب', 'المستوى الشجري', 'الرصيد الحالي (⃁)'];
    const coaRows = [
      ['1', 'الأصول', 'المستوى 1', 100000],
      ['11', 'الأصول المتداولة', 'المستوى 2', 100000],
      ['1101', 'النقدية والبنوك', 'المستوى 3', 100000],
      ['110101', 'مصرف الراجحي', 'المستوى 4', 60000],
      ['110102', 'البنك الأهلي السعودي', 'المستوى 4', 40000],
    ];

    const kpis = calculateReportKpis(headers, coaRows);
    expect(kpis.totalAmount).toBe(100000);
    expect(kpis.columnTotals[3]).toBe(100000);
  });

  it('should prevent subtotal/grand-total double-counting in structured financial statements and omit duplicate footer totals', () => {
    const headers = ['البند في قائمة الدخل', 'الرمز المعياري', 'السنة الحالية (⃁)'];
    const incomeRows = [
      ['1. الإيرادات التشغيلية', 'R-01', 1000000],
      ['2. تكلفة الإيرادات', 'R-02', -600000],
      ['= مجمل الربح (Gross Profit)', 'GP', 400000],
      ['3. المصروفات الإدارية والعمومية', 'R-04', -150000],
      ['=== صافي ربح السنة (Net Profit) ===', 'NET', 250000],
    ];

    const kpis = calculateReportKpis(headers, incomeRows);
    expect(kpis.totalAmount).toBe(250000);
    expect(kpis.columnTotals.every((c) => c === null)).toBe(true);
  });

  it('should not sum running cumulative balance columns (الرصيد التراكمي) in General Ledger exports', () => {
    const headers = ['التاريخ', 'المرجع', 'مدين (⃁)', 'دائن (⃁)', 'الرصيد التراكمي (⃁)'];
    const ledgerRows = [
      ['2026-01-01', 'JV-01', 50000, 0, 50000],
      ['2026-01-05', 'JV-02', 20000, 0, 70000],
      ['2026-01-10', 'JV-03', 0, 10000, 60000],
    ];

    const kpis = calculateReportKpis(headers, ledgerRows);
    expect(kpis.columnTotals[2]).toBe(70000);
    expect(kpis.columnTotals[3]).toBe(10000);
    expect(kpis.columnTotals[4]).toBeNull();
  });

  it('should build a multi-sheet IFRS Excel workbook (.xlsx) with RTL views and frozen headers across all sheets', () => {
    const { buffer, fileName } = buildMultiSheetExcelBuffer('المصنف_المالي_الشامل', [
      {
        sheetName: '1_الإعدادات',
        title: 'الإعدادات العامة',
        headers: ['البند', 'القيمة'],
        rows: [['اسم الشركة', 'شركة سواعدنا للاستقدام']],
      },
      {
        sheetName: '2_ميزان_المراجعة',
        title: 'ميزان المراجعة',
        headers: ['رمز الحساب', 'اسم الحساب', 'مدين (⃁)', 'دائن (⃁)'],
        rows: [
          ['110101', 'مصرف الراجحي', 150000, 0],
          ['310101', 'رأس المال', 0, 150000],
        ],
        includeTotalsRow: true,
      },
    ]);

    expect(fileName).toContain('.xlsx');
    expect(buffer.byteLength).toBeGreaterThan(1500);

    const wb = XLSX.read(buffer, { type: 'array' });
    expect(wb.SheetNames).toEqual(['1_الإعدادات', '2_ميزان_المراجعة']);
  });

  it('should accurately map all 23 HR & Payroll section configs with real HR page record shapes and enforce Mobbin Gallery-White Monochrome styling', () => {
    // 1. Employees (snake_case from HRPage & camelCase from SmaccEmployeesSettingsPage)
    const hrEmp = resolveConfig('employees', [{
      employee_code: 'EMP-01',
      name: 'فارس السليم',
      national_id: '1012345678',
      role: 'مدير العمليات',
      department: 'التشغيل',
      basic_salary: 10000,
      housing_allowance: 2500,
      transport_allowance: 1000,
      salary: 13500,
      status: 'على رأس العمل',
    }]).dataMapper({
      employee_code: 'EMP-01',
      name: 'فارس السليم',
      national_id: '1012345678',
      role: 'مدير العمليات',
      department: 'التشغيل',
      basic_salary: 10000,
      housing_allowance: 2500,
      transport_allowance: 1000,
      salary: 13500,
      status: 'على رأس العمل',
    });
    expect(hrEmp).toEqual([
      'EMP-01',
      'فارس السليم',
      '1012345678',
      'مدير العمليات',
      'التشغيل',
      'فرع الرياض الرئيسي',
      '2024-01-01',
      10000,
      2500,
      1000,
      13500,
      'على رأس العمل',
    ]);

    const smaccEmp = resolveConfig('employees', []).dataMapper({
      id: 'EMP-001',
      name: 'سلمان الدوسري',
      nationalId: '1088776655',
      jobTitle: 'محاسب مالي',
      department: 'المالية',
      basicSalary: 7000,
      housingAllowance: 1750,
      transportAllowance: 750,
      totalSalary: 9500,
      status: 'نشط',
    });
    expect(smaccEmp).toEqual([
      'EMP-001',
      'سلمان الدوسري',
      '1088776655',
      'محاسب مالي',
      'المالية',
      'فرع الرياض الرئيسي',
      '2024-01-01',
      7000,
      1750,
      750,
      9500,
      'نشط',
    ]);

    // 2. Payroll (EmployeePayrollRecord from WpsPayrollEngine)
    const payrollRow = resolveConfig('payroll', []).dataMapper({
      employeeName: 'نورا العتيبي',
      nationalIdOrIqama: '1022334455',
      iban: 'SA4480000000608010167519',
      basicSalary: 8000,
      housingAllowance: 2000,
      transportAllowance: 800,
      otherAllowances: 200,
      gosiDeduction: 975,
      deductions: 0,
      totalDeductionsApplied: 975,
      netSalary: 10025,
    });
    expect(payrollRow[0]).toBe('1022334455');
    expect(payrollRow[1]).toBe('نورا العتيبي');
    expect(payrollRow[4]).toBe('8000.00');
    expect(payrollRow[7]).toBe('975.00');
    expect(payrollRow[8]).toBe('10025.00');

    // 3. Promotions, Signatures, Maids Fleet, Vacations, Advances, Sanctions, Permissions, Rewards
    expect(resolveConfig('hr_promotions', []).dataMapper({
      id: 'PR-01', employee_code: 'EMP-02', employee_name: 'فهد الشمري', previous_job_title: 'محاسب', new_job_title: 'رئيس حسابات',
      previous_salary: 8000, new_salary: 10500, increment_amount: 2500, effective_date: '2026-11-01', status: 'معتمد',
    })).toEqual(['PR-01', 'EMP-02', 'فهد الشمري', 'ترقية استحقاقية وتعديل عقد', 'محاسب', 'رئيس حسابات', 8000, 10500, 2500, '2026-11-01', 'معتمد']);

    expect(resolveConfig('hr_signatures', []).dataMapper({
      employee_code: 'EMP-01', name: 'فارس السليم', national_id: '1012345678', role: 'مدير', department: 'الإدارة',
      hire_date: '2025-01-01', compliance_hash: 'SHA256-99AA', signature_status: 'موقع وموثق بيومترياً',
    })[5]).toBe('موقع وموثق بيومترياً');

    expect(resolveConfig('hr_maids_fleet', []).dataMapper({
      id: 'MD-01', name: 'Mary Grace', nationality: 'الفلبين', job: 'عاملة منزلية',
      iqama: '2455667788', location: 'الرياض', insurance: 'بوبا A', salary: 1500, status: 'تحت الكفالة',
    })).toEqual(['MD-01', 'Mary Grace', 'الفلبين', 'عاملة منزلية', '2455667788', 'الرياض', 'بوبا A', 1500, 'تحت الكفالة']);

    expect(resolveConfig('hr_permissions', []).dataMapper({
      id: 'PRM-01', employee_name: 'خالد القحطاني', date: '2026-11-08',
      permission_type: 'استئذان خاص (ساعتان)', time: '12:00 - 14:00', status: 'معتمد',
    })).toEqual(['PRM-01', 'خالد القحطاني', '2026-11-08', '12:00', '14:00', 2, 'استئذان خاص (ساعتان)', 'معتمد']);

    // 4. HR-Pro / Odoo / BambooHR Suite & Monitoring & Branch Departments
    expect(SECTION_CONFIGS.hr_salary_rules).toBeDefined();
    expect(SECTION_CONFIGS.hr_onboarding_plans).toBeDefined();
    expect(SECTION_CONFIGS.hr_performance_reviews).toBeDefined();
    expect(SECTION_CONFIGS.hr_dependents).toBeDefined();
    expect(SECTION_CONFIGS.employee_mood_logs).toBeDefined();
    expect(SECTION_CONFIGS.employee_telemetry).toBeDefined();
    expect(SECTION_CONFIGS.branch_departments).toBeDefined();

    const moodRow = resolveConfig('employee_mood_logs', []).dataMapper({
      id: 'ML-01', user_name: 'فارس السليم', role: 'مدير', branch: 'الرياض',
      mood: 'thrilled', reason_category: 'team_support', note: 'يوم ممتاز', timestamp: '2026-11-09T08:00:00Z',
    });
    expect(moodRow[4]).toBe('متحمس ومنجز (5/5)');
    expect(moodRow[5]).toBe('تعاون ودعم الفريق والإدارة');

    // Verify zero #0066FF in generated HTML
    const html = generateExecutiveReportHtml('employees', [{
      employee_code: 'EMP-01', name: 'فارس السليم', national_id: '1012345678',
      role: 'مدير', department: 'الإدارة', basic_salary: 10000, housing_allowance: 2500, transport_allowance: 1000, salary: 13500, status: 'نشط',
    }]);
    expect(html).not.toContain('#0066FF');
  });
});
