import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  resolveCanonicalAgency,
  confirmAliasMergeToAgency,
  parseExcelOrMixedDate,
  extractBackoutFromWorkerName,
  parseMusanedSheetRows,
  importMusanedFollowupWorkbook,
  sanitizeTransactionForExternalAgent,
  evaluateTransactionSla,
  provisionExternalAgencyAccount,
  toggleExternalAgencyAccountStatus,
  updateMusanedTransactionStage,
  dispatchViaEmailAndWhatsApp,
  getMusanedTransactions,
  resolveCoordinatorForAgencyOrTx,
  saveCoordinatorContact,
  getCoordinatorProfiles,
  computeExternalAgencyPasswordDigest,
  verifyExternalAgencyCredentialsAsync,
  syncContractToMusanedFollowup,
  syncIngazDelegationToFollowup,
  softDeleteMusanedTransaction,
  restoreMusanedTransaction,
  permanentlyDeleteMusanedTransaction,
  bulkUpdateTransactionsStage,
  reassignTransactionsCoordinator,
  buildBulkAgencyReminderDigest,
  addTransactionAttachment,
  removeTransactionAttachment,
  addTransactionThreadMessage,
  computeDynamicAgencyScorecards,
  normalizeAgencyCandidate,
} from '../externalAgencyMasterService';
import {
  parsePassportMrz,
  computeIcaoCheckDigit,
  checkCandidateDuplicateAndBlacklist,
  maskPassportForClientPreview,
  getOfficeCvPresets,
  extractJpegsAndTextFromPdfBytesAsync,
  extractSmartCvsBatchFromFiles,
  saveCustomOfficeCvPreset,
  loadOfficeCvPresets,
} from '../cvSmartExtractorService';
import {
  authService,
  generateStrongClientPassword,
  saveCustomEmployeePassword,
} from '../authService';
import { realErpDataStore } from '../realErpDataStore';
import { supabase } from '../supabaseClient';
import { inferToolCallFromArabicPrompt, executeToolCall } from '../aiToolExecutor';

