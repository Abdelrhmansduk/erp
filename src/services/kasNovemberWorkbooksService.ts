/**
 * KAS November Workbooks, Establishments & Modification Audit/Rollback Service
 * Manages:
 * 1. The 4 KAS XLSM workbooks (شهر 11 نسخة 1..4 — 241 real BOQ sheets) & المؤسسات table
 * 2. Real-time bi-directional cross-section synchronization (`subscribe`, `BroadcastChannel`, DOM events)
 * 3. Persistent Modification Audit Log (`سجل التعديلات ومن قام بها`) with:
 *    - Actor tracking (Name, Email, Role, Source Section, Timestamp, Action Type, Before/After Snapshots)
 *    - Per-entry Rollback (`التراجع عن التعديل / الإرجاع`)
 *    - Undo Rollback (`زر التراجع عن الإرجاع / استعادة الإجراء`)
 */

import seedPayload from '../data/kasNovemberSeedData.json';
import { BOQItem, KasEstablishmentRow, KasWorkbookMeta, TenderRecord } from '../types/tenders';
import { erpIndexedStorage } from './storage/erpIndexedStorage';
import { tafqeet } from './tafqeetService';

const STORAGE_KEY_TENDERS = 'kas_november_boq_tenders_v2';
const STORAGE_KEY_ESTABLISHMENTS = 'kas_november_establishments_v2';
const STORAGE_KEY_SELECTED_TENDER_ID = 'kas_november_selected_tender_id_v2';
const STORAGE_KEY_MODIFICATION_LOGS = 'kas_november_modification_logs_v2';

export const KAS_WORKBOOKS_SYNC_EVENT = 'kas-workbooks-state-synced';
export const KAS_ESTABLISHMENTS_UPDATED_EVENT = 'kas-establishments-updated';

export const KAS_DEFAULT_ESTABLISHMENT_NAMES: string[] = [
  'مؤسسة بنايات ذكية للمقاولات',
  'شركة الاميال للسفر و السياحة',
  'مؤسسة خالد عبدالعزيز السليم للتجارة',
  'شركة كاس ميديا للدعاية والاعلان',
  'شركة كاس تك للاتصالات و تقنية المعلومات',
  'مؤسسة كاس لتنظيم المعارض والمؤتمرات',
  'وكالة الاميال للسفر و السياحة',
  'مؤسسة أحلى العطلات لتنظيم الرحلات',
  'وكالة خالد عبدالعزيز السليم للدعاية والاعلان',
  'مؤسسة اللمسة الخارقة للاتصالات و تقنية المعلومات',
];

export interface KasWorkbookSystemSnapshot {
  actionLabel: string;
  timestamp: string;
  establishments: KasEstablishmentRow[];
  tenders: TenderRecord[];
  selectedTenderId: string;
}

export type KasModificationActionType =
  | 'add'
  | 'edit'
  | 'delete'
  | 'duplicate'
  | 'import'
  | 'reset'
  | 'revert'
  | 'undo_revert';

export interface KasModificationSnapshot {
  establishments: KasEstablishmentRow[];
  tenders: TenderRecord[];
  selectedTenderId: string;
}

export interface KasModificationLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  sourceSection: string;
  actionType: KasModificationActionType;
  targetLabel: string;
  actionSummary: string;
  beforeSnapshot: KasModificationSnapshot;
  afterSnapshot: KasModificationSnapshot;
  reverted: boolean;
  revertedAt?: string;
  revertedBy?: string;
}

export interface KasWorkbooksSyncPayload {
  establishments: KasEstablishmentRow[];
  tenders: TenderRecord[];
  workbooks: KasWorkbookMeta[];
  modificationLogs: KasModificationLogEntry[];
  selectedTenderId?: string;
  source?: string;
  actionLabel?: string;
  timestamp: string;
}

export type KasWorkbooksSyncListener = (payload: KasWorkbooksSyncPayload) => void;

function resolveActiveKasActor(): {
  actorName: string;
  actorEmail: string;
  actorRole: string;
} {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw =
        localStorage.getItem('ALSULAIM_AUTH_USER_V1') ||
        localStorage.getItem('erp_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.full_name || parsed.email)) {
          return {
            actorName: String(parsed.full_name || parsed.name || 'موظف كاس المعتمد'),
            actorEmail: String(parsed.email || 'a.albashir.trade@kas.sa'),
            actorRole: String(
              parsed.role || 'مسؤول المنافسات — شركة كاس للتجارة والمنافسات'
            ),
          };
        }
      }
    }
  } catch {
    // ignore storage read error
  }
  return {
    actorName: 'احمد جمال احمد البشير',
    actorEmail: 'a.albashir.trade@kas.sa',
    actorRole: 'مسؤول المنافسات — شركة كاس للتجارة والمنافسات',
  };
}

