import { describe, it, expect } from 'vitest';
import {
  HrShiftAttendanceEngine,
  DEFAULT_HR_SHIFTS,
  DEFAULT_GEOFENCE_LOCATIONS,
} from './hrShiftAttendanceEngine';

describe('HrShiftAttendanceEngine (Jisr Time, Shifts & Geofencing)', () => {
  it('validates GPS Geofence inside branch radius and rejects outside or mocked coordinates', () => {
    const inside = HrShiftAttendanceEngine.verifyGeofencePunch({
      latitude: 24.7986,
      longitude: 46.7833,
      gpsAccuracyMeters: 15,
      locations: DEFAULT_GEOFENCE_LOCATIONS,
    });
    expect(inside.allowed).toBe(true);
    expect(inside.distanceMeters).toBeLessThan(50);
    expect(inside.matchedBranchName).toContain('الرياض');

    const outside = HrShiftAttendanceEngine.verifyGeofencePunch({
      latitude: 24.9100,
      longitude: 46.9000,
      gpsAccuracyMeters: 12,
      locations: DEFAULT_GEOFENCE_LOCATIONS,
    });
    expect(outside.allowed).toBe(false);
    expect(outside.distanceMeters).toBeGreaterThan(250);

    const mocked = HrShiftAttendanceEngine.verifyGeofencePunch({
      latitude: 24.7985,
      longitude: 46.7832,
      gpsAccuracyMeters: 0,
      isMockedProvider: true,
      locations: DEFAULT_GEOFENCE_LOCATIONS,
    });
    expect(mocked.allowed).toBe(false);
    expect(mocked.mockLocationDetected).toBe(true);
  });

  it('allows Corporate Wi-Fi SSID verification', () => {
    const wifiRes = HrShiftAttendanceEngine.verifyGeofencePunch({
      latitude: 24.8005,
      longitude: 46.7850,
      connectedWifiSsid: 'KAS-HQ-CORP-5G',
      locations: DEFAULT_GEOFENCE_LOCATIONS,
    });
    expect(wifiRes.allowed).toBe(true);
    expect(wifiRes.verificationMethod).toBe('WIFI_NETWORK');
  });

  it('evaluates fixed shift grace period, flexible window, and Ramadan 6-hour rule (Art. 98)', () => {
    const fixedShift = DEFAULT_HR_SHIFTS[0]; // 08:00 - 16:30, grace 15m
    const withinGrace = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: '08:12',
      checkOut: '16:30',
      shift: fixedShift,
    });
    expect(withinGrace.lateMinutes).toBe(0);
    expect(withinGrace.status).toBe('حاضر');

    const beyondGrace = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: '08:30',
      checkOut: '16:30',
      shift: fixedShift,
    });
    expect(beyondGrace.lateMinutes).toBe(30);
    expect(beyondGrace.status).toBe('متأخر');

    // Flexible window (07:30 + 120m = up to 09:30 without being late)
    const flexShift = DEFAULT_HR_SHIFTS[1];
    const flexEval = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: '09:15',
      checkOut: '17:15',
      shift: flexShift,
    });
    expect(flexEval.lateMinutes).toBe(0);
    expect(flexEval.workHours).toBe(8);
    expect(flexEval.status).toBe('حاضر');

    // Ramadan 6-hour rule: working 8 hours in Ramadan yields 2 hours (120 mins) overtime!
    const ramadanEval = HrShiftAttendanceEngine.evaluateDailyAttendance({
      checkIn: '08:00',
      checkOut: '16:00',
      shift: fixedShift,
      isRamadanSeason: true,
      isMuslimEmployee: true,
    });
    expect(ramadanEval.overtimeMinutes).toBe(120);
  });

  it('calculates Saudi Labor Law Art. 107 overtime pay (Actual Wage + 50% Basic Wage)', () => {
    // Basic = 4800 (20/h), Total = 7200 (30/h) => Regular OT rate = 30 + 10 = 40/h
    const calc = HrShiftAttendanceEngine.calculateAttendanceFinancialImpact({
      basicSalary: 4800,
      totalMonthlyWage: 7200,
      regularOvertimeMinutes: 180, // 3 hours * 40 = 120
      holidayOvertimeMinutes: 120, // 2 hours * (30 + 20) = 100
      lateMinutes: 60, // 1 hour basic = 20
      earlyLeaveMinutes: 0,
    });
    expect(calc.overtimePayAmount).toBe(220);
    expect(calc.lateAndEarlyDeductionAmount).toBe(20);
  });

  it('parses ZKTeco / BioTime raw punch logs and aggregates first-in / last-out', () => {
    const rawLog = [
      'EMP-101\t2026-11-10 07:55:00\t1\t0',
      'EMP-101\t2026-11-10 12:30:00\t1\t0',
      'EMP-101\t2026-11-10 17:30:00\t1\t0',
      'EMP-102,2026-11-10 08:40:00',
      'EMP-102,2026-11-10 16:30:00',
    ].join('\n');

    const parsed = HrShiftAttendanceEngine.parseBiometricDeviceLog(rawLog, [
      { id: '1', employee_code: 'EMP-101', name: 'طلال الشهري', department: 'التشغيل' },
      { id: '2', employee_code: 'EMP-102', name: 'فهد العتيبي', department: 'الاستقدام' },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].emp_name).toBe('طلال الشهري');
    expect(parsed[0].check_in).toBe('07:55');
    expect(parsed[0].check_out).toBe('17:30');
    expect(parsed[0].overtime_minutes).toBeGreaterThan(60);

    expect(parsed[1].emp_name).toBe('فهد العتيبي');
    expect(parsed[1].status).toBe('متأخر');
    expect(parsed[1].late_minutes).toBe(40);
  });
});
