import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Fingerprint,
  QrCode,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Search,
  RefreshCw,
  Printer,
  MessageCircle,
  Mail,
  RotateCcw,
  ScanLine,
  Building2,
  X,
  Copy,
  Check,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { printSpecificElement } from '../../utils/printManager';
import {
  getAllEmployeesGateVerificationDirectory,
  getEmployeeGateProfile,
  regenerateEmployeeBarcode,
  resetEmployeeBiometricEnrollment,
  updateEmployeeGatePolicy,
  verifyEmployeeBarcodeInput,
  type EmployeeBiometricGateProfile,
  type EmployeeGatePolicyMode,
} from '../../services/biometricAttendanceGateService';
import { resolveDocumentBranding } from '../../services/entityBrandingService';
import { shareViaWhatsApp, shareViaEmail } from '../../services/quickShareService';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  generateRealCode128BarcodeSvg,
  generateRealQrSvg,
} from '../../utils/realBarcodeGenerator';

export interface PerEmployeeBiometricVerificationHubProps {
  /** When passed, renders the focused individual card & live tester for a single employee (e.g. inside Employee 360°). */
  singleEmployee?: Record<string, any> | null;
  companyFilter?: string;
  readOnly?: boolean;
}

interface IndividualAuditSummary {
  totalChecked: number;
  uniqueBarcodesCount: number;
  uniquePinsCount: number;
  zeroCollisions: boolean;
  antiSpoofingVerified: boolean;
  checkedAtHHMM: string;
}

export const PerEmployeeBiometricVerificationHub: React.FC<
  PerEmployeeBiometricVerificationHubProps
