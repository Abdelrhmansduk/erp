// Auto-generated complete reference data from محرك_IFRS_المؤسسي_النهائي.xlsx (All 19 Sheets)

export interface ExtendedIfrsClassificationItem {
  code: string;
  nameAr: string;
  level: number;
  parentStatementCode: string;
  parentStatementName: string;
  naturalBalance: string;
  ifrsRef: string;
  manualOption: string;
}

export interface ExcelAccountingTreeNode {
  seq: number;
  level: number;
  code: string;
  titleAr: string;
  parentCode: string;
  statementCode: string;
}

export interface ExcelSearchKeywordItem {
  seq: number;
  keyword: string;
  code: string;
  importFieldNum?: number;
  importHeaderKeyword?: string;
}

export interface ArabicCodeGuideItem {
  code: string;
  nameAr: string;
  statementType: string;
  naturalBalance: string;
  manualChoiceLabel: string;
}

export interface GovernanceRuleItem {
  rule: string;
  action: string;
  impact: string;
}

export const EXTENDED_IFRS_CLASSIFICATIONS: ExtendedIfrsClassificationItem[] = [
  {
    "code": "A-01",
    "nameAr": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "level": 2,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01 (ممتلكات وآلات ومعدات (بالتكلفة))"
  },
  {
    "code": "A-01-01",
    "nameAr": "أراضٍ مملوكة",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-01 (أراضٍ مملوكة)"
  },
  {
    "code": "A-01-02",
    "nameAr": "مبانٍ ومنشآت",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-02 (مبانٍ ومنشآت)"
  },
  {
    "code": "A-01-03",
    "nameAr": "آلات ومعدات إنتاج",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-03 (آلات ومعدات إنتاج)"
  },
  {
    "code": "A-01-04",
    "nameAr": "سيارات ومركبات",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-04 (سيارات ومركبات)"
  },
  {
    "code": "A-01-05",
    "nameAr": "أثاث وتجهيزات مكتبية",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-05 (أثاث وتجهيزات مكتبية)"
  },
  {
    "code": "A-01-06",
    "nameAr": "أجهزة حاسب وشبكات",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-06 (أجهزة حاسب وشبكات)"
  },
  {
    "code": "A-01-07",
    "nameAr": "أجهزة ومعدات اتصالات",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-07 (أجهزة ومعدات اتصالات)"
  },
  {
    "code": "A-01-08",
    "nameAr": "أدوات وآلات صغيرة مرسملة",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-08 (أدوات وآلات صغيرة مرسملة)"
  },
  {
    "code": "A-01-09",
    "nameAr": "تحسينات عقارات مستأجرة",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-09 (تحسينات عقارات مستأجرة)"
  },
  {
    "code": "A-01-10",
    "nameAr": "مشروعات رأسمالية تحت التنفيذ",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-10 (مشروعات رأسمالية تحت التنفيذ)"
  },
  {
    "code": "A-01-11",
    "nameAr": "قطع غيار رأسمالية",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-11 (قطع غيار رأسمالية)"
  },
  {
    "code": "A-01-12",
    "nameAr": "معدات مستودعات ومناولة",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-12 (معدات مستودعات ومناولة)"
  },
  {
    "code": "A-01-13",
    "nameAr": "معدات طبية وفنية",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-13 (معدات طبية وفنية)"
  },
  {
    "code": "A-01-14",
    "nameAr": "معدات أمن وسلامة",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-14 (معدات أمن وسلامة)"
  },
  {
    "code": "A-01-15",
    "nameAr": "أصول إنتاجية أخرى",
    "level": 3,
    "parentStatementCode": "A-01",
    "parentStatementName": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16",
    "manualOption": "A-01-15 (أصول إنتاجية أخرى)"
  },
  {
    "code": "A-02",
    "nameAr": "مجمع إهلاك الممتلكات والآلات",
    "level": 2,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02 (مجمع إهلاك الممتلكات والآلات)"
  },
  {
    "code": "A-02-01",
    "nameAr": "مجمع إهلاك المباني",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-01 (مجمع إهلاك المباني)"
  },
  {
    "code": "A-02-02",
    "nameAr": "مجمع إهلاك الآلات",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-02 (مجمع إهلاك الآلات)"
  },
  {
    "code": "A-02-03",
    "nameAr": "مجمع إهلاك السيارات",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-03 (مجمع إهلاك السيارات)"
  },
  {
    "code": "A-02-04",
    "nameAr": "مجمع إهلاك الأثاث",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-04 (مجمع إهلاك الأثاث)"
  },
  {
    "code": "A-02-05",
    "nameAr": "مجمع إهلاك الحواسيب",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-05 (مجمع إهلاك الحواسيب)"
  },
  {
    "code": "A-02-06",
    "nameAr": "مجمع إهلاك التجهيزات",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-06 (مجمع إهلاك التجهيزات)"
  },
  {
    "code": "A-02-07",
    "nameAr": "مجمع إهلاك التحسينات",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-07 (مجمع إهلاك التحسينات)"
  },
  {
    "code": "A-02-08",
    "nameAr": "مجمع إهلاك معدات أخرى",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-08 (مجمع إهلاك معدات أخرى)"
  },
  {
    "code": "A-02-09",
    "nameAr": "خسائر هبوط قيمة أصول ثابتة متراكمة",
    "level": 3,
    "parentStatementCode": "A-02",
    "parentStatementName": "مجمع إهلاك الممتلكات والآلات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 16.43-62",
    "manualOption": "A-02-09 (خسائر هبوط قيمة أصول ثابتة متراكمة)"
  },
  {
    "code": "A-03",
    "nameAr": "أصول غير ملموسة (بالصافي)",
    "level": 2,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03 (أصول غير ملموسة (بالصافي))"
  },
  {
    "code": "A-03-01",
    "nameAr": "برامج وأنظمة مملوكة",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-01 (برامج وأنظمة مملوكة)"
  },
  {
    "code": "A-03-02",
    "nameAr": "تراخيص برمجية مرسملة",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-02 (تراخيص برمجية مرسملة)"
  },
  {
    "code": "A-03-03",
    "nameAr": "تطوير برامج مؤهل للرسملة",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-03 (تطوير برامج مؤهل للرسملة)"
  },
  {
    "code": "A-03-04",
    "nameAr": "براءات اختراع",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-04 (براءات اختراع)"
  },
  {
    "code": "A-03-05",
    "nameAr": "علامات تجارية معترف بها",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-05 (علامات تجارية معترف بها)"
  },
  {
    "code": "A-03-06",
    "nameAr": "حقوق امتياز",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-06 (حقوق امتياز)"
  },
  {
    "code": "A-03-07",
    "nameAr": "علاقات عملاء مقتناة",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-07 (علاقات عملاء مقتناة)"
  },
  {
    "code": "A-03-08",
    "nameAr": "شهرة شراء أعمال",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-08 (شهرة شراء أعمال)"
  },
  {
    "code": "A-03-09",
    "nameAr": "مجمع إطفاء الأصول غير الملموسة",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-09 (مجمع إطفاء الأصول غير الملموسة)"
  },
  {
    "code": "A-03-10",
    "nameAr": "خسائر هبوط قيمة الأصول غير الملموسة",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-10 (خسائر هبوط قيمة الأصول غير الملموسة)"
  },
  {
    "code": "A-03-11",
    "nameAr": "أصول غير ملموسة تحت التطوير",
    "level": 3,
    "parentStatementCode": "A-03",
    "parentStatementName": "أصول غير ملموسة (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 38",
    "manualOption": "A-03-11 (أصول غير ملموسة تحت التطوير)"
  },
  {
    "code": "A-04",
    "nameAr": "استثمارات وأصول مالية طويلة الأجل",
    "level": 2,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04 (استثمارات وأصول مالية طويلة الأجل)"
  },
  {
    "code": "A-04-01",
    "nameAr": "استثمارات في شركات تابعة - قوائم منفصلة",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-01 (استثمارات في شركات تابعة - قوائم منفصلة)"
  },
  {
    "code": "A-04-02",
    "nameAr": "استثمارات في شركات زميلة",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-02 (استثمارات في شركات زميلة)"
  },
  {
    "code": "A-04-03",
    "nameAr": "استثمارات في مشروعات مشتركة",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-03 (استثمارات في مشروعات مشتركة)"
  },
  {
    "code": "A-04-04",
    "nameAr": "استثمارات أدوات ملكية طويلة الأجل",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-04 (استثمارات أدوات ملكية طويلة الأجل)"
  },
  {
    "code": "A-04-05",
    "nameAr": "استثمارات أدوات دين طويلة الأجل",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-05 (استثمارات أدوات دين طويلة الأجل)"
  },
  {
    "code": "A-04-06",
    "nameAr": "استثمارات بالقيمة العادلة عبر الأرباح والخسائر",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-06 (استثمارات بالقيمة العادلة عبر الأرباح والخسائر)"
  },
  {
    "code": "A-04-07",
    "nameAr": "استثمارات بالقيمة العادلة عبر الدخل الشامل",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-07 (استثمارات بالقيمة العادلة عبر الدخل الشامل)"
  },
  {
    "code": "A-04-08",
    "nameAr": "استثمارات بالتكلفة المطفأة",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-08 (استثمارات بالتكلفة المطفأة)"
  },
  {
    "code": "A-04-09",
    "nameAr": "ودائع طويلة الأجل غير معادلة للنقد",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-09 (ودائع طويلة الأجل غير معادلة للنقد)"
  },
  {
    "code": "A-04-10",
    "nameAr": "قروض ممنوحة طويلة الأجل",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-10 (قروض ممنوحة طويلة الأجل)"
  },
  {
    "code": "A-04-11",
    "nameAr": "عقارات استثمارية - تتطلب سياسة عرض منفصلة",
    "level": 3,
    "parentStatementCode": "A-04",
    "parentStatementName": "استثمارات وأصول مالية طويلة الأجل",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IAS 28",
    "manualOption": "A-04-11 (عقارات استثمارية - تتطلب سياسة عرض منفصلة)"
  },
  {
    "code": "A-05",
    "nameAr": "أصول حق الاستخدام (بالصافي)",
    "level": 2,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05 (أصول حق الاستخدام (بالصافي))"
  },
  {
    "code": "A-05-01",
    "nameAr": "حق استخدام مبانٍ ومستودعات",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-01 (حق استخدام مبانٍ ومستودعات)"
  },
  {
    "code": "A-05-02",
    "nameAr": "حق استخدام سيارات",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-02 (حق استخدام سيارات)"
  },
  {
    "code": "A-05-03",
    "nameAr": "حق استخدام آلات ومعدات",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-03 (حق استخدام آلات ومعدات)"
  },
  {
    "code": "A-05-04",
    "nameAr": "حق استخدام أراضٍ",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-04 (حق استخدام أراضٍ)"
  },
  {
    "code": "A-05-05",
    "nameAr": "مجمع إهلاك حق استخدام المباني",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-05 (مجمع إهلاك حق استخدام المباني)"
  },
  {
    "code": "A-05-06",
    "nameAr": "مجمع إهلاك حق استخدام السيارات",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-06 (مجمع إهلاك حق استخدام السيارات)"
  },
  {
    "code": "A-05-07",
    "nameAr": "مجمع إهلاك حقوق استخدام أخرى",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-07 (مجمع إهلاك حقوق استخدام أخرى)"
  },
  {
    "code": "A-05-08",
    "nameAr": "خسائر هبوط قيمة حق الاستخدام",
    "level": 3,
    "parentStatementCode": "A-05",
    "parentStatementName": "أصول حق الاستخدام (بالصافي)",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 16",
    "manualOption": "A-05-08 (خسائر هبوط قيمة حق الاستخدام)"
  },
  {
    "code": "A-06",
    "nameAr": "مخزون",
    "level": 2,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06 (مخزون)"
  },
  {
    "code": "A-06-01",
    "nameAr": "مخزون بضائع جاهزة",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-01 (مخزون بضائع جاهزة)"
  },
  {
    "code": "A-06-02",
    "nameAr": "مواد خام",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-02 (مواد خام)"
  },
  {
    "code": "A-06-03",
    "nameAr": "إنتاج تحت التشغيل",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-03 (إنتاج تحت التشغيل)"
  },
  {
    "code": "A-06-04",
    "nameAr": "منتجات تامة الصنع",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-04 (منتجات تامة الصنع)"
  },
  {
    "code": "A-06-05",
    "nameAr": "مخزون قطع غيار تشغيلية",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-05 (مخزون قطع غيار تشغيلية)"
  },
  {
    "code": "A-06-06",
    "nameAr": "مخزون تغليف وتعبئة",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-06 (مخزون تغليف وتعبئة)"
  },
  {
    "code": "A-06-07",
    "nameAr": "بضاعة بالطريق",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-07 (بضاعة بالطريق)"
  },
  {
    "code": "A-06-08",
    "nameAr": "بضاعة لدى الغير",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-08 (بضاعة لدى الغير)"
  },
  {
    "code": "A-06-09",
    "nameAr": "مخزون فروع ومستودعات",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-09 (مخزون فروع ومستودعات)"
  },
  {
    "code": "A-06-10",
    "nameAr": "مخصص انخفاض قيمة المخزون",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-10 (مخصص انخفاض قيمة المخزون)"
  },
  {
    "code": "A-06-11",
    "nameAr": "فروقات جرد المخزون",
    "level": 3,
    "parentStatementCode": "A-06",
    "parentStatementName": "مخزون",
    "naturalBalance": "D",
    "ifrsRef": "IAS 2",
    "manualOption": "A-06-11 (فروقات جرد المخزون)"
  },
  {
    "code": "A-07",
    "nameAr": "ذمم مدينة تجارية",
    "level": 2,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07 (ذمم مدينة تجارية)"
  },
  {
    "code": "A-07-01",
    "nameAr": "عملاء محليون",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-01 (عملاء محليون)"
  },
  {
    "code": "A-07-02",
    "nameAr": "عملاء خارجيون",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-02 (عملاء خارجيون)"
  },
  {
    "code": "A-07-03",
    "nameAr": "ذمم شركات وحسابات تجارية",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-03 (ذمم شركات وحسابات تجارية)"
  },
  {
    "code": "A-07-04",
    "nameAr": "أوراق قبض تجارية",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-04 (أوراق قبض تجارية)"
  },
  {
    "code": "A-07-05",
    "nameAr": "مستحقات من عقود العملاء",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-05 (مستحقات من عقود العملاء)"
  },
  {
    "code": "A-07-06",
    "nameAr": "إيرادات مفوترة غير محصلة",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-06 (إيرادات مفوترة غير محصلة)"
  },
  {
    "code": "A-07-07",
    "nameAr": "أصول عقود مع العملاء",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-07 (أصول عقود مع العملاء)"
  },
  {
    "code": "A-07-08",
    "nameAr": "شيكات تحت التحصيل",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-08 (شيكات تحت التحصيل)"
  },
  {
    "code": "A-07-09",
    "nameAr": "عمولات مستحقة من العملاء",
    "level": 3,
    "parentStatementCode": "A-07",
    "parentStatementName": "ذمم مدينة تجارية",
    "naturalBalance": "D",
    "ifrsRef": "IFRS 9 / IFRS 15",
    "manualOption": "A-07-09 (عمولات مستحقة من العملاء)"
  },
  {
    "code": "A-08",
    "nameAr": "مخصص خسائر ائتمانية متوقعة",
    "level": 2,
    "parentStatementCode": "A-08",
    "parentStatementName": "مخصص خسائر ائتمانية متوقعة",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9.5.5",
    "manualOption": "A-08 (مخصص خسائر ائتمانية متوقعة)"
  },
  {
    "code": "A-08-01",
    "nameAr": "مخصص خسائر ائتمانية للعملاء",
    "level": 3,
    "parentStatementCode": "A-08",
    "parentStatementName": "مخصص خسائر ائتمانية متوقعة",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9.5.5",
    "manualOption": "A-08-01 (مخصص خسائر ائتمانية للعملاء)"
  },
  {
    "code": "A-08-02",
    "nameAr": "مخصص خسائر ائتمانية لأصول العقود",
    "level": 3,
    "parentStatementCode": "A-08",
    "parentStatementName": "مخصص خسائر ائتمانية متوقعة",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9.5.5",
    "manualOption": "A-08-02 (مخصص خسائر ائتمانية لأصول العقود)"
  },
  {
    "code": "A-08-03",
    "nameAr": "مخصص خسائر ائتمانية لأوراق القبض",
    "level": 3,
    "parentStatementCode": "A-08",
    "parentStatementName": "مخصص خسائر ائتمانية متوقعة",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9.5.5",
    "manualOption": "A-08-03 (مخصص خسائر ائتمانية لأوراق القبض)"
  },
  {
    "code": "A-08-04",
    "nameAr": "مخصص خسائر ائتمانية لذمم أخرى",
    "level": 3,
    "parentStatementCode": "A-08",
    "parentStatementName": "مخصص خسائر ائتمانية متوقعة",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9.5.5",
    "manualOption": "A-08-04 (مخصص خسائر ائتمانية لذمم أخرى)"
  },
  {
    "code": "A-08-05",
    "nameAr": "مخصص خسائر ائتمانية لقروض العملاء",
    "level": 3,
    "parentStatementCode": "A-08",
    "parentStatementName": "مخصص خسائر ائتمانية متوقعة",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9.5.5",
    "manualOption": "A-08-05 (مخصص خسائر ائتمانية لقروض العملاء)"
  },
  {
    "code": "A-09",
    "nameAr": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "level": 2,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09 (مدفوعات مقدمة وأرصدة مدينة أخرى)"
  },
  {
    "code": "A-09-01",
    "nameAr": "مصروفات مدفوعة مقدمًا",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-01 (مصروفات مدفوعة مقدمًا)"
  },
  {
    "code": "A-09-02",
    "nameAr": "إيجارات مدفوعة مقدمًا",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-02 (إيجارات مدفوعة مقدمًا)"
  },
  {
    "code": "A-09-03",
    "nameAr": "تأمين مدفوع مقدمًا",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-03 (تأمين مدفوع مقدمًا)"
  },
  {
    "code": "A-09-04",
    "nameAr": "اشتراكات وخدمات مدفوعة مقدمًا",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-04 (اشتراكات وخدمات مدفوعة مقدمًا)"
  },
  {
    "code": "A-09-05",
    "nameAr": "دفعات مقدمة للموردين",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-05 (دفعات مقدمة للموردين)"
  },
  {
    "code": "A-09-06",
    "nameAr": "عهد وسلف موظفين",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-06 (عهد وسلف موظفين)"
  },
  {
    "code": "A-09-07",
    "nameAr": "ذمم مدينة أخرى",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-07 (ذمم مدينة أخرى)"
  },
  {
    "code": "A-09-08",
    "nameAr": "مستحق من أطراف ذات علاقة - متداول",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-08 (مستحق من أطراف ذات علاقة - متداول)"
  },
  {
    "code": "A-09-09",
    "nameAr": "تأمينات مستردة قصيرة الأجل",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-09 (تأمينات مستردة قصيرة الأجل)"
  },
  {
    "code": "A-09-10",
    "nameAr": "ضريبة قيمة مضافة قابلة للاسترداد",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-10 (ضريبة قيمة مضافة قابلة للاسترداد)"
  },
  {
    "code": "A-09-11",
    "nameAr": "مبالغ ضمان محتجزة مدينة",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-11 (مبالغ ضمان محتجزة مدينة)"
  },
  {
    "code": "A-09-12",
    "nameAr": "إيرادات مستحقة أخرى",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-12 (إيرادات مستحقة أخرى)"
  },
  {
    "code": "A-09-13",
    "nameAr": "تسويات بنكية مدينة",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-13 (تسويات بنكية مدينة)"
  },
  {
    "code": "A-09-14",
    "nameAr": "أرصدة مدينة تحت التسوية",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-14 (أرصدة مدينة تحت التسوية)"
  },
  {
    "code": "A-09-15",
    "nameAr": "سلف عملاء غير تجارية",
    "level": 3,
    "parentStatementCode": "A-09",
    "parentStatementName": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.66",
    "manualOption": "A-09-15 (سلف عملاء غير تجارية)"
  },
  {
    "code": "A-10",
    "nameAr": "نقد وما في حكمه",
    "level": 2,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10 (نقد وما في حكمه)"
  },
  {
    "code": "A-10-01",
    "nameAr": "صندوق نقدي رئيسي",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-01 (صندوق نقدي رئيسي)"
  },
  {
    "code": "A-10-02",
    "nameAr": "عهدة نقدية نثرية",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-02 (عهدة نقدية نثرية)"
  },
  {
    "code": "A-10-03",
    "nameAr": "حساب جاري لدى البنوك",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-03 (حساب جاري لدى البنوك)"
  },
  {
    "code": "A-10-04",
    "nameAr": "حسابات توفير تحت الطلب",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-04 (حسابات توفير تحت الطلب)"
  },
  {
    "code": "A-10-05",
    "nameAr": "ودائع قصيرة معادلة للنقد",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-05 (ودائع قصيرة معادلة للنقد)"
  },
  {
    "code": "A-10-06",
    "nameAr": "نقد لدى أمناء الصناديق",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-06 (نقد لدى أمناء الصناديق)"
  },
  {
    "code": "A-10-07",
    "nameAr": "نقد قيد الإيداع",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-07 (نقد قيد الإيداع)"
  },
  {
    "code": "A-10-08",
    "nameAr": "حسابات بنكية تشغيلية",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-08 (حسابات بنكية تشغيلية)"
  },
  {
    "code": "A-10-09",
    "nameAr": "حسابات بنكية بالعملات الأجنبية - معادلة محولة",
    "level": 3,
    "parentStatementCode": "A-10",
    "parentStatementName": "نقد وما في حكمه",
    "naturalBalance": "D",
    "ifrsRef": "IAS 7.6-8",
    "manualOption": "A-10-09 (حسابات بنكية بالعملات الأجنبية - معادلة محولة)"
  },
  {
    "code": "L-01",
    "nameAr": "قروض طويلة الأجل",
    "level": 2,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01 (قروض طويلة الأجل)"
  },
  {
    "code": "L-01-01",
    "nameAr": "قروض بنكية غير متداولة",
    "level": 3,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01-01 (قروض بنكية غير متداولة)"
  },
  {
    "code": "L-01-02",
    "nameAr": "صكوك وسندات مستحقة طويلة الأجل",
    "level": 3,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01-02 (صكوك وسندات مستحقة طويلة الأجل)"
  },
  {
    "code": "L-01-03",
    "nameAr": "قروض من مساهمين غير متداولة",
    "level": 3,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01-03 (قروض من مساهمين غير متداولة)"
  },
  {
    "code": "L-01-04",
    "nameAr": "تمويل مرابحة طويل الأجل",
    "level": 3,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01-04 (تمويل مرابحة طويل الأجل)"
  },
  {
    "code": "L-01-05",
    "nameAr": "قروض مؤسسات تمويل طويلة الأجل",
    "level": 3,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01-05 (قروض مؤسسات تمويل طويلة الأجل)"
  },
  {
    "code": "L-01-06",
    "nameAr": "التزامات تمويل طويلة الأجل أخرى",
    "level": 3,
    "parentStatementCode": "L-01",
    "parentStatementName": "قروض طويلة الأجل",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 1.69",
    "manualOption": "L-01-06 (التزامات تمويل طويلة الأجل أخرى)"
  },
  {
    "code": "L-02",
    "nameAr": "التزامات عقود الإيجار",
    "level": 2,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02 (التزامات عقود الإيجار)"
  },
  {
    "code": "L-02-01",
    "nameAr": "التزامات إيجار مبانٍ",
    "level": 3,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02-01 (التزامات إيجار مبانٍ)"
  },
  {
    "code": "L-02-02",
    "nameAr": "التزامات إيجار سيارات",
    "level": 3,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02-02 (التزامات إيجار سيارات)"
  },
  {
    "code": "L-02-03",
    "nameAr": "التزامات إيجار آلات",
    "level": 3,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02-03 (التزامات إيجار آلات)"
  },
  {
    "code": "L-02-04",
    "nameAr": "التزامات إيجار معدات",
    "level": 3,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02-04 (التزامات إيجار معدات)"
  },
  {
    "code": "L-02-05",
    "nameAr": "التزامات إيجار متداولة - تحتاج فصل إفصاح",
    "level": 3,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02-05 (التزامات إيجار متداولة - تحتاج فصل إفصاح)"
  },
  {
    "code": "L-02-06",
    "nameAr": "التزامات إيجار غير متداولة - تحتاج فصل إفصاح",
    "level": 3,
    "parentStatementCode": "L-02",
    "parentStatementName": "التزامات عقود الإيجار",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 16",
    "manualOption": "L-02-06 (التزامات إيجار غير متداولة - تحتاج فصل إفصاح)"
  },
  {
    "code": "L-03",
    "nameAr": "مكافأة نهاية الخدمة",
    "level": 2,
    "parentStatementCode": "L-03",
    "parentStatementName": "مكافأة نهاية الخدمة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 19",
    "manualOption": "L-03 (مكافأة نهاية الخدمة)"
  },
  {
    "code": "L-03-01",
    "nameAr": "التزام منافع نهاية الخدمة",
    "level": 3,
    "parentStatementCode": "L-03",
    "parentStatementName": "مكافأة نهاية الخدمة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 19",
    "manualOption": "L-03-01 (التزام منافع نهاية الخدمة)"
  },
  {
    "code": "L-03-02",
    "nameAr": "مخصص منافع خدمة محددة",
    "level": 3,
    "parentStatementCode": "L-03",
    "parentStatementName": "مكافأة نهاية الخدمة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 19",
    "manualOption": "L-03-02 (مخصص منافع خدمة محددة)"
  },
  {
    "code": "L-03-03",
    "nameAr": "التزامات منافع موظفين طويلة الأجل",
    "level": 3,
    "parentStatementCode": "L-03",
    "parentStatementName": "مكافأة نهاية الخدمة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 19",
    "manualOption": "L-03-03 (التزامات منافع موظفين طويلة الأجل)"
  },
  {
    "code": "L-03-04",
    "nameAr": "فروق قياس التزامات منافع الموظفين",
    "level": 3,
    "parentStatementCode": "L-03",
    "parentStatementName": "مكافأة نهاية الخدمة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 19",
    "manualOption": "L-03-04 (فروق قياس التزامات منافع الموظفين)"
  },
  {
    "code": "L-04",
    "nameAr": "ذمم دائنة تجارية",
    "level": 2,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04 (ذمم دائنة تجارية)"
  },
  {
    "code": "L-04-01",
    "nameAr": "موردون محليون",
    "level": 3,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04-01 (موردون محليون)"
  },
  {
    "code": "L-04-02",
    "nameAr": "موردون أجانب",
    "level": 3,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04-02 (موردون أجانب)"
  },
  {
    "code": "L-04-03",
    "nameAr": "أوراق دفع تجارية",
    "level": 3,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04-03 (أوراق دفع تجارية)"
  },
  {
    "code": "L-04-04",
    "nameAr": "موردون أطراف ذات علاقة تجاريون",
    "level": 3,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04-04 (موردون أطراف ذات علاقة تجاريون)"
  },
  {
    "code": "L-04-05",
    "nameAr": "فواتير موردين مستحقة الدفع",
    "level": 3,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04-05 (فواتير موردين مستحقة الدفع)"
  },
  {
    "code": "L-04-06",
    "nameAr": "ذمم دائنة مقابل خدمات",
    "level": 3,
    "parentStatementCode": "L-04",
    "parentStatementName": "ذمم دائنة تجارية",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.69 / IFRS 9",
    "manualOption": "L-04-06 (ذمم دائنة مقابل خدمات)"
  },
  {
    "code": "L-05",
    "nameAr": "مستحقات وأرصدة دائنة أخرى",
    "level": 2,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05 (مستحقات وأرصدة دائنة أخرى)"
  },
  {
    "code": "L-05-01",
    "nameAr": "رواتب وأجور مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-01 (رواتب وأجور مستحقة)"
  },
  {
    "code": "L-05-02",
    "nameAr": "حوافز وعمولات مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-02 (حوافز وعمولات مستحقة)"
  },
  {
    "code": "L-05-03",
    "nameAr": "إجازات موظفين مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-03 (إجازات موظفين مستحقة)"
  },
  {
    "code": "L-05-04",
    "nameAr": "مصروفات تشغيلية مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-04 (مصروفات تشغيلية مستحقة)"
  },
  {
    "code": "L-05-05",
    "nameAr": "إيجارات مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-05 (إيجارات مستحقة)"
  },
  {
    "code": "L-05-06",
    "nameAr": "إيرادات مؤجلة من العملاء",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-06 (إيرادات مؤجلة من العملاء)"
  },
  {
    "code": "L-05-07",
    "nameAr": "التزامات عقود مع العملاء",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-07 (التزامات عقود مع العملاء)"
  },
  {
    "code": "L-05-08",
    "nameAr": "دفعات مقدمة من العملاء",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-08 (دفعات مقدمة من العملاء)"
  },
  {
    "code": "L-05-09",
    "nameAr": "ضريبة قيمة مضافة مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-09 (ضريبة قيمة مضافة مستحقة)"
  },
  {
    "code": "L-05-10",
    "nameAr": "تأمينات اجتماعية مستحقة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-10 (تأمينات اجتماعية مستحقة)"
  },
  {
    "code": "L-05-11",
    "nameAr": "مستحقات للجهات الحكومية",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-11 (مستحقات للجهات الحكومية)"
  },
  {
    "code": "L-05-12",
    "nameAr": "أرصدة دائنة أخرى",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-12 (أرصدة دائنة أخرى)"
  },
  {
    "code": "L-05-13",
    "nameAr": "حسابات معلقة دائنة",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-13 (حسابات معلقة دائنة)"
  },
  {
    "code": "L-05-14",
    "nameAr": "ودائع ضمان مستلمة من العملاء",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-14 (ودائع ضمان مستلمة من العملاء)"
  },
  {
    "code": "L-05-15",
    "nameAr": "التزامات استرداد للعميل",
    "level": 3,
    "parentStatementCode": "L-05",
    "parentStatementName": "مستحقات وأرصدة دائنة أخرى",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.69",
    "manualOption": "L-05-15 (التزامات استرداد للعميل)"
  },
  {
    "code": "L-06",
    "nameAr": "قروض قصيرة الأجل وتسهيلات",
    "level": 2,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06 (قروض قصيرة الأجل وتسهيلات)"
  },
  {
    "code": "L-06-01",
    "nameAr": "تسهيلات سحب على المكشوف",
    "level": 3,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06-01 (تسهيلات سحب على المكشوف)"
  },
  {
    "code": "L-06-02",
    "nameAr": "قروض بنكية متداولة",
    "level": 3,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06-02 (قروض بنكية متداولة)"
  },
  {
    "code": "L-06-03",
    "nameAr": "تمويل مرابحة قصير الأجل",
    "level": 3,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06-03 (تمويل مرابحة قصير الأجل)"
  },
  {
    "code": "L-06-04",
    "nameAr": "الجزء المتداول من القروض طويلة الأجل",
    "level": 3,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06-04 (الجزء المتداول من القروض طويلة الأجل)"
  },
  {
    "code": "L-06-05",
    "nameAr": "قروض مساهمين قصيرة الأجل",
    "level": 3,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06-05 (قروض مساهمين قصيرة الأجل)"
  },
  {
    "code": "L-06-06",
    "nameAr": "التزامات تمويل قصيرة الأجل أخرى",
    "level": 3,
    "parentStatementCode": "L-06",
    "parentStatementName": "قروض قصيرة الأجل وتسهيلات",
    "naturalBalance": "C",
    "ifrsRef": "IFRS 9 / IAS 7.8",
    "manualOption": "L-06-06 (التزامات تمويل قصيرة الأجل أخرى)"
  },
  {
    "code": "L-07",
    "nameAr": "مخصصات أخرى",
    "level": 2,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07 (مخصصات أخرى)"
  },
  {
    "code": "L-07-01",
    "nameAr": "مخصص قضايا ومطالبات",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-01 (مخصص قضايا ومطالبات)"
  },
  {
    "code": "L-07-02",
    "nameAr": "مخصص ضمان منتجات",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-02 (مخصص ضمان منتجات)"
  },
  {
    "code": "L-07-03",
    "nameAr": "مخصص عقود خاسرة",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-03 (مخصص عقود خاسرة)"
  },
  {
    "code": "L-07-04",
    "nameAr": "مخصص إعادة هيكلة",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-04 (مخصص إعادة هيكلة)"
  },
  {
    "code": "L-07-05",
    "nameAr": "مخصص إزالة وإعادة تأهيل",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-05 (مخصص إزالة وإعادة تأهيل)"
  },
  {
    "code": "L-07-06",
    "nameAr": "مخصصات التزامات محتملة مرجحة",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-06 (مخصصات التزامات محتملة مرجحة)"
  },
  {
    "code": "L-07-07",
    "nameAr": "مخصص صيانة وضمانات تشغيلية",
    "level": 3,
    "parentStatementCode": "L-07",
    "parentStatementName": "مخصصات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 37",
    "manualOption": "L-07-07 (مخصص صيانة وضمانات تشغيلية)"
  },
  {
    "code": "L-08",
    "nameAr": "زكاة وضريبة دخل مستحقة",
    "level": 2,
    "parentStatementCode": "L-08",
    "parentStatementName": "زكاة وضريبة دخل مستحقة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "L-08 (زكاة وضريبة دخل مستحقة)"
  },
  {
    "code": "L-08-01",
    "nameAr": "زكاة مستحقة السداد",
    "level": 3,
    "parentStatementCode": "L-08",
    "parentStatementName": "زكاة وضريبة دخل مستحقة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "L-08-01 (زكاة مستحقة السداد)"
  },
  {
    "code": "L-08-02",
    "nameAr": "ضريبة دخل جارية مستحقة",
    "level": 3,
    "parentStatementCode": "L-08",
    "parentStatementName": "زكاة وضريبة دخل مستحقة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "L-08-02 (ضريبة دخل جارية مستحقة)"
  },
  {
    "code": "L-08-03",
    "nameAr": "ضريبة دخل مؤجلة - الالتزام",
    "level": 3,
    "parentStatementCode": "L-08",
    "parentStatementName": "زكاة وضريبة دخل مستحقة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "L-08-03 (ضريبة دخل مؤجلة - الالتزام)"
  },
  {
    "code": "L-08-04",
    "nameAr": "مستحقات ضريبية مرتبطة بالدخل",
    "level": 3,
    "parentStatementCode": "L-08",
    "parentStatementName": "زكاة وضريبة دخل مستحقة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "L-08-04 (مستحقات ضريبية مرتبطة بالدخل)"
  },
  {
    "code": "L-09",
    "nameAr": "مستحق لأطراف ذات علاقة",
    "level": 2,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09 (مستحق لأطراف ذات علاقة)"
  },
  {
    "code": "L-09-01",
    "nameAr": "مستحق للشركة الأم",
    "level": 3,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09-01 (مستحق للشركة الأم)"
  },
  {
    "code": "L-09-02",
    "nameAr": "مستحق لشركة تابعة",
    "level": 3,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09-02 (مستحق لشركة تابعة)"
  },
  {
    "code": "L-09-03",
    "nameAr": "مستحق لشركة شقيقة",
    "level": 3,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09-03 (مستحق لشركة شقيقة)"
  },
  {
    "code": "L-09-04",
    "nameAr": "مستحق لشركاء ومساهمين",
    "level": 3,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09-04 (مستحق لشركاء ومساهمين)"
  },
  {
    "code": "L-09-05",
    "nameAr": "تمويل مستحق لأطراف ذات علاقة",
    "level": 3,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09-05 (تمويل مستحق لأطراف ذات علاقة)"
  },
  {
    "code": "L-09-06",
    "nameAr": "أرصدة دائنة بين شركات المجموعة",
    "level": 3,
    "parentStatementCode": "L-09",
    "parentStatementName": "مستحق لأطراف ذات علاقة",
    "naturalBalance": "-",
    "ifrsRef": "IAS 24",
    "manualOption": "L-09-06 (أرصدة دائنة بين شركات المجموعة)"
  },
  {
    "code": "E-01",
    "nameAr": "رأس المال",
    "level": 2,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01 (رأس المال)"
  },
  {
    "code": "E-01-01",
    "nameAr": "رأس مال مدفوع",
    "level": 3,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01-01 (رأس مال مدفوع)"
  },
  {
    "code": "E-01-02",
    "nameAr": "رأس مال غير مدفوع - يتطلب عرض مناسب",
    "level": 3,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01-02 (رأس مال غير مدفوع - يتطلب عرض مناسب)"
  },
  {
    "code": "E-01-03",
    "nameAr": "حصص الشركاء",
    "level": 3,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01-03 (حصص الشركاء)"
  },
  {
    "code": "E-01-04",
    "nameAr": "أسهم عادية مصنفة حقوق ملكية",
    "level": 3,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01-04 (أسهم عادية مصنفة حقوق ملكية)"
  },
  {
    "code": "E-01-05",
    "nameAr": "علاوة إصدار أسهم",
    "level": 3,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01-05 (علاوة إصدار أسهم)"
  },
  {
    "code": "E-01-06",
    "nameAr": "حسابات مساهمات رأسمالية",
    "level": 3,
    "parentStatementCode": "E-01",
    "parentStatementName": "رأس المال",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.78 / IAS 32",
    "manualOption": "E-01-06 (حسابات مساهمات رأسمالية)"
  },
  {
    "code": "E-02",
    "nameAr": "احتياطيات",
    "level": 2,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02 (احتياطيات)"
  },
  {
    "code": "E-02-01",
    "nameAr": "احتياطي نظامي",
    "level": 3,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02-01 (احتياطي نظامي)"
  },
  {
    "code": "E-02-02",
    "nameAr": "احتياطي اتفاقي",
    "level": 3,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02-02 (احتياطي اتفاقي)"
  },
  {
    "code": "E-02-03",
    "nameAr": "احتياطي عام",
    "level": 3,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02-03 (احتياطي عام)"
  },
  {
    "code": "E-02-04",
    "nameAr": "احتياطي إعادة تقييم ضمن حقوق الملكية",
    "level": 3,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02-04 (احتياطي إعادة تقييم ضمن حقوق الملكية)"
  },
  {
    "code": "E-02-05",
    "nameAr": "احتياطي ترجمة عملات أجنبية",
    "level": 3,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02-05 (احتياطي ترجمة عملات أجنبية)"
  },
  {
    "code": "E-02-06",
    "nameAr": "احتياطيات رأس مالية أخرى",
    "level": 3,
    "parentStatementCode": "E-02",
    "parentStatementName": "احتياطيات",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.79",
    "manualOption": "E-02-06 (احتياطيات رأس مالية أخرى)"
  },
  {
    "code": "E-03",
    "nameAr": "أرباح مبقاة (خسائر متراكمة)",
    "level": 2,
    "parentStatementCode": "E-03",
    "parentStatementName": "أرباح مبقاة (خسائر متراكمة)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.106",
    "manualOption": "E-03 (أرباح مبقاة (خسائر متراكمة))"
  },
  {
    "code": "E-03-01",
    "nameAr": "أرباح مبقاة أول المدة",
    "level": 3,
    "parentStatementCode": "E-03",
    "parentStatementName": "أرباح مبقاة (خسائر متراكمة)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.106",
    "manualOption": "E-03-01 (أرباح مبقاة أول المدة)"
  },
  {
    "code": "E-03-02",
    "nameAr": "خسائر متراكمة",
    "level": 3,
    "parentStatementCode": "E-03",
    "parentStatementName": "أرباح مبقاة (خسائر متراكمة)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.106",
    "manualOption": "E-03-02 (خسائر متراكمة)"
  },
  {
    "code": "E-03-03",
    "nameAr": "تسويات سنوات سابقة معتمدة",
    "level": 3,
    "parentStatementCode": "E-03",
    "parentStatementName": "أرباح مبقاة (خسائر متراكمة)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.106",
    "manualOption": "E-03-03 (تسويات سنوات سابقة معتمدة)"
  },
  {
    "code": "E-03-04",
    "nameAr": "أرباح مرحلة",
    "level": 3,
    "parentStatementCode": "E-03",
    "parentStatementName": "أرباح مبقاة (خسائر متراكمة)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.106",
    "manualOption": "E-03-04 (أرباح مرحلة)"
  },
  {
    "code": "E-03-05",
    "nameAr": "حسابات إقفال نتائج الأعمال",
    "level": 3,
    "parentStatementCode": "E-03",
    "parentStatementName": "أرباح مبقاة (خسائر متراكمة)",
    "naturalBalance": "-",
    "ifrsRef": "IAS 1.106",
    "manualOption": "E-03-05 (حسابات إقفال نتائج الأعمال)"
  },
  {
    "code": "E-04",
    "nameAr": "توزيعات ومسحوبات السنة",
    "level": 2,
    "parentStatementCode": "E-04",
    "parentStatementName": "توزيعات ومسحوبات السنة",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.107",
    "manualOption": "E-04 (توزيعات ومسحوبات السنة)"
  },
  {
    "code": "E-04-01",
    "nameAr": "توزيعات أرباح معلنة على حقوق الملكية",
    "level": 3,
    "parentStatementCode": "E-04",
    "parentStatementName": "توزيعات ومسحوبات السنة",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.107",
    "manualOption": "E-04-01 (توزيعات أرباح معلنة على حقوق الملكية)"
  },
  {
    "code": "E-04-02",
    "nameAr": "مسحوبات شركاء",
    "level": 3,
    "parentStatementCode": "E-04",
    "parentStatementName": "توزيعات ومسحوبات السنة",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.107",
    "manualOption": "E-04-02 (مسحوبات شركاء)"
  },
  {
    "code": "E-04-03",
    "nameAr": "توزيعات نقدية على الشركاء",
    "level": 3,
    "parentStatementCode": "E-04",
    "parentStatementName": "توزيعات ومسحوبات السنة",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.107",
    "manualOption": "E-04-03 (توزيعات نقدية على الشركاء)"
  },
  {
    "code": "E-04-04",
    "nameAr": "توزيعات عينية على المساهمين",
    "level": 3,
    "parentStatementCode": "E-04",
    "parentStatementName": "توزيعات ومسحوبات السنة",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.107",
    "manualOption": "E-04-04 (توزيعات عينية على المساهمين)"
  },
  {
    "code": "O-01",
    "nameAr": "دخل شامل آخر للسنة",
    "level": 2,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01 (دخل شامل آخر للسنة)"
  },
  {
    "code": "O-01-01",
    "nameAr": "فروقات ترجمة عمليات أجنبية",
    "level": 3,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01-01 (فروقات ترجمة عمليات أجنبية)"
  },
  {
    "code": "O-01-02",
    "nameAr": "إعادة قياس منافع الموظفين",
    "level": 3,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01-02 (إعادة قياس منافع الموظفين)"
  },
  {
    "code": "O-01-03",
    "nameAr": "تغيرات القيمة العادلة لاستثمارات الدخل الشامل",
    "level": 3,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01-03 (تغيرات القيمة العادلة لاستثمارات الدخل الشامل)"
  },
  {
    "code": "O-01-04",
    "nameAr": "احتياطي تحوط التدفقات النقدية",
    "level": 3,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01-04 (احتياطي تحوط التدفقات النقدية)"
  },
  {
    "code": "O-01-05",
    "nameAr": "فروقات دخل شامل آخر غير معاد تصنيفها",
    "level": 3,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01-05 (فروقات دخل شامل آخر غير معاد تصنيفها)"
  },
  {
    "code": "O-01-06",
    "nameAr": "فروقات دخل شامل آخر قابلة لإعادة التصنيف",
    "level": 3,
    "parentStatementCode": "O-01",
    "parentStatementName": "دخل شامل آخر للسنة",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82A / IAS 19.120",
    "manualOption": "O-01-06 (فروقات دخل شامل آخر قابلة لإعادة التصنيف)"
  },
  {
    "code": "R-01",
    "nameAr": "الإيرادات",
    "level": 2,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01 (الإيرادات)"
  },
  {
    "code": "R-01-01",
    "nameAr": "مبيعات بضائع محلية",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-01 (مبيعات بضائع محلية)"
  },
  {
    "code": "R-01-02",
    "nameAr": "مبيعات بضائع خارجية",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-02 (مبيعات بضائع خارجية)"
  },
  {
    "code": "R-01-03",
    "nameAr": "إيرادات خدمات استشارية",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-03 (إيرادات خدمات استشارية)"
  },
  {
    "code": "R-01-04",
    "nameAr": "إيرادات خدمات تشغيلية",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-04 (إيرادات خدمات تشغيلية)"
  },
  {
    "code": "R-01-05",
    "nameAr": "إيرادات صيانة وعقود",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-05 (إيرادات صيانة وعقود)"
  },
  {
    "code": "R-01-06",
    "nameAr": "إيرادات اشتراكات",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-06 (إيرادات اشتراكات)"
  },
  {
    "code": "R-01-07",
    "nameAr": "إيرادات عمولات استقدام",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-07 (إيرادات عمولات استقدام)"
  },
  {
    "code": "R-01-08",
    "nameAr": "إيرادات خدمات سياحية وسفر",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-08 (إيرادات خدمات سياحية وسفر)"
  },
  {
    "code": "R-01-09",
    "nameAr": "إيرادات خدمات إيواء وإقامة",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-09 (إيرادات خدمات إيواء وإقامة)"
  },
  {
    "code": "R-01-10",
    "nameAr": "إيرادات خدمات تقنية وأنظمة",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-10 (إيرادات خدمات تقنية وأنظمة)"
  },
  {
    "code": "R-01-11",
    "nameAr": "إيرادات عقود مشاريع",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-11 (إيرادات عقود مشاريع)"
  },
  {
    "code": "R-01-12",
    "nameAr": "إيرادات توريد عمالة",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-12 (إيرادات توريد عمالة)"
  },
  {
    "code": "R-01-13",
    "nameAr": "خصومات ومردودات مبيعات",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-13 (خصومات ومردودات مبيعات)"
  },
  {
    "code": "R-01-14",
    "nameAr": "إيرادات خدمات لوجستية",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-14 (إيرادات خدمات لوجستية)"
  },
  {
    "code": "R-01-15",
    "nameAr": "إيرادات التأجير التشغيلي كنشاط رئيسي",
    "level": 3,
    "parentStatementCode": "R-01",
    "parentStatementName": "الإيرادات",
    "naturalBalance": "-",
    "ifrsRef": "IFRS 15",
    "manualOption": "R-01-15 (إيرادات التأجير التشغيلي كنشاط رئيسي)"
  },
  {
    "code": "R-02",
    "nameAr": "تكلفة الإيرادات",
    "level": 2,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02 (تكلفة الإيرادات)"
  },
  {
    "code": "R-02-01",
    "nameAr": "تكلفة البضاعة المباعة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-01 (تكلفة البضاعة المباعة)"
  },
  {
    "code": "R-02-02",
    "nameAr": "تكلفة المواد المباشرة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-02 (تكلفة المواد المباشرة)"
  },
  {
    "code": "R-02-03",
    "nameAr": "رواتب التشغيل المباشرة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-03 (رواتب التشغيل المباشرة)"
  },
  {
    "code": "R-02-04",
    "nameAr": "تكلفة خدمات مقدمة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-04 (تكلفة خدمات مقدمة)"
  },
  {
    "code": "R-02-05",
    "nameAr": "تكاليف مشاريع وعقود",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-05 (تكاليف مشاريع وعقود)"
  },
  {
    "code": "R-02-06",
    "nameAr": "تكلفة النقل والشحن المباشر",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-06 (تكلفة النقل والشحن المباشر)"
  },
  {
    "code": "R-02-07",
    "nameAr": "تكلفة توريد العمالة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-07 (تكلفة توريد العمالة)"
  },
  {
    "code": "R-02-08",
    "nameAr": "تكلفة خدمات الإيواء",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-08 (تكلفة خدمات الإيواء)"
  },
  {
    "code": "R-02-09",
    "nameAr": "تكلفة الصيانة المباشرة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-09 (تكلفة الصيانة المباشرة)"
  },
  {
    "code": "R-02-10",
    "nameAr": "إهلاك ضمن تكلفة الإيرادات",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-10 (إهلاك ضمن تكلفة الإيرادات)"
  },
  {
    "code": "R-02-11",
    "nameAr": "مخصصات المخزون ضمن تكلفة المبيعات",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-11 (مخصصات المخزون ضمن تكلفة المبيعات)"
  },
  {
    "code": "R-02-12",
    "nameAr": "مشتريات مرتبطة بالمبيعات",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-12 (مشتريات مرتبطة بالمبيعات)"
  },
  {
    "code": "R-02-13",
    "nameAr": "تكلفة برامج وخدمات تقنية مقدمة",
    "level": 3,
    "parentStatementCode": "R-02",
    "parentStatementName": "تكلفة الإيرادات",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99 / IAS 2",
    "manualOption": "R-02-13 (تكلفة برامج وخدمات تقنية مقدمة)"
  },
  {
    "code": "R-03",
    "nameAr": "مصروفات بيع وتسويق",
    "level": 2,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03 (مصروفات بيع وتسويق)"
  },
  {
    "code": "R-03-01",
    "nameAr": "رواتب فريق المبيعات",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-01 (رواتب فريق المبيعات)"
  },
  {
    "code": "R-03-02",
    "nameAr": "عمولات بيع وتسويق",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-02 (عمولات بيع وتسويق)"
  },
  {
    "code": "R-03-03",
    "nameAr": "إعلانات وتسويق رقمي",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-03 (إعلانات وتسويق رقمي)"
  },
  {
    "code": "R-03-04",
    "nameAr": "حملات ترويجية",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-04 (حملات ترويجية)"
  },
  {
    "code": "R-03-05",
    "nameAr": "معارض ومؤتمرات تجارية",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-05 (معارض ومؤتمرات تجارية)"
  },
  {
    "code": "R-03-06",
    "nameAr": "مصاريف توزيع وبيع",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-06 (مصاريف توزيع وبيع)"
  },
  {
    "code": "R-03-07",
    "nameAr": "مصاريف شحن مبيعات",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-07 (مصاريف شحن مبيعات)"
  },
  {
    "code": "R-03-08",
    "nameAr": "خصومات ترويجية مصروفية",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-08 (خصومات ترويجية مصروفية)"
  },
  {
    "code": "R-03-09",
    "nameAr": "أتعاب وكلاء بيع",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-09 (أتعاب وكلاء بيع)"
  },
  {
    "code": "R-03-10",
    "nameAr": "مصاريف علاقات العملاء",
    "level": 3,
    "parentStatementCode": "R-03",
    "parentStatementName": "مصروفات بيع وتسويق",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-03-10 (مصاريف علاقات العملاء)"
  },
  {
    "code": "R-04",
    "nameAr": "مصروفات عمومية وإدارية",
    "level": 2,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04 (مصروفات عمومية وإدارية)"
  },
  {
    "code": "R-04-01",
    "nameAr": "رواتب الإدارة والموظفين",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-01 (رواتب الإدارة والموظفين)"
  },
  {
    "code": "R-04-02",
    "nameAr": "إيجارات إدارية تشغيلية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-02 (إيجارات إدارية تشغيلية)"
  },
  {
    "code": "R-04-03",
    "nameAr": "اتصالات وإنترنت",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-03 (اتصالات وإنترنت)"
  },
  {
    "code": "R-04-04",
    "nameAr": "مرافق وكهرباء ومياه",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-04 (مرافق وكهرباء ومياه)"
  },
  {
    "code": "R-04-05",
    "nameAr": "رسوم حكومية إدارية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-05 (رسوم حكومية إدارية)"
  },
  {
    "code": "R-04-06",
    "nameAr": "أتعاب مهنية وقانونية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-06 (أتعاب مهنية وقانونية)"
  },
  {
    "code": "R-04-07",
    "nameAr": "أتعاب مراجعة ومحاسبة",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-07 (أتعاب مراجعة ومحاسبة)"
  },
  {
    "code": "R-04-08",
    "nameAr": "تراخيص واشتراكات تشغيلية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-08 (تراخيص واشتراكات تشغيلية)"
  },
  {
    "code": "R-04-09",
    "nameAr": "صيانة إدارية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-09 (صيانة إدارية)"
  },
  {
    "code": "R-04-10",
    "nameAr": "تأمينات تشغيلية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-10 (تأمينات تشغيلية)"
  },
  {
    "code": "R-04-11",
    "nameAr": "مصاريف سفر وانتداب إداري",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-11 (مصاريف سفر وانتداب إداري)"
  },
  {
    "code": "R-04-12",
    "nameAr": "تدريب وتطوير",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-12 (تدريب وتطوير)"
  },
  {
    "code": "R-04-13",
    "nameAr": "مصاريف تقنية المعلومات",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-13 (مصاريف تقنية المعلومات)"
  },
  {
    "code": "R-04-14",
    "nameAr": "قرطاسية ومستلزمات مكتبية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-14 (قرطاسية ومستلزمات مكتبية)"
  },
  {
    "code": "R-04-15",
    "nameAr": "مصاريف سيارات إدارية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-15 (مصاريف سيارات إدارية)"
  },
  {
    "code": "R-04-16",
    "nameAr": "ضيافة ونظافة",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-16 (ضيافة ونظافة)"
  },
  {
    "code": "R-04-17",
    "nameAr": "رسوم وبنوك غير تمويلية",
    "level": 3,
    "parentStatementCode": "R-04",
    "parentStatementName": "مصروفات عمومية وإدارية",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.99",
    "manualOption": "R-04-17 (رسوم وبنوك غير تمويلية)"
  },
  {
    "code": "R-05",
    "nameAr": "إيرادات أخرى",
    "level": 2,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05 (إيرادات أخرى)"
  },
  {
    "code": "R-05-01",
    "nameAr": "أرباح بيع أصول ثابتة",
    "level": 3,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05-01 (أرباح بيع أصول ثابتة)"
  },
  {
    "code": "R-05-02",
    "nameAr": "إيرادات تعويضات",
    "level": 3,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05-02 (إيرادات تعويضات)"
  },
  {
    "code": "R-05-03",
    "nameAr": "إيرادات تأجير عرضية",
    "level": 3,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05-03 (إيرادات تأجير عرضية)"
  },
  {
    "code": "R-05-04",
    "nameAr": "أرباح فروق عملة تشغيلية",
    "level": 3,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05-04 (أرباح فروق عملة تشغيلية)"
  },
  {
    "code": "R-05-05",
    "nameAr": "مبالغ مستردة غير تشغيلية",
    "level": 3,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05-05 (مبالغ مستردة غير تشغيلية)"
  },
  {
    "code": "R-05-06",
    "nameAr": "إيرادات أخرى غير اعتيادية",
    "level": 3,
    "parentStatementCode": "R-05",
    "parentStatementName": "إيرادات أخرى",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-05-06 (إيرادات أخرى غير اعتيادية)"
  },
  {
    "code": "R-06",
    "nameAr": "مصروفات أخرى",
    "level": 2,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06 (مصروفات أخرى)"
  },
  {
    "code": "R-06-01",
    "nameAr": "خسائر بيع أصول ثابتة",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-01 (خسائر بيع أصول ثابتة)"
  },
  {
    "code": "R-06-02",
    "nameAr": "خسائر فروق عملة",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-02 (خسائر فروق عملة)"
  },
  {
    "code": "R-06-03",
    "nameAr": "خسائر هبوط قيمة",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-03 (خسائر هبوط قيمة)"
  },
  {
    "code": "R-06-04",
    "nameAr": "تكاليف إعادة هيكلة",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-04 (تكاليف إعادة هيكلة)"
  },
  {
    "code": "R-06-05",
    "nameAr": "غرامات وتعويضات",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-05 (غرامات وتعويضات)"
  },
  {
    "code": "R-06-06",
    "nameAr": "مصروفات ومخصصات أخرى",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-06 (مصروفات ومخصصات أخرى)"
  },
  {
    "code": "R-06-07",
    "nameAr": "خسائر مطالبات وتسويات",
    "level": 3,
    "parentStatementCode": "R-06",
    "parentStatementName": "مصروفات أخرى",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.97",
    "manualOption": "R-06-07 (خسائر مطالبات وتسويات)"
  },
  {
    "code": "R-07",
    "nameAr": "تكاليف تمويل",
    "level": 2,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07 (تكاليف تمويل)"
  },
  {
    "code": "R-07-01",
    "nameAr": "فوائد قروض بنكية",
    "level": 3,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07-01 (فوائد قروض بنكية)"
  },
  {
    "code": "R-07-02",
    "nameAr": "تكاليف تمويل مرابحة",
    "level": 3,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07-02 (تكاليف تمويل مرابحة)"
  },
  {
    "code": "R-07-03",
    "nameAr": "فوائد التزامات إيجار",
    "level": 3,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07-03 (فوائد التزامات إيجار)"
  },
  {
    "code": "R-07-04",
    "nameAr": "عمولات تسهيلات تمويل",
    "level": 3,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07-04 (عمولات تسهيلات تمويل)"
  },
  {
    "code": "R-07-05",
    "nameAr": "أتعاب إصدار تمويل مؤهلة",
    "level": 3,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07-05 (أتعاب إصدار تمويل مؤهلة)"
  },
  {
    "code": "R-07-06",
    "nameAr": "خسائر إعادة قياس التزامات تمويلية",
    "level": 3,
    "parentStatementCode": "R-07",
    "parentStatementName": "تكاليف تمويل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 1.82(b) / IAS 23",
    "manualOption": "R-07-06 (خسائر إعادة قياس التزامات تمويلية)"
  },
  {
    "code": "R-08",
    "nameAr": "إيرادات تمويل",
    "level": 2,
    "parentStatementCode": "R-08",
    "parentStatementName": "إيرادات تمويل",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82",
    "manualOption": "R-08 (إيرادات تمويل)"
  },
  {
    "code": "R-08-01",
    "nameAr": "إيرادات فوائد وودائع",
    "level": 3,
    "parentStatementCode": "R-08",
    "parentStatementName": "إيرادات تمويل",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82",
    "manualOption": "R-08-01 (إيرادات فوائد وودائع)"
  },
  {
    "code": "R-08-02",
    "nameAr": "إيرادات عائد صكوك",
    "level": 3,
    "parentStatementCode": "R-08",
    "parentStatementName": "إيرادات تمويل",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82",
    "manualOption": "R-08-02 (إيرادات عائد صكوك)"
  },
  {
    "code": "R-08-03",
    "nameAr": "إيرادات تمويل عملاء",
    "level": 3,
    "parentStatementCode": "R-08",
    "parentStatementName": "إيرادات تمويل",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82",
    "manualOption": "R-08-03 (إيرادات تمويل عملاء)"
  },
  {
    "code": "R-08-04",
    "nameAr": "أرباح استثمارات تمويلية",
    "level": 3,
    "parentStatementCode": "R-08",
    "parentStatementName": "إيرادات تمويل",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82",
    "manualOption": "R-08-04 (أرباح استثمارات تمويلية)"
  },
  {
    "code": "R-08-05",
    "nameAr": "خصومات تمويل مكتسبة",
    "level": 3,
    "parentStatementCode": "R-08",
    "parentStatementName": "إيرادات تمويل",
    "naturalBalance": "C",
    "ifrsRef": "IAS 1.82",
    "manualOption": "R-08-05 (خصومات تمويل مكتسبة)"
  },
  {
    "code": "R-09",
    "nameAr": "زكاة وضريبة دخل",
    "level": 2,
    "parentStatementCode": "R-09",
    "parentStatementName": "زكاة وضريبة دخل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "R-09 (زكاة وضريبة دخل)"
  },
  {
    "code": "R-09-01",
    "nameAr": "مصروف زكاة السنة",
    "level": 3,
    "parentStatementCode": "R-09",
    "parentStatementName": "زكاة وضريبة دخل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "R-09-01 (مصروف زكاة السنة)"
  },
  {
    "code": "R-09-02",
    "nameAr": "مصروف ضريبة دخل جارية",
    "level": 3,
    "parentStatementCode": "R-09",
    "parentStatementName": "زكاة وضريبة دخل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "R-09-02 (مصروف ضريبة دخل جارية)"
  },
  {
    "code": "R-09-03",
    "nameAr": "مصروف ضريبة دخل مؤجلة",
    "level": 3,
    "parentStatementCode": "R-09",
    "parentStatementName": "زكاة وضريبة دخل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "R-09-03 (مصروف ضريبة دخل مؤجلة)"
  },
  {
    "code": "R-09-04",
    "nameAr": "تسويات زكاة وضريبة دخل لسنوات سابقة",
    "level": 3,
    "parentStatementCode": "R-09",
    "parentStatementName": "زكاة وضريبة دخل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "R-09-04 (تسويات زكاة وضريبة دخل لسنوات سابقة)"
  },
  {
    "code": "R-09-05",
    "nameAr": "مخصص ضريبة أرباح",
    "level": 3,
    "parentStatementCode": "R-09",
    "parentStatementName": "زكاة وضريبة دخل",
    "naturalBalance": "D",
    "ifrsRef": "IAS 12 / IFRIC 21",
    "manualOption": "R-09-05 (مخصص ضريبة أرباح)"
  },
  {
    "code": "R-10",
    "nameAr": "إهلاك وإطفاء",
    "level": 2,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10 (إهلاك وإطفاء)"
  },
  {
    "code": "R-10-01",
    "nameAr": "إهلاك مبانٍ ومعدات ضمن التشغيل",
    "level": 3,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10-01 (إهلاك مبانٍ ومعدات ضمن التشغيل)"
  },
  {
    "code": "R-10-02",
    "nameAr": "إهلاك سيارات ضمن الإدارة",
    "level": 3,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10-02 (إهلاك سيارات ضمن الإدارة)"
  },
  {
    "code": "R-10-03",
    "nameAr": "إهلاك أجهزة ومعدات",
    "level": 3,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10-03 (إهلاك أجهزة ومعدات)"
  },
  {
    "code": "R-10-04",
    "nameAr": "إطفاء برامج وتراخيص",
    "level": 3,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10-04 (إطفاء برامج وتراخيص)"
  },
  {
    "code": "R-10-05",
    "nameAr": "إهلاك أصول حق الاستخدام",
    "level": 3,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10-05 (إهلاك أصول حق الاستخدام)"
  },
  {
    "code": "R-10-06",
    "nameAr": "إطفاء أصول غير ملموسة",
    "level": 3,
    "parentStatementCode": "R-10",
    "parentStatementName": "إهلاك وإطفاء",
    "naturalBalance": "D",
    "ifrsRef": "IAS 16 / IAS 38 / IFRS 16",
    "manualOption": "R-10-06 (إطفاء أصول غير ملموسة)"
  }
];

