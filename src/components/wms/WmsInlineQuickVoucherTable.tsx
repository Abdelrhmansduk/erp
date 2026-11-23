import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  X,
  Table as TableIcon,
} from 'lucide-react';
import {
  WmsCategory,
  WmsItem,
  WmsVoucherType,
  WmsWarehouse,
} from '../../types/wms';
import { CreateVoucherInput } from '../../services/wms/wmsEngineService';
import { WMS_BENEFICIARIES } from '../../services/wms/wmsExcelMigrationSeed';
import {
  DEFAULT_WMS_ITEM_TYPES,
  DEFAULT_WMS_UNITS,
  matchesSmartSearch,
  resolveItemTypeLabel,
} from '../../utils/wmsSearchUtils';

interface QuickVoucherRow {
  rowId: string;
  voucherType: WmsVoucherType;
  voucherDate: string;
  mode: 'EXISTING' | 'NEW';
  itemId: string;
  newItemName: string;
  categoryId: string;
  itemType: string;
  qty: string;
  uom: string;
  unitCost: string;
  warehouseId: string;
  targetWarehouseId: string;
  partyOrRecipient: string;
  notes: string;
}

export const WmsInlineQuickVoucherTable: React.FC<{
  items: WmsItem[];
  categories: WmsCategory[];
  warehouses: WmsWarehouse[];
  itemTypes?: string[];
  defaultType?: WmsVoucherType;
  presetItemId?: string | null;
  getAvailableQty: (itemId: string) => number;
  onPostVoucher: (payload: CreateVoucherInput) => { ok: boolean; error?: string };
  onNotify: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onClose?: () => void;
  title?: string;
}> = ({
  items,
  categories,
  warehouses,
  itemTypes = DEFAULT_WMS_ITEM_TYPES,
  defaultType = 'GRN',
  presetItemId,
  getAvailableQty,
  onPostVoucher,
  onNotify,
  onClose,
  title = 'جدول الإضافة السريعة لأذونات الصرف والتوريد (تحرير وإدخال مباشر في الجدول)',
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [filterQuery, setFilterQuery] = useState('');

  const createRow = (type: WmsVoucherType = defaultType, targetItem?: WmsItem): QuickVoucherRow => {
    const it = targetItem || items[0];
    const catCode = categories.find((c) => c.id === it?.categoryId)?.code;
    return {
      rowId: `QROW-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      voucherType: type,
      voucherDate: today,
      mode: it ? 'EXISTING' : 'NEW',
      itemId: it?.id || '__NEW__',
      newItemName: '',
      categoryId: it?.categoryId || categories[0]?.id || 'CAT-MEP',
      itemType: it ? resolveItemTypeLabel(it, catCode) : itemTypes[0] || 'مستهلك تشغيلي',
      qty: '1',
      uom: it?.baseUom || 'حبة',
      unitCost: String(it?.avgUnitCost || 0),
      warehouseId: it?.defaultWarehouseId || warehouses[0]?.id || 'WH-MAIN',
      targetWarehouseId: warehouses[1]?.id || 'WH-TND',
      partyOrRecipient:
        type === 'GRN' ? 'مشتريات كاس / مورد مباشر' : WMS_BENEFICIARIES[0]?.nameAr || 'تشغيل المكاتب',
      notes: '',
    };
  };

  const [rows, setRows] = useState<QuickVoucherRow[]>(() => {
    const pre = presetItemId ? items.find((i) => i.id === presetItemId) : undefined;
    return [createRow(defaultType, pre)];
  });

  React.useEffect(() => {
    if (!presetItemId) return;
    const pre = items.find((i) => i.id === presetItemId);
    if (pre) {
      setRows([createRow(defaultType, pre)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetItemId, defaultType]);

  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return items;
    return items.filter((it) => {
      const cat = categories.find((c) => c.id === it.categoryId);
      return matchesSmartSearch(filterQuery, [
        it.nameAr,
        it.nameEn,
        it.sku,
        it.barcode,
        it.itemType,
        cat?.nameAr,
        cat?.code,
      ]);
    });
  }, [items, categories, filterQuery]);

  const updateRow = (idx: number, patch: Partial<QuickVoucherRow>) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        if (patch.voucherType && patch.voucherType !== r.voucherType) {
          if (patch.voucherType === 'GRN' && r.partyOrRecipient === WMS_BENEFICIARIES[0]?.nameAr) {
            next.partyOrRecipient = 'مشتريات كاس / مورد مباشر';
          } else if (patch.voucherType === 'GIN' && r.partyOrRecipient === 'مشتريات كاس / مورد مباشر') {
            next.partyOrRecipient = WMS_BENEFICIARIES[0]?.nameAr || 'تشغيل المكاتب';
          }
        }
        if (patch.itemId && patch.itemId !== '__NEW__') {
          const matched = items.find((x) => x.id === patch.itemId);
          if (matched) {
            const catCode = categories.find((c) => c.id === matched.categoryId)?.code;
            next.mode = 'EXISTING';
            next.categoryId = matched.categoryId;
            next.itemType = resolveItemTypeLabel(matched, catCode);
            next.uom = matched.baseUom;
            next.unitCost = String(matched.avgUnitCost || 0);
            next.warehouseId = matched.defaultWarehouseId || r.warehouseId;
          }
        } else if (patch.itemId === '__NEW__') {
          next.mode = 'NEW';
        }
        return next;
      })
    );
  };

  const buildPayloadFromRow = (r: QuickVoucherRow): CreateVoucherInput => ({
    voucherType: r.voucherType,
    voucherDate: r.voucherDate || today,
    warehouseId: r.warehouseId,
    targetWarehouseId: r.voucherType === 'STR' ? r.targetWarehouseId : undefined,
    beneficiaryEntity:
      r.voucherType !== 'GRN' && r.voucherType !== 'RTV'
        ? r.partyOrRecipient.trim() || 'تشغيل المكاتب'
        : undefined,
    supplierName:
      r.voucherType === 'GRN' || r.voucherType === 'RTV'
        ? r.partyOrRecipient.trim() || 'مورد مباشر'
        : undefined,
    recipientName: r.partyOrRecipient.trim() || undefined,
    notes: r.notes.trim() || undefined,
    lines: [
      {
        itemId: r.mode === 'NEW' ? '__NEW__' : r.itemId,
        newItemName: r.mode === 'NEW' ? r.newItemName.trim() : undefined,
        newItemCategoryId: r.categoryId,
        itemType: r.itemType.trim() || undefined,
        enteredQty: Number(r.qty || 0),
        enteredUom: r.uom.trim() || 'حبة',
        unitCost: Number(r.unitCost || 0),
        notes: r.notes.trim() || undefined,
      },
    ],
  });

  const postSingleRow = (idx: number) => {
    const r = rows[idx];
    if (r.mode === 'NEW' && !r.newItemName.trim()) {
      onNotify('تنبيه', 'يرجى كتابة اسم الصنف الجديد أولاً في خانة الصنف.', 'error');
      return;
    }
    const res = onPostVoucher(buildPayloadFromRow(r));
    if (!res.ok) {
      onNotify('تعذر الترحيل', res.error || 'تحقق من الكمية أو الرصيد المتاح.', 'error');
      return;
    }
    if (rows.length > 1) {
      setRows((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setRows([createRow(r.voucherType)]);
    }
  };

  const postAllRows = () => {
    let posted = 0;
    const remaining: QuickVoucherRow[] = [];
    for (const r of rows) {
      if (r.mode === 'NEW' && !r.newItemName.trim()) {
        remaining.push(r);
        continue;
      }
      const res = onPostVoucher(buildPayloadFromRow(r));
      if (res.ok) {
        posted += 1;
      } else {
        remaining.push(r);
        onNotify('تنبيه على أحد السطور', res.error || 'تعذر ترحيل السطر.', 'warning');
      }
    }
    if (posted > 0) {
      onNotify('تم ترحيل الجدول بنجاح', `تم اعتماد وترحيل (${posted}) إذن مخزني وتحديث الأرصدة فوراً.`, 'success');
    }
    setRows(remaining.length > 0 ? remaining : [createRow(defaultType)]);
  };

  return (
    <div className="bg-[#ffffff] border-2 border-[#141414] rounded-[24px] p-4 space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-7 h-7 rounded-full bg-[#141414] text-white flex items-center justify-center">
            <TableIcon className="w-3.5 h-3.5" />
          </span>
          <div>
            <h4 className="text-xs md:text-sm font-bold text-[#141414]">{title}</h4>
            <p className="text-[11px] text-[#707070]">
              أضف سطراً أو عدة سطور (توريد / صرف / مرتجع / تحويل / تسوية) أو اكتب صنفاً جديداً مباشرة في الخانة واعتمدها بضغطة واحدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-full bg-[#f0f0f0] px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-[#707070] shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="بحث سريع في قائمة الأصناف..."
              className="bg-transparent text-xs text-[#141414] focus:outline-none w-40"
            />
            {filterQuery && (
              <button type="button" onClick={() => setFilterQuery('')} className="text-[#707070] hover:text-[#141414]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, createRow('GRN')])}
            className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-xs font-bold text-[#141414] flex items-center gap-1 transition-colors"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ سطر توريد</span>
          </button>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, createRow('GIN')])}
            className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-xs font-bold text-[#141414] flex items-center gap-1 transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ سطر صرف</span>
          </button>
          <button
            type="button"
            onClick={postAllRows}
            className="px-4 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>اعتماد وترحيل الكل ({rows.length})</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
              title="إغلاق الجدول السريع"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
            <tr>
              <th className="p-2 min-w-[115px]">نوع الإذن</th>
              <th className="p-2 min-w-[115px]">التاريخ</th>
              <th className="p-2 min-w-[210px]">الصنف (اختر أو + صنف جديد)</th>
              <th className="p-2 min-w-[130px]">التصنيف</th>
              <th className="p-2 min-w-[135px]">النوع</th>
              <th className="p-2 w-20">الكمية</th>
              <th className="p-2 w-24">الوحدة</th>
              <th className="p-2 w-24">التكلفة ⃁</th>
              <th className="p-2 min-w-[135px]">المستودع</th>
              <th className="p-2 min-w-[155px]">الجهة / المورد / المستلم</th>
              <th className="p-2 w-24 text-center">تنفيذ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]">
            {rows.map((r, idx) => {
              const selectedItem = r.mode === 'EXISTING' ? items.find((i) => i.id === r.itemId) : undefined;
              const avail = selectedItem ? getAvailableQty(selectedItem.id) : 0;
              const options =
                selectedItem && !filteredItems.some((x) => x.id === selectedItem.id)
                  ? [selectedItem, ...filteredItems]
                  : filteredItems;

              return (
                <tr key={r.rowId} className="hover:bg-[#fafafa]">
                  <td className="p-1.5">
                    <select
                      value={r.voucherType}
                      onChange={(e) => updateRow(idx, { voucherType: e.target.value as WmsVoucherType })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-bold text-[#141414]"
                    >
                      <option value="GRN">+ توريد (GRN)</option>
                      <option value="GIN">- صرف (GIN)</option>
                      <option value="SRN">مرتجع (SRN)</option>
                      <option value="STR">تحويل (STR)</option>
                      <option value="ADJ">تسوية (ADJ)</option>
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="date"
                      value={r.voucherDate}
                      onChange={(e) => updateRow(idx, { voucherDate: e.target.value })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-mono"
                    />
                  </td>
                  <td className="p-1.5">
                    {r.mode === 'NEW' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={r.newItemName}
                          onChange={(e) => updateRow(idx, { newItemName: e.target.value })}
                          placeholder="اكتب اسم الصنف الجديد..."
                          className="w-full rounded-[10px] bg-[#f0f0f0] border border-[#141414] px-2 py-1.5 text-xs font-bold"
                        />
                        {items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => updateRow(idx, { mode: 'EXISTING', itemId: items[0].id })}
                            className="px-2 py-1 rounded-full bg-[#f3f3f3] text-[10px] font-bold shrink-0"
                          >
                            موجود
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <select
                          value={r.itemId}
                          onChange={(e) => {
                            if (e.target.value === '__NEW__') updateRow(idx, { mode: 'NEW', itemId: '__NEW__' });
                            else updateRow(idx, { itemId: e.target.value });
                          }}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-semibold text-[#141414]"
                        >
                          {options.map((it) => (
                            <option key={it.id} value={it.id}>
                              [{it.sku}] {it.nameAr} (متاح: {getAvailableQty(it.id)})
                            </option>
                          ))}
                          <option value="__NEW__">+ كتابة صنف جديد...</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => updateRow(idx, { mode: 'NEW', itemId: '__NEW__' })}
                          title="إضافة صنف جديد مباشرة"
                          className="w-6 h-6 shrink-0 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {r.mode === 'EXISTING' && selectedItem && (
                      <div className="text-[10px] text-[#707070] mt-0.5 font-mono">
                        متاح: {avail} {selectedItem.baseUom}
                      </div>
                    )}
                  </td>
                  <td className="p-1.5">
                    <select
                      value={r.categoryId}
                      onChange={(e) => updateRow(idx, { categoryId: e.target.value })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-semibold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input
                      list={`quick-tbl-types-${idx}`}
                      value={r.itemType}
                      onChange={(e) => updateRow(idx, { itemType: e.target.value })}
                      placeholder="النوع..."
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px]"
                    />
                    <datalist id={`quick-tbl-types-${idx}`}>
                      {itemTypes.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={r.qty}
                      onChange={(e) => updateRow(idx, { qty: e.target.value })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-xs font-mono font-bold text-[#141414]"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      list={`quick-tbl-uoms-${idx}`}
                      value={r.uom}
                      onChange={(e) => updateRow(idx, { uom: e.target.value })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-semibold"
                    />
                    <datalist id={`quick-tbl-uoms-${idx}`}>
                      {DEFAULT_WMS_UNITS.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.unitCost}
                      onChange={(e) => updateRow(idx, { unitCost: e.target.value })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-mono"
                    />
                  </td>
                  <td className="p-1.5 space-y-1">
                    <select
                      value={r.warehouseId}
                      onChange={(e) => updateRow(idx, { warehouseId: e.target.value })}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-semibold"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.nameAr}
                        </option>
                      ))}
                    </select>
                    {r.voucherType === 'STR' && (
                      <select
                        value={r.targetWarehouseId}
                        onChange={(e) => updateRow(idx, { targetWarehouseId: e.target.value })}
                        className="w-full rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] px-2 py-1 text-[10px] font-semibold"
                      >
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            إلى: {w.nameAr}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-1.5">
                    <input
                      list={`quick-tbl-party-${idx}`}
                      value={r.partyOrRecipient}
                      onChange={(e) => updateRow(idx, { partyOrRecipient: e.target.value })}
                      placeholder={r.voucherType === 'GRN' ? 'اسم المورد...' : 'الجهة المستفيدة / المستلم...'}
                      className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px]"
                    />
                    <datalist id={`quick-tbl-party-${idx}`}>
                      {WMS_BENEFICIARIES.map((b) => (
                        <option key={b.id} value={b.nameAr} />
                      ))}
                    </datalist>
                  </td>
                  <td className="p-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => postSingleRow(idx)}
                        className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold hover:bg-[#262626]"
                        title="ترحيل هذا السطر فوراً"
                      >
                        ترحيل
                      </button>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-6 h-6 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#707070] hover:bg-[#141414] hover:text-white"
                          title="حذف السطر"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
