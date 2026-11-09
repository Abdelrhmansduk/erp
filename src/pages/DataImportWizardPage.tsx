import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import {
  IMPORT_TEMPLATES,
  ImportTemplate,
  ParsedFileData,
  ColumnMap,
  ValidationResult,
  ImportResult,
  parseImportFile,
  autoMapColumns,
  validateImportData,
  executeImport,
  downloadTemplate,
  getImportHistory,
  ImportHistoryEntry,
} from '../services/importEngine';
import { 
  Database, History, RotateCcw, Check, ArrowLeft, ArrowRight, 
  UploadCloud, FileSpreadsheet, Search, X, AlertCircle, AlertTriangle, 
  CheckCircle2, Link2, Unlink2, Info, Download, Sparkles, Layers, ChevronDown
} from 'lucide-react';

type WizardStep = 'select-type' | 'upload' | 'mapping' | 'review' | 'results' | 'history';

export const DataImportWizardPage: React.FC = () => {
  const [step, setStep] = useState<WizardStep>('select-type');
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [columnMaps, setColumnMaps] = useState<ColumnMap[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data Records & Multi-format Export state
  const [recordsMap, setRecordsMap] = useState<Record<string, any[]>>({});
  const [openFormatMenu, setOpenFormatMenu] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all(
      IMPORT_TEMPLATES.map(async (tmpl) => {
        try {
          const recs = await realErpDataStore.getRecords<any>(tmpl.entityKey, tmpl.exampleRows as any);
          return [tmpl.entityKey, recs] as const;
        } catch {
          return [tmpl.entityKey, tmpl.exampleRows] as const;
        }
      })
    ).then((entries) => {
      if (isMounted) {
        setRecordsMap(Object.fromEntries(entries));
      }
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenFormatMenu(null);
    };
    if (openFormatMenu) {
      document.addEventListener('click', handleGlobalClick);
      return () => document.removeEventListener('click', handleGlobalClick);
    }
  }, [openFormatMenu]);

  // History state
  const [history] = useState<ImportHistoryEntry[]>(() => getImportHistory());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const STEPS: { key: WizardStep; label: string }[] = [
    { key: 'select-type', label: 'اختر النوع' },
    { key: 'upload', label: 'رفع الملف' },
    { key: 'mapping', label: 'تعيين الأعمدة' },
    { key: 'review', label: 'مراجعة وتحقق' },
    { key: 'results', label: 'النتائج' },
  ];

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  const DEPARTMENT_MAP: Record<string, string[]> = {
    recruitment: ['clients', 'cvs', 'contracts', 'rent_contracts', 'offices', 'shelter', 'sponsorship_transfers'],
    finance: ['chart_of_accounts', 'journal_entries', 'invoices', 'cost_centers', 'financial_requests'],
    hr: ['employees', 'attendances', 'custodies'],
    support: ['complaints'],
  };

  const filteredTemplates = IMPORT_TEMPLATES.filter(tmpl => {
    const matchesSearch = tmpl.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.fields.some(f => f.label.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (categoryFilter === 'all') return true;
    return DEPARTMENT_MAP[categoryFilter]?.includes(tmpl.entityKey);
  });

  const handleSelectTemplate = (tmpl: ImportTemplate) => {
    setSelectedTemplate(tmpl);
    setParsedData(null);
    setColumnMaps([]);
    setValidationResult(null);
    setImportResult(null);
    setUploadError(null);
    setStep('upload');
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedTemplate) return;
    setUploadError(null);
    try {
      const data = await parseImportFile(file);
      setParsedData(data);
      const maps = autoMapColumns(data.headers, selectedTemplate);
      setColumnMaps(maps);
      setStep('mapping');
    } catch (err: any) {
      setUploadError(err?.message || 'حدث خطأ أثناء قراءة الملف');
    }
  }, [selectedTemplate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleMappingChange = (systemField: string, fileColumn: string) => {
    setColumnMaps(prev =>
      prev.map(m => m.systemField === systemField ? { ...m, fileColumn } : m)
    );
  };

  const handleValidate = () => {
    if (!parsedData || !selectedTemplate) return;
    const result = validateImportData(parsedData.rows, columnMaps, selectedTemplate);
    setValidationResult(result);
    setStep('review');
  };

  const handleExecuteImport = async () => {
    if (!validationResult || !selectedTemplate) return;
    setIsImporting(true);
    try {
      const result = await executeImport(validationResult.valid, selectedTemplate.entityKey);
      result.warnings = validationResult.warnings;
      setImportResult(result);
      setStep('results');
    } catch (err: any) {
      console.error('Import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setStep('select-type');
    setSelectedTemplate(null);
    setParsedData(null);
    setColumnMaps([]);
    setValidationResult(null);
    setImportResult(null);
    setUploadError(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration
              type="ocr-extractor"
              size="sm"
              showBackground={false}
              className="!w-16 !h-14 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>DATA IMPORT WIZARD</span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>استيراد Excel & CSV</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                معالج استيراد البيانات المؤسسي
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                استيراد بيانات من ملفات Excel أو CSV أو JSON إلى أقسام النظام بشكل آمن ومحقق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0]">
              <CorporateAvatar
                archetype="ai-faris"
                name="فارس - مطابقة الحقول الذكية"
                size="xs"
                status="online"
              />
              <span className="text-[11px] font-bold text-[#141414]">مطابقة ذكية للأعمدة</span>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', borderColor: '#e0e0e0', background: '#ffffff', color: '#141414', fontWeight: 700 }}
            >
              <Database className="w-4 h-4 ml-1 text-[#141414]" />
              <span>بوابة استخلاص 100+ فاتورة وأي مستند (PDF / Word / Excel / صور)</span>
            </button>
            <button
              className="button-white-pill"
              onClick={() => setStep(step === 'history' ? 'select-type' : 'history')}
              style={{ fontSize: '12px', padding: '6px 18px', minHeight: '38px' }}
            >
              <History className="w-4 h-4 ml-1 text-[#141414]" />
              <span>{step === 'history' ? 'العودة للمعالج' : 'سجل الاستيرادات'}</span>
            </button>
            {step !== 'select-type' && step !== 'history' && (
              <button
                className="button-outline-on-dark"
                onClick={handleReset}
                style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
              >
                <RotateCcw className="w-3.5 h-3.5 ml-1" />
                <span>بدء من جديد</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      {step !== 'history' && (
        <div className="card-pricing flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-200 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <React.Fragment key={s.key}>
                <div
                  className={`flex items-center gap-2 cursor-pointer transition-opacity ${idx <= currentStepIndex ? 'opacity-100' : 'opacity-40'}`}
                  onClick={() => idx < currentStepIndex && setStep(s.key)}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent || isCompleted ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold ${isCurrent ? 'text-[#141414] font-bold' : 'text-[#707070]'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 min-w-[20px] ${idx < currentStepIndex ? 'bg-[#f3f3f3] border-b border-[#e0e0e0]' : 'bg-zinc-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* STEP 1: Select Type */}
      {step === 'select-type' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'جميع الأقسام (16)' },
                { id: 'recruitment', label: 'الاستقدام والتشغيل' },
                { id: 'finance', label: 'المالية والمحاسبة' },
                { id: 'hr', label: 'الموارد البشرية' },
                { id: 'support', label: 'الشكاوى والعمليات' },
              ].map(cat => {
                const isActive = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    style={{
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: isActive ? 550 : 420,
                      border: '1px solid',
                      borderColor: isActive ? '#141414' : '#e4e4e7',
                      backgroundColor: isActive ? '#141414' : '#ffffff',
                      color: isActive ? '#ffffff' : '#27272a',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className="w-full md:w-64">
              <input
                type="text"
                aria-label="ابحث باسم القسم أو الحقول"
                placeholder="ابحث باسم القسم أو الحقول..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] placeholder-zinc-400 focus:outline-none focus:border-[#141414]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {filteredTemplates.map(tmpl => (
              <div
                key={tmpl.entityKey}
                onClick={() => handleSelectTemplate(tmpl)}
                className={`card-pricing p-4 bg-white rounded-2xl border border-zinc-200 cursor-pointer hover:border-[#141414] transition-all flex flex-col justify-between relative ${
                  openFormatMenu === tmpl.entityKey ? 'z-30 border-[#141414] shadow-lg' : 'z-10'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-[#141414] font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#141414] m-0">{tmpl.displayName}</h2>
                      <span className="text-[10px] text-[#707070]">
                        {tmpl.fields.filter(f => f.required).length} حقول مطلوبة
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {tmpl.fields.filter(f => f.required).slice(0, 3).map(f => (
                      <span key={f.systemField} className="bg-zinc-100 text-zinc-700 text-[9.5px] px-1.5 py-0.5 rounded font-medium">
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-100 flex items-center gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
                  {/* Template Download Menu */}
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setOpenFormatMenu(openFormatMenu === tmpl.entityKey ? null : tmpl.entityKey)}
                      className="button-outline-on-light w-full flex items-center justify-between gap-1 text-[11px] px-2 py-1 min-h-[30px]"
                      title="تحميل قالب الإدخال بالصيغ المعتمدة"
                    >
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3 text-[#141414]" />
                        <span>القالب</span>
                      </span>
                      <ChevronDown className="w-2.5 h-2.5 text-[#707070]" />
                    </button>

                    {openFormatMenu === tmpl.entityKey && (
                      <div
                        className="absolute bottom-full mb-1 right-0 w-44 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-30 font-sans text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="px-3 py-1 text-[10px] font-bold text-[#707070] border-b border-zinc-100">
                          صيغ قوالب الإدخال
                        </div>
                        <button
                          type="button"
                          onClick={() => { downloadTemplate(tmpl, 'xlsx'); setOpenFormatMenu(null); }}
                          className="w-full text-right px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-50 flex items-center justify-between"
                        >
                          <span className="text-zinc-700">مصنف إكسل</span>
                          <span className="text-[#141414] font-mono font-bold text-[10px]">.XLSX</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { downloadTemplate(tmpl, 'csv'); setOpenFormatMenu(null); }}
                          className="w-full text-right px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-50 flex items-center justify-between"
                        >
                          <span className="text-zinc-700">جدول نصي</span>
                          <span className="text-[#141414] font-mono font-bold text-[10px]">.CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { downloadTemplate(tmpl, 'json'); setOpenFormatMenu(null); }}
                          className="w-full text-right px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-50 flex items-center justify-between"
                        >
                          <span className="text-zinc-700">كائن برمجي</span>
                          <span className="text-[#141414] font-mono font-bold text-[10px]">.JSON</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 10-Format Professional Data & Report Export */}
                  <div className="flex-shrink-0">
                    <ExportDropdown
                      sectionKey={tmpl.entityKey}
                      data={recordsMap[tmpl.entityKey] || tmpl.exampleRows}
                      customTitle={`سجل وتقارير ${tmpl.displayName} المعتمدة`}
                      buttonLabel="تصدير"
                      variant="compact"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Upload */}
      {step === 'upload' && selectedTemplate && (
        <div className="card-pricing p-8 bg-white rounded-3xl border border-zinc-200 space-y-6">
          <div className="text-center">
            <h3 className="text-base font-bold text-[#141414] mb-1">
              رفع ملف استيراد {selectedTemplate.displayName}
            </h3>
            <p className="text-xs text-[#707070]">
              قم بسحب ملف Excel أو CSV هنا أو اضغط للاختيار من جهازك
            </p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
              isDragging ? 'border-[#141414] bg-zinc-50' : 'border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50'
            }`}
          >
            <UploadCloud className="w-12 h-12 text-[#707070] mx-auto mb-3" />
            <p className="text-xs font-bold text-[#141414] mb-1">
              {isDragging ? 'أفلت الملف هنا' : 'اسحب الملف هنا أو اضغط للاختيار'}
            </p>
            <p className="text-[11px] text-[#707070] font-mono">
              الصيغ المدعومة: .xlsx, .xls, .csv, .json
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>

          {uploadError && (
            <div className="p-3 bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl text-[#141414] text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#141414]" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#707070]" />
              <div>
                <div className="text-xs font-bold text-[#141414]">تحتاج قالب جاهز؟</div>
                <div className="text-[11px] text-[#707070]">حمّل قالب Excel يحتوي على الأعمدة المطلوبة والبيانات النموذجية</div>
              </div>
            </div>
            <button
              onClick={() => downloadTemplate(selectedTemplate)}
              className="button-primary-pill"
              style={{ padding: '6px 16px', fontSize: '11.5px', minHeight: '32px' }}
            >
              <Download className="w-3.5 h-3.5 ml-1" />
              <span>تحميل القالب</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Mapping */}
      {step === 'mapping' && parsedData && selectedTemplate && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-[#141414] m-0">
              تعيين الأعمدة — ربط أعمدة الملف بحقول النظام
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>{parsedData.totalRows} سجل</span>
              <span className="pill-tag-shade" style={{ fontSize: '10.5px' }}>{parsedData.fileName}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">حقل النظام</th>
                  <th className="p-3.5 text-center">الربط</th>
                  <th className="p-3.5">عمود الملف المرفوع</th>
                  <th className="p-3.5">معاينة أول صف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {selectedTemplate.fields.map(field => {
                  const mapping = columnMaps.find(m => m.systemField === field.systemField);
                  const previewValue = mapping?.fileColumn && parsedData.rows[0]
                    ? parsedData.rows[0][mapping.fileColumn]
                    : '—';
                  const isMapped = !!mapping?.fileColumn;

                  return (
                    <tr key={field.systemField} className="hover:bg-zinc-50">
                      <td className="p-3.5">
                        <div className="font-bold text-[#141414] flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.required && <span className="text-[#141414] font-bold">*</span>}
                        </div>
                        <span className="text-[10px] text-[#707070]">
                          {field.type === 'number' ? 'رقم' : field.type === 'date' ? 'تاريخ' : 'نص'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isMapped ? (
                          <Link2 className="w-4 h-4 text-[#141414] mx-auto" />
                        ) : (
                          <Unlink2 className="w-4 h-4 text-[#141414] mx-auto" />
                        )}
                      </td>
                      <td className="p-3.5">
                        <select
                          value={mapping?.fileColumn || ''}
                          onChange={e => handleMappingChange(field.systemField, e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                        >
                          <option value="">— لم يتم التعيين —</option>
                          {parsedData.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-600 text-[11px]">
                        {String(previewValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              className="button-outline-on-light"
              style={{ padding: '6px 18px', fontSize: '12.5px' }}
              onClick={() => setStep('upload')}
            >
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
              <span>رجوع</span>
            </button>
            <button
              className="button-primary-pill"
              style={{ padding: '6px 22px', fontSize: '12.5px' }}
              onClick={handleValidate}
            >
              <span>تحقق ومراجعة</span>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review */}
      {step === 'review' && validationResult && selectedTemplate && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-4">
          <h3 className="text-sm font-bold text-[#141414] border-b border-zinc-100 pb-3 m-0">
            نتائج التحقق من البيانات
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-2xl font-bold text-[#141414] font-mono">{validationResult.valid.length}</div>
              <div className="text-xs font-bold text-[#141414] mt-1">سجل صالح للاستيراد</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-2xl font-bold text-[#141414] font-mono">{validationResult.warnings.length}</div>
              <div className="text-xs font-bold text-[#141414] mt-1">تحذيرات (يمكن تجاوزها)</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
              <div className="text-2xl font-bold text-[#141414] font-mono">{validationResult.errors.length}</div>
              <div className="text-xs font-bold text-[#141414] mt-1">أخطاء (لن تُستورد)</div>
            </div>
          </div>

          {/* Valid Data Preview Table */}
          {validationResult.valid.length > 0 && (
            <div className="overflow-x-auto border border-zinc-200 rounded-2xl">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    {selectedTemplate.fields.slice(0, 5).map(f => (
                      <th key={f.systemField} className="p-3">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {validationResult.valid.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      {selectedTemplate.fields.slice(0, 5).map(f => (
                        <td key={f.systemField} className="p-3 font-mono">{String(row[f.systemField] || '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              className="button-outline-on-light"
              style={{ padding: '6px 18px', fontSize: '12.5px' }}
              onClick={() => setStep('mapping')}
            >
              <span>تعديل التعيين</span>
            </button>
            <button
              className="button-primary-pill"
              style={{ padding: '6px 22px', fontSize: '12.5px' }}
              onClick={handleExecuteImport}
              disabled={validationResult.valid.length === 0 || isImporting}
            >
              {isImporting ? 'جاري الاستيراد...' : `استيراد ${validationResult.valid.length} سجل`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Results */}
      {step === 'results' && importResult && (
        <div className="card-pricing p-12 bg-white rounded-3xl border border-zinc-200 text-center space-y-6 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#f3f3f3] text-[#141414] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#141414] mb-1">
              {importResult.failed === 0 ? 'تم الاستيراد بنجاح!' : 'اكتمل الاستيراد مع بعض الملاحظات'}
            </h3>
            <p className="text-xs text-[#707070]">
              تم استيراد <strong className="text-[#141414]">{importResult.imported}</strong> من أصل {importResult.total} سجل في {(importResult.duration / 1000).toFixed(1)} ثانية
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              className="button-primary-pill"
              onClick={handleReset}
              style={{ padding: '8px 24px', fontSize: '12.5px' }}
            >
              استيراد بيانات أخرى
            </button>
            <button
              className="button-outline-on-light"
              onClick={() => setStep('history')}
              style={{ padding: '8px 20px', fontSize: '12.5px' }}
            >
              عرض سجل الاستيرادات
            </button>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {step === 'history' && (
        <div className="card-pricing p-6 bg-white rounded-3xl border border-zinc-200 space-y-4">
          <h3 className="text-sm font-bold text-[#141414] border-b border-zinc-100 pb-3 m-0 flex items-center gap-2">
            <History className="w-4 h-4 text-[#141414]" />
            <span>سجل عمليات الاستيراد السابقة</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">تم استيراده</th>
                  <th className="p-3.5">فشل</th>
                  <th className="p-3.5">المدة</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono text-[11px]">
                      {new Date(entry.timestamp).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-3.5 font-bold text-[#141414]">{entry.templateName}</td>
                    <td className="p-3.5 font-bold text-[#141414] font-mono">{entry.imported}</td>
                    <td className="p-3.5 font-bold text-[#141414] font-mono">{entry.failed}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{(entry.duration / 1000).toFixed(1)}s</td>
                    <td className="p-3.5">
                      <Badge
                        text={entry.failed === 0 ? 'مكتمل' : 'مكتمل جزئياً'}
                        type={entry.failed === 0 ? 'success' : 'warning'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataImportWizardPage;
