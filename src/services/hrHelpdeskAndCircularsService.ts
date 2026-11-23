/**
 * HR Helpdesk Ticketing (SLA) & Official Circulars Read-Receipts Engine
 * =====================================================================
 * Mirrors & exceeds Jisr HR's employee helpdesk & official circulars module:
 *  - Employee HR tickets with automatic SLA deadlines (Urgent 8h / Medium 24h / Normal 48h)
 *  - Threaded replies, assignment, status transitions & breach radar
 *  - Official circulars with department targeting, mandatory legal acknowledgment,
 *    per-employee read timestamps, and exact non-reader tracking + reminders
 *  - Strict privacy: regular employees see only their own tickets; HR, Executive &
 *    Eng. Abdulrahman see company-wide tickets & compliance analytics.
 */

import { realErpDataStore } from './realErpDataStore';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS, type KasDepartmentId } from '../config/kasAllowedEmails';
import { isPrivilegedAiCrossSectionUser } from './localAiService';

export type HrTicketCategory =
  | 'استفسار راتب'
  | 'تعديل آيبان / حساب بنكي'
  | 'خطاب تعريف / شهادة'
  | 'تأمين طبي وتابعين'
  | 'إجازات وحضور'
  | 'عهدة وأدوات عمل'
  | 'شكوى سرية / اقتراح';

export type HrTicketPriority = 'عادي' | 'متوسط' | 'عاجل';
export type HrTicketStatus = 'مفتوحة' | 'قيد المعالجة' | 'بانتظار رد الموظف' | 'تم الحل' | 'مغلقة';

export interface HrTicketReply {
  id: string;
  author_name: string;
  author_email: string;
  author_role: 'EMPLOYEE' | 'HR';
  message: string;
  created_at: string;
}

export interface HrHelpdeskTicket {
  id: string;
  company_id: string;
  ticket_no: string;
  employee_id?: string;
  employee_name: string;
  employee_email: string;
  department_id: string;
  category: HrTicketCategory;
  priority: HrTicketPriority;
  subject: string;
  description: string;
  status: HrTicketStatus;
  assigned_to_name: string;
  assigned_to_email: string;
  sla_hours: number;
  sla_due_at: string;
  resolved_at?: string | null;
  replies: HrTicketReply[];
  created_at: string;
  updated_at: string;
}

export type HrCircularCategory =
  | 'تعميم إداري'
  | 'تحديث لائحة العمل'
  | 'إجازة رسمية'
  | 'تعميم أمن سيبراني وخصوصية'
  | 'إعلان عام';

export interface HrCircularReadReceipt {
  employee_email: string;
  employee_name: string;
  department_id: string;
  read_at: string;
  acknowledged_at?: string;
}

export interface HrCircularRecord {
  id: string;
  company_id: string;
  circular_no: string;
  title: string;
  category: HrCircularCategory;
  body_text: string;
  target_departments: string[]; // ['all'] or department IDs
  require_acknowledgment: boolean;
  published_by_name: string;
  published_by_email: string;
  published_at: string;
  read_receipts: HrCircularReadReceipt[];
  status: 'منشور' | 'مؤرشف';
  created_at: string;
  updated_at: string;
}

export const HR_TICKET_CATEGORIES: HrTicketCategory[] = [
  'استفسار راتب',
  'تعديل آيبان / حساب بنكي',
  'خطاب تعريف / شهادة',
  'تأمين طبي وتابعين',
  'إجازات وحضور',
  'عهدة وأدوات عمل',
  'شكوى سرية / اقتراح',
];

export const HR_CIRCULAR_CATEGORIES: HrCircularCategory[] = [
  'تعميم إداري',
  'تحديث لائحة العمل',
  'إجازة رسمية',
  'تعميم أمن سيبراني وخصوصية',
  'إعلان عام',
];

export function resolveSlaHours(priority: HrTicketPriority): number {
  if (priority === 'عاجل') return 8;
  if (priority === 'متوسط') return 24;
  return 48;
}

export function computeTicketSlaStatus(ticket: HrHelpdeskTicket, nowMs = Date.now()): {
  breached: boolean;
  remainingHours: number;
  labelAr: string;
} {
  if (ticket.status === 'تم الحل' || ticket.status === 'مغلقة') {
    return { breached: false, remainingHours: 0, labelAr: 'مكتمل ضمن SLA' };
  }
  const dueMs = new Date(ticket.sla_due_at).getTime();
  if (Number.isNaN(dueMs)) {
    return { breached: false, remainingHours: ticket.sla_hours, labelAr: `${ticket.sla_hours} ساعة` };
  }
  const diffHours = Math.round(((dueMs - nowMs) / 3_600_000) * 10) / 10;
  if (diffHours < 0) {
    return {
      breached: true,
      remainingHours: diffHours,
      labelAr: `متجاوز بـ ${Math.abs(Math.round(diffHours))} ساعة`,
    };
  }
  return {
    breached: false,
    remainingHours: diffHours,
    labelAr: `متبقي ${Math.max(1, Math.ceil(diffHours))} ساعة`,
  };
}

