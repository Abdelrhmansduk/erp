import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { Vault, Plus, FileSpreadsheet, FileText, Search, Printer, RotateCcw, X, ShieldCheck, Trash2 } from 'lucide-react';

interface Custody {
  id: string;
  item_name: string;
  employee_name: string;
  location: string;
  received_date: string;
  serial_number: string;
  estimated_value: number;
  status: 'في حوزة الموظف' | 'تم الاسترجاع' | 'صيانة';
}

const INITIAL_CUSTODIES: Custody[] = [
  { id: 'CUST-01', item_name: 'جهاز لاب توب MacBook Pro M2', employee_name: 'محمد مصطفي', location: 'مقر الإدارة العليا', received_date: '2024-06-01', serial_number: 'C02GX891Q6L4', estimated_value: 8500, status: 'في حوزة الموظف' },
  { id: 'CUST-02', item_name: 'سيارة تويوتا كامري 2025 (استقبال مطار)', employee_name: 'سائق الاستقبال - أحمد', location: 'فرع مطار الملك خالد', received_date: '2025-01-15', serial_number: 'KSA-9941-KSA', estimated_value: 95000, status: 'في حوزة الموظف' },
  { id: 'CUST-03', item_name: 'جهاز ايفون 15 بروماكس (هاتف خدمة العملاء)', employee_name: 'سارة خالد', location: 'فرع الرياض الرئيسي', received_date: '2025-03-10', serial_number: 'IPH-99281-2025', estimated_value: 5200, status: 'في حوزة الموظف' },
  { id: 'CUST-04', item_name: 'طابعة ملونة ليزر HP Enterprise', employee_name: 'فهد العتيبي', location: 'فرع جدة', received_date: '2024-11-20', serial_number: 'HP-ENT-44102', estimated_value: 4100, status: 'صيانة' }
];

const normalizeCustodyRecord = (raw: any, idx: number): Custody => ({
  id: String(raw?.id || raw?.custody_code || raw?.custody_number || `CUST-0${idx + 1}`),
  item_name: String(raw?.item_name || raw?.asset_name || raw?.itemName || 'أصل مؤسسي مسجل'),
  employee_name: String(raw?.employee_name || raw?.emp_name || raw?.employeeName || 'موظف مستلم'),
  location: String(raw?.location || raw?.branch || 'فرع الرياض الرئيسي'),
  received_date: String(raw?.received_date || raw?.handover_date || (raw?.created_at ? String(raw.created_at).slice(0, 10) : '2025-01-15')),
  serial_number: String(raw?.serial_number || raw?.serialNumber || `SN-${1000 + idx}`),
  estimated_value: Number(raw?.estimated_value ?? raw?.value ?? 0),
  status: (raw?.status === 'في حوزة الموظف' || raw?.status === 'تم الاسترجاع' || raw?.status === 'صيانة')
    ? raw.status
    : 'في حوزة الموظف',
});

