import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Plus, FileSpreadsheet, FileText, Search, Printer, 
  Trash2, Edit3, CheckCircle2, AlertCircle, TrendingUp, DollarSign,
  Download, Eye, Calculator, ArrowRightLeft, Sparkles, Layers, 
  ShieldCheck, X, RefreshCw, Landmark, Tag, Check, Award, BarChart3,
  Users, Star, MapPin, Phone, Mail, PieChart, Activity, Copy,
  Upload, FileUp, QrCode, Percent, ArrowUpRight, Shield, CheckSquare,
  Clock, Hash, Filter, Calendar, FolderSync, CreditCard, ChevronDown,
  Briefcase, Send, HelpCircle, FileCheck, CheckCircle, Flame, ExternalLink,
  MessageSquare, UserPlus, FilePlus, Play, Square, Settings, MoreVertical,
  ChevronRight, ChevronLeft, Receipt, BookOpen, AlertTriangle, CheckCheck,
  UserCheck, ShieldAlert, ArrowDownRight, Share2, FolderKanban, LayoutGrid, List
} from 'lucide-react';
import { 
  KasEtmadCompetition, KasEtmadInvoice, KasEtmadEstimate, 
  KasEtmadPayment, KasEtmadItem, KasEtmadClient, KasEtmadLead, 
  KasEtmadProject, KasEtmadTask, KasEtmadContract, KasEtmadExpense,
  KasEtmadTicket, KasEtmadKnowledgeArticle, KasEtmadCategory,
  KasEtmadStaff, KasEtmadProposal, KasEtmadSubscription, KasEtmadCreditNote,
  KasEtmadEstimateRequest, KasEtmadEmailTemplate, EtmadModuleTab
} from '../types/kasEtmadSuite';
import { kasEtmadSuiteService } from '../services/kasEtmadSuiteService';
import { useAppStore } from '../stores/appStore';
import { useCompany } from '../contexts/CompanyContext';
import { KasKpiCard, KasInvoiceCard } from '../components/kas/KasCards';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { tafqeet } from '../services/tafqeetService';

