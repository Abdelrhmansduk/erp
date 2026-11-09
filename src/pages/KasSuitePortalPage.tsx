import React, { useState, useMemo } from 'react';
import { 
  Building2, Briefcase, FileSpreadsheet, Layers, ShieldCheck, 
  Users, Truck, Receipt, CloudLightning, ShieldAlert, ArrowRight,
  ChevronLeft, Award, Sparkles, MapPin, PhoneCall, ExternalLink,
  CheckCircle2, Flame, Calculator, Store, Plus, Search, Filter,
  Download, Printer, Eye, Edit3, Trash2, Check, X, RefreshCw,
  QrCode, Calendar, Clock, DollarSign, TrendingUp, AlertCircle,
  FileCheck, Shield, ChevronDown, CheckCheck, Send, BarChart3,
  Percent, FileText, ArrowUpRight
} from 'lucide-react';
import { KasNavigationSidebar, KasDepartmentId, KAS_BRANCHES } from '../components/kas/KasNavigationSidebar';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { useCompany } from '../contexts/CompanyContext';
import { useIamSession } from '../contexts/IamSessionContext';
import { useAppStore } from '../stores/appStore';
import { kasEtmadSuiteService } from '../services/kasEtmadSuiteService';
import { tafqeet } from '../services/tafqeetService';

interface KasSuitePortalPageProps {
  onReturnToErp?: () => void;
}

