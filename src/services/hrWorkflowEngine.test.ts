import { describe, it, expect } from 'vitest';
import {
  HrWorkflowEngine,
  DEFAULT_HR_WORKFLOWS,
  DEFAULT_HR_DELEGATIONS,
} from './hrWorkflowEngine';

describe('HrWorkflowEngine (Multi-Level Approvals, Delegation & SLA)', () => {
  it('routes step 1 automatically to active delegate when direct manager is on leave', () => {
    const req = HrWorkflowEngine.initiateRequestWorkflow({
      companyId: 'SAF',
      category: 'LOAN_ADVANCE',
      sourceRecordId: 'ADV-99',
      requesterId: 'emp-105',
      requesterName: 'أحمد الزهراني',
      department: 'التشغيل',
      summaryAr: 'طلب سلفة بمبلغ 6,000 ⃁ على 6 أشهر',
      amount: 6000,
      delegations: DEFAULT_HR_DELEGATIONS,
      asOfDateIso: '2026-12-05', // Inside delegation window 2026-12-01..15
    });

    expect(req.steps_state).toHaveLength(3);
    expect(req.steps_state[0].assignedToName).toContain('خالد العتيبي');
    expect(req.steps_state[0].delegatedFromName).toContain('فهد العتيبي');
  });

  it('progresses sequentially through multi-level steps until final approval', () => {
    let req = HrWorkflowEngine.initiateRequestWorkflow({
      companyId: 'SAF',
      category: 'LEAVE',
      sourceRecordId: 'VAC-88',
      requesterId: 'emp-102',
      requesterName: 'سارة الدوسري',
      department: 'الموارد البشرية',
      summaryAr: 'إجازة سنوية لمدة 5 أيام',
      asOfDateIso: '2026-11-14',
    });

    expect(req.overall_status).toBe('PENDING');
    expect(req.current_step_index).toBe(0);

    // Step 1 approve
    req = HrWorkflowEngine.processStepDecision(req, 'APPROVE', 'فهد العتيبي');
    expect(req.overall_status).toBe('PENDING');
    expect(req.current_step_index).toBe(1);
    expect(req.steps_state[0].status).toBe('APPROVED');

    // Step 2 approve (final)
    req = HrWorkflowEngine.processStepDecision(req, 'APPROVE', 'سارة خالد');
    expect(req.overall_status).toBe('APPROVED');
    expect(req.steps_state[1].status).toBe('APPROVED');
  });

  it('escalates overdue pending step when SLA hours are exceeded', () => {
    const req = HrWorkflowEngine.initiateRequestWorkflow({
      companyId: 'SAF',
      category: 'LEAVE',
      sourceRecordId: 'VAC-90',
      requesterId: 'emp-104',
      requesterName: 'عمر الحربي',
      department: 'التشغيل',
      summaryAr: 'إجازة سنوية 3 أيام',
    });

    const thirtyHoursLater = new Date(req.submitted_at).getTime() + 30 * 3600 * 1000;
    const sweep = HrWorkflowEngine.runSlaEscalationSweep(
      [req],
      DEFAULT_HR_WORKFLOWS,
      thirtyHoursLater
    );

    expect(sweep.escalatedCount).toBe(1);
    expect(sweep.updatedInstances[0].current_step_index).toBe(1);
    expect(sweep.updatedInstances[0].steps_state[0].status).toBe('ESCALATED_SKIPPED');
  });

  it('detects department team leave overlap exceeding threshold', () => {
    const overlap = HrWorkflowEngine.evaluateTeamLeaveOverlap({
      requesterName: 'ماجد الغامدي',
      department: 'التشغيل',
      fromDate: '2026-11-20',
      toDate: '2026-11-25',
      departmentHeadcount: 4,
      existingLeaves: [
        {
          employee_name: 'فهد العتيبي',
          department: 'التشغيل',
          from_date: '2026-11-18',
          to_date: '2026-11-22',
          status: 'معتمد',
        },
      ],
      maxAllowedAbsencePercent: 25,
    });

    expect(overlap.hasConflictWarning).toBe(true);
    expect(overlap.absenceRatioPercent).toBe(50);
    expect(overlap.overlappingEmployees).toContain('فهد العتيبي');
  });
});
