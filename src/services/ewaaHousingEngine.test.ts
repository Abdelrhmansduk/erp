import { describe, it, expect } from 'vitest';
import {
  parseIntakeBelongings,
  reconcileExitBelongings,
  intakeAssessment,
  intakeObservation,
  effectiveJourneyIntent,
  remainingJourneyStages,
  shouldShowHousingWork,
  isIssuedVisaAwaitingTicket,
  ticketBookingOwner,
  validateTransferEligibilityAndReplacement,
  reconcileWageClaimPayments,
  verifyDepartureGate,
  getHousingOutlook,
  deriveDemoNeeds,
  canExecuteDemoAction,
  relevantDemoWorkerTabs,
  workerActionPanel,
  workerActionTitle,
  operationalActionStatus,
  workerOperationSummary,
  workerActionButtonLabel,
  EWAA_BELONGING_KINDS,
  EWAA_WORKFLOW_ROUTES,
  EWAA_WORKFLOW_STATES,
  EWAA_WORKFLOW_STATE_REQUIREMENTS,
  getEwaaWorkflowStateDef,
  getEwaaWorkflowStateRequirements,
  deriveWorkerRouteFacts,
  determineWorkerJourneyState,
  computeHousingOperationalDistribution,
  calculateShelterDailyCostAllocation,
} from './ewaaHousingEngine';

