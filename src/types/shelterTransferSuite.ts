// ============================================================================
// KHALID AL-SULAIM ERP - SHELTER & SPONSORSHIP TRANSFER SUITE
// Architectural Types based on BRD_نظام_إدارة_السكن_ونقل_الخدمات.xlsx (13 Sheets)
// ============================================================================

export type GroupOfficeId = 'SAF' | 'DAR' | 'TOP' | 'YAQ';

export interface OfficeMeta {
  id: GroupOfficeId;
  name: string;
  shortName: string;
  badgeColor: string;
  primaryColor: string;
}

export const GROUP_OFFICES: Record<GroupOfficeId, OfficeMeta> = {
  SAF: {
    id: 'SAF',
    name: 'مكتب السفير / الصفا الماسي للاستقدام',
    shortName: 'السفير / الصفا',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    primaryColor: '#CFA64A',
  },
  DAR: {
    id: 'DAR',
    name: 'شركة دار الرواد للتشغيل والخدمات',
    shortName: 'دار الرواد',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    primaryColor: '#10B981',
  },
  TOP: {
    id: 'TOP',
    name: 'شركة توباز / توب تالنت الدولية للتوظيف',
    shortName: 'توباز / توب تالنت',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    primaryColor: '#8B5CF6',
  },
  YAQ: {
    id: 'YAQ',
    name: 'شركة ياقوت الشرقية للتشغيل والخدمات',
    shortName: 'ياقوت الشرقية',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    primaryColor: '#3B82F6',
  },
};

export const GROUP_COMPANIES = Object.values(GROUP_OFFICES).map(o => ({
  id: o.id,
  name: o.name,
  shortName: o.shortName,
  brandColor: o.primaryColor,
  crNumber: o.id === 'SAF' ? '1010582910' : o.id === 'DAR' ? '1010642918' : o.id === 'TOP' ? '1010771294' : '2050182914',
}));

// ============================================================================
// 1. WORKER PROFILE (ملف العاملة الموحد الثابت)
// ============================================================================
export type WorkerOperationalStatus = 
  | 'داخل السكن'
  | 'تحت التقييم'
  | 'متاحة لنقل الخدمات'
  | 'محجوزة'
  | 'بانتظار الاتفاقية'
  | 'جاهزة للتسليم'
  | 'خرجت للعميل'
  | 'بانتظار نقل الخدمات'
  | 'تم نقل الخدمات'
  | 'عادت من العميل'
  | 'مرحلة الترحيل'
  | 'مغلق';

export interface WorkerProfile {
  id: string; // Internal UUID
  workerCode: string; // WRK-1001
  originalOfficeId: GroupOfficeId; // مكتب العاملة الأصلي
  fullNameAr: string;
  fullNameEn: string;
  nationality: string;
  passportNumber: string;
  iqamaNumber?: string;
  birthDate?: string;
  age: number;
  religion?: string;
  phoneNumber?: string;
  saudiEntryDate?: string;
  initialShelterEntryDate: string;
  initialEntryReason: string;
  operationalStatus: WorkerOperationalStatus;
  requiredAction: 'نقل خدمات' | 'سفر / خروج نهائي' | 'تسوية ونزاع' | 'علاج ورعاية';
  requestedSalary: number;
  experienceYears: number;
  experienceCountry?: string;
  languages: string[];
  skills: string[];
  photoUrl: string;
  cvUrl?: string;
  documentsStatus: 'مكتملة' | 'ناقصة' | 'جاري الاستخراج';
  clientTrialsCount: number; // عداد مرات الخروج للعملاء (حد أقصى 3 تجارب وفق Ewaa)
  lastDispatchDate?: string;
  lastReturnDate?: string;
  responsibleEmployee: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // ── EWAA ENGINE EXTENSIONS (حقول محرك التشغيل المبني على الوقائع والأدلة) ──
  ewaaJourneyStage?: string;
  physicalPresence?: 'inside_housing' | 'in_housing' | 'received_inside' | 'temporarily_outside' | 'at_airport' | 'with_client_trial' | 'direct_handover_completed' | 'departed_verified' | 'departed' | 'unknown_whereabouts' | 'pending_housing_receipt' | 'outside';
  workerDeclaredIntent?: 'transfer' | 'final_exit' | 'return_employer' | 'undecided';
  employerIntent?: 'transfer' | 'final_exit' | 'return_worker' | 'undecided';
  decisionRoute?: 'transfer' | 'final_exit' | 'return_employer' | null;
  receivingSource?: 'airport' | 'employer' | 'police' | 'embassy' | 'slslc' | 'other';
  intakeFactsJson?: string;
  belongings?: Array<{
    item_key: string;
    custody: string;
    description: string;
    amount: number | null;
  }>;
  missingVerifications?: string[];
  parallelActions?: string[];
  abscondingStatus?: 'none' | 'active' | 'unknown' | 'cleared';
  hasOpenProtectionCase?: boolean;
  wageClaimTotal?: number;
  wageClaimPayments?: Array<{
    id: string;
    amount: number;
    status: 'reported_unverified' | 'verified_with_evidence';
    evidenceRef?: string;
    paidAt: string;
    recordedBy: string;
    notes?: string;
  }>;
  finalExitVisaIssuedAt?: string | null;
  flightAt?: string | null;
  ticketResponsibility?: 'office' | 'employer' | 'worker' | 'unknown';
  departureEvidenceRef?: string | null;
  intentConfirmedAfterReturn?: boolean;
}

