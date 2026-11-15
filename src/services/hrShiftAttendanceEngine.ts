/**
 * Jisr-Grade Smart Shift, GPS Geofencing, Biometric ZKTeco Parser & Attendance Policy Engine
 * Compliant with Saudi Labor Law Articles 98 (Working Hours & Ramadan 6h), 104 (Rest Days), and 107 (Overtime Pay).
 */

export type ShiftType = 'FIXED' | 'FLEXIBLE' | 'ROTATING' | 'SPLIT' | 'RAMADAN';

export type AttendanceVerificationMethod =
  | 'GPS_GEOFENCE'
  | 'WIFI_NETWORK'
  | 'BIOMETRIC_ZKT'
  | 'KIOSK_TABLET'
  | 'MANUAL_HR';

export interface HrShiftSchedule {
  id: string;
  company_id: string;
  name_ar: string;
  shift_type: ShiftType;
  start_time: string; // HH:mm (24h)
  end_time: string; // HH:mm (24h)
  second_period_start?: string; // For SPLIT shifts
  second_period_end?: string;
  flexible_window_minutes: number; // e.g., 120 mins (07:30 -> 09:30)
  required_daily_hours: number; // Standard 8h
  ramadan_daily_hours: number; // Art. 98: 6h for Muslim employees
  grace_in_minutes: number; // Morning grace period before late count
  grace_out_minutes: number; // Early checkout grace
  overtime_multiplier: number; // 1.5x standard
  holiday_overtime_multiplier: number; // 2.0x weekend/Eid
  weekend_days: string[]; // ['Friday', 'Saturday']
  is_active: boolean;
}

export interface HrGeofenceLocation {
  id: string;
  company_id: string;
  branch_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  allowed_wifi_ssid: string;
  kiosk_enabled: boolean;
  kiosk_access_code: string;
  is_active: boolean;
}

export interface AttendanceCorrectionRequest {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  target_date: string;
  correction_type: 'MISSING_CHECK_IN' | 'MISSING_CHECK_OUT' | 'FIELD_MISSION' | 'DEVICE_ERROR';
  requested_check_in: string;
  requested_check_out: string;
  reason: string;
  workflow_request_id?: string;
  status: 'بانتظار الموافقة' | 'معتمد' | 'مرفوض';
  approved_by?: string;
  created_at: string;
}

export interface EvaluatedAttendanceRecord {
  id: string;
  company_id: string;
  employee_id: string;
  emp_name: string;
  department: string;
  date: string;
  shift_id: string;
  shift_name: string;
  check_in: string;
  check_out: string;
  work_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  verification_method: AttendanceVerificationMethod;
  distance_meters: number;
  mock_location_detected: boolean;
  is_holiday_work: boolean;
  payroll_synced: boolean;
  status: 'حاضر' | 'متأخر' | 'غياب' | 'إجازة';
}

export interface GeofenceCheckResult {
  allowed: boolean;
  distanceMeters: number;
  matchedLocationId?: string;
  matchedBranchName: string;
  verificationMethod: AttendanceVerificationMethod;
  mockLocationDetected: boolean;
  reasonAr: string;
}

export interface MonthlyAttendancePayrollSummary {
  employeeId: string;
  employeeName: string;
  presentDays: number;
  lateDays: number;
  absenceDays: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalOvertimeHours: number;
  overtimePayAmount: number;
  lateAndEarlyDeductionAmount: number;
}

