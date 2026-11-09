export interface KasEtmadCompetition {
  id: string;
  seq: number;
  title: string;
  referenceNumber: string;
  isWinner: 'Yes' | 'No';
  dueDate: string;
  deadlineDate: string;
  category: string;
  governmentEntity: string;
  createdAt: string;
  totalItemsValue: number;
  winningValue?: number;
  status: 'جديد' | 'تم رفع العرض الفني والمالي' | 'لم يتم التسعير(لاغي)' | 'تمت الترسية' | 'تحت الدراسة' | 'فحص العروض';
  notes?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface KasEtmadCategory {
  id: string;
  seq: number;
  name: string;
  code: string;
  description?: string;
  updatedAt: string;
}

export interface KasEtmadStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  active: boolean;
  phone?: string;
}

export interface KasEtmadInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  date: string;
  dueDate: string;
  clientName: string;
  project?: string;
  tags?: string[];
  status: 'غير مدفوع' | 'مدفوع' | 'مدفوع جزئيًا' | 'متأخر' | 'مسودة' | 'ملغي';
  paidAmount: number;
  items: { description: string; qty: number; rate: number; taxPct: number; total: number }[];
}

export interface KasEtmadEstimate {
  id: string;
  estimateNumber: string;
  totalAmount: number;
  taxAmount: number;
  date: string;
  expiryDate: string;
  clientName: string;
  project?: string;
  reference?: string;
  status: 'مسودة' | 'مرسل' | 'مقبول' | 'مرفوض' | 'منتهي الصلاحية';
  items: { description: string; qty: number; rate: number; taxPct: number; total: number }[];
}

export interface KasEtmadProposal {
  id: string;
  proposalNumber: string;
  subject: string;
  toClient: string;
  totalAmount: number;
  date: string;
  openTill: string;
  project?: string;
  tags?: string[];
  createdAt: string;
  status: 'مسودة' | 'مرسل' | 'مفتوح' | 'مُعدّل' | 'مقبول' | 'مرفوض';
  items: { description: string; qty: number; rate: number; taxPct: number; total: number }[];
}

export interface KasEtmadPayment {
  id: string;
  paymentNumber: string;
  invoiceNumber: string;
  paymentMode: 'تحويل بنكي' | 'سداد' | 'بطاقة مدى / ائتمان' | 'شيك مصدّق' | 'نقداً';
  transactionId: string;
  clientName: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface KasEtmadCreditNote {
  id: string;
  creditNoteNumber: string;
  clientName: string;
  date: string;
  status: 'مسودة' | 'مفتوح' | 'مغلق' | 'ملغي';
  project?: string;
  remainingAmount: number;
  totalAmount: number;
  invoiceRef?: string;
  items?: { description: string; qty: number; rate: number; taxPct: number; total: number }[];
}

export interface KasEtmadItem {
  id: string;
  description: string;
  longDescription?: string;
  rate: number;
  taxPct: number;
  unit: string;
  group: string;
}

export interface KasEtmadClient {
  id: string;
  company: string;
  primaryContact: string;
  email: string;
  phone: string;
  active: boolean;
  groups: string[];
  city: string;
  vatNumber: string;
  createdAt: string;
  address?: string;
}

export interface KasEtmadLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  opportunityValue: number;
  assignedTo: string;
  status: 'جديد' | 'تم التواصل' | 'مؤهل' | 'عرض سعر مرسل' | 'مغلق فائز' | 'مغلق خاسر';
  source: 'منصة اعتماد' | 'موقع إلكتروني' | 'توصية مباشرة' | 'معارض وفعاليات';
  lastContact: string;
}

export interface KasEtmadProject {
  id: string;
  projectName: string;
  clientName: string;
  tags: string[];
  startDate: string;
  deadline: string;
  members: string[];
  progress: number;
  status: 'قيد التقدم' | 'معلق' | 'ملغي' | 'مكتمل';
  budget: number;
}

export interface KasEtmadTask {
  id: string;
  taskName: string;
  status: 'لم تبدأ' | 'قيد التقدم' | 'قيد المراجعة' | 'مكتملة';
  startDate: string;
  dueDate: string;
  assignedTo: string;
  priority: 'منخفض' | 'متوسط' | 'مرتفع' | 'عاجل';
  project?: string;
  timeSpentHours?: number;
}

export interface KasEtmadContract {
  id: string;
  subject: string;
  clientName: string;
  contractType: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: 'ساري' | 'منتهي' | 'قيد التجديد' | 'ملغي';
}

export interface KasEtmadSubscription {
  id: string;
  subscriptionName: string;
  clientName: string;
  billingInterval: 'شهري' | 'ربع سنوي' | 'نصف سنوي' | 'سنوي';
  amount: number;
  status: 'نشط' | 'متوقف' | 'ملغي';
  startDate: string;
  nextBillingDate: string;
}

export interface KasEtmadExpense {
  id: string;
  category: string;
  amount: number;
  taxAmount: number;
  expenseName: string;
  receiptFile?: string;
  date: string;
  clientName?: string;
  project?: string;
  paymentMode: string;
}

export interface KasEtmadTicket {
  id: string;
  subject: string;
  department: string;
  service: string;
  contact: string;
  status: 'مفتوحة' | 'قيد المتابعة' | 'بانتظار رد العميل' | 'مغلقة';
  priority: 'منخفض' | 'متوسط' | 'مرتفع' | 'حرج';
  lastReply: string;
}

export interface KasEtmadKnowledgeArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  publishedDate: string;
  viewsCount: number;
}

export interface KasEtmadEstimateRequest {
  id: string;
  requestNumber: string;
  clientName: string;
  description: string;
  requestedDate: string;
  status: 'جديد' | 'قيد المراجعة' | 'تم التحويل لعرض سعر' | 'مرفوض';
  convertedEstimateId?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface KasEtmadEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'فاتورة' | 'عرض سعر' | 'عرض' | 'متابعة' | 'ترحيب' | 'إشعار دفع';
  variables: string[];
  lastModified: string;
}

export type EtmadModuleTab = 
  | 'dashboard'
  | 'competitions'
  | 'estimates'
  | 'invoices'
  | 'payments'
  | 'credit-notes'
  | 'proposals'
  | 'items'
  | 'clients'
  | 'leads'
  | 'projects'
  | 'tasks'
  | 'contracts'
  | 'subscriptions'
  | 'expenses'
  | 'tickets'
  | 'knowledge-base'
  | 'estimate-requests'
  | 'email-templates'
  | 'utilities'
  | 'calendar'
  | 'reports'
  | 'staff'
  | 'settings';
