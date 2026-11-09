import { TrialBalanceEntry, ifrsFinancialEngineService } from './ifrsFinancialEngineService';

// ============================================================================
// 1. UNIFIED LIVE JOURNAL LEDGER LOG & DRILL-DOWN SERVICE
// ============================================================================
export interface LiveJournalLine {
  seq: number;
  erpCode: string;
  accountName: string;
  ifrsCode: string;
  debit: number;
  credit: number;
  costCenter?: string;
}

export interface LiveJournalEntryRecord {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  sourceModule: 'قيد يومية يدوي' | 'سند قبض / صرف' | 'إهلاك أصول IAS 16' | 'إقرار ضريبي / زكوي ZATCA' | 'مخصص ديون IFRS 9' | 'تسوية مساند / رواتب' | 'تعديل رصيد مباشر';
  referenceDoc?: string;
  lines: LiveJournalLine[];
  totalAmount: number;
  createdAt: string;
}

// ============================================================================
// 2. IAS 16 FIXED ASSETS REGISTER & AUTO-DEPRECIATION
// ============================================================================
export interface FixedAssetRecord {
  id: string;
  assetCode: string;
  assetName: string;
  category: 'مباني ومقرات إيواء' | 'أسطول سيارات وحافلات' | 'أجهزة وشبكات تقنية' | 'أثاث وتجهيزات مكتبية';
  assetAccountErpCode: string;
  accumDepAccountErpCode: string;
  ifrsAssetCode: string; // e.g., A-01-02
  ifrsAccumCode: string; // e.g., A-02-01
  purchaseDate: string;
  cost: number;
  salvageValue: number;
  usefulLifeYears: number;
  annualDepRatePct: number;
  openingAccumDep: number;
  costCenter: string;
  location: string;
  status: 'نشط بالخدمة' | 'مهلك بالكامل' | 'تحت الصيانة';
}

// ============================================================================
// 3. IFRS 9 AR / AP AGING & ECL PROVISION MATRIX
// ============================================================================
export interface AgingPartyRecord {
  id: string;
  partyCode: string;
  partyName: string;
  partyType: 'عميل / ذمم مدينة (A-08)' | 'مورد / وكيل خارجي (L-04)';
  ifrsCode: 'A-08' | 'L-04';
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucketOver90: number;
  notes: string;
}

export interface EclBucketRates {
  rate0to30Pct: number;
  rate31to60Pct: number;
  rate61to90Pct: number;
  rateOver90Pct: number;
}

// ============================================================================
// 4. BUDGET VS ACTUAL & COST CENTER VARIANCE
// ============================================================================
export interface BudgetLineItem {
  code: string;
  nameAr: string;
  category: 'إيرادات' | 'مصروفات';
  costCenter: string;
  annualBudget: number;
  notes: string;
}

// ============================================================================
// 5. IFRS FINANCIAL STATEMENT NOTES (1-12) CUSTOM COMMENTARY
// ============================================================================
export interface IfrsNoteDefinition {
  noteNumber: number;
  titleAr: string;
  ifrsRef: string;
  linkedCodes: string[];
  defaultPolicyText: string;
}

