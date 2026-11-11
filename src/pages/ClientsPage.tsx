import React, { useState, useEffect } from 'react';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useClients, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { authService } from '../services/authService';
import { 
  UserCheck, Plus, FileSpreadsheet, FileText, Printer, Search, 
  Upload, X, Check, MessageSquare, ShieldAlert, Trash2, Edit,
  Phone, UserX, UserPlus, Filter
} from 'lucide-react';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';

export const ClientsPage: React.FC = () => {
  const { data: clients = [], isLoading } = useClients();
  const { createItem, updateItem, deleteItem } = useTableMutation('clients');
  const { activeCompanyId } = useCompany();
  const { setActiveTab, addNotification } = useAppStore();

  const storeActiveTab = useAppStore(state => state.activeTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'blacklist' | 'person' | 'company'>(() => {
    if (storeActiveTab === 'client-blacklist' || storeActiveTab === 'black-list') return 'blacklist';
    if (storeActiveTab === 'client-categories') return 'company';
    return 'all';
  });
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'new-client');
  const [editingClient, setEditingClient] = useState<any | null>(null);

  useEffect(() => {
    if (storeActiveTab === 'client-blacklist' || storeActiveTab === 'black-list') {
      setActiveFilter('blacklist');
    } else if (storeActiveTab === 'client-categories') {
      setActiveFilter('company');
    } else if (storeActiveTab === 'new-client') {
      setShowAddModal(true);
    } else if (storeActiveTab === 'clients') {
      setActiveFilter('all');
    }
  }, [storeActiveTab]);

  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    national_id: '',
    branch: 'فرع الرياض الرئيسي',
    type: 'شخص',
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.phone || !addForm.national_id) return;

    const newRecord = {
      id: `CLI-2026-${String(242 + clients.length).padStart(4, '0')}`,
      company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
      client_no: `CLI-2026-${String(242 + clients.length).padStart(4, '0')}`,
      name: addForm.name,
      phone: addForm.phone,
      national_id: addForm.national_id,
      account_code: `11020${clients.length + 5}`,
      client_activity: 'عميل جديد - بانتظار التعاقد',
      last_activity: 'إنشاء ملف العميل بالنظام',
      added_by: authService.getCurrentUser()?.full_name || 'موظف علاقات العملاء',
      branch: addForm.branch,
      type: addForm.type,
      status: 'نشط',
    };

    await createItem.mutateAsync(newRecord);
    addNotification({
      title: 'إضافة عميل جديد',
      message: `تم تسجيل العميل (${addForm.name}) بنجاح وربطه بالدليل المحاسبي.`,
      type: 'success',
    });
    setShowAddModal(false);
    setAddForm({ name: '', phone: '', national_id: '', branch: 'فرع الرياض الرئيسي', type: 'شخص' });
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    await updateItem.mutateAsync({
      id: editingClient.id,
      data: editingClient,
    });
    addNotification({
      title: 'تحديث بيانات العميل',
      message: `تم تحديث ملف العميل (${editingClient.name}) بنجاح.`,
      type: 'info',
    });
    setEditingClient(null);
  };

  const handleToggleBlacklist = async (client: any) => {
    const isBanned = client.status === 'محظور';
    const newStatus = isBanned ? 'نشط' : 'محظور';
    await updateItem.mutateAsync({
      id: client.id,
      data: { status: newStatus },
    });
    addNotification({
      title: isBanned ? 'إلغاء حظر العميل' : 'إدراج العميل بالقائمة المحظورة',
      message: `تم تعديل حالة العميل (${client.name}) إلى (${newStatus}).`,
      type: isBanned ? 'success' : 'warning',
    });
  };

  const handleDeleteClient = async (client: any) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف ملف العميل (${client.name}) نهائياً؟`)) {
      await deleteItem.mutateAsync(client.id);
      addNotification({
        title: 'حذف العميل',
        message: `تم حذف ملف العميل (${client.name}) بنجاح.`,
        type: 'error',
      });
    }
  };

  const filteredClients = clients.filter((c: any) => {
    const matchesSearch =
      (c.client_no && c.client_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.name && c.name.includes(searchQuery)) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.national_id && c.national_id.includes(searchQuery));

    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'active' && c.status !== 'محظور') ||
      (activeFilter === 'blacklist' && c.status === 'محظور') ||
      (activeFilter === 'person' && c.type === 'شخص') ||
      (activeFilter === 'company' && c.type === 'شركة');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
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
          <div className="hidden sm:block">
            <BusinessIllustration
              type="crm-customer"
              size="sm"
              showBackground={false}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>CRM & CLIENT DIRECTORY</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة العملاء والعلاقات (CRM)
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              سجل العملاء المعتمد المربوط بالدليل المحاسبي، عقود الاستقدام، والتأجير والواتساب
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="button-white-pill"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>إضافة عميل جديد</span>
          </button>

          <button
            className="button-outline-on-dark"
            onClick={() => setActiveTab('data-import', 'معالج استيراد البيانات الشامل (Excel / CSV)')}
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <Upload className="w-4 h-4 ml-1 text-[#141414]" />
            <span>استيراد Excel</span>
          </button>

          <ExportDropdown
            sectionKey="clients"
            data={filteredClients}
            customTitle={`سجل العملاء وإدارة علاقات العملاء (CRM) - ${activeCompanyId}`}
            variant="outline-dark"
            buttonLabel="تصدير وطباعة العملاء (10 صيغ)"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي العملاء الموثقين</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {clients.length > 0 ? clients.length : 241} عميلاً
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>مربوط بالدليل المحاسبي</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>عملاء العقود السارية</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>198 عميلاً</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>استقدام وتأجير</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>القائمة المحظورة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#e11d48', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {clients.filter((c: any) => c.status === 'محظور').length} عملاء
          </div>
          <span className="pill-tag-shade text-[#141414]" style={{ fontSize: '11px', marginTop: '10px' }}>ممنوع من التعاقد</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        {/* Sub-Filters and Search */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'all' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              جميع العملاء ({clients.length})
            </button>

            <button
              onClick={() => setActiveFilter('active')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'active' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              عملاء نشطون ({clients.filter((c: any) => c.status !== 'محظور').length})
            </button>

            <button
              onClick={() => setActiveFilter('blacklist')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'blacklist' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              القائمة المحظورة ({clients.filter((c: any) => c.status === 'محظور').length})
            </button>

            <button
              onClick={() => setActiveFilter('person')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'person' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              أفراد
            </button>

            <button
              onClick={() => setActiveFilter('company')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'company' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              شركات ومؤسسات
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث برقم العميل، الاسم، الجوال"
              placeholder="ابحث برقم العميل، الاسم، الجوال..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414] focus:border-[#141414] outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم العميل</th>
                <th className="p-3.5">الاسم والبيانات</th>
                <th className="p-3.5">الحساب المحاسبي</th>
                <th className="p-3.5">النشاط الحالي</th>
                <th className="p-3.5">الفرع</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#707070]">
                    جاري استرجاع سجلات العملاء المباشرة...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#707070]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BusinessIllustration type="empty-search" size="md" />
                      <span className="font-bold text-[#141414]">لا يوجد عملاء مطابقين لمعايير البحث</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">
                      {c.client_no || c.client_number || `#${String(c.id).slice(0, 8)}`}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={c.name}
                          type={c.type === 'شركة' ? 'client-b2b' : 'client-vip'}
                          size="sm"
                          status={c.status === 'محظور' ? undefined : 'verified'}
                        />
                        <div>
                          <div className="font-bold text-[#141414]">{c.name}</div>
                          <div className="text-[11px] text-[#707070] font-mono mt-0.5">
                            {c.phone} • هوية:{' '}
                            {c.national_id && String(c.national_id).length >= 6
                              ? `${String(c.national_id).slice(0, 2)}••••••${String(c.national_id).slice(-2)}`
                              : c.national_id || 'غير مسجلة'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-600 font-bold">
                      {c.account_code || '110201'}
                    </td>
                    <td className="p-3.5 font-semibold text-zinc-800">
                      {c.client_activity || 'عميل مسجل'}
                    </td>
                    <td className="p-3.5">
                      <span className="pill-tag-shade text-[11px]">{c.branch || 'الفرع الرئيسي'}</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        c.status === 'محظور'
                          ? 'bg-[#f3f3f3] text-[#141414]'
                          : 'bg-[#f3f3f3] text-[#141414]'
                      }`}>
                        {c.status || 'نشط'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* WhatsApp Link */}
                        <a
                          href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-full hover:bg-[#eaeaea] text-[#141414] transition-colors"
                          title="محادثة واتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingClient({ ...c })}
                          className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
                          title="تعديل بيانات العميل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Blacklist */}
                        <button
                          onClick={() => handleToggleBlacklist(c)}
                          className={`p-1.5 rounded-full transition-colors ${
                            c.status === 'محظور'
                              ? 'hover:bg-[#eaeaea] text-[#141414]'
                              : 'hover:bg-[#eaeaea] text-[#141414]'
                          }`}
                          title={c.status === 'محظور' ? 'إلغاء الحظر' : 'حظر العميل'}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClient(c)}
                          className="p-1.5 rounded-full hover:bg-[#eaeaea] text-[#707070] hover:text-[#141414] transition-colors"
                          title="حذف العميل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#141414]" />
                <span>تسجيل عميل جديد بالدليل المحاسبي</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل بالكامل *</label>
                <input
                  type="text"
                  placeholder="الاسم الثلاثي أو اسم الشركة..."
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    placeholder="+9665..."
                    value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الهوية / السجل *</label>
                  <input
                    type="text"
                    placeholder="10 أرقام..."
                    value={addForm.national_id}
                    onChange={e => setAddForm({ ...addForm, national_id: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع العميل</label>
                <select
                  value={addForm.type}
                  onChange={e => setAddForm({ ...addForm, type: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="شخص">فرد (مواطن / مقيم)</option>
                  <option value="شركة">شركة / منشأة تجارية</option>
                  <option value="جهة حكومية">جهة حكومية / شبه حكومية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المربوط *</label>
                <select
                  value={addForm.branch}
                  onChange={e => setAddForm({ ...addForm, branch: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>فرع الرياض الرئيسي</option>
                  <option>فرع جدة</option>
                  <option>فرع الخبر</option>
                  <option>الإدارة العامة</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" onClick={() => setShowAddModal(false)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  <Check className="w-4 h-4 ml-1" />
                  <span>إنشاء الحساب وحفظ العميل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#141414]" />
                <span>تعديل بيانات العميل #{editingClient.client_no || editingClient.id}</span>
              </h3>
              <button onClick={() => setEditingClient(null)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الجوال</label>
                  <input
                    type="text"
                    value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الهوية</label>
                  <input
                    type="text"
                    value={editingClient.national_id || ''}
                    onChange={e => setEditingClient({ ...editingClient, national_id: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المربوط</label>
                <input
                  type="text"
                  value={editingClient.branch || ''}
                  onChange={e => setEditingClient({ ...editingClient, branch: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" onClick={() => setEditingClient(null)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  <Check className="w-4 h-4 ml-1" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
