/**
 * KHALID GROUP ERP — MUSANED LIFECYCLE & WORKFLOW ENGINE
 * Blueprint: scripts/extracted_v2_plan.txt & Saudi Domestic Worker Recruitment Regulations
 * Handles End-to-End Recruitment Workflow, Official Musaned Stages, Legal Refund Calculators, and Webhooks.
 */

import { domainEventBus } from './domainEventBus';

export type MusanedContractStage =
  | 'new_order'                 // طلب استقدام جديد
  | 'candidate_selected'        // تم اختيار السيرة الذاتية
  | 'musaned_contract_issued'   // تم إنشاء العقد على مساند وبانتظار السداد
  | 'client_paid'               // سداد العميل الموثق عبر وسيط مساند
  | 'agency_delegated'          // تفويض المكتب الخارجي (إنجاز / MOFA)
  | 'medical_passed'            // اجتياز الفحص الطبي للعمالة
  | 'visa_stamped'              // تفييز الجواز من السفارة السعودية
  | 'flight_booked'             // إصدار تذكرة الطيران وتحديد موعد الوصول
  | 'airport_arrived'           // وصول مطار المملكة والاستقبال الميداني
  | 'probation_active'          // سريان فترة التجربة النظامية (90 يوماً)
  | 'completed'                 // اكتمال العقد بنجاح
  | 'disputed'                  // نزاع أو شكوى مرفوعة
  | 'cancelled_refund_pending'  // ملغي وبانتظار التسوية والاسترداد
  | 'cancelled_refunded';       // تم الإلغاء ورد المستحقات

export interface MusanedContractMetadata {
  musanedContractNumber: string;
  visaNumber: string;
  workerPassport: string;
  workerName: string;
  clientNationalId: string;
  clientName: string;
  companyId: string;
  recruitmentFee: number; // المبلغ الإجمالي
  vatAmount: number;      // الضريبة 15%
  insuranceFee?: number;  // وثيقة التأمين على العقد
  signedDate: string;     // تاريخ توقيع العقد
  maxSlaDays: number;     // الحد الأقصى للاستقدام (90 يوماً)
  daysElapsed: number;
}

export interface RefundCalculationResult {
  eligibleForRefund: boolean;
  totalPaid: number;
  adminFeeDeduction: number;
  externalCostsDeduction: number;
  netRefundAmount: number;
  refundPercentage: number;
  legalReasonAr: string;
  requiresAccountingApproval: boolean;
}

export interface MusanedWebhookPayload {
  eventId: string;
  eventType: 
    | 'CONTRACT_CREATED'
    | 'PAYMENT_RECEIVED'
    | 'DELEGATION_COMPLETED'
    | 'VISA_ISSUED'
    | 'FLIGHT_CONFIRMED'
    | 'WORKER_ARRIVED'
    | 'COMPLAINT_OPENED'
    | 'CONTRACT_CANCELLED';
  musanedContractNumber: string;
  timestamp: string;
  details: Record<string, any>;
}

