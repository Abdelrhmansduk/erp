import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveDocumentBranding,
  setEntityHideHoldingPreference,
  getEntityHideHoldingPreference,
  inferEntityCodeFromRecordOrList,
} from './entityBrandingService';
import {
  normalizeSaudiWhatsAppNumber,
  buildEntityShareText,
  archiveRecordBeforeSoftDelete,
  listRecycleBinEntries,
  popRecycleBinEntryForRestore,
  recordFieldLevelChanges,
  listFieldAuditHistory,
} from './quickShareService';
import {
  calculateNetLeaveDays,
  saveHrLeavePolicy,
  confirmReturnFromLeave,
  cutLeaveEarlyAndRefundBalance,
  extendApprovedLeave,
  cancelApprovedLeaveAndRefund,
  scanLeaveReturnAlerts,
  DEFAULT_HR_LEAVE_POLICY,
} from './hrLeaveLifecycleService';
import {
  saveUnifiedEmployeeProfile,
  softDeleteUnifiedEmployeeProfile,
  restoreUnifiedEmployeeFromBin,
  getPersistentEmployeeDocuments,
  addPersistentEmployeeDocument,
  loadCustomJobTitles,
  saveCustomJobTitle,
  renameCustomJobTitleAndSyncEmployees,
  deleteCustomJobTitle,
  loadCustomDepartments,
  loadCustomGrades,
  CUSTOM_JOB_TITLES_STORAGE_KEY,
  CUSTOM_DEPARTMENTS_STORAGE_KEY,
  CUSTOM_GRADES_STORAGE_KEY,
} from './employeeProfileSync';
import {
  generateExecutiveReportHtml,
  buildRowAwarePdfPageHtmlChunks,
  buildCsvContent,
} from './exportService';
import {
  scanHrComplianceRadars,
  executeHrSmartAlertCorrectiveAction,
} from './hrSmartAlertsEngine';
import { realErpDataStore } from './realErpDataStore';

