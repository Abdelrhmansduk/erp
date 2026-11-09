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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  className?: string;
  animated?: boolean;
  showBackground?: boolean;
  variant?: 'funkyways' | 'vector';
}

const DIMENSIONS: Record<
  NonNullable<BusinessIllustrationProps['size']>,
  { w: number; h: number; radius: string; icon: number }
> = {
  sm: { w: 64, h: 60, radius: '16px', icon: 24 },
  md: { w: 116, h: 100, radius: '20px', icon: 32 },
  lg: { w: 168, h: 144, radius: '24px', icon: 40 },
  xl: { w: 224, h: 192, radius: '28px', icon: 48 },
  '2xl': { w: 288, h: 250, radius: '32px', icon: 56 },
  hero: { w: 390, h: 340, radius: '36px', icon: 64 },
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

/**
 * IconScout Data Analysis & Enterprise Business Illustration Engine
 * Renders authentic vector illustrations (/illustrations/funkyways/*.svg)
 * with clean gallery-white / warm-alabaster framing.
 */
export const BusinessIllustration: React.FC<BusinessIllustrationProps> = ({
  type,
  tabKey,
  departmentId,
  size = 'md',
  className = '',
  animated = true,
  showBackground = true,
  variant = 'funkyways',
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const resolvedKey: IllustrationKey =
    type || resolveIllustrationForTab(tabKey, departmentId);
  const meta = getIllustrationMetadata(resolvedKey);
  const { w, h, radius, icon } = DIMENSIONS[size] || DIMENSIONS.md;
  const IconComponent = ICON_MAP[resolvedKey] || ShieldCheck;

  if (variant === 'funkyways' && meta?.funkywaysSvgUrl && !imgFailed) {
    return (
      <div
        className={`mobbin-illustration-card relative inline-flex items-center justify-center select-none shrink-0 ${
          showBackground
            ? 'bg-[#faf9f7] border border-[#e5e2dc] p-2'
            : 'bg-transparent p-0.5'
        } ${animated ? 'transition-transform duration-300 hover:scale-[1.03]' : ''} ${className}`}
        style={{
          width: w,
          height: h,
          borderRadius: showBackground ? radius : undefined,
        }}
        title={meta.titleAr}
      >
        <img loading="lazy" decoding="async"
          src={meta.funkywaysSvgUrl}
          alt={meta.titleAr}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`mobbin-illustration-card relative inline-flex items-center justify-center select-none shrink-0 bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] ${className}`}
      style={{
        width: w,
        height: h,
        borderRadius: radius,
      }}
      title={meta.titleAr}
    >
      <IconComponent
        style={{
          width: icon,
          height: icon,
          color: '#141414',
          strokeWidth: 1.75,
          flexShrink: 0,
        }}
      />
    </div>
  );
};

export default BusinessIllustration;
