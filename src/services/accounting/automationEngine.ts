import { CompanyId } from '../../types';
import { journalEngine, JournalEntry } from './journalEngine';

export interface InvoicePostingParams {
  invoiceNumber: string;
  clientName: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  branchName: string;
  createdBy: string;
  escrowAccountCode?: string;
  revenueAccountCode?: string;
  vatAccountCode?: string;
}

export interface ReceiptPostingParams {
  receiptNumber: string;
  payerName: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'POS' | 'CHECK';
  bankOrCashAccountCode: string;
  bankOrCashAccountName: string;
  branchName: string;
  createdBy: string;
}

export interface PaymentVoucherPostingParams {
  voucherNumber: string;
  beneficiaryName: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHECK';
  expenseAccountCode: string;
  expenseAccountName: string;
  bankOrCashAccountCode: string;
  bankOrCashAccountName: string;
  costCenterCode?: string;
  branchName: string;
  createdBy: string;
}

export interface TenderAwardPostingParams {
  tenderCode: string;
  tenderTitle: string;
  governmentEntity: string;
  winningBidValue: number;
  estimatedCost: number;
  branchName: string;
  createdBy: string;
}

export interface RentalContractPostingParams {
  contractNumber: string;
  clientName: string;
  packageTitle: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  branchName: string;
  createdBy: string;
}

export interface ForeignAgentSettlementPostingParams {
  settlementNumber: string;
  agentName: string;
  amountUsd: number;
  exchangeRate: number; // usually 3.75
  totalSar: number;
  bankAccountCode: string;
  branchName: string;
  createdBy: string;
}

