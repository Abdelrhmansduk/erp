import i18n from '../../i18n/config';
import React from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { CompanyLogo } from './CompanyLogo';
import {
  encodeZatcaTlvBase64,
  generateRealQrSvg,
  generateRealCode128BarcodeSvg,
} from '../../utils/realBarcodeGenerator';

interface DualBrandingDocumentGeneratorProps {
  documentTitle: string;
  documentNumber: string;
  date: string;
  children: React.ReactNode;
  onPrint?: () => void;
}

export const DualBrandingDocumentGenerator: React.FC<DualBrandingDocumentGeneratorProps> = ({
  documentTitle,
  documentNumber,
  date,
  children,
  onPrint,
}) => {
  const { activeCompany, activeCompanyId } = useCompany();

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '900px', margin: '0 auto' }}>
      {/* Official Header - Dual Branding */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', borderBottom: '2px solid #141414', paddingBottom: '16px', marginBottom: '16px' }}>
        {/* Right Side (in RTL): Group Logo & Company Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 320px' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <CompanyLogo companyId={'GROUP' as any} size={44} />
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#141414', marginTop: '3px', whiteSpace: 'nowrap' }}>خالد السليم</div>
          </div>

          <div style={{ height: '40px', width: '1px', backgroundColor: '#e0e0e0', flexShrink: 0 }} />

          <div style={{ flexShrink: 0 }}>
            <CompanyLogo
              companyId={(['GROUP', 'HOLDING'].includes(String(activeCompanyId).toUpperCase()) ? 'SAF' : activeCompanyId) as any}
              size={44}
            />
          </div>

          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#141414', margin: 0, lineHeight: 1.3 }}>
              {activeCompany.name}
            </h2>
            <div style={{ fontSize: '11px', color: '#707070', fontWeight: '600', marginTop: '2px' }}>
              {activeCompany.nameEn}
            </div>
            <div style={{ fontSize: '11px', color: '#707070', marginTop: '3px' }}>
              الرقم الضريبي: <strong dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>{activeCompany.taxNumber}</strong> | السجل التجاري: <strong dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>{activeCompany.crNumber}</strong>
            </div>
          </div>
        </div>

        {/* Left Side (in RTL): Document Meta, Real QR Code & Barcode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '12px', color: '#141414', fontWeight: '700', fontFamily: 'monospace' }}>
              رقم المستند: <span dir="ltr" style={{ display: 'inline-block', unicodeBidi: 'isolate' }}>{String(documentNumber || '').replace(/^#/, '')}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#707070', marginTop: '2px' }}>
              التاريخ: <span dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>{date}</span>
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
                  sellerName: activeCompany.name,
                  vatNumber: activeCompany.taxNumber,
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
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 16px', marginBottom: '18px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#141414', margin: 0 }}>
          {documentTitle}
        </h3>
      </div>

      {/* Document Main Content */}
      <div style={{ marginBottom: '20px' }}>
        {children}
      </div>

      {/* Official Footer */}
      <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: '#707070' }}>
        <div>
          العنوان: {activeCompany.address} | هاتف: <span dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>{activeCompany.phone}</span> | البريد الإلكتروني: <span dir="ltr" style={{ display: 'inline-block', fontFamily: 'monospace' }}>{activeCompany.email}</span>
        </div>
        <div style={{ fontWeight: '700' }}>
          صفحة 1 من 1 | نظام مجموعة شركات خالد السليم الموحد
        </div>
      </div>

      {/* Print Controls */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          type="button"
          onClick={() => onPrint ? onPrint() : window.print()}
          style={{ backgroundColor: '#141414', color: '#FFFFFF', border: 'none', borderRadius: '9999px', padding: '10px 22px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fa-solid fa-print"></i>
          <span>طباعة المستند الرسمي (Dual-Branding PDF)</span>
        </button>
      </div>
    </div>
  );
};