export const DEFAULT_IFRS_NOTES_DEFINITIONS: IfrsNoteDefinition[] = [
  {
    noteNumber: 1,
    titleAr: 'المعلومات العامة والكيان القانوني والنشاط التشغيلي',
    ifrsRef: 'IAS 1.138',
    linkedCodes: ['E-01'],
    defaultPolicyText:
      'تعمل الشركة في قطاع الاستقدام وتقديم الخدمات العمالية والتشغيل والإيواء بموجب تراخيص وزارة الموارد البشرية والتنمية الاجتماعية ومنصة مساند المعتمدة في المملكة العربية السعودية.',
  },
  {
    noteNumber: 2,
    titleAr: 'أسس الإعداد والسياسات المحاسبية الهامة والتوافق مع IFRS / SOCPA',
    ifrsRef: 'IAS 1.112 / IFRS 18',
    linkedCodes: [],
    defaultPolicyText:
      'أُعدت هذه القوائم المالية وفقاً للمعايير الدولية للتقرير المالي (IFRS) المعتمدة في المملكة العربية السعودية من قِبل الهيئة السعودية للمراجعين والمحاسبين (SOCPA) وعلى أساس التكلفة التاريخية ومبدأ الاستحقاق المحاسبي.',
  },
  {
    noteNumber: 3,
    titleAr: 'الممتلكات والمباني والمعدات ومجمع الإهلاك (بالصافي)',
    ifrsRef: 'IAS 16.73',
    linkedCodes: ['A-01', 'A-02', 'A-03', 'A-04'],
    defaultPolicyText:
      'تُقاس الممتلكات والمعدات بالتكلفة مطروحاً منها مجمع الإهلاك وأي خسائر انخفاض في القيمة. يُحتسب الإهلاك بطريقة القسط الثابت على مدى الأعمار الإنتاجية المقدرة للأصول.',
  },
  {
    noteNumber: 4,
    titleAr: 'الذمم المدينة التجارية ومخصص الخسائر الائتمانية المتوقعة (ECL)',
    ifrsRef: 'IFRS 9 / IFRS 7',
    linkedCodes: ['A-08'],
    defaultPolicyText:
      'تُثبت الذمم المدينة التجارية بقيمتها القابلة للتحقق بعد خصم مخصص الخسائر الائتمانية المتوقعة (ECL) المحسوب وفق مصفوفة أعمار الديون ومخاطر التحصيل لمعيار IFRS 9.',
  },
  {
    noteNumber: 5,
    titleAr: 'المدفوعات المقدمة والأصول المتداولة الأخرى وأرصدة مساند',
    ifrsRef: 'IAS 1.66',
    linkedCodes: ['A-07', 'A-09'],
    defaultPolicyText:
      'تشمل التأمينات المستردة، الإيجارات المدفوعة مقدماً لمقرات الإيواء، سلف الموظفين، وضريبة القيمة المضافة على المدخلات القابلة للاسترداد.',
  },
  {
    noteNumber: 6,
    titleAr: 'النقد وما في حكمه وأرصدة الحسابات البنكية',
    ifrsRef: 'IAS 7.45',
    linkedCodes: ['A-10'],
    defaultPolicyText:
      'يتكون النقد وما في حكمه من النقد بالصناديق، الحسابات الجارية لدى البنوك المحلية، ومحافظ التحصيل الإلكترونية المتاحة للسحب الفوري دون قيود.',
  },
  {
    noteNumber: 7,
    titleAr: 'رأس المال والاحتياطي النظامي والأرباح المبقاة',
    ifrsRef: 'IAS 1.79 / IAS 1.106',
    linkedCodes: ['E-01', 'E-02', 'E-03', 'E-04', 'O-01'],
    defaultPolicyText:
      'يمثل رأس المال الحصص/الأسهم المدفوعة بالكامل، ويتم تكوين الاحتياطي النظامي وفق نظام الشركات السعودي والنظام الأساسي للشركة.',
  },
  {
    noteNumber: 8,
    titleAr: 'مخصص مكافأة نهاية الخدمة للموظفين والالتزامات غير المتداولة',
    ifrsRef: 'IAS 19 / IFRS 16',
    linkedCodes: ['L-01', 'L-02', 'L-03'],
    defaultPolicyText:
      'يُحتسب التزام مكافأة نهاية الخدمة للموظفين والعمالة وفق أحكام نظام العمل السعودي ومعيار المحاسبة الدولي رقم 19 (منافع الموظفين).',
  },
  {
    noteNumber: 9,
    titleAr: 'الذمم الدائنة التجارية والمستحقات وأمانات عقود مساند',
    ifrsRef: 'IAS 1.69 / IFRS 15',
    linkedCodes: ['L-04', 'L-05', 'L-06', 'L-07', 'L-09'],
    defaultPolicyText:
      'تشمل مستحقات الوكلاء الخارجيين، الموردين، الدفعات المقدمة من العملاء لعقود الاستقدام تحت التنفيذ (التزامات عقود)، والمصروفات المستحقة.',
  },
  {
    noteNumber: 10,
    titleAr: 'مخصص الزكاة الشرعية وضريبة القيمة المضافة (ZATCA)',
    ifrsRef: 'IAS 12 / SOCPA',
    linkedCodes: ['L-08', 'R-09'],
    defaultPolicyText:
      'تخضع الشركة لأنظمة هيئة الزكاة والضريبة والجمارك (ZATCA) في المملكة العربية السعودية، ويُحمّل مخصص الزكاة الشرعية بنسبة 2.5% من الوعاء الزكوي على قائمة الربح أو الخسارة.',
  },
  {
    noteNumber: 11,
    titleAr: 'الإيرادات من العقود مع العملاء وتكلفة الإيرادات المباشرة',
    ifrsRef: 'IFRS 15',
    linkedCodes: ['R-01', 'R-02'],
    defaultPolicyText:
      'يتم الاعتراف بالإيراد عند الوفاء بالتزامات الأداء بموجب عقود الاستقدام والتشغيل الموثقة في منصة مساند، وتُقابل بالتكاليف المباشرة لتذاكر السفر والتأشيرات وعمولات الوكلاء وإعاشة الإيواء.',
  },
  {
    noteNumber: 12,
    titleAr: 'المصروفات البيعية والتسويقية والعمومية والإدارية والإهلاك',
    ifrsRef: 'IAS 1.99 / IFRS 18',
    linkedCodes: ['R-03', 'R-04', 'R-05', 'R-06', 'R-07', 'R-08', 'R-10'],
    defaultPolicyText:
      'تُصنف المصروفات التشغيلية حسب وظيفتها (تكلفة إيرادات، مصروفات بيع وتسويق، مصروفات عمومية وإدارية) مع إفصاح مستقل عن مصروف الإهلاك وتكاليف التمويل.',
  },
];

