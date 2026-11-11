import React, { useEffect, useMemo, useState } from 'react';
import {
  Store,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Receipt,
  Users,
  TrendingUp,
  Package,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { ExportDropdown } from '../components/common/ExportDropdown';

export interface KasCommercialDeal {
  id: string;
  reference_no: string;
  division: 'الأميال' | 'المعرض';
  client_name: string;
  client_phone: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  vat_amount: number;
  total_with_vat: number;
  sales_rep: string;
  status: 'عرض سعر' | 'مؤكد ومفوتر' | 'قيد التسليم';
  created_at: string;
}

const DEFAULT_COMMERCIAL_DEALS: KasCommercialDeal[] = [
  {
    id: 'KCM-1001',
    reference_no: 'IMAL-2026-041',
    division: 'الأميال',
    client_name: 'شركة الإمداد اللوجستي السريع',
    client_phone: '0504419283',
    item_description: 'عقد تشغيل باقة الأميال السنوية لأسطول التوزيع (15 مركبة)',
    quantity: 15,
    unit_price: 4200,
    vat_amount: 9450,
    total_with_vat: 72450,
    sales_rep: 'ماجد عبدالرحمن الصالح',
    status: 'مؤكد ومفوتر',
    created_at: '2026-08-14',
  },
  {
    id: 'KCM-1002',
    reference_no: 'IMAL-2026-042',
    division: 'الأميال',
    client_name: 'مؤسسة نجد للنقل المبرد',
    client_phone: '0558812309',
    item_description: 'باقة أميال تشغيلية ربع سنوية شاملة الصيانة الدورية',
    quantity: 8,
    unit_price: 3100,
    vat_amount: 3720,
    total_with_vat: 28520,
    sales_rep: 'جمال محمد حافظ',
    status: 'قيد التسليم',
    created_at: '2026-08-16',
  },
  {
    id: 'KCM-1003',
    reference_no: 'SHW-2026-109',
    division: 'المعرض',
    client_name: 'مجموعة الفيصلية للضيافة والفنادق',
    client_phone: '0541190024',
    item_description: 'توريد تجهيزات صالات العرض والضيافة المباشرة من المعرض الرئيسي',
    quantity: 12,
    unit_price: 2850,
    vat_amount: 5130,
    total_with_vat: 39330,
    sales_rep: 'باسل خالد محمد اللبودى',
    status: 'مؤكد ومفوتر',
    created_at: '2026-08-17',
  },
];

export const KasCommercialDivisionsPage: React.FC = () => {
  const { user } = useAuthContext();
  const { addNotification } = useAppStore();

  const initialDivisionFilter = useMemo<'all' | 'الأميال' | 'المعرض'>(() => {
    const email = (user?.email || '').toLowerCase();
    if (email.includes('.imal@')) return 'الأميال';
    if (email.includes('.showroom@')) return 'المعرض';
    return 'all';
  }, [user?.email]);

  const [deals, setDeals] = useState<KasCommercialDeal[]>(DEFAULT_COMMERCIAL_DEALS);
  const [divisionFilter, setDivisionFilter] = useState<'all' | 'الأميال' | 'المعرض'>(initialDivisionFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    division: (initialDivisionFilter === 'المعرض' ? 'المعرض' : 'الأميال') as 'الأميال' | 'المعرض',
    client_name: '',
    client_phone: '',
    item_description: '',
    quantity: 1,
    unit_price: 2500,
    status: 'عرض سعر' as KasCommercialDeal['status'],
  });

  useEffect(() => {
    setDivisionFilter(initialDivisionFilter);
  }, [initialDivisionFilter]);

  useEffect(() => {
    let mounted = true;
    realErpDataStore
      .getRecords<KasCommercialDeal>('kas_commercial_deals', DEFAULT_COMMERCIAL_DEALS)
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setDeals(data);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (divisionFilter !== 'all' && d.division !== divisionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.reference_no.toLowerCase().includes(q) ||
          d.client_name.toLowerCase().includes(q) ||
          d.item_description.toLowerCase().includes(q) ||
          d.sales_rep.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deals, divisionFilter, searchQuery]);

  const kpis = useMemo(() => {
    const totalSales = filteredDeals.reduce((sum, d) => sum + (d.total_with_vat || 0), 0);
    const imalCount = deals.filter((d) => d.division === 'الأميال').length;
    const showroomCount = deals.filter((d) => d.division === 'المعرض').length;
    const invoicedCount = filteredDeals.filter((d) => d.status === 'مؤكد ومفوتر').length;
    return { totalSales, imalCount, showroomCount, invoicedCount };
  }, [deals, filteredDeals]);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.item_description.trim()) return;

    const qty = Math.max(1, Number(form.quantity) || 1);
    const price = Math.max(0, Number(form.unit_price) || 0);
    const subtotal = qty * price;
    const vat = Number((subtotal * 0.15).toFixed(2));
    const total = Number((subtotal + vat).toFixed(2));
    const prefix = form.division === 'الأميال' ? 'IMAL' : 'SHW';

    const record: KasCommercialDeal = {
      id: `KCM-${Date.now().toString().slice(-5)}`,
      reference_no: `${prefix}-2026-${Math.floor(100 + Math.random() * 900)}`,
      division: form.division,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || '0500000000',
      item_description: form.item_description.trim(),
      quantity: qty,
      unit_price: price,
      vat_amount: vat,
      total_with_vat: total,
      sales_rep: user?.full_name || 'مبيعات القطاعات التجارية',
      status: form.status,
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('kas_commercial_deals', record);
    setDeals((prev) => [record, ...prev]);
    setShowAddModal(false);
    setForm((f) => ({ ...f, client_name: '', client_phone: '', item_description: '' }));
    addNotification({
      type: 'success',
      title: 'تم حفظ العملية التجارية',
      message: `تم تسجيل عقد/مبيعات قطاع ${record.division} برقم ${record.reference_no} وإجمالي ${record.total_with_vat.toLocaleString('ar-SA')} ⃁.`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 sm:p-8 border border-[#262626]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#262626] text-[#ffffff] border border-[#3f3f46]">
                القطاعات التجارية المستقلة عن المنافسات الحكومية
              </span>
              <span className="text-xs text-[#a1a1aa]">قطاع الأميال • المعرض الرئيسي</span>
            </div>
            <h1 className="text-2xl font-bold text-[#ffffff] m-0">
              بوابة مبيعات وعقود قطاعي الأميال والمعرض التجاري.
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1.5 mb-0">
              إدارة العقود التشغيلية للأميال ومبيعات المعرض المباشرة وفواتير الضريبة المضافة بمعزل تام عن منظومة منافسات اعتماد.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#141414]" />
              <span>تسجيل عملية مبيعات / عقد جديد</span>
            </button>
            <ExportDropdown
              sectionKey="invoices"
              data={filteredDeals}
              customTitle="سجل مبيعات وعقود الأميال والمعرض"
              variant="compact"
              buttonLabel="تصدير السجل"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center justify-between text-xs text-[#707070] mb-2">
            <span>إجمالي المبيعات (شامل الضريبة)</span>
            <TrendingUp className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono">
            {kpis.totalSales.toLocaleString('ar-SA')} ⃁
          </div>
        </div>

        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center justify-between text-xs text-[#707070] mb-2">
            <span>عقود قطاع الأميال</span>
            <Truck className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono">{kpis.imalCount}</div>
        </div>

        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center justify-between text-xs text-[#707070] mb-2">
            <span>عمليات المعرض الرئيسي</span>
            <Store className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono">{kpis.showroomCount}</div>
        </div>

        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center justify-between text-xs text-[#707070] mb-2">
            <span>عمليات مفوترة ومعتمدة</span>
            <Receipt className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono">{kpis.invoicedCount}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-[#f3f3f3] p-1 rounded-full border border-[#e0e0e0] w-fit">
            {(['all', 'الأميال', 'المعرض'] as const).map((div) => {
              const active = divisionFilter === div;
              return (
                <button
                  key={div}
                  type="button"
                  onClick={() => setDivisionFilter(div)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    active ? 'bg-[#141414] text-[#ffffff]' : 'bg-transparent text-[#141414] hover:bg-[#e5e5e5]'
                  }`}
                >
                  {div === 'all' ? 'كافة القطاعات التجارية' : `قطاع ${div}`}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم العقد، اسم العميل، المندوب..."
              className="w-full rounded-full bg-[#f0f0f0] pr-10 pl-4 py-2 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e0e0e0] text-[#707070]">
                <th className="py-3 px-3 font-bold">الرقم المرجعي</th>
                <th className="py-3 px-3 font-bold">القطاع</th>
                <th className="py-3 px-3 font-bold">العميل</th>
                <th className="py-3 px-3 font-bold">بيان البند / العقد</th>
                <th className="py-3 px-3 font-bold">المندوب المسؤول</th>
                <th className="py-3 px-3 font-bold">الإجمالي (شامل الضريبة)</th>
                <th className="py-3 px-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => (
                <tr key={deal.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                  <td className="py-3.5 px-3 font-mono font-bold text-[#141414]">{deal.reference_no}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-bold">
                      {deal.division}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-[#141414]">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#707070]" />
                      <span>{deal.client_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-[#262626] max-w-xs truncate" title={deal.item_description}>
                    <Package className="w-3.5 h-3.5 inline ml-1 text-[#707070]" />
                    {deal.item_description}
                  </td>
                  <td className="py-3.5 px-3 text-[#707070]">{deal.sales_rep}</td>
                  <td className="py-3.5 px-3 font-mono font-bold text-[#141414]">
                    {deal.total_with_vat.toLocaleString('ar-SA')} ⃁
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {deal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141414] m-0">تسجيل عقد أميال أو مبيعات معرض جديدة</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">القطاع التجاري</label>
                  <select
                    value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value as 'الأميال' | 'المعرض' })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  >
                    <option value="الأميال">قطاع الأميال</option>
                    <option value="المعرض">المعرض الرئيسي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">حالة العملية</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as KasCommercialDeal['status'] })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  >
                    <option value="عرض سعر">عرض سعر</option>
                    <option value="قيد التسليم">قيد التسليم</option>
                    <option value="مؤكد ومفوتر">مؤكد ومفوتر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">اسم العميل / المنشأة</label>
                  <input
                    type="text"
                    required
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">رقم التواصل</label>
                  <input
                    type="text"
                    value={form.client_phone}
                    onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">وصف البند / باقة الأميال / تجهيز المعرض</label>
                <input
                  type="text"
                  required
                  value={form.item_description}
                  onChange={(e) => setForm({ ...form, item_description: e.target.value })}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الكمية / عدد الوحدات</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">سعر الوحدة (⃁ غير شامل الضريبة)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] cursor-pointer"
                >
                  حفظ واعتماد العملية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasCommercialDivisionsPage;
