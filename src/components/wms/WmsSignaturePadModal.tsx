import React, { useEffect, useRef, useState } from 'react';
import { X, PenTool, RotateCcw, CheckCircle2 } from 'lucide-react';
import { WmsStockVoucher } from '../../types/wms';

export const WmsSignaturePadModal: React.FC<{
  voucher: WmsStockVoucher | null;
  onClose: () => void;
  onSaveSignature: (voucherId: string, signatureDataUrl: string, signerName: string) => void;
}> = ({ voucher, onClose, onSaveSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signerName, setSignerName] = useState('');

  useEffect(() => {
    if (!voucher) return;
    setSignerName(voucher.handoverSignerName || voucher.recipientName || '');
    setHasStrokes(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [voucher]);

  if (!voucher) return null;

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasStrokes(true);
  };

  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(voucher.id, dataUrl, signerName.trim() || 'المستلم');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#141414] text-white flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#141414]">التوقيع الإلكتروني على استلام/تسليم السند</h3>
              <p className="text-xs text-[#707070] font-mono">
                {voucher.voucherNo} • {voucher.beneficiaryEntity || voucher.supplierName || 'المستودع المركزي'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#141414] mb-1">اسم المستلم الموقّع *</label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="اكتب اسم المستلم الثلاثي"
            className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-semibold text-[#141414]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#141414]">وقّع هنا بالإصبع أو الماوس:</span>
            <button
              type="button"
              onClick={clearCanvas}
              className="px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-bold text-[#141414] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>مسح التوقيع</span>
            </button>
          </div>
          <div className="border-2 border-dashed border-[#141414] rounded-[18px] overflow-hidden bg-[#ffffff] touch-none">
            <canvas
              ref={canvasRef}
              width={520}
              height={180}
              className="w-full h-44 cursor-crosshair block"
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414]"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!hasStrokes}
            onClick={handleSave}
            className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>اعتماد التوقيع وإدراجه في السند PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