export const CustodiesPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustodyForDoc, setSelectedCustodyForDoc] = useState<Custody | null>(null);

  useEffect(() => {
    realErpDataStore.getRecords<Custody>('custodies', INITIAL_CUSTODIES).then((data) => {
      const list = Array.isArray(data) && data.length > 0 ? data : INITIAL_CUSTODIES;
      setCustodies(list.map((item, idx) => normalizeCustodyRecord(item, idx)));
    });
  }, []);

  const [addForm, setAddForm] = useState({
    item_name: '',
    employee_name: '',
    location: 'فرع الرياض الرئيسي',
    serial_number: '',
    estimated_value: ''
  });

  const handleAddCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.item_name || !addForm.employee_name) return;

    const newC: Custody = {
      id: `CUST-0${custodies.length + 1}`,
      item_name: addForm.item_name,
      employee_name: addForm.employee_name,
      location: addForm.location,
      received_date: new Date().toISOString().slice(0, 10),
      serial_number: addForm.serial_number || 'N/A',
      estimated_value: parseFloat(addForm.estimated_value) || 0,
      status: 'في حوزة الموظف'
    };

    const updated = await realErpDataStore.addRecord('custodies', newC, INITIAL_CUSTODIES);
    setCustodies(updated);
    addNotification({
      title: 'تسليم عهدة جديدة',
      message: `تم تسليم (${addForm.item_name}) للموظف (${addForm.employee_name}) بنجاح.`,
      type: 'success',
    });
    setShowAddModal(false);
    setAddForm({ item_name: '', employee_name: '', location: 'فرع الرياض الرئيسي', serial_number: '', estimated_value: '' });
  };

  const toggleCustodyStatus = async (id: string) => {
    const target = custodies.find(c => c.id === id);
    if (!target) return;
    const nextStatus = target.status === 'في حوزة الموظف' ? 'تم الاسترجاع' : 'في حوزة الموظف';
    const updated = await realErpDataStore.updateRecord<Custody>('custodies', id, { status: nextStatus }, INITIAL_CUSTODIES);
    setCustodies(updated);
    addNotification({
      title: 'تحديث حالة العهدة',
      message: `تم تغيير حالة (${target.item_name}) إلى (${nextStatus}).`,
      type: 'info',
    });
  };

  const handleDeleteCustody = async (row: Custody) => {
    if (window.confirm(`هل أنت متأكد من حذف سجل عهدة (${row.item_name}) للموظف (${row.employee_name})؟`)) {
      await realErpDataStore.deleteRecord('custodies', row.id);
      setCustodies(custodies.filter(c => c.id !== row.id));
      addNotification({
        title: 'حذف سجل عهدة',
        message: `تم حذف سجل العهدة #${row.id} بنجاح.`,
        type: 'error',
      });
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredCustodies = custodies.filter((c) =>
    (c.item_name || '').toLowerCase().includes(q) ||
    (c.employee_name || '').toLowerCase().includes(q) ||
    (c.serial_number || '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration
            type="inventory-custody"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>HR ASSETS & CUSTODIES</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة عُهد وأصول الموظفين
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              تسليم الأصول، السيارات، الأجهزة الذكية، وتوليد سندات الاستلام الرسمية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className="button-white-pill" onClick={() => setShowAddModal(true)} style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}>
            <Plus className="w-4 h-4 ml-1" />
            <span>+ تسليم عُهدة جديدة</span>
          </button>
          <ExportDropdown sectionKey="custodies" data={custodies} variant="outline-dark" customTitle="سجل العُهد والأصول المالية" />
        </div>
      </div>

      {/* Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="ابحث باسم العُهدة، الموظف، أو الرقم التسلسلي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            العدد: {filteredCustodies.length} عُهدة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رمز العُهدة</th>
                <th className="p-3.5">اسم العُهدة والرقم التسلسلي</th>
                <th className="p-3.5">الموظف المستلم</th>
                <th className="p-3.5">المقر / الفرع</th>
                <th className="p-3.5">القيمة التقديرية</th>
                <th className="p-3.5">تاريخ التسليم</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCustodies.map((row, idx) => (
                <tr key={`${row.id}-${idx}`} className="hover:bg-zinc-50">
                  <td className="p-3.5 font-mono font-bold text-black">{row.id}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-black">{row.item_name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">S/N: {row.serial_number}</div>
                  </td>
                  <td className="p-3.5 font-semibold text-black">
                    <div className="flex items-center gap-2">
                      <CorporateAvatar
                        name={row.employee_name}
                        role={row.location}
                        departmentId="hr"
                        size="sm"
                        status={row.status === 'في حوزة الموظف' ? 'verified' : 'none'}
                      />
                      <span>{row.employee_name}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge text={row.location} type="purple" />
                  </td>
                  <td className="p-3.5 font-mono font-bold text-black">{(row.estimated_value ?? 0).toLocaleString()} ⃁</td>
                  <td className="p-3.5 font-mono text-zinc-500">{row.received_date}</td>
                  <td className="p-3.5">
                    <Badge text={row.status} type={row.status === 'في حوزة الموظف' ? 'success' : row.status === 'تم الاسترجاع' ? 'purple' : 'warning'} />
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        className="button-outline-on-light"
                        style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                        onClick={() => toggleCustodyStatus(row.id)}
                      >
                        <RotateCcw className="w-3 h-3 ml-1" />
                        <span>{row.status === 'في حوزة الموظف' ? 'استرجاع' : 'إعادة تسليم'}</span>
                      </button>
                      <button
                        className="button-outline-on-light"
                        style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                        onClick={() => setSelectedCustodyForDoc(row)}
                      >
                        <FileText className="w-3 h-3 ml-1" />
                        <span>سند التسليم</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCustody(row)}
                        className="p-1 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="حذف العهدة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custody Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Vault className="w-4 h-4 text-emerald-400" />
                <span>تسليم عُهدة جديدة لموظف</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustody} className="p-6 space-y-4 bg-white text-black">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الأصل / العُهدة *</label>
                <input
                  type="text"
                  placeholder="مثال: لاب توب، سيارة، هاتف..."
                  value={addForm.item_name}
                  onChange={e => setAddForm({ ...addForm, item_name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الموظف المستلم *</label>
                  <input
                    type="text"
                    placeholder="الاسم الثلاثي..."
                    value={addForm.employee_name}
                    onChange={e => setAddForm({ ...addForm, employee_name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الرقم التسلسلي (S/N)</label>
                  <input
                    type="text"
                    placeholder="Serial Number..."
                    value={addForm.serial_number}
                    onChange={e => setAddForm({ ...addForm, serial_number: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">القيمة التقديرية (⃁)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={addForm.estimated_value}
                    onChange={e => setAddForm({ ...addForm, estimated_value: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المقر المخصص</label>
                  <select
                    value={addForm.location}
                    onChange={e => setAddForm({ ...addForm, location: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option>فرع الرياض الرئيسي</option>
                    <option>فرع جدة</option>
                    <option>مقر الإدارة العليا</option>
                    <option>مركز الإيواء - الرمال</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }} onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  تسليم الأصل وحفظ العُهدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover Document Modal */}
      {selectedCustodyForDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>سند تسلم واستلام عُهدة موظف رسمية</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">مجموعة خالد السليم التجارية</p>
              </div>
              <button onClick={() => setSelectedCustodyForDoc(null)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-black">
              <p className="text-xs text-zinc-700 leading-relaxed">
                أقر أنا الموظف / <strong className="text-black">{selectedCustodyForDoc.employee_name}</strong> بأنني استلمت العُهدة المبينة أدنها بحالة جيدة وأتعهد بالحفاظ عليها وإعادتها فور طلب الإدارة:
              </p>

              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2 text-xs">
                <div><strong>اسم الأصل:</strong> {selectedCustodyForDoc.item_name}</div>
                <div><strong>الرقم التسلسلي:</strong> <span className="font-mono">{selectedCustodyForDoc.serial_number}</span></div>
                <div><strong>تاريخ الاستلام:</strong> <span className="font-mono">{selectedCustodyForDoc.received_date}</span></div>
                <div><strong>القيمة التقديرية:</strong> <span className="font-mono font-bold text-emerald-700">{(selectedCustodyForDoc.estimated_value ?? 0).toLocaleString()} ⃁</span></div>
              </div>

              <div className="flex justify-between pt-4 border-t border-dashed border-zinc-200 text-xs text-zinc-600">
                <div>توقيع الموظف المستلم: ____________</div>
                <div>اعتماد الموارد البشرية: ____________</div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button className="button-outline-on-light" style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }} onClick={() => setSelectedCustodyForDoc(null)}>
                  إغلاق
                </button>
                <button className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }} onClick={() => window.print()}>
                  <Printer className="w-4 h-4 ml-1" />
                  <span>طباعة السند</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustodiesPage;
