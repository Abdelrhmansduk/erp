import React, { useEffect, useMemo, useState } from 'react';
import { X, Undo2, Redo2, Eye, Search, Printer, FileText } from 'lucide-react';
import { ExportDropdown } from '../common/ExportDropdown';
import { ExportPreviewModal } from '../common/ExportPreviewModal';
import type { WmsStateSnapshot, WmsAlertsSummary } from '../../services/wms/wmsEngineService';
import type { WmsItem, WmsStockVoucher, WmsVoucherType } from '../../types/wms';

export type WmsKpiDetailKind =
  | { kind: 'items' }
  | { kind: 'movements'; voucherType?: WmsVoucherType | 'all' }
  | { kind: 'alerts' }
  | { kind: 'valuation' }
  | { kind: 'warehouse'; warehouseId: string };

interface WmsKpiDetailsModalProps {
  detail: WmsKpiDetailKind | null;
  state: WmsStateSnapshot;
  alerts: WmsAlertsSummary;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
  onOpenStockCard: (item: WmsItem) => void;
  onPrintVoucher: (voucher: WmsStockVoucher) => void;
  onOpenWarehouseCatalog?: (warehouseId: string) => void;
}

type Row = Record<string, string | number>;

const VOUCHER_LABELS: Record<string, string> = {
  GRN: 'وارد',
  GIN: 'صادر',
  SRN: 'مرتجع',
  STR: 'تحويل',
  ADJ: 'تسوية',
  RTV: 'مرتجع لمورد',
  SCRAP: 'إتلاف',
};

const STATUS_LABELS: Record<string, string> = {
  POSTED: 'معتمد',
  DRAFT: 'مسودة',
  CANCELLED: 'ملغى',
  PENDING_APPROVAL: 'بانتظار الموافقة',
  PENDING_QC: 'بانتظار الفحص',
  IN_TRANSIT: 'في الطريق',
};

