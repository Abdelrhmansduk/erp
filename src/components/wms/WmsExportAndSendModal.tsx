import React, { useMemo, useState } from 'react';
import {
  X,
  Download,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  FileText,
  FileEdit,
  Printer,
  Globe,
  Image as ImageIcon,
  FileCode,
  FileJson,
  Code,
  Copy,
  CheckCircle2,
  Send,
  Layers,
} from 'lucide-react';
import {
  buildWmsScopeDataset,
  WMS_EXPORT_SCOPES,
  wmsExportAndSendService,
  WmsExportScope,
  WmsFullExportFormat,
} from '../../services/wms/wmsExportAndSendService';

const QUICK_RECIPIENTS = [
  { name: 'الشيخ خالد السليم', email: 'khalid@kas.sa', phone: '' },
  { name: 'أ/ فراس دحام الحسن', email: 'f.alhassan.trade@kas.sa', phone: '' },
  { name: 'أحمد جمال البشير', email: 'a.albashir.trade@kas.sa', phone: '' },
  { name: 'حاتم سلمان أبوالذهب', email: 'h.salman.trade@kas.sa', phone: '' },
  { name: 'محمود علي (محاسبة التجارة)', email: 'm.alata.trade@kas.sa', phone: '' },
  { name: 'محمد خالد (محاسبة التجارة)', email: 'm.mohammed.acc@kas.sa', phone: '' },
];

