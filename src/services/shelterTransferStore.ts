// ============================================================================
// KHALID AL-SULAIM ERP - SHELTER & SPONSORSHIP TRANSFER STORE
// Business Logic Engine for BRD_نظام_إدارة_السكن_ونقل_الخدمات.xlsx
// ============================================================================

import {
  WorkerProfile,
  WorkerFirstSponsor,
  AccommodationCase,
  TransferCase,
  ClientFollowUp,
  WorkerMovementTimeline,
  ShelterDashboardMetrics,
  GroupOfficeId,
  FollowUpAlertLevel,
  ShelterProactiveAlert,
  AlertUrgencyLevel,
} from '../types/shelterTransferSuite';
import { notificationPopupEngine, triggerNotification } from './notificationPopupEngine';

const STORAGE_KEYS = {
  WORKERS: 'erp_shelter_workers_v1',
  FIRST_SPONSORS: 'erp_shelter_first_sponsors_v1',
  ACCOMMODATION_CASES: 'erp_shelter_accommodation_cases_v1',
  TRANSFER_CASES: 'erp_shelter_transfer_cases_v1',
  FOLLOW_UPS: 'erp_shelter_client_followups_v1',
  TIMELINE: 'erp_shelter_worker_timeline_v1',
  DISMISSED_ALERTS: 'erp_shelter_dismissed_alerts_v1',
};

// ============================================================================
// INITIAL SEED DATA (Realistic Scenarios across the 4 Offices)
// ============================================================================

