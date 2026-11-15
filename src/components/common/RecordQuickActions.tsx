import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle,
  Mail,
  Copy,
  Printer,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  AlertTriangle,
  FileSignature,
} from 'lucide-react';
import {
  QuickSharePayload,
  isHrSharePayload,
  shareViaWhatsApp,
  shareViaEmail,
  copyOrWebShareSummary,
  RecycleBinEntry,
  listRecycleBinEntries,
  popRecycleBinEntryForRestore,
  removeRecycleBinEntryPermanently,
} from '../../services/quickShareService';

export interface RecordQuickActionsProps {
  sharePayload?: QuickSharePayload;
  onEdit?: () => void;
  onDelete?: (reason?: string) => void;
  onPrint?: () => void;
  deleteConfirmTitle?: string;
  size?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

export const RecordQuickActions: React.FC<RecordQuickActionsProps> = ({
  sharePayload,
  onEdit,
  onDelete,
  onPrint,
  deleteConfirmTitle,
  size = 'sm',
  showLabels = false,
  className = '',
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const isHrDoc = Boolean(sharePayload && isHrSharePayload(sharePayload));
  const [includeReemSig, setIncludeReemSig] = useState<boolean>(
    sharePayload?.includeReemSignature ?? true
  );

  const effectiveIncludeReemSig =
    sharePayload?.includeReemSignature !== undefined
      ? sharePayload.includeReemSignature
      : includeReemSig;

  const effectiveSharePayload: QuickSharePayload | undefined = sharePayload
    ? {
        ...sharePayload,
        includeReemSignature: isHrDoc ? effectiveIncludeReemSig : sharePayload.includeReemSignature,
      }
    : undefined;

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const btnPadding = showLabels
    ? 'px-3 py-1.5 text-[11px]'
    : size === 'sm'
    ? 'w-7 h-7'
    : 'w-8 h-8';

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(deleteReason.trim() || undefined);
    }
    setDeleteReason('');
    setConfirmOpen(false);
  };