function cloneSnapshot(
  establishments: KasEstablishmentRow[],
  tenders: TenderRecord[],
  selectedTenderId: string
): KasModificationSnapshot {
  return {
    establishments: establishments.map((e) => ({
      ...e,
      aliases: [...(e.aliases || [])],
    })),
    // Keep up to 45 tenders in per-entry snapshot for fast memory/storage footprint
    tenders: tenders.slice(0, 45).map((t) => ({
      ...t,
      items: (t.items || []).map((it) => ({ ...it })),
    })),
    selectedTenderId,
  };
}

export function normalizeTenderRecord(raw: any, fallbackIdx = 0): TenderRecord {
  const rawItems: any[] = Array.isArray(raw.items) ? raw.items : [];
  const items: BOQItem[] = rawItems.map((it, i) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const totalPrice = Number((qty * price).toFixed(2));
    const vat = Number((totalPrice * 0.15).toFixed(2));
    const totalWithVat = Number((totalPrice + vat).toFixed(2));
    return {
      id: it.id || `kas-item-${raw.id || fallbackIdx}-${i + 1}`,
      itemNumber: i + 1,
      description: String(it.description || `بند رقم ${i + 1}`).trim(),
      unit: String(it.unit || 'عدد').trim(),
      quantity: qty,
      unitPrice: price,
      unitPriceInWords:
        it.unitPriceInWords && it.unitPriceInWords !== 'صفر'
          ? String(it.unitPriceInWords)
          : price > 0
            ? tafqeet(price)
            : 'صفر',
      totalPrice,
      totalPriceInWords:
        it.totalPriceInWords && it.totalPriceInWords !== 'صفر'
          ? String(it.totalPriceInWords)
          : totalPrice > 0
            ? tafqeet(totalPrice)
            : 'صفر',
      vat,
      totalWithVat,
      totalWithVatInWords:
        it.totalWithVatInWords && it.totalWithVatInWords !== 'صفر'
          ? String(it.totalWithVatInWords)
          : totalWithVat > 0
            ? tafqeet(totalWithVat)
            : 'صفر',
    };
  });

  const subtotal = Number(items.reduce((s, it) => s + it.totalPrice, 0).toFixed(2));
  const vatAmount = Number((subtotal * 0.15).toFixed(2));
  const grandTotal = Number((subtotal + vatAmount).toFixed(2));
  const entityName = String(raw.entityName || 'مؤسسة خالد عبدالعزيز السليم للتجارة').trim();

  let category = raw.category || 'توريدات حكومية وتجهيزات';
  if (entityName.includes('معارض')) category = 'معارض ومؤتمرات';
  else if (entityName.includes('دعاية') || entityName.includes('ميديا'))
    category = 'دعاية وإعلان وتنظيم معارض';
  else if (entityName.includes('تقنية') || entityName.includes('اللمسة'))
    category = 'تقنية معلومات واتصالات';
  else if (entityName.includes('بنايات') || entityName.includes('مقاولات'))
    category = 'أعمال مدنية وإنشائية';

  return {
    id: String(raw.id || `KAS-NOV11-${fallbackIdx + 1}`),
    workbookId: raw.workbookId || 'nov11_v1',
    workbookLabel: raw.workbookLabel || 'شهر 11 — نسخة 1',
    sourceFileName: raw.sourceFileName || 'شهر11 نسخة 1.xlsm',
    sheetName: raw.sheetName || `الجدول (${fallbackIdx + 1})`,
    referenceNumber: String(
      raw.referenceNumber || `25113900${String(fallbackIdx + 1).padStart(4, '0')}`
    ),
    title: String(raw.title || `منافسة ${fallbackIdx + 1}`).trim(),
    entityName,
    clientName: String(raw.clientName || 'منصة اعتماد الحكومية — المنافسات والمشتريات').trim(),
    category,
    status: raw.status || 'مقدمة ومسعرة',
    submissionDate: raw.submissionDate || '2026-11-16',
    deadlineDate: raw.deadlineDate || raw.submissionDate || '2026-11-16',
    estimatedBudget: raw.estimatedBudget ? Number(raw.estimatedBudget) : undefined,
    supplyDuration: String(
      raw.supplyDuration || 'خلال 15 يوم من تاريخ استلام التعميد'
    ).trim(),
    validityDuration: String(raw.validityDuration || '180 يوم').trim(),
    commitmentDays: Number(raw.commitmentDays) || 180,
    itemsCount: items.length,
    subtotal,
    subtotalInWords:
      raw.subtotalInWords && raw.subtotalInWords !== 'صفر'
        ? String(raw.subtotalInWords)
        : subtotal > 0
          ? tafqeet(subtotal)
          : 'صفر',
    vatAmount,
    vatInWords:
      raw.vatInWords && raw.vatInWords !== 'صفر'
        ? String(raw.vatInWords)
        : vatAmount > 0
          ? tafqeet(vatAmount)
          : 'صفر',
    grandTotal,
    grandTotalInWords:
      raw.grandTotalInWords && raw.grandTotalInWords !== 'صفر'
        ? String(raw.grandTotalInWords)
        : grandTotal > 0
          ? tafqeet(grandTotal)
          : 'صفر',
    items,
  };
}

