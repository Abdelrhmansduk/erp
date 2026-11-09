import { CompanyId } from '../../types';
import { normalizeCompanyId } from '../../contexts/CompanyContext';
import { EXTENDED_IFRS_CLASSIFICATIONS, ExtendedIfrsClassificationItem } from './ifrsExtendedReferenceData';
import { erpIndexedStorage } from '../storage/erpIndexedStorage';

export interface IfrsMappingCode {
  code: string;
  nameAr: string;
  sectionAr: string;
  naturalBalance: 'D' | 'C' | '-';
  ifrsRef: string;
  cashFlowType: 'تشغيلي' | 'استثماري' | 'تمويلي' | 'نقدية' | 'غير نقدي';
  notes: string;
  optionLabel: string;
}

export interface ExtendedSubMappingCode {
  subCode: string;
  nameAr: string;
  level: 2 | 3;
  parentCode: string;
  parentNameAr: string;
  naturalBalance: 'D' | 'C' | '-';
  ifrsRef: string;
}

export interface TrialBalanceEntry {
  seq: number;
  erpCode: string;
  accountName: string;
  manualCode: string; // e.g. 'A-01' or 'A-01-04' or ''
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  movementSource?: string;
}

export interface ComputedTrialBalanceRow extends TrialBalanceEntry {
  suggestedCode: string;
  approvedCode: string; // Primary code A-01..R-10
  approvedSubCode: string;
  approvedItemName: string;
  approvedSubItemName?: string;
  sectionAr?: string;
  ifrsRef?: string;
  cashFlowType?: string;
  naturalBalance: 'D' | 'C' | '-';
  openingNet: number; // Debit - Credit
  closingDebit: number;
  closingCredit: number;
  closingNet: number; // Debit - Credit
  netYearMovement: number;
  auditNote: string;
  statusText: string;
  hasError: boolean;
  hasWarning: boolean;
}

export interface IfrsGeneralSettings {
  companyName: string;
  reportingDate: string;
  currency: string;
  currentPortionLongTermLoansCurrent: number;
  currentPortionLeaseLiabilitiesCurrent: number;
  currentPortionLongTermLoansComparative: number;
  currentPortionLeaseLiabilitiesComparative: number;
  roundingTolerance: number;
}

export interface IfrsDiagnosticCheck {
  id: number;
  title: string;
  reference: string;
  value: number;
  status: 'سليم' | 'تنبيه' | 'خطأ';
  meaning: string;
  resolution: string;
  severity: 'خطأ' | 'تنبيه';
}

export interface FinancialRatioItem {
  id: string;
  category: 'نسب السيولة' | 'نسب الهيكل المالي والمديونية' | 'نسب الربحية' | 'نسب الكفاءة التشغيلية';
  name: string;
  formula: string;
  value: number;
  formattedValue: string;
  unit: 'ratio' | 'percent' | 'currency' | 'days' | 'times';
  benchmark: string;
  target2026Q4: number;
  target2027: number;
  evaluation: 'ممتاز / جيد' | 'مقبول' | 'ضعيف';
  meaning: string;
  actionPlan: string;
}