export const EXCEL_ACCOUNTING_TREE: ExcelAccountingTreeNode[] = [
  {
    "seq": 1,
    "level": 1,
    "code": "A",
    "titleAr": "الأصول",
    "parentCode": "",
    "statementCode": ""
  },
  {
    "seq": 2,
    "level": 2,
    "code": "A-01",
    "titleAr": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "parentCode": "A",
    "statementCode": "A-01"
  },
  {
    "seq": 3,
    "level": 3,
    "code": "A-01-01",
    "titleAr": "أراضٍ مملوكة",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 4,
    "level": 3,
    "code": "A-01-02",
    "titleAr": "مبانٍ ومنشآت",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 5,
    "level": 3,
    "code": "A-01-03",
    "titleAr": "آلات ومعدات إنتاج",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 6,
    "level": 3,
    "code": "A-01-04",
    "titleAr": "سيارات ومركبات",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 7,
    "level": 3,
    "code": "A-01-05",
    "titleAr": "أثاث وتجهيزات مكتبية",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 8,
    "level": 3,
    "code": "A-01-06",
    "titleAr": "أجهزة حاسب وشبكات",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 9,
    "level": 3,
    "code": "A-01-07",
    "titleAr": "أجهزة ومعدات اتصالات",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 10,
    "level": 3,
    "code": "A-01-08",
    "titleAr": "أدوات وآلات صغيرة مرسملة",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 11,
    "level": 3,
    "code": "A-01-09",
    "titleAr": "تحسينات عقارات مستأجرة",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 12,
    "level": 3,
    "code": "A-01-10",
    "titleAr": "مشروعات رأسمالية تحت التنفيذ",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 13,
    "level": 3,
    "code": "A-01-11",
    "titleAr": "قطع غيار رأسمالية",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 14,
    "level": 3,
    "code": "A-01-12",
    "titleAr": "معدات مستودعات ومناولة",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 15,
    "level": 3,
    "code": "A-01-13",
    "titleAr": "معدات طبية وفنية",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 16,
    "level": 3,
    "code": "A-01-14",
    "titleAr": "معدات أمن وسلامة",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 17,
    "level": 3,
    "code": "A-01-15",
    "titleAr": "أصول إنتاجية أخرى",
    "parentCode": "A-01",
    "statementCode": "A-01"
  },
  {
    "seq": 18,
    "level": 2,
    "code": "A-02",
    "titleAr": "مجمع إهلاك الممتلكات والآلات",
    "parentCode": "A",
    "statementCode": "A-02"
  },
  {
    "seq": 19,
    "level": 3,
    "code": "A-02-01",
    "titleAr": "مجمع إهلاك المباني",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 20,
    "level": 3,
    "code": "A-02-02",
    "titleAr": "مجمع إهلاك الآلات",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 21,
    "level": 3,
    "code": "A-02-03",
    "titleAr": "مجمع إهلاك السيارات",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 22,
    "level": 3,
    "code": "A-02-04",
    "titleAr": "مجمع إهلاك الأثاث",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 23,
    "level": 3,
    "code": "A-02-05",
    "titleAr": "مجمع إهلاك الحواسيب",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 24,
    "level": 3,
    "code": "A-02-06",
    "titleAr": "مجمع إهلاك التجهيزات",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 25,
    "level": 3,
    "code": "A-02-07",
    "titleAr": "مجمع إهلاك التحسينات",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 26,
    "level": 3,
    "code": "A-02-08",
    "titleAr": "مجمع إهلاك معدات أخرى",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 27,
    "level": 3,
    "code": "A-02-09",
    "titleAr": "خسائر هبوط قيمة أصول ثابتة متراكمة",
    "parentCode": "A-02",
    "statementCode": "A-02"
  },
  {
    "seq": 28,
    "level": 2,
    "code": "A-03",
    "titleAr": "أصول غير ملموسة (بالصافي)",
    "parentCode": "A",
    "statementCode": "A-03"
  },
  {
    "seq": 29,
    "level": 3,
    "code": "A-03-01",
    "titleAr": "برامج وأنظمة مملوكة",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 30,
    "level": 3,
    "code": "A-03-02",
    "titleAr": "تراخيص برمجية مرسملة",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 31,
    "level": 3,
    "code": "A-03-03",
    "titleAr": "تطوير برامج مؤهل للرسملة",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 32,
    "level": 3,
    "code": "A-03-04",
    "titleAr": "براءات اختراع",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 33,
    "level": 3,
    "code": "A-03-05",
    "titleAr": "علامات تجارية معترف بها",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 34,
    "level": 3,
    "code": "A-03-06",
    "titleAr": "حقوق امتياز",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 35,
    "level": 3,
    "code": "A-03-07",
    "titleAr": "علاقات عملاء مقتناة",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 36,
    "level": 3,
    "code": "A-03-08",
    "titleAr": "شهرة شراء أعمال",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 37,
    "level": 3,
    "code": "A-03-09",
    "titleAr": "مجمع إطفاء الأصول غير الملموسة",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 38,
    "level": 3,
    "code": "A-03-10",
    "titleAr": "خسائر هبوط قيمة الأصول غير الملموسة",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 39,
    "level": 3,
    "code": "A-03-11",
    "titleAr": "أصول غير ملموسة تحت التطوير",
    "parentCode": "A-03",
    "statementCode": "A-03"
  },
  {
    "seq": 40,
    "level": 2,
    "code": "A-04",
    "titleAr": "استثمارات وأصول مالية طويلة الأجل",
    "parentCode": "A",
    "statementCode": "A-04"
  },
  {
    "seq": 41,
    "level": 3,
    "code": "A-04-01",
    "titleAr": "استثمارات في شركات تابعة - قوائم منفصلة",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 42,
    "level": 3,
    "code": "A-04-02",
    "titleAr": "استثمارات في شركات زميلة",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 43,
    "level": 3,
    "code": "A-04-03",
    "titleAr": "استثمارات في مشروعات مشتركة",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 44,
    "level": 3,
    "code": "A-04-04",
    "titleAr": "استثمارات أدوات ملكية طويلة الأجل",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 45,
    "level": 3,
    "code": "A-04-05",
    "titleAr": "استثمارات أدوات دين طويلة الأجل",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 46,
    "level": 3,
    "code": "A-04-06",
    "titleAr": "استثمارات بالقيمة العادلة عبر الأرباح والخسائر",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 47,
    "level": 3,
    "code": "A-04-07",
    "titleAr": "استثمارات بالقيمة العادلة عبر الدخل الشامل",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 48,
    "level": 3,
    "code": "A-04-08",
    "titleAr": "استثمارات بالتكلفة المطفأة",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 49,
    "level": 3,
    "code": "A-04-09",
    "titleAr": "ودائع طويلة الأجل غير معادلة للنقد",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 50,
    "level": 3,
    "code": "A-04-10",
    "titleAr": "قروض ممنوحة طويلة الأجل",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 51,
    "level": 3,
    "code": "A-04-11",
    "titleAr": "عقارات استثمارية - تتطلب سياسة عرض منفصلة",
    "parentCode": "A-04",
    "statementCode": "A-04"
  },
  {
    "seq": 52,
    "level": 2,
    "code": "A-05",
    "titleAr": "أصول حق الاستخدام (بالصافي)",
    "parentCode": "A",
    "statementCode": "A-05"
  },
  {
    "seq": 53,
    "level": 3,
    "code": "A-05-01",
    "titleAr": "حق استخدام مبانٍ ومستودعات",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 54,
    "level": 3,
    "code": "A-05-02",
    "titleAr": "حق استخدام سيارات",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 55,
    "level": 3,
    "code": "A-05-03",
    "titleAr": "حق استخدام آلات ومعدات",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 56,
    "level": 3,
    "code": "A-05-04",
    "titleAr": "حق استخدام أراضٍ",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 57,
    "level": 3,
    "code": "A-05-05",
    "titleAr": "مجمع إهلاك حق استخدام المباني",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 58,
    "level": 3,
    "code": "A-05-06",
    "titleAr": "مجمع إهلاك حق استخدام السيارات",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 59,
    "level": 3,
    "code": "A-05-07",
    "titleAr": "مجمع إهلاك حقوق استخدام أخرى",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 60,
    "level": 3,
    "code": "A-05-08",
    "titleAr": "خسائر هبوط قيمة حق الاستخدام",
    "parentCode": "A-05",
    "statementCode": "A-05"
  },
  {
    "seq": 61,
    "level": 2,
    "code": "A-06",
    "titleAr": "مخزون",
    "parentCode": "A",
    "statementCode": "A-06"
  },
  {
    "seq": 62,
    "level": 3,
    "code": "A-06-01",
    "titleAr": "مخزون بضائع جاهزة",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 63,
    "level": 3,
    "code": "A-06-02",
    "titleAr": "مواد خام",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 64,
    "level": 3,
    "code": "A-06-03",
    "titleAr": "إنتاج تحت التشغيل",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 65,
    "level": 3,
    "code": "A-06-04",
    "titleAr": "منتجات تامة الصنع",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 66,
    "level": 3,
    "code": "A-06-05",
    "titleAr": "مخزون قطع غيار تشغيلية",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 67,
    "level": 3,
    "code": "A-06-06",
    "titleAr": "مخزون تغليف وتعبئة",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 68,
    "level": 3,
    "code": "A-06-07",
    "titleAr": "بضاعة بالطريق",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 69,
    "level": 3,
    "code": "A-06-08",
    "titleAr": "بضاعة لدى الغير",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 70,
    "level": 3,
    "code": "A-06-09",
    "titleAr": "مخزون فروع ومستودعات",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 71,
    "level": 3,
    "code": "A-06-10",
    "titleAr": "مخصص انخفاض قيمة المخزون",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 72,
    "level": 3,
    "code": "A-06-11",
    "titleAr": "فروقات جرد المخزون",
    "parentCode": "A-06",
    "statementCode": "A-06"
  },
  {
    "seq": 73,
    "level": 2,
    "code": "A-07",
    "titleAr": "ذمم مدينة تجارية",
    "parentCode": "A",
    "statementCode": "A-07"
  },
  {
    "seq": 74,
    "level": 3,
    "code": "A-07-01",
    "titleAr": "عملاء محليون",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 75,
    "level": 3,
    "code": "A-07-02",
    "titleAr": "عملاء خارجيون",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 76,
    "level": 3,
    "code": "A-07-03",
    "titleAr": "ذمم شركات وحسابات تجارية",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 77,
    "level": 3,
    "code": "A-07-04",
    "titleAr": "أوراق قبض تجارية",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 78,
    "level": 3,
    "code": "A-07-05",
    "titleAr": "مستحقات من عقود العملاء",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 79,
    "level": 3,
    "code": "A-07-06",
    "titleAr": "إيرادات مفوترة غير محصلة",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 80,
    "level": 3,
    "code": "A-07-07",
    "titleAr": "أصول عقود مع العملاء",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 81,
    "level": 3,
    "code": "A-07-08",
    "titleAr": "شيكات تحت التحصيل",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 82,
    "level": 3,
    "code": "A-07-09",
    "titleAr": "عمولات مستحقة من العملاء",
    "parentCode": "A-07",
    "statementCode": "A-07"
  },
  {
    "seq": 83,
    "level": 2,
    "code": "A-08",
    "titleAr": "مخصص خسائر ائتمانية متوقعة",
    "parentCode": "A",
    "statementCode": "A-08"
  },
  {
    "seq": 84,
    "level": 3,
    "code": "A-08-01",
    "titleAr": "مخصص خسائر ائتمانية للعملاء",
    "parentCode": "A-08",
    "statementCode": "A-08"
  },
  {
    "seq": 85,
    "level": 3,
    "code": "A-08-02",
    "titleAr": "مخصص خسائر ائتمانية لأصول العقود",
    "parentCode": "A-08",
    "statementCode": "A-08"
  },
  {
    "seq": 86,
    "level": 3,
    "code": "A-08-03",
    "titleAr": "مخصص خسائر ائتمانية لأوراق القبض",
    "parentCode": "A-08",
    "statementCode": "A-08"
  },
  {
    "seq": 87,
    "level": 3,
    "code": "A-08-04",
    "titleAr": "مخصص خسائر ائتمانية لذمم أخرى",
    "parentCode": "A-08",
    "statementCode": "A-08"
  },
  {
    "seq": 88,
    "level": 3,
    "code": "A-08-05",
    "titleAr": "مخصص خسائر ائتمانية لقروض العملاء",
    "parentCode": "A-08",
    "statementCode": "A-08"
  },
  {
    "seq": 89,
    "level": 2,
    "code": "A-09",
    "titleAr": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "parentCode": "A",
    "statementCode": "A-09"
  },
  {
    "seq": 90,
    "level": 3,
    "code": "A-09-01",
    "titleAr": "مصروفات مدفوعة مقدمًا",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 91,
    "level": 3,
    "code": "A-09-02",
    "titleAr": "إيجارات مدفوعة مقدمًا",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 92,
    "level": 3,
    "code": "A-09-03",
    "titleAr": "تأمين مدفوع مقدمًا",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 93,
    "level": 3,
    "code": "A-09-04",
    "titleAr": "اشتراكات وخدمات مدفوعة مقدمًا",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 94,
    "level": 3,
    "code": "A-09-05",
    "titleAr": "دفعات مقدمة للموردين",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 95,
    "level": 3,
    "code": "A-09-06",
    "titleAr": "عهد وسلف موظفين",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 96,
    "level": 3,
    "code": "A-09-07",
    "titleAr": "ذمم مدينة أخرى",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 97,
    "level": 3,
    "code": "A-09-08",
    "titleAr": "مستحق من أطراف ذات علاقة - متداول",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 98,
    "level": 3,
    "code": "A-09-09",
    "titleAr": "تأمينات مستردة قصيرة الأجل",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 99,
    "level": 3,
    "code": "A-09-10",
    "titleAr": "ضريبة قيمة مضافة قابلة للاسترداد",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 100,
    "level": 3,
    "code": "A-09-11",
    "titleAr": "مبالغ ضمان محتجزة مدينة",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 101,
    "level": 3,
    "code": "A-09-12",
    "titleAr": "إيرادات مستحقة أخرى",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 102,
    "level": 3,
    "code": "A-09-13",
    "titleAr": "تسويات بنكية مدينة",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 103,
    "level": 3,
    "code": "A-09-14",
    "titleAr": "أرصدة مدينة تحت التسوية",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 104,
    "level": 3,
    "code": "A-09-15",
    "titleAr": "سلف عملاء غير تجارية",
    "parentCode": "A-09",
    "statementCode": "A-09"
  },
  {
    "seq": 105,
    "level": 2,
    "code": "A-10",
    "titleAr": "نقد وما في حكمه",
    "parentCode": "A",
    "statementCode": "A-10"
  },
  {
    "seq": 106,
    "level": 3,
    "code": "A-10-01",
    "titleAr": "صندوق نقدي رئيسي",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 107,
    "level": 3,
    "code": "A-10-02",
    "titleAr": "عهدة نقدية نثرية",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 108,
    "level": 3,
    "code": "A-10-03",
    "titleAr": "حساب جاري لدى البنوك",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 109,
    "level": 3,
    "code": "A-10-04",
    "titleAr": "حسابات توفير تحت الطلب",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 110,
    "level": 3,
    "code": "A-10-05",
    "titleAr": "ودائع قصيرة معادلة للنقد",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 111,
    "level": 3,
    "code": "A-10-06",
    "titleAr": "نقد لدى أمناء الصناديق",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 112,
    "level": 3,
    "code": "A-10-07",
    "titleAr": "نقد قيد الإيداع",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 113,
    "level": 3,
    "code": "A-10-08",
    "titleAr": "حسابات بنكية تشغيلية",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 114,
    "level": 3,
    "code": "A-10-09",
    "titleAr": "حسابات بنكية بالعملات الأجنبية - معادلة محولة",
    "parentCode": "A-10",
    "statementCode": "A-10"
  },
  {
    "seq": 115,
    "level": 1,
    "code": "L",
    "titleAr": "الالتزامات",
    "parentCode": "",
    "statementCode": ""
  },
  {
    "seq": 116,
    "level": 2,
    "code": "L-01",
    "titleAr": "قروض طويلة الأجل",
    "parentCode": "L",
    "statementCode": "L-01"
  },
  {
    "seq": 117,
    "level": 3,
    "code": "L-01-01",
    "titleAr": "قروض بنكية غير متداولة",
    "parentCode": "L-01",
    "statementCode": "L-01"
  },
  {
    "seq": 118,
    "level": 3,
    "code": "L-01-02",
    "titleAr": "صكوك وسندات مستحقة طويلة الأجل",
    "parentCode": "L-01",
    "statementCode": "L-01"
  },
  {
    "seq": 119,
    "level": 3,
    "code": "L-01-03",
    "titleAr": "قروض من مساهمين غير متداولة",
    "parentCode": "L-01",
    "statementCode": "L-01"
  },
  {
    "seq": 120,
    "level": 3,
    "code": "L-01-04",
    "titleAr": "تمويل مرابحة طويل الأجل",
    "parentCode": "L-01",
    "statementCode": "L-01"
  },
  {
    "seq": 121,
    "level": 3,
    "code": "L-01-05",
    "titleAr": "قروض مؤسسات تمويل طويلة الأجل",
    "parentCode": "L-01",
    "statementCode": "L-01"
  },
  {
    "seq": 122,
    "level": 3,
    "code": "L-01-06",
    "titleAr": "التزامات تمويل طويلة الأجل أخرى",
    "parentCode": "L-01",
    "statementCode": "L-01"
  },
  {
    "seq": 123,
    "level": 2,
    "code": "L-02",
    "titleAr": "التزامات عقود الإيجار",
    "parentCode": "L",
    "statementCode": "L-02"
  },
  {
    "seq": 124,
    "level": 3,
    "code": "L-02-01",
    "titleAr": "التزامات إيجار مبانٍ",
    "parentCode": "L-02",
    "statementCode": "L-02"
  },
  {
    "seq": 125,
    "level": 3,
    "code": "L-02-02",
    "titleAr": "التزامات إيجار سيارات",
    "parentCode": "L-02",
    "statementCode": "L-02"
  },
  {
    "seq": 126,
    "level": 3,
    "code": "L-02-03",
    "titleAr": "التزامات إيجار آلات",
    "parentCode": "L-02",
    "statementCode": "L-02"
  },
  {
    "seq": 127,
    "level": 3,
    "code": "L-02-04",
    "titleAr": "التزامات إيجار معدات",
    "parentCode": "L-02",
    "statementCode": "L-02"
  },
  {
    "seq": 128,
    "level": 3,
    "code": "L-02-05",
    "titleAr": "التزامات إيجار متداولة - تحتاج فصل إفصاح",
    "parentCode": "L-02",
    "statementCode": "L-02"
  },
  {
    "seq": 129,
    "level": 3,
    "code": "L-02-06",
    "titleAr": "التزامات إيجار غير متداولة - تحتاج فصل إفصاح",
    "parentCode": "L-02",
    "statementCode": "L-02"
  },
  {
    "seq": 130,
    "level": 2,
    "code": "L-03",
    "titleAr": "مكافأة نهاية الخدمة",
    "parentCode": "L",
    "statementCode": "L-03"
  },
  {
    "seq": 131,
    "level": 3,
    "code": "L-03-01",
    "titleAr": "التزام منافع نهاية الخدمة",
    "parentCode": "L-03",
    "statementCode": "L-03"
  },
  {
    "seq": 132,
    "level": 3,
    "code": "L-03-02",
    "titleAr": "مخصص منافع خدمة محددة",
    "parentCode": "L-03",
    "statementCode": "L-03"
  },
  {
    "seq": 133,
    "level": 3,
    "code": "L-03-03",
    "titleAr": "التزامات منافع موظفين طويلة الأجل",
    "parentCode": "L-03",
    "statementCode": "L-03"
  },
  {
    "seq": 134,
    "level": 3,
    "code": "L-03-04",
    "titleAr": "فروق قياس التزامات منافع الموظفين",
    "parentCode": "L-03",
    "statementCode": "L-03"
  },
  {
    "seq": 135,
    "level": 2,
    "code": "L-04",
    "titleAr": "ذمم دائنة تجارية",
    "parentCode": "L",
    "statementCode": "L-04"
  },
  {
    "seq": 136,
    "level": 3,
    "code": "L-04-01",
    "titleAr": "موردون محليون",
    "parentCode": "L-04",
    "statementCode": "L-04"
  },
  {
    "seq": 137,
    "level": 3,
    "code": "L-04-02",
    "titleAr": "موردون أجانب",
    "parentCode": "L-04",
    "statementCode": "L-04"
  },
  {
    "seq": 138,
    "level": 3,
    "code": "L-04-03",
    "titleAr": "أوراق دفع تجارية",
    "parentCode": "L-04",
    "statementCode": "L-04"
  },
  {
    "seq": 139,
    "level": 3,
    "code": "L-04-04",
    "titleAr": "موردون أطراف ذات علاقة تجاريون",
    "parentCode": "L-04",
    "statementCode": "L-04"
  },
  {
    "seq": 140,
    "level": 3,
    "code": "L-04-05",
    "titleAr": "فواتير موردين مستحقة الدفع",
    "parentCode": "L-04",
    "statementCode": "L-04"
  },
  {
    "seq": 141,
    "level": 3,
    "code": "L-04-06",
    "titleAr": "ذمم دائنة مقابل خدمات",
    "parentCode": "L-04",
    "statementCode": "L-04"
  },
  {
    "seq": 142,
    "level": 2,
    "code": "L-05",
    "titleAr": "مستحقات وأرصدة دائنة أخرى",
    "parentCode": "L",
    "statementCode": "L-05"
  },
  {
    "seq": 143,
    "level": 3,
    "code": "L-05-01",
    "titleAr": "رواتب وأجور مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 144,
    "level": 3,
    "code": "L-05-02",
    "titleAr": "حوافز وعمولات مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 145,
    "level": 3,
    "code": "L-05-03",
    "titleAr": "إجازات موظفين مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 146,
    "level": 3,
    "code": "L-05-04",
    "titleAr": "مصروفات تشغيلية مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 147,
    "level": 3,
    "code": "L-05-05",
    "titleAr": "إيجارات مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 148,
    "level": 3,
    "code": "L-05-06",
    "titleAr": "إيرادات مؤجلة من العملاء",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 149,
    "level": 3,
    "code": "L-05-07",
    "titleAr": "التزامات عقود مع العملاء",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 150,
    "level": 3,
    "code": "L-05-08",
    "titleAr": "دفعات مقدمة من العملاء",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 151,
    "level": 3,
    "code": "L-05-09",
    "titleAr": "ضريبة قيمة مضافة مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 152,
    "level": 3,
    "code": "L-05-10",
    "titleAr": "تأمينات اجتماعية مستحقة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 153,
    "level": 3,
    "code": "L-05-11",
    "titleAr": "مستحقات للجهات الحكومية",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 154,
    "level": 3,
    "code": "L-05-12",
    "titleAr": "أرصدة دائنة أخرى",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 155,
    "level": 3,
    "code": "L-05-13",
    "titleAr": "حسابات معلقة دائنة",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 156,
    "level": 3,
    "code": "L-05-14",
    "titleAr": "ودائع ضمان مستلمة من العملاء",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 157,
    "level": 3,
    "code": "L-05-15",
    "titleAr": "التزامات استرداد للعميل",
    "parentCode": "L-05",
    "statementCode": "L-05"
  },
  {
    "seq": 158,
    "level": 2,
    "code": "L-06",
    "titleAr": "قروض قصيرة الأجل وتسهيلات",
    "parentCode": "L",
    "statementCode": "L-06"
  },
  {
    "seq": 159,
    "level": 3,
    "code": "L-06-01",
    "titleAr": "تسهيلات سحب على المكشوف",
    "parentCode": "L-06",
    "statementCode": "L-06"
  },
  {
    "seq": 160,
    "level": 3,
    "code": "L-06-02",
    "titleAr": "قروض بنكية متداولة",
    "parentCode": "L-06",
    "statementCode": "L-06"
  },
  {
    "seq": 161,
    "level": 3,
    "code": "L-06-03",
    "titleAr": "تمويل مرابحة قصير الأجل",
    "parentCode": "L-06",
    "statementCode": "L-06"
  },
  {
    "seq": 162,
    "level": 3,
    "code": "L-06-04",
    "titleAr": "الجزء المتداول من القروض طويلة الأجل",
    "parentCode": "L-06",
    "statementCode": "L-06"
  },
  {
    "seq": 163,
    "level": 3,
    "code": "L-06-05",
    "titleAr": "قروض مساهمين قصيرة الأجل",
    "parentCode": "L-06",
    "statementCode": "L-06"
  },
  {
    "seq": 164,
    "level": 3,
    "code": "L-06-06",
    "titleAr": "التزامات تمويل قصيرة الأجل أخرى",
    "parentCode": "L-06",
    "statementCode": "L-06"
  },
  {
    "seq": 165,
    "level": 2,
    "code": "L-07",
    "titleAr": "مخصصات أخرى",
    "parentCode": "L",
    "statementCode": "L-07"
  },
  {
    "seq": 166,
    "level": 3,
    "code": "L-07-01",
    "titleAr": "مخصص قضايا ومطالبات",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 167,
    "level": 3,
    "code": "L-07-02",
    "titleAr": "مخصص ضمان منتجات",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 168,
    "level": 3,
    "code": "L-07-03",
    "titleAr": "مخصص عقود خاسرة",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 169,
    "level": 3,
    "code": "L-07-04",
    "titleAr": "مخصص إعادة هيكلة",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 170,
    "level": 3,
    "code": "L-07-05",
    "titleAr": "مخصص إزالة وإعادة تأهيل",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 171,
    "level": 3,
    "code": "L-07-06",
    "titleAr": "مخصصات التزامات محتملة مرجحة",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 172,
    "level": 3,
    "code": "L-07-07",
    "titleAr": "مخصص صيانة وضمانات تشغيلية",
    "parentCode": "L-07",
    "statementCode": "L-07"
  },
  {
    "seq": 173,
    "level": 2,
    "code": "L-08",
    "titleAr": "زكاة وضريبة دخل مستحقة",
    "parentCode": "L",
    "statementCode": "L-08"
  },
  {
    "seq": 174,
    "level": 3,
    "code": "L-08-01",
    "titleAr": "زكاة مستحقة السداد",
    "parentCode": "L-08",
    "statementCode": "L-08"
  },
  {
    "seq": 175,
    "level": 3,
    "code": "L-08-02",
    "titleAr": "ضريبة دخل جارية مستحقة",
    "parentCode": "L-08",
    "statementCode": "L-08"
  },
  {
    "seq": 176,
    "level": 3,
    "code": "L-08-03",
    "titleAr": "ضريبة دخل مؤجلة - الالتزام",
    "parentCode": "L-08",
    "statementCode": "L-08"
  },
  {
    "seq": 177,
    "level": 3,
    "code": "L-08-04",
    "titleAr": "مستحقات ضريبية مرتبطة بالدخل",
    "parentCode": "L-08",
    "statementCode": "L-08"
  },
  {
    "seq": 178,
    "level": 2,
    "code": "L-09",
    "titleAr": "مستحق لأطراف ذات علاقة",
    "parentCode": "L",
    "statementCode": "L-09"
  },
  {
    "seq": 179,
    "level": 3,
    "code": "L-09-01",
    "titleAr": "مستحق للشركة الأم",
    "parentCode": "L-09",
    "statementCode": "L-09"
  },
  {
    "seq": 180,
    "level": 3,
    "code": "L-09-02",
    "titleAr": "مستحق لشركة تابعة",
    "parentCode": "L-09",
    "statementCode": "L-09"
  },
  {
    "seq": 181,
    "level": 3,
    "code": "L-09-03",
    "titleAr": "مستحق لشركة شقيقة",
    "parentCode": "L-09",
    "statementCode": "L-09"
  },
  {
    "seq": 182,
    "level": 3,
    "code": "L-09-04",
    "titleAr": "مستحق لشركاء ومساهمين",
    "parentCode": "L-09",
    "statementCode": "L-09"
  },
  {
    "seq": 183,
    "level": 3,
    "code": "L-09-05",
    "titleAr": "تمويل مستحق لأطراف ذات علاقة",
    "parentCode": "L-09",
    "statementCode": "L-09"
  },
  {
    "seq": 184,
    "level": 3,
    "code": "L-09-06",
    "titleAr": "أرصدة دائنة بين شركات المجموعة",
    "parentCode": "L-09",
    "statementCode": "L-09"
  },
  {
    "seq": 185,
    "level": 1,
    "code": "E",
    "titleAr": "حقوق الملكية",
    "parentCode": "",
    "statementCode": ""
  },
  {
    "seq": 186,
    "level": 2,
    "code": "E-01",
    "titleAr": "رأس المال",
    "parentCode": "E",
    "statementCode": "E-01"
  },
  {
    "seq": 187,
    "level": 3,
    "code": "E-01-01",
    "titleAr": "رأس مال مدفوع",
    "parentCode": "E-01",
    "statementCode": "E-01"
  },
  {
    "seq": 188,
    "level": 3,
    "code": "E-01-02",
    "titleAr": "رأس مال غير مدفوع - يتطلب عرض مناسب",
    "parentCode": "E-01",
    "statementCode": "E-01"
  },
  {
    "seq": 189,
    "level": 3,
    "code": "E-01-03",
    "titleAr": "حصص الشركاء",
    "parentCode": "E-01",
    "statementCode": "E-01"
  },
  {
    "seq": 190,
    "level": 3,
    "code": "E-01-04",
    "titleAr": "أسهم عادية مصنفة حقوق ملكية",
    "parentCode": "E-01",
    "statementCode": "E-01"
  },
  {
    "seq": 191,
    "level": 3,
    "code": "E-01-05",
    "titleAr": "علاوة إصدار أسهم",
    "parentCode": "E-01",
    "statementCode": "E-01"
  },
  {
    "seq": 192,
    "level": 3,
    "code": "E-01-06",
    "titleAr": "حسابات مساهمات رأسمالية",
    "parentCode": "E-01",
    "statementCode": "E-01"
  },
  {
    "seq": 193,
    "level": 2,
    "code": "E-02",
    "titleAr": "احتياطيات",
    "parentCode": "E",
    "statementCode": "E-02"
  },
  {
    "seq": 194,
    "level": 3,
    "code": "E-02-01",
    "titleAr": "احتياطي نظامي",
    "parentCode": "E-02",
    "statementCode": "E-02"
  },
  {
    "seq": 195,
    "level": 3,
    "code": "E-02-02",
    "titleAr": "احتياطي اتفاقي",
    "parentCode": "E-02",
    "statementCode": "E-02"
  },
  {
    "seq": 196,
    "level": 3,
    "code": "E-02-03",
    "titleAr": "احتياطي عام",
    "parentCode": "E-02",
    "statementCode": "E-02"
  },
  {
    "seq": 197,
    "level": 3,
    "code": "E-02-04",
    "titleAr": "احتياطي إعادة تقييم ضمن حقوق الملكية",
    "parentCode": "E-02",
    "statementCode": "E-02"
  },
  {
    "seq": 198,
    "level": 3,
    "code": "E-02-05",
    "titleAr": "احتياطي ترجمة عملات أجنبية",
    "parentCode": "E-02",
    "statementCode": "E-02"
  },
  {
    "seq": 199,
    "level": 3,
    "code": "E-02-06",
    "titleAr": "احتياطيات رأس مالية أخرى",
    "parentCode": "E-02",
    "statementCode": "E-02"
  },
  {
    "seq": 200,
    "level": 2,
    "code": "E-03",
    "titleAr": "أرباح مبقاة (خسائر متراكمة)",
    "parentCode": "E",
    "statementCode": "E-03"
  },
  {
    "seq": 201,
    "level": 3,
    "code": "E-03-01",
    "titleAr": "أرباح مبقاة أول المدة",
    "parentCode": "E-03",
    "statementCode": "E-03"
  },
  {
    "seq": 202,
    "level": 3,
    "code": "E-03-02",
    "titleAr": "خسائر متراكمة",
    "parentCode": "E-03",
    "statementCode": "E-03"
  },
  {
    "seq": 203,
    "level": 3,
    "code": "E-03-03",
    "titleAr": "تسويات سنوات سابقة معتمدة",
    "parentCode": "E-03",
    "statementCode": "E-03"
  },
  {
    "seq": 204,
    "level": 3,
    "code": "E-03-04",
    "titleAr": "أرباح مرحلة",
    "parentCode": "E-03",
    "statementCode": "E-03"
  },
  {
    "seq": 205,
    "level": 3,
    "code": "E-03-05",
    "titleAr": "حسابات إقفال نتائج الأعمال",
    "parentCode": "E-03",
    "statementCode": "E-03"
  },
  {
    "seq": 206,
    "level": 2,
    "code": "E-04",
    "titleAr": "توزيعات ومسحوبات السنة",
    "parentCode": "E",
    "statementCode": "E-04"
  },
  {
    "seq": 207,
    "level": 3,
    "code": "E-04-01",
    "titleAr": "توزيعات أرباح معلنة على حقوق الملكية",
    "parentCode": "E-04",
    "statementCode": "E-04"
  },
  {
    "seq": 208,
    "level": 3,
    "code": "E-04-02",
    "titleAr": "مسحوبات شركاء",
    "parentCode": "E-04",
    "statementCode": "E-04"
  },
  {
    "seq": 209,
    "level": 3,
    "code": "E-04-03",
    "titleAr": "توزيعات نقدية على الشركاء",
    "parentCode": "E-04",
    "statementCode": "E-04"
  },
  {
    "seq": 210,
    "level": 3,
    "code": "E-04-04",
    "titleAr": "توزيعات عينية على المساهمين",
    "parentCode": "E-04",
    "statementCode": "E-04"
  },
  {
    "seq": 211,
    "level": 1,
    "code": "O",
    "titleAr": "الدخل الشامل الآخر",
    "parentCode": "",
    "statementCode": ""
  },
  {
    "seq": 212,
    "level": 2,
    "code": "O-01",
    "titleAr": "دخل شامل آخر للسنة",
    "parentCode": "O",
    "statementCode": "O-01"
  },
  {
    "seq": 213,
    "level": 3,
    "code": "O-01-01",
    "titleAr": "فروقات ترجمة عمليات أجنبية",
    "parentCode": "O-01",
    "statementCode": "O-01"
  },
  {
    "seq": 214,
    "level": 3,
    "code": "O-01-02",
    "titleAr": "إعادة قياس منافع الموظفين",
    "parentCode": "O-01",
    "statementCode": "O-01"
  },
  {
    "seq": 215,
    "level": 3,
    "code": "O-01-03",
    "titleAr": "تغيرات القيمة العادلة لاستثمارات الدخل الشامل",
    "parentCode": "O-01",
    "statementCode": "O-01"
  },
  {
    "seq": 216,
    "level": 3,
    "code": "O-01-04",
    "titleAr": "احتياطي تحوط التدفقات النقدية",
    "parentCode": "O-01",
    "statementCode": "O-01"
  },
  {
    "seq": 217,
    "level": 3,
    "code": "O-01-05",
    "titleAr": "فروقات دخل شامل آخر غير معاد تصنيفها",
    "parentCode": "O-01",
    "statementCode": "O-01"
  },
  {
    "seq": 218,
    "level": 3,
    "code": "O-01-06",
    "titleAr": "فروقات دخل شامل آخر قابلة لإعادة التصنيف",
    "parentCode": "O-01",
    "statementCode": "O-01"
  },
  {
    "seq": 219,
    "level": 1,
    "code": "R",
    "titleAr": "الإيرادات والمصروفات",
    "parentCode": "",
    "statementCode": ""
  },
  {
    "seq": 220,
    "level": 2,
    "code": "R-01",
    "titleAr": "الإيرادات",
    "parentCode": "R",
    "statementCode": "R-01"
  },
  {
    "seq": 221,
    "level": 3,
    "code": "R-01-01",
    "titleAr": "مبيعات بضائع محلية",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 222,
    "level": 3,
    "code": "R-01-02",
    "titleAr": "مبيعات بضائع خارجية",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 223,
    "level": 3,
    "code": "R-01-03",
    "titleAr": "إيرادات خدمات استشارية",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 224,
    "level": 3,
    "code": "R-01-04",
    "titleAr": "إيرادات خدمات تشغيلية",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 225,
    "level": 3,
    "code": "R-01-05",
    "titleAr": "إيرادات صيانة وعقود",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 226,
    "level": 3,
    "code": "R-01-06",
    "titleAr": "إيرادات اشتراكات",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 227,
    "level": 3,
    "code": "R-01-07",
    "titleAr": "إيرادات عمولات استقدام",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 228,
    "level": 3,
    "code": "R-01-08",
    "titleAr": "إيرادات خدمات سياحية وسفر",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 229,
    "level": 3,
    "code": "R-01-09",
    "titleAr": "إيرادات خدمات إيواء وإقامة",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 230,
    "level": 3,
    "code": "R-01-10",
    "titleAr": "إيرادات خدمات تقنية وأنظمة",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 231,
    "level": 3,
    "code": "R-01-11",
    "titleAr": "إيرادات عقود مشاريع",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 232,
    "level": 3,
    "code": "R-01-12",
    "titleAr": "إيرادات توريد عمالة",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 233,
    "level": 3,
    "code": "R-01-13",
    "titleAr": "خصومات ومردودات مبيعات",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 234,
    "level": 3,
    "code": "R-01-14",
    "titleAr": "إيرادات خدمات لوجستية",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 235,
    "level": 3,
    "code": "R-01-15",
    "titleAr": "إيرادات التأجير التشغيلي كنشاط رئيسي",
    "parentCode": "R-01",
    "statementCode": "R-01"
  },
  {
    "seq": 236,
    "level": 2,
    "code": "R-02",
    "titleAr": "تكلفة الإيرادات",
    "parentCode": "R",
    "statementCode": "R-02"
  },
  {
    "seq": 237,
    "level": 3,
    "code": "R-02-01",
    "titleAr": "تكلفة البضاعة المباعة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 238,
    "level": 3,
    "code": "R-02-02",
    "titleAr": "تكلفة المواد المباشرة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 239,
    "level": 3,
    "code": "R-02-03",
    "titleAr": "رواتب التشغيل المباشرة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 240,
    "level": 3,
    "code": "R-02-04",
    "titleAr": "تكلفة خدمات مقدمة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 241,
    "level": 3,
    "code": "R-02-05",
    "titleAr": "تكاليف مشاريع وعقود",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 242,
    "level": 3,
    "code": "R-02-06",
    "titleAr": "تكلفة النقل والشحن المباشر",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 243,
    "level": 3,
    "code": "R-02-07",
    "titleAr": "تكلفة توريد العمالة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 244,
    "level": 3,
    "code": "R-02-08",
    "titleAr": "تكلفة خدمات الإيواء",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 245,
    "level": 3,
    "code": "R-02-09",
    "titleAr": "تكلفة الصيانة المباشرة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 246,
    "level": 3,
    "code": "R-02-10",
    "titleAr": "إهلاك ضمن تكلفة الإيرادات",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 247,
    "level": 3,
    "code": "R-02-11",
    "titleAr": "مخصصات المخزون ضمن تكلفة المبيعات",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 248,
    "level": 3,
    "code": "R-02-12",
    "titleAr": "مشتريات مرتبطة بالمبيعات",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 249,
    "level": 3,
    "code": "R-02-13",
    "titleAr": "تكلفة برامج وخدمات تقنية مقدمة",
    "parentCode": "R-02",
    "statementCode": "R-02"
  },
  {
    "seq": 250,
    "level": 2,
    "code": "R-03",
    "titleAr": "مصروفات بيع وتسويق",
    "parentCode": "R",
    "statementCode": "R-03"
  },
  {
    "seq": 251,
    "level": 3,
    "code": "R-03-01",
    "titleAr": "رواتب فريق المبيعات",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 252,
    "level": 3,
    "code": "R-03-02",
    "titleAr": "عمولات بيع وتسويق",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 253,
    "level": 3,
    "code": "R-03-03",
    "titleAr": "إعلانات وتسويق رقمي",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 254,
    "level": 3,
    "code": "R-03-04",
    "titleAr": "حملات ترويجية",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 255,
    "level": 3,
    "code": "R-03-05",
    "titleAr": "معارض ومؤتمرات تجارية",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 256,
    "level": 3,
    "code": "R-03-06",
    "titleAr": "مصاريف توزيع وبيع",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 257,
    "level": 3,
    "code": "R-03-07",
    "titleAr": "مصاريف شحن مبيعات",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 258,
    "level": 3,
    "code": "R-03-08",
    "titleAr": "خصومات ترويجية مصروفية",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 259,
    "level": 3,
    "code": "R-03-09",
    "titleAr": "أتعاب وكلاء بيع",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 260,
    "level": 3,
    "code": "R-03-10",
    "titleAr": "مصاريف علاقات العملاء",
    "parentCode": "R-03",
    "statementCode": "R-03"
  },
  {
    "seq": 261,
    "level": 2,
    "code": "R-04",
    "titleAr": "مصروفات عمومية وإدارية",
    "parentCode": "R",
    "statementCode": "R-04"
  },
  {
    "seq": 262,
    "level": 3,
    "code": "R-04-01",
    "titleAr": "رواتب الإدارة والموظفين",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 263,
    "level": 3,
    "code": "R-04-02",
    "titleAr": "إيجارات إدارية تشغيلية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 264,
    "level": 3,
    "code": "R-04-03",
    "titleAr": "اتصالات وإنترنت",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 265,
    "level": 3,
    "code": "R-04-04",
    "titleAr": "مرافق وكهرباء ومياه",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 266,
    "level": 3,
    "code": "R-04-05",
    "titleAr": "رسوم حكومية إدارية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 267,
    "level": 3,
    "code": "R-04-06",
    "titleAr": "أتعاب مهنية وقانونية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 268,
    "level": 3,
    "code": "R-04-07",
    "titleAr": "أتعاب مراجعة ومحاسبة",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 269,
    "level": 3,
    "code": "R-04-08",
    "titleAr": "تراخيص واشتراكات تشغيلية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 270,
    "level": 3,
    "code": "R-04-09",
    "titleAr": "صيانة إدارية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 271,
    "level": 3,
    "code": "R-04-10",
    "titleAr": "تأمينات تشغيلية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 272,
    "level": 3,
    "code": "R-04-11",
    "titleAr": "مصاريف سفر وانتداب إداري",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 273,
    "level": 3,
    "code": "R-04-12",
    "titleAr": "تدريب وتطوير",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 274,
    "level": 3,
    "code": "R-04-13",
    "titleAr": "مصاريف تقنية المعلومات",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 275,
    "level": 3,
    "code": "R-04-14",
    "titleAr": "قرطاسية ومستلزمات مكتبية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 276,
    "level": 3,
    "code": "R-04-15",
    "titleAr": "مصاريف سيارات إدارية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 277,
    "level": 3,
    "code": "R-04-16",
    "titleAr": "ضيافة ونظافة",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 278,
    "level": 3,
    "code": "R-04-17",
    "titleAr": "رسوم وبنوك غير تمويلية",
    "parentCode": "R-04",
    "statementCode": "R-04"
  },
  {
    "seq": 279,
    "level": 2,
    "code": "R-05",
    "titleAr": "إيرادات أخرى",
    "parentCode": "R",
    "statementCode": "R-05"
  },
  {
    "seq": 280,
    "level": 3,
    "code": "R-05-01",
    "titleAr": "أرباح بيع أصول ثابتة",
    "parentCode": "R-05",
    "statementCode": "R-05"
  },
  {
    "seq": 281,
    "level": 3,
    "code": "R-05-02",
    "titleAr": "إيرادات تعويضات",
    "parentCode": "R-05",
    "statementCode": "R-05"
  },
  {
    "seq": 282,
    "level": 3,
    "code": "R-05-03",
    "titleAr": "إيرادات تأجير عرضية",
    "parentCode": "R-05",
    "statementCode": "R-05"
  },
  {
    "seq": 283,
    "level": 3,
    "code": "R-05-04",
    "titleAr": "أرباح فروق عملة تشغيلية",
    "parentCode": "R-05",
    "statementCode": "R-05"
  },
  {
    "seq": 284,
    "level": 3,
    "code": "R-05-05",
    "titleAr": "مبالغ مستردة غير تشغيلية",
    "parentCode": "R-05",
    "statementCode": "R-05"
  },
  {
    "seq": 285,
    "level": 3,
    "code": "R-05-06",
    "titleAr": "إيرادات أخرى غير اعتيادية",
    "parentCode": "R-05",
    "statementCode": "R-05"
  },
  {
    "seq": 286,
    "level": 2,
    "code": "R-06",
    "titleAr": "مصروفات أخرى",
    "parentCode": "R",
    "statementCode": "R-06"
  },
  {
    "seq": 287,
    "level": 3,
    "code": "R-06-01",
    "titleAr": "خسائر بيع أصول ثابتة",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 288,
    "level": 3,
    "code": "R-06-02",
    "titleAr": "خسائر فروق عملة",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 289,
    "level": 3,
    "code": "R-06-03",
    "titleAr": "خسائر هبوط قيمة",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 290,
    "level": 3,
    "code": "R-06-04",
    "titleAr": "تكاليف إعادة هيكلة",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 291,
    "level": 3,
    "code": "R-06-05",
    "titleAr": "غرامات وتعويضات",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 292,
    "level": 3,
    "code": "R-06-06",
    "titleAr": "مصروفات ومخصصات أخرى",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 293,
    "level": 3,
    "code": "R-06-07",
    "titleAr": "خسائر مطالبات وتسويات",
    "parentCode": "R-06",
    "statementCode": "R-06"
  },
  {
    "seq": 294,
    "level": 2,
    "code": "R-07",
    "titleAr": "تكاليف تمويل",
    "parentCode": "R",
    "statementCode": "R-07"
  },
  {
    "seq": 295,
    "level": 3,
    "code": "R-07-01",
    "titleAr": "فوائد قروض بنكية",
    "parentCode": "R-07",
    "statementCode": "R-07"
  },
  {
    "seq": 296,
    "level": 3,
    "code": "R-07-02",
    "titleAr": "تكاليف تمويل مرابحة",
    "parentCode": "R-07",
    "statementCode": "R-07"
  },
  {
    "seq": 297,
    "level": 3,
    "code": "R-07-03",
    "titleAr": "فوائد التزامات إيجار",
    "parentCode": "R-07",
    "statementCode": "R-07"
  },
  {
    "seq": 298,
    "level": 3,
    "code": "R-07-04",
    "titleAr": "عمولات تسهيلات تمويل",
    "parentCode": "R-07",
    "statementCode": "R-07"
  },
  {
    "seq": 299,
    "level": 3,
    "code": "R-07-05",
    "titleAr": "أتعاب إصدار تمويل مؤهلة",
    "parentCode": "R-07",
    "statementCode": "R-07"
  },
  {
    "seq": 300,
    "level": 3,
    "code": "R-07-06",
    "titleAr": "خسائر إعادة قياس التزامات تمويلية",
    "parentCode": "R-07",
    "statementCode": "R-07"
  },
  {
    "seq": 301,
    "level": 2,
    "code": "R-08",
    "titleAr": "إيرادات تمويل",
    "parentCode": "R",
    "statementCode": "R-08"
  },
  {
    "seq": 302,
    "level": 3,
    "code": "R-08-01",
    "titleAr": "إيرادات فوائد وودائع",
    "parentCode": "R-08",
    "statementCode": "R-08"
  },
  {
    "seq": 303,
    "level": 3,
    "code": "R-08-02",
    "titleAr": "إيرادات عائد صكوك",
    "parentCode": "R-08",
    "statementCode": "R-08"
  },
  {
    "seq": 304,
    "level": 3,
    "code": "R-08-03",
    "titleAr": "إيرادات تمويل عملاء",
    "parentCode": "R-08",
    "statementCode": "R-08"
  },
  {
    "seq": 305,
    "level": 3,
    "code": "R-08-04",
    "titleAr": "أرباح استثمارات تمويلية",
    "parentCode": "R-08",
    "statementCode": "R-08"
  },
  {
    "seq": 306,
    "level": 3,
    "code": "R-08-05",
    "titleAr": "خصومات تمويل مكتسبة",
    "parentCode": "R-08",
    "statementCode": "R-08"
  },
  {
    "seq": 307,
    "level": 2,
    "code": "R-09",
    "titleAr": "زكاة وضريبة دخل",
    "parentCode": "R",
    "statementCode": "R-09"
  },
  {
    "seq": 308,
    "level": 3,
    "code": "R-09-01",
    "titleAr": "مصروف زكاة السنة",
    "parentCode": "R-09",
    "statementCode": "R-09"
  },
  {
    "seq": 309,
    "level": 3,
    "code": "R-09-02",
    "titleAr": "مصروف ضريبة دخل جارية",
    "parentCode": "R-09",
    "statementCode": "R-09"
  },
  {
    "seq": 310,
    "level": 3,
    "code": "R-09-03",
    "titleAr": "مصروف ضريبة دخل مؤجلة",
    "parentCode": "R-09",
    "statementCode": "R-09"
  },
  {
    "seq": 311,
    "level": 3,
    "code": "R-09-04",
    "titleAr": "تسويات زكاة وضريبة دخل لسنوات سابقة",
    "parentCode": "R-09",
    "statementCode": "R-09"
  },
  {
    "seq": 312,
    "level": 3,
    "code": "R-09-05",
    "titleAr": "مخصص ضريبة أرباح",
    "parentCode": "R-09",
    "statementCode": "R-09"
  },
  {
    "seq": 313,
    "level": 2,
    "code": "R-10",
    "titleAr": "إهلاك وإطفاء",
    "parentCode": "R",
    "statementCode": "R-10"
  },
  {
    "seq": 314,
    "level": 3,
    "code": "R-10-01",
    "titleAr": "إهلاك مبانٍ ومعدات ضمن التشغيل",
    "parentCode": "R-10",
    "statementCode": "R-10"
  },
  {
    "seq": 315,
    "level": 3,
    "code": "R-10-02",
    "titleAr": "إهلاك سيارات ضمن الإدارة",
    "parentCode": "R-10",
    "statementCode": "R-10"
  },
  {
    "seq": 316,
    "level": 3,
    "code": "R-10-03",
    "titleAr": "إهلاك أجهزة ومعدات",
    "parentCode": "R-10",
    "statementCode": "R-10"
  },
  {
    "seq": 317,
    "level": 3,
    "code": "R-10-04",
    "titleAr": "إطفاء برامج وتراخيص",
    "parentCode": "R-10",
    "statementCode": "R-10"
  },
  {
    "seq": 318,
    "level": 3,
    "code": "R-10-05",
    "titleAr": "إهلاك أصول حق الاستخدام",
    "parentCode": "R-10",
    "statementCode": "R-10"
  },
  {
    "seq": 319,
    "level": 3,
    "code": "R-10-06",
    "titleAr": "إطفاء أصول غير ملموسة",
    "parentCode": "R-10",
    "statementCode": "R-10"
  }
];

