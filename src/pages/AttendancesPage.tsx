import i18n from '../i18n/config';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useModalEscape } from '../hooks/useModalEscape';
import { Badge } from '../components/ui/Badge';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { notificationPopupEngine } from '../services/notificationPopupEngine';
import { useCompany } from '../contexts/CompanyContext';
import {
  HrShiftAttendanceEngine,
  DEFAULT_HR_SHIFTS,
  DEFAULT_GEOFENCE_LOCATIONS,
  type HrShiftSchedule,
  type HrGeofenceLocation,
  type EvaluatedAttendanceRecord,
  type AttendanceCorrectionRequest,
  type ShiftType,
  type AttendanceVerificationMethod,
} from '../services/hrShiftAttendanceEngine';
import {
  DEFAULT_SAUDI_PUBLIC_HOLIDAYS,
  findSaudiHolidayForDate,
  resolveEffectiveShiftForDate,
  validateShiftSwapRequest,
  type SaudiPublicHoliday,
  type ShiftRosterEntry,
  type ShiftSwapRequestRecord,
} from '../services/jisrAdvancedComplianceEngine';
import {
  ClipboardCheck,
  Upload,
  Plus,
  Search,
  X,
  Check,
  MapPin,
  Clock,
  Wifi,
  Tablet,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  CalendarClock,
  FileCheck2,
  Camera,
  CalendarDays,
  ArrowLeftRight,
  Edit3,
  Trash2,
  LocateFixed,
  RotateCcw,
  Fingerprint,
} from 'lucide-react';
import { RecordQuickActions, RecycleBinModal } from '../components/common/RecordQuickActions';
import { PerEmployeeBiometricVerificationHub } from '../components/hr/PerEmployeeBiometricVerificationHub';
import { AttendanceCutoffAndAdmsHub } from '../components/hr/AttendanceCutoffAndAdmsHub';
import {
  archiveRecordBeforeSoftDelete,
  recordFieldLevelChanges,
  type RecycleBinEntry,
} from '../services/quickShareService';

type AttendanceHubTab =
  | 'logs'
  | 'shifts'
  | 'geofence-kiosk'
  | 'corrections'
  | 'roster-holidays'
  | 'per-employee-gate'
  | 'cutoff-adms';

interface AttendanceRecordExtended extends EvaluatedAttendanceRecord {
  kiosk_photo_captured?: boolean;
  kiosk_photo_hash?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy_meters?: number;
}

interface CompanyEmployeeOption {
  id: string;
  employee_code?: string;
  name: string;
  department: string;
  company_id?: string;
  shift_id?: string;
  salary?: number;
  basic_salary?: number;
}

interface StoredRosterRecord extends ShiftRosterEntry {
  company_id?: string;
}

interface StoredSwapRecord extends ShiftSwapRequestRecord {
  company_id?: string;
  created_at?: string;
}

interface StoredPublicHolidayRecord extends SaudiPublicHoliday {
  company_id?: string;
}

const DEFAULT_EMPLOYEES_DIRECTORY: CompanyEmployeeOption[] = [
  {
    id: 'emp-101',
    employee_code: 'EMP-101',
    name: 'محمد مصطفي',
    department: 'الإدارة المالية',
    company_id: 'SAF',
    shift_id: 'SHF-MAIN-FIXED',
    salary: 9200,
  },
  {
    id: 'emp-102',
    employee_code: 'EMP-102',
    name: 'سهام الشاذلي',
    department: 'الموارد البشرية',
    company_id: 'SAF',
    shift_id: 'SHF-MAIN-FIXED',
    salary: 8800,
  },
  {
    id: 'emp-103',
    employee_code: 'EMP-103',
    name: 'فهد العتيبي',
    department: 'التشغيل والاستقدام',
    company_id: 'SAF',
    shift_id: 'SHF-SHELTER-ROT',
    salary: 8500,
  },
  {
    id: 'emp-104',
    employee_code: 'EMP-104',
    name: 'سارة خالد',
    department: 'خدمة العملاء CRM',
    company_id: 'SAF',
    shift_id: 'SHF-FLEX-TECH',
    salary: 7900,
  },
  {
    id: 'emp-105',
    employee_code: 'EMP-105',
    name: 'طلال الشهري',
    department: 'التشغيل والفروع',
    company_id: 'SAF',
    shift_id: 'SHF-MAIN-FIXED',
    salary: 8400,
  },
];

const INITIAL_ATTENDANCES: AttendanceRecordExtended[] = [
  {
    id: 'ATT-2026-01',
    company_id: 'SAF',
    employee_id: 'emp-101',
    emp_name: 'محمد مصطفي',
    department: 'الإدارة المالية',
    date: '2026-11-14',
    shift_id: 'SHF-MAIN-FIXED',
    shift_name: 'الدوام الإداري الرسمي الثابت',
    check_in: '07:56',
    check_out: '16:35',
    work_hours: 8.65,
    late_minutes: 0,
    early_leave_minutes: 0,
    overtime_minutes: 39,
    verification_method: 'GPS_GEOFENCE',
    distance_meters: 42,
    mock_location_detected: false,
    is_holiday_work: false,
    payroll_synced: true,
    status: 'حاضر',
  },
  {
    id: 'ATT-2026-02',
    company_id: 'SAF',
    employee_id: 'emp-102',
    emp_name: 'سهام الشاذلي',
    department: 'الموارد البشرية',
    date: '2026-11-14',
    shift_id: 'SHF-MAIN-FIXED',
    shift_name: 'الدوام الإداري الرسمي الثابت',
    check_in: '08:28',
    check_out: '16:30',
    work_hours: 8.03,
    late_minutes: 28,
    early_leave_minutes: 0,
    overtime_minutes: 0,
    verification_method: 'WIFI_NETWORK',
    distance_meters: 18,
    mock_location_detected: false,
    is_holiday_work: false,
    payroll_synced: false,
    status: 'متأخر',
  },
  {
    id: 'ATT-2026-03',
    company_id: 'SAF',
    employee_id: 'emp-103',
    emp_name: 'فهد العتيبي',
    department: 'التشغيل والاستقدام',
    date: '2026-11-14',
    shift_id: 'SHF-SHELTER-ROT',
    shift_name: 'وردية مراكز الإيواء والاستقبال بالمطار',
    check_in: '06:58',
    check_out: '16:30',
    work_hours: 9.53,
    late_minutes: 0,
    early_leave_minutes: 0,
    overtime_minutes: 92,
    verification_method: 'BIOMETRIC_ZKT',
    distance_meters: 0,
    mock_location_detected: false,
    is_holiday_work: false,
    payroll_synced: false,
    status: 'حاضر',
  },
  {
    id: 'ATT-2026-04',
    company_id: 'SAF',
    employee_id: 'emp-104',
    emp_name: 'سارة خالد',
    department: 'خدمة العملاء CRM',
    date: '2026-11-14',
    shift_id: 'SHF-FLEX-TECH',
    shift_name: 'الدوام المرن (07:30 - 09:30)',
    check_in: '09:10',
    check_out: '17:15',
    work_hours: 8.08,
    late_minutes: 0,
    early_leave_minutes: 0,
    overtime_minutes: 0,
    verification_method: 'KIOSK_TABLET',
    distance_meters: 5,
    mock_location_detected: false,
    is_holiday_work: false,
    payroll_synced: true,
    kiosk_photo_captured: true,
    kiosk_photo_hash: 'KSK-CAM-8F41C20A',
    status: 'حاضر',
  },
];

const INITIAL_CORRECTIONS: AttendanceCorrectionRequest[] = [
  {
    id: 'COR-2026-01',
    company_id: 'SAF',
    employee_id: 'emp-102',
    employee_name: 'سهام الشاذلي',
    department: 'الموارد البشرية',
    target_date: '2026-11-13',
    correction_type: 'FIELD_MISSION',
    requested_check_in: '08:00',
    requested_check_out: '16:30',
    reason: 'مراجعة رسمية لمكتب العمل وفرع التأمينات الاجتماعية صباحاً',
    status: 'بانتظار الموافقة',
    created_at: '2026-11-13',
  },
];

const INITIAL_ROSTERS: StoredRosterRecord[] = [
  {
    id: 'RST-2026-01',
    company_id: 'SAF',
    employeeId: 'emp-101',
    employeeName: 'محمد مصطفي',
    rosterDate: '2026-11-15',
    shiftId: 'SHF-MAIN-FIXED',
    shiftName: 'الدوام الإداري الرسمي الثابت (الإدارة العامة)',
    isDayOff: false,
    branchName: 'المقر الرئيسي — الرياض (حي اليرموك)',
  },
  {
    id: 'RST-2026-02',
    company_id: 'SAF',
    employeeId: 'emp-103',
    employeeName: 'فهد العتيبي',
    rosterDate: '2026-11-15',
    shiftId: 'SHF-SHELTER-ROT',
    shiftName: 'وردية مراكز الإيواء والاستقبال بالمطار (متناوبة)',
    isDayOff: false,
    branchName: 'مركز الإيواء والرعاية النموذجي — الرياض (الرمال)',
  },
];

const VERIFICATION_LABELS: Record<AttendanceVerificationMethod, string> = {
  GPS_GEOFENCE: 'سياج جغرافي GPS',
  WIFI_NETWORK: 'شبكة الفرع Wi-Fi',
  BIOMETRIC_ZKT: 'بصمة ZKTeco',
  KIOSK_TABLET: 'جهاز لوحي Kiosk',
  MANUAL_HR: 'إدخال الموارد البشرية',
};

const CORRECTION_TYPE_LABELS: Record<AttendanceCorrectionRequest['correction_type'], string> = {
  MISSING_CHECK_IN: 'نسيان بصمة حضور',
  MISSING_CHECK_OUT: 'نسيان بصمة انصراف',
  FIELD_MISSION: 'مهمة عمل ميدانية خارجية',
  DEVICE_ERROR: 'تعطل جهاز البصمة بالفرع',
};

