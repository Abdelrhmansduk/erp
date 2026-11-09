import * as XLSX from 'xlsx';
import { journalEngine } from './accounting/journalEngine';
import {
  KasEtmadCompetition,
  KasEtmadCategory,
  KasEtmadStaff,
  KasEtmadInvoice,
  KasEtmadEstimate,
  KasEtmadPayment,
  KasEtmadCreditNote,
  KasEtmadItem,
  KasEtmadClient,
  KasEtmadLead,
  KasEtmadProject,
  KasEtmadTask,
  KasEtmadContract,
  KasEtmadSubscription,
  KasEtmadExpense,
  KasEtmadTicket,
  KasEtmadKnowledgeArticle,
  KasEtmadProposal,
  KasEtmadEstimateRequest,
  KasEtmadEmailTemplate
} from '../types/kasEtmadSuite';

const STORAGE_KEY = 'kas_etmad_suite_data_v3';

export const INITIAL_CATEGORIES: KasEtmadCategory[] = [
  { id: 'cat-1', seq: 1, name: 'المعارض والمؤتمرات', code: '9987', description: 'تنظيم وتجهيز المعارض والفعاليات', updatedAt: '2026-03-03 14:05:17' },
  { id: 'cat-2', seq: 2, name: 'دعاية وإعلان', code: '8899', description: 'الهويات البصرية والحملات الإعلامية واللوحات', updatedAt: '2026-03-03 14:04:16' },
  { id: 'cat-3', seq: 3, name: 'التعليم والتدريب', code: '06', description: 'الحقائب التدريبية ومستلزمات المعاهد', updatedAt: '2025-11-13 09:56:20' },
  { id: 'cat-4', seq: 4, name: 'العقارات والأراضي', code: '05', description: 'التطوير العقاري والمرافق', updatedAt: '2025-11-13 09:55:56' },
  { id: 'cat-5', seq: 5, name: 'التشغيل والصيانة والنظافة للمنشآت', code: '04', description: 'الصيانة الوقائية وخدمات المرافق', updatedAt: '2025-11-13 09:55:42' },
  { id: 'cat-6', seq: 6, name: 'المقاولات', code: '3', description: 'أعمال الإنشاءات والترميم والتشطيب', updatedAt: '2025-11-13 09:55:19' },
  { id: 'cat-7', seq: 7, name: 'التجارة', code: '02', description: 'التوريدات العامة والأغذية والتمور والضيافة', updatedAt: '2025-11-13 09:55:13' },
  { id: 'cat-8', seq: 8, name: 'قطاع الاتصالات وتقنية المعلومات', code: '01', description: 'الأنظمة البرمجية، الأجهزة، والشبكات', updatedAt: '2025-11-13 09:54:17' },
];

export const INITIAL_STAFF: KasEtmadStaff[] = [
  { id: 'st-1', name: 'Ahmed Gamal', email: 'mr.ahmed.elbashir@gmail.com', role: 'Employee / مدير العمليات', lastLogin: 'الآن', active: true, phone: '0554166722' },
  { id: 'st-2', name: 'خالد عبدالعزيز السليم', email: 'khaled@alsulaim.sa', role: 'Super_Admin / رئيس مجلس الإدارة', lastLogin: 'منذ يوم', active: true, phone: '0508987888' },
  { id: 'st-3', name: 'Mohammed Khaled', email: 'accmohamedkhaled1996@gmail.com', role: 'المحاسب المالي المعتمد', lastLogin: 'منذ 3 ساعات', active: true, phone: '0550001122' },
  { id: 'st-4', name: 'abdallah mohamed', email: 'abdallahobya@gmail.com', role: 'Super_Admin', lastLogin: 'منذ يومين', active: true },
  { id: 'st-5', name: 'abdulfattah farahat', email: 'abdulfattahft@gmail.com', role: 'Super_Admin', lastLogin: 'منذ أسبوع', active: true },
  { id: 'st-6', name: 'omar ahmad', email: 'omar@asd.com', role: 'مسؤول دراسة المنافسات', lastLogin: 'منذ يومين', active: true }
];