export const EXCEL_SEARCH_KEYWORDS: ExcelSearchKeywordItem[] = [
  {
    "seq": 1,
    "keyword": "مصروف الزكاة",
    "code": "R-09",
    "importFieldNum": 6,
    "importHeaderKeyword": "أول المدة"
  },
  {
    "seq": 2,
    "keyword": "مصروف زكاة",
    "code": "R-09",
    "importFieldNum": 6,
    "importHeaderKeyword": "اول المدة"
  },
  {
    "seq": 3,
    "keyword": "مصروف ضريبة دخل",
    "code": "R-09",
    "importFieldNum": 6,
    "importHeaderKeyword": "افتتاح"
  },
  {
    "seq": 4,
    "keyword": "income tax expense",
    "code": "R-09",
    "importFieldNum": 6,
    "importHeaderKeyword": "opening"
  },
  {
    "seq": 5,
    "keyword": "zakat expense",
    "code": "R-09",
    "importFieldNum": 6,
    "importHeaderKeyword": "previous"
  },
  {
    "seq": 6,
    "keyword": "مصروف إهلاك",
    "code": "R-10",
    "importFieldNum": 3,
    "importHeaderKeyword": "مدين"
  },
  {
    "seq": 7,
    "keyword": "مصروف اهلاك",
    "code": "R-10",
    "importFieldNum": 3,
    "importHeaderKeyword": "debit"
  },
  {
    "seq": 8,
    "keyword": "مصروف إطفاء",
    "code": "R-10",
    "importFieldNum": 4,
    "importHeaderKeyword": "دائن"
  },
  {
    "seq": 9,
    "keyword": "مصروف اطفاء",
    "code": "R-10",
    "importFieldNum": 4,
    "importHeaderKeyword": "credit"
  },
  {
    "seq": 10,
    "keyword": "مصروف استهلاك",
    "code": "R-10",
    "importFieldNum": 2,
    "importHeaderKeyword": "اسم"
  },
  {
    "seq": 11,
    "keyword": "مصروف خسائر",
    "code": "R-04",
    "importFieldNum": 2,
    "importHeaderKeyword": "البيان"
  },
  {
    "seq": 12,
    "keyword": "مصروف ديون",
    "code": "R-04",
    "importFieldNum": 2,
    "importHeaderKeyword": "description"
  },
  {
    "seq": 13,
    "keyword": "ديون معدومة",
    "code": "R-04",
    "importFieldNum": 2,
    "importHeaderKeyword": "account name"
  },
  {
    "seq": 14,
    "keyword": "مصروف مكافأة",
    "code": "R-04",
    "importFieldNum": 2,
    "importHeaderKeyword": "name"
  },
  {
    "seq": 15,
    "keyword": "مصروف نهاية الخدمة",
    "code": "R-04",
    "importFieldNum": 1,
    "importHeaderKeyword": "رقم"
  },
  {
    "seq": 16,
    "keyword": "مصروف مخصص",
    "code": "R-04",
    "importFieldNum": 1,
    "importHeaderKeyword": "كود"
  },
  {
    "seq": 17,
    "keyword": "مجمع إهلاك حق",
    "code": "A-05",
    "importFieldNum": 1,
    "importHeaderKeyword": "code"
  },
  {
    "seq": 18,
    "keyword": "مجمع اهلاك حق",
    "code": "A-05",
    "importFieldNum": 1,
    "importHeaderKeyword": "account no"
  },
  {
    "seq": 19,
    "keyword": "مجمع إهلاك الاستخدام",
    "code": "A-05",
    "importFieldNum": 1,
    "importHeaderKeyword": "acc no"
  },
  {
    "seq": 20,
    "keyword": "مجمع إهلاك",
    "code": "A-02",
    "importFieldNum": 1,
    "importHeaderKeyword": "account number"
  },
  {
    "seq": 21,
    "keyword": "مجمع اهلاك",
    "code": "A-02",
    "importFieldNum": 5,
    "importHeaderKeyword": "رصيد"
  },
  {
    "seq": 22,
    "keyword": "مجمع الإهلاك",
    "code": "A-02",
    "importFieldNum": 5,
    "importHeaderKeyword": "balance"
  },
  {
    "seq": 23,
    "keyword": "مجمع الاهلاك",
    "code": "A-02",
    "importFieldNum": 5,
    "importHeaderKeyword": "net"
  },
  {
    "seq": 24,
    "keyword": "accumulated dep",
    "code": "A-02"
  },
  {
    "seq": 25,
    "keyword": "مجمع إطفاء",
    "code": "A-03"
  },
  {
    "seq": 26,
    "keyword": "مجمع اطفاء",
    "code": "A-03"
  },
  {
    "seq": 27,
    "keyword": "accumulated amort",
    "code": "A-03"
  },
  {
    "seq": 28,
    "keyword": "حق استخدام",
    "code": "A-05"
  },
  {
    "seq": 29,
    "keyword": "حق الاستخدام",
    "code": "A-05"
  },
  {
    "seq": 30,
    "keyword": "right of use",
    "code": "A-05"
  },
  {
    "seq": 31,
    "keyword": "right-of-use",
    "code": "A-05"
  },
  {
    "seq": 32,
    "keyword": "التزامات عقود",
    "code": "L-02"
  },
  {
    "seq": 33,
    "keyword": "التزام عقود",
    "code": "L-02"
  },
  {
    "seq": 34,
    "keyword": "التزامات إيجار",
    "code": "L-02"
  },
  {
    "seq": 35,
    "keyword": "التزام إيجار",
    "code": "L-02"
  },
  {
    "seq": 36,
    "keyword": "التزامات ايجار",
    "code": "L-02"
  },
  {
    "seq": 37,
    "keyword": "التزام ايجار",
    "code": "L-02"
  },
  {
    "seq": 38,
    "keyword": "lease liab",
    "code": "L-02"
  },
  {
    "seq": 39,
    "keyword": "إهلاك",
    "code": "R-10"
  },
  {
    "seq": 40,
    "keyword": "اهلاك",
    "code": "R-10"
  },
  {
    "seq": 41,
    "keyword": "إطفاء",
    "code": "R-10"
  },
  {
    "seq": 42,
    "keyword": "اطفاء",
    "code": "R-10"
  },
  {
    "seq": 43,
    "keyword": "استهلاك",
    "code": "R-10"
  },
  {
    "seq": 44,
    "keyword": "depreciation",
    "code": "R-10"
  },
  {
    "seq": 45,
    "keyword": "amortization",
    "code": "R-10"
  },
  {
    "seq": 46,
    "keyword": "amortisation",
    "code": "R-10"
  },
  {
    "seq": 47,
    "keyword": "فوائد قروض",
    "code": "R-07"
  },
  {
    "seq": 48,
    "keyword": "فوائد التزامات",
    "code": "R-07"
  },
  {
    "seq": 49,
    "keyword": "مصروف فوائد",
    "code": "R-07"
  },
  {
    "seq": 50,
    "keyword": "أعباء تمويل",
    "code": "R-07"
  },
  {
    "seq": 51,
    "keyword": "اعباء تمويل",
    "code": "R-07"
  },
  {
    "seq": 52,
    "keyword": "تكاليف تمويل",
    "code": "R-07"
  },
  {
    "seq": 53,
    "keyword": "interest expense",
    "code": "R-07"
  },
  {
    "seq": 54,
    "keyword": "finance cost",
    "code": "R-07"
  },
  {
    "seq": 55,
    "keyword": "فوائد مدينة",
    "code": "R-07"
  },
  {
    "seq": 56,
    "keyword": "إيرادات فوائد",
    "code": "R-08"
  },
  {
    "seq": 57,
    "keyword": "ايرادات فوائد",
    "code": "R-08"
  },
  {
    "seq": 58,
    "keyword": "فوائد دائنة",
    "code": "R-08"
  },
  {
    "seq": 59,
    "keyword": "إيرادات تمويل",
    "code": "R-08"
  },
  {
    "seq": 60,
    "keyword": "interest income",
    "code": "R-08"
  },
  {
    "seq": 61,
    "keyword": "تكلفة المبيعات",
    "code": "R-02"
  },
  {
    "seq": 62,
    "keyword": "تكلفة البضاعة",
    "code": "R-02"
  },
  {
    "seq": 63,
    "keyword": "تكلفة الإيرادات",
    "code": "R-02"
  },
  {
    "seq": 64,
    "keyword": "تكلفة الايرادات",
    "code": "R-02"
  },
  {
    "seq": 65,
    "keyword": "cost of",
    "code": "R-02"
  },
  {
    "seq": 66,
    "keyword": "مشتريات",
    "code": "R-02"
  },
  {
    "seq": 67,
    "keyword": "إيرادات أخرى",
    "code": "R-05"
  },
  {
    "seq": 68,
    "keyword": "ايرادات اخرى",
    "code": "R-05"
  },
  {
    "seq": 69,
    "keyword": "إيرادات متنوعة",
    "code": "R-05"
  },
  {
    "seq": 70,
    "keyword": "ايرادات متنوعة",
    "code": "R-05"
  },
  {
    "seq": 71,
    "keyword": "other income",
    "code": "R-05"
  },
  {
    "seq": 72,
    "keyword": "أرباح بيع أصول",
    "code": "R-05"
  },
  {
    "seq": 73,
    "keyword": "ارباح بيع اصول",
    "code": "R-05"
  },
  {
    "seq": 74,
    "keyword": "مردودات مبيعات",
    "code": "R-01"
  },
  {
    "seq": 75,
    "keyword": "مبيعات",
    "code": "R-01"
  },
  {
    "seq": 76,
    "keyword": "إيرادات",
    "code": "R-01"
  },
  {
    "seq": 77,
    "keyword": "ايرادات",
    "code": "R-01"
  },
  {
    "seq": 78,
    "keyword": "revenue",
    "code": "R-01"
  },
  {
    "seq": 79,
    "keyword": "sales",
    "code": "R-01"
  },
  {
    "seq": 80,
    "keyword": "تسويق",
    "code": "R-03"
  },
  {
    "seq": 81,
    "keyword": "دعاية",
    "code": "R-03"
  },
  {
    "seq": 82,
    "keyword": "إعلان",
    "code": "R-03"
  },
  {
    "seq": 83,
    "keyword": "اعلان",
    "code": "R-03"
  },
  {
    "seq": 84,
    "keyword": "عمولات بيع",
    "code": "R-03"
  },
  {
    "seq": 85,
    "keyword": "marketing",
    "code": "R-03"
  },
  {
    "seq": 86,
    "keyword": "advertis",
    "code": "R-03"
  },
  {
    "seq": 87,
    "keyword": "دخل شامل",
    "code": "O-01"
  },
  {
    "seq": 88,
    "keyword": "إعادة قياس",
    "code": "O-01"
  },
  {
    "seq": 89,
    "keyword": "اعادة قياس",
    "code": "O-01"
  },
  {
    "seq": 90,
    "keyword": "other comprehensive",
    "code": "O-01"
  },
  {
    "seq": 91,
    "keyword": "جاري الشريك",
    "code": "L-09"
  },
  {
    "seq": 92,
    "keyword": "جاري الشركاء",
    "code": "L-09"
  },
  {
    "seq": 93,
    "keyword": "جاري المساهم",
    "code": "L-09"
  },
  {
    "seq": 94,
    "keyword": "جاري المالك",
    "code": "L-09"
  },
  {
    "seq": 95,
    "keyword": "أطراف ذات علاقة",
    "code": "L-09"
  },
  {
    "seq": 96,
    "keyword": "اطراف ذات علاقة",
    "code": "L-09"
  },
  {
    "seq": 97,
    "keyword": "related part",
    "code": "L-09"
  },
  {
    "seq": 98,
    "keyword": "مدفوعة مقدما",
    "code": "A-09"
  },
  {
    "seq": 99,
    "keyword": "مدفوعة مقدماً",
    "code": "A-09"
  },
  {
    "seq": 100,
    "keyword": "مصروفات مقدمة",
    "code": "A-09"
  },
  {
    "seq": 101,
    "keyword": "دفعات مقدمة",
    "code": "A-09"
  },
  {
    "seq": 102,
    "keyword": "سلف",
    "code": "A-09"
  },
  {
    "seq": 103,
    "keyword": "عهد",
    "code": "A-09"
  },
  {
    "seq": 104,
    "keyword": "تأمين مدفوع",
    "code": "A-09"
  },
  {
    "seq": 105,
    "keyword": "prepaid",
    "code": "A-09"
  },
  {
    "seq": 106,
    "keyword": "advance",
    "code": "A-09"
  },
  {
    "seq": 107,
    "keyword": "أرصدة مدينة",
    "code": "A-09"
  },
  {
    "seq": 108,
    "keyword": "ارصدة مدينة",
    "code": "A-09"
  },
  {
    "seq": 109,
    "keyword": "مستحقة",
    "code": "L-05"
  },
  {
    "seq": 110,
    "keyword": "مستحق",
    "code": "L-05"
  },
  {
    "seq": 111,
    "keyword": "ضريبة القيمة المضافة",
    "code": "L-05"
  },
  {
    "seq": 112,
    "keyword": "القيمة المضافة",
    "code": "L-05"
  },
  {
    "seq": 113,
    "keyword": "إيرادات مقدمة",
    "code": "L-05"
  },
  {
    "seq": 114,
    "keyword": "ايرادات مقدمة",
    "code": "L-05"
  },
  {
    "seq": 115,
    "keyword": "accrued",
    "code": "L-05"
  },
  {
    "seq": 116,
    "keyword": "vat payable",
    "code": "L-05"
  },
  {
    "seq": 117,
    "keyword": "output vat",
    "code": "L-05"
  },
  {
    "seq": 118,
    "keyword": "input vat",
    "code": "L-05"
  },
  {
    "seq": 119,
    "keyword": "value added",
    "code": "L-05"
  },
  {
    "seq": 120,
    "keyword": "أرصدة دائنة",
    "code": "L-05"
  },
  {
    "seq": 121,
    "keyword": "ارصدة دائنة",
    "code": "L-05"
  },
  {
    "seq": 122,
    "keyword": "نهاية الخدمة",
    "code": "L-03"
  },
  {
    "seq": 123,
    "keyword": "مكافأة نهاية",
    "code": "L-03"
  },
  {
    "seq": 124,
    "keyword": "end of service",
    "code": "L-03"
  },
  {
    "seq": 125,
    "keyword": "eosb",
    "code": "L-03"
  },
  {
    "seq": 126,
    "keyword": "مخصص خسائر",
    "code": "A-08"
  },
  {
    "seq": 127,
    "keyword": "خسائر ائتمانية",
    "code": "A-08"
  },
  {
    "seq": 128,
    "keyword": "مخصص ديون",
    "code": "A-08"
  },
  {
    "seq": 129,
    "keyword": "ديون مشكوك",
    "code": "A-08"
  },
  {
    "seq": 130,
    "keyword": "expected credit",
    "code": "A-08"
  },
  {
    "seq": 131,
    "keyword": "allowance for",
    "code": "A-08"
  },
  {
    "seq": 132,
    "keyword": "مخصص زكاة",
    "code": "L-08"
  },
  {
    "seq": 133,
    "keyword": "مخصص الزكاة",
    "code": "L-08"
  },
  {
    "seq": 134,
    "keyword": "زكاة مستحقة",
    "code": "L-08"
  },
  {
    "seq": 135,
    "keyword": "ضريبة دخل مستحقة",
    "code": "L-08"
  },
  {
    "seq": 136,
    "keyword": "مخصص ضريبة",
    "code": "L-08"
  },
  {
    "seq": 137,
    "keyword": "zakat payable",
    "code": "L-08"
  },
  {
    "seq": 138,
    "keyword": "مخصص",
    "code": "L-07"
  },
  {
    "seq": 139,
    "keyword": "provision",
    "code": "L-07"
  },
  {
    "seq": 140,
    "keyword": "قرض بنكي قصير",
    "code": "L-06"
  },
  {
    "seq": 141,
    "keyword": "قروض بنكية قصيرة",
    "code": "L-06"
  },
  {
    "seq": 142,
    "keyword": "تمويل قصير",
    "code": "L-06"
  },
  {
    "seq": 143,
    "keyword": "قرض قصير",
    "code": "L-06"
  },
  {
    "seq": 144,
    "keyword": "قروض قصيرة",
    "code": "L-06"
  },
  {
    "seq": 145,
    "keyword": "تسهيلات",
    "code": "L-06"
  },
  {
    "seq": 146,
    "keyword": "سحب على المكشوف",
    "code": "L-06"
  },
  {
    "seq": 147,
    "keyword": "مكشوف",
    "code": "L-06"
  },
  {
    "seq": 148,
    "keyword": "overdraft",
    "code": "L-06"
  },
  {
    "seq": 149,
    "keyword": "قرض",
    "code": "L-01"
  },
  {
    "seq": 150,
    "keyword": "قروض",
    "code": "L-01"
  },
  {
    "seq": 151,
    "keyword": "تمويل طويل",
    "code": "L-01"
  },
  {
    "seq": 152,
    "keyword": "loan",
    "code": "L-01"
  },
  {
    "seq": 153,
    "keyword": "borrowing",
    "code": "L-01"
  },
  {
    "seq": 154,
    "keyword": "رأس المال",
    "code": "E-01"
  },
  {
    "seq": 155,
    "keyword": "رأس مال",
    "code": "E-01"
  },
  {
    "seq": 156,
    "keyword": "capital",
    "code": "E-01"
  },
  {
    "seq": 157,
    "keyword": "مبقاة",
    "code": "E-03"
  },
  {
    "seq": 158,
    "keyword": "محتجزة",
    "code": "E-03"
  },
  {
    "seq": 159,
    "keyword": "أرباح مبقاة",
    "code": "E-03"
  },
  {
    "seq": 160,
    "keyword": "ارباح مبقاة",
    "code": "E-03"
  },
  {
    "seq": 161,
    "keyword": "أرباح محتجزة",
    "code": "E-03"
  },
  {
    "seq": 162,
    "keyword": "ارباح محتجزة",
    "code": "E-03"
  },
  {
    "seq": 163,
    "keyword": "خسائر مرحلة",
    "code": "E-03"
  },
  {
    "seq": 164,
    "keyword": "أرباح مرحلة",
    "code": "E-03"
  },
  {
    "seq": 165,
    "keyword": "ارباح مرحلة",
    "code": "E-03"
  },
  {
    "seq": 166,
    "keyword": "retained",
    "code": "E-03"
  },
  {
    "seq": 167,
    "keyword": "احتياطي",
    "code": "E-02"
  },
  {
    "seq": 168,
    "keyword": "reserve",
    "code": "E-02"
  },
  {
    "seq": 169,
    "keyword": "مسحوبات",
    "code": "E-04"
  },
  {
    "seq": 170,
    "keyword": "توزيعات",
    "code": "E-04"
  },
  {
    "seq": 171,
    "keyword": "drawings",
    "code": "E-04"
  },
  {
    "seq": 172,
    "keyword": "dividend",
    "code": "E-04"
  },
  {
    "seq": 173,
    "keyword": "برامج",
    "code": "A-03"
  },
  {
    "seq": 174,
    "keyword": "برمجيات",
    "code": "A-03"
  },
  {
    "seq": 175,
    "keyword": "شهرة",
    "code": "A-03"
  },
  {
    "seq": 176,
    "keyword": "علامة تجارية",
    "code": "A-03"
  },
  {
    "seq": 177,
    "keyword": "software",
    "code": "A-03"
  },
  {
    "seq": 178,
    "keyword": "goodwill",
    "code": "A-03"
  },
  {
    "seq": 179,
    "keyword": "intangible",
    "code": "A-03"
  },
  {
    "seq": 180,
    "keyword": "استثمار",
    "code": "A-04"
  },
  {
    "seq": 181,
    "keyword": "investment",
    "code": "A-04"
  },
  {
    "seq": 182,
    "keyword": "أراضي",
    "code": "A-01"
  },
  {
    "seq": 183,
    "keyword": "اراضي",
    "code": "A-01"
  },
  {
    "seq": 184,
    "keyword": "مباني",
    "code": "A-01"
  },
  {
    "seq": 185,
    "keyword": "سيارات",
    "code": "A-01"
  },
  {
    "seq": 186,
    "keyword": "مركبات",
    "code": "A-01"
  },
  {
    "seq": 187,
    "keyword": "أثاث",
    "code": "A-01"
  },
  {
    "seq": 188,
    "keyword": "اثاث",
    "code": "A-01"
  },
  {
    "seq": 189,
    "keyword": "معدات",
    "code": "A-01"
  },
  {
    "seq": 190,
    "keyword": "آلات",
    "code": "A-01"
  },
  {
    "seq": 191,
    "keyword": "الآلات",
    "code": "A-01"
  },
  {
    "seq": 192,
    "keyword": "الالات",
    "code": "A-01"
  },
  {
    "seq": 193,
    "keyword": "machin",
    "code": "A-01"
  },
  {
    "seq": 194,
    "keyword": "أجهزة",
    "code": "A-01"
  },
  {
    "seq": 195,
    "keyword": "اجهزة",
    "code": "A-01"
  },
  {
    "seq": 196,
    "keyword": "تحسينات",
    "code": "A-01"
  },
  {
    "seq": 197,
    "keyword": "أصول ثابتة",
    "code": "A-01"
  },
  {
    "seq": 198,
    "keyword": "اصول ثابتة",
    "code": "A-01"
  },
  {
    "seq": 199,
    "keyword": "fixed asset",
    "code": "A-01"
  },
  {
    "seq": 200,
    "keyword": "equipment",
    "code": "A-01"
  },
  {
    "seq": 201,
    "keyword": "vehicle",
    "code": "A-01"
  },
  {
    "seq": 202,
    "keyword": "building",
    "code": "A-01"
  },
  {
    "seq": 203,
    "keyword": "furniture",
    "code": "A-01"
  },
  {
    "seq": 204,
    "keyword": "property",
    "code": "A-01"
  },
  {
    "seq": 205,
    "keyword": "مخزون",
    "code": "A-06"
  },
  {
    "seq": 206,
    "keyword": "بضاعة",
    "code": "A-06"
  },
  {
    "seq": 207,
    "keyword": "مستودع",
    "code": "A-06"
  },
  {
    "seq": 208,
    "keyword": "inventory",
    "code": "A-06"
  },
  {
    "seq": 209,
    "keyword": "stock",
    "code": "A-06"
  },
  {
    "seq": 210,
    "keyword": "عملاء",
    "code": "A-07"
  },
  {
    "seq": 211,
    "keyword": "عميل",
    "code": "A-07"
  },
  {
    "seq": 212,
    "keyword": "مدينون",
    "code": "A-07"
  },
  {
    "seq": 213,
    "keyword": "ذمم مدينة",
    "code": "A-07"
  },
  {
    "seq": 214,
    "keyword": "أوراق قبض",
    "code": "A-07"
  },
  {
    "seq": 215,
    "keyword": "اوراق قبض",
    "code": "A-07"
  },
  {
    "seq": 216,
    "keyword": "receivable",
    "code": "A-07"
  },
  {
    "seq": 217,
    "keyword": "customer",
    "code": "A-07"
  },
  {
    "seq": 218,
    "keyword": "debtors",
    "code": "A-07"
  },
  {
    "seq": 219,
    "keyword": "موردون",
    "code": "L-04"
  },
  {
    "seq": 220,
    "keyword": "موردين",
    "code": "L-04"
  },
  {
    "seq": 221,
    "keyword": "مورد",
    "code": "L-04"
  },
  {
    "seq": 222,
    "keyword": "دائنون",
    "code": "L-04"
  },
  {
    "seq": 223,
    "keyword": "ذمم دائنة",
    "code": "L-04"
  },
  {
    "seq": 224,
    "keyword": "أوراق دفع",
    "code": "L-04"
  },
  {
    "seq": 225,
    "keyword": "اوراق دفع",
    "code": "L-04"
  },
  {
    "seq": 226,
    "keyword": "payable",
    "code": "L-04"
  },
  {
    "seq": 227,
    "keyword": "supplier",
    "code": "L-04"
  },
  {
    "seq": 228,
    "keyword": "creditors",
    "code": "L-04"
  },
  {
    "seq": 229,
    "keyword": "صندوق",
    "code": "A-10"
  },
  {
    "seq": 230,
    "keyword": "خزينة",
    "code": "A-10"
  },
  {
    "seq": 231,
    "keyword": "نقد",
    "code": "A-10"
  },
  {
    "seq": 232,
    "keyword": "بنك",
    "code": "A-10"
  },
  {
    "seq": 233,
    "keyword": "مصرف",
    "code": "A-10"
  },
  {
    "seq": 234,
    "keyword": "الراجحي",
    "code": "A-10"
  },
  {
    "seq": 235,
    "keyword": "الأهلي",
    "code": "A-10"
  },
  {
    "seq": 236,
    "keyword": "الاهلي",
    "code": "A-10"
  },
  {
    "seq": 237,
    "keyword": "الانماء",
    "code": "A-10"
  },
  {
    "seq": 238,
    "keyword": "الإنماء",
    "code": "A-10"
  },
  {
    "seq": 239,
    "keyword": "الرياض",
    "code": "A-10"
  },
  {
    "seq": 240,
    "keyword": "cash",
    "code": "A-10"
  },
  {
    "seq": 241,
    "keyword": "bank",
    "code": "A-10"
  },
  {
    "seq": 242,
    "keyword": "مصروف",
    "code": "R-04"
  },
  {
    "seq": 243,
    "keyword": "رواتب",
    "code": "R-04"
  },
  {
    "seq": 244,
    "keyword": "أجور",
    "code": "R-04"
  },
  {
    "seq": 245,
    "keyword": "اجور",
    "code": "R-04"
  },
  {
    "seq": 246,
    "keyword": "إيجار",
    "code": "R-04"
  },
  {
    "seq": 247,
    "keyword": "ايجار",
    "code": "R-04"
  },
  {
    "seq": 248,
    "keyword": "كهرباء",
    "code": "R-04"
  },
  {
    "seq": 249,
    "keyword": "اتصالات",
    "code": "R-04"
  },
  {
    "seq": 250,
    "keyword": "رسوم",
    "code": "R-04"
  },
  {
    "seq": 251,
    "keyword": "صيانة",
    "code": "R-04"
  },
  {
    "seq": 252,
    "keyword": "ضيافة",
    "code": "R-04"
  },
  {
    "seq": 253,
    "keyword": "سفر",
    "code": "R-04"
  },
  {
    "seq": 254,
    "keyword": "expense",
    "code": "R-04"
  },
  {
    "seq": 255,
    "keyword": "salar",
    "code": "R-04"
  },
  {
    "seq": 256,
    "keyword": "rent expense",
    "code": "R-04"
  },
  {
    "seq": 257,
    "keyword": "office rent",
    "code": "R-04"
  }
];