// ============================================================================
// 2. FIRST SPONSOR (بيانات الكفيل الأول / صاحب العمل السابق)
// ============================================================================
export interface WorkerFirstSponsor {
  id: string;
  workerId: string;
  sponsorName: string;
  nationalIdOrIqama: string;
  phoneNumber: string;
  city: string;
  contractRefNo?: string;
  recruitmentOffice: string; // المكتب الذي تم الاستقدام من خلاله
  relationshipStartDate?: string;
  returnDate: string; // تاريخ إعادة العاملة
  returnReason: string; // سبب الإعادة
  warrantyStatus: 'داخل الضمان (90 يوم)' | 'خارج الضمان' | 'نزاع مالي' | string;
  hasClaim: boolean; // هل توجد مطالبة / شكوى
  financialClaimAmount?: number;
  settlementStatus?: 'معلق' | 'تمت التسوية' | 'نزاع' | string;
  claimDetails?: string;
  previousRelationshipStatus: 'منتهية ودية' | 'نزاع عمالي لدى مساند' | 'مستحقات معلقة' | string;
  notes?: string;
}

// ============================================================================
// 3. ACCOMMODATION CASE (حالات السكن والإيواء)
// ============================================================================
export interface AccommodationCase {
  id: string;
  caseCode: string; // ACC-2026-001
  workerId: string;
  originalOfficeId: GroupOfficeId;
  entryDateTime: string; // تاريخ ووقت الدخول الفعلي
  entryReason: string;
  receivingEmployee: string;
  receivedDocuments: string[];
  iqamaStatus: 'سارية' | 'منتهية' | 'بلا إقامة (تأشيرة فقط)';
  requiredAction: string;
  responsibleEmployee: string;
  priority: 'عادية' | 'متوسطة' | 'عاجلة';
  caseStatus: 'نشطة بالسكن' | 'تحت التقييم' | 'مكتملة - خرجت' | 'مغلقة';
  exitDateTime?: string;
  exitType?: 'خروج لتجربة عميل' | 'خروج نهائي وسفر' | 'تسليم كفيل';
  roomNumber?: string;
  bedNumber?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// 4. TRANSFER CASE (عمليات نقل الخدمات)
// ============================================================================
export type TransferProcessStatus = 
  | 'محجوزة'
  | 'بانتظار الاتفاقية'
  | 'جاهزة للتسليم'
  | 'خرجت للعميل'
  | 'بانتظار نقل الخدمات'
  | 'تم نقل الخدمات'
  | 'عادت من العميل'
  | 'ملغاة';

export interface TransferCase {
  id: string;
  transferCode: string; // TRF-2026-001
  workerId: string;
  accommodationCaseId: string;
  originalOfficeId: GroupOfficeId; // مكتب العاملة الأصلي
  executingOfficeId: GroupOfficeId; // المكتب المنفذ لعملية النقل
  newClientName: string;
  newClientNationalId: string;
  newClientPhone: string;
  newClientCity: string;
  responsibleEmployee: string;
  selectionDate: string;
  reservationDate: string;
  transferStatus: TransferProcessStatus;
  
  // Dynamic Manual Financials
  transferFee: number; // السعر يدوي غير ثابت
  downPayment: number; // الدفعة الأولى يدوي غير ثابت
  remainingAmount: number; // المحسوب تلقائياً
  paymentStatus: 'مسدد بالكامل' | 'دفعة أولى' | 'معلق' | 'مسترد';
  
  // Agreement details
  agreementRefNo?: string;
  agreementSignDate?: string;
  agreementFileUrl?: string;

  // Delivery & Follow-up countdown
  deliveryDateTime?: string; // وقت التسليم الفعلي
  followupDaysDuration: number; // مدة التجربة (5 أو 7 أيام)
  followupEndDate?: string; // تاريخ نهاية التجربة
  clientDecision?: 'قيد التجربة' | 'موافق على نقل الخدمات' | 'طلب إرجاع العاملة' | 'طلب تمديد التجربة';

