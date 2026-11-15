/**
 * Jisr-Grade Multi-Level Approval Workflow, Manager Delegation, SLA Escalation & Team Overlap Engine
 */

export type HrRequestCategory =
  | 'LEAVE'
  | 'LEAVE_RETURN'
  | 'LEAVE_CUT_EXTEND'
  | 'LEAVE_ENCASHMENT'
  | 'LOAN_ADVANCE'
  | 'SKIP_INSTALLMENT'
  | 'PERMISSION'
  | 'OVERTIME'
  | 'PUNCH_CORRECTION'
  | 'EXPENSE_CLAIM'
  | 'CORPORATE_CARD_REQUEST'
  | 'BUSINESS_TRIP'
  | 'AIR_TICKET'
  | 'DEPENDENT_INSURANCE'
  | 'DATA_UPDATE'
  | 'RESIGNATION';

export interface ConditionalWorkflowRule {
  id: string;
  company_id: string;
  rule_name_ar: string;
  request_category: HrRequestCategory | string;
  condition_field: 'AMOUNT' | 'LEAVE_DAYS' | 'DEPARTMENT' | 'GRADE';
  operator: 'GT' | 'GTE' | 'LT' | 'EQ' | 'CONTAINS';
  threshold_value: string;
  action_type: 'ADD_APPROVER_STEP' | 'AUTO_APPROVE' | 'REQUIRE_ESIGN';
  extra_approver_role?: ApproverRoleKey | string;
  extra_approver_name?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export function matchesConditionalRule(
  rule: ConditionalWorkflowRule,
  context: {
    category: string;
    amount?: number;
    leaveDays?: number;
    department?: string;
    grade?: string;
  }
): boolean {
  if (!rule.is_active) return false;
  if (rule.request_category !== '*' && rule.request_category !== context.category) return false;

  if (rule.condition_field === 'AMOUNT' || rule.condition_field === 'LEAVE_DAYS') {
    const actualNum =
      rule.condition_field === 'AMOUNT' ? Number(context.amount || 0) : Number(context.leaveDays || 0);
    const thresholdNum = Number(rule.threshold_value || 0);
    if (rule.operator === 'GT') return actualNum > thresholdNum;
    if (rule.operator === 'GTE') return actualNum >= thresholdNum;
    if (rule.operator === 'LT') return actualNum < thresholdNum;
    return actualNum === thresholdNum;
  }

  const actualText = String(
    rule.condition_field === 'DEPARTMENT' ? context.department || '' : context.grade || ''
  )
    .trim()
    .toLowerCase();
  const targetText = String(rule.threshold_value || '').trim().toLowerCase();
  if (rule.operator === 'CONTAINS') return actualText.includes(targetText);
  return actualText === targetText;
}

export type ApproverRoleKey =
  | 'DIRECT_MANAGER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'EXECUTIVE_CEO';

export interface WorkflowStepTemplate {
  order: number;
  roleKey: ApproverRoleKey;
  roleLabelAr: string;
  defaultAssigneeId: string;
  defaultAssigneeName: string;
}

export interface HrWorkflowDefinition {
  id: string;
  company_id: string;
  request_category: HrRequestCategory;
  name_ar: string;
  steps: WorkflowStepTemplate[];
  sla_hours_per_step: number;
  auto_escalate: boolean;
  is_active: boolean;
}

export interface HrManagerDelegation {
  id: string;
  company_id: string;
  from_manager_id: string;
  from_manager_name: string;
  to_delegate_id: string;
  to_delegate_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
  is_active: boolean;
}

export interface WorkflowRuntimeStep {
  order: number;
  roleKey: ApproverRoleKey;
  roleLabelAr: string;
  assignedToId: string;
  assignedToName: string;
  delegatedFromName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED_SKIPPED';
  actedAt?: string;
  comment?: string;
}

export interface HrApprovalRequestInstance {
  id: string;
  company_id: string;
  workflow_id: string;
  request_category: HrRequestCategory;
  category_label_ar: string;
  source_record_id: string;
  requester_id: string;
  requester_name: string;
  department: string;
  summary_ar: string;
  amount: number;
  current_step_index: number;
  steps_state: WorkflowRuntimeStep[];
  overall_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  requires_esign?: boolean;
  triggered_rules?: string[];
  submitted_at: string;
  updated_at: string;
}

export interface TeamLeaveOverlapResult {
  hasConflictWarning: boolean;
  overlappingEmployees: string[];
  departmentHeadcount: number;
  concurrentAbsentCount: number;
  absenceRatioPercent: number;
  advisoryMessageAr: string;
}

export const HR_REQUEST_CATEGORY_LABELS: Record<HrRequestCategory, string> = {
  LEAVE: 'طلب إجازة',
  LEAVE_RETURN: 'إشعار مباشرة عمل بعد إجازة',
  LEAVE_CUT_EXTEND: 'طلب قطع / تمديد إجازة معتمدة',
  LEAVE_ENCASHMENT: 'طلب تسييل رصيد إجازة نقداً',
  LOAN_ADVANCE: 'طلب سلفة مالية',
  SKIP_INSTALLMENT: 'طلب تأجيل قسط سلفة',
  PERMISSION: 'استئذان شخصي',
  OVERTIME: 'طلب تكليف عمل إضافي (المادة 107)',
  PUNCH_CORRECTION: 'تصحيح بصمة / مهمة خارجية',
  EXPENSE_CLAIM: 'تسوية مصروفات وعهدة',
  CORPORATE_CARD_REQUEST: 'طلب إصدار / رفع حد بطاقة شركة',
  BUSINESS_TRIP: 'رحلة عمل وانتداب',
  AIR_TICKET: 'صرف تذكرة سفر سنوية',
  DEPENDENT_INSURANCE: 'ضم تابع للتأمين الطبي (CCHI)',
  DATA_UPDATE: 'تحديث بيانات وآيبان',
  RESIGNATION: 'طلب استقالة وإخلاء طرف',
};

export const DEFAULT_HR_WORKFLOWS: HrWorkflowDefinition[] = [
  {
    id: 'WF-LEAVE',
    company_id: 'SAF',
    request_category: 'LEAVE',
    name_ar: 'مسار اعتماد الإجازات (المدير المباشر ← الموارد البشرية)',
    sla_hours_per_step: 24,
    auto_escalate: true,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'DIRECT_MANAGER',
        roleLabelAr: 'المدير المباشر للقسم',
        defaultAssigneeId: 'mgr-ops',
        defaultAssigneeName: 'فهد العتيبي (مدير التشغيل)',
      },
      {
        order: 2,
        roleKey: 'HR_MANAGER',
        roleLabelAr: 'إدارة الموارد البشرية',
        defaultAssigneeId: 'mgr-hr',
        defaultAssigneeName: 'سارة خالد (مديرة الموارد البشرية)',
      },
    ],
  },
  {
    id: 'WF-FINANCE-LOAN',
    company_id: 'SAF',
    request_category: 'LOAN_ADVANCE',
    name_ar: 'مسار السلف المالية (المدير المباشر ← الموارد البشرية ← المالية)',
    sla_hours_per_step: 48,
    auto_escalate: true,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'DIRECT_MANAGER',
        roleLabelAr: 'المدير المباشر للقسم',
        defaultAssigneeId: 'mgr-ops',
        defaultAssigneeName: 'فهد العتيبي (مدير التشغيل)',
      },
      {
        order: 2,
        roleKey: 'HR_MANAGER',
        roleLabelAr: 'إدارة الموارد البشرية',
        defaultAssigneeId: 'mgr-hr',
        defaultAssigneeName: 'سارة خالد (مديرة الموارد البشرية)',
      },
      {
        order: 3,
        roleKey: 'FINANCE_MANAGER',
        roleLabelAr: 'الإدارة المالية والمحاسبة',
        defaultAssigneeId: 'mgr-fin',
        defaultAssigneeName: 'محمد مصطفى (المدير المالي)',
      },
    ],
  },
  {
    id: 'WF-SKIP-INST',
    company_id: 'SAF',
    request_category: 'SKIP_INSTALLMENT',
    name_ar: 'مسار تأجيل قسط السلفة (الموارد البشرية ← المالية)',
    sla_hours_per_step: 24,
    auto_escalate: true,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'HR_MANAGER',
        roleLabelAr: 'إدارة الموارد البشرية',
        defaultAssigneeId: 'mgr-hr',
        defaultAssigneeName: 'سارة خالد (مديرة الموارد البشرية)',
      },
      {
        order: 2,
        roleKey: 'FINANCE_MANAGER',
        roleLabelAr: 'الإدارة المالية والمحاسبة',
        defaultAssigneeId: 'mgr-fin',
        defaultAssigneeName: 'محمد مصطفى (المدير المالي)',
      },
    ],
  },
  {
    id: 'WF-EXPENSE-TRAVEL',
    company_id: 'SAF',
    request_category: 'EXPENSE_CLAIM',
    name_ar: 'مسار تسوية النفقات والعهد والانتدابات (المدير المباشر ← المالية)',
    sla_hours_per_step: 24,
    auto_escalate: true,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'DIRECT_MANAGER',
        roleLabelAr: 'المدير المباشر للقسم',
        defaultAssigneeId: 'mgr-ops',
        defaultAssigneeName: 'فهد العتيبي (مدير التشغيل)',
      },
      {
        order: 2,
        roleKey: 'FINANCE_MANAGER',
        roleLabelAr: 'الإدارة المالية والمحاسبة',
        defaultAssigneeId: 'mgr-fin',
        defaultAssigneeName: 'محمد مصطفى (المدير المالي)',
      },
    ],
  },
  {
    id: 'WF-RESIGNATION',
    company_id: 'SAF',
    request_category: 'RESIGNATION',
    name_ar: 'مسار الاستقالة وإخلاء الطرف (المدير المباشر ← HR ← الرئيس التنفيذي)',
    sla_hours_per_step: 72,
    auto_escalate: false,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'DIRECT_MANAGER',
        roleLabelAr: 'المدير المباشر للقسم',
        defaultAssigneeId: 'mgr-ops',
        defaultAssigneeName: 'فهد العتيبي (مدير التشغيل)',
      },
      {
        order: 2,
        roleKey: 'HR_MANAGER',
        roleLabelAr: 'إدارة الموارد البشرية',
        defaultAssigneeId: 'mgr-hr',
        defaultAssigneeName: 'سارة خالد (مديرة الموارد البشرية)',
      },
      {
        order: 3,
        roleKey: 'EXECUTIVE_CEO',
        roleLabelAr: 'الرئيس التنفيذي / الإدارة العليا',
        defaultAssigneeId: 'mgr-ceo',
        defaultAssigneeName: 'عبدالفتاح السليم (المدير العام)',
      },
    ],
  },
  {
    id: 'WF-OVERTIME',
    company_id: 'SAF',
    request_category: 'OVERTIME',
    name_ar: 'مسار تكليف العمل الإضافي م107 (المدير المباشر ← الموارد البشرية)',
    sla_hours_per_step: 24,
    auto_escalate: true,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'DIRECT_MANAGER',
        roleLabelAr: 'المدير المباشر للقسم',
        defaultAssigneeId: 'mgr-ops',
        defaultAssigneeName: 'فهد العتيبي (مدير التشغيل)',
      },
      {
        order: 2,
        roleKey: 'HR_MANAGER',
        roleLabelAr: 'إدارة الموارد البشرية',
        defaultAssigneeId: 'mgr-hr',
        defaultAssigneeName: 'سارة خالد (مديرة الموارد البشرية)',
      },
    ],
  },
  {
    id: 'WF-DEPENDENT-INSURANCE',
    company_id: 'SAF',
    request_category: 'DEPENDENT_INSURANCE',
    name_ar: 'مسار ضم التابعين للتأمين الطبي CCHI (الموارد البشرية)',
    sla_hours_per_step: 24,
    auto_escalate: true,
    is_active: true,
    steps: [
      {
        order: 1,
        roleKey: 'HR_MANAGER',
        roleLabelAr: 'إدارة الموارد البشرية والتأمين الطبي',
        defaultAssigneeId: 'mgr-hr',
        defaultAssigneeName: 'سارة خالد (مديرة الموارد البشرية)',
      },
    ],
  },
];

