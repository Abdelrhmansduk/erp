import React, { useEffect, useMemo, useState } from 'react';
import {
  LifeBuoy,
  Megaphone,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Users,
  Eye,
  BellRing,
  X,
  FileCheck2,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { isPrivilegedAiCrossSectionUser } from '../../services/localAiService';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import {
  HR_CIRCULAR_CATEGORIES,
  HR_TICKET_CATEGORIES,
  computeCircularCompliance,
  computeTicketSlaStatus,
  hrHelpdeskAndCircularsService,
  type HrCircularCategory,
  type HrCircularRecord,
  type HrHelpdeskTicket,
  type HrTicketCategory,
  type HrTicketPriority,
  type HrTicketStatus,
} from '../../services/hrHelpdeskAndCircularsService';
import type { KasDepartmentId } from '../../config/kasAllowedEmails';

const DEPT_OPTIONS: Array<{ id: string; labelAr: string }> = [
  { id: 'all', labelAr: 'جميع الموظفين والأقسام' },
  { id: 'executive', labelAr: 'الإدارة العليا' },
  { id: 'hr', labelAr: 'الموارد البشرية' },
  { id: 'finance', labelAr: 'المالية والمحاسبة' },
  { id: 'recruitment', labelAr: 'الاستقدام ومساند' },
  { id: 'rental', labelAr: 'التأجير والتشغيل' },
  { id: 'ats', labelAr: 'المتابعة والوكلاء' },
  { id: 'shelter', labelAr: 'الإيواء والتسكين' },
  { id: 'tenders', labelAr: 'كاس للتجارة والمنافسات' },
  { id: 'crm', labelAr: 'العملاء والتسويق' },
];

const DEPT_LABELS: Record<KasDepartmentId | string, string> = Object.fromEntries(
  DEPT_OPTIONS.map((d) => [d.id, d.labelAr])
);

export const HrHelpdeskAndCircularsHub: React.FC<{
  companyId: string;
  initialSubTab?: 'tickets' | 'circulars';
}> = ({ companyId, initialSubTab = 'tickets' }) => {
  const user = authService.getCurrentUser();
  const isHrOrAdmin = useMemo(() => isPrivilegedAiCrossSectionUser(user), [user]);
  const currentUserEmail = String(user?.email || '').trim().toLowerCase();
  const currentUserName = String(user?.full_name || 'موظف المجموعة');
  const currentUserDept = String(user?.department_id || 'hr');

  const [subTab, setSubTab] = useState<'tickets' | 'circulars'>(initialSubTab);
  const [tickets, setTickets] = useState<HrHelpdeskTicket[]>([]);
  const [circulars, setCirculars] = useState<HrCircularRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Ticket Filters & Creation
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('ALL');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketCategory, setNewTicketCategory] = useState<HrTicketCategory>('استفسار راتب');
  const [newTicketPriority, setNewTicketPriority] = useState<HrTicketPriority>('متوسط');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Circular Creation & Tracking
  const [showNewCircularForm, setShowNewCircularForm] = useState(false);
  const [newCirTitle, setNewCirTitle] = useState('');
  const [newCirCategory, setNewCirCategory] = useState<HrCircularCategory>('تعميم إداري');
  const [newCirBody, setNewCirBody] = useState('');
  const [newCirTargetDept, setNewCirTargetDept] = useState<string>('all');
  const [newCirRequireAck, setNewCirRequireAck] = useState(true);
  const [expandedCircularId, setExpandedCircularId] = useState<string | null>(null);

  const reloadAll = async () => {
    setLoading(true);
    try {
      const [tList, cList] = await Promise.all([
        hrHelpdeskAndCircularsService.loadTickets(companyId, user),
        hrHelpdeskAndCircularsService.loadCirculars(companyId, user),
      ]);
      setTickets(tList);
      setCirculars(cList);
      if (!selectedTicketId && tList.length > 0) {
        setSelectedTicketId(tList[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, currentUserEmail]);

  const filteredTickets = useMemo(() => {
    const q = ticketQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) return false;
      if (!q) return true;
      return (
        t.ticket_no.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.employee_name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketQuery, ticketStatusFilter]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || filteredTickets[0] || null,
    [tickets, filteredTickets, selectedTicketId]
  );

  const ticketKpis = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'تم الحل' && t.status !== 'مغلقة').length;
    const breached = tickets.filter((t) => computeTicketSlaStatus(t).breached).length;
    const resolved = tickets.filter((t) => t.status === 'تم الحل' || t.status === 'مغلقة').length;
    return { total: tickets.length, open, breached, resolved };
  }, [tickets]);

  const circularKpis = useMemo(() => {
    let totalAck = 0;
    let totalTargets = 0;
    let myPending = 0;
    for (const c of circulars) {
      const comp = computeCircularCompliance(c);
      totalAck += comp.acknowledgedCount;
      totalTargets += comp.total;
      const iRead = (c.read_receipts || []).some(
        (r) => r.employee_email.toLowerCase() === currentUserEmail
      );
      if (!iRead) myPending += 1;
    }
    const overallPct = totalTargets > 0 ? Math.round((totalAck / totalTargets) * 100) : 100;
    return { count: circulars.length, overallPct, myPending, totalPending: Math.max(0, totalTargets - totalAck) };
  }, [circulars, currentUserEmail]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketDesc.trim()) return;
    const created = await hrHelpdeskAndCircularsService.createTicket({
      companyId,
      employeeName: currentUserName,
      employeeEmail: currentUserEmail || 'employee@kas.sa',
      departmentId: currentUserDept,
      category: newTicketCategory,
      priority: newTicketPriority,
      subject: newTicketSubject,
      description: newTicketDesc,
    });
    setNewTicketSubject('');
    setNewTicketDesc('');
    setShowNewTicketForm(false);
    setSelectedTicketId(created.id);
    await reloadAll();
    notificationPopupEngine.success(
      `تم فتح تذكرة HR بنجاح (${created.ticket_no})`,
      `الوقت المستهدف للحل (SLA): ${created.sla_hours} ساعة • تم التوجيه لفريق الموارد البشرية.`
    );
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    await hrHelpdeskAndCircularsService.addTicketReply(companyId, selectedTicket.id, {
      authorName: currentUserName,
      authorEmail: currentUserEmail || 'employee@kas.sa',
      authorRole: isHrOrAdmin ? 'HR' : 'EMPLOYEE',
      message: replyText,
    });
    setReplyText('');
    await reloadAll();
  };

  const handleStatusChange = async (ticketId: string, status: HrTicketStatus) => {
    await hrHelpdeskAndCircularsService.updateTicketStatus(companyId, ticketId, status);
    await reloadAll();
    notificationPopupEngine.success('تم تحديث حالة التذكرة', `الحالة الجديدة: ${status}`);
  };

  const handlePublishCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCirTitle.trim() || !newCirBody.trim()) return;
    const created = await hrHelpdeskAndCircularsService.publishCircular({
      companyId,
      title: newCirTitle,
      category: newCirCategory,
      bodyText: newCirBody,
      targetDepartments: [newCirTargetDept],
      requireAcknowledgment: newCirRequireAck,
      publishedByName: currentUserName,
      publishedByEmail: currentUserEmail || 'reem.hr@kas.sa',
    });
    setNewCirTitle('');
    setNewCirBody('');
    setShowNewCircularForm(false);
    await reloadAll();
    notificationPopupEngine.success(
      `تم نشر التعميم الرسمي (${created.circular_no})`,
      'أصبح التعميم ظاهراً للموظفين المستهدفين مع تتبع فوري للقراءة والإقرار.'
    );
  };

  const handleAcknowledge = async (circular: HrCircularRecord) => {
    await hrHelpdeskAndCircularsService.acknowledgeCircular(companyId, circular.id, {
      email: currentUserEmail || 'employee@kas.sa',
      name: currentUserName,
      departmentId: currentUserDept,
    });
    await reloadAll();
    notificationPopupEngine.success(
      'تم توثيق قراءتك وإقرارك القانوني',
      `تم تسجيل إقرارك على التعميم (${circular.circular_no}) بالتاريخ والوقت الرسمي.`
    );
  };

  const handleRemindPending = (circular: HrCircularRecord, pendingCount: number) => {
    notificationPopupEngine.info(
      `تم إرسال تذكير للمتأخرين (${pendingCount} موظف)`,
      `أُرسل تنبيه فوري لقراءة وتأكيد التعميم (${circular.circular_no}) داخل المنظومة.`
    );
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header & Sub-tab Switcher */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-bold text-[#141414] mb-2">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>مركز خدمة الموظفين والتعاميم — معيار جسر (HR Helpdesk & Read Receipts)</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#141414] m-0">
            تذاكر الموارد البشرية (SLA) وتتبع قراءة التعاميم الرسمية
          </h2>
          <p className="text-xs text-[#707070] mt-1 mb-0">
            {isHrOrAdmin
              ? 'صلاحية الإشراف الكامل: عرض كافة تذاكر الموظفين، متابعة مؤشر SLA، وإصدار التعاميم مع كشف من قرأ ومن لم يقرأ.'
              : 'بوابة الخدمة الذاتية: افتح تذكرة مباشرة لفريق الموارد البشرية وتابع الردود، واطّلع على التعاميم الرسمية وأكّد قراءتها.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#f3f3f3] p-1.5 rounded-full self-start lg:self-center">
          <button
            type="button"
            onClick={() => setSubTab('tickets')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              subTab === 'tickets'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>تذاكر HR ({ticketKpis.open} مفتوحة)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('circulars')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              subTab === 'circulars'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>
              التعاميم والإقرار ({circularKpis.count})
              {circularKpis.myPending > 0 ? ` • ${circularKpis.myPending} جديد` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: HR HELPDESK TICKETS & SLA */}
      {subTab === 'tickets' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي التذاكر', value: ticketKpis.total, sub: 'مسجلة في النظام' },
              { label: 'تذاكر قيد المتابعة', value: ticketKpis.open, sub: 'مفتوحة / قيد المعالجة' },
              { label: 'متجاوزة لموعد SLA', value: ticketKpis.breached, sub: 'تتطلب تصعيداً فورياً' },
              { label: 'تم الحل والإغلاق', value: ticketKpis.resolved, sub: 'موثقة بالكامل' },
            ].map((k) => (
              <div key={k.label} className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4">
                <div className="text-[11px] font-semibold text-[#707070]">{k.label}</div>
                <div className="text-2xl font-extrabold text-[#141414] font-mono mt-1">{k.value}</div>
                <div className="text-[11px] text-[#707070] mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#707070] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ticketQuery}
                  onChange={(e) => setTicketQuery(e.target.value)}
                  placeholder="بحث برقم التذكرة أو الموظف أو الموضوع..."
                  className="w-full rounded-full bg-[#f3f3f3] pr-9 pl-4 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="rounded-full bg-[#f3f3f3] px-3.5 py-2 text-xs font-bold text-[#141414] focus:outline-none"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="مفتوحة">مفتوحة</option>
                <option value="قيد المعالجة">قيد المعالجة</option>
                <option value="بانتظار رد الموظف">بانتظار رد الموظف</option>
                <option value="تم الحل">تم الحل</option>
                <option value="مغلقة">مغلقة</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowNewTicketForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>فتح تذكرة جديدة</span>
            </button>
          </div>

          {/* New Ticket Form */}
          {showNewTicketForm && (
            <form
              onSubmit={handleCreateTicket}
              className="bg-[#ffffff] border border-[#141414] rounded-[24px] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#141414] m-0">إنشاء تذكرة خدمة موظف جديدة (HR Helpdesk)</h3>
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">تصنيف التذكرة</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as HrTicketCategory)}
                    className="w-full rounded-[14px] bg-[#f3f3f3] px-3 py-2.5 text-xs font-semibold text-[#141414]"
                  >
                    {HR_TICKET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الأولوية (تحدد SLA تلقائياً)</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as HrTicketPriority)}
                    className="w-full rounded-[14px] bg-[#f3f3f3] px-3 py-2.5 text-xs font-semibold text-[#141414]"
                  >
                    <option value="عادي">عادي (SLA: 48 ساعة)</option>
                    <option value="متوسط">متوسط (SLA: 24 ساعة)</option>
                    <option value="عاجل">عاجل (SLA: 8 ساعات)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">عنوان التذكرة *</label>
                  <input
                    type="text"
                    required
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    placeholder="مثال: تحديث رقم الآيبان البنكي"
                    className="w-full rounded-[14px] bg-[#f3f3f3] px-3 py-2.5 text-xs text-[#141414]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">تفاصيل الطلب *</label>
                <textarea
                  rows={3}
                  required
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="اشرح طلبك بوضوح ليتم معالجته ضمن اتفاقية مستوى الخدمة SLA..."
                  className="w-full rounded-[16px] bg-[#f3f3f3] px-3.5 py-2.5 text-xs text-[#141414]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketForm(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-xs font-bold text-[#707070] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال التذكرة</span>
                </button>
              </div>
            </form>
          )}

          {/* Split View: Ticket List + Conversation Thread */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-2.5">
              {loading ? (
                <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-8 text-center text-xs text-[#707070]">
                  جاري تحميل التذاكر...
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-8 text-center text-xs text-[#707070]">
                  لا توجد تذاكر مطابقة حالياً.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const sla = computeTicketSlaStatus(t);
                  const active = selectedTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full text-right rounded-[20px] p-4 border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                          : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[11px] font-mono font-bold ${active ? 'text-[#e0e0e0]' : 'text-[#707070]'}`}>
                          {t.ticket_no} • {t.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sla.breached
                              ? 'bg-[#ffffff] text-[#141414] border border-[#141414]'
                              : active
                                ? 'bg-[#ffffff]/15 text-[#ffffff]'
                                : 'bg-[#f3f3f3] text-[#141414]'
                          }`}
                        >
                          {sla.breached ? '⚠ ' : ''}
                          {sla.labelAr}
                        </span>
                      </div>
                      <div className="text-sm font-bold line-clamp-1">{t.subject}</div>
                      <div className={`text-[11px] mt-1.5 flex items-center justify-between ${active ? 'text-[#cccccc]' : 'text-[#707070]'}`}>
                        <span>{t.employee_name}</span>
                        <span className="font-bold">{t.status}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-7">
              {selectedTicket ? (
                <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#707070]">
                        <span>{selectedTicket.ticket_no}</span>
                        <span>•</span>
                        <span>{selectedTicket.category}</span>
                        <span>•</span>
                        <span>الأولوية: {selectedTicket.priority}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#141414] mt-1 mb-0">
                        {selectedTicket.subject}
                      </h3>
                      <div className="text-xs text-[#707070] mt-1">
                        مقدم الطلب: <strong className="text-[#141414]">{selectedTicket.employee_name}</strong> ({selectedTicket.employee_email})
                      </div>
                    </div>
                    {isHrOrAdmin && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['قيد المعالجة', 'تم الحل', 'مغلقة'] as HrTicketStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => void handleStatusChange(selectedTicket.id, st)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                              selectedTicket.status === st
                                ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                                : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="bg-[#f3f3f3] rounded-[16px] p-4 text-xs leading-relaxed text-[#141414]">
                    {selectedTicket.description}
                  </div>

                  {/* SLA Indicator */}
                  {(() => {
                    const sla = computeTicketSlaStatus(selectedTicket);
                    return (
                      <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-[14px] border border-[#e0e0e0] bg-[#ffffff]">
                        <div className="inline-flex items-center gap-2 font-bold text-[#141414]">
                          {sla.breached ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4 text-[#707070]" />}
                          <span>مؤشر اتفاقية الخدمة (SLA): {sla.labelAr}</span>
                        </div>
                        <span className="text-[11px] text-[#707070]">المسؤول: {selectedTicket.assigned_to_name}</span>
                      </div>
                    );
                  })()}

                  {/* Replies Thread */}
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
                    {(selectedTicket.replies || []).length === 0 ? (
                      <div className="text-center text-xs text-[#707070] py-4">
                        لا توجد ردود بعد — اكتب ردك أدناه.
                      </div>
                    ) : (
                      selectedTicket.replies.map((r) => (
                        <div
                          key={r.id}
                          className={`rounded-[16px] p-3.5 text-xs ${
                            r.author_role === 'HR'
                              ? 'bg-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] text-[#141414]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] opacity-80 mb-1">
                            <span className="font-bold">
                              {r.author_name} ({r.author_role === 'HR' ? 'الموارد البشرية' : 'الموظف'})
                            </span>
                            <span className="font-mono">{r.created_at.slice(0, 16).replace('T', ' ')}</span>
                          </div>
                          <div>{r.message}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Input */}
                  {selectedTicket.status !== 'مغلقة' && (
                    <form onSubmit={handleSendReply} className="flex items-center gap-2 pt-2 border-t border-[#f0f0f0]">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="اكتب رداً أو تحديثاً على التذكرة..."
                        className="flex-1 rounded-full bg-[#f3f3f3] px-4 py-2.5 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-10 text-center text-xs text-[#707070]">
                  اختر تذكرة من القائمة لعرض تفاصيلها والرد عليها.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: OFFICIAL CIRCULARS & READ RECEIPTS */}
      {subTab === 'circulars' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'التعاميم المنشورة', value: circularKpis.count, sub: 'سارية المفعول' },
              { label: 'نسبة الاطلاع والإقرار', value: `${circularKpis.overallPct}%`, sub: 'إجمالي امتثال الموظفين' },
              { label: 'بانتظار تأكيدي الشخصي', value: circularKpis.myPending, sub: 'تتطلب توقيع الاطلاع' },
              { label: 'إجمالي الموظفين غير القارئين', value: circularKpis.totalPending, sub: 'عبر التعاميم النشطة' },
            ].map((k) => (
              <div key={k.label} className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4">
                <div className="text-[11px] font-semibold text-[#707070]">{k.label}</div>
                <div className="text-2xl font-extrabold text-[#141414] font-mono mt-1">{k.value}</div>
                <div className="text-[11px] text-[#707070] mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {isHrOrAdmin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowNewCircularForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار تعميم رسمي جديد</span>
              </button>
            </div>
          )}

          {showNewCircularForm && isHrOrAdmin && (
            <form
              onSubmit={handlePublishCircular}
              className="bg-[#ffffff] border border-[#141414] rounded-[24px] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#141414] m-0">إصدار تعميم إداري جديد مع تتبع القراءة والإقرار</h3>
                <button
                  type="button"
                  onClick={() => setShowNewCircularForm(false)}
                  className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">عنوان التعميم *</label>
                  <input
                    type="text"
                    required
                    value={newCirTitle}
                    onChange={(e) => setNewCirTitle(e.target.value)}
                    placeholder="مثال: تعميم مواعيد الدوام الرسمي لشهر رمضان المبارك"
                    className="w-full rounded-[14px] bg-[#f3f3f3] px-3.5 py-2.5 text-xs text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">تصنيف التعميم</label>
                  <select
                    value={newCirCategory}
                    onChange={(e) => setNewCirCategory(e.target.value as HrCircularCategory)}
                    className="w-full rounded-[14px] bg-[#f3f3f3] px-3 py-2.5 text-xs font-semibold text-[#141414]"
                  >
                    {HR_CIRCULAR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الفئة المستهدفة</label>
                  <select
                    value={newCirTargetDept}
                    onChange={(e) => setNewCirTargetDept(e.target.value)}
                    className="w-full rounded-[14px] bg-[#f3f3f3] px-3 py-2.5 text-xs font-semibold text-[#141414]"
                  >
                    {DEPT_OPTIONS.map((d) => (
                      <option key={d.id} value={d.id}>{d.labelAr}</option>
                    ))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#141414] mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCirRequireAck}
                    onChange={(e) => setNewCirRequireAck(e.target.checked)}
                    className="w-4 h-4 accent-[#141414]"
                  />
                  <span>إلزام الموظف بالضغط على «تأكيد القراءة والاطلاع القانوني»</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">نص التعميم الرسمي *</label>
                <textarea
                  rows={4}
                  required
                  value={newCirBody}
                  onChange={(e) => setNewCirBody(e.target.value)}
                  placeholder="اكتب نص التعميم أو التحديث التنظيمي بالكامل..."
                  className="w-full rounded-[16px] bg-[#f3f3f3] px-3.5 py-2.5 text-xs text-[#141414]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCircularForm(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-xs font-bold text-[#707070] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>نشر التعميم فوراً</span>
                </button>
              </div>
            </form>
          )}

          {/* Circulars List */}
          <div className="space-y-3">
            {circulars.map((c) => {
              const comp = computeCircularCompliance(c);
              const myReceipt = (c.read_receipts || []).find(
                (r) => r.employee_email.toLowerCase() === currentUserEmail
              );
              const expanded = expandedCircularId === c.id;

              return (
                <div key={c.id} className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#707070]">
                        <span className="font-mono text-[#141414]">{c.circular_no}</span>
                        <span>•</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414]">{c.category}</span>
                        <span>•</span>
                        <span>
                          المستهدف: {(c.target_departments || ['all']).map((d) => DEPT_LABELS[d] || d).join('، ')}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#141414] mt-1.5 mb-0">{c.title}</h3>
                      <div className="text-[11px] text-[#707070] mt-1">
                        صادر عن: {c.published_by_name} • بتاريخ {(c.published_at || c.created_at).slice(0, 10)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {myReceipt ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم تأكيد قراءتك ({(myReceipt.acknowledged_at || myReceipt.read_at).slice(0, 10)})</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleAcknowledge(c)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold hover:opacity-90 cursor-pointer"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>تأكيد القراءة والاطلاع القانوني</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-[#141414] bg-[#f3f3f3] rounded-[16px] p-4 m-0">
                    {c.body_text}
                  </p>

                  {/* Read Receipts Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-2 font-bold text-[#141414]">
                        <Eye className="w-4 h-4 text-[#707070]" />
                        <span>
                          تتبع القراءة: {comp.acknowledgedCount} من أصل {comp.total} موظف ({comp.compliancePct}%)
                        </span>
                      </div>
                      {isHrOrAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedCircularId(expanded ? null : c.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{expanded ? 'إخفاء كشف الموظفين' : 'كشف من قرأ ومن لم يقرأ'}</span>
                          </button>
                          {comp.pendingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemindPending(c, comp.pendingCount)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              <span>تذكير المتأخرين ({comp.pendingCount})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f0f0f0] overflow-hidden">
                      <div
                        className="h-full bg-[#141414] rounded-full transition-all"
                        style={{ width: `${comp.compliancePct}%` }}
                      />
                    </div>
                  </div>

                  {/* HR Read/Unread Detailed Matrix */}
                  {expanded && isHrOrAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#f0f0f0]">
                      <div className="rounded-[16px] bg-[#f3f3f3] p-3.5 space-y-2">
                        <div className="text-xs font-extrabold text-[#141414]">
                          قرأوا وأقرّوا بالاطلاع ({comp.acknowledgedCount})
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1.5">
                          {comp.acknowledged.length === 0 ? (
                            <div className="text-[11px] text-[#707070]">لم يؤكد أحد القراءة بعد.</div>
                          ) : (
                            comp.acknowledged.map((a) => (
                              <div
                                key={a.email}
                                className="flex items-center justify-between text-[11px] bg-[#ffffff] rounded-[10px] px-2.5 py-1.5"
                              >
                                <span className="font-bold text-[#141414]">{a.nameAr}</span>
                                <span className="font-mono text-[#707070]">
                                  {a.acknowledgedAt.slice(0, 16).replace('T', ' ')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[#f3f3f3] p-3.5 space-y-2">
                        <div className="text-xs font-extrabold text-[#141414]">
                          لم يقرؤوا التعميم بعد ({comp.pendingCount})
                        </div>
                        <div className="max-h-44 overflow-y-auto space-y-1.5">
                          {comp.pending.length === 0 ? (
                            <div className="text-[11px] text-[#707070]">جميع الموظفين المستهدفين أكدوا القراءة.</div>
                          ) : (
                            comp.pending.map((p) => (
                              <div
                                key={p.email}
                                className="flex items-center justify-between text-[11px] bg-[#ffffff] rounded-[10px] px-2.5 py-1.5"
                              >
                                <span className="font-bold text-[#141414]">{p.nameAr}</span>
                                <span className="text-[#707070]">{DEPT_LABELS[p.departmentId] || p.departmentId}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
