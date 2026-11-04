import React, { useState } from 'react';
import { 
  WorkerProfile, 
  GroupOfficeId, 
  GROUP_COMPANIES 
} from '../../types/shelterTransferSuite';
import { shelterTransferStore } from '../../services/shelterTransferStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { 
  X, 
  Hotel, 
  UserPlus, 
  Building2, 
  User, 
  Phone, 
  IdCard, 
  Calendar, 
  Bed, 
  FileText, 
  ShieldAlert, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  Stethoscope,
  Briefcase
} from 'lucide-react';

interface ShelterIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (accommodationCaseId: string) => void;
}

export const ShelterIntakeModal: React.FC<ShelterIntakeModalProps> = (props) => {
  // Early return lives in the wrapper so the inner component's hooks always run in the same order.
  if (!props.isOpen) return null;
  return <ShelterIntakeModalContent {...props} />;
};

const ShelterIntakeModalContent: React.FC<ShelterIntakeModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const state = shelterTransferStore.getState();
  const existingWorkers = state.workers;

  // Mode: existing worker check-in vs new worker registration
  const [isNewWorker, setIsNewWorker] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(existingWorkers[0]?.id || '');

  // New worker fields
  const [fullNameAr, setFullNameAr] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [nationality, setNationality] = useState('الفلبين');
  const [originalOfficeId, setOriginalOfficeId] = useState<GroupOfficeId>('SAF');
  const [monthlySalary, setMonthlySalary] = useState<number>(1500);
  const [skillsStr, setSkillsStr] = useState('تنظيف شامل، غسيل وكوي');
  const [religion, setReligion] = useState('مسلمة');

  // Intake details
  const [shelterBranch, setShelterBranch] = useState('مقر الإيواء الرئيسي - الرياض');
  const [intakeDateTime, setIntakeDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [intakeReason, setIntakeReason] = useState<string>('تنازل كفيل أول');
  const [assignedRoom, setAssignedRoom] = useState('جناح أ - غرفة 101');
  const [assignedBed, setAssignedBed] = useState('سرير 2');
  const [workWillingness, setWorkWillingness] = useState<'ترغب بالعمل' | 'لا ترغب بالعمل' | 'مشروطة'>('ترغب بالعمل');

  // First Sponsor Dedicated Section (الكفيل الأول)
  const [hasFirstSponsor, setHasFirstSponsor] = useState(true);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorNationalId, setSponsorNationalId] = useState('');
  const [sponsorPhone, setSponsorPhone] = useState('');
  const [originalContractRef, setOriginalContractRef] = useState('');
  const [sponsorReturnReason, setSponsorReturnReason] = useState('');
  const [warrantyStatus, setWarrantyStatus] = useState<'ساري (ضمن 90 يوم)' | 'منتهي' | 'تنازل اختياري'>('ساري (ضمن 90 يوم)');
  const [financialClaimAmount, setFinancialClaimAmount] = useState<number>(0);

  // Health and Belongings
  const [medicalCheckPassed, setMedicalCheckPassed] = useState(true);
  const [luggageInspected, setLuggageInspected] = useState(true);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let targetWorkerId = selectedWorkerId;

    // Validate new worker if needed
    if (isNewWorker) {
      if (!fullNameAr.trim()) {
        setErrorMsg('يرجى إدخال اسم العاملة بالعربية');
        return;
      }
      if (!passportNumber.trim()) {
        setErrorMsg('يرجى إدخال رقم جواز السفر');
        return;
      }

      setIsSubmitting(true);
      try {
        const newWorkerResult = await shelterTransferStore.addWorker({
          fullNameAr: fullNameAr.trim(),
          fullNameEn: fullNameEn.trim() || fullNameAr.trim(),
          passportNumber: passportNumber.trim().toUpperCase(),
          nationality,
          religion,
          requestedSalary: monthlySalary,
          skills: skillsStr.split('،').map(s => s.trim()).filter(Boolean),
          originalOfficeId,
          operationalStatus: 'داخل السكن',
          clientTrialsCount: 0,
        });

        if (!newWorkerResult.success || !newWorkerResult.worker) {
          setErrorMsg(newWorkerResult.error || 'فشل تسجيل العاملة الجديدة');
          setIsSubmitting(false);
          return;
        }

        targetWorkerId = newWorkerResult.worker.id;
      } catch (err: any) {
        setErrorMsg(err.message || 'حدث خطأ أثناء حفظ بيانات العاملة');
        setIsSubmitting(false);
        return;
      }
    }

    if (!targetWorkerId) {
      setErrorMsg('يرجى اختيار العاملة المراد تسكينها');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. If hasFirstSponsor, record first sponsor details
      if (hasFirstSponsor && sponsorName.trim()) {
        await shelterTransferStore.recordFirstSponsor({
          workerId: targetWorkerId,
          sponsorName: sponsorName.trim(),
          sponsorNationalId: sponsorNationalId.trim(),
          sponsorPhone: sponsorPhone.trim(),
          originalContractRef: originalContractRef.trim(),
          reasonForReturn: sponsorReturnReason.trim(),
          warrantyStatus,
          financialClaimAmount,
          settlementStatus: financialClaimAmount > 0 ? 'معلق' : 'تمت التسوية',
        });
      }

      // 2. Create accommodation case
      const accResult = await shelterTransferStore.createAccommodationCase({
        workerId: targetWorkerId,
        originalOfficeId: isNewWorker ? originalOfficeId : (existingWorkers.find((w: WorkerProfile) => w.id === targetWorkerId)?.originalOfficeId || 'SAF'),
        shelterBranch,
        intakeDateTime: new Date(intakeDateTime).toISOString(),
        intakeReason,
        assignedRoom,
        assignedBed,
        workWillingness,
        medicalStatus: medicalCheckPassed ? 'لائقة طبياً' : 'تحت الفحص / العزل',
        luggageReceived: luggageInspected,
        notes: notes.trim(),
      });

      if (accResult.success && accResult.accommodationCase) {
        notificationPopupEngine.show({
          title: 'تم تسجيل وتسكين النزيلة بنجاح',
          message: `تم تسكين العاملة في (${shelterBranch} - ${assignedRoom}) وفتح ملف حالة إيواء جديدة.`,
          type: 'success',
        });
        onSuccess(accResult.accommodationCase.id);
        onClose();
      } else {
        setErrorMsg(accResult.error || 'حدث خطأ أثناء فتح ملف التسكين');
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
        {/* Header — Mobbin Pure Light Mode */}
        <div className="p-5 sm:p-6 border-b border-[#e5e5e5] flex items-center justify-between sticky top-0 bg-[#ffffff] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center font-bold">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141414] font-display m-0">
                تسجيل دخول وتسكين نزيلة جديدة بالسكن المشترك
              </h2>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                توثيق حالة الدخول، بيانات الكفيل الأول (إن وجد)، وتخصيص الغرفة والسرير
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#ffffff] text-[#141414]">
          {errorMsg && (
            <div className="p-4 rounded-[16px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center gap-2 p-1.5 bg-[#f3f3f3] rounded-full border border-[#e0e0e0]">
            <button
              type="button"
              onClick={() => setIsNewWorker(false)}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !isNewWorker ? 'bg-[#141414] text-[#ffffff]' : 'text-[#707070] hover:text-[#141414]'
              }`}
            >
              عاملة مسجلة مسبقاً بالنظام ({existingWorkers.length})
            </button>
            <button
              type="button"
              onClick={() => setIsNewWorker(true)}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isNewWorker ? 'bg-[#141414] text-[#ffffff]' : 'text-[#707070] hover:text-[#141414]'
              }`}
            >
              + تسجيل ملف عاملة جديدة لأول مرة
            </button>
          </div>

          {/* Existing Worker Picker */}
          {!isNewWorker ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">اختر العاملة المراد إدخالها للسكن:</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
              >
                {existingWorkers.map((w: WorkerProfile) => (
                  <option key={w.id} value={w.id} className="bg-[#14181c] text-white">
                    {w.fullNameAr} ({w.nationality}) - جواز: {w.passportNumber} - المكتب: {w.originalOfficeId} - الحالة: [{w.operationalStatus}]
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* New Worker Registration Section */
            <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/10">
              <h3 className="text-xs font-black text-amber-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>البيانات الأساسية للعاملة الجديدة:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">الاسم بالعربية *</label>
                  <input
                    type="text"
                    required
                    value={fullNameAr}
                    onChange={(e) => setFullNameAr(e.target.value)}
                    placeholder="مثال: مريم ديسالي غيتاتشو"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">الاسم بالإنجليزية</label>
                  <input
                    type="text"
                    value={fullNameEn}
                    onChange={(e) => setFullNameEn(e.target.value)}
                    placeholder="Maryam Desale Getachew"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-sans text-left"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">رقم جواز السفر *</label>
                  <input
                    type="text"
                    required
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="EP1234567"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono text-left"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">الجنسية *</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="الفلبين" className="bg-[#14181c]">الفلبين</option>
                    <option value="إندونيسيا" className="bg-[#14181c]">إندونيسيا</option>
                    <option value="إثيوبيا" className="bg-[#14181c]">إثيوبيا</option>
                    <option value="أوغندا" className="bg-[#14181c]">أوغندا</option>
                    <option value="كينيا" className="bg-[#14181c]">كينيا</option>
                    <option value="سيريلانكا" className="bg-[#14181c]">سيريلانكا</option>
                    <option value="بنجلاديش" className="bg-[#14181c]">بنجلاديش</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">مكتب الاستقدام الأصلي التابعة له *</label>
                  <select
                    value={originalOfficeId}
                    onChange={(e) => setOriginalOfficeId(e.target.value as GroupOfficeId)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                  >
                    {GROUP_COMPANIES.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#14181c]">
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">الراتب الشهري المطلوب (⃁)</label>
                  <input
                    type="number"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">المهارات والخبرات (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  placeholder="طبخ، رعاية أطفال، تنظيف، غسيل"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* Intake Parameters */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Hotel className="w-4 h-4 text-emerald-400" />
              <span>تفاصيل الدخول وتخصيص السكن:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">مقر الإيواء *</label>
                <select
                  value={shelterBranch}
                  onChange={(e) => setShelterBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="مقر الإيواء الرئيسي - الرياض" className="bg-[#14181c]">مقر الإيواء الرئيسي - الرياض</option>
                  <option value="مقر الإيواء - جدة" className="bg-[#14181c]">مقر الإيواء - جدة</option>
                  <option value="مقر الإيواء - الخبر" className="bg-[#14181c]">مقر الإيواء - الخبر</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">تاريخ ووقت الدخول *</label>
                <input
                  type="datetime-local"
                  required
                  value={intakeDateTime}
                  onChange={(e) => setIntakeDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">سبب دخول السكن *</label>
                <select
                  value={intakeReason}
                  onChange={(e) => setIntakeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="تنازل كفيل أول" className="bg-[#14181c]">تنازل كفيل أول</option>
                  <option value="استقدام جديد (لم يستلم الكفيل)" className="bg-[#14181c]">استقدام جديد (لم يستلم الكفيل)</option>
                  <option value="إرجاع من تجربة نقل خدمات" className="bg-[#14181c]">إرجاع من تجربة نقل خدمات</option>
                  <option value="نقل من مقر إيواء فرعي" className="bg-[#14181c]">نقل من مقر إيواء فرعي</option>
                  <option value="انتهاء عقد وطلب ترحيل" className="bg-[#14181c]">انتهاء عقد وطلب ترحيل</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">الغرفة / الجناح</label>
                <input
                  type="text"
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">رقم السرير</label>
                <input
                  type="text"
                  value={assignedBed}
                  onChange={(e) => setAssignedBed(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">الرغبة بالعمل</label>
                <select
                  value={workWillingness}
                  onChange={(e) => setWorkWillingness(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="ترغب بالعمل" className="bg-[#14181c]">ترغب بالعمل (جاهزة للنقل)</option>
                  <option value="مشروطة" className="bg-[#14181c]">ترغب بشروط معينة</option>
                  <option value="لا ترغب بالعمل" className="bg-[#14181c]">لا ترغب بالعمل (ترحيل)</option>
                </select>
              </div>
            </div>
          </div>

          {/* DEDICATED FIRST SPONSOR SECTION (Crucial BRD Requirement) */}
          <div className="space-y-3 p-4 rounded-xl bg-blue-950/25 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-blue-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>قسم بيانات الكفيل الأول (المتنازل أو المستقدم الأصلي):</span>
              </h3>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-blue-300">
                <input
                  type="checkbox"
                  checked={hasFirstSponsor}
                  onChange={(e) => setHasFirstSponsor(e.target.checked)}
                  className="rounded text-amber-400 focus:ring-0"
                />
                <span>تضمين بيانات الكفيل الأول</span>
              </label>
            </div>

            {hasFirstSponsor && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">اسم الكفيل الأول</label>
                    <input
                      type="text"
                      value={sponsorName}
                      onChange={(e) => setSponsorName(e.target.value)}
                      placeholder="اسم صاحب العمل السابق"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">هوية الكفيل الأول</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={sponsorNationalId}
                      onChange={(e) => setSponsorNationalId(e.target.value)}
                      placeholder="10XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">جوال الكفيل الأول</label>
                    <input
                      type="tel"
                      value={sponsorPhone}
                      onChange={(e) => setSponsorPhone(e.target.value)}
                      placeholder="05XXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 font-mono text-left"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">رقم عقد الاستقدام الأصلي</label>
                    <input
                      type="text"
                      value={originalContractRef}
                      onChange={(e) => setOriginalContractRef(e.target.value)}
                      placeholder="RC-2026-XXXX"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">سريان الضمان</label>
                    <select
                      value={warrantyStatus}
                      onChange={(e) => setWarrantyStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-black/50 border border-white/15 text-white focus:outline-none focus:border-blue-400"
                    >
                      <option value="ساري (ضمن 90 يوم)" className="bg-[#14181c]">ساري (ضمن فترة ضمان 90 يوم)</option>
                      <option value="منتهي" className="bg-[#14181c]">منتهي الضمان</option>
                      <option value="تنازل اختياري" className="bg-[#14181c]">تنازل اختياري بعد انتهاء الضمان</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-300 block mb-1">المطالبة المالية للكفيل (⃁)</label>
                    <input
                      type="number"
                      value={financialClaimAmount}
                      onChange={(e) => setFinancialClaimAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white focus:outline-none focus:border-blue-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">سبب الإرجاع / التنازل حسب إفادة الكفيل</label>
                  <textarea
                    rows={2}
                    value={sponsorReturnReason}
                    onChange={(e) => setSponsorReturnReason(e.target.value)}
                    placeholder="عدم التوافق مع متطلبات المنزل، رفض الطبخ، رغبة العاملة في العمل لدى عائلة صغيرة، إلخ..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Checklist Checks */}
          <div className="flex items-center gap-6 p-3 bg-black/40 rounded-xl border border-white/10 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-300">
              <input
                type="checkbox"
                checked={medicalCheckPassed}
                onChange={(e) => setMedicalCheckPassed(e.target.checked)}
                className="rounded text-amber-400 focus:ring-0"
              />
              <span>تم الفحص الطبي الأولي (لائقة)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-300">
              <input
                type="checkbox"
                checked={luggageInspected}
                onChange={(e) => setLuggageInspected(e.target.checked)}
                className="rounded text-amber-400 focus:ring-0"
              />
              <span>تم استلام وتفتيش الأمتعة</span>
            </label>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">ملاحظات عامة</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تفاصيل خاصة بالحالة الصحية أو النفسية أو التسكين..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-black/50 border border-white/15 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
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
                  <span>جاري التسكين والحفظ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد التسكين وفتح ملف الإيواء</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