export const INITIAL_COMPETITIONS: KasEtmadCompetition[] = [
  {
    id: 'comp-1', seq: 35,
    title: 'مشروع تركيب خيام هرمية لزوم ميدان العرض بقيادة لواء الخليفة عمر بن الخطاب بوزارة الحرس الوطني بالقطاع الغربي (الطائف)',
    referenceNumber: '260339001923', isWinner: 'No', dueDate: '2026-03-02', deadlineDate: '2026-03-04',
    category: 'التجارة', governmentEntity: 'وزارة الحرس الوطني - القطاع الغربي', createdAt: '2026-03-01',
    totalItemsValue: 86500.00, status: 'تم رفع العرض الفني والمالي',
    notes: 'تم تقديم العينات والملف الفني المعتمد', contactName: 'م. أحمد البشير', contactPhone: '0554166722',
  },
  {
    id: 'comp-2', seq: 36,
    title: 'T.MA( 5778 )Heavy Duty Stainless Steel 2 Tier Catering Trolley',
    referenceNumber: '260339004112', isWinner: 'No', dueDate: '2026-03-02', deadlineDate: '2026-03-04',
    category: 'التجارة', governmentEntity: 'تجمع الشرقية الصحي', createdAt: '2026-03-01',
    totalItemsValue: 42300.00, status: 'لم يتم التسعير(لاغي)',
    notes: 'عدم توفر الاستوك لدى الوكيل', contactName: 'سلطان الحربي', contactPhone: '0138503977',
  },
  {
    id: 'comp-3', seq: 37,
    title: 'توريد مستلزمات صناعية لمستشفى الملك سلمان التخصصي للشؤون الصحية بوزارة الحرس الوطني بالطائف T.MA( 8014 )',
    referenceNumber: '260339007812', isWinner: 'Yes', dueDate: '2026-03-02', deadlineDate: '2026-03-04',
    category: 'التجارة', governmentEntity: 'الشؤون الصحية بالحرس الوطني - الطائف', createdAt: '2026-03-01',
    totalItemsValue: 124800.00, winningValue: 124800.00, status: 'تمت الترسية',
    notes: 'تم استلام التعميد وتوقيع محضر التوريد', contactName: 'فيصل السليم', contactPhone: '0500000000',
  },
  {
    id: 'comp-4', seq: 38,
    title: 'توريد وتركيب وتنفيذ أعمال إنارات (إضاءات) لمداخل مستشفى الملك سلمان التخصصي في الطائف التابع للشؤون الصحية بوزارة الحرس الوطني',
    referenceNumber: '260339008941', isWinner: 'No', dueDate: '2026-03-02', deadlineDate: '2026-03-04',
    category: 'التجارة', governmentEntity: 'الشؤون الصحية بالحرس الوطني', createdAt: '2026-03-01',
    totalItemsValue: 97500.00, status: 'تم رفع العرض الفني والمالي',
    notes: 'بانتظار اعتماد التقييم الفني', contactName: 'عبدالرحمن الشهري', contactPhone: '0553630676',
  },
  {
    id: 'comp-5', seq: 40,
    title: 'طلب حصول شهادة إعتماد آيزو للسلامة والصحة المهنية وتطوير الإجراءات',
    referenceNumber: '260339011245', isWinner: 'No', dueDate: '2026-03-05', deadlineDate: '2026-03-05',
    category: 'دعاية وإعلان', governmentEntity: 'مستشفى قوى الأمن بالدمام', createdAt: '2026-03-01',
    totalItemsValue: 55000.00, status: 'جديد',
    notes: 'قيد إعداد العرض المالي والفني', contactName: 'مازن الغامدي', contactPhone: '0118027838',
  },
  {
    id: 'comp-6', seq: 43,
    title: 'احتفالات عيد الفطر المبارك لعام 2026م وتجهيز مقرات الضيافة الفاخرة',
    referenceNumber: '260339014522', isWinner: 'Yes', dueDate: '2026-03-05', deadlineDate: '2026-03-05',
    category: 'التجارة', governmentEntity: 'أمانة منطقة الرياض', createdAt: '2026-03-01',
    totalItemsValue: 185000.00, winningValue: 185000.00, status: 'تمت الترسية',
    notes: 'ترسية كاملة وتوريد بوكسات الضيافة والتمور الملكية', contactName: 'خالد عبدالعزيز السليم', contactPhone: '0508987888',
  }
];

export const INITIAL_INVOICES: KasEtmadInvoice[] = [
  {
    id: 'inv-1', invoiceNumber: 'INV-000001', amount: 106006.00, taxAmount: 13566.00,
    date: '2026-02-10', dueDate: '2026-03-10', clientName: 'مؤسسة خالد السليم للتجارة (كاس)',
    project: 'مشروع توريدات اليوم الوطني 96', tags: ['توريدات حكومية', 'ZATCA مرحلة 2'],
    status: 'مدفوع جزئيًا', paidAmount: 50000.00,
    items: [
      { description: 'بوكسات توزيعات فاخرة مخصصة', qty: 500, rate: 120, taxPct: 15, total: 69000.00 },
      { description: 'تمور سكري ملكي فاخر مغلف', qty: 200, rate: 185, taxPct: 15, total: 42550.00 }
    ]
  },
  {
    id: 'inv-2', invoiceNumber: 'INV-000002', amount: 575.00, taxAmount: 75.00,
    date: '2026-02-16', dueDate: '2026-03-18', clientName: 'مؤسسة اللمسة الخارقة للاتصالات',
    project: 'تأمين مستلزمات حاسب آلي', tags: ['تقنية'], status: 'غير مدفوع', paidAmount: 0.00,
    items: [{ description: 'صيانة وتوريد ملحقات شبكية', qty: 1, rate: 500, taxPct: 15, total: 575.00 }]
  },
  {
    id: 'inv-3', invoiceNumber: 'INV-000003', amount: 94760.00, taxAmount: 12360.00,
    date: '2026-02-20', dueDate: '2026-03-20', clientName: 'قوات الطوارئ الخاصة',
    project: 'تجهيز استوديو فوتوغرافي متكامل', tags: ['معارض وتجهيزات'], status: 'مدفوع', paidAmount: 94760.00,
    items: [{ description: 'تجهيز معدات استوديو فوتوغرافي متكامل', qty: 1, rate: 82400, taxPct: 15, total: 94760.00 }]
  }
];

export const INITIAL_ESTIMATES: KasEtmadEstimate[] = [
  {
    id: 'est-1', estimateNumber: 'EST-000001', totalAmount: 98842.50, taxAmount: 12892.50,
    date: '2026-02-15', expiryDate: '2026-04-15', clientName: 'أمارة منطقة الجوف',
    project: 'تأمين ذبائح وضيافة الإمارة', reference: 'REF-JOUF-2026', status: 'مقبول',
    items: [{ description: 'تأمين ذبائح نعيمي فاخر وضيافة متكاملة', qty: 85, rate: 1000, taxPct: 15, total: 97750.00 }]
  },
  {
    id: 'est-2', estimateNumber: 'EST-000002', totalAmount: 85617.50, taxAmount: 11167.50,
    date: '2026-02-18', expiryDate: '2026-04-18', clientName: 'الشؤون الصحية بالحرس الوطني',
    project: 'استئجار خيمة وديكورات تراثية ليوم التأسيس', reference: 'REF-MNGHA-HERITAGE', status: 'مرسل',
    items: [{ description: 'خيمة ملكية وديكورات تراثية وعرضة نجدية', qty: 1, rate: 74450, taxPct: 15, total: 85617.50 }]
  }
];

export const INITIAL_PROPOSALS: KasEtmadProposal[] = [
  {
    id: 'prop-1', proposalNumber: 'PROP-000001', subject: 'عرض تنظيم وتجهيز معرض الأسبوع الثقافي السعودي',
    toClient: 'وزارة الثقافة', totalAmount: 320000.00, date: '2026-08-10', openTill: '2026-09-10',
    project: 'معرض الأسبوع الثقافي', tags: ['معارض', 'ثقافة'], createdAt: '2026-08-10',
    status: 'مرسل',
    items: [
      { description: 'تصميم وتنفيذ بوثات عرض تراثية', qty: 15, rate: 8000, taxPct: 15, total: 138000.00 },
      { description: 'تجهيز إضاءة ونظام صوت', qty: 1, rate: 45000, taxPct: 15, total: 51750.00 },
      { description: 'ضيافة VIP وتمور ملكية', qty: 500, rate: 200, taxPct: 15, total: 115000.00 }
    ]
  }
];

