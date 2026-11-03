import { CompanyId } from '../../types';
import { normalizeCompanyId } from '../../contexts/CompanyContext';
import { domainEventBus } from '../domainEventBus';

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
  projectId?: string;
}

export interface JournalEntry {
  id: string;
  companyId: CompanyId;
  entryNumber: string; // e.g. SAF-JV-2026-0001
  entryDate: string;
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
  DAR: [],
};

const STORAGE_KEY = 'ALSULAIM_ERP_DB_V1_company_journal_entries';

function loadPersistedJournals(): Record<string, JournalEntry[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: JournalEntry[] = JSON.parse(raw);
      const map: Record<string, JournalEntry[]> = { SAF: [], YAQ: [], TOP: [], DAR: [] };
      parsed.forEach(j => {
        const c = j.companyId || 'SAF';
        if (!map[c]) map[c] = [];
        map[c].push(j);
      });
      return map;
    }
  } catch (e) {
    // fallback to initial
  }
  return INITIAL_JOURNALS_MAP;
}

function savePersistedJournals(map: Record<string, JournalEntry[]>) {
  try {
    const flat = Object.values(map).flat();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flat));
    window.dispatchEvent(new CustomEvent('alsulaim_erp_journals_updated', { detail: flat }));
  } catch (e) {
    console.error('Failed to persist journals', e);
  }
}

let CURRENT_MAP = loadPersistedJournals();

export const journalEngine = {
  /**
   * Get all journal entries for a company
   */
  getJournalsByCompany(companyId: CompanyId): JournalEntry[] {
    CURRENT_MAP = loadPersistedJournals();
    const norm = normalizeCompanyId(companyId);
    if (norm === 'all') {
      return Object.values(CURRENT_MAP).flat();
    }
    return CURRENT_MAP[norm] || [];
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
      entryType?: JournalEntryType;
      sourceModule?: string;
      sourceReference?: string;
      description: string;
      branchName?: string;
      costCenterCode?: string;
      projectId?: string;
      createdBy: string;
      lines: Omit<JournalLine, 'id'>[];
      autoPost?: boolean;
    }
  ): { entry: JournalEntry | null; error: string | null } {
    const norm = normalizeCompanyId(companyId);
    const targetCompany = norm === 'all' ? 'SAF' : norm;

    // Calculate totals
    const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    // Double Entry Golden Rule Validation
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
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
      entryDate: params.entryDate || new Date().toISOString().split('T')[0],
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
        id: `jl-${index}-${Date.now()}`,
      })),
    };

    if (!CURRENT_MAP[targetCompany]) {
      CURRENT_MAP[targetCompany] = [];
    }

    CURRENT_MAP[targetCompany].unshift(newEntry);
    savePersistedJournals(CURRENT_MAP);

    if (isPosted) {
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

    entry.status = 'POSTED';
    entry.approvedBy = approvedBy;
    entry.postedAt = new Date().toISOString();

    savePersistedJournals(CURRENT_MAP);

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