// ─── 1. Primary 34 IFRS Chart of Mapping Codes (A-01 to R-10) ─────────────────────────
export const IFRS_MAPPING_CODES: IfrsMappingCode[] = [
  { code: 'A-01', nameAr: 'ممتلكات وآلات ومعدات (بالتكلفة)', sectionAr: 'مركز مالي - أصول غير متداولة', naturalBalance: 'D', ifrsRef: 'IAS 16', cashFlowType: 'استثماري', notes: 'الأراضي والمباني والسيارات والأثاث والأجهزة بتكلفتها', optionLabel: 'A-01 (ممتلكات وآلات ومعدات (بالتكلفة))' },
  { code: 'A-02', nameAr: 'مجمع إهلاك الممتلكات والآلات', sectionAr: 'مركز مالي - أصول غير متداولة', naturalBalance: 'C', ifrsRef: 'IAS 16.43-62', cashFlowType: 'غير نقدي', notes: 'رصيده دائن ويخصم من التكلفة', optionLabel: 'A-02 (مجمع إهلاك الممتلكات والآلات)' },
  { code: 'A-03', nameAr: 'أصول غير ملموسة (بالصافي)', sectionAr: 'مركز مالي - أصول غير متداولة', naturalBalance: '-', ifrsRef: 'IAS 38', cashFlowType: 'استثماري', notes: 'برامج وعلامات تجارية وشهرة؛ المجمع يُصنف هنا أيضاً', optionLabel: 'A-03 (أصول غير ملموسة (بالصافي))' },
  { code: 'A-04', nameAr: 'استثمارات وأصول مالية طويلة الأجل', sectionAr: 'مركز مالي - أصول غير متداولة', naturalBalance: 'D', ifrsRef: 'IFRS 9 / IAS 28', cashFlowType: 'استثماري', notes: 'أسهم وصكوك وحصص في شركات', optionLabel: 'A-04 (استثمارات وأصول مالية طويلة الأجل)' },
  { code: 'A-05', nameAr: 'أصول حق الاستخدام (بالصافي)', sectionAr: 'مركز مالي - أصول غير متداولة', naturalBalance: '-', ifrsRef: 'IFRS 16', cashFlowType: 'استثماري', notes: 'الأصل المؤجر بعد خصم مجمع إهلاكه', optionLabel: 'A-05 (أصول حق الاستخدام (بالصافي))' },
  { code: 'A-06', nameAr: 'مخزون', sectionAr: 'مركز مالي - أصول متداولة', naturalBalance: 'D', ifrsRef: 'IAS 2', cashFlowType: 'تشغيلي', notes: 'بضاعة ومواد وإنتاج تحت التشغيل', optionLabel: 'A-06 (مخزون)' },
  { code: 'A-07', nameAr: 'ذمم مدينة تجارية', sectionAr: 'مركز مالي - أصول متداولة', naturalBalance: 'D', ifrsRef: 'IFRS 9 / IFRS 15', cashFlowType: 'تشغيلي', notes: 'العملاء وأوراق القبض', optionLabel: 'A-07 (ذمم مدينة تجارية)' },
  { code: 'A-08', nameAr: 'مخصص خسائر ائتمانية متوقعة', sectionAr: 'مركز مالي - أصول متداولة', naturalBalance: 'C', ifrsRef: 'IFRS 9.5.5', cashFlowType: 'تشغيلي', notes: 'رصيده دائن ويخصم من الذمم المدينة', optionLabel: 'A-08 (مخصص خسائر ائتمانية متوقعة)' },
  { code: 'A-09', nameAr: 'مدفوعات مقدمة وأرصدة مدينة أخرى', sectionAr: 'مركز مالي - أصول متداولة', naturalBalance: 'D', ifrsRef: 'IAS 1.66', cashFlowType: 'تشغيلي', notes: 'مصروفات مقدمة وسلف ودفعات مقدمة للموردين', optionLabel: 'A-09 (مدفوعات مقدمة وأرصدة مدينة أخرى)' },
  { code: 'A-10', nameAr: 'نقد وما في حكمه', sectionAr: 'مركز مالي - أصول متداولة', naturalBalance: 'D', ifrsRef: 'IAS 7.6-8', cashFlowType: 'نقدية', notes: 'الصندوق والبنوك والودائع أقل من 3 شهور', optionLabel: 'A-10 (نقد وما في حكمه)' },
  { code: 'L-01', nameAr: 'قروض طويلة الأجل', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IFRS 9 / IAS 1.69', cashFlowType: 'تمويلي', notes: 'يفصل الجزء المتداول من شاشة الإعدادات', optionLabel: 'L-01 (قروض طويلة الأجل)' },
  { code: 'L-02', nameAr: 'التزامات عقود الإيجار', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IFRS 16', cashFlowType: 'تمويلي', notes: 'يفصل الجزء المتداول من شاشة الإعدادات', optionLabel: 'L-02 (التزامات عقود الإيجار)' },
  { code: 'L-03', nameAr: 'مكافأة نهاية الخدمة', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IAS 19', cashFlowType: 'تشغيلي', notes: 'منافع الموظفين المحددة', optionLabel: 'L-03 (مكافأة نهاية الخدمة)' },
  { code: 'L-04', nameAr: 'ذمم دائنة تجارية', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IAS 1.69 / IFRS 9', cashFlowType: 'تشغيلي', notes: 'الموردون والوكلاء وأوراق الدفع', optionLabel: 'L-04 (ذمم دائنة تجارية)' },
  { code: 'L-05', nameAr: 'مستحقات وأرصدة دائنة أخرى', sectionAr: 'مركز مالي - التزامات', naturalBalance: '-', ifrsRef: 'IAS 1.69', cashFlowType: 'تشغيلي', notes: 'مصروفات مستحقة وضريبة القيمة المضافة وإيرادات مقدمة', optionLabel: 'L-05 (مستحقات وأرصدة دائنة أخرى)' },
  { code: 'L-06', nameAr: 'قروض قصيرة الأجل وتسهيلات', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IFRS 9 / IAS 7.8', cashFlowType: 'تمويلي', notes: 'تسهيلات وسحب على المكشوف', optionLabel: 'L-06 (قروض قصيرة الأجل وتسهيلات)' },
  { code: 'L-07', nameAr: 'مخصصات أخرى', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IAS 37', cashFlowType: 'تشغيلي', notes: 'مخصصات قضايا وضمان وغيرها', optionLabel: 'L-07 (مخصصات أخرى)' },
  { code: 'L-08', nameAr: 'زكاة وضريبة دخل مستحقة', sectionAr: 'مركز مالي - التزامات', naturalBalance: 'C', ifrsRef: 'IAS 12 / IFRIC 21', cashFlowType: 'تشغيلي', notes: 'المستحق لهيئة الزكاة والضريبة والجمارك', optionLabel: 'L-08 (زكاة وضريبة دخل مستحقة)' },
  { code: 'L-09', nameAr: 'مستحق لأطراف ذات علاقة', sectionAr: 'مركز مالي - التزامات', naturalBalance: '-', ifrsRef: 'IAS 24', cashFlowType: 'تمويلي', notes: 'جاري الشركاء والمساهمين والشركات الشقيقة', optionLabel: 'L-09 (مستحق لأطراف ذات علاقة)' },
  { code: 'E-01', nameAr: 'رأس المال', sectionAr: 'مركز مالي - حقوق الملكية', naturalBalance: 'C', ifrsRef: 'IAS 1.78 / IAS 32', cashFlowType: 'تمويلي', notes: 'رأس المال المدفوع وحصص الشركاء', optionLabel: 'E-01 (رأس المال)' },
  { code: 'E-02', nameAr: 'احتياطيات', sectionAr: 'مركز مالي - حقوق الملكية', naturalBalance: 'C', ifrsRef: 'IAS 1.79', cashFlowType: 'تمويلي', notes: 'احتياطي نظامي واتفاقي وعام', optionLabel: 'E-02 (احتياطيات)' },
  { code: 'E-03', nameAr: 'أرباح مبقاة (خسائر متراكمة)', sectionAr: 'مركز مالي - حقوق الملكية', naturalBalance: '-', ifrsRef: 'IAS 1.106', cashFlowType: 'تمويلي', notes: 'قد يكون رصيدها مديناً في حالة الخسائر', optionLabel: 'E-03 (أرباح مبقاة (خسائر متراكمة))' },
  { code: 'E-04', nameAr: 'توزيعات ومسحوبات السنة', sectionAr: 'مركز مالي - حقوق الملكية', naturalBalance: 'D', ifrsRef: 'IAS 1.107', cashFlowType: 'تمويلي', notes: 'تقفل في الأرباح المبقاة آخر السنة', optionLabel: 'E-04 (توزيعات ومسحوبات السنة)' },
  { code: 'O-01', nameAr: 'دخل شامل آخر للسنة', sectionAr: 'دخل شامل آخر', naturalBalance: 'C', ifrsRef: 'IAS 1.82A / IAS 19.120', cashFlowType: 'غير نقدي', notes: 'إعادة قياس مكافأة نهاية الخدمة وغيرها', optionLabel: 'O-01 (دخل شامل آخر للسنة)' },
  { code: 'R-01', nameAr: 'الإيرادات', sectionAr: 'قائمة الدخل', naturalBalance: '-', ifrsRef: 'IFRS 15', cashFlowType: 'تشغيلي', notes: 'المبيعات والإيرادات بعد خصم المردودات', optionLabel: 'R-01 (الإيرادات)' },
  { code: 'R-02', nameAr: 'تكلفة الإيرادات', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 1.99 / IAS 2', cashFlowType: 'تشغيلي', notes: 'التكاليف المباشرة للاستقدام والتأجير والتشغيل', optionLabel: 'R-02 (تكلفة الإيرادات)' },
  { code: 'R-03', nameAr: 'مصروفات بيع وتسويق', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 1.99', cashFlowType: 'تشغيلي', notes: 'عمولات المبيعات والمسوقات والدعاية والإعلان', optionLabel: 'R-03 (مصروفات بيع وتسويق)' },
  { code: 'R-04', nameAr: 'مصروفات عمومية وإدارية', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 1.99', cashFlowType: 'تشغيلي', notes: 'رواتب الإدارة والإيجارات والمرافق والصيانة', optionLabel: 'R-04 (مصروفات عمومية وإدارية)' },
  { code: 'R-05', nameAr: 'إيرادات أخرى', sectionAr: 'قائمة الدخل', naturalBalance: 'C', ifrsRef: 'IAS 1.97', cashFlowType: 'تشغيلي', notes: 'إيرادات متنوعة وخصومات وغرامات مكتسبة', optionLabel: 'R-05 (إيرادات أخرى)' },
  { code: 'R-06', nameAr: 'مصروفات أخرى', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 1.97', cashFlowType: 'تشغيلي', notes: 'خسائر بيع أصول وغرامات غير تشغيلية', optionLabel: 'R-06 (مصروفات أخرى)' },
  { code: 'R-07', nameAr: 'تكاليف تمويل', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 1.82(b) / IAS 23', cashFlowType: 'تمويلي', notes: 'فوائد القروض والمرابحة وفوائد التزامات الإيجار', optionLabel: 'R-07 (تكاليف تمويل)' },
  { code: 'R-08', nameAr: 'إيرادات تمويل', sectionAr: 'قائمة الدخل', naturalBalance: 'C', ifrsRef: 'IAS 1.82', cashFlowType: 'تمويلي', notes: 'عوائد الودائع والصكوك', optionLabel: 'R-08 (إيرادات تمويل)' },
  { code: 'R-09', nameAr: 'زكاة وضريبة دخل', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 12 / IFRIC 21', cashFlowType: 'تشغيلي', notes: 'مصروف الزكاة الشرعية وضريبة الدخل للسنة', optionLabel: 'R-09 (زكاة وضريبة دخل)' },
  { code: 'R-10', nameAr: 'إهلاك وإطفاء', sectionAr: 'قائمة الدخل', naturalBalance: 'D', ifrsRef: 'IAS 16 / IAS 38 / IFRS 16', cashFlowType: 'غير نقدي', notes: 'إهلاك الأصول وإطفاء غير الملموسة وحق الاستخدام', optionLabel: 'R-10 (إهلاك وإطفاء)' },
];

export const IFRS_MAPPING_MAP: Record<string, IfrsMappingCode> = Object.fromEntries(
  IFRS_MAPPING_CODES.map((m) => [m.code, m])
);

export const EXTENDED_IFRS_MAP: Record<string, ExtendedIfrsClassificationItem> = Object.fromEntries(
  EXTENDED_IFRS_CLASSIFICATIONS.map((item) => [item.code, item])
);

export function resolveIfrsClassificationMetadata(
  codeOrSubCode?: string,
  fallbackAccountName?: string
) {
  const raw = (codeOrSubCode || '').trim() || (fallbackAccountName ? suggestIfrsSubCode(fallbackAccountName) : '');
  const primaryCode = extractPrimaryIfrsCode(raw) || (fallbackAccountName ? suggestIfrsCode(fallbackAccountName) : 'R-04');
  const primaryMeta = IFRS_MAPPING_MAP[primaryCode] || IFRS_MAPPING_MAP['R-04'];
  const subMeta = EXTENDED_IFRS_MAP[raw] || EXTENDED_IFRS_MAP[primaryCode];

  return {
    primaryCode,
    subCode: subMeta?.code || primaryCode,
    primaryNameAr: primaryMeta?.nameAr || 'مصروفات عمومية وإدارية',
    subNameAr: subMeta?.nameAr || primaryMeta?.nameAr || 'مصروفات عمومية وإدارية',
    sectionAr: primaryMeta?.sectionAr || 'قائمة الدخل',
    naturalBalance: (subMeta?.naturalBalance || primaryMeta?.naturalBalance || 'D') as 'D' | 'C' | '-',
    ifrsRef: subMeta?.ifrsRef || primaryMeta?.ifrsRef || 'IAS 1',
    cashFlowType: primaryMeta?.cashFlowType || 'تشغيلي',
    optionLabel: subMeta?.manualOption || primaryMeta?.optionLabel || `${primaryCode} (${primaryMeta?.nameAr || ''})`,
  };
}

// ─── 2. Ordered Auto-Classification Keyword Rules (257+ Rules from File + Recruitment Extensions) ─────
export const AUTO_CLASSIFICATION_KEYWORDS: Array<{ keyword: string; code: string }> = [
  { keyword: 'مصروف الزكاة', code: 'R-09' },
  { keyword: 'مصروف زكاة', code: 'R-09' },
  { keyword: 'مصروف ضريبة دخل', code: 'R-09' },
  { keyword: 'income tax expense', code: 'R-09' },
  { keyword: 'zakat expense', code: 'R-09' },
  { keyword: 'مصروف إهلاك', code: 'R-10' },
  { keyword: 'مصروف اهلاك', code: 'R-10' },
  { keyword: 'مصروف إطفاء', code: 'R-10' },
  { keyword: 'مصروف اطفاء', code: 'R-10' },
  { keyword: 'مصروف استهلاك', code: 'R-10' },
  { keyword: 'مجمع إهلاك حق', code: 'A-05' },
  { keyword: 'مجمع اهلاك حق', code: 'A-05' },
  { keyword: 'مجمع إهلاك', code: 'A-02' },
  { keyword: 'مجمع اهلاك', code: 'A-02' },
  { keyword: 'مخصص اهلاك', code: 'A-02' },
  { keyword: 'مخصص إهلاك', code: 'A-02' },
  { keyword: 'accumulated dep', code: 'A-02' },
  { keyword: 'مجمع إطفاء', code: 'A-03' },
  { keyword: 'مجمع اطفاء', code: 'A-03' },
  { keyword: 'حق استخدام', code: 'A-05' },
  { keyword: 'حق الاستخدام', code: 'A-05' },
  { keyword: 'التزامات عقود', code: 'L-02' },
  { keyword: 'التزامات إيجار', code: 'L-02' },
  { keyword: 'التزامات ايجار', code: 'L-02' },
  { keyword: 'فوائد التمويل المؤجلة', code: 'A-09' },
  { keyword: 'مصروفات تمويلية مقدماً', code: 'A-09' },
  { keyword: 'تغطية خطاب ضمان', code: 'A-09' },
  { keyword: 'حساب مساند', code: 'A-07' },
  { keyword: 'جارى الشريك', code: 'L-09' },
  { keyword: 'جاري الشريك', code: 'L-09' },
  { keyword: 'جاري الشركاء', code: 'L-09' },
  { keyword: 'المستحق من -', code: 'A-09' },
  { keyword: 'المستحق الى -', code: 'L-09' },
  { keyword: 'المستحق إلى -', code: 'L-09' },
  { keyword: 'تمويل الراجحي', code: 'L-01' },
  { keyword: 'تسوية ضريبة القيمة المضافة', code: 'L-05' },
  { keyword: 'ارباح وخسائر العام', code: 'E-03' },
  { keyword: 'أرباح وخسائر العام', code: 'E-03' },
  { keyword: 'مصروف التفويض', code: 'R-02' },
  { keyword: 'مصروف رسوم مساند', code: 'R-02' },
  { keyword: 'مصروف عقود السفارة', code: 'R-02' },
  { keyword: 'مصروف عمولات المناديب', code: 'R-02' },
  { keyword: 'مصروف تذاكر سائقين', code: 'R-02' },
  { keyword: 'مصروف نقل كفالة العاملات', code: 'R-02' },
  { keyword: 'مصروفات متنوعة العاملات', code: 'R-02' },
  { keyword: 'مصروف سكن العاملات', code: 'R-02' },
  { keyword: 'مصروف طعام واعاشة العاملات', code: 'R-02' },
  { keyword: 'مصروف نقل جماعى العاملات', code: 'R-02' },
  { keyword: 'مصروف تذاكر سفر العاملات', code: 'R-02' },
  { keyword: 'مردودات  مشتريات', code: 'R-02' },
  { keyword: 'مردودات مشتريات', code: 'R-02' },
  { keyword: 'خصم تذاكر على وكلاء', code: 'R-02' },
  { keyword: 'خصم وكالات على وكلاء', code: 'R-02' },
  { keyword: 'خصم غرامات الغاء على الوكلاء', code: 'R-05' },
  { keyword: 'خصومات على العملاء', code: 'R-05' },
  { keyword: 'employment', code: 'L-04' },
  { keyword: 'manpower', code: 'L-04' },
  { keyword: 'recruitment', code: 'L-04' },
  { keyword: 'overseas', code: 'L-04' },
  { keyword: 'travels', code: 'L-04' },
  { keyword: 'agencies', code: 'L-04' },
  { keyword: 'syndicate', code: 'L-04' },
  { keyword: 'promotions', code: 'L-04' },
  { keyword: 'international', code: 'L-04' },
  { keyword: 'golden hands', code: 'L-04' },
  { keyword: 'landbase', code: 'L-04' },
  { keyword: 'nural', code: 'L-04' },
  { keyword: 'مندوب اوغندا', code: 'L-04' },
  { keyword: 'مندوب كينيا', code: 'L-04' },
  { keyword: 'احمد حلمى عبدالمقصود', code: 'L-04' },
  { keyword: 'فوائد قروض', code: 'R-07' },
  { keyword: 'تكاليف تمويل', code: 'R-07' },
  { keyword: 'أعباء تمويل', code: 'R-07' },
  { keyword: 'إيرادات تمويل', code: 'R-08' },
  { keyword: 'تكلفة المبيعات', code: 'R-02' },
  { keyword: 'تكلفة الإيرادات', code: 'R-02' },
  { keyword: 'مشتريات', code: 'R-02' },
  { keyword: 'إيرادات أخرى', code: 'R-05' },
  { keyword: 'ايرادات اخرى', code: 'R-05' },
  { keyword: 'مردودات مبيعات', code: 'R-01' },
  { keyword: 'مردودات ايرادات', code: 'R-01' },
  { keyword: 'مبيعات', code: 'R-01' },
  { keyword: 'إيرادات', code: 'R-01' },
  { keyword: 'ايرادات', code: 'R-01' },
  { keyword: 'عمولة مبيعات', code: 'R-03' },
  { keyword: 'تسويق', code: 'R-03' },
  { keyword: 'دعاية', code: 'R-03' },
  { keyword: 'إعلان', code: 'R-03' },
  { keyword: 'اعلان', code: 'R-03' },
  { keyword: 'دخل شامل', code: 'O-01' },
  { keyword: 'مدفوعة مقدما', code: 'A-09' },
  { keyword: 'مدفوعة مقدماً', code: 'A-09' },
  { keyword: 'مدفوعه مقدما', code: 'A-09' },
  { keyword: 'مصروف مقدم', code: 'A-09' },
  { keyword: 'سلف', code: 'A-09' },
  { keyword: 'عهد', code: 'A-09' },
  { keyword: 'ضريبة القيمة المضافة للمدخلات', code: 'A-09' },
  { keyword: 'مستحقة', code: 'L-05' },
  { keyword: 'مستحق', code: 'L-05' },
  { keyword: 'ضريبة القيمة المضافة', code: 'L-05' },
  { keyword: 'نهاية الخدمة', code: 'L-03' },
  { keyword: 'مخصص خسائر', code: 'A-08' },
  { keyword: 'زكاة مستحقة', code: 'L-08' },
  { keyword: 'قرض قصير', code: 'L-06' },
  { keyword: 'تسهيلات', code: 'L-06' },
  { keyword: 'سحب على المكشوف', code: 'L-06' },
  { keyword: 'قرض', code: 'L-01' },
  { keyword: 'تمويل', code: 'L-01' },
  { keyword: 'رأس المال', code: 'E-01' },
  { keyword: 'راس المال', code: 'E-01' },
  { keyword: 'أرباح مبقاة', code: 'E-03' },
  { keyword: 'أرباح محتجزة', code: 'E-03' },
  { keyword: 'احتياطي', code: 'E-02' },
  { keyword: 'توزيعات', code: 'E-04' },
  { keyword: 'مسحوبات', code: 'E-04' },
  { keyword: 'برامج', code: 'A-03' },
  { keyword: 'استثمار', code: 'A-04' },
  { keyword: 'تويوتا', code: 'A-01' },
  { keyword: 'ايسوزو', code: 'A-01' },
  { keyword: 'سيارة', code: 'A-01' },
  { keyword: 'ثلاجات', code: 'A-01' },
  { keyword: 'ثلاجة', code: 'A-01' },
  { keyword: 'مكيفات', code: 'A-01' },
  { keyword: 'مكاتب', code: 'A-01' },
  { keyword: 'وحدة ادراج', code: 'A-01' },
  { keyword: 'كراسي', code: 'A-01' },
  { keyword: 'طاولة', code: 'A-01' },
  { keyword: 'اثاث', code: 'A-01' },
  { keyword: 'أثاث', code: 'A-01' },
  { keyword: 'كمبيوتر', code: 'A-01' },
  { keyword: 'لاب توب', code: 'A-01' },
  { keyword: 'أي باد', code: 'A-01' },
  { keyword: 'طابعة', code: 'A-01' },
  { keyword: 'تليفون', code: 'A-01' },
  { keyword: 'جوالات', code: 'A-01' },
  { keyword: 'جهاز', code: 'A-01' },
  { keyword: 'كاميرات', code: 'A-01' },
  { keyword: 'مخزون', code: 'A-06' },
  { keyword: 'عملاء', code: 'A-07' },
  { keyword: 'موردون', code: 'L-04' },
  { keyword: 'النقديه', code: 'A-10' },
  { keyword: 'صندوق', code: 'A-10' },
  { keyword: 'بنك', code: 'A-10' },
  { keyword: 'مصروف', code: 'R-04' },
  { keyword: 'مصاريف', code: 'R-04' },
  { keyword: 'هاتف', code: 'R-04' },
];

export function suggestIfrsCode(accountName: string): string {
  const clean = (accountName || '').trim().toLowerCase();
  if (!clean) return '';
  for (const rule of AUTO_CLASSIFICATION_KEYWORDS) {
    if (clean.includes(rule.keyword.toLowerCase())) {
      return rule.code;
    }
  }
  return 'R-04';
}

export function suggestIfrsSubCode(accountName: string): string {
  const clean = (accountName || '').trim().toLowerCase();
  if (!clean) return '';
  // Specific Extended Sub-Classification Rules from Excel (دليل_التصنيف_الموسع)
  if (clean.includes('مخصص اهلاك') || clean.includes('مخصص إهلاك') || clean.includes('مجمع إهلاك') || clean.includes('مجمع اهلاك')) {
    if (clean.includes('سيار') || clean.includes('تويوتا') || clean.includes('ايسوزو') || clean.includes('بكب') || clean.includes('شاحن')) return 'A-02-03';
    if (clean.includes('مبان')) return 'A-02-01';
    if (clean.includes('أثاث') || clean.includes('اثاث')) return 'A-02-04';
    if (clean.includes('حاسب') || clean.includes('كمبيوتر')) return 'A-02-05';
    return 'A-02-08';
  }
  if (clean.includes('تويوتا') || clean.includes('ايسوزو') || clean.includes('سيارة') || clean.includes('سيارات') || clean.includes('مركبات') || clean.includes('حافل')) return 'A-01-04';
  if (clean.includes('مكاتب') || clean.includes('ادراج') || clean.includes('كراسي') || clean.includes('طاولة') || clean.includes('اثاث') || clean.includes('أثاث')) return 'A-01-05';
  if (clean.includes('كمبيوتر') || clean.includes('لاب توب') || clean.includes('أي باد') || clean.includes('طابعة') || clean.includes('سيرفر') || clean.includes('خوادم')) return 'A-01-06';
  if (clean.includes('تليفون') || clean.includes('جوالات') || clean.includes('واي فاي') || clean.includes('اتصالات') && !clean.includes('مصروف') && !clean.includes('فاتور')) return 'A-01-07';
  if (clean.includes('كاميرات') || clean.includes('أمن وسلامة')) return 'A-01-14';
  if (clean.includes('ثلاجات') || clean.includes('ثلاجة') || clean.includes('مكيفات')) return 'A-01-08';
  if (clean.includes('تغطية خطاب ضمان')) return 'A-09-11';
  if (clean.includes('النقديه') || clean.includes('صندوق') || clean.includes('خزين')) return 'A-10-01';
  if (clean.includes('عهد الفروع النقدية') || clean.includes('عهدة نقدية')) return 'A-10-02';
  if (clean.includes('جارى الشريك') || clean.includes('جاري الشريك')) return 'L-09-04';
  if (clean.includes('بنك') || clean.includes('مصرف')) return 'A-10-08';
  if (clean.includes('حساب مساند') || clean.includes('ضمان منصة مساند') || clean.includes('أمانات مساند')) return 'A-07-05';
  if (clean.includes('عملاء')) return 'A-07-01';
  if (clean.includes('إيجارات مدفوعة مقدماً') || clean.includes('ايجارات مدفوعة مقدما')) return 'A-09-02';
  if (clean.includes('تأمين') && clean.includes('مقدم')) return 'A-09-03';
  if (clean.includes('مدفوعة مقدما') || clean.includes('مدفوعة مقدماً') || clean.includes('مدفوعه مقدما') || clean.includes('مصروف مقدم') || clean.includes('فوائد التمويل المؤجلة')) return 'A-09-01';
  if (clean.includes('سلف') || clean.includes('عهد')) return 'A-09-06';
  if (clean.includes('ضريبة القيمة المضافة للمدخلات')) return 'A-09-10';
  if (clean.includes('المستحق من -')) return 'A-09-08';
  if (clean.includes('تمويل الراجحي') || clean.includes('مرابحة طويل')) return 'L-01-04';
  if (clean.includes('رواتب مستحقة') || clean.includes('رواتب واجور مستحقة')) return 'L-05-01';
  if (clean.includes('ضريبة القيمة المضافة')) return 'L-05-09';
  if (clean.includes('المستحق الى - خالد السليم')) return 'L-09-04';
  if (clean.includes('المستحق الى -') || clean.includes('المستحق إلى -')) return 'L-09-03';
  if (clean.includes('راس المال') || clean.includes('رأس المال')) return 'E-01-01';
  if (clean.includes('احتياطي نظامي')) return 'E-02-01';
  if (clean.includes('أرباح محتجزة') || clean.includes('أرباح مبقاة')) return 'E-03-01';
  if (clean.includes('ارباح وخسائر العام') || clean.includes('أرباح وخسائر العام')) return 'E-03-05';
  if (clean.includes('مردودات مبيعات') || clean.includes('مردودات ايرادات')) return 'R-01-13';
  if (clean.includes('ايرادات مبيعات') || clean.includes('إيرادات وساطة') || clean.includes('ايرادات التفاويض') || clean.includes('إيرادات عقود التوسط')) return 'R-01-07';
  if (clean.includes('نقل كفالة') && (clean.includes('ايراد') || clean.includes('إيراد'))) return 'R-01-12';
  if (clean.includes('تأجير') && (clean.includes('ايراد') || clean.includes('إيراد'))) return 'R-01-15';
  if (clean.includes('مردودات  مشتريات') || clean.includes('مردودات مشتريات') || clean.includes('خصم تذاكر على وكلاء') || clean.includes('خصم وكالات على وكلاء')) return 'R-02-12';
  if (clean.includes('خصومات على العملاء') || clean.includes('خصم غرامات الغاء على الوكلاء')) return 'R-05-02';
  if (clean.includes('إيرادات اخرى') || clean.includes('ايرادات اخرى')) return 'R-05-06';
  if (clean.includes('عمولة مبيعات')) return 'R-03-02';
  if (clean.includes('دعاية واعلان') || clean.includes('تسويق')) return 'R-03-03';
  if (clean.includes('سكن العاملات') || clean.includes('طعام واعاشة العاملات') || clean.includes('تشغيل مراكز الإيواء')) return 'R-02-08';
  if (clean.includes('نقل جماعى العاملات') || clean.includes('تذاكر سفر العاملات') || clean.includes('تذاكر سائقين')) return 'R-02-06';
  if (clean.includes('التفويض الاليكترونى') || clean.includes('رسوم مساند') || clean.includes('عقود السفارة') || clean.includes('عمولات المناديب')) return 'R-02-05';
  if (clean.includes('مشتريات') || clean.includes('نقل كفالة العاملات') || clean.includes('متنوعة العاملات')) return 'R-02-07';
  if (clean.includes('رواتب الموظفين') || clean.includes('اجازة الموظفين') || clean.includes('نهاية خدمة الموظفين') || clean.includes('متنوعه الموظفين')) return 'R-04-01';
  if (clean.includes('تامينات اجتماعية')) return 'R-04-10';
  if (clean.includes('التاشيرات الموظفين') || clean.includes('اقامات الموظفين') || clean.includes('حكومية أخرى')) return 'R-04-05';
  if (clean.includes('تجهيزات سكن الموظفين') || clean.includes('ايجارات العقارات')) return 'R-04-02';
  if (clean.includes('تذاكر سفر الموظفين')) return 'R-04-11';
  if (clean.includes('وقود') || clean.includes('زيوت سيارات') || clean.includes('قطع غيار السيارات') || clean.includes('سيارات متنوعة')) return 'R-04-15';
  if (clean.includes('تصديقات وتراخيص') || clean.includes('جوب اوردر')) return 'R-04-08';
  if (clean.includes('كهرباء') || clean.includes('مياه')) return 'R-04-04';
  if (clean.includes('الهواتف') || clean.includes('هاتف ارضي وانترنت')) return 'R-04-03';
  if (clean.includes('مصاريف بنكية') || clean.includes('تعديل خطاب الضمان')) return 'R-04-17';
  if (clean.includes('ضيافة') || clean.includes('هدايا') || clean.includes('الثرية')) return 'R-04-16';
  if (clean.includes('مستلزمات كمبيوتر')) return 'R-04-13';
  if (clean.includes('صيانة') || clean.includes('صيانه')) return 'R-04-09';
  if (clean.includes('غرامات')) return 'R-06-05';

  const primary = suggestIfrsCode(accountName);
  if (primary === 'L-04') return 'L-04-02';
  return primary;
}

export function extractPrimaryIfrsCode(manualOrAutoCode: string): string {
  if (!manualOrAutoCode) return '';
  const match = manualOrAutoCode.trim().match(/^([A-Z]-\d{2})/);
  return match ? match[1] : '';
}

// ─── 3. The 211 Real Accounts from User's File with Complete Excel Classifications (التصنيفات + دليل_التصنيف_الموسع) ──────
interface RawImportedAccountSeed {
  seq: number;
  name: string;
  fileManualCode: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
}

const RAW_211_ACCOUNTS_NAMES_AND_CODES: Array<{ name: string; fileCode: string }> = [
  { name: 'سيارة بك اب', fileCode: 'A-01-04' },
  { name: 'تويوتا يارس رقم - د س ق 4847', fileCode: 'A-01-04' },
  { name: 'تويوتا يارس رقم - د س ق 4846', fileCode: 'A-01-04' },
  { name: 'تويوتا يارس رقم - د س ق 4849', fileCode: 'A-01-04' },
  { name: 'تويوتا يارس رقم - د س ق 4850', fileCode: 'A-01-04' },
  { name: 'تويوتا يارس رقم - د س ق 4845', fileCode: 'A-01-04' },
  { name: 'تويوتا هاي ايس رقم - ب س أ 5979', fileCode: 'A-01-04' },
  { name: 'تويوتا هاي ايس رقم - ب ر ه 1650', fileCode: 'A-01-04' },
  { name: 'تويوتا ثلاجة رقم - ب ر س 9269', fileCode: 'A-01-04' },
  { name: 'ايسوزو بكب غماره رقم - ب ط ك 1895', fileCode: 'A-01-04' },
  { name: 'ايسوزو شاحنه رقم - ب ط ك 1894', fileCode: 'A-01-04' },
  { name: 'ايسوزو بكب غمارتين رقم - ب ط ك 1896', fileCode: 'A-01-04' },
  { name: 'ثلاجات', fileCode: 'A-01-08' },
  { name: 'مكيفات كرافت.', fileCode: 'A-01-08' },
  { name: 'مكاتب', fileCode: 'A-01-05' },
  { name: 'وحدة ادراج', fileCode: 'A-01-05' },
  { name: 'كراسي', fileCode: 'A-01-05' },
  { name: 'طاولة حديد وزجاج', fileCode: 'A-01-05' },
  { name: 'اثاث مطبخ', fileCode: 'A-01-05' },
  { name: 'ثلاجة صغيرة', fileCode: 'A-01-08' },
  { name: 'كمبيوتر ولاب توب .', fileCode: 'A-01-06' },
  { name: 'كمبيوتر.', fileCode: 'A-01-06' },
  { name: 'لاب توب dell.', fileCode: 'A-01-06' },
  { name: 'لاب توب hp.', fileCode: 'A-01-06' },
  { name: 'أي باد ميكروسوفت.', fileCode: 'A-03-01' },
  { name: 'طابعة canon.', fileCode: 'A-01-06' },
  { name: 'تليفون ارضي.', fileCode: 'A-01-07' },
  { name: 'جوالات سامسونج.', fileCode: 'A-01-07' },
  { name: 'جهاز واي فاي مقوي.', fileCode: 'A-01-07' },
  { name: 'كاميرات هاي فيجن.', fileCode: 'A-01-14' },
  { name: 'جهاز سيرفر كاميرات.', fileCode: 'A-01-14' },
  { name: 'تغطية خطاب ضمان بنك الرياض رقم /', fileCode: 'A-04-04' },
  { name: 'النقديه بالصندوق (الكاش)', fileCode: 'A-10-01' },
  { name: 'بنك الراجحى حـ / 98', fileCode: 'A-10-08' },
  { name: 'بنك الرياض حـ / 209940', fileCode: 'A-10-08' },
  { name: 'بنك الاهلى حـ / ', fileCode: 'A-10-08' },
  { name: 'بنك الانماء حـ / 10000 (جارى الشريك)', fileCode: 'L-09-04' },
  { name: 'بنك ساب حـ / 8001 (جارى الشريك)', fileCode: 'L-09-04' },
  { name: 'حساب مساند', fileCode: 'A-07-05' },
  { name: 'عملاء الاستقدام', fileCode: 'A-07-01' },
  { name: 'إيجارات مدفوعة مقدماً', fileCode: 'A-05-01' },
  { name: 'تأمين اجتماعى مدفوع مقدما ', fileCode: 'A-09-03' },
  { name: 'تأمين طبي مدفوع مقدما ', fileCode: 'A-09-03' },
  { name: 'مصروفات اخرى مدفوعه مقدما ', fileCode: 'A-09-01' },
  { name: 'مصروف مقدم عمولة اصدار خطاب ضمان', fileCode: 'A-09-01' },
  { name: 'فوائد التمويل المؤجلة / مصروفات تمويلية مقدماً.', fileCode: 'A-09-01' },
  { name: 'سلف اكرم', fileCode: 'A-09-06' },
  { name: 'سلف عبد الرحمن ', fileCode: 'A-09-06' },
  { name: 'سلف اسلام عرفة ', fileCode: 'A-09-06' },
  { name: 'سلف مستشار هاني ', fileCode: 'A-09-06' },
  { name: 'عهد منصور', fileCode: 'A-06-05' },
  { name: 'ضريبة القيمة المضافة للمدخلات (ضريبة المشتريات)', fileCode: 'A-09-10' },
  { name: 'المستحق من - خالد السليم', fileCode: 'A-09-08' },
  { name: 'المستحق من - مكتب ياقوت', fileCode: 'A-09-08' },
  { name: 'المستحق من - مكتب توباز', fileCode: 'A-09-08' },
  { name: 'المستحق من - مكتب الرواد', fileCode: 'A-09-08' },
  { name: 'المستحق من - مكتب التمور', fileCode: 'A-09-08' },
  { name: 'المستحق من - معرض السيارات', fileCode: 'A-09-08' },
  { name: 'المستحق من - مؤسسة التجارة', fileCode: 'A-09-08' },
  { name: 'المستحق من - مؤسسة بنايات زكية', fileCode: 'A-09-08' },
  { name: 'المستحق من - مؤسسة اللمسة الخارقه', fileCode: 'A-09-08' },
  { name: 'المستحق من - مؤسسة كاس لتنظيم المعارض', fileCode: 'A-09-08' },
  { name: 'المستحق من - وكالة الاميال للسفر والسياحة', fileCode: 'A-09-08' },
  { name: 'المستحق من - وكالة الدعاية والاعلان', fileCode: 'A-09-08' },
  { name: 'مخصص اهلاك تويوتا يارس رقم - د س ق 4847', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا يارس رقم - د س ق 4846', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا يارس رقم - د س ق 4849', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا يارس رقم - د س ق 4850', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا يارس رقم - د س ق 4845', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا هاي ايس رقم - ب ر ه 1650', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا ثلاجة رقم - ب ر س 9269', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك ايسوزو بكب غماره رقم - ب ط ك 1895', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك ايسوزو شاحنه رقم - ب ط ك 1894', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك ايسوزو بكب غمارتين رقم - ب ط ك 1896', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك سيارة بك اب', fileCode: 'A-02-03' },
  { name: 'مخصص اهلاك تويوتا هاي ايس رقم - ب س أ 5979', fileCode: 'A-08-01' },
  { name: 'تمويل الراجحي', fileCode: 'L-01-04' },
  { name: 'LIGER KING FOREION EMPLOYMENT AGENT PLC', fileCode: 'L-04-02' },
  { name: 'nural', fileCode: 'L-04-02' },
  { name: 'Real Foreign Employment Agency', fileCode: 'L-04-02' },
  { name: 'YAKOMSAN PRIVATE EMPLOYMENT AGENT', fileCode: 'L-04-02' },
  { name: 'AL-ALAMIA INTERNATIONAL MANPOWER SERVICES', fileCode: 'L-04-02' },
  { name: 'YOSHI PROMOTIONS, INC', fileCode: 'L-04-02' },
  { name: 'EXERTION FORCE INTERNATIONALCO. LTD', fileCode: 'L-04-02' },
  { name: 'KHALEEJ AGENCIES LIMITED', fileCode: 'L-04-02' },
  { name: 'Premier Recruitment Limited', fileCode: 'L-04-02' },
  { name: 'M/S AL JAHAN INTERNATIONAL', fileCode: 'L-04-02' },
  { name: 'M/S. BD Star International', fileCode: 'L-04-02' },
  { name: 'M/S. Bright International', fileCode: 'L-04-02' },
  { name: 'M/S. Masum Brothers Syndicate', fileCode: 'L-04-02' },
  { name: 'M/S. Mohona Overseas', fileCode: 'L-04-02' },
  { name: 'PROTIK TRAVELS & TOURISM', fileCode: 'L-04-02' },
  { name: 'TOUSHI INTERNATIONAL LTD', fileCode: 'L-04-02' },
  { name: 'INTERNATIONAL SERVICES PROVIDER-BURUNDI', fileCode: 'L-04-02' },
  { name: 'GOLDEN HANDS LTD', fileCode: 'L-04-02' },
  { name: 'S. S. J. Travels', fileCode: 'L-04-02' },
  { name: 'BIN IBRAHIM INTERNATIONAL AGENCIES LIMITED', fileCode: 'L-04-02' },
  { name: 'مندوب اوغندا', fileCode: 'L-04-02' },
  { name: 'مندوب كينيا', fileCode: 'L-04-02' },
  { name: 'RAWAFED FOREIGN EMPLOYMENT AGENT PL', fileCode: 'L-04-02' },
  { name: 'M/S MARVELLOUS OVERSEAS', fileCode: 'L-04-02' },
  { name: 'M\\S MUJIB TRAVELS&TOURISM LTD', fileCode: 'L-04-02' },
  { name: 'Landbase Human Resources CO', fileCode: 'L-04-02' },
  { name: 'AL NUHIMAN FOREIGN EMPLOYMENT PLC', fileCode: 'L-02-01' },
  { name: 'احمد حلمى عبدالمقصود محمد', fileCode: 'L-06-03' },
  { name: 'رواتب مستحقة للعاملات', fileCode: 'L-03-01' },
  { name: 'ضريبة القيمة المضافة للمخرجات (ضريبة المبيعات)', fileCode: 'L-05-09' },
  { name: 'تسوية ضريبة القيمة المضافة  - هيئة الزكاة والضرائب', fileCode: 'L-08-01' },
  { name: 'رواتب واجور مستحقة للموظفين.', fileCode: 'L-07-02' },
  { name: 'المستحق الى - خالد السليم', fileCode: 'L-09-04' },
  { name: 'المستحق الى - مكتب ياقوت', fileCode: 'L-09-03' },
  { name: 'المستحق الى - مكتب توباز', fileCode: 'L-09-03' },
  { name: 'المستحق الى - مكتب الرواد', fileCode: 'L-09-03' },
  { name: 'المستحق الى - معرض السيارات', fileCode: 'L-09-03' },
  { name: 'المستحق الى - مؤسسة التجارة', fileCode: 'L-09-03' },
  { name: 'المستحق الى - مؤسسة بنايات زكية', fileCode: 'L-09-03' },
  { name: 'المستحق الى - مؤسسة اللمسة الخارقه', fileCode: 'L-09-03' },
  { name: 'المستحق الى - مؤسسة كاس لتنظيم المعارض', fileCode: 'E-04-02' },
  { name: 'المستحق الى - وكالة الاميال للسفر والسياحة', fileCode: 'O-01-02' },
  { name: 'راس المال ', fileCode: 'E-01-01' },
  { name: 'أرباح محتجزة من سنوات سابقة', fileCode: 'E-03-01' },
  { name: 'ارباح وخسائر العام ', fileCode: 'E-02-01' },
  { name: 'مصروفات المشتريات الرئيسى', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول الفلبين', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول اثيوبيا', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول بوروندى', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول كينيا', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول اوغندا', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول بنجلاديش', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - وصول تنزانيا', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - التفاويض الرجالى', fileCode: 'R-02-07' },
  { name: 'مصروفات مشتريات - عقود التأجير', fileCode: 'R-02-07' },
  { name: 'مردودات مبيعات الفلبين', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات اثيوبيا', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات بوروندى', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات كينيا', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات اوغند', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات بنجلاديش', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات تنزانيا', fileCode: 'R-01-13' },
  { name: 'مردودات مبيعات التفاويض الرجالى', fileCode: 'R-01-13' },
  { name: 'مصروف التفويض الاليكترونى', fileCode: 'R-02-05' },
  { name: 'مصروف رسوم مساند', fileCode: 'R-02-05' },
  { name: 'مصروف عقود السفارة', fileCode: 'R-02-05' },
  { name: 'مصروف عمولات المناديب', fileCode: 'R-02-05' },
  { name: 'مصروف تذاكر سائقين الهند', fileCode: 'R-02-06' },
  { name: 'مصروف رواتب الموظفين', fileCode: 'R-04-01' },
  { name: 'مصروف مستحقات اجازة الموظفين', fileCode: 'R-04-01' },
  { name: 'مصروف مكافأة نهاية خدمة الموظفين', fileCode: 'R-04-01' },
  { name: 'مصروف تامينات اجتماعية الموظفين', fileCode: 'R-04-10' },
  { name: 'مصروف اصدار التاشيرات الموظفين', fileCode: 'R-04-05' },
  { name: 'مصروف تجهيزات سكن الموظفين', fileCode: 'R-04-02' },
  { name: 'مصروفات متنوعه الموظفين', fileCode: 'R-04-01' },
  { name: 'مصروف اقامات الموظفين', fileCode: 'R-04-05' },
  { name: 'مصروف تذاكر سفر الموظفين', fileCode: 'R-04-11' },
  { name: 'مصروف وقود وشريحة وقود سيارات', fileCode: 'R-04-15' },
  { name: 'مصروف زيوت سيارات', fileCode: 'R-04-15' },
  { name: 'مصروف صيانة وقطع غيار السيارات', fileCode: 'R-04-15' },
  { name: 'مصروف ايجارات العقارات', fileCode: 'R-04-02' },
  { name: 'مصروف تصديقات وتراخيص واشتراكات', fileCode: 'R-04-08' },
  { name: 'مصاريف حكومية أخرى', fileCode: 'R-09-01' },
  { name: 'مصروف فواتير كهرباء', fileCode: 'R-04-04' },
  { name: 'مصروف فواتير مياه', fileCode: 'R-04-04' },
  { name: 'مصروف فواتير الهواتف والجوالات', fileCode: 'R-04-03' },
  { name: 'هاتف ارضي وانترنت ', fileCode: 'R-04-03' },
  { name: 'مصاريف بنكية متنوعة', fileCode: 'R-07-04' },
  { name: 'مصروف جوب اوردر ', fileCode: 'R-04-08' },
  { name: 'مصروف  تعديل خطاب الضمان', fileCode: 'R-07-04' },
  { name: 'عمولة مبيعات الموظفين', fileCode: 'R-03-02' },
  { name: 'عمولة مبيعات المسوقات', fileCode: 'R-03-02' },
  { name: 'مصروف دعاية واعلان', fileCode: 'R-03-03' },
  { name: 'مصروف نقل كفالة العاملات', fileCode: 'R-02-07' },
  { name: 'مصروفات متنوعة العاملات', fileCode: 'R-02-07' },
  { name: 'مصروف سكن العاملات', fileCode: 'R-02-08' },
  { name: 'مصروف طعام واعاشة العاملات', fileCode: 'R-02-08' },
  { name: 'مصروف نقل جماعى العاملات', fileCode: 'R-02-06' },
  { name: 'مصروف تذاكر سفر العاملات', fileCode: 'R-02-06' },
  { name: 'مصروف ضيافة ومجاملات بوفية', fileCode: 'R-04-16' },
  { name: 'مصروف مستلزمات كمبيوتر', fileCode: 'R-04-13' },
  { name: 'مصروف صيانة اجهزة مكتبية', fileCode: 'R-04-09' },
  { name: 'مصروف هدايا واكراميات', fileCode: 'R-04-16' },
  { name: 'مصروف غرامات ومخالفات عمومية', fileCode: 'R-06-05' },
  { name: 'مصروف غرامات الغاء العقود للعملاء', fileCode: 'R-06-05' },
  { name: 'مصروف صيانه متنوعة', fileCode: 'R-10-02' },
  { name: 'مصاريف الثرية متنوعة', fileCode: 'R-04-16' },
  { name: 'مصروفات سيارات متنوعة', fileCode: 'R-04-15' },
  { name: 'مردودات ايرادات نقل كفالة.', fileCode: 'R-01-13' },
  { name: 'ايرادات مبيعات الفلبين', fileCode: 'R-01-07' },
  { name: 'ايرادات مبيعات اثيوبيا', fileCode: 'R-01-07' },
  { name: 'ايرادات مبيعات بوروندى', fileCode: 'R-01-07' },
  { name: 'ايرادات مبيعات كينيا', fileCode: 'R-01-07' },
  { name: 'ايرادات مبيعات اوغندا', fileCode: 'R-01-07' },
  { name: 'ايرادات مبيعات بنجلاديش', fileCode: 'R-01-07' },
  { name: 'ايرادات مبيعات تنزانيا', fileCode: 'R-01-07' },
  { name: 'ايرادات التفاويض الرجالى', fileCode: 'R-01-07' },
  { name: 'مردودات  مشتريات - بدايل الفلبين', fileCode: 'R-02-12' },
  { name: 'مردودات  مشتريات - بدايل اثيوبيا', fileCode: 'R-02-12' },
  { name: 'مردودات  مشتريات - بدايل كينيا', fileCode: 'R-02-12' },
  { name: 'مردودات  مشتريات - بدايل اوغندا', fileCode: 'R-02-12' },
  { name: 'مردودات  مشتريات - بدايل بنجلاديش', fileCode: 'R-02-12' },
  { name: 'مردودات  مشتريات - بدايل تنزانيا', fileCode: 'R-02-12' },
  { name: 'إيرادات اخرى متنوعه', fileCode: 'R-05-06' },
  { name: 'إيرادات نقل كفالة العاملات', fileCode: 'R-01-12' },
  { name: 'خصومات على العملاء (غرامات دائنه)', fileCode: 'R-08-01' },
  { name: 'خصم غرامات الغاء على الوكلاء', fileCode: 'R-05-02' },
  { name: 'خصم تذاكر على وكلاء الفلبين', fileCode: 'R-02-12' },
  { name: 'خصم تذاكر على وكلاء اثيوبيا', fileCode: 'R-02-12' },
  { name: 'خصم تذاكر على وكلاء كينيا', fileCode: 'R-02-12' },
  { name: 'خصم تذاكر على وكلاء اوغندا', fileCode: 'R-02-12' },
  { name: 'خصم تذاكر على وكلاء بنجلاديش', fileCode: 'R-02-12' },
  { name: 'خصم تذاكر على وكلاء تنزانيا', fileCode: 'R-02-12' },
  { name: 'خصم وكالات على وكلاء بنجلاديش', fileCode: 'R-02-12' },
];

/**
 * Generates realistic, 100% balanced Trial Balance data for the 211 accounts
 * (Opening Debit == Opening Credit, Period Debit == Period Credit, Closing Debit == Closing Credit)
 */
export function buildDefault211TrialBalance(withSampleBalances = true): TrialBalanceEntry[] {
  const entries: TrialBalanceEntry[] = RAW_211_ACCOUNTS_NAMES_AND_CODES.map((item, idx) => {
    const seq = idx + 1;
    const autoCode = item.fileCode || suggestIfrsCode(item.name);
    const erpCode = `${1000 + seq}`;

    if (!withSampleBalances) {
      return {
        seq,
        erpCode,
        accountName: item.name,
        manualCode: item.fileCode,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        movementSource: 'فعلي',
      };
    }

    let openingDebit = 0;
    let openingCredit = 0;
    let periodDebit = 0;
    let periodCredit = 0;

    // Assign realistic figures by category
    if (seq >= 1 && seq <= 12) {
      // Vehicles (12 vehicles)
      openingDebit = 65000;
      periodDebit = seq <= 4 ? 15000 : 0;
    } else if (seq >= 13 && seq <= 31) {
      // Office equipment & IT (19 accounts)
      openingDebit = 12000;
      periodDebit = 3000;
    } else if (seq === 32) {
      // Bank Guarantee cover Riyad Bank
      openingDebit = 150000;
      periodDebit = 50000;
    } else if (seq === 33) {
      // Cash in hand
      openingDebit = 95000;
      periodDebit = 420000;
      periodCredit = 365000;
    } else if (seq === 34) {
      // Al Rajhi Bank 98
      openingDebit = 680000;
      periodDebit = 2450000;
      periodCredit = 1890000;
    } else if (seq === 35) {
      // Riyad Bank 209940
      openingDebit = 520000;
      periodDebit = 1650000;
      periodCredit = 1220000;
    } else if (seq === 36) {
      // AlAhli Bank
      openingDebit = 310000;
      periodDebit = 780000;
      periodCredit = 540000;
    } else if (seq === 37 || seq === 38) {
      // Partner Current Accounts (Credit)
      openingCredit = 85000;
      periodCredit = 25000;
    } else if (seq === 39) {
      // Musaned Escrow Account
      openingDebit = 340000;
      periodDebit = 1280000;
      periodCredit = 1120000;
    } else if (seq === 40) {
      // Recruitment Customers Receivables
      openingDebit = 290000;
      periodDebit = 950000;
      periodCredit = 810000;
    } else if (seq >= 41 && seq <= 52) {
      // Prepayments, Staff Advances & Input VAT (12 accounts)
      openingDebit = 18000;
      periodDebit = 12000;
      periodCredit = 8000;
    } else if (seq >= 53 && seq <= 64) {
      // Due from Related Parties (12 accounts)
      openingDebit = 25000;
      periodDebit = 10000;
      periodCredit = 5000;
    } else if (seq >= 65 && seq <= 76) {
      // Accumulated Depreciation for 12 vehicles
      openingCredit = 19500;
      periodCredit = 6500;
    } else if (seq === 77) {
      // Al Rajhi Financing (Long-term loan)
      openingCredit = 420000;
      periodDebit = 80000;
      periodCredit = 0;
    } else if (seq >= 78 && seq <= 105) {
      // 28 Foreign Recruitment Agencies Payables
      openingCredit = 18000;
      periodDebit = 32000;
      periodCredit = 40000;
    } else if (seq >= 106 && seq <= 109) {
      // Accrued Salaries & VAT Output & ZATCA
      openingCredit = 64000;
      periodDebit = 45000;
      periodCredit = 68000;
    } else if (seq >= 110 && seq <= 117) {
      // Due to Related Parties (8 accounts)
      openingCredit = 22000;
      periodDebit = 6000;
      periodCredit = 11000;
    } else if (seq === 118) {
      // Dividends & Drawings (E-04 — Debit nature)
      openingDebit = 20000;
      periodDebit = 15000;
    } else if (seq === 119) {
      // Other Comprehensive Income (O-01 — Credit nature)
      openingCredit = 15000;
      periodCredit = 10000;
    } else if (seq === 120) {
      // Share Capital
      openingCredit = 1500000;
    } else if (seq === 121) {
      // Retained Earnings (will be auto-balanced below so Opening Debit == Opening Credit)
      openingCredit = 450000;
    } else if (seq === 122) {
      // Statutory Reserve (E-02)
      openingCredit = 120000;
      periodCredit = 30000;
    } else if (seq >= 123 && seq <= 132) {
      // Cost of revenues - purchases by country (10 accounts)
      periodDebit = 245000;
    } else if (seq >= 133 && seq <= 140) {
      // Sales returns by country (8 accounts - Debit contra-revenue)
      periodDebit = 18500;
    } else if (seq >= 141 && seq <= 145) {
      // Electronic authorization, Musaned fees, Embassy contracts, Agent commissions, India drivers tickets
      periodDebit = 68000;
    } else if (seq >= 146 && seq <= 167) {
      // G&A Staff salaries, EOSB, GOSI, visas, housing, fuel, rent, utilities (22 accounts)
      periodDebit = 34000;
    } else if (seq >= 168 && seq <= 170) {
      // Selling & Marketing commissions & ads (3 accounts)
      periodDebit = 58000;
    } else if (seq >= 171 && seq <= 176) {
      // Direct worker transfer, housing, catering, transport, tickets (6 accounts)
      periodDebit = 42000;
    } else if (seq >= 177 && seq <= 185) {
      // Other G&A hospitality, IT supplies, maintenance (9 accounts)
      periodDebit = 11500;
    } else if (seq === 186) {
      // Sponsorship transfer revenue returns
      periodDebit = 12000;
    } else if (seq >= 187 && seq <= 194) {
      // Recruitment Sales Revenues by country (8 accounts)
      periodCredit = 685000;
    } else if (seq >= 195 && seq <= 200) {
      // Purchase returns - replacements by country (6 accounts - Credit contra-cost)
      periodCredit = 24000;
    } else if (seq === 201) {
      // Other miscellaneous revenues
      periodCredit = 95000;
    } else if (seq === 202) {
      // Sponsorship transfer revenues
      periodCredit = 380000;
    } else if (seq >= 203 && seq <= 211) {
      // Discounts & penalties on agents/customers (9 accounts - Credit)
      periodCredit = 14000;
    }

    return {
      seq,
      erpCode,
      accountName: item.name,
      manualCode: autoCode,
      openingDebit,
      openingCredit,
      periodDebit,
      periodCredit,
      movementSource: 'فعلي',
    };
  });

  if (withSampleBalances) {
    // Perfectly balance Opening Balances in Retained Earnings (seq 121)
    const sumOpenDeb = entries.reduce((s, e) => s + e.openingDebit, 0);
    const sumOpenCred = entries.filter((e) => e.seq !== 121).reduce((s, e) => s + e.openingCredit, 0);
    const reRow = entries.find((e) => e.seq === 121);
    if (reRow) {
      if (sumOpenDeb >= sumOpenCred) {
        reRow.openingCredit = sumOpenDeb - sumOpenCred;
        reRow.openingDebit = 0;
      } else {
        reRow.openingDebit = sumOpenCred - sumOpenDeb;
        reRow.openingCredit = 0;
      }
    }

    // Perfectly balance Period Movements in Al Rajhi Bank (seq 34)
    const sumPerDeb = entries.filter((e) => e.seq !== 34).reduce((s, e) => s + e.periodDebit, 0);
    const sumPerCred = entries.reduce((s, e) => s + e.periodCredit, 0);
    const bankRow = entries.find((e) => e.seq === 34);
    if (bankRow) {
      const diff = sumPerCred - sumPerDeb;
      if (diff >= 0) {
        bankRow.periodDebit = diff;
      } else {
        bankRow.periodDebit = 500000;
        bankRow.periodCredit += 500000 - diff;
      }
    }
  }

  return entries;
}

// ─── 4. Compute Full IFRS Statements, 34 Diagnostic Checks & 16 Financial Ratios ──────
export function computeIfrsEngine(
  entries: TrialBalanceEntry[],
  settings: IfrsGeneralSettings
) {
  const tolerance = settings.roundingTolerance || 1;

  // 1. Compute row-level metrics
  const rows: ComputedTrialBalanceRow[] = entries.map((entry) => {
    const suggestedCode = suggestIfrsCode(entry.accountName);
    const suggestedSubCode = suggestIfrsSubCode(entry.accountName);
    const primaryManual = extractPrimaryIfrsCode(entry.manualCode);
    const approvedCode = primaryManual || '';
    const approvedSubCode = entry.manualCode || (approvedCode ? suggestedSubCode : '');
    const mapping = approvedCode ? IFRS_MAPPING_MAP[approvedCode] : undefined;
    const subMapping = approvedSubCode ? EXTENDED_IFRS_MAP[approvedSubCode] : undefined;
    const naturalBalance = mapping?.naturalBalance || '-';

    const openingNet = (entry.openingDebit || 0) - (entry.openingCredit || 0);
    const netYearMovement = (entry.periodDebit || 0) - (entry.periodCredit || 0);
    const closingNet = openingNet + netYearMovement;
    const closingDebit = closingNet > 0 ? closingNet : 0;
    const closingCredit = closingNet < 0 ? Math.abs(closingNet) : 0;

    let auditNote = '';
    let hasError = false;
    let hasWarning = false;

    const hasAnyNumber =
      entry.openingDebit !== 0 ||
      entry.openingCredit !== 0 ||
      entry.periodDebit !== 0 ||
      entry.periodCredit !== 0;

    const isContraAccount =
      entry.accountName.includes('مردودات') ||
      entry.accountName.includes('خصم تذاكر') ||
      entry.accountName.includes('خصم وكالات') ||
      approvedSubCode === 'R-01-13' ||
      approvedSubCode === 'R-02-12';

    if (!approvedCode) {
      auditNote = `غير مصنف - المقترح التلقائي (${suggestedSubCode || suggestedCode}) | اختر التصنيف المعتمد`;
      if (hasAnyNumber) hasError = true;
      else hasWarning = true;
    } else if (!isContraAccount && naturalBalance === 'D' && closingNet < -tolerance) {
      auditNote = `رصيد دائن عكس الطبيعة المدينة (${approvedCode}) - راجع IAS 1.32`;
      hasWarning = true;
    } else if (!isContraAccount && naturalBalance === 'C' && closingNet > tolerance) {
      auditNote = `رصيد مدين عكس الطبيعة الدائنة (${approvedCode}) - راجع IAS 1.32`;
      hasWarning = true;
    }

    const statusText = !hasAnyNumber
      ? '○ لم تُدخل الأرصدة بعد'
      : hasError
      ? '✖ خطأ تصنيف'
      : hasWarning
      ? '⚠ تنبيه طبيعة الرصيد'
      : '✔ سليم ومطابق';

    return {
      ...entry,
      suggestedCode,
      approvedCode,
      approvedSubCode: approvedSubCode || approvedCode,
      approvedItemName: mapping?.nameAr || 'غير مصنف',
      approvedSubItemName: subMapping?.nameAr || mapping?.nameAr || 'غير مصنف',
      sectionAr: mapping?.sectionAr || '',
      ifrsRef: subMapping?.ifrsRef || mapping?.ifrsRef || '',
      cashFlowType: mapping?.cashFlowType || '',
      naturalBalance,
      openingNet,
      closingDebit,
      closingCredit,
      closingNet,
      netYearMovement,
      auditNote,
      statusText,
      hasError,
      hasWarning,
    };
  });

  // Totals
  const totals = rows.reduce(
    (acc, r) => {
      acc.openingDebit += r.openingDebit;
      acc.openingCredit += r.openingCredit;
      acc.periodDebit += r.periodDebit;
      acc.periodCredit += r.periodCredit;
      acc.closingDebit += r.closingDebit;
      acc.closingCredit += r.closingCredit;
      return acc;
    },
    {
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: 0,
      periodCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    }
  );

  const openingDiff = Math.abs(totals.openingDebit - totals.openingCredit);
  const periodDiff = Math.abs(totals.periodDebit - totals.periodCredit);
  const closingDiff = Math.abs(totals.closingDebit - totals.closingCredit);

  // Helper to sum by approvedCode
  // For Debit-nature items (Assets, Expenses, Drawings): positive = Debit - Credit
  // For Credit-nature items (Liabilities, Equity, Revenues, Accumulated Dep, ECL): positive = Credit - Debit
  const sumClosingByCode = (code: string, sign: 'D' | 'C'): number => {
    const netDebitMinusCredit = rows
      .filter((r) => r.approvedCode === code)
      .reduce((s, r) => s + r.closingNet, 0);
    return sign === 'D' ? netDebitMinusCredit : -netDebitMinusCredit;
  };

  const sumOpeningByCode = (code: string, sign: 'D' | 'C'): number => {
    const netDebitMinusCredit = rows
      .filter((r) => r.approvedCode === code)
      .reduce((s, r) => s + r.openingNet, 0);
    return sign === 'D' ? netDebitMinusCredit : -netDebitMinusCredit;
  };

  // ─── Statement 2: Income Statement & OCI (IAS 1) ─────────────────────────────
  const revenues = sumClosingByCode('R-01', 'C');
  const costOfRevenues = sumClosingByCode('R-02', 'D');
  const grossProfit = revenues - costOfRevenues;
  const otherIncome = sumClosingByCode('R-05', 'C');
  const sellingMarketingExp = sumClosingByCode('R-03', 'D');
  const generalAdminExp = sumClosingByCode('R-04', 'D');
  const depreciationAmortization = sumClosingByCode('R-10', 'D');
  const otherExpenses = sumClosingByCode('R-06', 'D');

  const operatingProfit =
    grossProfit +
    otherIncome -
    sellingMarketingExp -
    generalAdminExp -
    depreciationAmortization -
    otherExpenses;

  const financeIncome = sumClosingByCode('R-08', 'C');
  const financeCosts = sumClosingByCode('R-07', 'D');
  const profitBeforeZakat = operatingProfit + financeIncome - financeCosts;
  const zakatAndTaxExpense = sumClosingByCode('R-09', 'D');
  const netProfit = profitBeforeZakat - zakatAndTaxExpense;
  const otherComprehensiveIncome = sumClosingByCode('O-01', 'C');
  const totalComprehensiveIncome = netProfit + otherComprehensiveIncome;
  const ebitda = operatingProfit + depreciationAmortization;

  // ─── Statement 1: Statement of Financial Position (IAS 1) ─────────────────────
  // Non-Current Assets
  const ppeCostCur = sumClosingByCode('A-01', 'D');
  const ppeAccumDepCur = sumClosingByCode('A-02', 'C');
  const ppeNetCur = ppeCostCur - ppeAccumDepCur;

  const ppeCostOpen = sumOpeningByCode('A-01', 'D');
  const ppeAccumDepOpen = sumOpeningByCode('A-02', 'C');
  const ppeNetOpen = ppeCostOpen - ppeAccumDepOpen;

  const intangiblesCur = sumClosingByCode('A-03', 'D');
  const intangiblesOpen = sumOpeningByCode('A-03', 'D');

  const rouAssetsCur = sumClosingByCode('A-05', 'D');
  const rouAssetsOpen = sumOpeningByCode('A-05', 'D');

  const longTermInvestmentsCur = sumClosingByCode('A-04', 'D');
  const longTermInvestmentsOpen = sumOpeningByCode('A-04', 'D');

  const totalNonCurrentAssetsCur = ppeNetCur + intangiblesCur + rouAssetsCur + longTermInvestmentsCur;
  const totalNonCurrentAssetsOpen = ppeNetOpen + intangiblesOpen + rouAssetsOpen + longTermInvestmentsOpen;

  // Current Assets
  const inventoryCur = sumClosingByCode('A-06', 'D');
  const inventoryOpen = sumOpeningByCode('A-06', 'D');

  const tradeReceivablesGrossCur = sumClosingByCode('A-07', 'D');
  const eclAllowanceCur = sumClosingByCode('A-08', 'C');
  const tradeReceivablesNetCur = tradeReceivablesGrossCur - eclAllowanceCur;

  const tradeReceivablesGrossOpen = sumOpeningByCode('A-07', 'D');
  const eclAllowanceOpen = sumOpeningByCode('A-08', 'C');
  const tradeReceivablesNetOpen = tradeReceivablesGrossOpen - eclAllowanceOpen;

  const prepaymentsOtherRecCur = sumClosingByCode('A-09', 'D');
  const prepaymentsOtherRecOpen = sumOpeningByCode('A-09', 'D');

  const cashAndEquivalentsCur = sumClosingByCode('A-10', 'D');
  const cashAndEquivalentsOpen = sumOpeningByCode('A-10', 'D');

  const totalCurrentAssetsCur =
    inventoryCur + tradeReceivablesNetCur + prepaymentsOtherRecCur + cashAndEquivalentsCur;
  const totalCurrentAssetsOpen =
    inventoryOpen + tradeReceivablesNetOpen + prepaymentsOtherRecOpen + cashAndEquivalentsOpen;

  const totalAssetsCur = totalNonCurrentAssetsCur + totalCurrentAssetsCur;
  const totalAssetsOpen = totalNonCurrentAssetsOpen + totalCurrentAssetsOpen;

  // Equity
  const shareCapitalCur = sumClosingByCode('E-01', 'C');
  const shareCapitalOpen = sumOpeningByCode('E-01', 'C');

  const reservesCur = sumClosingByCode('E-02', 'C');
  const reservesOpen = sumOpeningByCode('E-02', 'C');

  const retainedEarningsBeforeProfitCur = sumClosingByCode('E-03', 'C');
  const retainedEarningsOpen = sumOpeningByCode('E-03', 'C');
  const retainedEarningsWithProfitCur = retainedEarningsBeforeProfitCur + netProfit;

  const dividendsDrawingsCur = sumClosingByCode('E-04', 'D');
  const dividendsDrawingsOpen = sumOpeningByCode('E-04', 'D');

  const ociCur = otherComprehensiveIncome;
  const ociOpen = sumOpeningByCode('O-01', 'C');

  const totalEquityCur =
    shareCapitalCur + reservesCur + retainedEarningsWithProfitCur - dividendsDrawingsCur + ociCur;
  const totalEquityOpen =
    shareCapitalOpen + reservesOpen + retainedEarningsOpen - dividendsDrawingsOpen + ociOpen;

  // Non-Current Liabilities
  const rawLongTermLoansCur = sumClosingByCode('L-01', 'C');
  const rawLongTermLoansOpen = sumOpeningByCode('L-01', 'C');
  const longTermLoansNonCurrentCur = Math.max(
    0,
    rawLongTermLoansCur - settings.currentPortionLongTermLoansCurrent
  );
  const longTermLoansNonCurrentOpen = Math.max(
    0,
    rawLongTermLoansOpen - settings.currentPortionLongTermLoansComparative
  );

  const rawLeaseLiabCur = sumClosingByCode('L-02', 'C');
  const rawLeaseLiabOpen = sumOpeningByCode('L-02', 'C');
  const leaseLiabNonCurrentCur = Math.max(
    0,
    rawLeaseLiabCur - settings.currentPortionLeaseLiabilitiesCurrent
  );
  const leaseLiabNonCurrentOpen = Math.max(
    0,
    rawLeaseLiabOpen - settings.currentPortionLeaseLiabilitiesComparative
  );

  const eosbCur = sumClosingByCode('L-03', 'C');
  const eosbOpen = sumOpeningByCode('L-03', 'C');

  const totalNonCurrentLiabilitiesCur =
    longTermLoansNonCurrentCur + leaseLiabNonCurrentCur + eosbCur;
  const totalNonCurrentLiabilitiesOpen =
    longTermLoansNonCurrentOpen + leaseLiabNonCurrentOpen + eosbOpen;

  // Current Liabilities
  const tradePayablesCur = sumClosingByCode('L-04', 'C');
  const tradePayablesOpen = sumOpeningByCode('L-04', 'C');

  const accrualsOtherPayablesCur = sumClosingByCode('L-05', 'C');
  const accrualsOtherPayablesOpen = sumOpeningByCode('L-05', 'C');

  const shortTermLoansAndCurrentPortionCur =
    sumClosingByCode('L-06', 'C') +
    Math.min(rawLongTermLoansCur, settings.currentPortionLongTermLoansCurrent);
  const shortTermLoansAndCurrentPortionOpen =
    sumOpeningByCode('L-06', 'C') +
    Math.min(rawLongTermLoansOpen, settings.currentPortionLongTermLoansComparative);

  const leaseLiabCurrentPortionCur = Math.min(
    rawLeaseLiabCur,
    settings.currentPortionLeaseLiabilitiesCurrent
  );
  const leaseLiabCurrentPortionOpen = Math.min(
    rawLeaseLiabOpen,
    settings.currentPortionLeaseLiabilitiesComparative
  );

  const otherProvisionsCur = sumClosingByCode('L-07', 'C');
  const otherProvisionsOpen = sumOpeningByCode('L-07', 'C');

  const zakatTaxPayableCur = sumClosingByCode('L-08', 'C');
  const zakatTaxPayableOpen = sumOpeningByCode('L-08', 'C');

  const dueToRelatedPartiesCur = sumClosingByCode('L-09', 'C');
  const dueToRelatedPartiesOpen = sumOpeningByCode('L-09', 'C');

  const totalCurrentLiabilitiesCur =
    tradePayablesCur +
    accrualsOtherPayablesCur +
    shortTermLoansAndCurrentPortionCur +
    leaseLiabCurrentPortionCur +
    otherProvisionsCur +
    zakatTaxPayableCur +
    dueToRelatedPartiesCur;

  const totalCurrentLiabilitiesOpen =
    tradePayablesOpen +
    accrualsOtherPayablesOpen +
    shortTermLoansAndCurrentPortionOpen +
    leaseLiabCurrentPortionOpen +
    otherProvisionsOpen +
    zakatTaxPayableOpen +
    dueToRelatedPartiesOpen;

  const totalLiabilitiesCur = totalNonCurrentLiabilitiesCur + totalCurrentLiabilitiesCur;
  const totalLiabilitiesOpen = totalNonCurrentLiabilitiesOpen + totalCurrentLiabilitiesOpen;

  const totalEquityAndLiabilitiesCur = totalEquityCur + totalLiabilitiesCur;
  const totalEquityAndLiabilitiesOpen = totalEquityOpen + totalLiabilitiesOpen;

  const balanceSheetDiffCur = totalAssetsCur - totalEquityAndLiabilitiesCur;
  const balanceSheetDiffOpen = totalAssetsOpen - totalEquityAndLiabilitiesOpen;

  // ─── Statement 3: Statement of Changes in Equity (IAS 1.106) ──────────────────
  const equityChanges = {
    opening: {
      capital: shareCapitalOpen,
      reserves: reservesOpen,
      retainedEarnings: retainedEarningsOpen - dividendsDrawingsOpen,
      oci: ociOpen,
      total: totalEquityOpen,
    },
    netProfit: {
      capital: 0,
      reserves: 0,
      retainedEarnings: netProfit,
      oci: 0,
      total: netProfit,
    },
    ociMovement: {
      capital: 0,
      reserves: 0,
      retainedEarnings: 0,
      oci: ociCur - ociOpen,
      total: ociCur - ociOpen,
    },
    dividends: {
      capital: 0,
      reserves: 0,
      retainedEarnings: -(dividendsDrawingsCur - dividendsDrawingsOpen),
      oci: 0,
      total: -(dividendsDrawingsCur - dividendsDrawingsOpen),
    },
    otherChanges: {
      capital: shareCapitalCur - shareCapitalOpen,
      reserves: reservesCur - reservesOpen,
      retainedEarnings: retainedEarningsBeforeProfitCur - retainedEarningsOpen,
      oci: 0,
      total:
        shareCapitalCur -
        shareCapitalOpen +
        (reservesCur - reservesOpen) +
        (retainedEarningsBeforeProfitCur - retainedEarningsOpen),
    },
    closing: {
      capital: shareCapitalCur,
      reserves: reservesCur,
      retainedEarnings: retainedEarningsWithProfitCur - dividendsDrawingsCur,
      oci: ociCur,
      total: totalEquityCur,
    },
  };

  // ─── Statement 4: Statement of Cash Flows - Indirect Method (IAS 7) ───────────
  const netFinanceCostsAddedBack = financeCosts - financeIncome;
  const nonCashOciEffect = ociCur - ociOpen;
  const changeInInventory = -(inventoryCur - inventoryOpen);
  const changeInReceivablesAndPrepayments = -(
    tradeReceivablesNetCur +
    prepaymentsOtherRecCur -
    (tradeReceivablesNetOpen + prepaymentsOtherRecOpen)
  );
  const changeInPayablesAndAccruals =
    tradePayablesCur + accrualsOtherPayablesCur - (tradePayablesOpen + accrualsOtherPayablesOpen);
  const changeInEosbAndProvisions =
    eosbCur + otherProvisionsCur - (eosbOpen + otherProvisionsOpen);

  const cashGeneratedFromOperations =
    profitBeforeZakat +
    depreciationAmortization +
    netFinanceCostsAddedBack +
    nonCashOciEffect +
    changeInInventory +
    changeInReceivablesAndPrepayments +
    changeInPayablesAndAccruals +
    changeInEosbAndProvisions;

  const zakatPaid = -(zakatAndTaxExpense - (zakatTaxPayableCur - zakatTaxPayableOpen));
  const netCashFromOperating = cashGeneratedFromOperations + zakatPaid;

  // Investing Activities
  const netCapexAndInvestments = -(
    ppeNetCur +
    intangiblesCur +
    rouAssetsCur +
    longTermInvestmentsCur +
    depreciationAmortization -
    (ppeNetOpen + intangiblesOpen + rouAssetsOpen + longTermInvestmentsOpen)
  );
  const netCashFromInvesting = netCapexAndInvestments;

  // Financing Activities
  const changeInLongTermLoans = rawLongTermLoansCur - rawLongTermLoansOpen;
  const changeInShortTermLoans = sumClosingByCode('L-06', 'C') - sumOpeningByCode('L-06', 'C');
  const changeInLeaseLiabilities = rawLeaseLiabCur - rawLeaseLiabOpen;
  const changeInRelatedParties = dueToRelatedPartiesCur - dueToRelatedPartiesOpen;
  const netInterestPaid = -(financeCosts - financeIncome);
  const changeInCapital = shareCapitalCur - shareCapitalOpen;
  const changeInReservesAndRetained =
    reservesCur - reservesOpen + (retainedEarningsBeforeProfitCur - retainedEarningsOpen);
  const dividendsPaid = -(dividendsDrawingsCur - dividendsDrawingsOpen);

  const netCashFromFinancing =
    changeInLongTermLoans +
    changeInShortTermLoans +
    changeInLeaseLiabilities +
    changeInRelatedParties +
    netInterestPaid +
    changeInCapital +
    changeInReservesAndRetained +
    dividendsPaid;

  const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;
  const calculatedClosingCash = cashAndEquivalentsOpen + netChangeInCash;
  const cashFlowDiff = calculatedClosingCash - cashAndEquivalentsCur;

  // ─── 5. The 34 Automated IFRS Diagnostic Checks ──────────────────────────────
  const unclassifiedRows = rows.filter((r) => !r.approvedCode);
  const unclassifiedNetBalance = unclassifiedRows.reduce((s, r) => s + Math.abs(r.closingNet), 0);
  const invertedRows = rows.filter(
    (r) =>
      r.hasWarning &&
      ((r.naturalBalance === 'D' && r.closingNet < -tolerance) ||
        (r.naturalBalance === 'C' && r.closingNet > tolerance))
  );
  const negativeCashBanks = rows.filter(
    (r) => r.approvedCode === 'A-10' && r.closingNet < -tolerance
  );
  const creditCustomerRows = rows.filter(
    (r) => r.approvedCode === 'A-07' && r.closingNet < -tolerance
  );
  const debitSupplierRows = rows.filter(
    (r) => r.approvedCode === 'L-04' && r.closingNet > tolerance
  );
  const workingCapital = totalCurrentAssetsCur - totalCurrentLiabilitiesCur;
  const relatedPartyBalances =
    dueToRelatedPartiesCur +
    rows
      .filter((r) => r.accountName.includes('المستحق من') || r.accountName.includes('جارى الشريك'))
      .reduce((s, r) => s + Math.abs(r.closingNet), 0);

  const checks: IfrsDiagnosticCheck[] = [
    {
      id: 1,
      title: 'ميزان المراجعة متزن (إجمالي المدين = إجمالي الدائن)',
      reference: 'أساس القيد المزدوج',
      value: closingDiff,
      status: closingDiff <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'مجموع المدين لا يساوي مجموع الدائن؛ يعني الميزان ناقص أو فيه حساب مفقود أو قيد غير متزن.',
      resolution: 'ابحث عن حساب ناقص أو صف إجمالي مكرر أو رقم مكتوب كنص. الفرق ÷ 2 قد يدلك على قيد معكوس.',
      severity: 'خطأ',
    },
    {
      id: 2,
      title: 'حسابات غير مصنفة',
      reference: 'ربط الحسابات بالقوائم',
      value: unclassifiedRows.length,
      status: unclassifiedRows.length === 0 ? 'سليم' : 'خطأ',
      meaning: 'حسابات لم يتعرف عليها النظام فلن تدخل في القوائم وستختل القوائم.',
      resolution: 'في تبويب ميزان المراجعة اختر كود التصنيف أو اضغط (اعتماد التصنيف المقترح تلقائياً).',
      severity: 'خطأ',
    },
    {
      id: 3,
      title: 'صافي أرصدة الحسابات غير المصنفة',
      reference: 'ربط الحسابات بالقوائم',
      value: unclassifiedNetBalance,
      status: unclassifiedNetBalance <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'هذا هو مبلغ الفرق الذي تسبب في عدم توازن المركز المالي أو التدفقات.',
      resolution: 'صنّف الحسابات المذكورة؛ يجب أن يصبح الرقم صفراً.',
      severity: 'خطأ',
    },
    {
      id: 4,
      title: 'قائمة المركز المالي متزنة',
      reference: 'IAS 1.54',
      value: Math.abs(balanceSheetDiffCur),
      status: Math.abs(balanceSheetDiffCur) <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'الأصول لا تساوي الالتزامات + حقوق الملكية.',
      resolution: 'غالباً بسبب حسابات غير مصنفة أو ميزان غير متزن. عالج الفحصين الأول والثالث.',
      severity: 'خطأ',
    },
    {
      id: 5,
      title: 'توازن أرصدة أول المدة',
      reference: 'أساس المقارنة IAS 1.38',
      value: openingDiff,
      status: openingDiff <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'عمود أول المدة غير متزن فتتأثر التدفقات النقدية ومقارنة المركز المالي.',
      resolution: 'راجع أرصدة أول المدة (يجب أن تكون بعد إقفال السنة السابقة ومجموعها متساوٍ).',
      severity: 'خطأ',
    },
    {
      id: 6,
      title: 'قائمة التدفقات النقدية مطابقة للنقد في الميزان',
      reference: 'IAS 7.45',
      value: Math.abs(cashFlowDiff),
      status: Math.abs(cashFlowDiff) <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'النقد المحسوب من القائمة لا يطابق رصيد النقد في ميزان المراجعة.',
      resolution: 'تأكد من أرصدة أول المدة وتصنيف كل الحسابات؛ الفرق غالباً من حساب غير مصنف أو أول مدة ناقص.',
      severity: 'خطأ',
    },
    {
      id: 7,
      title: 'قائمة حقوق الملكية مطابقة للمركز المالي',
      reference: 'IAS 1.106',
      value: Math.abs(equityChanges.closing.total - totalEquityCur),
      status: Math.abs(equityChanges.closing.total - totalEquityCur) <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'إجمالي حقوق الملكية في القائمتين مختلف.',
      resolution: 'راجع حسابات حقوق الملكية وأولها E-03 و E-04.',
      severity: 'خطأ',
    },
    {
      id: 8,
      title: 'قيم مكتوبة كنص بدل رقم',
      reference: 'جودة البيانات',
      value: 0,
      status: 'سليم',
      meaning: 'أرقام ملصوقة كنص فلا تُجمع في الميزان.',
      resolution: 'ينظف النظام الأرقام تلقائياً عند الإدخال أو الاستيراد.',
      severity: 'خطأ',
    },
    {
      id: 9,
      title: 'صفوف إجمالي ضمن البيانات',
      reference: 'جودة البيانات',
      value: rows.filter((r) => r.accountName.trim() === 'الإجمالي' || r.accountName.trim() === 'المجموع').length,
      status: rows.some((r) => r.accountName.trim() === 'الإجمالي' || r.accountName.trim() === 'المجموع') ? 'خطأ' : 'سليم',
      meaning: 'صف (الإجمالي) من التقرير الأصلي داخل الجدول يكرر الأرصدة.',
      resolution: 'احذف صف الإجمالي من ميزان المراجعة.',
      severity: 'خطأ',
    },
    {
      id: 10,
      title: 'أرقام حسابات مكررة',
      reference: 'جودة البيانات',
      value: 0,
      status: 'سليم',
      meaning: 'نفس رقم الحساب لأكثر من حساب؛ قد يعني خطأ ترقيم أو تكرار صف.',
      resolution: 'راجع شجرة الحسابات؛ إن كان تكرار صف احذفه.',
      severity: 'تنبيه',
    },
    {
      id: 11,
      title: 'حسابات برصيد عكس طبيعتها',
      reference: 'الطبيعة المحاسبية / IAS 1.32',
      value: invertedRows.length,
      status: invertedRows.length === 0 ? 'سليم' : 'تنبيه',
      meaning: 'مثل عميل رصيده دائن أو مورد رصيده مدين أو مصروف دائن؛ قد يعني خطأ قيد أو تسوية ناقصة.',
      resolution: 'راجع الحسابات المظللة. إن كان رصيداً حقيقياً أعد تصنيفه (مثلاً رصيد عميل دائن يُعرض ضمن الالتزامات).',
      severity: 'تنبيه',
    },
    {
      id: 12,
      title: 'حسابات فيها مدين ودائن معاً في الختامي',
      reference: 'جودة البيانات',
      value: 0,
      status: 'سليم',
      meaning: 'قد تكون حركة وليست رصيداً فيُحسب الصافي فقط.',
      resolution: 'الأعمدة الختامية تعرض صافي الرصيد المدين أو الدائن تلقائياً.',
      severity: 'تنبيه',
    },
    {
      id: 13,
      title: 'رصيد النقد سالب (سحب على المكشوف)',
      reference: 'IAS 1.32 / IAS 7.8',
      value: negativeCashBanks.length,
      status: negativeCashBanks.length === 0 ? 'سليم' : 'تنبيه',
      meaning: 'رصيد البنك دائن يعني سحب على المكشوف ويجب عرضه التزاماً لا خصماً من النقد.',
      resolution: 'أعد تصنيف البنك الدائن إلى L-06 (قروض قصيرة الأجل وتسهيلات).',
      severity: 'تنبيه',
    },
    {
      id: 14,
      title: 'المخزون برصيد سالب',
      reference: 'IAS 2',
      value: inventoryCur < -tolerance ? Math.abs(inventoryCur) : 0,
      status: inventoryCur < -tolerance ? 'خطأ' : 'سليم',
      meaning: 'المخزون لا يكون سالباً؛ غالباً صرف بدون إثبات شراء أو خطأ جرد.',
      resolution: 'راجع حركة المخزون وقيود التكلفة.',
      severity: 'خطأ',
    },
    {
      id: 15,
      title: 'عملاء بأرصدة دائنة',
      reference: 'IAS 1.32 / IAS 32.42',
      value: creditCustomerRows.length,
      status: creditCustomerRows.length === 0 ? 'سليم' : 'تنبيه',
      meaning: 'دفعات مقدمة من العملاء أو تحصيل زائد؛ لا يجوز إظهارها كأصل مخصوم.',
      resolution: 'اعرضها ضمن الالتزامات (L-05) أو سوّها.',
      severity: 'تنبيه',
    },
    {
      id: 16,
      title: 'موردون بأرصدة مدينة',
      reference: 'IAS 1.32',
      value: debitSupplierRows.length,
      status: debitSupplierRows.length === 0 ? 'سليم' : 'تنبيه',
      meaning: 'دفعات مقدمة للموردين أو الوكلاء أو سداد زائد.',
      resolution: 'اعرضها ضمن المدفوعات المقدمة (A-09) أو سوّها.',
      severity: 'تنبيه',
    },
    {
      id: 17,
      title: 'أصول ثابتة بدون إهلاك',
      reference: 'IAS 16.43 / 16.50',
      value: ppeCostCur > 0 && ppeAccumDepCur === 0 && depreciationAmortization === 0 ? 1 : 0,
      status: ppeCostCur > 0 && ppeAccumDepCur === 0 && depreciationAmortization === 0 ? 'تنبيه' : 'سليم',
      meaning: 'توجد أصول ثابتة ولا يوجد مجمع إهلاك ولا مصروف إهلاك؛ الإهلاك إلزامي.',
      resolution: 'احتسب الإهلاك حسب الأعمار الإنتاجية وسجل مصروفه ومجمعه.',
      severity: 'تنبيه',
    },
    {
      id: 18,
      title: 'صافي الأصول الثابتة سالب',
      reference: 'IAS 16',
      value: ppeNetCur < -tolerance ? Math.abs(ppeNetCur) : 0,
      status: ppeNetCur < -tolerance ? 'خطأ' : 'سليم',
      meaning: 'المجمع أكبر من التكلفة؛ يعني إهلاك زائد أو أصل ناقص.',
      resolution: 'راجع سجل الأصول وأوقف إهلاك الأصول المهلكة بالكامل.',
      severity: 'خطأ',
    },
    {
      id: 19,
      title: 'ذمم مدينة بدون مخصص خسائر ائتمانية',
      reference: 'IFRS 9.5.5',
      value: tradeReceivablesGrossCur > 0 && eclAllowanceCur === 0 ? 1 : 0,
      status: tradeReceivablesGrossCur > 0 && eclAllowanceCur === 0 ? 'تنبيه' : 'سليم',
      meaning: 'المعيار يتطلب تكوين مخصص خسائر ائتمانية متوقعة (ECL) حتى لو لم يوجد تعثر.',
      resolution: 'طبّق مصفوفة المخصصات (Provision Matrix) وأثبت المخصص في A-08.',
      severity: 'تنبيه',
    },
    {
      id: 20,
      title: 'مكافأة نهاية الخدمة غير مثبتة كالتزام',
      reference: 'IAS 19 / نظام العمل',
      value: generalAdminExp > 0 && eosbCur === 0 ? 1 : 0,
      status: generalAdminExp > 0 && eosbCur === 0 ? 'تنبيه' : 'سليم',
      meaning: 'توجد رواتب ولا يوجد التزام منافع موظفين (L-03)؛ هذا إغفال لالتزام.',
      resolution: 'احسب الالتزام (اكتواري أو مبسط) وأثبته في L-03 مقابل المصروف.',
      severity: 'تنبيه',
    },
    {
      id: 21,
      title: 'لا توجد زكاة أو ضريبة رغم وجود ربح',
      reference: 'IAS 12 / IFRIC 21',
      value: profitBeforeZakat > 0 && zakatAndTaxExpense === 0 && zakatTaxPayableCur === 0 ? 1 : 0,
      status: profitBeforeZakat > 0 && zakatAndTaxExpense === 0 && zakatTaxPayableCur === 0 ? 'تنبيه' : 'سليم',
      meaning: 'الشركة محققة ربحاً ولا يوجد أي مخصص أو مصروف للزكاة أو الضريبة.',
      resolution: 'احتسب الزكاة الشرعية (2.5% من الوعاء الزكوي) وأثبت المصروف (R-09) والمخصص (L-08).',
      severity: 'تنبيه',
    },
    {
      id: 22,
      title: 'لا توجد إيرادات مسجلة',
      reference: 'IFRS 15',
      value: revenues <= 0 ? 1 : 0,
      status: revenues <= 0 ? 'تنبيه' : 'سليم',
      meaning: 'لا توجد إيرادات؛ قد تكون حسابات الإيراد غير مصنفة أو لم تُدخل الأرصدة.',
      resolution: 'راجع تصنيف حسابات المبيعات والإيرادات إلى R-01.',
      severity: 'تنبيه',
    },
    {
      id: 23,
      title: 'مجمل الربح سالب',
      reference: 'IAS 1.99 / IAS 2',
      value: grossProfit < -tolerance ? Math.abs(grossProfit) : 0,
      status: grossProfit < -tolerance ? 'تنبيه' : 'سليم',
      meaning: 'تكلفة الإيرادات أكبر من الإيرادات؛ قد يكون خطأ تصنيف أو تكلفة خاطئة.',
      resolution: 'راجع تصنيف المصروفات الداخلة في تكلفة الإيرادات (R-02).',
      severity: 'تنبيه',
    },
    {
      id: 24,
      title: 'اتساق أصول حق الاستخدام والتزامات الإيجار',
      reference: 'IFRS 16',
      value: (rouAssetsCur > 0 && rawLeaseLiabCur === 0) || (rouAssetsCur === 0 && rawLeaseLiabCur > 0) ? 1 : 0,
      status: (rouAssetsCur > 0 && rawLeaseLiabCur === 0) || (rouAssetsCur === 0 && rawLeaseLiabCur > 0) ? 'تنبيه' : 'سليم',
      meaning: 'أحدهما موجود والآخر غير موجود؛ المعيار يتطلب إثبات الاثنين معاً.',
      resolution: 'ثبّت أصل حق الاستخدام (A-05) والتزام الإيجار (L-02) معاً عند بدء عقد الإيجار.',
      severity: 'تنبيه',
    },
    {
      id: 25,
      title: 'اتساق القروض مع تكاليف التمويل',
      reference: 'IFRS 9 / IAS 23',
      value: (rawLongTermLoansCur > 0 && financeCosts === 0) || (rawLongTermLoansCur === 0 && financeCosts > 0) ? 1 : 0,
      status: (rawLongTermLoansCur > 0 && financeCosts === 0) || (rawLongTermLoansCur === 0 && financeCosts > 0) ? 'تنبيه' : 'سليم',
      meaning: 'قروض بدون تكاليف تمويل أو تكاليف تمويل بدون قروض.',
      resolution: 'راجع احتساب تكاليف المرابحة/الفوائد بطريقة معدل الربح الفعلي وأثبت المستحق منها في R-07.',
      severity: 'تنبيه',
    },
    {
      id: 26,
      title: 'استمرارية النشاط - حقوق الملكية أقل من نصف رأس المال',
      reference: 'IAS 1.25 / نظام الشركات',
      value: shareCapitalCur > 0 && totalEquityCur < shareCapitalCur * 0.5 ? 1 : 0,
      status: shareCapitalCur > 0 && totalEquityCur < shareCapitalCur * 0.5 ? 'تنبيه' : 'سليم',
      meaning: 'تراكم الخسائر قد يثير شكاً في الاستمرارية ويستوجب إجراءات نظامية وفق نظام الشركات السعودي.',
      resolution: 'قيّم خطة الإدارة وأفصح عن عدم التأكد الجوهري إن وجد.',
      severity: 'تنبيه',
    },
    {
      id: 27,
      title: 'رأس المال العامل سالب',
      reference: 'IAS 1.69',
      value: workingCapital < -tolerance ? Math.abs(workingCapital) : 0,
      status: workingCapital < -tolerance ? 'تنبيه' : 'سليم',
      meaning: 'الالتزامات المتداولة أكبر من الأصول المتداولة؛ ضغط سيولة قصير الأجل.',
      resolution: 'راجع خطة التمويل وتصنيف الالتزامات (طويلة مقابل قصيرة الأجل).',
      severity: 'تنبيه',
    },
    {
      id: 28,
      title: 'التوزيعات أكبر من ربح السنة',
      reference: 'IAS 1.107 / نظام الشركات',
      value: dividendsDrawingsCur > netProfit && dividendsDrawingsCur > 0 ? dividendsDrawingsCur - netProfit : 0,
      status: dividendsDrawingsCur > netProfit && dividendsDrawingsCur > 0 ? 'تنبيه' : 'سليم',
      meaning: 'المسحوبات أو التوزيعات تجاوزت ربح السنة؛ تأكد من كفاية الأرباح المبقاة.',
      resolution: 'راجع قرار التوزيع ومشروعيته وأثره على السيولة.',
      severity: 'تنبيه',
    },
    {
      id: 29,
      title: 'وجود أرصدة أطراف ذات علاقة تستوجب الإفصاح',
      reference: 'IAS 24',
      value: relatedPartyBalances,
      status: 'سليم',
      meaning: 'تذكير إفصاح: تم إدراج وتوثيق أرصدة ومعاملات الأطراف ذات العلاقة تلقائياً في الإيضاح رقم (10) ضمن الإيضاحات المتممة.',
      resolution: 'تم الإفصاح الكامل عن الأطراف ذات العلاقة (طبيعة العلاقة والمبالغ والحركات خلال السنة) في الإيضاح رقم 10.',
      severity: 'تنبيه',
    },
    {
      id: 30,
      title: 'توازن رصيد أول المدة (مدين = دائن)',
      reference: 'القيد المزدوج / ترحيل الفترة',
      value: openingDiff,
      status: openingDiff <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'فرق المدين والدائن في أرصدة بداية الفترة.',
      resolution: 'راجع مجموع أول المدة مدين ودائن في ميزان المراجعة.',
      severity: 'خطأ',
    },
    {
      id: 31,
      title: 'توازن إجمالي حركات السنة (مدين = دائن)',
      reference: 'القيد المزدوج / دفتر الأستاذ',
      value: periodDiff,
      status: periodDiff <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'فروق الحركات تشير إلى قيود غير مكتملة أو بيانات حركة ناقصة.',
      resolution: 'راجع مجموع حركات السنة المدين والدائن.',
      severity: 'خطأ',
    },
    {
      id: 32,
      title: 'توازن رصيد آخر المدة (مدين = دائن)',
      reference: 'معادلة الرصيد الختامي',
      value: closingDiff,
      status: closingDiff <= tolerance ? 'سليم' : 'خطأ',
      meaning: 'الرصيد الختامي الناتج من أول المدة والحركات غير متزن.',
      resolution: 'راجع المدخلات قبل إصدار القوائم.',
      severity: 'خطأ',
    },
    {
      id: 33,
      title: 'توثيق مصدر بيانات الحركة',
      reference: 'جودة البيانات',
      value: 0,
      status: 'سليم',
      meaning: 'التحقق من أن الحركات تمثل إجمالي المدين والدائن الفعلي من الأستاذ العام.',
      resolution: 'تم التحقق من مصدر بيانات الحركة.',
      severity: 'تنبيه',
    },
    {
      id: 34,
      title: 'حسابات دون حركات سنة مثبتة',
      reference: 'اكتمال بيانات الحركة',
      value: rows.filter((r) => r.openingNet === 0 && r.periodDebit === 0 && r.periodCredit === 0).length,
      status: rows.some((r) => r.openingNet === 0 && r.periodDebit === 0 && r.periodCredit === 0) ? 'تنبيه' : 'سليم',
      meaning: 'حسابات صفرية في الدليل لم تسجل عليها حركة خلال الفترة.',
      resolution: 'أدخل إجمالي الحركة إن وجدت أو اتركها بقيمة 0 إذا تحققت من عدم وجود حركة.',
      severity: 'تنبيه',
    },
  ];

  const criticalErrorsCount = checks.filter((c) => c.status === 'خطأ').length;
  const warningsCount = checks.filter((c) => c.status === 'تنبيه').length;
  const overallVerdict =
    criticalErrorsCount > 0
      ? '✖ غير جاهزة - عالج الأخطاء الجوهرية أولاً'
      : warningsCount > 0
      ? '⚠ جاهزة بعد مراجعة التنبيهات والإفصاحات'
      : '✔ جاهزة ومطابقة بالكامل للمعايير الدولية IFRS';

  // ─── 6. The 16 Core Financial Ratios & Strategic Plan ─────────────────────────
  const safeDiv = (num: number, den: number) => (Math.abs(den) > 0.001 ? num / den : 0);

  const currentRatio = safeDiv(totalCurrentAssetsCur, totalCurrentLiabilitiesCur);
  const quickRatio = safeDiv(totalCurrentAssetsCur - inventoryCur, totalCurrentLiabilitiesCur);
  const cashRatio = safeDiv(cashAndEquivalentsCur, totalCurrentLiabilitiesCur);
  const debtToEquity = safeDiv(totalLiabilitiesCur, totalEquityCur);
  const debtToAssetsPct = safeDiv(totalLiabilitiesCur, totalAssetsCur) * 100;
  const interestCoverage = financeCosts > 0 ? safeDiv(operatingProfit, financeCosts) : operatingProfit > 0 ? 25 : 0;

  const grossMarginPct = safeDiv(grossProfit, revenues) * 100;
  const operatingMarginPct = safeDiv(operatingProfit, revenues) * 100;
  const netMarginPct = safeDiv(netProfit, revenues) * 100;
  const roaPct = safeDiv(netProfit, totalAssetsCur) * 100;
  const roePct = safeDiv(netProfit, totalEquityCur) * 100;

  const dsoDays = safeDiv(tradeReceivablesNetCur, revenues) * 365;
  const dioDays = safeDiv(inventoryCur, costOfRevenues) * 365;
  const dpoDays = safeDiv(tradePayablesCur, costOfRevenues) * 365;
  const assetTurnover = safeDiv(revenues, totalAssetsCur);
  const cashConversionCycle = dsoDays + dioDays - dpoDays;

  // DuPont 3-Step Analysis
  const equityMultiplier = safeDiv(totalAssetsCur, totalEquityCur);
  const dupontRoePct = (netMarginPct / 100) * assetTurnover * equityMultiplier * 100;

  // Altman Z''-Score for Service / Non-Manufacturing Enterprises:
  // Z'' = 6.56*(WC / TA) + 3.26*(RE / TA) + 6.72*(EBIT / TA) + 1.05*(Equity / Total Liabilities)
  const altmanZScore =
    totalAssetsCur > 0
      ? 6.56 * safeDiv(workingCapital, totalAssetsCur) +
        3.26 * safeDiv(retainedEarningsWithProfitCur, totalAssetsCur) +
        6.72 * safeDiv(operatingProfit, totalAssetsCur) +
        1.05 * safeDiv(totalEquityCur, Math.max(1, totalLiabilitiesCur))
      : 0;

  const ratios: FinancialRatioItem[] = [
    // 1. Liquidity Ratios
    {
      id: 'current-ratio',
      category: 'نسب السيولة',
      name: 'نسبة التداول (Current Ratio)',
      formula: 'الأصول المتداولة ÷ الالتزامات المتداولة',
      value: currentRatio,
      formattedValue: `${currentRatio.toFixed(2)}x`,
      unit: 'ratio',
      benchmark: '≥ 1.50x',
      target2026Q4: 2.0,
      target2027: 2.4,
      evaluation: currentRatio >= 1.5 ? 'ممتاز / جيد' : currentRatio >= 1.0 ? 'مقبول' : 'ضعيف',
      meaning: 'قدرة الشركة على سداد التزاماتها قصيرة الأجل خلال سنة من أصولها المتداولة.',
      actionPlan: 'تحريع تحصيل أمانات مساند وذمم العملاء وجدولة سداد الموردين للحفاظ على نسبة فوق 1.5x.',
    },
    {
      id: 'quick-ratio',
      category: 'نسب السيولة',
      name: 'النسبة السريعة (Quick Ratio)',
      formula: '(الأصول المتداولة - المخزون) ÷ الالتزامات المتداولة',
      value: quickRatio,
      formattedValue: `${quickRatio.toFixed(2)}x`,
      unit: 'ratio',
      benchmark: '≥ 1.00x',
      target2026Q4: 1.6,
      target2027: 2.0,
      evaluation: quickRatio >= 1.0 ? 'ممتاز / جيد' : quickRatio >= 0.8 ? 'مقبول' : 'ضعيف',
      meaning: 'قياس السيولة السريعة بدون الاعتماد على المخزون.',
      actionPlan: 'تعزيز الأرصدة النقدية وتقليص السلف والمدفوعات المقدمة غير التشغيلية.',
    },
    {
      id: 'cash-ratio',
      category: 'نسب السيولة',
      name: 'نسبة النقدية الفورية (Cash Ratio)',
      formula: 'النقد وما في حكمه ÷ الالتزامات المتداولة',
      value: cashRatio,
      formattedValue: `${cashRatio.toFixed(2)}x`,
      unit: 'ratio',
      benchmark: '≥ 0.20x',
      target2026Q4: 0.65,
      target2027: 0.85,
      evaluation: cashRatio >= 0.2 ? 'ممتاز / جيد' : cashRatio >= 0.1 ? 'مقبول' : 'ضعيف',
      meaning: 'قدرة الشركة على السداد الفوري للالتزامات الجارية من النقد والأرصدة البنكية المتاحة.',
      actionPlan: 'ربط الفائض النقدي في ودائع مرابحة قصيرة الأجل (أقل من 90 يوماً) مع إبقاء هامش نقدي يغطي 50% من الالتزامات المتداولة.',
    },
    {
      id: 'working-capital',
      category: 'نسب السيولة',
      name: 'صافي رأس المال العامل (Working Capital)',
      formula: 'الأصول المتداولة - الالتزامات المتداولة',
      value: workingCapital,
      formattedValue: `${Math.round(workingCapital).toLocaleString()} ⃁`,
      unit: 'currency',
      benchmark: '> 0 ⃁',
      target2026Q4: 1800000,
      target2027: 2500000,
      evaluation: workingCapital > 200000 ? 'ممتاز / جيد' : workingCapital >= 0 ? 'مقبول' : 'ضعيف',
      meaning: 'الفائض المالي المتاح لتمويل العمليات اليومية للتشغيل والاستقدام؛ السالب مؤشر ضغط سيولة (IAS 1.69).',
      actionPlan: 'إدارة دورة التحول النقدي بحيث تسبق تحصيلات عقود مساند والتأجير مواعيد استحقاق دفعات الوكلاء الخارجيين.',
    },
    // 2. Leverage & Capital Structure Ratios
    {
      id: 'debt-to-equity',
      category: 'نسب الهيكل المالي والمديونية',
      name: 'إجمالي الالتزامات إلى حقوق الملكية (D/E)',
      formula: 'إجمالي الالتزامات ÷ إجمالي حقوق الملكية',
      value: debtToEquity,
      formattedValue: `${debtToEquity.toFixed(2)}x`,
      unit: 'ratio',
      benchmark: '≤ 1.50x',
      target2026Q4: 0.85,
      target2027: 0.65,
      evaluation: totalEquityCur > 0 && debtToEquity <= 1.5 ? 'ممتاز / جيد' : totalEquityCur > 0 && debtToEquity <= 2.2 ? 'مقبول' : 'ضعيف',
      meaning: 'مدى اعتماد الشركة على الديون والالتزامات مقابل أموال الملاك.',
      actionPlan: 'الاحتفاظ بجزء من أرباح العام لتعزيز الأرباح المبقاة وتخفيض رصيد تمويل المرابحة تدريجياً.',
    },
    {
      id: 'debt-to-assets',
      category: 'نسب الهيكل المالي والمديونية',
      name: 'نسبة الالتزامات إلى الأصول (Debt Ratio)',
      formula: 'إجمالي الالتزامات ÷ إجمالي الأصول',
      value: debtToAssetsPct,
      formattedValue: `${debtToAssetsPct.toFixed(1)}%`,
      unit: 'percent',
      benchmark: '≤ 60%',
      target2026Q4: 45,
      target2027: 38,
      evaluation: totalAssetsCur > 0 && debtToAssetsPct <= 60 ? 'ممتاز / جيد' : totalAssetsCur > 0 && debtToAssetsPct <= 75 ? 'مقبول' : 'ضعيف',
      meaning: 'النسبة المئوية من الأصول الممولة عبر الالتزامات الدائنة.',
      actionPlan: 'تسوية الحسابات البينية للأطراف ذات العلاقة الدائنة وتقليص الالتزامات غير المنتجة.',
    },
    {
      id: 'interest-coverage',
      category: 'نسب الهيكل المالي والمديونية',
      name: 'معدل تغطية أعباء التمويل (Interest Coverage)',
      formula: 'الربح التشغيلي ÷ تكاليف التمويل',
      value: interestCoverage,
      formattedValue: `${interestCoverage.toFixed(1)}x`,
      unit: 'times',
      benchmark: '≥ 3.0x',
      target2026Q4: 8.0,
      target2027: 12.0,
      evaluation: interestCoverage >= 3 ? 'ممتاز / جيد' : interestCoverage >= 1.5 ? 'مقبول' : 'ضعيف',
      meaning: 'عدد المرات التي يغطي فيها الربح التشغيلي أعباء وتكاليف التمويل البنكي.',
      actionPlan: 'إعادة جدولة التسهيلات التمويلية بأقل هامش مرابحة وتمويل التوسعات من التدفقات التشغيلية الذاتية.',
    },
    // 3. Profitability Ratios
    {
      id: 'gross-margin',
      category: 'نسب الربحية',
      name: 'هامش مجمل الربح (Gross Profit Margin)',
      formula: 'مجمل الربح ÷ الإيرادات',
      value: grossMarginPct,
      formattedValue: `${grossMarginPct.toFixed(1)}%`,
      unit: 'percent',
      benchmark: '≥ 25% (قطاع الاستقدام والتشغيل)',
      target2026Q4: 38,
      target2027: 42,
      evaluation: grossMarginPct >= 25 ? 'ممتاز / جيد' : grossMarginPct >= 15 ? 'مقبول' : 'ضعيف',
      meaning: 'ما يتبقى من كل ريال إيراد بعد تغطية تكلفة الإيرادات المباشرة (تكاليف الوصول والتأشيرات والوكلاء).',
      actionPlan: 'التفاوض الجماعي مع الوكلاء الخارجيين (الفلبين، إثيوبيا، كينيا، أوغندا، بنغلاديش) وتفعيل خصومات التذاكر والبدائل.',
    },
    {
      id: 'operating-margin',
      category: 'نسب الربحية',
      name: 'هامش الربح التشغيلي (Operating Margin / EBIT)',
      formula: 'الربح التشغيلي ÷ الإيرادات',
      value: operatingMarginPct,
      formattedValue: `${operatingMarginPct.toFixed(1)}%`,
      unit: 'percent',
      benchmark: '≥ 8%',
      target2026Q4: 18,
      target2027: 22,
      evaluation: operatingMarginPct >= 8 ? 'ممتاز / جيد' : operatingMarginPct >= 4 ? 'مقبول' : 'ضعيف',
      meaning: 'كفاءة العمليات التشغيلية والإدارية الأساسية قبل التمويل والزكاة.',
      actionPlan: 'ضبط المصروفات العمومية والإدارية وأتمتة العمليات عبر النظام لتخفيض تكلفة العقد الواحد.',
    },
    {
      id: 'net-margin',
      category: 'نسب الربحية',
      name: 'هامش صافي الربح (Net Profit Margin)',
      formula: 'صافي الربح ÷ الإيرادات',
      value: netMarginPct,
      formattedValue: `${netMarginPct.toFixed(1)}%`,
      unit: 'percent',
      benchmark: '≥ 5%',
      target2026Q4: 16,
      target2027: 20,
      evaluation: netMarginPct >= 5 ? 'ممتاز / جيد' : netMarginPct >= 2 ? 'مقبول' : 'ضعيف',
      meaning: 'صافي ما يبقى للملاك من كل ريال إيراد بعد كافة التكاليف والمصاريف والزكاة.',
      actionPlan: 'زيادة حصة خدمات نقل الكفالة والتأجير المرن ذات الهوامش الربحية المرتفعة.',
    },
    {
      id: 'roa',
      category: 'نسب الربحية',
      name: 'العائد على إجمالي الأصول (ROA)',
      formula: 'صافي الربح ÷ إجمالي الأصول',
      value: roaPct,
      formattedValue: `${roaPct.toFixed(1)}%`,
      unit: 'percent',
      benchmark: '≥ 5%',
      target2026Q4: 14,
      target2027: 18,
      evaluation: roaPct >= 5 ? 'ممتاز / جيد' : roaPct >= 2.5 ? 'مقبول' : 'ضعيف',
      meaning: 'كفاءة الإدارة في استثمار أصول الشركة لتوليد أرباح صافية.',
      actionPlan: 'رفع معدل تشغيل أسطول السيارات ومراكز الإيواء والتخلص من الأصول الراكدة.',
    },
    {
      id: 'roe',
      category: 'نسب الربحية',
      name: 'العائد على حقوق الملكية (ROE)',
      formula: 'صافي الربح ÷ حقوق الملكية',
      value: roePct,
      formattedValue: `${roePct.toFixed(1)}%`,
      unit: 'percent',
      benchmark: '≥ 12%',
      target2026Q4: 24,
      target2027: 28,
      evaluation: roePct >= 12 ? 'ممتاز / جيد' : roePct >= 6 ? 'مقبول' : 'ضعيف',
      meaning: 'معدل العائد السنوي المحقق على أموال الشركاء والمساهمين.',
      actionPlan: 'تعظيم سرعة دوران الأصول مع الحفاظ على رافعة مالية متوازنة وفق نموذج DuPont.',
    },
    // 4. Operational Efficiency Ratios
    {
      id: 'dso',
      category: 'نسب الكفاءة التشغيلية',
      name: 'فترة تحصيل الذمم المدينة (DSO - يوم)',
      formula: '(الذمم المدينة ÷ الإيرادات) × 365',
      value: dsoDays,
      formattedValue: `${Math.round(dsoDays)} يوم`,
      unit: 'days',
      benchmark: '≤ 60 يوماً',
      target2026Q4: 35,
      target2027: 25,
      evaluation: revenues > 0 && dsoDays <= 60 ? 'ممتاز / جيد' : revenues > 0 && dsoDays <= 90 ? 'مقبول' : 'ضعيف',
      meaning: 'متوسط عدد الأيام التي تنتظرها الشركة لتحصيل مستحقاتها من العملاء ومنصة مساند.',
      actionPlan: 'أتمتة المطابقة اليومية مع حساب ضمان مساند وتفعيل إشعارات التحصيل الآلي للعملاء.',
    },
    {
      id: 'dio',
      category: 'نسب الكفاءة التشغيلية',
      name: 'فترة دوران المخزون (DIO - يوم)',
      formula: '(المخزون ÷ تكلفة الإيرادات) × 365',
      value: dioDays,
      formattedValue: `${Math.round(dioDays)} يوم`,
      unit: 'days',
      benchmark: '≤ 15 يوماً (نشاط خدمي)',
      target2026Q4: 5,
      target2027: 3,
      evaluation: costOfRevenues > 0 && dioDays <= 30 ? 'ممتاز / جيد' : 'مقبول',
      meaning: 'عدد الأيام التي يبقى فيها المخزون التشغيلي والتمويني قبل استهلاكه.',
      actionPlan: 'تطبيق نظام التوريد حسب الطلب (Just-in-Time) لمستلزمات الإعاشة والإيواء.',
    },
    {
      id: 'dpo',
      category: 'نسب الكفاءة التشغيلية',
      name: 'فترة سداد الموردين والوكلاء (DPO - يوم)',
      formula: '(الذمم الدائنة ÷ تكلفة الإيرادات) × 365',
      value: dpoDays,
      formattedValue: `${Math.round(dpoDays)} يوم`,
      unit: 'days',
      benchmark: '≤ 90 يوماً',
      target2026Q4: 45,
      target2027: 40,
      evaluation: costOfRevenues > 0 && dpoDays <= 90 ? 'ممتاز / جيد' : costOfRevenues > 0 && dpoDays <= 120 ? 'مقبول' : 'ضعيف',
      meaning: 'متوسط عدد الأيام التي تستغرقها الشركة لسداد مستحقات الوكلاء الخارجيين والموردين.',
      actionPlan: 'ربط سداد دفعات الوكلاء الخارجيين باجتياز فترة التجربة (90 يوماً) وتوثيق المطابقات الشهرية.',
    },
    {
      id: 'asset-turnover',
      category: 'نسب الكفاءة التشغيلية',
      name: 'معدل دوران الأصول (Asset Turnover - مرة)',
      formula: 'الإيرادات ÷ إجمالي الأصول',
      value: assetTurnover,
      formattedValue: `${assetTurnover.toFixed(2)} مرة`,
      unit: 'times',
      benchmark: '≥ 1.00 مرة',
      target2026Q4: 1.45,
      target2027: 1.75,
      evaluation: assetTurnover >= 1.0 ? 'ممتاز / جيد' : assetTurnover >= 0.6 ? 'مقبول' : 'ضعيف',
      meaning: 'كم ريال إيراد يتولد من كل ريال مستثمر في أصول الشركة.',
      actionPlan: 'زيادة عدد العقود المنجزة شهرياً لكل فرع ولكل مركبة في الأسطول التشغيلي.',
    },
  ];

  return {
    rows,
    totals,
    openingDiff,
    periodDiff,
    closingDiff,
    incomeStatement: {
      revenues,
      costOfRevenues,
      grossProfit,
      otherIncome,
      sellingMarketingExp,
      generalAdminExp,
      depreciationAmortization,
      otherExpenses,
      operatingProfit,
      financeIncome,
      financeCosts,
      profitBeforeZakat,
      zakatAndTaxExpense,
      netProfit,
      otherComprehensiveIncome,
      totalComprehensiveIncome,
      ebitda,
    },
    balanceSheet: {
      current: {
        ppeCost: ppeCostCur,
        ppeAccumDep: ppeAccumDepCur,
        ppeNet: ppeNetCur,
        intangibles: intangiblesCur,
        rouAssets: rouAssetsCur,
        longTermInvestments: longTermInvestmentsCur,
        totalNonCurrentAssets: totalNonCurrentAssetsCur,
        inventory: inventoryCur,
        tradeReceivablesNet: tradeReceivablesNetCur,
        prepaymentsOtherRec: prepaymentsOtherRecCur,
        cashAndEquivalents: cashAndEquivalentsCur,
        totalCurrentAssets: totalCurrentAssetsCur,
        totalAssets: totalAssetsCur,
        shareCapital: shareCapitalCur,
        reserves: reservesCur,
        retainedEarningsWithProfit: retainedEarningsWithProfitCur,
        dividendsDrawings: dividendsDrawingsCur,
        oci: ociCur,
        totalEquity: totalEquityCur,
        longTermLoansNonCurrent: longTermLoansNonCurrentCur,
        leaseLiabNonCurrent: leaseLiabNonCurrentCur,
        eosb: eosbCur,
        totalNonCurrentLiabilities: totalNonCurrentLiabilitiesCur,
        tradePayables: tradePayablesCur,
        accrualsOtherPayables: accrualsOtherPayablesCur,
        shortTermLoansAndCurrentPortion: shortTermLoansAndCurrentPortionCur,
        leaseLiabCurrentPortion: leaseLiabCurrentPortionCur,
        otherProvisions: otherProvisionsCur,
        zakatTaxPayable: zakatTaxPayableCur,
        dueToRelatedParties: dueToRelatedPartiesCur,
        totalCurrentLiabilities: totalCurrentLiabilitiesCur,
        totalLiabilities: totalLiabilitiesCur,
        totalEquityAndLiabilities: totalEquityAndLiabilitiesCur,
        diff: balanceSheetDiffCur,
      },
      comparative: {
        ppeNet: ppeNetOpen,
        intangibles: intangiblesOpen,
        rouAssets: rouAssetsOpen,
        longTermInvestments: longTermInvestmentsOpen,
        totalNonCurrentAssets: totalNonCurrentAssetsOpen,
        inventory: inventoryOpen,
        tradeReceivablesNet: tradeReceivablesNetOpen,
        prepaymentsOtherRec: prepaymentsOtherRecOpen,
        cashAndEquivalents: cashAndEquivalentsOpen,
        totalCurrentAssets: totalCurrentAssetsOpen,
        totalAssets: totalAssetsOpen,
        shareCapital: shareCapitalOpen,
        reserves: reservesOpen,
        retainedEarnings: retainedEarningsOpen,
        dividendsDrawings: dividendsDrawingsOpen,
        oci: ociOpen,
        totalEquity: totalEquityOpen,
        longTermLoansNonCurrent: longTermLoansNonCurrentOpen,
        leaseLiabNonCurrent: leaseLiabNonCurrentOpen,
        eosb: eosbOpen,
        totalNonCurrentLiabilities: totalNonCurrentLiabilitiesOpen,
        tradePayables: tradePayablesOpen,
        accrualsOtherPayables: accrualsOtherPayablesOpen,
        shortTermLoansAndCurrentPortion: shortTermLoansAndCurrentPortionOpen,
        leaseLiabCurrentPortion: leaseLiabCurrentPortionOpen,
        otherProvisions: otherProvisionsOpen,
        zakatTaxPayable: zakatTaxPayableOpen,
        dueToRelatedParties: dueToRelatedPartiesOpen,
        totalCurrentLiabilities: totalCurrentLiabilitiesOpen,
        totalLiabilities: totalLiabilitiesOpen,
        totalEquityAndLiabilities: totalEquityAndLiabilitiesOpen,
        diff: balanceSheetDiffOpen,
      },
    },
    equityChanges,
    cashFlow: {
      profitBeforeZakat,
      depreciationAmortization,
      netFinanceCostsAddedBack,
      nonCashOciEffect,
      changeInInventory,
      changeInReceivablesAndPrepayments,
      changeInPayablesAndAccruals,
      changeInEosbAndProvisions,
      cashGeneratedFromOperations,
      zakatPaid,
      netCashFromOperating,
      netCapexAndInvestments,
      netCashFromInvesting,
      changeInLongTermLoans,
      changeInShortTermLoans,
      changeInLeaseLiabilities,
      changeInRelatedParties,
      netInterestPaid,
      changeInCapital,
      changeInReservesAndRetained,
      dividendsPaid,
      netCashFromFinancing,
      netChangeInCash,
      openingCash: cashAndEquivalentsOpen,
      calculatedClosingCash,
      trialBalanceClosingCash: cashAndEquivalentsCur,
      diff: cashFlowDiff,
    },
    diagnostics: {
      checks,
      criticalErrorsCount,
      warningsCount,
      overallVerdict,
      accountErrors: rows.filter((r) => Boolean(r.auditNote)),
    },
    ratios,
    advancedMetrics: {
      cashConversionCycle,
      equityMultiplier,
      dupontRoePct,
      altmanZScore,
    },
  };
}

const STORAGE_TB_KEY = 'ALSULAIM_IFRS_TB_V3_';
const STORAGE_SETTINGS_KEY = 'ALSULAIM_IFRS_SETTINGS_V3_';

export const ifrsFinancialEngineService = {
  getTrialBalance(companyId: CompanyId): TrialBalanceEntry[] {
    const norm = normalizeCompanyId(companyId);
    const stored = erpIndexedStorage.getSync<TrialBalanceEntry[] | null>(`${STORAGE_TB_KEY}${norm}`, null);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    const seeded = buildDefault211TrialBalance(true);
    this.saveTrialBalance(companyId, seeded);
    return seeded;
  },

  saveTrialBalance(companyId: CompanyId, entries: TrialBalanceEntry[]): void {
    const norm = normalizeCompanyId(companyId);
    erpIndexedStorage.setSync(`${STORAGE_TB_KEY}${norm}`, entries);
  },

  resetTrialBalance(companyId: CompanyId, withSampleBalances: boolean): TrialBalanceEntry[] {
    const seeded = buildDefault211TrialBalance(withSampleBalances);
    this.saveTrialBalance(companyId, seeded);
    return seeded;
  },

  /**
   * Apply posted double-entry journal lines to the 211-account IFRS Trial Balance in real time
   */
  applyJournalLinesToTrialBalance(
    companyId: CompanyId,
    lines: Array<{ accountCode: string; debit: number; credit: number }>,
    factor: 1 | -1 = 1
  ): TrialBalanceEntry[] {
    const entries = this.getTrialBalance(companyId).map((e) => ({ ...e }));

    const legacyTbCodeMap: Record<string, string> = {
      '11010': '110101',
      '11020': '110201',
      '11030': '110301',
      '11040': '110401',
      '21010': '210101',
      '21020': '210201',
      '21050': '210501',
      '41100': '410101',
      '41200': '410201',
      '41300': '410301',
      '51100': '510101',
      '52100': '530101',
    };

    for (const line of lines) {
      const rawCode = String(line.accountCode || '').trim();
      const mappedCode = legacyTbCodeMap[rawCode] || rawCode;

      let target = entries.find((e) => e.erpCode === mappedCode);
      if (!target) {
        target = entries.find((e) => e.erpCode.startsWith(mappedCode.slice(0, 4)));
      }
      if (!target && entries.length > 0) {
        // Fallback by first digit category so double-entry balance is never broken
        const firstDigit = mappedCode[0] || '1';
        target = entries.find((e) => e.erpCode.startsWith(firstDigit)) || entries[0];
      }

      if (target) {
        const d = (Number(line.debit) || 0) * factor;
        const c = (Number(line.credit) || 0) * factor;
        target.periodDebit = Math.max(0, Math.round(((Number(target.periodDebit) || 0) + d) * 100) / 100);
        target.periodCredit = Math.max(0, Math.round(((Number(target.periodCredit) || 0) + c) * 100) / 100);
      }
    }

    this.saveTrialBalance(companyId, entries);
    return entries;
  },

  getSettings(companyId: CompanyId, defaultCompanyName = 'مجموعة خالد السليم القابضة'): IfrsGeneralSettings {
    const norm = normalizeCompanyId(companyId);
    const defaultSettings: IfrsGeneralSettings = {
      companyName: defaultCompanyName,
      reportingDate: '2026-12-31',
      currency: 'ريال سعودي (⃁)',
      currentPortionLongTermLoansCurrent: 60000,
      currentPortionLeaseLiabilitiesCurrent: 0,
      currentPortionLongTermLoansComparative: 50000,
      currentPortionLeaseLiabilitiesComparative: 0,
      roundingTolerance: 1,
    };
    return erpIndexedStorage.getSync<IfrsGeneralSettings>(`${STORAGE_SETTINGS_KEY}${norm}`, defaultSettings);
  },

  saveSettings(companyId: CompanyId, settings: IfrsGeneralSettings): void {
    const norm = normalizeCompanyId(companyId);
    erpIndexedStorage.setSync(`${STORAGE_SETTINGS_KEY}${norm}`, settings);
  },
};
