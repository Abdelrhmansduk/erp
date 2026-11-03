import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

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

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }[size];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
      <div className={`w-full ${sizeClasses} bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Modal Header — Mobbin Pure Light Mode */}
        <div className="p-5 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#141414] m-0">{title}</h3>
            {subtitle && <p className="text-xs text-[#707070] mt-0.5 m-0">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 bg-[#ffffff] text-[#141414]">
            {children}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center justify-end gap-3">
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
      </div>
    </div>
  );
};
