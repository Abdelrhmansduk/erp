/**
 * Odoo 16+ Enterprise Accounting Configuration & Automation Engine
 * Implements the 3 core pillars from `/odoo-accounting-setup` tailored for Saudi SOCPA / IFRS / ZATCA:
 * 1. Payment Terms & Early Payment Discount Engine (شروط السداد وخصم التعجيل الآلي)
 * 2. Fiscal Positions & ZATCA Tax/Account Mapping (الأوضاع الضريبية والمالية التلقائية)
 * 3. Bank Statement Reconciliation Models & Auto Write-Off (نماذج وقواعد المطابقة البنكية الذكية)
 */

import { erpIndexedStorage } from '../storage/erpIndexedStorage';
import { CompanyId } from '../../types';
import { journalEngine } from './journalEngine';

export interface OdooPaymentTermLine {
  sequence: number;
  dueType: 'PERCENT' | 'BALANCE';
  valuePercent: number;
  daysAfterInvoice: number;
  labelAr: string;
}

export interface OdooPaymentTerm {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  earlyDiscountPercent: number;
  earlyDiscountDays: number;
  discountGainAccountCode: string;
  discountLossAccountCode: string;
  lines: OdooPaymentTermLine[];
  isActive: boolean;
}

export interface PaymentInstallmentRow {
  sequence: number;
  labelAr: string;
  dueDate: string;
  percent: number;
  amountSar: number;
}

export interface PaymentScheduleResult {
  term: OdooPaymentTerm;
  invoiceTotalSar: number;
  earlyDiscountEligibleUntil: string | null;
  earlyDiscountAmountSar: number;
  earlyNetPayableSar: number;
  installments: PaymentInstallmentRow[];
}

export interface OdooFiscalPosition {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  partnerCategory: 'B2C_DOMESTIC' | 'B2B_CORPORATE' | 'B2G_GOVERNMENT' | 'GOV_FEES_EXEMPT' | 'FOREIGN_AGENT_INTL';
  autoDetectConditionAr: string;
  sourceTaxLabel: string;
  mappedTaxLabel: string;
  mappedVatRate: number;
  isReverseCharge: boolean;
  sourceAccountCode: string;
  mappedAccountCode: string;
  mappedAccountNameAr: string;
  revenueOrExpenseAccountCode: string;
  revenueOrExpenseAccountNameAr: string;
  zatcaExemptionCode?: string;
}

export interface FiscalPositionMappingResult {
  fiscalPosition: OdooFiscalPosition;
  baseAmountSar: number;
  mappedVatRate: number;
  vatAmountSar: number;
  grossTotalSar: number;
  isReverseCharge: boolean;
  mappedLedgerAccount: { code: string; nameAr: string };
  targetLineAccount: { code: string; nameAr: string };
}

export interface OdooReconciliationModel {
  id: string;
  code: string;
  nameAr: string;
  type: 'WRITE_OFF' | 'COUNTERPART_MATCH';
  matchingOrder: number;
  labelKeywords: string[];
  maxAmountSar: number;
  writeOffAccountCode: string;
  writeOffAccountNameAr: string;
  includesRecoverableVat15: boolean;
  analyticCostCenterCode: string;
}

const PAYMENT_TERMS_KEY = 'erp_odoo_payment_terms_v1';
const FISCAL_POSITIONS_KEY = 'erp_odoo_fiscal_positions_v1';
const RECON_MODELS_KEY = 'erp_odoo_recon_models_v1';

