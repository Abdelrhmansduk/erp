import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Printer,
  Download,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  ShieldCheck,
  Sliders,
  Check,
  X,
  Video,
  Star,
} from 'lucide-react';
import { generateRealQrSvg } from '../../utils/realBarcodeGenerator';
import { printSpecificElement } from '../../utils/printManager';
import { SAUDI_RIYAL_SYMBOL } from '../../utils/saudiRiyal';
import {
  getOfficeCvPresets,
  saveCustomOfficeCvPreset,
  maskPassportForClientPreview,
  type OfficeCvExportPreset,
} from '../../services/cvSmartExtractorService';
import { dispatchViaEmailAndWhatsApp } from '../../services/externalAgencyMasterService';
import { useAppStore } from '../../stores/appStore';

export interface PrintableAgencyCvData {
  id: string;
  cv_code: string;
  maid_name: string;
  maid_name_ar?: string;
  nationality: string;
  job: string;
  type?: string;
  passport_number: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  passport_issue_place?: string;
  age: number;
  date_of_birth?: string;
  salary: number;
  external_office?: string;
  religion: string;
  marital_status: string;
  children_count?: number;
  height_cm?: number;
  weight_kg?: number;
  living_town?: string;
  labour_id?: string;
  education_level?: string;
  experience_years?: number;
  experience_country?: string;
  english_stars?: number;
  arabic_stars?: number;
  contract_period_years?: number;
  skills: string[];
  video_url?: string;
  portrait_url?: string;
  full_image_url?: string;
  passport_image_url?: string;
}

interface ProfessionalAgencyCvTemplateProps {
  cv: PrintableAgencyCvData;
  defaultOfficeCode?: string;
  canViewInternalAudit?: boolean;
  onClose?: () => void;
}

const NINE_BILINGUAL_SKILLS: Array<{ en: string; ar: string; keywords: string[] }> = [
  { en: 'House Cleaning', ar: 'التنظيف الشامل وترتيب المنزل', keywords: ['تنظيف', 'نظافة', 'cleaning'] },
  { en: 'Washing Laundry', ar: 'غسيل الملابس والمفروشات', keywords: ['غسيل', 'washing'] },
  { en: 'Ironing Clothes', ar: 'كيّ الملابس الرسمية والعناية بها', keywords: ['كوي', 'كي', 'ironing'] },
  { en: 'Baby Sitting', ar: 'رعاية المواليد والرضع', keywords: ['رضع', 'مواليد', 'baby'] },
  { en: 'Children Care', ar: 'رعاية ومتابعة الأطفال', keywords: ['أطفال', 'اطفال', 'children'] },
  { en: 'Elderly Care', ar: 'رعاية كبار السن والاهتمام الصحي', keywords: ['كبار', 'مسنين', 'elderly'] },
  { en: 'Arabic Cooking', ar: 'الطبخ العربي وإعداد الوجبات', keywords: ['طبخ', 'طهي', 'طباخة', 'cooking'] },
  { en: 'Basic Sewing', ar: 'الخياطة المنزلية البسيطة', keywords: ['خياطة', 'sewing'] },
  { en: 'Child Tutoring / English', ar: 'التحدث بالإنجليزية ومساعدة الأطفال', keywords: ['إنجليزي', 'انجليزي', 'tutoring'] },
];

function renderStarRow(starsCount: number) {
  const clamped = Math.max(1, Math.min(5, Math.round(starsCount || 3)));
  return (
    <div className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((idx) => (
        <Star
          key={idx}
          className={`w-3.5 h-3.5 ${
            idx <= clamped ? 'fill-[#141414] text-[#141414]' : 'text-[#e0e0e0]'
          }`}
        />
      ))}
    </div>
  );
}