class MusanedLifecycleEngine {
  /**
   * Calculates legal refund according to Ministry of Human Resources (MHRSD) rules
   */
  public calculateLegalRefund(
    meta: MusanedContractMetadata,
    cancellationParty: 'client' | 'office' | 'worker_refusal',
    cancelReason: string
  ): RefundCalculationResult {
    const total = meta.recruitmentFee;

    // 1. Office fault or worker medical failure / refusal abroad
    if (cancellationParty === 'office' || cancellationParty === 'worker_refusal') {
      return {
        eligibleForRefund: true,
        totalPaid: total,
        adminFeeDeduction: 0,
        externalCostsDeduction: 0,
        netRefundAmount: total,
        refundPercentage: 100,
        legalReasonAr: 'استرداد كامل بنسبة 100% لعدم التزام المكتب أو رفض/عدم لياقة العاملة في بلد الإرسال.',
        requiresAccountingApproval: true,
      };
    }

    // 2. Client cancellation
    if (meta.daysElapsed <= 5) {
      // Within cooling off period (typically 5 days after contract creation)
      return {
        eligibleForRefund: true,
        totalPaid: total,
        adminFeeDeduction: 0,
        externalCostsDeduction: 0,
        netRefundAmount: total,
        refundPercentage: 100,
        legalReasonAr: 'إلغاء خلال مهلة التراجع النظامية الأولى (استرداد كامل دون استقطاع).',
        requiresAccountingApproval: true,
      };
    }

    if (meta.daysElapsed <= 30) {
      // Within 30 days of contract
      const deduction = total * 0.05; // 5% legal administrative deduction
      return {
        eligibleForRefund: true,
        totalPaid: total,
        adminFeeDeduction: deduction,
        externalCostsDeduction: 0,
        netRefundAmount: total - deduction,
        refundPercentage: 95,
        legalReasonAr: 'إلغاء برغبة العميل خلال أول 30 يوماً (استقطاع مصاريف إدارية بنسبة 5% كحد أقصى).',
        requiresAccountingApproval: true,
      };
    }

    // After 30 days and before arrival
    if (meta.daysElapsed > 30 && meta.daysElapsed <= meta.maxSlaDays) {
      const deduction = total * 0.20; // Up to 20% legal recovery if visas/delegations processed
      return {
        eligibleForRefund: true,
        totalPaid: total,
        adminFeeDeduction: deduction,
        externalCostsDeduction: meta.insuranceFee || 500,
        netRefundAmount: Math.max(0, total - deduction - (meta.insuranceFee || 500)),
        refundPercentage: 80,
        legalReasonAr: 'إلغاء برغبة العميل بعد مرور 30 يوماً من العقد وبعد تفويض الوكالة والتفييز.',
        requiresAccountingApproval: true,
      };
    }

    // Delayed beyond SLA
    if (meta.daysElapsed > meta.maxSlaDays) {
      return {
        eligibleForRefund: true,
        totalPaid: total,
        adminFeeDeduction: 0,
        externalCostsDeduction: 0,
        netRefundAmount: total,
        refundPercentage: 100,
        legalReasonAr: 'تجاوز المدة القصوى المحددة للاستقدام (90 يوماً) يحق للعميل استرداد كامل المبلغ مع التعويض.',
        requiresAccountingApproval: true,
      };
    }

    return {
      eligibleForRefund: false,
      totalPaid: total,
      adminFeeDeduction: 0,
      externalCostsDeduction: 0,
      netRefundAmount: 0,
      refundPercentage: 0,
      legalReasonAr: `لا يمكن حساب الاسترداد آلياً: ${cancelReason}`,
      requiresAccountingApproval: true,
    };
  }