export const DEFAULT_HR_DELEGATIONS: HrManagerDelegation[] = [
  {
    id: 'DEL-2026-01',
    company_id: 'SAF',
    from_manager_id: 'mgr-ops',
    from_manager_name: 'فهد العتيبي (مدير التشغيل)',
    to_delegate_id: 'mgr-jed',
    to_delegate_name: 'خالد العتيبي (مدير فرع جدة بالإنابة)',
    start_date: '2026-12-01',
    end_date: '2026-12-15',
    reason: 'تفويض صلاحية اعتماد الطلبات أثناء الإجازة السنوية',
    is_active: true,
  },
];

export class HrWorkflowEngine {
  /**
   * Resolves effective approver, automatically substituting active delegate if manager is on vacation
   */
  public static resolveApproverWithDelegation(
    assigneeId: string,
    assigneeName: string,
    delegations: HrManagerDelegation[],
    asOfDateIso: string = new Date().toISOString().slice(0, 10)
  ): {
    effectiveId: string;
    effectiveName: string;
    delegatedFromName?: string;
  } {
    const activeDel = delegations.find(
      (d) =>
        d.is_active &&
        (d.from_manager_id === assigneeId || d.from_manager_name === assigneeName) &&
        d.start_date <= asOfDateIso &&
        asOfDateIso <= d.end_date
    );

    if (activeDel) {
      return {
        effectiveId: activeDel.to_delegate_id,
        effectiveName: activeDel.to_delegate_name,
        delegatedFromName: activeDel.from_manager_name,
      };
    }

    return {
      effectiveId: assigneeId,
      effectiveName: assigneeName,
    };
  }