describe('External Agencies Portal, 5-Sheet Musaned Follow-up Engine, Smart MRZ Extractor & Multi-Channel Dispatch', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('normalizes 42+ disparate Arabic/English agent spellings into canonical Agent Master records and supports alias merge', async () => {
    expect(resolveCanonicalAgency('تيلا')?.id).toBe('AGY-ETH-TELA');
    expect(resolveCanonicalAgency('Tela')?.id).toBe('AGY-ETH-TELA');
    expect(resolveCanonicalAgency('Tela Foreign Employment Agency')?.id).toBe('AGY-ETH-TELA');
    expect(resolveCanonicalAgency('Tela FEA')?.id).toBe('AGY-ETH-TELA');

    expect(resolveCanonicalAgency('يوشى')?.id).toBe('AGY-PHL-YOSHI');
    expect(resolveCanonicalAgency('YOSHI')?.id).toBe('AGY-PHL-YOSHI');
    expect(resolveCanonicalAgency('YOSHI PROMOTIONS, INC')?.id).toBe('AGY-PHL-YOSHI');

    expect(resolveCanonicalAgency('شركة النحيمان')?.id).toBe('AGY-INT-NUHIMAN');
    expect(resolveCanonicalAgency('AL NUHIMAN')?.id).toBe('AGY-INT-NUHIMAN');

    expect(resolveCanonicalAgency('ريل')?.id).toBe('AGY-ETH-REAL');
    expect(resolveCanonicalAgency('Real Foreign Employment Agency')?.id).toBe('AGY-ETH-REAL');

    // Confirm a brand-new spelling once and verify permanent resolution
    await confirmAliasMergeToAgency('AGY-ETH-SHEGER', 'مكتب شيجر اديس');
    expect(resolveCanonicalAgency('مكتب شيجر اديس')?.id).toBe('AGY-ETH-SHEGER');
  });

  it('cleans Excel serial dates, embedded Backouts in worker names, free-text statuses, and performs idempotent Upsert across 5 sheets', async () => {
    const serialRes = parseExcelOrMixedDate(46090.0566731134);
    expect(serialRes.wasSerial).toBe(true);
    expect(serialRes.iso).toBe('2026-03-09');

    const backoutRes = extractBackoutFromWorkerName('AMINA HASSAN باك اوت2026/08/06/');
    expect(backoutRes.isBackout).toBe(true);
    expect(backoutRes.extractedDate).toBe('2026-08-06');
    expect(backoutRes.cleanName).toBe('AMINA HASSAN');

    const wb = XLSX.utils.book_new();
    const operationalRows = [
      {
        'رقم عقد مساند': '99001122',
        'اسم العميل': 'عميل تجريبي أول',
        'رقم السجل': '1099887766',
        'رقم التاشيره': '1908887771',
        'اسم العامله': '',
        'رقم الجواز': '',
        'الجنسيه': 'أثيوبيا',
        'تاريخ بدايه العقد': 46090,
        'نوع العامل': 'غير معين',
        'تاريخ التفوض او التختيم': '',
        'اسم الوكيل': 'تيلا',
        'تم الانشاء بواسطة': 'حذيفه رمضان علي الديب',
        'اسم الفرع': 'مكتب السفير الماسى للاستقدام',
        'المدفوع': 7130,
        'الراتب': 1000,
        'رقم الهاتف': '0501234567',
      },
      {
        'رقم عقد مساند': '99001123',
        'اسم العميل': 'عميل تجريبي ثان',
        'رقم السجل': '1022334455',
        'رقم التاشيره': '1908887772',
        'اسم العامله': 'ZAINAB ALI باك اوت2026/08/06/',
        'رقم الجواز': 'EP5544332',
        'الجنسيه': 'أثيوبيا',
        'تاريخ بدايه العقد': 46080,
        'نوع العامل': 'معين',
        'تاريخ التفوض او التختيم': 'تم حجز التذكره',
        'اسم الوكيل': 'YOSHI',
        'تم الانشاء بواسطة': 'امل سعيد هوساوى',
        'اسم الفرع': 'مكتب توباز للاستقدام',
        'المدفوع': 15000,
        'الراتب': 1500,
        'رقم الهاتف': '0551234567',
      },
    ];
    const archiveRows = [
      {
        'رقم عقد مساند': '88001100',
        'اسم العميل': 'عميل أرشيف',
        'رقم السجل': '1011112222',
        'رقم التاشيره': '1907000001',
        'اسم العامله': 'CHALTU TADESSE',
        'رقم الجواز': 'EP1122334',
        'الجنسيه': 'أثيوبيا',
        'اخر حالة تحديث للوكيل': 'وصول يوم 2026/02/05/',
        'اسم الوكيل': 'Real',
        'اسم الفرع': 'مكتب دار الرواد للاستقدام',
      },
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(operationalRows), 'تقرير معاملات الدول');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(archiveRows), 'وصول2026');
    const outArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    const firstReport = await importMusanedFollowupWorkbook(outArray);
    expect(firstReport.sheetsProcessed).toEqual(['تقرير معاملات الدول', 'وصول2026']);
    expect(firstReport.activeInserted).toBe(2);
    expect(firstReport.archiveImported).toBe(1);
    expect(firstReport.extractedBackoutsFromName).toBe(1);
    expect(firstReport.correctedAgentAliases).toBeGreaterThanOrEqual(2);

    // Re-importing updated sheet with stage change performs Upsert (0 duplicates!)
    operationalRows[0]['اسم العامله'] = 'ABEBAYEHU KEBEDE';
    operationalRows[0]['رقم الجواز'] = 'EP6677889';
    operationalRows[0]['تاريخ التفوض او التختيم'] = 'تم حجز التذكره';
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, XLSX.utils.json_to_sheet(operationalRows), 'تقرير معاملات الدول');
    const outArray2 = XLSX.write(wb2, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    const secondReport = await importMusanedFollowupWorkbook(outArray2, { includeArchiveSheets: false });
    expect(secondReport.activeInserted).toBe(0);
    expect(secondReport.activeUpdated).toBe(2);

    const allTxs = await getMusanedTransactions();
    const updatedContract = allTxs.find((t) => t.musaned_contract_no === '99001122');
    expect(updatedContract?.company_id).toBe('SAF');
    expect(updatedContract?.stage).toBe('TICKET_BOOKED');
    expect(updatedContract?.maid_name).toBe('ABEBAYEHU KEBEDE');

    const backoutContract = allTxs.find((t) => t.musaned_contract_no === '99001123');
    expect(backoutContract?.company_id).toBe('TOP');
    expect(backoutContract?.stage).toBe('BACKOUT');
    expect(backoutContract?.maid_name).toBe('ZAINAB ALI');
  });

  it('enforces Saudi PDPL client PII stripping for External Agents and evaluates SLA alerts accurately', () => {
    const parsed = parseMusanedSheetRows(
      [
        {
          'رقم عقد مساند': '77009911',
          'اسم العميل': 'فهد السبيعي',
          'رقم السجل': '1055667788',
          'رقم الهاتف': '0509988776',
          'رقم التاشيره': '1905554443',
          'تاريخ بدايه العقد': '2026-10-01',
          'تاريخ نهاية التأشيرة ميلادي': '2026-11-25',
          'نوع العامل': 'غير معين',
          'اسم الوكيل': 'محمد زين',
          'اسم الفرع': 'شركة السفير الماسي للاستقدام',
          'المدفوع': 7130,
          'الراتب': 1000,
        },
      ],
      'تقرير معاملات الدول'
    );

    const tx = parsed.parsedTransactions[0];
    const sanitized = sanitizeTransactionForExternalAgent(tx);

    // Ensure Client Name, National ID, Phone, and Paid Amount are completely absent from sanitized object
    expect((sanitized as any).client_name).toBeUndefined();
    expect((sanitized as any).client_national_id).toBeUndefined();
    expect((sanitized as any).client_phone).toBeUndefined();
    expect((sanitized as any).paid_amount_sar).toBeUndefined();
    expect(sanitized.musaned_contract_no).toBe('77009911');
    expect(sanitized.monthly_salary).toBe(1000);

    const sla = evaluateTransactionSla(tx, '2026-11-18');
    expect(sla.unassignedOverdue).toBe(true);
    expect(sla.visaExpiringCritical).toBe(true);
    expect(sla.severity).toBe('CRITICAL');
  });

  it('provisions isolated External Agency Partner accounts, locks RBAC strictly to foreign-agency-portal, and blocks frozen accounts', async () => {
    // Reject @kas.sa domain for external agencies
    await expect(
      provisionExternalAgencyAccount({
        agencyId: 'AGY-ETH-SHEGER',
        email: 'hacker@kas.sa',
      })
    ).rejects.toThrow(/@kas\.sa/);

    const { account, generatedPassword } = await provisionExternalAgencyAccount({
      agencyId: 'AGY-ETH-SHEGER',
      authorizedCompanies: ['SAF', 'TOP'],
      createdBy: 'إسلام أحمد عرفة',
    });

    const loginRes = await authService.signIn(account.email, generatedPassword);
    expect(loginRes.error).toBeNull();
    expect(loginRes.data).not.toBeNull();
    expect(authService.isExternalAgency(loginRes.data)).toBe(true);
    expect(authService.isAdmin(loginRes.data)).toBe(false);
    expect(loginRes.data?.agency_id).toBe('AGY-ETH-SHEGER');
    expect(loginRes.data?.default_tab).toBe('foreign-agency-portal');

    // Strict RBAC Tab Isolation: ONLY foreign-agency-portal is permitted
    expect(authService.isTabAuthorizedForUser(loginRes.data, 'foreign-agency-portal')).toBe(true);
    expect(authService.isTabAuthorizedForUser(loginRes.data, 'dashboard')).toBe(false);
    expect(authService.isTabAuthorizedForUser(loginRes.data, 'transactions-followup')).toBe(false);
    expect(authService.isTabAuthorizedForUser(loginRes.data, 'finance-home')).toBe(false);
    expect(authService.isTabAuthorizedForUser(loginRes.data, 'profile')).toBe(false);
    expect(authService.isTabAuthorizedForUser(loginRes.data, 'kas-suite')).toBe(false);

    // Company Isolation: allowed SAF & TOP, blocked YAQ, DAR, KAS, ALL
    expect(authService.validateCompanyAccess(loginRes.data, 'SAF').allowed).toBe(true);
    expect(authService.validateCompanyAccess(loginRes.data, 'TOP').allowed).toBe(true);
    expect(authService.validateCompanyAccess(loginRes.data, 'YAQ').allowed).toBe(false);
    expect(authService.validateCompanyAccess(loginRes.data, 'KAS').allowed).toBe(false);
    expect(authService.validateCompanyAccess(loginRes.data, 'ALL').allowed).toBe(false);

    // Freeze account -> immediate sign-in block
    await authService.signOut();
    await toggleExternalAgencyAccountStatus(account.id, 'مجمّد');
    const frozenRes = await authService.signIn(account.email, generatedPassword);
    expect(frozenRes.data).toBeNull();
    expect(frozenRes.error?.message).toContain('مجمّد');

    // Verify Islam Arafa (`ats`) accesses `transactions-followup` and Recruitment Sales accesses `cvs-recruitment`
    const islamPass = generateStrongClientPassword();
    saveCustomEmployeePassword('i.mahmoud.followup@kas.sa', islamPass);
    const islamLogin = await authService.signIn('i.mahmoud.followup@kas.sa', islamPass);
    expect(authService.isTabAuthorizedForUser(islamLogin.data, 'transactions-followup')).toBe(true);

    const salesPass = generateStrongClientPassword();
    saveCustomEmployeePassword('h.hassan.safir@kas.sa', salesPass);
    const salesLogin = await authService.signIn('h.hassan.safir@kas.sa', salesPass);
    expect(authService.isTabAuthorizedForUser(salesLogin.data, 'cvs-recruitment')).toBe(true);
    expect(authService.isTabAuthorizedForUser(salesLogin.data, 'transactions-followup')).toBe(false);
  });

  it('parses ICAO 9303 MRZ lines with check-digit verification, detects duplicate/Backout passports, syncs Airport flights, and logs Email + WhatsApp dispatches', async () => {
    const passField = 'EP9249575';
    const passChk = computeIcaoCheckDigit(passField);
    const dobField = '000912';
    const dobChk = computeIcaoCheckDigit(dobField);
    const expField = '290918';
    const expChk = computeIcaoCheckDigit(expField);

    const line1 = 'P<ETHGURMU<<MOMINA<KEDIR<<<<<<<<<<<<<<<<<<<<';
    const line2 = `${passField}${passChk}ETH${dobField}${dobChk}F${expField}${expChk}<<<<<<<<<<<<<<00`;

    const mrz = parsePassportMrz(`${line1}\n${line2}`, new Date('2026-11-18T00:00:00Z'));
    expect(mrz).not.toBeNull();
    expect(mrz?.checkDigitsValid).toBe(true);
    expect(mrz?.passportNumber).toBe('EP9249575');
    expect(mrz?.fullNameEn).toBe('MOMINA KEDIR GURMU');
    expect(mrz?.nationalityAr).toBe('أثيوبيا');
    expect(mrz?.age).toBe(26);
    expect(mrz?.isExpired).toBe(false);

    // Duplicate & Backout Radar check against seeded transaction EP9249575 / Backout record
    await realErpDataStore.addRecord('cvs', {
      id: 'cv-test-backout',
      cv_code: 'CV-BK-01',
      maid_name: 'BACKOUT CANDIDATE',
      passport_number: 'EP0009991',
      labour_id: 'EF10500644',
      external_office: 'تيلا',
      status: 'تراجع',
    });

    const radar = await checkCandidateDuplicateAndBlacklist('EP0009991', 'EF10500644');
    expect(radar.hasRisk).toBe(true);
    expect(radar.isDuplicateInCvBank).toBe(true);
    expect(radar.isPreviousBackout).toBe(true);

    // Per-Office White-Label Presets & PDPL Passport Masking
    expect(maskPassportForClientPreview('EP9249575', true)).toBe('EP9••••75');
    expect(getOfficeCvPresets().some((p) => p.officeCode === 'SAF' && p.hideForeignAgencyIdentity)).toBe(true);

    // Stage transition to TICKET_BOOKED automatically schedules Airport Reception flight
    await updateMusanedTransactionStage({
      transactionId: 'MTX-2026-002',
      nextStage: 'TICKET_BOOKED',
      actorName: 'وكالة شيجر',
      flightNumber: 'ET-462',
      airline: 'الخطوط الإثيوبية',
      arrivalDate: '2026-11-24',
      arrivalDestination: 'الرياض',
    });

    const flights = await realErpDataStore.getRecords<any>('flights', []);
    expect(flights.some((f) => f.flight_number === 'ET-462' && f.id === 'FLT-MSN-2005091488')).toBe(true);

    // Multi-channel Email + WhatsApp dispatch logs both messages in `sent_messages`
    const dispatchRes = await dispatchViaEmailAndWhatsApp({
      recipientName: 'وكالة شيجر الدولية',
      recipientPhone: '+251911990044',
      recipientEmail: 'cvs@sheger-agency.et',
      subject: 'اعتماد السيرة الذاتية',
      bodyText: 'تم اعتماد السيرة ونشرها للمبيعات.',
      channel: 'both',
      templateName: 'إشعار اعتماد سيرة',
      companyId: 'SAF',
      openExternalClient: false,
    });

    expect(dispatchRes.loggedIds).toHaveLength(2);
    const sentLogs = await realErpDataStore.getRecords<any>('sent_messages', []);
    expect(sentLogs.some((m) => m.id === dispatchRes.loggedIds[0] && m.channel === 'WhatsApp')).toBe(true);
    expect(sentLogs.some((m) => m.id === dispatchRes.loggedIds[1] && m.channel === 'Email (HR@kas.sa)')).toBe(true);
  });

  it('routes coordinator alerts smartly to Mahmoud Fouda & Islam Arafa and persists coordinator contact overrides', () => {
    const coordMahmoud = resolveCoordinatorForAgencyOrTx({ agencyId: 'AGY-INT-NUHIMAN' });
    expect(coordMahmoud.email).toBe('m.fouda.followup@kas.sa');

    const coordIslam = resolveCoordinatorForAgencyOrTx({ agencyId: 'AGY-ETH-MZAIN' });
    expect(coordIslam.email).toBe('i.mahmoud.followup@kas.sa');

    saveCoordinatorContact({
      email: 'm.fouda.followup@kas.sa',
      nameAr: 'محمود فودة (محدث)',
      phone: '0551112233',
      whatsapp: '966551112233',
    });
    const profiles = getCoordinatorProfiles();
    const updatedMahmoud = profiles.find((c) => c.email === 'm.fouda.followup@kas.sa');
    expect(updatedMahmoud?.whatsapp).toBe('966551112233');
    expect(updatedMahmoud?.phone).toBe('0551112233');
  });

  it('authenticates isolated external agencies remotely via Supabase RPC even with an empty local cache', async () => {
    const email = 'remote.partner@agency.alsulaim.sa';
    const pass = 'AgencyPass#2026!';
    const digest = computeExternalAgencyPasswordDigest(email, pass);

      const rpcSpy = vi.spyOn(supabase, 'rpc').mockImplementation((async (fnName: string, args: any) => {
      if (fnName === 'resolve_external_agency_email') {
        return { data: [{ email, status: 'نشط' }], error: null } as any;
      }
      if (fnName === 'verify_external_agency_login' && args?.p_password_digest === digest) {
        return {
          data: [
            {
              id: 'EXT-ACC-REMOTE-1',
              company_id: 'SAF',
              agency_id: 'AGY-ETH-MZAIN',
              agency_name: 'MZAIN ETHIOPIA',
              agency_name_ar: 'مزاين إثيوبيا',
              country: 'أثيوبيا',
              username: 'mzain.remote',
              email,
              contact_person: 'Abebe',
              phone: '+251911000111',
              whatsapp: '+251911000111',
              authorized_companies: ['SAF', 'TOP'],
              status: 'نشط',
            },
          ],
          error: null,
        } as any;
      }
      return { data: [], error: null } as any;
    }) as any);

    try {
      const check = await verifyExternalAgencyCredentialsAsync('mzain.remote', pass);
      expect(check.valid).toBe(true);
      expect(check.account?.agency_id).toBe('AGY-ETH-MZAIN');

      // Reset cache to test end-to-end authService.signIn remote resolution
      localStorage.clear();
      const login = await authService.signIn(email, pass);
      expect(login.error).toBeNull();
      expect(login.data?.account_type).toBe('external_agency');
      expect(login.data?.default_tab).toBe('foreign-agency-portal');
    } finally {
      rpcSpy.mockRestore();
    }
  });

  it('syncs Recruitment contracts & Ingaz delegations, computes 90-day warranty & Backout clawbacks, and supports full CRUD/Trash/Bulk/Drawer/Scorecard', async () => {
    const tx = await syncContractToMusanedFollowup({
      musanedContractNo: '2026999888',
      internalContractNo: 'SAF-RC-2026-9998',
      companyId: 'SAF',
      clientName: 'عبدالله بن فهد السبيعي',
      clientPhone: '0550001122',
      visaNumber: 'V-889900',
      maidName: 'SELAM TESFAYE',
      passportNumber: 'EP8899001',
      nationality: 'أثيوبيا',
      externalOfficeName: 'النحيمان',
      paidAmountSar: 7500,
    });
    expect(tx.assigned_coordinator_email).toBe('m.fouda.followup@kas.sa');
    expect(tx.stage).toBe('ASSIGNED');

    // Ingaz verification advances stage to DELEGATED
    const afterIngaz = await syncIngazDelegationToFollowup({
      visaNumber: 'V-889900',
      status: 'تم التوثيق',
      actorName: 'بوابة إنجاز',
    });
    expect(afterIngaz?.stage).toBe('DELEGATED');

    // Arrival sets 90-day warranty_end_date
    const arrivedTx = await updateMusanedTransactionStage({
      transactionId: tx.id,
      nextStage: 'ARRIVED',
      actorName: 'محمود فودة',
    });
    expect(arrivedTx?.warranty_end_date).toBeTruthy();

    // Backout triggers commission clawback deduction in agency_candidates (normalized helper)
    const backoutTx = await updateMusanedTransactionStage({
      transactionId: tx.id,
      nextStage: 'BACKOUT',
      actorName: 'محمود فودة',
    });
    expect((backoutTx?.deduction_usd || 0) > 0).toBe(true);

    const rawCands = await realErpDataStore.getRecords<any>('agency_candidates', [], 'all');
    const matchedCand = rawCands
      .map(normalizeAgencyCandidate)
      .find((c) => c?.passportNumber === 'EP8899001');
    expect((matchedCand?.deductionUsd || 0) > 0).toBe(true);

    // Attachments & Thread Messaging
    const withAtt = await addTransactionAttachment(tx.id, {
      name: 'medical_fit.pdf',
      fileName: 'medical_fit.pdf',
      category: 'فحص طبي',
      mimeType: 'application/pdf',
      fileSizeLabel: '2 KB',
      sizeBytes: 2048,
      dataUrl: 'data:application/pdf;base64,JVBERi0=',
      uploadedBy: 'محمود فودة',
      uploadedByRole: 'internal_coordinator',
    });
    expect(withAtt?.attachments?.length).toBe(1);

    const withMsg = await addTransactionThreadMessage(tx.id, {
      senderName: 'محمود فودة',
      senderRole: 'internal_coordinator',
      body: 'يرجى تأكيد موعد الفحص النهائي.',
    });
    expect(withMsg?.messages_thread?.length).toBe(1);

    const attId = withAtt!.attachments![0].id;
    const afterRemoveAtt = await removeTransactionAttachment(tx.id, attId);
    expect(afterRemoveAtt?.attachments?.length).toBe(0);

    // Bulk ops & Digest
    const reassigned = await reassignTransactionsCoordinator([tx.id], 'i.mahmoud.followup@kas.sa');
    expect(reassigned).toBe(1);
    const bulkMoved = await bulkUpdateTransactionsStage([tx.id], 'VISA_STAMPED', 'محمود فودة');
    expect(bulkMoved).toBe(1);
    const allTxsNow = await getMusanedTransactions();
    const digests = buildBulkAgencyReminderDigest(allTxsNow, [resolveCanonicalAgency('النحيمان')!]);
    expect(digests.length).toBeGreaterThan(0);

    // Dynamic Scorecard
    const scorecards = computeDynamicAgencyScorecards(allTxsNow, [resolveCanonicalAgency('النحيمان')!]);
    expect(scorecards.length).toBeGreaterThanOrEqual(1);
    expect(scorecards.some((s) => typeof s.computedScore === 'number')).toBe(true);

    // Soft Delete -> Restore -> Permanent Delete
    await softDeleteMusanedTransaction(tx.id, 'm.fouda.followup@kas.sa');
    expect((await getMusanedTransactions(false)).some((t) => t.id === tx.id)).toBe(false);
    expect((await getMusanedTransactions(true)).some((t) => t.id === tx.id && t.is_deleted)).toBe(true);

    await restoreMusanedTransaction(tx.id);
    expect((await getMusanedTransactions(false)).some((t) => t.id === tx.id)).toBe(true);

    await permanentlyDeleteMusanedTransaction(tx.id);
    expect((await getMusanedTransactions(true)).some((t) => t.id === tx.id)).toBe(false);
  });

  it('extracts multi-PDF batch CVs, supports cloud presets persistence, and executes Follow-up AI Copilot tools', async () => {
    // Cloud Preset Persistence Round-trip
    await saveCustomOfficeCvPreset({
      id: 'PRESET-TEST-CLOUD',
      officeCode: 'SAF',
      presetNameAr: 'قالب تجريبي سحابي',
      presetNameEn: 'Cloud Preset',
      companyNameAr: 'السفير الماسي',
      companyNameEn: 'AL-SAFEER AL-MASI',
      musanedLicenseNo: '390102',
      crNumber: '1010000001',
      salesPhones: ['0500000000'],
      salesWhatsapp: '966500000000',
      salesEmail: 'info@kas.sa',
      addressAr: 'الرياض',
      headerBgHex: '#141414',
      accentBandHex: '#262626',
      hideForeignAgencyIdentity: true,
      maskPassportBeforeContract: true,
      pricingDisplayMode: 'RECRUITMENT_SALARY',
      warrantyClauseAr: 'ضمان 90 يوماً',
    });
    const loadedPresets = await loadOfficeCvPresets();
    expect(loadedPresets.some((p) => p.id === 'PRESET-TEST-CLOUD')).toBe(true);

    // Async PDF + Multi-PDF Batch Extraction
    const fakePdfBytes = new TextEncoder().encode(
      '%PDF-1.4\nNAME: HALIMA AHMED MOHAMMED\nPASSPORT: EP7766554\nSALARY: 1100 SAR\n%%EOF'
    );
    const asyncPdfRes = await extractJpegsAndTextFromPdfBytesAsync(fakePdfBytes.buffer);
    expect(asyncPdfRes.extractedText).toContain('HALIMA AHMED MOHAMMED');

    const file1 = {
      name: 'cv1.pdf',
      type: 'application/pdf',
      arrayBuffer: async () => fakePdfBytes.buffer,
    } as unknown as File;
    const file2 = {
      name: 'cv2.pdf',
      type: 'application/pdf',
      arrayBuffer: async () =>
        new TextEncoder().encode('%PDF-1.4\nNAME: SARA BEKELE\nPASSPORT: EP1122339\n%%EOF').buffer,
    } as unknown as File;
    const batch = await extractSmartCvsBatchFromFiles([file1, file2]);
    expect(batch).toHaveLength(2);
    expect(batch[0].draft?.passportNumber || batch[0].fileName).toBeTruthy();

    // AI Copilot Follow-up Tools
    const mahmoudPass = generateStrongClientPassword();
    saveCustomEmployeePassword('m.fouda.followup@kas.sa', mahmoudPass);
    await authService.signIn('m.fouda.followup@kas.sa', mahmoudPass);

    const slaCall = inferToolCallFromArabicPrompt('افحص رادار المتابعة والمعاملات المتأخرة في مساند', 'SAF');
    expect(slaCall?.tool.id).toBe('get_followup_sla_radar');
    const slaExec = await executeToolCall(slaCall!, 'SAF', 'm.fouda.followup@kas.sa');
    expect(slaExec.success).toBe(true);

    const scoreCall = inferToolCallFromArabicPrompt('اعرض بطاقة تقييم أداء الوكلاء الخارجيين', 'SAF');
    expect(scoreCall?.tool.id).toBe('get_external_agency_scorecard');
    const scoreExec = await executeToolCall(scoreCall!, 'SAF', 'm.fouda.followup@kas.sa');
    expect(scoreExec.success).toBe(true);
    expect(Array.isArray(scoreExec.data)).toBe(true);

    const remindCall = inferToolCallFromArabicPrompt('استعجل وكالة مزايا برسالة متابعة', 'SAF');
    expect(remindCall?.tool.id).toBe('dispatch_agency_sla_followup');
    const remindExec = await executeToolCall(remindCall!, 'SAF', 'm.fouda.followup@kas.sa');
    expect(remindExec.success).toBe(true);
  });
});
