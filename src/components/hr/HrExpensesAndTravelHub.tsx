import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Receipt,
  Plane,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  MapPin,
  QrCode,
  Upload,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import { WpsPayrollEngine } from '../../services/wpsPayrollEngine';
import { journalEngine } from '../../services/accounting/journalEngine';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import {
  decodeZatcaQrTlvBase64,
  computeReceiptFingerprint,
  type DecodedZatcaReceiptQr,
} from '../../services/jisrAdvancedComplianceEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import { Badge } from '../ui/Badge';

interface DetectedBarcodeItem {
  rawValue?: string;
}

interface BrowserBarcodeDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcodeItem[]>;
}

interface BrowserBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BrowserBarcodeDetector;
}

export interface ExpenseClaimRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  department?: string;
  cost_center_code?: string;
  category: 'عهدة تشغيلية' | 'وقود ومواصلات' | 'ضيافة واجتماعات' | 'رسوم حكومية' | 'مشتريات مكتبية';
  merchant_name: string;
  supplier_vat_number?: string;
  invoice_timestamp?: string;
  tax_invoice_number: string;
  subtotal_amount?: number;
  amount_excl_vat: number;
  vat_amount: number;
  total_amount: number;
  receipt_fingerprint?: string;
  zatca_qr_verified?: boolean;
  zatca_phase2_signed?: boolean;
  receipt_file_name?: string;
  payout_channel: 'BANK_TRANSFER' | 'NEXT_PAYROLL' | 'PETTY_CASH_SETTLEMENT';
  payout_method?: string;
  gl_journal_ref?: string;
  status: 'بانتظار الاعتماد' | 'معتمد ومرحل' | 'مرفوض';
  created_at: string;
}

export interface BusinessTripRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  grade: string;
  destination: string;
  destination_city?: string;
  trip_scope: 'DOMESTIC' | 'INTERNATIONAL';
  from_date: string;
  start_date?: string;
  to_date: string;
  nights_count: number;
  per_diem_daily: number;
  daily_per_diem?: number;
  per_diem_total: number;
  ticket_cost: number;
  estimated_ticket_cost?: number;
  total_allowance: number;
  total_trip_allowance?: number;
  requires_exit_reentry: boolean;
  status: 'بانتظار الاعتماد' | 'معتمد ومصروف' | 'مرفوض';
  created_at: string;
}

interface HrExpensesAndTravelHubProps {
  employees: Array<{
    id: string;
    employee_code: string;
    name: string;
    national_id: string;
    grade?: string;
    department: string;
  }>;
  companyCode: string;
  companyName: string;
}

function extractBase64TlvCandidate(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';
  const directCheck = decodeZatcaQrTlvBase64(trimmed);
  if (directCheck.valid) return trimmed;

  const tokens = trimmed.split(/[\s"'<>|,;]+/).filter((t) => t.length >= 20);
  for (const token of tokens) {
    if (/^[A-Za-z0-9+/=]+$/.test(token)) {
      const check = decodeZatcaQrTlvBase64(token);
      if (check.valid) return token;
    }
  }
  return trimmed;
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = dataUrl;
  });
}