export const accountingAutomationEngine = {
  /**
   * Automatically post an Issued Sales / Recruitment Invoice to the Company Ledger
   */
  postInvoiceToLedger(
    companyId: CompanyId,
    params: InvoicePostingParams
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `إثبات فاتورة ضريبية # ${params.invoiceNumber} - العميل: ${params.clientName}`;

    const escrowCode = params.escrowAccountCode || '11030';
    const revenueCode = params.revenueAccountCode || '41100';
    const vatCode = params.vatAccountCode || '21050';

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'INVOICE',
      sourceReference: params.invoiceNumber,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: escrowCode,
          accountName: 'حساب أمانات والذمم المدينة',
          debit: params.totalAmount,
          credit: 0,
        },
        {
          accountCode: revenueCode,
          accountName: 'إيرادات عقود الاستقدام والخدمات',
          debit: 0,
          credit: params.subtotal,
        },
        {
          accountCode: vatCode,
          accountName: 'ضريبة القيمة المضافة المستحقة (15%)',
          debit: 0,
          credit: params.vatAmount,
        },
      ],
    });
  },

  /**
   * Automatically post a Receipt Voucher to the Company Ledger
   */
  postReceiptToLedger(
    companyId: CompanyId,
    params: ReceiptPostingParams
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `سند قبض # ${params.receiptNumber} - من: ${params.payerName} (${params.paymentMethod})`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'RECEIPT',
      sourceReference: params.receiptNumber,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: params.bankOrCashAccountCode,
          accountName: params.bankOrCashAccountName,
          debit: params.amount,
          credit: 0,
        },
        {
          accountCode: '11030',
          accountName: 'حساب أمانات والذمم المدينة',
          debit: 0,
          credit: params.amount,
        },
      ],
    });
  },

  /**
   * Automatically post a Payment Voucher (Expenses / Supplier Payments) to Ledger
   */
  postPaymentVoucherToLedger(
    companyId: CompanyId,
    params: PaymentVoucherPostingParams
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `سند صرف ومصروفات # ${params.voucherNumber} - للمستفيد: ${params.beneficiaryName}`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'PAYMENT',
      sourceReference: params.voucherNumber,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: params.expenseAccountCode || '51020',
          accountName: params.expenseAccountName || 'مصروفات تشغيلية وعمومية',
          debit: params.amount,
          credit: 0,
        },
        {
          accountCode: params.bankOrCashAccountCode || '11020',
          accountName: params.bankOrCashAccountName || 'حساب البنك / الصندوق',
          debit: 0,
          credit: params.amount,
        },
      ],
    });
  },

  /**
   * Automatically post a Government Tender Award (KAS Monafasat) to Ledger
   */
  postTenderAwardToLedger(
    companyId: CompanyId,
    params: TenderAwardPostingParams
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `إثبات وترسية منافسة حكومية #${params.tenderCode} - ${params.tenderTitle} (${params.governmentEntity})`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'TENDER_AWARD',
      sourceReference: params.tenderCode,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: '11050',
          accountName: 'مشاريع ومنافسات حكومية تحت التنفيذ',
          debit: params.winningBidValue,
          credit: 0,
        },
        {
          accountCode: '41200',
          accountName: 'إيرادات المناقصات والتوريدات الحكومية',
          debit: 0,
          credit: params.winningBidValue,
        },
      ],
    });
  },

  /**
   * Automatically post Musaned Escrow Release to Company Revenue after 90 days guarantee period
   */
  postMusanedEscrowReleaseToLedger(
    companyId: CompanyId,
    params: {
      contractNumber: string;
      clientName: string;
      workerName: string;
      amount: number;
      branchName: string;
      createdBy: string;
    }
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `تسوية وتحرير أمانات مساند بعد انتهاء فترة الضمان (90 يوم) - عقد #${params.contractNumber} - العامل/ة: ${params.workerName}`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'MUSANED_ESCROW',
      sourceReference: params.contractNumber,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: '21060',
          accountName: 'أمانات مساند المعلقة (90 يوماً)',
          debit: params.amount,
          credit: 0,
        },
        {
          accountCode: '41100',
          accountName: 'إيرادات عقود الاستقدام المحققة',
          debit: 0,
          credit: params.amount,
        },
      ],
    });
  },

  /**
   * Automatically post Monthly Payroll to Ledger (WPS Compliant)
   */
  postPayrollToLedger(
    companyId: CompanyId,
    params: {
      monthYear: string;
      totalBasicSalaries: number;
      totalAllowances: number;
      totalDeductions: number;
      netPayable: number;
      bankAccountCode: string;
      branchName: string;
      createdBy: string;
    }
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `مسير الرواتب الشهري المعتمد لبرنامج حماية الأجور (WPS) - شهر: ${params.monthYear}`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'PAYROLL',
      sourceReference: `WPS-${params.monthYear}`,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: '51010',
          accountName: 'مصروف رواتب وأجور الموظفين',
          debit: params.totalBasicSalaries + params.totalAllowances,
          credit: 0,
        },
        {
          accountCode: '21040',
          accountName: 'استقطاعات وتأمينات مستحقة',
          debit: 0,
          credit: params.totalDeductions,
        },
        {
          accountCode: params.bankAccountCode || '11020',
          accountName: 'بنك الراجحي - الحساب التشغيلي الرئيسي',
          debit: 0,
          credit: params.netPayable,
        },
      ],
    });
  },

  /**
   * Automatically post Flexible Rental Contract to Ledger
   */
  postRentalContractToLedger(
    companyId: CompanyId,
    params: RentalContractPostingParams
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `عقد تأجير وتشغيل مرن #${params.contractNumber} - باقة: ${params.packageTitle} - العميل: ${params.clientName}`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'RENTAL_CONTRACT',
      sourceReference: params.contractNumber,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: '11030',
          accountName: 'حساب العملاء والذمم المدينة (عقود تأجير)',
          debit: params.totalAmount,
          credit: 0,
        },
        {
          accountCode: '41150',
          accountName: 'إيرادات باقات التأجير والتشغيل المرن',
          debit: 0,
          credit: params.subtotal,
        },
        {
          accountCode: '21050',
          accountName: 'ضريبة القيمة المضافة المستحقة (15%)',
          debit: 0,
          credit: params.vatAmount,
        },
      ],
    });
  },

  /**
   * Automatically post Foreign Agency Settlement in USD to Ledger
   */
  postForeignAgentSettlementToLedger(
    companyId: CompanyId,
    params: ForeignAgentSettlementPostingParams
  ): { entry: JournalEntry | null; error: string | null } {
    const description = `تسوية حوالة بنكية دولية للوكيل الخارجي: ${params.agentName} بمبلغ $${params.amountUsd.toLocaleString()} (${params.totalSar.toLocaleString()} ⃁)`;

    return journalEngine.createJournalEntry(companyId, {
      entryType: 'AUTOMATIC',
      sourceModule: 'FOREIGN_SETTLEMENT',
      sourceReference: params.settlementNumber,
      description,
      branchName: params.branchName,
      createdBy: params.createdBy,
      autoPost: true,
      lines: [
        {
          accountCode: '21070',
          accountName: 'مستحقات الوكلاء والمكاتب الخارجية',
          debit: params.totalSar,
          credit: 0,
        },
        {
          accountCode: params.bankAccountCode || '11020',
          accountName: 'حساب التحويلات البنكية الدولية (USD/SAR)',
          debit: 0,
          credit: params.totalSar,
        },
      ],
    });
  },
};
