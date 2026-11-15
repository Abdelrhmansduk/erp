import { describe, it, expect, beforeEach } from 'vitest';
import { KAS_ALLOWED_EMPLOYEES } from '../config/kasAllowedEmails';
import {
  generateEmployeeBarcodeIdentity,
  verifyEmployeeBarcodeInput,
  hasCompletedSessionCheckIn,
  clearSessionCheckInStamp,
  authenticateWithHardwareBiometric,
  recordGateAttendanceAction,
  getAllEmployeesGateVerificationDirectory,
  getEmployeeGateProfile,
  regenerateEmployeeBarcode,
  updateEmployeeGatePolicy,
  resetEmployeeBiometricEnrollment,
} from './biometricAttendanceGateService';
import { realErpDataStore } from './realErpDataStore';

describe('Biometric, Live Camera & Barcode Gate — Individual Per-Employee Verification', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await realErpDataStore.saveRecords('attendances', []);
    await realErpDataStore.saveRecords('hr_employee_biometric_profiles', []);
  });

  it('verifies every single official corporate employee (all 69 @kas.sa accounts) individually with 0 collisions and strict cross-employee anti-spoofing', () => {
    expect(KAS_ALLOWED_EMPLOYEES.length).toBeGreaterThanOrEqual(65);

    const seenBadges = new Set<string>();
    const seenPins = new Set<string>();
    const seenQrs = new Set<string>();

    const identities = KAS_ALLOWED_EMPLOYEES.map((emp) => ({
      emp,
      idObj: generateEmployeeBarcodeIdentity(emp),
    }));

    for (let i = 0; i < identities.length; i++) {
      const { emp, idObj } = identities[i];

      // 1. Format check
      expect(idObj.badgeCode).toMatch(/^(HQ|SAF|YAQ|TOP|DAR|KAS)-ID-\d{6}$/);
      expect(idObj.shortPinCode).toMatch(/^\d{6}$/);
      expect(idObj.qrPayload).toContain(idObj.badgeCode);

      // 2. Uniqueness across all employees
      expect(seenBadges.has(idObj.badgeCode)).toBe(false);
      expect(seenPins.has(idObj.shortPinCode)).toBe(false);
      expect(seenQrs.has(idObj.qrPayload)).toBe(false);
      seenBadges.add(idObj.badgeCode);
      seenPins.add(idObj.shortPinCode);
      seenQrs.add(idObj.qrPayload);

      // 3. Self-verification passes for Code-128, 6-digit PIN, and full QR payload
      expect(verifyEmployeeBarcodeInput(idObj.badgeCode, emp).valid).toBe(true);
      expect(verifyEmployeeBarcodeInput(idObj.shortPinCode, emp).valid).toBe(true);
      expect(verifyEmployeeBarcodeInput(idObj.qrPayload, emp).valid).toBe(true);

      // 4. Cross-employee anti-spoofing: another employee's barcode/PIN MUST be rejected
      const other = identities[(i + 1) % identities.length];
      const spoofBadge = verifyEmployeeBarcodeInput(other.idObj.badgeCode, emp);
      expect(spoofBadge.valid).toBe(false);
      expect(spoofBadge.crossEmployeeMismatch).toBe(true);
      expect(spoofBadge.otherEmployeeName).toBe(other.emp.nameAr);

      const spoofPin = verifyEmployeeBarcodeInput(other.idObj.shortPinCode, emp);
      expect(spoofPin.valid).toBe(false);
      expect(spoofPin.crossEmployeeMismatch).toBe(true);
    }

    expect(seenBadges.size).toBe(KAS_ALLOWED_EMPLOYEES.length);
    expect(seenPins.size).toBe(KAS_ALLOWED_EMPLOYEES.length);
  });

  it('isolates Check-In (on open) and Check-Out (on sign-out) + camera hashes strictly per employee', async () => {
    const reemHr = {
      id: 'KAS-EMP-004',
      username: 'hr',
      email: 'hr@kas.sa',
      full_name: 'ريم احمد بن حسين',
      role: 'مديرة الموارد البشرية',
      company_id: 'all',
    };
    const akramAcc = {
      id: 'KAS-EMP-039',
      username: 'a.alkinani.acc',
      email: 'a.alkinani.acc@kas.sa',
      full_name: 'اكرم محمد الكناني',
      role: 'محاسب استقدام',
      company_id: 'SAF',
    };

    const morningOpen = new Date('2026-11-14T08:02:00');
    const eveningLogout = new Date('2026-11-14T16:32:00');

    expect(hasCompletedSessionCheckIn(reemHr, morningOpen)).toBe(false);
    expect(hasCompletedSessionCheckIn(akramAcc, morningOpen)).toBe(false);

    // Reem opens the system -> Check-In with camera frame
    const reemIn = await recordGateAttendanceAction({
      user: reemHr,
      direction: 'CHECK_IN',
      channel: 'BIOMETRIC_CAMERA',
      cameraCaptured: true,
      snapshotDataUrl: 'data:image/jpeg;base64,REEM_CHECKIN_FRAME_001',
      now: morningOpen,
    });

    expect(reemIn.timeHHMM).toBe('08:02');
    expect(hasCompletedSessionCheckIn(reemHr, morningOpen)).toBe(true);
    // Akram must still be unchecked-in!
    expect(hasCompletedSessionCheckIn(akramAcc, morningOpen)).toBe(false);

    // Akram opens the system without biometric -> Check-In via Barcode + Camera
    const akramIn = await recordGateAttendanceAction({
      user: akramAcc,
      direction: 'CHECK_IN',
      channel: 'BARCODE_CAMERA',
      cameraCaptured: true,
      snapshotDataUrl: 'data:image/jpeg;base64,AKRAM_CHECKIN_FRAME_999',
      now: new Date('2026-11-14T08:10:00'),
    });

    expect(akramIn.badgeCode).toMatch(/^SAF-ID-\d{6}$/);
    expect(hasCompletedSessionCheckIn(akramAcc, morningOpen)).toBe(true);

    // Reem signs out -> Check-Out records work hours & clears ONLY Reem's session stamp
    const reemOut = await recordGateAttendanceAction({
      user: reemHr,
      direction: 'CHECK_OUT',
      channel: 'BIOMETRIC_CAMERA',
      cameraCaptured: true,
      snapshotDataUrl: 'data:image/jpeg;base64,REEM_CHECKOUT_FRAME_002',
      now: eveningLogout,
    });

    expect(reemOut.timeHHMM).toBe('16:32');
    expect(reemOut.workHours).toBeGreaterThan(8);
    expect(hasCompletedSessionCheckIn(reemHr, eveningLogout)).toBe(false);
    // Akram's session stamp MUST remain active!
    expect(hasCompletedSessionCheckIn(akramAcc, eveningLogout)).toBe(true);

    const reemProf = await getEmployeeGateProfile(reemHr, eveningLogout);
    expect(reemProf.checkedInToday).toBe(true);
    expect(reemProf.checkedOutToday).toBe(true);
    expect(reemProf.lastCheckInHash).toMatch(/^CAM-/);
    expect(reemProf.lastCheckOutHash).toMatch(/^CAM-/);
    expect(reemProf.lastCheckInHash).not.toBe(reemProf.lastCheckOutHash);

    clearSessionCheckInStamp(akramAcc);
    expect(hasCompletedSessionCheckIn(akramAcc, eveningLogout)).toBe(false);
  });

  it('automatically falls back to Barcode when hardware biometric is unavailable or per-employee policy is BARCODE_PRIMARY', async () => {
    const emp = {
      id: 'KAS-EMP-010',
      email: 'a.alanazi@kas.sa',
      full_name: 'الجوري العنزي',
      role: 'خدمات حكومية',
      company_id: 'HQ',
    };

    const resNoSensor = await authenticateWithHardwareBiometric(emp);
    expect(resNoSensor.ok).toBe(false);
    expect(resNoSensor.fallbackToBarcode).toBe(true);

    await updateEmployeeGatePolicy(emp, { gatePolicy: 'BARCODE_PRIMARY' });
    const prof = await getEmployeeGateProfile(emp);
    expect(prof.gatePolicy).toBe('BARCODE_PRIMARY');

    const resPolicy = await authenticateWithHardwareBiometric(emp);
    expect(resPolicy.ok).toBe(false);
    expect(resPolicy.fallbackToBarcode).toBe(true);
  });

  it('supports per-employee barcode regeneration and biometric reset without affecting any other employee', async () => {
    const targetEmp = KAS_ALLOWED_EMPLOYEES[4]; // ريم احمد بن حسين
    const neighborEmp = KAS_ALLOWED_EMPLOYEES[0]; // خالد عبدالعزيز السليم

    const oldTargetId = generateEmployeeBarcodeIdentity(targetEmp);
    const neighborBefore = generateEmployeeBarcodeIdentity(neighborEmp);

    const regenerated = await regenerateEmployeeBarcode(targetEmp);
    expect(regenerated.barcodeVersion).toBe(2);
    expect(regenerated.badgeCode).not.toBe(oldTargetId.badgeCode);

    // Old barcode is immediately invalidated; new barcode passes
    expect(verifyEmployeeBarcodeInput(oldTargetId.badgeCode, targetEmp).valid).toBe(false);
    expect(verifyEmployeeBarcodeInput(regenerated.badgeCode, targetEmp).valid).toBe(true);

    // Neighbor employee's barcode is completely untouched
    const neighborAfter = generateEmployeeBarcodeIdentity(neighborEmp);
    expect(neighborAfter.badgeCode).toBe(neighborBefore.badgeCode);

    const resetProf = await resetEmployeeBiometricEnrollment(targetEmp);
    expect(resetProf.biometricEnrolled).toBe(false);

    const allDirectory = await getAllEmployeesGateVerificationDirectory('all');
    expect(allDirectory.length).toBeGreaterThanOrEqual(KAS_ALLOWED_EMPLOYEES.length);
  });
});
