import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useOrders, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { 
  ShoppingBag, Plus, FileSpreadsheet, FileText, Search, Clock, 
  CheckCheck, Eye, X, ArrowLeft, Trash2, Edit, AlertTriangle, 
  Sparkles, Filter, Check, MessageCircle
} from 'lucide-react';
import { realErpDataStore } from '../services/realErpDataStore';
import { journalEngine } from '../services/accounting/journalEngine';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface OrderRecord {
  id: string;
  company_id: string;
  client_id?: string;
  client_name: string;
  client_phone: string;
  maid_name?: string;
  nationality?: string;
  passport_number?: string;
  request_type: 'معروفة' | 'معينة' | 'حسب المواصفات';
  status: 'جديد' | 'تحت الإجراء' | 'تم التعاقد' | 'ملغي';
  timer_status: 'عادي' | 'حرج' | 'منتهي';
  deadline: string;
  contract_status: 'بدون عقد' | 'تم التعاقد';
  responsible_employee?: string;
  branch: string;
  office_name?: string;
  notes?: string;
  total_amount?: number;
  created_at: string;
}

const DEFAULT_MOCK_ORDERS: OrderRecord[] = [
  {
    id: 'ORD-2026-001',
    company_id: 'SAF',
    client_name: 'بندر صالح الهويريني',
    client_phone: '+966555774494',
    maid_name: 'KIMBERLY (سيرة ذاتية مختارة)',
    nationality: 'الفلبين',
    passport_number: 'P882910',
    request_type: 'معينة',
    status: 'جديد',
    timer_status: 'عادي',
    deadline: '24 ساعة',
    contract_status: 'بدون عقد',
    responsible_employee: 'فهد العتيبي (مسوق)',
    branch: 'فرع الرياض الرئيسي',
    office_name: "PLATINUM BROTHERS INT'L",
    created_at: new Date().toISOString(),
  },
  {
    id: 'ORD-2026-002',
    company_id: 'SAF',
    client_name: 'سارة خالد الدوسري',
    client_phone: '+966559876543',
    maid_name: 'طلب عمالة إثيوبية مواصفات خاصة',
    nationality: 'إثيوبيا',
    passport_number: 'PENDING',
    request_type: 'حسب المواصفات',
    status: 'تحت الإجراء',
    timer_status: 'حرج',
    deadline: '12 ساعة',
    contract_status: 'بدون عقد',
    responsible_employee: 'فهد العتيبي (مسوق)',
    branch: 'فرع الرياض الرئيسي',
    office_name: 'DAMAS FOREIGN AGENCY',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ORD-2026-003',
    company_id: 'SAF',
    client_name: 'محمد عبدالله العتيبي',
    client_phone: '+966551234567',
    maid_name: 'FLORENCE NABATANZI',
    nationality: 'أوغندا',
    passport_number: 'UG99281',
    request_type: 'معروفة',
    status: 'تم التعاقد',
    timer_status: 'عادي',
    deadline: 'منتهي',
    contract_status: 'تم التعاقد',
    responsible_employee: 'سارة خالد (خدمة عملاء)',
    branch: 'فرع جدة',
    office_name: 'JAKARTA GLOBAL AGENCY',
    created_at: new Date().toISOString(),
  },
  {
    id: 'ORD-2026-004',
    company_id: 'SAF',
    client_name: 'نورة سعد القحطاني',
    client_phone: '+966504433221',
    maid_name: 'طلب ملغي بناءً على رغبة العميل',
    nationality: 'الفلبين',
    passport_number: 'CANCELLED',
    request_type: 'حسب المواصفات',
    status: 'ملغي',
    timer_status: 'منتهي',
    deadline: 'ملغي',
    contract_status: 'بدون عقد',
    responsible_employee: 'فهد العتيبي (مسوق)',
    branch: 'فرع الرياض الرئيسي',
    office_name: "PLATINUM BROTHERS INT'L",
    created_at: new Date().toISOString(),
  },
];