  /**
   * Processes an incoming verified Webhook from Musaned
   */
  public processMusanedWebhook(payload: MusanedWebhookPayload): {
    nextStage: MusanedContractStage;
    auditAction: string;
    notificationTitle: string;
    notificationBody: string;
  } {
    switch (payload.eventType) {
      case 'CONTRACT_CREATED':
        return {
          nextStage: 'musaned_contract_issued',
          auditAction: 'MUSANED_CONTRACT_GENERATED',
          notificationTitle: 'عقد مساند جديد',
          notificationBody: `تم إنشاء عقد مساند رقم ${payload.musanedContractNumber} وبانتظار سداد العميل.`,
        };
      case 'PAYMENT_RECEIVED':
        return {
          nextStage: 'client_paid',
          auditAction: 'MUSANED_PAYMENT_CAPTURED',
          notificationTitle: 'سداد رسوم الاستقدام',
          notificationBody: `تم تأكيد سداد العقد رقم ${payload.musanedContractNumber} عبر محفظة مساند.`,
        };
      case 'DELEGATION_COMPLETED':
        return {
          nextStage: 'agency_delegated',
          auditAction: 'MOFA_DELEGATION_APPROVED',
          notificationTitle: 'اكتمال التفويض الإلكتروني',
          notificationBody: `تم ربط التفويض بالوكالة الخارجية بنجاح على منصة إنجاز.`,
        };
      case 'VISA_ISSUED':
        return {
          nextStage: 'visa_stamped',
          auditAction: 'VISA_STAMPED_EMBASSY',
          notificationTitle: 'صدور التأشيرة والتفييز',
          notificationBody: `تم تفييز الجواز للعمالة في السفارة السعودية بالخارج.`,
        };
      case 'FLIGHT_CONFIRMED':
        return {
          nextStage: 'flight_booked',
          auditAction: 'FLIGHT_TICKET_ISSUED',
          notificationTitle: 'حجز تذكرة السفر',
          notificationBody: `تم تأكيد موعد وصول الرحلة إلى مطار المملكة.`,
        };
      case 'WORKER_ARRIVED':
        return {
          nextStage: 'airport_arrived',
          auditAction: 'WORKER_AIRPORT_RECEPTION',
          notificationTitle: 'وصول العمالة إلى المطار',
          notificationBody: `وصلت العمالة وتم الاستقبال ونقلها إلى دار الإيواء / تسليمها للعميل.`,
        };
      case 'COMPLAINT_OPENED':
        return {
          nextStage: 'disputed',
          auditAction: 'MUSANED_DISPUTE_INITIATED',
          notificationTitle: 'شكوى جديدة على مساند',
          notificationBody: `وردت شكوى عبر منصة مساند للعقد ${payload.musanedContractNumber}.`,
        };
      case 'CONTRACT_CANCELLED':
        return {
          nextStage: 'cancelled_refund_pending',
          auditAction: 'MUSANED_CONTRACT_CANCELLED',
          notificationTitle: 'إلغاء عقد مساند',
          notificationBody: `تم إلغاء العقد وتحويل الملف إلى قسم المالية لإصدار إشعار دائن وتسوية الاسترداد.`,
        };
      default:
        return {
          nextStage: 'new_order',
          auditAction: 'UNKNOWN_MUSANED_EVENT',
          notificationTitle: 'إشعار مساند',
          notificationBody: `تحديث من منصة مساند للعقد ${payload.musanedContractNumber}`,
        };
    }
  }

  /**
   * Deterministic state transition graph (TASK-201 / prd.md §4.1).
   * Prevents skipping mandatory legal/medical milestones (e.g. cannot issue visa or flight before medical_passed).
   */
  public static readonly ALLOWED_STAGE_TRANSITIONS: Record<MusanedContractStage, MusanedContractStage[]> = {
    new_order: ['candidate_selected', 'cancelled_refund_pending'],
    candidate_selected: ['musaned_contract_issued', 'new_order', 'cancelled_refund_pending'],
    musaned_contract_issued: ['client_paid', 'cancelled_refund_pending'],
    client_paid: ['agency_delegated', 'disputed', 'cancelled_refund_pending'],
    agency_delegated: ['medical_passed', 'disputed', 'cancelled_refund_pending'],
    medical_passed: ['visa_stamped', 'disputed', 'cancelled_refund_pending'],
    visa_stamped: ['flight_booked', 'disputed', 'cancelled_refund_pending'],
    flight_booked: ['airport_arrived', 'disputed', 'cancelled_refund_pending'],
    airport_arrived: ['probation_active', 'disputed'],
    probation_active: ['completed', 'disputed', 'cancelled_refund_pending'],
    completed: [],
    disputed: ['agency_delegated', 'probation_active', 'cancelled_refund_pending', 'completed'],
    cancelled_refund_pending: ['cancelled_refunded'],
    cancelled_refunded: [],
  };