const SEED_WORKERS: WorkerProfile[] = [
  {
    id: 'w-101',
    workerCode: 'WRK-1001',
    originalOfficeId: 'SAF',
    fullNameAr: 'فاطمة ميكونين أديسي',
    fullNameEn: 'Fatima Mekonnen Adissie',
    nationality: 'إثيوبيا',
    passportNumber: 'EP4819203',
    iqamaNumber: '2491029381',
    age: 26,
    phoneNumber: '0541122334',
    saudiEntryDate: '2025-10-12',
    initialShelterEntryDate: '2026-08-25',
    initialEntryReason: 'إعادة من الكفيل الأول خلال فترة الضمان',
    operationalStatus: 'خرجت للعميل',
    requiredAction: 'نقل خدمات',
    requestedSalary: 1200,
    experienceYears: 3,
    experienceCountry: 'السعودية (سنتان)',
    languages: ['العربية (جيد جداً)', 'الأمهرية (اللغة الأم)'],
    skills: ['طبخ أكلات سعودية شعبية', 'رعاية الأطفال والرضع', 'تنظيف وترتيب فلل'],
    photoUrl: '/noura.png',
    cvUrl: '/cvs/WRK-1001.pdf',
    documentsStatus: 'مكتملة',
    clientTrialsCount: 1,
    lastDispatchDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    responsibleEmployee: 'سارة القحطاني',
    notes: 'عاملة ممتازة ومطيعة تجيد إعداد الكبسة والمخبوزات',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-102',
    workerCode: 'WRK-1002',
    originalOfficeId: 'TOP',
    fullNameAr: 'ماري روز سانتوس',
    fullNameEn: 'Mary Rose Santos',
    nationality: 'الفلبين',
    passportNumber: 'PH9928172',
    iqamaNumber: '2398102911',
    age: 31,
    phoneNumber: '0569988776',
    saudiEntryDate: '2025-06-15',
    initialShelterEntryDate: '2026-09-01',
    initialEntryReason: 'رغبة في نقل الخدمات لعدم التوافق مع العائلة الكبيرة',
    operationalStatus: 'متاحة لنقل الخدمات',
    requiredAction: 'نقل خدمات',
    requestedSalary: 1500,
    experienceYears: 4,
    experienceCountry: 'دبي والسعودية',
    languages: ['الإنجليزية (ممتاز)', 'العربية (متوسط)', 'التاغالوغية'],
    skills: ['إدارة المنزل بالكامل', 'رعاية كبار السن وذوي الاحتياجات', 'غسيل وكوي ملابس رسمية'],
    photoUrl: '/noura.png',
    cvUrl: '/cvs/WRK-1002.pdf',
    documentsStatus: 'مكتملة',
    clientTrialsCount: 0,
    responsibleEmployee: 'نوف الشمري',
    notes: 'تحمل شهادة تمريض معتمدة ولبقة جداً في التعامل',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-103',
    workerCode: 'WRK-1003',
    originalOfficeId: 'DAR',
    fullNameAr: 'زينب أوكيلو موكاسا',
    fullNameEn: 'Zainab Okello Mukasa',
    nationality: 'أوغندا',
    passportNumber: 'UG7718291',
    iqamaNumber: '2510293819',
    age: 24,
    saudiEntryDate: '2026-01-20',
    initialShelterEntryDate: '2026-08-10',
    initialEntryReason: 'خلاف على ساعات العمل الإضافية مع الكفيل السابق',
    operationalStatus: 'خرجت للعميل',
    requiredAction: 'نقل خدمات',
    requestedSalary: 1100,
    experienceYears: 1,
    languages: ['الإنجليزية (جيد)', 'العربية (مبتدئ)'],
    skills: ['غسيل وتنظيف عميق', 'مساعدة في المطبخ', 'تنظيم المستودعات'],
    photoUrl: '/noura.png',
    cvUrl: '/cvs/WRK-1003.pdf',
    documentsStatus: 'مكتملة',
    clientTrialsCount: 1,
    lastDispatchDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    responsibleEmployee: 'فاطمة العتيبي',
    notes: 'نشيطة وبنية قوية وتتقبل التعلم بسرعة',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-104',
    workerCode: 'WRK-1004',
    originalOfficeId: 'YAQ',
    fullNameAr: 'أمينة حسين وانجيكو',
    fullNameEn: 'Amina Hussein Wanjiku',
    nationality: 'كينيا',
    passportNumber: 'KE3321908',
    iqamaNumber: '2419082312',
    age: 28,
    saudiEntryDate: '2025-11-05',
    initialShelterEntryDate: '2026-08-28',
    initialEntryReason: 'سفر الكفيل السابق للخارج خروج نهائي',
    operationalStatus: 'بانتظار نقل الخدمات',
    requiredAction: 'نقل خدمات',
    requestedSalary: 1300,
    experienceYears: 2,
    languages: ['الإنجليزية (ممتاز)', 'العربية (متوسط)', 'السواحيلية'],
    skills: ['تربية أطفال', 'طبخ عالمي وصحي', 'قيادة تدبير المنزل'],
    photoUrl: '/noura.png',
    cvUrl: '/cvs/WRK-1004.pdf',
    documentsStatus: 'مكتملة',
    clientTrialsCount: 1,
    lastDispatchDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    responsibleEmployee: 'نورة الدوسري',
    notes: 'تمت موافقة العميل بنجاح ورفع طلب النقل على منصة مساند',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-105',
    workerCode: 'WRK-1005',
    originalOfficeId: 'SAF',
    fullNameAr: 'سيلفيا ديلا كروز',
    fullNameEn: 'Sylvia Dela Cruz',
    nationality: 'الفلبين',
    passportNumber: 'PH5541902',
    iqamaNumber: '2381902819',
    age: 33,
    saudiEntryDate: '2025-08-10',
    initialShelterEntryDate: '2026-08-15',
    initialEntryReason: 'إعادة من عميل تجربة بسبب عدم رغبتها في الحيوانات الأليفة',
    operationalStatus: 'عادت من العميل',
    requiredAction: 'نقل خدمات',
    requestedSalary: 1600,
    experienceYears: 5,
    languages: ['الإنجليزية (بطلاقة)', 'العربية (جيد)', 'التاغالوغية'],
    skills: ['طبخ احترافي', 'مساعدة تدريس أطفال', 'تنظيم مناسبات عائلية'],
    photoUrl: '/noura.png',
    cvUrl: '/cvs/WRK-1005.pdf',
    documentsStatus: 'مكتملة',
    clientTrialsCount: 2,
    lastReturnDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    responsibleEmployee: 'سارة القحطاني',
    notes: 'العاملة ممتازة ولكن تشترط عائلة بدون حيوانات أليفة (حساسية)، جاهزة للتقييم وإعادة العرض',
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_FIRST_SPONSORS: WorkerFirstSponsor[] = [
  {
    id: 'fs-101',
    workerId: 'w-101',
    sponsorName: 'محمد بن سعد القحطاني',
    nationalIdOrIqama: '1082910291',
    phoneNumber: '0554433221',
    city: 'الرياض',
    contractRefNo: 'MUS-2025-9941',
    recruitmentOffice: 'مكتب السفير / الصفا للاستقدام',
    relationshipStartDate: '2025-10-15',
    returnDate: '2026-08-25',
    returnReason: 'عدم التوافق مع متطلبات الطبخ في المناسبات الكبيرة',
    warrantyStatus: 'داخل الضمان (90 يوم)',
    hasClaim: false,
    previousRelationshipStatus: 'منتهية ودية',
    notes: 'تمت التسوية الودية وتنازل الكفيل الأول لصالح نقل الخدمات',
  },
  {
    id: 'fs-102',
    workerId: 'w-102',
    sponsorName: 'سعد بن ناصر الشهري',
    nationalIdOrIqama: '1049281726',
    phoneNumber: '0501199882',
    city: 'جدة',
    contractRefNo: 'MUS-2025-8812',
    recruitmentOffice: 'توب تالنت الدولية',
    relationshipStartDate: '2025-06-20',
    returnDate: '2026-09-01',
    returnReason: 'سكن في فيلا 3 أدوار مع 8 أطفال والعاملة طلبت أسرة أصغر',
    warrantyStatus: 'خارج الضمان',
    hasClaim: false,
    previousRelationshipStatus: 'منتهية ودية',
    notes: 'أكد الكفيل الأول تفوق العاملة في رعاية الأطفال وأوصى بها لعائلة متوسطة',
  },
  {
    id: 'fs-103',
    workerId: 'w-103',
    sponsorName: 'عبدالعزيز بن فهد الخالدي',
    nationalIdOrIqama: '1029182716',
    phoneNumber: '0533322110',
    city: 'الدمام',
    contractRefNo: 'DAR-2026-0041',
    recruitmentOffice: 'دار الرواد للتشغيل',
    relationshipStartDate: '2026-01-25',
    returnDate: '2026-08-10',
    returnReason: 'خلاف حول الرواتب وتأخر السداد',
    warrantyStatus: 'خارج الضمان',
    hasClaim: true,
    claimDetails: 'مطالبة براتب شهرين متأخرين تم تحصيلها وإيداعها للعاملة',
    previousRelationshipStatus: 'منتهية ودية',
    notes: 'استلمت العاملة كافة مستحقاتها ووقعت مخالصة رسمية',
  },
];

const SEED_ACCOMMODATIONS: AccommodationCase[] = [
  {
    id: 'acc-101',
    caseCode: 'ACC-2026-001',
    workerId: 'w-101',
    originalOfficeId: 'SAF',
    entryDateTime: '2026-08-25T10:30:00Z',
    entryReason: 'إرجاع من الكفيل الأول خلال فترة الضمان',
    receivingEmployee: 'مريم الدوسري',
    receivedDocuments: ['أصل الجواز', 'بطاقة الإقامة', 'عقد مساند'],
    iqamaStatus: 'سارية',
    requiredAction: 'تقييم وتأهيل لنقل الخدمات',
    responsibleEmployee: 'سارة القحطاني',
    priority: 'عادية',
    caseStatus: 'مكتملة - خرجت',
    exitDateTime: '2026-09-03T14:00:00Z',
    exitType: 'خروج لتجربة عميل',
    roomNumber: 'جناح ب - غرفة 204',
    bedNumber: 'سرير 2',
    notes: 'تم فحص العاملة طبياً وحالتها الصحية ممتازة ومتحمسة للعمل',
    createdAt: '2026-08-25T10:30:00Z',
  },
  {
    id: 'acc-102',
    caseCode: 'ACC-2026-002',
    workerId: 'w-102',
    originalOfficeId: 'TOP',
    entryDateTime: '2026-09-01T09:15:00Z',
    entryReason: 'دخول سكن بانتظار نقل الخدمات لعميل مناسب',
    receivingEmployee: 'هند السبيعي',
    receivedDocuments: ['أصل الجواز', 'بطاقة الإقامة'],
    iqamaStatus: 'سارية',
    requiredAction: 'إتاحة مباشرة لنقل الخدمات',
    responsibleEmployee: 'نوف الشمري',
    priority: 'عادية',
    caseStatus: 'نشطة بالسكن',
    roomNumber: 'جناح أ - غرفة 101',
    bedNumber: 'سرير 4',
    notes: 'موجودة حالياً بالسكن وجاهزة للتسليم فور اختيارها',
    createdAt: '2026-09-01T09:15:00Z',
  },
  {
    id: 'acc-103',
    caseCode: 'ACC-2026-003',
    workerId: 'w-103',
    originalOfficeId: 'DAR',
    entryDateTime: '2026-08-10T11:00:00Z',
    entryReason: 'إيواء وتسوية عمالية تمهيداً للنقل',
    receivingEmployee: 'مريم الدوسري',
    receivedDocuments: ['أصل الجواز', 'مخالصة مالية'],
    iqamaStatus: 'سارية',
    requiredAction: 'نقل خدمات فوري',
    responsibleEmployee: 'فاطمة العتيبي',
    priority: 'عاجلة',
    caseStatus: 'مكتملة - خرجت',
    exitDateTime: '2026-08-30T16:30:00Z',
    exitType: 'خروج لتجربة عميل',
    roomNumber: 'جناح ج - غرفة 301',
    bedNumber: 'سرير 1',
    createdAt: '2026-08-10T11:00:00Z',
  },
];

const SEED_TRANSFERS: TransferCase[] = [
  {
    id: 'trf-101',
    transferCode: 'TRF-2026-001',
    workerId: 'w-101',
    accommodationCaseId: 'acc-101',
    originalOfficeId: 'SAF', // مكتب العاملة الأصلي: السفير
    executingOfficeId: 'DAR', // المكتب المنفذ للنقل: دار الرواد
    newClientName: 'سلطان بن فهد العتيبي',
    newClientNationalId: '1098271625',
    newClientPhone: '0555123456',
    newClientCity: 'الرياض',
    responsibleEmployee: 'سارة القحطاني',
    selectionDate: '2026-09-02',
    reservationDate: '2026-09-02',
    transferStatus: 'خرجت للعميل',
    transferFee: 17500, // يدوي
    downPayment: 5000,  // يدوي
    remainingAmount: 12500,
    paymentStatus: 'دفعة أولى',
    agreementRefNo: 'AGR-DAR-2026-089',
    agreementSignDate: '2026-09-03',
    deliveryDateTime: new Date(Date.now() - 3.5 * 86400000).toISOString(), // سلمت قبل 3.5 أيام
    followupDaysDuration: 5, // تجربة 5 أيام
    followupEndDate: new Date(Date.now() + 1.5 * 86400000).toISOString().split('T')[0], // متبقي 1.5 يوم (أصفر!)
    clientDecision: 'قيد التجربة',
    notes: 'العميل تواصل مبدئياً وأبدى ارتياحه، يحتاج متابعة نهائية غداً صباحاً',
    createdAt: '2026-09-02T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trf-102',
    transferCode: 'TRF-2026-002',
    workerId: 'w-103',
    accommodationCaseId: 'acc-103',
    originalOfficeId: 'DAR', // الأصلي: دار الرواد
    executingOfficeId: 'YAQ', // المنفذ: ياقوت الشرقية
    newClientName: 'عبدالله بن راشد الدوسري',
    newClientNationalId: '1019283746',
    newClientPhone: '0505987654',
    newClientCity: 'الخبر',
    responsibleEmployee: 'فاطمة العتيبي',
    selectionDate: '2026-08-29',
    reservationDate: '2026-08-29',
    transferStatus: 'خرجت للعميل',
    transferFee: 16000,
    downPayment: 16000,
    remainingAmount: 0,
    paymentStatus: 'مسدد بالكامل',
    agreementRefNo: 'AGR-YAQ-2026-031',
    agreementSignDate: '2026-08-30',
    deliveryDateTime: new Date(Date.now() - 7 * 86400000).toISOString(), // سلمت قبل 7 أيام
    followupDaysDuration: 5,
    followupEndDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], // متأخرة بيومين (أحمر عاجل!)
    clientDecision: 'قيد التجربة',
    notes: 'انتهت مدة التجربة والعميل لم يؤكد بعد؛ مطلوب اتصال فوري وحسم الموافقة أو الإرجاع',
    createdAt: '2026-08-29T12:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trf-103',
    transferCode: 'TRF-2026-003',
    workerId: 'w-104',
    accommodationCaseId: 'acc-104',
    originalOfficeId: 'YAQ', // الأصلي: ياقوت
    executingOfficeId: 'SAF', // المنفذ: السفير
    newClientName: 'خالد بن ناصر المطيري',
    newClientNationalId: '1048192837',
    newClientPhone: '0543322119',
    newClientCity: 'الرياض',
    responsibleEmployee: 'نورة الدوسري',
    selectionDate: '2026-08-29',
    reservationDate: '2026-08-29',
    transferStatus: 'بانتظار نقل الخدمات',
    transferFee: 18000,
    downPayment: 18000,
    remainingAmount: 0,
    paymentStatus: 'مسدد بالكامل',
    agreementRefNo: 'AGR-SAF-2026-112',
    agreementSignDate: '2026-08-30',
    deliveryDateTime: '2026-08-30T10:00:00Z',
    followupDaysDuration: 5,
    followupEndDate: '2026-09-04',
    clientDecision: 'موافق على نقل الخدمات',
    transferRequestDate: '2026-09-04',
    transferRequestStatus: 'بانتظار قبول مساند',
    notes: 'وافق العميل رسمياً وطلب نقل الكفالة، الطلب مرفوع ومسدد الرسوم بانتظار اعتماد الوزارة',
    createdAt: '2026-08-29T09:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'trf-104',
    transferCode: 'TRF-2026-004',
    workerId: 'w-105',
    accommodationCaseId: 'acc-105',
    originalOfficeId: 'SAF',
    executingOfficeId: 'TOP',
    newClientName: 'ماجد بن تركي الشمري',
    newClientNationalId: '1072918273',
    newClientPhone: '0567788990',
    newClientCity: 'الدمام',
    responsibleEmployee: 'سارة القحطاني',
    selectionDate: '2026-08-18',
    reservationDate: '2026-08-18',
    transferStatus: 'عادت من العميل',
    transferFee: 19000,
    downPayment: 5000,
    remainingAmount: 14000,
    paymentStatus: 'مسترد',
    agreementRefNo: 'AGR-TOP-2026-042',
    agreementSignDate: '2026-08-19',
    deliveryDateTime: '2026-08-19T14:00:00Z',
    followupDaysDuration: 5,
    followupEndDate: '2026-08-24',
    clientDecision: 'طلب إرجاع العاملة',
    returnDateTime: '2026-08-22T17:00:00Z',
    returnReason: 'تحسس العاملة من قطط العائلة بالمنزل',
    actualTrialDays: 3,
    deductionAmount: 450, // خصم 150 ⃁ يومياً
    refundAmount: 4550,   // استرداد باقي الدفعة الأولى
    settlementStatus: 'تمت التسوية',
    notes: 'تمت التسوية مع العميل ماجد وإرجاع 4550 ⃁ لحسابه البنكي وإعادة العاملة للسكن',
    createdAt: '2026-08-18T11:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

const SEED_FOLLOWUPS: ClientFollowUp[] = [
  {
    id: 'fu-1',
    transferCaseId: 'trf-101',
    workerId: 'w-101',
    contactDateTime: new Date(Date.now() - 1.5 * 86400000).toISOString(),
    contactedPerson: 'سلطان العتيبي (العميل)',
    contactChannel: 'اتصال هاتفي',
    employeeName: 'سارة القحطاني',
    contactResult: 'ملاحظات تدريبية بسيطة',
    clientFeedback: 'العاملة ممتازة وأخلاقها عالية، فقط طلبت من أم العيال تدريبها على غسالة الأوتوماتيك الجديدة',
    requiredActionToday: 'متابعة حسم قرار نقل الخدمات غداً',
    nextContactDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    alertLevel: 'yellow',
  },
  {
    id: 'fu-2',
    transferCaseId: 'trf-102',
    workerId: 'w-103',
    contactDateTime: new Date(Date.now() - 3 * 86400000).toISOString(),
    contactedPerson: 'عبدالله الدوسري (العميل)',
    contactChannel: 'واتساب',
    employeeName: 'فاطمة العتيبي',
    contactResult: 'لم يرد / معاودة الاتصال',
    clientFeedback: 'تم إرسال رسالة تذكيرية بانتهاء فترة التجربة ولم يرد حتى الآن',
    requiredActionToday: 'اتصال هاتفي حاسم فوراً لتحديد موعد إرجاع العاملة أو استكمال النقل',
    nextContactDate: new Date().toISOString().split('T')[0],
    alertLevel: 'red',
  },
];

const SEED_TIMELINE: WorkerMovementTimeline[] = [
  {
    id: 'tm-1',
    workerId: 'w-101',
    accommodationCaseId: 'acc-101',
    eventDateTime: '2026-08-25T10:30:00Z',
    movementType: 'دخول سكن',
    fromStatus: 'مع الكفيل الأول',
    toStatus: 'داخل السكن',
    actorEmployee: 'مريم الدوسري',
    officeId: 'SAF',
    description: 'تسجيل دخول العاملة للسكن واستلام الجواز والإقامة بعد إعادتها من الكفيل الأول محمد القحطاني',
  },
  {
    id: 'tm-2',
    workerId: 'w-101',
    accommodationCaseId: 'acc-101',
    eventDateTime: '2026-08-27T12:00:00Z',
    movementType: 'تقييم أهلية',
    fromStatus: 'داخل السكن',
    toStatus: 'متاحة لنقل الخدمات',
    actorEmployee: 'سارة القحطاني',
    officeId: 'SAF',
    description: 'إجراء مقابلة التقييم واختبار الطبخ والتأكد من رغبتها الأكيدة في نقل الخدمات',
  },
  {
    id: 'tm-3',
    workerId: 'w-101',
    transferCaseId: 'trf-101',
    eventDateTime: '2026-09-02T10:00:00Z',
    movementType: 'حجز لعميل',
    fromStatus: 'متاحة لنقل الخدمات',
    toStatus: 'محجوزة',
    actorEmployee: 'سارة القحطاني',
    officeId: 'DAR',
    description: 'حجز العاملة لصالح العميل سلطان بن فهد العتيبي عن طريق مكتب دار الرواد',
  },
  {
    id: 'tm-4',
    workerId: 'w-101',
    transferCaseId: 'trf-101',
    eventDateTime: '2026-09-03T14:00:00Z',
    movementType: 'تسليم للعميل',
    fromStatus: 'جاهزة للتسليم',
    toStatus: 'خرجت للعميل',
    actorEmployee: 'مريم الدوسري',
    officeId: 'DAR',
    description: 'تسليم العاملة للعميل وبدء عداد فترة التجربة والمتابعة 5 أيام',
  },
];

// ============================================================================
// STORE IMPLEMENTATION CLASS
// ============================================================================

class ShelterTransferStore {
  private workers: WorkerProfile[] = [];
  private firstSponsors: WorkerFirstSponsor[] = [];
  private accommodationCases: AccommodationCase[] = [];
  private transferCases: TransferCase[] = [];
  private followUps: ClientFollowUp[] = [];
  private timeline: WorkerMovementTimeline[] = [];
  private dismissedAlertIds: Set<string> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    // Load from LocalStorage or initialize with Seeds
    try {
      const storedWorkers = localStorage.getItem(STORAGE_KEYS.WORKERS);
      this.workers = storedWorkers ? JSON.parse(storedWorkers) : SEED_WORKERS;

      const storedSponsors = localStorage.getItem(STORAGE_KEYS.FIRST_SPONSORS);
      this.firstSponsors = storedSponsors ? JSON.parse(storedSponsors) : SEED_FIRST_SPONSORS;

      const storedAcc = localStorage.getItem(STORAGE_KEYS.ACCOMMODATION_CASES);
      this.accommodationCases = storedAcc ? JSON.parse(storedAcc) : SEED_ACCOMMODATIONS;

      const storedTransfers = localStorage.getItem(STORAGE_KEYS.TRANSFER_CASES);
      this.transferCases = storedTransfers ? JSON.parse(storedTransfers) : SEED_TRANSFERS;

      const storedFollowups = localStorage.getItem(STORAGE_KEYS.FOLLOW_UPS);
      this.followUps = storedFollowups ? JSON.parse(storedFollowups) : SEED_FOLLOWUPS;

      const storedTimeline = localStorage.getItem(STORAGE_KEYS.TIMELINE);
      this.timeline = storedTimeline ? JSON.parse(storedTimeline) : SEED_TIMELINE;

      const storedDismissed = localStorage.getItem(STORAGE_KEYS.DISMISSED_ALERTS);
      if (storedDismissed) {
        this.dismissedAlertIds = new Set(JSON.parse(storedDismissed));
      }

      this.saveAll();
      this.isInitialized = true;
    } catch (e) {
      console.warn('[ShelterTransferStore] LocalStorage error, falling back to in-memory seeds', e);
      this.workers = SEED_WORKERS;
      this.firstSponsors = SEED_FIRST_SPONSORS;
      this.accommodationCases = SEED_ACCOMMODATIONS;
      this.transferCases = SEED_TRANSFERS;
      this.followUps = SEED_FOLLOWUPS;
      this.timeline = SEED_TIMELINE;
    }
  }

  private saveAll() {
    try {
      localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(this.workers));
      localStorage.setItem(STORAGE_KEYS.FIRST_SPONSORS, JSON.stringify(this.firstSponsors));
      localStorage.setItem(STORAGE_KEYS.ACCOMMODATION_CASES, JSON.stringify(this.accommodationCases));
      localStorage.setItem(STORAGE_KEYS.TRANSFER_CASES, JSON.stringify(this.transferCases));
      localStorage.setItem(STORAGE_KEYS.FOLLOW_UPS, JSON.stringify(this.followUps));
      localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(this.timeline));
    } catch (e) {
      console.error('[ShelterTransferStore] Error writing to localStorage:', e);
    }
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  public getWorkers(officeFilter?: GroupOfficeId): WorkerProfile[] {
    if (!officeFilter) return [...this.workers];
    return this.workers.filter(w => w.originalOfficeId === officeFilter);
  }

  public getWorkerById(workerId: string): WorkerProfile | undefined {
    return this.workers.find(w => w.id === workerId || w.workerCode === workerId);
  }

  public getFirstSponsor(workerId: string): WorkerFirstSponsor | undefined {
    return this.firstSponsors.find(fs => fs.workerId === workerId);
  }

  public getAccommodationCases(workerId?: string): AccommodationCase[] {
    if (workerId) {
      return this.accommodationCases.filter(c => c.workerId === workerId);
    }
    return [...this.accommodationCases];
  }

  public getTransferCases(filter?: { workerId?: string; executingOfficeId?: GroupOfficeId }): TransferCase[] {
    let list = [...this.transferCases];
    if (filter?.workerId) {
      list = list.filter(t => t.workerId === filter.workerId);
    }
    if (filter?.executingOfficeId) {
      list = list.filter(t => t.executingOfficeId === filter.executingOfficeId);
    }
    return list;
  }

  public getClientFollowUps(transferCaseId?: string): ClientFollowUp[] {
    if (transferCaseId) {
      return this.followUps.filter(f => f.transferCaseId === transferCaseId);
    }
    return [...this.followUps];
  }

  public getWorkerTimeline(workerId: string): WorkerMovementTimeline[] {
    return this.timeline
      .filter(t => t.workerId === workerId)
      .sort((a, b) => new Date(b.eventDateTime).getTime() - new Date(a.eventDateTime).getTime());
  }

  // ============================================================================
  // CORE BUSINESS CALCULATORS: DATES, REMAINING DAYS & COLOR STATUS
  // ============================================================================

  public calculateFollowupStatus(transferCase: TransferCase): {
    remainingDays: number;
    alertLevel: FollowUpAlertLevel;
    statusLabel: string;
    isOverdue: boolean;
  } {
    if (!transferCase.deliveryDateTime || !transferCase.followupEndDate) {
      return { remainingDays: 0, alertLevel: 'green', statusLabel: 'غير محدد', isOverdue: false };
    }

    const now = new Date();
    const endDate = new Date(transferCase.followupEndDate);
    endDate.setHours(23, 59, 59, 999);

    const diffMs = endDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) {
      return {
        remainingDays,
        alertLevel: 'red',
        statusLabel: remainingDays === 0 ? 'تنتهي اليوم!' : `متأخرة بـ ${Math.abs(remainingDays)} يوم`,
        isOverdue: true,
      };
    }

    if (remainingDays <= 2) {
      return {
        remainingDays,
        alertLevel: 'yellow',
        statusLabel: remainingDays === 1 ? 'تنتهي غداً!' : 'متبقي يومان',
        isOverdue: false,
      };
    }

    return {
      remainingDays,
      alertLevel: 'green',
      statusLabel: `متبقي ${remainingDays} أيام`,
      isOverdue: false,
    };
  }

  // ============================================================================
  // DASHBOARD METRICS
  // ============================================================================

  public getDashboardMetrics(officeFilter?: GroupOfficeId): ShelterDashboardMetrics {
    const activeWorkers = officeFilter 
      ? this.workers.filter(w => w.originalOfficeId === officeFilter)
      : this.workers;

    const outTransfers = this.transferCases.filter(t => t.transferStatus === 'خرجت للعميل');

    let endingSoonCount = 0;
    let overdueCount = 0;

    outTransfers.forEach(t => {
      const { alertLevel } = this.calculateFollowupStatus(t);
      if (alertLevel === 'red') overdueCount++;
      if (alertLevel === 'yellow') endingSoonCount++;
    });

    return {
      totalInShelter: activeWorkers.filter(w => w.operationalStatus === 'داخل السكن' || w.operationalStatus === 'تحت التقييم' || w.operationalStatus === 'متاحة لنقل الخدمات').length,
      availableForTransfer: activeWorkers.filter(w => w.operationalStatus === 'متاحة لنقل الخدمات').length,
      outWithClientsTrial: outTransfers.length,
      endingSoonCount,
      overdueCount,
      waitingGovTransfer: this.transferCases.filter(t => t.transferStatus === 'بانتظار نقل الخدمات').length,
      returnedThisMonth: this.transferCases.filter(t => t.transferStatus === 'عادت من العميل').length,
      completedTransfersThisMonth: this.transferCases.filter(t => t.transferStatus === 'تم نقل الخدمات').length,
    };
  }

  public getMetrics(officeFilter?: GroupOfficeId) {
    const dm = this.getDashboardMetrics(officeFilter);
    const trans = officeFilter ? this.transferCases.filter(t => t.executingOfficeId === officeFilter) : this.transferCases;
    const totalTransferRevenue = trans.reduce((sum, t) => sum + (t.transferFee || 0), 0);
    return {
      ...dm,
      totalWorkersInShelter: dm.totalInShelter,
      workersInClientTrial: dm.outWithClientsTrial,
      transfersCompletedThisMonth: dm.completedTransfersThisMonth,
      totalTransferRevenue,
    };
  }

  public getState() {
    return {
      workers: this.workers,
      accommodationCases: this.accommodationCases,
      transferCases: this.transferCases,
      firstSponsors: this.firstSponsors,
      timeline: this.timeline,
      followUps: this.followUps,
    };
  }

  public canReserveWorker(workerId: string): { canReserve: boolean; reason?: string } {
    const worker = this.getWorkerById(workerId);
    if (!worker) return { canReserve: false, reason: 'العاملة غير موجودة بالسجلات' };
    if (worker.operationalStatus !== 'متاحة لنقل الخدمات') {
      return { 
        canReserve: false, 
        reason: `العاملة في حالة (${worker.operationalStatus}) وليست متاحة للحجز حالياً.` 
      };
    }
    const activeBooking = this.transferCases.find(
      t => t.workerId === workerId && (t.transferStatus === 'محجوزة' || t.transferStatus === 'خرجت للعميل' || t.transferStatus === 'بانتظار الاتفاقية')
    );
    if (activeBooking) {
      return { 
        canReserve: false, 
        reason: `العاملة محجوزة بالفعل للعميل (${activeBooking.newClientName}) برقم عقد (${activeBooking.transferCode})` 
      };
    }
    return { canReserve: true };
  }

  // ============================================================================
  // PROACTIVE ALERTS & NOTIFICATION ENGINE
  // ============================================================================
  public getDismissedAlertIds(): string[] {
    return Array.from(this.dismissedAlertIds);
  }

  public dismissAlert(alertId: string) {
    this.dismissedAlertIds.add(alertId);
    try {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_ALERTS, JSON.stringify(Array.from(this.dismissedAlertIds)));
    } catch (e) {
      console.error(e);
    }
  }

  public clearDismissedAlerts() {
    this.dismissedAlertIds.clear();
    try {
      localStorage.removeItem(STORAGE_KEYS.DISMISSED_ALERTS);
    } catch (e) {
      console.error(e);
    }
  }

  public getProactiveAlerts(officeFilter?: GroupOfficeId): ShelterProactiveAlert[] {
    const alerts: ShelterProactiveAlert[] = [];
    const now = new Date();

    // 1. Check Transfer Cases out with clients ('خرجت للعميل')
    const activeTransfers = this.transferCases.filter(t => t.transferStatus === 'خرجت للعميل');
    
    for (const t of activeTransfers) {
      if (officeFilter && t.executingOfficeId !== officeFilter && t.originalOfficeId !== officeFilter) {
        continue;
      }

      const worker = this.getWorkerById(t.workerId);
      const workerName = worker?.fullNameAr || 'العاملة';
      const status = this.calculateFollowupStatus(t);

      // Overdue or Ending Today (T = 0 or negative) -> Red/Danger
      if (status.remainingDays <= 0) {
        const isToday = status.remainingDays === 0;
        const daysOver = Math.abs(status.remainingDays);
        const alertId = `alert-overdue-${t.id}-${t.followupEndDate}`;
        
        alerts.push({
          id: alertId,
          type: 'trial_overdue',
          urgency: 'danger',
          title: isToday ? 'اليوم موعد الحسم النهائي لفترة التجربة' : `متأخرة بـ ${daysOver} يوم عن فترة التجربة`,
          description: `انتهت فترة التجربة المقررة (${t.followupDaysDuration} أيام) للعاملة ${workerName} لدى العميل ${t.newClientName}.`,
          workerId: t.workerId,
          workerName,
          workerCode: worker?.workerCode,
          nationality: worker?.nationality,
          photoUrl: worker?.photoUrl,
          originalOfficeId: t.originalOfficeId,
          executingOfficeId: t.executingOfficeId,
          transferCaseId: t.id,
          clientName: t.newClientName,
          clientPhone: t.newClientPhone,
          deadlineDate: t.followupEndDate,
          daysRemaining: status.remainingDays,
          suggestedAction: 'اتصال فوري بالعميل لحسم القرار: اعتماد نقل الكفالة في مساند وسداد المتبقي، أو تحديد موعد استلام العاملة للسكن.',
          whatsappMessageTemplate: `عزيزنا العميل ${t.newClientName} المحترم، نحيطكم علماً بأن اليوم هو الموعد النهائي المحدد لفترة تجربة العاملة المنزلية (${workerName}). نرجو التكرم بالتواصل لتأكيد الرغبة في نقل الخدمات أو التنسيق لإعادتها للسكن. شاكرين حسن تعاونكم - مجموعة السليم الموحدة.`,
          createdAt: t.createdAt,
        });
      }
      // Ending in 1 Day (T - 24h) -> Urgent/Orange
      else if (status.remainingDays === 1) {
        const alertId = `alert-24h-${t.id}-${t.followupEndDate}`;
        alerts.push({
          id: alertId,
          type: 'trial_ending_24h',
          urgency: 'urgent',
          title: 'متبقي 24 ساعة على انتهاء التجربة (T - 24h)',
          description: `غداً هو الموعد النهائي لانتهاء تجربة العاملة ${workerName} لدى العميل ${t.newClientName}.`,
          workerId: t.workerId,
          workerName,
          workerCode: worker?.workerCode,
          nationality: worker?.nationality,
          photoUrl: worker?.photoUrl,
          originalOfficeId: t.originalOfficeId,
          executingOfficeId: t.executingOfficeId,
          transferCaseId: t.id,
          clientName: t.newClientName,
          clientPhone: t.newClientPhone,
          deadlineDate: t.followupEndDate,
          daysRemaining: 1,
          suggestedAction: 'إجراء مكالمة حاسمة مع العميل لاستطلاع رأيه النهائي وتجهيز مسار مساند أو جدول الإعادة.',
          whatsappMessageTemplate: `عزيزنا العميل ${t.newClientName}، نود تذكيركم بأنه متبقي 24 ساعة على انتهاء فترة تجربة العاملة (${workerName}). نرجو إبلاغنا بقراركم النهائي لاعتماد نقل الخدمات أو التنسيق معنا. نسعد بخدمتكم دائماً.`,
          createdAt: t.createdAt,
        });
      }
      // Ending in 2 Days (T - 48h) -> Warning/Yellow
      else if (status.remainingDays === 2) {
        const alertId = `alert-48h-${t.id}-${t.followupEndDate}`;
        alerts.push({
          id: alertId,
          type: 'trial_ending_48h',
          urgency: 'warning',
          title: 'متبقي 48 ساعة على انتهاء التجربة (T - 48h)',
          description: `متبقي يومان على انقضاء تجربة العاملة ${workerName} لدى العميل ${t.newClientName}.`,
          workerId: t.workerId,
          workerName,
          workerCode: worker?.workerCode,
          nationality: worker?.nationality,
          photoUrl: worker?.photoUrl,
          originalOfficeId: t.originalOfficeId,
          executingOfficeId: t.executingOfficeId,
          transferCaseId: t.id,
          clientName: t.newClientName,
          clientPhone: t.newClientPhone,
          deadlineDate: t.followupEndDate,
          daysRemaining: 2,
          suggestedAction: 'تواصل استطلاعي بالواتساب لمعرفة مدى ملاءمة العاملة وتذليل أي ملاحظات قبل موعد الحسم.',
          whatsappMessageTemplate: `عزيزنا العميل ${t.newClientName}، نود تذكيركم بأنه متبقي يومان على انتهاء فترة تجربة العاملة (${workerName}). نتمنى أن تكون التجربة موفقة، ويسعدنا تلقي أي ملاحظات لديكم.`,
          createdAt: t.createdAt,
        });
      }
    }

    // 2. Check pending bookings with missing down payment > 24 hours
    const pendingBookings = this.transferCases.filter(
      t => (t.transferStatus === 'محجوزة' || t.transferStatus === 'بانتظار الاتفاقية') && (t.downPayment === 0 || t.paymentStatus === 'معلق')
    );
    for (const pb of pendingBookings) {
      if (officeFilter && pb.executingOfficeId !== officeFilter && pb.originalOfficeId !== officeFilter) continue;
      const worker = this.getWorkerById(pb.workerId);
      const workerName = worker?.fullNameAr || 'العاملة';
      const alertId = `alert-downpayment-${pb.id}`;

      alerts.push({
        id: alertId,
        type: 'downpayment_pending',
        urgency: 'warning',
        title: `حجز معلق بدون عربون: ${pb.transferCode}`,
        description: `تم حجز العاملة ${workerName} للعميل ${pb.newClientName} ولم يتم إثبات سداد العربون أو توقيع الاتفاقية.`,
        workerId: pb.workerId,
        workerName,
        workerCode: worker?.workerCode,
        nationality: worker?.nationality,
        photoUrl: worker?.photoUrl,
        originalOfficeId: pb.originalOfficeId,
        executingOfficeId: pb.executingOfficeId,
        transferCaseId: pb.id,
        clientName: pb.newClientName,
        clientPhone: pb.newClientPhone,
        deadlineDate: pb.reservationDate,
        suggestedAction: 'متابعة العميل لتأكيد السداد وتوقيع الاتفاقية أو إلغاء الحجز لإتاحة العاملة لعملاء المكاتب الأخرى.',
        whatsappMessageTemplate: `عزيزنا العميل ${pb.newClientName}، نود إحاطتكم بأن حجز العاملة (${workerName}) بانتظار سداد العربون وتوقيع الاتفاقية لتأكيد الحجز وتحديد موعد التسليم.`,
        createdAt: pb.createdAt,
      });
    }

    // 3. Check Workers waiting for Musaned approval
    const waitingGov = this.transferCases.filter(t => t.transferStatus === 'بانتظار نقل الخدمات');
    for (const wg of waitingGov) {
      if (officeFilter && wg.executingOfficeId !== officeFilter && wg.originalOfficeId !== officeFilter) continue;
      const worker = this.getWorkerById(wg.workerId);
      const workerName = worker?.fullNameAr || 'العاملة';
      const alertId = `alert-musaned-${wg.id}`;

      alerts.push({
        id: alertId,
        type: 'musaned_approval_pending',
        urgency: 'info',
        title: `بانتظار اعتماد مساند: ${wg.transferCode}`,
        description: `تمت موافقة العميل ${wg.newClientName} على نقل خدمات العاملة ${workerName} والطلب بانتظار اعتماد الوزارة وسداد الرسوم.`,
        workerId: wg.workerId,
        workerName,
        workerCode: worker?.workerCode,
        nationality: worker?.nationality,
        photoUrl: worker?.photoUrl,
        originalOfficeId: wg.originalOfficeId,
        executingOfficeId: wg.executingOfficeId,
        transferCaseId: wg.id,
        clientName: wg.newClientName,
        clientPhone: wg.newClientPhone,
        deadlineDate: wg.transferRequestDate,
        suggestedAction: 'متابعة قبول الطلب في منصة مساند من الطرفين وسداد رسوم نقل الخدمات لإغلاق الإجراء نظامياً.',
        whatsappMessageTemplate: `عزيزنا العميل ${wg.newClientName}، تم رفع طلب نقل الخدمات في منصة مساند. نرجو الدخول وقبول الطلب وسداد الرسوم لإتمام نقل الكفالة رسمياً.`,
        createdAt: wg.createdAt,
      });
    }

    // 4. Extended Shelter Stay (> 7 days)
    for (const w of this.workers) {
      if (officeFilter && w.originalOfficeId !== officeFilter) continue;
      if (w.operationalStatus === 'داخل السكن' || w.operationalStatus === 'تحت التقييم') {
        const entryDate = new Date(w.initialShelterEntryDate);
        const daysInShelter = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysInShelter >= 7) {
          const alertId = `alert-shelter-stay-${w.id}`;
          alerts.push({
            id: alertId,
            type: 'shelter_stay_extended',
            urgency: 'warning',
            title: `إشغال سكن مطول (${daysInShelter} يوماً)`,
            description: `النزيلة ${w.fullNameAr} (${w.workerCode}) مقيمة بالسكن منذ ${daysInShelter} يوماً دون إتاحتها أو حجزها.`,
            workerId: w.id,
            workerName: w.fullNameAr,
            workerCode: w.workerCode,
            nationality: w.nationality,
            photoUrl: w.photoUrl,
            originalOfficeId: w.originalOfficeId,
            deadlineDate: w.initialShelterEntryDate,
            daysRemaining: -daysInShelter,
            suggestedAction: 'إتمام التقييم الشامل وإتاحة ملفها في كتالوج نقل الخدمات لجميع المكاتب، أو اتخاذ إجراء السفر.',
            createdAt: w.createdAt,
          });
        }
      }
    }

    // 5. First Sponsor 90-day Warranty Expiring
    for (const fs of this.firstSponsors) {
      if (fs.warrantyStatus?.includes('داخل الضمان') && fs.returnDate) {
        const retDate = new Date(fs.returnDate);
        const daysSinceReturn = Math.floor((now.getTime() - retDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeftIn90 = 90 - daysSinceReturn;
        if (daysLeftIn90 <= 15 && daysLeftIn90 >= 0) {
          const worker = this.getWorkerById(fs.workerId);
          if (officeFilter && worker && worker.originalOfficeId !== officeFilter) continue;
          const alertId = `alert-warranty-${fs.id}`;
          alerts.push({
            id: alertId,
            type: 'first_sponsor_warranty_expiring',
            urgency: 'warning',
            title: `اقتراب انتهاء مهلة الضمان (متبقي ${daysLeftIn90} يوماً)`,
            description: `الكفيل السابق ${fs.sponsorName} لعقد العاملة ${worker?.fullNameAr || ''} يقترب ضمان الـ 90 يوماً من الانتهاء.`,
            workerId: fs.workerId,
            workerName: worker?.fullNameAr || '',
            workerCode: worker?.workerCode,
            originalOfficeId: worker?.originalOfficeId || 'SAF',
            clientName: fs.sponsorName,
            clientPhone: fs.phoneNumber,
            deadlineDate: fs.returnDate,
            daysRemaining: daysLeftIn90,
            suggestedAction: 'مراجعة الكفيل الأول لحسم المستحقات والتنازل في مساند وسداد المطالبات قبل سقوط حق الضمان.',
            whatsappMessageTemplate: `أخي الكريم ${fs.sponsorName}، نود تذكيركم بقرب انتهاء فترة الضمان النظامية (90 يوماً). نرجو مراجعة الفرع لإتمام التسوية المالية أو اعتماد التنازل في مساند.`,
            createdAt: fs.returnDate,
          });
        }
      }
    }

    const urgencyWeight: Record<AlertUrgencyLevel, number> = {
      danger: 4,
      urgent: 3,
      warning: 2,
      info: 1,
    };

    return alerts
      .filter(a => !this.dismissedAlertIds.has(a.id))
      .sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);
  }

  // ============================================================================
  // WRITE / MUTATION OPERATIONS (Enforcing the 10 Business Rules)
  // ============================================================================

  // RULE 1, 2: Check-in new Worker or new Shelter Stay
  public intakeWorker(params: {
    workerData: Omit<WorkerProfile, 'id' | 'workerCode' | 'clientTrialsCount' | 'createdAt' | 'updatedAt'>;
    firstSponsorData?: Omit<WorkerFirstSponsor, 'id' | 'workerId'>;
    roomNumber?: string;
    bedNumber?: string;
    receivingEmployee: string;
  }): { worker: WorkerProfile; accommodation: AccommodationCase } {
    const nextNum = this.workers.length + 1001;
    const workerId = `w-${Date.now()}`;
    const workerCode = `WRK-${nextNum}`;

    const newWorker: WorkerProfile = {
      ...params.workerData,
      id: workerId,
      workerCode,
      clientTrialsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workers.unshift(newWorker);

    // First Sponsor record
    if (params.firstSponsorData) {
      const fs: WorkerFirstSponsor = {
        ...params.firstSponsorData,
        id: `fs-${Date.now()}`,
        workerId,
      };
      this.firstSponsors.unshift(fs);
    }

    // Accommodation Case record
    const accCase: AccommodationCase = {
      id: `acc-${Date.now()}`,
      caseCode: `ACC-2026-${String(this.accommodationCases.length + 1).padStart(3, '0')}`,
      workerId,
      originalOfficeId: newWorker.originalOfficeId,
      entryDateTime: new Date().toISOString(),
      entryReason: params.workerData.initialEntryReason,
      receivingEmployee: params.receivingEmployee,
      receivedDocuments: ['أصل الجواز', 'بطاقة الإقامة'],
      iqamaStatus: 'سارية',
      requiredAction: params.workerData.requiredAction,
      responsibleEmployee: params.workerData.responsibleEmployee,
      priority: 'عادية',
      caseStatus: 'نشطة بالسكن',
      roomNumber: params.roomNumber,
      bedNumber: params.bedNumber,
      createdAt: new Date().toISOString(),
    };
    this.accommodationCases.unshift(accCase);

    // Log to Movement Timeline
    this.addTimelineEvent({
      workerId,
      accommodationCaseId: accCase.id,
      movementType: 'دخول سكن',
      fromStatus: 'خارج المنظومة',
      toStatus: newWorker.operationalStatus,
      actorEmployee: params.receivingEmployee,
      officeId: newWorker.originalOfficeId,
      description: `دخول العاملة الجديدة للسكن التابع لـ ${newWorker.originalOfficeId} - سبب الدخول: ${params.workerData.initialEntryReason}`,
    });

    this.saveAll();

    triggerNotification({
      title: 'تسجيل دخول عاملة جديدة بالسكن',
      body: `تم تسجيل العاملة ${newWorker.fullNameAr} (${newWorker.workerCode}) بنجاح بالسكن المشترك.`,
      type: 'system',
    });

    return { worker: newWorker, accommodation: accCase };
  }

  // RULE 5, 6: Reserve Worker for Transfer (Prevents double reservation)
  public bookWorkerForTransfer(params: {
    workerId: string;
    executingOfficeId: GroupOfficeId; // المكتب المنفذ لعملية النقل
    clientName: string;
    clientNationalId: string;
    clientPhone: string;
    clientCity: string;
    transferFee: number; // السعر يدوي
    downPayment: number; // الدفعة الأولى يدوي
    responsibleEmployee: string;
    followupDaysDuration?: number;
    notes?: string;
  }): TransferCase {
    const worker = this.getWorkerById(params.workerId);
    if (!worker) throw new Error('العاملة غير موجودة');

    // Rule 5: Only available workers can be reserved
    if (worker.operationalStatus !== 'متاحة لنقل الخدمات') {
      throw new Error(`لا يمكن حجز العاملة لأن حالتها الحالية: "${worker.operationalStatus}" وليست متاحة.`);
    }

    // Active accommodation case
    const activeAcc = this.accommodationCases.find(a => a.workerId === worker.id && a.caseStatus === 'نشطة بالسكن');

    const transferId = `trf-${Date.now()}`;
    const transferCode = `TRF-2026-${String(this.transferCases.length + 1).padStart(3, '0')}`;

    const newTransfer: TransferCase = {
      id: transferId,
      transferCode,
      workerId: worker.id,
      accommodationCaseId: activeAcc?.id || '',
      originalOfficeId: worker.originalOfficeId, // مكتب العاملة الأصلي
      executingOfficeId: params.executingOfficeId, // المكتب المنفذ
      newClientName: params.clientName,
      newClientNationalId: params.clientNationalId,
      newClientPhone: params.clientPhone,
      newClientCity: params.clientCity,
      responsibleEmployee: params.responsibleEmployee,
      selectionDate: new Date().toISOString().split('T')[0],
      reservationDate: new Date().toISOString().split('T')[0],
      transferStatus: 'محجوزة',
      transferFee: params.transferFee,
      downPayment: params.downPayment,
      remainingAmount: Math.max(0, params.transferFee - params.downPayment),
      paymentStatus: params.downPayment >= params.transferFee ? 'مسدد بالكامل' : (params.downPayment > 0 ? 'دفعة أولى' : 'معلق'),
      followupDaysDuration: params.followupDaysDuration || 5,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.transferCases.unshift(newTransfer);

    // Update Worker Status to locked (Rule 6: prevent double booking)
    worker.operationalStatus = 'محجوزة';
    worker.updatedAt = new Date().toISOString();

    // Log to Timeline
    this.addTimelineEvent({
      workerId: worker.id,
      transferCaseId: transferId,
      movementType: 'حجز لعميل',
      fromStatus: 'متاحة لنقل الخدمات',
      toStatus: 'محجوزة',
      actorEmployee: params.responsibleEmployee,
      officeId: params.executingOfficeId,
      description: `حجز العاملة للعميل ${params.clientName} بقيمة ${params.transferFee.toLocaleString()} ⃁ (منفذ بواسطة: ${params.executingOfficeId})`,
    });

    this.saveAll();

    triggerNotification({
      title: 'حجز عاملة لنقل الخدمات',
      body: `تم حجز العاملة ${worker.fullNameAr} للعميل ${params.clientName} بسعر ${params.transferFee} ⃁.`,
      type: 'sponsorship',
    });

    return newTransfer;
  }

  // RULE 8: Handover / Delivery to Client (Auto-starts countdown)
  public confirmWorkerDelivery(params: {
    transferCaseId: string;
    deliveryDateTime?: string;
    followupDaysDuration?: number;
    agreementRefNo?: string;
    actorEmployee: string;
  }): TransferCase {
    const transfer = this.transferCases.find(t => t.id === params.transferCaseId);
    if (!transfer) throw new Error('عملية النقل غير موجودة');

    const worker = this.getWorkerById(transfer.workerId);
    if (!worker) throw new Error('العاملة غير موجودة');

    const deliveryTime = params.deliveryDateTime || new Date().toISOString();
    const duration = params.followupDaysDuration || transfer.followupDaysDuration || 5;

    const endDate = new Date(new Date(deliveryTime).getTime() + duration * 86400000).toISOString().split('T')[0];

    transfer.deliveryDateTime = deliveryTime;
    transfer.followupDaysDuration = duration;
    transfer.followupEndDate = endDate;
    transfer.transferStatus = 'خرجت للعميل';
    transfer.clientDecision = 'قيد التجربة';
    if (params.agreementRefNo) transfer.agreementRefNo = params.agreementRefNo;
    transfer.updatedAt = new Date().toISOString();

    // Update worker state
    worker.operationalStatus = 'خرجت للعميل';
    worker.lastDispatchDate = deliveryTime;
    worker.updatedAt = new Date().toISOString();

    // Update accommodation state
    const acc = this.accommodationCases.find(a => a.id === transfer.accommodationCaseId);
    if (acc) {
      acc.exitDateTime = deliveryTime;
      acc.exitType = 'خروج لتجربة عميل';
      acc.caseStatus = 'مكتملة - خرجت';
    }

    // Log to Timeline
    this.addTimelineEvent({
      workerId: worker.id,
      transferCaseId: transfer.id,
      movementType: 'تسليم للعميل',
      fromStatus: 'محجوزة',
      toStatus: 'خرجت للعميل',
      actorEmployee: params.actorEmployee,
      officeId: transfer.executingOfficeId,
      description: `تسليم العاملة فعلياً للعميل ${transfer.newClientName} وبدء عداد المتابعة (${duration} أيام) حتى تاريخ ${endDate}`,
    });

    this.saveAll();

    triggerNotification({
      title: 'تسليم عاملة وبدء عداد التجربة',
      body: `خرجت العاملة ${worker.fullNameAr} للعميل ${transfer.newClientName}. مدة التجربة: ${duration} أيام.`,
      type: 'sponsorship',
    });

    return transfer;
  }

  // RULE 13: Record Daily Follow-up Contact
  public recordFollowUp(params: {
    transferCaseId: string;
    contactedPerson: string;
    contactChannel: 'اتصال هاتفي' | 'واتساب' | 'زيارة فرع';
    contactResult: ClientFollowUp['contactResult'];
    clientFeedback: string;
    requiredActionToday: string;
    nextContactDate?: string;
    actorEmployee: string;
  }): ClientFollowUp {
    const transfer = this.transferCases.find(t => t.id === params.transferCaseId);
    if (!transfer) throw new Error('عملية النقل غير موجودة');

    const { alertLevel } = this.calculateFollowupStatus(transfer);

    const newFollowUp: ClientFollowUp = {
      id: `fu-${Date.now()}`,
      transferCaseId: transfer.id,
      workerId: transfer.workerId,
      contactDateTime: new Date().toISOString(),
      contactedPerson: params.contactedPerson,
      contactChannel: params.contactChannel,
      employeeName: params.actorEmployee,
      contactResult: params.contactResult,
      clientFeedback: params.clientFeedback,
      requiredActionToday: params.requiredActionToday,
      nextContactDate: params.nextContactDate,
      alertLevel,
    };

    this.followUps.unshift(newFollowUp);

    // If client agreed, update decision
    if (params.contactResult === 'موافق تماماً على نقل الخدمات') {
      transfer.clientDecision = 'موافق على نقل الخدمات';
    } else if (params.contactResult === 'يرغب بإرجاع العاملة') {
      transfer.clientDecision = 'طلب إرجاع العاملة';
    }

    // Log to timeline
    this.addTimelineEvent({
      workerId: transfer.workerId,
      transferCaseId: transfer.id,
      movementType: 'تسجيل متابعة',
      actorEmployee: params.actorEmployee,
      officeId: transfer.executingOfficeId,
      description: `متابعة هاتفية مع العميل ${params.contactedPerson} - النتيجة: ${params.contactResult} | الملاحظات: ${params.clientFeedback}`,
    });

    this.saveAll();
    return newFollowUp;
  }

  // PATH A: Client Approval -> Government Sponsorship Transfer
  public approveAndCompleteTransfer(params: {
    transferCaseId: string;
    transferRequestDate?: string;
    govRefNo?: string;
    actorEmployee: string;
    markAsFullyCompleted?: boolean;
  }): TransferCase {
    const transfer = this.transferCases.find(t => t.id === params.transferCaseId);
    if (!transfer) throw new Error('عملية النقل غير موجودة');

    const worker = this.getWorkerById(transfer.workerId);
    if (!worker) throw new Error('العاملة غير موجودة');

    if (params.markAsFullyCompleted) {
      transfer.transferStatus = 'تم نقل الخدمات';
      transfer.transferCompletionDate = new Date().toISOString().split('T')[0];
      worker.operationalStatus = 'تم نقل الخدمات';

      this.addTimelineEvent({
        workerId: worker.id,
        transferCaseId: transfer.id,
        movementType: 'إتمام نقل الخدمات',
        fromStatus: 'بانتظار نقل الخدمات',
        toStatus: 'تم نقل الخدمات',
        actorEmployee: params.actorEmployee,
        officeId: transfer.executingOfficeId,
        description: `تم اكتمال نقل خدمات العاملة رسمياً للعميل ${transfer.newClientName} وإغلاق العملية بنجاح.`,
      });

      triggerNotification({
        title: 'إتمام نقل خدمات العاملة بنجاح',
        body: `تم نقل خدمات ${worker.fullNameAr} للعميل ${transfer.newClientName} نهائياً.`,
        type: 'sponsorship',
      });
    } else {
      transfer.transferStatus = 'بانتظار نقل الخدمات';
      transfer.transferRequestDate = params.transferRequestDate || new Date().toISOString().split('T')[0];
      transfer.transferRequestStatus = 'بانتظار قبول مساند';
      transfer.clientDecision = 'موافق على نقل الخدمات';
      worker.operationalStatus = 'بانتظار نقل الخدمات';

      this.addTimelineEvent({
        workerId: worker.id,
        transferCaseId: transfer.id,
        movementType: 'طلب نقل خدمات',
        fromStatus: 'خرجت للعميل',
        toStatus: 'بانتظار نقل الخدمات',
        actorEmployee: params.actorEmployee,
        officeId: transfer.executingOfficeId,
        description: `رفع طلب نقل الخدمات عبر منصة مساند/أبشر برقم مرجع: ${params.govRefNo || 'قيد المعالجة'}`,
      });
    }

    transfer.updatedAt = new Date().toISOString();
    worker.updatedAt = new Date().toISOString();

    this.saveAll();
    return transfer;
  }

  // PATH B: Client Disapproval / Return -> Return to Shelter & Settlement (RULE 10, 11)
  public returnWorkerToShelter(params: {
    transferCaseId: string;
    returnReason: string;
    actualTrialDays: number;
    deductionAmount: number;
    refundAmount: number;
    settlementStatus: 'تمت التسوية' | 'معلق' | 'نزاع';
    nextAction: 'متاحة لنقل الخدمات' | 'تحت التقييم' | 'مرحلة الترحيل';
    roomNumber?: string;
    bedNumber?: string;
    actorEmployee: string;
  }): TransferCase {
    const transfer = this.transferCases.find(t => t.id === params.transferCaseId);
    if (!transfer) throw new Error('عملية النقل غير موجودة');

    const worker = this.getWorkerById(transfer.workerId);
    if (!worker) throw new Error('العاملة غير موجودة');

    const nowIso = new Date().toISOString();

    // 1. Update transfer case (close it, but NEVER delete it - Rule 10)
    transfer.transferStatus = 'عادت من العميل';
    transfer.clientDecision = 'طلب إرجاع العاملة';
    transfer.returnDateTime = nowIso;
    transfer.returnReason = params.returnReason;
    transfer.actualTrialDays = params.actualTrialDays;
    transfer.deductionAmount = params.deductionAmount;
    transfer.refundAmount = params.refundAmount;
    transfer.settlementStatus = params.settlementStatus;
    transfer.paymentStatus = 'مسترد';
    transfer.updatedAt = nowIso;

    // 2. Rule 11: Increment client_trials_count on worker
    worker.clientTrialsCount = (worker.clientTrialsCount || 0) + 1;
    worker.operationalStatus = params.nextAction;
    worker.lastReturnDate = nowIso;
    worker.updatedAt = nowIso;

    // 3. Rule 2: Open a new Accommodation Case for her new stay!
    const newAccCase: AccommodationCase = {
      id: `acc-${Date.now()}`,
      caseCode: `ACC-2026-${String(this.accommodationCases.length + 1).padStart(3, '0')}`,
      workerId: worker.id,
      originalOfficeId: worker.originalOfficeId,
      entryDateTime: nowIso,
      entryReason: `إعادة من تجربة العميل ${transfer.newClientName} - السبب: ${params.returnReason}`,
      receivingEmployee: params.actorEmployee,
      receivedDocuments: ['أصل الجواز', 'الإقامة'],
      iqamaStatus: 'سارية',
      requiredAction: params.nextAction === 'متاحة لنقل الخدمات' ? 'إعادة عرض لنقل الخدمات' : 'تقييم ودراسة الحالة',
      responsibleEmployee: params.actorEmployee,
      priority: 'عادية',
      caseStatus: 'نشطة بالسكن',
      roomNumber: params.roomNumber,
      bedNumber: params.bedNumber,
      createdAt: nowIso,
    };
    this.accommodationCases.unshift(newAccCase);

    // 4. Log to timeline
    this.addTimelineEvent({
      workerId: worker.id,
      transferCaseId: transfer.id,
      accommodationCaseId: newAccCase.id,
      movementType: 'إرجاع للسكن',
      fromStatus: 'خرجت للعميل',
      toStatus: params.nextAction,
      actorEmployee: params.actorEmployee,
      officeId: transfer.executingOfficeId,
      description: `إرجاع العاملة للسكن بعد تجربة ${params.actualTrialDays} أيام لدى العميل ${transfer.newClientName}. سبب الإرجاع: ${params.returnReason}. عداد التجارب الآن: ${worker.clientTrialsCount}. تسوية المستحقات: خصم ${params.deductionAmount} ⃁ واسترداد ${params.refundAmount} ⃁ (${params.settlementStatus}).`,
    });

    this.saveAll();

    triggerNotification({
      title: 'إرجاع عاملة للسكن المشترك',
      body: `عادت العاملة ${worker.fullNameAr} من تجربة العميل ${transfer.newClientName}. عدد مرات الخروج: ${worker.clientTrialsCount}.`,
      type: 'warning',
    });

    return transfer;
  }

  // Update Worker Status / Evaluation
  public evaluateWorker(params: {
    workerId: string;
    newStatus: WorkerProfile['operationalStatus'];
    notes?: string;
    actorEmployee: string;
  }): WorkerProfile {
    const worker = this.getWorkerById(params.workerId);
    if (!worker) throw new Error('العاملة غير موجودة');

    const prevStatus = worker.operationalStatus;
    worker.operationalStatus = params.newStatus;
    if (params.notes) worker.notes = params.notes;
    worker.updatedAt = new Date().toISOString();

    this.addTimelineEvent({
      workerId: worker.id,
      movementType: 'تقييم أهلية',
      fromStatus: prevStatus,
      toStatus: params.newStatus,
      actorEmployee: params.actorEmployee,
      officeId: worker.originalOfficeId,
      description: `تغيير حالة العاملة إلى "${params.newStatus}" - الملاحظات: ${params.notes || 'لا يوجد'}`,
    });

    this.saveAll();
    return worker;
  }

  public createTransferCase(params: {
    workerId: string;
    executingOfficeId: GroupOfficeId;
    newClientName: string;
    newClientNationalId: string;
    newClientPhone: string;
    newClientCity: string;
    responsibleEmployee: string;
    transferFee: number;
    downPayment: number;
    followupDaysDuration?: number;
    deliveryDateTime?: string;
    notes?: string;
    accommodationCaseId?: string;
    originalOfficeId?: GroupOfficeId;
  }): { success: boolean; transferCase?: TransferCase; error?: string } {
    try {
      const trf = this.bookWorkerForTransfer({
        workerId: params.workerId,
        executingOfficeId: params.executingOfficeId,
        clientName: params.newClientName,
        clientNationalId: params.newClientNationalId,
        clientPhone: params.newClientPhone,
        clientCity: params.newClientCity,
        transferFee: params.transferFee,
        downPayment: params.downPayment,
        responsibleEmployee: params.responsibleEmployee,
        followupDaysDuration: params.followupDaysDuration,
        notes: params.notes,
      });

      if (params.deliveryDateTime) {
        this.confirmWorkerDelivery({
          transferCaseId: trf.id,
          deliveryDateTime: params.deliveryDateTime,
          followupDaysDuration: params.followupDaysDuration,
          actorEmployee: params.responsibleEmployee,
        });
      }

      return { success: true, transferCase: trf };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public addWorker(params: Partial<WorkerProfile>): { success: boolean; worker?: WorkerProfile; error?: string } {
    try {
      const nextNum = this.workers.length + 1001;
      const workerId = `w-${Date.now()}`;
      const workerCode = `WRK-${nextNum}`;
      const newWorker: WorkerProfile = {
        id: workerId,
        workerCode,
        originalOfficeId: params.originalOfficeId || 'SAF',
        fullNameAr: params.fullNameAr || 'عاملة منزلية',
        fullNameEn: params.fullNameEn || 'Domestic Worker',
        nationality: params.nationality || 'الفلبين',
        passportNumber: params.passportNumber || `P${Date.now()}`,
        iqamaNumber: params.iqamaNumber,
        birthDate: params.birthDate,
        age: params.age || 28,
        religion: params.religion,
        initialShelterEntryDate: new Date().toISOString().split('T')[0],
        initialEntryReason: params.initialEntryReason || 'استقدام جديد',
        operationalStatus: params.operationalStatus || 'متاحة لنقل الخدمات',
        requiredAction: 'نقل خدمات',
        requestedSalary: params.requestedSalary || 1500,
        experienceYears: params.experienceYears || 2,
        languages: params.languages || ['العربية'],
        skills: params.skills || ['تنظيف', 'غسيل'],
        photoUrl: params.photoUrl || '',
        documentsStatus: 'مكتملة',
        clientTrialsCount: params.clientTrialsCount || 0,
        responsibleEmployee: params.responsibleEmployee || 'مشرف الإيواء',
        notes: params.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.workers.unshift(newWorker);
      this.saveAll();
      return { success: true, worker: newWorker };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public createAccommodationCase(params: {
    workerId: string;
    originalOfficeId: GroupOfficeId;
    shelterBranch: string;
    intakeDateTime: string;
    intakeReason: string;
    assignedRoom?: string;
    assignedBed?: string;
    workWillingness?: 'ترغب بالعمل' | 'لا ترغب بالعمل' | 'مشروطة';
    medicalStatus?: string;
    luggageReceived?: boolean;
    notes?: string;
  }): { success: boolean; accommodationCase?: AccommodationCase; error?: string } {
    try {
      const accCase: AccommodationCase = {
        id: `acc-${Date.now()}`,
        caseCode: `ACC-2026-${String(this.accommodationCases.length + 1).padStart(3, '0')}`,
        workerId: params.workerId,
        originalOfficeId: params.originalOfficeId,
        entryDateTime: params.intakeDateTime,
        entryReason: params.intakeReason,
        receivingEmployee: 'مشرف الإيواء المناوب',
        receivedDocuments: ['أصل الجواز'],
        iqamaStatus: 'سارية',
        requiredAction: params.workWillingness === 'لا ترغب بالعمل' ? 'سفر / خروج نهائي' : 'نقل خدمات',
        responsibleEmployee: 'مشرف الإيواء',
        priority: 'عادية',
        caseStatus: 'نشطة بالسكن',
        roomNumber: params.assignedRoom,
        bedNumber: params.assignedBed,
        createdAt: new Date().toISOString(),
      };
      this.accommodationCases.unshift(accCase);
      const worker = this.getWorkerById(params.workerId);
      if (worker) {
        worker.operationalStatus = params.workWillingness === 'لا ترغب بالعمل' ? 'مرحلة الترحيل' : 'متاحة لنقل الخدمات';
        worker.updatedAt = new Date().toISOString();
      }
      this.addTimelineEvent({
        workerId: params.workerId,
        accommodationCaseId: accCase.id,
        movementType: 'دخول سكن',
        fromStatus: 'خارج المنظومة',
        toStatus: worker?.operationalStatus || 'داخل السكن',
        actorEmployee: 'مشرف الإيواء',
        officeId: params.originalOfficeId,
        description: `تسكين في ${params.shelterBranch} - غرفة: ${params.assignedRoom || '-'}، سبب الدخول: ${params.intakeReason}`,
      });
      this.saveAll();
      return { success: true, accommodationCase: accCase };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public recordFirstSponsor(params: {
    workerId: string;
    sponsorName: string;
    sponsorNationalId?: string;
    sponsorPhone?: string;
    originalContractRef?: string;
    reasonForReturn?: string;
    warrantyStatus?: string;
    financialClaimAmount?: number;
    settlementStatus?: string;
  }): { success: boolean; firstSponsor?: WorkerFirstSponsor; error?: string } {
    try {
      const fs: WorkerFirstSponsor = {
        id: `fs-${Date.now()}`,
        workerId: params.workerId,
        sponsorName: params.sponsorName,
        nationalIdOrIqama: params.sponsorNationalId || '',
        phoneNumber: params.sponsorPhone || '',
        city: 'الرياض',
        recruitmentOffice: 'مكتب المجموعة',
        contractRefNo: params.originalContractRef,
        returnDate: new Date().toISOString().split('T')[0],
        returnReason: params.reasonForReturn || 'تنازل كفيل أول',
        warrantyStatus: (params.warrantyStatus as any) || 'داخل الضمان (90 يوم)',
        hasClaim: (params.financialClaimAmount || 0) > 0,
        financialClaimAmount: params.financialClaimAmount || 0,
        settlementStatus: (params.settlementStatus as any) || 'معلق',
        previousRelationshipStatus: 'منتهية ودية',
      };
      this.firstSponsors.unshift(fs);
      this.saveAll();
      return { success: true, firstSponsor: fs };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }


  private addTimelineEvent(event: Omit<WorkerMovementTimeline, 'id' | 'eventDateTime'>) {
    const newEv: WorkerMovementTimeline = {
      ...event,
      id: `tm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      eventDateTime: new Date().toISOString(),
    };
    this.timeline.unshift(newEv);
  }
}

export const shelterTransferStore = new ShelterTransferStore();
export default shelterTransferStore;
