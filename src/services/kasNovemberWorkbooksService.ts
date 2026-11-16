/**
 * KAS November Workbooks & Establishments Service
 * Manages the 4 KAS XLSM workbooks (شهر 11 نسخة 1..4 — 241 real BOQ sheets)
 * and the Establishments table (المؤسسات) with persistent storage and a 50-step Undo/Redo stack.
 */

import seedPayload from '../data/kasNovemberSeedData.json';
import { BOQItem, KasEstablishmentRow, KasWorkbookMeta, TenderRecord } from '../types/tenders';
import { erpIndexedStorage } from './storage/erpIndexedStorage';
import { tafqeet } from './tafqeetService';

const STORAGE_KEY_TENDERS = 'kas_november_boq_tenders_v2';
const STORAGE_KEY_ESTABLISHMENTS = 'kas_november_establishments_v2';

export const KAS_DEFAULT_ESTABLISHMENT_NAMES: string[] = [
  'مؤسسة خالد عبدالعزيز السليم للتجارة',
  'مؤسسة بنايات ذكية للمقاولات',
  'شركة الاميال للسفر و السياحة',
  'شركة كاس ميديا للدعاية والاعلان',
  'شركة كاس تك للاتصالات و تقنية المعلومات',
  'مؤسسة كاس لتنظيم المعارض والمؤتمرات',
];

export interface KasWorkbookSystemSnapshot {
  actionLabel: string;
  timestamp: string;
  establishments: KasEstablishmentRow[];
  tenders: TenderRecord[];
  selectedTenderId: string;
}

function normalizeTenderRecord(raw: any, fallbackIdx = 0): TenderRecord {
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
    referenceNumber: String(raw.referenceNumber || `25113900${String(fallbackIdx + 1).padStart(4, '0')}`),
    title: String(raw.title || `منافسة ${fallbackIdx + 1}`).trim(),
    entityName,
    clientName: String(raw.clientName || 'منصة اعتماد الحكومية — المنافسات والمشتريات').trim(),
    category,
    status: raw.status || 'مقدمة ومسعرة',
    submissionDate: raw.submissionDate || '2026-11-16',
    supplyDuration: String(raw.supplyDuration || 'خلال 15 يوم من تاريخ استلام التعميد').trim(),
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
  private fullLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.initSync();
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

    this.tenders = erpIndexedStorage.getSync<TenderRecord[]>(STORAGE_KEY_TENDERS, seedTenders);
    this.establishments = erpIndexedStorage.getSync<KasEstablishmentRow[]>(
      STORAGE_KEY_ESTABLISHMENTS,
      seedEsts
    );
  }

  public getWorkbooksMeta(): KasWorkbookMeta[] {
    return this.workbooks;
  }

  public getEstablishments(): KasEstablishmentRow[] {
    return this.establishments;
  }

  public getEstablishmentNames(): string[] {
    const dynamicNames = this.establishments.map((e) => e.name.trim()).filter(Boolean);
    return Array.from(new Set([...dynamicNames, ...KAS_DEFAULT_ESTABLISHMENT_NAMES]));
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
    const newRow: KasEstablishmentRow = {
      id: `est-${Date.now()}`,
      name: clean,
      aliases: [clean],
      endingToday: 0,
      endingAfterToday: 0,
      totalTenders: 0,
      totalValueWithVat: 0,
    };
    this.establishments = [...this.establishments, newRow];
    this.saveEstablishments(this.establishments);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('kas-establishments-updated', {
          detail: { establishments: this.establishments },
        })
      );
    }
    return newRow;
  }

  public getTenders(): TenderRecord[] {
    return this.tenders;
  }

  public saveEstablishments(rows: KasEstablishmentRow[]): void {
    this.establishments = rows;
    erpIndexedStorage.setSync(STORAGE_KEY_ESTABLISHMENTS, rows, { maxLocalStorageBytes: 250_000 });
  }

  public saveTenders(rows: TenderRecord[]): void {
    this.tenders = rows;
    erpIndexedStorage.setSync(STORAGE_KEY_TENDERS, rows, { maxLocalStorageBytes: 450_000 });
  }

  public async ensureFullWorkbooksLoaded(): Promise<{
    establishments: KasEstablishmentRow[];
    tenders: TenderRecord[];
    workbooks: KasWorkbookMeta[];
  }> {
    if (this.fullLoaded && this.tenders.length > 50) {
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
        const cachedTenders = await erpIndexedStorage.getAsync<TenderRecord[]>(STORAGE_KEY_TENDERS);
        const cachedEsts = await erpIndexedStorage.getAsync<KasEstablishmentRow[]>(
          STORAGE_KEY_ESTABLISHMENTS
        );
        if (cachedTenders && cachedTenders.length > 100) {
          this.tenders = cachedTenders;
          if (cachedEsts && cachedEsts.length > 0) {
            this.establishments = cachedEsts;
          }
          this.fullLoaded = true;
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
              const normalizedFull = fullData.tenders.map((t: any, idx: number) =>
                normalizeTenderRecord(t, idx)
              );
              // Keep any user-created tenders not in full JSON
              const existingCustom = this.tenders.filter(
                (existing) => !normalizedFull.some((nf: TenderRecord) => nf.id === existing.id)
              );
              this.tenders = [...existingCustom, ...normalizedFull];
              await erpIndexedStorage.setAsync(STORAGE_KEY_TENDERS, this.tenders);
            }
            if (Array.isArray(fullData.establishments) && fullData.establishments.length > 0) {
              this.establishments = fullData.establishments;
              await erpIndexedStorage.setAsync(STORAGE_KEY_ESTABLISHMENTS, this.establishments);
            }
            this.fullLoaded = true;
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
    return { establishments: seedEsts, tenders: seedTenders };
  }
}

export const kasNovemberWorkbooksService = new KasNovemberWorkbooksService();