export const ARABIC_CODES_GUIDE: ArabicCodeGuideItem[] = [
  {
    "code": "A-01",
    "nameAr": "ممتلكات وآلات ومعدات (بالتكلفة)",
    "statementType": "مركز مالي - أصول غير متداولة",
    "naturalBalance": "D",
    "manualChoiceLabel": "A-01 (ممتلكات وآلات ومعدات (بالتكلفة))"
  },
  {
    "code": "A-02",
    "nameAr": "مجمع إهلاك الممتلكات والآلات",
    "statementType": "مركز مالي - أصول غير متداولة",
    "naturalBalance": "C",
    "manualChoiceLabel": "A-02 (مجمع إهلاك الممتلكات والآلات)"
  },
  {
    "code": "A-03",
    "nameAr": "أصول غير ملموسة (بالصافي)",
    "statementType": "مركز مالي - أصول غير متداولة",
    "naturalBalance": "-",
    "manualChoiceLabel": "A-03 (أصول غير ملموسة (بالصافي))"
  },
  {
    "code": "A-04",
    "nameAr": "استثمارات وأصول مالية طويلة الأجل",
    "statementType": "مركز مالي - أصول غير متداولة",
    "naturalBalance": "D",
    "manualChoiceLabel": "A-04 (استثمارات وأصول مالية طويلة الأجل)"
  },
  {
    "code": "A-05",
    "nameAr": "أصول حق الاستخدام (بالصافي)",
    "statementType": "مركز مالي - أصول غير متداولة",
    "naturalBalance": "-",
    "manualChoiceLabel": "A-05 (أصول حق الاستخدام (بالصافي))"
  },
  {
    "code": "A-06",
    "nameAr": "مخزون",
    "statementType": "مركز مالي - أصول متداولة",
    "naturalBalance": "D",
    "manualChoiceLabel": "A-06 (مخزون)"
  },
  {
    "code": "A-07",
    "nameAr": "ذمم مدينة تجارية",
    "statementType": "مركز مالي - أصول متداولة",
    "naturalBalance": "D",
    "manualChoiceLabel": "A-07 (ذمم مدينة تجارية)"
  },
  {
    "code": "A-08",
    "nameAr": "مخصص خسائر ائتمانية متوقعة",
    "statementType": "مركز مالي - أصول متداولة",
    "naturalBalance": "C",
    "manualChoiceLabel": "A-08 (مخصص خسائر ائتمانية متوقعة)"
  },
  {
    "code": "A-09",
    "nameAr": "مدفوعات مقدمة وأرصدة مدينة أخرى",
    "statementType": "مركز مالي - أصول متداولة",
    "naturalBalance": "D",
    "manualChoiceLabel": "A-09 (مدفوعات مقدمة وأرصدة مدينة أخرى)"
  },
  {
    "code": "A-10",
    "nameAr": "نقد وما في حكمه",
    "statementType": "مركز مالي - أصول متداولة",
    "naturalBalance": "D",
    "manualChoiceLabel": "A-10 (نقد وما في حكمه)"
  },
  {
    "code": "L-01",
    "nameAr": "قروض طويلة الأجل",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-01 (قروض طويلة الأجل)"
  },
  {
    "code": "L-02",
    "nameAr": "التزامات عقود الإيجار",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-02 (التزامات عقود الإيجار)"
  },
  {
    "code": "L-03",
    "nameAr": "مكافأة نهاية الخدمة",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-03 (مكافأة نهاية الخدمة)"
  },
  {
    "code": "L-04",
    "nameAr": "ذمم دائنة تجارية",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-04 (ذمم دائنة تجارية)"
  },
  {
    "code": "L-05",
    "nameAr": "مستحقات وأرصدة دائنة أخرى",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "-",
    "manualChoiceLabel": "L-05 (مستحقات وأرصدة دائنة أخرى)"
  },
  {
    "code": "L-06",
    "nameAr": "قروض قصيرة الأجل وتسهيلات",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-06 (قروض قصيرة الأجل وتسهيلات)"
  },
  {
    "code": "L-07",
    "nameAr": "مخصصات أخرى",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-07 (مخصصات أخرى)"
  },
  {
    "code": "L-08",
    "nameAr": "زكاة وضريبة دخل مستحقة",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "C",
    "manualChoiceLabel": "L-08 (زكاة وضريبة دخل مستحقة)"
  },
  {
    "code": "L-09",
    "nameAr": "مستحق لأطراف ذات علاقة",
    "statementType": "مركز مالي - التزامات",
    "naturalBalance": "-",
    "manualChoiceLabel": "L-09 (مستحق لأطراف ذات علاقة)"
  },
  {
    "code": "E-01",
    "nameAr": "رأس المال",
    "statementType": "مركز مالي - حقوق الملكية",
    "naturalBalance": "C",
    "manualChoiceLabel": "E-01 (رأس المال)"
  },
  {
    "code": "E-02",
    "nameAr": "احتياطيات",
    "statementType": "مركز مالي - حقوق الملكية",
    "naturalBalance": "C",
    "manualChoiceLabel": "E-02 (احتياطيات)"
  },
  {
    "code": "E-03",
    "nameAr": "أرباح مبقاة (خسائر متراكمة)",
    "statementType": "مركز مالي - حقوق الملكية",
    "naturalBalance": "-",
    "manualChoiceLabel": "E-03 (أرباح مبقاة (خسائر متراكمة))"
  },
  {
    "code": "E-04",
    "nameAr": "توزيعات ومسحوبات السنة",
    "statementType": "مركز مالي - حقوق الملكية",
    "naturalBalance": "D",
    "manualChoiceLabel": "E-04 (توزيعات ومسحوبات السنة)"
  },
  {
    "code": "O-01",
    "nameAr": "دخل شامل آخر للسنة",
    "statementType": "دخل شامل آخر",
    "naturalBalance": "C",
    "manualChoiceLabel": "O-01 (دخل شامل آخر للسنة)"
  },
  {
    "code": "R-01",
    "nameAr": "الإيرادات",
    "statementType": "قائمة الدخل",
    "naturalBalance": "-",
    "manualChoiceLabel": "R-01 (الإيرادات)"
  },
  {
    "code": "R-02",
    "nameAr": "تكلفة الإيرادات",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-02 (تكلفة الإيرادات)"
  },
  {
    "code": "R-03",
    "nameAr": "مصروفات بيع وتسويق",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-03 (مصروفات بيع وتسويق)"
  },
  {
    "code": "R-04",
    "nameAr": "مصروفات عمومية وإدارية",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-04 (مصروفات عمومية وإدارية)"
  },
  {
    "code": "R-05",
    "nameAr": "إيرادات أخرى",
    "statementType": "قائمة الدخل",
    "naturalBalance": "C",
    "manualChoiceLabel": "R-05 (إيرادات أخرى)"
  },
  {
    "code": "R-06",
    "nameAr": "مصروفات أخرى",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-06 (مصروفات أخرى)"
  },
  {
    "code": "R-07",
    "nameAr": "تكاليف تمويل",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-07 (تكاليف تمويل)"
  },
  {
    "code": "R-08",
    "nameAr": "إيرادات تمويل",
    "statementType": "قائمة الدخل",
    "naturalBalance": "C",
    "manualChoiceLabel": "R-08 (إيرادات تمويل)"
  },
  {
    "code": "R-09",
    "nameAr": "زكاة وضريبة دخل",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-09 (زكاة وضريبة دخل)"
  },
  {
    "code": "R-10",
    "nameAr": "إهلاك وإطفاء",
    "statementType": "قائمة الدخل",
    "naturalBalance": "D",
    "manualChoiceLabel": "R-10 (إهلاك وإطفاء)"
  }
];