export const KasSuitePortalPage: React.FC<KasSuitePortalPageProps> = ({ onReturnToErp }) => {
  const { setActiveCompanyId } = useCompany();
  const { currentUser } = useIamSession();
  const { addNotification } = useAppStore();

  // Active Department
  const [activeDept, setActiveDept] = useState<KasDepartmentId>('command-center');
  const [selectedBranch, setSelectedBranch] = useState<string>(KAS_BRANCHES[0].name);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showAddTenderModal, setShowAddTenderModal] = useState<boolean>(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [showAddPoModal, setShowAddPoModal] = useState<boolean>(false);
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState<boolean>(false);

  // Form states
  const [newTender, setNewTender] = useState({
    title: '',
    referenceNumber: `KAS-ETM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    entity: 'وزارة الموارد البشرية والتنمية الاجتماعية',
    budget: 450000,
    deadline: '2026-10-15',
    category: 'توريدات وتشغيل',
  });

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    commercialName: '',
    crNumber: '1010' + Math.floor(100000 + Math.random() * 900000),
    category: 'مواد ومستلزمات مكتبية وتقنية',
    contactPerson: '',
    phone: '05' + Math.floor(10000000 + Math.random() * 90000000),
    rating: 5,
  });

  const [newPO, setNewPO] = useState({
    poNumber: `PO-KAS-2026-${Math.floor(100 + Math.random() * 900)}`,
    supplierName: '',
    projectName: 'مشروع توريدات احتفالات اليوم الوطني',
    amount: 85000,
    deliveryDate: '2026-09-20',
  });

  const [newInvoice, setNewInvoice] = useState({
    invoiceNumber: `INV-KAS-${Math.floor(10000 + Math.random() * 90000)}`,
    clientName: 'الهيئة العامة للموانئ',
    amount: 95018.75,
    taxRate: 15,
    notes: 'توريدات وضيافة معتمدة',
  });

  // Dynamic lists from Service
  const [tenders, setTenders] = useState([
    {
      id: 'TND-01',
      referenceNumber: 'ETM-2026-88991',
      title: 'توريد وتشغيل تجهيزات ضيافة لفعاليات اليوم الوطني 96',
      entity: 'وزارة الثقافة — هيئة الفعاليات',
      budget: 680000,
      deadline: '2026-09-18',
      status: 'ترسية معتمدة',
      category: 'فعاليات وتوريد',
      itemsCount: 14,
    },
    {
      id: 'TND-02',
      referenceNumber: 'ETM-2026-90412',
      title: 'تأمين مستلزمات مكتبية وأجهزة تقنية للمقرات الإدارية',
      entity: 'الهيئة العامة للموانئ',
      budget: 340000,
      deadline: '2026-10-01',
      status: 'قيد التسعير',
      category: 'أجهزة وتقنية',
      itemsCount: 22,
    },
    {
      id: 'TND-03',
      referenceNumber: 'ETM-2026-91544',
      title: 'مشروع صيانة وتأهيل وحدات الاستقبال والضيافة',
      entity: 'أمانة منطقة الرياض',
      budget: 520000,
      deadline: '2026-10-10',
      status: 'طرح عام',
      category: 'تشغيل وصيانة',
      itemsCount: 9,
    },
    {
      id: 'TND-04',
      referenceNumber: 'ETM-2026-92811',
      title: 'توريد إعاشة وضيافة متكاملة للمراكز الميدانية',
      entity: 'وزارة الموارد البشرية',
      budget: 410000,
      deadline: '2026-10-25',
      status: 'قيد التقديم',
      category: 'إعاشة وضيافة',
      itemsCount: 35,
    },
  ]);

  const [suppliers, setSuppliers] = useState([
    { id: 'SUP-01', name: 'شركة التوريدات الصناعية المتحدة', category: 'مواد ومعدات', phone: '0501122334', rating: 4.9, activeProjects: 3, totalVolume: 420000 },
    { id: 'SUP-02', name: 'مؤسسة الرياض للضيافة والتموين', category: 'إعاشة وضيافة', phone: '0559988776', rating: 4.8, activeProjects: 2, totalVolume: 285000 },
    { id: 'SUP-03', name: 'شركة التقنية المتقدمة للحوسبة', category: 'أجهزة وأنظمة', phone: '0543322110', rating: 5.0, activeProjects: 4, totalVolume: 610000 },
    { id: 'SUP-04', name: 'مجموعة الأفق لتجهيز الفعاليات', category: 'ديكور وصوتيات', phone: '0538877665', rating: 4.7, activeProjects: 1, totalVolume: 150000 },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState([
    { id: 'PO-01', poNumber: 'PO-KAS-2026-881', supplierName: 'شركة التوريدات الصناعية المتحدة', project: 'مشروع فعاليات اليوم الوطني', amount: 95000, status: 'تم الصرف', date: '2026-09-01' },
    { id: 'PO-02', poNumber: 'PO-KAS-2026-882', supplierName: 'مؤسسة الرياض للضيافة والتموين', project: 'تجهيزات الإعاشة لهيئة الموانئ', amount: 48500, status: 'قيد التجهيز', date: '2026-09-03' },
    { id: 'PO-03', poNumber: 'PO-KAS-2026-883', supplierName: 'شركة التقنية المتقدمة للحوسبة', project: 'تحديث خوادم وأجهزة أمانة الرياض', amount: 124000, status: 'معتمد للتوريد', date: '2026-09-04' },
  ]);

  const [invoices, setInvoices] = useState([
    { id: 'INV-01', number: 'INV-KAS-9901', client: 'وزارة الثقافة — هيئة الفعاليات', amount: 245000, vat: 36750, total: 281750, date: '2026-09-02', status: 'معتمدة ZATCA', qr: true },
    { id: 'INV-02', number: 'INV-KAS-9902', client: 'الهيئة العامة للموانئ', amount: 82625, vat: 12393.75, total: 95018.75, date: '2026-09-04', status: 'معتمدة ZATCA', qr: true },
    { id: 'INV-03', number: 'INV-KAS-9903', client: 'أمانة منطقة الرياض', amount: 110000, vat: 16500, total: 126500, date: '2026-09-05', status: 'مسودة', qr: false },
  ]);

  // Handle Add Tender
  const handleCreateTender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTender.title) return;

    const record = {
      id: `TND-${Date.now()}`,
      referenceNumber: newTender.referenceNumber,
      title: newTender.title,
      entity: newTender.entity,
      budget: Number(newTender.budget),
      deadline: newTender.deadline,
      status: 'قيد التسعير',
      category: newTender.category,
      itemsCount: 10,
    };

    setTenders([record, ...tenders]);
    setShowAddTenderModal(false);
    addNotification({
      type: 'success',
      title: 'تم تسجيل المنافسة في كاس بنجاح',
      message: `تم إضافة منافسة "${record.title}" برقم مرجعي ${record.referenceNumber}`,
    });
  };

  // Handle Add Supplier
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name) return;

    const record = {
      id: `SUP-${Date.now()}`,
      name: newSupplier.name,
      category: newSupplier.category,
      phone: newSupplier.phone,
      rating: Number(newSupplier.rating),
      activeProjects: 1,
      totalVolume: 50000,
    };

    setSuppliers([record, ...suppliers]);
    setShowAddSupplierModal(false);
    addNotification({
      type: 'success',
      title: 'تم اعتماد المورد بنجاح',
      message: `تم إدراج المورد "${record.name}" في سجل موردي كاس المعتمدين`,
    });
  };

  // Export dataset dynamically
  const getExportData = () => {
    switch (activeDept) {
      case 'monafasat':
        return tenders.map(t => ({
          'الرقم المرجعي': t.referenceNumber,
          'عنوان المنافسة': t.title,
          'الجهة الحكومية': t.entity,
          'الميزانية التقديرية (⃁)': t.budget,
          'الموعد النهائي': t.deadline,
          'الحالة': t.status,
          'القطاع': t.category,
        }));
      case 'suppliers':
        return suppliers.map(s => ({
          'اسم المورد': s.name,
          'التصنيف': s.category,
          'الهاتف': s.phone,
          'التقييم': s.rating,
          'المشاريع النشطة': s.activeProjects,
          'إجمالي التعاملات (⃁)': s.totalVolume,
        }));
      case 'purchase-orders':
        return purchaseOrders.map(p => ({
          'رقم أمر الصرف': p.poNumber,
          'المورد': p.supplierName,
          'المشروع': p.project,
          'المبلغ': p.amount,
          'الحالة': p.status,
          'التاريخ': p.date,
        }));
      case 'zatca-invoices':
      default:
        return invoices.map(i => ({
          'رقم الفاتورة': i.number,
          'العميل / الجهة': i.client,
          'المبلغ الخاضع للضريبة': i.amount,
          'ضريبة القيمة المضافة 15%': i.vat,
          'الإجمالي شامل الضريبة': i.total,
          'التاريخ': i.date,
          'حالة ZATCA': i.status,
        }));
    }
  };

  const kasSubTabs: Array<{ id: KasDepartmentId; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'command-center', label: 'المركز التنفيذي للمنافسات', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'monafasat', label: 'منافسات منصة اعتماد', icon: <Layers className="w-3.5 h-3.5" />, badge: '2,651' },
    { id: 'boq-editor', label: 'محرر جداول الكميات BOQ', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'suppliers', label: 'سجل الموردين والمقاولين', icon: <Store className="w-3.5 h-3.5" />, badge: String(suppliers.length) },
    { id: 'purchase-orders', label: 'أوامر التوريد والصرف PO', icon: <Truck className="w-3.5 h-3.5" />, badge: String(purchaseOrders.length) },
    { id: 'contracts-projects', label: 'ترسية المشاريع والعقود', icon: <Award className="w-3.5 h-3.5" />, badge: '12' },
    { id: 'zatca-invoices', label: 'فوترة ZATCA المشفرة', icon: <QrCode className="w-3.5 h-3.5" />, badge: String(invoices.length) },
    { id: 'etmad-cloud-api', label: 'الربط السحابي Etmad API', icon: <CloudLightning className="w-3.5 h-3.5" /> },
    { id: 'audit-security', label: 'تدقيق الأمان وعزل البيانات', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Mobbin Grand Hero Banner */}
      <div className="card-feature-cinematic p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <BusinessIllustration
              type="kas-tenders"
              size="sm"
              showBackground={false}
              className="!w-16 !h-14 shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="pill-tag-mint text-[11px] font-bold">
                  KAS ENTERPRISE PLATFORM
                </span>
                <span className="pill-tag-shade text-[11px] font-bold">
                  كيان معزول 100%
                </span>
                <span className="text-xs text-[#707070] font-mono">
                  السجل: 1010789234 • الرقم الضريبي: 310284759200003
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#141414] m-0 tracking-tight">
                منظومة المنافسات الحكومية والمشاريع — شركة كاس
              </h2>
              <p className="text-xs text-[#707070] max-w-3xl leading-relaxed m-0">
                إدارة مركزية للمنافسات الحكومية عبر منصة اعتماد، كراسات وجداول الكميات (BOQ)، عقود التوريد والصرف للمشاريع، والفوترة الإلكترونية المشفرة لـ ZATCA.
              </p>
            </div>
          </div>

          {/* Right Quick Actions & Branch Selector */}
          <div className="pt-3 border-t border-[#e0e0e0] flex items-center gap-2 flex-wrap">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] rounded-full focus:outline-none"
              aria-label="تصفية حسب فرع كاس"
            >
              {KAS_BRANCHES.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowAddTenderModal(true)}
              className="btn-pill-dark px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>منافسة جديدة</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddSupplierModal(true)}
              className="btn-pill-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5" />
              <span>+ مورد</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddPoModal(true)}
              className="btn-pill-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>+ أمر توريد</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddInvoiceModal(true)}
              className="btn-pill-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>+ فاتورة ZATCA</span>
            </button>

            <ExportDropdown
              sectionKey={`kas_${activeDept}`}
              data={getExportData()}
              customTitle={`تصدير بيانات كاس — ${activeDept}`}
              buttonLabel="تصدير بيانات كاس"
              variant="compact"
            />
          </div>
        </div>
      </div>

      {/* 2. Mobbin 4 KPI Metric Cards (.stat-card-grid) */}
      <div className="stat-card-grid">
        <div className="card-pricing">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#707070]">إجمالي المنافسات المسجلة</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] border border-[#e0e0e0]">
              <Layers className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">2,651</div>
          <div className="pill-tag-mint mt-2">سجل شيت كاس الشامل</div>
        </div>

        <div className="card-pistachio-band">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#262626]">المبيعات والفواتير المعتمدة</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-[#e0e0e0]">
              <DollarSign className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">106,006 ⃁</div>
          <div className="pill-tag-mint mt-2">فواتير ZATCA المرحلة الثانية</div>
        </div>

        <div className="card-pricing">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#707070]">المشاريع والعقود الجارية</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] border border-[#e0e0e0]">
              <Award className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">12 مشروعاً</div>
          <div className="pill-tag-shade mt-2">نسبة الترسية 56.6%</div>
        </div>

        <div className="card-pricing">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#707070]">الموردون المعتمدون</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] border border-[#e0e0e0]">
              <Store className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">48 مورداً</div>
          <div className="pill-tag-mint mt-2">سجل الموردين والمقاولين</div>
        </div>
      </div>

      {/* 3. Horizontal Mobbin Stadium Pill Tab Bar */}
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-2 flex items-center gap-1.5 flex-wrap">
        {kasSubTabs.map((tab) => {
          const isActive = activeDept === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveDept(tab.id)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#141414] text-[#ffffff]'
                  : 'bg-transparent text-[#707070] hover:bg-[#f3f3f3] hover:text-[#141414]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-[#f3f3f3] text-[#141414]' : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Dynamic Department Content Body */}
      <div className="space-y-6">
        {/* ========================================================================= */}
        {/* DEPT 1: COMMAND CENTER & EXECUTIVE KPIS */}
        {/* ========================================================================= */}
        {activeDept === 'command-center' && (
          <div className="space-y-6">

              {/* Two Column Section: Recent Tenders & Live Invoices */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tenders */}
                <div className="rounded-2xl p-5 bg-[#ffffff] border border-[#e0e0e0] shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#141414]" />
                      <span>أحدث المنافسات الحكومية المعتمدة لشركة كاس</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveDept('monafasat')}
                      className="text-xs text-[#141414] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>عرض الكل</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {tenders.slice(0, 3).map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[#141414] font-bold bg-[#f3f3f3] px-1.5 py-0.5 rounded">
                              {t.referenceNumber}
                            </span>
                            <span className="text-[10.5px] px-2 py-0.2 rounded-full bg-[#f3f3f3] text-[#141414]">
                              {t.entity}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[#141414] mt-1 truncate">
                            {t.title}
                          </div>
                          <div className="text-[10.5px] text-[#707070] mt-0.5">
                            الميزانية: <strong className="text-[#141414] font-mono">{t.budget.toLocaleString()} ⃁</strong> • الموعد: {t.deadline}
                          </div>
                        </div>

                        <span className="text-[10px] px-2 py-1 rounded-lg bg-[#f3f3f3] text-[#141414] font-bold shrink-0">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent ZATCA Invoices */}
                <div className="rounded-2xl p-5 bg-[#ffffff] border border-[#e0e0e0] shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#141414]" />
                      <span>الفواتير الضريبية المشفرة ZATCA</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveDept('zatca-invoices')}
                      className="text-xs text-[#141414] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>عرض الفواتير</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {invoices.map(inv => (
                      <div key={inv.id} className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[#141414] font-bold bg-[#f3f3f3] px-1.5 py-0.5 rounded">
                              {inv.number}
                            </span>
                            <span className="text-xs font-bold text-[#141414]">{inv.client}</span>
                          </div>
                          <div className="text-[10.5px] text-[#707070] mt-1 font-mono">
                            الإجمالي: <strong className="text-[#141414]">{inv.total.toLocaleString()} ⃁</strong> (شامل الضريبة 15%: {inv.vat.toLocaleString()} ⃁)
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {inv.qr && (
                            <span className="p-1 rounded bg-[#f3f3f3] text-[#141414]" title="QR مشفر ZATCA">
                              <QrCode className="w-4 h-4 text-[#141414]" />
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-1 rounded-lg bg-[#f3f3f3] text-[#141414] font-bold">
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DEPT 2: ETMAD MONAFASAT DIRECTORY */}
          {/* ========================================================================= */}
          {activeDept === 'monafasat' && (
            <div className="space-y-4">
              {/* Search & Filter bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#ffffff] border border-[#e0e0e0]">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#707070] absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="ابحث برقم المنافسة أو الجهة الحكومية أو المسمى..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl pr-9 pl-3 py-2 text-xs text-[#141414] outline-none focus:border-[#141414] font-sans"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs text-[#141414] outline-none focus:border-[#141414] cursor-pointer"
                  >
                    <option value="all">كافة الحالات</option>
                    <option value="ترسية معتمدة">ترسية معتمدة</option>
                    <option value="قيد التسعير">قيد التسعير</option>
                    <option value="طرح عام">طرح عام</option>
                  </select>
                </div>
              </div>

              {/* Tenders Table */}
              <div className="rounded-2xl bg-[#ffffff] border border-[#e0e0e0] overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#ffffff] text-[#707070] border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3.5 font-bold">الرقم المرجعي</th>
                        <th className="p-3.5 font-bold">عنوان المنافسة</th>
                        <th className="p-3.5 font-bold">الجهة الحكومية</th>
                        <th className="p-3.5 font-bold">الميزانية التقديرية</th>
                        <th className="p-3.5 font-bold">تاريخ الإغلاق</th>
                        <th className="p-3.5 font-bold">البنود</th>
                        <th className="p-3.5 font-bold">الحالة</th>
                        <th className="p-3.5 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {tenders
                        .filter(t => statusFilter === 'all' || t.status === statusFilter)
                        .filter(t => !searchQuery || t.title.includes(searchQuery) || t.referenceNumber.includes(searchQuery) || t.entity.includes(searchQuery))
                        .map(t => (
                          <tr key={t.id} className="hover:bg-[#f3f3f3] transition-colors">
                            <td className="p-3.5 font-mono font-bold text-[#141414]">{t.referenceNumber}</td>
                            <td className="p-3.5 font-bold text-[#141414] max-w-xs truncate">{t.title}</td>
                            <td className="p-3.5 text-[#141414]">{t.entity}</td>
                            <td className="p-3.5 font-mono font-bold text-[#141414]">{t.budget.toLocaleString()} ⃁</td>
                            <td className="p-3.5 text-[#707070]">{t.deadline}</td>
                            <td className="p-3.5 text-[#707070]">{t.itemsCount} صنف</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                                {t.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDept('boq-editor');
                                  addNotification({
                                    type: 'info',
                                    title: 'تم فتح كراسة BOQ',
                                    message: `تم تحميل بنود المنافسة ${t.referenceNumber} في محرر الأسعار الذكي`,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#f3f3f3] text-[#141414] hover:bg-[#eaeaea] font-bold text-[11px] inline-flex items-center gap-1"
                              >
                                <Calculator className="w-3 h-3" />
                                <span>تسعير BOQ</span>
                              </button>
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
          {/* DEPT 3: LIVE EXCEL BOQ EDITOR */}
          {/* ========================================================================= */}
          {activeDept === 'boq-editor' && (
            <div className="space-y-4">
              {/* BOQ Header Summary Card */}
              <div className="rounded-2xl p-4 bg-[#ffffff] border border-[#e0e0e0] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#f3f3f3] text-[#141414] font-mono text-[10.5px] font-bold">
                      BOQ-2026-ETM-88991
                    </span>
                    <span className="text-xs text-[#707070]">مؤسسة كاس للتجارة — كراسة التوريدات المعتمدة</span>
                  </div>
                  <h2 className="text-base font-bold text-[#141414] mt-1">
                    كراسة أسعار وتكاليف: توريد وتجهيزات ضيافة لفعاليات اليوم الوطني 96
                  </h2>
                  <p className="text-xs text-[#707070] mt-0.5">
                    حساب الهامش الربحي، الضريبة 15%، والتفقيط التلقائي بالريال السعودي
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-center">
                    <div className="text-[10px] text-[#707070] font-bold">الإجمالي قبل الضريبة</div>
                    <div className="text-base font-bold text-[#141414] font-mono">245,000 ⃁</div>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
                    <div className="text-[10px] text-[#141414] font-bold">الإجمالي شامل الضريبة 15%</div>
                    <div className="text-base font-bold text-[#141414] font-mono">281,750 ⃁</div>
                  </div>
                </div>
              </div>

              {/* Live BOQ Table */}
              <div className="rounded-2xl bg-[#ffffff] border border-[#e0e0e0] overflow-hidden shadow-lg">
                <div className="p-3 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between">
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#141414]" />
                    <span>جدول بنود الكميات والتسعير المعتمد (Live Sheet):</span>
                  </div>
                  <div className="text-[11px] text-[#707070]">
                    التفقيط: <strong>مائتان وواحد وثمانون ألفاً وسبعمائة وخمسون ريالاً سعودياً فقط لا غير</strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#ffffff] text-[#707070] border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3 font-bold">#</th>
                        <th className="p-3 font-bold">وصف البند / الصنف</th>
                        <th className="p-3 font-bold">الوحدة</th>
                        <th className="p-3 font-bold">الكمية</th>
                        <th className="p-3 font-bold">سعر تكلفة الشراء</th>
                        <th className="p-3 font-bold">سعر بيع كاس</th>
                        <th className="p-3 font-bold">الهامش الربحي</th>
                        <th className="p-3 font-bold">الإجمالي (شامل الضريبة 15%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0] font-mono">
                      <tr className="hover:bg-[#f3f3f3]">
                        <td className="p-3 text-[#707070] font-sans">1</td>
                        <td className="p-3 font-bold text-[#141414] font-sans">أطقم ضيافة فاخرة متكاملة للصالات الرسمية</td>
                        <td className="p-3 text-[#707070] font-sans">طقم</td>
                        <td className="p-3 text-[#141414]">40</td>
                        <td className="p-3 text-[#707070]">1,800 ⃁</td>
                        <td className="p-3 text-[#141414] font-bold">2,600 ⃁</td>
                        <td className="p-3 text-[#141414] font-bold">+44.4%</td>
                        <td className="p-3 text-[#141414] font-bold">119,600 ⃁</td>
                      </tr>
                      <tr className="hover:bg-[#f3f3f3]">
                        <td className="p-3 text-[#707070] font-sans">2</td>
                        <td className="p-3 font-bold text-[#141414] font-sans">تجهيز بوفيهات إعاشة وخدمة ضيافة VIP يومية</td>
                        <td className="p-3 text-[#707070] font-sans">يوم</td>
                        <td className="p-3 text-[#141414]">5</td>
                        <td className="p-3 text-[#707070]">12,000 ⃁</td>
                        <td className="p-3 text-[#141414] font-bold">18,500 ⃁</td>
                        <td className="p-3 text-[#141414] font-bold">+54.1%</td>
                        <td className="p-3 text-[#141414] font-bold">106,375 ⃁</td>
                      </tr>
                      <tr className="hover:bg-[#f3f3f3]">
                        <td className="p-3 text-[#707070] font-sans">3</td>
                        <td className="p-3 font-bold text-[#141414] font-sans">شاشات عرض تفاعلية ونظم صوتية للمنصة الرئيسية</td>
                        <td className="p-3 text-[#707070] font-sans">باقة</td>
                        <td className="p-3 text-[#141414]">2</td>
                        <td className="p-3 text-[#707070]">18,000 ⃁</td>
                        <td className="p-3 text-[#141414] font-bold">24,250 ⃁</td>
                        <td className="p-3 text-[#141414] font-bold">+34.7%</td>
                        <td className="p-3 text-[#141414] font-bold">55,775 ⃁</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DEPT 4: SUPPLIERS & SUBCONTRACTORS REGISTRY */}
          {/* ========================================================================= */}
          {activeDept === 'suppliers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map(sup => (
                  <div key={sup.id} className="p-4 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#141414]">{sup.name}</div>
                          <div className="text-[10.5px] text-[#707070]">{sup.category}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414]">
                        {sup.rating}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-[#707070]">
                        <span>رقم الاتصال:</span>
                        <span className="text-[#141414] font-mono">{sup.phone}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#707070]">
                        <span>المشاريع المشتركة:</span>
                        <span className="text-[#141414] font-bold">{sup.activeProjects} مشاريع</span>
                      </div>
                      <div className="flex items-center justify-between text-[#707070]">
                        <span>إجمالي التعاملات:</span>
                        <span className="text-[#141414] font-mono font-bold">{sup.totalVolume.toLocaleString()} ⃁</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPoModal(true);
                        setNewPO(prev => ({ ...prev, supplierName: sup.name }));
                      }}
                      className="w-full py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#f3f3f3] text-xs text-[#141414] font-bold border border-[#e0e0e0] flex items-center justify-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>إصدار أمر صرف / توريد للمورد</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DEPT 5: PURCHASE ORDERS & WAREHOUSING */}
          {/* ========================================================================= */}
          {activeDept === 'purchase-orders' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#ffffff] border border-[#e0e0e0] overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#ffffff] text-[#707070] border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3.5 font-bold">رقم أمر الصرف</th>
                        <th className="p-3.5 font-bold">المورد المعتمد</th>
                        <th className="p-3.5 font-bold">المشروع المستفيد</th>
                        <th className="p-3.5 font-bold">المبلغ المصروف</th>
                        <th className="p-3.5 font-bold">تاريخ الإصدار</th>
                        <th className="p-3.5 font-bold">حالة التوريد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {purchaseOrders.map(po => (
                        <tr key={po.id} className="hover:bg-[#f3f3f3]">
                          <td className="p-3.5 font-mono font-bold text-[#141414]">{po.poNumber}</td>
                          <td className="p-3.5 font-bold text-[#141414]">{po.supplierName}</td>
                          <td className="p-3.5 text-[#141414]">{po.project}</td>
                          <td className="p-3.5 font-mono font-bold text-[#141414]">{po.amount.toLocaleString()} ⃁</td>
                          <td className="p-3.5 text-[#707070]">{po.date}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              {po.status}
                            </span>
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
          {/* DEPT 6: AWARDS & CONTRACTS */}
          {/* ========================================================================= */}
          {activeDept === 'contracts-projects' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414]">
                      مشروع ساري
                    </span>
                    <span className="text-xs text-[#707070] font-mono">CNT-KAS-2026-01</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#141414]">مشروع توريدات احتفالات اليوم الوطني 96 لميناء جدة</h3>
                  <p className="text-xs text-[#707070]">الجهة المتعاقدة: الهيئة العامة للموانئ • القيمة: 95,018.75 ⃁</p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#707070]">
                      <span>نسبة الإنجاز المعتمدة:</span>
                      <span className="text-[#141414] font-bold">85%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f3f3f3] overflow-hidden">
                      <div className="h-full bg-[#141414] rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414]">
                      قيد التنفيذ
                    </span>
                    <span className="text-xs text-[#707070] font-mono">CNT-KAS-2026-02</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#141414]">عقد تأمين أجهزة وتقنيات المقرات الإدارية التابعة</h3>
                  <p className="text-xs text-[#707070]">الجهة المتعاقدة: أمانة منطقة الرياض • القيمة: 340,000 ⃁</p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#707070]">
                      <span>نسبة الإنجاز المعتمدة:</span>
                      <span className="text-[#141414] font-bold">60%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f3f3f3] overflow-hidden">
                      <div className="h-full bg-[#141414] rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DEPT 7: ZATCA INVOICES & TAX */}
          {/* ========================================================================= */}
          {activeDept === 'zatca-invoices' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#ffffff] border border-[#e0e0e0] overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#ffffff] text-[#707070] border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-3.5 font-bold">رقم الفاتورة</th>
                        <th className="p-3.5 font-bold">الجهة / العميل</th>
                        <th className="p-3.5 font-bold">المبلغ قبل الضريبة</th>
                        <th className="p-3.5 font-bold">الضريبة 15%</th>
                        <th className="p-3.5 font-bold">الإجمالي النهائي</th>
                        <th className="p-3.5 font-bold">التاريخ</th>
                        <th className="p-3.5 font-bold text-center">رمز QR</th>
                        <th className="p-3.5 font-bold">حالة ZATCA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0] font-mono">
                      {invoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-[#f3f3f3]">
                          <td className="p-3.5 font-bold text-[#141414]">{inv.number}</td>
                          <td className="p-3.5 font-sans font-bold text-[#141414]">{inv.client}</td>
                          <td className="p-3.5 text-[#141414]">{inv.amount.toLocaleString()} ⃁</td>
                          <td className="p-3.5 text-[#141414]">{inv.vat.toLocaleString()} ⃁</td>
                          <td className="p-3.5 text-[#141414] font-bold">{inv.total.toLocaleString()} ⃁</td>
                          <td className="p-3.5 text-[#707070] font-sans">{inv.date}</td>
                          <td className="p-3.5 text-center">
                            {inv.qr ? (
                              <span className="p-1 rounded bg-[#f3f3f3] text-[#141414] inline-block" title="مشفر ZATCA">
                                <QrCode className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="text-[#707070]">—</span>
                            )}
                          </td>
                          <td className="p-3.5 font-sans">
                            <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              {inv.status}
                            </span>
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
          {/* DEPT 8: ETMAD CLOUD API & INTEGRATION */}
          {/* ========================================================================= */}
          {activeDept === 'etmad-cloud-api' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold">
                      <CloudLightning className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141414]">بوابة الربط والتكامل المباشر مع منصة اعتماد الحكومية</h3>
                      <p className="text-xs text-[#707070] font-mono">Etmad Cloud Gateway: https://api.etimad.sa/v2/monafasat/kas</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#141414] animate-pulse"></span>
                    <span>متصل ونشط (Connected)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-xs">
                    <span className="text-[#707070] block mb-1">معرّف المورد المعتمد:</span>
                    <span className="text-[#141414] font-mono font-bold">KAS-VEND-99042</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-xs">
                    <span className="text-[#707070] block mb-1">آخر مزامنة آلية:</span>
                    <span className="text-[#141414] font-mono font-bold">منذ دقيقتين (2 mins ago)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-xs">
                    <span className="text-[#707070] block mb-1">حالة الـ Webhooks:</span>
                    <span className="text-[#141414] font-mono font-bold">Active (100% Delivery)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DEPT 9: AUDIT LOG & DATA ISOLATION */}
          {/* ========================================================================= */}
          {activeDept === 'audit-security' && (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141414]">شهادة الامتثال والعزل التام لمؤسسة كاس (Tenant Isolation Certificate)</h3>
                      <p className="text-xs text-[#707070]">Zero Cross-Tenant Leakage • معزولة كلياً عن شركات الاستقدام</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] font-bold text-xs">
                    الامتثال 100%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] text-xs text-[#141414] space-y-2">
                  <div className="flex items-center gap-2 text-[#141414] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم حجب أقسام شركة كاس بنجاح من القوائم الجانبية لشركات الصفا الماسي والياقوت وتوباز.</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#141414] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>سجلات المناقصات والـ BOQ مقيدة بمفتاح tenantId و company_id = 'KAS'.</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#141414] font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>فواتير ZATCA مرتبطة بالرقم الضريبي المستقل 310284759200003 دون أي تداخل محاسبي.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD TENDER MODAL */}
      {/* ========================================================================= */}
      {showAddTenderModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            <div className="p-4 border-b border-[#e0e0e0] bg-[#f3f3f3] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#141414]" />
                <span>تسجيل منافسة جديدة — اعتماد كاس</span>
              </h3>
              <button onClick={() => setShowAddTenderModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#141414] mb-1 font-bold">عنوان المنافسة:</label>
                <input
                  type="text"
                  required
                  value={newTender.title}
                  onChange={e => setNewTender({ ...newTender, title: e.target.value })}
                  placeholder="مثال: توريد وتجهيز منصات ومستلزمات ضيافة..."
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">الجهة الحكومية:</label>
                  <input
                    type="text"
                    required
                    value={newTender.entity}
                    onChange={e => setNewTender({ ...newTender, entity: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">الميزانية التقديرية (⃁):</label>
                  <input
                    type="number"
                    required
                    value={newTender.budget}
                    onChange={e => setNewTender({ ...newTender, budget: Number(e.target.value) })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">تاريخ الإغلاق:</label>
                  <input
                    type="date"
                    required
                    value={newTender.deadline}
                    onChange={e => setNewTender({ ...newTender, deadline: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">القطاع / التصنيف:</label>
                  <input
                    type="text"
                    value={newTender.category}
                    onChange={e => setNewTender({ ...newTender, category: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTenderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#707070] hover:text-[#141414] bg-[#f3f3f3]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] shadow-md"
                >
                  حفظ وتسجيل المنافسة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD SUPPLIER MODAL */}
      {/* ========================================================================= */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            <div className="p-4 border-b border-[#e0e0e0] bg-[#f3f3f3] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                <Store className="w-4 h-4 text-[#141414]" />
                <span>اعتماد مورد / مقاول جديد لشركة كاس</span>
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#141414] mb-1 font-bold">اسم الشركة أو المورد:</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="مثال: شركة التوريدات اللوجستية الحديثة"
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">التصنيف والنشاط:</label>
                  <input
                    type="text"
                    value={newSupplier.category}
                    onChange={e => setNewSupplier({ ...newSupplier, category: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">رقم الهاتف / الجوال:</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414] font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#707070] hover:text-[#141414] bg-[#f3f3f3]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] shadow-md"
                >
                  اعتماد المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD PURCHASE ORDER MODAL */}
      {/* ========================================================================= */}
      {showAddPoModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            <div className="p-4 border-b border-[#e0e0e0] bg-[#f3f3f3] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#141414]" />
                <span>إصدار أمر توريد / صرف مستودعات (PO)</span>
              </h3>
              <button onClick={() => setShowAddPoModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setPurchaseOrders([{ id: `PO-${Date.now()}`, poNumber: newPO.poNumber, supplierName: newPO.supplierName || 'شركة التوريدات الصناعية', project: newPO.projectName, amount: Number(newPO.amount), status: 'معتمد للتوريد', date: '2026-09-05' }, ...purchaseOrders]);
                setShowAddPoModal(false);
                addNotification({ type: 'success', title: 'تم إصدار أمر التوريد', message: `تم تسجيل ${newPO.poNumber} لمستودعات كاس بنجاح` });
              }} 
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[#141414] mb-1 font-bold">اسم المورد:</label>
                <input
                  type="text"
                  required
                  value={newPO.supplierName}
                  onChange={e => setNewPO({ ...newPO, supplierName: e.target.value })}
                  placeholder="اختر أو اكتب اسم المورد المعتمد..."
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                />
              </div>

              <div>
                <label className="block text-[#141414] mb-1 font-bold">المشروع المستفيد:</label>
                <input
                  type="text"
                  required
                  value={newPO.projectName}
                  onChange={e => setNewPO({ ...newPO, projectName: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">المبلغ (⃁):</label>
                  <input
                    type="number"
                    required
                    value={newPO.amount}
                    onChange={e => setNewPO({ ...newPO, amount: Number(e.target.value) })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">تاريخ التوريد المتوقع:</label>
                  <input
                    type="date"
                    required
                    value={newPO.deliveryDate}
                    onChange={e => setNewPO({ ...newPO, deliveryDate: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPoModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#707070] hover:text-[#141414] bg-[#f3f3f3]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] shadow-md"
                >
                  اعتماد أمر الصرف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD ZATCA INVOICE MODAL */}
      {/* ========================================================================= */}
      {showAddInvoiceModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            <div className="p-4 border-b border-[#e0e0e0] bg-[#f3f3f3] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#141414]" />
                <span>إصدار فاتورة ضريبية ZATCA المرحلة 2</span>
              </h3>
              <button onClick={() => setShowAddInvoiceModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const vat = Number(newInvoice.amount) * 0.15;
                const total = Number(newInvoice.amount) + vat;
                setInvoices([{ id: `INV-${Date.now()}`, number: newInvoice.invoiceNumber, client: newInvoice.clientName, amount: Number(newInvoice.amount), vat, total, date: '2026-09-05', status: 'معتمدة ZATCA', qr: true }, ...invoices]);
                setShowAddInvoiceModal(false);
                addNotification({ type: 'success', title: 'تم اعتماد الفاتورة في ZATCA', message: `الفاتورة ${newInvoice.invoiceNumber} مشفرة بالـ QR وجاهزة للتسليم` });
              }} 
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[#141414] mb-1 font-bold">اسم الجهة / العميل:</label>
                <input
                  type="text"
                  required
                  value={newInvoice.clientName}
                  onChange={e => setNewInvoice({ ...newInvoice, clientName: e.target.value })}
                  placeholder="مثال: وزارة الموارد البشرية والتنمية الاجتماعية"
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">المبلغ الخاضع للضريبة (⃁):</label>
                  <input
                    type="number"
                    required
                    value={newInvoice.amount}
                    onChange={e => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] outline-none focus:border-[#141414] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#141414] mb-1 font-bold">نسبة الضريبة:</label>
                  <input
                    type="text"
                    disabled
                    value="15% (ZATCA Standard)"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-3 py-2 text-[#141414] font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f3f3f3]/40 border border-[#e0e0e0] space-y-1 text-[#141414]">
                <div className="flex items-center justify-between">
                  <span>قيمة الضريبة المضافة (15%):</span>
                  <span className="font-mono text-[#141414] font-bold">{(Number(newInvoice.amount) * 0.15).toLocaleString()} ⃁</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-[#e0e0e0]">
                  <span className="text-[#141414]">الإجمالي النهائي المطلوب:</span>
                  <span className="font-mono text-[#141414]">{(Number(newInvoice.amount) * 1.15).toLocaleString()} ⃁</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#e0e0e0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#707070] hover:text-[#141414] bg-[#f3f3f3]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] shadow-md flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>إصدار وتشفير ZATCA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasSuitePortalPage;
