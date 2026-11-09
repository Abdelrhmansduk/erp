import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { DepartmentId } from '../../services/authService';

export interface EmployeePhotoAvatarProps {
  name: string;
  email?: string;
  role?: string;
  departmentId?: DepartmentId | string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  showVerifiedBadge?: boolean;
  showOnlinePulse?: boolean;
  showStatusDot?: boolean;
  status?: 'verified' | 'online' | 'none';
  className?: string;
}

const FEMALE_NAMES = [
  'نورة',
  'نُورة',
  'ريم',
  'سارة',
  'أمل',
  'لطيفة',
  'منى',
  'حنان',
  'عبير',
  'فاطمة',
  'مريم',
  'عائشة',
  'هند',
  'سهام',
  'بنت',
];

function isFemaleEmployee(name: string, role?: string): boolean {
  const combined = `${name} ${role || ''}`;
  return FEMALE_NAMES.some((token) => combined.includes(token)) || combined.includes('مديرة') || combined.includes('مسؤولة') || combined.includes('أخصائية');
}

/**
 * Generates a high-definition executive studio portrait SVG Data URI for the logged-in employee
 * when no external photo URL is uploaded.
 */
function buildExecutivePortraitDataUri(
  name: string,
  email?: string,
  role?: string,
  departmentId?: string
): string {
  const isFemale = isFemaleEmployee(name, role);
  const isChairman =
    name.includes('خالد') ||
    (email || '').toLowerCase().includes('chairman') ||
    (role || '').includes('رئيس مجلس الإدارة');

  if (isFemale) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id="bgF" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#18181B"/>
          <stop offset="100%" stop-color="#27272A"/>
        </linearGradient>
        <linearGradient id="accF" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#F4F4F5"/>
          <stop offset="100%" stop-color="#D4D4D8"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#bgF)"/>
      <circle cx="80" cy="80" r="74" stroke="#3F3F46" stroke-width="1.5"/>
      <!-- Formal Hijab & Executive Blazer -->
      <path d="M32 152C36 118 54 104 80 104C106 104 124 118 128 152" fill="#09090B"/>
      <path d="M46 66C46 42 60 28 80 28C100 28 114 42 114 66C114 90 104 108 80 112C56 108 46 90 46 66Z" fill="#27272A" stroke="#52525B" stroke-width="1.5"/>
      <!-- Face Silhouette -->
      <ellipse cx="80" cy="68" rx="22" ry="26" fill="#F5D6C6"/>
      <!-- Subtle Executive Features -->
      <path d="M70 64C72 62 75 62 77 64" stroke="#27272A" stroke-width="2" stroke-linecap="round"/>
      <path d="M83 64C85 62 88 62 90 64" stroke="#27272A" stroke-width="2" stroke-linecap="round"/>
      <path d="M75 79C78 81.5 82 81.5 85 79" stroke="#9A6B56" stroke-width="2" stroke-linecap="round"/>
      <!-- Scarf Lapel Detail -->
      <path d="M64 106L80 126L96 106" stroke="url(#accF)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Male Saudi Executive Studio Portrait (Shemagh, Egal & Formal Bisht/Thobe)
  const bishtTrimColor = isChairman ? '#D4AF37' : departmentId === 'finance' ? '#0066FF' : '#A1A1AA';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
    <defs>
      <linearGradient id="bgM" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#141414"/>
        <stop offset="100%" stop-color="#262626"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#bgM)"/>
    <circle cx="80" cy="80" r="74" stroke="#3F3F46" stroke-width="1.5"/>
    <!-- Shoulders: White Thobe & Executive Bisht -->
    <path d="M26 154C31 118 50 104 80 104C110 104 129 118 134 154" fill="#FFFFFF"/>
    <path d="M26 154C31 120 46 106 66 105L58 154H26Z" fill="#09090B"/>
    <path d="M134 154C129 120 114 106 94 105L102 154H134Z" fill="#09090B"/>
    <path d="M66 105L58 154" stroke="${bishtTrimColor}" stroke-width="2.5"/>
    <path d="M94 105L102 154" stroke="${bishtTrimColor}" stroke-width="2.5"/>
    <!-- Shemagh Drape -->
    <path d="M44 58C44 34 58 22 80 22C102 22 116 34 116 58L122 118H38L44 58Z" fill="#FAFAFA"/>
    <path d="M44 58C44 34 58 22 80 22C102 22 116 34 116 58L120 114H40L44 58Z" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.55"/>
    <!-- Face -->
    <path d="M56 64C56 49 66 40 80 40C94 40 104 49 104 64C104 83 94 96 80 96C66 96 56 83 56 64Z" fill="#EBC5B0"/>
    <!-- Eyebrows & Eyes -->
    <path d="M66 59H75" stroke="#18181B" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M85 59H94" stroke="#18181B" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="70.5" cy="64" r="2.2" fill="#18181B"/>
    <circle cx="89.5" cy="64" r="2.2" fill="#18181B"/>
    <!-- Executive Beard & Mustache -->
    <path d="M72 77C75 75.5 85 75.5 88 77" stroke="#18181B" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M60 72C60 86 68 95 80 95C92 95 100 86 100 72C98 81 91 88 80 88C69 88 62 81 60 72Z" fill="#18181B" opacity="0.9"/>
    <!-- Black Egal (العقال) -->
    <rect x="46" y="31" width="68" height="6.5" rx="3.25" fill="#09090B"/>
    <rect x="48" y="38.5" width="64" height="5.5" rx="2.75" fill="#18181B"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SIZE_MAP: Record<NonNullable<EmployeePhotoAvatarProps['size']>, { box: string; badge: string }> = {
  xs: { box: 'w-7 h-7', badge: 'w-2.5 h-2.5' },
  sm: { box: 'w-9 h-9', badge: 'w-3 h-3' },
  md: { box: 'w-11 h-11', badge: 'w-3.5 h-3.5' },
  lg: { box: 'w-14 h-14', badge: 'w-4 h-4' },
  xl: { box: 'w-20 h-20', badge: 'w-5 h-5' },
  '2xl': { box: 'w-24 h-24', badge: 'w-6 h-6' },
  hero: { box: 'w-28 h-28 sm:w-32 sm:h-32', badge: 'w-7 h-7' },
};

export const EmployeePhotoAvatar: React.FC<EmployeePhotoAvatarProps> = ({
  name,
  email,
  role,
  departmentId,
  avatarUrl,
  size = 'md',
  showVerifiedBadge = true,
  showOnlinePulse = false,
  showStatusDot,
  status,
  className = '',
}) => {
  const resolvedSrc = avatarUrl || buildExecutivePortraitDataUri(name, email, role, departmentId);
  const dim = SIZE_MAP[size] || SIZE_MAP.md;
  const shouldShowBadge = status === 'none' ? false : showStatusDot ?? showVerifiedBadge;
  const shouldShowOnline = status === 'online' || showOnlinePulse;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${dim.box} ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#141414]/15 bg-[#141414] shadow-sm flex items-center justify-center">
        <img
          src={resolvedSrc}
          alt={name}
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {shouldShowBadge && (
        <span
          className={`absolute -bottom-0.5 -left-0.5 rounded-full bg-[#0066ff] text-[#ffffff] border-2 border-[#ffffff] flex items-center justify-center shadow-xs ${dim.badge}`}
          title="هوية موظف موثقة"
        >
          {size === 'hero' || size === '2xl' || size === 'xl' ? (
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" />
          )}
        </span>
      )}

      {shouldShowOnline && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#141414] border-2 border-[#ffffff]"
          title="متصل الآن"
        />
      )}
    </div>
  );
};

export default EmployeePhotoAvatar;
