import { CompanyId } from '../../types';
import { normalizeCompanyId } from '../../contexts/CompanyContext';
import { resolveIfrsClassificationMetadata, ComputedTrialBalanceRow } from './ifrsFinancialEngineService';
import { erpIndexedStorage } from '../storage/erpIndexedStorage';

export interface CustomFieldDefinition {
  key: string;
  label: string;
  section: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات' | 'ALL';
  fieldType: 'text' | 'number' | 'percent' | 'date';
  defaultValue?: string;
}

export interface AccountItem {
  id: string;
  companyId: CompanyId;
  code: string;
  nameAr: string;
  nameEn: string;
  category: 'أصول' | 'خصوم' | 'حقوق ملكية' | 'إيرادات' | 'مصروفات';
  nature: 'مدين' | 'دائن';
  statementType: 'قائمة المركز المالي (ميزانية)' | 'قائمة الدخل (أرباح وخسائر)' | 'قائمة التدفقات النقدية';
  level: number;
  subcategory?: string;
  parentCode?: string;
  openingBalance: number;
  currentDebit: number;
  currentCredit: number;
  balance: number;
  currency: string;
  isActive: boolean;
  isHeader?: boolean;
  notes?: string;
  ifrsCode?: string;
  ifrsSubCode?: string;
  ifrsItemName?: string;
  ifrsSubItemName?: string;
  ifrsSection?: string;
  ifrsRef?: string;
  cashFlowType?: string;
  costCenter?: string;
  customFields?: Record<string, string>;
}

export interface AccountTreeNode extends AccountItem {
  children?: AccountTreeNode[];
}

export const DEFAULT_CUSTOM_ASSET_FIELDS: CustomFieldDefinition[] = [
  { key: 'depreciationRate', label: 'نسبة الإهلاك السنوي (%)', section: 'أصول', fieldType: 'percent', defaultValue: '10%' },
  { key: 'usefulLifeYears', label: 'العمر الإنتاجي (سنوات)', section: 'أصول', fieldType: 'number', defaultValue: '5' },
  { key: 'assetLocation', label: 'موقع الأصل / الفرع', section: 'أصول', fieldType: 'text', defaultValue: 'الرياض - المقر الرئيسي' },
  { key: 'acquisitionDate', label: 'تاريخ الشراء / الاستحواذ', section: 'أصول', fieldType: 'date', defaultValue: '2025-01-15' },
  { key: 'salvageValue', label: 'القيمة التخريدية (⃁)', section: 'أصول', fieldType: 'number', defaultValue: '0' },
];

export function enrichAccountWithIfrsClassification<T extends Partial<AccountItem>>(acc: T): T {
  const meta = resolveIfrsClassificationMetadata(acc.ifrsSubCode || acc.ifrsCode, acc.nameAr);
  return {
    ...acc,
    ifrsCode: meta.primaryCode || acc.ifrsCode,
    ifrsSubCode: acc.ifrsSubCode && acc.ifrsSubCode.includes('-') && acc.ifrsSubCode.split('-').length >= 3
      ? acc.ifrsSubCode
      : meta.subCode || acc.ifrsSubCode || acc.ifrsCode,
    ifrsItemName: meta.primaryNameAr || acc.ifrsItemName,
    ifrsSubItemName: meta.subNameAr || acc.ifrsSubItemName,
    ifrsSection: meta.sectionAr || acc.ifrsSection,
    ifrsRef: meta.ifrsRef || acc.ifrsRef,
    cashFlowType: meta.cashFlowType || acc.cashFlowType,
  };
}

/**
 * Hierarchical comparator so accounts sort in true tree order:
 * '1' -> '11' -> '1101' -> '110101' -> '110102' -> '1102' -> '12' -> '2'...
 */
export function sortAccountsHierarchically(accounts: AccountItem[]): AccountItem[] {
  return [...accounts].sort((a, b) => {
    const ca = String(a.code || '').trim();
    const cb = String(b.code || '').trim();
    if (ca === cb) return 0;
    // Compare character by character / segment by segment so prefix always comes before child
    const minLen = Math.min(ca.length, cb.length);
    const prefixA = ca.slice(0, minLen);
    const prefixB = cb.slice(0, minLen);
    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB, undefined, { numeric: true });
    }
    return ca.length - cb.length;
  });
}

/**
 * Recalculates parent header flags, levels, and bottom-up balance rollups
 * across all levels of the Chart of Accounts tree.
 */
export function recalculateHierarchyRollups(accounts: AccountItem[]): AccountItem[] {
  const cloned = accounts.map((a) => enrichAccountWithIfrsClassification({ ...a }));
  const byCode = new Map<string, AccountItem>();
  cloned.forEach((a) => byCode.set(a.code, a));

  // Fix missing parentCode or level based on code structure if needed
  cloned.forEach((acc) => {
    if (acc.parentCode && !byCode.has(acc.parentCode)) {
      // Try inferring parent from code prefix
      if (acc.code.length > 4 && byCode.has(acc.code.slice(0, 4))) {
        acc.parentCode = acc.code.slice(0, 4);
      } else if (acc.code.length > 2 && byCode.has(acc.code.slice(0, 2))) {
        acc.parentCode = acc.code.slice(0, 2);
      } else if (acc.code.length > 1 && byCode.has(acc.code.slice(0, 1))) {
        acc.parentCode = acc.code.slice(0, 1);
      } else {
        acc.parentCode = undefined;
      }
    }
  });

  // Compute exact levels from root
  const computeLevel = (acc: AccountItem, visited = new Set<string>()): number => {
    if (!acc.parentCode || !byCode.has(acc.parentCode) || visited.has(acc.code)) {
      return 1;
    }
    visited.add(acc.code);
    return computeLevel(byCode.get(acc.parentCode)!, visited) + 1;
  };

  cloned.forEach((acc) => {
    acc.level = computeLevel(acc);
  });

  // Identify children map
  const childrenMap = new Map<string, AccountItem[]>();
  cloned.forEach((acc) => {
    if (acc.parentCode && byCode.has(acc.parentCode)) {
      const list = childrenMap.get(acc.parentCode) || [];
      list.push(acc);
      childrenMap.set(acc.parentCode, list);
    }
  });

  // Mark isHeader accurately
  cloned.forEach((acc) => {
    const hasKids = (childrenMap.get(acc.code)?.length || 0) > 0;
    acc.isHeader = hasKids;
  });

  // Sort deepest level first for bottom-up rollup
  const byDepthDesc = [...cloned].sort((a, b) => b.level - a.level);
  for (const acc of byDepthDesc) {
    const kids = childrenMap.get(acc.code);
    if (kids && kids.length > 0) {
      let sumOpening = 0;
      let sumDebit = 0;
      let sumCredit = 0;
      let sumBalance = 0;
      for (const child of kids) {
        const sign = child.nature === acc.nature ? 1 : -1;
        sumOpening += (Number(child.openingBalance) || 0) * sign;
        sumDebit += Number(child.currentDebit) || 0;
        sumCredit += Number(child.currentCredit) || 0;
        sumBalance += (Number(child.balance) || 0) * sign;
      }
      acc.openingBalance = Math.round(sumOpening * 100) / 100;
      acc.currentDebit = Math.round(sumDebit * 100) / 100;
      acc.currentCredit = Math.round(sumCredit * 100) / 100;
      acc.balance = Math.round(sumBalance * 100) / 100;
    }
  }

  return sortAccountsHierarchically(cloned);
}

