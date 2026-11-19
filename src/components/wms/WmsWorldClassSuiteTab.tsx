import React, { useMemo, useState } from 'react';
import {
  Inbox,
  Grid,
  ShoppingCart,
  Shield,
  TrendingDown,
  Plus,
  CheckCircle2,
  XCircle,
  Sparkles,
  Wrench,
  Search,
  ArrowDownLeft,
} from 'lucide-react';
import {
  wmsAdvancedOpsService,
  WmsBinHeatmapCell,
} from '../../services/wms/wmsAdvancedOpsService';
import { WMS_BENEFICIARIES } from '../../services/wms/wmsExcelMigrationSeed';
import { WmsActor } from '../../services/wms/wmsEngineService';
import { WmsItem, WmsWarehouse } from '../../types/wms';

type WorldClassSubTab = 'requisitions' | 'heatmap' | 'auto-pr' | 'warranty' | 'aging';

export const WmsWorldClassSuiteTab: React.FC<{
  items: WmsItem[];
  warehouses: WmsWarehouse[];
  actor: WmsActor;
  onStateChanged: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}> = ({ items, warehouses, actor, onStateChanged, onNotify }) => {
  const [subTab, setSubTab] = useState<WorldClassSubTab>('requisitions');
  const [advTick, setAdvTick] = useState(0);
  const refreshAdv = () => setAdvTick((t) => t + 1);

  const advState = useMemo(() => wmsAdvancedOpsService.getState(), [advTick]);
  const heatmapCells = useMemo(() => wmsAdvancedOpsService.computeWarehouseHeatmap(), [advTick, items]);
  const agingRows = useMemo(() => wmsAdvancedOpsService.computeAgingAndForecast(), [advTick, items]);

  // ── Requisition form state ──
  const [reqBy, setReqBy] = useState('');
  const [reqBen, setReqBen] = useState(WMS_BENEFICIARIES[0].nameAr);
  const [reqRoom, setReqRoom] = useState('');
  const [reqPriority, setReqPriority] = useState<'عاجل' | 'عادي'>('عادي');
  const [reqItemId, setReqItemId] = useState(items[0]?.id || '');
  const [reqQty, setReqQty] = useState('1');
  const [reqNotes, setReqNotes] = useState('');

  // ── Heatmap state ──
  const [heatmapQuery, setHeatmapQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<WmsBinHeatmapCell | null>(null);

  // ── Warranty form state ──
  const [wrnAsset, setWrnAsset] = useState('');
  const [wrnSerial, setWrnSerial] = useState('');
  const [wrnLoc, setWrnLoc] = useState('مكتب التجارة والمنافسات (كاس)');
  const [wrnVendor, setWrnVendor] = useState('');
  const [wrnPurchase, setWrnPurchase] = useState(new Date().toISOString().slice(0, 10));
  const [wrnEnd, setWrnEnd] = useState('2028-11-19');
  const [maintTargetId, setMaintTargetId] = useState<string | null>(null);
  const [maintIssue, setMaintIssue] = useState('');
  const [maintCost, setMaintCost] = useState('0');

  // ── Aging filter ──
  const [agingFilter, setAgingFilter] = useState<'all' | 'dead' | 'fast'>('all');

  const filteredAging = useMemo(() => {
    if (agingFilter === 'dead') return agingRows.filter((r) => r.movementClass === 'راكد (Dead Stock)');
    if (agingFilter === 'fast') return agingRows.filter((r) => r.movementClass === 'سريع الحركة (X)');
    return agingRows;
  }, [agingRows, agingFilter]);

  const openReqCount = advState.requisitions.filter((r) => r.status === 'جديد').length;
  const openPrCount = advState.purchaseRequests.filter((p) => p.status !== 'تم الاستلام (GRN)').length;
  const deadCount = agingRows.filter((r) => r.movementClass === 'راكد (Dead Stock)').length;

  return (
    <div className="space-y-5">
      {/* Sub-navigation pills */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-3 flex flex-wrap gap-2">
        {[
          { id: 'requisitions' as const, label: '1. بوابة طلبات الصرف (MRQ → GIN)', icon: <Inbox className="w-3.5 h-3.5" />, badge: openReqCount },
          { id: 'heatmap' as const, label: '2. خريطة المستودع والأرفف (2D Heatmap)', icon: <Grid className="w-3.5 h-3.5" />, badge: heatmapCells.length },
          { id: 'auto-pr' as const, label: '3. طلبات الشراء التلقائية (Auto-PR)', icon: <ShoppingCart className="w-3.5 h-3.5" />, badge: openPrCount },
          { id: 'warranty' as const, label: '4. الضمان والصيانة الدورية للأجهزة', icon: <Shield className="w-3.5 h-3.5" />, badge: advState.warranties.length },
          { id: 'aging' as const, label: '5. تحليل الراكد والتنبؤ بالطلب (ABC-XYZ)', icon: <TrendingDown className="w-3.5 h-3.5" />, badge: `${deadCount} راكد` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
              subTab === t.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                subTab === t.id ? 'bg-white/20 text-white' : 'bg-[#ffffff] text-[#141414]'
              }`}
            >
              {t.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* 1. INTERNAL MATERIAL REQUISITIONS PORTAL (MRQ -> 1-CLICK GIN)      */}
      {/* ================================================================== */}
      {subTab === 'requisitions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reqItemId) return;
              const benObj = WMS_BENEFICIARIES.find((b) => b.nameAr === reqBen);
              const created = wmsAdvancedOpsService.createRequisition({
                requestedBy: reqBy.trim() || actor.name,
                beneficiaryEntity: reqBen,
                costCenterCode: benObj?.costCenterCode || 'CC-KAS-01',
                roomOrSite: reqRoom,
                priority: reqPriority,
                itemId: reqItemId,
                qty: Number(reqQty) || 1,
                notes: reqNotes,
              });
              if (created) {
                refreshAdv();
                setReqBy('');
                setReqRoom('');
                setReqNotes('');
                onNotify('تسجيل طلب صرف إلكتروني', `تم إنشاء الطلب (${created.reqNo}) وإضافته لطابور التجهيز.`, 'success');
              }
            }}
            className="lg:col-span-4 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-[#141414]">رفع طلب صرف داخلي جديد (MRQ)</h3>
            <p className="text-[11px] text-[#707070]">
              بديل احترافي عن طلبات الواتساب — يصدر الطلب لطابور حاتم وأحمد جمال للتحويل الفوري إلى إذن صرف (GIN).
            </p>
            <input
              type="text"
              required
              value={reqBy}
              onChange={(e) => setReqBy(e.target.value)}
              placeholder="اسم مقدم الطلب (مثال: مشرفة السكن / حسن يوسف) *"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <select
              value={reqBen}
              onChange={(e) => setReqBen(e.target.value)}
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
            >
              {WMS_BENEFICIARIES.map((b) => (
                <option key={b.id} value={b.nameAr}>
                  {b.nameAr}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={reqRoom}
                onChange={(e) => setReqRoom(e.target.value)}
                placeholder="الغرفة / الموقع"
                className="rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
              <select
                value={reqPriority}
                onChange={(e) => setReqPriority(e.target.value as 'عاجل' | 'عادي')}
                className="rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold"
              >
                <option value="عادي">أولوية: عادي</option>
                <option value="عاجل">أولوية: عاجل</option>
              </select>
            </div>
            <select
              value={reqItemId}
              onChange={(e) => setReqItemId(e.target.value)}
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.sku}] {it.nameAr}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                value={reqQty}
                onChange={(e) => setReqQty(e.target.value)}
                placeholder="الكمية"
                className="rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
              <input
                type="text"
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="ملاحظة"
                className="rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إرسال الطلب إلى طابور المستودع</span>
            </button>
          </form>

          <div className="lg:col-span-8 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#141414]">
              طابور طلبات الصرف الواردة من المكاتب والسكن ({advState.requisitions.length})
            </h3>
            <div className="space-y-3">
              {advState.requisitions.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-[18px] border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    r.status === 'جديد' ? 'border-[#141414] bg-[#ffffff]' : 'border-[#e0e0e0] bg-[#fafafa]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#141414]">{r.reqNo}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.priority === 'عاجل' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                        }`}
                      >
                        {r.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold text-[#707070]">
                        {r.status}
                      </span>
                      <span className="text-[11px] font-mono text-[#707070]">{r.requestDate}</span>
                    </div>
                    <div className="text-xs font-bold text-[#141414]">
                      {r.beneficiaryEntity} {r.roomOrSite ? `— ${r.roomOrSite}` : ''} • مقدم الطلب: {r.requestedBy}
                    </div>
                    <div className="text-xs text-[#707070]">
                      {r.lines.map((l) => `${l.itemName} (×${l.requestedQty} ${l.uom})`).join(' • ')}
                    </div>
                    {r.convertedVoucherNo && (
                      <div className="text-[11px] font-mono font-bold text-[#141414]">
                        تم تحويله لإذن صرف: {r.convertedVoucherNo}
                      </div>
                    )}
                  </div>

                  {r.status === 'جديد' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const res = wmsAdvancedOpsService.convertRequisitionToGin(
                            r.id,
                            warehouses[0]?.id || 'WH-MAIN',
                            actor
                          );
                          if (!res.ok) {
                            onNotify('تعذر الصرف', res.error || '', 'error');
                            return;
                          }
                          refreshAdv();
                          onStateChanged();
                          onNotify(
                            'تحويل فوري إلى إذن صرف (GIN)',
                            `تم صرف الطلب (${r.reqNo}) وإصدار الإذن (${res.voucherNo}) وخصم الرصيد.`,
                            'success'
                          );
                        }}
                        className="px-3.5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تحويل لصرف (GIN)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          wmsAdvancedOpsService.rejectRequisition(r.id, 'تأجيل / غير متوفر', actor);
                          refreshAdv();
                          onNotify('رفض الطلب', `تم تحديث حالة الطلب ${r.reqNo}.`, 'info');
                        }}
                        className="px-3 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#707070] flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. INTERACTIVE 2D VISUAL RACK / BIN HEATMAP                        */}
      {/* ================================================================== */}
      {subTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">خريطة المستودعات والأرفف التفاعلية (Visual Bin Heatmap)</h3>
              <p className="text-[11px] text-[#707070]">
                ابحث عن أي صنف لتضيء خانته ورفه فوراً على الخريطة، واضغط على أي منطقة لعرض كافة أصنافها وأرصدتها.
              </p>
            </div>
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={heatmapQuery}
                onChange={(e) => setHeatmapQuery(e.target.value)}
                placeholder="ابحث لإضاءة رف الصنف (مثال: كشاف، Nikon، شاش)..."
                className="w-full rounded-full bg-[#f0f0f0] pr-10 pl-4 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {heatmapCells.map((cell) => {
              const q = heatmapQuery.trim().toLowerCase();
              const isHighlighted =
                q.length > 0 &&
                cell.items.some((i) => i.nameAr.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
              const isSelected =
                selectedCell?.warehouseId === cell.warehouseId && selectedCell?.zoneLabel === cell.zoneLabel;

              return (
                <button
                  key={`${cell.warehouseId}-${cell.zoneLabel}`}
                  type="button"
                  onClick={() => setSelectedCell(cell)}
                  className={`text-right p-4 rounded-[20px] border transition-colors space-y-2.5 ${
                    isHighlighted
                      ? 'border-2 border-[#0066ff] bg-[#f3f3f3]'
                      : isSelected
                      ? 'border-2 border-[#141414] bg-[#f3f3f3]'
                      : 'border-[#e0e0e0] bg-[#ffffff] hover:border-[#141414]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#141414] text-white">
                      {cell.warehouseId}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#707070]">امتلاء {cell.occupancyPct}%</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141414]">{cell.zoneLabel}</div>
                    <div className="text-[11px] text-[#707070]">{cell.warehouseName}</div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#f0f0f0] overflow-hidden">
                    <div
                      className="h-full bg-[#141414] rounded-full"
                      style={{ width: `${Math.max(8, cell.occupancyPct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#707070]">
                    <span>
                      الأصناف: <strong className="text-[#141414] font-mono">{cell.itemsCount}</strong>
                    </span>
                    <span>
                      الوحدات: <strong className="text-[#141414] font-mono">{cell.totalUnits.toLocaleString()}</strong>
                    </span>
                    <span>نقص: {cell.lowStockCount}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCell && (
            <div className="bg-[#ffffff] border border-[#141414] rounded-[24px] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#141414]">
                  محتويات المنطقة: {selectedCell.zoneLabel} — {selectedCell.warehouseName} ({selectedCell.items.length} صنف)
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="text-xs font-bold text-[#707070] underline"
                >
                  إغلاق
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {selectedCell.items.map((it) => (
                  <div key={it.id} className="p-2.5 rounded-[12px] bg-[#f3f3f3] flex items-center justify-between text-xs">
                    <div className="truncate pl-2">
                      <div className="font-bold text-[#141414] truncate">{it.nameAr}</div>
                      <div className="font-mono text-[10px] text-[#707070]">{it.sku}</div>
                    </div>
                    <span className="font-mono font-bold text-[#141414] shrink-0">
                      {it.onHand} {it.baseUom}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* 3. AUTO-PURCHASE REQUESTS FROM LOW STOCK (Auto-PR -> GRN)          */}
      {/* ================================================================== */}
      {subTab === 'auto-pr' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">محرك طلبات الشراء التلقائية (Auto-PR لقسم المشتريات)</h3>
              <p className="text-[11px] text-[#707070]">
                يولّد طلبات شراء آلية للأصناف تحت حد إعادة الطلب (ROP) موجهة لمندوبي المشتريات (كريم وجلال) مع زر استلام مباشر إلى GRN.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const created = wmsAdvancedOpsService.generateAutoPurchaseRequestsFromLowStock();
                refreshAdv();
                onNotify(
                  'توليد طلبات شراء آلية (Auto-PR)',
                  created.length > 0
                    ? `تم توليد (${created.length}) طلب شراء آلي للأصناف الناقصة وتوجيهها للمشتريات.`
                    : 'جميع الأصناف الناقصة لديها طلبات شراء مفتوحة بالفعل.',
                  created.length > 0 ? 'success' : 'info'
                );
              }}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>توليد طلبات شراء آلية لكل الأصناف الناقصة</span>
            </button>
          </div>

          {advState.purchaseRequests.length === 0 ? (
            <div className="p-10 text-center bg-[#f3f3f3] rounded-[18px] text-xs text-[#707070]">
              اضغط <strong>«توليد طلبات شراء آلية»</strong> لفحص رادار المخزون وإنشاء طلبات شراء جاهزة للمشتريات فوراً.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">رقم الطلب PR</th>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">المتاح / حد الطلب</th>
                    <th className="p-2.5">الكمية المقترحة</th>
                    <th className="p-2.5">مندوب المشتريات</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5">استلام بالمستودع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {advState.purchaseRequests.slice(0, 40).map((pr) => (
                    <tr key={pr.id}>
                      <td className="p-2.5 font-mono font-bold">{pr.prNo}</td>
                      <td className="p-2.5 font-semibold text-[#141414]">{pr.itemName}</td>
                      <td className="p-2.5 font-mono">
                        {pr.currentAvailableQty} / {pr.reorderPoint}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#141414]">
                        +{pr.suggestedOrderQty} {pr.uom}
                      </td>
                      <td className="p-2.5 text-[#707070]">{pr.assignedBuyer}</td>
                      <td className="p-2.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">{pr.status}</span>
                      </td>
                      <td className="p-2.5">
                        {pr.status !== 'تم الاستلام (GRN)' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const res = wmsAdvancedOpsService.receivePurchaseRequestAsGrn(
                                pr.id,
                                pr.suggestedOrderQty,
                                pr.estimatedUnitCost,
                                actor
                              );
                              if (!res.ok) {
                                onNotify('تعذر الاستلام', res.error || '', 'error');
                                return;
                              }
                              refreshAdv();
                              onStateChanged();
                              onNotify('استلام طلب الشراء', `تم إصدار إذن الوارد (${res.voucherNo}) وتحديث الرصيد.`, 'success');
                            }}
                            className="px-3 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>استلام (GRN)</span>
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] text-[#707070]">{pr.receivedVoucherNo}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* 4. WARRANTY & PREVENTIVE MAINTENANCE TRACKER                       */}
      {/* ================================================================== */}
      {subTab === 'warranty' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!wrnAsset.trim()) return;
              wmsAdvancedOpsService.createWarrantyRecord({
                assetName: wrnAsset,
                serialNumber: wrnSerial,
                locationOrCustodian: wrnLoc,
                vendorName: wrnVendor,
                purchaseDate: wrnPurchase,
                warrantyEndDate: wrnEnd,
              });
              setWrnAsset('');
              setWrnSerial('');
              setWrnVendor('');
              refreshAdv();
              onNotify('تسجيل ضمان جهاز', 'تمت إضافة سجل الضمان والصيانة بنجاح.', 'success');
            }}
            className="lg:col-span-4 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-[#141414]">تسجيل ضمان جهاز / أصل جديد</h3>
            <input
              type="text"
              required
              value={wrnAsset}
              onChange={(e) => setWrnAsset(e.target.value)}
              placeholder="اسم الجهاز (مثال: طابعة HP / مبرد مياه) *"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={wrnSerial}
              onChange={(e) => setWrnSerial(e.target.value)}
              placeholder="الرقم التسلسلي (S/N)"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
            />
            <input
              type="text"
              value={wrnLoc}
              onChange={(e) => setWrnLoc(e.target.value)}
              placeholder="الموقع أو صاحب العهدة"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={wrnVendor}
              onChange={(e) => setWrnVendor(e.target.value)}
              placeholder="الوكيل / المورد المعتمد"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#707070] mb-1">تاريخ الشراء</label>
                <input
                  type="date"
                  value={wrnPurchase}
                  onChange={(e) => setWrnPurchase(e.target.value)}
                  className="w-full rounded-[12px] bg-[#f0f0f0] px-2.5 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#707070] mb-1">انتهاء الضمان</label>
                <input
                  type="date"
                  value={wrnEnd}
                  onChange={(e) => setWrnEnd(e.target.value)}
                  className="w-full rounded-[12px] bg-[#f0f0f0] px-2.5 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold">
              حفظ سجل الضمان
            </button>
          </form>

          <div className="lg:col-span-8 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#141414]">سجل الضمان والصيانة الدورية لأجهزة كاس ({advState.warranties.length})</h3>
            <div className="space-y-3">
              {advState.warranties.map((w) => (
                <div key={w.id} className="p-4 rounded-[18px] border border-[#e0e0e0] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#141414]">{w.assetName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'قريب الانتهاء' || w.status === 'تحت الصيانة'
                              ? 'bg-[#141414] text-white'
                              : 'bg-[#f3f3f3] text-[#141414]'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#707070] mt-0.5">
                        S/N: <span className="font-mono text-[#141414]">{w.serialNumber}</span> • {w.locationOrCustodian} • الوكيل: {w.vendorName}
                      </div>
                      <div className="text-[11px] font-mono text-[#707070]">
                        الشراء: {w.purchaseDate} ← انتهاء الضمان: <strong className="text-[#141414]">{w.warrantyEndDate}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaintTargetId(maintTargetId === w.id ? null : w.id)}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>تسجيل صيانة ({w.maintenanceLogs.length})</span>
                    </button>
                  </div>

                  {maintTargetId === w.id && (
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] flex flex-wrap gap-2 items-center">
                      <input
                        type="text"
                        value={maintIssue}
                        onChange={(e) => setMaintIssue(e.target.value)}
                        placeholder="وصف العطل أو الصيانة الدورية..."
                        className="flex-1 min-w-[180px] rounded-full bg-[#ffffff] px-3 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        min={0}
                        value={maintCost}
                        onChange={(e) => setMaintCost(e.target.value)}
                        placeholder="التكلفة ⃁"
                        className="w-24 rounded-full bg-[#ffffff] px-3 py-1.5 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!maintIssue.trim()) return;
                          wmsAdvancedOpsService.logMaintenanceEvent(w.id, {
                            issue: maintIssue,
                            vendorOrTech: w.vendorName,
                            cost: Number(maintCost) || 0,
                            status: 'مكتمل',
                          });
                          setMaintIssue('');
                          setMaintCost('0');
                          setMaintTargetId(null);
                          refreshAdv();
                          onNotify('توثيق الصيانة', 'تم تسجيل سجل الصيانة على الجهاز.', 'success');
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold"
                      >
                        حفظ
                      </button>
                    </div>
                  )}

                  {w.maintenanceLogs.length > 0 && (
                    <div className="text-[11px] text-[#707070] pt-1 border-t border-[#f0f0f0] space-y-1">
                      {w.maintenanceLogs.map((m) => (
                        <div key={m.id}>
                          • [{m.date}] {m.issue} — <strong className="text-[#141414]">{m.cost} ⃁</strong> ({m.status})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* 5. DEAD STOCK AGING & MONTHLY DEMAND FORECAST (ABC-XYZ)            */}
      {/* ================================================================== */}
      {subTab === 'aging' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">تحليل الأصناف الراكدة (Dead Stock Aging) والتنبؤ بالطلب الشهري</h3>
              <p className="text-[11px] text-[#707070]">
                يحسب معدل الاستهلاك الشهري لكل صنف، عدد أيام الركود، والكمية المقترح طلبها للشهر القادم آلياً.
              </p>
            </div>
            <div className="flex gap-1.5">
              {[
                { id: 'all' as const, label: `الكل (${agingRows.length})` },
                { id: 'dead' as const, label: `الأصناف الراكدة (${deadCount})` },
                { id: 'fast' as const, label: 'سريعة الحركة (X)' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAgingFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    agingFilter === f.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">الرصيد الحالي</th>
                  <th className="p-2.5">المصروف (90 يوماً)</th>
                  <th className="p-2.5">متوسط الطلب الشهري</th>
                  <th className="p-2.5">أيام بدون حركة</th>
                  <th className="p-2.5">التصنيف (XYZ)</th>
                  <th className="p-2.5">توقع طلب الشهر القادم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {filteredAging.slice(0, 60).map((row) => (
                  <tr key={row.itemId} className="hover:bg-[#fafafa]">
                    <td className="p-2.5 font-mono font-bold">{row.sku}</td>
                    <td className="p-2.5 font-semibold text-[#141414]">{row.nameAr}</td>
                    <td className="p-2.5 font-mono font-bold">
                      {row.onHand} {row.baseUom}
                    </td>
                    <td className="p-2.5 font-mono">{row.totalIssued90d}</td>
                    <td className="p-2.5 font-mono">{row.avgMonthlyDemand} / شهر</td>
                    <td className="p-2.5 font-mono">{row.daysSinceLastMovement} يوم</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.movementClass === 'راكد (Dead Stock)'
                            ? 'bg-[#141414] text-white'
                            : 'bg-[#f3f3f3] text-[#141414]'
                        }`}
                      >
                        {row.movementClass}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-[#141414]">
                      {row.suggestedNextMonthOrder > 0 ? `+${row.suggestedNextMonthOrder} ${row.baseUom}` : 'مغطّى'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
