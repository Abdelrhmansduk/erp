import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileCheck2,
  Layers,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import {
  WmsLandedCostCharge,
  WmsPurchaseOrder,
} from '../../types/wms';
import { wmsAdvancedOpsService } from '../../services/wms/wmsAdvancedOpsService';
import { WmsActor, wmsEngineService, WmsStateSnapshot } from '../../services/wms/wmsEngineService';
import { wmsProcurementService } from '../../services/wms/wmsProcurementService';

type SubTabId = 'procurement' | '3way-rtv' | 'qc-transit-fefo' | 'kits-landed-approvals';

export const WmsProcurementAndControlsTab: React.FC<{
  state: WmsStateSnapshot;
  actor: WmsActor;
  onRefresh: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}> = ({ state, actor, onRefresh, onNotify }) => {
  const co = state.settings.company_id || 'KAS';
  const [subTab, setSubTab] = useState<SubTabId>('procurement');

  const proc = wmsProcurementService.getState(co);
  const adv = wmsAdvancedOpsService.getState();
  const openPrs = useMemo(
    () => adv.purchaseRequests.filter((p) => p.status === 'مفتوح للمشتريات'),
    [adv.purchaseRequests]
  );

  // ── 1. Vendor & PO Form State ──
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    nameAr: '',
    vatNumber: '310',
    phone: '',
    leadTimeDays: 3,
    paymentTerms: 'آجل 30 يوماً (Net 30)',
  });

  const [poVendorId, setPoVendorId] = useState(proc.vendors[0]?.id || '');
  const [poWarehouseId, setPoWarehouseId] = useState(state.warehouses[0]?.id || 'WH-MAIN');
  const [poLines, setPoLines] = useState<Array<{ itemId: string; orderedQty: number; unitCost: number }>>([
    {
      itemId: state.items[0]?.id || '',
      orderedQty: 5,
      unitCost: state.items[0]?.avgUnitCost || 100,
    },
  ]);

  // Partial GRN inline modal state
  const [receivingPo, setReceivingPo] = useState<WmsPurchaseOrder | null>(null);
  const [receiveQtyMap, setReceiveQtyMap] = useState<Record<string, number>>({});
  const [receiveLotMap, setReceiveLotMap] = useState<Record<string, string>>({});
  const [receiveExpMap, setReceiveExpMap] = useState<Record<string, string>>({});

  // ── 2. 3-Way Match & RTV State ──
  const invoiceablePos = useMemo(
    () =>
      proc.purchaseOrders.filter((p) => p.lines.some((l) => l.receivedQty > 0)),
    [proc.purchaseOrders]
  );
  const [invPoId, setInvPoId] = useState(invoiceablePos[0]?.id || '');
  const [vendorInvNo, setVendorInvNo] = useState('');
  const [invLinesQty, setInvLinesQty] = useState<Record<string, number>>({});
  const [invLinesCost, setInvLinesCost] = useState<Record<string, number>>({});

  const [rtvVendorId, setRtvVendorId] = useState(proc.vendors[0]?.id || '');
  const [rtvWarehouseId, setRtvWarehouseId] = useState(state.warehouses[0]?.id || 'WH-MAIN');
  const [rtvItemId, setRtvItemId] = useState(state.items[0]?.id || '');
  const [rtvQty, setRtvQty] = useState(1);
  const [rtvUnitCost, setRtvUnitCost] = useState(state.items[0]?.avgUnitCost || 50);
  const [rtvReason, setRtvReason] = useState('بضاعة مخالفة للمواصفات الفنية');

  // ── 3. QC, In-Transit & FEFO State ──
  const [qcAppMap, setQcAppMap] = useState<Record<string, number>>({});
  const [qcRejMap, setQcRejMap] = useState<Record<string, number>>({});
  const [transitRecMap, setTransitRecMap] = useState<Record<string, number>>({});
  const [binSearch, setBinSearch] = useState('');

  // ── 4. Kits / Landed Cost / Approvals State ──
  const [kitCode, setKitCode] = useState('');
  const [kitNameAr, setKitNameAr] = useState('');
  const [kitWhId, setKitWhId] = useState(state.warehouses[0]?.id || 'WH-MAIN');
  const [kitCompItemId, setKitCompItemId] = useState(state.items[0]?.id || '');
  const [kitCompQty, setKitCompQty] = useState(1);
  const [kitIssueQtyMap, setKitIssueQtyMap] = useState<Record<string, number>>({});
  const [kitBeneficiary, setKitBeneficiary] = useState('سكن العاملات (مركز الإيواء)');

  const postedGrns = useMemo(
    () => state.vouchers.filter((v) => v.voucherType === 'GRN' && v.status === 'POSTED'),
    [state.vouchers]
  );
  const [lcVoucherId, setLcVoucherId] = useState(postedGrns[0]?.id || '');
  const [lcChargeType, setLcChargeType] = useState<WmsLandedCostCharge['chargeType']>('شحن ونقل');
  const [lcAmount, setLcAmount] = useState(500);
  const [lcMethod, setLcMethod] = useState<'BY_VALUE' | 'BY_QTY'>('BY_VALUE');

  const poSubtotal = useMemo(
    () =>
      poLines.reduce(
        (s, l) => s + Math.max(0, Number(l.orderedQty || 0)) * Math.max(0, Number(l.unitCost || 0)),
        0
      ),
    [poLines]
  );

  const selectedInvPo = useMemo(
    () => proc.purchaseOrders.find((p) => p.id === (invPoId || invoiceablePos[0]?.id)),
    [proc.purchaseOrders, invPoId, invoiceablePos]
  );

  const filteredBins = useMemo(() => {
    const q = binSearch.trim().toLowerCase();
    const itemMap = new Map(state.items.map((i) => [i.id, i]));
    return state.binLotQuants
      .filter((b) => {
        if (!q) return true;
        const item = itemMap.get(b.itemId);
        return (
          b.locationCode.toLowerCase().includes(q) ||
          b.lotNumber.toLowerCase().includes(q) ||
          b.warehouseId.toLowerCase().includes(q) ||
          (item?.nameAr.toLowerCase().includes(q) ?? false) ||
          (item?.sku.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 80);
  }, [state.binLotQuants, state.items, binSearch]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Navigation Pills */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#141414] m-0">
            منظومة المشتريات الكاملة (P2P) والرقابة المتقدمة — [{co}]
          </h2>
          <p className="text-xs text-[#707070] mt-0.5">
            إدارة الموردين • أوامر الشراء والاستلام الجزئي • المطابقة الثلاثية (PO ↔ GRN ↔ Invoice + VAT 15%) • مرتجع المورد (RTV) • الجودة QC • التحويل بالطريق • FEFO/FIFO • Maker ≠ Checker
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-[#f3f3f3] p-1.5 rounded-full">
          {[
            { id: 'procurement', label: 'الموردون و PO والاستلام الجزئي', icon: <Building2 className="w-3.5 h-3.5" /> },
            { id: '3way-rtv', label: 'المطابقة الثلاثية و RTV', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
            {
              id: 'qc-transit-fefo',
              label: `QC (${state.qcInspections.filter((q) => q.status === 'PENDING_QC').length}) / بالطريق (${
                state.inTransitTransfers.filter((t) => t.status === 'IN_TRANSIT').length
              }) / FEFO`,
              icon: <PackageCheck className="w-3.5 h-3.5" />,
            },
            {
              id: 'kits-landed-approvals',
              label: `Kits و Landed Cost والاعتمادات (${
                state.approvalRequests.filter((a) => a.status === 'PENDING').length
              })`,
              icon: <Layers className="w-3.5 h-3.5" />,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as SubTabId)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                subTab === t.id ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#ffffff]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-TAB 1: VENDORS, PURCHASE ORDERS & PARTIAL GRN                    */}
      {/* ==================================================================== */}
      {subTab === 'procurement' && (
        <div className="space-y-5">
          {/* Open Purchase Requests quick conversion */}
          {openPrs.length > 0 && (
            <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[24px] p-4 space-y-2.5">
              <div className="text-xs font-bold text-[#141414]">
                طلبات شراء مفتوحة من رادار المخزون ({openPrs.length}) — جاهزة للتحويل إلى أمر شراء رسمي (PO):
              </div>
              <div className="flex flex-wrap gap-2">
                {openPrs.slice(0, 6).map((pr) => (
                  <div
                    key={pr.id}
                    className="bg-[#ffffff] border border-[#e0e0e0] rounded-[16px] px-3 py-2 flex items-center gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#141414]">{pr.prNo}</span> • {pr.itemName} (
                      {pr.suggestedOrderQty} {pr.uom})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const targetVnd = poVendorId || proc.vendors[0]?.id;
                        if (!targetVnd) return;
                        const res = wmsProcurementService.convertPrToPurchaseOrder(
                          pr.id,
                          targetVnd,
                          poWarehouseId,
                          actor,
                          co
                        );
                        if (!res.ok) {
                          onNotify('تعذر التحويل', res.error || '', 'error');
                        } else {
                          onRefresh();
                          onNotify('تم إنشاء أمر الشراء', `تم تحويل الطلب ${pr.prNo} إلى ${res.po?.poNo}`, 'success');
                        }
                      }}
                      className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                    >
                      تحويل لـ PO
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Directory + Add Vendor */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#141414]" />
                <h3 className="text-sm font-bold text-[#141414]">دليل الموردين المعتمدين ({proc.vendors.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewVendor((s) => !s)}
                className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewVendor ? 'إغلاق نموذج المورد' : 'إضافة مورد جديد'}</span>
              </button>
            </div>

            {showNewVendor && (
              <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[18px] p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                <input
                  type="text"
                  value={vendorForm.nameAr}
                  onChange={(e) => setVendorForm((f) => ({ ...f, nameAr: e.target.value }))}
                  placeholder="اسم المورد الرسمي..."
                  className="md:col-span-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3.5 py-2"
                />
                <input
                  type="text"
                  value={vendorForm.vatNumber}
                  onChange={(e) => setVendorForm((f) => ({ ...f, vatNumber: e.target.value }))}
                  placeholder="الرقم الضريبي (15 خانة)"
                  className="rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3.5 py-2 font-mono"
                />
                <input
                  type="text"
                  value={vendorForm.paymentTerms}
                  onChange={(e) => setVendorForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  placeholder="شروط السداد"
                  className="rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3.5 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!vendorForm.nameAr.trim()) {
                      onNotify('حقل مطلوب', 'يرجى كتابة اسم المورد.', 'warning');
                      return;
                    }
                    const created = wmsProcurementService.createVendor(
                      {
                        nameAr: vendorForm.nameAr,
                        vatNumber: vendorForm.vatNumber,
                        phone: vendorForm.phone,
                        leadTimeDays: vendorForm.leadTimeDays,
                        paymentTerms: vendorForm.paymentTerms,
                        rating: 4.5,
                      },
                      actor,
                      co
                    );
                    setPoVendorId(created.id);
                    setShowNewVendor(false);
                    setVendorForm({ nameAr: '', vatNumber: '310', phone: '', leadTimeDays: 3, paymentTerms: 'آجل 30 يوماً (Net 30)' });
                    onRefresh();
                    onNotify('تمت إضافة المورد', `تم اعتماد المورد ${created.nameAr} (${created.vendorCode}).`, 'success');
                  }}
                  className="rounded-full bg-[#141414] text-white font-bold px-4 py-2"
                >
                  حفظ المورد
                </button>
              </div>
            )}

            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">الرمز</th>
                    <th className="p-2.5">اسم المورد</th>
                    <th className="p-2.5">الرقم الضريبي (ZATCA)</th>
                    <th className="p-2.5">مدة التوريد</th>
                    <th className="p-2.5">شروط السداد</th>
                    <th className="p-2.5">التقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {proc.vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-[#fafafa]">
                      <td className="p-2.5 font-mono font-bold text-[#141414]">{v.vendorCode}</td>
                      <td className="p-2.5 font-bold text-[#141414]">{v.nameAr}</td>
                      <td className="p-2.5 font-mono text-[#707070]">{v.vatNumber}</td>
                      <td className="p-2.5 font-mono">{v.leadTimeDays} أيام</td>
                      <td className="p-2.5 text-[#707070]">{v.paymentTerms}</td>
                      <td className="p-2.5 font-mono font-bold">{v.rating.toFixed(1)} / 5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Purchase Order */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#141414]">إصدار أمر شراء جديد (Purchase Order + 15% VAT)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">المورد المعتمد</label>
                <select
                  value={poVendorId}
                  onChange={(e) => setPoVendorId(e.target.value)}
                  className="w-full rounded-full bg-[#f0f0f0] px-3.5 py-2"
                >
                  {proc.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vendorCode} — {v.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">مستودع الاستلام</label>
                <select
                  value={poWarehouseId}
                  onChange={(e) => setPoWarehouseId(e.target.value)}
                  className="w-full rounded-full bg-[#f0f0f0] px-3.5 py-2"
                >
                  {state.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-between bg-[#f3f3f3] rounded-[16px] px-4 py-2">
                <span className="text-[#707070] font-semibold">الإجمالي شامل 15% ضريبة:</span>
                <strong className="font-mono text-sm text-[#141414]">
                  {(poSubtotal * 1.15).toLocaleString(undefined, { maximumFractionDigits: 2 })} ⃁
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              {poLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs">
                  <select
                    value={line.itemId}
                    onChange={(e) => {
                      const chosen = state.items.find((i) => i.id === e.target.value);
                      setPoLines((prev) =>
                        prev.map((p, i) =>
                          i === idx
                            ? { ...p, itemId: e.target.value, unitCost: chosen?.avgUnitCost || p.unitCost }
                            : p
                        )
                      );
                    }}
                    className="md:col-span-6 rounded-full bg-[#f0f0f0] px-3.5 py-2"
                  >
                    {state.items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.sku} — {it.nameAr}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={line.orderedQty}
                    onChange={(e) =>
                      setPoLines((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, orderedQty: Number(e.target.value) } : p))
                      )
                    }
                    placeholder="الكمية"
                    className="md:col-span-2 rounded-full bg-[#f0f0f0] px-3 py-2 font-mono text-center"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) =>
                      setPoLines((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, unitCost: Number(e.target.value) } : p))
                      )
                    }
                    placeholder="التكلفة"
                    className="md:col-span-2 rounded-full bg-[#f0f0f0] px-3 py-2 font-mono text-center"
                  />
                  <div className="md:col-span-2 font-mono font-bold text-left px-2">
                    {(line.orderedQty * line.unitCost).toLocaleString()} ⃁
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPoLines((prev) => [
                      ...prev,
                      { itemId: state.items[0]?.id || '', orderedQty: 1, unitCost: state.items[0]?.avgUnitCost || 50 },
                    ])
                  }
                  className="px-3.5 py-1.5 rounded-full border border-[#e0e0e0] text-xs font-bold"
                >
                  + إضافة سطر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = wmsProcurementService.createPurchaseOrder(
                      { vendorId: poVendorId, warehouseId: poWarehouseId, lines: poLines },
                      actor,
                      co
                    );
                    if (!res.ok || !res.po) {
                      onNotify('تعذر إنشاء أمر الشراء', res.error || '', 'error');
                      return;
                    }
                    onRefresh();
                    onNotify(
                      'تم إصدار أمر الشراء',
                      `أمر الشراء ${res.po.poNo} بقيمة ${res.po.grandTotal.toLocaleString()} ⃁ جاهز للاستلام.`,
                      'success'
                    );
                  }}
                  className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold"
                >
                  اعتماد وإصدار أمر الشراء (PO)
                </button>
              </div>
            </div>
          </div>

          {/* PO Ledger + Partial GRN Receiver */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#141414]">
              سجل أوامر الشراء ومتابعة الاستلام الجزئي (PO & Backorders: {proc.purchaseOrders.length})
            </h3>
            {proc.purchaseOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#707070] bg-[#f3f3f3] rounded-[16px]">
                لا توجد أوامر شراء مسجلة لهذا الكيان بعد — أنشئ أول أمر شراء من النموذج أعلاه.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2.5">رقم PO</th>
                      <th className="p-2.5">المورد</th>
                      <th className="p-2.5">البنود / المتبقي (Backorder)</th>
                      <th className="p-2.5">الإجمالي شامل الضريبة</th>
                      <th className="p-2.5">الحالة والـ GRN</th>
                      <th className="p-2.5">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {proc.purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-[#fafafa]">
                        <td className="p-2.5 font-mono font-bold text-[#141414]">
                          <div>{po.poNo}</div>
                          <div className="text-[10px] text-[#707070]">{po.orderDate}</div>
                        </td>
                        <td className="p-2.5 font-semibold">{po.vendorName}</td>
                        <td className="p-2.5">
                          {po.lines.map((l) => (
                            <div key={l.id} className="text-[11px]">
                              {l.itemName}: <strong className="font-mono">طلب {l.orderedQty}</strong> • مستلم{' '}
                              <strong className="font-mono">{l.receivedQty}</strong> • متبقي{' '}
                              <strong className="font-mono">{l.backorderQty}</strong>
                            </div>
                          ))}
                        </td>
                        <td className="p-2.5 font-mono font-bold">{po.grandTotal.toLocaleString()} ⃁</td>
                        <td className="p-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                            {po.status}
                          </span>
                          {po.linkedGrnVoucherNos.length > 0 && (
                            <div className="text-[10px] font-mono text-[#707070] mt-1">
                              GRN: {po.linkedGrnVoucherNos.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5">
                          {po.status !== 'مكتمل الاستلام' && po.status !== 'ملغى' && (
                            <button
                              type="button"
                              onClick={() => {
                                setReceivingPo(po);
                                const initQty: Record<string, number> = {};
                                po.lines.forEach((l) => {
                                  initQty[l.id] = l.backorderQty;
                                });
                                setReceiveQtyMap(initQty);
                              }}
                              className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold"
                            >
                              استلام جزئي / كلي
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {receivingPo && (
              <div className="bg-[#f3f3f3] border border-[#141414] rounded-[20px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#141414]">
                    استلام دفعة جديدة لأمر الشراء {receivingPo.poNo} — {receivingPo.vendorName}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceivingPo(null)}
                    className="px-3 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold"
                  >
                    إلغاء
                  </button>
                </div>
                {receivingPo.lines
                  .filter((l) => l.backorderQty > 0)
                  .map((l) => (
                    <div key={l.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs bg-[#ffffff] p-2.5 rounded-[14px]">
                      <div className="md:col-span-5 font-bold">
                        {l.itemName} <span className="text-[#707070] font-mono">(المتبقي: {l.backorderQty})</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={l.backorderQty}
                        value={receiveQtyMap[l.id] ?? 0}
                        onChange={(e) => setReceiveQtyMap((m) => ({ ...m, [l.id]: Number(e.target.value) }))}
                        className="md:col-span-2 rounded-full bg-[#f0f0f0] px-3 py-1.5 font-mono text-center"
                        placeholder="كمية الاستلام"
                      />
                      <input
                        type="text"
                        value={receiveLotMap[l.id] || ''}
                        onChange={(e) => setReceiveLotMap((m) => ({ ...m, [l.id]: e.target.value }))}
                        placeholder="رقم التشغيلة Lot (اختياري)"
                        className="md:col-span-2 rounded-full bg-[#f0f0f0] px-3 py-1.5 font-mono text-xs"
                      />
                      <input
                        type="date"
                        value={receiveExpMap[l.id] || ''}
                        onChange={(e) => setReceiveExpMap((m) => ({ ...m, [l.id]: e.target.value }))}
                        className="md:col-span-3 rounded-full bg-[#f0f0f0] px-3 py-1.5 text-xs"
                      />
                    </div>
                  ))}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const receipts = receivingPo.lines
                        .filter((l) => (receiveQtyMap[l.id] || 0) > 0)
                        .map((l) => ({
                          lineId: l.id,
                          receiveQty: receiveQtyMap[l.id] || 0,
                          lotNumber: receiveLotMap[l.id] || undefined,
                          expiryDate: receiveExpMap[l.id] || undefined,
                        }));
                      const res = wmsProcurementService.receivePurchaseOrderPartial(
                        receivingPo.id,
                        receipts,
                        actor,
                        undefined,
                        co
                      );
                      if (!res.ok) {
                        onNotify('تعذر الاستلام', res.error || '', 'error');
                        return;
                      }
                      setReceivingPo(null);
                      onRefresh();
                      onNotify(
                        'تم ترحيل إذن الوارد (GRN)',
                        `تم استلام الدفعة بإذن ${res.voucher?.voucherNo} — حالة PO الآن: ${res.po?.status}`,
                        'success'
                      );
                    }}
                    className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold"
                  >
                    ترحيل إذن الوارد وتحديث المتبقي (GRN)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 2: 3-WAY MATCHING & RTV DEBIT NOTES                          */}
      {/* ==================================================================== */}
      {subTab === '3way-rtv' && (
        <div className="space-y-5">
          {/* 3-Way Match Form */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                المطابقة الثلاثية (PO ↔ GRN ↔ فاتورة المورد الضريبية + VAT 15%)
              </h3>
            </div>

            {invoiceablePos.length === 0 ? (
              <div className="p-4 rounded-[16px] bg-[#f3f3f3] text-xs text-[#707070]">
                يلزم وجود أمر شراء مستلم جزئياً أو كلياً (GRN) لإجراء المطابقة الثلاثية لفاتورة المورد.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">أمر الشراء المستلم (PO)</label>
                    <select
                      value={selectedInvPo?.id || ''}
                      onChange={(e) => setInvPoId(e.target.value)}
                      className="w-full rounded-full bg-[#f0f0f0] px-3.5 py-2"
                    >
                      {invoiceablePos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.poNo} — {p.vendorName} (GRN: {p.linkedGrnVoucherNos.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">رقم فاتورة المورد الضريبية (Vendor Invoice #)</label>
                    <input
                      type="text"
                      value={vendorInvNo}
                      onChange={(e) => setVendorInvNo(e.target.value)}
                      placeholder="مثال: SINV-2026-8812"
                      className="w-full rounded-full bg-[#f0f0f0] px-3.5 py-2 font-mono"
                    />
                  </div>
                </div>

                {selectedInvPo && (
                  <div className="space-y-2">
                    {selectedInvPo.lines.map((l) => (
                      <div key={l.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-[#f3f3f3] p-2.5 rounded-[14px]">
                        <div className="md:col-span-6 font-bold">
                          {l.itemName} (مستلم GRN: <span className="font-mono">{l.receivedQty}</span> • سعر PO:{' '}
                          <span className="font-mono">{l.unitCost} ⃁</span>)
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={invLinesQty[l.itemId] ?? l.receivedQty}
                          onChange={(e) => setInvLinesQty((m) => ({ ...m, [l.itemId]: Number(e.target.value) }))}
                          className="md:col-span-3 rounded-full bg-[#ffffff] px-3 py-1.5 font-mono text-center"
                          placeholder="الكمية بالفاتورة"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={invLinesCost[l.itemId] ?? l.unitCost}
                          onChange={(e) => setInvLinesCost((m) => ({ ...m, [l.itemId]: Number(e.target.value) }))}
                          className="md:col-span-3 rounded-full bg-[#ffffff] px-3 py-1.5 font-mono text-center"
                          placeholder="سعر الوحدة بالفاتورة"
                        />
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const res = wmsProcurementService.createAndMatchSupplierInvoice(
                            {
                              poId: selectedInvPo.id,
                              vendorInvoiceNo: vendorInvNo,
                              lines: selectedInvPo.lines.map((l) => ({
                                itemId: l.itemId,
                                invoicedQty: invLinesQty[l.itemId] ?? l.receivedQty,
                                invoicedUnitCost: invLinesCost[l.itemId] ?? l.unitCost,
                              })),
                            },
                            actor,
                            co
                          );
                          if (!res.ok || !res.invoice) {
                            onNotify('خطأ في المطابقة', res.error || '', 'error');
                            return;
                          }
                          setVendorInvNo('');
                          onRefresh();
                          onNotify(
                            res.invoice.matchStatus === 'مطابق ثلاثياً ومُرحّل (Matched)'
                              ? 'نجحت المطابقة الثلاثية وترحّل القيد'
                              : 'تم تعليق الفاتورة للتباين (Variance Hold)',
                            `المرجع ${res.invoice.internalRef} — التباين ${res.invoice.variancePct}%${
                              res.invoice.journalEntryId ? ` — القيد: ${res.invoice.journalEntryId}` : ''
                            }`,
                            res.invoice.matchStatus === 'معلق للتباين (Variance Hold)' ? 'warning' : 'success'
                          );
                        }}
                        className="px-5 py-2 rounded-full bg-[#141414] text-white font-bold"
                      >
                        تنفيذ المطابقة الثلاثية (3-Way Match)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {proc.supplierInvoices.length > 0 && (
              <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2.5">المرجع / فاتورة المورد</th>
                      <th className="p-2.5">PO</th>
                      <th className="p-2.5">المورد</th>
                      <th className="p-2.5">الصافي + الضريبة 15%</th>
                      <th className="p-2.5">التباين</th>
                      <th className="p-2.5">حالة المطابقة والقيد</th>
                      <th className="p-2.5">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {proc.supplierInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="p-2.5 font-mono font-bold">
                          <div>{inv.internalRef}</div>
                          <div className="text-[10px] text-[#707070]">{inv.vendorInvoiceNo}</div>
                        </td>
                        <td className="p-2.5 font-mono">{inv.poNo}</td>
                        <td className="p-2.5">{inv.vendorName}</td>
                        <td className="p-2.5 font-mono font-bold">
                          {inv.grandTotal.toLocaleString()} ⃁
                          <div className="text-[10px] text-[#707070]">ضريبة: {inv.vatAmount.toLocaleString()} ⃁</div>
                        </td>
                        <td className="p-2.5 font-mono">{inv.variancePct}%</td>
                        <td className="p-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] font-bold text-[10px]">
                            {inv.matchStatus}
                          </span>
                          {inv.journalEntryId && (
                            <div className="text-[10px] font-mono text-[#707070] mt-0.5">GL: {inv.journalEntryId}</div>
                          )}
                        </td>
                        <td className="p-2.5">
                          {inv.matchStatus === 'معلق للتباين (Variance Hold)' && (
                            <button
                              type="button"
                              onClick={() => {
                                const res = wmsProcurementService.overrideApproveVarianceInvoice(
                                  inv.id,
                                  'اعتماد استثنائي من المراجع المالي',
                                  actor,
                                  co
                                );
                                if (!res.ok) {
                                  onNotify('رفض الاعتماد', res.error || '', 'error');
                                  return;
                                }
                                onRefresh();
                                onNotify('اعتماد استثنائي', `تم ترحيل الفاتورة ${inv.internalRef} والقيد المحاسبي.`, 'success');
                              }}
                              className="px-3 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold"
                            >
                              اعتماد التباين (Checker)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RTV & Debit Note */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                مرتجع المشتريات للمورد (RTV) وإصدار إشعار مدين (Debit Note + عكس VAT 15%)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 text-xs">
              <select
                value={rtvVendorId}
                onChange={(e) => setRtvVendorId(e.target.value)}
                className="rounded-full bg-[#f0f0f0] px-3 py-2"
              >
                {proc.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nameAr}
                  </option>
                ))}
              </select>
              <select
                value={rtvWarehouseId}
                onChange={(e) => setRtvWarehouseId(e.target.value)}
                className="rounded-full bg-[#f0f0f0] px-3 py-2"
              >
                {state.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr}
                  </option>
                ))}
              </select>
              <select
                value={rtvItemId}
                onChange={(e) => {
                  const chosen = state.items.find((i) => i.id === e.target.value);
                  setRtvItemId(e.target.value);
                  if (chosen) setRtvUnitCost(chosen.avgUnitCost || 50);
                }}
                className="rounded-full bg-[#f0f0f0] px-3 py-2"
              >
                {state.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} — {it.nameAr}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={rtvQty}
                onChange={(e) => setRtvQty(Number(e.target.value))}
                className="rounded-full bg-[#f0f0f0] px-3 py-2 font-mono text-center"
                placeholder="الكمية"
              />
              <input
                type="text"
                value={rtvReason}
                onChange={(e) => setRtvReason(e.target.value)}
                className="rounded-full bg-[#f0f0f0] px-3 py-2"
                placeholder="سبب الإرجاع"
              />
              <button
                type="button"
                onClick={() => {
                  const res = wmsProcurementService.createRtvDebitNote(
                    {
                      vendorId: rtvVendorId,
                      warehouseId: rtvWarehouseId,
                      rtvDate: todayIso,
                      lines: [{ itemId: rtvItemId, qty: rtvQty, unitCost: rtvUnitCost, reason: rtvReason }],
                    },
                    actor,
                    co
                  );
                  if (!res.ok || !res.debitNote) {
                    onNotify('تعذر إصدار المرتجع', res.error || '', 'error');
                    return;
                  }
                  onRefresh();
                  onNotify(
                    'تم إصدار مرتجع المورد وإشعار المدين',
                    `${res.debitNote.debitNoteNo} — ${res.debitNote.voucherNo} (${res.debitNote.grandTotal.toLocaleString()} ⃁)`,
                    'success'
                  );
                }}
                className="rounded-full bg-[#141414] text-white font-bold px-4 py-2"
              >
                إصدار RTV وإشعار مدين
              </button>
            </div>

            {proc.rtvDebitNotes.length > 0 && (
              <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2.5">رقم الإشعار المدين</th>
                      <th className="p-2.5">إذن RTV</th>
                      <th className="p-2.5">المورد</th>
                      <th className="p-2.5">الإجمالي شامل 15% VAT</th>
                      <th className="p-2.5">القيد العكسي GL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {proc.rtvDebitNotes.map((dn) => (
                      <tr key={dn.id}>
                        <td className="p-2.5 font-mono font-bold">{dn.debitNoteNo}</td>
                        <td className="p-2.5 font-mono">{dn.voucherNo}</td>
                        <td className="p-2.5 font-semibold">{dn.vendorName}</td>
                        <td className="p-2.5 font-mono font-bold">{dn.grandTotal.toLocaleString()} ⃁</td>
                        <td className="p-2.5 font-mono text-[#707070]">{dn.journalEntryId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 3: QC HOLD, IN-TRANSIT TRANSFERS & BIN/LOT FEFO              */}
      {/* ==================================================================== */}
      {subTab === 'qc-transit-fefo' && (
        <div className="space-y-5">
          {/* QC Quarantine Gate */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                حجر فحص الجودة للاستلامات (QC Inspection Hold: {state.qcInspections.length})
              </h3>
            </div>
            {state.qcInspections.length === 0 ? (
              <div className="p-4 rounded-[16px] bg-[#f3f3f3] text-xs text-[#707070]">
                لا توجد فحوصات جودة معلقة حالياً (فعّل خيار فحص الجودة QC من الإعدادات أو عند إنشاء GRN).
              </div>
            ) : (
              <div className="space-y-2">
                {state.qcInspections.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-[16px] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold">{q.inspectionNo}</span> • {q.itemName} (المستلم:{' '}
                      <strong className="font-mono">{q.receivedQty}</strong>) — إذن {q.grnVoucherNo}
                    </div>
                    {q.status === 'PENDING_QC' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={q.receivedQty}
                          value={qcAppMap[q.id] ?? q.receivedQty}
                          onChange={(e) => setQcAppMap((m) => ({ ...m, [q.id]: Number(e.target.value) }))}
                          className="w-20 rounded-full bg-[#f0f0f0] px-2.5 py-1 text-center font-mono"
                          title="مقبول"
                        />
                        <input
                          type="number"
                          min={0}
                          max={q.receivedQty}
                          value={qcRejMap[q.id] ?? 0}
                          onChange={(e) => setQcRejMap((m) => ({ ...m, [q.id]: Number(e.target.value) }))}
                          className="w-20 rounded-full bg-[#f0f0f0] px-2.5 py-1 text-center font-mono"
                          title="مرفوض"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const approvedQty = qcAppMap[q.id] ?? q.receivedQty;
                            const rejectedQty = qcRejMap[q.id] ?? 0;
                            const res = wmsEngineService.completeQcInspection(
                              q.id,
                              { approvedQty, rejectedQty, notes: 'نتيجة فحص الجودة المخزني' },
                              actor
                            );
                            if (!res.ok) {
                              onNotify('تنبيه فحص الجودة', res.error || '', 'error');
                              return;
                            }
                            onRefresh();
                            onNotify('اكتمل فحص الجودة', `تم اعتماد (${approvedQty}) ورفض (${rejectedQty}).`, 'success');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white font-bold"
                        >
                          اعتماد وإغلاق الفحص
                        </button>
                      </div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] font-bold">
                        مكتمل (مقبول {q.approvedQty} / مرفوض {q.rejectedQty})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2-Step In-Transit Transfers */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                التحويلات المخزنية بالطريق بمرحلتين (In-Transit Transfers: {state.inTransitTransfers.length})
              </h3>
            </div>
            {state.inTransitTransfers.length === 0 ? (
              <div className="p-4 rounded-[16px] bg-[#f3f3f3] text-xs text-[#707070]">
                لا توجد شحنات تحويل بالطريق حالياً.
              </div>
            ) : (
              <div className="space-y-2">
                {state.inTransitTransfers.map((tr) => (
                  <div
                    key={tr.id}
                    className="p-3 rounded-[16px] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold">{tr.transferNo}</span> • {tr.itemName} (المرسل:{' '}
                      <strong className="font-mono">{tr.dispatchedQty}</strong>) — من{' '}
                      <span className="font-mono">{tr.sourceWarehouseId}</span> إلى{' '}
                      <span className="font-mono">{tr.targetWarehouseId}</span>
                    </div>
                    {tr.status === 'IN_TRANSIT' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={tr.dispatchedQty}
                          value={transitRecMap[tr.id] ?? tr.dispatchedQty}
                          onChange={(e) => setTransitRecMap((m) => ({ ...m, [tr.id]: Number(e.target.value) }))}
                          className="w-24 rounded-full bg-[#f0f0f0] px-2.5 py-1 text-center font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const qty = transitRecMap[tr.id] ?? tr.dispatchedQty;
                            const res = wmsEngineService.confirmInTransitTransferReceipt(
                              tr.id,
                              qty,
                              'تأكيد الاستلام الفعلي بالمستودع الوجهة',
                              actor
                            );
                            if (!res.ok) {
                              onNotify('تعذر تأكيد الاستلام', res.error || '', 'error');
                              return;
                            }
                            onRefresh();
                            onNotify(
                              'تأكيد استلام شحنة التحويل',
                              res.adjustmentVoucherNo
                                ? `تم استلام (${qty}) وتسوية عجز الطريق بإذن ${res.adjustmentVoucherNo}`
                                : `تم استلام كامل الكمية (${qty}) في ${tr.targetWarehouseId}`,
                              'success'
                            );
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white font-bold"
                        >
                          تأكيد الاستلام بالوجهة
                        </button>
                      </div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] font-bold">
                        {tr.status} (مستلم {tr.receivedQty})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multi-Bin & Lot FEFO Inspector */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#141414]">
                مراقبة المواقع (Bin Locations) والتشغيلات وصلاحية FEFO ({state.binLotQuants.length})
              </h3>
              <input
                type="text"
                value={binSearch}
                onChange={(e) => setBinSearch(e.target.value)}
                placeholder="فلترة بالموقع (Bin) أو رقم التشغيلة أو SKU..."
                className="w-72 rounded-full bg-[#f0f0f0] px-4 py-1.5 text-xs"
              />
            </div>
            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">المستودع / الرف (Bin)</th>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">التشغيلة (Lot)</th>
                    <th className="p-2.5">الصلاحية (FEFO)</th>
                    <th className="p-2.5">الحالة (QC)</th>
                    <th className="p-2.5">فعلي / محجوز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {filteredBins.map((b) => {
                    const item = state.items.find((i) => i.id === b.itemId);
                    const isExpired = Boolean(b.expiryDate && b.expiryDate < todayIso);
                    return (
                      <tr key={b.id}>
                        <td className="p-2.5 font-mono font-bold">
                          {b.warehouseId} • {b.locationCode}
                        </td>
                        <td className="p-2.5 font-semibold">{item?.nameAr || b.itemId}</td>
                        <td className="p-2.5 font-mono">{b.lotNumber || 'عام'}</td>
                        <td className="p-2.5 font-mono">
                          {b.expiryDate ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isExpired ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                              }`}
                            >
                              {b.expiryDate} {isExpired ? '(منتهي)' : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">
                            {b.qcStatus}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold">
                          {b.onHandQty} / حجز {b.reservedQty}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 4: KITS/BOM, LANDED COST & MAKER/CHECKER APPROVALS           */}
      {/* ==================================================================== */}
      {subTab === 'kits-landed-approvals' && (
        <div className="space-y-5">
          {/* Maker != Checker Queue */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                طابور اعتمادات الرقابة وفصل المهام (Maker ≠ Checker: {state.approvalRequests.length})
              </h3>
            </div>
            {state.approvalRequests.length === 0 ? (
              <div className="p-4 rounded-[16px] bg-[#f3f3f3] text-xs text-[#707070]">
                لا توجد طلبات اعتماد معلقة حالياً (فعّل فصل المهام Maker ≠ Checker من الإعدادات للعمليات التي تتجاوز الحد المالي).
              </div>
            ) : (
              <div className="space-y-2">
                {state.approvalRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-[16px] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold">{req.requestNo}</span> • {req.entityLabel} • المبلغ:{' '}
                      <strong className="font-mono">{req.amountSar.toLocaleString()} ⃁</strong> • منشئ الطلب (Maker):{' '}
                      <strong>{req.requestedByName}</strong>
                    </div>
                    {req.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const res = wmsEngineService.approveWmsRequest(req.id, actor);
                            if (!res.ok) {
                              onNotify('رفض الضابط الرقابي', res.error || '', 'error');
                              return;
                            }
                            onRefresh();
                            onNotify('تم الاعتماد والترحيل', `اعتماد ${req.requestNo} بواسطة ${actor.name}`, 'success');
                          }}
                          className="px-3 py-1 rounded-full bg-[#141414] text-white font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اعتماد (Checker)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            wmsEngineService.rejectWmsRequest(req.id, 'رفض من المراجع المعتمد', actor);
                            onRefresh();
                            onNotify('تم رفض الطلب', `رفض ${req.requestNo}`, 'info');
                          }}
                          className="px-3 py-1 rounded-full border border-[#e0e0e0] font-bold flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] font-bold">
                        {req.status} ({req.checkerName || '—'})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kits / BOM Explosion */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                الحزم والتجميع القياسي (Kits / BOM Explosion: {state.kittingBoms.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs bg-[#f3f3f3] p-3.5 rounded-[18px]">
              <input
                type="text"
                value={kitCode}
                onChange={(e) => setKitCode(e.target.value)}
                placeholder="كود الحزمة (KIT-01)"
                className="rounded-full bg-[#ffffff] px-3 py-1.5 font-mono"
              />
              <input
                type="text"
                value={kitNameAr}
                onChange={(e) => setKitNameAr(e.target.value)}
                placeholder="اسم الحزمة / الطقم..."
                className="md:col-span-2 rounded-full bg-[#ffffff] px-3 py-1.5"
              />
              <select
                value={kitCompItemId}
                onChange={(e) => setKitCompItemId(e.target.value)}
                className="rounded-full bg-[#ffffff] px-3 py-1.5"
              >
                {state.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.nameAr}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={kitCompQty}
                onChange={(e) => setKitCompQty(Number(e.target.value))}
                className="rounded-full bg-[#ffffff] px-3 py-1.5 font-mono text-center"
              />
              <button
                type="button"
                onClick={() => {
                  if (!kitNameAr.trim()) {
                    onNotify('حقل مطلوب', 'اكتب اسم الحزمة أولاً.', 'warning');
                    return;
                  }
                  const created = wmsEngineService.createKitBom(
                    {
                      kitCode: kitCode || `KIT-${Date.now().toString().slice(-4)}`,
                      kitNameAr,
                      defaultWarehouseId: kitWhId,
                      components: [{ itemId: kitCompItemId, qtyPerKit: kitCompQty }],
                    },
                    actor
                  );
                  if (created) {
                    setKitCode('');
                    setKitNameAr('');
                    onRefresh();
                    onNotify('إنشاء حزمة (BOM)', `تم حفظ ${created.kitNameAr} بنجاح.`, 'success');
                  }
                }}
                className="rounded-full bg-[#141414] text-white font-bold px-3 py-1.5"
              >
                + إنشاء حزمة
              </button>
            </div>

            <div className="space-y-2">
              {state.kittingBoms.map((k) => (
                <div
                  key={k.id}
                  className="p-3 rounded-[16px] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold">{k.kitCode}</span> — <strong>{k.kitNameAr}</strong> (
                    {k.components.map((c) => `${c.itemName} ×${c.qtyPerKit}`).join(' + ')})
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={kitBeneficiary}
                      onChange={(e) => setKitBeneficiary(e.target.value)}
                      className="w-44 rounded-full bg-[#f0f0f0] px-3 py-1 text-xs"
                    />
                    <input
                      type="number"
                      min={1}
                      value={kitIssueQtyMap[k.id] ?? 1}
                      onChange={(e) => setKitIssueQtyMap((m) => ({ ...m, [k.id]: Number(e.target.value) }))}
                      className="w-16 rounded-full bg-[#f0f0f0] px-2 py-1 font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const res = wmsEngineService.explodeAndIssueKit(
                          {
                            kitId: k.id,
                            kitQty: kitIssueQtyMap[k.id] ?? 1,
                            warehouseId: kitWhId,
                            beneficiaryEntity: kitBeneficiary,
                          },
                          actor
                        );
                        if (res.error || !res.voucher) {
                          onNotify('تعذر صرف الحزمة', res.error || '', 'error');
                          return;
                        }
                        onRefresh();
                        onNotify('تم تفجير وصرف الحزمة', `أُصدر إذن الصرف ${res.voucher.voucherNo} لجميع المكونات.`, 'success');
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white font-bold"
                    >
                      تفجير وصرف حزمة (GIN)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Landed Cost Capitalization */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#141414]" />
              <h3 className="text-sm font-bold text-[#141414]">
                توزيع التكاليف المضافة للشراء (Landed Cost — شحن/جمارك/تخليص IAS 2) والطبقات ({state.costLayers.length} طبقة FIFO)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
              <select
                value={lcVoucherId}
                onChange={(e) => setLcVoucherId(e.target.value)}
                className="md:col-span-2 rounded-full bg-[#f0f0f0] px-3.5 py-2"
              >
                {postedGrns.slice(0, 40).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.voucherNo} — {g.lines[0]?.itemName} ({g.totalValue.toLocaleString()} ⃁)
                  </option>
                ))}
              </select>
              <select
                value={lcChargeType}
                onChange={(e) => setLcChargeType(e.target.value as WmsLandedCostCharge['chargeType'])}
                className="rounded-full bg-[#f0f0f0] px-3 py-2"
              >
                <option value="شحن ونقل">شحن ونقل</option>
                <option value="رسوم جمركية">رسوم جمركية</option>
                <option value="تخليص جمركي">تخليص جمركي</option>
                <option value="تأمين بضائع">تأمين بضائع</option>
              </select>
              <input
                type="number"
                min={1}
                value={lcAmount}
                onChange={(e) => setLcAmount(Number(e.target.value))}
                className="rounded-full bg-[#f0f0f0] px-3 py-2 font-mono text-center"
                placeholder="المبلغ ⃁"
              />
              <button
                type="button"
                onClick={() => {
                  const res = wmsEngineService.applyLandedCost(
                    lcVoucherId,
                    [{ chargeType: lcChargeType, description: `${lcChargeType} إضافي`, amount: lcAmount }],
                    lcMethod,
                    actor
                  );
                  if (!res.ok || !res.record) {
                    onNotify('تعذر التوزيع', res.error || '', 'error');
                    return;
                  }
                  onRefresh();
                  onNotify(
                    'تمت رسملة التكلفة المضافة (IAS 2)',
                    `توزيع ${res.record.totalCharge.toLocaleString()} ⃁ على ${res.record.voucherNo}${
                      res.record.journalEntryId ? ` — قيد ${res.record.journalEntryId}` : ''
                    }`,
                    'success'
                  );
                }}
                className="rounded-full bg-[#141414] text-white font-bold px-4 py-2"
              >
                توزيع التكاليف (IAS 2)
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#707070] font-semibold">أساس التوزيع:</span>
              {(['BY_VALUE', 'BY_QTY'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLcMethod(m)}
                  className={`px-3 py-1 rounded-full font-bold ${
                    lcMethod === m ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                  }`}
                >
                  {m === 'BY_VALUE' ? 'نسبياً حسب القيمة (BY_VALUE)' : 'نسبياً حسب الكمية (BY_QTY)'}
                </button>
              ))}
            </div>
            {state.landedCosts.length > 0 && (
              <div className="space-y-1.5 text-xs">
                {state.landedCosts.slice(0, 10).map((lc) => (
                  <div key={lc.id} className="p-2.5 rounded-[12px] bg-[#f3f3f3] flex items-center justify-between">
                    <span>
                      <strong className="font-mono">{lc.voucherNo}</strong> — طريقة {lc.allocationMethod} —{' '}
                      <strong className="font-mono">{lc.totalCharge.toLocaleString()} ⃁</strong>
                    </span>
                    <span className="font-mono text-[#707070]">GL: {lc.journalEntryId || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
