import React, { useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  QrCode,
  CheckCircle2,
  FileText,
  AlertCircle,
  Barcode,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ArrowRightLeft,
  Search,
  Edit3,
  Copy,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  WmsCategory,
  WmsConditionStatus,
  WmsIssuePurpose,
  WmsItem,
  WmsSettings,
  WmsStockCardEntry,
  WmsStockVoucher,
  WmsTrackingMode,
  WmsVoucherType,
  WmsWarehouse,
} from '../../types/wms';
import { WMS_BENEFICIARIES } from '../../services/wms/wmsExcelMigrationSeed';
import { CreateVoucherInput } from '../../services/wms/wmsEngineService';
import { KAS_ALLOWED_EMPLOYEES } from '../../config/kasAllowedEmails';
import { generateRealCode128BarcodeSvg, generateRealQrSvg } from '../../utils/realBarcodeGenerator';
import {
  DEFAULT_WMS_ITEM_TYPES,
  DEFAULT_WMS_UNITS,
  matchesSmartSearch,
  resolveItemTypeLabel,
} from '../../utils/wmsSearchUtils';

// ============================================================================
// 1. CREATE ITEM (SKU + CATEGORY + ITEM TYPE + MULTI-UOM) MODAL
// ============================================================================
export const WmsCreateItemModal: React.FC<{
  open: boolean;
  onClose: () => void;
  categories: WmsCategory[];
  warehouses: WmsWarehouse[];
  itemTypes?: string[];
  onCreateCategory?: (input: { nameAr: string; code?: string }) => WmsCategory | null;
  onCreateWarehouse?: (input: {
    nameAr: string;
    warehouseType?: WmsWarehouse['warehouseType'];
    branch?: string;
  }) => WmsWarehouse | null;
  onCreateItemType?: (typeName: string) => string | null;
  onSubmit: (payload: {
    nameAr: string;
    nameEn?: string;
    categoryId: string;
    itemType?: string;
    baseUom: string;
    secondaryUomName?: string;
    secondaryUomFactor?: number;
    trackingMode: WmsTrackingMode;
    avgUnitCost: number;
    minQty: number;
    reorderPoint: number;
    maxQty: number;
    defaultWarehouseId: string;
    defaultLocationCode: string;
    isCustodyEligible: boolean;
    isFastConsumable: boolean;
    isSampleItem: boolean;
    initialQty: number;
    notes?: string;
  }) => void;
}> = ({
  open,
  onClose,
  categories,
  warehouses,
  itemTypes = DEFAULT_WMS_ITEM_TYPES,
  onCreateCategory,
  onCreateWarehouse,
  onCreateItemType,
  onSubmit,
}) => {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'CAT-MEP');
  const [itemType, setItemType] = useState(itemTypes[0] || 'مستهلك تشغيلي');
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newWarehouseType, setNewWarehouseType] = useState<WmsWarehouse['warehouseType']>('MAIN');
  const [newWarehouseBranch, setNewWarehouseBranch] = useState('الرياض');
  const [baseUom, setBaseUom] = useState('حبة');
  const [secondaryUomName, setSecondaryUomName] = useState('');
  const [secondaryUomFactor, setSecondaryUomFactor] = useState('12');
  const [trackingMode, setTrackingMode] = useState<WmsTrackingMode>('NONE');
  const [avgUnitCost, setAvgUnitCost] = useState('0');
  const [minQty, setMinQty] = useState('2');
  const [reorderPoint, setReorderPoint] = useState('5');
  const [maxQty, setMaxQty] = useState('100');
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(warehouses[0]?.id || 'WH-MAIN');
  const [defaultLocationCode, setDefaultLocationCode] = useState('Z1-R1-B1');
  const [isCustodyEligible, setIsCustodyEligible] = useState(false);
  const [isFastConsumable, setIsFastConsumable] = useState(false);
  const [isSampleItem, setIsSampleItem] = useState(false);
  const [initialQty, setInitialQty] = useState('0');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;
    onSubmit({
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || undefined,
      categoryId,
      itemType: itemType.trim() || undefined,
      baseUom: baseUom.trim() || 'حبة',
      secondaryUomName: secondaryUomName.trim() || undefined,
      secondaryUomFactor: secondaryUomName.trim() ? Math.max(1, Number(secondaryUomFactor) || 1) : undefined,
      trackingMode,
      avgUnitCost: Math.max(0, Number(avgUnitCost) || 0),
      minQty: Math.max(0, Number(minQty) || 0),
      reorderPoint: Math.max(0, Number(reorderPoint) || 0),
      maxQty: Math.max(1, Number(maxQty) || 100),
      defaultWarehouseId,
      defaultLocationCode: defaultLocationCode.trim() || 'Z1-R1-B1',
      isCustodyEligible,
      isFastConsumable,
      isSampleItem,
      initialQty: Math.max(0, Number(initialQty) || 0),
      notes: notes.trim() || undefined,
    });
    setNameAr('');
    setNameEn('');
    setSecondaryUomName('');
    setInitialQty('0');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <h3 className="text-lg font-bold text-[#141414]">إضافة صنف جديد إلى دليل الأصناف الموحّد (SKU)</h3>
            <p className="text-xs text-[#707070] mt-0.5">يتم توليد رمز SKU وباركود تلقائياً مع تحديد التصنيف والنوع ووحدات القياس</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]">
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
                placeholder="مثال: كشاف خارجي LED 30W"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-sm text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الاسم بالإنجليزية (اختياري)</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Outdoor LED Floodlight 30W"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-sm text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#141414]">التصنيف الرئيسي</label>
                {onCreateCategory && (
                  <button
                    type="button"
                    data-testid="wms-add-category-toggle"
                    onClick={() => setShowAddCategory((prev) => !prev)}
                    title="إضافة فئة تصنيفية جديدة إلى القائمة"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>تصنيف</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-semibold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
                {onCreateCategory && (
                  <button
                    type="button"
                    onClick={() => setShowAddCategory((prev) => !prev)}
                    title="إضافة فئة جديدة"
                    aria-label="إضافة فئة تصنيفية جديدة"
                    className="w-9 h-9 shrink-0 rounded-[14px] bg-[#f3f3f3] hover:bg-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-[#141414] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showAddCategory && onCreateCategory && (
                <div className="mt-2 p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="text-[11px] font-bold text-[#141414]">إضافة فئة تصنيفية جديدة</div>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="اسم التصنيف (مثال: أجهزة كهربائية)"
                    className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 text-xs text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                  <input
                    type="text"
                    value={newCategoryCode}
                    onChange={(e) => setNewCategoryCode(e.target.value)}
                    placeholder="رمز مختصر اختياري (مثال: ELEC)"
                    className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 text-xs font-mono text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategoryName('');
                        setNewCategoryCode('');
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-semibold text-[#707070] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCategoryName.trim()) return;
                        const created = onCreateCategory({
                          nameAr: newCategoryName.trim(),
                          code: newCategoryCode.trim() || undefined,
                        });
                        if (created?.id) setCategoryId(created.id);
                        setNewCategoryName('');
                        setNewCategoryCode('');
                        setShowAddCategory(false);
                      }}
                      className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                    >
                      حفظ التصنيف
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Item Type (النوع) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#141414]">النوع (نوع الصنف / الموديل)</label>
                <button
                  type="button"
                  onClick={() => setShowAddType((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:opacity-90 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>نوع جديد</span>
                </button>
              </div>
              <input
                list="wms-create-item-types-list"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                placeholder="اختر النوع أو اكتب نوعاً جديداً..."
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-semibold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
              <datalist id="wms-create-item-types-list">
                {itemTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {showAddType && (
                <div className="mt-2 p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="اكتب النوع الجديد (مثال: أدوات سلامة)"
                    className="flex-1 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 text-xs text-[#141414]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTypeName.trim()) return;
                      const saved = onCreateItemType ? onCreateItemType(newTypeName.trim()) : newTypeName.trim();
                      if (saved) setItemType(saved);
                      setNewTypeName('');
                      setShowAddType(false);
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                  >
                    إضافة
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#141414]">المستودع الافتراضي</label>
                {onCreateWarehouse && (
                  <button
                    type="button"
                    data-testid="wms-add-warehouse-toggle"
                    onClick={() => setShowAddWarehouse((prev) => !prev)}
                    title="إضافة مستودع جديد إلى القائمة"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>مستودع</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={defaultWarehouseId}
                  onChange={(e) => setDefaultWarehouseId(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-semibold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
                {onCreateWarehouse && (
                  <button
                    type="button"
                    onClick={() => setShowAddWarehouse((prev) => !prev)}
                    title="إضافة مستودع جديد"
                    aria-label="إضافة مستودع جديد"
                    className="w-9 h-9 shrink-0 rounded-[14px] bg-[#f3f3f3] hover:bg-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-[#141414] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showAddWarehouse && onCreateWarehouse && (
                <div className="mt-2 p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="text-[11px] font-bold text-[#141414]">إضافة مستودع جديد</div>
                  <input
                    type="text"
                    value={newWarehouseName}
                    onChange={(e) => setNewWarehouseName(e.target.value)}
                    placeholder="اسم المستودع (مثال: مستودع الدمام الفرعي)"
                    className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 text-xs text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={newWarehouseType}
                      onChange={(e) => setNewWarehouseType(e.target.value as WmsWarehouse['warehouseType'])}
                      className="rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1.5 text-[11px] font-semibold text-[#141414]"
                    >
                      <option value="MAIN">مستودع رئيسي</option>
                      <option value="PROJECT">مستودع مشروع</option>
                      <option value="TENDERS">منافسات وتوريد</option>
                      <option value="SAMPLES">معرض وعينات</option>
                      <option value="QUARANTINE">مرتجعات وحجر</option>
                    </select>
                    <input
                      type="text"
                      value={newWarehouseBranch}
                      onChange={(e) => setNewWarehouseBranch(e.target.value)}
                      placeholder="المدينة / الفرع"
                      className="rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1.5 text-[11px] text-[#141414]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddWarehouse(false);
                        setNewWarehouseName('');
                      }}
                      className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-semibold text-[#707070] cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newWarehouseName.trim()) return;
                        const created = onCreateWarehouse({
                          nameAr: newWarehouseName.trim(),
                          warehouseType: newWarehouseType,
                          branch: newWarehouseBranch.trim() || 'الرياض',
                        });
                        if (created?.id) setDefaultWarehouseId(created.id);
                        setNewWarehouseName('');
                        setShowAddWarehouse(false);
                      }}
                      className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                    >
                      حفظ المستودع
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">موقع الرف / الخانة (Bin)</label>
              <input
                type="text"
                value={defaultLocationCode}
                onChange={(e) => setDefaultLocationCode(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] space-y-3">
            <div className="text-xs font-bold text-[#141414]">هندسة وحدات القياس (Multi-UoM — قابلة للكتابة والاختيار)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#707070] mb-1">وحدة الأساس *</label>
                <input
                  list="wms-create-item-uoms"
                  value={baseUom}
                  onChange={(e) => setBaseUom(e.target.value)}
                  placeholder="حبة / كرتون / طقم..."
                  className="w-full rounded-[14px] bg-[#ffffff] px-3 py-2 text-xs font-semibold text-[#141414]"
                />
                <datalist id="wms-create-item-uoms">
                  {DEFAULT_WMS_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#707070] mb-1">وحدة تعبئة إضافية (اختياري)</label>
                <input
                  type="text"
                  value={secondaryUomName}
                  onChange={(e) => setSecondaryUomName(e.target.value)}
                  placeholder="مثال: كرتون أو درزن"
                  className="w-full rounded-[14px] bg-[#ffffff] px-3 py-2 text-xs text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#707070] mb-1">تحتوي على كم ({baseUom || 'حبة'})؟</label>
                <input
                  type="number"
                  min={1}
                  value={secondaryUomFactor}
                  onChange={(e) => setSecondaryUomFactor(e.target.value)}
                  className="w-full rounded-[14px] bg-[#ffffff] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">وضع التتبع</label>
              <select
                value={trackingMode}
                onChange={(e) => setTrackingMode(e.target.value as WmsTrackingMode)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-2.5 py-2 text-xs font-semibold text-[#141414]"
              >
                <option value="NONE">قياسي بالكمية</option>
                <option value="SERIAL">رقم تسلسلي (S/N)</option>
                <option value="LOT_EXPIRY">تشغيلة وصلاحية</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">تكلفة الوحدة (⃁)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={avgUnitCost}
                onChange={(e) => setAvgUnitCost(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">رصيد افتتاحي</label>
              <input
                type="number"
                min={0}
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">نقطة إعادة الطلب</label>
              <input
                type="number"
                min={0}
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#707070] mb-1">الحد الأقصى</label>
              <input
                type="number"
                min={1}
                value={maxQty}
                onChange={(e) => setMaxQty(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#141414] cursor-pointer">
              <input type="checkbox" checked={isCustodyEligible} onChange={(e) => setIsCustodyEligible(e.target.checked)} />
              قابل للتحويل التلقائي كعهدة موظف
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#141414] cursor-pointer">
              <input type="checkbox" checked={isFastConsumable} onChange={(e) => setIsFastConsumable(e.target.checked)} />
              مستهلك يومي سريع (نافذة الصرف السريع)
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#141414] cursor-pointer">
              <input type="checkbox" checked={isSampleItem} onChange={(e) => setIsSampleItem(e.target.checked)} />
              صنف عينات تجارية ومنافسات
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414] hover:bg-[#f3f3f3]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-[#262626]"
            >
              حفظ الصنف وتوليد الباركود
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. MULTI-LINE VOUCHER MODAL WITH INTERACTIVE TABLE, INLINE ITEM EDIT/ADD & TYPE
// ============================================================================
interface DraftLine {
  mode: 'EXISTING' | 'NEW';
  itemId: string;
  newItemName: string;
  newItemCategoryId: string;
  itemType: string;
  enteredQty: string;
  enteredUom: string;
  unitCost: string;
  serialsText: string;
  lotNumber: string;
  expiryDate: string;
  conditionStatus: WmsConditionStatus;
  notes: string;
  editingExistingName?: boolean;
  editedItemName?: string;
}

export const WmsCreateVoucherModal: React.FC<{
  open: boolean;
  initialType: WmsVoucherType;
  initialPreset?: {
    beneficiaryEntity?: string;
    issuePurpose?: WmsIssuePurpose;
    itemIds?: string[];
  } | null;
  onClose: () => void;
  items: WmsItem[];
  categories?: WmsCategory[];
  itemTypes?: string[];
  warehouses: WmsWarehouse[];
  settings: WmsSettings;
  getAvailableQty: (itemId: string) => number;
  onQuickEditItem?: (itemId: string, patch: Partial<WmsItem>) => void;
  onCreateCategory?: (input: { nameAr: string; code?: string }) => WmsCategory | null;
  onCreateWarehouse?: (input: { nameAr: string; branch?: string }) => WmsWarehouse | null;
  onSubmit: (payload: CreateVoucherInput) => { ok: boolean; error?: string };
}> = ({
  open,
  initialType,
  initialPreset,
  onClose,
  items,
  categories = [],
  itemTypes = DEFAULT_WMS_ITEM_TYPES,
  warehouses,
  settings,
  getAvailableQty,
  onQuickEditItem,
  onCreateCategory,
  onCreateWarehouse,
  onSubmit,
}) => {
  const [voucherType, setVoucherType] = useState<WmsVoucherType>(initialType);
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'WH-MAIN');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[1]?.id || 'WH-TND');
  const [issuePurpose, setIssuePurpose] = useState<WmsIssuePurpose>('تشغيل مكاتب');
  const [beneficiaryEntity, setBeneficiaryEntity] = useState(WMS_BENEFICIARIES[0].nameAr);
  const [roomOrSite, setRoomOrSite] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [poOrTrackingNo, setPoOrTrackingNo] = useState('');
  const [tenderRef, setTenderRef] = useState('');
  const [notes, setNotes] = useState('');
  const [itemFilterQuery, setItemFilterQuery] = useState('');
  const [showQuickWarehouse, setShowQuickWarehouse] = useState(false);
  const [quickWarehouseName, setQuickWarehouseName] = useState('');
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const makeLineFromItem = (it?: WmsItem, asNew = false): DraftLine => {
    const catCode = categories.find((c) => c.id === it?.categoryId)?.code;
    return {
      mode: asNew || !it ? 'NEW' : 'EXISTING',
      itemId: asNew || !it ? '__NEW__' : it.id,
      newItemName: '',
      newItemCategoryId: it?.categoryId || categories[0]?.id || 'CAT-MEP',
      itemType: it ? resolveItemTypeLabel(it, catCode) : itemTypes[0] || 'مستهلك تشغيلي',
      enteredQty: '1',
      enteredUom: it?.baseUom || 'حبة',
      unitCost: String(it?.avgUnitCost || 0),
      serialsText: '',
      lotNumber: '',
      expiryDate: '',
      conditionStatus: 'سليم',
      notes: '',
      editingExistingName: false,
      editedItemName: it?.nameAr || '',
    };
  };

  const [lines, setLines] = useState<DraftLine[]>(() => [makeLineFromItem(items[0])]);

  React.useEffect(() => {
    setVoucherType(initialType);
    setErrorMsg(null);
    if (open) {
      if (initialPreset) {
        if (initialPreset.beneficiaryEntity) setBeneficiaryEntity(initialPreset.beneficiaryEntity);
        if (initialPreset.issuePurpose) setIssuePurpose(initialPreset.issuePurpose);
        if (initialPreset.itemIds && initialPreset.itemIds.length > 0) {
          const presetLines = initialPreset.itemIds
            .map((id) => items.find((it) => it.id === id))
            .filter((it): it is WmsItem => Boolean(it))
            .map((it) => makeLineFromItem(it));
          if (presetLines.length > 0) {
            setLines(presetLines);
            if (presetLines[0]?.itemId) {
              const firstWh = items.find((x) => x.id === presetLines[0].itemId)?.defaultWarehouseId;
              if (firstWh) setWarehouseId(firstWh);
            }
            return;
          }
        }
      }
      if (lines.length === 0 || (lines[0].mode === 'EXISTING' && !items.some((x) => x.id === lines[0].itemId))) {
        setLines([makeLineFromItem(items[0])]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType, initialPreset, open]);

  const filteredItemsForPicker = useMemo(() => {
    if (!itemFilterQuery.trim()) return items;
    return items.filter((it) => {
      const cat = categories.find((c) => c.id === it.categoryId);
      return matchesSmartSearch(itemFilterQuery, [
        it.nameAr,
        it.nameEn,
        it.sku,
        it.barcode,
        it.itemType,
        cat?.nameAr,
        cat?.code,
        it.baseUom,
      ]);
    });
  }, [items, categories, itemFilterQuery]);

  if (!open) return null;

  const addExistingLine = () => {
    setLines((prev) => [...prev, makeLineFromItem(filteredItemsForPicker[0] || items[0], false)]);
  };

  const addNewItemLine = () => {
    setLines((prev) => [...prev, makeLineFromItem(undefined, true)]);
  };

  const duplicateLine = (idx: number) => {
    setLines((prev) => {
      const copy = { ...prev[idx] };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        if (patch.itemId && patch.itemId !== '__NEW__') {
          const matched = items.find((it) => it.id === patch.itemId);
          if (matched) {
            const catCode = categories.find((c) => c.id === matched.categoryId)?.code;
            next.mode = 'EXISTING';
            next.enteredUom = matched.baseUom;
            next.unitCost = String(matched.avgUnitCost || 0);
            next.itemType = resolveItemTypeLabel(matched, catCode);
            next.newItemCategoryId = matched.categoryId;
            next.editedItemName = matched.nameAr;
          }
        } else if (patch.itemId === '__NEW__' || patch.mode === 'NEW') {
          next.mode = 'NEW';
          next.itemId = '__NEW__';
        }
        return next;
      })
    );
  };

  const submitWithMode = (saveAsDraft: boolean) => {
    setErrorMsg(null);

    // Apply any inline renames/category updates made to existing items inside the voucher table
    if (onQuickEditItem) {
      for (const l of lines) {
        if (l.mode === 'EXISTING' && l.itemId !== '__NEW__') {
          const orig = items.find((i) => i.id === l.itemId);
          if (orig) {
            const patch: Partial<WmsItem> = {};
            if (l.editedItemName?.trim() && l.editedItemName.trim() !== orig.nameAr) {
              patch.nameAr = l.editedItemName.trim();
            }
            if (l.newItemCategoryId && l.newItemCategoryId !== orig.categoryId) {
              patch.categoryId = l.newItemCategoryId;
            }
            if (l.itemType?.trim() && l.itemType.trim() !== orig.itemType) {
              patch.itemType = l.itemType.trim();
            }
            if (Object.keys(patch).length > 0) {
              onQuickEditItem(orig.id, patch);
            }
          }
        }
      }
    }

    const benObj = WMS_BENEFICIARIES.find((b) => b.nameAr === beneficiaryEntity);
    const result = onSubmit({
      voucherType,
      voucherDate,
      warehouseId,
      targetWarehouseId: voucherType === 'STR' ? targetWarehouseId : undefined,
      issuePurpose: voucherType === 'GIN' ? issuePurpose : undefined,
      beneficiaryEntity:
        voucherType === 'GIN' || voucherType === 'SRN' || voucherType === 'ADJ' || voucherType === 'SAMPLE' || voucherType === 'SCRAP'
          ? beneficiaryEntity.trim() || 'المستودع المركزي'
          : undefined,
      costCenterCode: benObj?.costCenterCode || 'CC-KAS-01',
      roomOrSite: roomOrSite.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      supplierName:
        voucherType === 'GRN' || voucherType === 'RTV'
          ? supplierName.trim() || 'مورد مباشر / مشتريات كاس'
          : undefined,
      poOrTrackingNo: poOrTrackingNo.trim() || undefined,
      tenderRef: tenderRef.trim() || undefined,
      notes: notes.trim() || undefined,
      saveAsDraft,
      lines: lines.map((l) => ({
        itemId: l.mode === 'NEW' ? '__NEW__' : l.itemId,
        newItemName: l.mode === 'NEW' ? l.newItemName.trim() : undefined,
        newItemCategoryId: l.newItemCategoryId || undefined,
        itemType: l.itemType.trim() || undefined,
        enteredQty: Number(l.enteredQty || 0),
        enteredUom: l.enteredUom.trim() || 'حبة',
        unitCost: Number(l.unitCost || 0),
        serialNumbers: l.serialsText
          .split(/[,،\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        lotNumber: l.lotNumber.trim() || undefined,
        expiryDate: l.expiryDate || undefined,
        conditionStatus: l.conditionStatus,
        notes: l.notes.trim() || undefined,
      })),
    });

    if (!result.ok) {
      setErrorMsg(result.error || 'تعذر حفظ الإذن المخزني.');
      return;
    }
    onClose();
  };

  const typeTabs: Array<{ id: WmsVoucherType; label: string; icon: React.ReactNode }> = [
    { id: 'GRN', label: 'توريد / وارد (GRN)', icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
    { id: 'GIN', label: 'صرف مخزني (GIN)', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { id: 'SRN', label: 'مرتجع مستودع (SRN)', icon: <RotateCcw className="w-3.5 h-3.5" /> },
    { id: 'STR', label: 'تحويل مستودعات (STR)', icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
    { id: 'ADJ', label: 'تسوية جرد (ADJ)', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'SAMPLE', label: 'عينة تجارية (SMP)', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'RTV', label: 'مرتجع لمورد (RTV)', icon: <RotateCcw className="w-3.5 h-3.5" /> },
    { id: 'SCRAP', label: 'إتلاف (SCRAP)', icon: <Trash2 className="w-3.5 h-3.5" /> },
  ];

  const grandTotalValue = lines.reduce(
    (s, l) => s + (Number(l.enteredQty) || 0) * (Number(l.unitCost) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 md:p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-6xl max-h-[93vh] overflow-y-auto p-5 md:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <h3 className="text-lg font-bold text-[#141414]">إنشاء وتحرير إذن حركة مخزنية (جدول تفاعلي متعدد البنود)</h3>
            <p className="text-xs text-[#707070] mt-0.5">
              اختر أو ابحث عن صنف أو أضف صنفاً جديداً مباشرة في الجدول مع تحديد التصنيف والنوع والوحدة والكمية والتكلفة
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher Type Switcher (All 8 Types) */}
        <div className="mt-4">
          <label className="block text-[11px] font-bold text-[#707070] mb-1.5">نوع الإذن المخزني *</label>
          <div className="flex flex-wrap gap-1.5">
            {typeTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setVoucherType(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  voucherType === t.id
                    ? 'bg-[#141414] text-white'
                    : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e8e8e8]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dual Costing Policy Status Banner */}
        {voucherType === 'GRN' && (
          <div className="mt-3 p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#141414]">
              <FileText className="w-4 h-4 shrink-0" />
              <span>
                <strong>سياسة سعر التكلفة:</strong>{' '}
                {settings.costingMode === 'mandatory'
                  ? 'إلزامي عند التوريد — أدخل تكلفة الوحدة لترحيل القيد المحاسبي IAS 2.'
                  : 'مرن اختياري — يمكنك الترحيل بدون سعر الآن أو إدخال التكلفة لترحيل قيد IAS 2 فوراً.'}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold">
              {settings.valuationMethod}
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 p-3 rounded-[16px] bg-[#141414] text-white text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1">تاريخ الحركة (ISO) *</label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#141414]">
                {voucherType === 'STR' ? 'المستودع المصدر *' : 'المستودع *'}
              </label>
              {onCreateWarehouse && (
                <button
                  type="button"
                  onClick={() => setShowQuickWarehouse((p) => !p)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white transition-colors"
                >
                  + مستودع جديد
                </button>
              )}
            </div>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#141414]"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>
            {showQuickWarehouse && onCreateWarehouse && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickWarehouseName}
                  onChange={(e) => setQuickWarehouseName(e.target.value)}
                  placeholder="اسم المستودع الجديد..."
                  className="flex-1 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!quickWarehouseName.trim()) return;
                    const w = onCreateWarehouse({ nameAr: quickWarehouseName.trim() });
                    if (w) setWarehouseId(w.id);
                    setQuickWarehouseName('');
                    setShowQuickWarehouse(false);
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                >
                  حفظ
                </button>
              </div>
            )}
          </div>
          {voucherType === 'STR' ? (
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المستودع المستلم *</label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#141414]"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr}
                  </option>
                ))}
              </select>
            </div>
          ) : voucherType === 'GRN' || voucherType === 'RTV' ? (
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المورد / مصدر التوريد</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="مثال: Amazon.sa أو مورد كهرباء الرياض"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الجهة المستفيدة / مركز التكلفة (اختر أو اكتب) *</label>
              <input
                list="kas-wms-beneficiaries-datalist"
                value={beneficiaryEntity}
                onChange={(e) => setBeneficiaryEntity(e.target.value)}
                placeholder="اختر من القائمة أو اكتب اسم الجهة / القسم..."
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#141414]"
              />
              <datalist id="kas-wms-beneficiaries-datalist">
                {WMS_BENEFICIARIES.map((b) => (
                  <option key={b.id} value={b.nameAr}>
                    {b.costCenterCode}
                  </option>
                ))}
              </datalist>
            </div>
          )}
        </div>

        {/* Secondary Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {voucherType === 'GIN' || voucherType === 'SRN' || voucherType === 'SAMPLE' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">الغرض التشغيلي</label>
                <select
                  value={issuePurpose}
                  onChange={(e) => setIssuePurpose(e.target.value as WmsIssuePurpose)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#141414]"
                >
                  {[
                    'تشغيل مكاتب',
                    'صيانة سكن وإيواء',
                    'تجهيز مكتب جديد',
                    'توريد منافسة حكومية',
                    'عهدة شخصية',
                    'تجارة وشحنات أمازون',
                    'صرف قطاع تجاري / معرض',
                    'ضيافة وبوفيه',
                    'مستهلكات يومية (حجارة/مكتبية)',
                    'عينات تجارية',
                  ].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">الموظف / الفني المستلم</label>
                <input
                  list="kas-wms-employees-list"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="اختر موظفاً أو اكتب اسم المستلم"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
                <datalist id="kas-wms-employees-list">
                  {KAS_ALLOWED_EMPLOYEES.map((e) => (
                    <option key={e.id} value={e.nameAr} />
                  ))}
                  <option value="علي الكهربائي (عمال عزم)" />
                  <option value="مؤمن السواق" />
                  <option value="أسامة سعيد (البوفيه)" />
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">الغرفة / الموقع / الملاحظات</label>
                <input
                  type="text"
                  value={roomOrSite}
                  onChange={(e) => setRoomOrSite(e.target.value)}
                  placeholder="مثال: غرفة الإدارة أو سكن العاملات"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">رقم أمر الشراء (PO) / المرجع</label>
                <input
                  type="text"
                  value={poOrTrackingNo}
                  onChange={(e) => setPoOrTrackingNo(e.target.value)}
                  placeholder="مثال: PO-KAS-2026-881"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">المستلم / المسؤول</label>
                <input
                  list="kas-wms-employees-list-grn"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="اسم المستلم في المستودع..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
                <datalist id="kas-wms-employees-list-grn">
                  {KAS_ALLOWED_EMPLOYEES.map((e) => (
                    <option key={e.id} value={e.nameAr} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظات عامة على الإذن</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات الفحص أو التسليم..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
              </div>
            </>
          )}
        </div>

        {/* INTERACTIVE SPREADSHEET TABLE FOR VOUCHER LINES */}
        <div className="mt-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#141414]">
                جدول بنود الأصناف في الإذن ({lines.length})
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-[#f0f0f0] px-3 py-1">
                <Search className="w-3.5 h-3.5 text-[#707070] shrink-0" />
                <input
                  type="text"
                  value={itemFilterQuery}
                  onChange={(e) => setItemFilterQuery(e.target.value)}
                  placeholder="تصفية قائمة الأصناف بالاسم أو SKU..."
                  className="bg-transparent text-[11px] text-[#141414] focus:outline-none w-44"
                />
                {itemFilterQuery && (
                  <button
                    type="button"
                    onClick={() => setItemFilterQuery('')}
                    className="text-[#707070] hover:text-[#141414]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {onCreateCategory && (
                <button
                  type="button"
                  onClick={() => setShowQuickCategory((p) => !p)}
                  className="px-2.5 py-1 rounded-full border border-[#e0e0e0] text-[11px] font-bold text-[#141414] hover:bg-[#f3f3f3]"
                >
                  + تصنيف جديد
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={addExistingLine}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-xs font-bold text-[#141414] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة صنف من الدليل</span>
              </button>
              <button
                type="button"
                onClick={addNewItemLine}
                className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white hover:bg-[#262626] text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة صنف جديد مباشرة</span>
              </button>
            </div>
          </div>

          {showQuickCategory && onCreateCategory && (
            <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center gap-2">
              <span className="text-xs font-bold text-[#141414]">تصنيف جديد:</span>
              <input
                type="text"
                value={quickCategoryName}
                onChange={(e) => setQuickCategoryName(e.target.value)}
                placeholder="اكتب اسم التصنيف الجديد..."
                className="flex-1 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!quickCategoryName.trim()) return;
                  const created = onCreateCategory({ nameAr: quickCategoryName.trim() });
                  if (created) {
                    updateLine(lines.length - 1, { newItemCategoryId: created.id });
                  }
                  setQuickCategoryName('');
                  setShowQuickCategory(false);
                }}
                className="px-3 py-1 rounded-full bg-[#141414] text-white text-xs font-bold"
              >
                حفظ التصنيف
              </button>
            </div>
          )}

          <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5 w-8">#</th>
                  <th className="p-2.5 min-w-[230px]">الصنف (اختر / حرّر / + صنف جديد)</th>
                  <th className="p-2.5 min-w-[140px]">التصنيف</th>
                  <th className="p-2.5 min-w-[150px]">النوع (قابل للتحرير والإضافة)</th>
                  <th className="p-2.5 w-20">المتاح</th>
                  <th className="p-2.5 w-24">الكمية *</th>
                  <th className="p-2.5 w-28">الوحدة</th>
                  <th className="p-2.5 w-28">
                    التكلفة ⃁ {voucherType === 'GRN' && settings.costingMode === 'mandatory' ? '*' : ''}
                  </th>
                  <th className="p-2.5 min-w-[130px]">ملاحظة / تتبع</th>
                  <th className="p-2.5 w-20 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {lines.map((line, idx) => {
                  const selectedItem =
                    line.mode === 'EXISTING' ? items.find((i) => i.id === line.itemId) : undefined;
                  const available = selectedItem ? getAvailableQty(selectedItem.id) : 0;
                  const itemUoms = selectedItem?.uomConversions?.map((u) => u.uomName) || [];
                  const combinedUnits = Array.from(new Set([...itemUoms, ...DEFAULT_WMS_UNITS]));
                  const selectableItems =
                    selectedItem && !filteredItemsForPicker.some((x) => x.id === selectedItem.id)
                      ? [selectedItem, ...filteredItemsForPicker]
                      : filteredItemsForPicker;

                  return (
                    <tr key={idx} className="hover:bg-[#fafafa] align-top">
                      <td className="p-2 font-mono font-bold text-[#707070] pt-3">{idx + 1}</td>

                      {/* Item Column: Existing Picker + Inline Rename OR New Item Input */}
                      <td className="p-2 space-y-1.5">
                        {line.mode === 'NEW' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={line.newItemName}
                                onChange={(e) => updateLine(idx, { newItemName: e.target.value })}
                                placeholder="اكتب اسم الصنف الجديد لإضافته فوراً..."
                                className="w-full rounded-[10px] bg-[#f0f0f0] border border-[#141414] px-2.5 py-1.5 text-xs font-semibold text-[#141414]"
                              />
                              {items.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => updateLine(idx, { mode: 'EXISTING', itemId: items[0].id })}
                                  className="px-2 py-1 rounded-full bg-[#f3f3f3] text-[10px] font-bold shrink-0"
                                  title="العودة لاختيار صنف موجود"
                                >
                                  موجود
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-[#707070] block">
                              سيُنشأ له SKU وباركود تلقائياً عند حفظ الإذن
                            </span>
                          </div>
                        ) : line.editingExistingName ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={line.editedItemName ?? selectedItem?.nameAr ?? ''}
                              onChange={(e) => updateLine(idx, { editedItemName: e.target.value })}
                              className="w-full rounded-[10px] bg-[#f0f0f0] border border-[#141414] px-2.5 py-1.5 text-xs font-bold text-[#141414]"
                              placeholder="تعديل اسم الصنف..."
                            />
                            <button
                              type="button"
                              onClick={() => updateLine(idx, { editingExistingName: false })}
                              className="px-2 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold shrink-0"
                            >
                              تم
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <select
                                value={line.itemId}
                                onChange={(e) => {
                                  if (e.target.value === '__NEW__') {
                                    updateLine(idx, { mode: 'NEW', itemId: '__NEW__' });
                                  } else {
                                    updateLine(idx, { itemId: e.target.value });
                                  }
                                }}
                                className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-xs font-semibold text-[#141414]"
                              >
                                {selectableItems.map((it) => (
                                  <option key={it.id} value={it.id}>
                                    [{it.sku}] {line.editedItemName && it.id === line.itemId ? line.editedItemName : it.nameAr}
                                  </option>
                                ))}
                                <option value="__NEW__">+ إضافة صنف جديد غير موجود بالقائمة...</option>
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  updateLine(idx, {
                                    editingExistingName: true,
                                    editedItemName: line.editedItemName || selectedItem?.nameAr || '',
                                  })
                                }
                                title="تحرير اسم الصنف مباشرة"
                                className="w-7 h-7 shrink-0 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLine(idx, { mode: 'NEW', itemId: '__NEW__' })}
                                title="تحويل السطر لإضافة صنف جديد"
                                className="w-7 h-7 shrink-0 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Category Column */}
                      <td className="p-2">
                        <select
                          value={line.newItemCategoryId || selectedItem?.categoryId || categories[0]?.id || ''}
                          onChange={(e) => updateLine(idx, { newItemCategoryId: e.target.value })}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] font-semibold text-[#141414]"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameAr}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Item Type Column (النوع) */}
                      <td className="p-2">
                        <input
                          list={`wms-line-types-${idx}`}
                          value={line.itemType}
                          onChange={(e) => updateLine(idx, { itemType: e.target.value })}
                          placeholder="اختر أو اكتب النوع..."
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-[11px] font-semibold text-[#141414]"
                        />
                        <datalist id={`wms-line-types-${idx}`}>
                          {itemTypes.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </td>

                      {/* Available Stock */}
                      <td className="p-2 pt-3 font-mono text-[11px]">
                        {line.mode === 'NEW' ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">جديد</span>
                        ) : (
                          <span className="font-bold text-[#141414]">
                            {available} <span className="font-normal text-[#707070]">{selectedItem?.baseUom}</span>
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="p-2">
                        <input
                          type="number"
                          min={0.01}
                          step="any"
                          value={line.enteredQty}
                          onChange={(e) => updateLine(idx, { enteredQty: e.target.value })}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414]"
                        />
                      </td>

                      {/* Unit (Editable + Creatable!) */}
                      <td className="p-2">
                        <input
                          list={`wms-line-uoms-${idx}`}
                          value={line.enteredUom}
                          onChange={(e) => updateLine(idx, { enteredUom: e.target.value })}
                          placeholder="الوحدة..."
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs font-semibold text-[#141414]"
                        />
                        <datalist id={`wms-line-uoms-${idx}`}>
                          {combinedUnits.map((u) => (
                            <option key={u} value={u} />
                          ))}
                        </datalist>
                      </td>

                      {/* Unit Cost */}
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs font-mono text-[#141414]"
                        />
                      </td>

                      {/* Tracking / Notes */}
                      <td className="p-2 space-y-1">
                        <input
                          type="text"
                          value={line.notes}
                          onChange={(e) => updateLine(idx, { notes: e.target.value })}
                          placeholder="بيان / ملاحظة..."
                          className="w-full rounded-[10px] bg-[#f0f0f0] px-2 py-1.5 text-[11px] text-[#141414]"
                        />
                        {selectedItem?.trackingMode === 'SERIAL' && (
                          <input
                            type="text"
                            value={line.serialsText}
                            onChange={(e) => updateLine(idx, { serialsText: e.target.value })}
                            placeholder="S/N مفصولة بفاصلة"
                            className="w-full rounded-[8px] bg-[#f3f3f3] px-2 py-1 text-[10px] font-mono"
                          />
                        )}
                        {selectedItem?.trackingMode === 'LOT_EXPIRY' && (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={line.lotNumber}
                              onChange={(e) => updateLine(idx, { lotNumber: e.target.value })}
                              placeholder="Lot#"
                              className="w-1/2 rounded-[8px] bg-[#f3f3f3] px-1.5 py-1 text-[10px] font-mono"
                            />
                            <input
                              type="date"
                              value={line.expiryDate}
                              onChange={(e) => updateLine(idx, { expiryDate: e.target.value })}
                              className="w-1/2 rounded-[8px] bg-[#f3f3f3] px-1 py-1 text-[10px] font-mono"
                            />
                          </div>
                        )}
                        {voucherType === 'SRN' && (
                          <select
                            value={line.conditionStatus}
                            onChange={(e) => updateLine(idx, { conditionStatus: e.target.value as WmsConditionStatus })}
                            className="w-full rounded-[8px] bg-[#f3f3f3] px-1.5 py-1 text-[10px] font-semibold"
                          >
                            <option value="سليم">سليم</option>
                            <option value="يحتاج صيانة">يحتاج صيانة</option>
                            <option value="تالف">تالف</option>
                          </select>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="p-2 pt-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateLine(idx)}
                            title="تكرار السطر"
                            className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                              className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#707070] hover:bg-[#141414] hover:text-white"
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

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414]"
            >
              إلغاء
            </button>
            {grandTotalValue > 0 && (
              <span className="text-xs font-bold text-[#141414] font-mono bg-[#f3f3f3] px-3 py-1.5 rounded-full">
                إجمالي القيمة: {grandTotalValue.toLocaleString()} ⃁
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => submitWithMode(true)}
              className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold hover:bg-[#e5e5e5]"
            >
              حفظ كمسودة (Draft)
            </button>
            <button
              type="button"
              onClick={() => submitWithMode(false)}
              className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>اعتماد فوري وترحيل الرصيد</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. DOUBLE-ENTRY ITEM STOCK CARD MODAL (كرت الصنف التحليلي + توريد وصرف فوري)
// ============================================================================
export const WmsStockCardModal: React.FC<{
  item: WmsItem | null;
  entries: WmsStockCardEntry[];
  stockSummary: { onHand: number; reserved: number; available: number };
  onQuickVoucher?: (type: WmsVoucherType, item: WmsItem) => void;
  onEditItem?: (item: WmsItem) => void;
  onClose: () => void;
}> = ({ item, entries, stockSummary, onQuickVoucher, onEditItem, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-mono font-bold text-[#141414]">
                {item.sku}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#707070]">
                باركود: {item.barcode}
              </span>
              {item.itemType && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                  {item.itemType}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-[#141414] mt-1">كرت الصنف التحليلي — {item.nameAr}</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onQuickVoucher && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuickVoucher('GRN', item);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#262626]"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>+ إذن توريد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuickVoucher('GIN', item);
                  }}
                  className="px-3 py-1.5 rounded-full border border-[#141414] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1 hover:bg-[#f3f3f3]"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>- إذن صرف</span>
                </button>
              </>
            )}
            {onEditItem && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditItem(item);
                }}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1 hover:bg-[#e5e5e5]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تحرير الصنف</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <div className="p-3.5 rounded-[16px] bg-[#f3f3f3]">
            <div className="text-[11px] text-[#707070]">الرصيد الفعلي (On-Hand)</div>
            <div className="text-xl font-bold text-[#141414] font-mono mt-1">
              {stockSummary.onHand} <span className="text-xs font-normal">{item.baseUom}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-[16px] bg-[#f3f3f3]">
            <div className="text-[11px] text-[#707070]">محجوز للمنافسات</div>
            <div className="text-xl font-bold text-[#141414] font-mono mt-1">{stockSummary.reserved}</div>
          </div>
          <div className="p-3.5 rounded-[16px] bg-[#f3f3f3]">
            <div className="text-[11px] text-[#707070]">المتاح للصرف</div>
            <div className="text-xl font-bold text-[#141414] font-mono mt-1">{stockSummary.available}</div>
          </div>
          <div className="p-3.5 rounded-[16px] bg-[#f3f3f3]">
            <div className="text-[11px] text-[#707070]">متوسط التكلفة (AVCO)</div>
            <div className="text-xl font-bold text-[#141414] font-mono mt-1">{item.avgUnitCost.toLocaleString()} ⃁</div>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
              <tr>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">رقم الإذن</th>
                <th className="p-2.5">النوع</th>
                <th className="p-2.5">الجهة / المورد</th>
                <th className="p-2.5">وارد (+)</th>
                <th className="p-2.5">صادر (-)</th>
                <th className="p-2.5">الرصيد التراكمي</th>
                <th className="p-2.5">المنفّذ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-[#707070]">
                    لا توجد حركات مرحّلة لهذا الصنف حتى الآن. اضغط «+ إذن توريد» أو «- إذن صرف» أعلاه لإضافة حركة.
                  </td>
                </tr>
              ) : (
                entries.map((e, i) => (
                  <tr key={i} className="hover:bg-[#fafafa]">
                    <td className="p-2.5 font-mono">{e.date}</td>
                    <td className="p-2.5 font-mono font-bold text-[#141414]">{e.voucherNo}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">{e.voucherType}</span>
                    </td>
                    <td className="p-2.5">{e.beneficiaryOrSupplier}</td>
                    <td className="p-2.5 font-mono font-bold">{e.inQty > 0 ? `+${e.inQty}` : '—'}</td>
                    <td className="p-2.5 font-mono font-bold">{e.outQty > 0 ? `-${e.outQty}` : '—'}</td>
                    <td className="p-2.5 font-mono font-bold text-[#141414]">{e.runningBalance}</td>
                    <td className="p-2.5 text-[#707070]">{e.actorName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. OFFICIAL PRINTABLE VOUCHER MODAL (PDF + QR) & BARCODE LABEL SHEET
// ============================================================================
export const WmsVoucherPrintModal: React.FC<{
  voucher: WmsStockVoucher | null;
  onClose: () => void;
}> = ({ voucher, onClose }) => {
  if (!voucher) return null;

  const typeLabel: Record<WmsVoucherType, string> = {
    GRN: 'إذن استلام وارد مستودع (GRN)',
    GIN: 'إذن صرف وتسليم مخزني (GIN)',
    SRN: 'إذن مرتجع مستودع وفحص جودة (SRN)',
    STR: 'إذن تحويل مخزني بين المستودعات (STR)',
    ADJ: 'إذن تسوية جرد مخزني (ADJ)',
    SAMPLE: 'إذن تسليم عينات تجارية (SAMPLE)',
    RTV: 'إذن مرتجع مشتريات للمورد (RTV)',
    SCRAP: 'إذن إتلاف وتكهين معتمد (SCRAP)',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e0e0] print:hidden">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#141414]" />
            <span className="text-sm font-bold text-[#141414]">معاينة السند المخزني الرسمي للطباعة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة / حفظ PDF</span>
            </button>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-5">
          <div className="flex items-start justify-between border-b border-[#141414] pb-4">
            <div>
              <div className="text-base font-bold text-[#141414]">شركة كاس للتجارة والمنافسات — إدارة المستودعات (KAS WMS)</div>
              <div className="text-xs text-[#707070] mt-0.5">مجموعة خالد السليم القابضة • الرياض، المملكة العربية السعودية</div>
              <div className="mt-2 inline-block px-3 py-1 rounded-full bg-[#141414] text-white text-xs font-bold">
                {typeLabel[voucher.voucherType]}
              </div>
            </div>
            <div className="text-left font-mono text-xs space-y-1">
              <div className="font-bold text-sm text-[#141414]">{voucher.voucherNo}</div>
              <div className="text-[#707070]">التاريخ: {voucher.voucherDate}</div>
              <div className="text-[#707070]">الحالة: {voucher.status}</div>
              {voucher.journalEntryId && <div className="text-[#141414]">قيد IAS 2: {voucher.journalEntryId}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#f3f3f3] p-3.5 rounded-[16px]">
            <div>
              <span className="text-[#707070] block">المستودع:</span>
              <strong className="text-[#141414]">{voucher.warehouseId}</strong>
            </div>
            <div>
              <span className="text-[#707070] block">الجهة المستفيدة / المورد:</span>
              <strong className="text-[#141414]">{voucher.beneficiaryEntity || voucher.supplierName || 'المستودع المركزي'}</strong>
            </div>
            <div>
              <span className="text-[#707070] block">المستلم / مركز التكلفة:</span>
              <strong className="text-[#141414]">
                {voucher.recipientName || '—'} {voucher.costCenterCode ? `(${voucher.costCenterCode})` : ''}
              </strong>
            </div>
          </div>

          <table className="w-full text-right text-xs border border-[#e0e0e0]">
            <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0]">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">رمز SKU</th>
                <th className="p-2.5">بيان الصنف</th>
                <th className="p-2.5">النوع</th>
                <th className="p-2.5">الكمية والوحدة</th>
                <th className="p-2.5">بوحدة الأساس</th>
                <th className="p-2.5">التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {voucher.lines.map((l, idx) => (
                <tr key={l.id}>
                  <td className="p-2.5 font-mono">{idx + 1}</td>
                  <td className="p-2.5 font-mono font-bold">{l.sku}</td>
                  <td className="p-2.5 font-semibold">{l.itemName}</td>
                  <td className="p-2.5 text-[#707070]">{l.itemType || '—'}</td>
                  <td className="p-2.5 font-mono">
                    {l.enteredQty} {l.enteredUom}
                  </td>
                  <td className="p-2.5 font-mono">{l.baseQty}</td>
                  <td className="p-2.5 font-mono">{l.totalCost > 0 ? `${l.totalCost.toLocaleString()} ⃁` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {voucher.notes && (
            <div className="text-xs text-[#707070] p-3 rounded-[14px] border border-[#e0e0e0]">
              <strong className="text-[#141414]">ملاحظات:</strong> {voucher.notes}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#e0e0e0] text-center text-xs">
            <div>
              <div className="text-[#707070] mb-6">أمين المستودع (المنشئ)</div>
              <div className="font-bold text-[#141414] border-t border-[#e0e0e0] pt-1.5">{voucher.createdByName}</div>
            </div>
            <div>
              <div className="text-[#707070] mb-6">اعتماد وترحيل المستودع</div>
              <div className="font-bold text-[#141414] border-t border-[#e0e0e0] pt-1.5">
                {voucher.postedByName || 'حاتم سلمان ابوالذهب سلمان'}
              </div>
            </div>
            <div>
              <div className="text-[#707070] mb-2">توقيع المستلم</div>
              {voucher.handoverSignatureDataUrl ? (
                <img
                  src={voucher.handoverSignatureDataUrl}
                  alt="توقيع المستلم الإلكتروني"
                  className="h-12 mx-auto object-contain mb-1"
                />
              ) : (
                <div className="h-8" />
              )}
              <div className="font-bold text-[#141414] border-t border-[#e0e0e0] pt-1.5">
                {voucher.handoverSignerName || voucher.recipientName || '.........................'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WmsBarcodeLabelModal: React.FC<{
  item: WmsItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  if (!item) return null;
  const qrPayload = `KAS-WMS|${item.barcode}|${item.nameAr}|${item.defaultLocationCode}`;
  const code128Svg = generateRealCode128BarcodeSvg(item.barcode, { widthPx: 260, heightPx: 52 });
  const qrSvg = generateRealQrSvg(qrPayload, { sizePx: 68, borderStyle: false });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-md p-6 text-center space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#141414]">
            <Barcode className="w-4 h-4" />
            <span>ملصق باركود ISO Code-128B + QR حقيقي (50×30mm)</span>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-[16px] border-2 border-[#141414] bg-[#ffffff] space-y-2.5 text-right">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold text-[#707070]">KAS TRADE WMS — المستودع المركزي</div>
              <div className="text-sm font-bold text-[#141414] mt-0.5">{item.nameAr}</div>
              <div className="text-[11px] font-mono text-[#707070] mt-0.5">
                SKU: {item.sku} • BIN: {item.defaultLocationCode}
              </div>
            </div>
            <div className="shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          <div className="flex justify-center pt-1" dangerouslySetInnerHTML={{ __html: code128Svg }} />
          <div className="text-center font-mono text-xs font-bold tracking-widest text-[#141414]">{item.barcode}</div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[#707070] pt-2 border-t border-[#f0f0f0]">
            <span>المستودع: {item.defaultWarehouseId}</span>
            <span>الوحدة: {item.baseUom}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة ملصق الباركود القابل للمسح</span>
        </button>
      </div>
    </div>
  );
};