describe('Entity Standalone Branding, Pre-Export Editor, Employee Sync, Leave Lifecycle & Smart Alerts', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('resolves employee company identity dynamically and completely omits "مجموعة خالد السليم" when hideHoldingGroupBrand is enabled', () => {
    // 1. KAS defaults to hiding holding group branding
    const kasBranding = resolveDocumentBranding({ company_id: 'KAS' });
    expect(kasBranding.code).toBe('KAS');
    expect(kasBranding.hideHoldingGroupBrand).toBe(true);
    expect(kasBranding.displayNameAr).toContain('شركة كاس');
    expect(kasBranding.holdingBadgeAr).toBe('');
    expect(kasBranding.footerOrganizationLineAr).not.toContain('مجموعة خالد السليم');
    expect(kasBranding.executiveSignatoryNameAr).not.toContain('السليم');

    // 2. SAF defaults to showing holding group unless toggled or persisted
    const safDefault = resolveDocumentBranding({ company_id: 'SAF' });
    expect(safDefault.code).toBe('SAF');
    expect(safDefault.hideHoldingGroupBrand).toBe(false);

    // 3. Persist standalone preference for SAF and verify complete removal of holding group phrase
    setEntityHideHoldingPreference('SAF', true);
    expect(getEntityHideHoldingPreference('SAF')).toBe(true);

    const safStandalone = resolveDocumentBranding({ company_id: 'SAF' });
    expect(safStandalone.hideHoldingGroupBrand).toBe(true);
    expect(safStandalone.displayNameAr).toContain('السفير الماسي');
    expect(safStandalone.letterheadSovereignLineAr).toBe('المملكة العربية السعودية');
    expect(safStandalone.systemPlatformTitleAr).not.toContain('مجموعة خالد السليم');

    // 4. Verify generated Executive Report HTML & WhatsApp/Email Share text omit "مجموعة خالد السليم"
    const reportHtml = generateExecutiveReportHtml(
      'employees',
      [
        {
          id: 'EMP-SAF-1',
          company_id: 'SAF',
          name: 'سعد بن فهد العتيبي',
          role: 'مدير عمليات',
          department: 'العمليات',
          salary: 12000,
          status: 'نشط',
        },
      ],
      'بيان موظفي السفير الماسي',
      false,
      {
        entityCode: 'SAF',
        hideHoldingGroupBrand: true,
      }
    );
    expect(reportHtml).toContain('السفير الماسي');
    expect(reportHtml).not.toContain('مجموعة خالد السليم');
    expect(reportHtml).not.toContain('#0066ff');
    expect(reportHtml).not.toContain('\u0631.\u0633');

    const shareMsg = buildEntityShareText({
      title: 'شهادة تعريف بالراتب',
      recipientName: 'سعد بن فهد العتيبي',
      entityCode: 'SAF',
      hideHoldingGroupBrand: true,
      summaryLines: [{ label: 'الراتب الإجمالي', value: '⃁ 12,000' }],
    });
    expect(shareMsg.subject).toContain('السفير الماسي');
    expect(shareMsg.body).not.toContain('مجموعة خالد السليم');

    // 5. Infer entity code from homogeneous record list
    expect(
      inferEntityCodeFromRecordOrList([
        { id: 1, company_id: 'YAQ' },
        { id: 2, company_id: 'YAQ' },
      ])
    ).toBe('YAQ');
  });

  it('supports pre-export interactive header & cell editing and row-aware multi-page PDF chunking', () => {
    const sampleRows = Array.from({ length: 22 }, (_, i) => ({
      id: `CL-${i + 1}`,
      name: `عميل رقم ${i + 1}`,
      phone: `05000000${String(i + 1).padStart(2, '0')}`,
      national_id: `10998877${String(i + 1).padStart(2, '0')}`,
      status: 'نشط',
    }));

    // Test editableHeaders (sparse record map) + editableRows override in CSV & HTML
    const editedCsv = buildCsvContent('clients', sampleRows.slice(0, 2), 'قائمة عملاء مخصصة', {
      selectedColumnIndices: [0, 1, 2],
      editableHeaders: { 1: 'الاسم المعدل للعميل' },
      editableRows: [
        ['CL-100', 'شركة التميز المحدودة', '0551234567'],
        ['CL-200', 'مؤسسة الأفق الحديث', '0557654321'],
      ],
    });
    expect(editedCsv).toContain('الاسم المعدل للعميل');
    expect(editedCsv).toContain('شركة التميز المحدودة');
    expect(editedCsv).not.toContain('عميل رقم 1');

    // Test multi-page PDF chunking (22 rows in portrait -> 17 rows on page 1 + 5 rows on page 2)
    const chunks = buildRowAwarePdfPageHtmlChunks(
      'clients',
      sampleRows,
      'سجل العملاء المعتمد',
      false,
      {
        selectedColumnIndices: [0, 1, 2, 3],
        entityCode: 'TOP',
        hideHoldingGroupBrand: true,
      }
    );
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toContain('صفحة 1 من 2');
    expect(chunks[1]).toContain('صفحة 2 من 2');
    expect(chunks[0]).not.toContain('مجموعة خالد السليم');
    // Signatures appear only on final page chunk
    expect(chunks[0]).not.toContain('اعتماد الإدارة والختم الرسمي');
    expect(chunks[1]).toContain('اعتماد الإدارة والختم الرسمي');
  });

  it('normalizes Saudi WhatsApp phones, archives soft-deleted records for 30-day restore, and logs field-level edits', () => {
    expect(normalizeSaudiWhatsAppNumber('0551234567')).toBe('966551234567');
    expect(normalizeSaudiWhatsAppNumber('+966 50 987 6543')).toBe('966509876543');
    expect(normalizeSaudiWhatsAppNumber('541112233')).toBe('966541112233');

    const binEntry = archiveRecordBeforeSoftDelete({
      tableName: 'custodies',
      record: { id: 'CUS-77', item_name: 'حاسب محمول MacBook Pro', company_id: 'DAR' },
      recordTitle: 'حاسب محمول MacBook Pro',
      reason: 'اختبار أرشفة واستعادة',
      deletedBy: 'مدير الموارد البشرية',
      companyId: 'DAR',
    });

    expect(listRecycleBinEntries('custodies').length).toBe(1);
    const popped = popRecycleBinEntryForRestore(binEntry.binId);
    expect(popped?.originalId).toBe('CUS-77');
    expect(listRecycleBinEntries('custodies').length).toBe(0);

    const diffs = recordFieldLevelChanges({
      tableName: 'hr_employees',
      recordId: 'EMP-900',
      recordLabel: 'خالد العتيبي',
      before: { basic_salary: 7000, department: 'المبيعات' },
      after: { basic_salary: 8500, department: 'العمليات' },
      actorName: 'مدير شؤون الموظفين',
      companyId: 'YAQ',
    });
    expect(diffs.length).toBe(2);
    const history = listFieldAuditHistory('EMP-900');
    expect(history.length).toBe(2);
    expect(history.some((h) => h.fieldKey === 'basic_salary' && h.newValue === '8500')).toBe(true);
  });

  it('synchronizes employee CRUD & documents across hr_employees and employees tables', async () => {
    const saved = await saveUnifiedEmployeeProfile(
      {
        id: 'EMP-SYNC-01',
        employee_code: 'YAQ-1050',
        company_id: 'YAQ',
        name: 'سلطان بن محمد الحربي',
        national_id: '1088776655',
        phone: '0554433221',
        email: 'sultan@yaqoot-ops.sa',
        job_title: 'مشرف تشغيل ميداني',
        department: 'التشغيل',
        basic_salary: 6000,
        housing_allowance: 1500,
        transport_allowance: 500,
        leave_balance: 24,
        iban: 'SA4480000000608010167519',
      },
      null,
      'اختبار المزامنة'
    );

    expect(saved.company_id).toBe('YAQ');
    expect(saved.salary).toBe(8000);

    const hrList = await realErpDataStore.getRecords<any>('hr_employees', []);
    const coreList = await realErpDataStore.getRecords<any>('employees', []);
    expect(hrList.some((e) => e.id === 'EMP-SYNC-01' && e.leave_balance === 24)).toBe(true);
    expect(coreList.some((e) => e.id === 'EMP-SYNC-01' && e.leave_balance === 24)).toBe(true);

    // Seed & add persistent employee documents
    const seededDocs = await getPersistentEmployeeDocuments(saved);
    expect(seededDocs.length).toBeGreaterThanOrEqual(4);
    const customDoc = await addPersistentEmployeeDocument({
      employee_id: saved.id,
      employee_code: saved.employee_code,
      employee_name: saved.name,
      company_id: 'YAQ',
      title: 'شهادة احترافية في إدارة المشاريع PMP',
      category: 'شهادة علمية/مهنية',
      documentNumber: 'PMP-2026-998',
      issueDate: '2026-01-10',
      expiryDate: '2029-01-10',
      verified: true,
      version: 1,
    });
    expect(customDoc.status).toBe('ساري');

    // Soft-delete & restore across both tables
    const binItem = await softDeleteUnifiedEmployeeProfile(saved, 'نقل مؤقت للأرشيف');
    const afterDeleteHr = await realErpDataStore.getRecords<any>('hr_employees', []);
    expect(afterDeleteHr.some((e) => e.id === 'EMP-SYNC-01')).toBe(false);

    await restoreUnifiedEmployeeFromBin(binItem);
    const afterRestoreHr = await realErpDataStore.getRecords<any>('hr_employees', []);
    expect(afterRestoreHr.some((e) => e.id === 'EMP-SYNC-01')).toBe(true);
  });

  it('calculates net leave days and executes post-approval return, early cut refund, extension, and cancellation', async () => {
    saveHrLeavePolicy({
      ...DEFAULT_HR_LEAVE_POLICY,
      excludeWeekendsFromAnnual: true,
      excludeSaudiOfficialHolidays: true,
      officialHolidayDates: ['09-23'], // Saudi National Day
    });

    // 2026-09-20 (Sun) to 2026-09-26 (Sat) = 7 calendar days:
    // excludes Fri (09-25) & Sat (09-26) = 2 weekend days, plus Wed (09-23) = 1 holiday => 4 net deductible days
    const breakdown = calculateNetLeaveDays('2026-09-20', '2026-09-26');
    expect(breakdown.calendarDays).toBe(7);
    expect(breakdown.weekendDaysExcluded).toBe(2);
    expect(breakdown.holidayDaysExcluded).toBe(1);
    expect(breakdown.netDeductibleDays).toBe(4);

    // Reset policy to calendar default (excludeWeekendsFromAnnual: false) for deterministic day math
    saveHrLeavePolicy({
      ...DEFAULT_HR_LEAVE_POLICY,
      excludeWeekendsFromAnnual: false,
      excludeSaudiOfficialHolidays: false,
    });

    await saveUnifiedEmployeeProfile(
      {
        id: 'EMP-LV-01',
        employee_code: 'SAF-2001',
        company_id: 'SAF',
        name: 'فهد بن خالد الدوسري',
        leave_balance: 20,
        basic_salary: 5000,
      },
      null,
      'اختبار الإجازات'
    );

    await realErpDataStore.addRecord<any>('hr_leave_requests', {
      id: 'LV-TEST-100',
      company_id: 'SAF',
      employee_id: 'EMP-LV-01',
      employee_name: 'فهد بن خالد الدوسري',
      leave_type: 'إجازة سنوية',
      start_date: '2026-11-01',
      end_date: '2026-11-10', // 10 days
      days_count: 10,
      status: 'معتمدة',
    });

    // 1. Overdue return alert detection (reference date 2026-11-14 -> 4 days overdue)
    const returnAlerts = scanLeaveReturnAlerts(
      await realErpDataStore.getRecords<any>('hr_leave_requests', []),
      new Date('2026-11-14T00:00:00Z')
    );
    expect(returnAlerts.some((a) => a.leaveId === 'LV-TEST-100' && a.kind === 'OVERDUE_RETURN')).toBe(
      true
    );

    // 2. Early cut to 2026-11-06 (6 days instead of 10 -> refunds +4 days => balance 24)
    const cutResult = await cutLeaveEarlyAndRefundBalance({
      leaveId: 'LV-TEST-100',
      newEndDate: '2026-11-06',
      reason: 'مباشرة مبكرة لحاجة العمل',
    });
    expect(cutResult.refundedDays).toBe(4);
    expect(cutResult.newBalance).toBe(24);

    const hrEmpsAfterCut = await realErpDataStore.getRecords<any>('hr_employees', []);
    const coreEmpsAfterCut = await realErpDataStore.getRecords<any>('employees', []);
    expect(hrEmpsAfterCut.find((e) => e.id === 'EMP-LV-01')?.leave_balance).toBe(24);
    expect(coreEmpsAfterCut.find((e) => e.id === 'EMP-LV-01')?.leave_balance).toBe(24);

    // 3. Extend leave to 2026-11-08 (+2 extra days => deducts 2 => balance 22)
    const extResult = await extendApprovedLeave({
      leaveId: 'LV-TEST-100',
      newEndDate: '2026-11-08',
      reason: 'تمديد بموافقة الإدارة',
    });
    expect(extResult.extraDays).toBe(2);
    expect(extResult.newBalance).toBe(22);

    // 4. Confirm return on time (2026-11-09)
    const confirmRes = await confirmReturnFromLeave({
      leaveId: 'LV-TEST-100',
      actualReturnDate: '2026-11-09',
      notes: 'باشر العمل في الموعد',
    });
    expect(confirmRes.updatedLeave.return_status).toBe('RETURNED_ON_TIME');

    // 5. Cancel a second approved leave and refund full 5 days (22 + 5 = 27)
    await realErpDataStore.addRecord<any>('hr_leave_requests', {
      id: 'LV-TEST-200',
      company_id: 'SAF',
      employee_id: 'EMP-LV-01',
      employee_name: 'فهد بن خالد الدوسري',
      leave_type: 'إجازة سنوية',
      start_date: '2026-12-01',
      end_date: '2026-12-05',
      days_count: 5,
      status: 'معتمدة',
    });

    const cancelRes = await cancelApprovedLeaveAndRefund({
      leaveId: 'LV-TEST-200',
      reason: 'إلغاء الإجازة بناءً على طلب الموظف',
    });
    expect(cancelRes.refundedDays).toBe(5);
    expect(cancelRes.newBalance).toBe(27);
  });

  it('scans overdue leave returns & company commercial licenses in Smart Alerts and executes 1-click corrective actions', async () => {
    await realErpDataStore.addRecord<any>('hr_leave_requests', {
      id: 'LV-OVERDUE-55',
      company_id: 'SAF',
      employee_id: 'EMP-55',
      employee_name: 'ماجد السبيعي',
      leave_type: 'إجازة سنوية',
      start_date: '2026-11-01',
      end_date: '2026-11-10',
      days_count: 10,
      status: 'معتمدة',
    });

    const alerts = scanHrComplianceRadars({
      companyId: 'SAF',
      referenceDateIso: '2026-11-14',
      employees: [
        {
          id: 'EMP-55',
          name: 'ماجد السبيعي',
          nationality: 'سعودي',
          basicSalary: 6000,
        },
      ],
      leaveRequests: await realErpDataStore.getRecords<any>('hr_leave_requests', []),
      companyLicenses: [
        {
          id: 'LIC-SAF-MSN-TEST',
          company_id: 'SAF',
          company_name: 'شركة السفير الماسي للاستقدام',
          license_type: 'MUSANED',
          license_title_ar: 'ترخيص مساند للاستقدام',
          license_number: 'MSN-1010',
          expiry_date: '2026-11-25', // 11 days remaining -> critical!
        },
      ],
    });

    const leaveAlert = alerts.find((a) => a.category === 'LEAVE_RETURN_OVERDUE');
    const licenseAlert = alerts.find((a) => a.category === 'COMPANY_LICENSE_EXPIRY');

    expect(leaveAlert).toBeDefined();
    expect(leaveAlert?.correctiveActionCode).toBe('CONFIRM_LEAVE_RETURN_NOW');
    expect(licenseAlert).toBeDefined();
    expect(licenseAlert?.correctiveActionCode).toBe('RENEW_COMPANY_LICENSE');

    const actionOut = await executeHrSmartAlertCorrectiveAction(leaveAlert!, {
      actorName: 'مدير الموارد البشرية',
      showPopup: false,
    });
    expect(actionOut.success).toBe(true);
    expect(actionOut.updatedAlert.acknowledged).toBe(true);
  });
});

