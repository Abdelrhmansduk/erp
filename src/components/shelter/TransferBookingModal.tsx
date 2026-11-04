import React, { useState, useEffect } from 'react';
import { 
  WorkerProfile, 
  AccommodationCase,
  GroupOfficeId, 
  GROUP_COMPANIES 
} from '../../types/shelterTransferSuite';
import { shelterTransferStore } from '../../services/shelterTransferStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { 
  X, 
  Sparkles, 
  Building2, 
  User, 
  Phone, 
  IdCard, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Clock, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2,
  ArrowRightLeft
} from 'lucide-react';

interface TransferBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onSuccess: (transferCaseId: string) => void;
}

export const TransferBookingModal: React.FC<TransferBookingModalProps> = (props) => {
  // Early return lives in the wrapper so the inner component's hooks always run in the same order.
  if (!props.isOpen || !props.worker) return null;
  return <TransferBookingModalContent {...props} worker={props.worker} />;
};

const TransferBookingModalContent: React.FC<
  Omit<TransferBookingModalProps, 'worker'> & { worker: WorkerProfile }
> = ({ onClose, worker, onSuccess }) => {
  // Form states
  const [executingOfficeId, setExecutingOfficeId] = useState<GroupOfficeId>(worker.originalOfficeId);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNationalId, setNewClientNationalId] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientCity, setNewClientCity] = useState('الرياض');
  const [responsibleEmployee, setResponsibleEmployee] = useState('مشرف نقل الخدمات');

  // Dynamic Manual Pricing
  const [transferFee, setTransferFee] = useState<number>(18000);
  const [downPayment, setDownPayment] = useState<number>(5000);

  // Schedule & Terms
  const [followupDaysDuration, setFollowupDaysDuration] = useState<number>(5);
  const [deliveryDateTime, setDeliveryDateTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [deliveryMode, setDeliveryMode] = useState<'استلام من السكن' | 'توصيل لمنزل العميل'>('استلام من السكن');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Remaining calculation
  const remainingAmount = Math.max(0, transferFee - downPayment);
  const paymentStatus = remainingAmount <= 0 ? 'مسدد بالكامل' : downPayment > 0 ? 'دفعة أولى' : 'معلق';

  // Office lookup
  const originalOffice = GROUP_COMPANIES.find(c => c.id === worker.originalOfficeId);
  const executingOffice = GROUP_COMPANIES.find(c => c.id === executingOfficeId);

  // Reset form when worker changes
  useEffect(() => {
    if (worker) {
      setExecutingOfficeId(worker.originalOfficeId);
      setErrorMsg(null);
    }
  }, [worker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Basic validations
    if (!newClientName.trim()) {
      setErrorMsg('يرجى إدخال اسم العميل الجديد');
      return;
    }
    if (!newClientPhone.trim() || newClientPhone.length < 9) {
      setErrorMsg('يرجى إدخال رقم جوال صحيح للتواصل وتتبع التجربة');
      return;
    }
    if (!newClientNationalId.trim() || newClientNationalId.length < 10) {
      setErrorMsg('يرجى إدخال رقم الهوية الوطنية / الإقامة للعميل (10 أرقام)');
      return;
    }
    if (transferFee <= 0) {
      setErrorMsg('يرجى تحديد تكلفة نقل الخدمات (أكبر من صفر)');
      return;
    }
    if (downPayment > transferFee) {
      setErrorMsg('العربون لا يمكن أن يتجاوز التكلفة الإجمالية لنقل الخدمات');
      return;
    }

    // Safeguard: Check double-booking
    const reservationCheck = shelterTransferStore.canReserveWorker(worker.id);
    if (!reservationCheck.canReserve) {
      setErrorMsg(reservationCheck.reason || 'لا يمكن حجز هذه العاملة في الوقت الراهن');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find current accommodation case
      const state = shelterTransferStore.getState();
      const currentAcc = state.accommodationCases.find(
        (a: AccommodationCase) => a.workerId === worker.id && a.caseStatus === 'نشطة بالسكن'
      ) || state.accommodationCases.find((a: AccommodationCase) => a.workerId === worker.id);

      const result = await shelterTransferStore.createTransferCase({
        workerId: worker.id,
        accommodationCaseId: currentAcc?.id || `acc-${Date.now()}`,
        originalOfficeId: worker.originalOfficeId,
        executingOfficeId,
        newClientName: newClientName.trim(),
        newClientNationalId: newClientNationalId.trim(),
        newClientPhone: newClientPhone.trim(),
        newClientCity: newClientCity.trim(),
        responsibleEmployee: responsibleEmployee.trim(),
        transferFee,
        downPayment,
        followupDaysDuration,
        deliveryDateTime: new Date(deliveryDateTime).toISOString(),
        notes: notes.trim() ? `${notes.trim()} | طريقة التسليم: ${deliveryMode}` : `طريقة التسليم: ${deliveryMode}`,
      });

      if (result.success && result.transferCase) {
        notificationPopupEngine.show({
          title: 'تم تسجيل حجز نقل الخدمات وتجربة العميل',
          message: `تم حجز (${worker.fullNameAr}) للعميل (${newClientName}) بنجاح. بدأت فترة التجربة والعداد الزمني.`,
          type: 'success',
        });
        onSuccess(result.transferCase.id);
        onClose();
      } else {
        setErrorMsg(result.error || 'حدث خطأ أثناء تسجيل عملية الحجز');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-[#ffffff] rounded-[24px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e0e0e0] text-[#141414] animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Modal Header — Mobbin Pure Light Mode */}
        <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex items-center justify-between sticky top-0 bg-[#ffffff] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141414] font-display m-0">
                حجز عاملة لتجربة ونقل خدمات لعميل
              </h2>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                تسجيل العقد المؤقت، بدء فترة التجربة، وربط المكاتب المنفذة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Worker Overview Card */}
        <div className="p-5 sm:p-6 bg-[#f3f3f3] border-b border-[#e5e5e5]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-bold text-[#141414] text-base">{worker.fullNameAr}</div>
                <div className="text-xs text-[#707070] flex items-center gap-2 mt-0.5">
                  <span>{worker.nationality}</span>
                  <span>•</span>
                  <span>جواز: <span className="font-mono text-[#141414]">{worker.passportNumber}</span></span>
                  <span>•</span>
                  <span>الراتب: <span className="font-mono text-[#141414] font-bold">{worker.requestedSalary} ⃁</span></span>
                </div>
              </div>
            </div>

            <div className="text-left">
              <div className="text-[11px] text-[#707070] font-medium">المكتب الأصلي للعاملة:</div>
              <div className="px-3 py-1 rounded-full text-xs font-bold inline-block mt-0.5 bg-[#ffffff] text-[#141414] border border-[#e0e0e0]">
                {originalOffice?.name || worker.originalOfficeId}
              </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Office Decoupling (Crucial Business Requirement) */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>المكتب المنفذ لعملية النقل (إصدار العقد والفوترة):</span>
            </label>
            <div className="p-3.5 bg-black/40 rounded-2xl border border-white/10 flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <select
                  value={executingOfficeId}
                  onChange={(e) => setExecutingOfficeId(e.target.value as GroupOfficeId)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 focus:outline-none focus:border-amber-400 text-white"
                >
                  {GROUP_COMPANIES.map(comp => (
                    <option key={comp.id} value={comp.id} className="bg-[#14181c] text-white">
                      {comp.name} ({comp.crNumber ? `سجل: ${comp.crNumber}` : comp.id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  * قد تتبع العاملة لمكتب ({originalOffice?.name}) لكن التنفيذ والفوترة تتم عبر ({executingOffice?.name}) وفق منظومة الإيواء المشتركة.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: New Client Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>بيانات العميل الجديد (الكفيل المرتقب):</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">اسم العميل الثلاثي / الرباعي *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="مثال: فهد بن عبد العزيز السبيعي"
                    className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">رقم الهوية الوطنية / الإقامة (10 أرقام) *</label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newClientNationalId}
                    onChange={(e) => setNewClientNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="10XXXXXXXX"
                    className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">رقم الجوال النشط (واتساب) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">المدينة / الحي *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-zinc-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={newClientCity}
                    onChange={(e) => setNewClientCity(e.target.value)}
                    placeholder="الرياض - حي النرجس"
                    className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Manual Pricing (Crucial BRD Requirement) */}
          <div className="space-y-3 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/25">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>التسعير اليدوي المرن والمدفوعات (وفق الاتفاق):</span>
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                تسعير حر غير مقيد
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  إجمالي تكلفة نقل الخدمات (⃁) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={transferFee}
                  onChange={(e) => setTransferFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/60 border border-amber-400/40 text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  العربون / الدفعة الأولى المستلمة (⃁) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/60 border border-amber-400/40 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  المبلغ المتبقي بعد التجربة (⃁)
                </label>
                <div className="px-3 py-2 rounded-xl text-xs font-black bg-black/40 border border-white/10 text-white">
                  {remainingAmount.toLocaleString('ar-SA')} ⃁
                  <span className={`mr-2 text-[10px] px-2 py-0.5 rounded-full ${
                    paymentStatus === 'مسدد بالكامل' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Trial Schedule & Delivery */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>فترة التجربة وموعد التسليم:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">مدة التجربة النظامية (أيام) *</label>
                <select
                  value={followupDaysDuration}
                  onChange={(e) => setFollowupDaysDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={3} className="bg-[#14181c]">3 أيام تجربة سريعة</option>
                  <option value={5} className="bg-[#14181c]">5 أيام (المدة القياسية)</option>
                  <option value={7} className="bg-[#14181c]">7 أيام (أسبوع كامل)</option>
                  <option value={10} className="bg-[#14181c]">10 أيام</option>
                  <option value={15} className="bg-[#14181c]">15 يوماً (استثنائي)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">تاريخ ووقت تسليم العاملة *</label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryDateTime}
                  onChange={(e) => setDeliveryDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">طريقة التسليم للعميل</label>
                <select
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="استلام من السكن" className="bg-[#14181c]">استلام من مقر الإيواء</option>
                  <option value="توصيل لمنزل العميل" className="bg-[#14181c]">توصيل لمنزل العميل عبر المناديب</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">الموظف المسؤول عن المتابعة</label>
              <input
                type="text"
                value={responsibleEmployee}
                onChange={(e) => setResponsibleEmployee(e.target.value)}
                placeholder="اسم الموظف أو المشرف"
                className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">شروط خاصة أو ملاحظات اتفاق</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي اشتراطات خاصة بالعميل أو التجربة، تفاصيل السداد، إلخ..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Legal / Regulatory Safeguard Banner */}
          <div className="p-3.5 rounded-2xl bg-black/40 text-zinc-300 text-[11px] flex items-center gap-2 border border-white/10">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              عند الحفظ، سيتم حجز ملف العاملة فورا لمنع أي تعارض حجوزات، وسيتم إنشاء سجل متابعة يومي يبدأ احتساب الأيام حتى موعد انتهاء التجربة مع التنبيهات اللونية التلقائية.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e5e5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-[#141414] bg-[#f3f3f3] hover:bg-[#e5e5e5] transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-bold text-[#ffffff] bg-[#141414] hover:bg-[#262626] transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#ffffff]/30 border-t-[#ffffff] rounded-full animate-spin" />
                  <span>جاري تسجيل الحجز...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز وبدء التجربة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
