import { CompanyId } from '../../types';
import { normalizeCompanyId } from '../../contexts/CompanyContext';
import { domainEventBus } from '../domainEventBus';
import { erpIndexedStorage } from '../storage/erpIndexedStorage';
import { chartOfAccountsService } from './chartOfAccountsService';
import { ifrsFinancialEngineService } from './ifrsFinancialEngineService';

export type OperationalTransactionType =
  | 'RECRUITMENT_CONTRACT'
  | 'RENT_CONTRACT'
  | 'SPONSORSHIP_TRANSFER'
  | 'WPS_PAYROLL'
  | 'RECEIPT_VOUCHER'
  | 'PAYMENT_VOUCHER'
  | 'ZATCA_INVOICE'
  | 'SALES_INVOICE_ISSUED'
  | 'MUSANED_ESCROW_RELEASE'
  | 'FOREIGN_AGENT_SETTLEMENT'
  | 'COST_CENTER_EXPENSE'
  | 'FINANCIAL_REQUEST_APPROVAL'
  | 'EOSB_SETTLEMENT';

export interface OperationalTransactionPayload {
  companyId: CompanyId | string;
  transactionType: OperationalTransactionType;
  referenceNumber?: string;
  referenceId?: string;
  partyName?: string;
  description?: string;
  amount: number; // Base amount (or gross if amountIncludesVat = true)
  taxAmount?: number;
  amountIncludesVat?: boolean;
  vatRate?: number; // Default 0.15 for revenue/invoice transactions, 0 for payroll/vouchers unless specified
  paymentChannel?: 'BANK' | 'CASH' | 'ESCROW' | 'RECEIVABLE';
  paymentMethod?: 'CASH' | 'BANK';
  branchName?: string;
  costCenterCode?: string;
  costCenterName?: string;
  createdBy?: string;
  entryDate?: string;
  /** Optional foreign currency amount in USD (converted at SAMA peg 3.75 SAR/USD) */
  usdAmount?: number;
}

export type JournalEntryType =
  | 'MANUAL'
  | 'AUTOMATIC'
  | 'RECURRING'
  | 'ACCRUAL'
  | 'ADJUSTMENT'
  | 'CLOSING'
  | 'REVERSAL';

export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'CANCELLED';

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
  costCenterCode?: string;
  costCenterName?: string;
  projectId?: string;
}

export interface JournalEntry {
  id: string;
  companyId: CompanyId;
  entryNumber: string; // e.g. SAF-JV-2026-0001
  entryDate: string;
  date?: string;
  entryType: JournalEntryType;
  sourceModule: string;
  sourceReference?: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalStatus;
  branchName: string;
  costCenterCode?: string;
  projectId?: string;
  createdBy: string;
  approvedBy?: string;
  postedAt?: string;
  lines: JournalLine[];
  createdAt: string;
}

const INITIAL_JOURNALS_MAP: Record<string, JournalEntry[]> = {
  SAF: [
    {
      id: 'JV-SAF-001',
      companyId: 'SAF',
      entryNumber: 'SAF-JV-2026-0001',
      entryDate: new Date().toISOString().split('T')[0],
      entryType: 'AUTOMATIC',
      sourceModule: 'INVOICE',
      sourceReference: 'SAF-INV-2026-0014',
      description: 'إثبات قيد فاتورة استقدام مساند - السفير الماسي / العميل أبو إياد',
      totalDebit: 1150.0,
      totalCredit: 1150.0,
      status: 'POSTED',
      branchName: 'فرع الرياض',
      createdBy: 'النظام المحاسبي التلقائي',
      approvedBy: 'مدير الحسابات - السفير الماسي',
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lines: [
        { id: 'l1', accountCode: '11030', accountName: 'حساب أمانات مساند (SAF Escrow)', debit: 1150.0, credit: 0.0 },
        { id: 'l2', accountCode: '41100', accountName: 'إيرادات عقود استقدام مساند - السفير الماسي', debit: 0.0, credit: 1000.0 },
        { id: 'l3', accountCode: '21050', accountName: 'ضريبة القيمة المضافة المستحقة (15%)', debit: 0.0, credit: 150.0 },
      ],
    },
  ],
  YAQ: [
    {
      id: 'JV-YAQ-001',
      companyId: 'YAQ',
      entryNumber: 'YAQ-JV-2026-0001',
      entryDate: new Date().toISOString().split('T')[0],
      entryType: 'AUTOMATIC',
      sourceModule: 'RECEIPT',
      sourceReference: 'YAQ-REC-2026-0005',
      description: 'سند قبض عقد تأجير عمالة - شركة ياقوت نجد / بنك الرياض',
      totalDebit: 3450.0,
      totalCredit: 3450.0,
      status: 'POSTED',
      branchName: 'فرع جدة الرئيسي',
      createdBy: 'النظام المحاسبي التلقائي',
      approvedBy: 'محاسب ياقوت نجد',
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lines: [
        { id: 'yl1', accountCode: '11020', accountName: 'بنك الرياض - الحساب التشغيلي [YAQ]', debit: 3450.0, credit: 0.0 },
        { id: 'yl2', accountCode: '41100', accountName: 'إيرادات عقود استقدام ياقوت نجد', debit: 0.0, credit: 3000.0 },
        { id: 'yl3', accountCode: '21050', accountName: 'ضريبة القيمة المضافة المستحقة (15%)', debit: 0.0, credit: 450.0 },
      ],
    },
  ],
  TOP: [],
  KAS: [],
  DAR: [],
};