export const INITIAL_CREDIT_NOTES: KasEtmadCreditNote[] = [
  {
    id: 'cn-1', creditNoteNumber: 'CN-000001', clientName: 'مؤسسة خالد السليم للتجارة (كاس)',
    date: '2026-03-01', status: 'مفتوح', project: 'مشروع توريدات اليوم الوطني 96',
    remainingAmount: 5000.00, totalAmount: 5000.00, invoiceRef: 'INV-000001',
    items: [{ description: 'إرجاع بوكسات تالفة عند التسليم', qty: 10, rate: 120, taxPct: 15, total: 1380.00 }]
  }
];

export const INITIAL_SUBSCRIPTIONS: KasEtmadSubscription[] = [
  {
    id: 'sub-1', subscriptionName: 'اشتراك صيانة دورية - أنظمة الإنارة',
    clientName: 'الشؤون الصحية بالحرس الوطني', billingInterval: 'ربع سنوي',
    amount: 15000.00, status: 'نشط', startDate: '2026-01-01', nextBillingDate: '2026-10-01'
  },
  {
    id: 'sub-2', subscriptionName: 'توريد شهري - مستلزمات ضيافة ومكتبية',
    clientName: 'مؤسسة خالد السليم للتجارة (كاس)', billingInterval: 'شهري',
    amount: 8500.00, status: 'نشط', startDate: '2026-06-01', nextBillingDate: '2026-09-01'
  }
];

export const INITIAL_ESTIMATE_REQUESTS: KasEtmadEstimateRequest[] = [
  {
    id: 'ereq-1', requestNumber: 'EREQ-000001', clientName: 'أمانة منطقة مكة المكرمة',
    description: 'طلب عرض سعر لتوريد وتركيب أعمدة إنارة ديكورية للحدائق العامة',
    requestedDate: '2026-08-28', status: 'جديد', contactEmail: 'procurement@makkah.gov.sa', contactPhone: '0125574000'
  }
];

export const INITIAL_EMAIL_TEMPLATES: KasEtmadEmailTemplate[] = [
  {
    id: 'eml-1', name: 'تأكيد فاتورة جديدة', subject: 'فاتورة جديدة #{invoice_number} - شركة كاس',
    body: 'عزيزي {client_name}،\n\nنرفق لكم الفاتورة رقم {invoice_number} بقيمة {amount} ⃁ شاملة الضريبة.\n\nيرجى السداد خلال {due_days} يوم.\n\nمع تحيات فريق كاس للتجارة والمقاولات',
    category: 'فاتورة', variables: ['{client_name}', '{invoice_number}', '{amount}', '{due_days}'], lastModified: '2026-08-01'
  },
  {
    id: 'eml-2', name: 'إشعار استلام دفعة', subject: 'تأكيد استلام الدفعة - كاس',
    body: 'عزيزي {client_name}،\n\nنؤكد استلام دفعتكم بمبلغ {amount} ⃁ بتاريخ {date}.\n\nرقم المعاملة: {transaction_id}\n\nشكراً لثقتكم.',
    category: 'إشعار دفع', variables: ['{client_name}', '{amount}', '{date}', '{transaction_id}'], lastModified: '2026-08-01'
  },
  {
    id: 'eml-3', name: 'متابعة عرض سعر', subject: 'متابعة عرض السعر #{estimate_number}',
    body: 'عزيزي {client_name}،\n\nنود الاطمئنان على عرض السعر رقم {estimate_number} المرسل بتاريخ {date}.\n\nنحن على أتم الاستعداد لأي استفسار.\n\nتحياتنا',
    category: 'متابعة', variables: ['{client_name}', '{estimate_number}', '{date}'], lastModified: '2026-08-15'
  },
  {
    id: 'eml-4', name: 'ترحيب بعميل جديد', subject: 'مرحباً بكم في كاس للتجارة والمقاولات',
    body: 'عزيزي {client_name}،\n\nيسعدنا انضمامكم كعميل معتمد لدى مؤسسة كاس للتجارة والمقاولات.\n\nنتطلع لشراكة مثمرة.\n\nمع أطيب التحيات',
    category: 'ترحيب', variables: ['{client_name}'], lastModified: '2026-07-01'
  }
];

export const INITIAL_PAYMENTS: KasEtmadPayment[] = [
  {
    id: 'pay-1', paymentNumber: 'PAY-000001', invoiceNumber: 'INV-000001', paymentMode: 'تحويل بنكي',
    transactionId: 'TXN-99882211', clientName: 'مؤسسة خالد السليم للتجارة (كاس)', amount: 50000.00,
    date: '2026-02-15', notes: 'دفعة أولى 50% بموجب محضر التوريد الجزئي'
  },
  {
    id: 'pay-2', paymentNumber: 'PAY-000002', invoiceNumber: 'INV-000003', paymentMode: 'سداد',
    transactionId: 'SADAD-774411', clientName: 'قوات الطوارئ الخاصة', amount: 94760.00,
    date: '2026-02-25', notes: 'سداد كامل مستحقات الاستوديو الفوتوغرافي'
  }
];

export const INITIAL_ITEMS: KasEtmadItem[] = [
  { id: 'item-1', description: 'تمر سكري ملكي فاخر منتقى ومغلف', longDescription: 'كرتون 3 كجم عبوات فاخرة مفرغة من الهواء ومختومة', rate: 185.00, taxPct: 15, unit: 'كرتون', group: 'ضيافة وتمور' },
  { id: 'item-2', description: 'بوكس إهداء وطني فاخر مخصص بشعار الجهة', longDescription: 'يتضمن مبخرة سيراميك، عود مروكي فاخر، وشاح مطرز، وبطاقة إهداء', rate: 120.00, taxPct: 15, unit: 'بوكس', group: 'توريدات حكومية' },
  { id: 'item-3', description: 'طقم كنب وجلسة ملكية لكبار الشخصيات VIP', longDescription: 'تأجير وتنظيم لمدة يومين شامل التوصيل والتركيب والتنظيف', rate: 4500.00, taxPct: 15, unit: 'طقم', group: 'ديكور ومعارض' },
  { id: 'item-4', description: 'مضخة مياه غاطسة 1.5 حصان ستانلس ستيل إيطالي', longDescription: 'مطابقة للمواصفات القياسية السعودية SASO مع الضمان سنتين', rate: 1450.00, taxPct: 15, unit: 'عدد', group: 'أجهزة وتقنية' }
];

