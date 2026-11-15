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
      className={`rounded-[16px] border border-[#141414] bg-[#f3f3f3] ${
        compact ? 'p-3' : 'p-4'
      } text-[#141414] print:bg-[#ffffff] print:border-[#141414] ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Right Side: Arabic Official HR Signatory & Stamp */}
        <div className="space-y-1 text-right">
          <div className="text-[10.5px] font-bold text-[#707070]">
            اعتماد وتوقيع إدارة الموارد البشرية:
          </div>
          <div className="text-sm font-bold text-[#141414]">
            {REEM_HR_SIGNATORY.fullNameAr}
          </div>
          <div className="text-xs font-semibold text-[#262626]">
            {REEM_HR_SIGNATORY.titleAr} — {REEM_HR_SIGNATORY.departmentAr}
          </div>
          <div className="inline-flex items-center gap-2 flex-wrap pt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
              ✓ توقيع وختم إلكتروني معتمد
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

        {/* Left Side: Official 4-Line English Signature + KAS Group Logo */}
        <div
          dir="ltr"
          className="text-left border-t sm:border-t-0 sm:border-r border-[#e0e0e0] pt-2.5 sm:pt-0 sm:pr-4 flex items-center gap-3"
        >
          {!effectiveHideLogo && (
            <img
              src={KAS_TRADING_GROUP_LOGO_DATA_URI}
              alt={REEM_HR_SIGNATORY.groupBannerText}
              className="w-24 h-auto object-contain rounded-[8px] border border-[#e0e0e0] bg-[#141414] p-1 shrink-0"
            />
          )}
          <div
            style={{
              fontFamily: "'Times New Roman', Georgia, serif",
              lineHeight: 1.35,
            }}
            className="text-[#141414]"
          >
            <div className="text-[13px] font-bold text-[#141414]">
              {REEM_HR_SIGNATORY.signatureNameEn}
            </div>
            <div className="text-[11px] font-bold text-[#262626]">
              {REEM_HR_SIGNATORY.consultantTitleEn}
            </div>
            <div className="text-[11px] font-bold text-[#141414]">
              Email: {REEM_HR_SIGNATORY.email}
            </div>
            <div className="text-[11px] font-bold text-[#141414]">
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
    : `<img src="${KAS_TRADING_GROUP_LOGO_DATA_URI}" alt="${REEM_HR_SIGNATORY.groupBannerText}" style="width:110px;height:auto;border-radius:8px;border:1px solid #e0e0e0;background:#141414;padding:4px;display:block;margin-bottom:6px;" />`;

  return `
    <div data-reem-hr-signature="true" dir="rtl" style="margin-top:18px;padding:14px 18px;border:1.5px solid #141414;border-radius:14px;background:#f3f3f3;color:#141414;page-break-inside:avoid;break-inside:avoid;">
      <table style="width:100%;border-collapse:collapse;border:none;">
        <tr>
          <td style="text-align:right;vertical-align:middle;border:none;padding:0;width:55%;">
            <div style="font-size:10.5px;font-weight:700;color:#707070;">اعتماد وتوقيع مديرة الموارد البشرية (HR Official Signature):</div>
            <div style="font-size:14px;font-weight:800;color:#141414;margin-top:3px;">${REEM_HR_SIGNATORY.fullNameAr}</div>
            <div style="font-size:11.5px;font-weight:700;color:#262626;margin-top:2px;">${REEM_HR_SIGNATORY.titleAr} — ${REEM_HR_SIGNATORY.departmentAr}</div>
            <div style="margin-top:6px;">
              <span style="display:inline-block;background:#141414;color:#ffffff;font-size:9.5px;font-weight:700;padding:2px 10px;border-radius:9999px;">✓ توقيع وختم إلكتروني معتمد (${REEM_HR_SIGNATORY.email})</span>
              ${refBadge}
              <span style="font-family:monospace;font-size:10px;color:#707070;margin-right:8px;">التاريخ: ${effectiveDate}</span>
            </div>
          </td>
          <td dir="ltr" style="text-align:left;vertical-align:middle;border:none;border-right:1px solid #e0e0e0;padding:0 0 0 14px;width:45%;">
            ${logoHtml}
            <div style="font-family:'Times New Roman',Georgia,serif;color:#141414;line-height:1.35;text-align:left;">
              <div style="font-size:13px;font-weight:bold;color:#141414;">${REEM_HR_SIGNATORY.signatureNameEn}</div>
              <div style="font-size:11px;font-weight:bold;color:#262626;">${REEM_HR_SIGNATORY.consultantTitleEn.replace(/&/g, '&amp;')}</div>
              <div style="font-size:11px;font-weight:bold;color:#141414;">Email: ${REEM_HR_SIGNATORY.email}</div>
              <div style="font-size:11px;font-weight:bold;color:#141414;">Mobile: ${REEM_HR_SIGNATORY.mobile}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}