export const WmsExportAndSendModal: React.FC<{
  open: boolean;
  initialTab?: 'export' | 'whatsapp' | 'email';
  onClose: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}> = ({ open, initialTab = 'export', onClose, onNotify }) => {
  const [tab, setTab] = useState<'export' | 'whatsapp' | 'email'>(initialTab);
  const [scope, setScope] = useState<WmsExportScope>('all_sheets');
  const [busyFormat, setBusyFormat] = useState<string | null>(null);

  // WhatsApp state
  const [waPhone, setWaPhone] = useState('');
  const [waRecipientName, setWaRecipientName] = useState('أ/ فراس دحام الحسن');
  const [waAttach, setWaAttach] = useState<'excel' | 'pdf' | 'none'>('excel');
  const [customNote, setCustomNote] = useState('');

  // Email state
  const [toEmail, setToEmail] = useState('f.alhassan.trade@kas.sa');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMode, setEmailMode] = useState<'eml_with_attachment' | 'mailto_and_download'>('eml_with_attachment');

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab, open]);

  const scopePreview = useMemo(() => buildWmsScopeDataset(scope), [scope, open]);
  const messagePreview = useMemo(
    () => wmsExportAndSendService.composeShareMessage(scope, customNote),
    [scope, customNote, open]
  );

  if (!open) return null;

  const formats: Array<{
    id: WmsFullExportFormat;
    label: string;
    ext: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'excel_multi',
      label: 'المصنف الكامل متعدد الأوراق (6 أوراق RTL)',
      ext: '.XLSX',
      desc: 'الأصناف + الوارد + الصادر + المرتجع + الحجارة + الاستهلاك',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'excel',
      label: 'ملف Microsoft Excel للنطاق المحدد',
      ext: '.XLSX',
      desc: 'جدول عربي منسّق RTL مع عرض أعمدة تلقائي',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'pdf',
      label: 'تقرير PDF تنفيذي رسمي (A4)',
      ext: '.PDF',
      desc: 'ترويسة رسمية شركة كاس + جدول عربي جاهز للاعتماد',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'word',
      label: 'مستند Microsoft Word قابل للتعديل',
      ext: '.DOC',
      desc: 'مستند رسمي جاهز للتحرير والطباعة',
      icon: <FileEdit className="w-4 h-4" />,
    },
    {
      id: 'csv',
      label: 'جدول CSV بترميز عربي (UTF-8 BOM)',
      ext: '.CSV',
      desc: 'يفتح مباشرة في Excel دون أي تشويه للأحرف العربية',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'tsv',
      label: 'ملف جدولي نصي TSV',
      ext: '.TSV',
      desc: 'مفصول بعلامات Tab للأنظمة الإحصائية',
      icon: <FileCode className="w-4 h-4" />,
    },
    {
      id: 'html',
      label: 'تقرير ويب تفاعلي يعمل بدون إنترنت',
      ext: '.HTML',
      desc: 'صفحة ويب كاملة للعرض والبحث والطباعة',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'png',
      label: 'صورة عالية الدقة للجدول',
      ext: '.PNG',
      desc: 'جاهزة للإرسال السريع على الجوال والواتساب',
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      id: 'json',
      label: 'بيانات JSON للأنظمة والربط API',
      ext: '.JSON',
      desc: 'ملف مهيكل للمطورين والنسخ الاحتياطي',
      icon: <FileJson className="w-4 h-4" />,
    },
    {
      id: 'xml',
      label: 'ملف XML قياسي',
      ext: '.XML',
      desc: 'متوافق مع أنظمة ERP العالمية',
      icon: <Code className="w-4 h-4" />,
    },
    {
      id: 'markdown',
      label: 'جدول Markdown للتوثيق',
      ext: '.MD',
      desc: 'جاهز للتقارير التوثيقية',
      icon: <FileCode className="w-4 h-4" />,
    },
    {
      id: 'print',
      label: 'طباعة مباشرة فورية (A4)',
      ext: 'PRINT',
      desc: 'معاينة طباعة نظيفة ومباشرة',
      icon: <Printer className="w-4 h-4" />,
    },
    {
      id: 'copy_table',
      label: 'نسخ الجدول للحافظة (لصق مباشر)',
      ext: 'COPY',
      desc: 'الصق فوراً داخل Excel أو Word أو بريدك',
      icon: <Copy className="w-4 h-4" />,
    },
  ];

  const handleExportFormat = async (fmt: WmsFullExportFormat) => {
    setBusyFormat(fmt);
    try {
      const res = await wmsExportAndSendService.exportInFormat(scope, fmt);
      onNotify(
        res.ok ? 'تم التصدير بنجاح' : 'تنبيه تصدير',
        res.message,
        res.ok ? 'success' : 'warning'
      );
    } catch (err: any) {
      onNotify('تعذر التصدير', err?.message || 'حدث خطأ أثناء إنشاء الملف.', 'error');
    } finally {
      setBusyFormat(null);
    }
  };

  const handleSendWhatsApp = async () => {
    setBusyFormat('whatsapp');
    try {
      const res = await wmsExportAndSendService.sendViaWhatsApp({
        scope,
        phone: waPhone,
        recipientName: waRecipientName,
        attachFormat: waAttach,
        customNote,
      });
      onNotify('إرسال عبر واتساب', res.message, 'success');
    } catch (err: any) {
      onNotify('تعذر فتح واتساب', err?.message || 'حدث خطأ.', 'error');
    } finally {
      setBusyFormat(null);
    }
  };

  const handleSendEmail = async () => {
    if (!toEmail.trim()) {
      onNotify('حقل مطلوب', 'يرجى إدخال البريد الإلكتروني للمستلم.', 'warning');
      return;
    }
    setBusyFormat('email');
    try {
      const res = await wmsExportAndSendService.sendViaEmail({
        scope,
        toEmail: toEmail.trim(),
        subject: emailSubject,
        customNote,
        deliveryMode: emailMode,
      });
      onNotify('إرسال عبر البريد الإلكتروني', res.message, 'success');
    } catch (err: any) {
      onNotify('تعذر تجهيز البريد', err?.message || 'حدث خطأ.', 'error');
    } finally {
      setBusyFormat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                13 صيغة تصدير + إرسال مباشر
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-mono font-bold">
                {scopePreview.rows.length} سجل جاهز
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#141414] mt-1">
              مركز التصدير بجميع الصيغ والإرسال المباشر (واتساب • بريد إلكتروني)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Selector */}
        <div className="bg-[#f3f3f3] rounded-[18px] p-4 space-y-2">
          <label className="block text-xs font-bold text-[#141414]">1. اختر البيانات المطلوب تصديرها أو إرسالها:</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as WmsExportScope)}
            className="w-full rounded-[14px] bg-[#ffffff] px-3.5 py-2.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
          >
            {WMS_EXPORT_SCOPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'export' as const, label: 'تصدير بكل الصيغ (13 صيغة)', icon: <Download className="w-3.5 h-3.5" /> },
            { id: 'whatsapp' as const, label: 'إرسال عبر واتساب + مرفق', icon: <MessageCircle className="w-3.5 h-3.5" /> },
            { id: 'email' as const, label: 'إرسال بريد إلكتروني + EML بالمرفق', icon: <Mail className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                tab === t.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: ALL 13 EXPORT FORMATS */}
        {tab === 'export' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {formats.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={busyFormat !== null}
                onClick={() => void handleExportFormat(f.id)}
                className="text-right p-3.5 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] hover:border-[#141414] hover:bg-[#f3f3f3] transition-colors flex flex-col justify-between gap-2 disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]">
                    {f.icon}
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-mono font-bold">
                    {busyFormat === f.id ? '...' : f.ext}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#141414]">{f.label}</div>
                  <div className="text-[11px] text-[#707070] mt-0.5">{f.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* TAB 2: WHATSAPP SEND */}
        {tab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">اختيار سريع للمستلم</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_RECIPIENTS.map((rec) => (
                    <button
                      key={rec.email}
                      type="button"
                      onClick={() => setWaRecipientName(rec.name)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        waRecipientName === rec.name ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                      }`}
                    >
                      {rec.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">اسم المستلم</label>
                  <input
                    type="text"
                    value={waRecipientName}
                    onChange={(e) => setWaRecipientName(e.target.value)}
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم الجوال (اختياري)</label>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">المرفق المصاحب للرسالة</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'excel' as const, label: 'ملف Excel (.xlsx)' },
                    { id: 'pdf' as const, label: 'تقرير PDF (.pdf)' },
                    { id: 'none' as const, label: 'نص منسّق فقط' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWaAttach(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        waAttach === opt.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظة إضافية (اختياري)</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="مثال: مرفق تقرير الجرد والأرصدة المحدّث لهذا الأسبوع"
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
                />
              </div>

              <button
                type="button"
                disabled={busyFormat !== null}
                onClick={() => void handleSendWhatsApp()}
                className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#262626]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال عبر واتساب وتجهيز المرفق الآن</span>
              </button>
            </div>

            <div className="lg:col-span-6 bg-[#f3f3f3] rounded-[18px] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#141414]">معاينة رسالة الواتساب</span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      void navigator.clipboard.writeText(messagePreview);
                    }
                    onNotify('تم النسخ', 'تم نسخ نص الرسالة إلى الحافظة.', 'success');
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#ffffff] text-[11px] font-bold text-[#141414] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>نسخ النص</span>
                </button>
              </div>
              <pre className="text-[11px] font-sans whitespace-pre-wrap text-[#141414] bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0] max-h-60 overflow-y-auto">
                {messagePreview}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: EMAIL + EML WITH ATTACHMENT */}
        {tab === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1.5">اختيار سريع من بريد الإدارة (@kas.sa)</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_RECIPIENTS.map((rec) => (
                  <button
                    key={rec.email}
                    type="button"
                    onClick={() => setToEmail(rec.email)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      toEmail === rec.email ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                    }`}
                  >
                    {rec.name} ({rec.email})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">البريد الإلكتروني للمستلم *</label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="name@kas.sa"
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">عنوان الرسالة (Subject)</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={scopePreview.title}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظة في نص البريد (اختياري)</label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="مرفق كشف المستودع والأرصدة المعتمدة..."
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEmailMode('eml_with_attachment')}
                className={`text-right p-3.5 rounded-[16px] border ${
                  emailMode === 'eml_with_attachment' ? 'border-[#141414] bg-[#f3f3f3]' : 'border-[#e0e0e0]'
                }`}
              >
                <div className="text-xs font-bold text-[#141414]">توليد ملف بريد Outlook كامل (.EML) مع مرفق Excel مضمّن</div>
                <div className="text-[11px] text-[#707070] mt-0.5">
                  يحتوي على الجدول منسّقاً بـ HTML + ملف .xlsx مرفقاً تلقائياً — افتحه واضغط إرسال مباشرة.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEmailMode('mailto_and_download')}
                className={`text-right p-3.5 rounded-[16px] border ${
                  emailMode === 'mailto_and_download' ? 'border-[#141414] bg-[#f3f3f3]' : 'border-[#e0e0e0]'
                }`}
              >
                <div className="text-xs font-bold text-[#141414]">فتح تطبيق البريد المباشر (mailto) + تنزيل ملف Excel</div>
                <div className="text-[11px] text-[#707070] mt-0.5">
                  يفتح برنامج البريد مع العنوان والنص المجهّز ويحمّل ملف الإكسل تلقائياً.
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={busyFormat !== null}
              onClick={() => void handleSendEmail()}
              className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#262626]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تجهيز وإرسال البريد الإلكتروني الآن</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