const fmt = (n: number, digits = 0) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const WmsKpiDetailsModal: React.FC<WmsKpiDetailsModalProps> = ({
  detail,
  state,
  alerts,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onClose,
  onOpenStockCard,
  onPrintVoucher,
  onOpenWarehouseCatalog,
}) => {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setQuery('');
    setTypeFilter(detail?.kind === 'movements' ? detail.voucherType || 'all' : 'all');
  }, [detail]);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, previewOpen, onClose]);

  // Stock aggregates computed directly from the snapshot (no hidden global state)
  const stockByItem = useMemo(() => {
    const map = new Map<string, { onHand: number; reserved: number; byWh: Map<string, number> }>();
    for (const q of state.quants) {
      const cur = map.get(q.itemId) || { onHand: 0, reserved: 0, byWh: new Map<string, number>() };
      cur.onHand += Number(q.onHandQty || 0);
      cur.reserved += Number(q.reservedQty || 0);
      cur.byWh.set(q.warehouseId, (cur.byWh.get(q.warehouseId) || 0) + Number(q.onHandQty || 0));
      map.set(q.itemId, cur);
    }
    return map;
  }, [state.quants]);

  const whName = (id?: string) => state.warehouses.find((w) => w.id === id)?.nameAr || id || '—';
  const catName = (id?: string) => state.categories.find((c) => c.id === id)?.nameAr || id || '—';

  const view = useMemo(() => {
    if (!detail) return null;

    if (detail.kind === 'items' || detail.kind === 'warehouse') {
      const whId = detail.kind === 'warehouse' ? detail.warehouseId : null;
      const items = state.items.filter((it) => {
        if (!whId) return true;
        const s = stockByItem.get(it.id);
        return it.defaultWarehouseId === whId || (s?.byWh.get(whId) || 0) > 0;
      });
      const rows: Row[] = items.map((it) => {
        const s = stockByItem.get(it.id);
        const onHand = whId ? s?.byWh.get(whId) || 0 : s?.onHand || 0;
        const reserved = whId ? 0 : s?.reserved || 0;
        const available = Math.max(0, onHand - reserved);
        return {
          __id: it.id,
          'رمز الصنف': it.sku,
          الصنف: it.nameAr,
          الفئة: catName(it.categoryId),
          'المستودع الافتراضي': whName(it.defaultWarehouseId),
          'الرصيد الفعلي': onHand,
          المحجوز: reserved,
          المتاح: available,
          'نقطة إعادة الطلب': it.reorderPoint,
          الوحدة: it.baseUom,
          'متوسط التكلفة': Number(it.avgUnitCost || 0),
          القيمة: Number((onHand * Number(it.avgUnitCost || 0)).toFixed(2)),
          الحالة: available <= Number(it.reorderPoint || 0) ? 'تحت حد الطلب' : 'سليم',
        };
      });
      const totalQty = rows.reduce((s, r) => s + Number(r['الرصيد الفعلي']), 0);
      const totalVal = rows.reduce((s, r) => s + Number(r['القيمة']), 0);
      const low = rows.filter((r) => r['الحالة'] === 'تحت حد الطلب').length;
      return {
        title: whId ? `تفاصيل المستودع — ${whName(whId)}` : 'تفاصيل الأصناف والرصيد الحي',
        sectionKey: whId ? 'kas_wms_warehouse_detail' : 'kas_wms_items_detail',
        rows,
        rowKind: 'item' as const,
        summary: [
          { label: 'عدد الأصناف', value: fmt(rows.length) },
          { label: 'إجمالي الرصيد', value: fmt(totalQty) },
          { label: 'تحت حد الطلب', value: fmt(low) },
          { label: 'القيمة الدفترية', value: `${fmt(totalVal, 2)} ⃁` },
        ],
      };
    }

    if (detail.kind === 'movements') {
      const rows: Row[] = state.vouchers.map((v) => ({
        __id: v.id,
        'رقم الإذن': v.voucherNo,
        النوع: VOUCHER_LABELS[v.voucherType] || v.voucherType,
        __type: v.voucherType,
        التاريخ: v.voucherDate,
        المستودع: whName(v.warehouseId),
        'إلى مستودع': v.targetWarehouseId ? whName(v.targetWarehouseId) : '—',
        'الجهة / المورد': v.beneficiaryEntity || v.supplierName || '—',
        المستلم: v.recipientName || '—',
        'عدد البنود': v.lines.length,
        'الكمية الأساسية': Number(v.totalQtyBase || 0),
        القيمة: Number(v.totalValue || 0),
        الحالة: STATUS_LABELS[v.status] || v.status,
        'القيد المحاسبي': v.journalEntryId || '—',
        'أنشأه': v.createdByName || '—',
      }));
      const posted = state.vouchers.filter((v) => v.status === 'POSTED');
      return {
        title: 'تفاصيل حركات المستودع',
        sectionKey: 'kas_wms_movements_detail',
        rows,
        rowKind: 'voucher' as const,
        summary: [
          { label: 'إجمالي الأذونات', value: fmt(state.vouchers.length) },
          { label: 'معتمدة', value: fmt(posted.length) },
          { label: 'مسودات', value: fmt(state.vouchers.filter((v) => v.status === 'DRAFT').length) },
          { label: 'قيمة المعتمد', value: `${fmt(posted.reduce((s, v) => s + Number(v.totalValue || 0), 0), 2)} ⃁` },
        ],
      };
    }

    if (detail.kind === 'alerts') {
      const rows: Row[] = [
        ...alerts.lowStockItems.map(({ item, availableQty, reorderPoint }) => ({
          __id: item.id,
          __ref: 'item',
          'نوع التنبيه': 'تحت نقطة إعادة الطلب',
          المرجع: item.sku,
          الوصف: item.nameAr,
          'القيمة الحالية': `${availableQty} ${item.baseUom}`,
          'الحد / الموعد': `${reorderPoint} ${item.baseUom}`,
          'الإجراء المقترح': 'إصدار أمر توريد',
        })),
        ...alerts.overdueSamples.map((s) => ({
          __id: s.itemId,
          __ref: 'item',
          'نوع التنبيه': 'عينة متأخرة الإرجاع',
          المرجع: s.loanNo,
          الوصف: `${s.itemName} — لدى ${s.issuedTo}`,
          'القيمة الحالية': `${s.qty} ${s.uom}`,
          'الحد / الموعد': s.expectedReturnDate,
          'الإجراء المقترح': 'مطالبة بالإرجاع',
        })),
        ...alerts.expiringLots.map(({ record, daysRemaining }) => ({
          __id: record.itemId,
          __ref: 'item',
          'نوع التنبيه': daysRemaining < 0 ? 'دفعة منتهية الصلاحية' : 'دفعة قريبة الانتهاء',
          المرجع: record.lotNumber || record.serialNumber || record.id,
          الوصف: `${record.itemName} — ${whName(record.warehouseId)}`,
          'القيمة الحالية': `${daysRemaining} يوم`,
          'الحد / الموعد': record.expiryDate || '—',
          'الإجراء المقترح': daysRemaining < 0 ? 'عزل وإتلاف' : 'صرف أولاً (FEFO)',
        })),
      ];
      return {
        title: 'تفاصيل رادار المخزون والصلاحية والعينات',
        sectionKey: 'kas_wms_alerts_detail',
        rows,
        rowKind: 'item' as const,
        summary: [
          { label: 'تحت حد الطلب', value: fmt(alerts.lowStockItems.length) },
          { label: 'عينات متأخرة', value: fmt(alerts.overdueSamples.length) },
          { label: 'دفعات صلاحية', value: fmt(alerts.expiringLots.length) },
          { label: 'موافقات / فحص معلّق', value: fmt(alerts.pendingApprovalsCount + alerts.pendingQcCount) },
        ],
      };
    }

    // valuation
    const valued = state.items
      .map((it) => {
        const onHand = stockByItem.get(it.id)?.onHand || 0;
        return { it, onHand, value: onHand * Number(it.avgUnitCost || 0) };
      })
      .sort((a, b) => b.value - a.value);
    const grand = valued.reduce((s, r) => s + r.value, 0);
    let cumulative = 0;
    const rows: Row[] = valued.map(({ it, onHand, value }) => {
      cumulative += value;
      const cumPct = grand > 0 ? (cumulative / grand) * 100 : 0;
      return {
        __id: it.id,
        'رمز الصنف': it.sku,
        الصنف: it.nameAr,
        الفئة: catName(it.categoryId),
        الرصيد: onHand,
        'متوسط التكلفة': Number(it.avgUnitCost || 0),
        القيمة: Number(value.toFixed(2)),
        'النسبة من الإجمالي %': grand > 0 ? Number(((value / grand) * 100).toFixed(2)) : 0,
        'تصنيف ABC المحسوب': cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C',
        'بدون تكلفة': Number(it.avgUnitCost || 0) <= 0 && onHand > 0 ? 'نعم' : '—',
      };
    });
    const noCost = rows.filter((r) => r['بدون تكلفة'] === 'نعم').length;
    return {
      title: 'تفاصيل تقييم المخزون والتسويات',
      sectionKey: 'kas_wms_valuation_detail',
      rows,
      rowKind: 'item' as const,
      summary: [
        { label: 'القيمة الإجمالية', value: `${fmt(grand, 2)} ⃁` },
        { label: 'أصناف برصيد وبدون تكلفة', value: fmt(noCost) },
        { label: 'بنود تسوية معلّقة', value: fmt(alerts.pendingDiscrepancies) },
        { label: 'طريقة التقييم', value: state.settings.valuationMethod },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, state, alerts, stockByItem]);

  const filteredRows = useMemo(() => {
    if (!view) return [];
    const q = query.trim().toLowerCase();
    return view.rows.filter((r) => {
      if (detail?.kind === 'movements' && typeFilter !== 'all' && r.__type !== typeFilter) return false;
      if (!q) return true;
      return Object.entries(r).some(([k, v]) => !k.startsWith('__') && String(v).toLowerCase().includes(q));
    });
  }, [view, query, typeFilter, detail]);

  // Clean rows for export / preview (strip internal __ keys)
  const exportRows = useMemo(
    () =>
      filteredRows.map((r) =>
        Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('__')))
      ),
    [filteredRows]
  );

  if (!detail || !view) return null;

  const columns = view.rows.length
    ? Object.keys(view.rows[0]).filter((k) => !k.startsWith('__'))
    : [];

  const handleRowClick = (r: Row) => {
    if (view.rowKind === 'voucher') {
      const v = state.vouchers.find((x) => x.id === r.__id);
      if (v) onPrintVoucher(v);
      return;
    }
    const it = state.items.find((x) => x.id === r.__id);
    if (it) onOpenStockCard(it);
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-3"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] rounded-[24px] w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + action toolbar */}
        <div className="p-5 border-b border-[#f0f0f0] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141414]">{view.title}</h2>
              <p className="text-xs text-[#707070] mt-0.5">
                اضغط على أي صف لفتح {view.rowKind === 'voucher' ? 'السند وطباعته' : 'كرت الصنف وحركاته'}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="w-9 h-9 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#e0e0e0]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {view.summary.map((s) => (
              <div key={s.label} className="bg-[#f3f3f3] rounded-[16px] px-3 py-2">
                <div className="text-[11px] text-[#707070]">{s.label}</div>
                <div className="text-sm font-bold text-[#141414] font-mono">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#707070]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث داخل التفاصيل..."
                className="w-full rounded-full bg-[#f0f0f0] pr-9 pl-4 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>

            {detail.kind === 'movements' && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="نوع الحركة"
                className="rounded-full bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414] focus:outline-none"
              >
                <option value="all">كل الأنواع</option>
                {Object.entries(VOUCHER_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l} ({k})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={undoCount === 0}
              onClick={onUndo}
              title="تراجع عن آخر إجراء (Ctrl+Z)"
              className="px-3 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>تراجع ({undoCount})</span>
            </button>
            <button
              type="button"
              disabled={redoCount === 0}
              onClick={onRedo}
              title="إعادة (Ctrl+Y)"
              className="px-3 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e0e0e0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>إعادة ({redoCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={exportRows.length === 0}
              className="px-3 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:border-[#141414] disabled:opacity-40"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة</span>
            </button>
            <ExportDropdown
              sectionKey={view.sectionKey}
              data={exportRows}
              customTitle={view.title}
              buttonLabel="تصدير"
              variant="compact"
              showCountBadge
            />
            {detail.kind === 'warehouse' && onOpenWarehouseCatalog && (
              <button
                type="button"
                onClick={() => onOpenWarehouseCatalog(detail.warehouseId)}
                className="px-3 py-2 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-[#262626]"
              >
                فتح في الكتالوج
              </button>
            )}
          </div>
        </div>

        {/* Data table */}
        <div className="flex-1 overflow-auto">
          {filteredRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#707070]">لا توجد بيانات مطابقة.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#fafafa] z-10">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="text-right font-bold text-[#141414] px-3 py-2 whitespace-nowrap border-b border-[#f0f0f0]">
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2 border-b border-[#f0f0f0]" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => (
                  <tr
                    key={`${r.__id}-${idx}`}
                    onClick={() => handleRowClick(r)}
                    className="cursor-pointer hover:bg-[#f3f3f3] border-b border-[#f7f7f7]"
                  >
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap text-[#141414]">
                        {typeof r[c] === 'number' ? fmt(Number(r[c]), c.includes('تكلفة') || c === 'القيمة' ? 2 : 0) : r[c]}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-[#707070]">
                      {view.rowKind === 'voucher' ? <Printer className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-[#f0f0f0] text-[11px] text-[#707070] flex justify-between">
          <span>
            المعروض: <strong className="text-[#141414] font-mono">{filteredRows.length}</strong> من{' '}
            <strong className="text-[#141414] font-mono">{view.rows.length}</strong>
          </span>
          <span>Esc للإغلاق</span>
        </div>
      </div>

      {previewOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ExportPreviewModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            sectionKey={view.sectionKey}
            data={exportRows}
            customTitle={view.title}
          />
        </div>
      )}
    </div>
  );
};

export default WmsKpiDetailsModal;
