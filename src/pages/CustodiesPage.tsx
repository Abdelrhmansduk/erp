import React, { useState, useEffect } from 'react';
import { useModalEscape } from '../hooks/useModalEscape';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import {
  ALL_ENTITY_OPTIONS,
  detectActiveSessionEntityCode,
  getEntityHideHoldingPreference,
  normalizeCanonicalEntityCode,
  resolveDocumentBranding,
  setEntityHideHoldingPreference,
} from '../services/entityBrandingService';
import {
  archiveRecordBeforeSoftDelete,
  recordFieldLevelChanges,
  RecycleBinEntry,
} from '../services/quickShareService';
import { RecordQuickActions, RecycleBinModal } from '../components/common/RecordQuickActions';
import {
  Vault,
  Plus,
  FileText,
  Search,
  Printer,
  RotateCcw,
  X,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface Custody {
  id: string;
  company_id?: string;
  item_name: string;
  employee_name: string;
  employee_phone?: string;
  employee_email?: string;
  location: string;
  received_date: string;
  serial_number: string;
  estimated_value: number;
  status: 'في حوزة الموظف' | 'تم الاسترجاع' | 'صيانة';
  notes?: string;
}

const INITIAL_CUSTODIES: Custody[] = [
  {
    id: 'CUST-01',
    company_id: 'SAF',
    item_name: 'جهاز لاب توب MacBook Pro M2',
    employee_name: 'محمد مصطفي',
    employee_phone: '0501122334',
    employee_email: 'm.mustafa@saf-rec.sa',
    location: 'مقر الإدارة العليا',
    received_date: '2024-06-01',
    serial_number: 'C02GX891Q6L4',
    estimated_value: 8500,
    status: 'في حوزة الموظف',
  },
  {
    id: 'CUST-02',
    company_id: 'YAQ',
    item_name: 'سيارة تويوتا كامري 2025 (استقبال مطار)',
    employee_name: 'سائق الاستقبال - أحمد',
    employee_phone: '0552233445',
    location: 'فرع مطار الملك خالد',
    received_date: '2025-01-15',
    serial_number: 'KSA-9941-KSA',
    estimated_value: 95000,
    status: 'في حوزة الموظف',
  },
  {
    id: 'CUST-03',
    company_id: 'KAS',
    item_name: 'جهاز ايفون 15 بروماكس (هاتف خدمة العملاء)',
    employee_name: 'سارة خالد',
    employee_phone: '0543344556',
    employee_email: 's.khalid@kas.sa',
    location: 'فرع الرياض الرئيسي',
    received_date: '2025-03-10',
    serial_number: 'IPH-99281-2025',
    estimated_value: 5200,
    status: 'في حوزة الموظف',
  },
  {
    id: 'CUST-04',
    company_id: 'TOP',
    item_name: 'طابعة ملونة ليزر HP Enterprise',
    employee_name: 'فهد العتيبي',
    employee_phone: '0564455667',
    location: 'فرع جدة',
    received_date: '2024-11-20',
    serial_number: 'HP-ENT-44102',
    estimated_value: 4100,
    status: 'صيانة',
  },
];

const normalizeCustodyRecord = (raw: any, idx: number): Custody => ({
  id: String(raw?.id || raw?.custody_code || raw?.custody_number || `CUST-0${idx + 1}`),
  company_id: String(raw?.company_id || raw?.companyCode || 'SAF'),
  item_name: String(raw?.item_name || raw?.asset_name || raw?.itemName || 'أصل مؤسسي مسجل'),
  employee_name: String(raw?.employee_name || raw?.emp_name || raw?.employeeName || 'موظف مستلم'),
  employee_phone: String(raw?.employee_phone || raw?.phone || ''),
  employee_email: String(raw?.employee_email || raw?.email || ''),
  location: String(raw?.location || raw?.branch || 'فرع الرياض الرئيسي'),
  received_date: String(
    raw?.received_date ||
      raw?.handover_date ||
      (raw?.created_at ? String(raw.created_at).slice(0, 10) : '2025-01-15')
  ),
  serial_number: String(raw?.serial_number || raw?.serialNumber || `SN-${1000 + idx}`),
  estimated_value: Number(raw?.estimated_value ?? raw?.value ?? 0),
  status:
    raw?.status === 'في حوزة الموظف' || raw?.status === 'تم الاسترجاع' || raw?.status === 'صيانة'
      ? raw.status
      : 'في حوزة الموظف',
  notes: raw?.notes ? String(raw.notes) : '',
});

export const CustodiesPage: React.FC = () => {
  useModalEscape();
  const { addNotification } = useAppStore();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustody, setEditingCustody] = useState<Custody | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [selectedCustodyForDoc, setSelectedCustodyForDoc] = useState<Custody | null>(null);
  const [docEntityCode, setDocEntityCode] = useState<string>('SAF');
  const [docHideHoldingGroup, setDocHideHoldingGroup] = useState<boolean>(false);
  const [docCustomClause, setDocCustomClause] = useState<string>(
    'أتعهد بالمحافظة على الأصل المسلّم واستخدامه لأغراض العمل الرسمية فقط وإعادته بحالته التشغيلية عند الطلب أو عند إخلاء الطرف.'
  );

  useEffect(() => {
    realErpDataStore.getRecords<Custody>('custodies', INITIAL_CUSTODIES).then((data) => {
      const list = Array.isArray(data) && data.length > 0 ? data : INITIAL_CUSTODIES;
      setCustodies(list.map((item, idx) => normalizeCustodyRecord(item, idx)));
    });
  }, []);

  const defaultCompany = detectActiveSessionEntityCode();
  const [addForm, setAddForm] = useState({
    company_id: defaultCompany,
    item_name: '',
    employee_name: '',
    employee_phone: '',
    employee_email: '',
    location: 'فرع الرياض الرئيسي',
    received_date: new Date().toISOString().slice(0, 10),
    serial_number: '',
    estimated_value: '',
    status: 'في حوزة الموظف' as Custody['status'],
    notes: '',
  });

  const openCreateCustodyModal = () => {
    setEditingCustody(null);
    setAddForm({
      company_id: detectActiveSessionEntityCode(),
      item_name: '',
      employee_name: '',
      employee_phone: '',
      employee_email: '',
      location: 'فرع الرياض الرئيسي',
      received_date: new Date().toISOString().slice(0, 10),
      serial_number: '',
      estimated_value: '',
      status: 'في حوزة الموظف',
      notes: '',
    });
    setShowAddModal(true);
  };

  const openEditCustodyModal = (row: Custody) => {
    setEditingCustody(row);
    setAddForm({
      company_id: normalizeCanonicalEntityCode(row.company_id) || detectActiveSessionEntityCode(),
      item_name: row.item_name,
      employee_name: row.employee_name,
      employee_phone: row.employee_phone || '',
      employee_email: row.employee_email || '',
      location: row.location,
      received_date: row.received_date,
      serial_number: row.serial_number,
      estimated_value: String(row.estimated_value ?? 0),
      status: row.status,
      notes: row.notes || '',
    });
    setShowAddModal(true);
  };

  const openHandoverDocument = (row: Custody) => {
    const resolved = resolveDocumentBranding(row);
    setDocEntityCode(resolved.code);
    setDocHideHoldingGroup(getEntityHideHoldingPreference(resolved.code));
    setSelectedCustodyForDoc(row);
  };

  const handleSaveCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.item_name.trim() || !addForm.employee_name.trim()) return;

    if (editingCustody) {
      const nextRecord: Custody = {
        ...editingCustody,
        company_id: addForm.company_id || 'SAF',
        item_name: addForm.item_name.trim(),
        employee_name: addForm.employee_name.trim(),
        employee_phone: addForm.employee_phone.trim(),
        employee_email: addForm.employee_email.trim(),
        location: addForm.location,
        received_date: addForm.received_date || editingCustody.received_date,
        serial_number: addForm.serial_number.trim() || 'N/A',
        estimated_value: parseFloat(addForm.estimated_value) || 0,
        status: addForm.status,
        notes: addForm.notes.trim(),
      };

      recordFieldLevelChanges({
        tableName: 'custodies',
        recordId: editingCustody.id,
        recordLabel: `${nextRecord.item_name} — ${nextRecord.employee_name}`,
        before: editingCustody,
        after: nextRecord,
        companyId: nextRecord.company_id,
      });

      const updated = await realErpDataStore.updateRecord<Custody>(
        'custodies',
        editingCustody.id,
        nextRecord,
        INITIAL_CUSTODIES
      );
      setCustodies(updated.map((item, idx) => normalizeCustodyRecord(item, idx)));
      addNotification({
        title: 'تحديث بيانات العُهدة',
        message: `تم حفظ تعديلات العُهدة (${nextRecord.item_name}) وتوثيقها في سجل المراجعة.`,
        type: 'success',
      });
    } else {
      const newC: Custody = {
        id: `CUST-0${custodies.length + 1}`,
        company_id: addForm.company_id || 'SAF',
        item_name: addForm.item_name.trim(),
        employee_name: addForm.employee_name.trim(),
        employee_phone: addForm.employee_phone.trim(),
        employee_email: addForm.employee_email.trim(),
        location: addForm.location,
        received_date: addForm.received_date || new Date().toISOString().slice(0, 10),
        serial_number: addForm.serial_number.trim() || 'N/A',
        estimated_value: parseFloat(addForm.estimated_value) || 0,
        status: addForm.status,
        notes: addForm.notes.trim(),
      };

      const updated = await realErpDataStore.addRecord('custodies', newC, INITIAL_CUSTODIES);
      setCustodies(updated.map((item, idx) => normalizeCustodyRecord(item, idx)));
      addNotification({
        title: 'تسليم عهدة جديدة',
        message: `تم تسليم (${addForm.item_name}) للموظف (${addForm.employee_name}) بنجاح.`,
        type: 'success',
      });
    }

    setShowAddModal(false);
    setEditingCustody(null);
  };

  const toggleCustodyStatus = async (id: string) => {
    const target = custodies.find((c) => c.id === id);
    if (!target) return;
    const nextStatus = target.status === 'في حوزة الموظف' ? 'تم الاسترجاع' : 'في حوزة الموظف';
    const updated = await realErpDataStore.updateRecord<Custody>(
      'custodies',
      id,
      { status: nextStatus },
      INITIAL_CUSTODIES
    );
    setCustodies(updated.map((item, idx) => normalizeCustodyRecord(item, idx)));
    addNotification({
      title: 'تحديث حالة العهدة',
      message: `تم تغيير حالة (${target.item_name}) إلى (${nextStatus}).`,
      type: 'info',
    });
  };

  const handleSoftDeleteCustody = async (row: Custody, reason?: string) => {
    archiveRecordBeforeSoftDelete({
      tableName: 'custodies',
      record: row,
      recordTitle: `${row.item_name} — ${row.employee_name} (${row.id})`,
      reason: reason || 'نقل عهدة إلى أرشيف الاستعادة (30 يوماً)',
      companyId: row.company_id || 'SAF',
    });
    await realErpDataStore.deleteRecord('custodies', row.id);
    setCustodies((prev) => prev.filter((c) => c.id !== row.id));
    addNotification({
      title: 'نقل العهدة لسلة المحذوفات',
      message: `تم نقل سجل العهدة #${row.id} إلى أرشيف الاستعادة الآمن لمدة 30 يوماً.`,
      type: 'info',
    });
  };

  const handleRestoreCustody = async (entry: RecycleBinEntry) => {
    if (!entry?.payload) return;
    const restored = normalizeCustodyRecord(entry.payload, custodies.length);
    const updated = await realErpDataStore.addRecord('custodies', restored, INITIAL_CUSTODIES);
    setCustodies(updated.map((item, idx) => normalizeCustodyRecord(item, idx)));
    addNotification({
      title: 'استعادة سجل العهدة',
      message: `تمت استعادة العهدة (${restored.item_name}) بنجاح.`,
      type: 'success',
    });
  };

  const q = searchQuery.toLowerCase();
  const filteredCustodies = custodies.filter(
    (c) =>
      (c.item_name || '').toLowerCase().includes(q) ||
      (c.employee_name || '').toLowerCase().includes(q) ||
      (c.serial_number || '').toLowerCase().includes(q) ||
      (c.company_id || '').toLowerCase().includes(q)
  );

  const activeDocBranding = selectedCustodyForDoc
    ? resolveDocumentBranding(selectedCustodyForDoc, {
        entityCode: docEntityCode,
        hideHoldingGroupBrand: docHideHoldingGroup,
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header Banner — Mobbin Gallery-White Monochrome */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '24px',
          padding: '24px',
          color: '#141414',
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
              <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
                HR ASSETS & CUSTODIES
              </span>
            </div>
            <h1
              className="display-sm"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#141414',
                margin: 0,
              }}
            >
              إدارة عُهد وأصول الموظفين
            </h1>
            <p style={{ fontSize: '13px', color: '#707070', margin: '4px 0 0 0', fontWeight: 500 }}>
              تسليم الأصول، السيارات، الأجهزة الذكية، وتوليد سندات الاستلام الرسمية باسم المنشأة الفعلية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="button-primary-pill"
            onClick={openCreateCustodyModal}
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ تسليم عُهدة جديدة</span>
          </button>
          <button
            type="button"
            className="button-outline-on-light"
            onClick={() => setShowRecycleBin(true)}
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <RotateCcw className="w-3.5 h-3.5 ml-1" />
            <span>سلة المحذوفات</span>
          </button>
          <ExportDropdown
            sectionKey="custodies"
            data={filteredCustodies}
            variant="outline-light"
            customTitle="سجل العُهد والأصول المالية"
            buttonLabel="تصدير سجل العُهد (12 صيغة)"
          />
        </div>
      </div>

      {/* Table Card */}
      <div
        className="card-pricing"
        style={{
          padding: 0,
          borderRadius: '24px',
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث باسم العُهدة، الموظف، الشركة، أو الرقم التسلسلي"
              placeholder="ابحث باسم العُهدة، الموظف، الشركة، أو الرقم التسلسلي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{
                width: '100%',
                height: '36px',
                minHeight: '36px',
                borderRadius: '9999px',
                paddingRight: '36px',
                fontSize: '12px',
              }}
            />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
            العدد: {filteredCustodies.length} عُهدة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#141414]">
            <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="p-3.5">رمز العُهدة</th>
                <th className="p-3.5">اسم العُهدة والرقم التسلسلي</th>
                <th className="p-3.5">الموظف والمنشأة</th>
                <th className="p-3.5">المقر / الفرع</th>
                <th className="p-3.5">القيمة التقديرية</th>
                <th className="p-3.5">تاريخ التسليم</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">التواصل والإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredCustodies.map((row, idx) => {
                const rowEntity = resolveDocumentBranding(row);
                return (
                  <tr key={`${row.id}-${idx}`} className="hover:bg-[#f3f3f3]/60">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.id}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{row.item_name}</div>
                      <div className="text-[11px] text-[#707070] font-mono">
                        S/N: {row.serial_number}
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-[#141414]">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar
                          name={row.employee_name}
                          role={row.location}
                          departmentId="hr"
                          size="sm"
                          status={row.status === 'في حوزة الموظف' ? 'verified' : 'none'}
                        />
                        <div>
                          <div>{row.employee_name}</div>
                          <div className="text-[10px] text-[#707070] font-normal">
                            {rowEntity.entity.shortNameAr} ({rowEntity.code})
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge text={row.location} type="purple" />
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">
                      {(row.estimated_value ?? 0).toLocaleString()} ⃁
                    </td>
                    <td className="p-3.5 font-mono text-[#707070]">{row.received_date}</td>
                    <td className="p-3.5">
                      <Badge
                        text={row.status}
                        type={
                          row.status === 'في حوزة الموظف'
                            ? 'success'
                            : row.status === 'تم الاسترجاع'
                            ? 'purple'
                            : 'warning'
                        }
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          className="button-outline-on-light"
                          style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                          onClick={() => toggleCustodyStatus(row.id)}
                        >
                          <RotateCcw className="w-3 h-3 ml-1" />
                          <span>{row.status === 'في حوزة الموظف' ? 'استرجاع' : 'إعادة تسليم'}</span>
                        </button>
                        <button
                          type="button"
                          className="button-outline-on-light"
                          style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                          onClick={() => openHandoverDocument(row)}
                        >
                          <FileText className="w-3 h-3 ml-1" />
                          <span>سند التسليم</span>
                        </button>
                        <RecordQuickActions
                          sharePayload={{
                            title: `سند عهدة أصل وظيفي (${row.item_name})`,
                            recipientName: row.employee_name,
                            recipientPhone: row.employee_phone,
                            recipientEmail: row.employee_email,
                            referenceNumber: row.id,
                            entityOrRecord: row,
                            moduleName: 'إدارة العُهد والأصول',
                            summaryLines: [
                              { label: 'الأصل المسلّم', value: row.item_name },
                              { label: 'الرقم التسلسلي', value: row.serial_number },
                              {
                                label: 'القيمة التقديرية',
                                value: `${(row.estimated_value ?? 0).toLocaleString()} ⃁`,
                              },
                              { label: 'الحالة', value: row.status },
                            ],
                          }}
                          onEdit={() => openEditCustodyModal(row)}
                          onDelete={(reason) => void handleSoftDeleteCustody(row, reason)}
                          deleteConfirmTitle={`نقل عهدة (${row.item_name}) للموظف (${row.employee_name}) إلى سلة الاستعادة؟`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Custody Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-y-auto font-sans max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2 m-0">
                <Vault className="w-4 h-4 text-[#141414]" />
                <span>
                  {editingCustody
                    ? `تعديل بيانات العُهدة (${editingCustody.id})`
                    : 'تسليم عُهدة جديدة لموظف'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustody} className="p-6 space-y-4 bg-[#ffffff] text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  المنشأة المالكة للأصل (الشركة المصدرة للسند) *
                </label>
                <select
                  value={addForm.company_id}
                  onChange={(e) => setAddForm({ ...addForm, company_id: e.target.value as any })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  {ALL_ENTITY_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.labelAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  اسم الأصل / العُهدة *
                </label>
                <input
                  type="text"
                  placeholder="مثال: لاب توب، سيارة، هاتف..."
                  value={addForm.item_name}
                  onChange={(e) => setAddForm({ ...addForm, item_name: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    اسم الموظف المستلم *
                  </label>
                  <input
                    type="text"
                    placeholder="الاسم الثلاثي..."
                    value={addForm.employee_name}
                    onChange={(e) => setAddForm({ ...addForm, employee_name: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    الرقم التسلسلي (S/N)
                  </label>
                  <input
                    type="text"
                    placeholder="Serial Number..."
                    value={addForm.serial_number}
                    onChange={(e) => setAddForm({ ...addForm, serial_number: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    جوال الموظف (لإرسال السند عبر واتساب)
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="05xxxxxxxx"
                    value={addForm.employee_phone}
                    onChange={(e) => setAddForm({ ...addForm, employee_phone: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    البريد الإلكتروني للموظف
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    placeholder="emp@company.sa"
                    value={addForm.employee_email}
                    onChange={(e) => setAddForm({ ...addForm, employee_email: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    القيمة التقديرية (⃁)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={addForm.estimated_value}
                    onChange={(e) => setAddForm({ ...addForm, estimated_value: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    تاريخ الاستلام
                  </label>
                  <input
                    type="date"
                    value={addForm.received_date}
                    onChange={(e) => setAddForm({ ...addForm, received_date: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    الحالة التشغيلية
                  </label>
                  <select
                    value={addForm.status}
                    onChange={(e) =>
                      setAddForm({ ...addForm, status: e.target.value as Custody['status'] })
                    }
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="في حوزة الموظف">في حوزة الموظف</option>
                    <option value="تم الاسترجاع">تم الاسترجاع</option>
                    <option value="صيانة">صيانة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  المقر المخصص
                </label>
                <select
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>فرع الرياض الرئيسي</option>
                  <option>فرع جدة</option>
                  <option>فرع مطار الملك خالد</option>
                  <option>مقر الإدارة العليا</option>
                  <option>مركز الإيواء - الرمال</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                  onClick={() => setShowAddModal(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  {editingCustody ? 'حفظ التعديلات' : 'تسليم الأصل وحفظ العُهدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Handover Document Modal — Dynamic Entity Branding & Standalone Print */}
      {selectedCustodyForDoc && activeDocBranding && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          data-printable-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustodyForDoc(null);
          }}
        >
          <div className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-y-auto font-sans max-h-[92vh]">
            {/* Top Controls (hidden during print) */}
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#141414]" />
                <select
                  value={docEntityCode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDocEntityCode(next);
                    setDocHideHoldingGroup(getEntityHideHoldingPreference(next));
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  {ALL_ENTITY_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.labelAr}
                    </option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-[#141414] bg-[#ffffff] px-3 py-1.5 rounded-full border border-[#e0e0e0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={docHideHoldingGroup}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDocHideHoldingGroup(checked);
                    setEntityHideHoldingPreference(docEntityCode, checked);
                  }}
                />
                <span>إلغاء جملة مجموعة خالد السليم (هوية مستقلة)</span>
              </label>

              <button
                type="button"
                onClick={() => setSelectedCustodyForDoc(null)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable A4 Sheet */}
            <div className="erp-printable-sheet p-7 space-y-5 bg-[#ffffff] text-[#141414]">
              <div className="flex items-start justify-between border-b-2 border-[#141414] pb-4 gap-4">
                <div>
                  <div className="text-[11px] font-bold text-[#707070]">
                    {activeDocBranding.letterheadSovereignLineAr}
                  </div>
                  <h3 className="font-black text-lg text-[#141414] m-0 mt-0.5">
                    {activeDocBranding.displayNameAr}
                  </h3>
                  <div className="text-[11px] text-[#707070] font-mono mt-1">
                    س.ت: {activeDocBranding.crNumber} | الرقم الضريبي: {activeDocBranding.taxNumber}
                  </div>
                </div>
                <div className="text-left">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>سند تسلم واستلام عُهدة رسمي</span>
                  </span>
                  <div className="text-[11px] font-mono text-[#707070] mt-1.5">
                    المرجع: {activeDocBranding.qrVerifyNamespace}-{selectedCustodyForDoc.id}
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#141414] leading-relaxed m-0">
                أقر أنا الموظف /{' '}
                <strong className="text-[#141414]">{selectedCustodyForDoc.employee_name}</strong>{' '}
                العامل لدى <strong>{activeDocBranding.displayNameAr}</strong> بأنني استلمت العُهدة
                المبينة أدناه بحالة تشغيلية سليمة:
              </p>

              <div className="p-4 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <strong>اسم الأصل / العُهدة:</strong> {selectedCustodyForDoc.item_name}
                </div>
                <div>
                  <strong>الرقم التسلسلي:</strong>{' '}
                  <span className="font-mono">{selectedCustodyForDoc.serial_number}</span>
                </div>
                <div>
                  <strong>تاريخ الاستلام:</strong>{' '}
                  <span className="font-mono">{selectedCustodyForDoc.received_date}</span>
                </div>
                <div>
                  <strong>القيمة التقديرية:</strong>{' '}
                  <span className="font-mono font-bold text-[#141414]">
                    {(selectedCustodyForDoc.estimated_value ?? 0).toLocaleString()} ⃁
                  </span>
                </div>
                <div>
                  <strong>المقر / الفرع:</strong> {selectedCustodyForDoc.location}
                </div>
                <div>
                  <strong>الحالة المسجلة:</strong> {selectedCustodyForDoc.status}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1 print:hidden">
                  نص الإقرار النظامي (قابل للتحرير قبل الطباعة):
                </label>
                <textarea
                  rows={2}
                  value={docCustomClause}
                  onChange={(e) => setDocCustomClause(e.target.value)}
                  className="w-full rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] p-3 text-xs text-[#141414] leading-relaxed print:bg-transparent print:border-none print:p-0 print:resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-6 pt-5 border-t border-dashed border-[#e0e0e0] text-xs text-[#141414]">
                <div>
                  <div className="font-bold">توقيع الموظف المستلم</div>
                  <div className="text-[#707070] mt-1">{selectedCustodyForDoc.employee_name}</div>
                  <div className="mt-4 text-[#707070]">التوقيع: ________________________</div>
                </div>
                <div>
                  <div className="font-bold">{activeDocBranding.hrIssuerTitleAr}</div>
                  <div className="text-[#707070] mt-1">{activeDocBranding.hrSignatoryNameAr}</div>
                  <div className="mt-4 text-[#707070]">الختم والتوقيع: __________________</div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#e0e0e0] text-[10px] text-[#707070] flex items-center justify-between">
                <span>{activeDocBranding.footerOrganizationLineAr}</span>
                <span className="font-mono">{activeDocBranding.phone}</span>
              </div>
            </div>

            {/* Bottom Action Bar (hidden during print) */}
            <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3 print:hidden">
              <RecordQuickActions
                showLabels
                sharePayload={{
                  title: `سند تسلم عُهدة رسمي (${selectedCustodyForDoc.id})`,
                  recipientName: selectedCustodyForDoc.employee_name,
                  recipientPhone: selectedCustodyForDoc.employee_phone,
                  recipientEmail: selectedCustodyForDoc.employee_email,
                  referenceNumber: selectedCustodyForDoc.id,
                  entityCode: activeDocBranding.code,
                  hideHoldingGroupBrand: activeDocBranding.hideHoldingGroupBrand,
                  moduleName: 'العُهد والأصول',
                  summaryLines: [
                    { label: 'الأصل', value: selectedCustodyForDoc.item_name },
                    { label: 'الرقم التسلسلي', value: selectedCustodyForDoc.serial_number },
                    {
                      label: 'القيمة التقديرية',
                      value: `${(selectedCustodyForDoc.estimated_value ?? 0).toLocaleString()} ⃁`,
                    },
                  ],
                  bodyText: docCustomClause,
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '12.5px' }}
                  onClick={() => setSelectedCustodyForDoc(null)}
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '12.5px' }}
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 ml-1" />
                  <span>طباعة السند A4 / PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RecycleBinModal
        isOpen={showRecycleBin}
        onClose={() => setShowRecycleBin(false)}
        tableNameFilter="custodies"
        onRestoreEntry={(entry) => void handleRestoreCustody(entry)}
      />
    </div>
  );
};

export default CustodiesPage;