  /**
   * Validates whether a contract can transition from `currentStage` to `targetStage`.
   */
  public validateStageTransition(
    currentStage: MusanedContractStage,
    targetStage: MusanedContractStage
  ): { allowed: boolean; reasonAr: string } {
    if (currentStage === targetStage) {
      return { allowed: true, reasonAr: 'المرحلة الحالية مطابقة للمرحلة المستهدفة.' };
    }
    const allowedTargets = MusanedLifecycleEngine.ALLOWED_STAGE_TRANSITIONS[currentStage] || [];
    if (!allowedTargets.includes(targetStage)) {
      return {
        allowed: false,
        reasonAr: `انتقال غير نظامي: لا يمكن الانتقال مباشرة من مرحلة (${currentStage}) إلى (${targetStage}) دون استيفاء المراحل الإلزامية السابقة.`,
      };
    }
    return {
      allowed: true,
      reasonAr: `انتقال نظامي معتمد من (${currentStage}) إلى (${targetStage}).`,
    };
  }

  /**
   * Executes a validated contract stage transition and returns an audit log descriptor.
   */
  public transitionContractStage(params: {
    contractId: string;
    currentStage: MusanedContractStage;
    targetStage: MusanedContractStage;
    actorId: string;
  }): {
    contractId: string;
    previousStage: MusanedContractStage;
    currentStage: MusanedContractStage;
    transitionedAt: string;
    actorId: string;
    reasonAr: string;
  } {
    const check = this.validateStageTransition(params.currentStage, params.targetStage);
    if (!check.allowed) {
      throw new Error(check.reasonAr);
    }
    const transitionedAt = new Date().toISOString();
    void domainEventBus.publishDomainEvent({
      companyId: 'SAF',
      aggregateType: 'MUSANED_CONTRACT',
      aggregateId: params.contractId,
      eventType: 'CONTRACT_STAGE_CHANGED',
      payload: {
        previousStage: params.currentStage,
        currentStage: params.targetStage,
        actorId: params.actorId,
        transitionedAt,
      },
    });
    return {
      contractId: params.contractId,
      previousStage: params.currentStage,
      currentStage: params.targetStage,
      transitionedAt,
      actorId: params.actorId,
      reasonAr: check.reasonAr,
    };
  }

  /**
   * Evaluates the 90-day statutory probation/warranty period (TASK-202 / prd.md §4.1)
   * starting from airport arrival date, and generates a replacement order or compensation settlement if needed.
   */
  public calculateWarrantyStatus(params: {
    contractId: string;
    arrivalDate: string;
    evaluationDate?: string;
    recruitmentFee: number;
    incidentType?: 'none' | 'worker_refusal' | 'runaway' | 'medical_unfit';
  }): {
    contractId: string;
    daysPassed: number;
    daysRemaining: number;
    isUnderWarranty: boolean;
    warrantyStatus: 'ACTIVE_WARRANTY' | 'EXPIRED_COMPLETED' | 'WARRANTY_CLAIM_APPROVED';
    replacementOrderEligible: boolean;
    agencyLiabilityAmount: number;
    clientCompensationAmount: number;
    decisionAr: string;
  } {
    const arrivalMs = new Date(params.arrivalDate).getTime();
    const evalMs = params.evaluationDate ? new Date(params.evaluationDate).getTime() : Date.now();
    const daysPassed = Math.max(0, Math.floor((evalMs - arrivalMs) / (1000 * 60 * 60 * 24)));
    const STATUTORY_WARRANTY_DAYS = 90;
    const daysRemaining = Math.max(0, STATUTORY_WARRANTY_DAYS - daysPassed);
    const isUnderWarranty = daysPassed <= STATUTORY_WARRANTY_DAYS;
    const incident = params.incidentType || 'none';

    if (!isUnderWarranty) {
      return {
        contractId: params.contractId,
        daysPassed,
        daysRemaining: 0,
        isUnderWarranty: false,
        warrantyStatus: 'EXPIRED_COMPLETED',
        replacementOrderEligible: false,
        agencyLiabilityAmount: 0,
        clientCompensationAmount: 0,
        decisionAr: 'انتهت فترة التجربة النظامية (90 يوماً) وأصبح العقد مكتملاً نهائياً.',
      };
    }

    if (incident !== 'none') {
      // Proportional deduction for days worked if worker refused/absconded, or 100% agency liability on medical unfit
      const dailyRate = params.recruitmentFee / (24 * 30); // 24-month contract
      const utilizedValue = incident === 'medical_unfit' ? 0 : Math.round(dailyRate * daysPassed);
      const clientCompensationAmount = Math.max(0, Number((params.recruitmentFee - utilizedValue).toFixed(2)));

      return {
        contractId: params.contractId,
        daysPassed,
        daysRemaining,
        isUnderWarranty: true,
        warrantyStatus: 'WARRANTY_CLAIM_APPROVED',
        replacementOrderEligible: true,
        agencyLiabilityAmount: clientCompensationAmount,
        clientCompensationAmount,
        decisionAr: `المطالبة ضمن فترة الضمان النظامية (${daysPassed} يوماً من أصل 90): يحق للعميل إصدار عقد استقدام بديل مجاناً أو استرداد تعويضي بقيمة ${clientCompensationAmount} ⃁ وتحميل الوكالة الخارجية التكلفة.`,
      };
    }

    return {
      contractId: params.contractId,
      daysPassed,
      daysRemaining,
      isUnderWarranty: true,
      warrantyStatus: 'ACTIVE_WARRANTY',
      replacementOrderEligible: false,
      agencyLiabilityAmount: 0,
      clientCompensationAmount: 0,
      decisionAr: `العقد سارٍ ضمن فترة الضمان النظامية (متبقي ${daysRemaining} يوماً من أصل 90 يوماً).`,
    };
  }