export const MOVEMENTS_AND_BALANCES_GUIDE: string[] = [
  "طريقة إدخال الحركات وأرصدة ميزان المراجعة",
  "البيانات الصفراء تدخلها أنت. رصيد نهاية الفترة يحسب تلقائيًا: (مدين أول المدة − دائن أول المدة) + (مدين حركة السنة − دائن حركة السنة).",
  "مثال توضيحي | أول المدة - مدين | أول المدة - دائن | حركة السنة - مدين | حركة السنة - دائن | آخر المدة - مدين | آخر المدة - دائن",
  "الصندوق (مثال) | 1000 | 0 | 200 | 350 | 850 | 0",
  "موردون (مثال) | 0 | 800 | 300 | 100 | 0 | 600",
  "في ميزان_المراجعة: P/Q أول المدة · R/S إجمالي الحركات الفعلية · T/U الرصيد النهائي آليًا · D/E نسخة مرتبطة بالقوائم المالية.",
  "تنبيه مهم: حركات المثال الحالي مستنتجة من صافي الفرق بين الأرصدة؛ ليست حركة الأستاذ الإجمالية ولا تكفي وحدها للمراجعة.",
  "عند إدخال ميزان شركة حقيقية: استبدل R/S بحركات المدين والدائن الفعلية، وامسح وصف (تجريبية) من عمود V لكل حساب بعد التحقق.",
  "إذا ثبت أن الحساب بلا حركة خلال السنة، أدخل 0 صراحة. لا تعتبر الخلية الفارغة إثباتًا لعدم وجود حركة.",
  "تصنيف الحساب يدويًا يتم من G في الميزان، مثل A-10 (نقد وما في حكمه)؛ يربط العمود I الكود بالقوائم تلقائيًا.",
  "توازن المدين والدائن شرط لازم وليس دليلًا كافيًا على صحة جميع القيود أو اكتمال إفصاحات IFRS.",
  "حساباتك المستوردة | 211 حسابًا من بببب.xlsx، بدون أرصدة أو أرقام حسابات",
  "حسابات جديدة إضافية | 50 صفًا جاهزًا في ميزان_المراجعة، الصفوف 217 إلى 266",
  "معايير الاعتماد | كود H اقتراح آلي فقط؛ اختر التصنيف الصحيح من G ليدخل الحساب إلى القوائم",
  "التصنيف المبدئي | تم إدخال رموز مبدئية للحسابات الواضحة فقط؛ يلزم مراجعتها وتصنيف الباقي يدويًا",
  "تذكير بالمصادر | أرقام أول المدة وحركات السنة لا توجد في ملف الأسماء، لذلك تُركت الإدخالات خالية",
  "تنبيه IFRS | توازن الميزان لا يكفي وحده للتأكد من صحة القياس والعرض والإفصاح وفق IFRS"
];

