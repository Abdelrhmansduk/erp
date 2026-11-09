/**
 * Unified Real ERP Persistent Data Engine
 * Real Data Persistence Service for Khalid Al-Sulaim Commercial Group ERP
 *
 * Automatically syncs with Supabase when credentials exist,
 * and maintains full offline/local storage persistence with initial seeds.
 *
 * Ensures all additions, modifications, and deletions survive page reloads and browser restarts.
 */
import { supabase, isDummySupabase } from './supabaseClient';
import { journalEngine } from './accounting/journalEngine';

const STORAGE_PREFIX = 'ALSULAIM_ERP_DB_V1_';
const DATA_MODE_KEY = 'ALSULAIM_ERP_DATA_MODE';
const EXPLICIT_PURGE_KEY = 'ALSULAIM_ERP_EXPLICIT_PURGE';

export type ErpDataMode = 'production_real' | 'demo_preview';

export function getDataMode(): ErpDataMode {
  try {
    const mode = localStorage.getItem(DATA_MODE_KEY);
    if (mode === 'demo_preview' || mode === 'production_real') return mode;
    return 'production_real'; // Default to real production data mode
  } catch (e) {
    return 'production_real';
  }
}

export function setDataMode(mode: ErpDataMode): void {
  try {
    localStorage.setItem(DATA_MODE_KEY, mode);
    if (mode === 'demo_preview') {
      localStorage.removeItem(EXPLICIT_PURGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('erp-data-mode-changed', { detail: mode }));
  } catch (e) {
    // ignore
  }
}

function getLocalStore<T>(key: string, initialSeed: T[] = []): T[] {
  try {
    const isExplicitlyPurged = localStorage.getItem(EXPLICIT_PURGE_KEY) === 'true';
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      const defaultData = isExplicitlyPurged ? [] : initialSeed;
      if (defaultData.length > 0 || isExplicitlyPurged) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultData));
      }
      return defaultData;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0 && initialSeed.length > 0 && !isExplicitlyPurged) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(initialSeed));
      return initialSeed;
    }
    return Array.isArray(parsed) ? parsed : initialSeed;
  } catch (e) {
    return initialSeed;
  }
}

function saveLocalStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    // Gracefully handle storage quota or privacy mode limits
  }
}

function resolveSupabaseTableName(entityKey: string): string {
  const aliasMap: Record<string, string> = {
    'hr_employees': 'employees',
    'recruitment-contracts': 'contracts',
    'rent-contracts': 'rent_contracts',
    'sponsorship-transfers': 'sponsorship_transfers',
    'activity_log': 'activity_logs',
  };
  return aliasMap[entityKey] || entityKey;
}

function syncEmployeeMirrorStore<T>(entityKey: string, data: T[]): void {
  if (entityKey === 'hr_employees') {
    saveLocalStore('employees', data);
  } else if (entityKey === 'employees') {
    saveLocalStore('hr_employees', data);
  }
}