function computeDeterministicPhotoHash(payload: string): string {
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `KSK-CAM-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

const normalizeAttendanceRecord = (
  raw: Record<string, unknown>,
  idx: number
): AttendanceRecordExtended => ({
  id: String(raw?.id || raw?.attendance_id || `ATT-${idx + 1}`),
  company_id: String(raw?.company_id || 'SAF'),
  employee_id: String(raw?.employee_id || `emp-${101 + idx}`),
  emp_name: String(raw?.emp_name || raw?.employee_name || raw?.name || 'موظف مسجل'),
  department: String(raw?.department || raw?.branch || 'الموارد البشرية'),
  date: String(
    raw?.date ||
      raw?.attendance_date ||
      (raw?.created_at ? String(raw.created_at).slice(0, 10) : '2026-11-14')
  ),
  shift_id: String(raw?.shift_id || 'SHF-MAIN-FIXED'),
  shift_name: String(raw?.shift_name || 'الدوام الإداري الرسمي الثابت'),
  check_in: String(raw?.check_in || raw?.checkIn || '08:00'),
  check_out: String(raw?.check_out || raw?.checkOut || '16:30'),
  work_hours: Number(raw?.work_hours ?? raw?.hours_worked ?? 8.0),
  late_minutes: Number(raw?.late_minutes ?? 0),
  early_leave_minutes: Number(raw?.early_leave_minutes ?? 0),
  overtime_minutes: Number(raw?.overtime_minutes ?? 0),
  verification_method:
    (raw?.verification_method as AttendanceVerificationMethod) || 'GPS_GEOFENCE',
  distance_meters: Number(raw?.distance_meters ?? 0),
  mock_location_detected: Boolean(raw?.mock_location_detected),
  is_holiday_work: Boolean(raw?.is_holiday_work),
  payroll_synced: Boolean(raw?.payroll_synced),
  kiosk_photo_captured:
    raw?.kiosk_photo_captured !== undefined ? Boolean(raw.kiosk_photo_captured) : undefined,
  kiosk_photo_hash: raw?.kiosk_photo_hash ? String(raw.kiosk_photo_hash) : undefined,
  gps_latitude: raw?.gps_latitude !== undefined ? Number(raw.gps_latitude) : undefined,
  gps_longitude: raw?.gps_longitude !== undefined ? Number(raw.gps_longitude) : undefined,
  gps_accuracy_meters:
    raw?.gps_accuracy_meters !== undefined ? Number(raw.gps_accuracy_meters) : undefined,
  status:
    raw?.status === 'حاضر' ||
    raw?.status === 'متأخر' ||
    raw?.status === 'غياب' ||
    raw?.status === 'إجازة'
      ? raw.status
      : 'حاضر',
});

const normalizeEmployeeOption = (
  raw: Record<string, unknown>,
  idx: number
): CompanyEmployeeOption => ({
  id: String(raw?.id || `emp-${101 + idx}`),
  employee_code: raw?.employee_code ? String(raw.employee_code) : undefined,
  name: String(raw?.name || raw?.full_name || raw?.employee_name || `موظف ${idx + 1}`),
  department: String(raw?.department || 'الموارد البشرية'),
  company_id: raw?.company_id ? String(raw.company_id) : 'SAF',
  shift_id: raw?.shift_id ? String(raw.shift_id) : 'SHF-MAIN-FIXED',
  salary: Number(raw?.salary ?? raw?.totalSalary ?? 8500),
  basic_salary: raw?.basic_salary !== undefined ? Number(raw.basic_salary) : undefined,
});

export const AttendancesPage: React.FC = () => {
  useModalEscape();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';

  const [activeTab, setActiveTab] = useState<AttendanceHubTab>('logs');
  const [employees, setEmployees] = useState<CompanyEmployeeOption[]>(DEFAULT_EMPLOYEES_DIRECTORY);
  const [attendances, setAttendances] = useState<AttendanceRecordExtended[]>(INITIAL_ATTENDANCES);
  const [shifts, setShifts] = useState<HrShiftSchedule[]>(DEFAULT_HR_SHIFTS);
  const [locations, setLocations] = useState<HrGeofenceLocation[]>(DEFAULT_GEOFENCE_LOCATIONS);
  const [corrections, setCorrections] =
    useState<AttendanceCorrectionRequest[]>(INITIAL_CORRECTIONS);
  const [rosters, setRosters] = useState<StoredRosterRecord[]>(INITIAL_ROSTERS);
  const [shiftSwaps, setShiftSwaps] = useState<StoredSwapRecord[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<StoredPublicHolidayRecord[]>(
    DEFAULT_SAUDI_PUBLIC_HOLIDAYS
  );

  const [isRamadanMode, setIsRamadanMode] = useState<boolean>(false);
  const [compensateLateWithStay, setCompensateLateWithStay] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showZktModal, setShowZktModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // ZKTeco / BioTime Real File Upload & Log Parser State
  const zktFileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawBiometricText, setRawBiometricText] = useState<string>('');
  const [uploadedBioFileName, setUploadedBioFileName] = useState<string>('');
  const [uploadedBioLineCount, setUploadedBioLineCount] = useState<number>(0);

  // Manual Attendance Form
  const [manualForm, setManualForm] = useState({
    employee_id: DEFAULT_EMPLOYEES_DIRECTORY[0].id,
    emp_name: DEFAULT_EMPLOYEES_DIRECTORY[0].name,
    department: DEFAULT_EMPLOYEES_DIRECTORY[0].department,
    shift_id: 'SHF-MAIN-FIXED',
    date: new Date().toISOString().slice(0, 10),
    check_in: '08:00',
    check_out: '16:30',
    is_holiday_work: false,
  });

  // Shift Creation Form
  const [shiftForm, setShiftForm] = useState({
    name_ar: '',
    shift_type: 'FIXED' as ShiftType,
    start_time: '08:00',
    end_time: '16:30',
    flexible_window_minutes: 0,
    required_daily_hours: 8,
    grace_in_minutes: 15,
  });

  // Geofence Creation Form
  const [geoForm, setGeoForm] = useState({
    branch_name: '',
    latitude: '24.7985',
    longitude: '46.7832',
    radius_meters: '250',
    allowed_wifi_ssid: 'KAS-BRANCH-WIFI',
    kiosk_access_code: '5566',
  });
  const [isLocatingBranchGps, setIsLocatingBranchGps] = useState(false);

  // Real Live GPS Geofence Verification State
  const [gpsEmpId, setGpsEmpId] = useState<string>(DEFAULT_EMPLOYEES_DIRECTORY[0].id);
  const [gpsCheckOutTime, setGpsCheckOutTime] = useState<string>('16:30');
  const [gpsConnectedWifi, setGpsConnectedWifi] = useState<string>('');
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(false);
  const [gpsErrorBanner, setGpsErrorBanner] = useState<string | null>(null);
  const [gpsSuccessBanner, setGpsSuccessBanner] = useState<{
    message: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
    branchName: string;
  } | null>(null);

  // Kiosk Tablet Mode + Real WebRTC Camera State
  const kioskVideoRef = useRef<HTMLVideoElement | null>(null);
  const kioskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const kioskStreamRef = useRef<MediaStream | null>(null);
  const [kioskCameraStatus, setKioskCameraStatus] = useState<
    'idle' | 'starting' | 'ready' | 'unavailable'
  >('idle');
  const [kioskCameraNotice, setKioskCameraNotice] = useState<string>('');
  const [kioskPreviewDataUrl, setKioskPreviewDataUrl] = useState<string>('');
  const [kioskEmpId, setKioskEmpId] = useState<string>(DEFAULT_EMPLOYEES_DIRECTORY[2].id);
  const [kioskPinInput, setKioskPinInput] = useState('');
  const [kioskBranchId, setKioskBranchId] = useState('GEO-RUH-HQ');

  // Punch Correction Form
  const [corrForm, setCorrForm] = useState({
    employee_id: DEFAULT_EMPLOYEES_DIRECTORY[1].id,
    employee_name: DEFAULT_EMPLOYEES_DIRECTORY[1].name,
    department: DEFAULT_EMPLOYEES_DIRECTORY[1].department,
    target_date: new Date().toISOString().slice(0, 10),
    correction_type: 'MISSING_CHECK_OUT' as AttendanceCorrectionRequest['correction_type'],
    requested_check_in: '08:00',
    requested_check_out: '16:30',
    reason: '',
  });

  // Tab 5: Monthly Shift Roster, Colleague Shift Swap & Saudi Public Holidays State
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [rosterEmpId, setRosterEmpId] = useState<string>(DEFAULT_EMPLOYEES_DIRECTORY[0].id);
  const [rosterDate, setRosterDate] = useState<string>(todayIso);
  const [rosterShiftId, setRosterShiftId] = useState<string>('SHF-MAIN-FIXED');
  const [rosterIsDayOff, setRosterIsDayOff] = useState<boolean>(false);
  const [rosterBranchName, setRosterBranchName] = useState<string>(
    DEFAULT_GEOFENCE_LOCATIONS[0].branch_name
  );

  const [swapRequesterId, setSwapRequesterId] = useState<string>(
    DEFAULT_EMPLOYEES_DIRECTORY[0].id
  );
  const [swapTargetId, setSwapTargetId] = useState<string>(DEFAULT_EMPLOYEES_DIRECTORY[2].id);
  const [swapDate, setSwapDate] = useState<string>(todayIso);
  const [swapRequesterShiftId, setSwapRequesterShiftId] = useState<string>('SHF-MAIN-FIXED');
  const [swapTargetShiftId, setSwapTargetShiftId] = useState<string>('SHF-SHELTER-ROT');
  const [swapReason, setSwapReason] = useState<string>('');
  const [swapErrorMsg, setSwapErrorMsg] = useState<string | null>(null);

  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    holidayCode: 'EID_AL_FITR',
    titleAr: '',
    startDate: '2026-03-20',
    endDate: '2026-03-23',
    overtimeMultiplier: 2.0,
    excludeFromAnnualLeave: true,
  });

  const stopKioskCamera = useCallback(() => {
    if (kioskStreamRef.current) {
      kioskStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Safe track release
        }
      });
      kioskStreamRef.current = null;
    }
    if (kioskVideoRef.current) {
      try {
        kioskVideoRef.current.srcObject = null;
      } catch {
        // Safe video detachment
      }
    }
    setKioskCameraStatus('idle');
  }, []);

  // Manage WebRTC camera lifecycle strictly while Kiosk modal is open
  useEffect(() => {
    if (!showKioskModal) {
      stopKioskCamera();
      setKioskPreviewDataUrl('');
      setKioskCameraNotice('');
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        if (!cancelled) {
          setKioskCameraStatus('unavailable');
          setKioskCameraNotice(
            'الكاميرا الأمامية غير متاحة في هذه البيئة؛ سيتم التحقق عبر رمز محطة الفرع المعتمد.'
          );
        }
        return;
      }

      setKioskCameraStatus('starting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        kioskStreamRef.current = stream;
        if (kioskVideoRef.current) {
          kioskVideoRef.current.srcObject = stream;
        }
        setKioskCameraStatus('ready');
        setKioskCameraNotice('بث الكاميرا الأمامية نشط وجاهز لالتقاط بصمة الوجه وتوثيق تجزئة الإطار.');
      } catch {
        if (!cancelled) {
          setKioskCameraStatus('unavailable');
          setKioskCameraNotice(
            'تعذر الوصول للكاميرا الأمامية على هذا الجهاز (لا توجد كاميرا أو لم يُمنح الإذن)؛ يمكنك المتابعة برمز PIN المعتمد للمحطة.'
          );
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopKioskCamera();
    };
  }, [showKioskModal, stopKioskCamera]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      realErpDataStore.getRecords<CompanyEmployeeOption>(
        'employees',
        DEFAULT_EMPLOYEES_DIRECTORY,
        activeCompanyId !== 'all' ? activeCompanyId : undefined
      ),
      realErpDataStore.getRecords<AttendanceRecordExtended>('attendances', INITIAL_ATTENDANCES),
      realErpDataStore.getRecords<HrShiftSchedule>('hr_shifts', DEFAULT_HR_SHIFTS),
      realErpDataStore.getRecords<HrGeofenceLocation>(
        'hr_geofence_locations',
        DEFAULT_GEOFENCE_LOCATIONS
      ),
      realErpDataStore.getRecords<AttendanceCorrectionRequest>(
        'hr_attendance_corrections',
        INITIAL_CORRECTIONS
      ),
      realErpDataStore.getRecords<StoredRosterRecord>('hr_shift_rosters', INITIAL_ROSTERS),
      realErpDataStore.getRecords<StoredSwapRecord>('hr_shift_swap_requests', []),
      realErpDataStore.getRecords<StoredPublicHolidayRecord>('hr_public_holidays', []),
    ]).then(
      ([empData, attData, shiftData, geoData, corrData, rosterData, swapData, holidayData]) => {
        if (!mounted) return;

        if (Array.isArray(empData) && empData.length > 0) {
          const normalizedEmps = empData.map((e, idx) =>
            normalizeEmployeeOption(e as unknown as Record<string, unknown>, idx)
          );
          setEmployees(normalizedEmps);
          setGpsEmpId(normalizedEmps[0].id);
          setRosterEmpId(normalizedEmps[0].id);
          setSwapRequesterId(normalizedEmps[0].id);
          if (normalizedEmps[1]) {
            setSwapTargetId(normalizedEmps[1].id);
          }
          setKioskEmpId(normalizedEmps[0].id);
          setManualForm((prev) => ({
            ...prev,
            employee_id: normalizedEmps[0].id,
            emp_name: normalizedEmps[0].name,
            department: normalizedEmps[0].department,
          }));
          setCorrForm((prev) => ({
            ...prev,
            employee_id: normalizedEmps[0].id,
            employee_name: normalizedEmps[0].name,
            department: normalizedEmps[0].department,
          }));
        }

        if (Array.isArray(attData) && attData.length > 0) {
          setAttendances(
            attData.map((item, idx) =>
              normalizeAttendanceRecord(item as unknown as Record<string, unknown>, idx)
            )
          );
        }
        if (Array.isArray(shiftData) && shiftData.length > 0) setShifts(shiftData);
        if (Array.isArray(geoData) && geoData.length > 0) {
          setLocations(geoData);
          setRosterBranchName(geoData[0].branch_name);
          setKioskBranchId(geoData[0].id);
        }
        if (Array.isArray(corrData) && corrData.length > 0) setCorrections(corrData);
        if (Array.isArray(rosterData) && rosterData.length > 0) setRosters(rosterData);
        if (Array.isArray(swapData)) setShiftSwaps(swapData);

        if (Array.isArray(holidayData) && holidayData.length > 0) {
          setPublicHolidays(holidayData);
        } else {
          setPublicHolidays(DEFAULT_SAUDI_PUBLIC_HOLIDAYS);
          void realErpDataStore.saveRecords('hr_public_holidays', DEFAULT_SAUDI_PUBLIC_HOLIDAYS);
        }
      }
    );
    return () => {
      mounted = false;
    };
  }, [activeCompanyId]);

  // Synchronize swap requester & target effective shifts when swap participants or date change
  useEffect(() => {
    const reqEmp = employees.find((e) => e.id === swapRequesterId);
    const tgtEmp = employees.find((e) => e.id === swapTargetId);
    if (reqEmp) {
      const resolvedReq = resolveEffectiveShiftForDate(
        reqEmp.id,
        swapDate,
        reqEmp.shift_id || shifts[0]?.id || 'SHF-MAIN-FIXED',
        rosters,
        shiftSwaps
      );
      setSwapRequesterShiftId(resolvedReq.shiftId);
    }
    if (tgtEmp) {
      const resolvedTgt = resolveEffectiveShiftForDate(
        tgtEmp.id,
        swapDate,
        tgtEmp.shift_id || shifts[1]?.id || 'SHF-SHELTER-ROT',
        rosters,
        shiftSwaps
      );
      setSwapTargetShiftId(resolvedTgt.shiftId);
    }
  }, [swapRequesterId, swapTargetId, swapDate, employees, shifts, rosters, shiftSwaps]);

  const activeRosterResolution = useMemo(() => {
    const emp = employees.find((e) => e.id === rosterEmpId) || employees[0];
    const resolved = resolveEffectiveShiftForDate(
      emp?.id || 'emp-101',
      rosterDate,
      emp?.shift_id || shifts[0]?.id || 'SHF-MAIN-FIXED',
      rosters,
      shiftSwaps
    );
    const matchedShift = shifts.find((s) => s.id === resolved.shiftId) || shifts[0];
    const matchedHoliday = findSaudiHolidayForDate(rosterDate, publicHolidays);
    return {
      ...resolved,
      shiftTitle: matchedShift?.name_ar || resolved.shiftId,
      holiday: matchedHoliday,
    };
  }, [rosterEmpId, rosterDate, employees, shifts, rosters, shiftSwaps, publicHolidays]);

  const openEditAttendanceRow = (row: AttendanceRecordExtended) => {
    setEditingAttendanceId(row.id);
    setManualForm({
      employee_id: row.employee_id,
      emp_name: row.emp_name,
      department: row.department,
      shift_id: row.shift_id || shifts[0]?.id || 'SHF-MAIN-FIXED',
      date: row.date,
      check_in: row.check_in,
      check_out: row.check_out,
      is_holiday_work: Boolean(row.is_holiday_work),
    });
    setShowManualModal(true);
  };

  const handleSoftDeleteAttendanceRow = async (
    row: AttendanceRecordExtended,
    reason?: string
  ) => {
    archiveRecordBeforeSoftDelete({
      tableName: 'attendances',
      record: row,
      recordTitle: `دوام ${row.emp_name} — ${row.date}`,
      reason: reason || 'حذف حركة دوام مع حفظ في أرشيف الاستعادة (30 يوماً)',
      companyId: row.company_id || effectiveCompanyId,
    });
    await realErpDataStore.deleteRecord('attendances', row.id, INITIAL_ATTENDANCES);
    setAttendances((prev) => prev.filter((item) => item.id !== row.id));
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'نقل حركة الحضور لسلة المحذوفات',
      message: `تم نقل سجل حضور (${row.emp_name} - ${row.date}) إلى أرشيف الاستعادة لمدة 30 يوماً.`,
    });
  };

  const handleRestoreAttendance = async (entry: RecycleBinEntry) => {
    if (!entry?.payload) return;
    const restored = entry.payload as AttendanceRecordExtended;
    await realErpDataStore.addRecord('attendances', restored, INITIAL_ATTENDANCES);
    setAttendances((prev) => [restored, ...prev]);
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'استعادة سجل الحضور',
      message: `تمت استعادة حركة الحضور (${entry.recordTitle}) بنجاح.`,
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.emp_name.trim()) return;

    const selectedShift =
      shifts.find((s) => s.id === manualForm.shift_id) || shifts[0] || DEFAULT_HR_SHIFTS[0];
    const matchedHoliday = findSaudiHolidayForDate(manualForm.date, publicHolidays);
    const isHolidayFlag = manualForm.is_holiday_work || Boolean(matchedHoliday);

    const evalResult = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: manualForm.check_in,
      checkOut: manualForm.check_out,
      shift: selectedShift,
      isRamadanSeason: isRamadanMode,
      isHolidayOrWeekend: isHolidayFlag,
      compensateLateWithStay,
    });

    if (editingAttendanceId) {
      const prevRec = attendances.find((r) => r.id === editingAttendanceId);
      const updatedPatch: AttendanceRecordExtended = {
        ...(prevRec || ({} as AttendanceRecordExtended)),
        id: editingAttendanceId,
        company_id: prevRec?.company_id || effectiveCompanyId,
        employee_id: manualForm.employee_id || prevRec?.employee_id || `emp-${Date.now().toString().slice(-4)}`,
        emp_name: manualForm.emp_name.trim(),
        department: manualForm.department,
        date: manualForm.date,
        shift_id: selectedShift.id,
        shift_name: selectedShift.name_ar,
        check_in: manualForm.check_in,
        check_out: manualForm.check_out,
        work_hours: evalResult.workHours,
        late_minutes: evalResult.lateMinutes,
        early_leave_minutes: evalResult.earlyLeaveMinutes,
        overtime_minutes: evalResult.overtimeMinutes,
        verification_method: prevRec?.verification_method || 'MANUAL_HR',
        distance_meters: prevRec?.distance_meters ?? 0,
        mock_location_detected: Boolean(prevRec?.mock_location_detected),
        is_holiday_work: isHolidayFlag,
        payroll_synced: false,
        status: evalResult.status,
      };

      if (prevRec) {
        recordFieldLevelChanges({
          tableName: 'attendances',
          recordId: editingAttendanceId,
          recordLabel: `${updatedPatch.emp_name} (${updatedPatch.date})`,
          before: prevRec,
          after: updatedPatch,
          companyId: updatedPatch.company_id,
        });
      }

      const nextList = await realErpDataStore.updateRecord<AttendanceRecordExtended>(
        'attendances',
        editingAttendanceId,
        updatedPatch,
        INITIAL_ATTENDANCES
      );
      setAttendances(nextList);
      setEditingAttendanceId(null);
      setShowManualModal(false);

      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'تحديث حركة الدوام وإعادة الاحتساب',
        message: `تم تحديث بصمة (${updatedPatch.emp_name}) ليوم ${updatedPatch.date} — ساعات العمل: ${updatedPatch.work_hours} س.`,
      });
      return;
    }

    const newRec: AttendanceRecordExtended = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      employee_id: manualForm.employee_id || `emp-${Date.now().toString().slice(-4)}`,
      emp_name: manualForm.emp_name.trim(),
      department: manualForm.department,
      date: manualForm.date,
      shift_id: selectedShift.id,
      shift_name: selectedShift.name_ar,
      check_in: manualForm.check_in,
      check_out: manualForm.check_out,
      work_hours: evalResult.workHours,
      late_minutes: evalResult.lateMinutes,
      early_leave_minutes: evalResult.earlyLeaveMinutes,
      overtime_minutes: evalResult.overtimeMinutes,
      verification_method: 'MANUAL_HR',
      distance_meters: 0,
      mock_location_detected: false,
      is_holiday_work: isHolidayFlag,
      payroll_synced: false,
      status: evalResult.status,
    };

    await realErpDataStore.addRecord('attendances', newRec, INITIAL_ATTENDANCES);
    setAttendances((prev) => [newRec, ...prev]);
    setShowManualModal(false);

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم تسجيل حركة الدوام واحتساب السياسة',
      message: `تم قيد دوام (${newRec.emp_name}) — ساعات العمل: ${newRec.work_hours} س | تأخير: ${newRec.late_minutes} د | إضافي: ${newRec.overtime_minutes} د.`,
    });
  };

  const handleBiometricFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const nonEmptyLines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));

      setUploadedBioFileName(file.name);
      setUploadedBioLineCount(nonEmptyLines.length);
      setRawBiometricText(content);

      notificationPopupEngine.show({
        type: 'hr',
        priority: 'micro',
        companyId: effectiveCompanyId,
        title: 'تمت قراءة ملف جهاز البصمة',
        message: `تم تحميل الملف (${file.name}) بعدد (${nonEmptyLines.length}) سطر بصمة خام جاهز للاستيراد والمطابقة.`,
      });
    };
    reader.onerror = () => {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'critical',
        companyId: effectiveCompanyId,
        title: 'تعذر قراءة ملف جهاز البصمة',
        message: `حدث خطأ أثناء قراءة الملف (${file.name}). يرجى التحقق من ترميز UTF-8 وصيغة الملف.`,
      });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleParseBiometricUpload = async () => {
    const parsed = HrShiftAttendanceEngine.parseBiometricDeviceLog(
      rawBiometricText,
      employees,
      shifts,
      isRamadanMode
    );

    if (parsed.length === 0) {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'تعذر استخلاص حركات بصمة صالحة',
        message:
          'يرجى رفع ملف ZKTeco / BioTime (.dat, .csv, .tsv, .txt) يحتوي على التاريخ بصيغة YYYY-MM-DD ووقت البصمة HH:mm.',
      });
      return;
    }

    const scopedRecords: AttendanceRecordExtended[] = parsed.map((rec) => ({
      ...rec,
      company_id: rec.company_id || effectiveCompanyId,
      is_holiday_work: Boolean(findSaudiHolidayForDate(rec.date, publicHolidays)),
    }));

    for (const rec of scopedRecords) {
      await realErpDataStore.addRecord('attendances', rec, INITIAL_ATTENDANCES);
    }
    setAttendances((prev) => [...scopedRecords, ...prev]);
    setShowZktModal(false);
    setRawBiometricText('');
    setUploadedBioFileName('');
    setUploadedBioLineCount(0);
    if (zktFileInputRef.current) {
      zktFileInputRef.current.value = '';
    }

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'استيراد ومطابقة سجل بصمة ZKTeco / BioTime',
      message: `تم تحليل واستيراد (${scopedRecords.length}) سجلات حضور فعلية في قاعدة البيانات ومطابقة أول دخول وآخر خروج.`,
    });
  };

  const handleSyncAttendanceToPayroll = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const updated = attendances.map((r) => ({ ...r, payroll_synced: true }));
    setAttendances(updated);

    const summary = HrShiftAttendanceEngine.aggregateAttendanceForPayroll(
      currentMonth,
      updated,
      updated.map((u) => {
        const matchedEmp = employees.find((e) => e.id === u.employee_id || e.name === u.emp_name);
        return {
          id: u.employee_id,
          name: u.emp_name,
          salary: matchedEmp?.salary || 8500,
          basic_salary: matchedEmp?.basic_salary,
        };
      })
    );

    await realErpDataStore.saveRecords('attendances', updated);
    await realErpDataStore.saveRecords(
      'hr_attendance_payroll_sync',
      summary.map((s) => ({ ...s, id: `${currentMonth}-${s.employeeId}` }))
    );

    const totalOtHours = summary.reduce((s, x) => s + x.totalOvertimeHours, 0);
    const totalOtAmount = summary.reduce((s, x) => s + x.overtimePayAmount, 0);

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تمت مزامنة الحضور والإضافي مع مسير الرواتب (WPS)',
      message: `تم ترحيل (${updated.length}) سجلات دوام إلى محرك الرواتب بإجمالي عمل إضافي (${totalOtHours.toFixed(1)} ساعة / ⃁ ${totalOtAmount.toLocaleString()}).`,
    });
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.name_ar.trim()) return;
    const newShift: HrShiftSchedule = {
      id: `SHF-${Date.now().toString().slice(-5)}`,
      company_id: effectiveCompanyId,
      name_ar: shiftForm.name_ar.trim(),
      shift_type: shiftForm.shift_type,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      flexible_window_minutes: Number(shiftForm.flexible_window_minutes) || 0,
      required_daily_hours: Number(shiftForm.required_daily_hours) || 8,
      ramadan_daily_hours: 6,
      grace_in_minutes: Number(shiftForm.grace_in_minutes) || 15,
      grace_out_minutes: 10,
      overtime_multiplier: 1.5,
      holiday_overtime_multiplier: 2.0,
      weekend_days: ['Friday', 'Saturday'],
      is_active: true,
    };
    const next = await realErpDataStore.addRecord('hr_shifts', newShift, DEFAULT_HR_SHIFTS);
    setShifts(next);
    setShowShiftModal(false);
    setShiftForm((prev) => ({ ...prev, name_ar: '' }));

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'إضافة وردية عمل جديدة',
      message: `تم اعتماد وردية (${newShift.name_ar}) في محرك الدوام والورديات.`,
    });
  };

  const handleCaptureCurrentBranchCoords = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'critical',
        companyId: effectiveCompanyId,
        title: 'خدمة تحديد المواقع غير مدعومة',
        message: 'المتصفح الحالي لا يوفر واجهة تحديد الموقع الجغرافي (Geolocation API).',
      });
      return;
    }
    setIsLocatingBranchGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingBranchGps(false);
        setGeoForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      () => {
        setIsLocatingBranchGps(false);
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'critical',
          companyId: effectiveCompanyId,
          title: 'تعذر قراءة إحداثيات الجهاز',
          message: 'يرجى منح المتصفح صلاحية الوصول للموقع الجغرافي لالتقاط إحداثيات الفرع.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geoForm.branch_name.trim()) return;
    const newGeo: HrGeofenceLocation = {
      id: `GEO-${Date.now().toString().slice(-5)}`,
      company_id: effectiveCompanyId,
      branch_name: geoForm.branch_name.trim(),
      latitude: parseFloat(geoForm.latitude) || 24.7985,
      longitude: parseFloat(geoForm.longitude) || 46.7832,
      radius_meters: parseInt(geoForm.radius_meters, 10) || 250,
      allowed_wifi_ssid: geoForm.allowed_wifi_ssid.trim() || 'KAS-CORP-WIFI',
      kiosk_enabled: true,
      kiosk_access_code: geoForm.kiosk_access_code || '1234',
      is_active: true,
    };
    const next = await realErpDataStore.addRecord(
      'hr_geofence_locations',
      newGeo,
      DEFAULT_GEOFENCE_LOCATIONS
    );
    setLocations(next);
    setShowGeofenceModal(false);
    setGeoForm((prev) => ({ ...prev, branch_name: '' }));

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تفعيل نطاق سياج جغرافي جديد',
      message: `تم تفعيل النطاق الجغرافي لـ (${newGeo.branch_name}) بنصف قطر ${newGeo.radius_meters} متراً.`,
    });
  };

  const handleRealGeolocationPunch = () => {
    setGpsErrorBanner(null);
    setGpsSuccessBanner(null);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      const msg =
        'متصفح الجهاز الحالي لا يدعم خدمة تحديد الموقع الجغرافي (navigator.geolocation). يتطلب تسجيل البصمة الجغرافية متصفحاً يدعم GPS مع تفعيل صلاحية الموقع.';
      setGpsErrorBanner(msg);
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'critical',
        companyId: effectiveCompanyId,
        title: 'خدمة الموقع الجغرافي غير متوفرة',
        message: msg,
      });
      return;
    }

    setIsAcquiringGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsAcquiringGps(false);
        const { latitude, longitude, accuracy } = position.coords;

        const verifyRes = HrShiftAttendanceEngine.verifyGeofencePunch({
          latitude,
          longitude,
          gpsAccuracyMeters: accuracy,
          connectedWifiSsid: gpsConnectedWifi.trim() || undefined,
          locations,
        });

        if (!verifyRes.allowed) {
          const rejectMsg = `${verifyRes.reasonAr} — إحداثيات جهازك الفعلية (${latitude.toFixed(
            5
          )}, ${longitude.toFixed(5)}) بدقة ±${Math.round(accuracy)} م.`;
          setGpsErrorBanner(rejectMsg);
          notificationPopupEngine.show({
            type: 'hr',
            priority: 'critical',
            companyId: effectiveCompanyId,
            title: 'تم رفض البصمة الجغرافية — خارج نطاق الفرع',
            message: rejectMsg,
          });
          return;
        }

        const emp = employees.find((x) => x.id === gpsEmpId) || employees[0];
        const now = new Date();
        const dateIso = now.toISOString().slice(0, 10);
        const checkInHhMm = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;

        const effectiveShiftRes = resolveEffectiveShiftForDate(
          emp.id,
          dateIso,
          emp.shift_id || shifts[0]?.id || 'SHF-MAIN-FIXED',
          rosters,
          shiftSwaps
        );
        const activeShift =
          shifts.find((s) => s.id === effectiveShiftRes.shiftId) ||
          shifts[0] ||
          DEFAULT_HR_SHIFTS[0];
        const holidayMatch = findSaudiHolidayForDate(dateIso, publicHolidays);

        const evalRes = HrShiftAttendanceEngine.evaluateDailyAttendance({
          checkIn: checkInHhMm,
          checkOut: gpsCheckOutTime || activeShift.end_time,
          shift: activeShift,
          isRamadanSeason: isRamadanMode,
          isHolidayOrWeekend: Boolean(holidayMatch),
          compensateLateWithStay,
        });

        const newPunch: AttendanceRecordExtended = {
          id: `GPS-${Date.now().toString().slice(-6)}`,
          company_id: effectiveCompanyId,
          employee_id: emp.id,
          emp_name: emp.name,
          department: emp.department,
          date: dateIso,
          shift_id: activeShift.id,
          shift_name: activeShift.name_ar,
          check_in: checkInHhMm,
          check_out: gpsCheckOutTime || activeShift.end_time,
          work_hours: evalRes.workHours,
          late_minutes: evalRes.lateMinutes,
          early_leave_minutes: evalRes.earlyLeaveMinutes,
          overtime_minutes: evalRes.overtimeMinutes,
          verification_method: verifyRes.verificationMethod,
          distance_meters: verifyRes.distanceMeters,
          mock_location_detected: verifyRes.mockLocationDetected,
          is_holiday_work: Boolean(holidayMatch),
          payroll_synced: false,
          gps_latitude: Number(latitude.toFixed(6)),
          gps_longitude: Number(longitude.toFixed(6)),
          gps_accuracy_meters: Math.round(accuracy),
          status: evalRes.status,
        };

        await realErpDataStore.addRecord('attendances', newPunch, INITIAL_ATTENDANCES);
        setAttendances((prev) => [newPunch, ...prev]);

        setGpsSuccessBanner({
          message: verifyRes.reasonAr,
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          distanceMeters: verifyRes.distanceMeters,
          branchName: verifyRes.matchedBranchName,
        });

        notificationPopupEngine.show({
          type: 'hr',
          priority: 'actionable',
          companyId: effectiveCompanyId,
          title: 'تم تسجيل الحضور الفعلي عبر السياج الجغرافي (GPS)',
          message: `تم إثبات بصمة (${emp.name}) في (${verifyRes.matchedBranchName}) على مسافة ${verifyRes.distanceMeters} م الساعة ${checkInHhMm}.`,
        });
      },
      (geoErr) => {
        setIsAcquiringGps(false);
        const permissionReason =
          geoErr.code === 1
            ? 'تم حظر صلاحية الوصول للموقع الجغرافي في المتصفح (Permission Denied). يرجى السماح للموقع بالوصول إلى الموقع الجغرافي من إعدادات المتصفح ثم إعادة المحاولة.'
            : geoErr.code === 2
            ? 'تعذر تحديد الموقع الجغرافي الفعلي للجهاز حالياً (Position Unavailable). يرجى التأكد من تفعيل خدمة الموقع في نظام التشغيل.'
            : 'انتهت مهلة الاتصال بخدمة تحديد المواقع (Timeout). يرجى التحقق من إشارة GPS والمحاولة مجدداً.';

        setGpsErrorBanner(permissionReason);
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'critical',
          companyId: effectiveCompanyId,
          title: 'مطلوب إذن الوصول للموقع الجغرافي',
          message: permissionReason,
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const captureKioskFrameAndHash = (empId: string, branchId: string): {
    photoCaptured: boolean;
    photoHash: string;
  } => {
    const videoEl = kioskVideoRef.current;
    const canvasEl = kioskCanvasRef.current;
    const hasLiveStream = Boolean(
      kioskStreamRef.current &&
        kioskStreamRef.current.getTracks().some((t) => t.readyState === 'live')
    );

    if (canvasEl && videoEl && (kioskCameraStatus === 'ready' || hasLiveStream)) {
      try {
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
          const width = canvasEl.width || 320;
          const height = canvasEl.height || 240;
          ctx.drawImage(videoEl, 0, 0, width, height);
          const dataUrl = canvasEl.toDataURL('image/jpeg', 0.7);
          if (dataUrl && dataUrl.length > 32) {
            setKioskPreviewDataUrl(dataUrl);
            return {
              photoCaptured: true,
              photoHash: computeDeterministicPhotoHash(`${empId}|${branchId}|${dataUrl}`),
            };
          }
        }
      } catch {
        // Fallback when headless canvas environment has no 2D rasterizer
      }

      const trackIds = (kioskStreamRef.current?.getTracks() || [])
        .map((t) => t.id || t.label || 'video-track')
        .join(':');
      return {
        photoCaptured: true,
        photoHash: computeDeterministicPhotoHash(
          `${empId}|${branchId}|${trackIds}|${new Date().toISOString().slice(0, 16)}`
        ),
      };
    }

    if (kioskPreviewDataUrl) {
      return {
        photoCaptured: true,
        photoHash: computeDeterministicPhotoHash(`${empId}|${branchId}|${kioskPreviewDataUrl}`),
      };
    }

    return {
      photoCaptured: false,
      photoHash: computeDeterministicPhotoHash(
        `NO-CAM|${empId}|${branchId}|${new Date().toISOString().slice(0, 16)}`
      ),
    };
  };

  const handleCaptureKioskPreviewSnapshot = () => {
    const emp = employees.find((e) => e.id === kioskEmpId) || employees[0];
    const snap = captureKioskFrameAndHash(emp.id, kioskBranchId);
    if (snap.photoCaptured) {
      setKioskCameraNotice(`تم التقاط إطار التحقق الفوري بنجاح — البصمة الرقمية للصورة: ${snap.photoHash}`);
    }
  };

  const handleKioskPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const loc = locations.find((l) => l.id === kioskBranchId) || locations[0];
    if (loc && kioskPinInput.trim() !== loc.kiosk_access_code) {
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'رمز محطة الـ Kiosk غير مطابق',
        message: `يرجى إدخال رمز التحقق المعتمد لمحطة الفرع (${loc.branch_name}) لإتمام البصمة.`,
      });
      return;
    }

    const emp = employees.find((x) => x.id === kioskEmpId) || employees[0];
    const now = new Date();
    const dateIso = now.toISOString().slice(0, 10);
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;

    const frameCapture = captureKioskFrameAndHash(emp.id, loc?.id || 'GEO-RUH-HQ');
    const resolvedShift = resolveEffectiveShiftForDate(
      emp.id,
      dateIso,
      emp.shift_id || shifts[0]?.id || 'SHF-MAIN-FIXED',
      rosters,
      shiftSwaps
    );
    const shiftObj =
      shifts.find((s) => s.id === resolvedShift.shiftId) || shifts[0] || DEFAULT_HR_SHIFTS[0];
    const evalRes = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: hhmm,
      checkOut: shiftObj.end_time,
      shift: shiftObj,
      isRamadanSeason: isRamadanMode,
      isHolidayOrWeekend: Boolean(findSaudiHolidayForDate(dateIso, publicHolidays)),
      compensateLateWithStay,
    });

    const newPunch: AttendanceRecordExtended = {
      id: `KSK-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      employee_id: emp.id,
      emp_name: emp.name,
      department: emp.department,
      date: dateIso,
      shift_id: shiftObj.id,
      shift_name: shiftObj.name_ar,
      check_in: hhmm,
      check_out: shiftObj.end_time,
      work_hours: evalRes.workHours,
      late_minutes: evalRes.lateMinutes,
      early_leave_minutes: evalRes.earlyLeaveMinutes,
      overtime_minutes: evalRes.overtimeMinutes,
      verification_method: 'KIOSK_TABLET',
      distance_meters: 2,
      mock_location_detected: false,
      is_holiday_work: Boolean(findSaudiHolidayForDate(dateIso, publicHolidays)),
      payroll_synced: false,
      kiosk_photo_captured: frameCapture.photoCaptured,
      kiosk_photo_hash: frameCapture.photoHash,
      status: evalRes.status,
    };

    await realErpDataStore.addRecord('attendances', newPunch, INITIAL_ATTENDANCES);
    setAttendances((prev) => [newPunch, ...prev]);
    stopKioskCamera();
    setShowKioskModal(false);
    setKioskPinInput('');

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم إثبات البصمة عبر كشك البصمة الذكي (Smart Kiosk)',
      message: `تم تسجيل حضور (${emp.name}) في (${loc?.branch_name || 'الفرع الرئيسي'}) الساعة ${hhmm} — توثيق الكاميرا: ${frameCapture.photoHash}.`,
    });
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrForm.reason.trim()) return;
    const newCorr: AttendanceCorrectionRequest = {
      id: `COR-${Date.now().toString().slice(-5)}`,
      company_id: effectiveCompanyId,
      employee_id: corrForm.employee_id || `emp-${Date.now().toString().slice(-3)}`,
      employee_name: corrForm.employee_name,
      department: corrForm.department,
      target_date: corrForm.target_date,
      correction_type: corrForm.correction_type,
      requested_check_in: corrForm.requested_check_in,
      requested_check_out: corrForm.requested_check_out,
      reason: corrForm.reason.trim(),
      status: 'بانتظار الموافقة',
      created_at: new Date().toISOString().slice(0, 10),
    };
    const next = await realErpDataStore.addRecord(
      'hr_attendance_corrections',
      newCorr,
      INITIAL_CORRECTIONS
    );
    setCorrections(next);
    setShowCorrectionModal(false);
    setCorrForm((prev) => ({ ...prev, reason: '' }));

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'رفع طلب تصحيح بصمة',
      message: `تم قيد طلب تصحيح البصمة للموظف (${newCorr.employee_name}) بتاريخ ${newCorr.target_date}.`,
    });
  };

  const handleCorrectionDecision = async (
    corr: AttendanceCorrectionRequest,
    decision: 'معتمد' | 'مرفوض'
  ) => {
    const updatedList = await realErpDataStore.updateRecord<AttendanceCorrectionRequest>(
      'hr_attendance_corrections',
      corr.id,
      { status: decision, approved_by: 'مدير الموارد البشرية' },
      INITIAL_CORRECTIONS
    );
    setCorrections(updatedList);

    if (decision === 'معتمد') {
      const shift = shifts[0] || DEFAULT_HR_SHIFTS[0];
      const evalRes = HrShiftAttendanceEngine.evaluateDailyAttendance({
        checkIn: corr.requested_check_in,
        checkOut: corr.requested_check_out,
        shift,
        isRamadanSeason: isRamadanMode,
      });
      const patchedAtt: AttendanceRecordExtended = {
        id: `ATT-COR-${corr.id}`,
        company_id: corr.company_id || effectiveCompanyId,
        employee_id: corr.employee_id,
        emp_name: corr.employee_name,
        department: corr.department,
        date: corr.target_date,
        shift_id: shift.id,
        shift_name: shift.name_ar,
        check_in: corr.requested_check_in,
        check_out: corr.requested_check_out,
        work_hours: evalRes.workHours,
        late_minutes: 0,
        early_leave_minutes: 0,
        overtime_minutes: evalRes.overtimeMinutes,
        verification_method: 'MANUAL_HR',
        distance_meters: 0,
        mock_location_detected: false,
        is_holiday_work: false,
        payroll_synced: false,
        status: 'حاضر',
      };
      await realErpDataStore.addRecord('attendances', patchedAtt, INITIAL_ATTENDANCES);
      setAttendances((prev) => [patchedAtt, ...prev]);
    }

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: decision === 'معتمد' ? 'اعتماد تصحيح البصمة وتحديث السجل' : 'رفض طلب تصحيح البصمة',
      message:
        decision === 'معتمد'
          ? `تم اعتماد تصحيح البصمة لـ (${corr.employee_name}) وإلغاء دقائق التأخير المسجلة.`
          : `تم رفض طلب التصحيح رقم (${corr.id}).`,
    });
  };

  // ============================================================================
  // TAB 5 HANDLERS: MONTHLY ROSTER, COLLEAGUE SHIFT SWAPS & SAUDI HOLIDAYS
  // ============================================================================

  const handleAssignRosterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === rosterEmpId) || employees[0];
    const sh = shifts.find((s) => s.id === rosterShiftId) || shifts[0] || DEFAULT_HR_SHIFTS[0];
    if (!emp || !rosterDate) return;

    const existingForDay = rosters.find(
      (r) => r.employeeId === emp.id && r.rosterDate === rosterDate
    );

    const entry: StoredRosterRecord = {
      id: existingForDay ? existingForDay.id : `RST-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      employeeId: emp.id,
      employeeName: emp.name,
      rosterDate,
      shiftId: sh.id,
      shiftName: rosterIsDayOff ? 'راحة أسبوعية مجدولة' : sh.name_ar,
      isDayOff: rosterIsDayOff,
      branchName: rosterBranchName,
    };

    if (existingForDay) {
      const updated = await realErpDataStore.updateRecord<StoredRosterRecord>(
        'hr_shift_rosters',
        existingForDay.id,
        entry,
        INITIAL_ROSTERS
      );
      setRosters(updated);
    } else {
      const added = await realErpDataStore.addRecord<StoredRosterRecord>(
        'hr_shift_rosters',
        entry,
        INITIAL_ROSTERS
      );
      setRosters(added);
    }

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم تحديث جدول المناوبات الشهري',
      message: `تم تسكين (${emp.name}) ليوم ${rosterDate} على (${entry.shiftName}) في ${rosterBranchName}.`,
    });
  };

  const handleDeleteRosterEntry = async (id: string) => {
    const next = await realErpDataStore.deleteRecord<StoredRosterRecord>(
      'hr_shift_rosters',
      id,
      INITIAL_ROSTERS
    );
    setRosters(next);
  };

  const handleCreateShiftSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwapErrorMsg(null);

    const validation = validateShiftSwapRequest({
      requesterId: swapRequesterId,
      targetEmployeeId: swapTargetId,
      swapDate,
      requesterShiftId: swapRequesterShiftId,
      targetShiftId: swapTargetShiftId,
      existingSwaps: shiftSwaps,
    });

    if (!validation.valid) {
      const errText = validation.reasonAr || 'تعذر التحقق من شروط تبديل الوردية.';
      setSwapErrorMsg(errText);
      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'تعذر قيد طلب تبديل الوردية',
        message: errText,
      });
      return;
    }

    const reqEmp = employees.find((x) => x.id === swapRequesterId) || employees[0];
    const tgtEmp = employees.find((x) => x.id === swapTargetId) || employees[1] || employees[0];

    const newSwap: StoredSwapRecord = {
      id: `SWP-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      requesterId: reqEmp.id,
      requesterName: reqEmp.name,
      targetEmployeeId: tgtEmp.id,
      targetEmployeeName: tgtEmp.name,
      swapDate,
      requesterShiftId: swapRequesterShiftId,
      targetShiftId: swapTargetShiftId,
      reason: swapReason.trim() || 'تبديل مناوبة تشغيلي بالتراضي بين الزميلين',
      colleagueAccepted: true,
      status: 'قيد اعتماد المدير',
      created_at: new Date().toISOString().slice(0, 10),
    };

    const next = await realErpDataStore.addRecord<StoredSwapRecord>(
      'hr_shift_swap_requests',
      newSwap,
      []
    );
    setShiftSwaps(next);
    setSwapReason('');

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم تسجيل طلب تبديل مناوبة بين الزملاء',
      message: `تم رفع طلب تبديل الوردية بين (${reqEmp.name}) و(${tgtEmp.name}) ليوم ${swapDate} لاعتماد المدير.`,
    });
  };

  const handleSwapManagerDecision = async (
    swap: StoredSwapRecord,
    decision: 'معتمد' | 'مرفوض'
  ) => {
    const updatedSwaps = await realErpDataStore.updateRecord<StoredSwapRecord>(
      'hr_shift_swap_requests',
      swap.id,
      { status: decision },
      []
    );
    setShiftSwaps(updatedSwaps);

    const reqShiftObj =
      shifts.find((s) => s.id === swap.requesterShiftId) || shifts[0] || DEFAULT_HR_SHIFTS[0];
    const tgtShiftObj =
      shifts.find((s) => s.id === swap.targetShiftId) || shifts[0] || DEFAULT_HR_SHIFTS[0];

    if (decision === 'معتمد') {
      // Apply approved swap directly into hr_shift_rosters for both employees
      const currentRosters = [...rosters];
      const upsertParticipantRoster = (
        empId: string,
        empName: string,
        assignedShift: HrShiftSchedule,
        suffix: string
      ) => {
        const existingIdx = currentRosters.findIndex(
          (r) => r.employeeId === empId && r.rosterDate === swap.swapDate
        );
        const updatedRecord: StoredRosterRecord = {
          id:
            existingIdx >= 0
              ? currentRosters[existingIdx].id
              : `RST-SWP-${swap.id}-${suffix}`,
          company_id: effectiveCompanyId,
          employeeId: empId,
          employeeName: empName,
          rosterDate: swap.swapDate,
          shiftId: assignedShift.id,
          shiftName: assignedShift.name_ar,
          isDayOff: false,
          branchName:
            existingIdx >= 0
              ? currentRosters[existingIdx].branchName
              : locations[0]?.branch_name || 'المقر الرئيسي',
        };
        if (existingIdx >= 0) {
          currentRosters[existingIdx] = updatedRecord;
        } else {
          currentRosters.unshift(updatedRecord);
        }
      };

      upsertParticipantRoster(swap.requesterId, swap.requesterName, tgtShiftObj, 'REQ');
      upsertParticipantRoster(swap.targetEmployeeId, swap.targetEmployeeName, reqShiftObj, 'TGT');

      await realErpDataStore.saveRecords('hr_shift_rosters', currentRosters);
      setRosters(currentRosters);
    }

    const msgSubject =
      decision === 'معتمد'
        ? `اعتماد تبديل المناوبة ليوم ${swap.swapDate} (${swap.id})`
        : `اعتذار عن اعتماد تبديل المناوبة ليوم ${swap.swapDate} (${swap.id})`;
    const msgBody =
      decision === 'معتمد'
        ? `تم اعتماد تبديل الوردية بتاريخ ${swap.swapDate}: يباشر ${swap.requesterName} على (${tgtShiftObj.name_ar}) ويباشر ${swap.targetEmployeeName} على (${reqShiftObj.name_ar}).`
        : `تم رفض طلب تبديل المناوبة رقم (${swap.id}) ليوم ${swap.swapDate} مع بقاء جدول المناوبات الأصلي دون تغيير.`;

    await realErpDataStore.addRecord('sent_messages', {
      id: `MSG-SWP-${Date.now()}`,
      company_id: effectiveCompanyId,
      recipient: `${swap.requesterName} ، ${swap.targetEmployeeName}`,
      channel: 'إشعار الموارد البشرية الفوري',
      subject: msgSubject,
      content: msgBody,
      status: 'تم الإرسال',
      sent_at: new Date().toISOString(),
    });

    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: msgSubject,
      message: msgBody,
    });
  };

  const handleSavePublicHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.titleAr.trim() || !holidayForm.startDate || !holidayForm.endDate) return;

    if (editingHolidayId) {
      const updated = await realErpDataStore.updateRecord<StoredPublicHolidayRecord>(
        'hr_public_holidays',
        editingHolidayId,
        {
          holidayCode: holidayForm.holidayCode,
          titleAr: holidayForm.titleAr.trim(),
          startDate: holidayForm.startDate,
          endDate: holidayForm.endDate,
          overtimeMultiplier: Number(holidayForm.overtimeMultiplier) || 2.0,
          excludeFromAnnualLeave: holidayForm.excludeFromAnnualLeave,
        },
        DEFAULT_SAUDI_PUBLIC_HOLIDAYS
      );
      setPublicHolidays(updated);
      setEditingHolidayId(null);

      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'تحديث تواريخ العطلة الرسمية المعتمدة',
        message: `تم تحديث (${holidayForm.titleAr.trim()}) للفترة من ${holidayForm.startDate} إلى ${holidayForm.endDate} وربطها بمحرك الإجازات السنوية.`,
      });
    } else {
      const newHoliday: StoredPublicHolidayRecord = {
        id: `HOL-${Date.now().toString().slice(-6)}`,
        company_id: effectiveCompanyId,
        holidayCode: holidayForm.holidayCode,
        titleAr: holidayForm.titleAr.trim(),
        startDate: holidayForm.startDate,
        endDate: holidayForm.endDate,
        overtimeMultiplier: Number(holidayForm.overtimeMultiplier) || 2.0,
        excludeFromAnnualLeave: holidayForm.excludeFromAnnualLeave,
      };
      const added = await realErpDataStore.addRecord<StoredPublicHolidayRecord>(
        'hr_public_holidays',
        newHoliday,
        DEFAULT_SAUDI_PUBLIC_HOLIDAYS
      );
      setPublicHolidays(added);

      notificationPopupEngine.show({
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'إضافة عطلة رسمية لتقويم الموارد البشرية',
        message: `تم اعتماد (${newHoliday.titleAr}) من ${newHoliday.startDate} إلى ${newHoliday.endDate} باستثناء تلقائي من رصيد الإجازات.`,
      });
    }

    setHolidayForm({
      holidayCode: 'EID_AL_FITR',
      titleAr: '',
      startDate: '2026-03-20',
      endDate: '2026-03-23',
      overtimeMultiplier: 2.0,
      excludeFromAnnualLeave: true,
    });
  };

  const startEditHoliday = (hol: StoredPublicHolidayRecord) => {
    setEditingHolidayId(hol.id);
    setHolidayForm({
      holidayCode: hol.holidayCode,
      titleAr: hol.titleAr,
      startDate: hol.startDate,
      endDate: hol.endDate,
      overtimeMultiplier: hol.overtimeMultiplier,
      excludeFromAnnualLeave: hol.excludeFromAnnualLeave,
    });
  };

  const q = searchQuery.toLowerCase();
  const filteredAttendances = useMemo(
    () =>
      attendances.filter(
        (a) =>
          (a.emp_name || '').toLowerCase().includes(q) ||
          (a.department || '').toLowerCase().includes(q) ||
          (a.date || '').toLowerCase().includes(q) ||
          (a.shift_name || '').toLowerCase().includes(q)
      ),
    [attendances, q]
  );

  const totalPresent = attendances.filter((a) => a.status === 'حاضر').length;
  const totalLate = attendances.filter((a) => a.status === 'متأخر').length;
  const totalOvertimeHours = Number(
    (attendances.reduce((s, a) => s + (a.overtime_minutes || 0), 0) / 60).toFixed(1)
  );
  const pendingCorrectionsCount = corrections.filter((c) => c.status === 'بانتظار الموافقة').length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner Header — Mobbin Gallery-White Monochrome */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 text-[#141414] flex flex-row items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:block">
            <BusinessIllustration type="attendance-monitoring" size="sm" showBackground={false} />
          </div>
          <div className="sm:hidden w-11 h-11 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414]">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="pill-tag-shade text-[11px]">
                {i18n.t('hr.biometricAttendance', 'منظومة الوقت والحضور والورديات')}
              </span>
              {isRamadanMode && (
                <span className="px-3 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                  دوام رمضان مفعّل (6 ساعات — م98)
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-[22px] font-bold text-[#141414] m-0">
              إدارة الوقت والحضور والورديات والسياج الجغرافي.
            </h1>
            <p className="text-xs sm:text-[13px] text-[#707070] mt-1 mb-0 font-medium">
              استيراد ملفات ZKTeco الفعلية، البصمة الجغرافية الحية (GPS)، كشك الكاميرا اللوحي (WebRTC Kiosk)، وجدول المناوبات والعطل الرسمية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="button-primary-pill text-xs px-4 py-2 min-h-[38px]"
            onClick={() => setShowZktModal(true)}
          >
            <Upload className="w-4 h-4 ml-1" />
            <span>رفع ملف بصمة ZKTeco</span>
          </button>
          <button
            type="button"
            className="button-outline-on-light text-xs px-4 py-2 min-h-[38px]"
            onClick={() => setShowKioskModal(true)}
          >
            <Tablet className="w-4 h-4 ml-1" />
            <span>وضع الكشك اللوحي Kiosk</span>
          </button>
          <button
            type="button"
            className="button-outline-on-light text-xs px-4 py-2 min-h-[38px]"
            onClick={handleSyncAttendanceToPayroll}
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            <span>ترحيل لمسير الرواتب WPS</span>
          </button>
          <ExportDropdown
            sectionKey="attendances"
            data={filteredAttendances}
            customTitle="سجل الحضور والانصراف والورديات الذكية"
            variant="outline-light"
            buttonLabel="تصدير الكشوفات"
          />
        </div>
      </div>

      {/* KPI Summary Cards — Monochrome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
          <span className="text-xs text-[#707070] font-semibold">المنضبطون بالحضور</span>
          <div className="text-2xl font-bold text-[#141414] mt-1.5">{totalPresent} موظفاً</div>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">
            ضمن فترة السماح المعتمدة
          </span>
        </div>
        <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
          <span className="text-xs text-[#707070] font-semibold">حالات التأخير المرصودة</span>
          <div className="text-2xl font-bold text-[#141414] mt-1.5">{totalLate} حالات</div>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">
            تُرحّل آلياً أو تُعوّض بالبقاء
          </span>
        </div>
        <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
          <span className="text-xs text-[#707070] font-semibold">إجمالي الساعات الإضافية (م107)</span>
          <div className="text-2xl font-bold text-[#141414] mt-1.5">{totalOvertimeHours} ساعة</div>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">
            معامل 150% أيام العمل / 200% العطل
          </span>
        </div>
        <div className="p-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0]">
          <span className="text-xs text-[#707070] font-semibold">طلبات تصحيح البصمة المعلقة</span>
          <div className="text-2xl font-bold text-[#141414] mt-1.5">
            {pendingCorrectionsCount} طلبات
          </div>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">
            مرتبطة بسلسلة الموافقات
          </span>
        </div>
      </div>

      {/* Segmented Pill Navigation (5 Operational Tabs) */}
      <div className="bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] flex items-center gap-1.5 overflow-x-auto">
        {[
          {
            id: 'logs' as const,
            label: `1. سجل الحضور اللحظي (${attendances.length})`,
            icon: Clock,
          },
          {
            id: 'shifts' as const,
            label: `2. جدولة الورديات ورمضان (${shifts.length})`,
            icon: CalendarClock,
          },
          {
            id: 'geofence-kiosk' as const,
            label: `3. السياج الجغرافي وKiosk (${locations.length})`,
            icon: MapPin,
          },
          {
            id: 'corrections' as const,
            label: `4. تصحيح البصمة (${corrections.length})`,
            icon: FileCheck2,
          },
          {
            id: 'roster-holidays' as const,
            label: '5. جدول المناوبات وتبديل الورديات والعطل الرسمية',
            icon: CalendarDays,
          },
          {
            id: 'per-employee-gate' as const,
            label: '6. بصمة وكاميرا وباركود كل موظف على حدة',
            icon: Fingerprint,
          },
          {
            id: 'cutoff-adms' as const,
            label: '7. فترة الإقفال (25–24) والدفع السحابي ADMS',
            icon: Clock,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#141414] text-[#ffffff]'
                  : 'bg-transparent text-[#707070] hover:text-[#141414]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE ATTENDANCE LOGS */}
      {activeTab === 'logs' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-[#707070]" />
              <input
                type="text"
                aria-label="ابحث باسم الموظف أو القسم أو الوردية"
                placeholder="ابحث باسم الموظف، القسم، التاريخ، أو الوردية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-full bg-[#f0f0f0] pr-9 pl-4 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditingAttendanceId(null);
                  setShowManualModal(true);
                }}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل حركة دوام</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(true)}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>طلب تصحيح بصمة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRecycleBin(true)}
                className="px-4 py-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>سلة المحذوفات</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">الوردية</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">الحضور / الانصراف</th>
                  <th className="p-3.5">وسيلة الإثبات</th>
                  <th className="p-3.5">ساعات العمل</th>
                  <th className="p-3.5">تأخير / إضافي</th>
                  <th className="p-3.5">حالة المسير</th>
                  <th className="p-3.5">الانضباط</th>
                  <th className="p-3.5 text-center">التواصل والإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredAttendances.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`} className="hover:bg-[#f3f3f3]/60 transition-colors">
                    <td className="p-3.5 font-bold">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={row.emp_name}
                          role={row.department}
                          departmentId="hr"
                          size="sm"
                          status={row.status === 'حاضر' ? 'online' : 'none'}
                        />
                        <div>
                          <div>{row.emp_name}</div>
                          <div className="text-[11px] text-[#707070] font-normal">
                            {row.department}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-[#707070] font-medium">{row.shift_name}</td>
                    <td className="p-3.5 font-mono">{row.date}</td>
                    <td className="p-3.5 font-mono font-semibold">
                      {row.check_in} ← {row.check_out}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold">
                          {VERIFICATION_LABELS[row.verification_method] || 'بصمة ذكية'}
                        </span>
                        {row.kiosk_photo_hash && (
                          <span className="font-mono text-[10px] text-[#707070]">
                            {row.kiosk_photo_captured ? 'صورة موثقة: ' : ''}
                            {row.kiosk_photo_hash}
                          </span>
                        )}
                        {row.distance_meters > 0 && row.verification_method === 'GPS_GEOFENCE' && (
                          <span className="text-[10px] text-[#707070]">
                            مسافة الفرع: {row.distance_meters} م
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold">{row.work_hours} س</td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <span>تأخير: {row.late_minutes} د</span>
                        <span className="font-bold">إضافي: {row.overtime_minutes} د</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {row.payroll_synced ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                          مرحّل لـ WPS
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#707070] text-[10px] font-bold">
                          قيد التجميع
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        text={row.status}
                        type={
                          row.status === 'حاضر'
                            ? 'success'
                            : row.status === 'متأخر'
                            ? 'warning'
                            : 'danger'
                        }
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <RecordQuickActions
                        sharePayload={{
                          title: `إشعار حركة دوام وبصمة — ${row.emp_name}`,
                          recipientName: row.emp_name,
                          referenceNumber: row.id,
                          entityOrRecord: row,
                          moduleName: 'إدارة الوقت والحضور',
                          summaryLines: [
                            { label: 'التاريخ', value: row.date },
                            { label: 'الوردية', value: row.shift_name },
                            { label: 'الحضور / الانصراف', value: `${row.check_in} ← ${row.check_out}` },
                            { label: 'ساعات العمل', value: `${row.work_hours} ساعة` },
                            { label: 'الانضباط', value: row.status },
                          ],
                        }}
                        onEdit={() => openEditAttendanceRow(row)}
                        onDelete={(reason) => void handleSoftDeleteAttendanceRow(row, reason)}
                        deleteConfirmTitle={`نقل حركة دوام (${row.emp_name} — ${row.date}) إلى سلة المحذوفات؟`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SHIFTS & RAMADAN SCHEDULE */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#141414] m-0">
                سياسات الدوام المرن ودوام شهر رمضان المبارك (المادة 98)
              </h2>
              <p className="text-xs text-[#707070] m-0">
                عند تفعيل وضع رمضان، يخفض المحرك ساعات العمل اليومية للموظفين المسلمين إلى 6 ساعات آلياً ويحتسب ما زاد عنها كعمل إضافي.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const next = !isRamadanMode;
                  setIsRamadanMode(next);
                  notificationPopupEngine.show({
                    type: 'hr',
                    priority: 'actionable',
                    companyId: effectiveCompanyId,
                    title: next
                      ? 'تفعيل جدول دوام رمضان (6 ساعات)'
                      : 'العودة لجدول الدوام القياسي (8 ساعات)',
                    message: next
                      ? 'تم خفض نصاب الساعات اليومي إلى 6 ساعات تلقائياً وفق المادة 98 من نظام العمل السعودي.'
                      : 'تمت استعادة ساعات الورديات القياسية (8 ساعات يومياً).',
                  });
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  isRamadanMode
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]'
                }`}
              >
                {isRamadanMode ? 'إيقاف وضع رمضان (نشط حالياً)' : 'تفعيل دوام رمضان التلقائي'}
              </button>

              <button
                type="button"
                onClick={() => setCompensateLateWithStay((v) => !v)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  compensateLateWithStay
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]'
                }`}
              >
                {compensateLateWithStay
                  ? 'تعويض التأخير بالبقاء: مفعّل'
                  : 'تعويض التأخير بالبقاء: متوقف'}
              </button>

              <button
                type="button"
                onClick={() => setShowShiftModal(true)}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة وردية جديدة</span>
              </button>

              <ExportDropdown
                sectionKey="hr_shifts"
                data={shifts}
                customTitle="جدول الورديات وسياسات الدوام"
                variant="outline-light"
                buttonLabel="تصدير الورديات"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((sh) => (
              <div
                key={sh.id}
                className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-mono font-bold">
                      {sh.shift_type}
                    </span>
                    <span className="text-[11px] font-mono text-[#707070]">{sh.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#141414] m-0">{sh.name_ar}</h3>
                </div>

                <div className="space-y-1.5 text-xs bg-[#f3f3f3] p-3.5 rounded-[16px]">
                  <div className="flex justify-between">
                    <span className="text-[#707070]">أوقات الدوام:</span>
                    <span className="font-mono font-bold">
                      {sh.start_time} — {sh.end_time}
                      {sh.second_period_start
                        ? ` | ${sh.second_period_start} — ${sh.second_period_end}`
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#707070]">ساعات العمل / رمضان:</span>
                    <span className="font-bold">
                      {sh.required_daily_hours} س / {sh.ramadan_daily_hours} س
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#707070]">سماح الحضور الصباحي:</span>
                    <span className="font-bold">{sh.grace_in_minutes} دقيقة</span>
                  </div>
                  {sh.flexible_window_minutes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#707070]">نافذة المرونة:</span>
                      <span className="font-bold">{sh.flexible_window_minutes} دقيقة</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REAL GPS GEOFENCING & SMART WEBRTC KIOSK */}
      {activeTab === 'geofence-kiosk' && (
        <div className="space-y-4">
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#141414] m-0">
                  التحقق الجغرافي المباشر من موقع الجهاز الفعلي (Live Browser Geolocation Guard)
                </h2>
                <p className="text-xs text-[#707070] mt-1 mb-0">
                  يقرأ النظام إحداثيات الجهاز الحية عبر مستشعر المتصفح الفعلي ويطابقها بمعادلة Haversine مع مواقع الفروع المعتمدة قبل قيد الحضور في قاعدة البيانات.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGeofenceModal(true)}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موقع فرع / مشروع</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#f3f3f3] p-4 rounded-[16px] border border-[#e0e0e0] items-end">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">الموظف المباشر</label>
                <select
                  value={gpsEmpId}
                  onChange={(e) => setGpsEmpId(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  وقت الانصراف المجدول
                </label>
                <input
                  type="time"
                  value={gpsCheckOutTime}
                  onChange={(e) => setGpsCheckOutTime(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-mono text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  معرف شبكة Wi-Fi الفرع (اختياري)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={gpsConnectedWifi}
                  onChange={(e) => setGpsConnectedWifi(e.target.value)}
                  placeholder="KAS-HQ-CORP-5G"
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-mono text-[#141414]"
                />
              </div>

              <button
                type="button"
                disabled={isAcquiringGps}
                onClick={handleRealGeolocationPunch}
                className="h-10 px-4 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LocateFixed className="w-4 h-4" />
                <span>
                  {isAcquiringGps
                    ? 'جارٍ قراءة إحداثيات الجهاز...'
                    : 'إثبات البصمة الجغرافية الفعلية (GPS)'}
                </span>
              </button>
            </div>

            {gpsErrorBanner && (
              <div className="p-4 rounded-[16px] bg-[#141414] text-[#ffffff] text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">تنبيه تشغيلي للتحقق الجغرافي وإذن الموقع:</div>
                  <div className="text-[11px] text-[#e0e0e0] mt-1 leading-relaxed">
                    {gpsErrorBanner}
                  </div>
                </div>
              </div>
            )}

            {gpsSuccessBanner && (
              <div className="p-4 rounded-[16px] bg-[#f3f3f3] border border-[#141414] text-xs text-[#141414] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#141414]" />
                  <span>{gpsSuccessBanner.message}</span>
                </div>
                <div className="font-mono text-[11px] text-[#707070]">
                  Lat: {gpsSuccessBanner.latitude.toFixed(5)} | Lng:{' '}
                  {gpsSuccessBanner.longitude.toFixed(5)} | الدقة: ±{gpsSuccessBanner.accuracy}م
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#141414]" />
                    <h3 className="text-sm font-bold text-[#141414] m-0">{loc.branch_name}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                    نطاق {loc.radius_meters} متر
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-[#f3f3f3] p-3 rounded-[16px]">
                  <div>
                    <span className="text-[#707070] block text-[11px]">الإحداثيات (Lat, Lng)</span>
                    <strong className="font-mono">
                      {loc.latitude}, {loc.longitude}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#707070] block text-[11px]">شبكة Wi-Fi المعتمدة</span>
                    <strong className="font-mono inline-flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> {loc.allowed_wifi_ssid}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#707070] block text-[11px]">رمز محطة Kiosk اللوحية</span>
                    <strong className="font-mono">PIN: {loc.kiosk_access_code}</strong>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setKioskBranchId(loc.id);
                        setShowKioskModal(true);
                      }}
                      className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>تشغيل كشك الكاميرا</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PUNCH CORRECTIONS */}
      {activeTab === 'corrections' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] overflow-hidden">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414] m-0">
                طلبات تصحيح البصمة والمهام الميدانية الخارجية
              </h2>
              <p className="text-xs text-[#707070] mt-0.5 mb-0">
                اعتماد الطلب يحدّث سجل الحضور تلقائياً ويزيل خصم التأخير قبل إغلاق مسير الرواتب.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCorrectionModal(true)}
              className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تقديم طلب تصحيح</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">تاريخ الحركة</th>
                  <th className="p-3.5">نوع التصحيح</th>
                  <th className="p-3.5">الوقت المطلوب</th>
                  <th className="p-3.5">المبرر النظامي</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {corrections.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f3f3f3]/50">
                    <td className="p-3.5 font-mono font-bold">{c.id}</td>
                    <td className="p-3.5 font-bold">{c.employee_name}</td>
                    <td className="p-3.5 font-mono">{c.target_date}</td>
                    <td className="p-3.5">{CORRECTION_TYPE_LABELS[c.correction_type]}</td>
                    <td className="p-3.5 font-mono">
                      {c.requested_check_in} ← {c.requested_check_out}
                    </td>
                    <td className="p-3.5 text-[#707070] max-w-xs">{c.reason}</td>
                    <td className="p-3.5">
                      <Badge
                        text={c.status}
                        type={
                          c.status === 'معتمد'
                            ? 'success'
                            : c.status === 'مرفوض'
                            ? 'danger'
                            : 'warning'
                        }
                      />
                    </td>
                    <td className="p-3.5">
                      {c.status === 'بانتظار الموافقة' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCorrectionDecision(c, 'معتمد')}
                            className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                          >
                            اعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCorrectionDecision(c, 'مرفوض')}
                            className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#707070]">تم البت</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MONTHLY ROSTER, SHIFT SWAPS & SAUDI OFFICIAL HOLIDAYS */}
      {activeTab === 'roster-holidays' && (
        <div className="space-y-6">
          {/* Section 5.1: Monthly Shift Roster Assignment */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-[#141414] m-0">
                  جدول تسكين المناوبات الشهري واليومي للموظفين
                </h2>
                <p className="text-xs text-[#707070] mt-1 mb-0">
                  تسكين فعلي للموظفين على الورديات وأيام الراحة الأسبوعية مع أولوية حسم الوردية الفعالة (تبديل معتمد ← جدول المناوبة ← الوردية الأساسية).
                </p>
              </div>
              <ExportDropdown
                sectionKey="hr_shift_rosters"
                data={rosters}
                customTitle="جدول تسكين المناوبات الشهرية اليومية للموظفين"
                variant="outline-light"
                buttonLabel="تصدير جدول المناوبات"
              />
            </div>

            <form
              onSubmit={handleAssignRosterEntry}
              className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#f3f3f3] p-4 rounded-[16px] border border-[#e0e0e0] items-end"
            >
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">الموظف</label>
                <select
                  value={rosterEmpId}
                  onChange={(e) => setRosterEmpId(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">التاريخ</label>
                <input
                  type="date"
                  value={rosterDate}
                  onChange={(e) => setRosterDate(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-mono text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">الوردية المسندة</label>
                <select
                  value={rosterShiftId}
                  disabled={rosterIsDayOff}
                  onChange={(e) => setRosterShiftId(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">موقع الفرع</label>
                <select
                  value={rosterBranchName}
                  onChange={(e) => setRosterBranchName(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.branch_name}>
                      {loc.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141414] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rosterIsDayOff}
                    onChange={(e) => setRosterIsDayOff(e.target.checked)}
                    className="accent-[#141414]"
                  />
                  <span>يوم راحة أسبوعية</span>
                </label>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تسكين المناوبة</span>
                </button>
              </div>
            </form>

            {/* Effective Shift Live Resolution Strip */}
            <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-semibold text-[#141414]">
                الوردية الفعالة السارية للموظف المختار ليوم{' '}
                <span className="font-mono font-bold">{rosterDate}</span>:{' '}
                <strong>
                  {activeRosterResolution.isDayOff
                    ? 'راحة أسبوعية معتمدة'
                    : activeRosterResolution.shiftTitle}
                </strong>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  text={
                    activeRosterResolution.source === 'SWAP'
                      ? 'المصدر: تبديل وردية معتمد'
                      : activeRosterResolution.source === 'ROSTER'
                      ? 'المصدر: جدول المناوبات'
                      : 'المصدر: الوردية الأساسية'
                  }
                  type="primary"
                />
                {activeRosterResolution.holiday && (
                  <Badge
                    text={`يصادف عطلة رسمية: ${activeRosterResolution.holiday.titleAr}`}
                    type="warning"
                  />
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414]">
                    <th className="p-3 font-bold">المرجع</th>
                    <th className="p-3 font-bold">الموظف</th>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">الوردية / الحالة</th>
                    <th className="p-3 font-bold">الفرع</th>
                    <th className="p-3 font-bold">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {rosters.map((r) => (
                    <tr key={r.id}>
                      <td className="p-3 font-mono font-bold">{r.id}</td>
                      <td className="p-3 font-bold">{r.employeeName}</td>
                      <td className="p-3 font-mono">{r.rosterDate}</td>
                      <td className="p-3">
                        <Badge
                          text={r.isDayOff ? 'راحة أسبوعية' : r.shiftName}
                          type={r.isDayOff ? 'warning' : 'success'}
                        />
                      </td>
                      <td className="p-3 text-[#707070]">{r.branchName || 'المقر الرئيسي'}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteRosterEntry(r.id)}
                          aria-label="حذف المناوبة"
                          className="p-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] hover:bg-[#e0e0e0] cursor-pointer"
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

          {/* Section 5.2: Colleague Shift Swap Management */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreateShiftSwapRequest}
              className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
            >
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#141414]" />
                <h3 className="text-sm font-black text-[#141414] m-0">
                  تقديم طلب تبديل وردية بين زميلين
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    الموظف طالب التبديل
                  </label>
                  <select
                    value={swapRequesterId}
                    onChange={(e) => setSwapRequesterId(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    الزميل البديل
                  </label>
                  <select
                    value={swapTargetId}
                    onChange={(e) => setSwapTargetId(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  تاريخ التبديل المستهدف
                </label>
                <input
                  type="date"
                  value={swapDate}
                  onChange={(e) => setSwapDate(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-mono text-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    وردية الموظف الطالب
                  </label>
                  <select
                    value={swapRequesterShiftId}
                    onChange={(e) => setSwapRequesterShiftId(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    وردية الزميل البديل
                  </label>
                  <select
                    value={swapTargetShiftId}
                    onChange={(e) => setSwapTargetShiftId(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">مبرر التبديل</label>
                <input
                  type="text"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="مثال: تغطية فترة المساء لظرف عائلي بموافقة الزميل"
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs text-[#141414]"
                />
              </div>

              {swapErrorMsg && (
                <div className="p-3 rounded-[16px] bg-[#141414] text-[#ffffff] text-xs font-semibold">
                  {swapErrorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>فحص التعارض ورفع طلب التبديل</span>
              </button>
            </form>

            <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
              <h3 className="text-sm font-black text-[#141414] mb-4">
                قرارات اعتماد تبديل المناوبات ({shiftSwaps.length})
              </h3>

              {shiftSwaps.length === 0 ? (
                <div className="p-8 rounded-[16px] bg-[#f3f3f3] text-center text-xs text-[#707070]">
                  لا توجد طلبات تبديل ورديات معلقة حالياً. عند اعتماد أي طلب، يحدّث النظام جدول المناوبات الشهري ويرسل إشعاراً رسمياً للزميلين.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#e0e0e0] text-[#707070]">
                        <th className="py-2 px-2 font-bold">الرقم</th>
                        <th className="py-2 px-2 font-bold">الزميلان</th>
                        <th className="py-2 px-2 font-bold">التاريخ والورديتان</th>
                        <th className="py-2 px-2 font-bold">الحالة</th>
                        <th className="py-2 px-2 font-bold">قرار المدير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f0f0]">
                      {shiftSwaps.map((sw) => {
                        const shA = shifts.find((s) => s.id === sw.requesterShiftId);
                        const shB = shifts.find((s) => s.id === sw.targetShiftId);
                        return (
                          <tr key={sw.id}>
                            <td className="py-2.5 px-2 font-mono font-bold">{sw.id}</td>
                            <td className="py-2.5 px-2">
                              <div className="font-bold text-[#141414]">{sw.requesterName}</div>
                              <div className="text-[11px] text-[#707070]">
                                ⇄ {sw.targetEmployeeName}
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="font-mono font-semibold">{sw.swapDate}</div>
                              <div className="text-[10px] text-[#707070]">
                                {shA?.name_ar || sw.requesterShiftId} ⇄{' '}
                                {shB?.name_ar || sw.targetShiftId}
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <Badge
                                text={sw.status}
                                type={
                                  sw.status === 'معتمد'
                                    ? 'success'
                                    : sw.status === 'مرفوض'
                                    ? 'danger'
                                    : 'warning'
                                }
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              {sw.status === 'قيد اعتماد المدير' ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSwapManagerDecision(sw, 'معتمد')}
                                    className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                                  >
                                    اعتماد وتطبيق
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSwapManagerDecision(sw, 'مرفوض')}
                                    className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[10px] font-bold cursor-pointer"
                                  >
                                    رفض
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-[#707070]">تم التنفيذ</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Section 5.3: Official Saudi Public Holidays Calendar Manager */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#141414] m-0">
                التقويم الرسمي للعطل والأعياد الوطنية السعودية (المادة 109 و112)
              </h3>
              <p className="text-xs text-[#707070] mt-1 mb-0">
                تُستثنى أيام العطل الرسمية المعتمدة أدناه تلقائياً من خصم رصيد الإجازات السنوية للموظفين، ويُحتسب العمل خلالها بمعامل الأجر الإضافي المعتمد.
              </p>
            </div>

            <form
              onSubmit={handleSavePublicHoliday}
              className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-[#f3f3f3] p-4 rounded-[16px] border border-[#e0e0e0] items-end"
            >
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">تصنيف المناسبة</label>
                <select
                  value={holidayForm.holidayCode}
                  onChange={(e) =>
                    setHolidayForm({ ...holidayForm, holidayCode: e.target.value })
                  }
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                >
                  <option value="EID_AL_FITR">عيد الفطر المبارك</option>
                  <option value="EID_AL_ADHA">عيد الأضحى المبارك</option>
                  <option value="FOUNDING_DAY">يوم التأسيس السعودي</option>
                  <option value="NATIONAL_DAY">اليوم الوطني السعودي</option>
                  <option value="OFFICIAL_HOLIDAY">عطلة رسمية استثنائية</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  مسمى العطلة الرسمية *
                </label>
                <input
                  type="text"
                  required
                  value={holidayForm.titleAr}
                  onChange={(e) => setHolidayForm({ ...holidayForm, titleAr: e.target.value })}
                  placeholder="مثال: إجازة عيد الفطر المبارك 1448هـ"
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">من تاريخ</label>
                <input
                  type="date"
                  required
                  value={holidayForm.startDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, startDate: e.target.value })}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-mono text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  required
                  value={holidayForm.endDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                  className="w-full h-10 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-xs font-mono text-[#141414]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#141414] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={holidayForm.excludeFromAnnualLeave}
                    onChange={(e) =>
                      setHolidayForm({
                        ...holidayForm,
                        excludeFromAnnualLeave: e.target.checked,
                      })
                    }
                    className="accent-[#141414]"
                  />
                  <span>استثناء من الإجازة السنوية</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 h-10 px-3 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                  >
                    {editingHolidayId ? 'حفظ التعديل' : 'إضافة العطلة'}
                  </button>
                  {editingHolidayId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHolidayId(null);
                        setHolidayForm({
                          holidayCode: 'EID_AL_FITR',
                          titleAr: '',
                          startDate: '2026-03-20',
                          endDate: '2026-03-23',
                          overtimeMultiplier: 2.0,
                          excludeFromAnnualLeave: true,
                        });
                      }}
                      className="h-10 px-3 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {publicHolidays.map((hol) => (
                <div
                  key={hol.id}
                  className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-[#141414]">{hol.titleAr}</span>
                      <Badge
                        text={`معامل إضافي ${Math.round(hol.overtimeMultiplier * 100)}%`}
                        type="shade"
                      />
                    </div>
                    <div className="font-mono text-xs text-[#707070]">
                      {hol.startDate} ← {hol.endDate}
                    </div>
                    <div className="text-[11px] text-[#707070]">
                      {hol.excludeFromAnnualLeave
                        ? 'لا تُخصم من رصيد الإجازة السنوية عند التقاطع (م109)'
                        : 'داخلة ضمن الأيام التقويمية'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditHoliday(hol)}
                    className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل التواريخ</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PER-EMPLOYEE BIOMETRIC, LIVE CAMERA & BARCODE INDIVIDUAL VERIFICATION */}
      {activeTab === 'per-employee-gate' && (
        <PerEmployeeBiometricVerificationHub />
      )}

      {/* TAB 7: ATTENDANCE CUT-OFF PERIOD (25th-24th), PERMISSION QUOTA & ADMS CLOUD PUSH */}
      {activeTab === 'cutoff-adms' && (
        <AttendanceCutoffAndAdmsHub
          companyId={effectiveCompanyId}
          employees={employees.map((e) => ({
            id: e.id,
            name: e.name,
            grossSalary: e.salary,
          }))}
        />
      )}

      {/* MODAL 1: ZKTeco / BioTime Real FileReader Upload & Parser */}
      {showZktModal && (
        <div
          className="fixed inset-0 bg-[#141414]/60 z-[2200] flex items-center justify-center p-4"
          onClick={() => setShowZktModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] w-full max-w-lg border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="font-bold text-sm text-[#141414]">
                استيراد ملفات أجهزة البصمة الفعلية (ZKTeco / BioTime .DAT & CSV)
              </span>
              <button
                type="button"
                onClick={() => setShowZktModal(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#707070] m-0">
                ارفع ملف جهاز البصمة المستخرج من ZKTeco أو BioTime بصيغة (.dat, .csv, .tsv, .txt) ليقوم المحرك بقراءته عبر FileReader وتجميع أول دخول وآخر خروج لكل موظف:
              </p>

              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] hover:bg-[#e0e0e0] cursor-pointer transition-colors text-xs font-bold text-[#141414]">
                <Upload className="w-5 h-5 text-[#141414]" />
                <span>
                  {uploadedBioFileName
                    ? `الملف المحمّل: ${uploadedBioFileName} (${uploadedBioLineCount} سطر)`
                    : 'اختر ملف بصمة ZKTeco / BioTime من جهازك (.dat, .csv, .tsv, .txt)'}
                </span>
                <input
                  ref={zktFileInputRef}
                  type="file"
                  accept=".dat,.csv,.tsv,.txt"
                  onChange={handleBiometricFileUpload}
                  className="hidden"
                />
              </label>

              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  محتوى سجل البصمة المقروء من الملف أو الملصق من الطرفية:
                </label>
                <textarea
                  rows={5}
                  value={rawBiometricText}
                  onChange={(e) => setRawBiometricText(e.target.value)}
                  dir="ltr"
                  placeholder={'EMP-101\t2026-11-14 07:55:00\t1\t0\nEMP-101\t2026-11-14 16:35:00\t1\t0'}
                  className="w-full rounded-[16px] bg-[#f0f0f0] p-3 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowZktModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleParseBiometricUpload}
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تحليل وحفظ البصمات في السجل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual / Edit Attendance Entry */}
      {showManualModal && (
        <div
          className="fixed inset-0 bg-[#141414]/60 z-[2200] flex items-center justify-center p-4"
          onClick={() => {
            setShowManualModal(false);
            setEditingAttendanceId(null);
          }}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] w-full max-w-md border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="font-bold text-sm text-[#141414]">
                {editingAttendanceId
                  ? `تعديل حركة حضور وانصراف (${editingAttendanceId})`
                  : 'تسجيل حركة حضور وانصراف'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowManualModal(false);
                  setEditingAttendanceId(null);
                }}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اختر الموظف من السجل *</label>
                <select
                  value={manualForm.employee_id}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    if (emp) {
                      setManualForm({
                        ...manualForm,
                        employee_id: emp.id,
                        emp_name: emp.name,
                        department: emp.department,
                      });
                    }
                  }}
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-bold"
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
                  <label className="block font-bold mb-1">الوردية المطبقة</label>
                  <select
                    value={manualForm.shift_id}
                    onChange={(e) => setManualForm({ ...manualForm, shift_id: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">وقت الحضور</label>
                  <input
                    type="time"
                    value={manualForm.check_in}
                    onChange={(e) => setManualForm({ ...manualForm, check_in: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">وقت الانصراف</label>
                  <input
                    type="time"
                    value={manualForm.check_out}
                    onChange={(e) => setManualForm({ ...manualForm, check_out: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualForm.is_holiday_work}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, is_holiday_work: e.target.checked })
                  }
                />
                <span>عمل في عطلة رسمية / نهاية أسبوع (يُحتسب كامل الوقت إضافياً بمعامل 200%)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ واحتساب تلقائي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Shift */}
      {showShiftModal && (
        <div
          className="fixed inset-0 bg-[#141414]/60 z-[2200] flex items-center justify-center p-4"
          onClick={() => setShowShiftModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] w-full max-w-md border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="font-bold text-sm text-[#141414]">تعريف وردية عمل جديدة</span>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم الوردية *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.name_ar}
                  onChange={(e) => setShiftForm({ ...shiftForm, name_ar: e.target.value })}
                  placeholder="مثال: الوردية المسائية — مركز الاتصال"
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">نمط الوردية</label>
                  <select
                    value={shiftForm.shift_type}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, shift_type: e.target.value as ShiftType })
                    }
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  >
                    <option value="FIXED">ثابت (FIXED)</option>
                    <option value="FLEXIBLE">مرن (FLEXIBLE)</option>
                    <option value="ROTATING">متناوب (ROTATING)</option>
                    <option value="SPLIT">فترتين (SPLIT)</option>
                    <option value="RAMADAN">رمضان 6 ساعات</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">فترة السماح (دقيقة)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={shiftForm.grace_in_minutes}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, grace_in_minutes: Number(e.target.value) })
                    }
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">بداية الدوام</label>
                  <input
                    type="time"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">نهاية الدوام</label>
                  <input
                    type="time"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  اعتماد الوردية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Geofence Location */}
      {showGeofenceModal && (
        <div
          className="fixed inset-0 bg-[#141414]/60 z-[2200] flex items-center justify-center p-4"
          onClick={() => setShowGeofenceModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] w-full max-w-md border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="font-bold text-sm text-[#141414]">
                إضافة نطاق سياج جغرافي (Geofence)
              </span>
              <button
                type="button"
                onClick={() => setShowGeofenceModal(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateGeofence} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم الفرع أو موقع المشروع *</label>
                <input
                  type="text"
                  required
                  value={geoForm.branch_name}
                  onChange={(e) => setGeoForm({ ...geoForm, branch_name: e.target.value })}
                  placeholder="مثال: معرض كاس التجاري — شمال الرياض"
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                />
              </div>
              <button
                type="button"
                onClick={handleCaptureCurrentBranchCoords}
                disabled={isLocatingBranchGps}
                className="w-full py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>
                  {isLocatingBranchGps
                    ? 'جارٍ التقاط إحداثيات الموقع...'
                    : 'التقاط إحداثيات موقعي الفعلي الحالي (GPS)'}
                </span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">خط العرض (Latitude)</label>
                  <input
                    type="text"
                    value={geoForm.latitude}
                    onChange={(e) => setGeoForm({ ...geoForm, latitude: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">خط الطول (Longitude)</label>
                  <input
                    type="text"
                    value={geoForm.longitude}
                    onChange={(e) => setGeoForm({ ...geoForm, longitude: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">نصف القطر المسموح (متر)</label>
                  <input
                    type="number"
                    value={geoForm.radius_meters}
                    onChange={(e) => setGeoForm({ ...geoForm, radius_meters: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">شبكة Wi-Fi المعتمدة</label>
                  <input
                    type="text"
                    value={geoForm.allowed_wifi_ssid}
                    onChange={(e) => setGeoForm({ ...geoForm, allowed_wifi_ssid: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ النطاق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Shared Tablet Kiosk Mode with Real WebRTC Camera Verification */}
      {showKioskModal && (
        <div
          className="fixed inset-0 bg-[#141414]/70 z-[2250] flex items-center justify-center p-4"
          onClick={() => {
            stopKioskCamera();
            setShowKioskModal(false);
          }}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] w-full max-w-md border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-[#141414] text-[#ffffff] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tablet className="w-5 h-5" />
                <span className="font-bold text-sm">
                  وضع الكشك اللوحي والتحقق بالكاميرا (WebRTC Kiosk)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopKioskCamera();
                  setShowKioskModal(false);
                }}
                className="text-[#ffffff] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleKioskPunch} className="p-5 space-y-3.5 text-xs">
              {/* Live WebRTC Video Preview + Hidden Frame Capture Canvas */}
              <div className="rounded-[16px] bg-[#141414] p-2.5 text-[#ffffff] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    <Camera className="w-3.5 h-3.5" />
                    <span>معاينة الكاميرا الأمامية المباشرة</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#262626] text-[10px] font-mono">
                    {kioskCameraStatus === 'ready'
                      ? 'LIVE WEBRTC'
                      : kioskCameraStatus === 'starting'
                      ? 'CONNECTING'
                      : 'PIN VERIFIED'}
                  </span>
                </div>

                <video
                  ref={kioskVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-40 object-cover rounded-[12px] bg-[#262626]"
                />
                <canvas ref={kioskCanvasRef} width={320} height={240} className="hidden" />

                {kioskCameraNotice && (
                  <p className="text-[11px] text-[#e0e0e0] m-0 leading-relaxed">
                    {kioskCameraNotice}
                  </p>
                )}

                {kioskCameraStatus === 'ready' && (
                  <button
                    type="button"
                    onClick={handleCaptureKioskPreviewSnapshot}
                    className="w-full py-1.5 rounded-full bg-[#262626] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                  >
                    التقاط إطار التحقق المسبق
                  </button>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1">موقع محطة الاستقبال</label>
                <select
                  value={kioskBranchId}
                  onChange={(e) => setKioskBranchId(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-bold"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.branch_name} (رمز المحطة: {l.kiosk_access_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">الموظف المباشر</label>
                <select
                  value={kioskEmpId}
                  onChange={(e) => setKioskEmpId(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-bold"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">رمز محطة الفرع المعتمد (PIN) *</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={kioskPinInput}
                  onChange={(e) => setKioskPinInput(e.target.value)}
                  placeholder="أدخل رمز المحطة المعتمد للفرع"
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-mono tracking-widest"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-[#141414] text-[#ffffff] font-bold text-xs cursor-pointer"
              >
                التقاط إطار الكاميرا وتأكيد بصمة الحضور الفورية
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Punch Correction Request */}
      {showCorrectionModal && (
        <div
          className="fixed inset-0 bg-[#141414]/60 z-[2200] flex items-center justify-center p-4"
          onClick={() => setShowCorrectionModal(false)}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] w-full max-w-md border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between">
              <span className="font-bold text-sm text-[#141414]">
                رفع طلب تصحيح بصمة / مهمة خارجية
              </span>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCorrection} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم الموظف</label>
                <select
                  value={corrForm.employee_id}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    if (emp) {
                      setCorrForm({
                        ...corrForm,
                        employee_id: emp.id,
                        employee_name: emp.name,
                        department: emp.department,
                      });
                    }
                  }}
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 font-bold"
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
                  <label className="block font-bold mb-1">التاريخ المستهدف</label>
                  <input
                    type="date"
                    value={corrForm.target_date}
                    onChange={(e) => setCorrForm({ ...corrForm, target_date: e.target.value })}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">سبب التصحيح</label>
                  <select
                    value={corrForm.correction_type}
                    onChange={(e) =>
                      setCorrForm({
                        ...corrForm,
                        correction_type: e.target
                          .value as AttendanceCorrectionRequest['correction_type'],
                      })
                    }
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  >
                    <option value="MISSING_CHECK_IN">نسيان بصمة حضور</option>
                    <option value="MISSING_CHECK_OUT">نسيان بصمة انصراف</option>
                    <option value="FIELD_MISSION">مهمة عمل خارجية</option>
                    <option value="DEVICE_ERROR">عطل جهاز البصمة</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الحضور الصحيح</label>
                  <input
                    type="time"
                    value={corrForm.requested_check_in}
                    onChange={(e) =>
                      setCorrForm({ ...corrForm, requested_check_in: e.target.value })
                    }
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">الانصراف الصحيح</label>
                  <input
                    type="time"
                    value={corrForm.requested_check_out}
                    onChange={(e) =>
                      setCorrForm({ ...corrForm, requested_check_out: e.target.value })
                    }
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">إيضاح ومبرر الطلب *</label>
                <textarea
                  rows={2}
                  required
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
                  placeholder="اذكر تفاصيل المهمة أو سبب تعذر التبصيم..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] p-3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  إرسال للاعتماد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <RecycleBinModal
        isOpen={showRecycleBin}
        onClose={() => setShowRecycleBin(false)}
        tableNameFilter="attendances"
        onRestoreEntry={(entry) => void handleRestoreAttendance(entry)}
      />
    </div>
  );
};
