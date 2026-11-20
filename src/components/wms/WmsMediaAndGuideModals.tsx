import React, { useRef, useState } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Film,
  Trash2,
  Download,
  BookOpen,
  CheckCircle2,
  ArrowDownLeft,
  BatteryCharging,
  FileSpreadsheet,
  Send,
  ShieldCheck,
  ClipboardList,
  Sliders,
} from 'lucide-react';
import { WmsMediaAttachment, WmsMediaTag } from '../../types/wms';
import { WmsActor } from '../../services/wms/wmsEngineService';
import { sanitizeSafeHref, sanitizeSafeMediaSrc } from '../../utils/securitySanitizers';

/** Compress large images client-side so storage stays fast and clean */
async function readFileAsOptimizedDataUrl(file: File): Promise<{ dataUrl: string; sizeBytes: number }> {
  if (file.type.startsWith('image/') && !file.type.includes('svg')) {
    try {
      const bitmapUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = bitmapUrl;
      });
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.78);
        return { dataUrl: compressed, sizeBytes: Math.round((compressed.length * 3) / 4) };
      }
      return { dataUrl: bitmapUrl, sizeBytes: file.size };
    } catch {
      // Fallback to raw FileReader
    }
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { dataUrl, sizeBytes: file.size };
}

const MEDIA_TAGS: WmsMediaTag[] = [
  'صورة الصنف',
  'صورة الفاتورة',
  'سند استلام/تسليم',
  'إثبات مرتجع/تلف',
  'فيديو/وسائط',
];