export const COA_GOVERNANCE_RULES: GovernanceRuleItem[] = [
  {
    "rule": "إدخال الحساب الجديد",
    "action": "أضفه في ميزان_المراجعة باسم ورقم ERP فريد؛ لا تدخله في دليل العرض.",
    "impact": "تحديث دليل الحسابات تلقائيًا"
  },
  {
    "rule": "التصنيف الفرعي",
    "action": "اختر مثل A-01-04 (سيارات ومركبات) من قائمة العمود G.",
    "impact": "يدخل إجمالي القوائم في A-01، ويظهر وصف أكثر تفصيلاً"
  },
  {
    "rule": "الأرصدة",
    "action": "P/Q أول المدة مدين ودائن؛ R/S الحركات؛ T/U آلي.",
    "impact": "المحافظة على القوائم والفحوص الأصلية"
  },
  {
    "rule": "الحسابات غير المصنفة",
    "action": "راجع الفحوصات الأصلية وأكمل G لكل حساب.",
    "impact": "منع استبعاد الحساب من القوائم"
  },
  {
    "rule": "أكواد التصنيف التفصيلية",
    "action": "هذه قائمة مقترحة قابلة للتكييف وليست أكواد إلزامية صادرة من IFRS.",
    "impact": "تجب مراجعة السياسة والأهمية النسبية"
  },
  {
    "rule": "مجموعة شركات",
    "action": "الملف لا يجمع ولا يترجم العملات ولا يلغي المعاملات البينية.",
    "impact": "التوحيد المالي للشركات يحتاج طبقة إضافية"
  },
  {
    "rule": "IFRS 18",
    "action": "ينطبق إلزاميًا على الفترات السنوية التي تبدأ من 1 يناير 2027، ما لم يطبق مبكرًا.",
    "impact": "قائمة الدخل الحالية تحتاج إعادة تقييم العرض عند تطبيقه"
  },
  {
    "rule": "التدفقات النقدية",
    "action": "تحتاج تسويات غير نقدية وتفاصيل حركة فعلية وفق IAS 7.",
    "impact": "لا تعتمدها من توازن الميزان فقط"
  },
  {
    "rule": "المصدر",
    "action": "الرابط",
    "impact": ""
  },
  {
    "rule": "IFRS 18",
    "action": "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-18-presentation-and-disclosure-in-financial-statements/",
    "impact": ""
  },
  {
    "rule": "IAS 1",
    "action": "https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/",
    "impact": ""
  }
];