describe('Ewaa Housing & Shelter Operations Engine (100% Canonical Parity)', () => {
  describe('Belongings Custody & Reconciliation (lib/worker-belongings.ts)', () => {
    it('parses default belongings with unknown custody when empty', () => {
      const rows = parseIntakeBelongings('');
      expect(rows).toHaveLength(EWAA_BELONGING_KINDS.length);
      expect(rows.every((r) => r.custody === 'unknown')).toBe(true);
    });

    it('enforces numeric cash amount when cash custody is with_worker', () => {
      const invalidCash = EWAA_BELONGING_KINDS.map((k) => ({
        item_key: k.key,
        custody: k.key === 'cash' ? 'with_worker' : 'unknown',
        description: '',
        amount: null,
      }));
      expect(() => parseIntakeBelongings(invalidCash)).toThrow('المبلغ المالي إلزامي بالأرقام عند اختياره');

      const validCash = EWAA_BELONGING_KINDS.map((k) => ({
        item_key: k.key,
        custody: k.key === 'cash' ? 'with_worker' : 'unknown',
        description: 'محفظة يد',
        amount: k.key === 'cash' ? 850 : null,
      }));
      const parsed = parseIntakeBelongings(validCash);
      expect(parsed.find((p) => p.item_key === 'cash')?.amount).toBe(850);
    });

    it('blocks clean exit if voluntary office deposits were not handed back', () => {
      const intake = EWAA_BELONGING_KINDS.map((k) => ({
        item_key: k.key,
        custody: k.key === 'passport' ? 'office_deposit' : 'with_worker',
        description: '',
        amount: k.key === 'cash' ? 100 : null,
      }));
      const blocked = reconcileExitBelongings(intake, []);
      expect(blocked.canExitCleanly).toBe(false);
      expect(blocked.unreconciledOfficeDeposits).toHaveLength(1);

      const clean = reconcileExitBelongings(intake, ['passport']);
      expect(clean.canExitCleanly).toBe(true);
    });
  });

  describe('Fact-Driven Intake & Guardrails (lib/intake-assessment.ts)', () => {
    it('keeps unknown answers as missing verifications rather than converting to no', () => {
      const result = intakeAssessment({
        source: 'employer',
        worker_intent: 'undecided',
        employer_intent: 'undecided',
        passport_available: 'unknown',
        residency_issue: 'unknown',
        absconding_status: 'unknown',
        unpaid_wages: 'unknown',
      });
      expect(result.missing_verifications).toContain('تأكيد رغبة العاملة بعد الاستلام');
      expect(result.missing_verifications).toContain('التحقق من وجود الجواز');
      expect(result.missing_verifications).toContain('فحص وجود بلاغ تغيب');
      expect(result.missing_verifications).toContain('سؤال العاملة وصاحب العمل عن الرواتب');
    });

    it('supports canonical FormData input with assessment_needs validation', () => {
      const fd = new FormData();
      fd.set('receiving_source', 'employer');
      fd.set('worker_intent', 'transfer');
      fd.set('physical_receipt_confirmed', 'on');
      fd.set('reason', 'استلام عاملة من الكفيل وتحتاج فحص مستندات');
      fd.set('assessment_needs', JSON.stringify(['passport', 'wages']));

      const obs = intakeObservation(fd);
      expect(obs.kind).toBe('intake_referral');
      expect(obs.facts.physical_presence).toBe('received_inside');
      expect(obs.facts.assessment_needs).toEqual(['passport', 'wages']);
    });

    it('blocks contradiction between passport belonging custody and passport_available = no', () => {
      const belongings = EWAA_BELONGING_KINDS.map((k) => ({
        item_key: k.key,
        custody: k.key === 'passport' ? 'with_worker' : 'unknown',
        description: '',
        amount: null,
      }));
      expect(() =>
        intakeObservation({
          source: 'employer',
          worker_intent: 'transfer',
          passport_available: 'no',
          belongings,
        })
      ).toThrow(/تعارض في البيانات/);
    });

    it('blocks physical housing receipt when worker whereabouts are unknown', () => {
      expect(() =>
        intakeObservation({
          source: 'employer',
          worker_intent: 'transfer',
          unknown_whereabouts: 'yes',
          in_housing_receipt: true,
        })
      ).toThrow(/لا يمكن تسجيل استلام فعلي داخل السكن لعاملة غير معروفة المكان/);
    });

    it('handles direct airport handover without creating a fake housing stay', () => {
      expect(() =>
        intakeObservation({
          source: 'airport',
          worker_intent: 'return_employer',
          direct_airport_handover: true,
        })
      ).toThrow(/التسليم المباشر من المطار لصاحب العمل يتطلب توثيق اسم المستلم/);

      const handover = intakeObservation({
        source: 'airport',
        worker_intent: 'return_employer',
        direct_airport_handover: true,
        handover_recipient_name: 'فهد القحطاني',
        handover_recipient_id: '1029384756',
      });
      expect(handover.creates_housing_stay).toBe(false);
      expect(handover.physical_presence).toBe('direct_handover_completed');
      expect(handover.journey_stage).toBe('employer_delivered');
    });

    it('requires refusal statement or supervisor exemption (>= 8 chars) on work refusal', () => {
      const uncollected = intakeObservation({
        source: 'employer',
        worker_intent: 'final_exit',
        reported_refusal: 'yes',
        refusing_party: 'worker',
      });
      expect(uncollected.refusal_document_requirement).toBe('required');

      const exempted = intakeObservation({
        source: 'employer',
        worker_intent: 'final_exit',
        reported_refusal: 'yes',
        refusing_party: 'worker',
        refusal_exemption_reason: 'تم استثناء الإقرار بتوجيه مدير الإيواء لحين حضور المترجمة',
      });
      expect(exempted.refusal_document_requirement).toBe('exempted_by_supervisor');
    });
  });

  describe('Worker Intent Preservation & Queue Eligibility (lib/operational-route.ts & lib/housing-queue-eligibility.ts)', () => {
    it('never overwrites worker_declared_intent when decision_route differs', () => {
      const intent = effectiveJourneyIntent({
        worker_declared_intent: 'transfer',
        decision_route: 'final_exit',
        journey_stage: 'exit_visa',
      });
      expect(intent).toBe('transfer');

      const stages = remainingJourneyStages(
        {
          worker_declared_intent: 'final_exit',
          journey_stage: 'ticket_booking',
          final_exit_visa_issued_at: '2026-10-01',
        },
        [{ event_type: 'final_exit_issued' }]
      );
      expect(stages).not.toContain('exit_visa');
      expect(stages).toContain('airport_transit');
      expect(stages).toContain('departed');
    });

    it('shows workers in housing queue only when physically in housing or on active 10-day transfer trial', () => {
      expect(shouldShowHousingWork({ inHousing: true, journeyStage: 'intake' })).toBe(true);
      expect(shouldShowHousingWork({ inHousing: true, journeyStage: 'departed' })).toBe(false);
      expect(
        shouldShowHousingWork({
          inHousing: false,
          journeyStage: 'transfer_trial',
          transferDeliveredAt: '2026-10-20T10:00:00Z',
          trialEndsAt: '2026-10-30T10:00:00Z',
          transferCompletedAt: null,
        })
      ).toBe(true);
      expect(
        shouldShowHousingWork({
          inHousing: false,
          journeyStage: 'transfer_trial',
          transferDeliveredAt: null,
          trialEndsAt: null,
        })
      ).toBe(false);
    });
  });

  describe('Canonical Housing Scenarios Outlook (tests/housing-scenarios.test.mjs Parity)', () => {
    const keys = (input: Parameters<typeof getHousingOutlook>[0]) => getHousingOutlook(input).map((x) => x.id);

    it('airport arrival only recommends verified handover, not an assumed housing admission', () => {
      const s = getHousingOutlook({
        events: [{ id: 'e1', event_kind: 'intake_referral', facts: { source: 'airport' } }],
      });
      expect(s.some((x) => x.id === 'airport-delivery')).toBe(true);
      expect(s.some((x) => x.id === 'official-referral' || x.id === 'safeguarding')).toBe(false);
    });

    it('police or embassy referral requires review, not automatic protection finding', () => {
      const results = keys({
        events: [{ id: 'p1', event_kind: 'intake_referral', facts: { source: 'police' } }],
      });
      expect(results).toContain('official-referral');
      expect(results).not.toContain('safeguarding');
    });

    it('financial claim can coexist with protection and document validity review', () => {
      const list = keys({
        facts: { salary_due: 'yes', salary_received: 'no' },
        events: [
          { id: 'w1', event_kind: 'wage_claim', facts: { amount: '4500' } },
          { id: 'p2', event_kind: 'protection_concern', facts: {} },
        ],
        documents: [{ document_type: 'وثيقة سفر', expires_at: '2025-05-01' }],
        today: '2026-10-15',
      });
      expect(list).toContain('unpaid-dues');
      expect(list).toContain('safeguarding');
      expect(list).toContain('document-revalidation');
    });

    it('old paid event no longer creates a repeated scenario when its tasks closed', () => {
      const events = [{ id: 'e1', event_kind: 'wage_payment_report', facts: { amount: '100' } }];
      expect(keys({ events, actions: [{ source_event_id: 'e1', status: 'pending' }] })).toContain(
        'payment-reconciliation'
      );
      expect(keys({ events, actions: [{ source_event_id: 'e1', status: 'completed' }] })).not.toContain(
        'payment-reconciliation'
      );
    });

    it('later location confirmation clears previous urgent-unknown scenario', () => {
      const events = [
        { id: 'e1', event_kind: 'unaccounted_absence', recorded_at: '2026-10-12T14:00:00Z' },
        { id: 'e2', event_kind: 'location_confirmed', recorded_at: '2026-10-12T16:00:00Z' },
      ];
      let x = keys({
        events,
        actions: [
          { source_event_id: 'e1', status: 'pending' },
          { source_event_id: 'e2', status: 'pending' },
        ],
      });
      expect(x).not.toContain('whereabouts-unknown');
      expect(x).toContain('whereabouts-recovered');

      x = keys({
        events,
        actions: [
          { source_event_id: 'e1', status: 'completed' },
          { source_event_id: 'e2', status: 'completed' },
        ],
      });
      expect(x).not.toContain('whereabouts-unknown');
      expect(x).not.toContain('whereabouts-recovered');
    });

    it('missed ticket never equates to Kingdom departure', () => {
      const list = getHousingOutlook({
        stage: 'ticket_booked',
        facts: { flight_at: '2026-10-02T15:00:00Z' },
        today: '2026-10-15',
        events: [{ id: 'f1', event_kind: 'missed_flight' }],
      });
      expect(list.some((x) => x.id === 'failed-departure')).toBe(true);
      expect(list.some((x) => x.id === 'flight-date-passed')).toBe(true);
      expect(list.some((x) => x.id === 'departed')).toBe(false);
    });

    it('suspected death is a verification alert, not an official death record', () => {
      const x = getHousingOutlook({ events: [{ id: 'd1', event_kind: 'suspected_death' }] });
      const issue = x.find((y) => y.id === 'critical-death');
      expect(issue?.priority).toBe('critical');
      expect(issue?.certainty).toBe('needs_verification');
    });

    it('no worker case never invents suspicious events', () => {
      const x = getHousingOutlook({
        facts: {},
        documents: [],
        events: [],
        inHousing: false,
        hasActiveJourney: true,
      });
      expect(x).toHaveLength(0);
    });

    it('single intake may imply multiple parallel paths without choosing a ministry process', () => {
      const s = getHousingOutlook({
        events: [
          {
            id: 'intake1',
            event_kind: 'intake_referral',
            facts: {
              source: 'embassy',
              reported_refusal: 'yes',
              unpaid_wages: 'yes',
              passport_available: 'no',
              safety_concern: 'yes',
              official_case_open: 'yes',
            },
          },
        ],
      });
      for (const id of [
        'official-referral',
        'refusal-verification',
        'unpaid-dues',
        'document-revalidation',
        'safeguarding',
        'official-closed-or-responded',
      ]) {
        expect(s.some((x) => x.id === id)).toBe(true);
      }
      expect(s[0].priority).toBe('critical');
    });

    it('latest valid document supersedes an expired historical document of same kind', () => {
      const s = getHousingOutlook({
        today: '2026-10-15',
        documents: [
          { document_type: 'جواز', expires_at: '2026-01-01', created_at: '2025-01-01' },
          { document_type: 'جواز سفر', expires_at: '2029-01-01', created_at: '2026-09-01' },
        ],
      });
      expect(s.some((x) => x.id === 'document-revalidation')).toBe(false);
    });

    it('complete intake follow-ups stop resurfacing historical safety prompts', () => {
      const s = getHousingOutlook({
        events: [{ id: 'i1', event_kind: 'intake_referral', facts: { source: 'employer', safety_concern: 'yes' } }],
        actions: [{ source_event_id: 'i1', status: 'completed' }],
      });
      expect(s.some((x) => x.id === 'safeguarding')).toBe(false);
    });

    it('safe pre-escalation outreach, promised payment, and safety-deferred contact behave canonically', () => {
      const v = getHousingOutlook({ events: [{ id: 'c1', event_kind: 'employer_outreach_needed' }] });
      const task = v.find((x) => x.id === 'safe-employer-outreach');
      expect(task?.priority).toBe('normal');
      expect(task?.certainty).toBe('needs_verification');

      const s2 = getHousingOutlook({
        events: [{ id: 'c2', event_kind: 'employer_contact_attempt', facts: { outcome: 'promised_payment' } }],
      });
      expect(s2.some((x) => x.id === 'employer-settlement-verification')).toBe(true);
      expect(s2.some((x) => x.id === 'payment-reconciliation')).toBe(false);

      const s3 = getHousingOutlook({
        events: [{ id: 'c3', event_kind: 'employer_contact_attempt', facts: { outcome: 'safety_deferred' } }],
      });
      expect(s3[0].id).toBe('unsafe-employer-outreach');
      expect(s3[0].priority).toBe('critical');
    });
  });

  describe('Canonical Final Exit Ticket Queue & Contextual UI Parity', () => {
    it('final-exit ticket queue includes only issued exit visas waiting for ticket booking', () => {
      expect(
        isIssuedVisaAwaitingTicket({
          journey_status: 'active',
          operation_stage: 'waiting_ticket',
          current_state_key: 'ticket_office',
          visa_status: 'issued',
          facts: { ticket_status: 'pending' },
        })
      ).toBe(true);

      expect(
        isIssuedVisaAwaitingTicket({
          journey_status: 'active',
          operation_stage: 'waiting_ticket',
          current_state_key: 'ticket_office',
          visa_status: 'issued',
          facts: { ticket_status: 'booked' },
        })
      ).toBe(false);

      expect(
        ticketBookingOwner({
          journey_status: 'active',
          operation_stage: 'waiting_ticket',
          current_state_key: 'ticket_worker',
          visa_status: 'issued',
          facts: { ticket_status: 'pending' },
        })
      ).toBe('worker');

      // ERP shorthand mode
      expect(
        isIssuedVisaAwaitingTicket({
          inHousing: true,
          journeyStage: 'ticket_booking',
          finalExitVisaIssuedAt: '2026-10-15',
          flightAt: null,
        })
      ).toBe(true);
      expect(ticketBookingOwner('worker')).toBe('worker');
      expect(ticketBookingOwner('employer')).toBe('office');
    });

    it('derives demo needs only when exit visa has uploaded document proof (lib/demo-needs.ts)', () => {
      const withoutProof = deriveDemoNeeds({
        worker: { id: 'w1', final_exit_status: 'issued' },
        journeys: [{ status: 'active', route_key: 'final_exit', facts: { worker_intent: 'final_exit' } }],
        docs: [
          {
            worker_id: 'w1',
            document_type: 'جواز',
            storage_path: '/uploads/p.pdf',
            expires_at: '2028-12-31',
          },
        ],
      });
      expect(withoutProof.needs.some((n) => n.code === 'final_exit')).toBe(true);

      const withProof = deriveDemoNeeds({
        worker: { id: 'w1', final_exit_status: 'issued' },
        journeys: [{ status: 'active', route_key: 'final_exit', facts: { worker_intent: 'final_exit' } }],
        docs: [
          {
            worker_id: 'w1',
            document_type: 'جواز',
            storage_path: '/uploads/p.pdf',
            expires_at: '2028-12-31',
          },
          {
            worker_id: 'w1',
            document_type: 'تأشيرة خروج نهائي',
            storage_path: '/uploads/exit.pdf',
            expires_at: '2028-12-31',
          },
        ],
      });
      expect(withProof.needs.some((n) => n.code === 'final_exit')).toBe(false);
      expect(withProof.needs.some((n) => n.code === 'book_ticket')).toBe(true);
    });

    it('enforces specialist action permissions and contextual tabs (tests/demo-contextual-worker-ui.test.mjs)', () => {
      expect(canExecuteDemoAction('passport', {})).toBe(false);
      expect(canExecuteDemoAction('passport', { canTransfer: true })).toBe(false);
      expect(canExecuteDemoAction('passport', { canDocuments: true })).toBe(true);
      expect(canExecuteDemoAction('final_exit_visa', { canGeneral: true })).toBe(false);
      expect(canExecuteDemoAction('final_exit_visa', { canFinalExit: true })).toBe(true);
      expect(canExecuteDemoAction('transfer_process', { canFinalExit: true })).toBe(false);
      expect(canExecuteDemoAction('transfer_process', { canTransfer: true })).toBe(true);
      expect(canExecuteDemoAction('airport_handover', { canHousingExit: true })).toBe(false);
      expect(canExecuteDemoAction('airport_handover', { canHousingExit: true, canGeneral: true })).toBe(true);
      expect(canExecuteDemoAction('official_decision', { canGeneral: true })).toBe(true);
      expect(canExecuteDemoAction('unknown_future_action', { canGeneral: true, canOverride: true })).toBe(false);

      const arrivalTabs = relevantDemoWorkerTabs({
        goal: 'handover',
        route: 'arrival_delivery',
        needKeys: ['handover'],
        derivedTabs: ['action'],
        hasIntakeEvidence: true,
        hasTravelHistory: false,
        hasOfficialHistory: false,
      });
      expect(arrivalTabs).toEqual(['action', 'intake', 'documents', 'history']);

      const disputeTabs = relevantDemoWorkerTabs({
        goal: 'official_decision',
        route: 'labor_dispute',
        needKeys: ['wages', 'protection'],
        derivedTabs: ['resolution', 'requests'],
        hasIntakeEvidence: false,
        hasTravelHistory: false,
        hasOfficialHistory: true,
      });
      expect(disputeTabs).toContain('resolution');
      expect(disputeTabs).toContain('requests');
      expect(disputeTabs).not.toContain('travel');
    });

    it('computes canonical workerActionPanel, workerActionTitle, operationalActionStatus, and workerOperationSummary', () => {
      expect(
        workerActionPanel(
          { panel: 'journey', source: 'journey', title_ar: 'تنفيذ ومتابعة متطلبات: حجز التذكرة' },
          'ticket_office'
        )
      ).toBe('travel');

      expect(
        workerActionTitle(
          { title_ar: 'تنفيذ ومتابعة متطلبات: مرحلة حالية' },
          'ticket_worker',
          'ar'
        )
      ).toBe('متابعة العاملة وإرفاق تذكرة السفر');

      expect(operationalActionStatus({ status: 'waiting_external' }).key).toBe('waiting_external');

      const summary = workerOperationSummary({
        fullNameAr: 'ماريا سانتوس',
        inHousing: true,
        physicalPresence: 'inside_housing',
        journeyStage: 'intake',
        workerDeclaredIntent: 'final_exit',
        employerIntent: 'transfer',
        missingVerificationsCount: 2,
      });
      expect(summary.intentConflictWarningAr).toContain('تعارض رغبات مرصود');
      expect(summary.actionStatus).toBe('ready_now');
      expect(workerActionButtonLabel({ panel: 'travel' }, 'ticket_office', 'ar')).toBe('تحديث السفر');
    });
  });

  describe('10-Day Trial, Max 3 Trials & 24h Replacement Rules', () => {
    it('blocks transfer when absconding report is active or protection case is open', () => {
      const res = validateTransferEligibilityAndReplacement({
        workerId: 'w-1',
        nationality: 'الفلبين',
        abscondingStatus: 'active',
        hasOpenProtectionCase: true,
        completedTrialsCount: 0,
      });
      expect(res.allowed).toBe(false);
      expect(res.blockersAr).toHaveLength(2);
    });

    it('warns on 3rd trial and blocks 4th trial', () => {
      const thirdTrial = validateTransferEligibilityAndReplacement({
        workerId: 'w-1',
        nationality: 'الفلبين',
        completedTrialsCount: 2,
      });
      expect(thirdTrial.allowed).toBe(true);
      expect(thirdTrial.warningsAr.length).toBeGreaterThan(0);

      const fourthTrial = validateTransferEligibilityAndReplacement({
        workerId: 'w-1',
        nationality: 'الفلبين',
        completedTrialsCount: 3,
      });
      expect(fourthTrial.allowed).toBe(false);
    });

    it('enforces 24h replacement window, same nationality/client, and preserves original 10-day trialEndsAt', () => {
      const now = Date.parse('2026-11-04T12:00:00Z');
      const delivered12hAgo = '2026-11-04T00:00:00Z';
      const originalEndsAt = '2026-11-14T00:00:00Z';

      const validRep = validateTransferEligibilityAndReplacement(
        {
          workerId: 'w-2',
          nationality: 'إندونيسيا',
          completedTrialsCount: 0,
          isReplacement: true,
          previousTransferDeliveredAt: delivered12hAgo,
          previousTrialEndsAt: originalEndsAt,
          previousWorkerNationality: 'إندونيسيا',
          previousClientNationalId: '1011111111',
          newClientNationalId: '1011111111',
        },
        now
      );
      expect(validRep.allowed).toBe(true);
      expect(validRep.preservesOriginalTrialWindow).toBe(true);
      expect(validRep.computedTrialEndsAt).toBe(originalEndsAt);
    });
  });

  describe('Wage Claim Reconciliation & Departure Evidence Gate', () => {
    it('does not allow reported unverified payments to close a wage claim', () => {
      const rec = reconcileWageClaimPayments(4500, [
        {
          id: 'p-1',
          amount: 4500,
          status: 'reported_unverified',
          paidAt: '2026-11-01',
          recordedBy: 'سارة',
        },
      ]);
      expect(rec.canCloseClaim).toBe(false);
      expect(rec.remainingVerifiedBalance).toBe(4500);

      const verified = reconcileWageClaimPayments(4500, [
        {
          id: 'p-2',
          amount: 4500,
          status: 'verified_with_evidence',
          evidenceRef: 'STCPAY-9928172',
          paidAt: '2026-11-02',
          recordedBy: 'سارة',
        },
      ]);
      expect(verified.canCloseClaim).toBe(true);
      expect(verified.remainingVerifiedBalance).toBe(0);
    });

    it('prevents marking departed without actual departure evidence even after flight_at passes', () => {
      const unverified = verifyDepartureGate({
        physicalPresence: 'at_airport',
        flightAt: '2026-10-01T08:00:00Z',
        departureEvidenceRef: '',
      });
      expect(unverified.isVerifiedDeparted).toBe(false);
      expect(unverified.resultingStage).toBe('airport_transit');
      expect(unverified.warningAr).toContain('مضى موعد الرحلة المجدول دون توثيق دليل المغادرة');

      const verified = verifyDepartureGate({
        physicalPresence: 'at_airport',
        flightAt: '2026-10-01T08:00:00Z',
        departureEvidenceRef: 'BORD-SV872-OK',
        verifiedByEmployee: 'خالد المندوب',
      });
      expect(verified.isVerifiedDeparted).toBe(true);
      expect(verified.resultingStage).toBe('departed');
    });
  });

  describe('Canonical 28 Workflow States, 9 Routes & Stage Transition Engine (SQL Migrations Parity)', () => {
    it('exports all 9 canonical routes and 28 canonical workflow states with SLA hours & waiting_on_default', () => {
      expect(EWAA_WORKFLOW_ROUTES).toHaveLength(9);
      expect(EWAA_WORKFLOW_STATES).toHaveLength(28);
      expect(EWAA_WORKFLOW_STATE_REQUIREMENTS.length).toBeGreaterThanOrEqual(30);

      const trialDef = getEwaaWorkflowStateDef('transfer_trial');
      expect(trialDef.route_key).toBe('transfer');
      expect(trialDef.sla_hours).toBe(240);
      expect(trialDef.waiting_on_default).toBe('العميل');

      const newArrivalReqs = getEwaaWorkflowStateRequirements('new_arrival');
      expect(newArrivalReqs.map((r) => r.requirement_key)).toContain('intake_receipt');
    });

    it('derives route facts and determines canonical journey states accurately (determineWorkerJourneyState)', () => {
      expect(determineWorkerJourneyState({ medical_concern: 'yes', health_cleared: 'false' })).toBe('health_hold');
      expect(determineWorkerJourneyState({ absconding_status: 'active', worker_intent: 'transfer' })).toBe(
        'absconding_resolution'
      );
      expect(determineWorkerJourneyState({ absconding_status: 'active', worker_intent: 'final_exit' })).toBe(
        'final_exit_ministry_housing'
      );
      expect(
        determineWorkerJourneyState({
          worker_intent: 'transfer',
          residency_issue: 'employer_refuses_issue',
        })
      ).toBe('protection_support_transfer');
      expect(
        determineWorkerJourneyState({
          worker_intent: 'final_exit',
          passport_status: 'missing',
        })
      ).toBe('travel_document');
      expect(
        determineWorkerJourneyState({
          worker_intent: 'final_exit',
          final_exit_status: 'issued',
          reported_refusal: 'yes',
          refusing_party: 'worker',
        })
      ).toBe('ticket_worker');

      const routeFacts = deriveWorkerRouteFacts({
        worker_intent: 'final_exit',
        employer_intent: 'transfer',
      });
      expect(routeFacts.intent_conflict).toBe('yes');
      expect(routeFacts.legal_path).toBe('committee');
      expect(determineWorkerJourneyState({ worker_intent: 'final_exit', employer_intent: 'transfer' })).toBe(
        'committee_decision'
      );
    });

    it('computes the exact 8 operationalCards and 3 attentionCards matching ewaa/app/housing/page.tsx', () => {
      const dist = computeHousingOperationalDistribution([
        { inHousing: true, routeKey: 'intake', stateKey: 'new_arrival', missingCount: 2 },
        { inHousing: true, routeKey: 'arrival_delivery', stateKey: 'arrival_handover' },
        { inHousing: false, routeKey: 'transfer', stateKey: 'transfer_trial', slaOverdue: true },
        {
          inHousing: true,
          routeKey: 'final_exit',
          stateKey: 'ticket_office',
          issuedAwaitingTicket: true,
          residenceOverLimit: true,
        },
        { inHousing: true, routeKey: 'legal', stateKey: 'committee_decision', missingCount: 1 },
        { inHousing: true, routeKey: 'return', stateKey: 'return_to_employer' },
      ]);

      expect(dist.operationalCards).toHaveLength(8);
      expect(dist.attentionCards).toHaveLength(3);
      expect(dist.operationalCards.find((c) => c.key === 'all')?.count).toBe(6);
      expect(dist.operationalCards.find((c) => c.key === 'visa-ticket-pending')?.count).toBe(1);
      expect(dist.operationalCards.find((c) => c.key === 'formal')?.count).toBe(1);
      expect(dist.attentionCards.find((c) => c.key === 'action')?.count).toBe(2);
      expect(dist.attentionCards.find((c) => c.key === 'overdue')?.count).toBe(1);
      expect(dist.attentionCards.find((c) => c.key === 'residence')?.count).toBe(1);
    });

    it('allocates shelter daily housing/catering/medical costs and triggers overstay radar > 15 days', () => {
      const alloc = calculateShelterDailyCostAllocation({
        workerId: 'w-900',
        checkInDate: '2026-10-01',
        checkOutOrEvalDate: '2026-10-21',
        admissionReason: 'warranty_agency_fault',
      });
      expect(alloc.daysInShelter).toBe(20);
      expect(alloc.dailyRateSar).toBe(85); // 45 + 25 + 15
      expect(alloc.totalShelterCostSar).toBe(1700);
      expect(alloc.costBearer).toBe('FOREIGN_AGENT');
      expect(alloc.isOverstayAlert).toBe(true);
      expect(alloc.overstayDays).toBe(5);
    });
  });
});
