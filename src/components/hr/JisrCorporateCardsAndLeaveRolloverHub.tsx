import React, { useEffect, useState } from 'react';
import {
  Banknote,
  CalendarClock,
  CreditCard,
  Lock,
  Plus,
  QrCode,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  authorizeAndRecordCardSpend,
  executeInServiceLeaveEncashment,
  executeYearEndLeaveCarryover,
  issueCorporateCard,
  toggleCorporateCardFreeze,
  type CorporateCardRecord,
  type CorporateCardTxRecord,
  type LeaveCarryoverRunRecord,
  type LeaveEncashmentRecord,
} from '../../services/jisrSpendCardsAndAttendanceCutoffEngine';

export interface CardLeaveEmployeeLite {
  id: string;
  name: string;
  department: string;
  leaveBalanceDays: number;
  monthlyWageSar: number;
}

interface JisrCorporateCardsAndLeaveRolloverHubProps {
  companyId: string;
  employees: CardLeaveEmployeeLite[];
  onDataChanged?: () => void;
}

export const JisrCorporateCardsAndLeaveRolloverHub: React.FC<
  JisrCorporateCardsAndLeaveRolloverHubProps
> = ({ companyId, employees, onDataChanged }) => {
  const effectiveCompanyId = companyId === 'all' || companyId === 'ALL' ? 'SAF' : companyId;
  const [subTab, setSubTab] = useState<'CARDS' | 'LEAVE_CARRYOVER' | 'ENCASHMENT'>('CARDS');

  const [cards, setCards] = useState<CorporateCardRecord[]>([]);
  const [cardTxs, setCardTxs] = useState<CorporateCardTxRecord[]>([]);
  const [carryovers, setCarryovers] = useState<LeaveCarryoverRunRecord[]>([]);
  const [encashments, setEncashments] = useState<LeaveEncashmentRecord[]>([]);

  // Card issuance state
  const [cardEmpId, setCardEmpId] = useState<string>(employees[0]?.id || '');
  const [cardType, setCardType] = useState<'VIRTUAL' | 'PHYSICAL'>('VIRTUAL');
  const [dailyLimit, setDailyLimit] = useState<number>(2000);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(20000);
  const [allowedMccsInput, setAllowedMccsInput] = useState<string>('5812,5999,7372');

  // Swipe / ZATCA QR Simulator
  const [activeCardId, setActiveCardId] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('مكتبة جرير — مستلزمات مكتبية');
  const [merchantMcc, setMerchantMcc] = useState<string>('5999');
  const [swipeAmount, setSwipeAmount] = useState<number>(575);
  const [zatcaQrInput, setZatcaQrInput] = useState<string>('');

  // Year-end carryover state
  const [fiscalYear, setFiscalYear] = useState<number>(2026);
  const [carryCapDays, setCarryCapDays] = useState<number>(30);

  // Leave Encashment state
  const [encEmpId, setEncEmpId] = useState<string>(employees[0]?.id || '');
  const [encDays, setEncDays] = useState<number>(5);

  const loadAll = async () => {
    const [cList, txList, coList, enList] = await Promise.all([
      realErpDataStore.getRecords<CorporateCardRecord>('hr_corporate_cards', []),
      realErpDataStore.getRecords<CorporateCardTxRecord>('hr_corporate_card_transactions', []),
      realErpDataStore.getRecords<LeaveCarryoverRunRecord>('hr_leave_carryover_runs', []),
      realErpDataStore.getRecords<LeaveEncashmentRecord>('hr_leave_encashments', []),
    ]);
    const filteredCards = (cList || []).filter((c) => c.company_id === effectiveCompanyId);
    setCards(filteredCards);
    if (!activeCardId && filteredCards.length > 0) setActiveCardId(filteredCards[0].id);
    setCardTxs((txList || []).filter((t) => t.company_id === effectiveCompanyId));
    setCarryovers((coList || []).filter((r) => r.company_id === effectiveCompanyId));
    setEncashments((enList || []).filter((r) => r.company_id === effectiveCompanyId));
  };

  useEffect(() => {
    void loadAll();
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (!cardEmpId && employees.length > 0) setCardEmpId(employees[0].id);
    if (!encEmpId && employees.length > 0) setEncEmpId(employees[0].id);
  }, [employees, cardEmpId, encEmpId]);

  const handleIssueCard = async () => {
    const emp = employees.find((e) => e.id === cardEmpId) || employees[0];
    if (!emp) return;
    const mccs = allowedMccsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const created = await issueCorporateCard({
      companyId: effectiveCompanyId,
      employeeId: emp.id,
      employeeName: emp.name,
      cardType,
      dailyLimitSar: dailyLimit,
      monthlyLimitSar: monthlyLimit,
      allowedMccs: mccs,
    });
    setActiveCardId(created.id);
    await loadAll();
    notificationPopupEngine.success(
      'تم إصدار البطاقة المؤسسية',
      `بطاقة (${created.masked_pan}) للموظف ${emp.name} بحد شهري ⃁ ${created.monthly_limit_sar.toLocaleString()}.`
    );
  };

  const handleToggleFreeze = async (card: CorporateCardRecord) => {
    await toggleCorporateCardFreeze(card);
    await loadAll();
  };

  const handleAuthorizeSwipe = async () => {
    const targetCard = cards.find((c) => c.id === activeCardId) || cards[0];
    if (!targetCard) {
      notificationPopupEngine.error('لا توجد بطاقة محددة', 'قم بإصدار بطاقة للموظف أولاً.');
      return;
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    const safePostingDate = todayIso < '2026-07-01' ? '2026-08-25' : todayIso;
    const res = await authorizeAndRecordCardSpend({
      card: targetCard,
      merchantName,
      mcc: merchantMcc,
      grossAmountSar: swipeAmount,
      zatcaQrRaw: zatcaQrInput.trim() || undefined,
      entryDateIso: safePostingDate,
      existingTransactions: cardTxs,
    });
    await loadAll();
    onDataChanged?.();

    if (res.approved) {
      notificationPopupEngine.success(
        'تم تفويض عملية البطاقة وترحيل قيدها',
        `مبلغ ⃁ ${res.transaction.gross_amount_sar.toLocaleString()} (ضريبة ⃁ ${res.transaction.vat_amount_sar.toLocaleString()}) لدى ${res.transaction.merchant_name}.`
      );
    } else {
      notificationPopupEngine.error(
        `تم رفض العملية (${res.transaction.authorization_status})`,
        res.transaction.decline_reason || 'تجاوز ضوابط البطاقة'
      );
    }
  };

  const handleRunCarryover = async () => {
    const run = await executeYearEndLeaveCarryover({
      companyId: effectiveCompanyId,
      fiscalYear,
      maxCarryoverCapDays: carryCapDays,
      employees: employees.map((e) => ({
        id: e.id,
        name: e.name,
        currentBalanceDays: e.leaveBalanceDays,
      })),
    });
    await loadAll();
    onDataChanged?.();
    notificationPopupEngine.success(
      'اكتمل ترحيل أرصدة الإجازات بنهاية العام',
      `المرحل: ${run.total_carried_days} يوماً | المسقط عن السقف (${carryCapDays}): ${run.total_forfeited_days} يوماً.`
    );
  };

  const handleEncashLeave = async () => {
    const emp = employees.find((e) => e.id === encEmpId) || employees[0];
    if (!emp) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const safePostingDate = todayIso < '2026-07-01' ? '2026-08-25' : todayIso;
    try {
      const res = await executeInServiceLeaveEncashment({
        companyId: effectiveCompanyId,
        employeeId: emp.id,
        employeeName: emp.name,
        currentBalanceDays: emp.leaveBalanceDays,
        daysToEncash: encDays,
        monthlyWageSar: emp.monthlyWageSar,
        entryDateIso: safePostingDate,
      });
      await loadAll();
      onDataChanged?.();
      notificationPopupEngine.success(
        'تم تسييل رصيد الإجازة نقداً وترحيل القيد',
        `صرف ⃁ ${res.encashment.total_payout_sar.toLocaleString()} مقابل ${res.encashment.days_encashed} أيام للموظف ${emp.name}.`
      );
    } catch (err) {
      notificationPopupEngine.error(
        'تعذر تسييل الإجازة',
        err instanceof Error ? err.message : 'تحقق من الرصيد المتاح'
      );
    }
  };

  return (
    <div className="space-y-5 font-['Cairo']" dir="rtl">
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#141414] m-0">
            بطاقات المصروفات المؤسسية وسقوف الإنفاق + ترحيل وتسييل الإجازات
          </h2>
          <p className="text-xs text-[#707070] m-0 mt-1">
            إصدار وتجميد البطاقات الافتراضية والفعلية بضوابط MCC وقراءة ZATCA QR، مع ترحيل نهاية العام وتسييل رصيد الإجازة نقداً.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'CARDS' as const, label: 'البطاقات المؤسسية (Spend Cards)', icon: CreditCard },
            { id: 'LEAVE_CARRYOVER' as const, label: 'ترحيل نهاية العام للإجازات', icon: CalendarClock },
            { id: 'ENCASHMENT' as const, label: 'تسييل رصيد الإجازات (Cash-Out)', icon: Banknote },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  subTab === t.id
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {subTab === 'CARDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card Issuance & Swipe Gate */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <h3 className="text-sm font-black text-[#141414] m-0">إصدار بطاقة مصروفات جديدة</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">حامل البطاقة</label>
                  <select
                    value={cardEmpId}
                    onChange={(e) => setCardEmpId(e.target.value)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">نوع البطاقة</label>
                  <select
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as 'VIRTUAL' | 'PHYSICAL')}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                  >
                    <option value="VIRTUAL">افتراضية (Virtual)</option>
                    <option value="PHYSICAL">بلاستيكية فعلية (Physical)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">الحد اليومي (⃁)</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">الحد الشهري (⃁)</label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(Number(e.target.value))}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  أكواد الأنشطة المسموحة (MCCs مفصولة بفاصلة)
                </label>
                <input
                  type="text"
                  value={allowedMccsInput}
                  onChange={(e) => setAllowedMccsInput(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
              <button
                type="button"
                onClick={handleIssueCard}
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار وتفعيل البطاقة فوراً</span>
              </button>
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                <span>تسجيل عملية صرف بالبطاقة والتحقق من ZATCA QR</span>
              </h3>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">البطاقة</label>
                <select
                  value={activeCardId}
                  onChange={(e) => setActiveCardId(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.masked_pan} — {c.employee_name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">اسم التاجر</label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">MCC</label>
                  <input
                    type="text"
                    value={merchantMcc}
                    onChange={(e) => setMerchantMcc(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">المبلغ شامل الضريبة (⃁)</label>
                  <input
                    type="number"
                    value={swipeAmount}
                    onChange={(e) => setSwipeAmount(Number(e.target.value))}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">نص ZATCA QR TLV (اختياري)</label>
                  <input
                    type="text"
                    value={zatcaQrInput}
                    onChange={(e) => setZatcaQrInput(e.target.value)}
                    dir="ltr"
                    placeholder="Base64 TLV..."
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAuthorizeSwipe}
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                تفويض العملية وترحيل قيد VAT تلقائياً
              </button>
            </div>
          </div>

          {/* Active Cards & Transaction Log */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-[#141414] m-0">
                  البطاقات المصدرة وسقوف الصرف ({cards.length})
                </h3>
                <ExportDropdown
                  sectionKey="hr_corporate_cards"
                  data={cards}
                  buttonLabel="تصدير البطاقات"
                />
              </div>

              {cards.length === 0 ? (
                <div className="rounded-[16px] bg-[#f3f3f3] p-5 text-center text-xs text-[#707070]">
                  لا توجد بطاقات مؤسسية مصدرة حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-[#141414]">{c.masked_pan}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleFreeze(c)}
                          className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {c.status === 'ACTIVE' ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>تجميد فوري</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>فك التجميد</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="font-bold text-[#141414]">
                        {c.employee_name} • {c.card_type} • {c.status}
                      </div>
                      <div className="text-[11px] text-[#707070]">
                        مصروف اليوم: ⃁ {c.spent_today_sar.toLocaleString()} / {c.daily_limit_sar.toLocaleString()} • الشهر: ⃁ {c.spent_month_sar.toLocaleString()} / {c.monthly_limit_sar.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <h3 className="text-sm font-black text-[#141414] m-0">
                حركات البطاقات والقيود التلقائية ({cardTxs.length})
              </h3>
              {cardTxs.length === 0 ? (
                <p className="text-xs text-[#707070] m-0">لا توجد حركات مسجلة بعد.</p>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  {cardTxs.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#141414]">
                          {tx.merchant_name} ({tx.employee_name})
                        </div>
                        <div className="text-[11px] text-[#707070]">
                          MCC {tx.mcc} • {tx.authorization_status}
                          {tx.decline_reason ? ` — ${tx.decline_reason}` : ''}
                        </div>
                      </div>
                      <div className="font-black text-[#141414]">
                        ⃁ {tx.gross_amount_sar.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'LEAVE_CARRYOVER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0">
              تنفيذ إقفال وترحيل أرصدة الإجازات بنهاية السنة المالية
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">السنة المالية</label>
                <input
                  type="number"
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(Number(e.target.value))}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الحد الأقصى للترحيل (أيام)</label>
                <input
                  type="number"
                  value={carryCapDays}
                  onChange={(e) => setCarryCapDays(Number(e.target.value))}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleRunCarryover}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
            >
              تشغيل ترحيل نهاية العام لعدد ({employees.length}) موظف
            </button>
          </div>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#141414] m-0">
                سجل دورات ترحيل الإجازات ({carryovers.length})
              </h3>
              <ExportDropdown
                sectionKey="hr_leave_carryover_runs"
                data={carryovers}
                buttonLabel="تصدير السجل"
              />
            </div>
            {carryovers.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-5 text-center text-xs text-[#707070]">
                لم يتم تشغيل دورة ترحيل سنوية بعد.
              </div>
            ) : (
              <div className="space-y-2">
                {carryovers.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-[#141414]">
                        السنة {r.fiscal_year} — سقف {r.max_carryover_cap_days} يوماً ({r.employee_count} موظف)
                      </div>
                      <div className="text-[11px] text-[#707070]">
                        المرحل: {r.total_carried_days} يوماً • المسقط: {r.total_forfeited_days} يوماً
                      </div>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-[#141414]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'ENCASHMENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0">
              تسييل رصيد الإجازة السنوية نقداً (In-Service Encashment)
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">الموظف والرصيد</label>
              <select
                value={encEmpId}
                onChange={(e) => setEncEmpId(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — الرصيد: {e.leaveBalanceDays} يوماً (الأجر ⃁ {e.monthlyWageSar.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">عدد الأيام المطلوب تسييلها</label>
              <input
                type="number"
                min={1}
                value={encDays}
                onChange={(e) => setEncDays(Number(e.target.value))}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
            </div>
            <button
              type="button"
              onClick={handleEncashLeave}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
            >
              اعتماد تسييل الرصيد وترحيل قيد 530101 / 210201
            </button>
          </div>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0">
              سجل عمليات تسييل الإجازات ({encashments.length})
            </h3>
            {encashments.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-5 text-center text-xs text-[#707070]">
                لا توجد عمليات تسييل مسجلة حتى الآن.
              </div>
            ) : (
              <div className="space-y-2">
                {encashments.map((en) => (
                  <div
                    key={en.id}
                    className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-[#141414]">{en.employee_name}</div>
                      <div className="text-[11px] text-[#707070]">
                        {en.days_encashed} يوماً × ⃁ {en.daily_rate_sar} • المتبقي: {en.remaining_balance_after} يوماً
                      </div>
                    </div>
                    <div className="font-black text-[#141414]">
                      ⃁ {en.total_payout_sar.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