export const SYSTEM_MESSAGES_AR: Array<{ key: string; text: string }> = [
  {
    "key": "imp_title",
    "text": "استيراد ميزان المراجعة"
  },
  {
    "key": "imp_prompt",
    "text": "حدد نطاق ميزان المراجعة بالكامل بما فيه صف العناوين (من أي ملف مفتوح) ثم اضغط موافق"
  },
  {
    "key": "imp_nohdr",
    "text": "لم أجد صف العناوين. لازم يحتوي النطاق على عناوين مثل: اسم الحساب - مدين - دائن (أو Account Name / Debit / Credit)"
  },
  {
    "key": "imp_confirm",
    "text": "سيتم مسح بيانات ميزان المراجعة الحالية في الشيت واستبدالها بالبيانات الجديدة. هل تريد المتابعة؟"
  },
  {
    "key": "imp_done",
    "text": "تم استيراد عدد الحسابات التالي:"
  },
  {
    "key": "imp_toomany",
    "text": "عدد الصفوف أكبر من السعة (500 حساب). تم استيراد أول 500 فقط. زود الصفوف أو قسم الميزان."
  },
  {
    "key": "clr_confirm",
    "text": "هل تريد مسح كل بيانات ميزان المراجعة المدخلة؟ (لن تتأثر المعادلات)"
  },
  {
    "key": "clr_done",
    "text": "تم المسح. الصق ميزان مراجعتك الآن."
  },
  {
    "key": "run_title",
    "text": "نتيجة الفحص"
  },
  {
    "key": "run_errors",
    "text": "عدد الأخطاء:"
  },
  {
    "key": "run_warnings",
    "text": "عدد التنبيهات:"
  },
  {
    "key": "run_ok",
    "text": "ممتاز! لا توجد أخطاء جوهرية. القوائم المالية جاهزة للمراجعة."
  },
  {
    "key": "run_open",
    "text": "هل تريد فتح صفحة تفاصيل الأخطاء لمعالجتها؟"
  },
  {
    "key": "fz_done",
    "text": "تم نسخ التصنيف المقترح إلى عمود التصنيف اليدوي (للحسابات الفارغة فقط). راجع كل تصنيف وعدّل ما يلزم."
  },
  {
    "key": "err_none",
    "text": "لا توجد ملاحظات على مستوى الحسابات."
  },
  {
    "key": "err_count",
    "text": "عدد الحسابات التي عليها ملاحظات:"
  },
  {
    "key": "pdf_done",
    "text": "تم تصدير القوائم إلى PDF."
  },
  {
    "key": "btn_import",
    "text": "استيراد ميزان المراجعة"
  },
  {
    "key": "btn_run",
    "text": "تشغيل الفحص"
  },
  {
    "key": "btn_errors",
    "text": "عرض الحسابات الخاطئة"
  },
  {
    "key": "btn_freeze",
    "text": "اعتماد التصنيف المقترح"
  },
  {
    "key": "btn_pdf",
    "text": "تصدير PDF"
  },
  {
    "key": "btn_clear",
    "text": "مسح الميزان"
  },
  {
    "key": "btn_done",
    "text": "تم إنشاء الأزرار في الصفحة الرئيسية."
  }
];