class KasNovemberWorkbooksService {
  private workbooks: KasWorkbookMeta[] = (seedPayload.workbooks || []) as KasWorkbookMeta[];
  private establishments: KasEstablishmentRow[] = [];
  private tenders: TenderRecord[] = [];
  private modificationLogs: KasModificationLogEntry[] = [];
  private selectedTenderId = '';
  private fullLoaded = false;
  private loadingPromise: Promise<void> | null = null;
  private listeners = new Set<KasWorkbooksSyncListener>();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.initSync();
    this.initCrossTabSync();
  }

  private recomputeEstablishmentsStats(
    ests: KasEstablishmentRow[],
    tendersList: TenderRecord[]
  ): KasEstablishmentRow[] {
    return ests.map((est) => {
      const matching = tendersList.filter(
        (t) =>
          t.entityName === est.name ||
          (est.aliases &&
            est.aliases.some(
              (a) => t.entityName.includes(a) || a.includes(t.entityName)
            ))
      );
      const totalTenders = matching.length;
      const totalValueWithVat = Number(
        matching.reduce((s, t) => s + (Number(t.grandTotal) || 0), 0).toFixed(2)
      );
      return {
        ...est,
        totalTenders: totalTenders > 0 ? totalTenders : Number(est.totalTenders) || 0,
        totalValueWithVat:
          totalValueWithVat > 0 ? totalValueWithVat : Number(est.totalValueWithVat) || 0,
      };
    });
  }

  private initSync() {
    const seedTenders = ((seedPayload.tenders || []) as any[]).map((t, idx) =>
      normalizeTenderRecord(t, idx)
    );
    const seedEsts = ((seedPayload.establishments || []) as any[]).map((e) => ({
      id: String(e.id),
      name: String(e.name),
      aliases: Array.isArray(e.aliases) ? e.aliases : [String(e.name)],
      endingToday: Number(e.endingToday) || 0,
      endingAfterToday: Number(e.endingAfterToday) || 0,
      totalTenders: Number(e.totalTenders) || 0,
      totalValueWithVat: Number(e.totalValueWithVat) || 0,
    }));

    const storedTenders = erpIndexedStorage.getSync<TenderRecord[]>(
      STORAGE_KEY_TENDERS,
      seedTenders
    );
    const mergedInitialTenders = [...storedTenders];
    for (const st of seedTenders) {
      if (!mergedInitialTenders.some((m) => m.id === st.id)) {
        mergedInitialTenders.push(st);
      }
    }

    this.tenders = mergedInitialTenders;
    const rawEsts = erpIndexedStorage.getSync<KasEstablishmentRow[]>(
      STORAGE_KEY_ESTABLISHMENTS,
      seedEsts
    );
    this.establishments = this.recomputeEstablishmentsStats(rawEsts, this.tenders);
    this.selectedTenderId =
      erpIndexedStorage.getSync<string>(
        STORAGE_KEY_SELECTED_TENDER_ID,
        this.tenders[0]?.id || ''
      ) ||
      this.tenders[0]?.id ||
      '';
    this.modificationLogs = erpIndexedStorage.getSync<KasModificationLogEntry[]>(
      STORAGE_KEY_MODIFICATION_LOGS,
      []
    );
  }

  private initCrossTabSync() {
    if (typeof window === 'undefined') return;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('kas_workbooks_live_sync');
        this.broadcastChannel.onmessage = (ev) => {
          const data = ev.data as KasWorkbooksSyncPayload | undefined;
          if (!data || !Array.isArray(data.tenders) || !Array.isArray(data.establishments)) {
            return;
          }
          this.tenders = data.tenders;
          this.establishments = data.establishments;
          if (Array.isArray(data.workbooks) && data.workbooks.length > 0) {
            this.workbooks = data.workbooks;
          }
          if (Array.isArray(data.modificationLogs)) {
            this.modificationLogs = data.modificationLogs;
          }
          if (data.selectedTenderId) {
            this.selectedTenderId = data.selectedTenderId;
          }
          this.notifyInProcessListeners(data);
        };
      }
    } catch {
      // ignore BroadcastChannel error
    }
  }

  private notifyInProcessListeners(payload: KasWorkbooksSyncPayload) {
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        // ignore listener error
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<KasWorkbooksSyncPayload>(KAS_WORKBOOKS_SYNC_EVENT, {
          detail: payload,
        })
      );
      window.dispatchEvent(
        new CustomEvent(KAS_ESTABLISHMENTS_UPDATED_EVENT, {
          detail: { establishments: this.establishments },
        })
      );
    }
  }

  private broadcastStateChange(source = 'kas', actionLabel = 'تحديث مصنفات كاس') {
    const payload: KasWorkbooksSyncPayload = {
      establishments: this.establishments,
      tenders: this.tenders,
      workbooks: this.workbooks,
      modificationLogs: this.modificationLogs,
      selectedTenderId: this.selectedTenderId,
      source,
      actionLabel,
      timestamp: new Date().toISOString(),
    };
    this.notifyInProcessListeners(payload);
    try {
      this.broadcastChannel?.postMessage(payload);
    } catch {
      // ignore postMessage errors
    }
  }

  private appendModificationLog(params: {
    sourceSection: string;
    actionType: KasModificationActionType;
    targetLabel: string;
    actionSummary: string;
    beforeSnapshot: KasModificationSnapshot;
    afterSnapshot: KasModificationSnapshot;
    customActor?: { actorName?: string; actorEmail?: string; actorRole?: string };
  }): KasModificationLogEntry {
    const actor = resolveActiveKasActor();
    const entry: KasModificationLogEntry = {
      id: `KAS-LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName: params.customActor?.actorName || actor.actorName,
      actorEmail: params.customActor?.actorEmail || actor.actorEmail,
      actorRole: params.customActor?.actorRole || actor.actorRole,
      sourceSection:
        params.sourceSection === 'kas-exact-sheets'
          ? 'قسم الجداول المطابقة للأصل بالملي (شهر 11)'
          : params.sourceSection === 'tenders-boq'
            ? 'قسم منافسات وجداول الكميات (BOQ)'
            : params.sourceSection,
      actionType: params.actionType,
      targetLabel: params.targetLabel,
      actionSummary: params.actionSummary,
      beforeSnapshot: params.beforeSnapshot,
      afterSnapshot: params.afterSnapshot,
      reverted: false,
    };
    this.modificationLogs = [entry, ...this.modificationLogs].slice(0, 60);
    erpIndexedStorage.setSync(STORAGE_KEY_MODIFICATION_LOGS, this.modificationLogs, {
      maxLocalStorageBytes: 350_000,
    });
    return entry;
  }

  public subscribe(listener: KasWorkbooksSyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getModificationLogs(): KasModificationLogEntry[] {
    return this.modificationLogs;
  }

  /**
   * Reverts a specific modification entry from the Audit Log (`التراجع عن التعديل`)
   * and broadcasts the restored state across all KAS sections.
   */
  public revertModificationById(
    logId: string,
    sourceSection = 'kas-audit-log'
  ): KasModificationLogEntry | null {
    const target = this.modificationLogs.find((l) => l.id === logId);
    if (!target || target.reverted) return null;

    const actor = resolveActiveKasActor();
    const restoredSelectedId =
      target.beforeSnapshot.selectedTenderId || this.selectedTenderId;

    // Merge restored snapshot tenders with full 241 list
    const beforeMap = new Map(
      target.beforeSnapshot.tenders.map((t) => [t.id, t])
    );
    const afterIds = new Set(target.afterSnapshot.tenders.map((t) => t.id));
    const beforeIds = new Set(target.beforeSnapshot.tenders.map((t) => t.id));

    // Remove tenders that were added in that action, and restore tenders that were modified/deleted
    let nextTenders = this.tenders
      .filter((t) => !(afterIds.has(t.id) && !beforeIds.has(t.id)))
      .map((t) => beforeMap.get(t.id) || t);

    for (const bt of target.beforeSnapshot.tenders) {
      if (!nextTenders.some((nt) => nt.id === bt.id)) {
        nextTenders = [bt, ...nextTenders];
      }
    }

    this.tenders = nextTenders;
    this.establishments = this.recomputeEstablishmentsStats(
      target.beforeSnapshot.establishments,
      this.tenders
    );
    this.selectedTenderId = restoredSelectedId;

    this.modificationLogs = this.modificationLogs.map((l) =>
      l.id === logId
        ? {
            ...l,
            reverted: true,
            revertedAt: new Date().toISOString(),
            revertedBy: actor.actorName,
          }
        : l
    );

    erpIndexedStorage.setSync(STORAGE_KEY_TENDERS, this.tenders, {
      maxLocalStorageBytes: 450_000,
    });
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, this.establishments, {
      maxLocalStorageBytes: 250_000,
    });
    erpIndexedStorage.setSync(STORAGE_KEY_MODIFICATION_LOGS, this.modificationLogs, {
      maxLocalStorageBytes: 350_000,
    });

    this.broadcastStateChange(
      sourceSection,
      `تم التراجع عن التعديل: ${target.actionSummary}`
    );
    return this.modificationLogs.find((l) => l.id === logId) || null;
  }

  /**
   * Undoes a previous revert (`زر التراجع عن الإرجاع / استعادة التعديل`)
   * re-applying `afterSnapshot` and syncing across all KAS sections!
   */
  public undoRevertModificationById(
    logId: string,
    sourceSection = 'kas-audit-log'
  ): KasModificationLogEntry | null {
    const target = this.modificationLogs.find((l) => l.id === logId);
    if (!target || !target.reverted) return null;

    const afterMap = new Map(
      target.afterSnapshot.tenders.map((t) => [t.id, t])
    );
    const beforeIds = new Set(target.beforeSnapshot.tenders.map((t) => t.id));
    const afterIds = new Set(target.afterSnapshot.tenders.map((t) => t.id));

    let nextTenders = this.tenders
      .filter((t) => !(beforeIds.has(t.id) && !afterIds.has(t.id)))
      .map((t) => afterMap.get(t.id) || t);

    for (const at of target.afterSnapshot.tenders) {
      if (!nextTenders.some((nt) => nt.id === at.id)) {
        nextTenders = [at, ...nextTenders];
      }
    }

    this.tenders = nextTenders;
    this.establishments = this.recomputeEstablishmentsStats(
      target.afterSnapshot.establishments,
      this.tenders
    );
    if (target.afterSnapshot.selectedTenderId) {
      this.selectedTenderId = target.afterSnapshot.selectedTenderId;
    }

    this.modificationLogs = this.modificationLogs.map((l) =>
      l.id === logId
        ? {
            ...l,
            reverted: false,
            revertedAt: undefined,
            revertedBy: undefined,
          }
        : l
    );

    erpIndexedStorage.setSync(STORAGE_KEY_TENDERS, this.tenders, {
      maxLocalStorageBytes: 450_000,
    });
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, this.establishments, {
      maxLocalStorageBytes: 250_000,
    });
    erpIndexedStorage.setSync(STORAGE_KEY_MODIFICATION_LOGS, this.modificationLogs, {
      maxLocalStorageBytes: 350_000,
    });

    this.broadcastStateChange(
      sourceSection,
      `تم التراجع عن الإرجاع واستعادة: ${target.actionSummary}`
    );
    return this.modificationLogs.find((l) => l.id === logId) || null;
  }

  /**
   * Reverts the most recent active (non-reverted) modification.
   */
  public revertLatestActiveModification(
    sourceSection = 'kas'
  ): KasModificationLogEntry | null {
    const latestActive = this.modificationLogs.find((l) => !l.reverted);
    if (!latestActive) return null;
    return this.revertModificationById(latestActive.id, sourceSection);
  }

  /**
   * Undoes the most recent reverted modification (`زر التراجع عن الإرجاع`).
   */
  public undoLatestRevertedModification(
    sourceSection = 'kas'
  ): KasModificationLogEntry | null {
    const latestReverted = this.modificationLogs.find((l) => l.reverted);
    if (!latestReverted) return null;
    return this.undoRevertModificationById(latestReverted.id, sourceSection);
  }

  public getWorkbooksMeta(): KasWorkbookMeta[] {
    return this.workbooks;
  }

  public setWorkbooksMeta(meta: KasWorkbookMeta[]): void {
    this.workbooks = meta;
    this.broadcastStateChange('workbooks_meta', 'تحديث قائمة المصنفات');
  }

  public getEstablishments(): KasEstablishmentRow[] {
    return this.establishments;
  }

  public getEstablishmentNames(): string[] {
    const dynamicNames = this.establishments.map((e) => e.name.trim()).filter(Boolean);
    return Array.from(new Set([...dynamicNames, ...KAS_DEFAULT_ESTABLISHMENT_NAMES]));
  }

  public getSelectedTenderId(): string {
    return this.selectedTenderId || this.tenders[0]?.id || '';
  }

  public setSelectedTenderId(tenderId: string, source = 'kas'): void {
    if (!tenderId || this.selectedTenderId === tenderId) return;
    this.selectedTenderId = tenderId;
    erpIndexedStorage.setSync(STORAGE_KEY_SELECTED_TENDER_ID, tenderId);
    this.broadcastStateChange(source, 'تغيير الورقة النشطة');
  }

  public addEstablishmentByName(rawName: string): KasEstablishmentRow | null {
    const clean = String(rawName || '').trim();
    if (!clean) return null;
    const existing = this.establishments.find(
      (e) =>
        e.name.trim() === clean ||
        (e.aliases && e.aliases.some((a) => a.trim() === clean))
    );
    if (existing) return existing;
    const beforeSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    const newRow: KasEstablishmentRow = {
      id: `est-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      aliases: [clean],
      endingToday: 0,
      endingAfterToday: 0,
      totalTenders: 0,
      totalValueWithVat: 0,
    };
    const nextEsts = this.recomputeEstablishmentsStats(
      [...this.establishments, newRow],
      this.tenders
    );
    this.establishments = nextEsts;
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, this.establishments, {
      maxLocalStorageBytes: 250_000,
    });
    const afterSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    this.appendModificationLog({
      sourceSection: 'kas-exact-sheets',
      actionType: 'add',
      targetLabel: `جدول المؤسسات — ${clean}`,
      actionSummary: `إضافة مؤسسة جديدة إلى جدول المؤسسات: "${clean}"`,
      beforeSnapshot: beforeSnap,
      afterSnapshot: afterSnap,
    });
    this.broadcastStateChange('add_establishment', `إضافة مؤسسة: ${clean}`);
    return newRow;
  }

  public getTenders(): TenderRecord[] {
    return this.tenders;
  }

  public getAllTenders(): TenderRecord[] {
    return this.tenders;
  }

  public saveTender(
    tender: TenderRecord,
    auditMeta?: {
      actionType?: KasModificationActionType;
      sourceSection?: string;
      targetLabel?: string;
      actionSummary?: string;
    }
  ): void {
    const exists = this.tenders.some((t) => t.id === tender.id);
    const nextList = exists
      ? this.tenders.map((t) => (t.id === tender.id ? tender : t))
      : [tender, ...this.tenders];
    this.saveState(
      nextList,
      this.establishments,
      tender.id,
      auditMeta?.sourceSection || 'kas',
      {
        actionType: auditMeta?.actionType || (exists ? 'edit' : 'add'),
        targetLabel:
          auditMeta?.targetLabel ||
          `ورقة: ${tender.sheetName || 'الجدول'} (${tender.referenceNumber})`,
        actionSummary:
          auditMeta?.actionSummary ||
          `تحديث ورقة (${tender.sheetName || 'الجدول'} — ${tender.referenceNumber})`,
      }
    );
  }

  public saveEstablishments(
    rows: KasEstablishmentRow[],
    sourceOrMeta:
      | string
      | {
          actionType?: KasModificationActionType;
          sourceSection?: string;
          targetLabel?: string;
          actionSummary?: string;
        } = 'kas',
    actionSummary = 'تحديث بيانات جدول المؤسسات'
  ): void {
    const beforeSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    this.establishments = this.recomputeEstablishmentsStats(rows, this.tenders);
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, this.establishments, {
      maxLocalStorageBytes: 250_000,
    });
    const afterSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    const resolvedSource =
      typeof sourceOrMeta === 'string'
        ? sourceOrMeta
        : sourceOrMeta.sourceSection || 'kas';
    const resolvedSummary =
      typeof sourceOrMeta === 'string'
        ? actionSummary
        : sourceOrMeta.actionSummary || actionSummary;
    const resolvedTarget =
      typeof sourceOrMeta === 'string'
        ? 'ورقة: المؤسسات'
        : sourceOrMeta.targetLabel || 'ورقة: المؤسسات';
    const resolvedType =
      typeof sourceOrMeta === 'string'
        ? 'edit'
        : sourceOrMeta.actionType || 'edit';

    this.appendModificationLog({
      sourceSection: resolvedSource,
      actionType: resolvedType,
      targetLabel: resolvedTarget,
      actionSummary: resolvedSummary,
      beforeSnapshot: beforeSnap,
      afterSnapshot: afterSnap,
    });
    this.broadcastStateChange(resolvedSource, resolvedSummary);
  }

  public saveTenders(
    rows: TenderRecord[],
    source = 'kas',
    actionSummary = 'تحديث بيانات أوراق الجداول'
  ): void {
    const beforeSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    this.tenders = rows;
    this.establishments = this.recomputeEstablishmentsStats(
      this.establishments,
      this.tenders
    );
    erpIndexedStorage.setSync(STORAGE_KEY_TENDERS, this.tenders, {
      maxLocalStorageBytes: 450_000,
    });
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, this.establishments, {
      maxLocalStorageBytes: 250_000,
    });
    const afterSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    this.appendModificationLog({
      sourceSection: source,
      actionType: 'edit',
      targetLabel: `ورقة: ${rows[0]?.sheetName || 'الجدول'}`,
      actionSummary,
      beforeSnapshot: beforeSnap,
      afterSnapshot: afterSnap,
    });
    this.broadcastStateChange(source, actionSummary);
  }

  public saveState(
    nextTenders: TenderRecord[],
    nextEstablishments?: KasEstablishmentRow[],
    selectedId?: string,
    source = 'kas',
    auditMeta?: {
      actionType?: KasModificationActionType;
      targetLabel?: string;
      actionSummary?: string;
      customActor?: { actorName?: string; actorEmail?: string; actorRole?: string };
    }
  ): void {
    const beforeSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );
    this.tenders = nextTenders;
    const baseEsts = nextEstablishments || this.establishments;
    this.establishments = this.recomputeEstablishmentsStats(baseEsts, this.tenders);
    if (selectedId) {
      this.selectedTenderId = selectedId;
      erpIndexedStorage.setSync(STORAGE_KEY_SELECTED_TENDER_ID, selectedId);
    }
    erpIndexedStorage.setSync(STORAGE_KEY_TENDERS, this.tenders, {
      maxLocalStorageBytes: 450_000,
    });
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, this.establishments, {
      maxLocalStorageBytes: 250_000,
    });

    const activeSheet =
      this.tenders.find((t) => t.id === this.selectedTenderId) || this.tenders[0];
    const afterSnap = cloneSnapshot(
      this.establishments,
      this.tenders,
      this.selectedTenderId
    );

    const summary =
      auditMeta?.actionSummary ||
      `تعديل في ورقة (${activeSheet?.sheetName || 'الجدول'} — ${activeSheet?.referenceNumber || ''})`;

    this.appendModificationLog({
      sourceSection: source,
      actionType: auditMeta?.actionType || 'edit',
      targetLabel:
        auditMeta?.targetLabel ||
        `ورقة: ${activeSheet?.sheetName || 'الجدول'} (${activeSheet?.referenceNumber || ''})`,
      actionSummary: summary,
      beforeSnapshot: beforeSnap,
      afterSnapshot: afterSnap,
      customActor: auditMeta?.customActor,
    });

    this.broadcastStateChange(source, summary);
  }

  public async ensureFullWorkbooksLoaded(): Promise<{
    establishments: KasEstablishmentRow[];
    tenders: TenderRecord[];
    workbooks: KasWorkbookMeta[];
  }> {
    if (this.fullLoaded && this.tenders.length > 100) {
      return {
        establishments: this.establishments,
        tenders: this.tenders,
        workbooks: this.workbooks,
      };
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      return {
        establishments: this.establishments,
        tenders: this.tenders,
        workbooks: this.workbooks,
      };
    }

    this.loadingPromise = (async () => {
      try {
        const cachedTenders = await erpIndexedStorage.getAsync<TenderRecord[]>(
          STORAGE_KEY_TENDERS
        );
        const cachedEsts = await erpIndexedStorage.getAsync<KasEstablishmentRow[]>(
          STORAGE_KEY_ESTABLISHMENTS
        );
        if (cachedTenders && cachedTenders.length > 100) {
          const inMemoryMap = new Map(this.tenders.map((t) => [t.id, t]));
          const merged = cachedTenders.map((ct) => inMemoryMap.get(ct.id) || ct);
          for (const memT of this.tenders) {
            if (!merged.some((m) => m.id === memT.id)) {
              merged.unshift(memT);
            }
          }
          this.tenders = merged;
          if (cachedEsts && cachedEsts.length > 0 && this.establishments.length === 0) {
            this.establishments = this.recomputeEstablishmentsStats(
              cachedEsts,
              this.tenders
            );
          } else {
            this.establishments = this.recomputeEstablishmentsStats(
              this.establishments,
              this.tenders
            );
          }
          this.fullLoaded = true;
          this.broadcastStateChange('full_cache_load', 'تحميل المصنفات الكاملة');
          return;
        }

        if (typeof fetch !== 'undefined') {
          const res = await fetch('/data/kasNovemberBoqWorkbooks.json');
          if (res.ok) {
            const fullData = await res.json();
            if (Array.isArray(fullData.workbooks)) {
              this.workbooks = fullData.workbooks;
            }
            if (Array.isArray(fullData.tenders) && fullData.tenders.length > 0) {
              const normalizedFull: TenderRecord[] = fullData.tenders.map(
                (t: any, idx: number) => normalizeTenderRecord(t, idx)
              );
              const inMemoryMap = new Map(this.tenders.map((t) => [t.id, t]));
              const mergedFull = normalizedFull.map(
                (nf) => inMemoryMap.get(nf.id) || nf
              );
              const existingCustom = this.tenders.filter(
                (existing) => !normalizedFull.some((nf) => nf.id === existing.id)
              );
              this.tenders = [...existingCustom, ...mergedFull];
              await erpIndexedStorage.setAsync(STORAGE_KEY_TENDERS, this.tenders);
            }
            if (
              Array.isArray(fullData.establishments) &&
              fullData.establishments.length > 0 &&
              this.establishments.length === 0
            ) {
              this.establishments = this.recomputeEstablishmentsStats(
                fullData.establishments,
                this.tenders
              );
              await erpIndexedStorage.setAsync(
                STORAGE_KEY_ESTABLISHMENTS,
                this.establishments
              );
            } else {
              this.establishments = this.recomputeEstablishmentsStats(
                this.establishments,
                this.tenders
              );
            }
            this.fullLoaded = true;
            this.broadcastStateChange('full_json_load', 'تحميل 241 ورقة من النسخ 1..4');
          }
        }
      } catch {
        // Offline or unit-test environment: keep synchronous seed dataset
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
    return {
      establishments: this.establishments,
      tenders: this.tenders,
      workbooks: this.workbooks,
    };
  }

  public getDefaultSeedSnapshot(): {
    establishments: KasEstablishmentRow[];
    tenders: TenderRecord[];
  } {
    const seedTenders = ((seedPayload.tenders || []) as any[]).map((t, idx) =>
      normalizeTenderRecord(t, idx)
    );
    const seedEsts = ((seedPayload.establishments || []) as any[]).map((e) => ({
      id: String(e.id),
      name: String(e.name),
      aliases: Array.isArray(e.aliases) ? e.aliases : [String(e.name)],
      endingToday: Number(e.endingToday) || 0,
      endingAfterToday: Number(e.endingAfterToday) || 0,
      totalTenders: Number(e.totalTenders) || 0,
      totalValueWithVat: Number(e.totalValueWithVat) || 0,
    }));
    return {
      establishments: this.recomputeEstablishmentsStats(seedEsts, seedTenders),
      tenders: seedTenders,
    };
  }
}

export const kasNovemberWorkbooksService = new KasNovemberWorkbooksService();
