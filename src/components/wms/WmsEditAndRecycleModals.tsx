import React, { useEffect, useState } from 'react';
import { X, Save, RotateCcw, Trash2, ArchiveRestore, Plus } from 'lucide-react';
import {
  WmsCategory,
  WmsItem,
  WmsRecycleBinEntry,
  WmsStockVoucher,
  WmsTrackingMode,
  WmsVoucherType,
  WmsWarehouse,
} from '../../types/wms';
import { WMS_BENEFICIARIES } from '../../services/wms/wmsExcelMigrationSeed';
import {
  DEFAULT_WMS_ITEM_TYPES,
  DEFAULT_WMS_UNITS,
  resolveItemTypeLabel,
} from '../../utils/wmsSearchUtils';

// ============================================================================
// 1. EDIT ITEM MODAL (تعديل الصنف الشامل + التصنيف + النوع + الوحدة + الرصيد الفعلي)
// ============================================================================
export const WmsEditItemModal: React.FC<{
  item: WmsItem | null;
  categories: WmsCategory[];
  warehouses: WmsWarehouse[];
  itemTypes?: string[];
  currentOnHandQty?: number;
  onCreateCategory?: (input: { nameAr: string; code?: string }) => WmsCategory | null;
  onCreateWarehouse?: (input: { nameAr: string; branch?: string }) => WmsWarehouse | null;
  onAdjustStock?: (itemId: string, newOnHandQty: number) => void;
  onClose: () => void;
  onSave: (itemId: string, patch: Partial<WmsItem>) => void;
}> = ({
  item,
  categories,
  warehouses,
  itemTypes = DEFAULT_WMS_ITEM_TYPES,
  currentOnHandQty,
  onCreateCategory,
  onCreateWarehouse,
  onAdjustStock,
  onClose,
  onSave,
}) => {
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState('CAT-MEP');
  const [itemType, setItemType] = useState('');
  const [baseUom, setBaseUom] = useState('حبة');
  const [secondaryUomName, setSecondaryUomName] = useState('');
  const [secondaryUomFactor, setSecondaryUomFactor] = useState('12');
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('WH-MAIN');
  const [defaultLocationCode, setDefaultLocationCode] = useState('');
  const [onHandInput, setOnHandInput] = useState('0');
  const [avgUnitCost, setAvgUnitCost] = useState('0');
  const [minQty, setMinQty] = useState('1');
  const [reorderPoint, setReorderPoint] = useState('3');
  const [maxQty, setMaxQty] = useState('100');
  const [trackingMode, setTrackingMode] = useState<WmsTrackingMode>('NONE');
  const [isCustodyEligible, setIsCustodyEligible] = useState(false);
  const [isFastConsumable, setIsFastConsumable] = useState(false);
  const [isSampleItem, setIsSampleItem] = useState(false);
  const [status, setStatus] = useState<'نشط' | 'موقوف'>('نشط');
  const [notes, setNotes] = useState('');

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showNewWh, setShowNewWh] = useState(false);
  const [newWhName, setNewWhName] = useState('');

  useEffect(() => {
    if (!item) return;
    const catCode = categories.find((c) => c.id === item.categoryId)?.code;
    setSku(item.sku);
    setBarcode(item.barcode);
    setNameAr(item.nameAr);
    setNameEn(item.nameEn || '');
    setCategoryId(item.categoryId);
    setItemType(resolveItemTypeLabel(item, catCode));
    setBaseUom(item.baseUom || 'حبة');
    const secUom = item.uomConversions?.find((u) => u.factorToBase > 1);
    setSecondaryUomName(secUom?.uomName || '');
    setSecondaryUomFactor(String(secUom?.factorToBase || 12));
    setDefaultWarehouseId(item.defaultWarehouseId);
    setDefaultLocationCode(item.defaultLocationCode);
    setOnHandInput(String(currentOnHandQty ?? 0));
    setAvgUnitCost(String(item.avgUnitCost || 0));
    setMinQty(String(item.minQty ?? 1));
    setReorderPoint(String(item.reorderPoint ?? 3));
    setMaxQty(String(item.maxQty ?? 100));
    setTrackingMode(item.trackingMode);
    setIsCustodyEligible(item.isCustodyEligible);
    setIsFastConsumable(item.isFastConsumable);
    setIsSampleItem(item.isSampleItem);
    setStatus(item.status);
    setNotes(item.notes || '');
  }, [item, categories, currentOnHandQty]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;
    const cleanBaseUom = baseUom.trim() || 'حبة';
    const conversions = [{ uomName: cleanBaseUom, factorToBase: 1 }];
    if (secondaryUomName.trim()) {
      conversions.push({
        uomName: secondaryUomName.trim(),
        factorToBase: Math.max(2, Number(secondaryUomFactor) || 12),
      });
    }

    onSave(item.id, {
      sku: sku.trim() || item.sku,
      barcode: barcode.trim() || item.barcode,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || undefined,
      categoryId,
      itemType: itemType.trim() || undefined,
      baseUom: cleanBaseUom,
      uomConversions: conversions,
      defaultWarehouseId,
      defaultLocationCode: defaultLocationCode.trim() || 'Z1-R1-B1',
      avgUnitCost: Math.max(0, Number(avgUnitCost) || 0),
      minQty: Math.max(0, Number(minQty) || 0),
      reorderPoint: Math.max(0, Number(reorderPoint) || 0),
      maxQty: Math.max(1, Number(maxQty) || 100),
      trackingMode,
      isCustodyEligible,
      isFastConsumable,
      isSampleItem,
      status,
      notes: notes.trim() || undefined,
    });

    if (onAdjustStock !== undefined && currentOnHandQty !== undefined) {
      const targetQty = Math.max(0, Number(onHandInput) || 0);
      if (targetQty !== currentOnHandQty) {
        onAdjustStock(item.id, targetQty);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3f3f3]">
              {item.sku}
            </span>
            <h3 className="text-lg font-bold text-[#141414] mt-1">تحرير بيانات الصنف والتصنيف والنوع والرصيد</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">اسم الصنف بالعربية *</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-sm text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الاسم بالإنجليزية</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-sm text-[#141414]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">رمز الصنف (SKU)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الباركود (Barcode)</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#141414]">التصنيف</label>
                {onCreateCategory && (
                  <button
                    type="button"
                    onClick={() => setShowNewCat((p) => !p)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141414] text-white"
                  >
                    + تصنيف جديد
                  </button>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
              {showNewCat && onCreateCategory && (
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="اسم التصنيف الجديد..."
                    className="flex-1 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCatName.trim()) return;
                      const created = onCreateCategory({ nameAr: newCatName.trim() });
                      if (created) setCategoryId(created.id);
                      setNewCatName('');
                      setShowNewCat(false);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                  >
                    حفظ
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">النوع (اختر أو اكتب نوعاً جديداً)</label>
              <input
                list="wms-edit-item-types"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                placeholder="مثال: أجهزة كهربائية / مستهلك تشغيلي..."
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
              />
              <datalist id="wms-edit-item-types">
                {itemTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#141414]">المستودع</label>
                {onCreateWarehouse && (
                  <button
                    type="button"
                    onClick={() => setShowNewWh((p) => !p)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141414] text-white"
                  >
                    + مستودع جديد
                  </button>
                )}
              </div>
              <select
                value={defaultWarehouseId}
                onChange={(e) => setDefaultWarehouseId(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr}
                  </option>
                ))}
              </select>
              {showNewWh && onCreateWarehouse && (
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    type="text"
                    value={newWhName}
                    onChange={(e) => setNewWhName(e.target.value)}
                    placeholder="اسم المستودع الجديد..."
                    className="flex-1 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newWhName.trim()) return;
                      const created = onCreateWarehouse({ nameAr: newWhName.trim() });
                      if (created) setDefaultWarehouseId(created.id);
                      setNewWhName('');
                      setShowNewWh(false);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                  >
                    حفظ
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الرف / الموقع (Bin)</label>
              <input
                type="text"
                value={defaultLocationCode}
                onChange={(e) => setDefaultLocationCode(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          {/* Units */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-[14px] bg-[#f3f3f3]">
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">وحدة الأساس</label>
              <input
                list="wms-edit-item-uoms"
                value={baseUom}
                onChange={(e) => setBaseUom(e.target.value)}
                className="w-full rounded-[12px] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold"
              />
              <datalist id="wms-edit-item-uoms">
                {DEFAULT_WMS_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">وحدة تعبئة إضافية</label>
              <input
                type="text"
                value={secondaryUomName}
                onChange={(e) => setSecondaryUomName(e.target.value)}
                placeholder="كرتون / درزن..."
                className="w-full rounded-[12px] bg-[#ffffff] px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">معامل التحويل</label>
              <input
                type="number"
                min={2}
                value={secondaryUomFactor}
                onChange={(e) => setSecondaryUomFactor(e.target.value)}
                className="w-full rounded-[12px] bg-[#ffffff] px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {currentOnHandQty !== undefined && (
              <div>
                <label className="block text-[11px] font-bold text-[#141414] mb-1">الرصيد الفعلي</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={onHandInput}
                  onChange={(e) => setOnHandInput(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] border border-[#141414] px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">متوسط التكلفة (⃁)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={avgUnitCost}
                onChange={(e) => setAvgUnitCost(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">نقطة إعادة الطلب</label>
              <input
                type="number"
                min={0}
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">التتبع</label>
              <select
                value={trackingMode}
                onChange={(e) => setTrackingMode(e.target.value as WmsTrackingMode)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-2 py-2 text-xs font-semibold"
              >
                <option value="NONE">قياسي</option>
                <option value="SERIAL">تسلسلي S/N</option>
                <option value="LOT_EXPIRY">تشغيلة وصلاحية</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">الحالة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'نشط' | 'موقوف')}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-2 py-2 text-xs font-semibold"
              >
                <option value="نشط">نشط</option>
                <option value="موقوف">موقوف</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={isCustodyEligible} onChange={(e) => setIsCustodyEligible(e.target.checked)} />
              قابل للترحيل كعهدة موظف
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={isFastConsumable} onChange={(e) => setIsFastConsumable(e.target.checked)} />
              مستهلك يومي سريع
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={isSampleItem} onChange={(e) => setIsSampleItem(e.target.checked)} />
              صنف عينات
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold">
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. EDIT VOUCHER MODAL (تحرير الإذن المخزني + النوع + إضافة/حذف/تحرير الأصناف في جدول)
// ============================================================================
interface VoucherLineDraft {
  id?: string;
  mode: 'EXISTING' | 'NEW';
  itemId: string;
  itemName: string;
  newItemName: string;
  newItemCategoryId: string;
  itemType: string;
  enteredUom: string;
  enteredQty: string;
  unitCost: string;
  notes: string;
}

export const WmsEditVoucherModal: React.FC<{
  voucher: WmsStockVoucher | null;
  items?: WmsItem[];
  categories?: WmsCategory[];
  warehouses?: WmsWarehouse[];
  itemTypes?: string[];
  onClose: () => void;
  onSave: (
    voucherId: string,
    patch: {
      voucherType?: WmsVoucherType;
      warehouseId?: string;
      targetWarehouseId?: string;
      voucherDate?: string;
      beneficiaryEntity?: string;
      recipientName?: string;
      supplierName?: string;
      roomOrSite?: string;
      notes?: string;
      replaceAllLines?: boolean;
      lines?: Array<{
        id?: string;
        itemId?: string;
        newItemName?: string;
        newItemCategoryId?: string;
        itemName?: string;
        itemType?: string;
        enteredUom?: string;
        enteredQty: number;
        unitCost: number;
        notes?: string;
      }>;
    }
  ) => void;
}> = ({
  voucher,
  items = [],
  categories = [],
  warehouses = [],
  itemTypes = DEFAULT_WMS_ITEM_TYPES,
  onClose,
  onSave,
}) => {
  const [voucherType, setVoucherType] = useState<WmsVoucherType>('GRN');
  const [warehouseId, setWarehouseId] = useState('WH-MAIN');
  const [targetWarehouseId, setTargetWarehouseId] = useState('WH-TND');
  const [voucherDate, setVoucherDate] = useState('');
  const [beneficiaryEntity, setBeneficiaryEntity] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [roomOrSite, setRoomOrSite] = useState('');
  const [notes, setNotes] = useState('');
  const [lineEdits, setLineEdits] = useState<VoucherLineDraft[]>([]);

  useEffect(() => {
    if (!voucher) return;
    setVoucherType(voucher.voucherType);
    setWarehouseId(voucher.warehouseId);
    setTargetWarehouseId(voucher.targetWarehouseId || warehouses[1]?.id || 'WH-TND');
    setVoucherDate(voucher.voucherDate);
    setBeneficiaryEntity(voucher.beneficiaryEntity || '');
    setRecipientName(voucher.recipientName || '');
    setSupplierName(voucher.supplierName || '');
    setRoomOrSite(voucher.roomOrSite || '');
    setNotes(voucher.notes || '');
    setLineEdits(
      voucher.lines.map((l) => {
        const matched = items.find((i) => i.id === l.itemId);
        const catCode = categories.find((c) => c.id === matched?.categoryId)?.code;
        return {
          id: l.id,
          mode: 'EXISTING',
          itemId: l.itemId,
          itemName: l.itemName,
          newItemName: '',
          newItemCategoryId: matched?.categoryId || categories[0]?.id || 'CAT-MEP',
          itemType: l.itemType || (matched ? resolveItemTypeLabel(matched, catCode) : ''),
          enteredUom: l.enteredUom || matched?.baseUom || 'حبة',
          enteredQty: String(l.enteredQty),
          unitCost: String(l.unitCost || 0),
          notes: l.notes || '',
        };
      })
    );
  }, [voucher, items, categories, warehouses]);

  if (!voucher) return null;

  const addExistingRow = () => {
    const first = items[0];
    const catCode = categories.find((c) => c.id === first?.categoryId)?.code;
    setLineEdits((prev) => [
      ...prev,
      {
        mode: first ? 'EXISTING' : 'NEW',
        itemId: first?.id || '__NEW__',
        itemName: first?.nameAr || '',
        newItemName: '',
        newItemCategoryId: first?.categoryId || categories[0]?.id || 'CAT-MEP',
        itemType: first ? resolveItemTypeLabel(first, catCode) : itemTypes[0] || 'مستهلك تشغيلي',
        enteredUom: first?.baseUom || 'حبة',
        enteredQty: '1',
        unitCost: String(first?.avgUnitCost || 0),
        notes: '',
      },
    ]);
  };

  const addNewItemRow = () => {
    setLineEdits((prev) => [
      ...prev,
      {
        mode: 'NEW',
        itemId: '__NEW__',
        itemName: '',
        newItemName: '',
        newItemCategoryId: categories[0]?.id || 'CAT-MEP',
        itemType: itemTypes[0] || 'مستهلك تشغيلي',
        enteredUom: 'حبة',
        enteredQty: '1',
        unitCost: '0',
        notes: '',
      },
    ]);
  };

  const updateRow = (idx: number, patch: Partial<VoucherLineDraft>) => {
    setLineEdits((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        if (patch.itemId && patch.itemId !== '__NEW__') {
          const matched = items.find((it) => it.id === patch.itemId);
          if (matched) {
            const catCode = categories.find((c) => c.id === matched.categoryId)?.code;
            next.mode = 'EXISTING';
            next.itemName = matched.nameAr;
            next.enteredUom = matched.baseUom;
            next.unitCost = String(matched.avgUnitCost || 0);
            next.itemType = resolveItemTypeLabel(matched, catCode);
            next.newItemCategoryId = matched.categoryId;
          }
        }
        return next;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(voucher.id, {
      voucherType,
      warehouseId,
      targetWarehouseId: voucherType === 'STR' ? targetWarehouseId : undefined,
      voucherDate,
      beneficiaryEntity: beneficiaryEntity.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      roomOrSite: roomOrSite.trim() || undefined,
      notes: notes.trim() || undefined,
      replaceAllLines: true,
      lines: lineEdits.map((l) => ({
        id: l.id,
        itemId: l.mode === 'NEW' ? '__NEW__' : l.itemId,
        newItemName: l.mode === 'NEW' ? l.newItemName.trim() : undefined,
        newItemCategoryId: l.newItemCategoryId || undefined,
        itemName: l.mode === 'EXISTING' ? l.itemName.trim() : undefined,
        itemType: l.itemType.trim() || undefined,
        enteredUom: l.enteredUom.trim() || 'حبة',
        enteredQty: Number(l.enteredQty) || 1,
        unitCost: Number(l.unitCost) || 0,
        notes: l.notes.trim() || undefined,
      })),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 md:p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#141414] text-white">
              {voucher.voucherNo} ({voucher.voucherType})
            </span>
            <h3 className="text-lg font-bold text-[#141414] mt-1">تحرير الإذن المخزني والأصناف والنوع</h3>
            <p className="text-[11px] text-[#707070]">
              يمكنك تعديل نوع الإذن والأصناف والنوع والوحدة والكميات أو إضافة أصناف جديدة وسيُعاد ضبط الرصيد تلقائياً مع دعم التراجع (Undo)
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">نوع الإذن</label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value as WmsVoucherType)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              >
                <option value="GRN">توريد / وارد (GRN)</option>
                <option value="GIN">صرف / صادر (GIN)</option>
                <option value="SRN">مرتجع مستودع (SRN)</option>
                <option value="STR">تحويل مستودعات (STR)</option>
                <option value="ADJ">تسوية جرد (ADJ)</option>
                <option value="SAMPLE">عينة تجارية (SAMPLE)</option>
                <option value="RTV">مرتجع مورد (RTV)</option>
                <option value="SCRAP">إتلاف (SCRAP)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">التاريخ</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
            {warehouses.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">المستودع</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {voucherType === 'STR' && warehouses.length > 0 ? (
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">المستودع المستلم</label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">الجهة المستفيدة / مركز التكلفة</label>
                <input
                  list="wms-edit-beneficiaries"
                  value={beneficiaryEntity}
                  onChange={(e) => setBeneficiaryEntity(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
                />
                <datalist id="wms-edit-beneficiaries">
                  {WMS_BENEFICIARIES.map((b) => (
                    <option key={b.id} value={b.nameAr} />
                  ))}
                </datalist>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المستلم</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المورد</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الغرفة / الموقع</label>
              <input
                type="text"
                value={roomOrSite}
                onChange={(e) => setRoomOrSite(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#141414]">جدول تحرير وإضافة الأصناف في الإذن ({lineEdits.length}):</span>
              <div className="flex items-center gap-1.5">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={addExistingRow}
                    className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-xs font-bold text-[#141414] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة صنف من الدليل</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={addNewItemRow}
                  className="px-3 py-1 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة صنف جديد</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2 min-w-[200px]">الصنف</th>
                    <th className="p-2 min-w-[140px]">اسم الصنف (تحرير)</th>
                    <th className="p-2 min-w-[140px]">النوع</th>
                    <th className="p-2 w-24">الكمية</th>
                    <th className="p-2 w-28">الوحدة</th>
                    <th className="p-2 w-28">التكلفة ⃁</th>
                    <th className="p-2 w-14 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {lineEdits.map((l, idx) => (
                    <tr key={l.id || idx} className="hover:bg-[#fafafa]">
                      <td className="p-2">
                        {l.mode === 'NEW' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              required
                              value={l.newItemName}
                              onChange={(e) => updateRow(idx, { newItemName: e.target.value })}
                              placeholder="اسم الصنف الجديد..."
                              className="w-full rounded-[10px] bg-[#f0f0f0] border border-[#141414] px-2.5 py-1.5 text-xs font-bold"
                            />
                            {items.length > 0 && (
                              <button
                                type="button"
                                onClick={() => updateRow(idx, { mode: 'EXISTING', itemId: items[0].id })}
                                className="px-2 py-1 rounded-full bg-[#f3f3f3] text-[10px] font-bold"
                              >
                                موجود
                              </button>
                            )}
                          </div>
                        ) : items.length > 0 ? (
                          <select
                            value={l.itemId}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                updateRow(idx, { mode: 'NEW', itemId: '__NEW__' });
                              } else {
                                updateRow(idx, { itemId: e.target.value });
                              }
                            }}
                            className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-xs font-semibold"
                          >
                            {items.map((it) => (
                              <option key={it.id} value={it.id}>
                                [{it.sku}] {it.nameAr}
                              </option>
                            ))}
                            <option value="__NEW__">+ صنف جديد...</option>
                          </select>
                        ) : (
                          <span className="font-bold text-[#141414]">{l.itemName}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={l.mode === 'NEW' ? l.newItemName : l.itemName}
                          onChange={(e) =>
                            l.mode === 'NEW'
                              ? updateRow(idx, { newItemName: e.target.value })
                              : updateRow(idx, { itemName: e.target.value })
                          }
                          placeholder="تعديل اسم الصنف..."
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          list={`wms-edit-vch-type-${idx}`}
                          value={l.itemType}
                          onChange={(e) => updateRow(idx, { itemType: e.target.value })}
                          placeholder="النوع..."
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs"
                        />
                        <datalist id={`wms-edit-vch-type-${idx}`}>
                          {itemTypes.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={l.enteredQty}
                          onChange={(e) => updateRow(idx, { enteredQty: e.target.value })}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 font-mono text-xs font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          list={`wms-edit-vch-uom-${idx}`}
                          value={l.enteredUom}
                          onChange={(e) => updateRow(idx, { enteredUom: e.target.value })}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs font-semibold"
                        />
                        <datalist id={`wms-edit-vch-uom-${idx}`}>
                          {DEFAULT_WMS_UNITS.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.unitCost}
                          onChange={(e) => updateRow(idx, { unitCost: e.target.value })}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 font-mono text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {lineEdits.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLineEdits((prev) => prev.filter((_, i) => i !== idx))}
                            className="w-7 h-7 rounded-full border border-[#e0e0e0] inline-flex items-center justify-center text-[#707070] hover:bg-[#141414] hover:text-white"
                            title="حذف السطر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظات الإذن</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold">
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات وتحديث الرصيد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SOFT-DELETE RECYCLE BIN MODAL (سلة المحذوفات والاستعادة)
// ============================================================================
export const WmsRecycleBinModal: React.FC<{
  open: boolean;
  entries: WmsRecycleBinEntry[];
  onRestore: (entryId: string) => void;
  onPurge: (entryId: string) => void;
  onClose: () => void;
}> = ({ open, entries, onRestore, onPurge, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#141414] text-white flex items-center justify-center">
              <ArchiveRestore className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141414]">سلة المحذوفات الآمنة والاستعادة ({entries.length})</h3>
              <p className="text-xs text-[#707070]">يمكنك استعادة أي صنف أو إذن محذوف بضغطة زر وإرجاع أثره المخزني تلقائياً</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#707070] bg-[#f3f3f3] rounded-[18px]">
            سلة المحذوفات فارغة حالياً.
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-[16px] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">
                      {entry.entityType === 'ITEM' ? 'صنف SKU' : 'إذن مخزني'}
                    </span>
                    <span className="text-xs font-bold text-[#141414]">{entry.label}</span>
                  </div>
                  <div className="text-[11px] text-[#707070]">
                    حُذف بواسطة {entry.deletedBy} بتاريخ {entry.deletedAt.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRestore(entry.id)}
                    className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPurge(entry.id)}
                    className="px-3 py-1.5 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#707070] hover:text-[#141414] flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف نهائي</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