  /**
   * 5. محرك الفوترة الدورية والتجديد التلقائي لعقود التأجير (Recurring Rental Billing & Auto-Renewal)
   * يولّد جدول دفعات شهرية مع ضريبة 15% وتاريخ تذكير آلي قبل الاستحقاق بـ 5 أيام.
   */
  public generateRecurringRentalSchedule(params: {
    contractId: string;
    startDate: string;
    months: number;
    monthlyBaseSar: number;
    vatRate?: number;
  }): Array<{
    installmentNo: number;
    dueDate: string;
    reminderDate: string;
    baseAmountSar: number;
    vatAmountSar: number;
    totalAmountSar: number;
    status: 'SCHEDULED';
  }> {
    const vatRate = params.vatRate ?? 0.15;
    const count = Math.max(1, Math.min(36, Math.floor(params.months)));
    const schedule: Array<{
      installmentNo: number;
      dueDate: string;
      reminderDate: string;
      baseAmountSar: number;
      vatAmountSar: number;
      totalAmountSar: number;
      status: 'SCHEDULED';
    }> = [];

    const start = new Date(`${params.startDate}T00:00:00Z`);
    for (let i = 0; i < count; i++) {
      const due = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, start.getUTCDate()));
      const reminder = new Date(due.getTime() - 5 * 86_400_000);
      const baseAmountSar = Math.round(params.monthlyBaseSar * 100) / 100;
      const vatAmountSar = Math.round(baseAmountSar * vatRate * 100) / 100;
      const totalAmountSar = Math.round((baseAmountSar + vatAmountSar) * 100) / 100;