export const HrExpensesAndTravelHub: React.FC<HrExpensesAndTravelHubProps> = ({
  employees,
  companyCode,
  companyName,
}) => {
  const [subTab, setSubTab] = useState<'EXPENSES' | 'TRAVEL'>('EXPENSES');
  const [expenses, setExpenses] = useState<ExpenseClaimRecord[]>([]);
  const [trips, setTrips] = useState<BusinessTripRecord[]>([]);

  // Expense Claim & ZATCA TLV Receipt Reader Form State
  const [expEmpId, setExpEmpId] = useState<string>(employees[0]?.id || '');
  const [expCategory, setExpCategory] =
    useState<ExpenseClaimRecord['category']>('عهدة تشغيلية');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierVatNumber, setSupplierVatNumber] = useState<string>('');
  const [invoiceTimestamp, setInvoiceTimestamp] = useState<string>(() =>
    new Date().toISOString().slice(0, 19)
  );
  const [taxInvoiceNo, setTaxInvoiceNo] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [exactDecodedVat, setExactDecodedVat] = useState<number | null>(null);
  const [hasZatcaVat, setHasZatcaVat] = useState<boolean>(true);
  const [payoutChannel, setPayoutChannel] =
    useState<ExpenseClaimRecord['payout_channel']>('BANK_TRANSFER');

  // ZATCA Receipt Upload & TLV Decoder State
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);
  const [zatcaQrRaw, setZatcaQrRaw] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [decodedQrState, setDecodedQrState] = useState<DecodedZatcaReceiptQr | null>(null);
  const [readerStatusMessage, setReaderStatusMessage] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);

  // Business Trip Form State
  const [tripEmpId, setTripEmpId] = useState<string>(employees[0]?.id || '');
  const [destination, setDestination] = useState<string>('جدة — زيارة الفروع والمراكز');
  const [tripScope, setTripScope] = useState<'DOMESTIC' | 'INTERNATIONAL'>('DOMESTIC');
  const [fromDate, setFromDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [nightsCount, setNightsCount] = useState<number>(3);
  const [ticketCost, setTicketCost] = useState<number>(950);

  const effectiveCompanyId = companyCode === 'ALL' || companyCode === 'all' ? 'SAF' : companyCode;

  useEffect(() => {
    if (!expEmpId && employees.length > 0) {
      setExpEmpId(employees[0].id);
    }
    if (!tripEmpId && employees.length > 0) {
      setTripEmpId(employees[0].id);
    }
  }, [employees, expEmpId, tripEmpId]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      realErpDataStore.getRecords<ExpenseClaimRecord>('hr_expense_claims', []),
      realErpDataStore.getRecords<BusinessTripRecord>('hr_business_trips', []),
    ]).then(([expRows, tripRows]) => {
      if (!mounted) return;
      setExpenses(Array.isArray(expRows) ? expRows : []);
      setTrips(Array.isArray(tripRows) ? tripRows : []);
    });
    return () => {
      mounted = false;
    };
  }, [companyCode]);

  const vatBreakdown = useMemo(() => {
    const gross = Math.max(0, Number(amount) || 0);
    if (!hasZatcaVat) {
      return { net: gross, vat: 0, gross };
    }
    if (exactDecodedVat !== null && exactDecodedVat >= 0 && exactDecodedVat <= gross) {
      const vat = Number(exactDecodedVat.toFixed(2));
      const net = Number(Math.max(0, gross - vat).toFixed(2));
      return { net, vat, gross };
    }
    const net = Number((gross / 1.15).toFixed(2));
    const vat = Number((gross - net).toFixed(2));
    return { net, vat, gross };
  }, [amount, exactDecodedVat, hasZatcaVat]);

  const receiptFingerprint = useMemo(() => {
    if (decodedQrState?.valid && decodedQrState.receiptFingerprint) {
      return decodedQrState.receiptFingerprint;
    }
    const vatKey = supplierVatNumber.trim() || taxInvoiceNo.trim();
    if (!vatKey || vatBreakdown.gross <= 0) {
      return '';
    }
    return computeReceiptFingerprint(
      vatKey,
      invoiceTimestamp.trim() || new Date().toISOString().slice(0, 19),
      vatBreakdown.gross
    );
  }, [decodedQrState, supplierVatNumber, taxInvoiceNo, invoiceTimestamp, vatBreakdown.gross]);

  const duplicateExistingClaim = useMemo(() => {
    if (!receiptFingerprint) return null;
    return (
      expenses.find(
        (item) =>
          Boolean(item.receipt_fingerprint) && item.receipt_fingerprint === receiptFingerprint
      ) || null
    );
  }, [expenses, receiptFingerprint]);

  const selectedTripEmp = useMemo(
    () => employees.find((e) => e.id === tripEmpId) || employees[0],
    [employees, tripEmpId]
  );

  const perDiemCalc = useMemo(
    () =>
      WpsPayrollEngine.calculateBusinessTripPerDiem({
        grade: selectedTripEmp?.grade || 'الدرجة الثالثة',
        tripScope,
        nightsCount,
        estimatedTicketCost: ticketCost,
      }),
    [selectedTripEmp, tripScope, nightsCount, ticketCost]
  );

  const applyDecodedZatcaPayload = (rawPayload: string, sourceLabel: string): boolean => {
    const candidate = extractBase64TlvCandidate(rawPayload);
    const decoded = decodeZatcaQrTlvBase64(candidate);
    setDecodedQrState(decoded);

    if (!decoded.valid) {
      setReaderStatusMessage(
        decoded.errorAr || 'تعذر قراءة حقول الفاتورة الضريبية المرمزة بصيغة ZATCA TLV.'
      );
      return false;
    }

    setZatcaQrRaw(candidate);
    setSupplierName(decoded.sellerName);
    setSupplierVatNumber(decoded.vatRegistrationNumber);
    if (decoded.invoiceTimestamp) {
      setInvoiceTimestamp(decoded.invoiceTimestamp);
    }
    setAmount(decoded.totalWithVat);
    setExactDecodedVat(decoded.vatAmount);
    setHasZatcaVat(decoded.vatAmount > 0);
    if (!taxInvoiceNo.trim()) {
      setTaxInvoiceNo(`ZATCA-${decoded.receiptFingerprint.replace('ZATCA-FP-', '')}`);
    }

    const existingDup = expenses.find(
      (x) => x.receipt_fingerprint && x.receipt_fingerprint === decoded.receiptFingerprint
    );

    if (existingDup) {
      const dupMsg = `تحذير رقابي: هذه الفاتورة مسجلة مسبقاً بالبصمة (${decoded.receiptFingerprint}) ضمن المطالبة (${existingDup.id}) للموظف ${existingDup.employee_name}.`;
      setReaderStatusMessage(dupMsg);
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'critical',
        companyId: effectiveCompanyId,
        title: 'رصد فاتورة ضريبية مكررة (ZATCA Duplicate Guard)',
        message: dupMsg,
      });
    } else {
      const okMsg = `تم استخلاص بيانات فاتورة ZATCA بنجاح عبر (${sourceLabel}): ${decoded.sellerName} | الرقم الضريبي ${decoded.vatRegistrationNumber} | الإجمالي ⃁ ${decoded.totalWithVat.toLocaleString()} (ضريبة ⃁ ${decoded.vatAmount.toLocaleString()}).`;
      setReaderStatusMessage(okMsg);
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'تم التحقق من فاتورة ZATCA الضريبية',
        message: okMsg,
      });
    }
    return true;
  };

  const handleQrInputChange = (nextValue: string) => {
    setZatcaQrRaw(nextValue);
    if (!nextValue.trim()) {
      setDecodedQrState(null);
      setExactDecodedVat(null);
      setReaderStatusMessage(null);
      return;
    }
    if (nextValue.trim().length >= 24) {
      applyDecodedZatcaPayload(nextValue, 'قارئ الباركود النصي TLV');
    }
  };

  const handleReceiptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFileName(file.name);
    setIsScanningReceipt(true);
    setReaderStatusMessage(`جارٍ فحص مستند الإيصال (${file.name}) واستخلاص رمز ZATCA QR...`);

    const isImageFile =
      file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name);

    if (isImageFile) {
      const imgReader = new FileReader();
      imgReader.onload = async () => {
        try {
          const dataUrl = typeof imgReader.result === 'string' ? imgReader.result : '';
          const BarcodeDetectorCtor =
            typeof window !== 'undefined'
              ? (
                  window as unknown as {
                    BarcodeDetector?: BrowserBarcodeDetectorConstructor;
                  }
                ).BarcodeDetector
              : undefined;

          if (!BarcodeDetectorCtor) {
            setReaderStatusMessage(
              `تم إرفاق صورة الفاتورة (${file.name}). المتصفح الحالي لا يدعم محرك BarcodeDetector الأصلي للصور؛ يمكنك مسح رمز QR بقارئ الباركود أو لصق سلسلة Base64 TLV في الحقل أدناه.`
            );
            setIsScanningReceipt(false);
            return;
          }

          const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
          let barcodes: DetectedBarcodeItem[] = [];

          if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(file);
            try {
              barcodes = await detector.detect(bitmap);
            } finally {
              if (typeof bitmap.close === 'function') {
                bitmap.close();
              }
            }
          } else if (dataUrl) {
            const imgEl = await loadImageElement(dataUrl);
            barcodes = await detector.detect(imgEl);
          }

          const qrRaw = barcodes.find((b) => b.rawValue && b.rawValue.trim().length > 0)?.rawValue;
          if (qrRaw) {
            applyDecodedZatcaPayload(qrRaw, `مسح ضوئي من الصورة ${file.name}`);
          } else {
            setReaderStatusMessage(
              `تم إرفاق صورة الإيصال (${file.name})، ولم يُعثر على رمز QR واضح داخل الصورة. يرجى التأكد من وضوح الباركود أو إدخال رمز ZATCA TLV مباشرة.`
            );
          }
        } catch {
          setReaderStatusMessage(
            `تم إرفاق المستند (${file.name}). تعذر استخلاص رمز QR آلياً من الصورة؛ يمكنك لصق رمز ZATCA Base64 TLV أو استكمال بيانات الفاتورة الضريبية.`
          );
        } finally {
          setIsScanningReceipt(false);
        }
      };
      imgReader.onerror = () => {
        setIsScanningReceipt(false);
        setReaderStatusMessage(`تعذر قراءة الملف المرفق (${file.name}).`);
      };
      imgReader.readAsDataURL(file);
      return;
    }

    // PDF or Text receipt upload via FileReader
    const textReader = new FileReader();
    textReader.onload = () => {
      const content = typeof textReader.result === 'string' ? textReader.result : '';
      const candidate = extractBase64TlvCandidate(content);
      if (candidate && decodeZatcaQrTlvBase64(candidate).valid) {
        applyDecodedZatcaPayload(candidate, `ملف الإيصال ${file.name}`);
      } else {
        setReaderStatusMessage(
          `تم إرفاق مستند الفاتورة (${file.name}). الصق سلسلة رمز ZATCA TLV Base64 للتحقق التلقائي أو أدخل الرقم الضريبي المكون من 15 رقماً.`
        );
      }
      setIsScanningReceipt(false);
    };
    textReader.onerror = () => {
      setIsScanningReceipt(false);
      setReaderStatusMessage(`تعذر قراءة الملف المرفق (${file.name}).`);
    };
    textReader.readAsText(file, 'UTF-8');
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === expEmpId) || employees[0];
    if (!emp || vatBreakdown.gross <= 0) {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'بيانات المطالبة غير مكتملة',
        message: 'يرجى اختيار الموظف وإدخال قيمة الفاتورة الضريبية شاملة الضريبة.',
      });
      return;
    }

    const cleanVatNo = supplierVatNumber.trim();
    if (hasZatcaVat && cleanVatNo && !/^\d{15}$/.test(cleanVatNo)) {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'الرقم الضريبي للمورد غير صالح',
        message: 'يجب أن يتكون الرقم الضريبي للمورد في فواتير ZATCA من 15 رقماً.',
      });
      return;
    }

    const effectiveFingerprint =
      receiptFingerprint ||
      computeReceiptFingerprint(
        cleanVatNo || taxInvoiceNo.trim() || supplierName.trim() || 'MERCHANT',
        invoiceTimestamp.trim() || new Date().toISOString().slice(0, 19),
        vatBreakdown.gross
      );

    // Check against both in-memory state and persistent realErpDataStore to guarantee duplicate blocking
    const latestStoredClaims = await realErpDataStore.getRecords<ExpenseClaimRecord>(
      'hr_expense_claims',
      []
    );
    const combinedClaims = [...expenses, ...latestStoredClaims];
    const duplicateMatch = combinedClaims.find(
      (item) =>
        Boolean(item.receipt_fingerprint) && item.receipt_fingerprint === effectiveFingerprint
    );

    if (duplicateMatch) {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'critical',
        companyId: effectiveCompanyId,
        title: 'تم حظر المطالبة — فاتورة ضريبية مكررة',
        message: `الفاتورة ذات البصمة (${effectiveFingerprint}) مسجلة مسبقاً برقم (${duplicateMatch.id}) للموظف ${duplicateMatch.employee_name} بقيمة ⃁ ${duplicateMatch.total_amount.toLocaleString()}.`,
      });
      return;
    }

    const rec: ExpenseClaimRecord = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      employee_id: emp.id,
      employee_name: emp.name,
      department: emp.department,
      cost_center_code: 'CC-HQ-ADM',
      category: expCategory,
      merchant_name: supplierName.trim() || 'مورد معتمد',
      supplier_vat_number: cleanVatNo || undefined,
      invoice_timestamp: invoiceTimestamp.trim() || new Date().toISOString().slice(0, 19),
      tax_invoice_number:
        taxInvoiceNo.trim() || `INV-${effectiveFingerprint.replace('ZATCA-FP-', '')}`,
      subtotal_amount: vatBreakdown.net,
      amount_excl_vat: vatBreakdown.net,
      vat_amount: vatBreakdown.vat,
      total_amount: vatBreakdown.gross,
      receipt_fingerprint: effectiveFingerprint,
      zatca_qr_verified: Boolean(decodedQrState?.valid),
      zatca_phase2_signed: Boolean(decodedQrState?.isPhase2Signed),
      receipt_file_name: receiptFileName || undefined,
      payout_channel: payoutChannel,
      payout_method: payoutChannel,
      status: 'بانتظار الاعتماد',
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_expense_claims', rec);
    setExpenses((prev) => [rec, ...prev]);

    // Reset transient receipt fields so next receipt starts clean
    setZatcaQrRaw('');
    setDecodedQrState(null);
    setExactDecodedVat(null);
    setReceiptFileName('');
    setTaxInvoiceNo('');
    if (receiptFileInputRef.current) {
      receiptFileInputRef.current.value = '';
    }

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم تسجيل مطالبة المصروفات وتوثيق بصمة ZATCA',
      message: `تم قيد المطالبة (${rec.id}) للموظف ${emp.name} بمبلغ ⃁ ${rec.total_amount.toLocaleString()} (ضريبة مدخلات ⃁ ${rec.vat_amount.toLocaleString()}) — البصمة: ${effectiveFingerprint}.`,
    });
  };

  const handleApproveAndPostExpense = async (claim: ExpenseClaimRecord) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const jvRef = `JV-EXP-${claim.id}`;

    const creditAccount =
      claim.payout_channel === 'NEXT_PAYROLL'
        ? { code: '210201', name: 'الرواتب والأجور المستحقة (تعويض مع مسير الرواتب)' }
        : claim.payout_channel === 'PETTY_CASH_SETTLEMENT'
        ? { code: '110102', name: 'عهد الفروع النقدية' }
        : { code: '110201', name: 'مصرف الراجحي - الحساب التشغيلي الرئيسي' };

    const lines = [
      {
        accountCode: '530202',
        accountName: 'المصروفات الإدارية والمهنية والتشغيلية',
        debit: claim.amount_excl_vat,
        credit: 0,
        costCenterCode: claim.cost_center_code || 'CC-HQ-ADM',
        description: `${claim.category} — ${claim.merchant_name} (${claim.employee_name})`,
      },
    ];

    if (claim.vat_amount > 0) {
      lines.push({
        accountCode: '110801',
        accountName: 'ضريبة القيمة المضافة للمدخلات القابلة للاسترداد (15%)',
        debit: claim.vat_amount,
        credit: 0,
        costCenterCode: claim.cost_center_code || 'CC-HQ-ADM',
        description: `ضريبة فاتورة مورد رقم ${claim.tax_invoice_number}${
          claim.supplier_vat_number ? ` — الرقم الضريبي ${claim.supplier_vat_number}` : ''
        }`,
      });
    }

    lines.push({
      accountCode: creditAccount.code,
      accountName: creditAccount.name,
      debit: 0,
      credit: claim.total_amount,
      costCenterCode: claim.cost_center_code || 'CC-HQ-ADM',
      description: `سداد تسوية مصروفات الموظف ${claim.employee_name}`,
    });

    try {
      journalEngine.createJournalEntry(
        effectiveCompanyId as Parameters<typeof journalEngine.createJournalEntry>[0],
        {
          entryDate: todayIso,
          entryType: 'AUTOMATIC',
          sourceModule: 'HR_PAYROLL',
          sourceReference: jvRef,
          description: `تسوية مصروفات موظف (${claim.id}) — ${claim.employee_name}`,
          createdBy: 'الإدارة المالية والموارد البشرية',
          autoPost: true,
          lines,
        }
      );
    } catch {
      // Continues to store update
    }

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-exp-${Date.now()}`,
      company_id: effectiveCompanyId,
      ref_no: jvRef,
      date: todayIso,
      branch: 'المركز المالي الرئيسي',
      description: `قيد تسوية مصروفات وعهدة (${claim.id}) — ${claim.employee_name}`,
      total_debit: claim.total_amount,
      total_credit: claim.total_amount,
      status: 'معتمد',
      created_at: new Date().toISOString(),
    });

    await realErpDataStore.updateRecord<ExpenseClaimRecord>('hr_expense_claims', claim.id, {
      status: 'معتمد ومرحل',
      gl_journal_ref: jvRef,
    });

    setExpenses((prev) =>
      prev.map((x) =>
        x.id === claim.id ? { ...x, status: 'معتمد ومرحل', gl_journal_ref: jvRef } : x
      )
    );

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'اعتماد المصروف وترحيل قيد الأستاذ العام (GL)',
      message: `تم اعتماد المطالبة (${claim.id}) للموظف ${claim.employee_name} وترحيل القيد (${jvRef}) بمبلغ ⃁ ${claim.total_amount.toLocaleString()} وفصل ضريبة المدخلات ⃁ ${claim.vat_amount.toLocaleString()}.`,
    });
  };

  const handleRejectExpense = async (claim: ExpenseClaimRecord) => {
    await realErpDataStore.updateRecord<ExpenseClaimRecord>('hr_expense_claims', claim.id, {
      status: 'مرفوض',
    });
    setExpenses((prev) =>
      prev.map((x) => (x.id === claim.id ? { ...x, status: 'مرفوض' } : x))
    );
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'رفض مطالبة المصروفات',
      message: `تم رفض مطالبة المصروفات رقم (${claim.id}) الخاصة بالموظف ${claim.employee_name}.`,
    });
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripEmp) return;

    const endDt = new Date(Date.parse(fromDate) + nightsCount * 86400000)
      .toISOString()
      .slice(0, 10);
    const isNonSaudi = String(selectedTripEmp.national_id || '').trim().startsWith('2');
    const cleanDestination = destination.trim() || 'مهمة عمل رسمية';

    const newTrip: BusinessTripRecord = {
      id: `TRP-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      employee_id: selectedTripEmp.id,
      employee_name: selectedTripEmp.name,
      grade: selectedTripEmp.grade || 'الدرجة الثالثة',
      destination: cleanDestination,
      destination_city: cleanDestination,
      trip_scope: tripScope,
      from_date: fromDate,
      start_date: fromDate,
      to_date: endDt,
      nights_count: nightsCount,
      per_diem_daily: perDiemCalc.dailyPerDiem,
      daily_per_diem: perDiemCalc.dailyPerDiem,
      per_diem_total: perDiemCalc.perDiemTotal,
      ticket_cost: perDiemCalc.estimatedTicketCost,
      estimated_ticket_cost: perDiemCalc.estimatedTicketCost,
      total_allowance: perDiemCalc.totalTripAllowance,
      total_trip_allowance: perDiemCalc.totalTripAllowance,
      requires_exit_reentry: tripScope === 'INTERNATIONAL' && isNonSaudi,
      status: 'بانتظار الاعتماد',
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_business_trips', newTrip);
    setTrips((prev) => [newTrip, ...prev]);

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم تسجيل أمر انتداب ورحلة عمل',
      message: `تم قيد طلب الانتداب (${newTrip.id}) للموظف ${newTrip.employee_name} بإجمالي مخصص ⃁ ${newTrip.total_allowance.toLocaleString()} (${nightsCount} ليالٍ × ⃁ ${newTrip.per_diem_daily}).`,
    });
  };

  const handleApproveTrip = async (trip: BusinessTripRecord) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const jvRef = `JV-TRP-${trip.id}`;

    try {
      journalEngine.createJournalEntry(
        effectiveCompanyId as Parameters<typeof journalEngine.createJournalEntry>[0],
        {
          entryDate: todayIso,
          entryType: 'AUTOMATIC',
          sourceModule: 'HR_PAYROLL',
          sourceReference: jvRef,
          description: `صرف بدل انتداب وتذاكر مهمة عمل (${trip.destination}) للموظف ${trip.employee_name}`,
          createdBy: 'إدارة الموارد البشرية والمالية',
          autoPost: true,
          lines: [
            {
              accountCode: '510102',
              accountName: 'رسوم التأشيرات وتذاكر الطيران وبدلات الانتداب',
              debit: trip.total_allowance,
              credit: 0,
              costCenterCode: 'CC-OPS-RYD',
              description: `انتداب ${trip.nights_count} ليالٍ إلى ${trip.destination}`,
            },
            {
              accountCode: '110201',
              accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي',
              debit: 0,
              credit: trip.total_allowance,
              costCenterCode: 'CC-OPS-RYD',
              description: `صرف مخصص انتداب الموظف ${trip.employee_name}`,
            },
          ],
        }
      );
    } catch {
      // Continues below
    }

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-trp-${Date.now()}`,
      company_id: effectiveCompanyId,
      ref_no: jvRef,
      date: todayIso,
      branch: 'المركز المالي الرئيسي',
      description: `قيد صرف مخصص انتداب ورحلة عمل (${trip.id}) — ${trip.employee_name}`,
      total_debit: trip.total_allowance,
      total_credit: trip.total_allowance,
      status: 'معتمد',
      created_at: new Date().toISOString(),
    });

    await realErpDataStore.updateRecord<BusinessTripRecord>('hr_business_trips', trip.id, {
      status: 'معتمد ومصروف',
    });
    setTrips((prev) =>
      prev.map((t) => (t.id === trip.id ? { ...t, status: 'معتمد ومصروف' } : t))
    );

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'اعتماد وصرف بدل الانتداب وتذاكر السفر',
      message: `تم اعتماد رحلة العمل (${trip.id}) للموظف ${trip.employee_name} بمبلغ ⃁ ${trip.total_allowance.toLocaleString()} وترحيل القيد (${jvRef}).`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#262626] text-xs font-bold text-[#ffffff] mb-2">
            <Receipt className="w-3.5 h-3.5" />
            <span>إدارة النفقات، فواتير ZATCA الضريبية، والانتدابات</span>
          </div>
          <h3 className="text-lg font-bold text-[#ffffff] m-0">
            قارئ الفواتير الضريبية (ZATCA TLV QR) ومنع الصرف المكرر وتسوية العهد والانتداب — {companyName}.
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('EXPENSES')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
              subTab === 'EXPENSES'
                ? 'bg-[#ffffff] text-[#141414]'
                : 'bg-[#262626] text-[#ffffff]'
            }`}
          >
            مطالبات المصروفات وفواتير ZATCA ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('TRAVEL')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
              subTab === 'TRAVEL'
                ? 'bg-[#ffffff] text-[#141414]'
                : 'bg-[#262626] text-[#ffffff]'
            }`}
          >
            رحلات العمل والانتدابات ({trips.length})
          </button>
        </div>
      </div>

      {subTab === 'EXPENSES' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateExpense}
            className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-sm font-black text-[#141414] m-0">
                رفع مطالبة مصروفات وقارئ الفاتورة الضريبية (ZATCA QR)
              </h4>
              {decodedQrState?.valid && (
                <Badge
                  text={
                    decodedQrState.isPhase2Signed
                      ? 'موثّق ZATCA المرحلة الثانية'
                      : 'موثّق ZATCA TLV'
                  }
                  type="primary"
                />
              )}
            </div>

            {/* Real ZATCA Tax Invoice Receipt Reader Box */}
            <div className="rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#141414] inline-flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#141414]" />
                  <span>فحص إيصال ضريبي فعلي (صورة / PDF / رمز TLV Base64)</span>
                </span>
                {receiptFileName && (
                  <span className="text-[11px] font-mono text-[#707070] truncate max-w-[150px]">
                    {receiptFileName}
                  </span>
                )}
              </div>

              <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] hover:bg-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isScanningReceipt
                    ? 'جارٍ قراءة المستند وفحص الباركود...'
                    : 'رفع صورة الفاتورة أو مستند الإيصال (QR Scan)'}
                </span>
                <input
                  ref={receiptFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt"
                  onChange={handleReceiptFileUpload}
                  className="hidden"
                />
              </label>

              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  قراءة جهاز المسح الضوئي أو لصق رمز ZATCA Base64 TLV المباشر
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={zatcaQrRaw}
                  onChange={(e) => handleQrInputChange(e.target.value)}
                  placeholder="AQ... (ZATCA Base64 TLV QR Payload)"
                  className="w-full px-3 py-2 rounded-[16px] bg-[#f0f0f0] text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              {readerStatusMessage && (
                <div className="p-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414] leading-relaxed">
                  {readerStatusMessage}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف</label>
              <select
                value={expEmpId}
                onChange={(e) => setExpEmpId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">التصنيف</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseClaimRecord['category'])}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  <option value="عهدة تشغيلية">عهدة تشغيلية</option>
                  <option value="وقود ومواصلات">وقود ومواصلات</option>
                  <option value="ضيافة واجتماعات">ضيافة واجتماعات</option>
                  <option value="رسوم حكومية">رسوم حكومية</option>
                  <option value="مشتريات مكتبية">مشتريات مكتبية</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">طريقة التعويض</label>
                <select
                  value={payoutChannel}
                  onChange={(e) =>
                    setPayoutChannel(e.target.value as ExpenseClaimRecord['payout_channel'])
                  }
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  <option value="BANK_TRANSFER">تحويل بنكي مباشر (110201)</option>
                  <option value="NEXT_PAYROLL">إضافة مع راتب الشهر (210201)</option>
                  <option value="PETTY_CASH_SETTLEMENT">إقفال من العهدة النقدية (110102)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  اسم المورد (Tag 1) *
                </label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="اسم المنشأة الموردة في الفاتورة"
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  الرقم الضريبي للمورد — 15 رقماً (Tag 2)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={15}
                  value={supplierVatNumber}
                  onChange={(e) => setSupplierVatNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="300000000000003"
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  تاريخ ووقت الفاتورة (Tag 3)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={invoiceTimestamp}
                  onChange={(e) => setInvoiceTimestamp(e.target.value)}
                  placeholder="2026-11-14T12:30:00Z"
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  رقم الفاتورة الضريبية
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={taxInvoiceNo}
                  onChange={(e) => setTaxInvoiceNo(e.target.value)}
                  placeholder="INV-2026-001"
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  الإجمالي شامل الضريبة (Tag 4 — ⃁) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  required
                  value={amount || ''}
                  onChange={(e) => {
                    setAmount(Number(e.target.value) || 0);
                    setExactDecodedVat(null);
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
              <label className="flex items-center gap-2 p-2.5 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasZatcaVat}
                  onChange={(e) => setHasZatcaVat(e.target.checked)}
                  className="accent-[#141414]"
                />
                <span>فصل ضريبة المدخلات (110801)</span>
              </label>
            </div>

            <div className="p-3 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>الصافي قبل الضريبة: ⃁ {vatBreakdown.net.toLocaleString()}</span>
                <span>ضريبة القيمة المضافة (Tag 5): ⃁ {vatBreakdown.vat.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#f0f0f0]">
                <strong className="text-[#141414]">
                  الإجمالي المعتمد: ⃁ {vatBreakdown.gross.toLocaleString()}
                </strong>
                {receiptFingerprint && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414]">
                    {receiptFingerprint}
                  </span>
                )}
              </div>
            </div>

            {duplicateExistingClaim && (
              <div className="p-3.5 rounded-[16px] bg-[#141414] text-[#ffffff] text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    تم حظر الصرف المزدوج — بصمة الفاتورة مسجلة مسبقاً!
                  </div>
                  <div className="text-[11px] text-[#e0e0e0] mt-0.5">
                    هذه الفاتورة ({receiptFingerprint}) مقيدة بالفعل في المطالبة رقم (
                    {duplicateExistingClaim.id}) للموظف {duplicateExistingClaim.employee_name} بتاريخ{' '}
                    {duplicateExistingClaim.created_at}.
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={Boolean(duplicateExistingClaim)}
              className={`w-full py-2.5 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 ${
                duplicateExistingClaim
                  ? 'bg-[#e0e0e0] text-[#707070] cursor-not-allowed'
                  : 'bg-[#141414] text-[#ffffff] hover:bg-[#262626] cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>
                {duplicateExistingClaim
                  ? 'موقوف لوجود فاتورة مكررة بنفس البصمة'
                  : 'تسجيل المطالبة وتوثيق بصمة الإيصال'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-sm font-black text-[#141414] m-0">
                سجل مطالبات المصروفات والعهد الموثقة ({expenses.length})
              </h4>
              <ExportDropdown sectionKey="hr_expense_claims" data={expenses} />
            </div>

            {expenses.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
                لا توجد مطالبات مصروفات مسجلة حالياً. ارفع صورة الفاتورة الضريبية أو امسح رمز ZATCA QR لبدء القيد الفعلي.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0e0e0] text-[#707070]">
                      <th className="py-2 px-2 font-bold">المرجع / البصمة</th>
                      <th className="py-2 px-2 font-bold">الموظف</th>
                      <th className="py-2 px-2 font-bold">المورد والرقم الضريبي</th>
                      <th className="py-2 px-2 font-bold">الإجمالي / الضريبة (⃁)</th>
                      <th className="py-2 px-2 font-bold">الحالة / القيد</th>
                      <th className="py-2 px-2 font-bold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((c) => (
                      <tr key={c.id} className="border-b border-[#f0f0f0]">
                        <td className="py-2.5 px-2">
                          <div className="font-mono font-bold text-[#141414]">{c.id}</div>
                          {c.receipt_fingerprint && (
                            <div className="font-mono text-[10px] text-[#707070] inline-flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3" />
                              <span>{c.receipt_fingerprint}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-[#141414]">{c.employee_name}</div>
                          <div className="text-[11px] text-[#707070]">{c.category}</div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-[#141414]">{c.merchant_name}</div>
                          {c.supplier_vat_number && (
                            <div className="font-mono text-[10px] text-[#707070]">
                              VAT: {c.supplier_vat_number}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono">
                          <div className="font-bold text-[#141414]">
                            ⃁ {c.total_amount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[#707070]">
                            ضريبة: ⃁ {c.vat_amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge
                            text={
                              c.gl_journal_ref ? `${c.status} (${c.gl_journal_ref})` : c.status
                            }
                            type={
                              c.status === 'معتمد ومرحل'
                                ? 'success'
                                : c.status === 'مرفوض'
                                ? 'danger'
                                : 'warning'
                            }
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          {c.status === 'بانتظار الاعتماد' ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleApproveAndPostExpense(c)}
                                className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                              >
                                اعتماد وترحيل
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectExpense(c)}
                                aria-label="رفض المطالبة"
                                className="p-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-[#141414]" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateTrip}
            className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
          >
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                طلب رحلة عمل واحتساب بدل الانتداب اليومي (Per Diem)
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف المنتدب</label>
              <select
                value={tripEmpId}
                onChange={(e) => setTripEmpId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.grade || 'الدرجة الثالثة'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">نطاق الانتداب</label>
                <select
                  value={tripScope}
                  onChange={(e) => setTripScope(e.target.value as 'DOMESTIC' | 'INTERNATIONAL')}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  <option value="DOMESTIC">داخلي (مدن المملكة)</option>
                  <option value="INTERNATIONAL">خارجي (دولي)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">الوجهة والغرض</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">تاريخ السفر</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">عدد الليالي</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={nightsCount}
                  onChange={(e) => setNightsCount(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">التذكرة (⃁)</label>
                <input
                  type="number"
                  min={0}
                  value={ticketCost}
                  onChange={(e) => setTicketCost(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between text-xs">
              <span>اليومية: ⃁ {perDiemCalc.dailyPerDiem}</span>
              <span>البدل: ⃁ {perDiemCalc.perDiemTotal.toLocaleString()}</span>
              <strong className="text-[#141414]">
                الإجمالي: ⃁ {perDiemCalc.totalTripAllowance.toLocaleString()}
              </strong>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>تسجيل أمر الانتداب وحجز المخصص</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-sm font-black text-[#141414] m-0">
                سجل أوامر الانتداب ورحلات العمل ({trips.length})
              </h4>
              <ExportDropdown sectionKey="hr_business_trips" data={trips} />
            </div>

            {trips.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
                لا توجد رحلات عمل مسجلة حالياً.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0e0e0] text-[#707070]">
                      <th className="py-2 px-2 font-bold">المرجع</th>
                      <th className="py-2 px-2 font-bold">الموظف</th>
                      <th className="py-2 px-2 font-bold">الوجهة</th>
                      <th className="py-2 px-2 font-bold">إجمالي المخصص</th>
                      <th className="py-2 px-2 font-bold">الحالة</th>
                      <th className="py-2 px-2 font-bold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((tr) => (
                      <tr key={tr.id} className="border-b border-[#f0f0f0]">
                        <td className="py-2.5 px-2 font-mono font-bold">{tr.id}</td>
                        <td className="py-2.5 px-2 font-bold">{tr.employee_name}</td>
                        <td className="py-2.5 px-2">
                          {tr.destination} ({tr.nights_count} ليالٍ)
                        </td>
                        <td className="py-2.5 px-2 font-mono font-bold">
                          ⃁ {tr.total_allowance.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge
                            text={tr.status}
                            type={
                              tr.status === 'معتمد ومصروف'
                                ? 'success'
                                : tr.status === 'مرفوض'
                                ? 'danger'
                                : 'warning'
                            }
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          {tr.status === 'بانتظار الاعتماد' ? (
                            <button
                              type="button"
                              onClick={() => handleApproveTrip(tr)}
                              className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                            >
                              اعتماد وصرف
                            </button>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-[#141414]" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
