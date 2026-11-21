import { describe, expect, it } from 'vitest';
import {
  computeCircularCompliance,
  computeTicketSlaStatus,
  hrHelpdeskAndCircularsService,
  resolveSlaHours,
} from '../hrHelpdeskAndCircularsService';

describe('HR Helpdesk Ticketing (SLA) & Official Circulars Read-Receipts', () => {
  it('computes SLA deadlines by priority and detects SLA breaches accurately', () => {
    expect(resolveSlaHours('عاجل')).toBe(8);
    expect(resolveSlaHours('متوسط')).toBe(24);
    expect(resolveSlaHours('عادي')).toBe(48);

    const overdue = computeTicketSlaStatus({
      id: 't1',
      company_id: 'SAF',
      ticket_no: 'TKT-1',
      employee_name: 'موظف',
      employee_email: 'emp@kas.sa',
      department_id: 'ats',
      category: 'استفسار راتب',
      priority: 'عاجل',
      subject: 'اختبار',
      description: 'تفاصيل',
      status: 'مفتوحة',
      assigned_to_name: 'أ. ريم',
      assigned_to_email: 'reem.hr@kas.sa',
      sla_hours: 8,
      sla_due_at: new Date(Date.now() - 4 * 3_600_000).toISOString(),
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    expect(overdue.breached).toBe(true);
  });

  it('creates tickets, appends threaded replies, and enforces employee vs HR privacy', async () => {
    const created = await hrHelpdeskAndCircularsService.createTicket({
      companyId: 'SAF',
      employeeName: 'إسلام عرفة',
      employeeEmail: 'i.mahmoud.followup@kas.sa',
      departmentId: 'ats',
      category: 'تعديل آيبان / حساب بنكي',
      priority: 'عاجل',
      subject: 'تحديث الآيبان الجديد',
      description: 'أرجو اعتماد الحساب البنكي الجديد في مسير الرواتب.',
    });
    expect(created.sla_hours).toBe(8);

    const replied = await hrHelpdeskAndCircularsService.addTicketReply('SAF', created.id, {
      authorName: 'أ. ريم بن حسين',
      authorEmail: 'reem.hr@kas.sa',
      authorRole: 'HR',
      message: 'تم استلام طلب تعديل الآيبان وجاري التحديث.',
    });
    expect(replied?.status).toBe('قيد المعالجة');
    expect(replied?.replies.length).toBe(1);

    // Regular employee sees ONLY their own tickets; HR sees all tickets
    const regularView = await hrHelpdeskAndCircularsService.loadTickets('SAF', {
      email: 'i.mahmoud.followup@kas.sa',
      department_id: 'ats',
      role: 'منسق متابعة',
    });
    expect(regularView.every((t) => t.employee_email === 'i.mahmoud.followup@kas.sa')).toBe(true);

    const hrView = await hrHelpdeskAndCircularsService.loadTickets('SAF', {
      email: 'reem.hr@kas.sa',
      department_id: 'hr',
      role: 'أخصائية موارد بشرية',
    });
    expect(hrView.length).toBeGreaterThanOrEqual(regularView.length);
  });

  it('publishes official circulars, tracks per-employee legal acknowledgments, and lists non-readers', async () => {
    const circular = await hrHelpdeskAndCircularsService.publishCircular({
      companyId: 'SAF',
      title: 'تعميم مواعيد العمل الرسمية',
      category: 'تعميم إداري',
      bodyText: 'يبدأ الدوام الساعة 8:30 صباحاً.',
      targetDepartments: ['ats'],
      requireAcknowledgment: true,
      publishedByName: 'أ. ريم بن حسين',
      publishedByEmail: 'reem.hr@kas.sa',
    });

    const before = computeCircularCompliance(circular);
    expect(before.total).toBeGreaterThan(0);
    expect(before.acknowledgedCount).toBe(0);

    const firstEmp = before.pending[0];
    const updated = await hrHelpdeskAndCircularsService.acknowledgeCircular('SAF', circular.id, {
      email: firstEmp.email,
      name: firstEmp.nameAr,
      departmentId: firstEmp.departmentId,
    });
    expect(updated).not.toBeNull();

    const after = computeCircularCompliance(updated!);
    expect(after.acknowledgedCount).toBe(1);
    expect(after.pendingCount).toBe(before.total - 1);
    expect(after.acknowledged[0].email.toLowerCase()).toBe(firstEmp.email.toLowerCase());
  });
});
