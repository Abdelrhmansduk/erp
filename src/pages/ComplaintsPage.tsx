import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { useComplaints, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { Headphones, Plus, FileSpreadsheet, FileText, Search, Clock, AlertTriangle, MessageSquare, Building2, Check, X, ShieldAlert, Send, Trash2, Receipt, DollarSign } from 'lucide-react';

export interface ComplaintTicket {
  id: string;
  ticket_no: string;
  client_name: string;
  client_phone: string;
  category: 'تأخير وصول' | 'رفض عمل' | 'استرجاع وتسوية مالية' | 'شكوى إيواء' | 'جودة وسلوك';
  contract_ref: string;
  priority: 'عادي' | 'مهم' | 'عاجل طارئ';
  status: 'جديدة' | 'قيد المعالجة' | 'مرفوعة للمشرف' | 'تم الحل وإغلاق الشكوى';
  sla_hours_left: number;
  assigned_agent: string;
  branch: string;
  created_at: string;
  description: string;
}

export interface InterCompanyDispute {
  id: string;
  dispute_no: string;
  sender_entity: string;
  target_entity: string;
  subject: string;
  amount_claimed: number;
  executive_status: 'مرفوع للإدارة العليا' | 'تحت مراجعة رئيس المجموعة' | 'تم التسوية والاعتماد';
  priority: 'عالي جداً VIP' | 'عاجل' | 'عادي';
  date: string;
  details: string;
}

const MOCK_COMPLAINTS: ComplaintTicket[] = [
  {
    id: 'c-101',
    ticket_no: 'TK-2026-0041',
    client_name: 'بندر صالح الهويريني',
    client_phone: '+966555774494',
    category: 'رفض عمل',
    contract_ref: 'RC-2026-0014',
    priority: 'عاجل طارئ',
    status: 'مرفوعة للمشرف',
    sla_hours_left: 2,
    assigned_agent: 'فهد العتيبي (مشرف التشغيل)',
    branch: 'فرع الرياض',
    created_at: '2026-07-31 09:30',
    description: 'العاملة ترغب بالامتناع عن العمل وتطالب بالتحويل للإيواء أو الترحيل.'
  },
  {
    id: 'c-102',
    ticket_no: 'TK-2026-0040',
    client_name: 'سارة أحمد محمد',
    client_phone: '+966558025628',
    category: 'تأخير وصول',
    contract_ref: 'REC-2026-0089',
    priority: 'مهم',
    status: 'قيد المعالجة',
    sla_hours_left: 8,
    assigned_agent: 'عبدالفتح (مسؤول الوكلاء)',
    branch: 'مكتب بلاتينيوم الفلبيني',
    created_at: '2026-07-30 14:15',
    description: 'تأخر إصدار تأشيرة المغادرة من السفارة بالفلبين لمدة 5 أيام عن الموعد.'
  },
  {
    id: 'c-103',
    ticket_no: 'TK-2026-0039',
    client_name: 'شركة دار الرواد للمقاولات',
    client_phone: '+966114889200',
    category: 'استرجاع وتسوية مالية',
    contract_ref: 'RC-2026-0010',
    priority: 'عادي',
    status: 'جديدة',
    sla_hours_left: 24,
    assigned_agent: 'إبراهيم الشمري (المحاسب)',
    branch: 'الإدارة المالية',
    created_at: '2026-07-31 11:00',
    description: 'طلب استرجاع المبلغ المتبقي من تأمين السكن لعقد تأجير منتهي.'
  }
];

const MOCK_INTER_DISPUTES: InterCompanyDispute[] = [
  {
    id: 'disp-1',
    dispute_no: 'EXEC-2026-001',
    sender_entity: 'شركة توباز (Topaz Group)',
    target_entity: '🇵🇭 مكتب بلاتينيوم الفلبيني (PLATINUM)',
    subject: 'تأخير إرسالية 12 سيرة ذاتية وتأشيرة موثقة بالربط',
    amount_claimed: 45000,
    executive_status: 'مرفوع للإدارة العليا',
    priority: 'عالي جداً VIP',
    date: '2026-07-30',
    details: 'عدم الالتزام بجدول وصول العمالة حسب العقد الإطاري المبرم مع مكتب بلاتينيوم مانيلا.'
  }
];

export const ComplaintsPage: React.FC = () => {
  const { activeCompanyId } = useCompany();
  const { data: rawComplaints = [], isLoading } = useComplaints();
  const { createItem, updateItem, deleteItem } = useTableMutation('complaints');
  const { addNotification } = useAppStore();

  const complaints: ComplaintTicket[] = rawComplaints.length > 0 ? (rawComplaints as any[]) : MOCK_COMPLAINTS;
  const [interDisputes, setInterDisputes] = useState<InterCompanyDispute[]>(MOCK_INTER_DISPUTES);
  const [refundClaims, setRefundClaims] = useState([
    { id: 'CLM-2026-081', client: 'بندر صالح الهويريني', ref: 'RC-2026-0014', reason: 'استرجاع متبقي عقد بعد رفض العمل', amount: 8400, iban: 'SA4480000123608010119283', status: 'معتمد بانتظار التحويل' },
    { id: 'CLM-2026-082', client: 'سارة أحمد محمد', ref: 'REC-2026-0089', reason: 'تعويض تأخير وصول أكثر من المدة النظامية', amount: 1500, iban: 'SA1220000001283920194821', status: 'تم التحويل والإيداع' },
    { id: 'CLM-2026-083', client: 'شركة دار الرواد', ref: 'RC-2026-0010', reason: 'استرجاع مبلغ تأمين سكن عقد منتهي', amount: 3000, iban: 'SA9050000004810294819203', status: 'معتمد بانتظار التحويل' },
  ]);

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): 'tickets' | 'claims' | 'types' | 'inter-company' | 'escalated' | 'whatsapp' | 'analytics' => {
    switch (tabKey) {
      case 'compensation-claims': return 'claims';
      case 'complaint-types': return 'types';
      case 'complaint-analytics':
      case 'sla-tracking':
        return 'analytics';
      case 'inter-company-disputes':
        return 'inter-company';
      case 'escalated-complaints':
        return 'escalated';
      default:
        return 'tickets';
    }
  };

  const [activeTab, setActiveTab] = useState<'tickets' | 'claims' | 'types' | 'inter-company' | 'escalated' | 'whatsapp' | 'analytics'>(() => getMappedTab(storeActiveTab));

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
    if (storeActiveTab === 'create-complaint') {
      setShowAddModal(true);
    }
  }, [storeActiveTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'create-complaint');
  const [showAddDisputeModal, setShowAddDisputeModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ComplaintTicket | null>(null);

  // Form State
  const [addForm, setAddForm] = useState({
    client_name: '',
    client_phone: '',
    category: 'رفض عمل' as any,
    contract_ref: '',
    priority: 'عادي' as any,
    branch: 'فرع الرياض',
    description: ''
  });

  // Inter Dispute Form State
  const [disputeForm, setDisputeForm] = useState({
    sender_entity: 'شركة توباز (Topaz Group)',
    target_entity: '🇵🇭 مكتب بلاتينيوم الفلبيني (PLATINUM)',
    subject: '',
    amount_claimed: '',
    priority: 'عالي جداً VIP' as any,
    details: ''
  });

  const [replyMessage, setReplyMessage] = useState('');

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    addNotification({
      title: 'إرسال الرد للعميل',
      message: `تم إرسال الرسالة إلى العميل عبر واتساب وتوثيقها في سجل التذكرة.`,
      type: 'success',
    });
    setReplyMessage('');
  };

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.client_name || !addForm.client_phone || !addForm.description) return;

    const ticketNo = `TK-2026-00${42 + complaints.length}`;
    const newTicket = {
      id: `c-${Date.now()}`,
      company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
      ticket_no: ticketNo,
      client_name: addForm.client_name,
      client_phone: addForm.client_phone,
      category: addForm.category,
      contract_ref: addForm.contract_ref || 'عقد عام',
      priority: addForm.priority,
      status: 'جديدة',
      sla_hours_left: addForm.priority === 'عاجل طارئ' ? 4 : addForm.priority === 'مهم' ? 12 : 24,
      assigned_agent: 'فريق الدعم الفني المعتمد',
      branch: addForm.branch,
      description: addForm.description,
    };

    await createItem.mutateAsync(newTicket);
    addNotification({
      title: 'تسجيل تذكرة شكوى جديدة',
      message: `تم فتح التذكرة #${ticketNo} للعميل (${addForm.client_name}) وبدء مؤقت معالجة SLA.`,
      type: 'success',
    });
    setShowAddModal(false);
    setAddForm({ client_name: '', client_phone: '', category: 'رفض عمل', contract_ref: '', priority: 'عادي', branch: 'فرع الرياض', description: '' });
  };

  const handleAddInterDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeForm.subject || !disputeForm.details) return;

    const disputeNo = `EXEC-2026-00${interDisputes.length + 1}`;
    const newDispute: InterCompanyDispute = {
      id: `disp-${Date.now()}`,
      dispute_no: disputeNo,
      sender_entity: disputeForm.sender_entity,
      target_entity: disputeForm.target_entity,
      subject: disputeForm.subject,
      amount_claimed: parseFloat(disputeForm.amount_claimed) || 0,
      executive_status: 'مرفوع للإدارة العليا',
      priority: disputeForm.priority,
      date: new Date().toISOString().slice(0, 10),
      details: disputeForm.details
    };

    setInterDisputes([newDispute, ...interDisputes]);
    addNotification({
      title: 'رفع نزاع بين الشركات',
      message: `تم تسجيل النزاع #${disputeNo} ورفعه للإدارة العليا.`,
      type: 'warning',
    });
    setShowAddDisputeModal(false);
    setDisputeForm({ sender_entity: 'شركة توباز (Topaz Group)', target_entity: '🇵🇭 مكتب بلاتينيوم الفلبيني (PLATINUM)', subject: '', amount_claimed: '', priority: 'عالي جداً VIP', details: '' });
  };

  const handleResolveTicket = async (status: 'تم الحل وإغلاق الشكوى' | 'مرفوعة للمشرف') => {
    if (!selectedTicket) return;
    await updateItem.mutateAsync({
      id: selectedTicket.id,
      data: { status },
    });
    addNotification({
      title: 'تحديث حالة الشكوى',
      message: `تم تغيير حالة التذكرة #${selectedTicket.ticket_no} إلى (${status}).`,
      type: status === 'تم الحل وإغلاق الشكوى' ? 'success' : 'info',
    });
    setSelectedTicket(null);
  };

  const handleGeneratePaymentVoucher = async (ticket: ComplaintTicket) => {
    const voucherNo = `PV-2026-0${Math.floor(Math.random() * 800 + 100)}`;
    const newVoucher = {
      id: `PV-${Date.now().toString().slice(-6)}`,
      voucher_no: voucherNo,
      beneficiary_name: ticket.client_name,
      amount: 1500,
      payment_type: 'تحويل بنكي تسوية شكوى',
      account_name: 'مصروفات تسويات ورد مبالغ عقود (5204)',
      cost_center: 'مركز العمليات والاستقدام',
      reference_doc: `${ticket.ticket_no} / ${ticket.contract_ref}`,
      status: 'معتمد وجاهز للتحويل',
      date: new Date().toISOString().split('T')[0],
      notes: `تسوية مالية وتعويض عن الشكوى: ${ticket.description}`
    };

    await realErpDataStore.addRecord('payment_vouchers', newVoucher);
    addNotification({
      title: 'توليد سند صرف تسوية مالية',
      message: `تم توليد سند الصرف رقم #${newVoucher.voucher_no} بمبلغ (1,500 ⃁) للعميل (${ticket.client_name}) وترحيله لدفتر الأستاذ العام.`,
      type: 'success',
    });
    setSelectedTicket(null);
  };

  const handleDeleteTicket = async (ticket: ComplaintTicket) => {
    if (window.confirm(`هل أنت متأكد من حذف تذكرة الشكوى #${ticket.ticket_no}؟`)) {
      await deleteItem.mutateAsync(ticket.id);
      addNotification({
        title: 'حذف التذكرة',
        message: `تم حذف التذكرة #${ticket.ticket_no} بنجاح.`,
        type: 'error',
      });
    }
  };

  const filteredTickets = complaints.filter(ticket => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (ticket?.ticket_no || '').toLowerCase().includes(q) ||
                          (ticket?.client_name || '').toLowerCase().includes(q) ||
                          (ticket?.client_phone || '').includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || ticket?.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket?.priority === priorityFilter;

    if (activeTab === 'escalated') {
      return matchesSearch && (ticket?.priority === 'عاجل طارئ' || ticket?.status === 'مرفوعة للمشرف');
    }
    return matchesSearch && matchesStatus && matchesPriority;
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
        <div className="flex items-center gap-3.5">
          <BusinessIllustration type="crm-customer" size="sm" showBackground={false} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>EXECUTIVE SUPPORT HUB</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              مركز الشكاوى والدعم الفني والنزاعات بين الشركات
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إدارة الشكاوى، الـ SLA، تصعيد البلاغات بين الشركات والمكاتب الخارجية لمكتب الإدارة العليا
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="button-white-pill"
            onClick={() => setShowAddDisputeModal(true)}
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <ShieldAlert className="w-4 h-4 ml-1 text-[#141414]" />
            <span>+ رفع شكوى للإدارة العليا</span>
          </button>
          <button
            className="button-outline-on-dark"
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>تسجيل شكوى عميل</span>
          </button>
          <ExportDropdown
            sectionKey="complaints"
            data={filteredTickets}
            customTitle="سجل الشكاوى والنزاعات والتعويضات"
            variant="outline-dark"
            buttonLabel="تصدير كشوفات الشكاوى (10 صيغ)"
          />
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي التذاكر والشكاوى</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{complaints.length} تذكرة</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>معالجة 88% هذا الشهر</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>نزاعات الشركات المصعدة للإدارة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>{interDisputes.length} نزاعات</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>مرفوعة لمكتب خالد السليم</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>نسبة الالتزام بالـ SLA</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>96.8%</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>إغلاق التذاكر ضمن الموعد</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>معدل رضا العملاء (CSAT)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>4.8 / 5.0</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>بناءً على 142 تقييم</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'tickets', label: 'تذاكر العملاء والدعم' },
          { id: 'claims', label: 'مطالبات التعويض المالي للعملاء (3)' },
          { id: 'types', label: 'تصنيفات ومستويات الشكاوى SLA' },
          { id: 'inter-company', label: 'شكاوى ونزاعات الشركات للإدارة العليا' },
          { id: 'escalated', label: 'الشكاوى المصعدة للمشرفين' },
          { id: 'whatsapp', label: 'محادثات الواتساب الحية' },
          { id: 'analytics', label: 'تحليلات أسباب الشكاوى (RCA)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: activeTab === tab.id ? '#141414' : '#e4e4e7',
              backgroundColor: activeTab === tab.id ? '#141414' : '#ffffff',
              color: activeTab === tab.id ? '#ffffff' : '#27272a',
              fontWeight: activeTab === tab.id ? 550 : 420,
              fontSize: '12.5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Compensation Claims View */}
      {activeTab === 'claims' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">
                مطالبات التعويض المالي واسترجاع المبالغ للعملاء
              </h3>
              <p className="text-xs text-[#707070] mt-0.5">
                متابعة المطالبات المالية الناتجة عن رفض العمل، الهروب، أو إلغاء العقود وتأكيد التحويلات البنكية
              </p>
            </div>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>3 مطالبات مالية</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم المطالبة</th>
                  <th className="p-3.5">اسم العميل</th>
                  <th className="p-3.5">مرجع العقد / التذكرة</th>
                  <th className="p-3.5">سبب المطالبة</th>
                  <th className="p-3.5">مبلغ التعويض المقر</th>
                  <th className="p-3.5">رقم الآيبان (IBAN)</th>
                  <th className="p-3.5">حالة الصرف والتحويل</th>
                  <th className="p-3.5 text-center">إجراء مالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {refundClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{c.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={c.client} departmentId="crm" size="sm" />
                        <span>{c.client}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-600">{c.ref}</td>
                    <td className="p-3.5 text-zinc-700">{c.reason}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{c.amount.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono text-[11px] text-zinc-600">{c.iban}</td>
                    <td className="p-3.5"><Badge text={c.status} type={c.status.includes('تم') ? 'success' : 'warning'} /></td>
                    <td className="p-3.5 text-center">
                      <button
                        disabled={c.status === 'تم التحويل والإيداع'}
                        onClick={async () => {
                          setRefundClaims(prev =>
                            prev.map(item =>
                              item.id === c.id ? { ...item, status: 'تم التحويل والإيداع' } : item
                            )
                          );
                          await realErpDataStore.addRecord('vouchers', {
                            id: `PAY-${c.id}`,
                            company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
                            voucher_type: 'سند صرف',
                            party_name: c.client,
                            amount: c.amount,
                            payment_method: 'حوالة بنكية',
                            description: `صرف تعويض مطالبة #${c.id} - ${c.reason} (${c.iban})`,
                            date: new Date().toISOString().slice(0, 10),
                            status: 'معتمد',
                          });
                          addNotification({
                            title: 'اعتماد الحوالة البنكية وسند الصرف',
                            message: `تم إصدار أمر التحويل البنكي وسند الصرف للمطالبة #${c.id} بمبلغ ${c.amount.toLocaleString()} ⃁ بنجاح.`,
                            type: 'success',
                          });
                        }}
                        className="button-primary-pill disabled:opacity-50"
                        style={{ fontSize: '11px', padding: '2px 10px', minHeight: '26px' }}
                      >
                        {c.status === 'تم التحويل والإيداع' ? 'تم الصرف ' : 'إصدار تحويل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Complaint SLA Types View */}
      {activeTab === 'types' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <div className="border-b border-zinc-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-[#141414]">
              تصنيفات الشكاوى ومصفوفة اتفاقية مستوى الخدمة (SLA Matrix)
            </h3>
            <p className="text-xs text-[#707070] mt-1">
              المدد الزمنية المحددة للاستجابة والحل، ومسارات التصعيد التلقائي للمشرفين والإدارة العليا
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { type: 'هروب العمالة المنزلية', sla: 'ساعتين (2h)', prio: 'عاجل طارئ جداً', dept: 'فريق العمليات والشرطة ومنصة بلّغ', action: 'إشعار فوري لمساند وتسجيل بلاغ تغيب' },
              { type: 'رفض العمل / طلب التبديل', sla: '4 ساعات (4h)', prio: 'عاجل طارئ', dept: 'مشرف الإيواء والمصالحة', action: 'استدعاء للإيواء وإجراء جلسة استماع وتوفير بديل' },
              { type: 'تأخير الوصول وتحديث الرحلات', sla: '12 ساعة (12h)', prio: 'مهم', dept: 'مسؤول المكاتب الخارجية والشحن', action: 'مخاطبة وكالة المصدر وتحديث موعد الطيران' },
              { type: 'استرجاع وتسوية مالية', sla: '24 ساعة (24h)', prio: 'عادي', dept: 'الإدارة المالية والمحاسبة', action: 'مراجعة سندات القبض وبنود العقد والتحويل للآيبان' },
              { type: 'شكاوى السلوك والجودة', sla: '8 ساعات (8h)', prio: 'مهم', dept: 'مشرف التوجيه والتأهيل', action: 'جلسة تدريب وتوجيه للعاملة في مقر العميل' },
              { type: 'شكاوى سكن وإعاشة الإيواء', sla: '4 ساعات (4h)', prio: 'عاجل', dept: 'إدارة مراكز الإيواء', action: 'فحص فوري للغرف والتغذية ومعالجة الملاحظة' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-[#141414] text-sm">{item.type}</span>
                    <Badge text={item.prio} type={item.prio.includes('طارئ') ? 'danger' : 'primary'} />
                  </div>
                  <div className="text-xs font-mono font-bold text-[#141414] mb-2">المهلة الزمنية (SLA): {item.sla}</div>
                  <div className="text-xs text-zinc-600 mb-1"><strong className="text-zinc-800">القسم المسؤول:</strong> {item.dept}</div>
                  <div className="text-xs text-zinc-600"><strong className="text-zinc-800">الإجراء:</strong> {item.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Inter-Company Disputes */}
      {activeTab === 'inter-company' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">
                شكاوى ونزاعات الشركات والمكاتب المرفوعة للإدارة العليا
              </h3>
              <p className="text-xs text-[#707070] mt-0.5">
                متابعة والبت بالشكاوى التشغيلية والمالية بين توباز، دار الرواد، السفير، الماسي، والأيال والمكاتب الخارجية
              </p>
            </div>
            <button
              className="button-primary-pill"
              onClick={() => setShowAddDisputeModal(true)}
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '34px' }}
            >
              + رفع شكوى رسمية جديدة
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم البلاغ</th>
                  <th className="p-3.5">الشركة المشتكية</th>
                  <th className="p-3.5">الجهة المشتكى عليها</th>
                  <th className="p-3.5">موضوع النزاع / الشكوى</th>
                  <th className="p-3.5">المبلغ المطالب به</th>
                  <th className="p-3.5">الأولوية</th>
                  <th className="p-3.5">حالة البت بالإدارة العليا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {interDisputes.map(disp => (
                  <tr key={disp.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{disp.dispute_no}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{disp.sender_entity}</td>
                    <td className="p-3.5 font-bold text-zinc-800">{disp.target_entity}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{disp.subject}</div>
                      <div className="text-[11px] text-[#707070]">{disp.details}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">
                      {(disp.amount_claimed ?? 0) > 0 ? `${(disp.amount_claimed ?? 0).toLocaleString()} ⃁` : 'غير مالي'}
                    </td>
                    <td className="p-3.5"><Badge text={disp.priority} type={disp.priority.includes('VIP') ? 'danger' : 'warning'} /></td>
                    <td className="p-3.5">
                      <Badge
                        text={disp.executive_status}
                        type={disp.executive_status === 'تم التسوية والاعتماد' ? 'success' : 'danger'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Tickets List View */}
      {(activeTab === 'tickets' || activeTab === 'escalated') && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
              <input
                type="text"
                aria-label="ابحث برقم التذكرة، اسم العميل، أو الجوال"
                placeholder="ابحث برقم التذكرة، اسم العميل، أو الجوال..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="text-input"
                style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="تصفية حسب حالة التذكرة"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-2xl py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="جديدة">جديدة</option>
                <option value="قيد المعالجة">قيد المعالجة</option>
                <option value="مرفوعة للمشرف">مرفوعة للمشرف</option>
                <option value="تم الحل وإغلاق الشكوى">تم الحل وإغلاق الشكوى</option>
              </select>

              <select
                aria-label="تصفية حسب الأولوية"
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-2xl py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              >
                <option value="all">جميع الأولويات</option>
                <option value="عاجل طارئ">عاجل طارئ</option>
                <option value="مهم">مهم</option>
                <option value="عادي">عادي</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم التذكرة</th>
                  <th className="p-3.5">اسم العميل والجوال</th>
                  <th className="p-3.5">تصنيف الشكوى والعقد</th>
                  <th className="p-3.5">الأولوية والتصعيد</th>
                  <th className="p-3.5">الـ SLA المتبقي</th>
                  <th className="p-3.5">الموظف المكلَف</th>
                  <th className="p-3.5">الحالة الحالية</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#707070]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BusinessIllustration type="empty-search" size="md" />
                        <span className="font-bold text-[#141414]">لا توجد تذاكر أو شكاوى مطابقة للبحث</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{ticket.ticket_no}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <CorporateAvatar
                            name={ticket.client_name}
                            departmentId="crm"
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-[#141414]">{ticket.client_name}</div>
                            <div className="text-[11px] text-[#707070] font-mono">{ticket.client_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#141414]">{ticket.category}</div>
                        <div className="text-[11px] text-[#707070] font-mono">{ticket.contract_ref}</div>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          text={ticket.priority}
                          type={ticket.priority === 'عاجل طارئ' ? 'danger' : ticket.priority === 'مهم' ? 'warning' : 'info'}
                        />
                      </td>
                      <td className="p-3.5">
                        {ticket.sla_hours_left > 0 ? (
                          <span className={`font-mono font-bold text-xs flex items-center gap-1 ${ticket.sla_hours_left <= 4 ? 'text-[#141414]' : 'text-[#141414]'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>متبقي {ticket.sla_hours_left} ساعة</span>
                          </span>
                        ) : (
                          <span className="text-[#707070]">مكتملة</span>
                        )}
                      </td>
                      <td className="p-3.5 text-zinc-600">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={ticket.assigned_agent} departmentId="hr" size="xs" />
                          <span>{ticket.assigned_agent}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          text={ticket.status}
                          type={ticket.status === 'تم الحل وإغلاق الشكوى' ? 'success' : ticket.status === 'مرفوعة للمشرف' ? 'danger' : 'warning'}
                        />
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            className="button-outline-on-light"
                            style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            معاينة ومعالجة
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket)}
                            className="p-1 rounded-full hover:bg-[#eaeaea] text-[#707070] hover:text-[#141414] transition-colors"
                            title="حذف الشكوى"
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
      )}

      {/* Tab 3: WhatsApp Support Live Chat */}
      {activeTab === 'whatsapp' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
            <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-200">
              <h4 className="text-xs font-bold text-[#141414] mb-3">محادثات الدعم النشطة</h4>
              {complaints.map(c => (
                <div key={c.id} className="p-2.5 rounded-xl bg-white border border-zinc-200 mb-2 cursor-pointer hover:border-[#141414] transition-colors flex items-center gap-2.5">
                  <CorporateAvatar name={c.client_name} departmentId="crm" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-[#141414] truncate">{c.client_name}</div>
                    <div className="text-[11px] text-[#707070] font-mono truncate">{c.client_phone} • {c.ticket_no}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl p-4 border border-zinc-200 flex flex-col justify-between">
              <div>
                <div className="border-b border-zinc-100 pb-3 mb-3 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <CorporateAvatar name="بندر صالح الهويريني" departmentId="crm" size="sm" status="online" />
                    <div>
                      <h4 className="text-xs font-bold text-[#141414]">بندر صالح الهويريني (+966555774494)</h4>
                      <span className="text-[11px] text-[#707070] font-mono">تذكرة TK-2026-0041 • عقد RC-2026-0014</span>
                    </div>
                  </div>
                  <Badge text="مرفوعة للمشرف" type="danger" />
                </div>

                <div className="space-y-3">
                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-2xl max-w-[80%] text-xs text-[#141414]">
                    السلام عليكم، العاملة ترغب بالامتناع عن العمل وتطالب بالتحويل للإيواء أو الترحيل. نأمل المعالجة عاجلاً.
                  </div>
                  <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] p-3 rounded-2xl max-w-[80%] mr-auto text-xs">
                    وعليكم السلام أستاذ بندر، تم استلام الطلب وتصعيد التذكرة مباشرة لمشرف الإيواء لمتابعة حالة العاملة.
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-100">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  placeholder="اكتب ردك المباشر للعميل عبر الواتساب..."
                />
                <button
                  onClick={handleSendReply}
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 18px', fontSize: '12px' }}
                >
                  <Send className="w-3.5 h-3.5 ml-1" />
                  <span>إرسال</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Root Cause Analytics */}
      {activeTab === 'analytics' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#141414]" />
            <span>تحليلات أسباب الشكاوى الجذرية (Root Cause Analysis - RCA)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-700">توزيع مسببات الشكاوى</h4>
              {[
                { label: 'رفض عمل أو عدم رغبة العاملة', percent: 45, color: 'bg-[#141414]' },
                { label: 'تأخير الوصول من المكتب الخارجي', percent: 25, color: 'bg-[#141414]' },
                { label: 'تسويات واسترجاع مالي', percent: 18, color: 'bg-[#141414]' },
                { label: 'استفسارات عامة وسلوك', percent: 12, color: 'bg-[#141414]' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#141414]">{item.label}</span>
                    <span className="font-mono text-zinc-600">{item.percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-3">
              <h4 className="text-xs font-bold text-[#141414]">إحصائيات الفروع والمكاتب الأكثر بلاغاً</h4>
              <p className="text-xs text-zinc-600">
                • <strong>فرع الرياض</strong>: 52% من إجمالي التذاكر (متابعة الإيواء وتأجير العقود).
              </p>
              <p className="text-xs text-zinc-600">
                • <strong>مكتب بلاتينيوم الفلبيني</strong>: 28% من بلاغات تأخير إصدار التأشيرات.
              </p>
              <p className="text-xs text-zinc-600">
                • <strong>متوسط زمن حل الشكوى</strong>: 6.4 ساعات فقط.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Inter-Company Dispute Modal */}
      {showAddDisputeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#141414]" />
                <span>رفع بلاغ / شكوى بين الشركات للإدارة العليا</span>
              </h3>
              <button onClick={() => setShowAddDisputeModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInterDispute} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الشركة / الفرع المشتكي *</label>
                <select
                  value={disputeForm.sender_entity}
                  onChange={e => setDisputeForm({ ...disputeForm, sender_entity: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>شركة توباز (Topaz Group)</option>
                  <option>دار الرواد (Dar Al-Ruwad)</option>
                  <option>السفير (Al-Saffir)</option>
                  <option>الماسي (Al-Masi Luxury Services)</option>
                  <option>الأيال للسفر والسياحة (Al-Ayal Travel)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الجهة المشتكى عليها (الطرف الآخر) *</label>
                <select
                  value={disputeForm.target_entity}
                  onChange={e => setDisputeForm({ ...disputeForm, target_entity: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>🇵🇭 مكتب بلاتينيوم الفلبيني (PLATINUM)</option>
                  <option>🇪🇹 مكتب داماس الإثيوبي (DAMAS)</option>
                  <option>🇮🇳 مكتب فيرساتيل الهندي (VERSATILE)</option>
                  <option>قسم الإيواء الرئيسي (الرياض)</option>
                  <option>الإدارة المالية للمجموعة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">موضوع الشكوى والنزاع *</label>
                <input
                  type="text"
                  placeholder="عنوان مختصر للنزاع..."
                  value={disputeForm.subject}
                  onChange={e => setDisputeForm({ ...disputeForm, subject: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المبلغ المطالب به</label>
                  <input
                    type="number"
                    placeholder="0.00 ⃁"
                    value={disputeForm.amount_claimed}
                    onChange={e => setDisputeForm({ ...disputeForm, amount_claimed: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الأولوية والتصعيد *</label>
                  <select
                    value={disputeForm.priority}
                    onChange={e => setDisputeForm({ ...disputeForm, priority: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="عالي جداً VIP">عالي جداً VIP (خالد السليم)</option>
                    <option value="عاجل">عاجل</option>
                    <option value="عادي">عادي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">التفاصيل والأسباب الموجبة للتصعيد *</label>
                <textarea
                  rows={3}
                  placeholder="شرح أسباب البلاغ والطلب المطلوب من الإدارة العليا..."
                  value={disputeForm.details}
                  onChange={e => setDisputeForm({ ...disputeForm, details: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" onClick={() => setShowAddDisputeModal(false)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  رفع البلاغ للإدارة العليا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Complaint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[#141414]" />
                <span>تسجيل وتوجيه شكوى / تذكرة جديدة</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTicket} className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل بالكامل *</label>
                  <input
                    type="text"
                    placeholder="اسم العميل..."
                    value={addForm.client_name}
                    onChange={e => setAddForm({ ...addForm, client_name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    placeholder="+9665..."
                    value={addForm.client_phone}
                    onChange={e => setAddForm({ ...addForm, client_phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">تصنيف الشكوى *</label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm({ ...addForm, category: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="رفض عمل">رفض عمل</option>
                    <option value="تأخير وصول">تأخير وصول</option>
                    <option value="استرجاع وتسوية مالية">استرجاع وتسوية مالية</option>
                    <option value="شكوى إيواء">شكوى إيواء</option>
                    <option value="جودة وسلوك">جودة وسلوك</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">مستوى الأولوية *</label>
                  <select
                    value={addForm.priority}
                    onChange={e => setAddForm({ ...addForm, priority: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="عادي">عادي (SLA 24 ساعة)</option>
                    <option value="مهم">مهم (SLA 12 ساعة)</option>
                    <option value="عاجل طارئ">عاجل طارئ (SLA 4 ساعات)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المكلَف *</label>
                <select
                  value={addForm.branch}
                  onChange={e => setAddForm({ ...addForm, branch: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>فرع الرياض الرئيسي</option>
                  <option>فرع جدة</option>
                  <option>فرع الخبر</option>
                  <option>مركز الإيواء</option>
                  <option>مكتب بلاتينيوم الفلبيني</option>
                  <option>مكتب DAMAS الإثيوبي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">شرح وتفاصيل الشكوى *</label>
                <textarea
                  rows={3}
                  placeholder="اكتب التفاصيل هنا..."
                  value={addForm.description}
                  onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" onClick={() => setShowAddModal(false)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                  <Check className="w-4 h-4 ml-1" />
                  <span>تسجيل التذكرة وتفعيل SLA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Action Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Headphones className="w-4 h-4 text-[#141414]" />
                <span>معالجة التذكرة رقم ({selectedTicket.ticket_no})</span>
              </h3>
              <button onClick={() => setSelectedTicket(null)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-2 text-xs">
                <div><strong className="text-[#707070]">العميل:</strong> <span className="font-bold text-[#141414]">{selectedTicket.client_name} ({selectedTicket.client_phone})</span></div>
                <div><strong className="text-[#707070]">الشرح:</strong> <span className="text-zinc-700">{selectedTicket.description}</span></div>
                <div><strong className="text-[#707070]">المسؤول الحالي:</strong> <span className="font-bold text-[#141414]">{selectedTicket.assigned_agent}</span></div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100 flex-wrap">
                <button className="button-outline-on-light" onClick={() => setSelectedTicket(null)} style={{ minHeight: '36px', padding: '6px 14px', fontSize: '12.5px' }}>
                  إلغاء
                </button>
                <button 
                  className="button-outline-on-light text-[#141414] border-[#e0e0e0] hover:bg-[#eaeaea] flex items-center gap-1"
                  onClick={() => handleGeneratePaymentVoucher(selectedTicket)} 
                  style={{ minHeight: '36px', padding: '6px 12px', fontSize: '12px' }}
                  title="توليد سند صرف مالي مباشر في دفتر الأستاذ العام"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>توليد سند صرف تسوية</span>
                </button>
                <button className="button-outline-on-light text-[#141414] border-[#e0e0e0] hover:bg-[#eaeaea]" onClick={() => handleResolveTicket('مرفوعة للمشرف')} style={{ minHeight: '36px', padding: '6px 14px', fontSize: '12.5px' }}>
                  تصعيد للمشرف
                </button>
                <button className="button-primary-pill" onClick={() => handleResolveTicket('تم الحل وإغلاق الشكوى')} style={{ minHeight: '36px', padding: '6px 18px', fontSize: '12.5px' }}>
                  <Check className="w-4 h-4 ml-1" />
                  <span>إغلاق وإتمام الحل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsPage;
