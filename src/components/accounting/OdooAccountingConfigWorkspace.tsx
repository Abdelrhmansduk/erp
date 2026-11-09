import React, { useState } from 'react';
import {
  CheckCircle2,
  CalendarClock,
  Scale,
  Landmark,
  ArrowLeftRight,
  Sparkles,
  FileCheck,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import {
  odooAccountingConfigService,
  OdooPaymentTerm,
  OdooFiscalPosition,
  OdooReconciliationModel,
} from '../../services/accounting/odooAccountingConfigService';
import { CompanyId } from '../../types';
import { formatSarCurrency } from '../../utils/currencyFormat';
import { useAppStore } from '../../stores/appStore';

interface OdooAccountingConfigWorkspaceProps {
  companyId: CompanyId;
  companyName: string;
  onJournalPosted?: () => void;
}

export const OdooAccountingConfigWorkspace: React.FC<OdooAccountingConfigWorkspaceProps> = ({
  companyId,
  companyName,
  onJournalPosted,
}) => {
  const { addNotification } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<
    'payment-terms' | 'fiscal-positions' | 'recon-models'
  >('payment-terms');

  // 1. Payment Terms & Early Pay Discount state
  const [paymentTerms] = useState<OdooPaymentTerm[]>(() =>
    odooAccountingConfigService.getPaymentTerms()
  );
  const [selectedTermId, setSelectedTermId] = useState<string>('PT-NET30-2PCT');
  const [simInvoiceAmount, setSimInvoiceAmount] = useState<number>(25000);
  const [simCustomerName, setSimCustomerName] = useState<string>('شركة المدار للتشغيل والصيانة');
  const [simInvoiceRef, setSimInvoiceRef] = useState<string>('INV-B2B-2026-409');

  // 2. Fiscal Positions state
  const [fiscalPositions] = useState<OdooFiscalPosition[]>(() =>
    odooAccountingConfigService.getFiscalPositions()
  );
  const [selectedFpId, setSelectedFpId] = useState<string>('FP-CORPORATE-B2B-15');
  const [fpSimBaseAmount, setFpSimBaseAmount] = useState<number>(40000);
  const [fpPartnerName, setFpPartnerName] = useState<string>('مجموعة الخليج للمقاولات والتوريد');
  const [fpRefNumber, setFpRefNumber] = useState<string>('FP-TRX-2026-812');

  // 3. Bank Reconciliation Models state
  const [reconModels] = useState<OdooReconciliationModel[]>(() =>
    odooAccountingConfigService.getReconciliationModels()
  );
  const [bankFeedLines, setBankFeedLines] = useState([
    {
      id: 'BF-101',
      ref: 'SARIE-FEE-9921',
      date: '2026-08-12',
      label: 'SARIE TRANSFER BANK FEE - رسوم تحويل سريع للوكيل الخارجي',
      amountSar: 28.75,
      reconciled: false,
      postedEntryNo: '',
    },
    {
      id: 'BF-102',
      ref: 'MADA-POS-8834',
      date: '2026-08-14',
      label: 'MADA POS GATEWAY FEE - عمولة نقاط بيع مدى وسداد عقود الاستقدام',
      amountSar: 172.5,
      reconciled: false,
      postedEntryNo: '',
    },
    {
      id: 'BF-103',
      ref: 'FX-RND-7740',
      date: '2026-08-15',
      label: 'FX DIFF ROUNDING - فروق عملة وتقريب سداد مكتب مانيلا بالدولار',
      amountSar: 14.25,
      reconciled: false,
      postedEntryNo: '',
    },
  ]);

  const schedulePreview = odooAccountingConfigService.computeInstallmentSchedule(
    selectedTermId,
    simInvoiceAmount
  );

  const fpMappingPreview = odooAccountingConfigService.applyFiscalPositionMapping(
    selectedFpId,
    fpSimBaseAmount
  );

  const handlePostEarlyDiscount = () => {
    try {
      const res = odooAccountingConfigService.postEarlyPaymentDiscountCollection(companyId, {
        invoiceRef: simInvoiceRef,
        customerName: simCustomerName,
        invoiceTotalSar: simInvoiceAmount,
        discountPercent: schedulePreview.term.earlyDiscountPercent || 2,
      });
      onJournalPosted?.();
      addNotification({
        title: 'تم تحصيل الفاتورة وترحيل خصم السداد المبكر (Odoo v16+)',
        message: `تم ترحيل القيد المزدوج (${res.entryNumber}): تحصيل بنكي ${formatSarCurrency(res.cashReceivedSar)} + خصم تعجيل سداد ممنوح ${formatSarCurrency(res.discountGrantedSar)} = إقفال ذمة العميل ${formatSarCurrency(res.totalClearedReceivableSar)}.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر ترحيل قيد خصم السداد المبكر',
        message: err?.message || 'الفترة المالية مقفلة',
        type: 'warning',
      });
    }
  };

  const handlePostFiscalPositionEntry = () => {
    try {
      const res = odooAccountingConfigService.postFiscalPositionTransaction(companyId, {
        fpId: selectedFpId,
        baseAmountSar: fpSimBaseAmount,
        partnerName: fpPartnerName,
        referenceNumber: fpRefNumber,
      });
      onJournalPosted?.();
      addNotification({
        title: 'تم تطبيق الوضع الضريبي وترحيل القيد الآلي (Fiscal Position)',
        message: `تم ترحيل القيد (${res.entryNumber}) وفق الوضع [${res.mapping.fiscalPosition.code}] بصافي ${formatSarCurrency(res.mapping.baseAmountSar)} وضريبة ${formatSarCurrency(res.mapping.vatAmountSar)} على الحساب (${res.mapping.mappedLedgerAccount.code}).`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر ترحيل القيد الضريبي',
        message: err?.message || 'الفترة المالية مقفلة',
        type: 'warning',
      });
    }
  };

  const handleAutoReconcileLine = (lineId: string) => {
    const line = bankFeedLines.find((l) => l.id === lineId);
    if (!line || line.reconciled) return;
    const matchedModel =
      odooAccountingConfigService.matchBankStatementLine(line.label, line.amountSar) ||
      reconModels[0];

    try {
      const res = odooAccountingConfigService.executeReconciliationWriteOff(companyId, {
        modelId: matchedModel.id,
        statementRef: line.ref,
        statementLabel: line.label,
        totalWriteOffSar: line.amountSar,
      });
      setBankFeedLines((prev) =>
        prev.map((item) =>
          item.id === lineId
            ? { ...item, reconciled: true, postedEntryNo: res.entryNumber }
            : item
        )
      );
      onJournalPosted?.();
      addNotification({
        title: 'تمت المطابقة البنكية الآلية وترحيل قيد الشطب (Write-Off)',
        message: `تطبيق النموذج [${res.model.code}] وترحيل القيد (${res.entryNumber}): مصروف صافي ${formatSarCurrency(res.netExpenseSar)} + ضريبة مدخلات مستردة ${formatSarCurrency(res.inputVatSar)}.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تعذر تنفيذ نموذج المطابقة البنكية',
        message: err?.message || 'الفترة المالية مقفلة',
        type: 'warning',
      });
    }
  };

  return (
    <div className="space-y-6 motion-silk-enter">
      {/* Header Banner */}
      <div className="card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#141414] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-mint text-[11px]">ODOO 16+ ACCOUNTING AUTOMATION</span>
              <span className="pill-tag-shade text-[11px]">SOCPA · IFRS · ZATCA</span>
            </div>
            <h3 className="text-base font-bold text-[#141414] mt-1 mb-0">
              محرك التهيئة والأتمتة المحاسبية المتقدم ({companyName})
            </h3>
            <p className="text-xs text-[#707070] mt-0.5 mb-0">
              شروط السداد وخصم التعجيل الآلي (Payment Terms) · الأوضاع الضريبية التلقائية (Fiscal Positions) · نماذج المطابقة البنكية الذكية (Reconciliation Models)
            </p>
          </div>
        </div>

        {/* Sub-navigation Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            {
              id: 'payment-terms',
              label: '1. شروط السداد وخصم التعجيل (Payment Terms)',
              icon: CalendarClock,
            },
            {
              id: 'fiscal-positions',
              label: '2. الأوضاع الضريبية الآلية (Fiscal Positions)',
              icon: Scale,
            },
            {
              id: 'recon-models',
              label: '3. نماذج المطابقة البنكية (Reconciliation Models)',
              icon: Landmark,
            },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all motion-spring-press ${
                  isActive
                    ? 'bg-[#141414] text-white'
                    : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#e8e8e8]'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PILLAR 1: PAYMENT TERMS & EARLY PAYMENT DISCOUNT */}
      {activeSubTab === 'payment-terms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 motion-snap-enter">
          {/* Left: Configured Payment Terms Catalog */}
          <div className="lg:col-span-7 card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#141414] m-0">
                  دليل شروط السداد وجدولة الأقساط المعتمدة (Odoo Payment Terms)
                </h4>
                <p className="text-[11px] text-[#707070] mt-0.5 mb-0">
                  اختر شرط السداد لمعاينة جدول الاستحقاق واحتساب خصم السداد المبكر تلقائياً
                </p>
              </div>
              <span className="pill-tag-mint text-[11px]">{paymentTerms.length} شروط مفعلة</span>
            </div>

            <div className="space-y-3">
              {paymentTerms.map((pt) => {
                const isSelected = pt.id === selectedTermId;
                return (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedTermId(pt.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#f3f3f3] border-[#141414]'
                        : 'bg-white border-[#e0e0e0] hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#141414] text-white">
                          {pt.code}
                        </span>
                        <span className="text-xs font-bold text-[#141414]">{pt.nameAr}</span>
                      </div>
                      {pt.earlyDiscountPercent > 0 && (
                        <span className="pill-tag-mint text-[10.5px]">
                          خصم مبكر {pt.earlyDiscountPercent}% خلال {pt.earlyDiscountDays} أيام
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#707070] mt-1.5 mb-2">{pt.descriptionAr}</p>
                    <div className="flex items-center gap-2 flex-wrap text-[10.5px] font-mono text-[#141414]">
                      <span>حساب الخصم الممنوح: {pt.discountLossAccountCode}</span>
                      <span>·</span>
                      <span>حساب الخصم المكتسب: {pt.discountGainAccountCode}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live Installment & Early Discount Calculator + Auto-Post */}
          <div className="lg:col-span-5 card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <h4 className="text-sm font-bold text-[#141414] m-0">
                محاكي الأقساط وترحيل خصم السداد المبكر (Early Pay Discount)
              </h4>
              <p className="text-[11px] text-[#707070] mt-0.5 mb-0">
                يُنشئ القيد المحاسبي الثلاثي تلقائياً (البنك + خصم تعجيل الدفع + إقفال ذمة العميل)
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1">رقم الفاتورة المرجعي</label>
                <input
                  type="text"
                  value={simInvoiceRef}
                  onChange={(e) => setSimInvoiceRef(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 font-mono font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">اسم العميل / المنشأة</label>
                <input
                  type="text"
                  value={simCustomerName}
                  onChange={(e) => setSimCustomerName(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">إجمالي قيمة الفاتورة (⃁)</label>
                <input
                  type="number"
                  value={simInvoiceAmount}
                  onChange={(e) => setSimInvoiceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            {/* Installment Breakdown */}
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5 text-xs">
              <div className="font-bold text-[#141414] flex items-center justify-between">
                <span>جدول الدفعات المحتسب:</span>
                <span className="font-mono">{formatSarCurrency(schedulePreview.invoiceTotalSar)}</span>
              </div>
              {schedulePreview.installments.map((inst) => (
                <div
                  key={inst.sequence}
                  className="flex items-center justify-between py-1.5 border-b border-[#e0e0e0] last:border-b-0"
                >
                  <div>
                    <span className="font-bold text-[#141414] block">{inst.labelAr}</span>
                    <span className="text-[10.5px] text-[#707070] font-mono">
                      تاريخ الاستحقاق: {inst.dueDate} ({inst.percent}%)
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#141414]">
                    {formatSarCurrency(inst.amountSar)}
                  </span>
                </div>
              ))}

              {schedulePreview.earlyDiscountAmountSar > 0 && (
                <div className="pt-2 border-t border-[#141414]/20 space-y-1">
                  <div className="flex justify-between text-[#707070]">
                    <span>مهلة خصم التعجيل ({schedulePreview.term.earlyDiscountPercent}%):</span>
                    <span className="font-mono font-bold text-[#141414]">
                      حتى {schedulePreview.earlyDiscountEligibleUntil}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#707070]">
                    <span>قيمة خصم السداد المبكر (حساب 520102):</span>
                    <span className="font-mono font-bold text-[#141414]">
                      {formatSarCurrency(schedulePreview.earlyDiscountAmountSar)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#141414] pt-1">
                    <span>صافي التحصيل البنكي الفعلي (حساب 110201):</span>
                    <span className="font-mono">
                      {formatSarCurrency(schedulePreview.earlyNetPayableSar)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handlePostEarlyDiscount}
              className="button-primary-pill w-full justify-center motion-spring-press"
              style={{ padding: '10px 18px', fontSize: '12px' }}
            >
              <CheckCircle2 className="w-4 h-4 ml-1.5" />
              <span>تحصيل الفاتورة وترحيل قيد خصم السداد المبكر آلياً</span>
            </button>
          </div>
        </div>
      )}

      {/* PILLAR 2: FISCAL POSITIONS & AUTOMATIC TAX / ACCOUNT MAPPING */}
      {activeSubTab === 'fiscal-positions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 motion-snap-enter">
          <div className="lg:col-span-7 card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#141414] m-0">
                  مصفوفة الأوضاع الضريبية والمالية التلقائية (Odoo Fiscal Positions — ZATCA)
                </h4>
                <p className="text-[11px] text-[#707070] mt-0.5 mb-0">
                  تبديل آلي للضرائب والحسابات الدفترية حسب تصنيف العميل أو المورد دون تعديل يدوي في الفاتورة
                </p>
              </div>
              <span className="pill-tag-mint text-[11px]">{fiscalPositions.length} قواعد نشطة</span>
            </div>

            <div className="space-y-3">
              {fiscalPositions.map((fp) => {
                const isSelected = fp.id === selectedFpId;
                return (
                  <div
                    key={fp.id}
                    onClick={() => setSelectedFpId(fp.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#f3f3f3] border-[#141414]'
                        : 'bg-white border-[#e0e0e0] hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#141414] text-white">
                          {fp.code}
                        </span>
                        <span className="text-xs font-bold text-[#141414]">{fp.nameAr}</span>
                      </div>
                      <span className="pill-tag-shade text-[10.5px] font-mono">
                        VAT: {(fp.mappedVatRate * 100).toFixed(0)}%
                        {fp.isReverseCharge ? ' (Reverse Charge)' : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#707070] mt-1.5 mb-2">
                      شرط الاكتشاف التلقائي: {fp.autoDetectConditionAr}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-200/70 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                        <span className="text-[#707070]">تحويل الضريبة:</span>
                        <span className="font-bold text-[#141414]">{fp.mappedTaxLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                        <span className="text-[#707070]">تحويل الحساب:</span>
                        <span className="font-mono font-bold text-[#141414]">
                          {fp.sourceAccountCode} → {fp.mappedAccountCode}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Fiscal Position Simulator & Auto-Posting */}
          <div className="lg:col-span-5 card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <h4 className="text-sm font-bold text-[#141414] m-0">
                معاينة وترحيل المعاملة وفق الوضع الضريبي المختار
              </h4>
              <p className="text-[11px] text-[#707070] mt-0.5 mb-0">
                يطبق قاعدة التحويل الضريبي والحسابي ويرحل القيد المزدوج مباشرة
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1">رقم المرجع / المطالبة</label>
                <input
                  type="text"
                  value={fpRefNumber}
                  onChange={(e) => setFpRefNumber(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 font-mono font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">اسم الطرف (العميل / الجهة الحكومية / الوكيل الخارجي)</label>
                <input
                  type="text"
                  value={fpPartnerName}
                  onChange={(e) => setFpPartnerName(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1">المبلغ الأساسي قبل الضريبة (⃁)</label>
                <input
                  type="number"
                  value={fpSimBaseAmount}
                  onChange={(e) => setFpSimBaseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#707070]">الوضع الضريبي المطبق:</span>
                <span className="font-mono font-bold text-[#141414]">
                  {fpMappingPreview.fiscalPosition.code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">حساب الذمم / التسوية الموجه:</span>
                <span className="font-mono font-bold text-[#141414]">
                  {fpMappingPreview.mappedLedgerAccount.code} — {fpMappingPreview.mappedLedgerAccount.nameAr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">حساب الإيراد / المصروف الموجه:</span>
                <span className="font-mono font-bold text-[#141414]">
                  {fpMappingPreview.targetLineAccount.code}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#e0e0e0]">
                <span className="text-[#707070]">المبلغ الخاضع / الأساسي:</span>
                <span className="font-mono font-bold text-[#141414]">
                  {formatSarCurrency(fpMappingPreview.baseAmountSar)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#707070]">
                  ضريبة القيمة المضافة ({(fpMappingPreview.mappedVatRate * 100).toFixed(0)}%):
                </span>
                <span className="font-mono font-bold text-[#141414]">
                  {formatSarCurrency(fpMappingPreview.vatAmountSar)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[#141414] pt-1 border-t border-[#141414]/20">
                <span>الإجمالي النهائي للقيد:</span>
                <span className="font-mono">
                  {formatSarCurrency(fpMappingPreview.grossTotalSar)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePostFiscalPositionEntry}
              className="button-primary-pill w-full justify-center motion-spring-press"
              style={{ padding: '10px 18px', fontSize: '12px' }}
            >
              <ShieldCheck className="w-4 h-4 ml-1.5" />
              <span>اعتماد الوضع الضريبي وترحيل القيد المحاسبي</span>
            </button>
          </div>
        </div>
      )}

      {/* PILLAR 3: BANK RECONCILIATION MODELS (AUTO-MATCH & WRITE-OFF) */}
      {activeSubTab === 'recon-models' && (
        <div className="space-y-6 motion-snap-enter">
          {/* Active Models Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reconModels.map((model) => (
              <div
                key={model.id}
                className="card-pricing p-5 bg-white rounded-2xl border border-[#e0e0e0] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#141414] text-white">
                    #{model.matchingOrder} · {model.code}
                  </span>
                  <span className="pill-tag-mint text-[10.5px]">
                    حد الشطب الآلي: {formatSarCurrency(model.maxAmountSar, { decimals: 0 })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#141414] m-0">{model.nameAr}</h4>
                <div className="text-[11px] text-[#707070] space-y-1">
                  <div>
                    <strong>الكلمات المفتاحية:</strong>{' '}
                    <span className="font-mono text-[#141414]">
                      {model.labelKeywords.join(' | ')}
                    </span>
                  </div>
                  <div>
                    <strong>حساب الشطب الآلي:</strong>{' '}
                    <span className="font-mono font-bold text-[#141414]">
                      {model.writeOffAccountCode}
                    </span>
                  </div>
                  <div>
                    <strong>ضريبة المدخلات (15%):</strong>{' '}
                    <span>{model.includesRecoverableVat15 ? 'تُفصل وتُسترد آلياً (110801)' : 'بدون ضريبة (0%)'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bank Statement Feed Lines Waiting for Reconciliation Model Execution */}
          <div className="card-pricing p-6 bg-white rounded-3xl border border-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#141414]" />
                  <span>سطور كشف الحساب البنكي المكتشفة بواسطة نماذج المطابقة (Auto-Match Queue)</span>
                </h4>
                <p className="text-[11px] text-[#707070] mt-0.5 mb-0">
                  بدلاً من إنشاء قيد يدوي، يطابق النظام الكلمات المفتاحية والمبلغ ويرحل قيد الشطب والضريبة بضغطة واحدة
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">مرجع الكشف</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">بيان الحركة البنكية</th>
                    <th className="p-3">النموذج المطابق تلقائياً</th>
                    <th className="p-3 font-mono">المبلغ البنكي</th>
                    <th className="p-3 text-center">إجراء التسوية الآلية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {bankFeedLines.map((line) => {
                    const matched =
                      odooAccountingConfigService.matchBankStatementLine(
                        line.label,
                        line.amountSar
                      ) || reconModels[0];
                    return (
                      <tr key={line.id} className="hover:bg-zinc-50">
                        <td className="p-3 font-mono font-bold text-[#141414]">{line.ref}</td>
                        <td className="p-3 font-mono text-[#707070]">{line.date}</td>
                        <td className="p-3 font-bold text-[#141414]">{line.label}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                            {matched.code} → {matched.writeOffAccountCode}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-[#141414]">
                          {formatSarCurrency(line.amountSar)}
                        </td>
                        <td className="p-3 text-center">
                          {line.reconciled ? (
                            <span className="pill-tag-mint text-[11px] font-mono">
                              تمت التسوية ({line.postedEntryNo})
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAutoReconcileLine(line.id)}
                              className="button-primary-pill motion-spring-press"
                              style={{ padding: '4px 14px', fontSize: '11px', minHeight: '28px' }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                              <span>تطبيق النموذج وترحيل القيد</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