export const KasEtimadCloudPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const { activeCompany } = useCompany();

  // Active Module Tab
  const [activeTab, setActiveTab] = useState<EtmadModuleTab>('dashboard');
  const [invoicesViewMode, setInvoicesViewMode] = useState<'cards' | 'table'>('cards');
  const [competitionsViewMode, setCompetitionsViewMode] = useState<'cards' | 'table'>('table');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [itemGroupFilter, setItemGroupFilter] = useState<string>('all');

  // Live Timer State
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  // Modals state
  const [showAddCompModal, setShowAddCompModal] = useState<boolean>(false);
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState<boolean>(false);
  const [showAddEstimateModal, setShowAddEstimateModal] = useState<boolean>(false);
  const [showAddProposalModal, setShowAddProposalModal] = useState<boolean>(false);
  const [showAddCreditNoteModal, setShowAddCreditNoteModal] = useState<boolean>(false);
  const [showAddSubscriptionModal, setShowAddSubscriptionModal] = useState<boolean>(false);
  const [showAddEstimateRequestModal, setShowAddEstimateRequestModal] = useState<boolean>(false);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState<boolean>(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState<boolean>(false);
  const [showAddContractModal, setShowAddContractModal] = useState<boolean>(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [showAddTicketModal, setShowAddTicketModal] = useState<boolean>(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [showAddArticleModal, setShowAddArticleModal] = useState<boolean>(false);

  // Client 360 Modal
  const [selectedClientProfile, setSelectedClientProfile] = useState<KasEtmadClient | null>(null);
  const [clientProfileTab, setClientProfileTab] = useState<'info' | 'invoices' | 'estimates' | 'contracts' | 'projects'>('info');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState<number>(7); // 0-indexed: 7 is August 2026
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'competitions' | 'invoices' | 'tasks' | 'contracts'>('all');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(30);

  // Reports State
  const [reportsTimeframe, setReportsTimeframe] = useState<'ytd' | 'q3' | 'q2' | 'q1' | 'month'>('ytd');

  // Quick Payment Modal
  const [showQuickPayModal, setShowQuickPayModal] = useState<boolean>(false);
  const [quickPayInvoice, setQuickPayInvoice] = useState<KasEtmadInvoice | null>(null);

  // Detail / Print Preview Modal
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState<'competition' | 'invoice' | 'estimate' | 'contract' | 'payment'>('competition');

  // Dynamic Item Lines for Invoice / Estimate Modal
  const [itemLines, setItemLines] = useState<Array<{ description: string; qty: number; rate: number; taxPct: number; total: number }>>([
    { description: 'بند توريد معتمد', qty: 1, rate: 1000, taxPct: 15, total: 1150 }
  ]);

  // Form State
  const [formData, setFormData] = useState<any>({});

  // Search & Edit states for sub-tabs
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<KasEtmadCategory | null>(null);
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [editingStaff, setEditingStaff] = useState<KasEtmadStaff | null>(null);

  // Reload trigger
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Data lists from Service
  const competitions = useMemo(() => kasEtmadSuiteService.getCompetitions(), [reloadKey]);
  const categories = useMemo(() => kasEtmadSuiteService.getCategories(), [reloadKey]);
  const staff = useMemo(() => kasEtmadSuiteService.getStaff(), [reloadKey]);
  const invoices = useMemo(() => kasEtmadSuiteService.getInvoices(), [reloadKey]);
  const estimates = useMemo(() => kasEtmadSuiteService.getEstimates(), [reloadKey]);
  const payments = useMemo(() => kasEtmadSuiteService.getPayments(), [reloadKey]);
  const items = useMemo(() => kasEtmadSuiteService.getItems(), [reloadKey]);
  const clients = useMemo(() => kasEtmadSuiteService.getClients(), [reloadKey]);
  const leads = useMemo(() => kasEtmadSuiteService.getLeads(), [reloadKey]);
  const projects = useMemo(() => kasEtmadSuiteService.getProjects(), [reloadKey]);
  const tasks = useMemo(() => kasEtmadSuiteService.getTasks(), [reloadKey]);
  const contracts = useMemo(() => kasEtmadSuiteService.getContracts(), [reloadKey]);
  const expenses = useMemo(() => kasEtmadSuiteService.getExpenses(), [reloadKey]);
  const tickets = useMemo(() => kasEtmadSuiteService.getTickets(), [reloadKey]);
  const knowledge = useMemo(() => kasEtmadSuiteService.getKnowledgeArticles(), [reloadKey]);
  const proposals = useMemo(() => kasEtmadSuiteService.getProposals(), [reloadKey]);
  const creditNotes = useMemo(() => kasEtmadSuiteService.getCreditNotes(), [reloadKey]);
  const subscriptions = useMemo(() => kasEtmadSuiteService.getSubscriptions(), [reloadKey]);
  const estimateRequests = useMemo(() => kasEtmadSuiteService.getEstimateRequests(), [reloadKey]);
  const emailTemplates = useMemo(() => kasEtmadSuiteService.getEmailTemplates(), [reloadKey]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase().trim();
    return categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, categorySearch]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    if (!staffSearch.trim()) return staff;
    const q = staffSearch.toLowerCase().trim();
    return staff.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q))
    );
  }, [staff, staffSearch]);
  const stats = useMemo(() => kasEtmadSuiteService.getDashboardStats(), [reloadKey]);

  // Filtered Competitions
  const filteredCompetitions = useMemo(() => {
    return competitions.filter(c => {
      const matchSearch = !searchQuery || 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.referenceNumber.includes(searchQuery) ||
        c.governmentEntity.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || c.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [competitions, searchQuery, statusFilter, categoryFilter]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const matchSearch = !searchQuery || 
        it.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.longDescription && it.longDescription.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGroup = itemGroupFilter === 'all' || it.group === itemGroupFilter;
      return matchSearch && matchGroup;
    });
  }, [items, searchQuery, itemGroupFilter]);

  // Save Handlers
  const handleSaveCompetition = () => {
    if (!formData.title || !formData.title.trim()) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم المنافسة.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addCompetition({
      title: formData.title,
      referenceNumber: formData.referenceNumber || `2603${Math.floor(10000000 + Math.random() * 90000000)}`,
      isWinner: formData.isWinner || 'No',
      dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
      deadlineDate: formData.deadlineDate || new Date().toISOString().split('T')[0],
      category: formData.category || 'التجارة',
      governmentEntity: formData.governmentEntity || 'وزارة الحرس الوطني',
      createdAt: new Date().toISOString().split('T')[0],
      totalItemsValue: parseFloat(formData.totalItemsValue) || 0,
      status: formData.status || 'جديد',
      notes: formData.notes || '',
      contactName: formData.contactName || '',
      contactPhone: formData.contactPhone || ''
    });
    addNotification({
      title: 'تمت إضافة المنافسة بنجاح',
      message: `تم تسجيل منافسة "${formData.title}" في منظومة اعتماد كاس بنجاح.`,
      type: 'success'
    });
    setShowAddCompModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveInvoice = () => {
    if (!formData.clientName) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى تحديد العميل.',
        type: 'warning'
      });
      return;
    }
    const subtotal = itemLines.reduce((s, it) => s + (it.qty * it.rate), 0);
    const taxAmount = Number((subtotal * 0.15).toFixed(2));
    const totalWithTax = Number((subtotal + taxAmount).toFixed(2));

    kasEtmadSuiteService.addInvoice({
      invoiceNumber: `INV-${String(invoices.length + 1).padStart(6, '0')}`,
      amount: subtotal,
      taxAmount,
      date: formData.date || new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
      clientName: formData.clientName,
      project: formData.project || '',
      tags: ['كاس للتجارة', 'ZATCA مرحلة 2'],
      status: formData.status || 'غير مدفوع',
      paidAmount: parseFloat(formData.paidAmount) || 0,
      items: itemLines
    });
    addNotification({
      title: 'تم إنشاء الفاتورة',
      message: `تم إصدار الفاتورة للعميل ${formData.clientName} بقيمة ${totalWithTax.toLocaleString()} ⃁ شاملة الضريبة.`,
      type: 'success'
    });
    setShowAddInvoiceModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveEstimate = () => {
    if (!formData.clientName) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم العميل.',
        type: 'warning'
      });
      return;
    }
    const subtotal = itemLines.reduce((s, it) => s + (it.qty * it.rate), 0);
    const taxAmount = Number((subtotal * 0.15).toFixed(2));

    kasEtmadSuiteService.addEstimate({
      estimateNumber: `EST-${String(estimates.length + 1).padStart(6, '0')}`,
      totalAmount: subtotal,
      taxAmount,
      date: formData.date || new Date().toISOString().split('T')[0],
      expiryDate: formData.expiryDate || new Date().toISOString().split('T')[0],
      clientName: formData.clientName,
      project: formData.project || '',
      reference: formData.reference || 'REF-KAS',
      status: formData.status || 'مسودة',
      items: itemLines
    });
    addNotification({
      title: 'تم حفظ عرض السعر',
      message: 'تم تسجيل عرض السعر في منظومة كاس.',
      type: 'success'
    });
    setShowAddEstimateModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleConvertEstimateToInvoice = (est: KasEtmadEstimate) => {
    kasEtmadSuiteService.addInvoice({
      invoiceNumber: `INV-${String(invoices.length + 1).padStart(6, '0')}`,
      amount: est.totalAmount,
      taxAmount: est.taxAmount,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      clientName: est.clientName,
      project: est.project || 'مشروع محول من عرض سعر',
      tags: ['محول من عرض سعر', 'ZATCA مرحلة 2'],
      status: 'غير مدفوع',
      paidAmount: 0,
      items: est.items
    });
    kasEtmadSuiteService.updateEstimate(est.id, { status: 'مقبول' });
    addNotification({
      title: 'تم تحويل عرض السعر إلى فاتورة',
      message: `تم تحويل ${est.estimateNumber} بنجاح إلى فاتورة ضريبية رسمية.`,
      type: 'success'
    });
    setReloadKey(k => k + 1);
  };

  const handleSavePayment = () => {
    if (!formData.invoiceNumber || !formData.amount) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى تحديد رقم الفاتورة والمبلغ.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addPayment({
      paymentNumber: `PAY-${String(payments.length + 1).padStart(6, '0')}`,
      invoiceNumber: formData.invoiceNumber,
      paymentMode: formData.paymentMode || 'تحويل بنكي',
      transactionId: formData.transactionId || `TXN-${Date.now()}`,
      clientName: formData.clientName || 'عميل كاس',
      amount: parseFloat(formData.amount) || 0,
      date: formData.date || new Date().toISOString().split('T')[0],
      notes: formData.notes || ''
    });
    addNotification({
      title: 'تم تسجيل الدفعة',
      message: 'تم قيد سند القبض البنكي بنجاح.',
      type: 'success'
    });
    setShowAddPaymentModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveItem = () => {
    if (!formData.description || !formData.rate) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال وصف البند وسعره.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addItem({
      description: formData.description,
      longDescription: formData.longDescription || '',
      rate: parseFloat(formData.rate) || 0,
      taxPct: 15,
      unit: formData.unit || 'عدد',
      group: formData.group || 'توريدات حكومية'
    });
    setShowAddItemModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveClient = () => {
    if (!formData.company || !formData.phone) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم الشركة ورقم الهاتف.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addClient({
      company: formData.company,
      primaryContact: formData.primaryContact || 'المسؤول التجاري',
      email: formData.email || 'info@client.sa',
      phone: formData.phone,
      active: true,
      groups: ['جهات حكومية'],
      city: formData.city || 'الرياض',
      vatNumber: formData.vatNumber || '300000000000003',
      address: formData.address || '',
      createdAt: new Date().toISOString().split('T')[0]
    });
    setShowAddClientModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveLead = () => {
    if (!formData.leadName || !formData.company) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم المسؤول والجهة.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addLead({
      name: formData.leadName,
      company: formData.company,
      email: formData.email || '',
      phone: formData.phone || '',
      opportunityValue: parseFloat(formData.opportunityValue) || 0,
      assignedTo: formData.assignedTo || 'م. أحمد البشير',
      status: formData.status || 'جديد',
      source: formData.source || 'منصة اعتماد',
      lastContact: new Date().toISOString().split('T')[0]
    });
    setShowAddLeadModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveProject = () => {
    if (!formData.projectName || !formData.clientName) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم المشروع والجهة.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addProject({
      projectName: formData.projectName,
      clientName: formData.clientName,
      tags: ['كاس للتجارة', 'توريدات'],
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      members: ['م. أحمد البشير', 'خالد السليم'],
      progress: 0,
      status: 'قيد التقدم',
      budget: parseFloat(formData.budget) || 0
    });
    setShowAddProjectModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveTask = () => {
    if (!formData.taskName || !formData.assignedTo) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال عنوان المهمة والمسؤول.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addTask({
      taskName: formData.taskName,
      status: formData.status || 'قيد التقدم',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
      assignedTo: formData.assignedTo,
      priority: formData.priority || 'متوسط',
      project: formData.project,
      timeSpentHours: 0
    });
    setShowAddTaskModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveContract = () => {
    if (!formData.subject || !formData.clientName) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال موضوع العقد والعميل.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addContract({
      subject: formData.subject,
      clientName: formData.clientName,
      contractType: formData.contractType || 'توريد بضائع',
      contractValue: parseFloat(formData.contractValue) || 0,
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || new Date().toISOString().split('T')[0],
      status: formData.status || 'ساري'
    });
    setShowAddContractModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveExpense = () => {
    if (!formData.expenseName || !formData.amount) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم المصروف والمبلغ.',
        type: 'warning'
      });
      return;
    }
    const amount = parseFloat(formData.amount) || 0;
    kasEtmadSuiteService.addExpense({
      category: formData.category || 'مصاريف مشتريات',
      amount,
      taxAmount: Number((amount * 0.15).toFixed(2)),
      expenseName: formData.expenseName,
      date: formData.date || new Date().toISOString().split('T')[0],
      clientName: formData.clientName,
      project: formData.project,
      paymentMode: formData.paymentMode || 'تحويل بنكي'
    });
    setShowAddExpenseModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveTicket = () => {
    if (!formData.subject || !formData.department) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال موضوع التذكرة والقسم.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addTicket({
      subject: formData.subject,
      department: formData.department,
      service: formData.service || 'خدمة عامة',
      contact: formData.contact || 'م. أحمد البشير',
      status: 'مفتوحة',
      priority: formData.priority || 'متوسط',
      lastReply: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    addNotification({
      title: 'تم إنشاء تذكرة الدعم',
      message: `تم تسجيل التذكرة (${formData.subject}) وتوجيهها لقسم (${formData.department}).`,
      type: 'success'
    });
    setShowAddTicketModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveCategory = () => {
    if (!formData.catName || !formData.catCode) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم التصنيف والرمز.',
        type: 'warning'
      });
      return;
    }
    if (editingCategory) {
      kasEtmadSuiteService.updateCategory(editingCategory.id, {
        name: formData.catName,
        code: formData.catCode,
        description: formData.catDesc
      });
      addNotification({
        title: 'تم تحديث التصنيف',
        message: `تم تحديث التصنيف (${formData.catName}) بنجاح.`,
        type: 'success'
      });
      setEditingCategory(null);
    } else {
      kasEtmadSuiteService.addCategory({
        name: formData.catName,
        code: formData.catCode,
        description: formData.catDesc
      });
      addNotification({
        title: 'تمت إضافة التصنيف',
        message: `تمت إضافة التصنيف (${formData.catName}) بنجاح.`,
        type: 'success'
      });
    }
    setShowAddCategoryModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveStaff = () => {
    if (!formData.staffName || !formData.staffEmail) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال الاسم والبريد الإلكتروني.',
        type: 'warning'
      });
      return;
    }
    if (editingStaff) {
      kasEtmadSuiteService.updateStaff(editingStaff.id, {
        name: formData.staffName,
        email: formData.staffEmail,
        role: formData.staffRole || 'Employee',
        phone: formData.staffPhone
      });
      addNotification({
        title: 'تم تحديث العضو',
        message: `تم تحديث بيانات (${formData.staffName}) بنجاح.`,
        type: 'success'
      });
      setEditingStaff(null);
    } else {
      kasEtmadSuiteService.addStaff({
        name: formData.staffName,
        email: formData.staffEmail,
        role: formData.staffRole || 'Employee',
        phone: formData.staffPhone
      });
      addNotification({
        title: 'تمت إضافة العضو',
        message: `تمت إضافة (${formData.staffName}) لطاقم العمل.`,
        type: 'success'
      });
    }
    setShowAddStaffModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveProposal = () => {
    if (!formData.subject || !formData.toClient) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال موضوع العرض واسم العميل / الجهة.',
        type: 'warning'
      });
      return;
    }
    const subtotal = itemLines.reduce((s, it) => s + (it.qty * it.rate), 0) || parseFloat(formData.totalAmount) || 0;
    kasEtmadSuiteService.addProposal({
      proposalNumber: `PROP-${String(proposals.length + 1).padStart(6, '0')}`,
      subject: formData.subject,
      toClient: formData.toClient,
      totalAmount: subtotal,
      date: formData.date || new Date().toISOString().split('T')[0],
      openTill: formData.openTill || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      project: formData.project || '',
      tags: ['عرض تجاري', 'شركة كاس'],
      createdAt: new Date().toISOString().split('T')[0],
      status: formData.status || 'مسودة',
      items: itemLines
    });
    addNotification({
      title: 'تم إنشاء العرض التجاري',
      message: `تم تسجيل العرض (${formData.subject}) بنجاح.`,
      type: 'success'
    });
    setShowAddProposalModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveCreditNote = () => {
    if (!formData.clientName || !formData.totalAmount) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى تحديد العميل والمبلغ.',
        type: 'warning'
      });
      return;
    }
    const tot = parseFloat(formData.totalAmount) || 0;
    kasEtmadSuiteService.addCreditNote({
      creditNoteNumber: `CN-${String(creditNotes.length + 1).padStart(6, '0')}`,
      clientName: formData.clientName,
      date: formData.date || new Date().toISOString().split('T')[0],
      status: formData.status || 'مسودة',
      project: formData.project || '',
      remainingAmount: tot,
      totalAmount: tot,
      invoiceRef: formData.invoiceRef || ''
    });
    addNotification({
      title: 'تم إنشاء إشعار الائتمان',
      message: `تم قيد إشعار الائتمان بمبلغ ${tot.toLocaleString()} ⃁.`,
      type: 'success'
    });
    setShowAddCreditNoteModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveSubscription = () => {
    if (!formData.subscriptionName || !formData.clientName || !formData.amount) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى تعبئة كافة الحقول المطلوبة للاشتراك.',
        type: 'warning'
      });
      return;
    }
    const amt = parseFloat(formData.amount) || 0;
    kasEtmadSuiteService.addSubscription({
      subscriptionName: formData.subscriptionName,
      clientName: formData.clientName,
      billingInterval: formData.billingInterval || 'شهري',
      amount: amt,
      status: formData.status || 'نشط',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      nextBillingDate: formData.nextBillingDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    });
    addNotification({
      title: 'تم إنشاء الاشتراك الدوري',
      message: `تم تسجيل اشتراك (${formData.subscriptionName}) بنجاح.`,
      type: 'success'
    });
    setShowAddSubscriptionModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveEstimateRequest = () => {
    if (!formData.clientName || !formData.description) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى كتابة اسم العميل ووصف متطلبات العرض.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addEstimateRequest({
      requestNumber: `EREQ-${String(estimateRequests.length + 1).padStart(6, '0')}`,
      clientName: formData.clientName,
      description: formData.description,
      requestedDate: formData.requestedDate || new Date().toISOString().split('T')[0],
      status: 'جديد'
    });
    addNotification({
      title: 'تم تسجيل طلب عرض السعر',
      message: `تم تسجيل طلب العميل (${formData.clientName}) بنجاح.`,
      type: 'success'
    });
    setShowAddEstimateRequestModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveEmailTemplate = () => {
    if (!formData.templateName || !formData.subject) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال اسم القالب وموضوع البريد.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addEmailTemplate({
      name: formData.templateName,
      subject: formData.subject,
      category: formData.type || 'فاتورة',
      body: formData.body || 'نص الرسالة الافتراضي...',
      variables: ['{client_name}', '{invoice_number}', '{amount}', '{due_date}', '{company_name}'],
      lastModified: new Date().toISOString().split('T')[0]
    });
    addNotification({
      title: 'تم حفظ قالب البريد',
      message: `تم إنشاء قالب (${formData.templateName}) بنجاح.`,
      type: 'success'
    });
    setShowAddTemplateModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  const handleSaveArticle = () => {
    if (!formData.articleTitle || !formData.articleCategory) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى إدخال عنوان المقال والتصنيف.',
        type: 'warning'
      });
      return;
    }
    kasEtmadSuiteService.addKnowledgeArticle({
      title: formData.articleTitle,
      category: formData.articleCategory || 'لوائح وأنظمة',
      summary: formData.articleDescription || 'ملخص المقال',
      content: formData.articleContent || formData.articleDescription || 'المحتوى الكامل للمقال...',
      publishedDate: new Date().toISOString().split('T')[0]
    });
    addNotification({
      title: 'تمت إضافة المقال',
      message: `تم إضافة (${formData.articleTitle}) إلى قاعدة المعرفة.`,
      type: 'success'
    });
    setShowAddArticleModal(false);
    setFormData({});
    setReloadKey(k => k + 1);
  };

  // Status Badge Helper
  const getStatusPill = (status: string) => {
    if (status.includes('تمت الترسية') || status === 'مدفوع' || status === 'مقبول' || status === 'مكتمل' || status === 'مكتملة' || status === 'ساري' || status === 'مغلق فائز') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">✓ {status}</span>;
    }
    if (status.includes('رفع العرض') || status === 'مدفوع جزئيًا' || status === 'مرسل' || status === 'قيد التقدم' || status === 'مفتوحة' || status === 'مفتوح' || status === 'مؤهل' || status === 'عرض سعر مرسل') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">{status}</span>;
    }
    if (status.includes('لاغي') || status === 'ملغي' || status === 'مرفوض' || status === 'غير مدفوع' || status === 'متأخر' || status === 'حرج' || status === 'مغلق خاسر') {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">✕ {status}</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">● {status}</span>;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner - Pitch Black Cinematic Header matching ActivityLog/Master Design */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration type="kas-tenders" size="sm" />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  KAS ETMAD CLOUD & MONAFASAT
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  مؤسسة خالد عبدالعزيز السليم للتجارة والمقاولات
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                منظومة سحابة اعتماد وإدارة المنافسات والفوترة الذكية
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                المنصة السحابية الموحدة لإدارة المنافسات الحكومية، الفواتير الإلكترونية ZATCA، عروض الأسعار، والمشاريع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Etimad Engineering Lead Badge */}
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full py-1 px-3">
              <CorporateAvatar
                size="sm"
                archetype="tenders-engineer"
                status="verified"
                name="م. أحمد البشير"
                role="رئيس قسم المنافسات واعتماد"
              />
              <div className="text-right">
                <div className="text-[11px] font-bold text-white leading-tight">م. أحمد البشير</div>
                <div className="text-[10px] text-emerald-300 leading-tight">مسؤول سحابة اعتماد</div>
              </div>
            </div>
            {/* Live Task Timer */}
            <div className="flex items-center bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-white hover:text-emerald-300 ml-1.5 flex items-center gap-1 font-bold cursor-pointer"
                title={isTimerRunning ? 'إيقاف المؤقت' : 'بدء المؤقت'}
              >
                {isTimerRunning ? <Square className="w-3.5 h-3.5 text-rose-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isTimerRunning ? 'إيقاف' : 'المؤقت'}</span>
              </button>
              <span className="font-mono font-bold text-emerald-300 mr-1">
                {formatTimer(timerSeconds)}
              </span>
            </div>

            {/* Quick Add Action */}
            <button
              onClick={() => {
                if (activeTab === 'invoices') setShowAddInvoiceModal(true);
                else if (activeTab === 'estimates') setShowAddEstimateModal(true);
                else if (activeTab === 'payments') setShowAddPaymentModal(true);
                else if (activeTab === 'items') setShowAddItemModal(true);
                else if (activeTab === 'clients') setShowAddClientModal(true);
                else if (activeTab === 'leads') setShowAddLeadModal(true);
                else if (activeTab === 'projects') setShowAddProjectModal(true);
                else if (activeTab === 'tasks') setShowAddTaskModal(true);
                else if (activeTab === 'contracts') setShowAddContractModal(true);
                else if (activeTab === 'expenses') setShowAddExpenseModal(true);
                else if (activeTab === 'tickets') setShowAddTicketModal(true);
                else if (activeTab === 'settings') setShowAddCategoryModal(true);
                else if (activeTab === 'staff') setShowAddStaffModal(true);
                else setShowAddCompModal(true);
              }}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', backgroundColor: '#ffffff', color: '#000000', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 ml-1 text-emerald-700" />
              <span>+ إضافة سريعة</span>
            </button>

            {/* Refresh */}
            <button
              className="button-outline-on-dark"
              onClick={() => setReloadKey(k => k + 1)}
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              title="تحديث البيانات"
            >
              <RefreshCw className="w-3.5 h-3.5 ml-1 text-cyan-400" />
              <span>تحديث</span>
            </button>

            {/* Universal Multi-Format Export Dropdown */}
            <ExportDropdown
              sectionKey={
                activeTab === 'invoices' ? 'zatca' :
                activeTab === 'estimates' ? 'estimates' :
                activeTab === 'proposals' ? 'proposals' :
                activeTab === 'subscriptions' ? 'subscriptions' :
                activeTab === 'credit-notes' ? 'credit_notes' :
                activeTab === 'payments' ? 'payments' :
                activeTab === 'items' ? 'items' :
                activeTab === 'clients' ? 'clients' :
                activeTab === 'leads' ? 'leads' :
                activeTab === 'projects' ? 'projects' :
                activeTab === 'tasks' ? 'tasks' :
                activeTab === 'contracts' ? 'contracts' :
                activeTab === 'expenses' ? 'expenses' :
                activeTab === 'tickets' ? 'tickets' :
                activeTab === 'staff' ? 'staff' : 'kas_competitions'
              }
              data={
                activeTab === 'invoices' ? invoices :
                activeTab === 'estimates' ? estimates :
                activeTab === 'proposals' ? proposals :
                activeTab === 'subscriptions' ? subscriptions :
                activeTab === 'credit-notes' ? creditNotes :
                activeTab === 'payments' ? payments :
                activeTab === 'items' ? items :
                activeTab === 'clients' ? clients :
                activeTab === 'leads' ? leads :
                activeTab === 'projects' ? projects :
                activeTab === 'tasks' ? tasks :
                activeTab === 'contracts' ? contracts :
                activeTab === 'expenses' ? expenses :
                activeTab === 'tickets' ? tickets :
                activeTab === 'staff' ? staff : competitions
              }
              customTitle={`كشف سجلات ${activeTab} - منصة اعتماد كاس`}
              variant="outline-dark"
            />
          </div>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card - Total Competitions */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي المنافسات المسجلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.totalCompetitions} منافسة
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>منصة اعتماد الحكومية</span>
        </div>

        {/* Card 2: Pistachio Band Card - Completed Awards */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>الترسيات والاعتمادات المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {stats.wonCompetitions} ترسية
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>معدل الفوز {stats.winRate}%</span>
        </div>

        {/* Card 3: Pitch Black Featured Card - Active Sessions / Revenue */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي المبيعات والفواتير</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {(stats.totalInvoicesAmount / 1000).toFixed(0)}k ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>المحصل: {(stats.paidAmount / 1000).toFixed(0)}k ⃁</span>
        </div>

        {/* Card 4: White Card - ZATCA & Security Compliance */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>مستوى الامتثال ومطابقة ZATCA</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            100%
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-emerald-500 rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>معتمد وموثق سحابياً</span>
        </div>
      </div>

      {/* Main Module Navigation Bar - Capsule Pill Design */}
      <div className="card-pricing" style={{ padding: '14px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <span className="text-xs font-semibold text-zinc-500 ml-1">الأقسام:</span>
          {[
            { id: 'dashboard', label: 'لوحة التحكم', icon: BarChart3 },
            { id: 'competitions', label: 'المنافسات', count: competitions.length, icon: Award, badge: 'اعتماد' },
            { id: 'invoices', label: 'الفواتير', count: invoices.length, icon: DollarSign },
            { id: 'estimates', label: 'عروض الأسعار', count: estimates.length, icon: FileSpreadsheet },
            { id: 'proposals', label: 'العروض', count: proposals.length, icon: Send },
            { id: 'credit-notes', label: 'إشعارات الائتمان', count: creditNotes.length, icon: ArrowDownRight },
            { id: 'payments', label: 'المدفوعات', count: payments.length, icon: Receipt },
            { id: 'subscriptions', label: 'الاشتراكات', count: subscriptions.length, icon: RefreshCw },
            { id: 'items', label: 'جدول الكميات', count: items.length, icon: Layers },
            { id: 'clients', label: 'العملاء', count: clients.length, icon: Users },
            { id: 'leads', label: 'العملاء المحتملين', count: leads.length, icon: UserPlus },
            { id: 'projects', label: 'المشاريع', count: projects.length, icon: Briefcase },
            { id: 'tasks', label: 'المهام', count: tasks.length, icon: CheckSquare },
            { id: 'contracts', label: 'العقود', count: contracts.length, icon: FileCheck },
            { id: 'expenses', label: 'المصروفات', count: expenses.length, icon: CreditCard },
            { id: 'tickets', label: 'الدعم', count: tickets.length, icon: HelpCircle },
            { id: 'estimate-requests', label: 'طلب عرض سعر', count: estimateRequests.length, icon: FilePlus },
            { id: 'staff', label: 'الطاقم', count: staff.length, icon: UserCheck },
            { id: 'knowledge-base', label: 'قاعدة المعرفة', count: knowledge.length, icon: BookOpen },
            { id: 'email-templates', label: 'قوالب البريد', count: emailTemplates.length, icon: Mail },
            { id: 'utilities', label: 'الأدوات المساعدة', icon: Calculator },
            { id: 'calendar', label: 'التقويم', icon: Calendar },
            { id: 'reports', label: 'التقارير المالية', icon: TrendingUp },
            { id: 'settings', label: 'تصنيفات المنافسات', count: categories.length, icon: Settings },
          ].map(navItem => {
            const isActive = activeTab === navItem.id;
            const Icon = navItem.icon;
            return (
              <button
                key={navItem.id}
                onClick={() => setActiveTab(navItem.id as any)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 550 : 420,
                  border: '1px solid',
                  borderColor: isActive ? '#000000' : '#e4e4e7',
                  backgroundColor: isActive ? '#000000' : '#ffffff',
                  color: isActive ? '#ffffff' : '#27272a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{navItem.label}</span>
                {navItem.count !== undefined && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f4f4f5',
                      color: isActive ? '#ffffff' : '#52525b',
                    }}
                  >
                    {navItem.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD VIEW (لوحة التحكم التفاعلية والشاملة) */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Grid (8 Signature Luxury Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3.5">
            <div
              onClick={() => setActiveTab('competitions')}
              className="card-pricing cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px', background: '#ffffff' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>المنافسات</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {stats.totalCompetitions}
              </div>
              <span className="pill-tag-shade" style={{ fontSize: '10px', marginTop: '6px' }}>{stats.wonCompetitions} ترسية ({stats.winRate}%)</span>
            </div>

            <div
              onClick={() => setActiveTab('invoices')}
              className="card-pistachio-band cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#000000', fontWeight: 550 }}>إجمالي الفواتير</span>
                <DollarSign className="w-4 h-4 text-emerald-800" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {(stats.totalInvoicesAmount / 1000).toFixed(0)}k
              </div>
              <span className="pill-tag-mint" style={{ fontSize: '10px', marginTop: '6px' }}>مبيعات كاس (⃁)</span>
            </div>

            <div
              onClick={() => setActiveTab('invoices')}
              className="card-pricing-featured cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 550 }}>المحصل الفعلي</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {(stats.paidAmount / 1000).toFixed(0)}k
              </div>
              <span className="pill-tag-mint" style={{ fontSize: '10px', marginTop: '6px' }}>في الحسابات (⃁)</span>
            </div>

            <div
              onClick={() => setActiveTab('invoices')}
              className="card-pricing cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px', background: '#ffffff' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>غير محصل</span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {(stats.unpaidAmount / 1000).toFixed(0)}k
              </div>
              <span className="pill-tag-shade" style={{ fontSize: '10px', marginTop: '6px', color: '#e11d48' }}>مستحق السداد</span>
            </div>

            <div
              onClick={() => setActiveTab('proposals')}
              className="card-pricing cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px', background: '#ffffff' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>العروض التجارية</span>
                <Send className="w-4 h-4 text-sky-600" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {(stats.totalProposalsValue / 1000).toFixed(0)}k
              </div>
              <span className="pill-tag-shade" style={{ fontSize: '10px', marginTop: '6px' }}>{proposals.length} عرض معتمد</span>
            </div>

            <div
              onClick={() => setActiveTab('subscriptions')}
              className="card-pistachio-band cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#000000', fontWeight: 550 }}>الاشتراكات</span>
                <RefreshCw className="w-4 h-4 text-emerald-800" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {(stats.totalSubscriptionsRevenue / 1000).toFixed(0)}k
              </div>
              <span className="pill-tag-mint" style={{ fontSize: '10px', marginTop: '6px' }}>إيراد دوري سنوي</span>
            </div>

            <div
              onClick={() => setActiveTab('projects')}
              className="card-pricing-featured cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 550 }}>المشاريع</span>
                <Briefcase className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {stats.activeProjects}
              </div>
              <span className="pill-tag-mint" style={{ fontSize: '10px', marginTop: '6px' }}>جارية التنفيذ</span>
            </div>

            <div
              onClick={() => setActiveTab('tasks')}
              className="card-pricing cursor-pointer hover:shadow-md transition-all"
              style={{ padding: '16px', borderRadius: '16px', background: '#ffffff' }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>المهام</span>
                <CheckSquare className="w-4 h-4 text-zinc-700" />
              </div>
              <div className="display-sm" style={{ fontSize: '26px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
                {stats.activeTasks}
              </div>
              <span className="pill-tag-shade" style={{ fontSize: '10px', marginTop: '6px' }}>قيد المتابعة</span>
            </div>
          </div>

          {/* Interactive Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Invoicing & Cashflow SVG Chart */}
            <div className="lg:col-span-2 card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-3">
                <div>
                  <h3 className="display-sm flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>حركة المبيعات والتحصيلات الشهرية (2026)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">مقارنة الفواتير الصادرة والمبالغ المحصلة عبر منصة اعتماد</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-zinc-900">
                    <span className="w-3 h-3 rounded-full bg-black inline-block" />
                    الفواتير الصادرة
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    التحصيلات النقدية
                  </span>
                </div>
              </div>

              {/* SVG Bar & Curve Chart */}
              <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2">
                {[
                  { month: 'يناير', invoiced: 85000, collected: 80000 },
                  { month: 'فبراير', invoiced: 201341, collected: 144760 },
                  { month: 'مارس', invoiced: 165000, collected: 120000 },
                  { month: 'أبريل', invoiced: 110000, collected: 95000 },
                  { month: 'مايو', invoiced: 140000, collected: 130000 },
                  { month: 'يونيو', invoiced: 175000, collected: 150000 },
                  { month: 'يوليو', invoiced: 130000, collected: 115000 },
                  { month: 'أغسطس', invoiced: 220000, collected: 185000 },
                ].map((item, idx) => {
                  const maxVal = 250000;
                  const invHeight = Math.round((item.invoiced / maxVal) * 100);
                  const colHeight = Math.round((item.collected / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-mono px-2 py-1 rounded-lg pointer-events-none mb-1 shadow-lg text-center z-10">
                        <div>صادر: {item.invoiced.toLocaleString()} ⃁</div>
                        <div className="text-emerald-400">محصل: {item.collected.toLocaleString()} ⃁</div>
                      </div>
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div 
                          className="w-3.5 bg-black rounded-t-md transition-all group-hover:opacity-80" 
                          style={{ height: `${invHeight}%` }} 
                        />
                        <div 
                          className="w-3.5 bg-emerald-500 rounded-t-md transition-all group-hover:brightness-110" 
                          style={{ height: `${colHeight}%` }} 
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium truncate group-hover:text-black transition-colors">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competitions Funnel & Win Rate Card */}
            <div className="card-pricing flex flex-col justify-between" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="display-sm flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>مسار ترسية المنافسات</span>
                  </h3>
                  <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                    {stats.winRate}% معدل الفوز
                  </span>
                </div>

                <div className="space-y-3.5 mt-4 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-zinc-800">1. تم رفع العرض الفني والمالي</span>
                      <span className="font-mono text-zinc-900 font-bold">2 منافسة (33%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-black h-2 rounded-full" style={{ width: '33%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-zinc-800">2. تمت الترسية بنجاح (فائز)</span>
                      <span className="font-mono text-emerald-600 font-bold">2 منافسة (33%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '33%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-zinc-800">3. تحت الدراسة والتسعير</span>
                      <span className="font-mono text-amber-600 font-bold">1 منافسة (17%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '17%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="text-zinc-800">4. لم يتم التسعير (لاغي)</span>
                      <span className="font-mono text-rose-500 font-bold">1 منافسة (17%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-rose-400 h-2 rounded-full" style={{ width: '17%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center gap-2 mt-4">
                <button
                  onClick={() => setShowAddCompModal(true)}
                  className="button-primary-pill flex-1 text-xs"
                  style={{ minHeight: '36px', padding: '6px 14px' }}
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  <span>+ إضافة منافسة</span>
                </button>
                <button
                  onClick={() => setActiveTab('competitions')}
                  className="button-outline-on-light text-xs"
                  style={{ minHeight: '36px', padding: '6px 14px' }}
                >
                  عرض الكل
                </button>
              </div>
            </div>
          </div>

          {/* Quick Tasks & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-pricing space-y-4" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="display-sm flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>حالات الفواتير والتحصيل</span>
                </h3>
                <span className="pill-tag-shade" style={{ fontSize: '10px' }}>2026</span>
              </div>

              <div className="space-y-3.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-rose-600">غير مدفوع (33%)</span>
                    <span className="font-mono">1 / 3</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-rose-500 h-2 rounded-full" style={{ width: '33%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-600">مدفوع جزئياً (33%)</span>
                    <span className="font-mono">1 / 3</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: '33%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-emerald-600">مدفوع بالكامل (33%)</span>
                    <span className="font-mono">1 / 3</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '33%' }} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddInvoiceModal(true)}
                className="button-primary-pill w-full text-xs mt-4"
                style={{ minHeight: '38px', padding: '8px 16px' }}
              >
                <Plus className="w-4 h-4 ml-1" />
                <span>+ إنشاء فاتورة جديدة</span>
              </button>
            </div>

            <div className="lg:col-span-2 card-pricing space-y-4" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="display-sm flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>آخر المهام وجداول التوريدات</span>
                </h3>
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="button-outline-on-light text-xs"
                  style={{ minHeight: '32px', padding: '4px 12px' }}
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  <span>إضافة مهمة</span>
                </button>
              </div>

              <div className="divide-y divide-zinc-100">
                {tasks.map(task => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        task.priority === 'عاجل' ? 'bg-rose-500 animate-ping' :
                        task.priority === 'مرتفع' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      <div>
                        <div className="font-bold text-zinc-900 leading-relaxed">{task.taskName}</div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">
                          المسؤول: <span className="text-black font-semibold">{task.assignedTo}</span> • استحقاق: <span className="font-mono">{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <div>{getStatusPill(task.status)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPETITIONS VIEW (المنافسات) */}
      {/* ========================================================================= */}
      {activeTab === 'competitions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث برقم المنافسة، العنوان، الجهة الحكومية..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs"
              >
                <option value="all">كل التصنيفات</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs"
              >
                <option value="all">كل الحالات</option>
                <option value="جديد">جديد</option>
                <option value="تم رفع العرض الفني والمالي">تم رفع العرض الفني والمالي</option>
                <option value="تمت الترسية">تمت الترسية</option>
                <option value="لم يتم التسعير(لاغي)">لم يتم التسعير(لاغي)</option>
              </select>

              <button
                onClick={() => setShowAddCompModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>منافسة جديدة</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 min-w-[280px]">اسم المنافسة</th>
                    <th className="p-3 min-w-[100px] text-center">هل فائز؟</th>
                    <th className="p-3 min-w-[110px]">تاريخ الاستحقاق</th>
                    <th className="p-3 min-w-[110px]">الموعد النهائي</th>
                    <th className="p-3 min-w-[110px]">التصنيف</th>
                    <th className="p-3 min-w-[180px]">الجهات الحكومية</th>
                    <th className="p-3 min-w-[110px]">تاريخ الإنشاء</th>
                    <th className="p-3 min-w-[120px] text-left">إجمالي البنود</th>
                    <th className="p-3 min-w-[140px]">الحالة</th>
                    <th className="p-3 w-24 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCompetitions.map(comp => (
                    <tr key={comp.id} className="hover:bg-emerald-500/5 transition-colors">
                      <td className="p-3 text-center font-mono text-muted-foreground font-bold">{comp.seq}</td>
                      <td className="p-3 font-semibold text-foreground">
                        <div className="leading-relaxed">{comp.title}</div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">مرجع: {comp.referenceNumber}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          comp.isWinner === 'Yes' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-secondary text-muted-foreground'
                        }`}>
                          {comp.isWinner}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">{comp.dueDate}</td>
                      <td className="p-3 font-mono text-muted-foreground">{comp.deadlineDate}</td>
                      <td className="p-3 font-medium">{comp.category}</td>
                      <td className="p-3 text-foreground">{comp.governmentEntity}</td>
                      <td className="p-3 font-mono text-muted-foreground">{comp.createdAt}</td>
                      <td className="p-3 text-left font-mono font-bold text-foreground">
                        {comp.totalItemsValue.toLocaleString()} ⃁
                      </td>
                      <td className="p-3">{getStatusPill(comp.status)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px]">
                          <button
                            onClick={() => {
                              setSelectedDetail(comp);
                              setDetailType('competition');
                              setShowDetailModal(true);
                            }}
                            className="text-emerald-600 hover:underline font-bold"
                          >
                            عرض
                          </button>
                          <span className="text-muted-foreground">|</span>
                          <button
                            onClick={() => {
                              if (window.confirm(`حذف المنافسة "${comp.title}"؟`)) {
                                kasEtmadSuiteService.deleteCompetition(comp.id);
                                setReloadKey(k => k + 1);
                              }
                            }}
                            className="text-rose-600 hover:underline"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INVOICES VIEW (الفواتير) */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>سجل الفواتير الإلكترونية ZATCA المرحلة 2 (شركة كاس للتجارة)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">فواتير ضريبية مبسطة وأساسية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Cards vs Table View Mode Switcher */}
              <div className="flex items-center bg-secondary rounded-2xl p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setInvoicesViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    invoicesViewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>عرض البطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoicesViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    invoicesViewMode === 'table'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>عرض الجدول</span>
                </button>
              </div>

              <button
                onClick={() => setShowAddInvoiceModal(true)}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء فاتورة جديدة</span>
              </button>
            </div>
          </div>

          {/* Cards View */}
          {invoicesViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invoices.map(inv => (
                <KasInvoiceCard
                  key={inv.id}
                  invoice={inv}
                  onViewZatca={() => {
                    setSelectedDetail(inv);
                    setDetailType('invoice');
                    setShowDetailModal(true);
                  }}
                  onQuickPay={() => {
                    setQuickPayInvoice(inv);
                    setShowQuickPayModal(true);
                  }}
                  onDelete={() => {
                    if (window.confirm(`حذف الفاتورة "${inv.invoiceNumber}"؟`)) {
                      kasEtmadSuiteService.deleteInvoice(inv.id);
                      setReloadKey(k => k + 1);
                      addNotification({ title: 'تم حذف الفاتورة', message: `تم حذف ${inv.invoiceNumber} بنجاح`, type: 'info' });
                    }
                  }}
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {invoicesViewMode === 'table' && (
            <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3 text-left">المبلغ</th>
                    <th className="p-3 text-left">إجمالي الضريبة (15%)</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">المشروع</th>
                    <th className="p-3">تاريخ الاستحقاق</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-emerald-500/5">
                      <td className="p-3 font-mono font-bold text-emerald-600">{inv.invoiceNumber}</td>
                      <td className="p-3 text-left font-mono font-bold text-foreground">{inv.amount.toLocaleString()} ⃁</td>
                      <td className="p-3 text-left font-mono text-muted-foreground">{inv.taxAmount.toLocaleString()} ⃁</td>
                      <td className="p-3 font-mono text-muted-foreground">{inv.date}</td>
                      <td className="p-3 font-semibold text-foreground">{inv.clientName}</td>
                      <td className="p-3 text-muted-foreground">{inv.project || '-'}</td>
                      <td className="p-3 font-mono text-muted-foreground">{inv.dueDate}</td>
                      <td className="p-3">{getStatusPill(inv.status)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px]">
                          <button
                            onClick={() => {
                              setSelectedDetail(inv);
                              setDetailType('invoice');
                              setShowDetailModal(true);
                            }}
                            className="text-emerald-600 hover:underline font-bold"
                          >
                            عرض / ZATCA
                          </button>
                          {inv.status !== 'مدفوع' && (
                            <>
                              <span className="text-muted-foreground">|</span>
                              <button
                                onClick={() => {
                                  setQuickPayInvoice(inv);
                                  setShowQuickPayModal(true);
                                }}
                                className="text-sky-600 hover:underline font-bold"
                              >
                                تسجيل سداد
                              </button>
                            </>
                          )}
                          <span className="text-muted-foreground">|</span>
                          <button
                            onClick={() => {
                              if (window.confirm(`حذف الفاتورة "${inv.invoiceNumber}"؟`)) {
                                kasEtmadSuiteService.deleteInvoice(inv.id);
                                setReloadKey(k => k + 1);
                                addNotification({ title: 'تم حذف الفاتورة', message: `تم حذف ${inv.invoiceNumber} بنجاح`, type: 'info' });
                              }
                            }}
                            className="text-rose-600 hover:underline"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ESTIMATES VIEW (عروض الأسعار) */}
      {/* ========================================================================= */}
      {activeTab === 'estimates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>عروض الأسعار وعطاءات المنافسات التقديرية</span>
            </h3>
            <button
              onClick={() => setShowAddEstimateModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>عرض سعر جديد</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">رقم العرض</th>
                  <th className="p-3 text-left">المبلغ</th>
                  <th className="p-3 text-left">الضريبة 15%</th>
                  <th className="p-3">الجهة / العميل</th>
                  <th className="p-3">المشروع</th>
                  <th className="p-3">تاريخ العرض</th>
                  <th className="p-3">تاريخ الصلاحية</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {estimates.map(est => (
                  <tr key={est.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-mono font-bold text-emerald-600">{est.estimateNumber}</td>
                    <td className="p-3 text-left font-mono font-bold text-foreground">{est.totalAmount.toLocaleString()} ⃁</td>
                    <td className="p-3 text-left font-mono text-muted-foreground">{est.taxAmount.toLocaleString()} ⃁</td>
                    <td className="p-3 font-semibold text-foreground">{est.clientName}</td>
                    <td className="p-3 text-muted-foreground">{est.project || '-'}</td>
                    <td className="p-3 font-mono text-muted-foreground">{est.date}</td>
                    <td className="p-3 font-mono text-muted-foreground">{est.expiryDate}</td>
                    <td className="p-3">{getStatusPill(est.status)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDetail(est);
                            setDetailType('estimate');
                            setShowDetailModal(true);
                          }}
                          className="text-emerald-600 hover:underline font-bold text-[11px]"
                        >
                          معاينة
                        </button>
                        <button
                          onClick={() => handleConvertEstimateToInvoice(est)}
                          className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-[10px] transition-colors"
                        >
                          تحويل لفاتورة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PAYMENTS VIEW (المدفوعات وسندات القبض) */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>سجل المدفوعات وسندات القبض البنكية</span>
            </h3>
            <button
              onClick={() => setShowAddPaymentModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>سند قبض جديد</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">العميل / الجهة</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3 font-mono">رقم المعاملة / المرجع</th>
                  <th className="p-3 text-left">المبلغ المحصل</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-mono font-bold text-emerald-600">{pay.paymentNumber}</td>
                    <td className="p-3 font-mono text-muted-foreground">{pay.invoiceNumber}</td>
                    <td className="p-3 font-semibold text-foreground">{pay.clientName}</td>
                    <td className="p-3">{pay.paymentMode}</td>
                    <td className="p-3 font-mono text-muted-foreground">{pay.transactionId}</td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-600">{pay.amount.toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono text-muted-foreground">{pay.date}</td>
                    <td className="p-3 text-muted-foreground">{pay.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ITEMS CATALOG VIEW (جدول الكميات) */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث في جدول الكميات والأصناف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={itemGroupFilter}
                onChange={e => setItemGroupFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs"
              >
                <option value="all">كل المجموعات</option>
                <option value="ضيافة وتمور">ضيافة وتمور</option>
                <option value="توريدات حكومية">توريدات حكومية</option>
                <option value="ديكور ومعارض">ديكور ومعارض</option>
                <option value="أجهزة وتقنية">أجهزة وتقنية</option>
              </select>

              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة صنف</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">الوصف / البند</th>
                  <th className="p-3">الوصف التفصيلي</th>
                  <th className="p-3">المجموعة</th>
                  <th className="p-3">الوحدة</th>
                  <th className="p-3 text-left">السعر (⃁)</th>
                  <th className="p-3 text-center">الضريبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-bold text-foreground">{item.description}</td>
                    <td className="p-3 text-muted-foreground">{item.longDescription || '-'}</td>
                    <td className="p-3 font-medium text-emerald-600">{item.group}</td>
                    <td className="p-3">{item.unit}</td>
                    <td className="p-3 text-left font-mono font-bold text-foreground">{item.rate.toLocaleString()} ⃁</td>
                    <td className="p-3 text-center font-mono">{item.taxPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. LEADS VIEW (العملاء المحتملين والفرص البيعية) */}
      {/* ========================================================================= */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <span>خط الأنابيب والفرص البيعية والمنافسات المحتملة</span>
            </h3>
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فرصة جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map(lead => (
              <div key={lead.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {lead.source}
                  </span>
                  {getStatusPill(lead.status)}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">{lead.company}</h4>
                  <div className="text-xs text-muted-foreground mt-0.5">المسؤول: {lead.name}</div>
                </div>
                <div className="p-3 bg-secondary/40 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">قيمة الفرصة المتوقعة:</span>
                  <span className="font-mono font-bold text-emerald-600">{lead.opportunityValue.toLocaleString()} ⃁</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono flex justify-between pt-1">
                  <span>{lead.phone}</span>
                  <span>المسؤول: {lead.assignedTo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PROJECTS VIEW (المشاريع) */}
      {/* ========================================================================= */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <span>مشاريع التوريد والتشغيل لشركة كاس</span>
            </h3>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>مشروع جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(proj => (
              <div key={proj.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-foreground text-base leading-snug">{proj.projectName}</h4>
                    <div className="text-xs text-muted-foreground mt-1">الجهة: <span className="font-semibold text-foreground">{proj.clientName}</span></div>
                  </div>
                  {getStatusPill(proj.status)}
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>نسبة الإنجاز</span>
                    <span className="font-mono">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${proj.progress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-3 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">الميزانية المرصودة:</span>
                    <span className="font-bold font-mono text-emerald-600">{proj.budget.toLocaleString()} ⃁</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">الموعد النهائي:</span>
                    <span className="font-bold font-mono text-foreground">{proj.deadline}</span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>فريق العمل: {proj.members.join(' • ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TASKS VIEW (المهام) */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              <span>سجل مهام التشغيل والتوريد</span>
            </h3>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>مهمة جديدة</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">عنوان المهمة</th>
                  <th className="p-3">المشروع</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3">الأولوية</th>
                  <th className="p-3">تاريخ البدء</th>
                  <th className="p-3">تاريخ الاستحقاق</th>
                  <th className="p-3">ساعات العمل</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-bold text-foreground">{task.taskName}</td>
                    <td className="p-3 text-muted-foreground">{task.project || '-'}</td>
                    <td className="p-3 font-semibold">{task.assignedTo}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        task.priority === 'عاجل' ? 'bg-rose-500/10 text-rose-600' :
                        task.priority === 'مرتفع' ? 'bg-amber-500/10 text-amber-600' : 'bg-sky-500/10 text-sky-600'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">{task.startDate}</td>
                    <td className="p-3 font-mono text-muted-foreground">{task.dueDate}</td>
                    <td className="p-3 font-mono">{task.timeSpentHours || 0} س</td>
                    <td className="p-3">{getStatusPill(task.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. CONTRACTS VIEW (العقود) */}
      {/* ========================================================================= */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>العقود والاتفاقيات الحكومية والتجارية</span>
            </h3>
            <button
              onClick={() => setShowAddContractModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>عقد جديد</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">موضوع العقد</th>
                  <th className="p-3">العميل / الجهة</th>
                  <th className="p-3">نوع العقد</th>
                  <th className="p-3 text-left">قيمة العقد</th>
                  <th className="p-3">تاريخ البدء</th>
                  <th className="p-3">تاريخ الانتهاء</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {contracts.map(cnt => (
                  <tr key={cnt.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-bold text-foreground">{cnt.subject}</td>
                    <td className="p-3 font-semibold">{cnt.clientName}</td>
                    <td className="p-3">{cnt.contractType}</td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-600">{cnt.contractValue.toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono text-muted-foreground">{cnt.startDate}</td>
                    <td className="p-3 font-mono text-muted-foreground">{cnt.endDate}</td>
                    <td className="p-3">{getStatusPill(cnt.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. EXPENSES VIEW (المصروفات) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>مصروفات التشغيل وتكاليف المشاريع</span>
            </h3>
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل مصروف</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">بيان المصروف</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-left">المبلغ</th>
                  <th className="p-3 text-left">الضريبة (15%)</th>
                  <th className="p-3">المشروع المرتبط</th>
                  <th className="p-3">طريقة السداد</th>
                  <th className="p-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-bold text-foreground">{exp.expenseName}</td>
                    <td className="p-3 text-emerald-600 font-medium">{exp.category}</td>
                    <td className="p-3 text-left font-mono font-bold text-foreground">{exp.amount.toLocaleString()} ⃁</td>
                    <td className="p-3 text-left font-mono text-muted-foreground">{exp.taxAmount.toLocaleString()} ⃁</td>
                    <td className="p-3 text-muted-foreground">{exp.project || '-'}</td>
                    <td className="p-3">{exp.paymentMode}</td>
                    <td className="p-3 font-mono text-muted-foreground">{exp.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. TICKETS VIEW (الدعم والتذاكر) */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              <span>تذاكر الدعم والربط مع الجهات والمنافسات</span>
            </h3>
            <button
              onClick={() => setShowAddTicketModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>تذكرة جديدة</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-secondary text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">موضوع التذكرة</th>
                  <th className="p-3">القسم</th>
                  <th className="p-3">الخدمة</th>
                  <th className="p-3">جهة الاتصال</th>
                  <th className="p-3">الأولوية</th>
                  <th className="p-3">آخر رد</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {tickets.map(tkt => (
                  <tr key={tkt.id} className="hover:bg-emerald-500/5">
                    <td className="p-3 font-bold text-foreground">{tkt.subject}</td>
                    <td className="p-3 font-medium text-emerald-600">{tkt.department}</td>
                    <td className="p-3 text-muted-foreground">{tkt.service}</td>
                    <td className="p-3">{tkt.contact}</td>
                    <td className="p-3 font-semibold">{tkt.priority}</td>
                    <td className="p-3 font-mono text-muted-foreground">{tkt.lastReply}</td>
                    <td className="p-3">{getStatusPill(tkt.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13. KNOWLEDGE BASE VIEW (قاعدة المعرفة) */}
      {/* ========================================================================= */}
      {activeTab === 'knowledge-base' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>قاعدة المعرفة واللوائح التنظيمية لمنصة اعتماد</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledge.map(art => (
              <div key={art.id} className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                  {art.category}
                </span>
                <h4 className="font-bold text-foreground text-sm">{art.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{art.summary}</p>
                <div className="p-3 bg-secondary/30 rounded-xl text-xs text-foreground leading-relaxed">
                  {art.content}
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between pt-1 font-mono">
                  <span>نشر في: {art.publishedDate}</span>
                  <span>{art.viewsCount} مشاهدة</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 14. CALENDAR VIEW (التقويم التفاعلي لمنافسات وعقود كاس) */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Header with Navigation and Filter */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  تقويم المواعيد والاستحقاقات
                </h3>
                <p className="text-xs text-muted-foreground">
                  {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][calendarMonth]} {calendarYear}
                </p>
              </div>
            </div>

            {/* Month Switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear(y => y - 1);
                  } else {
                    setCalendarMonth(m => m - 1);
                  }
                }}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الشهر السابق</span>
              </button>

              <button
                onClick={() => {
                  setCalendarMonth(7); // August
                  setCalendarYear(2026);
                  setSelectedCalendarDay(30);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                اليوم
              </button>

              <button
                onClick={() => {
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear(y => y + 1);
                  } else {
                    setCalendarMonth(m => m + 1);
                  }
                }}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1"
              >
                <span>الشهر التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Event Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'competitions', label: 'المنافسات (أخضر)' },
                { id: 'invoices', label: 'الفواتير (أزرق)' },
                { id: 'tasks', label: 'المهام (برتقالي)' },
                { id: 'contracts', label: 'العقود (بنفسجي)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCalendarFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    calendarFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 7-Day Monthly Grid */}
            <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm p-5 space-y-4">
              {/* Day names header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground border-b border-border pb-3">
                {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, idx) => {
                  const dayNum = idx - 5; // Offset for August 2026 starting on Saturday
                  const isValidDay = dayNum >= 1 && dayNum <= 31;
                  const isSelected = selectedCalendarDay === dayNum;
                  const isToday = dayNum === 30 && calendarMonth === 7;

                  // Scheduled events for this day
                  const dayComp = isValidDay && (dayNum === 2 || dayNum === 4 || dayNum === 5 || dayNum === 30);
                  const dayInv = isValidDay && (dayNum === 10 || dayNum === 18 || dayNum === 20 || dayNum === 30);
                  const dayTask = isValidDay && (dayNum === 2 || dayNum === 5 || dayNum === 28 || dayNum === 30);

                  return (
                    <div
                      key={idx}
                      onClick={() => isValidDay && setSelectedCalendarDay(dayNum)}
                      className={`min-h-[85px] p-2 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                        !isValidDay 
                          ? 'opacity-20 border-transparent bg-secondary/10 pointer-events-none' 
                          : isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                          : isToday
                          ? 'border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500'
                          : 'border-border/60 bg-secondary/20 hover:border-border hover:bg-secondary/40 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                          isToday ? 'bg-emerald-600 text-white' : isSelected ? 'font-black text-emerald-600' : 'text-foreground'
                        }`}>
                          {isValidDay ? dayNum : ''}
                        </span>
                        {isToday && <span className="text-[9px] font-bold text-emerald-600">اليوم</span>}
                      </div>

                      {isValidDay && (
                        <div className="space-y-1 mt-1">
                          {dayComp && (calendarFilter === 'all' || calendarFilter === 'competitions') && (
                            <div className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded truncate">
                              منافسة اعتماد
                            </div>
                          )}
                          {dayInv && (calendarFilter === 'all' || calendarFilter === 'invoices') && (
                            <div className="text-[9px] font-semibold bg-sky-500/20 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded truncate">
                              استحقاق فاتورة
                            </div>
                          )}
                          {dayTask && (calendarFilter === 'all' || calendarFilter === 'tasks') && (
                            <div className="text-[9px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded truncate">
                              تسليم مهمة
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Agenda Side Panel */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="border-b border-border pb-3">
                <div className="text-xs text-muted-foreground font-semibold">تفاصيل اليوم المختار</div>
                <h4 className="text-lg font-bold text-foreground mt-0.5">
                  {selectedCalendarDay || 30} {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][calendarMonth]} {calendarYear}
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-emerald-600">
                    <span>موعد تقديم منافسة</span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">معتمد</span>
                  </div>
                  <div className="font-semibold text-foreground">توريد وتركيب أنظمة إنارة لمستشفى الملك سلمان بالطائف</div>
                  <div className="text-[11px] text-muted-foreground font-mono">الجهة: الشؤون الصحية بالحرس الوطني</div>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-sky-600">
                    <span>استحقاق سداد فاتورة</span>
                    <span className="text-[10px] bg-sky-500/20 px-2 py-0.5 rounded-full">ZATCA</span>
                  </div>
                  <div className="font-semibold text-foreground">فاتورة رقم INV-000001 (قيمة: 106,006 ⃁)</div>
                  <div className="text-[11px] text-muted-foreground">العميل: مؤسسة خالد السليم للتجارة</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-amber-600">
                    <span>موعد إنجاز مهمة تشغيل</span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full">عاجل</span>
                  </div>
                  <div className="font-semibold text-foreground">إدارة مشتريات الدمام – توريد مضخات غاطسة</div>
                  <div className="text-[11px] text-muted-foreground font-mono">المسؤول: محمد خالد</div>
                </div>
              </div>

              <button
                onClick={() => setShowAddTaskModal(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ جدولة حدث أو مهمة جديدة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 15. REPORTS VIEW (التقارير المالية وإقرارات ZATCA لشركة كاس) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>التقارير المالية والإقرارات الضريبية ZATCA</span>
              </h3>
              <p className="text-xs text-muted-foreground">شركة كاس للتجارة والمقاولات • السجل الضريبي 310245879600003</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-secondary rounded-xl p-1 text-xs font-bold">
                {[
                  { id: 'ytd', label: 'كامل عام 2026' },
                  { id: 'q3', label: 'الربع الثالث Q3' },
                  { id: 'q2', label: 'الربع الثاني Q2' }
                ].map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => setReportsTimeframe(tf.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      reportsTimeframe === tf.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">إجمالي المبيعات والفواتير</span>
              <div className="text-2xl font-bold font-mono text-emerald-600">{stats.totalInvoicesAmount.toLocaleString()} ⃁</div>
              <div className="text-xs text-muted-foreground">ضريبة القيمة المضافة 15%: {(stats.totalInvoicesAmount * 0.15).toLocaleString()} ⃁</div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">المبالغ المحصلة فعلياً</span>
              <div className="text-2xl font-bold font-mono text-sky-600">{stats.paidAmount.toLocaleString()} ⃁</div>
              <div className="text-xs text-sky-600 font-semibold">{Math.round((stats.paidAmount / (stats.totalInvoicesAmount || 1)) * 100)}% من إجمالي المستحقات</div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">تكاليف التشغيل والمصروفات</span>
              <div className="text-2xl font-bold font-mono text-rose-600">{stats.totalExpenses.toLocaleString()} ⃁</div>
              <div className="text-xs text-muted-foreground">ضريبة المدخلات المستردة: {(stats.totalExpenses * 0.15).toLocaleString()} ⃁</div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">صافي الربح التشغيلي</span>
              <div className="text-2xl font-bold font-mono text-foreground">{(stats.totalInvoicesAmount - stats.totalExpenses).toLocaleString()} ⃁</div>
              <div className="text-xs text-emerald-600 font-bold">هامش ربح تقديري: {Math.round(((stats.totalInvoicesAmount - stats.totalExpenses) / (stats.totalInvoicesAmount || 1)) * 100)}%</div>
            </div>
          </div>

          {/* Official ZATCA VAT 15% Return Table */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  نموذج إقرار ضريبة القيمة المضافة (15%) - هيئة الزكاة والضريبة والجمارك ZATCA
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">الحساب الضريبي الموحد لمؤسسة خالد عبدالعزيز السليم (كاس)</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full font-bold text-xs font-mono">
                جاهز للإقرار
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-secondary text-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-3">البند الضريبي</th>
                    <th className="p-3 text-left">المبلغ الخاضع (⃁)</th>
                    <th className="p-3 text-left">نسبة الضريبة</th>
                    <th className="p-3 text-left">مبلغ الضريبة (⃁)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  <tr>
                    <td className="p-3 font-semibold text-foreground">1. المبيعات الخاضعة للنسبة الأساسية (15%)</td>
                    <td className="p-3 text-left font-bold">{stats.totalInvoicesAmount.toLocaleString()}</td>
                    <td className="p-3 text-left">15%</td>
                    <td className="p-3 text-left font-bold text-emerald-600">{(stats.totalInvoicesAmount * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground">2. المشتريات الخاضعة للنسبة الأساسية (ضريبة المدخلات)</td>
                    <td className="p-3 text-left font-bold">{stats.totalExpenses.toLocaleString()}</td>
                    <td className="p-3 text-left">15%</td>
                    <td className="p-3 text-left font-bold text-rose-600">{(stats.totalExpenses * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="bg-emerald-500/5 font-extrabold text-foreground border-t-2 border-emerald-500">
                    <td className="p-3 text-sm">صافي ضريبة القيمة المضافة المستحقة للسداد للهيئة (1 - 2)</td>
                    <td className="p-3 text-left">{(stats.totalInvoicesAmount - stats.totalExpenses).toLocaleString()}</td>
                    <td className="p-3 text-left">15%</td>
                    <td className="p-3 text-left text-sm text-emerald-600">{((stats.totalInvoicesAmount - stats.totalExpenses) * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-secondary/50 text-[11px] text-muted-foreground">
              * تم احتساب المبالغ تلقائياً بموجب الفواتير المعتمدة والمصروفات المسجلة في منظومة سحابة كاس.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 16. CLIENTS VIEW (العملاء مع ملف العميل 360) */}
      {/* ========================================================================= */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>دليل العملاء والجهات الحكومية المتعاقدة</span>
            </h3>
            <button
              onClick={() => setShowAddClientModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عميل جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {clients.map(client => (
              <div 
                key={client.id} 
                onClick={() => setSelectedClientProfile(client)}
                className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                    نشط
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm leading-snug">{client.company}</h4>
                  <p className="text-xs text-muted-foreground mt-1">جهة الاتصال: {client.primaryContact}</p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 font-mono">
                  <div>{client.phone}</div>
                  <div>{client.email}</div>
                  <div>{client.city}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 17. STAFF VIEW (الطاقم وفريق العمل) */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Header & Action Bar */}
          <div className="card-pricing flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  أعضاء الطاقم وفريق عمل منظومة كاس
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mr-10">إدارة مستخدمي النظام والصلاحيات وأدوار التشغيل المعتمدة</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث في الطاقم..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="pl-3 pr-9 py-2 text-xs rounded-full bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-48 sm:w-60"
                />
              </div>

              <ExportDropdown
                sectionKey="staff"
                data={filteredStaff}
                customTitle="طاقم العمل وفريق التشغيل - سحابة كاس"
                variant="outline-light"
              />

              <button
                onClick={() => {
                  setEditingStaff(null);
                  setFormData({});
                  setShowAddStaffModal(true);
                }}
                className="button-primary-pill !py-2 !px-4 !text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>عضو جديد</span>
              </button>
            </div>
          </div>

          {/* Luxury Table in card-pricing */}
          <div className="card-pricing p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-secondary/70 text-foreground font-bold border-b border-border/60">
                  <tr>
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">الاسم الكامل</th>
                    <th className="p-3.5">البريد الإلكتروني</th>
                    <th className="p-3.5">الهاتف</th>
                    <th className="p-3.5">الدور الوظيفي / الصلاحيات</th>
                    <th className="p-3.5">آخر تسجيل دخول</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 w-28 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        <UserCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <span>لا يوجد أعضاء طاقم يطابقون معايير البحث</span>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="p-3.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-foreground">
                          <span>{st.name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          <a href={`mailto:${st.email}`} className="hover:text-emerald-600 transition-colors">
                            {st.email}
                          </a>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {st.phone ? (
                            <a href={`tel:${st.phone}`} className="hover:text-emerald-600 transition-colors">
                              {st.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={st.role.includes('Super_Admin') ? 'pill-tag-mint text-[11px]' : 'pill-tag-shade text-[11px]'}>
                            {st.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground text-[11px]">{st.lastLogin}</td>
                        <td className="p-3.5">
                          <span className="pill-tag-mint text-[10px]">
                            ● نشط
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingStaff(st);
                                setFormData({
                                  staffName: st.name,
                                  staffEmail: st.email,
                                  staffRole: st.role,
                                  staffPhone: st.phone || ''
                                });
                                setShowAddStaffModal(true);
                              }}
                              className="w-7 h-7 rounded-full bg-secondary hover:bg-amber-500/15 text-muted-foreground hover:text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="تعديل بيانات العضو"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف (${st.name})؟`)) {
                                  kasEtmadSuiteService.deleteStaff(st.id);
                                  setReloadKey(k => k + 1);
                                  addNotification({
                                    title: 'تم الحذف',
                                    message: `تم حذف (${st.name}) من الطاقم.`,
                                    type: 'info'
                                  });
                                }
                              }}
                              className="w-7 h-7 rounded-full bg-secondary hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="حذف العضو"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 18. SETTINGS VIEW (تصنيفات المنافسات والأكواد 01 - 9987) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Header & Action Bar */}
          <div className="card-pricing flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  إعدادات وتصنيفات المنافسات الحكومية (منصة اعتماد)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mr-10">التصنيفات المعتمدة وأكوادها الرسمية (01 إلى 9987) في منظومة كاس</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث في التصنيفات أو الكود..."
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                  className="pl-3 pr-9 py-2 text-xs rounded-full bg-secondary/50 border border-border/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-48 sm:w-60"
                />
              </div>

              <ExportDropdown
                sectionKey="categories"
                data={filteredCategories}
                customTitle="تصنيفات المنافسات الحكومية - سحابة كاس"
                variant="outline-light"
              />

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setFormData({});
                  setShowAddCategoryModal(true);
                }}
                className="button-primary-pill !py-2 !px-4 !text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تصنيف جديد</span>
              </button>
            </div>
          </div>

          {/* Luxury Table in card-pricing */}
          <div className="card-pricing p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-secondary/70 text-foreground font-bold border-b border-border/60">
                  <tr>
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">اسم التصنيف</th>
                    <th className="p-3.5 font-mono">الرمز / الكود</th>
                    <th className="p-3.5">الوصف ونطاق الأعمال</th>
                    <th className="p-3.5 font-mono">تاريخ التحديث</th>
                    <th className="p-3.5 w-28 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-muted-foreground">
                        <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <span>لا توجد تصنيفات تطابق معايير البحث</span>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat, idx) => (
                      <tr key={cat.id || idx} className="hover:bg-secondary/40 transition-colors">
                        <td className="p-3.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="pill-tag-shade font-mono font-black text-xs">
                            {cat.code}
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground max-w-sm truncate">{cat.description || '—'}</td>
                        <td className="p-3.5 font-mono text-muted-foreground text-[11px]">{cat.updatedAt}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(cat.code);
                                addNotification({
                                  title: 'تم النسخ',
                                  message: `تم نسخ رمز التصنيف (${cat.code}) إلى الحافظة.`,
                                  type: 'success'
                                });
                              }}
                              className="w-7 h-7 rounded-full bg-secondary hover:bg-sky-500/15 text-muted-foreground hover:text-sky-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="نسخ الكود"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setFormData({
                                  catName: cat.name,
                                  catCode: cat.code,
                                  catDesc: cat.description || ''
                                });
                                setShowAddCategoryModal(true);
                              }}
                              className="w-7 h-7 rounded-full bg-secondary hover:bg-amber-500/15 text-muted-foreground hover:text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="تعديل التصنيف"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف تصنيف "${cat.name}"؟`)) {
                                  kasEtmadSuiteService.deleteCategory(cat.id);
                                  setReloadKey(k => k + 1);
                                  addNotification({
                                    title: 'تم الحذف',
                                    message: `تم حذف تصنيف (${cat.name}) بنجاح.`,
                                    type: 'info'
                                  });
                                }
                              }}
                              className="w-7 h-7 rounded-full bg-secondary hover:bg-rose-500/15 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="حذف التصنيف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PROPOSALS VIEW (العروض التجارية) */}
      {/* ========================================================================= */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          {/* Top KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">إجمالي العروض التجارية</span>
                <span className="text-2xl font-bold font-mono text-foreground block mt-1">{proposals.length}</span>
                <span className="text-[10px] text-muted-foreground">عرض مسجل بالنظام</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Send className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">عروض مقبولة ومعتمدة</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 block mt-1">
                  {proposals.filter(p => p.status === 'مقبول').length}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">
                  {proposals.length ? Math.round((proposals.filter(p => p.status === 'مقبول').length / proposals.length) * 100) : 0}% نسبة القبول
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-sky-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">إجمالي القيمة التقديرية</span>
                <span className="text-xl font-bold font-mono text-sky-600 block mt-1 truncate">
                  {proposals.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString()} ⃁
                </span>
                <span className="text-[10px] text-muted-foreground">قيمة العروض الجارية</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">عروض قيد الانتظار</span>
                <span className="text-2xl font-bold font-mono text-amber-600 block mt-1">
                  {proposals.filter(p => p.status === 'مرسل' || p.status === 'مسودة').length}
                </span>
                <span className="text-[10px] text-amber-600 font-medium">بانتظار موافقة العميل</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {['all', 'مسودة', 'مرسل', 'مقبول', 'مرفوض'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st === 'all' ? 'جميع العروض' : st}
                  <span className="mr-1.5 text-[10px] opacity-80">
                    ({st === 'all' ? proposals.length : proposals.filter(p => p.status === st).length})
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFormData({});
                  setItemLines([{ description: 'بند توريد/خدمات كاس', qty: 1, rate: 1000, taxPct: 15, total: 1150 }]);
                  setShowAddProposalModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-600/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء عرض تجاري جديد</span>
              </button>

              <button
                onClick={() => kasEtmadSuiteService.exportProposalsToXLSX()}
                className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1.5 border border-border/60 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>تصدير إكسل</span>
              </button>
            </div>
          </div>

          {/* Proposals Data Table */}
          <div className="bg-card border border-border rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground border-b border-border/60">
                    <th className="px-4 py-3.5 text-right font-bold">عرض #</th>
                    <th className="px-4 py-3.5 text-right font-bold">الموضوع والوصف</th>
                    <th className="px-4 py-3.5 text-right font-bold">الجهة / العميل المستهدف</th>
                    <th className="px-4 py-3.5 text-right font-bold">إجمالي القيمة</th>
                    <th className="px-4 py-3.5 text-right font-bold">تاريخ العرض</th>
                    <th className="px-4 py-3.5 text-right font-bold">صلاحية العرض</th>
                    <th className="px-4 py-3.5 text-right font-bold">المشروع</th>
                    <th className="px-4 py-3.5 text-right font-bold">الحالة</th>
                    <th className="px-4 py-3.5 text-right font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {proposals.filter(p => statusFilter === 'all' || p.status === statusFilter).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        <Send className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <span>لا توجد عروض تجارية مطابقة لهذا الفلتر</span>
                      </td>
                    </tr>
                  ) : (
                    proposals
                      .filter(p => statusFilter === 'all' || p.status === statusFilter)
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                            {p.proposalNumber}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground max-w-[240px] truncate">
                            {p.subject}
                          </td>
                          <td className="px-4 py-3 text-foreground font-medium">
                            <span className="px-2.5 py-1 rounded-lg bg-secondary text-foreground text-[11px] font-medium inline-block">
                              {p.toClient}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {p.totalAmount.toLocaleString()} ⃁
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {p.date}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {p.openTill}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.project ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-medium">
                                {p.project}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusPill(p.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedDetail(p);
                                  setDetailType('estimate');
                                  setShowDetailModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 transition-colors cursor-pointer"
                                title="عرض وتفاصيل العرض"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  kasEtmadSuiteService.deleteProposal(p.id);
                                  setReloadKey(k => k + 1);
                                  addNotification({ title: 'تم الحذف', message: 'تم حذف العرض التجاري بنجاح.', type: 'info' });
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                                title="حذف العرض"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREDIT NOTES VIEW (إشعارات الائتمان) */}
      {/* ========================================================================= */}
      {activeTab === 'credit-notes' && (
        <div className="space-y-6">
          {/* Top KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-orange-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">إجمالي إشعارات الائتمان</span>
                <span className="text-2xl font-bold font-mono text-foreground block mt-1">{creditNotes.length}</span>
                <span className="text-[10px] text-muted-foreground">إشعار قيد مالي</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">المبالغ الدائنة المتبقية</span>
                <span className="text-xl font-bold font-mono text-amber-600 block mt-1 truncate">
                  {creditNotes.reduce((sum, cn) => sum + (cn.remainingAmount || 0), 0).toLocaleString()} ⃁
                </span>
                <span className="text-[10px] text-amber-600 font-medium">رصيد دائن للعملاء</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">إجمالي المبالغ المقيدة</span>
                <span className="text-xl font-bold font-mono text-emerald-600 block mt-1 truncate">
                  {creditNotes.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0).toLocaleString()} ⃁
                </span>
                <span className="text-[10px] text-muted-foreground">إجمالي قيود الخصم</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-blue-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">إشعارات سارية</span>
                <span className="text-2xl font-bold font-mono text-blue-600 block mt-1">
                  {creditNotes.filter(cn => cn.status === 'مفتوح' || cn.status === 'مسودة').length}
                </span>
                <span className="text-[10px] text-blue-600 font-medium">جاهزة للتسوية</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-orange-600" />
              <span>جدول إشعارات الائتمان المقيدة</span>
              <span className="text-xs text-muted-foreground font-mono">({creditNotes.length})</span>
            </h3>

            <button
              onClick={() => {
                setFormData({});
                setShowAddCreditNoteModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار إشعار ائتمان جديد</span>
            </button>
          </div>

          {/* Credit Notes Table */}
          <div className="bg-card border border-border rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground border-b border-border/60">
                    <th className="px-4 py-3.5 text-right font-bold">إشعار #</th>
                    <th className="px-4 py-3.5 text-right font-bold">العميل</th>
                    <th className="px-4 py-3.5 text-right font-bold">التاريخ</th>
                    <th className="px-4 py-3.5 text-right font-bold">الفاتورة المرجعية</th>
                    <th className="px-4 py-3.5 text-right font-bold">المشروع</th>
                    <th className="px-4 py-3.5 text-right font-bold">المبلغ المتبقي</th>
                    <th className="px-4 py-3.5 text-right font-bold">الإجمالي</th>
                    <th className="px-4 py-3.5 text-right font-bold">الحالة</th>
                    <th className="px-4 py-3.5 text-right font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {creditNotes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        <ArrowDownRight className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <span>لا توجد إشعارات ائتمان مسجلة حالياً</span>
                      </td>
                    </tr>
                  ) : (
                    creditNotes.map((cn) => (
                      <tr key={cn.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-orange-600 dark:text-orange-400">
                          {cn.creditNoteNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {cn.clientName}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {cn.date}
                        </td>
                        <td className="px-4 py-3 font-mono text-sky-600 dark:text-sky-400 font-bold">
                          {cn.invoiceRef || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {cn.project ? (
                            <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px]">
                              {cn.project}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {cn.remainingAmount.toLocaleString()} ⃁
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {cn.totalAmount.toLocaleString()} ⃁
                        </td>
                        <td className="px-4 py-3">
                          {getStatusPill(cn.status)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              kasEtmadSuiteService.deleteCreditNote(cn.id);
                              setReloadKey(k => k + 1);
                              addNotification({ title: 'تم الحذف', message: 'تم حذف إشعار الائتمان بنجاح.', type: 'info' });
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                            title="حذف الإشعار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SUBSCRIPTIONS VIEW (الاشتراكات الدورية) */}
      {/* ========================================================================= */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Top KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-teal-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">الاشتراكات النشطة</span>
                <span className="text-2xl font-bold font-mono text-teal-600 block mt-1">
                  {subscriptions.filter(s => s.status === 'نشط').length}
                </span>
                <span className="text-[10px] text-muted-foreground">من أصل {subscriptions.length} اشتراك</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
                <RefreshCw className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">الإيراد المتكرر (MRR)</span>
                <span className="text-xl font-bold font-mono text-emerald-600 block mt-1 truncate">
                  {subscriptions.filter(s => s.status === 'نشط').reduce((sum, s) => sum + s.amount, 0).toLocaleString()} ⃁
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">فوترة دورية شهرية</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-sky-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">الإيراد السنوي التقديري (ARR)</span>
                <span className="text-xl font-bold font-mono text-sky-600 block mt-1 truncate">
                  {(subscriptions.filter(s => s.status === 'نشط').reduce((sum, s) => sum + s.amount, 0) * 12).toLocaleString()} ⃁
                </span>
                <span className="text-[10px] text-muted-foreground">توقع التدفقات السنوية</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">اشتراكات متوقفة</span>
                <span className="text-2xl font-bold font-mono text-amber-600 block mt-1">
                  {subscriptions.filter(s => s.status === 'متوقف').length}
                </span>
                <span className="text-[10px] text-amber-600 font-medium">تحتاج إلى تجديد</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-600" />
              <span>بطاقات الاشتراكات وعقود الصيانة الدورية</span>
              <span className="text-xs text-muted-foreground font-mono">({subscriptions.length})</span>
            </h3>

            <button
              onClick={() => {
                setFormData({});
                setShowAddSubscriptionModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-teal-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل اشتراك دوري جديد</span>
            </button>
          </div>

          {/* Subscriptions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-[10px] border border-teal-500/20">
                        {sub.billingInterval}
                      </span>
                      <h4 className="text-base font-bold text-foreground mt-2 leading-snug">
                        {sub.subscriptionName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        العميل: {sub.clientName}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        sub.status === 'نشط'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {sub.status === 'نشط' ? '● ساري ونشط' : '○ متوقف'}
                    </span>
                  </div>

                  {/* 4-Cell Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block">المبلغ الدوري</span>
                      <span className="font-bold font-mono text-sm text-foreground block mt-0.5">
                        {sub.amount.toLocaleString()} ⃁
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block">دورة الفوترة</span>
                      <span className="font-bold text-sm text-foreground block mt-0.5">
                        {sub.billingInterval}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block">تاريخ البدء</span>
                      <span className="font-mono text-muted-foreground block mt-0.5 text-[11px]">
                        {sub.startDate}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-secondary/50 border border-border/40">
                      <span className="text-[11px] text-muted-foreground block">الفوترة القادمة</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5 text-[11px]">
                        {sub.nextBillingDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <button
                    onClick={() => {
                      const nextStatus = sub.status === 'نشط' ? 'متوقف' : 'نشط';
                      kasEtmadSuiteService.updateSubscription(sub.id, { status: nextStatus });
                      setReloadKey(k => k + 1);
                      addNotification({
                        title: 'تحديث حالة الاشتراك',
                        message: `تم تحويل حالة الاشتراك إلى (${nextStatus}).`,
                        type: 'info'
                      });
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sub.status === 'نشط'
                        ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                    }`}
                  >
                    {sub.status === 'نشط' ? 'إيقاف الاشتراك مؤقتاً' : 'تفعيل الاشتراك الآن'}
                  </button>

                  <button
                    onClick={() => {
                      kasEtmadSuiteService.deleteSubscription(sub.id);
                      setReloadKey(k => k + 1);
                      addNotification({ title: 'تم الحذف', message: 'تم حذف الاشتراك بنجاح.', type: 'info' });
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                    title="حذف الاشتراك"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. ESTIMATE REQUESTS VIEW (طلبات عروض الأسعار) */}
      {/* ========================================================================= */}
      {activeTab === 'estimate-requests' && (
        <div className="space-y-6">
          {/* Top KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">إجمالي الطلبات</span>
                <span className="text-2xl font-bold font-mono text-foreground block mt-1">{estimateRequests.length}</span>
                <span className="text-[10px] text-muted-foreground">طلب تسعير مستلم</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <FilePlus className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">طلبات جديدة</span>
                <span className="text-2xl font-bold font-mono text-emerald-600 block mt-1">
                  {estimateRequests.filter(r => r.status === 'جديد').length}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">بانتظار دراسة التسعير</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-sky-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">تم تحويلها لعروض أسعار</span>
                <span className="text-2xl font-bold font-mono text-sky-600 block mt-1">
                  {estimateRequests.filter(r => r.status === 'تم التحويل لعرض سعر').length}
                </span>
                <span className="text-[10px] text-muted-foreground">عروض أسعار معتمدة</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">نسبة إنجاز التسعير</span>
                <span className="text-2xl font-bold font-mono text-amber-600 block mt-1">
                  {estimateRequests.length
                    ? Math.round((estimateRequests.filter(r => r.status === 'تم التحويل لعرض سعر').length / estimateRequests.length) * 100)
                    : 100}%
                </span>
                <span className="text-[10px] text-muted-foreground">معدل الاستجابة</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-amber-600" />
              <span>سجل طلبات عروض الأسعار والمواصفات المستلمة</span>
              <span className="text-xs text-muted-foreground font-mono">({estimateRequests.length})</span>
            </h3>

            <button
              onClick={() => {
                setFormData({});
                setShowAddEstimateRequestModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل طلب عرض سعر جديد</span>
            </button>
          </div>

          {/* Estimate Requests Table */}
          <div className="bg-card border border-border rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/60 text-muted-foreground border-b border-border/60">
                    <th className="px-4 py-3.5 text-right font-bold">طلب #</th>
                    <th className="px-4 py-3.5 text-right font-bold">العميل / الجهة الطالبة</th>
                    <th className="px-4 py-3.5 text-right font-bold">المواصفات والمتطلبات المطلوبة</th>
                    <th className="px-4 py-3.5 text-right font-bold">تاريخ الطلب</th>
                    <th className="px-4 py-3.5 text-right font-bold">الحالة</th>
                    <th className="px-4 py-3.5 text-right font-bold">الإجراءات والتحويل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {estimateRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <FilePlus className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <span>لا توجد طلبات عروض أسعار مسجلة</span>
                      </td>
                    </tr>
                  ) : (
                    estimateRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {req.requestNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {req.clientName}
                        </td>
                        <td className="px-4 py-3 text-foreground max-w-[340px] truncate leading-relaxed">
                          {req.description}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {req.requestedDate}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusPill(req.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {req.status === 'جديد' && (
                              <button
                                onClick={() => {
                                  kasEtmadSuiteService.updateEstimateRequest(req.id, { status: 'تم التحويل لعرض سعر' });
                                  setReloadKey(k => k + 1);
                                  addNotification({
                                    title: 'تم تحويل الطلب',
                                    message: `تم تحويل طلب (${req.clientName}) لعرض سعر بنجاح.`,
                                    type: 'success'
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>تحويل لعرض سعر</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                kasEtmadSuiteService.deleteEstimateRequest(req.id);
                                setReloadKey(k => k + 1);
                                addNotification({ title: 'تم الحذف', message: 'تم حذف الطلب بنجاح.', type: 'info' });
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                              title="حذف الطلب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. EMAIL TEMPLATES VIEW (قوالب البريد الإلكتروني) */}
      {/* ========================================================================= */}
      {activeTab === 'email-templates' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-pink-600" />
              <span>قوالب الرسائل والبريد الإلكتروني المعتمدة</span>
              <span className="text-xs text-muted-foreground font-mono">({emailTemplates.length} قالب)</span>
            </h3>

            <button
              onClick={() => {
                setFormData({});
                setShowAddTemplateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-pink-600/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء قالب بريد جديد</span>
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {emailTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-600 border border-pink-500/20">
                        {tmpl.category}
                      </span>
                      <h4 className="text-base font-bold text-foreground mt-2">
                        {tmpl.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        الموضوع: {tmpl.subject}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        kasEtmadSuiteService.deleteEmailTemplate(tmpl.id);
                        setReloadKey(k => k + 1);
                        addNotification({ title: 'تم الحذف', message: 'تم حذف القالب بنجاح.', type: 'info' });
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                      title="حذف القالب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Body Preview */}
                  <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/40 text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto font-mono mt-3">
                    {tmpl.body}
                  </div>

                  {/* Variables Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tmpl.variables.map((v, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-muted-foreground border border-border/50"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                  <span>آخر تحديث: {tmpl.lastModified}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(tmpl.body);
                      addNotification({ title: 'تم النسخ', message: 'تم نسخ نص القالب للحافظة.', type: 'success' });
                    }}
                    className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ القالب</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. UTILITIES VIEW (الأدوات المساعدة والحاسبات) */}
      {/* ========================================================================= */}
      {activeTab === 'utilities' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. VAT Calculator */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">حاسبة ضريبة القيمة المضافة (15%)</h3>
                  <p className="text-[11px] text-muted-foreground">إضافة الضريبة على المبلغ الأساسي</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">المبلغ الأساسي (قبل الضريبة)</label>
                  <input
                    type="number"
                    placeholder="أدخل المبلغ..."
                    value={formData.vatAmount || ''}
                    onChange={e => setFormData({ ...formData, vatAmount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                {formData.vatAmount && parseFloat(formData.vatAmount) > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">المبلغ الأساسي:</span>
                      <span className="font-bold font-mono">{parseFloat(formData.vatAmount).toLocaleString()} ⃁</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">ضريبة 15%:</span>
                      <span className="font-bold font-mono text-emerald-600">
                        {(parseFloat(formData.vatAmount) * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-emerald-500/20 pt-2 font-bold">
                      <span className="text-emerald-700 dark:text-emerald-400">الإجمالي النهائي:</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">
                        {(parseFloat(formData.vatAmount) * 1.15).toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground pt-1 border-t border-emerald-500/10 leading-relaxed">
                      فقط {tafqeet(Math.round(parseFloat(formData.vatAmount) * 1.15))} لا غير
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Reverse VAT Calculator */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">الحاسبة العكسية للضريبة</h3>
                  <p className="text-[11px] text-muted-foreground">استخراج أصل المبلغ من الإجمالي الشامل</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">المبلغ الإجمالي (شامل الضريبة)</label>
                  <input
                    type="number"
                    placeholder="أدخل الإجمالي..."
                    value={formData.reverseVat || ''}
                    onChange={e => setFormData({ ...formData, reverseVat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                {formData.reverseVat && parseFloat(formData.reverseVat) > 0 && (
                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">أصل المبلغ (قبل الضريبة):</span>
                      <span className="font-bold font-mono">
                        {(parseFloat(formData.reverseVat) / 1.15).toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">قيمة الضريبة المقتطعة:</span>
                      <span className="font-bold font-mono text-sky-600">
                        {(parseFloat(formData.reverseVat) - parseFloat(formData.reverseVat) / 1.15).toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-sky-500/20 pt-2 font-bold">
                      <span className="text-sky-700 dark:text-sky-400">الإجمالي المدخل:</span>
                      <span className="font-mono text-sky-700 dark:text-sky-400">
                        {parseFloat(formData.reverseVat).toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Fast Tafqeet Tool */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">محول الأرقام إلى نصوص (التفقيط)</h3>
                  <p className="text-[11px] text-muted-foreground">توليد الصياغة الرسمية للعقود والفواتير</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">المبلغ الرقمي بالريال</label>
                  <input
                    type="number"
                    placeholder="مثال: 1250000..."
                    value={formData.tafqeetNumber || ''}
                    onChange={e => setFormData({ ...formData, tafqeetNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                {formData.tafqeetNumber && parseFloat(formData.tafqeetNumber) > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-[11px] text-muted-foreground block font-medium">الصيغة النصية المعتمدة:</span>
                    <p className="text-xs font-bold text-foreground leading-relaxed">
                      فقط {tafqeet(parseFloat(formData.tafqeetNumber))} لا غير.
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(`فقط ${tafqeet(parseFloat(formData.tafqeetNumber))} لا غير.`);
                        addNotification({ title: 'تم النسخ', message: 'تم نسخ النص المفقّط.', type: 'success' });
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px] flex items-center gap-1 mt-2 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ النص</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL / OFFICIAL ZATCA PRINT PREVIEW */}
      {/* ========================================================================= */}
      {showDetailModal && selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="text-xs text-slate-500 font-bold tracking-wider">مؤسسة خالد عبدالعزيز السليم للتجارة والمقاولات (كاس)</div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">فاتورة ضريبية إلكترونية ZATCA</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">الرقم الضريبي: 310245879600003</div>
              </div>
              <div className="p-2 border rounded-xl bg-slate-50 text-center">
                <QrCode className="w-16 h-16 mx-auto text-slate-900" />
                <span className="text-[9px] font-bold text-slate-600 block mt-1">ZATCA QR VERIFIED</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-500 block">رقم الفاتورة:</span>
                <span className="font-mono font-bold text-sm text-slate-900">{selectedDetail.invoiceNumber || selectedDetail.estimateNumber || selectedDetail.referenceNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">التاريخ:</span>
                <span className="font-mono font-bold text-sm text-slate-900">{selectedDetail.date || selectedDetail.createdAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block">العميل / الجهة:</span>
                <span className="font-bold text-sm text-slate-900">{selectedDetail.clientName || selectedDetail.governmentEntity}</span>
              </div>
              <div>
                <span className="text-slate-500 block">الحالة:</span>
                <span className="font-bold text-emerald-700">{selectedDetail.status}</span>
              </div>
            </div>

            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-slate-100 font-bold border-b">
                <tr>
                  <th className="p-2">البند</th>
                  <th className="p-2 w-16">الكمية</th>
                  <th className="p-2 w-24">السعر</th>
                  <th className="p-2 w-24 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(selectedDetail.items || [{ description: selectedDetail.title || 'توريدات معتمدة', qty: 1, rate: selectedDetail.amount || selectedDetail.totalItemsValue || 1000, total: selectedDetail.amount || selectedDetail.totalItemsValue || 1150 }]).map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2 font-medium">{it.description}</td>
                    <td className="p-2 font-mono">{it.qty}</td>
                    <td className="p-2 font-mono">{it.rate?.toLocaleString()} ⃁</td>
                    <td className="p-2 text-left font-mono font-bold">{(it.qty * it.rate)?.toLocaleString()} ⃁</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 p-4 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between font-mono">
                <span>المبلغ الخاضع للضريبة:</span>
                <span className="font-bold">{(selectedDetail.amount || selectedDetail.totalItemsValue || selectedDetail.totalAmount || 0).toLocaleString()} ⃁</span>
              </div>
              <div className="flex justify-between font-mono text-emerald-700 font-bold">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span>{(selectedDetail.taxAmount || ((selectedDetail.amount || selectedDetail.totalItemsValue || 0) * 0.15)).toLocaleString()} ⃁</span>
              </div>
              <div className="flex justify-between font-mono font-extrabold text-sm border-t pt-2 text-slate-900">
                <span>المبلغ الإجمالي المستحق:</span>
                <span>{((selectedDetail.amount || selectedDetail.totalItemsValue || selectedDetail.totalAmount || 0) * 1.15).toLocaleString()} ⃁</span>
              </div>
              <div className="text-[11px] text-slate-600 pt-1 font-semibold">
                التفقيط: {tafqeet((selectedDetail.amount || selectedDetail.totalItemsValue || selectedDetail.totalAmount || 0) * 1.15)}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند الرسمي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD INVOICE */}
      {/* ========================================================================= */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>إنشاء فاتورة ضريبية ذكية ZATCA المرحلة الثانية</span>
              </h3>
              <button onClick={() => setShowAddInvoiceModal(false)} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">العميل / الجهة *</label>
                <select
                  value={formData.clientName || ''}
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border"
                >
                  <option value="">اختر العميل...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.company}>{c.company}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">المشروع المرتبط</label>
                <input
                  type="text"
                  placeholder="مشروع توريدات..."
                  value={formData.project || ''}
                  onChange={e => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">تاريخ الفاتورة</label>
                <input
                  type="date"
                  value={formData.date || new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  value={formData.dueDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border font-mono"
                />
              </div>
            </div>

            {/* Itemized Rows Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground">بنود الفاتورة وجدول الكميات:</span>
                <button
                  type="button"
                  onClick={() => setItemLines([...itemLines, { description: 'بند جديد', qty: 1, rate: 500, taxPct: 15, total: 575 }])}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ بند إضافي</span>
                </button>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-secondary text-foreground font-semibold">
                    <tr>
                      <th className="p-2">الوصف</th>
                      <th className="p-2 w-20">الكمية</th>
                      <th className="p-2 w-28">السعر (⃁)</th>
                      <th className="p-2 w-28 text-left">الإجمالي</th>
                      <th className="p-2 w-10 text-center">×</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {itemLines.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <input
                            type="text"
                            value={it.description}
                            onChange={e => {
                              const copy = [...itemLines];
                              copy[idx].description = e.target.value;
                              setItemLines(copy);
                            }}
                            className="w-full px-2 py-1 bg-transparent border rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={it.qty}
                            onChange={e => {
                              const copy = [...itemLines];
                              copy[idx].qty = parseFloat(e.target.value) || 0;
                              copy[idx].total = Number((copy[idx].qty * copy[idx].rate * 1.15).toFixed(2));
                              setItemLines(copy);
                            }}
                            className="w-full px-2 py-1 bg-transparent border rounded font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={it.rate}
                            onChange={e => {
                              const copy = [...itemLines];
                              copy[idx].rate = parseFloat(e.target.value) || 0;
                              copy[idx].total = Number((copy[idx].qty * copy[idx].rate * 1.15).toFixed(2));
                              setItemLines(copy);
                            }}
                            className="w-full px-2 py-1 bg-transparent border rounded font-mono"
                          />
                        </td>
                        <td className="p-2 text-left font-mono font-bold">{it.total.toLocaleString()} ⃁</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setItemLines(itemLines.filter((_, i) => i !== idx))}
                            className="text-rose-600 font-bold"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Totals & Tafqeet */}
              <div className="p-3 bg-secondary/40 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between font-mono">
                  <span>المبلغ قبل الضريبة:</span>
                  <span className="font-bold">{itemLines.reduce((s, it) => s + (it.qty * it.rate), 0).toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between font-mono text-emerald-600">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-bold">{(itemLines.reduce((s, it) => s + (it.qty * it.rate), 0) * 0.15).toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between font-mono font-bold text-sm border-t pt-1 text-foreground">
                  <span>الإجمالي النهائي:</span>
                  <span>{(itemLines.reduce((s, it) => s + (it.qty * it.rate), 0) * 1.15).toLocaleString()} ⃁</span>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1">
                  التفقيط: <span className="font-semibold text-foreground">{tafqeet(itemLines.reduce((s, it) => s + (it.qty * it.rate), 0) * 1.15)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setShowAddInvoiceModal(false)} className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground text-xs">إلغاء</button>
              <button onClick={handleSaveInvoice} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">حفظ وإصدار الفاتورة</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD ESTIMATE */}
      {/* ========================================================================= */}
      {showAddEstimateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">إصدار عرض سعر وعطاء تقديري جديد</h3>
              <button onClick={() => setShowAddEstimateModal(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1">العميل / الجهة *</label>
                <input
                  type="text"
                  placeholder="اسم الجهة أو العميل..."
                  value={formData.clientName || ''}
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">المشروع</label>
                <input
                  type="text"
                  placeholder="مشروع..."
                  value={formData.project || ''}
                  onChange={e => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddEstimateModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs">إلغاء</button>
              <button onClick={handleSaveEstimate} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">حفظ عرض السعر</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD PAYMENT */}
      {/* ========================================================================= */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-foreground">تسجيل سند قبض بنكي جديد</h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">رقم الفاتورة *</label>
                <input
                  type="text"
                  placeholder="INV-000001"
                  value={formData.invoiceNumber || ''}
                  onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">المبلغ المحصل (⃁) *</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={formData.amount || ''}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">طريقة السداد</label>
                <select
                  value={formData.paymentMode || 'تحويل بنكي'}
                  onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                >
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="سداد">سداد</option>
                  <option value="بطاقة مدى / ائتمان">بطاقة مدى / ائتمان</option>
                  <option value="شيك مصدّق">شيك مصدّق</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddPaymentModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs">إلغاء</button>
              <button onClick={handleSavePayment} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">حفظ السند</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD ITEM */}
      {/* ========================================================================= */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-foreground">إضافة صنف جديد لجدول الكميات</h3>
              <button onClick={() => setShowAddItemModal(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">اسم / وصف البند *</label>
                <input
                  type="text"
                  placeholder="وصف البند..."
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">السعر الإفرادي (⃁) *</label>
                <input
                  type="number"
                  placeholder="150"
                  value={formData.rate || ''}
                  onChange={e => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">المجموعة</label>
                <select
                  value={formData.group || 'توريدات حكومية'}
                  onChange={e => setFormData({ ...formData, group: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                >
                  <option value="توريدات حكومية">توريدات حكومية</option>
                  <option value="ضيافة وتمور">ضيافة وتمور</option>
                  <option value="ديكور ومعارض">ديكور ومعارض</option>
                  <option value="أجهزة وتقنية">أجهزة وتقنية</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddItemModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs">إلغاء</button>
              <button onClick={handleSaveItem} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">حفظ الصنف</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CLIENT */}
      {/* ========================================================================= */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-foreground">إضافة عميل / جهة حكومية جديدة</h3>
              <button onClick={() => setShowAddClientModal(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">اسم المنشأة / الجهة *</label>
                <input
                  type="text"
                  placeholder="أمانة، وزارة، شركة..."
                  value={formData.company || ''}
                  onChange={e => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">رقم الهاتف *</label>
                <input
                  type="text"
                  placeholder="011..."
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">الرقم الضريبي VAT</label>
                <input
                  type="text"
                  placeholder="300000000000003"
                  value={formData.vatNumber || ''}
                  onChange={e => setFormData({ ...formData, vatNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddClientModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs">إلغاء</button>
              <button onClick={handleSaveClient} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">حفظ العميل</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CATEGORY */}
      {/* ========================================================================= */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-pricing max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  {editingCategory ? 'تعديل بيانات التصنيف' : 'إضافة تصنيف منافسة حكومية جديد'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1.5">اسم التصنيف المعتمد *</label>
                <input
                  type="text"
                  placeholder="المقاولات، التجارة، المعارض..."
                  value={formData.catName || ''}
                  onChange={e => setFormData({ ...formData, catName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1.5">رمز / كود التصنيف في منصة اعتماد *</label>
                <input
                  type="text"
                  placeholder="01, 02, 9987..."
                  value={formData.catCode || ''}
                  onChange={e => setFormData({ ...formData, catCode: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1.5">الوصف ونطاق الأعمال</label>
                <textarea
                  rows={3}
                  placeholder="شرح نطاق الأعمال والأنشطة التابعة لهذا التصنيف..."
                  value={formData.catDesc || ''}
                  onChange={e => setFormData({ ...formData, catDesc: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
              <button
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="button-outline-on-light !py-2 !px-4 !text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCategory}
                className="button-primary-pill !py-2 !px-5 !text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {editingCategory ? 'حفظ التعديلات' : 'إضافة التصنيف الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT STAFF */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-pricing max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">
                  {editingStaff ? 'تعديل بيانات عضو الطاقم' : 'إضافة عضو جديد في الطاقم'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddStaffModal(false);
                  setEditingStaff(null);
                }}
                className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  placeholder="الاسم الثلاثي أو الثنائي..."
                  value={formData.staffName || ''}
                  onChange={e => setFormData({ ...formData, staffName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1.5">البريد الإلكتروني المعتمد *</label>
                <input
                  type="email"
                  placeholder="name@kas.com.sa"
                  value={formData.staffEmail || ''}
                  onChange={e => setFormData({ ...formData, staffEmail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1.5">رقم الهاتف / الجوال</label>
                <input
                  type="tel"
                  placeholder="05XXXXXXXX"
                  value={formData.staffPhone || ''}
                  onChange={e => setFormData({ ...formData, staffPhone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1.5">الدور الوظيفي والصلاحيات</label>
                <select
                  value={formData.staffRole || 'Employee'}
                  onChange={e => setFormData({ ...formData, staffRole: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-xs font-semibold"
                >
                  <option value="Employee / موظف تشغيل">Employee / موظف تشغيل</option>
                  <option value="المنافسات / مسؤول دراسة العطاءات">المنافسات / مسؤول دراسة العطاءات</option>
                  <option value="المحاسب المالي المعتمد">المحاسب المالي المعتمد</option>
                  <option value="مدير العمليات">مدير العمليات</option>
                  <option value="Super_Admin / مدير عام">Super_Admin / مدير عام</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60">
              <button
                onClick={() => {
                  setShowAddStaffModal(false);
                  setEditingStaff(null);
                }}
                className="button-outline-on-light !py-2 !px-4 !text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveStaff}
                className="button-primary-pill !py-2 !px-5 !text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {editingStaff ? 'حفظ التعديلات' : 'إضافة العضو للطاقم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLIENT 360 PROFILE (ملف العميل المتكامل) */}
      {/* ========================================================================= */}
      {selectedClientProfile && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{selectedClientProfile.company}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                      عميل معتمد
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الرقم الضريبي: <span className="font-mono">{selectedClientProfile.vatNumber || '310245879600003'}</span> • المدينة: {selectedClientProfile.city}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClientProfile(null)} 
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border">
                <span className="text-[11px] text-muted-foreground block">إجمالي التعاملات</span>
                <span className="text-base font-bold font-mono text-foreground mt-0.5 block">
                  {invoices.filter(i => i.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(i.clientName)).reduce((s, i) => s + i.amount, 0).toLocaleString()} ⃁
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border">
                <span className="text-[11px] text-muted-foreground block">المسدد</span>
                <span className="text-base font-bold font-mono text-emerald-600 mt-0.5 block">
                  {invoices.filter(i => i.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(i.clientName)).reduce((s, i) => s + (i.paidAmount || 0), 0).toLocaleString()} ⃁
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border">
                <span className="text-[11px] text-muted-foreground block">المتبقي</span>
                <span className="text-base font-bold font-mono text-rose-500 mt-0.5 block">
                  {(invoices.filter(i => i.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(i.clientName)).reduce((s, i) => s + i.amount, 0) - invoices.filter(i => i.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(i.clientName)).reduce((s, i) => s + (i.paidAmount || 0), 0)).toLocaleString()} ⃁
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border">
                <span className="text-[11px] text-muted-foreground block">العقود النشطة</span>
                <span className="text-base font-bold font-mono text-amber-600 mt-0.5 block">
                  {contracts.filter(c => c.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(c.clientName)).length} عقد
                </span>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="flex items-center gap-1 border-b border-border text-xs font-bold">
              {[
                { id: 'info', label: 'معلومات الجهة والاتصال' },
                { id: 'invoices', label: 'سجل الفواتير' },
                { id: 'estimates', label: 'عروض الأسعار' },
                { id: 'contracts', label: 'العقود والاتفاقيات' },
                { id: 'projects', label: 'المشاريع المرتبطة' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setClientProfileTab(tab.id as any)}
                  className={`px-4 py-2 border-b-2 transition-all ${
                    clientProfileTab === tab.id
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {clientProfileTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-3 p-4 rounded-2xl bg-secondary/30 border border-border/60">
                  <h4 className="font-bold text-foreground text-sm">بيانات الاتصال والتواصل</h4>
                  <div className="space-y-2 text-muted-foreground">
                    <div>المسؤول الرئيسي: <span className="font-semibold text-foreground">{selectedClientProfile.primaryContact}</span></div>
                    <div>الهاتف / الجوال: <span className="font-mono text-foreground">{selectedClientProfile.phone}</span></div>
                    <div>البريد الإلكتروني: <span className="font-mono text-foreground">{selectedClientProfile.email}</span></div>
                    <div>المدينة / المقر: <span className="text-foreground">{selectedClientProfile.city}</span></div>
                    <div>العنوان: <span className="text-foreground">{selectedClientProfile.address || 'شارع الملك فهد، الرياض'}</span></div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-2xl bg-secondary/30 border border-border/60">
                  <h4 className="font-bold text-foreground text-sm">التصنيف والمجموعات</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClientProfile.groups.map((g, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                        {g}
                      </span>
                    ))}
                  </div>
                  <div className="pt-3 border-t text-muted-foreground">
                    تاريخ التسجيل: <span className="font-mono text-foreground">{selectedClientProfile.createdAt}</span>
                  </div>
                </div>
              </div>
            )}

            {clientProfileTab === 'invoices' && (
              <div className="border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-secondary text-foreground font-semibold">
                    <tr>
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">تاريخ الاستحقاق</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {invoices.filter(i => i.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(i.clientName)).map(inv => (
                      <tr key={inv.id} className="hover:bg-emerald-500/5">
                        <td className="p-3 font-mono font-bold text-emerald-600">{inv.invoiceNumber}</td>
                        <td className="p-3 text-left font-mono font-bold">{inv.amount.toLocaleString()} ⃁</td>
                        <td className="p-3 font-mono text-muted-foreground">{inv.date}</td>
                        <td className="p-3 font-mono text-muted-foreground">{inv.dueDate}</td>
                        <td className="p-3">{getStatusPill(inv.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {clientProfileTab === 'contracts' && (
              <div className="space-y-3">
                {contracts.filter(c => c.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(c.clientName)).map(cnt => (
                  <div key={cnt.id} className="p-4 rounded-2xl bg-secondary/30 border border-border/60 flex items-center justify-between text-xs">
                    <div>
                      <h5 className="font-bold text-foreground">{cnt.subject}</h5>
                      <div className="text-muted-foreground mt-0.5 font-mono">{cnt.startDate} إلى {cnt.endDate} • {cnt.contractType}</div>
                    </div>
                    <div className="text-left font-mono font-bold text-emerald-600">
                      {cnt.contractValue.toLocaleString()} ⃁
                    </div>
                  </div>
                ))}
              </div>
            )}

            {clientProfileTab === 'projects' && (
              <div className="space-y-3">
                {projects.filter(p => p.clientName.includes(selectedClientProfile.company) || selectedClientProfile.company.includes(p.clientName)).map(proj => (
                  <div key={proj.id} className="p-4 rounded-2xl bg-secondary/30 border border-border/60 space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{proj.projectName}</span>
                      <span className="font-mono text-emerald-600">{proj.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button
                onClick={() => setSelectedClientProfile(null)}
                className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold text-foreground"
              >
                إغلاق
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFormData({ clientName: selectedClientProfile.company });
                    setShowAddInvoiceModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء فاتورة لهذا العميل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK PAYMENT RECORDING */}
      {/* ========================================================================= */}
      {showQuickPayModal && quickPayInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>تسجيل دفعة سداد للفاتورة</span>
              </h3>
              <button onClick={() => setShowQuickPayModal(false)} className="p-1 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم الفاتورة:</span>
                  <span className="font-mono font-bold text-foreground">{quickPayInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">العميل:</span>
                  <span className="font-bold text-foreground">{quickPayInvoice.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ المستحق:</span>
                  <span className="font-mono font-bold text-rose-500">{(quickPayInvoice.amount - (quickPayInvoice.paidAmount || 0)).toLocaleString()} ⃁</span>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">مبلغ السداد المدفوع (⃁) *</label>
                <input
                  type="number"
                  placeholder="المبلغ..."
                  defaultValue={quickPayInvoice.amount - (quickPayInvoice.paidAmount || 0)}
                  id="quickPayAmountInput"
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">طريقة السداد</label>
                <select id="quickPayModeInput" defaultValue="تحويل بنكي" className="w-full px-3 py-2 bg-secondary/50 border rounded-xl">
                  <option value="تحويل بنكي">تحويل بنكي (الراجحي / الإنماء)</option>
                  <option value="سداد">نظام سداد للمدفوعات الحكومية</option>
                  <option value="بطاقة مدى / ائتمان">بطاقة مدى / ائتمان</option>
                  <option value="شيك مصدّق">شيك مصرفي مصدّق</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">الرقم المرجعي / رقم المعاملة</label>
                <input
                  type="text"
                  placeholder="TXN-..."
                  id="quickPayTxnInput"
                  defaultValue={`TXN-${Date.now().toString().slice(-6)}`}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowQuickPayModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold">إلغاء</button>
              <button
                onClick={() => {
                  const amtInput = document.getElementById('quickPayAmountInput') as HTMLInputElement;
                  const modeInput = document.getElementById('quickPayModeInput') as HTMLSelectElement;
                  const txnInput = document.getElementById('quickPayTxnInput') as HTMLInputElement;
                  const amt = parseFloat(amtInput?.value) || (quickPayInvoice.amount - (quickPayInvoice.paidAmount || 0));

                  kasEtmadSuiteService.addPayment({
                    paymentNumber: `PAY-${String(payments.length + 1).padStart(6, '0')}`,
                    invoiceNumber: quickPayInvoice.invoiceNumber,
                    paymentMode: (modeInput?.value || 'تحويل بنكي') as any,
                    transactionId: txnInput?.value || `TXN-${Date.now()}`,
                    clientName: quickPayInvoice.clientName,
                    amount: amt,
                    date: new Date().toISOString().split('T')[0],
                    notes: `سداد مسجل عبر منظومة سحابة كاس`
                  });

                  const newPaid = (quickPayInvoice.paidAmount || 0) + amt;
                  const newStatus = newPaid >= quickPayInvoice.amount ? 'مدفوع' : 'مدفوع جزئيًا';
                  kasEtmadSuiteService.updateInvoice(quickPayInvoice.id, {
                    paidAmount: newPaid,
                    status: newStatus as any
                  });

                  addNotification({
                    title: 'تم تسجيل السداد بنجاح',
                    message: `تم قيد دفعة بمبلغ ${amt.toLocaleString()} ⃁ للفاتورة ${quickPayInvoice.invoiceNumber}`,
                    type: 'success'
                  });

                  setShowQuickPayModal(false);
                  setReloadKey(k => k + 1);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs"
              >
                تأكيد وقيد السداد
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: ADD PROPOSAL (إنشاء عرض تجاري) */}
      {/* ========================================================================= */}
      {showAddProposalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-600" />
                <span>إنشاء عرض تجاري جديد (Proposal)</span>
              </h3>
              <button onClick={() => setShowAddProposalModal(false)} className="p-1 text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">موضوع العرض *</label>
                <input
                  type="text"
                  placeholder="مثال: عرض توريد مواد وتجهيزات..."
                  value={formData.subject || ''}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">العميل / الجهة المستهدفة *</label>
                <input
                  type="text"
                  placeholder="اسم الجهة..."
                  value={formData.toClient || ''}
                  onChange={e => setFormData({ ...formData, toClient: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">إجمالي قيمة العرض (⃁) *</label>
                <input
                  type="number"
                  placeholder="المبلغ..."
                  value={formData.totalAmount || ''}
                  onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">تاريخ العرض</label>
                <input
                  type="date"
                  value={formData.date || new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">صلاحية العرض حتى</label>
                <input
                  type="date"
                  value={formData.openTill || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, openTill: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">المشروع المرتبط</label>
                <input
                  type="text"
                  placeholder="اسم المشروع إن وجد..."
                  value={formData.project || ''}
                  onChange={e => setFormData({ ...formData, project: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">الحالة</label>
                <select
                  value={formData.status || 'مسودة'}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                >
                  <option value="مسودة">مسودة</option>
                  <option value="مرسل">مرسل للعميل</option>
                  <option value="مقبول">مقبول ومعتمد</option>
                  <option value="مرفوض">مرفوض</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddProposalModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold">إلغاء</button>
              <button onClick={handleSaveProposal} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs">
                حفظ وإصدار العرض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CREDIT NOTE (إشعار ائتمان) */}
      {/* ========================================================================= */}
      {showAddCreditNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-orange-600" />
                <span>إصدار إشعار ائتمان مالي جديد (Credit Note)</span>
              </h3>
              <button onClick={() => setShowAddCreditNoteModal(false)} className="p-1 text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">العميل *</label>
                <input
                  type="text"
                  placeholder="اسم العميل..."
                  value={formData.clientName || ''}
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">رقم الفاتورة المرجعية</label>
                <input
                  type="text"
                  placeholder="INV-000001"
                  value={formData.invoiceRef || ''}
                  onChange={e => setFormData({ ...formData, invoiceRef: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">مبلغ الإشعار (⃁) *</label>
                <input
                  type="number"
                  placeholder="المبلغ..."
                  value={formData.totalAmount || ''}
                  onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">التاريخ</label>
                <input
                  type="date"
                  value={formData.date || new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddCreditNoteModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold">إلغاء</button>
              <button onClick={handleSaveCreditNote} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs">
                قيد إشعار الائتمان
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SUBSCRIPTION (إنشاء اشتراك دوري) */}
      {/* ========================================================================= */}
      {showAddSubscriptionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-teal-600" />
                <span>تسجيل اشتراك دوري جديد</span>
              </h3>
              <button onClick={() => setShowAddSubscriptionModal(false)} className="p-1 text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">اسم / حزمة الاشتراك *</label>
                <input
                  type="text"
                  placeholder="مثال: اشتراك صيانة سنوية..."
                  value={formData.subscriptionName || ''}
                  onChange={e => setFormData({ ...formData, subscriptionName: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">العميل *</label>
                <input
                  type="text"
                  placeholder="اسم العميل..."
                  value={formData.clientName || ''}
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">المبلغ الدوري (⃁) *</label>
                  <input
                    type="number"
                    placeholder="المبلغ..."
                    value={formData.amount || ''}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">دورة الفوترة</label>
                  <select
                    value={formData.billingInterval || 'شهري'}
                    onChange={e => setFormData({ ...formData, billingInterval: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                  >
                    <option value="شهري">شهري</option>
                    <option value="ربع سنوي">ربع سنوي (3 أشهر)</option>
                    <option value="نصف سنوي">نصف سنوي (6 أشهر)</option>
                    <option value="سنوي">سنوي</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    value={formData.startDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">تاريخ الفوترة القادمة</label>
                  <input
                    type="date"
                    value={formData.nextBillingDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                    onChange={e => setFormData({ ...formData, nextBillingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddSubscriptionModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold">إلغاء</button>
              <button onClick={handleSaveSubscription} className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs">
                حفظ وتفعيل الاشتراك
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD ESTIMATE REQUEST (طلب عرض سعر) */}
      {/* ========================================================================= */}
      {showAddEstimateRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-amber-600" />
                <span>تسجيل طلب عرض سعر جديد</span>
              </h3>
              <button onClick={() => setShowAddEstimateRequestModal(false)} className="p-1 text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">اسم العميل / الجهة الطالبة *</label>
                <input
                  type="text"
                  placeholder="مثال: وزارة النقل..."
                  value={formData.clientName || ''}
                  onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">تفاصيل ومواصفات الطلب *</label>
                <textarea
                  rows={4}
                  placeholder="اكتب متطلبات العرض والمواصفات المطلوبة..."
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">تاريخ استلام الطلب</label>
                <input
                  type="date"
                  value={formData.requestedDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setFormData({ ...formData, requestedDate: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddEstimateRequestModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold">إلغاء</button>
              <button onClick={handleSaveEstimateRequest} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs">
                تسجيل الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD EMAIL TEMPLATE (قالب بريد) */}
      {/* ========================================================================= */}
      {showAddTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-pink-600" />
                <span>إنشاء قالب بريد إلكتروني جديد</span>
              </h3>
              <button onClick={() => setShowAddTemplateModal(false)} className="p-1 text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">اسم القالب *</label>
                <input
                  type="text"
                  placeholder="مثال: إشعار استحقاق فاتورة..."
                  value={formData.templateName || ''}
                  onChange={e => setFormData({ ...formData, templateName: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">تصنيف القالب</label>
                <select
                  value={formData.type || 'الفواتير'}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                >
                  <option value="الفواتير">الفواتير</option>
                  <option value="عروض الأسعار">عروض الأسعار</option>
                  <option value="إشعارات الدفع">إشعارات الدفع</option>
                  <option value="المنافسات">المنافسات</option>
                  <option value="عام">عام</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">موضوع الرسالة (Subject) *</label>
                <input
                  type="text"
                  placeholder="موضوع البريد..."
                  value={formData.subject || ''}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">نص الرسالة (Body) *</label>
                <textarea
                  rows={5}
                  placeholder="نص البريد مع المتغيرات مثل {client_name} و {invoice_number}..."
                  value={formData.body || ''}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary/50 border rounded-xl font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddTemplateModal(false)} className="px-4 py-2 bg-secondary rounded-xl text-xs font-bold">إلغاء</button>
              <button onClick={handleSaveEmailTemplate} className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs">
                حفظ القالب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