export const DEFAULT_ODOO_PAYMENT_TERMS: OdooPaymentTerm[] = [
  {
    id: 'PT-NET30-2PCT',
    code: 'NET30-2/10',
    nameAr: 'آجل 30 يوماً مع خصم تعجيل سداد 2% خلال 10 أيام (2/10 Net 30)',
    nameEn: 'Net 30 with 2% Early Pay Discount (10 Days)',
    descriptionAr: 'يُرحّل خصم السداد المبكر (2%) تلقائياً لحساب خصومات تعجيل الدفع الممنوحة (520102) عند السداد خلال 10 أيام',
    earlyDiscountPercent: 2,
    earlyDiscountDays: 10,
    discountGainAccountCode: '420101',
    discountLossAccountCode: '520102',
    lines: [
      {
        sequence: 1,
        dueType: 'BALANCE',
        valuePercent: 100,
        daysAfterInvoice: 30,
        labelAr: 'كامل الرصيد المستحق خلال 30 يوماً (أو خصم 2% خلال 10 أيام)',
      },
    ],
    isActive: true,
  },
  {
    id: 'PT-MUSANED-ESCROW',
    code: 'MUSANED-90D',
    nameAr: 'بوابة مساند — إيداع أمانة 100% وتحرير بعد 90 يوماً',
    nameEn: 'Musaned 100% Escrow (90-Day Guarantee Release)',
    descriptionAr: 'إيداع كامل قيمة العقد في محفظة مساند (110301) وتحريرها للبنك بعد إتمام فترة التجربة النظامية 90 يوماً',
    earlyDiscountPercent: 0,
    earlyDiscountDays: 0,
    discountGainAccountCode: '420101',
    discountLossAccountCode: '520102',
    lines: [
      {
        sequence: 1,
        dueType: 'BALANCE',
        valuePercent: 100,
        daysAfterInvoice: 90,
        labelAr: 'استحقاق تحرير الأمانة بعد 90 يوماً من الوصول',
      },
    ],
    isActive: true,
  },
  {
    id: 'PT-B2B-50-50',
    code: 'SPLIT-50/50',
    nameAr: 'عقود تشغيل الشركات — 50% دفعة مقدمة + 50% بعد 30 يوماً',
    nameEn: '50% Upfront / 50% Net 30 Installments',
    descriptionAr: 'تقسيم الفاتورة آلياً إلى قسطين متساويين: عند توقيع العقد وبعد 30 يوماً من مباشرة العمالة',
    earlyDiscountPercent: 1.5,
    earlyDiscountDays: 7,
    discountGainAccountCode: '420101',
    discountLossAccountCode: '520102',
    lines: [
      {
        sequence: 1,
        dueType: 'PERCENT',
        valuePercent: 50,
        daysAfterInvoice: 0,
        labelAr: 'الدفعة الأولى (50% عند التعاقد)',
      },
      {
        sequence: 2,
        dueType: 'BALANCE',
        valuePercent: 50,
        daysAfterInvoice: 30,
        labelAr: 'الدفعة الثانية (50% بعد 30 يوماً)',
      },
    ],
    isActive: true,
  },
  {
    id: 'PT-ETMAD-B2G-60',
    code: 'ETMAD-NET60',
    nameAr: 'المنافسات الحكومية (منصة اعتماد B2G — مستخلصات 60 يوماً)',
    nameEn: 'Etmad Government Tenders Net 60',
    descriptionAr: 'دورة تحصيل أوامر الدفع الحكومية عبر منصة اعتماد بعد رفع المستخلصات وشهادة الإنجاز',
    earlyDiscountPercent: 0,
    earlyDiscountDays: 0,
    discountGainAccountCode: '420101',
    discountLossAccountCode: '520102',
    lines: [
      {
        sequence: 1,
        dueType: 'PERCENT',
        valuePercent: 20,
        daysAfterInvoice: 0,
        labelAr: 'دفعة مقدمة مقابل ضمان بنكي (20%)',
      },
      {
        sequence: 2,
        dueType: 'BALANCE',
        valuePercent: 80,
        daysAfterInvoice: 60,
        labelAr: 'صرف المستخلص النهائي عبر منصة اعتماد (80%)',
      },
    ],
    isActive: true,
  },
];

