import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
  ScanLine,
  Video,
  ShieldAlert,
} from 'lucide-react';
import {
  extractSmartCvFromFile,
  parsePassportMrz,
  checkCandidateDuplicateAndBlacklist,
  type SmartExtractedCvDraft,
  type DuplicateAndBlacklistCheck,
} from '../../services/cvSmartExtractorService';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  dispatchViaEmailAndWhatsApp,
  FOLLOWUP_COORDINATORS,
} from '../../services/externalAgencyMasterService';
import { useAppStore } from '../../stores/appStore';

interface SmartCvExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId?: string;
  agencyName: string;
  isExternalAgentSession: boolean;
  linkedContractNo?: string;
  onSaved?: (savedCvRecord: Record<string, any>) => void;
}

export const SmartCvExtractorModal: React.FC<SmartCvExtractorModalProps> = ({
  isOpen,
  onClose,
  agencyId,
  agencyName,
  isExternalAgentSession,
  linkedContractNo,
  onSaved,
}) => {
  const { addNotification } = useAppStore();
  const [draft, setDraft] = useState<SmartExtractedCvDraft | null>(null);
  const [mrzInput, setMrzInput] = useState('');
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateAndBlacklistCheck | null>(null);
  const [targetCompanyScope, setTargetCompanyScope] = useState<'ALL' | 'SAF' | 'TOP' | 'YAQ' | 'DAR'>('ALL');
  const [notifyFollowupChannels, setNotifyFollowupChannels] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const runDuplicateRadar = async (passportNo: string, labourId?: string) => {
    const res = await checkCandidateDuplicateAndBlacklist(passportNo, labourId);
    setDuplicateCheck(res);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const firstFile = files[0];
      const extracted = await extractSmartCvFromFile(firstFile, mrzInput);
      setDraft(extracted);
      if (extracted.passportNumber || extracted.labourId) {
        await runDuplicateRadar(extracted.passportNumber, extracted.labourId);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleParseManualMrz = async () => {
    const parsed = parsePassportMrz(mrzInput);
    if (!parsed) {
      addNotification({
        title: 'سطر MRZ غير مكتمل',
        message: 'يرجى لصق سطري الـ MRZ الموجودين أسفل جواز السفر (يبدأ السطر الأول بـ P<).',
        type: 'warning',
      });
      return;
    }

    const baseDraft: SmartExtractedCvDraft = draft || {
      sourceFileName: 'MRZ-DIRECT-SCAN',
      fullNameEn: parsed.fullNameEn,
      fullNameAr: parsed.fullNameEn,
      positionEn: 'HOUSEMAID',
      positionAr: 'عاملة منزلية',
      monthlySalarySar: 1000,
      contractPeriodYears: 2,
      nationalityAr: parsed.nationalityAr,
      nationalityEn: parsed.nationalityCode,
      religionAr: 'مسلمة',
      religionEn: 'MUSLIM',
      dateOfBirthIso: parsed.dateOfBirthIso,
      age: parsed.age,
      gender: parsed.gender,
      maritalStatusAr: 'عزباء',
      maritalStatusEn: 'SINGLE',
      childrenCount: 0,
      livingTown: 'ADDIS ABABA',
      labourId: '',
      heightCm: 160,
      weightKg: 56,
      educationEn: 'PRIMARY',
      educationAr: 'أساسي',
      experienceType: 'First-Timer',
      experienceCountryAr: 'أول مرة (First-Timer)',
      experienceYears: 0,
      passportNumber: parsed.passportNumber,
      passportIssueDateIso: '2024-09-01',
      passportExpiryDateIso: parsed.expiryDateIso,
      passportIssuePlace: 'ADDIS ABABA',
      englishStars: 3,
      arabicStars: 2,
      skills: {
        cleaning: true,
        washing: true,
        ironing: true,
        babySitting: true,
        childrenCare: true,
        elderlyCare: true,
        cookingArabic: false,
        sewing: false,
        tutoring: false,
      },
      videoUrl: '',
      mrzResult: parsed,
      extractionConfidence: 99,
      warningsAr: parsed.isExpired
        ? [`تحذير: جواز السفر منتهي الصلاحية (${parsed.expiryDateIso})!`]
        : parsed.isUnderSixMonths
        ? [`تنبيه: صلاحية الجواز أقل من 6 أشهر (${parsed.monthsUntilExpiry} شهر).`]
        : [],
    };

    const merged: SmartExtractedCvDraft = {
      ...baseDraft,
      fullNameEn: parsed.fullNameEn,
      fullNameAr: parsed.fullNameEn,
      nationalityAr: parsed.nationalityAr,
      passportNumber: parsed.passportNumber,
      dateOfBirthIso: parsed.dateOfBirthIso,
      age: parsed.age,
      passportExpiryDateIso: parsed.expiryDateIso,
      mrzResult: parsed,
      extractionConfidence: 99,
    };
    setDraft(merged);
    await runDuplicateRadar(parsed.passportNumber, merged.labourId);
  };

  const handleSaveExtractedCv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.passportNumber.trim() || !draft.fullNameEn.trim()) return;

    if (draft.mrzResult?.isExpired) {
      addNotification({
        title: 'رفض حفظ جواز منتهي الصلاحية',
        message: 'لا يمكن رفع سيرة ذاتية بجواز سفر منتهي الصلاحية.',
        type: 'error',
      });
      return;
    }

    setBusy(true);
    try {
      const skillsList: string[] = [];
      if (draft.skills.cleaning) skillsList.push('تنظيف شامل وترتيب المنزل');
      if (draft.skills.washing) skillsList.push('غسيل الملابس');
      if (draft.skills.ironing) skillsList.push('كوي الملابس');
      if (draft.skills.babySitting) skillsList.push('رعاية المواليد');
      if (draft.skills.childrenCare) skillsList.push('رعاية الأطفال');
      if (draft.skills.elderlyCare) skillsList.push('رعاية كبار السن');
      if (draft.skills.cookingArabic) skillsList.push('الطبخ العربي');
      if (draft.skills.sewing) skillsList.push('خياطة بسيطة');
      if (draft.skills.tutoring) skillsList.push('التحدث بالإنجليزية');

      // Mandatory Follow-up Approval Gate:
      // External Agent uploads ALWAYS enter 'بانتظار الاعتماد' (`PENDING_FOLLOWUP`) so Islam/Mahmoud review first!
      const statusForCvBank = isExternalAgentSession ? 'بانتظار الاعتماد' : 'متاح';
      const approvalStatus = isExternalAgentSession ? 'PENDING_FOLLOWUP' : 'APPROVED';
      const cvCode = `CV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const todayIso = new Date().toISOString().slice(0, 10);

      const newCvRecord = {
        id: `cv-smart-${Date.now()}`,
        company_id: targetCompanyScope === 'ALL' ? 'SAF' : targetCompanyScope,
        target_company_scope: targetCompanyScope,
        agency_id: agencyId,
        cv_code: cvCode,
        maid_name: draft.fullNameEn.toUpperCase(),
        maid_name_ar: draft.fullNameAr || draft.fullNameEn,
        nationality: draft.nationalityAr,
        job: draft.positionAr,
        type: 'استقدام',
        passport_number: draft.passportNumber.toUpperCase(),
        passport_issue_date: draft.passportIssueDateIso,
        passport_expiry_date: draft.passportExpiryDateIso,
        passport_issue_place: draft.passportIssuePlace,
        date_of_birth: draft.dateOfBirthIso,
        age: draft.age,
        salary: draft.monthlySalarySar,
        external_office: agencyName,
        religion: draft.religionAr,
        marital_status: draft.maritalStatusAr,
        children_count: draft.childrenCount,
        height_cm: draft.heightCm,
        weight_kg: draft.weightKg,
        living_town: draft.livingTown,
        labour_id: draft.labourId,
        education_level: `${draft.educationEn} (${draft.educationAr})`,
        experience_years: draft.experienceYears,
        experience_country: draft.experienceCountryAr,
        english_stars: draft.englishStars,
        arabic_stars: draft.arabicStars,
        contract_period_years: draft.contractPeriodYears,
        skills: skillsList,
        status: statusForCvBank,
        approval_status: approvalStatus,
        video_url: draft.videoUrl,
        portrait_url: draft.portraitDataUrl,
        full_image_url: draft.fullBodyDataUrl,
        passport_image_url: draft.passportScanDataUrl,
        linked_musaned_contract_no: linkedContractNo,
        created_at: todayIso,
      };

      await realErpDataStore.addRecord('cvs', newCvRecord);

      // Register in `agent_imports` queue when uploaded by External Agent so Islam & Mahmoud see it immediately
      if (isExternalAgentSession) {
        await realErpDataStore.addRecord('agent_imports', {
          id: `IMP-AGY-${Date.now()}`,
          batch_code: `#AGY-${cvCode}`,
          office_name: agencyName,
          agency_id: agencyId,
          country: draft.nationalityAr,
          cvs_count: 1,
          status: 'بانتظار الاعتماد',
          created_at: todayIso,
          notes: linkedContractNo
            ? `ترشيح مباشر على عقد مساند #${linkedContractNo} — جواز ${draft.passportNumber}`
            : `رفع ذكي (MRZ + PDF) من الوكيل (${agencyName}) — بانتظار اعتماد إسلام عرفة أو محمود فودة`,
          candidates: [
            {
              id: newCvRecord.id,
              cv_id: newCvRecord.id,
              name: draft.fullNameEn,
              passport: draft.passportNumber.toUpperCase(),
              age: draft.age,
              profession: draft.positionAr,
              experience: draft.experienceCountryAr,
              medical: 'لائق',
              status: 'قيد المراجعة',
            },
          ],
        });
      }

      if (notifyFollowupChannels) {
        const coordinator = FOLLOWUP_COORDINATORS[0];
        await dispatchViaEmailAndWhatsApp({
          recipientName: `${coordinator.nameAr} — قسم المتابعة الخارجية`,
          recipientPhone: coordinator.phone,
          recipientEmail: coordinator.email,
          subject: `سيرة جديدة مرفوعة من (${agencyName}) — ${cvCode}`,
          bodyText: `تم رفع السيرة الذاتية للمرشحة (${draft.fullNameEn}) جواز (${draft.passportNumber}) من وكالة (${agencyName})${
            linkedContractNo ? ` على عقد مساند #${linkedContractNo}` : ''
          }. الحالة الآن: [${statusForCvBank}].`,
          channel: 'both',
          templateName: 'إشعار رفع سيرة من وكيل خارجي',
          companyId: targetCompanyScope === 'ALL' ? 'SAF' : targetCompanyScope,
          openExternalClient: false,
        });
      }

      addNotification({
        title: isExternalAgentSession
          ? 'تم إرسال السيرة لطابور اعتماد المتابعة'
          : 'تم استخلاص واعتماد السيرة في بنك السير',
        message: isExternalAgentSession
          ? `تم حفظ السيرة (${cvCode}) وإشعار أ. إسلام عرفة وأ. محمود فودة عبر البريد والواتساب للاعتماد قبل ظهورها للمبيعات.`
          : `تم نشر السيرة (${cvCode}) وإتاحتها لأقسام المبيعات فوراً.`,
        type: 'success',
      });

      if (onSaved) onSaved(newCvRecord);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-5xl w-full max-h-[92vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#141414] text-[#ffffff] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#141414]">
                محرك الاستخلاص الذكي للسيفهات والجوازات (PDF + ICAO MRZ + QR)
              </h3>
              <p className="text-xs text-[#707070]">
                الوكالة: <strong>{agencyName}</strong>
                {linkedContractNo ? ` • تعيين على عقد مساند #${linkedContractNo}` : ''}
                {isExternalAgentSession ? ' • يمر وجوبياً على اعتماد قسم المتابعة (إسلام / محمود)' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Split Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Side: Upload PDF/Image + MRZ Reader + Duplicate Radar */}
          <div className="lg:col-span-5 space-y-4">
            <label className="block border-2 border-dashed border-[#e0e0e0] hover:border-[#141414] rounded-[20px] bg-[#f3f3f3] p-6 text-center cursor-pointer transition-colors">
              <UploadCloud className="w-9 h-9 text-[#141414] mx-auto mb-2" />
              <div className="text-xs font-bold text-[#141414]">
                ارفع ملف السيرة الذاتية (PDF مثل قالب SHEGER أو صورة الجواز)
              </div>
              <div className="text-[11px] text-[#707070] mt-1">
                يستخرج الحقول ثنائية اللغة، الصور الأربع، باركود الفيديو، وسطر الجواز المشفر تلقائياً
              </div>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
            </label>

            {/* Direct ICAO MRZ Scanner Box */}
            <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4" />
                  <span>قارئ السطر المشفر لجواز السفر (ICAO MRZ)</span>
                </span>
                <button
                  type="button"
                  onClick={handleParseManualMrz}
                  className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                >
                  تحليل MRZ
                </button>
              </div>
              <textarea
                rows={2}
                dir="ltr"
                value={mrzInput}
                onChange={(e) => setMrzInput(e.target.value)}
                placeholder={'P<ETHGURMU<<MOMINA<KEDIR<<<<<<<<<<<<<<<<<<<<\nEP92495758ETH0309127F29091850<<<<<<<<<<<<<<00'}
                className="w-full p-2.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono text-[11px] text-[#141414]"
              />
            </div>

            {/* Duplicate Passport & Backout Radar Alert */}
            {duplicateCheck?.hasRisk && (
              <div className="bg-[#141414] text-[#ffffff] rounded-[20px] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>رادار كشف تكرار الجوازات وسجل الـ Backout / الهروب!</span>
                </div>
                <ul className="text-[11px] text-[#f3f3f3] list-disc pr-4 space-y-1">
                  {duplicateCheck.reasonsAr.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {draft?.mrzResult && (
              <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[16px] p-3.5 text-xs space-y-1">
                <div className="font-bold text-[#141414] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    تم التحقق من الجواز رياضياً (دقة الاستخلاص {draft.extractionConfidence}%)
                  </span>
                </div>
                <div className="text-[11px] text-[#707070]">
                  رقم الجواز: <strong className="font-mono text-[#141414]">{draft.mrzResult.passportNumber}</strong> •
                  العمر الفعلي: <strong>{draft.mrzResult.age} سنة</strong> • انتهاء الجواز:{' '}
                  <strong className="font-mono">{draft.mrzResult.expiryDateIso}</strong>
                </div>
              </div>
            )}

            {draft?.warningsAr && draft.warningsAr.length > 0 && (
              <div className="bg-[#f3f3f3] border border-[#141414] rounded-[16px] p-3 text-[11px] text-[#141414] space-y-1">
                {draft.warningsAr.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: Extracted Editable Fields */}
          <div className="lg:col-span-7">
            {!draft ? (
              <div className="h-full min-h-[280px] bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-8 flex flex-col items-center justify-center text-center space-y-2">
                <FileText className="w-10 h-10 text-[#707070]" />
                <div className="text-sm font-bold text-[#141414]">
                  بانتظار رفع ملف السيرة الذاتية أو مسح سطر الجواز (MRZ)
                </div>
                <p className="text-xs text-[#707070] max-w-md">
                  بمجرد اختيار ملف PDF أو صورة، ستظهر هنا كافة الحقول المستخلصة للمراجعة السريعة والاعتماد بضغطة واحدة.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveExtractedCv} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">الاسم الكامل بالإنجليزية (Full Name)</label>
                    <input
                      type="text"
                      required
                      value={draft.fullNameEn}
                      onChange={(e) => setDraft({ ...draft, fullNameEn: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-semibold"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">رقم جواز السفر (Passport No.)</label>
                    <input
                      type="text"
                      required
                      value={draft.passportNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setDraft({ ...draft, passportNumber: val });
                        void runDuplicateRadar(val, draft.labourId);
                      }}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">الجنسية</label>
                    <input
                      type="text"
                      value={draft.nationalityAr}
                      onChange={(e) => setDraft({ ...draft, nationalityAr: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">العمر</label>
                    <input
                      type="number"
                      value={draft.age}
                      onChange={(e) => setDraft({ ...draft, age: parseInt(e.target.value, 10) || 25 })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">الراتب الشهري (⃁)</label>
                    <input
                      type="number"
                      value={draft.monthlySalarySar}
                      onChange={(e) =>
                        setDraft({ ...draft, monthlySalarySar: parseInt(e.target.value, 10) || 1000 })
                      }
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">الديانة</label>
                    <select
                      value={draft.religionAr}
                      onChange={(e) => setDraft({ ...draft, religionAr: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                    >
                      <option value="مسلمة">مسلمة</option>
                      <option value="مسيحية">مسيحية</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">مدينة السكن (Living Town)</label>
                    <input
                      type="text"
                      value={draft.livingTown}
                      onChange={(e) => setDraft({ ...draft, livingTown: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414]"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">رقم العامل الوزاري (Labour ID)</label>
                    <input
                      type="text"
                      placeholder="EF10500644"
                      value={draft.labourId}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setDraft({ ...draft, labourId: val });
                        void runDuplicateRadar(draft.passportNumber, val);
                      }}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">تاريخ انتهاء الجواز</label>
                    <input
                      type="date"
                      value={draft.passportExpiryDateIso}
                      onChange={(e) => setDraft({ ...draft, passportExpiryDateIso: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#707070] mb-1 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      <span>رابط فيديو المرشحة (المستخرج من QR)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={draft.videoUrl}
                      onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#707070] mb-1">نطاق الإتاحة لشركات المبيعات</label>
                    <select
                      value={targetCompanyScope}
                      onChange={(e) => setTargetCompanyScope(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-[14px] bg-[#f0f0f0] text-[#141414] font-semibold"
                    >
                      <option value="ALL">بنك السير الموحد المشترك (SAF + TOP + YAQ + DAR)</option>
                      <option value="SAF">مخصص لشركة السفير الماسي (SAF)</option>
                      <option value="TOP">مخصص لشركة توباز للاستقدام (TOP)</option>
                      <option value="YAQ">مخصص لشركة ياقوت نجد (YAQ)</option>
                      <option value="DAR">مخصص لدار الرواد للاستقدام (DAR)</option>
                    </select>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 pt-1 cursor-pointer font-semibold text-[#141414]">
                  <input
                    type="checkbox"
                    checked={notifyFollowupChannels}
                    onChange={(e) => setNotifyFollowupChannels(e.target.checked)}
                  />
                  <span>إرسال إشعار فوري عبر البريد الإلكتروني والواتساب لقسم المتابعة (إسلام عرفة ومحمود فودة)</span>
                </label>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-6 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold cursor-pointer"
                  >
                    {isExternalAgentSession
                      ? 'رفع السيرة وإرسالها لاعتماد المتابعة'
                      : 'حفظ واعتماد السيرة في بنك السير'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartCvExtractorModal;
