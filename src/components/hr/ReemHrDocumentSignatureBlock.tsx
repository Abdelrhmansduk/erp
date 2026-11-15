import React from 'react';
import { CheckSquare, Square, FileSignature } from 'lucide-react';
import {
  REEM_HR_SIGNATORY,
  KAS_TRADING_GROUP_LOGO_DATA_URI,
} from '../../services/reemHrEmailTemplatesEngine';

const HR_SECTION_KEY_PATTERN =
  /^(?:employees|payroll|attendance|attendances|leaves|custodies|recruitment|hr_|kas_official_emails|musaned|shelter|workers|maids|visas|eosb|gosi|qiwa|muqeem)/i;

const HR_TITLE_KEYWORD_PATTERN =
  /(الموارد البشرية|\bhr\b|موظف|الموظفين|شؤون الموظفين|قسيمة|راتب|رواتب|إجازة|اجازة|سلفة|سلف|جزاء|مخالفة|تأديب|إنذار|انذار|استئذان|مكافأة|عهدة|عهد|حضور|انصراف|بصمة|تعريف|مخالصة|إخلاء|اخلاء|شهادة خبرة|عدم ممانعة|ترقية|تأمينات|قوى|مقيم|توطين|نطاقات|مرشح|عرض وظيفي|تقييم أداء|مباشرة|تجربة|خطاب|امتثال|مساند|إيواء|سكن العمالة|توقيع|اتفاقية|payslip|payroll|onboarding|offboarding|employee|attendance|custod)/i;

export function isHrDocumentSection(sectionKey?: string, title?: string): boolean {
  const cleanKey = String(sectionKey || '').trim();
  if (cleanKey && HR_SECTION_KEY_PATTERN.test(cleanKey)) {
    return true;
  }
  const probe = `${cleanKey} ${String(title || '').trim()}`;
  return HR_TITLE_KEYWORD_PATTERN.test(probe);
}

export interface IncludeReemSignatureToggleProps {
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  compact?: boolean;
  className?: string;
}

