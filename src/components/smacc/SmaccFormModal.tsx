import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { EnterpriseModal } from '../ui/EnterpriseModal';

interface SmaccFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SmaccFormModal: React.FC<SmaccFormModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = 'حفظ وإرسال',
  size = 'md',
}) => {
  if (!isOpen) return null;

  const maxWidthMap = {
    sm: 'md' as const,
    md: 'xl' as const,
    lg: '3xl' as const,
    xl: '5xl' as const,
  }[size];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <EnterpriseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth={maxWidthMap}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">{children}</div>
        <div className="pt-4 mt-4 border-t border-[#e0e0e0] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] hover:bg-[#e5e5e5] text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          {onSubmit && (
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitLabel}</span>
            </button>
          )}
        </div>
      </form>
    </EnterpriseModal>
  );
};
