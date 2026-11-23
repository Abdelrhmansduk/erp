import { describe, expect, it, beforeEach } from 'vitest';
import {
  collectUserAddedHrInventory,
  isAutoSeededPlaceholderDocument,
  isDemoOrSimulatedEmployeeRecord,
  sanitizeHrDemoDataPreservingUserAdditions,
} from '../hrUserAddedDataSanitizer';
import { realErpDataStore } from '../realErpDataStore';

describe('HR Demo Sanitizer & User-Added Data Inspector', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('distinguishes synthetic/demo employees from real user-added or user-edited employees', () => {
    expect(
      isDemoOrSimulatedEmployeeRecord({
        id: '6fbc7fc0-0b15-434e-8a8d-de943b17c355',
        employee_code: 'EMP-2026-001',
        name: 'محمد مصطفي',
        national_id: '1029384756',
      })
    ).toBe(true);

    expect(
      isDemoOrSimulatedEmployeeRecord({
        id: 'KAS-EMP-001',
        employee_code: 'KAS-EMP-001',
        compliance_hash: 'KAS-HR-KAS-EMP-001',
      })
    ).toBe(true);

    // Real employee added by user
    expect(
      isDemoOrSimulatedEmployeeRecord({
        id: 'EMP-SAF-501',
        employee_code: 'EMP-SAF-501',
        name: 'فهد بن سلطان العتيبي',
        national_id: '1055443322',
        salary: 9500,
      })
    ).toBe(false);

    // KAS directory staff explicitly imported/edited by user with notes
    expect(
      isDemoOrSimulatedEmployeeRecord({
        id: 'KAS-EMP-004',
        employee_code: 'KAS-EMP-004',
        name: 'ريم احمد بن حسين',
        national_id: '',
        notes: 'مضاف من دليل حسابات @kas.sa الرسمي بدون بيانات محاكاة',
      })
    ).toBe(false);
  });

  it('strips demo HR seeds while 100% preserving user-added HR records and listing them in inventory', async () => {
    // Seed mixed demo + user-added records
    await realErpDataStore.addRecord('hr_employees', {
      id: 'EMP-2026-001',
      employee_code: 'EMP-2026-001',
      name: 'محمد مصطفي',
      national_id: '1029384756',
      salary: 14500,
    });
    await realErpDataStore.addRecord('hr_employees', {
      id: 'USER-EMP-99',
      employee_code: 'EMP-SAF-099',
      company_id: 'SAF',
      name: 'نواف الدوسري',
      national_id: '1044556677',
      job_title: 'محاسب رواتب',
      department: 'الموارد البشرية',
      branch: 'الرياض',
      salary: 8800,
    });

    await realErpDataStore.addRecord('hr_leave_requests', {
      id: 'VAC-01',
      employee_name: 'الجوري العنزي',
      vacation_type: 'إجازة اعتيادية سنوية',
      days_count: 7,
      status: 'معتمد',
    });
    await realErpDataStore.addRecord('hr_leave_requests', {
      id: 'VAC-USER-77',
      company_id: 'SAF',
      employee_id: 'USER-EMP-99',
      employee_name: 'نواف الدوسري',
      vacation_type: 'إجازة سنوية',
      from_date: '2026-12-01',
      to_date: '2026-12-05',
      days_count: 5,
      status: 'بانتظار الموافقة',
    });

    expect(
      isAutoSeededPlaceholderDocument({
        id: 'DOC-KAS-EMP-004-ID',
        documentNumber: '1092837465',
        fileDataUrl: null,
      })
    ).toBe(true);

    const res = await sanitizeHrDemoDataPreservingUserAdditions(true);
    expect(res.removedDemoCount).toBeGreaterThanOrEqual(2);
    expect(res.preservedUserCount).toBeGreaterThanOrEqual(2);

    const inv = await collectUserAddedHrInventory('SAF');
    const empCat = inv.categories.find((c) => c.key === 'employees');
    const leaveCat = inv.categories.find((c) => c.key === 'leaves');

    expect(empCat?.count).toBe(1);
    expect(empCat?.items[0].primaryLabel).toContain('نواف الدوسري');
    expect(leaveCat?.count).toBe(1);
    expect(leaveCat?.items[0].primaryLabel).toContain('نواف الدوسري');
  });
});