export const DEFAULT_ODOO_FISCAL_POSITIONS: OdooFiscalPosition[] = [
  {
    id: 'FP-DOMESTIC-B2C-15',
    code: 'SA-DOM-15',
    nameAr: 'توريدات وعقود محلية خاضعة للنسبة الأساسية (ZATCA 15% Standard VAT)',
    nameEn: 'Saudi Domestic Standard VAT (15%)',
    partnerCategory: 'B2C_DOMESTIC',
    autoDetectConditionAr: 'عميل محلي داخل المملكة (أفراد / مساند) — فاتورة ضريبية مبسطة (Phase 2)',
    sourceTaxLabel: 'ضريبة مخرجات قياسية 15%',
    mappedTaxLabel: 'ضريبة القيمة المضافة للمخرجات 15% (210501)',
    mappedVatRate: 0.15,
    isReverseCharge: false,
    sourceAccountCode: '110401',
    mappedAccountCode: '110401',
    mappedAccountNameAr: 'ذمم عملاء عقود الاستقدام الأفراد (B2C)',
    revenueOrExpenseAccountCode: '410101',
    revenueOrExpenseAccountNameAr: 'إيرادات عقود الاستقدام الأفراد — منصة مساند (B2C)',
  },
  {
    id: 'FP-CORPORATE-B2B-15',
    code: 'SA-B2B-15',
    nameAr: 'عقود تأجير وتشغيل القوى العاملة للشركات (B2B Tax Invoice 15%)',
    nameEn: 'Saudi Corporate B2B Standard VAT (15%)',
    partnerCategory: 'B2B_CORPORATE',
    autoDetectConditionAr: 'منشأة مسجلة برقم ضريبي (15 رقماً يبدأ وينتهي بـ 3)',
    sourceTaxLabel: 'ضريبة مخرجات قياسية 15%',
    mappedTaxLabel: 'ضريبة مخرجات B2B خاضعة 15% (210501)',
    mappedVatRate: 0.15,
    isReverseCharge: false,
    sourceAccountCode: '110401',
    mappedAccountCode: '110402',
    mappedAccountNameAr: 'ذمم عملاء قطاع الأعمال وعقود التأجير والتشغيل (B2B)',
    revenueOrExpenseAccountCode: '410201',
    revenueOrExpenseAccountNameAr: 'إيرادات عقود تأجير وتشغيل القوى العاملة (قصيرة وطويلة الأجل)',
  },
  {
    id: 'FP-GOV-FEES-EXEMPT',
    code: 'SA-GOV-0',
    nameAr: 'الرسوم الحكومية النظامية خارج نطاق الضريبة (الجوازات / قوى / التأشيرات 0%)',
    nameEn: 'Statutory Government Fees Out-of-Scope (0% VAT)',
    partnerCategory: 'GOV_FEES_EXEMPT',
    autoDetectConditionAr: 'سداد رسوم حكومية عبر سداد (إصدار إقامة، رخصة عمل، تأشيرة استقدام 2,000 ⃁)',
    sourceTaxLabel: 'ضريبة مدخلات قياسية 15%',
    mappedTaxLabel: 'خارج نطاق الضريبة / معفى نظاماً (0% VATEX-SA-OOS)',
    mappedVatRate: 0,
    isReverseCharge: false,
    sourceAccountCode: '210101',
    mappedAccountCode: '110201',
    mappedAccountNameAr: 'مصرف الراجحي - الحساب التشغيلي الرئيسي (سداد حكومي)',
    revenueOrExpenseAccountCode: '510201',
    revenueOrExpenseAccountNameAr: 'رسوم التأشيرات ورخص العمل والإقامات والتصديق الحكومي',
    zatcaExemptionCode: 'VATEX-SA-OOS',
  },
  {
    id: 'FP-FOREIGN-AGENT-RC',
    code: 'INTL-AGENT-RC',
    nameAr: 'الوكلاء والمكاتب الخارجية الدولية (احتساب عكسي / توريد دولي 0%)',
    nameEn: 'Foreign Recruitment Agencies (0% International / Reverse Charge)',
    partnerCategory: 'FOREIGN_AGENT_INTL',
    autoDetectConditionAr: 'مكتب إرسال عمالة خارج المملكة (الفلبين، إندونيسيا، سريلانكا، كينيا، بنجلاديش) بعملة USD/SAR',
    sourceTaxLabel: 'ضريبة مدخلات 15%',
    mappedTaxLabel: 'توريد خارجي 0% — آلية الاحتساب العكسي (Reverse Charge)',
    mappedVatRate: 0,
    isReverseCharge: true,
    sourceAccountCode: '210201',
    mappedAccountCode: '210101',
    mappedAccountNameAr: 'ذمم الوكلاء الخارجيين ومكاتب إرسال العمالة الدوليين',
    revenueOrExpenseAccountCode: '510101',
    revenueOrExpenseAccountNameAr: 'تكاليف وعمولات المكاتب والوكلاء الخارجيين للاستقدام',
    zatcaExemptionCode: 'VATEX-SA-RC',
  },
];