export const IncludeReemSignatureToggle: React.FC<IncludeReemSignatureToggleProps> = ({
  checked,
  onChange,
  compact = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      data-testid="toggle-reem-hr-signature"
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold transition-all cursor-pointer ${
        compact ? 'px-3 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
      } ${
        checked
          ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
          : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]'
      } ${className}`}
      title="تضمين أو إخفاء التوقيع الرسمي لمديرة الموارد البشرية (أ. ريم احمد بن حسين — HR@kas.sa) في المستند المطبوع والمصدّر"
    >
      {checked ? (
        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Square className="w-3.5 h-3.5 shrink-0" />
      )}
      <FileSignature className="w-3.5 h-3.5 shrink-0" />
      <span>
        {compact
          ? 'تضمين توقيع أ. ريم بن حسين (HR@kas.sa)'
          : 'تضمين توقيع مديرة الموارد البشرية (أ. ريم بن حسين — HR@kas.sa)'}
      </span>
    </button>
  );
};

export interface ReemHrDocumentSignatureBlockProps {
  enabled?: boolean;
  referenceNumber?: string;
  dateStr?: string;
  issueDate?: string;
  hideHoldingLogo?: boolean;
  hideHoldingGroupBrand?: boolean;
  compact?: boolean;
  className?: string;
}

export const ReemHrDocumentSignatureBlock: React.FC<ReemHrDocumentSignatureBlockProps> = ({
  enabled = true,
  referenceNumber,
  dateStr,
  issueDate,
  hideHoldingLogo = false,
  hideHoldingGroupBrand = false,
  compact = false,
  className = '',
}) => {
  if (!enabled) return null;
  const effectiveDate = dateStr || issueDate || new Date().toISOString().slice(0, 10);
  const effectiveHideLogo = hideHoldingLogo || hideHoldingGroupBrand;

  return (
    <div
      data-slot="reem-hr-official-signature-block"
      className={`rounded-[16px] border border-[#141414] bg-[#ffffff] ${
        compact ? 'p-3.5' : 'p-5'
      } text-[#141414] print:bg-[#ffffff] print:border-[#141414] ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        {/* Right Side: Arabic Official HR Signatory & Stamp */}
        <div className="space-y-1 text-right" dir="rtl">
          <div className="text-[11px] font-semibold text-[#707070]">
            تفضلوا بقبول فائق الاحترام ..
          </div>
          <div className="text-sm font-black text-[#141414] pt-0.5">
            {REEM_HR_SIGNATORY.nameAr} ({REEM_HR_SIGNATORY.fullNameAr})
          </div>
          <div className="text-xs font-bold text-[#141414]">
            {REEM_HR_SIGNATORY.titleAr}
          </div>
          <div className="text-[11px] font-semibold text-[#707070]">
            {REEM_HR_SIGNATORY.departmentAr} — {REEM_HR_SIGNATORY.groupNameAr}
          </div>
          <div className="inline-flex items-center gap-2 flex-wrap pt-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
              ✓ توقيع وختم إلكتروني معتمد ({REEM_HR_SIGNATORY.email})
            </span>
            {referenceNumber && (
              <span className="font-mono text-[10px] font-bold text-[#707070]">
                المرجع: {referenceNumber}
              </span>
            )}
            <span className="font-mono text-[10px] text-[#707070]">
              التاريخ: {effectiveDate}
            </span>
          </div>
        </div>

        {/* Left Side: Official Stacked Logo + 4-Line English Serif Signature (Verbatim Outlook Format) */}
        <div
          dir="ltr"
          className="text-left border-t sm:border-t-0 sm:border-r border-[#e0e0e0] pt-3 sm:pt-0 sm:pl-4 flex flex-col items-start bg-[#ffffff]"
        >
          {!effectiveHideLogo && (
            <img
              src={KAS_TRADING_GROUP_LOGO_DATA_URI}
              alt={REEM_HR_SIGNATORY.groupBannerText}
              style={{ width: compact ? '115px' : '135px', height: 'auto', display: 'block' }}
              className="object-contain bg-[#ffffff] mb-2.5 shrink-0"
            />
          )}
          <div
            style={{
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              lineHeight: 1.55,
            }}
            className="text-[#141414] text-left"
          >
            <div className="text-[14px] font-bold text-[#141414]">
              {REEM_HR_SIGNATORY.signatureNameEn}
            </div>
            <div className="text-[12.5px] font-normal text-[#141414]">
              {REEM_HR_SIGNATORY.consultantTitleEn}
            </div>
            <div className="text-[12.5px] font-normal text-[#141414]">
              Email: {REEM_HR_SIGNATORY.email}
            </div>
            <div className="text-[12.5px] font-normal text-[#141414]">
              Mobile: {REEM_HR_SIGNATORY.mobile}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function buildReemHrDocumentSignatureHtml(options?: {
  referenceNo?: string;
  referenceNumber?: string;
  dateIso?: string;
  issueDate?: string;
  hideHoldingLogo?: boolean;
  hideHoldingGroupBrand?: boolean;
}): string {
  const effectiveDate =
    options?.dateIso || options?.issueDate || new Date().toISOString().slice(0, 10);
  const effectiveRef = options?.referenceNo || options?.referenceNumber;
  const effectiveHideLogo = Boolean(options?.hideHoldingLogo || options?.hideHoldingGroupBrand);
  const refBadge = effectiveRef
    ? `<span style="font-family:monospace;font-size:10px;color:#707070;margin-right:8px;">المرجع: ${effectiveRef}</span>`
    : '';
  const logoHtml = effectiveHideLogo
    ? ''
    : `<img src="${KAS_TRADING_GROUP_LOGO_DATA_URI}" alt="${REEM_HR_SIGNATORY.groupBannerText}" width="135" style="width:135px;height:auto;display:block;border:0;background:#ffffff;margin:0 0 10px 0;" />`;

  return `
    <div data-reem-hr-signature="true" dir="rtl" style="margin-top:18px;padding:16px 20px;border:1.5px solid #141414;border-radius:14px;background:#ffffff;color:#141414;page-break-inside:avoid;break-inside:avoid;">
      <table style="width:100%;border-collapse:collapse;border:none;background:#ffffff;">
        <tr>
          <td dir="rtl" style="text-align:right;vertical-align:bottom;border:none;padding:0 0 0 16px;width:52%;background:#ffffff;">
            <div style="font-size:11px;font-weight:600;color:#707070;">تفضلوا بقبول فائق الاحترام ..</div>
            <div style="font-size:14.5px;font-weight:800;color:#141414;margin-top:4px;">${REEM_HR_SIGNATORY.nameAr} (${REEM_HR_SIGNATORY.fullNameAr})</div>
            <div style="font-size:12.5px;font-weight:700;color:#141414;margin-top:2px;">${REEM_HR_SIGNATORY.titleAr}</div>
            <div style="font-size:11px;font-weight:600;color:#707070;margin-top:2px;">${REEM_HR_SIGNATORY.departmentAr} — ${REEM_HR_SIGNATORY.groupNameAr}</div>
            <div style="margin-top:8px;">
              <span style="display:inline-block;background:#141414;color:#ffffff;font-size:9.5px;font-weight:700;padding:2px 10px;border-radius:9999px;">✓ توقيع وختم إلكتروني معتمد (${REEM_HR_SIGNATORY.email})</span>
              ${refBadge}
              <span style="font-family:monospace;font-size:10px;color:#707070;margin-right:8px;">التاريخ: ${effectiveDate}</span>
            </div>
          </td>
          <td dir="ltr" align="left" style="text-align:left;vertical-align:bottom;border:none;border-right:1px solid #e0e0e0;padding:0 16px 0 0;width:48%;background:#ffffff;direction:ltr;">
            ${logoHtml}
            <div style="font-family:'Times New Roman',Times,Georgia,serif;color:#141414;line-height:1.6;text-align:left;direction:ltr;">
              <div style="font-size:14px;font-weight:bold;color:#141414;">${REEM_HR_SIGNATORY.signatureNameEn}</div>
              <div style="font-size:12.5px;font-weight:normal;color:#141414;">${REEM_HR_SIGNATORY.consultantTitleEn.replace(/&/g, '&amp;')}</div>
              <div style="font-size:12.5px;font-weight:normal;color:#141414;">Email: ${REEM_HR_SIGNATORY.email}</div>
              <div style="font-size:12.5px;font-weight:normal;color:#141414;">Mobile: ${REEM_HR_SIGNATORY.mobile}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}