describe('Custom Job Titles, Departments, Grades & Full Employee Editing', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CUSTOM_JOB_TITLES_STORAGE_KEY);
      window.localStorage.removeItem(CUSTOM_DEPARTMENTS_STORAGE_KEY);
      window.localStorage.removeItem(CUSTOM_GRADES_STORAGE_KEY);
    }
  });

  it('persists new custom job titles, renames them across employees, and deletes cleanly', async () => {
    const afterAdd = saveCustomJobTitle('مهندس حوكمة وذكاء اصطناعي');
    expect(afterAdd).toContain('مهندس حوكمة وذكاء اصطناعي');
    expect(loadCustomJobTitles()).toContain('مهندس حوكمة وذكاء اصطناعي');

    await saveUnifiedEmployeeProfile(
      {
        id: 'EMP-TITLE-SYNC-1',
        employee_code: 'EMP-SAF-880',
        company_id: 'SAF',
        name: 'عادل فهد الدوسري',
        national_id: '1088776655',
        job_title: 'مهندس حوكمة وذكاء اصطناعي',
        department: 'التحول الرقمي المؤسسي',
        grade: 'الدرجة السادسة (خبير)',
        salary: 16000,
      },
      null,
      'مدير الموارد البشرية'
    );

    const renameRes = await renameCustomJobTitleAndSyncEmployees(
      'مهندس حوكمة وذكاء اصطناعي',
      'رئيس قسم الذكاء المؤسسي والحوكمة'
    );
    expect(renameRes.titles).toContain('رئيس قسم الذكاء المؤسسي والحوكمة');
    expect(renameRes.titles).not.toContain('مهندس حوكمة وذكاء اصطناعي');
    expect(renameRes.updatedEmployeesCount).toBeGreaterThanOrEqual(1);

    const afterDelete = deleteCustomJobTitle('رئيس قسم الذكاء المؤسسي والحوكمة');
    expect(afterDelete).not.toContain('رئيس قسم الذكاء المؤسسي والحوكمة');
  });

  it('auto-registers new title/department/grade and persists edited custom fields and notes', async () => {
    const saved = await saveUnifiedEmployeeProfile(
      {
        id: 'EMP-FULL-EDIT-99',
        employee_code: 'EMP-KAS-991',
        company_id: 'KAS',
        name: 'نواف سلطان القحطاني',
        name_en: 'Nawaf Sultan Al-Qahtani',
        national_id: '1099112233',
        job_title: 'كبير مهندسي الامتثال التشغيلي',
        department: 'إدارة الجود والتميز المؤسسي',
        grade: 'الدرجة القيادية الخاصة',
        basic_salary: 12000,
        housing_allowance: 3000,
        transport_allowance: 1500,
        other_allowances: 500,
        notes: 'ملف محرر بالكامل مع صلاحيات إشرافية.',
        custom_fields: [
          { id: 'cf-1', label: 'فصيلة الدم', value: 'O+' },
          { id: 'cf-2', label: 'رقم الرخصة المهنية', value: 'SEC-9981' },
        ],
      },
      null,
      'المدير التنفيذي'
    );

    expect(saved.salary).toBe(17000);
    expect(saved.custom_fields).toHaveLength(2);
    expect(saved.notes).toContain('ملف محرر بالكامل');
    expect(loadCustomJobTitles()).toContain('كبير مهندسي الامتثال التشغيلي');
    expect(loadCustomDepartments()).toContain('إدارة الجود والتميز المؤسسي');
    expect(loadCustomGrades()).toContain('الدرجة القيادية الخاصة');
  });
});