export const DEFAULT_HR_SHIFTS: HrShiftSchedule[] = [
  {
    id: 'SHF-MAIN-FIXED',
    company_id: 'SAF',
    name_ar: 'الدوام الإداري الرسمي الثابت (الإدارة العامة)',
    shift_type: 'FIXED',
    start_time: '08:00',
    end_time: '16:30',
    flexible_window_minutes: 0,
    required_daily_hours: 8,
    ramadan_daily_hours: 6,
    grace_in_minutes: 15,
    grace_out_minutes: 10,
    overtime_multiplier: 1.5,
    holiday_overtime_multiplier: 2.0,
    weekend_days: ['Friday', 'Saturday'],
    is_active: true,
  },
  {
    id: 'SHF-FLEX-TECH',
    company_id: 'SAF',
    name_ar: 'الدوام المرن (نافذة حضور 07:30 - 09:30 صباحاً)',
    shift_type: 'FLEXIBLE',
    start_time: '07:30',
    end_time: '15:30',
    flexible_window_minutes: 120,
    required_daily_hours: 8,
    ramadan_daily_hours: 6,
    grace_in_minutes: 10,
    grace_out_minutes: 5,
    overtime_multiplier: 1.5,
    holiday_overtime_multiplier: 2.0,
    weekend_days: ['Friday', 'Saturday'],
    is_active: true,
  },
  {
    id: 'SHF-SHELTER-ROT',
    company_id: 'SAF',
    name_ar: 'وردية مراكز الإيواء والاستقبال بالمطار (متناوبة)',
    shift_type: 'ROTATING',
    start_time: '07:00',
    end_time: '15:00',
    flexible_window_minutes: 0,
    required_daily_hours: 8,
    ramadan_daily_hours: 6,
    grace_in_minutes: 10,
    grace_out_minutes: 5,
    overtime_multiplier: 1.5,
    holiday_overtime_multiplier: 2.0,
    weekend_days: ['Friday'],
    is_active: true,
  },
  {
    id: 'SHF-KAS-SPLIT',
    company_id: 'KAS',
    name_ar: 'دوام الفترتين — المعارض التجارية وخدمة العملاء',
    shift_type: 'SPLIT',
    start_time: '09:00',
    end_time: '13:00',
    second_period_start: '16:30',
    second_period_end: '20:30',
    flexible_window_minutes: 0,
    required_daily_hours: 8,
    ramadan_daily_hours: 6,
    grace_in_minutes: 15,
    grace_out_minutes: 10,
    overtime_multiplier: 1.5,
    holiday_overtime_multiplier: 2.0,
    weekend_days: ['Friday'],
    is_active: true,
  },
  {
    id: 'SHF-RAMADAN-6H',
    company_id: 'SAF',
    name_ar: 'دوام شهر رمضان المبارك المعتمد (المادة 98 — 6 ساعات)',
    shift_type: 'RAMADAN',
    start_time: '10:00',
    end_time: '16:00',
    flexible_window_minutes: 30,
    required_daily_hours: 6,
    ramadan_daily_hours: 6,
    grace_in_minutes: 15,
    grace_out_minutes: 10,
    overtime_multiplier: 1.5,
    holiday_overtime_multiplier: 2.0,
    weekend_days: ['Friday', 'Saturday'],
    is_active: true,
  },
];

export const DEFAULT_GEOFENCE_LOCATIONS: HrGeofenceLocation[] = [
  {
    id: 'GEO-RUH-HQ',
    company_id: 'SAF',
    branch_name: 'المقر الرئيسي — الرياض (حي اليرموك)',
    latitude: 24.7985,
    longitude: 46.7832,
    radius_meters: 250,
    allowed_wifi_ssid: 'KAS-HQ-CORP-5G',
    kiosk_enabled: true,
    kiosk_access_code: '1448',
    is_active: true,
  },
  {
    id: 'GEO-JED-BR',
    company_id: 'SAF',
    branch_name: 'فرع جدة والمنطقة الغربية — طريق الملك عبدالعزيز',
    latitude: 21.5822,
    longitude: 39.1319,
    radius_meters: 250,
    allowed_wifi_ssid: 'KAS-JED-CORP',
    kiosk_enabled: true,
    kiosk_access_code: '2030',
    is_active: true,
  },
  {
    id: 'GEO-DMM-BR',
    company_id: 'SAF',
    branch_name: 'فرع الخبر والمنطقة الشرقية — شارع الظهران',
    latitude: 26.2886,
    longitude: 50.1972,
    radius_meters: 250,
    allowed_wifi_ssid: 'KAS-DMM-CORP',
    kiosk_enabled: true,
    kiosk_access_code: '3040',
    is_active: true,
  },
  {
    id: 'GEO-EWAA-RUH',
    company_id: 'SAF',
    branch_name: 'مركز الإيواء والرعاية النموذجي — الرياض (الرمال)',
    latitude: 24.8451,
    longitude: 46.8412,
    radius_meters: 350,
    allowed_wifi_ssid: 'KAS-SHELTER-NET',
    kiosk_enabled: true,
    kiosk_access_code: '9090',
    is_active: true,
  },
];

