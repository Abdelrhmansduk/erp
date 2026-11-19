import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Printer,
  QrCode,
  CheckCircle2,
  FileText,
  Package,
  AlertCircle,
  Barcode,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ArrowRightLeft,
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

// ============================================================================
// 1. CREATE ITEM (SKU + MULTI-UOM) MODAL
// ============================================================================
export const WmsCreateItemModal: React.FC<{
  open: boolean;
  onClose: () => void;
  categories: WmsCategory[];
  warehouses: WmsWarehouse[];
  onSubmit: (payload: {
    nameAr: string;
    nameEn?: string;
    categoryId: string;
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
}> = ({ open, onClose, categories, warehouses, onSubmit }) => {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'CAT-MEP');
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
            <p className="text-xs text-[#707070] mt-0.5">يتم توليد رمز SKU وباركود تلقائياً مع دعم تحويل الوحدات</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الفئة التصنيفية</label>
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
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المستودع الافتراضي</label>
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
            <div className="text-xs font-bold text-[#141414]">هندسة وحدات القياس (Multi-UoM)</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#707070] mb-1">وحدة الأساس *</label>
                <select
                  value={baseUom}
                  onChange={(e) => setBaseUom(e.target.value)}
                  className="w-full rounded-[14px] bg-[#ffffff] px-3 py-2 text-xs font-semibold text-[#141414]"
                >
                  {['حبة', 'متر', 'كيس', 'كرتون', 'طقم', 'لفة', 'علبة', 'بكتج', 'شريحة', 'حجر'].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
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
                <label className="block text-[11px] font-semibold text-[#707070] mb-1">تحتوي على كم ({baseUom})؟</label>
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
// 2. MULTI-LINE VOUCHER MODAL (GRN / GIN / SRN / STR / ADJ)
// ============================================================================
interface DraftLine {
  itemId: string;
  enteredQty: string;
  enteredUom: string;
  unitCost: string;
  serialsText: string;
  lotNumber: string;
  expiryDate: string;
  conditionStatus: WmsConditionStatus;
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
  warehouses: WmsWarehouse[];
  settings: WmsSettings;
  getAvailableQty: (itemId: string) => number;
  onSubmit: (payload: CreateVoucherInput) => { ok: boolean; error?: string };
}> = ({ open, initialType, initialPreset, onClose, items, warehouses, settings, getAvailableQty, onSubmit }) => {
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firstItem = items[0];
  const [lines, setLines] = useState<DraftLine[]>([
    {
      itemId: firstItem?.id || '',
      enteredQty: '1',
      enteredUom: firstItem?.baseUom || 'حبة',
      unitCost: String(firstItem?.avgUnitCost || 0),
      serialsText: '',
      lotNumber: '',
      expiryDate: '',
      conditionStatus: 'سليم',
    },
  ]);

  React.useEffect(() => {
    setVoucherType(initialType);
    setErrorMsg(null);
    if (open && initialPreset) {
      if (initialPreset.beneficiaryEntity) setBeneficiaryEntity(initialPreset.beneficiaryEntity);
      if (initialPreset.issuePurpose) setIssuePurpose(initialPreset.issuePurpose);
      if (initialPreset.itemIds && initialPreset.itemIds.length > 0) {
        const presetLines: DraftLine[] = initialPreset.itemIds
          .map((id) => items.find((it) => it.id === id))
          .filter((it): it is WmsItem => Boolean(it))
          .map((it) => ({
            itemId: it.id,
            enteredQty: '1',
            enteredUom: it.baseUom,
            unitCost: String(it.avgUnitCost || 0),
            serialsText: '',
            lotNumber: '',
            expiryDate: '',
            conditionStatus: 'سليم',
          }));
        if (presetLines.length > 0) setLines(presetLines);
      }
    }
  }, [initialType, initialPreset, open, items]);

  if (!open) return null;

  const addLine = () => {
    const it = items[0];
    setLines((prev) => [
      ...prev,
      {
        itemId: it?.id || '',
        enteredQty: '1',
        enteredUom: it?.baseUom || 'حبة',
        unitCost: String(it?.avgUnitCost || 0),
        serialsText: '',
        lotNumber: '',
        expiryDate: '',
        conditionStatus: 'سليم',
      },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        if (patch.itemId) {
          const matched = items.find((it) => it.id === patch.itemId);
          if (matched) {
            next.enteredUom = matched.baseUom;
            next.unitCost = String(matched.avgUnitCost || 0);
          }
        }
        return next;
      })
    );
  };

  const submitWithMode = (saveAsDraft: boolean) => {
    setErrorMsg(null);
    const benObj = WMS_BENEFICIARIES.find((b) => b.nameAr === beneficiaryEntity);
    const result = onSubmit({
      voucherType,
      voucherDate,
      warehouseId,
      targetWarehouseId: voucherType === 'STR' ? targetWarehouseId : undefined,
      issuePurpose: voucherType === 'GIN' ? issuePurpose : undefined,
      beneficiaryEntity: voucherType === 'GIN' || voucherType === 'SRN' ? beneficiaryEntity : undefined,
      costCenterCode: benObj?.costCenterCode || 'CC-KAS-01',
      roomOrSite: roomOrSite.trim() || undefined,
      recipientName: recipientName.trim() || undefined,
      supplierName: voucherType === 'GRN' ? supplierName.trim() || 'مورد مباشر / مشتريات كاس' : undefined,
      poOrTrackingNo: poOrTrackingNo.trim() || undefined,
      tenderRef: tenderRef.trim() || undefined,
      notes: notes.trim() || undefined,
      saveAsDraft,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        enteredQty: Number(l.enteredQty || 0),
        enteredUom: l.enteredUom,
        unitCost: Number(l.unitCost || 0),
        serialNumbers: l.serialsText
          .split(/[,،\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        lotNumber: l.lotNumber.trim() || undefined,
        expiryDate: l.expiryDate || undefined,
        conditionStatus: l.conditionStatus,
      })),
    });

    if (!result.ok) {
      setErrorMsg(result.error || 'تعذر حفظ الإذن المخزني.');
      return;
    }
    onClose();
  };

  const typeTabs: Array<{ id: WmsVoucherType; label: string; icon: React.ReactNode }> = [
    { id: 'GRN', label: 'استلام وارد (GRN)', icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
    { id: 'GIN', label: 'صرف مخزني (GIN)', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { id: 'SRN', label: 'مرتجع مستودع (SRN)', icon: <RotateCcw className="w-3.5 h-3.5" /> },
    { id: 'STR', label: 'تحويل بين مستودعات (STR)', icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <h3 className="text-lg font-bold text-[#141414]">إنشاء إذن حركة مخزنية متعدد البنود</h3>
            <p className="text-xs text-[#707070] mt-0.5">
              اعتماد فوري من حاتم أو أحمد جمال مع سجل تدقيق كامل + ترحيل آلي للقيد المحاسبي (IAS 2) عند توفر التكلفة
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher Type Switcher */}
        <div className="flex flex-wrap gap-2 mt-4">
          {typeTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setVoucherType(t.id)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
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

        {/* Dual Costing Policy Status Banner */}
        {voucherType === 'GRN' && (
          <div className="mt-3 p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#141414]">
              <FileText className="w-4 h-4 shrink-0" />
              <span>
                <strong>سياسة سعر التكلفة المفعّلة حالياً:</strong>{' '}
                {settings.costingMode === 'mandatory'
                  ? 'إلزامي عند كل وارد — يجب إدخال تكلفة الوحدة لترحيل القيد المحاسبي IAS 2.'
                  : 'اختياري — يمكنك الترحيل بدون سعر الآن، أو إدخال التكلفة لتفعيل القيد المحاسبي الآلي IAS 2 فوراً.'}
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
            <label className="block text-xs font-semibold text-[#141414] mb-1">
              {voucherType === 'STR' ? 'المستودع المصدر *' : 'المستودع *'}
            </label>
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
          ) : voucherType === 'GRN' ? (
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">المورد / مصدر الشحنة</label>
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
              <label className="block text-xs font-semibold text-[#141414] mb-1">الجهة المستفيدة / مركز التكلفة *</label>
              <select
                value={beneficiaryEntity}
                onChange={(e) => setBeneficiaryEntity(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold text-[#141414]"
              >
                {WMS_BENEFICIARIES.map((b) => (
                  <option key={b.id} value={b.nameAr}>
                    {b.nameAr} ({b.costCenterCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Secondary Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {voucherType === 'GIN' && (
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
                  placeholder="اختر موظفاً أو اكتب اسم الفني المستلم"
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
                <label className="block text-xs font-semibold text-[#141414] mb-1">الغرفة / الموقع الدقيق / مرجع المنافسة</label>
                <input
                  type="text"
                  value={roomOrSite}
                  onChange={(e) => setRoomOrSite(e.target.value)}
                  placeholder="مثال: غرفة رابيا أو ETM-2026-88991"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
              </div>
            </>
          )}
          {voucherType === 'GRN' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">رقم أمر الشراء (PO) / بوليصة أمازون</label>
                <input
                  type="text"
                  value={poOrTrackingNo}
                  onChange={(e) => setPoOrTrackingNo(e.target.value)}
                  placeholder="مثال: PO-KAS-2026-881 أو AMZ-9921"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">مرجع المنافسة (إن وُجد)</label>
                <input
                  type="text"
                  value={tenderRef}
                  onChange={(e) => setTenderRef(e.target.value)}
                  placeholder="ETM-2026-..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظات الاستلام</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="حالة التغليف أو الفحص..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
              </div>
            </>
          )}
        </div>

        {/* Multi-Line Items Builder */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#141414]">بنود الأصناف في الإذن ({lines.length})</span>
            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-xs font-bold text-[#141414] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صنف آخر</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, idx) => {
              const selectedItem = items.find((i) => i.id === line.itemId);
              const available = selectedItem ? getAvailableQty(selectedItem.id) : 0;
              const uoms = selectedItem?.uomConversions?.length
                ? selectedItem.uomConversions
                : [{ uomName: selectedItem?.baseUom || 'حبة', factorToBase: 1 }];
              const activeFactor = uoms.find((u) => u.uomName === line.enteredUom)?.factorToBase || 1;
              const basePreview = (Number(line.enteredQty) || 0) * activeFactor;

              return (
                <div key={idx} className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-semibold text-[#707070] mb-1">
                        الصنف (المتاح حالياً: {available} {selectedItem?.baseUom || ''})
                      </label>
                      <select
                        value={line.itemId}
                        onChange={(e) => updateLine(idx, { itemId: e.target.value })}
                        className="w-full rounded-[12px] bg-[#ffffff] px-2.5 py-2 text-xs font-semibold text-[#141414]"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            [{it.sku}] {it.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#707070] mb-1">الكمية</label>
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={line.enteredQty}
                        onChange={(e) => updateLine(idx, { enteredQty: e.target.value })}
                        className="w-full rounded-[12px] bg-[#ffffff] px-2.5 py-2 text-xs font-mono text-[#141414]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#707070] mb-1">الوحدة</label>
                      <select
                        value={line.enteredUom}
                        onChange={(e) => updateLine(idx, { enteredUom: e.target.value })}
                        className="w-full rounded-[12px] bg-[#ffffff] px-2 py-2 text-xs font-semibold text-[#141414]"
                      >
                        {uoms.map((u) => (
                          <option key={u.uomName} value={u.uomName}>
                            {u.uomName} {u.factorToBase > 1 ? `(×${u.factorToBase})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#707070] mb-1">
                        التكلفة (⃁) {voucherType === 'GRN' && settings.costingMode === 'mandatory' ? '*' : ''}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                        className="w-full rounded-[12px] bg-[#ffffff] px-2.5 py-2 text-xs font-mono text-[#141414]"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-[#141414]"
                          title="حذف السطر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Advanced tracking fields per line */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    {selectedItem?.trackingMode === 'SERIAL' && (
                      <input
                        type="text"
                        value={line.serialsText}
                        onChange={(e) => updateLine(idx, { serialsText: e.target.value })}
                        placeholder="الأرقام التسلسلية S/N (مفصولة بفاصلة)"
                        className="rounded-[10px] bg-[#ffffff] px-2.5 py-1.5 text-[11px] font-mono text-[#141414]"
                      />
                    )}
                    {selectedItem?.trackingMode === 'LOT_EXPIRY' && (
                      <>
                        <input
                          type="text"
                          value={line.lotNumber}
                          onChange={(e) => updateLine(idx, { lotNumber: e.target.value })}
                          placeholder="رقم التشغيلة (Lot #)"
                          className="rounded-[10px] bg-[#ffffff] px-2.5 py-1.5 text-[11px] font-mono text-[#141414]"
                        />
                        <input
                          type="date"
                          value={line.expiryDate}
                          onChange={(e) => updateLine(idx, { expiryDate: e.target.value })}
                          className="rounded-[10px] bg-[#ffffff] px-2.5 py-1.5 text-[11px] font-mono text-[#141414]"
                        />
                      </>
                    )}
                    {voucherType === 'SRN' && (
                      <select
                        value={line.conditionStatus}
                        onChange={(e) => updateLine(idx, { conditionStatus: e.target.value as WmsConditionStatus })}
                        className="rounded-[10px] bg-[#ffffff] px-2.5 py-1.5 text-[11px] font-semibold text-[#141414]"
                      >
                        <option value="سليم">حالة المرتجع: سليم (يعود للمخزون)</option>
                        <option value="يحتاج صيانة">حالة المرتجع: يحتاج صيانة (الحجر)</option>
                        <option value="تالف">حالة المرتجع: تالف (الحجر/الإتلاف)</option>
                      </select>
                    )}
                    {activeFactor > 1 && (
                      <div className="text-[11px] font-semibold text-[#707070] flex items-center">
                        يعادل بوحدة الأساس: <strong className="mx-1 text-[#141414]">{basePreview} {selectedItem?.baseUom}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-[#f0f0f0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414]"
          >
            إلغاء
          </button>
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
// 3. DOUBLE-ENTRY ITEM STOCK CARD MODAL (كرت الصنف التحليلي)
// ============================================================================
export const WmsStockCardModal: React.FC<{
  item: WmsItem | null;
  entries: WmsStockCardEntry[];
  stockSummary: { onHand: number; reserved: number; available: number };
  onClose: () => void;
}> = ({ item, entries, stockSummary, onClose }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-mono font-bold text-[#141414]">
                {item.sku}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#707070]">
                باركود: {item.barcode}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#141414] mt-1">كرت الصنف التحليلي — {item.nameAr}</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
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
                    لا توجد حركات مرحّلة لهذا الصنف حتى الآن.
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
                {voucher.postedByName || 'احمد جمال احمد البشير'}
              </div>
            </div>
            <div>
              <div className="text-[#707070] mb-6">توقيع المستلم</div>
              <div className="font-bold text-[#141414] border-t border-[#e0e0e0] pt-1.5">
                {voucher.recipientName || '.........................'}
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