// ============================================================================
// DEFAULT SEED DATA GENERATORS
// ============================================================================
const getDefaultFixedAssets = (): FixedAssetRecord[] => [
  {
    id: 'fa-1',
    assetCode: 'FA-1001',
    assetName: 'مبنى ومقر مركز الإيواء النموذجي والتشغيل — الرياض',
    category: 'مباني ومقرات إيواء',
    assetAccountErpCode: '12102',
    accumDepAccountErpCode: '12201',
    ifrsAssetCode: 'A-01-02',
    ifrsAccumCode: 'A-02-01',
    purchaseDate: '2023-01-15',
    cost: 1250000,
    salvageValue: 150000,
    usefulLifeYears: 20,
    annualDepRatePct: 5,
    openingAccumDep: 110000,
    costCenter: 'مركز تكلفة الإيواء والتشغيل',
    location: 'الرياض — المقر الرئيسي',
    status: 'نشط بالخدمة',
  },
  {
    id: 'fa-2',
    assetCode: 'FA-1002',
    assetName: 'أسطول حافلات وسيارات نقل الكوادر والعمالة (8 مركبات)',
    category: 'أسطول سيارات وحافلات',
    assetAccountErpCode: '12104',
    accumDepAccountErpCode: '12203',
    ifrsAssetCode: 'A-01-04',
    ifrsAccumCode: 'A-02-03',
    purchaseDate: '2024-03-01',
    cost: 680000,
    salvageValue: 80000,
    usefulLifeYears: 5,
    annualDepRatePct: 20,
    openingAccumDep: 120000,
    costCenter: 'مركز تكلفة الحركة والتنقلات',
    location: 'الرياض / جدة / الدمام',
    status: 'نشط بالخدمة',
  },
  {
    id: 'fa-3',
    assetCode: 'FA-1003',
    assetName: 'خوادم وأنظمة حاسب آلي وشبكات ربط مساند و ZATCA',
    category: 'أجهزة وشبكات تقنية',
    assetAccountErpCode: '12105',
    accumDepAccountErpCode: '12204',
    ifrsAssetCode: 'A-01-05',
    ifrsAccumCode: 'A-02-04',
    purchaseDate: '2024-06-10',
    cost: 240000,
    salvageValue: 15000,
    usefulLifeYears: 4,
    annualDepRatePct: 25,
    openingAccumDep: 56250,
    costCenter: 'مركز تكلفة الإدارة العامة وتقنية المعلومات',
    location: 'الرياض — الإدارة العامة',
    status: 'نشط بالخدمة',
  },
  {
    id: 'fa-4',
    assetCode: 'FA-1004',
    assetName: 'أثاث وتجهيزات مكتبية وغرف تسكين مركز الإيواء (120 سريراً)',
    category: 'أثاث وتجهيزات مكتبية',
    assetAccountErpCode: '12106',
    accumDepAccountErpCode: '12204',
    ifrsAssetCode: 'A-01-06',
    ifrsAccumCode: 'A-02-04',
    purchaseDate: '2024-02-01',
    cost: 320000,
    salvageValue: 20000,
    usefulLifeYears: 6,
    annualDepRatePct: 16.67,
    openingAccumDep: 50000,
    costCenter: 'مركز تكلفة الإيواء والتشغيل',
    location: 'مركز الإيواء — الرياض',
    status: 'نشط بالخدمة',
  },
];