export const INITIAL_CLIENTS: KasEtmadClient[] = [
  { id: 'client-1', company: 'مؤسسة خالد السليم للتجارة (كاس)', primaryContact: 'خالد عبدالعزيز السليم', email: 'info@kas.com.sa', phone: '0508987888', active: true, groups: ['المجموعة الرئيسية', 'توريدات حكومية'], city: 'الرياض', vatNumber: '310245879600003', address: 'شارع التخصصي - مبنى كاس التجاري', createdAt: '2025-01-01' },
  { id: 'client-2', company: 'وزارة الحرس الوطني - الشؤون الصحية', primaryContact: 'م. فهد الزهراني', email: 'purchasing@ngha.med.sa', phone: '0114912222', active: true, groups: ['جهات حكومية', 'صحة'], city: 'الرياض', vatNumber: '300000000000003', address: 'مدينة الملك عبدالعزيز الطبية', createdAt: '2025-02-15' },
  { id: 'client-3', company: 'تجمع الشرقية الصحي', primaryContact: 'عبدالرحمن العماني', email: 'alalomani@moh.gov.sa', phone: '0138503977', active: true, groups: ['تجمعات صحية', 'توريدات طبية'], city: 'الدمام', vatNumber: '300000000000004', address: 'البرج الطبي بالدمام', createdAt: '2025-03-10' },
  { id: 'client-4', company: 'الهيئة العامة للموانئ - ميناء جدة الإسلامي', primaryContact: 'عبدالله الشهري', email: 'jip-info@ports.gov.sa', phone: '0126270000', active: true, groups: ['موانئ ولوجستيات', 'فعاليات وطنية'], city: 'جدة', vatNumber: '300000000000005', address: 'ميناء جدة الإسلامي - إدارة المشتريات', createdAt: '2025-05-20' }
];

export const INITIAL_CONTRACTS: KasEtmadContract[] = [
  { id: 'cnt-1', subject: 'اتفاقية توريد وتشغيل مستلزمات الضيافة والفعاليات الوطنية', clientName: 'مؤسسة خالد السليم للتجارة (كاس)', contractType: 'توريد بضائع', contractValue: 250000.00, startDate: '2026-01-01', endDate: '2026-12-31', status: 'ساري' },
  { id: 'cnt-2', subject: 'عقد صيانة وتوريد أنظمة الإنارة والمضخات الغاطسة', clientName: 'الشؤون الصحية بالحرس الوطني', contractType: 'تشغيل وتنظيم', contractValue: 124800.00, startDate: '2026-03-01', endDate: '2027-02-28', status: 'ساري' }
];

export const INITIAL_EXPENSES: KasEtmadExpense[] = [
  { id: 'exp-1', category: 'مصاريف مشتريات', amount: 32000.00, taxAmount: 4800.00, expenseName: 'شراء مواد تغليف وبوكسات إهداء مصنعية', receiptFile: 'receipt_box_factory.pdf', date: '2026-02-18', clientName: 'أمانة منطقة الرياض', project: 'مشروع احتفالات العيد', paymentMode: 'تحويل بنكي' },
  { id: 'exp-2', category: 'نقل وشحن', amount: 4500.00, taxAmount: 675.00, expenseName: 'نقل ديانات وتوصيل الطائف والدمام', receiptFile: 'shipping_bill_882.pdf', date: '2026-02-24', project: 'توريدات مستشفى الملك سلمان بالطائف', paymentMode: 'مدى' }
];

export const INITIAL_TICKETS: KasEtmadTicket[] = [
  { id: 'tkt-1', subject: 'طلب اعتماد عينات التمور والبوكسات الملكية لمراسم الحرس الوطني', department: 'المنافسات والترسيات', service: 'خدمة التوريدات المعتمدة', contact: 'خالد عبدالعزيز السليم', status: 'مفتوحة', priority: 'مرتفع', lastReply: '2026-08-30 11:38:00' },
  { id: 'tkt-2', subject: 'مراجعة وتحديث الشهادة الضريبية ZATCA لمنافسات الشرقية', department: 'المالية والفوترة', service: 'الربط الضريبي والامتثال', contact: 'م. أحمد البشير', status: 'بانتظار رد العميل', priority: 'متوسط', lastReply: '2026-08-29 14:15:00' }
];

export const INITIAL_KNOWLEDGE: KasEtmadKnowledgeArticle[] = [
  { id: 'art-1', title: 'دليل تقديم العروض الفنية والمالية على منصة اعتماد 2026', category: 'أنظمة المنافسات', summary: 'شرح الخطوات المعتمدة لإرفاق جداول الكميات والضمانات البنكية والعينات وتجنب الاستبعاد الفني.', content: 'المنافسات الحكومية تتطلب التزاماً دقيقاً بجدول الكميات والتفقيط الصحيح بالريال السعودي والهلالات، وتقديم الضمان البنكي الابتدائي بنسبة 1-2% عند الحاجة.', publishedDate: '2026-01-15', viewsCount: 1420 },
  { id: 'art-2', title: 'ضوابط الفوترة الإلكترونية ZATCA المرحلة الثانية لشركة كاس', category: 'المالية والضرائب', summary: 'متطلبات رمز الاستجابة السريعة QR المشفر وتضمين الرقم المرجعي والرمز التعريفي للمنشأة.', content: 'يجب أن تحتوي كل فاتورة ضريبية على التفاصيل الكاملة للأصناف، نسبة الضريبة 15%، وقيمة الضريبة منفصلة مع التفقيط الكامل لكافة المبالغ.', publishedDate: '2026-02-01', viewsCount: 980 }
];

