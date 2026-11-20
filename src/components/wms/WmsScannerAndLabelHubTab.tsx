import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScanBarcode,
  Camera,
  Printer,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  UploadCloud,
  Radio,
  Plus,
  Trash2,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  QrCode,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  generateRealCode128BarcodeSvg,
  generateRealQrSvg,
} from '../../utils/realBarcodeGenerator';
import { sanitizeHtmlMarkup } from '../../utils/securitySanitizers';
import {
  BatchParsedScan,
  PrintableSerialLabel,
  ScanResolutionResult,
  wmsScannerAndBarcodeService,
  WmsLocationTag,
} from '../../services/wms/wmsScannerAndBarcodeService';
import { wmsEngineService, WmsActor } from '../../services/wms/wmsEngineService';
import { WMS_BENEFICIARIES } from '../../services/wms/wmsExcelMigrationSeed';
import { WmsItem, WmsWarehouse } from '../../types/wms';

type ScannerMode = 'lookup' | 'stocktake' | 'field_audit' | 'scan_voucher';
type LabelFormat = 'thermal_50x25' | 'a4_grid';

export const WmsScannerAndLabelHubTab: React.FC<{
  items: WmsItem[];
  warehouses: WmsWarehouse[];
  actor: WmsActor;
  onStateChanged: () => void;
  onNotify: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}> = ({ items, warehouses, actor, onStateChanged, onNotify }) => {
  const [section, setSection] = useState<'scanner' | 'labels' | 'locations'>('scanner');

  // ── 1. LIVE HARDWARE SCANNER (USB / BLUETOOTH / PDA / CAMERA / BATCH) ──
  const [scanMode, setScanMode] = useState<ScannerMode>('lookup');
  const [hardwareListenActive, setHardwareListenActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [lastScan, setLastScan] = useState<ScanResolutionResult | null>(null);
  const [scanQueue, setScanQueue] = useState<
    Array<{ code: string; qty: number; resolution: ScanResolutionResult; scannedAt: string }>
  >([]);

  // Field Audit target site/room
  const [activeFieldSite, setActiveFieldSite] = useState<string>('سكن العاملات (مركز الإيواء)');
  const [targetWhId, setTargetWhId] = useState<string>(warehouses[0]?.id || 'WH-MAIN');
  const [voucherDir, setVoucherDir] = useState<'GRN' | 'GIN'>('GIN');

  // Camera live scanner
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Batch collector TXT/CSV file input
  const batchFileRef = useRef<HTMLInputElement | null>(null);

  // ── 2. BULK SERIALIZED BARCODE LABEL PRINT STUDIO ──
  const [labelSourceMode, setLabelSourceMode] = useState<'EXISTING_ITEM' | 'EXTERNAL_ASSET'>('EXISTING_ITEM');
  const [labelItemId, setLabelItemId] = useState<string>(items[0]?.id || '');
  const [customAssetName, setCustomAssetName] = useState('');
  const [customPrefix, setCustomPrefix] = useState('KAS-EXT');
  const [labelLocation, setLabelLocation] = useState('المستودع المركزي — الرياض');
  const [labelAssignee, setLabelAssignee] = useState('');
  const [labelCount, setLabelCount] = useState('6');
  const [labelStartSeq, setLabelStartSeq] = useState('1');
  const [registerSerials, setRegisterSerials] = useState(true);
  const [labelPrintFormat, setLabelPrintFormat] = useState<LabelFormat>('a4_grid');
  const [generatedLabels, setGeneratedLabels] = useState<PrintableSerialLabel[]>([]);

  // ── 3. LOCATION / OFFICE / ROOM BARCODE TAGS ──
  const [locTagsTick, setLocTagsTick] = useState(0);
  const locationTags = useMemo(() => wmsScannerAndBarcodeService.getAllLocationTags(), [locTagsTick]);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomGroup, setNewRoomGroup] = useState<WmsLocationTag['group']>('مراكز السكن والغرف');
  const [selectedLocLabels, setSelectedLocLabels] = useState<PrintableSerialLabel[]>([]);

  // Process a scan from ANY source (USB/BT scanner, PDA, Camera, Manual, Batch)
  const handleScanCode = (raw: string, qtyIncrement = 1) => {
    const code = (raw || '').trim();
    if (!code) return;
    const resolution = wmsScannerAndBarcodeService.resolveScannedCode(code);
    setLastScan(resolution);

    if (soundEnabled) {
      wmsScannerAndBarcodeService.playBeep(resolution.matchedType === 'UNKNOWN' ? 'warn' : 'ok');
    }

    // If user scanned a Location/Room tag while in Field Audit mode -> auto switch active room!
    if (resolution.matchedType === 'LOCATION_TAG' && scanMode === 'field_audit') {
      setActiveFieldSite(resolution.displayName);
      onNotify('تم تحديد الموقع الميداني بالمسح', `الموقع النشط للجرد الآن: ${resolution.displayName}`, 'info');
      return;
    }

    if (scanMode !== 'lookup') {
      setScanQueue((prev) => {
        const idx = prev.findIndex((p) => p.code.toLowerCase() === resolution.code.toLowerCase());
        if (idx >= 0) {
          return prev.map((p, i) =>
            i === idx ? { ...p, qty: p.qty + qtyIncrement, scannedAt: new Date().toLocaleTimeString('ar-SA') } : p
          );
        }
        return [
          {
            code: resolution.code || code,
            qty: qtyIncrement,
            resolution,
            scannedAt: new Date().toLocaleTimeString('ar-SA'),
          },
          ...prev,
        ];
      });
    }
  };

  // Global USB / Bluetooth / PDA HID Scanner Listener (detects fast barcode keystrokes ending in Enter)
  useEffect(() => {
    if (!hardwareListenActive || section !== 'scanner') return;
    let buffer = '';
    let lastKeyTime = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (isInputFocused) return;

      const now = Date.now();
      if (now - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter' && buffer.length >= 4) {
        e.preventDefault();
        const captured = buffer;
        buffer = '';
        handleScanCode(captured, 1);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardwareListenActive, section, scanMode, soundEnabled]);

  // Camera Scanner lifecycle (uses browser BarcodeDetector API when supported)
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('المتصفح الحالي لا يدعم الوصول للكاميرا. استخدم قارئ USB/Bluetooth أو الإدخال اليدوي.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 100);

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        setCameraError('الكاميرا تعمل الآن، لكن متصفح سطح المكتب لا يدعم BarcodeDetector التلقائي — يعمل تلقائياً على Chrome/Edge على الجوال أو عبر قارئ USB/Bluetooth فوراً.');
        return;
      }
      const detector = new BarcodeDetectorCtor({
        formats: ['code_128', 'qr_code', 'ean_13', 'code_39'],
      });

      const poll = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found && found.length > 0 && found[0].rawValue) {
            handleScanCode(found[0].rawValue, 1);
            stopCamera();
            return;
          }
        } catch {
          // frame not ready
        }
        if (streamRef.current) requestAnimationFrame(() => void poll());
      };
      requestAnimationFrame(() => void poll());
    } catch (err: any) {
      setCameraError(`تعذر فتح الكاميرا: ${err?.message || 'تأكد من منح صلاحية الكاميرا للمتصفح'}`);
    }
  };

  useEffect(() => () => stopCamera(), []);

  // Import TXT/CSV dump from offline batch collector
  const handleBatchFileUpload = async (file: File) => {
    const text = await file.text();
    const parsed: BatchParsedScan[] = wmsScannerAndBarcodeService.parseHardwareCollectorBatch(text);
    if (parsed.length === 0) {
      onNotify('ملف فارغ', 'لم يتم العثور على باركودات صالحة داخل الملف.', 'warning');
      return;
    }
    setScanQueue((prev) => [
      ...parsed.map((p) => ({
        code: p.code,
        qty: p.qty,
        resolution: p.resolution,
        scannedAt: 'ملف جهاز الجرد',
      })),
      ...prev,
    ]);
    onNotify('استيراد ملف جهاز الجرد', `تمت قراءة ومطابقة (${parsed.length}) باركود من جهاز الجرد المحمول.`, 'success');
  };

  // Commit scanned queue into Cycle Count OR GRN/GIN Voucher
  const commitQueueAction = () => {
    const validItems = scanQueue.filter((q) => q.resolution.item);
    if (validItems.length === 0) {
      onNotify('لا توجد أصناف مطابقة', 'امسح أصنافاً مسجلة أولاً لتنفيذ الإجراء.', 'warning');
      return;
    }

    if (scanMode === 'stocktake') {
      const session = wmsEngineService.createCycleCountSession(targetWhId, false, actor);
      for (const entry of validItems) {
        wmsEngineService.updateCycleCountLine(session.id, entry.resolution.item!.id, entry.qty);
      }
      const res = wmsEngineService.postCycleCountSession(session.id, actor);
      setScanQueue([]);
      onStateChanged();
      onNotify(
        'اعتماد جرد جهاز الباركود',
        res.adjustmentVoucherNo
          ? `تم إنشاء جلسة الجرد (${session.countNo}) وترحيل فروقات (${validItems.length}) صنف بإذن ${res.adjustmentVoucherNo}.`
          : `تمت مطابقة واعتماد جرد (${validItems.length}) صنف بنجاح.`,
        'success'
      );
      return;
    }

    if (scanMode === 'scan_voucher') {
      const res = wmsEngineService.createAndPostVoucher(
        {
          voucherType: voucherDir,
          voucherDate: new Date().toISOString().slice(0, 10),
          warehouseId: targetWhId,
          beneficiaryEntity: voucherDir === 'GIN' ? activeFieldSite : undefined,
          supplierName: voucherDir === 'GRN' ? 'استلام بجهاز الباركود' : undefined,
          notes: `إذن مُنشأ مباشرة عبر محطة جهاز الجرد (${validItems.length} أصناف)`,
          lines: validItems.map((e) => ({
            itemId: e.resolution.item!.id,
            enteredQty: e.qty,
            enteredUom: e.resolution.item!.baseUom,
          })),
        },
        actor
      );
      if (res.error) {
        onNotify('تعذر إنشاء الإذن', res.error, 'error');
        return;
      }
      setScanQueue([]);
      onStateChanged();
      onNotify(
        'تم إنشاء الإذن بالباركود',
        `تم اعتماد الإذن (${res.voucher?.voucherNo}) لعدد (${validItems.length}) أصناف بنجاح.`,
        'success'
      );
    }
  };

  // Field Audit comparison (Expected assets at activeFieldSite vs Scanned)
  const fieldAuditSummary = useMemo(() => {
    const state = wmsEngineService.getState();
    const expectedAtSite = state.serialLots.filter(
      (s) =>
        (s.assignedToEntity || '').includes(activeFieldSite) ||
        activeFieldSite.includes(s.assignedToEntity || '___')
    );
    const scannedCodes = new Set(scanQueue.map((q) => q.code.toLowerCase()));
    const matched = expectedAtSite.filter(
      (s) => s.serialNumber && scannedCodes.has(s.serialNumber.toLowerCase())
    );
    const missing = expectedAtSite.filter(
      (s) => !s.serialNumber || !scannedCodes.has(s.serialNumber.toLowerCase())
    );
    const unexpected = scanQueue.filter(
      (q) =>
        !expectedAtSite.some(
          (s) => s.serialNumber && s.serialNumber.toLowerCase() === q.code.toLowerCase()
        )
    );
    return { expectedAtSite, matched, missing, unexpected };
  }, [activeFieldSite, scanQueue]);

  // Generate Batch Serialized Labels
  const handleGenerateLabels = (e: React.FormEvent) => {
    e.preventDefault();
    const batch = wmsScannerAndBarcodeService.generateSerializedLabelsBatch({
      mode: labelSourceMode,
      itemId: labelSourceMode === 'EXISTING_ITEM' ? labelItemId : undefined,
      customAssetName: labelSourceMode === 'EXTERNAL_ASSET' ? customAssetName : undefined,
      prefixCode: labelSourceMode === 'EXTERNAL_ASSET' ? customPrefix : undefined,
      locationOrOffice: labelLocation,
      assignedToName: labelAssignee.trim() || undefined,
      count: Number(labelCount) || 1,
      startNumber: Number(labelStartSeq) || 1,
      registerInSystem: registerSerials,
      actor,
    });
    setGeneratedLabels(batch);
    if (registerSerials) onStateChanged();
    onNotify(
      'تم توليد الملصقات التسلسلية',
      `تم إنشاء (${batch.length}) باركود تسلسلي حقيقي (Code-128B + QR)${registerSerials ? ' وتسجيلها في النظام للبحث الفوري بالمسح' : ''}.`,
      'success'
    );
  };

  // Print clean dedicated window for Thermal 50x25mm OR A4 Grid
  const printLabelsSheet = (labels: PrintableSerialLabel[], format: LabelFormat) => {
    if (labels.length === 0) return;
    const isThermal = format === 'thermal_50x25';
    const cardsHtml = labels
      .map((lbl) => {
        const barSvg = generateRealCode128BarcodeSvg(lbl.barcodeValue, {
          widthPx: isThermal ? 155 : 170,
          heightPx: isThermal ? 32 : 36,
        });
        const qrSvg = generateRealQrSvg(lbl.qrPayload, {
          sizePx: isThermal ? 42 : 48,
          borderStyle: false,
        });
        return `
          <div class="lbl-card">
            <div class="lbl-top">
              <div class="lbl-text">
                <div class="lbl-brand">KAS WMS • شركة كاس</div>
                <div class="lbl-title">${lbl.titleAr}</div>
                <div class="lbl-loc">${lbl.locationLabel}</div>
              </div>
              <div class="lbl-qr">${qrSvg}</div>
            </div>
            <div class="lbl-bar">${barSvg}</div>
            <div class="lbl-code">${lbl.barcodeValue}</div>
          </div>
        `;
      })
      .join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>طباعة ملصقات الباركود التسلسلي — KAS WMS</title>
      <style>
        @page { size: ${isThermal ? '50mm 30mm' : 'A4 portrait'}; margin: ${isThermal ? '1mm' : '8mm'}; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; background: #fff; color: #141414; }
        .grid { display: ${isThermal ? 'block' : 'grid'}; ${isThermal ? '' : 'grid-template-columns: repeat(3, 1fr); gap: 6mm;'} }
        .lbl-card {
          border: 1px solid #141414;
          border-radius: 6px;
          padding: ${isThermal ? '2mm' : '3mm'};
          box-sizing: border-box;
          page-break-inside: avoid;
          ${isThermal ? 'width: 48mm; height: 28mm; page-break-after: always; overflow: hidden;' : 'min-height: 36mm;'}
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .lbl-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
        .lbl-brand { font-size: 7px; font-weight: 700; color: #555; }
        .lbl-title { font-size: ${isThermal ? '8.5px' : '10.5px'}; font-weight: 800; line-height: 1.2; margin-top: 1px; }
        .lbl-loc { font-size: ${isThermal ? '7px' : '8.5px'}; color: #444; margin-top: 1px; }
        .lbl-bar { display: flex; justify-content: center; margin-top: 2px; }
        .lbl-code { text-align: center; font-family: monospace; font-size: ${isThermal ? '7.5px' : '9px'}; font-weight: 700; letter-spacing: 0.5px; }
      </style></head><body><div class="grid">${cardsHtml}</div></body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) {
      w.document.open();
      w.document.write(sanitizeHtmlMarkup(html, true));
      w.document.close();
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          // ignore popup print errors
        }
      }, 150);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'scanner' as const, label: '1. محطة توصيل أجهزة الجرد (USB / BT / PDA / كاميرا)', icon: <ScanBarcode className="w-3.5 h-3.5" /> },
            { id: 'labels' as const, label: '2. طباعة باركود تسلسلي حقيقي (داخل وخارج المستودع)', icon: <Printer className="w-3.5 h-3.5" /> },
            { id: 'locations' as const, label: '3. ملصقات المواقع والمكاتب والغرف (Location Tags)', icon: <MapPin className="w-3.5 h-3.5" /> },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                section === s.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
              }`}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-bold text-[#141414] flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#0066ff]" />
            <span>{hardwareListenActive ? 'قارئ الباركود USB/BT نشط تلقائياً' : 'الاستماع متوقف'}</span>
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
            title="صوت التأكيد Beep"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: LIVE HARDWARE SCANNER & FIELD AUDIT STATION               */}
      {/* ==================================================================== */}
      {section === 'scanner' && (
        <div className="space-y-5">
          {/* Mode Selector + Manual / Camera / Batch Controls */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'lookup' as const, label: 'استعلام فوري (قراءة الاسم والمكان)', icon: <QrCode className="w-3.5 h-3.5" /> },
                  { id: 'stocktake' as const, label: 'جرد مستودع سريع (+1 بالمسح)', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
                  { id: 'field_audit' as const, label: 'جرد ميداني لمكتب / غرفة خارج المستودع', icon: <MapPin className="w-3.5 h-3.5" /> },
                  { id: 'scan_voucher' as const, label: 'تكوين إذن وارد / صرف بالمسح', icon: <Package className="w-3.5 h-3.5" /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setScanMode(m.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      scanMode === m.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hardwareListenActive}
                  onChange={(e) => setHardwareListenActive(e.target.checked)}
                />
                <span>التقاط تلقائي لجهاز USB/Bluetooth</span>
              </label>
            </div>

            {/* Context bar for stocktake / field_audit / scan_voucher */}
            {(scanMode === 'stocktake' || scanMode === 'scan_voucher') && (
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-[16px] bg-[#f3f3f3] text-xs">
                <span className="font-bold text-[#141414]">المستودع:</span>
                <select
                  value={targetWhId}
                  onChange={(e) => setTargetWhId(e.target.value)}
                  className="rounded-full bg-[#ffffff] px-3 py-1.5 font-bold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
                {scanMode === 'scan_voucher' && (
                  <>
                    <span className="font-bold text-[#141414]">نوع الإذن:</span>
                    <button
                      type="button"
                      onClick={() => setVoucherDir('GRN')}
                      className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                        voucherDir === 'GRN' ? 'bg-[#141414] text-white' : 'bg-[#ffffff] text-[#141414]'
                      }`}
                    >
                      <ArrowDownLeft className="w-3 h-3" /> وارد (GRN)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoucherDir('GIN')}
                      className={`px-3 py-1 rounded-full font-bold flex items-center gap-1 ${
                        voucherDir === 'GIN' ? 'bg-[#141414] text-white' : 'bg-[#ffffff] text-[#141414]'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3" /> صرف (GIN)
                    </button>
                    {voucherDir === 'GIN' && (
                      <select
                        value={activeFieldSite}
                        onChange={(e) => setActiveFieldSite(e.target.value)}
                        className="rounded-full bg-[#ffffff] px-3 py-1.5 font-bold"
                      >
                        {WMS_BENEFICIARIES.map((b) => (
                          <option key={b.id} value={b.nameAr}>
                            {b.nameAr}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            )}

            {scanMode === 'field_audit' && (
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-[16px] bg-[#f3f3f3] text-xs">
                <MapPin className="w-4 h-4 text-[#141414]" />
                <span className="font-bold text-[#141414]">المكتب / الغرفة قيد الجرد الميداني:</span>
                <select
                  value={activeFieldSite}
                  onChange={(e) => setActiveFieldSite(e.target.value)}
                  className="rounded-full bg-[#ffffff] px-3.5 py-1.5 font-bold"
                >
                  {locationTags.map((l) => (
                    <option key={l.code} value={l.nameAr}>
                      {l.nameAr} ({l.code})
                    </option>
                  ))}
                </select>
                <span className="text-[#707070]">أو امسح ملصق باركود باب الغرفة مباشرة للتبديل تلقائياً</span>
              </div>
            )}

            {/* Scan Input + Camera + Offline Collector File Import */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanCode(manualCode, 1);
                setManualCode('');
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="امسح الباركود بجهاز USB/Bluetooth/PDA أو اكتب الرقم التسلسلي/SKU واضغط Enter..."
                className="flex-1 min-w-[260px] rounded-full bg-[#f0f0f0] px-4 py-2.5 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-[#262626]"
              >
                قراءة الباركود
              </button>
              <button
                type="button"
                onClick={() => (cameraOpen ? stopCamera() : void startCameraScanner())}
                className="px-4 py-2.5 rounded-full border border-[#141414] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f3f3f3]"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraOpen ? 'إغلاق الكاميرا' : 'مسح بكاميرا الجوال'}</span>
              </button>
              <input
                ref={batchFileRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleBatchFileUpload(f);
                }}
              />
              <button
                type="button"
                onClick={() => batchFileRef.current?.click()}
                className="px-4 py-2.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e5e5e5]"
                title="استيراد ملف قارئ الباركود الأوفلاين ذي الذاكرة الداخلية (TXT / CSV)"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>تفريغ جهاز جرد أوفلاين (TXT/CSV)</span>
              </button>
            </form>

            {cameraError && (
              <div className="p-3 rounded-[14px] bg-[#f3f3f3] text-xs text-[#141414] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {cameraOpen && (
              <div className="rounded-[18px] overflow-hidden border border-[#141414] max-w-md mx-auto bg-black">
                <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />
              </div>
            )}
          </div>

          {/* Instant Scan Result Card */}
          {lastScan && (
            <div className="bg-[#ffffff] border-2 border-[#141414] rounded-[24px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {lastScan.photoDataUrl ? (
                  <img
                    src={lastScan.photoDataUrl}
                    alt={lastScan.displayName}
                    className="w-16 h-16 rounded-[14px] object-cover border border-[#e0e0e0]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-[14px] bg-[#141414] text-white flex items-center justify-center shrink-0">
                    <ScanBarcode className="w-7 h-7" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                      {lastScan.matchedType === 'SERIAL_ASSET'
                        ? 'أصل / قطعة مسلسلة'
                        : lastScan.matchedType === 'ITEM_SKU'
                        ? 'صنف مستودع (SKU)'
                        : lastScan.matchedType === 'LOCATION_TAG'
                        ? 'ملصق موقع / غرفة'
                        : 'رمز غير مسجّل'}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#141414]">{lastScan.code}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold text-[#141414]">
                      {lastScan.statusLabel}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-[#141414]">{lastScan.displayName}</div>
                  <div className="text-xs text-[#707070] flex flex-wrap gap-3">
                    <span>الموقع الحالي: <strong className="text-[#141414]">{lastScan.locationOrSite}</strong></span>
                    {lastScan.assignedTo && (
                      <span>بحوزة / مسؤول: <strong className="text-[#141414]">{lastScan.assignedTo}</strong></span>
                    )}
                    {lastScan.availableQty !== undefined && (
                      <span>
                        الرصيد المتاح: <strong className="text-[#141414] font-mono">{lastScan.availableQty} {lastScan.baseUom}</strong>
                      </span>
                    )}
                    {lastScan.custodyId && (
                      <span className="font-mono font-bold text-[#141414]">عهدة #{lastScan.custodyId}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Field Audit Live Report (Inside Rooms & Offices Outside Warehouse) */}
          {scanMode === 'field_audit' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 space-y-2">
                <div className="text-xs font-bold text-[#141414]">
                  مطابق وموجود بالغرفة ({fieldAuditSummary.matched.length})
                </div>
                {fieldAuditSummary.matched.length === 0 ? (
                  <p className="text-[11px] text-[#707070]">امسح الأجهزة الموجودة داخل {activeFieldSite}.</p>
                ) : (
                  fieldAuditSummary.matched.map((m) => (
                    <div key={m.id} className="p-2 rounded-[10px] bg-[#f3f3f3] text-[11px] font-bold">
                      {m.itemName} <span className="font-mono text-[#707070]">({m.serialNumber})</span>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-[#ffffff] border border-[#141414] rounded-[20px] p-4 space-y-2">
                <div className="text-xs font-bold text-[#141414]">
                  مسجّل على هذه الجهة ولم يُمسح بعد ({fieldAuditSummary.missing.length})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {fieldAuditSummary.missing.map((m) => (
                    <div key={m.id} className="p-2 rounded-[10px] bg-[#f3f3f3] text-[11px]">
                      <div className="font-bold text-[#141414]">{m.itemName}</div>
                      <div className="font-mono text-[10px] text-[#707070]">{m.serialNumber || m.sku}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 space-y-2">
                <div className="text-xs font-bold text-[#141414]">
                  أجهزة ممسوحة إضافية / منقولة ({fieldAuditSummary.unexpected.length})
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {fieldAuditSummary.unexpected.map((u) => (
                    <div key={u.code} className="p-2 rounded-[10px] bg-[#f3f3f3] text-[11px]">
                      <div className="font-bold text-[#141414]">{u.resolution.displayName}</div>
                      <div className="text-[10px] text-[#707070]">
                        {u.code} • مسجّل في: {u.resolution.locationOrSite}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scanned Queue Table for Stocktake / Scan-to-Voucher */}
          {scanQueue.length > 0 && (
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-[#141414]">
                  قائمة المسحات المجمّعة ({scanQueue.length} باركود)
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScanQueue([])}
                    className="px-3 py-1.5 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#707070]"
                  >
                    مسح القائمة
                  </button>
                  {(scanMode === 'stocktake' || scanMode === 'scan_voucher') && (
                    <button
                      type="button"
                      onClick={commitQueueAction}
                      className="px-4 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {scanMode === 'stocktake'
                          ? 'اعتماد كجلسة جرد وترحيل الفروقات'
                          : `إنشاء إذن ${voucherDir} بالمسحات`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto border border-[#e0e0e0] rounded-[14px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2.5">الباركود الممسوح</th>
                      <th className="p-2.5">الاسم المطابق</th>
                      <th className="p-2.5">العدد الممسوح</th>
                      <th className="p-2.5">الموقع</th>
                      <th className="p-2.5">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {scanQueue.map((q) => (
                      <tr key={q.code}>
                        <td className="p-2.5 font-mono font-bold">{q.code}</td>
                        <td className="p-2.5 font-semibold text-[#141414]">{q.resolution.displayName}</td>
                        <td className="p-2.5 font-mono font-bold">{q.qty}</td>
                        <td className="p-2.5 text-[#707070]">{q.resolution.locationOrSite}</td>
                        <td className="p-2.5">
                          <button
                            type="button"
                            onClick={() => setScanQueue((prev) => prev.filter((x) => x.code !== q.code))}
                            className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: BULK SERIALIZED REAL BARCODE LABEL PRINT STUDIO           */}
      {/* ==================================================================== */}
      {section === 'labels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleGenerateLabels}
            className="lg:col-span-5 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3.5"
          >
            <div>
              <h3 className="text-sm font-bold text-[#141414]">
                توليد وطباعة باركود تسلسلي حقيقي (Code-128B + QR)
              </h3>
              <p className="text-[11px] text-[#707070] mt-0.5">
                لأي صنف داخل المستودع أو أي جهاز/أثاث خارج المستودع (مكاتب، غرف سكن، سيارات، عهد)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLabelSourceMode('EXISTING_ITEM')}
                className={`flex-1 py-2 rounded-full text-xs font-bold ${
                  labelSourceMode === 'EXISTING_ITEM' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                صنف من المستودع
              </button>
              <button
                type="button"
                onClick={() => setLabelSourceMode('EXTERNAL_ASSET')}
                className={`flex-1 py-2 rounded-full text-xs font-bold ${
                  labelSourceMode === 'EXTERNAL_ASSET' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                جهاز / أصل خارج المستودع
              </button>
            </div>

            {labelSourceMode === 'EXISTING_ITEM' ? (
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">اختر الصنف</label>
                <select
                  value={labelItemId}
                  onChange={(e) => setLabelItemId(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-semibold"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.sku}] {it.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#141414] mb-1">اسم الجهاز / الأصل الخارجي *</label>
                  <input
                    type="text"
                    required
                    value={customAssetName}
                    onChange={(e) => setCustomAssetName(e.target.value)}
                    placeholder="مثال: مكيف سبليت مكتب ياقوت"
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">بادئة الرمز</label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">عدد الملصقات التسلسلية</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={labelCount}
                  onChange={(e) => setLabelCount(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">يبدأ من رقم التسلسل</label>
                <input
                  type="number"
                  min={1}
                  value={labelStartSeq}
                  onChange={(e) => setLabelStartSeq(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">الموقع / المكتب / الغرفة المطبوعة على الملصق</label>
              <input
                list="wms-label-locations"
                value={labelLocation}
                onChange={(e) => setLabelLocation(e.target.value)}
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
              <datalist id="wms-label-locations">
                {locationTags.map((l) => (
                  <option key={l.code} value={l.nameAr} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">اسم المسؤول / صاحب العهدة (اختياري)</label>
              <input
                type="text"
                value={labelAssignee}
                onChange={(e) => setLabelAssignee(e.target.value)}
                placeholder="مثال: حاتم سلمان أو مشرفة السكن"
                className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLabelPrintFormat('thermal_50x25')}
                className={`flex-1 py-2 rounded-full text-[11px] font-bold ${
                  labelPrintFormat === 'thermal_50x25' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                طابعة حرارية 50×30mm (Zebra/Xprinter)
              </button>
              <button
                type="button"
                onClick={() => setLabelPrintFormat('a4_grid')}
                className={`flex-1 py-2 rounded-full text-[11px] font-bold ${
                  labelPrintFormat === 'a4_grid' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                ورقة A4 شبكية (24 ملصق)
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={registerSerials}
                onChange={(e) => setRegisterSerials(e.target.checked)}
              />
              <span>تسجيل الأرقام التسلسلية تلقائياً في النظام لقراءتها فوراً بالمسح</span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-[#262626]"
            >
              توليد الملصقات التسلسلية القابلة للمسح
            </button>
          </form>

          {/* Live Scannable Label Sheet Preview */}
          <div className="lg:col-span-7 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#141414]">
                  معاينة الملصقات الحقيقية القابلة للمسح الضوئي ({generatedLabels.length})
                </h3>
                <p className="text-[11px] text-[#707070]">باركود خطي ISO Code-128B + رمز QR فعلي قابل للقراءة بأي جهاز</p>
              </div>
              {generatedLabels.length > 0 && (
                <button
                  type="button"
                  onClick={() => printLabelsSheet(generatedLabels, labelPrintFormat)}
                  className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الملصقات ({generatedLabels.length})</span>
                </button>
              )}
            </div>

            {generatedLabels.length === 0 ? (
              <div className="p-10 text-center bg-[#f3f3f3] rounded-[18px] text-xs text-[#707070]">
                اختر الصنف أو الجهاز الخارجي واضغط <strong>«توليد الملصقات التسلسلية»</strong> لمعاينتها وطباعتها فوراً.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto">
                {generatedLabels.slice(0, 24).map((lbl) => (
                  <div
                    key={lbl.barcodeValue}
                    className="p-3 rounded-[14px] border border-[#141414] bg-[#ffffff] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-[#707070]">KAS WMS • شركة كاس</div>
                        <div className="text-xs font-bold text-[#141414]">{lbl.titleAr}</div>
                        <div className="text-[10px] text-[#707070]">{lbl.locationLabel}</div>
                      </div>
                      <div
                        className="shrink-0"
                        dangerouslySetInnerHTML={{
                          __html: generateRealQrSvg(lbl.qrPayload, { sizePx: 46, borderStyle: false }),
                        }}
                      />
                    </div>
                    <div
                      className="flex justify-center"
                      dangerouslySetInnerHTML={{
                        __html: generateRealCode128BarcodeSvg(lbl.barcodeValue, {
                          widthPx: 200,
                          heightPx: 36,
                        }),
                      }}
                    />
                    <div className="text-center font-mono text-[11px] font-bold tracking-wider text-[#141414]">
                      {lbl.barcodeValue}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: LOCATION / OFFICE / HOUSING ROOM BARCODE TAGS             */}
      {/* ==================================================================== */}
      {section === 'locations' && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newRoomName.trim()) return;
              const added = wmsScannerAndBarcodeService.addCustomLocationTag(newRoomName, newRoomGroup);
              setNewRoomName('');
              setLocTagsTick((t) => t + 1);
              onNotify('تمت إضافة ملصق موقع/غرفة', `تم إنشاء رمز الموقع (${added.code}) — ${added.nameAr}`, 'success');
            }}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold text-[#141414] mb-1">إضافة غرفة سكن أو مكتب أو سيارة جديدة لطباعة باركودها</label>
              <input
                type="text"
                required
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="مثال: سكن العاملات — غرفة 204 أو سيارة تويوتا هايace 01"
                className="w-full rounded-full bg-[#f0f0f0] px-4 py-2 text-xs"
              />
            </div>
            <select
              value={newRoomGroup}
              onChange={(e) => setNewRoomGroup(e.target.value as WmsLocationTag['group'])}
              className="rounded-full bg-[#f0f0f0] px-4 py-2 text-xs font-bold"
            >
              <option value="مراكز السكن والغرف">مراكز السكن والغرف</option>
              <option value="مكاتب الشركات">مكاتب الشركات</option>
              <option value="مستودعات ورفوف">مستودعات ورفوف</option>
              <option value="مرافق ومشاريع">مرافق ومشاريع</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة موقع</span>
            </button>
            {selectedLocLabels.length > 0 && (
              <button
                type="button"
                onClick={() => printLabelsSheet(selectedLocLabels, 'a4_grid')}
                className="px-4 py-2 rounded-full border-2 border-[#141414] text-[#141414] text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المختار ({selectedLocLabels.length})</span>
              </button>
            )}
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locationTags.map((loc) => {
              const isSelected = selectedLocLabels.some((s) => s.barcodeValue === loc.code);
              const asLabel: PrintableSerialLabel = {
                barcodeValue: loc.code,
                qrPayload: `KAS-WMS|${loc.code}|${loc.nameAr}|${loc.group}`,
                titleAr: loc.nameAr,
                subtitleAr: loc.group,
                locationLabel: loc.costCenterCode || loc.group,
                tagKind: 'LOCATION_TAG',
              };
              return (
                <div
                  key={loc.code}
                  className={`bg-[#ffffff] border rounded-[18px] p-4 space-y-2.5 ${
                    isSelected ? 'border-2 border-[#141414]' : 'border-[#e0e0e0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#707070]">
                        {loc.group}
                      </span>
                      <div className="text-xs font-bold text-[#141414] mt-1">{loc.nameAr}</div>
                      <div className="font-mono text-[11px] text-[#707070]">{loc.code}</div>
                    </div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateRealQrSvg(asLabel.qrPayload, { sizePx: 44, borderStyle: false }),
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedLocLabels((prev) =>
                          isSelected ? prev.filter((x) => x.barcodeValue !== loc.code) : [...prev, asLabel]
                        )
                      }
                      className="text-[11px] font-bold text-[#141414] underline"
                    >
                      {isSelected ? 'إزالة من التحديد' : 'تحديد للطباعة الجماعية'}
                    </button>
                    <button
                      type="button"
                      onClick={() => printLabelsSheet([asLabel], 'thermal_50x25')}
                      className="px-3 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold inline-flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>طباعة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