      schedule.push({
        installmentNo: i + 1,
        dueDate: due.toISOString().slice(0, 10),
        reminderDate: reminder.toISOString().slice(0, 10),
        baseAmountSar,
        vatAmountSar,
        totalAmountSar,
        status: 'SCHEDULED',
      });
    }
    return schedule;
  }

  /**
   * 6. كاشف تعارض حجز العاملات والسائقين (Worker Availability & Buffer Conflict Detector)
   * يمنع ازدواجية الحجز لنفس العاملة ويحتسب فترة الراحة والفحص الطبي بين العقود (Buffer Days).
   */
  public detectWorkerBookingConflict(params: {
    workerId: string;
    requestedStart: string;
    requestedEnd: string;
    existingBookings: Array<{ contractId: string; startDate: string; endDate: string }>;
    bufferDays?: number;
  }): {
    hasConflict: boolean;
    conflictingContractIds: string[];
    bufferDaysApplied: number;
  } {
    const bufferDays = params.bufferDays ?? 2;
    const bufferMs = bufferDays * 86_400_000;
    const reqStartMs = new Date(`${params.requestedStart}T00:00:00Z`).getTime();
    const reqEndMs = new Date(`${params.requestedEnd}T23:59:59Z`).getTime();

    const conflictingContractIds: string[] = [];
    for (const b of params.existingBookings) {
      const bStartMs = new Date(`${b.startDate}T00:00:00Z`).getTime() - bufferMs;
      const bEndMs = new Date(`${b.endDate}T23:59:59Z`).getTime() + bufferMs;
      if (reqStartMs <= bEndMs && reqEndMs >= bStartMs) {
        conflictingContractIds.push(b.contractId);
      }
    }

    return {
      hasConflict: conflictingContractIds.length > 0,
      conflictingContractIds,
      bufferDaysApplied: bufferDays,
    };
  }

  /**
   * 7. التحقق من رمز التسليم الرقمي (Digital Handover OTP Verification)
   */
  public verifyDigitalHandoverOtp(params: {
    contractId: string;
    clientPhone: string;
    expectedOtp: string;
    providedOtp: string;
    expiresAtIso: string;
    nowIso?: string;
  }): {
    verified: boolean;
    reasonAr: string;
    handoverStatus: 'DELIVERED_VERIFIED' | 'OTP_EXPIRED' | 'OTP_MISMATCH';
  } {
    const nowMs = params.nowIso ? new Date(params.nowIso).getTime() : Date.now();
    const expMs = new Date(params.expiresAtIso).getTime();

    if (nowMs > expMs) {
      return {
        verified: false,
        reasonAr: 'انتهت صلاحية رمز التحقق (OTP) قبل إتمام التسليم.',
        handoverStatus: 'OTP_EXPIRED',
      };
    }

    if (params.expectedOtp.trim() !== params.providedOtp.trim()) {
      return {
        verified: false,
        reasonAr: 'رمز التحقق المدخل غير مطابق للرمز المرسل لرقم جوال العميل.',
        handoverStatus: 'OTP_MISMATCH',
      };
    }

    return {
      verified: true,
      reasonAr: `تم توثيق محضر استلام العاملة للعقد (${params.contractId}) بنجاح عبر رمز التحقق الرقمي.`,
      handoverStatus: 'DELIVERED_VERIFIED',
    };
  }

  /**
   * 8. التسوية المالية الثلاثية للرجيع والاستبدال (Three-Way Return Settlement: Client / Foreign Agency / Insurance)
   */
  public computeThreeWayReturnSettlement(params: {
    contractAmountSar: number;
    totalContractDays?: number;
    daysWorked: number;
    agencyFault: boolean;
    insuranceCoveredSar?: number;
  }): {
    utilizedAmountSar: number;
    clientRefundSar: number;
    agencyDebitSar: number;
    insuranceClaimSar: number;
    officeNetImpactSar: number;
  } {
    const totalDays = params.totalContractDays || 720; // 24 months default
    const dailyRate = params.contractAmountSar / totalDays;
    const utilizedAmountSar = Math.round(dailyRate * Math.max(0, params.daysWorked) * 100) / 100;
    const clientRefundSar = Math.max(0, Math.round((params.contractAmountSar - utilizedAmountSar) * 100) / 100);
    const insuranceClaimSar = Math.max(0, Math.round((params.insuranceCoveredSar || 0) * 100) / 100);
    const agencyDebitSar = params.agencyFault
      ? Math.max(0, Math.round((clientRefundSar - insuranceClaimSar) * 100) / 100)
      : 0;
    const officeNetImpactSar = Math.round((clientRefundSar - agencyDebitSar - insuranceClaimSar) * 100) / 100;

    return {
      utilizedAmountSar,
      clientRefundSar,
      agencyDebitSar,
      insuranceClaimSar,
      officeNetImpactSar,
    };
  }
}

export const musanedLifecycleEngine = new MusanedLifecycleEngine();