export class HrShiftAttendanceEngine {
  /**
   * Parses 24h ("16:30") or Arabic 12h ("04:30 م" / "08:15 ص") into minutes from midnight
   */
  public static parseTimeToMinutes(rawTime: string): number | null {
    if (!rawTime) return null;
    const cleaned = rawTime.trim();
    const isPm = cleaned.includes('م') || /pm/i.test(cleaned);
    const isAm = cleaned.includes('ص') || /am/i.test(cleaned);
    const match = cleaned.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(mins) || mins < 0 || mins > 59) return null;

    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;
    if (hours < 0 || hours > 23) return null;

    return hours * 60 + mins;
  }

  /**
   * Formats minutes from midnight to HH:mm (24h)
   */
  public static formatMinutesTo24h(totalMinutes: number): string {
    const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Great-circle distance between two GPS coordinates in meters (Haversine formula)
   */
  public static calculateHaversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusM = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusM * c).toFixed(1));
  }

  /**
   * Verifies employee punch against approved branch Geofences, Wi-Fi SSIDs, and Anti-Spoofing rules
   */
  public static verifyGeofencePunch(params: {
    latitude: number;
    longitude: number;
    gpsAccuracyMeters?: number;
    isMockedProvider?: boolean;
    connectedWifiSsid?: string;
    locations: HrGeofenceLocation[];
  }): GeofenceCheckResult {
    const activeLocations = params.locations.filter((l) => l.is_active);
    if (activeLocations.length === 0) {
      return {
        allowed: false,
        distanceMeters: 0,
        matchedBranchName: 'غير محدد',
        verificationMethod: 'GPS_GEOFENCE',
        mockLocationDetected: false,
        reasonAr: 'لا توجد مواقع سياج جغرافي مفعّلة للمنشأة حالياً.',
      };
    }

    // 1. Anti-Spoofing / Mock Location Guard
    const suspiciousZeroAccuracy = params.gpsAccuracyMeters === 0;
    const excessiveInaccuracy =
      params.gpsAccuracyMeters !== undefined && params.gpsAccuracyMeters > 600;
    if (params.isMockedProvider || suspiciousZeroAccuracy) {
      return {
        allowed: false,
        distanceMeters: 0,
        matchedBranchName: 'مرفوض أمنياً',
        verificationMethod: 'GPS_GEOFENCE',
        mockLocationDetected: true,
        reasonAr:
          'تم رصد أداة تزييف موقع جغرافي (Mock Location) — تم حظر البصمة وتسجيل تنبيه أمني وفق سياسة الانضباط.',
      };
    }

    // 2. Check Wi-Fi Corporate SSID match first if provided
    if (params.connectedWifiSsid) {
      const wifiMatch = activeLocations.find(
        (loc) =>
          loc.allowed_wifi_ssid &&
          loc.allowed_wifi_ssid.toLowerCase() === params.connectedWifiSsid!.trim().toLowerCase()
      );
      if (wifiMatch) {
        const dist = this.calculateHaversineMeters(
          params.latitude,
          params.longitude,
          wifiMatch.latitude,
          wifiMatch.longitude
        );
        return {
          allowed: true,
          distanceMeters: dist,
          matchedLocationId: wifiMatch.id,
          matchedBranchName: wifiMatch.branch_name,
          verificationMethod: 'WIFI_NETWORK',
          mockLocationDetected: false,
          reasonAr: `تم التحقق بنجاح عبر شبكة الفرع المعتمدة (${wifiMatch.allowed_wifi_ssid}).`,
        };
      }
    }

    if (excessiveInaccuracy) {
      return {
        allowed: false,
        distanceMeters: 0,
        matchedBranchName: 'إشارة GPS ضعيفة',
        verificationMethod: 'GPS_GEOFENCE',
        mockLocationDetected: false,
        reasonAr: `دقة إشارة الموقع ضعيفة جداً (±${Math.round(params.gpsAccuracyMeters!)} متر) — يرجى تفعيل الموقع الدقيق.`,
      };
    }

    // 3. Find nearest Geofence location
    let nearest = activeLocations[0];
    let minDistance = this.calculateHaversineMeters(
      params.latitude,
      params.longitude,
      nearest.latitude,
      nearest.longitude
    );

    for (let i = 1; i < activeLocations.length; i++) {
      const loc = activeLocations[i];
      const d = this.calculateHaversineMeters(
        params.latitude,
        params.longitude,
        loc.latitude,
        loc.longitude
      );
      if (d < minDistance) {
        minDistance = d;
        nearest = loc;
      }
    }

    if (minDistance <= nearest.radius_meters) {
      return {
        allowed: true,
        distanceMeters: minDistance,
        matchedLocationId: nearest.id,
        matchedBranchName: nearest.branch_name,
        verificationMethod: 'GPS_GEOFENCE',
        mockLocationDetected: false,
        reasonAr: `داخل النطاق الجغرافي لـ (${nearest.branch_name}) على بُعد ${minDistance} متراً.`,
      };
    }

    return {
      allowed: false,
      distanceMeters: minDistance,
      matchedLocationId: nearest.id,
      matchedBranchName: nearest.branch_name,
      verificationMethod: 'GPS_GEOFENCE',
      mockLocationDetected: false,
      reasonAr: `خارج النطاق الجغرافي المعتمد! أقرب فرع (${nearest.branch_name}) يبعد ${minDistance} م (المسموح ${nearest.radius_meters} م).`,
    };
  }

  /**
   * Evaluates check-in & check-out against shift policy, Grace Period, Flexible Window, and Ramadan 6h rule
   */
  public static evaluateDailyAttendance(params: {
    checkIn: string;
    checkOut: string;
    shift: HrShiftSchedule;
    isRamadanSeason?: boolean;
    isMuslimEmployee?: boolean;
    isHolidayOrWeekend?: boolean;
    compensateLateWithStay?: boolean;
  }): {
    workHours: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    overtimeMinutes: number;
    status: 'حاضر' | 'متأخر' | 'غياب' | 'إجازة';
  } {
    const inMins = this.parseTimeToMinutes(params.checkIn);
    const outMins = this.parseTimeToMinutes(params.checkOut);
    if (inMins === null || outMins === null) {
      return {
        workHours: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        status: 'غياب',
      };
    }

    const shiftStart = this.parseTimeToMinutes(params.shift.start_time) ?? 480;
    let shiftEnd = this.parseTimeToMinutes(params.shift.end_time) ?? 990;
    if (shiftEnd <= shiftStart) shiftEnd += 1440;

    let actualOut = outMins;
    if (actualOut < inMins) actualOut += 1440; // Overnight shift support

    const rawWorkedMinutes = Math.max(0, actualOut - inMins);
    const workHours = Number((rawWorkedMinutes / 60).toFixed(2));

    // Holiday / Weekend work: 100% of worked minutes count as overtime
    if (params.isHolidayOrWeekend) {
      return {
        workHours,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: rawWorkedMinutes,
        status: 'حاضر',
      };
    }

    // Saudi Labor Law Art. 98: Ramadan 6-hour limit for Muslim employees
    const applyRamadanRule =
      params.shift.shift_type === 'RAMADAN' ||
      Boolean(params.isRamadanSeason && (params.isMuslimEmployee ?? true));

    const targetHours = applyRamadanRule
      ? params.shift.ramadan_daily_hours
      : params.shift.required_daily_hours;
    const targetMinutes = Math.round(targetHours * 60);

    // Effective start/end considering Flexible Window
    let effectiveExpectedStart = shiftStart;
    let effectiveExpectedEnd = applyRamadanRule
      ? shiftStart + targetMinutes
      : shiftEnd;

    if (params.shift.shift_type === 'FLEXIBLE' && params.shift.flexible_window_minutes > 0) {
      const latestFlexStart = shiftStart + params.shift.flexible_window_minutes;
      const clampedStart = Math.min(Math.max(inMins, shiftStart), latestFlexStart);
      effectiveExpectedStart = clampedStart;
      effectiveExpectedEnd = clampedStart + targetMinutes;
    }

    // Late arrival calculation with Grace Period
    const rawLate = Math.max(0, inMins - effectiveExpectedStart);
    let lateMinutes = rawLate <= params.shift.grace_in_minutes ? 0 : rawLate;

    // Early checkout calculation with Grace Period
    const rawEarly = Math.max(0, effectiveExpectedEnd - actualOut);
    const earlyLeaveMinutes = rawEarly <= params.shift.grace_out_minutes ? 0 : rawEarly;

    // Optional Jisr policy: compensate morning tardiness by staying after shift end
    const extraStayAfterEnd = Math.max(0, actualOut - effectiveExpectedEnd);
    let overtimeMinutes = Math.max(0, rawWorkedMinutes - targetMinutes);

    if (params.compensateLateWithStay && lateMinutes > 0 && extraStayAfterEnd > 0) {
      const offset = Math.min(lateMinutes, extraStayAfterEnd);
      lateMinutes -= offset;
      overtimeMinutes = Math.max(0, overtimeMinutes - offset);
    }

    // Minimum 15 mins threshold before counting overtime
    if (overtimeMinutes < 15) {
      overtimeMinutes = 0;
    }

    const status: 'حاضر' | 'متأخر' = lateMinutes > 0 ? 'متأخر' : 'حاضر';

    return {
      workHours,
      lateMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
      status,
    };
  }

  /**
   * Calculates financial overtime pay (Saudi Labor Law Art. 107) and tardiness deductions
   * Art. 107: Overtime Hour = Actual Hourly Wage + 50% of Basic Hourly Wage
   *           (On official holidays/Eids: Actual Hourly Wage + 100% of Basic Hourly Wage)
   */
  public static calculateAttendanceFinancialImpact(params: {
    basicSalary: number;
    totalMonthlyWage: number;
    regularOvertimeMinutes: number;
    holidayOvertimeMinutes?: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
  }): {
    overtimePayAmount: number;
    lateAndEarlyDeductionAmount: number;
  } {
    const basicHourly = Math.max(0, params.basicSalary) / 240; // 30 days * 8 hours
    const actualHourly = Math.max(0, params.totalMonthlyWage) / 240;

    const regularOtHours = Math.max(0, params.regularOvertimeMinutes) / 60;
    const holidayOtHours = Math.max(0, params.holidayOvertimeMinutes || 0) / 60;

    const regularOtRate = actualHourly + 0.5 * basicHourly;
    const holidayOtRate = actualHourly + 1.0 * basicHourly;

    const overtimePayAmount = Number(
      (regularOtHours * regularOtRate + holidayOtHours * holidayOtRate).toFixed(2)
    );

    const penaltyMinutes = Math.max(0, params.lateMinutes) + Math.max(0, params.earlyLeaveMinutes);
    const minuteBasicRate = basicHourly / 60;
    const lateAndEarlyDeductionAmount = Number((penaltyMinutes * minuteBasicRate).toFixed(2));

    return {
      overtimePayAmount,
      lateAndEarlyDeductionAmount,
    };
  }

  /**
   * Parses real ZKTeco / BioTime CSV, TSV, or .DAT attendance logs
   * Supports lines like:
   *   EMP-101,2026-11-10 07:58:12
   *   101	2026-11-10 16:35:00	1	0	1	0
   *   EMP-101,أحمد,2026-11-10,08:02,16:31
   */
  public static parseBiometricDeviceLog(
    rawContent: string,
    employeesDirectory: Array<{
      id: string;
      employee_code?: string;
      name: string;
      department?: string;
      company_id?: string;
      shift_id?: string;
    }>,
    shifts: HrShiftSchedule[] = DEFAULT_HR_SHIFTS,
    isRamadanSeason = false
  ): EvaluatedAttendanceRecord[] {
    if (!rawContent || !rawContent.trim()) return [];

    const lines = rawContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    // Group punches by employeeKey + date
    const grouped = new Map<
      string,
      {
        empCodeOrId: string;
        empNameHint?: string;
        date: string;
        punchesMinutes: number[];
      }
    >();

    for (const line of lines) {
      // Skip header line if present
      if (/employee|emp_code|check_in|التاريخ|وقت الحضور/i.test(line)) continue;

      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) continue;
      const dateStr = dateMatch[1];

      const timeMatches = [...line.matchAll(/(\d{1,2}:\d{2})(?::\d{2})?/g)].map((m) => m[1]);
      if (timeMatches.length === 0) continue;

      const tokens = line.split(/[,\t;]+/).map((t) => t.trim());
      const empToken = tokens[0] || 'UNKNOWN';
      const nameHint =
        tokens.length >= 4 && !/\d{4}-\d{2}-\d{2}/.test(tokens[1]) ? tokens[1] : undefined;

      const key = `${empToken.toUpperCase()}__${dateStr}`;
      const entry = grouped.get(key) || {
        empCodeOrId: empToken,
        empNameHint: nameHint,
        date: dateStr,
        punchesMinutes: [],
      };

      for (const tm of timeMatches) {
        const mins = this.parseTimeToMinutes(tm);
        if (mins !== null) {
          entry.punchesMinutes.push(mins);
        }
      }
      grouped.set(key, entry);
    }

    const results: EvaluatedAttendanceRecord[] = [];
    let counter = 1;

    grouped.forEach((group) => {
      if (group.punchesMinutes.length === 0) return;
      const sorted = [...group.punchesMinutes].sort((a, b) => a - b);
      const minPunch = sorted[0];
      const maxPunch = sorted.length > 1 ? sorted[sorted.length - 1] : minPunch + 480;

      const checkInStr = this.formatMinutesTo24h(minPunch);
      const checkOutStr = this.formatMinutesTo24h(maxPunch);

      const matchedEmp = employeesDirectory.find(
        (e) =>
          e.id.toLowerCase() === group.empCodeOrId.toLowerCase() ||
          (e.employee_code && e.employee_code.toLowerCase() === group.empCodeOrId.toLowerCase()) ||
          (group.empNameHint && e.name.includes(group.empNameHint))
      );

      const shift =
        shifts.find((s) => s.id === matchedEmp?.shift_id) || shifts[0] || DEFAULT_HR_SHIFTS[0];

      const evaluated = this.evaluateDailyAttendance({
        checkIn: checkInStr,
        checkOut: checkOutStr,
        shift,
        isRamadanSeason,
      });

      results.push({
        id: `ZKT-${group.date.replace(/-/g, '')}-${counter++}`,
        company_id: matchedEmp?.company_id || 'SAF',
        employee_id: matchedEmp?.id || group.empCodeOrId,
        emp_name: matchedEmp?.name || group.empNameHint || `موظف بصمة (${group.empCodeOrId})`,
        department: matchedEmp?.department || 'التشغيل والفروع',
        date: group.date,
        shift_id: shift.id,
        shift_name: shift.name_ar,
        check_in: checkInStr,
        check_out: checkOutStr,
        work_hours: evaluated.workHours,
        late_minutes: evaluated.lateMinutes,
        early_leave_minutes: evaluated.earlyLeaveMinutes,
        overtime_minutes: evaluated.overtimeMinutes,
        verification_method: 'BIOMETRIC_ZKT',
        distance_meters: 0,
        mock_location_detected: false,
        is_holiday_work: false,
        payroll_synced: false,
        status: evaluated.status,
      });
    });

    return results;
  }

  /**
   * Aggregates an employee's monthly attendance records into exact WPS Payroll inputs
   */
  public static aggregateAttendanceForPayroll(
    payrollMonth: string, // YYYY-MM
    records: EvaluatedAttendanceRecord[],
    employees: Array<{
      id: string;
      name: string;
      basic_salary?: number;
      salary: number;
    }>
  ): MonthlyAttendancePayrollSummary[] {
    const monthRecords = records.filter((r) => r.date && r.date.startsWith(payrollMonth));

    return employees.map((emp) => {
      const empRecs = monthRecords.filter(
        (r) =>
          r.employee_id === emp.id ||
          r.emp_name === emp.name ||
          emp.name.includes(r.emp_name) ||
          r.emp_name.includes(emp.name)
      );

      let presentDays = 0;
      let lateDays = 0;
      let absenceDays = 0;
      let totalLateMinutes = 0;
      let totalEarlyLeaveMinutes = 0;
      let regularOtMins = 0;
      let holidayOtMins = 0;

      for (const r of empRecs) {
        if (r.status === 'غياب') {
          absenceDays += 1;
        } else if (r.status === 'متأخر') {
          presentDays += 1;
          lateDays += 1;
        } else if (r.status === 'حاضر') {
          presentDays += 1;
        }

        totalLateMinutes += r.late_minutes || 0;
        totalEarlyLeaveMinutes += r.early_leave_minutes || 0;
        if (r.is_holiday_work) {
          holidayOtMins += r.overtime_minutes || 0;
        } else {
          regularOtMins += r.overtime_minutes || 0;
        }
      }

      const basicSalary = emp.basic_salary ?? Math.round(emp.salary * 0.7);
      const impact = this.calculateAttendanceFinancialImpact({
        basicSalary,
        totalMonthlyWage: emp.salary,
        regularOvertimeMinutes: regularOtMins,
        holidayOvertimeMinutes: holidayOtMins,
        lateMinutes: totalLateMinutes,
        earlyLeaveMinutes: totalEarlyLeaveMinutes,
      });

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        presentDays,
        lateDays,
        absenceDays,
        totalLateMinutes,
        totalEarlyLeaveMinutes,
        totalOvertimeHours: Number(((regularOtMins + holidayOtMins) / 60).toFixed(2)),
        overtimePayAmount: impact.overtimePayAmount,
        lateAndEarlyDeductionAmount: impact.lateAndEarlyDeductionAmount,
      };
    });
  }
}
