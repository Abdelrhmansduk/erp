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
  extractSmartCvsBatchFromFiles,
  parsePassportMrz,
  checkCandidateDuplicateAndBlacklist,
  type SmartExtractedCvDraft,
  type SmartBatchCvExtractionItem,
  type DuplicateAndBlacklistCheck,
} from '../../services/cvSmartExtractorService';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  dispatchViaEmailAndWhatsApp,
  resolveCoordinatorForAgencyOrTx,
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
  const [batchItems, setBatchItems] = useState<SmartBatchCvExtractionItem[]>([]);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState(0);
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
      if (files.length > 1) {
        const batch = await extractSmartCvsBatchFromFiles(Array.from(files));
        setBatchItems(batch);
        setSelectedBatchIdx(0);
        const firstValid = batch.find((b) => b.draft);
        if (firstValid?.draft) {
          setDraft(firstValid.draft);
          setDuplicateCheck(firstValid.blacklist || null);
        }
      } else {
        setBatchItems([]);
        const firstFile = files[0];
        const extracted = await extractSmartCvFromFile(firstFile, mrzInput);
        setDraft(extracted);
        if (extracted.passportNumber || extracted.labourId) {
          await runDuplicateRadar(extracted.passportNumber, extracted.labourId);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleManualImageUpload = (
    field: 'portraitDataUrl' | 'fullBodyDataUrl' | 'passportScanDataUrl',
    file?: File
  ) => {
    if (!file || !draft) return;
    if (file.size > 1_500_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => (prev ? { ...prev, [field]: String(reader.result || '') } : prev));
    };
    reader.readAsDataURL(file);
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

  const persistDraftRecord = async (targetDraft: SmartExtractedCvDraft) => {
    const skillsList: string[] = [];
    if (targetDraft.skills.cleaning) skillsList.push('تنظيف شامل وترتيب المنزل');
    if (targetDraft.skills.washing) skillsList.push('غسيل الملابس');
    if (targetDraft.skills.ironing) skillsList.push('كوي الملابس');
    if (targetDraft.skills.babySitting) skillsList.push('رعاية المواليد');
    if (targetDraft.skills.childrenCare) skillsList.push('رعاية الأطفال');
    if (targetDraft.skills.elderlyCare) skillsList.push('رعاية كبار السن');
    if (targetDraft.skills.cookingArabic) skillsList.push('الطبخ العربي');
    if (targetDraft.skills.sewing) skillsList.push('خياطة بسيطة');
    if (targetDraft.skills.tutoring) skillsList.push('التحدث بالإنجليزية');

    // Mandatory Follow-up Approval Gate:
    // External Agent uploads ALWAYS enter 'بانتظار الاعتماد' (`PENDING_FOLLOWUP`) so Islam/Mahmoud review first!
    const statusForCvBank = isExternalAgentSession ? 'بانتظار الاعتماد' : 'متاح';
    const approvalStatus = isExternalAgentSession ? 'PENDING_FOLLOWUP' : 'APPROVED';
    const cvCode = `CV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayIso = new Date().toISOString().slice(0, 10);

    const newCvRecord = {
      id: `cv-smart-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      company_id: targetCompanyScope === 'ALL' ? 'SAF' : targetCompanyScope,
      target_company_scope: targetCompanyScope,
      agency_id: agencyId,
      cv_code: cvCode,
      maid_name: targetDraft.fullNameEn.toUpperCase(),
      maid_name_ar: targetDraft.fullNameAr || targetDraft.fullNameEn,
      nationality: targetDraft.nationalityAr,
      job: targetDraft.positionAr,
      type: 'استقدام',
      passport_number: targetDraft.passportNumber.toUpperCase(),
      passport_issue_date: targetDraft.passportIssueDateIso,
      passport_expiry_date: targetDraft.passportExpiryDateIso,
      passport_issue_place: targetDraft.passportIssuePlace,
      date_of_birth: targetDraft.dateOfBirthIso,
      age: targetDraft.age,
      salary: targetDraft.monthlySalarySar,
      external_office: agencyName,
      religion: targetDraft.religionAr,
      marital_status: targetDraft.maritalStatusAr,
      children_count: targetDraft.childrenCount,
      height_cm: targetDraft.heightCm,
      weight_kg: targetDraft.weightKg,
      living_town: targetDraft.livingTown,
      labour_id: targetDraft.labourId,
      education_level: `${targetDraft.educationEn} (${targetDraft.educationAr})`,
      experience_years: targetDraft.experienceYears,
      experience_country: targetDraft.experienceCountryAr,
      english_stars: targetDraft.englishStars,
      arabic_stars: targetDraft.arabicStars,
      contract_period_years: targetDraft.contractPeriodYears,
      skills: skillsList,
      status: statusForCvBank,
      approval_status: approvalStatus,
      video_url: targetDraft.videoUrl,
      portrait_url: targetDraft.portraitDataUrl,
      full_image_url: targetDraft.fullBodyDataUrl,
      passport_image_url: targetDraft.passportScanDataUrl,
      linked_musaned_contract_no: linkedContractNo,
      created_at: todayIso,
    };

    await realErpDataStore.addRecord('cvs', newCvRecord);

    // Register in `agent_imports` queue when uploaded by External Agent so Islam & Mahmoud see it immediately
    if (isExternalAgentSession) {
      await realErpDataStore.addRecord('agent_imports', {
        id: `IMP-AGY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        batch_code: `#AGY-${cvCode}`,
        office_name: agencyName,
        agency_id: agencyId,
        country: targetDraft.nationalityAr,
        cvs_count: 1,
        status: 'بانتظار الاعتماد',
        created_at: todayIso,
        notes: linkedContractNo
          ? `ترشيح مباشر على عقد مساند #${linkedContractNo} — جواز ${targetDraft.passportNumber}`
          : `رفع ذكي (MRZ + PDF) من الوكيل (${agencyName}) — بانتظار اعتماد إسلام عرفة أو محمود فودة`,
        candidates: [
          {
            id: newCvRecord.id,
            cv_id: newCvRecord.id,
            name: targetDraft.fullNameEn,
            passport: targetDraft.passportNumber.toUpperCase(),
            age: targetDraft.age,
            profession: targetDraft.positionAr,
            experience: targetDraft.experienceCountryAr,
            medical: 'لائق',
            status: 'قيد المراجعة',
          },
        ],
      });
    }

    if (notifyFollowupChannels) {
      const coordinator = resolveCoordinatorForAgencyOrTx({
        agencyId,
        nationality: targetDraft.nationalityAr,
      });
      await dispatchViaEmailAndWhatsApp({
        recipientName: `${coordinator.nameAr} — قسم المتابعة الخارجية`,
        recipientPhone: coordinator.phone,
        recipientEmail: coordinator.email,
        subject: `سيرة جديدة مرفوعة من (${agencyName}) — ${cvCode}`,
        bodyText: `تم رفع السيرة الذاتية للمرشحة (${targetDraft.fullNameEn}) جواز (${targetDraft.passportNumber}) من وكالة (${agencyName})${
          linkedContractNo ? ` على عقد مساند #${linkedContractNo}` : ''
        }. الحالة الآن: [${statusForCvBank}].`,
        channel: 'both',
        templateName: 'إشعار رفع سيرة من وكيل خارجي',
        companyId: targetCompanyScope === 'ALL' ? 'SAF' : targetCompanyScope,
        openExternalClient: false,
      });
    }

    return { newCvRecord, cvCode };
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

    if (duplicateCheck?.isPreviousRunaway || duplicateCheck?.isPreviousBackout) {
      addNotification({
        title: 'حظر أمني: جواز مسجل بـ Backout أو هروب سابق',
        message: 'لا يمكن حفظ سيرة لعاملة مسجل عليها بلاغ هروب أو اعتذار مسبق إلا بموافقة الإدارة العليا.',
        type: 'error',
      });
      return;
    }

    setBusy(true);
    try {
      const { newCvRecord, cvCode } = await persistDraftRecord(draft);

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

  const handleSaveAllValidBatch = async () => {
    const validItems = batchItems.filter(
      (b) =>
        b.draft &&
        !b.draft.mrzResult?.isExpired &&
        !b.blacklist?.isPreviousRunaway &&
        !b.blacklist?.isPreviousBackout
    );
    if (validItems.length === 0) return;
    setBusy(true);
    try {
      let lastSaved: Record<string, any> | null = null;
      for (const item of validItems) {
        if (item.draft) {
          const res = await persistDraftRecord(item.draft);
          lastSaved = res.newCvRecord;
        }
      }
      addNotification({
        title: `تم استيراد وحفظ ${validItems.length} سيرة ذاتية دفعة واحدة`,
        message: isExternalAgentSession
          ? 'تم إرسال الدفعة إلى طابور اعتماد إسلام عرفة ومحمود فودة.'
          : 'تم نشر الدفعة في بنك السير بنجاح.',
        type: 'success',
      });
      if (onSaved && lastSaved) onSaved(lastSaved);
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
                multiple
                accept=".pdf,image/*"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />
            </label>

            {batchItems.length > 1 && (
              <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#141414]">
                    طابور الاستيراد الجماعي ({batchItems.length} ملفات)
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSaveAllValidBatch()}
                    className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                  >
                    حفظ الكل الصالح (Save All)
                  </button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {batchItems.map((item, idx) => {
                    const blocked =
                      item.blacklist?.isPreviousRunaway || item.blacklist?.isPreviousBackout;
                    return (
                      <button
                        key={item.fileName + idx}
                        type="button"
                        onClick={() => {
                          setSelectedBatchIdx(idx);
                          if (item.draft) {
                            setDraft(item.draft);
                            setDuplicateCheck(item.blacklist || null);
                          }
                        }}
                        className={`w-full text-right p-2 rounded-[12px] border flex items-center justify-between gap-2 cursor-pointer ${
                          selectedBatchIdx === idx
                            ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                            : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                        }`}
                      >
                        <span className="truncate font-semibold">{item.fileName}</span>
                        <span className="font-mono text-[10px] shrink-0">
                          {item.error
                            ? 'خطأ'
                            : blocked
                            ? 'محظور'
                            : `${item.draft?.extractionConfidence || 0}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

                {/* Manual Image Override / Upload Controls */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { key: 'portraitDataUrl' as const, label: 'صورة شخصية' },
                    { key: 'fullBodyDataUrl' as const, label: 'صورة كاملة' },
                    { key: 'passportScanDataUrl' as const, label: 'صورة الجواز' },
                  ].map((imgBox) => (
                    <label
                      key={imgBox.key}
                      className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[14px] p-2 text-center cursor-pointer block"
                    >
                      {draft[imgBox.key] ? (
                        <img
                          src={draft[imgBox.key]}
                          alt={imgBox.label}
                          className="w-full h-16 object-cover rounded-[10px] mb-1 border border-[#e0e0e0]"
                        />
                      ) : (
                        <div className="w-full h-16 rounded-[10px] bg-[#ffffff] border border-dashed border-[#e0e0e0] flex items-center justify-center text-[10px] text-[#707070] mb-1">
                          رفع/تغيير
                        </div>
                      )}
                      <span className="text-[10.5px] font-bold text-[#141414] block">{imgBox.label}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleManualImageUpload(imgBox.key, e.target.files?.[0])}
                      />
                    </label>
                  ))}
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