export const INITIAL_LEADS: KasEtmadLead[] = [
  { id: 'lead-1', name: 'سعود القحطاني', company: 'هيئة تطوير بوابة الدرعية', email: 's.qahtani@dgda.gov.sa', phone: '0551122334', opportunityValue: 450000.00, assignedTo: 'م. أحمد البشير', status: 'عرض سعر مرسل', source: 'منصة اعتماد', lastContact: '2026-08-25' },
  { id: 'lead-2', name: 'ماجد الشمري', company: 'أمانة منطقة القصيم', email: 'm.shammari@qassim.gov.sa', phone: '0544332211', opportunityValue: 220000.00, assignedTo: 'فيصل السليم', status: 'مؤهل', source: 'معارض وفعاليات', lastContact: '2026-08-28' }
];

export const INITIAL_PROJECTS: KasEtmadProject[] = [
  { id: 'proj-1', projectName: 'مشروع توريدات احتفالات اليوم الوطني 96 لميناء جدة', clientName: 'الهيئة العامة للموانئ', tags: ['فعاليات', 'توريدات', 'كاس'], startDate: '2026-08-15', deadline: '2026-09-22', members: ['أحمد البشير', 'فيصل السليم', 'عبدالرحمن الشهري'], progress: 85, status: 'قيد التقدم', budget: 95018.75 },
  { id: 'proj-2', projectName: 'توريد وتركيب أثاث مكتبي لمركز التدريب الأمني', clientName: 'وزارة الداخلية - الديوان العام', tags: ['أثاث', 'توريدات حكومية'], startDate: '2026-07-01', deadline: '2026-08-30', members: ['سلطان الحربي', 'مازن الغامدي'], progress: 100, status: 'مكتمل', budget: 200169.00 }
];

export const INITIAL_TASKS: KasEtmadTask[] = [
  { id: 'task-1', taskName: 'إدارة مشتريات الدمام – توريد مضخات غاطسة بمستشفى الامام عبدالرحمن بالدمام', status: 'قيد التقدم', startDate: '2026-08-25', dueDate: '2026-09-05', assignedTo: 'محمد خالد', priority: 'عاجل', project: 'مشروع توريدات الحرس الوطني', timeSpentHours: 14.5 },
  { id: 'task-2', taskName: 'تسليم عينات التمور والبوكسات الملكية لإدارة المراسم والضيافة', status: 'مكتملة', startDate: '2026-08-20', dueDate: '2026-08-28', assignedTo: 'أحمد البشير', priority: 'مرتفع', project: 'مشروع توريدات اليوم الوطني 96', timeSpentHours: 8.0 },
  { id: 'task-3', taskName: 'مراجعة وتدقيق جدول الكميات لمنافسة أمانة الرياض', status: 'قيد المراجعة', startDate: '2026-08-29', dueDate: '2026-09-02', assignedTo: 'فيصل السليم', priority: 'مرتفع', timeSpentHours: 4.0 }
];

