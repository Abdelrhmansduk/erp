import i18n from '../../i18n/config';
import React, { useState } from 'react';
import { CompanyId } from '../../types';

interface CompanyLogoProps {
  companyId: CompanyId;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const LOGO_PATHS: Record<string, string> = {
  SAF: '/logos/saf.png',
  saf: '/logos/saf.png',
  masi: '/logos/saf.png',
  YAQ: '/logos/yaqoot.png',
  yaq: '/logos/yaqoot.png',
  yaqoot: '/logos/yaqoot.png',
  TOP: '/logos/topaz.png',
  top: '/logos/topaz.png',
  topaz: '/logos/topaz.png',
  DAR: '/logos/ruwad.png',
  dar: '/logos/ruwad.png',
  ruwad: '/logos/ruwad.png',
  shelter: '/logos/ruwad.png',
  SHELTER: '/logos/ruwad.png',
  KAS: '/logo.png',
  kas: '/logo.png',
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  companyId,
  size = 48,
  className = '',
  style = {},
}) => {
  const [imgError, setImgError] = useState(false);
  const normalizedKey = (companyId || '').toString().trim();
  const logoPath = LOGO_PATHS[normalizedKey] || LOGO_PATHS[normalizedKey.toUpperCase()] || LOGO_PATHS[normalizedKey.toLowerCase()];

  // If high-res official logo image exists and hasn't errored, display it in a luxury badge
  if (logoPath && !imgError && companyId !== 'kas' && companyId !== 'KAS') {
    return (
      <div
        className={`inline-flex items-center justify-center overflow-hidden bg-white/95 rounded-xl p-1  border border-[#e0e0e0] transition-transform duration-200 hover:scale-105 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size, ...style }}
      >
        <img loading="lazy" decoding="async"
          src={logoPath}
          alt={String(companyId)}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 1. Al-Safeer Al-Masi (Diamond Logo Fallback)
  if (companyId === 'masi' || companyId === 'SAF') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: '12px', ...style }}
      >
        <rect width="200" height="200" rx="28" fill="#ffffff" stroke="#e0e0e0" strokeWidth="4" />
        <polygon points="100,160 40,80 75,40 100,40" fill="#707070" />
        <polygon points="100,160 160,80 125,40 100,40" fill="#707070" />
        <polygon points="100,160 75,40 100,40" fill="#262626" />
        <polygon points="100,160 125,40 100,40" fill="#adadad" />
        <polygon points="40,80 75,40 100,40" fill="#262626" opacity="0.8" />
        <polygon points="160,80 125,40 100,40" fill="#262626" opacity="0.8" />
      </svg>
    );
  }

  // 2. Yaqout Najd (Crimson & Ruby Starburst Logo Fallback)
  if (companyId === 'yaqoot' || companyId === 'YAQ') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: '12px', ...style }}
      >
        <rect width="200" height="200" rx="28" fill="#f3f3f3" stroke="#e0e0e0" strokeWidth="4" />
        <g transform="translate(100, 100)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} transform={`rotate(${angle})`}>
              <polygon points="0,0 -12,-65 0,-85 12,-65" fill={i % 2 === 0 ? '#262626' : '#707070'} />
              <polygon points="0,0 0,-85 12,-65" fill={i % 2 === 0 ? '#262626' : '#262626'} />
            </g>
          ))}
          <circle cx="0" cy="0" r="14" fill="#262626" />
          <circle cx="0" cy="0" r="8" fill="#adadad" />
        </g>
      </svg>
    );
  }

  // 3. Topaz Recruitment (Gem Logo Fallback)
  if (companyId === 'topaz' || companyId === 'TOP') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: '12px', ...style }}
      >
        <rect width="200" height="200" rx="28" fill="#f3f3f3" stroke="#e0e0e0" strokeWidth="4" />
        <g transform="translate(100, 100)">
          <circle cx="0" cy="0" r="60" fill="url(#topazGrad)" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={60 * Math.cos((angle * Math.PI) / 180)}
              y2={60 * Math.sin((angle * Math.PI) / 180)}
              stroke="#ffffff"
              strokeWidth="2.5"
              opacity="0.75"
            />
          ))}
          <polygon points="-25,-25 25,-25 35,0 25,25 -25,25 -35,0" fill="none" stroke="#ffffff" strokeWidth="3" />
        </g>
        <defs>
          <radialGradient id="topazGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0) scale(60)">
            <stop stopColor="#707070" />
            <stop offset="0.7" stopColor="#707070" />
            <stop offset="1" stopColor="#262626" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // 4. Dar Al-Ruwad (Blue Globe + Stylized 'R' Fallback)
  if (companyId === 'ruwad' || companyId === 'DAR' || (companyId as string) === 'shelter') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: '12px', ...style }}
      >
        <rect width="200" height="200" rx="28" fill="#f3f3f3" stroke="#e0e0e0" strokeWidth="4" />
        <circle cx="100" cy="100" r="70" fill="#ffffff" stroke="#262626" strokeWidth="5" />
        <ellipse cx="100" cy="100" rx="70" ry="30" fill="none" stroke="#707070" strokeWidth="3" />
        <ellipse cx="100" cy="100" rx="30" ry="70" fill="none" stroke="#707070" strokeWidth="3" />
        <line x1="30" y1="100" x2="170" y2="100" stroke="#262626" strokeWidth="4" />
        <line x1="100" y1="30" x2="100" y2="170" stroke="#262626" strokeWidth="4" />
        <path
          d="M 70,140 C 60,110 65,70 95,70 C 125,70 135,90 120,110 C 110,120 90,115 85,115 L 125,140"
          fill="none"
          stroke="#707070"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 5. KAS Trading (Emerald Green & Gold Emblem Logo)
  if (companyId === 'kas' || companyId === 'KAS') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ borderRadius: '12px', ...style }}
      >
        <rect width="200" height="200" rx="28" fill="#141414" stroke="#141414" strokeWidth="4" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="#707070" strokeWidth="4" strokeDasharray="6 4" />
        <polygon points="100,38 152,68 152,132 100,162 48,132 48,68" fill="none" stroke="#adadad" strokeWidth="5" />
        <text x="100" y="112" textAnchor="middle" fill="#ffffff" fontSize="38" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
          {i18n.t("company.kasCode", "KAS")}
        </text>
        <text x="100" y="132" textAnchor="middle" fill="#707070" fontSize="12" fontWeight="700" fontFamily="sans-serif">
          TRADING
        </text>
      </svg>
    );
  }

  // Default: Group Master Logo (Khalid Al-Sulaim Executive Gold Emblem on White/Champagne)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: '12px', ...style }}
    >
      <rect width="200" height="200" rx="28" fill="#ffffff" stroke="#e0e0e0" strokeWidth="4" />
      <circle cx="100" cy="100" r="75" fill="none" stroke="#141414" strokeWidth="5" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#adadad" strokeWidth="2" strokeDasharray="4 3" />
      <text x="100" y="116" textAnchor="middle" fill="#141414" fontSize="48" fontWeight="900" fontFamily="sans-serif">
        KS
      </text>
    </svg>
  );
};