  return (
    <>
      <div
        className={`inline-flex items-center gap-1 flex-wrap print:hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {effectiveSharePayload && (
          <>
            {isHrDoc && sharePayload?.includeReemSignature === undefined && (
              <button
                type="button"
                onClick={() => setIncludeReemSig((prev) => !prev)}
                title={
                  effectiveIncludeReemSig
                    ? 'توقيع مديرة الموارد البشرية (أ. ريم بن حسين — HR@kas.sa): مُضمّن في المستند (انقر للإلغاء)'
                    : 'توقيع مديرة الموارد البشرية (أ. ريم بن حسين — HR@kas.sa): غير مُضمّن (انقر للتضمين)'
                }
                className={`${btnPadding} rounded-full border inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer ${
                  effectiveIncludeReemSig
                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    : 'bg-[#ffffff] text-[#707070] border-[#e0e0e0] hover:text-[#141414]'
                }`}
              >
                <FileSignature className={iconSize} />
                {showLabels && (
                  <span>
                    {effectiveIncludeReemSig
                      ? 'توقيع أ. ريم بن حسين: مفعّل'
                      : 'توقيع أ. ريم بن حسين: مخفي'}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => shareViaWhatsApp(effectiveSharePayload)}
              title="إرسال عبر واتساب الرسمي (ملف PDF معتمد + نص)"
              className={`${btnPadding} rounded-full bg-[#f3f3f3] hover:bg-[#707070] text-[#707070] hover:text-[#ffffff] border border-[#e0e0e0] hover:border-[#707070] inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer`}
            >
              <MessageCircle className={iconSize} />
              {showLabels && <span>واتساب (PDF + نص)</span>}
            </button>

            <button
              type="button"
              onClick={() => shareViaEmail(effectiveSharePayload)}
              title="إرسال عبر البريد الإلكتروني"
              className={`${btnPadding} rounded-full bg-[#f3f3f3] hover:bg-[#707070] text-[#707070] hover:text-[#ffffff] border border-[#e0e0e0] hover:border-[#707070] inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer`}
            >
              <Mail className={iconSize} />
              {showLabels && <span>بريد</span>}
            </button>

            <button
              type="button"
              onClick={() => void copyOrWebShareSummary(effectiveSharePayload)}
              title="نسخ أو مشاركة ملخص السجل"
              className={`${btnPadding} rounded-full bg-[#ffffff] hover:bg-[#707070] text-[#707070] hover:text-[#ffffff] border border-[#e0e0e0] hover:border-[#707070] inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer`}
            >
              <Copy className={iconSize} />
              {showLabels && <span>نسخ</span>}
            </button>
          </>
        )}

        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            title="طباعة / استخراج PDF"
            className={`${btnPadding} rounded-full bg-[#f3f3f3] hover:bg-[#707070] text-[#707070] hover:text-[#ffffff] border border-[#e0e0e0] hover:border-[#707070] inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer`}
          >
            <Printer className={iconSize} />
            {showLabels && <span>طباعة</span>}
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            title="تعديل بيانات السجل"
            className={`${btnPadding} rounded-full bg-[#ffffff] hover:bg-[#707070] text-[#707070] hover:text-[#ffffff] border border-[#e0e0e0] hover:border-[#707070] inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer`}
          >
            <Pencil className={iconSize} />
            {showLabels && <span>تعديل</span>}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            title="حذف آمن (ينقل لسلة الاستعادة لمدة 30 يوماً)"
            className={`${btnPadding} rounded-full bg-[#f3f3f3] hover:bg-[#262626] text-[#262626] hover:text-[#ffffff] border border-[#e0e0e0] hover:border-[#262626] inline-flex items-center justify-center gap-1.5 font-bold transition-colors cursor-pointer`}
          >
            <Trash2 className={iconSize} />
            {showLabels && <span>حذف</span>}
          </button>
        )}
      </div>

      {confirmOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100500] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans print:hidden"
            dir="rtl"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="w-full max-w-md bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-[#707070] shrink-0">
                    <AlertTriangle className="w-4 h-4 text-[#707070]" data-colored-icon="true" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] m-0">
                      تأكيد الحذف الآمن (قابل للاستعادة خلال 30 يوماً)
                    </h4>
                    <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                      {deleteConfirmTitle || sharePayload?.title || 'سيتم نقل هذا السجل إلى أرشيف المحذوفات المؤقت.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="w-7 h-7 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1.5">
                  سبب الحذف للتوثيق في سجل المراجعة (اختياري):
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="مثال: تكرار قيد أو تحديث بيانات..."
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f0f0f0] text-xs font-semibold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-xs font-bold text-[#ffffff] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>نقل لسلة المحذوفات</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNameFilter?: string;
  onRestoreEntry: (entry: RecycleBinEntry) => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  tableNameFilter,
  onRestoreEntry,
}) => {
  const [entries, setEntries] = useState<RecycleBinEntry[]>(() =>
    listRecycleBinEntries(tableNameFilter)
  );

  React.useEffect(() => {
    if (isOpen) {
      setEntries(listRecycleBinEntries(tableNameFilter));
    }
  }, [isOpen, tableNameFilter]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleRestore = (binId: string) => {
    const popped = popRecycleBinEntryForRestore(binId);
    if (popped) {
      onRestoreEntry(popped);
      setEntries(listRecycleBinEntries(tableNameFilter));
    }
  };

  const handlePermanentDelete = (binId: string) => {
    removeRecycleBinEntryPermanently(binId);
    setEntries(listRecycleBinEntries(tableNameFilter));
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100400] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans print:hidden"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#141414] text-[#ffffff] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-[#707070]" data-colored-icon="true" />
            <h3 className="text-sm font-bold m-0">
              أرشيف المحذوفات القابلة للاستعادة (حفظ لمدة 30 يوماً)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262626] hover:bg-[#262626] flex items-center justify-center text-[#ffffff] cursor-pointer"
          >
            <X className="w-4 h-4 text-[#707070]" data-colored-icon="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-[#707070] bg-[#f3f3f3] rounded-[20px] border border-[#e0e0e0]">
              سلة المحذوفات فارغة حالياً.
            </div>
          ) : (
            entries.map((item) => (
              <div
                key={item.binId}
                className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141414]">{item.recordTitle}</div>
                  <div className="text-[11px] text-[#707070] mt-0.5">
                    الجدول: {item.tableName} • السبب: {item.reason} • التاريخ:{' '}
                    <span className="font-mono">{item.deletedAt.slice(0, 10)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRestore(item.binId)}
                    className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#707070]" data-colored-icon="true" />
                    <span>استعادة فورية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(item.binId)}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[#262626] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer"
                  >
                    إتلاف نهائي
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