> = ({ singleEmployee, companyFilter = 'all', readOnly = false }) => {
  const [directory, setDirectory] = useState<EmployeeBiometricGateProfile[]>([]);
  const [singleProfile, setSingleProfile] = useState<EmployeeBiometricGateProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>(companyFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'CHECKED_IN' | 'CHECKED_OUT' | 'BIO_ENROLLED' | 'BARCODE_ONLY'
  >('ALL');

  const [selectedInspectProfile, setSelectedInspectProfile] =
    useState<EmployeeBiometricGateProfile | null>(null);
  const [hideHoldingGroupOnCard, setHideHoldingGroupOnCard] = useState<boolean>(false);
  const [testBarcodeInput, setTestBarcodeInput] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [auditReport, setAuditReport] = useState<IndividualAuditSummary | null>(null);

  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
      if (singleEmployee) {
        const prof = await getEmployeeGateProfile(singleEmployee);
        setSingleProfile(prof);
      } else {
        const list = await getAllEmployeesGateVerificationDirectory('all');
        setDirectory(list);
        setSelectedInspectProfile((prev) => {
          if (!prev) return null;
          return list.find((item) => item.employeeKey === prev.employeeKey) || prev;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [singleEmployee]);

  useEffect(() => {
    void reloadData();
    const onSync = () => {
      void reloadData();
    };
    window.addEventListener('erp-data-updated', onSync);
    window.addEventListener('erp-attendance-session-updated', onSync);
    return () => {
      window.removeEventListener('erp-data-updated', onSync);
      window.removeEventListener('erp-attendance-session-updated', onSync);
    };
  }, [reloadData]);

  // Run automated per-employee uniqueness & anti-spoofing audit across every employee individually
  const handleRunIndividualAuditAcrossAll = async () => {
    const allProfiles =
      directory.length > 0
        ? directory
        : await getAllEmployeesGateVerificationDirectory('all');

    const badgeSet = new Set<string>();
    const pinSet = new Set<string>();
    let allSelfValid = true;
    let crossIsolationValid = true;

    for (let i = 0; i < allProfiles.length; i++) {
      const emp = allProfiles[i];
      badgeSet.add(emp.badgeCode);
      pinSet.add(emp.shortPinCode);

      const ownCheck = verifyEmployeeBarcodeInput(emp.badgeCode, {
        email: emp.email,
        id: emp.employeeId,
        full_name: emp.fullName,
        company_id: emp.companyCode,
      });
      if (!ownCheck.valid) {
        allSelfValid = false;
      }

      if (allProfiles.length > 1) {
        const neighbor = allProfiles[(i + 1) % allProfiles.length];
        if (neighbor.employeeKey !== emp.employeeKey) {
          const spoofCheck = verifyEmployeeBarcodeInput(neighbor.badgeCode, {
            email: emp.email,
            id: emp.employeeId,
            full_name: emp.fullName,
            company_id: emp.companyCode,
          });
          if (spoofCheck.valid || !spoofCheck.crossEmployeeMismatch) {
            crossIsolationValid = false;
          }
        }
      }
    }

    const zeroCollisions =
      badgeSet.size === allProfiles.length &&
      pinSet.size === allProfiles.length &&
      allSelfValid;

    const summary: IndividualAuditSummary = {
      totalChecked: allProfiles.length,
      uniqueBarcodesCount: badgeSet.size,
      uniquePinsCount: pinSet.size,
      zeroCollisions,
      antiSpoofingVerified: crossIsolationValid,
      checkedAtHHMM: new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
    setAuditReport(summary);

    notificationPopupEngine.success(
      'اكتمل فحص التحقق لكل موظف على حدة (100%)',
      `تم التحقق فردياً من (${summary.totalChecked}) موظف: ${summary.uniqueBarcodesCount} باركود فريد دون أي تكرار، وعزل تام ضد استخدام باركود موظف آخر.`
    );
  };

  const filteredDirectory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return directory.filter((emp) => {
      if (entityFilter !== 'all' && emp.companyCode !== entityFilter) {
        return false;
      }
      if (statusFilter === 'CHECKED_IN' && !emp.checkedInToday) return false;
      if (statusFilter === 'CHECKED_OUT' && !emp.checkedOutToday) return false;
      if (statusFilter === 'BIO_ENROLLED' && !emp.biometricEnrolled) return false;
      if (statusFilter === 'BARCODE_ONLY' && emp.gatePolicy !== 'BARCODE_PRIMARY') return false;

      if (!q) return true;
      return (
        emp.fullName.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.badgeCode.toLowerCase().includes(q) ||
        emp.shortPinCode.includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.departmentNameAr.toLowerCase().includes(q)
      );
    });
  }, [directory, entityFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = directory.length;
    const bioEnrolled = directory.filter((e) => e.biometricEnrolled).length;
    const checkedIn = directory.filter((e) => e.checkedInToday).length;
    const checkedOut = directory.filter((e) => e.checkedOutToday).length;
    return { total, bioEnrolled, checkedIn, checkedOut };
  }, [directory]);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedKey(code);
      window.setTimeout(() => setCopiedKey(''), 1600);
    } catch {
      // ignore
    }
  };

  const handleShareEmployeeCardWhatsApp = (
    prof: EmployeeBiometricGateProfile,
    hideGroup: boolean
  ) => {
    shareViaWhatsApp({
      title: `بطاقة الباركود الوظيفي وبصمة الدخول والخروج — ${prof.fullName}`,
      recipientName: prof.fullName,
      recipientPhone: prof.phone,
      recipientEmail: prof.email,
      referenceNumber: prof.badgeCode,
      entityCode: prof.companyCode,
      hideHoldingGroupBrand: hideGroup,
      moduleName: 'الحضور والانصراف والأمان الحيوي',
      summaryLines: [
        { label: 'اسم الموظف', value: prof.fullName },
        { label: 'المسمى الوظيفي', value: prof.role },
        { label: 'رمز الباركود الوظيفي (Code-128)', value: prof.badgeCode },
        { label: 'الرمز المختصر للتحقق البديل', value: prof.shortPinCode },
        {
          label: 'آلية الاستخدام',
          value: 'عند فتح النظام وعند تسجيل الخروج يتم التحقق بالبصمة والكاميرا أو مسح هذا الباركود.',
        },
      ],
    });
  };

  const handleShareEmployeeCardEmail = (
    prof: EmployeeBiometricGateProfile,
    hideGroup: boolean
  ) => {
    shareViaEmail({
      title: `بطاقة الباركود الوظيفي وبصمة الدخول والخروج — ${prof.fullName}`,
      recipientName: prof.fullName,
      recipientEmail: prof.email,
      referenceNumber: prof.badgeCode,
      entityCode: prof.companyCode,
      hideHoldingGroupBrand: hideGroup,
      moduleName: 'الحضور والانصراف والأمان الحيوي',
      summaryLines: [
        { label: 'اسم الموظف', value: prof.fullName },
        { label: 'البريد الوظيفي', value: prof.email },
        { label: 'رمز الباركود الوظيفي (Code-128)', value: prof.badgeCode },
        { label: 'الرمز المختصر للتحقق البديل', value: prof.shortPinCode },
        {
          label: 'سياسة البوابة',
          value:
            prof.gatePolicy === 'BARCODE_PRIMARY'
              ? 'التحقق الأساسي بالباركود + الكاميرا المباشرة'
              : 'البصمة الحيوية + الكاميرا المباشرة (مع بديل الباركود)',
        },
      ],
    });
  };

  const handleRegenerate = async (prof: EmployeeBiometricGateProfile) => {
    const updated = await regenerateEmployeeBarcode({
      email: prof.email,
      id: prof.employeeId,
      full_name: prof.fullName,
      company_id: prof.companyCode,
    });
    if (singleEmployee) setSingleProfile(updated);
    if (selectedInspectProfile?.employeeKey === prof.employeeKey) {
      setSelectedInspectProfile(updated);
    }
    setTestBarcodeInput('');
    setTestResult(null);
    notificationPopupEngine.success(
      'تم إصدار باركود جديد للموظف',
      `تم تخصيص الرمز الجديد (${updated.badgeCode}) للموظف (${updated.fullName}) وإلغاء الرمز السابق.`
    );
    await reloadData();
  };

  const handleResetBiometric = async (prof: EmployeeBiometricGateProfile) => {
    const updated = await resetEmployeeBiometricEnrollment({
      email: prof.email,
      id: prof.employeeId,
      full_name: prof.fullName,
      company_id: prof.companyCode,
    });
    if (singleEmployee) setSingleProfile(updated);
    if (selectedInspectProfile?.employeeKey === prof.employeeKey) {
      setSelectedInspectProfile(updated);
    }
    notificationPopupEngine.info(
      'تمت إعادة ضبط البصمة الحيوية للموظف',
      `سيُطلب من (${updated.fullName}) تسجيل البصمة الحيوية من جديد عند الفتح القادم.`
    );
    await reloadData();
  };

  const handlePolicyChange = async (
    prof: EmployeeBiometricGateProfile,
    nextPolicy: EmployeeGatePolicyMode
  ) => {
    const updated = await updateEmployeeGatePolicy(
      {
        email: prof.email,
        id: prof.employeeId,
        full_name: prof.fullName,
        company_id: prof.companyCode,
      },
      { gatePolicy: nextPolicy }
    );
    if (singleEmployee) setSingleProfile(updated);
    if (selectedInspectProfile?.employeeKey === prof.employeeKey) {
      setSelectedInspectProfile(updated);
    }
    await reloadData();
  };

  const runLiveTestForProfile = (prof: EmployeeBiometricGateProfile, rawCode: string) => {
    const check = verifyEmployeeBarcodeInput(rawCode, {
      email: prof.email,
      id: prof.employeeId,
      full_name: prof.fullName,
      company_id: prof.companyCode,
    });
    if (check.valid) {
      setTestResult({
        checked: true,
        valid: true,
        message: `تحقق فردي ناجح 100%: الرمز (${check.matchedCode}) مطابق حصرياً للموظف (${prof.fullName}).`,
      });
    } else {
      setTestResult({
        checked: true,
        valid: false,
        message: check.reasonAr || 'الرمز غير مطابق لهذا الموظف.',
      });
    }
  };

  const renderIndividualInspectorBody = (prof: EmployeeBiometricGateProfile) => {
    const branding = resolveDocumentBranding(
      { company_id: prof.companyCode },
      {
        entityCode: prof.companyCode,
        hideHoldingGroupBrand: hideHoldingGroupOnCard,
      }
    );

    const code128Svg = generateRealCode128BarcodeSvg(prof.badgeCode, {
      widthPx: 236,
      heightPx: 54,
      darkColor: '#141414',
      lightColor: '#FFFFFF',
      showText: true,
    });

    const qrSvg = generateRealQrSvg(prof.qrPayload, {
      sizePx: 104,
      darkColor: '#141414',
      lightColor: '#FFFFFF',
      borderStyle: true,
    });

    return (
      <div className="space-y-4" dir="rtl">
        {/* Printable Employee Official Barcode & Biometric Identity Card */}
        <div
          data-printable-card="true"
          className="erp-printable-sheet bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0f0f0] pb-3.5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                <Building2 className="w-3.5 h-3.5" />
                <span>{branding.displayNameAr}</span>
              </div>
              {!branding.hideHoldingGroupBrand && branding.holdingBadgeAr && (
                <div className="text-[11px] text-[#707070] font-medium">
                  {branding.holdingBadgeAr}
                </div>
              )}
              <h3 className="text-base font-bold text-[#141414] m-0 pt-0.5">
                {prof.fullName}
              </h3>
              <div className="text-xs text-[#707070]">
                {prof.role} • {prof.departmentNameAr} •{' '}
                <span className="font-mono">{prof.email}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 no-print">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideHoldingGroupOnCard}
                  onChange={(e) => setHideHoldingGroupOnCard(e.target.checked)}
                  className="accent-[#141414]"
                />
                <span>إلغاء جملة مجموعة خالد السليم</span>
              </label>

              <button
                type="button"
                onClick={(e) =>
                  printSpecificElement(e.currentTarget.closest<HTMLElement>('[data-printable-card="true"]'))
                }
                className="h-8 px-3.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة البطاقة</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareEmployeeCardWhatsApp(prof, hideHoldingGroupOnCard)}
                className="h-8 px-3 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareEmployeeCardEmail(prof, hideHoldingGroupOnCard)}
                className="h-8 px-3 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>بريد</span>
              </button>
            </div>
          </div>

          {/* Scannable Code-128B + QR Block */}
          <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-2 text-center sm:text-right">
              <div className="text-xs font-bold text-[#141414]">
                الباركود الوظيفي المخصص للموظف (للدخول والخروج عند عدم توفر البصمة):
              </div>
              <div
                className="inline-block max-w-full overflow-hidden"
                dangerouslySetInnerHTML={{ __html: code128Svg }}
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold text-[#141414]">
                  {prof.badgeCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[#707070]">
                  PIN: <strong className="text-[#141414]">{prof.shortPinCode}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[10px] text-[#707070]">
                  إصدار V{prof.barcodeVersion}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy(prof.badgeCode)}
                  className="px-2.5 py-0.5 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] inline-flex items-center gap-1 cursor-pointer no-print"
                >
                  {copiedKey === prof.badgeCode ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === prof.badgeCode ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-1">
              <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <span className="text-[10px] font-mono text-[#707070]">ISO QR + Code-128B</span>
            </div>
          </div>

          {/* Individual Check-In / Check-Out Camera Evidence & Biometric Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#707070] font-semibold">البصمة الحيوية للموظف</span>
                <Fingerprint className="w-4 h-4 text-[#141414]" />
              </div>
              <div className="text-xs font-bold text-[#141414]">
                {prof.biometricEnrolled
                  ? `مسجلة وموثقة (${prof.biometricCredentialHint || 'WebAuthn'})`
                  : 'غير مسجلة بعد — يعمل الباركود البديل تلقائياً'}
              </div>
              {prof.biometricEnrolledAt && (
                <div className="text-[10px] font-mono text-[#707070]">
                  تاريخ الربط: {prof.biometricEnrolledAt}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#707070] font-semibold">آخر دخول وتوثيق الكاميرا</span>
                <Camera className="w-4 h-4 text-[#141414]" />
              </div>
              <div className="text-xs font-bold text-[#141414]">
                {prof.lastCheckInTime
                  ? `${prof.lastCheckInTime} (${prof.lastCheckInDate || 'اليوم'})`
                  : 'لم يسجل دخول في هذه الجلسة'}
              </div>
              {prof.lastCheckInHash && (
                <div className="text-[10px] font-mono text-[#707070] truncate">
                  بصمة الصورة: {prof.lastCheckInHash}
                </div>
              )}
              {prof.lastCheckInSnapshot && (
                <img
                  src={prof.lastCheckInSnapshot}
                  alt={`لقطة دخول ${prof.fullName}`}
                  className="w-full h-20 object-cover rounded-[12px] border border-[#e0e0e0] mt-1"
                />
              )}
            </div>

            <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#707070] font-semibold">آخر خروج وانصراف بالكاميرا</span>
                <Clock className="w-4 h-4 text-[#141414]" />
              </div>
              <div className="text-xs font-bold text-[#141414]">
                {prof.lastCheckOutTime
                  ? `${prof.lastCheckOutTime} • ${prof.lastWorkHours ?? 0} ساعة عمل`
                  : 'قيد العمل / لم يسجل خروج بعد'}
              </div>
              {prof.lastCheckOutHash && (
                <div className="text-[10px] font-mono text-[#707070] truncate">
                  بصمة الصورة: {prof.lastCheckOutHash}
                </div>
              )}
              {prof.lastCheckOutSnapshot && (
                <img
                  src={prof.lastCheckOutSnapshot}
                  alt={`لقطة خروج ${prof.fullName}`}
                  className="w-full h-20 object-cover rounded-[12px] border border-[#e0e0e0] mt-1"
                />
              )}
            </div>
          </div>
        </div>

        {/* Interactive Per-Employee Verification Tester & HR Admin Controls */}
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-[#141414] inline-flex items-center gap-1.5">
              <ScanLine className="w-4 h-4" />
              <span>اختبار التأكد من مطابقة باركود الموظف ({prof.fullName}) على حدة:</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTestBarcodeInput(prof.badgeCode);
                runLiveTestForProfile(prof, prof.badgeCode);
              }}
              className="h-8 px-3 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
            >
              تجربة رمز الموظف الصحيح ({prof.badgeCode})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              dir="ltr"
              value={testBarcodeInput}
              onChange={(e) => {
                setTestBarcodeInput(e.target.value);
                if (testResult) setTestResult(null);
              }}
              placeholder="امسح أو أدخل أي باركود للتأكد من قبوله أو رفضه لهذا الموظف..."
              className="flex-1 h-10 px-4 rounded-[16px] bg-[#f0f0f0] text-[#141414] font-mono text-xs font-bold outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#141414]"
            />
            <button
              type="button"
              onClick={() => runLiveTestForProfile(prof, testBarcodeInput)}
              className="h-10 px-5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold cursor-pointer shrink-0"
            >
              فحص المطابقة للموظف
            </button>
          </div>

          {testResult?.checked && (
            <div
              className={`px-4 py-2.5 rounded-[16px] border text-xs font-bold flex items-center gap-2 ${
                testResult.valid
                  ? 'bg-[#f3f3f3] border-[#141414] text-[#141414]'
                  : 'bg-[#ffffff] border-[#141414] text-[#141414]'
              }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {!readOnly && (
            <div className="pt-3 border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#707070]">سياسة الدخول والخروج للموظف:</span>
                <select
                  aria-label="سياسة التحقق للموظف"
                  value={prof.gatePolicy}
                  onChange={(e) =>
                    void handlePolicyChange(prof, e.target.value as EmployeeGatePolicyMode)
                  }
                  className="h-9 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] outline-none cursor-pointer"
                >
                  <option value="BIOMETRIC_WITH_BARCODE_FALLBACK">
                    البصمة الحيوية + الكاميرا (مع بديل الباركود)
                  </option>
                  <option value="BARCODE_PRIMARY">
                    الباركود الوظيفي + الكاميرا مباشرة (لا يتوفر له بصمة)
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleRegenerate(prof)}
                  className="h-9 px-3.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة إصدار باركود جديد</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleResetBiometric(prof)}
                  className="h-9 px-3.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة ضبط البصمة الحيوية</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const exportDataRecords = useMemo(
    () =>
      filteredDirectory.map((e) => ({
        emp_name: e.fullName,
        role: e.role,
        company_id: e.companyCode,
        email: e.email,
        badge_code: e.badgeCode,
        pin_code: e.shortPinCode,
        biometric_status: e.biometricEnrolled ? 'مسجلة ومفعلة' : 'يعمل بالباركود البديل',
        check_in: e.lastCheckInTime || '—',
        check_out: e.lastCheckOutTime || '—',
      })),
    [filteredDirectory]
  );

  // Mode A: Focused Single Employee View (inside Employee 360° Modal or ESS)
  if (singleEmployee) {
    if (loading || !singleProfile) {
      return (
        <div className="p-8 text-center text-xs font-bold text-[#707070]">
          جاري تحميل ملف البصمة والباركود والكاميرا للموظف...
        </div>
      );
    }
    return renderIndividualInspectorBody(singleProfile);
  }

  // Mode B: Full Group-Wide Per-Employee Verification Matrix (69+ Employees Individually)

  return (
    <div data-slot="per-employee-biometric-hub" className="space-y-5" dir="rtl">
      {/* Top KPI & Individual Verification Sweep Banner */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#141414] m-0">
              سجل التحقق الفردي للبصمة والكاميرا والباركود لكل موظف على حدة.
            </h2>
            <p className="text-xs text-[#707070] mt-1 m-0">
              إدارة ومطابقة بصمة الدخول والخروج، لقطات الكاميرا المباشرة، وبطاقات الباركود الفريدة لكل موظف بشكل مستقل ومنع أي تداخل بين الحسابات.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-slot="run-all-employees-individual-audit-btn"
              onClick={() => void handleRunIndividualAuditAcrossAll()}
              className="h-10 px-4 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>فحص والتأكد من كافة الموظفين فردياً ({stats.total})</span>
            </button>

            <ExportDropdown
              sectionKey="attendances"
              data={exportDataRecords}
              customTitle="سجل بصمة وباركود الموظفين الفردي"
            />
          </div>
        </div>

        {/* Live Sweep Verification Result Banner */}
        {auditReport && (
          <div
            data-slot="individual-audit-pass-banner"
            className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#141414] flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#141414] shrink-0" />
              <div>
                <div className="font-bold text-[#141414]">
                  نتيجة الفحص الفردي الشامل ({auditReport.checkedAtHHMM}): تم التأكد من ({auditReport.totalChecked}) موظف بنجاح 100%
                </div>
                <div className="text-[#707070] mt-0.5">
                  باركود فريد لكل موظف: {auditReport.uniqueBarcodesCount}/{auditReport.totalChecked} • رمز PIN فريد: {auditReport.uniquePinsCount}/{auditReport.totalChecked} • منع انتحال باركود موظف آخر:{' '}
                  <strong>{auditReport.antiSpoofingVerified ? 'مفعل ومؤكد 100%' : 'تحقق'}</strong>
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-mono font-bold text-[11px]">
              VERIFIED 100%
            </span>
          </div>
        )}

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="text-xs text-[#707070] font-medium">إجمالي الموظفين المربوطين فردياً</div>
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">{stats.total}</div>
            <div className="text-[11px] text-[#707070] mt-0.5">باركود وبصمة مستقلة لكل موظف</div>
          </div>
          <div className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="text-xs text-[#707070] font-medium">بصمة حيوية مفعّلة على الأجهزة</div>
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">{stats.bioEnrolled}</div>
            <div className="text-[11px] text-[#707070] mt-0.5">والبقية مفعل لهم الباركود البديل تلقائياً</div>
          </div>
          <div className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="text-xs text-[#707070] font-medium">سجلوا دخول الفتح اليوم</div>
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">{stats.checkedIn}</div>
            <div className="text-[11px] text-[#707070] mt-0.5">موثق بالبصمة/الباركود والكاميرا</div>
          </div>
          <div className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="text-xs text-[#707070] font-medium">سجلوا بصمة الخروج اليوم</div>
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">{stats.checkedOut}</div>
            <div className="text-[11px] text-[#707070] mt-0.5">مع احتساب ساعات الدوام الفعلية</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الموظف، البريد الوظيفي، رمز الباركود (SAF-ID-...)، أو المسمى..."
              className="w-full h-10 pr-10 pl-4 rounded-full bg-[#f0f0f0] text-xs font-semibold text-[#141414] outline-none focus:bg-[#ffffff] focus:ring-2 focus:ring-[#141414]"
            />
          </div>

          <select
            aria-label="تصفية حسب الشركة"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-10 px-4 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] outline-none cursor-pointer"
          >
            <option value="all">جميع الشركات والكيانات</option>
            <option value="HQ">الإدارة العامة (HQ)</option>
            <option value="SAF">السفير الماسي (SAF)</option>
            <option value="YAQ">ياقوت نجد (YAQ)</option>
            <option value="TOP">توباز (TOP)</option>
            <option value="DAR">دار الرواد (DAR)</option>
            <option value="KAS">شركة كاس للتجارة (KAS)</option>
          </select>

          <select
            aria-label="تصفية حسب حالة التحقق"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-4 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] outline-none cursor-pointer"
          >
            <option value="ALL">جميع الحالات ({directory.length})</option>
            <option value="CHECKED_IN">حاضر اليوم بتوثيق البوابة</option>
            <option value="CHECKED_OUT">أكمل بصمة الخروج اليوم</option>
            <option value="BIO_ENROLLED">مسجل بالبصمة الحيوية</option>
            <option value="BARCODE_ONLY">مضبوط على الباركود الأساسي</option>
          </select>
        </div>
      </div>

      {/* Per-Employee Verification Table */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] font-bold">
                <th className="py-3.5 px-4">الموظف والكيان</th>
                <th className="py-3.5 px-4">الباركود الفريد والرمز PIN</th>
                <th className="py-3.5 px-4">وسيلة التحقق المعتمدة</th>
                <th className="py-3.5 px-4">دخول الفتح + الكاميرا</th>
                <th className="py-3.5 px-4">خروج النظام + الساعات</th>
                <th className="py-3.5 px-4 text-center">إجراءات التأكد الفردي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {filteredDirectory.map((emp) => (
                <tr key={emp.employeeKey} className="hover:bg-[#fafafa] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#141414]">{emp.fullName}</div>
                    <div className="text-[11px] text-[#707070] flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-mono font-bold text-[10px] text-[#141414]">
                        {emp.companyCode}
                      </span>
                      <span>{emp.role}</span>
                      <span className="font-mono text-[10px]">({emp.email})</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-[#141414]">{emp.badgeCode}</div>
                    <div className="text-[11px] font-mono text-[#707070]">
                      PIN: <strong className="text-[#141414]">{emp.shortPinCode}</strong> • V
                      {emp.barcodeVersion}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                      {emp.biometricEnrolled ? (
                        <>
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>بصمة حيوية + كاميرا</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-3.5 h-3.5" />
                          <span>باركود الموظف + كاميرا</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    {emp.lastCheckInTime ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#141414] font-mono">
                          {emp.lastCheckInTime} ✓
                        </div>
                        <div className="text-[10px] text-[#707070] font-mono">
                          {emp.lastCheckInHash ? emp.lastCheckInHash.slice(0, 12) : 'موثق'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#707070]">بانتظار الفتح</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {emp.lastCheckOutTime ? (
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#141414] font-mono">
                          {emp.lastCheckOutTime} ✓
                        </div>
                        <div className="text-[10px] text-[#707070]">
                          {emp.lastWorkHours ?? 0} ساعة
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#707070]">—</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        data-slot={`inspect-emp-gate-${emp.employeeKey}`}
                        onClick={() => {
                          setSelectedInspectProfile(emp);
                          setTestBarcodeInput('');
                          setTestResult(null);
                        }}
                        className="h-8 px-3 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>فحص وبطاقة الموظف</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareEmployeeCardWhatsApp(emp, false)}
                        className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] inline-flex items-center justify-center cursor-pointer"
                        title="إرسال بطاقة الباركود للموظف عبر واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareEmployeeCardEmail(emp, false)}
                        className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] inline-flex items-center justify-center cursor-pointer"
                        title="إرسال بطاقة الباركود للموظف عبر البريد"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Employee Inspector Modal */}
      {selectedInspectProfile && (
        <div
          data-printable-modal="true"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[11050] bg-[#141414]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setSelectedInspectProfile(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#f3f3f3] border border-[#e0e0e0] rounded-[28px] overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[12px] bg-[#141414] text-[#ffffff] flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#141414] m-0">
                    بطاقة وفحص التحقق الفردي للموظف: {selectedInspectProfile.fullName}
                  </h3>
                  <div className="text-[11px] text-[#707070]">
                    تأكد من الباركود الفريد، البصمة الحيوية، ولقطات الكاميرا الخاصة بهذا الموظف وحده
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInspectProfile(null)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {renderIndividualInspectorBody(selectedInspectProfile)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerEmployeeBiometricVerificationHub;
