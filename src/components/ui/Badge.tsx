import React from 'react';

interface BadgeProps {
  text: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'primary' | 'mint' | 'shade' | 'gold' | 'champagne';
  icon?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ text, type = 'shade', icon, className = '' }) => {
  const isFilled = type === 'danger' || type === 'primary';
  const isOutlineDark = type === 'warning';

  const baseStyle = isFilled
    ? 'bg-[#141414] text-[#ffffff] border border-[#141414]'
    : isOutlineDark
    ? 'bg-[#ffffff] text-[#141414] border border-[#141414]'
    : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${baseStyle} ${className}`}
    >
      {icon && <i className={icon} style={{ fontSize: '10px' }} />}
      <span>{text}</span>
    </span>
  );
};