export const DEFAULT_ODOO_RECON_MODELS: OdooReconciliationModel[] = [
  {
    id: 'RECON-SARIE-FEE',
    code: 'AUTO-SARIE',
    nameAr: 'نموذج تسوية رسوم حوالات نظام سريع البنكية (SARIE Transfer Fee)',
    type: 'WRITE_OFF',
    matchingOrder: 1,
    labelKeywords: ['SARIE', 'سريع', 'BANK FEE', 'رسوم تحويل', 'عمولة حوالة'],
    maxAmountSar: 75,
    writeOffAccountCode: '510401',
    writeOffAccountNameAr: 'عمولات بوابات الدفع الإلكتروني ورسوم منصة مساند ومدى والحوالات',
    includesRecoverableVat15: true,
    analyticCostCenterCode: 'CC-FIN-01',
  },
  {
    id: 'RECON-MADA-SADAD',
    code: 'AUTO-MADA',
    nameAr: 'نموذج تسوية عمولات نقاط البيع مدى وبوابة سداد (MADA / SADAD Gateway)',
    type: 'WRITE_OFF',
    matchingOrder: 2,
    labelKeywords: ['MADA', 'SADAD', 'مدى', 'سداد', 'POS FEE', 'عمولة نقاط بيع'],
    maxAmountSar: 500,
    writeOffAccountCode: '510401',
    writeOffAccountNameAr: 'عمولات بوابات الدفع الإلكتروني ورسوم منصة مساند ومدى والحوالات',
    includesRecoverableVat15: true,
    analyticCostCenterCode: 'CC-SALES-01',
  },
  {
    id: 'RECON-FX-ROUNDING',
    code: 'AUTO-FX-DIFF',
    nameAr: 'نموذج شطب فروق التقريب وسعر صرف الدولار للوكلاء (FX Rounding <= 30 ⃁)',
    type: 'WRITE_OFF',
    matchingOrder: 3,
    labelKeywords: ['FX DIFF', 'فروق عملة', 'فرق صرف', 'ROUNDING', 'تقريب'],
    maxAmountSar: 30,
    writeOffAccountCode: '530401',
    writeOffAccountNameAr: 'مصروفات تشغيلية وإدارية وعمومية متنوعة (فروق تقريب وتسويات)',
    includesRecoverableVat15: false,
    analyticCostCenterCode: 'CC-INTL-01',
  },
];

