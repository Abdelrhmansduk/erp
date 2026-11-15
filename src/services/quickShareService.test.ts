import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildEntityShareText,
  generateQuickSharePdfFile,
  shareViaWhatsApp,
  shareViaWhatsAppWithPdf,
} from './quickShareService';

describe('WhatsApp Official File (PDF) + Text Sharing Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a valid application/pdf File and includes the PDF attachment reference in the formatted WhatsApp text', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const payload = {
      title: 'قسيمة راتب شهر نوفمبر 2026',
      recipientName: 'فهد الشمري',
      recipientPhone: '0551234567',
      referenceNumber: 'WPS-SAF-2026-104',
      entityCode: 'SAF',
      moduleName: 'wps_payslip',
      summaryLines: [
        { label: 'صافي الراتب المستحق', value: '⃁ 10,500.00' },
        { label: 'حالة الصرف', value: 'معتمد عبر نظام حماية الأجور' },
      ],
    };

    const result = await shareViaWhatsAppWithPdf(payload);

    expect(result.file).toBeInstanceOf(File);
    expect(result.file?.type).toBe('application/pdf');
    expect(result.file?.name.endsWith('.pdf')).toBe(true);
    expect((result.file?.size ?? 0) > 0).toBe(true);

    // Formatted WhatsApp text includes title, summary, AND explicit PDF attachment name
    expect(result.text).toContain('قسيمة راتب شهر نوفمبر 2026');
    expect(result.text).toContain('⃁ 10,500.00');
    expect(result.text).toContain(`📎 المرفق الرسمي (PDF): ${result.fileName}`);

    // Normalized Saudi phone (+966551234567) in wa.me URL
    expect(result.waUrl).toContain('https://wa.me/966551234567?text=');
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('preserves custom attached File (e.g. user-selected PDF/Excel) alongside text when provided', async () => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    const customPdf = new File(['%PDF-1.4 custom content'], 'عقد_مساند_موثق.pdf', {
      type: 'application/pdf',
    });

    const result = await shareViaWhatsAppWithPdf({
      title: 'إرسال عقد الاستقدام المعتمد',
      recipientName: 'سارة أحمد',
      recipientPhone: '+966558025628',
      attachmentFile: customPdf,
      bodyText: 'مرفق لكم نسخة العقد المعتمد من منصة مساند.',
    });

    expect(result.file).toBe(customPdf);
    expect(result.fileName).toBe('عقد_مساند_موثق.pdf');
    expect(result.text).toContain('📎 المرفق الرسمي (PDF): عقد_مساند_موثق.pdf');
    expect(result.text).toContain('مرفق لكم نسخة العقد المعتمد من منصة مساند.');
  });

  it('uses Web Share API Level 2 (navigator.share with files + text) natively when preferNativeFileShare is enabled and supported', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: canShareMock,
      configurable: true,
      writable: true,
    });

    const result = await shareViaWhatsAppWithPdf({
      title: 'خطاب تعريف بالراتب',
      recipientName: 'نواف العتيبي',
      referenceNumber: 'HR-SAF-991',
      preferNativeFileShare: true,
    });

    expect(result.sharedNatively).toBe(true);
    expect(canShareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledTimes(1);

    const sharedArg = shareMock.mock.calls[0][0];
    expect(Array.isArray(sharedArg.files)).toBe(true);
    expect(sharedArg.files[0]).toBeInstanceOf(File);
    expect(sharedArg.files[0].type).toBe('application/pdf');
    expect(sharedArg.text).toContain('خطاب تعريف بالراتب');
  });

  it('keeps synchronous shareViaWhatsApp return URL compatible while generating PDF in parallel', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const pdfFile = await generateQuickSharePdfFile({
      title: 'سند قبض مالي',
      referenceNumber: 'RV-2026-77',
    });
    expect(pdfFile.name).toContain('RV-2026-77');

    const waUrl = shareViaWhatsApp({
      title: 'سند قبض مالي',
      recipientPhone: '0501112233',
      referenceNumber: 'RV-2026-77',
    });

    expect(waUrl).toContain('https://wa.me/966501112233?text=');
    expect(decodeURIComponent(waUrl)).toContain('📎 المرفق الرسمي (PDF):');
    expect(openSpy).toHaveBeenCalledTimes(1);

    // Plain buildEntityShareText without attachment remains clean for email/copy
    const plain = buildEntityShareText({ title: 'تقرير داخلي' });
    expect(plain.body).not.toContain('📎 المرفق الرسمي');
  });
});