export function getTargetEmployeesForCircular(circular: HrCircularRecord) {
  const excluded = new Set(Object.keys(EXCLUDED_KAS_EMAILS).map((e) => e.toLowerCase()));
  const active = KAS_ALLOWED_EMPLOYEES.filter(
    (emp) => !excluded.has(emp.email.toLowerCase())
  );
  if (!circular.target_departments?.length || circular.target_departments.includes('all')) {
    return active;
  }
  const set = new Set(circular.target_departments.map((d) => d.toLowerCase()));
  return active.filter((emp) => set.has(String(emp.department_id || '').toLowerCase()));
}

export function computeCircularCompliance(circular: HrCircularRecord) {
  const targets = getTargetEmployeesForCircular(circular);
  const receiptMap = new Map(
    (circular.read_receipts || []).map((r) => [r.employee_email.toLowerCase(), r])
  );

  const acknowledged: Array<{
    nameAr: string;
    email: string;
    departmentId: KasDepartmentId;
    acknowledgedAt: string;
  }> = [];
  const pending: Array<{
    nameAr: string;
    email: string;
    departmentId: KasDepartmentId;
  }> = [];

  for (const emp of targets) {
    const rec = receiptMap.get(emp.email.toLowerCase());
    if (rec && (!circular.require_acknowledgment || rec.acknowledged_at)) {
      acknowledged.push({
        nameAr: emp.nameAr,
        email: emp.email,
        departmentId: emp.department_id,
        acknowledgedAt: rec.acknowledged_at || rec.read_at,
      });
    } else {
      pending.push({
        nameAr: emp.nameAr,
        email: emp.email,
        departmentId: emp.department_id,
      });
    }
  }

  const total = targets.length;
  const compliancePct = total > 0 ? Math.round((acknowledged.length / total) * 100) : 100;
  return { total, acknowledgedCount: acknowledged.length, pendingCount: pending.length, compliancePct, acknowledged, pending };
}