/**
 * KAS Trade (`company_id: 'KAS'`) is a standalone commercial/trade company with
 * ZERO relation to recruitment. Strip recruitment/shelter/Musaned classifications
 * from its extended IFRS dropdowns so its accountants only see commercial items.
 */
const RECRUITMENT_ONLY_IFRS_KEYWORDS = ['استقدام', 'إيواء', 'ايواء', 'مساند'];

export function isKasTradeCompany(companyId?: string | null): boolean {
  return String(companyId || '').toUpperCase() === 'KAS';
}

export function getCompanyIfrsClassifications(companyId?: string | null) {
  if (!isKasTradeCompany(companyId)) return EXTENDED_IFRS_CLASSIFICATIONS;
  return EXTENDED_IFRS_CLASSIFICATIONS.filter(
    (x) => !RECRUITMENT_ONLY_IFRS_KEYWORDS.some((k) => (x.nameAr || '').includes(k))
  );
}

export function getCompanyExcelAccountingTree(companyId?: string | null) {
  if (!isKasTradeCompany(companyId)) return EXCEL_ACCOUNTING_TREE;
  return EXCEL_ACCOUNTING_TREE.filter(
    (n) => !RECRUITMENT_ONLY_IFRS_KEYWORDS.some((k) => String((n as { titleAr?: string }).titleAr || '').includes(k))
  );
}