// ─── Complete 4-Level Standard Saudi SOCPA / IFRS Chart of Accounts (Covers All 34 Primary & Extended 314 Classifications) ─────
export const STANDARD_SMACC_COA: Omit<AccountItem, 'id' | 'companyId'>[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. الأصول (Assets — A-01 .. A-10)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '1', nameAr: 'الأصول (Assets)', nameEn: 'Assets', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 1, balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-01', ifrsSubCode: 'A-01-01' },

  // ─── 11. الأصول المتداولة (Current Assets — A-06 .. A-10) ───
  { code: '11', nameAr: 'الأصول المتداولة (Current Assets)', nameEn: 'Current Assets', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 2, parentCode: '1', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-10', ifrsSubCode: 'A-10-01' },

  // 1101. النقدية بالصناديق والعهد (A-10)
  { code: '1101', nameAr: 'النقدية بالصناديق والخزائن (Cash on Hand & Petty Cash)', nameEn: 'Cash on Hand & Petty Cash', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-10', ifrsSubCode: 'A-10-01' },
  { code: '110101', nameAr: 'الصندوق الرئيسي - الخزينة المركزية بالرياض', nameEn: 'Main Treasury Cash Box - Riyadh', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1101', balance: 185000, openingBalance: 150000, currentDebit: 95000, currentCredit: 60000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-10', ifrsSubCode: 'A-10-01', customFields: { assetLocation: 'الرياض - الإدارة المالية' } },
  { code: '110102', nameAr: 'عهد الفروع النقدية ومراكز الإيواء والاستقدام', nameEn: 'Branches & Shelter Petty Cash', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1101', balance: 45000, openingBalance: 40000, currentDebit: 25000, currentCredit: 20000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-10', ifrsSubCode: 'A-10-02', customFields: { assetLocation: 'فروع المملكة' } },

  // 1102. النقدية بالبنوك والمحافظ الرقمية (A-10)
  { code: '1102', nameAr: 'البنوك والحسابات المصرفية الجارية والودائع (Bank Accounts)', nameEn: 'Operating Bank Accounts', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-10', ifrsSubCode: 'A-10-08' },
  { code: '110201', nameAr: 'مصرف الراجحي - الحساب التشغيلي الرئيسي', nameEn: 'Al Rajhi Bank - Main Operating', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1102', balance: 1923000, openingBalance: 550000, currentDebit: 1493000, currentCredit: 120000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-10', ifrsSubCode: 'A-10-08' },
  { code: '110202', nameAr: 'بنك الرياض - حساب عقود الاستقدام والتشغيل', nameEn: 'Riyad Bank - Recruitment Operations', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1102', balance: 947500, openingBalance: 305000, currentDebit: 700000, currentCredit: 57500, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-10', ifrsSubCode: 'A-10-08' },
  { code: '110203', nameAr: 'البنك الأهلي السعودي SNB - حساب نقاط البيع ومدى', nameEn: 'SNB Bank - POS & Mada Settlement', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1102', balance: 380000, openingBalance: 60000, currentDebit: 330000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-10', ifrsSubCode: 'A-10-09' },

  // 1103. حسابات الضمان وأمانات منصة مساند (A-07)
  { code: '1103', nameAr: 'حسابات الضمان وأمانات منصة مساند (Musaned Escrow)', nameEn: 'Musaned Escrow & Retention Accounts', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-07', ifrsSubCode: 'A-07-05' },
  { code: '110301', nameAr: 'مستحقات عقود مساند المعلقة تحت التحصيل (فترة الضمان 90 يوماً)', nameEn: 'Musaned Pending Escrow Receivables', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1103', balance: 265000, openingBalance: 185000, currentDebit: 150000, currentCredit: 70000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-07', ifrsSubCode: 'A-07-05' },
  { code: '110302', nameAr: 'أمانات بوابات الدفع الإلكتروني وحسابات التسوية الوسيطة', nameEn: 'Payment Gateway Clearing Receivables', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1103', balance: 80000, openingBalance: 55000, currentDebit: 45000, currentCredit: 20000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-07', ifrsSubCode: 'A-07-05' },

  // 1104. الذمم المدينة التجارية وعملاء العقود (A-07)
  { code: '1104', nameAr: 'ذمم العملاء التجارية والمدينون (Trade Receivables — IFRS 15)', nameEn: 'Trade & Contract Receivables', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-07', ifrsSubCode: 'A-07-01' },
  { code: '110401', nameAr: 'ذمم عملاء عقود الاستقدام الأفراد (B2C)', nameEn: 'Individual Recruitment Customers (B2C)', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1104', balance: 195000, openingBalance: 170000, currentDebit: 45000, currentCredit: 20000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-07', ifrsSubCode: 'A-07-01' },
  { code: '110402', nameAr: 'ذمم عملاء قطاع الأعمال وعقود التأجير والتشغيل (B2B)', nameEn: 'Corporate & Leasing Customers (B2B)', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1104', balance: 235000, openingBalance: 210000, currentDebit: 40000, currentCredit: 15000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-07', ifrsSubCode: 'A-07-02' },

  // 1105. مخصص الخسائر الائتمانية المتوقعة (A-08 — طبيعة دائنة)
  { code: '1105', nameAr: 'مخصص الخسائر الائتمانية المتوقعة للذمم المدينة (IFRS 9 ECL)', nameEn: 'Allowance for Expected Credit Losses', category: 'أصول', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-08', ifrsSubCode: 'A-08-01' },
  { code: '110501', nameAr: 'مخصص الديون المشكوك في تحصيلها - ذمم عملاء تجارية (ECL)', nameEn: 'ECL Allowance - Trade Receivables', category: 'أصول', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1105', balance: 15000, openingBalance: 12000, currentDebit: 0, currentCredit: 3000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-08', ifrsSubCode: 'A-08-01' },

  // 1106. المخزون ومستلزمات الإيواء والتشغيل (A-06)
  { code: '1106', nameAr: 'المخزون ومستلزمات التشغيل والإيواء (Inventories — IAS 2)', nameEn: 'Operating & Shelter Inventories', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-06', ifrsSubCode: 'A-06-05' },
  { code: '110601', nameAr: 'مخزون مستلزمات الإعاشة والزي الموحد وحقائب الاستقبال', nameEn: 'Catering, Uniforms & Welcome Kits Inventory', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1106', balance: 18000, openingBalance: 15000, currentDebit: 8000, currentCredit: 5000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-06', ifrsSubCode: 'A-06-05' },

  // 1107. المصروفات المدفوعة مقدماً والسلف (A-09)
  { code: '1107', nameAr: 'المصروفات المدفوعة مقدماً والسلف والدفعات للموردين (Prepayments)', nameEn: 'Prepayments & Supplier Advances', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-09', ifrsSubCode: 'A-09-01' },
  { code: '110701', nameAr: 'إيجارات مقرات وتأمين طبي ورخص مدفوعة مقدماً', nameEn: 'Prepaid Rent, Medical Insurance & Licenses', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1107', balance: 145000, openingBalance: 120000, currentDebit: 40000, currentCredit: 15000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-09', ifrsSubCode: 'A-09-01' },
  { code: '110702', nameAr: 'سلف الموظفين والدفعات المقدمة لوكلاء الاستقدام بالخارج', nameEn: 'Staff Advances & Foreign Agent Prepayments', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1107', balance: 75000, openingBalance: 60000, currentDebit: 25000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-09', ifrsSubCode: 'A-09-03' },

  // 1108. ضريبة القيمة المضافة للمدخلات والأطراف ذات العلاقة المدينة (A-09)
  { code: '1108', nameAr: 'ضريبة المدخلات والأرصدة المدينة الأخرى والأطراف الشقيقة (Other Current Assets)', nameEn: 'Input VAT & Due from Related Parties', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '11', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-09', ifrsSubCode: 'A-09-10' },
  { code: '110801', nameAr: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)', nameEn: 'Recoverable Input VAT 15%', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1108', balance: 32000, openingBalance: 24000, currentDebit: 18000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-09', ifrsSubCode: 'A-09-10' },
  { code: '110802', nameAr: 'المستحق من أطراف ذات علاقة وشركات شقيقة - متداول (IAS 24)', nameEn: 'Due from Related Parties - Current', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1108', balance: 95000, openingBalance: 80000, currentDebit: 25000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-09', ifrsSubCode: 'A-09-08' },

  // ─── 12. الأصول غير المتداولة (Non-Current Assets — A-01 .. A-05) ───
  { code: '12', nameAr: 'الأصول غير المتداولة (Non-Current & Fixed Assets)', nameEn: 'Non-Current Assets', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 2, parentCode: '1', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-01', ifrsSubCode: 'A-01-01' },

  // 1201. الأراضي والمباني والتحسينات الرأسمالية (A-01)
  { code: '1201', nameAr: 'الأراضي والمباني وتحسينات مراكز الإيواء (Land, Buildings & Leasehold)', nameEn: 'Buildings & Leasehold Improvements', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-01', ifrsSubCode: 'A-01-02' },
  { code: '120101', nameAr: 'مباني وتجهيزات وإنشاءات مراكز الإيواء والاستقبال النموذجية', nameEn: 'Shelter Centers Buildings & Fit-out', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1201', balance: 140000, openingBalance: 130000, currentDebit: 15000, currentCredit: 5000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-01', ifrsSubCode: 'A-01-02', customFields: { depreciationRate: '10%', usefulLifeYears: '10', assetLocation: 'مركز الإيواء - الرياض', acquisitionDate: '2023-11-20', salvageValue: '10000' } },

  // 1202. أسطول السيارات والحافلات (A-01-04)
  { code: '1202', nameAr: 'أسطول السيارات وحافلات نقل الكوادر (Vehicles & Fleet — IAS 16)', nameEn: 'Vehicles & Buses Fleet', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-01', ifrsSubCode: 'A-01-04' },
  { code: '120201', nameAr: 'حافلات وباصات نقل العمالة من المطار ومراكز الإيواء', nameEn: 'Airport & Shelter Transport Buses', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1202', balance: 360000, openingBalance: 330000, currentDebit: 40000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-01', ifrsSubCode: 'A-01-04', customFields: { depreciationRate: '20%', usefulLifeYears: '5', assetLocation: 'الرياض - الحركة والنقل', acquisitionDate: '2024-03-10', salvageValue: '30000' } },
  { code: '120202', nameAr: 'سيارات العمليات والمشرفين والتوصيل الميداني', nameEn: 'Field Operations & Supervisors Vehicles', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1202', balance: 160000, openingBalance: 150000, currentDebit: 20000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-01', ifrsSubCode: 'A-01-04', customFields: { depreciationRate: '20%', usefulLifeYears: '5', assetLocation: 'الفروع التشغيلية', acquisitionDate: '2024-05-15', salvageValue: '15000' } },

  // 1203. الأثاث المكتبي وأجهزة التقنية والخوادم (A-01-05 / A-01-06)
  { code: '1203', nameAr: 'الأثاث المكتبي وأجهزة الحاسب والشبكات (Furniture & IT Hardware)', nameEn: 'Furniture, Fixtures & IT Equipment', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-01', ifrsSubCode: 'A-01-05' },
  { code: '120301', nameAr: 'أثاث ومفروشات وتجهيزات المكاتب الإدارية والفروع', nameEn: 'Office Furniture & Fixtures', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1203', balance: 80000, openingBalance: 70000, currentDebit: 15000, currentCredit: 5000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-01', ifrsSubCode: 'A-01-05', customFields: { depreciationRate: '15%', usefulLifeYears: '7', assetLocation: 'المقر الرئيسي - الرياض', acquisitionDate: '2024-01-10', salvageValue: '5000' } },
  { code: '120302', nameAr: 'أجهزة الحاسب الآلي والخوادم والشبكات وأنظمة البصمة', nameEn: 'Computers, Servers & Network Hardware', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1203', balance: 142500, openingBalance: 120000, currentDebit: 30000, currentCredit: 7500, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-01', ifrsSubCode: 'A-01-06', customFields: { depreciationRate: '25%', usefulLifeYears: '4', assetLocation: 'تقنية المعلومات', acquisitionDate: '2024-06-01', salvageValue: '5000' } },

  // 1204. مجمع إهلاك العقارات والآلات والمعدات (A-02 — طبيعة دائنة)
  { code: '1204', nameAr: 'مجمع إهلاك الممتلكات والآلات والمعدات (Accumulated Depreciation — IAS 16)', nameEn: 'Accumulated Depreciation - PPE', category: 'أصول', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-02', ifrsSubCode: 'A-02-01' },
  { code: '120401', nameAr: 'مجمع إهلاك أسطول السيارات والحافلات', nameEn: 'Accumulated Depreciation - Vehicles Fleet', category: 'أصول', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1204', balance: 104000, openingBalance: 78000, currentDebit: 0, currentCredit: 26000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-02', ifrsSubCode: 'A-02-03' },
  { code: '120402', nameAr: 'مجمع إهلاك المباني والأثاث وأجهزة التقنية', nameEn: 'Accumulated Depreciation - Furniture & IT', category: 'أصول', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1204', balance: 52000, openingBalance: 39000, currentDebit: 0, currentCredit: 13000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-02', ifrsSubCode: 'A-02-04' },

  // 1205. الأصول غير الملموسة والشهرة (A-03)
  { code: '1205', nameAr: 'الأصول غير الملموسة وتراخيص الأنظمة (Intangible Assets — IAS 38)', nameEn: 'Intangible Assets & Software Licenses', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-03', ifrsSubCode: 'A-03-01' },
  { code: '120501', nameAr: 'رخص نظام ERP المحاسبي والمنصات السحابية وقواعد البيانات', nameEn: 'ERP System & Cloud Software Licenses', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1205', balance: 85000, openingBalance: 70000, currentDebit: 20000, currentCredit: 5000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-03', ifrsSubCode: 'A-03-01' },

  // 1206. الاستثمارات طويلة الأجل (A-04)
  { code: '1206', nameAr: 'الاستثمارات والأصول المالية غير المتداولة (Long-Term Investments)', nameEn: 'Long-Term Financial Investments', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-04', ifrsSubCode: 'A-04-04' },
  { code: '120601', nameAr: 'ودائع استثمارية وصكوك مرابحة طويلة الأجل (IFRS 9)', nameEn: 'Long-Term Murabaha & Sukuk Investments', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1206', balance: 150000, openingBalance: 150000, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-04', ifrsSubCode: 'A-04-04' },

  // 1207. أصول حق الاستخدام (A-05)
  { code: '1207', nameAr: 'أصول حق الاستخدام لعقود الإيجار بالصافي (Right-of-Use Assets — IFRS 16)', nameEn: 'Right-of-Use Assets (IFRS 16)', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '12', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'A-05', ifrsSubCode: 'A-05-01' },
  { code: '120701', nameAr: 'حق استخدام عقود إيجار المقرات الإدارية ومراكز الإيواء (IFRS 16)', nameEn: 'ROU Assets - Head Office & Shelters', category: 'أصول', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '1207', balance: 310000, openingBalance: 350000, currentDebit: 0, currentCredit: 40000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'A-05', ifrsSubCode: 'A-05-01', customFields: { depreciationRate: '20%', usefulLifeYears: '5', assetLocation: 'فروع الرياض وجدة والدمام', acquisitionDate: '2024-01-01', salvageValue: '0' } },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. الخصوم والالتزامات (Liabilities — L-01 .. L-09)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '2', nameAr: 'الخصوم والالتزامات (Liabilities)', nameEn: 'Liabilities', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 1, balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-04', ifrsSubCode: 'L-04-01' },

  // ─── 21. الالتزامات المتداولة (Current Liabilities — L-04 .. L-09) ───
  { code: '21', nameAr: 'الالتزامات المتداولة (Current Liabilities)', nameEn: 'Current Liabilities', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 2, parentCode: '2', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-04', ifrsSubCode: 'L-04-01' },

  // 2101. الموردون والوكلاء الخارجيون (L-04)
  { code: '2101', nameAr: 'الذمم الدائنة التجارية والوكلاء الخارجيون (Trade & Agency Payables)', nameEn: 'Trade & Foreign Agencies Payables', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-04', ifrsSubCode: 'L-04-02' },
  { code: '210101', nameAr: 'مستحقات الوكلاء والمكاتب الدولية المصدرة للعمالة بالخارج', nameEn: 'Foreign Recruitment Agencies Payables', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2101', balance: 145375, openingBalance: 135000, currentDebit: 65000, currentCredit: 75375, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-04', ifrsSubCode: 'L-04-02' },
  { code: '210102', nameAr: 'ذمم موردي تذاكر الطيران والإعاشة والتأمين الطبي والفحص', nameEn: 'Airlines, Catering & Medical Suppliers Payables', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2101', balance: 44000, openingBalance: 40000, currentDebit: 20000, currentCredit: 24000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-04', ifrsSubCode: 'L-04-01' },

  // 2102. المصروفات المستحقة وإيرادات العقود المؤجلة (L-05)
  { code: '2102', nameAr: 'المصروفات المستحقة والرواتب وإيرادات العقود المؤجلة (Accruals & Deferred Rev)', nameEn: 'Accrued Expenses & Deferred Contract Revenue', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-05', ifrsSubCode: 'L-05-01' },
  { code: '210201', nameAr: 'الرواتب والأجور المستحقة وأمانات التأمينات الاجتماعية (WPS & GOSI)', nameEn: 'Accrued Salaries & GOSI Payable', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2102', balance: 77625, openingBalance: 65000, currentDebit: 40000, currentCredit: 52625, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-05', ifrsSubCode: 'L-05-01' },
  { code: '210202', nameAr: 'إيرادات عقود استقدام وتأجير مؤجلة الدفع (التزامات عقود — IFRS 15)', nameEn: 'Deferred Recruitment & Leasing Contract Liabilities', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2102', balance: 50000, openingBalance: 40000, currentDebit: 20000, currentCredit: 30000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-05', ifrsSubCode: 'L-05-02' },

  // 2103. أمانات ضريبة القيمة المضافة للمخرجات (L-05-09)
  { code: '2103', nameAr: 'ضريبة القيمة المضافة المستحقة لهيئة الزكاة والضريبة (VAT Payable)', nameEn: 'ZATCA VAT Output Liability', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-05', ifrsSubCode: 'L-05-09' },
  { code: '210301', nameAr: 'ضريبة القيمة المضافة للمخرجات وصافي الإقرار الضريبي (VAT 15%)', nameEn: 'Output VAT 15% & Net VAT Payable', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2103', balance: 124000, openingBalance: 110000, currentDebit: 45000, currentCredit: 59000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-05', ifrsSubCode: 'L-05-09' },

  // 2104. القروض قصيرة الأجل والجزء المتداول من التمويل (L-06)
  { code: '2104', nameAr: 'القروض قصيرة الأجل والجزء المتداول من التمويل والإيجار (Short-Term Debt)', nameEn: 'Short-Term Borrowings & Current Lease Portion', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-06', ifrsSubCode: 'L-06-03' },
  { code: '210401', nameAr: 'تسهيلات المرابحة الائتمانية قصيرة الأجل والجزء المتداول للقروض', nameEn: 'Short-Term Murabaha & Current Loan Portion', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2104', balance: 60000, openingBalance: 50000, currentDebit: 15000, currentCredit: 25000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-06', ifrsSubCode: 'L-06-03' },

  // 2105. المخصصات قصيرة الأجل وضمان العقود (L-07)
  { code: '2105', nameAr: 'مخصصات ضمان العقود والبديل والتعويضات (Short-Term Provisions — IAS 37)', nameEn: 'Contract Warranty & Claims Provisions', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-07', ifrsSubCode: 'L-07-02' },
  { code: '210501', nameAr: 'مخصص ضمان استبدال العمالة ومطالبات فترة التجربة (90 يوماً)', nameEn: 'Worker Replacement & 90-Day Warranty Provision', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2105', balance: 35000, openingBalance: 30000, currentDebit: 5000, currentCredit: 10000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-07', ifrsSubCode: 'L-07-02' },

  // 2106. مخصص الزكاة الشرعية والضريبة المستحقة (L-08)
  { code: '2106', nameAr: 'مخصص الزكاة الشرعية وضريبة الدخل المستحقة (Zakat Payable — SOCPA)', nameEn: 'Zakat & Tax Payable Provision', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-08', ifrsSubCode: 'L-08-01' },
  { code: '210601', nameAr: 'مخصص الزكاة الشرعية المستحقة لهيئة الزكاة والضريبة والجمارك', nameEn: 'ZATCA Zakat Provision Payable', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2106', balance: 100000, openingBalance: 80000, currentDebit: 0, currentCredit: 20000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-08', ifrsSubCode: 'L-08-01' },

  // 2107. المستحق لأطراف ذات علاقة وجاري الشركاء (L-09)
  { code: '2107', nameAr: 'المستحق لأطراف ذات علاقة وجاري الشركاء الدائن (Related Parties — IAS 24)', nameEn: 'Due to Related Parties & Partners', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '21', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-09', ifrsSubCode: 'L-09-04' },
  { code: '210701', nameAr: 'جاري الشركاء وأطراف ذات علاقة دائنة - متداول', nameEn: 'Partners Current Account & Related Parties Payable', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2107', balance: 110000, openingBalance: 95000, currentDebit: 10000, currentCredit: 25000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-09', ifrsSubCode: 'L-09-04' },

  // ─── 22. الالتزامات غير المتداولة (Non-Current Liabilities — L-01 .. L-03) ───
  { code: '22', nameAr: 'الالتزامات غير المتداولة (Non-Current Liabilities)', nameEn: 'Non-Current Liabilities', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 2, parentCode: '2', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-01', ifrsSubCode: 'L-01-04' },

  // 2201. القروض والتمويل طويل الأجل (L-01)
  { code: '2201', nameAr: 'القروض والتمويل الإسلامي طويل الأجل (Long-Term Financing — IFRS 9)', nameEn: 'Long-Term Murabaha & Bank Financing', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '22', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-01', ifrsSubCode: 'L-01-04' },
  { code: '220101', nameAr: 'تمويل المرابحة البنكي طويل الأجل لأسطول الحافلات والمقرات', nameEn: 'Al Rajhi Long-Term Fleet & Facility Murabaha', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2201', balance: 340000, openingBalance: 420000, currentDebit: 80000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-01', ifrsSubCode: 'L-01-04' },

  // 2202. التزامات عقود الإيجار طويلة الأجل (L-02)
  { code: '2202', nameAr: 'التزامات عقود الإيجار طويلة الأجل (Lease Liabilities — IFRS 16)', nameEn: 'Long-Term Lease Liabilities (IFRS 16)', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '22', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-02', ifrsSubCode: 'L-02-01' },
  { code: '220201', nameAr: 'التزامات عقود إيجار المقرات ومراكز الإيواء غير المتداولة (IFRS 16)', nameEn: 'Non-Current Lease Liabilities - Shelters & Offices', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2202', balance: 140000, openingBalance: 140000, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-02', ifrsSubCode: 'L-02-01' },

  // 2203. مخصص مكافأة نهاية الخدمة للموظفين (L-03)
  { code: '2203', nameAr: 'مخصص منافع ومكافأة نهاية الخدمة للموظفين (EOSB — IAS 19)', nameEn: 'Employees End of Service Benefits (IAS 19)', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '22', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'L-03', ifrsSubCode: 'L-03-01' },
  { code: '220301', nameAr: 'مخصص مكافأة نهاية الخدمة للكادر الإداري والعمليات (تقييم اكتواري IAS 19)', nameEn: 'EOSB Actuarial Provision - Staff & Operations', category: 'خصوم', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '2203', balance: 194000, openingBalance: 150000, currentDebit: 20000, currentCredit: 64000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'L-03', ifrsSubCode: 'L-03-01' },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. حقوق الملكية والدخل الشامل الآخر (Equity & OCI — E-01 .. E-04, O-01)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '3', nameAr: 'حقوق الملكية والدخل الشامل (Equity & OCI)', nameEn: 'Equity & OCI', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 1, balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-01', ifrsSubCode: 'E-01-01' },

  // ─── 31. رأس المال والاحتياطيات (Capital & Reserves — E-01, E-02) ───
  { code: '31', nameAr: 'رأس المال والاحتياطيات النظامية (Capital & Reserves)', nameEn: 'Share Capital & Reserves', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 2, parentCode: '3', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-01', ifrsSubCode: 'E-01-01' },
  { code: '3101', nameAr: 'رأس المال المدفوع والمرخص به (Paid-in Capital)', nameEn: 'Issued & Paid-in Capital', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '31', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-01', ifrsSubCode: 'E-01-01' },
  { code: '310101', nameAr: 'رأس المال العامل والمدفوع للشركة', nameEn: 'Paid-in Share Capital', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '3101', balance: 1500000, openingBalance: 1500000, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'E-01', ifrsSubCode: 'E-01-01' },

  { code: '3102', nameAr: 'الاحتياطي النظامي والاحتياطيات الاتفاقية (Statutory & General Reserves)', nameEn: 'Statutory & Contractual Reserves', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '31', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-02', ifrsSubCode: 'E-02-01' },
  { code: '310201', nameAr: 'الاحتياطي النظامي المكون وفق نظام الشركات (10%)', nameEn: 'Statutory Reserve (Companies Law)', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '3102', balance: 150000, openingBalance: 150000, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'E-02', ifrsSubCode: 'E-02-01' },

  // ─── 32. الأرباح المبقاة والتوزيعات والدخل الشامل (Retained Earnings, Dividends & OCI — E-03, E-04, O-01) ───
  { code: '32', nameAr: 'الأرباح المبقاة والتوزيعات والدخل الشامل (Retained Earnings & OCI)', nameEn: 'Retained Earnings, Dividends & OCI', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 2, parentCode: '3', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-03', ifrsSubCode: 'E-03-01' },
  { code: '3201', nameAr: 'الأرباح المبقاة والمدورة من أعوام سابقة (Retained Earnings)', nameEn: 'Retained Earnings', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '32', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-03', ifrsSubCode: 'E-03-01' },
  { code: '320101', nameAr: 'الأرباح المبقاة المتراكمة وصافي فائض الدخل المرحل', nameEn: 'Accumulated Retained Earnings', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '3201', balance: 260000, openingBalance: 260000, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'E-03', ifrsSubCode: 'E-03-01' },

  { code: '3202', nameAr: 'توزيعات الأرباح المعلنة ومسحوبات الشركاء (Dividends — طبيعة مدينة)', nameEn: 'Dividends & Partner Drawings', category: 'حقوق ملكية', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '32', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'E-04', ifrsSubCode: 'E-04-02' },
  { code: '320201', nameAr: 'توزيعات الأرباح النقدية المعتمدة للشركاء والمساهمين', nameEn: 'Declared Cash Dividends to Partners', category: 'حقوق ملكية', nature: 'مدين', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '3202', balance: 50000, openingBalance: 0, currentDebit: 50000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'E-04', ifrsSubCode: 'E-04-02' },

  { code: '3203', nameAr: 'الدخل الشامل الآخر وفروق إعادة القياس (Other Comprehensive Income — O-01)', nameEn: 'Other Comprehensive Income (OCI)', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 3, parentCode: '32', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'O-01', ifrsSubCode: 'O-01-02' },
  { code: '320301', nameAr: 'أرباح وخسائر إعادة قياس منافع نهاية الخدمة الاكتوارية (IAS 19 OCI)', nameEn: 'Actuarial Gains/Losses on EOSB (OCI)', category: 'حقوق ملكية', nature: 'دائن', statementType: 'قائمة المركز المالي (ميزانية)', level: 4, parentCode: '3203', balance: 15000, openingBalance: 0, currentDebit: 0, currentCredit: 15000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'O-01', ifrsSubCode: 'O-01-02' },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. الإيرادات التشغيلية والتمويلية والأخرى (Revenues — R-01, R-05, R-08)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '4', nameAr: 'الإيرادات التشغيلية والمبيعات والعوائد (Revenues)', nameEn: 'Revenues & Income', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 1, balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-01', ifrsSubCode: 'R-01-01' },

  // ─── 41. الإيرادات التشغيلية الرئيسية (Core Operating Revenues — R-01) ───
  { code: '41', nameAr: 'الإيرادات التشغيلية من العقود مع العملاء (IFRS 15 Operating Revenues)', nameEn: 'Operating Revenues from Contracts', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '4', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-01', ifrsSubCode: 'R-01-07' },
  { code: '4101', nameAr: 'إيرادات عقود التوسط والاستقدام عبر منصة مساند (Recruitment Revenues)', nameEn: 'Musaned Recruitment Contract Revenues', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '41', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-01', ifrsSubCode: 'R-01-07' },
  { code: '410101', nameAr: 'إيرادات استقدام العمالة المنزلية - عقود مساند للأفراد', nameEn: 'Domestic Worker Recruitment Revenue - Musaned', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '4101', balance: 2650000, openingBalance: 0, currentDebit: 20000, currentCredit: 2670000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-01', ifrsSubCode: 'R-01-07' },
  { code: '410102', nameAr: 'إيرادات استقدام الكوادر المهنية والطبية لقطاع الأعمال (B2B)', nameEn: 'Corporate & Medical Recruitment Revenue (B2B)', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '4101', balance: 800000, openingBalance: 0, currentDebit: 5000, currentCredit: 805000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-01', ifrsSubCode: 'R-01-01' },

  { code: '4102', nameAr: 'إيرادات عقود التأجير والتشغيل المرن والباقات الشهرية (Leasing & Manpower)', nameEn: 'Flexible Leasing & Manpower Revenues', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '41', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-01', ifrsSubCode: 'R-01-15' },
  { code: '410201', nameAr: 'إيرادات باقات التأجير الشهري والسنوي للعمالة المنزلية المقيمة', nameEn: 'Monthly & Annual Resident Worker Leasing Revenue', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '4102', balance: 1240000, openingBalance: 0, currentDebit: 10000, currentCredit: 1250000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-01', ifrsSubCode: 'R-01-15' },

  // ─── 42. الإيرادات الأخرى وعوائد التمويل (Other & Finance Income — R-05, R-08) ───
  { code: '42', nameAr: 'الإيرادات الأخرى وعوائد الودائع والتمويل (Other & Finance Income)', nameEn: 'Other Operating & Finance Income', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '4', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-05', ifrsSubCode: 'R-05-06' },
  { code: '4201', nameAr: 'إيرادات نقل الكفالة وخدمات الإيواء والإعاشة الأخرى (Other Income — R-05)', nameEn: 'Sponsorship Transfer & Ancillary Income', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '42', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-05', ifrsSubCode: 'R-05-06' },
  { code: '420101', nameAr: 'إيرادات رسوم نقل الخدمات وتجديد العقود والخدمات المساندة', nameEn: 'Sponsorship Transfer & Contract Renewal Fees', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '4201', balance: 200000, openingBalance: 0, currentDebit: 0, currentCredit: 200000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-05', ifrsSubCode: 'R-05-06' },

  { code: '4202', nameAr: 'إيرادات الودائع البنكية وعوائد المرابحة والتمويل (Finance Income — R-08)', nameEn: 'Murabaha Deposit & Finance Income', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '42', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-08', ifrsSubCode: 'R-08-01' },
  { code: '420201', nameAr: 'عوائد ودائع المرابحة البنكية والصكوك الاستثمارية', nameEn: 'Islamic Murabaha Time Deposit Returns', category: 'إيرادات', nature: 'دائن', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '4202', balance: 45000, openingBalance: 0, currentDebit: 0, currentCredit: 45000, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-08', ifrsSubCode: 'R-08-01' },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. المصروفات والتكاليف التشغيلية والتمويلية والزكاة (Expenses — R-02..R-04, R-06, R-07, R-09, R-10)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '5', nameAr: 'المصروفات والتكاليف التشغيلية والزكاة (Expenses & Zakat)', nameEn: 'Expenses, Finance Costs & Zakat', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 1, balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-02', ifrsSubCode: 'R-02-01' },

  // ─── 51. تكلفة الإيرادات والتشغيل المباشر (Cost of Revenues — R-02) ───
  { code: '51', nameAr: 'تكلفة الإيرادات والتشغيل المباشر (Direct Cost of Revenues — R-02)', nameEn: 'Direct Cost of Revenues', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '5', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-02', ifrsSubCode: 'R-02-07' },
  { code: '5101', nameAr: 'تكاليف المكاتب الخارجية والتأشيرات وتذاكر الطيران (Direct Recruitment Costs)', nameEn: 'Foreign Agencies, Visas & Flight Costs', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '51', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-02', ifrsSubCode: 'R-02-07' },
  { code: '510101', nameAr: 'عمولات وتكاليف المكاتب والوكالات الخارجية المصدرة للعمالة', nameEn: 'Foreign Agency Recruitment Commissions', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5101', balance: 780000, openingBalance: 0, currentDebit: 780000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-02', ifrsSubCode: 'R-02-07' },
  { code: '510102', nameAr: 'رسوم التصديق والتأشيرات وتذاكر الطيران الدولي والاستقبال', nameEn: 'Visa Stamping, International Flights & Reception Costs', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5101', balance: 370000, openingBalance: 0, currentDebit: 370000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-02', ifrsSubCode: 'R-02-07' },

  { code: '5102', nameAr: 'تكاليف تشغيل مراكز الإيواء والإعاشة ورواتب العمالة المؤجرة (Shelter & Leasing Cost)', nameEn: 'Shelter Operations & Leased Manpower Costs', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '51', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-02', ifrsSubCode: 'R-02-08' },
  { code: '510201', nameAr: 'تكاليف الإعاشة والرعاية الطبية والإقامات والتأمين للعمالة ومراكز الإيواء', nameEn: 'Shelter Catering, Medical Checkups & Iqama Fees', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5102', balance: 210000, openingBalance: 0, currentDebit: 210000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-02', ifrsSubCode: 'R-02-08' },

  // ─── 52. مصروفات البيع والتسويق (Selling & Marketing Expenses — R-03) ───
  { code: '52', nameAr: 'مصروفات البيع والتسويق وعمولات المبيعات (Selling & Marketing — R-03)', nameEn: 'Selling & Marketing Expenses', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '5', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-03', ifrsSubCode: 'R-03-02' },
  { code: '5201', nameAr: 'حملات التسويق الرقمي وعمولات المسوقين ورسوم المنصات (Marketing & Commissions)', nameEn: 'Digital Campaigns & Sales Commissions', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '52', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-03', ifrsSubCode: 'R-03-02' },
  { code: '520101', nameAr: 'عمولات وحوافز فريق المبيعات وخدمة العملاء وتحصيل العقود', nameEn: 'Sales Representatives & Call Center Commissions', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5201', balance: 95000, openingBalance: 0, currentDebit: 95000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-03', ifrsSubCode: 'R-03-01' },
  { code: '520102', nameAr: 'إعلانات المنصات الرقمية والحملات الترويجية والعلاقات العامة', nameEn: 'Digital Advertising & Promotional Campaigns', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5201', balance: 65000, openingBalance: 0, currentDebit: 65000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-03', ifrsSubCode: 'R-03-02' },

  // ─── 53. المصروفات العمومية والإدارية (General & Administrative Expenses — R-04) ───
  { code: '53', nameAr: 'المصروفات العمومية والإدارية (General & Administrative — R-04)', nameEn: 'General & Administrative Expenses', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '5', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-04', ifrsSubCode: 'R-04-01' },
  { code: '5301', nameAr: 'رواتب وأجور ومنافع الكادر الإداري والقيادي (Admin Salaries & Benefits)', nameEn: 'Administrative Salaries, Wages & GOSI', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '53', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-04', ifrsSubCode: 'R-04-01' },
  { code: '530101', nameAr: 'الرواتب الأساسية وبدلات السكن والنقل للموظفين الإداريين', nameEn: 'Basic Salaries, Housing & Transport Allowances', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5301', balance: 440000, openingBalance: 0, currentDebit: 440000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-04', ifrsSubCode: 'R-04-01' },
  { code: '530102', nameAr: 'حصة الشركة في التأمينات الاجتماعية والتأمين الطبي ومكافأة نهاية الخدمة', nameEn: 'Company GOSI, Medical Insurance & EOSB Expense', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5301', balance: 95000, openingBalance: 0, currentDebit: 95000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-04', ifrsSubCode: 'R-04-03' },

  { code: '5302', nameAr: 'المصروفات الإدارية والمكتبية والمهنية والتقنية (Office, Legal & IT Expenses)', nameEn: 'Office, Utilities, Legal & Audit Expenses', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '53', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-04', ifrsSubCode: 'R-04-08' },
  { code: '530201', nameAr: 'الكهرباء والمياه والاتصالات والإنترنت واشتراكات الأنظمة السحابية', nameEn: 'Utilities, Telecom & Cloud SaaS Subscriptions', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5302', balance: 55000, openingBalance: 0, currentDebit: 55000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-04', ifrsSubCode: 'R-04-07' },
  { code: '530202', nameAr: 'أتعاب المراجع القانوني والاستشارات المهنية والرسوم الحكومية والبلدية', nameEn: 'External Audit, Legal Advisory & Gov Fees', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5302', balance: 50000, openingBalance: 0, currentDebit: 50000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-04', ifrsSubCode: 'R-04-11' },

  // ─── 54. الإهلاك والإطفاء والخسائر الائتمانية المتوقعة (D&A & ECL — R-04, R-10) ───
  { code: '54', nameAr: 'مصروف الإهلاك والإطفاء والخسائر الائتمانية (D&A & ECL — R-04 / R-10)', nameEn: 'Depreciation, Amortization & ECL Provision', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '5', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-10', ifrsSubCode: 'R-10-02' },
  { code: '5401', nameAr: 'مصروف مخصص الخسائر الائتمانية المتوقعة للذمم (ECL Expense — R-04)', nameEn: 'Expected Credit Loss (ECL) Provision Expense', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '54', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-04', ifrsSubCode: 'R-04-17' },
  { code: '540101', nameAr: 'مصروف مخصص الديون المشكوك في تحصيلها للفترة (IFRS 9 ECL)', nameEn: 'Period Provision for Expected Credit Losses', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5401', balance: 3000, openingBalance: 0, currentDebit: 3000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-04', ifrsSubCode: 'R-04-17' },

  { code: '5402', nameAr: 'مصروف الإهلاك والإطفاء السنوي للأصول وحق الاستخدام (D&A — R-10)', nameEn: 'Depreciation & Amortization Expense', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '54', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-10', ifrsSubCode: 'R-10-02' },
  { code: '540201', nameAr: 'مصروف إهلاك السيارات والمباني والأثاث وأجهزة التقنية (IAS 16)', nameEn: 'Depreciation of Vehicles, Furniture & IT', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5402', balance: 39000, openingBalance: 0, currentDebit: 39000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-10', ifrsSubCode: 'R-10-02' },
  { code: '540202', nameAr: 'مصروف إهلاك أصول حق الاستخدام وإطفاء الأنظمة (IFRS 16 / IAS 38)', nameEn: 'Amortization of ROU Assets & Software', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5402', balance: 39000, openingBalance: 0, currentDebit: 39000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-10', ifrsSubCode: 'R-10-05' },

  // ─── 55. تكاليف التمويل والمصروفات الأخرى والزكاة (Finance Costs, Other Expenses & Zakat — R-06, R-07, R-09) ───
  { code: '55', nameAr: 'تكاليف التمويل والمصروفات الأخرى والزكاة الشرعية (Finance, Other & Zakat)', nameEn: 'Finance Costs, Other Expenses & Zakat', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 2, parentCode: '5', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-07', ifrsSubCode: 'R-07-01' },
  { code: '5501', nameAr: 'المصروفات غير التشغيلية والغرامات والتسويات الأخرى (Other Expenses — R-06)', nameEn: 'Other Non-Operating Expenses', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '55', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-06', ifrsSubCode: 'R-06-05' },
  { code: '550101', nameAr: 'مصروفات غير تشغيلية وتسويات عقود وتعويضات متنوعة', nameEn: 'Miscellaneous Non-Operating & Settlement Expenses', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5501', balance: 15000, openingBalance: 0, currentDebit: 15000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-06', ifrsSubCode: 'R-06-05' },

  { code: '5502', nameAr: 'تكاليف التمويل وفوائد المرابحة وعقود الإيجار والعمولات البنكية (Finance Costs — R-07)', nameEn: 'Murabaha, Lease Finance Costs & Bank Charges', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '55', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-07', ifrsSubCode: 'R-07-01' },
  { code: '550201', nameAr: 'أعباء تمويل المرابحة البنكية وفوائد التزامات عقود الإيجار والعمولات المصرفية', nameEn: 'Murabaha Profit Charges, Lease Interest & POS Fees', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5502', balance: 32000, openingBalance: 0, currentDebit: 32000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-07', ifrsSubCode: 'R-07-01' },

  { code: '5503', nameAr: 'مصروف الزكاة الشرعية وضريبة الدخل للفترة (Zakat & Income Tax — R-09)', nameEn: 'Zakat & Income Tax Expense', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 3, parentCode: '55', balance: 0, openingBalance: 0, currentDebit: 0, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: true, ifrsCode: 'R-09', ifrsSubCode: 'R-09-01' },
  { code: '550301', nameAr: 'مصروف الزكاة الشرعية المقدر عن السنة المالية (بنسبة 2.5% من الوعاء)', nameEn: 'Annual Zakat Provision Expense (2.5%)', category: 'مصروفات', nature: 'مدين', statementType: 'قائمة الدخل (أرباح وخسائر)', level: 4, parentCode: '5503', balance: 65000, openingBalance: 0, currentDebit: 65000, currentCredit: 0, currency: 'SAR', isActive: true, isHeader: false, ifrsCode: 'R-09', ifrsSubCode: 'R-09-01' },
];

const STORAGE_KEY_PREFIX = 'ALSULAIM_COA_V6_';
const CUSTOM_FIELDS_KEY_PREFIX = 'ALSULAIM_COA_FIELDS_V1_';

export const chartOfAccountsService = {
  /**
   * Get all accounts for a specific company or entire group (sorted & rolled up)
   */
  getAccountsByCompany(companyId: CompanyId): AccountItem[] {
    const norm = normalizeCompanyId(companyId);
    const key = `${STORAGE_KEY_PREFIX}${norm}`;
    const stored = erpIndexedStorage.getSync<AccountItem[] | null>(key, null);
    if (Array.isArray(stored) && stored.length > 0) {
      return recalculateHierarchyRollups(stored);
    }

    return this.resetToStandardTree(companyId);
  },

  /**
   * Save entire account list for a company (automatically sorted & rolled up)
   */
  saveAccountsForCompany(companyId: CompanyId, accounts: AccountItem[]): AccountItem[] {
    const norm = normalizeCompanyId(companyId);
    const organized = recalculateHierarchyRollups(accounts);
    erpIndexedStorage.setSync(`${STORAGE_KEY_PREFIX}${norm}`, organized);
    return organized;
  },

  /**
   * Reset to the full 4-level standard Saudi SOCPA / IFRS tree
   */
  resetToStandardTree(companyId: CompanyId): AccountItem[] {
    const norm = normalizeCompanyId(companyId);
    const seeded: AccountItem[] = STANDARD_SMACC_COA.map((item, idx) =>
      enrichAccountWithIfrsClassification({
        ...item,
        id: `${norm.toLowerCase()}-${item.code}-${idx}`,
        companyId: norm === 'all' ? 'SAF' : norm,
      })
    );
    return this.saveAccountsForCompany(companyId, seeded);
  },

  /**
   * Organize tree, add any missing standard accounts/levels without losing custom accounts,
   * fix hierarchy links, and recalculate all parent rollups.
   */
  syncAndCompleteMissingAccounts(companyId: CompanyId): {
    accounts: AccountItem[];
    addedCount: number;
  } {
    const norm = normalizeCompanyId(companyId);
    const current = this.getAccountsByCompany(companyId);
    const existingCodes = new Set(current.map((a) => a.code));
    let addedCount = 0;
    const merged = [...current];

    STANDARD_SMACC_COA.forEach((stdAcc, idx) => {
      if (!existingCodes.has(stdAcc.code)) {
        merged.push(
          enrichAccountWithIfrsClassification({
            ...stdAcc,
            id: `${norm.toLowerCase()}-${stdAcc.code}-sync-${idx}`,
            companyId: norm === 'all' ? 'SAF' : norm,
          })
        );
        existingCodes.add(stdAcc.code);
        addedCount++;
      }
    });

    const organized = this.saveAccountsForCompany(companyId, merged);
    return { accounts: organized, addedCount };
  },

  /**
   * Sync leaf balances in the COA tree with the live 211-account Trial Balance
   * grouped by IFRS subCode / primaryCode.
   */
  syncBalancesFromTrialBalance(
    companyId: CompanyId,
    tbRows: ComputedTrialBalanceRow[]
  ): AccountItem[] {
    const current = this.syncAndCompleteMissingAccounts(companyId).accounts;
    const leafAccounts = current.filter((a) => !a.isHeader);

    // Group TB rows by primaryCode
    const byPrimary = new Map<string, { openNet: number; debit: number; credit: number; closeNet: number }>();
    for (const r of tbRows) {
      if (!r.approvedCode) continue;
      const prev = byPrimary.get(r.approvedCode) || { openNet: 0, debit: 0, credit: 0, closeNet: 0 };
      const isDebitNature =
        r.approvedCode.startsWith('A-') && r.approvedCode !== 'A-02' && r.approvedCode !== 'A-08'
          ? true
          : r.approvedCode === 'E-04'
          ? true
          : r.approvedCode.startsWith('R-') &&
            r.approvedCode !== 'R-01' &&
            r.approvedCode !== 'R-05' &&
            r.approvedCode !== 'R-08'
          ? true
          : false;
      const openVal = isDebitNature
        ? r.openingDebit - r.openingCredit
        : r.openingCredit - r.openingDebit;
      const closeVal = isDebitNature
        ? r.closingDebit - r.closingCredit
        : r.closingCredit - r.closingDebit;
      prev.openNet += openVal;
      prev.debit += r.periodDebit;
      prev.credit += r.periodCredit;
      prev.closeNet += closeVal;
      byPrimary.set(r.approvedCode, prev);
    }

    // Distribute primary totals proportionally across leaf accounts sharing that ifrsCode
    const leavesByPrimary = new Map<string, AccountItem[]>();
    for (const leaf of leafAccounts) {
      const code = leaf.ifrsCode || 'A-10';
      const arr = leavesByPrimary.get(code) || [];
      arr.push(leaf);
      leavesByPrimary.set(code, arr);
    }

    leavesByPrimary.forEach((leaves, pCode) => {
      const tbGroup = byPrimary.get(pCode);
      if (!tbGroup || leaves.length === 0) return;
      const currentTotal = leaves.reduce((s, l) => s + Math.max(1, Math.abs(l.balance)), 0);
      leaves.forEach((leaf, i) => {
        const weight = currentTotal > 0 ? Math.max(1, Math.abs(leaf.balance)) / currentTotal : 1 / leaves.length;
        if (i === leaves.length - 1 && leaves.length === 1) {
          leaf.openingBalance = Math.round(tbGroup.openNet * 100) / 100;
          leaf.currentDebit = Math.round(tbGroup.debit * 100) / 100;
          leaf.currentCredit = Math.round(tbGroup.credit * 100) / 100;
          leaf.balance = Math.round(tbGroup.closeNet * 100) / 100;
        } else {
          leaf.openingBalance = Math.round(tbGroup.openNet * weight * 100) / 100;
          leaf.currentDebit = Math.round(tbGroup.debit * weight * 100) / 100;
          leaf.currentCredit = Math.round(tbGroup.credit * weight * 100) / 100;
          leaf.balance = Math.round(tbGroup.closeNet * weight * 100) / 100;
        }
      });
    });

    return this.saveAccountsForCompany(companyId, current);
  },

  /**
   * Get custom field definitions for Assets and expandable sections
   */
  getCustomFieldDefinitions(companyId: CompanyId): CustomFieldDefinition[] {
    const norm = normalizeCompanyId(companyId);
    try {
      const raw = localStorage.getItem(`${CUSTOM_FIELDS_KEY_PREFIX}${norm}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return DEFAULT_CUSTOM_ASSET_FIELDS;
  },

  /**
   * Save custom field definitions
   */
  saveCustomFieldDefinitions(companyId: CompanyId, defs: CustomFieldDefinition[]): void {
    const norm = normalizeCompanyId(companyId);
    try {
      localStorage.setItem(`${CUSTOM_FIELDS_KEY_PREFIX}${norm}`, JSON.stringify(defs));
    } catch (e) {
      // ignore
    }
  },

  /**
   * Build hierarchical tree node list from flat accounts
   */
  buildTree(accounts: AccountItem[]): AccountTreeNode[] {
    const sorted = recalculateHierarchyRollups(accounts);
    const map: Record<string, AccountTreeNode> = {};
    const roots: AccountTreeNode[] = [];

    sorted.forEach((acc) => {
      map[acc.code] = { ...acc, children: [] };
    });

    sorted.forEach((acc) => {
      const node = map[acc.code];
      if (acc.parentCode && map[acc.parentCode]) {
        map[acc.parentCode].children = map[acc.parentCode].children || [];
        map[acc.parentCode].children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  },

  /**
   * Add a new account node and persist to storage
   */
  addAccount(
    companyId: CompanyId,
    newAcc: Omit<AccountItem, 'id' | 'companyId' | 'currentDebit' | 'currentCredit' | 'balance'> & {
      currentDebit?: number;
      currentCredit?: number;
      balance?: number;
    }
  ): AccountItem {
    const norm = normalizeCompanyId(companyId);
    const current = this.getAccountsByCompany(companyId);

    if (current.some((a) => a.code === newAcc.code)) {
      throw new Error(`كود الحساب (${newAcc.code}) مسجل مسبقاً في الدليل المحاسبي.`);
    }

    const opBal = Number(newAcc.openingBalance) || 0;
    const curDeb = Number(newAcc.currentDebit) || 0;
    const curCred = Number(newAcc.currentCredit) || 0;
    const computedBal =
      newAcc.balance !== undefined
        ? Number(newAcc.balance)
        : newAcc.nature === 'مدين'
        ? opBal + curDeb - curCred
        : opBal + curCred - curDeb;

    const created: AccountItem = enrichAccountWithIfrsClassification({
      ...newAcc,
      id: `${norm.toLowerCase()}-${newAcc.code}-${Date.now()}`,
      companyId: norm === 'all' ? 'SAF' : norm,
      openingBalance: opBal,
      currentDebit: curDeb,
      currentCredit: curCred,
      balance: computedBal,
    });

    const updated = [...current, created];
    this.saveAccountsForCompany(companyId, updated);
    return created;
  },

  /**
   * Update an existing account (supports updating leaf or distributing header balance edit)
   */
  updateAccount(companyId: CompanyId, code: string, updates: Partial<AccountItem>): AccountItem {
    const current = this.getAccountsByCompany(companyId);
    const index = current.findIndex((a) => a.code === code);
    if (index === -1) {
      throw new Error(`الحساب (${code}) غير موجود.`);
    }

    const existing = current[index];
    const next = enrichAccountWithIfrsClassification({ ...existing, ...updates });

    // If user edited balance directly on a header account, adjust its first child or create a child so rollup matches
    const children = current.filter((a) => a.parentCode === code);
    if (updates.balance !== undefined && children.length > 0) {
      const delta = Number(updates.balance) - Number(existing.balance);
      if (Math.abs(delta) > 0.01) {
        const firstLeaf = current.find((a) => a.code.startsWith(code) && !a.isHeader);
        if (firstLeaf) {
          const sign = firstLeaf.nature === existing.nature ? 1 : -1;
          firstLeaf.balance = (Number(firstLeaf.balance) || 0) + delta * sign;
          firstLeaf.openingBalance = (Number(firstLeaf.openingBalance) || 0) + delta * sign;
        }
      }
    } else if (
      updates.openingBalance !== undefined ||
      updates.currentDebit !== undefined ||
      updates.currentCredit !== undefined
    ) {
      if (updates.balance === undefined) {
        const op = Number(next.openingBalance) || 0;
        const deb = Number(next.currentDebit) || 0;
        const cred = Number(next.currentCredit) || 0;
        next.balance = next.nature === 'مدين' ? op + deb - cred : op + cred - deb;
      }
    }

    current[index] = next;
    const saved = this.saveAccountsForCompany(companyId, current);
    return saved.find((a) => a.code === next.code) || next;
  },

  /**
   * Delete account if it has no children
   */
  deleteAccount(companyId: CompanyId, code: string): boolean {
    const current = this.getAccountsByCompany(companyId);
    const hasChildren = current.some((a) => a.parentCode === code);
    if (hasChildren) {
      return false;
    }

    const filtered = current.filter((a) => a.code !== code);
    this.saveAccountsForCompany(companyId, filtered);
    return true;
  },

  /**
   * Find account by code
   */
  getAccountByCode(companyId: CompanyId, code: string): AccountItem | undefined {
    const accounts = this.getAccountsByCompany(companyId);
    return accounts.find((a) => a.code === code);
  },

  /**
   * Apply posted double-entry journal lines directly to leaf accounts in the COA tree
   * and recalculate all parent hierarchy rollups.
   */
  applyJournalLinesToAccounts(
    companyId: CompanyId,
    lines: Array<{ accountCode: string; debit: number; credit: number }>,
    factor: 1 | -1 = 1
  ): AccountItem[] {
    const current = this.getAccountsByCompany(companyId);
    const legacyCodeMap: Record<string, string> = {
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
      const mappedCode = legacyCodeMap[rawCode] || rawCode;

      // Locate matching leaf account (exact code, or first leaf child under prefix)
      let targetLeaf = current.find((a) => !a.isHeader && a.code === mappedCode);
      if (!targetLeaf) {
        targetLeaf = current.find((a) => !a.isHeader && a.code.startsWith(mappedCode));
      }
      if (!targetLeaf) continue;

      const d = (Number(line.debit) || 0) * factor;
      const c = (Number(line.credit) || 0) * factor;

      targetLeaf.currentDebit = Math.max(0, Math.round(((Number(targetLeaf.currentDebit) || 0) + d) * 100) / 100);
      targetLeaf.currentCredit = Math.max(0, Math.round(((Number(targetLeaf.currentCredit) || 0) + c) * 100) / 100);

      const op = Number(targetLeaf.openingBalance) || 0;
      targetLeaf.balance =
        targetLeaf.nature === 'مدين'
          ? Math.round((op + targetLeaf.currentDebit - targetLeaf.currentCredit) * 100) / 100
          : Math.round((op + targetLeaf.currentCredit - targetLeaf.currentDebit) * 100) / 100;
    }

    return this.saveAccountsForCompany(companyId, current);
  },
};