export const ProfessionalAgencyCvTemplate: React.FC<ProfessionalAgencyCvTemplateProps> = ({
  cv,
  defaultOfficeCode = 'SAF',
  canViewInternalAudit = false,
  onClose,
}) => {
  const { addNotification } = useAppStore();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [presets, setPresets] = useState<OfficeCvExportPreset[]>(() => getOfficeCvPresets());
  const visiblePresets = useMemo(
    () =>
      presets.filter((p) => (p.officeCode === 'INTERNAL_AUDIT' ? canViewInternalAudit : true)),
    [presets, canViewInternalAudit]
  );

  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const match = visiblePresets.find(
      (p) => p.officeCode.toUpperCase() === defaultOfficeCode.toUpperCase()
    );
    return match?.id || visiblePresets[0]?.id || 'PRESET-SAF';
  });

  const activePreset = useMemo(
    () => visiblePresets.find((p) => p.id === selectedPresetId) || visiblePresets[0],
    [visiblePresets, selectedPresetId]
  );

  const [showCustomPresetModal, setShowCustomPresetModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<'whatsapp' | 'email' | null>(null);
  const [shareRecipientName, setShareRecipientName] = useState('');
  const [shareRecipientPhone, setShareRecipientPhone] = useState('');
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');

  const [customForm, setCustomForm] = useState({
    officeCode: 'CUSTOM',
    companyNameAr: 'مكتب شريك معتمد للاستقدام',
    companyNameEn: 'PARTNER RECRUITMENT OFFICE',
    musanedLicenseNo: '3990100',
    salesPhone: '0500000000',
    salesEmail: 'info@partner-office.sa',
    hideForeignAgencyIdentity: true,
    maskPassportBeforeContract: true,
    pricingDisplayMode: 'RECRUITMENT_SALARY' as 'RECRUITMENT_SALARY' | 'RENTAL_PACKAGE',
    rentalMonthlyPackageSar: '2450',
  });

  const displayedPassport = maskPassportForClientPreview(
    cv.passport_number,
    activePreset?.maskPassportBeforeContract ?? true
  );

  const displayedPriceLabel =
    activePreset?.pricingDisplayMode === 'RENTAL_PACKAGE'
      ? `${SAUDI_RIYAL_SYMBOL} ${(activePreset.rentalMonthlyPackageSar || 2450).toLocaleString()} / شهرياً (باقة تأجير)`
      : `${SAUDI_RIYAL_SYMBOL} ${(cv.salary || 1000).toLocaleString()} / شهرياً`;

  const videoVerifyUrl =
    cv.video_url || `https://alsulaim.sa/cv-verify/${encodeURIComponent(cv.cv_code || cv.id)}`;

  const qrSvgMarkup = useMemo(
    () => generateRealQrSvg(videoVerifyUrl, { sizePx: 92 }),
    [videoVerifyUrl]
  );

  const hasSkill = (keywords: string[], fallbackIndex: number): boolean => {
    const joined = (cv.skills || []).join(' ').toLowerCase();
    if (!joined) return fallbackIndex < 6;
    return keywords.some((kw) => joined.includes(kw.toLowerCase())) || fallbackIndex < 5;
  };

  // 1-Click High-Resolution WhatsApp Sales Card Generator (HTML5 Canvas -> PNG)
  const handleDownloadWhatsAppCardPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White gallery background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Sovereign Ink Header
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, canvas.width, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(activePreset.companyNameAr, 850, 75);

    ctx.fillStyle = '#adadad';
    ctx.font = '20px sans-serif';
    ctx.fillText(
      `${activePreset.companyNameEn} • ترخيص مساند: ${activePreset.musanedLicenseNo}`,
      850,
      118
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`كود السيرة: ${cv.cv_code || cv.id}`, 850, 158);

    // Candidate Main Card
    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(45, 225, 810, 210);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 225, 810, 210);

    ctx.fillStyle = '#141414';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(cv.maid_name_ar || cv.maid_name, 820, 285);
    ctx.fillStyle = '#707070';
    ctx.font = '22px sans-serif';
    ctx.fillText(`${cv.job} • الجنسية: ${cv.nationality} • الديانة: ${cv.religion}`, 820, 335);
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`الراتب / الباقة: ${displayedPriceLabel}`, 820, 390);

    // Key Details Rows
    const specs: Array<[string, string]> = [
      ['العمر والحالة الاجتماعية', `${cv.age} سنة — ${cv.marital_status}`],
      ['رقم جواز السفر (محمي PDPL)', displayedPassport],
      ['الخبرة العملية', cv.experience_country || 'أول مرة (First-Timer) — مدربة ومؤهلة'],
      ['المؤهل واللغات', `${cv.education_level || 'تعليم أساسي'} • إنجليزي (${cv.english_stars || 3}/5)`],
      ['مدة العقد والضمان', `سنتان (${cv.contract_period_years || 2} Years) — ضمان مساند 90 يوماً`],
    ];

    let y = 490;
    specs.forEach(([label, val]) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(45, y, 810, 74);
      ctx.strokeStyle = '#e0e0e0';
      ctx.strokeRect(45, y, 810, 74);

      ctx.fillStyle = '#707070';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, 825, y + 45);

      ctx.fillStyle = '#141414';
      ctx.font = 'bold 21px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(val, 75, y + 45);
      y += 88;
    });

    // Skills Strip
    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(45, 955, 810, 150);
    ctx.fillStyle = '#141414';
    ctx.textAlign = 'right';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('المهارات المنزلية المعتمدة:', 825, 998);
    ctx.fillStyle = '#262626';
    ctx.font = '20px sans-serif';
    const skillsLine = (cv.skills?.length ? cv.skills : ['تنظيف شامل', 'غسيل وكوي', 'رعاية أطفال']).join('  •  ');
    ctx.fillText(skillsLine.slice(0, 72), 825, 1050);

    // Bottom Contact Footer
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 1150, canvas.width, 130);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      `للحجز والتعاقد الفوري: ${activePreset.salesPhones.join(' | ')}`,
      450,
      1205
    );
    ctx.fillStyle = '#adadad';
    ctx.font = '18px sans-serif';
    ctx.fillText(activePreset.warrantyClauseAr.slice(0, 80), 450, 1245);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `كرت_واتساب_${activePreset.officeCode}_${cv.cv_code || cv.id}.png`;
    link.click();

    addNotification({
      title: 'تم توليد كرت الواتساب للمكتب',
      message: `تم تنزيل صورة كرت الواتساب بهوية (${activePreset.companyNameAr}) مع حماية رقم الجواز بنجاح.`,
      type: 'success',
    });
  };

  // Per-Office Branded Excel Export
  const handleExportOfficeExcel = () => {
    const row: Record<string, any> = {
      'المكتب المصدر': activePreset.companyNameAr,
      'ترخيص مساند': activePreset.musanedLicenseNo,
      'كود السيرة': cv.cv_code,
      'اسم المرشحة': cv.maid_name,
      'الاسم بالعربية': cv.maid_name_ar || cv.maid_name,
      'الجنسية': cv.nationality,
      'المهنة': cv.job,
      'الديانة': cv.religion,
      'العمر': cv.age,
      'الحالة الاجتماعية': cv.marital_status,
      'الراتب / الباقة (ريال)':
        activePreset.pricingDisplayMode === 'RENTAL_PACKAGE'
          ? activePreset.rentalMonthlyPackageSar || 2450
          : cv.salary,
      'رقم الجواز': displayedPassport,
      'الخبرة': cv.experience_country || 'أول مرة',
      'المهارات': (cv.skills || []).join('، '),
      'هاتف المبيعات': activePreset.salesPhones[0] || '',
    };

    if (!activePreset.hideForeignAgencyIdentity) {
      row['الوكيل الخارجي الأصلي'] = cv.external_office || '';
      row['Labour ID'] = cv.labour_id || '';
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([row]);
    XLSX.utils.book_append_sheet(wb, ws, activePreset.officeCode.slice(0, 28));
    XLSX.writeFile(wb, `سيرة_${activePreset.officeCode}_${cv.cv_code || cv.id}.xlsx`);

    addNotification({
      title: 'تم تصدير ملف المكتب المخصص',
      message: `تم تصدير بيانات السيرة بصيغة (${activePreset.companyNameAr}) بنجاح.`,
      type: 'success',
    });
  };

  const handleConfirmShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showShareModal) return;

    const subject = `سيرة ذاتية معتمدة (${cv.cv_code}) — ${activePreset.companyNameAr}`;
    const bodyText = [
      `مرفق لكم بيانات السيرة الذاتية المعتمدة من ${activePreset.companyNameAr}:`,
      `• الاسم: ${cv.maid_name_ar || cv.maid_name}`,
      `• الجنسية والمهنة: ${cv.nationality} — ${cv.job}`,
      `• العمر والديانة: ${cv.age} سنة — ${cv.religion}`,
      `• الراتب / الباقة: ${displayedPriceLabel}`,
      `• الخبرة: ${cv.experience_country || 'أول مرة — مدربة'}`,
      `• رقم الجواز: ${displayedPassport}`,
      cv.video_url ? `• فيديو المقابلة: ${cv.video_url}` : '',
      `• للتواصل والحجز: ${activePreset.salesPhones.join(' - ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    await dispatchViaEmailAndWhatsApp({
      recipientName: shareRecipientName || 'عميل / مستفيد',
      recipientPhone: shareRecipientPhone,
      recipientEmail: shareRecipientEmail,
      subject,
      bodyText,
      channel: showShareModal,
      templateName: 'إرسال سيرة ذاتية بهوية المكتب',
      companyId:
        ['SAF', 'TOP', 'YAQ', 'DAR'].includes(activePreset.officeCode)
          ? activePreset.officeCode
          : 'SAF',
      openExternalClient: true,
    });

    addNotification({
      title: showShareModal === 'whatsapp' ? 'تم الإرسال عبر الواتساب' : 'تم الإرسال عبر البريد الإلكتروني',
      message: `تم توثيق الرسالة في سجل الرسائل المرسلة وفتح قناة الإرسال لهوية (${activePreset.companyNameAr}).`,
      type: 'success',
    });
    setShowShareModal(null);
  };

  const handleSaveCustomPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPreset: OfficeCvExportPreset = {
      id: `PRESET-CUSTOM-${Date.now()}`,
      officeCode: customForm.officeCode.toUpperCase() || 'CUSTOM',
      presetNameAr: `قالب مخصص — ${customForm.companyNameAr}`,
      presetNameEn: customForm.companyNameEn,
      companyNameAr: customForm.companyNameAr,
      companyNameEn: customForm.companyNameEn,
      musanedLicenseNo: customForm.musanedLicenseNo,
      crNumber: '1010000000',
      salesPhones: [customForm.salesPhone],
      salesWhatsapp: customForm.salesPhone,
      salesEmail: customForm.salesEmail,
      addressAr: 'المملكة العربية السعودية',
      headerBgHex: '#141414',
      accentBandHex: '#f3f3f3',
      hideForeignAgencyIdentity: customForm.hideForeignAgencyIdentity,
      maskPassportBeforeContract: customForm.maskPassportBeforeContract,
      pricingDisplayMode: customForm.pricingDisplayMode,
      rentalMonthlyPackageSar: parseFloat(customForm.rentalMonthlyPackageSar) || 2450,
      warrantyClauseAr: 'ضمان نظامي لمدة 90 يوماً وفق لوائح منصة مساند.',
    };
    const updated = await saveCustomOfficeCvPreset(newPreset);
    setPresets(updated);
    setSelectedPresetId(newPreset.id);
    setShowCustomPresetModal(false);
    addNotification({
      title: 'تم حفظ صيغة التصدير المخصصة للمكتب',
      message: `تمت إضافة قالب (${newPreset.companyNameAr}) وأصبح متاحاً للتصدير الفوري.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Control & Per-Office Export Toolbar */}
      <div className="no-print print:hidden bg-[#f3f3f3] border border-[#e0e0e0] rounded-[24px] p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#141414]">هوية وصيغة المكتب للتصدير:</span>
            <select
              aria-label="اختيار صيغة المكتب للتصدير"
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="px-3.5 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414] focus:outline-none"
            >
              {visiblePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.presetNameAr}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCustomPresetModal(true)}
              className="px-3 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-semibold text-[#141414] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>صيغة مكتب مخصصة +</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activePreset.hideForeignAgencyIdentity && (
              <span className="px-3 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414] inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>درع White-Label مفعّل (إخفاء الوكيل الأجنبي)</span>
              </span>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] flex items-center justify-center text-[#141414] cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Multi-Format Export & Email/WhatsApp Dispatch Buttons */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#e0e0e0]">
          <button
            type="button"
            onClick={() => printSpecificElement(printContainerRef.current)}
            className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة / PDF صفحتين A4 بهوية المكتب</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWhatsAppCardPng}
            className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل كرت واتساب السريع (PNG)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal('whatsapp')}
            className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>إرسال عبر الواتساب</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal('email')}
            className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>إرسال عبر البريد الإلكتروني</span>
          </button>

          <button
            type="button"
            onClick={handleExportOfficeExcel}
            className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير Excel خاص بالمكتب</span>
          </button>
        </div>
      </div>

      {/* ─── PRINTABLE 2-PAGE A4 BILINGUAL SHEGER-STYLE DOCUMENT ─── */}
      <div ref={printContainerRef} className="space-y-6">
        {/* ================= PAGE 1: APPLICATION & BIOGRAPHY ================= */}
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-5 text-[#141414]">
          {/* Sovereign Office Header + Top Video QR */}
          <div
            className="rounded-[20px] p-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ backgroundColor: activePreset.headerBgHex, color: '#ffffff' }}
          >
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-[#adadad]">
                ترخيص مساند الرسمي: {activePreset.musanedLicenseNo} • س.ت: {activePreset.crNumber}
              </div>
              <h2 className="text-lg font-extrabold text-[#ffffff]">{activePreset.companyNameAr}</h2>
              <div className="text-xs font-semibold text-[#adadad]" dir="ltr">
                {activePreset.companyNameEn}
              </div>
              {!activePreset.hideForeignAgencyIdentity && cv.external_office && (
                <div className="text-[11px] text-[#ffffff] bg-[#262626] px-3 py-0.5 rounded-full inline-block mt-1">
                  الوكالة الخارجية الموردة: {cv.external_office} {cv.labour_id ? `| Labour ID: ${cv.labour_id}` : ''}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-[#ffffff] text-[#141414] p-2 rounded-[16px]">
              <div
                className="w-[74px] h-[74px] flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
              />
              <div className="text-[10px] space-y-0.5 pl-1">
                <div className="font-bold">امسح الباركود</div>
                <div className="text-[#707070]">فيديو وتوثيق المرشحة</div>
                <div className="font-mono font-bold text-[#141414]">{cv.cv_code}</div>
              </div>
            </div>
          </div>

          {/* APPLICATION FOR EMPLOYMENT Strip */}
          <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full px-5 py-2 flex items-center justify-between text-xs font-extrabold">
            <span dir="ltr">APPLICATION FOR EMPLOYMENT</span>
            <span>استمارة طلب توظيف معتمدة — صفحة 1 من 2</span>
          </div>

          {/* Top Summary Bilingual 3-Column Table + Half-Body Portrait */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            <div className="md:col-span-8 border border-[#e0e0e0] rounded-[16px] overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b border-[#e0e0e0]">
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-left w-1/3" dir="ltr">
                      Reference Code
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold">{cv.cv_code}</td>
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-right w-1/3">رقم السيرة المرجعي</td>
                  </tr>
                  <tr className="border-b border-[#e0e0e0]">
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-left" dir="ltr">
                      Position Applied For
                    </td>
                    <td className="p-2.5 text-center font-bold">{cv.job}</td>
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-right">المهنة المطلوبة</td>
                  </tr>
                  <tr className="border-b border-[#e0e0e0]">
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-left" dir="ltr">
                      {activePreset.pricingDisplayMode === 'RENTAL_PACKAGE'
                        ? 'Monthly Package'
                        : 'Monthly Salary'}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-bold text-xs">
                        {displayedPriceLabel}
                      </span>
                    </td>
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-right">
                      {activePreset.pricingDisplayMode === 'RENTAL_PACKAGE'
                        ? 'قيمة باقة التشغيل الشهرية'
                        : 'الراتب الشهري المعتمد'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-left" dir="ltr">
                      Contract Period
                    </td>
                    <td className="p-2.5 text-center font-bold">
                      {cv.contract_period_years || 2} Years (سنتان)
                    </td>
                    <td className="p-2.5 bg-[#f3f3f3] font-semibold text-right">مدة التعاقد</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Portrait Photo Box */}
            <div className="md:col-span-4 border border-[#e0e0e0] rounded-[16px] bg-[#f3f3f3] p-3 flex flex-col items-center justify-center min-h-[165px]">
              {cv.portrait_url ? (
                <img
                  src={cv.portrait_url}
                  alt={cv.maid_name}
                  className="max-h-[145px] w-auto rounded-[12px] object-cover border border-[#e0e0e0]"
                />
              ) : (
                <div className="text-center space-y-1">
                  <div className="w-16 h-16 rounded-full bg-[#141414] text-[#ffffff] flex items-center justify-center font-extrabold text-lg mx-auto">
                    {(cv.maid_name || 'CV').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-[11px] font-bold text-[#141414]">الصورة الشخصية النصفية</div>
                  <div className="text-[10px] text-[#707070]" dir="ltr">
                    CANDIDATE PORTRAIT
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Split Columns: Personal + Passport + Experience | Languages + Full Standing Image */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Right/Left Info Tables (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              {/* Personal Information */}
              <div className="border border-[#e0e0e0] rounded-[16px] overflow-hidden">
                <div className="bg-[#141414] text-[#ffffff] px-3.5 py-2 text-xs font-bold flex justify-between">
                  <span>المعلومات الشخصية</span>
                  <span dir="ltr">PERSONAL INFORMATION</span>
                </div>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    {[
                      ['Full Name', cv.maid_name, 'الاسم الكامل'],
                      ['Nationality', cv.nationality, 'الجنسية'],
                      ['Religion', cv.religion, 'الديانة'],
                      ['Date of Birth / Age', `${cv.date_of_birth || '2000-01-01'} (${cv.age} سنة)`, 'تاريخ الميلاد / العمر'],
                      ['Marital Status', cv.marital_status, 'الحالة الاجتماعية'],
                      ['No. of Children', String(cv.children_count ?? 0), 'عدد الأطفال'],
                      ['Height / Weight', `${cv.height_cm || 160} cm / ${cv.weight_kg || 56} kg`, 'الطول / الوزن'],
                      ['Living Town', cv.living_town || 'ADDIS ABABA', 'مدينة السكن'],
                      ...(canViewInternalAudit && !activePreset.hideForeignAgencyIdentity && cv.labour_id
                        ? [['Labour ID', cv.labour_id, 'رقم العامل الوزاري']]
                        : []),
                    ].map(([en, val, ar], i) => (
                      <tr key={i} className="border-b border-[#e0e0e0] last:border-b-0">
                        <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-left w-1/3" dir="ltr">
                          {en}
                        </td>
                        <td className="p-2 text-center font-bold text-[#141414]">{val}</td>
                        <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-right w-1/3">{ar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Passport & Experience */}
              <div className="border border-[#e0e0e0] rounded-[16px] overflow-hidden">
                <div className="bg-[#141414] text-[#ffffff] px-3.5 py-2 text-xs font-bold flex justify-between">
                  <span>بيانات جواز السفر والخبرة والتعليم</span>
                  <span dir="ltr">PASSPORT & EXPERIENCE</span>
                </div>
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-left w-1/3" dir="ltr">
                        Passport No.
                      </td>
                      <td className="p-2 text-center font-mono font-bold">{displayedPassport}</td>
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-right w-1/3">رقم الجواز</td>
                    </tr>
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-left" dir="ltr">
                        Issue / Expiry
                      </td>
                      <td className="p-2 text-center font-mono">
                        {cv.passport_issue_date || '2024-09'} → {cv.passport_expiry_date || '2029-09'}
                      </td>
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-right">الإصدار / الانتهاء</td>
                    </tr>
                    <tr className="border-b border-[#e0e0e0]">
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-left" dir="ltr">
                        Previous Experience
                      </td>
                      <td className="p-2 text-center font-bold">
                        {cv.experience_country || (cv.experience_years ? `${cv.experience_years} سنوات` : 'أول مرة (First-Timer)')}
                      </td>
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-right">الخبرة السابقة</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-left" dir="ltr">
                        Education
                      </td>
                      <td className="p-2 text-center font-bold">{cv.education_level || 'Primary / أساسي'}</td>
                      <td className="p-2 bg-[#f3f3f3] text-[#707070] font-semibold text-right">المؤهل التعليمي</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Languages + Full Standing Image (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="border border-[#e0e0e0] rounded-[16px] overflow-hidden">
                <div className="bg-[#141414] text-[#ffffff] px-3.5 py-2 text-xs font-bold flex justify-between">
                  <span>مستوى اللغات</span>
                  <span dir="ltr">LANGUAGES</span>
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#f0f0f0]">
                    <span className="font-bold">اللغة العربية (Arabic)</span>
                    {renderStarRow(cv.arabic_stars ?? 2)}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-bold">اللغة الإنجليزية (English)</span>
                    {renderStarRow(cv.english_stars ?? 3)}
                  </div>
                </div>
              </div>

              <div className="flex-1 border border-[#e0e0e0] rounded-[16px] bg-[#f3f3f3] p-4 flex flex-col items-center justify-center min-h-[260px]">
                {cv.full_image_url ? (
                  <img
                    src={cv.full_image_url}
                    alt={`${cv.maid_name} Full`}
                    className="max-h-[250px] w-auto rounded-[12px] object-contain"
                  />
                ) : (
                  <div className="text-center space-y-1.5">
                    <div className="text-xs font-bold text-[#141414]">FULL IMAGE | الصورة الكاملة بالزي الموحد</div>
                    <div className="text-[11px] text-[#707070]">
                      مرفقة ومعتمدة ضمن ملف المرشحة الأصلي ({cv.cv_code})
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= PAGE 2: SKILLS MATRIX, PASSPORT & VIDEO QR ================= */}
        <div
          className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-5 text-[#141414]"
          style={{ pageBreakBefore: 'always' }}
        >
          <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full px-5 py-2 flex items-center justify-between text-xs font-extrabold">
            <span>{activePreset.companyNameAr} — السيرة المعتمدة ({cv.cv_code})</span>
            <span>صفحة 2 من 2 | SKILLS & VERIFICATION</span>
          </div>

          {/* 9-Skill Bilingual Matrix */}
          <div className="border border-[#e0e0e0] rounded-[16px] overflow-hidden">
            <div className="bg-[#141414] text-[#ffffff] px-4 py-2.5 text-xs font-bold flex justify-between">
              <span>مصفوفة المهارات والقدرات العملية (9 مهارات)</span>
              <span dir="ltr">SKILLS & HOUSEHOLD COMPETENCIES</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[#e0e0e0]">
              {NINE_BILINGUAL_SKILLS.map((sk, idx) => {
                const active = hasSkill(sk.keywords, idx);
                return (
                  <div
                    key={sk.en}
                    className="p-3 flex items-center justify-between border-b border-[#e0e0e0] text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#141414]">{sk.ar}</div>
                      <div className="text-[10px] text-[#707070]" dir="ltr">
                        {sk.en}
                      </div>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        active
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f3f3f3] text-[#adadad] border border-[#e0e0e0]'
                      }`}
                    >
                      {active ? <Check className="w-3.5 h-3.5" /> : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Passport Image Frame */}
          <div className="border border-[#e0e0e0] rounded-[16px] overflow-hidden">
            <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] px-4 py-2 text-xs font-bold flex justify-between">
              <span>صورة جواز السفر والتحقق الآلي (ICAO MRZ)</span>
              <span dir="ltr">PASSPORT IMAGE & VERIFICATION</span>
            </div>
            <div className="p-5 bg-[#ffffff] flex flex-col items-center justify-center min-h-[170px]">
              {cv.passport_image_url && !activePreset.maskPassportBeforeContract ? (
                <img
                  src={cv.passport_image_url}
                  alt="Passport Scan"
                  className="max-h-[190px] w-auto rounded-[12px] border border-[#e0e0e0]"
                />
              ) : (
                <div className="w-full max-w-lg bg-[#f3f3f3] border border-[#e0e0e0] rounded-[16px] p-4 text-center space-y-1.5">
                  <div className="text-xs font-bold text-[#141414]">
                    تم التحقق من سلامة وسريان جواز السفر رقم ({displayedPassport})
                  </div>
                  <div className="text-[11px] text-[#707070]">
                    {activePreset.maskPassportBeforeContract
                      ? 'تُحجب الصورة الكاملة لجواز السفر قبل إبرام عقد مساند التزاماً بنظام حماية البيانات الشخصية السعودي (PDPL).'
                      : 'الجواز مطابق لقاعدة الفحص ومرفق بالأصل لدى قسم المتابعة الخارجية.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Candidate Video QR + Office Contact Footer */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-4">
            <div className="md:col-span-8 space-y-1.5">
              <div className="text-xs font-extrabold text-[#141414] flex items-center gap-1.5">
                <Video className="w-4 h-4" />
                <span>فيديو مقابلة المرشحة والضمان النظامي | Candidate Video</span>
              </div>
              <p className="text-[11px] text-[#707070] leading-relaxed">{activePreset.warrantyClauseAr}</p>
              <div className="text-xs font-bold text-[#141414] pt-1">
                أرقام حجز ومبيعات المكتب:{' '}
                <span className="font-mono" dir="ltr">
                  {activePreset.salesPhones.join(' • ')}
                </span>{' '}
                | البريد:{' '}
                <span className="font-mono" dir="ltr">
                  {activePreset.salesEmail}
                </span>
              </div>
            </div>
            <div className="md:col-span-4 flex items-center justify-end gap-3">
              <div
                className="bg-[#ffffff] p-2 rounded-[14px] border border-[#e0e0e0]"
                dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share via Email / WhatsApp Modal */}
      {showShareModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowShareModal(null)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h4 className="font-bold text-sm text-[#141414]">
                {showShareModal === 'whatsapp'
                  ? 'إرسال السيرة عبر الواتساب بهوية المكتب'
                  : 'إرسال السيرة عبر البريد الإلكتروني بهوية المكتب'}
              </h4>
              <button
                type="button"
                onClick={() => setShowShareModal(null)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmShare} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#707070] mb-1">اسم المستلم (العميل / المبيعات)</label>
                <input
                  type="text"
                  required
                  value={shareRecipientName}
                  onChange={(e) => setShareRecipientName(e.target.value)}
                  placeholder="مثال: أ. محمد العتيبي"
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f0f0f0] text-[#141414]"
                />
              </div>
              {showShareModal === 'whatsapp' ? (
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم الواتساب</label>
                  <input
                    type="text"
                    required
                    value={shareRecipientPhone}
                    onChange={(e) => setShareRecipientPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-[#707070] mb-1">البريد الإلكتروني للمستلم</label>
                  <input
                    type="email"
                    required
                    value={shareRecipientEmail}
                    onChange={(e) => setShareRecipientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  إرسال وتوثيق بالسجل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Office Export Preset Designer Modal */}
      {showCustomPresetModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCustomPresetModal(false)}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 max-w-lg w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h4 className="font-bold text-sm text-[#141414]">إنشاء صيغة تصدير مخصصة لمكتب</h4>
              <button
                type="button"
                onClick={() => setShowCustomPresetModal(false)}
                className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCustomPreset} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">اسم المكتب بالعربية</label>
                  <input
                    type="text"
                    required
                    value={customForm.companyNameAr}
                    onChange={(e) => setCustomForm({ ...customForm, companyNameAr: e.target.value })}
                    className="w-full px-3 py-2 rounded-[16px] bg-[#f0f0f0] text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رمز المكتب المختصر</label>
                  <input
                    type="text"
                    required
                    value={customForm.officeCode}
                    onChange={(e) => setCustomForm({ ...customForm, officeCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#707070] mb-1">رقم ترخيص مساند</label>
                  <input
                    type="text"
                    value={customForm.musanedLicenseNo}
                    onChange={(e) => setCustomForm({ ...customForm, musanedLicenseNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#707070] mb-1">جوال المبيعات</label>
                  <input
                    type="text"
                    value={customForm.salesPhone}
                    onChange={(e) => setCustomForm({ ...customForm, salesPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customForm.hideForeignAgencyIdentity}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, hideForeignAgencyIdentity: e.target.checked })
                    }
                  />
                  <span>إخفاء بيانات الوكيل الأجنبي (White-Label)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customForm.maskPassportBeforeContract}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, maskPassportBeforeContract: e.target.checked })
                    }
                  />
                  <span>تشفير جزئي للجواز (PDPL)</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowCustomPresetModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ القالب وتفعيله
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalAgencyCvTemplate;
