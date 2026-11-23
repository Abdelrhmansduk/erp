/**
 * KAS Enterprise WMS — Hardware Scanner (USB/Bluetooth/PDA/Camera/Batch),
 * Real ISO Code-128B & QR Serialized Label Generator, and External Asset/Room Field Audit Service
 */
import { wmsEngineService, WmsActor } from './wmsEngineService';
import { WMS_BENEFICIARIES, WMS_WAREHOUSES } from './wmsExcelMigrationSeed';
import { WmsItem, WmsSerialLotRecord } from '../../types/wms';

export interface WmsLocationTag {
  code: string;
  nameAr: string;
  group: 'مستودعات ورفوف' | 'مكاتب الشركات' | 'مراكز السكن والغرف' | 'مرافق ومشاريع';
  costCenterCode?: string;
}

export interface PrintableSerialLabel {
  barcodeValue: string; // ASCII Code-128B safe
  qrPayload: string; // Rich JSON/pipe payload
  titleAr: string;
  subtitleAr: string;
  locationLabel: string;
  sku?: string;
  serialNo?: string;
  tagKind: 'ITEM_SERIAL' | 'EXTERNAL_ASSET' | 'LOCATION_TAG';
}

export interface ScanResolutionResult {
  rawCode: string;
  matchedType: 'SERIAL_ASSET' | 'ITEM_SKU' | 'LOCATION_TAG' | 'UNKNOWN';
  displayName: string;
  code: string;
  locationOrSite: string;
  statusLabel: string;
  item?: WmsItem;
  serialRecord?: WmsSerialLotRecord;
  locationTag?: WmsLocationTag;
  availableQty?: number;
  baseUom?: string;
  assignedTo?: string;
  custodyId?: string;
  photoDataUrl?: string;
}

export interface BatchParsedScan {
  code: string;
  qty: number;
  resolution: ScanResolutionResult;
}

const CUSTOM_LOCATIONS_KEY = 'KAS_WMS_CUSTOM_LOCATION_TAGS_V1';

function loadCustomLocations(): WmsLocationTag[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(CUSTOM_LOCATIONS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    }
  } catch {
    // ignore
  }
  return [
    { code: 'LOC-RM-RABIA', nameAr: 'سكن العاملات — غرفة رابيا', group: 'مراكز السكن والغرف', costCenterCode: 'CC-SHL-01' },
    { code: 'LOC-RM-MOMEEN', nameAr: 'البركس — غرفة مؤمن السواق', group: 'مراكز السكن والغرف', costCenterCode: 'CC-SHL-03' },
  ];
}