// ============================================================================
// 1. PHOTOS, INVOICES & MEDIA ATTACHMENTS MODAL
// ============================================================================
export const WmsMediaGalleryModal: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  attachments: WmsMediaAttachment[];
  actor: WmsActor;
  onAdd: (att: WmsMediaAttachment) => void;
  onDelete: (attId: string) => void;
  onClose: () => void;
}> = ({ open, title, subtitle, attachments, actor, onAdd, onDelete, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTag, setSelectedTag] = useState<WmsMediaTag>('صورة الصنف');
  const [caption, setCaption] = useState('');
  const [previewItem, setPreviewItem] = useState<WmsMediaAttachment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!open) return null;

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 12 * 1024 * 1024) {
          setErrorMsg(`حجم الملف (${file.name}) يتجاوز 12 ميجابايت. يرجى اختيار ملف أصغر.`);
          continue;
        }
        const { dataUrl, sizeBytes } = await readFileAsOptimizedDataUrl(file);
        const autoTag: WmsMediaTag = file.type.startsWith('video/')
          ? 'فيديو/وسائط'
          : file.type === 'application/pdf'
          ? 'صورة الفاتورة'
          : selectedTag;
        onAdd({
          id: `MED-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes,
          dataUrl,
          caption: caption.trim() || undefined,
          tag: autoTag,
          uploadedBy: actor.name,
          uploadedAt: new Date().toISOString(),
        });
      }
      setCaption('');
    } catch (err: any) {
      setErrorMsg(`تعذر قراءة الملف: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                الصور والوسائط والمستندات
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-mono font-bold">
                {attachments.length} مرفق
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#141414] mt-1">{title}</h3>
            {subtitle && <p className="text-xs text-[#707070]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload & Camera Controls */}
        <div className="p-4 rounded-[20px] bg-[#f3f3f3] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">تصنيف المرفق</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value as WmsMediaTag)}
                className="w-full rounded-[14px] bg-[#ffffff] px-3 py-2 text-xs font-bold text-[#141414]"
              >
                {MEDIA_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">وصف أو ملاحظة على الصورة (اختياري)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="مثال: صورة الكرتون عند الاستلام أو توقيع المستلم"
                className="w-full rounded-[14px] bg-[#ffffff] px-3 py-2 text-xs text-[#141414]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={(e) => void processFiles(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void processFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploading ? 'جارٍ الرفع والضغط...' : 'رفع صور / فيديو / PDF'}</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => cameraInputRef.current?.click()}
              className="px-4 py-2 rounded-full border border-[#141414] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f0f0f0]"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>تصوير مباشر بالكاميرا</span>
            </button>
            <span className="text-[11px] text-[#707070]">
              يدعم الصور (JPG/PNG/WEBP)، ملفات PDF للفواتير، ومقاطع الفيديو القصيرة (حتى 12MB)
            </span>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-[12px] bg-[#141414] text-white text-xs font-semibold">{errorMsg}</div>
          )}
        </div>

        {/* Media Grid */}
        {attachments.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-[#e0e0e0] rounded-[20px] text-xs text-[#707070]">
            لا توجد صور أو وسائط مرفقة حتى الآن — استخدم الأزرار أعلاه لرفع صورة الصنف، الفاتورة، أو إثبات التسليم.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((att) => {
              const isImage = att.mimeType.startsWith('image/');
              const isVideo = att.mimeType.startsWith('video/');
              return (
                <div
                  key={att.id}
                  className="border border-[#e0e0e0] rounded-[18px] overflow-hidden bg-[#ffffff] flex flex-col justify-between"
                >
                  <div
                    onClick={() => setPreviewItem(att)}
                    className="h-40 bg-[#f3f3f3] flex items-center justify-center cursor-pointer overflow-hidden relative"
                  >
                    {isImage ? (
                      <img src={sanitizeSafeMediaSrc(att.dataUrl)} alt={att.name} className="w-full h-full object-cover" />
                    ) : isVideo ? (
                      <video src={sanitizeSafeMediaSrc(att.dataUrl)} className="w-full h-full object-cover" muted />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-[#141414]">
                        <FileText className="w-8 h-8" />
                        <span className="text-[11px] font-bold">مستند PDF / ملف</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#141414]/85 text-white text-[10px] font-bold">
                      {att.tag}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="text-xs font-bold text-[#141414] truncate" title={att.name}>
                      {att.name}
                    </div>
                    {att.caption && <div className="text-[11px] text-[#707070]">{att.caption}</div>}
                    <div className="flex items-center justify-between text-[10px] text-[#707070] pt-1 border-t border-[#f0f0f0]">
                      <span>
                        {att.uploadedBy} • {Math.max(1, Math.round(att.sizeBytes / 1024))} KB
                      </span>
                      <div className="flex items-center gap-1">
                        <a
                          href={sanitizeSafeHref(att.dataUrl)}
                          download={att.name}
                          className="w-6 h-6 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
                          title="تنزيل"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onDelete(att.id)}
                          className="w-6 h-6 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Full Preview */}
        {previewItem && (
          <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
            <div
              className="bg-[#ffffff] rounded-[24px] p-4 max-w-3xl w-full max-h-[88vh] overflow-y-auto space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#141414]">
                  {previewItem.mimeType.startsWith('video/') ? (
                    <Film className="w-4 h-4" />
                  ) : previewItem.mimeType.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>{previewItem.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {previewItem.mimeType.startsWith('image/') ? (
                <img src={sanitizeSafeMediaSrc(previewItem.dataUrl)} alt={previewItem.name} className="w-full max-h-[68vh] object-contain rounded-[14px]" />
              ) : previewItem.mimeType.startsWith('video/') ? (
                <video src={sanitizeSafeMediaSrc(previewItem.dataUrl)} controls className="w-full max-h-[68vh] rounded-[14px]" />
              ) : (
                <iframe src={sanitizeSafeMediaSrc(previewItem.dataUrl)} title={previewItem.name} className="w-full h-[65vh] rounded-[14px] border border-[#e0e0e0]" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. INTERACTIVE BUILT-IN USER GUIDE & SOP MANUAL (إرشادات استخدام القسم)
// ============================================================================
export const WmsUserGuideModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onJumpToTab?: (tabId: string) => void;
}> = ({ open, onClose, onJumpToTab }) => {
  if (!open) return null;

  const sections = [
    {
      num: '1',
      title: 'الخطوة الأولى (اليوم الأول): مراجعة تسوية الـ 116 صفاً من ملف الإكسل',
      tabId: 'reconciliation',
      icon: <CheckCircle2 className="w-4 h-4" />,
      steps: [
        'انتقل إلى تبويب «تسوية الإكسل (116 صفاً)» — ستجد كل الحركات التاريخية مرحّلة ونظيفة تلقائياً.',
        'راجع البنود ذات العجز الدفتري (مثل DVD DRIVE و مشبك صرة وأكياس التغليف الحراري) وأدخل العدد الفعلي الموجود اليوم على الرف ثم اضغط «اعتماد الرصيد الفعلي».',
        'اعتمد تنبيه التواريخ المصحّحة (2027/2028/2029 و 206) بضغطة زر «تأكيد المراجعة».',
      ],
    },
    {
      num: '2',
      title: 'تسجيل الوارد (GRN) والصادر (GIN) والمرتجع (SRN) والتحويل (STR)',
      tabId: 'vouchers',
      icon: <ArrowDownLeft className="w-4 h-4" />,
      steps: [
        'استخدم الأزرار العلوية (+ إذن وارد / + إذن صرف / + مرتجع / + تحويل) — يمكنك إضافة عدة أصناف في إذن واحد (مثل تجهيز المكتب الجديد أو صيانة سكن).',
        'في الصرف (GIN): حدّد الجهة المستفيدة (مكتب ياقوت، سكن العاملات، توباز، دار الرواد...) واسم المستلم والغرفة لإخراج تقارير تكلفة كل فرع بدقة.',
        'كل إذن يُعتمد ويُرحّل فوراً مع توثيق اسم المنفّذ والوقت في سجل التدقيق؛ كما يمكنك حفظه كمسودة (Draft) أو عكسه (Reverse) دون حذف.',
        'استخدم زر «قوالب صرف جاهزة» في لوحة القيادة لصرف أطقم الصيانة والمكتب الجديد والبوفيه بنقرة واحدة.',
      ],
    },
    {
      num: '3',
      title: 'رفع ملفات Excel / CSV واستخراج المحتوى آلياً',
      tabId: 'overview',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      steps: [
        'اضغط زر «رفع واستخراج Excel» في أعلى الشاشة لرفع أي ملف (.xlsx / .xls / .csv) أو لصق صفوف مباشرة من Excel باستخدام (Ctrl+V).',
        'يتعرّف النظام تلقائياً على 3 أنماط: ملف المستودع المتجاور (مثل ملفكم)، جدول الحركات الموحّد، أو فاتورة مورد.',
        'راجع جدول المعاينة (عدّل أي اسم أو كمية أو تكلفة) ثم اضغط «اعتماد واستخراج وترحيل» لينشئ الأصناف الجديدة ويرحّل الأذونات تلقائياً.',
      ],
    },
    {
      num: '4',
      title: 'إضافة الصور والفواتير والوسائط (كاميرا الجوال + PDF + فيديو)',
      tabId: 'catalog',
      icon: <Camera className="w-4 h-4" />,
      steps: [
        'اضغط أيقونة الكاميرا بجانب أي صنف في «دليل الأصناف» لإرفاق صورة الصنف أو الكرتون أو موقع الرف.',
        'اضغط أيقونة الكاميرا/المرفقات بجانب أي إذن في «دفتر الأذونات» لتصوير فاتورة المورد أو سند الاستلام الموقّع أو إثبات التلف للمرتجع.',
        'يضغط النظام الصور تلقائياً ليبقى سريعاً ويمكنك استعراضها أو تنزيلها في أي وقت.',
      ],
    },
    {
      num: '5',
      title: 'الصرف السريع لحجارة الكمبيوتر والمستهلكات اليومية',
      tabId: 'quick-consumables',
      icon: <BatteryCharging className="w-4 h-4" />,
      steps: [
        'افتح تبويب «الصرف السريع (حجارة ومستهلكات)» واختر حجم الحجر (صغير AAA أو كبير AA) واسم الموظف والعدد.',
        'يخصم النظام الكمية تلقائياً من رصيد العلب (كل علبة = 24 حجر) ويحدّث جدول استهلاك كل موظف فوراً.',
      ],
    },
    {
      num: '6',
      title: 'الأصول المسلسلة والعهد التلقائية والعينات وحجز المنافسات (BOQ)',
      tabId: 'serials-samples',
      icon: <ShieldCheck className="w-4 h-4" />,
      steps: [
        'من تبويب «الأصول المسلسلة والعهد والعينات»، اضغط «ترحيل كعهدة» بجانب أي أصل تقني (Nikon Z8 / HP / Fluke) ليُضاف تلقائياً إلى سجل العهد الرسمي (Custodies).',
        'سجّل العينات المعارة بموعد إرجاع متوقع ليطلق النظام تنبيهاً عند التأخير، واستخدم «حجز المنافسات» لقفل كميات لصالح منافسة اعتماد ومنع صرفها لجهة أخرى.',
      ],
    },
    {
      num: '7',
      title: 'التصدير بـ 13 صيغة والإرسال المباشر عبر واتساب والبريد الإلكتروني',
      tabId: 'overview',
      icon: <Send className="w-4 h-4" />,
      steps: [
        'اضغط «تصدير وإرسال» لاختيار النطاق (المصنف الكامل 6 أوراق Excel، الأصناف، الوارد، الصادر، المرتجع، الحجارة، أو استهلاك الفروع).',
        'صدّر بأي صيغة: Excel متعدد الأوراق، PDF رسمي، Word، CSV عربي، PNG، HTML، JSON، XML، طباعة A4، أو نسخ مباشر للصق.',
        'أرسل مباشرة عبر «واتساب» (مع مرفق Excel أو PDF) أو «البريد الإلكتروني» (توليد ملف .EML كامل بالمرفق يفتح في Outlook بضغطة واحدة).',
      ],
    },
    {
      num: '8',
      title: 'الجرد الأعمى وسياسة التسعير والربط المحاسبي (IAS 2)',
      tabId: 'analytics-settings',
      icon: <Sliders className="w-4 h-4" />,
      steps: [
        'من تبويب «الجرد الدوري الأعمى» أنشئ جلسة جرد وأدخل العدد الفعلي على الرف، ثم اعتمد الجلسة لإصدار إذن تسوية الفروقات (ADJ) تلقائياً.',
        'من تبويب «التحليلات والتسعير والتدقيق» يمكنك التبديل بين الخيارين: (تكلفة اختيارية تتفعّل محاسبياً عند الإدخال) أو (تكلفة إلزامية في كل وارد).',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#141414]">
                دليل وإرشادات استخدام نظام المستودعات والمخزون (`KAS Enterprise WMS`)
              </h3>
              <p className="text-xs text-[#707070] mt-0.5">
                دليل تشغيلي عملي مخصص لـ حاتم سلمان أبوالذهب — خطوة بخطوة لكل ميزة في القسم
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {sections.map((sec) => (
            <div
              key={sec.num}
              className="p-4 rounded-[20px] border border-[#e0e0e0] bg-[#ffffff] flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#141414] text-white text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {sec.num}
                  </span>
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                    {sec.icon}
                    <span>{sec.title}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 text-[11.5px] text-[#707070] pr-3 list-disc">
                  {sec.steps.map((st, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {st}
                    </li>
                  ))}
                </ul>
              </div>
              {onJumpToTab && (
                <div className="pt-2 border-t border-[#f0f0f0] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToTab(sec.tabId);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-[11px] font-bold text-[#141414] transition-colors flex items-center gap-1"
                  >
                    <ClipboardList className="w-3 h-3" />
                    <span>انتقال مباشر للقسم</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 rounded-[18px] bg-[#141414] text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <strong>نصيحة ذهبية للسرعة اليومية:</strong> استخدم شريط <strong>المسح السريع بالباركود</strong> في أعلى لوحة القيادة للوصول لأي صنف وصرفه في 3 ثوانٍ، وصدّر <strong>المصنف الكامل (6 أوراق Excel)</strong> نهاية كل أسبوع لحفظ نسخة احتياطية وإرسالها للإدارة عبر واتساب أو البريد.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#ffffff] text-[#141414] text-xs font-bold shrink-0"
          >
            فهمت — ابدأ العمل
          </button>
        </div>
      </div>
    </div>
  );
};