  /**
   * Creates a new multi-step workflow approval instance for any HR/ESS request
   */
  public static initiateRequestWorkflow(params: {
    companyId: string;
    category: HrRequestCategory;
    sourceRecordId: string;
    requesterId: string;
    requesterName: string;
    department: string;
    summaryAr: string;
    amount?: number;
    directManagerOverride?: { id: string; name: string };
    workflows?: HrWorkflowDefinition[];
    delegations?: HrManagerDelegation[];
    conditionalRules?: ConditionalWorkflowRule[];
    context?: { leaveDays?: number; grade?: string };
    asOfDateIso?: string;
  }): HrApprovalRequestInstance {
    const wfList = params.workflows && params.workflows.length > 0 ? params.workflows : DEFAULT_HR_WORKFLOWS;
    const matchedWf =
      wfList.find((w) => w.request_category === params.category && w.is_active) ||
      (params.category === 'BUSINESS_TRIP' || params.category === 'CORPORATE_CARD_REQUEST'
        ? wfList.find((w) => w.request_category === 'EXPENSE_CLAIM')
        : undefined) ||
      (params.category === 'LEAVE_ENCASHMENT'
        ? wfList.find((w) => w.request_category === 'LEAVE')
        : undefined) ||
      wfList[0];

    const asOf = params.asOfDateIso || new Date().toISOString().slice(0, 10);
    const delegations = params.delegations || [];

    const runtimeSteps: WorkflowRuntimeStep[] = matchedWf.steps.map((tmpl) => {
      const baseId =
        tmpl.roleKey === 'DIRECT_MANAGER' && params.directManagerOverride
          ? params.directManagerOverride.id
          : tmpl.defaultAssigneeId;
      const baseName =
        tmpl.roleKey === 'DIRECT_MANAGER' && params.directManagerOverride
          ? params.directManagerOverride.name
          : tmpl.defaultAssigneeName;

      const resolved = this.resolveApproverWithDelegation(baseId, baseName, delegations, asOf);

      return {
        order: tmpl.order,
        roleKey: tmpl.roleKey,
        roleLabelAr: tmpl.roleLabelAr,
        assignedToId: resolved.effectiveId,
        assignedToName: resolved.effectiveName,
        delegatedFromName: resolved.delegatedFromName,
        status: 'PENDING',
      };
    });

    const nowIso = new Date().toISOString();
    const matchedRules = (params.conditionalRules || [])
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .filter((rule) =>
        matchesConditionalRule(rule, {
          category: params.category,
          amount: params.amount,
          leaveDays: params.context?.leaveDays,
          department: params.department,
          grade: params.context?.grade,
        })
      );

    let autoApproved = false;
    let requiresEsign = false;
    const triggeredRuleNames: string[] = [];

    for (const rule of matchedRules) {
      triggeredRuleNames.push(rule.rule_name_ar);
      if (rule.action_type === 'REQUIRE_ESIGN') {
        requiresEsign = true;
      } else if (rule.action_type === 'AUTO_APPROVE') {
        autoApproved = true;
      } else if (rule.action_type === 'ADD_APPROVER_STEP') {
        const extraRole = (rule.extra_approver_role || 'EXECUTIVE_CEO') as ApproverRoleKey;
        const extraName = rule.extra_approver_name || 'الإدارة التنفيذية (اعتماد شرطي)';
        const resolvedExtra = this.resolveApproverWithDelegation(
          extraRole === 'FINANCE_MANAGER' ? 'fin-mgr-01' : 'ceo-01',
          extraName,
          delegations,
          asOf
        );
        runtimeSteps.push({
          order: runtimeSteps.length + 1,
          roleKey: extraRole,
          roleLabelAr: `اعتماد شرطي إضافي (${rule.rule_name_ar})`,
          assignedToId: resolvedExtra.effectiveId,
          assignedToName: resolvedExtra.effectiveName,
          delegatedFromName: resolvedExtra.delegatedFromName,
          status: 'PENDING',
        });
      }
    }

    if (autoApproved) {
      for (const st of runtimeSteps) {
        st.status = 'APPROVED';
        st.actedAt = nowIso;
        st.comment = 'اعتماد آلي فوري بموجب قاعدة سير العمل الشرطية (No-Code Rule)';
      }
    }

    return {
      id: `WFR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
      company_id: params.companyId || 'SAF',
      workflow_id: matchedWf.id,
      request_category: params.category,
      category_label_ar: HR_REQUEST_CATEGORY_LABELS[params.category],
      source_record_id: params.sourceRecordId,
      requester_id: params.requesterId,
      requester_name: params.requesterName,
      department: params.department,
      summary_ar: params.summaryAr,
      amount: params.amount || 0,
      current_step_index: autoApproved ? Math.max(0, runtimeSteps.length - 1) : 0,
      steps_state: runtimeSteps,
      overall_status: autoApproved ? 'APPROVED' : 'PENDING',
      requires_esign: requiresEsign,
      triggered_rules: triggeredRuleNames.length > 0 ? triggeredRuleNames : undefined,
      submitted_at: nowIso,
      updated_at: nowIso,
    };
  }

  /**
   * Advances or rejects the active approval step in a multi-level chain
   */
  public static processStepDecision(
    instance: HrApprovalRequestInstance,
    decision: 'APPROVE' | 'REJECT',
    actorName: string,
    comment?: string
  ): HrApprovalRequestInstance {
    if (instance.overall_status === 'APPROVED' || instance.overall_status === 'REJECTED') {
      return instance;
    }

    const updatedSteps = instance.steps_state.map((s) => ({ ...s }));
    const idx = Math.min(instance.current_step_index, updatedSteps.length - 1);
    const nowIso = new Date().toISOString();

    if (decision === 'REJECT') {
      updatedSteps[idx] = {
        ...updatedSteps[idx],
        status: 'REJECTED',
        actedAt: nowIso,
        comment: comment || `مرفوض بواسطة ${actorName}`,
      };
      return {
        ...instance,
        steps_state: updatedSteps,
        overall_status: 'REJECTED',
        updated_at: nowIso,
      };
    }

    updatedSteps[idx] = {
      ...updatedSteps[idx],
      status: 'APPROVED',
      actedAt: nowIso,
      comment: comment || `معتمد بواسطة ${actorName}`,
    };

    const isLastStep = idx >= updatedSteps.length - 1;
    return {
      ...instance,
      current_step_index: isLastStep ? idx : idx + 1,
      steps_state: updatedSteps,
      overall_status: isLastStep ? 'APPROVED' : 'PENDING',
      updated_at: nowIso,
    };
  }

  /**
   * SLA Auto-Escalation Sweep: escalates overdue pending steps to the next level
   */
  public static runSlaEscalationSweep(
    instances: HrApprovalRequestInstance[],
    workflows: HrWorkflowDefinition[] = DEFAULT_HR_WORKFLOWS,
    referenceNowMs: number = Date.now()
  ): {
    updatedInstances: HrApprovalRequestInstance[];
    escalatedCount: number;
  } {
    let escalatedCount = 0;
    const updatedInstances = instances.map((inst) => {
      if (inst.overall_status !== 'PENDING') return inst;
      const wf = workflows.find((w) => w.id === inst.workflow_id);
      if (!wf || !wf.auto_escalate) return inst;

      const lastTimestampMs = new Date(inst.updated_at || inst.submitted_at).getTime();
      const elapsedHours = (referenceNowMs - lastTimestampMs) / (1000 * 3600);
      if (elapsedHours <= wf.sla_hours_per_step) return inst;

      const stepsCopy = inst.steps_state.map((s) => ({ ...s }));
      const idx = inst.current_step_index;
      const nowIso = new Date(referenceNowMs).toISOString();

      if (idx < stepsCopy.length - 1) {
        stepsCopy[idx] = {
          ...stepsCopy[idx],
          status: 'ESCALATED_SKIPPED',
          actedAt: nowIso,
          comment: `تصعيد آلي لتجاوز مهلة الاعتماد (${wf.sla_hours_per_step} ساعة)`,
        };
        escalatedCount++;
        return {
          ...inst,
          current_step_index: idx + 1,
          steps_state: stepsCopy,
          overall_status: 'ESCALATED' as const,
          updated_at: nowIso,
        };
      }

      return inst;
    });

    return { updatedInstances, escalatedCount };
  }

  /**
   * Team Leave Overlap Guard: detects concurrent leaves in the same department
   */
  public static evaluateTeamLeaveOverlap(params: {
    requesterName: string;
    department: string;
    fromDate: string;
    toDate: string;
    departmentHeadcount: number;
    existingLeaves: Array<{
      employee_name: string;
      department?: string;
      from_date: string;
      to_date: string;
      status: string;
    }>;
    maxAllowedAbsencePercent?: number;
  }): TeamLeaveOverlapResult {
    const maxPct = params.maxAllowedAbsencePercent ?? 25;
    const headcount = Math.max(1, params.departmentHeadcount);

    const overlapping = params.existingLeaves.filter((lv) => {
      if (lv.status === 'مرفوض') return false;
      if (lv.employee_name === params.requesterName) return false;
      if (lv.department && lv.department !== params.department) return false;
      return lv.from_date <= params.toDate && params.fromDate <= lv.to_date;
    });

    const names = Array.from(new Set(overlapping.map((o) => o.employee_name)));
    const concurrentAbsentCount = names.length + 1; // including requester
    const ratio = Number(((concurrentAbsentCount / headcount) * 100).toFixed(1));
    const hasConflictWarning = names.length > 0 && ratio > maxPct;

    const advisoryMessageAr = hasConflictWarning
      ? `تنبيه تعارض إجازات الفريق: يوجد (${names.length}) زملاء في نفس القسم (${names.join('، ')}) مجازون في نفس الفترة، مما يرفع نسبة الغياب إلى ${ratio}% (الحد الأعلى الموصى به ${maxPct}%).`
      : names.length > 0
      ? `ملاحظة: يتقاطع الطلب مع إجازة (${names.join('، ')}) لكن نسبة التغطية ضمن النطاق الآمن (${ratio}%).`
      : 'لا يوجد أي تعارض مع جدول إجازات أعضاء القسم.';

    return {
      hasConflictWarning,
      overlappingEmployees: names,
      departmentHeadcount: headcount,
      concurrentAbsentCount,
      absenceRatioPercent: ratio,
      advisoryMessageAr,
    };
  }
}