export const hrHelpdeskAndCircularsService = {
  async loadTickets(_companyId: string, user: any): Promise<HrHelpdeskTicket[]> {
    const all = await realErpDataStore.getRecords<HrHelpdeskTicket>(
      'hr_helpdesk_tickets',
      []
    );
    const privileged = isPrivilegedAiCrossSectionUser(user);
    const userEmail = String(user?.email || '').trim().toLowerCase();
    return all
      .filter(
        (t) =>
          t.id !== 'HR-TKT-SEED-01' &&
          t.id !== 'HR-TKT-SEED-02' &&
          (privileged || String(t.employee_email || '').toLowerCase() === userEmail)
      )
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  async createTicket(input: {
    companyId: string;
    employeeName: string;
    employeeEmail: string;
    departmentId: string;
    category: HrTicketCategory;
    priority: HrTicketPriority;
    subject: string;
    description: string;
  }): Promise<HrHelpdeskTicket> {
    const now = Date.now();
    const slaHours = resolveSlaHours(input.priority);
    const ticket: HrHelpdeskTicket = {
      id: `HR-TKT-${now}`,
      company_id: input.companyId || 'SAF',
      ticket_no: `TKT-${new Date().getFullYear()}-${String(now).slice(-4)}`,
      employee_name: input.employeeName.trim() || 'موظف المجموعة',
      employee_email: input.employeeEmail.trim().toLowerCase(),
      department_id: input.departmentId || 'hr',
      category: input.category,
      priority: input.priority,
      subject: input.subject.trim(),
      description: input.description.trim(),
      status: 'مفتوحة',
      assigned_to_name: 'أ. ريم بن حسين',
      assigned_to_email: 'reem.hr@kas.sa',
      sla_hours: slaHours,
      sla_due_at: new Date(now + slaHours * 3_600_000).toISOString(),
      resolved_at: null,
      replies: [],
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };
    await realErpDataStore.addRecord<HrHelpdeskTicket>('hr_helpdesk_tickets', ticket, []);
    return ticket;
  },

  async addTicketReply(
    _companyId: string,
    ticketId: string,
    reply: {
      authorName: string;
      authorEmail: string;
      authorRole: 'EMPLOYEE' | 'HR';
      message: string;
      nextStatus?: HrTicketStatus;
    }
  ): Promise<HrHelpdeskTicket | null> {
    const all = await realErpDataStore.getRecords<HrHelpdeskTicket>(
      'hr_helpdesk_tickets',
      []
    );
    const target = all.find((t) => t.id === ticketId);
    if (!target) return null;

    const nowIso = new Date().toISOString();
    const nextStatus: HrTicketStatus =
      reply.nextStatus ||
      (reply.authorRole === 'HR' ? 'قيد المعالجة' : target.status === 'بانتظار رد الموظف' ? 'قيد المعالجة' : target.status);

    const updated: HrHelpdeskTicket = {
      ...target,
      status: nextStatus,
      resolved_at: nextStatus === 'تم الحل' || nextStatus === 'مغلقة' ? nowIso : target.resolved_at,
      replies: [
        ...(Array.isArray(target.replies) ? target.replies : []),
        {
          id: `RPL-${Date.now()}`,
          author_name: reply.authorName,
          author_email: reply.authorEmail,
          author_role: reply.authorRole,
          message: reply.message.trim(),
          created_at: nowIso,
        },
      ],
      updated_at: nowIso,
    };
    await realErpDataStore.updateRecord<HrHelpdeskTicket>('hr_helpdesk_tickets', ticketId, updated, []);
    return updated;
  },

  async updateTicketStatus(
    _companyId: string,
    ticketId: string,
    status: HrTicketStatus
  ): Promise<HrHelpdeskTicket | null> {
    const all = await realErpDataStore.getRecords<HrHelpdeskTicket>(
      'hr_helpdesk_tickets',
      []
    );
    const target = all.find((t) => t.id === ticketId);
    if (!target) return null;
    const nowIso = new Date().toISOString();
    const updated: HrHelpdeskTicket = {
      ...target,
      status,
      resolved_at: status === 'تم الحل' || status === 'مغلقة' ? nowIso : null,
      updated_at: nowIso,
    };
    await realErpDataStore.updateRecord<HrHelpdeskTicket>('hr_helpdesk_tickets', ticketId, updated, []);
    return updated;
  },

  async loadCirculars(_companyId: string, user: any): Promise<HrCircularRecord[]> {
    const all = await realErpDataStore.getRecords<HrCircularRecord>(
      'hr_circulars',
      []
    );
    const privileged = isPrivilegedAiCrossSectionUser(user);
    const userDept = String(user?.department_id || '').toLowerCase();
    return all
      .filter((c) => {
        if (c.id === 'HR-CIR-SEED-01' || c.id === 'HR-CIR-SEED-02') return false;
        if (privileged) return true;
        if (c.status !== 'منشور') return false;
        const targets = c.target_departments || ['all'];
        return targets.includes('all') || targets.map((d) => d.toLowerCase()).includes(userDept);
      })
      .sort((a, b) => (b.published_at || b.created_at || '').localeCompare(a.published_at || a.created_at || ''));
  },

  async publishCircular(input: {
    companyId: string;
    title: string;
    category: HrCircularCategory;
    bodyText: string;
    targetDepartments: string[];
    requireAcknowledgment: boolean;
    publishedByName: string;
    publishedByEmail: string;
  }): Promise<HrCircularRecord> {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const record: HrCircularRecord = {
      id: `HR-CIR-${now}`,
      company_id: input.companyId || 'SAF',
      circular_no: `CIR-${new Date().getFullYear()}-${String(now).slice(-3)}`,
      title: input.title.trim(),
      category: input.category,
      body_text: input.bodyText.trim(),
      target_departments: input.targetDepartments.length ? input.targetDepartments : ['all'],
      require_acknowledgment: input.requireAcknowledgment,
      published_by_name: input.publishedByName,
      published_by_email: input.publishedByEmail,
      published_at: nowIso,
      read_receipts: [],
      status: 'منشور',
      created_at: nowIso,
      updated_at: nowIso,
    };
    await realErpDataStore.addRecord<HrCircularRecord>('hr_circulars', record, []);
    return record;
  },

  async acknowledgeCircular(
    _companyId: string,
    circularId: string,
    employee: { email: string; name: string; departmentId: string }
  ): Promise<HrCircularRecord | null> {
    const all = await realErpDataStore.getRecords<HrCircularRecord>(
      'hr_circulars',
      []
    );
    const target = all.find((c) => c.id === circularId);
    if (!target) return null;

    const cleanEmail = employee.email.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    const existingReceipts = Array.isArray(target.read_receipts) ? target.read_receipts : [];
    const filtered = existingReceipts.filter((r) => r.employee_email.toLowerCase() !== cleanEmail);
    const nextReceipts: HrCircularReadReceipt[] = [
      ...filtered,
      {
        employee_email: cleanEmail,
        employee_name: employee.name || cleanEmail,
        department_id: employee.departmentId || 'general',
        read_at: nowIso,
        acknowledged_at: nowIso,
      },
    ];

    const updated: HrCircularRecord = {
      ...target,
      read_receipts: nextReceipts,
      updated_at: nowIso,
    };
    await realErpDataStore.updateRecord<HrCircularRecord>('hr_circulars', circularId, updated, []);
    return updated;
  },
};