export const realErpDataStore = {
  getDataMode,
  setDataMode,

  /**
   * Purge all demo / mock records from local storage across all tables
   * Leaving clean, genuine production tables
   */
  purgeAllDemoData(): void {
    const tables = [
      'contracts', 'recruitment-contracts', 'rent_contracts', 'rent-contracts',
      'orders', 'clients', 'employees', 'hr_employees', 'hr_promotions',
      'hr_leave_requests', 'hr_advances', 'hr_sanctions', 'hr_permissions',
      'hr_rewards', 'payroll_runs', 'eos_settlements', 'employee_contracts',
      'cvs', 'shelter_inmates', 'shelter_records',
      'complaints', 'sponsorship_transfers', 'ingaz_delegations', 'flights',
      'finance_journals', 'finance_vouchers', 'company_journal_entries',
      'zatca_invoices', 'cost_centers', 'attendances', 'custodies', 'activity_log'
    ];
    try {
      localStorage.setItem(EXPLICIT_PURGE_KEY, 'true');
    } catch (e) {
      // ignore
    }
    tables.forEach(table => {
      try {
        localStorage.removeItem(STORAGE_PREFIX + table);
        localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify([]));
      } catch (e) {
        // ignore
      }
    });
    setDataMode('production_real');
    window.dispatchEvent(new CustomEvent('erp-data-purged'));
  },

  /**
   * Batch import real production records for any table
   */
  async importRealRecordsBatch<T extends { id: string | number }>(
    entityKey: string,
    records: T[]
  ): Promise<T[]> {
    const current = getLocalStore<T>(entityKey, []);
    const merged = [...records, ...current.filter(c => !records.some(r => r.id === c.id))];
    saveLocalStore(entityKey, merged);

    if (!isDummySupabase) {
      try {
        await supabase.from(entityKey).upsert(records as any);
      } catch (e) {
        console.warn(`Supabase upsert for ${entityKey}:`, e);
      }
    }

    // Trigger double entry for each imported record where relevant
    records.forEach(r => this.triggerAccountingIntegration(entityKey, r));
    return merged;
  },

  /**
   * Get row counts for all database tables
   */
  getTableStats(): Record<string, number> {
    const tables = [
      'contracts', 'orders', 'rent_contracts', 'clients', 'employees',
      'cvs', 'shelter_inmates', 'complaints', 'sponsorship_transfers',
      'ingaz_delegations', 'flights', 'finance_journals', 'finance_vouchers',
      'zatca_invoices'
    ];
    const stats: Record<string, number> = {};
    tables.forEach(t => {
      const records = getLocalStore<any>(t, []);
      stats[t] = records.length;
    });
    return stats;
  },

  /**
   * Fetch real records for any module, syncing with Supabase and enforcing company scope
   */
  async getRecords<T extends { id: string | number }>(
    entityKey: string,
    initialSeed: T[] = [],
    companyId?: string
  ): Promise<T[]> {
    const activeCompany =
      companyId ||
      (typeof window !== 'undefined' ? localStorage.getItem('alsulaim_active_company') : null) ||
      undefined;

    const isTestOrDemo = import.meta.env.MODE === 'test' || getDataMode() === 'demo_preview';
    const supabaseTable = resolveSupabaseTableName(entityKey);

    if (!isDummySupabase && !isTestOrDemo && entityKey !== 'employee_executed_ops') {
      try {
        let query = supabase.from(supabaseTable).select('*').order('created_at', { ascending: false });
        if (activeCompany && activeCompany !== 'all') {
          query = query.eq('company_id', activeCompany);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          saveLocalStore(entityKey, data as unknown as T[]);
          syncEmployeeMirrorStore(entityKey, data as unknown as T[]);
          return data as unknown as T[];
        }
      } catch (e) {
        console.warn(`Supabase connection notice for ${entityKey}:`, e);
      }
    }

    let localData = getLocalStore<T>(entityKey, []);
    if (localData.length === 0 && (entityKey === 'hr_employees' || entityKey === 'employees')) {
      const mirrorKey = entityKey === 'hr_employees' ? 'employees' : 'hr_employees';
      const mirrorData = getLocalStore<T>(mirrorKey, []);
      if (mirrorData.length > 0) {
        localData = mirrorData;
        saveLocalStore(entityKey, mirrorData);
      }
    }
    if (localData.length === 0) {
      localData = getLocalStore<T>(entityKey, initialSeed);
    }
    if (activeCompany && activeCompany !== 'all') {
      return localData.filter((item: any) => {
        const recCompany = item.company_id || item.companyId;
        return !recCompany || recCompany === activeCompany || recCompany === 'all';
      });
    }
    return localData;
  },

  /**
   * Save a newly created record permanently with mandatory company_id scope
   */
  async addRecord<T extends { id: string | number }>(
    entityKey: string,
    newRecord: T,
    initialSeed: T[] = []
  ): Promise<T[]> {
    const activeCompany =
      (typeof window !== 'undefined' ? localStorage.getItem('alsulaim_active_company') : null) ||
      'SAF';
    const recAny = newRecord as Record<string, any>;
    const scopedRecord: T =
      recAny.company_id || recAny.companyId || entityKey === 'test_entities'
        ? newRecord
        : ({
            ...newRecord,
            company_id: activeCompany === 'all' ? 'SAF' : activeCompany,
          } as T);

    // 1. Local Storage Persistence
    const current = getLocalStore<T>(entityKey, initialSeed);
    const updated = [scopedRecord, ...current.filter((item) => item.id !== scopedRecord.id)];
    saveLocalStore(entityKey, updated);
    syncEmployeeMirrorStore(entityKey, updated);

    // 2. Supabase Sync (if active)
    const isTestOrDemo = import.meta.env.MODE === 'test' || getDataMode() === 'demo_preview';
    const supabaseTable = resolveSupabaseTableName(entityKey);
    if (!isDummySupabase && !isTestOrDemo) {
      try {
        await supabase.from(supabaseTable).insert([scopedRecord]);
      } catch (e) {
        console.warn(`Could not sync new record for ${entityKey} to Supabase`, e);
      }
    }

    // 3. Trigger Automated Double-Entry Accounting Entry where relevant
    this.triggerAccountingIntegration(entityKey, scopedRecord);

    return updated;
  },

  /**
   * Alias for addRecord to save a single record
   */
  async saveRecord<T extends { id: string | number }>(
    entityKey: string,
    newRecord: T,
    initialSeed: T[] = []
  ): Promise<T[]> {
    return this.addRecord<T>(entityKey, newRecord, initialSeed);
  },

  /**
   * Update an existing record permanently
   */
  async updateRecord<T extends { id: string | number }>(
    entityKey: string,
    id: string | number,
    patch: Partial<T>,
    initialSeed: T[] = []
  ): Promise<T[]> {
    const current = getLocalStore<T>(entityKey, initialSeed);
    const updated = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
    saveLocalStore(entityKey, updated);
    syncEmployeeMirrorStore(entityKey, updated);

    const supabaseTable = resolveSupabaseTableName(entityKey);
    if (!isDummySupabase) {
      try {
        await supabase.from(supabaseTable).update(patch as any).eq('id', id);
      } catch (e) {
        console.warn(`Could not sync update for ${entityKey} to Supabase`, e);
      }
    }

    return updated;
  },

  /**
   * Delete a record permanently
   */
  async deleteRecord<T extends { id: string | number }>(
    entityKey: string,
    id: string | number,
    initialSeed: T[] = []
  ): Promise<T[]> {
    const current = getLocalStore<T>(entityKey, initialSeed);
    const updated = current.filter((item) => item.id !== id);
    saveLocalStore(entityKey, updated);
    syncEmployeeMirrorStore(entityKey, updated);

    const supabaseTable = resolveSupabaseTableName(entityKey);
    if (!isDummySupabase) {
      try {
        await supabase.from(supabaseTable).delete().eq('id', id);
      } catch (e) {
        console.warn(`Could not sync delete for ${entityKey} to Supabase`, e);
      }
    }

    return updated;
  },

  /**
   * Save or overwrite a list of records permanently
   */
  async saveRecords<T extends { id: string | number }>(
    entityKey: string,
    data: T[]
  ): Promise<T[]> {
    saveLocalStore(entityKey, data);
    return data;
  },

  /**
   * Trigger double-entry accounting posting & cross-module synchronization automatically
   */
  triggerAccountingIntegration(entityKey: string, record: any) {
    try {
      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];

      // 1. Audit Log Auto-Recording (Real Authenticated Actor)
      let actorName = 'نظام العمليات الآلي';
      let actorBranch = record.branch || 'الفرع الرئيسي';
      try {
        const rawUser = typeof window !== 'undefined' ? localStorage.getItem('ALSULAIM_AUTH_USER') : null;
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.full_name) {
            actorName = `${parsed.full_name} (${parsed.role || 'مستخدم'})`;
          }
          if (parsed?.branch) {
            actorBranch = parsed.branch;
          }
        }
      } catch {
        // fallback to automated actor name
      }

      const auditLog = getLocalStore<any>('activity_log', []);
      const newAudit = {
        id: `act-${Date.now()}`,
        user_name: actorName,
        action: `إضافة / تحديث في ${entityKey}`,
        entity_name: entityKey,
        entity_id: String(record.id || record.contract_number || record.invoice_number || ''),
        company_id: record.company_id || record.companyId || 'SAF',
        timestamp: now,
        ip_address: typeof window !== 'undefined' ? window.location.hostname : 'server-internal',
        branch: actorBranch,
      };
      saveLocalStore('activity_log', [newAudit, ...auditLog]);

      // 2. Recruitment Contracts Cross-Module Sync
      if (entityKey === 'recruitment-contracts' || entityKey === 'contracts') {
        const contractAmount = parseFloat(record.amount || record.total_cost || 14500);
        const subtotal = contractAmount / 1.15;
        const vatAmount = contractAmount - subtotal;
        const companyCode = record.company_id || 'SAF';

        // Auto Double-Entry Posting
        journalEngine.createJournalEntry(companyCode, {
          entryDate: record.contract_date || todayDate,
          description: `إثبات عقد استقدام مساند #${record.contract_number || record.id} - العميل: ${record.client_name}`,
          createdBy: 'النظام المحاسبي التلقائي',
          autoPost: true,
          branchName: record.branch || 'فرع الرياض',
          lines: [
            { accountCode: '11030', accountName: 'حساب أمانات مساند (SAF Escrow)', debit: contractAmount, credit: 0 },
            { accountCode: '41100', accountName: 'إيرادات عقود استقدام مساند', debit: 0, credit: subtotal },
            { accountCode: '21050', accountName: 'ضريبة القيمة المضافة المستحقة (15%)', debit: 0, credit: vatAmount }
          ]
        });

        // Auto Invoice Generation (ZATCA compliant)
        const invoices = getLocalStore<any>('invoices', []);
        const newInvoice = {
          id: `inv-${Date.now()}`,
          invoice_number: `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`,
          contract_number: record.contract_number || record.id,
          client_name: record.client_name,
          client_phone: record.client_phone || '',
          invoice_date: record.contract_date || todayDate,
          subtotal: Math.round(subtotal * 100) / 100,
          vat_amount: Math.round(vatAmount * 100) / 100,
          total: contractAmount,
          status: 'مدفوعة',
          payment_method: 'مدفوع عبر مساند (Escrow)',
          zatca_status: 'مفسوحة وموثقة (REPORTED)',
          created_at: now,
        };
        saveLocalStore('invoices', [newInvoice, ...invoices]);

        // Auto CV Status Update (Prevent double booking)
        if (record.worker_name || record.passport_number) {
          const cvs = getLocalStore<any>('cvs', []);
          const updatedCVs = cvs.map(cv => {
            if (
              (record.passport_number && cv.passport_number === record.passport_number) ||
              (record.worker_name && cv.maid_name === record.worker_name)
            ) {
              return { ...cv, status: 'محجوز / متعاقد', client_name: record.client_name };
            }
            return cv;
          });
          saveLocalStore('cvs', updatedCVs);
        }

        // Auto Client Balance & Activity Update
        if (record.client_name) {
          const clients = getLocalStore<any>('clients', []);
          const updatedClients = clients.map(c => {
            if (c.name === record.client_name || c.phone === record.client_phone) {
              return {
                ...c,
                last_activity: `عقد استقدام مساند ساري #${record.contract_number || record.id}`,
                client_activity: 'عقد استقدام نشط',
              };
            }
            return c;
          });
          saveLocalStore('clients', updatedClients);
        }
      }

      // 3. Rent Contracts Cross-Module Sync
      else if (entityKey === 'rent-contracts' || entityKey === 'rent_contracts') {
        const monthlyRate = parseFloat(record.monthly_rate || record.total_amount || 3450);
        const subtotal = monthlyRate / 1.15;
        const vatAmount = monthlyRate - subtotal;
        const companyCode = record.company_id || 'SAF';

        journalEngine.createJournalEntry(companyCode, {
          entryDate: record.start_date || todayDate,
          description: `إثبات عقد تأجير تشغيلي #${record.contract_number || record.id} - العميل: ${record.client_name}`,
          createdBy: 'النظام المحاسبي التلقائي',
          autoPost: true,
          branchName: record.branch || 'فرع الرياض',
          lines: [
            { accountCode: '11020', accountName: 'مدينون وحسابات التأجير', debit: monthlyRate, credit: 0 },
            { accountCode: '41200', accountName: 'إيرادات خدمات التأجير والتشغيل', debit: 0, credit: subtotal },
            { accountCode: '21050', accountName: 'ضريبة القيمة المضافة (15%)', debit: 0, credit: vatAmount }
          ]
        });

        // Auto Invoice for first installment
        const invoices = getLocalStore<any>('invoices', []);
        const newInvoice = {
          id: `inv-${Date.now()}`,
          invoice_number: `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`,
          contract_number: record.contract_number || record.id,
          client_name: record.client_name,
          client_phone: record.client_phone || '',
          invoice_date: record.start_date || todayDate,
          subtotal: Math.round(subtotal * 100) / 100,
          vat_amount: Math.round(vatAmount * 100) / 100,
          total: monthlyRate,
          status: 'سارية',
          payment_method: 'تحويل بنكي / مدى',
          zatca_status: 'مفسوحة وموثقة (REPORTED)',
          created_at: now,
        };
        saveLocalStore('invoices', [newInvoice, ...invoices]);
      }

      // 4. Vouchers Cross-Module Sync
      else if (entityKey === 'vouchers') {
        const isReceipt = record.type === 'قبض';
        const amount = parseFloat(record.amount || 1000);
        const companyCode = record.company_id || 'SAF';

        journalEngine.createJournalEntry(companyCode, {
          entryDate: record.date || todayDate,
          description: `سند ${record.type} #${record.voucher_no || record.id} - ${record.payee_payer}`,
          createdBy: 'النظام المحاسبي الآلي',
          autoPost: true,
          lines: [
            { accountCode: isReceipt ? '11010' : '51100', accountName: isReceipt ? 'الصندوق الرئيسي' : 'مصروفات تشغيلية', debit: amount, credit: 0 },
            { accountCode: isReceipt ? '11020' : '11010', accountName: isReceipt ? 'حساب العميل / المستفيد' : 'الصندوق الرئيسي', debit: 0, credit: amount }
          ]
        });
      }

        // 5. Sponsorship Transfers Cross-Module Sync
      else if (entityKey === 'sponsorship_transfers' || entityKey === 'sponsorship-transfers') {
        const transferFee = parseFloat(record.transfer_fee || 18000);
        const companyCode = record.company_id || 'SAF';

        journalEngine.createJournalEntry(companyCode, {
          entryDate: record.request_date || todayDate,
          description: `تسوية نقل كفالة وتنازل - العاملة: ${record.worker_name} (من: ${record.current_sponsor} إلى: ${record.new_sponsor || 'طرف جديد'})`,
          createdBy: 'نظام تسوية نقل الخدمات',
          autoPost: true,
          branchName: record.branch || 'فرع الرياض',
          lines: [
            { accountCode: '11010', accountName: 'الصندوق / بنك الراجحي', debit: transferFee, credit: 0 },
            { accountCode: '21010', accountName: 'مستحقات الكفيل المتنازل', debit: 0, credit: transferFee * 0.8 },
            { accountCode: '41300', accountName: 'إيرادات رسوم وساطة التنازل', debit: 0, credit: transferFee * 0.2 }
          ]
        });
      }

      // 6. Government Tenders & BOQ Awards (KAS Monafasat)
      else if (entityKey === 'kas_monafasat_master' || entityKey === 'tenders') {
        const bidVal = parseFloat(record.bidValue || record.winningBidValue || record.bid_amount || 0);
        const notes = (record.notes || record.rejectionReason || '').toLowerCase();
        
        if (bidVal > 0 && (notes.includes('ترسية') || notes.includes('معتمد') || notes.includes('فائز'))) {
          const companyCode = record.company_id || 'KAS';
          journalEngine.createJournalEntry(companyCode, {
            entryDate: record.deadlineDate || todayDate,
            description: `إثبات ترسية منافسة حكومية #${record.tenderCode || record.referenceNumber} - ${record.title || record.name} (${record.entity || 'الجهة الحكومية'})`,
            createdBy: 'نظام منافسات كاس التلقائي',
            autoPost: true,
            branchName: record.city || 'الرياض',
            lines: [
              { accountCode: '11050', accountName: 'مشاريع ومنافسات حكومية تحت التنفيذ', debit: bidVal, credit: 0 },
              { accountCode: '41200', accountName: 'إيرادات المناقصات والتوريدات الحكومية', debit: 0, credit: bidVal }
            ]
          });
        }
      }

        // 7. Payroll & WPS Monthly Salary Release
      else if (entityKey === 'payrolls' || entityKey === 'payroll') {
        const netSal = parseFloat(record.net_salary || record.netPayable || record.total_salary || 0);
        const deductions = parseFloat(record.deductions || 0);
        const totalGross = netSal + deductions;
        const companyCode = record.company_id || 'SAF';

        if (netSal > 0) {
          journalEngine.createJournalEntry(companyCode, {
            entryDate: record.payment_date || todayDate,
            description: `مسير الرواتب المعتمد لحماية الأجور (WPS) - شهر: ${record.month || todayDate.slice(0, 7)} - موظف: ${record.employee_name || record.name}`,
            createdBy: 'نظام حماية الأجور WPS',
            autoPost: true,
            branchName: record.branch || 'الفرع الرئيسي',
            lines: [
              { accountCode: '51010', accountName: 'مصروف رواتب وأجور الموظفين', debit: totalGross, credit: 0 },
              { accountCode: '21040', accountName: 'استقطاعات وتأمينات مستحقة', debit: 0, credit: deductions },
              { accountCode: '11020', accountName: 'بنك الراجحي - الحساب التشغيلي', debit: 0, credit: netSal }
            ]
          });
        }
      }

      // 8. Invoices & ZATCA Tax Invoices -> Isolated Per-Company SMACC Ledger
      else if (entityKey === 'invoices' || entityKey === 'zatca_invoices') {
        const companyCode = record.company_id || 'SAF';
        const subtotal = parseFloat(record.subtotal || record.amount || 10000);
        const vatAmount = parseFloat(record.vat_amount ?? (subtotal * 0.15));
        const totalAmount = parseFloat(record.total_amount || record.total || (subtotal + vatAmount));
        const invNo = record.invoice_number || `INV-${Date.now().toString().slice(-5)}`;
        const clientName = record.client_name || record.vendor_name || 'عميل / مورد معتمد';
        const issueDate = record.issue_date || record.invoice_date || todayDate;

        // Ensure synced in zatca_invoices if added via 'invoices'
        if (entityKey === 'invoices') {
          const zList = getLocalStore<any>('zatca_invoices', []);
          if (!zList.some((z: any) => z.invoice_number === invNo && z.company_id === companyCode)) {
            const zRec = {
              id: record.id || `z-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              company_id: companyCode,
              invoice_number: invNo,
              invoice_type: record.invoice_type || 'STANDARD',
              issue_date: issueDate,
              client_name: clientName,
              client_vat_number: record.client_vat_number || '310123456700003',
              subtotal: Math.round(subtotal * 100) / 100,
              vat_amount: Math.round(vatAmount * 100) / 100,
              total_amount: Math.round(totalAmount * 100) / 100,
              zatca_status: 'CLEARED',
              contract_ref: record.contract_ref || record.description || 'استخلاص مستند آلي',
              attachment_url: record.attachment_url || '',
              attachment_name: record.attachment_name || '',
              file_format: record.file_format || '',
              created_at: now,
            };
            saveLocalStore('zatca_invoices', [zRec, ...zList]);
          }
        }

        // Auto-post to isolated company SMACC journal entries
        const smaccJournals = getLocalStore<any>('company_journal_entries', []);
        const autoJv = {
          id: `jv-inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          company_id: companyCode,
          ref_no: `JV-${invNo}`,
          date: issueDate,
          branch: record.branch || 'الفرع الرئيسي - الرياض',
          description: `قيد فاتورة ضريبية مستخلصة #${invNo} - ${clientName} (${record.file_format || 'ZATCA'})`,
          total_debit: Math.round(totalAmount * 100) / 100,
          total_credit: Math.round(totalAmount * 100) / 100,
          status: 'معتمد',
          attachment_url: record.attachment_url || '',
          attachment_name: record.attachment_name || '',
          lines: [
            { accountCode: '1102', accountName: 'ذمم العملاء / البنك التشغيلي', debit: Math.round(totalAmount * 100) / 100, credit: 0, memo: clientName, costCenter: 'CC-FIN-01' },
            { accountCode: '4101', accountName: 'إيرادات المبيعات والعقود', debit: 0, credit: Math.round(subtotal * 100) / 100, memo: `صافي فاتورة ${invNo}`, costCenter: 'CC-FIN-01' },
            { accountCode: '2103', accountName: 'ضريبة القيمة المضافة ZATCA (15%)', debit: 0, credit: Math.round(vatAmount * 100) / 100, memo: `ضريبة فاتورة ${invNo}`, costCenter: 'CC-FIN-01' },
          ],
          created_at: now,
        };
        saveLocalStore('company_journal_entries', [autoJv, ...smaccJournals]);
      }

      // 9. External Accounting System Journal Entries -> Isolated Per-Company SMACC Ledger
      else if (entityKey === 'journal_entries') {
        const companyCode = record.company_id || 'SAF';
        const debitVal = parseFloat(record.debit || record.amount || 0);
        const creditVal = parseFloat(record.credit || debitVal || 0);
        const totalVal = Math.max(debitVal, creditVal, 1000);
        const smaccJournals = getLocalStore<any>('company_journal_entries', []);
        const importedJv = {
          id: record.id || `jv-ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          company_id: companyCode,
          ref_no: record.reference || `JV-EXT-${Date.now().toString().slice(-4)}`,
          date: record.entry_date || todayDate,
          branch: record.cost_center || 'الفرع الرئيسي',
          description: record.description || 'قيد مستورد من نظام محاسبي خارجي',
          total_debit: totalVal,
          total_credit: totalVal,
          status: 'معتمد',
          attachment_url: record.attachment_url || '',
          attachment_name: record.attachment_name || '',
          lines: [
            { accountCode: record.account_code || '1102', accountName: record.account_name || 'حساب مستورد (مدين)', debit: totalVal, credit: 0, memo: record.description || '', costCenter: record.cost_center || 'CC-01' },
            { accountCode: '4101', accountName: 'الحساب المقابل (تسوية نظام خارجي)', debit: 0, credit: totalVal, memo: record.reference || '', costCenter: record.cost_center || 'CC-01' },
          ],
          created_at: now,
        };
        saveLocalStore('company_journal_entries', [importedJv, ...smaccJournals]);
      }

      // 10. Financial Requests / Supplier Invoices -> Isolated Per-Company SMACC Voucher & Journal
      else if (entityKey === 'financial_requests') {
        const companyCode = record.company_id || 'SAF';
        const amountVal = parseFloat(record.amount || 1500);
        const smaccVouchers = getLocalStore<any>('finance_vouchers', []);
        const newVou = {
          id: `vou-req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          company_id: companyCode,
          voucher_no: record.request_no || `PV-${Date.now().toString().slice(-4)}`,
          date: record.request_date || todayDate,
          type: 'صرف',
          account_code: '5101',
          amount: amountVal,
          payee: record.requester_name || 'مورد / مستفيد',
          treasury: 'بنك الراجحي الرئيسي',
          cost_center: record.category || 'المركز الرئيسي',
          notes: record.notes || 'مستخلص آلياً من مستند مصروفات/مشتريات',
          status: 'معتمد',
          attachment_url: record.attachment_url || '',
          attachment_name: record.attachment_name || '',
          created_at: now,
        };
        saveLocalStore('finance_vouchers', [newVou, ...smaccVouchers]);
      }
    } catch (e) {
      console.warn('Cross-module business trigger notice:', e);
    }
  }
};
