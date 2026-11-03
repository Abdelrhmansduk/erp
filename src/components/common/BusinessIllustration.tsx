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

const DIMENSIONS: Record<NonNullable<BusinessIllustrationProps['size']>, { box: number; icon: number; radius: string }> = {
  sm: { box: 44, icon: 20, radius: '14px' },
  md: { box: 56, icon: 24, radius: '16px' },
  lg: { box: 68, icon: 28, radius: '18px' },
  xl: { box: 80, icon: 32, radius: '22px' },
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
  const { box, icon, radius } = DIMENSIONS[size] || DIMENSIONS.md;
  const IconComponent = ICON_MAP[resolvedKey] || ShieldCheck;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        backgroundColor: '#f3f3f3',
        border: '1px solid #e0e0e0',
        color: '#141414',
      }}
      title={meta.titleAr}
    >
      <IconComponent
        style={{
          width: icon,
          height: icon,
          color: '#141414',
          strokeWidth: 1.85,
          flexShrink: 0,
        }}
      />
    </div>
  );
};

export default BusinessIllustration;
