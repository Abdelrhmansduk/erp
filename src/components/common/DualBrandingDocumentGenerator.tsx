import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckSquare, Square, PenLine } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { CompanyLogo } from './CompanyLogo';
import {
  encodeZatcaTlvBase64,
  generateRealQrSvg,
  generateRealCode128BarcodeSvg,
} from '../../utils/realBarcodeGenerator';
import {
  ALL_ENTITY_OPTIONS,
  CanonicalEntityCode,
  resolveDocumentBranding,
  setEntityHideHoldingPreference,
} from '../../services/entityBrandingService';
import { printSpecificElement } from '../../utils/printManager';
import { RecordQuickActions } from './RecordQuickActions';

export interface DualBrandingDocumentGeneratorProps {
  documentTitle: string;
  documentNumber: string;
  date: string;
  children: React.ReactNode;
  onPrint?: () => void;
  entityOrRecord?: unknown;
  entityCode?: string;
  hideHoldingGroupBrand?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  showToolbar?: boolean;
}

export const DualBrandingDocumentGenerator: React.FC<DualBrandingDocumentGeneratorProps> = ({
  documentTitle,
  documentNumber,
  date,
  children,
  onPrint,
  entityOrRecord,
  entityCode,
  hideHoldingGroupBrand,
  recipientName,
  recipientPhone,
  recipientEmail,
  showToolbar = true,
}) => {
  const { activeCompanyId } = useCompany();
  const sheetRef = useRef<HTMLDivElement>(null);

  const initialBranding = resolveDocumentBranding(entityOrRecord || activeCompanyId, {
    entityCode,
    hideHoldingGroupBrand,
  });

  const [selectedEntity, setSelectedEntity] = useState<CanonicalEntityCode>(initialBranding.code);
  const [hideGroupBrand, setHideGroupBrand] = useState<boolean>(initialBranding.hideHoldingGroupBrand);
  const [liveTitle, setLiveTitle] = useState<string>(documentTitle);
  const [editingHeader, setEditingHeader] = useState<boolean>(false);
  const [customEntityName, setCustomEntityName] = useState<string>('');

  useEffect(() => {
    setLiveTitle(documentTitle);
  }, [documentTitle]);

  useEffect(() => {
    const resolved = resolveDocumentBranding(entityOrRecord || activeCompanyId, {
      entityCode,
      hideHoldingGroupBrand,
    });
    setSelectedEntity(resolved.code);
    setHideGroupBrand(resolved.hideHoldingGroupBrand);
  }, [entityOrRecord, entityCode, hideHoldingGroupBrand, activeCompanyId]);

  const branding = resolveDocumentBranding(entityOrRecord || selectedEntity, {
    entityCode: selectedEntity,
    hideHoldingGroupBrand: hideGroupBrand,
    customCompanyNameAr: customEntityName || undefined,
  });

  const handleToggleHideGroup = () => {
    const next = !hideGroupBrand;
    setHideGroupBrand(next);
    setEntityHideHoldingPreference(selectedEntity, next);
  };

  return (
    <div
      ref={sheetRef}
      data-printable-card="true"
      data-a4-fullpage="true"
      className="erp-printable-sheet erp-a4-sheet bg-[#ffffff] p-8 rounded-[24px] border border-[#e0e0e0] max-w-[210mm] mx-auto"
    >
      <div>
      {/* Interactive Pre-Print Entity & Branding Toolbar (Hidden in Print) */}
      {showToolbar && (
        <div className="no-print print:hidden mb-4 p-3 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#141414]">
              <Building2 className="w-3.5 h-3.5" />
              <span>الشركة المُصدِرة:</span>
            </span>
            <select
              value={selectedEntity}
              onChange={(e) => {
                const code = e.target.value as CanonicalEntityCode;
                setSelectedEntity(code);
                const nextBrand = resolveDocumentBranding(code, { entityCode: code });
                setHideGroupBrand(nextBrand.hideHoldingGroupBrand);
              }}
              aria-label="اختيار الشركة المصدرة للمستند"
              className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] focus:outline-none focus:border-[#141414]"
            >
              {ALL_ENTITY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.labelAr}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleToggleHideGroup}
              className={`px-3 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                hideGroupBrand
                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
              }`}
            >
              {hideGroupBrand ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5 text-[#707070]" />
              )}
              <span>إلغاء جملة وشعار مجموعة خالد السليم</span>
            </button>

            <button
              type="button"
              onClick={() => setEditingHeader((v) => !v)}
              className={`px-3 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                editingHeader
                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>تحرير العناوين</span>
            </button>
          </div>

          <RecordQuickActions
            showLabels
            sharePayload={{
              title: liveTitle,
              referenceNumber: documentNumber,
              recipientName,
              recipientPhone,
              recipientEmail,
              entityCode: selectedEntity,
              hideHoldingGroupBrand: hideGroupBrand,
              summaryLines: [
                { label: 'رقم المستند', value: documentNumber },
                { label: 'تاريخ الإصدار', value: date },
                { label: 'الجهة المصدرة', value: branding.displayNameAr },
              ],
            }}
            onPrint={() => (onPrint ? onPrint() : printSpecificElement(sheetRef.current))}
          />
        </div>
      )}

      {editingHeader && (
        <div className="no-print print:hidden mb-4 p-3 rounded-[16px] bg-[#ffffff] border border-[#141414] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#141414] mb-1">
              تعديل عنوان المستند الرسمي:
            </label>
            <input
              type="text"
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#141414] mb-1">
              اسم مخصص للجهة المصدرة (اختياري):
            </label>
            <input
              type="text"
              value={customEntityName}
              onChange={(e) => setCustomEntityName(e.target.value)}
              placeholder={branding.entity.nameAr}
              className="w-full px-3 py-1.5 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
            />
          </div>
        </div>
      )}

      {/* Official Header - Entity-Aware Dual or Standalone Branding */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          borderBottom: '2px solid #141414',
          paddingBottom: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 320px' }}>
          {!branding.hideHoldingGroupBrand && (
            <>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <CompanyLogo companyId={'GROUP' as any} size={44} />
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#141414',
                    marginTop: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  خالد السليم
                </div>
              </div>
              <div
                style={{
                  height: '40px',
                  width: '1px',
                  backgroundColor: '#e0e0e0',
                  flexShrink: 0,
                }}
              />
            </>
          )}

          <div style={{ flexShrink: 0 }}>
            <CompanyLogo
              companyId={(branding.code === 'HQ' ? (branding.hideHoldingGroupBrand ? 'KAS' : 'GROUP') : branding.code) as any}
              size={44}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#141414',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {branding.displayNameAr}
            </h2>
            <div style={{ fontSize: '11px', color: '#707070', fontWeight: '600', marginTop: '2px' }}>
              {branding.displayNameEn}
            </div>
            <div style={{ fontSize: '11px', color: '#707070', marginTop: '3px' }}>
              الرقم الضريبي:{' '}
              <strong dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>
                {branding.taxNumber}
              </strong>{' '}
              | السجل التجاري:{' '}
              <strong dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>
                {branding.crNumber}
              </strong>
            </div>
          </div>
        </div>

        {/* Left Side (in RTL): Document Meta, Real QR Code & Barcode */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            textAlign: 'left',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                color: '#141414',
                fontWeight: '700',
                fontFamily: 'monospace',
              }}
            >
              رقم المستند:{' '}
              <span dir="ltr" style={{ display: 'inline-block', unicodeBidi: 'isolate' }}>
                {String(documentNumber || '').replace(/^#/, '')}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#707070', marginTop: '2px' }}>
              التاريخ:{' '}
              <span dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>
                {date}
              </span>
            </div>
            <div
              style={{ marginTop: '6px' }}
              dangerouslySetInnerHTML={{
                __html: generateRealCode128BarcodeSvg(documentNumber, {
                  widthPx: 120,
                  heightPx: 22,
                  showText: false,
                }),
              }}
            />
          </div>
          <div
            style={{ flexShrink: 0 }}
            dangerouslySetInnerHTML={{
              __html: generateRealQrSvg(
                encodeZatcaTlvBase64({
                  sellerName: branding.displayNameAr,
                  vatNumber: branding.taxNumber,
                  timestampIso: date || new Date().toISOString(),
                  totalWithVat: 0,
                  vatAmount: 0,
                  serialNumber: documentNumber,
                }),
                { sizePx: 68 }
              ),
            }}
          />
        </div>
      </div>

      {/* Centered Official Document Title Banner */}
      <div
        style={{
          backgroundColor: '#f3f3f3',
          border: '1px solid #e0e0e0',
          borderRadius: '14px',
          padding: '10px 16px',
          marginBottom: '18px',
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#141414', margin: 0 }}>
          {liveTitle}
        </h3>
      </div>

      {/* Document Main Content */}
      <div style={{ marginBottom: '20px' }}>{children}</div>
      </div>

      {/* Official Footer & Print Controls */}
      <div>
      <div
        style={{
          borderTop: '1px solid #e0e0e0',
          paddingTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11px',
          color: '#707070',
        }}
      >
        <div>
          العنوان: {branding.address} | هاتف:{' '}
          <span dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>
            {branding.phone}
          </span>{' '}
          | البريد الإلكتروني:{' '}
          <span dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>
            {branding.email}
          </span>
        </div>
        <div style={{ fontWeight: '700', color: '#141414' }}>
          صفحة 1 من 1 | {branding.systemPlatformTitleAr}
        </div>
      </div>

      {/* Print Controls */}
      <div className="no-print print:hidden mt-4 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={() => (onPrint ? onPrint() : printSpecificElement(sheetRef.current))}
          className="px-5 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
        >
          <span>طباعة المستند الرسمي A4 / حفظ PDF</span>
        </button>
      </div>
      </div>
    </div>
  );
};
