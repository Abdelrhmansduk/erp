import React, { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Building2,
  MapPin,
  Briefcase,
  ShieldCheck,
  Calendar,
  Clock,
  FileText,
  Plus,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { authService, COMPANY_AUTH_METADATA } from '../services/authService';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

interface SelfServiceRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  company_id: string;
  request_type: 'إجازة سنوية' | 'إجازة اضطرارية' | 'تعريف بالراتب' | 'استئذان عمل';
  start_date: string;
  days_count: number;
  notes: string;
  status: 'قيد مراجعة الموارد البشرية' | 'معتمد' | 'مرفوض';
  created_at: string;
}

export const EmployeeSelfServicePage: React.FC = () => {
  const { user } = useAuthContext();
  const { addNotification } = useAppStore();
  const isAdmin = authService.isAdmin(user);

  const [requests, setRequests] = useState<SelfServiceRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    request_type: 'إجازة سنوية' as SelfServiceRequest['request_type'],
    start_date: new Date().toISOString().slice(0, 10),
    days_count: 3,
    notes: '',
  });

  const companyCode = (user?.company_id || 'SAF').toUpperCase();
  const companyName =
    COMPANY_AUTH_METADATA[companyCode === 'ALL' ? 'ALL' : companyCode]?.nameAr ||
    'مجموعة خالد السليم القابضة';
  const linkedGoogleBinding = user?.email
    ? authService.getLinkedGoogleAccountForKasEmail(user.email)
    : null;

  useEffect(() => {
    let mounted = true;
    realErpDataStore.getRecords<SelfServiceRequest>('self_service_requests', []).then((all) => {
      if (!mounted) return;
      const list = Array.isArray(all) ? all : [];
      const mine = user?.email
        ? list.filter((r) => (r.employee_email || '').toLowerCase() === user.email.toLowerCase())
        : [];
      setRequests(mine);
    });
    return () => {
      mounted = false;
    };
  }, [user?.email]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const record: SelfServiceRequest = {
      id: `SSR-${Date.now().toString().slice(-6)}`,
      employee_id: user.id,
      employee_name: user.full_name,
      employee_email: user.email,
      company_id: user.company_id || 'SAF',
      request_type: form.request_type,
      start_date: form.start_date,
      days_count: Math.max(1, Number(form.days_count) || 1),
      notes: form.notes.trim() || 'طلب خدمة ذاتية عبر البوابة المؤسسية',
      status: 'قيد مراجعة الموارد البشرية',
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('self_service_requests', record);
    setRequests((prev) => [record, ...prev]);
    setShowModal(false);
    setForm((f) => ({ ...f, notes: '' }));
    addNotification({
      type: 'success',
      title: 'تم رفع الطلب بنجاح',
      message: `تم إرسال طلب (${record.request_type}) إلى قسم الموارد البشرية برقم مرجعي ${record.id}.`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Identity Header Card */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 sm:p-8 border border-[#262626]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <CorporateAvatar
              name={user?.full_name || 'موظف معتمد'}
              email={user?.email}
              size="lg"
              status="verified"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#262626] text-[#ffffff] border border-[#3f3f46]">
                  بوابة الخدمة الذاتية للموظف
                </span>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-mono bg-[#262626] text-[#d4d4d8]">
                  {user?.id || 'KAS-STAFF'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#ffffff] m-0">
                {user?.full_name || 'موظف مجموعة خالد السليم'}.
              </h1>
              <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1 mb-0">
                {user?.role || 'موظف معتمد'} • {companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#141414]" />
              <span>رفع طلب إجازة أو تعريف</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('alsulaim_navigate', {
                      detail: { tab: 'settings', title: 'إعدادات النظام المتقدمة' },
                    })
                  )
                }
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#262626] text-[#ffffff] hover:bg-[#3f3f46] border border-[#3f3f46] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-[#ffffff]" />
                <span>إعدادات النظام المتقدمة</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Official Corporate Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
            <Mail className="w-4 h-4 text-[#141414]" />
            <span>البريد الوظيفي المعتمد</span>
          </div>
          <div className="text-sm font-bold text-[#141414] font-mono break-all">
            {user?.email || '—'}
          </div>
        </div>

        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
            <Building2 className="w-4 h-4 text-[#141414]" />
            <span>الكيان القانوني التابع له</span>
          </div>
          <div className="text-sm font-bold text-[#141414]">{companyName}</div>
        </div>

        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
            <Briefcase className="w-4 h-4 text-[#141414]" />
            <span>القسم والاختصاص الوظيفي</span>
          </div>
          <div className="text-sm font-bold text-[#141414]">
            {user?.department_name_ar || user?.role || '—'}
          </div>
        </div>

        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
          <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
            <MapPin className="w-4 h-4 text-[#141414]" />
            <span>الفرع ومقر العمل</span>
          </div>
          <div className="text-sm font-bold text-[#141414]">
            {user?.branch || 'المقر الرئيسي - الرياض'}
          </div>
        </div>
      </div>

      {/* Security & Shift Summary + Personal Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#141414]" />
            <h2 className="text-base font-bold text-[#141414] m-0">حالة الحساب والدوام الرسمي</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
              <span className="text-[#707070]">حالة التفعيل المؤسسي:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-bold">
                نشط وموثق (@kas.sa)
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
              <span className="text-[#707070]">مواعيد الدوام المعتمدة:</span>
              <span className="font-bold text-[#141414] inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                08:30 ص — 05:30 م
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
              <span className="text-[#707070]">رصيد الإجازات السنوية:</span>
              <span className="font-bold text-[#141414]">21 يوماً مستحقاً</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
              <span className="text-[#707070]">حماية البيانات الشخصية (PDPL):</span>
              <span className="font-bold text-[#141414] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                معزول ومحمي
              </span>
            </div>
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#707070]">حساب Google للدخول السريع:</span>
                {linkedGoogleBinding ? (
                  <span
                    dir="ltr"
                    className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] font-mono font-bold text-[11px] truncate max-w-[170px]"
                  >
                    {linkedGoogleBinding.googleEmail}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#d4d4d4] text-[#525252] font-bold text-[11px]">
                    بانتظار الاعتماد
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('alsulaim-open-google-binding-modal'))
                }
                className="w-full py-2 px-3 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold transition-colors cursor-pointer"
              >
                {linkedGoogleBinding
                  ? 'تحديث حساب Google المعتمد'
                  : 'اعتماد حساب Google للدخول من المرة القادمة'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#141414]" />
              <h2 className="text-base font-bold text-[#141414] m-0">
                سجل طلباتي الإدارية والذاتية ({requests.length})
              </h2>
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center">
              <User className="w-8 h-8 text-[#707070] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#141414] m-0">لا توجد طلبات مسجلة حالياً</p>
              <p className="text-xs text-[#707070] mt-1 mb-0">
                يمكنك رفع طلب إجازة أو شهادة تعريف بالراتب مباشرةً لقسم الموارد البشرية.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0e0e0] text-[#707070]">
                    <th className="py-2.5 px-3 font-bold">رقم الطلب</th>
                    <th className="py-2.5 px-3 font-bold">نوع الطلب</th>
                    <th className="py-2.5 px-3 font-bold">تاريخ البدء</th>
                    <th className="py-2.5 px-3 font-bold">المدة</th>
                    <th className="py-2.5 px-3 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b border-[#f0f0f0]">
                      <td className="py-3 px-3 font-mono font-bold text-[#141414]">{req.id}</td>
                      <td className="py-3 px-3 font-bold text-[#141414]">{req.request_type}</td>
                      <td className="py-3 px-3 font-mono text-[#707070]">{req.start_date}</td>
                      <td className="py-3 px-3 text-[#141414]">{req.days_count} يوم</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-bold">
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Leave / Certificate Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141414] m-0">رفع طلب جديد للموارد البشرية</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1.5">نوع الطلب</label>
                <select
                  value={form.request_type}
                  onChange={(e) =>
                    setForm({ ...form, request_type: e.target.value as SelfServiceRequest['request_type'] })
                  }
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                >
                  <option value="إجازة سنوية">إجازة سنوية</option>
                  <option value="إجازة اضطرارية">إجازة اضطرارية</option>
                  <option value="تعريف بالراتب">شهادة تعريف بالراتب</option>
                  <option value="استئذان عمل">استئذان عمل رسمي</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline ml-1" />
                    تاريخ البدء
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1.5">عدد الأيام</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={form.days_count}
                    onChange={(e) => setForm({ ...form, days_count: Number(e.target.value) })}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1.5">ملاحظات إضافية</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="اكتب سبب الطلب أو الجهة الموجه إليها التعريف..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] cursor-pointer"
                >
                  اعتماد وإرسال الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSelfServicePage;