  // Transfer Platform Action
  transferRequestDate?: string;
  transferRequestStatus?: 'لم يرفع' | 'بانتظار قبول مساند' | 'تمت الموافقة' | 'مرفوض';
  transferCompletionDate?: string;

  // Return & Settlement (if rejected)
  returnDateTime?: string;
  returnReason?: string;
  actualTrialDays?: number;
  deductionAmount?: number;
  refundAmount?: number;
  settlementStatus?: 'معلق' | 'تمت التسوية' | 'نزاع';

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 5. CLIENT FOLLOW-UP (سجل متابعة العملاء اليومي)
// ============================================================================
export type FollowUpAlertLevel = 'green' | 'yellow' | 'red';

export interface ClientFollowUp {
  id: string;
  transferCaseId: string;
  workerId: string;
  contactDateTime: string;
  contactedPerson: string;
  contactChannel: 'اتصال هاتفي' | 'واتساب' | 'زيارة فرع';
  employeeName: string;
  contactResult: 
    | 'راضي ومستمر بالتجربة'
    | 'ملاحظات تدريبية بسيطة'
    | 'موافق تماماً على نقل الخدمات'
    | 'يرغب بإرجاع العاملة'
    | 'لم يرد / معاودة الاتصال';
  clientFeedback: string;
  requiredActionToday: string;
  nextContactDate?: string;
  alertLevel: FollowUpAlertLevel;
}

// ============================================================================
// 6. WORKER MOVEMENT TIMELINE (سجل الحركات التاريخي الشامل)
// ============================================================================
export type MovementEventType = 
  | 'دخول سكن'
  | 'تقييم أهلية'
  | 'إتاحة لنقل الخدمات'
  | 'حجز لعميل'
  | 'توقيع اتفاقية'
  | 'تسليم للعميل'
  | 'تسجيل متابعة'
  | 'طلب نقل خدمات'
  | 'إتمام نقل الخدمات'
  | 'إرجاع للسكن'
  | 'تسوية مالية'
  | 'تسليم مباشر من المطار'
  | 'توثيق مطالبة أجور'
  | 'إثبات مغادرة نهائية';

export interface WorkerMovementTimeline {
  id: string;
  workerId: string;
  accommodationCaseId?: string;
  transferCaseId?: string;
  eventDateTime: string;
  movementType: MovementEventType;
  fromStatus?: string;
  toStatus?: string;
  actorEmployee: string;
  officeId: GroupOfficeId;
  description: string;
  attachmentRef?: string;
}

// ============================================================================
// 7. DASHBOARD METRICS (مؤشرات لوحة القيادة)
// ============================================================================
export interface ShelterDashboardMetrics {
  totalInShelter: number;
  availableForTransfer: number;
  outWithClientsTrial: number;
  endingSoonCount: number; // ينتهي خلال 48 ساعة (أصفر)
  overdueCount: number; // متجاوزات المدة (أحمر)
  waitingGovTransfer: number; // بانتظار نقل الخدمات
  returnedThisMonth: number;
  completedTransfersThisMonth: number;
}

// ============================================================================
// 8. PROACTIVE NOTIFICATIONS & ALERTS (نظام الإشعارات والتنبيهات الاستباقية)
// ============================================================================
export type ShelterAlertType = 
  | 'trial_ending_48h'              // T - 48h (أصفر)
  | 'trial_ending_24h'              // T - 24h (برتقالي)
  | 'trial_overdue'                 // T = 0 أو متأخر (أحمر عاجل)
  | 'shelter_stay_extended'         // أكثر من 7 أيام بالسكن
  | 'first_sponsor_warranty_expiring' // اقتراب انتهاء الـ 90 يوماً
  | 'downpayment_pending'           // حجز معلق بدون عربون
  | 'musaned_approval_pending';     // طلب مساند بانتظار الاعتماد

export type AlertUrgencyLevel = 'info' | 'warning' | 'urgent' | 'danger';

export interface ShelterProactiveAlert {
  id: string;
  type: ShelterAlertType;
  urgency: AlertUrgencyLevel;
  title: string;
  description: string;
  workerId: string;
  workerName: string;
  workerCode?: string;
  nationality?: string;
  photoUrl?: string;
  originalOfficeId: GroupOfficeId;
  executingOfficeId?: GroupOfficeId;
  transferCaseId?: string;
  accommodationCaseId?: string;
  clientName?: string;
  clientPhone?: string;
  deadlineDate?: string;
  daysRemaining?: number; // negative if overdue
  suggestedAction: string;
  whatsappMessageTemplate?: string;
  createdAt: string;
}