const getDefaultAgingRecords = (): AgingPartyRecord[] => [
  {
    id: 'ag-1',
    partyCode: 'CUST-101',
    partyName: 'محفظة عقود مساند — دفعات تحت التحصيل والضمان',
    partyType: 'عميل / ذمم مدينة (A-08)',
    ifrsCode: 'A-08',
    bucket0to30: 420000,
    bucket31to60: 185000,
    bucket61to90: 95000,
    bucketOver90: 28000,
    notes: 'تخضع لفترة ضمان الـ 90 يوماً في منصة مساند',
  },
  {
    id: 'ag-2',
    partyCode: 'CUST-102',
    partyName: 'عملاء عقود تشغيل الكوادر لقطاع الأعمال (B2B)',
    partyType: 'عميل / ذمم مدينة (A-08)',
    ifrsCode: 'A-08',
    bucket0to30: 310000,
    bucket31to60: 115000,
    bucket61to90: 42000,
    bucketOver90: 15000,
    notes: 'فواتير ضريبية شهرية موثقة ZATCA',
  },
  {
    id: 'ag-3',
    partyCode: 'VEND-201',
    partyName: 'الوكلاء الخارجيون المعتمدون (الفلبين / إندونيسيا / سريلانكا / كينيا)',
    partyType: 'مورد / وكيل خارجي (L-04)',
    ifrsCode: 'L-04',
    bucket0to30: 260000,
    bucket31to60: 140000,
    bucket61to90: 65000,
    bucketOver90: 0,
    notes: 'تُسدد بعد اجتياز الفحص الطبي وإصدار تذكرة الإركاب',
  },
  {
    id: 'ag-4',
    partyCode: 'VEND-202',
    partyName: 'موردو الإعاشة والتموين الطبي والتأمين وشركات الطيران',
    partyType: 'مورد / وكيل خارجي (L-04)',
    ifrsCode: 'L-04',
    bucket0to30: 145000,
    bucket31to60: 55000,
    bucket61to90: 18000,
    bucketOver90: 0,
    notes: 'توريدات دورية لمقر الإيواء والتشغيل',
  },
];

// ============================================================================
// STORAGE KEYS & SERVICE API
// ============================================================================
const JOURNAL_LOG_KEY = 'erp_ifrs_journal_ledger_log_v1_';
const FIXED_ASSETS_KEY = 'erp_ifrs_fixed_assets_v1_';
const AGING_RECORDS_KEY = 'erp_ifrs_aging_records_v1_';
const ECL_RATES_KEY = 'erp_ifrs_ecl_rates_v1_';
const BUDGET_LINES_KEY = 'erp_ifrs_budget_lines_v1_';
const NOTES_TEXT_KEY = 'erp_ifrs_notes_custom_text_v1_';

