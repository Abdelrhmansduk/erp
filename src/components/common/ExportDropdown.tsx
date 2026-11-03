import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  FileCode,
  ChevronDown,
  FileJson,
  Sparkles,
  FileEdit,
  Globe,
  Database,
  Layers,
  Code,
  Image as ImageIcon,
  Landmark,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { exportData, ExportFormat } from '../../services/exportService';
import { useAppStore } from '../../stores/appStore';
import { ExportPreviewModal } from './ExportPreviewModal';

export interface ExportDropdownProps {
  sectionKey: string;
  data: any[];
  /** Optional dynamic data resolver (e.g. for harvesting visible page tables on click) */
  dataProvider?: () => any[];
  customTitle?: string;
  buttonLabel?: string;
  variant?: 'outline-dark' | 'outline-light' | 'primary-pill' | 'compact';
  showCountBadge?: boolean;
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  sectionKey,
  data,
  dataProvider,
  customTitle,
  buttonLabel = 'تصدير الكشوفات',
  variant = 'outline-light',
  showCountBadge = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [resolvedRows, setResolvedRows] = useState<any[]>(data || []);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; width: number } | null>(null);
  const { addNotification } = useAppStore();

  useEffect(() => {
    if (!dataProvider) {
      setResolvedRows(data || []);
    }
  }, [data, dataProvider]);

  const getEffectiveData = useCallback((): any[] => {
    if (dataProvider) {
      const provided = dataProvider();
      if (Array.isArray(provided) && provided.length > 0) {
        return provided;
      }
    }
    return data || [];
  }, [data, dataProvider]);

  useEffect(() => {
    const syncRows = () => {
      setResolvedRows(getEffectiveData());
    };
    window.addEventListener('erp-data-updated', syncRows);
    return () => window.removeEventListener('erp-data-updated', syncRows);
  }, [getEffectiveData]);

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = Math.min(440, window.innerWidth - 24);

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 6;
      if (spaceBelow < 420 && spaceAbove > spaceBelow) {
        top = Math.max(16, rect.top - Math.min(560, spaceAbove - 16) - 6);
      } else if (top + 540 > window.innerHeight) {
        top = Math.max(16, window.innerHeight - 555);
      }

      let right = window.innerWidth - rect.right;
      if (window.innerWidth < 640) {
        right = Math.max(8, (window.innerWidth - menuWidth) / 2);
      } else {
        if (right + menuWidth > window.innerWidth - 16) {
          right = 16;
        }
        if (right < 16) {
          right = 16;
        }
      }

      setMenuPosition({
        top,
        right,
        width: menuWidth,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setResolvedRows(getEffectiveData());
      updatePosition();
      const handleReposition = () => updatePosition();
      window.addEventListener('resize', handleReposition, { passive: true });
      window.addEventListener('scroll', handleReposition, { capture: true, passive: true });
      return () => {
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [isOpen, updatePosition, getEffectiveData]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    const targetData = getEffectiveData();
    if (!targetData || targetData.length === 0) {
      addNotification({
        title: 'تنبيه تصدير',
        message: 'لا توجد بيانات متاحة للتصدير في هذا القسم حالياً.',
        type: 'warning',
      });
      return;
    }

    setIsOpen(false);
    setIsExporting(true);

    try {
      await exportData(sectionKey, targetData, format, customTitle);
      addNotification({
        title: 'تصدير الوثيقة المؤسسية المعتمدة',
        message: `تم تجهيز واستخراج (${targetData.length}) سجل بصيغة ${format.toUpperCase()} بنجاح.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Export failed:', err);
      addNotification({
        title: 'تعذر التصدير',
        message: 'حدث خطأ أثناء معالجة ملف التصدير، يرجى المحاولة مرة أخرى.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenPreview = () => {
    const targetData = getEffectiveData();
    setResolvedRows(targetData);
    setIsOpen(false);
    setIsPreviewOpen(true);
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'outline-dark':
        return 'button-outline-on-dark';
      case 'primary-pill':
        return 'button-primary-pill';
      case 'compact':
        return 'button-outline-on-light !py-1.5 !px-3 !text-xs !min-h-[32px]';
      case 'outline-light':
      default:
        return 'button-outline-on-light';
    }
  };

  const documentFormats = [
    {
      id: 'excel' as ExportFormat,
      title: 'Microsoft Excel المؤسسي (.xlsx)',
      desc: 'مصنف محاسبي (ورقتا عمل: البيانات التفصيلية + ملخص الاعتماد والتفقيط)',
      icon: FileSpreadsheet,
      badge: 'ورقتا عمل RTL',
    },
    {
      id: 'pdf' as ExportFormat,
      title: 'مستند PDF تنفيذي معتمد (.pdf)',
      desc: 'وثيقة رسمية (300 DPI) بهيدر القابضة والكيان والختم الرقمي والتفقيط',
      icon: FileText,
      badge: 'معتمد رسمياً',
    },
    {
      id: 'word' as ExportFormat,
      title: 'مستند Microsoft Word (.doc)',
      desc: 'مستند مكتبي رسمي قابل للتحرير المباشر مع ترويسة الشركة والجداول',
      icon: FileEdit,
      badge: 'قابل للتحرير',
    },
    {
      id: 'print' as ExportFormat,
      title: 'طباعة فورية A4 (Print Preview)',
      desc: 'نافذة معاينة وطباعة فورية مع رمز ZATCA QR ومصفوفة التواقيع الثلاثية',
      icon: Printer,
      badge: 'طباعة فورية',
    },
    {
      id: 'html' as ExportFormat,
      title: 'تقرير ويب تفاعلي مستقل (.html)',
      desc: 'صفحة تقرير أوفلاين مزودة بشريط بحث فوري وفرز تفاعلي للأعمدة',
      icon: Globe,
      badge: 'بحث وفرز حي',
    },
    {
      id: 'png' as ExportFormat,
      title: 'بطاقة تنفيذية مصورة عالية الدقة (.png)',
      desc: 'صورة رسمية (Retina 2x) جاهزة للإرسال الفوري للإدارة العليا عبر واتساب',
      icon: ImageIcon,
      badge: 'صورة 2x HD',
    },
  ];

  const dataFormats = [
    {
      id: 'wps' as ExportFormat,
      title: 'ملف حماية الأجور البنكي (WPS .sif.csv)',
      desc: 'ملف صرف الرواتب والأجور القياسي المتوافق مع البنك المركزي SAMA ومنصة مدد',
      icon: Landmark,
      badge: 'SAMA / مدد WPS',
    },
    {
      id: 'xml' as ExportFormat,
      title: 'تكامل محاسبي وحكومي XML (.xml)',
      desc: 'ترميز XML قياسي مطابق لمحددات التبادل المؤسسي وهيئة الزكاة UBL 2.1',
      icon: Code,
      badge: 'ZATCA UBL 2.1',
    },
    {
      id: 'csv' as ExportFormat,
      title: 'ملف مجدول CSV (UTF-8 BOM)',
      desc: 'متوافق تماماً مع Microsoft Excel والبرامج المحاسبية مع ترويسة الحوكمة',
      icon: FileCode,
      badge: 'توافق شامل',
    },
    {
      id: 'tsv' as ExportFormat,
      title: 'ملف بنكي مجدول TSV / مساند (.tsv)',
      desc: 'مفصول بعلامة الجدولة للربط مع ملفات مساند والبنوك السعودية',
      icon: Layers,
      badge: 'مساند / البنوك',
    },
    {
      id: 'json' as ExportFormat,
      title: 'بيانات برمجية مهيكلة JSON (.json)',
      desc: 'كائنات البيانات متضمنة الترويسة المؤسسية وبصمة التحقق الرقمية SHA-256',
      icon: FileJson,
      badge: 'API & Audit',
    },
    {
      id: 'markdown' as ExportFormat,
      title: 'مستند توثيق ماركداون (.md)',
      desc: 'تقرير Markdown مهيكل مع ملخص التفقيط وجدول المجاميع للأرشفة',
      icon: Database,
      badge: 'توثيق ذكي',
    },
  ];

  const badgeCount = dataProvider ? resolvedRows.length || data?.length || 0 : data?.length || 0;

  return (
    <div className={`relative inline-block text-right ${className}`} data-no-dyn-enhancer="true">
      <button
        ref={buttonRef}
        onClick={() => !isExporting && setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`${getButtonClass()} flex items-center gap-2 font-bold transition-all shadow-sm active:scale-95 ${
          isExporting ? 'opacity-70 cursor-wait' : ''
        }`}
        type="button"
        title="تصدير ومعاينة الكشوفات الرسمية بـ 12 صيغة مؤسسية"
      >
        <span className={`inline-flex shrink-0 ${isExporting ? 'animate-bounce' : ''}`}>
          <Download className="w-4 h-4 text-[#141414] shrink-0" />
        </span>
        <span>{isExporting ? 'جاري التجهيز...' : buttonLabel}</span>
        {showCountBadge && badgeCount > 0 && !isExporting && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#e0e0e0] text-[#141414] font-bold">
            {badgeCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Mobbin Light Mode Dropdown Menu rendered via Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998] bg-[#141414]/20 backdrop-blur-[1px] transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            <div
              ref={dropdownRef}
              data-no-dyn-enhancer="true"
              style={{
                position: 'fixed',
                top: `${menuPosition?.top ?? 80}px`,
                right: `${menuPosition?.right ?? 16}px`,
                width: `${menuPosition?.width ?? 420}px`,
                maxHeight: '85vh',
                zIndex: 99999,
              }}
              className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 overflow-y-auto font-sans text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Info */}
              <div className="px-3 py-2.5 border-b border-[#e5e5e5] mb-2.5 flex items-center justify-between sticky top-0 bg-[#ffffff]/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                  <span className="text-xs font-extrabold text-[#141414]">
                    منظومة التصدير المؤسسي الموحدة (12 صيغة)
                  </span>
                </div>
                <span className="text-[10.5px] font-mono text-[#141414] font-bold bg-[#f3f3f3] border border-[#e0e0e0] px-2.5 py-0.5 rounded-full">
                  {resolvedRows.length} سجل جاهز
                </span>
              </div>

              {/* Featured Live Document Studio & Customization Button */}
              <div className="px-1 mb-2.5">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="w-full p-3 rounded-[18px] bg-[#141414] hover:bg-[#262626] text-[#ffffff] border border-[#141414] transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-[12px] bg-[#262626] border border-[#3f3f46] flex items-center justify-center text-[#ffffff] shrink-0 group-hover:scale-105 transition-transform">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-xs font-extrabold text-[#ffffff] flex items-center gap-1.5">
                        <span>معاينة وتخصيص الوثيقة قبل التصدير</span>
                      </div>
                      <p className="text-[10.5px] text-[#a1a1aa] mt-0.5 truncate">
                        اختيار الأعمدة، إضافة مذكرة تنفيذية، التحكم بالتفقيط والختم ومعاينة A4
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#ffffff] text-[#141414] text-[10px] font-extrabold shrink-0 inline-flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>تخصيص</span>
                  </span>
                </button>
              </div>

              {/* Section 1: Executive & Office Documents (6 Formats) */}
              <div className="mb-2">
                <div className="px-3 py-1 text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">
                  المستندات التنفيذية والتقارير المعتمدة (6 صيغ)
                </div>
                <div className="space-y-1 mt-1">
                  {documentFormats.map((fmt) => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleExport(fmt.id)}
                        className="w-full text-right p-2.5 rounded-[16px] hover:bg-[#f3f3f3] border border-transparent hover:border-[#e0e0e0] transition-all flex items-start gap-3 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-[10px] bg-[#f3f3f3] group-hover:bg-[#141414] text-[#141414] group-hover:text-[#ffffff] border border-[#e0e0e0] group-hover:border-[#141414] flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-extrabold text-[#141414] transition-colors">
                              {fmt.title}
                            </span>
                            {fmt.badge && (
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] shrink-0">
                                {fmt.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[#707070] mt-0.5 leading-tight line-clamp-1 font-normal">
                            {fmt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Data Interchange & Integration (6 Formats) */}
              <div className="mb-2 pt-2 border-t border-[#e5e5e5]">
                <div className="px-3 py-1 text-[10px] font-extrabold text-[#707070] uppercase tracking-wider">
                  تكامل البيانات والأنظمة المحاسبية والبنكية (6 صيغ)
                </div>
                <div className="space-y-1 mt-1">
                  {dataFormats.map((fmt) => {
                    const Icon = fmt.icon;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleExport(fmt.id)}
                        className="w-full text-right p-2.5 rounded-[16px] hover:bg-[#f3f3f3] border border-transparent hover:border-[#e0e0e0] transition-all flex items-start gap-3 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-[10px] bg-[#f3f3f3] group-hover:bg-[#141414] text-[#141414] group-hover:text-[#ffffff] border border-[#e0e0e0] group-hover:border-[#141414] flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-extrabold text-[#141414] transition-colors">
                              {fmt.title}
                            </span>
                            {fmt.badge && (
                              <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] shrink-0">
                                {fmt.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[#707070] mt-0.5 leading-tight line-clamp-1 font-normal">
                            {fmt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-2 pt-2 border-t border-[#e5e5e5] px-3 py-1.5 flex items-center justify-between text-[10px] text-[#707070] font-semibold">
                <span>تفقيط عربي رسمي + رمز الريال (⃁)</span>
                <span>ZATCA UBL 2.1 & SAMA WPS</span>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Interactive Live Document Preview & Customization Modal */}
      <ExportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        sectionKey={sectionKey}
        data={resolvedRows}
        customTitle={customTitle}
      />
    </div>
  );
};
