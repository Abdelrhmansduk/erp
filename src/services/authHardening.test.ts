import { describe, it, expect, beforeEach } from 'vitest';
import {
  authService,
  getFullStaffDirectory,
  registerCustomStaffAccount,
  KAS_ALLOWED_EMPLOYEES,
  KAS_EMPLOYEE_PASSWORD_HASHES,
  EXCLUDED_KAS_EMAILS,
  validateAllowedCorporateEmail,
  validateStrongPasswordPolicy,
  generateStrongClientPassword,
  saveCustomEmployeePassword,
} from './authService';
import { VERIFIED_FIREBASE_GOOGLE_ACCOUNTS, getCachedGoogleProfile } from './firebaseClient';
import { DEMO_AUTH_ENABLED } from '../config/authMode';

function provisionVerifiedStrongPassword(email: string): string {
  const strongPass = generateStrongClientPassword();
  saveCustomEmployeePassword(email, strongPass);
  return strongPass;
}
import { generateExecutiveReportHtml, sanitizeCSVField } from './exportService';
import { generateRealCode128BarcodeSvg } from '../utils/realBarcodeGenerator';
import {
  buildCompliantMarketingMessage,
  buildRecurringCheckoutDisclosure,
  getCopyrightRemovalLogs,
  getCopyrightReports,
  maskSensitiveText,
  recordAgeAndGuardianConsent,
  recordCheckoutObligationAcceptance,
  recordCrossBorderTransferConsent,
  recordMarketingConsent,
  removeReportedUploadQuickly,
  scrubTelemetryPayload,
  submitCopyrightReport,
  unsubscribeMarketingImmediately,
} from './menaLegalComplianceService';

