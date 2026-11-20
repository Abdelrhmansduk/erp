import React, { useState } from 'react';
import {
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Sliders,
  Plus,
  RotateCcw,
  Vault,
  Lock,
  Unlock,
  BarChart3,
  History,
  FileCheck,
} from 'lucide-react';
import {
  WmsAuditLog,
  WmsCycleCountSession,
  WmsDiscrepancyItem,
  WmsFastConsumableLog,
  WmsItem,
  WmsSampleLoan,
  WmsSerialLotRecord,
  WmsSettings,
  WmsTenderReservation,
  WmsWarehouse,
} from '../../types/wms';
import { KAS_ALLOWED_EMPLOYEES } from '../../config/kasAllowedEmails';

// ============================================================================
// 1. FAST-ISSUE CONSUMABLES & COMPUTER BATTERIES TAB (حجارة الكمبيوتر والمستهلكات)
// ============================================================================
export const WmsQuickConsumablesTab: React.FC<{
  items: WmsItem[];
  logs: WmsFastConsumableLog[];
  getAvailableQty: (itemId: string) => number;
  onQuickIssue: (payload: {
    itemId: string;
    recipientName: string;
    departmentOrOffice: string;
    qty: number;
    batterySize?: 'حجر صغير (AAA)' | 'حجر كبير (AA)' | 'أخرى';
    notes?: string;
  }) => void;
}> = ({ items, logs, getAvailableQty, onQuickIssue }) => {
  const fastItems = items.filter((i) => i.isFastConsumable || i.nameAr.includes('حجارة'));
  const defaultBattery = fastItems.find((i) => i.nameAr.includes('حجارة')) || items[0];

  const [itemId, setItemId] = useState(defaultBattery?.id || '');
  const [recipientName, setRecipientName] = useState('');
  const [departmentOrOffice, setDepartmentOrOffice] = useState('مكتب التجارة والمنافسات (كاس)');
  const [qty, setQty] = useState('2');
  const [notes, setNotes] = useState('');

  // Aggregate batteries by employee (matching the Excel side ledger!)
  const employeeSummary = React.useMemo(() => {
    const map = new Map<string, { office: string; small: number; large: number; other: number }>();
    for (const l of logs) {
      const cur = map.get(l.recipientName) || { office: l.departmentOrOffice, small: 0, large: 0, other: 0 };
      if (l.batterySize === 'حجر صغير (AAA)' || l.itemName.includes('صغيرة')) cur.small += l.qty;
      else if (l.batterySize === 'حجر كبير (AA)' || l.itemName.includes('كبيرة')) cur.large += l.qty;
      else cur.other += l.qty;
      map.set(l.recipientName, cur);
    }
    return Array.from(map.entries()).map(([name, s]) => ({ name, ...s, total: s.small + s.large + s.other }));
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !recipientName.trim()) return;
    const item = items.find((i) => i.id === itemId);
    const bSize = item?.nameAr.includes('صغيرة')
      ? 'حجر صغير (AAA)'
      : item?.nameAr.includes('كبيرة')
      ? 'حجر كبير (AA)'
      : 'أخرى';
    onQuickIssue({
      itemId,
      recipientName: recipientName.trim(),
      departmentOrOffice,
      qty: Number(qty) || 1,
      batterySize: bSize,
      notes: notes.trim() || undefined,
    });
    setRecipientName('');
    setQty('2');
    setNotes('');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Fast Issue Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#141414] text-white flex items-center justify-center">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#141414]">نافذة الصرف السريع (حجارة الكمبيوتر والمستهلكات)</h3>
              <p className="text-[11px] text-[#707070]">صرف بضغطة واحدة يُخصم فوراً من رصيد العلب (1 علبة = 24 حجر)</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1">الصنف المستهلك</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-semibold text-[#141414]"
            >
              {(fastItems.length ? fastItems : items).map((it) => (
                <option key={it.id} value={it.id}>
                  {it.nameAr} — المتاح: {getAvailableQty(it.id)} {it.baseUom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">اسم الموظف المستلم *</label>
              <input
                list="wms-fast-emp-list"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="مثال: أ/ فراس الحسن"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
              />
              <datalist id="wms-fast-emp-list">
                {KAS_ALLOWED_EMPLOYEES.map((e) => (
                  <option key={e.id} value={e.nameAr} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">العدد *</label>
              <input
                type="number"
                min={1}
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141414] mb-1">القسم / المكتب</label>
            <input
              type="text"
              value={departmentOrOffice}
              onChange={(e) => setDepartmentOrOffice(e.target.value)}
              className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-[#262626]"
          >
            تسجيل الصرف السريع وتحديث الرصيد
          </button>
        </form>

        {/* Employee Battery Consumption Summary Matrix */}
        <div className="lg:col-span-7 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">دفتر صرف حجارة الكمبيوتر والمستهلكات حسب الموظف</h3>
              <p className="text-[11px] text-[#707070]">مطابق لدفتر حجارة الكمبيوتر بالإكسل مع تجميع تراكمي آلي</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-bold text-[#141414]">
              {employeeSummary.length} موظفين
            </span>
          </div>

          <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5">الموظف المستلم</th>
                  <th className="p-2.5">المكتب / القسم</th>
                  <th className="p-2.5">حجر صغير (AAA)</th>
                  <th className="p-2.5">حجر كبير (AA)</th>
                  <th className="p-2.5">أخرى</th>
                  <th className="p-2.5">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {employeeSummary.map((row) => (
                  <tr key={row.name} className="hover:bg-[#fafafa]">
                    <td className="p-2.5 font-bold text-[#141414]">{row.name}</td>
                    <td className="p-2.5 text-[#707070]">{row.office}</td>
                    <td className="p-2.5 font-mono font-bold">{row.small || '—'}</td>
                    <td className="p-2.5 font-mono font-bold">{row.large || '—'}</td>
                    <td className="p-2.5 font-mono">{row.other || '—'}</td>
                    <td className="p-2.5 font-mono font-bold text-[#141414]">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Fast-Issue Log */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5">
        <h4 className="text-sm font-bold text-[#141414] mb-3">السجل التفصيلي لحركات الصرف السريع ({logs.length})</h4>
        <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
              <tr>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">المستلم</th>
                <th className="p-2.5">الصنف</th>
                <th className="p-2.5">الكمية</th>
                <th className="p-2.5">القسم</th>
                <th className="p-2.5">بواسطة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="p-2.5 font-mono">{l.date}</td>
                  <td className="p-2.5 font-bold text-[#141414]">{l.recipientName}</td>
                  <td className="p-2.5">{l.itemName}</td>
                  <td className="p-2.5 font-mono font-bold">
                    {l.qty} {l.uom}
                  </td>
                  <td className="p-2.5 text-[#707070]">{l.departmentOrOffice}</td>
                  <td className="p-2.5 text-[#707070]">{l.issuedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SERIALS, CUSTODY BRIDGE, MEDICAL FEFO, SAMPLES & TENDER RESERVATIONS TAB
// ============================================================================
export const WmsSerialsSamplesTab: React.FC<{
  items: WmsItem[];
  warehouses: WmsWarehouse[];
  serialLots: WmsSerialLotRecord[];
  sampleLoans: WmsSampleLoan[];
  reservations: WmsTenderReservation[];
  onBridgeCustody: (serialRecordId: string, employeeName: string, location: string, estimatedValue: number) => void;
  onCreateSample: (payload: {
    itemId: string;
    qty: number;
    issuedTo: string;
    projectOrTender: string;
    expectedReturnDate: string;
  }) => void;
  onReturnSample: (loanId: string) => void;
  onReserveTender: (payload: {
    tenderRef: string;
    tenderTitle: string;
    itemId: string;
    warehouseId: string;
    qty: number;
  }) => void;
  onReleaseReservation: (resId: string) => void;
}> = ({
  items,
  warehouses,
  serialLots,
  sampleLoans,
  reservations,
  onBridgeCustody,
  onCreateSample,
  onReturnSample,
  onReserveTender,
  onReleaseReservation,
}) => {
  const [subView, setSubView] = useState<'serials' | 'samples' | 'reservations'>('serials');
  const [sampleItemId, setSampleItemId] = useState(items.find((i) => i.isSampleItem)?.id || items[0]?.id || '');
  const [sampleIssuedTo, setSampleIssuedTo] = useState('');
  const [sampleProject, setSampleProject] = useState('');
  const [sampleReturnDate, setSampleReturnDate] = useState('2026-12-01');

  const [resTenderRef, setResTenderRef] = useState('ETM-2026-88991');
  const [resTenderTitle, setResTenderTitle] = useState('');
  const [resItemId, setResItemId] = useState(items[0]?.id || '');
  const [resWarehouseId, setResWarehouseId] = useState(warehouses[0]?.id || 'WH-MAIN');
  const [resQty, setResQty] = useState('1');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'serials' as const, label: `الأرقام التسلسلية والعهد والصلاحية (${serialLots.length})` },
          { id: 'samples' as const, label: `خزانة وإعارة العينات (${sampleLoans.length})` },
          { id: 'reservations' as const, label: `حجز المخزون للمنافسات BOQ (${reservations.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubView(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold ${
              subView === t.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subView === 'serials' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#141414]">
              سجل الأصول المسلسلة (Nikon Z8 / HP / DELL / Fluke / السمات الحيوية) ودفعات الصلاحية الطبية (FEFO)
            </h3>
            <p className="text-[11px] text-[#707070] mt-0.5">
              يمكنك تحويل أي أصل تقني مباشرة بضغطة زر إلى سجل العهد الرسمي للموظفين (Custodies)
            </p>
          </div>
          <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">الرقم التسلسلي / التشغيلة</th>
                  <th className="p-2.5">تاريخ الانتهاء</th>
                  <th className="p-2.5">الحالة</th>
                  <th className="p-2.5">بحوزة / الجهة</th>
                  <th className="p-2.5">الجسر التلقائي للعهد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {serialLots.slice(0, 50).map((r) => (
                  <tr key={r.id} className="hover:bg-[#fafafa]">
                    <td className="p-2.5 font-mono font-bold">{r.sku}</td>
                    <td className="p-2.5 font-semibold text-[#141414]">{r.itemName}</td>
                    <td className="p-2.5 font-mono">{r.serialNumber || r.lotNumber || '—'}</td>
                    <td className="p-2.5 font-mono text-[#707070]">{r.expiryDate || '—'}</td>
                    <td className="p-2.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold text-[#141414]">
                        {r.status === 'IN_STOCK'
                          ? 'بالمستودع'
                          : r.status === 'IN_CUSTODY'
                          ? 'بعهدة موظف'
                          : r.status === 'ISSUED'
                          ? 'مصروف'
                          : r.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-[#707070]">{r.assignedToName || r.assignedToEntity || 'المستودع المركزي'}</td>
                    <td className="p-2.5">
                      {r.custodyId ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[10px] font-mono">
                          عهدة #{r.custodyId}
                        </span>
                      ) : r.serialNumber ? (
                        <button
                          type="button"
                          onClick={() =>
                            onBridgeCustody(
                              r.id,
                              r.assignedToName || 'حاتم سلمان ابوالذهب سلمان',
                              r.assignedToEntity || 'شركة كاس للتجارة — الرياض',
                              0
                            )
                          }
                          className="px-3 py-1 rounded-full border border-[#e0e0e0] hover:bg-[#141414] hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <Vault className="w-3 h-3" />
                          <span>ترحيل كعهدة</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#adadad]">دفعة FEFO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subView === 'samples' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!sampleItemId || !sampleIssuedTo.trim()) return;
              onCreateSample({
                itemId: sampleItemId,
                qty: 1,
                issuedTo: sampleIssuedTo.trim(),
                projectOrTender: sampleProject.trim() || 'منافسة اعتماد',
                expectedReturnDate: sampleReturnDate,
              });
              setSampleIssuedTo('');
              setSampleProject('');
            }}
            className="lg:col-span-4 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-[#141414]">تسليم عينة جديدة بمهلة إرجاع</h3>
            <select
              value={sampleItemId}
              onChange={(e) => setSampleItemId(e.target.value)}
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.sku}] {it.nameAr}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={sampleIssuedTo}
              onChange={(e) => setSampleIssuedTo(e.target.value)}
              placeholder="الجهة / الشخص المستلم للعينة *"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={sampleProject}
              onChange={(e) => setSampleProject(e.target.value)}
              placeholder="اسم المنافسة أو المشروع"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <div>
              <label className="block text-[11px] text-[#707070] mb-1">تاريخ الإرجاع المتوقع</label>
              <input
                type="date"
                value={sampleReturnDate}
                onChange={(e) => setSampleReturnDate(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold">
              تسجيل إعارة العينة
            </button>
          </form>

          <div className="lg:col-span-8 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5">
            <h3 className="text-sm font-bold text-[#141414] mb-3">سجل العينات المعارة والمرتجعة</h3>
            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">الرقم</th>
                    <th className="p-2.5">العينة</th>
                    <th className="p-2.5">المستلم / المنافسة</th>
                    <th className="p-2.5">الإرجاع المتوقع</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {sampleLoans.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2.5 font-mono font-bold">{s.loanNo}</td>
                      <td className="p-2.5 font-semibold">{s.itemName}</td>
                      <td className="p-2.5 text-[#707070]">
                        {s.issuedTo} — <span className="text-[#141414]">{s.projectOrTender}</span>
                      </td>
                      <td className="p-2.5 font-mono">{s.expectedReturnDate}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'متأخرة'
                              ? 'bg-[#141414] text-white'
                              : s.status === 'مرتجعة'
                              ? 'bg-[#f3f3f3] text-[#707070]'
                              : 'bg-[#f3f3f3] text-[#141414]'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {s.status !== 'مرتجعة' ? (
                          <button
                            type="button"
                            onClick={() => onReturnSample(s.id)}
                            className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>توثيق الإرجاع</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#707070]">أُرجعت {s.actualReturnDate}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subView === 'reservations' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!resItemId || !resTenderRef.trim()) return;
              onReserveTender({
                tenderRef: resTenderRef.trim(),
                tenderTitle: resTenderTitle.trim() || 'منافسة اعتماد حكومية',
                itemId: resItemId,
                warehouseId: resWarehouseId,
                qty: Number(resQty) || 1,
              });
              setResTenderTitle('');
            }}
            className="lg:col-span-4 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3"
          >
            <h3 className="text-sm font-bold text-[#141414]">حجز مخزون لصالح منافسة (BOQ Lock)</h3>
            <input
              type="text"
              required
              value={resTenderRef}
              onChange={(e) => setResTenderRef(e.target.value)}
              placeholder="رقم مرجع المنافسة (اعتماد)"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
            />
            <input
              type="text"
              value={resTenderTitle}
              onChange={(e) => setResTenderTitle(e.target.value)}
              placeholder="اسم المنافسة أو الجهة الحكومية"
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
            />
            <select
              value={resItemId}
              onChange={(e) => setResItemId(e.target.value)}
              className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.sku}] {it.nameAr}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={resWarehouseId}
                onChange={(e) => setResWarehouseId(e.target.value)}
                className="rounded-[14px] bg-[#f0f0f0] px-2.5 py-2 text-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={resQty}
                onChange={(e) => setResQty(e.target.value)}
                className="rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>تثبيت الحجز المخزني للمنافسة</span>
            </button>
          </form>

          <div className="lg:col-span-8 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5">
            <h3 className="text-sm font-bold text-[#141414] mb-3">الحجوزات المخزنية النشطة للمنافسات</h3>
            {reservations.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#707070] bg-[#f3f3f3] rounded-[16px]">
                لا توجد حجوزات منافسات نشطة حالياً — استخدم النموذج لحجز كميات تمنع صرفها لغير المنافسة.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2.5">المنافسة</th>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5">المحجوز</th>
                      <th className="p-2.5">الحالة</th>
                      <th className="p-2.5">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {reservations.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2.5 font-mono font-bold">{r.tenderRef}</td>
                        <td className="p-2.5 font-semibold">{r.itemName}</td>
                        <td className="p-2.5 font-mono font-bold">{r.reservedQty}</td>
                        <td className="p-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">{r.status}</span>
                        </td>
                        <td className="p-2.5">
                          {r.status === 'محجوز' && (
                            <button
                              type="button"
                              onClick={() => onReleaseReservation(r.id)}
                              className="px-3 py-1 rounded-full border border-[#e0e0e0] text-[11px] font-bold inline-flex items-center gap-1"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>فك الحجز</span>
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
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. BLIND CYCLE COUNTING & VARIANCE TAB (الجرد الدوري الأعمى)
// ============================================================================
export const WmsCycleCountTab: React.FC<{
  warehouses: WmsWarehouse[];
  sessions: WmsCycleCountSession[];
  onStartSession: (
    warehouseId: string,
    blindMode: boolean,
    scope?: 'ALL' | 'ABC_A' | 'ABC_B' | 'ABC_C' | 'ZONE',
    zoneFilter?: string
  ) => void;
  onUpdateLine: (sessionId: string, itemId: string, countedQty: number | null) => void;
  onPostSession: (sessionId: string) => void;
}> = ({ warehouses, sessions, onStartSession, onUpdateLine, onPostSession }) => {
  const [selectedWh, setSelectedWh] = useState(warehouses[0]?.id || 'WH-MAIN');
  const [blindMode, setBlindMode] = useState(true);
  const [scope, setScope] = useState<'ALL' | 'ABC_A' | 'ABC_B' | 'ABC_C' | 'ZONE'>('ALL');
  const [zoneFilter, setZoneFilter] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || '');

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;

  return (
    <div className="space-y-4">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#141414]">منظومة الجرد الدوري الذكي والأعمى (Blind Cycle Count — بدون حد أصناف)</h3>
          <p className="text-[11px] text-[#707070] mt-0.5">
            يدعم الجرد الكامل لكل المستودع أو التصنيف النطاقي (ABC / Zone) — أدخل الكميات الفعلية لإصدار تسوية ADJ محاسبية تلقائياً
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedWh}
            onChange={(e) => setSelectedWh(e.target.value)}
            className="rounded-full bg-[#f0f0f0] px-3.5 py-2 text-xs font-semibold"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nameAr}
              </option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'ALL' | 'ABC_A' | 'ABC_B' | 'ABC_C' | 'ZONE')}
            className="rounded-full bg-[#f0f0f0] px-3.5 py-2 text-xs font-semibold"
          >
            <option value="ALL">جميع أصناف المستودع (ALL)</option>
            <option value="ABC_A">تصنيف A (الأعلى قيمة)</option>
            <option value="ABC_B">تصنيف B (متوسط القيمة)</option>
            <option value="ABC_C">تصنيف C (الاستهلاكية)</option>
            <option value="ZONE">نطاق / رف محدد (Zone)</option>
          </select>
          {scope === 'ZONE' && (
            <input
              type="text"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              placeholder="مثال: Z1 أو Z-IT"
              className="w-32 rounded-full bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
            />
          )}
          <label className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-[#f3f3f3] cursor-pointer">
            <input type="checkbox" checked={blindMode} onChange={(e) => setBlindMode(e.target.checked)} />
            <span>جرد أعمى (إخفاء الدفتري)</span>
          </label>
          <button
            type="button"
            onClick={() => onStartSession(selectedWh, blindMode, scope, zoneFilter || undefined)}
            className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>بدء جلسة جرد جديدة</span>
          </button>
        </div>
      </div>

      {activeSession ? (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2 flex-wrap">
              <ClipboardList className="w-4 h-4 text-[#141414]" />
              <span className="font-mono font-bold text-sm text-[#141414]">{activeSession.countNo}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-bold">{activeSession.status}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[11px] font-mono font-bold">
                {activeSession.lines.length} صنف
              </span>
              <span className="text-xs text-[#707070]">بواسطة: {activeSession.countedBy}</span>
            </div>
            <div className="flex items-center gap-2">
              {sessions.length > 1 && (
                <select
                  value={activeSession.id}
                  onChange={(e) => setActiveSessionId(e.target.value)}
                  className="rounded-full bg-[#f0f0f0] px-3 py-1.5 text-xs font-mono"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.countNo} ({s.status})
                    </option>
                  ))}
                </select>
              )}
              {activeSession.status === 'قيد الجرد' && (
                <button
                  type="button"
                  onClick={() => onPostSession(activeSession.id)}
                  className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اعتماد الجرد وترحيل الفروقات</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5">SKU</th>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">الوحدة</th>
                  <th className="p-2.5">الرصيد الدفتري</th>
                  <th className="p-2.5">الجرد الفعلي (المعدود)</th>
                  <th className="p-2.5">الفرق (Variance)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {activeSession.lines.map((l) => {
                  const hideSystem = activeSession.blindMode && activeSession.status === 'قيد الجرد';
                  return (
                    <tr key={l.itemId}>
                      <td className="p-2.5 font-mono font-bold">{l.sku}</td>
                      <td className="p-2.5 font-semibold">{l.itemName}</td>
                      <td className="p-2.5 text-[#707070]">{l.baseUom}</td>
                      <td className="p-2.5 font-mono">{hideSystem ? 'مخفي (أعمى)' : l.systemQty}</td>
                      <td className="p-2.5">
                        {activeSession.status === 'قيد الجرد' ? (
                          <input
                            type="number"
                            min={0}
                            value={l.countedQty === null ? '' : l.countedQty}
                            onChange={(e) =>
                              onUpdateLine(
                                activeSession.id,
                                l.itemId,
                                e.target.value === '' ? null : Number(e.target.value)
                              )
                            }
                            placeholder="أدخل العدد الفعلي"
                            className="w-28 rounded-[10px] bg-[#f0f0f0] px-2.5 py-1.5 text-xs font-mono text-[#141414]"
                          />
                        ) : (
                          <span className="font-mono font-bold">{l.countedQty ?? l.systemQty}</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        {hideSystem || l.countedQty === null
                          ? '—'
                          : l.varianceQty === 0
                          ? 'مطابق (0)'
                          : l.varianceQty > 0
                          ? `+${l.varianceQty}`
                          : l.varianceQty}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-10 text-center bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] text-xs text-[#707070]">
          اضغط على <strong>"بدء جلسة جرد جديدة"</strong> لإطلاق جرد دوري لأي مستودع.
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. OPENING RECONCILIATION & 116-ROW EXCEL DISCREPANCIES TAB
// ============================================================================
export const WmsReconciliationTab: React.FC<{
  discrepancies: WmsDiscrepancyItem[];
  onResolve: (
    id: string,
    mode: 'ADJUST_OPENING_STOCK' | 'CONFIRM_ONLY',
    actualShelfQty: number | undefined,
    note: string
  ) => void;
}> = ({ discrepancies, onResolve }) => {
  const [shelfInputs, setShelfInputs] = useState<Record<string, string>>({});
  const pendingCount = discrepancies.filter((d) => d.status === 'بانتظار المراجعة').length;

  return (
    <div className="space-y-4">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#141414]">
              شاشة مراجعة وتصحيح تناقضات ملف الإكسل المرحّل (116 وارد • 111 صادر • 7 مرتجع)
            </h3>
            <p className="text-xs text-[#707070] mt-0.5">
              رصد النظام آلياً كل عجز دفتري (مثل DVD DRIVE و مشبك صرة وأكياس التغليف) وكل تاريخ مكسور تم تصحيحه — راجع وسوّي الرصيد الفعلي على الرف بضغطة زر.
            </p>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold">
          بانتظار المراجعة: {pendingCount} من {discrepancies.length}
        </div>
      </div>

      <div className="space-y-3">
        {discrepancies.map((d) => (
          <div
            key={d.id}
            className={`bg-[#ffffff] border rounded-[20px] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              d.status === 'بانتظار المراجعة' ? 'border-[#141414]' : 'border-[#e0e0e0] opacity-75'
            }`}
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    d.severity === 'عالي'
                      ? 'bg-[#141414] text-white'
                      : 'bg-[#f3f3f3] text-[#141414]'
                  }`}
                >
                  أولوية: {d.severity}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold text-[#707070]">
                  {d.category}
                </span>
                {d.sku && <span className="font-mono text-[11px] font-bold text-[#141414]">{d.sku}</span>}
                <span className="text-[11px] text-[#707070]">{d.excelRef}</span>
              </div>
              <div className="text-sm font-bold text-[#141414]">{d.itemName}</div>
              <div className="text-xs text-[#707070]">{d.summary}</div>
              <div className="text-[11px] font-semibold text-[#141414]">
                التوصية: {d.recommendedAction}
              </div>
              {d.status !== 'بانتظار المراجعة' && (
                <div className="text-[11px] text-[#707070] flex items-center gap-1.5 pt-1">
                  <FileCheck className="w-3.5 h-3.5 text-[#141414]" />
                  <span>
                    {d.status} بواسطة <strong>{d.resolvedBy}</strong> — {d.resolutionNote}
                  </span>
                </div>
              )}
            </div>

            {d.status === 'بانتظار المراجعة' && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {d.itemId && (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={shelfInputs[d.id] ?? '0'}
                      onChange={(e) => setShelfInputs((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="الرصيد الفعلي"
                      className="w-24 rounded-full bg-[#f0f0f0] px-3 py-1.5 text-xs font-mono text-center text-[#141414]"
                      title="الكمية الفعلية الموجودة حالياً على الرف"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onResolve(
                          d.id,
                          'ADJUST_OPENING_STOCK',
                          Number(shelfInputs[d.id] ?? 0),
                          `تثبيت الرصيد الافتتاحي الفعلي (${shelfInputs[d.id] ?? 0}) بعد المراجعة`
                        )
                      }
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-[#262626]"
                    >
                      اعتماد الرصيد الفعلي
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onResolve(d.id, 'CONFIRM_ONLY', undefined, 'تمت المراجعة والتأكيد')}
                  className="px-3.5 py-1.5 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414] hover:bg-[#f3f3f3]"
                >
                  تأكيد المراجعة
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 5. ANALYTICS (COST CENTERS), AUDIT TRAIL & DUAL COSTING POLICY SETTINGS TAB
// ============================================================================
export const WmsAnalyticsAndSettingsTab: React.FC<{
  settings: WmsSettings;
  auditLogs: WmsAuditLog[];
  consumptionByBeneficiary: Array<{
    beneficiary: string;
    costCenterCode: string;
    vouchersCount: number;
    totalUnitsIssued: number;
    totalValue: number;
    topItems: string[];
  }>;
  onUpdateSettings: (patch: Partial<WmsSettings>) => void;
}> = ({ settings, auditLogs, consumptionByBeneficiary, onUpdateSettings }) => {
  return (
    <div className="space-y-5">
      {/* Dual Costing Policy & Accounting Engine Controls (User Choice #4: BOTH OPTIONS!) */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#141414] text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#141414]">إعدادات سياسة التسعير والربط المحاسبي الآلي (IAS 2)</h3>
              <p className="text-[11px] text-[#707070]">
                يتيح النظام الخيارين معاً مع إمكانية التبديل الفوري في أي وقت دون فقدان أي بيانات
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#707070]">
            آخر تحديث: {settings.updatedBy}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings({ costingMode: 'optional', autoPostGlWhenCostPresent: true })}
            className={`text-right p-4 rounded-[18px] border transition-colors ${
              settings.costingMode === 'optional'
                ? 'border-[#141414] bg-[#f3f3f3]'
                : 'border-[#e0e0e0] bg-[#ffffff] hover:bg-[#fafafa]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#141414]">الخيار 1: سعر التكلفة اختياري (الوضع المرن)</span>
              {settings.costingMode === 'optional' && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">مفعّل</span>
              )}
            </div>
            <p className="text-[11px] text-[#707070] mt-1.5">
              يسمح بإدخال أذونات الوارد بسرعة بدون سعر حالياً، وبمجرد إدخال سعر التكلفة في أي إذن يتفعّل حساب المتوسط المرجح (AVCO) والترحيل المحاسبي الآلي (IAS 2) فوراً.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ costingMode: 'mandatory', autoPostGlWhenCostPresent: true })}
            className={`text-right p-4 rounded-[18px] border transition-colors ${
              settings.costingMode === 'mandatory'
                ? 'border-[#141414] bg-[#f3f3f3]'
                : 'border-[#e0e0e0] bg-[#ffffff] hover:bg-[#fafafa]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#141414]">الخيار 2: سعر التكلفة إلزامي (الوضع المحاسبي الصارم)</span>
              {settings.costingMode === 'mandatory' && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">مفعّل</span>
              )}
            </div>
            <p className="text-[11px] text-[#707070] mt-1.5">
              يُلزم بإدخال تكلفة الوحدة في كل إذن وارد (GRN) لضمان ترحيل قيد يومي مزدوج (IAS 2) وتحديث تقييم المخزون المالي مع كل حركة.
            </p>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#f0f0f0] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#707070]">طريقة التقييم:</span>
            {(['AVCO', 'FIFO'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onUpdateSettings({ valuationMethod: m })}
                className={`px-3 py-1 rounded-full font-bold ${
                  settings.valuationMethod === m ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                {m === 'AVCO' ? 'المتوسط المرجح (AVCO)' : 'الوارد أولاً صادر أولاً (FIFO)'}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 font-semibold text-[#141414] cursor-pointer">
            <input
              type="checkbox"
              checked={!settings.allowNegativeStock}
              onChange={(e) => onUpdateSettings({ allowNegativeStock: !e.target.checked })}
            />
            <span>منع الصرف بالسالب لحماية دقة الأرصدة</span>
          </label>
        </div>

        {/* Enterprise Governance Controls (FEFO / QC / In-Transit / Immutability / Maker-Checker) */}
        <div className="pt-3 border-t border-[#f0f0f0] space-y-3">
          <div className="text-xs font-bold text-[#141414]">
            إعدادات الحوكمة والرقابة المتقدمة (Enterprise WMS Governance):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <label className="flex items-center gap-2 p-3 rounded-[14px] bg-[#f3f3f3] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={settings.enforceFefo !== false}
                onChange={(e) => onUpdateSettings({ enforceFefo: e.target.checked })}
              />
              <span>صرف FEFO آلي (الأقرب صلاحية أولاً)</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-[14px] bg-[#f3f3f3] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={settings.blockExpiredLots !== false}
                onChange={(e) => onUpdateSettings({ blockExpiredLots: e.target.checked })}
              />
              <span>منع صرف الدفعات منتهية الصلاحية</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-[14px] bg-[#f3f3f3] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={Boolean(settings.requireQcOnGrn)}
                onChange={(e) => onUpdateSettings({ requireQcOnGrn: e.target.checked })}
              />
              <span>إلزام حجر فحص الجودة (QC Hold) للوارد</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-[14px] bg-[#f3f3f3] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={Boolean(settings.enableInTransitTransfers)}
                onChange={(e) => onUpdateSettings({ enableInTransitTransfers: e.target.checked })}
              />
              <span>تفعيل التحويل بمرحلتين (In-Transit STR)</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-[14px] bg-[#f3f3f3] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={Boolean(settings.strictImmutablePostedVouchers)}
                onChange={(e) => onUpdateSettings({ strictImmutablePostedVouchers: e.target.checked })}
              />
              <span>حوكمة التثبيت الصارم (عكس قيد فقط للمُرحّل)</span>
            </label>
            <label className="flex items-center gap-2 p-3 rounded-[14px] bg-[#f3f3f3] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={Boolean(settings.enforceMakerChecker)}
                onChange={(e) => onUpdateSettings({ enforceMakerChecker: e.target.checked })}
              />
              <span>فصل المهام (Maker ≠ Checker)</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <label className="flex items-center gap-2 font-semibold">
              <span className="text-[#707070]">سقف الصرف التلقائي قبل الاعتماد (⃁):</span>
              <input
                type="number"
                min={0}
                step={500}
                value={settings.approvalThresholdSar ?? 10000}
                onChange={(e) => onUpdateSettings({ approvalThresholdSar: Math.max(0, Number(e.target.value) || 0) })}
                className="w-28 rounded-full bg-[#f0f0f0] px-3 py-1 font-mono text-center font-bold"
              />
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <span className="text-[#707070]">نسبة فرق الجرد الملزمة للاعتماد (%):</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={settings.cycleCountVarianceApprovalPct ?? 5}
                onChange={(e) =>
                  onUpdateSettings({ cycleCountVarianceApprovalPct: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-20 rounded-full bg-[#f0f0f0] px-3 py-1 font-mono text-center font-bold"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Cost Center & Beneficiary Consumption Analytics */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#141414]" />
          <h3 className="text-sm font-bold text-[#141414]">تحليل استهلاك المكاتب ومراكز السكن ومراكز التكلفة</h3>
        </div>
        <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
              <tr>
                <th className="p-2.5">الجهة المستفيدة (مكتب / سكن / مشروع)</th>
                <th className="p-2.5">مركز التكلفة</th>
                <th className="p-2.5">عدد أذونات الصرف</th>
                <th className="p-2.5">إجمالي الوحدات المصروفة</th>
                <th className="p-2.5">أبرز الأصناف المصروفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {consumptionByBeneficiary.map((row) => (
                <tr key={row.beneficiary} className="hover:bg-[#fafafa]">
                  <td className="p-2.5 font-bold text-[#141414]">{row.beneficiary}</td>
                  <td className="p-2.5 font-mono text-[#707070]">{row.costCenterCode}</td>
                  <td className="p-2.5 font-mono font-bold">{row.vouchersCount}</td>
                  <td className="p-2.5 font-mono font-bold">{row.totalUnitsIssued.toLocaleString()}</td>
                  <td className="p-2.5 text-[#707070]">{row.topItems.join(' • ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Trail */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#141414]" />
            <h3 className="text-sm font-bold text-[#141414]">سجل التدقيق والرقابة الشامل غير القابل للتعديل (Audit Trail)</h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-bold">
            {auditLogs.length} حركة موثّقة
          </span>
        </div>

        <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
              <tr>
                <th className="p-2.5">الوقت</th>
                <th className="p-2.5">الإجراء</th>
                <th className="p-2.5">الكيان / المرجع</th>
                <th className="p-2.5">المنفّذ</th>
                <th className="p-2.5">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {auditLogs.slice(0, 40).map((log) => (
                <tr key={log.id}>
                  <td className="p-2.5 font-mono text-[11px] text-[#707070]">{log.timestamp.slice(0, 16).replace('T', ' ')}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-mono font-bold">{log.action}</span>
                  </td>
                  <td className="p-2.5 font-semibold text-[#141414]">{log.entityLabel}</td>
                  <td className="p-2.5 font-semibold">{log.actorName}</td>
                  <td className="p-2.5 text-[#707070]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