class KasEtmadSuiteService {
  private competitions: KasEtmadCompetition[] = [];
  private categories: KasEtmadCategory[] = [];
  private staff: KasEtmadStaff[] = [];
  private invoices: KasEtmadInvoice[] = [];
  private estimates: KasEtmadEstimate[] = [];
  private payments: KasEtmadPayment[] = [];
  private creditNotes: KasEtmadCreditNote[] = [];
  private items: KasEtmadItem[] = [];
  private clients: KasEtmadClient[] = [];
  private leads: KasEtmadLead[] = [];
  private projects: KasEtmadProject[] = [];
  private tasks: KasEtmadTask[] = [];
  private contracts: KasEtmadContract[] = [];
  private subscriptions: KasEtmadSubscription[] = [];
  private expenses: KasEtmadExpense[] = [];
  private tickets: KasEtmadTicket[] = [];
  private knowledgeArticles: KasEtmadKnowledgeArticle[] = [];
  private proposals: KasEtmadProposal[] = [];
  private estimateRequests: KasEtmadEstimateRequest[] = [];
  private emailTemplates: KasEtmadEmailTemplate[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.competitions = parsed.competitions || INITIAL_COMPETITIONS;
        this.categories = parsed.categories || INITIAL_CATEGORIES;
        this.staff = parsed.staff || INITIAL_STAFF;
        this.invoices = parsed.invoices || INITIAL_INVOICES;
        this.estimates = parsed.estimates || INITIAL_ESTIMATES;
        this.payments = parsed.payments || INITIAL_PAYMENTS;
        this.items = parsed.items || INITIAL_ITEMS;
        this.clients = parsed.clients || INITIAL_CLIENTS;
        this.contracts = parsed.contracts || INITIAL_CONTRACTS;
        this.expenses = parsed.expenses || INITIAL_EXPENSES;
        this.tickets = parsed.tickets || INITIAL_TICKETS;
        this.knowledgeArticles = parsed.knowledgeArticles || INITIAL_KNOWLEDGE;
        this.leads = parsed.leads || INITIAL_LEADS;
        this.projects = parsed.projects || INITIAL_PROJECTS;
        this.tasks = parsed.tasks || INITIAL_TASKS;
        this.creditNotes = parsed.creditNotes || INITIAL_CREDIT_NOTES;
        this.subscriptions = parsed.subscriptions || INITIAL_SUBSCRIPTIONS;
        this.proposals = parsed.proposals || INITIAL_PROPOSALS;
        this.estimateRequests = parsed.estimateRequests || INITIAL_ESTIMATE_REQUESTS;
        this.emailTemplates = parsed.emailTemplates || INITIAL_EMAIL_TEMPLATES;
        return;
      }
    } catch {}

    this.competitions = INITIAL_COMPETITIONS;
    this.categories = INITIAL_CATEGORIES;
    this.staff = INITIAL_STAFF;
    this.invoices = INITIAL_INVOICES;
    this.estimates = INITIAL_ESTIMATES;
    this.payments = INITIAL_PAYMENTS;
    this.items = INITIAL_ITEMS;
    this.clients = INITIAL_CLIENTS;
    this.contracts = INITIAL_CONTRACTS;
    this.expenses = INITIAL_EXPENSES;
    this.tickets = INITIAL_TICKETS;
    this.knowledgeArticles = INITIAL_KNOWLEDGE;
    this.leads = INITIAL_LEADS;
    this.projects = INITIAL_PROJECTS;
    this.tasks = INITIAL_TASKS;
    this.creditNotes = INITIAL_CREDIT_NOTES;
    this.subscriptions = INITIAL_SUBSCRIPTIONS;
    this.proposals = INITIAL_PROPOSALS;
    this.estimateRequests = INITIAL_ESTIMATE_REQUESTS;
    this.emailTemplates = INITIAL_EMAIL_TEMPLATES;
  }

  private saveToStorage() {
    try {
      const data = {
        competitions: this.competitions, categories: this.categories, staff: this.staff,
        invoices: this.invoices, estimates: this.estimates, payments: this.payments,
        creditNotes: this.creditNotes, items: this.items, clients: this.clients,
        leads: this.leads, projects: this.projects, tasks: this.tasks,
        contracts: this.contracts, subscriptions: this.subscriptions, expenses: this.expenses,
        tickets: this.tickets, knowledgeArticles: this.knowledgeArticles,
        proposals: this.proposals, estimateRequests: this.estimateRequests,
        emailTemplates: this.emailTemplates
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage quota reached', e);
    }
  }

  // Getters
  public getCompetitions(): KasEtmadCompetition[] { return this.competitions; }
  public getCategories(): KasEtmadCategory[] { return this.categories; }
  public getStaff(): KasEtmadStaff[] { return this.staff; }
  public getInvoices(): KasEtmadInvoice[] { return this.invoices; }
  public getEstimates(): KasEtmadEstimate[] { return this.estimates; }
  public getPayments(): KasEtmadPayment[] { return this.payments; }
  public getCreditNotes(): KasEtmadCreditNote[] { return this.creditNotes; }
  public getItems(): KasEtmadItem[] { return this.items; }
  public getClients(): KasEtmadClient[] { return this.clients; }
  public getLeads(): KasEtmadLead[] { return this.leads; }
  public getProjects(): KasEtmadProject[] { return this.projects; }
  public getTasks(): KasEtmadTask[] { return this.tasks; }
  public getContracts(): KasEtmadContract[] { return this.contracts; }
  public getSubscriptions(): KasEtmadSubscription[] { return this.subscriptions; }
  public getExpenses(): KasEtmadExpense[] { return this.expenses; }
  public getTickets(): KasEtmadTicket[] { return this.tickets; }
  public getKnowledgeArticles(): KasEtmadKnowledgeArticle[] { return this.knowledgeArticles; }
  public getProposals(): KasEtmadProposal[] { return this.proposals; }
  public getEstimateRequests(): KasEtmadEstimateRequest[] { return this.estimateRequests; }
  public getEmailTemplates(): KasEtmadEmailTemplate[] { return this.emailTemplates; }

  // Competitions CRUD
  public addCompetition(item: Omit<KasEtmadCompetition, 'id' | 'seq'>): KasEtmadCompetition {
    const newItem: KasEtmadCompetition = { ...item, id: `comp-${Date.now()}`, seq: this.competitions.length + 1 };
    this.competitions.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateCompetition(id: string, updates: Partial<KasEtmadCompetition>): boolean {
    const idx = this.competitions.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.competitions[idx] = { ...this.competitions[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteCompetition(id: string): boolean {
    const idx = this.competitions.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.competitions.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Categories CRUD
  public addCategory(cat: { name: string; code: string; description?: string }): KasEtmadCategory {
    const newCat: KasEtmadCategory = { id: `cat-${Date.now()}`, seq: this.categories.length + 1, name: cat.name, code: cat.code, description: cat.description || '', updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) };
    this.categories.push(newCat); this.saveToStorage(); return newCat;
  }
  public updateCategory(id: string, updates: Partial<KasEtmadCategory>): boolean {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.categories[idx] = { ...this.categories[idx], ...updates, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) };
    this.saveToStorage(); return true;
  }
  public deleteCategory(id: string): boolean {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.categories.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Staff CRUD
  public addStaff(s: { name: string; email: string; role: string; phone?: string }): KasEtmadStaff {
    const newStaff: KasEtmadStaff = { id: `st-${Date.now()}`, name: s.name, email: s.email, role: s.role, lastLogin: 'Never', active: true, phone: s.phone };
    this.staff.push(newStaff); this.saveToStorage(); return newStaff;
  }
  public updateStaff(id: string, updates: Partial<KasEtmadStaff>): boolean {
    const idx = this.staff.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.staff[idx] = { ...this.staff[idx], ...updates };
    this.saveToStorage(); return true;
  }
  public deleteStaff(id: string): boolean {
    const idx = this.staff.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.staff.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Invoices CRUD
  public addInvoice(item: Omit<KasEtmadInvoice, 'id'>): KasEtmadInvoice {
    const newItem: KasEtmadInvoice = { ...item, id: `inv-${Date.now()}` };
    this.invoices.unshift(newItem);
    this.saveToStorage();
    try {
      journalEngine.autoPostOperationalTransaction({
        companyId: '3',
        transactionType: 'SALES_INVOICE_ISSUED',
        referenceId: newItem.invoiceNumber,
        partyName: newItem.clientName,
        amount: newItem.amount - (newItem.taxAmount || 0),
        taxAmount: newItem.taxAmount || 0,
        costCenterName: newItem.project || 'مشاريع كاس للتوريدات والمنافسات',
        description: `فاتورة مبيعات وتوريدات كاس (${newItem.invoiceNumber}) — ${newItem.clientName}`,
        createdBy: 'نظام كاس للمنافسات (Etmad)',
      });
    } catch (err) {
      console.warn('[kasEtmadSuiteService] Auto-post skipped (period locked or validation warning):', err);
    }
    return newItem;
  }
  public updateInvoice(id: string, updates: Partial<KasEtmadInvoice>): boolean {
    const idx = this.invoices.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.invoices[idx] = { ...this.invoices[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteInvoice(id: string): boolean {
    const idx = this.invoices.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.invoices.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Estimates CRUD
  public addEstimate(item: Omit<KasEtmadEstimate, 'id'>): KasEtmadEstimate {
    const newItem: KasEtmadEstimate = { ...item, id: `est-${Date.now()}` };
    this.estimates.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateEstimate(id: string, updates: Partial<KasEtmadEstimate>): boolean {
    const idx = this.estimates.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.estimates[idx] = { ...this.estimates[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteEstimate(id: string): boolean {
    const idx = this.estimates.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.estimates.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Proposals CRUD
  public addProposal(item: Omit<KasEtmadProposal, 'id'>): KasEtmadProposal {
    const newItem: KasEtmadProposal = { ...item, id: `prop-${Date.now()}` };
    this.proposals.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateProposal(id: string, updates: Partial<KasEtmadProposal>): boolean {
    const idx = this.proposals.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.proposals[idx] = { ...this.proposals[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteProposal(id: string): boolean {
    const idx = this.proposals.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.proposals.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Credit Notes CRUD
  public addCreditNote(item: Omit<KasEtmadCreditNote, 'id'>): KasEtmadCreditNote {
    const newItem: KasEtmadCreditNote = { ...item, id: `cn-${Date.now()}` };
    this.creditNotes.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateCreditNote(id: string, updates: Partial<KasEtmadCreditNote>): boolean {
    const idx = this.creditNotes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.creditNotes[idx] = { ...this.creditNotes[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteCreditNote(id: string): boolean {
    const idx = this.creditNotes.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.creditNotes.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Subscriptions CRUD
  public addSubscription(item: Omit<KasEtmadSubscription, 'id'>): KasEtmadSubscription {
    const newItem: KasEtmadSubscription = { ...item, id: `sub-${Date.now()}` };
    this.subscriptions.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateSubscription(id: string, updates: Partial<KasEtmadSubscription>): boolean {
    const idx = this.subscriptions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.subscriptions[idx] = { ...this.subscriptions[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteSubscription(id: string): boolean {
    const idx = this.subscriptions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.subscriptions.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Estimate Requests CRUD
  public addEstimateRequest(item: Omit<KasEtmadEstimateRequest, 'id'>): KasEtmadEstimateRequest {
    const newItem: KasEtmadEstimateRequest = { ...item, id: `ereq-${Date.now()}` };
    this.estimateRequests.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateEstimateRequest(id: string, updates: Partial<KasEtmadEstimateRequest>): boolean {
    const idx = this.estimateRequests.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.estimateRequests[idx] = { ...this.estimateRequests[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteEstimateRequest(id: string): boolean {
    const idx = this.estimateRequests.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.estimateRequests.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Knowledge Articles CRUD
  public addKnowledgeArticle(item: Omit<KasEtmadKnowledgeArticle, 'id' | 'viewsCount'>): KasEtmadKnowledgeArticle {
    const newItem: KasEtmadKnowledgeArticle = { ...item, id: `kb-${Date.now()}`, viewsCount: 1 };
    this.knowledgeArticles.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public deleteKnowledgeArticle(id: string): boolean {
    const idx = this.knowledgeArticles.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.knowledgeArticles.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Email Templates CRUD
  public addEmailTemplate(item: Omit<KasEtmadEmailTemplate, 'id'>): KasEtmadEmailTemplate {
    const newItem: KasEtmadEmailTemplate = { ...item, id: `eml-${Date.now()}` };
    this.emailTemplates.push(newItem); this.saveToStorage(); return newItem;
  }
  public updateEmailTemplate(id: string, updates: Partial<KasEtmadEmailTemplate>): boolean {
    const idx = this.emailTemplates.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.emailTemplates[idx] = { ...this.emailTemplates[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteEmailTemplate(id: string): boolean {
    const idx = this.emailTemplates.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.emailTemplates.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Payments CRUD
  public addPayment(item: Omit<KasEtmadPayment, 'id'>): KasEtmadPayment {
    const newItem: KasEtmadPayment = { ...item, id: `pay-${Date.now()}` };
    this.payments.unshift(newItem);
    this.saveToStorage();
    try {
      journalEngine.autoPostOperationalTransaction({
        companyId: '3',
        transactionType: 'RECEIPT_VOUCHER',
        referenceId: newItem.paymentNumber,
        partyName: newItem.clientName,
        amount: newItem.amount,
        paymentMethod: 'BANK',
        description: `تحصيل دفعة فاتورة كاس (${newItem.invoiceNumber}) — ${newItem.clientName}`,
        createdBy: 'نظام كاس للمنافسات (Etmad)',
      });
    } catch (err) {
      console.warn('[kasEtmadSuiteService] Auto-post skipped (period locked or validation warning):', err);
    }
    return newItem;
  }

  // Items CRUD
  public addItem(item: Omit<KasEtmadItem, 'id'>): KasEtmadItem {
    const newItem: KasEtmadItem = { ...item, id: `itm-${Date.now()}` };
    this.items.unshift(newItem); this.saveToStorage(); return newItem;
  }

  // Contracts CRUD
  public addContract(item: Omit<KasEtmadContract, 'id'>): KasEtmadContract {
    const newItem: KasEtmadContract = { ...item, id: `cnt-${Date.now()}` };
    this.contracts.unshift(newItem); this.saveToStorage(); return newItem;
  }

  // Expenses CRUD
  public addExpense(item: Omit<KasEtmadExpense, 'id'>): KasEtmadExpense {
    const newItem: KasEtmadExpense = { ...item, id: `exp-${Date.now()}` };
    this.expenses.unshift(newItem);
    this.saveToStorage();
    try {
      journalEngine.autoPostOperationalTransaction({
        companyId: '3',
        transactionType: 'COST_CENTER_EXPENSE',
        referenceId: newItem.id,
        partyName: newItem.expenseName,
        amount: newItem.amount,
        taxAmount: newItem.taxAmount || 0,
        costCenterName: newItem.project || newItem.category,
        description: `مصروف مشروع كاس (${newItem.category}) — ${newItem.expenseName}`,
        createdBy: 'نظام كاس للمنافسات (Etmad)',
      });
    } catch (err) {
      console.warn('[kasEtmadSuiteService] Auto-post skipped (period locked or validation warning):', err);
    }
    return newItem;
  }

  // Tickets CRUD
  public addTicket(item: Omit<KasEtmadTicket, 'id'>): KasEtmadTicket {
    const newItem: KasEtmadTicket = { ...item, id: `tkt-${Date.now()}` };
    this.tickets.unshift(newItem); this.saveToStorage(); return newItem;
  }

  // Clients CRUD
  public addClient(item: Omit<KasEtmadClient, 'id'>): KasEtmadClient {
    const newItem: KasEtmadClient = { ...item, id: `client-${Date.now()}` };
    this.clients.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateClient(id: string, updates: Partial<KasEtmadClient>): boolean {
    const idx = this.clients.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.clients[idx] = { ...this.clients[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteClient(id: string): boolean {
    const idx = this.clients.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.clients.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Tasks CRUD
  public addTask(item: Omit<KasEtmadTask, 'id'>): KasEtmadTask {
    const newItem: KasEtmadTask = { ...item, id: `task-${Date.now()}` };
    this.tasks.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateTask(id: string, updates: Partial<KasEtmadTask>): boolean {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks[idx] = { ...this.tasks[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteTask(id: string): boolean {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Projects CRUD
  public addProject(item: Omit<KasEtmadProject, 'id'>): KasEtmadProject {
    const newItem: KasEtmadProject = { ...item, id: `proj-${Date.now()}` };
    this.projects.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateProject(id: string, updates: Partial<KasEtmadProject>): boolean {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.projects[idx] = { ...this.projects[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteProject(id: string): boolean {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.projects.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Leads CRUD
  public addLead(item: Omit<KasEtmadLead, 'id'>): KasEtmadLead {
    const newItem: KasEtmadLead = { ...item, id: `lead-${Date.now()}` };
    this.leads.unshift(newItem); this.saveToStorage(); return newItem;
  }
  public updateLead(id: string, updates: Partial<KasEtmadLead>): boolean {
    const idx = this.leads.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.leads[idx] = { ...this.leads[idx], ...updates }; this.saveToStorage(); return true;
  }
  public deleteLead(id: string): boolean {
    const idx = this.leads.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.leads.splice(idx, 1); this.saveToStorage(); return true;
  }

  // Dashboard Aggregated KPIs
  public getDashboardStats() {
    const totalInvoicesAmount = this.invoices.reduce((sum, i) => sum + i.amount, 0);
    const unpaidAmount = this.invoices.filter(i => i.status === 'غير مدفوع' || i.status === 'متأخر').reduce((sum, i) => sum + i.amount, 0);
    const paidAmount = this.invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalExpenses = this.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalContracts = this.contracts.reduce((sum, c) => sum + c.contractValue, 0);
    const totalCompetitions = this.competitions.length;
    const wonCompetitions = this.competitions.filter(c => c.isWinner === 'Yes' || c.status === 'تمت الترسية').length;
    const activeTasks = this.tasks.filter(t => t.status !== 'مكتملة').length;
    const activeProjects = this.projects.filter(p => p.status === 'قيد التقدم').length;
    const totalLeadsValue = this.leads.reduce((sum, l) => sum + l.opportunityValue, 0);
    const totalSubscriptionsRevenue = this.subscriptions.filter(s => s.status === 'نشط').reduce((sum, s) => sum + s.amount, 0);
    const openTickets = this.tickets.filter(t => t.status !== 'مغلقة').length;
    const totalProposalsValue = this.proposals.reduce((sum, p) => sum + p.totalAmount, 0);
    const pendingCreditNotes = this.creditNotes.filter(cn => cn.status === 'مفتوح').reduce((sum, cn) => sum + cn.remainingAmount, 0);

    return {
      totalInvoicesAmount, unpaidAmount, paidAmount, totalExpenses, totalContracts,
      totalCompetitions, wonCompetitions,
      winRate: totalCompetitions > 0 ? Math.round((wonCompetitions / totalCompetitions) * 100) : 0,
      activeTasks, activeProjects, totalLeadsValue,
      totalClients: this.clients.length, totalStaff: this.staff.length,
      totalCategories: this.categories.length,
      totalSubscriptionsRevenue, openTickets, totalProposalsValue, pendingCreditNotes
    };
  }

  // Export to Excel
  public exportCompetitionsToXLSX() {
    const headers = ['#', 'اسم المنافسة', 'هل هو فائز؟', 'تاريخ الاستحقاق', 'الموعد النهائي', 'تصنيف', 'الجهة الحكومية', 'تاريخ الإنشاء', 'إجمالي البنود', 'الحالة'];
    const rows = this.competitions.map(c => [c.seq, c.title, c.isWinner, c.dueDate, c.deadlineDate, c.category, c.governmentEntity, c.createdAt, c.totalItemsValue, c.status]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!sheetViews'] = [{ rightToLeft: true }];
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 8, 18) }));
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'المنافسات');
    XLSX.writeFile(wb, `KAS_Competitions_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  public exportInvoicesToXLSX() {
    const headers = ['رقم الفاتورة', 'المبلغ', 'إجمالي الضريبة', 'التاريخ', 'العميل', 'المشروع', 'تاريخ الاستحقاق', 'الحالة', 'المدفوع'];
    const rows = this.invoices.map(i => [i.invoiceNumber, i.amount, i.taxAmount, i.date, i.clientName, i.project || '', i.dueDate, i.status, i.paidAmount]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!sheetViews'] = [{ rightToLeft: true }];
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 8, 18) }));
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
    XLSX.writeFile(wb, `KAS_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  public exportProposalsToXLSX() {
    const headers = ['رقم العرض', 'الموضوع', 'العميل', 'الإجمالي', 'التاريخ', 'مفتوح حتى', 'المشروع', 'الحالة'];
    const rows = this.proposals.map(p => [p.proposalNumber, p.subject, p.toClient, p.totalAmount, p.date, p.openTill, p.project || '', p.status]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!sheetViews'] = [{ rightToLeft: true }];
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 8, 18) }));
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'العروض');
    XLSX.writeFile(wb, `KAS_Proposals_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}

export const kasEtmadSuiteService = new KasEtmadSuiteService();