describe('authService — session hardening & hybrid email auth characterization', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('never creates a session automatically (no default chairman profile)', () => {
    expect(authService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('ALSULAIM_AUTH_USER')).toBeNull();
  });

  it('denies tab access when there is no profile', () => {
    expect(authService.isTabAuthorizedForUser(null, 'finance-home')).toBe(false);
    expect(authService.isTabAuthorizedForUser(null, 'dashboard')).toBe(false);
  });

  it('rejects empty credentials', async () => {
    const res = await authService.signIn('', '');
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
  });

  it('demo mode is enabled in the test/dev environment only', () => {
    expect(DEMO_AUTH_ENABLED).toBe(true);
  });

  it('characterize: signIn rejects unverified/wrong passwords and accepts verified strong password for owner (khalid@kas.sa)', async () => {
    const wrongRes = await authService.signIn('khalid@kas.sa', 'ValidPass2026!');
    expect(wrongRes.data).toBeNull();
    expect(wrongRes.error).not.toBeNull();

    const demoBypassRes = await authService.signIn('khalid@kas.sa', 'demo-quick-login');
    expect(demoBypassRes.data).toBeNull();
    expect(demoBypassRes.error).not.toBeNull();

    const strongPass = provisionVerifiedStrongPassword('khalid@kas.sa');
    const res = await authService.signIn('khalid@kas.sa', strongPass);
    expect(res.error).toBeNull();
    expect(res.data?.department_id).toBe('executive');
    expect(res.data?.company_id).toBe('all');
    expect(res.data?.authenticated_via).toBe('strong_password');
  });

  it('characterize: signIn given an official list accountant (a.alkinani.acc@kas.sa) with verified strong password, routes to SAF finance', async () => {
    const strongPass = provisionVerifiedStrongPassword('a.alkinani.acc@kas.sa');
    const res = await authService.signIn('a.alkinani.acc@kas.sa', strongPass);
    expect(res.error).toBeNull();
    expect(res.data?.company_id).toBe('SAF');
    expect(res.data?.department_id).toBe('finance');
  });

  it('only accounts from the official employee list (ايميلات_الموظفين.xlsx) may sign in', async () => {
    const removed = [
      'chairman@alsulaim.sa',
      'finance.accountant@saf-rec.sa',
      'hr.lead@yaqoot-ops.sa',
      'abdo12uk@gmail.com',
      'msalhnwr@gmail.com',
      'kamel.adsens@gmail.com',
    ];
    for (const email of removed) {
      const res = await authService.signIn(email, 'Ks9#StrongAttempt!26');
      expect(res.data, email).toBeNull();
      expect(res.error, email).not.toBeNull();
    }
    expect(getFullStaffDirectory().every((e) => e.email.toLowerCase().endsWith('@kas.sa'))).toBe(true);
  });

  it('characterize: signInWithEmail rejects empty email or missing password, and accepts an official list email with verified strong password', async () => {
    const emptyRes = await authService.signInWithEmail('   ');
    expect(emptyRes.data).toBeNull();
    expect(emptyRes.error).not.toBeNull();

    const noPassRes = await authService.signInWithEmail('hr@kas.sa', 'ريم احمد بن حسين');
    expect(noPassRes.data).toBeNull();
    expect(noPassRes.error).not.toBeNull();

    const hrPass = provisionVerifiedStrongPassword('hr@kas.sa');
    const validRes = await authService.signInWithEmail('hr@kas.sa', 'ريم احمد بن حسين', undefined, hrPass);
    expect(validRes.error).toBeNull();
    expect(validRes.data?.email).toBe('hr@kas.sa');
  });

  it('characterize: validateCompanyAccess enforces strict multi-company tenant isolation for subsidiary staff', async () => {
    const safPass = provisionVerifiedStrongPassword('h.hassan.safir@kas.sa');
    const safStaff = await authService.signIn('h.hassan.safir@kas.sa', safPass, 'SAF');
    expect(safStaff.data).not.toBeNull();

    const sameComp = authService.validateCompanyAccess(safStaff.data, 'SAF');
    expect(sameComp.allowed).toBe(true);

    const crossComp = authService.validateCompanyAccess(safStaff.data, 'YAQ');
    expect(crossComp.allowed).toBe(false);
    expect(crossComp.reason).toContain('رفض أمني');
  });

  it('escapes HTML/XSS payloads in generateExecutiveReportHtml and barcode SVG attributes', () => {
    const html = generateExecutiveReportHtml(
      'clients',
      [{ name: '<img src=x onerror=alert(1)>', phone: '+966500000123' }],
      '<script>alert("xss")</script>',
      false,
      { executiveNote: '<svg onload=alert(2)>' }
    );
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<svg onload=alert(2)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');

    const svg = generateRealCode128BarcodeSvg('DOC"><script>alert(1)</script>', { showText: true });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('sanitizes CSV formula injection vectors including leading tabs and whitespace', () => {
    expect(sanitizeCSVField('=cmd|\'/C calc\'!A0')).toBe("'=cmd|'/C calc'!A0");
    expect(sanitizeCSVField('\t=SUM(A1:A2)')).toBe("'\t=SUM(A1:A2)");
    expect(sanitizeCSVField('  -1+1')).toBe("'  -1+1");
  });

  it('has no verified Google accounts outside the official @kas.sa list, and rejects Google sign-in for removed Gmail accounts', async () => {
    expect(VERIFIED_FIREBASE_GOOGLE_ACCOUNTS).toHaveLength(0);

    const res = await authService.signInWithGoogle({
      email: 'abdo12uk@gmail.com',
      full_name: 'Abdelrhman Abusalif',
    });
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
    expect(getCachedGoogleProfile()).toBeNull();
    expect(getFullStaffDirectory().some((e) => e.email === 'abdo12uk@gmail.com')).toBe(false);
  });

  it('enforces all 6 MENA legal compliance traps (Saudi PDPL Art. 11, Egypt Art. 1 & 12, Qatar Art. 22, Saudi E-Commerce Art. 18, Saudi Copyright Art. 49, Oman Art. 23)', async () => {
    // 1. Saudi PDPL Art. 11: Masks emails, IBANs, card numbers, phones, and sensitive object keys
    const rawText = 'Contact user@example.com or +966543389314 with IBAN SA0380000000608010167519';
    const masked = maskSensitiveText(rawText);
    expect(masked).not.toContain('user@example.com');
    expect(masked).not.toContain('966543389314');
    expect(masked).toContain('[MASKED_EMAIL]');

    const scrubbed = scrubTelemetryPayload({
      password: 'secretPassword',
      userEmail: 'admin@alsulaim.sa',
      route: '/dashboard',
    });
    expect(scrubbed.password).toBe('[MASKED_BY_PDPL_ART11]');
    expect(scrubbed.userEmail).toBe('[MASKED_BY_PDPL_ART11]');
    expect(scrubbed.route).toBe('/dashboard');

    // 2. Egypt PDPL 151/2020 Arts. 1 & 12: Rejects minor signup without guardian consent and stores guardian record when provided
    await expect(
      recordAgeAndGuardianConsent({
        applicantEmail: 'minor@example.eg',
        applicantName: 'أحمد محمد',
        countryCode: 'EG',
        ageStatus: 'minor_with_guardian_consent',
        isMinor: true,
        guardianConsentAccepted: false,
        source: 'unit_test',
      })
    ).rejects.toThrow();

    const guardianRec = await recordAgeAndGuardianConsent({
      applicantEmail: 'minor@example.eg',
      applicantName: 'أحمد محمد',
      countryCode: 'EG',
      ageStatus: 'minor_with_guardian_consent',
      isMinor: true,
      guardianName: 'محمد علي',
      guardianContact: 'parent@example.eg',
      guardianConsentAccepted: true,
      source: 'unit_test',
    });
    expect(guardianRec.id).toContain('GC-');
    expect(guardianRec.guardianName).toBe('محمد علي');

    // 3. Qatar PDPPL Art. 22 / Saudi Art. 25 / Egypt Art. 17: Stores marketing consent and executes immediate unsubscribe
    const mkt = await recordMarketingConsent({
      recipient: 'client@doha.qa',
      channel: 'email',
      source: 'unit_test_waitlist',
    });
    expect(mkt.status).toBe('subscribed');
    expect(mkt.unsubscribeUrl).toContain('unsubscribe=client%40doha.qa');

    const msg = buildCompliantMarketingMessage({
      recipient: 'client@doha.qa',
      bodyText: 'عرض باقات التشغيل الجديدة',
      channel: 'email',
    });
    expect(msg).toContain('رسالة تسويقية');
    expect(msg).toContain('مجموعة خالد السليم القابضة');
    expect(msg).toContain('unsubscribe=');

    const unsub = await unsubscribeMarketingImmediately('client@doha.qa');
    expect(unsub.unsubscribedCount).toBeGreaterThanOrEqual(1);

    // 4. Saudi E-Commerce Law Art. 18 & Reg Art. 7: Recurring checkout disclosure with full price, repeat frequency, end date, cancellation & obligation button
    const disclosure = buildRecurringCheckoutDisclosure({
      packageId: 'PKG-01',
      packageName: 'الباقة الشهرية المرنة',
      monthlyPricePerWorker: 2450,
      discountPct: 0,
      vatPct: 15,
      securityDepositPerWorker: 500,
      durationMonths: 3,
      workersCount: 1,
      startDate: new Date('2026-11-10T00:00:00Z'),
    });
    expect(disclosure.repeats).toBe(true);
    expect(disclosure.endDateIso).toBe('2027-02-10');
    expect(disclosure.payButtonLabelAr).toContain('تأكيد الاشتراك والالتزام بالدفع');
    expect(disclosure.payButtonLabelAr).toContain('⃁');
    const chkLog = recordCheckoutObligationAcceptance(disclosure);
    expect(chkLog.acknowledgedPaymentObligation).toBe(true);

    // 5. Saudi Copyright Law 2026 Art. 49: Report upload, review queue, and quick removal with timestamped log
    const rep = submitCopyrightReport({
      recordId: 'REC-99',
      fileName: 'infringing-image.png',
      reporterContact: 'owner@studio.sa',
      reason: 'صورة محمية بحقوق المؤلف',
    });
    expect(getCopyrightReports().some((r) => r.id === rep.id && r.status === 'pending')).toBe(true);

    const { updatedReport, removalLog } = removeReportedUploadQuickly({
      reportId: rep.id,
      removedBy: 'admin@alsulaim.sa',
    });
    expect(updatedReport.status).toBe('removed');
    expect(removalLog.fileName).toBe('infringing-image.png');
    expect(getCopyrightRemovalLogs().some((l) => l.id === removalLog.id)).toBe(true);

    // 6. Oman PDPL Art. 23 & Exec Reg Art. 37: Explicit cross-border transfer consent
    const xfer = recordCrossBorderTransferConsent({
      userEmail: 'user@muscat.om',
      userCountryCode: 'OM',
      acceptedExplicitly: true,
      source: 'unit_test',
    });
    expect(xfer.acceptedExplicitly).toBe(true);
    expect(xfer.destinationsAcknowledged.length).toBeGreaterThanOrEqual(4);
  });

  it('enforces @kas.sa corporate employee whitelist, strictly excludes Osama Saeed (o.saeed.hospitality@kas.sa — Buffet Kitchen), and routes each department to its dedicated screen', async () => {
    // 1. Verify 69 approved @kas.sa accounts & exclusion of Osama Saeed (#68)
    expect(KAS_ALLOWED_EMPLOYEES.length).toBe(69);
    expect(
      KAS_ALLOWED_EMPLOYEES.some((e) => e.email.toLowerCase() === 'o.saeed.hospitality@kas.sa')
    ).toBe(false);
    expect(EXCLUDED_KAS_EMAILS['o.saeed.hospitality@kas.sa']).toBeDefined();

    // 2. Strictly reject Osama Saeed (Buffet Kitchen) across signIn, signInWithEmail, and sendMagicLink
    const osamaCheck = validateAllowedCorporateEmail('o.saeed.hospitality@kas.sa');
    expect(osamaCheck.allowed).toBe(false);
    expect(osamaCheck.reason).toContain('مطبخ البوفيه');

    const osamaSignIn = await authService.signIn('o.saeed.hospitality@kas.sa', 'Pass123!');
    expect(osamaSignIn.data).toBeNull();
    expect(osamaSignIn.error?.message).toContain('مطبخ البوفيه');

    const osamaEmailSignIn = await authService.signInWithEmail('o.saeed.hospitality@kas.sa');
    expect(osamaEmailSignIn.data).toBeNull();
    expect(osamaEmailSignIn.error?.message).toContain('مطبخ البوفيه');

    const osamaMagic = await authService.sendMagicLink('o.saeed.hospitality@kas.sa');
    expect(osamaMagic.error).toContain('مطبخ البوفيه');

    // 3. Reject unlisted @kas.sa or external emails
    const unlistedRes = await authService.signIn('unknown.person@kas.sa', 'Pass123!');
    expect(unlistedRes.data).toBeNull();
    expect(unlistedRes.error?.message).toContain('رفض أمني');

    const strangerRes = await authService.signInWithEmail('random.hacker@gmail.com');
    expect(strangerRes.data).toBeNull();
    expect(strangerRes.error?.message).toContain('رفض أمني');

    // 4. Verify departmental login & dedicated screen routing across the 9 @kas.sa sectors using verified strong passwords
    const khalid = await authService.signIn('Khalid@kas.sa', provisionVerifiedStrongPassword('khalid@kas.sa'));
    expect(khalid.error).toBeNull();
    expect(khalid.data?.company_id).toBe('all');
    expect(khalid.data?.department_id).toBe('executive');
    expect(khalid.data?.default_tab).toBe('dashboard');
    expect(authService.isAdmin(khalid.data)).toBe(true);

    const hrHead = await authService.signIn('HR@kas.sa', provisionVerifiedStrongPassword('hr@kas.sa'));
    expect(hrHead.error).toBeNull();
    expect(hrHead.data?.full_name).toContain('ريم احمد بن حسين');
    expect(hrHead.data?.department_id).toBe('hr');
    expect(hrHead.data?.default_tab).toBe('employees');
    expect(authService.isTabAuthorizedForUser(hrHead.data, 'employees')).toBe(true);
    expect(authService.isTabAuthorizedForUser(hrHead.data, 'shelter-suite')).toBe(false);

    const chiefAcc = await authService.signIn('a.alkinani.acc@kas.sa', provisionVerifiedStrongPassword('a.alkinani.acc@kas.sa'));
    expect(chiefAcc.error).toBeNull();
    expect(chiefAcc.data?.department_id).toBe('finance');
    expect(chiefAcc.data?.default_tab).toBe('smacc-accounting');
    expect(authService.validateCompanyAccess(chiefAcc.data, 'SAF').allowed).toBe(true);
    expect(authService.validateCompanyAccess(chiefAcc.data, 'YAQ').allowed).toBe(false);

    const safirOps = await authService.signIn('h.hassan.safir@kas.sa', provisionVerifiedStrongPassword('h.hassan.safir@kas.sa'));
    expect(safirOps.data?.company_id).toBe('SAF');
    expect(safirOps.data?.department_id).toBe('recruitment');
    expect(safirOps.data?.default_tab).toBe('recruitment-contracts');

    const topazSup = await authService.signIn('a.eissa.topaz@kas.sa', provisionVerifiedStrongPassword('a.eissa.topaz@kas.sa'));
    expect(topazSup.data?.company_id).toBe('TOP');
    expect(topazSup.data?.department_id).toBe('recruitment');
    expect(topazSup.data?.default_tab).toBe('recruitment-contracts');

    const yaqootSup = await authService.signIn('h.yousef.yaqoot@kas.sa', provisionVerifiedStrongPassword('h.yousef.yaqoot@kas.sa'));
    expect(yaqootSup.data?.company_id).toBe('YAQ');
    expect(yaqootSup.data?.department_id).toBe('rental');
    expect(yaqootSup.data?.default_tab).toBe('rent-contracts');
    expect(authService.isTabAuthorizedForUser(yaqootSup.data, 'rent-contracts')).toBe(true);
    expect(authService.isTabAuthorizedForUser(yaqootSup.data, 'recruitment-contracts')).toBe(true);

    const darMusaned = await authService.signIn(
      'a.abdelwahab.daralrowad@kas.sa',
      provisionVerifiedStrongPassword('a.abdelwahab.daralrowad@kas.sa')
    );
    expect(darMusaned.data?.company_id).toBe('DAR');
    expect(darMusaned.data?.department_id).toBe('recruitment');
    expect(darMusaned.data?.default_tab).toBe('recruitment-contracts');

    const mktHead = await authService.signIn(
      'mustafa.marketing@kas.sa',
      provisionVerifiedStrongPassword('mustafa.marketing@kas.sa')
    );
    expect(mktHead.data?.department_id).toBe('crm');
    expect(mktHead.data?.default_tab).toBe('clients');

    const salesMgr = await authService.signIn(
      'm.khalifa.sales@kas.sa',
      provisionVerifiedStrongPassword('m.khalifa.sales@kas.sa')
    );
    expect(salesMgr.data?.company_id).toBe('SAF');
    expect(salesMgr.data?.department_id).toBe('recruitment');
    expect(salesMgr.data?.default_tab).toBe('ingaz-delegations');

    const showroom = await authService.signIn(
      'b.allaboudi.showroom@kas.sa',
      provisionVerifiedStrongPassword('b.allaboudi.showroom@kas.sa')
    );
    expect(showroom.data?.company_id).toBe('KAS');
    expect(showroom.data?.department_id).toBe('crm');
    expect(showroom.data?.default_tab).toBe('kas-commercial');

    const imalMgr = await authService.signIn(
      'm.alsaleh.imal@kas.sa',
      provisionVerifiedStrongPassword('m.alsaleh.imal@kas.sa')
    );
    expect(imalMgr.data?.company_id).toBe('KAS');
    expect(imalMgr.data?.department_id).toBe('crm');
    expect(imalMgr.data?.default_tab).toBe('kas-commercial');

    const tradeMgr = await authService.signIn(
      'f.alhassan.trade@kas.sa',
      provisionVerifiedStrongPassword('f.alhassan.trade@kas.sa')
    );
    expect(tradeMgr.data?.company_id).toBe('KAS');
    expect(tradeMgr.data?.department_id).toBe('tenders');
    expect(tradeMgr.data?.default_tab).toBe('kas-suite');

    const housingMgr = await authService.signIn(
      'r.aljbr.housing@kas.sa',
      provisionVerifiedStrongPassword('r.aljbr.housing@kas.sa')
    );
    expect(housingMgr.data?.company_id).toBe('DAR');
    expect(housingMgr.data?.department_id).toBe('shelter');
    expect(housingMgr.data?.default_tab).toBe('shelter-suite');

    const driver = await authService.signIn(
      'j.encajas.driver@kas.sa',
      provisionVerifiedStrongPassword('j.encajas.driver@kas.sa')
    );
    expect(driver.data?.company_id).toBe('DAR');
    expect(driver.data?.department_id).toBe('shelter');
    expect(driver.data?.default_tab).toBe('travel');
    expect(authService.isTabAuthorizedForUser(driver.data, 'travel')).toBe(true);
    expect(authService.isTabAuthorizedForUser(driver.data, 'finance-home')).toBe(false);
  });

  it('prevents RBAC privilege escalation during account activation and blocks excluded @kas.sa registration', async () => {
    // 1. Excluded buffet account cannot register via registerCustomStaffAccount
    expect(() =>
      registerCustomStaffAccount({
        full_name: 'أسامة سعيد',
        username: 'o.saeed.hospitality',
        email: 'o.saeed.hospitality@kas.sa',
        company_id: 'all',
        department_id: 'executive',
      })
    ).toThrow(/مطبخ البوفيه/);

    // 2. Unlisted @kas.sa email cannot register
    expect(() =>
      registerCustomStaffAccount({
        full_name: 'مجهول',
        username: 'stranger',
        email: 'stranger.unknown@kas.sa',
        company_id: 'SAF',
        department_id: 'finance',
      })
    ).toThrow(/رفض أمني/);

    // 3. Wrong password during activation is rejected
    expect(() =>
      registerCustomStaffAccount({
        full_name: 'جوسيلينو انكاجاس',
        username: 'j.encajas.driver',
        email: 'j.encajas.driver@kas.sa',
        company_id: 'all',
        department_id: 'executive',
        password: 'WrongPassword#2026!',
      })
    ).toThrow(/رفض أمني/);

    // 4. Official @kas.sa employee (driver) activating with verified password remains strictly locked to DAR/shelter/travel
    const driverPass = provisionVerifiedStrongPassword('j.encajas.driver@kas.sa');
    const rotatedPass = generateStrongClientPassword();
    const activatedDriver = registerCustomStaffAccount({
      full_name: 'جوسيلينو انكاجاس',
      username: 'j.encajas.driver',
      email: 'j.encajas.driver@kas.sa',
      company_id: 'all',
      department_id: 'executive',
      password: driverPass,
      newStrongPassword: rotatedPass,
    });
    expect(activatedDriver.company_id).toBe('DAR');
    expect(activatedDriver.department_id).toBe('shelter');
    expect(activatedDriver.default_tab).toBe('travel');

    const signedInDriver = await authService.signIn('j.encajas.driver@kas.sa', rotatedPass);
    expect(signedInDriver.data?.company_id).toBe('DAR');
    expect(signedInDriver.data?.department_id).toBe('shelter');
    expect(signedInDriver.data?.default_tab).toBe('travel');
    expect(authService.isAdmin(signedInDriver.data)).toBe(false);
  });

  it('enforces 69 salted SHA-256 strong password hashes and 2-stage Personal Google Account approval for 2nd-time sign-in', async () => {
    // 1. All 69 approved @kas.sa accounts have unique 64-hex digests; excluded account has zero hash
    const hashEntries = Object.entries(KAS_EMPLOYEE_PASSWORD_HASHES);
    expect(hashEntries).toHaveLength(69);
    expect(new Set(hashEntries.map(([, h]) => h)).size).toBe(69);
    for (const emp of KAS_ALLOWED_EMPLOYEES) {
      const digest = KAS_EMPLOYEE_PASSWORD_HASHES[emp.email.toLowerCase()];
      expect(digest, emp.email).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(KAS_EMPLOYEE_PASSWORD_HASHES['o.saeed.hospitality@kas.sa']).toBeUndefined();

    // 2. Strong password policy validation
    expect(validateStrongPasswordPolicy('short1!A').valid).toBe(false);
    expect(validateStrongPasswordPolicy('alllowercase1234!').valid).toBe(false);
    expect(validateStrongPasswordPolicy('NoSpecialChars12345').valid).toBe(false);
    expect(validateStrongPasswordPolicy('demo-quick-login').valid).toBe(false);
    expect(validateStrongPasswordPolicy(generateStrongClientPassword()).valid).toBe(true);

    // 3. Before 1st login & approval, personal Google account CANNOT sign in and unauthenticated bind is rejected
    const beforeBindLogin = await authService.signInWithGoogle({
      email: 'majed.alsaleh.personal@gmail.com',
      full_name: 'Majed Al-Saleh',
    });
    expect(beforeBindLogin.data).toBeNull();
    expect(beforeBindLogin.error?.message).toContain('غير معتمد');

    const unauthBind = authService.bindApprovedGoogleAccount({
      googleEmail: 'majed.alsaleh.personal@gmail.com',
    });
    expect(unauthBind.error).toContain('يجب تسجيل الدخول أولاً');

    // 4. 1st-Time Login via Strong Password -> Employee enters Dashboard & approves personal Google account
    const majedPass = provisionVerifiedStrongPassword('m.alsaleh.imal@kas.sa');
    const firstLogin = await authService.signIn('m.alsaleh.imal@kas.sa', majedPass);
    expect(firstLogin.error).toBeNull();
    expect(firstLogin.data?.email).toBe('m.alsaleh.imal@kas.sa');
    expect(firstLogin.data?.authenticated_via).toBe('strong_password');
    expect(firstLogin.data?.linked_google_email).toBeUndefined();

    // Reject binding @kas.sa corporate email or excluded email as a personal Google account
    const corpBindAttempt = authService.bindApprovedGoogleAccount({
      googleEmail: 'khalid@kas.sa',
    });
    expect(corpBindAttempt.error).toContain('@kas.sa');

    const approvedBind = authService.bindApprovedGoogleAccount({
      googleEmail: 'majed.alsaleh.personal@gmail.com',
      googleDisplayName: 'Majed Al-Saleh',
    });
    expect(approvedBind.error).toBeNull();
    expect(approvedBind.data?.kasEmail).toBe('m.alsaleh.imal@kas.sa');
    expect(approvedBind.data?.googleEmail).toBe('majed.alsaleh.personal@gmail.com');
    expect(authService.getCurrentUser()?.linked_google_email).toBe('majed.alsaleh.personal@gmail.com');

    // 5. Enforce 1-to-1 uniqueness: another employee cannot claim the same personal Google account
    await authService.signOut();
    const khalidPass = provisionVerifiedStrongPassword('khalid@kas.sa');
    await authService.signIn('khalid@kas.sa', khalidPass);
    const duplicateBind = authService.bindApprovedGoogleAccount({
      googleEmail: 'majed.alsaleh.personal@gmail.com',
    });
    expect(duplicateBind.error).toContain('مرتبط مسبقاً');

    // 6. Sign out completely, then 2nd-Time Sign-In directly via the Approved Google Account (zero password needed!)
    await authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();

    const secondLoginViaGoogle = await authService.signInWithGoogle({
      email: 'majed.alsaleh.personal@gmail.com',
      full_name: 'Majed Al-Saleh',
    });
    expect(secondLoginViaGoogle.error).toBeNull();
    expect(secondLoginViaGoogle.data?.email).toBe('m.alsaleh.imal@kas.sa');
    expect(secondLoginViaGoogle.data?.linked_google_email).toBe('majed.alsaleh.personal@gmail.com');
    expect(secondLoginViaGoogle.data?.authenticated_via).toBe('approved_google');
    expect(secondLoginViaGoogle.data?.company_id).toBe('KAS');
    expect(secondLoginViaGoogle.data?.department_id).toBe('crm');
    expect(secondLoginViaGoogle.data?.default_tab).toBe('kas-commercial');

    // Preserve 100% KAS Commercial isolation on 2nd-time Google login
    expect(authService.isTabAuthorizedForUser(secondLoginViaGoogle.data || null, 'kas-commercial')).toBe(true);
    expect(authService.isTabAuthorizedForUser(secondLoginViaGoogle.data || null, 'recruitment-contracts')).toBe(false);
    expect(authService.validateCompanyAccess(secondLoginViaGoogle.data || null, 'SAF').allowed).toBe(false);
  });
});
