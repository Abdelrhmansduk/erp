import React, { useState } from 'react';
import { 
  WorkerProfile, 
  WorkerMovementTimeline, 
  TransferCase, 
  WorkerFirstSponsor,
  GROUP_COMPANIES 
} from '../../types/shelterTransferSuite';
import { shelterTransferStore } from '../../services/shelterTransferStore';
import { 
  X, 
  Printer, 
  User, 
  FileText, 
  Briefcase, 
  History, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Calendar, 
  ShieldCheck, 
  Phone, 
  DollarSign, 
  Sparkles,
  MapPin,
  IdCard,
  Languages,
  Award
} from 'lucide-react';

interface WorkerProfileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  onBookTransfer?: (worker: WorkerProfile) => void;
}

export const WorkerProfileDetailModal: React.FC<WorkerProfileDetailModalProps> = ({
  isOpen,
  onClose,
  worker,
  onBookTransfer,
}) => {
  if (!isOpen || !worker) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'sponsor' | 'timeline' | 'trials'>('info');

  const state = shelterTransferStore.getState();
  const firstSponsor = state.firstSponsors.find((s: WorkerFirstSponsor) => s.workerId === worker.id);
  const movementTimeline = shelterTransferStore.getWorkerTimeline(worker.id);
  const transferTrials = state.transferCases.filter((t: TransferCase) => t.workerId === worker.id);

  const originalOffice = GROUP_COMPANIES.find(c => c.id === worker.originalOfficeId);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/60 backdrop-blur-sm p-4 overflow-y-auto font-sans" dir="rtl">
      <div 
        className="bg-[#ffffff] text-[#141414] rounded-[24px] max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#e0e0e0] animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* Header with Photo and Quick Badges — Mobbin Pure Light Mode */}
        <div className="p-6 border-b border-[#e5e5e5] bg-[#ffffff] text-[#141414] rounded-t-[24px] relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-6 top-6 w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-5 flex-wrap">
            {/* Main Info */}
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight font-display text-[#141414] m-0">
                  {worker.fullNameAr}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-mono">
                  {worker.operationalStatus}
                </span>
              </div>
              <p className="text-xs text-[#707070] mt-0.5 font-sans dir-ltr text-right m-0">
                {worker.fullNameEn}
              </p>

              <div className="flex items-center gap-2 mt-3 text-xs text-[#707070] flex-wrap">
                <span className="bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-1 rounded-full">
                  الجنسية: <strong className="text-[#141414]">{worker.nationality}</strong>
                </span>
                <span className="bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-1 rounded-full">
                  جواز: <strong className="text-[#141414] font-mono">{worker.passportNumber}</strong>
                </span>
                <span className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1 rounded-full font-bold">
                  المكتب الأصلي: {originalOffice?.name || worker.originalOfficeId}
                </span>
                <span className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1 rounded-full font-bold">
                  تجارب العملاء السابقة: {worker.clientTrialsCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Pill Style */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-[#e5e5e5] bg-[#f3f3f3] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'info'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414] bg-[#ffffff] border border-[#e0e0e0]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الملف الشامل والمهارات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sponsor')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'sponsor'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414] bg-[#ffffff] border border-[#e0e0e0]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>بيانات الكفيل الأول {firstSponsor ? '✓' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414] bg-[#ffffff] border border-[#e0e0e0]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>المخطط الزمني للحركات ({movementTimeline.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trials')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'trials'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'text-[#707070] hover:text-[#141414] bg-[#ffffff] border border-[#e0e0e0]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>سجل تجارب العملاء ({transferTrials.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TAB 1: General Info & Skills */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Key Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-zinc-400 font-bold">الراتب الشهري</div>
                  <div className="text-base font-black text-emerald-400 mt-1 font-mono">
                    {worker.requestedSalary?.toLocaleString('ar-SA')} ⃁
                  </div>
                </div>

                <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-zinc-400 font-bold">العمر / الميلاد</div>
                  <div className="text-base font-black text-white mt-1">
                    {worker.age ? `${worker.age} سنة` : 'غير محدد'}
                  </div>
                </div>

                <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-zinc-400 font-bold">الديانة</div>
                  <div className="text-base font-black text-white mt-1">
                    {worker.religion || 'غير محدد'}
                  </div>
                </div>

                <div className="bg-black/40 p-3.5 rounded-xl border border-white/5">
                  <div className="text-[11px] text-zinc-400 font-bold">رقم الإقامة</div>
                  <div className="text-base font-black text-white mt-1 font-mono">
                    {worker.iqamaNumber || 'لا توجد إقامة بعد'}
                  </div>
                </div>
              </div>

              {/* Skills and Languages */}
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-2 m-0">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>المهارات والخبرات الموثقة:</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {worker.skills && worker.skills.length > 0 ? (
                      worker.skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400">لا توجد مهارات مسجلة</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2 mb-2 m-0">
                    <Languages className="w-4 h-4 text-blue-400" />
                    <span>اللغات التي تجيدها:</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {worker.languages && worker.languages.length > 0 ? (
                      worker.languages.map((lang, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400">غير محدد</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Psychological & Medical Evaluation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>الفحص الطبي وجاهزية العمل:</span>
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    الحالة الطبية: <strong className="text-emerald-400">{(worker as any).medicalStatus || 'لائقة طبياً'}</strong>
                  </div>
                  {(worker as any).medicalNotes && (
                    <p className="text-[11px] text-zinc-400 bg-white/5 p-2 rounded-lg m-0">
                      {(worker as any).medicalNotes}
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>التقييم السلوكي والتوافق:</span>
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    التقييم العام: <strong className="text-amber-300">{(worker as any).psychologicalEvaluation || 'ممتاز ومستعد للعمل'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: First Sponsor Decoupled Data */}
          {activeTab === 'sponsor' && (
            <div className="space-y-4">
              {firstSponsor ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-300">قسم الكفيل الأول (المتنازل)</div>
                      <p className="text-[11px] text-zinc-400 m-0 mt-0.5">
                        بيانات مستقلة ومحفوظة بدقة لحفظ حقوق المكتب والكفيل الأصلي.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-400 text-black">
                      {firstSponsor.settlementStatus || 'معلق'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-zinc-400">اسم الكفيل الأول:</div>
                      <div className="text-sm font-bold text-white">{firstSponsor.sponsorName}</div>
                      <div className="text-xs text-zinc-400 font-mono">هوية: {firstSponsor.nationalIdOrIqama}</div>
                      <div className="text-xs text-zinc-400 font-mono">هاتف: {firstSponsor.phoneNumber}</div>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-zinc-400">التفاصيل المالية للكفيل الأول:</div>
                      <div className="text-xs text-zinc-300">
                        المبلغ المستحق له: <strong className="text-emerald-400 font-mono">{firstSponsor.financialClaimAmount ? `${firstSponsor.financialClaimAmount.toLocaleString('ar-SA')} ⃁` : 'لا توجد مطالبات'}</strong>
                      </div>
                      <div className="text-xs text-zinc-300">
                        سبب الإعادة / التنازل: <strong>{firstSponsor.returnReason || 'غير محدد'}</strong>
                      </div>
                      <div className="text-xs text-zinc-300">
                        حالة الضمان: <strong>{firstSponsor.warrantyStatus || 'خارج الضمان'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-black/40 rounded-xl border border-white/5 text-xs text-zinc-400">
                  العاملة مستقدمة جديدة ولم تسجل لها كفالة أولى سابقة داخل النظام.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Movement Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 m-0">
                <History className="w-4 h-4 text-amber-400" />
                <span>سجل المخطط الزمني الكامل للعاملة:</span>
              </h3>

              {movementTimeline.length === 0 ? (
                <div className="p-8 text-center bg-black/40 rounded-xl border border-white/5 text-xs text-zinc-400">
                  لا توجد حركات مسجلة حتى الآن.
                </div>
              ) : (
                <div className="relative pr-6 border-r-2 border-white/10 space-y-4 pt-2">
                  {movementTimeline.map((m: WorkerMovementTimeline) => (
                    <div key={m.id} className="relative">
                      <span className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#14181c] border-4 border-amber-400" />
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-xs text-white">{m.movementType}</span>
                          <span className="text-[10.5px] text-zinc-400 font-mono">
                            {new Date(m.eventDateTime).toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 m-0 leading-relaxed">{m.description}</p>
                        <div className="text-[10px] text-zinc-400 pt-1 flex items-center gap-3">
                          <span>المسؤول: {m.actorEmployee}</span>
                          {m.officeId && <span>المكتب: {m.officeId}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Client Trials History */}
          {activeTab === 'trials' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 m-0">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>سجل تجارب العملاء ونقل الخدمات:</span>
              </h3>

              {transferTrials.length === 0 ? (
                <div className="p-8 text-center bg-black/40 rounded-xl border border-white/5 text-xs text-zinc-400">
                  لم تخض هذه العاملة أي تجارب عملاء سابقة حتى الآن (0 تجارب).
                </div>
              ) : (
                <div className="space-y-3">
                  {transferTrials.map((t: TransferCase) => {
                    const execOffice = GROUP_COMPANIES.find(c => c.id === t.executingOfficeId);
                    return (
                      <div key={t.id} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{t.newClientName}</span>
                            <span className="font-mono text-[11px] text-zinc-400">({t.newClientPhone})</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            t.transferStatus === 'تم نقل الخدمات' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : t.transferStatus === 'عادت من العميل' 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {t.transferStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-300">
                          <div>المكتب المنفذ: <strong className="text-white">{execOffice?.name || t.executingOfficeId}</strong></div>
                          <div>التكلفة المتفق عليها: <strong className="text-emerald-400 font-mono">{t.transferFee.toLocaleString('ar-SA')} ⃁</strong></div>
                          <div>مدة التجربة: <strong className="text-white">{t.followupDaysDuration} أيام</strong></div>
                          <div>القرار: <strong className="text-amber-300">{t.clientDecision}</strong></div>
                        </div>

                        {t.returnReason && (
                          <div className="p-2.5 rounded-lg bg-rose-950/40 text-rose-200 text-xs border border-rose-500/30">
                            <strong>سبب الإرجاع:</strong> {t.returnReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-full text-xs font-bold text-[#141414] bg-[#ffffff] border border-[#e0e0e0] hover:bg-[#e5e5e5] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#141414]" />
            <span>طباعة السيرة الذاتية (CV)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-bold text-[#141414] bg-[#ffffff] border border-[#e0e0e0] hover:bg-[#e5e5e5] transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            {worker.operationalStatus === 'متاحة لنقل الخدمات' && onBookTransfer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookTransfer(worker);
                }}
                className="px-5 py-2 rounded-full text-xs font-bold text-[#ffffff] bg-[#141414] hover:bg-[#262626] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#ffffff]" />
                <span>بدء حجز ونقل خدمات لعميل</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfileDetailModal;