const STORAGE_KEY = 'ALSULAIM_ERP_DB_V1_company_journal_entries';

function roundCurrencySar(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toHalalas(value: number): number {
  return Math.round((Number(value) || 0) * 100);
}

function loadPersistedJournals(): Record<string, JournalEntry[]> {
  const parsed = erpIndexedStorage.getSync<JournalEntry[] | null>(STORAGE_KEY, null);
  if (Array.isArray(parsed)) {
    const map: Record<string, JournalEntry[]> = { SAF: [], YAQ: [], TOP: [], KAS: [], DAR: [] };
    parsed.forEach((j) => {
      const c = j.companyId || 'SAF';
      if (!map[c]) map[c] = [];
      map[c].push(j);
    });
    return map;
  }
  return structuredClone(INITIAL_JOURNALS_MAP);
}

function savePersistedJournals(map: Record<string, JournalEntry[]>) {
  try {
    const flat = Object.values(map).flat();
    erpIndexedStorage.setSync(STORAGE_KEY, flat);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alsulaim_erp_journals_updated', { detail: flat }));
    }
  } catch (e) {
    console.error('Failed to persist journals', e);
  }
}

function syncPostedJournalToLedgers(companyId: CompanyId, lines: JournalLine[]) {
  try {
    chartOfAccountsService.applyJournalLinesToAccounts(companyId, lines, 1);
    ifrsFinancialEngineService.applyJournalLinesToTrialBalance(companyId, lines, 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('alsulaim_erp_accounting_synced', {
          detail: { companyId, updatedAt: new Date().toISOString() },
        })
      );
    }
  } catch (err) {
    console.error('Failed to sync posted journal to COA/IFRS ledgers', err);
  }
}

const FISCAL_PERIOD_LOCKS_KEY = 'erp_fiscal_locked_periods_v1';
const DEFAULT_LOCKED_PERIODS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

function loadLockedPeriodsMap(): Record<string, string[]> {
  try {
    const parsed = erpIndexedStorage.getSync<Record<string, string[]> | null>(FISCAL_PERIOD_LOCKS_KEY, null);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) {
    console.warn('[journalEngine] Failed to read fiscal period lock storage:', err);
  }
  return {
    SAF: [...DEFAULT_LOCKED_PERIODS],
    YAQ: [...DEFAULT_LOCKED_PERIODS],
    TOP: [...DEFAULT_LOCKED_PERIODS],
    KAS: [...DEFAULT_LOCKED_PERIODS],
    DAR: [...DEFAULT_LOCKED_PERIODS],
  };
}

function saveLockedPeriodsMap(map: Record<string, string[]>): void {
  try {
    erpIndexedStorage.setSync(FISCAL_PERIOD_LOCKS_KEY, map);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp_journals_updated'));
    }
  } catch (err) {
    console.warn('[journalEngine] Failed to persist fiscal period lock storage:', err);
  }
}

let CURRENT_MAP = loadPersistedJournals();

