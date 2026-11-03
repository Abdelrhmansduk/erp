import React from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  Cpu,
  FileCheck2,
  FileSpreadsheet,
  FolderKanban,
  Globe2,
  HardHat,
  HeartHandshake,
  Home,
  KeyRound,
  Landmark,
  Layers,
  MessageSquare,
  PackageCheck,
  Plane,
  QrCode,
  Receipt,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  IllustrationKey,
  getIllustrationMetadata,
  resolveIllustrationForTab,
} from '../../services/visualAssetsRegistry';

export interface BusinessIllustrationProps {
  type?: IllustrationKey;
  tabKey?: string;
  departmentId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
  showBackground?: boolean;
  variant?: 'funkyways' | 'vector';
}

const DIMENSIONS: Record<NonNullable<BusinessIllustrationProps['size']>, { w: number; h: number }> = {
  sm: { w: 68, h: 60 },
  md: { w: 136, h: 112 },
  lg: { w: 188, h: 148 },
  xl: { w: 240, h: 184 },
};

const ICON_MAP: Record<IllustrationKey, React.ElementType> = {
  'exec-command': Activity,
  'smacc-finance': Landmark,
  'zatca-einvoice': QrCode,
  'ocr-extractor': FileSpreadsheet,
  'musaned-recruitment': Globe2,
  'flexible-rental': CalendarClock,
  'ats-talent': Award,
  'hr-wps': Users,
  'crm-customer': HeartHandshake,
  'shelter-care': Home,
  'kas-tenders': HardHat,
  'empty-search': Search,
  'ai-copilot': Bot,
  'innovation': Sparkles,
  'treasury-vouchers': Receipt,
  'whatsapp-chat': MessageSquare,
  'legal-compliance': Scale,
  'iam-security': KeyRound,
  'attendance-monitoring': CalendarClock,
  'inventory-custody': PackageCheck,
  'reports-bi': BarChart3,
  'foreign-agencies': Globe2,
  'client-portal': Briefcase,
  'travel-logistics': Plane,
  'branch-network': Building2,
  'unified-comm': MessageSquare,
  'sent-messages': Send,
  'rent-packages': Layers,
  'sponsorship-transfer': FileCheck2,
  'master-constants': Cpu,
  'group-command': FolderKanban,
};

const MODULE_CODE_MAP: Record<IllustrationKey, string> = {
  'exec-command': 'EXEC-01',
  'smacc-finance': 'FIN-GL',
  'zatca-einvoice': 'ZATCA-2',
  'ocr-extractor': 'AI-OCR',
  'musaned-recruitment': 'MSND-03',
  'flexible-rental': 'RENT-04',
  'ats-talent': 'ATS-05',
  'hr-wps': 'HR-WPS',
  'crm-customer': 'CRM-07',
  'shelter-care': 'SHLT-08',
  'kas-tenders': 'KAS-09',
  'empty-search': 'QUERY',
  'ai-copilot': 'AI-CORE',
  'innovation': 'R&D-26',
  'treasury-vouchers': 'TRSR-V',
  'whatsapp-chat': 'COMM-WA',
  'legal-compliance': 'LEGAL',
  'iam-security': 'IAM-SEC',
  'attendance-monitoring': 'HR-ATT',
  'inventory-custody': 'INV-AST',
  'reports-bi': 'BI-RPT',
  'foreign-agencies': 'INTL-AG',
  'client-portal': 'B2B-VIP',
  'travel-logistics': 'FLIGHT',
  'branch-network': 'BR-18',
  'unified-comm': 'OMNI-CH',
  'sent-messages': 'MSG-LOG',
  'rent-packages': 'PKG-PRO',
  'sponsorship-transfer': 'NAQL-KF',
  'master-constants': 'SYS-CFG',
  'group-command': 'HOLDING',
};

/**
 * Mobbin Architectural Module Badge & Telemetry Card (DESIGN-mobbin.md Specification)
 * Replaces legacy cartoon illustrations with a high-contrast Swiss-grid squircle badge
 * (#ffffff / #f3f3f3 surface, 1px #e0e0e0 hairline, 30% squircle #141414 icon, #0066ff accent).
 */
export const BusinessIllustration: React.FC<BusinessIllustrationProps> = ({
  type,
  tabKey,
  departmentId,
  size = 'md',
  className = '',
}) => {
  const resolvedKey: IllustrationKey =
    type || resolveIllustrationForTab(tabKey, departmentId);
  const meta = getIllustrationMetadata(resolvedKey);
  const { w, h } = DIMENSIONS[size] || DIMENSIONS.md;
  const IconComponent = ICON_MAP[resolvedKey] || ShieldCheck;
  const moduleCode = MODULE_CODE_MAP[resolvedKey] || 'SYS-26';

  if (size === 'sm') {
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center select-none shrink-0 ${className}`}
        style={{
          width: w,
          height: h,
          borderRadius: '18px',
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          padding: '6px',
          gap: '4px',
        }}
        title={meta.titleAr}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '30%',
            backgroundColor: '#141414',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <IconComponent style={{ width: '16px', height: '16px', color: '#ffffff' }} />
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              width: '7px',
              height: '7px',
              borderRadius: '9999px',
              backgroundColor: '#0066ff',
              border: '1.5px solid #ffffff',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '8.5px',
            fontWeight: 700,
            fontFamily: 'var(--font-family-mono)',
            color: '#707070',
            letterSpacing: '0.03em',
            lineHeight: 1,
          }}
        >
          {moduleCode}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex flex-col justify-between select-none shrink-0 ${className}`}
      style={{
        width: w,
        height: h,
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        padding: '12px',
        overflow: 'hidden',
      }}
      title={meta.titleAr}
    >
      {/* Top Row: 30% Squircle Icon + Module Code Pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '30%',
            backgroundColor: '#141414',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconComponent style={{ width: '18px', height: '18px', color: '#ffffff' }} />
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            backgroundColor: '#f3f3f3',
            border: '1px solid #e0e0e0',
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: 'var(--font-family-mono)',
            color: '#141414',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '9999px',
              backgroundColor: '#0066ff',
            }}
          />
          {moduleCode}
        </span>
      </div>

      {/* Middle Row: Swiss Architectural Telemetry Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
          <div style={{ height: '4px', flex: 3, borderRadius: '9999px', backgroundColor: '#141414' }} />
          <div style={{ height: '4px', flex: 2, borderRadius: '9999px', backgroundColor: '#0066ff' }} />
          <div style={{ height: '4px', flex: 1, borderRadius: '9999px', backgroundColor: '#e0e0e0' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '75%' }}>
          <div style={{ height: '4px', flex: 2, borderRadius: '9999px', backgroundColor: '#e0e0e0' }} />
          <div style={{ height: '4px', flex: 1, borderRadius: '9999px', backgroundColor: '#f3f3f3' }} />
        </div>
      </div>

      {/* Bottom Row: Badge Title */}
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: '#707070',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
          textAlign: 'right',
        }}
      >
        {meta.badgeAr}
      </div>
    </div>
  );
};

export default BusinessIllustration;
