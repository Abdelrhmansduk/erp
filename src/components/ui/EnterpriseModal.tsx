import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface EnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
}

const MAX_WIDTH_CLASS_MAP: Record<NonNullable<EnterpriseModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

/**
 * Unified Accessible Enterprise Modal Primitive (Mobbin Gallery-White Monochrome Design)
 * - Enforces z-[2100] above Sidebar (1000) and Header (100)
 * - Built-in Escape key listener & backdrop click dismissal
 * - Automatic document.body scroll lock
 */
export const EnterpriseModal: React.FC<EnterpriseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = '2xl',
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const widthClass = MAX_WIDTH_CLASS_MAP[maxWidth] || 'max-w-2xl';

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir="rtl"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${widthClass} max-h-[90vh] flex flex-col bg-[#ffffff] text-[#141414] border border-[#e0e0e0] rounded-2xl shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f3f3f3] border-b border-[#e0e0e0] shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-black text-[#141414] leading-tight">{title}</h3>
              {subtitle && (
                <p className="text-xs font-medium text-[#707070] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-8 h-8 rounded-lg bg-[#ffffff] hover:bg-[#eaeaea] border border-[#e0e0e0] flex items-center justify-center text-[#141414] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">{children}</div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="px-6 py-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