export const enterpriseAccountingSuiteService = {
  // 1. Journal Log
  getJournalLog(companyId: string): LiveJournalEntryRecord[] {
    try {
      const raw = localStorage.getItem(`${JOURNAL_LOG_KEY}${companyId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'je-seed-1',
        entryNumber: 'JV-2026-001',
        date: '2026-01-15',
        description: 'إثبات إيرادات عقود استقدام مساند المحصلة وضريبة القيمة المضافة 15%',
        sourceModule: 'تسوية مساند / رواتب',
        referenceDoc: 'MUSANED-BATCH-01',
        totalAmount: 172500,
        createdAt: '2026-01-15T10:00:00Z',
        lines: [
          { seq: 1, erpCode: '11102', accountName: 'البنك الأهلي السعودي - حساب جاري رئيسي', ifrsCode: 'A-10', debit: 172500, credit: 0, costCenter: 'مركز تكلفة الاستقدام ومساند' },
          { seq: 150, erpCode: '41101', accountName: 'إيرادات عقود الاستقدام والتشغيل', ifrsCode: 'R-01', debit: 0, credit: 150000, costCenter: 'مركز تكلفة الاستقدام ومساند' },
          { seq: 110, erpCode: '21301', accountName: 'ضريبة القيمة المضافة المستحقة (ZATCA 15%)', ifrsCode: 'L-05', debit: 0, credit: 22500, costCenter: 'مركز تكلفة الإدارة العامة' },
        ],
      },
      {
        id: 'je-seed-2',
        entryNumber: 'JV-2026-002',
        date: '2026-01-31',
        description: 'استحقاق وصرف مسير الرواتب والأجور ومخصص مكافأة نهاية الخدمة (IAS 19)',
        sourceModule: 'تسوية مساند / رواتب',
        referenceDoc: 'WPS-JAN-2026',
        totalAmount: 95000,
        createdAt: '2026-01-31T14:00:00Z',
        lines: [
          { seq: 170, erpCode: '52101', accountName: 'رواتب وأجور وبدلات الكوادر الإدارية والتشغيلية', ifrsCode: 'R-04', debit: 85000, credit: 0, costCenter: 'مركز تكلفة الموارد البشرية' },
          { seq: 175, erpCode: '52108', accountName: 'مصروف مكافأة نهاية الخدمة (IAS 19)', ifrsCode: 'R-04', debit: 10000, credit: 0, costCenter: 'مركز تكلفة الموارد البشرية' },
          { seq: 1, erpCode: '11102', accountName: 'البنك الأهلي السعودي - حساب جاري رئيسي', ifrsCode: 'A-10', debit: 0, credit: 85000, costCenter: 'مركز تكلفة الموارد البشرية' },
          { seq: 95, erpCode: '22201', accountName: 'مخصص مكافأة نهاية الخدمة للموظفين (EOSB)', ifrsCode: 'L-03', debit: 0, credit: 10000, costCenter: 'مركز تكلفة الموارد البشرية' },
        ],
      },
    ];
  },

  saveJournalLog(companyId: string, log: LiveJournalEntryRecord[]): void {
    try {
      localStorage.setItem(`${JOURNAL_LOG_KEY}${companyId}`, JSON.stringify(log));
    } catch {
      // ignore
    }
  },

  /**
   * Posts a multi-line journal entry directly to the live IFRS Trial Balance AND records it in the Journal Log,
   * then dispatches a global browser event so all open financial components update immediately.
   */
  postJournalToLiveTrialBalance(
    companyId: string,
    params: {
      description: string;
      sourceModule: LiveJournalEntryRecord['sourceModule'];
      referenceDoc?: string;
      lines: Array<{
        ifrsTargetCode: string;
        fallbackAccountName: string;
        debit: number;
        credit: number;
        costCenter?: string;
        specificSeq?: number;
      }>;
    }
  ): { updatedEntries: TrialBalanceEntry[]; record: LiveJournalEntryRecord } {
    const currentEntries = ifrsFinancialEngineService.getTrialBalance(companyId as any);
    const updatedEntries = currentEntries.map((r) => ({ ...r }));
    const resolvedLines: LiveJournalLine[] = [];

    params.lines.forEach((line) => {
      if (line.debit <= 0 && line.credit <= 0) return;

      let targetRow = line.specificSeq
        ? updatedEntries.find((r) => r.seq === line.specificSeq)
        : updatedEntries.find(
            (r) =>
              (r.manualCode || '').startsWith(line.ifrsTargetCode) ||
              extractPrefix(r.manualCode || '') === extractPrefix(line.ifrsTargetCode)
          );

      if (!targetRow) {
        // Create a new trial balance account on the fly if none matched
        const nextSeq = updatedEntries.reduce((m, r) => Math.max(m, r.seq), 0) + 1;
        targetRow = {
          seq: nextSeq,
          erpCode: `${nextSeq}01`,
          accountName: line.fallbackAccountName,
          manualCode: line.ifrsTargetCode,
          openingDebit: 0,
          openingCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
        };
        updatedEntries.push(targetRow);
      }

      targetRow.periodDebit = Math.max(0, Math.round((targetRow.periodDebit || 0) + line.debit));
      targetRow.periodCredit = Math.max(0, Math.round((targetRow.periodCredit || 0) + line.credit));

      resolvedLines.push({
        seq: targetRow.seq,
        erpCode: targetRow.erpCode,
        accountName: targetRow.accountName,
        ifrsCode: line.ifrsTargetCode,
        debit: Math.round(line.debit),
        credit: Math.round(line.credit),
        costCenter: line.costCenter || 'الإدارة المالية العامة',
      });
    });

    ifrsFinancialEngineService.saveTrialBalance(companyId as any, updatedEntries);

    const log = this.getJournalLog(companyId);
    const totalAmount = resolvedLines.reduce((s, l) => s + l.debit, 0);
    const record: LiveJournalEntryRecord = {
      id: `je-${Date.now()}`,
      entryNumber: `JV-2026-${String(log.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      description: params.description,
      sourceModule: params.sourceModule,
      referenceDoc: params.referenceDoc || `REF-${Date.now().toString().slice(-5)}`,
      lines: resolvedLines,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    const nextLog = [record, ...log];
    this.saveJournalLog(companyId, nextLog);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-ifrs-live-sync', { detail: { companyId } }));
    }

    return { updatedEntries, record };
  },

  // 2. Fixed Assets
  getFixedAssets(companyId: string): FixedAssetRecord[] {
    try {
      const raw = localStorage.getItem(`${FIXED_ASSETS_KEY}${companyId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getDefaultFixedAssets();
  },

  saveFixedAssets(companyId: string, assets: FixedAssetRecord[]): void {
    try {
      localStorage.setItem(`${FIXED_ASSETS_KEY}${companyId}`, JSON.stringify(assets));
    } catch {
      // ignore
    }
  },

  // 3. Aging & ECL
  getAgingRecords(companyId: string): AgingPartyRecord[] {
    try {
      const raw = localStorage.getItem(`${AGING_RECORDS_KEY}${companyId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getDefaultAgingRecords();
  },

  saveAgingRecords(companyId: string, records: AgingPartyRecord[]): void {
    try {
      localStorage.setItem(`${AGING_RECORDS_KEY}${companyId}`, JSON.stringify(records));
    } catch {
      // ignore
    }
  },

  getEclRates(companyId: string): EclBucketRates {
    try {
      const raw = localStorage.getItem(`${ECL_RATES_KEY}${companyId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {
      rate0to30Pct: 1,
      rate31to60Pct: 5,
      rate61to90Pct: 15,
      rateOver90Pct: 50,
    };
  },

  saveEclRates(companyId: string, rates: EclBucketRates): void {
    try {
      localStorage.setItem(`${ECL_RATES_KEY}${companyId}`, JSON.stringify(rates));
    } catch {
      // ignore
    }
  },

  // 4. Budget Lines
  getBudgetOverrides(companyId: string): Record<string, { budget: number; costCenter: string; notes: string }> {
    try {
      const raw = localStorage.getItem(`${BUDGET_LINES_KEY}${companyId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  },

  saveBudgetOverrides(
    companyId: string,
    overrides: Record<string, { budget: number; costCenter: string; notes: string }>
  ): void {
    try {
      localStorage.setItem(`${BUDGET_LINES_KEY}${companyId}`, JSON.stringify(overrides));
    } catch {
      // ignore
    }
  },

  // 5. Custom Notes Text
  getCustomNotesText(companyId: string): Record<number, string> {
    try {
      const raw = localStorage.getItem(`${NOTES_TEXT_KEY}${companyId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  },

  saveCustomNotesText(companyId: string, map: Record<number, string>): void {
    try {
      localStorage.setItem(`${NOTES_TEXT_KEY}${companyId}`, JSON.stringify(map));
    } catch {
      // ignore
    }
  },
};

function extractPrefix(code: string): string {
  const parts = code.trim().split('-');
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`;
  return code.trim();
}