export const OrdersPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawOrders = [], isLoading } = useOrders();
  const { createItem, updateItem, deleteItem } = useTableMutation('orders');
  const { addNotification, setActiveTab } = useAppStore();

  const orders: OrderRecord[] =
    rawOrders.length > 0
      ? (rawOrders as OrderRecord[])
      : activeCompanyId === 'all'
        ? DEFAULT_MOCK_ORDERS
        : DEFAULT_MOCK_ORDERS.filter((o: any) => !o.company_id || o.company_id === activeCompanyId);

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedFilter = (tabKey: string) => {
    switch (tabKey) {
      case 'new-orders': return 'new';
      case 'completed-orders':
      case 'contracted-orders': return 'contracted';
      case 'cancelled-orders': return 'cancelled';
      case 'incomplete-orders': return 'incomplete';
      case 'urgent-orders': return 'urgent';
      case 'professional-requests': return 'professional';
      case 'special-requests': return 'special';
      case 'renew-contracts': return 'renew';
      case 'known-service': return 'known';
      case 'contact-requests': return 'contact';
      default: return 'all';
    }
  };

  const [activeFilter, setActiveFilter] = useState(() => getMappedFilter(storeActiveTab));

  useEffect(() => {
    setActiveFilter(getMappedFilter(storeActiveTab));
    if (storeActiveTab === 'create-order') {
      setShowAddModal(true);
    }
  }, [storeActiveTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'create-order');
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);

  // Add Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [maidName, setMaidName] = useState('');
  const [nationality, setNationality] = useState('الفلبين');
  const [requestType, setRequestType] = useState<'معروفة' | 'معينة' | 'حسب المواصفات'>('حسب المواصفات');
  const [officeName, setOfficeName] = useState("PLATINUM BROTHERS INT'L");
  const [branch, setBranch] = useState('فرع الرياض الرئيسي');

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) return;

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const id = `ORD-2026-${String(orders.length + 1).padStart(3, '0')}`;

    const newRecord = {
      id,
      company_id: companyCode,
      client_name: clientName,
      client_phone: clientPhone,
      maid_name: maidName || 'حسب المواصفات المختارة',
      nationality,
      passport_number: 'PENDING',
      request_type: requestType,
      status: 'جديد',
      timer_status: 'عادي',
      deadline: '24 ساعة',
      contract_status: 'بدون عقد',
      responsible_employee: 'عبد الفتاح (مشرف عام)',
      branch,
      office_name: officeName,
      created_at: new Date().toISOString(),
    };

    await createItem.mutateAsync(newRecord);
    addNotification({
      title: 'إنشاء طلب استقدام جديد',
      message: `تم تسجيل الطلب #${id} للعميل (${clientName}) بنجاح وبدء مؤقت الـ SLA.`,
      type: 'success',
    });
    setShowAddModal(false);
    setClientName('');
    setClientPhone('');
    setMaidName('');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    await updateItem.mutateAsync({
      id: editingOrder.id,
      data: editingOrder,
    });
    addNotification({
      title: 'تحديث بيانات الطلب',
      message: `تم حفظ تعديلات الطلب #${editingOrder.id} بنجاح.`,
      type: 'info',
    });
    setEditingOrder(null);
  };

  const handleConvertToContract = async (order: OrderRecord) => {
    // 1. Update order status
    await updateItem.mutateAsync({
      id: order.id,
      data: {
        status: 'تم التعاقد',
        contract_status: 'تم التعاقد',
      },
    });

    // 2. Persist new contract into 'contracts' table via realErpDataStore
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const contractNumber = `${companyCode}-RC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const musanedNumber = `MSN-${Date.now().toString().slice(-6)}`;
    const amt = order.total_amount || 14500;
    const tax = amt * 0.15;
    const totalWithTax = amt + tax;

    const newContract = {
      id: contractNumber,
      company_id: companyCode,
      contract_number: contractNumber,
      musaned_number: musanedNumber,
      client_name: order.client_name,
      client_phone: order.client_phone,
      client_national_id: '10' + Date.now().toString().slice(-8),
      client_type: 'شخص' as const,
      delivery_city: 'الرياض',
      maid_name: order.maid_name || 'عاملة مختارة',
      nationality: order.nationality || 'الفلبين',
      external_office: order.office_name || "PLATINUM BROTHERS INT'L",
      amount: amt,
      tax_amount: tax,
      total_amount: totalWithTax,
      stage: 'عقود جديدة' as const,
      warranty_status: 'ساري (90 يوماً)',
      payment_status: 'تم التحصيل',
      branch: order.branch || 'فرع الرياض الرئيسي',
      created_at: new Date().toISOString(),
    };

    await realErpDataStore.addRecord('contracts', newContract);

    // 3. Automatically generate ZATCA Phase 2 Tax Invoice
    const newInvoice = {
      id: `INV-${Date.now()}`,
      company_id: companyCode,
      branch_code: 'HQ-RUH',
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      client_name: order.client_name,
      subtotal: amt,
      vat_amount: tax,
      total_amount: totalWithTax,
      zatca_status: 'CLEARED',
      qr_code_tlv: btoa(`INV-${order.client_name}-${totalWithTax}`),
      invoice_hash: 'sha256-' + Date.now().toString(16),
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('zatca_company_invoices', newInvoice);

    // 4. Automatically generate Cash/Bank Receipt Voucher
    const newVoucher = {
      id: `VOUCH-${Date.now()}`,
      voucher_no: `RCP-${Date.now().toString().slice(-6)}`,
      type: 'سند قبض',
      payee_payer: order.client_name,
      treasury: 'حساب بنك الراجحي - السفير الماسي',
      amount: totalWithTax,
      status: 'معتمد',
      description: `تحصيل قيمة عقد الاستقدام #${contractNumber} مساند (${order.client_name})`,
      payment_method: 'مدى / سداد',
      company_id: companyCode,
      branch: order.branch || 'فرع الرياض الرئيسي',
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('vouchers', newVoucher);

    // 5. Automatically post balanced double-entry Journal Entry
    const newJournal = {
      id: `JV-${Date.now()}`,
      company_id: companyCode,
      entry_number: `JV-${companyCode}-${Date.now().toString().slice(-6)}`,
      entry_date: new Date().toISOString().slice(0, 10),
      entry_type: 'AUTOMATIC',
      source_module: 'CONTRACT',
      source_reference: contractNumber,
      description: `إثبات إيراد عقد استقدام مساند #${contractNumber} - العميل (${order.client_name})`,
      total_debit: totalWithTax,
      total_credit: totalWithTax,
      status: 'POSTED',
      branch_name: order.branch || 'فرع الرياض الرئيسي',
      cost_center_code: 'CC-OPS-01',
      created_by: 'النظام المحاسبي الآلي',
      approved_by: 'مدير الحسابات',
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('company_journal_entries', newJournal);

    journalEngine.autoPostOperationalTransaction({
      companyId: companyCode as any,
      transactionType: 'RECRUITMENT_CONTRACT',
      referenceNumber: contractNumber,
      description: newJournal.description,
      amount: amt,
      amountIncludesVat: false,
      vatRate: 0.15,
      paymentChannel: 'ESCROW',
      branchName: order.branch || 'فرع الرياض الرئيسي',
      costCenterCode: 'CC-OPS-01',
      createdBy: 'النظام المحاسبي الآلي',
    });

    addNotification({
      title: 'تحويل الطلب إلى عقد مساند متكامل',
      message: `تم تحويل الطلب بنجاح إلى عقد #${contractNumber} وتوليد الفاتورة الضريبية ZATCA وسند القبض #${newVoucher.voucher_no} وترحيل القيد المحاسبي آلياً.`,
      type: 'success',
    });
  };

  const handleDeleteOrder = async (order: OrderRecord) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف الطلب #${order.id}؟`)) {
      await deleteItem.mutateAsync(order.id);
      addNotification({
        title: 'حذف الطلب',
        message: `تم حذف الطلب #${order.id} بنجاح.`,
        type: 'error',
      });
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.client_name.includes(searchQuery) ||
      ord.client_phone.includes(searchQuery) ||
      (ord.maid_name && ord.maid_name.includes(searchQuery));

    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'new' && ord.status === 'جديد') ||
      (activeFilter === 'contracted' && (ord.contract_status === 'تم التعاقد' || ord.status === 'تم التعاقد')) ||
      (activeFilter === 'cancelled' && ord.status === 'ملغي') ||
      (activeFilter === 'incomplete' && (ord.timer_status === 'حرج' || ord.status === 'تحت الإجراء')) ||
      (activeFilter === 'urgent' && ord.timer_status === 'حرج') ||
      (activeFilter === 'renew' && (ord.request_type?.includes('تجديد') || ord.notes?.includes('تجديد') || ord.status === 'تحت الإجراء')) ||
      (activeFilter === 'professional' && ord.request_type === 'معينة') ||
      (activeFilter === 'special' && ord.request_type === 'حسب المواصفات') ||
      (activeFilter === 'known' && ord.request_type === 'معروفة');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
        <div className="flex items-center gap-4">
          <BusinessIllustration type="musaned-recruitment" size="sm" />
          <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>ORDERS & SLA PIPELINE</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة طلبات العملاء والعمليات
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              متابعة طلبات الاستقدام الجديدة، مؤقتات الـ SLA، والتحويل إلى عقود مساند لـ {activeCompany.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>تسجيل طلب جديد</span>
          </button>

          <ExportDropdown 
            sectionKey="orders" 
            data={filteredOrders} 
            variant="outline-dark" 
            customTitle="تقرير طلبات واستفسارات الاستقدام" 
          />
        </div>
      </div>

      {/* SLA Metric Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي الطلبات المسجلة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {orders.length} طلبات
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>مؤشر SLA مباشر</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>طلبات بانتظار التعاقد</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {orders.filter(o => o.contract_status !== 'تم التعاقد').length} طلب
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>جاهز للتحويل لعقد</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>طلبات حرجة (مهلة قريبة)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {orders.filter(o => o.timer_status === 'حرج').length} طلب
          </div>
          <span className="pill-tag-shade text-[#141414]" style={{ fontSize: '11px', marginTop: '10px' }}>تنبيه SLA</span>
        </div>
      </div>

      {/* Main Table with Filter Pills */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'all' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              جميع الطلبات ({orders.length})
            </button>

            <button
              onClick={() => setActiveFilter('new')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'new' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              طلبات جديدة ({orders.filter(o => o.status === 'جديد').length})
            </button>

            <button
              onClick={() => setActiveFilter('urgent')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'urgent' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              طلبات عاجلة SLA ({orders.filter(o => o.timer_status === 'حرج').length})
            </button>

            <button
              onClick={() => setActiveFilter('contracted')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'contracted' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              الطلبات المكتملة ({orders.filter(o => o.contract_status === 'تم التعاقد' || o.status === 'تم التعاقد').length})
            </button>

            <button
              onClick={() => setActiveFilter('cancelled')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'cancelled' ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              الطلبات الملغاة ({orders.filter(o => o.status === 'ملغي').length})
            </button>

            <button
              onClick={() => setActiveFilter('known')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'known' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              معروفة
            </button>

            <button
              onClick={() => setActiveFilter('professional')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeFilter === 'professional' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              معينة بالاسم
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث برقم الطلب، العميل، العاملة"
              placeholder="ابحث برقم الطلب، العميل، العاملة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414] focus:border-[#141414] outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم الطلب</th>
                <th className="p-3.5">بيانات العميل</th>
                <th className="p-3.5">المواصفات والجنسية</th>
                <th className="p-3.5">المكتب الخارجي</th>
                <th className="p-3.5">نوع الطلب</th>
                <th className="p-3.5">مهلة المعالجة</th>
                <th className="p-3.5">حالة العقد</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#707070]">
                    جاري استرجاع الطلبات...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#707070]">
                    لا توجد طلبات مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">#{ord.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={ord.client_name} isClient size="sm" />
                        <div>
                          <div className="font-bold text-[#141414]">{ord.client_name}</div>
                          <div className="text-[#707070] font-mono">{ord.client_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={ord.maid_name} profession={ord.request_type || 'عاملة منزلية'} isCandidate size="sm" />
                        <div>
                          <div className="font-bold text-[#141414]">{ord.maid_name}</div>
                          <div className="text-[#707070]">{ord.nationality}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-zinc-600 font-semibold">{ord.office_name || 'مكتب مانيلا'}</td>
                    <td className="p-3.5">
                      <Badge text={ord.request_type} type="purple" />
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-[#141414] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#141414]" />
                        {ord.deadline}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        text={ord.contract_status}
                        type={ord.contract_status === 'تم التعاقد' ? 'success' : 'warning'}
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {ord.contract_status !== 'تم التعاقد' ? (
                          <button
                            onClick={() => handleConvertToContract(ord)}
                            className="button-primary-pill"
                            style={{ padding: '3px 12px', fontSize: '11px', minHeight: '28px' }}
                            title="تحويل مباشر لعقد مساند"
                          >
                            <span>تحويل لعقد</span>
                            <ArrowLeft className="w-3 h-3 mr-1" />
                          </button>
                        ) : (
                          <span className="text-xs text-[#141414] font-bold flex items-center justify-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>موثق</span>
                          </span>
                        )}

                        <a
                          href={`https://wa.me/${ord.client_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`السلام عليكم ورحمة الله، عميلنا العزيز ${ord.client_name} بخصوص طلب الاستقدام الخاص بكم #${ord.id}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-full hover:bg-[#eaeaea] text-[#141414] transition-colors"
                          title="مراسلة العميل عبر واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => setEditingOrder({ ...ord })}
                          className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
                          title="تعديل الطلب"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteOrder(ord)}
                          className="p-1.5 rounded-full hover:bg-[#eaeaea] text-[#707070] hover:text-[#141414] transition-colors"
                          title="حذف الطلب"
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

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#141414]" />
                <span>تسجيل طلب استقدام جديد</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrder} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="اسم العميل الرباعي..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم جوال العميل *</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+9665..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الجنسية المطلوبة</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>الفلبين</option>
                    <option>إندونيسيا</option>
                    <option>إثيوبيا</option>
                    <option>كينيا</option>
                    <option>أوغندا</option>
                    <option>سريلانكا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع الطلب</label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="حسب المواصفات">حسب المواصفات</option>
                    <option value="معينة">معينة بالاسم</option>
                    <option value="معروفة">معروفة لدى العميل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">المكتب الخارجي المعتمد</label>
                <select
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="PLATINUM BROTHERS INT'L">PLATINUM BROTHERS INT'L (الفلبين)</option>
                  <option value="DAMAS FOREIGN AGENCY">DAMAS FOREIGN AGENCY (إثيوبيا)</option>
                  <option value="JAKARTA GLOBAL AGENCY">JAKARTA GLOBAL AGENCY (إندونيسيا)</option>
                  <option value="VERSATILE OVERSEAS">VERSATILE OVERSEAS (كينيا)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المعالج</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>فرع الرياض الرئيسي</option>
                  <option>فرع جدة</option>
                  <option>فرع الخبر</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  <Check className="w-4 h-4 ml-1" />
                  <span>حفظ الطلب وتفعيل SLA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#141414]" />
                <span>تعديل بيانات الطلب #{editingOrder.id}</span>
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrder} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  value={editingOrder.client_name}
                  onChange={(e) => setEditingOrder({ ...editingOrder, client_name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الجوال</label>
                  <input
                    type="text"
                    value={editingOrder.client_phone}
                    onChange={(e) => setEditingOrder({ ...editingOrder, client_phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">حالة الطلب</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="جديد">جديد</option>
                    <option value="تحت الإجراء">تحت الإجراء</option>
                    <option value="تم التعاقد">تم التعاقد</option>
                    <option value="ملغي">ملغي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">مؤقت المهلة (Deadline)</label>
                <input
                  type="text"
                  value={editingOrder.deadline}
                  onChange={(e) => setEditingOrder({ ...editingOrder, deadline: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
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

export default OrdersPage;
