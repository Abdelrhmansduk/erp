import React, { useState } from 'react';
import { 
  Phone, MessageSquare, Clock, AlertTriangle, CheckCircle2, 
  RotateCcw, Search, Filter, Building2, Calendar, User, 
  ExternalLink, ArrowRight, ShieldCheck, ChevronDown, DollarSign
} from 'lucide-react';
import { 
  TransferCase, 
  ClientFollowUp, 
  GROUP_OFFICES, 
  GroupOfficeId,
  FollowUpAlertLevel 
} from '../../types/shelterTransferSuite';
import { shelterTransferStore } from '../../services/shelterTransferStore';

interface DailyFollowUpHubProps {
  onRefresh: () => void;
  onOpenWorkerProfile: (workerId: string) => void;
}

export const DailyFollowUpHub: React.FC<DailyFollowUpHubProps> = ({ onRefresh, onOpenWorkerProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('ALL');
  const [filterAlert, setFilterAlert] = useState<'ALL' | 'red' | 'yellow' | 'green'>('ALL');
  
  // Modals state
  const [selectedTransfer, setSelectedTransfer] = useState<TransferCase | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Form states for contact modal
  const [contactResult, setContactResult] = useState<ClientFollowUp['contactResult']>('راضي ومستمر بالتجربة');
  const [contactFeedback, setContactFeedback] = useState('');
  const [requiredActionToday, setRequiredActionToday] = useState('');
  const [nextContactDate, setNextContactDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [employeeName, setEmployeeName] = useState('سارة القحطاني');

  // Form states for approval modal
  const [govRefNo, setGovRefNo] = useState('');
  const [transferRequestDate, setTransferRequestDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Form states for return modal
  const [returnReason, setReturnReason] = useState('عدم رغبة العميل في الاستمرار');
  const [actualTrialDays, setActualTrialDays] = useState(3);
  const [deductionAmount, setDeductionAmount] = useState(450);
  const [refundAmount, setRefundAmount] = useState(4550);
  const [settlementStatus, setSettlementStatus] = useState<'تمت التسوية' | 'معلق' | 'نزاع'>('تمت التسوية');
  const [nextAction, setNextAction] = useState<'متاحة لنقل الخدمات' | 'تحت التقييم' | 'مرحلة الترحيل'>('متاحة لنقل الخدمات');

  const allTransfers = shelterTransferStore.getTransferCases();
  const activeTrials = allTransfers.filter(t => t.transferStatus === 'خرجت للعميل' || t.transferStatus === 'بانتظار نقل الخدمات');

  // Filter transfers
  const filteredTrials = activeTrials.filter(t => {
    const worker = shelterTransferStore.getWorkerById(t.workerId);
    const workerName = worker?.fullNameAr || '';
    const matchSearch = 
      workerName.includes(searchQuery) ||
      t.newClientName.includes(searchQuery) ||
      t.newClientPhone.includes(searchQuery) ||
      t.transferCode.includes(searchQuery);

    const matchOffice = selectedOffice === 'ALL' || t.executingOfficeId === selectedOffice;
    const { alertLevel } = shelterTransferStore.calculateFollowupStatus(t);
    const matchAlert = filterAlert === 'ALL' || alertLevel === filterAlert;

    return matchSearch && matchOffice && matchAlert;
  });

  // Handle logging contact
  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    shelterTransferStore.recordFollowUp({
      transferCaseId: selectedTransfer.id,
      contactedPerson: selectedTransfer.newClientName,
      contactChannel: 'اتصال هاتفي',
      contactResult,
      clientFeedback: contactFeedback,
      requiredActionToday,
      nextContactDate,
      actorEmployee: employeeName,
    });

    setShowContactModal(false);
    onRefresh();
  };

  // Handle client approval -> government transfer
  const handleApproveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    shelterTransferStore.approveAndCompleteTransfer({
      transferCaseId: selectedTransfer.id,
      transferRequestDate: transferRequestDate,
      govRefNo: govRefNo,
      actorEmployee: 'مشرف نقل الخدمات',
      markAsFullyCompleted: true,
    });

    setShowApprovalModal(false);
    onRefresh();
  };

  // Handle return to shelter
  const handleReturnToShelter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    shelterTransferStore.returnWorkerToShelter({
      transferCaseId: selectedTransfer.id,
      returnReason,
      actualTrialDays,
      deductionAmount,
      refundAmount,
      settlementStatus,
      nextAction,
      actorEmployee: 'مشرف المتابعة الميداني',
    });

    setShowReturnModal(false);
    onRefresh();
  };

  return (
    <div className="space-y-4 text-[#141414] font-sans" dir="rtl">
      {/* Top Header Card - Dark Executive */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#ffffff] p-5 rounded-2xl border border-[#e0e0e0] shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#141414] m-0">
              مركز المتابعة اليومية وحالات التجربة النشطة
            </h3>
          </div>
          <p className="text-xs text-[#707070] mt-1 m-0">
            تنبيهات فورية ملونة لحالات التجربة لضمان التواصل اليومي قبل انتهاء المهلة، وتوثيق قرارات النقل أو الإرجاع.
          </p>
        </div>

        {/* Priority Counts Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterAlert('red')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterAlert === 'red'
                ? 'bg-[#141414] text-[#ffffff] shadow-md  font-bold'
                : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#eaeaea]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#141414]" />
            <span>حالات متأخرة ({activeTrials.filter(t => shelterTransferStore.calculateFollowupStatus(t).alertLevel === 'red').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterAlert('yellow')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterAlert === 'yellow'
                ? 'bg-[#141414] text-[#ffffff] shadow-md  font-bold'
                : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#eaeaea]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#141414]" />
            <span>تنتهي قريباً ({activeTrials.filter(t => shelterTransferStore.calculateFollowupStatus(t).alertLevel === 'yellow').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterAlert('green')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterAlert === 'green'
                ? 'bg-[#141414] text-[#ffffff] shadow-md font-bold'
                : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#eaeaea]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#141414]" />
            <span>جارية طبيعية ({activeTrials.filter(t => shelterTransferStore.calculateFollowupStatus(t).alertLevel === 'green').length})</span>
          </button>

          {filterAlert !== 'ALL' && (
            <button
              type="button"
              onClick={() => setFilterAlert('ALL')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#707070] hover:text-[#141414] hover:bg-[#f3f3f3] transition-all cursor-pointer"
            >
              عرض الكل
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#ffffff] p-3 rounded-2xl border border-[#e0e0e0] shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم العاملة، العميل، الجوال، كود العملية..."
            className="w-full pr-10 pl-4 py-2 text-xs rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] outline-none focus:border-[#141414] text-[#141414] placeholder-zinc-500"
          />
        </div>

        {/* Office Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-[#707070] whitespace-nowrap">المكتب المنفذ:</span>
          <select
            value={selectedOffice}
            onChange={e => setSelectedOffice(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] outline-none font-bold text-[#141414] cursor-pointer"
          >
            <option value="ALL" className="bg-[#ffffff] text-[#141414]">جميع المكاتب الأربعة</option>
            <option value="SAF" className="bg-[#ffffff] text-[#141414]">مكتب السفير / الصفا</option>
            <option value="DAR" className="bg-[#ffffff] text-[#141414]">دار الرواد</option>
            <option value="TOP" className="bg-[#ffffff] text-[#141414]">توباز / توب تالنت</option>
            <option value="YAQ" className="bg-[#ffffff] text-[#141414]">ياقوت الشرقية</option>
          </select>
        </div>
      </div>

      {/* Table of Active Cases */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#e0e0e0] shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#f3f3f3]/50 border-b border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                <th className="p-3.5">حالة التنبيه والمهلة</th>
                <th className="p-3.5">العاملة والمكتب الأصلي</th>
                <th className="p-3.5">العميل والتواصل</th>
                <th className="p-3.5">المكتب المنفذ والقيمة</th>
                <th className="p-3.5">تاريخ التسليم والنهاية</th>
                <th className="p-3.5">آخر تواصل والمطلوب</th>
                <th className="p-3.5 text-center">الإجراءات التشغيلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] text-xs text-[#141414]">
              {filteredTrials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-[#707070]">
                    <CheckCircle2 className="w-10 h-10 text-[#141414] mx-auto mb-2 opacity-60" />
                    <p className="font-bold text-sm text-[#141414] m-0">لا توجد حالات مطابقة للبحث أو الفلتر المختار</p>
                    <p className="text-xs text-[#707070] mt-1 m-0">جميع العاملات الخارجات للعملاء متابعة ومحدثة بالكامل.</p>
                  </td>
                </tr>
              ) : (
                filteredTrials.map(transfer => {
                  const worker = shelterTransferStore.getWorkerById(transfer.workerId);
                  const followups = shelterTransferStore.getClientFollowUps(transfer.id);
                  const latestFollowup = followups[0];
                  const { remainingDays, alertLevel, statusLabel, isOverdue } = shelterTransferStore.calculateFollowupStatus(transfer);
                  const origOffice = GROUP_OFFICES[transfer.originalOfficeId];
                  const execOffice = GROUP_OFFICES[transfer.executingOfficeId];

                  return (
                    <tr 
                      key={transfer.id}
                      className={`hover:bg-[#f3f3f3] transition-colors ${
                        alertLevel === 'red' ? 'bg-[#f3f3f3]' : (alertLevel === 'yellow' ? 'bg-[#f3f3f3]' : '')
                      }`}
                    >
                      {/* Alert status & Remaining Days */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold text-[10.5px] w-fit shadow-2xs ${
                            alertLevel === 'red'
                              ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                              : (alertLevel === 'yellow'
                                ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                                : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]')
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              alertLevel === 'red' ? 'bg-[#141414] animate-ping' : (alertLevel === 'yellow' ? 'bg-[#141414]' : 'bg-[#141414]')
                            }`} />
                            <span>{statusLabel}</span>
                          </span>
                          <span className="text-[10px] text-[#707070] font-mono">
                            {transfer.transferCode}
                          </span>
                        </div>
                      </td>

                      {/* Worker & Original Office */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onOpenWorkerProfile(transfer.workerId)}
                              className="font-bold text-[#141414] hover:text-[#141414] text-xs truncate block text-right cursor-pointer"
                            >
                              {worker?.fullNameAr || 'العاملة'}
                            </button>
                            <div className="text-[10px] text-[#707070] flex items-center gap-1 mt-0.5">
                              <span>المكتب الأصلي:</span>
                              <span 
                                className="font-bold px-1.5 py-0.2 rounded bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]"
                              >
                                {origOffice?.name || transfer.originalOfficeId}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client Info */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[#141414] text-xs">{transfer.newClientName}</span>
                          <span className="text-[10.5px] font-mono text-[#707070] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#707070]" />
                            <span>{transfer.newClientPhone}</span>
                          </span>
                        </div>
                      </td>

                      {/* Executing Office & Price */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span 
                            className="text-[10.5px] font-bold px-1.5 py-0.5 rounded w-fit bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]"
                          >
                            {execOffice?.name || transfer.executingOfficeId}
                          </span>
                          <span className="font-bold text-[#141414] font-mono text-[11px] mt-0.5">
                            {transfer.transferFee.toLocaleString()} ⃁
                          </span>
                          <span className="text-[10px] text-[#707070]">
                            مسدد: {transfer.downPayment.toLocaleString()} ⃁
                          </span>
                        </div>
                      </td>

                      {/* Delivery Date & End Date */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="text-[#141414]">
                            <strong className="text-[#707070]">التسليم:</strong> {transfer.deliveryDateTime ? new Date(transfer.deliveryDateTime).toLocaleDateString('ar-SA') : '—'}
                          </span>
                          <span className="text-[#141414]">
                            <strong className="text-[#707070]">النهاية:</strong> {transfer.followupEndDate || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Latest Followup Note */}
                      <td className="p-3.5 max-w-[200px]">
                        {latestFollowup ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-[#141414] text-[11px] truncate">
                              {latestFollowup.contactResult}
                            </span>
                            <span className="text-[10.5px] text-[#707070] line-clamp-2 leading-relaxed">
                              {latestFollowup.clientFeedback}
                            </span>
                            <span className="text-[9.5px] text-[#707070] mt-0.5">
                              المسؤول: {latestFollowup.employeeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#707070] text-[10.5px] italic">لم تسجل متابعة بعد</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col gap-1.5 items-center">
                          {/* 1. Log Contact */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowContactModal(true);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#eaeaea] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#141414]" />
                            <span>تسجيل متابعة</span>
                          </button>

                          {/* 2. Client Approval */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowApprovalModal(true);
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#eaeaea] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" />
                            <span>موافقة النقل</span>
                          </button>

                          {/* 3. Return to Shelter */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowReturnModal(true);
                            }}
                            className="w-full px-3 py-1 rounded-xl text-[#707070] hover:text-[#141414] hover:bg-[#eaeaea] text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-[#141414]" />
                            <span>إرجاع وتسوية</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD DAILY CONTACT & FOLLOW-UP                                  */}
      {/* ========================================================================= */}
      {showContactModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] text-[#141414] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <div>
                <h4 className="text-base font-bold text-[#141414] m-0">
                  تسجيل نتيجة اتصال ومتابعة مع العميل
                </h4>
                <p className="text-xs text-[#707070] m-0 mt-0.5">
                  العميل: <strong className="text-[#141414]">{selectedTransfer.newClientName}</strong> ({selectedTransfer.newClientPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5] flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1">نتيجة التواصل:</label>
                <select
                  value={contactResult}
                  onChange={e => setContactResult(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] font-bold outline-none focus:border-[#141414]"
                >
                  <option value="راضي ومستمر بالتجربة" className="bg-[#ffffff] text-[#141414]">راضي ومستمر بالتجربة</option>
                  <option value="ملاحظات تدريبية بسيطة" className="bg-[#ffffff] text-[#141414]">ملاحظات تدريبية بسيطة</option>
                  <option value="موافق تماماً على نقل الخدمات" className="bg-[#ffffff] text-[#141414]">موافق تماماً على نقل الخدمات</option>
                  <option value="يرغب بإرجاع العاملة" className="bg-[#ffffff] text-[#141414]">يرغب بإرجاع العاملة</option>
                  <option value="لم يرد / معاودة الاتصال" className="bg-[#ffffff] text-[#141414]">لم يرد / معاودة الاتصال</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">تفاصيل وملاحظات العميل بالتفصيل:</label>
                <textarea
                  rows={3}
                  value={contactFeedback}
                  onChange={e => setContactFeedback(e.target.value)}
                  placeholder="سجل ما ذكره العميل خلال المكالمة بدقة..."
                  className="w-full p-2.5 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] outline-none focus:border-[#141414] placeholder-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">الإجراء المطلوب تنفيذه اليوم:</label>
                <input
                  type="text"
                  value={requiredActionToday}
                  onChange={e => setRequiredActionToday(e.target.value)}
                  placeholder="مثال: متابعة حسم القرار قبل الغد، أو توفير رقم الحساب..."
                  className="w-full p-2.5 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] outline-none focus:border-[#141414] placeholder-zinc-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">موعد الاتصال القادم:</label>
                  <input
                    type="date"
                    value={nextContactDate}
                    onChange={e => setNextContactDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">الموظف المسؤول:</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={e => setEmployeeName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 rounded-xl text-[#141414] bg-[#f3f3f3] hover:bg-[#f3f3f3] border border-[#e0e0e0] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold shadow-md cursor-pointer"
                >
                  حفظ نتيجة المتابعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: APPROVE SPONSORSHIP TRANSFER                                     */}
      {/* ========================================================================= */}
      {showApprovalModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] text-[#141414] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <div>
                <h4 className="text-base font-bold text-[#141414] m-0">
                  توثيق موافقة العميل ونقل الخدمات
                </h4>
                <p className="text-xs text-[#707070] m-0 mt-0.5">
                  تحويل الحالة إلى "بانتظار نقل الخدمات" عبر منصة مساند
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5] flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApproveTransfer} className="space-y-3 text-xs">
              <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-[#141414]">
                <p className="font-bold m-0">العميل: {selectedTransfer.newClientName}</p>
                <p className="m-0 text-[11px] mt-1">
                  إجمالي قيمة نقل الخدمات: <strong className="font-mono text-[#141414]">{selectedTransfer.transferFee.toLocaleString()} ⃁</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">رقم طلب مساند / المرجع الحكومي:</label>
                <input
                  type="text"
                  value={govRefNo}
                  onChange={e => setGovRefNo(e.target.value)}
                  placeholder="مثال: MUS-TRF-2026-9901"
                  className="w-full p-2.5 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] font-mono outline-none focus:border-[#141414]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">تاريخ تقديم الطلب:</label>
                <input
                  type="date"
                  value={transferRequestDate}
                  onChange={e => setTransferRequestDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 rounded-xl text-[#141414] bg-[#f3f3f3] hover:bg-[#f3f3f3] border border-[#e0e0e0] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد اعتماد النقل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RETURN WORKER TO SHELTER & SETTLEMENT                           */}
      {/* ========================================================================= */}
      {showReturnModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] text-[#141414] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e0e0] space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <div>
                <h4 className="text-base font-bold text-[#141414] m-0">
                  إرجاع العاملة للسكن والتسوية المالية مع العميل
                </h4>
                <p className="text-xs text-[#707070] m-0 mt-0.5">
                  توثيق العودة للسكن المشترك، التسوية المالية، وزيادة عداد تجارب العاملة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] text-[#707070] hover:text-[#141414] hover:bg-[#e5e5e5] flex items-center justify-center cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReturnToShelter} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1">سبب إرجاع العاملة:</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="مثال: لم تتوافق مع نظام العائلة، حساسية من الحيوانات الأليفة..."
                  className="w-full p-2.5 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] outline-none focus:border-[#141414]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">الأيام عند العميل:</label>
                  <input
                    type="number"
                    value={actualTrialDays}
                    onChange={e => setActualTrialDays(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] font-bold"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">مبلغ الخصم (⃁):</label>
                  <input
                    type="number"
                    value={deductionAmount}
                    onChange={e => setDeductionAmount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">مبلغ الاسترداد (⃁):</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={e => setRefundAmount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] font-bold text-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">حالة التسوية المالية:</label>
                  <select
                    value={settlementStatus}
                    onChange={e => setSettlementStatus(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] font-bold outline-none"
                  >
                    <option value="تمت التسوية" className="bg-[#ffffff] text-[#141414]">تمت التسوية وتحويل المبلغ</option>
                    <option value="معلق" className="bg-[#ffffff] text-[#141414]">معلق بانتظار تحويل الحسابات</option>
                    <option value="نزاع" className="bg-[#ffffff] text-[#141414]">يوجد نزاع مالي قائم</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">حالة العاملة بعد الإرجاع:</label>
                  <select
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-[#e0e0e0] bg-[#f3f3f3] text-[#141414] font-bold outline-none"
                  >
                    <option value="متاحة لنقل الخدمات" className="bg-[#ffffff] text-[#141414]">متاحة للنقل فوراً (إعادة عرض)</option>
                    <option value="تحت التقييم" className="bg-[#ffffff] text-[#141414]">تحت التقييم بالسكن</option>
                    <option value="مرحلة الترحيل" className="bg-[#ffffff] text-[#141414]">مرحلة الترحيل والسفر</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-[#141414] text-[11px]">
                <strong>ملاحظة برمجية:</strong> سيتم حفظ كافة تفاصيل تجربة العميل <strong>{selectedTransfer.newClientName}</strong> في سجل العاملة الدائم ولن تحذف، كما سيزيد عداد تجارب العاملة تلقائياً.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 rounded-xl text-[#141414] bg-[#f3f3f3] hover:bg-[#f3f3f3] border border-[#e0e0e0] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>تأكيد الإرجاع للسكن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyFollowUpHub;
