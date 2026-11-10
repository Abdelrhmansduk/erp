import { describe, it, expect, beforeEach } from 'vitest';
import {
  authService,
  getFullStaffDirectory,
  KAS_ALLOWED_EMPLOYEES,
  EXCLUDED_KAS_EMAILS,
  validateAllowedCorporateEmail,
} from './authService';
import { VERIFIED_FIREBASE_GOOGLE_ACCOUNTS, getCachedGoogleProfile } from './firebaseClient';
import { DEMO_AUTH_ENABLED } from '../config/authMode';
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
    expect(authService.isTabAuthorizedForUser(null, 'dashboard')).toBe(true);
  });

  it('rejects empty credentials', async () => {
    const res = await authService.signIn('', '');
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
  });

  it('demo mode is enabled in the test/dev environment only', () => {
    expect(DEMO_AUTH_ENABLED).toBe(true);
  });

  it('characterize: signIn given executive identifier, returns executive profile and locks company session', async () => {
    // Captures Hybrid Email Auth behavior for pre-registered executive account
    const res = await authService.signIn('chairman@alsulaim.sa', 'ValidPass2026!');
    expect(res.error).toBeNull();
    expect(res.data?.department_id).toBe('executive');
    expect(res.data?.company_id).toBe('all');
  });

  it('characterize: signIn given subsidiary finance email (@saf-rec.sa), routes to finance department and authorizes finance tabs', async () => {
    const res = await authService.signIn('finance.accountant@saf-rec.sa', 'SecurePass99');
    expect(res.error).toBeNull();
    expect(res.data?.company_id).toBe('SAF');
    expect(res.data?.department_id).toBe('finance');
    expect(authService.isTabAuthorizedForUser(res.data, 'finance-home')).toBe(true);
    expect(authService.isTabAuthorizedForUser(res.data, 'shelter-suite')).toBe(false);
  });

  it('characterize: signInWithEmail rejects empty email and accepts valid corporate email with custom full name', async () => {
    const emptyRes = await authService.signInWithEmail('   ');
    expect(emptyRes.data).toBeNull();
    expect(emptyRes.error).not.toBeNull();

    const validRes = await authService.signInWithEmail('hr.lead@yaqoot-ops.sa', 'مدير الموارد البشرية', 'YAQ');
    expect(validRes.error).toBeNull();
    expect(validRes.data?.email).toBe('hr.lead@yaqoot-ops.sa');
    expect(validRes.data?.full_name).toBe('مدير الموارد البشرية');
  });

  it('characterize: validateCompanyAccess enforces strict multi-company tenant isolation for subsidiary staff', async () => {
    const safStaff = await authService.signIn('saf.specialist@saf-rec.sa', 'SecurePass99', 'SAF');
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

  it('synchronizes Firebase Google user info and avatar_url across signInWithGoogle and staff directory', async () => {
    expect(VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.length).toBeGreaterThanOrEqual(5);
    const primaryGoogle = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS[0];
    expect(primaryGoogle.email).toBe('abdo12uk@gmail.com');
    expect(primaryGoogle.photoURL).toContain('https://lh3.googleusercontent.com/');

    const res = await authService.signInWithGoogle({
      email: primaryGoogle.email,
      full_name: primaryGoogle.fullNameAr,
      avatar_url: primaryGoogle.photoURL,
    });
    expect(res.error).toBeNull();
    expect(res.data?.email).toBe('abdo12uk@gmail.com');
    expect(res.data?.avatar_url).toBe(primaryGoogle.photoURL);
    expect(getCachedGoogleProfile()?.photoURL).toBe(primaryGoogle.photoURL);

    const dirMatch = getFullStaffDirectory().find((e) => e.email === 'abdo12uk@gmail.com');
    expect(dirMatch?.avatar_url).toBe(primaryGoogle.photoURL);
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

    // 4. Verify departmental login & dedicated screen routing across the 9 @kas.sa sectors
    const khalid = await authService.signIn('Khalid@kas.sa', 'Pass123!');
    expect(khalid.error).toBeNull();
    expect(khalid.data?.company_id).toBe('all');
    expect(khalid.data?.department_id).toBe('executive');
    expect(khalid.data?.default_tab).toBe('dashboard');
    expect(authService.isAdmin(khalid.data)).toBe(true);

    const hrHead = await authService.signIn('HR@kas.sa', 'Pass123!');
    expect(hrHead.error).toBeNull();
    expect(hrHead.data?.full_name).toContain('ريم احمد بن حسين');
    expect(hrHead.data?.department_id).toBe('hr');
    expect(hrHead.data?.default_tab).toBe('employees');
    expect(authService.isTabAuthorizedForUser(hrHead.data, 'employees')).toBe(true);
    expect(authService.isTabAuthorizedForUser(hrHead.data, 'shelter-suite')).toBe(false);

    const chiefAcc = await authService.signIn('a.alkinani.acc@kas.sa', 'Pass123!');
    expect(chiefAcc.error).toBeNull();
    expect(chiefAcc.data?.department_id).toBe('finance');
    expect(chiefAcc.data?.default_tab).toBe('smacc-accounting');
    expect(authService.validateCompanyAccess(chiefAcc.data, 'SAF').allowed).toBe(true);
    expect(authService.validateCompanyAccess(chiefAcc.data, 'YAQ').allowed).toBe(false);

    const safirOps = await authService.signIn('h.hassan.safir@kas.sa', 'Pass123!');
    expect(safirOps.data?.company_id).toBe('SAF');
    expect(safirOps.data?.department_id).toBe('recruitment');
    expect(safirOps.data?.default_tab).toBe('recruitment-contracts');

    const topazSup = await authService.signIn('a.eissa.topaz@kas.sa', 'Pass123!');
    expect(topazSup.data?.company_id).toBe('TOP');
    expect(topazSup.data?.department_id).toBe('recruitment');
    expect(topazSup.data?.default_tab).toBe('recruitment-contracts');

    const yaqootSup = await authService.signIn('h.yousef.yaqoot@kas.sa', 'Pass123!');
    expect(yaqootSup.data?.company_id).toBe('YAQ');
    expect(yaqootSup.data?.department_id).toBe('recruitment');
    expect(yaqootSup.data?.default_tab).toBe('recruitment-contracts');

    const darMusaned = await authService.signIn('a.abdelwahab.daralrowad@kas.sa', 'Pass123!');
    expect(darMusaned.data?.company_id).toBe('DAR');
    expect(darMusaned.data?.department_id).toBe('recruitment');
    expect(darMusaned.data?.default_tab).toBe('recruitment-contracts');

    const mktHead = await authService.signIn('mustafa.marketing@kas.sa', 'Pass123!');
    expect(mktHead.data?.department_id).toBe('crm');
    expect(mktHead.data?.default_tab).toBe('clients');

    const salesMgr = await authService.signIn('m.khalifa.sales@kas.sa', 'Pass123!');
    expect(salesMgr.data?.company_id).toBe('SAF');
    expect(salesMgr.data?.department_id).toBe('recruitment');
    expect(salesMgr.data?.default_tab).toBe('ingaz-delegations');

    const showroom = await authService.signIn('b.allaboudi.showroom@kas.sa', 'Pass123!');
    expect(showroom.data?.company_id).toBe('KAS');
    expect(showroom.data?.default_tab).toBe('kas-suite');

    const imalMgr = await authService.signIn('m.alsaleh.imal@kas.sa', 'Pass123!');
    expect(imalMgr.data?.company_id).toBe('KAS');
    expect(imalMgr.data?.department_id).toBe('tenders');
    expect(imalMgr.data?.default_tab).toBe('kas-suite');

    const housingMgr = await authService.signIn('r.aljbr.housing@kas.sa', 'Pass123!');
    expect(housingMgr.data?.company_id).toBe('DAR');
    expect(housingMgr.data?.department_id).toBe('shelter');
    expect(housingMgr.data?.default_tab).toBe('shelter-suite');

    const driver = await authService.signIn('j.encajas.driver@kas.sa', 'Pass123!');
    expect(driver.data?.company_id).toBe('DAR');
    expect(driver.data?.department_id).toBe('shelter');
    expect(driver.data?.default_tab).toBe('travel');
    expect(authService.isTabAuthorizedForUser(driver.data, 'travel')).toBe(true);
    expect(authService.isTabAuthorizedForUser(driver.data, 'finance-home')).toBe(false);
  });
});
