import { describe, it, expect, beforeEach } from 'vitest';
import {
  scanHrComplianceRadars,
  buildVoiceHrAlertsBriefing,
  runAndDispatchHrSmartAlerts,
  executeHrSmartAlertCorrectiveAction,
} from './hrSmartAlertsEngine';
import { realErpDataStore } from './realErpDataStore';

describe('HR Smart Alerts & Real Operational Corrective Actions Engine', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('detects Art. 53 probation expiry, Iqama expiry, Qiwa 60-day notice, SLA breach, and Nitaqat band alerts with corrective action metadata', () => {
    const alerts = scanHrComplianceRadars({
      companyId: 'SAF',
      referenceDateIso: '2026-11-14',
      employees: [
        {
          id: 'EMP-PROB',
          name: 'فهد القحطاني',
          nationality: 'سعودي',
          basicSalary: 3200, // 0.5 point
          housingAllowance: 0,
          hireDate: '2026-08-20', // +90 days = 2026-11-18 (4 days remaining -> critical!)
          probationDays: 90,
        },
        {
          id: 'EMP-IQM',
          name: 'راجيش كومار',
          nationality: 'الهند',
          basicSalary: 2500,
          iqamaExpiry: '2026-11-22', // 8 days remaining -> critical!
          qiwaContractExpiry: '2026-12-20', // 36 days remaining -> warning!
        },
        {
          id: 'EMP-EXP-2',
          name: 'محمد خان',
          nationality: 'باكستان',
          basicSalary: 2500,
        },
        {
          id: 'EMP-EXP-3',
          name: 'عمر حسن',
          nationality: 'مصر',
          basicSalary: 2500,
        },
        {
          id: 'EMP-EXP-4',
          name: 'سليم علي',
          nationality: 'اليمن',
          basicSalary: 2500,
        },
      ],
      approvalRequests: [
        {
          id: 'REQ-99',
          employeeName: 'فهد القحطاني',
          requestTitleAr: 'طلب سلفة مالية',
          overallStatus: 'PENDING',
          createdAt: '2026-11-10T08:00:00Z', // > 24h SLA breached!
          slaHours: 24,
        },
      ],
    });

    const categories = alerts.map((a) => a.category);
    expect(categories).toContain('PROBATION_ART53');
    expect(categories).toContain('IQAMA_EXPIRY');
    expect(categories).toContain('QIWA_CONTRACT_EXPIRY');
    expect(categories).toContain('SLA_APPROVAL_BREACH');
    expect(categories).toContain('NITAQAT_THRESHOLD');

    const probAlert = alerts.find((a) => a.category === 'PROBATION_ART53');
    expect(probAlert?.correctiveActionCode).toBe('EXTEND_PROBATION_180_ART53');

    const iqamaAlert = alerts.find((a) => a.category === 'IQAMA_EXPIRY');
    expect(iqamaAlert?.correctiveActionCode).toBe('CREATE_MUQEEM_IQAMA_RENEWAL');

    const slaAlert = alerts.find((a) => a.category === 'SLA_APPROVAL_BREACH');
    expect(slaAlert?.correctiveActionCode).toBe('ESCALATE_SLA_APPROVAL');

    const voiceSummary = buildVoiceHrAlertsBriefing(alerts);
    expect(voiceSummary).toContain('تنبيهاً نشطاً في رادار جسر');
  });

  it('executes real 1-click corrective actions (Art. 53 probation extension to 180d, Muqeem Iqama renewal, and SLA escalation)', async () => {
    const dispatched = await runAndDispatchHrSmartAlerts(
      {
        companyId: 'SAF',
        referenceDateIso: '2026-11-14',
        employees: [
          {
            id: 'EMP-PROB-53',
            name: 'سلطان العتيبي',
            nationality: 'سعودي',
            basicSalary: 5500,
            hireDate: '2026-08-22',
            probationDays: 90,
          },
          {
            id: 'EMP-IQM-90',
            name: 'أحمد محمود',
            nationality: 'مصر',
            basicSalary: 4000,
            iqamaExpiry: '2026-11-20',
          },
        ],
        approvalRequests: [
          {
            id: 'REQ-SLA-500',
            employeeName: 'سلطان العتيبي',
            requestTitleAr: 'اعتماد بدل مهمة عمل',
            overallStatus: 'PENDING',
            createdAt: '2026-11-11T08:00:00Z',
            slaHours: 24,
          },
        ],
      },
      { showPopups: false }
    );

    // 1. Execute Art. 53 Probation Extension -> updates `employees` to 180 days + archives letter
    const probAlert = dispatched.alerts.find((a) => a.category === 'PROBATION_ART53')!;
    expect(probAlert).toBeDefined();
    const probRes = await executeHrSmartAlertCorrectiveAction(probAlert, { showPopup: false });
    expect(probRes.success).toBe(true);
    expect(probRes.updatedAlert.acknowledged).toBe(true);

    const employeesAfterProb = await realErpDataStore.getRecords<any>('employees', [], 'SAF');
    const updatedSultan = employeesAfterProb.find((e) => e.id === 'EMP-PROB-53');
    expect(updatedSultan?.probation_days).toBe(180);

    const letters = await realErpDataStore.getRecords<any>('hr_official_letters', [], 'SAF');
    expect(letters.some((l) => l.employee_id === 'EMP-PROB-53')).toBe(true);

    // 2. Execute Muqeem Iqama Renewal -> creates `hr_muqeem_requests` synced with `govOutbox`
    const iqamaAlert = dispatched.alerts.find((a) => a.category === 'IQAMA_EXPIRY')!;
    expect(iqamaAlert).toBeDefined();
    const iqamaRes = await executeHrSmartAlertCorrectiveAction(iqamaAlert, {
      iqamaNumber: '2456789012',
      passportNumber: 'A9988776',
      showPopup: false,
    });
    expect(iqamaRes.success).toBe(true);

    const muqeemReqs = await realErpDataStore.getRecords<any>('hr_muqeem_requests', [], 'SAF');
    expect(muqeemReqs.some((m) => m.employee_id === 'EMP-IQM-90' && m.action_type === 'IQAMA_RENEWAL')).toBe(true);

    // 3. Execute SLA Approval Escalation -> updates `hr_approval_requests` to `ESCALATED`
    const slaAlert = dispatched.alerts.find((a) => a.category === 'SLA_APPROVAL_BREACH')!;
    expect(slaAlert).toBeDefined();
    const slaRes = await executeHrSmartAlertCorrectiveAction(slaAlert, { showPopup: false });
    expect(slaRes.success).toBe(true);

    const approvalReqs = await realErpDataStore.getRecords<any>('hr_approval_requests', [], 'SAF');
    const escalatedReq = approvalReqs.find((r) => r.id === 'REQ-SLA-500');
    expect(escalatedReq?.overall_status).toBe('ESCALATED');
  });
});
