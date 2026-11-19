import React, { useEffect, useState } from 'react';
import { X, Save, RotateCcw, Trash2, ArchiveRestore } from 'lucide-react';
import {
  WmsCategory,
  WmsItem,
  WmsRecycleBinEntry,
  WmsStockVoucher,
  WmsTrackingMode,
  WmsWarehouse,
} from '../../types/wms';
import { WMS_BENEFICIARIES } from '../../services/wms/wmsExcelMigrationSeed';

// ============================================================================
// 1. EDIT ITEM MODAL (تعديل الصنف)
// ============================================================================
export const WmsEditItemModal: React.FC<{
  item: WmsItem | null;
  categories: WmsCategory[];
  warehouses: WmsWarehouse[];
  onClose: () => void;
  onSave: (itemId: string, patch: Partial<WmsItem>) => void;
}> = ({ item, categories, warehouses, onClose, onSave }) => {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState('CAT-MEP');
  const [defaultWarehouseId, setDefaultWarehouseId] = useState('WH-MAIN');
  const [defaultLocationCode, setDefaultLocationCode] = useState('');
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

  useEffect(() => {
    if (!item) return;
    setNameAr(item.nameAr);
    setNameEn(item.nameEn || '');
    setCategoryId(item.categoryId);
    setDefaultWarehouseId(item.defaultWarehouseId);
    setDefaultLocationCode(item.defaultLocationCode);
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
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;
    onSave(item.id, {
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || undefined,
      categoryId,
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3f3f3]">
              {item.sku}
            </span>
            <h3 className="text-lg font-bold text-[#141414] mt-1">تعديل بيانات الصنف</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الفئة</label>
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
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المستودع</label>
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">الحد الأدنى</label>
              <input
                type="number"
                min={0}
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
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
// 2. EDIT VOUCHER MODAL (تعديل الإذن المخزني + تحديث الرصيد تلقائياً)
// ============================================================================
export const WmsEditVoucherModal: React.FC<{
  voucher: WmsStockVoucher | null;
  onClose: () => void;
  onSave: (
    voucherId: string,
    patch: {
      voucherDate?: string;
      beneficiaryEntity?: string;
      recipientName?: string;
      supplierName?: string;
      roomOrSite?: string;
      notes?: string;
      lines?: Array<{ id: string; enteredQty: number; unitCost: number }>;
    }
  ) => void;
}> = ({ voucher, onClose, onSave }) => {
  const [voucherDate, setVoucherDate] = useState('');
  const [beneficiaryEntity, setBeneficiaryEntity] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [roomOrSite, setRoomOrSite] = useState('');
  const [notes, setNotes] = useState('');
  const [lineEdits, setLineEdits] = useState<Array<{ id: string; itemName: string; uom: string; enteredQty: string; unitCost: string }>>([]);

  useEffect(() => {
    if (!voucher) return;
    setVoucherDate(voucher.voucherDate);
    setBeneficiaryEntity(voucher.beneficiaryEntity || '');
    setRecipientName(voucher.recipientName || '');
    setSupplierName(voucher.supplierName || '');
    setRoomOrSite(voucher.roomOrSite || '');
    setNotes(voucher.notes || '');
    setLineEdits(
      voucher.lines.map((l) => ({
        id: l.id,
        itemName: l.itemName,
        uom: l.enteredUom,
        enteredQty: String(l.enteredQty),
        unitCost: String(l.unitCost || 0),
      }))
    );
  }, [voucher]);

  if (!voucher) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(voucher.id, {
      voucherDate,
      beneficiaryEntity: beneficiaryEntity.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      supplierName: supplierName.trim() || undefined,
      roomOrSite: roomOrSite.trim() || undefined,
      notes: notes.trim() || undefined,
      lines: lineEdits.map((l) => ({
        id: l.id,
        enteredQty: Number(l.enteredQty) || 1,
        unitCost: Number(l.unitCost) || 0,
      })),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#141414] text-white">
              {voucher.voucherNo} ({voucher.voucherType})
            </span>
            <h3 className="text-lg font-bold text-[#141414] mt-1">تعديل الإذن المخزني</h3>
            <p className="text-[11px] text-[#707070]">أي تعديل على الكميات يُعيد ضبط الأرصدة تلقائياً ويُوثّق في سجل التدقيق مع إمكانية التراجع (Undo)</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">التاريخ</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
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
            <div className="text-xs font-bold text-[#141414]">تعديل كميات وتكاليف البنود:</div>
            {lineEdits.map((l, idx) => (
              <div key={l.id} className="p-3 rounded-[14px] bg-[#f3f3f3] grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-6 font-bold text-[#141414]">
                  {l.itemName} <span className="text-[#707070] font-normal">({l.uom})</span>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    value={l.enteredQty}
                    onChange={(e) =>
                      setLineEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, enteredQty: e.target.value } : x)))
                    }
                    className="w-full rounded-[10px] bg-[#ffffff] px-2.5 py-1.5 font-mono text-xs"
                    placeholder="الكمية"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.unitCost}
                    onChange={(e) =>
                      setLineEdits((prev) => prev.map((x, i) => (i === idx ? { ...x, unitCost: e.target.value } : x)))
                    }
                    className="w-full rounded-[10px] bg-[#ffffff] px-2.5 py-1.5 font-mono text-xs"
                    placeholder="التكلفة ⃁"
                  />
                </div>
              </div>
            ))}
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
