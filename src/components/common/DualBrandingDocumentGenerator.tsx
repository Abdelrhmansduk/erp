import React from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { CompanyLogo } from './CompanyLogo';

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
    <div style={{ backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '900px', margin: '0 auto' }}>
      {/* Official Header - Dual Branding */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #141414', paddingBottom: '20px', marginBottom: '24px' }}>
        {/* Left Side: Group Logo & Company Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <img src="/logo.png" alt="Group Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid #e0e0e0' }} />
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#141414', marginTop: '2px' }}>خالد السليم</div>
          </div>

          <div style={{ height: '40px', width: '1px', backgroundColor: '#e0e0e0' }} />

          <CompanyLogo companyId={activeCompanyId} size={48} />

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#141414', margin: 0 }}>
              {activeCompany.name}
            </h2>
            <div style={{ fontSize: '12px', color: '#707070', fontWeight: '600' }}>
              {activeCompany.nameEn}
            </div>
            <div style={{ fontSize: '11px', color: '#707070', marginTop: '2px' }}>
              الرقم الضريبي: <strong>{activeCompany.taxNumber}</strong> | السجل التجاري: <strong>{activeCompany.crNumber}</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Document Title & QR Code */}
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#141414', margin: 0 }}>
            {documentTitle}
          </h3>
          <div style={{ fontSize: '12px', color: '#141414', fontWeight: '700', marginTop: '4px', fontFamily: 'monospace' }}>
            رقم المستند: {documentNumber}
          </div>
          <div style={{ fontSize: '11px', color: '#707070' }}>التاريخ: {date}</div>
        </div>
      </div>

      {/* Document Main Content */}
      <div style={{ minHeight: '300px', marginBottom: '24px' }}>
        {children}
      </div>

      {/* Official Footer */}
      <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#707070' }}>
        <div>
          العنوان: {activeCompany.address} | هاتف: {activeCompany.phone} | البريد الإلكتروني: {activeCompany.email}
        </div>
        <div style={{ fontWeight: '700' }}>
          صفحة 1 من 1 | نظام مجموعة شركات خالد السليم الموحد
        </div>
      </div>

      {/* Print Controls */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