export const journalEngine = {
  /**
   * Fiscal Period Lock Controls (قفل الفترات المحاسبية الشهرية والسنوية)
   */
  getLockedPeriods(companyId: CompanyId): string[] {
    const norm = normalizeCompanyId(companyId);
    const target = norm === 'all' ? 'SAF' : norm;
    const map = loadLockedPeriodsMap();
    const list = new Set<string>([...(map[target] || []), ...(map['ALL'] || [])]);
    return Array.from(list).sort();
  },

  isPeriodLocked(companyId: CompanyId, dateOrPeriod: string): boolean {
    if (!dateOrPeriod) return false;
    const periodYm = dateOrPeriod.slice(0, 7); // YYYY-MM
    const locked = this.getLockedPeriods(companyId);
    return locked.includes(periodYm);
  },

  lockFiscalPeriod(companyId: CompanyId, periodYm: string): string[] {
    const norm = normalizeCompanyId(companyId);
    const target = norm === 'all' ? 'SAF' : norm;
    const ym = periodYm.slice(0, 7);
    const map = loadLockedPeriodsMap();
    const current = new Set<string>(map[target] || []);
    current.add(ym);
    map[target] = Array.from(current).sort();
    saveLockedPeriodsMap(map);
    return this.getLockedPeriods(companyId);
  },

  unlockFiscalPeriod(companyId: CompanyId, periodYm: string): string[] {
    const norm = normalizeCompanyId(companyId);
    const target = norm === 'all' ? 'SAF' : norm;
    const ym = periodYm.slice(0, 7);
    const map = loadLockedPeriodsMap();
    map[target] = (map[target] || []).filter((p) => p !== ym);
    if (map['ALL']) {
      map['ALL'] = map['ALL'].filter((p) => p !== ym);
    }
    saveLockedPeriodsMap(map);
    return this.getLockedPeriods(companyId);
  },

  togglePeriodLock(companyId: CompanyId, periodYm: string): { locked: boolean; periods: string[] } {
    const ym = periodYm.slice(0, 7);
    if (this.isPeriodLocked(companyId, ym)) {
      const periods = this.unlockFiscalPeriod(companyId, ym);
      return { locked: false, periods };
    }
    const periods = this.lockFiscalPeriod(companyId, ym);
    return { locked: true, periods };
  },

  /**
   * Get all journal entries for a company
   */
  getJournalsByCompany(companyId: CompanyId): JournalEntry[] {
    CURRENT_MAP = loadPersistedJournals();
    const norm = normalizeCompanyId(companyId);
    if (norm === 'all') {
      return Object.values(CURRENT_MAP)
        .flat()
        .map((j) => ({ ...j, date: j.date || j.entryDate }));
    }
    return (CURRENT_MAP[norm] || []).map((j) => ({ ...j, date: j.date || j.entryDate }));
  },

  /**
   * Generate next sequential entry number for company (e.g. SAF-JV-2026-0002)
   */
  generateEntryNumber(companyId: CompanyId): string {
    const norm = normalizeCompanyId(companyId);
    const prefix = norm === 'all' ? 'SAF' : norm;
    const currentYear = new Date().getFullYear();
    const existing = this.getJournalsByCompany(prefix as CompanyId);
    const nextSeq = existing.length + 1;
    return `${prefix}-JV-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  },

  /**
   * Create a double-entry journal entry with strict Debit == Credit validation
   */
  createJournalEntry(
    companyId: CompanyId,
    params: {
      entryDate?: string;
      date?: string;
      entryType?: JournalEntryType;
      sourceModule?: string;
      sourceReference?: string;
      description: string;
      branchName?: string;
      costCenterCode?: string;
      projectId?: string;
      createdBy: string;
      lines: Array<Omit<JournalLine, 'id' | 'accountName'> & { accountName?: string }>;
      autoPost?: boolean;
    }
  ): { entry: JournalEntry | null; error: string | null } {
    const norm = normalizeCompanyId(companyId);
    const targetCompany = norm === 'all' ? 'SAF' : norm;
    const effectiveEntryDate = params.entryDate || params.date || new Date().toISOString().split('T')[0];

    // Fiscal Period Lock Guard
    if (this.isPeriodLocked(targetCompany, effectiveEntryDate)) {
      return {
        entry: null,
        error: `[Fiscal Period Locked] الفترة المحاسبية (${effectiveEntryDate.slice(0, 7)}) مقفلة مالياً — لا يمكن تسجيل أو ترحيل قيود محاسبية ضمن فترة مغلقة.`,
      };
    }

    // Calculate totals in exact integer halalas to prevent IEEE-754 floating-point drift
    const totalDebitHalalas = params.lines.reduce((sum, l) => sum + toHalalas(l.debit || 0), 0);
    const totalCreditHalalas = params.lines.reduce((sum, l) => sum + toHalalas(l.credit || 0), 0);
    const totalDebit = totalDebitHalalas / 100;
    const totalCredit = totalCreditHalalas / 100;

    // Double Entry Golden Rule Validation
    if (totalDebitHalalas !== totalCreditHalalas) {
      return {
        entry: null,
        error: `[Double Entry Error] القيد المحاسبي غير متوازن! إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)}).`,
      };
    }

    if (params.lines.length < 2) {
      return {
        entry: null,
        error: '[Double Entry Error] يجب أن يحتوي القيد على طرفين على الأقل (طرف مدين وطرف دائن).',
      };
    }

    const entryNumber = this.generateEntryNumber(targetCompany);
    const isPosted = params.autoPost ?? false;

    const newEntry: JournalEntry = {
      id: `jv-${targetCompany.toLowerCase()}-${Date.now()}`,
      companyId: targetCompany,
      entryNumber,
      entryDate: effectiveEntryDate,
      date: effectiveEntryDate,
      entryType: params.entryType || 'MANUAL',
      sourceModule: params.sourceModule || 'GENERAL_LEDGER',
      sourceReference: params.sourceReference,
      description: params.description,
      totalDebit,
      totalCredit,
      status: isPosted ? 'POSTED' : 'DRAFT',
      branchName: params.branchName || 'الفرع الرئيسي',
      costCenterCode: params.costCenterCode,
      projectId: params.projectId,
      createdBy: params.createdBy,
      postedAt: isPosted ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      lines: params.lines.map((l, index) => ({
        ...l,
        accountName:
          l.accountName ||
          chartOfAccountsService.getAccountByCode(targetCompany, l.accountCode)?.nameAr ||
          l.accountCode,
        debit: roundCurrencySar(l.debit),
        credit: roundCurrencySar(l.credit),
        id: `jl-${index}-${Date.now()}`,
      })),
    };

    if (!CURRENT_MAP[targetCompany]) {
      CURRENT_MAP[targetCompany] = [];
    }

    CURRENT_MAP[targetCompany].unshift(newEntry);
    savePersistedJournals(CURRENT_MAP);

    if (isPosted) {
      syncPostedJournalToLedgers(targetCompany, newEntry.lines);
      void domainEventBus.publishDomainEvent({
        companyId: targetCompany,
        aggregateType: 'JOURNAL_ENTRY',
        aggregateId: newEntry.id,
        eventType: 'JOURNAL_ENTRY_POSTED',
        payload: {
          entryNumber: newEntry.entryNumber,
          totalDebit: newEntry.totalDebit,
          totalCredit: newEntry.totalCredit,
          sourceModule: newEntry.sourceModule,
        },
      });
    }

    return { entry: newEntry, error: null };
  },

  /**
   * Post a draft journal entry (Irreversible without Reversal entry)
   */
  postJournalEntry(companyId: CompanyId, entryId: string, approvedBy: string): { success: boolean; error: string | null } {
    CURRENT_MAP = loadPersistedJournals();
    const norm = normalizeCompanyId(companyId);
    const targetCompany = norm === 'all' ? 'SAF' : norm;
    const journals = CURRENT_MAP[targetCompany] || [];
    const entry = journals.find((j) => j.id === entryId);

    if (!entry) {
      return { success: false, error: 'القيد المحاسبي غير موجود.' };
    }

    if (entry.status === 'POSTED') {
      return { success: false, error: 'القيد مرحّل بالفعل ولا يمكن إعادة ترحيله.' };
    }

    if (this.isPeriodLocked(targetCompany, entry.entryDate)) {
      return {
        success: false,
        error: `[Fiscal Period Locked] الفترة المحاسبية (${entry.entryDate.slice(0, 7)}) مقفلة مالياً — لا يمكن ترحيل القيد.`,
      };
    }

    entry.status = 'POSTED';
    entry.approvedBy = approvedBy;
    entry.postedAt = new Date().toISOString();

    savePersistedJournals(CURRENT_MAP);
    syncPostedJournalToLedgers(targetCompany, entry.lines);

    void domainEventBus.publishDomainEvent({
      companyId: targetCompany,
      aggregateType: 'JOURNAL_ENTRY',
      aggregateId: entry.id,
      eventType: 'JOURNAL_ENTRY_POSTED',
      payload: {
        entryNumber: entry.entryNumber,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
        approvedBy,
      },
    });

    return { success: true, error: null };
  },

  /**
   * Append-Only Ledger Guard: Direct modification of POSTED entries is strictly forbidden (rules.md §4.1).
   */
  updateJournalEntry(
    companyId: CompanyId,
    entryId: string,
    updates: Partial<Pick<JournalEntry, 'description' | 'lines'>>
  ): { entry: JournalEntry | null; error: string | null } {
    CURRENT_MAP = loadPersistedJournals();
    const norm = normalizeCompanyId(companyId);
    const targetCompany = norm === 'all' ? 'SAF' : norm;
    const journals = CURRENT_MAP[targetCompany] || [];
    const entry = journals.find((j) => j.id === entryId);

    if (!entry) {
      return { entry: null, error: 'القيد المحاسبي غير موجود.' };
    }

    if (entry.status === 'POSTED' || entry.status === 'REVERSED') {
      return {
        entry: null,
        error: '[Append-Only Ledger Violation] يمنع تعديل القيود المرحلة نهائياً. يجب إنشاء قيد عكسي (Reversal Entry) لتصحيح الأخطاء المحاسبية.',
      };
    }

    if (updates.description) entry.description = updates.description;
    if (updates.lines) {
      if (updates.lines.length < 2) {
        return {
          entry: null,
          error: '[Double Entry Error] يجب أن يحتوي القيد على طرفين على الأقل (طرف مدين وطرف دائن).',
        };
      }
      const debitHalalas = updates.lines.reduce((s, l) => s + toHalalas(l.debit || 0), 0);
      const creditHalalas = updates.lines.reduce((s, l) => s + toHalalas(l.credit || 0), 0);
      if (debitHalalas !== creditHalalas) {
        return {
          entry: null,
          error: `[Double Entry Error] تعديل القيد غير متوازن! إجمالي المدين (${(debitHalalas / 100).toFixed(2)}) لا يساوي إجمالي الدائن (${(creditHalalas / 100).toFixed(2)}).`,
        };
      }
      entry.lines = updates.lines.map((l, idx) => ({
        ...l,
        id: l.id || `jl-${idx}-${Date.now()}`,
        debit: roundCurrencySar(l.debit),
        credit: roundCurrencySar(l.credit),
      }));
      entry.totalDebit = debitHalalas / 100;
      entry.totalCredit = creditHalalas / 100;
    }
    savePersistedJournals(CURRENT_MAP);
    return { entry, error: null };
  },

  /**
   * Append-Only Ledger Guard: Deleting POSTED entries is strictly forbidden (rules.md §4.1).
   */
  deleteJournalEntry(companyId: CompanyId, entryId: string): { success: boolean; error: string | null } {
    CURRENT_MAP = loadPersistedJournals();
    const norm = normalizeCompanyId(companyId);
    const targetCompany = norm === 'all' ? 'SAF' : norm;
    const journals = CURRENT_MAP[targetCompany] || [];
    const idx = journals.findIndex((j) => j.id === entryId);

    if (idx === -1) {
      return { success: false, error: 'القيد المحاسبي غير موجود.' };
    }

    const entry = journals[idx];
    if (entry.status === 'POSTED' || entry.status === 'REVERSED') {
      return {
        success: false,
        error: '[Append-Only Ledger Violation] يمنع حذف القيود المحاسبية المرحلة نهائياً وفق معايير المراجعة والزكاة (ZATCA). استخدم القيد العكسي فقط.',
      };
    }

    journals.splice(idx, 1);
    savePersistedJournals(CURRENT_MAP);
    return { success: true, error: null };
  },

  /**
   * Creates an immutable Reversal Entry (قيد عكسي) that swaps Debit and Credit lines of a POSTED entry
   * and marks the original entry as REVERSED (TASK-303 / architecture.md §8.2).
   */
  reverseJournalEntry(
    companyId: CompanyId,
    originalEntryId: string,
    reason: string,
    reversedBy: string
  ): { reversalEntry: JournalEntry | null; originalEntry: JournalEntry | null; error: string | null } {
    CURRENT_MAP = loadPersistedJournals();
    const norm = normalizeCompanyId(companyId);
    const targetCompany = norm === 'all' ? 'SAF' : norm;
    const journals = CURRENT_MAP[targetCompany] || [];
    const original = journals.find((j) => j.id === originalEntryId);

    if (!original) {
      return { reversalEntry: null, originalEntry: null, error: 'القيد الأصلي المراد عكسه غير موجود.' };
    }

    if (original.status !== 'POSTED') {
      return {
        reversalEntry: null,
        originalEntry: original,
        error: 'لا يمكن إجراء قيد عكسي إلا للقيود المرحلة (POSTED) فقط.',
      };
    }

    if (!reason || reason.trim().length < 3) {
      return {
        reversalEntry: null,
        originalEntry: original,
        error: 'يجب توثيق السبب المحاسبي لإصدار القيد العكسي.',
      };
    }

    const reversedLines: Omit<JournalLine, 'id'>[] = original.lines.map((line) => ({
      accountCode: line.accountCode,
      accountName: line.accountName,
      description: `عكس بند: ${line.description || original.description}`,
      debit: line.credit,
      credit: line.debit,
      costCenterCode: line.costCenterCode,
      projectId: line.projectId,
    }));

    const created = this.createJournalEntry(targetCompany, {
      entryDate: new Date().toISOString().split('T')[0],
      entryType: 'REVERSAL',
      sourceModule: original.sourceModule,
      sourceReference: original.entryNumber,
      description: `قيد عكسي للقيد (${original.entryNumber}) - السبب: ${reason}`,
      branchName: original.branchName,
      costCenterCode: original.costCenterCode,
      projectId: original.projectId,
      createdBy: reversedBy,
      lines: reversedLines,
      autoPost: true,
    });

    if (created.error || !created.entry) {
      return { reversalEntry: null, originalEntry: original, error: created.error };
    }

    // Reload and mark original as REVERSED
    CURRENT_MAP = loadPersistedJournals();
    const updatedOriginal = (CURRENT_MAP[targetCompany] || []).find((j) => j.id === originalEntryId) || original;
    updatedOriginal.status = 'REVERSED';
    savePersistedJournals(CURRENT_MAP);

    void domainEventBus.publishDomainEvent({
      companyId: targetCompany,
      aggregateType: 'JOURNAL_ENTRY',
      aggregateId: originalEntryId,
      eventType: 'JOURNAL_ENTRY_REVERSED',
      payload: {
        originalEntryNumber: original.entryNumber,
        reversalEntryId: created.entry.id,
        reversalEntryNumber: created.entry.entryNumber,
        reason,
        reversedBy,
      },
    });

    return {
      reversalEntry: created.entry,
      originalEntry: updatedOriginal,
      error: null,
      ...created.entry,
    };
  },

  /**
   * Real-Time Operational-to-Accounting Auto-Posting Bridge:
   * Automatically translates operational events (Recruitment Contracts, Rent Contracts,
   * Sponsorship Transfers, WPS Payroll, Vouchers, ZATCA Invoices) into balanced double-entry
   * journal vouchers with 15% VAT and synchronizes both COA (86 accounts) and IFRS Trial Balance (211 accounts).
   */
  autoPostOperationalTransaction(
    payload: OperationalTransactionPayload
  ): {
    entry: JournalEntry | null;
    error: string | null;
  } & Partial<JournalEntry> {
    const rawAmount = Math.max(
      0,
      Number(payload.amount) || (payload.usdAmount ? Number(payload.usdAmount) * 3.75 : 0)
    );
    if (rawAmount <= 0) {
      return { entry: null, error: 'قيمة العملية التشغيلية يجب أن تكون أكبر من صفر.' };
    }

    const effectiveRefNumber = payload.referenceNumber || payload.referenceId || `REF-${Date.now()}`;
    const effectiveDescription =
      payload.description || `${payload.transactionType} — ${payload.partyName || effectiveRefNumber}`;
    const effectivePaymentChannel = payload.paymentChannel || payload.paymentMethod;
    const effectiveBranchName = payload.branchName || payload.costCenterName || 'الفرع الرئيسي - الرياض';

    const defaultVatTypes: OperationalTransactionType[] = [
      'RECRUITMENT_CONTRACT',
      'RENT_CONTRACT',
      'SPONSORSHIP_TRANSFER',
      'ZATCA_INVOICE',
      'SALES_INVOICE_ISSUED',
    ];
    const effectiveVatRate =
      payload.vatRate !== undefined
        ? payload.vatRate
        : defaultVatTypes.includes(payload.transactionType)
        ? 0.15
        : 0;

    let netHalalas = 0;
    let vatHalalas = 0;
    let grossHalalas = 0;

    if (payload.taxAmount !== undefined && payload.taxAmount > 0) {
      netHalalas = toHalalas(rawAmount);
      vatHalalas = toHalalas(payload.taxAmount);
      grossHalalas = netHalalas + vatHalalas;
    } else if (effectiveVatRate > 0) {
      if (payload.amountIncludesVat) {
        grossHalalas = toHalalas(rawAmount);
        netHalalas = Math.round(grossHalalas / (1 + effectiveVatRate));
        vatHalalas = grossHalalas - netHalalas;
      } else {
        netHalalas = toHalalas(rawAmount);
        vatHalalas = Math.round(netHalalas * effectiveVatRate);
        grossHalalas = netHalalas + vatHalalas;
      }
    } else {
      netHalalas = toHalalas(rawAmount);
      vatHalalas = 0;
      grossHalalas = netHalalas;
    }

    const netAmount = netHalalas / 100;
    const vatAmount = vatHalalas / 100;
    const grossAmount = grossHalalas / 100;

    const channelAccountMap: Record<
      NonNullable<OperationalTransactionPayload['paymentChannel']>,
      { code: string; name: string }
    > = {
      BANK: { code: '110201', name: 'مصرف الراجحي - الحساب التشغيلي الرئيسي' },
      CASH: { code: '110101', name: 'الصندوق الرئيسي - الخزينة المركزية بالرياض' },
      ESCROW: { code: '110301', name: 'مستحقات عقود مساند المعلقة تحت التحصيل (فترة الضمان 90 يوماً)' },
      RECEIVABLE: { code: '110401', name: 'ذمم عملاء عقود الاستقدام الأفراد (B2C)' },
    };

    const lines: Omit<JournalLine, 'id'>[] = [];

    switch (payload.transactionType) {
      case 'RECRUITMENT_CONTRACT': {
        const debitAcc = channelAccountMap[payload.paymentChannel || 'ESCROW'];
        lines.push({
          accountCode: debitAcc.code,
          accountName: debitAcc.name,
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '410101',
          accountName: 'إيرادات عقود الاستقدام الأفراد — منصة مساند (B2C)',
          description: payload.description,
          debit: 0,
          credit: netAmount,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '210501',
            accountName: 'ضريبة القيمة المضافة للمخرجات المستحقة (Output VAT 15%)',
            description: `ضريبة القيمة المضافة 15% - ${payload.referenceNumber}`,
            debit: 0,
            credit: vatAmount,
            costCenterCode: payload.costCenterCode,
          });
        }
        break;
      }

      case 'RENT_CONTRACT': {
        const debitAcc =
          payload.paymentChannel === 'RECEIVABLE'
            ? { code: '110402', name: 'ذمم عملاء قطاع الأعمال وعقود التأجير والتشغيل (B2B)' }
            : channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: debitAcc.code,
          accountName: debitAcc.name,
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '410201',
          accountName: 'إيرادات عقود تأجير وتشغيل القوى العاملة (قصيرة وطويلة الأجل)',
          description: payload.description,
          debit: 0,
          credit: netAmount,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '210501',
            accountName: 'ضريبة القيمة المضافة للمخرجات المستحقة (Output VAT 15%)',
            description: `ضريبة القيمة المضافة 15% - ${payload.referenceNumber}`,
            debit: 0,
            credit: vatAmount,
            costCenterCode: payload.costCenterCode,
          });
        }
        break;
      }

      case 'SPONSORSHIP_TRANSFER': {
        const debitAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: debitAcc.code,
          accountName: debitAcc.name,
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '410301',
          accountName: 'إيرادات رسوم نقل الخدمات والتنازل والوساطة',
          description: payload.description,
          debit: 0,
          credit: netAmount,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '210501',
            accountName: 'ضريبة القيمة المضافة للمخرجات المستحقة (Output VAT 15%)',
            description: `ضريبة القيمة المضافة 15% - ${payload.referenceNumber}`,
            debit: 0,
            credit: vatAmount,
            costCenterCode: payload.costCenterCode,
          });
        }
        break;
      }

      case 'WPS_PAYROLL': {
        const creditAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: '530101',
          accountName: 'رواتب وأجور وبدلات الكوادر الإدارية والمحاسبية',
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          description: payload.description,
          debit: 0,
          credit: grossAmount,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'RECEIPT_VOUCHER': {
        const debitAcc = channelAccountMap[payload.paymentChannel || 'CASH'];
        lines.push({
          accountCode: debitAcc.code,
          accountName: debitAcc.name,
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '110401',
          accountName: 'ذمم عملاء عقود الاستقدام الأفراد (B2C)',
          description: payload.description,
          debit: 0,
          credit: grossAmount,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'PAYMENT_VOUCHER': {
        const creditAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: '210101',
          accountName: 'ذمم الوكلاء الخارجيين ومكاتب إرسال العمالة الدوليين',
          description: payload.description,
          debit: netAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '110801',
            accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)',
            description: `ضريبة مدخلات 15% - ${payload.referenceNumber}`,
            debit: vatAmount,
            credit: 0,
            costCenterCode: payload.costCenterCode,
          });
        }
        lines.push({
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          description: payload.description,
          debit: 0,
          credit: grossAmount,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'MUSANED_ESCROW_RELEASE': {
        // Releases 90-day Musaned Escrow (110301) to Bank (110201) after deducting 2.5% Musaned platform fee + 15% Input VAT on fee
        const escrowHalalas = toHalalas(rawAmount);
        const feeHalalas = Math.round(escrowHalalas * 0.025);
        const feeVatHalalas = Math.round(feeHalalas * 0.15);
        const netBankHalalas = escrowHalalas - feeHalalas - feeVatHalalas;
        const debitBankAcc = channelAccountMap[payload.paymentChannel || 'BANK'];

        lines.push({
          accountCode: debitBankAcc.code,
          accountName: debitBankAcc.name,
          description: `صافي تحرير محفظة مساند بعد انتهاء ضمان 90 يوماً - ${payload.referenceNumber}`,
          debit: netBankHalalas / 100,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '510401',
          accountName: 'عمولات بوابات الدفع الإلكتروني ورسوم منصة مساند ومدى',
          description: `عمولة بوابة مساند (2.5%) - ${payload.referenceNumber}`,
          debit: feeHalalas / 100,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '110801',
          accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)',
          description: `ضريبة مدخلات 15% على عمولة مساند - ${payload.referenceNumber}`,
          debit: feeVatHalalas / 100,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '110301',
          accountName: 'مستحقات عقود مساند المعلقة تحت التحصيل (فترة الضمان 90 يوماً)',
          description: payload.description,
          debit: 0,
          credit: escrowHalalas / 100,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'FOREIGN_AGENT_SETTLEMENT': {
        // Settles foreign agency payable (210101) in SAR (or USD * 3.75 peg) from Bank (110201)
        const settledSarHalalas =
          payload.usdAmount && payload.usdAmount > 0
            ? toHalalas(payload.usdAmount * 3.75)
            : grossHalalas;
        const settledSar = settledSarHalalas / 100;
        const creditAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        const usdNote =
          payload.usdAmount && payload.usdAmount > 0
            ? ` (تسوية ${payload.usdAmount.toLocaleString('en-US')} USD × 3.75 ⃁)`
            : '';

        lines.push({
          accountCode: '210101',
          accountName: 'ذمم الوكلاء الخارجيين ومكاتب إرسال العمالة الدوليين',
          description: `${payload.description}${usdNote}`,
          debit: settledSar,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          description: `${payload.description}${usdNote}`,
          debit: 0,
          credit: settledSar,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'COST_CENTER_EXPENSE': {
        const creditAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: '530201',
          accountName: 'إيجارات المقرات الإدارية والفروع ومجمعات إيواء العمالة ومصروفات مراكز التكلفة',
          description: payload.description,
          debit: netAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '110801',
            accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)',
            description: `ضريبة مدخلات 15% - ${payload.referenceNumber}`,
            debit: vatAmount,
            credit: 0,
            costCenterCode: payload.costCenterCode,
          });
        }
        lines.push({
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          description: payload.description,
          debit: 0,
          credit: grossAmount,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'FINANCIAL_REQUEST_APPROVAL': {
        const creditAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: '530401',
          accountName: 'مصروفات تشغيلية وإدارية وعمومية متنوعة (طلبات صرف معتمدة)',
          description: payload.description,
          debit: netAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '110801',
            accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (Input VAT 15%)',
            description: `ضريبة مدخلات 15% - ${payload.referenceNumber}`,
            debit: vatAmount,
            credit: 0,
            costCenterCode: payload.costCenterCode,
          });
        }
        lines.push({
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          description: payload.description,
          debit: 0,
          credit: grossAmount,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'EOSB_SETTLEMENT': {
        const creditAcc = channelAccountMap[payload.paymentChannel || 'BANK'];
        lines.push({
          accountCode: '220101',
          accountName: 'مخصص مكافأة نهاية الخدمة للموظفين والعمالة (IAS 19)',
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: creditAcc.code,
          accountName: creditAcc.name,
          description: payload.description,
          debit: 0,
          credit: grossAmount,
          costCenterCode: payload.costCenterCode,
        });
        break;
      }

      case 'ZATCA_INVOICE':
      default: {
        const debitAcc = channelAccountMap[payload.paymentChannel || 'RECEIVABLE'];
        lines.push({
          accountCode: debitAcc.code,
          accountName: debitAcc.name,
          description: payload.description,
          debit: grossAmount,
          credit: 0,
          costCenterCode: payload.costCenterCode,
        });
        lines.push({
          accountCode: '410101',
          accountName: 'إيرادات عقود الاستقدام الأفراد — منصة مساند (B2C)',
          description: payload.description,
          debit: 0,
          credit: netAmount,
          costCenterCode: payload.costCenterCode,
        });
        if (vatAmount > 0) {
          lines.push({
            accountCode: '210501',
            accountName: 'ضريبة القيمة المضافة للمخرجات المستحقة (Output VAT 15%)',
            description: `ضريبة القيمة المضافة 15% - ${payload.referenceNumber}`,
            debit: 0,
            credit: vatAmount,
            costCenterCode: payload.costCenterCode,
          });
        }
        break;
      }
    }

    const res = this.createJournalEntry(payload.companyId as CompanyId, {
      entryDate: payload.entryDate || new Date().toISOString().split('T')[0],
      entryType: 'AUTOMATIC',
      sourceModule: payload.transactionType,
      sourceReference: effectiveRefNumber,
      description: effectiveDescription,
      branchName: effectiveBranchName,
      costCenterCode: payload.costCenterCode,
      createdBy: payload.createdBy || 'محرك الترحيل المحاسبي الفوري',
      lines: lines.map((l) => ({
        ...l,
        description: l.description || effectiveDescription,
        costCenterName: effectiveBranchName,
      })),
      autoPost: true,
    });
    return {
      ...res,
      ...(res.entry || {}),
    };
  },
};

/**
 * Convenience functional wrappers used by paymentOrchestratorService and automated settlement hooks.
 */
export function createJournalEntry(
  entryDate: string,
  description: string,
  sourceReference: string,
  lines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    costCenterId?: string;
  }>,
  createdBy = 'SYSTEM'
): JournalEntry {
  const companyId = (lines[0]?.costCenterId as CompanyId) || 'SAF';
  const { entry, error } = journalEngine.createJournalEntry(companyId, {
    entryDate,
    entryType: 'AUTOMATIC',
    sourceModule: 'PAYMENT_ORCHESTRATOR',
    sourceReference,
    description,
    createdBy,
    lines: lines.map((l) => ({
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: l.debit,
      credit: l.credit,
      costCenterCode: l.costCenterId,
    })),
    autoPost: false,
  });

  if (error || !entry) {
    throw new Error(error || 'فشل إنشاء القيد المحاسبي');
  }
  return entry;
}

export function postJournalEntry(entry: JournalEntry, approvedBy = 'SYSTEM_AUTO_POST'): JournalEntry {
  const res = journalEngine.postJournalEntry(entry.companyId, entry.id, approvedBy);
  if (!res.success) {
    throw new Error(res.error || 'فشل ترحيل القيد المحاسبي');
  }
  return {
    ...entry,
    status: 'POSTED',
    approvedBy,
    postedAt: new Date().toISOString(),
  };
}

export function autoPostOperationalTransaction(payload: OperationalTransactionPayload) {
  return journalEngine.autoPostOperationalTransaction(payload);
}