function addDaysToIsoDate(isoDate: string, days: number): string {
  const base = isoDate ? new Date(`${isoDate}T00:00:00Z`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export const odooAccountingConfigService = {
  // ─── 1. Payment Terms & Early Payment Discount ───────────────────────────
  getPaymentTerms(): OdooPaymentTerm[] {
    return erpIndexedStorage.getSync<OdooPaymentTerm[]>(
      PAYMENT_TERMS_KEY,
      DEFAULT_ODOO_PAYMENT_TERMS
    );
  },

  addPaymentTerm(term: Omit<OdooPaymentTerm, 'id'>): OdooPaymentTerm {
    const current = this.getPaymentTerms();
    const created: OdooPaymentTerm = {
      ...term,
      id: `PT-CUSTOM-${Date.now().toString().slice(-5)}`,
    };
    const updated = [created, ...current];
    erpIndexedStorage.setSync(PAYMENT_TERMS_KEY, updated);
    return created;
  },

  computeInstallmentSchedule(
    termId: string,
    invoiceTotalSar: number,
    invoiceDate = new Date().toISOString().slice(0, 10)
  ): PaymentScheduleResult {
    const terms = this.getPaymentTerms();
    const term = terms.find((t) => t.id === termId) || terms[0];
    const safeTotal = Math.max(0, Math.round((Number(invoiceTotalSar) || 0) * 100) / 100);

    const earlyDiscountAmountSar =
      term.earlyDiscountPercent > 0
        ? Math.round(safeTotal * (term.earlyDiscountPercent / 100) * 100) / 100
        : 0;
    const earlyNetPayableSar = Math.round((safeTotal - earlyDiscountAmountSar) * 100) / 100;
    const earlyDiscountEligibleUntil =
      term.earlyDiscountDays > 0 ? addDaysToIsoDate(invoiceDate, term.earlyDiscountDays) : null;

    let allocatedSoFar = 0;
    const installments: PaymentInstallmentRow[] = term.lines.map((line, idx) => {
      const isLast = idx === term.lines.length - 1 || line.dueType === 'BALANCE';
      const amountSar = isLast
        ? Math.round((safeTotal - allocatedSoFar) * 100) / 100
        : Math.round(safeTotal * (line.valuePercent / 100) * 100) / 100;
      allocatedSoFar += amountSar;
      return {
        sequence: line.sequence,
        labelAr: line.labelAr,
        dueDate: addDaysToIsoDate(invoiceDate, line.daysAfterInvoice),
        percent: line.valuePercent,
        amountSar,
      };
    });

    return {
      term,
      invoiceTotalSar: safeTotal,
      earlyDiscountEligibleUntil,
      earlyDiscountAmountSar,
      earlyNetPayableSar,
      installments,
    };
  },

  /**
   * Posts an Odoo v16+ Early Payment Discount collection journal entry:
   * - Dr Bank (110201): Net Cash Received
   * - Dr Early Payment Discount Expense (520102): Discount Granted
   * - Cr Accounts Receivable (110402): Full Invoice Balance Cleared
   */
  postEarlyPaymentDiscountCollection(
    companyId: CompanyId,
    params: {
      invoiceRef: string;
      customerName: string;
      invoiceTotalSar: number;
      discountPercent: number;
      entryDate?: string;
    }
  ): {
    entryNumber: string;
    cashReceivedSar: number;
    discountGrantedSar: number;
    totalClearedReceivableSar: number;
  } {
    const totalClearedReceivableSar = Math.round((Number(params.invoiceTotalSar) || 0) * 100) / 100;
    const pct = Math.max(0, Math.min(50, Number(params.discountPercent) || 0));
    const discountGrantedSar = Math.round(totalClearedReceivableSar * (pct / 100) * 100) / 100;
    const cashReceivedSar = Math.round((totalClearedReceivableSar - discountGrantedSar) * 100) / 100;

    const lines = [
      {
        accountCode: '110201',
        accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي',
        description: `تحصيل نقدي مبكر للفاتورة ${params.invoiceRef} — ${params.customerName}`,
        debit: cashReceivedSar,
        credit: 0,
      },
      ...(discountGrantedSar > 0
        ? [
            {
              accountCode: '520102',
              accountName: 'خصومات تعجيل الدفع والخصم المسموح به للعملاء (Odoo Early Payment Discount)',
              description: `خصم تعجيل سداد مبكر (${pct}%) على الفاتورة ${params.invoiceRef}`,
              debit: discountGrantedSar,
              credit: 0,
            },
          ]
        : []),
      {
        accountCode: '110402',
        accountName: 'ذمم عملاء قطاع الأعمال وعقود التأجير والتشغيل (B2B)',
        description: `إقفال كامل ذمة الفاتورة ${params.invoiceRef} — ${params.customerName}`,
        debit: 0,
        credit: totalClearedReceivableSar,
      },
    ];

    const res = journalEngine.createJournalEntry(companyId, {
      entryDate: params.entryDate || new Date().toISOString().slice(0, 10),
      entryType: 'AUTOMATIC',
      sourceModule: 'ODOO_EARLY_PAYMENT_DISCOUNT',
      sourceReference: params.invoiceRef,
      description: `تحصيل فاتورة ${params.invoiceRef} (${params.customerName}) مع تطبيق خصم تعجيل السداد (${pct}%)`,
      createdBy: 'محرك شروط السداد (Odoo Payment Terms)',
      lines,
      autoPost: true,
    });

    if (res.error || !res.entry) {
      throw new Error(res.error || 'تعذر ترحيل قيد خصم السداد المبكر');
    }

    return {
      entryNumber: res.entry.entryNumber,
      cashReceivedSar,
      discountGrantedSar,
      totalClearedReceivableSar,
    };
  },

  // ─── 2. Fiscal Positions & Automatic Tax/Account Mapping ─────────────────
  getFiscalPositions(): OdooFiscalPosition[] {
    return erpIndexedStorage.getSync<OdooFiscalPosition[]>(
      FISCAL_POSITIONS_KEY,
      DEFAULT_ODOO_FISCAL_POSITIONS
    );
  },

  applyFiscalPositionMapping(
    fpId: string,
    baseAmountSar: number
  ): FiscalPositionMappingResult {
    const list = this.getFiscalPositions();
    const fp = list.find((item) => item.id === fpId) || list[0];
    const safeBase = Math.max(0, Math.round((Number(baseAmountSar) || 0) * 100) / 100);
    const vatAmountSar = Math.round(safeBase * fp.mappedVatRate * 100) / 100;
    const grossTotalSar = Math.round((safeBase + vatAmountSar) * 100) / 100;

    return {
      fiscalPosition: fp,
      baseAmountSar: safeBase,
      mappedVatRate: fp.mappedVatRate,
      vatAmountSar,
      grossTotalSar,
      isReverseCharge: fp.isReverseCharge,
      mappedLedgerAccount: {
        code: fp.mappedAccountCode,
        nameAr: fp.mappedAccountNameAr,
      },
      targetLineAccount: {
        code: fp.revenueOrExpenseAccountCode,
        nameAr: fp.revenueOrExpenseAccountNameAr,
      },
    };
  },

  postFiscalPositionTransaction(
    companyId: CompanyId,
    params: {
      fpId: string;
      baseAmountSar: number;
      partnerName: string;
      referenceNumber: string;
      entryDate?: string;
    }
  ): { entryNumber: string; mapping: FiscalPositionMappingResult } {
    const mapping = this.applyFiscalPositionMapping(params.fpId, params.baseAmountSar);
    const fp = mapping.fiscalPosition;
    const isPurchaseOrFee =
      fp.partnerCategory === 'GOV_FEES_EXEMPT' || fp.partnerCategory === 'FOREIGN_AGENT_INTL';

    const lines = isPurchaseOrFee
      ? [
          {
            accountCode: fp.revenueOrExpenseAccountCode,
            accountName: fp.revenueOrExpenseAccountNameAr,
            description: `${fp.nameAr} — ${params.partnerName} (${params.referenceNumber})`,
            debit: mapping.baseAmountSar,
            credit: 0,
          },
          {
            accountCode: fp.mappedAccountCode,
            accountName: fp.mappedAccountNameAr,
            description: `إثبات استحقاق/سداد وفق الوضع الضريبي [${fp.code}] — ${params.partnerName}`,
            debit: 0,
            credit: mapping.grossTotalSar,
          },
        ]
      : [
          {
            accountCode: fp.mappedAccountCode,
            accountName: fp.mappedAccountNameAr,
            description: `إثبات ذمة عميل وفق الوضع الضريبي [${fp.code}] — ${params.partnerName}`,
            debit: mapping.grossTotalSar,
            credit: 0,
          },
          {
            accountCode: fp.revenueOrExpenseAccountCode,
            accountName: fp.revenueOrExpenseAccountNameAr,
            description: `${fp.nameAr} — ${params.partnerName}`,
            debit: 0,
            credit: mapping.baseAmountSar,
          },
          ...(mapping.vatAmountSar > 0
            ? [
                {
                  accountCode: '210501',
                  accountName: 'ضريبة القيمة المضافة للمخرجات المستحقة (Output VAT 15%)',
                  description: `ضريبة مخرجات 15% (${fp.code}) — ${params.referenceNumber}`,
                  debit: 0,
                  credit: mapping.vatAmountSar,
                },
              ]
            : []),
        ];

    const res = journalEngine.createJournalEntry(companyId, {
      entryDate: params.entryDate || new Date().toISOString().slice(0, 10),
      entryType: 'AUTOMATIC',
      sourceModule: 'ODOO_FISCAL_POSITION',
      sourceReference: params.referenceNumber,
      description: `قيد آلي بالوضع الضريبي (${fp.nameAr}) — ${params.partnerName}`,
      createdBy: 'محرك الأوضاع الضريبية (Odoo Fiscal Positions)',
      lines,
      autoPost: true,
    });

    if (res.error || !res.entry) {
      throw new Error(res.error || 'تعذر ترحيل القيد وفق الوضع الضريبي');
    }

    return {
      entryNumber: res.entry.entryNumber,
      mapping,
    };
  },

  // ─── 3. Bank Reconciliation Models & Auto Write-Off ──────────────────────
  getReconciliationModels(): OdooReconciliationModel[] {
    return erpIndexedStorage.getSync<OdooReconciliationModel[]>(
      RECON_MODELS_KEY,
      DEFAULT_ODOO_RECON_MODELS
    );
  },

  matchBankStatementLine(
    statementLabel: string,
    amountSar: number
  ): OdooReconciliationModel | null {
    const models = [...this.getReconciliationModels()].sort(
      (a, b) => a.matchingOrder - b.matchingOrder
    );
    const upperLabel = (statementLabel || '').toUpperCase();
    const absAmount = Math.abs(Number(amountSar) || 0);

    for (const model of models) {
      const keywordMatched = model.labelKeywords.some((kw) =>
        upperLabel.includes(kw.toUpperCase())
      );
      if (keywordMatched && absAmount > 0 && absAmount <= model.maxAmountSar) {
        return model;
      }
    }
    return null;
  },

  executeReconciliationWriteOff(
    companyId: CompanyId,
    params: {
      modelId: string;
      statementRef: string;
      statementLabel: string;
      totalWriteOffSar: number;
      entryDate?: string;
    }
  ): {
    entryNumber: string;
    model: OdooReconciliationModel;
    netExpenseSar: number;
    inputVatSar: number;
    totalBankCreditSar: number;
  } {
    const models = this.getReconciliationModels();
    const model = models.find((m) => m.id === params.modelId) || models[0];
    const totalBankCreditSar = Math.max(0, Math.round((Number(params.totalWriteOffSar) || 0) * 100) / 100);

    const netExpenseSar = model.includesRecoverableVat15
      ? Math.round((totalBankCreditSar / 1.15) * 100) / 100
      : totalBankCreditSar;
    const inputVatSar = Math.round((totalBankCreditSar - netExpenseSar) * 100) / 100;

    const lines = [
      {
        accountCode: model.writeOffAccountCode,
        accountName: model.writeOffAccountNameAr,
        description: `شطب وتسوية بنكية آلية [${model.code}]: ${params.statementLabel}`,
        debit: netExpenseSar,
        credit: 0,
        costCenterCode: model.analyticCostCenterCode,
      },
      ...(inputVatSar > 0
        ? [
            {
              accountCode: '110801',
              accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)',
              description: `ضريبة مدخلات مستردة 15% على عمولة بنكية — ${params.statementRef}`,
              debit: inputVatSar,
              credit: 0,
              costCenterCode: model.analyticCostCenterCode,
            },
          ]
        : []),
      {
        accountCode: '110201',
        accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي',
        description: `تسوية حركة كشف الحساب البنكي (${params.statementRef})`,
        debit: 0,
        credit: totalBankCreditSar,
        costCenterCode: model.analyticCostCenterCode,
      },
    ];

    const res = journalEngine.createJournalEntry(companyId, {
      entryDate: params.entryDate || new Date().toISOString().slice(0, 10),
      entryType: 'AUTOMATIC',
      sourceModule: 'ODOO_RECONCILIATION_MODEL',
      sourceReference: params.statementRef,
      description: `مطابقة بنكية آلية (${model.nameAr}) — ${params.statementLabel}`,
      createdBy: 'محرك المطابقة البنكية (Odoo Reconciliation Models)',
      lines,
      autoPost: true,
    });

    if (res.error || !res.entry) {
      throw new Error(res.error || 'تعذر ترحيل قيد نموذج المطابقة البنكية');
    }

    return {
      entryNumber: res.entry.entryNumber,
      model,
      netExpenseSar,
      inputVatSar,
      totalBankCreditSar,
    };
  },
};