function saveCustomLocations(list: WmsLocationTag[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

export const wmsScannerAndBarcodeService = {
  /** Get all printable Location/Warehouse/Office/Room barcode tags */
  getAllLocationTags(): WmsLocationTag[] {
    const whTags: WmsLocationTag[] = WMS_WAREHOUSES.map((w) => ({
      code: `LOC-${w.code}`,
      nameAr: w.nameAr,
      group: 'مستودعات ورفوف',
      costCenterCode: 'CC-KAS-01',
    }));

    const benTags: WmsLocationTag[] = WMS_BENEFICIARIES.map((b) => ({
      code: `LOC-${b.id}`,
      nameAr: b.nameAr,
      group:
        b.entityGroup === 'مكاتب الشركات'
          ? 'مكاتب الشركات'
          : b.entityGroup === 'مراكز السكن والإيواء'
          ? 'مراكز السكن والغرف'
          : 'مرافق ومشاريع',
      costCenterCode: b.costCenterCode,
    }));

    const custom = loadCustomLocations();
    return [...whTags, ...benTags, ...custom];
  },

  /** Add a custom external room, office, vehicle, or shelf barcode tag */
  addCustomLocationTag(nameAr: string, group: WmsLocationTag['group'], customCode?: string): WmsLocationTag {
    const existing = loadCustomLocations();
    const code =
      (customCode || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') ||
      `LOC-EXT-${String(existing.length + 1).padStart(3, '0')}`;
    const tag: WmsLocationTag = {
      code,
      nameAr: nameAr.trim(),
      group,
      costCenterCode: 'CC-KAS-01',
    };
    const next = [tag, ...existing.filter((x) => x.code !== code)];
    saveCustomLocations(next);
    return tag;
  },

  /** Resolve ANY scanned barcode / QR code across Serials, SKUs, and Locations/Rooms */
  resolveScannedCode(rawInput: string): ScanResolutionResult {
    const cleaned = (rawInput || '').trim();
    if (!cleaned) {
      return {
        rawCode: '',
        matchedType: 'UNKNOWN',
        displayName: 'رمز فارغ',
        code: '',
        locationOrSite: '—',
        statusLabel: 'غير معروف',
      };
    }

    // If QR payload is pipe-delimited `KAS-WMS|CODE|NAME|LOC`, extract the code
    let lookupCode = cleaned;
    if (cleaned.startsWith('KAS-WMS|')) {
      const parts = cleaned.split('|');
      if (parts[1]) lookupCode = parts[1].trim();
    }
    const lower = lookupCode.toLowerCase();
    const state = wmsEngineService.getState();

    // 1) Check Location / Room / Office Tags
    const locMatch = this.getAllLocationTags().find(
      (l) => l.code.toLowerCase() === lower || l.nameAr.toLowerCase() === lower
    );
    if (locMatch) {
      return {
        rawCode: cleaned,
        matchedType: 'LOCATION_TAG',
        displayName: locMatch.nameAr,
        code: locMatch.code,
        locationOrSite: locMatch.group,
        statusLabel: 'موقع / غرفة / مكتب معتمد',
        locationTag: locMatch,
      };
    }

    // 2) Check Serialized Assets & Lots (inside OR outside warehouse!)
    const serialMatch = state.serialLots.find(
      (s) =>
        (s.serialNumber && s.serialNumber.toLowerCase() === lower) ||
        (s.lotNumber && s.lotNumber.toLowerCase() === lower) ||
        s.id.toLowerCase() === lower
    );
    if (serialMatch) {
      const parentItem = state.items.find((i) => i.id === serialMatch.itemId);
      const photo = parentItem?.attachments?.find((a) => a.mimeType.startsWith('image/'))?.dataUrl;
      return {
        rawCode: cleaned,
        matchedType: 'SERIAL_ASSET',
        displayName: serialMatch.itemName,
        code: serialMatch.serialNumber || serialMatch.lotNumber || serialMatch.sku,
        locationOrSite:
          serialMatch.assignedToEntity ||
          state.warehouses.find((w) => w.id === serialMatch.warehouseId)?.nameAr ||
          serialMatch.warehouseId,
        statusLabel:
          serialMatch.status === 'IN_STOCK'
            ? 'متوفر داخل المستودع'
            : serialMatch.status === 'IN_CUSTODY'
            ? 'بعهدة موظف / خارج المستودع'
            : serialMatch.status === 'ISSUED'
            ? 'مصروف لمكتب / سكن'
            : serialMatch.status,
        item: parentItem,
        serialRecord: serialMatch,
        availableQty: parentItem ? wmsEngineService.getItemStockSummary(parentItem.id).available : undefined,
        baseUom: parentItem?.baseUom || 'حبة',
        assignedTo: serialMatch.assignedToName,
        custodyId: serialMatch.custodyId,
        photoDataUrl: photo,
      };
    }

    // 3) Check Master SKU Catalog (Barcode / SKU / Name exact or partial)
    const itemMatch =
      state.items.find(
        (i) => i.barcode.toLowerCase() === lower || i.sku.toLowerCase() === lower
      ) ||
      state.items.find((i) => i.nameAr.toLowerCase().includes(lower));

    if (itemMatch) {
      const summary = wmsEngineService.getItemStockSummary(itemMatch.id);
      const whName =
        state.warehouses.find((w) => w.id === itemMatch.defaultWarehouseId)?.nameAr ||
        itemMatch.defaultWarehouseId;
      const photo = itemMatch.attachments?.find((a) => a.mimeType.startsWith('image/'))?.dataUrl;
      return {
        rawCode: cleaned,
        matchedType: 'ITEM_SKU',
        displayName: itemMatch.nameAr,
        code: itemMatch.barcode,
        locationOrSite: `${whName} (${itemMatch.defaultLocationCode})`,
        statusLabel: summary.available > 0 ? 'متوفر بالرصيد' : 'نفد من الرصيد (0)',
        item: itemMatch,
        availableQty: summary.available,
        baseUom: itemMatch.baseUom,
        photoDataUrl: photo,
      };
    }

    return {
      rawCode: cleaned,
      matchedType: 'UNKNOWN',
      displayName: `رمز غير مسجّل (${lookupCode})`,
      code: lookupCode,
      locationOrSite: 'غير مرتبط بصنف أو موقع بعد',
      statusLabel: 'غير مسجّل — يمكنك إضافته فوراً',
    };
  },

  /**
   * Generate a batch of N sequential serialized barcode labels (for warehouse items OR external assets
   * in offices, housing rooms, vehicles) and optionally register them immediately in the WMS serial registry!
   */
  generateSerializedLabelsBatch(params: {
    mode: 'EXISTING_ITEM' | 'EXTERNAL_ASSET';
    itemId?: string;
    customAssetName?: string;
    prefixCode?: string;
    locationOrOffice: string;
    assignedToName?: string;
    count: number;
    startNumber: number;
    registerInSystem: boolean;
    actor: WmsActor;
  }): PrintableSerialLabel[] {
    const safeCount = Math.max(1, Math.min(200, Math.floor(params.count || 1)));
    const startNum = Math.max(1, Math.floor(params.startNumber || 1));
    const state = wmsEngineService.getState();

    let targetItem: WmsItem | undefined;
    if (params.mode === 'EXISTING_ITEM' && params.itemId) {
      targetItem = state.items.find((i) => i.id === params.itemId);
    }

    const prefix =
      (params.prefixCode || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') ||
      (targetItem ? targetItem.sku : 'KAS-EXT');
    const titleAr = targetItem ? targetItem.nameAr : (params.customAssetName || 'أصل / جهاز ميداني').trim();

    // If registering external asset without existing item, create a dedicated SKU so scans always resolve!
    if (params.registerInSystem && !targetItem && params.customAssetName?.trim()) {
      targetItem = wmsEngineService.createItem(
        {
          nameAr: params.customAssetName.trim(),
          categoryId: 'CAT-FUR',
          baseUom: 'حبة',
          uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
          trackingMode: 'SERIAL',
          valuationMethod: state.settings.valuationMethod,
          avgUnitCost: 0,
          lastPurchaseCost: 0,
          minQty: 0,
          reorderPoint: 0,
          maxQty: 100,
          defaultWarehouseId: 'WH-NEW',
          defaultLocationCode: 'EXT-FIELD',
          isCustodyEligible: true,
          isFastConsumable: false,
          isSampleItem: false,
          status: 'نشط',
          notes: `أصل خارجي مُرمّز بالباركود — الموقع: ${params.locationOrOffice}`,
        },
        params.actor
      );
    }

    const labels: PrintableSerialLabel[] = [];
    const todayIso = new Date().toISOString().slice(0, 10);
    const liveState = wmsEngineService.getState();

    for (let i = 0; i < safeCount; i++) {
      const seqNum = startNum + i;
      const serialCode = `${prefix}-SN${String(seqNum).padStart(3, '0')}`;
      const qrPayload = `KAS-WMS|${serialCode}|${titleAr}|${params.locationOrOffice}`;

      labels.push({
        barcodeValue: serialCode,
        qrPayload,
        titleAr,
        subtitleAr: params.assignedToName ? `عهدة/مسؤول: ${params.assignedToName}` : `تسلسل #${seqNum} من ${startNum + safeCount - 1}`,
        locationLabel: params.locationOrOffice,
        sku: targetItem?.sku || prefix,
        serialNo: serialCode,
        tagKind: params.mode === 'EXISTING_ITEM' ? 'ITEM_SERIAL' : 'EXTERNAL_ASSET',
      });

      if (params.registerInSystem && targetItem) {
        const exists = liveState.serialLots.some((s) => s.serialNumber === serialCode);
        if (!exists) {
          const isOutside =
            params.mode === 'EXTERNAL_ASSET' ||
            (!params.locationOrOffice.includes('المستودع') && params.locationOrOffice.trim() !== '');
          liveState.serialLots.unshift({
            id: `SN-TAG-${Date.now()}-${i}`,
            company_id: 'KAS',
            itemId: targetItem.id,
            sku: targetItem.sku,
            itemName: targetItem.nameAr,
            serialNumber: serialCode,
            warehouseId: targetItem.defaultWarehouseId,
            status: isOutside ? (params.assignedToName ? 'IN_CUSTODY' : 'ISSUED') : 'IN_STOCK',
            assignedToEntity: params.locationOrOffice,
            assignedToName: params.assignedToName || params.locationOrOffice,
            receivedDate: todayIso,
            issuedDate: isOutside ? todayIso : undefined,
            notes: `تم توليد وطباعة ملصق باركود تسلسلي بواسطة ${params.actor.name}`,
          });
        }
      }
    }

    if (params.registerInSystem && targetItem) {
      // Persist via lightweight updateItem trigger so state & audit log save cleanly
      wmsEngineService.updateItem(targetItem.id, { trackingMode: 'SERIAL' }, params.actor);
    }

    return labels;
  },

  /** Parse TXT or CSV dump from an offline memory barcode collector (e.g., Netum / Eyoyo / Zebra batch) */
  parseHardwareCollectorBatch(rawText: string): BatchParsedScan[] {
    const lines = (rawText || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const grouped = new Map<string, number>();
    for (const line of lines) {
      // Skip header lines like "barcode,qty"
      if (/^(barcode|sku|code|الباركود|الرمز)/i.test(line)) continue;
      const parts = line.split(/[,;\t]+/).map((p) => p.trim());
      const code = parts[0];
      if (!code) continue;
      const qty = parts[1] && !Number.isNaN(Number(parts[1])) ? Math.max(1, Number(parts[1])) : 1;
      grouped.set(code, (grouped.get(code) || 0) + qty);
    }

    return Array.from(grouped.entries()).map(([code, qty]) => ({
      code,
      qty,
      resolution: this.resolveScannedCode(code),
    }));
  },

  /** Crisp scanner confirmation audio beep via Web Audio API */
  playBeep(kind: 'ok' | 'warn' | 'error' = 'ok'): void {
    try {
      if (typeof window === 'undefined') return;
      const webkitWin = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || webkitWin.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'error' ? 'sawtooth' : 'sine';
      osc.frequency.value = kind === 'ok' ? 1480 : kind === 'warn' ? 920 : 320;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (kind === 'error' ? 0.22 : 0.09));
    } catch {
      // Audio blocked or unsupported in test env
    }
  },
};
